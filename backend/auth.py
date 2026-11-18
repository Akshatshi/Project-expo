import hashlib
import secrets
from functools import wraps

from flask import current_app, g, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db
from errors import ApiError


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    return check_password_hash(password_hash, password)


def _serializer(salt: str) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=salt)


def create_token(user_id: int) -> str:
    return _serializer("login").dumps({"uid": user_id})


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_reset_token() -> str:
    return secrets.token_urlsafe(32)


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            raise ApiError(401, "unauthorized", "Please log in to continue.")
        token = header[7:].strip()
        try:
            data = _serializer("login").loads(
                token, max_age=current_app.config["TOKEN_MAX_AGE_SECONDS"]
            )
        except SignatureExpired:
            raise ApiError(401, "token_expired", "Your session expired. Please log in again.")
        except BadSignature:
            raise ApiError(401, "invalid_token", "Invalid login token. Please log in again.")
        user = get_db().execute("SELECT * FROM users WHERE id = ?", (data["uid"],)).fetchone()
        if user is None:
            raise ApiError(401, "invalid_token", "Account not found. Please log in again.")
        g.user = user
        return view(*args, **kwargs)

    return wrapper
