// Self-play data collector for the local model.
//
// The old local-model/train.py generated synthetic examples by copying
// gameplay.js's own sine-wave constants (390, 420) into a predictFutureX-style
// formula, then labeled them with that same closed-form clearance formula -
// so the "model" was a distillation of hand-read source, not something that
// had learned anything, and it would silently go stale the moment obstacle
// generation or the oscillation math changed.
//
// This script replaces that with real experience: it plays many short
// episodes against the actual running game under an exploring hold/release
// policy, and for every tick it held "up" it records only what the game
// itself already exposes via sense.js's readState() (rocket position,
// oscillation index/intensity, each threat's position/speed/width) plus
// what *actually happened next* - a real collision, or not. No formula, no
// game-source constants. If the game's internals ever change, re-running
// this script captures the new dynamics automatically; nothing here needs
// to be hand-updated to match.
//
// The one piece of game knowledge used here is a stated rule, not a reverse
// -engineered implementation detail: gameplay.js kills the rocket after 300
// consecutive un-held frames (see gameplay.js's oscIndexNew check), so a
// hold is forced once a run gets close to that - otherwise collection would
// mostly measure "died of standing still" instead of real near-miss/hit
// outcomes from actually navigating threats.
//
// Usage: node ai-player/collect.js [--episodes=150] [--out=path.jsonl] [--hold-prob=0.8] [--headed]
//        node ai-player/collect.js --episodes=300 --policy=model --epsilon=0.2
//
// --policy=model bootstraps a second round of data from the *current*
// model's own decisions (plus a bit of random exploration) instead of a
// purely random policy. This matters because a model trained on random-
// policy episodes is validated against states a random policy visits, not
// the states its own (mostly-holding) deployed behavior actually leads to -
// real play scored worse than the random-policy held-out metrics predicted.
// Rolling out the model itself and labeling by true outcomes, same as
// before, closes that gap the standard self-play way: train on the states
// the policy you're about to run actually encounters.
const fs = require('fs');
const { chromium } = require('playwright');
const { startHarnessServer, PORT } = require('./harness-server');
const { readState } = require('./sense');
const { startLocalModelServer } = require('./spawn-local-model');
const { callJev } = require('./jev');
const { NEAR_DEATH_FRAMES, HOLD_THRESHOLD } = require('./policy');

const TICK_MS = 100;
const MAX_TICKS_PER_EPISODE = 600; // 60s hard cap so a lucky non-colliding run can't stall collection
const MODEL_POLICY_PORT = 8797; // separate from play.js's 8787 so both can run independently
// A threat this far from the rocket's row is trivially safe to hold through
// no matter what eventually happens to it - true of any scrolling-obstacle
// game, not a fact about this one's obstacle generation. Only readings at or
// inside this range get blamed when their threat turns out to be the
// collision's cause; its own earlier, distant sightings stay labeled safe.
const NEAR_ZONE_Y = 120;

function parseArgs() {
  const args = process.argv.slice(2);
  const episodes = Number((args.find((a) => a.startsWith('--episodes=')) || '').split('=')[1]) || 150;
  const out = (args.find((a) => a.startsWith('--out=')) || '').split('=')[1] || 'ai-player/local-model/episodes.jsonl';
  const fixedHoldProbArg = args.find((a) => a.startsWith('--hold-prob='));
  const fixedHoldProb = fixedHoldProbArg ? Number(fixedHoldProbArg.split('=')[1]) : null;
  const headed = args.includes('--headed');
  const policy = (args.find((a) => a.startsWith('--policy=')) || '').split('=')[1] || 'random';
  const epsilon = Number((args.find((a) => a.startsWith('--epsilon=')) || '').split('=')[1]) || 0.2;
  return { episodes, out, fixedHoldProb, headed, policy, epsilon };
}

// Collisions only happen near the end of an episode, so most of an
// episode's ticks are easy, far-from-danger positives - varying how
// aggressively each episode holds (instead of one fixed probability for
// every run) means some episodes die almost immediately against a threat
// that's still easy to dodge and others thread several close calls before
// finally losing, which is what gives the negative class (and the
// boundary region generally) more than one way of looking.
function pickHoldProb(fixedHoldProb) {
  return fixedHoldProb !== null ? fixedHoldProb : 0.6 + Math.random() * 0.35;
}

// Decides hold/release the same way play.js's active decision rule does
// (safe_to_hold against a fixed threshold - see its comment on why that
// currently beats comparing it against safe_to_release), with epsilon
// chance of a random action instead so collection doesn't collapse onto
// one deterministic trajectory per obstacle layout and still explores
// near the boundary the model is unsure about.
async function decideWithModel(state, epsilon) {
  if (Math.random() < epsilon) return Math.random() < 0.5;
  const { safe_to_hold } = await callJev(state);
  return safe_to_hold >= HOLD_THRESHOLD;
}

