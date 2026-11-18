import json
from functools import lru_cache

from config import DATA_DIR
from matcher import skill_key

LEVEL_ORDER = {"Beginner": 1, "Intermediate": 2, "Advanced": 3}


@lru_cache(maxsize=1)
def load_projects():
    with open(DATA_DIR / "projects.json", encoding="utf-8") as fh:
        return json.load(fh)["projects"]


def recommend(analysis: dict, requirements: list, limit: int = 3) -> list:
    weights = {skill_key(r["skill"]): r["weight"] for r in requirements}
    gap_names = {skill_key(s): s for s in analysis["gaps_priority"]}
    if not gap_names:  # nothing missing -> stretch projects on the most important skills
        top = sorted(requirements, key=lambda r: -r["weight"])[:4]
        gap_names = {skill_key(r["skill"]): r["skill"] for r in top}
        prefer = 3
    else:
        pct = analysis["match_percent"]
        prefer = 1 if pct < 35 else 2 if pct < 75 else 3

    uncovered = set(gap_names)
    pool = list(load_projects())
    picked = []
    while pool and len(picked) < limit:
        def score(p):
            covers = {skill_key(s) for s in p["skills"]} & uncovered
            gain = sum(weights.get(k, 1) for k in covers)
            fit = -abs(LEVEL_ORDER[p["level"]] - prefer)
            focus = len(covers) / len(p["skills"])  # fewer unrelated skills = better
            return (gain, fit, round(focus, 3))

        best = max(pool, key=lambda p: (score(p), tuple(-ord(c) for c in p["id"])))
        gain = score(best)[0]
        if gain == 0 and picked:
            break
        covers = [gap_names[k] for k in (uncovered & {skill_key(s) for s in best["skills"]})]
        picked.append({
            "id": best["id"], "title": best["title"], "icon": best["icon"],
            "level": best["level"], "description": best["description"],
            "covers": sorted(covers, key=str.lower),
        })
        uncovered -= {skill_key(s) for s in best["skills"]}
        pool.remove(best)
    return picked
