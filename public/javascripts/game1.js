/* global console */
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
    var scaleFactor = [1,1.1,1.2,1.3];
    var text1,text2,text3,text4,text5,text6,text7,text8,text9;
    var scale1;


var gameState1 = function(){
}
gameState1.prototype = {
    preload:preload1,
    create:create1,
    update:update1
};

var gameState2 = function(){
}
gameState2.prototype = {
        preload : preload2,
        create : create2,
        update : update2,

        createTimer: function(){
 
    },
    updateTimer: function(){
 
    var me = this;
 
    var currentTime = new Date();
    var timeDifference = me.startTime.getTime() - currentTime.getTime();
 
    //Time elapsed in seconds
    me.timeElapsed = Math.abs(timeDifference / 1000);
    // timeDone = Math.abs(timeDifference / 1000);
    
    //Time remaining in seconds
    //var timeRemaining = me.totalTime - me.timeElapsed; 
    var timeRemaining = me.timeElapsed;
 
    //Convert seconds into minutes and seconds
    minutes = Math.floor(timeRemaining / 60);
    seconds = Math.floor(timeRemaining) - (60 * minutes);
 
    //Display minutes, add a 0 to the start if less than 10
    var result = (minutes < 10) ? "0" + minutes : minutes; 
 
    //Display seconds, add a 0 to the start if less than 10
    result += (seconds < 10) ? ":0" + seconds : ":" + seconds;
 
    }

};


var gameState3 = function(){
}
gameState3.prototype = {
        preload : preload3,
        create : create3,
        update : update3
};

var gameState4 = function(){
}
gameState4.prototype = {
        preload : preload4,
        create : create4,
        update : update4
};

var gameState5 = function(){
}
gameState5.prototype = {
        preload : preload5,
        create : create5,
        update : update5
};

game.state.add('gameState1', gameState1); //landing page
game.state.add('gameState2', gameState2); //main game
game.state.add('gameState3', gameState3); //game over
game.state.add('gameState4', gameState4); //leaderboard
game.state.add('gameState5', gameState5); //instructions
game.state.start('gameState1');



/************************LANDING PAGE************************/




function preload1()
{
         game.load.image('frontsky','assets/SKYRED.PNG');
        game.load.spritesheet('muteUnmuteButton', 'assets/musicOnOff.png', 100, 100);
        game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);

        game.load.image('leader','assets/leaderboard1.png');
        game.load.image('instruction','assets/instruction.png');
        game.load.image('startButton','assets/start.png'); 
        game.load.image('logo','assets/Space Terra LOGO4.png');

        game.load.video('video', 'assets/video/space_travel_hi.mp4');        
        
        game.load.audio('mp3', 'media/music.mp3');

}

function create1()
{
    
    $.ajax({
        type: 'GET',
        url: '/get_username',
        
        dataType: 'json',
        success: function(response){
            
            username = response.username;
        
        }
        });

    this.game.scale.pageAlignHorizontally = true;
    this.game.scale.pageAlignVertically = true;
    this.game.scale.refresh();
    
    music = game.add.audio('mp3');
    music.play('', 0, 1, true);
    var bg = game.add.sprite(-250,0,'frontsky');
    bg.scale.setTo(0.7,0.75);

    var mutebutton = game.input.keyboard.addKey(Phaser.Keyboard.M);
    mutebutton.onDown.add(mute, this);

    var fullbutton = game.input.keyboard.addKey(Phaser.Keyboard.F);
    fullbutton.onDown.add(goFull, this);
    
    muteButton = game.add.button(140, 80, 'muteUnmuteButton', mute, this);
    muteButton.scale.setTo(0.7, 0.7);

    button = game.add.button(350 ,530, 'instruction', instruct, 'Instructions'); 
    button.scale.setTo(0.8, 0.8);
    
    startButton = game.add.button(350, 450, 'startButton', actionOnClick, 'Start');
    startButton.scale.setTo(0.8,0.8);  
    
    leader = game.add.button(350, 610, 'leader', leaderBoard, 'leaderboard'); 
    leader.scale.setTo(0.8, 0.8);

    logoimg = game.add.sprite(206, 160, 'logo');
    logoimg.scale.setTo(0.6, 0.6);

    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.physics.startSystem(Phaser.Physics.ARCADE);

    fullButton = game.add.button(70, 90, 'fullButton', goFull, this, 2, 1, 0);
    fullButton.scale.setTo(0.5,0.5);

}
function update1(){
    if(game.sound.mute){
        muteButton.frame = 0;
    }
    else{
        muteButton.frame = 1;
    }    

    if (game.scale.isFullScreen){
            fullButton.frame = 1;
    }
    
    else{    
        fullButton.frame = 0;
    }
    }




