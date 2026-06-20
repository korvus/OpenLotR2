/*
 * Exporte les cartes de campagne de L2_MAPS.DAT vers des JSON consommables
 * par le renderer Phaser.
 *
 * Format source : 40 slots × (6 couches 64×64 + 1 bitmap 65×129).
 * Couches identifiées (voir tools/inspect-maps.js) :
 *   0 : classe de terrain / drapeaux (4 = eau)
 *   1 : drapeaux (0/4/8/12) — sémantique à confirmer
 *   2 : indice de tuile terrain (tileset BASE01, 140 tuiles)
 *   3 : routes / rivières (épars) — sémantique à confirmer
 *   4 : points d'intérêt (épars) — sémantique à confirmer
 *   5 : identifiant de comté (0 = eau / hors carte)
 *   extra : silhouette 65×129 pour la mini-carte
 *
 * Avec un L2.ENG en troisième argument, embarque aussi le titre de la carte
 * et les noms de comtés : la table des noms commence à la chaîne
 * « Here Be Dragons! » suivie de « Duchy of Cornwall » — 24 blocs de
 * 20 chaînes (nom du hors-carte + 19 comtés, « CTYn » = emplacement vide),
 * immédiatement suivis des 24 titres de cartes. Le comté d'id N porte le
 * nom d'indice N−1 du bloc.
 *
 * Usage : node tools/export-maps.js <L2_MAPS.DAT> <dossier-sortie> [L2.ENG]
 */
const fs = require('fs');
const path = require('path');

const LAYERS = 6;
const LAYER_SIZE = 64 * 64;
const EXTRA_W = 65;
const EXTRA_H = 129;
const SLOT_SIZE = LAYERS * LAYER_SIZE + EXTRA_W * EXTRA_H;

const [, , datPath, outDir, engPath] = process.argv;
const buf = fs.readFileSync(datPath);
const slots = buf.length / SLOT_SIZE;
fs.mkdirSync(outDir, { recursive: true });

// noms de cartes et de comtés depuis L2.ENG (chaînes terminées par 0)
let titles = null;
let countyBlocks = null;
if (engPath) {
  const eng = fs.readFileSync(engPath);
  const strings = [];
  let cur = '';
  for (let i = 0; i < eng.length; i++) {
    if (eng[i] === 0) { strings.push(cur); cur = ''; } else { cur += String.fromCharCode(eng[i]); }
  }
  const i0 = strings.findIndex((s, i) => s === 'Here Be Dragons!' && strings[i + 1] === 'Duchy of Cornwall');
  if (i0 < 0) { throw new Error('table des comtés introuvable dans ' + engPath); }
  countyBlocks = [];
  for (let m = 0; m < 24; m++) {
    countyBlocks.push(strings.slice(i0 + m * 20, i0 + (m + 1) * 20));
  }
  titles = strings.slice(i0 + 24 * 20, i0 + 24 * 20 + 24);
}

let used = 0;
const index = [];
for (let s = 0; s < slots; s++) {
  const base = s * SLOT_SIZE;
  const layers = [];
  for (let l = 0; l < LAYERS; l++) {
    layers.push(Array.from(buf.slice(base + l * LAYER_SIZE, base + (l + 1) * LAYER_SIZE)));
  }

  // slot inutilisé : la couche terrain est (quasi) constante
  const distinct = new Set(layers[2]);
  if (distinct.size < 4) { continue; }

  const extra = Array.from(buf.slice(base + LAYERS * LAYER_SIZE, base + SLOT_SIZE));
  const name = `map${String(s).padStart(2, '0')}`;
  const json = {
    slot: s,
    name: titles ? titles[used] : name,
    outsideName: countyBlocks ? countyBlocks[used][0] : '',
    countyNames: countyBlocks ? countyBlocks[used].slice(1) : [],
    width: 64,
    height: 64,
    terrainMax: Math.max(...layers[2]),
    layers: {
      terrainClass: layers[0],
      flags: layers[1],
      terrain: layers[2],
      roads: layers[3],
      features: layers[4],
      county: layers[5]
    },
    minimap: { width: EXTRA_W, height: EXTRA_H, data: extra }
  };
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(json));
  index.push({ slot: s, file: `${name}.json`, name: json.name, counties: new Set(layers[5].filter(v => v !== 0)).size, terrainMax: json.terrainMax });
  used++;
}

fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
index.forEach(e => console.log(`slot ${e.slot}: ${e.counties} comtés, terrainMax=${e.terrainMax}`));
console.log(`${used}/${slots} slots exportés vers ${outDir}`);
