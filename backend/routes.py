"""All /api endpoints."""
import json
import logging
import sqlite3
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, g, jsonify, request

import catalog
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

# a hash of a random password, used so unknown users cost the same time as known ones
_DUMMY_HASH = hash_password("not-a-real-password")


# ---------------------------------------------------------------- helpers
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
    """Insert or update. Only fields that are not None are changed."""
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


# ---------------------------------------------------------------- meta
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


# ---------------------------------------------------------------- auth
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
        # No email server in this project: the link is printed in the console.
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


# ---------------------------------------------------------------- profile
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


# ---------------------------------------------------------------- analysis
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
    result = matcher.analyze(skills, requirements)
    result["target"] = {"internship_id": resolved_id, "title": title, "custom": is_custom}
    result["projects"] = project_service.recommend(result, requirements)
    result["career_matches"] = matcher.career_matches(skills)

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


# ---------------------------------------------------------------- roadmap
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
    plan = roadmap_ai.generate(analysis["target"]["title"], analysis, profile_dict(g.user["id"]), weeks, hours)
    cur = db.execute(
        """INSERT INTO roadmaps (user_id, analysis_id, source, model, hours_per_week, summary, weeks_json)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (g.user["id"], row["id"], plan["source"], plan["model"], hours, plan["summary"], json.dumps(plan["weeks"])))
    db.commit()
    created = db.execute("SELECT * FROM roadmaps WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify({"roadmap": roadmap_dict(created), "warning": plan["warning"]}), 201


@api.get("/roadmap/latest")
@login_required
def get_latest_roadmap():
    return jsonify({"roadmap": roadmap_dict(owned_roadmap(g.user["id"], None))})


# ---------------------------------------------------------------- progress
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


# ---------------------------------------------------------------- catalog (tracks, language projects, resources)
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


# ---------------------------------------------------------------- AI mentor
@api.post("/mentor")
@login_required
def mentor():
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
    }
    return jsonify(roadmap_ai.mentor_reply(question, context))


# ---------------------------------------------------------------- dashboard (one call for the page)
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
