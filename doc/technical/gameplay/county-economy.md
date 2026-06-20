# Économie du comté — spécification des mécanismes (d'après L2HELP.HLP)

> Source d'autorité : dump texte du fichier d'aide officiel du jeu,
> `tools/out/l2help-strings.txt` (lignes 1–2697 ; le reste du fichier est du
> bruit binaire). Toutes les citations entre guillemets sont des phrases
> originales de l'aide. Les points que l'aide ne tranche pas sont marqués
> « ❓ à vérifier en jeu ».

---

## 0. Chiffres mesurés (guide communautaire Steam + relevés en jeu)

> Source secondaire : guide Steam « Detailed Game Mechanics »
> (steamcommunity.com/sharedfiles/filedetails/?id=1128722561), chiffres
> relevés par des joueurs (donc approximatifs « roughly/about », mais bien
> plus fiables que des estimations à l'aveugle). Recoupé avec des captures
> de notre partie DOS (comté de Lancashire). Pas de code source du jeu
> disponible (binaire L2D.EXE seulement) → ces chiffres sont l'autorité
> chiffrée du projet.

**Population** : plage optimale 1 100–1 600, minimum viable 800–1 100,
maximum ~2 000. Santé bonne/parfaite → moins de décès → croît plus.
Villages (seuils exacts désassemblés dans L2D.EXE et LORDS2.EXE) :
1ᵉʳ à 601 habitants, 2ᵉ à 1 001, 3ᵉ à 1 401, 4ᵉ à 1 601.
La capitale est petite jusqu'à 800, moyenne de 801 à 1 200, puis grande.

**Blé** : rendement fermage NORMAL = **1:12** constant (« 10 sacks takes
60 people to farm, yields 1:12, 60 workers ≈ 240 grain/an »), ±10-20 %
selon événements. Fermage AVANCÉ selon fertilité : excellent 1:25 (jusqu'à
1:50), très haute 1:15, bonne 1:15, moyenne 1:12, pauvre 1:10, infertile
1:5 ; mais main-d'œuvre pénalisée (15-25 % au départ, +14-22 %/saison,
plafond 100 % ; avancé = 2 paysans pour semer, 20 pour moissonner).

**Vaches** : affichage 10 = 1 vache, 11-19 = 2, 20+ = 3. Naissances selon
ratio pop/cheptel : 1:2 (200 hab.) maintient, 1:3 +10 %, 1:4 +15 %, 1:5
+20 %, 1:6 +30 %. Stratégie : ≤500 hab. = 100 vaches (1/5 hab.), ≥1000 =
150 + bascule blé, ≥1500 = min vaches, ~2000 = ¾ nourris au blé.

**Impôt** : ~3 couronnes/paysan/an de base. Bonheur : 0-5 % = +5…0 ;
6-19 % = −1…−14 ; 20 % = −16 ; 24 % = −21 ; 31 % = −29 (+ malus −1…−3 sur
les AUTRES comtés). Multiplicateur château : Palissade +50 %, Motte +75 %,
Donjon +100 %, Château de pierre +125 %, Royal +150 %.

**Bonheur (modificateurs)** : santé Parfaite +2 / Bonne +1 / Moyenne 0 /
Malade −5 / Pestiférée −10 ; rations Triple +7 / Double +4 / Normale +1 /
Demi −2 / Nulle −5 ; bière +1 par 10 % de ratio. **Cible idéale ~70 %** ;
en dessous, les gens émigrent.

**Santé** : diseased→perfect en 12-16 saisons à triple ration ; perfect→good
en 1 saison de demi-ration, →average en 2, →poor en 4 ; diseased→average en
1 saison de triple.

**Château (coûts réels)** : Palissade 40 pierre / 400 bois / 200 hommes ;
Motte & Bailey 80 / 800 / 400 ; Donjon normand 1000 / 200 / 800 ; Château
de pierre 2000 / 400 / 1500 ; Royal 3000 / 800 / 2500. Durée selon
main-d'œuvre (royal ≈ 7 saisons avec 400 ouvriers sur 1600 hab.). Garnison
auto : 100 archers (< donjon), 200 (donjon+). Pots d'huile : 1/2/3/4/6.

**Unités** : Massier 20 cr ou 4 fer+4 bois ; Piquier 26 ou 3 fer+6 bois ;
Archer 26 ou 13 bois ; Épéiste 46 ou 10 fer+3 bois ; Arbalétrier 48 ou
10 fer+6 bois ; Chevalier 88 ou 18 fer+4 bois. Solde : 1000 hommes ≈
300 cr/an (⅓ cr/soldat/an). Armée max ~1500, minimum pour scinder 50.

