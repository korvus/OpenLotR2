# OpenLotR2 — Guide de lancement & débogage

Portage de *Lords of the Realm II* en **Electron + Phaser 3 + TypeScript**.
Fork de `s-ayers/OpenLotR2` (GPL-3), **outillage modernisé sous electron-vite**.

**État actuel : démarre et rend une scène, mais le jeu est un squelette** (la plupart des
scènes sont des ébauches, la logique de jeu est quasi absente). L'app se lance, c'est la base
pour construire la suite.

> Contexte global du dépôt (jeu original, assets, rétro-ingénierie) : [`../AGENT.md`](../AGENT.md).

---

## 1. Lancer (commandes)

```powershell
npm install            # une fois (utilise --legacy-peer-deps si conflit de peer deps)
npm run dev            # DEV : Vite + HMR + DevTools auto. Le flux de travail normal.
npm run build          # build production dans out/
npm run preview        # lance le build de out/ (vérifier le rendu prod)
npm run dist:win       # build + packaging .exe via electron-builder
```

Au quotidien : **`npm run dev`**. Vite recharge le renderer à chaud à chaque sauvegarde.

---

## 2. Architecture (deux processus Electron)

Electron = deux mondes séparés, qui plantent pour des raisons différentes :

- **Processus *main*** — [`src/main/index.ts`](src/main/index.ts) : crée la fenêtre, les menus,
  charge le renderer. Tourne sous **Node**. Ses erreurs sortent dans le **terminal**.
- **Processus *renderer*** — [`src/renderer/`](src/renderer/) : le jeu Phaser. Point d'entrée
  [`index.ts`](src/renderer/index.ts), chargé par [`index.html`](src/renderer/index.html).
  Tourne dans **Chromium**. Ses erreurs sortent dans la **console DevTools**, *pas* le terminal.

> **Règle d'or du debug Electron : toujours se demander « main ou renderer ? »** avant de
> chercher l'erreur. Une fenêtre vide = presque toujours une erreur renderer, visible seulement
> en DevTools.

Chaîne de chargement :
- **dev** : main lit `process.env.ELECTRON_RENDERER_URL` → `window.loadURL(...)` vers le serveur
  Vite (`http://localhost:5173`).
- **prod** : `window.loadFile(out/renderer/index.html)` (le build).

---

## 3. Comment marche l'outillage (electron-vite)

Config : [`electron.vite.config.ts`](electron.vite.config.ts). Trois cibles possibles
(main / preload / renderer) ; ici **main + renderer** (pas de preload, l'app utilise
`nodeIntegration`).

- **main** : bundlé vers `out/main/index.js`. `externalizeDepsPlugin()` garde les deps Node
  (`electron-serve`, `about-window`, `electron-settings`) requises depuis `node_modules` au
  runtime au lieu de les bundler.
- **renderer** : `root = src/renderer`, sortie `out/renderer/`. **Phaser est importé localement**
  (plus de CDN). Comme les scènes utilisent un `Phaser` **global**, un shim
  [`src/renderer/phaser-global.ts`](src/renderer/phaser-global.ts) le rétablit ; il **doit** être
  importé avant `config.js` dans `index.ts`.
- **assets statiques** : tout est dans [`src/renderer/public/`](src/renderer/public/)
  (`images/`, `themes/`, `tests/`, `media/`, `maps/`, `assets/`). Vite les sert à la racine `/`
  en dev et les copie à côté de `index.html` au build. Les scènes y accèdent en relatif
  (`themes/classic/...`, `images/...`), via `loader.path = ''` dans `config.js`.

> ⚠️ L'ancienne toolchain `electron-webpack` (morte) a été **retirée** : plus de
> `webpack.config.js`, `npm start`, ni `dist/`. Si tu vois ces références ailleurs, elles sont
> obsolètes.

---

## 4. Déboguer

- **Erreur main** → terminal (`npm run dev` y affiche la sortie).
- **Erreur renderer** → **DevTools** (ouverte automatiquement en dev ; sinon `Ctrl+Shift+I`).
  C'est là que sortent les erreurs Phaser, les assets 404 (onglet *Network*), les exceptions de
  scène (onglet *Console*).
- **Fenêtre vide** = chercher en DevTools : souvent un asset introuvable ou une exception au boot
  d'une scène.
- **HMR** : sauvegarder un fichier `src/renderer/**` recharge le renderer sans relancer Electron.
  Une modif du **main** nécessite de relancer `npm run dev`.
