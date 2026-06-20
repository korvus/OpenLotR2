/*
 * Extract movable Town Center workers from DOS captures.
 *
 * These are deliberately based on live DOS screenshots, not on the static
 * VILL/VILLANI background tiles: the background already belongs to the panel,
 * while the movable people are identified by comparing captures before/after
 * moving workers in the original game.
 *
 * Usage:
 *   node tools/extract-dos-labor-workers.js
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const runtime = path.join(root, 'doc', 'captures', 'runtime');
const outDir = path.join(root, 'src', 'renderer', 'public', 'images', 'scenes', 'MainScene', 'advanced-labor');
const panel = { x: 66, y: 67 };

const captures = {
  missing: '../villein-modal-dos.png',
  initial: '2026-06-16T19-35-28-707Z_dos-labor-before-moving-workers.png',
  grainActiveBase: '2026-06-17T18-23-34-514Z_dos-wheat-active-town-after-click-city.png',
  grainActive: '2026-06-17T19-04-30-355Z_dos-seeded-wheat-town-labor-visible.png',
  movingBase: '2026-06-17T18-23-34-514Z_dos-wheat-active-town-after-click-city.png',
  moving: '2026-06-17T18-25-21-620Z_dos-wheat-active-after-slow-drag-workers-to-grain.png',
  surplusInactiveBase: '2026-06-16T16-32-18-037Z_dos3-VILLEIN-MODAL.png',
  surplusInactive: '2026-06-16T16-40-57-446Z_dos3-grain-allocated.png',
  grain: '2026-06-16T19-47-50-269Z_dos-labor-after-wood-to-grain.png',
  reclaim: '2026-06-16T19-51-18-080Z_dos-labor-after-grain-to-reclaim.png',
  reclaimActive: '2026-06-17T11-33-40-327Z_dos-custom-hard-17-town-center-reclaim-active.png',
  forge: '2026-06-16T19-52-59-800Z_shot.png',
  castle: '2026-06-16T19-56-26-967Z_dos-labor-after-forge-to-mine.png',
  iron: '2026-06-16T19-58-09-727Z_dos-labor-after-mine-to-top-left.png',
  castleStarted: '2026-06-16T21-58-58-623Z_dos-town-center-after-castle-start-attempt2.png',
  castleActive: '2026-06-16T22-00-37-193Z_dos-castle-workers-after-start-and-assign.png',
  stoneBase: '2026-06-18T07-42-30-459Z_stone-single-empty-town-center.png',
  stone: '2026-06-18T07-57-27-656Z_stone-single-one-left-quarrier-dos.png'
};

const sprites = [
  {
    // Generic missing-worker silhouette. Unlike active workers this same
    // figure is reused by every understaffed activity in the DOS game.
    name: 'missing',
    mode: 'dark',
    with: 'missing',
    rect: { x: 353, y: 113, w: 14, h: 34 }
  },
  {
    name: 'wood-active',
    mode: 'diff',
    with: 'initial',
    without: 'grain',
    rect: { x: 176, y: 236, w: 88, h: 94 },
    excludes: [{ x: 74, y: 88, w: 14, h: 6 }],
    threshold: 22
  },
  {
    name: 'cattle-active',
    mode: 'color',
    with: 'initial',
    rect: { x: 354, y: 70, w: 68, h: 87 }
  },
  {
    name: 'grain-inactive',
    mode: 'diff',
    with: 'grain',
    without: 'initial',
    rect: { x: 187, y: 78, w: 94, h: 94 },
    excludes: [
      { x: 0, y: 0, w: 22, h: 94 },
      { x: 30, y: 45, w: 45, h: 45 }
    ],
    threshold: 22
  },
  {
    name: 'grain-active',
    mode: 'diff',
    with: 'grainActive',
    without: 'grainActiveBase',
    rect: { x: 176, y: 75, w: 145, h: 120 },
    threshold: 34
  },
  {
    name: 'moving',
    mode: 'diff',
    with: 'moving',
    without: 'movingBase',
    rect: { x: 248, y: 128, w: 29, h: 28 },
    threshold: 30
  },
  {
    name: 'surplus-inactive',
    mode: 'diff',
    with: 'surplusInactive',
    without: 'surplusInactiveBase',
    rect: { x: 190, y: 78, w: 106, h: 100 },
    excludes: [{ x: 52, y: 51, w: 15, h: 17 }],
    threshold: 22
  },
  {
    name: 'reclaim-inactive',
    mode: 'diff',
    with: 'reclaim',
    without: 'grain',
    rect: { x: 242, y: 160, w: 48, h: 94 },
    threshold: 22
  },
  {
    name: 'reclaim-active',
    mode: 'reclaim-active',
    with: 'reclaimActive',
    rect: { x: 66, y: 160, w: 130, h: 105 },
    unit: { x: 28, y: 17, w: 32, h: 42 },
    placements: [
      { x: 28, y: 17 }, { x: 61, y: 17 },
      { x: 30, y: 38 }, { x: 63, y: 38 },
      { x: 27, y: 60 }, { x: 61, y: 60 }
    ]
  },
  {
    name: 'smithy-active',
    mode: 'diff',
    with: 'forge',
    without: 'reclaim',
    rect: { x: 84, y: 289, w: 52, h: 46 },
    threshold: 22
  },
  {
    name: 'smithy-inactive',
    mode: 'diff',
    with: 'forge',
    without: 'reclaim',
    rect: { x: 104, y: 326, w: 82, h: 45 },
    threshold: 22
  },
  {
    name: 'castle-inactive',
    mode: 'diff',
    with: 'castle',
    without: 'forge',
    rect: { x: 330, y: 218, w: 78, h: 100 },
    threshold: 22
  },
  {
    name: 'castle-active',
    mode: 'diff',
    with: 'castleActive',
    without: 'castleStarted',
    rect: { x: 316, y: 210, w: 108, h: 116 },
    excludes: [{ x: 20, y: 34, w: 26, h: 26 }],
    threshold: 22
  },
  {
    name: 'iron-active',
    mode: 'diff',
    with: 'iron',
    without: 'castle',
    rect: { x: 124, y: 99, w: 44, h: 74 },
    threshold: 22
  },
  {
    name: 'stone-active',
    mode: 'diff',
    with: 'stone',
    without: 'stoneBase',
    rect: { x: 112, y: 86, w: 48, h: 70 },
    threshold: 22
  }
];

function loadPng (name) {
  const file = path.join(runtime, captures[name]);
  return PNG.sync.read(fs.readFileSync(file));
}

function pixel (png, x, y) {
  const p = (y * png.width + x) * 4;
  return [png.data[p], png.data[p + 1], png.data[p + 2], png.data[p + 3]];
}

function diff (a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function colorWorkerMask (rgba) {
  const [r, g, b, a] = rgba;
  if (a === 0) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const blueCloth = b > r + 8 && b >= g - 8 && b > 40;
  const paleCloth = r > 110 && g > 100 && b > 82 && max - min < 78;
  const veryDark = max < 54;
  return blueCloth || paleCloth || veryDark;
}

function expandMaskAroundColors (mask, src, rect) {
  const next = mask.slice();
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      if (!mask[y * rect.w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < 0 || py < 0 || px >= rect.w || py >= rect.h) continue;
          const rgba = pixel(src, rect.x + px, rect.y + py);
          const max = Math.max(rgba[0], rgba[1], rgba[2]);
          if (max < 86 || colorWorkerMask(rgba)) next[py * rect.w + px] = 1;
        }
      }
    }
  }
  return next;
}

function reclaimWorkerCoreMask (rgba) {
  const [r, g, b, a] = rgba;
  if (a === 0) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const green = g > r + 8 && g > b + 8 && g > 60;
  if (green) return false;
  const blueCloth = b > r + 8 && b >= g - 10 && b > 40;
  const veryDark = max < 62;
  const greyCloth = max >= 72 && max < 210 && max - min < 36;
  const paleCloth = max >= 125 && b > 82 && max - min < 76;
  const skin = r >= 165 && g >= 110 && b >= 78 && r >= g - 5 && g >= b + 10;
  return blueCloth || veryDark || greyCloth || paleCloth || skin;
}

function reclaimWorkerMask (rgba) {
  return reclaimWorkerCoreMask(rgba) || reclaimWorkerBrownMask(rgba);
}

function reclaimWorkerBrownMask (rgba) {
  const [r, g, b, a] = rgba;
  if (a === 0) return false;
  return r >= 92 && r <= 178
    && g >= 64 && g <= 132
    && b >= 32 && b <= 96
    && r >= g + 8
    && g >= b + 8;
}

function hasNearbyMaskPixel (mask, w, h, x, y, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (mask[ny * w + nx]) return true;
    }
  }
  return false;
}

function connectedComponents (mask, w, h) {
  const seen = new Uint8Array(mask.length);
  const components = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    const q = [i];
    const pixels = [];
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;
    seen[i] = 1;
    while (q.length) {
      const cur = q.pop();
      pixels.push(cur);
      const x = cur % w;
      const y = (cur / w) | 0;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (mask[ni] && !seen[ni]) {
          seen[ni] = 1;
          q.push(ni);
        }
      }
    }
    components.push({ pixels, size: pixels.length, x0, y0, x1, y1 });
  }
  return components;
}

function dropSmallComponents (mask, w, h, minSize) {
  const seen = new Uint8Array(mask.length);
  const keep = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || seen[i]) continue;
    const q = [i];
    const comp = [];
    seen[i] = 1;
    while (q.length) {
      const cur = q.pop();
      comp.push(cur);
      const x = cur % w;
      const y = (cur / w) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (mask[ni] && !seen[ni]) {
          seen[ni] = 1;
          q.push(ni);
        }
      }
    }
    if (comp.length >= minSize) {
      for (const p of comp) keep[p] = 1;
    }
  }
  return keep;
}

function extractReclaimUnit (src, rect, unit) {
  const out = new PNG({ width: unit.w, height: unit.h });
  out.data.fill(0);
  const mask = new Uint8Array(unit.w * unit.h);
  const core = new Uint8Array(unit.w * unit.h);
  const brown = new Uint8Array(unit.w * unit.h);
  for (let y = 0; y < unit.h; y++) {
    for (let x = 0; x < unit.w; x++) {
      const rgba = pixel(src, rect.x + unit.x + x, rect.y + unit.y + y);
      const i = y * unit.w + x;
      if (reclaimWorkerCoreMask(rgba)) core[i] = 1;
      if (reclaimWorkerBrownMask(rgba)) brown[i] = 1;
    }
  }
  for (let y = 0; y < unit.h; y++) {
    for (let x = 0; x < unit.w; x++) {
      const i = y * unit.w + x;
      if (core[i] || (brown[i] && hasNearbyMaskPixel(core, unit.w, unit.h, x, y, 2))) {
        mask[i] = 1;
      }
    }
  }

  const components = connectedComponents(mask, unit.w, unit.h)
    .filter(component => component.size >= 3
      && component.pixels.some(i => core[i]));

  for (const component of components) {
    for (const i of component.pixels) {
      const x = i % unit.w;
      const y = (i / unit.w) | 0;
      const rgba = pixel(src, rect.x + unit.x + x, rect.y + unit.y + y);
      const p = i * 4;
      out.data[p] = rgba[0];
      out.data[p + 1] = rgba[1];
      out.data[p + 2] = rgba[2];
      out.data[p + 3] = 255;
    }
  }
  return out;
}

function copyPng (src, dst, dx, dy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const sp = (y * src.width + x) * 4;
      if (src.data[sp + 3] === 0) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.width || ty >= dst.height) continue;
      const dp = (ty * dst.width + tx) * 4;
      dst.data[dp] = src.data[sp];
      dst.data[dp + 1] = src.data[sp + 1];
      dst.data[dp + 2] = src.data[sp + 2];
      dst.data[dp + 3] = 255;
    }
  }
}

function writeSprite (spec, cache) {
  const src = cache[spec.with] ||= loadPng(spec.with);
  const base = spec.without ? (cache[spec.without] ||= loadPng(spec.without)) : null;
  const { rect } = spec;
  if (spec.mode === 'reclaim-active') {
    const out = new PNG({ width: rect.w, height: rect.h });
    out.data.fill(0);
    const unit = extractReclaimUnit(src, rect, spec.unit);
    for (const placement of spec.placements) {
      copyPng(unit, out, placement.x, placement.y);
    }
    const filename = `labor-dos-${spec.name}.png`;
    fs.writeFileSync(path.join(outDir, filename), PNG.sync.write(out));
    return {
      key: `labor-dos-${spec.name}`,
      file: filename,
      x: rect.x - panel.x,
      y: rect.y - panel.y,
      w: rect.w,
      h: rect.h
    };
  }

  let mask = new Uint8Array(rect.w * rect.h);

  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const index = y * rect.w + x;
      const current = pixel(src, rect.x + x, rect.y + y);
      if (spec.mode === 'diff') {
        const previous = pixel(base, rect.x + x, rect.y + y);
        if (diff(current, previous) > (spec.threshold || 18)) mask[index] = 1;
      } else if (spec.mode === 'color' && colorWorkerMask(current)) {
        mask[index] = 1;
      } else if (spec.mode === 'dark' && Math.max(current[0], current[1], current[2]) < 72) {
        mask[index] = 1;
      }
    }
  }

  if (spec.mode === 'color') mask = expandMaskAroundColors(mask, src, rect);
  mask = dropSmallComponents(mask, rect.w, rect.h, 5);
  for (const exclude of spec.excludes || []) {
    for (let y = exclude.y; y < exclude.y + exclude.h; y++) {
      for (let x = exclude.x; x < exclude.x + exclude.w; x++) {
        if (x >= 0 && y >= 0 && x < rect.w && y < rect.h) {
          mask[y * rect.w + x] = 0;
        }
      }
    }
  }

  const out = new PNG({ width: rect.w, height: rect.h });
  out.data.fill(0);
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const i = y * rect.w + x;
      if (!mask[i]) continue;
      const rgba = pixel(src, rect.x + x, rect.y + y);
      if (spec.name === 'grain-inactive' && rgba[0] > 180 && rgba[1] > 180 && rgba[2] > 150) continue;
      const p = i * 4;
      out.data[p] = rgba[0];
      out.data[p + 1] = rgba[1];
      out.data[p + 2] = rgba[2];
      out.data[p + 3] = 255;
    }
  }

  const filename = `labor-dos-${spec.name}.png`;
  fs.writeFileSync(path.join(outDir, filename), PNG.sync.write(out));
  return {
    key: `labor-dos-${spec.name}`,
    file: filename,
    x: rect.x - panel.x,
    y: rect.y - panel.y,
    w: rect.w,
    h: rect.h
  };
}

function loadGeneratedSprite (name) {
  return PNG.sync.read(fs.readFileSync(path.join(outDir, `labor-dos-${name}.png`)));
}

function cropPng (png, rect) {
  const out = new PNG({ width: rect.w, height: rect.h });
  out.data.fill(0);
  for (let y = 0; y < rect.h; y++) {
    for (let x = 0; x < rect.w; x++) {
      const sx = rect.x + x;
      const sy = rect.y + y;
      if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) continue;
      const sp = (sy * png.width + sx) * 4;
      const dp = (y * rect.w + x) * 4;
      out.data[dp] = png.data[sp];
      out.data[dp + 1] = png.data[sp + 1];
      out.data[dp + 2] = png.data[sp + 2];
      out.data[dp + 3] = png.data[sp + 3];
    }
  }
  return out;
}

function keepLargestComponent (png) {
  const N = png.width * png.height;
  const seen = new Uint8Array(N);
  let best = [];
  for (let i = 0; i < N; i++) {
    if (png.data[i * 4 + 3] === 0 || seen[i]) continue;
    const q = [i];
    const comp = [];
    seen[i] = 1;
    while (q.length) {
      const cur = q.pop();
      comp.push(cur);
      const x = cur % png.width;
      const y = (cur / png.width) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
        const ni = ny * png.width + nx;
        if (png.data[ni * 4 + 3] > 0 && !seen[ni]) {
          seen[ni] = 1;
          q.push(ni);
        }
      }
    }
    if (comp.length > best.length) best = comp;
  }

  const keep = new Uint8Array(N);
  for (const index of best) keep[index] = 1;
  for (let i = 0; i < N; i++) {
    if (!keep[i]) png.data[i * 4 + 3] = 0;
  }
  return trimTransparent(png);
}

function trimTransparent (png) {
  let x0 = png.width;
  let y0 = png.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return new PNG({ width: 1, height: 1 });
  return cropPng(png, { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}

function writeUnit (spec) {
  const source = loadGeneratedSprite(spec.source);
  let unit = cropPng(source, spec.rect);
  if (spec.keepLargest) unit = keepLargestComponent(unit);
  else unit = trimTransparent(unit);
  const filename = `labor-unit-${spec.name}.png`;
  fs.writeFileSync(path.join(outDir, filename), PNG.sync.write(unit));
  return {
    key: `labor-unit-${spec.name}`,
    file: filename,
    w: unit.width,
    h: unit.height
  };
}

fs.mkdirSync(outDir, { recursive: true });
const cache = {};
const manifest = { panel, sprites: {}, units: {} };
for (const spec of sprites) {
  manifest.sprites[spec.name] = writeSprite(spec, cache);
}
const units = [
  { name: 'missing', source: 'missing', rect: { x: 0, y: 0, w: 14, h: 34 }, keepLargest: true },
  { name: 'wood', source: 'wood-active', rect: { x: 24, y: 42, w: 22, h: 46 }, keepLargest: true },
  { name: 'cattle', source: 'cattle-active', rect: { x: 45, y: 49, w: 23, h: 38 }, keepLargest: true },
  { name: 'grain', source: 'grain-inactive', rect: { x: 62, y: 12, w: 28, h: 47 }, keepLargest: true },
  { name: 'grain-active', source: 'grain-active', rect: { x: 71, y: 23, w: 18, h: 30 } },
  { name: 'moving', source: 'moving', rect: { x: 0, y: 0, w: 29, h: 28 } },
  // This is a valid single inactive/surplus villein, not the active grain
  // worker. The surrounding diff contains touching rows of workers, so keep
  // this crop tight enough to avoid turning one displayed unit into a stacked
  // pair.
  { name: 'surplus-inactive', source: 'surplus-inactive', rect: { x: 87, y: 24, w: 19, h: 24 }, keepLargest: true },
  { name: 'inactive', source: 'reclaim-inactive', rect: { x: 6, y: 20, w: 28, h: 48 }, keepLargest: true },
  { name: 'reclaim-active', source: 'reclaim-active', rect: { x: 28, y: 17, w: 32, h: 42 } },
  { name: 'iron', source: 'iron-active', rect: { x: 0, y: 5, w: 28, h: 42 }, keepLargest: true },
  { name: 'stone', source: 'stone-active', rect: { x: 12, y: 5, w: 28, h: 56 }, keepLargest: true },
  { name: 'smithy-active', source: 'smithy-active', rect: { x: 29, y: 9, w: 16, h: 31 }, keepLargest: true },
  { name: 'smithy-inactive', source: 'smithy-inactive', rect: { x: 9, y: 15, w: 32, h: 24 }, keepLargest: true },
  { name: 'castle-inactive', source: 'castle-inactive', rect: { x: 40, y: 30, w: 28, h: 48 }, keepLargest: true },
  { name: 'castle-active', source: 'castle-active', rect: { x: 29, y: 0, w: 35, h: 55 } }
];
for (const spec of units) {
  manifest.units[spec.name] = writeUnit(spec);
}
fs.writeFileSync(
  path.join(outDir, 'labor-dos-workers.json'),
  JSON.stringify(manifest, null, 2)
);
console.log(`DOS labor workers -> ${outDir}`);
