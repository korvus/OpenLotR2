/*
 * Extrait les montagnes multi-tuiles de MTNS1X.PL8 : la planche contient
 * 25 tuiles 58×30 formant 4 montagnes 2×2 + 1 montagne 3×3 (quartiers
 * placés en losange via les x,y des en-têtes). On regroupe les tuiles par
 * proximité, on découpe chaque montagne en PNG individuel, et on écrit un
 * mountains.json avec l'empreinte (2 ou 3) et les dimensions.
 *
 * Usage : node tools/extract-mountains.js <MTNS1X.PL8> <palette.256> <dossier> <saison>
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { Pl8, Palette, GraphicFactory } = require('pl8image');

const [, , pl8Path, palPath, outDir, season] = process.argv;

(async () => {
  const buf = fs.readFileSync(pl8Path);
  const palette = await Palette.file(palPath);
  const image = Pl8.parse(buf);

  const graphic = GraphicFactory.tiles(image.tiles, palette, buf, 640, 480);
  const sheet = PNG.sync.read(await graphic.toPNG());

  // regroupe les tuiles par proximité (union-find naïf)
  const groups = [];
  for (const t of image.tiles) {
    let target = null;
    for (const g of groups) {
      if (g.tiles.some(o => Math.abs(o.x - t.x) <= 60 && Math.abs(o.y - t.y) <= 20)) {
        target = g;
        break;
      }
    }
    if (!target) { target = { tiles: [] }; groups.push(target); }
    target.tiles.push(t);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const meta = [];

  groups.sort((a, b) => Math.min(...a.tiles.map(t => t.y)) - Math.min(...b.tiles.map(t => t.y))
    || Math.min(...a.tiles.map(t => t.x)) - Math.min(...b.tiles.map(t => t.x)));

  groups.forEach((g, k) => {
    const minX = Math.min(...g.tiles.map(t => t.x));
    const minY = Math.min(...g.tiles.map(t => t.y));
    const maxX = Math.max(...g.tiles.map(t => t.x + t.width));
    const maxY = Math.max(...g.tiles.map(t => t.y + t.height));
    const w = maxX - minX;
    const h = maxY - minY;

    const out = new PNG({ width: w, height: h });
    PNG.bitblt(sheet, out, minX, minY, w, h, 0, 0);

    const file = `mtn-${season}-${k}.png`;
    fs.writeFileSync(path.join(outDir, file), PNG.sync.write(out));
    meta.push({ file, size: Math.round(Math.sqrt(g.tiles.length)), width: w, height: h });
    console.log(`${file}: ${g.tiles.length} tuiles, ${w}x${h}`);
  });

  // le JSON n'est écrit que pour le printemps : l'empreinte est identique
  // entre saisons, seuls les pixels changent
  if (season === 'spring') {
    fs.writeFileSync(path.join(outDir, 'mountains.json'), JSON.stringify(meta, null, 2));
  }
})();
