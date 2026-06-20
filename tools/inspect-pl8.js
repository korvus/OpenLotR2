/*
 * Inspecte la structure d'un fichier .PL8 (nombre de tuiles, dimensions,
 * types d'encodage). Usage : node tools/inspect-pl8.js <fichier.pl8>
 */
const fs = require('fs');
const { Pl8 } = require('pl8image');

const file = process.argv[2];
const buf = fs.readFileSync(file);
const image = Pl8.parse(buf);

console.log('type:', image.type, ' tiles:', image.tiles.length);

const summary = {};
image.tiles.forEach((t, i) => {
  const key = `${t.width}x${t.height} extraType=${t.extraType} extraRows=${t.extraRows}`;
  summary[key] = (summary[key] || 0) + 1;
  if (i < 12) {
    console.log(`#${i}: w=${t.width} h=${t.height} x=${t.x} y=${t.y} type=${t.extraType} rows=${t.extraRows} offset=${t.offset}`);
  }
});

console.log('\nRésumé par gabarit :');
Object.entries(summary).forEach(([k, v]) => console.log(`  ${v} tuiles ${k}`));
