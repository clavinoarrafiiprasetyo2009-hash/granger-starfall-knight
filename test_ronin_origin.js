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
  'tileset_origin_platforms.png',
  'tileset_origin_furniture.png',
  'tileset_origin_master.png',
  'bg_origin_wall_panorama.png'
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

// Single-hero Ronin
assert(gameJs.includes("id: 'ronin'"), "HEROES.ronin missing");
assert(gameJs.includes("name: 'THE RONIN'"), "HEROES.ronin name is not 'THE RONIN'");
assert(!gameJs.includes("fall: {"), "Legacy hero 'fall' still present");
assert(!gameJs.includes("dregsnot: {"), "Legacy hero 'dregsnot' still present");

// 10,800px Map 1 Expansion & HD Pixel Art Rendering
assert(gameJs.includes("mapWidth: 10800"), "mapWidth is not 10800");
assert(gameJs.includes("ctx.imageSmoothingEnabled = false"), "Crisp HD pixel art smoothing disabled missing");
assert(gameJs.includes("l1BgAssets.originMaster.src = 'assets/tileset_origin_master.png'"), "originMaster asset missing");

// Grounded Japanese Architecture & Celestial Island platform types
assert(gameJs.includes("village_house"), "village_house platform type missing");
assert(gameJs.includes("watchtower"), "watchtower platform type missing");
assert(gameJs.includes("stepped_terrace"), "stepped_terrace platform type missing");
assert(gameJs.includes("taiko_bridge"), "taiko_bridge platform type missing");
assert(gameJs.includes("floating_island"), "floating_island platform type missing");
assert(gameJs.includes("hanging_wood_banner"), "hanging_wood_banner platform type missing");
assert(gameJs.includes("stone_bridge"), "stone_bridge platform type missing");
assert(gameJs.includes("grand_gatehouse"), "grand_gatehouse platform type missing");
assert(gameJs.includes("shrine_pavilion"), "shrine_pavilion platform type missing");

// Expanded Village Props
assert(gameJs.includes("notice_board"), "notice_board prop missing");
assert(gameJs.includes("hanging_lantern_post"), "hanging_lantern_post prop missing");
assert(gameJs.includes("small_torii"), "small_torii prop missing");
assert(gameJs.includes("crate_sacks"), "crate_sacks prop missing");
assert(gameJs.includes("flowering_shrub"), "flowering_shrub prop missing");

// Enemy AI Anti-stuck watchdog & collision
assert(gameJs.includes("onContinuousGround"), "Enemy onContinuousGround fix missing");
assert(gameJs.includes("this.stuckTimer > 18"), "Anti-stuck watchdog timer missing");
assert(gameJs.includes("isAboveTop && isWithinX"), "Enemy platform landing condition missing");

// Continuous ground floor
assert(gameJs.includes("SEKTOR 1: JALAN UTAMA & PERMUKIMAN"), "Ground segment 1 missing");
assert(gameJs.includes("SEKTOR 5 & 6: SANCTUM & TAHTA CHIMERA"), "Ground segment 5 missing");

// Ren NPC
assert(gameJs.includes("name: 'Ren'"), "Ren NPC missing");
assert(gameJs.includes("x: 1540"), "Ren NPC position missing");

// Boss locations
assert(gameJs.includes("player.x > 4600 && player.x < 5200"), "Behemoth trigger missing");
assert(gameJs.includes("player.x > 9400 && player.x < 10400"), "Chimera trigger missing");
assert(gameJs.includes("x: 10650, y: 350"), "Goal portal at 10650 missing");

// Bug fix check: startMission must not crash on null char-select-screen
assert(!gameJs.includes("document.getElementById('char-select-screen').classList.add('hidden')"), "Unguarded char-select-screen call still exists!");

console.log('[PASS] game.js 10,800px expanded world, village props, continuous ground, and bugfix verified.');

// 3. Verify index.html contents
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('The Ronin: The Origin'), "index.html title missing 'The Ronin: The Origin'");
assert(indexHtml.includes('10,800px'), "index.html Level 1 stats missing '10,800px'");
assert(indexHtml.includes('SEGERA HADIR // TAHAP 2'), "index.html Level 2 missing 'SEGERA HADIR'");
assert(!indexHtml.includes('id="char-select-screen"'), "char-select-screen modal still present in index.html");
console.log('[PASS] index.html updated UI & Level cards verified.');

console.log('\n=== ALL SUITE TESTS PASSED WITH 100% SUCCESS! ===');
