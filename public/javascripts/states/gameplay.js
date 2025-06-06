(function (global) {
/************************MAIN GAME************************/


function preload2() {

    // game.load.image('instructionl','assets/instructpage3.png');
    game.load.spritesheet('rocket', 'assets/spaceship1.png', 100, 150);
    game.load.spritesheet('ast', 'assets/asteroid1.png', 72, 70);
    game.load.image('sky', 'assets/sky5.jpg');
    game.load.spritesheet('muteButton', 'assets/musicOnOff.png', 100, 100);
    game.load.audio('mp3', 'media/music.mp3');
    game.load.image('pause_button', 'assets/pause.png');
    game.load.spritesheet('blast', 'assets/flame_hit.png', 512, 512);
    game.load.spritesheet('alien', 'assets/alien_spritesheet.png', 278, 275);
    game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);
    game.load.audio('boom', 'media/explosion.ogg');
};

function create2() {

    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;

    game.physics.startSystem(Phaser.Physics.ARCADE);
    //Started Arcade Physics System

    this.game.scale.pageAlignHorizontally = true;
    this.game.scale.pageAlignVertically = true;
    this.game.scale.refresh();
    //Aligning the page to the center of the screen
    //Add sprites

    sky = game.add.tileSprite(0, 0, 1000, 1000, 'sky');
    sky.scale.setTo(1, 1);
    

    rocket = game.add.sprite(300, 500, 'rocket');
    fullButton = game.add.button(70, 90, 'fullButton', goFull, this, 2, 1, 0);
    fullButton.scale.setTo(0.5, 0.5);
    muteButton = game.add.button(140, 80, 'muteButton', mute, this);
    muteButton.scale.setTo(0.7, 0.7);

    if (game.sound.mute) {
        muteButton.frame = 1;
    }
    else {
        muteButton.frame = 0;
    }


    pause_button = game.add.button(700, 80, 'pause_button', pauseGame, this, 2, 1, 0);
    pause_button.scale.setTo(0.6, 0.6);

    var pauseButton = game.input.keyboard.addKey(Phaser.Keyboard.P);
    pauseButton.onDown.add(pauseGame, this);

    var mutebutton = game.input.keyboard.addKey(Phaser.Keyboard.M);
    mutebutton.onDown.add(mute, this);

    var fullbutton = game.input.keyboard.addKey(Phaser.Keyboard.F);
    fullbutton.onDown.add(goFull, this);


    score = 0;

    // text7.kill();
    // text8.kill();
    // text9.kill();


    scoreText = game.add.text(30, 30, 'SCORE: ' + score, { fontSize: '32px', fill: '#F8E22E' });
    //Scale sprites
    rocket.scale.setTo(0.4, 0.4);
    sky.tileScale.set(1, 1);
    //Add animations
    rocket.animations.add('forward', [3], 10, true);

    intensity = 50;
    oscIndexNew = 0;

    aliens = game.add.group();
    aliens.enableBody = true;
    var x1 = 300;
    var y1 = game.rnd.integerInRange(-1000, -2000);

    for (var j = 0; j < 100; j++) {
        var alien = aliens.create(x1, y1, 'alien');
        alien.scale.setTo(0.3, 0.3);
        y1 -= game.rnd.integerInRange(2000, 5000);
        alien.body.setSize(100, 100, 100, 100);
    }
    aliens.callAll('animations.add', 'animations', 'spin', [0, 1, 2], 10, true);
    aliens.callAll('animations.play', 'animations', 'spin');



    obstacles = game.add.group();
    obstacles.enableBody = true;
    x = game.rnd.integerInRange(200, 400);
    y = game.rnd.integerInRange(150, 250);
    obstacles.destroy(true, true);
    for (var i = 0; i <= 10; i++) {
        var obstacle = obstacles.create(x, y, 'ast');
        obstacle.frame = i % 15;
        scale1 = game.rnd.pick(scaleFactor);
        obstacle.scale.setTo(scale1, scale1);

        x += game.rnd.integerInRange(200, 450);
        if (x > 570) {
            x -= game.rnd.integerInRange(400, 550);
        }
        y -= game.rnd.integerInRange(250, 425);
    }

    obstacles.outOfBoundsKill = true;
    aliens.outOfBoundsKill = true;
    alien.enableBody = true;
    rocket.enableBody = true;
    //Camera follows rocket
    game.camera.follow(rocket);
    cursors = game.input.keyboard.createCursorKeys();
    game.physics.arcade.enable(obstacles);
    game.physics.arcade.enable(rocket);
    game.physics.arcade.enable(alien);

    distance = 0;

    var me = this;

    me.startTime = new Date();
    me.totalTime = 120;
    // me.timeElapsed = 0;

    me.createTimer();

    me.gameTimer = game.time.events.loop(100, function () {
        me.updateTimer();
    });

};

function update2() {

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

    // obstacles.forEach(checkPos, this);

    game.physics.arcade.overlap(rocket, obstacles, collisionHandler, null, this);
    game.physics.arcade.overlap(rocket, aliens, collisionHandler, null, this);

    oscillation(intensity);
    oscillation40();

    if (intensity > 41)
        intensity -= 0.0007;
    //On pressing the up arrow key, the rocket moves forward in a sine wave path
    
    if (cursors.up.isDown || game.input.pointer1.isDown) {
        distance += 0.1;
        score = parseInt(distance);

        sky.tilePosition.y += 1;
        obstacles.y += 15;
        aliens.y += 10;
        rocket.animations.play('forward');
        scoreY += 7;
        oscIndexNew = 0;

    }
    else {
        rocket.animations.stop();
        rocket.frame = 0;
        oscIndexNew = oscIndexNew + 1;
    }

    if (scoreY % 350 == 0) {
        for (var i = 0; i < 3; i++) {
            x += game.rnd.integerInRange(200, 450);
            if (x > 570) {
                x -= game.rnd.integerInRange(400, 550);
            }
            y -= game.rnd.integerInRange(250, 425);
            var frameNo = game.rnd.integerInRange(0, 64);
            obstacle = obstacles.create(x, y, 'ast');
            obstacle.frame = frameNo % 15;
            scale1 = game.rnd.pick(scaleFactor);
            obstacle.scale.setTo(scale1, scale1);

        }
    }

    scoreText.text = 'SCORE: ' + score;

    if (oscIndexNew == 300) {
        collisionHandler(rocket, obstacle);
    }

};

/************************GAME-OVER PAGE************************/


global.States = global.States || {};
global.States.gameState2 = {
    preload: preload2,
    create: create2,
    update: update2,
    createTimer: function () {
    },
    updateTimer: function () {
        var me = this;
        var currentTime = new Date();
        var timeDifference = me.startTime.getTime() - currentTime.getTime();
        me.timeElapsed = Math.abs(timeDifference / 1000);
        var timeRemaining = me.timeElapsed;
        minutes = Math.floor(timeRemaining / 60);
        seconds = Math.floor(timeRemaining) - (60 * minutes);
        var result = (minutes < 10) ? "0" + minutes : minutes;
        result += (seconds < 10) ? ":0" + seconds : ":" + seconds;
    }
};

})(this);
