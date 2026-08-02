function createPublicHealthHandler() {
  return async function publicHealth(req, res) {
    res.set('Cache-Control', 'no-store');
    const db = req.app.locals.db;

    if (!db) {
      return res.status(503).json({
        status: 'starting',
        service: 'spaceterra',
        checkedAt: new Date().toISOString(),
        datastore: { status: 'initializing' },
        metrics: null,
      });
    }

    try {
      await db.command({ ping: 1 });
      const leaderboard = db.collection('leaderboard');
      const [scoresPersisted, players] = await Promise.all([
        leaderboard.countDocuments({}),
        leaderboard.distinct('username'),
      ]);

      return res.json({
        status: 'healthy',
        service: 'spaceterra',
        checkedAt: new Date().toISOString(),
        datastore: { status: 'connected' },
        metrics: {
          scoresPersisted,
          playersWithScores: players.filter(Boolean).length,
        },
      });
    } catch (error) {
      console.error('Public health check failed:', error.message);
      return res.status(503).json({
        status: 'degraded',
        service: 'spaceterra',
        checkedAt: new Date().toISOString(),
        datastore: { status: 'unavailable' },
        metrics: null,
      });
    }
  };
}

module.exports = { createPublicHealthHandler };
