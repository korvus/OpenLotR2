/*
 * État de partie : nobles, comtés, champs, calendrier, économie saisonnière.
 *
 * Modélisé d'après l'aide officielle du jeu (L2HELP.HLP), voir
 * doc/technical/gameplay/county-economy.md. Points clés :
 *   - les champs ne sont pas typés : chacun est AFFECTÉ à un usage
 *     (grain / cattle / fallow) via le panneau d'affectation, ou SUBIT un
 *     état (barren / damaged) : la météo endommage parfois un champ (une
 *     saison, puis friche), une friche se remet en état via le fermier du
 *     panneau, au plus un quart de champ par saison ;
 *   - le blé suit un cycle annuel : semé entre l'hiver et le printemps
 *     (5 sacs max par champ), récolté après le tour d'automne ;
 *   - le laitage est consommé automatiquement et en priorité, blé et bœuf
 *     ne nourrissent que le surplus de population ;
 *   - 5 niveaux de ration (Quarter → Triple) puisant dans des stocks réels ;
 *   - le BONHEUR (0-100) est la stat-pivot (impôts, santé, rations…),
 *     la SANTÉ (5 niveaux, perfect → diseased) ne dépend que des rations ;
 *   - impôts perçus avant la démographie, majorés par le château.
 *
 * Les constantes marquées ❓ sont des ordres de grandeur à calibrer en
 * observant le jeu original (cf. « à vérifier en jeu » de la spec).
 *
 * L'instance vit dans le registry Phaser ('gameState') et survit aux
 * scene.restart() et aux changements de scène.
 */

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

export const RATIONS = ['Quarter', 'Half', 'Normal', 'Double', 'Triple'];
export const RATION_FACTOR = { Quarter: 0.25, Half: 0.5, Normal: 1, Double: 2, Triple: 3 };

// Santé : 5 niveaux, du pire au meilleur (alignés sur les 5 frames de la
// jauge du panneau : healthWorst → healthBest).
export const HEALTH_LEVELS = ['Diseased', 'Poor', 'Average', 'Good', 'Perfect'];

export const FIELD_USES = ['grain', 'cattle', 'fallow'];

// Designs de château, dans l'ordre des quads de CASTLE1x (0 = motte vide).
// Coûts/durées ❓ à calibrer (l'aide ne chiffre pas).
export const CASTLES = [
    { name: 'None' },
    { name: 'Wooden Palisade', cost: { wood: 50 }, seasons: 2 },
    { name: 'Bailey Castle', cost: { wood: 100, stone: 30 }, seasons: 3 },
    { name: 'Stone Keep', cost: { stone: 120, wood: 40 }, seasons: 4 },
    { name: 'Royal Castle', cost: { stone: 300, wood: 80 }, seasons: 6 }
];

// Calé sur le guide communautaire + relevés en jeu (cf. county-economy §0).
const SACKS_PER_FIELD = 10;
const GRAIN_YIELD = 12; // rendement fermage normal 1:12 (guide)
const NORMAL_GRAIN_WORKERS_PER_FIELD = 60;
const PEOPLE_PER_SACK = 6;
const PEOPLE_PER_COW = 8; // personnes nourries une saison par vache abattue
const DAIRY_FEEDS_PER_COW = 4; // personnes nourries par le laitage d'une vache
const SOLDIER_WAGE_PER_25 = 1; // couronnes/saison pour 25 soldats a mesurer dans le DOS
const ARMY_STARVATION_MAX_LOSS = 0.1; // perte max/saison faute de fourrage, a mesurer
const COWS_PER_FIELD = 30; // capacité d'un champ à vaches avant surpâturage
const CATTLE_DENSITY_LOW = 10;
const CATTLE_DENSITY_MEDIUM = 20;
const CATTLE_STABILITY_WORKERS = { low: 66, medium: 73, high: 108, overflow: 89 };
const CATTLE_GROWTH_WORKERS = { low: 9, medium: 14, high: 24 };
const CATTLE_MAX_GROWTH_PER_30 = { low: 12, medium: 6, high: 3 };
const FIELD_DAMAGE_CHANCE = 0.02; // ❓ sécheresse/inondation par comté et par saison
const LABOR_SHARE = 1;
const INDUSTRY_WORKERS = 20; // ❓ référence de rendement industriel, pas plafond d'affectation
const RESOURCE_PRODUCTION_CAP = 999;
const PRODUCTION_PER_WORKER = {
    wood: 0.8,
    iron: 0.8,
    stone: 0.4,
    smithy: 0.2
};
const BLACKSMITH_FRAMES = Array.from({ length: 9 }, (_, i) => 10 + i);
const RESOURCE_INDUSTRY_KINDS = [0, 20, 30];
const MAP_INDUSTRY_KINDS = [...RESOURCE_INDUSTRY_KINDS, ...BLACKSMITH_FRAMES];
const TOGGLEABLE_INDUSTRIES = new Set(['wood', 'stone', 'iron', 'smithy']);
const FOOD_LABOR = new Set(['grain', 'cattle', 'reclaim']);
const INDUSTRY_LABOR = new Set(['wood', 'stone', 'iron', 'smithy', 'castle']);

// Grille du marchand (achat/vente, en couronnes l'unité) — ❓ à relever
// sur l'écran marchand de l'original.
export const PRICES = {
    grain: { buy: 2, sell: 1 },
    cows: { buy: 12, sell: 8 },
    wood: { buy: 3, sell: 2 },
    stone: { buy: 5, sell: 3 },
    iron: { buy: 8, sell: 5 },
    weapons: { buy: 15, sell: 10 }
};

// Types d'armes produits par la forge (blacksmith, spec §3.5). Un comté ne
// produit QU'UN seul type à la fois (« Each county may only produce one type
// of weapon at a time »). Coûts bois/fer par unité ❓ à relever sur l'écran
// forge du DOS : l'aide ne les décrit que qualitativement — arc = beaucoup de
// bois, pas de fer ; pique = fer + bois, peu chère ; masse = fer + bois ;
// arbalète = bois + fer, chère ; épée = beaucoup de fer + un peu de bois ;
// équipement de chevalier = grandes quantités de fer, le plus cher. Ordre =
// du plus simple au plus élaboré (à recaler sur le mur de l'armurerie DOS).
export const WEAPON_TYPES = [
    { id: 'bow',      name: 'Bows',               wood: 13, iron: 0 },
    { id: 'pike',     name: 'Pikes',              wood: 6,  iron: 3 },
    { id: 'mace',     name: 'Maces',              wood: 4,  iron: 4 },
    { id: 'crossbow', name: 'Crossbows',          wood: 6,  iron: 10 },
    { id: 'sword',    name: 'Swords',             wood: 3,  iron: 10 },
    { id: 'knight',   name: "Knight's equipment", wood: 4,  iron: 18 }
];
export const WEAPON_DEFS = Object.fromEntries(WEAPON_TYPES.map(w => [w.id, w]));
const BLACKSMITH_OUTPUT = 4; // armes/saison à couverture de main-d'œuvre pleine ❓

// La couche comté utilise 1..19 ; 32 marque l'empreinte des montagnes et
// 0 l'eau / hors-carte.
export const MAX_COUNTY_ID = 19;

export default class GameState {

