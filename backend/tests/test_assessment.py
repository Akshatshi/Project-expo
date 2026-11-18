import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402

import assessment  # noqa: E402
import market  # noqa: E402
from test_api import SKILLS, auth, client  # noqa: E402,F401

GOOD_ANSWER = "def second(nums): s = sorted(set(nums)); return s[-2] if len(s) > 1 else None; use max too"


@pytest.fixture(autouse=True)
def fast(monkeypatch):
    monkeypatch.setattr(assessment, "MIN_SECONDS", 0)
    monkeypatch.setattr(assessment, "shuffled", lambda row: [0, 1, 2, 3])


def start(client, auth, lang="python", claim=3):
    r = client.post("/api/assessment/start", json={"lang": lang, "claim": claim}, headers=auth)
    assert r.status_code == 201
    return r.get_json()


def test_bank_is_large_enough_for_every_level():
    counts = {}
    for q in assessment.bank().values():
        counts[(q["lang"], q["level"])] = counts.get((q["lang"], q["level"]), 0) + 1
    assert len(assessment.bank()) >= 200
    assert all(counts.get((lang, lvl), 0) >= 5 for lang in assessment.langs() for lvl in range(3))


def test_start_does_not_leak_answers(client, auth):
    paper = start(client, auth)
    assert len(paper["questions"]) == 10
    for q in paper["questions"]:
        assert set(q) == {"n", "id", "q", "code", "level", "options"} and len(q["options"]) == 4


def test_unknown_language_is_rejected(client, auth):
    r = client.post("/api/assessment/start", json={"lang": "cobol"}, headers=auth)
    assert r.status_code == 400


def test_all_correct_gives_advanced_and_cannot_resubmit(client, auth):
    paper = start(client, auth)
    body = {"answers": [0] * 10, "practical": GOOD_ANSWER}
    r = client.post(f"/api/assessment/{paper['id']}/submit", json=body, headers=auth)
    result = r.get_json()["result"]
    assert result["level"] == 3 and result["pct"] >= 90
    assert client.post(f"/api/assessment/{paper['id']}/submit", json=body, headers=auth).status_code == 409


def test_all_wrong_gives_beginner(client, auth):
    paper = start(client, auth)
    r = client.post(f"/api/assessment/{paper['id']}/submit", json={"answers": [3] * 10, "practical": ""}, headers=auth)
    assert r.get_json()["result"]["level"] == 1


def test_submit_too_fast_is_blocked(client, auth, monkeypatch):
    monkeypatch.setattr(assessment, "MIN_SECONDS", 3600)
    paper = start(client, auth)
    r = client.post(f"/api/assessment/{paper['id']}/submit", json={"answers": [0] * 10}, headers=auth)
    assert r.status_code == 400 and r.get_json()["error"]["code"] == "too_fast"


def test_failed_test_lowers_level_in_next_analysis(client, auth):
    paper = start(client, auth)
    client.post(f"/api/assessment/{paper['id']}/submit", json={"answers": [3] * 10}, headers=auth)
    skills = [{"name": "Python", "level": "Advanced"}, {"name": "HTML", "level": "Advanced"}]
    r = client.post("/api/analysis", json={"internship_id": "web-developer", "skills": skills}, headers=auth)
    verification = r.get_json()["analysis"]["verification"]
    assert verification and verification[0]["skill"] == "Python" and verification[0]["assessed"] == "Beginner"
    summary = client.get("/api/assessment/summary", headers=auth).get_json()["skills"]
    assert summary[0]["claimed"] == "Advanced" and summary[0]["assessed"] == "Beginner"


def test_leaderboard_shows_short_name(client, auth):
    paper = start(client, auth, claim=1)
    client.post(f"/api/assessment/{paper['id']}/submit", json={"answers": [0] * 10, "practical": GOOD_ANSWER}, headers=auth)
    top = client.get("/api/leaderboard", headers=auth).get_json()["leaderboard"]
    assert top[0]["you"] and top[0]["name"] == "Asha V."


