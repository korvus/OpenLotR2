import { largeFont, smallFont, gothic, hoverRed } from '../../theme';
import { t } from '../../i18n';
import { addStonePanel } from './stone-panel';

export class OrginalOrRoyalMenu extends Phaser.Scene {

    constructor() {
        super({ key: 'OrginalOrRoyalMenu' });
    }

    preload() {
        this.lineBottomColor = '0xB8B8B8';
        this.lineTopColor = '0x4C4C4C';

    }

    create() {
        this.add.image(0, 0, 'MainBackground').setOrigin(0);
        this.panel = null;

        this.largeFont = largeFont;
        this.smallFont = smallFont;

        this.OriginalOrSeige();
        // this.SelectShield();


    }



    drawBox(x, y, local) {
        local[local.length] = this.add.line(0, 0, x + 1, y, x + 191, y, this.lineTopColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x + 191, y + 1, x + 191, y + 23, this.lineTopColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x, y, x, y + 24, this.lineBottomColor).setOrigin(0);
        local[local.length] = this.add.line(0, 0, x, y + 24, x + 191, y + 24, this.lineBottomColor).setOrigin(0);
    }

    OriginalOrSeige() {

        if (this.panel) { this.panel.destroy(); }
        this.panel = addStonePanel(this, 68, 56, 504, 117);

        var localText = [],
            that = this;

        // Original 
        this.drawBox(110, 116, localText);
        // Seige
        this.drawBox(366, 116, localText);


        // polices originales : titre FNTL2_22, boutons FNTL2_14 centrés
        // sur leurs boîtes (110..301 et 366..557)
        localText[localText.length] = gothic(this, 320, 66, t('or.prompt'), 'large').setOrigin(0.5, 0);

        localText[localText.length] = hoverRed(gothic(this, 206, 121, t('or.original')).setOrigin(0.5, 0).setInteractive())
            .on('pointerdown', function (pointer, localX, localY, event) {
                for (var x in localText) {
                    localText[x].destroy();
                }
                that.SelectShield();
            });
        localText[localText.length] = hoverRed(gothic(this, 462, 121, t('or.new')).setOrigin(0.5, 0).setInteractive())
            .on('pointerdown', function (pointer, localX, localY, event) {

                that.scene.start('ShieldMenu');
            });
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


        localText[localText.length] = this.add.text(250, 45, 'Your Options', this.largeFont);

        localText[localText.length] = this.add.text(273, 92, 'Play Now!', this.smallFont).
            setInteractive().on('pointerdown', function (pointer, localX, localY, event) {
                for (var x in localText) {
                    localText[x].destroy();
                }
                that.OriginalOrSeige();
            });

        localText[localText.length] = this.add.text(266, 127, 'Load a game', this.smallFont);

        localText[localText.length] = this.add.text(280, 163, 'Skirmish!', this.smallFont);

        localText[localText.length] = this.add.text(264, 199, 'Custom game', this.smallFont).setInteractive().on('pointerdown', function (pointer, localX, localY, event) {
            this.scene.registry.set('newGameMode', 'custom');
            this.scene.scene.start('ShieldMenu');
        });



        localText[localText.length] = this.add.text(295, 235, 'Back', this.smallFont).style.setAlign('center');
    }

    MultiPlayer() {

    }

    SelectShield() {
        this.scene.start('ShieldMenu');
    }
}
