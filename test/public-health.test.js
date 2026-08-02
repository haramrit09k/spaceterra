const { createPublicHealthHandler } = require('../routes/public-health');

function responseDouble() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('reports persisted leaderboard activity without exposing player names', async () => {
  const leaderboard = {
    countDocuments: jest.fn().mockResolvedValue(128),
    distinct: jest.fn().mockResolvedValue(['player-1', 'player-2', null]),
  };
  const db = {
    command: jest.fn().mockResolvedValue({ ok: 1 }),
    collection: jest.fn().mockReturnValue(leaderboard),
  };
  const req = { app: { locals: { db } } };
  const res = responseDouble();

  await createPublicHealthHandler()(req, res);

  expect(res.statusCode).toBe(200);
  expect(res.headers['Cache-Control']).toBe('no-store');
  expect(res.body.metrics).toEqual({ scoresPersisted: 128, playersWithScores: 2 });
  expect(JSON.stringify(res.body)).not.toContain('player-1');
});

test('reports a starting state until MongoDB is connected', async () => {
  const req = { app: { locals: {} } };
  const res = responseDouble();

  await createPublicHealthHandler()(req, res);

  expect(res.statusCode).toBe(503);
  expect(res.body.status).toBe('starting');
  expect(res.body.metrics).toBeNull();
});
