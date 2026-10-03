#!/usr/bin/env python3
"""Trains a tiny open-source stand-in for Jev's "Noul" primitive.

Real Jev is a hosted, proprietary "System-1" model: you can't download its
weights and run it locally. What *is* available open-source is the general
recipe - a small, cheap classifier that turns "state + typed question" into
a calibrated probability - so that's what this trains: a logistic regression
(scikit-learn, MIT-licensed, runs on CPU in microseconds) that answers the
exact same question our heuristic answers: given one incoming threat and the
rocket's projected position, how safe is it to be holding "up" when the
threat reaches the collision line?

Why logistic regression and not a downloaded open-weight LLM: this sandbox
can reach pypi.org but not huggingface.co or ollama.com (checked directly -
both 403 at the proxy), so there's no way to pull real open-weight model
files here. Outside this sandbox, the same server.py contract (POST state +
questions, get back a probability) would work unchanged with a local LLM
behind it via llama.cpp/Ollama + constrained decoding - swapping the brain
again without touching the request shape, same pattern as swapping the
heuristic for Jev.

The physics-based clearance formula (predict_future_x + squash) is used to
*label* synthetic training examples, with noise added so the model learns a
smooth, genuinely probabilistic boundary instead of memorizing a step
function. The learned model is not "smarter" than the heuristic - the point
of this experiment is latency (a same-machine HTTP round trip vs. a public
API's ~900ms), not accuracy.
"""
import json
import math
import random

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

random.seed(42)
np.random.seed(42)

N_SAMPLES = 20000


def clearance_safety(frames_ahead, dx, half_width):
    """Same squash as heuristicNoul() in jev.js: clearance in px -> 0..1."""
    clearance = dx - half_width
    urgency = max(0.0, 1 - frames_ahead / 40)
    safety = max(0.0, min(1.0, clearance / 150))
    return 1 - urgency * (1 - safety)


def make_dataset(n):
    X = []
    y = []
    for _ in range(n):
        frames_ahead = random.uniform(1, 60)
        half_width = random.uniform(20, 90)
        # dx ranges from "dead center hit" to "far clear", weighted toward
        # the boundary region so the classifier sees plenty of hard cases.
        dx = max(0.0, random.gauss(half_width, 80))

        label_prob = clearance_safety(frames_ahead, dx, half_width)
        # Add label noise: flip some labels near the boundary so training
        # data isn't a perfect deterministic function (plausible stand-in
        # for "the real world is noisier than the formula").
        noisy_label = 1 if random.random() < label_prob else 0

        X.append([frames_ahead, dx, half_width, dx / max(half_width, 1.0)])
        y.append(noisy_label)
    return np.array(X), np.array(y)


def main():
    X, y = make_dataset(N_SAMPLES)
    model = LogisticRegression(max_iter=1000)
    model.fit(X, y)

    train_acc = model.score(X, y)
    print(f"[train] trained on {N_SAMPLES} synthetic examples, train accuracy={train_acc:.3f}")

    joblib.dump(model, "ai-player/local-model/model.joblib")
    print("[train] saved ai-player/local-model/model.joblib")

    # Sanity check against a few hand-picked cases.
    checks = [
        (5, 10, 40),   # close threat, tiny clearance -> should be unsafe
        (5, 200, 40),  # close threat, huge clearance -> should be safe
        (50, 10, 40),  # far-off threat, tiny clearance (plenty of time) -> safer
    ]
    for frames_ahead, dx, half_width in checks:
        feat = np.array([[frames_ahead, dx, half_width, dx / half_width]])
        prob = model.predict_proba(feat)[0][1]
        print(f"[train] frames_ahead={frames_ahead} dx={dx} half_width={half_width} -> p(safe)={prob:.2f}")


if __name__ == "__main__":
    main()
