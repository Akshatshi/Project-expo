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
    app = create_app({"TESTING": True, "DATABASE_PATH": str(tmp_path / "t.db"),
                      "GEMINI_API_KEY": "", "DEV_MODE": True,
                      "CORS_ORIGINS": ["http://localhost:5500"]})
    return app.test_client()


@pytest.fixture()
def auth(client):
    r = client.post("/api/auth/signup", json=SIGNUP)
    assert r.status_code == 201
    return {"Authorization": "Bearer " + r.get_json()["token"]}


# ------------------------------------------------ deterministic matcher
def test_match_percent_is_exact():
    _, req, _, _ = matcher.resolve_target("web-developer", None)
    skills = [{"name": "html", "level": 3}, {"name": "CSS", "level": 2}, {"name": "js", "level": 1}, {"name": "Python", "level": 2}]
    res = matcher.analyze(skills, req)
    # weights: HTML3+CSS3+JS3+React2+Resp2+Git1+REST2+PS1 = 17 ; earned = 3+3+1.5 = 7.5
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


# ------------------------------------------------ auth + validation
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


# ------------------------------------------------ analysis -> roadmap -> progress
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


# ------------------------------------------------ CORS + static
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
    assert ok["source"] == "fallback" and ok["reply"]


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
