const { GameWorld, Upgrades, C } = require('../public/javascripts/world');

// Small seeded PRNG so runs are repeatable.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyWorld(options = {}) {
  const w = new GameWorld({ random: seeded(1), ...options });
  w.rocks = [];
  w.aliens = [];
  w.pickups = [];
  return w;
}

const rockOnRocket = w => w.rocks.push({ x: w.rocketX, y: w.rocketY - w.rocksOffsetY, frame: 0, scale: 1 });

test('rocket follows the original sine wave', () => {
  const w = emptyWorld();
  expect(w.rocketX).toBe(420 + Math.trunc(390 * Math.sin(1 / 50)));
});

test('idle rocket explodes after five seconds', () => {
  const w = emptyWorld();
  for (let i = 0; i < C.IDLE_LIMIT_TICKS - 1; i++) w.tick(false);
  expect(w.state).toBe('RUNNING');
  w.tick(false);
  expect(w.state).toBe('CRASHING');
  for (let i = 0; i < C.CRASH_DURATION_TICKS; i++) w.tick(false);
  expect(w.state).toBe('CRASHED');
});

test('thrusting scores distance', () => {
  const w = emptyWorld();
  for (let i = 0; i < 100; i++) w.tick(true);
  expect(w.score).toBe(10);
});

test('hitting a rock crashes', () => {
  const w = emptyWorld();
  rockOnRocket(w);
  w.tick(true);
  expect(w.state).toBe('CRASHING');
  expect(w.events).toContainEqual({ type: 'crashed' });
});

test('shield absorbs one hit', () => {
  const w = emptyWorld();
  w.activePowerUps.SHIELD = 100;
  rockOnRocket(w);
  w.tick(true);
  expect(w.state).toBe('RUNNING');
  expect(w.isActive('SHIELD')).toBe(false);
  expect(w.stats.shieldSaves).toBe(1);
  expect(w.invulnerableTicks).toBeGreaterThan(0);
});

test('coins are collected and doubled', () => {
  const w = emptyWorld();
  w.pickups.push({ x: w.rocketX, y: w.rocketY - w.rocksOffsetY, powerUp: null });
  w.tick(false);
  expect(w.stats.coins).toBe(1);
  w.activePowerUps.DOUBLE_COINS = 100;
  w.pickups.push({ x: w.rocketX, y: w.rocketY - w.rocksOffsetY, powerUp: null });
  w.tick(false);
  expect(w.stats.coins).toBe(3);
});

test('power-up pickup starts its timer', () => {
  const w = emptyWorld({ powerUpTicks: () => 42 });
  w.pickups.push({ x: w.rocketX, y: w.rocketY - w.rocksOffsetY, powerUp: 'MAGNET' });
  w.tick(false);
  expect(w.isActive('MAGNET')).toBe(true);
  for (let i = 0; i < 42; i++) w.tick(false);
  expect(w.isActive('MAGNET')).toBe(false);
});

test('revive clears nearby hazards and keeps score', () => {
  const w = emptyWorld();
  for (let i = 0; i < 50; i++) w.tick(true);
  const score = w.score;
  rockOnRocket(w);
  for (let i = 0; i < C.CRASH_DURATION_TICKS + 2; i++) w.tick(true);
  expect(w.state).toBe('CRASHED');
  expect(w.revive()).toBe(true);
  expect(w.score).toBe(score);
  expect(w.rocks.every(r => r.y + w.rocksOffsetY + 72 * r.scale <= w.rocketY - 700)).toBe(true);
  expect(w.revive()).toBe(false);
});

test('long runs ramp speed, keep spawning and stay bounded', () => {
  const w = new GameWorld({ random: seeded(7) });
  for (let i = 0; i < 20000; i++) {
    w.activePowerUps.SHIELD = 10;
    w.tick(true);
  }
  expect(w.state).toBe('RUNNING');
  expect(w.speed()).toBeCloseTo(C.MAX_SPEED);
  expect(w.rocks.some(r => r.y + w.rocksOffsetY < 0)).toBe(true);
  expect(w.rocks.length).toBeLessThan(60);
  expect(w.aliens.length).toBeGreaterThan(0);
  expect(w.pickups.length).toBeGreaterThan(0);
});

test('upgrade and revive prices match the Android app', () => {
  expect([0, 1, 2, 3, 4].map(Upgrades.cost)).toEqual([100, 200, 400, 800, 1600]);
  expect(Upgrades.cost(Upgrades.MAX_LEVEL)).toBeNull();
  expect(Upgrades.durationTicks(0)).toBe(360);
  expect(Upgrades.durationTicks(5)).toBe(960);
  expect([0, 1, 2].map(Upgrades.reviveCost)).toEqual([100, 200, 400]);
});