**Prix marchand (par unité, vente→achat)** : pierre 2-4, fer/bois 1-2,
masse 10-20, pique 13-26, arc 16-32, épée 23-46, arbalète 24-48, maille
44-88 ; blé ~2/sac, vache ~2 ; bière 1 cr. Vente par lots de 100 (×100).

**Mouvement** : 15 points/tour ; route 1, herbe 2, champs/hameaux ennemis 2
(+2-3 pour détruire) ; bois/eau/montagne infranchissables. Engins de siège :
~200 personnes, 1 saison (sauf tours).

---

## 1. Champs et agriculture

### 1.1 Les deux agricultures

Il n'y a que deux filières agricoles, plus la remise en état des champs :

> "Agriculture consists of [grain] farming, [cattle] raising, and field
> reclamation."

> "Raising cows requires cattle fields, cows, and workers. Growing grain
> requires grain fields, grain, and grain workers."

Un même parc de champs sert aux deux : **un champ n'est pas typé en dur**,
il reçoit une *affectation* (usage).

### 1.2 États / usages d'un champ

> "Grain and cattle are raised on a county's fields. Fields vary in number
> from county to county and can be allocated to different uses. Any field can
> be assigned to any use, as long as it is not barren or damaged."

Les états possibles d'un champ (section *Field Usage*) :

| État | Description (aide) |
|---|---|
| **Fallow** (jachère) | "A fallow field is one that is fertile and can be allocated to grain or cattle farming." Avec l'option *Advanced farming* : "fallow fields are necessary to maintain fertility." |
| **Grain** (blé) | "Grain fields look different from season to season as grain is sown, grown and harvested. You will have no active grain fields at the beginning of a game." |
| **Cattle** (vaches) | "A cattle field is a grassy meadow with cattle grazing on it. […] If a county has no cows, a field assigned to cattle will appear empty, but it will accommodate cows as soon as they are purchased or arrive by transport." |
| **Barren** (friche) | "A barren field is infertile and unsuitable for use. You will not be able to raise or plant anything on a barren field until you reclaim it and make it fallow." |
| **Parched / Flooded** (endommagé) | "Occasionally, a drought or a flood will damage a usable field. […] You cannot reclaim a weather-damaged field immediately, but after a single season its status will change to [barren] and you may set peasants to work to reclaim it." |

### 1.3 Le panneau d'usage de champ (UI)

> "To assign a use to a field, click directly on the field. This brings up the
> field usage panel. The symbol at the top of the panel indicates the current
> status or usage of the selected field. The buttons along the bottom show all
> possible field uses. Click on a button to assign a new usage. Right click to
> exit without making a change."

Garde-fou important pour l'UX :

> "Be careful not to change accidentally an active grain field. If you do,
> your crops will be destroyed!"

→ Changer l'usage d'un champ de blé actif **détruit la récolte en cours**.
Le clic direct ne doit donc jamais « cycler » silencieusement l'usage : il
ouvre un panneau, et la sortie par clic droit n'altère rien.

### 1.4 Remise en état des friches (field reclamation)

> "Barren fields are reclaimed over several seasons. To reclaim a barren
> field, click on the field, and then select the farmer symbol from the panel
> that appears."

- Il faut au moins un paysan affecté : "In order to reclaim a field, you must
  have at least one peasant assigned to field reclamation".
- Un symbole de binage apparaît sur le panneau de contrôle par champ en cours
  de remise en état ; cliquer dessus donne un rapport.
