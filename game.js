// ============================================================================
// CYBER RONIN: SHADOW BLADE // 2D ACTION PLATFORMER ENGINE
// Inspired by Penusbmic's Dark Sci-Fi Samurai, Katana Zero, Dead Cells & Hollow Knight
// Features: Giant White Crescent Slash Smear, Bullet Deflect/Parry, Neon Eye Trail,
// Wall Slide & Wall Jump, Smooth Kinematics & 60FPS Fluid Action
// ============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Fixed internal canvas resolution (16:9 widescreen retro)
const V_WIDTH = 854;
const V_HEIGHT = 480;

// World & Map Boundaries (Dynamic per Level)
let MAP_WIDTH = 5500;
let MAP_HEIGHT = 850;
let currentLevelId = 1;
const unlockedLevels = { 1: true, 2: false };

// Smooth Lookahead Follow Camera
const camera = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  lookAhead: 75,
  update(target) {
    const desiredX = target.x - (V_WIDTH * 0.4) + (target.facing * this.lookAhead);
    this.targetX = Math.max(0, Math.min(MAP_WIDTH - V_WIDTH, desiredX));
    this.x += (this.targetX - this.x) * 0.12;

    const desiredY = Math.max(0, Math.min(MAP_HEIGHT - V_HEIGHT, target.y - (V_HEIGHT * 0.54)));
    this.targetY = desiredY;
    this.y += (this.targetY - this.y) * 0.1;
  },
  reset() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
  }
};

// Game State Enum
const STATES = {
  LOBBY: 'LOBBY',
  CHAR_SELECT: 'CHAR_SELECT',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER'
};

let currentState = STATES.LOBBY;
let score = 0;
let kills = 0;
let screenShake = 0;
let hitStopFrames = 0;

// Input State
const keys = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  fire: false,
  dash: false,
  skill: false
};

// Physics Constants
const GRAVITY = 0.58;
const FRICTION = 0.82;
const MAX_FALL_SPEED = 14;

// Audio Controls
function toggleMute() {
  const isMuted = window.soundEngine.toggleMute();
  const icon = document.getElementById('sound-icon');
  if (icon) icon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
  
  const lobbyIcon = document.getElementById('lobby-audio-icon');
  if (lobbyIcon) lobbyIcon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');

  const lobbyAudioText = document.getElementById('lobby-audio-text');
  if (lobbyAudioText) {
    lobbyAudioText.textContent = isMuted ? 'Audio Dimatikan (Muted)' : 'Synthesizer Audio Aktif (BGM & SFX)';
  }

  if (window.lucide) lucide.createIcons();
}

// ============================================================================
// HEROES DATABASE (6 OPERATIVES: RONIN, FALL, DREGSNOT, STROM, ALPHA, GLEMS)
// ============================================================================
const HEROES = {
  ronin: {
    id: 'ronin',
    name: 'THE RONIN',
    heroName: 'Ronin',
    title: 'THE VENGEFUL BLADE',
    tier: 'HOLLOW SHADOW MASTER',
    tierClass: 'skin-badge-legend',
    role: 'MASTER SWORDSMAN',
    roleClass: 'role-assassin',
    avatar: 'assets/pin_preview.jpg',
    themeColor: '#f8fafc',
    secondaryColor: '#dc2626',
    stats: { damage: 100, speed: 100, range: 85 },
    baseSpeed: 5.6,
    maxHp: 110,
    maxEnergy: 100,
    weapon: 'Folded Steel Soul Katana',
    attackType: 'KATANA_SMEAR',
    hasActiveSkill: false,
    skillName: 'JURUS PEDANG BAYANGAN',
    skillDesc: 'Pendekar tunggal penyintas kehancuran desa. Memiliki 3 ilmu bela diri legendaris: Bullet Deflect (Parry pedang memantulkan peluru), Shadow Dash (melesat tak tersentuh bayangan), dan Soul Vengeance (+3 HP lifesteal per tebasan).',
    passiveDesc: 'Deflect Peluru + i-Frame Shadow Dash + Soul Lifesteal (+3 HP)',
    desc: 'Pendekar pedang bertopi jerami (Kasa) penyintas kehancuran desa leluhur. Mengembara menuntut balas dendam dengan katana baja tempa pusakanya. Menangkis proyektil musuh, melompat pogo di udara layaknya Hollow Knight, dan menyerap jiwa musuh.',
    skins: [
      { id: 'default', name: 'Sumi-e Wanderer (Ink & Silver)', tag: 'ORIGINAL RONIN', tierClass: 'skin-badge-legend', themeColor: '#f8fafc', secondaryColor: '#dc2626' },
      { id: 'crimson', name: 'Vengeful Blood (Crimson Haori)', tag: 'VENGEANCE PATH', tierClass: 'skin-badge-special', themeColor: '#ef4444', secondaryColor: '#facc15' }
    ]
  },
  fall: {
    id: 'fall',
    name: 'FALL',
    heroName: 'Fall',
    title: 'STARFALL GUNSLINGER',
    tier: 'SKIN LEGEND',
    tierClass: 'skin-badge-legend',
    role: 'MARKSMAN',
    roleClass: 'role-marksman',
    avatar: 'granger_reference.png',
    themeColor: '#38bdf8',
    secondaryColor: '#fbbf24',
    stats: { damage: 95, speed: 92, range: 100 },
    baseSpeed: 5.2,
    maxHp: 100,
    maxEnergy: 100,
    weapon: 'Dual Rapid Kinetic Pistols',
    attackType: 'PISTOL_BULLETS',
    hasActiveSkill: true,
    skillName: 'DEADLEST',
    skillCooldownMax: 300, // 5 detik
    skillDesc: 'Active [E]: Menembakkan peluru peledak berat berdaya ledak AoE masif (160 DMG)! Meledak saat mengenai target, tembok, atau habis waktu. Pasif: Basic attack cepat mengurangi CD skill (-0.5s per hit).',
    passiveDesc: 'Rapid Trigger CDR (Attack speed tinggi, setiap hit mengurangi CD Deadlest -0.5s)',
    desc: 'Penembak jitu dengan laju tembak sepasang pistol berkecepatan tinggi (High Attack Speed). Meluncurkan peluru peledak Deadlest berdaya ledak radius besar untuk memusnahkan gerombolan musuh.',
    skins: [
      { id: 'default', name: 'Starfall Gunslinger', tag: 'SKIN LEGEND', tierClass: 'skin-badge-legend', themeColor: '#38bdf8', secondaryColor: '#fbbf24' },
      { id: 'chroma', name: 'Supernova Gold', tag: 'CHROMA SPECIAL', tierClass: 'skin-badge-special', themeColor: '#f59e0b', secondaryColor: '#ffffff' }
    ]
  },
  dregsnot: {
    id: 'dregsnot',
    name: 'DREGSNOT',
    heroName: 'Dregsnot',
    title: 'FIRE DRAKE SLINGER',
    tier: 'SKIN MYTHIC',
    tierClass: 'skin-badge-mythic',
    role: 'GUNSLINGER',
    roleClass: 'role-marksman',
    avatar: 'assets/char_dragon.jpg',
    themeColor: '#f97316',
    secondaryColor: '#ef4444',
    stats: { damage: 94, speed: 80, range: 90 },
    baseSpeed: 4.8,
    maxHp: 105,
    maxEnergy: 100,
    weapon: 'Drake Blasters & Dragon Breath',
    attackType: 'FIRE_BULLETS',
    hasActiveSkill: true,
    skillName: 'DRAGON BREATH',
    skillCooldownMax: 480, // 8 detik
    skillDesc: 'Active [E]: Semburan Naga Api Raksasa ber-AoE masif (radius 75px), menembus musuh, meledak di tembok, dan meninggalkan kobaran api di jalurnya! Pasif: Dash meninggalkan jejak api membakar.',
    passiveDesc: 'Flame Trail Dash & Piercing Dragon Breath AoE',
    desc: 'Koboi futuristik bersenjatakan elemen naga api purba. Meluncurkan semburan Dragon Breath berukuran raksasa yang menembus barisan musuh, meledak dahsyat saat menabrak dinding, dan membakar tanah di jalurnya.',
    skins: [
      { id: 'default', name: 'Shadow Dragon', tag: 'SKIN MYTHIC', tierClass: 'skin-badge-mythic', themeColor: '#f97316', secondaryColor: '#ef4444' },
      { id: 'chroma', name: 'Cyber Gunslinger', tag: 'CHROMA SPECIAL', tierClass: 'skin-badge-special', themeColor: '#c084fc', secondaryColor: '#38bdf8' }
    ]
  },
  strom: {
    id: 'strom',
    name: 'STROM',
    heroName: 'Strom',
    title: 'CODENAME: STORM',
    tier: 'SKIN LEGEND',
    tierClass: 'skin-badge-legend',
    role: 'HYBRID ASSASSIN',
    roleClass: 'role-assassin',
    avatar: 'assets/char_mecha.jpg',
    themeColor: '#eab308',
    secondaryColor: '#a855f7',
    stats: { damage: 94, speed: 98, range: 75 },
    baseSpeed: 5.6,
    maxHp: 95,
    maxEnergy: 100,
    weapon: 'Dual Storm Energy Blades',
    attackType: 'HYBRID_BLADE',
    hasActiveSkill: true,
    skillName: 'SLAYER OF GOLIATH',
    skillCooldownMax: 480, // 8 detik
    skillDesc: 'Active [E]: Menusuk & menerjang menembus musuh dengan kecepatan sonik (110 DMG tusukan), sekaligus melepaskan 3 pedang energi berputar! Membunuh musuh langsung me-reset CD (0s)!',
    passiveDesc: 'Sonic Thrust Dash & 3 Orbiting Energy Blades (Kill resets CD)',
    desc: 'Mecha tempur sonik dengan kombo serangan ganda. Skill Slayer of Goliath menusuk cepat menembus musuh, mengelilingi tubuh dengan 3 bilah pedang energi tajam, dan seketika me-reset cooldown jika menewaskan lawan!',
    skins: [
      { id: 'default', name: 'Codename: Storm', tag: 'SKIN LEGEND', tierClass: 'skin-badge-legend', themeColor: '#eab308', secondaryColor: '#a855f7' },
      { id: 'chroma', name: 'Storm Overdrive', tag: 'CHROMA SPECIAL', tierClass: 'skin-badge-special', themeColor: '#f43f5e', secondaryColor: '#06b6d4' }
    ]
  },
  alpha: {
    id: 'alpha',
    name: 'THE VOID: ALPHA',
    heroName: 'The Void: Alpha',
    title: 'SPECTRAL LANCER',
    tier: 'SKIN LEGEND',
    tierClass: 'skin-badge-legend',
    role: 'FIGHTER / CYBORG',
    roleClass: 'role-fighter',
    avatar: 'assets/char_spectral.jpg',
    themeColor: '#14b8a6',
    secondaryColor: '#f43f5e',
    stats: { damage: 96, speed: 74, range: 85 },
    baseSpeed: 4.6,
    maxHp: 130,
    maxEnergy: 100,
    weapon: 'Void Long Spear & Phantoms',
    attackType: 'VOID_SPEAR',
    hasActiveSkill: true,
    skillName: 'SOUL REVANATION',
    skillCooldownMax: 1200, // 20 detik
    skillDesc: 'Active [E]: Memanggil 2 Roh Hantu pelindung yang terbang menyerang musuh (Hantu punya HP). Pasif: Musuh gugur menjatuhkan Soul (+HP & memperkuat Hantu).',
    passiveDesc: 'Soul Collector (Ambil soul orb untuk +HP & tingkatkan stack soul)',
    desc: 'Ksatria tombak berjangkauan panjang dari dimensi Void. Mengumpulkan jiwa (Soul) dari musuh yang gugur untuk memulihkan darah dan memperkuat 2 Roh Hantu pelindungnya.',
    skins: [
      { id: 'default', name: 'General Void', tag: 'SKIN LEGEND', tierClass: 'skin-badge-legend', themeColor: '#14b8a6', secondaryColor: '#f43f5e' },
      { id: 'chroma', name: 'Crimson Onslaught', tag: 'CHROMA SPECIAL', tierClass: 'skin-badge-special', themeColor: '#ef4444', secondaryColor: '#f1f5f9' }
    ]
  },
  glems: {
    id: 'glems',
    name: 'GLEMS STARFALL',
    heroName: 'Glems Starfall',
    title: 'COSMIC BLADE DANCER',
    tier: 'SKIN LEGEND',
    tierClass: 'skin-badge-legend',
    role: 'ASSASSIN / BLADE',
    roleClass: 'role-ninja',
    avatar: 'assets/char_starblade.jpg',
    themeColor: '#818cf8',
    secondaryColor: '#38bdf8',
    stats: { damage: 88, speed: 95, range: 92 },
    baseSpeed: 5.5,
    maxHp: 90,
    maxEnergy: 100,
    weapon: 'Cosmic Gleam Star-Daggers',
    attackType: 'MAGIC_DAGGERS',
    hasActiveSkill: true,
    skillName: 'STAR DAGGER',
    skillCooldownMax: 360, // 6 detik
    skillDesc: 'Active [E]: Lempar bumerang dagger tembus musuh. Tekan E lagi untuk teleport/dash ke dagger (+Shield & DMG boost 2s)! Pasif: Saat dagger ditangkap, reset CD dash.',
    passiveDesc: 'Catch Recall (Dagger kembali memberi Speed, Shield, dan reset Dash CD)',
    desc: 'Penari belati kosmik berkecepatan tinggi. Melemparkan bumerang Star Dagger dan dapat berteleportasi langsung ke posisi dagger di udara dengan bonus shield dan lonjakan damage!',
    skins: [
      { id: 'default', name: 'Cosmic Gleam', tag: 'SKIN LEGEND', tierClass: 'skin-badge-legend', themeColor: '#818cf8', secondaryColor: '#38bdf8' },
      { id: 'chroma', name: 'Solar Gleam', tag: 'CHROMA SPECIAL', tierClass: 'skin-badge-special', themeColor: '#fbbf24', secondaryColor: '#f43f5e' }
    ]
  }
};

let currentHeroId = 'ronin';
let currentSkinId = 'default';
let selectedHeroInRoster = 'ronin';
let selectedSkinInRoster = 'default';

// ============================================================================
// SPRITE & ASSET MANAGER
// ============================================================================
class SpriteManager {
  constructor() {
    this.isReady = false;
    this.idleFrames = [];
    this.wingsImage = null;
    this.heroImages = {};
  }

  init() {
    let loaded = 0;
    const onGrangerLoad = () => {
      loaded++;
      if (loaded >= 2) this.processGrangerSprites();
    };

    this.rawGuns = new Image();
    this.rawGuns.onload = onGrangerLoad;
    this.rawGuns.onerror = () => { console.warn('Could not load granger_spritesheet_guns.jpg'); };
    this.rawGuns.src = 'granger_spritesheet_guns.jpg';

    this.rawWings = new Image();
    this.rawWings.onload = onGrangerLoad;
    this.rawWings.onerror = () => { console.warn('Could not load granger_spritesheet_wings.jpg'); };
    this.rawWings.src = 'granger_spritesheet_wings.jpg';

    Object.values(HEROES).forEach(hero => {
      const img = new Image();
      img.src = hero.avatar;
      this.heroImages[hero.id] = img;
    });
  }

  processGrangerSprites() {
    try {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 1024;
      offCanvas.height = 449;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(this.rawGuns, 0, 0);

      const imgData = offCtx.getImageData(0, 0, 1024, 449);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const isGridBg = (r > 155 && g > 170 && b > 180 && Math.abs(r - g) < 35 && Math.abs(g - b) < 35);
        const isWhitePaper = (r > 195 && g > 205 && b > 215);
        const isGridLine = (r > 135 && g > 155 && b > 165 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
        if (isGridBg || isWhitePaper || isGridLine) {
          data[i + 3] = 0;
        }
      }
      offCtx.putImageData(imgData, 0, 0);

      const frameCoords = [
        { sx: 285, sy: 140, sw: 105, sh: 185 },
        { sx: 425, sy: 140, sw: 105, sh: 185 },
        { sx: 565, sy: 140, sw: 105, sh: 185 },
        { sx: 705, sy: 140, sw: 105, sh: 185 },
        { sx: 845, sy: 140, sw: 105, sh: 185 }
      ];

      this.idleFrames = frameCoords.map(coord => {
        const fc = document.createElement('canvas');
        fc.width = coord.sw;
        fc.height = coord.sh;
        const fctx = fc.getContext('2d');
        fctx.drawImage(offCanvas, coord.sx, coord.sy, coord.sw, coord.sh, 0, 0, coord.sw, coord.sh);
        return fc;
      });

      const wingCanvas = document.createElement('canvas');
      wingCanvas.width = 1024;
      wingCanvas.height = 449;
      const wingCtx = wingCanvas.getContext('2d');
      wingCtx.drawImage(this.rawWings, 0, 0);

      const wingData = wingCtx.getImageData(0, 0, 1024, 449);
      const wdata = wingData.data;
      for (let i = 0; i < wdata.length; i += 4) {
        const r = wdata[i];
        const g = wdata[i + 1];
        const b = wdata[i + 2];
        const isGridBg = (r > 155 && g > 170 && b > 180 && Math.abs(r - g) < 35 && Math.abs(g - b) < 35);
        const isWhitePaper = (r > 195 && g > 205 && b > 215);
        const isGridLine = (r > 135 && g > 155 && b > 165 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
        if (isGridBg || isWhitePaper || isGridLine) {
          wdata[i + 3] = 0;
        }
      }
      wingCtx.putImageData(wingData, 0, 0);

      const croppedWing = document.createElement('canvas');
      croppedWing.width = 72;
      croppedWing.height = 110;
      const cctx = croppedWing.getContext('2d');
      cctx.drawImage(wingCanvas, 14, 18, 72, 110, 0, 0, 72, 110);
      this.wingsImage = croppedWing;

      this.isReady = true;
    } catch (e) {
      console.warn('Granger sprite sheet process warning:', e);
      this.isReady = false;
    }
  }
}

const spriteManager = new SpriteManager();
spriteManager.init();

// ============================================================================
// PARTICLE SYSTEMS & VISUAL FX
// ============================================================================
const particles = [];
const afterimages = [];
const floatingTexts = [];

class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'square') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.shape = shape;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#fbbf24') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 45;
    this.maxLife = 45;
  }
  update() {
    this.y -= 0.8;
    this.life--;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.font = 'bold 12px "Press Start 2P", monospace';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// Background Twinkling Stars
const stars = [];
for (let i = 0; i < 90; i++) {
  stars.push({
    x: Math.random() * V_WIDTH,
    y: Math.random() * (V_HEIGHT - 60),
    size: Math.random() * 2 + 0.8,
    speed: Math.random() * 0.35 + 0.1,
    color: Math.random() > 0.4 ? '#00f5ff' : '#ffffff'
  });
}

// ============================================================================
// SECTOR DEFINITIONS & CINEMATIC ANNOUNCEMENT SYSTEM
// ============================================================================
const SECTOR_DEFS = [
  { id: 1, name: 'SEKTOR 1: HIGHWAY SIBERNETIK', shortName: 'SEKTOR 1 // HIGHWAY', sub: 'ATAP METROPOLIS NEO-TOKYO & JALUR EVAKUASI', startX: 0, endX: 2800 },
  { id: 2, name: 'SEKTOR 2: KUIL PURBA ELYSIUM', shortName: 'SEKTOR 2 // KUIL PURBA', sub: 'RERUNTUHAN PERADABAN ASTRAL & RUANG RAHASIA', startX: 2800, endX: 5800 },
  { id: 3, name: 'SEKTOR 3: JURANG LAHAR VULKANIK', shortName: 'SEKTOR 3 // LAHAR VULKANIK', sub: 'KORIDOR GEOTHERMAL & PABRIK PELEBURAN INTI', startX: 5800, endX: 8800 },
  { id: 4, name: 'SEKTOR 4: ARENA KOLOSEUM TITAN', shortName: 'SEKTOR 4 // KOLOSEUM TITAN', sub: 'AMFITEATER SIKSAAN & WILAYAH VORTEX GOLIATH', startX: 8800, endX: 11800 },
  { id: 5, name: 'SEKTOR 5: SANCTUM GERBANG ASTRAL', shortName: 'SEKTOR 5 // GERBANG ASTRAL', sub: 'TAHTA KOSMIK & TITIK PERTEMPURAN TERAKHIR', startX: 11800, endX: 15000 }
];

let lastAnnouncedSectorId = 0;
let sectorBannerTimer = null;

function checkSectorTransition(playerX) {
  const currentSec = SECTOR_DEFS.find(s => playerX >= s.startX && playerX <= s.endX) || SECTOR_DEFS[0];

  // Update Top HUD Sector Name
  const hudSectorEl = document.getElementById('hud-sector-name');
  if (hudSectorEl && hudSectorEl.textContent !== currentSec.shortName) {
    hudSectorEl.textContent = currentSec.shortName;
  }

  // Trigger Cinematic Banner on New Sector Entry
  if (currentSec.id !== lastAnnouncedSectorId) {
    lastAnnouncedSectorId = currentSec.id;
    triggerSectorBanner(currentSec);
  }
}

function triggerSectorBanner(sec) {
  const banner = document.getElementById('sector-banner');
  if (!banner) return;
  const titleEl = document.getElementById('sector-banner-title');
  const subEl = document.getElementById('sector-banner-sub');
  if (titleEl) titleEl.textContent = sec.name;
  if (subEl) subEl.textContent = sec.sub;

  banner.classList.remove('hidden');
  banner.style.animation = 'none';
  void banner.offsetHeight; // Force reflow
  banner.style.animation = 'sectorBannerAnim 3.2s cubic-bezier(0.16, 1, 0.3, 1) forwards';

  if (sectorBannerTimer) clearTimeout(sectorBannerTimer);
  sectorBannerTimer = setTimeout(() => {
    banner.classList.add('hidden');
  }, 3200);
}

// Atmospheric Dynamic Multi-Biome Ambient Particles
const ambientParticles = [];
for (let i = 0; i < 75; i++) {
  ambientParticles.push({
    x: Math.random() * (V_WIDTH + 80),
    y: Math.random() * V_HEIGHT,
    vx: -1.2,
    vy: Math.random() * 5 + 6,
    len: Math.random() * 12 + 6,
    speed: Math.random() * 6 + 7,
    size: Math.random() * 2.5 + 1.2,
    color: Math.random() > 0.4 ? 'rgba(0, 245, 255, 0.4)' : 'rgba(255, 255, 255, 0.25)',
    alpha: Math.random() * 0.6 + 0.3,
    pulseOffset: Math.random() * 10
  });
}
const cyberRain = ambientParticles;

// Molten Lava Droplet FX (Sector 3 Magma Caverns)
const lavaDrips = [];
let lavaDripTimer = 0;

// ============================================================================
// EXPANSIVE 15000px 5-SECTOR MAP ARCHITECTURE & ENTITIES
// Sector 1 (0..2800): Neon Rooftop Highway & Mecha Enforcer Plaza
// Sector 2 (2800..5800): Ancient Ruins of Elysium & Underground Catacombs
// Sector 3 (5800..8800): Magma Caverns & Volcanic Foundry
// Sector 4 (8800..11800): The Grand Colosseum of Titans
// Sector 5 (11800..15000): Astral Citadel & Starfall Emperor Throne
// ============================================================================

// Collectible Item System (Heals, Energy, Score)
class Item {
  constructor(x, y, type = 'heal_nano', vx = (Math.random() - 0.5) * 2, vy = -3) {
    this.x = x;
    this.y = y;
    this.type = type; // 'heal_nano', 'heal_mega', 'energy', 'score_chip'
    this.vx = vx;
    this.vy = vy;
    this.w = 18;
    this.h = 18;
    this.life = 700;
    this.collected = false;
    this.bobOffset = Math.random() * 10;
  }
  update() {
    if (this.collected) return;
    this.life--;

    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const ix = this.x + this.w / 2;
    const iy = this.y + this.h / 2;
    const distToPlayer = Math.hypot(px - ix, py - iy);

    // Instant collection on pickup contact
    if (distToPlayer < 32) {
      this.collect();
      return;
    }

    // Smooth bounded magnet pull toward player (no slingshotting or bouncing away)
    if (distToPlayer < 100) {
      const angle = Math.atan2(py - iy, px - ix);
      const pullSpeed = Math.min(8.5, Math.max(4.0, (100 - distToPlayer) * 0.1));
      this.vx = Math.cos(angle) * pullSpeed;
      this.vy = Math.sin(angle) * pullSpeed;
    } else {
      this.vy += 0.24;
      this.vx *= 0.96;
    }

    this.x += this.vx;
    this.y += this.vy;

    platforms.forEach(p => {
      if (this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 14) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.vx *= 0.78;
      }
    });
  }

  collect() {
    if (this.collected) return;
    this.collected = true;
    this.life = 0;

    if (this.type === 'heal_nano') {
      player.hp = Math.min(player.maxHp, player.hp + 35);
      floatingTexts.push(new FloatingText(player.x + 10, player.y - 20, '+35 HP', '#22c55e'));
      window.soundEngine.playPowerup();
    } else if (this.type === 'heal_mega') {
      player.hp = Math.min(player.maxHp, player.hp + 75);
      floatingTexts.push(new FloatingText(player.x + 10, player.y - 20, '+75 HP MEGA HEAL!', '#10b981'));
      window.soundEngine.playPowerup();
    } else if (this.type === 'energy') {
      player.energy = Math.min(player.maxEnergy, player.energy + 50);
      floatingTexts.push(new FloatingText(player.x + 10, player.y - 20, '+50 STAMINA', '#00f5ff'));
      window.soundEngine.playPowerup();
    } else if (this.type === 'score_chip') {
      score += 500;
      floatingTexts.push(new FloatingText(player.x + 10, player.y - 20, '+500 PTS', '#fbbf24'));
      window.soundEngine.playCharSelect();
    }
    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(this.x + 9, this.y + 9, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, this.type.includes('heal') ? '#22c55e' : '#00f5ff', 3, 18));
    }
  }

  draw(ctx) {
    if (this.collected) return;
    if (this.life < 100 && Math.floor(this.life / 6) % 2 === 0) return;
    const bob = Math.sin(Date.now() / 150 + this.bobOffset) * 3;
    ctx.save();
    ctx.translate(this.x + 9, this.y + 9 + bob);

    if (this.type === 'heal_nano') {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-8, -8, 16, 16, [4]);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);
    } else if (this.type === 'heal_mega') {
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.roundRect(-9, -10, 18, 20, [5]);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);
    } else if (this.type === 'energy') {
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(-7, -8, 14, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-3, -11, 6, 3);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.moveTo(1, -5); ctx.lineTo(-4, 0); ctx.lineTo(0, 0);
      ctx.lineTo(-1, 5); ctx.lineTo(4, 0); ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -4, 8, 8);
    }
    ctx.restore();
  }
}

// Breakable Supply Crates
class SupplyCrate {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.hp = 2;
    this.maxHp = 2;
    this.isBroken = false;
    this.flashTimer = 0;
  }
  takeDamage(amt) {
    if (this.isBroken) return;
    this.hp -= amt;
    this.flashTimer = 8;
    window.soundEngine.playHit();
    if (this.hp <= 0) {
      this.isBroken = true;
      window.soundEngine.playExplosion();
      for (let i = 0; i < 12; i++) {
        particles.push(new Particle(this.x + 16, this.y + 16, (Math.random() - 0.5) * 6, -Math.random() * 5, '#f59e0b', 3, 20));
      }
      items.push(new Item(this.x + 8, this.y + 4, Math.random() > 0.4 ? 'heal_nano' : 'heal_mega', -1.5, -3.5));
      items.push(new Item(this.x + 16, this.y + 4, Math.random() > 0.5 ? 'energy' : 'score_chip', 1.5, -3.5));
    }
  }
  draw(ctx) {
    if (this.isBroken) return;
    ctx.save();
    if (this.flashTimer > 0) {
      this.flashTimer--;
      ctx.filter = 'brightness(2.2)';
    }
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(this.x + 4, this.y + 4, 8, 6);
    ctx.fillRect(this.x + 20, this.y + 4, 8, 6);
    ctx.fillRect(this.x + 4, this.y + 22, 8, 6);
    ctx.fillRect(this.x + 20, this.y + 22, 8, 6);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(this.x + 13, this.y + 10, 6, 12);
    ctx.fillRect(this.x + 10, this.y + 13, 12, 6);
    ctx.restore();
  }
}

// Environmental Traps & Hazards
class Trap {
  constructor(x, y, w, h, type) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type; // 'laser_gate', 'crumble', 'falling_stalactite', 'fire_vent'
    this.timer = Math.floor(Math.random() * 50);
    this.active = true;
    this.state = 'idle';
    this.initialY = y;
    this.vy = 0;
  }
  update() {
    this.timer++;

    if (this.type === 'laser_gate') {
      const cycle = this.timer % 200;
      this.active = cycle < 120;
      if (this.active && !player.isInvulnerable) {
        if (player.x + player.w > this.x && player.x < this.x + this.w &&
            player.y + player.h > this.y && player.y < this.y + this.h) {
          player.hp = Math.max(0, player.hp - 16);
          player.isInvulnerable = true;
          player.invulnTimer = 45;
          player.vx = player.x < this.x ? -6 : 6;
          screenShake = 8;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(player.x, player.y - 15, '-16 HP (LASER GATE)', '#ef4444'));
        }
      }

    } else if (this.type === 'crumble') {
      if (this.state === 'idle') {
        if (player.x + player.w > this.x && player.x < this.x + this.w &&
            player.y + player.h >= this.y && player.y + player.h <= this.y + 14 && player.vy >= 0) {
          this.state = 'shaking';
          this.timer = 0;
        }
      } else if (this.state === 'shaking') {
        if (this.timer % 6 === 0) {
          particles.push(new Particle(this.x + Math.random() * this.w, this.y + this.h, 0, 2, '#78716c', 2.5, 15));
        }
        if (this.timer > 40) {
          this.state = 'fallen';
          this.active = false;
          this.timer = 0;
        }
      } else if (this.state === 'fallen') {
        if (this.timer > 180) {
          this.state = 'idle';
          this.active = true;
          this.timer = 0;
        }
      }

    } else if (this.type === 'falling_stalactite') {
      if (this.state === 'idle') {
        if (Math.abs((player.x + player.w / 2) - (this.x + this.w / 2)) < 80 && player.y > this.y && player.y < this.y + 450) {
          this.state = 'warning';
          this.timer = 0;
        }
      } else if (this.state === 'warning') {
        if (this.timer > 22) {
          this.state = 'falling';
        }
      } else if (this.state === 'falling') {
        this.vy += 0.45;
        this.y += this.vy;
        if (!player.isInvulnerable &&
            player.x + player.w > this.x && player.x < this.x + this.w &&
            player.y + player.h > this.y && player.y < this.y + this.h) {
          player.hp = Math.max(0, player.hp - 20);
          player.isInvulnerable = true;
          player.invulnTimer = 45;
          screenShake = 10;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(player.x, player.y - 15, '-20 HP (STALACTITE)', '#ef4444'));
          this.shatter();
        }
        if (this.y > 700) {
          this.shatter();
        }
      } else if (this.state === 'shattered') {
        if (this.timer > 300) {
          this.y = this.initialY;
          this.vy = 0;
          this.state = 'idle';
          this.timer = 0;
        }
      }

    } else if (this.type === 'fire_vent') {
      const cycle = this.timer % 230;
      if (cycle > 80 && cycle < 130) {
        if (!player.isInvulnerable &&
            player.x + player.w > this.x && player.x < this.x + this.w &&
            player.y + player.h > this.y - 90 && player.y < this.y) {
          player.hp = Math.max(0, player.hp - 18);
          player.isInvulnerable = true;
          player.invulnTimer = 45;
          player.vy = -6;
          screenShake = 8;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(player.x, player.y - 15, '-18 HP (FIRE VENT)', '#f97316'));
        }
      }

    } else if (this.type === 'poison_brambles') {
      if (!player.isInvulnerable &&
          player.x + player.w > this.x && player.x < this.x + this.w &&
          player.y + player.h >= this.y && player.y < this.y + this.h + 20) {
        player.hp = Math.max(0, player.hp - 16);
        player.isInvulnerable = true;
        player.invulnTimer = 45;
        player.vy = -7.2;
        screenShake = 8;
        window.soundEngine.playHit();
        floatingTexts.push(new FloatingText(player.x, player.y - 15, '-16 HP (POISON BRAMBLE)', '#a855f7'));
        for (let i = 0; i < 10; i++) {
          particles.push(new Particle(player.x + player.w / 2, this.y, (Math.random() - 0.5) * 5, -Math.random() * 4, '#a855f7', 3, 20));
        }
      }

    } else if (this.type === 'spore_pod') {
      const cycle = this.timer % 180;
      if (cycle === 130) {
        this.state = 'warning';
      } else if (cycle === 160) {
        this.state = 'bursting';
        window.soundEngine.playFireBlast();
        for (let i = 0; i < 16; i++) {
          particles.push(new Particle(this.x + this.w / 2, this.y, (Math.random() - 0.5) * 6, -Math.random() * 5, '#84cc16', 3.5, 25));
        }
        if (!player.isInvulnerable && Math.hypot((player.x + player.w / 2) - (this.x + this.w / 2), (player.y + player.h / 2) - this.y) < 60) {
          player.hp = Math.max(0, player.hp - 18);
          player.isInvulnerable = true;
          player.invulnTimer = 45;
          player.vx = player.x < this.x ? -5 : 5;
          screenShake = 8;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(player.x, player.y - 15, '-18 HP (SPORE BURST)', '#84cc16'));
        }
      } else if (cycle > 175) {
        this.state = 'idle';
      }
    }
  }

  shatter() {
    this.state = 'shattered';
    this.timer = 0;
    window.soundEngine.playExplosion();
    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(this.x + this.w / 2, this.y + this.h, (Math.random() - 0.5) * 6, -Math.random() * 4, '#78716c', 3, 20));
    }
  }

  draw(ctx) {
    if (this.type === 'laser_gate') {
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(this.x - 4, this.y, this.w + 8, 8);
      ctx.fillRect(this.x - 4, this.y + this.h - 8, this.w + 8, 8);
      ctx.strokeStyle = this.active ? '#ef4444' : '#64748b';
      ctx.strokeRect(this.x - 4, this.y, this.w + 8, 8);
      ctx.strokeRect(this.x - 4, this.y + this.h - 8, this.w + 8, 8);

      if (this.active) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.fillRect(this.x + 2, this.y + 8, this.w - 4, this.h - 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + this.w / 2 - 1.5, this.y + 8, 3, this.h - 16);
      } else {
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(this.x + this.w / 2, this.y + 8);
        ctx.lineTo(this.x + this.w / 2, this.y + this.h - 8);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

    } else if (this.type === 'crumble') {
      if (this.state === 'fallen') return;
      ctx.save();
      let shakeX = 0;
      if (this.state === 'shaking') {
        shakeX = (Math.random() - 0.5) * 4;
      }
      ctx.translate(shakeX, 0);
      ctx.fillStyle = '#44403c';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(this.x + 6, this.y + 2);
      ctx.lineTo(this.x + this.w / 2, this.y + this.h - 2);
      ctx.lineTo(this.x + this.w - 6, this.y + 3);
      ctx.stroke();
      ctx.restore();

    } else if (this.type === 'falling_stalactite') {
      if (this.state === 'shattered') return;
      ctx.save();
      let shakeX = 0;
      if (this.state === 'warning') {
        shakeX = (Math.random() - 0.5) * 3;
      }
      ctx.translate(this.x + this.w / 2 + shakeX, this.y);
      ctx.fillStyle = '#292524';
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-this.w / 2, 0);
      ctx.lineTo(0, this.h);
      ctx.lineTo(this.w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

    } else if (this.type === 'fire_vent') {
      ctx.save();
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x, this.y, this.w, this.h);

      const cycle = this.timer % 230;
      if (cycle > 80 && cycle < 130) {
        const flameH = 90 + Math.sin(Date.now() / 60) * 15;
        const flameGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y - flameH);
        flameGrad.addColorStop(0, '#fef08a');
        flameGrad.addColorStop(0.3, '#f97316');
        flameGrad.addColorStop(0.8, '#ef4444');
        flameGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flameGrad;
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 18;
        ctx.fillRect(this.x + 3, this.y - flameH, this.w - 6, flameH);
      } else if (cycle > 50 && cycle <= 80) {
        ctx.fillStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.fillRect(this.x + 4, this.y - 12, this.w - 8, 12);
      }
      ctx.restore();

    } else if (this.type === 'poison_brambles') {
      ctx.save();
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      for (let bx = this.x + 8; bx < this.x + this.w - 6; bx += 16) {
        ctx.beginPath();
        ctx.moveTo(bx - 6, this.y + this.h);
        ctx.lineTo(bx, this.y - 6);
        ctx.lineTo(bx + 6, this.y + this.h);
        ctx.stroke();
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(bx - 1.5, this.y - 8, 3, 3);
      }
      ctx.restore();

    } else if (this.type === 'spore_pod') {
      ctx.save();
      const scaleY = this.state === 'warning' ? 1.25 : 1.0;
      ctx.translate(this.x + this.w / 2, this.y + this.h);
      ctx.scale(1, scaleY);
      ctx.fillStyle = this.state === 'warning' ? '#f59e0b' : '#15803d';
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(-3, -12, 3, 0, Math.PI * 2);
      ctx.arc(4, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// Active Level Entities & Dynamic Level Controller
const items = [];
const crates = [];
const traps = [];
const platforms = [];
const breakableWalls = [];
const relics = [];
const loreTablets = [];
const checkpoints = [];
let activeCheckpoint = null;

// Arena Gates & Boss Lockdown Barriers
const arenaGates = {
  left: { x: 10400, y: 260, w: 24, h: 260, active: false },
  right: { x: 11580, y: 260, w: 24, h: 260, active: false },
  citadelLeft: { x: 13400, y: 260, w: 24, h: 260, active: false },
  citadelRight: { x: 14730, y: 260, w: 24, h: 260, active: false }
};

const levelBarriers = {
  miniBossLeft: { x: 2560, y: 240, w: 26, h: 260, active: false, type: 'bramble' },
  miniBossRight: { x: 3210, y: 240, w: 26, h: 260, active: false, type: 'bramble' },
  bossLeft: { x: 4460, y: 230, w: 28, h: 280, active: false, type: 'abyssal_spire' },
  bossRight: { x: 5350, y: 230, w: 28, h: 280, active: false, type: 'abyssal_spire' }
};

let isArenaLocked = false;
let isCitadelLocked = false;
let isBossDefeated = false;
let defeatedBosses = {
  treant: false,
  chimera: false,
  mech: false,
  colossus: false,
  drake: false,
  goliath: false,
  xenos: false
};
let activeBossEnemy = null;
let activeLoreTabletNear = null;

const goalPortal = {
  x: 5410,
  y: 420,
  w: 64,
  h: 90,
  active: true
};

// ============================================================================
// MODULAR LEVEL DATABASE
// ============================================================================
const LEVELS = {
  1: {
    id: 1,
    name: 'LEVEL 1 // THE ORIGIN',
    title: 'RUINS OF VERDANT GLADE',
    subtitle: 'DESA LEMBAH SUCI YANG HANCUR // INVESTIGASI MAHLUK ANEH',
    mapWidth: 5500,
    mapHeight: 850,
    playerStart: { x: 120, y: 350 },
    goalPortal: { x: 5410, y: 420, w: 64, h: 90, active: true },
    platforms: [
      // AREA 1: GERBANG DESA & RERUNTUHAN RUMAH (0 .. 1120)
      { x: 0, y: 490, w: 200, h: 140, type: 'forest_stone', label: 'VILLAGE ENTRANCE L' },
      { x: 200, y: 530, w: 140, h: 100, type: 'forest_stone', label: 'SUNKEN TRENCH' },
      { x: 340, y: 470, w: 420, h: 160, type: 'forest_stone', label: 'RUINED STONE MOUND' },
      { x: 480, y: 390, w: 90, h: 80, type: 'forest_stone', label: 'STONE ARCH TOWER' },
      { x: 780, y: 410, w: 180, h: 20, type: 'wooden_ruins', label: 'JEMBATAN KAYU' },
      { x: 1000, y: 340, w: 140, h: 20, type: 'forest_stone', label: 'TEBING GERBANG' },
      { x: 860, y: 240, w: 160, h: 18, type: 'wooden_ruins', label: 'ATAP RUMAH' },

      // JURANG 1: LEMBAH JURANG KELAM & JEMBATAN TALI / LIFT KATROL (1140 .. 1800)
      // Bottom is empty abyss (no ground floor). Falling = abyss damage!
      { x: 1160, y: 440, w: 220, h: 18, type: 'rope_bridge', label: 'JEMBATAN TALI JURANG 1' },
      { x: 1400, y: 220, w: 24, h: 250, type: 'hanging_rope', label: 'SULUR GANTUNG 1' },
      { x: 1440, y: 330, w: 140, h: 20, type: 'wooden_ruins', label: 'BALOK TEBING' },
      { x: 1460, y: 470, w: 100, h: 20, type: 'moving_lift', minY: 320, maxY: 560, speedY: 1.6, dirY: 1, vx: 0, vy: 0, label: 'LIFT KATROL KAYU' },
      { x: 1580, y: 200, w: 24, h: 270, type: 'hanging_rope', label: 'SULUR GANTUNG 2' },
      { x: 1600, y: 430, w: 200, h: 18, type: 'rope_bridge', label: 'JEMBATAN TALI JURANG 2' },

      // AREA 2: GUA LEMBAH BERLUMUT & JURANG AIR TERJUN (1800 .. 2560)
      { x: 1800, y: 490, w: 140, h: 100, type: 'forest_stone', label: 'TEBING GUA' },
      { x: 1940, y: 520, w: 120, h: 100, type: 'forest_stone', label: 'SUNKEN GROTTO' },
      { x: 1900, y: 370, w: 160, h: 20, type: 'wooden_ruins', label: 'BALOK GUA ATAS' },
      { x: 2060, y: 490, w: 120, h: 18, type: 'crumble', label: 'PAPAN RETAK' },
      { x: 2180, y: 440, w: 160, h: 80, type: 'forest_stone', label: 'SANCTUARY CHECKPOINT 2' },

      // JURANG 2: JURANG AIR TERJUN & RAKIT PENYEBERANGAN (2340 .. 2560)
      // Bottomless chasm crossed by horizontal raft lift and hanging rope!
      { x: 2360, y: 460, w: 110, h: 20, type: 'moving_lift', minX: 2350, maxX: 2530, speedX: 2.0, dirX: 1, vx: 0, vy: 0, label: 'RAKIT PENYEBERANGAN' },
      { x: 2450, y: 220, w: 24, h: 250, type: 'hanging_rope', label: 'TALI GANTUNG JURANG' },

      // AREA 3: KUIL SUCI PURBA & ARENA MINI-BOSS (2560 .. 3240)
      // Solid unbroken floor across 2560..3240 so Behemoth mini-boss never falls!
      { x: 2560, y: 500, w: 680, h: 110, type: 'forest_stone', label: 'SACRED SHRINE ARENA' },
      { x: 2680, y: 380, w: 130, h: 18, type: 'wooden_ruins' },
      { x: 2950, y: 380, w: 130, h: 18, type: 'wooden_ruins' },

      // JURANG 3: JURANG KANOPI POHON PURBA & LIFT KANOPI (3240 .. 4460)
      { x: 3240, y: 490, w: 180, h: 90, type: 'forest_stone', label: 'TEBING KELUAR KUIL' },
      { x: 3440, y: 150, w: 42, h: 420, type: 'ruin_wall', label: 'POHON BERINGIN PURBA' },
      { x: 3480, y: 490, w: 180, h: 80, type: 'forest_stone', label: 'SANCTUARY CHECKPOINT 3' },
      { x: 3500, y: 410, w: 180, h: 22, type: 'canopy_branch', label: 'DAHAN KANOPI 1' },
      { x: 3700, y: 310, w: 220, h: 24, type: 'canopy_branch', label: 'DAHAN KANOPI 2' },
      { x: 3540, y: 270, w: 180, h: 18, type: 'rope_bridge', label: 'JEMBATAN GANTUNG KANOPI' },
      { x: 3660, y: 160, w: 24, h: 260, type: 'hanging_rope', label: 'SULUR BERINGIN 1' },
      { x: 3940, y: 140, w: 24, h: 240, type: 'hanging_rope', label: 'SULUR BERINGIN 2' },
      { x: 3980, y: 240, w: 200, h: 22, type: 'wooden_ruins', label: 'GUDANG KANOPI' },
      { x: 4160, y: 210, w: 24, h: 260, type: 'hanging_rope', label: 'SULUR BERINGIN 3' },
      { x: 4200, y: 420, w: 110, h: 20, type: 'moving_lift', minY: 250, maxY: 480, speedY: 1.8, dirY: -1, vx: 0, vy: 0, label: 'LIFT KANOPI PURBA' },
      { x: 4330, y: 500, w: 140, h: 80, type: 'forest_stone', label: 'TEBING GERBANG BOS' },

      // AREA 5: JANTUNG DESA & TAHTA THE BLIGHT CHIMERA (4460 .. 5500)
      // Solid unbroken floor across 4460..5500 so Blight Chimera boss never falls!
      { x: 4460, y: 510, w: 920, h: 120, type: 'forest_stone', label: 'VILLAGE CORE ARENA' },
      { x: 4620, y: 380, w: 150, h: 20, type: 'canopy_branch' },
      { x: 4850, y: 310, w: 180, h: 20, type: 'wooden_ruins', label: 'ALTAR DESA' },
      { x: 5090, y: 380, w: 150, h: 20, type: 'canopy_branch' },
      { x: 5380, y: 510, w: 120, h: 120, type: 'forest_stone', label: 'EXTRACTION SANCTUARY' }
    ],
    traps: [
      { x: 2060, y: 490, w: 120, h: 18, type: 'crumble' },
      { x: 1840, y: 475, w: 32, h: 18, type: 'spore_pod' },
      { x: 3740, y: 295, w: 32, h: 18, type: 'spore_pod' }
    ],
    crates: [
      { x: 920, y: 360 },
      { x: 1040, y: 290 },
      { x: 1860, y: 440 },
      { x: 2720, y: 330 },
      { x: 3020, y: 330 },
      { x: 4020, y: 190 }
    ],
    checkpoints: [
      { id: 1, x: 180, y: 420, name: 'GERBANG DESA ASAL', reached: true, lastHealTime: 0 },
      { id: 2, x: 2220, y: 370, name: 'GUA LEMBAH BERLUMUT', reached: false, lastHealTime: 0 },
      { id: 3, x: 3520, y: 420, name: 'KANOPI POHON PURBA', reached: false, lastHealTime: 0 }
    ],
    loreTablets: [
      {
        id: 1,
        x: 620,
        y: 430,
        title: 'ARSIP 01: TRAGEDI LEMBAH SUCI',
        sector: 'AREA 1 // GERBANG DESA ASAL',
        content: `Dahulu desa ini adalah pemukiman damai yang hidup berdampingan dengan alam purba. Hingga suatu malam, langit robek dan makhluk bayangan aneh jatuh menghantam kuil pusat.

Dalam hitungan jam, spora kegelapan mengubah flora dan fauna menjadi monster buas, membakar desa hingga menjadi abu. Agen Ronin, selidiki reruntuhan ini dan temukan entitas pembawa petaka!`
      },
      {
        id: 2,
        x: 3320,
        y: 430,
        title: 'ARSIP 02: PENJAGA YANG TERKUTUK',
        sector: 'AREA 3 // KUIL SUCI PURBA',
        content: `Blight Fang Behemoth dulunya adalah binatang pelindung desa yang disucikan oleh para tetua.

Ketika spora The Blight Chimera menyusup ke jantung desa, binatang pelindung ini menjadi gila dan bermutasi menjadi monster bertanduk kayu beracun. Dia mengunci kuil suci dengan dinding akar berduri raksasa.`
      },
      {
        id: 3,
        x: 4320,
        y: 430,
        title: 'ARSIP 03: ENTITAS UTAMA (THE BLIGHT CHIMERA)',
        sector: 'AREA 4 // KANOPI POHON PURBA',
        content: `Catatan tetua desa terakhir:
"Makhluk aneh itu... dia bersarang di jantung beringin raksasa desa kami. Tubuhnya dipenuhi mata ungu kehampaan dan akar parasit.

Kalahkan The Blight Chimera untuk membebaskan tanah leluhur ini dari infeksi parasit, dan aktifkan gerbang ekstraksi pulang!"`
      }
    ],
    relics: [
      { id: 1, x: 1980, y: 320, type: 'hp_core', name: 'Amulet Suci Desa (+50 HP)', collected: false },
      { id: 2, x: 4120, y: 190, type: 'energy_core', name: 'Kristal Spora Purba (+100 Energy)', collected: false }
    ],
    breakableWalls: [
      { x: 1960, y: 370, w: 32, h: 120, hp: 3, maxHp: 3, isBroken: false, flashTimer: 0 }
    ],
    stationedEnemies: [
      { x: 460, y: 390, type: 'bramble_drone' },
      { x: 620, y: 410, type: 'blight_hound' },
      { x: 1050, y: 260, type: 'spore_spitter' },
      { x: 1300, y: 380, type: 'bramble_drone' },
      { x: 1880, y: 410, type: 'blight_hound' },
      { x: 1960, y: 290, type: 'wood_stalker' },
      { x: 2260, y: 360, type: 'spore_spitter' },
      { x: 2420, y: 320, type: 'bramble_drone' },
      { x: 3540, y: 330, type: 'wood_stalker' },
      { x: 3780, y: 230, type: 'spore_spitter' },
      { x: 4050, y: 160, type: 'wood_stalker' },
      { x: 4260, y: 300, type: 'bramble_drone' },
      { x: 4360, y: 420, type: 'blight_hound' }
    ]
  },
  2: {
    id: 2,
    name: 'LEVEL 2 // MEGAPOLIS & ASTRAL CITADEL',
    title: 'THE 5-SECTOR EXPEDITION',
    subtitle: 'CYBER HIGHWAY // KUIL ELYSIUM // GUA MAGMA // KOLOSEUM // TAHTA XENOS',
    mapWidth: 15000,
    mapHeight: 800,
    playerStart: { x: 120, y: 330 },
    goalPortal: { x: 14880, y: 390, w: 64, h: 90, active: true },
    platforms: [
      // Sector 1: Cyber Highway (0 .. 2800)
      { x: 0, y: 470, w: 720, h: 120, type: 'ground', label: 'SECTOR-1 START' },
      { x: 740, y: 390, w: 180, h: 18, type: 'metal' },
      { x: 960, y: 320, w: 180, h: 18, type: 'metal' },
      { x: 1180, y: 240, w: 180, h: 18, type: 'metal' },
      { x: 800, y: 580, w: 750, h: 90, type: 'ground', label: 'LOWER TUNNEL' },
      { x: 1550, y: 280, w: 32, h: 360, type: 'wall' },
      { x: 1600, y: 480, w: 520, h: 100, type: 'ground' },
      { x: 1750, y: 370, w: 200, h: 18, type: 'metal' },
      { x: 1980, y: 290, w: 200, h: 18, type: 'metal' },
      { x: 2150, y: 480, w: 700, h: 110, type: 'ground', label: 'MECH ARENA' },

      // Sector 2: Ancient Ruins of Elysium (2800 .. 5800)
      { x: 2880, y: 470, w: 380, h: 90, type: 'ruin_ground', label: 'RUINS ENTRANCE' },
      { x: 3280, y: 150, w: 36, h: 360, type: 'ruin_wall', label: 'RUINS SHAFT L' },
      { x: 3440, y: 200, w: 36, h: 310, type: 'ruin_wall', label: 'RUINS SHAFT R' },
      { x: 3260, y: 510, w: 240, h: 80, type: 'ruin_ground' },
      { x: 3280, y: 150, w: 320, h: 22, type: 'ruin_stone' },
      { x: 3620, y: 230, w: 220, h: 20, type: 'ruin_stone' },
      { x: 3860, y: 310, w: 200, h: 20, type: 'ruin_stone' },
      { x: 3700, y: 470, w: 180, h: 90, type: 'ruin_ground' },
      { x: 3500, y: 670, w: 200, h: 30, type: 'hazard_spikes', label: 'VOID SPIKES' },
      { x: 3780, y: 600, w: 460, h: 80, type: 'ruin_ground', label: 'SECRET RUINS CHAMBER' },
      { x: 4240, y: 420, w: 34, h: 260, type: 'ruin_wall' },
      { x: 4300, y: 670, w: 240, h: 30, type: 'hazard_spikes', label: 'VOID SPIKES' },
      { x: 4100, y: 370, w: 220, h: 20, type: 'ruin_stone' },
      { x: 4350, y: 280, w: 220, h: 20, type: 'ruin_stone' },
      { x: 4600, y: 360, w: 220, h: 20, type: 'ruin_stone' },
      { x: 4850, y: 480, w: 900, h: 110, type: 'ruin_ground', label: 'COLOSSUS COURTYARD' },
      { x: 5050, y: 360, w: 160, h: 18, type: 'ruin_stone' },
      { x: 5450, y: 360, w: 160, h: 18, type: 'ruin_stone' },

      // Sector 3: Magma Caverns & Volcanic Foundry (5800 .. 8800)
      { x: 5800, y: 480, w: 380, h: 100, type: 'magma_ground', label: 'MAGMA ENTRANCE' },
      { x: 6180, y: 670, w: 340, h: 30, type: 'hazard_lava', label: 'LAVA PIT' },
      { x: 6200, y: 400, w: 200, h: 18, type: 'metal' },
      { x: 6420, y: 310, w: 180, h: 18, type: 'metal' },
      { x: 6620, y: 480, w: 420, h: 90, type: 'magma_ground', label: 'FOUNDRY DECK' },
      { x: 7080, y: 120, w: 34, h: 360, type: 'wall', label: 'SMOKESTACK L' },
      { x: 7240, y: 120, w: 34, h: 260, type: 'wall', label: 'SMOKESTACK R' },
      { x: 7060, y: 480, w: 220, h: 90, type: 'magma_ground' },
      { x: 7280, y: 140, w: 320, h: 22, type: 'magma_ground', label: 'SECRET GROTTO' },
      { x: 7600, y: 60, w: 32, h: 180, type: 'wall' },
      { x: 7300, y: 670, w: 400, h: 30, type: 'hazard_lava', label: 'LAVA PIT' },
      { x: 7320, y: 390, w: 240, h: 18, type: 'metal' },
      { x: 7580, y: 470, w: 300, h: 90, type: 'magma_ground' },
      { x: 7900, y: 370, w: 200, h: 18, type: 'metal' },
      { x: 8120, y: 490, w: 750, h: 110, type: 'magma_ground', label: 'CALDERA RIDGE' },
      { x: 8300, y: 360, w: 150, h: 18, type: 'magma_ground' },
      { x: 8600, y: 360, w: 150, h: 18, type: 'magma_ground' },

      // Sector 4: The Grand Colosseum of Titans (8800 .. 11800)
      { x: 8900, y: 490, w: 350, h: 100, type: 'ground', label: 'COLOSSEUM ANTECHAMBER' },
      { x: 9280, y: 410, w: 180, h: 18, type: 'ruin_stone' },
      { x: 9500, y: 320, w: 200, h: 18, type: 'ruin_stone' },
      { x: 9740, y: 240, w: 200, h: 18, type: 'ruin_stone' },
      { x: 9980, y: 330, w: 200, h: 18, type: 'ruin_stone' },
      { x: 9400, y: 500, w: 800, h: 90, type: 'ground' },
      { x: 10220, y: 670, w: 160, h: 30, type: 'hazard_spikes', label: 'VOID SPIKES' },
      { x: 10400, y: 510, w: 1200, h: 120, type: 'arena_ground', label: 'COLOSSEUM ARENA' },
      { x: 10600, y: 390, w: 140, h: 18, type: 'ruin_stone' },
      { x: 10880, y: 320, w: 220, h: 18, type: 'ruin_stone' },
      { x: 11240, y: 390, w: 140, h: 18, type: 'ruin_stone' },
      { x: 11620, y: 490, w: 250, h: 100, type: 'ground' },

      // Sector 5: Astral Citadel & Celestial Throne (11800 .. 15000)
      { x: 11900, y: 490, w: 420, h: 100, type: 'ground', label: 'ASTRAL LIGHT BRIDGE' },
      { x: 12350, y: 410, w: 180, h: 18, type: 'metal' },
      { x: 12560, y: 320, w: 180, h: 18, type: 'metal' },
      { x: 12770, y: 240, w: 200, h: 18, type: 'metal' },
      { x: 13000, y: 330, w: 180, h: 18, type: 'metal' },
      { x: 12400, y: 500, w: 850, h: 90, type: 'ground' },
      { x: 13400, y: 510, w: 1350, h: 120, type: 'arena_ground', label: 'CELESTIAL THRONE' },
      { x: 13650, y: 390, w: 160, h: 18, type: 'metal' },
      { x: 13950, y: 310, w: 240, h: 18, type: 'metal' },
      { x: 14320, y: 390, w: 160, h: 18, type: 'metal' },
      { x: 14780, y: 490, w: 320, h: 110, type: 'ground', label: 'VICTORY PLATFORM' }
    ],
    traps: [
      { x: 1720, y: 360, w: 14, h: 120, type: 'laser_gate' },
      { x: 3650, y: 130, w: 22, h: 34, type: 'falling_stalactite' },
      { x: 4400, y: 140, w: 22, h: 34, type: 'falling_stalactite' },
      { x: 4580, y: 360, w: 90, h: 18, type: 'crumble' },
      { x: 6750, y: 480, w: 34, h: 12, type: 'fire_vent' },
      { x: 7650, y: 470, w: 34, h: 12, type: 'fire_vent' },
      { x: 9800, y: 330, w: 14, h: 140, type: 'laser_gate' },
      { x: 12900, y: 330, w: 14, h: 150, type: 'laser_gate' }
    ],
    crates: [
      { x: 920, y: 430 },
      { x: 1850, y: 330 },
      { x: 3400, y: 110 },
      { x: 4000, y: 560 },
      { x: 6800, y: 440 },
      { x: 7450, y: 100 },
      { x: 9650, y: 280 },
      { x: 10700, y: 350 },
      { x: 12600, y: 280 },
      { x: 13800, y: 350 }
    ],
    checkpoints: [
      { id: 1, x: 160, y: 400, name: 'SEKTOR 1 // HIGHWAY', reached: true, lastHealTime: 0 },
      { id: 2, x: 3100, y: 390, name: 'SEKTOR 2 // KUIL PURBA', reached: false, lastHealTime: 0 },
      { id: 3, x: 6100, y: 390, name: 'SEKTOR 3 // LAHAR VULKANIK', reached: false, lastHealTime: 0 },
      { id: 4, x: 9100, y: 410, name: 'SEKTOR 4 // KOLOSEUM TITAN', reached: false, lastHealTime: 0 },
      { id: 5, x: 12100, y: 410, name: 'SEKTOR 5 // GERBANG ASTRAL', reached: false, lastHealTime: 0 }
    ],
    loreTablets: [
      {
        id: 1,
        x: 3920,
        y: 560,
        title: 'ARSIP 01: KEJATUHAN PLANET ELYSIUM',
        sector: 'SEKTOR 2 // KAMAR RAHASIA RERUNTUHAN',
        content: `Berabad-abad sebelum perang siber berkecamuk, planet Elysium adalah pusat peradaban kosmik terindah di galaksi. Menara-menara obsidiannya menjulang tinggi menembus langit nebula, dialiri energi murni dari kristal bintang.

Namun, ambisi ilmuwan Elysium untuk membuka gerbang dimensi 'The Void' berujung pada bencana apokaliptik. Gelombang kegelapan menelan peradaban dalam semalam, memusnahkan jutaan jiwa dan mengubah penjaga mekanik menjadi boneka siber abadi.

Hanya segelintir prajurit terpilih—para ksatria Ronin, Fall, Dregsnot, Strom, Alpha, dan Glems—yang berhasil mempertahankan percikan kesadaran manusia.`
      },
      {
        id: 2,
        x: 7360,
        y: 110,
        title: 'ARSIP 02: WARISAN SENJATA NAGA DREGSNOT',
        sector: 'SEKTOR 3 // GROTTO RAHASIA KAWAH MAGMA',
        content: `Di kawah terdalam ini, logam terberat ditempa langsung dengan darah naga primordial yang bersemayam di perut planet.

Dregsnot merancang sepasang senjatanya—Revolver Dragon Claw dan Shotgun Magma Maw—bukan sekadar alat tempur, melainkan katalis energi vulkanik. Setiap butir pelurunya menyemburkan lahar pijar yang menembus musuh, memicu ledakan area, dan meninggalkan jejak api abadi di medan tempur.

Catatan pandai besi kuno: "Jangan pernah menatap moncong naga ini saat dia mengaum, karena yang tertinggal hanyalah abu perak."`
      },
      {
        id: 3,
        x: 9000,
        y: 440,
        title: 'ARSIP 03: KUTUKAN VORTEX GOLIATH',
        sector: 'SEKTOR 4 // GERBANG COLOSSEUM PURBA',
        content: `Colosseum agung ini dibangun sebagai arena penghakiman para ksatria galaksi. Penjaganya adalah VORTEX GOLIATH—konstruksi raksasa berkekuatan reaktor gravitasi kuno.

Goliath diprogram dengan satu aturan mutlak: siapapun yang melangkahkan kaki ke dalam arena tidak akan pernah diizinkan keluar hidup-hidup sampai salah satu petarung hancur menjadi serpihan debu siber!

Hati-hati: Saat armornya retak (di bawah 50% HP), reaktor intinya akan memasuki mode ENRAGED, melipatgandakan kecepatan serangan dan memanggil bala bantuan drone bayangan!`
      },
      {
        id: 4,
        x: 12000,
        y: 440,
        title: 'ARSIP 04: RAMALAN ENAM OPERATIVE',
        sector: 'SEKTOR 5 // SANCTUM GERBANG ASTRAL',
        content: `Ramalan pada pilar portal ekstraksi menyebutkan:

"Ketika enam jiwa dengan senjata yang berbeda bersatu melintasi reruntuhan masa lalu, kegelapan The Void akan tersingkap. Sang Ronin dengan tebasan penangkis peluru, Fall dengan ketepatan ledakan bintang, Dregsnot dengan lahar pemusnah, Strom dengan bilah kembar pemotong badai, Alpha dengan lentera jiwa abadi, dan Glems dengan belati kosmik bumerang.

Kalahkan sang Kaisar Xenos di tahta kosmik untuk membuka portal ekstraksi menuju armada kebebasan!"`
      },
      {
        id: 5,
        x: 14750,
        y: 440,
        title: 'ARSIP 05: KEJATUHAN KAISAR XENOS',
        sector: 'SEKTOR 5 // TAHTA KOSMIK XENOS',
        content: `Kaisar Astral Xenos adalah entitas yang mengendalikan retakan dimensi The Void. Dia menyerap serpihan jiwa planet-planet hancur untuk memperkuat pedang kosmiknya.

Kemenangan atas Xenos telah menyegel lubang hitam dimensi selamanya. Gerbang ekstraksi di hadapanmu kini stabil dan siap membawamu pulang!`
      }
    ],
    relics: [
      { id: 1, x: 4050, y: 560, type: 'hp_core', name: 'Inti Purba Elysium (+50 HP)', collected: false },
      { id: 2, x: 7420, y: 100, type: 'solar_core', name: 'Kristal Api Naga (+100 Energy)', collected: false },
      { id: 3, x: 10900, y: 270, type: 'hp_core', name: 'Mahkota Gladiator (+2000 Skor)', collected: false }
    ],
    breakableWalls: [
      { x: 3740, y: 360, w: 28, h: 110, hp: 3, maxHp: 3, isBroken: false, flashTimer: 0 },
      { x: 7100, y: 360, w: 28, h: 110, hp: 3, maxHp: 3, isBroken: false, flashTimer: 0 }
    ],
    stationedEnemies: [
      { x: 420, y: 390, type: 'drone' },
      { x: 920, y: 520, type: 'cyber_hound' },
      { x: 1020, y: 240, type: 'drone' },
      { x: 1320, y: 510, type: 'walker' },
      { x: 1820, y: 410, type: 'cyber_hound' },
      { x: 2040, y: 220, type: 'shinobi' },
      { x: 3050, y: 380, type: 'ruin_specter' },
      { x: 3360, y: 440, type: 'cyber_hound' },
      { x: 3720, y: 160, type: 'stone_gargoyle' },
      { x: 3980, y: 530, type: 'shinobi' },
      { x: 4200, y: 290, type: 'ruin_specter' },
      { x: 4450, y: 210, type: 'stone_gargoyle' },
      { x: 4700, y: 290, type: 'shinobi' },
      { x: 5960, y: 410, type: 'magma_slug' },
      { x: 6300, y: 320, type: 'pyro_drake' },
      { x: 6820, y: 410, type: 'golem' },
      { x: 7150, y: 410, type: 'magma_slug' },
      { x: 7420, y: 70, type: 'pyro_drake' },
      { x: 7720, y: 400, type: 'golem' },
      { x: 8260, y: 420, type: 'magma_slug' },
      { x: 9060, y: 410, type: 'void_centurion' },
      { x: 9360, y: 340, type: 'shinobi' },
      { x: 9750, y: 420, type: 'gladiator_berserker' },
      { x: 10080, y: 260, type: 'void_centurion' },
      { x: 11720, y: 420, type: 'gladiator_berserker' },
      { x: 12080, y: 410, type: 'astral_weaver' },
      { x: 12430, y: 340, type: 'quantum_turret' },
      { x: 12860, y: 160, type: 'astral_weaver' },
      { x: 13100, y: 420, type: 'void_centurion' }
    ]
  }
};

function loadLevel(levelId) {
  currentLevelId = levelId;
  const lvl = LEVELS[levelId] || LEVELS[1];

  MAP_WIDTH = lvl.mapWidth;
  MAP_HEIGHT = lvl.mapHeight;

  platforms.length = 0;
  lvl.platforms.forEach(p => platforms.push({ ...p }));

  traps.length = 0;
  lvl.traps.forEach(t => traps.push(new Trap(t.x, t.y, t.w, t.h, t.type)));

  crates.length = 0;
  lvl.crates.forEach(c => crates.push(new SupplyCrate(c.x, c.y)));

  checkpoints.length = 0;
  lvl.checkpoints.forEach((cp, idx) => {
    checkpoints.push({ ...cp, reached: idx === 0, lastHealTime: 0 });
  });
  activeCheckpoint = checkpoints[0];

  loreTablets.length = 0;
  lvl.loreTablets.forEach(lt => loreTablets.push({ ...lt }));

  relics.length = 0;
  lvl.relics.forEach(r => relics.push({ ...r, collected: false }));

  breakableWalls.length = 0;
  lvl.breakableWalls.forEach(bw => breakableWalls.push({ ...bw, isBroken: false, flashTimer: 0 }));

  stationedEnemyDefs.length = 0;
  lvl.stationedEnemies.forEach(e => stationedEnemyDefs.push({ ...e }));

  goalPortal.x = lvl.goalPortal.x;
  goalPortal.y = lvl.goalPortal.y;
  goalPortal.w = lvl.goalPortal.w;
  goalPortal.h = lvl.goalPortal.h;
  goalPortal.active = true;

  // Reset barriers & boss states
  levelBarriers.miniBossLeft.active = false;
  levelBarriers.miniBossRight.active = false;
  levelBarriers.bossLeft.active = false;
  levelBarriers.bossRight.active = false;
  isArenaLocked = false;
  isCitadelLocked = false;
  isBossDefeated = false;

  // Update HUD
  const hudSec = document.getElementById('hud-sector-name');
  if (hudSec) hudSec.textContent = lvl.name;
}

// ============================================================================
// PLAYER CONTROLLER (CYBER RONIN ENGINE)
// ============================================================================
// ============================================================================
// PLAYER CONTROLLER (CYBER RONIN ENGINE)
// ============================================================================
const player = {
  x: 100,
  y: 320,
  w: 36,
  h: 48,
  vx: 0,
  vy: 0,
  targetVx: 0,
  speed: 5.6,
  facing: 1,
  isGrounded: false,
  jumpCount: 0,
  maxJumps: 2,

  // Hollow Knight Directional Aiming & Crouch
  aimDirection: 'forward', // 'forward', 'up', 'down', 'crouch'
  isCrouching: false,

  // Wall Slide & Wall Jump Mechanics (Penusbmic feature)
  isWallSliding: false,
  wallDirection: 0,

  // Motion Smears & Neon Eye Trails
  eyeTrail: [],
  isSlashing: false,
  slashTimer: 0,
  activeSlashSmear: null,

  // Smooth Kinematics & Organic Transforms
  tiltAngle: 0,
  scaleX: 1.0,
  scaleY: 1.0,
  recoilX: 0,
  animTick: 0,

  // Active Skin Colors
  activeThemeColor: '#00f5ff',
  activeSecondaryColor: '#ffffff',

  // Combat Stats
  maxHp: 110,
  hp: 110,
  maxEnergy: 100,
  energy: 100,
  isInvulnerable: false,
  invulnTimer: 0,

  // Unique Hero Skill System (Key E)
  skillCooldown: 0,
  skillCooldownMax: 0,
  shieldHp: 0,
  shieldTimer: 0,
  damageBoostTimer: 0,
  speedBoostTimer: 0,

  // Hero Specific States
  soulStacks: 0,           // The Void: Alpha
  activePhantoms: [],      // The Void: Alpha
  orbitingShurikens: [],   // Strom
  shurikenTimer: 0,        // Strom
  activeBoomerangDagger: null, // Glems Starfall

  // Dash Mechanics
  isDashing: false,
  dashTimer: 0,
  dashCooldown: 0,

  // Attack State
  attackCooldown: 0,

  applyHeroConfig(heroId, skinId = 'default') {
    const config = HEROES[heroId] || HEROES.ronin;
    const skinConfig = config.skins.find(s => s.id === skinId) || config.skins[0];
    
    this.speed = config.baseSpeed;
    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.maxEnergy = 100;
    this.energy = 100;
    this.skillCooldown = 0;
    this.skillCooldownMax = config.skillCooldownMax || 0;
    this.activeThemeColor = skinConfig.themeColor;
    this.activeSecondaryColor = skinConfig.secondaryColor;
  },

  reset(spawnX = 120, spawnY = 330) {
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;
    this.targetVx = 0;
    this.tiltAngle = 0;
    this.scaleX = 1.0;
    this.scaleY = 1.0;
    this.recoilX = 0;
    this.eyeTrail = [];
    this.isSlashing = false;
    this.slashTimer = 0;
    this.activeSlashSmear = null;
    this.isWallSliding = false;
    this.isDashing = false;
    this.isInvulnerable = false;
    this.isCrouching = false;
    this.aimDirection = 'forward';
    this.w = 36;
    this.h = 48;
    this.skillCooldown = 0;
    this.shieldHp = 0;
    this.shieldTimer = 0;
    this.damageBoostTimer = 0;
    this.speedBoostTimer = 0;
    this.soulStacks = 0;
    this.activePhantoms = [];
    this.orbitingShurikens = [];
    this.shurikenTimer = 0;
    this.activeBoomerangDagger = null;
    this.applyHeroConfig(currentHeroId, currentSkinId);
  }
};

// Player Projectiles Collection
const playerProjectiles = [];
const activeLaserBeams = [];

// Hero Skill Entities Collections
const groundFlames = [];
const soulOrbs = [];

function createAoEExplosion(x, y, radius = 90, damage = 150) {
  screenShake = 14;
  window.soundEngine.playExplosion();
  for (let i = 0; i < 35; i++) {
    particles.push(new Particle(
      x + (Math.random() - 0.5) * 20,
      y + (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
      Math.random() * 5 + 3,
      35
    ));
  }
  floatingTexts.push(new FloatingText(x, y - 25, 'BOOM! AoE', '#f59e0b'));

  enemies.forEach((enemy, eIdx) => {
    const dist = Math.hypot((enemy.x + enemy.w / 2) - x, (enemy.y + enemy.h / 2) - y);
    if (dist <= radius) {
      enemy.hp -= damage;
      enemy.flashTimer = 10;
      floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + damage, '#f59e0b'));
      if (enemy.hp <= 0) destroyEnemy(enemy, eIdx);
    }
  });
}

class Projectile {
  constructor(x, y, vx, vy, type, damage, color, life = 120, isReflected = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.damage = damage;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.isReflected = isReflected;
    this.trail = [];
    this.hitEnemies = new Set();
    this.flameDropTimer = 0;
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    if (this.type === 'deadlest') {
      if (Math.random() > 0.3) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, '#f59e0b', 3.5, 16));
      }
      // Wall / platform collision: detonates
      for (const p of platforms) {
        if (this.x >= p.x && this.x <= p.x + p.w && this.y >= p.y && this.y <= p.y + p.h) {
          createAoEExplosion(this.x, this.y, 115, this.damage);
          this.life = 0;
          return;
        }
      }
      // Self-detonate when life expires if no target hit
      if (this.life <= 0) {
        createAoEExplosion(this.x, this.y, 115, this.damage);
      }
    } else if (this.type === 'dragon_breath') {
      if (Math.random() > 0.15) {
        particles.push(new Particle(
          this.x + (Math.random() - 0.5) * 32,
          this.y + (Math.random() - 0.5) * 32,
          -this.vx * 0.25 + (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          Math.random() > 0.4 ? '#f97316' : (Math.random() > 0.5 ? '#ef4444' : '#fef08a'),
          Math.random() * 5 + 3,
          26
        ));
      }
      // Drop ground flame trail behind dragon wave as it travels
      this.flameDropTimer++;
      if (this.flameDropTimer >= 5) {
        this.flameDropTimer = 0;
        let groundY = MAP_HEIGHT - 30;
        for (const p of platforms) {
          if (this.x >= p.x && this.x <= p.x + p.w && p.y >= this.y - 40) {
            if (p.y < groundY) groundY = p.y;
          }
        }
        groundFlames.push(new GroundFlame(this.x - 17, groundY - 20));
      }
      // Wall & solid platform collision: detonates into a massive fiery explosion!
      for (const p of platforms) {
        if (p.type === 'wall' || p.type === 'ground' || p.type === 'metal') {
          if (this.x >= p.x - 14 && this.x <= p.x + p.w + 14 &&
              this.y >= p.y && this.y <= p.y + p.h) {
            createAoEExplosion(this.x, this.y, 140, this.damage);
            this.life = 0;
            return;
          }
        }
      }
    } else if (this.type === 'phantom_orb') {
      if (Math.random() > 0.4) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, '#c084fc', 3, 14));
      }
    } else if (this.type === 'dagger' || this.type === 'magic_dagger') {
      if (Math.random() > 0.5) {
        particles.push(new Particle(this.x, this.y, -this.vx * 0.1, (Math.random() - 0.5) * 1.2, this.color, 2.5, 14));
      }
    } else if (this.isReflected) {
      if (Math.random() > 0.4) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, '#00f5ff', 3, 15));
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;

    if (this.isReflected) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === 'deadlest') {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'dragon_breath') {
      // Piercing Massive Dragon Wave
      const dir = Math.sign(this.vx) || 1;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(dir, 1);

      // Fiery Outer Aura & Roaring Crest
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();

      // Dragon Head Shape (Forward tapered snout)
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-28, -24);
      ctx.quadraticCurveTo(0, -32, 28, -12);
      ctx.lineTo(44, 0); // Snout tip
      ctx.lineTo(28, 14);
      ctx.quadraticCurveTo(0, 30, -28, 22);
      ctx.quadraticCurveTo(-14, 0, -28, -24);
      ctx.closePath();
      ctx.fill();

      // Inner White-Hot Core & Jaws
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(-16, -12);
      ctx.lineTo(34, 0);
      ctx.lineTo(-16, 12);
      ctx.closePath();
      ctx.fill();

      // Dragon Horns
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(-4, -18);
      ctx.lineTo(-24, -36);
      ctx.lineTo(-14, -16);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-4, 18);
      ctx.lineTo(-24, 36);
      ctx.lineTo(-14, 16);
      ctx.closePath();
      ctx.fill();

      // Dragon Piercing Cyan/White Eyes
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.fillRect(8, -12, 9, 4);
      ctx.fillRect(8, 8, 9, 4);

      // Trailing Fire Wisps
      const fOff = Math.sin(Date.now() / 60) * 6;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
      ctx.beginPath();
      ctx.arc(-36, fOff, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else if (this.type === 'bullet') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 8, 3.5, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'slash_wave' || this.type === 'slash') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 16, -Math.PI / 3, Math.PI / 3, this.vx < 0);
      ctx.stroke();
    } else if (this.type === 'phantom_orb') {
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'spear') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 22, 6, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, 14, 2.5, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'dagger' || this.type === 'magic_dagger') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      const dir = Math.sign(this.vx) || 1;
      ctx.moveTo(this.x + dir * 11, this.y);
      ctx.lineTo(this.x - dir * 7, this.y - 4);
      ctx.lineTo(this.x - dir * 2, this.y);
      ctx.lineTo(this.x - dir * 7, this.y + 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// -------------------------------------------------------------
// DREGSNOT: GROUND FLAME TRAIL
// -------------------------------------------------------------
class GroundFlame {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 34;
    this.h = 24;
    this.life = 180;
    this.damageTimer = 0;
  }
  update() {
    this.life--;
    this.damageTimer++;
    if (this.damageTimer >= 20) {
      this.damageTimer = 0;
      enemies.forEach((e, eIdx) => {
        if (e.x + e.w > this.x && e.x < this.x + this.w &&
            e.y + e.h > this.y - 12 && e.y < this.y + this.h + 10) {
          e.hp -= 18;
          e.flashTimer = 6;
          floatingTexts.push(new FloatingText(e.x, e.y, '-18', '#f97316'));
          window.soundEngine.playHit();
          if (e.hp <= 0) destroyEnemy(e, eIdx);
        }
      });
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = Math.random() > 0.4 ? '#f97316' : '#ef4444';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 10;
    const flicker = Math.sin(Date.now() / 70 + this.x) * 6;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.h);
    ctx.lineTo(this.x + this.w / 2, this.y + flicker);
    ctx.lineTo(this.x + this.w, this.y + this.h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// THE VOID: ALPHA - SOUL ORB COLLECTOR
// -------------------------------------------------------------
class SoulOrb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.life = 600;
  }
  update() {
    this.y = this.baseY + Math.sin(Date.now() / 220 + this.x) * 6;
    this.life--;
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// THE VOID: ALPHA - SOUL PHANTOMS (2 PROTECTORS)
// -------------------------------------------------------------
class SoulPhantom {
  constructor(index) {
    this.index = index;
    this.x = player.x;
    this.y = player.y - 40;
    this.hp = 50 + (player.soulStacks * 10);
    this.maxHp = this.hp;
    this.shootTimer = Math.floor(Math.random() * 30);
    this.isDead = false;
  }
  update() {
    const angle = (Date.now() / 550) + (this.index * Math.PI);
    const targetX = player.x + Math.cos(angle) * 50;
    const targetY = player.y - 30 + Math.sin(angle) * 22;
    this.x += (targetX - this.x) * 0.14;
    this.y += (targetY - this.y) * 0.14;

    this.shootTimer++;
    if (this.shootTimer > 55) {
      this.shootTimer = 0;
      let nearest = null;
      let minDist = 480;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < minDist) {
          minDist = d;
          nearest = e;
        }
      });
      if (nearest) {
        const angleToTarget = Math.atan2(nearest.y + nearest.h / 2 - this.y, nearest.x + nearest.w / 2 - this.x);
        const dmg = 16 + (player.soulStacks * 3);
        playerProjectiles.push(new Projectile(this.x, this.y, Math.cos(angleToTarget) * 9, Math.sin(angleToTarget) * 9, 'phantom_orb', dmg, '#c084fc'));
        window.soundEngine.playStarDagger();
      }
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// STROM: ORBITING ENERGY BLADES (SLAYER OF GOLIATH - 3 BLADES)
// -------------------------------------------------------------
class OrbitingShuriken {
  constructor(index) {
    this.index = index;
    this.radius = 56;
    this.damageTimer = 0;
  }
  update() {
    const angle = (Date.now() / 130) + (this.index * (Math.PI * 2 / 3));
    this.x = player.x + player.w / 2 + Math.cos(angle) * this.radius;
    this.y = player.y + player.h / 2 + Math.sin(angle) * this.radius;

    if (Math.random() > 0.5) {
      particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, '#eab308', 2.5, 12));
    }

    this.damageTimer++;
    if (this.damageTimer >= 12) {
      this.damageTimer = 0;
      enemies.forEach((e, eIdx) => {
        if (Math.hypot(e.x + e.w / 2 - this.x, e.y + e.h / 2 - this.y) < 34) {
          e.hp -= 38;
          e.flashTimer = 8;
          floatingTexts.push(new FloatingText(e.x, e.y, '-38', '#eab308'));
          window.soundEngine.playHit();
          for (let p = 0; p < 4; p++) {
            particles.push(new Particle(e.x + e.w / 2, e.y + e.h / 2, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, '#eab308', 2.5, 14));
          }
          if (e.hp <= 0) {
            destroyEnemy(e, eIdx);
            // RESET MEKANIK: Strom kill resets skill cooldown!
            if (player.skillCooldown > 0) {
              player.skillCooldown = 0;
              window.soundEngine.playCharSelect();
              floatingTexts.push(new FloatingText(player.x, player.y - 32, '★ GOLIATH RESET! ★', '#eab308'));
            }
          }
        }
      });
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const spinAngle = (Date.now() / 90) + (this.index * (Math.PI * 2 / 3));
    ctx.rotate(spinAngle);

    // High-Tech Cyber Energy Katana Blade
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 16;

    // Glowing Golden Yellow Outer Energy Edge
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-3, -22);
    ctx.lineTo(0, -30); // Blade tip
    ctx.lineTo(3, -22);
    ctx.lineTo(4, 0);
    ctx.closePath();
    ctx.fill();

    // White-Hot High-Voltage Plasma Core
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-1.5, -18);
    ctx.lineTo(0, -26);
    ctx.lineTo(1.5, -18);
    ctx.closePath();
    ctx.fill();

    // Cyber Hilt & Cyan Energy Emitter
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6, 2, 12, 4);
    ctx.fillStyle = '#00f5ff';
    ctx.fillRect(-4, 3, 8, 2);

    ctx.restore();
  }
}

// -------------------------------------------------------------
// GLEMS STARFALL: BOOMERANG STAR DAGGER
// -------------------------------------------------------------
class BoomerangDagger {
  constructor(x, y, facing) {
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.vx = facing * 13;
    this.returning = false;
    this.returnSpeed = 15;
    this.life = 260;
    this.trail = [];
  }
  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.shift();

    if (!this.returning) {
      this.x += this.vx;
      this.vx *= 0.94;
      if (Math.abs(this.vx) < 1.2) {
        this.returning = true;
      }
    } else {
      const angle = Math.atan2(player.y + player.h / 2 - this.y, player.x + player.w / 2 - this.x);
      this.x += Math.cos(angle) * this.returnSpeed;
      this.y += Math.sin(angle) * this.returnSpeed;

      // Caught by Glems
      if (Math.hypot(this.x - (player.x + player.w / 2), this.y - (player.y + player.h / 2)) < 34) {
        player.speedBoostTimer = 180;
        player.shieldHp = Math.min(60, player.shieldHp + 30);
        player.shieldTimer = 180;
        player.dashCooldown = 0; // RESET DASH COOLDOWN!
        window.soundEngine.playCharSelect();
        floatingTexts.push(new FloatingText(player.x, player.y - 25, 'DAGGER CAUGHT! DASH RESET', '#38bdf8'));
        player.activeBoomerangDagger = null;
        return;
      }
    }

    enemies.forEach((e, eIdx) => {
      if (Math.hypot(e.x + e.w / 2 - this.x, e.y + e.h / 2 - this.y) < 34) {
        e.hp -= 24;
        e.flashTimer = 5;
        window.soundEngine.playHit();
        floatingTexts.push(new FloatingText(e.x, e.y, '-24', '#818cf8'));
        if (e.hp <= 0) destroyEnemy(e, eIdx);
      }
    });

    this.life--;
    if (this.life <= 0) {
      player.activeBoomerangDagger = null;
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Date.now() / 35);
    ctx.fillStyle = '#818cf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Enemies Collection & Hollow Knight Stationed Roster
const enemies = [];
const enemyProjectiles = [];
const enemyCorpses = [];

// Hollow Knight / Silksong Metroidvania Stationed Enemy Roster
// Pre-stationed across the 15,000px 5-Sector World. Defeated mobs stay dead until checkpoint respawn!
const stationedEnemyDefs = [
  // --- Sector 1: Neon Rooftop Highway (0 .. 2800) ---
  { x: 420, y: 390, type: 'drone' },
  { x: 920, y: 520, type: 'cyber_hound' },
  { x: 1020, y: 240, type: 'drone' },
  { x: 1320, y: 510, type: 'walker' },
  { x: 1820, y: 410, type: 'cyber_hound' },
  { x: 2040, y: 220, type: 'shinobi' },

  // --- Sector 2: Ancient Ruins of Elysium (2800 .. 5800) ---
  { x: 3050, y: 380, type: 'ruin_specter' },
  { x: 3360, y: 440, type: 'cyber_hound' },
  { x: 3720, y: 160, type: 'stone_gargoyle' },
  { x: 3980, y: 530, type: 'shinobi' },
  { x: 4200, y: 290, type: 'ruin_specter' },
  { x: 4450, y: 210, type: 'stone_gargoyle' },
  { x: 4700, y: 290, type: 'shinobi' },

  // --- Sector 3: Magma Caverns & Volcanic Foundry (5800 .. 8800) ---
  { x: 5960, y: 410, type: 'magma_slug' },
  { x: 6300, y: 320, type: 'pyro_drake' },
  { x: 6820, y: 410, type: 'golem' },
  { x: 7150, y: 410, type: 'magma_slug' },
  { x: 7420, y: 70, type: 'pyro_drake' },
  { x: 7720, y: 400, type: 'golem' },
  { x: 8260, y: 420, type: 'magma_slug' },

  // --- Sector 4: Grand Colosseum of Titans (8800 .. 11800) ---
  { x: 9060, y: 410, type: 'void_centurion' },
  { x: 9360, y: 340, type: 'shinobi' },
  { x: 9750, y: 420, type: 'gladiator_berserker' },
  { x: 10080, y: 260, type: 'void_centurion' },
  { x: 11720, y: 420, type: 'gladiator_berserker' },

  // --- Sector 5: Astral Citadel & Celestial Throne (11800 .. 15000) ---
  { x: 12080, y: 410, type: 'astral_weaver' },
  { x: 12430, y: 340, type: 'quantum_turret' },
  { x: 12860, y: 160, type: 'astral_weaver' },
  { x: 13100, y: 420, type: 'void_centurion' }
];

// Persistent Enemy Remains (Hollow Knight Corpse System)
class EnemyCorpse {
  constructor(x, y, w, h, type, facing) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.facing = facing || -1;
    this.vx = -this.facing * 1.5;
    this.vy = -3.2;
    this.isGrounded = false;
    this.smokeTimer = Math.floor(Math.random() * 60);
  }

  update() {
    if (!this.isGrounded) {
      this.vy += GRAVITY * 0.8;
      this.x += this.vx;
      this.y += this.vy;

      platforms.forEach(p => {
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 14) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.vx = 0;
          this.isGrounded = true;
        }
      });
      if (this.y > MAP_HEIGHT) {
        this.isGrounded = true;
      }
    } else {
      this.smokeTimer++;
      if (this.smokeTimer % 160 === 0 && Math.abs(this.x - player.x) < 800) {
        particles.push(new Particle(
          this.x + this.w / 2 + (Math.random() - 0.5) * 14,
          this.y + this.h - 6,
          (Math.random() - 0.5) * 0.4,
          -0.6,
          '#64748b',
          2.2,
          32
        ));
      }
    }
  }

  draw(ctx) {
    if (Math.abs(this.x - player.x) > V_WIDTH + 100) return;
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h);
    ctx.scale(this.facing, 1);
    ctx.globalAlpha = 0.85;

    if (this.type === 'drone') {
      ctx.rotate(0.35);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-16, -14, 32, 14);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-16, -14, 32, 14);
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, -7, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'cyber_hound') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-22, -12, 44, 12);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-22, -12, 44, 12);
      ctx.fillRect(16, -10, 10, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.globalAlpha = 0.3;
      ctx.fillRect(-12, -8, 20, 2);
    } else if (this.type === 'walker') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-22, -20, 44, 20);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -20, 44, 20);
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, -12, 18, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-14, -16, 24, 3);
    } else if (this.type === 'shinobi') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-24, -10, 48, 10);
      ctx.fillStyle = '#581c87';
      ctx.fillRect(-20, -12, 36, 6);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.lineTo(26, -2);
      ctx.stroke();
    } else if (this.type === 'golem') {
      ctx.fillStyle = '#292524';
      ctx.beginPath();
      ctx.arc(-14, -12, 14, 0, Math.PI * 2);
      ctx.arc(6, -10, 12, 0, Math.PI * 2);
      ctx.arc(-2, -18, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#44403c';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)';
      ctx.beginPath();
      ctx.moveTo(-10, -14);
      ctx.lineTo(4, -8);
      ctx.stroke();
    } else if (this.type === 'ruin_specter') {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.beginPath();
      ctx.ellipse(0, -6, 20, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.stroke();
    } else if (this.type === 'stone_gargoyle') {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-18, -10, 16, 10);
      ctx.fillRect(2, -8, 14, 8);
      ctx.strokeStyle = '#334155';
      ctx.strokeRect(-18, -10, 16, 10);
    } else if (this.type === 'magma_slug') {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(0, -7, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.3)';
      ctx.stroke();
    } else if (this.type === 'pyro_drake') {
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(-22, -10, 44, 10);
      ctx.fillStyle = '#431407';
      ctx.fillRect(-16, -14, 28, 6);
    } else if (this.type === 'gladiator_berserker') {
      ctx.fillStyle = '#3f1a08';
      ctx.fillRect(-22, -16, 44, 16);
      ctx.strokeStyle = '#78350f';
      ctx.strokeRect(-22, -16, 44, 16);
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(24, -4);
      ctx.stroke();
    } else if (this.type === 'void_centurion') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-24, -18, 48, 18);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-24, -18, 48, 18);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-14, -6, 26, 6);
    } else if (this.type === 'astral_weaver') {
      ctx.fillStyle = 'rgba(88, 28, 135, 0.8)';
      ctx.beginPath();
      ctx.ellipse(0, -6, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'quantum_turret') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-16, -12, 32, 12);
      ctx.strokeStyle = '#06b6d4';
      ctx.strokeRect(-16, -12, 32, 12);
    } else if (this.type === 'blight_hound') {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-20, -10, 40, 10);
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(-12, -14, 18, 4);
      ctx.strokeStyle = '#4d7c0f';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-20, -10, 40, 10);
    } else if (this.type === 'spore_spitter') {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(0, -8, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(-4, -12, 5, 0, Math.PI * 2);
      ctx.arc(6, -10, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'wood_stalker') {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-22, -12, 44, 12);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(8, -14, 14, 10);
      ctx.strokeStyle = '#a16207';
      ctx.strokeRect(8, -14, 14, 10);
    } else if (this.type === 'bramble_drone') {
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.arc(0, -8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#65a30d';
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-18, -12, 36, 12);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(-18, -12, 36, 12);
    }

    ctx.restore();
  }
}

// Checkpoint / Initial Level World Respawn (Hollow Knight Bench Reset)
function respawnWorldEnemies() {
  enemyCorpses.length = 0;
  items.length = 0;
  enemyProjectiles.length = 0;

  // Preserve any active un-defeated boss
  const survivingBosses = enemies.filter(e => e.type.startsWith('boss') && !e.isDead);
  enemies.length = 0;

  stationedEnemyDefs.forEach(def => {
    enemies.push(new Enemy(def.x, def.y, def.type));
  });

  survivingBosses.forEach(b => enemies.push(b));
}

class Enemy {
  constructor(x, y, type = 'drone') {
    this.x = x;
    this.y = y;
    this.type = type;
    this.facing = -1;
    this.vy = 0;
    this.isGrounded = false;
    this.isDead = false;
    this.flashTimer = 0;
    this.hpBarTimer = 0;
    this.shootTimer = Math.floor(Math.random() * 60);
    this.state = 'idle';
    this.stateTimer = 0;
    this.animFrame = Math.random() * 100;

    if (type === 'drone') {
      this.w = 36;
      this.h = 36;
      this.vx = -1.8;
      this.hp = 140; // Tougher: Not 1-hit kill!
      this.maxHp = 140;
    } else if (type === 'walker') {
      this.w = 48;
      this.h = 56;
      this.vx = -1.2;
      this.hp = 280; // High Armor Sentry
      this.maxHp = 280;
      this.isShielded = true;
    } else if (type === 'shinobi') {
      this.w = 38;
      this.h = 56;
      this.vx = -2.6;
      this.hp = 240; // Agile Shadow Ninja
      this.maxHp = 240;
      this.teleportCooldown = 180;
    } else if (type === 'golem') {
      this.w = 58;
      this.h = 68;
      this.vx = -0.9;
      this.hp = 360; // Magma Rock Brute
      this.maxHp = 360;
    } else if (type === 'boss') {
      this.w = 84;
      this.h = 104;
      this.vx = -1.4;
      this.hp = 1500; // Colosseum Mini Boss: Vortex Goliath!
      this.maxHp = 1500;
      this.phase = 1;
      this.name = 'VORTEX GOLIATH';
      this.isMiniBoss = true;
      this.summonedMinions = false;
    } else if (type === 'cyber_hound') {
      this.w = 46;
      this.h = 36;
      this.vx = -2.8;
      this.hp = 160;
      this.maxHp = 160;
      this.leapTimer = 0;
    } else if (type === 'ruin_specter') {
      this.w = 36;
      this.h = 48;
      this.vx = -1.5;
      this.hp = 180;
      this.maxHp = 180;
      this.floatOffset = Math.random() * 10;
    } else if (type === 'stone_gargoyle') {
      this.w = 44;
      this.h = 44;
      this.vx = -2.0;
      this.hp = 220;
      this.maxHp = 220;
    } else if (type === 'magma_slug') {
      this.w = 42;
      this.h = 28;
      this.vx = -0.8;
      this.hp = 200;
      this.maxHp = 200;
    } else if (type === 'pyro_drake') {
      this.w = 50;
      this.h = 40;
      this.vx = -2.2;
      this.hp = 240;
      this.maxHp = 240;
    } else if (type === 'gladiator_berserker') {
      this.w = 48;
      this.h = 60;
      this.vx = -1.9;
      this.hp = 320;
      this.maxHp = 320;
      this.whirlwindTimer = 0;
    } else if (type === 'void_centurion') {
      this.w = 52;
      this.h = 62;
      this.vx = -1.1;
      this.hp = 340;
      this.maxHp = 340;
      this.isShielded = true;
    } else if (type === 'astral_weaver') {
      this.w = 40;
      this.h = 58;
      this.vx = -1.6;
      this.hp = 260;
      this.maxHp = 260;
      this.teleportCooldown = 200;
    } else if (type === 'quantum_turret') {
      this.w = 42;
      this.h = 46;
      this.vx = 0;
      this.hp = 300;
      this.maxHp = 300;
    } else if (type === 'boss_mech') {
      this.w = 78;
      this.h = 92;
      this.vx = -1.2;
      this.hp = 850;
      this.maxHp = 850;
      this.phase = 1;
      this.name = 'MECHA ENFORCER D-01';
      this.isMiniBoss = true;
    } else if (type === 'boss_colossus') {
      this.w = 88;
      this.h = 106;
      this.vx = -1.0;
      this.hp = 1100;
      this.maxHp = 1100;
      this.phase = 1;
      this.name = 'ELYSIUM COLOSSUS';
      this.isMiniBoss = true;
    } else if (type === 'boss_drake') {
      this.w = 92;
      this.h = 80;
      this.vx = -2.2;
      this.hp = 1300;
      this.maxHp = 1300;
      this.phase = 1;
      this.name = 'IGNIS WYRM QUEEN';
      this.isMiniBoss = true;
    } else if (type === 'boss_final') {
      this.w = 90;
      this.h = 114;
      this.vx = -1.8;
      this.hp = 2500;
      this.maxHp = 2500;
      this.phase = 1;
      this.name = 'STARFALL EMPEROR XENOS';
      this.isFinalBoss = true;
    } else if (type === 'blight_hound') {
      this.w = 44;
      this.h = 32;
      this.vx = -2.5;
      this.hp = 150;
      this.maxHp = 150;
      this.leapTimer = 0;
    } else if (type === 'spore_spitter') {
      this.w = 40;
      this.h = 42;
      this.vx = -1.0;
      this.hp = 180;
      this.maxHp = 180;
      this.shootTimer = 40;
    } else if (type === 'wood_stalker') {
      this.w = 38;
      this.h = 54;
      this.vx = -2.2;
      this.hp = 220;
      this.maxHp = 220;
      this.stalkCooldown = 150;
    } else if (type === 'bramble_drone') {
      this.w = 34;
      this.h = 34;
      this.vx = -1.9;
      this.hp = 130;
      this.maxHp = 130;
      this.shootTimer = 60;
    } else if (type === 'boss_treant') {
      this.w = 86;
      this.h = 105;
      this.vx = -1.3;
      this.hp = 950;
      this.maxHp = 950;
      this.phase = 1;
      this.name = 'BLIGHT FANG BEHEMOTH';
      this.isMiniBoss = true;
    } else if (type === 'boss_chimera') {
      this.w = 96;
      this.h = 116;
      this.vx = -1.7;
      this.hp = 1800;
      this.maxHp = 1800;
      this.phase = 1;
      this.name = 'THE BLIGHT CHIMERA';
      this.isFinalBoss = true;
    }

    // Auto-snap ground bosses & golems to platform surface on spawn so they never clip or fall through
    if (this.type.startsWith('boss') || this.type === 'golem') {
      const ground = platforms.find(p =>
        this.x + this.w > p.x && this.x < p.x + p.w &&
        p.type !== 'hazard_spikes' && p.type !== 'hazard_brambles' && p.type !== 'hanging_rope' &&
        p.y >= this.y - 20 && p.y <= this.y + this.h + 120
      );
      if (ground) {
        this.y = ground.y - this.h;
        this.vy = 0;
        this.isGrounded = true;
      }
    }
  }

  takeDamage(amount, hitFromX) {
    let finalDmg = amount;

    // WALKER & VOID CENTURION DIRECTIONAL ENERGY SHIELD:
    // If damage comes from the front, shield absorbs 50%!
    if (this.type === 'walker' || this.type === 'void_centurion') {
      const hitFromFront = (this.facing === -1 && hitFromX < this.x + this.w / 2) ||
                           (this.facing === 1 && hitFromX > this.x + this.w / 2);
      if (hitFromFront) {
        finalDmg = Math.round(amount * 0.5);
        floatingTexts.push(new FloatingText(this.x + this.w / 2, this.y - 10, 'SHIELDED (-50%)', '#38bdf8'));
        window.soundEngine.playParry();
      }
    }

    // SHINOBI & ASTRAL WEAVER EVASION BLINK:
    // 35% chance to smoke-teleport behind player when taking hit
    if ((this.type === 'shinobi' || this.type === 'astral_weaver') && Math.random() < 0.35 && this.teleportCooldown <= 0) {
      this.teleportBehindPlayer();
      return 0;
    }

    this.hp -= finalDmg;
    this.flashTimer = 8;
    this.hpBarTimer = 180; // Show overhead HP bar for 3 seconds
    return finalDmg;
  }

  teleportBehindPlayer() {
    this.teleportCooldown = 240;
    // Smoke burst at old position
    for (let i = 0; i < 14; i++) {
      particles.push(new Particle(this.x + this.w / 2, this.y + this.h / 2, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#a855f7', 3, 20));
    }
    // Teleport 75px behind player facing, aligning feet to player ground
    this.x = player.x - player.facing * 75;
    this.y = (player.y + player.h) - this.h;
    this.vy = 0;
    this.facing = player.facing;
    this.vx = player.facing * 2.8;
    // Smoke burst at new position
    for (let i = 0; i < 14; i++) {
      particles.push(new Particle(this.x + this.w / 2, this.y + this.h / 2, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#c084fc', 3, 20));
    }
    floatingTexts.push(new FloatingText(this.x, this.y - 12, 'SHADOW BLINK!', '#c084fc'));
  }

  update() {
    this.animFrame++;
    if (this.flashTimer > 0) this.flashTimer--;
    if (this.hpBarTimer > 0) this.hpBarTimer--;

    // ==========================================
    // 1. FLYING HUNTER ENEMIES
    // ==========================================
    if (this.type === 'drone') {
      this.x += this.vx;
      this.y += Math.sin(Date.now() / 240 + this.x * 0.04) * 0.9;
      if (Math.abs(this.x - player.x) < 400) {
        this.y += (player.y - 70 - this.y) * 0.02;
      }
      if (this.x < 30) {
        this.x = 30;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > MAP_WIDTH - 60) {
        this.x = MAP_WIDTH - 60;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }
      this.shootTimer++;
      if (this.shootTimer > 125 && Math.abs(this.x - player.x) < 580) {
        this.shootTimer = 0;
        const dir = player.x < this.x ? -3.8 : 3.8;
        this.facing = dir > 0 ? 1 : -1;
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 14, dir, 0, 'plasma'));
      }
      return;
    }

    if (this.type === 'ruin_specter') {
      this.x += this.vx;
      this.y += Math.sin(Date.now() / 200 + this.floatOffset) * 1.3;
      if (Math.abs(this.x - player.x) < 450) {
        this.y += (player.y - 75 - this.y) * 0.02;
      }
      if (this.x < 2850) {
        this.x = 2850;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 5750) {
        this.x = 5750;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }
      this.shootTimer++;
      if (this.shootTimer > 130 && Math.abs(this.x - player.x) < 550) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + this.h / 2, this.facing * 3.6, 0, 'ethereal_orb'));
      }
      return;
    }

    if (this.type === 'pyro_drake') {
      this.x += this.vx;
      this.y += Math.sin(Date.now() / 160 + this.x * 0.02) * 1.4;
      if (this.x < 5850) {
        this.x = 5850;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 8750) {
        this.x = 8750;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }
      this.shootTimer++;
      if (this.shootTimer > 115 && Math.abs(this.x - player.x) < 500) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 14, this.facing * 4.4, -1.2, 'fireball'));
      }
      return;
    }

    if (this.type === 'bramble_drone') {
      this.x += this.vx;
      this.y += Math.sin(Date.now() / 200 + this.x * 0.03) * 1.2;
      if (Math.abs(this.x - player.x) < 450) {
        this.y += (player.y - 80 - this.y) * 0.025;
      }
      if (this.x < 30) {
        this.x = 30;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > MAP_WIDTH - 60) {
        this.x = MAP_WIDTH - 60;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }
      this.shootTimer++;
      if (this.shootTimer > 110 && Math.abs(this.x - player.x) < 520) {
        this.shootTimer = 0;
        const dir = player.x < this.x ? -4.2 : 4.2;
        this.facing = dir > 0 ? 1 : -1;
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 16, dir, 0, 'bramble_thorn'));
      }
      return;
    }

    // ==========================================
    // 2. BOSSES & MINI BOSSES
    // ==========================================
    // Sector 1 Mini Boss: Mecha Enforcer D-01
    if (this.type === 'boss_mech') {
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      platforms.forEach(p => {
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 16) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
      });
      if (this.x < 2200) {
        this.x = 2200;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 2750) {
        this.x = 2750;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }

      if (this.hp <= 425 && this.phase === 1) {
        this.phase = 2;
        screenShake = 14;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(this.x, this.y - 25, '⚡ MECHA OVERDRIVE! ⚡', '#38bdf8'));
      }
      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      if (this.stateTimer % 90 === 0) {
        window.soundEngine.playLaserCannon();
        enemyProjectiles.push(new EnemyProjectile(this.x + (this.facing === 1 ? this.w : 0), this.y + 30, this.facing * 6.2, 0, 'laser_bullet'));
      }
      if (this.stateTimer % 180 === 120) {
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 10, this.facing * 3.5, -4.5, 'micro_missile'));
        if (this.phase === 2) {
          enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 10, this.facing * 2.5, -6.0, 'micro_missile'));
        }
      }
      if (this.phase === 2 && this.stateTimer % 240 === 200) {
        this.vx = this.facing * 6.8;
        screenShake = 8;
        window.soundEngine.playDash();
      }
      return;
    }

    // Sector 2 Mini Boss: Elysium Colossus
    if (this.type === 'boss_colossus') {
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      platforms.forEach(p => {
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 16) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
      });
      if (this.x < 4900) {
        this.x = 4900;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 5700) {
        this.x = 5700;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }

      if (this.hp <= 550 && this.phase === 1) {
        this.phase = 2;
        screenShake = 16;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(this.x, this.y - 25, '⚡ TITAN CRUMBLE ENRAGED! ⚡', '#10b981'));
      }
      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      if (this.stateTimer % 140 === 100) {
        screenShake = 12;
        window.soundEngine.playExplosion();
        enemyProjectiles.push(new EnemyProjectile(this.x - 10, 470, -5.2, 0, 'shockwave'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w + 10, 470, 5.2, 0, 'shockwave'));
      }
      if (this.stateTimer % 220 === 180) {
        floatingTexts.push(new FloatingText(this.x + 20, this.y - 20, '⚠ RUBBLE HAIL! ⚠', '#fbbf24'));
        for (let r = 0; r < 2; r++) {
          const spawnRx = player.x + (r - 0.5) * 140;
          traps.push(new Trap(spawnRx, 120, 22, 34, 'falling_stalactite'));
        }
      }
      return;
    }

    // Sector 3 Mini Boss: Ignis Wyrm Queen
    if (this.type === 'boss_drake') {
      this.x += this.vx;
      this.y += Math.sin(Date.now() / 180) * 1.8;
      if (Math.abs(this.x - player.x) < 400) {
        this.y += (player.y - 120 - this.y) * 0.03;
      }
      if (this.x < 7900) {
        this.x = 7900;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 8750) {
        this.x = 8750;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }

      if (this.hp <= 650 && this.phase === 1) {
        this.phase = 2;
        screenShake = 18;
        window.soundEngine.playFireBlast();
        floatingTexts.push(new FloatingText(this.x, this.y - 25, '🔥 WYRM QUEEN INFERNO! 🔥', '#f97316'));
        enemies.push(new Enemy(this.x - 100, this.y, 'pyro_drake'));
      }
      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      if (this.stateTimer % 130 === 90) {
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 24, this.facing * 5.0, -1.5, 'fireball'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 24, this.facing * 5.8, 0, 'fireball'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 24, this.facing * 5.0, 1.5, 'fireball'));
      }
      if (this.phase === 2 && this.stateTimer % 220 === 180) {
        this.vx = this.facing * 7.5;
        screenShake = 10;
        window.soundEngine.playDash();
      }
      return;
    }

    // Sector 4 Boss: Vortex Goliath (Titan Colosseum Arena)
    if (this.type === 'boss') {
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;

      platforms.forEach(p => {
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 16) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
      });

      if (this.x > 9000) {
        if (this.x < 10450) {
          this.x = 10450;
          this.vx = Math.abs(this.vx);
          this.facing = 1;
        } else if (this.x > 11520) {
          this.x = 11520;
          this.vx = -Math.abs(this.vx);
          this.facing = -1;
        }
      } else {
        if (this.x < 3990) {
          this.x = 3990;
          this.vx = Math.abs(this.vx);
          this.facing = 1;
        } else if (this.x > 4880) {
          this.x = 4880;
          this.vx = -Math.abs(this.vx);
          this.facing = -1;
        }
      }

      if (this.hp <= 750 && this.phase === 1) {
        this.phase = 2;
        screenShake = 16;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(this.x + 20, this.y - 30, '⚡ BOSS ENRAGED: PHASE 2! ⚡', '#ef4444'));

        if (!this.summonedMinions) {
          this.summonedMinions = true;
          enemies.push(new Enemy(this.x - 120, this.y - 80, 'drone'));
          enemies.push(new Enemy(this.x + 120, this.y - 80, 'drone'));
        }
      }

      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      if (this.stateTimer === 130) {
        this.state = 'telegraph_slam';
        floatingTexts.push(new FloatingText(this.x + 20, this.y - 20, '⚠ QUAKE SLAM INCOMING!', '#f59e0b'));
      } else if (this.stateTimer === 170) {
        this.state = 'idle';
        screenShake = 14;
        window.soundEngine.playExplosion();
        enemyProjectiles.push(new EnemyProjectile(this.x - 10, this.y + this.h - 10, -5.2, 0, 'shockwave'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w + 10, this.y + this.h - 10, 5.2, 0, 'shockwave'));
        for (let s = 0; s < 25; s++) {
          particles.push(new Particle(this.x + this.w / 2, this.y + this.h, (Math.random() - 0.5) * 8, -Math.random() * 5, '#f59e0b', 4, 25));
        }
      }

      if (this.stateTimer === 230) {
        window.soundEngine.playLaserCannon();
        const bDir = this.facing;
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 36, bDir * 4.5, -1.8, 'void_sphere'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 36, bDir * 5.2, 0, 'void_sphere'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 36, bDir * 4.5, 1.8, 'void_sphere'));
      }

      if (this.phase === 2 && this.stateTimer === 280) {
        this.vx = this.facing * 7.5;
        screenShake = 10;
        window.soundEngine.playDash();
        floatingTexts.push(new FloatingText(this.x, this.y - 24, 'ROCKET CHARGE!', '#ef4444'));
      }

      if (this.stateTimer > 340) {
        this.stateTimer = 0;
        this.vx = this.facing * (this.phase === 2 ? -2.2 : -1.4);
      }
      return;
    }

    // Sector 5 Grand Final Boss: Starfall Emperor Xenos (Citadel Throne)
    if (this.type === 'boss_final') {
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      platforms.forEach(p => {
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 16) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
      });
      if (this.x < 13450) {
        this.x = 13450;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 14700) {
        this.x = 14700;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }

      if (this.hp <= 1250 && this.phase === 1) {
        this.phase = 2;
        screenShake = 22;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(this.x, this.y - 35, '👑 EMPEROR ENRAGED: GOD OF THE VOID! 👑', '#c084fc'));
        enemies.push(new Enemy(this.x - 120, this.y - 60, 'astral_weaver'));
        enemies.push(new Enemy(this.x + 120, this.y - 60, 'astral_weaver'));
      }
      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      if (this.stateTimer % 110 === 60) {
        window.soundEngine.playLaserCannon();
        enemyProjectiles.push(new EnemyProjectile(this.x + (this.facing === 1 ? this.w : 0), this.y + 28, this.facing * 7.5, 0, 'starlight_ray'));
      }
      if (this.stateTimer % 170 === 120) {
        window.soundEngine.playLaserCannon();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 32, this.facing * 4.8, -1.8, 'void_sphere'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 32, this.facing * 4.8, 1.8, 'void_sphere'));
      }
      if (this.stateTimer % 260 === 200) {
        this.teleportBehindPlayer();
        this.vx = this.facing * (this.phase === 2 ? 8.5 : 6.0);
        screenShake = 12;
      }
      return;
    }

    // Level 1 Mini Boss: Blight Fang Behemoth (Ruins Arena: 2600 .. 3200)
    if (this.type === 'boss_treant') {
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      platforms.forEach(p => {
        if (p.type === 'hazard_spikes' || p.type === 'hazard_brambles' || p.type === 'hazard_lava' || p.type === 'hanging_rope') return;
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 36) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
      });
      if (this.x < 2600) {
        this.x = 2600;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 3170) {
        this.x = 3170;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }

      if (this.hp <= 450 && this.phase === 1) {
        this.phase = 2;
        screenShake = 16;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(this.x, this.y - 25, '⚡ BEHEMOTH FERAL ROAR! ⚡', '#84cc16'));
      }
      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      // Quake stomp shockwaves
      if (this.stateTimer % 130 === 80) {
        screenShake = 12;
        window.soundEngine.playExplosion();
        enemyProjectiles.push(new EnemyProjectile(this.x - 10, this.y + this.h - 12, -4.8, 0, 'shockwave'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w + 10, this.y + this.h - 12, 4.8, 0, 'shockwave'));
        for (let s = 0; s < 18; s++) {
          particles.push(new Particle(this.x + this.w / 2, this.y + this.h, (Math.random() - 0.5) * 8, -Math.random() * 5, '#84cc16', 3.5, 20));
        }
      }
      // Toxic Spore Salvo
      if (this.stateTimer % 190 === 130) {
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 20, this.facing * 4.5, -4.5, 'spore_ball'));
        if (this.phase === 2) {
          enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 20, this.facing * 3.2, -6.0, 'spore_ball'));
        }
      }
      // Phase 2 Feral Charge
      if (this.phase === 2 && this.stateTimer % 240 === 200) {
        this.vx = this.facing * 6.5;
        screenShake = 10;
        window.soundEngine.playDash();
        floatingTexts.push(new FloatingText(this.x, this.y - 20, 'BRAMBLE CRUSH!', '#65a30d'));
      }
      return;
    }

    // Level 1 Main Boss: The Blight Chimera (Sunken Hollow Arena: 4500 .. 5320)
    if (this.type === 'boss_chimera') {
      this.vy += GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      platforms.forEach(p => {
        if (p.type === 'hazard_spikes' || p.type === 'hazard_brambles' || p.type === 'hazard_lava' || p.type === 'hanging_rope') return;
        if (this.x + this.w > p.x && this.x < p.x + p.w &&
            this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 36) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        }
      });
      if (this.x < 4500) {
        this.x = 4500;
        this.vx = Math.abs(this.vx);
        this.facing = 1;
      } else if (this.x > 5300) {
        this.x = 5300;
        this.vx = -Math.abs(this.vx);
        this.facing = -1;
      }

      if (this.hp <= 900 && this.phase === 1) {
        this.phase = 2;
        screenShake = 22;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(this.x, this.y - 35, '☠ APEX MUTATION: CHIMERIC ROAR! ☠', '#a855f7'));
        enemies.push(new Enemy(this.x - 120, this.y - 60, 'bramble_drone'));
        enemies.push(new Enemy(this.x + 120, this.y - 60, 'bramble_drone'));
      }
      this.updateBossHud();
      this.stateTimer++;
      this.facing = player.x < this.x ? -1 : 1;

      // Pattern 1: Rapid 3-way Spore Volley
      if (this.stateTimer % 120 === 60) {
        window.soundEngine.playFireBlast();
        const dir = this.facing;
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 30, dir * 4.5, -2.5, 'spore_ball'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 30, dir * 5.2, 0, 'bramble_thorn'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 30, dir * 4.0, 2.0, 'bramble_thorn'));
      }
      // Pattern 2: Ground Quake Shockwave
      if (this.stateTimer % 180 === 120) {
        screenShake = 14;
        window.soundEngine.playExplosion();
        enemyProjectiles.push(new EnemyProjectile(this.x - 10, this.y + this.h - 14, -5.5, 0, 'shockwave'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w + 10, this.y + this.h - 14, 5.5, 0, 'shockwave'));
      }
      // Pattern 3: Phase 2 Apex Pounce & Shadow Warp
      if (this.phase === 2 && this.stateTimer % 230 === 180) {
        this.teleportBehindPlayer();
        this.vx = this.facing * 8.0;
        screenShake = 14;
        floatingTexts.push(new FloatingText(this.x, this.y - 25, 'CHIMERIC SHADOW POUNCE!', '#ef4444'));
      }
      return;
    }

    // ==========================================
    // 3. GROUND PATROL ENEMIES
    // ==========================================
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    this.isGrounded = false;
    platforms.forEach(p => {
      // Floor collision
      if (p.type === 'hazard_spikes' || p.type === 'hazard_brambles' || p.type === 'hazard_lava' || p.type === 'hanging_rope') return;
      if (this.x + this.w > p.x && this.x < p.x + p.w &&
          this.y + this.h >= p.y && this.y + this.h - this.vy <= p.y + 28) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.isGrounded = true;

        if (this.x <= p.x + 4 && this.vx < 0) {
          this.vx = Math.abs(this.vx);
          this.facing = 1;
        } else if (this.x + this.w >= p.x + p.w - 4 && this.vx > 0) {
          this.vx = -Math.abs(this.vx);
          this.facing = -1;
        }
      }

      // Wall collision
      if ((p.type === 'wall' || p.type === 'ruin_wall') && this.y + this.h > p.y && this.y < p.y + p.h) {
        if (this.x + this.w > p.x && this.x < p.x + p.w / 2 && this.vx > 0) {
          this.vx = -Math.abs(this.vx);
          this.facing = -1;
        } else if (this.x < p.x + p.w && this.x > p.x + p.w / 2 && this.vx < 0) {
          this.vx = Math.abs(this.vx);
          this.facing = 1;
        }
      }
    });

    // Special AI for Cyber Hound
    if (this.type === 'cyber_hound') {
      this.shootTimer++;
      if (this.shootTimer > 90 && Math.abs(this.x - player.x) < 240 && this.isGrounded) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        this.vy = -6.2;
        this.vx = this.facing * 5.4;
        window.soundEngine.playDash();
        floatingTexts.push(new FloatingText(this.x, this.y - 12, 'POUNCE!', '#ef4444'));
      }
    }

    // Special AI for Stone Gargoyle
    if (this.type === 'stone_gargoyle') {
      this.shootTimer++;
      if (this.shootTimer > 115 && Math.abs(this.x - player.x) < 300 && this.isGrounded) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        this.vy = -7.0;
        this.vx = this.facing * 4.6;
        window.soundEngine.playJump();
      }
    }

    // Special AI for Magma Slug
    if (this.type === 'magma_slug') {
      this.shootTimer++;
      if (this.shootTimer > 130 && Math.abs(this.x - player.x) < 450) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 6, this.facing * 3.8, -4.5, 'magma_pool'));
      }
    }

    // Special AI for Gladiator Berserker
    if (this.type === 'gladiator_berserker') {
      this.shootTimer++;
      if (this.shootTimer > 110 && Math.abs(this.x - player.x) < 180) {
        this.shootTimer = 0;
        this.state = 'whirlwind';
        this.stateTimer = 40;
        this.facing = player.x < this.x ? -1 : 1;
        this.vx = this.facing * 4.8;
        window.soundEngine.playKatanaSlash();
        floatingTexts.push(new FloatingText(this.x, this.y - 15, 'AXE WHIRLWIND!', '#ef4444'));
      }
      if (this.state === 'whirlwind') {
        this.stateTimer--;
        if (this.stateTimer <= 0) this.state = 'idle';
      }
    }

    // Special AI for Void Centurion
    if (this.type === 'void_centurion') {
      this.shootTimer++;
      if (this.shootTimer > 130 && Math.abs(this.x - player.x) < 220) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        this.vx = this.facing * 4.2;
        window.soundEngine.playDash();
        floatingTexts.push(new FloatingText(this.x, this.y - 12, 'SHIELD BASH!', '#38bdf8'));
      }
    }

    // Special AI for Astral Weaver
    if (this.type === 'astral_weaver') {
      if (this.teleportCooldown > 0) this.teleportCooldown--;
      this.shootTimer++;
      if (this.shootTimer > 120 && Math.abs(this.x - player.x) < 520) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        window.soundEngine.playLaserCannon();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 20, this.facing * 5.5, -1.0, 'starlight_ray'));
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 20, this.facing * 5.5, 1.0, 'starlight_ray'));
      }
    }

    // Special AI for Quantum Turret
    if (this.type === 'quantum_turret') {
      this.vx = 0;
      this.shootTimer++;
      if (this.shootTimer > 85 && Math.abs(this.x - player.x) < 550) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        window.soundEngine.playLaserCannon();
        enemyProjectiles.push(new EnemyProjectile(this.x + (this.facing === 1 ? this.w : 0), this.y + 16, this.facing * 6.5, 0, 'laser_bullet'));
      }
    }

    // Special AI for Shinobi (Shadow Ninja)
    if (this.type === 'shinobi') {
      if (this.teleportCooldown > 0) this.teleportCooldown--;
      this.shootTimer++;
      if (this.shootTimer > 100 && Math.abs(this.x - player.x) < 220) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        this.vx = this.facing * 5.8;
        window.soundEngine.playKatanaSlash();
        floatingTexts.push(new FloatingText(this.x, this.y - 12, 'SHADOW LUNGE!', '#a855f7'));
      }
    }

    // Special AI for Golem (Magma Rock Brute)
    if (this.type === 'golem') {
      this.shootTimer++;
      if (this.shootTimer > 150 && Math.abs(this.x - player.x) < 560) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 10, this.facing * 4.2, -6.8, 'magma_boulder'));
        floatingTexts.push(new FloatingText(this.x, this.y - 14, 'MOLTEN BOULDER!', '#f97316'));
      }
    }

    // Special AI for Walker (Cyber Armored Sentry)
    if (this.type === 'walker') {
      this.shootTimer++;
      if (this.shootTimer > 110 && Math.abs(this.x - player.x) < 500) {
        this.shootTimer = 0;
        const dir = player.x < this.x ? -3.8 : 3.8;
        this.facing = dir > 0 ? 1 : -1;
        enemyProjectiles.push(new EnemyProjectile(this.x + (this.facing === 1 ? this.w : 0), this.y + 16, dir, 0, 'plasma'));
      }
    }

    // Special AI for Blight Hound (Feral Corrupted Beast)
    if (this.type === 'blight_hound') {
      this.shootTimer++;
      if (this.shootTimer > 85 && Math.abs(this.x - player.x) < 230 && this.isGrounded) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        this.vy = -5.8;
        this.vx = this.facing * 5.2;
        window.soundEngine.playDash();
        floatingTexts.push(new FloatingText(this.x, this.y - 12, 'FERAL LUNGE!', '#84cc16'));
      }
    }

    // Special AI for Spore Spitter (Acidic Fungal Cannon)
    if (this.type === 'spore_spitter') {
      this.shootTimer++;
      if (this.shootTimer > 115 && Math.abs(this.x - player.x) < 480) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        window.soundEngine.playFireBlast();
        enemyProjectiles.push(new EnemyProjectile(this.x + this.w / 2, this.y + 12, this.facing * 4.0, -4.8, 'spore_ball'));
      }
    }

    // Special AI for Wood Stalker (Cursed Mask Assassin)
    if (this.type === 'wood_stalker') {
      this.shootTimer++;
      if (this.shootTimer > 105 && Math.abs(this.x - player.x) < 210) {
        this.shootTimer = 0;
        this.facing = player.x < this.x ? -1 : 1;
        this.vx = this.facing * 5.6;
        window.soundEngine.playKatanaSlash();
        floatingTexts.push(new FloatingText(this.x, this.y - 12, 'CURSED SLASH!', '#4d7c0f'));
      }
    }

    // World horizontal bounds
    if (this.x < 30) {
      this.x = 30;
      this.vx = Math.abs(this.vx);
      this.facing = 1;
    } else if (this.x > MAP_WIDTH - 60) {
      this.x = MAP_WIDTH - 60;
      this.vx = -Math.abs(this.vx);
      this.facing = -1;
    }

    if (this.y > MAP_HEIGHT + 60) {
      this.isDead = true;
    }
  }

  updateBossHud() {
    const bossBar = document.getElementById('boss-hud-bar');
    if (!bossBar) return;
    bossBar.classList.remove('hidden');

    const badge = document.getElementById('boss-skull-badge');
    if (badge) {
      badge.textContent = this.isFinalBoss ? '👑 FINAL BOSS' : '☠️ MINI BOSS';
    }
    const nameEl = document.getElementById('boss-name-text');
    if (nameEl) {
      nameEl.textContent = this.name || 'TITAN BOSS';
    }
    const phaseBadge = document.getElementById('boss-phase-badge');
    if (phaseBadge) {
      if (this.phase === 2) {
        phaseBadge.textContent = 'FASE 2: ENRAGED';
        phaseBadge.classList.add('enraged');
      } else {
        phaseBadge.textContent = 'FASE 1: ACTIVE';
        phaseBadge.classList.remove('enraged');
      }
    }

    const hpPct = Math.max(0, Math.min(100, (this.hp / this.maxHp) * 100));
    const hpFill = document.getElementById('boss-hp-fill');
    if (hpFill) hpFill.style.width = hpPct + '%';
    const hpGhost = document.getElementById('boss-hp-ghost');
    if (hpGhost) hpGhost.style.width = hpPct + '%';
    const hpText = document.getElementById('boss-hp-text');
    if (hpText) hpText.textContent = Math.max(0, this.hp) + ' / ' + this.maxHp + ' HP';
  }

  drawHpBar(ctx) {
    if (this.hp < this.maxHp && this.hpBarTimer > 0 && !this.isDead && !this.type.startsWith('boss')) {
      const barW = Math.max(32, this.w * 0.9);
      const barH = 5;
      const barX = this.x + (this.w - barW) / 2;
      const barY = this.y - 12;
      const pct = Math.max(0, this.hp / this.maxHp);

      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

      const fillColor = pct > 0.5 ? '#22c55e' : (pct > 0.25 ? '#eab308' : '#ef4444');
      ctx.fillStyle = fillColor;
      ctx.fillRect(barX, barY, barW * pct, barH);
      ctx.restore();
    }
  }

  draw(ctx) {
    ctx.save();
    if (this.flashTimer > 0) {
      ctx.filter = 'brightness(2.2)';
    }

    // Overhead Mini HP Bar
    this.drawHpBar(ctx);

    // ------------------------------------------------
    // 1. VOID DRONE (Flying Hunter)
    // ------------------------------------------------
    if (this.type === 'drone') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y + this.h / 2, 17, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing targeting lens
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x + (this.facing === -1 ? 8 : 28), this.y + this.h / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Spinning twin lift blades
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      const bladeW = Math.sin(Date.now() / 35) * 16;
      ctx.beginPath();
      ctx.moveTo(this.x + this.w / 2 - bladeW, this.y + 3);
      ctx.lineTo(this.x + this.w / 2 + bladeW, this.y + 3);
      ctx.stroke();

    // ------------------------------------------------
    // 2. ARMORED CYBER WALKER
    // ------------------------------------------------
    } else if (this.type === 'walker') {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h - 16, 6);
      ctx.fill();

      // Visor glowing amber slit
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillRect(this.x + (this.facing === -1 ? 4 : 32), this.y + 12, 12, 5);
      ctx.shadowBlur = 0;

      // Frontal Hexagonal Energy Shield Visual
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      const shieldX = this.facing === -1 ? this.x - 4 : this.x + this.w + 4;
      ctx.beginPath();
      ctx.moveTo(shieldX, this.y + 4);
      ctx.lineTo(shieldX + (this.facing === -1 ? -6 : 6), this.y + this.h / 2);
      ctx.lineTo(shieldX, this.y + this.h - 14);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Mechanical walking legs
      ctx.fillStyle = '#475569';
      const stride = Math.sin(Date.now() / 120) * 7;
      ctx.fillRect(this.x + 8, this.y + this.h - 16, 11, 16 + stride);
      ctx.fillRect(this.x + this.w - 19, this.y + this.h - 16, 11, 16 - stride);

    // ------------------------------------------------
    // 3. VOID SHINOBI (Agile Ninja Assassin)
    // ------------------------------------------------
    } else if (this.type === 'shinobi') {
      // Dark ninja cowl & scarf
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(this.x + 6, this.y + 10, this.w - 12, this.h - 22, 6);
      ctx.fill();

      // Glowing menacing purple ninja eyes
      ctx.fillStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 12;
      ctx.fillRect(this.x + (this.facing === -1 ? 8 : 22), this.y + 14, 8, 3);
      ctx.shadowBlur = 0;

      // Twin Shadow Katanas strapped to back
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.x + this.w / 2 - 8, this.y + 4);
      ctx.lineTo(this.x + this.w / 2 + 14, this.y + 36);
      ctx.stroke();

      // Running legs
      ctx.fillStyle = '#1e1b4b';
      const legCycle = Math.sin(Date.now() / 80) * 8;
      ctx.fillRect(this.x + 8, this.y + this.h - 14, 8, 14 + legCycle);
      ctx.fillRect(this.x + this.w - 16, this.y + this.h - 14, 8, 14 - legCycle);

    // ------------------------------------------------
    // 4. MAGMA GOLEM (Volcanic Stone Brute)
    // ------------------------------------------------
    } else if (this.type === 'golem') {
      // Rocky dark volcanic basalt torso
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.w, this.h - 14, 10);
      ctx.fill();

      // Glowing magma cracks running down chest
      ctx.strokeStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.x + 12, this.y + 8);
      ctx.lineTo(this.x + 24, this.y + 26);
      ctx.lineTo(this.x + 18, this.y + 44);
      ctx.moveTo(this.x + 36, this.y + 12);
      ctx.lineTo(this.x + 44, this.y + 34);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Magma core eye
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(this.x + (this.facing === -1 ? 14 : 44), this.y + 14, 5, 0, Math.PI * 2);
      ctx.fill();

      // Heavy stone pillar legs
      ctx.fillStyle = '#292524';
      ctx.fillRect(this.x + 6, this.y + this.h - 16, 16, 16);
      ctx.fillRect(this.x + this.w - 22, this.y + this.h - 16, 16, 16);

    // ------------------------------------------------
    // 5. MINI BOSS: VORTEX GOLIATH (Colosseum Titan)
    // ------------------------------------------------
    } else if (this.type === 'boss') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;

      // Heavy Robotic Titan Torso with ancient gold runes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(bx, by + 12, bw, bh - 32, 12);
      ctx.fill();

      // Ancient Gold Armor Shoulder Pauldrons
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx - 8, by + 12, 16, 26);
      ctx.fillRect(bx + bw - 8, by + 12, 16, 26);

      // Central Swirling Gravitational Vortex Reactor Core
      const coreColor = this.phase === 2 ? '#ef4444' : '#00f5ff';
      const corePulse = Math.sin(Date.now() / 150) * 3;
      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + 46, 14 + corePulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Titan Head & Crown
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx + bw / 2 - 16, by - 12, 32, 24);
      // Red / Cyan Visor Slit
      ctx.fillStyle = coreColor;
      ctx.fillRect(bx + bw / 2 - 12, by - 4, 24, 6);

      // Giant Hydraulic Hammer Fist
      ctx.fillStyle = '#334155';
      const fistX = this.facing === -1 ? bx - 14 : bx + bw + 4;
      ctx.fillRect(fistX, by + 34, 18, 30);
      // Hammer head
      ctx.fillStyle = '#eab308';
      ctx.fillRect(fistX - 4, by + 56, 26, 14);

      // Massive Hydraulic Tread / Leg Columns
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx + 10, by + bh - 24, 24, 24);
      ctx.fillRect(bx + bw - 34, by + bh - 24, 24, 24);

      // Enraged Phase 2 Aura Lightning Crackles
      if (this.phase === 2) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        for (let l = 0; l < 3; l++) {
          ctx.beginPath();
          ctx.moveTo(bx + Math.random() * bw, by + Math.random() * bh);
          ctx.lineTo(bx + Math.random() * bw, by + Math.random() * bh);
          ctx.stroke();
        }
      }

    // ------------------------------------------------
    // 6. CYBER HOUND (Sector 1 Mecha Quadruped)
    // ------------------------------------------------
    } else if (this.type === 'cyber_hound') {
      ctx.fillStyle = '#1e293b';
      // Main mechanical canine torso
      ctx.beginPath();
      ctx.roundRect(this.x + 4, this.y + 10, this.w - 8, this.h - 18, 6);
      ctx.fill();
      // Glowing crimson sensor eye visor
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      const eyeX = this.facing === -1 ? this.x + 6 : this.x + this.w - 14;
      ctx.fillRect(eyeX, this.y + 12, 8, 4);
      ctx.shadowBlur = 0;
      // Cyber ear antenna
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x + (this.facing === -1 ? 14 : this.w - 14), this.y + 10);
      ctx.lineTo(this.x + (this.facing === -1 ? 8 : this.w - 8), this.y + 2);
      ctx.stroke();
      // Quad legs
      ctx.fillStyle = '#475569';
      const legRun = Math.sin(Date.now() / 60) * 8;
      ctx.fillRect(this.x + 8, this.y + this.h - 12, 6, 12 + legRun);
      ctx.fillRect(this.x + 18, this.y + this.h - 12, 6, 12 - legRun);
      ctx.fillRect(this.x + this.w - 24, this.y + this.h - 12, 6, 12 - legRun);
      ctx.fillRect(this.x + this.w - 14, this.y + this.h - 12, 6, 12 + legRun);

    // ------------------------------------------------
    // 7. RUIN SPECTER (Sector 2 Elysium Ghost Wraith)
    // ------------------------------------------------
    } else if (this.type === 'ruin_specter') {
      const floatWave = Math.sin(Date.now() / 150) * 4;
      // Flowing ethereal ghostly cowl & cape
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.moveTo(this.x + this.w / 2, this.y);
      ctx.lineTo(this.x + this.w, this.y + this.h - 6 + floatWave);
      ctx.lineTo(this.x + this.w / 2, this.y + this.h - 14);
      ctx.lineTo(this.x, this.y + this.h - 6 - floatWave);
      ctx.closePath();
      ctx.fill();
      // Glowing emerald phantom eye
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Floating golden ancient rune ring
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + 16, 11, 0, Math.PI * 2);
      ctx.stroke();

    // ------------------------------------------------
    // 8. STONE GARGOYLE (Sector 2 Ancient Stone Behemoth)
    // ------------------------------------------------
    } else if (this.type === 'stone_gargoyle') {
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(this.x + 6, this.y + 10, this.w - 12, this.h - 18, 6);
      ctx.fill();
      // Stone bat wings
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(this.x + this.w / 2, this.y + 14);
      ctx.lineTo(this.x - 8, this.y + 2);
      ctx.lineTo(this.x + 4, this.y + 24);
      ctx.moveTo(this.x + this.w / 2, this.y + 14);
      ctx.lineTo(this.x + this.w + 8, this.y + 2);
      ctx.lineTo(this.x + this.w - 4, this.y + 24);
      ctx.fill();
      // Amber stone eyes
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(this.x + (this.facing === -1 ? 8 : this.w - 16), this.y + 14, 6, 4);

    // ------------------------------------------------
    // 9. MAGMA SLUG (Sector 3 Volcanic Lava Slug)
    // ------------------------------------------------
    } else if (this.type === 'magma_slug') {
      // Obsidian shell
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.ellipse(this.x + this.w / 2, this.y + 12, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      // Molten orange underbelly
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 10;
      ctx.fillRect(this.x + 4, this.y + this.h - 8, this.w - 8, 6);
      ctx.shadowBlur = 0;
      // Burning antenna
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(this.x + (this.facing === -1 ? 6 : this.w - 10), this.y + 2, 4, 6);

    // ------------------------------------------------
    // 10. PYRO DRAKE (Sector 3 Flying Fire Drake)
    // ------------------------------------------------
    } else if (this.type === 'pyro_drake') {
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.roundRect(this.x + 8, this.y + 12, this.w - 16, this.h - 20, 6);
      ctx.fill();
      // Flapping fiery draconic wings
      const wingFlap = Math.sin(Date.now() / 60) * 12;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(this.x + this.w / 2, this.y + 16);
      ctx.lineTo(this.x - 14, this.y + 4 + wingFlap);
      ctx.lineTo(this.x + 6, this.y + 26);
      ctx.moveTo(this.x + this.w / 2, this.y + 16);
      ctx.lineTo(this.x + this.w + 14, this.y + 4 + wingFlap);
      ctx.lineTo(this.x + this.w - 6, this.y + 26);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Burning eye slit
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(this.x + (this.facing === -1 ? 10 : this.w - 16), this.y + 14, 6, 4);

    // ------------------------------------------------
    // 11. GLADIATOR BERSERKER (Sector 4 Arena Dual Axe)
    // ------------------------------------------------
    } else if (this.type === 'gladiator_berserker') {
      // Spiked gladiator breastplate
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.roundRect(this.x + 6, this.y + 10, this.w - 12, this.h - 22, 6);
      ctx.fill();
      // Spiked shoulder horns
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(this.x + 2, this.y + 8, 8, 10);
      ctx.fillRect(this.x + this.w - 10, this.y + 8, 8, 10);
      // Crimson glowing visor
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillRect(this.x + (this.facing === -1 ? 8 : this.w - 18), this.y + 14, 10, 4);
      ctx.shadowBlur = 0;
      // Dual War Axes
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.x + 2, this.y + 20);
      ctx.lineTo(this.x - 8, this.y + 40);
      ctx.moveTo(this.x + this.w - 2, this.y + 20);
      ctx.lineTo(this.x + this.w + 8, this.y + 40);
      ctx.stroke();

    // ------------------------------------------------
    // 12. VOID CENTURION (Sector 4 Heavy Shieldbearer)
    // ------------------------------------------------
    } else if (this.type === 'void_centurion') {
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.roundRect(this.x + 8, this.y + 12, this.w - 16, this.h - 24, 6);
      ctx.fill();
      // Frontal Roman-Galactic Tower Shield
      ctx.fillStyle = '#0f172a';
      const shieldCentX = this.facing === -1 ? this.x - 2 : this.x + this.w - 12;
      ctx.fillRect(shieldCentX, this.y + 4, 14, this.h - 8);
      ctx.strokeStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.strokeRect(shieldCentX, this.y + 4, 14, this.h - 8);
      ctx.shadowBlur = 0;
      // Helmet crest plume
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(this.x + this.w / 2 - 4, this.y + 2, 8, 8);

    // ------------------------------------------------
    // 13. ASTRAL WEAVER (Sector 5 Cosmic Star Sorceress)
    // ------------------------------------------------
    } else if (this.type === 'astral_weaver') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(this.x + 6, this.y + 12, this.w - 12, this.h - 22, 6);
      ctx.fill();
      // Floating celestial star crown
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2, this.y + 4, 5, 0, Math.PI * 2);
      ctx.fill();
      // Orbiting starlight focus catalysts
      const rot = Date.now() / 200;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x + this.w / 2 + Math.cos(rot) * 16, this.y + 26 + Math.sin(rot) * 6, 3.5, 0, Math.PI * 2);
      ctx.arc(this.x + this.w / 2 - Math.cos(rot) * 16, this.y + 26 - Math.sin(rot) * 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    // ------------------------------------------------
    // 14. QUANTUM TURRET (Sector 5 Defense Pod)
    // ------------------------------------------------
    } else if (this.type === 'quantum_turret') {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(this.x, this.y + 16, this.w, this.h - 16, 6);
      ctx.fill();
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.x, this.y + 16, this.w, this.h - 16);
      // Swiveling double laser barrels
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      const barrelX = this.facing === -1 ? this.x - 10 : this.x + this.w;
      ctx.fillRect(barrelX, this.y + 20, 10, 4);
      ctx.fillRect(barrelX, this.y + 28, 10, 4);
      ctx.shadowBlur = 0;

    // ------------------------------------------------
    // 15. MINI BOSS: MECHA ENFORCER D-01 (Sector 1)
    // ------------------------------------------------
    } else if (this.type === 'boss_mech') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      // Armored Chassis
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(bx, by + 10, bw, bh - 24, 10);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by + 10, bw, bh - 24);
      // Wide red cockpit visor scanner
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.fillRect(bx + bw / 2 - 16, by + 18, 32, 8);
      ctx.shadowBlur = 0;
      // Gatling Cannon Arm
      const gX = this.facing === -1 ? bx - 16 : bx + bw;
      ctx.fillStyle = '#475569';
      ctx.fillRect(gX, by + 34, 16, 12);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(gX - (this.facing === -1 ? 8 : 0), by + 36, 8, 8);
      // Shoulder Micro-Missile Pod
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx + (this.facing === -1 ? bw - 14 : -4), by + 6, 18, 14);
      // Hydraulic legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx + 8, by + bh - 18, 18, 18);
      ctx.fillRect(bx + bw - 26, by + bh - 18, 18, 18);

    // ------------------------------------------------
    // 16. MINI BOSS: ELYSIUM COLOSSUS (Sector 2)
    // ------------------------------------------------
    } else if (this.type === 'boss_colossus') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      // Ancient stone monolith torso
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(bx, by + 10, bw, bh - 26, 12);
      ctx.fill();
      // Glowing emerald ancient crystal heart
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + 48, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Mossy overgrown stone shoulders
      ctx.fillStyle = '#15803d';
      ctx.fillRect(bx - 6, by + 10, 16, 24);
      ctx.fillRect(bx + bw - 10, by + 10, 16, 24);
      // Stone head & amber eyes
      ctx.fillStyle = '#292524';
      ctx.fillRect(bx + bw / 2 - 16, by - 10, 32, 22);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx + bw / 2 - 10, by - 2, 20, 5);
      // Massive stone fists
      ctx.fillStyle = '#292524';
      ctx.fillRect(bx + 6, by + bh - 20, 24, 20);
      ctx.fillRect(bx + bw - 30, by + bh - 20, 24, 20);

    // ------------------------------------------------
    // 17. MINI BOSS: IGNIS WYRM QUEEN (Sector 3)
    // ------------------------------------------------
    } else if (this.type === 'boss_drake') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      // Serpentine dragon body
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.ellipse(bx + bw / 2, by + bh / 2, bw / 2 - 4, bh / 2 - 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Massive sweeping draconic wings
      const wFlap = Math.sin(Date.now() / 100) * 16;
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2, by + 20);
      ctx.lineTo(bx - 26, by - 6 + wFlap);
      ctx.lineTo(bx + 10, by + bh - 10);
      ctx.moveTo(bx + bw / 2, by + 20);
      ctx.lineTo(bx + bw + 26, by - 6 + wFlap);
      ctx.lineTo(bx + bw - 10, by + bh - 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Roaring lava throat & glowing eyes
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(bx + (this.facing === -1 ? 16 : bw - 16), by + 24, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    // ------------------------------------------------
    // 18. GRAND FINAL BOSS: STARFALL EMPEROR XENOS (Sector 5)
    // ------------------------------------------------
    } else if (this.type === 'boss_final') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      // Void Imperial Robe
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(bx + 8, by + 16, bw - 16, bh - 32, 12);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 16;
      ctx.strokeRect(bx + 8, by + 16, bw - 16, bh - 32);
      ctx.shadowBlur = 0;
      // Imperial Celestial Crown
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(bx + bw / 2 - 16, by - 14, 32, 12);
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2 - 16, by - 14);
      ctx.lineTo(bx + bw / 2 - 8, by - 24);
      ctx.lineTo(bx + bw / 2, by - 14);
      ctx.lineTo(bx + bw / 2 + 8, by - 24);
      ctx.lineTo(bx + bw / 2 + 16, by - 14);
      ctx.closePath();
      ctx.fill();
      // Glowing imperial visor & eyes
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 18;
      ctx.fillRect(bx + bw / 2 - 12, by + 2, 24, 6);
      ctx.shadowBlur = 0;
      // Dual Cosmic Sabers
      ctx.strokeStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 16;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by + 18);
      ctx.lineTo(bx - 26, by + bh - 10);
      ctx.stroke();
      ctx.strokeStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.beginPath();
      ctx.moveTo(bx + bw + 12, by + 18);
      ctx.lineTo(bx + bw + 26, by + bh - 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Heavy imperial boots
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(bx + 14, by + bh - 20, 20, 20);
      ctx.fillRect(bx + bw - 34, by + bh - 20, 20, 20);
      // Phase 2 Cosmic Aura
      if (this.phase === 2) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        for (let l = 0; l < 4; l++) {
          ctx.beginPath();
          ctx.moveTo(bx + Math.random() * bw, by + Math.random() * bh);
          ctx.lineTo(bx + Math.random() * bw, by + Math.random() * bh);
          ctx.stroke();
        }
      }

    // ------------------------------------------------
    // 16. BLIGHT HOUND (Level 1 Feral Corrupted Hound)
    // ------------------------------------------------
    } else if (this.type === 'blight_hound') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.roundRect(bx, by + 6, bw, bh - 14, 6);
      ctx.fill();
      ctx.fillStyle = '#3f6212';
      ctx.fillRect(bx + 6, by + 2, bw - 14, 5);
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bx + 14, by + 4, 3, 0, Math.PI * 2);
      ctx.arc(bx + 26, by + 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      const eyeX = this.facing === -1 ? bx + 6 : bx + bw - 12;
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(eyeX, by + 10, 6, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.shadowBlur = 0;
      const fangX = this.facing === -1 ? bx + 2 : bx + bw - 6;
      ctx.fillRect(fangX, by + 16, 4, 4);
      ctx.fillStyle = '#292524';
      const stride = Math.sin(Date.now() / 70) * 6;
      ctx.fillRect(bx + 6, by + bh - 10, 7, 10 + stride);
      ctx.fillRect(bx + bw - 14, by + bh - 10, 7, 10 - stride);

    // ------------------------------------------------
    // 17. SPORE SPITTER (Level 1 Acidic Fungal Cannon)
    // ------------------------------------------------
    } else if (this.type === 'spore_spitter') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + 18, 16, Math.PI, 0, false);
      ctx.lineTo(bx + bw - 4, by + 30);
      ctx.lineTo(bx + 4, by + 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(bx + bw / 2 - 6, by + 10, 4, 0, Math.PI * 2);
      ctx.arc(bx + bw / 2 + 7, by + 8, 3.5, 0, Math.PI * 2);
      ctx.arc(bx + bw / 2, by + 16, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      const snoutX = this.facing === -1 ? bx - 2 : bx + bw - 10;
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(snoutX, by + 20, 12, 8);
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(snoutX + (this.facing === -1 ? 0 : 8), by + 22, 4, 4);
      ctx.fillStyle = '#1c1917';
      const rootWiggle = Math.sin(Date.now() / 140) * 4;
      ctx.fillRect(bx + 6, by + bh - 12, 6, 12 + rootWiggle);
      ctx.fillRect(bx + bw / 2 - 3, by + bh - 12, 6, 12 - rootWiggle);
      ctx.fillRect(bx + bw - 12, by + bh - 12, 6, 12 + rootWiggle);

    // ------------------------------------------------
    // 18. WOOD STALKER (Level 1 Cursed Mask Assassin)
    // ------------------------------------------------
    } else if (this.type === 'wood_stalker') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.roundRect(bx + 6, by + 12, bw - 12, bh - 20, 6);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(bx + bw / 2 - 9, by + 4, 18, 16, 3);
      ctx.fill();
      ctx.strokeStyle = '#a16207';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx + bw / 2 - 9, by + 4, 18, 16);
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 10;
      const eX = this.facing === -1 ? bx + bw / 2 - 6 : bx + bw / 2;
      ctx.fillRect(eX, by + 10, 6, 3);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#65a30d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const bladeX = this.facing === -1 ? bx - 6 : bx + bw + 6;
      ctx.moveTo(bx + bw / 2, by + 24);
      ctx.quadraticCurveTo(bladeX, by + 14, bladeX, by + 34);
      ctx.stroke();
      ctx.fillStyle = '#052e16';
      const stalkStride = Math.sin(Date.now() / 90) * 6;
      ctx.fillRect(bx + 8, by + bh - 10, 7, 10 + stalkStride);
      ctx.fillRect(bx + bw - 15, by + bh - 10, 7, 10 - stalkStride);

    // ------------------------------------------------
    // 19. BRAMBLE DRONE (Level 1 Flying Thorn Drone)
    // ------------------------------------------------
    } else if (this.type === 'bramble_drone') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.arc(bx + bw / 2, by + bh / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4d7c0f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(bx + (this.facing === -1 ? bw / 2 - 3 : bw / 2 + 3), by + bh / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      const droneRot = Date.now() / 140;
      ctx.fillStyle = '#65a30d';
      for (let th = 0; th < 4; th++) {
        const ang = droneRot + (th * Math.PI / 2);
        const thX = bx + bw / 2 + Math.cos(ang) * 16;
        const thY = by + bh / 2 + Math.sin(ang) * 16;
        ctx.beginPath();
        ctx.moveTo(thX, thY);
        ctx.lineTo(thX + Math.cos(ang) * 6, thY + Math.sin(ang) * 6);
        ctx.stroke();
      }

    // ------------------------------------------------
    // 20. MINI BOSS: BLIGHT FANG BEHEMOTH (Level 1)
    // ------------------------------------------------
    } else if (this.type === 'boss_treant') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      ctx.fillStyle = '#271c19';
      ctx.beginPath();
      ctx.roundRect(bx + 4, by + 16, bw - 8, bh - 32, 12);
      ctx.fill();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx + 4, by + 16, bw - 8, bh - 32);
      ctx.strokeStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(bx + 18, by + 26);
      ctx.lineTo(bx + 34, by + 50);
      ctx.lineTo(bx + 26, by + 74);
      ctx.moveTo(bx + bw - 22, by + 30);
      ctx.lineTo(bx + bw - 38, by + 60);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(bx + 16, by + 16);
      ctx.lineTo(bx - 6, by - 8);
      ctx.lineTo(bx + 6, by - 12);
      ctx.lineTo(bx + 28, by + 12);
      ctx.moveTo(bx + bw - 16, by + 16);
      ctx.lineTo(bx + bw + 6, by - 8);
      ctx.lineTo(bx + bw - 6, by - 12);
      ctx.lineTo(bx + bw - 28, by + 12);
      ctx.fill();
      const faceX = this.facing === -1 ? bx + 12 : bx + bw - 36;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(faceX, by + 30, 24, 18);
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 14;
      ctx.fillRect(faceX + 4, by + 32, 8, 5);
      ctx.fillStyle = '#f8fafc';
      ctx.shadowBlur = 0;
      ctx.fillRect(faceX + 2, by + 40, 5, 8);
      ctx.fillRect(faceX + 16, by + 40, 5, 8);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(bx + 12, by + bh - 24, 22, 24);
      ctx.fillRect(bx + bw - 34, by + bh - 24, 22, 24);
      if (this.phase === 2) {
        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#a3e635';
        ctx.shadowBlur = 18;
        for (let l = 0; l < 4; l++) {
          ctx.beginPath();
          ctx.arc(bx + Math.random() * bw, by + Math.random() * bh, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

    // ------------------------------------------------
    // 21. MAIN BOSS: THE BLIGHT CHIMERA (Level 1 Apex Anomaly)
    // ------------------------------------------------
    } else if (this.type === 'boss_chimera') {
      const bx = this.x;
      const by = this.y;
      const bw = this.w;
      const bh = this.h;
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.roundRect(bx + 8, by + 20, bw - 16, bh - 36, 14);
      ctx.fill();
      ctx.strokeStyle = '#7e22ce';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 16;
      ctx.strokeRect(bx + 8, by + 20, bw - 16, bh - 36);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      const wingDir = this.facing === -1 ? 1 : -1;
      ctx.moveTo(bx + bw / 2, by + 28);
      ctx.quadraticCurveTo(bx + bw / 2 + wingDir * 60, by - 16, bx + bw / 2 + wingDir * 40, by + 36);
      ctx.fill();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.stroke();
      const chEyeX = this.facing === -1 ? bx + 16 : bx + bw - 36;
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.fillRect(chEyeX, by + 28, 6, 4);
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.fillRect(chEyeX + 8, by + 26, 6, 4);
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#84cc16';
      ctx.fillRect(chEyeX + 4, by + 34, 6, 4);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#18181b';
      ctx.fillRect(chEyeX - 4, by + 42, 22, 14);
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(chEyeX, by + 52, 4, 6);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(bx + 14, by + bh - 24, 24, 24);
      ctx.fillRect(bx + bw - 38, by + bh - 24, 24, 24);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(bx + 10, by + bh - 6, 8, 6);
      ctx.fillRect(bx + bw - 22, by + bh - 6, 8, 6);
      if (this.phase === 2) {
        ctx.strokeStyle = '#a855f7';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 22;
        ctx.lineWidth = 2.5;
        for (let l = 0; l < 5; l++) {
          ctx.beginPath();
          ctx.moveTo(bx + Math.random() * bw, by + Math.random() * bh);
          ctx.lineTo(bx + Math.random() * bw, by + Math.random() * bh);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }
}

class EnemyProjectile {
  constructor(x, y, vx, vy = 0, type = 'plasma') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.r = (type === 'void_sphere' || type === 'fireball' || type === 'spore_ball') ? 12 :
             (type === 'magma_boulder' ? 9 :
             (type === 'ethereal_orb' ? 8 :
             (type === 'micro_missile' ? 6 : (type === 'bramble_thorn' ? 5 : 4.5))));
    this.w = type === 'shockwave' ? 26 : (type === 'starlight_ray' ? 24 : (type === 'bramble_thorn' ? 18 : this.r * 2));
    this.h = type === 'shockwave' ? 24 : (type === 'starlight_ray' ? 8 : (type === 'bramble_thorn' ? 6 : this.r * 2));
    this.life = type === 'shockwave' ? 160 : (type === 'micro_missile' ? 220 : 180);
    this.smokeTimer = 0;
  }

  update() {
    if (this.type === 'magma_boulder' || this.type === 'magma_pool' || this.type === 'fireball' || this.type === 'spore_ball') {
      this.vy += (this.type === 'magma_pool' ? 0.38 : (this.type === 'spore_ball' ? 0.24 : 0.28)); // Parabolic gravity
      this.x += this.vx;
      this.y += this.vy;

      // Explode into ground hazard flame / poison puddle when hitting platform
      platforms.forEach(p => {
        if (this.x + this.r > p.x && this.x - this.r < p.x + p.w &&
            this.y + this.r >= p.y && this.y - this.r <= p.y + p.h) {
          if (this.type === 'spore_ball') {
            for (let sp = 0; sp < 12; sp++) {
              particles.push(new Particle(this.x, p.y - 4, (Math.random() - 0.5) * 6, -Math.random() * 4, '#84cc16', 3.5, 24));
            }
            window.soundEngine.playFireBlast();
          } else {
            groundFlames.push(new GroundFlame(this.x - 14, p.y - 18));
            window.soundEngine.playFireBlast();
          }
          this.life = 0;
        }
      });

    } else if (this.type === 'micro_missile') {
      // Homing physics towards player
      const angle = Math.atan2((player.y + player.h / 2) - this.y, (player.x + player.w / 2) - this.x);
      this.vx += Math.cos(angle) * 0.24;
      this.vy += Math.sin(angle) * 0.24;
      const spd = Math.hypot(this.vx, this.vy);
      if (spd > 5.5) {
        this.vx = (this.vx / spd) * 5.5;
        this.vy = (this.vy / spd) * 5.5;
      }
      this.x += this.vx;
      this.y += this.vy;

      // Trailing exhaust smoke puffs
      this.smokeTimer++;
      if (this.smokeTimer % 3 === 0) {
        particles.push(new Particle(this.x, this.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, '#94a3b8', 2.5, 18));
      }

    } else if (this.type === 'ethereal_orb') {
      // Sinusoidal wavy floating motion toward player
      this.x += this.vx;
      this.y += this.vy + Math.sin(Date.now() / 120 + this.x * 0.05) * 1.8;

    } else if (this.type === 'shockwave') {
      this.x += this.vx;
      // Kick up stone dust
      if (Math.random() > 0.4) {
        particles.push(new Particle(this.x + 12, this.y + 20, (Math.random() - 0.5) * 3, -Math.random() * 3, '#f59e0b', 3, 16));
      }

    } else {
      this.x += this.vx;
      this.y += this.vy;
    }

    this.life--;
  }

  draw(ctx) {
    ctx.save();
    if (this.type === 'void_sphere') {
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'magma_boulder' || this.type === 'magma_pool') {
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(this.x - 3, this.y - 3, 6, 6);

    } else if (this.type === 'fireball') {
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#ea580c';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r * 0.55, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'micro_missile') {
      ctx.fillStyle = '#475569';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(this.x - Math.sign(this.vx) * 3, this.y, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'ethereal_orb') {
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'starlight_ray') {
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 14;
      ctx.fillRect(this.x - 12, this.y - 3, 24, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 8, this.y - 1.5, 16, 3);

    } else if (this.type === 'laser_bullet') {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillRect(this.x - 9, this.y - 2.5, 18, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(this.x - 5, this.y - 1, 10, 2);

    } else if (this.type === 'shockwave') {
      // Ground seismic crest wave
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + 24);
      ctx.lineTo(this.x + 13, this.y);
      ctx.lineTo(this.x + 26, this.y + 24);
      ctx.closePath();
      ctx.fill();

    } else if (this.type === 'spore_ball') {
      ctx.fillStyle = '#84cc16';
      ctx.shadowColor = '#a3e635';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(this.x - 2, this.y - 2, this.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4d7c0f';
      ctx.fillRect(this.x + 3, this.y + 2, 3, 3);

    } else if (this.type === 'bramble_thorn') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.atan2(this.vy, this.vx));
      ctx.fillStyle = '#65a30d';
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-8, -3);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    } else {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ============================================================================
// CONTROLS & INPUT SYSTEM (HOLLOW KNIGHT STYLE)
// ============================================================================
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
  if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.up = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.down = true;

  // Space ONLY for Jump (W does not jump!)
  if (e.code === 'Space') {
    if (!keys.jump && currentState === STATES.PLAYING) triggerJump();
    keys.jump = true;
  }

  // Key E for Unique Hero Skill
  if (e.code === 'KeyE') {
    if (!keys.skill && currentState === STATES.PLAYING) triggerHeroSkill();
    keys.skill = true;
  }

  // Key J for Attack
  if (e.code === 'KeyJ') {
    if (currentState === STATES.PLAYING) triggerHeroAttack();
    keys.fire = true;
  }

  // Dash
  if (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    if (currentState === STATES.PLAYING) triggerDash();
    keys.dash = true;
  }

  // Key F for Lore Interaction
  if (e.code === 'KeyF') {
    const loreModal = document.getElementById('lore-modal');
    if (loreModal && !loreModal.classList.contains('hidden')) {
      closeLoreModal();
    } else if (activeLoreTabletNear && currentState === STATES.PLAYING) {
      openLoreTablet(activeLoreTabletNear);
    }
  }

  if (e.code === 'Escape') {
    const loreModal = document.getElementById('lore-modal');
    if (loreModal && !loreModal.classList.contains('hidden')) {
      closeLoreModal();
      return;
    }
    if (currentState === STATES.PLAYING) openPauseMenu();
    else if (currentState === STATES.PAUSED) resumeGame();
    return;
  }

  if (e.code === 'KeyP') {
    if (currentState === STATES.PLAYING) openPauseMenu();
    else if (currentState === STATES.PAUSED) resumeGame();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
  if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.up = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.down = false;
  if (e.code === 'Space') keys.jump = false;
  if (e.code === 'KeyE') keys.skill = false;
  if (e.code === 'KeyJ') keys.fire = false;
  if (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.dash = false;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 && currentState === STATES.PLAYING) {
    triggerHeroAttack();
  }
});

function setupMobileControls() {
  const bindTouch = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); });
    el.addEventListener('touchend', (e) => { e.preventDefault(); if (onUp) onUp(); });
  };

  bindTouch('btn-left', () => { keys.left = true; }, () => { keys.left = false; });
  bindTouch('btn-right', () => { keys.right = true; }, () => { keys.right = false; });
  bindTouch('btn-aim-up', () => { keys.up = true; }, () => { keys.up = false; });
  bindTouch('btn-crouch', () => { keys.down = true; }, () => { keys.down = false; });
  bindTouch('btn-jump', () => { triggerJump(); });
  bindTouch('btn-dash', () => { triggerDash(); });
  bindTouch('btn-skill', () => { triggerHeroSkill(); });
  bindTouch('btn-fire', () => { triggerHeroAttack(); });
}

// ============================================================================
// PLAYER ACTIONS & COMBAT ENGINE (CYBER RONIN SLASH & DEFLECT)
// ============================================================================
function triggerJump() {
  // Check Rope / Vine Jump First!
  if (player.isClimbing) {
    player.isClimbing = false;
    player.vy = -12.0;
    player.vx = player.facing * 5.2;
    player.standingPlatform = null;
    player.isGrounded = false;
    player.jumpCount = 1;
    player.scaleY = 1.30;
    player.scaleX = 0.80;
    window.soundEngine.playJump();
    return;
  }

  // Check Wall Jump First!
  if (player.isWallSliding) {
    player.vy = -12.6;
    player.vx = -player.wallDirection * 8.8;
    player.facing = -player.wallDirection;
    player.isWallSliding = false;
    player.standingPlatform = null;
    player.scaleY = 1.35;
    player.scaleX = 0.78;
    window.soundEngine.playJump();

    for (let i = 0; i < 10; i++) {
      particles.push(new Particle(
        player.x + (player.facing === 1 ? 0 : player.w),
        player.y + player.h / 2,
        player.facing * (Math.random() * 3 + 1.5),
        (Math.random() - 0.5) * 3.5,
        player.activeThemeColor,
        Math.random() * 3 + 2,
        22
      ));
    }
    return;
  }

  // Normal / Double Jump
  if (player.jumpCount < player.maxJumps) {
    player.vy = -12.5;
    player.jumpCount++;
    player.isGrounded = false;
    player.standingPlatform = null;
    player.scaleY = 1.30;
    player.scaleX = 0.80;

    window.soundEngine.playJump();

    if (player.jumpCount === 2) {
      // Double Jump: Radiant Monarch Shockwave Ring Burst
      player.scaleY = 1.40;
      player.scaleX = 0.75;
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        particles.push(new Particle(
          player.x + player.w / 2 + Math.cos(ang) * 10,
          player.y + player.h - 4 + Math.sin(ang) * 4,
          Math.cos(ang) * 3.8,
          Math.sin(ang) * 1.6 + 1.2,
          player.activeThemeColor,
          Math.random() * 3.5 + 2.5,
          26
        ));
      }
    } else {
      // Ground Jump: Ground blast dust puffs
      for (let i = 0; i < 8; i++) {
        particles.push(new Particle(
          player.x + player.w / 2 + (Math.random() * 14 - 7),
          player.y + player.h,
          (Math.random() * 2 - 1) * 2.2,
          Math.random() * 2 + 1.2,
          'rgba(148, 163, 184, 0.8)',
          Math.random() * 3 + 2,
          20,
          'circle'
        ));
      }
    }
  }
}

function triggerDash() {
  if (player.dashCooldown <= 0 && !player.isDashing) {
    player.isDashing = true;
    player.dashTimer = 14;
    player.dashCooldown = 28;
    player.isInvulnerable = true;
    player.invulnTimer = 18; // i-frames
    player.vx = player.facing * 16.5;
    player.vy = 0;
    player.scaleX = 1.45;
    player.scaleY = 0.65;
    window.soundEngine.playDash();

    // DREGSNOT PASSIVE: Flame Trail & Shoot backwards
    if (currentHeroId === 'dregsnot') {
      window.soundEngine.playFireBlast();
      playerProjectiles.push(new Projectile(player.x - player.facing * 10, player.y + 24, -player.facing * 11, 0, 'bullet', 45, '#f97316'));
      for (let f = 0; f < 4; f++) {
        groundFlames.push(new GroundFlame(player.x - player.facing * (f * 32), player.y + player.h - 18));
      }
    }

    // STROM PASSIVE: Dash deals damage & gives armor/shield
    if (currentHeroId === 'strom') {
      player.shieldHp = Math.min(50, player.shieldHp + 25);
      player.shieldTimer = 140;
      enemies.forEach((e, eIdx) => {
        if (Math.abs(e.x - player.x) < 80 && Math.abs(e.y - player.y) < 60) {
          e.hp -= 42;
          e.flashTimer = 8;
          floatingTexts.push(new FloatingText(e.x, e.y, '-42', '#eab308'));
          window.soundEngine.playHit();
          if (e.hp <= 0) destroyEnemy(e, eIdx);
        }
      });
    }

    // High-speed shockwave expansion rings on dash burst
    for (let d = 0; d < 18; d++) {
      particles.push(new Particle(
        player.x + (player.facing === 1 ? 0 : player.w),
        player.y + player.h / 2 + (Math.random() - 0.5) * 18,
        -player.facing * (Math.random() * 7 + 4),
        (Math.random() - 0.5) * 4.5,
        Math.random() > 0.4 ? player.activeThemeColor : '#ffffff',
        Math.random() * 4 + 2,
        24
      ));
    }
  }
}

// ============================================================================
// UNIQUE HERO SKILLS (KEY E)
// ============================================================================
function triggerHeroSkill() {
  if (currentState !== STATES.PLAYING) return;
  const hero = HEROES[currentHeroId];
  if (!hero || !hero.hasActiveSkill) return;

  // GLEMS RECAST DASH / TELEPORT TO BOOMERANG DAGGER
  if (currentHeroId === 'glems' && player.activeBoomerangDagger) {
    const d = player.activeBoomerangDagger;
    player.x = d.x - player.w / 2;
    player.y = d.y - player.h / 2;
    player.vx = player.facing * 6;
    player.vy = 0;
    player.shieldHp = Math.min(60, player.shieldHp + 45);
    player.shieldTimer = 120; // 2 seconds
    player.damageBoostTimer = 120; // 2 seconds +50% damage
    player.isInvulnerable = true;
    player.invulnTimer = 25;
    window.soundEngine.playTeleport();
    floatingTexts.push(new FloatingText(player.x, player.y - 25, '★ STAR TELEPORT (SHIELD + BOOST) ★', '#818cf8'));
    for (let i = 0; i < 22; i++) {
      particles.push(new Particle(player.x + 20, player.y + 30, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, '#818cf8', 3.5, 24));
    }
    return;
  }

  // Normal Skill Cooldown Check
  if (player.skillCooldown > 0) return;

  window.soundEngine.playSkill();

  if (currentHeroId === 'fall') {
    // FALL: Deadlest (Explosive Heavy Round - 160 DMG, 110px AoE, self-detonates or on contact)
    player.skillCooldown = hero.skillCooldownMax || 300;
    screenShake = 14;
    const aim = player.aimDirection;
    let bvx = player.facing * 14.5;
    let bvy = 0;
    if (aim === 'up') { bvx = 0; bvy = -14.5; }
    else if (aim === 'down') { bvx = 0; bvy = 14.5; }

    playerProjectiles.push(new Projectile(player.x + player.w / 2, player.y + 24, bvx, bvy, 'deadlest', 160, '#f59e0b', 80));
    floatingTexts.push(new FloatingText(player.x, player.y - 20, 'DEADLEST BLAST!', '#f59e0b'));

  } else if (currentHeroId === 'dregsnot') {
    // DREGSNOT: Dragon Breath (Gigantic Piercing Dragon Flame Wave with AoE trail and wall blast)
    player.skillCooldown = hero.skillCooldownMax || 480;
    screenShake = 16;
    window.soundEngine.playDragonBreath();
    playerProjectiles.push(new Projectile(player.x + (player.facing === 1 ? player.w + 10 : -40), player.y + 12, player.facing * 12, 0, 'dragon_breath', 170, '#f97316', 85));
    floatingTexts.push(new FloatingText(player.x, player.y - 25, '🔥 DRAGON BREATH! 🔥', '#f97316'));

  } else if (currentHeroId === 'strom') {
    // STROM: Slayer of Goliath (Sonic Piercing Thrust Dash + 3 Orbiting Energy Blades + Kill-Reset)
    player.skillCooldown = hero.skillCooldownMax || 480;
    screenShake = 16;
    window.soundEngine.playKatanaSlash();
    player.isDashing = true;
    player.dashTimer = 18;
    player.isInvulnerable = true;
    player.invulnTimer = 35;
    player.vx = player.facing * 22; // Piercing supersonic thrust dash
    player.vy = 0;
    player.scaleX = 1.5;
    player.scaleY = 0.65;
    player.orbitingShurikens = [new OrbitingShuriken(0), new OrbitingShuriken(1), new OrbitingShuriken(2)];
    player.shurikenTimer = 260; // ~4.3 seconds active 3 orbiting energy blades

    // Thrust visual streaks and particles
    for (let i = 0; i < 18; i++) {
      particles.push(new Particle(
        player.x + (player.facing === 1 ? 0 : player.w),
        player.y + 16 + (Math.random() - 0.5) * 20,
        player.facing * (Math.random() * 8 + 8),
        (Math.random() - 0.5) * 3,
        Math.random() > 0.5 ? '#eab308' : '#00f5ff',
        Math.random() * 3 + 2,
        24
      ));
    }

    // Instant Thrust Dash piercing damage
    enemies.forEach((enemy, eIdx) => {
      if (Math.abs(enemy.x - player.x) < 160 && Math.abs(enemy.y - player.y) < 70) {
        const thrustDmg = 110;
        enemy.hp -= thrustDmg;
        enemy.flashTimer = 10;
        floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + thrustDmg + ' (THRUST)', '#eab308'));
        window.soundEngine.playHit();
        for (let p = 0; p < 8; p++) {
          particles.push(new Particle(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, '#eab308', 3, 20));
        }
        if (enemy.hp <= 0) {
          destroyEnemy(enemy, eIdx);
          // Kill reset!
          if (player.skillCooldown > 0) {
            player.skillCooldown = 0;
            window.soundEngine.playCharSelect();
            floatingTexts.push(new FloatingText(player.x, player.y - 32, '★ GOLIATH RESET! ★', '#eab308'));
          }
        }
      }
    });

    floatingTexts.push(new FloatingText(player.x, player.y - 25, 'SLAYER OF GOLIATH! (THRUST)', '#eab308'));

  } else if (currentHeroId === 'alpha') {
    // THE VOID: ALPHA - Soul Revanation (Summon 2 Phantoms)
    player.skillCooldown = hero.skillCooldownMax || 1200;
    player.activePhantoms = [new SoulPhantom(0), new SoulPhantom(1)];
    floatingTexts.push(new FloatingText(player.x, player.y - 25, 'SOUL REVANATION! (2 PHANTOMS)', '#c084fc'));

  } else if (currentHeroId === 'glems') {
    // GLEMS STARFALL: Star Dagger (Boomerang Piercing Blade)
    player.skillCooldown = hero.skillCooldownMax || 360;
    player.activeBoomerangDagger = new BoomerangDagger(player.x + player.w / 2, player.y + 24, player.facing);
    floatingTexts.push(new FloatingText(player.x, player.y - 25, 'STAR DAGGER (PRESS E TO DASH)', '#818cf8'));
  }
}

// ============================================================================
// DIRECTIONAL HERO ATTACK ENGINE (HOLLOW KNIGHT STYLE)
// ============================================================================
function triggerHeroAttack() {
  const hero = HEROES[currentHeroId];
  if (player.attackCooldown > 0 || player.energy < 12) return;

  player.energy = Math.max(0, player.energy - 12);
  const aim = player.aimDirection;
  const dmgBonus = player.damageBoostTimer > 0 ? 1.5 : 1.0;

  // -------------------------------------------------------------
  // MELEE STRIKES (RONIN, STROM, ALPHA)
  // -------------------------------------------------------------
  if (hero.attackType === 'KATANA_SMEAR' || hero.attackType === 'HYBRID_BLADE' || hero.attackType === 'VOID_SPEAR') {
    player.attackCooldown = 17;
    player.isSlashing = true;
    player.slashTimer = 14;
    screenShake = 6;
    window.soundEngine.playKatanaSlash();

    const smearOriginX = player.x + player.w / 2;
    const smearOriginY = player.y + player.h / 2;
    const smearFacing = player.facing;
    const smearRadius = hero.attackType === 'VOID_SPEAR' ? 95 : 74;

    // Fluid attack lunge impulse
    player.recoilX = player.facing * 3.5;

    // Cutting sparks along the leading edge of the slash
    for (let s = 0; s < 6; s++) {
      const spAng = (Math.random() - 0.5) * Math.PI * 0.8;
      particles.push(new Particle(
        smearOriginX + Math.cos(spAng) * (smearRadius * 0.75),
        smearOriginY + Math.sin(spAng) * (smearRadius * 0.75),
        smearFacing * (Math.random() * 4 + 2),
        (Math.random() - 0.5) * 4,
        Math.random() > 0.4 ? player.activeThemeColor : '#ffffff',
        Math.random() * 2.5 + 1.5,
        18
      ));
    }

    player.activeSlashSmear = {
      x: smearOriginX,
      y: smearOriginY,
      facing: smearFacing,
      aim: aim,
      radius: smearRadius,
      life: 14,
      maxLife: 14,
      color: player.activeSecondaryColor,
      edgeColor: player.activeThemeColor
    };

    // 1. DOWNWARD NAIL POGO IN AIR (HOLLOW KNIGHT STYLE)
    if (aim === 'down' && !player.isGrounded) {
      let pogoHit = false;

      // Check hit enemy below
      enemies.forEach((enemy, eIdx) => {
        if (Math.abs((enemy.x + enemy.w / 2) - smearOriginX) < 68 &&
            enemy.y > player.y + 20 && enemy.y < player.y + 130) {
          const dmg = Math.round(90 * dmgBonus);
          enemy.hp -= dmg;
          enemy.flashTimer = 10;
          floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + dmg, '#00f5ff'));
          pogoHit = true;

          // Ronin Lifesteal
          if (currentHeroId === 'ronin') {
            player.hp = Math.min(player.maxHp, player.hp + 3);
            floatingTexts.push(new FloatingText(player.x, player.y - 15, '+3 HP', '#00f5ff'));
          }

          if (enemy.hp <= 0) destroyEnemy(enemy, eIdx);
        }
      });

      // Check hit & deflect projectile below
      for (let p = enemyProjectiles.length - 1; p >= 0; p--) {
        const proj = enemyProjectiles[p];
        if (Math.abs(proj.x - smearOriginX) < 55 && proj.y > player.y + 15 && proj.y < player.y + 110) {
          pogoHit = true;
          window.soundEngine.playParry();
          floatingTexts.push(new FloatingText(proj.x, proj.y - 10, 'POGO DEFLECT!', '#00f5ff'));
          playerProjectiles.push(new Projectile(proj.x, proj.y, smearFacing * 14, 0, 'slash', 110, '#00f5ff', 80, true));
          enemyProjectiles.splice(p, 1);
        }
      }

      if (pogoHit) {
        player.vy = -12.4; // POGO BOUNCE!
        player.jumpCount = 0; // Restore double jump
        player.scaleY = 1.35;
        player.scaleX = 0.8;
        screenShake = 10;
        hitStopFrames = 4;
        window.soundEngine.playPogo();
      }
      return;
    }

    // 2. UPWARD SLASH (AIM UP)
    if (aim === 'up') {
      // Deflect projectiles above
      for (let p = enemyProjectiles.length - 1; p >= 0; p--) {
        const proj = enemyProjectiles[p];
        if (Math.abs(proj.x - smearOriginX) < 65 && proj.y < player.y + 20 && proj.y > player.y - 120) {
          window.soundEngine.playParry();
          screenShake = 10;
          hitStopFrames = 4;
          floatingTexts.push(new FloatingText(proj.x, proj.y - 10, 'UP PARRY!', '#00f5ff'));
          playerProjectiles.push(new Projectile(proj.x, proj.y, 0, -14, 'slash', 110, '#00f5ff', 80, true));
          enemyProjectiles.splice(p, 1);
        }
      }

      // Hit enemies above
      enemies.forEach((enemy, eIdx) => {
        if (Math.abs((enemy.x + enemy.w / 2) - smearOriginX) < 70 &&
            enemy.y < player.y + 20 && enemy.y > player.y - 130) {
          const dmg = Math.round(85 * dmgBonus);
          enemy.hp -= dmg;
          enemy.flashTimer = 8;
          hitStopFrames = 3;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + dmg, '#00f5ff'));

          if (currentHeroId === 'ronin') {
            player.hp = Math.min(player.maxHp, player.hp + 3);
            floatingTexts.push(new FloatingText(player.x, player.y - 15, '+3 HP', '#00f5ff'));
          }

          if (enemy.hp <= 0) destroyEnemy(enemy, eIdx);
        }
      });
      return;
    }

    // 3. HORIZONTAL / CROUCH FORWARD SLASH
    player.vx += player.facing * 3.2;

    // Deflect horizontal bullets
    for (let p = enemyProjectiles.length - 1; p >= 0; p--) {
      const proj = enemyProjectiles[p];
      const dist = Math.hypot(proj.x - smearOriginX, proj.y - smearOriginY);
      const inFront = (smearFacing === 1 && proj.x > smearOriginX - 10) || (smearFacing === -1 && proj.x < smearOriginX + 10);

      if (dist < smearRadius + 20 && inFront) {
        window.soundEngine.playParry();
        screenShake = 10;
        hitStopFrames = 4;
        floatingTexts.push(new FloatingText(proj.x, proj.y - 10, 'PARRY!', '#00f5ff'));
        for (let s = 0; s < 12; s++) {
          particles.push(new Particle(proj.x, proj.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, '#00f5ff', 3.5, 22));
        }
        playerProjectiles.push(new Projectile(proj.x, proj.y, smearFacing * 14, 0, 'slash', 110, '#00f5ff', 80, true));
        enemyProjectiles.splice(p, 1);
      }
    }

    // Damage enemies in front
    enemies.forEach((enemy, eIdx) => {
      const dist = Math.hypot((enemy.x + enemy.w / 2) - smearOriginX, (enemy.y + enemy.h / 2) - smearOriginY);
      const inFront = (smearFacing === 1 && enemy.x > smearOriginX - 20) || (smearFacing === -1 && enemy.x < smearOriginX + 20);

      if (dist < smearRadius + 25 && inFront) {
        const dmg = Math.round(85 * dmgBonus);
        const actualDmg = enemy.takeDamage(dmg, smearOriginX);
        if (actualDmg > 0) {
          hitStopFrames = 3;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + actualDmg, '#00f5ff'));

          if (currentHeroId === 'ronin') {
            player.hp = Math.min(player.maxHp, player.hp + 3);
            floatingTexts.push(new FloatingText(player.x, player.y - 15, '+3 HP', '#00f5ff'));
          }

          if (enemy.hp <= 0) destroyEnemy(enemy, eIdx);
        }
      }
    });

    // Check hit breakable walls
    breakableWalls.forEach(wall => {
      if (!wall.isBroken && Math.abs((wall.x + wall.w / 2) - smearOriginX) < smearRadius + 20 &&
          Math.abs((wall.y + wall.h / 2) - smearOriginY) < smearRadius + 20) {
        wall.hp--;
        wall.flashTimer = 8;
        floatingTexts.push(new FloatingText(wall.x, wall.y + 10, '-CRACK!', '#f59e0b'));
        window.soundEngine.playHit();
        screenShake = 6;
        for (let s = 0; s < 10; s++) {
          particles.push(new Particle(wall.x + wall.w / 2, wall.y + wall.h / 2, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#78716c', 3, 20));
        }
        if (wall.hp <= 0) {
          wall.isBroken = true;
          window.soundEngine.playExplosion();
          floatingTexts.push(new FloatingText(wall.x - 20, wall.y - 20, '★ SECRET PASSAGE OPENED! ★', '#fbbf24'));
          for (let s = 0; s < 30; s++) {
            particles.push(new Particle(wall.x + wall.w / 2, wall.y + wall.h / 2, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, '#a8a29e', 4, 30));
          }
        }
      }
    });

    // Check hit supply crates
    crates.forEach(crate => {
      if (!crate.isBroken && Math.abs((crate.x + crate.w / 2) - smearOriginX) < smearRadius + 18 &&
          Math.abs((crate.y + crate.h / 2) - smearOriginY) < smearRadius + 18) {
        crate.takeDamage(1);
      }
    });

    // Strom Hybrid Blade: Also fires a flying energy slash wave!
    if (hero.attackType === 'HYBRID_BLADE') {
      playerProjectiles.push(new Projectile(player.x + (smearFacing === 1 ? player.w : 0), player.y + 24, smearFacing * 11, 0, 'slash_wave', 45, '#eab308', 55));
    }

    return;
  }

  // -------------------------------------------------------------
  // RANGED PROJECTILES (FALL, DREGSNOT, GLEMS)
  // -------------------------------------------------------------
  player.attackCooldown = (hero.id === 'fall') ? 9 : 14; // Fall gets rapid-fire attack speed!
  screenShake = 5;

  // Snappy weapon recoil impulse
  if (aim === 'up') {
    player.scaleY = 0.92;
    player.scaleX = 1.08;
  } else if (aim === 'down') {
    player.scaleY = 0.92;
    player.scaleX = 1.08;
  } else {
    player.recoilX = -player.facing * (hero.id === 'fall' ? 3.5 : 4.5);
    player.scaleX = 0.90;
    player.scaleY = 1.08;
  }

  let pvx = player.facing * 12.5;
  let pvy = 0;
  let originX = player.x + (player.facing === 1 ? player.w + 4 : -4);
  let originY = player.y + (player.isCrouching ? 16 : 24);

  if (aim === 'up') {
    pvx = 0;
    pvy = -13;
    originX = player.x + player.w / 2;
    originY = player.y - 6;
  } else if (aim === 'down' && !player.isGrounded) {
    pvx = 0;
    pvy = 13;
    originX = player.x + player.w / 2;
    originY = player.y + player.h + 6;
    player.vy = Math.min(player.vy, -2.5); // Slight recoil hop
  }

  if (hero.attackType === 'PISTOL_BULLETS') {
    // FALL: Dual rapid kinetic pistols with brass ejection
    window.soundEngine.playLaserCannon();
    const dmg = Math.round(48 * dmgBonus);
    playerProjectiles.push(new Projectile(originX, originY, pvx, pvy, 'bullet', dmg, player.activeThemeColor));

    // Spent starlight casing particle
    particles.push(new Particle(
      player.x + (player.facing === 1 ? player.w : 0),
      player.y + 16,
      -player.facing * (Math.random() * 2.5 + 1.2),
      -Math.random() * 3.2 - 1.5,
      '#f59e0b',
      2,
      22
    ));

  } else if (hero.attackType === 'FIRE_BULLETS') {
    // DREGSNOT: Fire bullets with dragon embers
    window.soundEngine.playFireBlast();
    const dmg = Math.round(52 * dmgBonus);
    playerProjectiles.push(new Projectile(originX, originY, pvx, pvy, 'bullet', dmg, '#f97316'));

    // Dragon ember sparks from cylinder
    for (let e = 0; e < 4; e++) {
      particles.push(new Particle(
        originX, originY,
        player.facing * (Math.random() * 3.5 + 1),
        (Math.random() - 0.5) * 3,
        Math.random() > 0.4 ? '#f97316' : '#ea580c',
        Math.random() * 3 + 1.5,
        18
      ));
    }

  } else if (hero.attackType === 'MAGIC_DAGGERS') {
    // GLEMS: Magic Daggers
    window.soundEngine.playStarDagger();
    const dmg = Math.round(38 * dmgBonus);
    playerProjectiles.push(new Projectile(originX, originY, pvx, pvy, 'dagger', dmg, player.activeThemeColor));
    if (aim === 'forward' || aim === 'crouch') {
      setTimeout(() => {
        if (currentState === STATES.PLAYING) {
          playerProjectiles.push(new Projectile(originX, originY + 8, pvx, pvy, 'dagger', dmg, player.activeSecondaryColor));
        }
      }, 70);
    }
  }
}

// ============================================================================
// PLATFORM PHYSICS & MOVING LIFTS
// ============================================================================
function updatePlatforms() {
  platforms.forEach(p => {
    if (p.type === 'moving_lift') {
      p.vx = 0;
      p.vy = 0;
      // Vertical lift oscillation
      if (p.speedY) {
        if (p.dirY === undefined) p.dirY = 1;
        const prevY = p.y;
        p.y += p.speedY * p.dirY;
        if (p.y >= p.maxY) {
          p.y = p.maxY;
          p.dirY = -1;
        } else if (p.y <= p.minY) {
          p.y = p.minY;
          p.dirY = 1;
        }
        p.vy = p.y - prevY;
      }
      // Horizontal raft oscillation
      if (p.speedX) {
        if (p.dirX === undefined) p.dirX = 1;
        const prevX = p.x;
        p.x += p.speedX * p.dirX;
        if (p.x >= p.maxX) {
          p.x = p.maxX;
          p.dirX = -1;
        } else if (p.x <= p.minX) {
          p.x = p.minX;
          p.dirX = 1;
        }
        p.vx = p.x - prevX;
      }

      // If player is standing on this lift, carry them along
      if (player.standingPlatform === p) {
        player.x += p.vx;
        player.y += p.vy;
      }
    }
  });
}

// ============================================================================
// UPDATE LOOP (60 FPS PHYSICS)
// ============================================================================
function updatePlayer() {
  player.animTick++;

  if (player.energy < player.maxEnergy) {
    player.energy = Math.min(player.maxEnergy, player.energy + 0.42);
  }

  player.recoilX *= 0.82;
  player.scaleX += (1.0 - player.scaleX) * 0.15;
  player.scaleY += (1.0 - player.scaleY) * 0.15;

  // Update Slash Smear Timer
  if (player.isSlashing) {
    player.slashTimer--;
    if (player.slashTimer <= 0) {
      player.isSlashing = false;
      player.activeSlashSmear = null;
    }
  }

  // Update Neon Eye Trail (Penusbmic Feature!)
  if (currentHeroId === 'ronin') {
    const headX = player.x + player.w / 2 + (player.facing * 3);
    const headY = player.y + 14;
    if (Math.abs(player.vx) > 0.8 || player.isDashing || !player.isGrounded) {
      player.eyeTrail.push({ x: headX, y: headY, life: 10, maxLife: 10 });
    }
    for (let t = player.eyeTrail.length - 1; t >= 0; t--) {
      player.eyeTrail[t].life--;
      if (player.eyeTrail[t].life <= 0) player.eyeTrail.splice(t, 1);
    }
  }

  // Update Directional Aiming & Crouching (Hollow Knight style)
  if (keys.down) {
    if (player.isGrounded) {
      player.isCrouching = true;
      player.aimDirection = 'crouch';
      player.h = 32; // Low chibi crouch profile - ducks under drone lasers
      player.targetVx = 0; // Stationary ducking
    } else {
      player.isCrouching = false;
      player.aimDirection = 'down'; // Downward Nail Pogo aim in midair
      player.h = 48;
    }
  } else {
    player.isCrouching = false;
    player.h = 48;
    if (keys.up) {
      player.aimDirection = 'up';
    } else {
      player.aimDirection = 'forward';
    }
  }

  // Update Skill & Buff Timers
  if (player.skillCooldown > 0) player.skillCooldown--;
  if (player.shieldTimer > 0) {
    player.shieldTimer--;
    if (player.shieldTimer <= 0) player.shieldHp = 0;
  }
  if (player.damageBoostTimer > 0) player.damageBoostTimer--;
  if (player.speedBoostTimer > 0) player.speedBoostTimer--;

  // Update Strom's Orbiting Shurikens
  if (player.shurikenTimer > 0) {
    player.shurikenTimer--;
    player.orbitingShurikens.forEach(s => s.update());
    if (player.shurikenTimer <= 0) {
      player.orbitingShurikens = [];
    }
  }

  // Update The Void: Alpha's Phantoms
  for (let ph = player.activePhantoms.length - 1; ph >= 0; ph--) {
    const phantom = player.activePhantoms[ph];
    phantom.update();
    if (phantom.isDead || phantom.hp <= 0) {
      player.activePhantoms.splice(ph, 1);
    }
  }

  // Update Glems Starfall's Boomerang Dagger
  if (player.activeBoomerangDagger) {
    player.activeBoomerangDagger.update();
  }

  // Update Dregsnot's Ground Flames
  for (let f = groundFlames.length - 1; f >= 0; f--) {
    const flame = groundFlames[f];
    flame.update();
    if (flame.life <= 0) groundFlames.splice(f, 1);
  }

  // Update & Harvest Alpha's Soul Orbs
  for (let s = soulOrbs.length - 1; s >= 0; s--) {
    const orb = soulOrbs[s];
    orb.update();
    // Harvest range check
    if (Math.hypot(player.x + player.w / 2 - orb.x, player.y + player.h / 2 - orb.y) < 48) {
      player.soulStacks++;
      player.hp = Math.min(player.maxHp, player.hp + 6);
      window.soundEngine.playSoulCollect();
      floatingTexts.push(new FloatingText(orb.x, orb.y - 15, '+SOUL (+6 HP)', '#c084fc'));
      soulOrbs.splice(s, 1);
      continue;
    }
    if (orb.life <= 0) soulOrbs.splice(s, 1);
  }

  if (player.isDashing) {
    player.dashTimer--;
    player.x += player.vx;
    player.y += player.vy;

    if (player.dashTimer % 2 === 0) {
      afterimages.push({
        x: player.x,
        y: player.y,
        w: player.w,
        h: player.h,
        facing: player.facing,
        color: player.activeThemeColor,
        life: 14,
        maxLife: 14
      });
    }

    if (player.dashTimer <= 0) {
      player.isDashing = false;
      player.vx *= 0.3;
    }
  } else {
    // Kinematics Lerp
    const currentSpeed = player.speed * (player.speedBoostTimer > 0 ? 1.4 : 1.0);
    if (player.isCrouching) {
      player.targetVx = 0; // Ducking still
    } else if (keys.left) {
      player.targetVx = -currentSpeed;
      player.facing = -1;
    } else if (keys.right) {
      player.targetVx = currentSpeed;
      player.facing = 1;
    } else {
      player.targetVx = 0;
    }

    player.vx += (player.targetVx - player.vx) * 0.22;
    if (Math.abs(player.vx) < 0.05) player.vx = 0;

    const targetTilt = (player.vx / currentSpeed) * 0.08;
    player.tiltAngle += (targetTilt - player.tiltAngle) * 0.2;

    // Check Climbing on Hanging Ropes / Vines
    let nearRope = null;
    platforms.forEach(p => {
      if (p.type === 'hanging_rope') {
        if (player.x + player.w >= p.x - 8 &&
            player.x <= p.x + p.w + 8 &&
            player.y + player.h >= p.y &&
            player.y <= p.y + p.h) {
          nearRope = p;
        }
      }
    });

    if (nearRope && (keys.up || keys.down || player.isClimbing)) {
      player.isClimbing = true;
      player.standingPlatform = null;
      // Magnetize gently towards rope centerline
      player.x += ((nearRope.x + nearRope.w / 2 - player.w / 2) - player.x) * 0.25;
      player.vx = 0;
      player.targetVx = 0;
      if (keys.up) {
        player.vy = -3.8;
        if (player.y < nearRope.y - 12) {
          player.y = nearRope.y - 12;
          player.vy = 0;
        }
      } else if (keys.down) {
        player.vy = 3.8;
        if (player.y + player.h > nearRope.y + nearRope.h + 8) {
          player.isClimbing = false;
        }
      } else {
        player.vy = 0;
      }
    } else {
      player.isClimbing = false;
    }

    // Check Wall Slide on platforms (ignore ropes)
    player.isWallSliding = false;
    player.wallDirection = 0;

    if (!player.isClimbing && !player.isGrounded && player.vy > 0) {
      platforms.forEach(p => {
        if (p.type === 'hanging_rope') return;
        // Left side touch
        if (player.x + player.w >= p.x - 2 && player.x + player.w <= p.x + 8 &&
            player.y + player.h > p.y && player.y < p.y + p.h && keys.right) {
          player.isWallSliding = true;
          player.wallDirection = 1;
        }
        // Right side touch
        if (player.x <= p.x + p.w + 2 && player.x >= p.x + p.w - 8 &&
            player.y + player.h > p.y && player.y < p.y + p.h && keys.left) {
          player.isWallSliding = true;
          player.wallDirection = -1;
        }
      });
    }

    if (player.isClimbing) {
      // Climbing vertical movement handled above, skip gravity
    } else if (player.isWallSliding) {
      player.vy = Math.min(2.0, player.vy); // Slow controlled slide
      // Wall friction sparks
      if (player.animTick % 3 === 0) {
        particles.push(new Particle(
          player.wallDirection === 1 ? player.x + player.w : player.x,
          player.y + player.h - 10,
          -player.wallDirection * (Math.random() * 2),
          Math.random() * 2 - 1,
          '#00f5ff',
          2.5,
          14
        ));
      }
    } else {
      player.vy = Math.min(MAX_FALL_SPEED, player.vy + GRAVITY);
    }

    if (!player.isClimbing) {
      player.x += player.vx;
    }
    player.y += player.vy;

    // Running dust
    if (player.isGrounded && Math.abs(player.vx) > 1.2 && player.animTick % 6 === 0) {
      particles.push(new Particle(
        player.x + player.w / 2,
        player.y + player.h - 2,
        -player.facing * (Math.random() * 1.5 + 0.5),
        -Math.random() * 1.0,
        'rgba(148, 163, 184, 0.6)',
        Math.random() * 3 + 2,
        18,
        'circle'
      ));
    }
  }

  if (player.dashCooldown > 0) player.dashCooldown--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invulnTimer > 0) {
    player.invulnTimer--;
    if (player.invulnTimer <= 0) player.isInvulnerable = false;
  }

  // Vertical Wall Towers & Ruin Pillars block horizontal passage
  platforms.forEach(p => {
    if (p.type === 'wall' || p.type === 'ruin_wall') {
      if (player.y + player.h > p.y + 8 && player.y < p.y + p.h - 8) {
        if (player.x + player.w > p.x && player.x < p.x + p.w / 2 && player.vx > 0) {
          player.x = p.x - player.w;
          player.vx = 0;
        } else if (player.x < p.x + p.w && player.x > p.x + p.w / 2 && player.vx < 0) {
          player.x = p.x + p.w;
          player.vx = 0;
        }
      }
    }
  });

  // Solid Breakable Walls block horizontal movement until shattered
  breakableWalls.forEach(bw => {
    if (!bw.isBroken) {
      if (player.y + player.h > bw.y + 6 && player.y < bw.y + bw.h - 6) {
        if (player.x + player.w > bw.x && player.x < bw.x + bw.w / 2 && player.vx > 0) {
          player.x = bw.x - player.w;
          player.vx = 0;
        } else if (player.x < bw.x + bw.w && player.x > bw.x + bw.w / 2 && player.vx < 0) {
          player.x = bw.x + bw.w;
          player.vx = 0;
        }
      }
    }
  });

  // Colosseum Arena Lockdown Gates block player while boss is alive
  if (isArenaLocked) {
    if (player.x < arenaGates.left.x + arenaGates.left.w) {
      player.x = arenaGates.left.x + arenaGates.left.w;
      player.vx = 0;
    }
    if (player.x + player.w > arenaGates.right.x) {
      player.x = arenaGates.right.x - player.w;
      player.vx = 0;
    }
  }

  // Astral Citadel Lockdown Gates block player while Final Boss Emperor Xenos is alive
  if (isCitadelLocked) {
    if (player.x < arenaGates.citadelLeft.x + arenaGates.citadelLeft.w) {
      player.x = arenaGates.citadelLeft.x + arenaGates.citadelLeft.w;
      player.vx = 0;
    }
    if (player.x + player.w > arenaGates.citadelRight.x) {
      player.x = arenaGates.citadelRight.x - player.w;
      player.vx = 0;
    }
  }

  // Level 1 Bramble Barrier Lockdown (Mini Boss)
  if (levelBarriers.miniBossLeft.active && levelBarriers.miniBossRight.active) {
    if (player.x < levelBarriers.miniBossLeft.x + levelBarriers.miniBossLeft.w) {
      player.x = levelBarriers.miniBossLeft.x + levelBarriers.miniBossLeft.w;
      player.vx = 0;
    }
    if (player.x + player.w > levelBarriers.miniBossRight.x) {
      player.x = levelBarriers.miniBossRight.x - player.w;
      player.vx = 0;
    }
  }

  // Level 1 Abyssal Thorn Spire Lockdown (Main Boss)
  if (levelBarriers.bossLeft.active && levelBarriers.bossRight.active) {
    if (player.x < levelBarriers.bossLeft.x + levelBarriers.bossLeft.w) {
      player.x = levelBarriers.bossLeft.x + levelBarriers.bossLeft.w;
      player.vx = 0;
    }
    if (player.x + player.w > levelBarriers.bossRight.x) {
      player.x = levelBarriers.bossRight.x - player.w;
      player.vx = 0;
    }
  }

  // Environmental Hazards: Void Spikes & Boiling Magma Lava
  platforms.forEach(p => {
    if (p.type === 'hazard_spikes') {
      if (player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h >= p.y && player.y < p.y + p.h) {
        if (!player.isInvulnerable) {
          player.hp = Math.max(0, player.hp - 16);
          player.isInvulnerable = true;
          player.invulnTimer = 45;
          player.vy = -10.5; // Bounce upward off spikes
          screenShake = 10;
          window.soundEngine.playHit();
          floatingTexts.push(new FloatingText(player.x, player.y, '-16 HP (VOID SPIKES)', '#ef4444'));
        }
      }
    } else if (p.type === 'hazard_lava') {
      if (player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h >= p.y && player.y < p.y + p.h) {
        if (!player.isInvulnerable) {
          player.hp = Math.max(0, player.hp - 20);
          player.isInvulnerable = true;
          player.invulnTimer = 45;
          player.vy = -8.5; // Bounce out of burning lava
          screenShake = 10;
          window.soundEngine.playFireBlast();
          floatingTexts.push(new FloatingText(player.x, player.y, '-20 HP (MOLTEN LAVA)', '#f97316'));
          for (let l = 0; l < 10; l++) {
            particles.push(new Particle(player.x + player.w / 2, player.y + player.h, (Math.random() - 0.5) * 4, -Math.random() * 4, '#f97316', 3.5, 20));
          }
        }
      }
    }
  });

  // Relic Power Cores Collection in Secret Chambers
  relics.forEach(relic => {
    if (!relic.collected &&
        Math.abs((player.x + player.w / 2) - relic.x) < 40 &&
        Math.abs((player.y + player.h / 2) - relic.y) < 45) {
      relic.collected = true;
      score += 1000;
      window.soundEngine.playCharSelect();
      if (relic.type === 'hp_core') {
        player.hp = Math.min(player.maxHp, player.hp + 50);
        floatingTexts.push(new FloatingText(relic.x, relic.y - 20, '★ INTI PURBA: +50 HP (+1000) ★', '#00f5ff'));
      } else if (relic.type === 'solar_core') {
        player.energy = 100;
        player.damageBoostTimer = 300; // 5 seconds overdrive boost
        floatingTexts.push(new FloatingText(relic.x, relic.y - 20, '★ API NAGA: OVERDRIVE BOOST (+1000) ★', '#f97316'));
      }
      for (let i = 0; i < 28; i++) {
        particles.push(new Particle(relic.x, relic.y, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, relic.type === 'hp_core' ? '#00f5ff' : '#fbbf24', 3.5, 30));
      }
    }
  });

  // Check Proximity to Ancient Lore Tablets
  let foundTablet = null;
  loreTablets.forEach(tab => {
    const dist = Math.hypot((player.x + player.w / 2) - tab.x, (player.y + player.h / 2) - tab.y);
    if (dist < 72) {
      foundTablet = tab;
    }
  });
  activeLoreTabletNear = foundTablet;
  const lorePromptEl = document.getElementById('lore-prompt');
  if (lorePromptEl) {
    if (activeLoreTabletNear && currentState === STATES.PLAYING) {
      lorePromptEl.classList.remove('hidden');
    } else {
      lorePromptEl.classList.add('hidden');
    }
  }

  player.x = Math.max(10, Math.min(MAP_WIDTH - player.w - 10, player.x));

  let onGroundThisFrame = false;
  let landedPlatform = null;
  platforms.forEach(p => {
    if (p.type === 'hanging_rope') return; // Hanging ropes are climbable, not solid floors
    if (p.type === 'hazard_spikes' || p.type === 'hazard_lava' || p.type === 'wall' || p.type === 'ruin_wall') return;

    if (player.x + player.w > p.x &&
        player.x < p.x + p.w &&
        player.y + player.h >= p.y &&
        player.y + player.h - player.vy <= p.y + 16) {
      
      if (!player.isGrounded && player.vy > 1.8) {
        player.scaleY = 0.74;
        player.scaleX = 1.30;
        // Dual landing dust puffs
        for (let d = -1; d <= 1; d += 2) {
          for (let p = 0; p < 3; p++) {
            particles.push(new Particle(
              player.x + player.w / 2 + d * 6,
              player.y + player.h - 2,
              d * (Math.random() * 2.4 + 0.8),
              -Math.random() * 1.5,
              'rgba(148, 163, 184, 0.75)',
              Math.random() * 3.2 + 2,
              18,
              'circle'
            ));
          }
        }
      }

      player.y = p.y - player.h;
      player.vy = 0;
      player.isGrounded = true;
      player.jumpCount = 0;
      player.isClimbing = false;
      onGroundThisFrame = true;
      landedPlatform = p;
    }
  });

  player.standingPlatform = landedPlatform;
  if (!onGroundThisFrame) {
    player.isGrounded = false;
  }

  // Check Interactive Checkpoints & Sanctuary Healing
  checkpoints.forEach(cp => {
    const isNear = Math.abs(player.x - cp.x) < 65 && Math.abs(player.y - cp.y) < 85;
    if (isNear) {
      const now = Date.now();
      const needsHeal = player.hp < player.maxHp || (player.energy !== undefined && player.energy < player.maxEnergy);
      const canHeal = !cp.lastHealTime || (now - cp.lastHealTime > 4000);
      if (!cp.reached || (needsHeal && canHeal)) {
        cp.lastHealTime = now;
        player.hp = player.maxHp;
        if (player.energy !== undefined) player.energy = player.maxEnergy;
        window.soundEngine.playPowerup();
        floatingTexts.push(new FloatingText(cp.x, cp.y - 32, '⚡ SANCTUARY RECHARGE: HP & ENERGY 100%! ⚡', '#22c55e'));
        for (let i = 0; i < 28; i++) {
          particles.push(new Particle(player.x + player.w / 2, player.y + player.h / 2, (Math.random() - 0.5) * 6, -Math.random() * 5, '#22c55e', 3.5, 30));
        }
      }
      if (!cp.reached) {
        cp.reached = true;
        activeCheckpoint = cp;
        window.soundEngine.playCharSelect();
        floatingTexts.push(new FloatingText(cp.x, cp.y - 12, 'CHECKPOINT SAVED: ' + cp.name, '#00f5ff'));
      }
    }
  });

  // Check Goal Portal (Extraction Completion)
  if (player.x + player.w > goalPortal.x && player.x < goalPortal.x + goalPortal.w &&
      player.y + player.h > goalPortal.y && player.y < goalPortal.y + goalPortal.h) {
    triggerVictory();
  }

  // Bottomless Pit Check & Checkpoint Respawn
  if (player.y > MAP_HEIGHT - 35) {
    player.hp = Math.max(0, player.hp - 25);
    player.isClimbing = false;
    player.standingPlatform = null;
    screenShake = 14;
    window.soundEngine.playHit();
    const cp = activeCheckpoint || checkpoints[0] || { x: 120, y: 350 };
    floatingTexts.push(new FloatingText(cp.x, cp.y - 10, '-25 HP (JATUH KE JURANG)', '#ef4444'));
    player.x = cp.x;
    player.y = cp.y;
    player.vx = 0;
    player.vy = 0;
    player.isInvulnerable = true;
    player.invulnTimer = 60;
    for (let i = 0; i < 20; i++) {
      particles.push(new Particle(player.x + 20, player.y + 30, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, '#00f5ff', 3.5, 24));
    }
  }

  // Update Sector Progress Bar in HUD
  const sectorPctVal = Math.min(100, Math.max(0, Math.floor((player.x / (MAP_WIDTH - 250)) * 100)));
  const mapFill = document.getElementById('map-progress-fill');
  if (mapFill) mapFill.style.width = sectorPctVal + '%';
  const sectorPctEl = document.getElementById('sector-pct');
  if (sectorPctEl) sectorPctEl.textContent = sectorPctVal + '%';

  updateHud();
  checkSectorTransition(player.x);

  if (player.hp <= 0 && currentState === STATES.PLAYING) {
    triggerGameOver();
  }
}

function updateProjectiles() {
  for (let i = playerProjectiles.length - 1; i >= 0; i--) {
    const proj = playerProjectiles[i];
    proj.update();

    if (proj.type === 'dragon_breath') {
      // Piercing Dragon Breath AoE vs all enemies in range
      enemies.forEach((enemy, eIdx) => {
        const dist = Math.hypot((enemy.x + enemy.w / 2) - proj.x, (enemy.y + enemy.h / 2) - proj.y);
        if (dist <= 62) {
          if (!proj.hitEnemies.has(enemy)) {
            proj.hitEnemies.add(enemy);
            enemy.hp -= proj.damage;
            enemy.flashTimer = 10;
            floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + proj.damage + ' (DRAGON)', '#f97316'));
            window.soundEngine.playFireBlast();
            for (let s = 0; s < 10; s++) {
              particles.push(new Particle(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#f97316', 3.5, 20));
            }
            if (enemy.hp <= 0) {
              destroyEnemy(enemy, eIdx);
            }
          }
        }
      });
    } else {
      // Check player projectiles hitting breakable walls
      breakableWalls.forEach(wall => {
        if (!wall.isBroken &&
            proj.x > wall.x && proj.x < wall.x + wall.w &&
            proj.y > wall.y && proj.y < wall.y + wall.h) {
          wall.hp--;
          wall.flashTimer = 8;
          floatingTexts.push(new FloatingText(wall.x, wall.y + 10, '-CRACK!', '#f59e0b'));
          window.soundEngine.playHit();
          screenShake = 6;
          for (let s = 0; s < 10; s++) {
            particles.push(new Particle(wall.x + wall.w / 2, wall.y + wall.h / 2, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, '#78716c', 3, 20));
          }
          if (wall.hp <= 0) {
            wall.isBroken = true;
            window.soundEngine.playExplosion();
            floatingTexts.push(new FloatingText(wall.x - 20, wall.y - 20, '★ SECRET PASSAGE OPENED! ★', '#fbbf24'));
            for (let s = 0; s < 30; s++) {
              particles.push(new Particle(wall.x + wall.w / 2, wall.y + wall.h / 2, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, '#a8a29e', 4, 30));
            }
          }
          if (proj.type !== 'dragon_breath') {
            proj.life = 0;
          }
        }
      });

      // Check player projectiles hitting supply crates
      crates.forEach(crate => {
        if (!crate.isBroken &&
            proj.x > crate.x && proj.x < crate.x + crate.w &&
            proj.y > crate.y && proj.y < crate.y + crate.h) {
          crate.takeDamage(1);
          if (proj.type !== 'dragon_breath') {
            proj.life = 0;
          }
        }
      });

      for (let e = enemies.length - 1; e >= 0; e--) {
        const enemy = enemies[e];
        if (proj.x > enemy.x && proj.x < enemy.x + enemy.w &&
            proj.y > enemy.y && proj.y < enemy.y + enemy.h) {
          
          if (proj.type === 'deadlest') {
            createAoEExplosion(proj.x, proj.y, 115, proj.damage);
            proj.life = 0;
            break;
          }

          const actualDmg = enemy.takeDamage(proj.damage, proj.x);
          if (actualDmg > 0) {
            floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + actualDmg, '#fbbf24'));
            window.soundEngine.playHit();

            // FALL PASSIVE: Basic attack hit reduces Deadlest Skill Cooldown (-0.5s / 30 frames)
            if (currentHeroId === 'fall' && proj.type === 'bullet' && player.skillCooldown > 0) {
              player.skillCooldown = Math.max(0, player.skillCooldown - 30);
              particles.push(new Particle(player.x + player.w / 2, player.y + 10, 0, -2, '#38bdf8', 2.5, 12));
            }

            for (let s = 0; s < 8; s++) {
              particles.push(new Particle(proj.x, proj.y, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, proj.color, 3, 20));
            }

            if (enemy.hp <= 0) {
              destroyEnemy(enemy, e);
            }
          }

          if (proj.type !== 'spear') {
            proj.life = 0;
            break;
          }
        }
      }
    }

    if (proj.life <= 0 || Math.abs(proj.x - player.x) > 1200) {
      playerProjectiles.splice(i, 1);
    }
  }

  for (let b = activeLaserBeams.length - 1; b >= 0; b--) {
    const beam = activeLaserBeams[b];
    beam.life--;

    enemies.forEach((enemy, eIdx) => {
      const inBeamRange = beam.facing === 1 ? enemy.x >= beam.x1 - 20 : enemy.x <= beam.x1 + 20;
      if (inBeamRange && Math.abs(enemy.y + enemy.h / 2 - beam.y1) < beam.width / 2 + 16) {
        const beamDmg = enemy.takeDamage(8, beam.x1);
        if (beamDmg > 0) {
          if (beam.life % 4 === 0) {
            window.soundEngine.playHit();
            floatingTexts.push(new FloatingText(enemy.x, enemy.y, '-' + beamDmg, '#fbbf24'));
          }
          if (enemy.hp <= 0) {
            destroyEnemy(enemy, eIdx);
          }
        }
      }
    });

    if (beam.life <= 0) {
      activeLaserBeams.splice(b, 1);
    }
  }
}

function destroyEnemy(enemy, index) {
  enemy.isDead = true;
  kills++;

  // Spawn fallen enemy corpse on platform (Hollow Knight / Silksong corpse persistence)
  if (!enemy.isMiniBoss && !enemy.isFinalBoss && !enemy.type.startsWith('boss')) {
    enemyCorpses.push(new EnemyCorpse(enemy.x, enemy.y, enemy.w, enemy.h, enemy.type, enemy.facing));
  }

  // Item Drop System (38% on normal mobs, 100% triple drop on Mini Bosses & Final Boss)
  if (enemy.isMiniBoss || enemy.isFinalBoss || enemy.type.startsWith('boss')) {
    items.push(new Item(enemy.x + enemy.w / 2 - 18, enemy.y + enemy.h / 2, 'heal_mega', -2, -4));
    items.push(new Item(enemy.x + enemy.w / 2 + 18, enemy.y + enemy.h / 2, 'energy', 2, -4));
    items.push(new Item(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2 - 12, 'score_chip', 0, -5));
  } else if (Math.random() < 0.38) {
    const itemRoll = Math.random();
    const dropType = itemRoll < 0.45 ? 'heal_nano' : (itemRoll < 0.8 ? 'energy' : 'score_chip');
    items.push(new Item(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, dropType, (Math.random() - 0.5) * 3, -3.5));
  }

  // Boss Specific Defeat Rewards & Unlocks
  if (enemy.type === 'boss_mech') {
    defeatedBosses.mech = true;
    score += 2000;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    floatingTexts.push(new FloatingText(player.x, player.y - 40, '★ MECHA ENFORCER D-01 DESTROYED! ★ (+2000)', '#38bdf8'));
    screenShake = 16;
    window.soundEngine.playExplosion();
  } else if (enemy.type === 'boss_colossus') {
    defeatedBosses.colossus = true;
    score += 2500;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    floatingTexts.push(new FloatingText(player.x, player.y - 40, '★ ELYSIUM COLOSSUS FELLED! ★ (+2500)', '#10b981'));
    screenShake = 18;
    window.soundEngine.playExplosion();
  } else if (enemy.type === 'boss_drake') {
    defeatedBosses.drake = true;
    score += 3000;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    floatingTexts.push(new FloatingText(player.x, player.y - 40, '★ IGNIS WYRM BANISHED! ★ (+3000)', '#f97316'));
    screenShake = 20;
    window.soundEngine.playExplosion();
  } else if (enemy.type === 'boss') {
    defeatedBosses.goliath = true;
    isBossDefeated = true;
    isArenaLocked = false;
    arenaGates.left.active = false;
    arenaGates.right.active = false;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    score += 3500;
    floatingTexts.push(new FloatingText(player.x, player.y - 40, '★ VORTEX GOLIATH DEFEATED! ★ (+3500)', '#fbbf24'));
    hitStopFrames = 12;
    screenShake = 20;
    window.soundEngine.playExplosion();
    for (let b = 0; b < 60; b++) {
      particles.push(new Particle(
        enemy.x + enemy.w / 2,
        enemy.y + enemy.h / 2,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        Math.random() > 0.5 ? '#ef4444' : '#00f5ff',
        Math.random() * 5 + 3,
        50
      ));
    }
  } else if (enemy.type === 'boss_final') {
    defeatedBosses.xenos = true;
    isCitadelLocked = false;
    arenaGates.citadelLeft.active = false;
    arenaGates.citadelRight.active = false;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    score += 10000;
    floatingTexts.push(new FloatingText(player.x, player.y - 45, '👑 EMPEROR XENOS DEFEATED! GALAXY SAVED! 👑 (+10000)', '#c084fc'));
    hitStopFrames = 22;
    screenShake = 26;
    window.soundEngine.playExplosion();
    for (let b = 0; b < 90; b++) {
      particles.push(new Particle(
        enemy.x + enemy.w / 2,
        enemy.y + enemy.h / 2,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 18,
        Math.random() > 0.5 ? '#c084fc' : '#00f5ff',
        Math.random() * 6 + 4,
        60
      ));
    }
  } else if (enemy.type === 'boss_treant') {
    defeatedBosses.treant = true;
    levelBarriers.miniBossLeft.active = false;
    levelBarriers.miniBossRight.active = false;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    score += 2500;
    floatingTexts.push(new FloatingText(player.x, player.y - 40, '★ BLIGHT FANG BEHEMOTH DIBASMI! ★ (+2500)', '#84cc16'));
    hitStopFrames = 14;
    screenShake = 18;
    window.soundEngine.playExplosion();
    for (let b = 0; b < 60; b++) {
      particles.push(new Particle(
        enemy.x + enemy.w / 2,
        enemy.y + enemy.h / 2,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        Math.random() > 0.5 ? '#84cc16' : '#65a30d',
        Math.random() * 5 + 3,
        50
      ));
    }
  } else if (enemy.type === 'boss_chimera') {
    defeatedBosses.chimera = true;
    isBossDefeated = true;
    levelBarriers.bossLeft.active = false;
    levelBarriers.bossRight.active = false;
    const bossHud = document.getElementById('boss-hud-bar');
    if (bossHud) bossHud.classList.add('hidden');
    score += 5000;
    floatingTexts.push(new FloatingText(player.x, player.y - 45, '👑 THE BLIGHT CHIMERA TELAH DIKALAHKAN! 👑 (+5000)', '#22c55e'));
    hitStopFrames = 20;
    screenShake = 24;
    window.soundEngine.playExplosion();
    for (let b = 0; b < 80; b++) {
      particles.push(new Particle(
        enemy.x + enemy.w / 2,
        enemy.y + enemy.h / 2,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        Math.random() > 0.5 ? '#10b981' : '#a855f7',
        Math.random() * 6 + 3,
        60
      ));
    }
    setTimeout(() => {
      triggerVictory();
    }, 1800);
  } else {
    const normalScore = enemy.hp > 250 ? 400 : (enemy.hp > 150 ? 250 : 150);
    score += normalScore;
    floatingTexts.push(new FloatingText(enemy.x, enemy.y, '+' + normalScore, '#fbbf24'));
    window.soundEngine.playExplosion();
  }

  // STROM PASSIVE/ACTIVE: Kill instantly resets Slayer of Goliath cooldown!
  if (currentHeroId === 'strom' && player.skillCooldown > 0) {
    player.skillCooldown = 0;
    window.soundEngine.playCharSelect();
    floatingTexts.push(new FloatingText(player.x, player.y - 32, '★ GOLIATH RESET! ★', '#eab308'));
    for (let k = 0; k < 12; k++) {
      particles.push(new Particle(player.x + 20, player.y + 20, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, '#eab308', 3, 20));
    }
  }

  // THE VOID: ALPHA PASSIVE: Dead enemies spawn floating Soul Orbs!
  if (currentHeroId === 'alpha') {
    soulOrbs.push(new SoulOrb(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2));
  }

  for (let e = 0; e < 25; e++) {
    particles.push(new Particle(
      enemy.x + enemy.w / 2,
      enemy.y + enemy.h / 2,
      (Math.random() * 2 - 1) * 6,
      (Math.random() * 2 - 1) * 6,
      Math.random() > 0.4 ? '#f59e0b' : '#ef4444',
      Math.random() * 4 + 3,
      30
    ));
  }
}

function updateEnemies() {
  if (currentLevelId === 1) {
    // Level 1 Mini Boss: Blight Fang Behemoth (Ruins Arena: 2600 .. 3200)
    if (player.x > 2600 && player.x < 3200 && !defeatedBosses.treant) {
      if (!enemies.some(e => e.type === 'boss_treant')) {
        enemies.push(new Enemy(2850, 395, 'boss_treant'));
      }
      if (player.x > 2630 && player.x < 3140 && (!levelBarriers.miniBossLeft.active || !levelBarriers.miniBossRight.active)) {
        levelBarriers.miniBossLeft.active = true;
        levelBarriers.miniBossRight.active = true;
        screenShake = 16;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '⚠ AKAR BERDURI MENGURUNG ARENA! BEHEMOTH BANGKIT! ⚠', '#84cc16'));
      }
    }

    // Level 1 Main Boss: The Blight Chimera (Sunken Hollow Arena: 4500 .. 5320)
    if (player.x > 4500 && player.x < 5320 && !defeatedBosses.chimera && !isBossDefeated) {
      if (!enemies.some(e => e.type === 'boss_chimera')) {
        enemies.push(new Enemy(4850, 394, 'boss_chimera'));
      }
      if (player.x > 4530 && player.x < 5280 && (!levelBarriers.bossLeft.active || !levelBarriers.bossRight.active)) {
        levelBarriers.bossLeft.active = true;
        levelBarriers.bossRight.active = true;
        screenShake = 20;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '👑 SPIRA ABYSS MENUTUP JALAN KELUAR! THE BLIGHT CHIMERA! 👑', '#a855f7'));
      }
    }
  } else {
    // Sector 1 Mini Boss: Mecha Enforcer D-01
    if (player.x > 2150 && player.x < 2800 && !defeatedBosses.mech) {
      if (!enemies.some(e => e.type === 'boss_mech')) {
        enemies.push(new Enemy(2480, 400, 'boss_mech'));
        window.soundEngine.playLaserCannon();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '⚠ WARNING: MECHA ENFORCER D-01! ⚠', '#38bdf8'));
      }
    }

    // Sector 2 Mini Boss: Elysium Colossus
    if (player.x > 4900 && player.x < 5800 && !defeatedBosses.colossus) {
      if (!enemies.some(e => e.type === 'boss_colossus')) {
        enemies.push(new Enemy(5350, 400, 'boss_colossus'));
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '⚠ AWAKENED: ELYSIUM COLOSSUS! ⚠', '#10b981'));
      }
    }

    // Sector 3 Mini Boss: Ignis Wyrm Queen
    if (player.x > 7900 && player.x < 8800 && !defeatedBosses.drake) {
      if (!enemies.some(e => e.type === 'boss_drake')) {
        enemies.push(new Enemy(8350, 320, 'boss_drake'));
        window.soundEngine.playFireBlast();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '⚠ INFERNAL TERROR: IGNIS WYRM! ⚠', '#f97316'));
      }
    }

    // Sector 4 Boss: Vortex Goliath (Titan Colosseum Arena)
    if (player.x > 10400 && player.x < 11600 && !defeatedBosses.goliath && !isBossDefeated) {
      if (!enemies.some(e => e.type === 'boss')) {
        enemies.push(new Enemy(11000, 410, 'boss'));
      }
      if (player.x > 10450 && player.x < 11500 && !isArenaLocked) {
        isArenaLocked = true;
        arenaGates.left.active = true;
        arenaGates.right.active = true;
        screenShake = 14;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '⚠ ARENA LOCKDOWN: VORTEX GOLIATH! ⚠', '#ef4444'));
      }
    }

    // Sector 5 Grand Final Boss: Starfall Emperor Xenos (Citadel Throne)
    if (player.x > 13400 && player.x < 14750 && !defeatedBosses.xenos) {
      if (!enemies.some(e => e.type === 'boss_final')) {
        enemies.push(new Enemy(14200, 390, 'boss_final'));
      }
      if (player.x > 13450 && player.x < 14700 && !isCitadelLocked) {
        isCitadelLocked = true;
        arenaGates.citadelLeft.active = true;
        arenaGates.citadelRight.active = true;
        screenShake = 18;
        window.soundEngine.playExplosion();
        floatingTexts.push(new FloatingText(player.x, player.y - 35, '👑 EMPEROR THRONE: FINAL SHOWDOWN! 👑', '#c084fc'));
      }
    }
  }

  // Update enemy entities and handle player contact damage
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.update();

    if (!player.isInvulnerable &&
        player.x + player.w > enemy.x &&
        player.x < enemy.x + enemy.w &&
        player.y + player.h > enemy.y &&
        player.y < enemy.y + enemy.h) {
      
      const isBossType = enemy.isMiniBoss || enemy.isFinalBoss || enemy.type.startsWith('boss');
      const dmgTaken = enemy.isFinalBoss ? 30 : (isBossType ? 24 : (enemy.type === 'gladiator_berserker' ? 20 : 15));
      player.hp = Math.max(0, player.hp - dmgTaken);
      player.isInvulnerable = true;
      player.invulnTimer = 40;
      player.vx = enemy.x > player.x ? -6 : 6;
      player.vy = -5;
      screenShake = isBossType ? 14 : 8;
      window.soundEngine.playHit();
      floatingTexts.push(new FloatingText(player.x, player.y, '-' + dmgTaken + ' HP', '#ef4444'));
    }

    if (enemy.isDead) {
      enemies.splice(i, 1);
    }
  }

  // Update enemy projectiles and handle player collisions
  for (let p = enemyProjectiles.length - 1; p >= 0; p--) {
    const proj = enemyProjectiles[p];
    proj.update();

    // Shockwave collision vs grounded player
    if (proj.type === 'shockwave') {
      if (!player.isInvulnerable && player.isGrounded &&
          Math.abs(player.x + player.w / 2 - (proj.x + proj.w / 2)) < 26 &&
          player.y + player.h >= proj.y - 6) {
        player.hp = Math.max(0, player.hp - 18);
        player.isInvulnerable = true;
        player.invulnTimer = 40;
        player.vy = -6;
        screenShake = 10;
        window.soundEngine.playHit();
        floatingTexts.push(new FloatingText(player.x, player.y, '-18 HP (QUAKE WAVE)', '#f59e0b'));
        enemyProjectiles.splice(p, 1);
        continue;
      }
    } else {
      // Standard, sphere, missile, and elemental projectile collisions
      if (!player.isInvulnerable &&
          player.x + player.w > proj.x - proj.r &&
          player.x < proj.x + proj.r &&
          player.y + player.h > proj.y - proj.r &&
          player.y < proj.y + proj.r) {
        
        let pDmg = 12;
        let pLabel = '';
        if (proj.type === 'void_sphere') { pDmg = 22; pLabel = 'VOID SPHERE'; }
        else if (proj.type === 'fireball') { pDmg = 20; pLabel = 'FIREBALL'; }
        else if (proj.type === 'micro_missile') { pDmg = 18; pLabel = 'MISSILE'; }
        else if (proj.type === 'ethereal_orb') { pDmg = 16; pLabel = 'ETHER ORB'; }
        else if (proj.type === 'starlight_ray') { pDmg = 15; pLabel = 'STARLIGHT'; }
        else if (proj.type === 'laser_bullet') { pDmg = 14; pLabel = 'LASER'; }
        else if (proj.type === 'magma_pool') { pDmg = 12; pLabel = 'MAGMA'; }

        player.hp = Math.max(0, player.hp - pDmg);
        player.isInvulnerable = true;
        player.invulnTimer = 35;
        screenShake = pDmg > 18 ? 10 : 6;
        window.soundEngine.playHit();
        floatingTexts.push(new FloatingText(player.x, player.y, '-' + pDmg + (pLabel ? ` HP (${pLabel})` : ' HP'), '#ef4444'));
        enemyProjectiles.splice(p, 1);
        continue;
      }
    }

    if (proj.life <= 0 || Math.abs(proj.x - player.x) > 1200) {
      enemyProjectiles.splice(p, 1);
    }
  }
}

// ============================================================================
// PARALLAX BACKGROUND & MULTI-TIER MAP VISUALS (GLITCH-FREE MODULAR ENGINE)
// ============================================================================
const L1_FAR_TREES = [
  { x: 30,  w: 14, h: 320, crownR: 28 },
  { x: 110, w: 10, h: 360, crownR: 22 },
  { x: 190, w: 18, h: 340, crownR: 32 },
  { x: 280, w: 12, h: 310, crownR: 24 },
  { x: 360, w: 16, h: 350, crownR: 30 },
  { x: 440, w: 12, h: 330, crownR: 24 }
];

const L1_MID_TREES = [
  {
    x: 80, w: 36,
    branchL: { dx: -35, dy: -40 },
    branchR: { dx: 40, dy: -35 },
    canopyR: [ { ox: 18, oy: -20, r: 60 }, { ox: -20, oy: 10, r: 45 }, { ox: 55, oy: 10, r: 48 } ],
    vines: [ 5, 20, 32 ]
  },
  {
    x: 340, w: 32,
    branchL: { dx: -30, dy: -35 },
    branchR: { dx: 36, dy: -40 },
    canopyR: [ { ox: 16, oy: -20, r: 55 }, { ox: -16, oy: 10, r: 42 }, { ox: 48, oy: 10, r: 44 } ],
    vines: [ 6, 18, 28 ]
  },
  {
    x: 550, w: 42,
    branchL: { dx: -40, dy: -42 },
    branchR: { dx: 38, dy: -32 },
    canopyR: [ { ox: 21, oy: -25, r: 65 }, { ox: -24, oy: 10, r: 48 }, { ox: 62, oy: 10, r: 50 } ],
    vines: [ 8, 24, 36 ]
  }
];

const L1_FOLIAGE_CLUSTERS = [
  { ox: 30,  oy: -250, r: 48 },
  { ox: -8,  oy: -225, r: 38 },
  { ox: 62,  oy: -235, r: 42 },
  { ox: 24,  oy: -280, r: 40 },
  { ox: -18, oy: -190, r: 26 },
  { ox: 50,  oy: -185, r: 30 }
];

const L1_BUSHES = [
  { ox: 260, w: 55, h: 36 },
  { ox: 380, w: 60, h: 42 },
  { ox: 520, w: 50, h: 34 },
  { ox: 660, w: 55, h: 38 }
];

// ============================================================================
// LEVEL 1 (THE ORIGIN) USER BACKGROUND ASSETS & PARALLAX ENGINE
// ============================================================================
const l1BgAssets = {
  mistyWoods: new Image(),
  ancientTotem: new Image(),
  ruinsShrine: new Image(),
  tilesetRuins: new Image()
};
l1BgAssets.mistyWoods.src = 'assets/bg_misty_woods.jpg';
l1BgAssets.ancientTotem.src = 'assets/bg_ancient_totem.jpg';
l1BgAssets.ruinsShrine.src = 'assets/bg_ruins_shrine.jpg';
l1BgAssets.tilesetRuins.src = 'assets/tileset_verdant_ruins.jpg';

function drawSeamlessParallaxImage(targetCtx, img, camX, speed, targetH, yOffset, alpha = 1.0) {
  if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
  const aspect = img.naturalWidth / img.naturalHeight;
  const targetW = Math.round(targetH * aspect);
  if (targetW <= 0) return false;

  const shift = ((Math.round(camX * speed) % targetW) + targetW) % targetW;
  const startX = -shift;

  targetCtx.save();
  if (alpha < 1.0) targetCtx.globalAlpha = alpha;
  for (let x = startX - targetW; x < V_WIDTH + targetW; x += targetW) {
    targetCtx.drawImage(img, x, yOffset, targetW, targetH);
  }
  targetCtx.restore();
  return true;
}

function drawLevel1ForestParallax(cam) {
  const nowTime = Date.now();

  // 1. Far Background: User Asset 'bg_misty_woods.jpg' (Morning misty woodland & pine silhouettes)
  const renderedMistyWoods = drawSeamlessParallaxImage(ctx, l1BgAssets.mistyWoods, cam.x, 0.04, V_HEIGHT, 0, 1.0);
  if (!renderedMistyWoods) {
    // Procedural Fallback Sky & Pines
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
    skyGrad.addColorStop(0, '#4b6e79');
    skyGrad.addColorStop(0.30, '#668e98');
    skyGrad.addColorStop(0.60, '#8cb5bf');
    skyGrad.addColorStop(0.85, '#b8dfe3');
    skyGrad.addColorStop(1, '#d5eff1');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Distant Soft Morning Sunlight Glow
    const sunPeriod = V_WIDTH + 400;
    const sunShift = ((Math.round(cam.x * 0.015) % sunPeriod) + sunPeriod) % sunPeriod;
    const sunX = V_WIDTH * 0.75 - sunShift;
    const sunY = 90;
    ctx.save();
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 160);
    sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.40)');
    sunGrad.addColorStop(0.3, 'rgba(230, 248, 250, 0.22)');
    sunGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 160, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Distant Slender Misty Tree Silhouettes Fallback
    ctx.save();
    const p1Period = 500;
    const p1Shift = ((Math.round(cam.x * 0.03) % p1Period) + p1Period) % p1Period;
    const p1Start = -p1Shift;
    for (let copy = -1; p1Start + copy * p1Period < V_WIDTH + p1Period; copy++) {
      const chunkX = p1Start + copy * p1Period;
      L1_FAR_TREES.forEach(t => {
        const tx = chunkX + t.x;
        if (tx + t.w < -60 || tx > V_WIDTH + 60) return;
        ctx.fillStyle = '#8ea8b4';
        ctx.globalAlpha = 0.55;
        ctx.fillRect(tx, V_HEIGHT - t.h, t.w, t.h);
      });
    }
    ctx.restore();
  }

  // 2. Mid-Far Layer: User Asset 'bg_ancient_totem.jpg' (Mossy stone totem in lush jungle canopy)
  const renderedTotem = drawSeamlessParallaxImage(ctx, l1BgAssets.ancientTotem, cam.x, 0.11, 410, V_HEIGHT - 410 + 20, 0.72);
  if (!renderedTotem) {
    // Procedural Fallback Midground Trees
    ctx.save();
    const p2Period = 700;
    const p2Shift = ((Math.round(cam.x * 0.07) % p2Period) + p2Period) % p2Period;
    const p2Start = -p2Shift;
    for (let copy = -1; p2Start + copy * p2Period < V_WIDTH + p2Period; copy++) {
      const chunkX = p2Start + copy * p2Period;
      L1_MID_TREES.forEach(t => {
        const tx = chunkX + t.x;
        if (tx + t.w < -100 || tx > V_WIDTH + 100) return;
        ctx.fillStyle = '#415e68';
        ctx.globalAlpha = 0.80;
        ctx.fillRect(tx, 40, t.w, V_HEIGHT);
      });
    }
    ctx.restore();
  }

  // 3. Midground Layer: User Asset 'bg_ruins_shrine.jpg' (Destroyed village shrine & banyan tree roots)
  const renderedRuins = drawSeamlessParallaxImage(ctx, l1BgAssets.ruinsShrine, cam.x, 0.23, 450, V_HEIGHT - 450, 0.88);
  if (!renderedRuins) {
    // Procedural Fallback Near Trees & Undergrowth
    ctx.save();
    const p3Period = 1100;
    const p3Shift = ((Math.round(cam.x * 0.14) % p3Period) + p3Period) % p3Period;
    const p3Start = -p3Shift;
    for (let copy = -1; p3Start + copy * p3Period < V_WIDTH + p3Period; copy++) {
      const chunkX = p3Start + copy * p3Period;
      const giantX = chunkX + 70;
      if (giantX + 95 > -150 && giantX < V_WIDTH + 150) {
        ctx.fillStyle = '#2f3b44';
        ctx.fillRect(giantX, 0, 95, V_HEIGHT);
      }
    }
    ctx.restore();
  }

  // 4. Volumetric Morning Sun God Rays (Filtering down through destroyed ruins canopy)
  ctx.save();
  const rayAngle = -0.32;
  ctx.translate(V_WIDTH * 0.72, -30);
  ctx.rotate(rayAngle);
  const rayPulse = 0.06 + Math.sin(nowTime / 1400) * 0.025;
  const rayGrad = ctx.createLinearGradient(0, 0, 0, 520);
  rayGrad.addColorStop(0, `rgba(255, 255, 220, ${rayPulse * 1.6})`);
  rayGrad.addColorStop(0.5, `rgba(210, 240, 235, ${rayPulse})`);
  rayGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = rayGrad;
  ctx.fillRect(-150, 0, 85, 520);
  ctx.fillRect(10, 0, 115, 520);
  ctx.fillRect(170, 0, 75, 520);
  ctx.restore();

  // 5. Rolling Morning Valley Mist / Fog Banks (Static height over chasms)
  ctx.save();
  const mistGrad = ctx.createLinearGradient(0, V_HEIGHT - 130, 0, V_HEIGHT);
  mistGrad.addColorStop(0, 'transparent');
  mistGrad.addColorStop(0.5, 'rgba(180, 222, 226, 0.35)');
  mistGrad.addColorStop(1, 'rgba(150, 205, 211, 0.65)');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, V_HEIGHT - 130, V_WIDTH, 130);
  ctx.restore();

  // 6. Ambient Drifting Forest Spores & Fireflies (Golden & Emerald)
  ctx.save();
  const animTime = nowTime / 40;
  for (let s = 0; s < 28; s++) {
    const spX = Math.round(((s * 97 - cam.x * 0.18 + animTime) % V_WIDTH + V_WIDTH) % V_WIDTH);
    const spY = Math.round(((s * 53 + Math.sin(nowTime / 500 + s) * 18) % (V_HEIGHT - 90) + (V_HEIGHT - 90)) % (V_HEIGHT - 90));
    const alpha = 0.35 + Math.sin(nowTime / 350 + s) * 0.28;
    ctx.globalAlpha = Math.max(0.12, alpha);
    ctx.fillStyle = s % 2 === 0 ? '#6ee7b7' : '#fef08a';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(spX, spY, (s % 3) + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 7. Ambient Falling Forest Leaves (Swaying gently in the wind)
  ctx.save();
  for (let l = 0; l < 16; l++) {
    const lfTime = nowTime / 24 + l * 143;
    const lfX = Math.round(((l * 127 - cam.x * 0.32 + lfTime * 0.75) % (V_WIDTH + 80) + (V_WIDTH + 80)) % (V_WIDTH + 80) - 40);
    const lfY = Math.round(((l * 69 + lfTime * 0.55 + Math.sin(nowTime / 420 + l) * 22) % (V_HEIGHT + 40) + (V_HEIGHT + 40)) % (V_HEIGHT + 40) - 20);
    const lRot = Math.sin(nowTime / 580 + l) * 1.3;
    ctx.save();
    ctx.translate(lfX, lfY);
    ctx.rotate(lRot);
    ctx.fillStyle = l % 3 === 0 ? '#4ade80' : (l % 3 === 1 ? '#86efac' : '#f59e0b');
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.5, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawParallaxBackground(cam) {
  if (currentLevelId === 1) {
    drawLevel1ForestParallax(cam);
    return;
  }

  const currentWorldX = cam.x + V_WIDTH / 2;

  // 1. Dynamic Biome Sky Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
  if (currentWorldX < 2800) {
    // Sector 1: Cyber Metropolis Midnight Navy & Matrix Indigo
    bgGrad.addColorStop(0, '#020409');
    bgGrad.addColorStop(0.5, '#070c1d');
    bgGrad.addColorStop(0.85, '#0c122b');
    bgGrad.addColorStop(1, '#050814');
  } else if (currentWorldX < 5800) {
    // Sector 2: Ancient Ruins Emerald-Teal Twilight
    bgGrad.addColorStop(0, '#020908');
    bgGrad.addColorStop(0.45, '#041713');
    bgGrad.addColorStop(0.85, '#092720');
    bgGrad.addColorStop(1, '#030e0b');
  } else if (currentWorldX < 8800) {
    // Sector 3: Volcanic Caverns Searing Crimson & Charcoal Smog
    bgGrad.addColorStop(0, '#0a0303');
    bgGrad.addColorStop(0.45, '#1c0606');
    bgGrad.addColorStop(0.85, '#3b0909');
    bgGrad.addColorStop(1, '#150303');
  } else if (currentWorldX < 11800) {
    // Sector 4: The Colosseum Eclipse Void Purple & Gladiatorial Crimson
    bgGrad.addColorStop(0, '#08020e');
    bgGrad.addColorStop(0.45, '#170524');
    bgGrad.addColorStop(0.85, '#2e0828');
    bgGrad.addColorStop(1, '#110313');
  } else {
    // Sector 5: Astral Gateway Deep Cosmic Nebula
    bgGrad.addColorStop(0, '#020617');
    bgGrad.addColorStop(0.45, '#0a1029');
    bgGrad.addColorStop(0.85, '#17163d');
    bgGrad.addColorStop(1, '#060919');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

  // 2. Parallax Twinkling Stars (Factor: 0.035x)
  stars.forEach(s => {
    const starParallaxX = (s.x - cam.x * 0.035) % V_WIDTH;
    const finalX = starParallaxX < 0 ? starParallaxX + V_WIDTH : starParallaxX;
    ctx.fillStyle = s.color;
    ctx.fillRect(finalX, s.y, s.size, s.size);
  });

  // 3. Dynamic Sector Celestial Body (Factor: 0.02x)
  const celestialX = ((700 - cam.x * 0.02) % (V_WIDTH + 260) + (V_WIDTH + 260)) % (V_WIDTH + 260) - 80;
  const celestialY = 78;

  ctx.save();
  if (currentWorldX < 2800) {
    // Sector 1: Cyber Neon Moon
    ctx.fillStyle = '#0f172a';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.6)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Concentric scanner rings
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 60, 0, Math.PI * 2);
    ctx.stroke();
    // Cyber reticle tick marks
    ctx.fillStyle = '#00f5ff';
    ctx.fillRect(celestialX - 66, celestialY - 1, 10, 2);
    ctx.fillRect(celestialX + 56, celestialY - 1, 10, 2);

  } else if (currentWorldX < 5800) {
    // Sector 2: Shattered Ancient Astral Core (Elysium Relic)
    ctx.fillStyle = '#064e3b';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 28;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Glowing golden fracture lines across ancient moon
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(celestialX - 25, celestialY - 15);
    ctx.lineTo(celestialX + 5, celestialY);
    ctx.lineTo(celestialX + 28, celestialY - 20);
    ctx.moveTo(celestialX + 5, celestialY);
    ctx.lineTo(celestialX - 10, celestialY + 30);
    ctx.stroke();

    // Floating orbit fragments
    const orbitAngle = Date.now() / 900;
    const f1x = celestialX + Math.cos(orbitAngle) * 58;
    const f1y = celestialY + Math.sin(orbitAngle) * 22;
    const f2x = celestialX + Math.cos(orbitAngle + Math.PI) * 62;
    const f2y = celestialY + Math.sin(orbitAngle + Math.PI) * 24;
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 10;
    ctx.fillRect(f1x - 4, f1y - 4, 8, 8);
    ctx.fillRect(f2x - 3, f2y - 3, 6, 6);

  } else if (currentWorldX < 8800) {
    // Sector 3: Volcanic Solar Eclipse
    const coronaPulse = Math.sin(Date.now() / 200) * 4;
    const coronaGrad = ctx.createRadialGradient(celestialX, celestialY, 32, celestialX, celestialY, 70 + coronaPulse);
    coronaGrad.addColorStop(0, '#f97316');
    coronaGrad.addColorStop(0.5, '#ef4444');
    coronaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 70 + coronaPulse, 0, Math.PI * 2);
    ctx.fill();

    // Pitch black occulting sphere
    ctx.fillStyle = '#090202';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

  } else if (currentWorldX < 11800) {
    // Sector 4: The Vortex Singularity
    const spin = Date.now() / 600;
    ctx.save();
    ctx.translate(celestialX, celestialY);
    ctx.rotate(spin);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, 68, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 84, 28, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Event horizon core
    ctx.fillStyle = '#05010a';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 26;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.stroke();

  } else {
    // Sector 5: Astral Hyper-Gate Portal
    const portalSpin = Date.now() / 800;
    ctx.save();
    ctx.translate(celestialX, celestialY);
    ctx.rotate(portalSpin);

    // Multi-ring warp rings
    ctx.strokeStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 24;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Central starburst core
    const corePulse = Math.sin(Date.now() / 150) * 4;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 32;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, 22 + corePulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Parallax Layer 1: Distant Silhouettes (Factor: 0.08x)
  ctx.save();
  const layer1Offset = -(cam.x * 0.08) % 720;
  for (let repeat = -1; repeat <= 2; repeat++) {
    const baseX = layer1Offset + repeat * 720;
    const chunkWorldX = cam.x + (repeat * 720 + layer1Offset) * 1.5;

    if (chunkWorldX < 2800) {
      // Sector 1: Cyber City Skyline
      ctx.fillStyle = 'rgba(8, 14, 28, 0.9)';
      ctx.beginPath();
      ctx.moveTo(baseX + 0, 360);
      ctx.lineTo(baseX + 40, 260);
      ctx.lineTo(baseX + 90, 260);
      ctx.lineTo(baseX + 90, 190);
      ctx.lineTo(baseX + 160, 190);
      ctx.lineTo(baseX + 160, 290);
      ctx.lineTo(baseX + 220, 220);
      ctx.lineTo(baseX + 310, 220);
      ctx.lineTo(baseX + 310, 310);
      ctx.lineTo(baseX + 390, 160);
      ctx.lineTo(baseX + 470, 160);
      ctx.lineTo(baseX + 470, 250);
      ctx.lineTo(baseX + 540, 200);
      ctx.lineTo(baseX + 630, 200);
      ctx.lineTo(baseX + 630, 360);
      ctx.closePath();
      ctx.fill();

      // Antenna spires & beacons
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(baseX + 125, 190);
      ctx.lineTo(baseX + 125, 140);
      ctx.moveTo(baseX + 430, 160);
      ctx.lineTo(baseX + 430, 110);
      ctx.stroke();

      if (Math.sin(Date.now() / 300) > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(baseX + 123, 138, 4, 4);
        ctx.fillRect(baseX + 428, 108, 4, 4);
      }

    } else if (chunkWorldX < 5800) {
      // Sector 2: Overgrown Temple Spires & Floating Ruin Monoliths
      ctx.fillStyle = 'rgba(4, 20, 16, 0.9)';
      ctx.beginPath();
      ctx.moveTo(baseX + 0, 360);
      ctx.lineTo(baseX + 60, 230);
      ctx.lineTo(baseX + 110, 160);
      ctx.lineTo(baseX + 160, 230);
      ctx.lineTo(baseX + 220, 270);
      ctx.lineTo(baseX + 290, 210);
      ctx.lineTo(baseX + 350, 210);
      ctx.lineTo(baseX + 410, 140);
      ctx.lineTo(baseX + 460, 140);
      ctx.lineTo(baseX + 520, 260);
      ctx.lineTo(baseX + 590, 230);
      ctx.lineTo(baseX + 650, 360);
      ctx.closePath();
      ctx.fill();

      // Floating broken stone monoliths
      const floatBob = Math.sin(Date.now() / 400 + repeat) * 6;
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(baseX + 180, 130 + floatBob, 42, 22);
      ctx.fillRect(baseX + 490, 100 - floatBob, 50, 26);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(baseX + 188, 138 + floatBob, 26, 3);
      ctx.fillRect(baseX + 500, 110 - floatBob, 30, 3);

    } else if (chunkWorldX < 8800) {
      // Sector 3: Jagged Volcanic Peaks & Magma Caldera
      ctx.fillStyle = 'rgba(24, 6, 6, 0.92)';
      ctx.beginPath();
      ctx.moveTo(baseX + 0, 360);
      ctx.lineTo(baseX + 70, 180);
      ctx.lineTo(baseX + 120, 220);
      ctx.lineTo(baseX + 200, 140);
      ctx.lineTo(baseX + 270, 240);
      ctx.lineTo(baseX + 340, 190);
      ctx.lineTo(baseX + 430, 130);
      ctx.lineTo(baseX + 490, 200);
      ctx.lineTo(baseX + 570, 160);
      ctx.lineTo(baseX + 650, 360);
      ctx.closePath();
      ctx.fill();

      // Distant cascading magma falls
      const lavaBob = Math.sin(Date.now() / 150) * 2;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(baseX + 202, 142);
      ctx.lineTo(baseX + 210, 220 + lavaBob);
      ctx.lineTo(baseX + 218, 320);
      ctx.stroke();

    } else if (chunkWorldX < 11800) {
      // Sector 4: Colosseum Monumental Roman-Galactic Arches
      ctx.fillStyle = 'rgba(18, 6, 24, 0.92)';
      ctx.beginPath();
      ctx.moveTo(baseX + 0, 360);
      ctx.lineTo(baseX + 50, 210);
      ctx.lineTo(baseX + 140, 210);
      ctx.lineTo(baseX + 180, 160);
      ctx.lineTo(baseX + 260, 160);
      ctx.lineTo(baseX + 300, 220);
      ctx.lineTo(baseX + 400, 180);
      ctx.lineTo(baseX + 470, 180);
      ctx.lineTo(baseX + 530, 130);
      ctx.lineTo(baseX + 610, 130);
      ctx.lineTo(baseX + 660, 360);
      ctx.closePath();
      ctx.fill();

      // Grand arch cutouts
      ctx.fillStyle = 'rgba(10, 2, 14, 0.95)';
      ctx.beginPath();
      ctx.arc(baseX + 220, 200, 22, Math.PI, 0);
      ctx.lineTo(baseX + 242, 250);
      ctx.lineTo(baseX + 198, 250);
      ctx.closePath();
      ctx.fill();

      // Crimson laser banners
      ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.fillRect(baseX + 218, 162, 4, 38);
      ctx.fillRect(baseX + 568, 132, 4, 48);

    } else {
      // Sector 5: Astral Gateway Cosmic Energy Pylons
      ctx.fillStyle = 'rgba(8, 14, 34, 0.92)';
      ctx.beginPath();
      ctx.moveTo(baseX + 0, 360);
      ctx.lineTo(baseX + 80, 200);
      ctx.lineTo(baseX + 140, 120);
      ctx.lineTo(baseX + 200, 200);
      ctx.lineTo(baseX + 280, 240);
      ctx.lineTo(baseX + 360, 160);
      ctx.lineTo(baseX + 440, 100);
      ctx.lineTo(baseX + 520, 160);
      ctx.lineTo(baseX + 600, 250);
      ctx.lineTo(baseX + 660, 360);
      ctx.closePath();
      ctx.fill();

      // Quantum cyan vertical beam
      const beamAlpha = Math.sin(Date.now() / 180) * 0.25 + 0.6;
      ctx.fillStyle = `rgba(0, 245, 255, ${beamAlpha})`;
      ctx.fillRect(baseX + 438, 30, 4, 280);
    }
  }
  ctx.restore();

  // 5. Parallax Layer 2: Mid-ground Megastructures & Holograms (Factor: 0.24x)
  ctx.save();
  const layer2Offset = -(cam.x * 0.24) % 960;
  for (let repeat = -1; repeat <= 2; repeat++) {
    const baseX = layer2Offset + repeat * 960;
    const midWorldX = cam.x + (repeat * 960 + layer2Offset) * 1.2;

    if (midWorldX < 2800) {
      // Sector 1: Cyberpunk towers & Hologram signs
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.fillRect(baseX + 60, 240, 130, 240);
      ctx.fillRect(baseX + 280, 210, 160, 270);
      ctx.fillRect(baseX + 520, 260, 140, 220);
      ctx.fillRect(baseX + 740, 190, 150, 290);

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 10;
      ctx.fillText('CYBER CORP', baseX + 75, 270);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.fillText('電脳 刀', baseX + 330, 240);

      ctx.fillStyle = 'rgba(0, 245, 255, 0.5)';
      ctx.fillRect(baseX + 540, 290, 100, 3);
      ctx.fillRect(baseX + 760, 220, 110, 3);
      ctx.shadowBlur = 0;

    } else if (midWorldX < 5800) {
      // Sector 2: Overgrown Temple Colonnades & Rune Circles
      ctx.fillStyle = 'rgba(6, 32, 24, 0.95)';
      ctx.fillRect(baseX + 70, 220, 110, 260);
      ctx.fillRect(baseX + 290, 190, 150, 290);
      ctx.fillRect(baseX + 540, 230, 120, 250);
      ctx.fillRect(baseX + 750, 180, 140, 300);

      ctx.strokeStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(baseX + 125, 260, 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#34d399';
      ctx.fillText('ELYSIUM', baseX + 320, 230);
      ctx.shadowBlur = 0;

    } else if (midWorldX < 8800) {
      // Sector 3: Industrial Magma Smelters & Cooling Towers
      ctx.fillStyle = 'rgba(28, 10, 8, 0.95)';
      ctx.fillRect(baseX + 80, 230, 140, 250);
      ctx.fillRect(baseX + 310, 190, 150, 290);
      ctx.fillRect(baseX + 540, 240, 130, 240);
      ctx.fillRect(baseX + 760, 180, 140, 300);

      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.fillRect(baseX + 110, 270, 80, 4);
      ctx.fillRect(baseX + 340, 230, 90, 4);

      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText('FOUNDRY', baseX + 335, 260);
      ctx.shadowBlur = 0;

    } else if (midWorldX < 11800) {
      // Sector 4: Colosseum Spectator Tiers & Grand Braziers
      ctx.fillStyle = 'rgba(22, 8, 28, 0.95)';
      ctx.fillRect(baseX + 70, 230, 130, 250);
      ctx.fillRect(baseX + 280, 190, 160, 290);
      ctx.fillRect(baseX + 530, 240, 140, 240);
      ctx.fillRect(baseX + 760, 180, 140, 300);

      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillText('COLOSSEUM', baseX + 295, 230);

      const flameH = 10 + Math.sin(Date.now() / 90 + repeat) * 4;
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(baseX + 600, 240 - flameH, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      // Sector 5: Astral Gateway Crystal Obelisks
      ctx.fillStyle = 'rgba(12, 18, 42, 0.95)';
      ctx.fillRect(baseX + 80, 220, 120, 260);
      ctx.fillRect(baseX + 300, 180, 150, 300);
      ctx.fillRect(baseX + 540, 230, 130, 250);
      ctx.fillRect(baseX + 760, 170, 140, 310);

      ctx.font = '9px "Press Start 2P", monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillText('SANCTUM GATE', baseX + 305, 220);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.fillRect(baseX + 560, 260, 90, 3);
      ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

function updateAndDrawLavaDrips() {
  lavaDripTimer++;
  // Spawn a new drip from high magma platforms if player is in magma zone (5800..8800)
  if (lavaDripTimer % 32 === 0 && player.x > 5800 && player.x < 8800) {
    const magmaPlatforms = platforms.filter(p => p.type === 'magma_ground' && p.y < 460);
    if (magmaPlatforms.length > 0) {
      const p = magmaPlatforms[Math.floor(Math.random() * magmaPlatforms.length)];
      lavaDrips.push({
        x: p.x + 20 + Math.random() * (p.w - 40),
        y: p.y + p.h,
        vy: 1.2,
        size: 3.2,
        life: 80
      });
    }
  }

  for (let d = lavaDrips.length - 1; d >= 0; d--) {
    const drip = lavaDrips[d];
    drip.vy += 0.22;
    drip.y += drip.vy;
    drip.life--;

    // Draw glowing molten droplet
    ctx.save();
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(drip.x, drip.y, drip.size * 0.7, drip.size * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(drip.x, drip.y, drip.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Splash when hitting floor
    if (drip.y >= 680 || drip.life <= 0) {
      for (let s = 0; s < 4; s++) {
        particles.push(new Particle(drip.x, Math.min(680, drip.y), (Math.random() - 0.5) * 3.5, -Math.random() * 2.5, '#f97316', 2, 14));
      }
      lavaDrips.splice(d, 1);
    }
  }
}

function drawPlatforms() {
  platforms.forEach(p => {
    // 0. LEVEL 1: FOREST STONE & VILLAGE PATHS
    // 0. LEVEL 1: ANCIENT MOSS-COVERED COBBLESTONE BRICKS (EXACT PIXEL ART REFERENCE STYLE)
    if (p.type === 'forest_stone') {
      ctx.save();
      // Foundation fill
      ctx.fillStyle = '#171522';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Modular Stone Bricks Grid (16px wide x 14px high)
      const brickW = 16;
      const brickH = 14;
      const rows = Math.ceil(p.h / brickH);

      for (let r = 0; r < rows; r++) {
        const by = p.y + r * brickH;
        const curH = Math.min(brickH, p.y + p.h - by);
        const rowOffset = (r % 2) * (brickW / 2);
        const startBx = p.x - rowOffset;
        const endBx = p.x + p.w;

        for (let bx = startBx; bx < endBx; bx += brickW) {
          const drawX = Math.max(p.x, bx);
          const drawW = Math.min(bx + brickW, p.x + p.w) - drawX;
          if (drawW <= 0) continue;

          // Main stone body (Dark slate purple-charcoal from reference image)
          const stoneVar = ((Math.floor(bx / brickW) * 7 + r * 13) % 5);
          ctx.fillStyle = stoneVar === 0 ? '#272437' : (stoneVar === 1 ? '#201e2e' : '#242234');
          ctx.fillRect(drawX, by, drawW, curH);

          // Top bevel highlight (lighter stone edge)
          ctx.fillStyle = '#39364f';
          ctx.fillRect(drawX, by, drawW, 1.5);

          // Left bevel highlight
          if (bx >= p.x) {
            ctx.fillStyle = '#39364f';
            ctx.fillRect(drawX, by, 1.5, curH);
          }

          // Bottom bevel shadow (deep dark edge)
          ctx.fillStyle = '#151320';
          ctx.fillRect(drawX, by + curH - 1.5, drawW, 1.5);

          // Right bevel shadow
          if (bx + brickW <= p.x + p.w) {
            ctx.fillStyle = '#151320';
            ctx.fillRect(drawX + drawW - 1.5, by, 1.5, curH);
          }

          // Mortar seams
          ctx.fillStyle = '#0f0e17';
          ctx.fillRect(drawX, by, drawW, 0.8);
          if (bx >= p.x) ctx.fillRect(drawX, by, 0.8, curH);
        }
      }

      // Hollow Dark Alcoves / Cavern Windows in Thick Stone (As seen in reference image!)
      if (p.w >= 110 && p.h >= 65) {
        const alcoveCount = Math.floor(p.w / 140);
        for (let a = 0; a < alcoveCount; a++) {
          const alcX = p.x + 35 + a * 130;
          const alcY = p.y + 24;
          const alcW = 24;
          const alcH = 28;
          if (alcX + alcW < p.x + p.w - 15 && alcY + alcH < p.y + p.h - 10) {
            // Dark cavern interior void
            ctx.fillStyle = '#0a0910';
            ctx.fillRect(alcX, alcY, alcW, alcH);
            // Rough stone arch frame
            ctx.strokeStyle = '#151320';
            ctx.lineWidth = 2;
            ctx.strokeRect(alcX, alcY, alcW, alcH);
            // Moss growing along window sill
            ctx.fillStyle = '#16a34a';
            ctx.fillRect(alcX - 2, alcY + alcH - 3, alcW + 4, 3);
            ctx.fillStyle = '#84cc16';
            ctx.fillRect(alcX + 2, alcY + alcH - 4, alcW - 4, 2);
          }
        }
      }

      // Stepped Ruined Stone Archway (If stone is tall enough, like the tower in reference image)
      if (p.label === 'STONE ARCH TOWER' || (p.w <= 100 && p.h >= 70 && p.h < 180)) {
        const archW = 34;
        const archH = 46;
        const archX = p.x + (p.w - archW) / 2;
        const archY = p.y + p.h - archH;
        ctx.fillStyle = '#0c0b13';
        ctx.beginPath();
        ctx.moveTo(archX, archY + archH);
        ctx.lineTo(archX, archY + 14);
        ctx.arc(archX + archW / 2, archY + 14, archW / 2, Math.PI, 0);
        ctx.lineTo(archX + archW, archY + archH);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#181624';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // --- SIGNATURE LUSH MOSS & GRASS CARPET ON TOP ---
      // Base dark green shadow
      ctx.fillStyle = '#14532d';
      ctx.fillRect(p.x, p.y, p.w, 6);
      // Mid emerald grass
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(p.x, p.y, p.w, 4);
      // Top sunlit lime highlight line
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(p.x, p.y, p.w, 2);

      // Drooping Scalloped Pixel Grass Fringes / Overhangs
      for (let fx = p.x + 3; fx < p.x + p.w - 4; fx += 8) {
        const fringeLen = 3 + ((fx * 7) % 5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(fx, p.y + 4, 3.5, fringeLen);
        ctx.fillStyle = '#84cc16';
        ctx.fillRect(fx, p.y + 2, 3.5, 2);
        // Dark underside shadow tip
        ctx.fillStyle = '#14532d';
        ctx.fillRect(fx + 0.5, p.y + 4 + fringeLen, 2.5, 1.5);
      }

      // Cute Red Fairy Mushrooms with White Spots (From reference image!)
      for (let mx = p.x + 18; mx < p.x + p.w - 18; mx += 68) {
        const shroomSeed = (mx * 13) % 3;
        if (shroomSeed !== 0) {
          // White mushroom stalk
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(mx + 2, p.y - 4, 3, 4);
          // Red cap
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(mx + 3.5, p.y - 4, 4.5, Math.PI, 0);
          ctx.fill();
          // White polka dots
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(mx + 1.5, p.y - 7, 1.5, 1.5);
          ctx.fillRect(mx + 4.5, p.y - 6, 1.5, 1.5);
        }
      }

      // Clustered Shrub Spheres / Bush Balls on Corners
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(p.x + 4, p.y - 1, 5, 0, Math.PI * 2);
      ctx.arc(p.x + p.w - 4, p.y - 1, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y - 2, 3, 0, Math.PI * 2);
      ctx.arc(p.x + p.w - 5, p.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Creeping Side Moss & Hanging Ivy Tendrils
      for (let vx = p.x + 14; vx < p.x + p.w - 14; vx += 38) {
        const vLen = 10 + ((vx * 13) % 18);
        const sway = Math.sin(Date.now() / 650 + vx * 0.04) * 3.5;
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(vx, p.y + p.h);
        ctx.quadraticCurveTo(vx + sway * 0.5, p.y + p.h + vLen * 0.5, vx + sway, p.y + p.h + vLen);
        ctx.stroke();
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.arc(vx + sway, p.y + p.h + vLen, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

    // LEVEL 1: DILAPIDATED WOODEN RUINS & ROOFS
    } else if (p.type === 'wooden_ruins') {
      ctx.save();
      ctx.fillStyle = '#451a03';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(p.x, p.y, p.w, 4);

      ctx.strokeStyle = '#271406';
      ctx.lineWidth = 1.8;
      for (let px = p.x + 28; px < p.x + p.w - 10; px += 38) {
        ctx.beginPath();
        ctx.moveTo(px, p.y);
        ctx.lineTo(px, p.y + p.h);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(px - 4, p.y + 3, 2.5, 2.5);
        ctx.fillRect(px - 4, p.y + p.h - 5, 2.5, 2.5);
      }

      for (let mx = p.x + 8; mx < p.x + p.w - 15; mx += 60) {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(mx, p.y + 1, 14, 2.5);
      }
      ctx.restore();

    // LEVEL 1: CANOPY BRANCHES
    } else if (p.type === 'canopy_branch') {
      ctx.save();
      ctx.fillStyle = '#3f200c';
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 6);
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.fillRect(p.x + 2, p.y, p.w - 4, 4);

      for (let fx = p.x + 10; fx < p.x + p.w - 15; fx += 26) {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(fx, p.y - 4, 8, 0, Math.PI * 2);
        ctx.arc(fx + 6, p.y - 6, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(fx + 3, p.y - 7, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let wx = p.x + 16; wx < p.x + p.w - 16; wx += 30) {
        const wLen = 14 + ((wx * 11) % 18);
        const wSway = Math.sin(Date.now() / 600 + wx * 0.05) * 4.5;
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(wx, p.y + p.h);
        ctx.lineTo(wx + wSway, p.y + p.h + wLen);
        ctx.stroke();
      }
      ctx.restore();

    // LEVEL 1: SUSPENDED ROPE BRIDGES OVER CHASMS
    } else if (p.type === 'rope_bridge') {
      ctx.save();
      // Wooden anchor pilings at bridge ends
      ctx.fillStyle = '#451a03';
      ctx.fillRect(p.x - 6, p.y - 14, 10, p.h + 18);
      ctx.fillRect(p.x + p.w - 4, p.y - 14, 10, p.h + 18);
      // Coiled hemp rope wraps on pilings
      ctx.fillStyle = '#b45309';
      ctx.fillRect(p.x - 6, p.y - 10, 10, 5);
      ctx.fillRect(p.x + p.w - 4, p.y - 10, 10, 5);

      // Sagging top guide rope
      const sagMax = Math.min(18, p.w * 0.08);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 10);
      ctx.quadraticCurveTo(p.x + p.w / 2, p.y - 10 + sagMax, p.x + p.w, p.y - 10);
      ctx.stroke();

      // Slatted wooden bridge planks along bottom deck
      const plankCount = Math.floor(p.w / 16);
      for (let i = 0; i <= plankCount; i++) {
        const t = i / plankCount;
        const bx = p.x + t * (p.w - 14);
        const sag = Math.sin(t * Math.PI) * (sagMax * 0.5);
        const by = p.y + sag;

        // Vertical suspension cord connecting top rope to plank
        const topRopeY = (p.y - 10) + Math.sin(t * Math.PI) * sagMax;
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(bx + 6, topRopeY);
        ctx.lineTo(bx + 6, by);
        ctx.stroke();

        // Wooden plank
        ctx.fillStyle = (i % 2 === 0) ? '#5c2e0b' : '#451a03';
        ctx.fillRect(bx, by, 12, p.h);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(bx, by, 12, 3);
        // Iron rivets
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(bx + 2, by + 4, 2, 2);
        ctx.fillRect(bx + 8, by + 4, 2, 2);
      }
      ctx.restore();

    // LEVEL 1: MOVING LIFTS & ELEVATOR RAFTS
    } else if (p.type === 'moving_lift') {
      ctx.save();
      // Heavy timber base raft
      ctx.fillStyle = '#271406';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#5c2e0b';
      ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
      // Top polished wood deck
      ctx.fillStyle = '#78350f';
      ctx.fillRect(p.x, p.y, p.w, 4);

      // Steel corner reinforcement brackets & rivets
      ctx.fillStyle = '#334155';
      ctx.fillRect(p.x, p.y, 8, p.h);
      ctx.fillRect(p.x + p.w - 8, p.y, 8, p.h);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(p.x + 3, p.y + 4, 2.5, 2.5);
      ctx.fillRect(p.x + p.w - 6, p.y + 4, 2.5, 2.5);

      // Hoist cables extending upward
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(p.x + 14, p.y);
      ctx.lineTo(p.x + 14, p.y - 140);
      ctx.moveTo(p.x + p.w - 14, p.y);
      ctx.lineTo(p.x + p.w - 14, p.y - 140);
      ctx.stroke();

      // Overhead pulley / suspension mount
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(p.x + 14, p.y - 140, 6, 0, Math.PI * 2);
      ctx.arc(p.x + p.w - 14, p.y - 140, 6, 0, Math.PI * 2);
      ctx.fill();

      // Warm swinging lantern on lift side
      const lanternBob = Math.sin(Date.now() / 320 + p.x * 0.02) * 2;
      const lanX = p.x + p.w / 2;
      const lanY = p.y + p.h + 8 + lanternBob;
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lanX, p.y + p.h);
      ctx.lineTo(lanX, lanY);
      ctx.stroke();

      // Lantern body & glowing firefly light
      ctx.fillStyle = '#b45309';
      ctx.fillRect(lanX - 4, lanY, 8, 10);
      ctx.fillStyle = '#fef08a';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.fillRect(lanX - 2.5, lanY + 2, 5, 6);
      ctx.shadowBlur = 0;

      // Platform directional gear indicator
      const pulse = Math.floor(Date.now() / 150) % 4;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(p.x + p.w / 2 - 12 + pulse * 6, p.y + 1, 4, 2);
      ctx.restore();

    // LEVEL 1: HANGING CLIMBING ROPES & VINES
    } else if (p.type === 'hanging_rope') {
      ctx.save();
      const sway = Math.sin(Date.now() / 700 + p.x * 0.05) * 3.5;
      // Anchor knot/fixture at top
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Braided core vine/rope
      ctx.strokeStyle = '#5c2e0b';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x + p.w / 2, p.y);
      ctx.quadraticCurveTo(p.x + p.w / 2 + sway * 0.6, p.y + p.h * 0.5, p.x + p.w / 2 + sway, p.y + p.h);
      ctx.stroke();

      // Inner mossy braid highlight
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x + p.w / 2, p.y);
      ctx.quadraticCurveTo(p.x + p.w / 2 + sway * 0.6, p.y + p.h * 0.5, p.x + p.w / 2 + sway, p.y + p.h);
      ctx.stroke();

      // Tied knots & emerald leaf clusters every 24px
      const knotCount = Math.floor(p.h / 24);
      for (let k = 1; k <= knotCount; k++) {
        const kt = k / knotCount;
        const kx = p.x + p.w / 2 + sway * kt;
        const ky = p.y + kt * p.h;

        // Knot ring
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.arc(kx, ky, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Leaf sprout
        const leafDir = (k % 2 === 0) ? 1 : -1;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(kx + leafDir * 6, ky - 2, 5, 2.5, leafDir * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // If player is nearby, show floating climb prompt
      const playerDist = Math.hypot((player.x + player.w / 2) - (p.x + p.w / 2), (player.y + player.h / 2) - (p.y + p.h / 2));
      if (playerDist < 70) {
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#84cc16';
        ctx.shadowColor = '#84cc16';
        ctx.shadowBlur = 6;
        ctx.fillText('▲/▼ PANJAT', p.x - 14 + sway * 0.5, p.y + p.h * 0.5);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

    // 1. ANCIENT RUINS GROUND & STONE SLABS (SECTOR 2)
    } else if (p.type === 'ruin_ground' || p.type === 'ruin_stone') {
      ctx.save();
      // Weathered ancient stone slab
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Ancient stone top rim
      ctx.fillStyle = '#292524';
      ctx.fillRect(p.x, p.y, p.w, 5);

      // Glowing ancient golden rune circuit
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y + 5, p.w, 2);
      ctx.shadowBlur = 0;

      // Mossy overgrown patches & stone block seams
      for (let mx = p.x + 10; mx < p.x + p.w - 15; mx += 36) {
        ctx.fillStyle = '#15803d'; // Emerald green moss
        ctx.fillRect(mx, p.y + 1, 14, 3);
        ctx.fillStyle = '#0c0a09';
        ctx.fillRect(mx + 20, p.y + 8, 2, p.h - 8); // Stone mortar seams
      }

      // Hanging ivy vines beneath ancient stone slabs
      for (let vx = p.x + 14; vx < p.x + p.w - 12; vx += 32) {
        const vLen = 10 + ((vx * 13) % 16);
        const sway = Math.sin(Date.now() / 650 + vx * 0.04) * 3.5;
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(vx, p.y + p.h);
        ctx.quadraticCurveTo(vx + sway * 0.6, p.y + p.h + vLen * 0.5, vx + sway, p.y + p.h + vLen);
        ctx.stroke();
        // Emerald leaf tip
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(vx + sway, p.y + p.h + vLen, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

    // 2. ANCIENT RUINS WALL-JUMP PILLARS
    } else if (p.type === 'ruin_wall') {
      ctx.save();
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      // Glowing Emerald Rune Climbing Chevrons
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x + 4, p.y + 8, p.w - 8, 3);
      ctx.fillRect(p.x + 4, p.y + p.h - 12, p.w - 8, 3);

      for (let wy = p.y + 35; wy < p.y + p.h - 30; wy += 45) {
        ctx.beginPath();
        ctx.moveTo(p.x + 6, wy + 8);
        ctx.lineTo(p.x + p.w / 2, wy);
        ctx.lineTo(p.x + p.w - 6, wy + 8);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.75)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

    // 3. MAGMA CAVERNS GROUND (SECTOR 3)
    } else if (p.type === 'magma_ground') {
      ctx.save();
      // Charred volcanic basalt foundation
      ctx.fillStyle = '#140c08';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Glowing lava rock rim
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(p.x, p.y, p.w, 6);

      // Searing orange heat line
      ctx.fillStyle = '#f97316';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x, p.y + 6, p.w, 2.5);
      ctx.shadowBlur = 0;

      // Magma fissures running down basalt
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.6)';
      ctx.lineWidth = 2;
      for (let fx = p.x + 18; fx < p.x + p.w - 18; fx += 55) {
        ctx.beginPath();
        ctx.moveTo(fx, p.y + 9);
        ctx.lineTo(fx + 6, p.y + 24);
        ctx.lineTo(fx - 4, p.y + p.h - 10);
        ctx.stroke();
      }
      ctx.restore();

    // 4. COLOSSEUM ARENA MAIN FLOOR (SECTOR 4)
    } else if (p.type === 'arena_ground') {
      ctx.save();
      // Massive obsidian Colosseum arena foundation
      ctx.fillStyle = '#080c16';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Polished dark marble deck
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x, p.y, p.w, 7);

      // Crimson gladiatorial arena laser trim
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillRect(p.x, p.y + 7, p.w, 3);
      ctx.shadowBlur = 0;

      // Colosseum golden laurel emblems along foundation
      for (let ax = p.x + 40; ax < p.x + p.w - 40; ax += 120) {
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(ax, p.y + 16, 24, 4);
        ctx.fillStyle = '#334155';
        ctx.fillRect(ax + 8, p.y + 24, 8, p.h - 28);
      }

      // Flickering gladiatorial flame braziers along arena edges
      for (let bx = p.x + 24; bx < p.x + p.w - 16; bx += 240) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx - 7, p.y - 10, 14, 10);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx - 7, p.y - 10, 14, 10);

        const flameH = 12 + Math.sin(Date.now() / 90 + bx) * 4;
        const flameGrad = ctx.createRadialGradient(bx, p.y - 10, 1, bx, p.y - 10 - flameH * 0.6, 9);
        flameGrad.addColorStop(0, '#fef08a');
        flameGrad.addColorStop(0.4, '#f97316');
        flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(bx, p.y - 10 - flameH * 0.5, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

    // 5. ENVIRONMENTAL HAZARDS: VOID SPIKES
    } else if (p.type === 'hazard_spikes') {
      ctx.save();
      // Spike base pit
      ctx.fillStyle = '#090514';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Razor-sharp triangular void spikes
      const spikeW = 12;
      const count = Math.floor(p.w / spikeW);
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#c084fc';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;

      for (let s = 0; s < count; s++) {
        const sx = p.x + s * spikeW;
        ctx.beginPath();
        ctx.moveTo(sx, p.y + p.h);
        ctx.lineTo(sx + spikeW / 2, p.y + 2);
        ctx.lineTo(sx + spikeW, p.y + p.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

    // 6. ENVIRONMENTAL HAZARDS: BOILING LAVA PIT
    } else if (p.type === 'hazard_lava') {
      ctx.save();
      // Molten magma pool
      const lavaPulse = Math.sin(Date.now() / 140) * 3;
      const lavaGrad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      lavaGrad.addColorStop(0, '#f97316');
      lavaGrad.addColorStop(0.5, '#ef4444');
      lavaGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = lavaGrad;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 16;
      ctx.fillRect(p.x, p.y + lavaPulse, p.w, p.h - lavaPulse);
      ctx.shadowBlur = 0;

      // Surface bubbling molten crust
      ctx.fillStyle = '#fef08a';
      for (let bx = p.x + 12; bx < p.x + p.w - 12; bx += 32) {
        const bob = Math.sin(Date.now() / 110 + bx * 0.1) * 3;
        ctx.fillRect(bx, p.y + 2 + bob, 10, 3);
      }

      // Rising heat shimmer above lava
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.2)';
      ctx.lineWidth = 1;
      for (let hx = p.x + 8; hx < p.x + p.w - 8; hx += 20) {
        const wave = Math.sin(Date.now() / 150 + hx * 0.1) * 4;
        ctx.beginPath();
        ctx.moveTo(hx, p.y - 2);
        ctx.lineTo(hx + wave, p.y - 14);
        ctx.stroke();
      }
      ctx.restore();

    // 7. HIGH-TECH GROUND HIGHWAY (SECTOR 1 & 5)
    } else if (p.type === 'ground') {
      // Solid sci-fi highway foundation
      ctx.fillStyle = '#0c121e';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Top metal deck trim
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x, p.y, p.w, 6);

      // Neon Cyan Hazard Strip
      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y + 6, p.w, 2.5);
      ctx.shadowBlur = 0;

      // Vertical support pilings & neon vent slits
      for (let vx = p.x + 25; vx < p.x + p.w - 20; vx += 75) {
        ctx.fillStyle = 'rgba(0, 245, 255, 0.35)';
        ctx.fillRect(vx, p.y + 14, 30, 3);
      }
      for (let px = p.x + 10; px < p.x + p.w; px += 140) {
        ctx.fillStyle = '#070a12';
        ctx.fillRect(px, p.y + 18, 14, p.h - 18);
        ctx.fillStyle = '#334155';
        ctx.fillRect(px + 4, p.y + 22, 6, p.h - 22);
      }

      // Animated LED runway dots along highway edge
      const ledCycle = Math.floor(Date.now() / 110) % 8;
      for (let lx = p.x + 12; lx < p.x + p.w - 12; lx += 28) {
        const isLit = (Math.floor(lx / 28) % 8) === ledCycle;
        ctx.fillStyle = isLit ? '#00f5ff' : 'rgba(0, 245, 255, 0.25)';
        ctx.fillRect(lx, p.y + 2, 4, 2);
      }

    // 8. HIGH-TECH VERTICAL WALL
    } else if (p.type === 'wall') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x + 4, p.y + 8, p.w - 8, 3);
      ctx.fillRect(p.x + 4, p.y + p.h - 12, p.w - 8, 3);

      for (let wy = p.y + 35; wy < p.y + p.h - 30; wy += 45) {
        ctx.beginPath();
        ctx.moveTo(p.x + 6, wy + 8);
        ctx.lineTo(p.x + p.w / 2, wy);
        ctx.lineTo(p.x + p.w - 6, wy + 8);
        ctx.strokeStyle = 'rgba(0, 245, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

    // 9. HIGH-TECH SUSPENDED METAL CATWALK
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.fillStyle = '#00f5ff';
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, p.w, 3);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(p.x, p.y + p.h - 3, 10, 3);
      ctx.fillRect(p.x + p.w - 10, p.y + p.h - 3, 10, 3);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      for (let tx = p.x; tx < p.x + p.w - 16; tx += 28) {
        ctx.beginPath();
        ctx.moveTo(tx, p.y + p.h);
        ctx.lineTo(tx + 14, p.y + 3);
        ctx.lineTo(tx + 28, p.y + p.h);
        ctx.stroke();
      }

      // Animated LED runway dots along catwalk deck
      const ledCycle = Math.floor(Date.now() / 110) % 8;
      for (let lx = p.x + 10; lx < p.x + p.w - 10; lx += 28) {
        const isLit = (Math.floor(lx / 28) % 8) === ledCycle;
        ctx.fillStyle = isLit ? '#00f5ff' : 'rgba(0, 245, 255, 0.25)';
        ctx.fillRect(lx, p.y + 1, 4, 2);
      }
    }
  });

  // Update and render environmental lava droplets
  updateAndDrawLavaDrips();
}

// Draw Breakable Secret Ruin Walls
function drawBreakableWalls() {
  breakableWalls.forEach(wall => {
    if (!wall.isBroken) {
      ctx.save();
      if (wall.flashTimer > 0) {
        wall.flashTimer--;
        ctx.filter = 'brightness(2.5)';
      }

      // Ancient cracked stone pillar block
      ctx.fillStyle = '#292524';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);

      // Glowing Amber Rune Sigil
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(wall.x + wall.w / 2, wall.y + wall.h / 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Visible structural fissures/cracks when damaged
      if (wall.hp < wall.maxHp) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wall.x + 4, wall.y + 12);
        ctx.lineTo(wall.x + wall.w - 6, wall.y + 36);
        ctx.lineTo(wall.x + 6, wall.y + 64);
        ctx.lineTo(wall.x + wall.w - 4, wall.y + 92);
        ctx.stroke();
      }

      // Small breakable hint label
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('CRACK', wall.x - 6, wall.y - 6);
      ctx.restore();
    }
  });
}

// Draw Arena Blast Lockdown Gates (Sector 4 & 5)
function drawArenaGates() {
  const activeGates = [];
  if (isArenaLocked) activeGates.push(arenaGates.left, arenaGates.right);
  if (isCitadelLocked) activeGates.push(arenaGates.citadelLeft, arenaGates.citadelRight);

  activeGates.forEach(gate => {
    ctx.save();
    // Heavy armored security bulkhead door
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
    ctx.shadowBlur = 0;

    // Diagonal hazard caution stripes
    ctx.fillStyle = '#ef4444';
    for (let gy = gate.y + 10; gy < gate.y + gate.h - 10; gy += 24) {
      ctx.fillRect(gate.x + 2, gy, gate.w - 4, 8);
    }

    // Warning label
    ctx.save();
    ctx.translate(gate.x + gate.w / 2, gate.y + gate.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('LOCKED', -22, 3);
    ctx.restore();

    ctx.restore();
  });

  // Level 1 Bramble Barrier (Mini-Boss)
  if (levelBarriers.miniBossLeft.active) {
    [levelBarriers.miniBossLeft, levelBarriers.miniBossRight].forEach(b => {
      ctx.save();
      ctx.fillStyle = '#271c19';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#4d7c0f';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#84cc16';
      ctx.shadowBlur = 14;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.shadowBlur = 0;

      for (let vy = b.y + 10; vy < b.y + b.h - 10; vy += 20) {
        ctx.strokeStyle = '#65a30d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 2, vy);
        ctx.lineTo(b.x + b.w - 2, vy + 12);
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, vy + 6, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const bGlow = 0.5 + Math.sin(Date.now() / 250) * 0.4;
      ctx.fillStyle = `rgba(132, 204, 22, ${bGlow})`;
      ctx.fillRect(b.x + b.w / 2 - 2, b.y, 4, b.h);
      ctx.restore();
    });
  }

  // Level 1 Abyssal Thorn Spire Barriers (Main Boss)
  if (levelBarriers.bossLeft.active) {
    [levelBarriers.bossLeft, levelBarriers.bossRight].forEach(b => {
      ctx.save();
      ctx.fillStyle = '#0f051d';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 18;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      for (let ry = b.y + 15; ry < b.y + b.h - 15; ry += 28) {
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + 4, ry + 10);
        ctx.lineTo(b.x + b.w / 2, ry);
        ctx.lineTo(b.x + b.w - 4, ry + 10);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#ec4899';
      ctx.fillText('BLIGHTED', -28, 3);
      ctx.restore();

      ctx.restore();
    });
  }
}

// Draw Secret Relic Power Cores
function drawRelics() {
  relics.forEach(relic => {
    if (!relic.collected) {
      ctx.save();
      const floatBob = Math.sin(Date.now() / 180) * 5;
      const rot = Date.now() / 350;
      const coreColor = relic.type === 'hp_core' ? '#00f5ff' : '#f59e0b';

      ctx.translate(relic.x, relic.y + floatBob);

      // Rotating diamond crystal
      ctx.save();
      ctx.rotate(rot);
      ctx.fillStyle = coreColor;
      ctx.shadowColor = coreColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Floating halo aura ring
      ctx.strokeStyle = coreColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Text label
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillStyle = coreColor;
      ctx.shadowBlur = 8;
      ctx.fillText(relic.type === 'hp_core' ? 'INTI PURBA' : 'API NAGA', -28, -20);
      ctx.restore();
    }
  });
}

// Draw Ancient Holographic Lore Tablets
function drawLoreTablets() {
  loreTablets.forEach(tab => {
    ctx.save();
    // Obsidian Monolith Pedestal
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(tab.x - 14, tab.y + 12, 28, 28);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(tab.x - 14, tab.y + 12, 28, 28);

    // Glowing ancient rune engraving on pedestal
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(tab.x - 8, tab.y + 20, 16, 2);
    ctx.fillRect(tab.x - 5, tab.y + 26, 10, 2);

    // Holographic Vertical Light Cone
    const conePulse = Math.sin(Date.now() / 200) * 0.1 + 0.22;
    ctx.fillStyle = `rgba(56, 189, 248, ${conePulse})`;
    ctx.beginPath();
    ctx.moveTo(tab.x - 10, tab.y + 12);
    ctx.lineTo(tab.x - 18, tab.y - 28);
    ctx.lineTo(tab.x + 18, tab.y - 28);
    ctx.lineTo(tab.x + 10, tab.y + 12);
    ctx.closePath();
    ctx.fill();

    // Floating Holographic Crystal Core (Spinning)
    const bob = Math.sin(Date.now() / 160) * 4;
    ctx.save();
    ctx.translate(tab.x, tab.y - 12 + bob);
    ctx.rotate(Date.now() / 400);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 9);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Floating interactive label
    const isNear = (activeLoreTabletNear && activeLoreTabletNear.id === tab.id);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = isNear ? '#00f5ff' : '#94a3b8';
    ctx.shadowColor = isNear ? '#00f5ff' : 'transparent';
    ctx.shadowBlur = isNear ? 12 : 0;
    ctx.fillText(isNear ? '▶ [F] BACA LORE ◀' : 'LORE TABLET', isNear ? tab.x - 44 : tab.x - 34, tab.y - 32);

    ctx.restore();
  });
}

function drawCheckpoints() {
  checkpoints.forEach(cp => {
    ctx.save();
    // Terminal base pedestal
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cp.x - 12, cp.y + 24, 24, 18);
    ctx.strokeStyle = cp.reached ? '#00f5ff' : '#64748b';
    ctx.lineWidth = 2;
    ctx.strokeRect(cp.x - 12, cp.y + 24, 24, 18);

    // Glowing holographic beacon core (Spinning diamond)
    const floatBob = Math.sin(Date.now() / 200) * 4;
    const coreColor = cp.reached ? '#00f5ff' : '#94a3b8';

    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = cp.reached ? 18 : 6;
    ctx.beginPath();
    ctx.moveTo(cp.x, cp.y + floatBob);
    ctx.lineTo(cp.x + 9, cp.y + 12 + floatBob);
    ctx.lineTo(cp.x, cp.y + 24 + floatBob);
    ctx.lineTo(cp.x - 9, cp.y + 12 + floatBob);
    ctx.closePath();
    ctx.fill();

    // Reached activation: Radiant vertical beacon beam to the heavens
    if (cp.reached) {
      const beamPulse = Math.sin(Date.now() / 150) * 0.15 + 0.25;
      ctx.fillStyle = `rgba(0, 245, 255, ${beamPulse})`;
      ctx.fillRect(cp.x - 4, cp.y - 120, 8, 140);

      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#00f5ff';
      ctx.shadowBlur = 8;
      ctx.fillText('CP ACTIVE', cp.x - 30, cp.y - 14);
    } else {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#64748b';
      ctx.shadowBlur = 0;
      ctx.fillText('TERMINAL', cp.x - 26, cp.y - 14);
    }
    ctx.restore();
  });
}

function drawGoalPortal() {
  ctx.save();
  const px = goalPortal.x;
  const py = goalPortal.y;
  const pw = goalPortal.w;
  const ph = goalPortal.h;

  // Left & Right Portal Gate Pylons
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(px - 14, py - 10, 14, ph + 16);
  ctx.fillRect(px + pw, py - 10, 14, ph + 16);

  ctx.strokeStyle = '#00f5ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(px - 14, py - 10, 14, ph + 16);
  ctx.strokeRect(px + pw, py - 10, 14, ph + 16);

  // Portal Arch Beam on top
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(px - 16, py - 24, pw + 32, 16);
  ctx.strokeRect(px - 16, py - 24, pw + 32, 16);

  // Holographic sign
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 12;
  ctx.fillText('EXTRACTION', px - 18, py - 32);

  // Swirling Vortex Core (Cyan/Violet)
  const pulse = Math.sin(Date.now() / 180) * 5;
  const portalGrad = ctx.createRadialGradient(px + pw / 2, py + ph / 2, 6, px + pw / 2, py + ph / 2, 38 + pulse);
  portalGrad.addColorStop(0, '#ffffff');
  portalGrad.addColorStop(0.3, '#00f5ff');
  portalGrad.addColorStop(0.7, '#c084fc');
  portalGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');

  ctx.fillStyle = portalGrad;
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2 + pulse, ph / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rotating energy rings
  const rot = Date.now() / 400;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(px + pw / 2, py + ph / 2, 22, 32, rot, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawCyberWeather() {
  ctx.save();
  const camX = camera.x;

  if (camX < 2800) {
    // Sector 1: Cyber Rain streaks with neon mist motes
    cyberRain.forEach(r => {
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 2, r.y + r.len);
      ctx.stroke();

      r.y += r.speed;
      r.x -= 1.2;
      if (r.y > V_HEIGHT) {
        r.y = -10;
        r.x = Math.random() * (V_WIDTH + 80);
      }
    });

  } else if (camX < 5800) {
    // Sector 2: Luminescent emerald bio-spores & ancient golden rune dust
    cyberRain.forEach(r => {
      const wave = Math.sin(Date.now() / 320 + r.pulseOffset) * 1.8;
      const sporeAlpha = Math.sin(Date.now() / 380 + r.pulseOffset) * 0.25 + 0.65;
      ctx.fillStyle = (r.pulseOffset > 5) ? `rgba(52, 211, 153, ${sporeAlpha})` : `rgba(251, 191, 36, ${sporeAlpha})`;
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(r.x + wave, r.y, r.size, 0, Math.PI * 2);
      ctx.fill();

      r.y -= 1.1; // Float lazily upward
      r.x += wave * 0.3;
      if (r.y < -10) {
        r.y = V_HEIGHT + 10;
        r.x = Math.random() * V_WIDTH;
      }
    });

  } else if (camX < 8800) {
    // Sector 3: Searing magma embers & volcanic ash flakes rising
    cyberRain.forEach(r => {
      const emberPulse = Math.sin(Date.now() / 180 + r.pulseOffset) * 0.25 + 0.75;
      ctx.fillStyle = (r.pulseOffset > 5) ? `rgba(249, 115, 22, ${emberPulse})` : `rgba(239, 68, 68, ${emberPulse})`;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.size * 1.2, 0, Math.PI * 2);
      ctx.fill();

      r.y -= (r.speed * 0.35 + 1.2); // Rise fast
      r.x += Math.sin(Date.now() / 220 + r.pulseOffset) * 1.4;
      if (r.y < -10) {
        r.y = V_HEIGHT + 10;
        r.x = Math.random() * V_WIDTH;
      }
    });

  } else if (camX < 11800) {
    // Sector 4: Colosseum battlefield golden embers swept horizontally
    cyberRain.forEach(r => {
      ctx.strokeStyle = `rgba(251, 191, 36, ${r.alpha})`;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + 9, r.y + 1);
      ctx.stroke();

      r.x += 4.5;
      r.y += Math.sin(Date.now() / 190 + r.pulseOffset) * 0.8;
      if (r.x > V_WIDTH + 20) {
        r.x = -20;
        r.y = Math.random() * V_HEIGHT;
      }
    });

  } else {
    // Sector 5: Astral cosmic star dust & quantum cyan sparkles
    cyberRain.forEach(r => {
      const starPulse = Math.abs(Math.sin(Date.now() / 220 + r.pulseOffset));
      ctx.fillStyle = `rgba(0, 245, 255, ${starPulse * 0.9})`;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 12;
      ctx.fillRect(r.x - r.size / 2, r.y - r.size / 2, r.size, r.size);

      r.y += 0.4;
      r.x -= 0.6;
      if (r.y > V_HEIGHT + 10) {
        r.y = -10;
        r.x = Math.random() * V_WIDTH;
      }
    });
  }

  ctx.restore();
}

function drawPlayer() {
  // 1. Draw Neon Eye Trails (In world space)
  if (currentHeroId === 'ronin' && player.eyeTrail.length > 1) {
    ctx.save();
    ctx.strokeStyle = player.activeThemeColor;
    ctx.shadowColor = player.activeThemeColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.eyeTrail[0].x, player.eyeTrail[0].y);
    for (let t = 1; t < player.eyeTrail.length; t++) {
      ctx.lineTo(player.eyeTrail[t].x, player.eyeTrail[t].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();

  const drawX = player.x + player.w / 2 + player.recoilX;
  const drawY = player.y + player.h / 2;
  ctx.translate(drawX, drawY);
  ctx.scale(player.facing * player.scaleX, player.scaleY);
  ctx.rotate(player.tiltAngle);

  if (player.isInvulnerable && Math.floor(Date.now() / 60) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  // Hollow Knight style tilt: Upward aim or low crouch
  if (player.aimDirection === 'up') {
    ctx.rotate(-0.22); // Consistent upward tilt
  } else if (player.isCrouching) {
    ctx.scale(1.15, 0.75); // Compressed low ducking silhouette
    ctx.translate(0, 8);
  }

  if (currentHeroId === 'ronin') {
    drawHeroRonin();
  } else if (currentHeroId === 'fall' || currentHeroId === 'granger') {
    drawHeroGranger();
  } else if (currentHeroId === 'dregsnot' || currentHeroId === 'clint') {
    drawHeroClint();
  } else if (currentHeroId === 'strom' || currentHeroId === 'saber') {
    drawHeroSaber();
  } else if (currentHeroId === 'alpha') {
    drawHeroAlpha();
  } else if (currentHeroId === 'glems' || currentHeroId === 'gusion') {
    drawHeroGusion();
  }

  // Draw Shield Barrier Aura if active
  if (player.shieldHp > 0) {
    ctx.save();
    ctx.strokeStyle = player.activeSecondaryColor || '#00f5ff';
    ctx.shadowColor = player.activeSecondaryColor || '#00f5ff';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// CHIBI SKELETAL RIG & PROCEDURAL KINEMATICS ENGINE (HOLLOW KNIGHT STYLE)
// ============================================================================
function getHumanoidKinematics() {
  const isMoving = player.isGrounded && Math.abs(player.vx) > 0.4;
  const isAir = !player.isGrounded;
  const isCrouch = player.isCrouching;
  const isDash = player.isDashing;
  const aim = player.aimDirection;
  const tick = player.animTick;

  // Attack curve for fluid recoil and slash follow-through (0 -> 1 -> 0)
  const attackCurve = player.attackCooldown > 0 ? Math.sin((player.attackCooldown / 16) * Math.PI) : 0;

  // Gentle organic breathing & idle bobbing
  const breathe = Math.sin(Date.now() / 210) * 1.4;
  const idleSway = Math.sin(Date.now() / 360) * 0.05;

  // Energetic bouncy chibi pitter-patter trot (no sliding, quick footwork)
  const runSpeedFactor = Math.min(2.5, Math.max(0.7, Math.abs(player.vx) / 3.0));
  const runPhase = tick * 0.36 * (isMoving ? runSpeedFactor : 1);
  const runBob = isMoving ? Math.abs(Math.sin(runPhase)) * 2.6 : 0;

  // Chibi joint anchors (Compact, centered around (0,0))
  const shoulderBack = { x: -6, y: -2 + (isMoving ? -Math.cos(runPhase) * 1.0 : breathe * 0.4) };
  const shoulderFront = { x: 6, y: -1 + (isMoving ? Math.cos(runPhase) * 1.0 : breathe * 0.4) };
  const hipBack = { x: -4, y: 7 };
  const hipFront = { x: 4, y: 7 };

  // Head and torso posture angles
  let torsoAngle = isMoving ? 0.08 : (isCrouch ? 0.22 : idleSway);
  let headAngle = isCrouch ? -0.12 : (aim === 'up' ? -0.32 : (aim === 'down' ? 0.25 : 0));
  if (isDash) {
    torsoAngle = 0.35;
    headAngle = -0.15;
  }

  // Chibi Leg Kinematics (Compact stumpy legs: thigh 6px, calf 8px)
  let legBack = { thighAngle: -0.15, calfAngle: 0.25, footAngle: -0.05, x: hipBack.x, y: hipBack.y };
  let legFront = { thighAngle: 0.15, calfAngle: 0.15, footAngle: -0.05, x: hipFront.x, y: hipFront.y };

  if (isCrouch) {
    // Low cute ducking squish
    legBack = { thighAngle: -0.65, calfAngle: 1.25, footAngle: -0.5, x: hipBack.x - 1, y: hipBack.y - 2 };
    legFront = { thighAngle: 0.55, calfAngle: 1.15, footAngle: -0.4, x: hipFront.x, y: hipFront.y - 2 };
  } else if (isAir) {
    const airPhase = Math.max(-1, Math.min(1, -player.vy / 9));
    if (airPhase > 0) {
      // Ascending: cute knees tucked up
      legBack = { thighAngle: -0.35 - airPhase * 0.15, calfAngle: 0.7 + airPhase * 0.2, footAngle: -0.2, x: hipBack.x, y: hipBack.y };
      legFront = { thighAngle: 0.25 + airPhase * 0.15, calfAngle: 0.5 + airPhase * 0.2, footAngle: -0.2, x: hipFront.x, y: hipFront.y };
    } else {
      // Falling: tiny legs dangling down
      legBack = { thighAngle: -0.05, calfAngle: 0.15, footAngle: 0.15, x: hipBack.x, y: hipBack.y };
      legFront = { thighAngle: 0.15, calfAngle: 0.22, footAngle: 0.20, x: hipFront.x, y: hipFront.y };
    }
  } else if (isMoving) {
    const s = Math.sin(runPhase);
    const c = Math.cos(runPhase);
    legBack = {
      thighAngle: -s * 0.65,
      calfAngle: Math.max(0, -c) * 0.85,
      footAngle: s * 0.3,
      x: hipBack.x,
      y: hipBack.y - Math.max(0, -s) * 2.8
    };
    legFront = {
      thighAngle: s * 0.65,
      calfAngle: Math.max(0, c) * 0.85,
      footAngle: -s * 0.3,
      x: hipFront.x,
      y: hipFront.y - Math.max(0, s) * 2.8
    };
  }

  // Multi-harmonic organic cloth waving physics (Hollow Knight billowing cloak)
  const clothWave = isDash
    ? -22 - player.vx * 1.2
    : (isMoving
      ? Math.sin(tick * 0.3) * 8 - player.vx * 1.5
      : (isAir ? -player.vy * 1.6 + Math.sin(tick * 0.35) * 6 : Math.sin(Date.now() / 250) * 4));

  return {
    breathe,
    runBob,
    torsoAngle,
    headAngle,
    shoulderBack,
    shoulderFront,
    hipBack,
    hipFront,
    legBack,
    legFront,
    clothWave,
    attackCurve,
    isMoving,
    isAir,
    isCrouch,
    isDash
  };
}

// Smoothly rounded chibi limb renderer (Organic curves, no blocky rectangles)
function drawHumanoidLimb(ctx, startX, startY, angle1, len1, angle2, len2, upperW, lowerW, upperColor, lowerColor, jointColor, footOrHandColor, endFn) {
  ctx.save();
  ctx.translate(startX, startY);

  // Upper segment (Thigh or Upper arm) - smoothly rounded pill shape
  ctx.rotate(angle1);
  ctx.fillStyle = upperColor;
  ctx.beginPath();
  ctx.roundRect(-upperW / 2, 0, upperW, len1, upperW / 2);
  ctx.fill();

  // Joint (Knee or Elbow)
  ctx.translate(0, len1);
  if (jointColor) {
    ctx.fillStyle = jointColor;
    ctx.beginPath();
    ctx.arc(0, 0, upperW * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lower segment (Calf or Forearm) - smoothly rounded pill shape
  ctx.rotate(angle2);
  ctx.fillStyle = lowerColor;
  ctx.beginPath();
  ctx.roundRect(-lowerW / 2, 0, lowerW, len2, lowerW / 2);
  ctx.fill();

  // End terminal (Foot or Hand)
  ctx.translate(0, len2);
  if (endFn) {
    endFn(ctx);
  } else if (footOrHandColor) {
    ctx.fillStyle = footOrHandColor;
    ctx.beginPath();
    ctx.arc(0, 0, lowerW * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ============================================================================
// HERO 0: THE VENGEFUL RONIN (HOLLOW KNIGHT SAMURAI WANDERER)
// ============================================================================
function drawHeroRonin() {
  const k = getHumanoidKinematics();
  const isSlash = player.isSlashing || player.attackCooldown > 0;
  const isCrimsonSkin = currentSkinId === 'crimson';

  // 1. Back Layer: Flowing Sumi-e Haori / Cloak with Tattered Hem
  ctx.save();
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  // Elegant billowing cape curves
  ctx.quadraticCurveTo(-14 + k.clothWave * 0.4, 8, -21 + k.clothWave, 21);
  // Tattered serrated hem (Hollow Knight style)
  ctx.lineTo(-17 + k.clothWave * 0.8, 19);
  ctx.lineTo(-12 + k.clothWave * 0.6, 23);
  ctx.lineTo(-8 + k.clothWave * 0.4, 18);
  ctx.lineTo(-4, 18);
  ctx.quadraticCurveTo(-2, 10, -3, 2);
  ctx.closePath();
  ctx.fill();

  // Subtle inner lining hem accent (Crimson for vengeance, or charcoal ink)
  ctx.strokeStyle = isCrimsonSkin ? '#dc2626' : (player.activeSecondaryColor || '#991b1b');
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.quadraticCurveTo(-14 + k.clothWave * 0.4, 8, -21 + k.clothWave, 21);
  ctx.stroke();
  ctx.restore();

  // 2. Back Leg (Chibi Tabi)
  drawHumanoidLimb(ctx, k.legBack.x, k.legBack.y, k.legBack.thighAngle, 6, k.legBack.calfAngle, 8, 5, 4.5, '#0b0f19', '#111827', '#1f2937', null, (c) => {
    c.fillStyle = '#080c14';
    c.beginPath();
    c.roundRect(-3, 0, 8, 4, [2, 2, 2, 2]);
    c.fill();
    // Tabi toe division
    c.fillStyle = '#1e293b';
    c.fillRect(3, 0, 1, 3);
  });

  // 3. Front Leg (Chibi Tabi with Cloth Wraps)
  drawHumanoidLimb(ctx, k.legFront.x, k.legFront.y, k.legFront.thighAngle, 6, k.legFront.calfAngle, 8, 5.5, 5, '#111827', '#1e293b', null, null, (c) => {
    c.fillStyle = '#090d16';
    c.beginPath();
    c.roundRect(-3, 0, 9, 4.5, [2, 2, 2, 2]);
    c.fill();
    // Tabi division & cloth wraps
    c.fillStyle = '#334155';
    c.fillRect(-1, 0, 1.5, 2);
    c.fillRect(4, 0, 1, 3);
  });

  // 4. Back Arm with Saya (Lacquered Katana Scabbard)
  drawHumanoidLimb(ctx, k.shoulderBack.x, k.shoulderBack.y, 0.4, 5, 0.5, 6, 4.5, 4, '#0b0f19', '#111827', '#1f2937', null, (c) => {
    c.fillStyle = '#080c14';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    // Dark lacquered wood Saya (scabbard)
    c.strokeStyle = '#18181b';
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(-3, -4);
    c.lineTo(15, 19);
    c.stroke();

    // Antique Brass Kojiri (scabbard chape)
    c.strokeStyle = '#d97706';
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(12, 15);
    c.lineTo(15, 19);
    c.stroke();

    // Crimson Sageo cord wrap
    c.fillStyle = '#dc2626';
    c.fillRect(0, 0, 4, 3);
  });

  // 5. Chibi Kimono Torso & Traditional Crimson Obi Sash
  ctx.save();
  ctx.fillStyle = '#0d131f';
  ctx.beginPath();
  ctx.roundRect(-7, -2 + k.breathe * 0.3, 14, 12, [5, 5, 4, 4]);
  ctx.fill();

  // Kimono fold (lapels crossing right-over-left)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, -2 + k.breathe * 0.3);
  ctx.lineTo(6, -2 + k.breathe * 0.3);
  ctx.lineTo(3, 7 + k.breathe * 0.3);
  ctx.lineTo(-2, 7 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();

  // Traditional Crimson / Blood Obi Sash (Waistband)
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.roundRect(-6.5, 5 + k.breathe * 0.3, 13, 3.2, 1.5);
  ctx.fill();

  // Antique Gold Obi Knot Clasp
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(0, 6.5 + k.breathe * 0.3, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Hanging Obi ribbon tails (swaying naturally)
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-2, 7 + k.breathe * 0.3, 2, 4.5);
  ctx.fillRect(1, 7 + k.breathe * 0.3, 1.8, 3.5);
  ctx.restore();

  // 6. Chibi Head & Iconic Woven Bamboo Kasa (Straw Hat) with Soul Glint
  ctx.save();
  ctx.translate(0, -9 + k.breathe * 0.5);
  ctx.rotate(k.headAngle);

  // Dark Head Base (Smooth Hollow Knight Silhouette Sphere)
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // THE ICONIC CONICAL WOVEN BAMBOO STRAW HAT (KASA)
  // Rich natural woven bamboo wood tones
  ctx.fillStyle = '#3e2714';
  ctx.beginPath();
  ctx.moveTo(0, -18); // Hat apex
  ctx.quadraticCurveTo(-11, -14, -22, -4); // Left sweeping brim
  ctx.quadraticCurveTo(0, -1, 22, -4);    // Front curving lip
  ctx.quadraticCurveTo(11, -14, 0, -18);  // Right sweeping brim
  ctx.closePath();
  ctx.fill();

  // Bamboo hat upper dome warm straw highlight
  ctx.fillStyle = '#5c3d20';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.quadraticCurveTo(-7, -15, -13, -7);
  ctx.quadraticCurveTo(0, -4.5, 13, -7);
  ctx.quadraticCurveTo(7, -15, 0, -18);
  ctx.closePath();
  ctx.fill();

  // Natural golden straw weave layer
  ctx.fillStyle = '#7a512a';
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.quadraticCurveTo(-4, -14, -8, -8);
  ctx.quadraticCurveTo(0, -5.5, 8, -8);
  ctx.quadraticCurveTo(4, -14, 0, -17);
  ctx.closePath();
  ctx.fill();

  // Bamboo weave concentric ribs & straw texture lines
  ctx.strokeStyle = '#2d1c0e';
  ctx.lineWidth = 1.0;
  // Arc 1 (near top)
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.quadraticCurveTo(0, -10, 6, -12);
  ctx.stroke();
  // Arc 2 (middle)
  ctx.beginPath();
  ctx.moveTo(-13, -7);
  ctx.quadraticCurveTo(0, -4.5, 13, -7);
  ctx.stroke();
  // Radial bamboo spokes
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(-17, -4.5);
  ctx.moveTo(0, -18);
  ctx.lineTo(0, -2);
  ctx.moveTo(0, -18);
  ctx.lineTo(17, -4.5);
  ctx.stroke();

  // Dark natural bamboo brim rim with stitch accents
  ctx.strokeStyle = '#231408';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.quadraticCurveTo(0, -1, 22, -4);
  ctx.stroke();

  // Straw stitch accents along rim
  ctx.fillStyle = '#946433';
  for (let sx = -16; sx <= 16; sx += 5) {
    ctx.fillRect(sx, -3, 1.8, 1.2);
  }

  // Hat apex woven twine knot & crimson cord tie
  ctx.fillStyle = '#1c1006';
  ctx.beginPath();
  ctx.arc(0, -18, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-1.5, -17, 3, 2);

  // DEEP SHADOW UNDER BRIM + HOLLOW KNIGHT PIERCING SOUL EYE
  ctx.save();
  // Shadow veil across upper face under hat
  ctx.fillStyle = 'rgba(7, 10, 16, 0.75)';
  ctx.beginPath();
  ctx.ellipse(0, -2, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // THE PIERCING SOUL VENGEANCE EYE (Luminous White Glint with Fierce Focus)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = isCrimsonSkin ? '#ef4444' : '#f8fafc';
  ctx.shadowBlur = 10;
  // Eye oval
  ctx.beginPath();
  ctx.ellipse(3.5, -2, 4.2, 2.2, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // White-hot pupil glint
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(4.2, -2, 2.0, 1.1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // Restore head

  // 7. Front Arm & Folded Steel Tamahagane Katana
  const armAngle1 = isSlash ? (0.2 - k.attackCurve * 1.3) : 0.25;
  const armAngle2 = isSlash ? (0.6 - k.attackCurve * 1.8) : 0.6;

  drawHumanoidLimb(ctx, k.shoulderFront.x, k.shoulderFront.y, armAngle1, 5, armAngle2, 6, 5, 4.5, '#111827', '#1e293b', null, null, (c) => {
    c.fillStyle = '#080c14';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    if (isSlash) {
      c.save();
      c.rotate(-0.4 - k.attackCurve * 0.9);

      // FOLDED STEEL BLADE (TAMAHAGANE) - Razor sharp steel with hamon line
      // Dark Tempered Steel Spine
      c.strokeStyle = '#475569';
      c.lineWidth = 3.2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(31, -8);
      c.stroke();

      // Gleaming Polished Silver Cutting Edge
      c.strokeStyle = '#ffffff';
      c.shadowColor = '#ffffff';
      c.shadowBlur = 14;
      c.lineWidth = 2.0;
      c.beginPath();
      c.moveTo(1, 0.5);
      c.lineTo(32, -8);
      c.stroke();
      c.shadowBlur = 0;

      // Authentic Wavy Hamon Temper Line
      c.strokeStyle = '#cbd5e1';
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(2, 0);
      c.quadraticCurveTo(10, -3.5, 16, -3.8);
      c.quadraticCurveTo(24, -6.5, 30, -7.5);
      c.stroke();

      // Antique Brass Tsuba (Handguard)
      c.fillStyle = '#d97706';
      c.beginPath();
      c.roundRect(-2, -2, 4.5, 4.5, 1.2);
      c.fill();
      c.strokeStyle = '#78350f';
      c.lineWidth = 0.8;
      c.stroke();

      // Wrapped Tsuka (Hilt)
      c.fillStyle = '#18181b';
      c.fillRect(-6, -1, 5, 2.5);
      c.fillStyle = '#b91c1c';
      c.fillRect(-4, -1, 1.5, 2.5);

      c.restore();
    } else {
      // Resting Ready Posture (Hand resting on sheath or hilt)
      c.strokeStyle = '#cbd5e1';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(-2, 0);
      c.lineTo(13, 5);
      c.stroke();

      // Antique Brass Tsuba
      c.fillStyle = '#d97706';
      c.beginPath();
      c.roundRect(-3, -2, 4.2, 3.8, 1);
      c.fill();

      // Tsuka hilt
      c.fillStyle = '#18181b';
      c.fillRect(-7, -1, 4.5, 2.2);
    }
  });
}

// Draw Active Projectiles & The Giant Crescent Slash Arc Smear
function drawProjectiles() {
  playerProjectiles.forEach(p => p.draw(ctx));

  // DRAW THE GIANT WHITE CRESCENT SLASH SMEAR (HOLLOW KNIGHT / PENUSBMIC STYLE)
  if (player.activeSlashSmear) {
    const s = player.activeSlashSmear;
    const progress = 1 - (s.life / s.maxLife);
    const alpha = Math.max(0, s.life / s.maxLife);

    ctx.save();
    ctx.translate(s.x, s.y);
    if (s.aim === 'up') {
      ctx.rotate(-Math.PI / 2);
    } else if (s.aim === 'down') {
      ctx.rotate(Math.PI / 2);
    } else {
      ctx.scale(s.facing, 1);
    }
    ctx.globalAlpha = alpha;

    // Outer Neon Glow Arc
    ctx.shadowColor = s.edgeColor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = s.edgeColor;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius + 6, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.arc(0, 0, s.radius * 0.4, Math.PI * 0.45, -Math.PI * 0.45, true);
    ctx.closePath();
    ctx.fill();

    // Brilliant White-Hot Slash Core Smear
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.arc(0, 0, s.radius * 0.55, Math.PI * 0.38, -Math.PI * 0.38, true);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Granger Golden Mega Laser Beam
  activeLaserBeams.forEach(b => {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = b.color || '#f59e0b';
    ctx.shadowBlur = 24;
    ctx.fillRect(Math.min(b.x1, b.x2), b.y1 - 6, Math.abs(b.x2 - b.x1), 12);

    ctx.fillStyle = b.color ? (b.color + '77') : 'rgba(251, 191, 36, 0.45)';
    ctx.fillRect(Math.min(b.x1, b.x2), b.y1 - b.width / 2, Math.abs(b.x2 - b.x1), b.width);
    ctx.restore();
  });

  enemyProjectiles.forEach(p => p.draw(ctx));
}

// ============================================================================
// PROCEDURAL HUMANOID HERO SPECIFIC RIGS
// (Granger, Clint, Saber, Alpha, Gusion)
// ============================================================================

// -------------------------------------------------------------
// HERO 1: FALL / GRANGER (STARFALL KNIGHT)
// Specification:
// - Tangan Kanan: Memegang pistol menghadap KE ATAS
// - Tangan Kiri: Memegang cannon sedang menghadap KE BAWAH
// - Drone gyro-ring di punggung dengan 4 sayap kristal plasma
// - Jubah 2-warna (royal blue & crimson) berkibar dinamis
// -------------------------------------------------------------
function drawHeroGranger() {
  const k = getHumanoidKinematics();
  const isAttack = player.attackCooldown > 0;

  // 1. Back Layer: Holographic Drone Gyro-Ring & 4 Radiant Plasma Wings
  ctx.save();
  const droneBob = Math.sin(Date.now() / 190) * 2.5;
  const droneX = -15;
  const droneY = -14 + k.breathe * 0.5 + droneBob;

  // Outer Gyro-Ring
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(droneX, droneY, 10, 0, Math.PI * 2);
  ctx.stroke();

  // Gold Inner Rim
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(droneX, droneY, 7, 0, Math.PI * 2);
  ctx.stroke();

  // 3 Orbiting Gyro-Ring Satellites
  for (let s = 0; s < 3; s++) {
    const sAng = (Date.now() / 250) + (s * (Math.PI * 2 / 3));
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(droneX + Math.cos(sAng) * 8.5, droneY + Math.sin(sAng) * 8.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glowing Cyan Holographic Core
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(droneX, droneY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Holographic Plasma Wings (4 radiant feather crystals)
  const wingPulse = Math.sin(Date.now() / 140) * 3;
  ctx.fillStyle = 'rgba(0, 245, 255, 0.75)';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;

  // Upper Primary Wing
  ctx.beginPath();
  ctx.moveTo(droneX - 3, droneY - 3);
  ctx.quadraticCurveTo(droneX - 16, droneY - 20, droneX - 25, droneY - 36 + wingPulse);
  ctx.quadraticCurveTo(droneX - 12, droneY - 24, droneX + 2, droneY - 8);
  ctx.closePath();
  ctx.fill();

  // Upper Inner White Crystal Spine
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(droneX - 4, droneY - 5);
  ctx.lineTo(droneX - 19, droneY - 28 + wingPulse);
  ctx.lineTo(droneX - 3, droneY - 9);
  ctx.closePath();
  ctx.fill();

  // Lower Secondary Wing
  ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.beginPath();
  ctx.moveTo(droneX - 2, droneY + 2);
  ctx.quadraticCurveTo(droneX - 12, droneY + 10, droneX - 20, droneY + 18 - wingPulse * 0.5);
  ctx.quadraticCurveTo(droneX - 9, droneY + 8, droneX + 3, droneY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Back Arm: MEDIUM CANNON POINTING DOWNWARD
  const backArmA1 = 0.65 - k.attackCurve * 0.15;
  const backArmA2 = 0.75 - k.attackCurve * 0.10;

  drawHumanoidLimb(ctx, k.shoulderBack.x, k.shoulderBack.y, backArmA1, 5, backArmA2, 6, 4.5, 4, '#1e293b', '#334155', '#f59e0b', null, (c) => {
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(0.35 - k.attackCurve * 0.12);
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.roundRect(-3, -4, 9, 8, [2, 2, 2, 2]);
    c.fill();

    c.fillStyle = '#1e293b';
    c.fillRect(4, -3, 14, 6);

    c.fillStyle = '#f59e0b';
    c.fillRect(6, -4, 8, 1.5);
    c.fillRect(6, 2.5, 8, 1.5);

    c.fillStyle = '#00f5ff';
    c.shadowColor = '#00f5ff';
    c.shadowBlur = 10 + k.attackCurve * 10;
    c.fillRect(1, -1.5, 4, 3);

    c.fillStyle = '#334155';
    c.fillRect(18, -3.5, 2.5, 7);
    c.restore();
  });

  // 3. Back Leg (Chibi Cyber Boot)
  drawHumanoidLimb(ctx, k.legBack.x, k.legBack.y, k.legBack.thighAngle, 6, k.legBack.calfAngle, 8, 5, 4.5, '#0f172a', '#1e293b', '#f59e0b', null, (c) => {
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.roundRect(-3, 0, 8, 4.5, [2, 2, 2, 2]);
    c.fill();
    c.fillStyle = '#f59e0b';
    c.fillRect(-2, 0, 6, 1.5);
  });

  // 4. Dual-Tone Billowing Mantle (Royal Blue & Crimson)
  ctx.save();
  // Crimson Inner Lining
  ctx.fillStyle = '#991b1b';
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.quadraticCurveTo(-15 + k.clothWave * 0.4, 10, -22 + k.clothWave, 21);
  ctx.quadraticCurveTo(-11 + k.clothWave * 0.6, 22, -3, 17);
  ctx.closePath();
  ctx.fill();

  // Royal Blue Outer Shell
  ctx.fillStyle = '#1d4ed8';
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.quadraticCurveTo(-13 + k.clothWave * 0.35, 9, -19 + k.clothWave * 0.85, 20);
  ctx.quadraticCurveTo(-8, 16, -2, 14);
  ctx.closePath();
  ctx.fill();

  // Gold Starburst hem line
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.quadraticCurveTo(-13 + k.clothWave * 0.35, 9, -19 + k.clothWave * 0.85, 20);
  ctx.stroke();
  ctx.restore();

  // 5. Chibi Torso & Breastplate
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-7, -2 + k.breathe * 0.3, 14, 11, [4, 4, 3, 3]);
  ctx.fill();

  // Gold starfall insignia chevron
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(1, -1 + k.breathe * 0.3);
  ctx.lineTo(5, 3 + k.breathe * 0.3);
  ctx.lineTo(1, 6 + k.breathe * 0.3);
  ctx.lineTo(-3, 3 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();

  // Gold belt
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-3, 6 + k.breathe * 0.3, 6, 2.5);
  ctx.restore();

  // 6. Front Leg (Chibi Cyber Boot)
  drawHumanoidLimb(ctx, k.legFront.x, k.legFront.y, k.legFront.thighAngle, 6, k.legFront.calfAngle, 8, 5.5, 5, '#1e293b', '#334155', '#f59e0b', null, (c) => {
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.roundRect(-3, 0, 9, 4.5, [2, 2, 2, 2]);
    c.fill();
    c.fillStyle = '#f59e0b';
    c.fillRect(-2, 0, 7, 1.5);
    c.fillStyle = '#00f5ff';
    c.fillRect(0, 3, 4, 1.5); // Thruster light sole
  });

  // 7. Chibi Head, High Cowl & Golden Visor
  ctx.save();
  ctx.translate(0, -9 + k.breathe * 0.5);
  ctx.rotate(k.headAngle);

  // High Neck Cowl Scarf
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.roundRect(-6, -1, 12, 5, [2, 2, 2, 2]);
  ctx.fill();

  // Chibi Head Base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, -1, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // Spiky Platinum/White Cyber Hair fluttering
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(2, -7);
  ctx.lineTo(-5, -14);
  ctx.lineTo(-2, -7);
  ctx.lineTo(-9, -10);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-10, -5);
  ctx.lineTo(-3, 0);
  ctx.closePath();
  ctx.fill();

  // Golden Horn Fin Crest Crown
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(1, -9);
  ctx.lineTo(-2, -18);
  ctx.lineTo(-4, -8);
  ctx.closePath();
  ctx.fill();

  // Glowing Cyan Visor Eye Slit with Starlight Tear
  ctx.save();
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(3, -2, 4.2, 2.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(3.5, -2, 2, 1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 245, 255, 0.6)';
  ctx.fillRect(4, 0, 1.5, 3); // Starlight tear
  ctx.restore();

  ctx.restore(); // Restore head

  // 8. Front Arm: HANDGUN / PISTOL POINTING UPWARD / FORWARD
  const frontArmA1 = -0.85 + k.attackCurve * 0.45;
  const frontArmA2 = -1.15 + k.attackCurve * 0.35;

  drawHumanoidLimb(ctx, k.shoulderFront.x, k.shoulderFront.y, frontArmA1, 5, frontArmA2, 6, 5, 4.5, '#1e293b', '#334155', '#f59e0b', null, (c) => {
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(-0.2 + k.attackCurve * 0.55);

    c.fillStyle = '#0f172a';
    c.fillRect(-2.5, -11, 5, 11);

    c.fillStyle = '#f59e0b';
    c.fillRect(-1.5, -13, 4, 9);

    c.fillStyle = '#1e293b';
    c.fillRect(-1.2, -18, 3.5, 6);

    c.fillStyle = '#00f5ff';
    c.shadowColor = '#00f5ff';
    c.shadowBlur = 10;
    c.fillRect(-1, -20, 2.5, 2.5);

    if (k.attackCurve > 0.15) {
      c.save();
      c.translate(0, -22);
      c.fillStyle = '#ffffff';
      c.shadowColor = '#00f5ff';
      c.shadowBlur = 20;
      const flareSize = 8 * k.attackCurve;
      c.beginPath();
      c.moveTo(0, -flareSize);
      c.lineTo(flareSize * 0.35, -flareSize * 0.35);
      c.lineTo(flareSize, 0);
      c.lineTo(flareSize * 0.35, flareSize * 0.35);
      c.lineTo(0, flareSize);
      c.lineTo(-flareSize * 0.35, flareSize * 0.35);
      c.lineTo(-flareSize, 0);
      c.lineTo(-flareSize * 0.35, -flareSize * 0.35);
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();
  });
}

// -------------------------------------------------------------
// HERO 2: DREGSNOT / CLINT (DRAGON TAMER)
// Specification:
// - Tangan Kanan: Memegang revolver menghadap KE BAWAH
// - Tangan Kiri: Memegang shotgun DISANDARKAN KE PUNDAKNYA
// - Helm tengkorak naga dengan tanduk emas & mata amber menyala
// - Tungku api naga menyala terang di perut
// - Jubah sayap naga bergerigi hitam & api oranye
// -------------------------------------------------------------
function drawHeroClint() {
  const k = getHumanoidKinematics();
  const aim = player.aimDirection;

  // 1. Back Layer: Serrated Dragon-Wing Coat Tails with Fiery Orange Lining & Embers
  ctx.save();
  // Blazing Orange Fire Interior Lining
  ctx.fillStyle = '#ea580c';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.quadraticCurveTo(-14 + k.clothWave * 0.4, 8, -20 + k.clothWave, 21);
  ctx.lineTo(-15 + k.clothWave * 0.8, 16);
  ctx.lineTo(-24 + k.clothWave, 26); // Scalloped dragon wing point
  ctx.lineTo(-12 + k.clothWave * 0.5, 20);
  ctx.lineTo(-5, 16);
  ctx.closePath();
  ctx.fill();

  // Dark Obsidian / Crimson Outer Scales
  ctx.fillStyle = '#450a0a';
  ctx.beginPath();
  ctx.moveTo(-6, -1);
  ctx.quadraticCurveTo(-12 + k.clothWave * 0.35, 7, -18 + k.clothWave * 0.85, 20);
  ctx.lineTo(-12 + k.clothWave * 0.6, 15);
  ctx.lineTo(-20 + k.clothWave, 24);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Back Arm: HEAVY DRAGON SHOTGUN (RESTED OVER SHOULDER)
  const backArmA1 = -1.65 - k.attackCurve * 0.05;
  const backArmA2 = 1.15 + k.attackCurve * 0.04;

  drawHumanoidLimb(ctx, k.shoulderBack.x, k.shoulderBack.y, backArmA1, 5, backArmA2, 6, 4.5, 4, '#450a0a', '#7f1d1d', '#f59e0b', null, (c) => {
    c.fillStyle = '#1c1917';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(-0.35 - k.attackCurve * 0.04);
    c.fillStyle = '#78350f';
    c.fillRect(-3, -5, 5, 8);

    c.fillStyle = '#27272a';
    c.fillRect(-1.5, -24, 4.5, 22);

    c.fillStyle = '#b45309';
    c.fillRect(-2, -12, 6, 4.5);
    c.fillStyle = '#f59e0b';
    c.fillRect(-2, -18, 6, 2.5);

    // Roaring Dragon Head Muzzle
    c.fillStyle = '#450a0a';
    c.beginPath();
    c.moveTo(-3, -24);
    c.lineTo(3, -24);
    c.lineTo(4.5, -29);
    c.lineTo(-4.5, -29);
    c.closePath();
    c.fill();

    // Soft Amber Smoke Wisps
    const smokeTime = Date.now() / 220;
    for (let sm = 0; sm < 3; sm++) {
      const smProgress = (smokeTime + sm * 1.0) % 3;
      const smAlpha = Math.max(0, 1 - smProgress / 3) * 0.6;
      c.fillStyle = `rgba(249, 115, 22, ${smAlpha})`;
      c.shadowColor = '#ea580c';
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(Math.sin(smokeTime * 1.5 + sm) * 2.5, -31 - smProgress * 5, 1.8 + smProgress * 1.2, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });

  // 3. Back Leg (Chibi Scaled Greaves)
  drawHumanoidLimb(ctx, k.legBack.x, k.legBack.y, k.legBack.thighAngle, 6, k.legBack.calfAngle, 8, 5, 4.5, '#27272a', '#3f3f46', '#ea580c', null, (c) => {
    c.fillStyle = '#18181b';
    c.beginPath();
    c.roundRect(-3, 0, 8, 4.5, [2, 2, 2, 2]);
    c.fill();
    c.fillStyle = '#f59e0b';
    c.fillRect(3, 2, 2.5, 2); // Dragon claw
  });

  // 4. Chibi Torso & Molten Furnace Maw
  ctx.save();
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.roundRect(-7, -2 + k.breathe * 0.3, 14, 11, [4, 4, 3, 3]);
  ctx.fill();

  // Dark Crimson Dragon Breastplate
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(-6, -1 + k.breathe * 0.3);
  ctx.lineTo(6, -1 + k.breathe * 0.3);
  ctx.lineTo(4, 5 + k.breathe * 0.3);
  ctx.lineTo(-4, 5 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();

  // Glowing Dragon Furnace Maw
  const flameFlicker = Math.sin(Date.now() / 55) * 0.25 + 0.85;
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#ea580c';
  ctx.shadowBlur = 16 * flameFlicker;
  ctx.beginPath();
  ctx.arc(0, 3 + k.breathe * 0.3, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 3 + k.breathe * 0.3, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // 5. Front Leg (Chibi Scaled Greaves with Claws)
  drawHumanoidLimb(ctx, k.legFront.x, k.legFront.y, k.legFront.thighAngle, 6, k.legFront.calfAngle, 8, 5.5, 5, '#3f3f46', '#27272a', '#ea580c', null, (c) => {
    c.fillStyle = '#18181b';
    c.beginPath();
    c.roundRect(-3, 0, 9, 4.5, [2, 2, 2, 2]);
    c.fill();
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.moveTo(4, 2);
    c.lineTo(8, 4.5);
    c.lineTo(4, 5.5);
    c.closePath();
    c.fill();
  });

  // 6. Chibi Head & Dragon Skull Helmet with Horns
  ctx.save();
  ctx.translate(0, -9 + k.breathe * 0.5);
  ctx.rotate(k.headAngle);

  // Spiky white/gray dragon mane behind
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(-8, -10);
  ctx.lineTo(-3, -3);
  ctx.lineTo(-10, -2);
  ctx.lineTo(-2, 2);
  ctx.closePath();
  ctx.fill();

  // Dark Horned Dragon Skull Mask (Smooth sphere/oval)
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.arc(0, -1, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // Sweeping Dragon Horns (Curving back & up)
  ctx.fillStyle = '#450a0a';
  ctx.beginPath();
  ctx.moveTo(-3, -8);
  ctx.quadraticCurveTo(-11, -15, -19, -21);
  ctx.quadraticCurveTo(-12, -10, -6, -5);
  ctx.closePath();
  ctx.fill();

  // Horn Golden Trim
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(-12, -15);
  ctx.lineTo(-19, -21);
  ctx.lineTo(-14, -12);
  ctx.closePath();
  ctx.fill();

  // Snout plate & Glowing Amber Eyes
  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.roundRect(1, -5, 7, 6, [2, 3, 2, 2]);
  ctx.fill();

  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(4, -2, 3.8, 2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.ellipse(4.5, -2, 1.8, 1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Sharp White Dragon Fangs
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(3, 1);
  ctx.lineTo(5, 4);
  ctx.lineTo(7, 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 7. Front Arm: DRAGON HEAD REVOLVER BLASTER
  let baseArm1 = 0.35;
  let baseArm2 = 0.25;
  let gunAngle = -0.15;

  if (aim === 'up') {
    baseArm1 = -0.65;
    baseArm2 = -0.45;
    gunAngle = 0.15;
  } else if (aim === 'down' && k.isAir) {
    baseArm1 = 0.80;
    baseArm2 = 0.35;
    gunAngle = -0.10;
  }

  const frontArmA1 = baseArm1 - k.attackCurve * (aim === 'up' ? 0.25 : 0.70);
  const frontArmA2 = baseArm2 - k.attackCurve * (aim === 'up' ? 0.20 : 0.50);
  const gunRot = gunAngle - k.attackCurve * 0.28;

  drawHumanoidLimb(ctx, k.shoulderFront.x, k.shoulderFront.y, frontArmA1, 5, frontArmA2, 6, 5, 4.5, '#7f1d1d', '#450a0a', '#f59e0b', null, (c) => {
    c.fillStyle = '#1c1917';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(gunRot);

    c.fillStyle = '#78350f';
    c.fillRect(-2, 0, 4, 6);

    c.fillStyle = '#450a0a';
    c.fillRect(0, 3, 8, 6);
    c.fillStyle = '#f59e0b';
    c.fillRect(1, 4, 5, 4.5);

    // Upper Jaw
    c.fillStyle = '#7f1d1d';
    c.beginPath();
    c.moveTo(6, 3);
    c.lineTo(15, 4);
    c.lineTo(12, 6.5);
    c.lineTo(6, 6.5);
    c.closePath();
    c.fill();

    // Snout Spike
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.moveTo(11, 3);
    c.lineTo(13.5, 0.5);
    c.lineTo(14, 3);
    c.closePath();
    c.fill();

    // Lower Jaw
    c.fillStyle = '#450a0a';
    c.beginPath();
    c.moveTo(6, 7);
    c.lineTo(14, 8.5);
    c.lineTo(12, 10);
    c.lineTo(6, 9.5);
    c.closePath();
    c.fill();

    // Glowing Eye
    c.fillStyle = '#f59e0b';
    c.shadowColor = '#ea580c';
    c.shadowBlur = 8;
    c.fillRect(8, 4.5, 2.5, 1.8);

    // Fire Blast Stream
    if (k.attackCurve > 0.1) {
      c.save();
      c.translate(15, 6);
      const flameLen = 15 * k.attackCurve;
      c.fillStyle = '#ea580c';
      c.shadowColor = '#f97316';
      c.shadowBlur = 20;
      c.beginPath();
      c.moveTo(0, -3);
      c.lineTo(flameLen, -5);
      c.lineTo(flameLen * 1.25, 0);
      c.lineTo(flameLen, 5);
      c.lineTo(0, 3);
      c.closePath();
      c.fill();

      c.fillStyle = '#fbbf24';
      c.beginPath();
      c.moveTo(0, -1.5);
      c.lineTo(flameLen * 0.75, -2.5);
      c.lineTo(flameLen * 0.9, 0);
      c.lineTo(flameLen * 0.75, 2.5);
      c.lineTo(0, 1.5);
      c.closePath();
      c.fill();

      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(0, 0, 2.5, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.restore();
  });
}

// -------------------------------------------------------------
// HERO 3: STROM / SABER (CODENAME: STORM)
// Specification:
// - Desain sayap mecha Gundam dengan api plasma roket cyan
// - Memegang 2 PEDANG ORANYE BERCAHAYA di kedua tangannya
// - Dual-blade combat guard pose
// - Animasi smooth & lincah
// -------------------------------------------------------------
function drawHeroSaber() {
  const k = getHumanoidKinematics();
  const aim = player.aimDirection;

  // 1. Back Layer: 4 Tiered Golden Pylon Wings & Heavy Rocket Jet Booster
  ctx.save();
  const wingX = -12;
  const wingY = -10 + k.breathe * 0.5;

  // 4 Tiered Golden Crystal Wings
  for (let w = 0; w < 4; w++) {
    const pylonTipX = wingX - 12 - w * 4;
    const pylonTipY = wingY - 16 - (3 - w) * 5;
    ctx.fillStyle = w % 2 === 0 ? '#fde047' : '#eab308';
    ctx.shadowColor = '#eab308';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(wingX - w * 1.5, wingY - w * 1.5);
    ctx.lineTo(pylonTipX, pylonTipY);
    ctx.lineTo(wingX - w * 1.5 - 3, wingY - w * 1.5 + 4);
    ctx.closePath();
    ctx.fill();
  }

  // Deep Violet Wing Chassis
  ctx.fillStyle = '#3b0764';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(wingX + 2, wingY + 2);
  ctx.lineTo(wingX - 12, wingY - 12);
  ctx.lineTo(wingX - 4, wingY - 1);
  ctx.closePath();
  ctx.fill();

  // Heavy Rocket Thruster Exhaust Nozzle
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(wingX - 10, wingY + 2, 6, 8);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(wingX - 11, wingY + 3, 2, 6);

  // Roaring Rocket Exhaust Jet Plume
  const jetFlicker = Math.sin(Date.now() / 40) * 3;
  const isHighSpeed = player.isDashing || k.isAir || Math.abs(player.vx) > 2;
  const jetLength = isHighSpeed ? 30 : 16;

  ctx.fillStyle = '#ea580c';
  ctx.shadowColor = '#f97316';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(wingX - 10, wingY + 3);
  ctx.lineTo(wingX - 10 - jetLength - jetFlicker, wingY + 6);
  ctx.lineTo(wingX - 10, wingY + 9);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(wingX - 10, wingY + 4);
  ctx.lineTo(wingX - 10 - jetLength * 0.65, wingY + 6);
  ctx.lineTo(wingX - 10, wingY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. Back Arm: ORANGE LASER KATANA 1 (REVERSE GUARD)
  let backBaseA1 = 0.65;
  let backBaseA2 = 0.45;
  let backRot = 0.75;

  if (aim === 'up') {
    backBaseA1 = 0.10;
    backBaseA2 = -0.25;
    backRot = 0.35;
  } else if (aim === 'down' && k.isAir) {
    backBaseA1 = 1.05;
    backBaseA2 = 0.55;
    backRot = 1.10;
  }

  const backSwordA1 = backBaseA1 - k.attackCurve * 1.10;
  const backSwordA2 = backBaseA2 - k.attackCurve * 0.80;

  drawHumanoidLimb(ctx, k.shoulderBack.x, k.shoulderBack.y, backSwordA1, 5, backSwordA2, 6, 4.5, 4, '#3b0764', '#f8fafc', '#eab308', null, (c) => {
    c.fillStyle = '#1e1b4b';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(backRot - k.attackCurve * 1.30);

    c.fillStyle = '#0f172a';
    c.fillRect(-1.5, -3, 3, 6);
    c.fillStyle = '#00f5ff';
    c.fillRect(-2, 3, 4, 1.5);

    // Glowing Orange Blade Core
    c.strokeStyle = '#f97316';
    c.shadowColor = '#fbbf24';
    c.shadowBlur = 16 + k.attackCurve * 10;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 5);
    c.lineTo(0, 26);
    c.stroke();

    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, 6);
    c.lineTo(0, 24);
    c.stroke();
    c.restore();
  });

  // 3. Back Leg (Chibi Mecha Greave)
  drawHumanoidLimb(ctx, k.legBack.x, k.legBack.y, k.legBack.thighAngle, 6, k.legBack.calfAngle, 8, 5, 4.5, '#f8fafc', '#3b0764', '#ef4444', null, (c) => {
    c.fillStyle = '#1e1b4b';
    c.beginPath();
    c.roundRect(-3, 0, 8, 4.5, [2, 2, 2, 2]);
    c.fill();
    c.fillStyle = '#eab308';
    c.fillRect(3, 2, 2, 2);
  });

  // 4. Chibi Torso & Red Reactor Core
  ctx.save();
  ctx.fillStyle = '#2e1065';
  ctx.beginPath();
  ctx.roundRect(-7, -2 + k.breathe * 0.3, 14, 11, [4, 4, 3, 3]);
  ctx.fill();

  // White Metallic Chest Armor Plate
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-6, -1 + k.breathe * 0.3);
  ctx.lineTo(6, -1 + k.breathe * 0.3);
  ctx.lineTo(4, 5 + k.breathe * 0.3);
  ctx.lineTo(-4, 5 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();

  // Glowing Red Reactor Core
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, 2 + k.breathe * 0.3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 2 + k.breathe * 0.3, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // 5. Front Leg (Chibi Mecha Greave)
  drawHumanoidLimb(ctx, k.legFront.x, k.legFront.y, k.legFront.thighAngle, 6, k.legFront.calfAngle, 8, 5.5, 5, '#f8fafc', '#3b0764', '#eab308', null, (c) => {
    c.fillStyle = '#1e1b4b';
    c.beginPath();
    c.roundRect(-3, 0, 9, 4.5, [2, 2, 2, 2]);
    c.fill();
    c.fillStyle = '#eab308';
    c.fillRect(-4, -4, 2, 5); // Fin
  });

  // 6. Chibi Head & Gundam V-Fin Crest
  ctx.save();
  ctx.translate(0, -9 + k.breathe * 0.5);
  ctx.rotate(k.headAngle);

  // Violet & White Mecha Helmet (Smooth sphere)
  ctx.fillStyle = '#3b0764';
  ctx.beginPath();
  ctx.arc(0, -1, 10.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(7, -7);
  ctx.lineTo(5, -2);
  ctx.lineTo(-2, -2);
  ctx.closePath();
  ctx.fill();

  // Sharp Golden V-Fin Crest Antenna
  ctx.fillStyle = '#eab308';
  ctx.shadowColor = '#eab308';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(1, -9);
  ctx.lineTo(-7, -22); // Tall forward fin
  ctx.lineTo(-3, -10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-1, -8);
  ctx.lineTo(-11, -17); // Rear antenna fin
  ctx.lineTo(-5, -7);
  ctx.closePath();
  ctx.fill();

  // Menacing Red/Amber Visor Eye
  ctx.save();
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(3, -2, 4.2, 2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(3.8, -2, 2, 1, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // Restore head

  // 7. Front Arm: ORANGE LASER KATANA 2 (FORWARD GUARD)
  let frontBaseA1 = -0.30;
  let frontBaseA2 = -0.50;
  let frontRot = -0.50;

  if (aim === 'up') {
    frontBaseA1 = -0.75;
    frontBaseA2 = -0.65;
    frontRot = -0.15;
  } else if (aim === 'down' && k.isAir) {
    frontBaseA1 = 0.30;
    frontBaseA2 = 0.15;
    frontRot = -0.75;
  }

  const frontSwordA1 = frontBaseA1 - k.attackCurve * 1.00;
  const frontSwordA2 = frontBaseA2 - k.attackCurve * 0.85;

  drawHumanoidLimb(ctx, k.shoulderFront.x, k.shoulderFront.y, frontSwordA1, 5, frontSwordA2, 6, 5, 4.5, '#f8fafc', '#3b0764', '#eab308', null, (c) => {
    c.fillStyle = '#1e1b4b';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(frontRot + k.attackCurve * 0.85);

    c.fillStyle = '#0f172a';
    c.fillRect(-1.5, -3, 3, 6);
    c.fillStyle = '#00f5ff';
    c.fillRect(-2, -3, 4, 1.5);

    // Glowing Orange Laser Blade Core
    c.strokeStyle = '#f97316';
    c.shadowColor = '#fbbf24';
    c.shadowBlur = 18 + k.attackCurve * 12;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, -3);
    c.lineTo(0, -27);
    c.stroke();

    c.strokeStyle = '#ffffff';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, -4);
    c.lineTo(0, -25);
    c.stroke();

    // Electrical Lightning Arcs
    const arcTime = Date.now() / 42;
    c.strokeStyle = '#fde047';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, -5);
    c.lineTo(Math.sin(arcTime * 1.3) * 2.5, -12);
    c.lineTo(Math.cos(arcTime) * -2.5, -20);
    c.lineTo(0, -26);
    c.stroke();

    if (k.attackCurve > 0.15) {
      c.fillStyle = '#ffffff';
      c.shadowColor = '#fbbf24';
      c.shadowBlur = 16;
      c.beginPath();
      c.arc(0, -28, 3.5 * k.attackCurve, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });
}

// -------------------------------------------------------------
// HERO 4: THE VOID: ALPHA (SPECTRAL LANCER)
// Specification:
// - AURA FINAL BOSS: kabut void mist ungu-kebiruan melayang di sekelilingnya
// - MATA MENYALA UNGU KEBIRUAN (bluish-purple spectral stare)
// - Pose Final Boss memegang TOMBAK KRISTAL VOID raksasa
// - Lengan kiri dengan tameng cakar iblis
// - Jambul bulu sabit crimson raksasa melengkung tinggi
// -------------------------------------------------------------
function drawHeroAlpha() {
  const k = getHumanoidKinematics();
  const aim = player.aimDirection;

  // 1. FINAL BOSS AURA: Swirling Void Mist
  ctx.save();
  const auraWave = Math.sin(Date.now() / 90) * 3;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.40)';
  ctx.beginPath();
  ctx.arc(0, -4, 32 + auraWave, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(168, 85, 247, 0.22)';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(0, -4, 24 + auraWave * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Floating Ethereal Soul Familiar / Lantern Drone
  ctx.save();
  const droneBob = Math.sin(Date.now() / 160) * 3.5;
  const fx = -18;
  const fy = -26 + droneBob;
  ctx.strokeStyle = '#14b8a6';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(fx - 3, fy - 4, 6, 8);
  ctx.fillStyle = '#14b8a6';
  ctx.shadowColor = '#14b8a6';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Billowing Pure White Spectral Cloak (Back)
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.shadowColor = 'rgba(20, 184, 166, 0.4)';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.quadraticCurveTo(-16 + k.clothWave * 0.4, 8, -22 + k.clothWave, 21);
  ctx.lineTo(-15 + k.clothWave * 0.7, 23);
  ctx.lineTo(-25 + k.clothWave * 1.1, 28);
  ctx.lineTo(-8, 18);
  ctx.closePath();
  ctx.fill();

  // Inner Dark Void Mantle
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-13 + k.clothWave * 0.35, 7, -18 + k.clothWave * 0.8, 19);
  ctx.lineTo(-4, 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 4. Back Arm: Demonic Clawed Gauntlet
  const shieldArm1 = 0.30 - k.attackCurve * 0.12;
  const shieldArm2 = 0.55 + k.attackCurve * 0.10;

  drawHumanoidLimb(ctx, k.shoulderBack.x, k.shoulderBack.y, shieldArm1, 5, shieldArm2, 6, 4.5, 4, '#1e1b4b', '#4c0519', '#be123c', null, (c) => {
    c.fillStyle = '#0f051d';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#be123c';
    c.shadowColor = '#e11d48';
    c.shadowBlur = 6;
    for (let cl = -1; cl <= 1; cl++) {
      c.beginPath();
      c.moveTo(cl * 2, 0);
      c.lineTo(cl * 2.5 + 4, 3 + Math.abs(cl));
      c.lineTo(cl * 2, 5);
      c.closePath();
      c.fill();
    }
  });

  // 5. Back Leg (Chibi Spectral Greave)
  drawHumanoidLimb(ctx, k.legBack.x, k.legBack.y, k.legBack.thighAngle, 6, k.legBack.calfAngle, 8, 5, 4.5, '#090d16', '#1e1b4b', '#14b8a6', null, (c) => {
    c.fillStyle = '#020617';
    c.beginPath();
    c.roundRect(-3, 0, 8, 4.5, [2, 2, 2, 2]);
    c.fill();
  });

  // 6. Chibi Torso & Dark Void Cuirass
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-7, -2 + k.breathe * 0.3, 14, 11, [4, 4, 3, 3]);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.moveTo(0, -2 + k.breathe * 0.3);
  ctx.lineTo(7, -2 + k.breathe * 0.3);
  ctx.lineTo(5, 5 + k.breathe * 0.3);
  ctx.lineTo(0, 5 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();

  // Shoulder horn on back
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(-6, -3 + k.breathe * 0.3);
  ctx.lineTo(-14, -13 + k.breathe * 0.3);
  ctx.lineTo(-4, -6 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 7. Front Leg (Chibi Spectral Greave)
  drawHumanoidLimb(ctx, k.legFront.x, k.legFront.y, k.legFront.thighAngle, 6, k.legFront.calfAngle, 8, 5.5, 5, '#1e1b4b', '#090d16', '#14b8a6', null, (c) => {
    c.fillStyle = '#020617';
    c.beginPath();
    c.roundRect(-3, 0, 9, 4.5, [2, 2, 2, 2]);
    c.fill();
  });

  // 8. Chibi Spectral Helm & GIGANTIC CURVED CRIMSON PLUME
  ctx.save();
  ctx.translate(0, -9 + k.breathe * 0.5);
  ctx.rotate(k.headAngle);

  // Luminescent Cyan Spectral Hair flowing down
  ctx.fillStyle = '#14b8a6';
  ctx.shadowColor = '#14b8a6';
  ctx.shadowBlur = 10;
  const hairWave = Math.sin(Date.now() / 150) * 3;
  ctx.beginPath();
  ctx.moveTo(-2, -3);
  ctx.quadraticCurveTo(-11, -3, -19 + k.clothWave * 0.5, 3 + hairWave);
  ctx.quadraticCurveTo(-12, 1, -3, 2);
  ctx.closePath();
  ctx.fill();

  // Spectral Helm Base (Smooth sphere)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, -1, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // Gold Filigree Fillet
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(-1, -7, 5, 2);

  // Menacing Bluish-Purple Visor Eye Slit
  ctx.save();
  ctx.fillStyle = '#c084fc';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.ellipse(3, -2, 4.2, 2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.ellipse(3.8, -2, 2.2, 1.2, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(4.2, -2, 1, 0.7, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // GIGANTIC CURVED CRIMSON PLUME CREST (Iconic Alpha Chibi Feature!)
  const plumeWave = Math.sin(Date.now() / 130) * 4;
  ctx.fillStyle = '#e11d48';
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.quadraticCurveTo(-11, -24, -25, -30 + plumeWave);
  ctx.quadraticCurveTo(-14, -19, -4, -8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(-3, -11);
  ctx.quadraticCurveTo(-11, -21, -20, -25 + plumeWave);
  ctx.lineTo(-9, -15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 9. Front Arm: SPECTRAL CRYSTAL HALBERD
  let baseSpearA1 = -0.18;
  let baseSpearA2 = -0.35;
  let baseRot = -0.35;

  if (aim === 'up') {
    baseSpearA1 = -0.70;
    baseSpearA2 = -0.55;
    baseRot = 0.15;
  } else if (aim === 'down' && k.isAir) {
    baseSpearA1 = 0.60;
    baseSpearA2 = 0.30;
    baseRot = -0.75;
  }

  const frontSpearA1 = baseSpearA1 - k.attackCurve * 0.85;
  const frontSpearA2 = baseSpearA2 - k.attackCurve * 0.65;
  const spearRot = baseRot + k.attackCurve * 1.10;

  drawHumanoidLimb(ctx, k.shoulderFront.x, k.shoulderFront.y, frontSpearA1, 5, frontSpearA2, 6, 5, 4.5, '#0f172a', '#1e1b4b', '#14b8a6', null, (c) => {
    c.fillStyle = '#020617';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(spearRot);

    // Spear Shaft
    c.strokeStyle = '#475569';
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(0, 30);
    c.lineTo(0, -35);
    c.stroke();

    // Gold Fittings
    c.fillStyle = '#f59e0b';
    c.fillRect(-2.5, -32, 5, 6);

    // Ornate Dangling Soul Lantern
    c.save();
    c.translate(-10, -28);
    c.strokeStyle = '#475569';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, 6);
    c.stroke();

    c.strokeStyle = '#f59e0b';
    c.lineWidth = 1.2;
    c.strokeRect(-2, 6, 4, 6);

    c.fillStyle = '#00f5ff';
    c.shadowColor = '#00f5ff';
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(0, 9, 2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // CRYSTAL HALBERD BLADE HEAD
    c.fillStyle = '#06b6d4';
    c.shadowColor = '#14b8a6';
    c.shadowBlur = 20 + k.attackCurve * 12;
    c.beginPath();
    c.moveTo(0, -35);
    c.lineTo(11, -47);
    c.lineTo(0, -60);
    c.lineTo(-5, -47);
    c.closePath();
    c.fill();

    // Curved Demon Scythe Hook
    c.fillStyle = '#a855f7';
    c.shadowColor = '#c084fc';
    c.shadowBlur = 16;
    c.beginPath();
    c.moveTo(0, -38);
    c.lineTo(-14, -40);
    c.lineTo(-19, -30);
    c.lineTo(-6, -33);
    c.closePath();
    c.fill();

    // White Core
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -40);
    c.lineTo(3, -47);
    c.lineTo(0, -55);
    c.lineTo(-2, -47);
    c.closePath();
    c.fill();

    if (k.attackCurve > 0.15) {
      c.save();
      c.translate(0, -60);
      c.fillStyle = '#38bdf8';
      c.shadowColor = '#c084fc';
      c.shadowBlur = 20;
      c.beginPath();
      c.arc(0, 0, 5.5 * k.attackCurve, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    c.restore();
  });
}

// -------------------------------------------------------------
// HERO 5: GLEMS STARFALL / GUSION (COSMIC BLADE DANCER)
// Specification:
// - Tangan Kanan: Memegang COSMIC STAR DAGGER
// - Tangan Kiri: KOSONG dengan aura sihir starlight kosmik melingkar
// - 3 belati starlight kosmik melayang mengitari tubuhnya
// - Cowl biru kosmik dengan Star Crest 4 sudut menyala di visor
// -------------------------------------------------------------
function drawHeroGusion() {
  const k = getHumanoidKinematics();
  const aim = player.aimDirection;

  // 1. Back Layer: 4 Floating Cosmic Diamond Daggers & Billowing Starlight Scarf
  ctx.save();
  for (let d = 0; d < 4; d++) {
    const dTime = Date.now() / 280;
    const baseOffsetX = 16 + d * 4;
    const baseOffsetY = -14 + d * 7 + Math.sin(dTime + d * 0.9) * 2.5 + k.breathe * 0.5;

    // Trailing Stardust Particle Ribbon
    ctx.save();
    for (let r = 1; r <= 2; r++) {
      const tx = baseOffsetX - r * 3;
      const ty = baseOffsetY + Math.sin(dTime + d * 0.9 - r * 0.2) * 2.5;
      ctx.fillStyle = `rgba(0, 245, 255, ${0.45 - r * 0.15})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 2 - r * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(baseOffsetX, baseOffsetY);
    ctx.rotate(0.35 + Math.sin(dTime + d) * 0.1);

    // Glowing Cyan Crystal Diamond Core
    ctx.fillStyle = '#00f5ff';
    ctx.shadowColor = '#00f5ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(4.5, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-4.5, 0);
    ctx.closePath();
    ctx.fill();

    // Gold Outer Diamond Frame
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // White Starlight Center
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  ctx.restore();

  // Flowing Vibrant Cosmic Energy Scarf
  ctx.save();
  ctx.strokeStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(-3, -10 + k.breathe * 0.5);
  ctx.quadraticCurveTo(-14, -7 + k.clothWave * 0.4, -26 + k.clothWave, 3);
  ctx.quadraticCurveTo(-20, 12, -34 + k.clothWave * 1.2, 14);
  ctx.stroke();

  // Floating cyan stardust motes
  for (let sm = 0; sm < 2; sm++) {
    const smX = -24 - sm * 6 + Math.sin(Date.now() / 150 + sm) * 3;
    const smY = 2 + sm * 4 + Math.cos(Date.now() / 180 + sm) * 2;
    ctx.fillStyle = '#00f5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(smX, smY, 1.8 - sm * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Back Arm: Tangan Kosong dengan Pusaran Aura Sihir Starlight Kosmik
  const backPalm1 = 0.30 - k.attackCurve * 0.18;
  const backPalm2 = 0.65 + k.attackCurve * 0.15;

  drawHumanoidLimb(ctx, k.shoulderBack.x, k.shoulderBack.y, backPalm1, 5, backPalm2, 6, 4.5, 4, '#1e1b4b', '#1e3a8a', '#00f5ff', null, (c) => {
    c.fillStyle = '#f8fafc';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    const starlightPulse = (Math.sin(Date.now() / 90) * 2) + (k.attackCurve * 4);
    c.fillStyle = '#00f5ff';
    c.shadowColor = '#00f5ff';
    c.shadowBlur = 16 + k.attackCurve * 10;
    c.beginPath();
    c.arc(0, 0, 4 + starlightPulse, 0, Math.PI * 2);
    c.fill();

    // Orbiting Mana Orbs
    const manaRot = Date.now() / 110;
    for (let mo = 0; mo < 3; mo++) {
      const moAng = manaRot + (mo * Math.PI * 2 / 3);
      const mox = Math.cos(moAng) * (5 + starlightPulse * 0.3);
      const moy = Math.sin(moAng) * (5 + starlightPulse * 0.3);
      c.fillStyle = mo % 2 === 0 ? '#c084fc' : '#ffffff';
      c.shadowColor = '#c084fc';
      c.shadowBlur = 6;
      c.beginPath();
      c.arc(mox, moy, 1.5, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  });

  // 3. Back Leg (Chibi Ninja Bodysuit)
  drawHumanoidLimb(ctx, k.legBack.x, k.legBack.y, k.legBack.thighAngle, 6, k.legBack.calfAngle, 8, 5, 4.5, '#1e1b4b', '#0f172a', '#00f5ff', null, (c) => {
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.roundRect(-3, 0, 8, 4.5, [2, 2, 2, 2]);
    c.fill();
  });

  // 4. Chibi Torso: Royal Blue Cyber Vest & Energy Conduits
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(-7, -2 + k.breathe * 0.3, 14, 11, [4, 4, 3, 3]);
  ctx.fill();

  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(-6, -1 + k.breathe * 0.3);
  ctx.lineTo(6, -1 + k.breathe * 0.3);
  ctx.lineTo(4, 5 + k.breathe * 0.3);
  ctx.lineTo(-4, 5 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();

  // Glowing Cyan Energy Circuit Line
  ctx.strokeStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0 + k.breathe * 0.3);
  ctx.lineTo(0, 5 + k.breathe * 0.3);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Luminous Cosmic Energy Ring encircling waist
  const ringPulse = Math.sin(Date.now() / 80) * 1.2;
  ctx.strokeStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 14;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 4 + k.breathe * 0.3, 16 + ringPulse, 5 + ringPulse * 0.25, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Shoulder Pauldron on back shoulder
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(-5, -3 + k.breathe * 0.3);
  ctx.lineTo(-12, -10 + k.breathe * 0.3);
  ctx.lineTo(-4, -5 + k.breathe * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 5. Front Leg (Chibi Ninja Bodysuit)
  drawHumanoidLimb(ctx, k.legFront.x, k.legFront.y, k.legFront.thighAngle, 6, k.legFront.calfAngle, 8, 5.5, 5, '#0f172a', '#1e1b4b', '#00f5ff', null, (c) => {
    c.fillStyle = '#0f172a';
    c.beginPath();
    c.roundRect(-3, 0, 9, 4.5, [2, 2, 2, 2]);
    c.fill();
  });

  // 6. Chibi Head & Cowl Hood with 4-Pointed Star Visor
  ctx.save();
  ctx.translate(0, -9 + k.breathe * 0.5);
  ctx.rotate(k.headAngle);

  // Cowl Hood Base (Smooth sphere)
  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.arc(0, -1, 10.5, 0, Math.PI * 2);
  ctx.fill();

  // White Lower Faceplate
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(0, 0, 6, 5, [1, 2, 2, 1]);
  ctx.fill();

  // Gold Ear Crest Fins
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(1, -9);
  ctx.lineTo(-4, -16);
  ctx.lineTo(-2, -8);
  ctx.closePath();
  ctx.fill();

  // THE ICONIC GLOWING CYAN 4-POINTED STAR CREST ON VISOR
  const starX = 3;
  const starY = -5;
  ctx.save();
  ctx.fillStyle = '#00f5ff';
  ctx.shadowColor = '#00f5ff';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(starX, starY - 6); // Top point
  ctx.lineTo(starX + 1.6, starY - 1.5);
  ctx.lineTo(starX + 5.5, starY); // Right point
  ctx.lineTo(starX + 1.6, starY + 1.5);
  ctx.lineTo(starX, starY + 6); // Bottom point
  ctx.lineTo(starX - 1.6, starY + 1.5);
  ctx.lineTo(starX - 4, starY); // Left point
  ctx.lineTo(starX - 1.6, starY - 1.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(starX, starY, 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore(); // Restore head

  // 7. Front Arm: COSMIC STAR DAGGER
  let baseDaggerA1 = -0.20;
  let baseDaggerA2 = -0.45;
  let daggerRot = -0.50;

  if (aim === 'up') {
    baseDaggerA1 = -0.75;
    baseDaggerA2 = -0.60;
    daggerRot = -0.20;
  } else if (aim === 'down' && k.isAir) {
    baseDaggerA1 = 0.35;
    baseDaggerA2 = 0.20;
    daggerRot = -0.75;
  }

  const frontDaggerA1 = baseDaggerA1 - k.attackCurve * 0.90;
  const frontDaggerA2 = baseDaggerA2 - k.attackCurve * 0.70;
  const curDaggerRot = daggerRot + k.attackCurve * 0.65;

  drawHumanoidLimb(ctx, k.shoulderFront.x, k.shoulderFront.y, frontDaggerA1, 5, frontDaggerA2, 6, 5, 4.5, '#1e3a8a', '#1e1b4b', '#00f5ff', null, (c) => {
    c.fillStyle = '#f8fafc';
    c.beginPath();
    c.arc(0, 0, 3, 0, Math.PI * 2);
    c.fill();

    c.save();
    c.rotate(curDaggerRot);

    // Gold Guard
    c.fillStyle = '#fbbf24';
    c.fillRect(-1.5, -2, 3, 5);
    c.fillStyle = '#f59e0b';
    c.fillRect(-3, -3, 6, 1.5);

    // Glowing Cyan Blade
    c.fillStyle = '#00f5ff';
    c.shadowColor = '#00f5ff';
    c.shadowBlur = 14 + k.attackCurve * 12;
    c.beginPath();
    c.moveTo(0, -3);
    c.lineTo(3, -9);
    c.lineTo(0, -22); // Sharp dagger tip
    c.lineTo(-3, -9);
    c.closePath();
    c.fill();

    // White Core
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0, -4);
    c.lineTo(1.2, -9);
    c.lineTo(0, -18);
    c.lineTo(-1.2, -9);
    c.closePath();
    c.fill();

    // Blinding 4-Pointed Starburst Flare
    if (k.attackCurve > 0.15) {
      c.save();
      c.translate(0, -22);
      c.fillStyle = '#ffffff';
      c.shadowColor = '#00f5ff';
      c.shadowBlur = 18;
      const flare = 6.5 * k.attackCurve;
      c.beginPath();
      c.moveTo(0, -flare);
      c.lineTo(flare * 0.35, -flare * 0.35);
      c.lineTo(flare, 0);
      c.lineTo(flare * 0.35, flare * 0.35);
      c.lineTo(0, flare);
      c.lineTo(-flare * 0.35, flare * 0.35);
      c.lineTo(-flare, 0);
      c.lineTo(-flare * 0.35, -flare * 0.35);
      c.closePath();
      c.fill();
      c.restore();
    }

    c.restore();
  });
}

// ============================================================================
// HUD & UI CONTROLS
// ============================================================================
function updateHud() {
  const hpBar = document.getElementById('hp-bar');
  const hpText = document.getElementById('hp-text');
  if (hpBar) {
    const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
    hpBar.style.width = hpPct + '%';
    hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  }

  const energyBar = document.getElementById('energy-bar');
  const energyText = document.getElementById('energy-text');
  if (energyBar) {
    const ePct = Math.max(0, Math.min(100, (player.energy / player.maxEnergy) * 100));
    energyBar.style.width = ePct + '%';
    energyText.textContent = `${Math.ceil(player.energy)}%`;
  }

  // Update Skill Cooldown Display in HUD
  const cdOverlay = document.getElementById('hud-skill-cd-overlay');
  if (cdOverlay) {
    if (player.skillCooldown > 0) {
      cdOverlay.classList.remove('hidden');
      const secondsLeft = (player.skillCooldown / 60).toFixed(1);
      cdOverlay.textContent = `${secondsLeft}s`;
    } else {
      cdOverlay.classList.add('hidden');
    }
  }

  // Update Soul Stacks Counter (The Void: Alpha)
  const soulBox = document.getElementById('hud-soul-box');
  const soulCount = document.getElementById('hud-soul-count');
  if (soulBox && soulCount) {
    if (currentHeroId === 'alpha') {
      soulBox.classList.remove('hidden');
      soulCount.textContent = player.soulStacks;
    } else {
      soulBox.classList.add('hidden');
    }
  }

  const killsDisplay = document.getElementById('kills-display');
  if (killsDisplay) killsDisplay.textContent = kills;

  const scoreDisplay = document.getElementById('score-display');
  if (scoreDisplay) scoreDisplay.textContent = String(score).padStart(4, '0');
}

function updateHeroHudInfo() {
  const hero = HEROES[currentHeroId];
  if (!hero) return;

  const heroNameEl = document.getElementById('hud-hero-name');
  if (heroNameEl) {
    heroNameEl.textContent = hero.name;
    heroNameEl.style.color = player.activeThemeColor;
  }

  const heroRoleEl = document.getElementById('hud-hero-role');
  if (heroRoleEl) heroRoleEl.textContent = hero.role;

  const hintWeapon = document.getElementById('hint-weapon-name');
  if (hintWeapon) hintWeapon.textContent = hero.weapon.toUpperCase();

  // Update Skill Name & Icon in HUD and Controls Hint
  const hudSkillName = document.getElementById('hud-skill-name');
  if (hudSkillName) hudSkillName.textContent = hero.skillName || 'PASSIVE';

  const hintSkill = document.getElementById('hint-skill-name');
  if (hintSkill) hintSkill.textContent = hero.skillName || 'PASSIVE';

  const hudSkillIcon = document.getElementById('hud-skill-icon');
  if (hudSkillIcon) {
    const icons = {
      ronin: '🛡️',
      fall: '💥',
      dregsnot: '🔥',
      strom: '⚡',
      alpha: '👻',
      glems: '🗡️'
    };
    hudSkillIcon.textContent = icons[currentHeroId] || '⚡';
  }

  const avCanvas = document.getElementById('avatar-canvas');
  if (avCanvas) {
    const actx = avCanvas.getContext('2d');
    actx.clearRect(0, 0, 38, 38);
    const img = spriteManager.heroImages[hero.id];
    if (img && img.complete) {
      actx.drawImage(img, 0, 0, 38, 38);
    } else {
      actx.fillStyle = player.activeThemeColor;
      actx.fillRect(0, 0, 38, 38);
    }
  }
}

// ============================================================================
// LOBBY & CHARACTER SELECTION SYSTEM
// ============================================================================
function initLobbyUI() {
  updateLobbyHeroPreview();
  renderHeroRosterGrid();
  if (window.lucide) lucide.createIcons();
}

function updateLobbyHeroPreview() {
  const hero = HEROES[currentHeroId];
  if (!hero) return;

  const skinConfig = hero.skins.find(s => s.id === currentSkinId) || hero.skins[0];

  const imgEl = document.getElementById('lobby-hero-img');
  if (imgEl) imgEl.src = hero.avatar;

  const nameEl = document.getElementById('lobby-hero-name');
  if (nameEl) {
    nameEl.textContent = hero.name;
    nameEl.style.color = skinConfig.themeColor;
  }

  const roleEl = document.getElementById('lobby-hero-role');
  if (roleEl) roleEl.textContent = `${skinConfig.name} // ${hero.role}`;

  const descEl = document.getElementById('lobby-hero-desc');
  if (descEl) descEl.textContent = hero.desc;
}

function renderHeroRosterGrid() {
  const grid = document.getElementById('hero-roster-grid');
  if (!grid) return;

  grid.innerHTML = '';
  Object.values(HEROES).forEach(hero => {
    const card = document.createElement('div');
    card.className = `hero-card ${hero.id === selectedHeroInRoster ? 'selected' : ''}`;
    card.onclick = () => selectHeroInRoster(hero.id);

    card.innerHTML = `
      <div class="hero-card-img-wrap">
        <img src="${hero.avatar}" alt="${hero.name}" class="hero-card-img">
      </div>
      <div class="hero-card-body">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="hero-card-name" style="color: ${hero.themeColor};">${hero.name}</span>
          <span class="skin-badge ${hero.tierClass}" style="font-size: 8px; padding: 1px 4px;">${hero.tier.replace('SKIN ', '')}</span>
        </div>
        <span class="hero-card-role">${hero.title}</span>
        <span class="hero-role-badge ${hero.roleClass}" style="margin-top: 4px;">${hero.role}</span>
      </div>
    `;
    grid.appendChild(card);
  });

  updateInspectorPanel();
}

function selectHeroInRoster(heroId) {
  selectedHeroInRoster = heroId;
  selectedSkinInRoster = 'default';
  window.soundEngine.playMenuClick();

  document.querySelectorAll('.hero-card').forEach((card, idx) => {
    const hId = Object.keys(HEROES)[idx];
    if (hId === heroId) card.classList.add('selected');
    else card.classList.remove('selected');
  });

  updateInspectorPanel();
}

function updateInspectorPanel() {
  const hero = HEROES[selectedHeroInRoster];
  if (!hero) return;

  const skinConfig = hero.skins.find(s => s.id === selectedSkinInRoster) || hero.skins[0];

  const imgEl = document.getElementById('inspector-img');
  if (imgEl) imgEl.src = hero.avatar;

  const nameEl = document.getElementById('inspector-name');
  if (nameEl) {
    nameEl.textContent = hero.name;
    nameEl.style.color = skinConfig.themeColor;
  }

  const titleEl = document.getElementById('inspector-title');
  if (titleEl) titleEl.textContent = skinConfig.name.toUpperCase();

  const tierBadge = document.getElementById('inspector-skin-tier');
  if (tierBadge) {
    tierBadge.textContent = skinConfig.tag;
    tierBadge.className = `skin-badge ${skinConfig.tierClass}`;
  }

  const roleBadge = document.getElementById('inspector-role-badge');
  if (roleBadge) {
    roleBadge.textContent = hero.role;
    roleBadge.className = `hero-role-badge ${hero.roleClass}`;
  }

  const skinContainer = document.getElementById('skin-options-container');
  if (skinContainer) {
    skinContainer.innerHTML = '';
    hero.skins.forEach(skin => {
      const btn = document.createElement('button');
      btn.className = `skin-option-btn ${skin.id === selectedSkinInRoster ? 'active' : ''}`;
      btn.textContent = skin.name;
      btn.onclick = () => {
        selectedSkinInRoster = skin.id;
        window.soundEngine.playMenuClick();
        updateInspectorPanel();
      };
      skinContainer.appendChild(btn);
    });
  }

  const descEl = document.getElementById('inspector-desc');
  if (descEl) descEl.textContent = hero.desc;

  const wepEl = document.getElementById('inspector-weapon');
  if (wepEl) wepEl.textContent = hero.weapon;

  const dmgFill = document.getElementById('stat-damage');
  const dmgVal = document.getElementById('stat-damage-val');
  if (dmgFill) {
    dmgFill.style.width = hero.stats.damage + '%';
    dmgVal.textContent = hero.stats.damage;
  }

  const spdFill = document.getElementById('stat-speed');
  const spdVal = document.getElementById('stat-speed-val');
  if (spdFill) {
    spdFill.style.width = hero.stats.speed + '%';
    spdVal.textContent = hero.stats.speed;
  }

  const rngFill = document.getElementById('stat-range');
  const rngVal = document.getElementById('stat-range-val');
  if (rngFill) {
    rngFill.style.width = hero.stats.range + '%';
    rngVal.textContent = hero.stats.range;
  }
}

function goToCharSelect() {
  window.soundEngine.playMenuClick();
  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('char-select-screen').classList.remove('hidden');
  selectedHeroInRoster = currentHeroId;
  selectedSkinInRoster = currentSkinId;
  renderHeroRosterGrid();
}

function goToLobby() {
  window.soundEngine.playMenuClick();
  document.getElementById('char-select-screen').classList.add('hidden');
  document.getElementById('lobby-screen').classList.remove('hidden');
  updateLobbyHeroPreview();
}

function confirmHeroAndDeploy() {
  currentHeroId = selectedHeroInRoster;
  currentSkinId = selectedSkinInRoster;
  window.soundEngine.playCharSelect();
  startMission();
}

function openLevelSelectModal() {
  window.soundEngine.playMenuClick();
  const modal = document.getElementById('level-select-modal');
  if (modal) modal.classList.remove('hidden');
  selectLevel(currentLevelId || 1);
}

function closeLevelSelectModal() {
  window.soundEngine.playMenuClick();
  const modal = document.getElementById('level-select-modal');
  if (modal) modal.classList.add('hidden');
}

function selectLevel(levelId) {
  currentLevelId = levelId;
  const c1 = document.getElementById('card-lvl-1');
  const c2 = document.getElementById('card-lvl-2');
  if (c1) {
    if (levelId === 1) c1.classList.add('active');
    else c1.classList.remove('active');
  }
  if (c2) {
    if (levelId === 2) c2.classList.add('active');
    else c2.classList.remove('active');
  }
}

function deployLevel(levelId) {
  selectLevel(levelId);
  closeLevelSelectModal();
  startMission(levelId);
}

function proceedNextLevel() {
  const nextId = currentLevelId === 1 ? 2 : 1;
  const vModal = document.getElementById('victory-modal');
  if (vModal) vModal.classList.add('hidden');
  selectLevel(nextId);
  startMission(nextId);
}

function startMission(levelId) {
  if (levelId) currentLevelId = levelId;
  loadLevel(currentLevelId || 1);

  window.soundEngine.playCharSelect();

  document.getElementById('lobby-screen').classList.add('hidden');
  document.getElementById('char-select-screen').classList.add('hidden');
  document.getElementById('game-over-modal').classList.add('hidden');
  document.getElementById('victory-modal').classList.add('hidden');
  document.getElementById('pause-modal').classList.add('hidden');
  const lvlModal = document.getElementById('level-select-modal');
  if (lvlModal) lvlModal.classList.add('hidden');

  document.getElementById('hud-layer').classList.remove('hidden');
  document.getElementById('controls-hint').classList.remove('hidden');
  if (window.innerWidth <= 900) {
    document.getElementById('mobile-controls').classList.remove('hidden');
  }

  score = 0;
  kills = 0;
  enemies.length = 0;
  enemyProjectiles.length = 0;
  playerProjectiles.length = 0;
  activeLaserBeams.length = 0;

  // Reset Boss, Arena Gates, Breakable Walls, and Relics
  isArenaLocked = false;
  isBossDefeated = false;
  arenaGates.left.active = false;
  arenaGates.right.active = false;
  levelBarriers.miniBossLeft.active = false;
  levelBarriers.miniBossRight.active = false;
  levelBarriers.bossLeft.active = false;
  levelBarriers.bossRight.active = false;
  breakableWalls.forEach(w => {
    w.hp = w.maxHp;
    w.isBroken = false;
    w.flashTimer = 0;
  });
  relics.forEach(r => {
    r.collected = false;
  });

  const bossHud = document.getElementById('boss-hud-bar');
  if (bossHud) bossHud.classList.add('hidden');
  const hpFill = document.getElementById('boss-hp-fill');
  if (hpFill) hpFill.style.width = '100%';
  const hpGhost = document.getElementById('boss-hp-ghost');
  if (hpGhost) hpGhost.style.width = '100%';
  const phaseBadge = document.getElementById('boss-phase-badge');
  if (phaseBadge) {
    phaseBadge.textContent = 'FASE 1: SHIELDED';
    phaseBadge.classList.remove('enraged');
  }
  const lorePrompt = document.getElementById('lore-prompt');
  if (lorePrompt) lorePrompt.classList.add('hidden');
  const loreModal = document.getElementById('lore-modal');
  if (loreModal) loreModal.classList.add('hidden');
  const sectorBanner = document.getElementById('sector-banner');
  if (sectorBanner) sectorBanner.classList.add('hidden');
  lastAnnouncedSectorId = 0;

  // Reset Checkpoints to first checkpoint
  checkpoints.forEach((cp, idx) => {
    cp.reached = (idx === 0);
  });
  activeCheckpoint = checkpoints[0];

  // Initial Hollow Knight / Silksong World Mob Deployment
  respawnWorldEnemies();

  camera.reset();
  const lvlConfig = LEVELS[currentLevelId] || LEVELS[1];
  const pStart = lvlConfig.playerStart || { x: 120, y: 330 };
  player.reset(pStart.x, pStart.y);
  updateHeroHudInfo();

  currentState = STATES.PLAYING;
  window.soundEngine.startBGM();
}

function openPauseMenu() {
  if (currentState !== STATES.PLAYING) return;
  currentState = STATES.PAUSED;
  document.getElementById('pause-modal').classList.remove('hidden');
  window.soundEngine.playMenuClick();
}

function resumeGame() {
  document.getElementById('pause-modal').classList.add('hidden');
  currentState = STATES.PLAYING;
  window.soundEngine.playMenuClick();
}

function pauseToCharSelect() {
  document.getElementById('pause-modal').classList.add('hidden');
  document.getElementById('hud-layer').classList.add('hidden');
  document.getElementById('controls-hint').classList.add('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
  const bossHud = document.getElementById('boss-hud-bar');
  if (bossHud) bossHud.classList.add('hidden');
  const lorePrompt = document.getElementById('lore-prompt');
  if (lorePrompt) lorePrompt.classList.add('hidden');
  goToCharSelect();
}

function returnToLobby() {
  document.getElementById('pause-modal').classList.add('hidden');
  document.getElementById('game-over-modal').classList.add('hidden');
  document.getElementById('victory-modal').classList.add('hidden');
  document.getElementById('hud-layer').classList.add('hidden');
  document.getElementById('controls-hint').classList.add('hidden');
  document.getElementById('mobile-controls').classList.add('hidden');
  const bossHud = document.getElementById('boss-hud-bar');
  if (bossHud) bossHud.classList.add('hidden');
  const lorePrompt = document.getElementById('lore-prompt');
  if (lorePrompt) lorePrompt.classList.add('hidden');
  const loreModal = document.getElementById('lore-modal');
  if (loreModal) loreModal.classList.add('hidden');
  const sectorBanner = document.getElementById('sector-banner');
  if (sectorBanner) sectorBanner.classList.add('hidden');
  lastAnnouncedSectorId = 0;

  document.getElementById('lobby-screen').classList.remove('hidden');
  currentState = STATES.LOBBY;
  window.soundEngine.stopBGM();
  updateLobbyHeroPreview();
}

function restartMission() {
  startMission();
}

// Hollow Knight Checkpoint Respawn on Death
function respawnAtCheckpoint() {
  const goModal = document.getElementById('game-over-modal');
  if (goModal) goModal.classList.add('hidden');
  
  currentState = STATES.PLAYING;
  const cp = activeCheckpoint || checkpoints[0] || { x: 120, y: 350 };
  player.x = cp.x;
  player.y = cp.y;
  player.hp = player.maxHp;
  player.energy = player.maxEnergy;
  player.vx = 0;
  player.vy = 0;
  player.isInvulnerable = true;
  player.invulnTimer = 90;

  // Clear corpses and respawn regular stationed enemies (Hollow Knight style)
  respawnWorldEnemies();

  camera.x = Math.max(0, Math.min(MAP_WIDTH - V_WIDTH, player.x - V_WIDTH * 0.4));
  camera.y = Math.max(0, Math.min(MAP_HEIGHT - V_HEIGHT, player.y - V_HEIGHT * 0.54));

  floatingTexts.push(new FloatingText(player.x, player.y - 40, '★ RESPAWN: CHECKPOINT SANCTUARY ★', '#00f5ff'));
  screenShake = 8;
  window.soundEngine.startBGM();
  window.soundEngine.playPowerup();

  for (let i = 0; i < 30; i++) {
    particles.push(new Particle(player.x + player.w / 2, player.y + player.h / 2, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, '#00f5ff', 4, 35));
  }
}

function triggerGameOver() {
  currentState = STATES.GAME_OVER;
  document.getElementById('final-score').textContent = score;
  document.getElementById('final-kills').textContent = kills;
  document.getElementById('game-over-modal').classList.remove('hidden');
  window.soundEngine.stopBGM();
  window.soundEngine.playExplosion();
}

function triggerVictory() {
  if (currentState === STATES.GAME_OVER) return;
  currentState = STATES.GAME_OVER;
  score += 1500; // Extraction completion bonus points!
  window.soundEngine.stopBGM();
  window.soundEngine.playCharSelect();

  const vScore = document.getElementById('victory-score');
  if (vScore) vScore.textContent = score;
  const vKills = document.getElementById('victory-kills');
  if (vKills) vKills.textContent = kills;

  const stageTag = document.getElementById('victory-stage-tag');
  if (stageTag) stageTag.textContent = currentLevelId === 1 ? 'LEVEL 1 CLEARED' : 'LEVEL 2 CLEARED';
  const vDesc = document.getElementById('victory-desc');
  if (vDesc) {
    vDesc.textContent = currentLevelId === 1
      ? 'The Blight Chimera berhasil dimusnahkan. Ekosistem Desa Lembah Suci mulai pulih dari kutukan anomali misterius!'
      : 'Emperor Xenos tumbang! Galaxy Starfall berhasil diselamatkan dari invasi Astral Void!';
  }
  const nextBtn = document.getElementById('btn-next-level');
  if (nextBtn) {
    nextBtn.textContent = currentLevelId === 1 ? '▶ LANJUT KE LEVEL 2 (CYBER METROPOLIS)' : '↺ ULANG DARI LEVEL 1';
  }

  const victoryModal = document.getElementById('victory-modal');
  if (victoryModal) victoryModal.classList.remove('hidden');

  for (let i = 0; i < 50; i++) {
    particles.push(new Particle(
      goalPortal.x + 30,
      goalPortal.y + 40,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 8,
      Math.random() > 0.5 ? '#00f5ff' : '#fbbf24',
      4,
      45
    ));
  }
}

function openControlsGuide() {
  window.soundEngine.playMenuClick();
  document.getElementById('controls-modal').classList.remove('hidden');
}

function closeControlsGuide() {
  window.soundEngine.playMenuClick();
  document.getElementById('controls-modal').classList.add('hidden');
}

function openLoreTablet(tablet) {
  if (!tablet) return;
  currentState = STATES.PAUSED;
  const modal = document.getElementById('lore-modal');
  const title = document.getElementById('lore-modal-title');
  const sector = document.getElementById('lore-modal-sector');
  const content = document.getElementById('lore-modal-content');

  if (title) title.textContent = tablet.title;
  if (sector) sector.textContent = tablet.sector;
  if (content) content.textContent = tablet.content;
  if (modal) modal.classList.remove('hidden');

  window.soundEngine.playMenuClick();
}

function closeLoreModal() {
  const modal = document.getElementById('lore-modal');
  if (modal) modal.classList.add('hidden');
  currentState = STATES.PLAYING;
  window.soundEngine.playMenuClick();
}

// ============================================================================
// MAIN GAME LOOP (REQUEST ANIMATION FRAME)
// ============================================================================
function gameLoop() {
  // Hitstop freeze frames (Screen pause for combat impact)
  if (hitStopFrames > 0) {
    hitStopFrames--;
    requestAnimationFrame(gameLoop);
    return;
  }

  let shakeX = 0;
  let shakeY = 0;
  if (screenShake > 0) {
    shakeX = (Math.random() * 2 - 1) * screenShake;
    shakeY = (Math.random() * 2 - 1) * screenShake;
    screenShake *= 0.88;
    if (screenShake < 0.5) screenShake = 0;
  }

  // Camera smooth tracking on player
  camera.update(player);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // 1. Draw Multi-Layer Parallax Background (Screen Coordinates)
  drawParallaxBackground(camera);

  // 2. In-World Rendering translated by camera
  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  drawPlatforms();
  drawBreakableWalls();
  drawArenaGates();
  traps.forEach(t => t.draw(ctx));
  crates.forEach(c => c.draw(ctx));
  enemyCorpses.forEach(ec => ec.draw(ctx));
  for (let i = 0; i < items.length; i++) {
    if (!items[i].collected) items[i].draw(ctx);
  }
  drawRelics();
  drawLoreTablets();
  drawCheckpoints();
  drawGoalPortal();

  if (currentState === STATES.PLAYING) {
    updatePlatforms();
    updatePlayer();
    traps.forEach(t => t.update());
    enemyCorpses.forEach(ec => ec.update());
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.update();
      if (it.collected || it.life <= 0) {
        items.splice(i, 1);
      }
    }
    updateProjectiles();
    updateEnemies();
  }

  enemies.forEach(e => e.draw(ctx));
  drawProjectiles();

  for (let a = afterimages.length - 1; a >= 0; a--) {
    const ai = afterimages[a];
    ai.life--;
    ctx.save();
    const alpha = (ai.life / ai.maxLife) * 0.52;
    ctx.globalAlpha = alpha;
    ctx.translate(ai.x + ai.w / 2, ai.y + ai.h / 2);
    ctx.scale(ai.facing, 1);

    // Supersonic wind streaks trailing behind the speed ghost
    const streakDist = (ai.maxLife - ai.life) * 2.8;
    ctx.strokeStyle = ai.color;
    ctx.shadowColor = ai.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(-28 - streakDist, -18);
    ctx.moveTo(-8, 0);
    ctx.lineTo(-34 - streakDist * 1.2, 0);
    ctx.moveTo(-14, 18);
    ctx.lineTo(-28 - streakDist, 18);
    ctx.stroke();

    // Speed Phantom Silhouette
    ctx.fillStyle = ai.color;
    if (currentHeroId === 'ronin') {
      // Ronin Kasa Conical Straw Hat Silhouette
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.quadraticCurveTo(-10, -24, -20, -16);
      ctx.quadraticCurveTo(0, -13, 20, -16);
      ctx.quadraticCurveTo(10, -24, 0, -28);
      ctx.closePath();
      ctx.fill();
    } else {
      // Standard Head silhouette
      ctx.beginPath();
      ctx.arc(0, -20, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Torso silhouette
    ctx.beginPath();
    ctx.roundRect(-9, -12, 18, 22, [4, 4, 3, 3]);
    ctx.fill();

    // Trailing aerodynamic limbs
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(-20, 24);
    ctx.lineTo(-14, 26);
    ctx.lineTo(-4, 10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(4, 8);
    ctx.lineTo(-8, 28);
    ctx.lineTo(-2, 30);
    ctx.lineTo(8, 10);
    ctx.closePath();
    ctx.fill();

    // Luminous inner rim
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
    if (ai.life <= 0) afterimages.splice(a, 1);
  }

  // Render Hero Skill Entities
  groundFlames.forEach(f => f.draw(ctx));
  soulOrbs.forEach(s => s.draw(ctx));
  player.activePhantoms.forEach(ph => ph.draw(ctx));
  player.orbitingShurikens.forEach(sh => sh.draw(ctx));
  if (player.activeBoomerangDagger) player.activeBoomerangDagger.draw(ctx);

  drawPlayer();

  for (let p = particles.length - 1; p >= 0; p--) {
    const pt = particles[p];
    pt.update();
    pt.draw(ctx);
    if (pt.life <= 0) particles.splice(p, 1);
  }

  for (let t = floatingTexts.length - 1; t >= 0; t--) {
    const ft = floatingTexts[t];
    ft.update();
    ft.draw(ctx);
    if (ft.life <= 0) floatingTexts.splice(t, 1);
  }

  ctx.restore(); // Restore in-world camera translation

  // 3. Screen space weather overlay (Cyber Rain)
  drawCyberWeather();

  ctx.restore(); // Restore screen shake

  requestAnimationFrame(gameLoop);
}

// Initialize Mobile Controls and DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  loadLevel(1);
  respawnWorldEnemies();
  setupMobileControls();
  initLobbyUI();
  updateHeroHudInfo();
  requestAnimationFrame(gameLoop);
});
