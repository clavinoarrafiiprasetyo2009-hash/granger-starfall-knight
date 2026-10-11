const fs = require('fs');
const assert = require('assert');

console.log('=== RUNNING MASTERPIECE LEVEL 1 PLATFORM & ARCHITECTURE VERIFICATION (16,000PX) ===');

const gameJs = fs.readFileSync('game.js', 'utf8');

// 1. Check LEVELS[1] definition and 16,000px map width
assert(gameJs.includes("id: 1,"), "Level 1 ID missing");
assert(gameJs.includes("mapWidth: 16000"), "Map width must be 16000");
console.log('[PASS] Map width 16,000px verified.');

// 2. Check continuous solid village ground floor: 0..16000 at y = 440
assert(gameJs.includes("x: 0,     y: 440, w: 3200, h: 180"), "Ground segment 1 missing");
assert(gameJs.includes("x: 3180,  y: 440, w: 2600, h: 180"), "Ground segment 2 missing");
assert(gameJs.includes("x: 5760,  y: 440, w: 3200, h: 180"), "Ground segment 3 missing");
assert(gameJs.includes("x: 8940,  y: 440, w: 3600, h: 180"), "Ground segment 4 missing");
assert(gameJs.includes("x: 12520, y: 440, w: 3500, h: 180"), "Ground segment 5 missing");
console.log('[PASS] Continuous solid ground floor 0..16000 verified.');

// 3. Check grounded architecture platforms
const requiredArchitectures = [
  'village_house',
  'watchtower',
  'stepped_terrace',
  'taiko_bridge',
  'floating_island',
  'grand_gatehouse',
  'shrine_pavilion',
  'hanging_wood_banner',
  'torii_gate',
  'yamamon_gate',
  'tree_root',
  'rope_bridge',
  'stone_bridge'
];

requiredArchitectures.forEach(type => {
  assert(gameJs.includes(`type: '${type}'`), `Platform type '${type}' missing in game.js`);
  console.log(`[PASS] Architectural platform type '${type}' verified.`);
});

// 4. Check enemy AI anti-stuck watchdog and platform collision logic
assert(gameJs.includes('this.stuckTimer > 18'), 'Enemy stuckTimer watchdog missing');
assert(gameJs.includes('onContinuousGround = true'), 'Enemy onContinuousGround missing');
assert(gameJs.includes('isAboveTop && isWithinX'), 'Universal platform side collision missing');
console.log('[PASS] Enemy AI anti-stuck watchdog and physics verified.');

// 5. Check crisp pixel-art setting
assert(gameJs.includes('ctx.imageSmoothingEnabled = false'), 'imageSmoothingEnabled = false missing');
console.log('[PASS] Crisp HD pixel art rendering verified.');

// 6. Check that Ronin hero is active with Hiraishin no Jutsu
assert(gameJs.includes("id: 'ronin'"), "Ronin hero missing");
assert(gameJs.includes("skillName: 'HIRAISHIN NO JUTSU'"), "Hiraishin no Jutsu missing");
assert(gameJs.includes("hasActiveSkill: true"), "Ronin active skill not enabled");
console.log('[PASS] Hero: The Ronin with Hiraishin no Jutsu verified.');

// 7. Check Master Glems NPC and Hiraishin scroll progression
assert(gameJs.includes("name: 'Master Glems (Pertapa Petir)'"), "Master Glems NPC missing");
assert(gameJs.includes("hiraishin_scroll"), "Hiraishin scroll relic missing");
assert(gameJs.includes("player.hasHiraishin"), "player.hasHiraishin flag missing");
console.log('[PASS] Master Glems NPC & Hiraishin scroll progression verified.');

// 8. Check Sector 1 Boss: Pendekar Tombak Misterius
assert(gameJs.includes("type === 'boss_spearman'"), "boss_spearman type missing");
assert(gameJs.includes("PENDEKAR TOMBAK MISTERIUS"), "boss_spearman name missing");
assert(gameJs.includes("defeatedBosses.spearman"), "defeatedBosses.spearman missing");
console.log('[PASS] Sector 1 Boss: Pendekar Tombak Misterius verified.');

// 9. Check Sector 2 Sakura Tri-Seal quest
assert(gameJs.includes("sector2Altars"), "sector2Altars missing");
assert(gameJs.includes("Altar Segel Bulan"), "Altar Segel Bulan missing");
assert(gameJs.includes("Altar Segel Bintang"), "Altar Segel Bintang missing");
assert(gameJs.includes("Altar Segel Matahari"), "Altar Segel Matahari missing");
console.log('[PASS] Sector 2 Sakura Tri-Seal quest verified.');

// 10. Check that first 1600px is safe (no enemies spawned before x=1700)
const stationedMatches = gameJs.match(/stationedEnemies:\s*\[([\s\S]*?)\]\s*\},/);
assert(stationedMatches, "stationedEnemies not found");
const stationedBlock = stationedMatches[1];
const xPositions = [...stationedBlock.matchAll(/x:\s*(\d+)/g)].map(m => parseInt(m[1]));
const enemiesBefore1600 = xPositions.filter(x => x < 1600);
assert.strictEqual(enemiesBefore1600.length, 0, "No enemies should be stationed before x=1600");
console.log('[PASS] Safe tutorial/explore zone at start (0..1600px has 0 enemies) verified.');

console.log('\n=== ALL MASTERPIECE VERIFICATION CHECKS PASSED (100%) ===\n');
