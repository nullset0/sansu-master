"""算数マスター 学習記録の受け口 (POST /api/log)

書き込み専用。読み出しの口は作らない（記録は VPS で ssh して読む）。
  /data/events/<dev>/<YYYY-MM-DD>.jsonl   1問ごとの記録（受信時刻 rt を足す）
  /data/state/<dev>.json                  端末の全体状態（最新）
  /data/state/<dev>/<YYYY-MM-DD>.json     その日の最後の全体状態（推移を見るため）
"""
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DATA = os.environ.get("DATA_DIR", "/data")
MAX_BODY = 2 * 1024 * 1024
DEV_RE = re.compile(r"^[a-z0-9]{8,40}$")
JST = timezone(timedelta(hours=9))


def write_atomic(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    os.replace(tmp, path)


class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path.rstrip("/") == "/api/health":
            return self._send(200, {"ok": True})
        return self._send(404, {"ok": False})

    def do_POST(self):
        if self.path.split("?")[0] != "/api/log":
            return self._send(404, {"ok": False})
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if n <= 0 or n > MAX_BODY:
            return self._send(413, {"ok": False})
        try:
            body = json.loads(self.rfile.read(n).decode("utf-8"))
        except Exception:
            return self._send(400, {"ok": False})
        dev = str(body.get("dev") or "")
        if not DEV_RE.match(dev):
            return self._send(400, {"ok": False})

        now = datetime.now(JST)
        day = now.strftime("%Y-%m-%d")
        events = body.get("events") or []
        if not isinstance(events, list):
            events = []
        events = [e for e in events[:1000] if isinstance(e, dict)]
        if events:
            path = os.path.join(DATA, "events", dev, day + ".jsonl")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            rt = now.isoformat(timespec="seconds")
            with open(path, "a", encoding="utf-8") as f:
                for e in events:
                    e["rt"] = rt
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        st = body.get("state")
        if isinstance(st, dict):
            text = json.dumps(st, ensure_ascii=False)
            write_atomic(os.path.join(DATA, "state", dev + ".json"), text)
            write_atomic(os.path.join(DATA, "state", dev, day + ".json"), text)
        return self._send(200, {"ok": True, "n": len(events)})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), H).serve_forever()
