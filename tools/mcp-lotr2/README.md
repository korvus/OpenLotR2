# MCP `lotr2` — piloter le jeu DOS ET le portage, pour les comparer

Serveur MCP local (stdio, Node ≥20) qui permet à Claude de **piloter les DEUX côtés de la
comparaison** :
- le **jeu DOS original** (Lords of the Realm II sous DOSBox) : lancer, naviguer
  (touches/souris), capturer ;
- le **portage OpenLotR2** (renderer Phaser) : le rendre dans **Chrome headless** et le
  capturer — **Claude voit donc le portage lui-même**, sans fenêtre Electron ni intervention
  de l'utilisateur.

Le but : mettre les deux **côte à côte** (`compare`) pour valider la fidélité au pixel près,
et itérer en autonomie. Remplace la capture PrintWindow faite à la main (cf. `../../AGENTS.md`).

## Installation

```powershell
cd tools/mcp-lotr2
npm install
```

Le serveur est déclaré dans [`../../.mcp.json`](../../.mcp.json) (scope projet, versionné).
**Redémarre Claude Code** après l'install pour qu'il découvre le serveur `lotr2`
(vérifie avec `/mcp`).

### Autoriser les outils sans invite

Pour que Claude pilote la boucle sans demander à chaque appel, ajoute dans
`.claude/settings.local.json` (le faire toi-même : l'écriture auto est bloquée par le harness) :

```json
{ "permissions": { "allow": ["mcp__lotr2"] } }
```

ou via la commande `/permissions` → Allow → `mcp__lotr2`.

## Outils exposés

**Côté jeu DOS original :**

| Outil | Rôle |
|---|---|
| `list_versions` | Versions connues + lesquelles sont installées |
| `launch` | Démarre DOSBox (backend isolé WSL par défaut), prêt à capturer |
| `status` | DOSBox tourne ? titre + taille fenêtre/zone client |
| `focus` | (backend Windows seulement) met la fenêtre au premier plan |
| `send_keys` | Envoie des touches (syntaxe .NET SendKeys : `{ENTER}` `{ESC}` `{F1}` `{UP}`…) |
| `click` | Clic en coordonnées **client** (0,0 = coin de la zone de jeu) |
| `screenshot` | Capture → PNG dans `doc/captures/runtime/` **+ renvoie l'image** |
| `close` | Termine DOSBox |

**Côté portage OpenLotR2 (renderer Phaser, Chrome headless) :**

| Outil | Rôle |
|---|---|
| `portage` | Rend le portage dans Chrome headless et renvoie la capture du canvas. `scene` saute à une scène Phaser (ex `Campaign`), `eval` exécute du JS (`window.__game` exposé, ex ouvrir un panneau), `clicks` clique aux coords du jeu, `rebuild` relance `npm run build` après une modif de code. |
| `compare` | Capture **côte à côte** le DOS (écran courant) ET le portage (mêmes params que `portage`), renvoie les **deux images** pour comparer. |

Boucles types :
- DOS seul : `launch` → (`send_keys`/`click`) → `screenshot`.
- Portage seul : `portage` (avec `scene`/`eval`/`clicks`) — itérer en éditant le code puis
  `portage rebuild=true`.
- Comparaison : `launch` + naviguer le DOS jusqu'à l'écran voulu, puis `compare` avec la
  `scene`/`eval` correspondante du portage → les deux images reviennent ensemble.

### Recettes de navigation (comment atteindre un écran DOS précis)

Atteindre un écran donné dans le DOS coûte plusieurs clics fragiles : ces
procédures sont documentées à part pour ne pas avoir à les redécouvrir.

| Écran DOS | Doc |
|---|---|
| **Modale de gestion des villains** (vue des terres du comté, répartition des ouvriers) | [`doc/technical/gameplay/villein-modal.md`](../../doc/technical/gameplay/villein-modal.md) |

> En portage, ouvrir directement la modale villains sans cliquer :
> `portage scene=Campaign eval="const c=window.__game.scene.getScene('Campaign'); const co=Object.values(c.state.counties).find(x=>x.owner===0); c.state.ensureLabor(co); c.openAdvancedLaborDialog(co.id);"`

> **Sous le capot du portage** : `tools/shoot-renderer.mjs` sert `out/renderer/` et le rend
> dans le **Chrome système** (puppeteer-core, GPU D3D11). Le renderer est un pur web app
> (état = registry Phaser + localStorage, aucune dépendance Electron), donc Chrome seul suffit ;
> `window.__game` est exposé pour piloter les scènes. La **coquille Electron** (menus natifs,
> fenêtre, F5/F8) n'est pas couverte par ce canal.

## Backends d'exécution

Deux backends, choisis par le champ `backend` de [`versions.json`](versions.json) :

| Version | Backend | Isolation souris | Quand |
|---|---|---|---|
| **`dos-wsl`** (DÉFAUT) | `wsl` : DOSBox Linux sur display **Xvfb** invisible, piloté par **xdotool**, capturé par **import/scrot** | ✅ totale — ne touche jamais la vraie souris | usage normal |
| `dos` | `win` : DOSBox Windows embarqué, input global (`SetCursorPos`/`mouse_event`/`SendKeys`) | ❌ vole le curseur/focus | repli, ou comparaison du rendu Windows |

Le backend WSL est piloté par [`wsl-lotr2.sh`](wsl-lotr2.sh) (appelé via `wsl -d <distro> -- bash …`).
La capture écrit le PNG via `/mnt/<lecteur>/…` (= le **même fichier** que le chemin Windows
`doc/captures/runtime/`), que le serveur relit côté Windows.

### Setup du backend WSL isolé (à refaire après réinstallation du PC)

WSL2 + une distro (ici **Ubuntu-20.04**) doivent exister, et les paquets être installés.
Les **paquets installés persistent** à travers les reboots ; seuls Xvfb/DOSBox sont relancés
à chaque session (par `launch`). Procédure d'install (une fois) :

```bash
wsl -d Ubuntu-20.04
sudo apt-get update && sudo apt-get install -y dosbox xvfb xdotool scrot imagemagick x11-utils
```

Le jeu DOS est lu depuis `/mnt/d/sites/lordOfTheRealms/lordsoftherealm2_dos_win/Lords of the Realm 2/lotr2`
(accès direct au disque Windows, aucune copie). Conf : [`conf/dos-wsl.conf`](conf/dos-wsl.conf).
Aucun `sudo` n'est nécessaire pour piloter le jeu (seulement pour l'install des paquets).

