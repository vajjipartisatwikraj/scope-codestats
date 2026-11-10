"""Loads the UI in headless Chrome/Edge and reports what rendered (smoke test for JS errors).

    python frontend/tests/headless_check.py [url]
"""
import re
import subprocess
import sys
import tempfile
from pathlib import Path

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080/"
CANDIDATES = [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"]
browser = next((c for c in CANDIDATES if Path(c).exists()), None)
if not browser:
    sys.exit("No Chrome/Edge found")

with tempfile.TemporaryDirectory() as prof:
    p = subprocess.run([browser, "--headless=new", "--disable-gpu", "--no-sandbox", f"--user-data-dir={prof}",
                        "--enable-logging=stderr", "--v=0", "--virtual-time-budget=8000", "--dump-dom", URL],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
dom, err = p.stdout, p.stderr
print("browser:", Path(browser).name, "| exit", p.returncode, "| DOM chars", len(dom))
print("tabs:", len(re.findall(r'role="tab"', dom)))
print("question options:", len(re.findall(r"<option", dom)))
print("prompt rendered:", "Read this sentence aloud" in dom)
print("status badges:", re.findall(r'badge (pass|fail|warn)[^>]*>([^<]*)<', dom))
console = [l for l in err.splitlines() if "CONSOLE" in l or "Uncaught" in l]
print("console errors:", console[:8] or "none")
