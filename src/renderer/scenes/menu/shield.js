import { largeFont, smallFont, gothic, hoverRed } from '../../theme';
import { t } from '../../i18n';
import { addStonePanel } from './stone-panel';

export class ShieldMenu extends Phaser.Scene {

    constructor() {
        super({ key: 'ShieldMenu' });

        this.name = '';
        this.shield = 'purple';
    }

    preload() {
        this.lineBottomColor = '0xB8B8B8';
        this.lineTopColor = '0x4C4C4C';

    }

    create() {
        this.name = this.registry.get('playerName') || t('shield.defaultName');
        this.shield = this.registry.get('playerShield') || 'purple';
        // let input = document.createElement("input");

        // window.document.body.append(input);
        this.add.image(0, 0, 'MainBackground').setOrigin(0);
        this.panel = null;

        this.largeFont = largeFont;
        this.smallFont = smallFont;


        this.SelectShield();
        // this.SelectShield();


    }


    drawBox(x, y, local) {
        local[local.length] = this.add.line(0, 0, x + 1, y, x + 191, y, this.lineTopColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x + 191, y + 1, x + 191, y + 23, this.lineTopColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x, y, x, y + 24, this.lineBottomColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x, y + 24, x + 191, y + 24, this.lineBottomColor).setOrigin(0);
    }

    SelectShield() {
        if (this.panel) { this.panel.destroy(); }
        this.panel = addStonePanel(this, 84, 16, 490, 250);

        const localText = [];
        const shields = {};
        const that = this;

        // Original 
        this.drawBox(110, 215, localText);
        // Seige
        this.drawBox(336, 215, localText);

        // polices originales : titre FNTL2_22, boutons FNTL2_14 centrés
        // sur leurs boîtes (110..301 et 336..527) — survol rouge du DOS
        localText[localText.length] = gothic(this, 320, 42, t('shield.title'), 'large').setOrigin(0.5, 0);

        localText[localText.length] = hoverRed(gothic(this, 206, 220, t('common.back')).setOrigin(0.5, 0).
            setInteractive().on('pointerdown', function (pointer, localX, localY, event) {
                that.registry.remove('newGameMode');
                that.scene.start('SinglePlayerMenu');
            }));

        localText[localText.length] = hoverRed(gothic(this, 432, 220, t('shield.continue')).setOrigin(0.5, 0).
            setInteractive().on('pointerdown', function (pointer, localX, localY, event) {
                for (var x in localText) {
                    localText[x].destroy();
                }
                that.registry.set('playerName', that.name);
                that.registry.set('playerShield', that.shield);
                window.Player.sheild = that.shield;
                const next = that.registry.get('newGameMode') === 'custom'
                    ? 'CustomGame'
                    : 'Campaign';
                that.registry.remove('newGameMode');
                that.scene.start(next);
            }));


        // Draw the input-box background FIRST, then the name text on top,
        // otherwise the stone panel hides what the player types.
        this.add.tileSprite(320, 100, 224, 32, 'Panels2Atlas', 'stoneInput');
        this.nameText = gothic(this, 320, 100, this.name).setOrigin(0.5);
        this.nameText.setDepth(10);

        this.input.keyboard.removeAllListeners();
        this.input.keyboard.on('keydown', (event) => {
            const key = event.key;
            if (!key) return;
            if (key === 'Backspace') {
                that.name = that.name.slice(0, -1);
            } else if (key.length === 1) {
                that.name += key;
            }
            that.nameText.setText(that.name);
        });

        // Clicking a shield selects it: the crown sits on top of the chosen
        // one, like in the original game.
        const shieldX = { red: 150, yellow: 235, black: 288 + 30, purple: 288 + 120, blue: 288 + 210 };
        const shieldY = 140 + 30;

        for (const color of Object.keys(shieldX)) {
            shields[color] = this.add.tileSprite(shieldX[color], shieldY, 0, 0, 'Panels2Atlas', color + 'Active')
                .setInteractive()
                .on('pointerdown', () => {
                    that.shield = color;
                    that.crown.x = shieldX[color];
                });
        }

        // tileSprite, not image: the atlas frames carry a TexturePacker pivot
        // (0,0) that add.image honours, which shifts the sprite half a frame.
        this.crown = this.add.tileSprite(shieldX[this.shield], shieldY - 45, 0, 0, 'Panels2Atlas', 'crown').setDepth(10);
    }

}
