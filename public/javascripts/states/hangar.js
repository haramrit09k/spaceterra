/* global game, UI, Progress, SpaceTerraWorld */
(function (global) {
  /************************HANGAR PAGE************************/
  // Spend coins to make power-ups last longer. Levels are capped, so this
  // never needs new content.

  var Upgrades = SpaceTerraWorld.Upgrades;

  function preload6() {
    UI.preloadCommon();
  }

  function create6() {
    UI.backdrop(0.25);
    UI.addCornerButtons.call(this);
    UI.text(game.width / 2, 55, 'HANGAR', 52, UI.YELLOW, 0.5);
    var coin = game.add.sprite(game.width / 2 - 20, 108, UI.coinTexture());
    coin.anchor.setTo(1, 0.5);
    coin.scale.setTo(0.8);
    this.balance = UI.text(game.width / 2 - 10, 108, '', 30, UI.YELLOW, 0);
    this.rows = [];

    var self = this;
    SpaceTerraWorld.POWER_UPS.forEach(function (kind, i) {
      var top = 150 + i * 160;
      var panel = game.add.graphics(0, 0);
      panel.lineStyle(2, 0xffffff, 0.5);
      panel.beginFill(0x101a55, 0.75);
      panel.drawRoundedRect(60, top, 780, 140, 16);
      panel.endFill();
      var icon = game.add.sprite(130, top + 70, UI.powerUpTexture(kind));
      icon.anchor.setTo(0.5, 0.5);
      icon.scale.setTo(1.3);
      UI.text(210, top + 35, Upgrades.title[kind], 30, UI.YELLOW);
      UI.text(210, top + 75, Upgrades.description[kind], 20, '#fff', 0, false);
      var duration = UI.text(210, top + 108, '', 20, '#B0C4FF', 0, false);
      var pips = game.add.graphics(0, 0);
      var button = UI.pill(705, top + 92, 230, 60, '', function () { self.buy(kind); }, self, 24);
      self.rows.push({ kind: kind, top: top, duration: duration, pips: pips, button: button });
    });

    UI.addNavButtons(675, global.back);
    this.refresh();
  }

  global.States = global.States || {};
  global.States.gameState6 = {
    preload: preload6,
    create: create6,
    update: function () { UI.syncCornerButtons(); },

    buy: function (kind) {
      var level = Progress.upgradeLevel(kind);
      if (Progress.upgrade(kind, Upgrades.cost(level))) this.refresh();
    },

    refresh: function () {
      this.balance.text = String(Progress.coins);
      this.rows.forEach(function (row) {
        var level = Progress.upgradeLevel(row.kind);
        var cost = Upgrades.cost(level);
        row.duration.text = Upgrades.durationTicks(level) / 60 + ' seconds';
        row.button.label.text = cost == null ? 'MAX' : 'Upgrade ' + cost;
        row.button.alpha = cost == null || cost > Progress.coins ? 0.6 : 1;
        row.pips.clear();
        for (var i = 0; i < Upgrades.MAX_LEVEL; i++) {
          row.pips.beginFill(i < level ? 0xF8E22E : 0xffffff, i < level ? 1 : 0.3);
          row.pips.drawRoundedRect(600 + i * 42, row.top + 22, 32, 14, 5);
          row.pips.endFill();
        }
      });
    },
  };
})(this);
