/*
 * Extract the original advanced-labor screen assets and contact sheets.
 *
 * Usage:
 *   node tools/extract-advanced-labor-ui.js <PL8-directory> <output-directory> [--inspect]
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8 } = require('pl8image');
const { readPalette } = require('./lib/pl8-draw');

const [, , pl8Dir, outDir] = process.argv;
if (!outDir) {
  throw new Error('usage: extract-advanced-labor-ui.js <PL8-directory> <output-directory>');
}
fs.mkdirSync(outDir, { recursive: true });
const inspectDir = path.join(outDir, 'inspect');
const inspect = process.argv.includes('--inspect');
if (inspect) { fs.mkdirSync(inspectDir, { recursive: true }); }

const palette = readPalette(path.join(pl8Dir, 'LORDS2.256'));

function rawTile (buffer, tile, transparentZero = false) {
  const png = new PNG({ width: tile.width, height: tile.height });
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      const value = buffer[tile.offset + y * tile.width + x];
      const i = (y * tile.width + x) * 4;
      png.data[i] = palette[value][0];
      png.data[i + 1] = palette[value][1];
      png.data[i + 2] = palette[value][2];
      png.data[i + 3] = transparentZero && value === 0 ? 0 : 255;
    }
  }
  return png;
}

function rleTile (buffer, tile) {
  const png = new PNG({ width: tile.width, height: tile.height });
  let source = tile.offset;
  let x = 0;
  let y = 0;
  while (source < buffer.length && y < tile.height) {
    const count = buffer[source++];
    if (count === 0) {
      x += buffer[source++];
    } else {
      for (let n = 0; n < count && source < buffer.length; n++) {
        const value = buffer[source++];
        if (value !== 0 && x < tile.width && y < tile.height) {
          const i = (y * tile.width + x) * 4;
          png.data[i] = palette[value][0];
          png.data[i + 1] = palette[value][1];
          png.data[i + 2] = palette[value][2];
          png.data[i + 3] = 255;
        }
        x++;
      }
    }
    while (x >= tile.width) {
      x -= tile.width;
      y++;
    }
  }
  return png;
}

function writeSingle (file, name, transparentZero = false) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  const png = image.type === 0
    ? rawTile(buffer, image.tiles[0], transparentZero)
    : rleTile(buffer, image.tiles[0]);
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
}

function writeSheet (file, name, columns = 8) {
  if (!inspect) { return; }
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  const cellWidth = Math.max(...image.tiles.map(tile => tile.width)) + 4;
  const cellHeight = Math.max(...image.tiles.map(tile => tile.height)) + 16;
  const rows = Math.ceil(image.tiles.length / columns);
  const sheet = new PNG({ width: cellWidth * columns, height: cellHeight * rows });

  image.tiles.forEach((tile, index) => {
    const source = image.type === 1 ? rleTile(buffer, tile) : rawTile(buffer, tile, true);
    fs.writeFileSync(
      path.join(inspectDir, `${name}-${String(index).padStart(2, '0')}.png`),
      PNG.sync.write(source)
    );
    const ox = (index % columns) * cellWidth;
    const oy = Math.floor(index / columns) * cellHeight;
    PNG.bitblt(source, sheet, 0, 0, source.width, source.height, ox, oy);

    // Tiny binary label: index encoded as vertical white bars below each tile.
    for (let bit = 0; bit < 8; bit++) {
      if ((index & (1 << bit)) === 0) continue;
      for (let y = 0; y < 8; y++) {
        const x = ox + 2 + bit * 2;
        const p = ((oy + cellHeight - 10 + y) * sheet.width + x) * 4;
        sheet.data[p] = 255;
        sheet.data[p + 1] = 255;
        sheet.data[p + 2] = 255;
        sheet.data[p + 3] = 255;
      }
    }
  });

  fs.writeFileSync(path.join(inspectDir, `${name}-contact.png`), PNG.sync.write(sheet));
}

function writeAnimatedFigure (file, name, first, last, frameIndex = 0) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  const tiles = image.tiles.slice(first, last + 1);
  const frame = tiles[Math.min(frameIndex, tiles.length - 1)];
  const frames = tiles.map(tile => {
    const values = new Uint8Array(tile.width * tile.height);
    for (let i = 0; i < values.length; i++) { values[i] = buffer[tile.offset + i]; }
    return values;
  });
  const mask = new Uint8Array(frame.width * frame.height);
  const source = frames[Math.min(frameIndex, frames.length - 1)];

  for (let i = 0; i < mask.length; i++) {
    const counts = new Uint8Array(256);
    for (const values of frames) { counts[values[i]]++; }
    let background = 0;
    for (let value = 1; value < counts.length; value++) {
      if (counts[value] > counts[background]) { background = value; }
    }

    const [r, g, b] = palette[source[i]];
    const terrainGreen = g > r * 1.06 && g > b * 1.04;
    if (source[i] !== background && !terrainGreen) { mask[i] = 1; }
  }
  // Keep dark outlines around the moving figure, but never grow the mask
  // back into the green terrain carried by the animation patch.
  const expanded = mask.slice();
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (!mask[y * frame.width + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && py >= 0 && px < frame.width && py < frame.height) {
            const index = py * frame.width + px;
            const [r, g, b] = palette[source[index]];
            const terrainGreen = g > r * 1.06 && g > b * 1.04;
            if (!terrainGreen) { expanded[index] = 1; }
          }
        }
      }
    }
  }

  const png = new PNG({ width: frame.width, height: frame.height });
  for (let i = 0; i < source.length; i++) {
    if (!expanded[i] || source[i] === 0) continue;
    const value = source[i];
    const [r, g, b] = palette[value];
    if (r < 8 && g < 8 && b < 8) continue;
    const p = i * 4;
    png.data[p] = r;
    png.data[p + 1] = g;
    png.data[p + 2] = b;
    png.data[p + 3] = 255;
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
}

function writePersonCutout (file, name, tileIndex) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  const tile = image.tiles[tileIndex];
  const values = buffer.slice(tile.offset, tile.offset + tile.width * tile.height);
  const mask = new Uint8Array(values.length);

  for (let i = 0; i < values.length; i++) {
    const [r, g, b] = palette[values[i]];
    const brightNeutral = r > 95 && g > 85 && b > 65 && Math.max(r, g, b) - Math.min(r, g, b) < 55;
    const warmFigure = r > g * 1.08 && r > b * 1.15;
    if (brightNeutral || warmFigure) { mask[i] = 1; }
  }
  // Preserve the dark outline immediately surrounding clothes and skin.
  const expanded = mask.slice();
  for (let y = 0; y < tile.height; y++) {
    for (let x = 0; x < tile.width; x++) {
      if (!mask[y * tile.width + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && py >= 0 && px < tile.width && py < tile.height) {
            expanded[py * tile.width + px] = 1;
          }
        }
      }
    }
  }

  const png = new PNG({ width: tile.width, height: tile.height });
  for (let i = 0; i < values.length; i++) {
    if (!expanded[i] || values[i] === 0) continue;
    const [r, g, b] = palette[values[i]];
    const p = i * 4;
    png.data[p] = r;
    png.data[p + 1] = g;
    png.data[p + 2] = b;
    png.data[p + 3] = 255;
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(png));
}

function writeRawTile (file, name, tileIndex, transparentZero = true) {
  const buffer = fs.readFileSync(path.join(pl8Dir, file));
  const image = Pl8.parse(buffer);
  fs.writeFileSync(
    path.join(outDir, `${name}.png`),
    PNG.sync.write(rawTile(buffer, image.tiles[tileIndex], transparentZero))
  );
}

writeSingle('VILL.PL8', 'advanced-labor-background');
writeSingle('VILLAGE.PL8', 'population-background');
writeSingle('VILLBORD.PL8', 'advanced-labor-border', true);
writeSingle('VILLGRID.PL8', 'advanced-labor-grid', true);
// NB : les `labor-figure-*` (ouvriers détourés) sont désormais produits par
// tools/extract-clean-figures.js (détourage propre par flood-fill des bords,
// bien meilleur que le frame-diff ci-dessous qui laissait du bruit). On garde
// ces lignes en commentaire pour mémoire des plages de tuiles ; NE PAS les
// réactiver, elles écraseraient les sprites propres.
// writeAnimatedFigure('VILLANI2.PL8', 'labor-figure-small', 0, 6, 2);   // grain
// writeAnimatedFigure('VILLANI2.PL8', 'labor-figure-wood', 7, 14, 2);   // bois
// writeAnimatedFigure('VILLANI2.PL8', 'labor-figure-kneeling', 25, 32, 2); // pierre
// writeAnimatedFigure('VILLANI2.PL8', 'labor-figure-smithy', 33, 39, 2);   // forge
// writeAnimatedFigure('VILLANI1.PL8', 'labor-figure-castle', 0, 6, 2);     // château
writeRawTile('VILLANI2.PL8', 'labor-patch-farm', 0, false);
writeRawTile('VILLANI2.PL8', 'labor-patch-wood', 7, false);
writeRawTile('VILLANI2.PL8', 'labor-patch-quarry', 25, false);
writeRawTile('VILLANI2.PL8', 'labor-patch-smithy', 33, false);
writePersonCutout('VILLAGE3.PL8', 'labor-person', 51);
writePersonCutout('VILLANI2.PL8', 'labor-person-farm', 0);
writePersonCutout('VILLANI2.PL8', 'labor-person-wood', 7);
writePersonCutout('VILLANI2.PL8', 'labor-person-quarry', 25);
writeRawTile('ICONVILL.PL8', 'labor-worker-icon', 16);
writeRawTile('ICONVILL.PL8', 'labor-icon-grain', 0, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-cattle', 2, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-reclaim', 3, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-castle', 5, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-stone', 6, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-iron', 6, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-smithy', 7, false);
writeRawTile('ICONVILL.PL8', 'labor-icon-wood', 8, false);
writeRawTile('VILLANI2.PL8', 'labor-site-quarry', 40, false);
writeRawTile('VILLANI2.PL8', 'labor-site-wood', 41, false);
writeRawTile('VILLANI2.PL8', 'labor-site-iron', 43, false);
writeSheet('ICONVILL.PL8', 'advanced-labor-icons');
writeSheet('VILLAGE3.PL8', 'advanced-labor-sprites');
writeSheet('VILLAGE4.PL8', 'advanced-labor-overlays', 3);
writeSheet('VILLANI1.PL8', 'advanced-labor-people-a', 7);
writeSheet('VILLANI2.PL8', 'advanced-labor-people-b', 8);
writeSheet('VILLTOPS.PL8', 'advanced-labor-tops', 1);
writeSheet('PEASANT.PL8', 'advanced-labor-peasants', 10);

console.log(`Advanced labor UI -> ${outDir}`);
