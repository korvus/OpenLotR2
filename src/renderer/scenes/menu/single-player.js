import { largeFont, smallFont, gothic, hoverRed } from '../../theme';
import { t } from '../../i18n';

export class SinglePlayerMenu extends Phaser.Scene {

    constructor() {
        super({ key: 'SinglePlayerMenu' });
    }

    preload() {
        this.lineBottomColor = '0xB8B8B8';
        this.lineTopColor = '0x4C4C4C';

        // this.load.image('MainBackground', 'images/backgrounds/Main.png');
        // this.load.atlas('Panels2Atlas', 'images/system/panels2.png', 'images/system/panels2.json');

    }

    create() {
        this.add.image(0, 0, 'MainBackground').setOrigin(0);
        this.panel = this.add.tileSprite(180, 16, 0, 0, 'Panels2Atlas', 'stonePanel').setOrigin(0);

        this.largeFont = largeFont;
        this.smallFont = smallFont;

        this.SinglePlayer();
        // this.SingleOrMultiPlayer();
        // this.SelectShield();


    }


    // localText[localText.length] = this.add.line(0, 0, 226, 92, 415, 92, this.lineTopColor).setOrigin(0);
    // localText[localText.length] = this.add.line(0, 0, 415, 93, 415, 114, this.lineTopColor).setOrigin(0);
    // localText[localText.length] = this.add.line(0, 0, 225, 92, 225, 115, this.lineBottomColor).setOrigin(0);
    // localText[localText.length] = this.add.line(0, 0, 225, 115, 415, 115, this.lineBottomColor).setOrigin(0);


    drawBox(x, y, local) {
        local[local.length] = this.add.line(0, 0, x + 1, y, x + 191, y, this.lineTopColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x + 191, y + 1, x + 191, y + 23, this.lineTopColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x, y, x, y + 24, this.lineBottomColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x, y + 24, x + 191, y + 24, this.lineBottomColor).setOrigin(0);
    }




    SinglePlayer() {

        this.panel.x = 180;
        this.panel.y = 26;
        this.panel.displayHeight = 277;
        this.panel.displayWidth = 280;

        var localText = [],
            that = this;

        // Play now
        this.drawBox(224, 92, localText);
        //Load a game
        this.drawBox(224, 127, localText);
        // Skirmish
        this.drawBox(224, 163, localText);
        // Customer game
        this.drawBox(224, 199, localText);
        // back
        this.drawBox(224, 235, localText);


        // polices originales : titre FNTL2_22, boutons FNTL2_14 centrés
        // sur les boîtes (224..415)
        localText[localText.length] = gothic(this, 320, 48, t('sp.title'), 'large').setOrigin(0.5, 0);

        localText[localText.length] = hoverRed(gothic(this, 320, 97, t('sp.playNow')).setOrigin(0.5, 0).setInteractive())
            .on('pointerdown', function (pointer, localX, localY, event) {
                that.scene.start('OrginalOrRoyalMenu');
            });

        localText[localText.length] = gothic(this, 320, 132, t('sp.loadGame')).setOrigin(0.5, 0);

        localText[localText.length] = gothic(this, 320, 168, t('sp.skirmish')).setOrigin(0.5, 0);

        localText[localText.length] = hoverRed(gothic(this, 320, 204, t('sp.customGame')).setOrigin(0.5, 0).setInteractive())
            .on('pointerdown', function (pointer, localX, localY, event) {
                that.registry.set('newGameMode', 'custom');
                that.scene.start('ShieldMenu');
            });

        localText[localText.length] = hoverRed(gothic(this, 320, 240, t('common.back')).setOrigin(0.5, 0).setInteractive())
            .on('pointerdown', function (pointer, localX, localY, event) {
                that.scene.start('MainMenu');
            });
    }

    MultiPlayer() {

    }
}