- **Point fragile connu** : `src/main/index.ts` câble le menu par indices codés en dur
  (`menu["commandsMap"][31]...`), enveloppé dans un `try/catch` pour ne pas tuer la fenêtre si la
  structure du menu change. À refaire proprement un jour.
- **Scènes** : la liste active est dans [`src/renderer/config.js`](src/renderer/config.js)
  (`plugins.scene` / `scene`). Pour isoler un bug, ne garder qu'une scène active.

---

## 5. Carte du code

- [`src/main/index.ts`](src/main/index.ts) — fenêtre, menus, chargement du renderer.
- [`src/main/help.ts`](src/main/help.ts) — fenêtres « About / Help » (electron-serve lazy).
- [`src/renderer/index.ts`](src/renderer/index.ts) — boot Phaser.
- [`src/renderer/config.js`](src/renderer/config.js) — config du jeu + **liste des scènes actives**.
- [`src/renderer/theme.js`](src/renderer/theme.js) — **typographie centralisée** (`largeFont`/`smallFont`,
  `FONT_FAMILY`). La police `MedievalSharp` (dans `public/fonts/`, déclarée en `@font-face` dans
  `index.html`, préchargée dans `index.ts`) est un **placeholder** : la vraie police de LotR2 reste
  à extraire du jeu original. Pour en changer : modifier `FONT_FAMILY` + le fichier + l'`@font-face`.
- [`src/renderer/scenes/`](src/renderer/scenes/) — scènes : `boot`, `loader`, `menu/` (main,
  single-player, original-royal, shield), `armoury`, `campaign` (la plus avancée : carte
  isométrique d'origine, mini-carte stratégique, sélection de comté, fin de tour), et des
  ébauches (`castle`, `merchant`, `greatest-noble`, `custom-game`, `intro`).
- [`src/renderer/game/state.js`](src/renderer/game/state.js) — **état de partie** (nobles,
  comtés, calendrier, démographie/impôts par saison). Instance unique dans le registry Phaser
  (`gameState`), survit aux `scene.restart()`. Les mécaniques de jeu se construisent là.
- [`src/renderer/public/`](src/renderer/public/) — assets statiques (PNG déjà extraits du jeu
  original via l'outil `pl8image`).
- [`doc/technical/file-types/`](doc/technical/file-types/) — formats du jeu d'origine.

---

## 5b. Pièges connus / correctifs

- **Texte bitmap flou et inégal** (un libellé net, les autres flous) : cause =
  centrage sous-pixel. Avec `setOrigin(0.5, …)` un texte de largeur impaire
  retombe sur un demi-pixel et, le rendu étant en filtrage linéaire
  (`pixelArt = false`), il est interpolé/flou ; un voisin de largeur paire
  tombe pile et reste net. **Fix** : `export const roundPixels = true` dans
  [`config.js`](src/renderer/config.js) (repris par `new Phaser.Game({...config})`)
  → tous les rendus s'alignent sur des pixels entiers, netteté uniforme.
  N'affecte pas l'échantillonnage des images mises à l'échelle (le dézoom
  ×1,3 reste lissé).

## 6. Méthode « copie fidèle » (l'objectif du projet)

Le but est une **réplique au pixel près du jeu DOS** (ressources originales dans
`D:\sites\lordOfTheRealms\lordsoftherealm2_dos_win\Lords of the Realm 2\lotr2`).
**Tout l'état vit dans le dépôt** : avancement et conventions dans
[`doc/ROADMAP.md`](doc/ROADMAP.md) (les ❓ = mesures à faire en jeu), specs
d'autorité tirées de L2HELP dans [`doc/technical/gameplay/`](doc/technical/gameplay/),
formats dans [`doc/technical/file-types/`](doc/technical/file-types/). **Toujours
commencer par relire la roadmap.**

Boucle de travail :

1. **Recherche** — lire la spec ; fouiller les PL8 originaux (rendus via
   [`tools/lib/pl8-draw.js`](tools/lib/pl8-draw.js), **jamais** pl8image seul : il ne
   dessine pas les « extra rows ») ; **piloter le jeu DOS en direct via le MCP `lotr2`**
   ([`tools/mcp-lotr2/`](tools/mcp-lotr2/README.md)) : `launch` → `send_keys`/`click` pour
   atteindre l'écran voulu → `screenshot` (renvoie l'image, archive le PNG dans
   [`doc/captures/runtime/`](doc/captures/runtime/)). Les captures de référence retenues
   sont rangées dans [`doc/captures/`](doc/captures/). *(Ancienne méthode manuelle : PrintWindow
   PowerShell + user32 sur la fenêtre DOSBox — désormais encapsulée par le MCP.)*