/************************MAIN GAME************************/


function preload2() {

         // game.load.image('instructionl','assets/instructpage3.png');
        game.load.spritesheet('rocket','assets/spaceship1.png', 100, 150);
        game.load.spritesheet('ast','assets/asteroid1.png',72,70);
        game.load.image('sky','assets/sky5.jpg');
        game.load.spritesheet('muteButton','assets/musicOnOff.png', 100, 100);
        game.load.audio('mp3','media/music.mp3');
        game.load.image('pause_button','assets/pause.png');
        game.load.spritesheet('blast','assets/flame_hit.png',512,512);
        game.load.spritesheet('alien', 'assets/alien_spritesheet.png', 278,275);
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
        sky.scale.setTo(1,1);
      //   var im = game.add.sprite(0,0,'instructionl');
         // im.scale.setTo(1,1);
    
        rocket = game.add.sprite(300, 500, 'rocket');
        fullButton = game.add.button(70, 90, 'fullButton', goFull, this, 2, 1, 0);
        // fullButton.input.priorityID = 0;
        fullButton.scale.setTo(0.5, 0.5);
        muteButton = game.add.button(140, 80, 'muteButton', mute, this);
        muteButton.scale.setTo(0.7, 0.7);
      
          if(game.sound.mute){
            muteButton.frame = 1;
        }
        else{
            muteButton.frame = 0;
        }


        pause_button = game.add.button(700, 80, 'pause_button', pauseGame, this, 2, 1, 0);
        pause_button.scale.setTo(0.6,0.6);

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

        for(var j=0; j<100; j++){
            var alien = aliens.create(x1,y1,'alien');
            alien.scale.setTo(0.3,0.3);
           y1 -= game.rnd.integerInRange(2000,5000);
            alien.body.setSize(100,100,100,100);
        } 
        aliens.callAll('animations.add', 'animations', 'spin', [0, 1, 2], 10, true);
        aliens.callAll('animations.play', 'animations', 'spin');

        

        obstacles = game.add.group();
        obstacles.enableBody = true;
             x = game.rnd.integerInRange(200,400);
             y = game.rnd.integerInRange(150,250);
       obstacles.destroy(true, true);
           for(var i=0; i<=10; i++){
           var obstacle = obstacles.create(x, y, 'ast');
           obstacle.frame= i%15;
           scale1 = game.rnd.pick(scaleFactor);
           obstacle.scale.setTo(scale1,scale1);

           x += game.rnd.integerInRange(200,450);
           if(x>570){
            x-= game.rnd.integerInRange(400,550);
           }
           y -= game.rnd.integerInRange(250,425);
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
     
        me.gameTimer = game.time.events.loop(100, function()
        {
            me.updateTimer();
        });
        
    };



 function update2() {
    

                if(game.sound.mute){
                muteButton.frame = 0;
            }
                else{
                muteButton.frame = 1;
            }  

                if (game.scale.isFullScreen){
                fullButton.frame = 1;
            }
        
                else{    
                fullButton.frame = 0;
            }  

        // obstacles.forEach(checkPos, this);

        game.physics.arcade.overlap(rocket, obstacles, collisionHandler, null, this);
        game.physics.arcade.overlap(rocket, aliens, collisionHandler, null, this);
        
        oscillation(intensity);        
        oscillation40();

        	if(intensity>41)
        intensity-=0.0007;
        //On pressing the up arrow key, the rocket moves forward in a sine wave path
            if (cursors.up.isDown) 
            {   
                distance += 0.1;
                score = parseInt(distance);

                sky.tilePosition.y += 1;
                obstacles.y += 15;
                aliens.y += 10;
                rocket.animations.play('forward');
                scoreY += 7;
                oscIndexNew = 0;

            }
            else
            {
                rocket.animations.stop();
                rocket.frame = 0;
                oscIndexNew = oscIndexNew + 1;
            }

        if(scoreY%350==0){
            for(var i=0; i<3;i++){
           x += game.rnd.integerInRange(200,450);
           if(x>570){
            x-= game.rnd.integerInRange(400,550);
           }
           y -= game.rnd.integerInRange(250,425);
           var frameNo = game.rnd.integerInRange(0,64);
        obstacle = obstacles.create(x,y,'ast');
        obstacle.frame= frameNo%15;
        scale1 = game.rnd.pick(scaleFactor);
        obstacle.scale.setTo(scale1,scale1);

        }
    }

            scoreText.text = 'SCORE: ' + score;

        if(oscIndexNew == 300){
                collisionHandler(rocket,obstacle);
        }   
       
       };



/************************GAME-OVER PAGE************************/



function preload3(){

    game.load.image('backButton', 'assets/home.png');
    game.load.image('retryButton', 'assets/return.png');
    game.load.spritesheet('muteButton', 'assets/musicOnOff.png', 100, 100);    
    game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);
    game.load.image('background', 'assets/leaderboard2.png');

}

