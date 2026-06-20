#!/usr/bin/env node
/**
 * MCP lotr2 — pilote Lords of the Realm II (DOSBox) en local.
 *
 * Outils exposes :
 *   list_versions  — versions connues + ce qui est reellement installe
 *   launch         — demarre DOSBox sur une version (fenetre, sans le "pause" du wrapper)
 *   status         — DOSBox tourne ? titre/taille fenetre
 *   focus          — met la fenetre du jeu au premier plan
 *   send_keys      — envoie des touches (syntaxe .NET SendKeys : {ENTER} {ESC} {F1} {UP}...)
 *   click          — clic souris en coordonnees client de la fenetre
 *   screenshot     — capture la fenetre (PrintWindow, fallback ecran) ; renvoie l'image
 *   close          — termine DOSBox
 *
 * Boucle type : launch -> (send_keys / click pour naviguer) -> screenshot -> analyse.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn, execFile } from "node:child_process";
import { readFileSync, readFile } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIN_PS1 = join(__dirname, "win.ps1");
const WSL_SH = join(__dirname, "wsl-lotr2.sh");
const VERSIONS = JSON.parse(readFileSync(join(__dirname, "versions.json"), "utf8"));
// racine du depot (tools/mcp-lotr2 -> ../../)
const REPO_ROOT = resolve(__dirname, "..", "..");
// doc/captures/runtime/ a la racine du depot
const CAPTURES_DIR = resolve(REPO_ROOT, "doc", "captures", "runtime");
// screenshotter du PORTAGE (renderer Phaser) en Chrome headless
const SHOOT = resolve(REPO_ROOT, "tools", "shoot-renderer.mjs");

// Backend par defaut : ISOLE (WSL+Xvfb+xdotool) pour ne jamais voler la souris
// de l'utilisateur. 'dos' (DOSBox Windows) reste dispo explicitement.
const DEFAULT_VERSION = "dos-wsl";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Resout la version demandee (defaut isole). */
const ver = (version) => VERSIONS[version || DEFAULT_VERSION] || VERSIONS[DEFAULT_VERSION];

/** Convertit un chemin Windows (D:\a\b) en chemin WSL (/mnt/d/a/b). */
function winToWsl(p) {
  const m = /^([A-Za-z]):\\(.*)$/.exec(p);
  if (!m) return p.replace(/\\/g, "/");
  return "/mnt/" + m[1].toLowerCase() + "/" + m[2].replace(/\\/g, "/");
}

/** Lance wsl-lotr2.sh dans la distro et renvoie le JSON parse. */
function runWsl(distro, action, ...args) {
  return new Promise((resolveP, rejectP) => {
    const a = ["-d", distro, "--", "bash", winToWsl(WSL_SH), action, ...args.map(String)];
    execFile("wsl.exe", a, { windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      const out = (stdout || "").trim();
      let parsed = null;
      try {
        const line = out.split(/\r?\n/).filter((l) => l.trim().startsWith("{")).pop();
        parsed = line ? JSON.parse(line) : null;
      } catch { /* ignore */ }
      if (parsed) return resolveP(parsed);
      rejectP(new Error((stderr || out || err?.message || "echec wsl").trim()));
    });
  });
}

// Traduction syntaxe .NET SendKeys -> actions xdotool (backend WSL).
const XDO_SPECIAL = {
  ENTER: "Return", ESC: "Escape", TAB: "Tab", SPACE: "space",
  BACKSPACE: "BackSpace", UP: "Up", DOWN: "Down", LEFT: "Left", RIGHT: "Right",
};
const XDO_MODS = { "+": "shift", "^": "ctrl", "%": "alt" };
function parseSendKeys(keys) {
  const actions = [];
  let pending = [];
  for (let i = 0; i < keys.length; ) {
    const ch = keys[i];
    if (XDO_MODS[ch]) { pending.push(XDO_MODS[ch]); i++; continue; }
    if (ch === "{") {
      const end = keys.indexOf("}", i);
      const token = keys.slice(i + 1, end < 0 ? keys.length : end);
      i = (end < 0 ? keys.length : end + 1);
      const [name, countStr] = token.split(/\s+/);
      const key = XDO_SPECIAL[name.toUpperCase()] || name; // F1..F12 -> tels quels
      const combo = (pending.length ? pending.join("+") + "+" : "") + key;
      pending = [];
      const count = countStr ? parseInt(countStr, 10) || 1 : 1;
      for (let k = 0; k < count; k++) actions.push({ type: "key", value: combo });
      continue;
    }
    if (pending.length) { actions.push({ type: "key", value: pending.join("+") + "+" + ch }); pending = []; i++; continue; }
    let text = "";
    while (i < keys.length && keys[i] !== "{" && !XDO_MODS[keys[i]]) { text += keys[i]; i++; }
    if (text) actions.push({ type: "type", value: text });
  }
  return actions;
}

