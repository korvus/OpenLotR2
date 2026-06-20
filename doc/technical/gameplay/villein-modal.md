# La modale de gestion des villains (vue des terres du comté) — DOS

> Référence pour **retrouver et reproduire** la modale où l'on répartit les
> villains entre les activités. C'est l'écran que le portage reproduit dans
> `openAdvancedLaborDialog` (`src/renderer/scenes/campaign.js`).
>
> Captures de référence (versionnées) :
> - [`doc/captures/villein-modal-dos.png`](../../captures/villein-modal-dos.png) — écran DOS complet, modale ouverte.
> - [`doc/captures/villein-modal-dos-zoom.png`](../../captures/villein-modal-dos-zoom.png) — la modale agrandie ×3 (lisible).

## 1. Ce que c'est

Une **vue ISO bordée des terres du comté** (cadre rouge/doré). Chaque zone de
la carte correspond à une **activité** et peut recevoir des villains
déplaçables. Attention : la capture statique contient aussi des personnages de
décor, qui ne sont pas des unités manipulables. Pour identifier un sprite de
tâche, il faut sélectionner/glisser des villains dans le DOS, cliquer la zone
cible, puis capturer le sprite qui apparaît dans cette zone.

⚠️ **Ne PAS confondre** avec :
- le **chariot / marchand** (icône de chariot) → ouvre un écran **3D séparé**
  (Ale, marchandises) ; rien à voir avec les villains ;
- la **carte stratégique** des comtés (vue d'ensemble du royaume).

## 2. Comment l'ouvrir (procédure exacte)

En jeu (640×480), comté possédé par le joueur :

1. **Cliquer la ville du comté** — le bâtiment **2×2** au centre du comté,
   repéré par sa **bannière violette**. (Clic gauche : `mousedown ; ~130 ms ;
   mouseup`, cf. pièges souris plus bas.) Un **panneau d'info** s'ouvre
   (clic droit dessus donne « County town »).
2. **Fermer le panneau d'info**, puis **fermer le parchemin d'aide
   « The Town Center »** s'il apparaît (sa **punaise de fermeture est en bas du
   parchemin**, ~`y≈308` en 640×480 — pas au milieu).
3. La **modale ISO bordée** des terres du comté apparaît alors. Elle occupe en
   gros l'écran `(58,62)`–`(372,378)` en 640×480.

> Le repérage+clic précis du bâtiment coûte cher en pilotage DOS isolé
> (cf. §6). Si tu dois y revenir souvent, **fais un savegame** une fois la
> modale atteignable et recharge-le.

## 3. Ce qu'elle montre — un ouvrier VILLANI par activité

| Zone (modale) | Activité | Sprite DOS |
|---|---|---|
| Champ doré (haut-centre) | **Grain** | **actif validé 2026-06-17** : acheter 5 sacs au marchand (`Trading Grain`), assigner un champ en blé en hiver, passer au printemps, puis ouvrir Town Center. Référence : `2026-06-17T19-04-30-355Z_dos-seeded-wheat-town-labor-visible.png`; unité extraite comme `labor-unit-grain-active`. Le vieux diff `dos3-grain-allocated` → `dos3-VILLEIN-MODAL` reste seulement `surplus-inactive` (champ confirmé `Farm land-Cattle`). |
| Forêt / billots | **Bois** | **validé utilisateur 2026-06-16** : groupe rouge/vert |
| Carrière (roche grise / fosse sombre) | **Pierre** | à capturer après déplacement d'unités sur une carrière active dont la fiche DOS dit explicitement `Stone quarrying` ; ne pas réutiliser le mineur de fer |
| Site vert + échafaudage | **Fer / mine** | **validé DOS 2026-06-17** : clic sur le site → `Iron mining`, icône seau de fer ; ne pas l'utiliser pour la pierre |
| Fourneau (bas-gauche) | **Forge** | premier profil = forgeron actif ; autres figures assises/inactives si bois/fer insuffisant pour employer toute la main-d'œuvre |
| Échafaudage / château | **Château** | actif uniquement si une construction de château est lancée via l'icône château en bois (4e icône de la colonne droite) ; capture DOS active 2026-06-16 intégrée comme `labor-unit-castle-active` |
| Près des vaches noir&blanc | **Bétail** | **validé utilisateur 2026-06-16** : groupe bleu/blanc |
| Terre stérile gauche (entre carrière/mine et forge) | **Défrichage / remise en état** | à capturer après activation d'un champ stérile à défricher |
| Centre-ville | **Oisifs / désœuvrés** | les paysans du centre sont censés être assis/inoccupés, pas affectés au défrichage |

