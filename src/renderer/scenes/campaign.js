import { FONT_FAMILY } from '../theme';
import { t } from '../i18n';
import GameState, { MAX_COUNTY_ID, RATIONS, RATION_FACTOR, HEALTH_LEVELS, CASTLES, PRICES, WEAPON_TYPES, WEAPON_DEFS } from '../game/state';
import { NOBLE_COUNTS, CROWN_AMOUNTS } from '../game/settings';

// Helpers de traduction des valeurs dérivées de game/state.js (qui restent
// en anglais comme clés canoniques) : on traduit au point d'affichage.
const tSeason = s => t('season.' + s);
const tRation = r => t('ration.' + r);
const tHealth = h => t('health.' + h);
const tCastle = name => t('castle.' + name);
const tWeapon = name => t('weapon.' + name);
const tResource = key => t('resource.' + key);
const tShield = c => t('shield.' + c);

// Field frames come in groups of four. The base frame has no county border;
// +1 adds the north-east border, +2 the north-west border, +3 both.
// Seasonal sheets provide the spring/summer/autumn/winter crop appearance.
const FIELD_FRAMES = { barren: 80, fallow: 84, bare: 88 };
const GRAIN_BANDS = [92, 96, 100];
// États subis : friche = broussaille 80-83 (4 variantes) ; remise en état
// = bande 108-125 (la parcelle saine grandit avec la progression) ;
// endommagé : sécheresse = terre nue 88-89, inondation = 136-139 —
// calages ❓ à valider sur captures DOS.
const RECLAIM_BAND = 108;
const RECLAIM_LEN = 18;
const PARCHED_BAND = 88;
const FLOOD_BAND = 136;
// Libellés d'usage/état des champs (Grain/Fallow/Cattle/Barren/…) : traduits
// à l'affichage via les clés i18n `field.*`.

// Drapeaux des nobles (FLAGS1x, 7 groupes × 8 frames d'animation) par
// blason ; les groupes 5-6 sont les drapeaux en feu (batailles, plus tard).
const FLAG_BY_SHIELD = { red: 0, yellow: 1, black: 2, purple: 3, blue: 4 };
const RATIONS_UI = name => `rations-v2-${name}`;
const BLACKSMITH_FRAMES = Array.from({ length: 9 }, (_, i) => 10 + i);
// Industries de carte :
//   ind-*-20 = MINE de fer (TOWN1x frame 20, chevalement/roue sur sol brun)
//   ind-*-30 = BOIS / scierie (asset manuel depuis
//     doc/captures/map-wood-sawmill-wheel.png ; TOWN1x rogne son sommet)
const RESOURCE_INDUSTRY_KINDS = [0, 20, 30];
const MAP_INDUSTRY_KINDS = [...RESOURCE_INDUSTRY_KINDS, ...BLACKSMITH_FRAMES];

// Jauge de santé du panneau : 5 frames pour les 5 niveaux de l'original
// (diseased → perfect).
const HEALTH_GAUGES = ['healthWorst', 'healthBad', 'healthOk', 'healthGood', 'healthBest'];
const LABOR_SLIDER = { minX: 55, maxX: 112, y: 254.5 };
const DOS_DELTA_GREEN = 0x00ff00;
const DOS_DELTA_RED = 0xd00000;
const DOS_DELTA_SHADOW = 0x003000;
const WEAPON_ABBR = {
    bow: 'BOW',
    crossbow: 'XBW',
    knight: 'KNT',
    mace: 'MCE',
    pike: 'PIK',
    sword: 'SWD'
};

