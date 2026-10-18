// Saved progress (coins, best score, Hangar upgrades) for players signed in
// with Google. Stored in the `progress` collection, one document per account.
//
// Coins are client-reported, like scores already are. Values are only
// sanity-checked: tampering affects nobody's game but the player's own.

const POWER_UPS = ['SHIELD', 'MAGNET', 'DOUBLE_COINS'];
const MAX_LEVEL = 5;
const MAX_COINS = 10000000;
const MAX_SCORE = 1000000;

function count(value, max) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
}

/** Turns a request body into clean progress fields, ignoring anything else. */
function sanitize(body) {
  const input = body && typeof body === 'object' ? body : {};
  const upgrades = {};
  for (const kind of POWER_UPS) {
    upgrades[kind] = count(input.upgrades && input.upgrades[kind], MAX_LEVEL);
  }
  return {
    coins: count(input.coins, MAX_COINS),
    best: count(input.best, MAX_SCORE),
    lifetimeCoins: count(input.lifetimeCoins, MAX_COINS),
    upgrades,
  };
}

function toResponse(doc) {
  const p = sanitize(doc || {});
  return { coins: p.coins, best: p.best, lifetimeCoins: p.lifetimeCoins, upgrades: p.upgrades };
}

function accountId(user) {
  return user && user.id ? `google:${user.id}` : null;
}

/** Best score, lifetime coins and upgrade levels never go down. */
function maxFields(p) {
  const fields = { best: p.best, lifetimeCoins: p.lifetimeCoins };
  for (const kind of POWER_UPS) fields[`upgrades.${kind}`] = p.upgrades[kind];
  return fields;
}

function createProgressHandlers() {
  function withCollection(handler) {
    return async function (req, res, next) {
      res.set('Cache-Control', 'no-store');
      const id = accountId(req.user);
      if (!id) return res.status(401).json({ error: 'sign in to save progress' });
      const db = req.app.locals.db;
      if (!db) return res.status(503).json({ error: 'database not ready' });
      try {
        return await handler(db.collection('progress'), id, req, res);
      } catch (err) {
        return next(err);
      }
    };
  }

  return {
    /** GET /api/progress */
    get: withCollection(async (progress, id, req, res) => {
      const doc = await progress.findOne({ _id: id });
      res.json({ progress: toResponse(doc) });
    }),

    /** PUT /api/progress: saves the browser's current progress for this account. */
    put: withCollection(async (progress, id, req, res) => {
      const p = sanitize(req.body);
      const result = await progress.findOneAndUpdate(
        { _id: id },
        { $set: { coins: p.coins, updatedAt: new Date() }, $max: maxFields(p) },
        { upsert: true, returnOriginal: false }
      );
      res.json({ progress: toResponse(result.value) });
    }),

    /**
     * POST /api/progress/link: adds progress earned as a guest in this browser
     * to the account, the first time the player signs in there.
     */
    link: withCollection(async (progress, id, req, res) => {
      const p = sanitize(req.body);
      const result = await progress.findOneAndUpdate(
        { _id: id },
        {
          $inc: { coins: p.coins, lifetimeCoins: p.lifetimeCoins },
          $max: { best: p.best, ...Object.fromEntries(POWER_UPS.map(k => [`upgrades.${k}`, p.upgrades[k]])) },
          $set: { updatedAt: new Date() },
        },
        { upsert: true, returnOriginal: false }
      );
      res.json({ progress: toResponse(result.value) });
    }),
  };
}

module.exports = { createProgressHandlers, sanitize, accountId };
