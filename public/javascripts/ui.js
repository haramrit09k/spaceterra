/* global Phaser, game */
/**
 * Shared look for every screen: the Goldman font, yellow pill buttons in the
 * style of the original art, vector coin and power-up icons, and the
 * leaderboard table. Mirrors android/.../ui so both versions look alike.
 */
(function (global) {
  // Phaser 2 measures a font's height by drawing text on a canvas and scanning
  // its pixels for exact colours. Safari's fingerprinting protection adds
  // noise to canvas pixel reads, so on iPhones that scan reads every font as
  // several times too tall: lines spread apart and labels drop out of their
  // buttons. Ask the browser for the text bounds instead, which needs no pixel
  // reads, and keep Phaser's 6px of descent padding so layouts stay the same.
  (function measureFontsWithoutPixelReads() {
    var Text = global.Phaser && global.Phaser.Text;
    var ctx = Text && Text.fontPropertiesContext;
    var probe = ctx && ctx.measureText && ctx.measureText('|MÉq');
    if (!probe || typeof probe.actualBoundingBoxAscent !== 'number') return;
    Text.prototype.determineFontProperties = function (font) {
      var cached = Text.fontPropertiesCache[font];
      if (cached) return cached;
      ctx.font = font;
      var m = ctx.measureText('|MÉq');
      var ascent = Math.ceil(m.actualBoundingBoxAscent);
      var descent = Math.ceil(m.actualBoundingBoxDescent) + 6;
      cached = { ascent: ascent, descent: descent, fontSize: ascent + descent };
      Text.fontPropertiesCache[font] = cached;
      return cached;
    };
  })();

  var YELLOW = '#F8E22E';
  var YELLOW_HEX = 0xF8E22E;
  var FONT = 'Goldman, Impact, sans-serif';
  var POWER_UP_COLORS = { SHIELD: '#35C8FF', MAGNET: '#FF4D5E', DOUBLE_COINS: '#B46CFF' };

  function style(size, color, bold) {
    return {
      font: (bold === false ? '' : 'bold ') + size + 'px ' + FONT,
      fill: color || YELLOW,
      stroke: 'rgba(0,0,0,0.55)',
      strokeThickness: Math.max(2, Math.round(size / 10)),
    };
  }

  function text(x, y, value, size, color, anchorX, bold) {
    var t = game.add.text(x, y, value, style(size, color, bold));
    t.anchor.setTo(anchorX === undefined ? 0 : anchorX, 0.5);
    return t;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /** Creates (once) a cached texture drawn with the 2D canvas API. */
  function texture(key, w, h, draw) {
    if (!game.cache.checkImageKey(key)) {
      var bmd = game.make.bitmapData(w, h);
      draw(bmd.ctx, w, h);
      bmd.update();
      game.cache.addBitmapData(key, bmd);
      game.cache.addImage(key, null, bmd.canvas);
    }
    return key;
  }

  function pillTexture(w, h) {
    return texture('pill_' + w + 'x' + h, w, h, function (ctx) {
      var border = Math.max(3, Math.round(h * 0.07));
      roundRect(ctx, border / 2, border / 2, w - border, h - border, h / 4);
      ctx.fillStyle = YELLOW;
      ctx.fill();
      ctx.lineWidth = border;
      ctx.strokeStyle = '#E8231B';
      ctx.stroke();
    });
  }

  /**
   * A yellow pill button with black Goldman text, shrunk to fit. An optional
   * `icon` image key is drawn left of the label (e.g. the Google "G").
   */
  function pill(x, y, w, h, label, onClick, context, size, icon) {
    var button = game.add.button(x, y, pillTexture(w, h), onClick, context);
    button.anchor.setTo(0.5, 0.5);
    var fontSize = size || Math.round(h * 0.45);
    var iconSize = icon ? Math.round(h * 0.55) : 0;
    var gap = icon ? 10 : 0;
    var t = game.make.text(0, 2, label, { font: 'bold ' + fontSize + 'px ' + FONT, fill: '#000' });
    t.anchor.setTo(0.5, 0.5);
    var room = w - 40 - iconSize - gap;
    if (t.width > room) t.scale.setTo(room / t.width);
    if (icon) {
      // Centre the icon and label together as one group.
      var groupWidth = iconSize + gap + t.width;
      var img = game.make.image(-groupWidth / 2 + iconSize / 2, 0, icon);
      img.anchor.setTo(0.5, 0.5);
      img.width = img.height = iconSize;
      button.addChild(img);
      t.x = -groupWidth / 2 + iconSize + gap + t.width / 2;
    }
    button.addChild(t);
    button.label = t;
    button.onInputDown.add(function () { button.scale.setTo(0.95); });
    button.onInputUp.add(function () { button.scale.setTo(1); });
    return button;
  }

  function coinTexture() {
    return texture('coin', 44, 44, function (ctx, w) {
      var r = w / 2;
      ctx.fillStyle = '#B8860B';
      ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFD43B';
      ctx.beginPath(); ctx.arc(r, r, r * 0.82, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FFF3B0';
      ctx.beginPath(); ctx.ellipse(r * 0.75, r * 0.65, r * 0.2, r * 0.25, 0, 0, Math.PI * 2); ctx.fill();
    });
  }

  function powerUpTexture(kind) {
    return texture('pu_' + kind, 64, 64, function (ctx, w) {
      var r = w / 2;
      var color = POWER_UP_COLORS[kind];
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(r, r, r - 1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = w * 0.07;
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.arc(r, r, r * 0.88, 0, Math.PI * 2); ctx.stroke();
      var g = r * 0.55;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#fff';
      if (kind === 'SHIELD') {
        ctx.beginPath();
        ctx.moveTo(r, r - g);
        ctx.lineTo(r + g * 0.85, r - g * 0.6);
        ctx.quadraticCurveTo(r + g * 0.8, r + g * 0.6, r, r + g);
        ctx.quadraticCurveTo(r - g * 0.8, r + g * 0.6, r - g * 0.85, r - g * 0.6);
        ctx.closePath();
        ctx.fill();
      } else if (kind === 'MAGNET') {
        ctx.lineWidth = g * 0.45;
        ctx.beginPath();
        ctx.moveTo(r - g * 0.75, r - g * 0.8);
        ctx.lineTo(r - g * 0.75, r + g * 0.3);
        ctx.arc(r, r + g * 0.3, g * 0.75, Math.PI, 0, true);
        ctx.lineTo(r + g * 0.75, r - g * 0.8);
        ctx.stroke();
      } else {
        ctx.font = 'bold ' + Math.round(g * 1.35) + 'px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2x', r, r + 2);
      }
    });
  }

  /** The space background used by every menu screen. */
  function backdrop(dim) {
    var bg = game.add.sprite(-250, 0, 'frontsky');
    bg.scale.setTo(0.7, 0.75);
    if (dim) {
      var shade = game.add.graphics(0, 0);
      shade.beginFill(0x000000, dim);
      shade.drawRect(0, 0, game.width, game.height);
      shade.endFill();
    }
    return bg;
  }

  /** Assets every menu screen needs. Call from preload. */
  function preloadCommon() {
    game.load.image('frontsky', 'assets/SKYRED.PNG');
    game.load.image('backButton', 'assets/home.png');
    game.load.image('retryButton', 'assets/return.png');
    game.load.spritesheet('muteButton', 'assets/musicOnOff.png', 100, 100);
    game.load.spritesheet('fullButton', 'assets/fullScreen.png', 100, 100);
  }

  /** Fullscreen and mute toggles plus their F / M hotkeys, as on every original screen. */
  function addCornerButtons() {
    global.fullButton = game.add.button(70, 90, 'fullButton', global.goFull, this, 2, 1, 0);
    global.fullButton.scale.setTo(0.5, 0.5);
    global.muteButton = game.add.button(140, 80, 'muteButton', global.mute, this);
    global.muteButton.scale.setTo(0.7, 0.7);
    game.input.keyboard.addKey(Phaser.Keyboard.M).onDown.add(global.mute);
    game.input.keyboard.addKey(Phaser.Keyboard.F).onDown.add(global.goFull);
    syncCornerButtons();
  }

  function syncCornerButtons() {
    if (global.muteButton) global.muteButton.frame = game.sound.mute ? 0 : 1;
    if (global.fullButton) global.fullButton.frame = game.scale.isFullScreen ? 1 : 0;
  }

  /** Home (and optionally retry) icon buttons with labels underneath. */
  function addNavButtons(y, onHome, onRetry) {
    var homeX = onRetry ? 360 : 450;
    var home = game.add.button(homeX, y, 'backButton', onHome);
    home.anchor.setTo(0.5, 0.5);
    home.scale.setTo(0.6, 0.6);
    text(homeX, y + 45, 'Main Menu', 22, YELLOW, 0.5);
    if (onRetry) {
      var retry = game.add.button(540, y, 'retryButton', onRetry);
      retry.anchor.setTo(0.5, 0.5);
      retry.scale.setTo(0.6, 0.6);
      text(540, y + 45, 'Retry', 22, YELLOW, 0.5);
    }
  }

  /**
   * The "Rank / Pilot / Score" table. Returns { setEntries(list), destroy() } so
   * screens can fill it in when the server's top 7 arrive.
   */
  function leaderboardTable(top, highlightName) {
    var left = 70;
    var width = 760;
    var header = 56;
    var row = 50;
    var rows = 7;
    var g = game.add.graphics(0, 0);
    g.beginFill(YELLOW_HEX, 0.2);
    g.lineStyle(3, YELLOW_HEX, 0.7);
    g.drawRoundedRect(left - 7, top - 7, width + 14, header + row * rows + 14, 20);
    g.endFill();
    g.lineStyle(2, 0xffffff, 0.8);
    g.beginFill(0x101a55, 0.7);
    g.drawRoundedRect(left, top, width, header + row * rows, 12);
    g.endFill();
    g.lineStyle(0);
    g.beginFill(0x5b7fd6, 0.85);
    g.drawRoundedRect(left, top, width, header, 12);
    g.endFill();
    g.lineStyle(2, 0xffffff, 0.6);
    g.moveTo(left + 150, top); g.lineTo(left + 150, top + header + row * rows);
    g.moveTo(left + 570, top); g.lineTo(left + 570, top + header + row * rows);
    g.lineStyle(1, 0xffffff, 0.3);
    for (var i = 1; i < rows; i++) {
      g.moveTo(left, top + header + i * row); g.lineTo(left + width, top + header + i * row);
    }
    var highlight = game.add.graphics(0, 0);

    var rankX = left + 75;
    var nameX = left + 360;
    var scoreX = left + 665;
    text(rankX, top + header / 2, 'Rank', 28, '#fff', 0.5);
    text(nameX, top + header / 2, 'Pilot', 28, '#fff', 0.5);
    text(scoreX, top + header / 2, 'Score', 28, '#fff', 0.5);

    var cells = [];
    for (var j = 0; j < rows; j++) {
      var y = top + header + j * row + row / 2;
      cells.push({
        rank: text(rankX, y, '', 24, YELLOW, 0.5),
        name: text(nameX, y, '', 24, '#fff', 0.5),
        score: text(scoreX, y, '', 24, YELLOW, 0.5),
      });
    }
    var message = text(left + width / 2, top + header + row * 3.5, 'Loading leaderboard…', 24, '#fff', 0.5);

    return {
      height: header + row * rows,
      setEntries: function (entries) {
        message.visible = entries.length === 0;
        message.text = 'No scores yet. Be the first!';
        highlight.clear();
        for (var k = 0; k < rows; k++) {
          var entry = entries[k];
          var cell = cells[k];
          var name = entry ? String(entry.username || 'Guest') : '';
          if (name.length > 22) name = name.slice(0, 21) + '…';
          cell.rank.text = entry ? String(k + 1) : '';
          cell.name.text = name;
          cell.score.text = entry ? String(entry.score) : '';
          if (entry && highlightName && entry.username === highlightName) {
            highlight.beginFill(YELLOW_HEX, 0.25);
            highlight.drawRoundedRect(left + 4, top + header + k * row + 4, width - 8, row - 8, 8);
            highlight.endFill();
          }
        }
      },
    };
  }

  global.UI = {
    YELLOW: YELLOW,
    FONT: FONT,
    POWER_UP_COLORS: POWER_UP_COLORS,
    style: style,
    text: text,
    pill: pill,
    coinTexture: coinTexture,
    powerUpTexture: powerUpTexture,
    backdrop: backdrop,
    preloadCommon: preloadCommon,
    addCornerButtons: addCornerButtons,
    syncCornerButtons: syncCornerButtons,
    addNavButtons: addNavButtons,
    leaderboardTable: leaderboardTable,
  };
})(this);