Sources d'art (`.PL8`, palette `LORDS2.256`) — voir
[`tools/extract-clean-figures.js`](../../../tools/extract-clean-figures.js) :
- **VILLANI2** : `0-6` grain (faux), `7-14` bois, **`15-24` = fontaine
  (disque coloré — PAS un ouvrier !)**, `25-32` carrière, `33-39` forge ;
- Sites conditionnels : `VILLANI2 40` = carrière de pierre sombre/roche grise ;
  `VILLANI2 43` = mine de fer verte avec échafaudage. Les noms
  `labor-site-quarry` / `labor-site-iron` doivent rester dans ce sens.
- **VILLANI1** : bâtisseurs ; **VILLAGE3** `0-6` : villageois (oisifs/bétail).
- **PEASANT.PL8 = placeholder** : frames étiquetées *walk / attack / DIE / DIG*
  en vert sur noir, **aucun art utilisable** (ne pas y chercher de sprite).

## 4. Sémantique des figures — DEUX cas distincts à ne pas confondre

Précisions utilisateur (2026-06-16) :

- **Figure NOIRE = sous-effectif.** Il **manque de la main-d'œuvre** dans
  l'activité citée (moins de villains affectés que le besoin `need`). C'est un
  appel à allouer plus d'ouvriers. → côté portage : afficher la silhouette
  manquante quand `workers < need`. Le DOS emploie une silhouette sombre générique commune à
  toutes les activités (`labor-unit-missing`), et non le sprite du métier
  teinté en noir.
- **Paysan ASSIS = inactif faute d'activité exerçable.** Les villains sont là
  mais **ne peuvent pas travailler** parce que l'activité **n'existe pas** dans
  ce comté :
  - pas de **champ de blé semé/actif** → les villains « grain » restent assis ;
  - zone centrale/oisifs → les villains restent accroupis/désœuvrés ;
  - défrichage à gauche sans champ stérile activé → pas de travail réel ;
  - **forge sans assez de bois/fer** pour le type d'arme choisi → seuls les
    forgerons couverts par les matières premières travaillent, les autres
    restent assis ;
  - **aucun chantier de château** lancé → les bâtisseurs restent assis ; etc.
  → côté portage : cas `need === 0` / industrie absente (figure « oisive »
  posée, ni active ni noire).

