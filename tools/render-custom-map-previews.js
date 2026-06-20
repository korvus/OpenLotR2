/*
 * Render the 24 Custom Game map previews from the complete terrain layers.
 *
 * Usage:
 *   node tools/render-custom-map-previews.js <maps-directory> <output-directory>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const [, , mapsDir, outDir] = process.argv;
if (!outDir) {
  throw new Error('usage: render-custom-map-previews.js <maps-directory> <output-directory>');
}
fs.mkdirSync(outDir, { recursive: true });

const WIDTH = 132;
const HEIGHT = 124;
const MAX_COUNTY_ID = 19;
const LAND = [[51, 105, 31], [62, 121, 37], [74, 133, 43], [87, 144, 49]];
const MOUNTAIN = [[70, 84, 48], [89, 99, 61], [107, 112, 73]];
const ROAD = [[111, 91, 48], [129, 107, 58], [145, 121, 67]];
const BORDER = [24, 45, 18];

function put(png, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  png.data[i] = color[0];
  png.data[i + 1] = color[1];
  png.data[i + 2] = color[2];
  png.data[i + 3] = 255;
}

function render(map) {
  const county = map.layers.county;
  const terrain = map.layers.terrain;
  const terrainClass = map.layers.terrainClass;
  const points = [];
  for (let i = 0; i < terrainClass.length; i++) {
    if (terrainClass[i] !== 4) {
      const x = i % map.width;
      const y = (i / map.width) | 0;
      points.push({
        x, y, u: x - y, v: x + y,
        county: county[i] <= MAX_COUNTY_ID ? county[i] : 0,
        terrain: terrain[i],
        terrainClass: terrainClass[i]
      });
    }
  }

  const minU = Math.min(...points.map(p => p.u));
  const maxU = Math.max(...points.map(p => p.u));
  const minV = Math.min(...points.map(p => p.v));
  const maxV = Math.max(...points.map(p => p.v));
  const scaleX = (WIDTH - 4) / Math.max(1, maxU - minU + 2);
  const scaleY = (HEIGHT - 4) / Math.max(1, maxV - minV + 2);
  const originX = (WIDTH - (maxU - minU) * scaleX) / 2 - minU * scaleX;
  const originY = (HEIGHT - (maxV - minV) * scaleY) / 2 - minV * scaleY;
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  const hash = (x, y, seed) => {
    let h = Math.imul(x + seed * 13, 374761393) + Math.imul(y + seed * 7, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return h >>> 0;
  };

  for (const point of points) {
    const cx = originX + point.u * scaleX;
    const cy = originY + point.v * scaleY;
    const rx = Math.max(1, scaleX * 0.58);
    const ry = Math.max(1, scaleY * 0.58);
    const palette = point.terrainClass === 8
      ? MOUNTAIN
      : ([1, 2, 3, 10, 18].includes(point.terrainClass) ? ROAD : LAND);
    const color = palette[hash(point.x, point.y, point.terrain) % palette.length];
    for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) {
      const span = rx * (1 - Math.abs(py - cy) / Math.max(1, ry));
      for (let px = Math.floor(cx - span); px <= Math.ceil(cx + span); px++) {
        put(png, px, py, color);
      }
    }
  }

  const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const point of points) {
    const cx = originX + point.u * scaleX;
    const cy = originY + point.v * scaleY;
    for (const [dx, dy] of neighbours) {
      const nx = point.x + dx;
      const ny = point.y + dy;
      const ni = ny * map.width + nx;
      let other = -1;
      if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height && terrainClass[ni] !== 4) {
        other = county[ni] > 0 && county[ni] <= MAX_COUNTY_ID ? county[ni] : 0;
      }
      if (other === point.county) continue;
      const ex = cx + (dx - dy) * scaleX * 0.48;
      const ey = cy + (dx + dy) * scaleY * 0.48;
      put(png, ex, ey, BORDER);
      put(png, ex + 1, ey, BORDER);
    }
  }
  return png;
}

const index = JSON.parse(fs.readFileSync(path.join(mapsDir, 'index.json'), 'utf8'));
for (const entry of index) {
  const map = JSON.parse(fs.readFileSync(path.join(mapsDir, entry.file), 'utf8'));
  const output = path.join(outDir, `custom-map-${String(entry.slot).padStart(2, '0')}.png`);
  fs.writeFileSync(output, PNG.sync.write(render(map)));
}

console.log(`${index.length} Custom Game map previews -> ${outDir}`);
