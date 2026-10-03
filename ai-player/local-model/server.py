#!/usr/bin/env python3
"""A local, open-source stand-in for Jev's hosted /v1/systemone endpoint.

Same request/response contract as the real API (see jev.js's buildRequest):

    POST /v1/systemone
    { "state": {...}, "questions": [{ "id": "safe_to_advance", ... }] }
    -> { "answers": { "safe_to_advance": 0.87 } }

The only difference from the real Jev call in jev.js is the URL (localhost
instead of api.typesafe.ai) and what's answering: a tiny scikit-learn
logistic regression running in-process instead of a hosted model over the
public internet. That's the whole point of the experiment - same interface,
radically different latency, because the round trip never leaves the
machine.
"""
import http.server
import json
import math
import sys
import time

import joblib
import numpy as np

MODEL_PATH = "ai-player/local-model/model.joblib"
AMPLITUDE = 390
CENTER = 420


def predict_future_x(state, frames_ahead):
    """Mirrors predictFutureX() in jev.js - same sine-wave projection."""
    future_osc = state["oscIndex"] + frames_ahead
    return CENTER + AMPLITUDE * math.sin(future_osc / state["intensity"])


class Handler(http.server.BaseHTTPRequestHandler):
    model = None

    def log_message(self, fmt, *args):
        pass  # keep stdout clean; play.js already prints per-tick summaries

    def do_POST(self):
        if self.path != "/v1/systemone":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        state = body.get("state", {})
        threats = state.get("threats", [])

        if not threats:
            prob = 0.95
        else:
            worst = 1.0
            for threat in threats:
                frames_ahead = max(1.0, threat["y"] / threat["scrollRate"])
                predicted_x = predict_future_x(state, frames_ahead)
                dx = abs(threat["x"] - predicted_x)
                half_width = threat["halfWidth"]
                feat = np.array([[frames_ahead, dx, half_width, dx / max(half_width, 1.0)]])
                p_safe = self.model.predict_proba(feat)[0][1]
                worst = min(worst, p_safe)
            prob = worst

        payload = json.dumps({"answers": {"safe_to_advance": prob}}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    Handler.model = joblib.load(MODEL_PATH)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"[local-model] serving on http://127.0.0.1:{port}/v1/systemone", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
