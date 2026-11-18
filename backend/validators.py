import re

from errors import ApiError

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USER_ID_RE = re.compile(r"^[A-Za-z0-9_.-]{3,30}$")
SKILL_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 +#./&'\-]*$")
LEVELS = {"beginner": 1, "intermediate": 2, "advanced": 3}
LEVEL_LABELS = {1: "Beginner", 2: "Intermediate", 3: "Advanced"}
MAX_SKILLS = 40
MAX_CUSTOM_REQUIRED = 25


def fail(fields: dict, message: str = "Please correct the highlighted fields."):
    raise ApiError(400, "validation_error", message, fields)


def require_json(data):
    if not isinstance(data, dict):
        raise ApiError(400, "invalid_json", "Request body must be a JSON object.")
    return data


def _text(data, key, *, min_len=0, max_len=100, required=True, label=None):
    label = label or key.replace("_", " ")
    value = data.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            fail({key: f"{label.capitalize()} is required."})
        return ""
    if not isinstance(value, str):
        fail({key: f"{label.capitalize()} must be text."})
    value = " ".join(value.split())
    if len(value) < min_len:
        fail({key: f"{label.capitalize()} must be at least {min_len} characters."})
    if len(value) > max_len:
        fail({key: f"{label.capitalize()} must be at most {max_len} characters."})
    return value


def validate_email(data, key="email"):
    value = _text(data, key, max_len=254, label="email").lower()
    if not EMAIL_RE.match(value):
        fail({key: "Enter a valid email address."})
    return value


def validate_password(data, key="password"):
    value = data.get(key)
    if not isinstance(value, str) or not value:
        fail({key: "Password is required."})
    if len(value) < 8:
        fail({key: "Password must be at least 8 characters."})
    if len(value) > 128:
        fail({key: "Password must be at most 128 characters."})
    return value


def validate_signup(data):
    require_json(data)
    clean = {
        "full_name": _text(data, "full_name", min_len=2, max_len=80, label="full name"),
        "email": validate_email(data),
        "user_id": _text(data, "user_id", max_len=30, label="user id"),
        "password": validate_password(data),
    }
    if not USER_ID_RE.match(clean["user_id"]):
        fail({"user_id": "User ID must be 3-30 characters: letters, numbers, . _ - only."})
    if data.get("confirm_password") != clean["password"]:
        fail({"confirm_password": "Passwords do not match."})
    return clean


def validate_login(data):
    require_json(data)
    identifier = _text(data, "identifier", max_len=254, label="email or user id")
    password = data.get("password")
    if not isinstance(password, str) or not password:
        fail({"password": "Password is required."})
    return identifier, password


def clean_skill_name(raw, field="skills"):
    if not isinstance(raw, str):
        fail({field: "Each skill must be text."})
    name = " ".join(raw.split())
    if not name or len(name) > 40 or not SKILL_RE.match(name):
        fail({field: f"'{raw[:40]}' is not a valid skill name (max 40 chars; letters, numbers and + # . / & - only)."})
    return name


def parse_level(raw, field="skills"):
    if raw is None:
        return 2
    if isinstance(raw, bool):
        fail({field: "Skill level must be Beginner, Intermediate or Advanced."})
    if isinstance(raw, int) and raw in LEVEL_LABELS:
        return raw
    if isinstance(raw, str) and raw.strip().lower() in LEVELS:
        return LEVELS[raw.strip().lower()]
    fail({field: "Skill level must be Beginner, Intermediate or Advanced."})


def validate_skills(raw, *, min_items=0):
    if not isinstance(raw, list):
        fail({"skills": "Skills must be a list."})
    if len(raw) > MAX_SKILLS:
        fail({"skills": f"You can add at most {MAX_SKILLS} skills."})
    skills = []
    for item in raw:
        if isinstance(item, str):
            skills.append({"name": clean_skill_name(item), "level": 2})
        elif isinstance(item, dict):
            skills.append({"name": clean_skill_name(item.get("name")), "level": parse_level(item.get("level"))})
        else:
            fail({"skills": "Each skill must be text or {name, level}."})
    if len(skills) < min_items:
        fail({"skills": "Add at least one skill."})
    return skills


def validate_custom_internship(raw):
    if not isinstance(raw, dict):
        fail({"custom_internship": "Custom internship must be an object."})
    title = _text(raw, "title", min_len=2, max_len=80, label="internship title")
    req = raw.get("required_skills")
    if not isinstance(req, list) or not req:
        fail({"custom_internship": "Add at least one required skill."})
    if len(req) > MAX_CUSTOM_REQUIRED:
        fail({"custom_internship": f"At most {MAX_CUSTOM_REQUIRED} required skills."})
    names, seen = [], set()
    for r in req:
        name = clean_skill_name(r, "custom_internship")
        if name.lower() not in seen:
            seen.add(name.lower())
            names.append(name)
    return {"title": title, "required_skills": names}


def validate_profile_payload(data, *, skills_required):
    require_json(data)
    out = {}
    if "skills" in data or skills_required:
        out["skills"] = validate_skills(data.get("skills", []), min_items=1 if skills_required else 0)
    out["course"] = _text(data, "course", max_len=60, required=False)
    out["year"] = _text(data, "year", max_len=30, required=False)
    internship_id = data.get("internship_id")
    custom = data.get("custom_internship")
    if internship_id is not None and not isinstance(internship_id, str):
        fail({"internship_id": "Internship id must be text."})
    if internship_id and custom:
        fail({"internship_id": "Choose either a listed internship or a custom one, not both."})
    out["internship_id"] = internship_id or None
    out["custom_internship"] = validate_custom_internship(custom) if custom else None
    return out


def validate_int(data, key, *, default, lo, hi, label=None):
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, int):
        fail({key: f"{(label or key).replace('_', ' ').capitalize()} must be a whole number."})
    if not lo <= value <= hi:
        fail({key: f"{(label or key).replace('_', ' ').capitalize()} must be between {lo} and {hi}."})
    return value


def validate_password_reset(data):
    require_json(data)
    token = _text(data, "token", max_len=200, label="reset token")
    password = validate_password(data, "password")
    if data.get("confirm_password") != password:
        fail({"confirm_password": "Passwords do not match."})
    return token, password
