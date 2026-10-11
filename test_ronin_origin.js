const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING THE RONIN & THE ORIGIN VERIFICATION SUITE ===\n');

// 1. Verify Assets on disk
const assets = [
  'bg_misty_woods.jpg',
  'bg_ancient_totem.jpg',
  'bg_ruins_shrine.jpg',
  'tileset_verdant_ruins.jpg'
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

assert(gameJs.includes("id: 'ronin'"), "HEROES.ronin missing");
assert(gameJs.includes("name: 'THE RONIN'"), "HEROES.ronin name is not 'THE RONIN'");
assert(gameJs.includes("title: 'THE VENGEFUL BLADE'"), "HEROES.ronin title is not 'THE VENGEFUL BLADE'");
assert(gameJs.includes("Folded Steel Soul Katana"), "HEROES.ronin weapon not updated");
assert(gameJs.includes("function drawHeroRonin"), "drawHeroRonin function missing");
assert(gameJs.includes("function drawLevel1ForestParallax"), "drawLevel1ForestParallax function missing");
assert(gameJs.includes("drawSeamlessParallaxImage"), "drawSeamlessParallaxImage helper missing");
assert(gameJs.includes("l1BgAssets.mistyWoods"), "mistyWoods asset not bound");
assert(gameJs.includes("l1BgAssets.ancientTotem"), "ancientTotem asset not bound");
assert(gameJs.includes("l1BgAssets.ruinsShrine"), "ruinsShrine asset not bound");
console.log('[PASS] game.js Ronin & Parallax integration verified.');

// 3. Verify index.html contents
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(indexHtml.includes('The Ronin: The Origin'), "index.html title missing 'The Ronin: The Origin'");
assert(indexHtml.includes('THE RONIN'), "index.html HUD hero name is not 'THE RONIN'");
assert(indexHtml.includes('Shadow Dash (i-Frames / Kebal)'), "index.html controls missing 'Shadow Dash'");
console.log('[PASS] index.html Ronin branding verified.');

console.log('\n=== ALL 3 SUITE TESTS PASSED SUCCESSFULLY! ===');
