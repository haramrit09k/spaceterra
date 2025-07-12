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

    var onRecScore = function (data) {
        for (var i = 0; i < data.length; i++) {
            game.add.text(180, 295 + i * 52, i + 1, { fontSize: '24px', fill: '#F8E22E' });
            game.add.text(385, 295 + i * 52, data[i].username, { fontSize: '24px', fill: '#FFF' });
            game.add.text(670, 295 + i * 52, data[i].score, { fontSize: '24px', fill: '#F8E22E' });
        }
    };
    socket.on('rec_score', onRecScore);
    this.onRecScore = onRecScore;
};


function update4() {
};


/************************INSTRUCTIONS PAGE************************/


global.States = global.States || {};
global.States.gameState4 = {
    preload: preload4,
    create: create4,
    update: update4,
    shutdown: function() {
        socket.off('rec_score', this.onRecScore);
    }
};

})(this);
