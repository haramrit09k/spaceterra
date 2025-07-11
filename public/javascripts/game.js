/* global Phaser */
var game = new Phaser.Game(900, 768, Phaser.CANVAS);
var score = 0, music, game, rocket, sky, obstacle, cursors, i, x, y, obstacles, startx;
var alien, aliens;
var text1, text;
var oscIndex = 1;
var style;
var scoreText, scoreY = 7;
var distance = 0;
var pause_button;
var fullButton, muteButton;
var username;
var statsText;
var leader;
var video, button, sprite, logoimg;
var time, tempY;
var intensity;
var blastHim;
var blast;
var oscIndexNew = 0;
var exist = 0;
var counts = 0;
var point = 0;
var seconds, minutes;
var scaleFactor = [1, 1.1, 1.2, 1.3]; // for obstacles
var text1, text2, text3, text4, text5, text6, text7, text8, text9;
var scale1;

// var url = 'http://localhost:3008'; //dev
// var url = 'https://spaceterra.herokuapp.com'; //prod
var url = window.CONFIG.origin;

var socket = io(url, { withCredentials: true });
if (socket !== undefined) {
    console.log('Socket connection established...');
}

game.state.add('gameState1', States.gameState1);
game.state.add('gameState2', States.gameState2);
game.state.add('gameState3', States.gameState3);
game.state.add('gameState4', States.gameState4);
game.state.add('gameState5', States.gameState5);

game.state.start('gameState1');
