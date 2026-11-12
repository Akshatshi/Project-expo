# Skill Matrix AI

Students enter their skills, pick a target internship, and get:

1. a **skill-match %** (plain Python, deterministic – same input = same result)
2. **matched / partially matched / missing** skills
3. a personalised **week-wise roadmap** written by the Google Gemini API
4. **project recommendations** for the missing skills
5. saved **profile + progress tracking** (SQLite database)

**Stack:** Python 3.10+, Flask, SQLite, plain HTML/CSS/JS (your original frontend – design unchanged).

---

## Folder structure

```
skill-matrix-ai/
├── backend/
│   ├── app.py            # Flask app: CORS, error handlers, serves the frontend
│   ├── config.py         # settings read from environment variables / .env
│   ├── db.py             # SQLite schema (users, profiles, analyses, roadmaps, progress, password_resets)
│   ├── auth.py           # password hashing + signed login tokens
│   ├── validators.py     # all input validation
│   ├── matcher.py        # DETERMINISTIC match % + matched/missing logic
│   ├── projects.py       # project recommender (covers the skill gaps)
│   ├── roadmap_ai.py     # AI roadmap + validation + fallback template
│   ├── routes.py         # every /api endpoint
│   ├── errors.py         # one JSON error format
│   ├── data/             # internships.json (10 roles) + projects.json (24 projects)
│   ├── tests/test_api.py # 19 automated tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/             # your pages + js/api.js, js/auth.js, js/dashboard.js, css/app-extra.css
└── README.md
```

## Setup & run (Windows / macOS / Linux)

```bash
cd skill-matrix-ai/backend

python -m venv venv
venv\Scripts\activate            # Windows
# source venv/bin/activate       # macOS / Linux

pip install -r requirements.txt

cp .env.example .env             # Windows: copy .env.example .env
# open .env and paste your GEMINI_API_KEY (optional, see below)

python app.py
```

Open **http://127.0.0.1:5000** → Create Account → Dashboard → *Analyze My Skills*.

The AI key is **optional**: without it the roadmap is generated from a built-in template
(marked "Template" on the dashboard). With a key it is marked "AI generated".
The key lives only in `backend/.env` (git-ignored) and is never sent to the browser.

### Run tests
```bash
cd backend
python -m pytest -q
```

## How the match % is calculated (`matcher.py`)

Each requirement has a **weight** (1–3 importance) and a **minimum level** (1 Beginner, 2 Intermediate, 3 Advanced).
A skill earns `credit = min(your_level / min_level, 1)`.

```
match % = sum(weight x credit) / sum(weight) x 100
```
credit = 1 → **matched**, between 0 and 1 → **needs improvement**, none → **missing**.
Skill aliases are normalised (`js` = JavaScript, `ReactJS` = React, `OOP` = Object Oriented Programming ...).
The AI never calculates this – it only receives the result and writes the plan.

## API endpoints (all under `/api`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | server status, whether AI key is configured |
| GET | `/internships`, `/skills` | – | catalog & skill suggestions |
| POST | `/auth/signup`, `/auth/login` | – | returns `{token, user}` |
| GET | `/auth/me` | yes | current user |
| POST | `/auth/forgot-password`, `/auth/reset-password`, `/auth/forgot-userid` | – | account recovery |
| GET / PUT | `/profile` | yes | saved profile (skills, course, year, target) |
| POST | `/analysis` | yes | match %, matched/partial/missing, projects, career matches (saved) |
| GET | `/analysis/latest`, `/analysis/history` | yes | past analyses |
| POST | `/roadmap` | yes | `{weeks: 2-12, hours_per_week: 1-40, analysis_id?}` → roadmap (saved) |
| GET | `/roadmap/latest` | yes | latest roadmap with progress |
| PUT | `/progress` | yes | `{week, task_index, completed}` tick/untick a task |
| GET | `/progress` | yes | progress summary |
| GET | `/dashboard` | yes | everything the dashboard needs in one call |