/** Lance win.ps1 avec une action et renvoie le JSON parse. */
function runPwsh(args) {
  return new Promise((resolveP, rejectP) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", WIN_PS1, ...args],
      { windowsHide: true, maxBuffer: 1024 * 1024 },
      (err, stdout, stderr) => {
        const out = (stdout || "").trim();
        let parsed = null;
        try {
          // derniere ligne JSON (au cas ou Add-Type ecrirait du bruit)
          const line = out.split(/\r?\n/).filter(Boolean).pop();
          parsed = line ? JSON.parse(line) : null;
        } catch {
          /* ignore */
        }
        if (parsed) return resolveP(parsed);
        rejectP(new Error((stderr || out || err?.message || "echec powershell").trim()));
      }
    );
  });
}

const text = (s) => ({ content: [{ type: "text", text: s }] });
const json = (o) => text(JSON.stringify(o, null, 2));
const readB64 = (p) => new Promise((resP, rejP) => readFile(p, (e, buf) => (e ? rejP(e) : resP(buf.toString("base64")))));

/** Capture le jeu DOS (backend de la version v) vers outPath. Renvoie une note. */
async function captureGame(v, outPath) {
  if (v.backend === "wsl") {
    const r = await runWsl(v.distro, "capture", winToWsl(outPath));
    if (!r.ok) throw new Error(r.error || "capture wsl echouee");
    return "wsl/xvfb (isole)";
  }
  const res = await runPwsh(["-Action", "capture", "-OutPath", outPath, "-Process", v?.process || "DOSBox"]);
  return `${res.method} ${res.width}x${res.height}` +
    (res.method === "screen" ? " [repli capture ecran : fenetre visible requise]" : "");
}

/** Lance tools/shoot-renderer.mjs (Chrome headless) et renvoie le PNG produit. */
function runShoot(args) {
  return new Promise((resP, rejP) => {
    execFile("node", [SHOOT, ...args], { cwd: REPO_ROOT, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const m = /Capture:\s*(.+\.png)/.exec(stdout || "");
        if (m) return resP({ path: m[1].trim(), log: (stdout || "") + (stderr || "") });
        rejP(new Error((stderr || stdout || err?.message || "echec shoot-renderer").trim()));
      });
  });
}

