/**
 * Space Terra gameplay rules, independent of Phaser so they can be unit tested.
 *
 * This mirrors android/app/src/main/java/.../game/GameWorld.kt: the same
 * sine-wave rocket, asteroids and aliens as the original game, plus coins,
 * power-ups and a speed ramp. Everything advances in fixed 1/60 s ticks.
 *
 * Positions of rocks and pickups are in a scrolling layer: add rocksOffsetY
 * to get screen y. Aliens use aliensOffsetX / aliensOffsetY the same way.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SpaceTerraWorld = factory();
  }
})(this, function () {
  var C = {
    WORLD_WIDTH: 900,
    BASE_HEIGHT: 768,

    // Sprite sizes after the original game's scale factors.
    ROCKET_W: 40, // 100 x 0.4
    ROCKET_H: 60, // 150 x 0.4
    ROCK_FRAME_W: 72,
    ROCK_FRAMES: 15,
    ALIEN_SIZE: 83, // 278 x 0.3
    EXPLOSION_SIZE: 87, // 512 x 0.17
    COIN_SIZE: 44,
    POWER_UP_SIZE: 64,

    ROCKET_BOTTOM_MARGIN: 268, // rocket sat at y=500 of 768
    ROCKET_CENTER_X: 420,
    ROCKET_AMPLITUDE: 390,
    START_INTENSITY: 50,
    MIN_INTENSITY: 41,
    INTENSITY_DECAY: 0.0007,

    ALIEN_LOCAL_X: 300,
    ALIEN_CENTER_X: 80,
    ALIEN_AMPLITUDE: 300,
    ALIEN_PERIOD: 80,

    ROCK_SPEED: 15,
    ALIEN_SPEED: 10,
    MAX_SPEED: 1.6,
    SPEED_RAMP_SCORE: 800,

    IDLE_LIMIT_TICKS: 300,
    CRASH_DURATION_TICKS: 45, // 750 ms
    INVULNERABLE_TICKS: 90,
    BASE_POWER_UP_TICKS: 8 * 60,

    COIN_TRAIL_CHANCE: 0.6,
    POWER_UP_CHANCE: 0.12,
    COIN_MARGIN: 40,
    MAGNET_RADIUS: 320,
    MAGNET_PULL: 14,

    ROCK_LOOKAHEAD: 3000,
    ALIEN_LOOKAHEAD: 6000,
    PRUNE_MARGIN: 200,
    REVIVE_CLEAR_DISTANCE: 700,
  };

  var ROCK_SCALES = [1, 1.1, 1.2, 1.3];

  function times(n, fn) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(fn(i));
    return out;
  }

  /**
   * Shapes coins are laid out in, as [dx, dy] offsets from the bottom anchor
   * (negative dy is further ahead). Mirrors CoinPattern.kt in the Android app.
   */
  var COIN_PATTERNS = {
    LINE: { weight: 2, offsets: times(5, function (i) { return [0, -70 * i]; }) },
    // Follows the rocket's own swing: time the thrust to collect it all.
    WAVE: { weight: 1, offsets: times(9, function (i) { return [110 * Math.sin(i * Math.PI / 4), -60 * i]; }) },
    ZIGZAG: { weight: 1, offsets: [0, 1, 2, 1, 0, 1, 2, 1, 0].map(function (step, i) { return [75 * step, -60 * i]; }) },
    DIAMOND: { weight: 1, offsets: [[0, 0], [55, -60], [110, -120], [55, -180], [0, -240], [-55, -180], [-110, -120], [-55, -60]] },
    RING: {
      weight: 1,
      offsets: times(10, function (i) {
        var a = i * 2 * Math.PI / 10;
        return [100 * Math.cos(a), -100 - 100 * Math.sin(a)];
      }),
    },
    // A rainbow arc, open towards the rocket.
    ARC: {
      weight: 1,
      offsets: times(7, function (i) {
        var a = Math.PI - i * Math.PI / 6;
        return [140 * Math.cos(a), -140 * Math.sin(a)];
      }),
    },
    // An arrowhead pointing the way forward.
    CHEVRON: { weight: 1, offsets: times(7, function (i) { return [-120 + 40 * i, -40 * (3 - Math.abs(i - 3))]; }) },
  };
  var PATTERN_NAMES = Object.keys(COIN_PATTERNS);
  PATTERN_NAMES.forEach(function (name) {
    var p = COIN_PATTERNS[name];
    p.minX = Math.min.apply(null, p.offsets.map(function (o) { return o[0]; }));
    p.maxX = Math.max.apply(null, p.offsets.map(function (o) { return o[0]; }));
  });
  var PATTERN_WEIGHT = PATTERN_NAMES.reduce(function (sum, n) { return sum + COIN_PATTERNS[n].weight; }, 0);

  /** Picks a shape for a roll in [0, 1), weighted so straight lines stay the most common. */
  function pickPattern(roll) {
    var r = roll * PATTERN_WEIGHT;
    for (var i = 0; i < PATTERN_NAMES.length; i++) {
      r -= COIN_PATTERNS[PATTERN_NAMES[i]].weight;
      if (r < 0) return PATTERN_NAMES[i];
    }
    return PATTERN_NAMES[PATTERN_NAMES.length - 1];
  }
  var POWER_UPS = ['SHIELD', 'MAGNET', 'DOUBLE_COINS'];

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function rockSize(rock) {
    return C.ROCK_FRAME_W * rock.scale;
  }

  function pickupSize(p) {
    return p.powerUp ? C.POWER_UP_SIZE : C.COIN_SIZE;
  }

  /**
   * @param {object} [options]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @param {function(string): number} [options.powerUpTicks] duration per power-up
   * @param {function(): number} [options.random] returns [0, 1), defaults to Math.random
   */
  function GameWorld(options) {
    options = options || {};
    this.width = options.width || C.WORLD_WIDTH;
    this.height = options.height || C.BASE_HEIGHT;
    this.powerUpTicks = options.powerUpTicks || function () { return C.BASE_POWER_UP_TICKS; };
    this.random = options.random || Math.random;

    this.state = 'RUNNING'; // RUNNING -> CRASHING -> CRASHED
    this.score = 0;
    this.thrusting = false;
    this.revives = 0;
    this.stats = { coins: 0, powerUps: 0, shieldSaves: 0 };
    this.events = [];
    this.crashTicks = 0;

    this.rocketY = this.height - C.ROCKET_BOTTOM_MARGIN;
    this.rocketX = C.ROCKET_CENTER_X;

    this.rocks = [];
    this.aliens = [];
    this.pickups = [];
    this.rocksOffsetY = 0;
    this.aliensOffsetX = 0;
    this.aliensOffsetY = 0;
    this.skyOffset = 0;
    this.activePowerUps = {};
    this.invulnerableTicks = 0;

    this._oscIndex = 1;
    this._intensity = C.START_INTENSITY;
    this._idleTicks = 0;
    this._distance = 0;

    this._spawnX = this._range(200, 400);
    this._spawnY = this._range(150, 250);
    for (var i = 0; i <= 10; i++) {
      this._addRock(i % C.ROCK_FRAMES);
      this._advanceSpawnCursor();
    }
    // A first coin trail high up so new players see what to chase.
    this.addCoinPattern('LINE', this._spawnY + 900);
    this._nextAlienY = this._range(-2000, -1000);
    this._topUpAliens();
    this._updateOscillation();
  }

  GameWorld.prototype = {
    /** Forward-speed multiplier: 1 at the start, ramping to MAX_SPEED with distance. */
    speed: function () {
      return 1 + (C.MAX_SPEED - 1) * Math.min(1, this._distance / C.SPEED_RAMP_SCORE);
    },

    isActive: function (powerUp) {
      return (this.activePowerUps[powerUp] || 0) > 0;
    },

    /** Advances the simulation by one 1/60 s frame. */
    tick: function (holding) {
      this.events = [];
      if (this.state === 'CRASHED') return;
      if (this.state === 'CRASHING') {
        this.crashTicks++;
        if (this.crashTicks >= C.CRASH_DURATION_TICKS) this.state = 'CRASHED';
        return;
      }

      if (this._handleCollisions()) return;

      this._updateOscillation();
      if (this._intensity > C.MIN_INTENSITY) this._intensity -= C.INTENSITY_DECAY;
      this._tickPowerUps();
      this._collectPickups();

      this.thrusting = !!holding;
      if (holding) {
        var s = this.speed();
        this._distance += 0.1 * s;
        this.score = Math.floor(this._distance);
        this.skyOffset += s;
        this.rocksOffsetY += C.ROCK_SPEED * s;
        this.aliensOffsetY += C.ALIEN_SPEED * s;
        this._idleTicks = 0;
        this._topUpRocks();
        this._topUpAliens();
        this._prune();
      } else {
        this._idleTicks++;
        if (this._idleTicks >= C.IDLE_LIMIT_TICKS) this._crash();
      }
    },

    /** Continues a crashed run: clears hazards near the rocket and keeps the score. */
    revive: function () {
      if (this.state !== 'CRASHED') return false;
      var clearAbove = this.rocketY - C.REVIVE_CLEAR_DISTANCE;
      var self = this;
      this.rocks = this.rocks.filter(function (r) { return r.y + self.rocksOffsetY + rockSize(r) <= clearAbove; });
      this.aliens = this.aliens.filter(function (a) { return a.y + self.aliensOffsetY + C.ALIEN_SIZE <= clearAbove; });
      this.state = 'RUNNING';
      this.crashTicks = 0;
      this._idleTicks = 0;
      this.invulnerableTicks = C.INVULNERABLE_TICKS;
      this.revives++;
      return true;
    },

    rocketHitbox: function () {
      return { x: this.rocketX + C.ROCKET_W * 0.2, y: this.rocketY + C.ROCKET_H * 0.1, w: C.ROCKET_W * 0.6, h: C.ROCKET_H * 0.8 };
    },

    rockHitbox: function (rock) {
      var size = rockSize(rock);
      var inset = size * 0.15;
      return { x: rock.x + inset, y: rock.y + this.rocksOffsetY + inset, w: size - inset * 2, h: size - inset * 2 };
    },

    alienX: function () {
      return this.aliensOffsetX + C.ALIEN_LOCAL_X;
    },

    alienHitbox: function (alien) {
      var inset = C.ALIEN_SIZE * 0.2;
      return { x: this.alienX() + inset, y: alien.y + this.aliensOffsetY + inset, w: C.ALIEN_SIZE - inset * 2, h: C.ALIEN_SIZE - inset * 2 };
    },

    pickupBox: function (p) {
      var size = pickupSize(p);
      return { x: p.x, y: p.y + this.rocksOffsetY, w: size, h: size };
    },

    _range: function (min, max) {
      return min + Math.floor(this.random() * (max - min + 1));
    },

    _handleCollisions: function () {
      if (this.invulnerableTicks > 0) {
        this.invulnerableTicks--;
        return false;
      }
      var r = this.rocketHitbox();
      var self = this;
      var rockIndex = this.rocks.findIndex(function (rock) { return overlaps(r, self.rockHitbox(rock)); });
      var alienIndex = rockIndex < 0 ? this.aliens.findIndex(function (a) { return overlaps(r, self.alienHitbox(a)); }) : -1;
      if (rockIndex < 0 && alienIndex < 0) return false;

      if (this.isActive('SHIELD')) {
        if (rockIndex >= 0) this.rocks.splice(rockIndex, 1);
        if (alienIndex >= 0) this.aliens.splice(alienIndex, 1);
        delete this.activePowerUps.SHIELD;
        this.invulnerableTicks = C.INVULNERABLE_TICKS;
        this.stats.shieldSaves++;
        this.events.push({ type: 'shieldBroke' });
        return false;
      }
      this._crash();
      return true;
    },

    _crash: function () {
      this.state = 'CRASHING';
      this.crashTicks = 0;
      this.thrusting = false;
      this.events.push({ type: 'crashed' });
    },

    _tickPowerUps: function () {
      for (var key in this.activePowerUps) {
        this.activePowerUps[key]--;
        if (this.activePowerUps[key] <= 0) delete this.activePowerUps[key];
      }
    },

    _collectPickups: function () {
      var r = this.rocketHitbox();
      var magnet = this.isActive('MAGNET');
      var cx = r.x + r.w / 2;
      var cy = r.y + r.h / 2;
      var kept = [];
      for (var i = 0; i < this.pickups.length; i++) {
        var p = this.pickups[i];
        var size = pickupSize(p);
        if (magnet && !p.powerUp) {
          var px = p.x + size / 2;
          var py = p.y + this.rocksOffsetY + size / 2;
          var dist = Math.hypot(cx - px, cy - py);
          if (dist < C.MAGNET_RADIUS && dist > 1) {
            var pull = Math.min(C.MAGNET_PULL, dist) / dist;
            p.x += (cx - px) * pull;
            p.y += (cy - py) * pull;
          }
        }
        if (!overlaps(r, this.pickupBox(p))) {
          kept.push(p);
          continue;
        }
        if (!p.powerUp) {
          var amount = this.isActive('DOUBLE_COINS') ? 2 : 1;
          this.stats.coins += amount;
          this.events.push({ type: 'coin', amount: amount });
        } else {
          this.activePowerUps[p.powerUp] = this.powerUpTicks(p.powerUp);
          this.stats.powerUps++;
          this.events.push({ type: 'powerUp', powerUp: p.powerUp });
        }
      }
      this.pickups = kept;
    },

    // oscillation() and oscillation40() in the original shared one counter, so
    // the rocket reads the odd steps and the aliens read the even ones.
    _updateOscillation: function () {
      this.rocketX = C.ROCKET_CENTER_X + Math.trunc(C.ROCKET_AMPLITUDE * Math.sin(this._oscIndex / this._intensity));
      this._oscIndex++;
      this.aliensOffsetX = C.ALIEN_CENTER_X + Math.trunc(C.ALIEN_AMPLITUDE * Math.sin(this._oscIndex / C.ALIEN_PERIOD));
      this._oscIndex++;
    },

    // The original spawned 3 rocks every 50 thrust frames, but its spawn cursor
    // climbed faster than the player flew, so rocks piled up ahead forever.
    // Filling a fixed distance ahead keeps the same density with bounded memory.
    _topUpRocks: function () {
      while (this._spawnY + this.rocksOffsetY > -C.ROCK_LOOKAHEAD) this._spawnBatch();
    },

    _spawnBatch: function () {
      var bandBottom = this._spawnY;
      for (var i = 0; i < 3; i++) {
        this._advanceSpawnCursor();
        this._addRock(this._range(0, 64) % C.ROCK_FRAMES);
      }
      if (this.random() < C.COIN_TRAIL_CHANCE) this.addCoinPattern(pickPattern(this.random()), bandBottom);
      if (this.random() < C.POWER_UP_CHANCE) {
        var kind = POWER_UPS[Math.floor(this.random() * POWER_UPS.length)];
        var x = this._range(60, 790);
        var y = this._range(Math.round(this._spawnY), Math.round(bandBottom));
        if (this._isClear(x, y, C.POWER_UP_SIZE)) this.pickups.push({ x: x, y: y, powerUp: kind });
      }
    },

    /**
     * Lays out a coin pattern with its bottom at `bottom`, at a random x where
     * the whole shape fits on screen, skipping coins that would sit on a rock.
     */
    addCoinPattern: function (name, bottom, originX) {
      var pattern = COIN_PATTERNS[name];
      var left = C.COIN_MARGIN - pattern.minX;
      var right = this.width - C.COIN_MARGIN - C.COIN_SIZE - pattern.maxX;
      var x0 = originX != null ? originX : this._range(Math.floor(left), Math.floor(Math.max(left, right)));
      for (var i = 0; i < pattern.offsets.length; i++) {
        var x = x0 + pattern.offsets[i][0];
        var y = bottom + pattern.offsets[i][1];
        if (this._isClear(x, y, C.COIN_SIZE)) this.pickups.push({ x: x, y: y, powerUp: null });
      }
    },

    _isClear: function (x, y, size) {
      var margin = 20;
      var box = { x: x - margin, y: y - margin, w: size + margin * 2, h: size + margin * 2 };
      return !this.rocks.some(function (r) {
        var s = rockSize(r);
        return overlaps(box, { x: r.x, y: r.y, w: s, h: s });
      });
    },

    _addRock: function (frame) {
      var scale = ROCK_SCALES[Math.floor(this.random() * ROCK_SCALES.length)];
      this.rocks.push({ x: this._spawnX, y: this._spawnY, frame: frame, scale: scale });
    },

    _advanceSpawnCursor: function () {
      this._spawnX += this._range(200, 450);
      if (this._spawnX > 570) this._spawnX -= this._range(400, 550);
      this._spawnY -= this._range(250, 425);
    },

    _topUpAliens: function () {
      while (this._nextAlienY + this.aliensOffsetY > -C.ALIEN_LOOKAHEAD) {
        this.aliens.push({ y: this._nextAlienY });
        this._nextAlienY -= this._range(2000, 5000);
      }
    },

    _prune: function () {
      var limit = this.height + C.PRUNE_MARGIN;
      var self = this;
      this.rocks = this.rocks.filter(function (r) { return r.y + self.rocksOffsetY <= limit; });
      this.aliens = this.aliens.filter(function (a) { return a.y + self.aliensOffsetY <= limit; });
      this.pickups = this.pickups.filter(function (p) { return p.y + self.rocksOffsetY <= limit; });
    },
  };

  /** Hangar upgrades: each level makes a power-up last longer. */
  var Upgrades = {
    MAX_LEVEL: 5,
    durationTicks: function (level) {
      return (6 + 2 * Math.max(0, Math.min(Upgrades.MAX_LEVEL, level))) * 60;
    },
    /** Coins to reach the next level, or null when maxed. */
    cost: function (level) {
      return level >= Upgrades.MAX_LEVEL ? null : 100 * Math.pow(2, level);
    },
    /** Coin price to continue a crashed run, doubling with each use in one run. */
    reviveCost: function (revivesSoFar) {
      return 100 * Math.pow(2, Math.min(4, revivesSoFar));
    },
    title: { SHIELD: 'Shield', MAGNET: 'Coin Magnet', DOUBLE_COINS: '2x Coins' },
    description: { SHIELD: 'Absorbs one hit', MAGNET: 'Pulls nearby coins in', DOUBLE_COINS: 'Every coin counts twice' },
  };

  return {
    GameWorld: GameWorld,
    Upgrades: Upgrades,
    POWER_UPS: POWER_UPS,
    COIN_PATTERNS: COIN_PATTERNS,
    pickPattern: pickPattern,
    C: C,
    overlaps: overlaps,
  };
});
