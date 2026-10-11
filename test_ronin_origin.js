const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING THE RONIN & THE ORIGIN (16,000PX) VERIFICATION SUITE ===\n');

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

// Single-hero Ronin with Hiraishin
assert(gameJs.includes("id: 'ronin'"), "HEROES.ronin missing");
assert(gameJs.includes("name: 'THE RONIN'"), "HEROES.ronin name is not 'THE RONIN'");
assert(gameJs.includes("hasActiveSkill: true"), "HEROES.ronin active skill disabled");
assert(gameJs.includes("HIRAISHIN NO JUTSU"), "Hiraishin skill missing");

// 16,000px Map 1 Expansion & HD Pixel Art Rendering
assert(gameJs.includes("mapWidth: 16000"), "mapWidth is not 16000");
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

// Expanded Village Props across the 16,000px journey
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
assert(gameJs.includes("SEKTOR 1: PERMUKIMAN ASAL & PARKOUR LELUHUR"), "Ground segment 1 missing");
assert(gameJs.includes("SEKTOR 2: SANCTUM AKHIR & TAHTA CHIMERA"), "Ground segment 5 missing");

// NPCs
assert(gameJs.includes("name: 'Ren (Penyintas Desa)'"), "Ren NPC missing");
assert(gameJs.includes("name: 'Kakek Genji (Tetua Desa)'"), "Kakek Genji NPC missing");
assert(gameJs.includes("name: 'Master Glems (Pertapa Petir)'"), "Master Glems NPC missing");
assert(gameJs.includes("name: 'Aoi (Penjaga Gerbang Ngarai)'"), "Aoi NPC missing");

// Boss locations
assert(gameJs.includes("player.x > 4750 && player.x < 5550"), "Spearman boss trigger missing");
assert(gameJs.includes("player.x > 14600 && player.x < 15650"), "Chimera boss trigger missing");
assert(gameJs.includes("x: 15850, y: 350"), "Goal portal at 15850 missing");

// Sector 2 Quest & Altars
assert(gameJs.includes("sector2Altars"), "Sector 2 altars missing");
assert(gameJs.includes("Altar Segel Bulan"), "Altar Segel Bulan missing");
assert(gameJs.includes("Altar Segel Bintang"), "Altar Segel Bintang missing");
assert(gameJs.includes("Altar Segel Matahari"), "Altar Segel Matahari missing");

console.log('[PASS] game.js 16,000px expanded world, village props, continuous ground, NPCs, and boss triggers verified.');

// 3. Verify index.html contents
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('The Ronin: The Origin'), "index.html title missing 'The Ronin: The Origin'");
assert(indexHtml.includes('16,000px'), "index.html Level 1 stats missing '16,000px'");
assert(indexHtml.includes('SEGERA HADIR // TAHAP 2'), "index.html Level 2 missing 'SEGERA HADIR'");
assert(!indexHtml.includes('id="char-select-screen"'), "char-select-screen modal still present in index.html");
assert(!indexHtml.includes('id="controls-hint"'), "controls-hint still present in index.html");
console.log('[PASS] index.html updated UI, keybind hint removed, & Level cards verified.');

console.log('\n=== ALL SUITE TESTS PASSED WITH 100% SUCCESS! ===');
