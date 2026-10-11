const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING THE RONIN & THE ORIGIN VERIFICATION SUITE ===\n');

// 1. Verify Assets on disk
const assets = [
  'bg_misty_woods.jpg',
  'bg_ancient_totem.jpg',
  'bg_ruins_shrine.jpg',
  'tileset_verdant_ruins.jpg',
  'bg_origin_village.jpg',
  'ref_village_mockup.jpg',
  'ref_ruins_mockup.png'
];

assets.forEach(asset => {
  const p = path.join(__dirname, 'assets', asset);
  assert(fs.existsSync(p), `Missing asset: ${asset}`);
  const stat = fs.statSync(p);
  assert(stat.size > 1000, `Asset ${asset} is too small (${stat.size} bytes)`);
  console.log(`[PASS] Asset verified: ${asset} (${stat.size} bytes)`);
});

// 2. Verify game.js contents
const gameJs = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');

// Strictly single hero (The Ronin)
assert(gameJs.includes("id: 'ronin'"), "HEROES.ronin missing");
assert(gameJs.includes("name: 'THE RONIN'"), "HEROES.ronin name is not 'THE RONIN'");
assert(!gameJs.includes("fall: {"), "Legacy hero 'fall' still present");
assert(!gameJs.includes("dregsnot: {"), "Legacy hero 'dregsnot' still present");
assert(!gameJs.includes("strom: {"), "Legacy hero 'strom' still present");
assert(!gameJs.includes("glems: {"), "Legacy hero 'glems' still present");

// Visual & art integration
assert(gameJs.includes("l1BgAssets.originVillage"), "originVillage asset not bound in l1BgAssets");
assert(gameJs.includes("assets/bg_origin_village.jpg"), "bg_origin_village.jpg path not found in game.js");
assert(gameJs.includes("function drawLevel1ForestParallax"), "drawLevel1ForestParallax function missing");
assert(gameJs.includes("level1NPCs"), "level1NPCs definition missing");
assert(gameJs.includes("drawLevelNPCs"), "drawLevelNPCs function missing");
assert(gameJs.includes("function toggleRoninSkin"), "toggleRoninSkin function missing");
assert(gameJs.includes("Wildflower Blossoms"), "Wildflower blossoms not rendered on platforms");

// Continuous solid ground check
assert(gameJs.includes("CONTINUOUS SOLID VILLAGE GROUND FLOOR"), "Continuous ground floor comments missing");
assert(gameJs.includes("w: 1100, h: 180, type: 'forest_stone'"), "Ground floor segment 1 missing");
assert(gameJs.includes("w: 1200, h: 180, type: 'forest_stone'"), "Ground floor segment 2 missing");
console.log('[PASS] game.js Ronin, NPC, Continuous Ground, & Origin Village Art verified.');

// 3. Verify index.html contents
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('The Ronin: The Origin'), "index.html title missing 'The Ronin: The Origin'");
assert(indexHtml.includes('THE RONIN'), "index.html HUD hero name is not 'THE RONIN'");
assert(indexHtml.includes('toggleRoninSkin()'), "toggleRoninSkin button missing in index.html");
assert(!indexHtml.includes('id="char-select-screen"'), "char-select-screen modal still present in index.html");
assert(!indexHtml.includes('GANTI HERO'), "GANTI HERO button still present in index.html");
console.log('[PASS] index.html Ronin single-hero interface verified.');

console.log('\n=== ALL SUITE TESTS PASSED WITH 100% SUCCESS! ===');
