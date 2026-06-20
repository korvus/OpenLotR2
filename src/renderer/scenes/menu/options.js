import { gothic, hoverRed } from '../../theme';
import { LOCALES, LOCALE_NAMES, getLocale, setLocale, t } from '../../i18n';

/*
 * Écran d'options. Pour l'instant : le choix de la langue. Conçu pour
 * accueillir d'autres réglages plus tard (son, vitesse…).
 *
 * Changer de langue persiste le choix (i18n → localStorage) puis relance la
 * scène : tout se réaffiche immédiatement dans la nouvelle langue. La langue
 * active est en rouge (comme le survol des libellés de l'original), les autres
 * en noir avec survol rouge.
 */
export class OptionsMenu extends Phaser.Scene {

    constructor () {
        super({ key: 'OptionsMenu' });
    }

    preload () {
        this.lineBottomColor = '0xB8B8B8';
        this.lineTopColor = '0x4C4C4C';
    }

    create () {
        this.add.image(0, 0, 'MainBackground').setOrigin(0);
        this.panel = this.add.tileSprite(180, 16, 0, 0, 'Panels2Atlas', 'stonePanel').setOrigin(0);
        this.panel.x = 164;
        this.panel.y = 16;
        this.panel.displayWidth = 312;
        this.panel.displayHeight = 229;

        const black = 0x000000;

        gothic(this, 320, 30, t('options.title'), 'large').setOrigin(0.5, 0);

        // Ligne « Langue » + un libellé par langue disponible.
        gothic(this, 320, 90, t('options.language')).setOrigin(0.5, 0).setTint(black);

        const active = getLocale();
        LOCALES.forEach((locale, i) => {
            const label = gothic(this, 320, 120 + i * 26, LOCALE_NAMES[locale]).setOrigin(0.5, 0);
            if (locale === active) {
                label.setTint(0xc00000);
            } else {
                hoverRed(label.setInteractive()).on('pointerdown', () => {
                    setLocale(locale);
                    this.scene.restart();
                });
            }
        });

        hoverRed(gothic(this, 320, 210, t('common.back')).setOrigin(0.5, 0).setInteractive())
            .on('pointerdown', () => this.scene.start('MainMenu'));
    }
}
