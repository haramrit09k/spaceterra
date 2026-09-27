const { p95LatencyMs, computeReflexFramesAhead, decideSafety } = require('../ai-player/decide');

describe('p95LatencyMs', () => {
  it('falls back to the default before any real call has completed', () => {
    expect(p95LatencyMs([], 500)).toBe(500);
  });

  it('reflects a run of genuinely slow real calls, not the documented best case', () => {
    // This is the exact scenario the review caught: real round trips ran up
    // to ~900ms, far past the ~300ms the old hardcoded reflex assumed.
    const history = [850, 900, 880, 910, 870];
    expect(p95LatencyMs(history, 500)).toBeGreaterThanOrEqual(870);
  });
});

describe('computeReflexFramesAhead', () => {
  it('grows with measured latency instead of staying pinned to the old hardcoded 18', () => {
    const framesAtDocumentedLatency = computeReflexFramesAhead(300, 100);
    const framesAtMeasuredLatency = computeReflexFramesAhead(900, 100);
    expect(framesAtMeasuredLatency).toBeGreaterThan(framesAtDocumentedLatency);
    // The bug: 18 frames was calibrated to ~300ms. At ~900ms real latency,
    // 18 frames is nowhere near enough - the fixed horizon must clear it.
    expect(framesAtMeasuredLatency).toBeGreaterThan(18);
  });

  it('never collapses below the floor even at ~0 measured latency', () => {
    expect(computeReflexFramesAhead(0, 0)).toBeGreaterThanOrEqual(6);
  });
});

describe('decideSafety', () => {
  const baseArgs = {
    localHeuristicSafety: 0.42,
    observedLatencyMs: 900, // the real measured worst case from testing
    tickMs: 100,
  };

  it('uses the local reflex for a threat inside the horizon, ignoring any cached Jev answer', () => {
    const result = decideSafety({
      ...baseArgs,
      nearestFramesAhead: 5, // well inside the reflex horizon at 900ms latency
      lastJevResult: { safe_to_advance: 0.99, source: 'jev', timestamp: Date.now() },
      now: Date.now(),
    });
    expect(result.source).toBe('local-reflex');
    expect(result.safety).toBe(0.42);
  });

  it('trusts a fresh cached Jev answer for a threat outside the horizon', () => {
    const now = Date.now();
    const result = decideSafety({
      ...baseArgs,
      nearestFramesAhead: 200, // safely outside the reflex horizon
      lastJevResult: { safe_to_advance: 0.77, source: 'jev', timestamp: now - 100 }, // 100ms old
      now,
    });
    expect(result.source).toBe('jev');
    expect(result.safety).toBe(0.77);
  });

  it('THE BUG: refuses a cached Jev answer that has gone stale, instead of trusting it forever', () => {
    // This is the exact failure the review found: a threat outside the old
    // fixed 18-frame reflex window used to be judged by whatever Jev last
    // said, no matter how old. Here the cached answer is far older than
    // even 2x the measured latency (1800ms) - it must be rejected.
    const now = Date.now();
    const result = decideSafety({
      ...baseArgs,
      nearestFramesAhead: 200,
      lastJevResult: { safe_to_advance: 0.99, source: 'jev', timestamp: now - 5000 }, // 5s old
      now,
    });
    expect(result.source).toBe('local-reflex-stale-jev');
    expect(result.safety).toBe(0.42); // the fresh local number, not the stale 0.99
  });

  it('THE OTHER BUG: never trusts the startup placeholder (timestamp: 0) as if it were real data', () => {
    // Before this fix, a run started with an optimistic safe_to_advance: 0.9
    // default that could get used for several ticks before any real Jev
    // answer arrived. timestamp: 0 makes it infinitely stale by construction.
    const result = decideSafety({
      ...baseArgs,
      nearestFramesAhead: 200,
      lastJevResult: { safe_to_advance: 0.9, source: 'startup-none', timestamp: 0 },
      now: Date.now(),
    });
    expect(result.source).toBe('local-reflex-stale-jev');
    expect(result.safety).toBe(0.42);
  });

  it('is more forgiving of a slightly-stale answer when measured latency is itself high', () => {
    // maxJevAgeMs scales with observedLatencyMs (2x), so what counts as
    // "too old" isn't one fixed number either.
    const now = Date.now();
    const withHighLatency = decideSafety({
      nearestFramesAhead: 200,
      localHeuristicSafety: 0.42,
      observedLatencyMs: 900,
      tickMs: 100,
      lastJevResult: { safe_to_advance: 0.77, source: 'jev', timestamp: now - 1500 }, // 1.5s old
      now,
    });
    const withLowLatency = decideSafety({
      nearestFramesAhead: 200,
      localHeuristicSafety: 0.42,
      observedLatencyMs: 100,
      tickMs: 100,
      lastJevResult: { safe_to_advance: 0.77, source: 'jev', timestamp: now - 1500 }, // same age
      now,
    });
    expect(withHighLatency.source).toBe('jev'); // 1.5s < 2x900ms=1800ms grace window
    expect(withLowLatency.source).toBe('local-reflex-stale-jev'); // 1.5s > 2x100ms=200ms grace window
  });
});
