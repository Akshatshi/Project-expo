import json
import logging
import sqlite3
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, g, jsonify, request, Response, stream_with_context

import assessment
import catalog
import linkedin
import market
import matcher
import projects as project_service
import roadmap_ai
from auth import (create_token, hash_password, hash_reset_token, login_required,
                  new_reset_token, verify_password)
from db import get_db
from errors import ApiError
from validators import (LEVEL_LABELS, fail, require_json, validate_int, validate_login,
                        validate_password_reset, validate_profile_payload, validate_signup,
                        validate_email)

api = Blueprint("api", __name__, url_prefix="/api")
log = logging.getLogger(__name__)

_DUMMY_HASH = hash_password("not-a-real-password")


def body() -> dict:
    return require_json(request.get_json(silent=True))


def public_user(row) -> dict:
    return {"id": row["id"], "full_name": row["full_name"], "email": row["email"], "user_id": row["user_id"]}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def profile_dict(user_id: int) -> dict:
    row = get_db().execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    if row is None:
        return {"course": "", "year": "", "skills": [], "internship_id": None, "custom_internship": None}
    return {
        "course": row["course"],
        "year": row["year"],
        "skills": [{"name": s["name"], "level": LEVEL_LABELS[s["level"]]} for s in json.loads(row["skills_json"])],
        "internship_id": row["internship_id"],
        "custom_internship": json.loads(row["custom_json"]) if row["custom_json"] else None,
    }


def raw_profile_skills(user_id: int) -> list:
    row = get_db().execute("SELECT skills_json FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    return json.loads(row["skills_json"]) if row else []


def save_profile(user_id, *, skills=None, course=None, year=None, internship_id=None, custom=None, set_target=False):
    db = get_db()
    existing = db.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,)).fetchone()
    cur = dict(existing) if existing else {
        "course": "", "year": "", "skills_json": "[]", "internship_id": None, "custom_json": None}
    if skills is not None:
        cur["skills_json"] = json.dumps(skills)
    if course is not None:
        cur["course"] = course
    if year is not None:
        cur["year"] = year
    if set_target:
        cur["internship_id"] = internship_id
        cur["custom_json"] = json.dumps(custom) if custom else None
    db.execute(
        """INSERT INTO profiles (user_id, course, year, skills_json, internship_id, custom_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id) DO UPDATE SET course=excluded.course, year=excluded.year,
             skills_json=excluded.skills_json, internship_id=excluded.internship_id,
             custom_json=excluded.custom_json, updated_at=excluded.updated_at""",
        (user_id, cur["course"], cur["year"], cur["skills_json"], cur["internship_id"], cur["custom_json"], now_iso()),
    )
    db.commit()


def analysis_dict(row) -> dict | None:
    if row is None:
        return None
    return {"id": row["id"], "created_at": row["created_at"], **json.loads(row["result_json"])}


def latest_analysis_row(user_id):
    return get_db().execute(
        "SELECT * FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT 1", (user_id,)).fetchone()


def progress_map(roadmap_id: int) -> dict:
    rows = get_db().execute(
        "SELECT week, task_index, completed FROM progress WHERE roadmap_id = ?", (roadmap_id,)).fetchall()
    return {(r["week"], r["task_index"]): bool(r["completed"]) for r in rows}


def roadmap_dict(row) -> dict | None:
    if row is None:
        return None
    done = progress_map(row["id"])
    weeks, total, completed = [], 0, 0
    for w in json.loads(row["weeks_json"]):
        tasks = [{"text": t, "completed": done.get((w["week"], i), False)} for i, t in enumerate(w["tasks"])]
        week_done = sum(t["completed"] for t in tasks)
        total += len(tasks)
        completed += week_done
        weeks.append({**w, "tasks": tasks, "completed_tasks": week_done, "done": week_done == len(tasks)})
    return {
        "id": row["id"], "analysis_id": row["analysis_id"], "source": row["source"], "model": row["model"],
        "ai_status": row["ai_status"] or ("done" if row["source"] == "ai" else "off"),
        "ai_note": row["ai_note"] if current_app.config.get("DEV_MODE") else None,
        "hours_per_week": row["hours_per_week"], "summary": row["summary"], "created_at": row["created_at"],
        "weeks": weeks,
        "progress": {"completed_tasks": completed, "total_tasks": total,
                     "percent": round(completed / total * 100, 1) if total else 0.0},
    }


