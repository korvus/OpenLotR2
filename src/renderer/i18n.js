/*
 *  `i18n` module — traduction centralisée de l'interface.
 *  =====================================================
 *
 *  Point d'entrée unique pour tout texte affiché. Les scènes appellent
 *  `t('clé', params)` au lieu d'écrire les chaînes en dur ; les dictionnaires
 *  vivent dans `./locales/<lang>.js`.
 *
 *  - Anglais ('en') par défaut, et repli systématique sur l'anglais puis sur
 *    la clé elle-même : une traduction manquante n'efface jamais un libellé
 *    ni ne plante l'écran.
 *  - La langue choisie est persistée dans `localStorage` (le renderer est un
 *    contexte navigateur), donc conservée d'une session à l'autre.
 *  - Les polices bitmap originales (lords2-9/14/22) contiennent les glyphes
 *    accentés Latin-1 (à â ç é è ê î ô û ü…), le français se rend tel quel.
 */
import en from './locales/en';
import fr from './locales/fr';

const DICTS = { en, fr };

//  Langues proposées, dans l'ordre d'affichage du sélecteur.
export const LOCALES = ['en', 'fr'];

//  Libellés des langues dans leur propre langue (pour l'écran d'options).
export const LOCALE_NAMES = { en: 'English', fr: 'Français' };

export const DEFAULT_LOCALE = 'en';

const STORAGE_KEY = 'lotr2.locale';

let current = readStored();

function readStored () {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && LOCALES.includes(stored)) { return stored; }
    } catch (e) {
        //  localStorage indisponible (mode privé, sandbox…) : on reste en mémoire.
    }
    return DEFAULT_LOCALE;
}

export function getLocale () {
    return current;
}

export function setLocale (locale) {
    if (!LOCALES.includes(locale)) { return current; }
    current = locale;
    try {
        window.localStorage.setItem(STORAGE_KEY, locale);
    } catch (e) {
        //  cf. readStored : on garde la valeur en mémoire pour la session.
    }
    return current;
}

/*
 * Traduit une clé pointée (ex. 'menu.singlePlayer').
 *  - repli : langue courante → anglais → la clé brute ;
 *  - interpolation : les `{nom}` du modèle sont remplacés par `params.nom`
 *    (« {n} crowns » + { n: 50 } → « 50 crowns »).
 */
export function t (key, params) {
    let str = DICTS[current][key];
    if (str === undefined) { str = DICTS[DEFAULT_LOCALE][key]; }
    if (str === undefined) { str = key; }
    if (params) {
        str = str.replace(/\{(\w+)\}/g, (match, name) =>
            (params[name] !== undefined ? String(params[name]) : match));
    }
    return str;
}
