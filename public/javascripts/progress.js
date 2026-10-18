/**
 * Coins, best score and Hangar upgrades, kept in this browser's localStorage.
 * Storage can be unavailable (private windows, blocked cookies), so every
 * access is guarded and the game simply starts fresh in that case.
 */
(function (global) {
  var KEY = 'spaceterra.progress.v1';
  var defaults = { coins: 0, best: 0, lifetimeCoins: 0, upgrades: { SHIELD: 0, MAGNET: 0, DOUBLE_COINS: 0 } };

  function load() {
    try {
      var saved = JSON.parse(global.localStorage.getItem(KEY) || 'null');
      if (saved && typeof saved === 'object') {
        return {
          coins: Math.max(0, saved.coins | 0),
          best: Math.max(0, saved.best | 0),
          lifetimeCoins: Math.max(0, saved.lifetimeCoins | 0),
          upgrades: Object.assign({}, defaults.upgrades, saved.upgrades),
        };
      }
    } catch (e) { /* fall through to defaults */ }
    return JSON.parse(JSON.stringify(defaults));
  }

  var data = load();

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* progress just won't persist */ }
  }

  global.Progress = {
    get coins() { return data.coins; },
    get best() { return data.best; },
    upgradeLevel: function (powerUp) { return data.upgrades[powerUp] | 0; },

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
