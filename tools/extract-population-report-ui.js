/*
 * Extract the original population and happiness report graph backgrounds from
 * GRAPHS.PL8.
 *
 * Usage:
 *   node tools/extract-population-report-ui.js <PL8-directory> <output-directory>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir] = process.argv;
if (!outDir) {
  throw new Error('usage: extract-population-report-ui.js <PL8-directory> <output-directory>');
}

fs.mkdirSync(outDir, { recursive: true });

const palette = readPalette(path.join(pl8Dir, 'LORDS2.256'));
const buffer = fs.readFileSync(path.join(pl8Dir, 'GRAPHS.PL8'));
const image = Pl8.parse(buffer);

function rawTile (tile) {
  const png = new PNG({ width: tile.width, height: tile.height });
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const value = buffer[tile.offset + y * tile.width + x];
      const i = (y * tile.width + x) * 4;
      png.data[i] = palette[value][0];
      png.data[i + 1] = palette[value][1];
      png.data[i + 2] = palette[value][2];
      png.data[i + 3] = 255;
    }
  }
  return png;
}

// GRAPHS.PL8 tile 0 is the village photo behind the population columns.
fs.writeFileSync(
  path.join(outDir, 'population-report-background.png'),
  PNG.sync.write(rawTile(image.tiles[0]))
);

// GRAPHS.PL8 tile 1 is the interior scene behind the happiness columns.
fs.writeFileSync(
  path.join(outDir, 'happiness-report-background.png'),
  PNG.sync.write(rawTile(image.tiles[1]))
);

console.log(`Population report UI -> ${outDir}`);