// Plays one episode under either a randomized or model-driven hold/release
// policy (overridden only by the near-death rule above) and returns every
// tick's raw observed state + action, unlabeled - labelEpisode() below
// turns that into training rows once we know how the episode actually ended.
async function runEpisode(page, { policy, holdProb, epsilon }) {
  const ticks = [];
  let holding = false;
  let tick = 0;

  while (tick < MAX_TICKS_PER_EPISODE) {
    const state = await page.evaluate(readState);
    if (state.gameOver) break;

    const mustHold = state.oscIndexNew > NEAR_DEATH_FRAMES;
    const wantsHold = mustHold || (policy === 'model' ? await decideWithModel(state, epsilon) : Math.random() < holdProb);

    ticks.push({
      rocketX: state.rocketX,
      oscIndex: state.oscIndex,
      intensity: state.intensity,
      threats: state.threats.map((t) => ({ id: t.id, x: t.x, y: t.y, scrollRate: t.scrollRate, halfWidth: t.halfWidth })),
      action: wantsHold ? 'hold' : 'release',
    });

    if (wantsHold !== holding) {
      if (wantsHold) await page.keyboard.down('ArrowUp');
      else await page.keyboard.up('ArrowUp');
      holding = wantsHold;
    }

    tick += 1;
    await page.waitForTimeout(TICK_MS);
  }

  await page.keyboard.up('ArrowUp');
  return ticks;
}

// ticks[] covers up to and including the last safe moment; if the loop
// broke on gameOver, a collision happened right after ticks[ticks.length-1].
// Rather than guessing a time window, find the actual sprite responsible -
// each threat carries a stable id (see sense.js's stableId()), so the
// culprit is whichever one was closest to the rocket's row (smallest `y`)
// in the last couple of readings before the game flipped to gameOver. Every
// *other* threat, including that same culprit's own earlier, farther-away
// appearances, is a real observation of "this action turned out fine" -
// it's specifically the ticks where the culprit was already close that get
// labeled unsafe.
//
// Release ticks are kept too, not just hold ticks: gameplay.js keeps
// advancing the rocket's own sine-wave position every frame regardless of
// hold state, so a release can drift the rocket into a threat that's
// already sitting close by just as easily as holding into one can.
// Without real release-labeled examples the model would have no way to
// learn that release carries its own risk.
function findCulpritId(ticks, endedInCollision) {
  if (!endedInCollision) return null;
  const candidates = ticks.slice(-2).flatMap((t) => t.threats);
  if (candidates.length === 0) return null;
  return candidates.reduce((closest, t) => (t.y < closest.y ? t : closest), candidates[0]).id;
}

function labelEpisode(ticks, endedInCollision) {
  const culpritId = findCulpritId(ticks, endedInCollision);
  const records = [];
  for (const tick of ticks) {
    for (const threat of tick.threats) {
      records.push({
        rocketX: tick.rocketX,
        oscIndex: tick.oscIndex,
        intensity: tick.intensity,
        threatX: threat.x,
        threatY: threat.y,
        scrollRate: threat.scrollRate,
        halfWidth: threat.halfWidth,
        action: tick.action,
        label: threat.id === culpritId && threat.y <= NEAR_ZONE_Y ? 0 : 1,
      });
    }
  }
  return records;
}

async function main() {
  const { episodes, out, fixedHoldProb, headed, policy, epsilon } = parseArgs();

  let localModelProc = null;
  if (policy === 'model') {
    console.log('[collect] policy=model: starting local model server for on-policy collection');
    localModelProc = await startLocalModelServer('ai-player/local-model/server.py', MODEL_POLICY_PORT, 'local-model');
    process.env.LOCAL_JEV_URL = `http://127.0.0.1:${MODEL_POLICY_PORT}/v1/systemone`;
  }

  console.log(`[collect] starting static server on port ${PORT}`);
  const server = await startHarnessServer();

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    headless: !headed,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 800 } });

  const outStream = fs.createWriteStream(out, { flags: 'w' });
  let totalRecords = 0;
  let positiveRecords = 0;

  try {
    await page.goto(`http://localhost:${PORT}/`);

    for (let ep = 0; ep < episodes; ep += 1) {
      await page.waitForFunction(() => typeof window.actionOnClick === 'function');
      await page.evaluate(() => window.actionOnClick());
      await page.waitForFunction(() => typeof window.rocket !== 'undefined');

      const holdProb = pickHoldProb(fixedHoldProb);
      const ticks = await runEpisode(page, { policy, holdProb, epsilon });
      const endedInCollision = await page.evaluate(() => game.state.current === 'gameState3');
      const records = labelEpisode(ticks, endedInCollision);
      totalRecords += records.length;
      positiveRecords += records.filter((r) => r.label === 1).length;
      for (const rec of records) outStream.write(`${JSON.stringify(rec)}\n`);

      if (ep % 10 === 0 || ep === episodes - 1) {
        console.log(
          `[collect] episode ${ep + 1}/${episodes}: ${ticks.length} ticks, ` +
            `${records.length} labeled rows (total so far: ${totalRecords}, ${((positiveRecords / Math.max(totalRecords, 1)) * 100).toFixed(0)}% safe)`
        );
      }

      // Reload between episodes rather than reusing page state - cheap, and
      // guarantees each episode starts from the same clean gameState1.
      await page.goto(`http://localhost:${PORT}/`);
    }
  } finally {
    outStream.end();
    await browser.close();
    server.close();
    if (localModelProc) localModelProc.kill();
  }

  console.log(`[collect] wrote ${totalRecords} labeled rows to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
