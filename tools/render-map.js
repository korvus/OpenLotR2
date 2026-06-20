/*
 * Rend une carte de campagne en PNG hors du jeu, pour valider tileset et
 * géométrie sans passer par Electron.
 *
 * Règle découverte : la couche 0 (classe) choisit la PLANCHE, la couche 2
 * (indice) choisit la frame dedans. Classes 1/2/3 (routes), 8 (forêts),
 * 10 (rivières/arbres), 18 → planche ROADS ; classe 32 = champ (frame 80) ;
 * 64 = ville 2×2 ; 128 = château 2×2 ou industrie mono-tuile ; le reste →
 * planche BASE. Avec un dossier features/ (extract-features.js) en 5e
 * argument, pose aussi villes/châteaux/industries (saison = printemps).
 *
 * Usage : node tools/render-map.js <map.json> <base.png> <sortie.png> [roads.png] [features/]
 */
const fs = require('fs');
const { PNG } = require('pngjs');

const [, , mapPath, tilesPath, outPath, roadsPath, featuresDir] = process.argv;

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const sheet = PNG.sync.read(fs.readFileSync(tilesPath));
const roadsSheet = roadsPath ? PNG.sync.read(fs.readFileSync(roadsPath)) : null;
const ROADS_CLASSES = new Set([1, 2, 3, 8, 10, 18]);
const BLACKSMITH_FRAMES = Array.from({ length: 9 }, (_, i) => 10 + i);
const RESOURCE_INDUSTRY_KINDS = [0, 20, 30];
const MAP_INDUSTRY_KINDS = [...RESOURCE_INDUSTRY_KINDS, ...BLACKSMITH_FRAMES];

const FRAME_W = 64;
const FRAME_H = 34;
const COLS = 10;
const HALF_W = 29;
const HALF_H = 15;
const OFF_X = 29; // centre du losange dans la frame
const OFF_Y = 19;

const W = map.width;
const H = map.height;
const worldW = (W + H) * HALF_W;
const worldH = (W + H) * HALF_H + 60;

const out = new PNG({ width: worldW, height: worldH });

function blitTile(src, id, dstX, dstY) {
  const sx = (id % COLS) * FRAME_W;
  const sy = Math.floor(id / COLS) * FRAME_H;
  for (let y = 0; y < FRAME_H; y++) {
    for (let x = 0; x < FRAME_W; x++) {
      const si = ((sy + y) * src.width + sx + x) * 4;
      if (src.data[si + 3] === 0) continue;
      const dx = dstX + x;
      const dy = dstY + y;
      if (dx < 0 || dy < 0 || dx >= worldW || dy >= worldH) continue;
      const di = (dy * worldW + dx) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
}

const GRASS = 14; // frame d'herbe pleine (plage 6-21 de BASE = classe 0)
const terrain = map.layers.terrain;
const tclass = map.layers.terrainClass;
const centerX = H * HALF_W;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const id = terrain[i];
    const cls = tclass[i];
    const tx = centerX + (x - y) * HALF_W - OFF_X;
    const ty = (x + y) * HALF_H - OFF_Y + 50;

    const useRoads = roadsSheet && ROADS_CLASSES.has(cls);
    const under = map.layers.roads[i]; // route sous l'entité (couche 3)

    if (cls === 32) {
      // champ : herbe + labour (frame 80 de ROADS)
      blitTile(sheet, GRASS, tx, ty);
      if (roadsSheet) blitTile(roadsSheet, 80, tx, ty);
    } else if (cls === 64 || cls === 128) {
      // emprise de ville / château / industrie : herbe (la couche 2 y range
      // la variante d'herbe pour les groupes) + route de la couche 3
      blitTile(sheet, (id >= 6 && id <= 21) ? id : GRASS, tx, ty);
      if (roadsSheet && under > 0) blitTile(roadsSheet, under, tx, ty);
    } else if (cls === 16) {
      // slot de village : herbe seule (le rendu hors-jeu ne connaît pas la
      // population ; les villages réels sont posés en jeu par placeFeatures)
      blitTile(sheet, (id >= 6 && id <= 21) ? id : GRASS, tx, ty);
      if (roadsSheet && under > 0) blitTile(roadsSheet, under, tx, ty);
    } else if (cls === 8 && id <= 24) {
      // quart de montagne (frame MTNS posée par la passe entités)
      blitTile(sheet, GRASS, tx, ty);
      if (roadsSheet && under > 0) blitTile(roadsSheet, under, tx, ty);
    } else if (useRoads) {
      // routes / forêts / rivières : herbe en dessous (les frames ROADS ont
      // des bords transparents), frame ROADS par-dessus (la frame 0 est un
      // tronçon de route valide)
      blitTile(sheet, GRASS, tx, ty);
      if (roadsSheet && under > 0) blitTile(roadsSheet, under, tx, ty);
      if (roadsSheet) blitTile(roadsSheet, id, tx, ty);
    } else if (id <= 5) {
      // 0 = vide, 1-5 = lamelles de bordure des reliefs : herbe + lamelle.
      blitTile(sheet, GRASS, tx, ty);
      if (id > 0) blitTile(sheet, id, tx, ty);
    } else {
      blitTile(sheet, id, tx, ty);
    }
  }
}

