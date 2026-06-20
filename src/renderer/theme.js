/*
 *  `theme` module — single source of truth for UI typography.
 *  ==========================================================
 *
 *  Change the game font in ONE place here. The @font-face that loads the
 *  actual file is declared in `index.html`, and the font is preloaded before
 *  Phaser boots in `index.ts`.
 *
 *  NOTE: `MedievalSharp` is a placeholder medieval font, not the real Lords of
 *  the Realm II typeface. Replacing it with the game's own extracted font is an
 *  asset-pipeline task — when that font exists, just swap FONT_FAMILY (and the
 *  @font-face url in index.html).
 */

export const FONT_FAMILY = "MedievalSharp";

export const largeFont = {
  font: `32px ${FONT_FAMILY}`,
  stroke: "#000000",
  strokeThickness: 0,
  fill: "#000000",
  align: "center"
};

export const smallFont = {
  font: `20px ${FONT_FAMILY}`,
  stroke: "#000000",
  strokeThickness: 0,
  fill: "#000000",
  align: "center"
};

/*
 * Textes gothiques bitmap — les polices ORIGINALES du jeu (FNTL2_9/14/22,
 * chargées par le Loader sous 'lords2-small' / 'lords2' / 'lords2-big').
 * À préférer aux styles ci-dessus pour tout texte d'interface : titres en
 * 'large', libellés/boutons en 'small' (la 14, comme le DOS).
 */
export function gothic (scene, x, y, text, size = 'small', tint = 0x000000) {
  const key = size === 'large' ? 'lords2-big' : (size === 'tiny' ? 'lords2-small' : 'lords2');
  return scene.add.bitmapText(x, y, key, text).setTint(tint);
}

// Au survol, les libellés cliquables de l'original passent au rouge.
export function hoverRed (txt) {
  return txt
    .on('pointerover', () => txt.setTint(0xc00000))
    .on('pointerout', () => txt.setTint(0x000000));
}
