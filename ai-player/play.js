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
const MS_PER_FRAME = 1000 / 60;

// A hardcoded reflex horizon calibrated to the *documented* 70-500ms latency
// (originally 18 frames, ~300ms) turned out to be wrong: measured real
// round trips ran as high as ~900ms. Worse, staleness compounds - with one
// call in flight at a time, an answer computed from a state up to one
// latency-cycle old then gets *used* for up to another full latency cycle
// before the next one lands, so a threat judged by Jev's cached answer can
// be reacting to threats.json from up to ~2x the latest measured latency
// ago. So both the reflex horizon and how long we'll trust a cached answer
// are derived from what we actually measure, not a number picked in advance.
const LATENCY_HISTORY_SIZE = 20;
const DEFAULT_LATENCY_MS = 500; // assumption before any call has completed - the docs' own worst case
const MIN_REFLEX_FRAMES_AHEAD = 6; // floor (~100ms) so the horizon can't collapse to ~0

const latencyHistory = [];
function recordLatency(ms) {
  latencyHistory.push(ms);
  if (latencyHistory.length > LATENCY_HISTORY_SIZE) latencyHistory.shift();
}
function p95LatencyMs() {
  if (latencyHistory.length === 0) return DEFAULT_LATENCY_MS;
  const sorted = [...latencyHistory].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)];
}

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

    // The game keeps running in the browser's own render loop while we
    // `await` Jev - a real network call, unlike the instant heuristic. So
    // the loop never blocks on it: it fires a call in the background, and
    // every tick acts on whatever's freshest - the local reflex for
    // anything urgent or anything Jev hasn't answered recently enough to
    // trust, Jev's last-completed answer otherwise.
    //
    // timestamp starts at 0 (not Date.now()) so the very first ticks - before
    // any real answer has landed - read as infinitely stale and fall through
    // to the local reflex instead of trusting a made-up "probably safe"
    // default.
    let jevInFlight = false;
    let lastJevResult = { safe_to_advance: null, source: 'startup-none', latencyMs: 0, timestamp: 0 };

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
            lastJevResult = { ...result, timestamp: Date.now() };
            if (result.source === 'jev') recordLatency(result.latencyMs);
          })
          .catch((err) => {
            console.error('[jev] background call failed:', err.message);
          })
          .finally(() => {
            jevInFlight = false;
          });
      }

      const observedLatencyMs = p95LatencyMs();
      // + TICK_MS because our own poll loop only checks in every TICK_MS ms,
      // so a decision can be up to one tick late even with zero network lag.
      const reflexFramesAhead = Math.max(
        MIN_REFLEX_FRAMES_AHEAD,
        Math.ceil((observedLatencyMs + TICK_MS) / MS_PER_FRAME)
      );
      // Give a cached answer roughly one more full latency-cycle of grace
      // (the time until the *next* background call could plausibly land)
      // before refusing to trust it at all.
      const maxJevAgeMs = observedLatencyMs * 2;

      const nearestFramesAhead = state.threats.length
        ? Math.min(...projectThreats(state).map((t) => t.framesAhead))
        : Infinity;
      const jevAgeMs = Date.now() - lastJevResult.timestamp;

      let safety;
      let source;
      let latencyMs;
      if (nearestFramesAhead <= reflexFramesAhead) {
        safety = heuristicNoul(state);
        source = 'local-reflex';
        latencyMs = 0;
      } else if (jevAgeMs <= maxJevAgeMs) {
        ({ safe_to_advance: safety, source, latencyMs } = lastJevResult);
      } else {
        safety = heuristicNoul(state);
        source = 'local-reflex-stale-jev';
        latencyMs = 0;
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
            `safety=${safety.toFixed(2)} (${source}${latencyNote}) reflex<=${reflexFramesAhead}f p95=${observedLatencyMs}ms ` +
            `${mustHold ? '[override: near-death]' : ''} -> ${wantsHold ? 'HOLD' : 'release'}`
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
