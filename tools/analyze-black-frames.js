/*
 * Classe chaque frame d'une planche : vide (transparente), noire opaque,
 * ou dessinée. Compare deux planches pour décider la règle de composition.
 *
 * Usage : node tools/analyze-black-frames.js <planche1.png> <planche2.png>
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const FRAME_W = 64, FRAME_H = 34, COLS = 10, ROWS = 14;

function classify(sheet, id) {
  const sx = (id % COLS) * FRAME_W;
  const sy = Math.floor(id / COLS) * FRAME_H;
  let opaque = 0, black = 0;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const i = ((sy + y) * sheet.width + sx + x) * 4;
      if (sheet.data[i + 3] === 0) continue;
      opaque++;
      if (sheet.data[i] < 8 && sheet.data[i + 1] < 8 && sheet.data[i + 2] < 8) black++;
    }
  }
  if (opaque === 0) return 'vide';
  if (black / opaque > 0.95) return 'noire';
  return 'ok';
}

const [, , aPath, bPath] = process.argv;
const A = PNG.sync.read(fs.readFileSync(aPath));
const B = PNG.sync.read(fs.readFileSync(bPath));

const result = {};
for (let id = 0; id < COLS * ROWS; id++) {
  const key = `${classify(A, id)} / ${classify(B, id)}`;
  if (!result[key]) result[key] = [];
  result[key].push(id);
}
Object.entries(result).forEach(([k, ids]) =>
  console.log(`${aPath.split(/[\\/]/).pop()} / ${bPath.split(/[\\/]/).pop()} — ${k}: ${ids.length} frames [${ids.join(',')}]`));
