/* Tile cropped figure PNGs into one labeled contact sheet (NN-scaled). */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const [, , dir, prefix, outFile, scaleArg] = process.argv;
const scale = parseInt(scaleArg || '5', 10);
const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix + '-') && f.endsWith('.png')).sort();
if (!files.length) { throw new Error('no files for ' + prefix); }

const imgs = files.map(f => ({ f, png: PNG.sync.read(fs.readFileSync(path.join(dir, f))) }));
const cellW = Math.max(...imgs.map(i => i.png.width)) * scale + 10;
const cellH = Math.max(...imgs.map(i => i.png.height)) * scale + 18;
const cols = Math.min(imgs.length, 10);
const rows = Math.ceil(imgs.length / cols);
const out = new PNG({ width: cols * cellW, height: rows * cellH });
// magenta background
for (let i = 0; i < out.data.length; i += 4) { out.data[i] = 60; out.data[i+1] = 60; out.data[i+2] = 60; out.data[i+3] = 255; }

imgs.forEach((im, k) => {
  const cx = (k % cols) * cellW + 5;
  const cy = Math.floor(k / cols) * cellH + 14;
  for (let y = 0; y < im.png.height; y++) for (let x = 0; x < im.png.width; x++) {
    const si = (y * im.png.width + x) * 4;
    const a = im.png.data[si + 3];
    if (a < 40) continue;
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const ox = cx + x * scale + sx, oy = cy + y * scale + sy;
      const di = (oy * out.width + ox) * 4;
      out.data[di] = im.png.data[si]; out.data[di+1] = im.png.data[si+1]; out.data[di+2] = im.png.data[si+2]; out.data[di+3] = 255;
    }
  }
});
fs.writeFileSync(outFile, PNG.sync.write(out));
console.log('wrote', outFile, cols + 'x' + rows, 'of', imgs.length, '(' + files.join(',') + ')');