def latest_roadmap_row(user_id):
    return get_db().execute(
        "SELECT * FROM roadmaps WHERE user_id = ? ORDER BY id DESC LIMIT 1", (user_id,)).fetchone()


def owned_roadmap(user_id, roadmap_id):
    if roadmap_id is None:
        row = latest_roadmap_row(user_id)
    else:
        row = get_db().execute(
            "SELECT * FROM roadmaps WHERE id = ? AND user_id = ?", (roadmap_id, user_id)).fetchone()
    if row is None:
        raise ApiError(404, "roadmap_not_found", "No roadmap found. Generate one first.")
    return row


import re as _re

CLIENT_KEY = _re.compile(r"^sm_[a-z0-9_]{1,40}$")


def data_get(uid, key, default=None):
    row = get_db().execute("SELECT value FROM user_data WHERE user_id = ? AND key = ?", (uid, key)).fetchone()
    return json.loads(row["value"]) if row else default


def data_set(uid, key, value):
    get_db().execute(
        "INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) "
        "ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        (uid, key, json.dumps(value, ensure_ascii=False), now_iso()))


def record_results(uid, results):
    db = get_db()
    weak = [w for w in data_get(uid, "sys_weak", []) if w in assessment.bank()]
    for qid, ok in results:
        db.execute("INSERT INTO question_stats (question_id, attempts, correct) VALUES (?, 1, ?) "
                   "ON CONFLICT(question_id) DO UPDATE SET attempts = question_stats.attempts + 1, correct = question_stats.correct + ?",
                   (qid, int(ok), int(ok)))
        if ok and qid in weak:
            weak.remove(qid)
        elif not ok and qid not in weak:
            weak.append(qid)
    data_set(uid, "sys_weak", weak[-60:])


def weak_topics(uid):
    bank = assessment.bank()
    ids = [w for w in data_get(uid, "sys_weak", []) if w in bank][-12:]
    out = {}
    for qid in ids:
        out.setdefault(bank[qid]["lang"], []).append(bank[qid]["q"][:80])
    return [{"skill": assessment.LANG_SKILL[k], "missed": v[:3]} for k, v in out.items()]


def latest_assessments(user_id):
    rows = get_db().execute(
        "SELECT * FROM assessments WHERE user_id = ? AND status = 'done' ORDER BY id DESC", (user_id,)).fetchall()
    seen, out = set(), []
    for r in rows:
        if r["lang"] not in seen:
            seen.add(r["lang"])
            out.append(r)
    return out


@api.get("/health")
def health():
    return jsonify({"status": "ok", "ai_configured": bool(current_app.config["GEMINI_API_KEY"])})


@api.get("/internships")
def list_internships():
    items = [{
        "id": i["id"], "title": i["title"], "description": i["description"],
        "required_skills": [{"skill": r["skill"], "weight": r["weight"],
                             "required_level": LEVEL_LABELS[r["min_level"]]} for r in i["required_skills"]],
    } for i in matcher.load_catalog()]
    return jsonify({"internships": items})


@api.get("/skills")
def list_skills():
    return jsonify({"skills": matcher.known_skill_names(), "levels": list(LEVEL_LABELS.values())})


@api.post("/auth/signup")
def signup():
    data = validate_signup(body())
    db = get_db()
    if db.execute("SELECT 1 FROM users WHERE email = ?", (data["email"],)).fetchone():
        fail({"email": "An account with this email already exists."})
    if db.execute("SELECT 1 FROM users WHERE lower(user_id) = lower(?)", (data["user_id"],)).fetchone():
        fail({"user_id": "This User ID is already taken."})
    try:
        cur = db.execute(
            "INSERT INTO users (full_name, email, user_id, password_hash) VALUES (?, ?, ?, ?)",
            (data["full_name"], data["email"], data["user_id"], hash_password(data["password"])))
        db.commit()
    except sqlite3.IntegrityError:
        fail({"email": "This email or User ID is already registered."})
    user = db.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"token": create_token(user["id"]), "user": public_user(user)}), 201


@api.post("/auth/login")
def login():
    identifier, password = validate_login(body())
    row = get_db().execute(
        "SELECT * FROM users WHERE email = ? OR lower(user_id) = lower(?)", (identifier.lower(), identifier)).fetchone()
    ok = verify_password(row["password_hash"] if row else _DUMMY_HASH, password)
    if not row or not ok:
        raise ApiError(401, "invalid_credentials", "Incorrect email / User ID or password.")
    return jsonify({"token": create_token(row["id"]), "user": public_user(row)})


