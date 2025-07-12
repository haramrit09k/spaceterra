(function (global) {

/************************LANDING PAGE************************/


var muteButton, fullButton, button, startButton, leader, googleLoginButton, logoimg, music, usernameDisplay, logoutButton, highScoreDisplay;


function preload1() {
    game.load.image('frontsky', 'assets/SKYRED.PNG');
    game.load.spritesheet('muteUnmuteButton', 'assets/musicOnOff.png', 100, 100);
    game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);

    game.load.image('leader', 'assets/buttons/LEADERBOARD.png');
    game.load.image('instruction', 'assets/buttons/INSTRUCTIONS.png');
    game.load.image('startButton', 'assets/buttons/START.png');
    game.load.image('logo', 'assets/Space Terra LOGO4.png');
    game.load.image('googleSignInButton', 'assets/buttons/GOOGLE_SIGN_IN.png');
    game.load.image('logoutButtonImage', 'assets/buttons/LOG_OUT.png');

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

    startButton = game.add.button(350, 450, 'startButton', actionOnClick, 'Start');
    startButton.scale.setTo(0.8, 0.8);

    button = game.add.button(350, 540, 'instruction', instruct, 'Instructions');
    button.scale.setTo(0.8, 0.8);

    leader = game.add.button(350, 630, 'leader', leaderBoard, 'leaderboard');
    leader.scale.setTo(0.8, 0.8);

    googleLoginButton = game.add.button(game.width - 20, 20, 'googleSignInButton', function () {
        window.location = '/auth/google';
    }, this);
    googleLoginButton.anchor.setTo(1, 0); // Anchor to top-right
    googleLoginButton.scale.setTo(0.5, 0.5);

    // Hide the button if the user is already logged in
    if (window.isUserLoggedIn) {
        googleLoginButton.visible = false;
    }

    logoimg = game.add.sprite(206, 160, 'logo');
    logoimg.scale.setTo(0.6, 0.6);

    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.physics.startSystem(Phaser.Physics.ARCADE);

    fullButton = game.add.button(70, 90, 'fullButton', goFull, this, 2, 1, 0);
    fullButton.scale.setTo(0.5, 0.5);

    fetch('/api/user')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.user) {
                username = data.user.displayName || data.user.email;
                loadStats();

                var displayName = data.user.displayName || data.user.email;
                var firstName = displayName.split(' ')[0];

                usernameDisplay = game.add.text(game.width - 10, 10, 'Hi, ' + firstName, {
                    font: 'bold 20px Impact',
                    fill: '#F8E22E',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                });
                usernameDisplay.anchor.setTo(1, 0);
                usernameDisplay.padding.set(5, 10);

                logoutButton = game.add.button(game.width - 10, usernameDisplay.y + usernameDisplay.height + 5, 'logoutButtonImage', function () {
                    window.location = '/logout';
                }, this);
                logoutButton.anchor.setTo(1, 0);
                logoutButton.scale.setTo(0.5, 0.5);

                // Create high score display
                highScoreDisplay = game.add.text(10, game.height - 40, '', {
                    font: 'bold 20px Impact',
                    fill: '#F8E22E',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)'
                });
                highScoreDisplay.anchor.setTo(0, 1);
                highScoreDisplay.padding.set(5, 10);

                googleLoginButton.visible = false; // Hide Google Sign-in button

            } else {
                // User is not logged in, show Google Sign-in button
                googleLoginButton.visible = true;
                if (usernameDisplay) usernameDisplay.visible = false;
                if (logoutButton) logoutButton.visible = false;
                if (highScoreDisplay) highScoreDisplay.visible = false;
            }
        });


}
function loadStats() {
    fetch('/api/user/stats')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data.score != null && data.rank != null) {
                highScoreDisplay.text = 'Your Top Score: ' + data.score;
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
    update: update1,
    shutdown: function() {
        if (googleLoginButton) googleLoginButton.destroy();
        if (usernameDisplay) usernameDisplay.destroy();
        if (logoutButton) logoutButton.destroy();
        if (highScoreDisplay) highScoreDisplay.destroy();
    }
};

})(this);
