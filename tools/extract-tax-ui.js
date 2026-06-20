/*
 * Extracts tax dialog UI assets from the original DOS PL8 files.
 *
 * MISC_CTY.PL8 #62 is the tax purse/pot block. Its exact position in the
 * DOS tax dialog is (240,20) relative to the dialog crop, verified by
 * pixel matching against doc/captures/runtime/dos-tax-modal-crop.png.
 *
 * Usage:
 *   node tools/extract-tax-ui.js <PL8-dir> <output-dir> [dos-tax-capture]
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir, dosTaxCapture] = process.argv;
if (!pl8Dir || !outDir) {
  console.error('Usage: node tools/extract-tax-ui.js <PL8-dir> <output-dir>');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const pal = readPalette(path.join(pl8Dir, 'BASE01.256'));
const buf = fs.readFileSync(path.join(pl8Dir, 'MISC_CTY.PL8'));
const img = Pl8.parse(buf);
const taxPurse = img.tiles[62];

const png = new PNG({ width: taxPurse.width, height: taxPurse.height });
for (let y = 0; y < taxPurse.height; y++) {
  for (let x = 0; x < taxPurse.width; x++) {
    const v = buf[taxPurse.offset + y * taxPurse.width + x];
    if (v === 0) { continue; }
    const i = (y * taxPurse.width + x) * 4;
    png.data[i] = pal[v][0];
    png.data[i + 1] = pal[v][1];
    png.data[i + 2] = pal[v][2];
    png.data[i + 3] = 255;
  }
}

fs.writeFileSync(path.join(outDir, 'tax-purse.png'), PNG.sync.write(png));

if (dosTaxCapture) {
  const src = PNG.sync.read(fs.readFileSync(dosTaxCapture));
  const crop = { x: 80, y: 143, w: 320, h: 145 };
  const mask = new PNG({ width: crop.w, height: crop.h });

  const isParchment = (r, g, b) => (
    r >= 125 && g >= 85 && b <= 150 &&
    r > g + 20 && g > b + 5
  );

  const rows = [];
  const cols = [];
  let lastLeft = 0;
  let lastRight = crop.w - 1;
  for (let y = 0; y < crop.h; y++) {
    let left = crop.w;
    let right = -1;
    for (let x = 0; x < crop.w; x++) {
      const i = ((crop.y + y) * src.width + crop.x + x) * 4;
      if (isParchment(src.data[i], src.data[i + 1], src.data[i + 2])) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    }
    if (right - left < 48) {
      left = lastLeft;
      right = lastRight;
    } else {
      lastLeft = left;
      lastRight = right;
    }
    rows[y] = { left, right };
  }

  let lastTop = 0;
  let lastBottom = crop.h - 1;
  for (let x = 0; x < crop.w; x++) {
    let top = crop.h;
    let bottom = -1;
    for (let y = 0; y < crop.h; y++) {
      const i = ((crop.y + y) * src.width + crop.x + x) * 4;
      if (isParchment(src.data[i], src.data[i + 1], src.data[i + 2])) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (bottom - top < 48) {
      top = lastTop;
      bottom = lastBottom;
    } else {
      lastTop = top;
      lastBottom = bottom;
    }
    cols[x] = { top, bottom };
  }

  for (let y = 0; y < crop.h; y++) {
    for (let x = rows[y].left; x <= rows[y].right; x++) {
      if (y < cols[x].top || y > cols[x].bottom) { continue; }
      const i = (y * crop.w + x) * 4;
      mask.data[i] = 255;
      mask.data[i + 1] = 255;
      mask.data[i + 2] = 255;
      mask.data[i + 3] = 255;
    }
  }

  fs.writeFileSync(path.join(outDir, 'tax-panel-mask.png'), PNG.sync.write(mask));
}

console.log('tax UI -> ' + outDir);