@api.get("/auth/me")
@login_required
def me():
    return jsonify({"user": public_user(g.user)})


@api.post("/auth/forgot-password")
def forgot_password():
    email = validate_email(body())
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    result = {"message": "If this email is registered, a password reset link has been created."}
    if user:
        token = new_reset_token()
        expires = datetime.now(timezone.utc) + timedelta(seconds=current_app.config["RESET_TOKEN_MAX_AGE_SECONDS"])
        db.execute("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
                   (hash_reset_token(token), user["id"], expires.isoformat(timespec="seconds")))
        db.commit()
        link = f"{request.host_url}reset-password.html?token={token}"
        log.warning("PASSWORD RESET LINK for %s: %s", email, link)
        if current_app.config["DEV_MODE"]:
            result["dev_reset_link"] = link
    return jsonify(result)


@api.post("/auth/reset-password")
def reset_password():
    token, password = validate_password_reset(body())
    db = get_db()
    row = db.execute("SELECT * FROM password_resets WHERE token_hash = ?", (hash_reset_token(token),)).fetchone()
    invalid = ApiError(400, "invalid_token", "This reset link is invalid or has expired. Request a new one.")
    if row is None or row["used"]:
        raise invalid
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc):
        raise invalid
    db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(password), row["user_id"]))
    db.execute("UPDATE password_resets SET used = 1 WHERE token_hash = ?", (row["token_hash"],))
    db.commit()
    return jsonify({"message": "Password updated. You can log in now."})


@api.post("/auth/forgot-userid")
def forgot_userid():
    email = validate_email(body())
    user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    result = {"message": "If this email is registered, the User ID has been sent to it."}
    if user:
        log.warning("USER ID RECOVERY for %s: %s", email, user["user_id"])
        if current_app.config["DEV_MODE"]:
            result["dev_user_id"] = user["user_id"]
    return jsonify(result)


@api.get("/profile")
@login_required
def get_profile():
    return jsonify({"user": public_user(g.user), "profile": profile_dict(g.user["id"])})


