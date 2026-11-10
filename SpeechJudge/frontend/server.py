"""Local test-UI server (standard library only).

Serves the static UI and proxies /api/v1/* to the Speech Judge backend, adding the service
credential server-side so it never reaches the browser and CORS is not needed.

    python frontend/server.py                 # UI on http://127.0.0.1:8080 -> backend :8000

Configuration comes from frontend/.env, falling back to the backend's speech-judge/.env (or only the file
named by SJ_ENV_FILE); real environment variables override both:
    BACKEND_URL           default: http://SJ_HOST:SJ_PORT
    FRONTEND_API_KEY      credential to send (default: first value of SJ_SERVICE_CREDENTIALS)
    FRONTEND_PORT         default 8080

SECURITY: this proxy forwards requests WITH your credential and has no login of its own, so it
binds to 127.0.0.1 only. Do not change that or expose the port; this is a local testing tool.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_ENV_FILE = ROOT.parent / "speech-judge" / ".env"
FRONTEND_ENV_FILE = ROOT / ".env"
# SJ_ENV_FILE (if set) replaces both; otherwise frontend/.env overrides the backend's .env.
ENV_FILE = Path(os.environ.get("SJ_ENV_FILE") or FRONTEND_ENV_FILE)


def _read_env_file(path: Path) -> dict[str, str]:
    """Minimal KEY=VALUE reader for the backend .env (comments and quotes handled)."""
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        val = val.strip()
        if val[:1] in ("'", '"') and val[-1:] == val[:1] and len(val) > 1:
            val = val[1:-1]
        else:
            val = val.split(" #", 1)[0].strip()      # trailing comment on an unquoted value
        values[key.strip()] = val
    return values


_env = ({} if os.environ.get("SJ_ENV_FILE") else _read_env_file(BACKEND_ENV_FILE)) | _read_env_file(ENV_FILE)


def _setting(name: str, default: str = "") -> str:
    """Real environment wins over the .env file."""
    return os.environ.get(name) or _env.get(name) or default


def _backend_url() -> str:
    explicit = _setting("BACKEND_URL")
    if explicit:
        return explicit.rstrip("/")
    host = _setting("SJ_HOST", "127.0.0.1")
    host = "127.0.0.1" if host in ("0.0.0.0", "::", "") else host   # 0.0.0.0 is a bind address
    return f"http://{host}:{_setting('SJ_PORT', '8000')}"


BACKEND = _backend_url()
API_KEY = _setting("FRONTEND_API_KEY") or _setting("SJ_SERVICE_CREDENTIALS").split(",")[0].strip()
PORT = int(_setting("FRONTEND_PORT", "8080"))
UPSTREAM_TIMEOUT_S = 900          # sections and slow language ratings can take a while
MAX_BODY_BYTES = 40 * 1024 * 1024
ALLOWED_PREFIX = "/api/v1/"


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):  # keep console readable; never log bodies (audio)
        sys.stderr.write("%s %s\n" % (self.command, self.path.split("?")[0]))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # ---- proxy -------------------------------------------------------------------------
    def _proxy(self) -> None:
        path = self.path
        if not path.startswith(ALLOWED_PREFIX):
            return self._json(404, {"detail": "Not found"})
        length = int(self.headers.get("Content-Length") or 0)
        if length > MAX_BODY_BYTES:
            return self._json(413, {"detail": "Request too large"})
        body = self.rfile.read(length) if length else None
        headers = {"Content-Type": self.headers.get("Content-Type", "application/json"),
                   # Cloudflare (in front of proxies such as RunPod's) rejects urllib's default
                   # "Python-urllib/x.y" User-Agent with error 1010, so identify this tool explicitly.
                   "User-Agent": "SpeechJudge-TestConsole/1.0"}
        if API_KEY:
            headers["Authorization"] = f"Bearer {API_KEY}"
        req = urllib.request.Request(BACKEND + path, data=body, headers=headers,
                                     method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=UPSTREAM_TIMEOUT_S) as resp:  # noqa: S310
                self._relay(resp.status, resp.read(), resp.headers.get("Content-Type"))
        except urllib.error.HTTPError as exc:  # upstream 4xx/5xx: pass through unchanged
            self._relay(exc.code, exc.read(), exc.headers.get("Content-Type"))
        except (urllib.error.URLError, OSError, TimeoutError) as exc:
            self._json(502, {"detail": f"Backend unreachable at {BACKEND}: {exc}"})

    def _relay(self, status: int, data: bytes, content_type: str | None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type or "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _json(self, status: int, obj: dict) -> None:
        self._relay(status, json.dumps(obj).encode(), "application/json")

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        self._json(405, {"detail": "Method not allowed"})


def main() -> None:
    if not API_KEY:
        print(f"WARNING: no credential found in {ENV_FILE}, {BACKEND_ENV_FILE} or the environment "
              "(SJ_SERVICE_CREDENTIALS / FRONTEND_API_KEY); protected endpoints will return 401.",
              file=sys.stderr)
    handler = partial(Handler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    print(f"Test UI: http://127.0.0.1:{PORT}   (proxying /api/v1/* -> {BACKEND})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
