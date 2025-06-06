(function (global) {
function preload4() {
    game.load.image('backButton', 'assets/home.png');
    game.load.image('home', 'assets/leaderboard2.png');
};
function create4() {

    var ig = game.add.sprite(-220, -20, 'home');
    ig.scale.setTo(0.7, 0.75);
    var tex = game.add.text(300, 60, 'LEADERBOARD', { font: ' bold 48px Impact', fill: '#F8E22E' });
    backButton = game.add.button(400, 660, 'backButton', back, this);
    backButton.scale.setTo(0.7, 0.7);
    var text99 = game.add.text(430, 670 + 70, 'Main Menu', { fontSize: '24px', fill: '#F8E22E' });
    text99.anchor.setTo(0.5, 0.5);

    socket.emit('fetch_score');

    rec_score();
};


function update4() {
};


/************************DEFINED FUNCTIONS************************/



var collisionHandler = function collisionHandler(rocket, obstacle) {

    setTimeout(function () {
        game.state.start('gameState3', score);
    }, 750); //PAUSE BEFORE BLASTING ANIMATION STARTS. (KEEP 0)
    blast = game.add.sprite(rocket.x, rocket.y, 'blast');
    blast.scale.setTo(0.17, 0.17);
    blast.animations.add('blastHim', [0, 1, 2, 3, 4, 5, 6, 7, 8], 10, true);
    rocket.kill();
    blast.animations.play('blastHim');
    var music1 = game.add.audio('boom');
    music1.play();
    game.camera.shake();


};
//Function to calculate sine value
var calcSin = function calcSin(amp, osc, sinD) {
    return amp * Math.sin(osc / sinD);
};
//Oscillation function defined separately to oscillate the particle
var oscillation = function oscillation(intensity) {
    var y = rocket.y;
    startx = 300;
    if (oscIndex === 10000000000) oscIndex = 1;
    var sin = calcSin(390, oscIndex, intensity);
    rocket.x = 420 + parseInt(sin);
    y = y - 3;

    oscIndex++;
};

var oscillation40 = function oscillation40() {
    var y = aliens.y;
    startx = 30;
    if (oscIndex === 10000000000) oscIndex = 1;

    var sin = calcSin(300, oscIndex, 80);
    aliens.x = 80 + parseInt(sin);
    y = y - 2;

    oscIndex++;
};

function goFull() {

    if (game.scale.isFullScreen) {
        game.scale.stopFullScreen();
    }

    else {
        game.scale.startFullScreen(false);
    }
}

function mute() {
    if (game.sound.mute) {
        game.sound.mute = false;
        muteButton.frame = 1;
    }

    else {

        game.sound.mute = true;
        muteButton.frame = 0;
    }
}

function back() {
    game.state.start('gameState1');
    score = 0;
    game.sound.stopAll();
}

function instruct() {
    game.state.start('gameState5');
}

function actionOnClick() {
    game.state.start('gameState2');
}

function pauseGame() {
    if (!game.paused) {
        game.paused = true;
        pause_button.tint = 16310830;
        text = game.add.text(game.world.width / 2, game.world.height / 2, 'Click anywhere to resume', { fontSize: '32px', fill: '#F8E22E' });
        text.anchor.setTo(0.5, 0.5);
    }
    else {
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

function retry() {
    score = 0;
    game.state.start('gameState2');
}

function leaderBoard() {
    game.state.start('gameState4');
}


/************************INSTRUCTIONS PAGE************************/


global.States = global.States || {};
global.States.gameState4 = {
    preload: preload4,
    create: create4,
    update: update4
};

})(this);
