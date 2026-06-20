/*
 * Regression checks for advanced labor allocation and county production.
 *
 * Usage:
 *   node --experimental-default-type=module tools/simulate-labor.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import GameState from '../src/renderer/game/state.js';

globalThis.Phaser = {
  Math: {
    Clamp: (value, min, max) => Math.max(min, Math.min(max, value))
  }
};

const map = JSON.parse(fs.readFileSync(
  new URL('../src/renderer/public/maps/campaign/data/map00.json', import.meta.url),
  'utf8'
));
const state = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const counties = Object.values(state.counties);
const startingCounty = counties.find(county => county.owner === 0);
assert(startingCounty, 'player must start with a county');
startingCounty.population = 383;
startingCounty.taxRate = 0;
assert.equal(state.taxIncome(startingCounty), 0, 'Tax 0% yields no crowns in the DOS tax panel');
const grainOnlyFood = { ...startingCounty, cows: 0, grainStock: 100 };
assert.equal(state.previewFood(grainOnlyFood, 180, 'Normal').sacksUsed, 30, '30 grain sacks feed 180 people');
assert.equal(state.previewFood(grainOnlyFood, 198, 'Normal').sacksUsed, 33, '33 grain sacks feed 198 people');
const startingGrainFields = state.fieldsOf(startingCounty.id, 'grain').length;
const startingActivities = state.laborActivities(startingCounty);
assert.equal(startingActivities.find(activity => activity.id === 'wood')?.missingNeed || 0, 0, 'wood has no mandatory worker deficit');
assert.equal(startingActivities.find(activity => activity.id === 'stone')?.missingNeed || 0, 0, 'stone has no mandatory worker deficit');
assert.equal(startingActivities.find(activity => activity.id === 'iron')?.missingNeed || 0, 0, 'iron has no mandatory worker deficit');
assert.equal(startingActivities.find(activity => activity.id === 'smithy')?.missingNeed || 0, 0, 'smithy has no mandatory worker deficit');
assert.equal(
  startingActivities.find(activity => activity.id === 'grain')?.need,
  startingGrainFields * 60,
  'normal farming requires 60 workers per grain field'
);
assert.equal(
  startingActivities.find(activity => activity.id === 'cattle')?.need,
  0,
  'cattle slot stays available but inactive without cattle fields'
);
state.setLaborFoodShare(startingCounty.id, 1);
let startingFood = state.laborSnapshot(startingCounty);
assert.equal(startingFood.food.assigned, startingFood.workforce, 'grain shortage consumes the full food workforce');
assert(startingFood.food.need > startingFood.workforce, 'starting county grain fields are understaffed at 383 population');
assert(state.transferLabor(startingCounty.id, 'grain', 'cattle', 15), 'workers can be manually assigned to cattle without cattle fields');
assert.equal(startingCounty.laborAllocations.cattle || 0, 15, 'manual cattle allocation is stored without cattle fields');
assert(state.laborInactiveWorkforce(startingCounty) >= 15, 'cattle workers without cattle fields count as inactive');
const noGrainState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const noGrainCounty = Object.values(noGrainState.counties).find(county => county.owner === 0);
for (const field of noGrainState.fieldsOf(noGrainCounty.id)) { field.use = 'fallow'; }
noGrainState.autoAllocateLabor(noGrainCounty.id);
assert(noGrainState.laborActivities(noGrainCounty).some(activity => activity.id === 'grain'), 'grain slot remains available without grain fields');
assert(noGrainState.transferLabor(noGrainCounty.id, 'idle', 'grain', 15), 'workers can be manually assigned to grain without grain fields');
assert.equal(noGrainCounty.laborAllocations.grain, 15, 'grain workers without fields remain assigned but inactive');
assert(noGrainState.laborInactiveWorkforce(noGrainCounty) >= 15, 'grain workers without fields count as inactive');
const sixFieldState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const sixFieldCounty = Object.values(sixFieldState.counties).find(county => county.owner === 0);
assert(sixFieldCounty, 'player must start with a county for six-field labor regression');
sixFieldCounty.population = 383;
const sixFieldGrain = sixFieldState.fieldsOf(sixFieldCounty.id, 'grain');
for (const field of sixFieldGrain.slice(6)) { field.use = 'fallow'; }
sixFieldState.setLaborFoodShare(sixFieldCounty.id, 1);
assert.equal(sixFieldCounty.laborAllocations.grain || 0, 360, 'six normal grain fields need exactly 360 peasants');
assert.equal(sixFieldState.ensureLabor(sixFieldCounty).idle, 23, 'peasants beyond covered grain need stay idle');
assert.equal(sixFieldCounty.laborAllocations.smithy || 0, 0, 'full food-side slider must not leave smiths assigned');
const winterState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const winterCounty = Object.values(winterState.counties).find(county => county.owner === 0);
const winterFields = winterState.fieldsOf(winterCounty.id);
for (const field of winterFields) { field.use = 'grain'; }
winterCounty.population = winterFields.length * 60;
winterCounty.ration = 'Quarter';
winterCounty.cows = 0;
winterCounty.grainStock = 500;
winterCounty.laborInitialized = true;
winterCounty.laborAllocations = Object.fromEntries(winterState.laborActivities(winterCounty).map(activity => [activity.id, 0]));
winterCounty.laborAllocations.grain = winterCounty.population;
winterState.seasonIndex = 3;
const winterPreview = winterState.previewCountyProduction(winterCounty);
assert.equal(winterPreview.grainSown, winterFields.length * 10, 'winter sowing costs 10 sacks per fully staffed grain field');
assert.equal(winterPreview.grainConsumed, Math.ceil((winterCounty.population * 0.25) / 6), 'winter preview also includes seasonal food consumption');
assert.equal(winterPreview.grain, -winterPreview.grainSown - winterPreview.grainConsumed, 'grain side-pane forecast is the net seasonal stock delta');
winterFields[0].use = 'fallow';
const oneLessWinterField = winterState.previewCountyProduction(winterCounty);
assert.equal(oneLessWinterField.grainSown, winterPreview.grainSown - 10, 'changing one grain field to fallow removes 10 sacks from the live winter forecast');
assert.equal(oneLessWinterField.grain, winterPreview.grain + 10, 'winter side-pane delta updates live by 10 sacks per removed field');
winterFields[0].use = 'grain';
const winterStockBefore = winterCounty.grainStock;
winterState.endTurn();
assert.equal(winterCounty.plantedSacks, winterFields.length * 10, 'winter turn plants 10 sacks per fully staffed field');
assert.equal(winterCounty.grainStock, winterStockBefore + winterPreview.grain, 'winter forecast matches the applied grain-stock delta');
const defaultWinterState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const defaultWinterCounty = Object.values(defaultWinterState.counties).find(county => county.owner === 0);
defaultWinterState.ensureLabor(defaultWinterCounty);
const defaultWinterBefore = defaultWinterState.previewCountyProduction(defaultWinterCounty);
defaultWinterState.fieldsOf(defaultWinterCounty.id, 'grain')[0].use = 'fallow';
defaultWinterState.autoAllocateLabor(defaultWinterCounty.id);
const defaultWinterAfter = defaultWinterState.previewCountyProduction(defaultWinterCounty);
assert.equal(defaultWinterAfter.grainSown, defaultWinterBefore.grainSown - 10, 'default understaffing does not cancel the live 10-sack field change');
assert.equal(defaultWinterAfter.grain, defaultWinterBefore.grain + 10, 'default winter basket delta changes by 10 after removing one grain field');
const gatherState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const gatherCounty = Object.values(gatherState.counties).find(county => county.owner === 0);
assert(gatherCounty, 'player must start with a county for inactive-worker gathering');
gatherCounty.population = 383;
gatherCounty.cows = 90;
for (const field of gatherState.fieldsOf(gatherCounty.id)) { field.use = 'fallow'; delete field.reclaim; }
gatherState.fieldsOf(gatherCounty.id)[0].use = 'grain';
gatherCounty.laborInitialized = true;
gatherCounty.laborAllocations = Object.fromEntries(gatherState.laborActivities(gatherCounty).map(activity => [activity.id, 0]));
gatherCounty.laborAllocations.grain = 70;
gatherCounty.laborAllocations.cattle = 15;
gatherCounty.laborAllocations.reclaim = 7;
gatherCounty.laborAllocations.castle = 9;
if ('smithy' in gatherCounty.laborAllocations) {
  gatherState.player.wood = 0;
  gatherState.player.iron = 0;
  gatherCounty.laborAllocations.smithy = 20;
}
const idleBeforeGather = gatherState.ensureLabor(gatherCounty).idle;
const expectedGathered = 10 + 15 + 7 + 9 + (('smithy' in gatherCounty.laborAllocations) ? 20 : 0);
assert.equal(gatherState.gatherInactiveLabor(gatherCounty.id), expectedGathered, 'town-centre gathering moves every inactive task surplus');
assert.equal(gatherCounty.laborAllocations.grain, 60, 'gathering preserves useful grain workers');
assert.equal(gatherCounty.laborAllocations.cattle, 0, 'cattle workers without pasture return to town');
assert.equal(gatherCounty.laborAllocations.reclaim, 0, 'inactive reclaim workers return to town');
assert.equal(gatherCounty.laborAllocations.castle, 0, 'inactive castle workers return to town');
assert.equal(gatherState.ensureLabor(gatherCounty).idle, idleBeforeGather + expectedGathered, 'gathered workers become town-centre peasants');
const herdState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const herdCounty = Object.values(herdState.counties).find(county => county.owner === 0);
assert(herdCounty, 'player must start with a county for herd density regression');
herdCounty.cows = 90;
const herdFields = herdState.fieldsOf(herdCounty.id);
for (const field of herdFields) { field.use = 'fallow'; }
assert.equal(herdState.cattleWorkerNeed(herdCounty), 0, 'cattle without pasture require no dairy maids');
assert.equal(herdState.cattleProjection(herdCounty).delta, -45, '90 cattle without pasture lose half the herd');
herdCounty.cows = 101;
assert.equal(herdState.cattleProjection(herdCounty).delta, -50, 'odd herds without pasture truncate half-herd losses like DOS');
herdCounty.cows = 30;
assert.equal(herdState.cattleProjection(herdCounty).delta, -30, 'a herd of 30 without pasture dies completely');
herdCounty.cows = 90;
herdFields[0].use = 'cattle';
assert.equal(herdState.cattleHerdStatus(herdCounty).figures, 3, '90 cows on one field renders overcrowded herds');
const onePastureNeed = herdState.cattleWorkerNeed(herdCounty);
herdFields[1].use = 'cattle';
assert.equal(herdState.cattleHerdStatus(herdCounty).figures, 3, '90 cows on two fields still renders high density');
herdFields[2].use = 'cattle';
herdFields[3].use = 'cattle';
herdFields[4].use = 'cattle';
assert.equal(herdState.cattleHerdStatus(herdCounty).figures, 2, '90 cows on five fields renders medium density');
const mediumPastureNeed = herdState.cattleWorkerNeed(herdCounty);
for (const field of herdFields.slice(5, 10)) { field.use = 'cattle'; }
assert.equal(herdState.cattleHerdStatus(herdCounty).figures, 1, '90 cows on ten fields renders low density');
assert(herdState.cattleWorkerNeed(herdCounty) < mediumPastureNeed, 'lower density reduces stable worker pressure outside overflow mode');

herdCounty.cows = 30;
for (const field of herdFields) { field.use = 'fallow'; }
herdFields[0].use = 'cattle';
herdState.ensureLabor(herdCounty);
herdCounty.laborAllocations.cattle = 108;
assert.equal(herdState.cattleWorkerNeed(herdCounty), 108, '30 cows on one full high-density field need 108 dairy maids for stability');
assert.equal(herdState.cattleProjection(herdCounty).activeWorkers, 108, 'stable dairy labor is fully active');
assert.equal(herdState.cattleProjection(herdCounty).delta, 0, '108 dairy maids stabilize 30 crowded cows');
herdCounty.laborAllocations.cattle = 180;
assert.equal(herdState.cattleProjection(herdCounty).delta, 3, '180 dairy maids give +3 net cows at high density');
assert.equal(herdState.cattleProjection(herdCounty).activeWorkers, 180, 'workers producing the maximum growth remain active');
herdCounty.cows = 90;
herdFields[1].use = 'cattle';
herdFields[2].use = 'cattle';
herdCounty.population = 383;
herdCounty.laborAllocations.cattle = 383;
assert.equal(herdState.cattleWorkerNeed(herdCounty), 324, 'three full cattle fields need 324 dairy maids for stability');
assert.equal(herdState.cattleProjection(herdCounty).delta, 2, '383 assigned dairy maids produce two net births');
assert.equal(herdState.cattleProjection(herdCounty).activeWorkers, 372, 'only workers contributing through the last complete birth step are active');
assert.equal(
  herdCounty.laborAllocations.cattle - herdState.laborUsefulCapacity(herdCounty, herdState.laborActivities(herdCounty).find(activity => activity.id === 'cattle')),
  11,
  'non-contributing cattle workers remain inactive'
);
for (const field of herdFields.slice(1)) { field.use = 'fallow'; }
herdCounty.cows = 33;
herdCounty.laborAllocations.cattle = 89;
assert.equal(herdState.cattleWorkerNeed(herdCounty), 89, 'overflow cattle relaxes worker need to the forced mortality band');
assert.equal(herdState.cattleProjection(herdCounty).delta, -3, 'overflow cattle force losses back to field capacity');
herdCounty.population = 0;
herdState.endTurn();
assert.equal(herdCounty.cows, 30, 'overflow resolution clamps herd back to field capacity after the turn');
const noPastureState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const noPastureCounty = Object.values(noPastureState.counties).find(county => county.owner === 0);
for (const field of noPastureState.fieldsOf(noPastureCounty.id)) { field.use = 'fallow'; }
noPastureCounty.population = 0;
noPastureCounty.cows = 90;
noPastureState.endTurn();
assert.equal(noPastureCounty.cows, 45, 'turn resolution applies no-pasture herd mortality');
assert.equal(noPastureCounty.lastProduction.cattle, -45, 'no-pasture mortality is reported as cattle production delta');
const plain = counties.find(county => !county.hasQuarry);
assert(plain, 'map00 must contain a county without quarry');
plain.owner = 0;

let snapshot = state.ensureLabor(plain);
let assigned = Object.values(plain.laborAllocations).reduce((sum, value) => sum + value, 0);
assert.equal(assigned + snapshot.idle, snapshot.workforce, 'workers must be conserved');
assert(!state.laborActivities(plain).some(activity => activity.id === 'stone'), 'no quarry means no stone slot');
state.setLaborFoodShare(plain.id, 1);
let foodHeavy = state.laborSnapshot(plain);
assert(foodHeavy.food.assigned > 0, 'food-side slider must staff food tasks');
assert.equal(foodHeavy.industry.assigned, 0, 'full food-side slider must not staff industry tasks');
assert.equal(foodHeavy.food.assigned + foodHeavy.idle, foodHeavy.workforce, 'food-side slider assigns every worker it can use');
const foodHeavyPreview = state.previewCountyProduction(plain);
assert.equal(foodHeavyPreview.wood, 0, 'full food-side slider has no wood production');
assert.equal(foodHeavyPreview.stone, 0, 'full food-side slider has no stone production');
assert.equal(foodHeavyPreview.iron, 0, 'full food-side slider has no iron production');
assert.equal(foodHeavyPreview.smithy, 0, 'full food-side slider has no weapon production');
state.setLaborFoodShare(plain.id, 0);
let industryHeavy = state.laborSnapshot(plain);
assert.equal(industryHeavy.food.assigned, 0, 'full industry-side slider must not staff food tasks');
assert(industryHeavy.industry.assigned > 0, 'industry-side slider must staff industry tasks');
assert.equal(industryHeavy.industry.assigned + industryHeavy.idle, industryHeavy.workforce, 'industry-side slider assigns every worker it can use');
assert(state.laborInactiveWorkforce(plain) > 0, 'industry-side surplus counts as inactive labor for the blue cursor');
state.setLaborFoodShare(plain.id, 0.5);

const source = Object.keys(plain.laborAllocations).find(key => plain.laborAllocations[key] >= 10);
assert(source, 'automatic allocation must staff at least one task');
assert(state.transferLabor(plain.id, source, 'idle', 10), 'workers can be moved to the town center');
assert(state.transferLabor(plain.id, 'idle', 'smithy', 10), 'idle workers can be moved to another task');
assert(state.laborActivities(plain).some(activity => activity.id === 'castle'), 'castle slot stays available without an active castle project');
assert(state.transferLabor(plain.id, 'smithy', 'castle', 1), 'workers can be moved to inactive castle building');
snapshot = state.ensureLabor(plain);
assigned = Object.values(plain.laborAllocations).reduce((sum, value) => sum + value, 0);
assert.equal(assigned + snapshot.idle, snapshot.workforce, 'transfers must conserve workers');

state.endTurn();
assert.equal(plain.lastProduction.stone, 0, 'a county without quarry cannot produce stone');

const woodCounty = counties.find(county => county.hasLumberMill);
assert(woodCounty, 'map00 must contain a county with exploitable woodland');
woodCounty.owner = 0;
state.ensureLabor(woodCounty);
const grainBefore = woodCounty.laborAllocations.grain || 0;
const woodBefore = woodCounty.laborAllocations.wood || 0;
const moved = Math.min(10, grainBefore);
assert(moved > 0, 'wood county must start with grain workers');
assert(state.transferLabor(woodCounty.id, 'grain', 'wood', moved), 'grain workers can be moved to woodland');
assert.equal(woodCounty.laborAllocations.grain, grainBefore - moved, 'grain allocation decreases after transfer');
assert.equal(woodCounty.laborAllocations.wood, woodBefore + moved, 'wood allocation increases after transfer');
for (const field of state.fieldsOf(woodCounty.id)) { delete field.reclaim; }
state.ensureLabor(woodCounty);
assert(state.laborActivities(woodCounty).some(activity => activity.id === 'reclaim'), 'reclaim slot stays available without an active field reclaim');
assert(state.transferLabor(woodCounty.id, 'wood', 'reclaim', 1), 'workers can be moved to inactive reclaim without an active reclaim project');
const reclaimField = state.fieldsOf(woodCounty.id)[0];
assert(reclaimField, 'wood county must have at least one field for reclaim regression');
reclaimField.use = 'barren';
reclaimField.reclaim = 0;
state.ensureLabor(woodCounty);
assert(state.laborActivities(woodCounty).some(activity => activity.id === 'reclaim'), 'active field reclaim exposes reclaim slot');
assert(state.transferLabor(woodCounty.id, 'wood', 'reclaim', 1), 'workers can be moved to an active reclaim project');
let woodSnapshot = state.ensureLabor(woodCounty);
let woodAssigned = Object.values(woodCounty.laborAllocations).reduce((sum, value) => sum + value, 0);
assert.equal(woodAssigned + woodSnapshot.idle, woodSnapshot.workforce, 'grain-to-wood transfer conserves workers');
state.endTurn();
assert(woodCounty.lastProduction.wood > 0, 'staffed woodland must produce wood');

assert(state.setLaborActivityOperational(woodCounty.id, 'wood', false), 'wood industry can be stopped');
assert.equal(woodCounty.laborAllocations.wood || 0, 0, 'stopping woodland releases woodcutters');
assert.equal(state.laborCoverage(woodCounty, 'wood'), 0, 'stopped woodland has no labor coverage');
assert(!state.transferLabor(woodCounty.id, 'idle', 'wood', 1), 'stopped woodland cannot receive workers');
state.endTurn();
assert.equal(woodCounty.lastProduction.wood, 0, 'stopped woodland produces no wood');
assert(state.setLaborActivityOperational(woodCounty.id, 'wood', true), 'wood industry can be restarted');
assert(state.transferLabor(woodCounty.id, 'idle', 'wood', 20), 'restarted woodland can receive workers');
state.endTurn();
assert(woodCounty.lastProduction.wood > 0, 'restarted woodland produces again once staffed');

const overproductionState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const overproductionCounty = Object.values(overproductionState.counties).find(county => county.hasLumberMill);
assert(overproductionCounty, 'map00 must contain a county with woodland for overproduction regression');
overproductionCounty.owner = 0;
overproductionCounty.population = 30000;
overproductionCounty.laborInitialized = true;
overproductionCounty.laborAllocations = { grain: 0, cattle: 0, reclaim: 0, castle: 0, stone: 0, wood: 200, smithy: 0 };
overproductionState.endTurn();
assert(overproductionCounty.lastProduction.wood > 2, 'wood production must scale beyond the old full-coverage cap');
assert.equal(overproductionCounty.lastProduction.wood, 160, 'wood production uses 0.8 unit per assigned peasant');
overproductionCounty.laborAllocations.wood = 20000;
overproductionState.endTurn();
assert.equal(overproductionCounty.lastProduction.wood, 999, 'wood production is capped at 999 per turn');

const quarryCounty = counties.find(county => county.hasQuarry);
assert(quarryCounty, 'map00 must contain a county with stone quarry');
quarryCounty.owner = 0;
state.ensureLabor(quarryCounty);
assert(state.laborActivities(quarryCounty).some(activity => activity.id === 'stone'), 'quarry county exposes stone slot');
const stoneSource = Object.keys(quarryCounty.laborAllocations)
  .find(key => key !== 'stone' && quarryCounty.laborAllocations[key] >= 5);
assert(stoneSource, 'quarry county must start with transferable workers');
const stoneBefore = quarryCounty.laborAllocations.stone || 0;
const stoneMoved = Math.min(5, quarryCounty.laborAllocations[stoneSource]);
assert(state.transferLabor(quarryCounty.id, stoneSource, 'stone', stoneMoved), 'workers can be moved to stone quarry');
assert.equal(quarryCounty.laborAllocations.stone, stoneBefore + stoneMoved, 'stone allocation increases after transfer');
let quarryPreview = state.previewCountyProduction(quarryCounty);
assert(quarryPreview.stone > 0, 'staffed stone quarry has a visible production forecast');
quarryCounty.laborAllocations.stone = 100;
quarryPreview = state.previewCountyProduction(quarryCounty);
assert.equal(quarryPreview.stone, 40, 'stone forecast uses 0.4 ton per assigned peasant');
state.endTurn();
assert.equal(quarryCounty.lastProduction.stone, 40, 'staffed stone quarry must produce 0.4 ton per assigned peasant');

const ironCounty = counties.find(county => state.laborActivities(county).some(activity => activity.id === 'iron'));
if (ironCounty) {
  ironCounty.owner = 0;
  state.ensureLabor(ironCounty);
  ironCounty.laborAllocations.iron = 100;
  const ironPreview = state.previewCountyProduction(ironCounty);
  assert.equal(ironPreview.iron, 80, 'iron forecast uses 0.8 ton per assigned peasant');
}

const smithyCounty = counties.find(county => county.hasWorkshop);
assert(smithyCounty, 'map00 must contain a county with blacksmith');
smithyCounty.owner = 0;
state.ensureLabor(smithyCounty);
smithyCounty.laborAllocations.smithy = 100;
state.player.wood = 1000;
state.player.iron = 1000;
assert(state.laborUsefulCapacity(smithyCounty, state.laborActivities(smithyCounty).find(activity => activity.id === 'smithy')) >= 100, 'material-backed smithy workers are useful beyond the nominal auto-allocation target');
const smithyPreview = state.previewCountyProduction(smithyCounty);
assert.equal(smithyPreview.weaponType, smithyCounty.weaponType, 'smithy forecast exposes the weapon type');
assert.equal(smithyPreview.smithy, 20, 'smithy forecast uses 0.2 weapon per assigned peasant');

const armyState = new GameState(map, 'purple', { nobles: 2, crowns: 5000, armyFood: true });
const armyCounty = Object.values(armyState.counties).find(county => county.owner === 0);
assert(armyCounty, 'player must start with a county for army regressions');
armyCounty.population = 600;
armyCounty.grainStock = 0;
armyCounty.cows = 0;
const hungryArmy = armyState.createArmy(armyCounty.id, 100);
assert(hungryArmy, 'army can be raised for foraging regression');
armyState.endTurn();
assert.equal(armyCounty.lastForagers, 100, 'foraging counts soldiers in the county');
assert(hungryArmy.men < 100 || !armyState.armies.includes(hungryArmy), 'hungry foragers lose soldiers');
assert(armyState.lastEvents.some(event => event.type === 'armyFamine'), 'army starvation is reported');

const wageState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const wageCounty = Object.values(wageState.counties).find(county => county.owner === 0);
assert(wageCounty, 'player must start with a county for wage regressions');
wageCounty.population = 600;
const paidArmy = wageState.createArmy(wageCounty.id, 100);
assert(paidArmy, 'army can be raised for wage regression');
wageState.player.crowns = 100;
wageState.endTurn();
assert(wageState.player.lastWagesDue > 0, 'army wages are assessed');
assert.equal(wageState.player.lastWagesPaid, wageState.player.lastWagesDue, 'army wages are paid from treasury');

const desertState = new GameState(map, 'purple', { nobles: 2, crowns: 5000 });
const desertCounty = Object.values(desertState.counties).find(county => county.owner === 0);
assert(desertCounty, 'player must start with a county for desertion regressions');
desertCounty.population = 600;
const unpaidArmy = desertState.createArmy(desertCounty.id, 100);
assert(unpaidArmy, 'army can be raised for desertion regression');
desertState.player.crowns = 0;
desertCounty.owner = null;
desertState.endTurn();
assert(desertState.player.lastDeserters > 0, 'unpaid armies lose deserters');
assert(desertState.lastEvents.some(event => event.type === 'desertion'), 'desertion is reported');

console.log('labor simulation: OK');
