(function (global) {
function preload3() {

    game.load.image('backButton', 'assets/home.png');
    game.load.image('retryButton', 'assets/return.png');
    game.load.spritesheet('muteButton', 'assets/musicOnOff.png', 100, 100);
    game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);
    game.load.image('background', 'assets/leaderboard2.png');

}

function send_score() {

    socket.emit('send_score', {
        username: username,
        score: score
    });

}

function rec_score() {

    socket.on('rec_score', function (response) {
        var j = 0;
        while (j < response.length && j < 7) {
            text7 = game.add.text(385, 295 + j * 52, response[j].username, { fontSize: '24px', fill: '#FFF' });
            text8 = game.add.text(670, 295 + j * 52, response[j].score, { fontSize: '24px', fill: '#F8E22E' });
            j++;
            text9 = game.add.text(180, 295 + (j - 1) * 52, j, { fontSize: '24px', fill: '#F8E22E' });
        }
    })

}

function create3() {

    send_score();
    rec_score();

    var bg = game.add.sprite(-220, -20, 'background');
    bg.scale.setTo(0.7, 0.75);

    // obstacles.destroy(true, true);
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.game.scale.pageAlignHorizontally = true;
    this.game.scale.pageAlignVertically = true;
    this.game.scale.refresh();

    fullButton = game.add.button(70, 90, 'fullButton', goFull, this, 2, 1, 0);
    fullButton.scale.setTo(0.5, 0.5);

    muteButton = game.add.button(140, 80, 'muteButton', mute, this);
    muteButton.scale.setTo(0.7, 0.7);

    var mutebutton = game.input.keyboard.addKey(Phaser.Keyboard.M);
    mutebutton.onDown.add(mute, this);

    var fullbutton = game.input.keyboard.addKey(Phaser.Keyboard.F);
    fullbutton.onDown.add(goFull, this);

    var retrybutton = game.input.keyboard.addKey(Phaser.Keyboard.R);
    retrybutton.onDown.add(function () {
        game.state.start('gameState2');
    }, this);

    scoreText = game.add.text(game.world.width / 2, 180, 'YOUR SCORE : ' + score, { fontSize: '42px', fill: '#F8E22E' });
    scoreText.anchor.setTo(0.5, 0.5);

    backButton = game.add.button(300 + 20, 550 + 130 - 10, 'backButton', back, this);
    backButton.scale.setTo(0.6, 0.6);

    retryButton = game.add.button(480, 550 + 130 - 10, 'retryButton', retry, this);
    retryButton.scale.setTo(0.6, 0.6);

    text = game.add.text(360, 670 + 80 - 10, 'Main Menu', { fontSize: '24px', fill: '#F8E22E' });
    text.anchor.setTo(0.5, 0.5);

    text1 = game.add.text(515, 670 + 80 - 10, 'Retry', { fontSize: '24px', fill: '#F8E22E' });
    text1.anchor.setTo(0.5, 0.5);

}


function update3() {
    if (game.sound.mute) {
        muteButton.frame = 0;
    }
    else {
        muteButton.frame = 1;
    }

    if (game.scale.isFullScreen) {
        fullButton.frame = 1;
    }
    else {
        fullButton.frame = 0;
    }

}


/************************LEADERBOARD PAGE************************/



global.States = global.States || {};
global.States.gameState3 = {
    preload: preload3,
    create: create3,
    update: update3
};

})(this);
