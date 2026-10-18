/* global Phaser, game, socket, UI, Progress */
(function (global) {
  /************************GAME-OVER PAGE************************/

  function preload3() {
    UI.preloadCommon();
  }

  function create3() {
    var run = global.lastRun || { score: 0, coins: 0, newBest: false };
    UI.backdrop();
    UI.addCornerButtons.call(this);
    game.input.keyboard.addKey(Phaser.Keyboard.R).onDown.add(global.retry);

    UI.text(game.width / 2, 55, 'YOUR SCORE : ' + run.score, 44, UI.YELLOW, 0.5);
    UI.text(game.width / 2, 105, run.newBest ? 'New personal best!' : 'Best: ' + Progress.best, 24, '#fff', 0.5);
    var coinLine = UI.text(game.width / 2 + 22, 148, '+' + run.coins + '  (bank: ' + Progress.coins + ')', 26, UI.YELLOW, 0.5);
    var coin = game.add.sprite(coinLine.x - coinLine.width / 2 - 12, 148, UI.coinTexture());
    coin.anchor.setTo(1, 0.5);
    coin.scale.setTo(0.7);

    var table = UI.leaderboardTable(190, global.username);
    this.onRecScore = function (response) { table.setEntries(response || []); };
    socket.on('rec_score', this.onRecScore);
    // Zero-point runs are not worth a leaderboard row.
    if (run.score > 0) socket.emit('send_score', { username: global.username, score: run.score });
    else socket.emit('fetch_score');

    UI.addNavButtons(675, global.back, global.retry);
  }

  function update3() {
    UI.syncCornerButtons();
  }

  global.States = global.States || {};
  global.States.gameState3 = {
    preload: preload3,
    create: create3,
    update: update3,
    shutdown: function () {
      socket.off('rec_score', this.onRecScore);
    },
  };
})(this);
