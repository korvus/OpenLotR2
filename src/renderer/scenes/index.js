/*
 *  `scenes` module
 *  ===============
 *
 *  Declares all present game scenes.
 */
export { default as Boot } from './boot';
// export {default as Intro} from './intro';
export { default as Loader } from './loader';
export { MainMenu } from './menu/main';
export { OptionsMenu } from './menu/options';
export { SinglePlayerMenu } from './menu/single-player';
export { OrginalOrRoyalMenu } from './menu/orginal-royal';
export { ShieldMenu } from './menu/shield';
// Armoury: désactivée tant que ses frames (armoryTorch, *Arms) ne sont pas
// extraites — sa présence dans la liste la faisait tourner au boot et dessiner
// des carrés "texture manquante" par-dessus les autres scènes.
// export { default as Armoury } from './armoury';
// export {default as Merchant} from './merchant';
// export {default as Castle} from './castle';
export { default as CustomGame } from './custom-game';
// export {default as GreatestNoble} from './greatest-noble';
export { default as Campaign } from './campaign';