@api.put("/profile")
@login_required
def update_profile():
    data = body()
    clean = validate_profile_payload(data, skills_required=False)
    if "full_name" in data:
        name = " ".join(str(data["full_name"]).split())
        if not 2 <= len(name) <= 80:
            fail({"full_name": "Full name must be 2-80 characters."})
        get_db().execute("UPDATE users SET full_name = ? WHERE id = ?", (name, g.user["id"]))
        get_db().commit()
    target = clean["internship_id"] or clean["custom_internship"]
    if clean["internship_id"] and not matcher.get_internship(clean["internship_id"]):
        fail({"internship_id": "Unknown internship."})
    save_profile(
        g.user["id"], skills=clean.get("skills"),
        course=clean["course"] if "course" in data else None,
        year=clean["year"] if "year" in data else None,
        internship_id=clean["internship_id"], custom=clean["custom_internship"],
        set_target=bool(target))
    user = get_db().execute("SELECT * FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    return jsonify({"user": public_user(user), "profile": profile_dict(g.user["id"])})


@api.post("/analysis")
@login_required
def create_analysis():
    clean = validate_profile_payload(body(), skills_required=True)
    internship_id, custom = clean["internship_id"], clean["custom_internship"]
    if not internship_id and not custom:
        fail({"internship_id": "Choose a target internship."})
    try:
        title, requirements, resolved_id, is_custom = matcher.resolve_target(internship_id, custom)
    except LookupError:
        fail({"internship_id": "Unknown internship."})

    skills = clean["skills"]
    verified = assessment.verified_levels(latest_assessments(g.user["id"]))
    effective, verification = [], []
    for s in skills:
        v = verified.get(matcher.skill_key(s["name"]))
        if v and v["level"] < s["level"]:
            verification.append({"skill": s["name"], "claimed": LEVEL_LABELS[s["level"]], "assessed": LEVEL_LABELS[v["level"]], "score": v["pct"]})
            s = {**s, "level": v["level"]}
        effective.append(s)
    result = matcher.analyze(effective, requirements)
    result["verification"] = verification
    result["target"] = {"internship_id": resolved_id, "title": title, "custom": is_custom}
    result["projects"] = project_service.recommend(result, requirements)
    result["career_matches"] = matcher.career_matches(effective)

    db = get_db()
    save_profile(g.user["id"], skills=skills, course=clean["course"], year=clean["year"],
                 internship_id=resolved_id, custom=custom, set_target=True)
    cur = db.execute(
        "INSERT INTO analyses (user_id, target_title, match_percent, result_json) VALUES (?, ?, ?, ?)",
        (g.user["id"], title, result["match_percent"], json.dumps(result)))
    db.commit()
    row = db.execute("SELECT * FROM analyses WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"analysis": analysis_dict(row)}), 201


@api.get("/analysis/latest")
@login_required
def get_latest_analysis():
    row = latest_analysis_row(g.user["id"])
    if row is None:
        raise ApiError(404, "analysis_not_found", "You have not analysed your skills yet.")
    return jsonify({"analysis": analysis_dict(row)})


@api.get("/analysis/history")
@login_required
def analysis_history():
    rows = get_db().execute(
        "SELECT id, target_title, match_percent, created_at FROM analyses WHERE user_id = ? ORDER BY id DESC LIMIT 20",
        (g.user["id"],)).fetchall()
    return jsonify({"history": [dict(r) for r in rows]})


@api.post("/roadmap")
@login_required
def create_roadmap():
    data = request.get_json(silent=True) or {}
    data = require_json(data)
    weeks = validate_int(data, "weeks", default=6, lo=2, hi=12)
    hours = validate_int(data, "hours_per_week", default=8, lo=1, hi=40, label="hours per week")
    analysis_id = data.get("analysis_id")
    db = get_db()
    if analysis_id is None:
        row = latest_analysis_row(g.user["id"])
    else:
        if isinstance(analysis_id, bool) or not isinstance(analysis_id, int):
            fail({"analysis_id": "Analysis id must be a number."})
        row = db.execute("SELECT * FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, g.user["id"])).fetchone()
    if row is None:
        raise ApiError(404, "analysis_not_found", "Analyse your skills first, then generate a roadmap.")

    analysis = json.loads(row["result_json"])
    title, profile = analysis["target"]["title"], profile_dict(g.user["id"])
    cfg = current_app.config
    background = bool(cfg["GEMINI_API_KEY"]) and cfg.get("AI_ASYNC")
    if background:
        plan = roadmap_ai.fallback_roadmap(title, analysis, weeks, hours)
        plan.update(source="fallback", model=None, warning=None)
        status = "pending"
    else:
        plan = roadmap_ai.generate(title, analysis, profile, weeks, hours)
        status = "done" if plan["source"] == "ai" else "off"
    cur = db.execute(
        """INSERT INTO roadmaps (user_id, analysis_id, source, model, hours_per_week, summary, weeks_json, ai_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (g.user["id"], row["id"], plan["source"], plan["model"], hours, plan["summary"], json.dumps(plan["weeks"]), status))
    db.commit()
    if background:
        roadmap_ai.upgrade_in_background(current_app._get_current_object(), cur.lastrowid, title, analysis, profile, weeks, hours)
    created = db.execute("SELECT * FROM roadmaps WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"roadmap": roadmap_dict(created), "warning": plan["warning"]}), 201


@api.get("/roadmap/latest")
@login_required
def get_latest_roadmap():
    return jsonify({"roadmap": roadmap_dict(owned_roadmap(g.user["id"], None))})


@api.get("/progress")
@login_required
def get_progress():
    rid = request.args.get("roadmap_id", type=int)
    return jsonify({"roadmap": roadmap_dict(owned_roadmap(g.user["id"], rid))})


@api.put("/progress")
@login_required
def update_progress():
    data = body()
    rid = data.get("roadmap_id")
    if rid is not None and (isinstance(rid, bool) or not isinstance(rid, int)):
        fail({"roadmap_id": "Roadmap id must be a number."})
    row = owned_roadmap(g.user["id"], rid)
    weeks = json.loads(row["weeks_json"])
    for key in ("week", "task_index"):
        if key not in data:
            fail({key: f"{key.replace('_', ' ').capitalize()} is required."})
    week = validate_int(data, "week", default=0, lo=1, hi=len(weeks))
    task_count = len(weeks[week - 1]["tasks"])
    task_index = validate_int(data, "task_index", default=0, lo=0, hi=task_count - 1, label="task index")
    completed = data.get("completed")
    if not isinstance(completed, bool):
        fail({"completed": "Completed must be true or false."})
    db = get_db()
    db.execute(
        """INSERT INTO progress (roadmap_id, week, task_index, completed, updated_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(roadmap_id, week, task_index) DO UPDATE SET completed=excluded.completed, updated_at=excluded.updated_at""",
        (row["id"], week, task_index, int(completed), now_iso()))
    db.commit()
    return jsonify({"roadmap": roadmap_dict(row)})


@api.get("/catalog/tracks")
def catalog_tracks():
    return jsonify({"tracks": catalog.tracks_with_resources()})


@api.get("/catalog/projects")
def catalog_projects():
    return jsonify({"languages": catalog.LANGUAGE_PROJECTS})


@api.get("/catalog/resources")
def catalog_resources():
    raw = request.args.get("skills", "")
    names = []
    for n in raw.split(","):
        n = " ".join(n.split())[:40]
        if n and n.lower() not in [x.lower() for x in names]:
            names.append(n)
    if not names or len(names) > 12:
        fail({"skills": "Give 1 to 12 skill names, comma separated."})
    return jsonify({"resources": [{"skill": n, "items": catalog.resources_for(n)} for n in names]})


def mentor_input():
    data = body()
    question = " ".join(str(data.get("question", "")).split())
    if not 2 <= len(question) <= 500:
        fail({"question": "Ask a question between 2 and 500 characters."})
    analysis = analysis_dict(latest_analysis_row(g.user["id"]))
    profile = profile_dict(g.user["id"])
    context = {
        "name": g.user["full_name"].split()[0], "course": profile["course"], "year": profile["year"],
        "skills": profile["skills"],
        "target": analysis["target"]["title"] if analysis else None,
        "match_percent": analysis["match_percent"] if analysis else None,
        "top_gaps": (analysis["gaps_priority"][:5] if analysis else []),
        "weak_topics": weak_topics(g.user["id"]),
    }
    return question, context


@api.post("/mentor")
@login_required
def mentor():
    question, context = mentor_input()
    return jsonify(roadmap_ai.mentor_reply(question, context))


@api.post("/mentor/stream")
@login_required
def mentor_stream():
    question, context = mentor_input()

    def lines():
        for item in roadmap_ai.mentor_stream(question, context):
            yield json.dumps(item, ensure_ascii=False) + "\n"

    resp = Response(stream_with_context(lines()), mimetype="application/x-ndjson")
    resp.headers["Cache-Control"] = "no-cache"
    resp.headers["X-Accel-Buffering"] = "no"        # tell nginx style proxies not to hold the stream back
    return resp


@api.get("/dashboard")
@login_required
def dashboard():
    uid = g.user["id"]
    return jsonify({
        "user": public_user(g.user),
        "profile": profile_dict(uid),
        "analysis": analysis_dict(latest_analysis_row(uid)),
        "roadmap": roadmap_dict(latest_roadmap_row(uid)),
    })


# skill assessment
@api.post("/assessment/start")
@login_required
def assessment_start():
    data = body()
    lang = str(data.get("lang", "")).lower()
    if lang not in assessment.LANG_SKILL:
        fail({"lang": "Choose one of: " + ", ".join(assessment.langs()) + "."})
    claim = validate_int({"claim": data.get("claim", 2)}, "claim", default=2, lo=1, hi=3)
    db = get_db()
    old = db.execute("SELECT paper_json FROM assessments WHERE user_id = ? AND lang = ? ORDER BY id DESC LIMIT 6",
                     (g.user["id"], lang)).fetchall()
    seen = {q["id"] for r in old for q in json.loads(r["paper_json"])["questions"]}
    rows = assessment.pick(lang, claim, seen)
    orders = [assessment.shuffled(r) for r in rows]
    task, keywords = __import__("random").choice(assessment.PRACTICAL[lang])
    paper = {"questions": [{"id": r["id"], "order": o} for r, o in zip(rows, orders)], "task": task, "keywords": keywords}
    cur = db.execute("INSERT INTO assessments (user_id, lang, claim, paper_json, started_at) VALUES (?, ?, ?, ?, ?)",
                     (g.user["id"], lang, claim, json.dumps(paper), now_iso()))
    db.commit()
    return jsonify({"id": cur.lastrowid, "lang": lang, "claim": claim, "task": task, "min_seconds": assessment.MIN_SECONDS,
                    "questions": [assessment.public_question(r, o, i + 1) for i, (r, o) in enumerate(zip(rows, orders))]}), 201


@api.post("/assessment/<int:aid>/submit")
@login_required
def assessment_submit(aid):
    data = body()
    db = get_db()
    row = db.execute("SELECT * FROM assessments WHERE id = ? AND user_id = ?", (aid, g.user["id"])).fetchone()
    if row is None:
        raise ApiError(404, "assessment_not_found", "This test was not found.")
    if row["status"] == "done":
        raise ApiError(409, "already_submitted", "This test was already submitted. Start a new one.")
    waited = (datetime.now(timezone.utc) - datetime.fromisoformat(row["started_at"])).total_seconds()
    if waited < assessment.MIN_SECONDS:
        raise ApiError(400, "too_fast", f"Please read the questions properly. Submit after {assessment.MIN_SECONDS} seconds.")
    answers = data.get("answers")
    if not isinstance(answers, list) or len(answers) > 20:
        fail({"answers": "Send one answer per question."})
    paper = json.loads(row["paper_json"])
    bank, got, total, by_level, review = assessment.bank(), 0, 0, [[0, 0], [0, 0], [0, 0]], []
    for i, item in enumerate(paper["questions"]):
        q = bank[item["id"]]
        pick = answers[i] if i < len(answers) else None
        shown_correct = item["order"].index(0)
        ok = isinstance(pick, int) and not isinstance(pick, bool) and pick == shown_correct
        weight = q["level"] + 1
        total += weight
        by_level[q["level"]][1] += 1
        if ok:
            got += weight
            by_level[q["level"]][0] += 1
        review.append({"q": q["q"], "ok": ok, "answer": q["options"][0], "why": q["why"]})
    record_results(g.user["id"], [(item["id"], rv["ok"]) for item, rv in zip(paper["questions"], review)])
    practical = assessment.grade_practical(current_app.config, row["lang"], paper["task"], paper["keywords"], str(data.get("practical", "")))
    total += 2
    if practical["score"] >= 60:
        got += 2
    pct = round(got / total * 100)
    level = assessment.level_from_pct(pct)
    result = {"score": got, "max": total, "pct": pct, "level": level, "level_label": LEVEL_LABELS[level],
              "claimed": LEVEL_LABELS[row["claim"]], "by_level": by_level, "review": review, "practical": practical}
    db.execute("UPDATE assessments SET status = 'done', submitted_at = ?, result_json = ? WHERE id = ?",
               (now_iso(), json.dumps(result), aid))
    db.commit()
    return jsonify({"result": result})


@api.get("/assessment/summary")
@login_required
def assessment_summary():
    rows = latest_assessments(g.user["id"])
    skills = []
    for r in rows:
        res = json.loads(r["result_json"])
        skills.append({"lang": r["lang"], "skill": assessment.LANG_SKILL[r["lang"]], "claimed": LEVEL_LABELS[r["claim"]],
                       "assessed": LEVEL_LABELS[res["level"]], "pct": res["pct"], "at": r["submitted_at"]})
    return jsonify({"skills": skills})


@api.get("/leaderboard")
@login_required
def leaderboard():
    rows = get_db().execute(
        """SELECT a.user_id, a.result_json, u.full_name FROM assessments a JOIN users u ON u.id = a.user_id
           WHERE a.status = 'done' ORDER BY a.id DESC LIMIT 500""").fetchall()
    best = {}
    for r in rows:
        pct = json.loads(r["result_json"])["pct"]
        entry = best.setdefault(r["user_id"], {"name": r["full_name"], "best": 0, "tests": 0})
        entry["best"], entry["tests"] = max(entry["best"], pct), entry["tests"] + 1
    top = sorted(best.items(), key=lambda kv: (-kv[1]["best"], -kv[1]["tests"]))[:10]
    out = []
    for uid, e in top:
        parts = e["name"].split()
        out.append({"name": parts[0] + (" " + parts[-1][0] + "." if len(parts) > 1 else ""), "best": e["best"], "tests": e["tests"], "you": uid == g.user["id"]})
    return jsonify({"leaderboard": out})


# job market
@api.get("/market")
def market_data():
    return jsonify({"snapshot": market.snapshot(), "live": market.live()})


# linkedin
@api.post("/linkedin/draft")
@login_required
def linkedin_draft():
    data = body()
    role = " ".join(str(data.get("role", "")).split())[:80]
    skills = [" ".join(str(x).split())[:40] for x in (data.get("skills") or [])][:12]
    if not role or not skills:
        fail({"role": "Give a target role and at least one skill."})
    if not current_app.config["GEMINI_API_KEY"]:
        raise ApiError(503, "ai_unavailable", "AI is not configured on this server, so the template version is shown.")
    facts = {"name": g.user["full_name"], "role": role, "skills": skills, "course": str(data.get("course", ""))[:80],
             "college": str(data.get("college", ""))[:80], "city": str(data.get("city", ""))[:60],
             "projects": [{"name": str(p.get("name", ""))[:80], "detail": str(p.get("detail", ""))[:300]} for p in (data.get("projects") or [])[:2] if isinstance(p, dict)],
             "certificate": str(data.get("certificate", ""))[:100]}
    try:
        return jsonify(linkedin.draft(facts))
    except Exception as exc:
        log.warning("LinkedIn draft failed: %s", exc)
        raise ApiError(503, "ai_unavailable", "AI could not write the draft right now. The template version is shown.")


@api.post("/linkedin/analyze")
@login_required
def linkedin_analyze():
    request.max_content_length = 14 * 1024 * 1024       # photos / PDF are bigger than the 64 KB default
    data = body()
    files = []
    for f in (data.get("files") or [])[:4]:
        if not isinstance(f, dict):
            continue
        mime, blob = str(f.get("mime", "")).lower(), str(f.get("data", ""))
        if mime not in linkedin.ALLOWED_MIME or not blob or len(blob) > 9_000_000:
            fail({"files": "Upload JPG, PNG or WEBP photos, or the PDF from LinkedIn (max 6 MB each)."})
        files.append({"mime": mime, "data": blob})
    if not files:
        fail({"files": "Upload a photo (screenshot) of your profile or the LinkedIn PDF."})
    if sum(1 for f in files if f["mime"] == "application/pdf") > 1:
        fail({"files": "Upload only one PDF at a time."})
    if not current_app.config["GEMINI_API_KEY"]:
        raise ApiError(503, "ai_unavailable", "AI is not configured on this server.")
    try:
        return jsonify(linkedin.analyze(files))
    except Exception as exc:
        log.warning("LinkedIn analyze failed: %s", exc)
        raise ApiError(503, "ai_unavailable", "AI could not read the profile right now. Try again, or use clearer screenshots.")


# per-user saved data (resume, notes, tracker, game scores) so it follows the student across devices
@api.get("/data")
@login_required
def data_all():
    rows = get_db().execute("SELECT key, value FROM user_data WHERE user_id = ? AND key LIKE 'sm_%'", (g.user["id"],)).fetchall()
    return jsonify({"data": {r["key"]: json.loads(r["value"]) for r in rows}})


@api.put("/data/<key>")
@login_required
def data_put(key):
    if not CLIENT_KEY.match(key):
        fail({"key": "Invalid key."})
    value = body().get("value")
    if len(json.dumps(value)) > 300_000:
        raise ApiError(413, "too_large", "This item is too large to save.")
    count = get_db().execute("SELECT COUNT(*) AS n FROM user_data WHERE user_id = ? AND key LIKE 'sm_%'", (g.user["id"],)).fetchone()["n"]
    if count >= 80 and data_get(g.user["id"], key) is None:
        raise ApiError(409, "too_many", "Too many saved items.")
    data_set(g.user["id"], key, value)
    get_db().commit()
    return jsonify({"saved": True})


@api.delete("/data/<key>")
@login_required
def data_delete(key):
    if CLIENT_KEY.match(key):
        get_db().execute("DELETE FROM user_data WHERE user_id = ? AND key = ?", (g.user["id"], key))
        get_db().commit()
    return jsonify({"deleted": True})


# privacy: export everything we hold, or delete the account
@api.get("/account/export")
@login_required
def account_export():
    db, uid = get_db(), g.user["id"]
    rows = lambda sql: [dict(r) for r in db.execute(sql, (uid,)).fetchall()]
    return jsonify({
        "account": {"full_name": g.user["full_name"], "email": g.user["email"], "user_id": g.user["user_id"]},
        "profile": profile_dict(uid), "analyses": rows("SELECT * FROM analyses WHERE user_id = ?"),
        "roadmaps": rows("SELECT * FROM roadmaps WHERE user_id = ?"),
        "assessments": rows("SELECT id, lang, claim, status, started_at, submitted_at, result_json FROM assessments WHERE user_id = ?"),
        "saved_data": {r["key"]: json.loads(r["value"]) for r in db.execute("SELECT key, value FROM user_data WHERE user_id = ? AND key LIKE 'sm_%'", (uid,)).fetchall()}})


@api.delete("/account")
@login_required
def account_delete():
    row = get_db().execute("SELECT password_hash FROM users WHERE id = ?", (g.user["id"],)).fetchone()
    if not verify_password(row["password_hash"], str(body().get("password", ""))):
        raise ApiError(403, "wrong_password", "Password is not correct.")
    get_db().execute("DELETE FROM users WHERE id = ?", (g.user["id"],))
    get_db().commit()
    return jsonify({"deleted": True})


# what-if simulator: how much would the match change if the student learned one more skill?
@api.post("/simulate")
@login_required
def simulate():
    clean = validate_profile_payload(body(), skills_required=True)
    if not clean["internship_id"] and not clean["custom_internship"]:
        fail({"internship_id": "Choose a target internship."})
    try:
        title, requirements, _, _ = matcher.resolve_target(clean["internship_id"], clean["custom_internship"])
    except LookupError:
        fail({"internship_id": "Unknown internship."})
    add = body().get("add") or {}
    name = " ".join(str(add.get("name", "")).split())[:60]
    level = validate_int({"level": add.get("level", 2)}, "level", default=2, lo=1, hi=3)
    if not name:
        fail({"add": "Choose a skill to simulate."})
    before = matcher.analyze(clean["skills"], requirements)
    after = matcher.analyze(clean["skills"] + [{"name": name, "level": level}], requirements)
    return jsonify({"target": title, "skill": name, "level": LEVEL_LABELS[level], "before": before["match_percent"], "after": after["match_percent"],
                    "gain": round(after["match_percent"] - before["match_percent"], 1)})


# question health: shows questions that are too easy or too hard so the bank can be tuned
@api.get("/assessment/quality")
@login_required
def question_quality():
    bank = assessment.bank()
    rows = get_db().execute("SELECT * FROM question_stats WHERE attempts >= 5").fetchall()
    out = []
    for r in rows:
        if r["question_id"] in bank:
            pct = round(r["correct"] / r["attempts"] * 100)
            flag = "too easy" if pct >= 95 else "too hard or unclear" if pct <= 15 else ""
            out.append({"q": bank[r["question_id"]]["q"], "lang": bank[r["question_id"]]["lang"], "level": bank[r["question_id"]]["level"], "attempts": r["attempts"], "correct_pct": pct, "flag": flag})
    return jsonify({"questions": sorted(out, key=lambda x: x["correct_pct"])[:40], "total_tracked": len(out)})


# daily practice built from the questions this student got wrong before
@api.get("/practice/daily")
@login_required
def practice_daily():
    uid, today = g.user["id"], datetime.now(timezone.utc).strftime("%Y-%m-%d")
    paper = data_get(uid, "sys_practice")
    if not paper or paper["date"] != today or paper.get("done"):
        if paper and paper["date"] == today and paper.get("done"):
            return jsonify({"done": True, "questions": []})
        bank = assessment.bank()
        ids = [w for w in data_get(uid, "sys_weak", []) if w in bank]
        random_ids = list(bank)
        __import__("random").shuffle(random_ids)
        picked = (__import__("random").sample(ids, min(5, len(ids))) + [i for i in random_ids if i not in ids])[:5]
        paper = {"date": today, "done": False, "items": [{"id": i, "order": assessment.shuffled(bank[i])} for i in picked]}
        data_set(uid, "sys_practice", paper)
        get_db().commit()
    bank = assessment.bank()
    return jsonify({"done": False, "from_weak": len([i for i in paper["items"] if i["id"] in data_get(uid, "sys_weak", [])]),
                    "questions": [assessment.public_question(bank[i["id"]], i["order"], n + 1) for n, i in enumerate(paper["items"])]})


@api.post("/practice/check")
@login_required
def practice_check():
    uid = g.user["id"]
    paper = data_get(uid, "sys_practice")
    if not paper or paper.get("done"):
        raise ApiError(409, "no_practice", "Open today's practice first.")
    answers, bank, review = body().get("answers"), assessment.bank(), []
    if not isinstance(answers, list):
        fail({"answers": "Send one answer per question."})
    for n, item in enumerate(paper["items"]):
        pick = answers[n] if n < len(answers) else None
        ok = isinstance(pick, int) and not isinstance(pick, bool) and pick == item["order"].index(0)
        q = bank[item["id"]]
        review.append({"q": q["q"], "ok": ok, "answer": q["options"][0], "why": q["why"]})
    record_results(uid, [(i["id"], rv["ok"]) for i, rv in zip(paper["items"], review)])
    paper["done"] = True
    data_set(uid, "sys_practice", paper)
    get_db().commit()
    return jsonify({"score": sum(1 for r in review if r["ok"]), "total": len(review), "review": review})
