import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import matcher  # noqa: E402
import projects  # noqa: E402
import roadmap_ai  # noqa: E402
from app import create_app  # noqa: E402

SIGNUP = {"full_name": "Asha Verma", "email": "asha@example.com", "user_id": "asha01",
          "password": "Secret123", "confirm_password": "Secret123"}
SKILLS = [{"name": "html", "level": "advanced"}, {"name": "CSS", "level": "intermediate"},
          {"name": "js", "level": "beginner"}, {"name": "Python", "level": "intermediate"}]


@pytest.fixture()
def client(tmp_path):
    import os
    pg = os.getenv("TEST_DATABASE_URL", "")          # run: TEST_DATABASE_URL=postgresql://... pytest
    if pg:
        import psycopg
        with psycopg.connect(pg) as c:
            c.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public")
    app = create_app({"TESTING": True, "AI_ASYNC": False, "DATABASE_PATH": str(tmp_path / "t.db"), "DATABASE_URL": pg,
                      "GEMINI_API_KEY": "", "DEV_MODE": True,
                      "CORS_ORIGINS": ["http://localhost:5500"]})
    return app.test_client()


@pytest.fixture()
def auth(client):
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    return {"Authorization": "Bearer " + r.get_json()["token"]}


def test_match_percent_is_exact():
    _, req, _, _ = matcher.resolve_target("web-developer", None)
    skills = [{"name": "html", "level": 3}, {"name": "CSS", "level": 2}, {"name": "js", "level": 1}, {"name": "Python", "level": 2}]
    res = matcher.analyze(skills, req)
    assert res["match_percent"] == 44.1
    assert [m["skill"] for m in res["matched"]] == ["HTML", "CSS"]
    assert [m["skill"] for m in res["partial"]] == ["JavaScript"]
    assert "React" in [m["skill"] for m in res["missing"]]
    assert [e["skill"] for e in res["extra_skills"]] == ["Python"]


def test_aliases_and_duplicates_keep_highest_level():
    _, req, _, _ = matcher.resolve_target("web-developer", None)
    res = matcher.analyze([{"name": "JS", "level": 1}, {"name": "javascript", "level": 3}, {"name": "ReactJS", "level": 2}], req)
    names = [m["skill"] for m in res["matched"]]
    assert "JavaScript" in names and "React" in names


def test_zero_and_perfect_scores():
    _, req, _, _ = matcher.resolve_target("python-developer", None)
    assert matcher.analyze([], req)["match_percent"] == 0
    full = [{"name": r["skill"], "level": 3} for r in req]
    assert matcher.analyze(full, req)["match_percent"] == 100


def test_every_catalog_skill_has_a_project_and_aliases_resolve():
    covered = {matcher.skill_key(s) for p in projects.load_projects() for s in p["skills"]}
    for item in matcher.load_catalog():
        for r in item["required_skills"]:
            assert matcher.skill_key(r["skill"]) in covered, r["skill"]
    for target in matcher.ALIASES.values():
        assert target == matcher.skill_key(target)


def test_project_recommendation_targets_gaps():
    _, req, _, _ = matcher.resolve_target("data-analyst", None)
    res = matcher.analyze([{"name": "Excel", "level": 3}], req)
    recs = projects.recommend(res, req)
    assert 1 <= len(recs) <= 3
    covered = {c for p in recs for c in p["covers"]}
    assert covered & set(res["gaps_priority"])
    assert "Excel" not in covered  # already known


def test_signup_validation_errors(client):
    bad = {**SIGNUP, "email": "nope", "password": "short", "confirm_password": "x", "user_id": "a b"}
    r = client.post("/api/auth/signup", json=bad)
    assert r.status_code == 400
    assert r.get_json()["error"]["code"] == "validation_error"


def test_signup_duplicate_and_login(client):
    assert client.post("/api/auth/signup", json=SIGNUP).status_code == 201
    dup = client.post("/api/auth/signup", json={**SIGNUP, "user_id": "other"})
    assert dup.status_code == 400 and "email" in dup.get_json()["error"]["fields"]
    assert client.post("/api/auth/login", json={"identifier": "asha@example.com", "password": "Secret123"}).status_code == 200
    assert client.post("/api/auth/login", json={"identifier": "ASHA01", "password": "Secret123"}).status_code == 200
    assert client.post("/api/auth/login", json={"identifier": "asha01", "password": "wrong-pass"}).status_code == 401


