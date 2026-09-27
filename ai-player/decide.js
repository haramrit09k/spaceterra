// Pure decision logic, pulled out of play.js so the bug the review caught
// (trusting a cached Jev answer for far longer than its real latency
// justifies) can be tested directly with fake clocks and fake latencies,
// instead of needing a real browser, a real network call, and hoping the
// game's randomized obstacles line up a certain way. No Playwright, no
// fetch, no globals - just numbers in, a decision out.

const MS_PER_FRAME = 1000 / 60;
const MIN_REFLEX_FRAMES_AHEAD = 6; // floor (~100ms) so the horizon can't collapse to ~0
const DEFAULT_LATENCY_MS = 500; // assumption before any call has completed - the docs' own worst case

// The 95th-percentile of recent real latencies, so one lucky fast call
// doesn't make the horizon overconfident. Falls back to DEFAULT_LATENCY_MS
// before any real data exists.
function p95LatencyMs(latencyHistory, defaultMs = DEFAULT_LATENCY_MS) {
  if (latencyHistory.length === 0) return defaultMs;
  const sorted = [...latencyHistory].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)];
}

// How many frames ahead counts as "too soon to wait on the network" -
// derived from measured latency, not a number picked in advance. +tickMs
// because the poll loop itself only checks in every tickMs ms, so a
// decision can be up to one tick late even with zero network lag.
function computeReflexFramesAhead(observedLatencyMs, tickMs) {
  return Math.max(MIN_REFLEX_FRAMES_AHEAD, Math.ceil((observedLatencyMs + tickMs) / MS_PER_FRAME));
}

// The core fix: decide whether to trust the local heuristic (instant, always
// current) or a cached Jev answer (possibly stale) for this tick.
//
//   nearestFramesAhead   - frames until the closest threat arrives, from the
//                           state read *this* tick (always fresh)
//   lastJevResult        - { safe_to_advance, source, timestamp } from the
//                           most recent completed Jev call (or the startup
//                           placeholder, timestamp: 0)
//   now                  - Date.now() at decision time (passed in, not read
//                           internally, so this stays pure and testable)
//   localHeuristicSafety - heuristicNoul(state) computed fresh this tick
//   observedLatencyMs    - p95LatencyMs() of real measured round trips
//   tickMs               - the poll interval
function decideSafety({ nearestFramesAhead, lastJevResult, now, localHeuristicSafety, observedLatencyMs, tickMs }) {
  const reflexFramesAhead = computeReflexFramesAhead(observedLatencyMs, tickMs);
  // A cached answer gets roughly one more full latency-cycle of grace (the
  // time until the *next* background call could plausibly land) before
  // it's refused outright, no matter how far away the nearest threat is.
  const maxJevAgeMs = observedLatencyMs * 2;
  const jevAgeMs = now - lastJevResult.timestamp;

  if (nearestFramesAhead <= reflexFramesAhead) {
    return { safety: localHeuristicSafety, source: 'local-reflex', reflexFramesAhead };
  }
  if (jevAgeMs <= maxJevAgeMs) {
    return { safety: lastJevResult.safe_to_advance, source: lastJevResult.source, reflexFramesAhead };
  }
  return { safety: localHeuristicSafety, source: 'local-reflex-stale-jev', reflexFramesAhead };
}

module.exports = {
  MS_PER_FRAME,
  MIN_REFLEX_FRAMES_AHEAD,
  DEFAULT_LATENCY_MS,
  p95LatencyMs,
  computeReflexFramesAhead,
  decideSafety,
};
