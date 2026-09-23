// The "brain" of the AI player.
//
// This module is deliberately split from play.js so there is exactly one
// place that knows how to turn "here's the game state" into "hold up or
// not". That's the seam where a real TypeSafe Jev call plugs in later -
// everything else (the sensing loop, the browser control) never needs to
// change.
//
// Jev's actual shape (from TypeSafe's docs): you send a `state` (any JSON)
// plus one or more typed `questions`, and get back typed answers instead of
// generated text. The primitive we want here is "Noul" - a yes/no question
// answered as a single probability between 0 and 1, e.g. "is this true?" ->
// 0.87. That maps directly onto our situation: "is it safe to hold up right
// now?" -> a number we can threshold.
//
// api.typesafe.ai is not reachable from this sandbox's network policy (it's
// not on the egress allowlist), so callJev() falls back to a small
// hand-written heuristic that answers the exact same question the same way
// Jev would be asked to: geometry in, probability out. Swap in the real
// fetch call (already wired below) the moment you have a TYPESAFE_API_KEY
// and network access - nothing else in this project needs to change.

const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

function buildRequest(state) {
  return {
    state,
    questions: [
      {
        id: 'safe_to_advance',
        type: 'noul',
        text:
          'Given the rocket\'s x position and the nearest incoming obstacles, ' +
          'is it safe to hold the "up" key right now without colliding?',
      },
    ],
  };
}

// The rocket's x is a pure sine wave (see utils.js's oscillation()) that
// keeps swinging whether or not we're advancing - the player never steers
// it directly. So "is rocket.x clear of this threat *right now*" is the
// wrong question: what matters is where the sine wave will have carried the
// rocket to by the time this threat reaches the collision line. That's a
// one-step trajectory prediction, not a snapshot check.
function predictFutureX(state, framesAhead) {
  const AMPLITUDE = 390;
  const CENTER = 420;
  const futureOsc = state.oscIndex + framesAhead;
  return CENTER + AMPLITUDE * Math.sin(futureOsc / state.intensity);
}

// Stand-in for Jev: same input, same output shape, no network call.
// For every threat, project the rocket's sine-wave position forward to the
// moment that threat would reach the collision line *if we keep holding*,
// and score clearance against that predicted position. The worst (most
// dangerous) threat sets the overall probability, so one near-miss can't be
// hidden by several safe ones.
function heuristicNoul(state) {
  const { threats } = state;

  if (threats.length === 0) return 0.95; // nothing ahead: safe by default

  let worst = 1;
  for (const threat of threats) {
    const framesAhead = Math.max(1, threat.y / threat.scrollRate);
    const predictedX = predictFutureX(state, framesAhead);
    const dx = Math.abs(threat.x - predictedX);
    const clearance = dx - threat.halfWidth;
    // Squash clearance (pixels) into a 0..1 "how safe" score. 0 clearance or
    // less -> ~0 (about to hit); 150px+ clearance -> ~1 (plenty of room).
    // The closer the threat is (fewer frames away), the more that score
    // dominates, since a miss you're about to have matters more than one
    // several hundred pixels away.
    const urgency = Math.max(0, 1 - framesAhead / 40);
    const safety = Math.max(0, Math.min(1, clearance / 150));
    const weighted = 1 - urgency * (1 - safety);
    worst = Math.min(worst, weighted);
  }
  return worst;
}

async function callJev(state) {
  const payload = buildRequest(state);
  const apiKey = process.env.TYPESAFE_API_KEY;

  if (!apiKey) {
    return {
      safe_to_advance: heuristicNoul(state),
      source: 'heuristic-fallback',
    };
  }

  const res = await fetch(TYPESAFE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Jev request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return { safe_to_advance: data.answers.safe_to_advance, source: 'jev' };
}

module.exports = { callJev, heuristicNoul, buildRequest };
