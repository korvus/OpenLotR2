/*
 * Extrait une police bitmap FNTL2_*.PL8 vers un atlas PNG + descripteur
 * BMFont XML pour Phaser (BitmapText).
 *
 * Ordre des glyphes (vérifié visuellement + tailles/positions des tuiles
 * sur FNTL2_14, la virgule étant basse avec queue et le point bas 2×2) :
 *   0-25 'a'-'z', 26-51 'A'-'Z' (capitales gothiques), 52-60 '1'-'9',
 *   61 '0', 62 '!', 63 '"', 64-78 % * ( ) - + = : ; ' ? \ / , .
 *   79-81 vides, 82+ accents ä á à â ë é è ê ï í ì î ö ó ò ô ü ú ù û
 *   ç ñ æ ß (❓ queue exacte non vérifiée glyphe à glyphe).
 * Les glyphes sont rendus en BLANC (le jeu recolore à l'exécution ;
 * BitmapText.setTint fait pareil). L'alignement vertical vient du y de
 * chaque tuile dans la planche source (offset dans sa rangée).
 *
 * Usage : node tools/extract-font.js <FNTL2_xx.PL8> <sortie-sans-ext>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');

const [, , pl8Path, outBase] = process.argv;
const buf = fs.readFileSync(pl8Path);
const img = Pl8.parse(buf);

const ORDER = 'abcdefghijklmnopqrstuvwxyz'
  + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  + '1234567890!"'
  + '%*()-+=:;\'?\\/,.'
  + '' // tuiles vides 79-81 (placeholders, jamais utilisées)
  + 'äáàâëéèêïíìîöóòôüúùûçñæß';

// rangées de la planche source : nouvelle rangée quand x repart à gauche
const rows = [];
let row = [];
let lastX = -1;
img.tiles.forEach((t, i) => {
  if (t.x < lastX) { rows.push(row); row = []; }
  row.push(i);
  lastX = t.x;
});
rows.push(row);
const rowTop = {};
for (const r of rows) {
  const top = Math.min(...r.map(i => img.tiles[i].y));
  for (const i of r) { rowTop[i] = top; }
}

// atlas : glyphes en ligne, 1 px d'écart
const usable = Math.min(ORDER.length, img.tiles.length);
let atlasW = 0;
let atlasH = 0;
for (let k = 0; k < usable; k++) {
  atlasW += img.tiles[k].width + 1;
  atlasH = Math.max(atlasH, img.tiles[k].height + (img.tiles[k].y - rowTop[k]) + 1);
}
const png = new PNG({ width: atlasW, height: atlasH });

const chars = [];
let cx = 0;
for (let k = 0; k < usable; k++) {
  const t = img.tiles[k];
  const yoff = t.y - rowTop[k];
  for (let y = 0; y < t.height; y++) {
    for (let x = 0; x < t.width; x++) {
      if (!buf[t.offset + y * t.width + x]) { continue; }
      const di = (y * png.width + cx + x) * 4;
      png.data[di] = 255; png.data[di + 1] = 255; png.data[di + 2] = 255; png.data[di + 3] = 255;
    }
  }
  chars.push({ id: ORDER.charCodeAt(k), x: cx, y: 0, w: t.width, h: t.height, yoff, adv: t.width + 1 });
  cx += t.width + 1;
}
// espace synthétique
chars.push({ id: 32, x: 0, y: 0, w: 0, h: 0, yoff: 0, adv: 5 });

const lineHeight = atlasH + 2;
const xml = ['<font>',
  `  <info face="lords2" size="${atlasH}" />`,
  `  <common lineHeight="${lineHeight}" base="${atlasH - 1}" scaleW="${atlasW}" scaleH="${atlasH}" pages="1" />`,
  `  <pages><page id="0" file="${path.basename(outBase)}.png" /></pages>`,
  `  <chars count="${chars.length}">`,
  ...chars.map(c => `    <char id="${c.id}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" xoffset="0" yoffset="${c.yoff}" xadvance="${c.adv}" page="0" chnl="15" />`),
  '  </chars>',
  '</font>'].join('\n');

fs.writeFileSync(outBase + '.png', PNG.sync.write(png));
fs.writeFileSync(outBase + '.xml', xml);
console.log(`${usable} glyphes + espace -> ${outBase}.png/.xml (${atlasW}x${atlasH})`);
