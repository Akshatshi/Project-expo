import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
key = os.getenv("GEMINI_API_KEY", "").strip()
main_model = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
BASE = "https://generativelanguage.googleapis.com/v1beta"

if not key:
    sys.exit("GEMINI_API_KEY is empty. Put it in backend/.env (GEMINI_API_KEY=...) and save the file.")
print(f"Key found ({len(key)} characters).  Model in .env: {main_model}\n")
headers = {"x-goog-api-key": key, "content-type": "application/json"}

names = [main_model, "gemini-flash-lite-latest", "gemini-flash-latest"]
try:
    listing = requests.get(f"{BASE}/models?pageSize=200", headers=headers, timeout=30)
    if listing.status_code == 200:
        found = [m["name"].split("/")[-1] for m in listing.json().get("models", [])
                 if "generateContent" in m.get("supportedGenerationMethods", []) and "flash" in m["name"]]
        names += found[:6]
    else:
        print(f"(could not list models: HTTP {listing.status_code} {listing.text[:150]})\n")
except requests.RequestException as exc:
    sys.exit(f"Could not reach Google ({exc}). Check internet / firewall / VPN / hotspot.")

seen, results = set(), []
prompt = 'Return JSON only: {"weeks":[{"week":1,"title":"short","tasks":["a","b","c"]}]}'
print(f"{'model':38} {'result':14} seconds")
for name in names:
    if name in seen:
        continue
    seen.add(name)
    started = time.time()
    try:
        r = requests.post(f"{BASE}/models/{name}:generateContent", headers=headers, timeout=60, json={
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "thinkingConfig": {"thinkingLevel": "low"}}})
        if r.status_code == 400 and "thinking" in r.text.lower():
            r = requests.post(f"{BASE}/models/{name}:generateContent", headers=headers, timeout=60, json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"}})
        took = time.time() - started
        label = "OK" if r.status_code == 200 else f"HTTP {r.status_code}"
        print(f"{name:38} {label:14} {took:5.1f}")
        if r.status_code == 200:
            results.append((took, name))
        elif r.status_code in (400, 401, 403):
            print("   Google says:", r.text[:200].replace("\n", " "))
    except requests.RequestException:
        print(f"{name:38} {'TIMEOUT':14} {time.time() - started:5.1f}")

print()
if results:
    results.sort()
    print("Fastest working model:", results[0][1])
    print("Put this in .env  (and in Render -> Environment):")
    print(f"GEMINI_MODEL={results[0][1]}")
else:
    print("No model answered. Likely causes: wrong/blocked key, no internet to Google, or free quota used up.")
