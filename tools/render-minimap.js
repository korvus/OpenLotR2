/*
 * Rend la mini-carte stratégique d'une carte de campagne en PNG, hors du jeu,
 * avec la même logique que Campaign.buildMiniMap() (scenes/campaign.js) :
 * silhouette 65×129 du slot (6 = terre, 22 = eau ; colonne = (x−y+64)/2,
 * ligne = x+y), doublée horizontalement, terre coloriée par propriétaire de
 * comté (répartition provisoire en trois fiefs), trait sombre entre fiefs.
 *
 * Usage : node tools/render-minimap.js <map.json> <sortie.png> [échelle]
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const [, , mapPath, outPath, scaleArg] = process.argv;
const scale = parseInt(scaleArg || '2', 10);

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const county = map.layers.county;
const mask = map.minimap.data;
const W = map.width;
const H = map.height;

const MMW = 130;
const MMH = 129;
const LAND = 6;

const COLORS = {
  red: [168, 24, 24],
  yellow: [208, 168, 24],
  green: [44, 116, 44],
  purple: [120, 40, 116]
};
const SEA = [12, 52, 48];
const BORDER = [16, 16, 12];

// début de partie comme GameState : un comté par seigneur (joueur purple à
// l'ouest, rival red à l'est), tout le reste neutre (green) ; l'id 32 marque
// les montagnes, pas un comté
const MAX_COUNTY_ID = 19;
const acc = {};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const id = county[y * W + x];
    if (!id || id > MAX_COUNTY_ID) continue;
    if (!acc[id]) acc[id] = { sum: 0, n: 0 };
    acc[id].sum += x - y;
    acc[id].n++;
  }
}
const ids = Object.keys(acc).sort((a, b) => acc[a].sum / acc[a].n - acc[b].sum / acc[b].n);
const owners = {};
if (ids.length > 0) owners[ids[0]] = 'purple';
if (ids.length > 1) owners[ids[ids.length - 1]] = 'red';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const valid = i => county[i] > 0 && county[i] <= MAX_COUNTY_ID;
const countyAt = (u, r) => {
  const uu = ((u ^ r) & 1) ? u - 1 : u;
  const x = clamp((r + uu - 64) >> 1, 0, W - 1);
  const y = clamp((r - uu + 64) >> 1, 0, H - 1);
  if (valid(y * W + x)) return county[y * W + x];
  for (let d = 1; d <= 2; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (valid(ny * W + nx)) return county[ny * W + nx];
      }
    }
  }
  return 0;
};

const ownerGrid = new Array(MMW * MMH).fill(null);
for (let r = 0; r < MMH; r++) {
  for (let u = 0; u < MMW; u++) {
    if (mask[r * 65 + (u >> 1)] !== LAND) continue;
    const id = countyAt(u, r);
    ownerGrid[r * MMW + u] = (id && owners[id])
      || (u > 0 && ownerGrid[r * MMW + u - 1])
      || (r > 0 && ownerGrid[(r - 1) * MMW + u])
      || 'green';
  }
}

const out = new PNG({ width: MMW * scale, height: MMH * scale });
for (let r = 0; r < MMH; r++) {
  for (let u = 0; u < MMW; u++) {
    const own = ownerGrid[r * MMW + u];
    let rgb = SEA;
    if (own) {
      const left = u > 0 ? ownerGrid[r * MMW + u - 1] : own;
      const up = r > 0 ? ownerGrid[(r - 1) * MMW + u] : own;
      rgb = ((left && left !== own) || (up && up !== own)) ? BORDER : COLORS[own];
    }
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const p = ((r * scale + dy) * out.width + u * scale + dx) * 4;
        out.data[p] = rgb[0];
        out.data[p + 1] = rgb[1];
        out.data[p + 2] = rgb[2];
        out.data[p + 3] = 255;
      }
    }
  }
}

fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`mini-carte ${MMW * scale}x${MMH * scale} -> ${outPath}`);
