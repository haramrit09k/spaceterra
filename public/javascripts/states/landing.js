(function (global) {

/************************LANDING PAGE************************/




function preload1() {
    game.load.image('frontsky', 'assets/SKYRED.PNG');
    game.load.spritesheet('muteUnmuteButton', 'assets/musicOnOff.png', 100, 100);
    game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);

    game.load.image('leader', 'assets/leaderboard1.png');
    game.load.image('instruction', 'assets/instruction.png');
    game.load.image('startButton', 'assets/start.png');
    game.load.image('logo', 'assets/Space Terra LOGO4.png');

    game.load.video('video', 'assets/video/space_travel_hi.mp4');

    game.load.audio('mp3', 'media/music.mp3');

}

function create1() {

    if(this.game.sound.context.state === 'suspended')
        this.game.sound.context.resume();
    this.game.scale.pageAlignHorizontally = true;
    this.game.scale.pageAlignVertically = true;
    this.game.scale.refresh();

    music = game.add.audio('mp3');
    music.play('', 0, 1, true);

    var bg = game.add.sprite(-250, 0, 'frontsky');
    bg.scale.setTo(0.7, 0.75);

    var mutebutton = game.input.keyboard.addKey(Phaser.Keyboard.M);
    mutebutton.onDown.add(mute, this);

    var fullbutton = game.input.keyboard.addKey(Phaser.Keyboard.F);
    fullbutton.onDown.add(goFull, this);

    muteButton = game.add.button(140, 80, 'muteUnmuteButton', mute, this);
    muteButton.scale.setTo(0.7, 0.7);

    button = game.add.button(350, 530, 'instruction', instruct, 'Instructions');
    button.scale.setTo(0.8, 0.8);

    startButton = game.add.button(350, 450, 'startButton', actionOnClick, 'Start');
    startButton.scale.setTo(0.8, 0.8);

    leader = game.add.button(350, 610, 'leader', leaderBoard, 'leaderboard');
    leader.scale.setTo(0.8, 0.8);

    logoimg = game.add.sprite(206, 160, 'logo');
    logoimg.scale.setTo(0.6, 0.6);

    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.physics.startSystem(Phaser.Physics.ARCADE);

    fullButton = game.add.button(70, 90, 'fullButton', goFull, this, 2, 1, 0);
    fullButton.scale.setTo(0.5, 0.5);

    statsText = game.add.text(350, 370, '', { fontSize: '24px', fill: '#F8E22E' });
    statsText.anchor.setTo(0.5, 0.5);

    if (username == null) {
        fetch('/api/user')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.user) {
                    username = data.user.displayName || data.user.email;
                    loadStats();
                } else {
                    window.location = '/auth/google';
                }
            });
    } else {
        loadStats();
    }


}
function loadStats() {
    fetch('/api/user/stats')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data.score != null && data.rank != null) {
                statsText.text = 'High Score: ' + data.score + ' (Rank ' + data.rank + ')';
            }
        });
}
function update1() {
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




global.States = global.States || {};
global.States.gameState1 = {
    preload: preload1,
    create: create1,
    update: update1
};

})(this);
