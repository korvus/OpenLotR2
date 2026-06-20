/*
 * Réglages de partie personnalisée (« Custom game » de l'original).
 *
 * Les 12 options de l'écran DOS, chacune avec sa liste de valeurs. Les
 * libellés (option et valeurs) sont traduits à l'affichage par l'i18n :
 * l'option via la clé `customGame.opt.<key>`, chaque valeur via
 * `customGame.val.<valeur anglaise>` (cf. custom-game.js). Les chaînes
 * `values` ici restent donc en anglais — ce sont les clés de traduction
 * autant que la valeur de repli. Toutes les mécaniques ne sont pas encore
 * branchées : on FIXE ici les constantes pour qu'elles existent et soient
 * lues quand chaque système arrivera. La valeur par défaut est l'indice `def`.
 *
 * Réglages effectivement appliqués aujourd'hui : `map` (carte jouée),
 * `nobles` (nombre de seigneurs), `crowns` (trésor de départ) et `armyFood`
 * (fourrage des armées). Les autres sont stockés dans le registry
 * ('gameSettings') et consommés à terme.
 */
export const GAME_OPTIONS = [
    { key: 'advancedFarming', values: ['No', 'Yes'], def: 0 },
    { key: 'armyFood', values: ['No', 'Yes'], def: 0 },
    { key: 'castles', values: ['none', 'palisade', 'keep', 'all'], def: 2 },
    { key: 'countyPower', values: ['low', 'medium', 'high'], def: 1 },
    { key: 'exploration', values: ['No', 'Yes'], def: 0 },
    { key: 'level', values: ['easy', 'medium', 'hard'], def: 0 },
    { key: 'weapons', values: ['none', 'a few', 'lots'], def: 1 },
    { key: 'duration', values: ['unlimited', '50 years', '100 years'], def: 0 },
    { key: 'nobles', values: ['two', 'three', 'four', 'five'], def: 3 },
    { key: 'startSize', values: ['none', 'small', 'medium', 'large'], def: 0 },
    { key: 'crowns', values: ['1000', '5000', '10000', '20000'], def: 0 },
    { key: 'combat', values: ['all', 'auto', 'none'], def: 0 }
];

// Nombre de nobles correspondant à l'option `nobles`.
export const NOBLE_COUNTS = [2, 3, 4, 5];

// Valeurs de départ en couronnes.
export const CROWN_AMOUNTS = [1000, 5000, 10000, 20000];

// Réglages par défaut (indices), comme l'écran DOS à l'ouverture.
export function defaultSettings () {
    const s = { map: 0 };
    for (const o of GAME_OPTIONS) { s[o.key] = o.def; }
    return s;
}