/** Build de production (out/renderer) avant de screenshoter le portage. */
function buildRenderer() {
  return new Promise((resP, rejP) => {
    execFile("npm.cmd", ["run", "build"], { cwd: REPO_ROOT, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => (err ? rejP(new Error((stderr || stdout || err.message).trim())) : resP(true)));
  });
}

/** Construit les arguments de shoot-renderer depuis les params du tool portage. */
function portageArgs({ label, scene, evalJs, clicks, wait, step }) {
  const args = ["--label", label || "portage"];
  if (scene) {
    // saute aux scenes : stoppe les menus puis demarre la scene, attend son state
    const stop = "['MainMenu','Loader','Boot','SinglePlayerMenu','ShieldMenu','CustomGame','OrginalOrRoyalMenu'].forEach(k=>{try{window.__game.scene.stop(k)}catch(e){}});";
    args.push("--eval", stop + "window.__game.scene.start('" + scene + "')");
    args.push("--waitfor", "window.__game.scene.getScene('" + scene + "') && window.__game.scene.getScene('" + scene + "').state");
  }
  if (evalJs) args.push("--eval", evalJs);
  if (clicks) args.push("--click", clicks);
  if (wait) args.push("--wait", String(wait));
  if (step) args.push("--step", String(step));
  return args;
}

const server = new McpServer({ name: "lotr2", version: "0.1.0" });

server.registerTool(
  "list_versions",
  {
    title: "Lister les versions",
    description:
      "Liste les versions connues de Lords of the Realm II et indique lesquelles sont reellement installees/lancables.",
    inputSchema: {},
  },
  async () => {
    const out = Object.entries(VERSIONS).map(([id, v]) => ({
      id,
      label: v.label,
      installed: !!v.installed,
      note: v.note ?? null,
    }));
    return json(out);
  }
);

server.registerTool(
  "launch",
  {
    title: "Lancer le jeu",
    description:
      "Demarre DOSBox sur la version demandee, en fenetre et sans le 'pause' du wrapper, pret a etre capture. " +
      "Defaut : 'dos' (seule version installee). Echoue proprement pour une version non installee.",
    inputSchema: {
      version: z.string().optional().describe("id de version (voir list_versions). Defaut: 'dos'."),
    },
  },
  async ({ version }) => {
    const id = version || DEFAULT_VERSION;
    const v = VERSIONS[id];
    if (!v) return text(`Version inconnue: ${id}. Utilise list_versions.`);
    if (!v.installed)
      return text(`Version '${id}' non installee.\n${v.note ?? "Aucune procedure d'installation enregistree."}`);

    // Backend ISOLE (WSL+Xvfb) : delegue tout au script Linux.
    if (v.backend === "wsl") {
      const r = await runWsl(v.distro, "start").catch((e) => ({ ok: false, error: e.message }));
      if (!r.ok) return text(`Echec du lancement WSL: ${r.error || "?"}`);
      if (r.already) return text(`DOSBox tourne deja dans WSL (display isole). Utilise status/screenshot, ou close d'abord.`);
      return text(
        `Lance: ${v.label} (pid ${r.pid}, display ${r.display || "?"}).\n` +
          (r.window ? `Fenetre 640x480 detectee sur le display X virtuel. ` : `Fenetre pas encore detectee. `) +
          `Patiente quelques secondes (intro), puis send_keys/click pour naviguer et screenshot pour capturer. ` +
          `Ta vraie souris n'est jamais touchee.`
      );
    }

    // deja en cours ?
    const st = await runPwsh(["-Action", "status", "-Process", v.process]).catch(() => null);
    if (st?.running) return text(`DOSBox tourne deja (pid ${st.pid ?? "?"}). Utilise status/screenshot, ou close d'abord.`);

    const confOverride = resolve(__dirname, v.confOverride);
    const args = ["-conf", v.bundledConf, "-conf", confOverride];
    const child = spawn(v.command, args, { cwd: v.cwd, detached: true, stdio: "ignore" });
    child.unref();

    // attendre l'apparition de la fenetre (le jeu charge + l'intro DOS)
    let appeared = null;
    for (let i = 0; i < 20; i++) {
      await sleep(700);
      const s = await runPwsh(["-Action", "status", "-Process", v.process]).catch(() => null);
      if (s?.hasWindow) {
        appeared = s;
        break;
      }
    }
    if (!appeared)
      return text(
        `DOSBox lance (pid ${child.pid}) mais aucune fenetre detectee apres ~14 s. ` +
          `Verifie qu'il n'est pas en plein ecran et reessaie status.`
      );
    return text(
      `Lance: ${v.label} (pid ${child.pid}).\nFenetre: "${appeared.title}" ${appeared.client?.width}x${appeared.client?.height}.\n` +
        `Patiente quelques secondes (intro), puis send_keys/click pour naviguer et screenshot pour capturer.`
    );
  }
);

server.registerTool(
  "status",
  {
    title: "Etat du jeu",
    description: "Indique si DOSBox tourne, et si oui le titre et la taille de sa fenetre.",
    inputSchema: { version: z.string().optional() },
  },
  async ({ version }) => {
    const v = ver(version);
    if (v.backend === "wsl") return json(await runWsl(v.distro, "status"));
    const s = await runPwsh(["-Action", "status", "-Process", v?.process || "DOSBox"]);
    return json(s);
  }
);

server.registerTool(
  "focus",
  {
    title: "Mettre le jeu au premier plan",
    description: "Restaure et met la fenetre DOSBox au premier plan (utile avant une serie d'entrees).",
    inputSchema: { version: z.string().optional() },
  },
  async ({ version }) => {
    const v = ver(version);
    if (v.backend === "wsl") return text("Backend isole (WSL) : pas de notion de premier plan, la fenetre est seule sur son display virtuel.");
    return json(await runPwsh(["-Action", "focus", "-Process", v?.process || "DOSBox"]));
  }
);

server.registerTool(
  "send_keys",
  {
    title: "Envoyer des touches",
    description:
      "Envoie des touches a la fenetre du jeu (focus automatique). Syntaxe .NET SendKeys : " +
      "texte brut pour les lettres, et codes pour les speciales : {ENTER} {ESC} {TAB} {F1}..{F12} " +
      "{UP} {DOWN} {LEFT} {RIGHT} {SPACE} {BACKSPACE}. Modificateurs : + (Shift) ^ (Ctrl) % (Alt). " +
      "Repeter une touche : {DOWN 5}. Optionnel: 'times' pour repeter toute la sequence.",
    inputSchema: {
      keys: z.string().describe("Sequence SendKeys, ex: '{ENTER}' ou '{DOWN 3}{ENTER}'."),
      times: z.number().int().min(1).max(50).optional().describe("Repeter la sequence N fois (defaut 1)."),
      version: z.string().optional(),
    },
  },
  async ({ keys, times, version }) => {
    const v = ver(version);
    const n = times || 1;
    if (v.backend === "wsl") {
      const actions = parseSendKeys(keys);
      let last;
      for (let i = 0; i < n; i++) {
        for (const act of actions) {
          last = await runWsl(v.distro, act.type, act.value);
          await sleep(40);
        }
        if (n > 1) await sleep(120);
      }
      return json({ ok: true, sent: keys, actions: actions.length, times: n });
    }
    let last;
    for (let i = 0; i < n; i++) {
      last = await runPwsh(["-Action", "sendkeys", "-Keys", keys, "-Process", v?.process || "DOSBox"]);
      if (n > 1) await sleep(120);
    }
    return json({ ...last, times: n });
  }
);

server.registerTool(
  "click",
  {
    title: "Clic souris",
    description:
      "Clique dans la fenetre du jeu, en coordonnees CLIENT (0,0 = coin haut-gauche de la zone de jeu). " +
      "Utilise status pour connaitre la taille client. Bouton gauche par defaut.",
    inputSchema: {
      x: z.number().int().describe("X en pixels client."),
      y: z.number().int().describe("Y en pixels client."),
      button: z.enum(["left", "right"]).optional(),
      double: z.boolean().optional().describe("Double-clic."),
      version: z.string().optional(),
    },
  },
  async ({ x, y, button, double, version }) => {
    const v = ver(version);
    if (v.backend === "wsl") {
      return json(await runWsl(v.distro, "click", x, y, button === "right" ? "right" : "left", double ? "double" : "single"));
    }
    const args = ["-Action", "click", "-X", String(x), "-Y", String(y), "-Process", v?.process || "DOSBox"];
    if (button === "right") args.push("-Button", "right");
    if (double) args.push("-Double");
    return json(await runPwsh(args));
  }
);

server.registerTool(
  "screenshot",
  {
    title: "Capturer l'ecran du jeu",
    description:
      "Capture la fenetre DOSBox (PrintWindow, repli sur capture ecran si noir), enregistre un PNG horodate " +
      "dans doc/captures/runtime/ et renvoie l'image pour analyse immediate. Donne un 'label' descriptif " +
      "(ex: 'castle-screen') pour nommer le fichier.",
    inputSchema: {
      label: z.string().optional().describe("Etiquette pour le nom de fichier (kebab-case)."),
      delayMs: z.number().int().min(0).max(10000).optional().describe("Attente avant capture (ms), ex. apres une transition."),
      version: z.string().optional(),
    },
  },
  async ({ label, delayMs, version }) => {
    const v = ver(version);
    if (delayMs) await sleep(delayMs);
    await mkdir(CAPTURES_DIR, { recursive: true });
    const safe = (label || "shot").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outPath = join(CAPTURES_DIR, `${stamp}_${safe}.png`);

    const note = await captureGame(v, outPath);
    const b64 = await readB64(outPath);
    return {
      content: [
        { type: "image", data: b64, mimeType: "image/png" },
        { type: "text", text: `Capture (${note}) -> ${outPath}` },
      ],
    };
  }
);

server.registerTool(
  "portage",
  {
    title: "Lancer/screenshoter le PORTAGE (OpenLotR2)",
    description:
      "Rend la VERSION DE TRAVAIL (le portage OpenLotR2, renderer Phaser) dans Chrome headless " +
      "et renvoie une capture du canvas (640x480) dans doc/captures/runtime/. Permet a l'IA de VOIR " +
      "le portage elle-meme et d'iterer. 'scene' saute directement a une scene Phaser (ex 'Campaign') ; " +
      "'eval' execute du JS apres (window.__game expose le jeu, ex ouvrir un panneau) ; 'clicks' clique " +
      "aux coords du jeu. Mettre 'rebuild'=true apres une modif de code (lance npm run build).",
    inputSchema: {
      label: z.string().optional().describe("Etiquette du fichier (kebab-case)."),
      scene: z.string().optional().describe("Scene Phaser a afficher directement, ex 'Campaign', 'MainMenu'."),
      eval: z.string().optional().describe("JS execute apres la scene (window.__game dispo). Ex: \"const c=window.__game.scene.getScene('Campaign'); c.openBlacksmithDialog(c.state.selectedCounty);\""),
      clicks: z.string().optional().describe("Clics canvas successifs 'x,y;x,y' (coords jeu 640x480)."),
      wait: z.number().int().min(0).max(60000).optional().describe("Attente initiale ms (defaut 2500)."),
      step: z.number().int().min(0).max(20000).optional().describe("Attente apres chaque eval/clic ms."),
      rebuild: z.boolean().optional().describe("Lancer `npm run build` avant (apres une modif de code)."),
    },
  },
  async ({ label, scene, eval: evalJs, clicks, wait, step, rebuild }) => {
    if (rebuild) {
      try { await buildRenderer(); } catch (e) { return text(`Echec du build: ${e.message}`); }
    }
    const args = portageArgs({ label, scene, evalJs, clicks, wait, step });
    const r = await runShoot(args).catch((e) => ({ error: e.message }));
    if (r.error) return text(`Echec portage: ${r.error}`);
    const b64 = await readB64(r.path);
    const warn = /\[(reqfail|http [45]|pageerror|eval error|waitfor timeout)/.test(r.log) ? "\n[diagnostic]\n" + r.log.split(/\r?\n/).filter((l) => /\[(reqfail|http|pageerror|eval|waitfor)/.test(l)).join("\n") : "";
    return { content: [{ type: "image", data: b64, mimeType: "image/png" }, { type: "text", text: `Portage -> ${r.path}${warn}` }] };
  }
);

server.registerTool(
  "compare",
  {
    title: "Comparer DOS original vs portage",
    description:
      "Capture COTE A COTE le jeu DOS original (sa fenetre courante : navigue-le d'abord avec launch/click/send_keys) " +
      "ET le portage OpenLotR2 (memes params que 'portage' : scene/eval/clicks/rebuild), puis renvoie les DEUX images " +
      "pour comparer la fidelite au pixel pres. Le DOS doit deja afficher l'ecran voulu ; le portage est rendu a la demande.",
    inputSchema: {
      label: z.string().optional(),
      scene: z.string().optional().describe("Scene Phaser du portage a afficher."),
      eval: z.string().optional().describe("JS portage (window.__game dispo)."),
      clicks: z.string().optional().describe("Clics canvas portage 'x,y;...'."),
      rebuild: z.boolean().optional(),
      delayMs: z.number().int().min(0).max(10000).optional().describe("Attente avant la capture DOS."),
      version: z.string().optional().describe("Version DOS (defaut backend isole)."),
    },
  },
  async ({ label, scene, eval: evalJs, clicks, rebuild, delayMs, version }) => {
    const v = ver(version);
    const safe = (label || "compare").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 50);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await mkdir(CAPTURES_DIR, { recursive: true });

    // 1) DOS (ecran courant)
    if (delayMs) await sleep(delayMs);
    const dosPath = join(CAPTURES_DIR, `${stamp}_${safe}-dos.png`);
    let dosNote;
    try { dosNote = await captureGame(v, dosPath); }
    catch (e) { return text(`Echec capture DOS: ${e.message}. Le jeu DOS est-il lance (launch) et navigue ?`); }

    // 2) portage (rendu a la demande)
    if (rebuild) { try { await buildRenderer(); } catch (e) { return text(`Echec build portage: ${e.message}`); } }
    const r = await runShoot(portageArgs({ label: safe + "-portage", scene, evalJs, clicks })).catch((e) => ({ error: e.message }));
    if (r.error) return text(`DOS capture OK (${dosPath}) mais echec portage: ${r.error}`);

    const dosB64 = await readB64(dosPath);
    const portB64 = await readB64(r.path);
    return {
      content: [
        { type: "text", text: `=== DOS original (${dosNote}) ===` },
        { type: "image", data: dosB64, mimeType: "image/png" },
        { type: "text", text: `=== Portage OpenLotR2 ===` },
        { type: "image", data: portB64, mimeType: "image/png" },
        { type: "text", text: `DOS -> ${dosPath}\nPortage -> ${r.path}` },
      ],
    };
  }
);

server.registerTool(
  "close",
  {
    title: "Fermer le jeu",
    description: "Termine le(s) processus DOSBox.",
    inputSchema: { version: z.string().optional() },
  },
  async ({ version }) => {
    const v = ver(version);
    if (v.backend === "wsl") return json(await runWsl(v.distro, "close"));
    const proc = v?.process || "DOSBox";
    return new Promise((resP) => {
      execFile("taskkill", ["/IM", `${proc}.exe`, "/F"], { windowsHide: true }, (err, stdout, stderr) => {
        resP(text((stdout || stderr || err?.message || "ferme").trim()));
      });
    });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
