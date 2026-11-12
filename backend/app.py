"""Skill Matrix AI - Flask application.

Run:  python app.py        (serves the API on /api and the frontend on /)
"""
import os

from flask import Flask, abort, send_from_directory
from flask_cors import CORS

import db
from config import FRONTEND_DIR, Config
from errors import register_error_handlers
from routes import api


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.from_object(Config)
    if test_config:
        app.config.update(test_config)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "OPTIONS"],
        max_age=600,
    )
    db.init_app(app)
    register_error_handlers(app)
    app.register_blueprint(api)

    @app.after_request
    def security_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        return resp

    # The existing frontend is served by Flask too -> same origin, no CORS trouble.
    @app.get("/", defaults={"filename": "index.html"})
    @app.get("/<path:filename>")
    def frontend(filename):
        if filename.startswith("api/"):
            abort(404)
        return send_from_directory(FRONTEND_DIR, filename)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print(f"\n  Skill Matrix AI running ->  http://127.0.0.1:{port}\n"
          f"  AI (Gemini): {'ENABLED' if app.config['GEMINI_API_KEY'] else 'fallback template (set GEMINI_API_KEY in .env to enable)'}\n")
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=app.config["DEV_MODE"])
