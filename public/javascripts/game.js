/* global Phaser, States, io */
var game = new Phaser.Game(900, 768, Phaser.CANVAS);
// Run game logic in fixed 1/60 s steps so the game plays at the same speed on
// 60 Hz, 120 Hz and 144 Hz screens.
game.forceSingleUpdate = false;
if (game.time) game.time.desiredFps = 60;

var username; // Google display name when signed in, otherwise a guest
var lastRun; // { score, coins, newBest } handed from gameplay to game over

var socket = io(window.CONFIG.origin, { withCredentials: true });

game.state.add('gameState1', States.gameState1);
game.state.add('gameState2', States.gameState2);
game.state.add('gameState3', States.gameState3);
game.state.add('gameState4', States.gameState4);
game.state.add('gameState5', States.gameState5);
game.state.add('gameState6', States.gameState6);

// Canvas text needs the Goldman font loaded before the first screen draws it.
(function startWhenFontsReady() {
  var started = false;
  function start() {
    if (started) return;
    started = true;
    game.state.start('gameState1');
  }
  var fonts = typeof document !== 'undefined' && document.fonts;
  if (fonts && fonts.load) {
    Promise.all([fonts.load('bold 32px Goldman'), fonts.load('32px Goldman')]).then(start, start);
    setTimeout(start, 3000);
  } else {
    start();
  }
})();