def test_protected_routes_need_token(client):
    for path in ("/api/dashboard", "/api/profile", "/api/analysis/latest", "/api/roadmap/latest", "/api/progress"):
        r = client.get(path)
        assert r.status_code == 401, path
    assert client.get("/api/dashboard", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_bad_json_and_unknown_route_return_json(client, auth):
    r = client.post("/api/analysis", data="not json", headers={**auth, "Content-Type": "application/json"})
    assert r.status_code == 400 and r.get_json()["error"]["code"] == "invalid_json"
    r = client.get("/api/does-not-exist")
    assert r.status_code == 404 and "error" in r.get_json()


def test_password_reset_flow(client):
    client.post("/api/auth/signup", json=SIGNUP)
    r = client.post("/api/auth/forgot-password", json={"email": "asha@example.com"})
    link = r.get_json()["dev_reset_link"]
    token = link.split("token=")[1]
    ok = client.post("/api/auth/reset-password", json={"token": token, "password": "NewPass456", "confirm_password": "NewPass456"})
    assert ok.status_code == 200
    again = client.post("/api/auth/reset-password", json={"token": token, "password": "Another789", "confirm_password": "Another789"})
    assert again.status_code == 400
    assert client.post("/api/auth/login", json={"identifier": "asha01", "password": "NewPass456"}).status_code == 200
    unknown = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
    assert unknown.status_code == 200 and "dev_reset_link" not in unknown.get_json()


def analyse(client, auth, **extra):
    payload = {"internship_id": "web-developer", "skills": SKILLS, "course": "B.Tech", "year": "2nd Year", **extra}
    return client.post("/api/analysis", json=payload, headers=auth)


def test_analysis_validation(client, auth):
    assert analyse(client, auth, internship_id="nope").status_code == 400
    assert analyse(client, auth, skills=[]).status_code == 400
    assert analyse(client, auth, skills=[{"name": "<script>", "level": 1}]).status_code == 400
    assert analyse(client, auth, skills=[{"name": "HTML", "level": "godlike"}]).status_code == 400
    assert client.post("/api/analysis", json={"skills": ["HTML"]}, headers=auth).status_code == 400


def test_analysis_saves_profile_and_returns_projects(client, auth):
    r = analyse(client, auth)
    assert r.status_code == 201
    a = r.get_json()["analysis"]
    assert a["match_percent"] == 44.1 and a["projects"] and a["career_matches"]
    dash = client.get("/api/dashboard", headers=auth).get_json()
    assert dash["analysis"]["id"] == a["id"]
    assert dash["profile"]["course"] == "B.Tech"
    assert {s["name"] for s in dash["profile"]["skills"]} >= {"html", "Python"}


def test_custom_internship(client, auth):
    r = client.post("/api/analysis", headers=auth, json={
        "skills": ["Python"], "custom_internship": {"title": "AI Intern", "required_skills": ["Python", "PyTorch"]}})
    a = r.get_json()["analysis"]
    assert r.status_code == 201 and a["target"]["custom"] and a["match_percent"] == 50.0


def test_roadmap_fallback_without_api_key(client, auth):
    analyse(client, auth)
    r = client.post("/api/roadmap", json={"weeks": 5, "hours_per_week": 6}, headers=auth)
    assert r.status_code == 201
    body = r.get_json()
    assert body["roadmap"]["source"] == "fallback" and body["warning"]
    assert len(body["roadmap"]["weeks"]) == 5
    assert client.post("/api/roadmap", json={"weeks": 99}, headers=auth).status_code == 400


def test_roadmap_requires_analysis(client, auth):
    assert client.post("/api/roadmap", json={}, headers=auth).status_code == 404


def test_roadmap_with_mocked_ai_and_bad_ai(client, auth, monkeypatch):
    analyse(client, auth)
    app = client.application
    app.config["GEMINI_API_KEY"] = "test-key"
    good = {"summary": "Go!", "weeks": [{"week": i, "title": f"W{i}", "focus_skills": ["React"], "goal": "g",
                                         "tasks": ["a", "b", "c"], "milestone": "m"} for i in (1, 2, 3)]}
    monkeypatch.setattr(roadmap_ai, "call_gemini", lambda s, u: "```json\n" + json.dumps(good) + "\n```")
    r = client.post("/api/roadmap", json={"weeks": 3}, headers=auth).get_json()
    assert r["roadmap"]["source"] == "ai" and r["warning"] is None

    monkeypatch.setattr(roadmap_ai, "call_gemini", lambda s, u: "Sorry, I cannot do that")
    r = client.post("/api/roadmap", json={"weeks": 3}, headers=auth).get_json()
    assert r["roadmap"]["source"] == "fallback" and r["warning"]

    def boom(s, u):
        raise roadmap_ai.RoadmapError("HTTP 500")
    monkeypatch.setattr(roadmap_ai, "call_gemini", boom)
    assert client.post("/api/roadmap", json={"weeks": 3}, headers=auth).status_code == 201


def test_progress_tracking(client, auth):
    analyse(client, auth)
    rm = client.post("/api/roadmap", json={"weeks": 4}, headers=auth).get_json()["roadmap"]
    total = rm["progress"]["total_tasks"]
    r = client.put("/api/progress", json={"week": 1, "task_index": 0, "completed": True}, headers=auth)
    assert r.status_code == 200
    p = r.get_json()["roadmap"]["progress"]
    assert p["completed_tasks"] == 1 and p["total_tasks"] == total
    client.put("/api/progress", json={"week": 1, "task_index": 0, "completed": False}, headers=auth)
    assert client.get("/api/progress", headers=auth).get_json()["roadmap"]["progress"]["completed_tasks"] == 0
    for bad in ({"week": 99, "task_index": 0, "completed": True},
                {"week": 1, "task_index": 99, "completed": True},
                {"week": 1, "task_index": 0, "completed": "yes"},
                {"task_index": 0, "completed": True}):
        assert client.put("/api/progress", json=bad, headers=auth).status_code == 400, bad


def test_users_cannot_see_each_others_data(client, auth):
    analyse(client, auth)
    other = client.post("/api/auth/signup", json={**SIGNUP, "email": "b@example.com", "user_id": "bee"}).get_json()["token"]
    h = {"Authorization": "Bearer " + other}
    assert client.get("/api/analysis/latest", headers=h).status_code == 404
    assert client.post("/api/roadmap", json={"analysis_id": 1}, headers=h).status_code == 404


def test_cors_headers(client):
    ok = client.options("/api/auth/login", headers={"Origin": "http://localhost:5500",
                        "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization"})
    assert ok.headers.get("Access-Control-Allow-Origin") == "http://localhost:5500"
    evil = client.get("/api/health", headers={"Origin": "http://evil.example"})
    assert "Access-Control-Allow-Origin" not in evil.headers


def test_catalog_and_mentor_fallback(client, auth):
    tracks = client.get("/api/catalog/tracks").get_json()["tracks"]
    assert len(tracks) >= 6 and tracks[0]["stages"][0]["resources"][0]["english"].startswith("https://www.youtube.com/")
    langs = client.get("/api/catalog/projects").get_json()["languages"]
    assert any(l["language"] == "Python" for l in langs)
    r = client.get("/api/catalog/resources?skills=Python,React").get_json()
    assert [x["skill"] for x in r["resources"]] == ["Python", "React"]
    assert client.get("/api/catalog/resources").status_code == 400
    assert client.post("/api/mentor", json={"question": "x"}, headers=auth).status_code == 400
    ok = client.post("/api/mentor", json={"question": "What should I learn first?"}, headers=auth).get_json()
    assert ok["source"] == "kb" and ok["reply"]


def test_gemini_request_shape(client, monkeypatch):
    import requests as rq
    seen = {}

    class R:
        status_code = 200
        text = ""
        def json(self): return {"candidates": [{"content": {"parts": [{"text": "hello"}]}}]}

    def fake_post(url, headers=None, json=None, timeout=None):
        seen.update(url=url, headers=headers, body=json); return R()

    monkeypatch.setattr(rq, "post", fake_post)
    with client.application.app_context():
        client.application.config["GEMINI_API_KEY"] = "k"
        assert roadmap_ai.call_gemini("sys", "usr") == "hello"
    assert "key=" not in seen["url"] and seen["headers"]["x-goog-api-key"] == "k"
    assert seen["body"]["contents"][0]["parts"][0]["text"] == "usr"


def test_roadmap_warning_explains_reason_in_dev_mode(client, auth, monkeypatch):
    analyse(client, auth)
    app = client.application
    app.config["GEMINI_API_KEY"] = "secret-test-key"
    app.config["DEV_MODE"] = True

    def nf(s, u):
        raise roadmap_ai.RoadmapError("AI API returned HTTP 404: model not found")
    monkeypatch.setattr(roadmap_ai, "call_gemini", nf)
    r = client.post("/api/roadmap", json={"weeks": 3}, headers=auth).get_json()
    assert "GEMINI_MODEL" in r["warning"] and "secret-test-key" not in r["warning"]
    app.config["DEV_MODE"] = False
    r = client.post("/api/roadmap", json={"weeks": 3}, headers=auth).get_json()
    assert "Reason" not in r["warning"]


def test_postgres_translation_helpers():
    import db
    assert db.to_pg("SELECT * FROM users WHERE id = ? AND name LIKE '100%'") == "SELECT * FROM users WHERE id = %s AND name LIKE '100%%'"
    stmts = db._pg_schema()
    assert any("SERIAL PRIMARY KEY" in x for x in stmts) and not any("AUTOINCREMENT" in x or "datetime(" in x for x in stmts)


def test_gemini_retries_without_thinking_on_400(client, monkeypatch):
    import requests as rq
    bodies = []

    class R:
        def __init__(self, code, text, data=None):
            self.status_code, self.text, self._d = code, text, data or {}
        def json(self): return self._d

    def fake_post(url, headers=None, json=None, timeout=None):
        bodies.append(json["generationConfig"].get("thinkingConfig"))
        if len(bodies) == 1:
            return R(400, "Unknown name thinkingLevel: thinking is not supported")
        return R(200, "", {"candidates": [{"content": {"parts": [{"text": "ok"}]}}]})

    monkeypatch.setattr(rq, "post", fake_post)
    with client.application.app_context():
        client.application.config["GEMINI_API_KEY"] = "k"
        assert roadmap_ai.call_gemini("s", "u") == "ok"
    assert bodies[0] == {"thinkingLevel": "minimal"} and bodies[1] == {"thinkingLevel": "low"}


def test_unexpected_ai_crash_still_returns_fallback(client, auth, monkeypatch):
    analyse(client, auth)
    client.application.config["GEMINI_API_KEY"] = "k"
    def boom(s, u): raise KeyError("weird")
    monkeypatch.setattr(roadmap_ai, "call_gemini", boom)
    r = client.post("/api/roadmap", json={"weeks": 3}, headers=auth)
    assert r.status_code in (200, 201) and r.get_json()["roadmap"]["source"] == "fallback"
    m = client.post("/api/mentor", json={"question": "help me please"}, headers=auth)
    assert m.status_code == 200 and m.get_json()["source"] in ("kb", "fallback")


def test_long_roadmap_is_built_in_parallel_chunks(client, auth, monkeypatch):
    import re
    analyse(client, auth)
    client.application.config["GEMINI_API_KEY"] = "k"
    prompts = []

    def fake(system, user):
        prompts.append(user)
        m = re.search(r"weeks (\d+) to (\d+)", user)
        a, b = int(m.group(1)), int(m.group(2))
        weeks = [{"week": n, "title": f"W{n}", "focus_skills": ["Python"], "goal": "g",
                  "tasks": ["t1", "t2", "t3"], "milestone": "m"} for n in range(a, b + 1)]
        return json.dumps({"summary": "Nice plan." if a == 1 else "", "weeks": weeks})

    monkeypatch.setattr(roadmap_ai, "call_gemini", fake)
    r = client.post("/api/roadmap", json={"weeks": 8}, headers=auth).get_json()["roadmap"]
    assert r["source"] == "ai" and [w["week"] for w in r["weeks"]] == list(range(1, 9))
    assert r["summary"] == "Nice plan." and len(prompts) == 3


def _wait_for_ai(client, auth, seconds=6):
    import time
    end = time.time() + seconds
    while time.time() < end:
        r = client.get("/api/roadmap/latest", headers=auth).get_json()["roadmap"]
        if r["ai_status"] != "pending":
            return r
        time.sleep(0.1)
    return r


def test_background_roadmap_template_first_then_ai(client, auth, monkeypatch):
    analyse(client, auth)
    client.application.config.update(GEMINI_API_KEY="k", AI_ASYNC=True)
    plan = {"summary": "AI summary.", "weeks": [{"week": n, "title": f"W{n}", "focus_skills": ["Python"], "goal": "g",
            "tasks": ["a", "b", "c"], "milestone": "m"} for n in (1, 2, 3)]}
    monkeypatch.setattr(roadmap_ai, "call_gemini", lambda s, u: json.dumps(plan))
    first = client.post("/api/roadmap", json={"weeks": 3}, headers=auth)
    assert first.status_code == 201 and first.get_json()["roadmap"]["ai_status"] in ("pending", "done")
    final = _wait_for_ai(client, auth)
    assert final["source"] == "ai" and final["ai_status"] == "done" and final["summary"] == "AI summary."


def test_background_roadmap_failure_keeps_template(client, auth, monkeypatch):
    analyse(client, auth)
    client.application.config.update(GEMINI_API_KEY="k", AI_ASYNC=True, DEV_MODE=True)
    def boom(s, u): raise roadmap_ai.RoadmapError("AI API returned HTTP 404: nope")
    monkeypatch.setattr(roadmap_ai, "call_gemini", boom)
    client.post("/api/roadmap", json={"weeks": 3}, headers=auth)
    final = _wait_for_ai(client, auth)
    assert final["source"] == "fallback" and final["ai_status"] == "failed" and "GEMINI_MODEL" in final["ai_note"]


def test_model_fallback_on_timeout(client, monkeypatch):
    import requests as rq
    urls = []

    class R:
        status_code = 200
        text = ""
        def json(self): return {"candidates": [{"content": {"parts": [{"text": "hi"}]}}]}

    def fake_post(url, headers=None, json=None, timeout=None):
        urls.append(url)
        if len(urls) == 1:
            raise rq.exceptions.ReadTimeout("slow")
        return R()

    monkeypatch.setattr(rq, "post", fake_post)
    with client.application.app_context():
        client.application.config.update(GEMINI_API_KEY="k", GEMINI_MODEL="main-model", GEMINI_FALLBACK_MODEL="backup-model")
        assert roadmap_ai.call_gemini("s", "u") == "hi"
    assert "main-model" in urls[0] and "backup-model" in urls[1]


def test_mentor_kb_answers_without_ai(client, auth):
    for q, word in [("resume tips do", "1 page"), ("focus timer kaise use kare", "Pomodoro"), ("dsa kaise start karun", "LeetCode")]:
        r = client.post("/api/mentor", json={"question": q}, headers=auth).get_json()
        assert r["source"] == "kb" and word in r["reply"]
    odd = client.post("/api/mentor", json={"question": "zzqx plmv wrtt"}, headers=auth).get_json()
    assert odd["source"] == "fallback" and "resume tips" in odd["reply"]


def test_mentor_kb_entries_are_well_formed():
    import mentor_kb
    assert len(mentor_kb.ENTRIES) >= 70
    for keys, text in mentor_kb.ENTRIES:
        assert keys.strip() and 20 < len(text) < 700


def _stream_items(client, auth, question):
    r = client.post("/api/mentor/stream", json={"question": question}, headers=auth)
    assert r.status_code == 200 and r.mimetype == "application/x-ndjson"
    return [json.loads(x) for x in r.get_data(as_text=True).strip().split("\n")]


def test_mentor_stream_kb_ai_and_failure(client, auth, monkeypatch):
    items = _stream_items(client, auth, "resume tips do")
    assert items[0] == {"source": "kb"} and "1 page" in items[1]["text"] and items[-1] == {"done": True}

    client.application.config["GEMINI_API_KEY"] = "k"
    monkeypatch.setattr(roadmap_ai, "stream_gemini", lambda s, u, **kw: iter(["Hello ", "there"]))
    items = _stream_items(client, auth, "zzqx plmv wrtt")
    assert items[0] == {"source": "ai"} and "".join(i.get("text", "") for i in items) == "Hello there"

    def broken(s, u, max_tokens=700):
        raise roadmap_ai.RoadmapError("AI API returned HTTP 503: busy")
        yield
    monkeypatch.setattr(roadmap_ai, "stream_gemini", broken)
    items = _stream_items(client, auth, "zzqx plmv wrtt")
    assert items[0] == {"source": "fallback"} and items[-1] == {"done": True}


def test_stream_gemini_parses_sse_and_retries_thinking(client, monkeypatch):
    calls = []

    class R:
        def __init__(self, code, text="", lines=()):
            self.status_code, self.text, self._lines = code, text, lines
        def iter_lines(self, decode_unicode=True):
            return iter(self._lines)

    def fake_post(url, **kw):
        calls.append(kw["json"]["generationConfig"].get("thinkingConfig"))
        if len(calls) == 1:
            return R(400, "thinking level not supported")
        chunk = {"candidates": [{"content": {"parts": [{"text": "Hi"}]}}]}
        return R(200, lines=["", "data: " + json.dumps(chunk), "data: " + json.dumps(chunk)])

    monkeypatch.setattr(roadmap_ai._session, "post", fake_post)
    with client.application.app_context():
        client.application.config["GEMINI_API_KEY"] = "k"
        assert "".join(roadmap_ai.stream_gemini("s", "u")) == "HiHi"
    assert calls[0] == {"thinkingLevel": "minimal"} and calls[1] == {"thinkingLevel": "low"}
