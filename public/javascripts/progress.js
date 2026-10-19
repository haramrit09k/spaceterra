/**
 * Coins, best score and Hangar upgrades.
 *
 * Guests: kept in this browser's localStorage. Storage can be unavailable
 * (private windows, blocked cookies), so every access is guarded and the game
 * simply starts fresh in that case.
 *
 * Signed in with Google: kept on the server (MongoDB `progress` collection, see
 * routes/progress.js) so it follows the player to any browser. The first time
 * a player signs in here, their guest progress is added to the account once.
 */
(function (global) {
  var GUEST_KEY = 'spaceterra.progress.v1';
  var SAVE_DELAY_MS = 500;

  function empty() {
    return { coins: 0, best: 0, lifetimeCoins: 0, upgrades: { SHIELD: 0, MAGNET: 0, DOUBLE_COINS: 0 } };
  }

  function normalize(saved) {
    var p = empty();
    if (!saved || typeof saved !== 'object') return p;
    p.coins = Math.max(0, saved.coins | 0);
    p.best = Math.max(0, saved.best | 0);
    p.lifetimeCoins = Math.max(0, saved.lifetimeCoins | 0);
    for (var k in p.upgrades) p.upgrades[k] = Math.max(0, (saved.upgrades && saved.upgrades[k]) | 0);
    return p;
  }

  function readGuest() {
    try {
      return normalize(JSON.parse(global.localStorage.getItem(GUEST_KEY) || 'null'));
    } catch (e) {
      return empty();
    }
  }

  function writeGuest(p) {
    try {
      global.localStorage.setItem(GUEST_KEY, JSON.stringify(p));
    } catch (e) { /* progress just won't persist */ }
  }

  function hasAnything(p) {
    return p.coins > 0 || p.best > 0 || p.lifetimeCoins > 0 ||
      Object.keys(p.upgrades).some(function (k) { return p.upgrades[k] > 0; });
  }

  var data = readGuest();
  var account = false; // true once the server copy is loaded
  var accountRequested = false;
  var saveTimer = null;
  var listeners = [];
  // Best score this account already has on the leaderboard (from before
  // saved progress existed). Applied once the account copy has loaded.
  var leaderboardBest = 0;

  /** Lifts the saved best to the leaderboard best; returns true if it changed. */
  function applyLeaderboardBest() {
    if (!account || leaderboardBest <= data.best) return false;
    data.best = leaderboardBest;
    save();
    return true;
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
  }

  function request(method, url, body, keepalive) {
    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      keepalive: !!keepalive,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      if (!res.ok) throw new Error('progress request failed: ' + res.status);
      return res.json();
    });
  }

  function pushToServer(keepalive) {
    clearTimeout(saveTimer);
    saveTimer = null;
    return request('PUT', '/api/progress', data, keepalive).catch(function () {
      // Offline or the server is busy: the next save sends everything again.
    });
  }

  function save() {
    if (!account) {
      writeGuest(data);
      return;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushToServer, SAVE_DELAY_MS);
  }

  if (global.addEventListener) {
    global.addEventListener('pagehide', function () {
      if (account && saveTimer) pushToServer(true);
    });
  }

  global.Progress = {
    get coins() { return data.coins; },
    get best() { return data.best; },
    /** True when progress is saved to the player's Google account. */
    get synced() { return account; },
    upgradeLevel: function (powerUp) { return data.upgrades[powerUp] | 0; },

    /** Called whenever progress changes from outside the game (e.g. the server copy loads). */
    onChange: function (fn) {
      listeners.push(fn);
    },

    /** Switches to the signed-in player's server copy, merging guest progress once. */
    useAccount: function () {
      if (accountRequested) return;
      accountRequested = true;
      var guest = readGuest();
      var load = hasAnything(guest)
        ? request('POST', '/api/progress/link', guest)
        : request('GET', '/api/progress');
      load.then(function (res) {
        if (hasAnything(guest)) writeGuest(empty()); // now part of the account
        data = normalize(res.progress);
        account = true;
        applyLeaderboardBest();
        notify();
      }).catch(function () {
        accountRequested = false; // stay on local progress; try again next time
      });
    },

    /**
     * Makes sure the signed-in player's best is at least their best leaderboard
     * score, so "Your best" and "New personal best!" agree with the leaderboard.
     */
    raiseBestFromLeaderboard: function (score) {
      leaderboardBest = Math.max(leaderboardBest, score | 0);
      if (applyLeaderboardBest()) notify();
    },

    /** Banks a finished run; returns true for a new personal best. */
    recordRun: function (score, coins) {
      var newBest = score > data.best;
      if (newBest) data.best = score;
      data.coins += coins;
      data.lifetimeCoins += coins;
      save();
      return newBest;
    },

    /** Adds coins collected mid-run, e.g. just before paying for a revive. */
    bankCoins: function (coins) {
      data.coins += coins;
      data.lifetimeCoins += coins;
      save();
    },

    spend: function (amount) {
      if (amount > data.coins) return false;
      data.coins -= amount;
      save();
      return true;
    },

    /** Buys the next level of an upgrade; returns false if unaffordable or maxed. */
    upgrade: function (powerUp, cost) {
      if (cost == null || !this.spend(cost)) return false;
      data.upgrades[powerUp] = (data.upgrades[powerUp] | 0) + 1;
      save();
      return true;
    },
  };
})(this);
