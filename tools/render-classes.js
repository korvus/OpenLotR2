/*
 * Rend la carte colorée par classe de terrain (couche 0), 4 px par tuile,
 * pour comprendre la sémantique des classes.
 *
 * Usage : node tools/render-classes.js <map.json> <sortie.png>
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const [, , mapPath, outPath] = process.argv;
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

const colors = {
  0: [60, 180, 60],    // vert
  1: [120, 200, 120],
  2: [180, 220, 120],
  3: [220, 220, 100],
  4: [40, 80, 200],    // bleu — eau présumée
  8: [20, 100, 20],    // vert sombre — forêt présumée
  10: [120, 120, 220],
  16: [200, 160, 80],
  18: [255, 0, 255],
  32: [140, 100, 60],  // brun — montagne présumée
  64: [240, 80, 80],   // rouge — ville présumée
  128: [240, 240, 240] // blanc
};

const W = map.width, H = map.height, S = 4;
const png = new PNG({ width: W * S, height: H * S });
const cls = map.layers.terrainClass;

for (let y = 0; y < H * S; y++) {
  for (let x = 0; x < W * S; x++) {
    const v = cls[Math.floor(y / S) * W + Math.floor(x / S)];
    const c = colors[v] || [255, 0, 0];
    const i = (y * W * S + x) * 4;
    png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
  }
}
fs.writeFileSync(outPath, PNG.sync.write(png));

const seen = {};
cls.forEach(v => seen[v] = (seen[v] || 0) + 1);
console.log('classes:', JSON.stringify(seen));
console.log(`-> ${outPath}`);
