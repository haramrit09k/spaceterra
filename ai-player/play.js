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
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { startHarnessServer, PORT } = require('./harness-server');
const { callJev } = require('./jev');

const LOCAL_MODEL_PORT = 8787;

// Spawns ai-player/local-model/server.py and waits for it to accept
// connections. Only used with --local; kept separate from jev.js so jev.js
// doesn't need to know how its backends get started, just where to send
// requests (LOCAL_JEV_URL).
function startLocalModelServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', ['ai-player/local-model/server.py', String(LOCAL_MODEL_PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    proc.stdout.on('data', (chunk) => {
      process.stdout.write(`[local-model] ${chunk}`);
      if (!settled && chunk.toString().includes('serving on')) {
        settled = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (chunk) => process.stderr.write(`[local-model] ${chunk}`));
    proc.on('exit', (code) => {
      if (!settled) reject(new Error(`local-model server exited early (code ${code})`));
    });
  });
}

const TICK_MS = 100; // near the fast end of Jev's documented 70-500ms latency window.
// There's no point sensing/deciding faster than the model you're driving
// with could ever answer - polling at 60fps would just be lying to
// yourself about how "real-time" the real thing could be.
const NEAR_DEATH_FRAMES = 250; // gameplay.js force-kills the rocket at oscIndexNew === 300
const SAFE_THRESHOLD = 0.65;

function parseArgs() {
  const args = process.argv.slice(2);
  const seconds = Number((args.find((a) => a.startsWith('--seconds=')) || '').split('=')[1]) || 60;
  const headed = args.includes('--headed');
  const local = args.includes('--local');
  // Artificially pads every decision with N ms of delay, applied *after*
  // callJev() resolves. Lets us feel what the real Jev API's ~900ms
  // round-trip would do to this game loop without needing network access to
  // it - same brain, same answers, just the latency a public HTTP API adds.
  const simulateLatencyMs = Number((args.find((a) => a.startsWith('--simulate-latency=')) || '').split('=')[1]) || 0;
  return { seconds, headed, local, simulateLatencyMs };
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
  const { seconds, headed, local, simulateLatencyMs } = parseArgs();

  let localModelProc = null;
  if (local) {
    console.log('[harness] starting local model server (ai-player/local-model/server.py)');
    localModelProc = await startLocalModelServer();
    process.env.LOCAL_JEV_URL = `http://127.0.0.1:${LOCAL_MODEL_PORT}/v1/systemone`;
  }

  console.log(`[harness] starting static server on port ${PORT}`);
  const server = await startHarnessServer();

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    headless: !headed,
    // Chromium's own internal sandbox needs namespaces this container
    // doesn't grant to a root process; --no-sandbox is the standard,
    // documented way to run headless Chrome in a container as root (not a
    // change to anything outside Chromium itself).
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
    const latencies = [];
    const deadline = Date.now() + seconds * 1000;

    while (Date.now() < deadline) {
      const state = await page.evaluate(readState);
      if (state.gameOver) {
        console.log(`[harness] collision detected at tick ${tick} - run ended`);
        break;
      }

      const decideStart = Date.now();
      const { safe_to_advance: safety, source } = await callJev(state);
      if (simulateLatencyMs > 0) await page.waitForTimeout(simulateLatencyMs);
      latencies.push(Date.now() - decideStart);

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
        console.log(
          `[t=${tick}] score=${state.score} threats=${state.threats.length} ` +
            `safety=${safety.toFixed(2)} (${source}) ${mustHold ? '[override: near-death]' : ''} -> ${wantsHold ? 'HOLD' : 'release'}`
        );
      }

      tick += 1;
      await page.waitForTimeout(TICK_MS);
    }

    const final = await page.evaluate(() => ({ score, gameOver: game.state.current === 'gameState3' }));
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
    const maxLatency = Math.max(0, ...latencies);
    console.log('----------------------------------------');
    console.log(`Final score: ${final.score}`);
    console.log(`Ticks: ${tick}, direction changes: holds=${holds} releases=${releases}`);
    console.log(`Decision latency: avg=${avgLatency.toFixed(1)}ms max=${maxLatency}ms (tick interval is ${TICK_MS}ms)`);
    console.log(final.gameOver ? 'Ended by collision' : 'Ended by time limit');
  } finally {
    await browser.close();
    server.close();
    if (localModelProc) localModelProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
