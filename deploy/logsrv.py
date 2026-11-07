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
import tempfile
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DATA = os.environ.get("DATA_DIR", "/data")
MAX_BODY = 2 * 1024 * 1024
DEV_RE = re.compile(r"^[a-z0-9]{8,40}$")
JST = timezone(timedelta(hours=9))
# 認証は付けない（子どもの端末にログインさせない）。かわりに量で守る:
MAX_DEVS = 20                    # 端末の数。これを超える新しい端末は受け付けない
MAX_EVENTS_FILE = 3 * 1024 * 1024   # 1端末1日の1問記録。子どもが1日に解く量の100倍以上
MAX_STATE = 800 * 1024           # 全体状態1つ。全問を解いても200KB程度
MAX_STATE_DAYS = 800             # 日ごとの全体状態を残す日数の上限（端末ごと）


def write_atomic(path, text):
    d = os.path.dirname(path)
    os.makedirs(d, exist_ok=True)
    # 同じ端末から同時に届いても奪い合わないよう、一時ファイルは毎回べつの名前
    fd, tmp = tempfile.mkstemp(dir=d, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def known_devs():
    p = os.path.join(DATA, "events")
    a = set(os.listdir(p)) if os.path.isdir(p) else set()
    q = os.path.join(DATA, "state")
    if os.path.isdir(q):
        a |= {f[:-5] for f in os.listdir(q) if f.endswith(".json")}
    return a


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
        if not isinstance(body, dict):
            return self._send(400, {"ok": False})
        dev = str(body.get("dev") or "")
        if not DEV_RE.match(dev):
            return self._send(400, {"ok": False})
        if dev not in known_devs() and len(known_devs()) >= MAX_DEVS:
            return self._send(429, {"ok": False, "why": "devs"})

        now = datetime.now(JST)
        day = now.strftime("%Y-%m-%d")
        events = body.get("events") or []
        if not isinstance(events, list):
            events = []
        events = [e for e in events[:1000] if isinstance(e, dict)]
        if events:
            path = os.path.join(DATA, "events", dev, day + ".jsonl")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            if os.path.exists(path) and os.path.getsize(path) > MAX_EVENTS_FILE:
                return self._send(429, {"ok": False, "why": "events"})
            rt = now.isoformat(timespec="seconds")
            with open(path, "a", encoding="utf-8") as f:
                for e in events:
                    e["rt"] = rt
                    f.write(json.dumps(e, ensure_ascii=False) + "\n")
        st = body.get("state")
        if isinstance(st, dict):
            text = json.dumps(st, ensure_ascii=False)
            if len(text) > MAX_STATE:
                return self._send(413, {"ok": False, "why": "state"})
            write_atomic(os.path.join(DATA, "state", dev + ".json"), text)
            daily = os.path.join(DATA, "state", dev)
            if not os.path.isdir(daily) or len(os.listdir(daily)) < MAX_STATE_DAYS:
                write_atomic(os.path.join(daily, day + ".json"), text)
        return self._send(200, {"ok": True, "n": len(events)})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), H).serve_forever()
