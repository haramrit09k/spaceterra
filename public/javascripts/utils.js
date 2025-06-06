(function(global){
  function goFull(){
    if (game.scale.isFullScreen) {
      game.scale.stopFullScreen();
    } else {
      game.scale.startFullScreen(false);
    }
  }

  function mute(){
    if (game.sound.mute) {
      game.sound.mute = false;
      muteButton.frame = 1;
    } else {
      game.sound.mute = true;
      muteButton.frame = 0;
    }
  }

  function back(){
    game.state.start('gameState1');
    score = 0;
    game.sound.stopAll();
  }

  function instruct(){
    game.state.start('gameState5');
  }

  function actionOnClick(){
    game.state.start('gameState2');
  }

  function pauseGame(){
    if (!game.paused) {
      game.paused = true;
      pause_button.tint = 16310830;
      text = game.add.text(game.world.width / 2, game.world.height / 2, 'Click anywhere to resume', { fontSize: '32px', fill: '#F8E22E' });
      text.anchor.setTo(0.5, 0.5);
    } else {
      game.paused = false;
      pause_button.tint = 16777215;
      text.kill();
    }
    game.input.onDown.add(function () {
      if (game.paused) game.paused = false;
      pause_button.tint = 16777215;
      text.kill();
    }, this);
  }

  function retry(){
    score = 0;
    game.state.start('gameState2');
  }

  function leaderBoard(){
    game.state.start('gameState4');
  }

  function collisionHandler(rocket, obstacle){
    setTimeout(function(){
      game.state.start('gameState3', score);
    }, 750);
    blast = game.add.sprite(rocket.x, rocket.y, 'blast');
    blast.scale.setTo(0.17, 0.17);
    blast.animations.add('blastHim', [0,1,2,3,4,5,6,7,8], 10, true);
    rocket.kill();
    blast.animations.play('blastHim');
    var music1 = game.add.audio('boom');
    music1.play();
    game.camera.shake();
  }

  function calcSin(amp, osc, sinD){
    return amp * Math.sin(osc / sinD);
  }

  function oscillation(intensity){
    var y = rocket.y;
    startx = 300;
    if (oscIndex === 10000000000) oscIndex = 1;
    var sin = calcSin(390, oscIndex, intensity);
    rocket.x = 420 + parseInt(sin);
    y = y - 3;
    oscIndex++;
  }

  function oscillation40(){
    var y = aliens.y;
    startx = 30;
    if (oscIndex === 10000000000) oscIndex = 1;
    var sin = calcSin(300, oscIndex, 80);
    aliens.x = 80 + parseInt(sin);
    y = y - 2;
    oscIndex++;
  }

  global.goFull = goFull;
  global.mute = mute;
  global.back = back;
  global.instruct = instruct;
  global.actionOnClick = actionOnClick;
  global.pauseGame = pauseGame;
  global.retry = retry;
  global.leaderBoard = leaderBoard;
  global.collisionHandler = collisionHandler;
  global.calcSin = calcSin;
  global.oscillation = oscillation;
  global.oscillation40 = oscillation40;
})(this);
