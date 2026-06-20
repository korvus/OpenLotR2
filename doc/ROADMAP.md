# Feuille de route — copie fidèle de Lords of the Realm II

Objectif : OpenLotR2 = réplique du jeu DOS jusqu'au moindre détail,
graphiquement (toutes les ressources .PL8/.256/.DAT sont disponibles dans
`D:\sites\lordOfTheRealms\lordsoftherealm2_dos_win\Lords of the Realm 2\lotr2`)
et en mécaniques (source d'autorité : L2HELP.HLP →
[doc/technical/gameplay/county-economy.md](technical/gameplay/county-economy.md)).

Méthode (boucle d'agents) :
1. **Recherche** : extraire les mécanismes depuis l'aide officielle, les
   fichiers du jeu et des captures DOS prises **en direct via le MCP
   `lotr2`** (`launch` → `send_keys`/`click` → `screenshot`) ; les specs
   d'autorité vont dans `doc/technical/gameplay/` et les captures retenues
   dans `doc/captures/`.
2. **Implémentation** : appliquer la spec dans `src/renderer/`, régénérer les
   assets via des outils rejouables (`tools/extract-*.js`,
   `tools/render-*.js`, `tools/lib/pl8-draw.js`) et valider la logique par
   simulations Node de `GameState`.
3. **Validation visuelle** : comparer DOS ↔ Electron écran par écran avec
   l'utilisateur (je ne vois toujours pas le runtime Electron).

## Phase 1 — Écran de comté (en cours)

- [x] Carte isométrique : tuiles BASE/ROADS saisonnières, routes (frame 0
      comprise), rivières, forêts, montagnes (classe 8 ≤ 24 → MTNS) ;
      FRONTIÈRES DE COMTÉS en cailloux : encodées dans les données comme
      tuiles ROADS 38-46 (herbe/arbres/route avec liseré de pierres en
      « extra rows » types 2/3/4) — perdues parce qu'extract-iso-tileset
      passait par pl8image qui ne dessine pas les extra rows ; réécrit
      avec tools/lib/pl8-draw, toutes les planches régénérées ;
      océan infini au-delà des bords (motif 232×120 des frames de mer
      22-29 répété sous la carte, aligné sur la grille — l'original n'a
      jamais de zone noire, vérifié sur captures DOS) ; au nord, où la
      carte est rognée en pleine terre (bords x=0/y=0 terrestres), la
      terre se termine par une CÔTE À FALAISES juste au-delà du bord
      puis mer ouverte — frames directionnelles relevées sur les côtes
      réelles (terre en +x = 42-45, +y = 46-49, coin = 62-65) ; les
      essais précédents (aplat d'herbe, puis terrain reflété) étaient
      incohérents : l'art des falaises est directionnel et ne se
      reflète pas (retours utilisateur) — le dézoom garde lui son
      reflet, indiscernable au 1/4 d'échelle
- [x] Routes sous les entités (couche 3)
- [x] Champs (classe 32) : un champ PAR TUILE (12/comté = « twelve
      fields » de l'aide), affectation blé/jachère/vaches via la modale
      de l'original (parchemin, vignette, icônes photo ICONVILL), clic
      droit = annuler ; enclos visibles (pâturage classe 16 compris)
- [x] Capitales 2×2 (classe 64), châteaux 2×2 + industries (classe 128 :
      0 carrière, 20 mine, 30 scierie)
- [x] VILLAGES (classe 16) : la classe 16 n'est PAS un pâturage 2×2 mais
      4 tuiles ISOLÉES par comté (vérifié : jamais adjacentes) = des slots
      de village sur fond d'herbe. Un village (TOWN1x 59 normal / 60 brûlé,
      extrait par saison) y apparaît QUAND LA POPULATION CROÎT — aide :
      « As a population grows, villages will also appear outside of the
      county town » (la ville grossit d'abord, les villages ensuite).
      VÉRIFIÉ sur capture DOS (1268 Hiver, ~383 hab.) : un comté de départ
      a ZÉRO village. SEUILS EXACTS DÉSASSEMBLÉS dans les deux exécutables
      (DOS L2D.EXE @ 0x81AB0, Windows LORDS2.EXE @ 0x3DA30) : 0 village
      jusqu'à 600 habitants, puis apparition des 1er/2e/3e/4e villages à
      601/1001/1401/1601. La même routine fixe les trois tailles de
      capitale : petite jusqu'à 800, moyenne de 801 à 1200, grande dès
      1201 (DOS @ 0x81A50, Windows @ 0x3D9A0). MODÈLE ÉCONOMIQUE RECALIBRÉ
      (guide §0) pour que la population atteigne réellement ces seuils :
      blé 1:12, ~10 pers./sac, natalité ~14 %/saison décroissant avec la
      densité (plafond intrinsèque ~2000), décès ~3 % à santé parfaite +
      surmortalité de famine — un comté géré se stabilise vers ~1500
      (plage optimale 1100-1600), villages et tailles de ville se
      déclenchent (validé par simulation Node). Remplissage des slots du
      nord au sud (stabilité), recompté à chaque tour. Les vaches restent
      sur les champs à bestiaux (classe 32) — pas sur la classe 16
      (l'ancien rendu clôture+troupeau était une mauvaise interprétation,
      retour utilisateur) ❓ état brûlé (pillage à venir)
- [x] Mini-carte stratégique ORIGINALE (MAP01.PL8 : carte dessinée 128×128,
      texture olive 4 niveaux + liserés noirs, colormap où l'index de
      palette = l'id du comté — c'est un dessin d'artiste, aucune
      projection simple vers la grille) : couleur du propriétaire en
      surimpression par remap de rampe (rouge/gris mesurés sur capture
      DOSBox, jaune/violet/bleu extrapolés ❓), mer transparente sur le
      fond brun du cadre, liseré BLANC autour du comté sélectionné, clic
      sur un comté = sélection + centrage caméra sur son centroïde,
      rectangle caméra symbolique placé par affine ajustée (taille ❓)
- [x] État de partie : comtés, nobles, calendrier, stocks, rations ×5,
      bonheur (pivot), santé ×5, cycle annuel du blé, troupeaux/surpâturage,
      impôts avant démographie + bonus château. ÉCONOMIE RECALIBRÉE sur le
      guide §0 + relevés DOS : bonheur = convergence vers cible (santé +
      niveau de ration choisi + impôt ; modificateurs du guide, malus
      famine), monte ~80-90 bien géré, chute sous impôt lourd/famine, plus
      d'oscillation en dents de scie ni de révolte parasite (validé Node) ;
      démographie densitaire (plafond ~2000). ❓ coefficients de bonheur
      et plafond exact à affiner (le DOS atteint 100 à faible impôt)
- [x] Contrôles du panneau : clic Impôt → panneau taux ±5 %, projection des
      couronnes et effet bonheur ; clic Population → rapport saisonnier
      naissances/décès/migrations ; clic Cœur → rapport bonheur détaillant
      impôts/ration/santé/peste ; clic Ration → panneau complet avec curseur
      pain↔bœuf. Bilans connectés aux valeurs mémorisées par GameState.
- [x] Panneau de comté ÉTRANGER : tant qu'on n'est pas maître du comté,
      aucune info — nom, seigneur éventuel (« Land owned by… » ❓, le DOS
      français écrit « Propriétaire des terres : … », rien pour un comté
      neutre) et château sous un ciel d'orage (MISC_CTY 58) ; réglages
      impôt/ration inactifs hors de ses terres
- [x] Troupeaux de vaches animés (FLAGS1x tuiles 85-102, RLE décodé :
      `00 XX` = saut, `NN` = NN pixels ; 3 densités × 6 frames ; art
      « printemps » validé utilisé toute l'année, variantes B/C/D à
      confirmer) sur pré clôturé (= jachère), pâturage classe 16 compris
- [x] Visuel des champs calibré sur captures DOS, sémantique des frames
      DÉCODÉE : la plage agricole 79-139 marche par GROUPES DE 4 (base,
      +1 bord de comté NE, +2 bord NO, +3 les deux — boundaryVariant
      calculé sur les voisins hauts) ; friche = 80, jachère/pré = 84,
      terre nue = 88, blé = groupes 92/96/100 par densité de semis
      (cycle saisonnier par les planches : pousses → vert → doré →
      chaume), vaches = pré clôturé + troupeau ; les « extra rows » de
      ces frames agricoles sont des données parasites (barre horizontale
      au milieu du champ) — désactivées dans extract-iso-tileset.js pour
      la plage 79-139 uniquement, les cailloux des frontières (38-46)
      restent dessinés
- [x] Drapeaux de faction animés (7 groupes × 8 frames : rouge, jaune,
      noir, violet, bleu + 2 en feu) plantés sur les villes ; sur le
      château UNIQUEMENT si garnison (levée de garnison à venir)
- [x] Bilans de saison verts/rouges (+N/−N) près des icônes vache/blé
- [x] Ouvriers : allocations persistantes par tâche (grain, bétail,
      remise en état, bois, pierre, fer, forge, château), surplus oisif
      au centre, production et récolte calculées depuis la couverture de
      chaque groupe ; liserés rouge (manque) / bleu (oisifs) sur les
      icônes vache/blé — besoins et cadences ❓ à calibrer dans DOSBox.
      Correction des sites de carte : terrain 30 = scierie ; la forge est
      une industrie TOWN1x animée sur les frames 10-18, posée près de la
      capitale depuis la tuile d'herbe 10/19 la plus proche du comté
      (carte principale + rendu d'ensemble), au lieu d'être seulement un
      flag abstrait de gameplay.
- [x] Friche (champs barren/damaged) et reclamation : météo (~2 %/comté/
      saison ❓) endommage un champ (une saison, puis friche), fermier du
      panneau de champ → chantier d'¼ de champ/saison (bande ROADS 108-125,
      la parcelle saine grandit), friche = groupe 80, sécheresse = terre
      nue 88 ❓, inondation = 136 ❓ (+ variante de bord de comté, cf.
      sémantique des groupes de 4) ; icônes photo barren/
      parched/flooded/fermier (ICON_TMP 0/34/33, ICONVILL 3) ; annonces du
      héraut ; l'IA remet ses friches en état — état initial VÉRIFIÉ sur le
      DOS : la 1re carte de campagne démarre SANS friche (le 80 des tuiles
      de champ est un marqueur générique, le scénario dispatche les états à
      l'init) ; les cartes suivantes en ont de plus en plus — à brancher
      quand on lira les réglages de scénario. ❓ la campagne DOS ne démarre
      pas sur la carte Angleterre : séquence des cartes à inventorier
- [x] Migrations entre comtés (différentiel de bonheur entre voisins,
      adjacence calculée depuis la couche comté)
- [x] Révoltes (bonheur < 25 plus de 4 saisons → comté redevenu neutre)
      et peste (~2 %/comté/saison, santé −2 ; récupération par rations
      normales servies)
- [x] Bandeau haut : parchemin original identifié par template-matching
      sur capture DOSBox (PANELS 196-203, 8 tuiles 24×24 répétées en
      boucle toutes les 24 px) ; blasons 13×16 des joueurs (PANELS
      256-260) ; positions DOS mesurées (File@10, Options@108, Help@209,
      blason@270, année@364, saison@413, couronnes→628) en FNTL2_22 ;
      menus déroulants fonctionnels d'après l'aide : File = New/Load/
      Save/Exit, Options = Sound, Animations (pauseAll), Full Screen,
      Help. Calé sur capture DOS menu ouvert : textes du bandeau en
      FNTL2_14 (pas 22), biseau clair/sombre (rangées 0 et 23) cuit dans
      topbar.png, titre inversé en noir quand son menu est déroulé,
      déroulant en parchemin continu (parchment.png) avec liseré —
      reste : panneaux Game Speed/Scroll Speed, l'aide en ligne
- [x] Boutons de la colonne droite de la mini-carte (MISC_CTY 92, à
      (133,8) du cadre ; jauge légende = MISC_CTY 91) : calques ouvriers
      oisifs / rations / bonheur — comtés du joueur en aplat sur l'échelle
      violet→bleu→bleu clair→jaune→orange→rouge (relevée sur la jauge ;
      bleu clair = « normal », c'est lui le « blanc » des captures),
      icône du calque actif en haut à gauche, clic sur la jauge = retour
      (seuils des niveaux ❓) ; loupe = carte d'ensemble en RENDU NATIF :
      tools/render-overview.js compose l'image depuis les planches
      miniatures ORIGINALES BASE2A/ROADS2A (tuiles 10×6, frames 13×7,
      mêmes règles de classes que la grande carte — réécriture
      utilisateur qui remplace l'ancienne réduction + accentuations
      vectorielles) : vraies routes, murets de cailloux des frontières,
      montagnes/villes/châteaux/industries repositionnés à cette
      échelle, mer étendue en losanges natifs au-delà du diamant avec
      variantes par hachage mélangé (une formule linéaire dessinait des
      bandes périodiques et rendait visible la frontière du losange —
      absentes du DOS) ;
      l'asset reste en pixels natifs 1:1 (l'agrandissement nearest
      anisotrope vers 0,26 moirait la mer tramée, le « glitch
      maritime ») et la SCÈNE l'affiche à ×1,3 (filtrage linéaire,
      pixelArt=false) dans une fenêtre masquée 478×400 avec recadrage
      (crop 55,70) — clics et drapeaux convertis avec zoom+crop ;
      falaises du bord nord harmonisées zoom/dézoom (même frange
      directionnelle 42-49/62 dessinée dans le rendu mini) ;
      overview.json porte des échelles PAR AXE (scaleX 5/29, scaleY
      3/15 : les minis n'ont pas le rapport des 58×30) ; pas de zoom caméra (l'interface
      serait prise dans le zoom) ; drapeaux des villes possédées et des
      armées par-dessus, bandeau parchemin bas (« England  AD <année> »
      ❓ + invite, capitales rouges, liseré) ; toujours au PRINTEMPS
      comme le DOS ; la barre d'actions du bas reste à l'item Phase 2
- [x] Annonces au joueur après la fin de tour (« News from the realm ») :
      révoltes, pestes, famines de la saison écoulée

## Phase 2 — Écrans secondaires

Spec : [screens-and-military.md](technical/gameplay/screens-and-military.md)
(écrans, barre d'actions, armées, batailles, sièges — depuis L2HELP.HLP).

- [x] Écran de population (clic sur la population du panneau latéral) :
      habitants, naissances/décès,
      bilan de la saison — version simple ; reste l'habillage original
      (VILLAGE.PL8, photo animée, graphique au clic)
- [x] Écran avancé des ouvriers (clic capitale possédée) : fond original
      VILL.PL8 363×320 extrait par
      `tools/extract-advanced-labor-ui.js`, activités affichées uniquement
      si l'économie du comté les permet (scierie/carrière/mine, champs,
      remise en état, chantier), centre = oisifs, sélection par rectangle
      cliqué-glissé-relâché puis destination = transfert du nombre de
      paysans capturés par la zone, double-clic au
      centre = redistribution automatique jusqu'aux minima utiles, fiches
      grain/bétail/remise en état/bois/pierre/fer/forge/château connectées
      aux stocks, rendements et ouvriers. Simulation :
      `node --experimental-default-type=module tools/simulate-labor.mjs`.
      Les valeurs ne sont pas imprimées sur le décor : elles sont traduites
      en groupes issus des séquences originales VILLAGE3, cliquables et
      surlignés lors d'un transfert ; figures noircies = déficit, figure
      assise = surplus/oisif. Les frames sont détourées par comparaison de
      toute la séquence et exclusion du terrain vert, sans rectangle de fond.
      Les sites économiques utilisent les grandes couches VILLANI2
      conditionnelles : un seul slot haut gauche pierre/fer/rien, bois à
      droite de la forge ou rien ; remise en état et forge restent des slots
      permanents. Les industries accolées au château sont séparées
      de son véritable carré 2x2 avant calcul des ancres (cas Lancashire :
      scierie + mine à gauche du château). Position du panneau recalée sur
      la capture DOS (x=66, y=67), bouton de fermeture carré jaune actif et
      fiches d'activité au format DOS (icône + titre + valeurs). Reste :
      animer les séquences au lieu d'une frame fixe et calibrer dans DOSBox
      les minima/cadences exacts.
- [x] Écran des rations (assiette), CALÉ SUR CAPTURE DOS LIVE
      (doc/captures/rations-panel-fr.png, panneau 287×238 en (128,97)) :
      titre « Ration », Objectif réglable aux flèches ▲▼, Résultat
      (palier le plus proche de la ration servie) et Santé avec leurs
      cœurs « ( +N ♥ ) » (❓ mapping : ration = index−1, santé =
      niveau−2, relevé Normal→+1 / Bon→+1), curseur panier↔vache à
      poignée-FOURCHE (beefShare par comté, défaut ½ ❓ — laitage
      toujours premier, pain/bœuf se compensent, vérifié par simulation),
      tableau pain/bœuf/laitage Nourris/Mangé, fermeture par la flèche
      sur disque noir ; icônes originales (tools/extract-rations-ui.js :
      cœur/fromage/vache de MISC_CTY 23/42/43, panier/flèches/fourche/
      bouton découpés de la capture ❓ planche source à identifier) ;
      layout vérifié par BOUCLE GRAPHIQUE hors-jeu (tools/mock-rations.js
      compose le panneau — parchemin, BMFont, icônes — côte à côte avec
      la référence ; coordonnées du mock = miroir de buildRationsDialog,
      à garder synchronisées) ; validation Electron du 12/06/2026 :
      fontes bitmap et icônes forcées en filtrage nearest, grande vache
      ré-extraite avec une boîte plus haute (les jambes étaient coupées),
      barre réalignée sur le segment inclus dans la fourche ; curseur
      pain↔bœuf désormais déplaçable en continu au pointermove pendant
      l'appui, en plus des crans ◄ ► ; le tableau affiche une projection
      alimentaire pure depuis les stocks courants (previewFood, sans
      mutation), et endTurn applique exactement ce même calcul — validé
      par simulation Node sur plusieurs positions du curseur ; les
      icônes régénérées utilisent des clés Phaser versionnées (`rations-v2-*`)
      car HMR conservait les anciennes textures malgré le PNG modifié ;
      reste à
      revalider par capture Electron la netteté et la ponctuation
      « ( +1 ♥ ) » / « : » ; libellés anglais ❓ (le DOS français
      écrit Objectif/Résultat/Santé/Nourris/Mangé) — reste : soldats en
      fourrage (Army Foraging)
- [x] Écran du château (clic château) : design actuel, chantier en cours,
      lancement de la construction du design suivant (coûts bois/pierre ❓,
      durée en saisons) — reste : garnison, habillage CASPICS
- [x] Trésor unique par noble (or/bois/pierre/fer/armes) ; production des
      industries par saison (carrière→pierre, mine→fer, atelier fer→armes,
      bûcheronnage) modulée par la main-d'œuvre — rythmes ❓
- [x] Écran de trésorerie (clic sur les couronnes du bandeau)
- [x] Marchand : achat/vente par lots de 10 (blé/vaches locaux au comté,
      bois/pierre/fer/armes au trésor) — grille de prix ❓
- [x] Barre d'actions câblée (provisoire) : château / armée /
      trésorerie / marchand ; ravitaillement et diplomatie en attente
- [x] Forge (blacksmith) : parcours DOS reproduit : clic capitale → écran
      avancé des ouvriers, puis clic dans la zone forge → écran du forgeron
      (le clic d'ouverture de la ville est consommé pour empêcher l'ouverture
      immédiate de la forge). L'écran remplace la carte à gauche mais conserve
      bandeau et panneau de comté, avec décor original `SMITHY.PL8`, arme
      courante sur l'établi extraite des frames 11-16 de `HEARTH.PL8`, bandeau
      parchemin inférieur, boîte fer/bois et flèche de retour. Les armes du mur
      sont directement cliquables, comme dans le DOS. Séquence de référence :
      démarrage Play Now → blason/Continue → fermer les tutoriels → clic ville
      `(260,205)` → fermer le tutoriel Town Center → clic forge `(115,286)`.
      Captures : `dos-town-center.png`, `dos-blacksmith-reference.png` et
      `blacksmith-bow-dos-vs-portage-{dos,portage}.png`.
      Choix de l'UNIQUE type d'arme produit par comté
      (« Each county may only produce one type of weapon at a time », aide
      §3.5). Modèle : `county.weaponType` (défaut épée) ;
      le trésor garde un TOTAL `weapons` canonique ET sa ventilation
      `weaponsByType`, tenus en miroir par `addWeapons`/`removeWeapons`
      (conscription et marchand y passent → invariant sum==total validé en
      simulation Node). La forge produit `BLACKSMITH_OUTPUT` (4 ❓) armes/
      saison à couverture pleine, plafonné par le bois/fer du trésor partagé
      (coûts DOS fer/bois : arc 0/13, pique 3/6, masse 4/4, arbalète 10/6,
      épée 10/3, chevalier 18/4). Trésorerie enrichie de la ventilation par
      type. Reste : symbole d'arme cliquable du panneau latéral et calibrage
      de la cadence (armes/forgeron/saison).

## Phase 3 — Armées et conquête

- [x] Levée d'armées : écran de conscription (effectif ±25, minimum 50,
      aperçu du coût en bonheur et de l'armement disponible) — reste : le
      choix du type d'arme par soldat (2e étape de l'original)
- [x] Armées sur la carte : drapeau + effectif à la capitale, sélection au
      clic, ordre de marche (un saut de comté par tour, BFS sur
      l'adjacence) — reste : points de mouvement et coûts par terrain
- [x] Batailles (autorésolution ±10 %), capture des comtés, assaut contre
      la garnison automatique des châteaux (échec = retraite avec pertes) ;
      annonces du héraut — reste : garnisons levées manuellement (bouton
      bouclier/épée/casque) et bataille tactique en temps réel
- [x] IA des nobles rivaux v1 (impôts, levées d'armées, expansion vers les
      comtés non possédés) ; éliminations et victoire/défaite annoncées
- [x] Approvisionnement / soldes v1 : option `Army food` du Custom Game
      branchée aux mécaniques et basculable depuis Options ; si active, les
      soldats présents dans un comté fourragent avant la population, le panneau
      Ration affiche le nombre de fourrageurs, et une pénurie provoque des
      pertes militaires annoncées par le héraut. Solde saisonnière débitée au
      trésor par tranche de 25 hommes ; si le noble ne paie pas, désertions
      proportionnelles annoncées. Moral : l'aide ne documente aucun système de
      moral hors analogie avec solde/désertion, donc aucun modèle séparé pour
      l'instant. Reste : panneau Send Supplies et chariots SPRITE1A/1B
      visibles/destructibles, consommation exacte par soldat, montant des
      soldes et formule de désertion à mesurer dans DOSBox.

## Phase 4 — Habillage final

- [ ] Sons et musiques — CONSTAT : cette copie du jeu ne contient PAS les
      données audio (IWAV.DIG/MDI = pilotes Miles AIL3, pas de WAV dans
      les .SAF, musiques = pistes CD audio absentes du rip). Il faudra une
      source externe (rip CD, enregistrements) ou re-rendu.
- [x] Curseurs originaux (.CUR copiés dans public/cursors, curseur 1 actif
      sur la carte) — reste : curseurs contextuels (2-12)
- [x] Polices bitmap originales (FNTL2_9/14/22 → BMFont via
      tools/extract-font.js ; 106 glyphes : a-z, A-Z gothiques, chiffres,
      PONCTUATION % * ( ) - + = : ; ' ? \ / , . (ordre vérifié par
      tailles/positions des tuiles : virgule basse à queue, point bas
      2×2) et ACCENTS äáàâ… ❓ queue à vérifier glyphe à glyphe)
      — bandeau, nom de comté, titres des 6 panneaux ET les écrans de
      menu (MainMenu/SinglePlayer/OrginalOrRoyal/Shield : titres en 22,
      boutons en 14 centrés, survol rouge via theme.gothic/hoverRed,
      polices chargées par le Loader) ; reste : corps de texte des
      panneaux, ponctuation/accents (les caractères , : - . manquants
      sont silencieusement omis par Phaser)
- [x] Netteté uniforme des textes bitmap/UI : `roundPixels = true` dans
      `src/renderer/config.js` aligne tous les rendus sur des pixels
      entiers ; corrige les libellés centrés flous/inégaux sans casser le
      lissage du dézoom ×1,3 de la carte d'ensemble
- [x] Écran CUSTOM GAME (fond CUSTOM.PL8) : SÉLECTION DE CARTE parmi les
      24 slots de L2_MAPS.DAT (index.json) — objectif « tester d'autres
      cartes » atteint ; 12 réglages de l'original (src/renderer/game/
      settings.js : agriculture avancée, nourriture armées, châteaux,
      puissance comté, exploration, niveau, armes, durée, nobles, taille,
      couronnes, combat) cliquables (gauche=suivant, droite=précédent),
      boutons Cancel/Default/Start. Flux conforme au DOS :
      ShieldMenu → CustomGame → Campaign. « Start » écrit registry mapFile +
      gameSettings et repart d'un état vierge ; New Game efface aussi les
      clés/caches de carte pour empêcher la sélection précédente de persister.
      Campaign charge la carte de registry mapFile (défaut map00) ;
      GameState prend nobles (2-5, fiefs répartis ouest→est) et couronnes
      de départ. VALIDÉ en simulation sur England/France/YinYang (4
      nobles, pas de crash). Colonne joueur + 4 adversaires restaurée avec
      les blasons/portraits de MISC_SEL.PL8 (outil extract-custom-game-ui.js),
      activation liée au réglage Nobles ; liste des cartes replacée dans
      la fenêtre droite avec défilement par les flèches et zones de clic
      pleine largeur ; les 24 aperçus sont générés depuis les couches comté
      ET terrain complètes (décor hors comtés inclus, texture/reliefs/routes)
      par tools/render-custom-map-previews.js, ajustés sur les deux axes pour
      remplir le cadre 132×124 ; boutons centrés sur les trois cellules de
      CUSTOM.PL8. La mini-carte en campagne
      exploite la silhouette propre à chaque slot (`map.minimap`) et les ids
      de comté de la carte active, recadrée/agrandie automatiquement dans
      les 128×128 disponibles avec facteurs X/Y indépendants, texture olive
      irrégulière, frontières internes sur 1 px, sélection blanche dessinée
      à l'intérieur du comté, contour côtier extérieur sur 1 px (diagonales
      raccordées) et relief supplémentaire décalé en bas/droite.
      Le dézoom est généré pour les 24 cartes par
      tools/render-all-overviews.js. ❓ grille parchemin à peaufiner.
      Panneau de comté : titre recalé visuellement dans son bandeau (métriques
      bitmap asymétriques) ; valeurs/impôt/ration en sans sérif 13 px avec
      interligne compact, conformément à la capture DOS.
      Écran des rations : fourche et flèche droite nettoyées manuellement ;
      barre pain↔bœuf descendue de 4 px, mock et scène synchronisés.
      Réglages non encore branchés aux mécaniques (stockés dans le registry
      pour plus tard).
- [ ] Intro/cinématiques, écrans de menu restants
- [x] Sauvegarde (F5) / chargement (F8) dans le localStorage —
      sérialisation/restauration de GameState vérifiée par aller-retour ;
      accessible aussi depuis le menu `File` du bandeau ; reste :
      emplacements multiples

## Inconnues à mesurer en jeu (captures DOSBox)

Voir la liste « ❓ à vérifier en jeu » de
[county-economy.md](technical/gameplay/county-economy.md) : rendements du
blé, seuils de surpâturage, personnes nourries par sac/vache, taux
démographiques, revenu fiscal par tête, prix marchands, coûts des châteaux.
