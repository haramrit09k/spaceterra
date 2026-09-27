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
// Without a TYPESAFE_API_KEY (e.g. .env is empty, or this is running in a
// sandbox with no network access to api.typesafe.ai), callJev() falls back
// to a small hand-written heuristic that answers the exact same question the
// same way Jev would be asked to: geometry in, probability out. Set the key
// in .env and nothing else in this project needs to change.
//
// Request shape below is confirmed against the live API's validation
// errors, then cross-checked against docs.typesafe.ai/api.md: `questions`
// is a dict keyed by question id, `model` must be "jev-latest", and a noul
// question takes `instructions` (not `text`) plus an optional `criteria`.

const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

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

// Do the trajectory math ourselves and hand the *result* to whoever answers
// the safety question (Jev or the heuristic), instead of handing over raw
// oscIndex/intensity and expecting them to derive the sine wave. A typed
// decision model like Jev has no way to reverse-engineer "this number means
// project a sine wave forward" from a sentence of instructions - it'll just
// judge the rocket's current position against the threat's current
// position, which is the exact naive mistake this project already hit once
// (see the README's design-decisions section, and predictFutureX above).
// Pre-computing clearance turns its job into "judge these numbers," which is
// what a fast typed-decision model is actually good at.
function projectThreats(state) {
  return state.threats.map((threat) => {
    const framesAhead = Math.max(1, threat.y / threat.scrollRate);
    const predictedX = predictFutureX(state, framesAhead);
    const clearancePx = Math.abs(threat.x - predictedX) - threat.halfWidth;
    return {
      kind: threat.kind,
      framesAhead: Math.round(framesAhead),
      clearancePx: Math.round(clearancePx),
    };
  });
}

function buildRequest(state) {
  return {
    model: 'jev-latest',
    state: {
      oscIndexNew: state.oscIndexNew,
      threats: projectThreats(state),
    },
    questions: {
      safe_to_advance: {
        type: 'noul',
        instructions:
          'Each entry in state.threats is a threat the rocket may collide with if ' +
          'it keeps advancing, already projected forward to the moment it would ' +
          'reach the rocket: "framesAhead" is how many frames until then, and ' +
          '"clearancePx" is the predicted gap in pixels between the rocket and ' +
          'the threat at that moment (0 or negative means a collision; 150px or ' +
          'more means comfortably clear). Weigh threats with a low framesAhead ' +
          'far more heavily than distant ones. Is it safe to hold the "up" key ' +
          'right now, i.e. will the rocket clear every threat?',
      },
    },
  };
}

// Stand-in for Jev: same input, same output shape, no network call.
// Uses the same pre-computed clearance/framesAhead as buildRequest() above,
// so the fallback and the real call are judging identical numbers. The worst
// (most dangerous) threat sets the overall probability, so one near-miss
// can't be hidden by several safe ones.
function heuristicNoul(state) {
  const projected = projectThreats(state);

  if (projected.length === 0) return 0.95; // nothing ahead: safe by default

  let worst = 1;
  for (const threat of projected) {
    // Squash clearance (pixels) into a 0..1 "how safe" score. 0 clearance or
    // less -> ~0 (about to hit); 150px+ clearance -> ~1 (plenty of room).
    // The closer the threat is (fewer frames away), the more that score
    // dominates, since a miss you're about to have matters more than one
    // several hundred pixels away.
    const urgency = Math.max(0, 1 - threat.framesAhead / 40);
    const safety = Math.max(0, Math.min(1, threat.clearancePx / 150));
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
      latencyMs: 0,
    };
  }

  const startedAt = Date.now();
  const res = await fetch(TYPESAFE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const latencyMs = Date.now() - startedAt;

  if (!res.ok) {
    throw new Error(`Jev request failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  // A noul answer is { type: 'noul', noul: <0..1 probability> }, keyed by
  // the question id we chose ('safe_to_advance').
  return { safe_to_advance: data.answers.safe_to_advance.noul, source: 'jev', latencyMs };
}

module.exports = { callJev, heuristicNoul, buildRequest, projectThreats };
