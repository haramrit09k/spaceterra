/* global game, UI */
(function (global) {
  /************************INSTRUCTIONS PAGE************************/

  function preload5() {
    UI.preloadCommon();
    game.load.spritesheet('rocket', 'assets/spaceship1.png', 100, 150);
    game.load.spritesheet('ast', 'assets/asteroid1.png', 72, 70);
    game.load.spritesheet('alien', 'assets/alien_spritesheet.png', 278, 275);
    game.load.spritesheet('tap-mobile', 'assets/finger-tap-sp.png', 782, 998);
  }

  function line(y, value) {
    var t = game.add.text(230, y, value, UI.style(21, UI.YELLOW, false));
    t.anchor.setTo(0, 0.5);
    t.wordWrap = true;
    t.wordWrapWidth = 600;
    return t;
  }

  function create5() {
    UI.backdrop(0.35);
    UI.addCornerButtons.call(this);
    UI.text(game.width / 2, 60, 'HOW TO PLAY', 48, UI.YELLOW, 0.5);

    var rocket = game.add.sprite(130, 178, 'rocket', 3);
    rocket.anchor.setTo(0.5, 0.5);
    rocket.scale.setTo(0.45);
    line(178, 'Your rocket swings from side to side on its own. Steer through the gaps.');

    var finger = game.add.sprite(130, 256, 'tap-mobile');
    finger.anchor.setTo(0.5, 0.5);
    finger.scale.setTo(0.075);
    finger.animations.add('tap');
    finger.animations.play('tap', 1, true);
    line(256, 'Hold the UP arrow or SPACE to fly forward. On phones, touch and hold.');

    var rock = game.add.sprite(105, 334, 'ast', 2);
    rock.anchor.setTo(0.5, 0.5);
    rock.scale.setTo(0.8);
    var alien = game.add.sprite(160, 334, 'alien');
    alien.anchor.setTo(0.5, 0.5);
    alien.scale.setTo(0.22);
    alien.animations.add('spin', [0, 1, 2], 10, true);
    alien.animations.play('spin');
    line(334, 'Dodge the asteroids and beware of the aliens! You get faster the further you fly.');

    var coin = game.add.sprite(130, 412, UI.coinTexture());
    coin.anchor.setTo(0.5, 0.5);
    line(412, 'Grab coins and spend them in the Hangar, or to keep flying after a crash.');

    ['SHIELD', 'MAGNET', 'DOUBLE_COINS'].forEach(function (kind, i) {
      var icon = game.add.sprite(85 + i * 45, 490, UI.powerUpTexture(kind));
      icon.anchor.setTo(0.5, 0.5);
      icon.scale.setTo(0.65);
    });
    line(490, 'Power-ups: a shield that takes one hit, a coin magnet and 2x coins.');

    line(566, 'Stay still for 5 seconds and the rocket explodes.');
    UI.text(game.width / 2, 625, 'P pause    F fullscreen    M mute    R retry', 22, '#fff', 0.5);

    UI.addNavButtons(690, global.back);
  }

  global.States = global.States || {};
  global.States.gameState5 = {
    preload: preload5,
    create: create5,
    update: function () { UI.syncCornerButtons(); },
  };
})(this);