À répercuter fidèlement dans `refreshAdvancedLaborDialog` : **noir** et
**assis** sont deux états différents (manque d'ouvriers vs activité absente).

- **Paysan JAUNE = transport/sélection en cours.** Capturé pendant le
  déplacement d'un groupe (`2026-06-17T18-25-21-620Z_...`) et nommé
  `labor-unit-moving`. Il sert seulement à matérialiser un groupe en main,
  jamais comme sprite actif/inactif d'une tâche.

**L'activité est ACTIVABLE par le joueur.** « Assis / inactif » n'est pas un
état permanent : en **cliquant une zone** et en **choisissant son usage** (ex.
cliquer un champ → « champ de blé », ou lancer un chantier de château), le
joueur **active** l'activité. Le champ se met alors à **réclamer de la
main-d'œuvre** (`need > 0`) → les villains s'y mettent au travail, et tant que
`workers < need` les figures restent **noires** (sous-effectif). Cycle complet :

```
zone vide → (clic + choix d'usage) → activité créée, need > 0
          → villains assignés : noirs si workers < need, actifs si workers ≥ need
```

Donc côté portage la zone doit être **interactive** (choix d'usage), pas un
simple afficheur : choisir l'usage crée le `need`, et le `need` pilote ensuite
actif / noir.

## 5. Côté portage (où c'est implémenté)

- `src/renderer/scenes/campaign.js` → `openAdvancedLaborDialog` /
  `refreshAdvancedLaborDialog` : place des figures unitaires répétées
  proportionnellement au nombre d'ouvriers affectés.
- Une figure visible n'est pas forcément un habitant réel : quand les effectifs
  sont élevés, elle représente un paquet pondéré de travailleurs. Le joueur
  sélectionne une figure visible, et le portage transfère le nombre d'ouvriers
  porté par cette figure (`laborAmount`), pas toute l'activité.
- Le poids d'une persona reste fixé par le budget global de 25 figures
  (`workforce / 25`, sauf le dernier reste). Il ne doit jamais augmenter parce
  que la zone d'une activité limite son nombre de sprites visibles. Une persona
  déplacée retire exactement une figure à la source et en ajoute une à la cible.
- L'échelle de pondération est globale au panneau : les ~20 personas visibles
  représentent la population du comté. Exemple validé par l'utilisateur : avec
  383 habitants et 20 personas, une persona vaut environ 20 habitants ; 6
  personas dans le champ de blé représentent donc environ 120 paysans affectés
  au blé.
- Densité visuelle : le nombre de sprites ne doit pas saturer dès que
  `workers >= need`. Une couverture utile normale occupe seulement une partie
  des emplacements ; les emplacements restants matérialisent le surplus. Ainsi
  un transfert grain → bois modifie à la fois `laborAllocations` et la densité
  visible du panneau.
- Exception validée 2026-06-18 : **bois**, **pierre** et **fer** ne doivent
  pas créer de groupe assis/inactif parce que `workers > need`. Ces activités
  extractives n'ont pas de limite DOS d'affectation ; toutes les personas
  assignées y sont actives, et la production augmente jusqu'au plafond de 999
  unités par ressource et par tour.
- Ne pas dessiner de silhouettes grises génériques pour les oisifs : l'essai
  précédent empiétait visuellement sur la zone bois/scierie et ne correspondait
  pas à la capture DOS. Les oisifs doivent être recapturés en DOS avant rendu.
- Interaction DOS observée : le clic gauche court sur une zone/personnage ouvre
  le parchemin d'information de la tâche ; la sélection d'ouvriers se fait au
  glisser-rectangle. Un glisser vide ne doit pas ouvrir le parchemin.
- Sélection partielle : le rectangle doit sélectionner uniquement les sprites
  visibles intersectés. Le cadre de zone entière ne doit être affiché que pour
  une sélection globale ; pour 1, 2, 3 personnages, seuls ces sprites sont
  surlignés.
- Débordement : un groupe de paysans doit rester dans le rectangle visuel de
  son activité. Si l'effectif affiché ne tient pas dans le layout brut, le
  cluster est translaté/compressé dans le slot au lieu de déborder sur la
  forge, la scierie, les champs ou les zones voisines.
- Bois : la zone cliquable reste large, mais les bûcherons sont rendus dans la
  clairière supérieure/droite de l'activité bois, pas sur la canopée de la
  forêt en bas du panneau.
- Fond : `src/renderer/public/images/scenes/MainScene/advanced-labor/advanced-labor-background.png`
  (⚠️ le **disque fontaine** y avait été cuit par erreur lors d'une extraction —
  artefact retiré par inpaint ; ne pas le réintroduire).
- Figures de décor historiques : `labor-figure-*.png` (même dossier),
  générées par `node tools/extract-clean-figures.js <PL8-dir> <out-dir> --final`.
- Figures manipulables DOS : `labor-dos-*.png` (groupes capturés en jeu),
  `labor-unit-*.png` (unités isolées par rôle) et
  `labor-dos-workers.json`, générés par
  `node tools/extract-dos-labor-workers.js`. Ces sprites viennent des captures
  DOS après déplacement d'ouvriers, pas des personnages de décor.
- Défrichage actif : `labor-unit-reclaim-active.png` est extrait depuis la
  capture DOS du champ stérile explicitement mis en défrichage
  (`2026-06-17T11-33-40-327Z...`). Ne pas réutiliser `reclaim-inactive` pour ce
  cas : il provenait de l'ancien essai au centre, qui n'est pas la zone de
  défrichage.

## 6. Piloter le DOS pour y revenir (MCP `lotr2`)

Backend isolé WSL+Xvfb+xdotool (ne touche jamais la vraie souris). Voir
[`tools/mcp-lotr2/README.md`](../../../tools/mcp-lotr2/README.md).

Pièges souris (DOSBox/SDL) :
- `xdotool click 1` **ne latche pas** → toujours `mousemove ; mousedown 1 ;
  sleep 0.13 ; mouseup 1`.
- En mode non-capturé, le curseur invité est **découplé** du pointeur X
  (accélération) : viser <8 px est coûteux ; utiliser le **corner-slam**
  (`mousemove_relative -- -2000 -2000` cale au coin 0,0) puis approcher, et
  **vérifier par recadrage** (`portage`/`screenshot` + crop .NET NearestNeighbor).
- Glisser-boîte pour sélectionner des villains puis cliquer la zone cible :
  `mousedown 1 ; mousemove … ; mouseup 1` puis clic sur l'activité.

Coordonnées relevées (640×480, comté « Raw Sienna ») : modale `(58,62)`–`(372,378)` ;
champ de grain ~`(240,128)` ; fosse/mine ~`(335,195)` ; paysans oisifs au centre
~`(210–280, 255–320)` ; bâtiment du comté ~`(290,208)`.
