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
const { readState } = require('./sense');

const LOCAL_MODEL_PORT = 8787;
const OLLAMA_MODEL_PORT = 8788;
const LAYA_MODEL_PORT = 8789;

// Spawns one of ai-player/local-model/{server,ollama_server}.py and waits
// for it to accept connections. Kept separate from jev.js so jev.js doesn't
// need to know how its backends get started, just where to send requests
// (LOCAL_JEV_URL).
function startLocalModelServer(scriptPath, port, logTag) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [scriptPath, String(port)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let settled = false;
    proc.stdout.on('data', (chunk) => {
      process.stdout.write(`[${logTag}] ${chunk}`);
      if (!settled && chunk.toString().includes('serving on')) {
        settled = true;
        resolve(proc);
      }
    });
    proc.stderr.on('data', (chunk) => process.stderr.write(`[${logTag}] ${chunk}`));
    proc.on('exit', (code) => {
      if (!settled) reject(new Error(`${logTag} server exited early (code ${code})`));
    });
  });
}

const TICK_MS = 100; // near the fast end of Jev's documented 70-500ms latency window.
// There's no point sensing/deciding faster than the model you're driving
// with could ever answer - polling at 60fps would just be lying to
// yourself about how "real-time" the real thing could be.
const NEAR_DEATH_FRAMES = 250; // gameplay.js force-kills the rocket at oscIndexNew === 300

function parseArgs() {
  const args = process.argv.slice(2);
  const seconds = Number((args.find((a) => a.startsWith('--seconds=')) || '').split('=')[1]) || 60;
  const headed = args.includes('--headed');
  const local = args.includes('--local');
  const ollama = args.includes('--ollama');
  const laya = args.includes('--laya');
  // Artificially pads every decision with N ms of delay, applied *after*
  // callJev() resolves. Lets us feel what the real Jev API's ~900ms
  // round-trip would do to this game loop without needing network access to
  // it - same brain, same answers, just the latency a public HTTP API adds.
  const simulateLatencyMs = Number((args.find((a) => a.startsWith('--simulate-latency=')) || '').split('=')[1]) || 0;
  return { seconds, headed, local, ollama, laya, simulateLatencyMs };
}

async function main() {
  const { seconds, headed, local, ollama, laya, simulateLatencyMs } = parseArgs();

  if ([local, ollama, laya].filter(Boolean).length > 1) {
    throw new Error('--local, --ollama and --laya are three different brains - pick one');
  }

  let localModelProc = null;
  if (local) {
    console.log('[harness] starting local model server (ai-player/local-model/server.py)');
    localModelProc = await startLocalModelServer('ai-player/local-model/server.py', LOCAL_MODEL_PORT, 'local-model');
    process.env.LOCAL_JEV_URL = `http://127.0.0.1:${LOCAL_MODEL_PORT}/v1/systemone`;
  } else if (ollama) {
    console.log('[harness] starting ollama bridge (ai-player/local-model/ollama_server.py)');
    console.log('[harness] (requires `ollama serve` already running with the spaceterra-brain model pulled - see README)');
    localModelProc = await startLocalModelServer('ai-player/local-model/ollama_server.py', OLLAMA_MODEL_PORT, 'ollama-model');
    process.env.LOCAL_JEV_URL = `http://127.0.0.1:${OLLAMA_MODEL_PORT}/v1/systemone`;
  } else if (laya) {
    console.log('[harness] starting Laya bridge (ai-player/local-model/laya_server.py)');
    console.log('[harness] (requires `pip install laya` and model weights cached - see README; untested in this sandbox, see README)');
    localModelProc = await startLocalModelServer('ai-player/local-model/laya_server.py', LAYA_MODEL_PORT, 'laya-model');
    process.env.LOCAL_JEV_URL = `http://127.0.0.1:${LAYA_MODEL_PORT}/v1/systemone`;
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
      const { safe_to_hold, safe_to_release, source } = await callJev(state);
      if (simulateLatencyMs > 0) await page.waitForTimeout(simulateLatencyMs);
      latencies.push(Date.now() - decideStart);

      const mustHold = state.oscIndexNew > NEAR_DEATH_FRAMES; // safety override: standing still too long is instant death
      // jev.js now asks about both candidate actions (release isn't a free
      // safe default in this game - see its comment), but comparing them
      // head-to-head (wantsHold = safe_to_hold >= safe_to_release) measured
      // *worse* in real play (avg score ~7 vs ~9 across 10 runs each) than
      // just thresholding safe_to_hold alone. The likely reason: collect.js's
      // random policy re-rolls its coin every tick, so almost all of its
      // release examples are single-tick blips - real examples of "released
      // for several ticks while the rocket's own oscillation drifted it into
      // something" are rare, so safe_to_release is a noisier signal than
      // safe_to_hold and isn't trustworthy to swap decisions on yet. Kept
      // around (and logged below) because it's a legitimate, validated
      // finding to build on - see ai-player/README.md.
      const wantsHold = mustHold || safe_to_hold >= 0.65;

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
            `hold=${safe_to_hold.toFixed(2)} release=${safe_to_release.toFixed(2)} (${source}) ` +
            `${mustHold ? '[override: near-death]' : ''} -> ${wantsHold ? 'HOLD' : 'release'}`
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
