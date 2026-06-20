/*
 * Extract the Custom Game opponent shields and portraits from MISC_SEL.PL8.
 *
 * Usage:
 *   node tools/extract-custom-game-ui.js <PL8-directory> <output-directory>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir] = process.argv;
if (!outDir) {
  throw new Error('usage: extract-custom-game-ui.js <PL8-directory> <output-directory>');
}
fs.mkdirSync(outDir, { recursive: true });

const buffer = fs.readFileSync(path.join(pl8Dir, 'MISC_SEL.PL8'));
const image = Pl8.parse(buffer);
const palette = readPalette(path.join(pl8Dir, 'MISC_SEL.256'));

const PICKS = {
  'custom-shield-red': 0,
  'custom-shield-red-off': 1,
  'custom-shield-yellow': 2,
  'custom-shield-yellow-off': 3,
  'custom-shield-black': 4,
  'custom-shield-black-off': 5,
  'custom-shield-purple': 6,
  'custom-shield-purple-off': 7,
  'custom-shield-blue': 8,
  'custom-shield-blue-off': 9,
  'custom-face-knight': 10,
  'custom-face-baron': 11,
  'custom-face-countess': 12,
  'custom-face-bishop': 13,
  'custom-face-player': 14
};

for (const [name, index] of Object.entries(PICKS)) {
  const tile = image.tiles[index];
  const png = new PNG({ width: tile.width, height: tile.height });
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const value = buffer[tile.offset + y * tile.width + x];
      if (value === 0) continue;
      const i = (y * tile.width + x) * 4;
      png.data[i] = palette[value][0];
      png.data[i + 1] = palette[value][1];
      png.data[i + 2] = palette[value][2];
      png.data[i + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
}

console.log(`Custom Game UI -> ${outDir}`);