- **Plafond de vitesse** : "To speed the project up, assign more peasants to
  reclamation duty (although **you will never be able to reclaim more than a
  quarter of a field in a single season**)." → minimum **4 saisons** par
  champ, quel que soit le nombre d'ouvriers ; la progression est graduelle et
  visible sur la carte ("You will be able to watch as the field is reclaimed
  gradually with the passing seasons").
- Stratégie (l'aide insiste) : "Reclaiming fields should always be a top
  priority. Power is based on population size. Population size depends on food
  production, which depends on usable [fields]."
- Le pillage par une armée ennemie rend un champ inutilisable : "When you
  attack a [grain ?] field, your soldiers render the field [barren ?] and
  destroy all its contents." (le mot exact de l'état résultant est tronqué
  dans le dump — ❓ à vérifier en jeu : barren ou damaged).

### 1.5 Cycle annuel du blé

Conditions : "To grow [grain], you need three things: grain fields, the grain
itself, and grain laborers." Au départ d'une partie le comté n'a **pas de
blé** : il faut l'acheter à un marchand.

> "Grain farming works on a yearly cycle. It is planted between the winter and
> spring turns, and it is harvested in the fall."

> "Up to 5 sacks of grain can be planted in one field, provided you have
> enough laborers." / "In winter, assign one or more fields to grain (**one
> field plants five sacks of grain**)."

Déroulé saison par saison (section *The Grain Planting Cycle*) — c'est aussi
la spécification de l'**état visuel** des champs de blé :

| Saison | Mécanique | Visuel du champ de blé |
|---|---|---|
| **Hiver** | "Winter is when you need to decide how many fields you want to assign to grain for the coming year. Base this decision on how many sacks of grain you have (up to five are planted per field), and how many grain laborers you have. **Grain is sown during the period between the winter and spring turns.**" | Champ nu / préparé. "The grain fields you establish in winter will determine your grain output for that year." |
| **Printemps** | Croissance. | "In spring you will see that your fields have been sown. The grain is just beginning to appear." (jeunes pousses) |
| **Été** | Croissance. | "In summer the grain continues to grow into full stalks." (blé haut) |
| **Automne** | "The fall is when your workers harvest the year's grain. Make sure you have enough grain workers to reap the maximum amount of grain. **The grain you reap will become available to you after you end your fall turn.**" | Champ en cours de moisson. |
| **Hiver suivant** | "The following winter you should see the year's work yield a nice return." (le stock de blé est crédité) | — |

Rendement : "For each sack of grain you plant, you will harvest many more
sacks, provided you have adequate fields and labor." / "After each [growing]
season, you should yield many times the amount of grain you have planted."
❓ à vérifier en jeu : le multiplicateur exact (l'aide ne donne aucun chiffre).

Affectation des ouvriers : automatique dès que les conditions sont réunies —
"To allocate laborers to grain growing, simply make sure you have at least one
grain field in your county, and that you have some grain. As long as you do, a
portion of your agricultural work force will automatically begin farming."

Risque : "Random events, weather, and pillaging can destroy your crops. Since
you can only plant grain once per year, it can be difficult to recover from
such a loss." Conseil de l'aide : "plant at least one more field than you
expect to be able to harvest."

### 1.6 Option *Advanced Farming* (jeu avancé)

Trois effets additionnels quand l'option est active :

1. **Main-d'œuvre saisonnière** : "Each grain field will require relatively
   few workers during the spring and summer. During the fall you will need a
   great many grain workers to tend to the harvest, and during the winter you
   will need quite a few to get the fields ready for next season's planting."
2. **Météo** : "Many seasons will be cloudy and mild, having no great effect
   on your output. But droughts can severely undercut your efforts […] Sunny
   seasons, on the other hand, can improve your harvest." Un bulletin météo
   apparaît sur l'*Advanced Labor panel*.
3. **Fertilité (rotation)** : "In order to keep your fields fertile, you will
   need to leave a portion of them fallow at all times. […] you should try to
   keep **at least a third of your fields fallow**. […] You do not have to
   engage actively in any sort of crop rotation — just make sure a portion of
   your fields remain fallow." Un rapport de fertilité figure sous la météo.
   "When fertility is high, grain output will be high. When fertility is poor,
   grain output will suffer."

Sans l'option, la jachère n'a **aucun effet de fertilité** : c'est juste un
champ disponible.

### 1.7 Vaches : troupeau, pâturage, surpâturage

Représentation à l'écran — la figure de vache est **symbolique** :

> "A cow figure on the main map does not represent a single cow, or even a
> specific number of cows. Rather, it indicates that the field has been
> assigned to cattle farming. As long as a county has at least one cow in its
> possession, a cow figure will appear in each field that is assigned to
> cattle farming."

**Surpâturage (overcrowding)** — le nombre de figures par champ encode le taux
d'occupation *global du comté* :

> "The [number] of cow figures in each field shows the overall herd crowding
> conditions in that county. **One cow figure represents low crowding, two
> figures represent some crowding, and three represent overcrowding.**
> Overcrowding can harm the productivity of your herd — your cows need space
> to graze. Whenever you have overcrowding, allocate a new fallow field to
> cattle farming if you can."

❓ à vérifier en jeu : les seuils numériques (vaches par champ) qui déclenchent
1 / 2 / 3 figures.

**Reproduction** : "If you provide enough workers to tend to your cattle and
do not slaughter and eat too much of your herd, it will increase in size."
Et côté stratégie : "With no overcrowding, **cow births will be maximized**."
L'astuce n°1 de l'aide donne un ordre de grandeur : "limit your herd growth to
about **5 cows per season** so that a good portion of your workers can work on
industry" (la croissance maximale du troupeau mobilise "nearly all of your
workforce"). ❓ à vérifier en jeu : la formule exacte de natalité bovine.

**Conditions d'élevage** : "In order to raise cattle, a county must have at
least one field assigned to cattle farming, some people working on cattle
farming, and some cows."

**Quatre usages possibles des vaches** : "A county may do four things with its
cows: it can raise them in its fields, eating the dairy products they produce
each season; it can slaughter and eat them; it can transport them to other
counties; or it can sell them to traveling merchants."

**Lait / dairy** :

> "As long as a county has cows, they will produce cheese, milk, and other
> dairy products which will automatically feed some, or all, of your people.
> Your population will only need to eat beef or grain [after] the season's
> dairy produce has been consumed."

- "Dairy produce cannot be sold or transported, and any extra dairy will
  spoil and cannot be saved for future seasons." (ni stockable, ni vendable,
  ni transportable — consommation automatique et prioritaire)
- "The more cows you have, the more dairy produce you will get."
- ❓ à vérifier en jeu : production laitière par vache et par saison (aucun
  chiffre dans l'aide).

### 1.8 Ouvriers agricoles et liserés du panneau

Répartition : la barre coulissante (slider) partage la population active entre
agriculture et industrie ; la sous-répartition est automatique entre les
tâches *opérationnelles* :

> "When you allocate laborers with the slider bar, their division between
> tasks is automatic. New workers will be divided equally between operational
> tasks that need them, and tasks that do not need workers will not receive
> them."

Le panneau avancé (*Advanced Labor Panel*, accessible en cliquant sur la
ville) permet de déplacer les ouvriers tâche par tâche au lasso ; un
double-clic au centre réaffecte les oisifs ; des "dark shadowy figures"
signalent une tâche sous le minimum d'ouvriers.

**Liserés colorés** (sections *FAQ* et *The colored outlines on the control
panel*) :

- Liseré **bleu autour de la figure du slider** : ouvriers oisifs quelque
  part. "If the figure on the slider bar has a blue outline around it, this
  means you have idle workers somewhere."
- Liseré **bleu autour d'un symbole de production** : trop d'ouvriers sur
  cette tâche. "When a blue outline appears around a production symbol on your
  control panel, this means you have too many workers assigned to that
  specific task. A blue outline around the cow symbol, for example, means you
  have more workers assigned to cattle farming than you need."
- Liseré **rouge autour d'un symbole de production** : pas assez d'ouvriers
  pour les ressources présentes. "A red outline around a production symbol
  means that you do not have enough workers there to tend to the resources you
  have. A red outline around the cow symbol, for example, means that you do
  not have sufficient cattle workers to tend to your herds."
- Les **nombres** à côté des symboles sont aussi codés : "The production
  numbers next to the symbols on the control panel will also be color coded:
  green indicates an expected [increase], red indicates an expected
  [decrease]." (mots finaux tronqués dans le dump, le sens est clair :
  vert = hausse attendue, rouge = baisse attendue).

---

## 2. Nourriture et rations

### 2.1 Le panneau des rations

> "Food management is done primarily through the ration panel. Click directly
> on the ration display on the Control Panel to access the rations panel."

Niveaux de ration : l'aide cite explicitement **quarter, half, Normal, double
et triple** ("try setting half or quarter rations temporarily" ; "Providing
normal, double or triple rations. The more food you give your people, the
happier they get."). Soit 5 niveaux : **Quarter / Half / Normal / Double /
Triple**. ❓ à vérifier en jeu : les multiplicateurs exacts de consommation de
chaque niveau.

**Ration fixée vs ration obtenue** :

> "[The] Achieved listing shows the actual ration level the county's people
> are receiving. The Achieved ration will be lower than the [set] ration if
> the county does not have enough food to supply the ration size you have
> set."

> "The slider bar can also influence your achieved ration. If you have no
> grain, for example, and your bar is all the way to the grain side, then your
> achieved ration will be lower than it could be."

### 2.2 Ce que mange la population : dairy → puis grain/bœuf au choix

Ordre de consommation : **le laitage d'abord, automatiquement** ; le reste de
la population est partagé entre blé et bœuf par un slider :

> "If a county has cows, then its people will live, at least partially, on
> dairy produce. People will automatically eat dairy as it is produced."

> "On the ration panel, the number beneath the cheese symbol shows the number
> of people that can survive solely on the county's dairy."

> "As soon as dairy can no longer support an entire population, you will need
> to supplement its diet with beef and/or grain. This is done through the
> slider bar on the ration panel. The slider bar balances your population —
> aside from dairy — between grain and beef."

Le bas du panneau affiche un tableau Grain / Cattle / Dairy : "The first row
shows how many people will be fed by each food item under the current
settings. The second row shows how many sacks of grain, or how many cows, will
be eaten during that season under the current settings." (pas de 2e ligne pour
le dairy : consommation automatique, non stockable). "Sliding the figure
towards the grain sack […] will cause more sacks of grain to be eaten. Sliding
the figure toward the cow will cause more cows to be slaughtered for beef."

❓ à vérifier en jeu : combien de personnes nourrit 1 sac de blé / 1 vache /
1 vache en laitage, par saison et par niveau de ration (aucun chiffre dans
l'aide).

### 2.3 Conséquences des rations

- **Santé** : "Do your best to provide [normal] rations of food (or more).
  [Low] rations are likely to cause health to deteriorate."
- **Bonheur, double effet** (direct + via la santé) : "In addition to
  determining health (which will influence happiness), rations will affect
  happiness in their own right. Low rations will reduce happiness while high
  rations will improve it. The rations panel will tell you the anticipated
  effect of the ration you set." Et : "A ration of Normal or above will
  improve happiness while half or quarter rations will decrease happiness.
  Likewise, average or better health will cause happiness to rise, while
  sickness and disease will cause happiness to fall."
- Le panneau montre l'effet anticipé via des **symboles de cœurs**.
- La famine prolongée → mauvaise santé → mécontentement → révolte (voir §3).

### 2.4 Transport de nourriture

Seuls le blé et les vaches voyagent ; tout le reste (or, bois, fer, pierre,
armes) est mutualisé dans un trésor unique :

> "The only goods you may transport from one county to another are grain and
> cows." / "Dairy products cannot be transported due to their tendency to
> spoil."

> "Your counties share a common supply of gold, wood, iron, stone and weapons.
> […] [Food], on the other hand, is always grown, produced, or purchased in a
> specific county."

"The shipment will take a few seasons, depending on the distance it must
travel, to reach its destination." Les chariots peuvent être détruits par des
armées ennemies.

---

## 3. Population, santé, bonheur

### 3.1 Santé

Cinq niveaux qualitatifs :

> "[Health] is expressed as one of five levels: **perfect, good, average,
> sick, and diseased**."

- Affichée par une jauge sur le panneau de contrôle ("The colored portion of
  the indicator will be high when health is good, and low when it is poor").
- Déterminée principalement par les rations ; la **peste** est un événement
  aléatoire inévitable : "Plague, an unfortunate random occurrence, kills
  people and damages the county's health rating. You have no ability to
  prevent plague."

### 3.2 Bonheur (happiness)

Note 0–100 affichée à côté du cœur rouge. C'est la stat-pivot du jeu :

> "Happiness is the single most important rating in the game. Everything
> affects happiness. Happiness determines population growth (through birth and
> immigration) and allows you to collect [taxes] and create [armies]."

Facteurs : "The factors that can influence a county's happiness are **taxes,
health, military conscription, rations, and events**." (les *events* couvrent
les prises de comté — "county takeovers, which cause severe reductions in
happiness" — et les révoltes en cours).

Leviers d'amélioration : rations Normal+, **bière** ("Ale's only role is to
boost a county's happiness. […] its effects are temporary"), impôts bas, peu
de conscription.

Verrous à bonheur nul : "When a county's happiness rating hits zero, you can
not increase its tax rate at all." et "If Happiness drops to zero, you may not
conscript any more men."

**Révolte** :

> "When any county's happiness rating drops **below 25** and stays there for
> **more than four seasons**, its population will revolt. The ruling noble
> will be stripped of power and a band of brigands will set out in search of
> food."

Les brigands errent (figure à la torche), font baisser le bonheur des comtés
traversés ; on reprend un comté révolté en recapturant sa ville. (Une astuce
précise même : "half the population becomes brigands".)

Un **rapport de bonheur** par saison détaille chaque facteur : "It also lists
each factor that raises or lowers happiness, and the effect each factor has
had upon the rating since the previous season."

### 3.3 Croissance démographique

Hausse :

- **Naissances** : "Births will most likely occur each season. Sometimes a
  county may experience a spontaneous baby boom." (boom aléatoire,
  incontrôlable)
- **Immigration** : "Immigrants will move from counties whose happiness is low
  to counties where it is high. The larger the difference in happiness between
  neighboring counties, the more people will move to the happier county." La
  position géographique compte : "A centrally located county that borders many
  others is likely to attract more immigrants than a remote and isolated
  county."
- **Démobilisation** : "Whenever you disband an army, its soldiers will return
  home to their county of origin."

Baisse :

- **Décès** : "Deaths will most likely occur each season. You may attempt to
  minimize deaths by keeping health high."
- **Émigration** : "If you set taxes too high, if you draft too many into the
  army, or if your rations are poor, emigration may soar."
- **Conscription** : retrait direct — "Once someone is conscripted, he becomes
  a soldier, and is no longer part of the population."

❓ à vérifier en jeu : les taux numériques de naissances/décès/migration par
saison (l'aide ne donne aucune formule).

---

## 4. Impôts et trésor

- Trésor **unique et partagé** : "The treasury lists the TOTAL amount of gold,
  iron, stone, wood and weaponry for ALL of your counties." Monnaie : la
  couronne (Crown).
- Taux **par comté** : "Each county can have a different tax rate but all
  taxes go into your single central treasury."
- Assiette : "A county's tax rate is expressed as a percentage of each
  person's income that is handed over to your government each season. The size
  of a population, combined with the tax rate, determines your seasonal tax
  revenues." Le panneau affiche "People Pay", le montant prévu.
- **Moment de la collecte** : "Note that taxes are collected at the end of the
  season, **prior to any population changes** that will appear when the next
  season begins. So, the People Pay number will be accurate."
- Effet sur le bonheur : "Notice how happiness goes up as taxes go down (and
  vice versa)." À bonheur 0 : impossible d'augmenter le taux.
- **Contagion entre comtés** : "if you set taxes outrageously high in one
  county, this will damage the happiness ratings of all your other counties."
- **Bonus château** : "Castles attract wealth, so a county with a castle will
  have greater wealth than one without one. Therefore when you build a new
  castle in a county, your tax revenues will increase, even if the tax rate
  you set remains the same. Likewise, improving an existing castle will
  further boost your tax revenues, while downgrading a castle will cause tax
  revenues to fall."
- ❓ à vérifier en jeu : le « revenu par tête » de base et le multiplicateur
  par niveau de château.

---

## 5. Industries

> "The term Industry refers to: Wood Cutting, Stone Quarrying, Iron Mining,
> Blacksmith (weapon making), Castle Building."

Règles communes :

- Présence conditionnelle des sites : "Every county will have a blacksmith
  shop, several fields, and usually one or more industrial sites like lumber
  mills, quarries, [or] iron mines." / "A county with no quarry, for example,
  may not produce stone."
- **Activation par clic** : "You may activate or deactivate each industry in a
  county by clicking on it." Une industrie inactive ne reçoit aucun ouvrier
  ("workers will only go to operational tasks").
- Site actif = **animé** sur la carte + symbole sous le slider : "When an
  industry is active (or operational), its site will animate and a symbol
  representing it will appear below the slider bar on your control panel. When
  an industry is producing, a number will appear along with the icon, showing
  the production that will occur over the following season."
- Production mutualisée : "Wood, stone, iron, and weapons may be used in any
  county regardless of where they have been produced or purchased. You will
  never have to transport these items between counties."
- Validation utilisateur 2026-06-18 : pour **wood cutting**, **stone
  quarrying** et **iron mining**, il n'existe pas de limite DOS valide sur le
  nombre de paysans affectables ni d'état "surplus inactif" dû au
  sur-effectif. Plus d'ouvriers = plus de production ; la limite connue porte
  sur la quantité produite, plafonnée à **999 unités par ressource et par
  tour**.
- Pillage : "When you attack any industrial site, it must shut down for
  several seasons for repairs."

| Industrie | Site requis | Produit | Usage |
|---|---|---|---|
| **Wood cutting** | lumber mill (scierie) | bois (unités) | "To make any kind of weapon, or build any style of castle, you will need some quantity of wood." |
| **Stone quarrying** | quarry (carrière) | pierre (tonnes) | "The only use for stone (besides selling it to merchants) is in castle building. All castle designs require some quantity of stone." |
| **Iron mining** | iron mine (mine de fer) | fer (tonnes) | "Iron is used by the blacksmith to produce weapons. All weapons, except the bow, require some quantity of iron." |
| **Blacksmith** | présent dans **tous** les comtés | armes | voir ci-dessous |

**Forge (blacksmith)** :

- "Every county on the map will have a blacksmith shop where weapons may be
  produced." / "**Each county may only produce one type of weapon at a
  time.**"
- "The output of the blacksmith shop will depend upon the number of laborers
  working there and the materials (wood and iron) available to them."
- "All weapons require some quantity of wood, and all but the bow require iron
  as well." (l'arc : bois seul — "Bow production requires no iron, but quite a
  bit of wood" ; épée : "much iron and some wood" ; masse, pique, arbalète :
  fer + bois ; équipement de chevalier : "large quantities of iron and small
  quantities of wood").
- On peut sélectionner une arme sans avoir les matériaux : "Your workers will
  begin producing it as soon as you collect these materials."
- ❓ à vérifier en jeu : coûts exacts bois/fer par arme et cadence par
  forgeron (le panneau du jeu les affiche, l'aide ne les chiffre pas).

**Marchands** (source/écoulement de tout) : présents par intermittence, routes
fixes ("a centrally located county may host a visiting merchant almost every
season, while a remote county will receive infrequent visits") ; prix
vente/achat distincts affichés "30/60" (gauche = prix de vente au marchand,
droite = prix d'achat). On peut y acheter "cows, grain, weapons, ale, wood,
iron, or stone". ❓ à vérifier en jeu : la grille de prix.

---

## 6. Château

### 6.1 Les cinq niveaux

> "Pictured at the bottom of the screen, from the simplest at left to the most
> complex at right, are the five castle designs in the game: **Wooden
> Palisade, Motte and Bailey, Norman Keep, Stone Castle, Royal Castle**."

- "Each county may have only one castle at a time."
- ❓ à vérifier en jeu : quantités de bois/pierre et durées par design (le jeu
  les affiche sur l'écran de conception ; l'aide ne donne aucun chiffre).

### 6.2 Construction

- Matériaux : "Castles are built from wood and stone." Achat au marchand ou
  production locale ; matériaux partagés entre comtés.
- On peut lancer le chantier **avant** d'avoir tout : "You may begin the
  construction before you have all the required wood and stone. As you collect
  these materials, they will automatically be sent to the castle site until
  the required amounts have been used. (Wood will be shared with blacksmiths
  if you are also producing weapons.)"
- Ouvriers : "As soon as you approve a castle design, a portion of the
  peasants assigned to industry will automatically begin working on castle
  building." Plus d'ouvriers = plus vite. À la fin : "the castle builders will
  automatically be distributed among the county's other operational
  industries; or, if all the other industries are fully staffed, they will
  become idle townsfolk."
- Suivi : symbole château sur le panneau + "The accompanying number indicates
  how many seasons remain until the castle is complete under the current labor
  setting." Clic droit sur le chantier = rapport (ouvriers, saisons restantes,
  matériaux manquants).
- Durée : dépend "on the complexity and size of the design you have chosen,
  the number of castle builders you have assigned, and the availability of
  materials."
- **Modification** : upgrade et downgrade possibles ; "Going from a Norman
  Keep, for example, to a Motte and Bailey, will require wood, but will yield
  extra stone when the project is finished."
- **Réparation** : nécessaire après siège ; par paliers — "Castle repairs will
  [not] happen in stages. Only when the repair is 100 percent finished will
  you see any improvement." (le dump perd la négation ; sens : la réparation
  ne s'affiche qu'achevée à 100 %).

### 6.3 Rôle

1. **Défense** : seul un siège permet de prendre un comté au château
   garnisonné ("The only way to capture a completed, garrisoned castle is by
   laying [siege]").
2. **Garnison automatique** : "A new castle will automatically include a
   garrison. Its size will vary according to the size of the castle, its
   soldiers are subtracted from the county population, and its weapon costs
   are covered by the cost of the castle." Capacité croissante avec le niveau
   ("a Wooden Palisade can hold far fewer men […] than a Royal Castle" ;
   clic droit sur le château = capacité). ❓ à vérifier en jeu : capacités et
   tailles de garnison par niveau.
3. **Bonus fiscal** : voir §4 ("Castles attract wealth").

---

## 7. Tour de jeu (résolution de fin de tour)

Cadre : "Each turn represents a season of the year […] All players will take
their turns simultaneously." La partie commence en **1268**.

Séquence documentée par l'aide :

1. **Pendant le tour** (ordre libre, section *What should I do each turn?*) :
   ajuster le slider de main-d'œuvre, vérifier le surpâturage, commercer avec
   le marchand, ajuster impôts et rations, créer/déplacer des armées,
   activer/désactiver des industries, expédier blé/vaches, etc.
2. **À la fin du tour** (clic *End Turn*) :
   - les impôts sont perçus **avant** les variations de population : "taxes
     are collected at the end of the season, prior to any population changes
     that will appear when the next season begins" ;
   - en automne uniquement : la récolte est créditée — "The grain you reap
     will become available to you after you end your fall turn" ;
   - entre hiver et printemps uniquement : le blé est semé — "Grain is sown
     during the period between the winter and spring turns" ;
   - quand tous les joueurs ont fini : "merchants, supply wagons, and rebels
     will move around the map, the screen will darken momentarily, and the
     next turn will begin."
3. **Au début du tour suivant** : variations de population (naissances, décès,
   migrations), production industrielle créditée (les nombres du panneau
   annonçaient "the production that will occur over the following season"),
   progression des chantiers, messages (château terminé…).

❓ à vérifier en jeu : l'ordre interne exact des résolutions (production
laitière vs consommation, naissances bovines, météo, peste, progression de la
remise en état des champs…) — l'aide ne fixe que les trois ancres ci-dessus
(impôts avant démographie ; récolte après le tour d'automne ; semis entre
hiver et printemps).

---

## Récapitulatif des « ❓ à vérifier en jeu »

1. Multiplicateur de rendement du blé (sacs récoltés par sac semé) et effet
   chiffré du manque d'ouvriers à la moisson.
2. Seuils numériques de surpâturage (vaches/champ → 1, 2 ou 3 figures) et
   malus exact sur la productivité du troupeau.
3. Formule de natalité bovine et production laitière par vache/saison.
4. Personnes nourries par sac de blé / par vache / par « vache laitière »,
   selon le niveau de ration ; multiplicateurs des 5 niveaux de ration.
5. Taux numériques de naissances, décès, immigration/émigration humaines.
6. Revenu fiscal par tête et multiplicateur du bonus château.
7. Coûts bois/fer et cadence de production par type d'arme.
8. Quantités bois/pierre, durées et capacités de garnison des 5 châteaux.
9. Grille de prix des marchands.
10. État exact d'un champ pillé (barren ou parched/flooded) ; ordre interne
    complet des résolutions de fin de tour.

---

## Écarts probables avec l'implémentation actuelle

Sources : `src/renderer/game/state.js` et
`src/renderer/scenes/campaign.js` (méthodes `fieldTexture`,
`cycleFieldCulture`, `endTurn`).

### Champs (`campaign.js`)

1. **Cultures erronées** : `cycleFieldCulture` fait tourner
   `'wheat' → 'meadow' → 'pasture'`. La spec ne connaît ni « meadow » ni
   « pasture » comme usages distincts : les usages sont **grain / cattle /
   fallow**, plus les états subis **barren** et **parched/flooded**. (La
   « grassy meadow » de l'aide *est* le champ à vaches.)
2. **Cycle au clic au lieu d'un panneau** : le clic gauche change directement
   l'usage. L'original ouvre le *field usage panel* (symbole d'état en haut,
   boutons d'usage en bas, clic droit = annuler) — d'autant plus nécessaire
   que changer un champ de blé actif **détruit la récolte** ("your crops will
   be destroyed!"), ce qu'un cycle silencieux rend trop facile.
3. **Pas de visuel saisonnier du blé** : `fieldTexture` renvoie des frames
   fixes (80/84/88) quelle que soit la saison. La spec exige un champ de blé
   différent à chaque saison (semé au printemps, "full stalks" en été,
   moisson en automne, nu en hiver).
4. **Pas de figures de vaches ni de surpâturage** : aucun rendu 1/2/3 vaches,
   aucun état de troupeau.
5. ~~**Pas de friches ni de remise en état**~~ RÉSOLU : états barren et
   parched/flooded (météo ~2 %/comté/saison ❓, endommagé une saison puis
   friche), fermier du panneau de champ → chantier d'¼ de champ/saison
   (jamais plus), progression visible (bande ROADS 108-125). État initial
   vérifié sur le DOS : la 1re carte de campagne démarre SANS friche — la
   valeur 80 des tuiles de champ est un marqueur générique, le scénario
   dispatche les états à l'init, et les cartes suivantes de la campagne
   démarrent avec de plus en plus de friches (réglages de scénario à lire).
6. **Affectation au blé hors-hiver sans contrainte** : la spec lie la décision
   au tour d'hiver (semis entre hiver et printemps, 5 sacs/champ, blé en stock
   requis).

### État de partie (`state.js`)

7. **Rations à 3 niveaux** (`Half/Normal/Double`) au lieu des 5 de l'aide
   (Quarter/Half/Normal/Double/Triple) ; et les rations sont **gratuites** :
   aucun stock de blé/vaches/dairy n'existe, donc pas de ration « achieved »
   ni de famine possible.
8. **Pas de bonheur** : `endTurn` ne manipule que `health`. Or "Happiness is
   the single most important rating in the game" — impôts, conscription,
   rations, événements doivent passer par le bonheur (avec révolte sous 25
   pendant 4 tours), pas par la santé.
9. **Les impôts rongent la santé** (`health − taxRate/5`) : contraire à la
   spec, où les impôts touchent le **bonheur**, jamais la santé (la santé ne
   dépend que des rations et de la peste).
10. **Démographie sans migrations ni événements** : naissances 15 % × ration
    et décès fonction de la santé, mais ni immigration/émigration pilotées par
    le différentiel de bonheur entre voisins, ni peste, ni baby boom.
11. **Revenu fiscal sans bonus château** : `population × taxRate / 100` ignore
    "Castles attract wealth" (revenu accru par niveau de château) et la
    contagion du mécontentement fiscal entre comtés. Le moment de la collecte
    (avant la démographie) est en revanche conforme.
12. **`endTurn` ne résout rien d'agricole ni d'industriel** : pas de cycle du
    blé, pas de dairy/abattage, pas de croissance du troupeau, pas de
    production bois/pierre/fer/armes, pas de chantier de château, pas de
    déplacement de marchands/chariots/brigands.
13. **`castleLevel: 1` pour tous les comtés** : tous les comtés (même neutres)
    ont un château rendu dès le départ. Dans l'original, le château se
    construit ("To build a castle in a county that lacks one…") et la plupart
    des comtés n'en ont pas en début de partie standard.
14. **Pas de main-d'œuvre** : ni slider agriculture/industrie, ni tâches
    opérationnelles, ni liserés rouge/bleu — le panneau de `campaign.js`
    contient déjà des sprites `labourCowLess/More`, `labourWheatLess/More`,
    etc., mais rien ne les pilote.
