import { gothic, hoverRed } from '../theme';
import { t } from '../i18n';
import { GAME_OPTIONS, NOBLE_COUNTS, defaultSettings } from '../game/settings';

// `face` sert aussi de clé de traduction du titre du noble
// (customGame.noble.<face>) ; le joueur (face 'player') affiche son propre nom.
const NOBLES = [
    { name: 'Cornwall', shield: 'purple', face: 'player' },
    { name: 'The Baron', shield: 'red', face: 'baron' },
    { name: 'The Knight', shield: 'yellow', face: 'knight' },
    { name: 'The Countess', shield: 'black', face: 'countess' },
    { name: 'The Bishop', shield: 'blue', face: 'bishop' }
];

const VISIBLE_MAPS = 5;

/*
 * Écran « Custom game » : choix de la carte (les 24 slots de L2_MAPS.DAT
 * exportés en JSON) et des 12 réglages de partie de l'original. Objectif
 * premier : pouvoir tester n'importe quelle carte. Fond = CUSTOM.PL8 ;
 * blasons et portraits = MISC_SEL.PL8.
 *
 * « Lancer » écrit la carte choisie (registry 'mapFile') et les réglages
 * (registry 'gameSettings'), efface la partie en cours et démarre la campagne.
 */
export default class CustomGame extends Phaser.Scene {

    constructor ()
    {
        super({ key: 'CustomGame', active: false });
    }

    preload ()
    {
        this.load.image('CustomGameBackground', 'images/scenes/CustomGame/Background.png');
        for (const noble of NOBLES) {
            this.load.image(`custom-shield-${noble.shield}`,
                `images/scenes/CustomGame/custom-shield-${noble.shield}.png`);
            this.load.image(`custom-shield-${noble.shield}-off`,
                `images/scenes/CustomGame/custom-shield-${noble.shield}-off.png`);
            this.load.image(`custom-face-${noble.face}`,
                `images/scenes/CustomGame/custom-face-${noble.face}.png`);
        }
        for (let i = 0; i < 24; i++) {
            const slot = String(i).padStart(2, '0');
            this.load.image(`custom-map-${slot}`,
                `images/scenes/CustomGame/maps/custom-map-${slot}.png`);
        }
        this.load.json('mapIndex', 'maps/campaign/data/index.json');
    }