2. **Implémentation** — mécanique dans [`src/renderer/game/state.js`](src/renderer/game/state.js)
   (validée par **simulation Node** : `globalThis.Phaser = { Math: { Clamp } }`, import
   ESM, `endTurn()` en boucle) ; écrans dans
   [`src/renderer/scenes/campaign.js`](src/renderer/scenes/campaign.js) (panneaux :
   texture `parchment`, fontes bitmap `lords2*`, motif `justOpened` + `dialogOpen()`).
   **Tout asset sort d'un outil `tools/extract-*.js` rejouable** (jamais de PNG édité à
   la main) ; régénérer aussi les dérivés (`render-map.js` → `render-overview.js`).
3. **Validation** — `npm run build` doit passer ; pour l'habillage, **boucle
   graphique** : composer le panneau hors-jeu et le comparer côte à côte à la capture
   de référence (modèle : [`tools/mock-rations.js`](tools/mock-rations.js)), itérer,
   reporter dans la scène. La validation finale runtime est faite par l'utilisateur
   (captures comparatives DOS ↔ Electron).

Pièges durables : fontes bitmap = 106 glyphes, ponctuation comprise (Phaser **omet en
silence** les glyphes manquants) ; frames de champs ROADS 79-139 par **groupes de 4**
(base / bord NE / bord NO / les deux) aux extra rows parasites ; frontières de comtés
= tuiles 38-46 (cailloux en extra rows) ; mer = classe 4 frames 22-29, falaises
côtières = autres ids ; minimap MAP01 : index de palette = id de comté ; **pas de zoom
caméra** (l'UI serait prise dedans) ; audio absent de cette copie (pistes CD).

## 6b. Comparaison DOS ↔ ma version (MCP `lotr2`)

> **Section vivante** : c'est la démarche centrale du projet. À chaque fois que l'utilisateur
> affine la méthode, ou découvre une astuce/un piège, **enrichir cette section** (ajouter l'étape,
> le réglage ou le repère mémorisé). Elle doit devenir de plus en plus précise au fil du temps.

Le but : mettre **côte à côte** un écran du jeu DOS d'origine et son équivalent dans le portage,
pour valider la fidélité au pixel près. Le MCP [`lotr2`](tools/mcp-lotr2/README.md) automatise le
pilotage du jeu DOS (ex-méthode manuelle PrintWindow PowerShell, désormais encapsulée).

**Prérequis**
- Serveur déclaré dans [`.mcp.json`](.mcp.json) (scope projet, versionné). Après `npm install`
  dans `tools/mcp-lotr2/`, **redémarrer Claude Code** (`/mcp` pour vérifier).
- Autoriser `mcp__lotr2` sans invite (`/permissions` → Allow, ou `.claude/settings.local.json`).
- Seule la version **`dos`** est installée (DOSBox embarqué + `L2D.EXE`). Siege Pack et VF
  restent à déclarer dans [`tools/mcp-lotr2/versions.json`](tools/mcp-lotr2/versions.json).

**Outils** (détail dans le [README](tools/mcp-lotr2/README.md)) :
`list_versions` · `launch` · `status` · `focus` · `send_keys` (syntaxe .NET SendKeys :
`{ENTER}` `{ESC}` `{F1}` `{UP}`…) · `click` (coordonnées **client**, 0,0 = coin de la zone de
jeu) · `screenshot` (PNG dans [`doc/captures/runtime/`](doc/captures/runtime/) + renvoie l'image) ·
`close`.

> **Backend par défaut = `dos-wsl` (ISOLÉ).** Depuis 2026-06-15, le MCP pilote DOSBox dans
> **WSL2 sur un display Xvfb invisible** (xdotool/scrot) : l'input ne touche **jamais** la
> vraie souris/clavier de l'utilisateur — il peut travailler pendant que je pilote le jeu.
> Le backend Windows historique (`version: "dos"`, input global qui vole le curseur) reste
> dispo en repli. Setup WSL (paquets, à refaire après réinstall PC) : voir le
> [README §backends](tools/mcp-lotr2/README.md). Capture et input validés en isolé.

**Boucle de comparaison**
1. **Cibler l'écran** : noter dans [`doc/ROADMAP.md`](doc/ROADMAP.md) l'écran à reproduire et la
   mesure attendue (les ❓ = à mesurer en jeu).
2. **Côté DOS** : `launch` → `send_keys`/`click` pour atteindre l'écran exact → `screenshot`.
   Conserver la séquence de touches/clics dans la note de l'écran (reproductibilité).
   Capturer aussi les écrans intermédiaires du parcours : une copie fidèle porte sur la navigation
   autant que sur l'écran final. Ne jamais valider un panneau ouvert directement par une fonction
   debug si, dans le DOS, il doit être atteint depuis un autre écran (ex. ville → ouvriers → forge).
3. **Archiver la référence** : les captures brutes vont dans `doc/captures/runtime/` ; **promouvoir**
   la capture retenue dans [`doc/captures/`](doc/captures/) comme référence d'autorité.
4. **Côté portage** : composer l'écran équivalent. Pour l'habillage, **boucle graphique** hors-jeu
   (modèle [`tools/mock-rations.js`](tools/mock-rations.js)) : générer le panneau, le comparer
   côte à côte à la référence, itérer, puis reporter dans la scène.
5. **Mesurer l'écart** : positions, dimensions, palette (256 couleurs), glyphes. Reporter les
   valeurs mesurées dans la roadmap / les specs (`doc/technical/gameplay/`).
6. **Validation runtime finale** : faite par l'utilisateur (captures comparatives DOS ↔ Electron) —
   je ne vois pas la fenêtre Electron (cf. §7).

**Repères durables pour la comparaison**
- `output=surface` (forcé par [`conf/dos.conf`](tools/mcp-lotr2/conf/dos.conf)) : capturable mais
  lent — bon pour analyser, pas pour jouer. Capture noire → repli auto sur capture de fenêtre
  (laisser la fenêtre visible, non masquée).
- Analyse **visuelle uniquement** : pas de lecture de l'état interne du jeu DOS.
- **Une seule instance DOSBox** à la fois → comparaison séquentielle (ou lancer l'autre version à la
  main). `close` avant de relancer.
- Pas de zoom caméra côté portage (l'UI serait happée) → les dimensions se comparent à l'échelle 1:1.

## 7. Travailler avec moi (Claude Code)

- **Boucle courte, un objectif à la fois.** Une erreur à la fois.
- **Donne-moi l'erreur brute** (stack du terminal *ou* de la DevTools) en précisant **main ou
  renderer**. À défaut, une capture de la console.
- **Je peux** lancer les builds (`npm run build`, `electron-vite build`) et lire leurs erreurs.
- **Je PEUX maintenant voir le renderer moi-même** via
  [`tools/shoot-renderer.mjs`](tools/shoot-renderer.mjs) : il sert `out/renderer/` et le
  rend dans **Chrome système en headless** (puppeteer-core, GPU D3D11), puis screenshote le
  canvas Phaser dans `doc/captures/runtime/`. Le renderer est un pur web app (état en
  registry Phaser + localStorage, aucune dépendance Electron), donc Chrome seul suffit.
  `window.__game` est exposé pour piloter les scènes. Exemple (ouvrir la Forge) :
  ```bash
  npm run build
  node tools/shoot-renderer.mjs --label forge \
    --eval "['MainMenu','Loader','Boot','SinglePlayerMenu','ShieldMenu','CustomGame','OrginalOrRoyalMenu'].forEach(k=>window.__game.scene.stop(k)); window.__game.scene.start('Campaign')" \
    --waitfor "window.__game.scene.getScene('Campaign') && window.__game.scene.getScene('Campaign').state" \
    --eval "const c=window.__game.scene.getScene('Campaign'); c.openBlacksmithDialog(c.state.selectedCounty);"
  ```
  Options : `--eval <js>` (IIFE isolée, `__game` dispo), `--click "x,y;…"` (coords jeu
  640×480), `--waitfor <expr>` (attend une condition), `--wait/--step <ms>`, `--label`.
  La **coquille Electron** (menus natifs, fenêtre, F5/F8) n'est pas testée par ce biais →
  pour ça, tes yeux restent utiles.
- Après chaque correctif, **on relance et tu décris ce que tu vois** avant d'empiler d'autres
  changements.

Quand tu apprends une préférence de ma part, ou quand je te corrige, ajoute-la dans .codex/memory.md. Relis .codex/memory.md au début de chaque session.

**Affiner la démarche de comparaison à la demande.** Quand je te demande de préciser/améliorer la
méthode de comparaison DOS ↔ portage (ou que je te corrige sur ce point), **mets à jour la §6b** de
ce fichier : ajoute l'étape, le réglage du MCP, le piège ou le repère mesuré. Cette section doit
gagner en précision à chaque itération.
