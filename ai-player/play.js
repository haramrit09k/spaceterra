// The runner: wires the sensor (read game state from the page), the brain
// (jev.js) and the hands (simulated key presses) into one loop.
//
// Think of it like a self-driving car built from three separable parts:
//   sense -> decide -> act, on repeat. Keeping them separate is the whole
// point - it's what lets the "decide" step be a five-line heuristic today
// and a real Jev API call tomorrow without touching the sensing or acting
// code at all.
//
// Usage: node ai-player/play.js [--seconds=60] [--headed]
require('dotenv').config();
const { chromium } = require('playwright');
const { startHarnessServer, PORT } = require('./harness-server');
const { callJev, heuristicNoul, projectThreats } = require('./jev');

const TICK_MS = 100; // near the fast end of Jev's documented 70-500ms latency window.
// There's no point sensing/deciding faster than the model you're driving
// with could ever answer - polling at 60fps would just be lying to
// yourself about how "real-time" the real thing could be.
const NEAR_DEATH_FRAMES = 250; // gameplay.js force-kills the rocket at oscIndexNew === 300
const SAFE_THRESHOLD = 0.65;
// The game keeps running in the browser's own render loop while we `await
// callJev()` - a real network call, unlike the instant heuristic. A 300ms
// round trip is ~18 frames at 60fps; if the nearest threat is going to
// arrive sooner than that, Jev's answer would come back *after* the moment
// it needed to matter. So for genuinely imminent threats we skip the
// network and decide locally instead - same idea as a self-driving car's
// low-level collision system backing up its slower route planner. Jev still
// gets every non-urgent decision, which is most of them.
const REFLEX_FRAMES_AHEAD = 18;

function parseArgs() {
  const args = process.argv.slice(2);
  const seconds = Number((args.find((a) => a.startsWith('--seconds=')) || '').split('=')[1]) || 60;
  const headed = args.includes('--headed');
  return { seconds, headed };
}

// Runs inside the browser page. Pulls the handful of Phaser globals that
// determine "is the rocket about to hit something", and reduces them to
// the compact shape jev.js expects - this is the sensor half of the loop.
function readState() {
  /* eslint-disable no-undef */
  const rocketX = rocket.x;
  const rocketHalfWidth = rocket.width / 2;
  const rocketY = 500; // rocket.y never changes; see ai-player/README.md

  function collectThreats(group, kind, scrollRate) {
    const out = [];
    group.children.forEach((child) => {
      if (!child.exists) return;
      const absY = child.y + group.y;
      const absX = child.x + group.x;
      const remaining = rocketY - absY; // positive = still incoming
      if (remaining < -20 || remaining > 600) return; // outside our lookahead window
      out.push({
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

async function main() {
  const { seconds, headed } = parseArgs();

  console.log(`[harness] starting static server on port ${PORT}`);
  const server = await startHarnessServer();

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    headless: !headed,
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 800 } });

  try {
    await page.goto(`http://localhost:${PORT}/`);
    // Skip the landing screen entirely instead of clicking a canvas button -
    // actionOnClick() is the exact function the Start button calls.
    await page.waitForFunction(() => typeof window.actionOnClick === 'function');
    await page.evaluate(() => window.actionOnClick());
    await page.waitForFunction(() => typeof window.rocket !== 'undefined');
    console.log('[harness] gameplay state loaded, handing control to the brain');

    let holding = false;
    let tick = 0;
    let holds = 0;
    let releases = 0;
    const deadline = Date.now() + seconds * 1000;

    // Real measured latency (see README) has run as high as ~900ms - nearly
    // a full second where the game keeps playing underneath an `await`. So
    // the loop never blocks on Jev: it fires a call in the background, and
    // every tick acts on whatever's freshest - the local reflex for
    // anything urgent, or Jev's last-completed answer otherwise. Jev's
    // answer can end up a few hundred ms stale by the time it's used; that's
    // an accepted tradeoff for not freezing the control loop entirely.
    let jevInFlight = false;
    let lastJevResult = { safe_to_advance: 0.9, source: 'startup-default', latencyMs: 0 };

    while (Date.now() < deadline) {
      const state = await page.evaluate(readState);
      if (state.gameOver) {
        console.log(`[harness] collision detected at tick ${tick} - run ended`);
        break;
      }

      if (!jevInFlight) {
        jevInFlight = true;
        callJev(state)
          .then((result) => {
            lastJevResult = result;
          })
          .catch((err) => {
            console.error('[jev] background call failed:', err.message);
          })
          .finally(() => {
            jevInFlight = false;
          });
      }

      const nearestFramesAhead = state.threats.length
        ? Math.min(...projectThreats(state).map((t) => t.framesAhead))
        : Infinity;

      let safety;
      let source;
      let latencyMs;
      if (nearestFramesAhead <= REFLEX_FRAMES_AHEAD) {
        safety = heuristicNoul(state);
        source = 'local-reflex';
        latencyMs = 0;
      } else {
        ({ safe_to_advance: safety, source, latencyMs } = lastJevResult);
      }

      const mustHold = state.oscIndexNew > NEAR_DEATH_FRAMES; // safety override: standing still too long is instant death
      const wantsHold = mustHold || safety >= SAFE_THRESHOLD;

      if (wantsHold !== holding) {
        if (wantsHold) {
          await page.keyboard.down('ArrowUp');
          holds += 1;
        } else {
          await page.keyboard.up('ArrowUp');
          releases += 1;
        }
        holding = wantsHold;
      }

      if (tick % 10 === 0) {
        const latencyNote = source === 'jev' ? ` +${latencyMs}ms` : '';
        console.log(
          `[t=${tick}] score=${state.score} threats=${state.threats.length} ` +
            `safety=${safety.toFixed(2)} (${source}${latencyNote}) ${mustHold ? '[override: near-death]' : ''} -> ${wantsHold ? 'HOLD' : 'release'}`
        );
      }

      tick += 1;
      await page.waitForTimeout(TICK_MS);
    }

    const final = await page.evaluate(() => ({ score, gameOver: game.state.current === 'gameState3' }));
    console.log('----------------------------------------');
    console.log(`Final score: ${final.score}`);
    console.log(`Ticks: ${tick}, direction changes: holds=${holds} releases=${releases}`);
    console.log(final.gameOver ? 'Ended by collision' : 'Ended by time limit');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
