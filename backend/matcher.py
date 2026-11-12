"""Deterministic skill-matching logic. No AI is used here, so results are repeatable.

Scoring
-------
Every requirement has a *weight* (1-3 = how important) and a *min_level*
(1 Beginner, 2 Intermediate, 3 Advanced = level an intern should have).
A student's skill earns credit = min(student_level / min_level, 1).

    match % = sum(weight * credit) / sum(weight) * 100

credit == 1  -> "matched"   | 0 < credit < 1 -> "partial" | no skill -> "missing"
"""
import json
from functools import lru_cache

from config import DATA_DIR
from validators import LEVEL_LABELS

# alias (lowercase) -> canonical skill key (lowercase)
ALIASES = {
    "js": "javascript", "java script": "javascript", "ecmascript": "javascript",
    "reactjs": "react", "react.js": "react", "react js": "react",
    "ts": "typescript", "py": "python", "python3": "python",
    "html5": "html", "css3": "css",
    "postgres": "sql", "postgresql": "sql", "mysql": "sql", "sqlite": "sql", "sql server": "sql",
    "ms excel": "excel", "microsoft excel": "excel", "powerbi": "power bi",
    "oop": "object oriented programming", "oops": "object oriented programming",
    "object-oriented programming": "object oriented programming",
    "dsa": "data structures", "data structure": "data structures",
    "data structures & algorithms": "data structures", "data structures and algorithms": "data structures",
    "algorithms": "data structures",
    "ml": "machine learning", "sklearn": "scikit-learn", "scikit learn": "scikit-learn",
    "numpy": "numpy", "pandas": "pandas",
    "rest": "rest apis", "rest api": "rest apis", "restful api": "rest apis", "api": "rest apis", "apis": "rest apis",
    "github": "git", "git/github": "git", "git & github": "git",
    "responsive": "responsive design", "responsive web design": "responsive design",
    "data viz": "data visualization", "visualization": "data visualization", "matplotlib": "data visualization",
    "tableau": "data visualization",
    "unit tests": "unit testing", "pytest": "unit testing", "testing": "unit testing",
    "springboot": "spring boot", "spring": "spring boot",
    "android": "android sdk", "android development": "android sdk", "android studio": "android sdk",
    "cyber security": "security fundamentals", "cybersecurity": "security fundamentals", "infosec": "security fundamentals",
    "network": "networking", "computer networks": "networking", "tcp/ip": "networking",
    "ubuntu": "linux", "bash": "shell scripting", "shell": "shell scripting", "bash scripting": "shell scripting",
    "cicd": "ci/cd", "github actions": "ci/cd", "jenkins": "ci/cd",
    "amazon web services": "aws", "cloud": "aws",
    "encryption": "cryptography", "statistic": "statistics", "stats": "statistics",
    "problem-solving": "problem solving", "communication skills": "communication",
    "firebase": "firebase", "docker": "docker",
}

PRIORITY_LEVEL = {3: "High", 2: "Medium", 1: "Low"}


def skill_key(name: str) -> str:
    norm = " ".join(name.lower().split())
    return ALIASES.get(norm, norm)


@lru_cache(maxsize=1)
def load_catalog():
    with open(DATA_DIR / "internships.json", encoding="utf-8") as fh:
        return json.load(fh)["internships"]


@lru_cache(maxsize=1)
def skill_display_names() -> dict:
    """canonical key -> nicely written name, taken from the catalog."""
    names = {}
    for internship in load_catalog():
        for req in internship["required_skills"]:
            names[skill_key(req["skill"])] = req["skill"]
    return names


def known_skill_names() -> list:
    return sorted(skill_display_names().values(), key=str.lower)


def get_internship(internship_id: str):
    for item in load_catalog():
        if item["id"] == internship_id:
            return item
    return None


def custom_requirements(custom: dict) -> list:
    display = skill_display_names()
    return [
        {"skill": display.get(skill_key(n), n), "weight": 2, "min_level": 2}
        for n in custom["required_skills"]
    ]


def _student_index(skills: list) -> dict:
    """key -> {name, level}; duplicates keep the highest level."""
    index = {}
    for s in skills:
        k = skill_key(s["name"])
        if k not in index or s["level"] > index[k]["level"]:
            index[k] = {"name": skill_display_names().get(k, s["name"]), "level": s["level"]}
    return index


def analyze(skills: list, requirements: list) -> dict:
    index = _student_index(skills)
    matched, partial, missing = [], [], []
    total_weight = earned = 0.0
    used = set()

    for req in requirements:
        k = skill_key(req["skill"])
        have = index.get(k)
        level = have["level"] if have else 0
        credit = min(level / req["min_level"], 1.0) if level else 0.0
        total_weight += req["weight"]
        earned += req["weight"] * credit
        row = {
            "skill": req["skill"],
            "weight": req["weight"],
            "priority": PRIORITY_LEVEL[req["weight"]],
            "required_level": LEVEL_LABELS[req["min_level"]],
        }
        if credit >= 1:
            used.add(k)
            matched.append({**row, "your_level": LEVEL_LABELS[level]})
        elif credit > 0:
            used.add(k)
            partial.append({**row, "your_level": LEVEL_LABELS[level]})
        else:
            missing.append(row)

    percent = round(earned / total_weight * 100, 1) if total_weight else 0.0
    by_weight = lambda r: -r["weight"]  # stable sort keeps catalog order inside a weight
    partial.sort(key=by_weight)
    missing.sort(key=by_weight)
    gaps = [r["skill"] for r in sorted(missing + partial, key=by_weight)]
    extra = [
        {"skill": v["name"], "level": LEVEL_LABELS[v["level"]]}
        for k, v in index.items() if k not in used
    ]
    return {
        "match_percent": percent,
        "readiness": readiness_label(percent),
        "matched": matched,
        "partial": partial,
        "missing": missing,
        "extra_skills": extra,
        "gaps_priority": gaps,
        "counts": {
            "required": len(requirements),
            "matched": len(matched),
            "partial": len(partial),
            "missing": len(missing),
            "student_skills": len(index),
        },
    }


def readiness_label(percent: float) -> str:
    if percent >= 80:
        return "Internship Ready"
    if percent >= 60:
        return "Almost There"
    if percent >= 35:
        return "Building Up"
    return "Just Starting"


def career_matches(skills: list, limit: int = 4) -> list:
    """Match % of the student's skills against EVERY catalog internship."""
    rows = []
    for item in load_catalog():
        result = analyze(skills, item["required_skills"])
        top = sorted(item["required_skills"], key=lambda r: -r["weight"])[:4]
        rows.append({
            "internship_id": item["id"],
            "title": item["title"].replace(" Intern", ""),
            "match_percent": result["match_percent"],
            "key_skills": [r["skill"] for r in top],
        })
    rows.sort(key=lambda r: -r["match_percent"])
    return rows[:limit]


def resolve_target(internship_id, custom):
    """Return (title, requirements, internship_id, is_custom) or raise LookupError."""
    if custom:
        return custom["title"], custom_requirements(custom), None, True
    item = get_internship(internship_id) if internship_id else None
    if not item:
        raise LookupError(internship_id)
    return item["title"], item["required_skills"], item["id"], False


__all__ = ["analyze", "career_matches", "resolve_target", "known_skill_names", "load_catalog", "skill_key"]
