/*
 * Extrait les entités multi-tuiles de la carte de campagne :
 *
 *   - TOWN1A-D : 3 villes 2×2 (tuiles 47-50, 51-54, 55-58, quarts dans
 *     l'ordre N,W,E,S) → town-<saison>-<0..2>.png, et les bâtiments
 *     d'industrie mono-tuile (0 = carrière, 10-18 = forge animée,
 *     20 = mine, 30 = scierie, + 19/59/60 pour plus tard)
 *     → ind-<saison>-<idx>.png.
 *   - CASTLE1A-D : 25 châteaux 2×2 (quads consécutifs) →
 *     castle-<saison>-<0..24>.png.
 *   - MTNS1A-D : 25 quarts de montagnes (4 modèles 2×2 + un 3×3) ; la
 *     couche 2 de la carte référence directement ces indices (classe 8,
 *     indice ≤ 24) → mtn-<saison>-<0..24>.png, une frame PAR TUILE.
 *   - FLAGS1A-D : tuiles 85-102 = troupeaux de vaches 58×30 compressés en
 *     RLE, 3 densités (faible/moyen/surpâturage) × 6 frames d'animation →
 *     herd-<saison>-<0..2>-<0..5>.png ; tuiles 0-55 = drapeaux des nobles
 *     32×24 (8 couleurs × 7 frames, RLE) → flag-<0..7>-<0..6>.png
 *     (extraits du printemps seulement, identiques entre saisons).
 *
 * Canvas fixes pour des ancres uniformes entre saisons :
 *   - quad 2×2 : 117×120, coin haut-gauche du losange N en (29,60) ;
 *   - mono-tuile : 58×64, losange en (0,34).
 *
 * Le rendu (losange + rangées de surplomb) est fait par tools/lib/pl8-draw
 * (pl8image ne dessine pas les surplombs).
 *
 * Usage : node tools/extract-features.js <dossier-PL8> <dossier-sortie>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { drawTile, drawRleTile, readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir] = process.argv;
fs.mkdirSync(outDir, { recursive: true });

const SEASONS = { A: 'spring', B: 'summer', C: 'autumn', D: 'winter' };
const QUAD_REL = [[29, 0], [0, 15], [58, 15], [29, 30]]; // N,W,E,S
const BLACKSMITH_IDX = Array.from({ length: 9 }, (_, i) => 10 + i);
// Bois/scierie (kind 30) : sa tuile TOWN1x a le sommet rogné dans le PL8
// (surplomb à sommet plat) → asset manuel extrait d'une capture DOS :
//   - ind-*-30.png = BOIS = scierie à roue à eau + chariot de grumes
//     (doc/captures/map-wood-sawmill-wheel.png).
// Il est réécrit à part plus bas, après les industries PL8.
const INDUSTRY_IDX = [0, ...BLACKSMITH_IDX, 19, 20, 59, 60];
const MANUAL_SAWMILL_OFFSET_X = 8;
const MANUAL_SAWMILL_OFFSET_Y = 13;

const pal = readPalette(path.join(pl8Dir, 'BASE01.256'));

function makePut (png) {
  return (x, y, v) => {
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) { return; }
    const i = (y * png.width + x) * 4;
    png.data[i] = pal[v][0];
    png.data[i + 1] = pal[v][1];
    png.data[i + 2] = pal[v][2];
    png.data[i + 3] = 255;
  };
}

function quadPng (img, buf, base) {
  const png = new PNG({ width: 117, height: 120 });
  const put = makePut(png);
  QUAD_REL.forEach(([dx, dy], k) => drawTile(img.tiles[base + k], buf, dx, 60 + dy, put));
  return png;
}

function singlePng (img, buf, idx) {
  const png = new PNG({ width: 58, height: 64 });
  drawTile(img.tiles[idx], buf, 0, 34, makePut(png));
  return png;
}

function shiftedPng (png, dx, dy = 0) {
  const out = new PNG({ width: png.width, height: png.height });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const sx = x - dx;
      const sy = y - dy;
      if (sx < 0 || sy < 0 || sx >= png.width || sy >= png.height) { continue; }
      const si = (sy * png.width + sx) * 4;
      const di = (y * png.width + x) * 4;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function industryPng (img, buf, idx) {
  return singlePng(img, buf, idx);
}

// icônes 48×48 de l'écran de village (brutes, sans saison) :
// ICONVILL : 0 = blé, 1 = mouton (PAS utilisé par la modale champ de
// l'original — conservé comme asset), 2 = vaches, 3 = paysan à la houe
// (= symbole FERMIER de la remise en état), 5 = château, 9 = forge ;
// ICON_TMP : 0 = broussaille (FRICHE), 1 = prairie fleurie (JACHÈRE),
// 33 = eaux (INONDATION), 34 = terre craquelée (SÉCHERESSE).
{
  function rawIcon (buf, t) {
    const png = new PNG({ width: 48, height: 48 });
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 48; x++) {
        const v = buf[t.offset + y * 48 + x];
        const i = (y * 48 + x) * 4;
        png.data[i] = pal[v][0];
        png.data[i + 1] = pal[v][1];
        png.data[i + 2] = pal[v][2];
        png.data[i + 3] = 255;
      }
    }
    return png;
  }

  const villBuf = fs.readFileSync(path.join(pl8Dir, 'ICONVILL.PL8'));
  const vill = Pl8.parse(villBuf);
  const names = { 0: 'grain', 1: 'sheep', 2: 'cattle', 3: 'reclaim', 5: 'castle', 9: 'smithy' };
  for (const [idx, name] of Object.entries(names)) {
    fs.writeFileSync(path.join(outDir, `icon-${name}.png`), PNG.sync.write(rawIcon(villBuf, vill.tiles[idx])));
  }

  const tmpBuf = fs.readFileSync(path.join(pl8Dir, 'ICON_TMP.PL8'));
  const tmp = Pl8.parse(tmpBuf);
  const tmpNames = { 0: 'barren', 1: 'fallow', 33: 'flooded', 34: 'parched' };
  for (const [idx, name] of Object.entries(tmpNames)) {
    fs.writeFileSync(path.join(outDir, `icon-${name}.png`), PNG.sync.write(rawIcon(tmpBuf, tmp.tiles[idx])));
  }
}

// Bandeau haut de l'écran de campagne (menu bar) : PANELS 196-203 = 8
// tuiles 24×24 de parchemin doré qui se répètent EN BOUCLE sur toute la
// largeur, alignées sur une grille de 24 px à partir de (0,0) — identifié
// par template-matching pixel à pixel sur une capture DOSBox (~80-92 % de
// correspondance par cellule, palette BASE01). PANELS 256-260 = blasons
// 13×16 des joueurs encore à jouer (rouge, jaune, noir, violet, bleu),
// fond (index 0) transparent.
{
  const pnlBuf = fs.readFileSync(path.join(pl8Dir, 'PANELS.PL8'));
  const pnl = Pl8.parse(pnlBuf);

  const bar = new PNG({ width: 640, height: 24 });
  for (let c = 0; c * 24 < 640; c++) {
    const t = pnl.tiles[196 + (c % 8)];
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24 && c * 24 + x < 640; x++) {
        const v = pnlBuf[t.offset + y * 24 + x];
        const i = (y * 640 + c * 24 + x) * 4;
        bar.data[i] = pal[v][0];
        bar.data[i + 1] = pal[v][1];
        bar.data[i + 2] = pal[v][2];
        bar.data[i + 3] = 255;
      }
    }
  }
  // biseau dessiné par le jeu PAR-DESSUS les tuiles (mesuré sur capture
  // DOSBox) : rangée 0 = surlignage 247,223,134 ; rangée 23 = liseret
  // sombre 81,73,53
  for (let x = 0; x < 640; x++) {
    const t0 = x * 4;
    bar.data[t0] = 247; bar.data[t0 + 1] = 223; bar.data[t0 + 2] = 134;
    const t23 = (23 * 640 + x) * 4;
    bar.data[t23] = 81; bar.data[t23 + 1] = 73; bar.data[t23 + 2] = 53;
  }
  fs.writeFileSync(path.join(outDir, 'topbar.png'), PNG.sync.write(bar));

  // texture de parchemin continue (menus déroulants, panneaux) : les 8
  // mêmes tuiles en damier 4×2 → 96×48, à répéter
  const parch = new PNG({ width: 96, height: 48 });
  for (let c = 0; c < 8; c++) {
    const t = pnl.tiles[196 + c];
    const bx = (c % 4) * 24, by = ((c / 4) | 0) * 24;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const v = pnlBuf[t.offset + y * 24 + x];
        const i = ((by + y) * 96 + bx + x) * 4;
        parch.data[i] = pal[v][0];
        parch.data[i + 1] = pal[v][1];
        parch.data[i + 2] = pal[v][2];
        parch.data[i + 3] = 255;
      }
    }
  }
  fs.writeFileSync(path.join(outDir, 'parchment.png'), PNG.sync.write(parch));

  ['red', 'yellow', 'black', 'purple', 'blue'].forEach((name, k) => {
    const t = pnl.tiles[256 + k];
    const png = new PNG({ width: t.width, height: t.height });
    for (let y = 0; y < t.height; y++) {
      for (let x = 0; x < t.width; x++) {
        const v = pnlBuf[t.offset + y * t.width + x];
        if (v === 0) { continue; }
        const i = (y * t.width + x) * 4;
        png.data[i] = pal[v][0];
        png.data[i + 1] = pal[v][1];
        png.data[i + 2] = pal[v][2];
        png.data[i + 3] = 255;
      }
    }
    fs.writeFileSync(path.join(outDir, `shield-top-${name}.png`), PNG.sync.write(png));
  });
}

// Mini-carte stratégique : MAP01.PL8 groupe la carte de campagne
// Angleterre en 5 tuiles (0 = comtés en couleurs plates où l'INDEX DE
// PALETTE = l'ID DU COMTÉ, 1 = texture olive 4 niveaux (indices 10-13)
// avec liserés noirs (63) sur fond 0, 2-3 = versions 64×64, 4 = ancienne
// silhouette iso 65×129). La carte est un dessin d'artiste : AUCUNE
// projection simple ne la relie à la grille de tuiles — l'id par pixel
// vient donc du colormap. → minimap-texture.png (mer transparente, le
// cadre du panneau montre sa propre texture brune dessous) et
// minimap-counties.png (id du comté dans le canal R, données).
{
  const mapBuf = fs.readFileSync(path.join(pl8Dir, 'MAP01.PL8'));
  const map = Pl8.parse(mapBuf);
  const tex = map.tiles[1];
  const cmap = map.tiles[0];

  const texPng = new PNG({ width: 128, height: 128 });
  const idsPng = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      const v = mapBuf[tex.offset + y * 128 + x];
      if (v !== 0) { // 0 = mer/hors-carte, transparent
        texPng.data[i] = pal[v][0];
        texPng.data[i + 1] = pal[v][1];
        texPng.data[i + 2] = pal[v][2];
        texPng.data[i + 3] = 255;
      }
      const id = mapBuf[cmap.offset + y * 128 + x];
      idsPng.data[i] = (id >= 1 && id <= 19) ? id : 0;
      idsPng.data[i + 3] = 255;
    }
  }
  fs.writeFileSync(path.join(outDir, 'minimap-texture.png'), PNG.sync.write(texPng));
  fs.writeFileSync(path.join(outDir, 'minimap-counties.png'), PNG.sync.write(idsPng));
}

// Colonne de boutons de la mini-carte : MISC_CTY 92 = les 4 boutons
// (ouvriers oisifs, rations, bonheur, loupe), dessinés dans le cadre à
// (133,8) — vérifié par template-matching exact ; 91 = la jauge légende
// des calques (violet→bleu→bleu clair→jaune→orange→rouge, ✓/✗, flèche de
// sortie) qui recouvre la colonne en mode calque. Les 4 icônes sont aussi
// découpées séparément (indicateur du calque actif sur la carte).
{
  const mcBuf = fs.readFileSync(path.join(pl8Dir, 'MISC_CTY.PL8'));
  const mc = Pl8.parse(mcBuf);
  const rawCrop = (t, sy, h) => {
    const png = new PNG({ width: t.width, height: h });
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < t.width; x++) {
        const v = mcBuf[t.offset + (sy + y) * t.width + x];
        const i = (y * t.width + x) * 4;
        png.data[i] = pal[v][0];
        png.data[i + 1] = pal[v][1];
        png.data[i + 2] = pal[v][2];
        png.data[i + 3] = 255;
      }
    }
    return png;
  };
  const legend = mc.tiles[91];
  const buttons = mc.tiles[92];
  // #58 = panneau de comté ÉTRANGER (château sous un ciel d'orage,
  // 162×274) : affiché sous la mini-carte à la place des infos quand le
  // comté sélectionné n'appartient pas au joueur
  fs.writeFileSync(path.join(outDir, 'county-foreign.png'), PNG.sync.write(rawCrop(mc.tiles[58], 0, mc.tiles[58].height)));
  fs.writeFileSync(path.join(outDir, 'minimap-legend.png'), PNG.sync.write(rawCrop(legend, 0, legend.height)));
  ['workers', 'rations', 'happiness', 'zoom'].forEach((name, k) => {
    const sy = Math.round(k * buttons.height / 4);
    const h = Math.round((k + 1) * buttons.height / 4) - sy;
    fs.writeFileSync(path.join(outDir, `minimap-btn-${name}.png`), PNG.sync.write(rawCrop(buttons, sy, h)));
  });
}

for (const [letter, season] of Object.entries(SEASONS)) {
  const townBuf = fs.readFileSync(path.join(pl8Dir, `TOWN1${letter}.PL8`));
  const town = Pl8.parse(townBuf);
  [47, 51, 55].forEach((base, k) => {
    fs.writeFileSync(path.join(outDir, `town-${season}-${k}.png`), PNG.sync.write(quadPng(town, townBuf, base)));
  });
  for (const idx of INDUSTRY_IDX) {
    fs.writeFileSync(path.join(outDir, `ind-${season}-${idx}.png`), PNG.sync.write(industryPng(town, townBuf, idx)));
  }

  const sawmillPath = path.resolve(__dirname, '../doc/captures/map-wood-sawmill-wheel.png');
  const sawmill = shiftedPng(
    PNG.sync.read(fs.readFileSync(sawmillPath)),
    MANUAL_SAWMILL_OFFSET_X,
    MANUAL_SAWMILL_OFFSET_Y
  );
  fs.writeFileSync(path.join(outDir, `ind-${season}-30.png`), PNG.sync.write(sawmill));

  // villages mono-tuile (TOWN1x 59 = normal, 60 = brûlé) : posés sur les
  // slots de classe 16 du comté selon sa population (voir Campaign)
  [59, 60].forEach((idx, k) => {
    fs.writeFileSync(path.join(outDir, `village-${season}-${k}.png`), PNG.sync.write(singlePng(town, townBuf, idx)));
  });

  const castleBuf = fs.readFileSync(path.join(pl8Dir, `CASTLE1${letter}.PL8`));
  const castle = Pl8.parse(castleBuf);
  for (let k = 0; k < castle.tiles.length / 4; k++) {
    fs.writeFileSync(path.join(outDir, `castle-${season}-${k}.png`), PNG.sync.write(quadPng(castle, castleBuf, k * 4)));
  }

  const mtnBuf = fs.readFileSync(path.join(pl8Dir, `MTNS1${letter}.PL8`));
  const mtn = Pl8.parse(mtnBuf);
  for (let k = 0; k < mtn.tiles.length; k++) {
    fs.writeFileSync(path.join(outDir, `mtn-${season}-${k}.png`), PNG.sync.write(singlePng(mtn, mtnBuf, k)));
  }

  // troupeaux (RLE) : 18 tuiles 58×30 = 3 densités × 6 frames
  const flagsBuf = fs.readFileSync(path.join(pl8Dir, `FLAGS1${letter}.PL8`));
  const flags = Pl8.parse(flagsBuf);
  const herdIdx = [];
  flags.tiles.forEach((t, i) => { if (t.width === 58 && t.height === 30) { herdIdx.push(i); } });
  herdIdx.forEach((ti, k) => {
    const t = flags.tiles[ti];
    const next = flags.tiles[ti + 1];
    const png = new PNG({ width: 58, height: 30 });
    drawRleTile(t, flagsBuf, (next ? next.offset : flagsBuf.length) - t.offset, 0, 0, makePut(png));
    fs.writeFileSync(path.join(outDir, `herd-${season}-${(k / 6) | 0}-${k % 6}.png`), PNG.sync.write(png));
  });

  // drapeaux des nobles : 56 tuiles 32×24 = 7 groupes × 8 FRAMES (rouge,
  // jaune, noir, violet, bleu + 2 drapeaux en feu), pas de variation
  // saisonnière → printemps seulement
  if (season === 'spring') {
    const flagIdx = [];
    flags.tiles.forEach((t, i) => { if (t.width === 32 && t.height === 24) { flagIdx.push(i); } });
    flagIdx.forEach((ti, k) => {
      const t = flags.tiles[ti];
      const next = flags.tiles[ti + 1];
      const png = new PNG({ width: 32, height: 24 });
      drawRleTile(t, flagsBuf, (next ? next.offset : flagsBuf.length) - t.offset, 0, 0, makePut(png));
      fs.writeFileSync(path.join(outDir, `flag-${(k / 8) | 0}-${k % 8}.png`), PNG.sync.write(png));
    });
  }

  console.log(`${season}: 3 villes, ${INDUSTRY_IDX.length} industries, ${castle.tiles.length / 4} châteaux, ${mtn.tiles.length} quarts de montagne, ${herdIdx.length} troupeaux`);
}
