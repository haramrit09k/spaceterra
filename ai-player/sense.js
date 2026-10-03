// The sensor, shared by play.js (real play) and collect.js (self-play data
// collection) so both ever see exactly the same observable slice of the
// game - no function anywhere else should reach into Phaser globals itself.
// Deliberately contains no game-internals knowledge (no sine-wave
// amplitude/center, no assumed frame rate): everything here is a direct
// read of a Phaser object's own public fields.

// Runs inside the browser page via page.evaluate(). Pulls the handful of
// Phaser globals that determine "is the rocket about to hit something", and
// reduces them to the compact shape jev.js (and the local-model collector)
// expects.
function readState() {
  /* eslint-disable no-undef */
  const rocketX = rocket.x;
  const rocketHalfWidth = rocket.width / 2;
  const rocketY = 500; // rocket.y never changes; see ai-player/README.md

  // Tags each sprite with a stable id the first time we see it, by setting
  // a property directly on the object reference we're already holding - not
  // a game-logic read, just bookkeeping on our own side so collect.js can
  // later tell "this is the same obstacle I saw three ticks ago" apart from
  // "this is a different one that happens to be nearby". The counter lives
  // on `window` (not a local/closure variable) because this whole function
  // is re-evaluated fresh on every page.evaluate() call.
  function stableId(child) {
    if (child._aiSenseId === undefined) {
      window.__aiSenseIdSeq = (window.__aiSenseIdSeq || 0) + 1;
      child._aiSenseId = window.__aiSenseIdSeq;
    }
    return child._aiSenseId;
  }

  function collectThreats(group, kind, scrollRate) {
    const out = [];
    group.children.forEach((child) => {
      if (!child.exists) return;
      const absY = child.y + group.y;
      const absX = child.x + group.x;
      const remaining = rocketY - absY; // positive = still incoming
      if (remaining < -20 || remaining > 600) return; // outside our lookahead window
      out.push({
        id: stableId(child),
        kind,
        x: absX,
        y: remaining,
        scrollRate, // px/frame this group advances while holding "up"
        halfWidth: child.width / 2 + rocketHalfWidth,
      });
    });
    return out;
  }

  return {
    rocketX,
    oscIndex,
    intensity,
    score,
    oscIndexNew,
    threats: [...collectThreats(obstacles, 'obstacle', 15), ...collectThreats(aliens, 'alien', 10)],
    gameOver: game.state.current === 'gameState3',
  };
  /* eslint-enable no-undef */
}

module.exports = { readState };
