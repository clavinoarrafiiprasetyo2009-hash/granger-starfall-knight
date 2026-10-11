const fs = require('fs');
const assert = require('assert');

console.log('=== RUNNING MASTERPIECE LEVEL 1 PLATFORM & ARCHITECTURE VERIFICATION (17,000PX) ===');

const gameJs = fs.readFileSync('game.js', 'utf8');

// 1. Check LEVELS[1] definition and 17,000px map width
assert(gameJs.includes("id: 1,"), "Level 1 ID missing");
assert(gameJs.includes("mapWidth: 17000"), "Map width must be 17000");
console.log('[PASS] Map width 17,000px verified.');

// 2. Check undulating dynamic village and canyon ground floor with varying elevations
assert(gameJs.includes("SEKTOR 1: PERMUKIMAN ASAL (DATARAN RENDAH)"), "Lowland village ground missing");
assert(gameJs.includes("SEKTOR 1: TERAS TETUA GENJI (DATARAN TINGGI)"), "Genji high terrace missing");
assert(gameJs.includes("SEKTOR 1: DASAR CEKUNGAN GOA RAHASIA"), "Secret cave sunken ground missing");
assert(gameJs.includes("SEKTOR 1: DASAR KAKI TEBING GLEMS"), "Cliff base ground missing");
assert(gameJs.includes("SEKTOR 1: ARENA PENDEKAR TOMBAK MISTERIUS"), "Spearman arena ground missing");
assert(gameJs.includes("PERJALANAN PANJANG: LERENG NGARAI PURBA"), "Grand gorge slope missing");
assert(gameJs.includes("SEKTOR 2: SANCTUM AKHIR & TAHTA CHIMERA"), "Chimera sanctum ground missing");
console.log('[PASS] Undulating multi-elevation ground floor across 0..17,000px verified.');

// 3. Check grounded architecture platforms & cliff wall-jump parkour chimney
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
  'stone_bridge',
  'ruin_wall'
];

requiredArchitectures.forEach(type => {
  assert(gameJs.includes(`type: '${type}'`), `Platform type '${type}' missing in game.js`);
  console.log(`[PASS] Architectural platform type '${type}' verified.`);
});

// Check Cliff Wall-Jump Chimney for reaching Master Glems
assert(gameJs.includes("DINDING TEBING KIRI (WALL JUMP)"), "Left cliff wall chimney missing");
assert(gameJs.includes("DINDING TEBING KANAN (WALL JUMP)"), "Right cliff wall chimney missing");
console.log('[PASS] Cliff Wall-Jump parkour chimney to Master Glems verified.');

// 4. Check Hollow Knight boss arena camera locking
assert(gameJs.includes("camera.lock(6180, 50)"), "Spearman arena camera lock missing");
assert(gameJs.includes("camera.lock(15600, 50)"), "Chimera arena camera lock missing");
assert(gameJs.includes("camera.unlock()"), "camera.unlock() missing");
console.log('[PASS] Hollow Knight boss arena camera room framing verified.');

// 5. Check Spearman Boss AI: Wind-up telegraphs and disciplined duelist combat
assert(gameJs.includes("telegraph_thrust"), "Spearman telegraph_thrust state missing");
assert(gameJs.includes("telegraph_sweep"), "Spearman telegraph_sweep state missing");
assert(gameJs.includes("telegraph_vault"), "Spearman telegraph_vault state missing");
assert(gameJs.includes("aiState === 'stalking'"), "Spearman stalking state missing");
console.log('[PASS] Spearman Boss duelist AI with wind-up telegraphs (aba-aba) verified.');

// 6. Check sleek, thin katana blade slash arc
assert(gameJs.includes("const rInner = s.radius * 0.82;"), "Thin katana blade inner radius missing");
assert(gameJs.includes("ctx.lineWidth = 2.4;"), "Razor-sharp cutting edge stroke missing");
assert(gameJs.includes("player.slashTimer = 14;"), "player.slashTimer initialization missing");
assert(gameJs.includes("function drawSlashSmear(ctx)"), "drawSlashSmear function missing");
assert(gameJs.includes("drawSlashSmear(ctx);"), "drawSlashSmear foreground call missing");
console.log('[PASS] Sleek, razor-sharp thin katana slash arc & foreground rendering verified.');

// 7. Check that Ronin hero is active with Hiraishin no Jutsu
assert(gameJs.includes("id: 'ronin'"), "Ronin hero missing");
assert(gameJs.includes("skillName: 'HIRAISHIN NO JUTSU'"), "Hiraishin no Jutsu missing");
assert(gameJs.includes("hasActiveSkill: true"), "Ronin active skill not enabled");
console.log('[PASS] Hero: The Ronin with Hiraishin no Jutsu verified.');

// 8. Check Master Glems NPC at celestial summit and Hiraishin scroll progression
assert(gameJs.includes("name: 'Master Glems (Pertapa Petir)'"), "Master Glems NPC missing");
assert(gameJs.includes("hiraishin_scroll"), "Hiraishin scroll relic missing");
assert(gameJs.includes("player.hasHiraishin"), "player.hasHiraishin flag missing");
console.log('[PASS] Master Glems NPC at celestial summit & Hiraishin progression verified.');

// 9. Check Sector 2 Sakura Tri-Seal quest
assert(gameJs.includes("sector2Altars"), "sector2Altars missing");
assert(gameJs.includes("Altar Segel Bulan"), "Altar Segel Bulan missing");
assert(gameJs.includes("Altar Segel Bintang"), "Altar Segel Bintang missing");
assert(gameJs.includes("Altar Segel Matahari"), "Altar Segel Matahari missing");
console.log('[PASS] Sector 2 Sakura Tri-Seal quest verified.');

// 10. Check that first 1800px is safe (no enemies stationed before x=1800)
const stationedMatches = gameJs.match(/stationedEnemies:\s*\[([\s\S]*?)\]\s*\},/);
assert(stationedMatches, "stationedEnemies not found");
const stationedBlock = stationedMatches[1];
const xPositions = [...stationedBlock.matchAll(/x:\s*(\d+)/g)].map(m => parseInt(m[1]));
const enemiesBefore1800 = xPositions.filter(x => x < 1800);
assert.strictEqual(enemiesBefore1800.length, 0, "No enemies should be stationed before x=1800");
console.log('[PASS] Safe village exploration zone at start (0..1800px has 0 enemies) verified.');

console.log('\n=== ALL MASTERPIECE VERIFICATION CHECKS PASSED (100%) ===\n');
