(function (global) {
function preload5() {
    game.load.video('video', 'assets/video/demo1.mp4');

    game.load.spritesheet('key', 'assets/keyys.png', 96, 103);
    game.load.spritesheet('alien', 'assets/alien_spritesheet.png', 278, 275);

    game.load.image('backButton', 'assets/home.png');
    game.load.image('p', 'assets/pimage.png');
    game.load.image('r', 'assets/rimage.png');
    game.load.image('f', 'assets/fimage.png');
    game.load.image('m', 'assets/mimage.png');
    game.load.image('background', 'assets/SKYRED.PNG');
    game.load.image('tap-mobile', 'assets/tap-mobile.png');
    game.load.spritesheet('tap-mobile', 'assets/finger-tap-sp.png', 782, 998);
}

function create5() {
    var bg = game.add.sprite(-220, -20, 'background');
    bg.scale.setTo(0.7, 0.75);

    text2 = game.add.text(320, 30, 'INSTRUCTIONS\n', { font: 'bold 48px Impact', fill: '#F8E22E' });

    text3 = game.add.text(420, 140, 'Help the oscillating rocket move ahead by avoiding\n collision with the obstacles', { font: ' 28px Rockwell', fill: '#F8E22E' });
    text3.anchor.setTo(0.5, 0.5);

    var key = game.add.sprite(110, 185, 'key');
    key.scale.setTo(0.7, 0.7);
    var anim = key.animations.add('anim');
    key.animations.play('anim', 1, true);

    text4 = game.add.text(285, 190, 'For upward motion of rocket, press UP \narrow key', { font: ' 28px Rockwell', fill: '#F8E22E' });
    text42 = game.add.text(430, 235, '(OR touch and hold for mobile devices)', { font: ' 20px Rockwell', fill: '#F8E22E' });

    var tap_mobile = game.add.sprite(750, 270, 'tap-mobile');
    tap_mobile.scale.setTo(0.08, 0.08);
    var finger_anim = tap_mobile.animations.add('finger_anim');
    tap_mobile.animations.play('finger_anim', 1, true);

    video = game.add.video('video');
    video.addToWorld(10, 285 + 19, 0, 0, 0.095, 0.14);
    // video.scale.setTo(0.3,0.3);
    video.play(true);
    video.loop = true;

    text5 = game.add.text(290, 280 + 10, 'If the rocket remains\ninactive for two oscillations\nwithout moving forward,the rocket\nexplodes', { font: ' 28px Rockwell', fill: '#F8E22E' });

    backButton = game.add.button(400, 665, 'backButton', back, this);
    backButton.scale.setTo(0.7, 0.7);

    var text99 = game.add.text(430, 670 + 75, 'Main Menu', { fontSize: '24px', fill: '#F8E22E' });
    text99.anchor.setTo(0.5, 0.5);

    aliens = game.add.group();
    var alien2 = aliens.create(120, 440 + 15, 'alien');
    alien2.scale.setTo(0.25, 0.25);
    aliens.callAll('animations.add', 'animations', 'spin', [0, 1, 2], 10, true);
    aliens.callAll('animations.play', 'animations', 'spin');

    text6 = game.add.text(290, 470, 'Beware of the aliens', { font: ' 32px Rockwell', fill: '#F8E22E' });

    text7 = game.add.text(340, 530 - 10, 'HOTKEYS', { font: 'bold 32px Rockwell', fill: ' #ff0000' });

    var p = game.add.sprite(120, 570 - 10, 'p');
    p.scale.setTo(0.4, 0.4);

    text8 = game.add.text(180, 580 - 10, ': PAUSE', { font: '28px Rockwell', fill: '#F8E22E' });

    var f = game.add.sprite(120, 630 - 10, 'f');
    f.scale.setTo(0.4, 0.4);

    text9 = game.add.text(180, 640 - 10, ': TOGGLE FULLSCREEN', { font: '28px Rockwell', fill: '#F8E22E' });

    var r = game.add.sprite(540, 570 - 10, 'r');
    r.scale.setTo(0.4, 0.4);

    var text10 = game.add.text(600, 580 - 10, ': RETRY', { font: '28px Rockwell', fill: '#F8E22E' });

    var m = game.add.sprite(540, 630 - 10, 'm');
    m.scale.setTo(0.4, 0.4);

    var text11 = game.add.text(600, 640 - 10, ': TOGGLE MUTE', { font: '28px Rockwell', fill: '#F8E22E' });

    var mutebutton = game.input.keyboard.addKey(Phaser.Keyboard.M);
    mutebutton.onDown.add(mute, this);

    var fullbutton = game.input.keyboard.addKey(Phaser.Keyboard.F);
    fullbutton.onDown.add(goFull, this);

}

function update5() {

}

global.States = global.States || {};
global.States.gameState5 = {
    preload: preload5,
    create: create5,
    update: update5
};

})(this);
