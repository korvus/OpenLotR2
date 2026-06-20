# Écrans secondaires, interface et militaire — spécification des mécanismes (d'après L2HELP.HLP)

> Source d'autorité : dump texte du fichier d'aide officiel,
> `tools/out/l2help-strings.txt` (lignes 1–2820 ; le reste est du bruit
> binaire). Toutes les citations entre guillemets sont des phrases originales
> de l'aide (anglais). Les points flous ou absents sont marqués
> « ❓ à vérifier en jeu ».
>
> Complément de `doc/technical/gameplay/county-economy.md` (économie de
> comté : champs, rations, impôts, industries, château côté économie, tour de
> jeu). Cette spec couvre les **écrans**, l'**interface** et le **militaire**.
> Les mécanismes économiques déjà spécifiés sont seulement référencés.

---

## 1. Interface générale

### 1.1 Souris et défilement

Conventions globales (section *Game Time and Mouse Commands*) :

> "In general, left-clicking on icons on the main map performs a function,
> while right-clicking calls up information. You may right-click on features
> in any county to view some general information about them."

> "Scroll around a map by placing your mouse pointer just over any edge of
> your computer screen. You may scroll in any direction: north, south, east,
> west, or diagonal in any direction, until you reach the edge of the game
> area."

- "Up and down arrows, where they appear, will allow you to set numerical
  values. Slider bars allow you to allocate people between two types of
  activity."
