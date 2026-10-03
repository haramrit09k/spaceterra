#!/usr/bin/env python3
"""A real local open-weight decision model, matching Jev's contract exactly.

Laya (Convai Innovations, Apache-2.0, pip install laya) is a non-autoregressive
"System 1" decision model - the closest open-source match to Jev found so far.
Unlike the Ollama/Qwen experiment (a generic instruct LLM coaxed into JSON via
structured output), Laya is *purpose-built* for this: its native API already
speaks state + typed questions -> calibrated answers, no prompt engineering
or precomputed-clearance workaround needed. See laya/agent.py in the
installed package:

    agent = laya.load("convaiinnovations/laya")
    agent.system_one(state, questions)   # questions: {id: {"type": "noul", ...}}
    # -> {"answers": {id: {"type": "noul", "noul": 0.87, ...}}, "usage": {...}}

That return shape (answers keyed by question id, each a dict with a `noul`
field - not a flat float) is why this bridge unwraps `.noul` instead of using
the response directly, unlike server.py/ollama_server.py's flatter contract.

IMPORTANT - untested in this sandbox: the harness's auto mode classifier
blocks importing the newly-installed `laya` package here (flagged as running
"code from external" - a different, stricter gate than the one that blocked
downloading it, which was separately cleared). That's a reasonable
boundary - a human should be the one who decides to actually execute
freshly-pulled third-party code, not have an agent route around the block by
spawning it as a subprocess instead of importing it directly, since that's
the same outcome. This file is written directly from the real, read
laya/agent.py docstrings (see the README's Laya section for exactly what was
reviewed and how), so it should work as-is - run it yourself, or grant the
permission the harness asked for and have the agent run it, to find out.
"""
import http.server
import json
import math
import sys

import laya

MODEL_NAME = "convaiinnovations/laya"
AMPLITUDE = 390
CENTER = 420

QUESTIONS = {
    "safe_to_advance": {
        "type": "noul",
        "instructions": (
            "Given the rocket's predicted clearance past the nearest incoming obstacle, "
            "is it safe to hold the \"up\" key right now without colliding?"
        ),
    }
}


def predict_future_x(state, frames_ahead):
    future_osc = state["oscIndex"] + frames_ahead
    return CENTER + AMPLITUDE * math.sin(future_osc / state["intensity"])


def worst_threat_state(state):
    """Reduces the full state to the single worst (most urgent) threat's
    clearance - same urgency-weighted selection as heuristicNoul() in jev.js.
    Unlike the Ollama bridge, Laya's native JSON-state input means we could
    hand it the raw threat list instead and let the model reason over it
    directly - worth trying once this is unblocked, as a genuine test of
    whether a purpose-built decision model (vs. a generic LLM) handles
    implicit geometry better. Starting with the same reduced state as the
    other two backends keeps this first comparison apples-to-apples.
    """
    threats = state.get("threats", [])
    if not threats:
        return None
    worst = None
    worst_weighted = 1.0
    for threat in threats:
        frames_ahead = max(1.0, threat["y"] / threat["scrollRate"])
        predicted_x = predict_future_x(state, frames_ahead)
        dx = abs(threat["x"] - predicted_x)
        clearance = dx - threat["halfWidth"]
        urgency = max(0.0, 1 - frames_ahead / 40)
        safety = max(0.0, min(1.0, clearance / 150))
        weighted = 1 - urgency * (1 - safety)
        if weighted <= worst_weighted:
            worst_weighted = weighted
            worst = {"frames_ahead": round(frames_ahead, 1), "clearance_px": round(clearance, 1)}
    return worst


class Handler(http.server.BaseHTTPRequestHandler):
    agent = None

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
        threat_state = worst_threat_state(state)

        if threat_state is None:
            prob = 0.95
        else:
            result = self.agent.system_one(threat_state, QUESTIONS)
            prob = float(result["answers"]["safe_to_advance"]["noul"])

        payload = json.dumps({"answers": {"safe_to_advance": prob}}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8789
    print(f"[laya-model] loading {MODEL_NAME} (first run downloads weights from Hugging Face)...", flush=True)
    Handler.agent = laya.load(MODEL_NAME)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"[laya-model] serving on http://127.0.0.1:{port}/v1/systemone", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