def test_market_endpoint_and_counting(client, monkeypatch):
    monkeypatch.setattr(market, "live", lambda force=False: None)
    data = client.get("/api/market").get_json()
    assert data["snapshot"]["skills"] and data["live"] is None
    jobs = [{"title": "Python developer", "tags": ["django"], "description": "<p>We use Docker and SQL</p>"}]
    names = [n for n, _ in market.count_skills(jobs)]
    assert {"Python", "Docker", "SQL"} <= set(names)


def test_linkedin_draft_needs_ai_key(client, auth):
    r = client.post("/api/linkedin/draft", json={"role": "Data Intern", "skills": ["Python"]}, headers=auth)
    assert r.status_code == 503 and r.get_json()["error"]["code"] == "ai_unavailable"


def test_saved_data_roundtrip_and_key_rules(client, auth):
    assert client.put("/api/data/sm_resume", json={"value": {"name": "Asha"}}, headers=auth).status_code == 200
    assert client.get("/api/data", headers=auth).get_json()["data"]["sm_resume"]["name"] == "Asha"
    assert client.put("/api/data/sys_weak", json={"value": []}, headers=auth).status_code == 400
    assert client.put("/api/data/sm_big", json={"value": "x" * 400000}, headers=auth).status_code == 413
    client.delete("/api/data/sm_resume", headers=auth)
    assert "sm_resume" not in client.get("/api/data", headers=auth).get_json()["data"]


def test_saved_data_is_private_per_user(client, auth):
    client.put("/api/data/sm_notes_python", json={"value": "mine"}, headers=auth)
    other = client.post("/api/auth/signup", json={"full_name": "Ravi K", "email": "ravi@example.com", "user_id": "ravi01", "password": "Secret123", "confirm_password": "Secret123"})
    h2 = {"Authorization": "Bearer " + other.get_json()["token"]}
    assert client.get("/api/data", headers=h2).get_json()["data"] == {}


def test_export_hides_secrets_and_delete_needs_password(client, auth):
    paper = start(client, auth)
    dump = client.get("/api/account/export", headers=auth).get_json()
    text = str(dump)
    assert "password" not in text and "paper_json" not in text and dump["account"]["email"] == "asha@example.com"
    assert client.delete("/api/account", json={"password": "wrong"}, headers=auth).status_code == 403
    assert client.delete("/api/account", json={"password": "Secret123"}, headers=auth).status_code == 200
    assert client.get("/api/profile", headers=auth).status_code == 401


def test_simulator_never_lowers_match(client, auth):
    skills = [{"name": "HTML", "level": "Beginner"}]
    r = client.post("/api/simulate", json={"internship_id": "web-developer", "skills": skills, "add": {"name": "JavaScript", "level": 3}}, headers=auth)
    d = r.get_json()
    assert r.status_code == 200 and d["after"] >= d["before"] and d["gain"] == round(d["after"] - d["before"], 1)


def test_wrong_answers_feed_daily_practice_and_mentor(client, auth, monkeypatch):
    paper = start(client, auth)
    client.post(f"/api/assessment/{paper['id']}/submit", json={"answers": [3] * 10}, headers=auth)
    seen = {}
    import roadmap_ai
    monkeypatch.setattr(roadmap_ai, "mentor_reply", lambda q, c: seen.update(c) or {"reply": "ok"})
    client.post("/api/mentor", json={"question": "what should I revise?"}, headers=auth)
    assert seen["weak_topics"] and seen["weak_topics"][0]["skill"] == "Python"
    day = client.get("/api/practice/daily", headers=auth).get_json()
    assert len(day["questions"]) == 5 and day["from_weak"] >= 1 and all("why" not in q for q in day["questions"])
    res = client.post("/api/practice/check", json={"answers": [0] * 5}, headers=auth).get_json()
    assert res["total"] == 5 and client.get("/api/practice/daily", headers=auth).get_json()["done"] is True


def test_question_quality_flags(client, auth):
    for _ in range(5):
        p = start(client, auth)
        client.post(f"/api/assessment/{p['id']}/submit", json={"answers": [3] * 10}, headers=auth)
    d = client.get("/api/assessment/quality", headers=auth).get_json()
    assert d["total_tracked"] >= 0 and isinstance(d["questions"], list)
