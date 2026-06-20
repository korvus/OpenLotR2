/*
 * Icônes de l'écran des rations :
 *   - depuis la CAPTURE DE RÉFÉRENCE doc/captures/rations-panel-fr.png
 *     (DOSBox 1:1, palette exacte) : flèches ▲▼ du palier, panier de pain,
 *     poignée-fourche et flèches ◄ ► du curseur, bouton de fermeture
 *     (flèche sur disque noir, le même que la jauge de la mini-carte),
 *     petit personnage de la ligne « Nourris » — fond parchemin conservé
 *     (le panneau est dessiné sur la même texture) ; ❓ à ré-extraire des
 *     PL8 d'origine quand leur planche source sera identifiée ;
 *   - depuis MISC_CTY.PL8 : cœur (#23), fromage (#42), vache (#43), fond
 *     (index 0) transparent.
 *
 * Usage : node tools/extract-rations-ui.js <dossier-PL8> <dossier-sortie>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const cap = PNG.sync.read(fs.readFileSync(path.join(__dirname, '..', 'doc', 'captures', 'rations-panel-fr.png')));

const BOXES = {
  'rations-up': [343, 128, 27, 30],
  'rations-down': [372, 128, 28, 30],
  'rations-basket': [142, 214, 42, 34],
  'rations-fork': [218, 208, 16, 42],
  'rations-arrowl': [198, 219, 20, 22],
  'rations-arrowr': [322, 219, 20, 22],
  'rations-close': [380, 298, 34, 34],
  'rations-figure': [142, 283, 14, 20],
  // The original 44x32 crop ended on opaque pixels and cut the cow's legs.
  'rations-cowbig': [364, 204, 48, 38]
};
for (const [name, [x0, y0, w, h]] of Object.entries(BOXES)) {
  const png = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * cap.width + x0 + x) * 4;
      const di = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) { png.data[di + c] = cap.data[si + c]; }
    }
  }
  fs.writeFileSync(path.join(outDir, name + '.png'), PNG.sync.write(png));
  if (name === 'rations-close') {
    const transparent = new PNG({ width: w, height: h });
    for (let i = 0; i < png.data.length; i += 4) {
      const r = png.data[i];
      const g = png.data[i + 1];
      const b = png.data[i + 2];
      // Keep the dark gauntlet/arrow and its grey highlight, discard the
      // parchment copied from the screenshot.
      if ((r + g + b) / 3 < 105) {
        transparent.data[i] = r;
        transparent.data[i + 1] = g;
        transparent.data[i + 2] = b;
        transparent.data[i + 3] = 255;
      }
    }
    fs.writeFileSync(path.join(outDir, 'rations-close-transparent.png'), PNG.sync.write(transparent));
  }
}

const pal = readPalette(path.join(pl8Dir, 'BASE01.256'));
const buf = fs.readFileSync(path.join(pl8Dir, 'MISC_CTY.PL8'));
const img = Pl8.parse(buf);
const PICKS = { 'rations-heart': 23, 'rations-cheese': 42, 'rations-cow': 43 };
for (const [name, idx] of Object.entries(PICKS)) {
  const t = img.tiles[idx];
  const png = new PNG({ width: t.width, height: t.height });
  for (let y = 0; y < t.height; y++) {
    for (let x = 0; x < t.width; x++) {
      const v = buf[t.offset + y * t.width + x];
      if (v === 0) { continue; }
      const i = (y * t.width + x) * 4;
      png.data[i] = pal[v][0];
      png.data[i + 1] = pal[v][1];
      png.data[i + 2] = pal[v][2];
      png.data[i + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, name + '.png'), PNG.sync.write(png));
}
console.log('icônes rations -> ' + outDir);
