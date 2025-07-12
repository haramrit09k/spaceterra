(function (global) {

/************************LANDING PAGE************************/


var muteButton, fullButton, button, startButton, leader, googleLoginButton, logoimg, music, usernameDisplay, logoutButton, highScoreDisplay, rankDisplay, profileImage;


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
    googleLoginButton.visible = false; // Initially hide it

    // Create all potential display elements but hide them initially
    usernameDisplay = game.add.text(game.width - 10, 10, '', {
        font: 'bold 20px Impact',
        fill: '#F8E22E',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    });
    usernameDisplay.anchor.setTo(1, 0);
    usernameDisplay.padding.set(5, 10);
    usernameDisplay.visible = false;

    logoutButton = game.add.button(game.width - 10, 0, 'logoutButtonImage', function () {
        window.location = '/logout';
    }, this);
    logoutButton.anchor.setTo(1, 0);
    logoutButton.scale.setTo(0.5, 0.5);
    logoutButton.visible = false;

    highScoreDisplay = game.add.text(10, game.height - 40, '', {
        font: 'bold 20px Impact',
        fill: '#F8E22E',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    });
    highScoreDisplay.anchor.setTo(0, 1);
    highScoreDisplay.padding.set(5, 10);
    highScoreDisplay.visible = false;

    rankDisplay = game.add.text(10, game.height - 80, '', {
        font: 'bold 20px Impact',
        fill: '#F8E22E',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
    });
    rankDisplay.anchor.setTo(0, 1);
    rankDisplay.padding.set(5, 10);
    rankDisplay.visible = false;

    // Profile image placeholder (will be created dynamically)
    profileImage = null;

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

                usernameDisplay.text = 'Hi, ' + firstName;
                usernameDisplay.visible = true;

                // Position logout button relative to usernameDisplay
                logoutButton.y = usernameDisplay.y + usernameDisplay.height + 5;
                logoutButton.visible = true;

                highScoreDisplay.visible = true;
                rankDisplay.visible = true;

                // Profile Image Loading and Masking
                var profilePicUrl = data?.user?._json?.picture;
                if (profilePicUrl) {
                    var dynamicImageKey = 'userProfilePic_' + Date.now();
                    game.load.image(dynamicImageKey, profilePicUrl);
                    game.load.onLoadComplete.addOnce(function() {
                        profileImage = game.add.sprite(usernameDisplay.x - usernameDisplay.width - 2, usernameDisplay.y + usernameDisplay.height / 2 - 2, dynamicImageKey);
                        profileImage.anchor.setTo(1, 0.5);
                        profileImage.width = 44; // Increased by 10%
                        profileImage.height = 44; // Increased by 10%

                        // Create a circular mask
                        var mask = game.add.graphics(0, 0);
                        mask.beginFill(0xffffff);
                        mask.drawCircle(profileImage.x - profileImage.width / 2, profileImage.y, profileImage.width / 2 * 1.5); // Increased radius by 50%
                        profileImage.mask = mask;
                    });
                    game.load.start();
                }

            } else {
                // User is not logged in, show Google Sign-in button
                googleLoginButton.visible = true;
                // Hide all other elements
                usernameDisplay.visible = false;
                logoutButton.visible = false;
                highScoreDisplay.visible = false;
                rankDisplay.visible = false;
                if (profileImage) profileImage.visible = false;
                if (profileImage && profileImage.mask) profileImage.mask.visible = false;
            }
        });


}
function loadStats() {
    fetch('/api/user/stats')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data && data.score != null && data.rank != null) {
                highScoreDisplay.text = 'Your Top Score: ' + data.score;
                rankDisplay.text = 'Leaderboard Rank: ' + data.rank;
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
        if (rankDisplay) rankDisplay.destroy();
        if (profileImage) profileImage.destroy();
        if (profileImage && profileImage.mask) profileImage.mask.destroy();
    }
};

})(this);
