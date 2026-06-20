/*
 * Inspecte un slot de L2_MAPS.DAT.
 *
 * Format (doc/technical/file-types/L2_maps.dat.rst, vérifié à l'octet près) :
 *   40 slots × (6 couches de 64×64 octets + 1 bitmap 65×129) = 1 318 440 octets.
 *
 * Dump chaque couche en PNG niveaux de gris (×4) dans tools/out/ + histogramme,
 * pour identifier la sémantique des couches.
 *
 * Usage : node tools/inspect-maps.js <L2_MAPS.DAT> <slot>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const LAYERS = 6;
const LAYER_SIZE = 64 * 64;
const EXTRA_W = 65;
const EXTRA_H = 129;
const SLOT_SIZE = LAYERS * LAYER_SIZE + EXTRA_W * EXTRA_H;

const [, , datPath, slotArg] = process.argv;
const slot = parseInt(slotArg || '0', 10);

const buf = fs.readFileSync(datPath);
console.log(`fichier: ${buf.length} octets, ${buf.length / SLOT_SIZE} slots`);

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

function dumpGray(name, data, w, h, scale) {
  const png = new PNG({ width: w * scale, height: h * scale });
  // normalisation : étire min..max sur 0..255 pour rendre visibles les
  // couches à faible amplitude
  let min = 255, max = 0;
  for (const v of data) { if (v < min) min = v; if (v > max) max = v; }
  const range = Math.max(1, max - min);
  for (let y = 0; y < h * scale; y++) {
    for (let x = 0; x < w * scale; x++) {
      const v = data[Math.floor(y / scale) * w + Math.floor(x / scale)];
      const g = Math.round(((v - min) / range) * 255);
      const idx = (y * w * scale + x) * 4;
      png.data[idx] = g; png.data[idx + 1] = g; png.data[idx + 2] = g; png.data[idx + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, name), PNG.sync.write(png));
}

const base = slot * SLOT_SIZE;
for (let l = 0; l < LAYERS; l++) {
  const data = buf.slice(base + l * LAYER_SIZE, base + (l + 1) * LAYER_SIZE);
  const hist = {};
  for (const v of data) hist[v] = (hist[v] || 0) + 1;
  const entries = Object.entries(hist).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 8).map(([v, n]) => `${v}:${n}`).join(' ');
  console.log(`slot ${slot} couche ${l}: ${entries.length} valeurs distinctes, top: ${top}`);
  dumpGray(`slot${slot}-layer${l}.png`, data, 64, 64, 4);
}

const extra = buf.slice(base + LAYERS * LAYER_SIZE, base + SLOT_SIZE);
dumpGray(`slot${slot}-extra.png`, extra, EXTRA_W, EXTRA_H, 2);
console.log(`PNG écrits dans ${outDir}`);
