/* global Phaser, game, UI, Progress, SpaceTerraWorld */
(function (global) {
  /************************MAIN GAME************************/
  // Rules live in world.js; this state only draws them and handles input.

  var W = SpaceTerraWorld;
  var C = W.C;
  var REVIVE_OFFER_TICKS = 6 * 60;

  function preload2() {
    UI.preloadCommon();
    game.load.spritesheet('rocket', 'assets/spaceship1.png', 100, 150);
    game.load.spritesheet('ast', 'assets/asteroid1.png', 72, 70);
    game.load.image('sky', 'assets/sky5.jpg');
    game.load.image('pause_button', 'assets/pause.png');
    game.load.spritesheet('blast', 'assets/flame_hit.png', 512, 512);
    game.load.spritesheet('alien', 'assets/alien_spritesheet.png', 278, 275);
    game.load.audio('boom', 'media/explosion.ogg');
  }

  /** Reuses sprites by index so long runs never allocate without bound. */
  function Pool(group, key) {
    this.group = group;
    this.key = key;
    this.sprites = [];
  }
  Pool.prototype.sync = function (items, place) {
    for (var i = 0; i < items.length; i++) {
      var s = this.sprites[i];
      if (!s) {
        s = this.group.create(0, 0, this.key);
        this.sprites.push(s);
      }
      s.visible = true;
      place(s, items[i]);
    }
    for (var j = items.length; j < this.sprites.length; j++) this.sprites[j].visible = false;
  };

  function create2() {
    var self = this;
    game.physics.startSystem(Phaser.Physics.ARCADE);

    this.world2 = new W.GameWorld({
      powerUpTicks: function (kind) { return W.Upgrades.durationTicks(Progress.upgradeLevel(kind)); },
    });
    this.tick = 0;
    this.phase = 'PLAYING';
    this.finished = false;

    this.sky = game.add.tileSprite(0, 0, game.width, game.height, 'sky');
    this.layer = game.add.group();
    this.pickupLayer = game.add.group(this.layer);
    this.rockLayer = game.add.group(this.layer);
    this.alienLayer = game.add.group(this.layer);
    this.pickups = new Pool(this.pickupLayer, UI.coinTexture());
    this.rocks = new Pool(this.rockLayer, 'ast');
    this.aliens = new Pool(this.alienLayer, 'alien');

    this.shield = game.add.sprite(0, 0, UI.powerUpTexture('SHIELD'));
    this.shield.anchor.setTo(0.5, 0.5);
    this.shield.width = this.shield.height = 110;
    this.rocket = game.add.sprite(0, 0, 'rocket');
    this.rocket.scale.setTo(0.4, 0.4);
    this.blast = game.add.sprite(0, 0, 'blast');
    this.blast.scale.setTo(0.17, 0.17);
    this.blast.animations.add('blastHim', [0, 1, 2, 3, 4, 5, 6, 7, 8], 10, true);
    this.blast.visible = false;
    this.boom = game.add.audio('boom');

    // HUD
    this.scoreText = UI.text(30, 45, 'SCORE: 0', 34);
    var coin = game.add.sprite(230, 90, UI.coinTexture());
    coin.anchor.setTo(0, 0.5);
    coin.scale.setTo(0.7);
    this.coinText = UI.text(270, 90, '0', 26);
    UI.addCornerButtons.call(this);
    global.fullButton.y = 130;
    global.muteButton.y = 120;
    this.pauseButton = game.add.button(700, 80, 'pause_button', function () { self.togglePause(); }, this);
    this.pauseButton.scale.setTo(0.6, 0.6);
    this.powerUpIcons = {};
    W.POWER_UPS.forEach(function (kind, i) {
      var icon = game.add.sprite(330 + i * 60, 90, UI.powerUpTexture(kind));
      icon.anchor.setTo(0, 0.5);
      icon.scale.setTo(0.7);
      self.powerUpIcons[kind] = icon;
    });
    this.timerBars = game.add.graphics(0, 0);
    this.toast = UI.text(game.width / 2, 190, '', 34, UI.YELLOW, 0.5);
    this.toastTicks = 0;

    this.overlay = game.add.group();

    this.cursors = game.input.keyboard.createCursorKeys();
    this.space = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    game.input.keyboard.addKeyCapture([Phaser.Keyboard.UP, Phaser.Keyboard.SPACEBAR]);
    game.input.keyboard.addKey(Phaser.Keyboard.P).onDown.add(function () { self.togglePause(); });
    game.input.keyboard.addKey(Phaser.Keyboard.R).onDown.add(function () { if (self.phase === 'OFFER_REVIVE') self.finishRun(); });

    this.render2();
  }

  function update2() {
    UI.syncCornerButtons();
    if (this.toastTicks > 0) this.toastTicks--;
    this.toast.alpha = Math.min(1, this.toastTicks / 20);
    if (this.phase === 'OFFER_REVIVE') {
      this.offerTicks++;
      this.countdown.text = 'Keep flying? ' + Math.ceil((REVIVE_OFFER_TICKS - this.offerTicks) / 60);
      if (this.offerTicks >= REVIVE_OFFER_TICKS) this.finishRun();
      return;
    }
    if (this.phase !== 'PLAYING') return;

    this.tick++;
    var w = this.world2;
    // Desktop: UP arrow (the original control) or Space. Phones: touch and hold.
    var touch = [game.input.pointer1, game.input.pointer2].some(function (p) {
      return p && p.isDown && !this.pointerOnHud(p);
    }, this);
    var holding = this.cursors.up.isDown || this.space.isDown || touch;
    w.tick(holding);

    for (var i = 0; i < w.events.length; i++) {
      var e = w.events[i];
      if (e.type === 'crashed') this.onCrash();
      else if (e.type === 'shieldBroke') this.showToast('Shield saved you!');
      else if (e.type === 'powerUp') this.showToast(W.Upgrades.title[e.powerUp] + '!');
    }

    if (w.state === 'CRASHED') {
      if (this.coinsAvailable() >= W.Upgrades.reviveCost(w.revives)) this.offerRevive();
      else this.finishRun();
    }
    this.render2();
  }

  global.States = global.States || {};
  global.States.gameState2 = {
    preload: preload2,
    create: create2,
    update: update2,

    render2: function () {
      var w = this.world2;
      var t = this.tick;
      this.sky.tilePosition.y = w.skyOffset;

      this.pickups.sync(w.pickups, function (s, p) {
        // Sprites are reused by index, so a coin sprite may now show a power-up.
        var key = p.powerUp ? UI.powerUpTexture(p.powerUp) : UI.coinTexture();
        if (s.key !== key) s.loadTexture(key);
        var size = p.powerUp ? C.POWER_UP_SIZE : C.COIN_SIZE;
        s.anchor.setTo(0.5, 0.5);
        s.x = p.x + size / 2;
        s.y = p.y + w.rocksOffsetY + size / 2;
        var base = size / s.texture.width;
        if (p.powerUp) s.scale.setTo(base * (1 + 0.06 * Math.sin(t / 8)));
        else s.scale.setTo(base * (0.55 + 0.45 * Math.abs(Math.cos(t / 14))), base);
      });
      this.rocks.sync(w.rocks, function (s, rock) {
        s.frame = rock.frame;
        s.scale.setTo(rock.scale);
        s.x = rock.x;
        s.y = rock.y + w.rocksOffsetY;
      });
      var alienFrame = Math.floor(t / 6) % 3;
      this.aliens.sync(w.aliens, function (s, alien) {
        s.frame = alienFrame;
        s.scale.setTo(0.3);
        s.x = w.alienX();
        s.y = alien.y + w.aliensOffsetY;
      });

      var running = w.state === 'RUNNING';
      var blinking = w.invulnerableTicks > 0 && Math.floor(w.invulnerableTicks / 5) % 2 === 0;
      this.rocket.visible = running && !blinking;
      this.rocket.frame = w.thrusting ? 3 : 0;
      this.rocket.x = w.rocketX;
      this.rocket.y = w.rocketY;
      this.shield.visible = this.rocket.visible && w.isActive('SHIELD');
      this.shield.x = w.rocketX + C.ROCKET_W / 2;
      this.shield.y = w.rocketY + C.ROCKET_H / 2;

      this.scoreText.text = 'SCORE: ' + w.score;
      this.coinText.text = String(w.stats.coins);
      this.timerBars.clear();
      for (var kind in this.powerUpIcons) {
        var left = w.activePowerUps[kind] || 0;
        var icon = this.powerUpIcons[kind];
        icon.visible = left > 0;
        if (left > 0) {
          var total = W.Upgrades.durationTicks(Progress.upgradeLevel(kind));
          this.timerBars.beginFill(0xffffff, 0.4);
          this.timerBars.drawRect(icon.x, 120, 45, 6);
          this.timerBars.beginFill(parseInt(UI.POWER_UP_COLORS[kind].slice(1), 16), 1);
          this.timerBars.drawRect(icon.x, 120, 45 * Math.min(1, left / total), 6);
          this.timerBars.endFill();
        }
      }
    },

    pointerOnHud: function (pointer) {
      return pointer.y < 160 && (pointer.x < 220 || pointer.x > 680);
    },

    coinsAvailable: function () {
      return Progress.coins + this.world2.stats.coins;
    },

    showToast: function (message) {
      this.toast.text = message;
      this.toastTicks = 90;
    },

    onCrash: function () {
      this.boom.play();
      game.camera.shake(0.02, 400);
      this.blast.x = this.world2.rocketX;
      this.blast.y = this.world2.rocketY;
      this.blast.visible = true;
      this.blast.animations.play('blastHim');
    },

    togglePause: function () {
      if (this.phase === 'PLAYING') {
        this.phase = 'PAUSED';
        this.pauseText = UI.text(game.width / 2, game.height / 2, 'PAUSED: press P or click to resume', 32, UI.YELLOW, 0.5);
        var self = this;
        this.resumeOnClick = function () { if (self.phase === 'PAUSED') self.togglePause(); };
        // Wait a frame so the click that paused does not resume straight away.
        game.time.events.add(100, function () { game.input.onDown.addOnce(self.resumeOnClick); });
      } else if (this.phase === 'PAUSED') {
        this.phase = 'PLAYING';
        if (this.pauseText) this.pauseText.destroy();
        game.input.onDown.remove(this.resumeOnClick);
      }
    },

    offerRevive: function () {
      var self = this;
      var w = this.world2;
      this.phase = 'OFFER_REVIVE';
      this.offerTicks = 0;
      var cost = W.Upgrades.reviveCost(w.revives);
      var shade = game.add.graphics(0, 0, this.overlay);
      shade.beginFill(0x000000, 0.65);
      shade.drawRect(0, 0, game.width, game.height);
      shade.beginFill(0x101a55, 0.9);
      shade.lineStyle(4, 0xF8E22E, 1);
      shade.drawRoundedRect(150, 190, 600, 400, 28);
      shade.endFill();
      this.overlay.add(UI.text(450, 250, 'CRASHED!', 56, UI.YELLOW, 0.5));
      this.overlay.add(UI.text(450, 310, 'Score: ' + w.score, 32, '#fff', 0.5));
      this.countdown = UI.text(450, 360, '', 28, '#fff', 0.5);
      this.overlay.add(this.countdown);
      this.overlay.add(UI.pill(450, 440, 460, 76, 'Continue for ' + cost + ' coins', function () { self.reviveWithCoins(cost); }, this, 28));
      var no = UI.text(450, 530, 'No thanks', 26, '#fff', 0.5);
      no.inputEnabled = true;
      no.events.onInputUp.add(function () { self.finishRun(); });
      this.overlay.add(no);
    },

    reviveWithCoins: function (cost) {
      var w = this.world2;
      if (this.phase !== 'OFFER_REVIVE') return;
      Progress.bankCoins(w.stats.coins);
      w.stats.coins = 0;
      if (!Progress.spend(cost) || !w.revive()) return this.finishRun();
      this.overlay.removeAll(true);
      this.blast.visible = false;
      this.phase = 'PLAYING';
      this.togglePause();
    },

    finishRun: function () {
      if (this.finished) return;
      this.finished = true;
      var w = this.world2;
      var newBest = Progress.recordRun(w.score, w.stats.coins);
      global.lastRun = { score: w.score, coins: w.stats.coins, newBest: newBest };
      game.state.start('gameState3');
    },

    shutdown: function () {
      if (this.resumeOnClick) game.input.onDown.remove(this.resumeOnClick);
    },
  };
})(this);
