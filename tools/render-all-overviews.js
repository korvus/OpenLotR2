/*
 * Render an overview image for every exported campaign map.
 *
 * Usage:
 *   node tools/render-all-overviews.js <maps-dir> <main-scene-dir> <output-dir>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const [, , mapsDir, sceneDir, outDir] = process.argv;
if (!outDir) {
  throw new Error('usage: render-all-overviews.js <maps-dir> <main-scene-dir> <output-dir>');
}
fs.mkdirSync(outDir, { recursive: true });

const index = JSON.parse(fs.readFileSync(path.join(mapsDir, 'index.json'), 'utf8'));
for (const entry of index) {
  const slot = String(entry.slot).padStart(2, '0');
  const result = spawnSync(process.execPath, [
    path.join(__dirname, 'render-overview.js'),
    path.join(mapsDir, entry.file),
    path.join(sceneDir, 'mini-spring.png'),
    path.join(sceneDir, 'mini-roads-spring.png'),
    path.join(sceneDir, 'features'),
    path.join(outDir, `overview-map${slot}.png`)
  ], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`overview rendering failed for ${entry.file}`);
  }
}

console.log(`${index.length} campaign overviews -> ${outDir}`);
