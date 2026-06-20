/*
 * Compose les planches de tuiles : BASE01 (tuiles constantes) + BASE1X
 * (tuiles saisonnières). Les deux planches partagent le même agencement de
 * 140 cases ; décision PAR FRAME : on prend la frame saisonnière si elle est
 * dessinée, sinon la frame de base si elle est dessinée, sinon transparent.
 * Les frames entièrement noires (placeholders) sont traitées comme vides.
 *
 * Usage : node tools/composite-tilesets.js <base.png> <saison.png> <sortie.png>
 */
const fs = require('fs');
const { PNG } = require('pngjs');

// Un pixel "utile" est opaque et non noir pur (le noir pur sert de
// remplissage/placeholder dans ces planches, pas de couleur légitime).
function useful(sheet, i) {
  return sheet.data[i + 3] > 0 &&
    (sheet.data[i] >= 8 || sheet.data[i + 1] >= 8 || sheet.data[i + 2] >= 8);
}

const [, , basePath, seasonPath, outPath] = process.argv;
const base = PNG.sync.read(fs.readFileSync(basePath));
const season = PNG.sync.read(fs.readFileSync(seasonPath));

const out = new PNG({ width: base.width, height: base.height });
let fromSeason = 0, fromBase = 0;
for (let i = 0; i < out.data.length; i += 4) {
  let src = null;
  if (useful(season, i)) { src = season; fromSeason++; }
  else if (useful(base, i)) { src = base; fromBase++; }
  if (src) {
    out.data[i] = src.data[i];
    out.data[i + 1] = src.data[i + 1];
    out.data[i + 2] = src.data[i + 2];
    out.data[i + 3] = 255;
  }
}

fs.writeFileSync(outPath, PNG.sync.write(out));
console.log(`${outPath}: ${fromSeason} px saisonniers, ${fromBase} px de base`);
