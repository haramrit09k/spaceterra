#!/usr/bin/env python3
"""A real open-weight local LLM, speaking Jev's exact contract, via Ollama.

Unlike server.py (a from-scratch scikit-learn classifier), this is the
"closer analogue to Jev" experiment: a real open-weight instruct model
(Qwen2.5-0.5B, 4-bit quantized, pulled from Hugging Face and imported into
Ollama - see README) answering the same typed Noul question, with Ollama's
structured-output `format` forcing valid JSON back.

Still one call per tick, same as the real Jev contract implies: this finds
the single worst (most dangerous) threat in Python first - the same
urgency-weighted selection heuristicNoul() uses - and asks the model about
*that one*, instead of asking it once per threat. Jev would be asked one
typed question per decision, not N; this keeps the comparison fair.

Why precompute clearance instead of handing the model raw positions and
letting it do the geometry: early testing asked the model to reason over
rocket/obstacle coordinates directly, and a 0.5B model got it wrong close to
half the time - tiny LLMs are unreliable at implicit arithmetic. Once the
exact clearance number is computed in Python and handed to the model with an
explicit rule, it reliably gets the clear-cut cases (very negative/very
positive clearance) right, though it's still noisier at the extremes/scaling
than the dedicated classifier in server.py. That gap - a generic LLM being
unreliable at exactly the kind of calibrated numeric judgment Jev is built
to answer directly - is itself the most interesting finding of this
experiment; see the README.
"""
import http.server
import json
import math
import sys

import requests

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "spaceterra-brain"
AMPLITUDE = 390
CENTER = 420

SYSTEM_PROMPT = (
    "You are a precise probability estimator for a game-safety check. "
    "Clearance is (distance past the obstacle edge) in pixels: positive "
    "means clear, negative means collision. Rule: if clearance <= 0, output "
    "near 0.0 (unsafe). If clearance >= 150, output near 1.0 (safe). Scale "
    "linearly between. The sooner the threat arrives, the more that clearance "
    "number should dominate your answer. Output ONLY the JSON."
)


def predict_future_x(state, frames_ahead):
    future_osc = state["oscIndex"] + frames_ahead
    return CENTER + AMPLITUDE * math.sin(future_osc / state["intensity"])


def worst_threat(state):
    """Same selection as heuristicNoul() in jev.js: urgency-weighted worst case."""
    worst = None
    worst_weighted = 1.0
    for threat in state.get("threats", []):
        frames_ahead = max(1.0, threat["y"] / threat["scrollRate"])
        predicted_x = predict_future_x(state, frames_ahead)
        dx = abs(threat["x"] - predicted_x)
        clearance = dx - threat["halfWidth"]
        urgency = max(0.0, 1 - frames_ahead / 40)
        safety = max(0.0, min(1.0, clearance / 150))
        weighted = 1 - urgency * (1 - safety)
        if weighted <= worst_weighted:
            worst_weighted = weighted
            worst = {"frames_ahead": frames_ahead, "clearance": clearance}
    return worst


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def do_POST(self):
        if self.path != "/v1/systemone":
            self.send_response(404)
            self.end_headers()
            return

        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length) or b"{}")
        state = body.get("state", {})
        threat = worst_threat(state)

        if threat is None:
            prob = 0.95
        else:
            prompt = f"Clearance = {threat['clearance']:.0f} pixels. {{\"safe_to_advance\": <0..1>}}"
            resp = requests.post(
                OLLAMA_URL,
                json={
                    "model": MODEL_NAME,
                    "system": SYSTEM_PROMPT,
                    "prompt": prompt,
                    "stream": False,
                    "format": {
                        "type": "object",
                        "properties": {"safe_to_advance": {"type": "number"}},
                        "required": ["safe_to_advance"],
                    },
                },
                timeout=10,
            )
            answer = json.loads(resp.json()["response"])
            prob = max(0.0, min(1.0, float(answer["safe_to_advance"])))

        payload = json.dumps({"answers": {"safe_to_advance": prob}}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"[ollama-model] serving on http://127.0.0.1:{port}/v1/systemone", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