Send the token as `Authorization: Bearer <token>`. Errors always look like
`{"error": {"code": "validation_error", "message": "...", "fields": {"email": "..."}}}`.

Example:
```bash
curl -X POST http://127.0.0.1:5000/api/analysis -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"internship_id":"web-developer","skills":[{"name":"HTML","level":"Advanced"},{"name":"JS","level":"Beginner"}]}'
```

## What was changed in your frontend

* `dashboard.html`: removed the stray markdown code fences around the file; hard-coded demo data replaced by empty containers filled from the API; new **Analyze My Skills** section and roadmap controls (uses your existing CSS classes + `css/app-extra.css`).
* `index.html`, `signup.html`, `forgot-*.html`: forms now call the API instead of `GET`-submitting to another page (the old signup form would have put the password in the URL). Login inputs got `name` attributes.
* New `reset-password.html` – `forgot-password.html` pointed to it but it did not exist.
* All your original CSS files are untouched.

## Notes & limitations

* **No email server.** With `DEV_MODE=true` the reset link / User ID is shown on screen and printed in the console. Set `DEV_MODE=false` before any public deployment (and add real email sending).
* Login token is kept in `localStorage`/`sessionStorage` (7-day expiry). No login rate-limiting yet.
* Opening pages via VS Code Live Server (port 5500) works (CORS is configured); double-clicking the `.html` files (`file://`) is not allowed by default – use http://127.0.0.1:5000.
* To change the Flask URL used by the frontend, set `window.SKILLMATRIX_API_BASE` before loading `js/api.js`.
* Extending the data: add roles in `data/internships.json` and projects in `data/projects.json` (a test checks every required skill has at least one project).
* Use `gunicorn` (not `python app.py`) for real deployment.


---

## What is new in this version

* **One section per page** - the sidebar links now open each section on its own (Dashboard, Analyze, Skills & Progress, Gap Analysis, Schedule, Next Steps, Projects, Career Tracks, Roadmap, Focus Timer, AI Mentor, Profile).
* **Top slider (☰)** - click to close the menu (content goes full width), click again to open it. Your choice is remembered.
* **My Profile chip** at the top-left corner (with avatar, edit name, stats and badges).
* **Focus Timer** - Pomodoro (25/5/15, editable), task picker from your roadmap, streak, **full-screen Focus Mode**, optional brown-noise sound. Press `Space` to start/pause.
* **Projects** - recommended (gap-based), sample projects by language (Python, JavaScript, HTML/CSS, Java, C/C++, SQL, Kotlin, React/TS) and "My projects" tracker.
* **Career Tracks** - 8 tracks with stages, tools, and free YouTube playlist links (English + Hindi) for every skill.
* **Free courses** under every roadmap (YouTube playlist searches, English + Hindi).
* **AI Mentor** chat (Gemini) and Gemini-written roadmaps.
* Animations: particle background, page transitions, count-up numbers, confetti, hover effects, animated login/signup (respects "reduce motion").

## Gemini API key - where to put it

1. Create a key at <https://aistudio.google.com/apikey>.
2. In `backend/` copy `.env.example` to `.env` and write: `GEMINI_API_KEY=your_key_here`
3. Restart `python app.py`. The terminal should say `AI (Gemini): ENABLED`.

Never put the key in any HTML/JS file, never commit `.env`, and never paste it in chats or screenshots. The browser only talks to your Flask backend; the backend talks to Gemini.

## Going live (Render, free)
1. Push this folder to GitHub (`.env` is git-ignored - never upload it).
2. On render.com: New + -> Web Service -> pick your repo.
3. Root Directory `backend` | Build `pip install -r requirements.txt` | Start `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2`
4. Environment: `SECRET_KEY` (long random text), `GEMINI_API_KEY`, `DEV_MODE=true`.
5. Deploy, then open the `https://xxxx.onrender.com` link.
Note: free Render disks are temporary, so SQLite data resets on redeploy/restart. Fine for a demo; use PostgreSQL or a persistent disk for real users.
