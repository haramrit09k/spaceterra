/* global console */
/* global Phaser */

(function() {
    'use strict';

    var game, rocket, obstacle, cursors, i, y, sky;
    var oscIndex = 1;

    var preload = function preload() {
         game.load.image('rocket', 'rocket.png');
         game.load.image('obstacle', 'obstacle.png');
         game.load.image('sky', 'sky.png');
    };

    var create = function create() {
        // game.physics.startSystem(Phaser.Physics.ARCADE);
        //Started P2 Physics System
        game.physics.startSystem(Phaser.Physics.P2JS);

        this.game.scale.pageAlignHorizontally = true;this.game.scale.pageAlignVertically = true;this.game.scale.refresh();

        //Resized game world
        // game.world.resize(6000, 6000);
        //Add sprites
        sky = game.add.tileSprite(0, 0, 800, 600, 'sky');
        sky.tileScale.set(2, 2);
        rocket = game.add.sprite(400, 500, 'rocket');
        //Scale sprites
        rocket.scale.setTo(0.3, 0.3);

        // rocket.x.fixedToCamera = true;
        //tweenA = game.add.tween(rocket).to( { angle: 45 }, 2, "Quart.easeOut").to( { x: 550, y:700 }, 1200, "Quart.easeInOut").to( { angle: 0 }, 20, "Quart.easeOut").to( { angle: -45 }, 20, "Quart.easeOut").to( { x: 30 }, 1200, "Quart.easeInOut").to( { angle: 0 }, 20, "Quart.easeOut").loop(true);
        //game.input.onDown.addOnce(start, this);
        //obstacles = game.add.group();
        //    obstacles.enableBody = true;
        //      x = 40;
        //    for(var i=0; i<5; i++){
        //    var obstacle = obstacles.create(x, game.world.randomY, 'obstacle');
        //    x += game.rnd.integerInRange(100,250);
        // }
        // obstacles.outOfBoundsKill = true;

        rocket.enableBody = true;

        //Camera follows rocket
        // game.camera.follow(rocket);

        cursors = game.input.keyboard.createCursorKeys();
        // console.log(rocket.y);
    };

    var update = function update() {
        //obstacles.forEach(checkPos, this);

          //  Scroll the background
            
        
        // game.physics.arcade.overlap(rocket, obstacles, collisionHandler, null, this);

        //On pressing the up arrow key, the rocket moves forward in a sine wave path
        if (cursors.up.isDown) {
            //game.camera.y -= 5;
            rocket.y -= 5;
            sky.tilePosition.y += 2;
            // rocket.body.moveUp(200);
        } else if (cursors.down.isDown) {
            //game.camera.y -= 5;
            rocket.y += 5;
            // rocket.body.moveUp(200);
        }
        oscillation(); //Not working :(
    };

    // var checkPos = function checkPos(obstacle) {
    //     if (obstacle.y > 800) {
    //         obstacle.y = -100;
    //     }
    // };

    // var collisionHandler = function collisionHandler(rocket, obstacle) {
    //     rocket.x = 300;
    //     rocket.y = 700;
    // };

    var calcSin = function calcSin (amp, osc, sinD) {
        return amp * Math.sin(osc / sinD);
    };

    //Oscillation function defined separately to oscillate the particle
    var oscillation = function oscillation() {
        var y = rocket.y;
        if (oscIndex === 10000000) oscIndex = 1;
        var sin = calcSin(300, oscIndex, 40);
        rocket.x = 400 + parseInt(sin);
        y = y - 2;
        oscIndex++;
        console.log(oscIndex);
        // console.log(rocket.x);
    };



    window.onload = function() {
      var cp = Phaser.Tile.prototype.containsPoint;
      game = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.AUTO, '', {
        preload: preload,
        create: create,
        update: update,
      });
      // game = new Phaser.Game(800, 600, Phaser.AUTO, '', {
      //   preload: preload,
      //   create: create,
      //   update: update,
      // });
    };

    window.onload();
})();
 