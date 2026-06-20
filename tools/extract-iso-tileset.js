/*
 * Décode un tileset isométrique .PL8 (+ palette .256) vers un PNG transparent,
 * en respectant l'agencement en grille encodé dans le PL8 (x,y des tuiles).
 *
 * Rendu par tools/lib/pl8-draw.js et non par pl8image : GraphicFactory ne
 * dessine PAS les « extra rows » des tuiles (types 2/3/4) — on y perdait
 * notamment les CAILLOUX DES FRONTIÈRES DE COMTÉS (ROADS 38-46, des tuiles
 * d'herbe/arbres/route avec un liseré de pierres sur les arêtes hautes).
 * La plage agricole 79-139 fait exception : ses données supplémentaires
 * créent une barre horizontale parasite au milieu des champs, alors que le
 * dessin complet est déjà présent dans le losange principal.
 * Les planches miniatures 10×6 font également exception : leurs extra rows
 * débordent dans les cases voisines de la grille 13×7. Les détails utiles de
 * la vue d'ensemble, notamment routes et murets, sont dans le losange.
 *
 * Usage : node tools/extract-iso-tileset.js <fichier.pl8> <palette.256> <sortie.png> [largeur] [hauteur]
 *   largeur/hauteur : taille de la planche (défaut 640×480 ; utiliser 130 98
 *   pour les mini-planches *2A-D dont la grille fait 13×7 par case).
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { drawTile, readPalette } = require('./lib/pl8-draw');

const [, , pl8Path, palPath, outPath, widthArg, heightArg] = process.argv;

const buf = fs.readFileSync(pl8Path);
const pal = readPalette(palPath);
const image = Pl8.parse(buf);

const width = widthArg ? parseInt(widthArg, 10) : 640;
const height = heightArg ? parseInt(heightArg, 10) : 480;
const png = new PNG({ width, height });

let drawn = 0;
let skipped = 0;
image.tiles.forEach((t, frame) => {
  if (t.extraType === 0) { skipped++; return; } // brut/RLE : pas une tuile iso
  const suppressExtras = t.height <= 6 || (frame >= 79 && frame <= 139);
  const tile = suppressExtras
    ? { ...t, extraType: 1, extraRows: 0 }
    : t;
  drawTile(tile, buf, t.x, t.y, (x, y, v) => {
    if (x < 0 || y < 0 || x >= width || y >= height) { return; }
    const i = (y * width + x) * 4;
    png.data[i] = pal[v][0];
    png.data[i + 1] = pal[v][1];
    png.data[i + 2] = pal[v][2];
    png.data[i + 3] = 255;
  });
  drawn++;
});

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, PNG.sync.write(png));
console.log(`${drawn} tuiles (${skipped} non-iso ignorées) -> ${outPath}`);