**Test manuel du backend** (depuis Git Bash, `MSYS_NO_PATHCONV=1` évite la mutilation du
chemin `/mnt/…`) :

```bash
export MSYS_NO_PATHCONV=1
S=/mnt/d/sites/lordOfTheRealms/OpenLotR2/tools/mcp-lotr2/wsl-lotr2.sh
wsl -d Ubuntu-20.04 -- bash "$S" start
wsl -d Ubuntu-20.04 -- bash "$S" status
wsl -d Ubuntu-20.04 -- bash "$S" click 320 102 left single
wsl -d Ubuntu-20.04 -- bash "$S" capture "/mnt/d/sites/lordOfTheRealms/OpenLotR2/doc/captures/runtime/test.png"
wsl -d Ubuntu-20.04 -- bash "$S" close
```

> Pièges WSL résolus : les process d'arrière-plan (Xvfb/DOSBox) sont lancés via **`setsid`**,
> sinon WSL tue le groupe à la fin de la commande (« X connection broken »). Sans gestionnaire
> de fenêtres, `windowactivate` échoue : on l'évite. Le clic DOSBox/SDL n'est latché que si on
> **bouge** la souris avant et qu'on **maintient** le bouton (mousedown/up étalés), comme côté
> Windows.

### Autres versions

Le **Siege Pack** (ISO) et la **VF** (installeur) doivent d'abord être installés, puis déclarés
dans [`versions.json`](versions.json).

## Détails techniques

- **Lancement** : DOSBox est lancé avec le `dosbox.conf` embarqué **suivi** de
  [`conf/dos.conf`](conf/dos.conf) qui force `fullscreen=false` + `output=surface`
  (capturable) et fournit un `[autoexec]` qui monte `lotr2` et lance `L2D.EXE`
  **sans le `pause`** du wrapper GamesNostalgia.
- **Capture** : `win.ps1` utilise `PrintWindow(…, 2)` (PW_RENDERFULLCONTENT). Si l'image
  revient noire (surfaces accélérées), repli automatique sur une capture d'écran de la zone
  fenêtre (la fenêtre doit alors rester visible, non masquée).
- **Entrées** : `SendKeys` / `mouse_event` après mise au premier plan. Si DOSBox (SDL)
  ignore certaines touches synthétiques, basculer vers une injection bas niveau par
  scan-codes (`SendInput`) — non implémenté en v0.1, à ajouter si besoin.

## Limites connues (v0.1)

- `output=surface` est plus lent que `overlay` ; suffisant pour l'analyse, pas pour jouer.
- Pas de lecture de la mémoire/état interne du jeu : analyse **visuelle** uniquement.
- Une seule instance DOSBox gérée à la fois (comparaison = séquentielle, ou lancer une
  autre version manuellement).