    constructor (mapData, playerShield, options = {}) {
        this.mapName = mapData.name;
        this.outsideName = mapData.outsideName;
        this.year = 1268;
        this.seasonIndex = 3; // la campagne commence en hiver 1268
        this.armyFood = !!options.armyFood;
        this.advancedFarming = !!options.advancedFarming;

        // générateur pseudo-aléatoire de la partie (événements : peste…),
        // déterministe pour une même partie
        this.seed = 0x1268;

        // Comtés : surface et centroïde (axes écran isométriques u = x−y,
        // r = x+y) depuis la couche 5 de la carte.
        const county = mapData.layers.county;
        const W = mapData.width;
        const H = mapData.height;
        const acc = {};
        for (let i = 0; i < county.length; i++) {
            const id = county[i];
            if (!id || id > MAX_COUNTY_ID) { continue; }
            const x = i % W;
            const y = (i / W) | 0;
            if (!acc[id]) { acc[id] = { tiles: 0, su: 0, sr: 0 }; }
            acc[id].tiles++;
            acc[id].su += x - y;
            acc[id].sr += x + y;
        }

        this.counties = {};
        for (const key of Object.keys(acc)) {
            const id = Number(key);
            this.counties[id] = {
                id,
                name: mapData.countyNames[id - 1] || ('County ' + id),
                tiles: acc[id].tiles,
                centroid: { u: acc[id].su / acc[id].tiles, r: acc[id].sr / acc[id].tiles },
                owner: null,
                // valeurs de départ provisoires, stables d'une partie à
                // l'autre (l'original les tire du scénario) — sous la
                // capacité nourricière (~470/saison : laitage de 90 vaches
                // + récolte de 2-3 champs de blé)
                population: 330 + ((id * 53) % 80),
                happiness: 72,
                health: 3, // indice dans HEALTH_LEVELS ('Good')
                taxRate: 0,
                ration: 'Normal',
                beefShare: 0.5, // curseur blé↔bœuf de l'écran des rations ❓
                laborFoodShare: 0.5, // curseur nourriture↔industrie du panneau de comté
                weaponType: 'sword', // arme produite par la forge (1 type/comté) ❓ défaut DOS

                grainStock: 220, // sacs ❓
                plantedSacks: 0, // semés cette année, crédités après l'automne
                cows: 90, // ❓
                castleLevel: 0, // motte vide ; les nobles reçoivent un château
                unhappySeasons: 0, // saisons consécutives sous bonheur 25
                lastBirths: 0,
                lastDeaths: 0,
                lastMigration: 0,
                lastArmy: 0,
                pendingArmy: 0,
                lastTaxIncome: 0,
                lastPopulation: 330 + ((id * 53) % 80),
                populationHistory: [330 + ((id * 53) % 80)],
                lastHappiness: 72,
                happinessHistory: [72],
                lastHappinessMods: { tax: 5, ration: 1, health: 1, army: 0, plague: 0, other: 0 },
                laborEnabled: {},
                laborAllocations: {},
                lastProduction: { grain: 0, cattle: 0, wood: 0, stone: 0, iron: 0, smithy: 0, castle: 0 }
            };
        }

        // Champs : composantes connexes de classe 32, chacune affectée à un
        // usage. Départ : blé (la carte encode la frame « terre travaillée »).
        this.fields = {};
        this.scanFields(mapData);

        // Friches de départ : AUCUNE — vérifié sur le DOS : la première
        // carte de campagne démarre sans champ en friche (la valeur 80 des
        // tuiles de champ n'est qu'un marqueur générique, le scénario
        // dispatche les états à l'initialisation ; les cartes suivantes de
        // la campagne en ont de plus en plus — à brancher quand on lira
        // les réglages de scénario).

        // la partie commence en hiver, blé déjà semé (état du scénario) —
        // les champs montrent leurs rangées dès le premier tour
        for (const c of Object.values(this.counties)) {
            c.plantedSacks = this.fieldsOf(c.id, 'grain').length * SACKS_PER_FIELD;
        }

        // Adjacence des comtés (tuiles voisines d'ids différents) — sert
        // aux migrations et plus tard à la conquête par contiguïté.
        this.neighbours = {};
        for (let i = 0; i < county.length; i++) {
            const a = county[i];
            if (!a || a > MAX_COUNTY_ID) { continue; }
            for (const d of [1, W]) {
                const j = i + d;
                if (j >= county.length || (d === 1 && j % W === 0)) { continue; }
                const b = county[j];
                if (!b || b > MAX_COUNTY_ID || b === a) { continue; }
                (this.neighbours[a] = this.neighbours[a] || new Set()).add(b);
                (this.neighbours[b] = this.neighbours[b] || new Set()).add(a);
            }
        }

        // Nobles : le joueur + N−1 rivaux (réglage « Nobles » du Custom
        // Game, 2-5), un fief chacun au départ réparti d'ouest en est, le
        // reste neutre. Couronnes de départ = réglage « Crowns ».
        // or/bois/pierre/fer/armes vont dans un trésor UNIQUE par noble
        // (cf. aide) — seuls blé et vaches sont locaux aux comtés.
        const nobleCount = Phaser.Math.Clamp(options.nobles || 2, 2, 5);
        const startCrowns = options.crowns || 5000;
        const palette = ['red', 'yellow', 'black', 'purple', 'blue'];
        const shields = [playerShield, ...palette.filter(s => s !== playerShield)].slice(0, nobleCount);
        this.nobles = shields.map((shield, id) => ({
            id, shield, crowns: startCrowns, wood: 100, stone: 50, iron: 20,
            // `weapons` reste le TOTAL canonique (conscription, marchand,
            // affichage trésor) ; `weaponsByType` en est la ventilation par
            // type, maintenue en miroir par addWeapons/removeWeapons. La forge
            // produit le type choisi PAR COMTÉ (cf. weaponType plus bas).
            weapons: 0,
            weaponsByType: Object.fromEntries(WEAPON_TYPES.map(w => [w.id, 0])),
            lastWagesDue: 0,
            lastWagesPaid: 0,
            lastDeserters: 0,
            isPlayer: id === 0
        }));

        // tuile de la capitale (quart N de la ville, classe 64 indice 0) —
        // point d'ancrage des armées du comté
        const tcls = mapData.layers.terrainClass;
        const terr = mapData.layers.terrain;
        for (let i = 0; i < tcls.length; i++) {
            if (tcls[i] !== 64 || terr[i] !== 0) { continue; }
            const c = this.counties[county[i]];
            if (c) { c.townX = i % W; c.townY = (i / W) | 0; }
        }

        // armées en campagne
        this.armies = [];
        this.nextArmyId = 1;

        // Industries présentes par comté (couche 2 : 0 carrière, 10-18 forge
        // animée, 20 mine, 30 scierie). Elles peuvent toucher le carré 2x2
        // du château : on retire donc son empreinte avant de lire les sites
        // restants.
        const castleTiles = new Set();
        const seen128 = new Array(tcls.length).fill(false);
        for (let i = 0; i < tcls.length; i++) {
            if (tcls[i] !== 128 || seen128[i]) { continue; }
            const component = [];
            const queue = [i];
            seen128[i] = true;
            while (queue.length) {
                const tile = queue.pop();
                component.push(tile);
                const x = tile % W;
                const y = (tile / W) | 0;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) { continue; }
                    const next = ny * W + nx;
                    if (!seen128[next] && tcls[next] === 128) {
                        seen128[next] = true;
                        queue.push(next);
                    }
                }
            }
            const componentSet = new Set(component);
            const candidates = component
                .filter(tile => tile % W < W - 1
                    && componentSet.has(tile + 1)
                    && componentSet.has(tile + W)
                    && componentSet.has(tile + W + 1))
                .map(tile => {
                    const tiles = [tile, tile + 1, tile + W, tile + W + 1];
                    const score = tiles.reduce((sum, t) =>
                        sum + (terr[t] === 30 ? 100 : ([0, 20].includes(terr[t]) ? 1 : 0)), 0);
                    return { tiles, score };
                })
                .filter(candidate => component.every(tile =>
                    candidate.tiles.includes(tile) || MAP_INDUSTRY_KINDS.includes(terr[tile])))
                .sort((a, b) => a.score - b.score);
            for (const tile of candidates[0]?.tiles || (component.length >= 3 ? component : [])) {
                castleTiles.add(tile);
            }
        }
        for (let i = 0; i < tcls.length; i++) {
            if (tcls[i] !== 128 || castleTiles.has(i) || !RESOURCE_INDUSTRY_KINDS.includes(terr[i])) { continue; }
            const cid = county[i];
            const c = this.counties[cid];
            if (!c) { continue; }
            if (terr[i] === 0) { c.hasQuarry = true; }
            else if (terr[i] === 20) { c.hasMine = true; }
            else if (terr[i] === 30) { c.hasLumberMill = true; }
        }
        for (let i = 0; i < tcls.length; i++) {
            const c = this.counties[county[i]];
            if (!c) { continue; }
            if ((tcls[i] === 8 && terr[i] >= 30 && terr[i] <= 37) || tcls[i] === 10) {
                c.hasLumberMill = true;
            }
        }
        for (const c of Object.values(this.counties)) { c.hasWorkshop = true; }

        // fiefs de départ : un comté par noble, répartis le plus possible
        // d'ouest en est (indices régulièrement espacés dans la liste triée)
        const byWest = Object.values(this.counties).sort((a, b) => a.centroid.u - b.centroid.u);
        const n = Math.min(this.nobles.length, byWest.length);
        for (let k = 0; k < n; k++) {
            const idx = n === 1 ? 0 : Math.round(k * (byWest.length - 1) / (n - 1));
            byWest[idx].owner = k;
            byWest[idx].castleLevel = 1;
        }

        const playerCounty = Object.values(this.counties).find(c => c.owner === 0);
        this.selectedCounty = playerCounty ? playerCounty.id : (byWest.length > 0 ? byWest[0].id : 0);
    }

    // Champs : CHAQUE tuile de classe 32 est un champ individuel (comme
    // l'original : « twelve fields » par comté ≈ 12 tuiles de classe 32),
    // identifié par 'x,y'.
    scanFields (mapData) {
        const W = mapData.width;
        const cls = mapData.layers.terrainClass;
        const county = mapData.layers.county;

        for (let i = 0; i < cls.length; i++) {
            if (cls[i] !== 32) { continue; }
            const x = i % W;
            const y = (i / W) | 0;
            const key = x + ',' + y;
            // comté : la tuile elle-même ou, à défaut (montagne/côte), un
            // voisin direct avec un id valide
            let cid = (county[i] > 0 && county[i] <= MAX_COUNTY_ID) ? county[i] : 0;
            if (!cid) {
                for (const d of [-1, 1, -W, W]) {
                    const j = i + d;
                    if (j >= 0 && j < cls.length && county[j] > 0 && county[j] <= MAX_COUNTY_ID) { cid = county[j]; break; }
                }
            }
            this.fields[key] = { key, county: cid, use: 'grain' };
        }
    }

    fieldsOf (countyId, use) {
        return Object.values(this.fields).filter(f => f.county === countyId && (!use || f.use === use));
    }

    // « Any field can be assigned to any use, as long as it is not barren
    // or damaged » (aide) — un champ subi doit d'abord être remis en état.
    canAssignField (key) {
        const f = this.fields[key];
        return !!f && f.use !== 'barren' && f.use !== 'damaged';
    }

    // Ouvre le chantier de remise en état d'une friche (symbole fermier du
    // panneau de champ). La progression se fait en fin de saison, jamais
    // plus d'un quart de champ par saison (cf. aide).
    startReclaim (key) {
        const f = this.fields[key];
        if (!f || f.use !== 'barren' || f.reclaim !== undefined) { return false; }
        f.reclaim = 0;
        const c = this.counties[f.county];
        if (c) {
            const snapshot = this.ensureLabor(c);
            this.transferLabor(c.id, 'idle', 'reclaim', Math.min(4, snapshot.idle));
        }
        return true;
    }

    get player () { return this.nobles[0]; }

    get season () { return SEASONS[this.seasonIndex]; }

    // --- Armes du trésor : total `weapons` et ventilation `weaponsByType`
    // tenus en miroir. Toute création/consommation passe par ces helpers
    // pour garder l'invariant sum(weaponsByType) === weapons. ---

    weaponsBreakdown (noble) {
        if (!noble.weaponsByType) {
            noble.weaponsByType = Object.fromEntries(WEAPON_TYPES.map(w => [w.id, 0]));
        }
        return noble.weaponsByType;
    }

    addWeapons (noble, typeId, n) {
        if (n <= 0 || !WEAPON_DEFS[typeId]) { return 0; }
        const by = this.weaponsBreakdown(noble);
        by[typeId] = (by[typeId] || 0) + n;
        noble.weapons += n;
        return n;
    }

    // Retire n armes du trésor en vidant la ventilation (type le plus
    // fourni en premier). Renvoie le nombre réellement retiré.
    removeWeapons (noble, n) {
        const by = this.weaponsBreakdown(noble);
        let toRemove = Math.min(n, noble.weapons);
        const removed = toRemove;
        const order = Object.keys(by).sort((a, b) => by[b] - by[a]);
        for (const id of order) {
            if (toRemove <= 0) { break; }
            const take = Math.min(by[id] || 0, toRemove);
            by[id] -= take;
            toRemove -= take;
        }
        noble.weapons = Math.max(0, noble.weapons - removed);
        return removed;
    }

    // Choisit l'arme produite par la forge d'un comté possédé (1 type/comté).
    setWeaponType (countyId, typeId) {
        const c = this.counties[countyId];
        if (!c || c.owner === null || !WEAPON_DEFS[typeId]) { return false; }
        c.weaponType = typeId;
        return true;
    }

    // Lance la construction du design suivant : débite le trésor du
    // propriétaire, le chantier avance d'une saison par tour.
    startCastleUpgrade (countyId) {
        const c = this.counties[countyId];
        if (!c || c.owner === null || c.castleBuild) { return false; }
        const next = CASTLES[c.castleLevel + 1];
        if (!next) { return false; }
        const noble = this.nobles[c.owner];
        for (const [res, qty] of Object.entries(next.cost)) {
            if ((noble[res] || 0) < qty) { return false; }
        }
        for (const [res, qty] of Object.entries(next.cost)) { noble[res] -= qty; }
        c.castleBuild = { target: c.castleLevel + 1, remaining: next.seasons };
        this.autoAllocateLabor(countyId);
        return true;
    }

    /*
     * Lève une armée dans un comté : les hommes sortent de la population
     * (minimum 50, cf. l'aide), s'équipent sur le stock d'armes du trésor
     * (le reste part à la fourche), et le bonheur du comté en souffre.
     */
    createArmy (countyId, men) {
        const c = this.counties[countyId];
        if (!c || c.owner === null || men < 50 || c.population < men + 50 || c.happiness <= 0) { return null; }
        const noble = this.nobles[c.owner];
        const equipped = this.removeWeapons(noble, Math.min(men, noble.weapons));
        c.population -= men;
        c.pendingArmy = (c.pendingArmy || 0) + men;
        c.happiness = Phaser.Math.Clamp(c.happiness - Math.round(men / c.population * 30), 0, 100);
        const army = {
            id: this.nextArmyId++,
            owner: c.owner,
            county: countyId,
            home: countyId,
            men,
            equipped,
            originMen: { [countyId]: men },
            target: null
        };
        this.armies.push(army);
        return army;
    }

    armyStrength (a) { return a.men + a.equipped; }

    armiesIn (countyId) { return this.armies.filter(a => a.county === countyId); }

    // Prochain comté sur le chemin (BFS sur l'adjacence) vers la cible.
    nextHop (from, to) {
        if (from === to) { return null; }
        const prev = { [from]: from };
        const queue = [from];
        while (queue.length) {
            const cur = queue.shift();
            for (const n of (this.neighbours[cur] || [])) {
                if (prev[n] !== undefined) { continue; }
                prev[n] = cur;
                if (n === to) {
                    let hop = n;
                    while (prev[hop] !== from) { hop = prev[hop]; }
                    return hop;
                }
                queue.push(n);
            }
        }
        return null;
    }

    // Négoce avec le marchand : qty > 0 = achat, qty < 0 = vente. Blé et
    // vaches sont locaux au comté ; bois/pierre/fer/armes vont au trésor.
    trade (countyId, res, qty) {
        const c = this.counties[countyId];
        const p = this.player;
        if (!c || !PRICES[res] || !qty) { return false; }
        // Les armes sont ventilées par type : on passe par addWeapons/
        // removeWeapons pour garder l'invariant. L'achat alimente le type
        // produit par le comté courant (simplification : marchand sans choix
        // de type ici ❓).
        if (res === 'weapons') {
            if (qty > 0) {
                const cost = PRICES.weapons.buy * qty;
                if (p.crowns < cost) { return false; }
                p.crowns -= cost;
                this.addWeapons(p, c.weaponType || 'sword', qty);
            } else {
                const n = -qty;
                if (p.weapons < n) { return false; }
                this.removeWeapons(p, n);
                p.crowns += PRICES.weapons.sell * n;
            }
            return true;
        }
        const stockObj = (res === 'grain' || res === 'cows') ? c : p;
        const key = res === 'grain' ? 'grainStock' : res;
        if (qty > 0) {
            const cost = PRICES[res].buy * qty;
            if (p.crowns < cost) { return false; }
            p.crowns -= cost;
            stockObj[key] = (stockObj[key] || 0) + qty;
        } else {
            const n = -qty;
            if ((stockObj[key] || 0) < n) { return false; }
            stockObj[key] -= n;
            p.crowns += PRICES[res].sell * n;
        }
        return true;
    }

    rand () {
        this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
        return this.seed / 0x7fffffff;
    }

    laborWorkforce (c) {
        return Math.max(0, Math.floor(c.population * LABOR_SHARE));
    }

    laborActivities (c) {
        const reclaiming = this.fieldsOf(c.id).filter(f => f.reclaim !== undefined).length;
        const primaryIndustry = c.hasQuarry ? 'stone' : (c.hasMine ? 'iron' : null);
        const grainFields = this.fieldsOf(c.id, 'grain').length;
        const cattleFields = this.fieldsOf(c.id, 'cattle').length;
        const plantedRatio = grainFields > 0
            ? Math.min(1, Math.max(0, c.plantedSacks || 0) / (grainFields * SACKS_PER_FIELD))
            : 0;
        const grainNeed = this.advancedFarming
            ? (plantedRatio > 0 ? Math.ceil(grainFields * 8 * plantedRatio) : 0)
            : (grainFields * NORMAL_GRAIN_WORKERS_PER_FIELD);
        const cattleNeed = this.cattleWorkerNeed(c);
        return [
            { id: 'grain', label: 'Grain farming', workers: 'Farmers', need: grainNeed, missingNeed: grainNeed, available: true },
            { id: 'cattle', label: 'Cattle farming', workers: 'Dairy maids', need: cattleNeed, missingNeed: cattleNeed, available: c.cows > 0 || cattleFields > 0 },
            { id: 'reclaim', label: 'Field reclamation', workers: 'Serfs', need: reclaiming * 4, available: true },
            { id: 'castle', label: 'Castle building', workers: 'Builders', need: c.castleBuild ? INDUSTRY_WORKERS : 0, available: true },
            { id: 'iron', label: 'Iron mining', workers: 'Miners', need: INDUSTRY_WORKERS, available: primaryIndustry === 'iron' },
            { id: 'stone', label: 'Stone quarrying', workers: 'Quarriers', need: INDUSTRY_WORKERS, available: primaryIndustry === 'stone' },
            { id: 'wood', label: 'Wood cutting', workers: 'Foresters', need: INDUSTRY_WORKERS, available: !!c.hasLumberMill },
            { id: 'smithy', label: 'Blacksmith', workers: 'Blacksmiths', need: INDUSTRY_WORKERS, available: !!c.hasWorkshop }
        ].filter(activity => activity.available).map(activity => ({
            ...activity,
            canToggle: TOGGLEABLE_INDUSTRIES.has(activity.id),
            operational: c.laborEnabled?.[activity.id] !== false
        }));
    }

    cattleHerdStatus (c) {
        const fields = this.fieldsOf(c.id, 'cattle').length;
        const cows = Math.max(0, c.cows || 0);
        if (fields <= 0 || cows <= 0) {
            return { fields, cows, cowsPerField: 0, figures: 0, level: 'none', overcrowded: false };
        }
        const cowsPerField = cows / fields;
        const figures = cowsPerField <= CATTLE_DENSITY_LOW ? 1
            : (cowsPerField <= CATTLE_DENSITY_MEDIUM ? 2 : 3);
        const level = figures === 1 ? 'low' : (figures === 2 ? 'medium' : 'high');
        return {
            fields,
            cows,
            cowsPerField,
            figures,
            level,
            overcrowded: cowsPerField > CATTLE_DENSITY_MEDIUM
        };
    }

    cattleHerdSpriteIndex (c) {
        return this.cattleHerdStatus(c).figures - 1;
    }

    cattleWorkerNeed (c) {
        return this.cattleProjection(c).need;
    }

    cattleProjection (c) {
        const status = this.cattleHerdStatus(c);
        const cows = Math.max(0, c.cows || 0);
        if (cows <= 0) {
            return { need: 0, activeWorkers: 0, delta: 0, births: 0, losses: 0, overflow: false };
        }
        if (status.fields <= 0) {
            const losses = cows <= COWS_PER_FIELD ? cows : Math.floor(cows / 2);
            return {
                need: 0,
                activeWorkers: 0,
                delta: -losses,
                births: 0,
                losses,
                overflow: false,
                noPasture: true
            };
        }
        const workers = Math.max(0, c.laborAllocations?.cattle || 0);
        const capacity = status.fields * COWS_PER_FIELD;
        if (cows > capacity) {
            const forcedLosses = cows - capacity;
            const need = Math.ceil(status.fields * CATTLE_STABILITY_WORKERS.overflow);
            return {
                need,
                activeWorkers: Math.min(workers, need),
                delta: -forcedLosses,
                births: 0,
                losses: forcedLosses,
                overflow: true
            };
        }

        const level = status.level || 'low';
        const herdUnits = Math.max(1, cows / COWS_PER_FIELD);
        const need = Math.ceil((CATTLE_STABILITY_WORKERS[level] || CATTLE_STABILITY_WORKERS.high) * herdUnits);
        const maxGrowth = Math.round((CATTLE_MAX_GROWTH_PER_30[level] || CATTLE_MAX_GROWTH_PER_30.high) * herdUnits);
        const growthWorkers = CATTLE_GROWTH_WORKERS[level] || CATTLE_GROWTH_WORKERS.high;
        let delta = 0;
        if (workers >= need) {
            delta = Math.min(maxGrowth, Math.floor((workers - need) / growthWorkers));
        } else {
            delta = -Math.ceil((need - workers) / growthWorkers);
        }
        delta = Math.max(-cows, delta);
        // Workers beyond the last complete growth step do not affect the herd
        // this season. They remain assigned to cattle, but are visually idle.
        const activeWorkers = workers < need
            ? workers
            : Math.min(workers, need + Math.max(0, delta) * growthWorkers);
        return {
            need,
            activeWorkers,
            delta,
            births: Math.max(0, delta),
            losses: Math.max(0, -delta),
            overflow: false
        };
    }

    ensureLabor (c) {
        if (!c.laborEnabled) { c.laborEnabled = {}; }
        if (!c.laborAllocations) { c.laborAllocations = {}; }
        const activities = this.laborActivities(c);
        const available = new Set(activities.map(activity => activity.id));
        for (const key of Object.keys(c.laborAllocations)) {
            if (!available.has(key)) { delete c.laborAllocations[key]; }
        }
        for (const activity of activities) {
            if (c.laborEnabled[activity.id] === undefined) { c.laborEnabled[activity.id] = true; }
            if (c.laborAllocations[activity.id] === undefined) { c.laborAllocations[activity.id] = 0; }
            if (activity.canToggle && c.laborEnabled[activity.id] === false) {
                c.laborAllocations[activity.id] = 0;
            }
        }

        const workforce = this.laborWorkforce(c);
        let assigned = Object.values(c.laborAllocations).reduce((sum, value) => sum + Math.max(0, value || 0), 0);
        if (assigned > workforce) {
            let excess = assigned - workforce;
            const keys = Object.keys(c.laborAllocations).sort((a, b) => c.laborAllocations[b] - c.laborAllocations[a]);
            for (const key of keys) {
                const removed = Math.min(excess, c.laborAllocations[key]);
                c.laborAllocations[key] -= removed;
                excess -= removed;
                if (excess <= 0) { break; }
            }
            assigned = workforce;
        }

        if (!c.laborInitialized) {
            c.laborInitialized = true;
            return this.autoAllocateLabor(c.id);
        }
        return { workforce, assigned, idle: Math.max(0, workforce - assigned) };
    }

    setLaborActivityOperational (countyId, activityId, operational) {
        const c = this.counties[countyId];
        if (!c) { return false; }
        if (!c.laborEnabled) { c.laborEnabled = {}; }
        if (!c.laborAllocations) { c.laborAllocations = {}; }
        const activity = this.laborActivities(c).find(item => item.id === activityId);
        if (!activity || !activity.canToggle) { return false; }
        c.laborEnabled[activityId] = operational !== false;
        if (!c.laborEnabled[activityId]) {
            c.laborAllocations[activityId] = 0;
            if (c.laborVisualCounts) { c.laborVisualCounts[activityId] = 0; }
        }
        this.ensureLabor(c);
        return true;
    }

    toggleLaborActivity (countyId, activityId) {
        const c = this.counties[countyId];
        const activity = c && this.laborActivities(c).find(item => item.id === activityId);
        if (!activity || !activity.canToggle) { return false; }
        return this.setLaborActivityOperational(countyId, activityId, c.laborEnabled?.[activityId] === false);
    }

    // Répartition automatique pilotée par le curseur nourriture↔industrie du
    // panneau de comté. On couvre d'abord les besoins utiles du côté choisi,
    // puis on répartit le surplus sur les mêmes activités ; seuls les budgets
    // sans activité disponible restent oisifs.
    autoAllocateLabor (countyId) {
        const c = this.counties[countyId];
        if (!c) { return null; }
        if (!c.laborEnabled) { c.laborEnabled = {}; }
        if (!c.laborAllocations) { c.laborAllocations = {}; }
        const activities = this.laborActivities(c).filter(activity => c.laborEnabled[activity.id] !== false);
        for (const key of Object.keys(c.laborAllocations)) { c.laborAllocations[key] = 0; }

        const workforce = this.laborWorkforce(c);
        const foodShare = Phaser.Math.Clamp(c.laborFoodShare === undefined ? 0.5 : c.laborFoodShare, 0, 1);
        const budgets = {
            food: Math.round(workforce * foodShare),
            industry: workforce - Math.round(workforce * foodShare)
        };

        const assignGroup = (ids, budget, allowSurplus = true) => {
            let remaining = budget;
            const groupActivities = activities.filter(activity => ids.has(activity.id));
            let open = groupActivities.filter(activity => activity.need > 0).map(activity => ({ ...activity, assigned: 0 }));
            while (remaining > 0 && open.length > 0) {
                const share = Math.max(1, Math.floor(remaining / open.length));
                const next = [];
                for (const activity of open) {
                    const add = Math.min(share, activity.need - activity.assigned, remaining);
                    activity.assigned += add;
                    remaining -= add;
                    c.laborAllocations[activity.id] = (c.laborAllocations[activity.id] || 0) + add;
                    if (activity.assigned < activity.need) { next.push(activity); }
                }
                open = next;
            }
            if (!allowSurplus) { return; }
            const surplusTargets = (groupActivities.filter(activity => (activity.need || 0) > 0).length
                ? groupActivities.filter(activity => (activity.need || 0) > 0)
                : groupActivities);
            let index = 0;
            while (remaining > 0 && surplusTargets.length > 0) {
                const activity = surplusTargets[index % surplusTargets.length];
                c.laborAllocations[activity.id] = (c.laborAllocations[activity.id] || 0) + 1;
                remaining -= 1;
                index += 1;
            }
        };

        assignGroup(FOOD_LABOR, budgets.food, false);
        assignGroup(INDUSTRY_LABOR, budgets.industry, true);

        const assigned = Object.values(c.laborAllocations).reduce((sum, value) => sum + value, 0);
        if (c.laborVisualCounts) { c.laborVisualCounts.__version = 0; }
        return { workforce, assigned, idle: Math.max(0, workforce - assigned) };
    }

    setLaborFoodShare (countyId, share) {
        const c = this.counties[countyId];
        if (!c) { return null; }
        c.laborFoodShare = Phaser.Math.Clamp(share, 0, 1);
        c.laborInitialized = true;
        return this.autoAllocateLabor(countyId);
    }

    laborSnapshot (c) {
        const snapshot = this.ensureLabor(c);
        const activities = this.laborActivities(c).filter(activity => c.laborEnabled[activity.id] !== false);
        const group = (ids) => {
            const items = activities.filter(activity => ids.has(activity.id));
            const need = items.reduce((sum, activity) => sum + activity.need, 0);
            const assigned = items.reduce((sum, activity) => sum + (c.laborAllocations[activity.id] || 0), 0);
            return { need, assigned };
        };
        return {
            ...snapshot,
            food: group(FOOD_LABOR),
            industry: group(INDUSTRY_LABOR)
        };
    }

    laborUsefulCapacity (c, activity) {
        if (!activity || activity.operational === false) { return 0; }
        if (activity.id === 'cattle') {
            return this.cattleProjection(c).activeWorkers;
        }
        if (activity.id === 'wood' || activity.id === 'stone' || activity.id === 'iron') {
            return Number.POSITIVE_INFINITY;
        }
        if (activity.id === 'smithy') {
            const noble = c.owner != null ? this.nobles[c.owner] : null;
            const weapon = WEAPON_DEFS[c.weaponType] || WEAPON_DEFS.sword || WEAPON_DEFS[0];
            if (!noble || !weapon || activity.need <= 0) { return 0; }
            let possibleWeapons = Number.POSITIVE_INFINITY;
            if ((weapon.wood || 0) > 0) { possibleWeapons = Math.min(possibleWeapons, Math.floor((noble.wood || 0) / weapon.wood)); }
            if ((weapon.iron || 0) > 0) { possibleWeapons = Math.min(possibleWeapons, Math.floor((noble.iron || 0) / weapon.iron)); }
            if (!Number.isFinite(possibleWeapons)) { return Number.POSITIVE_INFINITY; }
            return Math.max(0, Math.floor(possibleWeapons / PRODUCTION_PER_WORKER.smithy));
        }
        return Math.max(0, activity.need || 0);
    }

    laborInactiveWorkforce (c) {
        const snapshot = this.ensureLabor(c);
        const activities = this.laborActivities(c).filter(activity => c.laborEnabled[activity.id] !== false);
        let inactive = snapshot.idle;
        for (const activity of activities) {
            const assigned = Math.max(0, c.laborAllocations[activity.id] || 0);
            const useful = this.laborUsefulCapacity(c, activity);
            if (Number.isFinite(useful)) {
                inactive += Math.max(0, assigned - useful);
            }
        }
        return inactive;
    }

    gatherInactiveLabor (countyId) {
        const c = this.counties[countyId];
        if (!c) { return 0; }
        this.ensureLabor(c);
        const activities = this.laborActivities(c).filter(activity => c.laborEnabled[activity.id] !== false);
        let gathered = 0;
        for (const activity of activities) {
            const assigned = Math.max(0, c.laborAllocations[activity.id] || 0);
            const useful = this.laborUsefulCapacity(c, activity);
            if (!Number.isFinite(useful)) { continue; }
            const inactive = Math.max(0, assigned - useful);
            if (inactive <= 0) { continue; }
            c.laborAllocations[activity.id] = assigned - inactive;
            gathered += inactive;
        }
        if (gathered > 0 && c.laborVisualCounts) {
            c.laborVisualCounts.__version = 0;
        }
        return gathered;
    }

    previewCountyProduction (c) {
        this.ensureLabor(c);
        const noble = c.owner != null ? this.nobles[c.owner] : null;
        const outputForWorkers = id =>
            Math.min(RESOURCE_PRODUCTION_CAP, Math.max(0, Math.round((c.laborAllocations[id] || 0) * (PRODUCTION_PER_WORKER[id] || 0))));
        const out = {
            grain: 0,
            cattle: 0,
            wood: c.hasLumberMill ? outputForWorkers('wood') : 0,
            stone: c.hasQuarry ? outputForWorkers('stone') : 0,
            iron: c.hasMine ? outputForWorkers('iron') : 0,
            smithy: 0,
            castle: c.castleBuild && this.laborCoverage(c, 'castle') > 0 ? 1 : 0,
            weaponType: c.weaponType || 'sword'
        };

        if (noble && c.hasWorkshop && this.laborCoverage(c, 'smithy') > 0) {
            const def = WEAPON_DEFS[c.weaponType] || WEAPON_DEFS.sword;
            let made = outputForWorkers('smithy');
            if (def.wood > 0) { made = Math.min(made, Math.floor((noble.wood || 0) / def.wood)); }
            if (def.iron > 0) { made = Math.min(made, Math.floor((noble.iron || 0) / def.iron)); }
            out.smithy = Math.max(0, made);
        }

        const cattleFields = this.fieldsOf(c.id, 'cattle');
        if (c.cows > 0 || cattleFields.length > 0) {
            out.cattle = this.cattleProjection(c).delta;
        }

        const grainCoverage = Math.min(1, this.laborCoverage(c, 'grain'));
        const harvest = this.seasonIndex === 2 && c.plantedSacks > 0
            ? Math.round(c.plantedSacks * GRAIN_YIELD * grainCoverage)
            : 0;
        let projectedGrain = c.grainStock + harvest;
        const grainFields = this.fieldsOf(c.id, 'grain').length;
        const sowingCapacity = grainFields * SACKS_PER_FIELD;
        const sown = this.seasonIndex === 3 ? Math.min(sowingCapacity, projectedGrain) : 0;
        projectedGrain -= sown;

        let projectedCows = Math.max(0, c.cows + out.cattle);
        let grainConsumed = 0;
        const consumeFood = (people, ration) => {
            if (people <= 0) { return; }
            const food = this.previewFood({ ...c, cows: projectedCows, grainStock: projectedGrain }, people, ration);
            projectedCows = Math.max(0, projectedCows - food.cowsEaten);
            projectedGrain = Math.max(0, projectedGrain - food.sacksUsed);
            grainConsumed += food.sacksUsed;
        };
        if (this.armyFood) { consumeFood(this.foragersIn(c.id), c.ration); }
        consumeFood(c.population, c.ration);

        out.grainHarvested = harvest;
        out.grainSown = sown;
        out.grainConsumed = grainConsumed;
        out.grain = harvest - sown - grainConsumed;
        return out;
    }

    transferLabor (countyId, from, to, amount = 10) {
        const c = this.counties[countyId];
        if (!c || from === to || amount <= 0) { return false; }
        const snapshot = this.ensureLabor(c);
        if (from !== 'idle' && !(from in c.laborAllocations)) { return false; }
        if (to !== 'idle' && !(to in c.laborAllocations)) { return false; }
        if (from !== 'idle') {
            const fromActivity = this.laborActivities(c).find(item => item.id === from);
            if (fromActivity?.canToggle && fromActivity.operational === false) { return false; }
        }
        if (to !== 'idle') {
            const toActivity = this.laborActivities(c).find(item => item.id === to);
            if (toActivity?.canToggle && toActivity.operational === false) { return false; }
        }
        const available = from === 'idle' ? snapshot.idle : Math.max(0, c.laborAllocations[from] || 0);
        const moved = Math.min(amount, available);
        if (moved <= 0) { return false; }
        if (from !== 'idle') { c.laborAllocations[from] -= moved; }
        if (to !== 'idle') { c.laborAllocations[to] = (c.laborAllocations[to] || 0) + moved; }
        return true;
    }

    laborCoverage (c, activityId) {
        this.ensureLabor(c);
        const activity = this.laborActivities(c).find(item => item.id === activityId);
        if (!activity || activity.need <= 0 || activity.operational === false) { return 0; }
        return (c.laborAllocations[activityId] || 0) / activity.need;
    }

    // Couverture globale conservée pour les liserés du panneau latéral.
    workerCoverage (c) {
        const activities = this.laborActivities(c).filter(activity => c.laborEnabled[activity.id] !== false);
        const need = activities.reduce((sum, activity) => sum + activity.need, 0);
        this.ensureLabor(c);
        const assigned = activities.reduce((sum, activity) => sum + (c.laborAllocations[activity.id] || 0), 0);
        return need > 0 ? assigned / need : 2;
    }

    // Projection pure de la consommation pour l'écran des rations. endTurn()
    // applique ensuite exactement ce plan aux stocks ; l'UI peut donc afficher
    // des valeurs connectées sans avancer la saison ni muter le comté.
    previewFood (c, people = c.population, ration = c.ration) {
        const need = people * RATION_FACTOR[ration];
        const dairyFed = Math.min(need, c.cows * DAIRY_FEEDS_PER_COW);
        let remaining = need - dairyFed;

        const beefShare = c.beefShare === undefined ? 0.5 : c.beefShare;
        let cowsEaten = Math.min(Math.ceil(Math.max(0, remaining * beefShare) / PEOPLE_PER_COW), c.cows);
        let beefFed = Math.min(Math.max(0, remaining), cowsEaten * PEOPLE_PER_COW);
        remaining -= beefFed;

        const sacksUsed = Math.min(Math.ceil(Math.max(0, remaining) / PEOPLE_PER_SACK), c.grainStock);
        const grainFed = Math.min(Math.max(0, remaining), sacksUsed * PEOPLE_PER_SACK);
        remaining -= grainFed;

        if (remaining > 0.5 && c.cows - cowsEaten > 0) {
            const extra = Math.min(Math.ceil(remaining / PEOPLE_PER_COW), c.cows - cowsEaten);
            const fed = Math.min(remaining, extra * PEOPLE_PER_COW);
            cowsEaten += extra;
            beefFed += fed;
            remaining -= fed;
        }

        return {
            dairyFed: Math.round(dairyFed),
            grainFed: Math.round(grainFed),
            beefFed: Math.round(beefFed),
            sacksUsed,
            cowsEaten,
            served: (need - Math.max(0, remaining)) / Math.max(1, people)
        };
    }

    foragersIn (countyId) {
        if (!this.armyFood) { return 0; }
        return this.armiesIn(countyId).reduce((sum, a) => sum + Math.max(0, a.men || 0), 0);
    }

    previewFoodAfterForagers (c) {
        const foragers = this.foragersIn(c.id);
        if (foragers <= 0) { return this.previewFood(c); }
        const tmp = { ...c };
        const armyFood = this.previewFood(tmp, foragers, c.ration);
        tmp.grainStock = Math.max(0, tmp.grainStock - armyFood.sacksUsed);
        tmp.cows = Math.max(0, tmp.cows - armyFood.cowsEaten);
        return this.previewFood(tmp);
    }

    applyArmyLoss (army, n) {
        const loss = Math.min(Math.max(0, Math.round(n)), army.men || 0);
        if (loss <= 0) { return 0; }
        army.men -= loss;
        army.equipped = Math.min(army.equipped || 0, army.men);
        if (army.originMen) {
            let remaining = loss;
            for (const key of Object.keys(army.originMen)) {
                const take = Math.min(army.originMen[key] || 0, remaining);
                army.originMen[key] -= take;
                remaining -= take;
                if (army.originMen[key] <= 0) { delete army.originMen[key]; }
                if (remaining <= 0) { break; }
            }
        }
        if (army.men < 25 && this.armies.includes(army)) {
            this.armies.splice(this.armies.indexOf(army), 1);
        }
        return loss;
    }

    // Couleur de blason du propriétaire d'un comté, null si neutre.
    ownerShield (countyId) {
        const c = this.counties[countyId];
        return (c && c.owner !== null) ? this.nobles[c.owner].shield : null;
    }

    taxIncome (c) {
        if (!c || c.owner === null) { return 0; }
        return Math.round(c.population * c.taxRate / 100 * (1 + c.castleLevel * 0.2));
    }

    /*
     * Fin de tour, dans l'ordre établi par l'aide :
     *  1. impôts (avant la démographie), majorés par le château ;
     *  2. production : naissances bovines (réduites en surpâturage),
     *     récolte créditée après le tour d'AUTOMNE, semis débité après le
     *     tour d'HIVER ;
     *  3. consommation : laitage d'abord (automatique), puis blé et bœuf
     *     pour le reste de la population, selon la ration choisie ;
     *  4. santé (selon la ration effectivement servie), bonheur (impôts,
     *     santé, rations), puis démographie.
     */
    // Sauvegarde : l'état pur (sans la carte, reconstruite au chargement).
    serialize () {
        return JSON.stringify({
            year: this.year,
            seasonIndex: this.seasonIndex,
            seed: this.seed,
            armyFood: this.armyFood,
            selectedCounty: this.selectedCounty,
            victory: this.victory || false,
            counties: this.counties,
            nobles: this.nobles,
            armies: this.armies,
            nextArmyId: this.nextArmyId,
            fields: this.fields
        });
    }

    // Restauration : reconstruit la structure depuis la carte puis applique
    // les données sauvegardées par-dessus.
    static restore (mapData, json, playerShield) {
        const s = new GameState(mapData, playerShield);
        const d = JSON.parse(json);
        Object.assign(s, {
            year: d.year,
            seasonIndex: d.seasonIndex,
            seed: d.seed,
            armyFood: !!d.armyFood,
            selectedCounty: d.selectedCounty,
            victory: d.victory,
            nobles: d.nobles,
            armies: d.armies,
            nextArmyId: d.nextArmyId
        });
        for (const [id, c] of Object.entries(d.counties)) { Object.assign(s.counties[id], c); }
        for (const [k, f] of Object.entries(d.fields)) { if (s.fields[k]) { Object.assign(s.fields[k], f); } }
        return s;
    }

    // Tour des nobles IA : impôt raisonnable, levées d'armées quand la
    // population le permet, expansion vers les comtés non possédés.
    aiTurn () {
        for (const noble of this.nobles) {
            if (noble.isPlayer) { continue; }
            const mine = Object.values(this.counties).filter(c => c.owner === noble.id);
            const myArmies = this.armies.filter(a => a.owner === noble.id);

            for (const c of mine) {
                if (c.taxRate === 0 && c.happiness > 50) { c.taxRate = 10; }
                if (c.population > 450 && myArmies.length < 2) {
                    this.createArmy(c.id, 100);
                }
                // remise en état systématique des friches (« should always
                // be a top priority », l'IA suit le conseil de l'aide)
                for (const f of this.fieldsOf(c.id, 'barren')) {
                    if (f.reclaim === undefined) { f.reclaim = 0; }
                }
            }

            for (const a of this.armies.filter(x => x.owner === noble.id && x.target === null)) {
                const ns = [...(this.neighbours[a.county] || [])];
                const next = ns.find(n => this.counties[n] && this.counties[n].owner !== noble.id);
                if (next !== undefined) { a.target = next; }
                else {
                    const candidates = Object.values(this.counties).filter(c => c.owner !== noble.id);
                    if (candidates.length) { a.target = candidates[(this.rand() * candidates.length) | 0].id; }
                }
            }
        }
    }

    endTurn () {
        const endedSeason = this.seasonIndex; // 2 = automne, 3 = hiver

        this.aiTurn();
        this.lastEvents = [];

        for (const noble of this.nobles) {
            noble.lastWagesDue = 0;
            noble.lastWagesPaid = 0;
            noble.lastDeserters = 0;
        }

        // 0. champs subis : un champ endommagé le reste UNE saison puis
        // devient friche (« after a single season its status will change
        // to barren ») ; les chantiers de remise en état avancent d'un
        // quart de champ par saison — jamais plus, quel que soit le nombre
        // d'ouvriers (aide), et il faut au moins un paysan.
        for (const f of Object.values(this.fields)) {
            if (f.use === 'damaged') {
                f.use = 'barren';
                delete f.damageKind;
            } else if (f.use === 'barren' && f.reclaim !== undefined) {
                const c = this.counties[f.county];
                if (c && this.laborCoverage(c, 'reclaim') > 0) {
                    f.reclaim += 0.25;
                    if (f.reclaim >= 1) { f.use = 'fallow'; delete f.reclaim; }
                }
            }
        }

        for (const c of Object.values(this.counties)) {
            const cowsBefore = c.cows;
            const grainBefore = c.grainStock;
            c.lastPopulation = c.population;
            c.lastHappiness = c.happiness;
            c.lastMigration = 0;
            c.lastArmy = c.pendingArmy || 0;
            c.pendingArmy = 0;
            c.lastTaxIncome = 0;
            c.lastForagers = this.foragersIn(c.id);
            c.lastArmyFood = null;

            // 0b. météo : « Occasionally, a drought or a flood will damage
            // a usable field » — sécheresse l'été/automne, inondation
            // l'hiver/printemps ; une récolte en cours est détruite
            c.lastFieldDamage = null;
            if (this.rand() < FIELD_DAMAGE_CHANCE) {
                const usable = this.fieldsOf(c.id).filter(f => f.use !== 'barren' && f.use !== 'damaged');
                if (usable.length > 0) {
                    const f = usable[(this.rand() * usable.length) | 0];
                    if (f.use === 'grain') { c.plantedSacks = Math.max(0, c.plantedSacks - SACKS_PER_FIELD); }
                    f.use = 'damaged';
                    f.damageKind = (endedSeason === 1 || endedSeason === 2) ? 'parched' : 'flooded';
                    c.lastFieldDamage = f.damageKind;
                }
            }

            // 1. impôts — « Castles attract wealth » : le château majore le
            // revenu par tête à taux égal
            if (c.owner !== null) {
                const income = this.taxIncome(c);
                this.nobles[c.owner].crowns += income;
                c.lastTaxIncome = income;
            }

            // Chaque production utilise désormais son groupe de travailleurs
            // au lieu d'une couverture globale identique pour tout le comté.
            const grainCoverage = Math.min(1, this.laborCoverage(c, 'grain'));
            c.lastProduction = { grain: 0, cattle: 0, wood: 0, stone: 0, iron: 0, smithy: 0, castle: 0 };

            // 1b. industries (comtés possédés) : la production rejoint le
            // trésor unique du noble — rythmes ❓ à calibrer
            if (c.owner !== null) {
                const noble = this.nobles[c.owner];
                const outputForWorkers = id =>
                    Math.min(RESOURCE_PRODUCTION_CAP, Math.max(0, Math.round((c.laborAllocations[id] || 0) * (PRODUCTION_PER_WORKER[id] || 0))));
                c.lastProduction.stone = c.hasQuarry ? outputForWorkers('stone') : 0;
                c.lastProduction.iron = c.hasMine ? outputForWorkers('iron') : 0;
                c.lastProduction.wood = c.hasLumberMill ? outputForWorkers('wood') : 0;
                noble.stone += c.lastProduction.stone;
                noble.iron += c.lastProduction.iron;
                noble.wood += c.lastProduction.wood;
                // Forge : produit le type d'arme choisi pour CE comté
                // (1 seul type/comté), plafonné par la main-d'œuvre puis par
                // le bois/fer disponibles au trésor (partagés entre comtés).
                if (c.hasWorkshop && this.laborCoverage(c, 'smithy') > 0) {
                    const def = WEAPON_DEFS[c.weaponType] || WEAPON_DEFS.sword;
                    let made = outputForWorkers('smithy');
                    if (def.wood > 0) { made = Math.min(made, Math.floor(noble.wood / def.wood)); }
                    if (def.iron > 0) { made = Math.min(made, Math.floor(noble.iron / def.iron)); }
                    made = Math.max(0, made);
                    if (made > 0) {
                        noble.wood -= made * def.wood;
                        noble.iron -= made * def.iron;
                        this.addWeapons(noble, def.id, made);
                        c.lastProduction.smithy = made;
                    }
                }
            }

            // 1c. chantier du château : aucune progression sans bâtisseur.
            if (c.castleBuild && this.laborCoverage(c, 'castle') > 0) {
                c.lastProduction.castle = 1;
                if (--c.castleBuild.remaining <= 0) {
                    c.castleLevel = c.castleBuild.target;
                    c.castleBuild = null;
                }
            }

            // 2a. vaches : naissances pleines sans surpâturage, réduites
            // sinon ou faute de vachers
            if (c.cows > 0 || this.fieldsOf(c.id, 'cattle').length > 0) {
                const delta = this.cattleProjection(c).delta;
                c.cows = Math.max(0, c.cows + delta);
                c.lastProduction.cattle = delta;
            }

            // 2b. blé : récolte après l'automne (réduite si les moissonneurs
            // manquent), semis après l'hiver
            if (endedSeason === 2 && c.plantedSacks > 0) {
                const harvest = Math.round(c.plantedSacks * GRAIN_YIELD * grainCoverage);
                c.grainStock += harvest;
                c.lastProduction.grain = harvest;
                c.plantedSacks = 0;
            }
            if (endedSeason === 3) {
                const sowCapacity = this.fieldsOf(c.id, 'grain').length * SACKS_PER_FIELD;
                const sow = Math.min(sowCapacity, c.grainStock);
                c.grainStock -= sow;
                c.plantedSacks = sow;
            }

            // 3. consommation : laitage automatique et prioritaire ; le
            // surplus se répartit entre pain et bœuf selon le CURSEUR
            // blé↔bœuf de l'écran des rations (beefShare : 0 = tout pain,
            // 1 = tout bœuf, défaut ½ ❓), chaque denrée compensant si
            // l'autre vient à manquer
            if (this.armyFood && c.lastForagers > 0) {
                const armyFood = this.previewFood(c, c.lastForagers, c.ration);
                c.grainStock -= armyFood.sacksUsed;
                c.cows -= armyFood.cowsEaten;
                c.lastArmyFood = armyFood;
                if (armyFood.served < 0.75) {
                    const lossRate = (0.75 - armyFood.served) / 0.75 * ARMY_STARVATION_MAX_LOSS;
                    let lost = 0;
                    for (const a of this.armiesIn(c.id).slice()) {
                        lost += this.applyArmyLoss(a, Math.ceil((a.men || 0) * lossRate));
                    }
                    if (lost > 0) {
                        this.lastEvents.push({ type: 'armyFamine', county: c.id, men: lost });
                    }
                }
            }
            const food = this.previewFood(c);
            c.grainStock -= food.sacksUsed;
            c.cows -= food.cowsEaten;

            // ration servie, en fraction de la population à ration normale
            const served = food.served;
            c.lastFamine = served < 0.75;

            // bilan de table pour l'écran des rations (assiette)
            c.lastFood = food;

            // 4a. santé : ne dépend QUE des rations servies… et de la peste
            // (~2 % par comté et par saison, cf. l'aide : santé et peste
            // sont les seuls facteurs de santé)
            if (served >= 1.5) { c.health = Math.min(4, c.health + 1); }
            else if (served >= 0.95) { c.health = Math.min(3, c.health + 1); }
            else if (served < 0.75) { c.health = Math.max(0, c.health - 1); }
            c.lastPlague = this.rand() < 0.02;
            if (c.lastPlague) { c.health = Math.max(0, c.health - 2); }

            // 4b. bonheur : converge vers une CIBLE stable construite avec
            // les modificateurs du guide §0 (santé, NIVEAU DE RATION choisi,
            // impôt). On indexe la ration sur le niveau choisi et non sur le
            // « servi » saisonnier (la récolte annuelle ferait osciller le
            // bonheur en dents de scie) ; une vraie famine (servi < 0,75)
            // applique le malus « ration nulle ». Bien géré → ~80-95 comme
            // le DOS ; impôt lourd / famine / mauvaise santé → chute.
            // Coefficients ❓ calés au mieux sur les paliers du guide.
            const healthMod = [-10, -5, 0, 1, 2][c.health];
            const RATION_HAPPY = { Quarter: -5, Half: -2, Normal: 1, Double: 4, Triple: 7 };
            const rationMod = c.lastFamine ? -8 : RATION_HAPPY[c.ration];
            const taxMod = c.taxRate <= 5 ? (5 - c.taxRate) : -(c.taxRate - 5) * 1.5;
            const target = Phaser.Math.Clamp(85 + healthMod + rationMod + taxMod, 0, 100);
            c.happiness = Phaser.Math.Clamp(Math.round(c.happiness + (target - c.happiness) * 0.34), 0, 100);
            c.lastHappinessMods = {
                tax: Math.round(taxMod),
                ration: rationMod,
                health: healthMod,
                army: 0,
                plague: c.lastPlague ? -2 : 0,
                other: 0
            };

            // 4c. démographie (calée guide §0 + relevés DOS : naissances
            // ~14 %/saison à faible population, décroissant avec la DENSITÉ
            // — plafond intrinsèque ~2000, plage optimale 1100-1600 ;
            // décès ~3 % à santé parfaite, montant quand la santé baisse ;
            // famine = surmortalité). Sans la décroissance densitaire, le
            // stock de blé accumulé provoquait un boom-bust à 4500.
            const density = Phaser.Math.Clamp(1.15 - c.population / 2000, 0.05, 1);
            c.lastBirths = Math.round(c.population * 0.14 * density * Phaser.Math.Clamp(served, 0.4, 1.1));
            const deathRate = 0.03 + (4 - c.health) * 0.025 + (served < 0.9 ? (0.9 - served) * 0.2 : 0);
            c.lastDeaths = Math.round(c.population * deathRate);
            c.population = Math.max(0, c.population + c.lastBirths - c.lastDeaths);

            // bilans de saison affichés au panneau (nombres verts/rouges)
            c.lastCowsDelta = c.cows - cowsBefore;
            c.lastGrainDelta = c.grainStock - grainBefore;

            // 4d. révolte : plus de 4 saisons consécutives sous bonheur 25
            // → le comté chasse son seigneur et redevient neutre
            c.unhappySeasons = c.happiness < 25 ? c.unhappySeasons + 1 : 0;
            c.lastRevolt = false;
            if (c.unhappySeasons > 4 && c.owner !== null) {
                c.owner = null;
                c.taxRate = 0;
                c.happiness = 50;
                c.unhappySeasons = 0;
                c.lastRevolt = true;
            }
        }

        // 5. migrations : les habitants des comtés voisins glissent vers le
        // plus heureux (différentiel de bonheur, cf. l'aide)
        for (const c of Object.values(this.counties)) {
            const ns = this.neighbours[c.id];
            if (!ns) { continue; }
            for (const nid of ns) {
                const n = this.counties[nid];
                if (!n) { continue; }
                const diff = n.happiness - c.happiness;
                if (diff <= 10) { continue; }
                const movers = Math.min(Math.round(c.population * 0.005 * (diff / 20)), c.population);
                c.population -= movers;
                n.population += movers;
                c.lastMigration -= movers;
                n.lastMigration += movers;
            }
        }

        for (const c of Object.values(this.counties)) {
            if (!Array.isArray(c.populationHistory)) { c.populationHistory = [c.lastPopulation || c.population]; }
            c.populationHistory.push(c.population);
            if (c.populationHistory.length > 12) { c.populationHistory.splice(0, c.populationHistory.length - 12); }
            if (!Array.isArray(c.happinessHistory)) { c.happinessHistory = [c.lastHappiness || c.happiness]; }
            c.happinessHistory.push(c.happiness);
            if (c.happinessHistory.length > 12) { c.happinessHistory.splice(0, c.happinessHistory.length - 12); }
        }

        // 5b. Soldes : faute de couronnes, une partie des troupes deserte.
        // Les montants exacts sont a mesurer dans le DOS.
        for (const noble of this.nobles) {
            const armies = this.armies.filter(a => a.owner === noble.id);
            const due = armies.reduce((sum, a) => sum + Math.ceil((a.men || 0) / 25) * SOLDIER_WAGE_PER_25, 0);
            noble.lastWagesDue = due;
            noble.lastWagesPaid = Math.min(due, noble.crowns || 0);
            if (due <= 0) { continue; }
            if ((noble.crowns || 0) >= due) {
                noble.crowns -= due;
                continue;
            }
            const paidShare = Math.max(0, noble.crowns || 0) / due;
            noble.crowns = 0;
            for (const a of armies.slice()) {
                noble.lastDeserters += this.applyArmyLoss(a, Math.ceil((a.men || 0) * (1 - paidShare) * 0.35));
            }
            if (noble.lastDeserters > 0) {
                this.lastEvents.push({ type: 'desertion', county: null, winner: noble.id, men: noble.lastDeserters });
            }
        }

        this.seasonIndex = (this.seasonIndex + 1) % SEASONS.length;
        if (endedSeason === 2) { this.year++; }

        // événements de la saison, annoncés par le héraut au tour suivant
        for (const c of Object.values(this.counties)) {
            if (c.lastRevolt) { this.lastEvents.push({ type: 'revolt', county: c.id }); }
            if (c.lastPlague) { this.lastEvents.push({ type: 'plague', county: c.id }); }
            if (c.lastFamine) { this.lastEvents.push({ type: 'famine', county: c.id }); }
            if (c.lastFieldDamage) { this.lastEvents.push({ type: c.lastFieldDamage, county: c.id }); }
        }

        // 6. armées : un saut de comté par tour vers leur cible, puis
        // batailles (autorésolution) et captures
        for (const a of this.armies.slice()) {
            if (!this.armies.includes(a)) { continue; } // détruite ce tour
            if (a.target !== null && a.target !== a.county) {
                const hop = this.nextHop(a.county, a.target);
                if (hop !== null) { a.county = hop; }
                if (a.county === a.target) { a.target = null; }
            }

            // bataille contre les armées ennemies présentes
            for (const e of this.armiesIn(a.county)) {
                if (e.owner === a.owner || !this.armies.includes(a)) { continue; }
                const sa = this.armyStrength(a) * (0.9 + this.rand() * 0.2);
                const se = this.armyStrength(e) * (0.9 + this.rand() * 0.2);
                const winner = sa >= se ? a : e;
                const loser = winner === a ? e : a;
                this.armies.splice(this.armies.indexOf(loser), 1);
                winner.men = Math.max(1, winner.men - Math.round(loser.men * 0.5));
                winner.equipped = Math.min(winner.equipped, winner.men);
                this.lastEvents.push({ type: 'battle', county: a.county, winner: winner.owner });
            }

            // capture du comté : directe si neutre ou sans château (le
            // château est abandonné) ; sinon ASSAUT contre la garnison
            // automatique du château (proportionnelle au design ❓)
            if (this.armies.includes(a)) {
                const c = this.counties[a.county];
                if (c && c.owner !== a.owner && this.armiesIn(a.county).every(x => x.owner === a.owner)) {
                    if (c.owner !== null && c.castleLevel > 0) {
                        const garrison = c.castleLevel * 60;
                        const sa = this.armyStrength(a) * (0.9 + this.rand() * 0.2);
                        if (sa > garrison) {
                            c.owner = a.owner;
                            c.taxRate = 0;
                            c.happiness = Math.min(c.happiness, 40);
                            a.men = Math.max(1, a.men - Math.round(garrison * 0.4));
                            a.equipped = Math.min(a.equipped, a.men);
                            this.lastEvents.push({ type: 'siege', county: c.id, winner: a.owner });
                        } else {
                            a.men = Math.round(a.men * 0.6);
                            if (a.men < 25) { this.armies.splice(this.armies.indexOf(a), 1); }
                            else { a.equipped = Math.min(a.equipped, a.men); }
                            this.lastEvents.push({ type: 'siegefail', county: c.id, winner: c.owner });
                        }
                    } else {
                        c.owner = a.owner;
                        c.taxRate = 0;
                        c.happiness = Math.min(c.happiness, 40);
                        this.lastEvents.push({ type: 'capture', county: c.id, winner: a.owner });
                    }
                }
            }
        }

        // 7. élimination / victoire : un noble sans comté ni armée est hors
        // jeu ; la partie est gagnée quand il ne reste que le joueur
        for (const noble of this.nobles) {
            if (noble.eliminated) { continue; }
            const holdings = Object.values(this.counties).some(c => c.owner === noble.id)
                || this.armies.some(a => a.owner === noble.id);
            if (!holdings) {
                noble.eliminated = true;
                this.lastEvents.push({ type: noble.isPlayer ? 'defeat' : 'eliminated', county: null, winner: noble.id });
            }
        }
        if (!this.player.eliminated && this.nobles.every(n => n.isPlayer || n.eliminated)) {
            if (!this.victory) {
                this.victory = true;
                this.lastEvents.push({ type: 'victory', county: null, winner: 0 });
            }
        }
    }
}