function send_score()
{
    $.ajax({
        type: 'POST',
        url: '/isdjfisjdfkshflakdjalskjd',
        data: { score:score, username:username },
        dataType: 'json',
        success: function(response){
            if(response.msg === "success"){
            }
            else{
                $('#error-msg').html('');
                $('#error-msg').append('<span>Server error!</span>');
            }
        }
        });

    rec_score();
} 

function rec_score(){



        $.ajax({
        type: 'GET',
        url: '/ret_score',
        
        dataType: 'json',
        success: function(response){
            var j=0;
            while(response[j]!==null && j<7){
                text7 = game.add.text(385,295+j*52,response[j].username,{fontSize: '24px', fill: '#FFF'});
                text8 = game.add.text(670,295+j*52,""+response[j].score,{fontSize: '24px', fill: '#F8E22E'});
                j++;
                text9 = game.add.text(180,295+(j-1)*52,j,{fontSize: '24px', fill: '#F8E22E'});
            }
        }
        });
}


function send_count(){
    if(exist==0)
        counts = 0;

    counts = counts+1;


    if(score<75)
        point = 0;

    if(score>=75 && score<200)
        point = 100;

    else if(score>=200 && score<300)
        point = 200;

    else if(score>=300 && score<400)
        point = 350;

    else if(score>=400 && score<450)
        point = 450;

    else if(score>=450 && score<850)
        point = 550;

    else if(score>=850)
        {

            $.ajax({
        type: 'POST',
        url: '/input_count',
        data: { counts:counts, username:username },
        dataType: 'json',
        success: function(response){
            if(response.msg === "success"){
            }
            else{
                $('#error-msg').html('');
                $('#error-msg').append('<span>Server error!</span>');
            }
        }
        });

            if(counts==1)
                point = 700;

            else if(counts==2)
                point = 650;

            else 
                point = 600;


        }

        send_mega();
}

function send_mega(){

      $.ajax({
        type: 'POST',
        url: '/input_mega',
        data: { point:point, username:username },
        dataType: 'json',
        success: function(response){
            if(response.msg === "success"){
            }
            else{
                $('#error-msg').html('');
                $('#error-msg').append('<span>Server error!</span>');
            }
        }
        });

}



function create3(){

        // scoreText.kill();

        $.ajax({
        type: 'GET',
        url: '/ret_score',
        
        dataType: 'json',
        success: function(response){
        
            var j=0;
            while(response[j]!==null)
            {
                if(username===response[j].username)
                {
                    exist = 1;
                    counts = response[j].counts;

                    send_count();

                    break;
                }              
               
                j++;     
            }
        }
        });


        $.ajax({
        type: 'GET',
        url: '/ret_score',
        
        dataType: 'json',
        success: function(response){
        
            var j=0;
            if(exist == 1)
            {
            while(response[j]!==null)
            {
                if(username===response[j].username)
               {
                if(score>response[j].score)
                {
                    send_score();
                    rec_score();
                    break;
                }
                else
                {
                    rec_score();
                    break;
                } 
               }              
                else if(response[j+1]==null)
                {
                    send_score();
                    rec_score();
                    break;
                }
                j++;     
            }
        }
        else{
            send_score();
            send_count();
            rec_score();
        }

          }
        });


    var bg = game.add.sprite(-220,-20,'background');
    bg.scale.setTo(0.7,0.75);
    
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
    retrybutton.onDown.add(function(){
        game.state.start('gameState2');}, this);
    
    scoreText = game.add.text(game.world.width/2, 180, 'YOUR SCORE : '+score , { fontSize: '42px', fill: '#F8E22E'});
    scoreText.anchor.setTo(0.5,0.5);
    
    backButton = game.add.button(300+20, 550+130-10, 'backButton', back, this);
    backButton.scale.setTo(0.6, 0.6);
    
    retryButton = game.add.button(480, 550+130-10, 'retryButton', retry, this);
    retryButton.scale.setTo(0.6, 0.6);
    
    text = game.add.text(360, 670+80-10, 'Main Menu', {fontSize: '24px', fill: '#F8E22E'});
    text.anchor.setTo(0.5,0.5);
    
    text1 = game.add.text(515, 670+80-10, 'Retry', {fontSize: '24px', fill: '#F8E22E'});
    text1.anchor.setTo(0.5,0.5);

}


