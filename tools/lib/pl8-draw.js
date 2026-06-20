/*
 * Rendu maison des tuiles .PL8 — pl8image (GraphicFactory) ne dessine PAS
 * les « extra rows » (le writeUInt8 est commenté dans isometricExtra, et
 * isometricLeft/Right les ignorent) : tous les hauts de bâtiments manquent.
 *
 * Format d'une tuile 58×30 (vérifié sur TOWN1x/CASTLE1x) :
 *   - losange : 30 rangées de largeurs 2,6,…,58,58,…,6,2 (h*h octets),
 *     rangée r dessinée en (x + départ, y + r) ;
 *   - puis extraRows rangées de surplomb (hauts de bâtiments) : type 2 =
 *     pleine largeur (width octets), type 3 = moitié gauche, type 4 =
 *     moitié droite (width/2+1 octets), type 1 = pas d'extra. Le bloc se
 *     termine à la rangée médiane du losange (indice repris du code mort de
 *     GraphicFactory : « y + halfHeight − 1 ») : rangée e dessinée en
 *     y + height/2 − extraRows + e, par-dessus le losange déjà posé.
 *   - octet 0 = transparent.
 */

function tileSize (t) {
  switch (t.extraType) {
    case 0: return t.width * t.height;
    case 2: return t.height * t.height + t.extraRows * t.width;
    case 3:
    case 4: return t.height * t.height + t.extraRows * (t.width / 2 + 1);
    default: return t.height * t.height;
  }
}

/*
 * Dessine la tuile dans `put(px, py, paletteIndex)` avec son losange en
 * (x, y) — les extras débordent au-dessus (py < y possible).
 */
function drawTile (tile, buf, x, y, put) {
  const data = buf.slice(tile.offset, tile.offset + tileSize(tile));
  const h = tile.height;
  const half = h / 2;
  let s = 0;

  for (let r = 0; r < h; r++) {
    const k = r < half ? r : h - 1 - r;
    const start = (half - 1 - k) * 2;
    const stop = start + k * 4 + 2;
    for (let w = start; w < stop; w++) {
      const v = data[s++];
      if (v) { put(x + w, y + r, v); }
    }
  }

  if (tile.extraType === 2 || tile.extraType === 3 || tile.extraType === 4) {
    const rowW = tile.extraType === 2 ? tile.width : tile.width / 2 + 1;
    const offX = tile.extraType === 4 ? tile.width - rowW : 0;
    for (let e = 0; e < tile.extraRows; e++) {
      for (let w = 0; w < rowW; w++) {
        const v = data[s++];
        if (v) { put(x + offX + w, y + half - tile.extraRows + e, v); }
      }
    }
  }
}

/*
 * Sprites RLE (extraType 0 à données plus courtes que width×height,
 * ex. troupeaux et drapeaux de FLAGS1x) : flux de jetons — `00 XX` = saut
 * transparent de XX pixels, `NN > 0` = NN pixels littéraux ; les lignes
 * font exactement `width` pixels (vérifié : 17+3+38 = 58).
 */
function drawRleTile (tile, buf, dataLen, x, y, put) {
  const data = buf.slice(tile.offset, tile.offset + dataLen);
  let s = 0;
  let cx = 0;
  let cy = 0;
  while (s < data.length && cy < tile.height) {
    const n = data[s++];
    if (n === 0) {
      cx += data[s++];
    } else {
      for (let k = 0; k < n; k++) {
        const v = data[s++];
        if (v) { put(x + cx, y + cy, v); }
        cx++;
      }
    }
    while (cx >= tile.width) { cx -= tile.width; cy++; }
  }
}

function readPalette (palPath) {
  const fs = require('fs');
  const p = fs.readFileSync(palPath);
  const pal = [];
  for (let i = 0; i < 256; i++) {
    pal.push([
      Math.round(p[i * 3] * 255 / 63),
      Math.round(p[i * 3 + 1] * 255 / 63),
      Math.round(p[i * 3 + 2] * 255 / 63)
    ]);
  }
  return pal;
}

module.exports = { drawTile, drawRleTile, tileSize, readPalette };
