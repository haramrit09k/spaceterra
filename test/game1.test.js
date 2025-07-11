const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadGame() {
  const files = [
    '../public/javascripts/utils.js',
    '../public/javascripts/states/landing.js',
    '../public/javascripts/states/gameplay.js',
    '../public/javascripts/states/gameover.js',
    '../public/javascripts/states/leaderboard.js',
    '../public/javascripts/states/instructions.js',
    '../public/javascripts/game.js'
  ];
  const context = {
    console: { log: () => {} },
    prompt: () => 'test',
    alert: () => {},
    fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
    window: { CONFIG: { origin: '' } },
    Phaser: {
      CANVAS: 0,
      Keyboard: { M: 0, F: 0 },
      ScaleManager: { SHOW_ALL: 0 },
      Physics: { ARCADE: 0 },
      Game: function () {
        return {
          state: { add: jest.fn(), start: jest.fn() },
          scale: {
            pageAlignHorizontally: false,
            pageAlignVertically: false,
            refresh: jest.fn(),
            fullScreenScaleMode: null,
          },
          add: {
            sprite: jest.fn(() => ({ scale: { setTo: jest.fn() } })),
            button: jest.fn(() => ({ scale: { setTo: jest.fn() } })),
            audio: jest.fn(() => ({ play: jest.fn() })),
            text: jest.fn(),
          },
          physics: { startSystem: jest.fn() },
          input: { keyboard: { addKey: jest.fn(() => ({ onDown: { add: jest.fn() } })) } },
          sound: { context: { state: 'running', resume: jest.fn() }, mute: false },
        };
      },
    },
    io: () => ({ on: jest.fn(), emit: jest.fn() }),
  };
  vm.createContext(context);
  for (const file of files) {
    const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
    vm.runInContext(code, context);
  }
  return context;
}

test('game states are defined', () => {
  const ctx = loadGame();
  expect(ctx.States.gameState1).toBeDefined();
  expect(ctx.States.gameState2).toBeDefined();
  expect(ctx.States.gameState3).toBeDefined();
  expect(ctx.States.gameState4).toBeDefined();
  expect(ctx.States.gameState5).toBeDefined();
});
