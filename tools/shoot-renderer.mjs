/*
 * shoot-renderer.mjs — donne des « yeux » sur le renderer Phaser sans fenêtre
 * Electron ni vol de souris : sert le build `out/renderer/` via un petit
 * serveur statique, pilote Chrome SYSTÈME en headless (puppeteer-core, pas de
 * navigateur téléchargé) et enregistre un PNG dans doc/captures/runtime/.
 *
 * Le renderer est un pur web app (canvas Phaser, état en registry Phaser +
 * localStorage, aucune dépendance Electron/Node), donc Chrome seul suffit à le
 * rendre fidèlement (WebGL via swiftshader).
 *
 * Prérequis : `npm run build` (génère out/renderer), Chrome ou Edge installé.
 *
 * Usage :
 *   node tools/shoot-renderer.mjs --label menu
 *   node tools/shoot-renderer.mjs --label forge --wait 1500 \
 *       --eval "const c=__game.scene.getScene('Campaign'); ..."
 *   node tools/shoot-renderer.mjs --label x --click "320,240;100,50" --wait 500
 *
 * Options :
 *   --label <kebab>   nom du fichier (défaut 'shot')
 *   --url <url>       viser un serveur existant (ex http://localhost:5173)
 *                     au lieu de servir out/renderer
 *   --wait <ms>       attente initiale après chargement (défaut 2500)
 *   --eval "<js>"     code exécuté dans la page (accès à window.__game) ;
 *                     répétable, exécuté dans l'ordre, chacun suivi de --step
 *   --step <ms>       attente après chaque --eval/--click (défaut 600)
 *   --click "x,y;..." clics canvas successifs (coordonnées du jeu 640×480)
 *   --browser <path>  exécutable navigateur (défaut : Chrome puis Edge)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const RENDER_DIR = path.join(ROOT, 'out', 'renderer');
const OUT_DIR = path.join(ROOT, 'doc', 'captures', 'runtime');

// --- parsing minimal des arguments (répétables pour --eval/--click) ---
const argv = process.argv.slice(2);
const opts = { label: 'shot', wait: 2500, step: 600, evals: [], clicks: [] };
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    if (a === '--label') { opts.label = v; i++; }
    else if (a === '--url') { opts.url = v; i++; }
    else if (a === '--wait') { opts.wait = Number(v); i++; }
    else if (a === '--step') { opts.step = Number(v); i++; }
    else if (a === '--eval') { opts.evals.push(v); i++; }
    else if (a === '--click') { opts.clicks.push(v); i++; }
    else if (a === '--waitfor') { (opts.waitfors ||= []).push(v); i++; }
    else if (a === '--browser') { opts.browser = v; i++; }
}

const BROWSERS = [
    opts.browser,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean);
const browserPath = BROWSERS.find(p => fs.existsSync(p));
if (!browserPath) { console.error('Aucun Chrome/Edge trouvé. Passe --browser <chemin>.'); process.exit(1); }

const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
    '.xml': 'application/xml', '.svg': 'image/svg+xml', '.cur': 'image/x-icon'
};

function startServer (dir) {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let rel = decodeURIComponent(req.url.split('?')[0]);
            if (rel === '/') { rel = '/index.html'; }
            const file = path.join(dir, rel);
            if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
                res.writeHead(404); res.end('not found'); return;
            }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
            fs.createReadStream(file).pipe(res);
        });
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    if (!opts.url && !fs.existsSync(path.join(RENDER_DIR, 'index.html'))) {
        console.error('out/renderer introuvable — lance `npm run build` d\'abord.');
        process.exit(1);
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });

    let server = null;
    let url = opts.url;
    if (!url) {
        server = await startServer(RENDER_DIR);
        url = `http://127.0.0.1:${server.address().port}/`;
    }

    const browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: 'new',
        // GPU matériel par défaut (ANGLE/D3D11) : décode/uploade les ~300
        // textures de la campagne bien plus vite que le rendu logiciel.
        // SOFTWARE_GL=1 force swiftshader (repli si pas de GPU exploitable).
        args: [
            '--no-sandbox', '--disable-setuid-sandbox',
            '--ignore-gpu-blocklist', '--enable-webgl',
            '--window-size=660,520', '--hide-scrollbars',
            ...(process.env.SOFTWARE_GL
                ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
                : ['--use-angle=d3d11', '--enable-gpu'])
        ]
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 480, deviceScaleFactor: 2 });
    const logs = [];
    page.on('console', m => logs.push('[console] ' + m.text()));
    page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
    page.on('requestfailed', r => logs.push('[reqfail] ' + r.url() + ' — ' + (r.failure() && r.failure().errorText)));
    page.on('response', r => { if (r.status() >= 400) { logs.push('[http ' + r.status() + '] ' + r.url()); } });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForFunction('!!window.__game', { timeout: 15000 }).catch(() => {});
    await sleep(opts.wait);

    // scénario : --eval et --click joués dans l'ordre où ils apparaissent
    const ordered = [];
    let ei = 0, ci = 0, wi = 0;
    for (const a of argv) {
        if (a === '--eval') { ordered.push({ type: 'eval', v: opts.evals[ei++] }); }
        else if (a === '--click') { ordered.push({ type: 'click', v: opts.clicks[ci++] }); }
        else if (a === '--waitfor') { ordered.push({ type: 'waitfor', v: opts.waitfors[wi++] }); }
    }
    for (const action of ordered) {
        if (action.type === 'waitfor') {
            try { await page.waitForFunction(action.v, { timeout: 40000, polling: 200 }); }
            catch (e) { logs.push('[waitfor timeout] ' + action.v); }
            continue;
        }
        if (action.type === 'eval') {
            // IIFE : isole le scope de chaque --eval (sinon `const c` fuit
            // dans le realm global et collisionne entre appels successifs).
            try { await page.evaluate('(function(){' + action.v + '})()'); }
            catch (e) { logs.push('[eval error] ' + e.message); }
        } else {
            const canvas = await page.$('canvas');
            const box = await canvas.boundingBox();
            for (const pair of action.v.split(';')) {
                const [x, y] = pair.split(',').map(Number);
                await page.mouse.click(box.x + x, box.y + y);
                await sleep(120);
            }
        }
        await sleep(opts.step);
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(OUT_DIR, `${stamp}_${opts.label}.png`);
    const canvas = await page.$('canvas');
    if (canvas) { await canvas.screenshot({ path: outFile }); }
    else { await page.screenshot({ path: outFile }); }

    await browser.close();
    if (server) { server.close(); }

    console.log('Capture: ' + outFile);
    if (logs.length) { console.log(logs.slice(-25).join('\n')); }
})();
