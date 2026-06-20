/*
 * Extracts the original blacksmith screen from SMITHY.PL8 and the six
 * selected-weapon/table overlays from HEARTH.PL8.
 *
 * Usage: node tools/extract-blacksmith-ui.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { drawRleTile, readPalette } = require('./lib/pl8-draw');

const GAME = 'D:/sites/lordOfTheRealms/lordsoftherealm2_dos_win/Lords of the Realm 2/lotr2/PL8';
const OUT = path.join(__dirname, '../src/renderer/public/images/scenes/MainScene/blacksmith');
const palette = readPalette(path.join(GAME, 'LORDS2.256'));

fs.mkdirSync(OUT, { recursive: true });

function writePng (name, width, height, draw) {
  const png = new PNG({ width, height });
  draw((x, y, index) => {
    if (x < 0 || y < 0 || x >= width || y >= height) { return; }
    const [r, g, b] = palette[index];
    const offset = (y * width + x) * 4;
    png.data[offset] = r;
    png.data[offset + 1] = g;
    png.data[offset + 2] = b;
    png.data[offset + 3] = index === 0 ? 0 : 255;
  });
  fs.writeFileSync(path.join(OUT, name), PNG.sync.write(png));
}

const smithyBuffer = fs.readFileSync(path.join(GAME, 'SMITHY.PL8'));
const smithy = Pl8.parse(smithyBuffer);
const background = smithy.tiles[0];
writePng('background.png', background.width, background.height, put => {
  const data = smithyBuffer.subarray(
    background.offset,
    background.offset + background.width * background.height
  );
  for (let y = 0; y < background.height; y++) {
    for (let x = 0; x < background.width; x++) {
      put(x, y, data[y * background.width + x]);
    }
  }
});

const hearthBuffer = fs.readFileSync(path.join(GAME, 'HEARTH.PL8'));
const hearth = Pl8.parse(hearthBuffer);
const weapons = {
  crossbow: 11,
  mace: 12,
  sword: 13,
  pike: 14,
  bow: 15,
  knight: 16
};

for (const [name, index] of Object.entries(weapons)) {
  const tile = hearth.tiles[index];
  const next = hearth.tiles[index + 1];
  const dataLength = (next ? next.offset : hearthBuffer.length) - tile.offset;
  writePng(`${name}.png`, tile.width, tile.height, put => {
    drawRleTile(tile, hearthBuffer, dataLength, 0, 0, put);
  });
}

console.log(`Blacksmith UI extracted to ${OUT}`);
