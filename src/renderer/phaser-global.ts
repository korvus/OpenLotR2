/*
 *  Expose Phaser as a global.
 *
 *  The original project loaded Phaser from a CDN as a global `<script>`, so the
 *  scenes (and config.js) reference `Phaser` globally rather than importing it.
 *  With Vite, Phaser is an ES module from node_modules; this shim re-establishes
 *  the global before any scene/config module is evaluated.
 *
 *  IMPORTANT: this module must be imported BEFORE ./config in index.ts so the
 *  global exists when scene classes (`class X extends Phaser.Scene`) evaluate.
 */
import Phaser from "phaser";

(globalThis as any).Phaser = Phaser;

export default Phaser;
