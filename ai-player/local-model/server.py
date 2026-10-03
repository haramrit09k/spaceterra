#!/usr/bin/env python3
"""A local, open-source stand-in for Jev's hosted /v1/systemone endpoint.

Same request/response contract as the real API (see jev.js's buildRequest):

    POST /v1/systemone
    { "state": {...}, "questions": [{ "id": "safe_to_advance", ... }] }
    -> { "answers": { "safe_to_advance": 0.87 } }

What answers it is a gradient-boosted tree model (see train.py) trained on
real self-play outcomes, not a formula. This file deliberately does not know
gameplay.js's sine-wave constants (390/420) or anything else about how the
game computes rocket position or obstacle spawns - it only forwards the
state fields the game already exposes (see sense.js) into the same feature
vector train.py built its training rows from. If that feature extraction
ever drifts from train.py's, row_features() is the one place to fix on both
sides.
"""
import http.server
import json
import sys

import joblib
import numpy as np

MODEL_PATH = "ai-player/local-model/model.joblib"


def row_features(state, threat):
    frames_ahead = threat["y"] / max(threat["scrollRate"], 1e-6)
    return [
        state["rocketX"], state["oscIndex"], state["intensity"],
        threat["x"], threat["y"], threat["scrollRate"], threat["halfWidth"],
        frames_ahead,
    ]


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
                feat = np.array([row_features(state, threat)])
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
