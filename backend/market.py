import json
import logging
import re
import time

import requests

from config import DATA_DIR

log = logging.getLogger(__name__)
FEED = "https://remotive.com/api/remote-jobs"
TTL = 3600
_cache = {"at": 0.0, "data": None}

KEYWORDS = {
    "Python": r"\bpython\b", "JavaScript": r"\bjavascript\b|\bjs\b", "TypeScript": r"\btypescript\b", "React": r"\breact\b",
    "Node.js": r"\bnode\.?js\b", "Java": r"\bjava\b(?!script)", "SQL": r"\bsql\b|postgres|mysql", "AWS": r"\baws\b|amazon web",
    "Docker": r"\bdocker\b", "Kubernetes": r"kubernetes|\bk8s\b", "Machine Learning": r"machine learning|\bml\b",
    "LLM / GenAI": r"\bllm\b|generative ai|\bgenai\b|openai", "Go": r"\bgolang\b|\bgo\b(?= developer| engineer)", "Rust": r"\brust\b",
    "C++": r"c\+\+", "Git": r"\bgit\b", "REST APIs": r"rest(ful)? api", "Django / Flask / FastAPI": r"django|flask|fastapi",
    "Next.js": r"next\.?js", "Azure / GCP": r"\bazure\b|\bgcp\b|google cloud",
}


def snapshot() -> dict:
    with open(DATA_DIR / "market.json", encoding="utf-8") as fh:
        return json.load(fh)


def count_skills(jobs: list) -> list:
    totals = {name: 0 for name in KEYWORDS}
    for job in jobs:
        text = " ".join([job.get("title", ""), " ".join(job.get("tags") or []), re.sub(r"<[^>]+>", " ", job.get("description", ""))[:4000]]).lower()
        for name, pattern in KEYWORDS.items():
            if re.search(pattern, text):
                totals[name] += 1
    return sorted(([k, v] for k, v in totals.items() if v), key=lambda x: -x[1])


def live(force=False):
    now = time.time()
    if not force and _cache["data"] and now - _cache["at"] < TTL:
        return _cache["data"]
    try:
        resp = requests.get(FEED, params={"category": "software-dev", "limit": 150}, timeout=6)
        resp.raise_for_status()
        jobs = resp.json().get("jobs", [])
        data = {"source": "Remotive remote software jobs", "total_jobs": len(jobs), "skills": count_skills(jobs)[:12],
                "fetched_at": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime(now))}
        _cache.update(at=now, data=data)
        return data
    except Exception as exc:
        log.warning("Live job feed unavailable: %s", exc)
        return _cache["data"]