- Validation/annulation récurrentes dans tous les panneaux : gantelet
  **pouce levé** = confirmer, gantelet **pouce baissé** ou **clic droit** =
  annuler ("Select the thumbs up gauntlet to complete the transaction. Select
  the thumbs down gauntlet (or right click) to exit the panel without making
  a transaction.").
- Comté sélectionné = celui **au centre de la carte principale** : "The
  selected county is always the county in the center of your main map view.
  It is indicated on the mini map by a white highlight around its border."

### 1.2 Barre de menus

> "In addition to your pull-down [menus] (File, Options, Help), the menu bar
> will always display the year and season, and the amount of money in your
> treasury. The unit of currency is the Crown."

**Rangée d'écussons** (état de fin de tour des joueurs) :

> "At the beginning of every turn, a row of shields will appear along the
> menu bar. Each shield represents a player in the game (either human or
> computer-controlled). As each player ends his or her turn the corresponding
> shield will disappear from the menu bar."

### 1.3 Menu File

| Entrée | Comportement (aide) |
|---|---|
| **New Game** | "Click on this to begin a new game." |
| **Load** | "Click on this to load a saved game. In the panel that appears, click on the saved game you wish to load, then click on the thumbs up gauntlet to begin." |
| **Save** | "A panel with a text box. Type a name in the box. To overwrite a previously saved game, select its name from the list so that the name appears in the box." Validation par gantelet pouce levé. |
| **Exit** | "Select this option to exit the game." |

### 1.4 Menu Options

| Entrée | Comportement (aide) |
|---|---|
| **Advanced** (sous-menu) | Contient *Advanced farming*, *Army foraging*, *Fight Humans Only?*, *Exploration* (voir §8). |
| **Sound** | "This option allows you to turn the music and sound effects sound on or off." |
| **Animations** | "option allows you to control the animated portions of the game. Turning the animations off may help the game run faster on slower computers." |
| **Full Screen** | "Turning the Full Screen option on ensures that the game window takes up your entire screen, regardless of the resolution you have set. (Turning Full Screen on can improve performance.)" |
| **Game Speed** | "Clicking on this calls up a parchment panel in which you can adjust the game speed." |
| **Scroll [speed]** | "Clicking on this calls up a parchment panel in which you can adjust map scrolling speed." |

❓ à vérifier en jeu : la liste exacte et l'ordre des entrées du menu Options,
et les valeurs/paliers des panneaux Game Speed et Scroll Speed (l'aide ne les
chiffre pas).

### 1.5 Raccourcis clavier documentés

L'aide ne documente quasiment **aucun** raccourci hors bataille :

- **F1** : aide — "For help with Help, press the F1 key."
- En bataille, **groupes de contrôle** : "To create a command group, select
  all the units you would like to group together, and hold down the [___] key
  while pressing any number key from **1 to 9**. Hitting that number key by
  itself at any time during the remainder of the battle will select that
  group of units." ❓ à vérifier en jeu : le nom de la touche modificatrice
  est perdu dans le dump (vraisemblablement Ctrl).
- En bataille, **formations** : "Press the [___] key to order the selected
  units into a horizontal line. Press the [___] key to order selected units
  into a vertical line." ❓ à vérifier en jeu : les deux touches exactes sont
  perdues dans le dump.

❓ à vérifier en jeu : tout autre raccourci (fin de tour, écrans, etc.) —
absent de l'aide.

### 1.6 Mini-carte, overlays et carte d'ensemble

En haut du panneau latéral :

- **Mini-carte** : "The mini map in the upper corner shows the entire realm.
  Each county a player controls is filled in with the player's game color.
  When you click on a county in the mini map, the main map will center on
  that county." Comté sélectionné = bordure blanche.
- **Boutons d'overlay** (à droite de la mini-carte) : "The buttons to the
  right of the mini map display various color coded overlays (**idle workers,
  rations, and happiness**) for each county your control." Soit 3 overlays +
  1 bouton overview.
- **Carte d'ensemble (overview map)** : bouton **loupe** — "To view the
  overview map, click on the button with the magnifying glass to the right of
  the mini map." Plein écran : "The overview map shows the locations of all
  merchants, armies, supply wagons, castles, and revolting peasants." Les
  comtés neutres y apparaissent **verts** ("Neutral counties appear green on
  the overview map"). Clic sur un comté = ses infos sur le panneau ; pour
  revenir : "click on the overview map on the county you wish to view".

❓ à vérifier en jeu : le rendu exact des 3 overlays (codes couleur par comté).

---

## 2. Le panneau latéral (control panel) et sa barre d'actions

> "The control panel allows you to view reports and take actions in order to
> rule your lands." — il agit toujours sur le **comté sélectionné**.

### 2.1 Affichages cliquables (chaque affichage ouvre un écran)

| Affichage | Clic → écran | Référence |
|---|---|---|
| Note de bonheur (cœur rouge, 0–100) | Happiness Report (graphique par saison + facteurs) | county-economy §3.2 |
| Population | Population Report (voir §3.1) | — |
| Taux d'impôt ("displayed on the control panel beneath the population tally") | Tax panel | county-economy §4 |
| Affichage des rations (assiette) | Ration panel (voir §3.2) | county-economy §2 |
| Jauge de santé | (indicateur seul ; la santé se lit aussi sur le ration panel) | county-economy §3.1 |
| Slider main-d'œuvre + symboles de production | clic sur un symbole = infos industrie ; clic sur le symbole d'arme = forge (§3.5) | county-economy §1.8, §5 |
| Ville (sur la carte principale) | Advanced Labor Panel | county-economy §1.8 |

### 2.2 Boutons d'action documentés

L'aide nomme explicitement ces boutons du panneau :

| Bouton | Effet |
|---|---|
| **Build Castle** | Ouvre l'écran de conception du château (§3.3). "To build a castle in a county that lacks one, click on the Build Castle button on the control panel." |
| **Create an Army** | Ouvre l'armurerie/conscription (§4.1). "To create an army, click on the Create an Army button on the control panel." |
| **Send Supplies** | Ouvre le panneau de transport (§3.7). "click on the Send Supplies button at the bottom of the control panel" |
| **Treasury** | Ouvre la trésorerie (§3.6). |
| **Diplomacy** | Ouvre le panneau de diplomatie. "click on the diplomacy button on the control panel to access the diplomacy panel" |
| **End Turn** | Termine le tour. "When your tasks are complete, click on the End Turn button." Le libellé du bouton réapparaît quand le tour suivant est prêt. |

❓ à vérifier en jeu : la disposition exacte des boutons (ordre, icônes) — non
décrite dans l'aide.

---

## 3. Écrans secondaires

### 3.1 Population : rapport et villages

Il n'existe **pas d'écran de village dédié** dans l'aide ; la population se
consulte via le **Population Report** :

> "To monitor your fluctuating population, click directly on the population
> display on your control panel. The Population Report will appear,
> displaying a graph that chronicles the seasonal changes in the selected
> county['s] population since the start of the game."

Les villages sont une **représentation cartographique** de la taille de la
population, et une cible de pillage :

- "As a population grows, villages will also appear outside of the county
  town."
- "The county town appears on the map as an area with homes and other
  buildings. As a county grows, its county town will change in appearance."
- Pillage : "You may also attack a county's villages and slaughter its
  people, which reduces the county's population."

Seuils exacts retrouvés dans les exécutables DOS et Windows :

- 0 village jusqu'à 600 habitants ;
- 1 village de 601 à 1000 ;
- 2 villages de 1001 à 1400 ;
- 3 villages de 1401 à 1600 ;
- 4 villages à partir de 1601.

La capitale utilise une progression distincte : petite jusqu'à 800 habitants,
moyenne de 801 à 1200, grande à partir de 1201. Preuves binaires :
`L2D.EXE` aux offsets fichier `0x81A50`/`0x81AB0`, et `LORDS2.EXE` aux
offsets `0x3D9A0`/`0x3DA30`.

Le clic sur la **ville** ouvre l'Advanced Labor Panel (pas un écran de
village) : "To do so, click directly on a county's county-town."

### 3.2 Écran des rations (assiette)

Mécanique complète dans county-economy §2. Rappel côté écran :

- Ouverture : "Click directly on the ration display on the Control Panel to
  access the rations panel."
- Contenu : niveau de ration réglable (Quarter/Half/Normal/Double/Triple),
  ligne **Achieved** (ration réellement servie), **slider blé↔bœuf** (le
  laitage est consommé automatiquement en premier), nombre sous le symbole de
  fromage = personnes nourries par le seul laitage, tableau bas de panneau
  (rangée 1 : personnes nourries par denrée ; rangée 2 : sacs/vaches
  consommés), **symboles de cœurs** = effet anticipé sur le bonheur.
- La santé du comté s'y lit aussi : "To see a selected county's health
  rating, click on the Rations display on the control panel."
- Avec *Army Foraging* actif : "the ration panel will keep you informed of
  how many soldiers are foraging in each county."

### 3.3 Écran du château

Côté économie (matériaux, ouvriers, fiscalité) : county-economy §6. Ici, le
déroulé écran et la garnison.

#### 3.3.1 Écran de conception (castle design screen)

Ouverture : bouton **Build Castle** (comté sélectionné). "If the selected
county already has a castle, you may only alter the existing castle."

- **Cinq designs**, du plus simple au plus complexe, affichés en bas
  d'écran : "Wooden Palisade, Motte and Bailey, Norman Keep, Stone Castle,
  Royal Castle".
- **Parchemin** en haut à droite : "The scroll at the top right names the
  castle design you have selected. It also shows how many units of stone
  and/or wood are needed to build it."
- **Durée** : "Beneath the materials listing is an entry describing how long
  it will take to build the selected design. If you have any laborers
  assigned to castle building, this display will show you how long it will
  take that number of laborers to complete the construction. If you have no
  laborers assigned to castle building, this display shows the completion
  time based on a minimum recommended number of workers."
- Validation : "click on the thumbs up gauntlet to begin the project and
  return to the main map."
- ❓ à vérifier en jeu : quantités bois/pierre, durées et « minimum
  recommended number of workers » par design (affichés par le jeu, jamais
  chiffrés dans l'aide).

#### 3.3.2 Chantier, maçons, altération, réparation

- Lancement possible sans tous les matériaux ; affectation automatique d'une
  partie des ouvriers d'industrie ; symbole château + **nombre de saisons
  restantes** sur le panneau ; clic droit sur le chantier = rapport (maçons,
  saisons restantes, tonnes de bois/pierre manquantes). Message au début du
  tour suivant l'achèvement. (Détails et citations : county-economy §6.2.)
- **Altération** (upgrade/downgrade) via le même bouton Build Castle :
  "Upgrading a castle will require labor, materials and time. Downgrading a
  castle will also require labor and time. Depending on the previous castle
  design, a downgrade may free up some materials, or it may require other
  additional materials."
- **Réparation** après siège : clic droit sur le château = matériaux requis +
  estimation de durée ; mêmes ouvriers que la construction ; "Only when the
  repair is 100 percent finished will you see any improvement." ; "Damage
  will carry over from siege to siege unless you repair it."

#### 3.3.3 Garnison

> "A garrison is an [army] that resides in and defends a castle. A new castle
> will automatically include a garrison. Its size will vary according to the
> size of the castle, its soldiers are subtracted from the county
> [population], and its weapon costs are covered by the cost of the castle."

- **Capacité** par design : "a Wooden Palisade can hold far fewer men, for
  example, than a Royal Castle. Right-click on a completed castle to display
  its troop capacity." ❓ à vérifier en jeu : capacités et tailles de
  garnison automatique par design.
- **Garnir** : "To garrison a castle, march an army right into the castle.
  While a castle is garrisoned, a flag of the player's color will fly over
  it. To review the garrison, right-click directly on the castle."
- Composition conseillée par l'aide : la garnison automatique est composée
  d'archers (❓ à vérifier en jeu — l'aide dit que ces unités "are good at
  defending castle walls" et conseille d'ajouter du corps-à-corps) ; "The
  best type of soldiers to place in a castle are [archers and] crossbowmen."
  Et côté stratégie : "A good garrison will consist of mostly archers with
  the rest of the army divided between crossbowmen (for killing [attackers]
  and destroying siege weapons) and hand-to-hand units (for defending against
  breaches)."
- Avec foraging : la garnison mange "from the castle's store rather than from
  the county" (astuce n°10). ❓ à vérifier en jeu : existence/mécanique du
  stock de nourriture de château.

### 3.4 Écran du marchand

Mécanique économique (routes, fréquence) : county-economy §5. Côté écran :

- **Condition** : "Trade may be conducted only when a merchant is present in
  a county." Ouverture : "click on a merchant wagon in any county you
  control."
- **Survol** d'un article : "a small scroll will appear, naming the item and
  showing two numbers (such as 30/60)." Gauche = prix de **vente** ("the
  amount you will get if you sell a unit of that item to the merchant"),
  droite = prix d'**achat** ("the amount you will pay for each unit of the
  item that you buy"). "you'll notice a large difference between buying and
  selling prices!"
- **Transaction** : clic sur l'article → panneau avec flèches haut/bas. "The
  right set of arrows sets the maximum possible purchase or sale, while the
  left set allows you to change the quantity one unit at a time." Le panneau
  affiche "the unit price of the selected item, how many crowns your treasury
  has, and your gain or loss as a result of the transaction." "Click on the
  up arrow to buy, or click on the down arrow to sell." Gantelet pouce levé =
  conclure ; pouce baissé ou clic droit = annuler.
- **Ce qui se vend/s'achète** : "buy cows, grain, weapons, ale, wood, iron,
  or stone" ; on peut aussi **vendre** ces mêmes biens ("You may also sell
  these items to a merchant if you have extra, or need to raise money."),
  y compris la pierre ("The only use for stone (besides selling it to
  merchants)…").
- **Exclusions** : le **laitage** ne se vend jamais ("Dairy produce cannot be
  sold or transported") ; la **bière (ale)** s'achète mais ne se produit pas
  ("you cannot produce ale yourself") — son seul effet est un bonus de
  bonheur temporaire.
- ❓ à vérifier en jeu : la grille de prix complète par article, la variation
  éventuelle des prix entre marchands/saisons, les limites de stock du
  marchand, et si la bière peut être revendue.

### 3.5 Forge (blacksmith screen) — production d'armes

Ouverture : "To go the blacksmith shop, click directly on the weapon symbol
on the control panel (or click on the blacksmith on the advanced labor
panel" ; le symbole n'existe que si la forge est **opérationnelle** (clic sur
le bâtiment pour l'activer).

- **Mise en scène** : "In the blacksmith shop, you will see a number of
  weapons hanging on or leaning against the walls. The currently produced
  weapon lies on the table in the foreground." Changer de production = clic
  sur l'arme au mur ; elle vient sur la table.
- **Une seule production à la fois** : "Each county may only produce one type
  of weapon at a time."
- **Panneau bas** : "The panel at the bottom of the screen tells you how many
  blacksmiths are working and how many of the selected weapon they will
  produce next season." Plus "a small box showing how much wood and/or iron
  is required to produce a single one of the selected weapon."
- **Contraintes** : production plafonnée par les matériaux ("You will only be
  able to produce as many weapons as you have materials for.") ; on peut
  sélectionner une arme sans matériaux ("Your workers will begin producing it
  as soon as you collect these materials.") ; le bois est partagé avec les
  chantiers de château.
- **Matériaux par arme** (qualitatif — aucune valeur chiffrée dans l'aide) :

  | Arme | Matériaux (aide) |
  |---|---|
  | Bow (arc) | "Bow production requires no iron, but quite a bit of wood." |
  | Crossbow (arbalète) | "Crossbow production requires both wood and iron." / "Crossbows are among the more expensive weapons to purchase or produce." |
  | Mace (masse) | "Mace production requires both iron and wood." / "Pikes are … a bit more expensive than maces." |
  | Pike (pique) | "Pike production requires iron and wood." / "Pikes are less expensive than crossbows, swords, and knight's equipment" |
  | Sword (épée) | "Sword production requires much iron and some wood." |
  | Knight's equipment (équipement de chevalier) | "To outfit knights requires large quantities of iron and small quantities of wood." / "the most … expensive" |

  - **Coûts exacts relevés dans le DOS** (boîte fer puis bois du panneau
    inférieur) : arc 0/13, pique 3/6, masse 4/4, arbalète 10/6, épée 10/3,
    équipement de chevalier 18/4. Captures d'autorité :
    `doc/captures/runtime/*_dos-blacksmith-{bow,pike-or-mace,mace,crossbow,weapon-click-1,knight}.png`.
  - ❓ cadence exacte armes/forgeron/saison à mesurer avec plusieurs
    allocations de forgerons.
- Note : l'arme du **paysan-soldat** (fourche) n'est ni produite ni achetée :
  "Peasants soldiers carry only their own pitchforks as weapons, so they cost
  no crowns to raise and arm."

### 3.6 Trésorerie

> "The treasury lists the TOTAL amount of gold, iron, stone, wood and
> weaponry for ALL of your counties."

- Ouverture : bouton **Treasury** du panneau. Stock unique partagé entre tous
  les comtés (county-economy §4).
- Affiche aussi les **soldes militaires** : "You may consult your Treasury at
  any time to see the total army wages you must pay each season."
- Contient le bouton du **Best Noble report** : "The treasury panel also
  includes the button that accesses the Best Noble report." Ce rapport
  compare les joueurs sur : "number of counties, number of castles, number of
  troops, number of gold crowns, happiest people, number of people, and an
  overall rating, greatest noble".

### 3.7 Panneau de transport (Send Supplies)

Mécanique : county-economy §2.4. Côté écran :

- Origine = comté sélectionné à l'ouverture ; petite carte du royaume avec
  origine en surbrillance ; clic sur le comté destinataire (**uniquement un
  comté à soi** : "You may only send goods to counties you control") ;
  flèches gauche/droite pour fixer quantités de **blé et/ou vaches** (seuls
  biens transportables) ; gantelet pouce levé = expédier.
- "The shipment will take a few seasons, depending on the distance it must
  travel" ; "Supply carts can be destroyed!" (par des armées ennemies).

### 3.8 Panneau de diplomatie (résumé)

Hors périmètre détaillé de cette spec, mais c'est un écran du panneau :
portraits des adversaires restants, **barre colorée** de relation
("red=hostile, blue=indifferent, green=friendly", hauteur = qualité), statut
**enemy** irréversible, **1 message par adversaire et par tour** ("Each turn
you may send one message to each of the other players."), types de messages :
compliment, insulte, cadeau monétaire (Dispatch Gift), offre d'alliance, et
pour les alliés : Terminate / Ask ally for help / Ask ally to attack (avec
mini-carte de ciblage).

---

## 4. Armées : levée, armement, entretien

Deux classes de soldats : "There are two main classes of soldiery in Lords
II: citizen soldiers and mercenaries."

### 4.1 Conscription (écran d'armurerie, étape 1)

Ouverture : bouton **Create an Army**. → "The [armory screen] will appear.
The panel in the middle of the armory contains a slider bar which you may use
to choose the number of citizens you want to draft into your next army."

- Le slider partage la population : "the numbers on either side of the bar
  will equal your current population". Vers le soldat = plus de conscrits.
  "Just moving the bar does not actually conscript anyone, it just sets the
  percentage of people you will conscript." Confirmation par **Continue**.
- **Coût en bonheur** : le panneau affiche "The change in [happiness]
  resulting from the conscription level you set. The higher the percentage,
  the lower your happiness will fall."
- **Verrou** : "You may not conscript a number that will cause happiness to
  drop below zero — beyond a certain point, peasants will simply refuse to
  take up arms!" Et : "If Happiness drops to zero, you may not conscript any
  more men."
- **Coût en population** : "Once part of an army, citizens cease to be
  counted among your population." (retrait direct + effet indirect
  d'émigration si on abuse — county-economy §3.3).
- Le panneau affiche aussi : "The number of [mercenaries] (if any) in the
  county, and the hiring price they demand" (avec avertissement si l'or
  manque), et "The number of each type of weapon currently in your armory.
  If you have 20 swords, the army may not include more than 20 [swordsmen]".
- ❓ à vérifier en jeu : la formule bonheur perdu ↔ % conscrit.

### 4.2 Armement (écran d'armurerie, étape 2)

> "An army must have at least **50 soldiers** in it."

- "The figures at the bottom of the screen (and the weapons visible in the
  armory) show the types of soldiers you may raise. The weapons you possess
  hang on the armory wall. If swords are visible, you may raise swordsmen; if
  pikes are visible, you may raise pikemen, and so on."
- Clic sur une figurine (ou sur l'arme au mur) → panneau : effectif actuel du
  type + maximum levable ; flèches haut/bas ; "click on the corner arrow to
  close the panel".
- Boutons de sortie : valider = créer l'armée ; revenir = "return to the
  conscription slider bar" ; annuler (ou clic droit) = "return to the main
  map".
- Les hommes sans arme assignée restent **peasant soldiers** (fourche,
  gratuits).

### 4.3 Soldes (army wages)

> "Your citizens soldiers demand wages. If you do not pay your army wages,
> your soldiers will desert and you will lose them."

- Total saisonnier visible dans la trésorerie ; par armée : "To see the wages
  of any specific army, right click on that army on the main map."
- ❓ à vérifier en jeu : solde par type d'unité et par saison ; mécanique
  exacte de la désertion (totale ? partielle ?).

### 4.4 Mercenaires

> "Mercenaries are [soldiers of fortune] who travel from county to county
> offering their services to any lord who will pay their wages."

- Apparition : "When you see a mercenary figure on top of one of your county
  towns on the [main map], a mercenary army is present in your [county]."
- Consultation/embauche via l'écran d'armurerie : "The panel in the middle of
  the screen displays the number and type of the mercenaries, what it will
  cost to hire them, and their seasonal wages."
- Avantages : "They come with their own weapons, though, and hiring them will
  not reduce a county's happiness or population like conscription does."
- Coûts : prix d'embauche + solde saisonnière "deducted automatically from
  your treasury … for every season you employ them."
- **Contrainte de fusion** : "You may not combine two armies that both
  contain mercenaries."
- ❓ à vérifier en jeu : fréquence/composition des bandes de mercenaires et
  grille de prix.

### 4.5 Types d'unités (stats qualitatives de l'aide)

Aucune stat numérique dans l'aide — tout est relatif :

| Unité | Vitesse | Armure | Attaque c-à-c | Défense c-à-c | Tir | Notes (aide) |
|---|---|---|---|---|---|---|
| **Peasant** | "medium speed" | aucune ("They wear no armor") | minimale | minimale | — | "the most basic, most ill-equipped troop type … they cost no crowns to raise and arm" ; "more vulnerable to ranged attacks … than units wearing armor" |
| **Maceman** | rapide ("second only to knights in speed") | légère | bonne ("good attackers") | faible ("weak defenders") | — | "vulnerable to ranged attacks" ; "ideal for chasing down archers and crossbowmen … very effective against peasants" |
| **Pikeman** | "very slowly" | "light mail" | "less than that of macemen, swordsmen, and knights" | "relatively high" | — | "best used to defend archers and crossbowmen" |
| **Archer** | "moderately fast" | aucune | mauvaise ("not well suited to hand-to-hand") | faible | portée **supérieure** à l'arbalète, cadence **plus rapide**, dégât unitaire moindre | "very effective against peasants, macemen, and archers. Against swordsmen and knights, archers are nearly useless." |
| **Crossbowman** | ❓ (non précisé) | légère | "poor hand-to-hand combatants" | meilleure que l'archer | dégât supérieur, "rate of fire is lower" (rechargement long) | "very effective against units wearing armor" et "against siege weapons" |
| **Swordsman** | "reasonably well" | "full chain mail and helmets" + bouclier | élevée ("deadly hand-to-hand fighters") | élevée | — | "your elite fighters" ; "stand up pretty well to archer attacks" |
| **Knight** | "by far the fastest troops on the field" (monté) | "heavy plate mail" + bouclier | "the highest of any troops" | "the highest of any troops" | — | "withstand archer attacks better than anyone. A knight['s] only weakness is his vulnerability to crossbow attacks." Seule unité **incapable de combler les douves**. |

❓ à vérifier en jeu : toutes les valeurs numériques (PV, attaque, défense,
portées, cadences, vitesses) — à extraire des données du binaire ou à mesurer.

---

## 5. Armées sur la carte de comté

### 5.1 Représentation

> "An army is represented by one or more figures carrying a flag of its
> player's color. … A one-figure army is small, a two-figure army is medium
> sized, and a three-figure army is large."

❓ à vérifier en jeu : les seuils d'effectif 1/2/3 figurines.

### 5.2 Panneau d'information d'armée

Clic droit sur une armée → army information panel. "The three buttons at the
bottom of the panel allow you to **move, disband or split** the army." Clic
droit sur une armée **ennemie** : "a small parchment panel displays very
general information about that army."

### 5.3 Déplacement : points de mouvement et routes

Sélection : bouton *move* du panneau, ou clic gauche direct sur l'armée ; le
pointeur change, un chemin se dessine ; clic sur la destination.

> "Each army has a certain number of [movement points] each turn, which
> represents the distance the army is able to travel during one season."

> "The number inside each ball shows the number of movement points it costs
> to move across the terrain your mouse pointer indicates. You'll notice that
> travel across roads uses far fewer points than travel across grass or
> fields. Armies may move across many types of terrain, but they are fastest
> on roads."

- "Splitting armies and fighting battles also use movement points."
- Passages hors-route : "Numerous mountain passes and forest trails allow
  armies to move between counties that are not connected by roads."
  (astuce n°12)
- Tactique de blocage documentée : "all attacks require movement points.
  Block roads with very small armies to buy time." (astuce n°11)
- ❓ à vérifier en jeu : budget de points par armée (dépend-il de la
  composition ? l'unité la plus lente ?), coût par type de terrain, coût d'un
  combat/scission.

### 5.4 Fusionner, scinder, dissoudre

- **Fusion** : "To combine two of your armies, move one army on top of
  another. The first army will march over and combine with the second."
  C'est aussi le moyen de renforcer/équiper une armée existante (créer une
  petite armée avec les nouvelles armes puis fusionner). Interdit si les deux
  contiennent des mercenaires.
- **Scission** : bouton Split Army → panneau de répartition par type avec
  flèches gauche/droite ; gantelets pour valider/annuler ; "Remember: an army
  must have at least 50 soldiers in it." (vaut pour chaque moitié ❓ à
  vérifier en jeu : 50 par armée résultante ou au total).
- **Dissolution** : bouton Disband Army + confirmation. "The soldiers of a
  disbanded army will return to their county of origin and become a part of
  the population again. Their weapons will return to your treasury."
  → l'armée doit mémoriser le **comté d'origine de chaque soldat**.

### 5.5 Pillage

> "You may wage economic warfare by destroying any opponent's active fields
> or industrial sites. To do so, simply march an army over the site you'd
> like to pillage."

- Champ : "When you attack a [grain?] field, your soldiers render the field
  [barren?] and destroy all its contents." (mots tronqués dans le dump —
  county-economy §1.4 ; ❓ à vérifier en jeu : état résultant exact).
- Industrie : "When you attack any industrial site, it must shut down for
  several seasons for repairs." ❓ à vérifier en jeu : nombre de saisons.
- Villages : abattage de population (cf. §3.1).
- Stratégie documentée (astuce n°10 *Split and Pillage*) : pillage total →
  révolte → "half the population becomes brigands".

### 5.6 Approvisionnement et chariots

Deux types de chariots circulent entre les tours ("merchants, supply wagons,
and rebels will move around the map") :

- **Chariots de marchands** : routes fixes, commerce (§3.4).
- **Chariots de transport** (Send Supplies, §3.7) : blé/vaches entre comtés
  possédés, plusieurs saisons de trajet, destructibles ("Supply carts can be
  destroyed!").

**Nourrissage des armées** : par défaut **aucun** — "By default, the Army
Foraging option (under the Options/Advanced menu) is set to [off]. As long as
foraging is off, you will never have to worry about feeding your armies; they
will take care of themselves." Avec l'option (voir §8.2), les armées mangent
sur le comté occupé.

### 5.7 Moral

L'aide **ne documente aucun système de moral** des troupes (ni en campagne ni
en bataille ; pas d'entrée d'index « morale »). Les seuls analogues sont le
**bonheur** civil et la **désertion** pour solde impayée. ❓ à vérifier en
jeu : existence d'un moral caché en bataille (déroute automatique ?) — rien
dans l'aide.

---

## 6. Combat en bataille rangée

### 6.1 Déclenchement et choix tactique/automatique

> "Open ground (non-siege) combat begins immediately when: One army attacks
> another or the paths of two opposing armies cross. An army attacks the
> [county town] of a neutral or computer controlled county."

(Pour un château : seulement après un siège préparé — §7.)

**Panneau pré-bataille** :

> "Before combat begins, a panel will inform you of the impending bloodbath,
> display the comparative troop numbers of both forces, and ask you if you
> would like to take the field. If you choose not to take the field, the
> battle will be calculated automatically."

- Gantelet pouce levé = prendre le commandement.
- "You never have to the take the field if you don't want to" — l'autocalcul
  est toujours offert ; ❓ à vérifier en jeu : la formule d'autorésolution.
- Réglage de partie *[Autocalc] Fight Humans Only?* : "every battle that is
  fought against a non-human opponent will immediately be calculated
  automatically. Only battles against other human players will be fought
  manually."

### 6.2 Temps réel, écran de combat

> "As soon as any battle commences, however, the action begins to take place
> in [real time]. During a battle, you may issue orders while the fight
> rages, or you may pause and resume the action as you wish."

Écran : vue principale défilante + "overview map in the upper right corner" ;
terrain ("rocks, rivers, bridges, forests, etc.") ; "attacking army at the
south (bottom) end, and defending army at the north (top)." Couleurs du
royaume, **brun pour les neutres** ("the soldiers of neutral counties wear
brown").

### 6.3 Unités et échelle variable

> "Each soldier figure on the battlefield represents a [unit]. Unit size will
> vary from battle to battle, depending on the overall size of the forces
> involved. In one battle, a [unit] may be four men, in another it may be 16
> men."

- **Barre d'état** par unité sélectionnée : proportion verte/rouge relative à
  la taille d'unité de la bataille ; "When a unit's status bar is completely
  red, it contains no men, and is wiped out."
- L'icône du panneau de contrôle donne l'effectif **exact** de l'unité ;
  l'effectif **total** de chaque armée s'affiche "above the appropriate
  shield at the bottom of the control panel."
- ❓ à vérifier en jeu : la règle qui fixe la taille d'unité (4…16) par
  bataille.

### 6.4 Sélection et ordres

- Sélection : clic sur une unité ; **rectangle de sélection** pour un groupe ;
  désélection par clic sur l'icône (unité seule) ou clic sur un espace vide.
- Déplacement : clic sur une destination (champ de bataille ou overview map).
- Attaque : "place your mouse pointer over an enemy unit so that its
  appearance changes, and click. Archers and crossbowmen will be able to fire
  from a distance, all other units are hand-to-hand units which must attack
  at point blank range."
- Engagement persistant : "Once a unit is engaged, it will remain so until it
  annihilates the opposing unit, it is annihilated itself, or you command it
  to disengage."
- Groupes 1–9 et formations ligne horizontale/verticale au clavier (§1.5).

### 6.5 Boutons du champ de bataille

| Bouton | Effet (aide) |
|---|---|
| **Sablier (pause/start)** | "Starts and pauses the battle. When a battle begins, it will be paused. … You may select units, but not move them, when the battle is paused." |
| **Retreat** | "order all your men to retreat from the field. When you do so, your army will [not] escape without casualties but it will escape complete annihilation." (négation perdue dans le dump ; sens : la retraite coûte des pertes mais évite l'anéantissement — ❓ à vérifier en jeu : taux de pertes en retraite) |
| **Lower Castle Drawbridge** | "This command will only work when you are defending a castle with a drawbridge during a siege battle." |
| **[All-out attack]** | "gives a general order to your army to attack and engage the nearest enemy." |
| **Autocalculate** | "Calculates the battle automatically. Choose this option if you do not wish to command the battle." (disponible aussi en cours de bataille) |

### 6.6 Fin de bataille

> "An army wins a battle when one of two things happens: It kills all the
> soldiers in the other army. The other army retreats."

- Panneau de fin : "a panel will show the new unit breakdown of each army."
  Sortie par flèche bas-droite ou clic droit.
- "If the battle has won a new county for the victor, a flag with the
  winner's color will appear over the newly won county town."
- Les morts restent au sol pendant la bataille ; les compteurs du panneau
  descendent en direct.

---

## 7. Sièges et capture de comtés

### 7.1 Règles de capture

| Cible | Condition de capture |
|---|---|
| Comté **neutre** (même avec château) | "To conquer any neutral county (even one with a castle), you must send an [army] to capture its county-town." Car : "Neutral counties with castles will always be counties that have revolted and kicked their ruling noble out. In these counties, the castle has been abandoned." |
| Comté de noble **sans château** | "you must capture its county town." |
| Comté de noble avec **château garnisonné** | "you must capture its castle" — "The only way to capture a completed, garrisoned castle is by laying [siege]." |
| Ville défendue | combat : "If the county has an army there, you must fight a battle." (les paysans neutres se défendent : "The local peasants will probably put up a fight") |

- Indicateur visuel : "When you set the path of your army to end on an enemy
  town or castle, the graphic representing the army's last move will appear
  different." (doré pour un siège : "so that the movement indicator turns
  gold").
- **Contiguïté** : "The counties you control must be contiguous … If your
  realm is split into two non-connected bodies, you will immediately lose the
  weaker one!"
- Une prise de comté inflige un gros malus de bonheur local ("county
  takeovers, which cause severe reductions in happiness").
- **Victoire de partie** : élimination totale — "As long as any competitor
  still has a single county or army in possession, your victory is
  incomplete."

### 7.2 Préparation du siège

> "A siege is a prolonged confrontation in which an invading army surrounds
> an enemy castle and spends several seasons building [siege weapons]."

- Lancement : amener l'armée sur le château (indicateur doré) → panneau de
  préparation : flèches haut/bas par type d'engin (**catapults, battering
  rams, siege towers**). "The panel tells you how many seasons it will take
  to prepare for the siege … The bigger your army, the less time it will take
  to build each weapon." Et (FAQ) : "The more siege weapons you build, the
  longer it will take to build them."
- Pendant la préparation : "a symbol will appear over the besieged castle
  showing the number of remaining seasons of siege preparation. Click on the
  besieging army to monitor its progress."
- Au déclenchement : panneau identique au pré-bataille (composition des deux
  camps, choix terrain/autocalcul).
- ❓ à vérifier en jeu : la formule saisons = f(nb engins, taille d'armée) et
  les éventuelles limites de nombre d'engins.

### 7.3 Bataille de siège

Écran : "the battlefield screen will appear, with the castle dominating the
landscape." Attaquant dehors (ou de l'autre côté des douves), garnison
dedans.

**Conditions de victoire de l'attaquant** :

> "To win a siege, you must do one of two things: Kill all the soldiers
> defending the castle, [or] Break into the castle and capture its flag. …
> If one of your men reaches it, the castle is yours."

**Quatre façons d'entrer** :

1. "use a [siege tower] to climb over the wall."
2. "Punch holes in the wall with a [catapult]"
3. "Destroy a gate with a [battering ram]"
4. "Have your soldiers hack the gate to pieces. (This will not work on
   [drawbridges])"

Règle de ciblage stricte : "ONLY castle walls — not towers — may be knocked
down or climbed." Et : "battering rams may only attack castle gates;
catapults can only break through walls; and siege towers will only work on
walls."

**Engins de siège** :

- Servis par un équipage invisible sur le terrain : "Siege weapons do require
  soldiers to man them. These soldiers will be represented in the control
  panel when you select a weapon, but will not be visible on the field."
  "Once the entire crew manning the weapon is killed, the weapon is destroyed."
- Vulnérables au tir, "especially vulnerable to crossbow fire", et aux unités
  de mêlée.
- **Catapulte** : tir à distance, "including from across a moat" ; "The
  catapult will fire repeatedly until the wall is breached."
- **Bélier** : "must be moved right against its target", pilonne la porte
  jusqu'à la brèche.
- **Tour de siège** : "move it right against the target wall. When the siege
  tower is in place, it will open up automatically."

**Murs, tours, portes, escaliers** :

- "Neither archers nor crossbowmen will be capable of firing [through] a wall
  or tower from the ground level." → seuls les troupes **en hauteur** tirent
  vers l'extérieur, et seules les troupes en hauteur sont touchables de
  l'extérieur.
- "Troops atop walls or towers will be somewhat protected from missile troops
  firing from below and will endure fewer casualties."
- "Once inside a castle, the only way to move from walls to higher towers is
  via stairways."
- "Defending troops may move in and out of gates at will. Attackers must
  destroy a gate to go through it."

**Douves (moat)** :

- "you must fill in part of the moat in order to enable your men to attack
  and enter the castle. Any unit is capable of moat filling, with the
  exception of knights."
- Ordre : sélectionner les unités puis "click on the area of water you want
  to fill in. The selected units will march to the edge of the water with
  shovels and begin digging." Les terrassiers sont vulnérables (l'aide
  conseille des paysans).

**Défense** :

- **Huile bouillante** : "Each castle will be automatically supplied with one
  or more cauldrons of boiling oil. Boiling oil is very effective when dumped
  on troops and siege weapons who get too close to your castle walls." Les
  chaudrons se déplacent et se déversent comme des unités. ❓ à vérifier en
  jeu : nombre de chaudrons par design de château, dégâts.
- **Pont-levis** : châteaux à douves seulement ; bouton *lower castle
  drawbridge* ; à double tranchant ("your troops may move in and out of the
  castle — but so can the enemy").
- **Drapeau** : visible dans le château, aux couleurs du défenseur ; "If an
  attacker reaches your flag, the castle is lost."

### 7.4 Issue du siège

> "If you have won a siege, the contested county is now yours and you'll see
> a flag bearing your game colors flying atop the castle."

- Le château capturé revient (endommagé) au vainqueur : "After you win a
  castle by siege, it will be yours to repair. Remember this as you crash
  through walls and gates!" ; "Damage will carry over from siege to siege
  unless you repair it." (réparation : §3.3.2).

### 7.5 Révoltes et brigands (rappel militaire)

Mécanique de déclenchement : county-economy §3.2 (bonheur < 25 pendant plus
de 4 saisons). Côté militaire :

- "Peasant revolts will appear on the main map as torch-carrying figures.
  They will reduce the happiness of any county they wander into."
- "To put down a revolt, send one of your armies to attack the band of rebels
  just as you would attack another army. The battle will play out as usual."
- Reprise du comté révolté : recapturer sa ville ("march one of your armies
  back in and seize the county's county town").

---

## 8. Options avancées et partie personnalisée

### 8.1 Advanced Farming

Voir county-economy §1.6 (main-d'œuvre saisonnière, météo, fertilité ≥ 1/3 de
jachère).

### 8.2 Army Foraging

> "Each army must now survive on the food available in the county it
> occupies. Armies will automatically consume food in the county they are in,
> and they will eat [before] the county's population."

- Rations des soldats via le **ration panel** habituel ; celui-ci affiche le
  nombre de fourrageurs par comté.
- Obligation universelle : "this advanced option requires you to feed the
  soldiers of any other player, friend or foe, as long as they are in a
  county you control. If the troops are friendly, you must feed them as a
  courtesy. If they are hostile, they will raid your county's stores and help
  themselves to your food."
- Garnison de château : mange "from the castle's store rather than from the
  county" (astuce n°10). ❓ à vérifier en jeu : consommation par soldat et
  mécanique du stock de château.

### 8.3 Exploration

> "your vision of the kingdom map will be limited to what you have explored.
> When the game begins, you will only be able to see the single county you
> control. The rest of the map will be blacked out. … As your armies travel,
> the areas around them will be revealed to you gradually."

❓ à vérifier en jeu : rayon de révélation, persistance (brouillard de guerre
ou simple dévoilement définitif — l'aide suggère un dévoilement définitif).

### 8.4 Custom Game (écran de configuration)

Options listées par l'aide : difficulté, advanced farming, army foraging,
exploration, plus :

| Option | Description (aide) |
|---|---|
| **[Nombre de nobles]** | "allows you to determine how many nobles will compete for the throne." (jusqu'à 5 ; IA = Knight, Countess, Bishop, Baron) |
| **Starting gold** | "you may set the amount of gold (crowns) each players starts with." |
| **Army size** | "determines how large an army (if any) all the players will begin with." |
| **Starting castle** | "determines how large a castle (if any) each player begins with." |
| **County Status** | "how strong or weak each player's starting county will be. It takes into account the population, number of fields, number of cows, happiness, and health." |
| **Time Limit** | tour à durée maximale (multijoueur) ; "the timer will be visible onscreen at all times." |
| **[Autocalc] Fight Humans Only?** | batailles contre IA résolues automatiquement (§6.1). |
| **Cartes** | 24 cartes nommées (England, Scotland, Ireland, France, Germany, Italy, Europe, Crusades, Africa, India, China, Jigsaw, Rose, Bullseye, Crossroads, Rorschak, Centreville, Quaintville, Pretzelland, New England, Equalizer, Rubix World, Pentagon, YinYang). |

Multijoueur : "as many as 5 people connected by IPX compatible network, or by
2 people connected by modem or null modem cable." En solo : jusqu'à 4 IA.
Partie standard : début en **1268**, choix du nom + écusson (couleur du
joueur).

---

## Récapitulatif des « ❓ à vérifier en jeu »

(complète la liste de county-economy.md, sans la répéter)

1. **Touches de bataille** : modificateur des groupes 1–9 (Ctrl ?) et touches
   de formation horizontale/verticale — noms perdus dans le dump ; tout autre
   raccourci clavier (aucun documenté hors F1).
2. **Conscription** : formule bonheur perdu ↔ pourcentage conscrit.
3. **Soldes** : montant par type d'unité/saison ; mécanique exacte de la
   désertion ; prix d'embauche et soldes des mercenaires ; fréquence et
   composition des bandes de mercenaires.
4. **Unités** : toutes les stats numériques (PV, attaque/défense, portée,
   cadence, vitesse) ; vitesse de l'arbalétrier (non qualifiée).
5. **Mouvement** : budget de points par armée (dépend-il de la composition ?),
   coût par terrain, coût d'un combat et d'une scission ; seuils 1/2/3
   figurines d'armée.
6. **Scission** : minimum de 50 par armée résultante ou global.
7. **Batailles** : règle fixant la taille d'unité (4–16 hommes), formule
   d'autorésolution, taux de pertes en retraite, existence d'un moral/déroute.
8. **Sièges** : durée de préparation = f(nb engins, taille d'armée), limites
   d'engins, équipage par engin, PV des murs/portes, dégâts et nombre de
   chaudrons d'huile par design, vitesse de comblement des douves.
9. **Château** : capacité de troupes et taille/composition de la garnison
   automatique par design ; coûts/durées par design ; stock de nourriture de
   château (foraging).
10. **Pillage** : état exact du champ pillé, nombre de saisons d'arrêt d'une
    industrie pillée.
11. **Marchand** : grille complète des prix, variabilité, limites de stock,
    revente de la bière.
12. **Overlays** : rendu exact des 3 overlays (idle workers / rations /
    happiness) ; disposition exacte des boutons du panneau latéral.
13. **Exploration / foraging** : rayon de révélation et persistance ;
    consommation par soldat.
14. **Population** : seuils d'apparition des villages et d'évolution visuelle
    de la ville ; pertes infligées par un massacre de village.
