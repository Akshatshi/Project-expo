"""Quick self-test for your Gemini key.  Run from the backend folder:   python check_gemini.py
Prints the real reason when roadmap/mentor falls back, and lists the model names your key can use."""
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
key = os.getenv("GEMINI_API_KEY", "").strip()
model = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
BASE = "https://generativelanguage.googleapis.com/v1beta"

if not key:
    sys.exit("GEMINI_API_KEY is empty. Put it in backend/.env (GEMINI_API_KEY=...) and save the file.")
print(f"Key found ({len(key)} characters, starts with {key[:3]}...).  Model in .env: {model}")
headers = {"x-goog-api-key": key, "content-type": "application/json"}

try:
    r = requests.post(f"{BASE}/models/{model}:generateContent", headers=headers, timeout=40,
                      json={"contents": [{"role": "user", "parts": [{"text": "Reply with the single word: ok"}]}]})
except requests.RequestException as exc:
    sys.exit(f"Could not reach Google ({exc}). Check your internet / firewall / VPN.")

print(f"\ngenerateContent -> HTTP {r.status_code}")
if r.status_code == 200:
    parts = (r.json().get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    print("Reply:", "".join(p.get("text", "") for p in parts).strip() or "(empty)")
    print("\nAll good - your key and model work. Restart the server and generate the roadmap again.")
else:
    print("Google says:", r.text[:600])

print("\nModels your key can use (put one of these in GEMINI_MODEL):")
try:
    m = requests.get(f"{BASE}/models?pageSize=200", headers=headers, timeout=30)
    if m.status_code == 200:
        names = [x["name"].split("/")[-1] for x in m.json().get("models", [])
                 if "generateContent" in x.get("supportedGenerationMethods", [])]
        flash = [n for n in names if "flash" in n] or names
        print("  " + "\n  ".join(flash[:15]))
    else:
        print(f"  (could not list models: HTTP {m.status_code} {m.text[:200]})")
except requests.RequestException as exc:
    print(f"  (could not list models: {exc})")
