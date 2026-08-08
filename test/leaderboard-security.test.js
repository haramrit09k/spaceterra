const { normalizeScore } = require('../sockets/leaderboard');

describe('leaderboard score validation', () => {
  test('accepts bounded non-negative integer scores', () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore('420')).toBe(420);
  });

  test('rejects malformed, fractional, negative, and excessive scores', () => {
    expect(normalizeScore('not-a-score')).toBeNull();
    expect(normalizeScore(4.2)).toBeNull();
    expect(normalizeScore(-1)).toBeNull();
    expect(normalizeScore(1_000_000_001)).toBeNull();
  });
});
