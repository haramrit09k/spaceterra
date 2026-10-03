#!/usr/bin/env python3
"""Trains the local Noul stand-in purely from observed self-play outcomes.

An earlier version of this script generated synthetic training examples by
copying gameplay.js's own sine-wave constants (rocket.x = 420 + 390*sin(...))
into a predict_future_x()-style formula, then labeled them with that same
closed-form clearance formula. That made the "model" a compressed restatement
of hand-read source, not something that had learned to play: it would go
stale silently the moment obstacle generation or the oscillation math changed,
and it never had a chance to beat the heuristic it was distilled from.

This version instead trains on ai-player/local-model/episodes.jsonl, produced
by `node ai-player/collect.js` driving the real browser through many short
episodes under an exploring hold/release policy. Each row is one tick's
(state, one threat, action taken) carrying only what the game already
exposes (rocket position, oscillation index/intensity, one threat's
position/speed/width, and whether the rocket held or released that tick),
labeled by literally watching what happened next in that real episode -
whether the specific sprite that eventually caused a collision was already
close by at this tick, or not. No formula, no game-source constants: run
ai-player/collect.js again after any gameplay change and this script picks
up the new dynamics automatically.

Both hold and release rows are included (not just holds): gameplay.js
keeps advancing the rocket's own sine-wave position every frame regardless
of whether the key is held, so releasing isn't automatically safe either -
`action` is a feature, and the model learns the risk of each from real
examples of both rather than assuming one of them is a free fallback.

The model is a gradient-boosted tree ensemble rather than logistic
regression: the real relationship between (oscIndex, intensity) and where
the rocket will be a few ticks later is a sine wave the model has to
approximate from examples alone (it's never told the formula), which a
linear model can't represent but a few hundred shallow trees can.
"""
import json
import sys

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_sample_weight

EPISODES_PATH = "ai-player/local-model/episodes.jsonl"
MODEL_PATH = "ai-player/local-model/model.joblib"

# Order matters: server.py's row_features() must build vectors the same way.
FEATURE_NAMES = [
    "rocketX", "oscIndex", "intensity", "threatX", "threatY", "scrollRate", "halfWidth",
    "framesAhead", "action",
]


def row_features(rec):
    # frames_ahead is plain arithmetic on two values the game already handed
    # us (remaining distance / current approach speed = time) - not a
    # re-derivation of any game-internal constant.
    frames_ahead = rec["threatY"] / max(rec["scrollRate"], 1e-6)
    action = 1.0 if rec["action"] == "hold" else 0.0
    return [
        rec["rocketX"], rec["oscIndex"], rec["intensity"],
        rec["threatX"], rec["threatY"], rec["scrollRate"], rec["halfWidth"],
        frames_ahead, action,
    ]


def load_dataset(path):
    X, y = [], []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            X.append(row_features(rec))
            y.append(rec["label"])
    return np.array(X, dtype=float), np.array(y, dtype=int)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else EPISODES_PATH
    X, y = load_dataset(path)
    if len(X) < 50:
        raise SystemExit(
            f"only {len(X)} labeled rows in {path} - run `node ai-player/collect.js` "
            "first to generate real self-play data (see README)"
        )

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None
    )
    # A real collision is rare (~2% of rows here), so plain accuracy is
    # useless - a model that always answers "safe" scores ~98% and never
    # once predicts the dangerous class. Weighting samples by inverse class
    # frequency tells the fit that getting an "unsafe" row wrong costs as
    # much as getting many "safe" rows wrong, which is what we actually want.
    sample_weight = compute_sample_weight("balanced", y_train)
    model = HistGradientBoostingClassifier(max_depth=4, max_iter=200, random_state=42)
    model.fit(X_train, y_train, sample_weight=sample_weight)

    print(f"[train] {len(X)} labeled rows from real self-play ({y.mean():.1%} labeled safe)")
    print(f"[train] held-out report (support = rows in the 20% test split):")
    print(classification_report(y_test, model.predict(X_test), target_names=["unsafe", "safe"], digits=3))

    joblib.dump(model, MODEL_PATH)
    print(f"[train] saved {MODEL_PATH}")


if __name__ == "__main__":
    main()
