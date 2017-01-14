var game = new Phaser.Game(1366, 768, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {

    game.load.image('rocket', 'rocket.png');
    game.load.image('obstacle', 'obstacle.png')
    game.load.image('sky', 'sky.png');

}

var tweenA, rocket, obstacle, cursors, i, y;

function create() {

    // game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.startSystem(Phaser.Physics.P2JS);	
	game.world.resize(6000,6000);
	var sky = game.add.tileSprite(0,0,1920,1920,'sky');
    rocket = game.add.sprite(300,5500,'rocket');
    rocket.scale.setTo(0.3,0.3);
    sky.scale.setTo(7,7);
   	// rocket.fixedToCamera = true;
   //tweenA = game.add.tween(rocket).to( { angle: 45 }, 2, "Quart.easeOut").to( { x: 550, y:700 }, 1200, "Quart.easeInOut").to( { angle: 0 }, 20, "Quart.easeOut").to( { angle: -45 }, 20, "Quart.easeOut").to( { x: 30 }, 1200, "Quart.easeInOut").to( { angle: 0 }, 20, "Quart.easeOut").loop(true);

 	
 	//game.input.onDown.addOnce(start, this);

 	//obstacles = game.add.group();

 //    obstacles.enableBody = true;

 //   	x = 40;

 //    for(var i=0; i<5; i++){
    	
 //    var obstacle = obstacles.create(x, game.world.randomY, 'obstacle');    
	
	// //obstacle.body.velocity.y = 0;
    
 //    x += game.rnd.integerInRange(100,250);
    
	// }
	// obstacles.outOfBoundsKill = true;

	// game.physics.p2.enable(rocket);

	game.camera.follow(rocket);

    cursors = game.input.keyboard.createCursorKeys();
    // console.log(rocket.y);
}

// function start() {

//     tweenA.start();

// }

function update() {
    //obstacles.forEach(checkPos, this);

   // game.physics.arcade.overlap(rocket, obstacles, collisionHandler, null, this);

        if (cursors.up.isDown)	{
    	//game.camera.y -= 5;
		rocket.x = 600 + (200*Math.sin(rocket.y/50));
    	rocket.y -= 5;
  		// rocket.body.moveUp(200);
    							}
    else{
			oscillation();	
		}	
		console.log(y);
    }

    



// function checkPos (obstacle) {

//     if (obstacle.y > 800)
//     {
//         obstacle.y = -100;
//     }

// }


// function collisionHandler (rocket, obstacle) {

//     rocket.x = 300;
//     rocket.y = 700;

// }

function oscillation(){

    y = rocket.y;
	while(i<300)
	{
    rocket.x = 600 + (400*Math.sin(y/50));
    i = i + 1;
    y = y - 3; 

}

}