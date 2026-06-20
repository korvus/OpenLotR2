/*
 * Render the overview map from the original BASE2A/ROADS2A miniature
 * tilesets. These 10x6 tiles are the game's native overview artwork, so roads
 * and county-border stones retain their real shapes without vector overlays.
 *
 * Usage:
 *   node tools/render-overview.js <map.json> <mini-base.png>
 *     <mini-roads.png> <features-dir> <output.png>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const [, , mapPath, basePath, roadsPath, featuresDir, outPath] = process.argv;
if (!outPath) {
  throw new Error('usage: render-overview.js <map> <mini-base> <mini-roads> <features-dir> <output>');
}

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const base = PNG.sync.read(fs.readFileSync(basePath));
const roads = PNG.sync.read(fs.readFileSync(roadsPath));

const OUT_W = 478;
const OUT_H = 456;
const BANNER_H = 56;
const MAX_COUNTY_ID = 19;

const W = map.width;
const H = map.height;
const FULL_HALF_W = 29;
const FULL_HALF_H = 15;
const MINI_HALF_W = 5;
const MINI_HALF_H = 3;
const FRAME_W = 13;
const FRAME_H = 7;
const FRAME_COLS = 10;
const FRAME_OFFSET_X = 5;
const FRAME_OFFSET_Y = 3;
const GRASS = 14;
const ROADS_CLASSES = new Set([1, 2, 3, 8, 10, 18]);
const BLACKSMITH_FRAMES = Array.from({ length: 9 }, (_, i) => 10 + i);
const MAP_INDUSTRY_KINDS = [0, 20, 30, ...BLACKSMITH_FRAMES];

const terrain = map.layers.terrain;
const tclass = map.layers.terrainClass;
const underRoads = map.layers.roads;
const county = map.layers.county;

// Match the established framing while sampling the native miniature map.
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (let i = 0; i < county.length; i++) {
  if (!county[i] || county[i] > MAX_COUNTY_ID) continue;
  const x = i % W;
  const y = (i / W) | 0;
  const wx = W * FULL_HALF_W + (x - y) * FULL_HALF_W;
  const wy = (x + y) * FULL_HALF_H;
  minX = Math.min(minX, wx);
  maxX = Math.max(maxX, wx + 2 * FULL_HALF_W);
  minY = Math.min(minY, wy);
  maxY = Math.max(maxY, wy + 2 * FULL_HALF_H);
}
// Affichage 1:1 des pixels miniatures natifs — AUCUN rééchantillonnage :
// l'agrandissement nearest (≈ ×1,51 en X, ×1,30 en Y) vers l'échelle
// 0,26 moirait la mer tramée (le « glitch maritime » : la trame en
// damier ne survit pas à une duplication de pixels non uniforme). Île
// centrée dans la zone au-dessus du bandeau.
const kX = MINI_HALF_W / FULL_HALF_W; // 5/29
const kY = MINI_HALF_H / FULL_HALF_H; // 3/15

// The miniature world needs a small margin for mountains and castles that
// extend above their anchor tile (et pour le crop centré).
const PAD_X = 80;
const PAD_Y = 80;
const mini = new PNG({
  width: (W + H) * MINI_HALF_W + PAD_X * 2,
  height: (W + H) * MINI_HALF_H + PAD_Y * 2
});
const centerX = PAD_X + H * MINI_HALF_W;

function blitFrame(sheet, frame, dstX, dstY) {
  const sx = (frame % FRAME_COLS) * FRAME_W;
  const sy = Math.floor(frame / FRAME_COLS) * FRAME_H;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const si = ((sy + y) * sheet.width + sx + x) * 4;
      if (sheet.data[si + 3] === 0) continue;
      const px = dstX + x;
      const py = dstY + y;
      if (px < 0 || py < 0 || px >= mini.width || py >= mini.height) continue;
      const di = (py * mini.width + px) * 4;
      mini.data[di] = sheet.data[si];
      mini.data[di + 1] = sheet.data[si + 1];
      mini.data[di + 2] = sheet.data[si + 2];
      mini.data[di + 3] = 255;
    }
  }
}

function tilePosition(x, y) {
  return [
    centerX + (x - y) * MINI_HALF_W - FRAME_OFFSET_X,
    PAD_Y + (x + y) * MINI_HALF_H - FRAME_OFFSET_Y
  ];
}

function terrainHash(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return h >>> 0;
}

// Extend the sea beyond the map diamond so the cropped overview is filled.
// Variante par HACHAGE MÉLANGÉ : une formule linéaire (x·5+y·3 mod 8)
// dessinait des bandes périodiques, absentes du DOS, et rendait visible
// la frontière du losange (les données de la carte tirent leurs
// variantes au hasard — il faut le même bruit dehors).
const seaVariant = (x, y) => {
  return 22 + ((terrainHash(x, y) >>> 16) & 7);
};
for (let y = -W; y < H + W; y++) {
  for (let x = -H; x < W + H; x++) {
    const [dx, dy] = tilePosition(x, y);
    if (dx + FRAME_W < 0 || dy + FRAME_H < 0 || dx >= mini.width || dy >= mini.height) continue;
    blitFrame(base, seaVariant(x, y), dx, dy);
  }
}

function drawTerrainTile(dstX, dstY, source) {
  const id = terrain[source];
  const cls = tclass[source];
  const [dx, dy] = tilePosition(dstX, dstY);

  if (cls === 32) {
    blitFrame(base, GRASS, dx, dy);
    blitFrame(roads, 80, dx, dy);
  } else if (cls === 64 || cls === 128) {
    blitFrame(base, id >= 6 && id <= 21 ? id : GRASS, dx, dy);
    if (underRoads[source] > 0) blitFrame(roads, underRoads[source], dx, dy);
  } else if (cls === 16) {
    blitFrame(base, GRASS, dx, dy);
    blitFrame(roads, 88, dx, dy);
  } else if (cls === 8 && id <= 24) {
    blitFrame(base, GRASS, dx, dy);
    if (underRoads[source] > 0) blitFrame(roads, underRoads[source], dx, dy);
  } else if (ROADS_CLASSES.has(cls)) {
    blitFrame(base, GRASS, dx, dy);
    if (underRoads[source] > 0) blitFrame(roads, underRoads[source], dx, dy);
    blitFrame(roads, id, dx, dy);
  } else if (id <= 5) {
    blitFrame(base, GRASS, dx, dy);
    if (id > 0) blitFrame(base, id, dx, dy);
  } else {
    blitFrame(base, id, dx, dy);
  }
}

// Native miniature terrain, roads and county-border stones.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    drawTerrainTile(x, y, i);
  }
}

// Close land cut by the northern map bounds with the same directional cliff
// frames as the zoomed renderer. Draw them over the terrain so their few
// miniature pixels remain readable at 1:1.
function drawCliffFringe(x, y, band) {
  const variant = ((x * 7 + y * 13) % 4 + 4) % 4;
  const [dx, dy] = tilePosition(x, y);
  blitFrame(base, band + variant, dx, dy);
}
for (let y = 0; y < H; y++) {
  if (tclass[y * W] !== 4) drawCliffFringe(-1, y, 42);
}
for (let x = 0; x < W; x++) {
  if (tclass[x] !== 4) drawCliffFringe(x, -1, 46);
}
if (tclass[0] !== 4) drawCliffFringe(-1, -1, 62);

function readFeature(name, fallback) {
  let file = path.join(featuresDir, name + '.png');
  if (!fs.existsSync(file) && fallback) {
    file = path.join(featuresDir, fallback + '.png');
  }
  return PNG.sync.read(fs.readFileSync(file));
}

// Scale full-size feature art into the miniature coordinate system.
function blitFeature(source, fullX, fullY) {
  const dstX = Math.round(PAD_X + fullX * MINI_HALF_W / FULL_HALF_W);
  const dstY = Math.round(PAD_Y + fullY * MINI_HALF_H / FULL_HALF_H);
  const dstW = Math.max(1, Math.round(source.width * MINI_HALF_W / FULL_HALF_W));
  const dstH = Math.max(1, Math.round(source.height * MINI_HALF_H / FULL_HALF_H));
  for (let y = 0; y < dstH; y++) {
    const sy = Math.min(source.height - 1, Math.floor(y * source.height / dstH));
    for (let x = 0; x < dstW; x++) {
      const sx = Math.min(source.width - 1, Math.floor(x * source.width / dstW));
      const si = (sy * source.width + sx) * 4;
      if (source.data[si + 3] === 0) continue;
      const px = dstX + x;
      const py = dstY + y;
      if (px < 0 || py < 0 || px >= mini.width || py >= mini.height) continue;
      const di = (py * mini.width + px) * 4;
      mini.data[di] = source.data[si];
      mini.data[di + 1] = source.data[si + 1];
      mini.data[di + 2] = source.data[si + 2];
      mini.data[di + 3] = 255;
    }
  }
}

// Mountains.
for (let i = 0; i < W * H; i++) {
  if (tclass[i] !== 8 || terrain[i] > 24) continue;
  const x = i % W;
  const y = (i / W) | 0;
  blitFeature(
    readFeature(`mtn-spring-${terrain[i]}`),
    W * FULL_HALF_W + (x - y) * FULL_HALF_W - 29,
    (x + y) * FULL_HALF_H - 49
  );
}

// Towns, castles and industries.
const seen = new Array(W * H).fill(false);
const features = [];
const towns = [];
for (let i = 0; i < W * H; i++) {
  const cls = tclass[i];
  if ((cls !== 64 && cls !== 128) || seen[i]) continue;
  const component = [];
  const queue = [i];
  seen[i] = true;
  while (queue.length) {
    const j = queue.pop();
    component.push(j);
    const x = j % W;
    const y = (j / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (!seen[k] && tclass[k] === cls) {
        seen[k] = true;
        queue.push(k);
      }
    }
  }
  component.sort((a, b) => {
    const ax = a % W;
    const ay = (a / W) | 0;
    const bx = b % W;
    const by = (b / W) | 0;
    return (ax + ay) - (bx + by) || (ax - ay) - (bx - by);
  });
  const ax = component[0] % W;
  const ay = (component[0] / W) | 0;
  if (cls === 64) {
    features.push({
      depth: ax + ay,
      image: readFeature('town-spring-1'),
      x: W * FULL_HALF_W + (ax - ay) * FULL_HALF_W - 58,
      y: (ax + ay) * FULL_HALF_H - 75
    });
    towns.push({ x: ax, y: ay, county: county[component[0]] });
  } else {
    const set = new Set(component);
    const candidates = component
      .filter(tile => tile % W < W - 1
        && set.has(tile + 1)
        && set.has(tile + W)
        && set.has(tile + W + 1))
      .map(tile => {
        const tiles = [tile, tile + 1, tile + W, tile + W + 1];
        const score = tiles.reduce((sum, t) =>
          sum + (terrain[t] === 30 ? 100 : ([0, 20].includes(terrain[t]) ? 1 : 0)), 0);
        return { tiles, score };
      })
      .filter(candidate => component.every(tile =>
        candidate.tiles.includes(tile) || MAP_INDUSTRY_KINDS.includes(terrain[tile])))
      .sort((a, b) => a.score - b.score);
    const castleTiles = new Set(candidates[0]?.tiles || (component.length >= 3 ? component : []));
    if (castleTiles.size) {
      const anchor = [...castleTiles].sort((a, b) => {
        const ax = a % W;
        const ay = (a / W) | 0;
        const bx = b % W;
        const by = (b / W) | 0;
        return (ax + ay) - (bx + by) || (ax - ay) - (bx - by);
      })[0];
      const x = anchor % W;
      const y = (anchor / W) | 0;
      features.push({
        depth: x + y,
        image: readFeature('castle-spring-1'),
        x: W * FULL_HALF_W + (x - y) * FULL_HALF_W - 58,
        y: (x + y) * FULL_HALF_H - 75
      });
    }
    for (const tile of component.filter(tile => !castleTiles.has(tile))) {
      if (!MAP_INDUSTRY_KINDS.includes(terrain[tile])) continue;
      const x = tile % W;
      const y = (tile / W) | 0;
      features.push({
        depth: x + y,
        image: readFeature(`ind-spring-${terrain[tile]}`, 'ind-spring-0'),
        x: W * FULL_HALF_W + (x - y) * FULL_HALF_W - 29,
        y: (x + y) * FULL_HALF_H - 49
      });
    }
  }
}
for (const town of towns) {
  let best = null;
  for (let i = 0; i < W * H; i++) {
    if (county[i] !== town.county || tclass[i] !== 0 || ![10, 19].includes(terrain[i])) continue;
    const x = i % W;
    const y = (i / W) | 0;
    const d = Math.abs(x - town.x) + Math.abs(y - town.y);
    const score = d * 10 + (terrain[i] === 10 ? 0 : 1);
    if (!best || score < best.score) best = { x, y, score };
  }
  if (best) {
    const frame = BLACKSMITH_FRAMES[(best.x * 3 + best.y) % BLACKSMITH_FRAMES.length];
    features.push({
      depth: best.x + best.y,
      image: readFeature(`ind-spring-${frame}`),
      x: W * FULL_HALF_W + (best.x - best.y) * FULL_HALF_W - 29,
      y: (best.x + best.y) * FULL_HALF_H - 49
    });
  }
}
features.sort((a, b) => a.depth - b.depth);
for (const feature of features) {
  blitFeature(feature.image, feature.x, feature.y);
}

// Crop 1:1 du canvas miniature : l'île centrée horizontalement, et
// verticalement dans l'espace au-dessus du bandeau parchemin.
const cropX = Math.max(0, Math.min(mini.width - OUT_W,
  Math.round(PAD_X + ((minX + maxX) / 2) * kX - OUT_W / 2)));
const cropY = Math.max(0, Math.min(mini.height - OUT_H,
  Math.round(PAD_Y + ((minY + maxY) / 2) * kY - (OUT_H - BANNER_H) / 2)));

const out = new PNG({ width: OUT_W, height: OUT_H });
for (let py = 0; py < OUT_H; py++) {
  for (let px = 0; px < OUT_W; px++) {
    const sx = px + cropX;
    const sy = py + cropY;
    if (sx < 0 || sy < 0 || sx >= mini.width || sy >= mini.height) continue;
    const si = (sy * mini.width + sx) * 4;
    const di = (py * OUT_W + px) * 4;
    out.data[di] = mini.data[si];
    out.data[di + 1] = mini.data[si + 1];
    out.data[di + 2] = mini.data[si + 2];
    out.data[di + 3] = 255;
  }
}

fs.writeFileSync(outPath, PNG.sync.write(out));
// la scène convertit les clics image → monde avec des échelles par axe
// (les tuiles minis 10×6 n'ont pas le même rapport que les 58×30)
fs.writeFileSync(
  outPath.replace(/\.png$/, '.json'),
  JSON.stringify({
    scaleX: kX,
    scaleY: kY,
    worldX0: (cropX - PAD_X) / kX,
    worldY0: (cropY - PAD_Y) / kY
  })
);
console.log(`native overview 1:1 ${OUT_W}x${OUT_H} (crop ${cropX},${cropY}) -> ${outPath}`);