    create ()
    {
        this.add.image(320, 240, 'CustomGameBackground');
        this.maps = this.cache.json.get('mapIndex') || [];
        this.settings = defaultSettings();
        this.mapScroll = 0;
        const playerShield = this.registry.get('playerShield') || 'purple';
        const playerName = this.registry.get('playerName') || 'Cornwall';
        this.nobles = NOBLES.map((noble, i) => i === 0
            ? { name: playerName, shield: playerShield, face: 'player' }
            : noble);

        const black = 0x1c1208;
        gothic(this, 320, 6, t('customGame.title'), 'large').setOrigin(0.5, 0).setTint(0xe7cf86);
        this.mapPreview = this.add.image(560, 69, 'custom-map-00');

        // --- joueur et adversaires (colonne gauche) ---
        this.nobleRows = this.nobles.map((noble, i) => {
            const y = 5 + i * 94;
            const shield = this.add.image(18, y, `custom-shield-${noble.shield}`).setOrigin(0, 0);
            const face = this.add.image(90, y + 4, `custom-face-${noble.face}`).setOrigin(0, 0);
            // joueur : son propre nom ; adversaires : leur titre traduit
            const displayName = noble.face === 'player' ? noble.name : t('customGame.noble.' + noble.face);
            const name = this.add.bitmapText(82, y + 68, 'lords2-small', displayName)
                .setOrigin(0.5, 0);
            return { shield, face, name, noble };
        });

        // --- liste des cartes (fenêtre noire à droite) ---
        this.add.rectangle(493, 137, 109, 92, 0xf1ead2).setOrigin(0, 0);
        this.mapLabels = Array.from({ length: VISIBLE_MAPS }, (_, row) => {
            const select = () => {
                const index = this.mapScroll + row;
                if (index < this.maps.length) {
                    this.settings.map = index;
                    this.refresh();
                }
            };
            this.add.zone(548, 149 + row * 17, 109, 17).setInteractive()
                .on('pointerdown', select);
            const t = this.add.bitmapText(500, 141 + row * 17, 'lords2-small', '')
                .setTint(black).setInteractive();
            t.on('pointerdown', select);
            t.on('pointerover', () => {
                const index = this.mapScroll + row;
                if (this.settings.map !== index) { t.setTint(0x6a2010); }
            });
            t.on('pointerout', () => {
                const index = this.mapScroll + row;
                if (this.settings.map !== index) { t.setTint(black); }
            });
            return t;
        });
        this.add.zone(620, 143, 20, 24).setInteractive()
            .on('pointerdown', () => this.scrollMaps(-1));
        this.add.zone(620, 218, 20, 24).setInteractive()
            .on('pointerdown', () => this.scrollMaps(1));

        // --- réglages (droite, 2 colonnes) ---
        // clic gauche = valeur suivante, clic droit = précédente
        this.optionLabels = GAME_OPTIONS.map((o, i) => {
            const col = i % 2;
            const row = (i / 2) | 0;
            const x = 330 + col * 155;
            const y = 250 + row * 30;
            this.add.bitmapText(x, y, 'lords2-small', t('customGame.opt.' + o.key)).setTint(0xe7cf86);
            const val = this.add.bitmapText(x, y + 13, 'lords2-small', '').setTint(0xffe070).setInteractive();
            val.on('pointerdown', (p) => {
                const dir = p.rightButtonDown() ? -1 : 1;
                const n = o.values.length;
                this.settings[o.key] = (this.settings[o.key] + dir + n) % n;
                this.refresh();
            });
            return val;
        });

        // --- boutons ---
        const mkBtn = (x, label, fn) => hoverRed(
            gothic(this, x, 210, label, 'small').setOrigin(0.5, 0).setInteractive()
        ).on('pointerdown', fn);
        mkBtn(201, t('customGame.cancel'), () => this.scene.start('SinglePlayerMenu'));
        mkBtn(280, t('customGame.start'), () => this.launch());
        mkBtn(359, t('customGame.default'), () => { this.settings = defaultSettings(); this.refresh(); });

        this.input.mouse.disableContextMenu();
        this.refresh();
    }

    refresh ()
    {
        const black = 0x1c1208;
        const nobleCount = NOBLE_COUNTS[this.settings.nobles];
        this.nobleRows.forEach((row, i) => {
            const active = i < nobleCount;
            const suffix = active ? '' : '-off';
            row.shield.setTexture(`custom-shield-${row.noble.shield}${suffix}`);
            row.face.setAlpha(active ? 1 : 0.35);
            row.name.setAlpha(active ? 1 : 0.35);
        });

        this.ensureSelectedMapVisible();
        this.mapPreview.setTexture(`custom-map-${String(this.settings.map).padStart(2, '0')}`);
        this.mapLabels.forEach((t, row) => {
            const index = this.mapScroll + row;
            const map = this.maps[index];
            t.setText(map ? map.name : '');
            t.setVisible(!!map);
            t.setTint(index === this.settings.map ? 0xc00000 : black);
        });
        this.optionLabels.forEach((val, i) => {
            const o = GAME_OPTIONS[i];
            val.setText(t('customGame.val.' + o.values[this.settings[o.key]]));
        });
    }

    ensureSelectedMapVisible ()
    {
        if (this.settings.map < this.mapScroll) {
            this.mapScroll = this.settings.map;
        } else if (this.settings.map >= this.mapScroll + VISIBLE_MAPS) {
            this.mapScroll = this.settings.map - VISIBLE_MAPS + 1;
        }
        this.mapScroll = Phaser.Math.Clamp(
            this.mapScroll,
            0,
            Math.max(0, this.maps.length - VISIBLE_MAPS)
        );
    }

    scrollMaps (direction)
    {
        this.mapScroll = Phaser.Math.Clamp(
            this.mapScroll + direction,
            0,
            Math.max(0, this.maps.length - VISIBLE_MAPS)
        );
        this.refresh();
    }

    launch ()
    {
        const map = this.maps[this.settings.map];
        this.registry.set('mapFile', map.file);
        this.registry.set('gameSettings', this.settings);
        // nouvelle partie : on repart d'un état vierge
        this.registry.remove('gameState');
        this.registry.remove('camScroll');
        this.scene.start('Campaign');
    }
}
