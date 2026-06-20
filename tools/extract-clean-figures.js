/*
 * Découpe PROPRE des ouvriers villageois depuis les .PL8 d'animation.
 *
 * Les tuiles VILLANI* sont des frames rectangulaires opaques : un petit
 * personnage posé sur un carré de terrain (herbe/terre). Les anciens
 * extracteurs (frame-diff, color-key) laissaient du bruit et des trous.
 *
 * Ici : on retire le TERRAIN par remplissage depuis les bords (le terrain
 * touche forcément le bord), la figure centrale reste intacte ; puis on
 * supprime les petits îlots (bruit) et on recadre serré.
 *
 * Usage: node tools/extract-clean-figures.js <PL8-dir> <out-dir>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir] = process.argv;
if (!outDir) { throw new Error('usage: extract-clean-figures.js <PL8-dir> <out-dir>'); }
fs.mkdirSync(outDir, { recursive: true });
const palette = readPalette(path.join(pl8Dir, 'LORDS2.256'));

// Indices palette « terrain » : verts (herbe) et bruns/gris ternes (terre,
// roche). On les détecte par couleur plutôt que par index pour rester robuste
// d'une tuile à l'autre.
function isTerrainColor (r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx - mn;
  // herbe : vert dominant
  if (g >= r && g >= b && g > 40 && sat > 12 && !(r > g * 0.95 && r > 120)) return true;
  // terre/roche : brun ou gris peu saturés et plutôt sombres-moyens
  if (sat < 45 && mx < 170 && mx > 35 && !(r > g + 25 && r > b + 25)) return true;
  // brun terre franc (r>g>b modéré)
  if (r > g && g > b && r < 170 && sat < 70 && b < 90 && !(r > 150 && g < 90)) return true;
  return false;
}

function loadTile (buffer, tile) {
  // tuile brute width*height (extraType 0)
  const w = tile.width;
  const h = tile.height;
  const idx = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) { idx[i] = buffer[tile.offset + i]; }
  return { w, h, idx };
}

function cleanFigure (buffer, tile, opts = {}) {
  const minBlob = opts.minBlob || 10;
  const { w, h, idx } = loadTile(buffer, tile);
  const N = w * h;
  const rgb = new Array(N);
  const terrain = new Uint8Array(N); // 1 = couleur terrain (candidat fond)
  for (let i = 0; i < N; i++) {
    const v = idx[i];
    const c = palette[v];
    rgb[i] = c;
    if (v === 0) { terrain[i] = 1; continue; }
    if (isTerrainColor(c[0], c[1], c[2])) { terrain[i] = 1; }
  }

  // Remplissage depuis les bords à travers les pixels terrain → fond.
  const bg = new Uint8Array(N);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (bg[i] || !terrain[i]) return;
    bg[i] = 1; stack.push(i);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w, y = (i / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // Opaque = pixel non-fond et non index 0.
  const opaque = new Uint8Array(N);
  for (let i = 0; i < N; i++) { if (!bg[i] && idx[i] !== 0) opaque[i] = 1; }

  // Supprime les petits îlots (bruit) : composantes connexes < minBlob.
  const comp = new Int32Array(N).fill(-1);
  let cid = 0;
  const sizes = [];
  for (let i = 0; i < N; i++) {
    if (!opaque[i] || comp[i] !== -1) continue;
    const q = [i]; comp[i] = cid; let sz = 0;
    while (q.length) {
      const j = q.pop(); sz++;
      const x = j % w, y = (j / w) | 0;
      const nb = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (opaque[k] && comp[k] === -1) { comp[k] = cid; q.push(k); }
      }
    }
    sizes[cid] = sz; cid++;
  }
  let big;
  if (opts.keepLargest) {
    // Ne garde que la plus grosse composante (la figure), tout le reste = bruit.
    let bestId = -1, bestSz = -1;
    for (let k = 0; k < sizes.length; k++) { if (sizes[k] > bestSz) { bestSz = sizes[k]; bestId = k; } }
    big = sizes.map((s, k) => k === bestId);
  } else {
    big = sizes.map(s => s >= minBlob);
  }
  for (let i = 0; i < N; i++) { if (opaque[i] && !big[comp[i]]) opaque[i] = 0; }

  // bbox
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (opaque[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) { return null; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const png = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = (y0 + y) * w + (x0 + x);
    const di = (y * cw + x) * 4;
    if (opaque[si]) {
      png.data[di] = rgb[si][0]; png.data[di + 1] = rgb[si][1]; png.data[di + 2] = rgb[si][2]; png.data[di + 3] = 255;
    } else { png.data[di + 3] = 0; }
  }
  return { png, cw, ch, opaqueCount: opaque.reduce((a, v) => a + v, 0) };
}

// Tuiles RLE (FLAGS1x : troupeaux/drapeaux) : flux de jetons, déjà
// transparentes (00 XX = saut), donc pas de flood-fill nécessaire.
function rleClean (buffer, tile) {
  const w = tile.width, h = tile.height;
  const png = new PNG({ width: w, height: h });
  let s = tile.offset, x = 0, y = 0;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  while (s < buffer.length && y < h) {
    const n = buffer[s++];
    if (n === 0) { x += buffer[s++]; }
    else {
      for (let k = 0; k < n && s < buffer.length; k++) {
        const v = buffer[s++];
        if (v !== 0 && x < w && y < h) {
          const c = palette[v]; const di = (y * w + x) * 4;
          png.data[di] = c[0]; png.data[di + 1] = c[1]; png.data[di + 2] = c[2]; png.data[di + 3] = 255;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        x++;
      }
    }
    while (x >= w) { x -= w; y++; }
  }
  if (x1 < 0) return null;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) {
    const si = ((y0 + yy) * w + (x0 + xx)) * 4; const di = (yy * cw + xx) * 4;
    out.data[di] = png.data[si]; out.data[di + 1] = png.data[si + 1];
    out.data[di + 2] = png.data[si + 2]; out.data[di + 3] = png.data[si + 3];
  }
  return out;
}

function rawTransparentTile (buffer, tile) {
  const png = new PNG({ width: tile.width, height: tile.height });
  for (let i = 0; i < tile.width * tile.height; i++) {
    const value = buffer[tile.offset + i];
    const p = i * 4;
    if (value === 0) {
      png.data[p + 3] = 0;
      continue;
    }
    const c = palette[value];
    png.data[p] = c[0];
    png.data[p + 1] = c[1];
    png.data[p + 2] = c[2];
    png.data[p + 3] = 255;
  }
  return png;
}

function dumpRle (file, label, first, last) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  for (let t = first; t <= last; t++) {
    if (!image.tiles[t]) continue;
    const png = rleClean(buffer, image.tiles[t]);
    if (png) fs.writeFileSync(path.join(outDir, `${label}-${String(t).padStart(2, '0')}.png`), PNG.sync.write(png));
  }
}

function dumpRange (file, label, first, last, opts) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  for (let t = first; t <= last; t++) {
    if (!image.tiles[t]) continue;
    const res = cleanFigure(buffer, image.tiles[t], opts);
    if (!res) continue;
    fs.writeFileSync(path.join(outDir, `${label}-${String(t).padStart(2, '0')}.png`), PNG.sync.write(res.png));
  }
}

function writeAnimatedDiffFigure (file, name, first, last, frameIndex) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  const tiles = image.tiles.slice(first, last + 1);
  const frame = tiles[frameIndex];
  const frames = tiles.map(tile => {
    const values = new Uint8Array(tile.width * tile.height);
    for (let i = 0; i < values.length; i++) { values[i] = buffer[tile.offset + i]; }
    return values;
  });
  const source = frames[frameIndex];
  const mask = new Uint8Array(source.length);

  for (let i = 0; i < source.length; i++) {
    let same = true;
    for (let k = 1; k < frames.length; k++) {
      if (frames[k][i] !== frames[0][i]) { same = false; break; }
    }
    if (!same && source[i] !== 0) {
      const [r, g, b] = palette[source[i]];
      const blueCloth = b > r + 8 && b >= g - 4 && b > 45;
      const paleCloth = r > 105 && g > 95 && b > 75 && Math.max(r, g, b) - Math.min(r, g, b) < 70;
      const redClothOrSkin = r > 75 && r > g * 1.08 && r > b * 1.12;
      if (blueCloth || paleCloth || redClothOrSkin) { mask[i] = 1; }
    }
  }

  const expanded = mask.slice();
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (!mask[y * frame.width + x]) { continue; }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && py >= 0 && px < frame.width && py < frame.height) {
            const index = py * frame.width + px;
            if (source[index] !== 0) {
              const [r, g, b] = palette[source[index]];
              const darkOutline = Math.max(r, g, b) < 80;
              if (darkOutline || mask[index]) { expanded[index] = 1; }
            }
          }
        }
      }
    }
  }

  const seen = new Uint8Array(source.length);
  const keep = new Uint8Array(source.length);
  for (let i = 0; i < expanded.length; i++) {
    if (!expanded[i] || seen[i]) { continue; }
    const queue = [i];
    const component = [];
    seen[i] = 1;
    while (queue.length) {
      const current = queue.pop();
      component.push(current);
      const x = current % frame.width;
      const y = (current / frame.width) | 0;
      for (const [px, py] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        const index = py * frame.width + px;
        if (px >= 0 && py >= 0 && px < frame.width && py < frame.height && expanded[index] && !seen[index]) {
          seen[index] = 1;
          queue.push(index);
        }
      }
    }
    if (component.length >= 5) {
      for (const index of component) { keep[index] = 1; }
    }
  }

  let x0 = frame.width;
  let y0 = frame.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (!keep[y * frame.width + x]) { continue; }
      if (x < x0) { x0 = x; }
      if (x > x1) { x1 = x; }
      if (y < y0) { y0 = y; }
      if (y > y1) { y1 = y; }
    }
  }
  if (x1 < 0) { return; }

  const png = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  png.data.fill(0);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const sourceIndex = (y0 + y) * frame.width + (x0 + x);
      if (!keep[sourceIndex]) { continue; }
      const [r, g, b] = palette[source[sourceIndex]];
      const p = (y * png.width + x) * 4;
      png.data[p] = r;
      png.data[p + 1] = g;
      png.data[p + 2] = b;
      png.data[p + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
}

// Dump toutes les frames par métier pour choisir la pose la plus lisible.
dumpRange('VILLANI2.PL8', 'farm', 0, 6);
dumpRange('VILLANI2.PL8', 'wood', 7, 14);
dumpRange('VILLANI2.PL8', 'quarry', 25, 32);
dumpRange('VILLANI2.PL8', 'smithy', 33, 39);
// Mode --final : écrit directement les sprites nommés (poses choisies à la
// main après inspection des contact sheets) prêts pour le renderer.
if (process.argv.includes('--final')) {
  const FINAL = [
    ['VILLANI2.PL8', 3, 'labor-figure-small', {}],     // grain : attelage de labour
    ['VILLANI2.PL8', 12, 'labor-figure-wood', {}],     // bois : bûcheron
    ['VILLANI2.PL8', 28, 'labor-figure-kneeling', {}], // pierre/fer/défrichage : carrier/mineur
    ['VILLANI2.PL8', 35, 'labor-figure-smithy', {}],   // forge : foyer
    ['VILLANI1.PL8', 5, 'labor-figure-castle', {}]     // château : échafaudage + bâtisseur
  ];
  for (const [file, tile, name, opts] of FINAL) {
    const buffer = fs.readFileSync(path.join(pl8Dir, file));
    const image = Pl8.parse(buffer);
    const res = cleanFigure(buffer, image.tiles[tile], opts);
    if (!res) { console.log('skip', name); continue; }
    fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(res.png));
  }
  // Les vilains manipulables de VILLAGE3 sont extraits par différence
  // d'animation : le fond fixe de la zone disparaît, le personnage complet
  // reste. Le flood-fill couleur les rabotait en fragments.
  writeAnimatedDiffFigure('VILLAGE3.PL8', 'labor-figure-idle', 0, 6, 5);
  writeAnimatedDiffFigure('VILLAGE3.PL8', 'labor-figure-cattle', 0, 6, 2);
  console.log(`Final named figures -> ${outDir}`);
} else {
  dumpRange('VILLANI1.PL8', 'builder', 0, 14);
  dumpRange('VILLANI2.PL8', 'mid', 15, 24);
  dumpRange('VILLAGE3.PL8', 'v3', 0, 30);
  dumpRange('PEASANT.PL8', 'peasant', 0, 40);
  dumpRle('PEASANT.PL8', 'peasantR', 0, 60);
  console.log(`Clean figures -> ${outDir}`);
}
module.exports = { cleanFigure };
