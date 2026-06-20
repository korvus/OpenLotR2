===========
L2_maps.dat
===========

There are 40 map slots in L2_MAPS.DAT but only 24 are used.
Each map has six 64*64 bitmaps and one 65*129 bitmap.

File size: 40 × (6 × 4096 + 65 × 129) = 40 × 32961 = 1,318,440 bytes (verified).

Each slot is one full campaign map (an island/region divided into counties),
not a single county. The 24 used slots are the original campaign maps.

Layers (one byte per tile, 64×64, row-major), as identified empirically with
``tools/inspect-maps.js`` on slot 0:

0. **Terrain class — selects the tile SHEET** (verified by rendering map00):

   - 0: grass (BASE sheet, indices 6-21)
   - 16: **village slots** — FOUR scattered single tiles per county (NOT a
     2×2 block, NOT pasture: verified, the four tiles are never adjacent;
     indices = grass variants 6-21). A village sprite (TOWN1x tile 59
     normal / 60 burned) appears on these tiles as the county population
     grows past thresholds (cattle herds graze on cattle FIELDS, class 32,
     not here). Earlier "herd pasture" hypothesis REFUTED.
   - 4: water/coast (BASE sheet, indices 22-116)
   - 1, 2, 3: roads (ROADS1x sheet; 1 → indices 0-29 — **index 0 is a
     valid road piece**, do draw it; 3 → 46-53 bridges?)
   - 8: **index ≤ 24 = mountain quarter** — the index directly addresses
     the MTNS1x sheet (25 tiles: four 2×2 models + one 3×3, one frame per
     map tile, with overhang rows); indices 30-37 = forest (ROADS1x sheet)
   - 10: rivers/trees (ROADS1x sheet, indices 41-45)
   - 32: **field** — EACH tile is one individual field (England: 168
     tiles = 12 fields per county, matching the help's "twelve fields").
     Index constantly 80 = ploughed-field frame of the ROADS1x sheet; the
     79-89 band holds the fenced field surfaces (all with hedge borders).
     Fields are clickable in the original (grain / cattle / fallow). NOT
     mountains as previously hypothesised.
   - 64: **county town (capital)**, one 2×2 block per county; indices 0-3
     = quarter (0=N, 1=W, 2=E, 3=S). Sprites: TOWN1x.PL8 tiles 47-50 /
     51-54 / 55-58 (three sizes, quarters in N,W,E,S order).
   - 128: **castle and industries**. One connected group (≥3 tiles,
     nominally 2×2) per county = the castle SLOT — layer 2 there holds the
     underlying grass variant (6-21); the castle sprite itself is game
     state (CASTLE1x.PL8 = 25 quads: 5 levels × 5 build states). Isolated
     tiles = industry buildings, layer 2 gives the building as a TOWN1x
     tile index: **0 = quarry pit, 20 = mine, 30 = lumber mill**.
     The animated blacksmith art is TOWN1x **10-18**, but in the exported
     campaign data its map position is inferred from the nearest grass tile
     variant **10/19** in the county, next to the town; otherwise the forge
     is only represented by the abstract county workshop flag.

1. Flags, values 0/4/8/12 only — semantics unconfirmed (elevation hypothesis
   REFUTED by comparative renders).
2. **Tile index within the sheet selected by layer 0**. Values ≤ 121.
   Indices 0-5 of BASE: 0 = empty, 1-5 = border slivers under multi-tile
   features (draw grass underneath).
3. **Road segments passing UNDER overlay features** (forests, mountains,
   towns, castles) — values 1-8 are ROADS1x frames, drawn between the
   ground and the feature sprite. Only ever non-zero on classes 8/64/128.
   This is what keeps the road network continuous through villages and
   castle grounds.
4. Sparse single tiles, values 1-6 — multi-tile feature quarters (towns),
   pairs with TOWN1x.PL8. Unconfirmed.
5. **County id**: 0 = water/off-map, 1..N = county index. 5 to 17 counties
   per map.

Seasonal sheet pairing: ``…1A`` = spring, ``…1B`` = summer, ``…1C`` =
autumn, ``…1D`` = winter; ``…2A-D`` = the same tiles at 10×6 px for the
strategic minimap. BASE01.PL8 holds season-independent pixels (water);
compose per-pixel with the seasonal sheet (pure black = transparent), see
``tools/composite-tilesets.js``.

The trailing 65×129 bitmap is the strategic minimap silhouette (side-panel
minimap). Two values only: **6 = land, 22 = water**. Projection (verified
against the county layer on slot 0, ~97% pixel match, remainder = smoothed
coastline): ``column = (x − y + 64) / 2``, ``row = x + y`` — i.e. the same
isometric orientation as the main view, with the horizontal axis halved.
Doubled horizontally it is 130×129, a 1:1 fit for the parchment area of the
panel's ``miniMap`` frame (162×132 with a 2 px border and the button column
on the right). At runtime the game recolours land pixels by county owner
(values 6/22 are not meaningful palette indices — 6 is teal, 22 sand, in
every .256). Renderer implementation: ``Campaign.buildMiniMap()``; offline
preview: ``tools/render-minimap.js``.

Map and county names live in **L2.ENG** (null-terminated strings): the table
starts at the string ``Here Be Dragons!`` followed by ``Duchy of Cornwall``
— 24 blocks of 20 strings (off-map region name + 19 county names, ``CTYn``
= unused slot), immediately followed by the 24 map titles (England,
Scotland, … YinYang) in slot order. County id N uses name N−1 of the block.
In the county layer, **id 32 marks mountain footprints** (same tiles as
terrain class 32), not a county.

Tooling:

- ``tools/inspect-maps.js`` — dumps layers of a slot as grayscale PNGs.
- ``tools/export-maps.js`` — exports used slots to JSON for the renderer
  (``src/renderer/public/maps/campaign/data/map``\ *NN*\ ``.json``).
- ``tools/extract-iso-tileset.js`` — decodes BASE01.PL8 + BASE01.256 to a
  transparent PNG spritesheet (grid pitch 64×34, diamond drawn at (0,4) in
  each cell).
- ``tools/render-minimap.js`` — renders the strategic minimap of an
  exported map JSON to PNG (same logic as ``Campaign.buildMiniMap()``).
- ``tools/extract-features.js`` — extracts towns, castles and industry
  buildings (TOWN1x/CASTLE1x) with their overhang rows. NOTE: the
  ``pl8image`` package does NOT draw the "extra rows" of PL8 tiles (the
  write is commented out in its GraphicFactory) — building tops are
  missing from anything extracted through it; ``tools/lib/pl8-draw.js``
  reimplements tile drawing with the overhang (the extra block ends at
  the diamond's middle row; type 2 = full-width rows, 3 = left half,
  4 = right half).
