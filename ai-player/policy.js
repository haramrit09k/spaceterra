// The decision rule, shared by play.js (real play) and collect.js
// (on-policy data collection) so a bootstrap round always collects data
// under the exact same rule that's actually deployed - duplicating these
// constants in both files was already a drift bug waiting to happen (they
// first went out of sync when play.js's threshold was retuned but
// collect.js's wasn't).
const NEAR_DEATH_FRAMES = 250; // gameplay.js force-kills the rocket at oscIndexNew === 300

// How confident safe_to_hold needs to be before holding. Each real collision
// in training costs the model's fit far more than a false alarm (see
// train.py's balanced sample weighting), which pushes its safe-side
// probabilities up close to 1 and leaves comparatively little air between
// "genuinely risky" and "fine" - sweeping this threshold in real play found
// 0.65 (a reasonable-sounding default) released far more than it needed to,
// each one costing real score; 0.3 caught just as many real collisions in
// held-out data (94-99% either way) while releasing less. Re-sweep this any
// time the model is retrained - the calibration isn't guaranteed to land in
// the same place twice.
const HOLD_THRESHOLD = 0.3;

function wantsHold(state, safeToHold) {
  return state.oscIndexNew > NEAR_DEATH_FRAMES || safeToHold >= HOLD_THRESHOLD;
}

module.exports = { NEAR_DEATH_FRAMES, HOLD_THRESHOLD, wantsHold };
