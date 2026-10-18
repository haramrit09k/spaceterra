/* global game */
(function (global) {
  function goFull() {
    if (game.scale.isFullScreen) {
      game.scale.stopFullScreen();
    } else {
      game.scale.startFullScreen(false);
    }
  }

  function mute() {
    game.sound.mute = !game.sound.mute;
    if (global.UI) global.UI.syncCornerButtons();
  }

  function back() {
    game.sound.stopAll();
    game.state.start('gameState1');
  }

  function instruct() {
    game.state.start('gameState5');
  }

  function actionOnClick() {
    game.state.start('gameState2');
  }

  function retry() {
    game.state.start('gameState2');
  }

  function leaderBoard() {
    game.state.start('gameState4');
  }

  function hangar() {
    game.state.start('gameState6');
  }

  global.goFull = goFull;
  global.mute = mute;
  global.back = back;
  global.instruct = instruct;
  global.actionOnClick = actionOnClick;
  global.retry = retry;
  global.leaderBoard = leaderBoard;
  global.hangar = hangar;
})(this);