function update3(){
    if(game.sound.mute){
        muteButton.frame = 0;
    }
    else{
        muteButton.frame = 1;
    }   
    
      if (game.scale.isFullScreen){
        fullButton.frame = 1;
    }    
    else{    
        fullButton.frame = 0;
    }   

}


/************************LEADERBOARD PAGE************************/



function preload4(){
    game.load.image('backButton', 'assets/home.png');
    game.load.image('home','assets/leaderboard2.png');
};
function create4(){
  
    var ig = game.add.sprite(-220,-20,'home');
    ig.scale.setTo(0.7,0.75);
    var tex = game.add.text(300,60,'LEADERBOARD',{ font:' bold 48px Impact', fill: '#F8E22E'  });  
      backButton = game.add.button(400, 660, 'backButton', back, this);
    backButton.scale.setTo(0.7, 0.7);
    var text99 = game.add.text(430, 670+70, 'Main Menu', {fontSize: '24px', fill: '#F8E22E'});
    text99.anchor.setTo(0.5,0.5);

    // rec_score();
           $.ajax({
        type: 'GET',
        url: '/ret_score',
        
        dataType: 'json',
        success: function(response){
            var j=0;
            while(response[j]!==null && j<7){
                scoreText = game.add.text(385,295+j*52,response[j].username,{fontSize: '24px', fill: '#FFF'});
                scoreText = game.add.text(670,295+j*52,""+response[j].score,{fontSize: '24px', fill: '#F8E22E'});
                j++;
                scoreText = game.add.text(180,295+(j-1)*52,j,{fontSize: '24px', fill: '#F8E22E'});
            }
        }
        });
};


function update4(){
};


/************************DEFINED FUNCTIONS************************/



var collisionHandler = function collisionHandler(rocket, obstacle) {
       
        setTimeout(function(){  game.state.start('gameState3', score);
        },750); //PAUSE BEFORE BLASTING ANIMATION STARTS. (KEEP 0)
        blast = game.add.sprite(rocket.x,rocket.y,'blast');
        blast.scale.setTo(0.17,0.17);
        blast.animations.add('blastHim',[0,1,2,3,4,5,6,7,8],10,true);
        rocket.kill();
        blast.animations.play('blastHim');
        var music1 = game.add.audio('boom');
        music1.play(); 
        game.camera.shake();
              

    };
    //Function to calculate sine value
    var calcSin = function calcSin (amp, osc, sinD) {
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

    if (game.scale.isFullScreen){
            game.scale.stopFullScreen();
    }
    
    else{    
        game.scale.startFullScreen(false);
    }
}

function mute() {
    if(game.sound.mute){
         game.sound.mute = false;
         muteButton.frame = 1;
        }
    
    else{

    game.sound.mute = true;
        muteButton.frame = 0;
    }
}

function back() {
        game.state.start('gameState1');
        score = 0;
        game.sound.stopAll();
}

function instruct () {
         game.state.start('gameState5');
    }

function actionOnClick () {
        game.state.start('gameState2');
    }

