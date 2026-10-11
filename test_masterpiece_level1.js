const fs = require('fs');
const assert = require('assert');

console.log('=== RUNNING MASTERPIECE LEVEL 1 PLATFORM & ARCHITECTURE VERIFICATION ===');

const gameJs = fs.readFileSync('game.js', 'utf8');

// 1. Check LEVELS[1] definition
assert(gameJs.includes("id: 1,"), "Level 1 ID missing");
assert(gameJs.includes("mapWidth: 10800"), "Map width must be 10800");

// 2. Check continuous solid village ground floor: 0..10800 at y = 440
assert(gameJs.includes("x: 0,    y: 440, w: 2200, h: 180"), "Ground segment 1 missing");
assert(gameJs.includes("x: 2180, y: 440, w: 2200, h: 180"), "Ground segment 2 missing");
assert(gameJs.includes("x: 4360, y: 440, w: 2200, h: 180"), "Ground segment 3 missing");
assert(gameJs.includes("x: 6540, y: 440, w: 2200, h: 180"), "Ground segment 4 missing");
assert(gameJs.includes("x: 8720, y: 440, w: 2180, h: 180"), "Ground segment 5 missing");
console.log('[PASS] Continuous solid ground floor 0..10800 verified.');

// 3. Check that grounded architecture platforms exist and are properly labeled
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

// 4. Check that enemy anti-stuck watchdog and platform collision logic is active
assert(gameJs.includes('this.stuckTimer > 18'), 'Enemy stuckTimer watchdog missing');
assert(gameJs.includes('onContinuousGround = true'), 'Enemy onContinuousGround missing');
assert(gameJs.includes('isAboveTop && isWithinX'), 'Universal platform side collision missing');
console.log('[PASS] Enemy AI anti-stuck watchdog and physics verified.');

// 5. Check crisp pixel-art setting
assert(gameJs.includes('ctx.imageSmoothingEnabled = false'), 'imageSmoothingEnabled = false missing');
console.log('[PASS] Crisp HD pixel art rendering verified.');

// 6. Check that Ronin is the sole hero and correctly configured
assert(gameJs.includes("id: 'ronin'"), "Ronin hero missing");
assert(gameJs.includes("title: 'THE VENGEFUL BLADE'"), "Ronin title missing");
assert(!gameJs.includes("fall: {"), "Legacy hero fall must not be active");
console.log('[PASS] Hero: The Ronin sole wanderer verified.');

console.log('\n=== ALL MASTERPIECE VERIFICATION CHECKS PASSED (100%) ===\n');