// Côte à falaises au-delà des bords x=0 / y=0 terrestres (puis mer
// ouverte) — même règle que Campaign.buildSeaBackground : frames
// directionnelles relevées sur les côtes réelles (terre en +x = 42-45,
// terre en +y = 46-49, coin rentrant = 62-65).
const fringe = (x, y, band) => {
  const v = ((x * 7 + y * 13) % 4 + 4) % 4;
  blitTile(sheet, band + v, centerX + (x - y) * HALF_W - OFF_X, (x + y) * HALF_H - OFF_Y + 50);
};
for (let y = 0; y < H; y++) {
  if (tclass[y * W] !== 4) fringe(-1, y, 42);
}
for (let x = 0; x < W; x++) {
  if (tclass[x] !== 4) fringe(x, -1, 46);
}
if (tclass[0] !== 4) fringe(-1, -1, 62);

// entités multi-tuiles (mêmes ancres que Campaign.placeFeatures : quad 2×2 →
// losange N en (29,60) du PNG, mono-tuile → (0,34))
if (featuresDir) {
  function blitPng(png, dstX, dstY) {
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const si = (y * png.width + x) * 4;
        if (png.data[si + 3] === 0) continue;
        const dx = dstX + x;
        const dy = dstY + y + 50;
        if (dx < 0 || dy < 0 || dx >= worldW || dy >= worldH) continue;
        const di = (dy * worldW + dx) * 4;
        out.data[di] = png.data[si];
        out.data[di + 1] = png.data[si + 1];
        out.data[di + 2] = png.data[si + 2];
        out.data[di + 3] = 255;
      }
    }
  }

  // quarts de montagne : classe 8, indice ≤ 24 = frame MTNS de la tuile
  for (let i = 0; i < W * H; i++) {
    if (tclass[i] !== 8 || terrain[i] > 24) continue;
    const x = i % W, y = (i / W) | 0;
    blitPng(
      PNG.sync.read(fs.readFileSync(`${featuresDir}/mtn-spring-${terrain[i]}.png`)),
      centerX + (x - y) * HALF_W - 29,
      (x + y) * HALF_H - 49
    );
  }

  // villages : AUCUN dans le rendu hors-jeu — les slots de classe 16 sont
  // de l'herbe au départ (vérifié sur capture DOS : pop de départ ~383 =
  // zéro village) et ce rendu ne connaît pas la population ; les villages
  // sont posés en jeu par placeFeatures() quand la population croît.

  const cty = map.layers.county;
  const seen = new Array(W * H).fill(false);
  const placed = [];
  const towns = [];
  for (let i = 0; i < W * H; i++) {
    const c = tclass[i];
    if ((c !== 64 && c !== 128) || seen[i]) continue;
    const comp = [];
    const q = [i];
    seen[i] = true;
    while (q.length) {
      const j = q.pop();
      comp.push(j);
      const x = j % W, y = (j / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const k = ny * W + nx;
        if (!seen[k] && tclass[k] === c) { seen[k] = true; q.push(k); }
      }
    }
    if (c === 64) {
      comp.sort((a, b) => ((a % W) + ((a / W) | 0)) - ((b % W) + ((b / W) | 0)));
      const ax = comp[0] % W, ay = (comp[0] / W) | 0;
      placed.push({ r: ax + ay, x: centerX + (ax - ay) * HALF_W - 58, y: (ax + ay) * HALF_H - 75, file: 'town-spring-1' });
      towns.push({ x: ax, y: ay, county: cty[comp[0]] });
    } else {
      const set = new Set(comp);
      const candidates = comp
        .filter(t => t % W < W - 1 && set.has(t + 1) && set.has(t + W) && set.has(t + W + 1))
        .map(t => {
          const tiles = [t, t + 1, t + W, t + W + 1];
          const score = tiles.reduce((sum, tile) =>
            sum + (terrain[tile] === 30 ? 100 : ([0, 20].includes(terrain[tile]) ? 1 : 0)), 0);
          return { tiles, score };
        })
        .filter(candidate => comp.every(tile =>
          candidate.tiles.includes(tile) || MAP_INDUSTRY_KINDS.includes(terrain[tile])))
        .sort((a, b) => a.score - b.score);
      const castleTiles = new Set(candidates[0]?.tiles || (comp.length >= 3 ? comp : []));
      if (castleTiles.size) {
        const anchor = [...castleTiles].sort((a, b) =>
          ((a % W) + ((a / W) | 0)) - ((b % W) + ((b / W) | 0)))[0];
        const ax = anchor % W, ay = (anchor / W) | 0;
        placed.push({ r: ax + ay, x: centerX + (ax - ay) * HALF_W - 58, y: (ax + ay) * HALF_H - 75, file: 'castle-spring-1' });
      }
      for (const t of comp.filter(tile => !castleTiles.has(tile))) {
        if (!MAP_INDUSTRY_KINDS.includes(terrain[t])) continue;
        const x = t % W, y = (t / W) | 0;
        placed.push({ r: x + y, x: centerX + (x - y) * HALF_W - 29, y: (x + y) * HALF_H - 49, file: 'ind-spring-' + map.layers.terrain[t] });
      }
    }
  }
  for (const town of towns) {
    let best = null;
    for (let i = 0; i < W * H; i++) {
      if (cty[i] !== town.county || tclass[i] !== 0 || ![10, 19].includes(terrain[i])) continue;
      const x = i % W, y = (i / W) | 0;
      const d = Math.abs(x - town.x) + Math.abs(y - town.y);
      const score = d * 10 + (terrain[i] === 10 ? 0 : 1);
      if (!best || score < best.score) best = { x, y, score };
    }
    if (best) {
      const frame = BLACKSMITH_FRAMES[(best.x * 3 + best.y) % BLACKSMITH_FRAMES.length];
      placed.push({
        r: best.x + best.y,
        x: centerX + (best.x - best.y) * HALF_W - 29,
        y: (best.x + best.y) * HALF_H - 49,
        file: 'ind-spring-' + frame
      });
    }
  }
  placed.sort((a, b) => a.r - b.r);
  for (const p of placed) {
    blitPng(PNG.sync.read(fs.readFileSync(`${featuresDir}/${p.file}.png`)), p.x, p.y);
  }
}

fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`rendu ${worldW}x${worldH} -> ${outPath}`);
