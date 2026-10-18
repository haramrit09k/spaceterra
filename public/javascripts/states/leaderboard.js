/* global game, socket, UI */
(function (global) {
  /************************LEADERBOARD PAGE************************/

  function preload4() {
    UI.preloadCommon();
  }

  function create4() {
    UI.backdrop();
    UI.addCornerButtons.call(this);
    UI.text(game.width / 2, 100, 'LEADERBOARD', 46, UI.YELLOW, 0.5);
    var table = UI.leaderboardTable(185, global.username);
    this.onRecScore = function (data) { table.setEntries(data || []); };
    socket.on('rec_score', this.onRecScore);
    socket.emit('fetch_score');
    UI.addNavButtons(675, global.back);
  }

  global.States = global.States || {};
  global.States.gameState4 = {
    preload: preload4,
    create: create4,
    update: function () { UI.syncCornerButtons(); },
    shutdown: function () {
      socket.off('rec_score', this.onRecScore);
    },
  };
})(this);
