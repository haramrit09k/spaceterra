/* global Phaser, game, UI, Progress */
(function (global) {
  /************************LANDING PAGE************************/

  var music;
  var accountItems = [];
  var progressListener = false;
  var refreshProgress = null;

  function preload1() {
    UI.preloadCommon();
    game.load.image('logo', 'assets/Space Terra LOGO4.png');
    game.load.image('googleG', 'assets/google-g.png');
    game.load.audio('mp3', 'media/music.mp3');
  }

  function create1() {
    if (game.sound.context && game.sound.context.state === 'suspended') game.sound.context.resume();
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.fullScreenScaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.refresh();

    if (!music || !music.isPlaying) {
      music = game.add.audio('mp3');
      music.play('', 0, 1, true);
    }

    UI.backdrop();
    var logo = game.add.sprite(game.width / 2, 225, 'logo');
    logo.anchor.setTo(0.5, 0.5);
    logo.scale.setTo(0.55, 0.55);

    var y = 410;
    [['START', global.actionOnClick], ['HANGAR', global.hangar], ['INSTRUCTIONS', global.instruct], ['LEADERBOARD', global.leaderBoard]]
      .forEach(function (item) {
        UI.pill(game.width / 2, y, 300, 66, item[0], item[1], this, 30);
        y += 82;
      }, this);

    UI.addCornerButtons.call(this);

    var coinIcon = game.add.sprite(game.width - 40, game.height - 40, UI.coinTexture());
    coinIcon.anchor.setTo(1, 0.5);
    coinIcon.scale.setTo(0.7);
    var coinText = UI.text(game.width - 80, game.height - 40, '', 24, UI.YELLOW, 1);
    var bestText = UI.text(game.width - 40, game.height - 80, '', 22, UI.YELLOW, 1);
    var syncText = UI.text(game.width - 30, 132, '', 16, '#fff', 1, false);
    function showProgress() {
      if (game.state.current !== 'gameState1') return;
      coinText.text = String(Progress.coins);
      bestText.text = Progress.best > 0 ? 'Your best: ' + Progress.best : '';
      syncText.text = Progress.synced ? 'Saved to your account' : '';
    }
    showProgress();
    if (!progressListener) {
      progressListener = true;
      Progress.onChange(function () { if (refreshProgress) refreshProgress(); });
    }
    refreshProgress = showProgress;

    showAccount(this);
  }

  /** Google sign-in on the web: greets the player and shows their server-side best. */
  function showAccount(context) {
    accountItems = [];
    fetch('/api/user')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (game.state.current !== 'gameState1') return;
        if (!data.user) {
          global.username = undefined;
          accountItems.push(UI.pill(game.width - 170, 45, 300, 54, 'Sign in with Google', function () {
            window.location = '/auth/google';
          }, context, 22, 'googleG'));
          return;
        }
        global.username = data.user.displayName || data.user.email;
        Progress.useAccount();
        var firstName = global.username.split(' ')[0];
        var hello = UI.text(game.width - 30, 35, 'Hi, ' + firstName, 24, UI.YELLOW, 1);
        accountItems.push(hello);
        accountItems.push(UI.pill(game.width - 95, 85, 130, 44, 'Log out', function () {
          window.location = '/logout';
        }, context, 20));
        loadProfilePicture(data, hello);
        loadStats();
      })
      .catch(function () { /* offline: play as a guest */ });
  }

  function loadProfilePicture(data, hello) {
    var url = data.user._json && data.user._json.picture;
    if (!url) return;
    var key = 'userProfilePic_' + Date.now();
    game.load.crossOrigin = 'anonymous';
    game.load.image(key, url);
    game.load.onLoadComplete.addOnce(function () {
      if (game.state.current !== 'gameState1' || !game.cache.checkImageKey(key)) return;
      var size = 44;
      var x = hello.x - hello.width - 10 - size / 2;
      var pic = game.add.sprite(x, hello.y, key);
      pic.anchor.setTo(0.5, 0.5);
      pic.width = size;
      pic.height = size;
      var mask = game.add.graphics(0, 0);
      mask.beginFill(0xffffff);
      mask.drawCircle(x, hello.y, size);
      pic.mask = mask;
    });
    game.load.start();
  }

  function loadStats() {
    fetch('/api/user/stats')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.score == null) return;
        // One "best" for the player: the saved best, lifted to their leaderboard best.
        Progress.raiseBestFromLeaderboard(data.score);
        if (game.state.current !== 'gameState1' || data.rank == null) return;
        UI.text(30, game.height - 40, 'Leaderboard rank: ' + data.rank, 22, UI.YELLOW);
      })
      .catch(function () {});
  }

  function update1() {
    UI.syncCornerButtons();
  }

  global.States = global.States || {};
  global.States.gameState1 = {
    preload: preload1,
    create: create1,
    update: update1,
  };
})(this);
