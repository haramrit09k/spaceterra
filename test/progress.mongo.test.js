// Runs the progress handlers against a real MongoDB server.
// Skipped unless MONGODB_TEST_URI is set, e.g.
//   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npx jest test/progress.mongo.test.js
const { MongoClient } = require('mongodb');
const { createProgressHandlers } = require('../routes/progress');

const uri = process.env.MONGODB_TEST_URI;
const describeIfMongo = uri ? describe : describe.skip;

describeIfMongo('progress handlers on MongoDB', () => {
  let client;
  let db;
  const handlers = createProgressHandlers();

  beforeAll(async () => {
    client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    db = client.db(`spaceterra_test_${Date.now()}`);
  });

  afterAll(async () => {
    if (db) await db.dropDatabase();
    if (client) await client.close();
  });

  async function call(name, body, user = { id: 'pilot-1' }) {
    const res = {
      set() { return this; },
      status(code) { this.statusCode = code; return this; },
      json(b) { this.body = b; return this; },
    };
    let error;
    await handlers[name]({ user, body, app: { locals: { db } } }, res, e => { error = e; });
    if (error) throw error;
    return res.body.progress;
  }

  test('upserts, keeps maxima, links guest progress and reads it back', async () => {
    expect(await call('get')).toMatchObject({ coins: 0, best: 0 });
    await call('put', { coins: 500, best: 300, lifetimeCoins: 900, upgrades: { SHIELD: 3 } });
    expect(await call('put', { coins: 120, best: 50, lifetimeCoins: 10, upgrades: { SHIELD: 1, MAGNET: 2 } }))
      .toEqual({ coins: 120, best: 300, lifetimeCoins: 900, upgrades: { SHIELD: 3, MAGNET: 2, DOUBLE_COINS: 0 } });
    expect(await call('link', { coins: 80, best: 400, lifetimeCoins: 80, upgrades: { DOUBLE_COINS: 1 } }))
      .toEqual({ coins: 200, best: 400, lifetimeCoins: 980, upgrades: { SHIELD: 3, MAGNET: 2, DOUBLE_COINS: 1 } });
    expect(await call('get')).toEqual({ coins: 200, best: 400, lifetimeCoins: 980, upgrades: { SHIELD: 3, MAGNET: 2, DOUBLE_COINS: 1 } });

    const stored = await db.collection('progress').findOne({ _id: 'google:pilot-1' });
    expect(stored.updatedAt).toBeInstanceOf(Date);
  });

  test('linking into a brand-new account creates it', async () => {
    expect(await call('link', { coins: 30, best: 12, lifetimeCoins: 30, upgrades: { MAGNET: 1 } }, { id: 'fresh' }))
      .toEqual({ coins: 30, best: 12, lifetimeCoins: 30, upgrades: { SHIELD: 0, MAGNET: 1, DOUBLE_COINS: 0 } });
  });
});