function pauseGame()
{
    if (!game.paused) 
    {
       game.paused = true;
       pause_button.tint = 16310830;
       text = game.add.text(game.world.width/2,game.world.height/2,'Click anywhere to resume',{fontSize: '32px', fill: '#F8E22E'});
       text.anchor.setTo(0.5,0.5);
   }
    else 
    {
       game.paused = false;
       pause_button.tint = 16777215;
       text.kill();
    }
    game.input.onDown.add(function() 
    {
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


/************************INSTRUCTIONS PAGE************************/



function preload5()
{   game.load.video('video', 'assets/video/demo1.mp4');

    game.load.spritesheet('key','assets/keyys.png',96,103);
    game.load.spritesheet('alien', 'assets/alien_spritesheet.png', 278,275);

    game.load.image('backButton', 'assets/home.png');
    game.load.image('p','assets/pimage.png');
    game.load.image('r','assets/rimage.png');
    game.load.image('f','assets/fimage.png');
    game.load.image('m','assets/mimage.png');
    game.load.image('background', 'assets/SKYRED.PNG');
}

function create5()
{ 
        var bg = game.add.sprite(-220,-20,'background');
        bg.scale.setTo(0.7,0.75);

        text2 = game.add.text(320,30,'INSTRUCTIONS\n',{font:'bold 48px Impact', fill: '#F8E22E'  });
        
         text3 = game.add.text(420,140,'Help the oscillating rocket move ahead by avoiding\n collision with the obstacles',{ font:' 28px Rockwell', fill: '#F8E22E'  });
        text3.anchor.setTo(0.5,0.5);
        
        var key = game.add.sprite(110, 185, 'key');
        key.scale.setTo(0.7,0.7);
        var anim = key.animations.add('anim');
        key.animations.play('anim',1, true);
        
        text4 = game.add.text(285,190,'For upward motion of rocket, press UP \narrow key',{ font:' 28px Rockwell', fill: '#F8E22E'  }); 
        
        video = game.add.video('video');
        video.addToWorld(10,285+19,0,0,0.095,0.14);
        // video.scale.setTo(0.3,0.3);
        video.play(true);
        video.loop = true;
    
        text5 = game.add.text(290,280+10,'If the rocket remains\ninactive for two oscillations\nwithout moving forward,the rocket\nexplodes',{ font:' 28px Rockwell', fill: '#F8E22E'  });  
        
        backButton = game.add.button(400, 665, 'backButton', back, this);
        backButton.scale.setTo(0.7, 0.7);
        
        var text99 = game.add.text(430, 670+75, 'Main Menu', {fontSize: '24px', fill: '#F8E22E'});
        text99.anchor.setTo(0.5,0.5);
        
        aliens = game.add.group();
        var alien2 = aliens.create(120,440+15,'alien');
        alien2.scale.setTo(0.25,0.25);
        aliens.callAll('animations.add', 'animations', 'spin', [0, 1, 2], 10, true);
        aliens.callAll('animations.play', 'animations', 'spin');

        text6 = game.add.text(290,470,'Beware of the aliens',{ font:' 32px Rockwell', fill: '#F8E22E'  });
        
        text7= game.add.text(340,530-10,'HOTKEYS',{ font:'bold 32px Rockwell', fill: ' #ff0000'  }); 
        
        var p = game.add.sprite(120, 570-10, 'p');
        p.scale.setTo(0.4,0.4);
        
        text8= game.add.text(180,580-10,': PAUSE',{ font:'28px Rockwell', fill: '#F8E22E'  }); 
        
        var f = game.add.sprite(120, 630-10, 'f');
        f.scale.setTo(0.4,0.4);
        
        text9= game.add.text(180,640-10,': TOGGLE FULLSCREEN',{ font:'28px Rockwell', fill: '#F8E22E'  }); 
        
        var r = game.add.sprite(540, 570-10, 'r');
        r.scale.setTo(0.4,0.4);
        
        var text10= game.add.text(600,580-10,': RETRY',{ font:'28px Rockwell', fill: '#F8E22E'  }); 
        
        var m = game.add.sprite(540, 630-10, 'm');
        m.scale.setTo(0.4,0.4);
        
        var text11= game.add.text(600,640-10,': TOGGLE MUTE',{ font:'28px Rockwell', fill: '#F8E22E'  }); 

        var mutebutton = game.input.keyboard.addKey(Phaser.Keyboard.M);
        mutebutton.onDown.add(mute, this);

        var fullbutton = game.input.keyboard.addKey(Phaser.Keyboard.F);
        fullbutton.onDown.add(goFull, this);

}

function update5()
{

}