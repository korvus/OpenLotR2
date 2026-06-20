/*
 * Analyse les tuiles encore noires après composition BASE01+BASE1A :
 * croise (frame vide dans la planche) × (classe de terrain couche 0)
 * pour découvrir quelle couche sélectionne les planches annexes (MTNS…).
 *
 * Usage : node tools/analyze-holes.js <map.json> <composite.png>
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const [, , mapPath, sheetPath] = process.argv;
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const sheet = PNG.sync.read(fs.readFileSync(sheetPath));

const FRAME_W = 64, FRAME_H = 34, COLS = 10;

// une frame est "vide" si tous ses pixels sont transparents
function frameEmpty(id) {
  const sx = (id % COLS) * FRAME_W;
  const sy = Math.floor(id / COLS) * FRAME_H;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      if (sheet.data[((sy + y) * sheet.width + sx + x) * 4 + 3] > 0) return false;
    }
  }
  return true;
}

const emptyCache = {};
const byClass = {};
const terrain = map.layers.terrain;
const tclass = map.layers.terrainClass;

for (let i = 0; i < terrain.length; i++) {
  const id = terrain[i];
  if (!(id in emptyCache)) emptyCache[id] = frameEmpty(id);
  const key = `class=${tclass[i]}`;
  if (!byClass[key]) byClass[key] = { total: 0, holes: 0, holeIds: new Set(), okIds: new Set() };
  byClass[key].total++;
  if (emptyCache[id]) { byClass[key].holes++; byClass[key].holeIds.add(id); }
  else byClass[key].okIds.add(id);
}

Object.entries(byClass).sort().forEach(([k, v]) => {
  const ids = [...v.holeIds].sort((a, b) => a - b).join(',');
  console.log(`${k}: ${v.holes}/${v.total} trous ; indices troués: [${ids}]`);
});

const allEmpty = Object.entries(emptyCache).filter(([, e]) => e).map(([id]) => +id).sort((a, b) => a - b);
console.log(`\nindices vides utilisés par la carte : [${allEmpty.join(',')}]`);
