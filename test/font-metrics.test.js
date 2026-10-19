const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Phaser 2 originally measured fonts by scanning canvas pixels, which Safari's
// fingerprinting protection scrambles. ui.js swaps in a TextMetrics-based
// measurement; check it is installed and never touches pixels.
function loadUi(measureText) {
  const getImageData = jest.fn();
  const Text = function () {};
  Text.prototype.determineFontProperties = () => { throw new Error('pixel scan used'); };
  Text.fontPropertiesCache = {};
  Text.fontPropertiesContext = { measureText, getImageData, font: '' };
  const context = { Phaser: { Text } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/javascripts/ui.js'), 'utf8'), context);
  return { Text, getImageData };
}

test('measures fonts with TextMetrics, keeping Phaser\'s descent padding', () => {
  const measureText = jest.fn(() => ({ width: 80, actualBoundingBoxAscent: 24.2, actualBoundingBoxDescent: 5.1 }));
  const { Text, getImageData } = loadUi(measureText);
  const props = Text.prototype.determineFontProperties('bold 30px Goldman');
  expect(props).toEqual({ ascent: 25, descent: 12, fontSize: 37 });
  expect(getImageData).not.toHaveBeenCalled();
  // Cached per font string, like Phaser's own implementation.
  Text.prototype.determineFontProperties('bold 30px Goldman');
  expect(measureText).toHaveBeenCalledTimes(2); // one feature probe + one measurement
});

test('keeps Phaser\'s own measurement on browsers without TextMetrics bounds', () => {
  const { Text } = loadUi(() => ({ width: 80 }));
  expect(() => Text.prototype.determineFontProperties('bold 30px Goldman')).toThrow('pixel scan used');
});
