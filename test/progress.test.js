const { createProgressHandlers, sanitize, accountId } = require('../routes/progress');
const { FakeCollection } = require('./helpers/fake-collection');

function setup(user = { id: '1234', displayName: 'Test Pilot' }) {
  const collection = new FakeCollection();
  const db = { collection: name => (name === 'progress' ? collection : null) };
  const handlers = createProgressHandlers();
  async function call(name, body, who = user) {
    const res = {
      statusCode: 200,
      headers: {},
      set(k, v) { this.headers[k] = v; return this; },
      status(code) { this.statusCode = code; return this; },
      json(b) { this.body = b; return this; },
    };
    let error;
    await handlers[name]({ user: who, body, app: { locals: { db } } }, res, e => { error = e; });
    if (error) throw error;
    return res;
  }
  return { collection, call };
}

test('requires a signed-in Google account', async () => {
  const { call } = setup();
  const res = await call('get', undefined, null);
  expect(res.statusCode).toBe(401);
});

test('new accounts start empty', async () => {
  const { call } = setup();
  const res = await call('get');
  expect(res.body.progress).toEqual({ coins: 0, best: 0, lifetimeCoins: 0, upgrades: { SHIELD: 0, MAGNET: 0, DOUBLE_COINS: 0 } });
  expect(res.headers['Cache-Control']).toBe('no-store');
});

test('saving stores coins and never lowers best, lifetime or upgrades', async () => {
  const { call, collection } = setup();
  await call('put', { coins: 500, best: 300, lifetimeCoins: 900, upgrades: { SHIELD: 3 } });
  const res = await call('put', { coins: 120, best: 50, lifetimeCoins: 10, upgrades: { SHIELD: 1, MAGNET: 2 } });
  expect(res.body.progress).toEqual({ coins: 120, best: 300, lifetimeCoins: 900, upgrades: { SHIELD: 3, MAGNET: 2, DOUBLE_COINS: 0 } });
  expect(collection.docs.get('google:1234').updatedAt).toBeInstanceOf(Date);
});

test('linking adds guest coins to the account once', async () => {
  const { call } = setup();
  await call('put', { coins: 400, best: 200, lifetimeCoins: 400, upgrades: { MAGNET: 1 } });
  const res = await call('link', { coins: 150, best: 350, lifetimeCoins: 150, upgrades: { SHIELD: 2, MAGNET: 0 } });
  expect(res.body.progress).toEqual({ coins: 550, best: 350, lifetimeCoins: 550, upgrades: { SHIELD: 2, MAGNET: 1, DOUBLE_COINS: 0 } });
});

test('accounts are kept apart', async () => {
  const { call } = setup();
  await call('put', { coins: 10 }, { id: 'a' });
  const res = await call('get', undefined, { id: 'b' });
  expect(res.body.progress.coins).toBe(0);
});

test('reports a missing database as unavailable', async () => {
  const handlers = createProgressHandlers();
  const res = { set() { return this; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } };
  await handlers.get({ user: { id: '1' }, app: { locals: {} } }, res, () => {});
  expect(res.statusCode).toBe(503);
});

test('sanitize clamps junk input', () => {
  expect(sanitize({ coins: -5, best: 'abc', lifetimeCoins: 1e12, upgrades: { SHIELD: 99, MAGNET: 2.7, EVIL: 4 }, $where: 'x' }))
    .toEqual({ coins: 0, best: 0, lifetimeCoins: 10000000, upgrades: { SHIELD: 5, MAGNET: 2, DOUBLE_COINS: 0 } });
  expect(sanitize(null).coins).toBe(0);
  expect(accountId({ id: '42' })).toBe('google:42');
  expect(accountId({})).toBeNull();
});
