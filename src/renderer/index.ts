/*
 *  `app` module
 *  ============
 *
 *  Provides the game initialization routine.
 */

//  Establish the global `Phaser` (used by scenes/config) before they load.
import "./phaser-global";
//  Import game instance configuration.
import * as config from "./config";

// import {default as video} from './video';

//  Boot the game.
export async function boot() {
  // Ensure the UI font is loaded before Phaser renders any text, otherwise
  // text bakes with a fallback font and won't update once the font arrives.
  try {
    await Promise.all([
      (document as any).fonts.load('32px "MedievalSharp"'),
      (document as any).fonts.load('20px "MedievalSharp"')
    ]);
  } catch (e) {
    console.warn("[font] MedievalSharp failed to preload:", e);
  }

  // `config` is an ES module namespace (null prototype); Phaser calls
  // hasOwnProperty on it, so spread it into a plain object first.
  let game = new Phaser.Game({ ...config });

  // Expose l'instance pour le débogage et le screenshotter headless
  // (tools/shoot-renderer.mjs) : permet d'inspecter/piloter les scènes
  // depuis l'extérieur. Sans effet sur le jeu.
  (window as any).__game = game;

  return game;
}

boot();