export default class Campaign extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'Campaign', active: false });
    }

    preload ()
    {

        this.load.atlas('MiscCityAtlas', 'images/scenes/MainScene/misc_city.png', 'images/scenes/MainScene/misc_city.json');

        // Tilesets isométriques saisonniers du jeu original (140 tuiles 58×30,
        // grille 10×14, pas 64×34, losange dessiné à (0,4) dans chaque frame).
        // Composés par tools/composite-tilesets.js : BASE01.PL8 (tuiles
        // constantes) + BASE1A-D.PL8 (saisons), noir pur = transparent.
        this.load.spritesheet('tilesSpring', 'images/scenes/MainScene/tiles-spring.png', { frameWidth: 64, frameHeight: 34 });
        this.load.spritesheet('tilesSummer', 'images/scenes/MainScene/tiles-summer.png', { frameWidth: 64, frameHeight: 34 });
        this.load.spritesheet('tilesAutumn', 'images/scenes/MainScene/tiles-autumn.png', { frameWidth: 64, frameHeight: 34 });
        this.load.spritesheet('tilesWinter', 'images/scenes/MainScene/tiles-winter.png', { frameWidth: 64, frameHeight: 34 });

        // Planches ROADS (routes, forêts, rivières, arbres) — mêmes 140 cases.
        this.load.spritesheet('roadsSpring', 'images/scenes/MainScene/roads-spring.png', { frameWidth: 64, frameHeight: 34 });
        this.load.spritesheet('roadsSummer', 'images/scenes/MainScene/roads-summer.png', { frameWidth: 64, frameHeight: 34 });
        this.load.spritesheet('roadsAutumn', 'images/scenes/MainScene/roads-autumn.png', { frameWidth: 64, frameHeight: 34 });
        this.load.spritesheet('roadsWinter', 'images/scenes/MainScene/roads-winter.png', { frameWidth: 64, frameHeight: 34 });

        // Entités de la carte extraites par tools/extract-features.js :
        // villes 2×2 (3 tailles), châteaux 2×2 (5 niveaux), bâtiments
        // d'industrie mono-tuile (0 = carrière, 10-18 = forge animée,
        // 20 = mine, 30 = scierie).
        for (const s of ['spring', 'summer', 'autumn', 'winter']) {
            for (let k = 0; k < 3; k++) {
                this.load.image(`town-${s}-${k}`, `images/scenes/MainScene/features/town-${s}-${k}.png`);
            }
            for (let k = 0; k < 5; k++) {
                this.load.image(`castle-${s}-${k}`, `images/scenes/MainScene/features/castle-${s}-${k}.png`);
            }
            for (const i of MAP_INDUSTRY_KINDS) {
                this.load.image(`ind-${s}-${i}`, `images/scenes/MainScene/features/ind-${s}-${i}.png`);
            }
            // villages mono-tuile (0 = normal, 1 = brûlé) posés sur les
            // slots de classe 16 selon la population du comté
            for (let k = 0; k < 2; k++) {
                this.load.image(`village-${s}-${k}`, `images/scenes/MainScene/features/village-${s}-${k}.png`);
            }
            for (let k = 0; k < 25; k++) {
                this.load.image(`mtn-${s}-${k}`, `images/scenes/MainScene/features/mtn-${s}-${k}.png`);
            }
            // troupeaux : 3 densités (faible/moyen/surpâturage) × 6 frames
            for (let d = 0; d < 3; d++) {
                for (let f = 0; f < 6; f++) {
                    this.load.image(`herd-${s}-${d}-${f}`, `images/scenes/MainScene/features/herd-${s}-${d}-${f}.png`);
                }
            }
        }

        // polices bitmap originales du jeu (FNTL2_9/14/22, extraites par
        // tools/extract-font.js) — blanches, teintées à l'usage
        this.load.bitmapFont('lords2', 'fonts/lords2-14.png', 'fonts/lords2-14.xml');
        this.load.bitmapFont('lords2-small', 'fonts/lords2-9.png', 'fonts/lords2-9.xml');
        this.load.bitmapFont('lords2-big', 'fonts/lords2-22.png', 'fonts/lords2-22.xml');

        // icônes photo de l'écran de village (panneau d'affectation des
        // champs) : usages + états subis + fermier de la remise en état
        for (const n of ['grain', 'fallow', 'cattle', 'barren', 'parched', 'flooded', 'reclaim']) {
            this.load.image(`icon-${n}`, `images/scenes/MainScene/features/icon-${n}.png`);
        }

        // Habillage de la mini-carte stratégique. Sa silhouette est lue
        // depuis `campaignMap.minimap`, donc suit la carte choisie.
        this.load.image('minimap-legend', 'images/scenes/MainScene/features/minimap-legend.png');
        for (const n of ['workers', 'rations', 'happiness', 'zoom']) {
            this.load.image(`minimap-btn-${n}`, `images/scenes/MainScene/features/minimap-btn-${n}.png`);
        }

        // panneau de comté étranger : château sous l'orage (MISC_CTY 58)
        this.load.image('county-foreign', 'images/scenes/MainScene/features/county-foreign.png');

        // icônes de l'écran des rations (tools/extract-rations-ui.js :
        // capture de référence + MISC_CTY 23/42/43)
        for (const n of ['up', 'down', 'basket', 'fork', 'arrowl', 'arrowr', 'close', 'figure', 'heart', 'cheese', 'cow', 'cowbig']) {
            this.load.image(RATIONS_UI(n), `images/scenes/MainScene/features/rations-${n}.png?v=2`);
        }
        this.load.image('tax-panel-mask', 'images/scenes/MainScene/features/tax-panel-mask.png');
        this.load.image('tax-purse', 'images/scenes/MainScene/features/tax-purse.png');
        this.load.image('tax-close', 'images/scenes/MainScene/features/rations-close-transparent.png');

        // Écran avancé des ouvriers : fond original VILL.PL8, extrait par
        // tools/extract-advanced-labor-ui.js.
        this.load.image('advanced-labor-background', 'images/scenes/MainScene/advanced-labor/advanced-labor-background.png');
        for (const name of ['kneeling', 'small', 'wood', 'smithy', 'castle', 'idle', 'cattle']) {
            this.load.image(`labor-figure-${name}`, `images/scenes/MainScene/advanced-labor/labor-figure-${name}.png`);
        }
        for (const name of ['grain-active', 'moving', 'reclaim-inactive', 'smithy-active', 'stone-active']) {
            this.load.image(`labor-dos-${name}`, `images/scenes/MainScene/advanced-labor/labor-dos-${name}.png`);
        }
        for (const name of ['wood', 'cattle', 'grain', 'grain-active', 'moving', 'missing', 'surplus-inactive', 'inactive', 'reclaim-active', 'iron', 'stone', 'smithy-active', 'smithy-inactive', 'castle-inactive', 'castle-active']) {
            this.load.image(`labor-unit-${name}`, `images/scenes/MainScene/advanced-labor/labor-unit-${name}.png`);
        }
        this.load.json('labor-dos-workers', 'images/scenes/MainScene/advanced-labor/labor-dos-workers.json');
        for (const name of ['farm', 'wood', 'quarry', 'smithy']) {
            this.load.image(`labor-patch-${name}`, `images/scenes/MainScene/advanced-labor/labor-patch-${name}.png`);
        }
        for (const name of ['iron', 'wood', 'quarry']) {
            this.load.image(`labor-site-${name}`, `images/scenes/MainScene/advanced-labor/labor-site-${name}.png`);
        }
        for (const name of ['grain', 'cattle', 'reclaim', 'castle', 'stone', 'iron', 'smithy', 'wood']) {
            this.load.image(`labor-icon-${name}`, `images/scenes/MainScene/advanced-labor/labor-icon-${name}.png`);
        }
        this.load.image('labor-worker-icon', 'images/scenes/MainScene/advanced-labor/labor-worker-icon.png');
            this.load.image('labor-close', 'images/scenes/MainScene/features/town-close.png');

        this.load.image('blacksmith-background', 'images/scenes/MainScene/blacksmith/background.png');
        for (const name of ['bow', 'pike', 'mace', 'crossbow', 'sword', 'knight']) {
            this.load.image(`blacksmith-${name}`, `images/scenes/MainScene/blacksmith/${name}.png`);
        }

        // bandeau haut original (PANELS 196-203 composées en bande 640×24,
        // biseau compris), texture parchemin continue (menus déroulants)
        // et blasons 13×16 des joueurs (PANELS 256-260)
        this.load.image('topbar', 'images/scenes/MainScene/features/topbar.png');
        this.load.image('parchment', 'images/scenes/MainScene/features/parchment.png');
        this.load.image('population-report-background', 'images/scenes/MainScene/features/population-report-background.png');
        this.load.image('happiness-report-background', 'images/scenes/MainScene/features/happiness-report-background.png');
        for (const c of ['red', 'yellow', 'black', 'purple', 'blue']) {
            this.load.image(`shield-top-${c}`, `images/scenes/MainScene/features/shield-top-${c}.png`);
        }

        // drapeaux des nobles (7 frames par couleur)
        for (const k of Object.values(FLAG_BY_SHIELD)) {
            for (let f = 0; f < 8; f++) {
                this.load.image(`flag-${k}-${f}`, `images/scenes/MainScene/features/flag-${k}-${f}.png`);
            }
        }

        // Carte jouée : fichier choisi dans Custom Game (registry
        // 'mapFile'), slot 0 (Angleterre) par défaut. Toutes les cartes
        // sont exportées en JSON par tools/export-maps.js et partagent les
        // mêmes planches de tuiles.
        const mapFile = this.registry.get('mapFile') || 'map00.json';
        const mapSlot = mapFile.match(/map(\d+)\.json$/i)?.[1] || '00';
        this.cache.json.remove('campaignMap');
        this.cache.json.remove('overviewMeta');
        if (this.textures.exists('overview-map')) {
            this.textures.remove('overview-map');
        }
        this.load.json('campaignMap', 'maps/campaign/data/' + mapFile);
        this.load.image('overview-map',
            `images/scenes/MainScene/overviews/overview-map${mapSlot}.png`);
        this.load.json('overviewMeta',
            `images/scenes/MainScene/overviews/overview-map${mapSlot}.json`);
    }

    create ()
    {
        // État de partie : créé à la première entrée dans la scène, retrouvé
        // dans le registry ensuite (il survit aux restart de changement de
        // saison et aux autres scènes).
        const startingNewGame = !this.registry.has('gameState');
        if (startingNewGame) {
            // réglages du Custom Game (nobles, couronnes) le cas échéant
            const gs = this.registry.get('gameSettings');
            const opts = gs
                ? {
                    nobles: NOBLE_COUNTS[gs.nobles],
                    crowns: CROWN_AMOUNTS[gs.crowns],
                    armyFood: gs.armyFood === 1,
                    advancedFarming: gs.advancedFarming === 1
                }
                : {};
            this.registry.set('gameState', new GameState(
                this.cache.json.get('campaignMap'),
                this.registry.get('playerShield') || 'purple',
                opts
            ));
        }
        this.state = this.registry.get('gameState');
        this.registry.set('opt-armyFood', !!this.state.armyFood);

        // expose le calendrier et le trésor aux autres scènes
        this.registry.set('year', this.state.year);
        this.registry.set('season', this.state.season);
        this.registry.set('crowns', this.state.player.crowns);

        // Monde : carte 64×64 en losanges 58×30 → (64+64)×29 = 3712 px de large,
        // (64+64)×15 = 1920 px de haut (+24 px de bandeau).
        this.worldWidth = 3712;
        this.worldHeight = 1944;
        this.cameras.main.setViewport(0, 0, 640, 480).setBounds(0, 0, this.worldWidth, this.worldHeight).setName('main');

        // le clic droit sert à fermer le panneau d'affectation des champs
        this.input.mouse.disableContextMenu();

        // Bitmap fonts and screenshot-extracted ration icons must stay crisp.
        // The overview map keeps the renderer's linear filtering at zoom 1.3.
        for (const key of [
            'lords2', 'lords2-small', 'lords2-big',
            ...['up', 'down', 'basket', 'fork', 'arrowl', 'arrowr', 'close',
                'figure', 'heart', 'cheese', 'cow', 'cowbig'].map(RATIONS_UI),
            'tax-panel-mask', 'tax-purse', 'tax-close'
        ]) {
            this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
        }

        this.buildMap();

        this.buildPanel();

        this.buildMiniMap();

        this.buildOverviewBanner();

        this.buildTopBar();

        this.buildFieldDialog();

        this.buildAdvancedLaborDialog();

        this.buildCastleDialog();

        this.buildTreasuryDialog();

        this.buildMerchantDialog();

        this.buildBlacksmithDialog();

        this.buildTaxDialog();

        this.buildPopulationDialog();

        this.buildHappinessDialog();

        this.buildRationsDialog();

        this.buildArmyDialog();

        this.buildHeraldDialog();

        this.refreshCountyPane();

        // Retrouve la caméra après un restart. Une nouvelle partie commence
        // sur la capitale du premier comté contrôlé, dans la partie visible
        // de la carte (hors panneau latéral).
        const saved = this.registry.get('camScroll');
        if (!startingNewGame && saved) {
            this.cameras.main.setScroll(saved.x, saved.y);
        } else {
            const home = Object.values(this.state.counties).find(county => county.owner === 0);
            if (home) {
                this.state.selectedCounty = home.id;
                this.centerCameraOnCounty(home);
                this.refreshCountyPane();
            } else {
                this.cameras.main.centerOn(this.worldWidth / 2, this.worldHeight / 2);
            }
        }

        // Debug : la touche S fait défiler les saisons pour valider
        // l'appariement saison → planche de tuiles.
        this.input.keyboard.on('keydown-S', () => {
            this.state.seasonIndex = (this.state.seasonIndex + 1) % 4;
            this.restartKeepingCamera();
        });

        // Sauvegarde (F5) / chargement (F8) — un seul emplacement pour
        // l'instant, dans le localStorage ; aussi accessibles par le menu
        // File du bandeau (emplacements multiples à venir).
        this.input.keyboard.on('keydown-F5', () => this.saveGame());
        this.input.keyboard.on('keydown-F8', () => this.loadGame());

        // réglage « Animations off » (menu Options) : survit aux restarts
        // de changement de saison
        if (this.registry.get('opt-animations') === false) { this.anims.pauseAll(); }

        // curseur original du jeu (CURSOR1.CUR copié dans public/cursors)
        this.input.setDefaultCursor('url(cursors/cursor1.cur), auto');
    }

    // Relance la scène (changement de saison → autres planches de tuiles)
    // sans perdre la position de la caméra.
    restartKeepingCamera () {
        this.registry.set('camScroll', {
            x: this.cameras.main.scrollX,
            y: this.cameras.main.scrollY
        });
        this.scene.restart();
    }

    doEndTurn () {
        this.state.endTurn();
        this.restartKeepingCamera();
    }

    parchmentPanel (w, h, key = `parchment-panel-${w}x${h}`) {
        if (!this.textures.exists(key)) {
            const tex = this.textures.createCanvas(key, w, h);
            const ctx = tex.context;
            const parchment = this.textures.get('parchment').getSourceImage();
            const mask = this.raggedParchmentMask(w, h);
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = ctx.createPattern(parchment, 'repeat');
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(mask, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            tex.refresh();
        }
        return this.add.image(0, 0, key).setOrigin(0);
    }

    parchmentEdgeProfile () {
        if (!this.parchmentEdges) {
            const source = this.textures.get('tax-panel-mask').getSourceImage();
            const canvas = document.createElement('canvas');
            canvas.width = source.width;
            canvas.height = source.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(source, 0, 0);
            const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const rows = [];
            const cols = [];

            for (let y = 0; y < canvas.height; y++) {
                let left = canvas.width;
                let right = -1;
                for (let x = 0; x < canvas.width; x++) {
                    if (pixels[(y * canvas.width + x) * 4 + 3] > 127) {
                        left = Math.min(left, x);
                        right = Math.max(right, x);
                    }
                }
                rows[y] = right >= left ? { left, right } : { left: 0, right: canvas.width - 1 };
            }

            for (let x = 0; x < canvas.width; x++) {
                let top = canvas.height;
                let bottom = -1;
                for (let y = 0; y < canvas.height; y++) {
                    if (pixels[(y * canvas.width + x) * 4 + 3] > 127) {
                        top = Math.min(top, y);
                        bottom = Math.max(bottom, y);
                    }
                }
                cols[x] = bottom >= top ? { top, bottom } : { top: 0, bottom: canvas.height - 1 };
            }

            this.parchmentEdges = { w: canvas.width, h: canvas.height, rows, cols };
        }
        return this.parchmentEdges;
    }

    raggedParchmentMask (w, h) {
        const edges = this.parchmentEdgeProfile();
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const mask = ctx.createImageData(w, h);
        const sideStart = 8;
        const sideSpan = edges.h - sideStart * 2;

        for (let y = 0; y < h; y++) {
            const sy = sideStart + (y % sideSpan);
            const row = edges.rows[sy];
            for (let x = 0; x < w; x++) {
                const col = edges.cols[x % edges.w];
                const rightInset = edges.w - 1 - row.right;
                const bottomInset = edges.h - 1 - col.bottom;
                if (x < row.left || x > w - 1 - rightInset || y < col.top || y > h - 1 - bottomInset) {
                    continue;
                }
                const i = (y * w + x) * 4;
                mask.data[i] = 255;
                mask.data[i + 1] = 255;
                mask.data[i + 2] = 255;
                mask.data[i + 3] = 255;
            }
        }

        ctx.putImageData(mask, 0, 0);
        return canvas;
    }

    taxPanel () {
        const key = 'tax-panel-source-mask';
        if (!this.textures.exists(key)) {
            const mask = this.textures.get('tax-panel-mask').getSourceImage();
            const w = mask.width;
            const h = mask.height;
            const tex = this.textures.createCanvas(key, w, h);
            const ctx = tex.context;
            const parchment = this.textures.get('parchment').getSourceImage();
            ctx.fillStyle = ctx.createPattern(parchment, 'repeat');
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(mask, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            tex.refresh();
        }
        return this.add.image(0, 0, key).setOrigin(0);
    }

    countyWorldPoint (county) {
        if (county.townX !== undefined && county.townY !== undefined) {
            return {
                x: 64 * 29 + (county.townX - county.townY) * 29,
                y: 24 + (county.townX + county.townY) * 15 - 15
            };
        }
        return {
            x: 64 * 29 + county.centroid.u * 29,
            y: 24 + county.centroid.r * 15
        };
    }

    centerCameraOnCounty (county) {
        const point = this.countyWorldPoint(county);
        const visibleCenterX = 478 / 2;
        const visibleCenterY = 24 + (480 - 24) / 2;
        this.cameras.main.setScroll(
            Phaser.Math.Clamp(point.x - visibleCenterX, 0, this.worldWidth - 640),
            Phaser.Math.Clamp(point.y - visibleCenterY, 0, this.worldHeight - 480)
        );
    }

    // Mini-carte stratégique du panneau latéral, comme l'original : la
    // silhouette 65×129 stockée en fin de slot dans L2_MAPS.DAT (6 = terre,
    // 22 = eau ; colonne = (x−y+64)/2, ligne = x+y — vérifié contre la couche
    // comté), doublée horizontalement (→ 130×129, ~1:1 dans le parchemin du
    // cadre), terre coloriée par propriétaire de comté, eau en mer sombre.
    // Un rectangle blanc suit la caméra principale (update()) et un clic
    // dans le cadre recentre la carte.
    /*
     * Mini-carte stratégique originale : la carte dessinée 128×128 de
     * MAP01.PL8 — texture olive à 4 niveaux avec liserés noirs entre
     * comtés, mer transparente (le cadre du panneau a sa propre texture
     * brune dessous). Les comtés possédés reçoivent leur couleur EN
     * SURIMPRESSION : chaque niveau de la rampe olive est remplacé par le
     * niveau correspondant de la rampe du propriétaire (rouge et gris
     * mesurés sur capture DOSBox ; jaune/violet/bleu extrapolés ❓). Le
     * comté sélectionné est cerné de blanc, comme dans l'original.
     */
    buildMiniMap () {
        const map = this.cache.json.get('campaignMap');
        this.buildMiniMapPixels(map);

        if (this.textures.exists('minimapTex')) {
            this.textures.remove('minimapTex');
        }
        this.miniCanvas = this.textures.createCanvas('minimapTex', 128, 128);

        this.miniView = { x: 2, y: 2, w: 128, h: 128 };
        this.miniSelected = null;
        this.redrawMiniMap();

        this.miniImage = this.add.image(this.miniView.x, this.miniView.y, 'minimapTex').setOrigin(0);
        this.panel.add(this.miniImage);

        // rectangle caméra : indicateur symbolique comme le DOS (taille ❓),
        // positionné par la transformation affine ajustée sur les
        // centroïdes des comtés (la carte étant un dessin, il n'y a pas de
        // projection exacte)
        this.miniRect = this.add.rectangle(0, 0, 21, 16)
            .setOrigin(0)
            .setFillStyle(0, 0)
            .setStrokeStyle(1, 0xffffff);
        this.panel.add(this.miniRect);

        // Colonne de boutons (dessinés dans le cadre à (133,8), vérifié par
        // template-matching) : ouvriers oisifs / rations / bonheur = calques
        // colorés, loupe = carte d'ensemble. En mode calque la jauge légende
        // recouvre la colonne (la flèche du bas en sort) et l'icône du
        // calque actif s'affiche en haut à gauche de la carte.
        this.miniOverlay = null;
        this.miniLegend = this.add.image(133, 8, 'minimap-legend').setOrigin(0).setVisible(false);
        this.panel.add(this.miniLegend);
        this.miniModeIcon = this.add.image(this.miniView.x + 1, this.miniView.y + 1, 'minimap-btn-happiness')
            .setOrigin(0).setVisible(false);
        this.panel.add(this.miniModeIcon);

        // clic sur un comté → sélection + centrage de la caméra sur son
        // centroïde (coordonnées écran : le panneau est fixe en (478,24))
        this.input.on('pointerdown', (pointer) => {
            if (this.dialogOpen()) { return; }

            // colonne de boutons / jauge
            const bx = pointer.x - 478 - 133;
            const by = pointer.y - 24 - 8;
            if (bx >= 0 && bx < 29 && by >= 0 && by < 123) {
                if (this.miniOverlay) { this.setMiniOverlay(null); return; }
                const k = Math.min(3, (by / 31) | 0);
                if (k === 3) { this.toggleOverview(); }
                else { this.setMiniOverlay(['workers', 'rations', 'happiness'][k]); }
                return;
            }

            const mx = (pointer.x - 478 - this.miniView.x) | 0;
            const my = (pointer.y - 24 - this.miniView.y) | 0;
            if (mx < 0 || my < 0 || mx >= 128 || my >= 128) { return; }
            const id = this.miniIds[(my * 128 + mx) * 4];
            const c = this.state.counties[id];
            if (!c) { return; }
            this.state.selectedCounty = id;
            this.refreshCountyPane();
            this.centerCameraOnCounty(c);
        });
    }

    // Convertit la silhouette 65×129 incluse dans chaque slot de
    // L2_MAPS.DAT en texture 128×128 et en ids de comté cliquables.
    buildMiniMapPixels (map) {
        const W = map.width;
        const H = map.height;
        const county = map.layers.county;
        const mask = map.minimap.data;
        const sourceW = 130;
        const sourceH = 129;
        const sourceIds = new Uint8Array(sourceW * sourceH);
        const ids = new Uint8ClampedArray(128 * 128 * 4);
        const tex = new Uint8ClampedArray(128 * 128 * 4);
        const OLIVE = [[61, 69, 36], [101, 113, 61], [146, 158, 85], [194, 202, 113]];
        const valid = (x, y) => x >= 0 && y >= 0 && x < W && y < H
            && county[y * W + x] > 0 && county[y * W + x] <= MAX_COUNTY_ID;

        const countyAt = (u, r) => {
            // Les deux axes miniatures sont u=x-y+64 et r=x+y.
            let x = Math.round((r + u - 64) / 2);
            let y = Math.round((r - u + 64) / 2);
            if (valid(x, y)) { return county[y * W + x]; }
            for (let d = 1; d <= 3; d++) {
                for (let dy = -d; dy <= d; dy++) {
                    for (let dx = -d; dx <= d; dx++) {
                        if (valid(x + dx, y + dy)) {
                            return county[(y + dy) * W + x + dx];
                        }
                    }
                }
            }
            return 0;
        };

        let minX = sourceW;
        let minY = sourceH;
        let maxX = 0;
        let maxY = 0;
        for (let y = 0; y < sourceH; y++) {
            for (let x = 0; x < sourceW; x++) {
                if (mask[y * 65 + (x >> 1)] !== 6) { continue; }
                const id = countyAt(x, y);
                if (!id) { continue; }
                sourceIds[y * sourceW + x] = id;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }

        const margin = 4;
        const scaleX = (128 - margin * 2) / Math.max(1, maxX - minX + 1);
        const scaleY = (128 - margin * 2) / Math.max(1, maxY - minY + 1);
        const drawW = (maxX - minX + 1) * scaleX;
        const drawH = (maxY - minY + 1) * scaleY;
        const offsetX = Math.round((128 - drawW) / 2);
        const offsetY = Math.round((128 - drawH) / 2);
        this.miniProjection = { minX, minY, scaleX, scaleY, offsetX, offsetY };

        const textureLevel = (x, y, id) => {
            let h = Math.imul(x + id * 17, 374761393) + Math.imul(y + id * 7, 668265263);
            h = Math.imul(h ^ (h >>> 13), 1274126177);
            return [1, 2, 2, 3, 2, 1, 2, 2][(h >>> 16) & 7];
        };

        for (let y = Math.max(0, offsetY); y < Math.min(128, Math.ceil(offsetY + drawH)); y++) {
            for (let x = Math.max(0, offsetX); x < Math.min(128, Math.ceil(offsetX + drawW)); x++) {
                const sx = Math.min(maxX, minX + Math.floor((x - offsetX) / scaleX));
                const sy = Math.min(maxY, minY + Math.floor((y - offsetY) / scaleY));
                const id = sourceIds[sy * sourceW + sx];
                if (!id) { continue; }
                const i = (y * 128 + x) * 4;
                const rgb = OLIVE[textureLevel(x, y, id)];
                ids[i] = id;
                ids[i + 3] = 255;
                tex[i] = rgb[0];
                tex[i + 1] = rgb[1];
                tex[i + 2] = rgb[2];
                tex[i + 3] = 255;
            }
        }
        this.miniIds = ids;
        this.miniTexPixels = tex;
    }

    /*
     * Carte d'ensemble (bouton loupe) : affiche l'image précalculée
     * (printemps, mer jusqu'aux bords — la caméra et l'interface ne
     * bougent pas), les drapeaux de faction des villes et des armées
     * par-dessus, et le bandeau parchemin en bas. Un clic sélectionne le
     * comté visé et y recentre la vue normale. Conforme aux captures DOS.
     */
    toggleOverview (focus) {
        if (this.overviewMode) {
            this.overviewMode = false;
            for (const o of this.overviewObjects) { o.destroy(); }
            this.overviewObjects = [];
            this.overviewBanner.setVisible(false);
            this.miniRect.setVisible(true);
            if (focus) { this.cameras.main.centerOn(focus.x, focus.y); }
            return;
        }
        this.overviewMode = true;
        const meta = this.cache.json.get('overviewMeta');
        // échelles PAR AXE : les tuiles miniatures natives (10×6) n'ont pas
        // le même rapport largeur/hauteur que les 58×30 de la carte
        const kX = meta.scaleX || meta.scale;
        const kY = meta.scaleY || meta.scale;
        const zoom = 1.3;
        const viewW = 478;
        const viewH = 400;
        const cropX = 55;
        const cropY = 70;
        const toImg = (wx, wy) => [
            ((wx - meta.worldX0) * kX - cropX) * zoom,
            24 + ((wy - meta.worldY0) * kY - cropY) * zoom
        ];

        const maskShape = this.add.graphics().setScrollFactor(0);
        maskShape.fillStyle(0xffffff).fillRect(0, 24, viewW, viewH);
        const overviewMask = maskShape.createGeometryMask();
        const img = this.add.image(-cropX * zoom, 24 - cropY * zoom, 'overview-map')
            .setOrigin(0)
            .setScale(zoom)
            .setScrollFactor(0)
            .setDepth(90)
            .setMask(overviewMask);
        this.overviewObjects = [img];

        // drapeaux : villes possédées et armées en campagne (taille réelle,
        // comme le DOS)
        const addFlag = (wx, wy, shield) => {
            const k = FLAG_BY_SHIELD[shield];
            if (k === undefined) { return; }
            const [ix, iy] = toImg(wx, wy);
            const flag = this.add.image(ix, iy, `flag-${k}-0`)
                .setOrigin(0.5, 1)
                .setScrollFactor(0)
                .setDepth(91)
                .setMask(overviewMask);
            this.overviewObjects.push(flag);
        };
        for (const t of this.features.towns) {
            const shield = this.state.ownerShield(t.county);
            if (shield) { addFlag(64 * 29 + (t.x - t.y) * 29, (t.x + t.y) * 15, shield); }
        }
        for (const a of this.state.armies) {
            const c = this.state.counties[a.county];
            if (c && c.townX !== undefined) {
                addFlag(64 * 29 + (c.townX - c.townY) * 29 + 12, (c.townX + c.townY) * 15 + 8, this.state.nobles[a.owner].shield);
            }
        }
        this.overviewObjects.push(overviewMask, maskShape);

        // clic : comté visé → sélection + retour à la vue normale dessus
        img.setInteractive();
        img.on('pointerdown', (pointer) => {
            if (pointer.x < 0 || pointer.x >= viewW || pointer.y < 24 || pointer.y >= 24 + viewH) {
                return;
            }
            const sourceX = cropX + pointer.x / zoom;
            const sourceY = cropY + (pointer.y - 24) / zoom;
            const wx = meta.worldX0 + sourceX / kX;
            const wy = meta.worldY0 + sourceY / kY;
            const u = (wx - 64 * 29) / 29;
            const r = wy / 15;
            const tx = Math.round((r + u) / 2);
            const ty = Math.round((r - u) / 2);
            const data = this.cache.json.get('campaignMap');
            if (tx >= 0 && ty >= 0 && tx < data.width && ty < data.width) {
                const id = data.layers.county[ty * data.width + tx];
                if (this.state.counties[id]) {
                    this.state.selectedCounty = id;
                    this.refreshCountyPane();
                }
            }
            this.toggleOverview({ x: wx, y: wy });
        });

        this.overviewTitle.setText(t('campaign.overview.title', { map: this.state.mapName, year: this.state.year }));
        this.tintTitleCapitals(this.overviewTitle);
        this.overviewBanner.setVisible(true);
        this.miniRect.setVisible(false);
    }

    // Bandeau parchemin du bas de la carte d'ensemble (libellés anglais ❓,
    // le DOS français écrit « Angleterre  An  Ap. J.-C. 1268 ») : liseré
    // sombre encadrant le parchemin et CAPITALES ROUGES comme l'original.
    buildOverviewBanner () {
        const w = 478;
        const h = 56; // padding haut/bas autour des deux lignes
        const bg = this.add.tileSprite(0, 0, w, h, 'parchment').setOrigin(0);
        const frame = this.add.rectangle(1, 1, w - 2, h - 2, 0, 0).setOrigin(0).setStrokeStyle(2, 0x2a1c0c);
        const top = this.add.rectangle(0, 0, w, 1, 0x51492f).setOrigin(0);
        this.overviewTitle = this.add.bitmapText(w / 2, 7, 'lords2-big', '').setOrigin(0.5, 0).setTint(0x1c1208);
        this.overviewSub = this.add.bitmapText(w / 2, 37, 'lords2-small', t('campaign.overview.sub')).setOrigin(0.5, 0).setTint(0x2a1c0c);
        this.overviewBanner = this.add.container(0, 480 - h, [bg, frame, top, this.overviewTitle, this.overviewSub])
            .setScrollFactor(0).setDepth(130).setVisible(false);
    }

    // Capitales rouges du titre (la première lettre de chaque mot), le
    // reste en noir — comme le bandeau du DOS.
    tintTitleCapitals (txt) {
        if (!txt.setCharacterTint) { return; }
        txt.setCharacterTint(0, -1, false, 0x1c1208);
        const s = txt.text;
        for (let i = 0; i < s.length; i++) {
            if (s[i] !== ' ' && (i === 0 || s[i - 1] === ' ')) {
                txt.setCharacterTint(i, 1, false, 0xa01010);
            }
        }
    }

    // Active/désactive un calque de la mini-carte (null = mode normal).
    setMiniOverlay (mode) {
        this.miniOverlay = mode;
        this.miniLegend.setVisible(!!mode);
        this.miniModeIcon.setVisible(!!mode);
        if (mode) { this.miniModeIcon.setTexture(`minimap-btn-${mode}`); }
        this.redrawMiniMap();
    }

    // Niveau 0 (violet, le meilleur) → 5 (rouge) d'un comté pour le calque
    // actif — seuils ❓ à calibrer en jeu (l'aide ne chiffre pas).
    overlayLevel (c, mode) {
        if (mode === 'happiness') {
            const h = c.happiness;
            return h >= 90 ? 0 : h >= 75 ? 1 : h >= 55 ? 2 : h >= 40 ? 3 : h >= 25 ? 4 : 5;
        }
        if (mode === 'rations') {
            return { Triple: 0, Double: 1, Normal: 2, Half: 4, Quarter: 5 }[c.ration];
        }
        // ouvriers : couverture en main-d'œuvre (oisifs = haut de l'échelle)
        const w = this.state.workerCoverage(c);
        return w >= 1.5 ? 0 : w >= 1.2 ? 1 : w >= 1 ? 2 : w >= 0.85 ? 3 : w >= 0.7 ? 4 : 5;
    }

    // Recompose les pixels de la mini-carte (texture + surimpressions +
    // liseré blanc du comté sélectionné). Appelée à la construction et à
    // chaque changement de sélection.
    redrawMiniMap () {
        const LEVELS = { '61,69,36': 0, '101,113,61': 1, '146,158,85': 2, '194,202,113': 3 };
        const RAMPS = {
            red: [[130, 0, 0], [170, 0, 0], [215, 0, 0], [255, 0, 0]],
            black: [[56, 56, 56], [77, 77, 77], [105, 105, 105], [130, 130, 130]],
            yellow: [[130, 130, 0], [170, 170, 0], [215, 215, 0], [255, 255, 0]],
            purple: [[130, 0, 130], [170, 0, 170], [215, 0, 215], [255, 0, 255]],
            blue: [[0, 0, 130], [0, 0, 170], [0, 0, 215], [0, 0, 255]]
        };
        // échelle des calques, relevée sur la jauge MISC_CTY 91 (✓ violet =
        // le meilleur → ✗ rouge = le pire) ; bleu clair = « normal »
        const SCALE_COLORS = [[130, 0, 130], [0, 89, 255], [166, 202, 243], [219, 219, 0], [227, 174, 81], [215, 0, 0]];
        const sel = this.state.selectedCounty;
        this.miniSelected = sel;
        const overlay = this.miniOverlay;

        // en mode calque : couleur par valeur pour les comtés DU JOUEUR
        // (l'aide : « for each county you control »)
        const fills = {};
        if (overlay) {
            for (const c of Object.values(this.state.counties)) {
                if (c.owner === 0) { fills[c.id] = SCALE_COLORS[this.overlayLevel(c, overlay)]; }
            }
        }

        const ids = this.miniIds;
        const tex = this.miniTexPixels;
        const ctx = this.miniCanvas.getContext();
        const img = ctx.createImageData(128, 128);
        const countyAt = (x, y) => {
            if (x < 0 || y < 0 || x >= 128 || y >= 128) { return 0; }
            return ids[(y * 128 + x) * 4];
        };
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                const i = (y * 128 + x) * 4;
                const id = ids[i];

                if (!id) {
                    let nearLand = false;
                    for (let dy = -1; dy <= 1 && !nearLand; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if ((dx || dy) && countyAt(x + dx, y + dy)) {
                                nearLand = true;
                                break;
                            }
                        }
                    }
                    if (nearLand) {
                        // Contour côtier extérieur : le voisinage diagonal
                        // comble les marches trop sèches sans rogner la terre.
                        img.data[i] = 38;
                        img.data[i + 1] = 42;
                        img.data[i + 2] = 24;
                        img.data[i + 3] = 255;
                        continue;
                    }

                    // Seconde passe de relief, uniquement en bas/droite du
                    // contour : une ombre discrète de 1 px supplémentaire.
                    let nearCoast = false;
                    for (let d = 1; d <= 2 && !nearCoast; d++) {
                        nearCoast = !!countyAt(x, y - d) || !!countyAt(x - d, y);
                    }
                    if (nearCoast) {
                        img.data[i] = 35;
                        img.data[i + 1] = 31;
                        img.data[i + 2] = 18;
                        img.data[i + 3] = 150;
                    }
                    continue;
                }

                if (tex[i + 3] === 0) { continue; } // mer : transparent

                let rgb = [tex[i], tex[i + 1], tex[i + 2]];
                const neighbours = [
                    countyAt(x - 1, y),
                    countyAt(x + 1, y),
                    countyAt(x, y - 1),
                    countyAt(x, y + 1)
                ];
                // Le littoral est maintenant entièrement à l'extérieur ;
                // le trait intérieur ne sert qu'aux frontières de comtés.
                const countyBorder = neighbours.some(n => n && n !== id);
                const selectedBorder = id === sel && neighbours.some(n => n !== id);
                if (fills[id]) {
                    rgb = fills[id]; // calque : aplat de la valeur
                } else {
                    const shield = this.state.ownerShield(id);
                    if (shield) {
                        const level = LEVELS[rgb[0] + ',' + rgb[1] + ',' + rgb[2]];
                        if (level !== undefined) { rgb = RAMPS[shield][level]; }
                    }
                }
                if (countyBorder || selectedBorder) {
                    // La sélection remplace le trait intérieur du comté,
                    // elle n'est plus dessinée à l'extérieur du contour.
                    rgb = selectedBorder ? [255, 255, 255] : [45, 50, 28];
                }
                img.data[i] = rgb[0];
                img.data[i + 1] = rgb[1];
                img.data[i + 2] = rgb[2];
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        this.miniCanvas.refresh();
    }

    update () {
        if (!this.miniRect) { return; }

        // sélection changée ailleurs (clic carte…) → recompose le liseré
        if (this.miniSelected !== this.state.selectedCounty) { this.redrawMiniMap(); }

        if (this.overviewMode) { return; } // pas de rectangle caméra en dézoom

        // centre de la caméra → tuile → axes natifs de la silhouette
        // stratégique stockée dans L2_MAPS.DAT.
        const cam = this.cameras.main;
        const u = (cam.scrollX + cam.width / 2 - 64 * 29) / 29;
        const r = (cam.scrollY + cam.height / 2 - 24) / 15;
        const tx = (r + u) / 2;
        const ty = (r - u) / 2;
        const p = this.miniProjection;
        const px = p.offsetX + (tx - ty + 64 - p.minX) * p.scaleX;
        const py = p.offsetY + (tx + ty - p.minY) * p.scaleY;
        this.miniRect.x = Phaser.Math.Clamp(this.miniView.x + px - this.miniRect.width / 2, this.miniView.x, this.miniView.x + this.miniView.w - this.miniRect.width);
        this.miniRect.y = Phaser.Math.Clamp(this.miniView.y + py - this.miniRect.height / 2, this.miniView.y, this.miniView.y + this.miniView.h - this.miniRect.height);
    }

    // Bandeau haut original (menu bar) : parchemin PANELS 196-203 (biseau
    // compris), menus déroulants File/Options/Help, blasons des joueurs
    // encore en lice, année/saison et trésor. Positions mesurées sur
    // capture DOSBox : File@10, Options@108, Help@209, blason 13×16 @270,
    // année@364, saison@413, couronnes alignées à droite sur 628 ; textes
    // en FNTL2_14 (lords2), le titre du menu ouvert s'inverse en noir.
    buildTopBar () {
        const black = 0x1c1208;
        const lit = 0xe7cf86; // texte du titre inversé (parchemin clair)
        const children = [this.add.image(0, 0, 'topbar').setOrigin(0)];

        // un blason par joueur : l'aide les affiche tant que le joueur n'a
        // pas fini son tour ; en solo l'IA joue pendant la fin de tour, les
        // blasons restent donc visibles tout le tour
        this.state.nobles.forEach((n, i) => {
            if (n.eliminated) { return; }
            children.push(this.add.image(270 + i * 17, 4, `shield-top-${n.shield}`).setOrigin(0));
        });

        this.yearText = this.add.bitmapText(364, 5, 'lords2', String(this.state.year)).setTint(black);
        this.seasonText = this.add.bitmapText(413, 5, 'lords2', tSeason(this.state.season)).setTint(black);
        this.crownsText = this.add.bitmapText(628, 5, 'lords2', t('campaign.crowns', { n: this.state.player.crowns })).setOrigin(1, 0).setTint(black);
        children.push(this.yearText, this.seasonText, this.crownsText);

        // Menus déroulants, contenu d'après l'aide officielle (File menu /
        // Options menu). Game Speed, Scroll Speed et l'aide en ligne
        // demandent leurs panneaux parchemin dédiés — encore inactifs.
        const MENUS = [
            { label: t('campaign.menu.file'), x: 10, items: [
                { label: t('campaign.menu.newGame'), action: () => {
                    for (const key of ['gameState', 'camScroll', 'mapFile', 'gameSettings', 'playerName', 'playerShield', 'newGameMode']) {
                        this.registry.remove(key);
                    }
                    this.cache.json.remove('campaignMap');
                    this.cache.json.remove('overviewMeta');
                    if (this.textures.exists('overview-map')) { this.textures.remove('overview-map'); }
                    this.scene.start('MainMenu');
                } },
                { label: t('campaign.menu.loadGame'), action: () => this.loadGame() },
                { label: t('campaign.menu.saveGame'), action: () => this.saveGame() },
                { label: t('campaign.menu.exit'), action: () => window.close() }
            ] },
            { label: t('campaign.menu.options'), x: 108, items: [
                { label: t('campaign.menu.sound'), toggle: 'opt-sound' },
                { label: t('campaign.menu.animations'), toggle: 'opt-animations' },
                { label: t('campaign.menu.armyFood'), toggle: 'opt-armyFood' },
                { label: t('campaign.menu.fullScreen'), action: () => this.scale.toggleFullscreen() },
                { label: t('campaign.menu.gameSpeed'), disabled: true },
                { label: t('campaign.menu.scrollSpeed'), disabled: true }
            ] },
            { label: t('campaign.menu.help'), x: 209, items: [
                { label: t('campaign.menu.contents'), disabled: true }
            ] }
        ];

        const itemH = 17;
        this.menus = MENUS.map(m => {
            // surlignage noir du titre quand son menu est déroulé (le
            // biseau du bandeau reste visible : rangées 1 à 22)
            const hilite = this.add.rectangle(m.x - 6, 1, 12, 22, 0x000000).setOrigin(0).setVisible(false);
            const title = this.add.bitmapText(m.x, 5, 'lords2', m.label).setTint(black);
            hilite.width = title.width + 12;
            children.push(hilite, title);

            // panneau : parchemin continu, fin liseré sombre, items en
            // gothique 14 comme le DOS (largeur ajustée au contenu)
            const itemObjs = m.items.map((it, k) => {
                const t = this.add.bitmapText(8, 6 + k * itemH, 'lords2', it.label).setTint(it.disabled ? 0x8a7a58 : black);
                return { it, t, y0: 4 + k * itemH, y1: 4 + (k + 1) * itemH };
            });
            const w = Math.max(...itemObjs.map(o => o.t.width + 40), 96);
            const h = m.items.length * itemH + 10;
            const bg = this.add.tileSprite(0, 0, w, h, 'parchment').setOrigin(0);
            const edge = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0).setStrokeStyle(1, 0x1c1208);
            const shadow = this.add.rectangle(0, h - 1, w, 1, 0x51492f).setOrigin(0);
            const panel = this.add.container(m.x - 6, 24, [bg, edge, shadow, ...itemObjs.map(o => o.t)])
                .setScrollFactor(0).setDepth(140).setVisible(false);
            return { panel, hilite, title, itemObjs, w, zone: { x0: m.x - 6, x1: m.x + title.width + 6 } };
        });

        this.topBar = this.add.container(0, 0, children).setScrollFactor(0).setDepth(100);

        const closeAll = () => this.menus.forEach(m => {
            m.panel.setVisible(false);
            m.hilite.setVisible(false);
            m.title.setTint(black);
        });

        this.input.on('pointerdown', (pointer) => {
            const open = this.menus.find(m => m.panel.visible);

            // clic sur un titre du bandeau : ouvre/ferme son menu
            if (pointer.y < 24) {
                const hit = this.menus.find(m => pointer.x >= m.zone.x0 && pointer.x < m.zone.x1);
                if (hit) {
                    closeAll();
                    if (hit !== open) {
                        this.refreshMenuItems(hit);
                        hit.panel.setVisible(true);
                        hit.hilite.setVisible(true);
                        hit.title.setTint(lit);
                    }
                    return;
                }
            }
            if (!open) { return; }

            // clic dans le menu ouvert : exécute l'élément ; ailleurs : ferme
            const lx = pointer.x - open.panel.x;
            const ly = pointer.y - open.panel.y;
            if (lx >= 0 && lx < open.w) {
                const o = open.itemObjs.find(o => ly >= o.y0 && ly < o.y1);
                if (o && !o.it.disabled) { this.runMenuItem(o.it); }
            }
            closeAll();
        });
    }

    // Les bascules affichent leur état (on/off) au moment de l'ouverture.
    refreshMenuItems (menu) {
        for (const o of menu.itemObjs) {
            if (!o.it.toggle) { continue; }
            o.t.setText(o.it.label + (this.registry.get(o.it.toggle) === false ? t('campaign.menu.off') : t('campaign.menu.on')));
        }
    }

    runMenuItem (it) {
        if (it.toggle) {
            const next = this.registry.get(it.toggle) === false;
            this.registry.set(it.toggle, next);
            if (it.toggle === 'opt-animations') {
                if (next) { this.anims.resumeAll(); } else { this.anims.pauseAll(); }
            } else if (it.toggle === 'opt-armyFood') {
                this.state.armyFood = next;
            }
            return;
        }
        if (it.action) { it.action(); }
    }

    menuOpen () {
        return !!(this.menus && this.menus.some(m => m.panel.visible));
    }

    saveGame () {
        window.localStorage.setItem('openlotr2-save', this.state.serialize());
    }

    loadGame () {
        const json = window.localStorage.getItem('openlotr2-save');
        if (!json) { return; }
        this.registry.set('gameState', GameState.restore(
            this.cache.json.get('campaignMap'),
            json,
            this.registry.get('playerShield') || 'purple'
        ));
        this.restartKeepingCamera();
    }

    buildPanel () {

        this.miniMap = this.add.tileSprite(0, 0, 0, 0, 'MiscCityAtlas', 'miniMap').setOrigin(0);
        this.peoplePane = this.add.tileSprite(0, 132, 0, 0, 'MiscCityAtlas', 'peoplePane').setOrigin(0);



        // jauge de santé du comté sélectionné — la frame (healthBest …
        // healthWorst) est choisie dans refreshCountyPane()
        this.healthGauge = this.add.tileSprite(81, 187, 0, 0, 'MiscCityAtlas', 'healthBest');

        this.labourPane = this.add.tileSprite(81, 316, 0, 0, 'MiscCityAtlas', 'labourPane');

        this.labourGauge = this.add.tileSprite(84, (295-(33/2))-24, 0, 0, 'MiscCityAtlas', 'labourGauge');
        this.labourGaugeLess = this.add.tileSprite(84, (295-(33/2))-24, 0, 0, 'MiscCityAtlas', 'labourGaugeLess');

        // icônes vache et blé : la frame bascule sur les variantes Less
        // (liseré rouge = manque d'ouvriers) / More (liseré bleu = ouvriers
        // oisifs) dans refreshCountyPane()
        this.labourCow = this.add.tileSprite((521-(37/2))-478, (332-(24/2))-24, 0, 0, 'MiscCityAtlas', 'labourCow');
        this.labourWheat = this.add.tileSprite((522-(36/2))-478, (390-(27/2))-24, 0, 0, 'MiscCityAtlas', 'labourWheat');





        this.labourLumber = this.add.tileSprite((632-(37/2))-478, (331-(22/2))-24, 0, 0, 'MiscCityAtlas', 'labourLumber');

        this.labourStone = this.add.tileSprite((632-(33/2))-478, (331-(22/2))-24, 0, 0, 'MiscCityAtlas', 'labourStone');
        this.labourIron = this.add.tileSprite((632-(25/2))-478, (331-(29/2))-24, 0, 0, 'MiscCityAtlas', 'labourIron');

        this.labourCastle = this.add.tileSprite((625-(25/2))-478, (396-(29/2))-24, 0, 0, 'MiscCityAtlas', 'labourCastle');
        this.labourCastleLess = this.add.tileSprite((625-(25/2))-478, (396-(29/2))-24, 0, 0, 'MiscCityAtlas', 'labourCastleLess');

        this.actionButtons = this.add.tileSprite((640-(162/2))-478, (480-(30/2)-20)-24, 0, 0, 'MiscCityAtlas', 'actionButtons');


        // Textes du panneau « peuple » (cadre peoplePane 162×94 en (0,132) :
        // bandeau de titre, boîte gauche personnage/impôt, jauge centrale,
        // boîte droite cœur/ration), remplis par refreshCountyPane().
        const paneFont = {
            fontFamily: 'Arial',
            fontSize: '13px',
            color: '#100c08',
            align: 'center'
        };
        this.countyNameText = this.add.bitmapText(81, 142, 'lords2', '')
            .setOrigin(0.5, 0)
            .setTint(0x1c1208);
        this.popText = this.add.text(44, 170, '', paneFont).setOrigin(0.5);
        this.healthText = this.add.text(136, 170, '', paneFont).setOrigin(0.5);
        this.taxText = this.add.text(36, 199, '', paneFont).setOrigin(0.5).setLineSpacing(-4);
        this.rationText = this.add.text(122, 199, '', paneFont).setOrigin(0.5).setLineSpacing(-4);

        // stocks du comté dans le panneau ressources (sous la vache et le
        // blé) + bilans de la saison passée (nombres verts/rouges, comme
        // les +10/+66 de l'original)
        this.cowsText = this.add.text(24, 320, '', paneFont).setOrigin(0.5);
        this.grainText = this.add.text(26, 376, '', paneFont).setOrigin(0.5);
        this.cowsDeltaShadow = this.add.bitmapText(47, 297, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_SHADOW);
        this.cowsDeltaText = this.add.bitmapText(46, 296, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_GREEN);
        this.grainDeltaShadow = this.add.bitmapText(49, 353, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_SHADOW);
        this.grainDeltaText = this.add.bitmapText(48, 352, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_GREEN);
        this.industryDeltaShadows = {
            wood: this.add.bitmapText(83, 297, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_SHADOW),
            stone: this.add.bitmapText(83, 323, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_SHADOW),
            iron: this.add.bitmapText(83, 349, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_SHADOW),
            smithy: this.add.bitmapText(83, 381, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_SHADOW)
        };
        this.industryDeltaTexts = {
            wood: this.add.bitmapText(82, 296, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_GREEN),
            stone: this.add.bitmapText(82, 322, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_GREEN),
            iron: this.add.bitmapText(82, 348, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_GREEN),
            smithy: this.add.bitmapText(82, 380, 'lords2-small', '').setOrigin(0, 0.5).setTint(DOS_DELTA_GREEN),
            castle: this.add.text(110, 398, '', { font: `12px ${FONT_FAMILY}`, fill: '#101008', stroke: '#d8bc7e', strokeThickness: 2 }).setOrigin(1, 0.5)
        };
        this.labourSmithyWeapon = this.add.text(134, 380, '', {
            font: `12px ${FONT_FAMILY}`,
            fill: '#101008',
            stroke: '#d8bc7e',
            strokeThickness: 2
        }).setOrigin(0.5).setVisible(false);

        // Comté étranger : tant qu'on n'est pas maître du comté, le panneau
        // ne montre AUCUNE info (vérifié sur capture DOS) — juste le nom,
        // l'éventuel seigneur des lieux, et le château sous un ciel d'orage
        // (MISC_CTY 58). Libellé anglais ❓ (le DOS français écrit
        // « Propriétaire des terres : … »).
        this.foreignPane = this.add.image(0, 132, 'county-foreign').setOrigin(0).setVisible(false);
        this.foreignName = this.add.bitmapText(81, 140, 'lords2', '').setOrigin(0.5, 0).setTint(0x10100c).setVisible(false);
        this.foreignOwner = this.add.bitmapText(81, 196, 'lords2', '').setOrigin(0.5, 0).setTint(0x10100c).setVisible(false);

        this.endTurn = this.add.tileSprite(0, (480-24), 0, 0, 'MiscCityAtlas', 'endTurn').setOrigin(0,1);

        // Clics du panneau latéral, en coordonnées écran (panneau fixe en
        // (478,24)) : « Fin de tour » en bas, et les boîtes impôt / ration
        // du panneau peuple (clic gauche = augmenter, droit = diminuer —
        // en attendant les vrais panneaux de réglage de l'original).
        this.input.on('pointerdown', (pointer) => {
            if (this.dialogOpen()) { return; }
            if (pointer.x >= 478 && pointer.y >= 480 - 20) { this.doEndTurn(); return; }

            const px = pointer.x - 478;
            const py = pointer.y - 24;
            const c = this.state.counties[this.state.selectedCounty];
            if (!c || px < 0) { return; }

            // les réglages n'existent que sur ses propres comtés (le
            // panneau étranger ne montre que le château sous l'orage)
            if (c.owner !== 0 && py >= 132 && py < 406) { return; }

            if (py >= 244 && py < 272 && px >= LABOR_SLIDER.minX - 16 && px <= LABOR_SLIDER.maxX + 16) {
                this.draggingLaborSlider = true;
                this.applyLaborSliderPointer(pointer);
            } else if (px >= 8 && px < 72 && py >= 148 && py < 186) {
                this.openPopulationDialog();
            } else if (px >= 90 && px < 156 && py >= 148 && py < 186) {
                this.openHappinessDialog();
            } else if (px >= 8 && px < 72 && py >= 186 && py < 226) {
                this.openTaxDialog();
            } else if (px >= 92 && px < 152 && py >= 186 && py < 226) {
                // « Click directly on the ration display […] to access the
                // rations panel » (aide) — l'écran remplace le cycle direct
                this.openRationsDialog();
            } else if (py >= 406 && py < 436 && px >= 0 && px < 162) {
                // barre d'actions (6 boutons de 27 px) — ordre de la spec :
                // château, armée, ravitaillement, trésorerie, diplomatie,
                // marchand (provisoire pour les non implémentés)
                const btn = Math.floor(px / 27);
                if (btn === 0) { this.openCastleDialog(this.state.selectedCounty); }
                else if (btn === 1) { this.openArmyDialog(); }
                else if (btn === 3) { this.openTreasuryDialog(); }
                else if (btn === 5) { this.openMerchantDialog(); }
            }
        });
        this.input.on('pointermove', (pointer) => {
            if (this.draggingLaborSlider) { this.applyLaborSliderPointer(pointer); }
        });
        this.input.on('pointerup', () => { this.draggingLaborSlider = false; });

            this.panel = this.add.container(478, 24, [
                this.miniMap,
                this.peoplePane,
                this.healthGauge,
                this.labourPane,
                this.labourGauge,
                this.labourGaugeLess,
                this.labourCow,
                this.labourWheat,
                this.labourLumber,
                this.labourStone,
                this.labourIron,
                this.labourCastle,
                this.labourCastleLess,

                this.foreignPane,
                this.foreignName,
                this.foreignOwner,
                this.actionButtons,
                this.endTurn,
                this.countyNameText,
                this.popText,
                this.healthText,
                this.taxText,
                this.rationText,
                this.cowsText,
                this.grainText,
                this.cowsDeltaShadow,
                this.cowsDeltaText,
                this.grainDeltaShadow,
                this.grainDeltaText,
                this.labourSmithyWeapon,
                ...Object.values(this.industryDeltaShadows),
                ...Object.values(this.industryDeltaTexts)
                ]).setScrollFactor(0);

        }

        applyLaborSliderPointer (pointer)
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c || c.owner !== 0) { return; }
            const px = pointer.x - 478;
            const tpos = Phaser.Math.Clamp((px - LABOR_SLIDER.minX) / (LABOR_SLIDER.maxX - LABOR_SLIDER.minX), 0, 1);
            this.state.setLaborFoodShare(c.id, 1 - tpos);
            this.refreshCountyPane();
        }

        // Rafraîchit les panneaux avec le comté sélectionné : nom,
        // population, impôt, ration, bonheur (le chiffre au cœur), santé
        // (la jauge, 5 niveaux) et stocks (vaches, sacs de blé).
        setMiscCityFrame (obj, frameName)
        {
            obj.setFrame(frameName);
            const frame = this.textures.getFrame('MiscCityAtlas', frameName);
            if (frame && obj.setSize) {
                obj.setSize(frame.width, frame.height);
            }
            return obj;
        }

        refreshCountyPane () {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c) { return; }

            // comté étranger : les infos sont cachées tant qu'on n'est pas
            // maître des lieux — nom, seigneur éventuel, château sous
            // l'orage (les comtés neutres n'affichent pas de seigneur)
            const foreign = c.owner !== 0;
            const ownedUi = [
                this.peoplePane, this.healthGauge, this.labourPane,
                this.labourGauge, this.labourGaugeLess, this.labourCow,
                this.labourWheat, this.labourLumber, this.labourStone,
                this.labourIron, this.labourCastle,
                this.labourCastleLess, this.countyNameText, this.popText,
                this.healthText, this.taxText, this.rationText,
                this.cowsText, this.grainText, this.cowsDeltaShadow,
                this.cowsDeltaText, this.grainDeltaShadow, this.grainDeltaText,
                this.labourSmithyWeapon,
                ...Object.values(this.industryDeltaShadows),
                ...Object.values(this.industryDeltaTexts)
            ];
            for (const o of ownedUi) { o.setVisible(!foreign); }
            this.foreignPane.setVisible(foreign);
            this.foreignName.setVisible(foreign);
            this.foreignOwner.setVisible(foreign);
            if (foreign) {
                this.foreignName.setText(c.name);
                this.foreignOwner.setText(c.owner !== null
                    ? t('campaign.pane.foreignOwner', { shield: tShield(this.state.nobles[c.owner].shield) })
                    : '');
                return;
            }

            this.countyNameText.setText(c.name);
            this.popText.setText(String(c.population));
            this.healthText.setText(String(c.happiness));
            this.taxText.setText(t('campaign.pane.tax', { rate: c.taxRate }));
            this.rationText.setText(t('campaign.pane.ration', { ration: tRation(c.ration) }));
            this.healthGauge.setFrame(HEALTH_GAUGES[c.health]);

            this.cowsText.setText(String(c.cows));
            this.grainText.setText(String(c.grainStock));
            const forecast = this.state.previewCountyProduction(c);
            const hasCattle = c.cows > 0 || this.state.fieldsOf(c.id, 'cattle').length > 0;
            const hasGrain = c.grainStock > 0 || this.state.fieldsOf(c.id, 'grain').length > 0;

            const delta = (txt, shadow, v) => {
                const label = v ? (v > 0 ? '+' + v : String(v)) : '';
                txt.setText(label);
                shadow.setText(label);
                txt.setTint(v >= 0 ? DOS_DELTA_GREEN : DOS_DELTA_RED);
                shadow.setVisible(!!label && txt.visible);
            };
            delta(this.cowsDeltaText, this.cowsDeltaShadow, forecast.cattle || 0);
            delta(this.grainDeltaText, this.grainDeltaShadow, forecast.grain || 0);

            const labor = this.state.laborSnapshot(c);
            const availableLaborActivities = new Set(this.state.laborActivities(c).map(activity => activity.id));
            const sliderT = 1 - (c.laborFoodShare === undefined ? 0.5 : c.laborFoodShare);
            const sliderX = LABOR_SLIDER.minX + sliderT * (LABOR_SLIDER.maxX - LABOR_SLIDER.minX);
            this.labourGauge.setPosition(sliderX, LABOR_SLIDER.y);
            this.labourGaugeLess.setPosition(sliderX - 2, LABOR_SLIDER.y - 2);
            this.setMiscCityFrame(this.labourGauge, 'labourGauge');
            this.setMiscCityFrame(this.labourGaugeLess, 'labourGaugeLess');
            const inactiveLabor = this.state.laborInactiveWorkforce(c);
            this.labourGauge.setVisible(inactiveLabor <= 0);
            this.labourGaugeLess.setVisible(inactiveLabor > 0);

            const foodActivities = Object.fromEntries(
                this.state.laborActivities(c).map(activity => [activity.id, activity])
            );
            const activitySuffix = id => {
                const activity = foodActivities[id];
                const assigned = c.laborAllocations[id] || 0;
                return activity && activity.need > 0 && assigned < activity.need ? 'Less' : '';
            };
            this.setMiscCityFrame(this.labourCow, 'labourCow' + activitySuffix('cattle'));
            this.setMiscCityFrame(this.labourWheat, 'labourWheat' + activitySuffix('grain'));

            this.labourCow.setVisible(hasCattle);
            this.cowsText.setVisible(hasCattle);
            this.cowsDeltaText.setVisible(hasCattle);
            this.cowsDeltaShadow.setVisible(hasCattle && !!this.cowsDeltaText.text);
            this.labourWheat.setVisible(hasGrain);
            this.grainText.setVisible(hasGrain);
            this.grainDeltaText.setVisible(hasGrain);
            this.grainDeltaShadow.setVisible(hasGrain && !!this.grainDeltaText.text);

            this.labourLumber.setVisible(false);
            this.labourStone.setVisible(false);
            this.labourIron.setVisible(false);
            this.labourSmithyWeapon.setVisible(false);
            // Keep both layers: these objects deliberately use the same
            // activity keys, so object spread would discard the text layer
            // and clear only the shadows.
            for (const txt of [
                ...Object.values(this.industryDeltaTexts),
                ...Object.values(this.industryDeltaShadows)
            ]) {
                txt.setText('').setVisible(false);
            }
            this.setMiscCityFrame(this.labourCastle, 'labourCastle');
            this.setMiscCityFrame(this.labourCastleLess, 'labourCastleLess');
            this.labourCastle.setVisible(false);
            this.labourCastleLess.setVisible(false);

            const showIndustryDelta = (id, value, y, x = 82) => {
                const txt = this.industryDeltaTexts[id];
                const shadow = this.industryDeltaShadows[id];
                if (!txt || !value) { return; }
                txt.setPosition(x, y);
                if (shadow) {
                    shadow
                        .setPosition(x + 1, y + 1)
                        .setText(value > 0 ? '+' + value : String(value))
                        .setVisible(true);
                }
                txt
                    .setText(value > 0 ? '+' + value : String(value))
                    .setTint(value > 0 ? DOS_DELTA_GREEN : DOS_DELTA_RED)
                    .setVisible(true);
            };

            this.setMiscCityFrame(this.labourLumber, 'labourLumber');
            this.setMiscCityFrame(this.labourStone, 'labourStone');
            this.setMiscCityFrame(this.labourIron, 'labourIron');
            const industryRows = [
                { id: 'wood', visible: availableLaborActivities.has('wood'), icon: this.labourLumber, value: forecast.wood || 0 },
                { id: 'stone', visible: availableLaborActivities.has('stone'), icon: this.labourStone, value: forecast.stone || 0 },
                { id: 'iron', visible: availableLaborActivities.has('iron'), icon: this.labourIron, value: forecast.iron || 0 },
                { id: 'smithy', visible: availableLaborActivities.has('smithy'), icon: this.labourSmithyWeapon, value: forecast.smithy || 0 }
            ].filter(row => row.visible);
            const industryTop = 296;
            const industryBottom = c.castleBuild ? 374 : 380;
            const industryStep = industryRows.length > 1
                ? (industryBottom - industryTop) / (industryRows.length - 1)
                : 0;
            let industryY = industryTop;
            for (const row of industryRows) {
                if (row.id === 'smithy') {
                    row.icon
                        .setText(WEAPON_ABBR[forecast.weaponType || 'sword'] || String(forecast.weaponType || 'SWD').slice(0, 3).toUpperCase())
                        .setPosition(134, industryY)
                        .setVisible(true);
                } else {
                    row.icon.setPosition(135, industryY).setVisible(true);
                }
                showIndustryDelta(row.id, row.value, industryY);
                industryY += industryStep;
            }

            if (c.castleBuild) {
                const castleUnderstaffed = groupSuffix(labor.industry) === 'Less';
                const castleY = 398;
                this.labourCastle.setPosition(135, castleY).setVisible(!castleUnderstaffed);
                this.labourCastleLess.setPosition(135, castleY).setVisible(castleUnderstaffed);
                this.industryDeltaTexts.castle
                    .setPosition(110, castleY)
                    .setText(String(c.castleBuild.remaining))
                    .setColor('#101008')
                    .setVisible(true);
            }
        }

        buildTaxDialog ()
        {
            const x = 80;
            const y = 143;
            const w = 320;
            const h = 145;
            const black = 0x1c1208;
            const children = [
                this.taxPanel()
            ];
            children.push(this.add.bitmapText(17, 23, 'lords2', t('campaign.tax.rate')).setTint(black));
            children.push(this.add.image(116, 15, RATIONS_UI('up')).setOrigin(0));
            children.push(this.add.image(148, 15, RATIONS_UI('down')).setOrigin(0));
            this.taxRateDialogText = this.add.bitmapText(187, 23, 'lords2', '').setOrigin(0, 0).setTint(black);
            children.push(this.taxRateDialogText);

            children.push(this.add.bitmapText(17, 59, 'lords2', t('campaign.tax.peoplePay')).setTint(black));
            this.taxIncomeText = this.add.bitmapText(142, 59, 'lords2', '').setOrigin(0, 0).setTint(black);
            children.push(this.taxIncomeText);
            children.push(this.add.image(240, 20, 'tax-purse').setOrigin(0));

            children.push(this.add.bitmapText(17, 91, 'lords2', t('campaign.tax.thisCounty')).setTint(black));
            children.push(this.add.bitmapText(17, 119, 'lords2', t('campaign.tax.otherCounties')).setTint(black));
            this.taxCountyHeartText = this.add.bitmapText(171, 91, 'lords2', '').setOrigin(0, 0).setTint(black);
            this.taxOtherIncomeText = this.add.bitmapText(171, 119, 'lords2', '').setOrigin(0, 0).setTint(black);
            children.push(this.taxCountyHeartText, this.taxOtherIncomeText);
            children.push(this.add.image(218, 92, RATIONS_UI('heart')).setOrigin(0).setScale(0.72));
            children.push(this.add.image(218, 120, RATIONS_UI('heart')).setOrigin(0).setScale(0.72));
            children.push(this.add.image(284, 107, 'tax-close').setOrigin(0));

            this.taxDialog = this.add.container(x, y, children).setScrollFactor(0).setDepth(150).setVisible(false);
            this.input.on('pointerdown', (pointer) => {
                if (!this.taxDialog.visible) { return; }
                if (this.taxDialogJustOpened) { this.taxDialogJustOpened = false; return; }
                const lx = pointer.x - x;
                const ly = pointer.y - y;
                if (pointer.rightButtonDown() || lx < 0 || ly < 0 || lx >= w || ly >= h) {
                    this.taxDialog.setVisible(false);
                    return;
                }
                if (ly >= 12 && ly < 50 && lx >= 110 && lx < 178) {
                    const c = this.state.counties[this.state.selectedCounty];
                    c.taxRate = Phaser.Math.Clamp(c.taxRate + (lx < 143 ? 5 : -5), 0, 50);
                    this.refreshTaxDialog();
                    this.refreshCountyPane();
                    return;
                }
                if (lx >= 284 && lx < 318 && ly >= 107 && ly < 141) {
                    this.taxDialog.setVisible(false);
                }
            });
        }

        openTaxDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c || c.owner !== 0) { return; }
            this.refreshTaxDialog();
            this.taxDialogJustOpened = true;
            this.taxDialog.setVisible(true);
        }

        refreshTaxDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            const projected = this.state.taxIncome(c);
            const taxHeart = Math.round(c.taxRate <= 5 ? 5 - c.taxRate : -(c.taxRate - 5) * 1.5);
            this.taxRateDialogText.setText(c.taxRate + '%');
            this.taxIncomeText.setText(t('campaign.tax.crowns', { n: projected }));
            this.taxCountyHeartText.setText('( ' + (taxHeart >= 0 ? '+' : '') + taxHeart + ' )');
            this.taxOtherIncomeText.setText('( 0 )');
        }

        buildPopulationDialog ()
        {
            this.populationReport = this.buildSeasonReport('Population');
        }

        buildHappinessDialog ()
        {
            this.happinessReport = this.buildSeasonReport('Happiness');
        }

        buildSeasonReport (kind)
        {
            const x = 16;
            const y = 50;
            const w = 448;
            const h = 380;
            const black = 0x1c1208;
            const children = [
                this.parchmentPanel(w, h, `season-report-${kind}-parchment`)
            ];
            const title = this.add.bitmapText(w / 2, 5, 'lords2-big', '').setOrigin(0.5, 0).setTint(black);
            children.push(title);

            let picture;
            if (kind === 'Population') {
                picture = this.add.image(20, 43, 'population-report-background').setOrigin(0);
                children.push(picture);
                const shade = this.add.rectangle(20, 43, 404, 152, 0x6f6845, 0.34).setOrigin(0);
                children.push(shade);
            } else if (kind === 'Happiness') {
                picture = this.add.image(20, 43, 'happiness-report-background').setOrigin(0);
                children.push(picture);
                const shade = this.add.rectangle(20, 43, 404, 152, 0x6f6845, 0.34).setOrigin(0);
                children.push(shade);
            } else {
                picture = this.add.graphics();
                picture.fillStyle(0x80764c).fillRect(20, 43, 404, 152);
                picture.fillStyle(0x5d593b).fillRect(22, 45, 400, 148);
                picture.lineStyle(2, 0x37351f);
                for (let i = 0; i < 8; i++) {
                    const bx = 118 + i * 39;
                    picture.strokeTriangle(bx, 132, bx + 18, 92 - (i % 3) * 8, bx + 38, 132);
                    picture.strokeRect(bx + 5, 132, 28, 40);
                }
                picture.fillStyle(0x4f4a31);
                picture.fillRect(24, 47, 396, 144);
                picture.setAlpha(0.52);
                children.push(picture);
            }

            const oldBar = this.add.rectangle(46, 190, 30, 0, 0x287fba).setOrigin(0, 1).setStrokeStyle(1, 0x101008);
            const newBar = this.add.rectangle(77, 190, 30, 0, 0x1ca6e0).setOrigin(0, 1).setStrokeStyle(1, 0x101008);
            children.push(oldBar, newBar);
            const chart = this.add.graphics();
            children.push(chart);
            const period = this.add.bitmapText(25, 197, 'lords2', '').setTint(black);
            const global = this.add.bitmapText(205, 197, 'lords2', '').setTint(black);
            children.push(period, global);

            children.push(this.add.bitmapText(36, 225, 'lords2-big', t('campaign.report.pastSeason')).setTint(black));
            const labels = [];
            const values = [];
            for (let i = 0; i < 6; i++) {
                labels.push(this.add.bitmapText(36, 253 + i * 16, 'lords2', '').setTint(black));
                values.push(this.add.bitmapText(368, 253 + i * 16, 'lords2', '').setTint(black));
            }
            children.push(...labels, ...values);
            children.push(this.add.bitmapText(36, 350, 'lords2-big', t('campaign.report.thisSeason')).setTint(black));
            const pastValue = this.add.bitmapText(368, 225, 'lords2-big', '').setTint(black);
            children.push(pastValue);
            const current = this.add.bitmapText(368, 350, 'lords2-big', '').setTint(black);
            children.push(current);
            if (kind === 'Happiness') {
                children.push(this.add.image(400, 197, RATIONS_UI('heart')).setOrigin(0));
                children.push(this.add.image(400, 225, RATIONS_UI('heart')).setOrigin(0));
                children.push(this.add.image(400, 350, RATIONS_UI('heart')).setOrigin(0));
            }
            children.push(this.add.image(w - 38, h - 38, 'tax-close').setOrigin(0));

            const container = this.add.container(x, y, children).setScrollFactor(0).setDepth(150).setVisible(false);
            const report = { kind, x, y, w, h, container, title, oldBar, newBar, chart, period, global, labels, values, pastValue, current };
            this.input.on('pointerdown', (pointer) => {
                if (!container.visible) { return; }
                if (report.justOpened) { report.justOpened = false; return; }
                const lx = pointer.x - x;
                const ly = pointer.y - y;
                if (pointer.rightButtonDown() || lx < 0 || ly < 0 || lx >= w || ly >= h
                    || (lx >= w - 42 && ly >= h - 42)) {
                    container.setVisible(false);
                }
            });
            return report;
        }

        openPopulationDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c || c.owner !== 0) { return; }
            const r = this.populationReport;
            const previous = c.lastPopulation ?? c.population;
            r.title.setText(t('campaign.report.popTitle', { county: c.name }));
            r.oldBar.setVisible(false);
            r.newBar.setVisible(false);
            this.drawPopulationChart(r, c);
            r.period.setText((this.state.year - 1) + ' - ' + this.state.year);
            r.global.setText(t('campaign.report.moreInhabitants', { n: c.population }));
            r.pastValue.setText('');
            const rows = [
                [t('campaign.report.births'), '+' + (c.lastBirths || 0)],
                [t('campaign.report.deaths'), '-' + (c.lastDeaths || 0)],
                [t('campaign.report.army'), String(c.lastArmy || 0)],
                [t('campaign.report.immigration'), String(Math.max(0, c.lastMigration || 0))],
                [t('campaign.report.emigration'), String(Math.max(0, -(c.lastMigration || 0)))],
                ['', '']
            ];
            rows.forEach((row, i) => {
                r.labels[i].setText(row[0]);
                r.values[i].setText(row[1]);
                r.values[i].setTint(row[1].startsWith('-') ? 0xd00000 : (row[1].startsWith('+') ? 0x008000 : 0x1c1208));
            });
            r.current.setText(String(c.population));
            r.justOpened = true;
            r.container.setVisible(true);
        }

        drawPopulationChart (report, county)
        {
            const chart = report.chart;
            chart.clear();

            const rawHistory = Array.isArray(county.populationHistory) && county.populationHistory.length
                ? county.populationHistory
                : [county.population];
            const history = rawHistory.slice(-8);
            const max = Math.max(1, ...history);
            const baseline = 190;
            const maxHeight = 86;
            const startX = 38;
            const barW = history.length <= 2 ? 43 : 32;
            const gap = history.length <= 2 ? 4 : 5;

            chart.lineStyle(1, 0x2c2a1a, 0.7);
            chart.strokeRect(20, 43, 404, 152);

            for (let i = 0; i < history.length; i++) {
                const value = history[i];
                const h = Math.max(12, Math.round(value / max * maxHeight));
                const x = startX + i * (barW + gap);
                const y = baseline - h;
                const isCurrent = i === history.length - 1;
                const fill = history.length === 1 || !isCurrent ? 0x2ba1d8 : 0xd94a34;
                const shade = history.length === 1 || !isCurrent ? 0x164f89 : 0x8e231c;
                const light = history.length === 1 || !isCurrent ? 0x59d7f2 : 0xff7c54;

                chart.fillStyle(fill, 0.96).fillRect(x, y, barW, h);
                chart.lineStyle(1, 0x111008, 0.9).strokeRect(x, y, barW, h);
                chart.lineStyle(1, light, 0.75);
                for (let px = x + 3; px < x + barW - 2; px += 6) {
                    chart.lineBetween(px, y + 3, px + 2, baseline - 4);
                }
                chart.lineStyle(1, shade, 0.55);
                for (let py = y + 5; py < baseline - 2; py += 7) {
                    chart.lineBetween(x + 2, py, x + barW - 3, py + 1);
                }
            }
        }

        openHappinessDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c || c.owner !== 0) { return; }
            const r = this.happinessReport;
            const previous = c.lastHappiness ?? c.happiness;
            const mods = c.lastHappinessMods || {};
            r.title.setText(t('campaign.report.happyTitle', { county: c.name }));
            r.oldBar.setVisible(false);
            r.newBar.setVisible(false);
            this.drawHappinessChart(r, c);
            r.period.setText((this.state.year - 1) + ' - ' + this.state.year);
            r.global.setText(t('campaign.report.overallHappiness', { n: c.happiness }));
            r.pastValue.setText(String(previous));
            const rows = [
                [t('campaign.report.taxes'), mods.tax || 0],
                [t('campaign.report.rations'), mods.ration || 0],
                [t('campaign.report.health'), mods.health || 0],
                [t('campaign.report.army'), mods.army || 0],
                [t('campaign.report.plague'), mods.plague || 0],
                [t('campaign.report.other'), mods.other || 0]
            ];
            rows.forEach((row, i) => {
                r.labels[i].setText(row[0]);
                const text = (row[1] >= 0 ? '+' : '') + row[1];
                r.values[i].setText(text);
                r.values[i].setTint(row[1] < 0 ? 0xd00000 : (row[1] > 0 ? 0x008000 : 0x1c1208));
            });
            r.current.setText(String(c.happiness));
            r.justOpened = true;
            r.container.setVisible(true);
        }

        drawHappinessChart (report, county)
        {
            const chart = report.chart;
            chart.clear();

            const rawHistory = Array.isArray(county.happinessHistory) && county.happinessHistory.length
                ? county.happinessHistory
                : [county.happiness];
            const history = rawHistory.slice(-8);
            const baseline = 190;
            const maxHeight = 86;
            const startX = 38;
            const barW = history.length <= 2 ? 43 : 32;
            const gap = history.length <= 2 ? 4 : 5;

            chart.lineStyle(1, 0x2c2a1a, 0.7);
            chart.strokeRect(20, 43, 404, 152);

            for (let i = 0; i < history.length; i++) {
                const value = Phaser.Math.Clamp(history[i], 0, 100);
                const h = Math.max(8, Math.round(value / 100 * maxHeight));
                const x = startX + i * (barW + gap);
                const y = baseline - h;
                const isCurrent = i === history.length - 1;
                const fill = history.length === 1 || !isCurrent ? 0x2ba1d8 : 0xd94a34;
                const shade = history.length === 1 || !isCurrent ? 0x164f89 : 0x8e231c;
                const light = history.length === 1 || !isCurrent ? 0x59d7f2 : 0xff7c54;

                chart.fillStyle(fill, 0.96).fillRect(x, y, barW, h);
                chart.lineStyle(1, 0x111008, 0.9).strokeRect(x, y, barW, h);
                chart.lineStyle(1, light, 0.75);
                for (let px = x + 3; px < x + barW - 2; px += 6) {
                    chart.lineBetween(px, y + 3, px + 2, baseline - 4);
                }
                chart.lineStyle(1, shade, 0.55);
                for (let py = y + 5; py < baseline - 2; py += 7) {
                    chart.lineBetween(x + 2, py, x + barW - 3, py + 1);
                }
            }
        }

        /*
         * Écran des rations (l'« assiette ») — calqué sur la capture DOS
         * doc/captures/rations-panel-fr.png : panneau 287×238 en (128,97),
         * titre « Ration », lignes Objectif (flèches ▲▼), Résultat et
         * Santé avec leurs cœurs « ( +N ♥ ) », curseur panier↔vache à
         * poignée-fourche, tableau pain/bœuf/laitage (Nourris / Mangé),
         * bouton flèche-sur-disque pour fermer. Libellés anglais ❓ (le
         * DOS français écrit Objectif/Résultat/Santé/Nourris/Mangé).
         */
        buildRationsDialog ()
        {
            const x = 128;
            const y = 97;
            const w = 287;
            const h = 238;
            this.rationsRect = { x, y, w, h };

            const bg = this.parchmentPanel(w, h, 'rations-parchment-panel');
            const children = [bg];

            children.push(this.add.bitmapText(w / 2, 4, 'lords2-big', t('campaign.rations.title')).setOrigin(0.5, 0).setTint(0x1c1208));

            // lignes Objectif / Résultat / Santé
            const black = 0x1c1208;
            const row = (ly, label) => {
                children.push(this.add.bitmapText(10, ly, 'lords2', label).setTint(black));
            };
            row(38, t('campaign.rations.target'));
            row(62, t('campaign.rations.achieved'));
            row(86, t('campaign.rations.health'));
            this.rationsTarget = this.add.bitmapText(150, 38, 'lords2', '').setOrigin(0.5, 0).setTint(black);
            this.rationsResult = this.add.bitmapText(150, 62, 'lords2', '').setOrigin(0.5, 0).setTint(black);
            this.rationsHealth = this.add.bitmapText(150, 86, 'lords2', '').setOrigin(0.5, 0).setTint(black);
            children.push(this.rationsTarget, this.rationsResult, this.rationsHealth);
            this.rationsForagers = this.add.bitmapText(10, 104, 'lords2-small', '').setTint(black);
            children.push(this.rationsForagers);

            // flèches ▲▼ du palier visé
            children.push(this.add.image(216, 34, RATIONS_UI('up')).setOrigin(0));
            children.push(this.add.image(246, 34, RATIONS_UI('down')).setOrigin(0));

            // cœurs « ( +N ♥ ) » des lignes Résultat et Santé
            const hearts = (ly) => {
                const open = this.add.bitmapText(212, ly, 'lords2', '(').setTint(black);
                const num = this.add.bitmapText(232, ly, 'lords2', '').setOrigin(0.5, 0).setTint(black);
                const img = this.add.image(246, ly + 1, RATIONS_UI('heart')).setOrigin(0);
                const close = this.add.bitmapText(270, ly, 'lords2', ')').setTint(black);
                children.push(open, num, img, close);
                return num;
            };
            this.rationsResultHearts = hearts(62);
            this.rationsHealthHearts = hearts(86);

            // curseur pain↔bœuf : panier, ◄ fourche ►, vache
            children.push(this.add.image(12, 114, RATIONS_UI('basket')).setOrigin(0));
            children.push(this.add.image(78, 122, RATIONS_UI('arrowl')).setOrigin(0));
            children.push(this.add.image(202, 122, RATIONS_UI('arrowr')).setOrigin(0));
            children.push(this.add.image(236, 107, RATIONS_UI('cowbig')).setOrigin(0));
            this.rationsBar = { x0: 100, y0: 132, w: 100 };
            children.push(this.add.rectangle(this.rationsBar.x0, this.rationsBar.y0, this.rationsBar.w, 3, 0x101008).setOrigin(0));
            this.rationsHandle = this.add.image(0, 110, RATIONS_UI('fork')).setOrigin(0.5, 0);
            children.push(this.rationsHandle);

            // tableau : pain / bœuf / laitage (le laitage ne « mange » rien)
            const COLS = [120, 185, 240];
            children.push(this.add.image(COLS[0], 150, RATIONS_UI('basket')).setOrigin(0.5, 0));
            children.push(this.add.image(COLS[1], 147, RATIONS_UI('cowbig')).setOrigin(0.5, 0));
            children.push(this.add.image(COLS[2], 160, RATIONS_UI('cheese')).setOrigin(0.5, 0));

            children.push(this.add.image(8, 186, RATIONS_UI('figure')).setOrigin(0));
            children.push(this.add.bitmapText(24, 188, 'lords2', t('campaign.rations.fed')).setTint(black));
            children.push(this.add.bitmapText(24, 208, 'lords2', t('campaign.rations.eaten')).setTint(black));
            this.rationsFed = COLS.map(cx =>
                this.add.bitmapText(cx, 188, 'lords2', '').setOrigin(0.5, 0).setTint(black));
            this.rationsUsed = COLS.slice(0, 2).map(cx =>
                this.add.bitmapText(cx, 208, 'lords2', '').setOrigin(0.5, 0).setTint(black));
            children.push(...this.rationsFed, ...this.rationsUsed);

            // fermeture : flèche sur disque noir (comme la jauge minimap)
            children.push(this.add.image(w - 38, h - 38, 'tax-close').setOrigin(0));

            this.rationsDialog = this.add.container(x, y, children).setScrollFactor(0).setDepth(150).setVisible(false);
            this.rationsDragging = false;

            const setShareFromPointer = (pointer) => {
                const c = this.state.counties[this.state.selectedCounty];
                if (!c) { return; }
                const lx = pointer.x - x;
                c.beefShare = Phaser.Math.Clamp((lx - this.rationsBar.x0) / this.rationsBar.w, 0, 1);
                this.refreshRationsDialog();
            };

            this.input.on('pointerdown', (pointer) => {
                if (!this.rationsDialog.visible) { return; }
                if (this.rationsJustOpened) { this.rationsJustOpened = false; return; }
                const lx = pointer.x - x;
                const ly = pointer.y - y;
                const inside = lx >= 0 && lx < w && ly >= 0 && ly < h;
                const onClose = lx >= w - 40 && ly >= h - 40 && inside;
                if (pointer.rightButtonDown() || !inside || onClose) {
                    this.rationsDragging = false;
                    this.rationsDialog.setVisible(false);
                    return;
                }
                const c = this.state.counties[this.state.selectedCounty];
                if (!c) { return; }

                // flèches ▲▼ : palier visé ±1
                if (ly >= 32 && ly < 66 && lx >= 214 && lx < 276) {
                    const d = lx < 245 ? 1 : -1;
                    const i = Phaser.Math.Clamp(RATIONS.indexOf(c.ration) + d, 0, RATIONS.length - 1);
                    c.ration = RATIONS[i];
                    this.refreshRationsDialog();
                    this.refreshCountyPane();
                    return;
                }

                // curseur : ◄ ► par crans, ou clic sur la barre
                if (ly >= 108 && ly < 152) {
                    const share = c.beefShare === undefined ? 0.5 : c.beefShare;
                    if (lx >= 74 && lx < 98) {
                        c.beefShare = Phaser.Math.Clamp(share - 0.125, 0, 1);
                    } else if (lx >= 198 && lx < 222) {
                        c.beefShare = Phaser.Math.Clamp(share + 0.125, 0, 1);
                    } else if (lx >= this.rationsBar.x0 - 6 && lx < this.rationsBar.x0 + this.rationsBar.w + 6) {
                        this.rationsDragging = true;
                        setShareFromPointer(pointer);
                        return;
                    } else { return; }
                    this.refreshRationsDialog();
                }
            });
            this.input.on('pointermove', (pointer) => {
                if (this.rationsDragging && this.rationsDialog.visible && pointer.isDown) {
                    setShareFromPointer(pointer);
                }
            });
            this.input.on('pointerup', () => {
                this.rationsDragging = false;
            });
        }

        openRationsDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c || c.owner !== 0) { return; }
            this.refreshRationsDialog();
            this.rationsJustOpened = true;
            this.rationsDialog.setVisible(true);
        }

        refreshRationsDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c) { return; }

            this.rationsTarget.setText(tRation(c.ration));
            this.rationsHealth.setText(tHealth(HEALTH_LEVELS[c.health]));
            this.rationsForagers.setText(this.state.armyFood
                ? t('campaign.rations.foragers', { n: this.state.foragersIn(c.id) })
                : '');

            // Résultat : le palier le plus proche de la ration servie ;
            // cœurs ❓ calés sur la capture (Normal → +1, Bon → +1) :
            // ration = index − 1, santé = niveau − 2
            const food = this.state.previewFoodAfterForagers(c);
            let result = RATIONS[0];
            for (const r of RATIONS) {
                if (Math.abs(RATION_FACTOR[r] - food.served) < Math.abs(RATION_FACTOR[result] - food.served)) { result = r; }
            }
            this.rationsResult.setText(tRation(result));
            const fmt = (n) => (n >= 0 ? '+' : '') + n;
            this.rationsResultHearts.setText(fmt(RATIONS.indexOf(result) - 1));
            this.rationsHealthHearts.setText(fmt(c.health - 2));

            this.rationsFed[0].setText(String(food.grainFed));
            this.rationsFed[1].setText(String(food.beefFed));
            this.rationsFed[2].setText(String(food.dairyFed));
            this.rationsUsed[0].setText(String(food.sacksUsed));
            this.rationsUsed[1].setText(String(food.cowsEaten));

            const share = c.beefShare === undefined ? 0.5 : c.beefShare;
            this.rationsHandle.x = this.rationsBar.x0 + share * this.rationsBar.w;
        }

        // Océan infini : l'original prolonge la mer au-delà des bords de la
        // carte (vérifié sur captures DOS, en vue normale comme en dézoom —
        // jamais de zone noire). Motif 232×120 = 4×4 losanges des frames de
        // mer 22-29 (classe 4), répété sous toute la carte ; centerX (1856)
        // est un multiple exact de 232, les losanges du fond tombent donc
        // pile sur la grille — seul le choix des variantes diffère au bord.
        buildSeaBackground ()
        {
            const tileset = {
                Spring: 'tilesSpring',
                Summer: 'tilesSummer',
                Autumn: 'tilesAutumn',
                Winter: 'tilesWinter'
            }[this.state.season] || 'tilesSpring';
            const key = 'sea-' + tileset;
            if (!this.textures.exists(key)) {
                const cv = this.textures.createCanvas(key, 232, 120);
                for (let a = 0; a < 8; a++) {
                    for (let b = 0; b < 8; b++) {
                        if ((a + b) & 1) { continue; } // losanges : a+b pair
                        const frame = 22 + (a * 5 + b * 3) % 8;
                        const px = ((a * 29 - 29) % 232 + 232) % 232;
                        const py = ((b * 15 - 19) % 120 + 120) % 120;
                        for (const dx of [0, -232]) {
                            for (const dy of [0, -120]) {
                                cv.drawFrame(tileset, frame, px + dx, py + dy);
                            }
                        }
                    }
                }
                cv.refresh();
            }
            this.add.tileSprite(0, 24, this.worldWidth, this.worldHeight, key).setOrigin(0);

            // Au nord, la carte est rognée en pleine terre : la terre se
            // termine par une CÔTE À FALAISES posée juste au-delà des
            // bords x=0 / y=0, puis mer ouverte (le fond). Les frames de
            // falaise sont directionnelles — relevées sur les côtes
            // réelles de la carte : terre en +x = 42-45, terre en +y =
            // 46-49, coin (terre en +x et +y) = 62-65. (Les essais
            // d'aplat d'herbe puis de terrain reflété étaient incohérents
            // — l'art directionnel ne se reflète pas.)
            const data = this.cache.json.get('campaignMap');
            const tcls = data.layers.terrainClass;
            const W = data.width;
            const cliffAt = (x, y, band) => {
                const tx = W * 29 + (x - y) * 29 - 29;
                const ty = (x + y) * 15 - 19 + 24;
                this.add.image(tx, ty, tileset, band + ((x * 7 + y * 13) % 4 + 4) % 4).setOrigin(0);
            };
            for (let y = 0; y < W; y++) {
                if (tcls[y * W] !== 4) { cliffAt(-1, y, 42); }
            }
            for (let x = 0; x < W; x++) {
                if (tcls[x] !== 4) { cliffAt(x, -1, 46); }
            }
            if (tcls[0] !== 4) { cliffAt(-1, -1, 62); }
        }

        buildMap ()
        {
            this.buildSeaBackground();

            this.map = this.add.container(0, 24);

            const data = this.cache.json.get('campaignMap');
            const terrain = data.layers.terrain;
            const tclass = data.layers.terrainClass;
            const mapwidth = data.width;
            const mapheight = data.height;

            // Losange 58×30 : pas isométrique = demi-largeur/hauteur du losange.
            const tileWidthHalf = 29;
            const tileHeightHalf = 15;

            // Décalage pour que la colonne x=0 / ligne y=63 reste à droite de 0.
            const centerX = mapheight * tileWidthHalf;

            // Dans une frame 64×34 du spritesheet, le losange est dessiné à
            // (0,4) : son centre est donc à (29,19) du coin de la frame.
            const frameOffsetX = 29;
            const frameOffsetY = 19;

            // Appariement saison → planche : A=printemps, B=été, C=automne,
            // D=hiver (ordre alphabétique = ordre des saisons).
            const season = this.state.season;
            const tileset = {
                Spring: 'tilesSpring',
                Summer: 'tilesSummer',
                Autumn: 'tilesAutumn',
                Winter: 'tilesWinter'
            }[season] || 'tilesSpring';
            const roads = {
                Spring: 'roadsSpring',
                Summer: 'roadsSummer',
                Autumn: 'roadsAutumn',
                Winter: 'roadsWinter'
            }[season] || 'roadsSpring';

            // Règle de rendu (rétro-ingénierie, voir doc/technical/file-types/
            // L2_maps.dat.rst) : la classe (couche 0) choisit la planche,
            // l'indice (couche 2) choisit la frame dedans.
            //  - classes 1/2/3 : routes (la frame 0 est un tronçon valide) ;
            //    10 : rivières/arbres → planche ROADS, sur une tuile d'herbe
            //  - classe 8 : indice ≤ 24 = quart de montagne (planche MTNS,
            //    une frame par tuile), indices 30-37 = forêt (ROADS)
            //  - classe 32 : champ (frame ROADS selon la culture choisie)
            //  - classes 64 (ville) et 128 (château / industrie) : herbe,
            //    l'entité elle-même est posée par placeFeatures()
            //  - classe 16 : pâturage du troupeau (herbe, vaches à venir)
            //  - la couche 3 porte les tronçons de route qui passent SOUS
            //    les forêts/montagnes/villes/châteaux (frames ROADS 1-8)
            //  - le reste (0/4/16…) → planche BASE
            const ROADS_CLASSES = { 1: true, 2: true, 3: true, 8: true, 10: true, 18: true };
            const GRASS = 14;
            const seasonKey = season.toLowerCase();
            const roadsLayer = data.layers.roads;

            this.tilesetKey = tileset;
            this.roadsKey = roads;
            this.features = this.scanFeatures(data);
            for (const site of this.features.industries) {
                const county = this.state.counties[site.county];
                if (!county) { continue; }
                if (site.kind === 0) { county.hasQuarry = true; }
                else if (site.kind === 20) { county.hasMine = true; }
                else if (site.kind === 30) { county.hasLumberMill = true; }
            }
            for (let t = 0; t < data.layers.terrainClass.length; t++) {
                const countyId = data.layers.county[t];
                const county = this.state.counties[countyId];
                if (!county) { continue; }
                const c = data.layers.terrainClass[t];
                const frame = data.layers.terrain[t];
                if ((c === 8 && frame >= 30 && frame <= 37) || c === 10) {
                    county.hasLumberMill = true;
                }
            }

            const that = this;
            let i = 0;

            for (let y = 0; y < mapheight; y++)
            {
                for (let x = 0; x < mapwidth; x++)
                {
                    const id = terrain[i];
                    const cls = tclass[i];

                    const tx = centerX + (x - y) * tileWidthHalf - frameOffsetX;
                    const ty = (x + y) * tileHeightHalf - frameOffsetY;

                    if (cls === 32) {
                        // champ : herbe + surface selon l'usage du lopin,
                        // vaches si le champ est affecté à l'élevage
                        this.map.add(this.add.image(tx, ty, tileset, GRASS).setOrigin(0));
                        const field = this.features.fieldOfTile[i];
                        const img = this.add.image(tx, ty, ...this.fieldTexture(field)).setOrigin(0);
                        this.map.add(img);
                        field.images.push(img);
                        const fs = this.state.fields[field.key];
                        if (fs && fs.use === 'cattle') {
                            const spr = this.addHerdSprite(x, y, this.herdDensity(fs.county));
                            if (spr) { field.cowSprites.push(spr); }
                        }
                    } else if (cls === 64 || cls === 128) {
                        // emprise de ville / château / industrie : fond
                        // d'herbe (la couche 2 y stocke la variante d'herbe),
                        // route éventuelle de la couche 3 par-dessous
                        this.map.add(this.add.image(tx, ty, tileset, (id >= 6 && id <= 21) ? id : GRASS).setOrigin(0));
                        if (roadsLayer[i] > 0) {
                            this.map.add(this.add.image(tx, ty, roads, roadsLayer[i]).setOrigin(0));
                        }
                    } else if (cls === 16) {
                        // slot de village : herbe (variante stockée en
                        // couche 2), route sous-jacente éventuelle ; le
                        // village lui-même est posé par placeFeatures()
                        // selon la population du comté
                        this.map.add(this.add.image(tx, ty, tileset, (id >= 6 && id <= 21) ? id : GRASS).setOrigin(0));
                        if (roadsLayer[i] > 0) {
                            this.map.add(this.add.image(tx, ty, roads, roadsLayer[i]).setOrigin(0));
                        }
                    } else if (cls === 8 && id <= 24) {
                        // quart de montagne : herbe, route sous-jacente,
                        // puis la frame MTNS avec son surplomb (le losange
                        // est à (0,34) dans le PNG 58×64)
                        this.map.add(this.add.image(tx, ty, tileset, GRASS).setOrigin(0));
                        if (roadsLayer[i] > 0) {
                            this.map.add(this.add.image(tx, ty, roads, roadsLayer[i]).setOrigin(0));
                        }
                        this.map.add(this.add.image(tx + frameOffsetX - 29, ty + frameOffsetY - 15 - 34, `mtn-${seasonKey}-${id}`).setOrigin(0));
                    } else if (ROADS_CLASSES[cls]) {
                        this.map.add(this.add.image(tx, ty, tileset, GRASS).setOrigin(0));
                        if (roadsLayer[i] > 0) {
                            this.map.add(this.add.image(tx, ty, roads, roadsLayer[i]).setOrigin(0));
                        }
                        this.map.add(this.add.image(tx, ty, roads, id).setOrigin(0));
                    } else if (id <= 5) {
                        this.map.add(this.add.image(tx, ty, tileset, GRASS).setOrigin(0));
                        if (id > 0) {
                            this.map.add(this.add.image(tx, ty, tileset, id).setOrigin(0));
                        }
                    } else {
                        this.map.add(this.add.image(tx, ty, tileset, id).setOrigin(0));
                    }

                    i++;
                }
            }

            this.placeFeatures(season.toLowerCase());

            this.map.setInteractive(
                new Phaser.Geom.Rectangle(0, 0, this.worldWidth, this.worldHeight),
                Phaser.Geom.Rectangle.Contains
            );
            this.map.on('pointerdown', function (pointer, localX, localY, event) {
                // ignore les clics sur le panneau latéral et le bandeau, et
                // ceux destinés au panneau d'affectation des champs
                if (pointer.x >= 478 || pointer.y < 24) { return; }
                if (that.dialogOpen()) { return; }

                // tuile sous le curseur (projection iso inverse :
                // u = x−y = (localX−1856)/29, r = x+y = localY/15)
                const u = (localX - mapheight * tileWidthHalf) / tileWidthHalf;
                const r = localY / tileHeightHalf;
                const tx = Math.round((r + u) / 2);
                const ty = Math.round((r - u) / 2);
                if (tx < 0 || ty < 0 || tx >= mapwidth || ty >= mapheight) { return; }

                const ti = ty * mapwidth + tx;
                const cls = data.layers.terrainClass[ti];

                // carte d'ensemble ouverte : l'image interactive au-dessus
                // gère les clics, la carte en dessous n'agit pas
                if (that.overviewMode) { return; }

                // champ : ouvre le panneau d'affectation (blé/jachère/vaches)
                if (cls === 32) {
                    that.openFieldDialog(that.features.fieldOfTile[ti]);
                    return;
                }

                // sélectionne le comté sous le curseur
                const id = data.layers.county[ti];
                if (that.state.counties[id]) {
                    that.state.selectedCounty = id;
                    that.refreshCountyPane();
                }

                // une armée est sélectionnée : ce clic lui donne sa cible
                if (that.selectedArmyId) {
                    const army = that.state.armies.find(a => a.id === that.selectedArmyId);
                    const marker = that.armyMarkers[that.selectedArmyId];
                    if (marker) { marker.setColor('#ffffff'); }
                    that.selectedArmyId = null;
                    if (army && that.state.counties[id]) { army.target = id; }
                    return;
                }

                // capitale : sélection d'armée si une armée du joueur y
                // stationne, sinon panneau avancé des ouvriers si le comté
                // appartient au joueur.
                if (cls === 64) {
                    const armies = that.state.armiesIn(id).filter(a => a.owner === 0);
                    if (armies.length > 0) {
                        that.selectedArmyId = armies[0].id;
                        const marker = that.armyMarkers[armies[0].id];
                        if (marker) { marker.setColor('#ffe060'); }
                        return;
                    }
                    if (that.state.counties[id] && that.state.counties[id].owner === 0) {
                        that.openAdvancedLaborDialog(id);
                    }
                    return;
                }
                if (cls === 128) {
                    that.openCastleDialog(id);
                    return;
                }

                that.cameras.main.centerOn(localX, localY);
            });
        }

        // Inventorie les entités de la carte par classe de terrain :
        //  - 16 : pâturage du troupeau du comté (2×2, enclos + vaches)
        //  - 32 : champs — CHAQUE tuile est un champ individuel cliquable
        //  - 64 : ville 2×2 (capitale du comté), ancre = tuile d'indice 0 (N)
        //  - 128 en groupe (≥3) : château 2×2 ; isolées : industrie, la
            //    couche 2 donne le bâtiment (0 carrière, 10-18 forge animée,
            //    20 mine, 30 scierie)
        scanFeatures (data)
        {
            const W = data.width;
            const H = data.height;
            const cls = data.layers.terrainClass;
            const terrain = data.layers.terrain;
            const county = data.layers.county;

            const features = { fields: [], towns: [], castles: [], industries: [], blacksmiths: [], villages: [], fieldOfTile: {} };
            const seen = new Array(W * H).fill(false);

            for (let i = 0; i < W * H; i++) {
                if (cls[i] !== 32) { continue; }
                const key = (i % W) + ',' + ((i / W) | 0);
                const x = i % W;
                const y = (i / W) | 0;
                const countyId = county[i];
                const differentCounty = (j) =>
                    j >= 0 && j < county.length &&
                    county[j] > 0 && countyId > 0 &&
                    county[j] !== countyId;
                // The two visible upper edges meet the tiles at y-1 and x-1.
                const boundaryVariant =
                    (y > 0 && differentCounty(i - W) ? 1 : 0) +
                    (x > 0 && differentCounty(i - 1) ? 2 : 0);
                const field = { key, tiles: [i], images: [], cowSprites: [], boundaryVariant };
                features.fields.push(field);
                features.fieldOfTile[i] = field;
            }

            for (let i = 0; i < W * H; i++) {
                const c = cls[i];
                if ((c !== 16 && c !== 64 && c !== 128) || seen[i]) { continue; }

                // composante connexe de même classe
                const comp = [];
                const queue = [i];
                seen[i] = true;
                while (queue.length) {
                    const j = queue.pop();
                    comp.push(j);
                    const x = j % W;
                    const y = (j / W) | 0;
                    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= W || ny >= H) { continue; }
                        const k = ny * W + nx;
                        if (!seen[k] && cls[k] === c) { seen[k] = true; queue.push(k); }
                    }
                }

                // ancre = tuile la plus au nord à l'écran (x+y puis x−y min)
                comp.sort((a, b) => {
                    const ra = (a % W) + ((a / W) | 0);
                    const rb = (b % W) + ((b / W) | 0);
                    return ra - rb || ((a % W) - ((a / W) | 0)) - ((b % W) - ((b / W) | 0));
                });
                const ax = comp[0] % W;
                const ay = (comp[0] / W) | 0;

                if (c === 16) {
                    // classe 16 = SLOTS DE VILLAGE (4 tuiles isolées par
                    // comté, sur fond d'herbe) : un village y apparaît selon
                    // la population. Chaque composante connexe est une seule
                    // tuile ; on garde la tuile et son comté.
                    for (const t of comp) {
                        features.villages.push({ x: t % W, y: (t / W) | 0, county: county[t] });
                    }
                } else if (c === 64) {
                    features.towns.push({ x: ax, y: ay, county: county[comp[0]] });
                } else {
                    // Industries can touch a castle and therefore belong to
                    // the same class-128 component. Find the actual 2x2
                    // castle footprint before retaining the remaining sites.
                    const set = new Set(comp);
                    const candidates = comp
                        .filter(t => t % W < W - 1
                            && set.has(t + 1) && set.has(t + W) && set.has(t + W + 1))
                        .map(t => {
                            const tiles = [t, t + 1, t + W, t + W + 1];
                            const score = tiles.reduce((sum, tile) =>
                                sum + (terrain[tile] === 30 ? 100 : ([0, 20].includes(terrain[tile]) ? 1 : 0)), 0);
                            return { tiles, score };
                        })
                        .filter(candidate => comp.every(tile =>
                            candidate.tiles.includes(tile) || MAP_INDUSTRY_KINDS.includes(terrain[tile])))
                        .sort((a, b) => a.score - b.score);
                    const castleTiles = new Set(candidates[0]?.tiles || (comp.length >= 3 ? comp : []));
                    if (castleTiles.size) {
                        const anchor = [...castleTiles].sort((a, b) => {
                            const ra = (a % W) + ((a / W) | 0);
                            const rb = (b % W) + ((b / W) | 0);
                            return ra - rb || ((a % W) - ((a / W) | 0)) - ((b % W) - ((b / W) | 0));
                        })[0];
                        features.castles.push({ x: anchor % W, y: (anchor / W) | 0, county: county[anchor] });
                    }
                    for (const t of comp.filter(tile => !castleTiles.has(tile))) {
                        if (!MAP_INDUSTRY_KINDS.includes(terrain[t])) { continue; }
                        features.industries.push({ x: t % W, y: (t / W) | 0, kind: terrain[t], county: county[t] });
                    }
                }
            }

            // The blacksmith shop is visible for every county in the DOS
            // game, next to the county town. The map data does not mark it
            // with a separate class; the practical marker is a nearby grass
            // tile using terrain variants 10/19 in the same county.
            for (const town of features.towns) {
                let best = null;
                for (let t = 0; t < W * H; t++) {
                    if (county[t] !== town.county || cls[t] !== 0 || ![10, 19].includes(terrain[t])) { continue; }
                    const x = t % W;
                    const y = (t / W) | 0;
                    const d = Math.abs(x - town.x) + Math.abs(y - town.y);
                    const score = d * 10 + (terrain[t] === 10 ? 0 : 1);
                    if (!best || score < best.score) {
                        best = { x, y, county: town.county, kind: 10, score };
                    }
                }
                if (best) {
                    delete best.score;
                    features.blacksmiths.push(best);
                }
            }
            return features;
        }

        fieldTexture (field)
        {
            const f = this.state.fields[field.key];
            const use = f ? f.use : 'grain';
            const boundaryVariant = field.boundaryVariant || 0;
            if (use === 'barren') {
                // chantier en cours : la parcelle remise en état grandit
                // avec la progression (bande 108-125), sinon broussaille
                if (f.reclaim) {
                    return [this.roadsKey, RECLAIM_BAND + Math.min(RECLAIM_LEN - 1, Math.floor(f.reclaim * RECLAIM_LEN))];
                }
                return [this.roadsKey, FIELD_FRAMES.barren + boundaryVariant];
            }
            if (use === 'damaged') {
                return f.damageKind === 'parched'
                    ? [this.roadsKey, PARCHED_BAND + boundaryVariant]
                    : [this.roadsKey, FLOOD_BAND + boundaryVariant];
            }
            if (use === 'grain') {
                // Crop density selects one of three groups. County borders
                // select the matching variant inside that group.
                const c = f && this.state.counties[f.county];
                const fields = c ? this.state.fieldsOf(c.id, 'grain').length : 0;
                const ratio = (c && fields > 0) ? Math.min(1, c.plantedSacks / (fields * 10)) : 0;
                if (ratio <= 0) {
                    return [this.roadsKey, FIELD_FRAMES.bare + boundaryVariant];
                }
                const density = Math.min(GRAIN_BANDS.length - 1, Math.ceil(ratio * GRAIN_BANDS.length) - 1);
                return [this.roadsKey, GRAIN_BANDS[density] + boundaryVariant];
            }
            // vaches : même pré clôturé que la jachère (vérifié sur le DOS,
            // le carré de clôture cerne le pré sous les bêtes)
            return [this.roadsKey, FIELD_FRAMES.fallow + boundaryVariant];
        }

        assignField (field, use)
        {
            const f = this.state.fields[field.key];
            if (!f || !this.state.canAssignField(field.key)) { return; }
            const previousUse = f.use;
            f.use = use;
            const county = this.state.counties[f.county];
            if (county) {
                if (previousUse === 'grain' && use !== 'grain') {
                    county.plantedSacks = Math.max(0, (county.plantedSacks || 0) - 10);
                }
                this.state.autoAllocateLabor(county.id);
            }
            const [key, frame] = this.fieldTexture(field);
            for (const img of field.images) { img.setTexture(key, frame); }

            // vaches sur les champs affectés à l'élevage
            for (const spr of field.cowSprites) { spr.destroy(); }
            field.cowSprites = [];
            if (use === 'cattle') {
                this.refreshCountyHerdSprites(f.county);
            } else if (county) {
                this.refreshCountyHerdSprites(county.id);
            }
            this.refreshCountyPane();
            // Field assignment happens inside a pointer event shared with
            // the map and dialog handlers. Refresh once more after that event
            // has fully settled so the grain forecast always reflects the
            // final field count immediately.
            this.time.delayedCall(0, () => this.refreshCountyPane());
            if (this.advancedLaborDialog && this.advancedLaborDialog.visible) {
                this.refreshAdvancedLaborDialog();
            }
        }

        refreshCountyHerdSprites (countyId)
        {
            const fields = new Map();
            for (const field of Object.values(this.features.fieldOfTile || {})) {
                if (field && this.state.fields[field.key]?.county === countyId) {
                    fields.set(field.key, field);
                }
            }
            for (const field of fields.values()) {
                for (const spr of field.cowSprites || []) { spr.destroy(); }
                field.cowSprites = [];
            }
            const density = this.herdDensity(countyId);
            if (density < 0) { return; }
            for (const field of fields.values()) {
                if (this.state.fields[field.key]?.use !== 'cattle') { continue; }
                const W = 64;
                for (const t of field.tiles) {
                    const spr = this.addHerdSprite(t % W, (t / W) | 0, density);
                    if (spr) { field.cowSprites.push(spr); }
                }
            }
        }

        // Nombre de villages affichés (0-4) sur les slots de classe 16
        // d'un comté, selon sa population. Mécanique de l'aide : « As a
        // population grows, villages will also appear outside of the
        // county town » (la ville grossit d'abord, les villages ensuite).
        // Seuils exacts tirés du binaire : L2D.EXE @ 0x81AB0 et
        // LORDS2.EXE @ 0x3DA30 comparent successivement la population à
        // 600, 1000, 1400 et 1600 avec un saut strictement supérieur.
        // Les villages apparaissent donc à 601, 1001, 1401 et 1601.
        villageCount (c)
        {
            const VILLAGE_POP_MAX = [600, 1000, 1400, 1600];
            let n = 0;
            for (const t of VILLAGE_POP_MAX) { if (c.population > t) { n++; } }
            return n;
        }

        // Densité du troupeau affiché : -1 = champ vide, puis 0/1/2 pour
        // 1/2/3 figures de vaches par champ selon le crowding du comté.
        herdDensity (countyId)
        {
            const c = this.state.counties[countyId];
            if (!c) { return -1; }
            return this.state.cattleHerdSpriteIndex(c);
        }

        // Vaches animées sur la tuile (x,y) : sprites 58×30 alignés sur le
        // losange, 6 frames, départ décalé pour désynchroniser les bêtes.
        // L'art « printemps » (FLAGS1A) est utilisé toute l'année : c'est
        // celui validé contre le DOS ; les variantes saisonnières B/C/D
        // (vaches couchées, plus petites) restent extraites, à confirmer.
        addHerdSprite (x, y, density)
        {
            if (density < 0) { return null; }
            const seasonKey = 'spring';
            const key = `herd-${seasonKey}-${density}`;
            if (!this.anims.exists(key)) {
                this.anims.create({
                    key,
                    frames: Array.from({ length: 6 }, (_, f) => ({ key: `herd-${seasonKey}-${density}-${f}` })),
                    frameRate: 2,
                    repeat: -1
                });
            }
            const tx = 64 * 29 + (x - y) * 29 - 29;
            const ty = (x + y) * 15 - 15;
            const spr = this.add.sprite(tx, ty, `herd-${seasonKey}-${density}-0`).setOrigin(0);
            spr.play({ key, startFrame: (x * 3 + y) % 6 });
            this.map.add(spr);
            return spr;
        }

        // Panneau d'affectation d'un champ, calqué sur l'original : parchemin
        // avec le nom du comté, « Farm land — <usage> », la vignette de
        // l'usage courant, un descriptif, et en bas trois icônes (blé /
        // jachère / vaches, photos d'ICONVILL) pour réaffecter le champ.
        // Clic droit (ou clic à côté) pour annuler. Clics résolus en
        // coordonnées écran (objets à scrollFactor 0).
        buildFieldDialog ()
        {
            const x = 70;
            const y = 110;
            const w = 340;
            const h = 230;
            this.fieldDialogRect = { x, y, w, h };
            this.fieldDialogField = null;

            const DESCRIPTIONS = {
                grain: t('campaign.field.desc.grain'),
                fallow: t('campaign.field.desc.fallow'),
                cattle: t('campaign.field.desc.cattle'),
                barren: t('campaign.field.desc.barren'),
                reclaiming: t('campaign.field.desc.reclaiming'),
                parched: t('campaign.field.desc.parched'),
                flooded: t('campaign.field.desc.flooded')
            };
            this.fieldDialogDescs = DESCRIPTIONS;

            const bg = this.add.rectangle(0, 0, w, h, 0xd8bc7e).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
            const inner = this.add.rectangle(4, 4, w - 8, h - 8, 0xd8bc7e, 0).setOrigin(0).setStrokeStyle(1, 0x8a6a38);
            this.fieldDialogTitle = this.add.bitmapText(w / 2, 8, 'lords2-big', '').setOrigin(0.5, 0).setTint(0x1c1208);
            this.fieldDialogSub = this.add.text(16, 38, '', { font: `15px ${FONT_FAMILY}`, fill: '#1c1208' }).setOrigin(0, 0);
            this.fieldDialogThumb = this.add.image(16, 64, 'icon-grain').setOrigin(0);
            this.fieldDialogDesc = this.add.text(76, 70, '', { font: `12px ${FONT_FAMILY}`, fill: '#2a1c0c' }).setOrigin(0, 0);

            const children = [bg, inner, this.fieldDialogTitle, this.fieldDialogSub, this.fieldDialogThumb, this.fieldDialogDesc];

            this.fieldDialogHint = this.add.text(16, h - 64, '', { font: `12px ${FONT_FAMILY}`, fill: '#2a1c0c' }).setOrigin(0, 0);
            children.push(this.fieldDialogHint);

            // boutons d'usage (blé/jachère/vaches) + fermier de la remise en
            // état : tous créés ici, montrés selon l'état du champ à
            // l'ouverture (un champ subi n'est pas réaffectable, cf. aide)
            this.fieldDialogAllOptions = [];
            ['grain', 'fallow', 'cattle'].forEach((use, k) => {
                const ox = w - 3 * 58 - 12 + k * 58;
                const oy = h - 64;
                const frame = this.add.rectangle(ox - 2, oy - 2, 52, 52, 0, 0).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
                const img = this.add.image(ox, oy, `icon-${use}`).setOrigin(0);
                children.push(frame, img);
                this.fieldDialogAllOptions.push({ use, x: ox - 2, y: oy - 2, w: 52, h: 52, objs: [frame, img] });
            });
            {
                const ox = w - 2 * 58 - 12;
                const oy = h - 64;
                const frame = this.add.rectangle(ox - 2, oy - 2, 52, 52, 0, 0).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
                const img = this.add.image(ox, oy, 'icon-reclaim').setOrigin(0);
                children.push(frame, img);
                this.fieldDialogAllOptions.push({ use: 'reclaim', x: ox - 2, y: oy - 2, w: 52, h: 52, objs: [frame, img] });
            }
            this.fieldDialogOptions = [];

            this.fieldDialog = this.add.container(x, y, children).setScrollFactor(0).setDepth(150).setVisible(false);

            this.input.on('pointerdown', (pointer) => {
                if (!this.fieldDialog.visible) { return; }
                // le clic qui vient d'ouvrir le panneau (gestionnaire de la
                // carte, déclenché avant celui-ci dans le même événement) ne
                // doit pas le refermer
                if (this.fieldDialogJustOpened) { this.fieldDialogJustOpened = false; return; }
                if (!pointer.rightButtonDown()) {
                    const lx = pointer.x - this.fieldDialogRect.x;
                    const ly = pointer.y - this.fieldDialogRect.y;
                    const opt = this.fieldDialogOptions.find(o => lx >= o.x && lx < o.x + o.w && ly >= o.y && ly < o.y + o.h);
                    if (opt && this.fieldDialogField) {
                        if (opt.use === 'reclaim') { this.state.startReclaim(this.fieldDialogField.key); }
                        else { this.assignField(this.fieldDialogField, opt.use); }
                    }
                }
                this.fieldDialog.setVisible(false);
                this.fieldDialogField = null;
            });
        }

        dialogOpen ()
        {
            return this.menuOpen()
                || (this.fieldDialog && this.fieldDialog.visible)
                || (this.taxDialog && this.taxDialog.visible)
                || (this.populationReport && this.populationReport.container.visible)
                || (this.happinessReport && this.happinessReport.container.visible)
                || (this.rationsDialog && this.rationsDialog.visible)
                || (this.advancedLaborDialog && this.advancedLaborDialog.visible)
                || (this.laborInfoDialog && this.laborInfoDialog.visible)
                || (this.heraldDialog && this.heraldDialog.visible)
                || (this.castleDialog && this.castleDialog.visible)
                || (this.treasuryDialog && this.treasuryDialog.visible)
                || (this.merchantDialog && this.merchantDialog.visible)
                || (this.blacksmithDialog && this.blacksmithDialog.visible)
                || (this.armyDialog && this.armyDialog.visible);
        }

        // Écran du château (clic sur un château) : design actuel, chantier
        // en cours, et lancement de la construction du design suivant pour
        // les comtés du joueur.
        buildCastleDialog ()
        {
            const w = 330;
            const h = 210;
            const bg = this.add.rectangle(0, 0, w, h, 0xd8bc7e).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
            const inner = this.add.rectangle(4, 4, w - 8, h - 8, 0, 0).setOrigin(0).setStrokeStyle(1, 0x8a6a38);
            this.castleTitle = this.add.bitmapText(w / 2, 10, 'lords2-big', '').setOrigin(0.5, 0).setTint(0x1c1208);
            this.castleBody = this.add.text(20, 46, '', { font: `13px ${FONT_FAMILY}`, fill: '#2a1c0c', lineSpacing: 5 }).setOrigin(0, 0);
            this.castleBuildBtn = this.add.text(w / 2, h - 48, '', { font: `14px ${FONT_FAMILY}`, fill: '#7c1c1c' }).setOrigin(0.5, 0);
            const hint = this.add.text(w / 2, h - 22, t('campaign.hint.closeRight'), { font: `11px ${FONT_FAMILY}`, fill: '#5a4a28' }).setOrigin(0.5, 0);

            this.castleDialogRect = { x: 80, y: 115, w, h };
            this.castleDialog = this.add.container(this.castleDialogRect.x, this.castleDialogRect.y, [bg, inner, this.castleTitle, this.castleBody, this.castleBuildBtn, hint])
                .setScrollFactor(0).setDepth(150).setVisible(false);

            this.input.on('pointerdown', (pointer) => {
                if (!this.castleDialog.visible) { return; }
                if (this.castleDialogJustOpened) { this.castleDialogJustOpened = false; return; }
                // clic sur « Begin construction » (bande de 24 px autour du bouton)
                if (!pointer.rightButtonDown() && this.castleCanBuild) {
                    const lx = pointer.x - this.castleDialogRect.x;
                    const ly = pointer.y - this.castleDialogRect.y;
                    if (ly >= this.castleDialogRect.h - 54 && ly < this.castleDialogRect.h - 26 && lx > 20 && lx < this.castleDialogRect.w - 20) {
                        if (this.state.startCastleUpgrade(this.castleDialogCounty)) {
                            this.openCastleDialog(this.castleDialogCounty);
                            this.castleDialogJustOpened = true;
                        }
                        return;
                    }
                }
                this.castleDialog.setVisible(false);
            });
        }

        openCastleDialog (countyId)
        {
            const c = this.state.counties[countyId];
            if (!c) { return; }
            const noble = c.owner !== null ? this.state.nobles[c.owner] : null;
            this.castleTitle.setText(c.name);

            const lines = [t('campaign.castle.castle', { name: tCastle(CASTLES[c.castleLevel].name) })];
            this.castleCanBuild = false;
            this.castleBuildBtn.setText('');

            if (c.castleBuild) {
                lines.push('', t('campaign.castle.underConstruction', { name: tCastle(CASTLES[c.castleBuild.target].name) }),
                    t('campaign.castle.seasonsRemaining', { n: c.castleBuild.remaining }));
            } else if (noble && noble.isPlayer && CASTLES[c.castleLevel + 1]) {
                const next = CASTLES[c.castleLevel + 1];
                const cost = Object.entries(next.cost).map(([r, q]) => q + ' ' + tResource(r)).join(', ');
                const affordable = Object.entries(next.cost).every(([r, q]) => (noble[r] || 0) >= q);
                lines.push('', t('campaign.castle.nextDesign', { name: tCastle(next.name) }),
                    t('campaign.castle.cost', { cost, seasons: next.seasons }));
                if (affordable) {
                    this.castleCanBuild = true;
                    this.castleDialogCounty = countyId;
                    this.castleBuildBtn.setText(t('campaign.castle.begin'));
                } else {
                    lines.push(t('campaign.castle.notEnough'));
                }
            }

            this.castleBody.setText(lines.join('\n'));
            this.castleDialogJustOpened = true;
            this.castleDialog.setVisible(true);
        }

        // Écran de levée d'armée : effectif ajustable, aperçu du coût en
        // bonheur et des armes disponibles, minimum 50 hommes (l'aide).
        buildArmyDialog ()
        {
            const w = 320;
            const h = 210;
            this.armyDialogRect = { x: 90, y: 115, w, h };
            this.armyDialogMen = 100;

            const bg = this.add.rectangle(0, 0, w, h, 0xd8bc7e).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
            const inner = this.add.rectangle(4, 4, w - 8, h - 8, 0, 0).setOrigin(0).setStrokeStyle(1, 0x8a6a38);
            this.armyTitle = this.add.bitmapText(w / 2, 10, 'lords2-big', t('campaign.army.title')).setOrigin(0.5, 0).setTint(0x1c1208);
            this.armyBody = this.add.text(22, 48, '', { font: `13px ${FONT_FAMILY}`, fill: '#2a1c0c', lineSpacing: 5 }).setOrigin(0, 0);
            const minus = this.add.text(60, h - 76, '[ -25 ]', { font: `14px ${FONT_FAMILY}`, fill: '#7c1c1c' }).setOrigin(0.5, 0);
            const plus = this.add.text(w - 60, h - 76, '[ +25 ]', { font: `14px ${FONT_FAMILY}`, fill: '#1c5c1c' }).setOrigin(0.5, 0);
            this.armyRaiseBtn = this.add.text(w / 2, h - 50, t('campaign.army.raise'), { font: `14px ${FONT_FAMILY}`, fill: '#7c1c1c' }).setOrigin(0.5, 0);
            const hint = this.add.text(w / 2, h - 24, t('campaign.hint.cancelRight'), { font: `11px ${FONT_FAMILY}`, fill: '#5a4a28' }).setOrigin(0.5, 0);

            this.armyDialog = this.add.container(this.armyDialogRect.x, this.armyDialogRect.y, [bg, inner, this.armyTitle, this.armyBody, minus, plus, this.armyRaiseBtn, hint])
                .setScrollFactor(0).setDepth(150).setVisible(false);

            this.input.on('pointerdown', (pointer) => {
                if (!this.armyDialog.visible) { return; }
                if (this.armyDialogJustOpened) { this.armyDialogJustOpened = false; return; }
                if (pointer.rightButtonDown()) { this.armyDialog.setVisible(false); return; }

                const lx = pointer.x - this.armyDialogRect.x;
                const ly = pointer.y - this.armyDialogRect.y;
                if (ly >= this.armyDialogRect.h - 80 && ly < this.armyDialogRect.h - 56) {
                    if (lx < this.armyDialogRect.w / 2) { this.armyDialogMen = Math.max(50, this.armyDialogMen - 25); }
                    else { this.armyDialogMen += 25; }
                    this.refreshArmyDialog();
                    return;
                }
                if (ly >= this.armyDialogRect.h - 54 && ly < this.armyDialogRect.h - 30) {
                    if (this.state.createArmy(this.state.selectedCounty, this.armyDialogMen)) {
                        this.armyDialog.setVisible(false);
                        this.restartKeepingCamera();
                    }
                    return;
                }
                this.armyDialog.setVisible(false);
            });
        }

        refreshArmyDialog ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            if (!c) { return; }
            const men = this.armyDialogMen;
            const weapons = this.state.player.weapons;
            const happinessCost = c.population > men ? Math.round(men / (c.population - men) * 30) : 99;
            const wages = Math.ceil(men / 25);
            const feasible = c.owner === 0 && men >= 50 && c.population >= men + 50 && c.happiness > 0;
            this.armyBody.setText([
                t('campaign.army.popLine', { county: c.name, pop: c.population }),
                '',
                t('campaign.army.conscript', { men }),
                t('campaign.army.armed', { armed: Math.min(men, weapons), total: weapons }),
                t('campaign.army.wages', { n: wages }),
                t('campaign.army.happinessCost', { n: happinessCost }),
                feasible ? '' : t('campaign.army.cannot')
            ].join('\n'));
            this.armyRaiseBtn.setColor(feasible ? '#1c5c1c' : '#8a8a8a');
        }

        openArmyDialog ()
        {
            this.armyDialogMen = 100;
            this.refreshArmyDialog();
            this.armyDialogJustOpened = true;
            this.armyDialog.setVisible(true);
        }

        // Écran du marchand : achat/vente de denrées (blé/vaches du comté
        // sélectionné) et de matériaux (trésor). Clic gauche sur [Buy] /
        // [Sell] = 10 unités ; clic droit pour fermer.
        buildMerchantDialog ()
        {
            const w = 330;
            const h = 250;
            this.merchantRows = ['grain', 'cows', 'wood', 'stone', 'iron', 'weapons'];
            this.merchantDialogRect = { x: 80, y: 100, w, h };

            const bg = this.add.rectangle(0, 0, w, h, 0xd8bc7e).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
            const inner = this.add.rectangle(4, 4, w - 8, h - 8, 0, 0).setOrigin(0).setStrokeStyle(1, 0x8a6a38);
            this.merchantTitle = this.add.bitmapText(w / 2, 8, 'lords2-big', t('campaign.merchant.title')).setOrigin(0.5, 0).setTint(0x1c1208);
            const children = [bg, inner, this.merchantTitle];

            this.merchantTexts = {};
            this.merchantRows.forEach((res, k) => {
                const y = 44 + k * 28;
                this.merchantTexts[res] = this.add.text(18, y, '', { font: `13px ${FONT_FAMILY}`, fill: '#2a1c0c' }).setOrigin(0, 0);
                children.push(this.merchantTexts[res]);
                children.push(this.add.text(w - 116, y, t('campaign.merchant.buy'), { font: `13px ${FONT_FAMILY}`, fill: '#1c5c1c' }).setOrigin(0, 0));
                children.push(this.add.text(w - 64, y, t('campaign.merchant.sell'), { font: `13px ${FONT_FAMILY}`, fill: '#7c1c1c' }).setOrigin(0, 0));
            });
            children.push(this.add.text(w / 2, h - 24, t('campaign.merchant.hint'), { font: `11px ${FONT_FAMILY}`, fill: '#5a4a28' }).setOrigin(0.5, 0));

            this.merchantDialog = this.add.container(this.merchantDialogRect.x, this.merchantDialogRect.y, children)
                .setScrollFactor(0).setDepth(150).setVisible(false);

            this.input.on('pointerdown', (pointer) => {
                if (!this.merchantDialog.visible) { return; }
                if (this.merchantDialogJustOpened) { this.merchantDialogJustOpened = false; return; }
                if (pointer.rightButtonDown()) { this.merchantDialog.setVisible(false); return; }

                const lx = pointer.x - this.merchantDialogRect.x;
                const ly = pointer.y - this.merchantDialogRect.y;
                const k = Math.floor((ly - 44) / 28);
                if (k >= 0 && k < this.merchantRows.length && ly >= 44) {
                    const res = this.merchantRows[k];
                    if (lx >= this.merchantDialogRect.w - 116 && lx < this.merchantDialogRect.w - 70) {
                        this.state.trade(this.state.selectedCounty, res, 10);
                    } else if (lx >= this.merchantDialogRect.w - 64 && lx < this.merchantDialogRect.w - 18) {
                        this.state.trade(this.state.selectedCounty, res, -10);
                    } else if (lx >= 0 && lx < this.merchantDialogRect.w) {
                        return; // clic dans le panneau hors boutons : rien
                    }
                    this.refreshMerchant();
                    this.refreshCountyPane();
                    this.crownsText.setText(t('campaign.crowns', { n: this.state.player.crowns }));
                    return;
                }
                this.merchantDialog.setVisible(false);
            });
        }

        refreshMerchant ()
        {
            const c = this.state.counties[this.state.selectedCounty];
            const p = this.state.player;
            for (const res of this.merchantRows) {
                const stock = res === 'grain' ? (c ? c.grainStock : 0) : (res === 'cows' ? (c ? c.cows : 0) : (p[res] || 0));
                this.merchantTexts[res].setText(t('campaign.merchant.row', {
                    name: tResource(res), stock, buy: PRICES[res].buy, sell: PRICES[res].sell
                }));
            }
        }

        openMerchantDialog ()
        {
            this.merchantTitle.setText(t('campaign.merchant.titleCounty', { county: (this.state.counties[this.state.selectedCounty] || {}).name }));
            this.refreshMerchant();
            this.merchantDialogJustOpened = true;
            this.merchantDialog.setVisible(true);
        }

        // Forge (blacksmith, spec §3.5) : choix de l'UNIQUE type d'arme
        // produit par le comté. Liste les 6 types avec leur coût bois/fer,
        // surligne celui en cours, et clic = bascule la production. Habillage
        // original (CASPICS/forge) ❓ à extraire — parchemin provisoire.
        buildBlacksmithDialog ()
        {
            const background = this.add.image(0, 0, 'blacksmith-background').setOrigin(0);
            const footer = this.add.tileSprite(0, 360, 478, 96, 'parchment').setOrigin(0);
            this.blacksmithWeapon = this.add.image(0, 360, 'blacksmith-sword').setOrigin(0, 1);
            this.blacksmithTitle = this.add.bitmapText(16, 363, 'lords2-big', t('campaign.blacksmith.title')).setTint(0x1c1208);
            this.blacksmithStatus = this.add.bitmapText(17, 397, 'lords2', '').setTint(0x1c1208);
            this.blacksmithHint = this.add.bitmapText(76, 435, 'lords2', t('campaign.blacksmith.hint'))
                .setTint(0x1c1208);
            const costBox = this.add.rectangle(329, 365, 132, 33, 0, 0)
                .setOrigin(0).setStrokeStyle(1, 0xc9a860);
            const ironIcon = this.add.image(342, 381, 'MiscCityAtlas', 'labourIron').setScale(0.7);
            const woodIcon = this.add.image(410, 381, 'MiscCityAtlas', 'labourLumber').setScale(0.75);
            this.blacksmithIron = this.add.bitmapText(367, 370, 'lords2', '').setTint(0x1c1208);
            this.blacksmithWood = this.add.bitmapText(448, 370, 'lords2', '').setOrigin(1, 0).setTint(0x1c1208);
            const close = this.add.image(448, 420, RATIONS_UI('close')).setOrigin(0);

            this.blacksmithDialog = this.add.container(0, 24, [
                background, this.blacksmithWeapon, footer, this.blacksmithTitle,
                this.blacksmithStatus, this.blacksmithHint, costBox, ironIcon,
                woodIcon, this.blacksmithIron, this.blacksmithWood, close
            ]).setScrollFactor(0).setDepth(90).setVisible(false);

            this.blacksmithWeaponHits = [
                { id: 'bow', x: 0, y: 45, w: 75, h: 150 },
                { id: 'pike', x: 160, y: 65, w: 70, h: 150 },
                { id: 'knight', x: 225, y: 70, w: 65, h: 180 },
                { id: 'mace', x: 290, y: 65, w: 65, h: 150 },
                { id: 'crossbow', x: 350, y: 20, w: 80, h: 115 },
                { id: 'sword', x: 395, y: 120, w: 83, h: 125 }
            ];

            this.input.on('pointerdown', (pointer) => {
                if (!this.blacksmithDialog.visible) { return; }
                if (this.blacksmithDialogJustOpened) { this.blacksmithDialogJustOpened = false; return; }
                const lx = pointer.x;
                const ly = pointer.y - 24;
                if (pointer.rightButtonDown() || (lx >= 440 && ly >= 410)) {
                    this.blacksmithDialog.setVisible(false);
                    this.openAdvancedLaborDialog(this.blacksmithCounty);
                    return;
                }
                const weapon = this.blacksmithWeaponHits.find(hit =>
                    lx >= hit.x && lx < hit.x + hit.w && ly >= hit.y && ly < hit.y + hit.h
                );
                if (weapon) {
                    this.state.setWeaponType(this.blacksmithCounty, weapon.id);
                    this.refreshBlacksmith();
                }
            });
        }

        refreshBlacksmith ()
        {
            const c = this.state.counties[this.blacksmithCounty];
            if (!c || c.owner === null) { return; }
            const noble = this.state.nobles[c.owner];
            const current = WEAPON_DEFS[c.weaponType] ? c.weaponType : 'sword';
            this.blacksmithWeapon.setTexture(`blacksmith-${current}`);

            // cadence projetée du type courant : main-d'œuvre puis matériaux
            const def = WEAPON_DEFS[current];
            const smiths = c.laborAllocations ? (c.laborAllocations.smithy || 0) : 0;
            const made = this.state.previewCountyProduction(c).smithy || 0;
            this.blacksmithStatus.setText([
                t('campaign.blacksmith.smiths', { n: smiths }),
                t('campaign.blacksmith.willProduce', { n: made, weapon: tWeapon(def.name) })
            ].join('\n'));
            this.blacksmithIron.setText(String(def.iron));
            this.blacksmithWood.setText(String(def.wood));
        }

        openBlacksmithDialog (countyId)
        {
            const c = this.state.counties[countyId];
            if (!c || c.owner !== 0 || !c.hasWorkshop) { return; }
            this.blacksmithCounty = countyId;
            this.refreshBlacksmith();
            this.blacksmithDialogJustOpened = true;
            this.blacksmithDialog.setVisible(true);
        }

        // Trésorerie (clic sur les couronnes du bandeau) : l'or et les
        // matériaux du trésor unique du joueur.
        buildTreasuryDialog ()
        {
            const w = 240;
            const h = 250;
            const bg = this.add.rectangle(0, 0, w, h, 0xd8bc7e).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
            const inner = this.add.rectangle(4, 4, w - 8, h - 8, 0, 0).setOrigin(0).setStrokeStyle(1, 0x8a6a38);
            const title = this.add.bitmapText(w / 2, 10, 'lords2-big', t('campaign.treasury.title')).setOrigin(0.5, 0).setTint(0x1c1208);
            this.treasuryBody = this.add.text(28, 46, '', { font: `14px ${FONT_FAMILY}`, fill: '#2a1c0c', lineSpacing: 6 }).setOrigin(0, 0);

            this.treasuryDialog = this.add.container(200, 120, [bg, inner, title, this.treasuryBody])
                .setScrollFactor(0).setDepth(150).setVisible(false);

            this.input.on('pointerdown', (pointer) => {
                if (this.treasuryDialog.visible) {
                    if (this.treasuryDialogJustOpened) { this.treasuryDialogJustOpened = false; return; }
                    this.treasuryDialog.setVisible(false);
                    return;
                }
                // ouverture : clic sur la zone des couronnes du bandeau
                if (!this.dialogOpen() && pointer.y < 24 && pointer.x >= 540) {
                    this.openTreasuryDialog();
                }
            });
        }

        openTreasuryDialog ()
        {
            const p = this.state.player;
            const by = this.state.weaponsBreakdown(p);
            const owned = WEAPON_TYPES.filter(d => (by[d.id] || 0) > 0)
                .map(d => t('campaign.treasury.weaponLine', { name: tWeapon(d.name), n: by[d.id] }));
            this.treasuryBody.setText([
                t('campaign.treasury.crowns', { n: p.crowns }),
                t('campaign.treasury.wood', { n: p.wood }),
                t('campaign.treasury.stone', { n: p.stone }),
                t('campaign.treasury.iron', { n: p.iron }),
                t('campaign.treasury.weapons', { n: p.weapons }),
                ...owned
            ].join('\n'));
            this.treasuryDialogJustOpened = true;
            this.treasuryDialog.setVisible(true);
        }

        buildAdvancedLaborDialog ()
        {
            const w = 363;
            const h = 320;
            this.advancedLaborRect = { x: 66, y: 67, w, h };
            const bg = this.add.image(0, 0, 'advanced-labor-background').setOrigin(0);

            this.advancedLaborSites = {
                primary: this.add.image(12, 12, 'labor-site-iron').setOrigin(0),
                wood: this.add.image(108, 230, 'labor-site-wood').setOrigin(0)
            };

            const close = this.add.image(326, 286, 'labor-close').setOrigin(0)
                .setInteractive({ useHandCursor: true });
            const closeHit = this.add.rectangle(318, 278, 40, 39, 0xffffff, 0.001)
                .setOrigin(0).setInteractive({ useHandCursor: true });
            const closeDialog = (pointer) => {
                if (pointer && pointer.event) { pointer.event.stopPropagation(); }
                this.closeAdvancedLaborDialog();
            };
            close.on('pointerdown', closeDialog);
            closeHit.on('pointerdown', closeDialog);
            close.setScale(0.74);
            this.advancedLaborClose = { close, hit: closeHit };
            this.advancedLaborDragBox = this.add.rectangle(0, 0, 1, 1, 0x1b1208, 0.08)
                .setOrigin(0).setStrokeStyle(1, 0xffee80).setVisible(false);
            this.advancedLaborMovingCursor = this.add.image(0, 0, 'labor-unit-moving')
                .setOrigin(0.5, 1)
                .setAlpha(0.95)
                .setVisible(false);

            this.advancedLaborDialog = this.add.container(this.advancedLaborRect.x, this.advancedLaborRect.y,
                [bg, ...Object.values(this.advancedLaborSites), close, closeHit, this.advancedLaborDragBox, this.advancedLaborMovingCursor])
                .setScrollFactor(0).setDepth(150).setVisible(false);

            const slots = {
                iron: { x: 25, y: 35, w: 85, h: 65, cx: 67, cy: 67 },
                stone: { x: 25, y: 20, w: 85, h: 75, cx: 67, cy: 67 },
                grain: { x: 144, y: 12, w: 86, h: 86, cx: 187, cy: 63 },
                cattle: { x: 270, y: 12, w: 80, h: 80, cx: 313, cy: 46 },
                reclaim: { x: 8, y: 110, w: 103, h: 63, cx: 58, cy: 141 },
                smithy: { x: 8, y: 216, w: 96, h: 100, cx: 55, cy: 266 },
                idle: { x: 146, y: 105, w: 80, h: 78, cx: 186, cy: 144 },
                wood: { x: 108, y: 170, w: 152, h: 95, cx: 174, cy: 262, place: { x: 150, y: 184, w: 70, h: 94 } },
                castle: { x: 258, y: 174, w: 90, h: 74, cx: 303, cy: 211 }
            };
            this.advancedLaborSlots = {};

            // DEBUG : passer à true pour visualiser les rectangles de slot (bord
            // 1px rouge) des activités disponibles. À remettre à false ensuite.
            const DEBUG_LABOR_SLOTS = true;

            for (const [id, slot] of Object.entries(slots)) {
                const hit = this.add.rectangle(slot.x, slot.y, slot.w, slot.h, 0xffffff, 0.001)
                    .setOrigin(0).setInteractive({ useHandCursor: true });
                const selection = this.add.rectangle(slot.x + 2, slot.y + 2, slot.w - 4, slot.h - 4, 0, 0)
                    .setOrigin(0).setStrokeStyle(1, 0xffee80).setVisible(false);
                const placeRect = slot.place || slot;
                const debugBorder = this.add.rectangle(placeRect.x, placeRect.y, placeRect.w, placeRect.h, 0, 0)
                    .setOrigin(0).setStrokeStyle(1, 0xff0000).setVisible(false);

                this.advancedLaborDialog.add([hit, selection, debugBorder]);
                this.advancedLaborSlots[id] = { ...slot, hit, selection, debugBorder, debugSlots: DEBUG_LABOR_SLOTS, figures: [] };
            }
            // Les zones d'activité sont ajoutées après le bouton : le
            // replacer au sommet évite que celle du château intercepte
            // son clic.
            this.advancedLaborDialog.bringToTop(close);
            this.advancedLaborDialog.bringToTop(closeHit);
            const pointInLaborRect = (rect, x, y) =>
                x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
            const laborFigureEntryAt = (lx, ly) => {
                const entries = Object.entries(this.advancedLaborSlots)
                    .filter(([, slot]) => slot.hit.visible);
                for (const [id, slot] of entries) {
                    for (let index = slot.figures.length - 1; index >= 0; index--) {
                        const figure = slot.figures[index];
                        if (this.laborFigureContains(figure, lx, ly)) {
                            return { id, figure };
                        }
                    }
                }
                return null;
            };
            const laborEntryAt = (lx, ly) => {
                const entries = Object.entries(this.advancedLaborSlots)
                    .filter(([, slot]) => slot.hit.visible);
                const figureEntry = laborFigureEntryAt(lx, ly);
                if (figureEntry) { return [figureEntry.id, this.advancedLaborSlots[figureEntry.id]]; }
                const placedEntry = entries.find(([, slot]) =>
                    slot.place && pointInLaborRect(slot.place, lx, ly)
                );
                if (placedEntry) { return placedEntry; }
                return entries.find(([, slot]) => pointInLaborRect(slot, lx, ly));
            };

            this.laborInfoBg = this.add.tileSprite(0, 0, 400, 168, 'parchment').setOrigin(0);
            this.laborInfoBorder = this.add.rectangle(0, 0, 400, 168, 0, 0).setOrigin(0).setStrokeStyle(2, 0x2b1b0b);
            this.laborInfoIcon = this.add.image(17, 14, 'labor-icon-grain').setOrigin(0);
            this.laborInfoTitle = this.add.bitmapText(82, 12, 'lords2-big', '').setOrigin(0, 0).setTint(0x1c1208);
            this.laborInfoTopLine = this.add.bitmapText(82, 47, 'lords2', '').setOrigin(0, 0).setTint(0x1c1208);
            this.laborInfoRightLine = this.add.bitmapText(242, 47, 'lords2', '').setOrigin(0, 0).setTint(0x1c1208);
            this.laborInfoBody = this.add.bitmapText(20, 84, 'lords2', '').setOrigin(0, 0).setTint(0x1c1208).setMaxWidth(360);
            this.laborInfoToggleText = this.add.bitmapText(20, 126, 'lords2', '').setOrigin(0, 0).setTint(0x7c1c1c);
            this.laborInfoToggleHit = this.add.rectangle(16, 118, 270, 24, 0xffffff, 0.001)
                .setOrigin(0).setInteractive({ useHandCursor: true }).setVisible(false);
            this.laborInfoClose = this.add.image(374, 139, 'labor-close').setOrigin(0).setScale(0.8).setInteractive({ useHandCursor: true });
            this.laborInfoCloseHit = this.add.rectangle(364, 129, 36, 39, 0xffffff, 0.001)
                .setOrigin(0).setInteractive({ useHandCursor: true });
            const infoClose = this.laborInfoClose;
            const closeInfo = (pointer) => {
                pointer.event.stopPropagation();
                this.laborInfoDialog.setVisible(false);
            };
            infoClose.on('pointerdown', closeInfo);
            this.laborInfoCloseHit.on('pointerdown', closeInfo);
            this.laborInfoToggleHit.on('pointerdown', (pointer) => {
                if (pointer.event) { pointer.event.stopPropagation(); }
                if (!this.laborInfoActivity || !this.advancedLaborCounty) { return; }
                if (this.state.toggleLaborActivity(this.advancedLaborCounty, this.laborInfoActivity)) {
                    const county = this.state.counties[this.advancedLaborCounty];
                    if (county && county.laborVisualCounts) { county.laborVisualCounts.__version = 0; }
                    this.refreshAdvancedLaborDialog();
                    this.refreshCountyPane();
                    this.openLaborInfo(this.laborInfoActivity);
                }
            });
            this.laborInfoDialog = this.add.container(this.advancedLaborRect.x - 18, this.advancedLaborRect.y + 28,
                [this.laborInfoBg, this.laborInfoBorder, this.laborInfoIcon, this.laborInfoTitle,
                    this.laborInfoTopLine, this.laborInfoRightLine, this.laborInfoBody,
                    this.laborInfoToggleText, this.laborInfoToggleHit, infoClose, this.laborInfoCloseHit])
                .setScrollFactor(0).setDepth(170).setVisible(false);

            this.input.on('pointerdown', (pointer) => {
                if (!this.advancedLaborDialog.visible) { return; }
                const lx = pointer.x - this.advancedLaborRect.x;
                const ly = pointer.y - this.advancedLaborRect.y;
                if (!pointer.rightButtonDown() && lx >= 318 && lx < 358 && ly >= 278 && ly < 317) {
                    this.closeAdvancedLaborDialog();
                    if (pointer.event) { pointer.event.stopPropagation(); }
                    return;
                }
                if (!pointer.rightButtonDown() && this.laborInfoDialog.visible) {
                    const ix = pointer.x - (this.advancedLaborRect.x - 18);
                    const iy = pointer.y - (this.advancedLaborRect.y + 28);
                    if (this.laborInfoToggleHit.visible && ix >= 16 && ix < 286 && iy >= this.laborInfoToggleHit.y && iy < this.laborInfoToggleHit.y + 24) {
                        if (this.laborInfoActivity && this.state.toggleLaborActivity(this.advancedLaborCounty, this.laborInfoActivity)) {
                            const county = this.state.counties[this.advancedLaborCounty];
                            if (county && county.laborVisualCounts) { county.laborVisualCounts.__version = 0; }
                            this.refreshAdvancedLaborDialog();
                            this.refreshCountyPane();
                            this.openLaborInfo(this.laborInfoActivity);
                        }
                        if (pointer.event) { pointer.event.stopPropagation(); }
                        return;
                    }
                    if (ix >= 360 && ix < 400 && iy >= this.laborInfoHeight - 42 && iy < this.laborInfoHeight) {
                        this.laborInfoDialog.setVisible(false);
                        if (pointer.event) { pointer.event.stopPropagation(); }
                        return;
                    }
                }
                if (this.advancedLaborDialogJustOpened) {
                    this.advancedLaborDialogJustOpened = false;
                    return;
                }
                if (pointer.rightButtonDown()) {
                    if (this.laborInfoDialog.visible) { this.laborInfoDialog.setVisible(false); }
                    else { this.closeAdvancedLaborDialog(); }
                    return;
                }
                if (this.laborInfoDialog.visible) { return; }

                const entry = laborEntryAt(lx, ly);
                if (!entry) { return; }
                const figureEntry = laborFigureEntryAt(lx, ly);
                this.advancedLaborPointer = {
                    id: entry[0],
                    startX: lx,
                    startY: ly,
                    startFigure: figureEntry && figureEntry.id === entry[0] ? {
                        x: figureEntry.figure.laborCenterX !== undefined ? figureEntry.figure.laborCenterX : figureEntry.figure.x,
                        y: figureEntry.figure.laborCenterY !== undefined ? figureEntry.figure.laborCenterY : figureEntry.figure.y,
                        amount: Math.max(1, Math.round(figureEntry.figure.laborAmount || 1))
                    } : null,
                    dragging: false,
                    detail: pointer.event ? pointer.event.detail : 1
                };
            });

            this.input.on('pointermove', (pointer) => {
                if (!this.advancedLaborDialog.visible) { return; }
                this.updateAdvancedLaborMovingCursor(pointer);
                if (!this.advancedLaborPointer || !pointer.isDown) { return; }
                const lx = Phaser.Math.Clamp(pointer.x - this.advancedLaborRect.x, 0, this.advancedLaborRect.w);
                const ly = Phaser.Math.Clamp(pointer.y - this.advancedLaborRect.y, 0, this.advancedLaborRect.h);
                const drag = this.advancedLaborPointer;
                if (!drag.dragging && Math.abs(lx - drag.startX) + Math.abs(ly - drag.startY) < 3) { return; }
                drag.dragging = true;
                const x = Math.min(drag.startX, lx);
                const y = Math.min(drag.startY, ly);
                this.advancedLaborDragBox
                    .setPosition(x, y)
                    .setSize(Math.abs(lx - drag.startX), Math.abs(ly - drag.startY))
                    .setVisible(true);
            });

            this.input.on('pointerup', (pointer) => {
                if (!this.advancedLaborDialog.visible || !this.advancedLaborPointer) { return; }
                const drag = this.advancedLaborPointer;
                this.advancedLaborPointer = null;
                this.advancedLaborDragBox.setVisible(false);
                const lx = pointer.x - this.advancedLaborRect.x;
                const ly = pointer.y - this.advancedLaborRect.y;
                const dropEntry = laborEntryAt(lx, ly);
                if (drag.dragging && dropEntry && dropEntry[0] !== drag.id) {
                    if (drag.startFigure) {
                        this.moveSingleLaborFigure(drag.id, dropEntry[0], drag.startFigure);
                        return;
                    }
                    const rect = new Phaser.Geom.Rectangle(
                        Math.min(drag.startX, lx),
                        Math.min(drag.startY, ly),
                        Math.abs(lx - drag.startX),
                        Math.abs(ly - drag.startY)
                    );
                    const selection = this.laborFiguresInRect(drag.id, rect);
                    if (selection.amount > 0) {
                        this.moveLaborFigures(drag.id, dropEntry[0], selection.amount, selection.figures);
                        return;
                    }
                }
                if (this.selectedLaborGroup && this.selectedLaborAmount > 0 && dropEntry && dropEntry[0] !== this.selectedLaborGroup) {
                    this.selectLaborGroup(dropEntry[0], false);
                    return;
                }
                if (drag.dragging) {
                    const rect = new Phaser.Geom.Rectangle(
                        Math.min(drag.startX, lx),
                        Math.min(drag.startY, ly),
                        Math.abs(lx - drag.startX),
                        Math.abs(ly - drag.startY)
                    );
                    this.selectLaborFigures(drag.id, rect);
                    return;
                }
                const entry = dropEntry;
                if (!entry) { return; }
                const id = entry[0];
                const doubleClick = id === 'idle' && (drag.detail >= 2 || !!this.laborIdleClickTimer);
                if (doubleClick) {
                    this.cancelLaborIdleClick();
                    this.selectLaborGroup(id, doubleClick);
                } else if (this.selectedLaborGroup || id === 'smithy') {
                    this.selectLaborGroup(id, false);
                } else if (id === 'idle') {
                    this.cancelLaborIdleClick();
                    this.laborIdleClickTimer = this.time.delayedCall(260, () => {
                        this.laborIdleClickTimer = null;
                        if (this.advancedLaborDialog.visible && !this.laborInfoDialog.visible) {
                            this.openLaborInfo('idle');
                        }
                    });
                } else {
                    this.openLaborInfo(id);
                }
            });
        }

        closeAdvancedLaborDialog ()
        {
            this.cancelLaborIdleClick();
            this.laborInfoDialog.setVisible(false);
            this.advancedLaborDialog.setVisible(false);
            this.advancedLaborCounty = null;
            this.selectedLaborGroup = null;
            this.selectedLaborAmount = 0;
            this.selectedLaborFigureCount = 0;
            this.selectedLaborFigures = [];
            this.advancedLaborPointer = null;
            if (this.advancedLaborDragBox) { this.advancedLaborDragBox.setVisible(false); }
            if (this.advancedLaborMovingCursor) { this.advancedLaborMovingCursor.setVisible(false); }
        }

        cancelLaborIdleClick ()
        {
            if (!this.laborIdleClickTimer) { return; }
            this.laborIdleClickTimer.remove(false);
            this.laborIdleClickTimer = null;
        }

        openAdvancedLaborDialog (countyId)
        {
            const county = this.state.counties[countyId];
            if (!county || county.owner !== 0) { return; }
            this.advancedLaborCounty = countyId;
            this.selectedLaborGroup = null;
            this.selectedLaborAmount = 0;
            this.selectedLaborFigureCount = 0;
            this.selectedLaborFigures = [];
            this.state.ensureLabor(county);
            this.refreshAdvancedLaborDialog();
            this.advancedLaborDialogJustOpened = true;
            this.time.delayedCall(0, () => { this.advancedLaborDialogJustOpened = false; });
            this.advancedLaborDialog.setVisible(true);
        }

        refreshAdvancedLaborDialog ()
        {
            const county = this.state.counties[this.advancedLaborCounty];
            if (!county) { return; }
            const snapshot = this.state.ensureLabor(county);
            const activities = this.state.laborActivities(county);
            const byId = Object.fromEntries(activities.map(activity => [activity.id, activity]));
            const available = new Set(activities.map(activity => activity.id));
            const primaryIndustry = county.hasQuarry ? 'stone' : (county.hasMine ? 'iron' : null);
            const reclaimingFields = this.state.fieldsOf(county.id).filter(field => field.reclaim !== undefined).length;
            available.delete('stone');
            available.delete('iron');
            if (primaryIndustry) { available.add(primaryIndustry); }
            available.add('idle');
            available.add('castle');
            available.add('reclaim');
            available.add('smithy');

            if (primaryIndustry) {
                this.advancedLaborSites.primary
                    .setTexture(primaryIndustry === 'stone' ? 'labor-site-quarry' : 'labor-site-iron')
                    .setVisible(true);
            } else {
                this.advancedLaborSites.primary.setVisible(false);
            }
            this.advancedLaborSites.wood.setVisible(!!county.hasLumberMill || available.has('wood'));

            const manifest = this.cache.json.get('labor-dos-workers') || { sprites: {} };
            const hasActiveGrainField = this.state.fieldsOf(county.id, 'grain').length > 0 && (county.plantedSacks || 0) > 0;
            const hasActiveCattleField = this.state.fieldsOf(county.id, 'cattle').length > 0;
            const unitByTask = {
                grain: hasActiveGrainField ? 'grain-active' : 'grain',
                wood: 'wood',
                cattle: hasActiveCattleField ? 'cattle' : 'surplus-inactive',
                iron: 'iron',
                stone: 'stone'
            };
            const uncappedActiveTasks = new Set(['wood', 'stone', 'iron']);
            const unitLayouts = {
                grain: [
                    [153, 12], [180, 9], [206, 15],
                    [143, 44], [170, 48], [196, 45], [219, 58]
                ],
                wood: [
                    [126, 170], [150, 174], [173, 179],
                    [116, 198], [139, 205], [163, 207],
                    [130, 231], [154, 232]
                ],
                cattle: [
                    [294, 5], [314, 4], [333, 4],
                    [304, 27], [324, 28], [343, 29],
                    [288, 49], [309, 51], [330, 53], [350, 55]
                ],
                iron: [
                    [58, 32], [79, 38], [45, 46], [99, 50]
                ],
                stone: [
                    [15, 20], [39, 16], [63, 16], [87, 20],
                    [12, 43], [36, 41], [60, 42], [84, 44],
                    [20, 66], [48, 64], [76, 66]
                ],
                reclaim: [
                    [28, 110], [61, 110], [30, 131],
                    [63, 131], [27, 153], [61, 153]
                ],
                castle: [
                    [264, 151], [286, 166], [307, 181], [248, 186], [271, 203]
                ],
                smithyActive: [
                    [47, 231], [28, 238]
                ],
                smithyInactive: [
                    [38, 259], [63, 260], [88, 260], [50, 282]
                ],
                idle: [
                    [142, 125], [169, 123], [196, 126],
                    [151, 148], [178, 151], [205, 151]
                ]
            };
            const visualCounts = county.laborVisualCounts || (county.laborVisualCounts = {});
            const VISUAL_COUNT_VERSION = 7;
            const DEFAULT_VISUAL_BUDGET = 25;
            const visualUnitWeight = () =>
                Math.max(1, snapshot.workforce / DEFAULT_VISUAL_BUDGET);
            const visibleCountForWorkers = (workers, cap = Number.POSITIVE_INFINITY) => {
                const count = Math.ceil(Math.max(0, workers || 0) / visualUnitWeight());
                return Phaser.Math.Clamp(count, 0, Math.max(0, cap));
            };
            const laborTargetRect = (slot, opts = {}) => {
                const pad = 3;
                const base = slot.place || slot;
                const rect = {
                    x: base.x + pad,
                    y: base.y + pad,
                    w: Math.max(1, base.w - pad * 2),
                    h: Math.max(1, base.h - pad * 2)
                };
                if (opts.region === 'top') {
                    rect.h = Math.max(1, Math.floor(rect.h * 0.55));
                } else if (opts.region === 'bottom') {
                    const top = Math.floor(rect.h * 0.48);
                    rect.y += top;
                    rect.h = Math.max(1, rect.h - top);
                } else if (opts.region === 'smithy-active') {
                    rect.x = slot.x + 10;
                    rect.y = slot.y + 13;
                    rect.w = Math.max(1, slot.w - 22);
                    rect.h = 46;
                } else if (opts.region === 'smithy-inactive') {
                    rect.x = slot.x + 12;
                    rect.y = slot.y + 70;
                    rect.w = Math.max(1, slot.w - 20);
                    rect.h = Math.max(1, slot.h - 76);
                } else if (opts.region === 'left') {
                    rect.w = Math.max(1, Math.floor(rect.w * 0.58));
                } else if (opts.region === 'right') {
                    const left = Math.floor(rect.w * 0.48);
                    rect.x += left;
                    rect.w = Math.max(1, rect.w - left);
                }
                return rect;
            };
            const staggeredCapacity = (slot, unitName, opts = {}) => {
                const spec = manifest.units ? manifest.units[unitName] : null;
                if (!spec) { return 1; }
                const rect = laborTargetRect(slot, opts);
                const w = Math.max(1, spec.w || 1);
                const h = Math.max(1, spec.h || 1);
                let columns = Math.max(1, Math.floor((rect.w + w * 0.25) / Math.max(6, w * 0.75)));
                if (opts.maxColumns) { columns = Math.min(columns, opts.maxColumns); }
                const minStepY = Math.max(1, opts.minStepY || h * 0.58);
                const rows = Math.max(1, Math.floor(Math.max(0, rect.h - h) / minStepY) + 1);
                return Math.max(1, Math.min(42, columns * rows));
            };
            const visibleLaborFigureCount = (id, workers, need, layoutName = id, maxCountOverride = null) => {
                const layout = unitLayouts[layoutName] || [];
                const maxCount = maxCountOverride || layout.length || 1;
                const maxVisible = Math.min(maxCount, visibleCountForWorkers(workers, maxCount));
                if (maxVisible <= 0) {
                    visualCounts[id] = 0;
                    return 0;
                }
                if (visualCounts[id] === undefined) {
                    visualCounts[id] = maxVisible;
                }
                visualCounts[id] = Phaser.Math.Clamp(visualCounts[id], 0, maxVisible);
                return visualCounts[id];
            };
            const addLaborUnit = (slot, id, unitName, x, y, opts = {}) => {
                const spec = manifest.units ? manifest.units[unitName] : null;
                if (!spec) { return null; }
                const figure = this.add.image(x, y, `labor-unit-${unitName}`)
                    .setOrigin(0)
                    .setInteractive({ useHandCursor: true });
                figure.laborAmount = opts.amount !== undefined ? opts.amount : (opts.black ? 0 : 1);
                const w = spec.w || figure.width || 0;
                const h = spec.h || figure.height || 0;
                figure.laborCenterX = x + (0.5 - figure.originX) * w;
                figure.laborCenterY = y + (0.5 - figure.originY) * h;
                const hitMarginX = Math.max(2, Math.floor(w * 0.25));
                const hitMarginY = Math.max(1, Math.floor(h * 0.08));
                figure.laborHitBox = unitName === 'smithy-active' ? {
                    x: hitMarginX,
                    y: hitMarginY,
                    w: Math.max(4, w - hitMarginX * 2),
                    h: Math.max(4, Math.floor(h * 0.45))
                } : {
                    x: hitMarginX,
                    y: hitMarginY,
                    w: Math.max(4, w - hitMarginX * 2),
                    h: Math.max(4, h - hitMarginY * 2)
                };
                if (opts.black) { figure.setTint(0x111111); }
                if (this.isLaborFigureSelected(id, figure)) { figure.setTint(0xffff70); }
                this.advancedLaborDialog.add(figure);
                slot.figures.push(figure);
                return figure;
            };
            const positionLaborFigure = (figure, x, y) => {
                if (!figure) { return; }
                figure.setPosition(x, y);
                const w = figure.displayWidth || figure.width || 0;
                const h = figure.displayHeight || figure.height || 0;
                figure.laborCenterX = x + (0.5 - figure.originX) * w;
                figure.laborCenterY = y + (0.5 - figure.originY) * h;
            };
            const fitLaborLayoutToSlot = (slot, unitName, layout, count) => {
                const spec = manifest.units ? manifest.units[unitName] : null;
                if (!spec || !layout.length || count <= 0) { return layout; }
                const w = spec.w || 0;
                const h = spec.h || 0;
                const pad = 2;
                const target = slot.place || slot;
                const safe = {
                    x: target.x + pad,
                    y: target.y + pad,
                    w: Math.max(1, target.w - pad * 2),
                    h: Math.max(1, target.h - pad * 2)
                };
                const points = layout.slice(0, count);
                const minX = Math.min(...points.map(([x]) => x));
                const maxX = Math.max(...points.map(([x]) => x + w));
                const minY = Math.min(...points.map(([, y]) => y));
                const maxY = Math.max(...points.map(([, y]) => y + h));
                const minTopX = Math.min(...points.map(([x]) => x));
                const maxTopX = Math.max(...points.map(([x]) => x));
                const minTopY = Math.min(...points.map(([, y]) => y));
                const maxTopY = Math.max(...points.map(([, y]) => y));
                const fitAxis = (value, min, max, minTop, maxTop, size, safeStart, safeSize) => {
                    if (max - min <= safeSize) {
                        let shift = 0;
                        if (min < safeStart) { shift = safeStart - min; }
                        if (max + shift > safeStart + safeSize) { shift = safeStart + safeSize - max; }
                        return value + shift;
                    }
                    const range = maxTop - minTop;
                    const available = Math.max(0, safeSize - size);
                    return safeStart + (range > 0 ? (value - minTop) / range * available : available / 2);
                };
                return points.map(([x, y]) => [
                    fitAxis(x, minX, maxX, minTopX, maxTopX, w, safe.x, safe.w),
                    fitAxis(y, minY, maxY, minTopY, maxTopY, h, safe.y, safe.h)
                ]);
            };
            const staggeredLaborLayout = (slot, unitName, count, opts = {}) => {
                const spec = manifest.units ? manifest.units[unitName] : null;
                if (!spec || count <= 0) { return []; }
                const rect = laborTargetRect(slot, opts);
                const w = Math.max(1, spec.w || 1);
                const h = Math.max(1, spec.h || 1);
                const density = Phaser.Math.Clamp((count - 1) / Math.max(1, (opts.capacity || count) - 1), 0, 1);
                const gapX = Phaser.Math.Linear(8, 0, density);
                const gapY = Phaser.Math.Linear(6, 0, density);
                let stepX = Math.max(6, w * Phaser.Math.Linear(1.15, 0.62, density) + gapX * 0.15);
                const stepY = Math.max(7, h * Phaser.Math.Linear(1.05, 0.50, density) + gapY * 0.15);
                let columns = Math.max(1, Math.min(count, Math.floor((rect.w + stepX * 0.5) / stepX)));
                if (opts.maxColumns) { columns = Math.min(columns, opts.maxColumns); }
                if (opts.minRows) { columns = Math.min(columns, Math.ceil(count / opts.minRows)); }
                columns = Math.max(1, columns);
                if (opts.fillWidth && columns > 1) {
                    stepX = Math.max(stepX, (rect.w - w) / (columns - 1));
                }
                const alternatingRows = opts.alternatingRows !== false;
                const rowCounts = [];
                let remaining = count;
                while (remaining > 0) {
                    const rowCapacity = alternatingRows && rowCounts.length % 2 === 0
                        ? Math.max(1, columns - 1)
                        : columns;
                    const rowCount = Math.min(rowCapacity, remaining);
                    rowCounts.push(rowCount);
                    remaining -= rowCount;
                }
                const rows = Math.max(1, rowCounts.length);
                const yStep = rows > 1
                    ? Math.min(stepY, Math.max(1, (rect.h - h) / (rows - 1)))
                    : stepY;
                const usedH = Math.min(rect.h, h + (rows - 1) * yStep);
                const startY = rect.y + Math.max(0, (rect.h - usedH) / 2);
                const points = [];
                for (let row = 0; row < rowCounts.length; row++) {
                    const rowCount = rowCounts[row];
                    const rowW = w + (rowCount - 1) * stepX;
                    const startX = rect.x + Math.max(0, (rect.w - rowW) / 2);
                    for (let col = 0; col < rowCount; col++) {
                        const x = Phaser.Math.Clamp(startX + col * stepX, rect.x, rect.x + Math.max(0, rect.w - w));
                        const y = Phaser.Math.Clamp(startY + row * yStep, rect.y, rect.y + Math.max(0, rect.h - h));
                        points.push([x, y]);
                    }
                }
                return points;
            };
            const laborAmountForIndex = (workers, count, index) => {
                const total = Math.max(0, Math.round(workers || 0));
                const n = Math.max(0, Math.round(count || 0));
                if (total <= 0 || n <= 0) { return 0; }
                // A persona is one indivisible slice of the county-wide
                // 25-persona budget. Never inflate its weight merely because
                // a task's placement area displays fewer figures.
                const unitWeight = visualUnitWeight();
                const start = Math.round(index * unitWeight);
                const end = Math.min(total, Math.round((index + 1) * unitWeight));
                return Math.max(0, end - start);
            };
            const addLaborCluster = (slot, id, unitName, workers, opts = {}) => {
                const layout = unitLayouts[opts.layout || id] || [];
                const dynamicCapacity = opts.dynamic ? staggeredCapacity(slot, unitName, opts) : null;
                const maxCount = opts.maxCount || dynamicCapacity || layout.length || 1;
                const laborFigureCount = () => {
                    if (opts.count !== undefined) { return opts.count; }
                    const n = Math.max(0, workers);
                    if (n <= 0) { return 0; }
                    const need = Math.max(0, opts.need || 0);
                    if (need > 0) {
                        const usefulLimit = Math.max(1, Math.ceil(maxCount * 0.72));
                        const useful = Math.max(1, Math.round(Math.min(n, need) / need * usefulLimit));
                        const surplusSlots = maxCount - usefulLimit;
                        const surplus = Math.max(0, n - need);
                        const extra = surplus > 0 && surplusSlots > 0
                            ? Math.max(1, Math.ceil(surplus / need * surplusSlots))
                            : 0;
                        return Phaser.Math.Clamp(useful + extra, 1, maxCount);
                    }
                    return Math.min(maxCount, n);
                };
                const requested = opts.count !== undefined
                    ? opts.count
                    : laborFigureCount();
                const count = Phaser.Math.Clamp(requested, 0, maxCount);
                const fittedLayout = opts.dynamic
                    ? staggeredLaborLayout(slot, unitName, count, { ...opts, capacity: maxCount })
                    : fitLaborLayoutToSlot(slot, unitName, layout, count);
                for (let index = 0; index < count; index++) {
                    const [x, y] = fittedLayout[index % fittedLayout.length] || [slot.cx, slot.cy];
                    const amount = opts.black ? 0 : laborAmountForIndex(workers, count, index);
                    addLaborUnit(slot, id, unitName, x, y, { ...opts, amount });
                }
            };
            const addMixedLaborCluster = (slot, id, activeUnitName, activeWorkers, inactiveWorkers, activeCount, inactiveCount, opts = {}) => {
                const count = activeCount + inactiveCount;
                if (count <= 0) { return; }
                const capacity = staggeredCapacity(slot, activeUnitName, opts);
                const layout = staggeredLaborLayout(slot, activeUnitName, count, { ...opts, capacity });
                for (let index = 0; index < count; index++) {
                    const inactiveIndex = index - activeCount;
                    const isInactive = inactiveIndex >= 0;
                    const unitName = isInactive ? 'surplus-inactive' : activeUnitName;
                    const amount = isInactive
                        ? laborAmountForIndex(inactiveWorkers, inactiveCount, inactiveIndex)
                        : laborAmountForIndex(activeWorkers, activeCount, index);
                    const [x, y] = layout[index] || [slot.cx, slot.cy];
                    addLaborUnit(slot, id, unitName, x, y, { amount });
                }
            };
            const addMissingLaborFigures = (slot, id, workers, need, unitName, opts = {}) => {
                const missingWorkers = Math.max(0, (byId[id]?.missingNeed || 0) - workers);
                if (!unitName || missingWorkers <= 0 || byId[id]?.operational === false) { return; }
                const missingCount = Phaser.Math.Clamp(
                    Math.ceil(missingWorkers / visualUnitWeight()),
                    0,
                    42
                );
                if (missingCount <= 0) { return; }

                const actualFigures = [...slot.figures];
                const totalCount = actualFigures.length + missingCount;
                if (actualFigures.length > 0 && totalCount >= 8) {
                    const shadows = [];
                    for (let index = 0; index < missingCount; index++) {
                        shadows.push(addLaborUnit(slot, id, 'missing', slot.cx, slot.cy, { amount: 0 }));
                    }
                    const capacity = Math.max(totalCount, staggeredCapacity(slot, unitName, opts));
                    const layout = staggeredLaborLayout(slot, unitName, totalCount, { ...opts, capacity });
                    const ordered = [...actualFigures, ...shadows];
                    ordered.forEach((figure, index) => {
                        if (!layout[index]) { return; }
                        positionLaborFigure(figure, layout[index][0], layout[index][1]);
                        this.advancedLaborDialog.bringToTop(figure);
                    });
                    return;
                }
                if (actualFigures.length > 0) {
                    const activeLayout = staggeredLaborLayout(slot, unitName, actualFigures.length, {
                        ...opts,
                        region: 'top',
                        capacity: staggeredCapacity(slot, unitName, { ...opts, region: 'top' })
                    });
                    actualFigures.forEach((figure, index) => {
                        if (activeLayout[index]) { positionLaborFigure(figure, activeLayout[index][0], activeLayout[index][1]); }
                    });
                }
                const missingRegion = actualFigures.length > 0 ? 'bottom' : undefined;
                const missingLayout = staggeredLaborLayout(slot, 'missing', missingCount, {
                    ...opts,
                    region: missingRegion,
                    capacity: staggeredCapacity(slot, 'missing', { ...opts, region: missingRegion })
                });
                for (let index = 0; index < missingCount; index++) {
                    const [x, y] = missingLayout[index] || [slot.cx, slot.cy];
                    addLaborUnit(slot, id, 'missing', x, y, { amount: 0 });
                }
            };
            const workersForActivity = id =>
                id === 'idle' ? snapshot.idle : (county.laborAllocations[id] || 0);
            const capacityForActivity = (id, workers, need) => {
                const slot = this.advancedLaborSlots[id];
                if (!slot || workers <= 0) { return 0; }
                if (id === 'idle') {
                    return Math.min(workers, staggeredCapacity(slot, 'surplus-inactive', { region: 'center' }));
                }
                if (id === 'reclaim') {
                    return Math.min(workers,
                        staggeredCapacity(slot, 'reclaim-active', { region: 'left' })
                        + staggeredCapacity(slot, 'surplus-inactive', { region: 'right' }));
                }
                if (id === 'smithy') {
                    return Math.min(workers,
                        staggeredCapacity(slot, 'smithy-active', { region: 'smithy-active' })
                        + staggeredCapacity(slot, 'surplus-inactive', { region: 'smithy-inactive' }));
                }
                if (id === 'castle' && !county.castleBuild) {
                    return Math.min(workers, staggeredCapacity(slot, 'surplus-inactive'));
                }
                const unitName = id === 'castle' ? 'castle-active' : unitByTask[id];
                if (!unitName) { return 0; }
                if (!uncappedActiveTasks.has(id) && need > 0 && workers > need) {
                    return Math.min(workers,
                        staggeredCapacity(slot, unitName, { region: 'top' })
                        + staggeredCapacity(slot, 'surplus-inactive', { region: 'bottom' }));
                }
                return Math.min(workers, staggeredCapacity(slot, unitName));
            };
            const buildDefaultVisualCounts = () => {
                const entries = Object.keys(this.advancedLaborSlots)
                    .filter(id => available.has(id))
                    .map(id => {
                        const workers = workersForActivity(id);
                        const need = byId[id] ? byId[id].need : 0;
                        const cap = capacityForActivity(id, workers, need);
                        return { id, cap, workers, count: 0 };
                    })
                    .filter(entry => entry.cap > 0 && entry.workers > 0);
                const totalCap = entries.reduce((sum, entry) => sum + entry.cap, 0);
                const totalWorkers = entries.reduce((sum, entry) => sum + entry.workers, 0);
                for (const entry of entries) {
                    entry.count = visibleCountForWorkers(entry.workers, entry.cap);
                }
                return Object.fromEntries(entries.map(entry => [entry.id, entry.count]));
            };
            if (visualCounts.__version !== VISUAL_COUNT_VERSION) {
                for (const key of Object.keys(visualCounts)) { delete visualCounts[key]; }
                Object.assign(visualCounts, buildDefaultVisualCounts());
                visualCounts.__version = VISUAL_COUNT_VERSION;
            }
            for (const key of Object.keys(visualCounts)) {
                if (key !== '__version' && !available.has(key)) { delete visualCounts[key]; }
            }
            for (const id of Object.keys(this.advancedLaborSlots)) {
                if (!available.has(id)) { continue; }
                const workers = workersForActivity(id);
                const need = byId[id] ? byId[id].need : 0;
                const cap = capacityForActivity(id, workers, need);
                if (workers <= 0 || cap <= 0) {
                    visualCounts[id] = 0;
                    continue;
                }
                if (visualCounts[id] === undefined) { continue; }
                visualCounts[id] = Phaser.Math.Clamp(Math.round(visualCounts[id] || 0), 0, visibleCountForWorkers(workers, cap));
            }
            const addFallbackIdleFigures = (slot, id, workers) => {
                const count = Phaser.Math.Clamp(workers, 0, 10);
                const columns = Math.min(5, count);
                const rows = Math.ceil(count / 5);
                for (let index = 0; index < count; index++) {
                    const col = index % 5;
                    const row = Math.floor(index / 5);
                    const x = slot.cx + (col - (columns - 1) / 2) * 20;
                    const y = slot.cy + (row - (rows - 1) / 2) * 21;
                    const figure = this.add.image(x, y, 'labor-figure-idle')
                        .setInteractive({ useHandCursor: true });
                    figure.laborAmount = laborAmountForIndex(workers, count, index);
                    figure.laborCenterX = x + (0.5 - figure.originX) * figure.width;
                    figure.laborCenterY = y + (0.5 - figure.originY) * figure.height;
                    const hitMarginX = Math.max(2, Math.floor(figure.width * 0.25));
                    const hitMarginY = Math.max(1, Math.floor(figure.height * 0.08));
                    figure.laborHitBox = {
                        x: hitMarginX,
                        y: hitMarginY,
                        w: Math.max(4, figure.width - hitMarginX * 2),
                        h: Math.max(4, figure.height - hitMarginY * 2)
                    };
                    if (this.isLaborFigureSelected(id, figure)) { figure.setTint(0xffff70); }
                    this.advancedLaborDialog.add(figure);
                    slot.figures.push(figure);
                }
            };

            for (const [id, slot] of Object.entries(this.advancedLaborSlots)) {
                const visible = available.has(id);
                slot.hit.setVisible(visible);
                if (slot.debugBorder) { slot.debugBorder.setVisible(visible && slot.debugSlots); }
                const selectedFigureCount = this.selectedLaborFigures ? this.selectedLaborFigures.length : 0;
                slot.selection.setVisible(visible && this.selectedLaborGroup === id && selectedFigureCount === 0 && this.selectedLaborAmount > 0);
                for (const figure of slot.figures) { figure.destroy(); }
                slot.figures = [];
                if (!visible) { continue; }

                const workers = id === 'idle' ? snapshot.idle : (county.laborAllocations[id] || 0);
                const need = byId[id] ? byId[id].need : 0;
                if (id === 'idle') {
                    if (workers > 0) {
                        const maxIdleFigures = staggeredCapacity(slot, 'surplus-inactive', { region: 'center' });
                        addLaborCluster(slot, id, 'surplus-inactive', workers, {
                            layout: 'idle',
                            count: visibleLaborFigureCount(id, workers, 0, 'idle', maxIdleFigures),
                            maxCount: maxIdleFigures,
                            dynamic: true
                        });
                    }
                    continue;
                }
                if (id === 'reclaim') {
                    const activeWorkers = need > 0 ? Phaser.Math.Clamp(Math.min(workers, need), 0, workers) : 0;
                    const maxActiveFigures = staggeredCapacity(slot, 'reclaim-active', { region: 'left' });
                    const maxInactiveFigures = staggeredCapacity(slot, 'surplus-inactive', { region: 'right' });
                    const visibleWorkers = visibleLaborFigureCount(id, workers, need, 'reclaim',
                        maxActiveFigures + maxInactiveFigures);
                    const activeVisible = activeWorkers > 0 && visibleWorkers > 0
                        ? Phaser.Math.Clamp(Math.round(visibleWorkers * activeWorkers / Math.max(1, workers)), 1, Math.min(visibleWorkers, maxActiveFigures))
                        : 0;
                    const inactiveVisible = Phaser.Math.Clamp(visibleWorkers - activeVisible, 0, maxInactiveFigures);
                    if (activeVisible > 0) {
                        addLaborCluster(slot, id, 'reclaim-active', activeWorkers, {
                            need,
                            count: activeVisible,
                            maxCount: maxActiveFigures,
                            dynamic: true,
                            region: 'left'
                        });
                    }
                    if (inactiveVisible > 0) {
                        addLaborCluster(slot, id, 'surplus-inactive', workers - activeWorkers, {
                            layout: 'reclaim',
                            count: inactiveVisible,
                            maxCount: maxInactiveFigures,
                            dynamic: true,
                            region: 'right'
                        });
                    }
                    addMissingLaborFigures(slot, id, workers, need, 'reclaim-active');
                    continue;
                }
                if (id === 'smithy') {
                    const activeCapacity = this.state.laborUsefulCapacity(county, byId[id]);
                    const activeWorkers = Phaser.Math.Clamp(Math.min(workers, activeCapacity), 0, workers);
                    const maxActiveFigures = staggeredCapacity(slot, 'smithy-active', { region: 'smithy-active' });
                    const maxInactiveFigures = staggeredCapacity(slot, 'surplus-inactive', { region: 'smithy-inactive' });
                    const maxSmithyFigures = maxActiveFigures + maxInactiveFigures;
                    const visibleWorkers = visibleLaborFigureCount(id, workers, need, 'smithyInactive', maxSmithyFigures);
                    const activeVisible = activeWorkers > 0 && visibleWorkers > 0
                        ? Phaser.Math.Clamp(Math.round(visibleWorkers * activeWorkers / Math.max(1, workers)), 1, Math.min(visibleWorkers, maxActiveFigures))
                        : 0;
                    const inactiveVisible = Phaser.Math.Clamp(visibleWorkers - activeVisible, 0, maxInactiveFigures);
                    if (activeVisible > 0) {
                        addLaborCluster(slot, id, 'smithy-active', activeWorkers, {
                            layout: 'smithyActive',
                            count: activeVisible,
                            maxCount: maxActiveFigures,
                            dynamic: true,
                            region: 'smithy-active'
                        });
                    }
                    if (inactiveVisible > 0) {
                        addLaborCluster(slot, id, 'surplus-inactive', workers - activeWorkers, {
                            layout: 'smithyInactive',
                            count: inactiveVisible,
                            maxCount: maxInactiveFigures,
                            dynamic: true,
                            region: 'smithy-inactive'
                        });
                    }
                    addMissingLaborFigures(slot, id, workers, need, 'smithy-active');
                    continue;
                }
                if (id === 'castle' && !county.castleBuild) {
                    if (workers > 0) {
                        const maxCastleFigures = staggeredCapacity(slot, 'surplus-inactive');
                        addLaborCluster(slot, id, 'surplus-inactive', workers, {
                            layout: 'castle',
                            count: visibleLaborFigureCount(id, workers, need, 'castle', maxCastleFigures),
                            maxCount: maxCastleFigures,
                            dynamic: true
                        });
                    }
                    continue;
                }
                const unitName = id === 'castle' ? 'castle-active' : unitByTask[id];
                if (!unitName) { continue; }
                const activeLayout = id === 'grain'
                    ? {
                        maxColumns: 6,
                        minStepY: 7,
                        fillWidth: true
                    }
                    : {};
                if (workers > 0) {
                    const uncappedActive = uncappedActiveTasks.has(id);
                    const usefulCapacity = this.state.laborUsefulCapacity(county, byId[id]);
                    const activeWorkers = uncappedActive || need <= 0
                        ? workers
                        : Math.min(workers, usefulCapacity);
                    const inactiveWorkers = need > 0 ? Math.max(0, workers - activeWorkers) : 0;
                    const activeRegion = inactiveWorkers > 0 ? { region: 'top' } : {};
                    const maxActiveFigures = staggeredCapacity(slot, unitName, { ...activeRegion, ...activeLayout });
                    const maxInactiveFigures = inactiveWorkers > 0
                        ? staggeredCapacity(slot, 'surplus-inactive', { region: 'bottom' })
                        : 0;
                    const visibleWorkers = visibleLaborFigureCount(id, workers, need, id,
                        maxActiveFigures + maxInactiveFigures);
                    const denseMixedGrid = activeWorkers > 0 && inactiveWorkers > 0 && visibleWorkers >= 8;
                    let activeVisible = activeWorkers > 0 && visibleWorkers > 0
                        ? Phaser.Math.Clamp(Math.round(visibleWorkers * activeWorkers / Math.max(1, workers)), 1, Math.min(visibleWorkers, maxActiveFigures))
                        : 0;
                    let inactiveVisible = Phaser.Math.Clamp(visibleWorkers - activeVisible, 0, maxInactiveFigures);
                    if (denseMixedGrid) {
                        inactiveVisible = Phaser.Math.Clamp(
                            Math.round(visibleWorkers * inactiveWorkers / Math.max(1, workers)),
                            1,
                            Math.max(1, visibleWorkers - 1)
                        );
                        activeVisible = visibleWorkers - inactiveVisible;
                    } else if (id === 'cattle' && inactiveWorkers > 0) {
                        // The cattle sprite is a compact group and has fewer
                        // slots than the generic idle figure. Allocate idle
                        // figures from their own workforce ratio instead of
                        // filling every slot left by the active-sprite cap.
                        inactiveVisible = Phaser.Math.Clamp(
                            Math.round(visibleWorkers * inactiveWorkers / Math.max(1, workers)),
                            1,
                            Math.min(visibleWorkers, maxInactiveFigures)
                        );
                        activeVisible = Phaser.Math.Clamp(
                            visibleWorkers - inactiveVisible,
                            1,
                            Math.min(visibleWorkers, maxActiveFigures)
                        );
                        visualCounts[id] = activeVisible + inactiveVisible;
                    }
                    if (denseMixedGrid) {
                        addMixedLaborCluster(
                            slot,
                            id,
                            unitName,
                            activeWorkers,
                            inactiveWorkers,
                            activeVisible,
                            inactiveVisible,
                            activeLayout
                        );
                    } else if (activeVisible > 0) {
                        addLaborCluster(slot, id, unitName, activeWorkers, {
                            need,
                            count: activeVisible,
                            maxCount: maxActiveFigures,
                            dynamic: true,
                            ...activeRegion,
                            ...activeLayout
                        });
                    }
                    if (!denseMixedGrid && inactiveVisible > 0) {
                        addLaborCluster(slot, id, 'surplus-inactive', inactiveWorkers, {
                            layout: id,
                            count: inactiveVisible,
                            maxCount: maxInactiveFigures,
                            dynamic: true,
                            region: 'bottom'
                        });
                    }
                }
                addMissingLaborFigures(slot, id, workers, need, unitName, activeLayout);
            }
            // Figures are rebuilt on each refresh and therefore appended
            // after the controls; keep the close hit target above them.
            this.updateAdvancedLaborMovingCursor();
            if (this.advancedLaborMovingCursor && this.advancedLaborMovingCursor.visible) {
                this.advancedLaborDialog.bringToTop(this.advancedLaborMovingCursor);
            }
            this.advancedLaborDialog.bringToTop(this.advancedLaborClose.close);
            this.advancedLaborDialog.bringToTop(this.advancedLaborClose.hit);
        }

        selectLaborFigures (id, rect)
        {
            const county = this.state.counties[this.advancedLaborCounty];
            const slot = this.advancedLaborSlots[id];
            if (!county || !slot || !slot.hit.visible) { return; }
            const active = id === 'idle' || this.state.laborActivities(county).some(activity => activity.id === id);
            if (!active) {
                return;
            }
            const workers = id === 'idle'
                ? this.state.ensureLabor(county).idle
                : (county.laborAllocations[id] || 0);
            const { amount: rawAmount, figures: selectedFigures, count: selectedCount } = this.laborFiguresInRect(id, rect);
            const amount = Phaser.Math.Clamp(rawAmount, 0, workers);
            if (amount <= 0) {
                return;
            }
            this.selectedLaborGroup = id;
            this.selectedLaborAmount = amount;
            this.selectedLaborFigureCount = selectedCount;
            this.selectedLaborFigures = selectedFigures;
            this.refreshAdvancedLaborDialog();
        }

        laborFiguresInRect (id, rect)
        {
            const slot = this.advancedLaborSlots[id];
            if (!slot) { return { amount: 0, figures: [] }; }
            let amount = 0;
            const figures = [];
            for (const figure of slot.figures) {
                const bounds = this.laborFigureBounds(figure);
                const x = figure.laborCenterX !== undefined ? figure.laborCenterX : figure.x;
                const y = figure.laborCenterY !== undefined ? figure.laborCenterY : figure.y;
                if (Phaser.Geom.Intersects.RectangleToRectangle(rect, bounds)) {
                    const laborAmount = Math.max(0, Math.round(figure.laborAmount || 0));
                    amount += laborAmount;
                    figures.push({ x, y, amount: laborAmount });
                }
            }
            return { amount, figures, count: figures.length };
        }

        moveLaborFigures (from, to, amount, points = [])
        {
            const county = this.state.counties[this.advancedLaborCounty];
            const requested = Math.max(1, Math.round(amount || 1));
            if (!county || from === to) { return; }
            const snapshot = this.state.ensureLabor(county);
            const available = from === 'idle'
                ? snapshot.idle
                : Math.max(0, county.laborAllocations[from] || 0);
            const moved = Math.min(requested, available);
            if (moved <= 0) { return; }
            if (!this.state.transferLabor(county.id, from, to, moved)) { return; }
            const figureCount = Math.max(1, points && points.length ? points.length : 1);
            const visualCounts = county.laborVisualCounts || (county.laborVisualCounts = {});
            visualCounts.__version = 7;
            visualCounts[from] = Math.max(0, (visualCounts[from] || 0) - figureCount);
            visualCounts[to] = (visualCounts[to] || 0) + figureCount;
            this.selectedLaborGroup = null;
            this.selectedLaborAmount = 0;
            this.selectedLaborFigureCount = 0;
            this.selectedLaborFigures = points;
            this.refreshAdvancedLaborDialog();
            this.refreshCountyPane();
            this.selectedLaborFigures = [];
        }

        moveSingleLaborFigure (from, to, point = null)
        {
            const amount = point && point.amount ? point.amount : 1;
            this.moveLaborFigures(from, to, amount, point ? [{ x: point.x, y: point.y, amount }] : []);
        }

        isLaborFigureSelected (id, figure)
        {
            if (this.selectedLaborGroup !== id || !(figure.laborAmount > 0)) { return false; }
            const selectedFigures = this.selectedLaborFigures || [];
            if (selectedFigures.length === 0) { return true; }
            const x = figure.laborCenterX !== undefined ? figure.laborCenterX : figure.x;
            const y = figure.laborCenterY !== undefined ? figure.laborCenterY : figure.y;
            return selectedFigures.some(point =>
                Math.abs(point.x - x) < 0.5 && Math.abs(point.y - y) < 0.5
            );
        }

        laborFigureContains (figure, x, y)
        {
            return Phaser.Geom.Rectangle.Contains(this.laborFigureBounds(figure), x, y);
        }

        laborFigureBounds (figure)
        {
            const w = figure.displayWidth || figure.width || 0;
            const h = figure.displayHeight || figure.height || 0;
            const hit = figure.laborHitBox || { x: 0, y: 0, w, h };
            return new Phaser.Geom.Rectangle(
                figure.x - (figure.originX || 0) * w + hit.x,
                figure.y - (figure.originY || 0) * h + hit.y,
                hit.w,
                hit.h
            );
        }

        updateAdvancedLaborMovingCursor (pointer = this.input.activePointer)
        {
            const cursor = this.advancedLaborMovingCursor;
            if (!cursor) { return; }
            if (!this.advancedLaborDialog.visible || this.laborInfoDialog.visible || !this.selectedLaborGroup || !(this.selectedLaborAmount > 0) || !pointer) {
                cursor.setVisible(false);
                return;
            }
            const lx = pointer.x - this.advancedLaborRect.x;
            const ly = pointer.y - this.advancedLaborRect.y;
            if (lx < 0 || ly < 0 || lx >= this.advancedLaborRect.w || ly >= this.advancedLaborRect.h) {
                cursor.setVisible(false);
                return;
            }
            cursor.setPosition(lx, ly).setVisible(true);
        }

        selectLaborGroup (id, doubleClick)
        {
            const county = this.state.counties[this.advancedLaborCounty];
            if (!county) { return; }
            const active = id === 'idle' || this.state.laborActivities(county).some(activity => activity.id === id);
            if (!active) {
                this.openLaborInfo(id);
                return;
            }
            if (id === 'idle' && doubleClick) {
                this.state.gatherInactiveLabor(county.id);
                this.selectedLaborGroup = null;
                this.selectedLaborAmount = 0;
                this.selectedLaborFigureCount = 0;
                this.selectedLaborFigures = [];
                this.refreshAdvancedLaborDialog();
                this.refreshCountyPane();
                return;
            }
            // Clic sur la forge sans groupe en main : ouvre l'écran du
            // forgeron (choix du type d'arme, spec §3.5). On ferme le panneau
            // d'ouvriers pour éviter que ses zones cliquables ne capturent
            // les clics du panneau Forge (les deux se recouvrent). Le
            // transfert d'ouvriers VERS la forge (groupe déjà en main) reste
            // géré par la branche ci-dessous.
            if (id === 'smithy' && !this.selectedLaborGroup && county.owner === 0) {
                this.closeAdvancedLaborDialog();
                this.openBlacksmithDialog(county.id);
                return;
            }
            if (!this.selectedLaborGroup) {
                this.selectedLaborGroup = id;
                this.selectedLaborAmount = 1;
                this.selectedLaborFigureCount = 1;
                this.selectedLaborFigures = [];
            } else {
                const from = this.selectedLaborGroup;
                const moved = Math.max(1, Math.round(this.selectedLaborAmount || 1));
                if (this.state.transferLabor(county.id, from, id, moved)) {
                    const figureCount = Math.max(1, this.selectedLaborFigureCount || (this.selectedLaborFigures ? this.selectedLaborFigures.length : 0) || 1);
                    const visualCounts = county.laborVisualCounts || (county.laborVisualCounts = {});
                    visualCounts.__version = 7;
                    if (from !== 'idle') {
                        visualCounts[from] = Math.max(0, (visualCounts[from] || 0) - figureCount);
                    } else {
                        visualCounts.idle = Math.max(0, (visualCounts.idle || 0) - figureCount);
                    }
                    if (id !== 'idle') {
                        visualCounts[id] = (visualCounts[id] || 0) + figureCount;
                    } else {
                        visualCounts.idle = (visualCounts.idle || 0) + figureCount;
                    }
                }
                this.selectedLaborGroup = null;
                this.selectedLaborAmount = 0;
                this.selectedLaborFigureCount = 0;
                this.selectedLaborFigures = [];
            }
            this.refreshAdvancedLaborDialog();
            this.refreshCountyPane();
        }

        laborInfoData (county, id)
        {
            const assignedWorkers = id === 'idle'
                ? this.state.ensureLabor(county).idle
                : (county.laborAllocations[id] || 0);
            const activity = this.state.laborActivities(county).find(item => item.id === id);
            const workers = id === 'cattle'
                ? Math.min(assignedWorkers, this.state.laborUsefulCapacity(county, activity))
                : assignedWorkers;
            const canToggle = !!activity?.canToggle;
            const operational = activity?.operational !== false;
            const statusLines = canToggle
                ? [
                    operational ? t('campaign.labor.status.operational') : t('campaign.labor.status.stopped'),
                    ''
                ]
                : [];
            const coverage = Math.round(this.state.laborCoverage(county, id) * 100);
            const noble = this.state.nobles[county.owner];
            const grainFields = this.state.fieldsOf(county.id, 'grain').length;
            const cattleFields = this.state.fieldsOf(county.id, 'cattle').length;
            const herdStatus = this.state.cattleHerdStatus(county);
            const cattleProjection = this.state.cattleProjection(county);
            const cattleTrend = cattleProjection.delta >= 0
                ? '+' + cattleProjection.delta
                : String(cattleProjection.delta);
            const herdDensityText = t('campaign.herd.' + (herdStatus.level || 'none'));
            const reclaiming = this.state.fieldsOf(county.id).filter(field => field.reclaim !== undefined).length;
            const production = county.lastProduction || {};
            const expected = this.state.previewCountyProduction(county);
            const weapon = WEAPON_DEFS[county.weaponType] || WEAPON_DEFS.sword || WEAPON_DEFS[0];
            const smithyOutput = expected.smithy || 0;
            const castleWoodNeed = county.castleBuild ? (county.castleBuild.cost?.wood || 0) : 0;
            const castleStoneNeed = county.castleBuild ? (county.castleBuild.cost?.stone || 0) : 0;
            const data = {
                idle: {
                    title: t('campaign.labor.idle.title'),
                    icon: 'labor-worker-icon',
                    left: t('campaign.labor.idle.left', { n: workers }),
                    right: '',
                    lines: [t('campaign.labor.idle.line1'), t('campaign.labor.idle.line2')]
                },
                grain: {
                    title: t('campaign.labor.grain.title'),
                    icon: 'labor-icon-grain',
                    left: t('campaign.labor.grain.left', { n: workers }),
                    right: t('campaign.labor.grain.right', { n: county.grainStock }),
                    lines: [
                        t('campaign.labor.grain.fertility'),
                        t('campaign.labor.grain.stores'),
                        t('campaign.labor.weather'),
                        '',
                        t('campaign.labor.grain.sow', { planted: county.plantedSacks }),
                        t('campaign.labor.grain.harvest', { harvest: (production.grain || 0) }),
                        '',
                        t('campaign.labor.foodTrend'),
                        t('campaign.labor.overallTrend')
                    ]
                },
                cattle: {
                    title: t('campaign.labor.cattle.title'),
                    icon: 'labor-icon-cattle',
                    left: t('campaign.labor.cattle.left', { n: workers }),
                    right: t('campaign.labor.cattle.right', { n: county.cows }),
                    lines: [
                        t('campaign.labor.cattle.density', { density: herdDensityText }),
                        t('campaign.labor.cattle.herd'),
                        t('campaign.labor.weather'),
                        '',
                        t('campaign.labor.cattle.births', { n: cattleProjection.births }),
                        t('campaign.labor.cattle.losses', { n: cattleProjection.losses }),
                        t('campaign.labor.cattle.farmTrend', { n: cattleTrend }),
                        t('campaign.labor.cattle.foodTrend'),
                        t('campaign.labor.cattle.overallTrend', { n: cattleTrend })
                    ]
                },
                reclaim: {
                    title: t('campaign.labor.reclaim.title'),
                    icon: 'labor-icon-reclaim',
                    left: t('campaign.labor.reclaim.left', { n: workers }),
                    right: '',
                    lines: [
                        t('campaign.labor.reclaim.fields', { n: reclaiming }),
                        t('campaign.labor.reclaim.none', { n: Math.max(0, reclaiming * 4 - workers) })
                    ]
                },
                wood: {
                    title: t('campaign.labor.wood.title'),
                    icon: 'labor-icon-wood',
                    left: t('campaign.labor.wood.left', { n: workers }),
                    right: '',
                    lines: [
                        ...statusLines,
                        t('campaign.labor.wood.yield', { coverage }),
                        t('campaign.labor.wood.expected', { n: expected.wood || 0 }),
                        t('campaign.labor.wood.used', { n: Math.max(0, smithyOutput * (weapon.wood || 0)) }),
                        t('campaign.labor.wood.needed', { n: castleWoodNeed })
                    ]
                },
                stone: {
                    title: t('campaign.labor.stone.title'),
                    icon: 'labor-icon-stone',
                    left: t('campaign.labor.stone.left', { n: workers }),
                    right: '',
                    lines: [
                        ...statusLines,
                        t('campaign.labor.stone.expected', { n: expected.stone || 0 }),
                        t('campaign.labor.stone.produced', { n: (production.stone || 0) }),
                        t('campaign.labor.stone.treasury', { n: noble.stone })
                    ]
                },
                iron: {
                    title: t('campaign.labor.iron.title'),
                    icon: 'labor-icon-iron',
                    left: t('campaign.labor.iron.left', { n: workers }),
                    right: '',
                    lines: [
                        ...statusLines,
                        t('campaign.labor.iron.expected', { n: expected.iron || 0 }),
                        t('campaign.labor.iron.used', { n: Math.max(0, smithyOutput * (weapon.iron || 0)) }),
                        t('campaign.labor.iron.treasury', { n: noble.iron })
                    ]
                },
                smithy: {
                    title: t('campaign.labor.smithy.title'),
                    icon: 'labor-icon-smithy',
                    left: t('campaign.labor.smithy.left', { n: workers }),
                    right: '',
                    lines: [
                        ...statusLines,
                        t('campaign.labor.smithy.forging', { weapon: tWeapon(weapon ? weapon.name : 'Swords') }),
                        t('campaign.labor.smithy.expected', { n: smithyOutput }),
                        t('campaign.labor.smithy.treasury', { n: noble.weapons })
                    ]
                },
                castle: {
                    title: t('campaign.labor.castle.title'),
                    icon: 'labor-icon-castle',
                    left: t('campaign.labor.castle.left', { n: workers }),
                    right: '',
                    lines: [
                        county.castleBuild ? t('campaign.labor.castle.remain', { n: county.castleBuild.remaining }) : t('campaign.labor.castle.none'),
                        t('campaign.labor.castle.wood', { n: noble.wood }),
                        t('campaign.labor.castle.stone', { n: noble.stone })
                    ]
                }
            };
            const item = data[id] || { title: '', icon: 'labor-icon-grain', left: '', right: '', lines: [] };
            item.canToggle = canToggle;
            item.operational = operational;
            item.toggleText = canToggle
                ? (operational ? t('campaign.labor.action.stop') : t('campaign.labor.action.start'))
                : '';
            return item;
        }

        openLaborInfo (id)
        {
            const county = this.state.counties[this.advancedLaborCounty];
            if (!county) { return; }
            const data = this.laborInfoData(county, id);
            const bodyStep = 24;
            const toggleY = 88 + data.lines.length * bodyStep + 8;
            const h = Phaser.Math.Clamp(toggleY + (data.canToggle ? 48 : 18), 150, 292);
            this.laborInfoBg.setSize(400, h);
            this.laborInfoBorder.setSize(400, h);
            this.laborInfoHeight = h;
            this.laborInfoClose.setPosition(374, h - 29);
            this.laborInfoCloseHit.setPosition(360, h - 42).setSize(40, 42);
            this.laborInfoActivity = id;
            this.laborInfoIcon.setTexture(data.icon);
            this.laborInfoTitle.setText(data.title);
            this.laborInfoTopLine.setText(data.left);
            this.laborInfoRightLine.setText(data.right);
            this.laborInfoBody.setText(data.lines.join('\n'));
            this.laborInfoToggleText
                .setText(data.toggleText || '')
                .setPosition(20, Math.min(toggleY, h - 60))
                .setVisible(!!data.canToggle);
            this.laborInfoToggleHit
                .setPosition(16, Math.min(toggleY - 6, h - 66))
                .setVisible(!!data.canToggle);
            this.laborInfoDialog.setVisible(true);
        }

        // Annonces du héraut au début du tour : révoltes, pestes, famines
        // de la saison écoulée.
        buildHeraldDialog ()
        {
            const w = 340;
            const h = 190;
            const bg = this.add.rectangle(0, 0, w, h, 0xd8bc7e).setOrigin(0).setStrokeStyle(2, 0x3a2a10);
            const inner = this.add.rectangle(4, 4, w - 8, h - 8, 0, 0).setOrigin(0).setStrokeStyle(1, 0x8a6a38);
            this.heraldTitle = this.add.bitmapText(w / 2, 10, 'lords2-big', t('campaign.herald.title')).setOrigin(0.5, 0).setTint(0x1c1208);
            this.heraldBody = this.add.text(24, 46, '', { font: `13px ${FONT_FAMILY}`, fill: '#2a1c0c', lineSpacing: 5 }).setOrigin(0, 0);
            const hint = this.add.text(w / 2, h - 22, t('campaign.herald.dismiss'), { font: `11px ${FONT_FAMILY}`, fill: '#5a4a28' }).setOrigin(0.5, 0);

            this.heraldDialog = this.add.container(70, 110, [bg, inner, this.heraldTitle, this.heraldBody, hint])
                .setScrollFactor(0).setDepth(160).setVisible(false);

            this.input.on('pointerdown', () => {
                if (this.heraldDialog.visible) { this.heraldDialog.setVisible(false); }
            });

            // affiche les nouvelles de la saison écoulée (après restart de
            // fin de tour)
            const events = this.state.lastEvents || [];
            if (events.length > 0) {
                const lines = events.slice(0, 8).map(e => {
                    const c = e.county !== null ? this.state.counties[e.county] : null;
                    const shieldKey = (e.winner !== undefined && e.winner !== null && this.state.nobles[e.winner]) ? this.state.nobles[e.winner].shield : '';
                    return t('campaign.herald.' + e.type, {
                        county: c ? c.name : '?',
                        shield: shieldKey ? tShield(shieldKey) : '',
                        men: e.men || 0
                    });
                });
                this.heraldBody.setText(lines.join('\n'));
                this.heraldDialog.setVisible(true);
                this.state.lastEvents = [];
            }
        }

        openFieldDialog (field)
        {
            const f = this.state.fields[field.key];
            const use = f ? f.use : 'grain';
            const county = f && this.state.counties[f.county];
            const reclaiming = use === 'barren' && f.reclaim !== undefined;
            // état affiché : un champ endommagé montre sa cause
            // (sécheresse/inondation), un chantier son avancement
            const stateKey = use === 'damaged' ? (f.damageKind || 'flooded') : (reclaiming ? 'reclaiming' : use);
            this.fieldDialogTitle.setText(county ? county.name : '');
            this.fieldDialogSub.setText(t('campaign.field.farmLand', {
                state: reclaiming ? t('field.reclaiming') : t('field.' + (use === 'damaged' ? (f.damageKind || 'flooded') : use))
            }));
            this.fieldDialogThumb.setTexture(reclaiming ? 'icon-reclaim' : `icon-${use === 'damaged' ? (f.damageKind || 'flooded') : use}`);

            // options offertes : réaffectation pour un champ utilisable, le
            // fermier seul pour une friche, rien pour un champ endommagé ou
            // un chantier déjà ouvert
            const offered = this.state.canAssignField(field.key)
                ? ['grain', 'fallow', 'cattle']
                : (use === 'barren' && !reclaiming ? ['reclaim'] : []);
            this.fieldDialogOptions = [];
            for (const opt of this.fieldDialogAllOptions) {
                const shown = offered.includes(opt.use);
                for (const o of opt.objs) { o.setVisible(shown); }
                if (shown) { this.fieldDialogOptions.push(opt); }
            }
            this.fieldDialogHint.setText(
                offered[0] === 'reclaim' ? t('campaign.field.hint.reclaim')
                    : (offered.length ? t('campaign.field.hint.assign')
                        : (reclaiming ? t('campaign.field.hint.reclaimed', { pct: Math.round((f.reclaim || 0) * 100) }) : '')));

            // comté du joueur : détail du cheptel / des cultures, aligné
            // sur les chiffres de la colonne de droite (comme l'original)
            let text = this.fieldDialogDescs[stateKey];
            if (county && county.owner === 0) {
                const herdStatus = this.state.cattleHerdStatus(county);
                const density = t('campaign.herd.' + (herdStatus.level || 'none'));
                if (use === 'cattle') {
                    const d = county.lastCowsDelta || 0;
                    text = [
                        t('campaign.field.cattle.animals', { n: county.cows }),
                        t('campaign.field.cattle.density', { density }),
                        t('campaign.field.cattle.births', { n: (this.state.fieldsOf(county.id, 'cattle').length ? 5 : 0) }),
                        t('campaign.field.cattle.last', { delta: (d >= 0 ? '+' : '') + d })
                    ].join('\n');
                } else if (use === 'grain') {
                    const d = county.lastGrainDelta || 0;
                    text = [
                        t('campaign.field.grain.sacks', { n: county.grainStock }),
                        t('campaign.field.grain.planted', { n: county.plantedSacks }),
                        t('campaign.field.grain.fields', { n: this.state.fieldsOf(county.id, 'grain').length }),
                        t('campaign.field.grain.last', { delta: (d >= 0 ? '+' : '') + d })
                    ].join('\n');
                }
            }
            this.fieldDialogDesc.setText(text);

            this.fieldDialogField = field;
            this.fieldDialogJustOpened = true;
            this.fieldDialog.setVisible(true);
        }

        // Pose les entités multi-tuiles sur la carte. Ancres des PNG
        // (tools/extract-features.js) : quad 2×2 → coin du losange N en
        // (29,60) ; mono-tuile → losange en (0,34). Le coin du losange de la
        // tuile (x,y) est en (centerX + (x−y)×29 − 29, (x+y)×15 − 15).
        placeFeatures (seasonKey)
        {
            const centerX = 64 * 29;
            const quadX = t => centerX + (t.x - t.y) * 29 - 29 - 29;
            const quadY = t => (t.x + t.y) * 15 - 15 - 60;

            const placed = [];

            for (const t of this.features.towns) {
                // taille de la ville selon la population du comté
                const c = this.state.counties[t.county];
                // Seuils exacts du binaire : petite jusqu'à 800 habitants,
                // moyenne de 801 à 1200, grande à partir de 1201.
                const size = !c ? 1 : (c.population <= 800 ? 0 : (c.population <= 1200 ? 1 : 2));
                placed.push({ r: t.x + t.y, x: quadX(t), y: quadY(t), tex: `town-${seasonKey}-${size}` });

                // drapeau de la faction planté à la ville (par défaut dans
                // l'original), base du mât au coin gauche du bloc
                const shield = this.state.ownerShield(t.county);
                if (shield && FLAG_BY_SHIELD[shield] !== undefined) {
                    placed.push({
                        r: t.x + t.y + 0.5,
                        x: quadX(t) + 4,
                        y: quadY(t) + 44,
                        flagColor: FLAG_BY_SHIELD[shield]
                    });
                }
            }

            for (const t of this.features.castles) {
                const c = this.state.counties[t.county];
                const level = c ? c.castleLevel : 1;
                placed.push({ r: t.x + t.y, x: quadX(t), y: quadY(t), tex: `castle-${seasonKey}-${level}` });

                // le château n'arbore un drapeau QUE s'il a une garnison
                // (l'original) — les garnisons se lèveront via le bouton
                // bouclier/épée/casque, à venir
                if (c && c.garrison > 0) {
                    const shield = this.state.ownerShield(t.county);
                    if (shield && FLAG_BY_SHIELD[shield] !== undefined) {
                        placed.push({
                            r: t.x + t.y + 0.5,
                            x: quadX(t) + 4,
                            y: quadY(t) + 44,
                            flagColor: FLAG_BY_SHIELD[shield]
                        });
                    }
                }
            }

            for (const t of this.features.industries) {
                const x = centerX + (t.x - t.y) * 29 - 29;
                const y = (t.x + t.y) * 15 - 15 - 34;
                placed.push({
                    r: t.x + t.y,
                    x,
                    y,
                    // 20 = mine de fer ; 30 = bois/scierie.
                    tex: `ind-${seasonKey}-${t.kind}`,
                    blacksmith: BLACKSMITH_FRAMES.includes(t.kind),
                    blacksmithFrame: BLACKSMITH_FRAMES.indexOf(t.kind),
                    seasonKey
                });
            }
            for (const t of this.features.blacksmiths) {
                const frame = BLACKSMITH_FRAMES[(t.x * 3 + t.y) % BLACKSMITH_FRAMES.length];
                placed.push({
                    r: t.x + t.y,
                    x: centerX + (t.x - t.y) * 29 - 29,
                    y: (t.x + t.y) * 15 - 15 - 34,
                    tex: `ind-${seasonKey}-${frame}`,
                    blacksmith: true,
                    blacksmithFrame: BLACKSMITH_FRAMES.indexOf(frame),
                    seasonKey
                });
            }

            // armées en campagne : drapeau du propriétaire + effectif à la
            // capitale du comté où elles stationnent
            this.armyMarkers = {};
            const byCounty = {};
            for (const a of this.state.armies) {
                const c = this.state.counties[a.county];
                if (!c || c.townX === undefined) { continue; }
                const k = byCounty[a.county] = (byCounty[a.county] || 0) + 1;
                const fk = FLAG_BY_SHIELD[this.state.nobles[a.owner].shield];
                if (fk === undefined) { continue; }
                const x = centerX + (c.townX - c.townY) * 29 + 26 + (k - 1) * 10;
                const y = (c.townX + c.townY) * 15 - 46 - (k - 1) * 8;
                placed.push({ r: c.townX + c.townY + 1 + k, x, y, flagColor: fk, armyId: a.id, men: a.men });
            }

            // villages : chaque comté a 4 slots (classe 16) ; le nombre de
            // villages affichés croît avec la population (seuils ❓). On
            // remplit les slots dans un ordre stable (du nord au sud à
            // l'écran) pour que l'apparition soit cohérente d'un tour à
            // l'autre. Village brûlé (frame 1) si le comté a été pillé ❓
            // (mécanique à venir) — pour l'instant toujours normal (0).
            const slotsByCounty = {};
            for (const v of this.features.villages) {
                (slotsByCounty[v.county] = slotsByCounty[v.county] || []).push(v);
            }
            for (const cid of Object.keys(slotsByCounty)) {
                const c = this.state.counties[cid];
                if (!c) { continue; }
                const slots = slotsByCounty[cid].sort((a, b) => (a.x + a.y) - (b.x + b.y) || (a.x - a.y) - (b.x - b.y));
                const n = this.villageCount(c);
                for (let k = 0; k < n && k < slots.length; k++) {
                    const v = slots[k];
                    placed.push({
                        r: v.x + v.y,
                        x: centerX + (v.x - v.y) * 29 - 29,
                        y: (v.x + v.y) * 15 - 15 - 34,
                        tex: `village-${seasonKey}-0`
                    });
                }
            }

            // ordre du peintre : les entités du sud recouvrent celles du nord
            placed.sort((a, b) => a.r - b.r);
            for (const p of placed) {
                if (p.flagColor !== undefined) {
                    const animKey = `flag-${p.flagColor}`;
                    if (!this.anims.exists(animKey)) {
                        this.anims.create({
                            key: animKey,
                            frames: Array.from({ length: 8 }, (_, f) => ({ key: `flag-${p.flagColor}-${f}` })),
                            frameRate: 6,
                            repeat: -1
                        });
                    }
                    const spr = this.add.sprite(p.x, p.y, `flag-${p.flagColor}-0`).setOrigin(0);
                    spr.play(animKey);
                    this.map.add(spr);
                    if (p.armyId !== undefined) {
                        const txt = this.add.text(p.x + 16, p.y + 26, String(p.men), { font: `12px ${FONT_FAMILY}`, fill: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0);
                        this.map.add(txt);
                        this.armyMarkers[p.armyId] = txt;
                    }
                } else if (p.blacksmith) {
                    const animKey = `blacksmith-${p.seasonKey}`;
                    if (!this.anims.exists(animKey)) {
                        this.anims.create({
                            key: animKey,
                            frames: BLACKSMITH_FRAMES.map(f => ({ key: `ind-${p.seasonKey}-${f}` })),
                            frameRate: 4,
                            repeat: -1
                        });
                    }
                    const spr = this.add.sprite(p.x, p.y, p.tex).setOrigin(0);
                    spr.play({ key: animKey, startFrame: Math.max(0, p.blacksmithFrame) });
                    this.map.add(spr);
                } else {
                    this.map.add(this.add.image(p.x, p.y, p.tex).setOrigin(0));
                }
            }
        }

}
