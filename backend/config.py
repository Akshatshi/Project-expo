import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
DATA_DIR = BASE_DIR / "data"

load_dotenv(BASE_DIR / ".env")


def _load_secret_key() -> str:
    env_key = os.getenv("SECRET_KEY", "").strip()
    if env_key:
        return env_key
    instance = BASE_DIR / "instance"
    instance.mkdir(exist_ok=True)
    key_file = instance / "secret.key"
    if key_file.exists():
        return key_file.read_text().strip()
    key = secrets.token_hex(32)
    key_file.write_text(key)
    return key


def _bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Config:
    SECRET_KEY = _load_secret_key()
    DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
    DATABASE_PATH = str(
        (BASE_DIR / os.getenv("DATABASE_PATH", "instance/skillmatrix.db")).resolve()
    )
    CORS_ORIGINS = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5500,http://127.0.0.1:5500,"
            "http://localhost:5000,http://127.0.0.1:5000",
        ).split(",")
        if o.strip()
    ]
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
    GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-flash-lite-latest").strip()
    MENTOR_MODEL = os.getenv("MENTOR_MODEL", "gemini-flash-lite-latest").strip()
    AI_MENTOR_TIMEOUT = int(os.getenv("AI_MENTOR_TIMEOUT", "8"))     # seconds to wait for the next piece of a mentor reply
    AI_ASYNC = os.getenv("AI_ASYNC", "true").strip().lower() != "false"
    AI_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "45"))
    DEV_MODE = _bool("DEV_MODE", True)
    TOKEN_MAX_AGE_SECONDS = 7 * 24 * 3600
    RESET_TOKEN_MAX_AGE_SECONDS = 30 * 60
    MAX_CONTENT_LENGTH = 64 * 1024  # 64 KB request bodies are plenty
    JSON_SORT_KEYS = False
