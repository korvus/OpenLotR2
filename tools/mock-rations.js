/*
 * Boucle graphique de l'écran des rations : compose hors-jeu le panneau
 * tel que buildRationsDialog() le dessine (mêmes coordonnées — à garder
 * synchronisées à la main) et le met côte à côte avec la référence DOS
 * (doc/captures/rations-panel-fr.png, panneau en (128,97) 287×238).
 *
 * Usage : node tools/mock-rations.js  → tools/out/rations-compare.png
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const PUB = path.join(__dirname, '..', 'src', 'renderer', 'public');
const FEAT = path.join(PUB, 'images', 'scenes', 'MainScene', 'features');
const readPng = p => PNG.sync.read(fs.readFileSync(p));

const W = 287;
const H = 238;
const out = new PNG({ width: W, height: H });

// fond : parchemin répété + liseré
const parch = readPng(path.join(FEAT, 'parchment.png'));
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const si = ((y % parch.height) * parch.width + (x % parch.width)) * 4;
    const di = (y * W + x) * 4;
    for (let c = 0; c < 4; c++) { out.data[di + c] = parch.data[si + c]; }
  }
}
for (let x = 0; x < W; x++) { setPx(x, 0, 42, 36, 22); setPx(x, H - 1, 42, 36, 22); }
for (let y = 0; y < H; y++) { setPx(0, y, 42, 36, 22); setPx(W - 1, y, 42, 36, 22); }

function setPx (x, y, r, g, b) {
  if (x < 0 || y < 0 || x >= W || y >= H) { return; }
  const i = (y * W + x) * 4;
  out.data[i] = r;
  out.data[i + 1] = g;
  out.data[i + 2] = b;
  out.data[i + 3] = 255;
}

function blit (png, dx, dy, scale = 1) {
  for (let y = 0; y < png.height * scale; y++) {
    for (let x = 0; x < png.width * scale; x++) {
      const si = (((y / scale) | 0) * png.width + ((x / scale) | 0)) * 4;
      if (png.data[si + 3] === 0) { continue; }
      setPx(dx + x, dy + y, png.data[si], png.data[si + 1], png.data[si + 2]);
    }
  }
}

// rendu BMFont (teinté sombre comme setTint(0x1c1208))
function loadFont (base) {
  const xml = fs.readFileSync(path.join(PUB, 'fonts', base + '.xml'), 'utf8');
  const png = readPng(path.join(PUB, 'fonts', base + '.png'));
  const chars = {};
  for (const m of xml.matchAll(/<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" xoffset="(-?\d+)" yoffset="(-?\d+)" xadvance="(\d+)"/g)) {
    chars[Number(m[1])] = { x: +m[2], y: +m[3], w: +m[4], h: +m[5], yoff: +m[7], adv: +m[8] };
  }
  return { png, chars };
}
const f14 = loadFont('lords2-14');
const f22 = loadFont('lords2-22');

function text (font, str, dx, dy, align = 'left') {
  let width = 0;
  for (const ch of str) { const g = font.chars[ch.codePointAt(0)]; if (g) { width += g.adv; } }
  let cx = align === 'center' ? dx - (width >> 1) : (align === 'right' ? dx - width : dx);
  for (const ch of str) {
    const g = font.chars[ch.codePointAt(0)];
    if (!g) { continue; }
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const si = ((g.y + y) * font.png.width + g.x + x) * 4;
        if (font.png.data[si + 3] === 0) { continue; }
        setPx(cx + x, dy + g.yoff + y, 28, 18, 8);
      }
    }
    cx += g.adv;
  }
}

// icônes
const icon = n => readPng(path.join(FEAT, 'rations-' + n + '.png'));
// vache du panneau (frame labourCow de l'atlas misc_city)
const atlas = readPng(path.join(PUB, 'images', 'scenes', 'MainScene', 'misc_city.png'));
const frames = require(path.join(PUB, 'images', 'scenes', 'MainScene', 'misc_city.json'));
const fr = (Array.isArray(frames.textures ? frames.textures[0].frames : frames.frames)
  ? (frames.textures ? frames.textures[0].frames : frames.frames)
  : []).find(f => f.filename === 'labourCow').frame;
const cow = new PNG({ width: fr.w, height: fr.h });
for (let y = 0; y < fr.h; y++) {
  for (let x = 0; x < fr.w; x++) {
    const si = ((fr.y + y) * atlas.width + fr.x + x) * 4;
    const di = (y * fr.w + x) * 4;
    for (let c = 0; c < 4; c++) { cow.data[di + c] = atlas.data[si + c]; }
  }
}

/* ===== layout — MIROIR de buildRationsDialog() ===== */
text(f22, 'Ration', W / 2, 4, 'center');
text(f14, 'Target :', 10, 38);
text(f14, 'Achieved :', 10, 62);
text(f14, 'Health :', 10, 86);
text(f14, 'Normal', 150, 38, 'center');
text(f14, 'Normal', 150, 62, 'center');
text(f14, 'Good', 150, 86, 'center');
blit(icon('up'), 216, 34);
blit(icon('down'), 246, 34);
for (const ly of [62, 86]) {
  text(f14, '(', 212, ly);
  text(f14, '+1', 232, ly, 'center');
  blit(icon('heart'), 246, ly + 1);
  text(f14, ')', 270, ly);
}
blit(icon('basket'), 12, 114);
blit(icon('arrowl'), 78, 122);
blit(icon('arrowr'), 202, 122);
blit(icon('cowbig'), 236, 107);
for (let x = 100; x < 200; x++) { for (let y = 132; y < 135; y++) { setPx(x, y, 16, 16, 8); } }
blit(icon('fork'), 100 + Math.round(0.15 * 100) - 8, 110);
const COLS = [120, 185, 240];
blit(icon('basket'), COLS[0] - 21, 150);
blit(icon('cowbig'), COLS[1] - 24, 147);
blit(icon('cheese'), COLS[2] - 11, 160);
blit(icon('figure'), 8, 186);
text(f14, 'Fed', 24, 188);
text(f14, 'Eaten', 24, 208);
text(f14, '4164', COLS[0], 188, 'center');
text(f14, '0', COLS[1], 188, 'center');
text(f14, '75', COLS[2], 188, 'center');
text(f14, '194', COLS[0], 208, 'center');
text(f14, '0', COLS[1], 208, 'center');
blit(icon('close'), W - 38, H - 38);
/* ===== fin layout ===== */

// côte à côte avec la référence, ×2
const ref = readPng(path.join(__dirname, '..', 'doc', 'captures', 'rations-panel-fr.png'));
const S = 2;
const PADC = 8;
const cmp = new PNG({ width: (W * 2 + PADC) * S, height: H * S });
cmp.data.fill(60);
function blitScaled (src, sx0, sy0, dx0) {
  for (let y = 0; y < H * S; y++) {
    for (let x = 0; x < W * S; x++) {
      const si = ((sy0 + ((y / S) | 0)) * src.width + sx0 + ((x / S) | 0)) * 4;
      const di = (y * cmp.width + dx0 + x) * 4;
      for (let c = 0; c < 4; c++) { cmp.data[di + c] = src.data[si + c]; }
    }
  }
}
blitScaled(out, 0, 0, 0);
blitScaled(ref, 128, 97, (W + PADC) * S);
fs.writeFileSync(path.join(__dirname, 'out', 'rations-compare.png'), PNG.sync.write(cmp));
console.log('tools/out/rations-compare.png (gauche = mock, droite = DOS)');
