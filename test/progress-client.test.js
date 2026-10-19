const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Loads public/javascripts/progress.js with a fake fetch and localStorage.
function loadProgress(serverProgress) {
  const store = {};
  const requests = [];
  const pending = [];
  const context = {
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    addEventListener: () => {},
    setTimeout: fn => { pending.push(fn); return pending.length; },
    clearTimeout: () => {},
    fetch: (url, opts) => {
      requests.push({ url, method: opts.method, body: opts.body && JSON.parse(opts.body) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ progress: serverProgress }) });
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/javascripts/progress.js'), 'utf8'), context);
  const flushSaves = () => pending.splice(0).forEach(fn => fn());
  return { Progress: context.Progress, requests, flushSaves };
}

const flush = () => new Promise(r => setImmediate(r));
const empty = { coins: 0, best: 0, lifetimeCoins: 0, upgrades: {} };

test('leaderboard best arriving after the account loads lifts the saved best', async () => {
  const { Progress, requests, flushSaves } = loadProgress({ ...empty, best: 212 });
  Progress.useAccount();
  await flush();
  expect(Progress.best).toBe(212);
  Progress.raiseBestFromLeaderboard(280);
  expect(Progress.best).toBe(280);
  flushSaves();
  expect(requests.pop()).toMatchObject({ url: '/api/progress', method: 'PUT', body: { best: 280 } });
});

test('leaderboard best arriving before the account loads is applied once it does', async () => {
  const { Progress } = loadProgress({ ...empty, best: 212 });
  Progress.raiseBestFromLeaderboard(280);
  Progress.useAccount();
  await flush();
  expect(Progress.best).toBe(280);
  expect(Progress.recordRun(250, 0)).toBe(false); // below 280 is not a new best
});

test('never lowers a better saved best', async () => {
  const { Progress } = loadProgress({ ...empty, best: 400 });
  Progress.useAccount();
  await flush();
  Progress.raiseBestFromLeaderboard(280);
  expect(Progress.best).toBe(400);
});

test('guests keep their own best', () => {
  const { Progress } = loadProgress(empty);
  Progress.recordRun(90, 0);
  Progress.raiseBestFromLeaderboard(280); // not signed in: nothing to apply yet
  expect(Progress.best).toBe(90);
});
