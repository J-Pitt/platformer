const TEAL = 0x00e8c0;
const TEAL_DARK = 0x008870;
const TEAL_GLOW = 0x40ffd8;
const TEAL_BRIGHT = 0x80ffe8;
const SHADOW = 0x12121e;
const SHADOW_LIGHT = 0x1e1e2e;
const SHADOW_MID = 0x161622;

const BONE = 0xb8a888;
const BONE_HI = 0xd0c4a0;
const BONE_SHADOW = 0x78603c;
const BONE_DARK = 0x4a3820;
const CROWN_GOLD = 0x6a3010;
const CROWN_BRIGHT = 0x983818;
const CROWN_DARK = 0x380808;
const EYE_GREEN = 0xff2020;

const PW = 48;
const PH = 48;

export function generateAllTextures(scene) {
  generatePlayerFrames(scene);
  generatePlayerAttackFrames(scene);
  generatePlayerSlashTextures(scene);
  generateCrawlerTexture(scene);
  generateFlyerTexture(scene);
  generateBossTextures(scene);
  generateBruteTexture(scene);
  generateTileTextures(scene);
  generateBackgroundTextures(scene);
  generateParallaxTextures(scene);
  generateMountainParallaxTextures(scene);
  generateAtmosphereTextures(scene);
  generateUITextures(scene);
  generateOrbTexture(scene);
  generateRestPodTextures(scene);
  generateParticleTexture(scene);
  generateDoorTexture(scene);
  generateHazardTextures(scene);
  generateDepthLayersTextures(scene);
  generateNPCTextures(scene);
  generateCoinTextures(scene);
  generateTeleportTexture(scene);
  generateKickTextures(scene);
}

/** Royal greatsword + gold guard + pommel (hx,hy = hand / crossguard center) */
function drawBladeWithGuard(g, hx, hy, tx, ty) {
  const dx = tx - hx;
  const dy = ty - hy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  g.lineStyle(5.4, 0xb0b8c8, 0.96);
  g.lineBetween(hx, hy, tx, ty);
  g.lineStyle(2.8, 0xe0e8f0, 0.72);
  g.lineBetween(hx + px * 2, hy + py * 2, tx - px * 0.6, ty - py * 0.6);
  g.lineStyle(4.2, CROWN_GOLD, 0.95);
  const gw = 7;
  g.lineBetween(hx - px * gw, hy - py * gw, hx + px * gw, hy + py * gw);
  g.fillStyle(CROWN_BRIGHT);
  g.fillCircle(hx - ux * 5.5, hy - uy * 5.5, 3.2);
  g.fillStyle(0xe0e8ff);
  g.setAlpha(0.45);
  g.fillCircle(tx, ty, 2.6);
  g.setAlpha(1);
}

/** Greatsword resting at the king’s right side (longer reach than old royal blade) */
function drawBigSwordIdle(g, cx, sway) {
  const sx = sway * 0.3;
  const hx = cx + 12 + sx;
  const hy = 28;
  const tx = cx + 26 + sx;
  const ty = 0;
  drawBladeWithGuard(g, hx, hy, tx, ty);
}

/**
 * Attack swing (assume facing right; flipX on sprite for left).
 * frame 0 wind-up → 1 high chamber → 2 cleaving strike (arc) → 3 follow-through low
 */
function drawAttackSword(g, cx, dir, frame) {
  const clamp = (x, y) => ({ x: Phaser.Math.Clamp(x, 2, PW - 2), y: Phaser.Math.Clamp(y, 2, PH - 2) });
  let hx; let hy; let tx; let ty;
  if (dir === 'h') {
    const poses = [
      { hx: cx + 8, hy: 25, tx: cx - 6, ty: 32 },
      { hx: cx + 9, hy: 21, tx: cx - 10, ty: 7 },
      { hx: cx + 12, hy: 22, tx: cx + 42, ty: 30 },
      { hx: cx + 10, hy: 24, tx: cx + 28, ty: 38 },
    ];
    ({ hx, hy, tx, ty } = poses[frame]);
    ({ x: tx, y: ty } = clamp(tx, ty));
    ({ x: hx, y: hy } = clamp(hx, hy));
  } else if (dir === 'u') {
    const poses = [
      { hx: cx + 9, hy: 24, tx: cx + 16, ty: 34 },
      { hx: cx + 8, hy: 22, tx: cx - 8, ty: 12 },
      { hx: cx + 7, hy: 20, tx: cx + 4, ty: 0 },
      { hx: cx + 8, hy: 18, tx: cx + 20, ty: 4 },
    ];
    ({ hx, hy, tx, ty } = poses[frame]);
    ({ x: tx, y: ty } = clamp(tx, ty));
    ({ x: hx, y: hy } = clamp(hx, hy));
  } else {
    const poses = [
      { hx: cx + 10, hy: 18, tx: cx + 4, ty: 6 },
      { hx: cx + 11, hy: 19, tx: cx + 24, ty: 8 },
      { hx: cx + 12, hy: 21, tx: cx + 20, ty: 40 },
      { hx: cx + 9, hy: 22, tx: cx + 6, ty: 38 },
    ];
    ({ hx, hy, tx, ty } = poses[frame]);
    ({ x: tx, y: ty } = clamp(tx, ty));
    ({ x: hx, y: hy } = clamp(hx, hy));
  }
  drawBladeWithGuard(g, hx, hy, tx, ty);
}

/**
 * @param {object} [opts]
 * @param {{ dir: 'h'|'u'|'d', frame: number }} [opts.attack] — swing pose (right-facing base)
 * @param {boolean} [opts.armed] — draw sword (false = bare-handed skeleton)
 */
function drawPlayerBody(g, legOffsets, cloakSway, opts = {}) {
  const cx = PW / 2;
  const sway = cloakSway || 0;
  const attack = opts.attack;
  const armed = opts.armed !== false;

  // --- Ragged heavy cloak (layered, torn, dripping) ---
  g.fillStyle(0x0a0410);
  g.fillTriangle(cx - 15 + sway, 43, cx + 15 + sway, 43, cx + sway * 0.5, 16);
  g.fillStyle(0x140820);
  g.fillTriangle(cx - 12 + sway, 42, cx + 12 + sway, 42, cx + sway * 0.5, 19);
  g.fillStyle(0x1c0c2c);
  g.fillTriangle(cx - 9 + sway, 40, cx + 9 + sway, 40, cx + sway * 0.5, 22);
  // Torn edges — jagged rips at hem
  g.fillStyle(0x0a0410);
  g.fillTriangle(cx - 14 + sway, 43, cx - 11 + sway, 43, cx - 12 + sway, 46);
  g.fillTriangle(cx - 6 + sway, 43, cx - 3 + sway, 43, cx - 5 + sway, 47);
  g.fillTriangle(cx + 3 + sway, 43, cx + 7 + sway, 43, cx + 5 + sway, 46);
  g.fillTriangle(cx + 10 + sway, 43, cx + 14 + sway, 43, cx + 12 + sway, 45);
  // Inner shadow folds
  g.lineStyle(1, 0x060208, 0.7);
  g.lineBetween(cx - 10 + sway, 40, cx - 4 + sway * 0.5, 22);
  g.lineBetween(cx + 10 + sway, 40, cx + 4 + sway * 0.5, 22);
  g.lineBetween(cx + sway * 0.8, 24, cx + sway, 42);
  // Blood drip stains on cloak
  g.fillStyle(0x300808);
  g.setAlpha(0.4);
  g.fillCircle(cx - 6 + sway, 38, 1.5);
  g.fillCircle(cx + 4 + sway, 36, 1.2);
  g.fillCircle(cx - 2 + sway, 40, 1.0);
  g.setAlpha(1);

  const swordBehind = !attack || attack.frame < 2;
  if (armed) {
    if (!attack) {
      drawBigSwordIdle(g, cx, sway);
    } else if (swordBehind) {
      drawAttackSword(g, cx, attack.dir, attack.frame);
    }
  } else {
    // Skeletal arms when unarmed — longer, thinner, clawed
    const armSway = sway * 0.3;
    g.lineStyle(2, BONE_DARK);
    g.lineBetween(cx - 9, 17, cx - 15 + armSway, 29);
    g.lineStyle(1.5, BONE_SHADOW);
    g.lineBetween(cx - 15 + armSway, 29, cx - 13 + armSway, 36);
    // Claw fingers
    g.lineStyle(1, BONE_DARK, 0.8);
    g.lineBetween(cx - 13 + armSway, 36, cx - 15 + armSway, 39);
    g.lineBetween(cx - 13 + armSway, 36, cx - 12 + armSway, 39);
    g.lineBetween(cx - 13 + armSway, 36, cx - 10 + armSway, 38);
    g.lineStyle(2, BONE_DARK);
    g.lineBetween(cx + 9, 17, cx + 15 + armSway, 29);
    g.lineStyle(1.5, BONE_SHADOW);
    g.lineBetween(cx + 15 + armSway, 29, cx + 13 + armSway, 36);
    g.lineStyle(1, BONE_DARK, 0.8);
    g.lineBetween(cx + 13 + armSway, 36, cx + 15 + armSway, 39);
    g.lineBetween(cx + 13 + armSway, 36, cx + 12 + armSway, 39);
    g.lineBetween(cx + 13 + armSway, 36, cx + 10 + armSway, 38);
  }

  // --- Bone legs (thinner, darker, with claw-like feet) ---
  for (const leg of legOffsets) {
    const hipX = cx + leg.hipOff;
    const kneeX = hipX + leg.kneeOff;
    const footX = kneeX + leg.footOff;
    g.lineStyle(2.5, BONE_DARK);
    g.lineBetween(hipX, 30, kneeX, 36);
    g.lineStyle(2, BONE_SHADOW);
    g.lineBetween(kneeX, 36, footX, 42);
    g.fillStyle(BONE_DARK);
    g.fillCircle(kneeX, 36, 1.8);
    g.fillStyle(0x2a1c10);
    g.fillRect(footX - 3, 41, 7, 3);
    // Claw toes
    g.lineStyle(1, BONE_DARK, 0.7);
    g.lineBetween(footX - 3, 44, footX - 4, 46);
    g.lineBetween(footX + 3, 44, footX + 4, 46);
  }

  // --- Ribcage torso (exposed, cracked, with inner glow) ---
  g.fillStyle(0x1a1008);
  g.fillRoundedRect(cx - 9, 15, 18, 16, 3);
  g.fillStyle(BONE_DARK);
  g.fillRoundedRect(cx - 8, 16, 16, 14, 2);
  // Inner cavity glow (red, sinister)
  g.fillStyle(EYE_GREEN);
  g.setAlpha(0.08);
  g.fillCircle(cx, 23, 5);
  g.setAlpha(1);
  // Ribs
  g.lineStyle(1.5, BONE_SHADOW, 0.85);
  for (let i = 0; i < 4; i++) {
    const ry = 18 + i * 3;
    g.lineBetween(cx - 6, ry, cx - 2, ry + 1);
    g.lineBetween(cx + 2, ry + 1, cx + 6, ry);
  }
  // Cracked sternum
  g.lineStyle(1.5, BONE_DARK, 0.6);
  g.lineBetween(cx, 16, cx - 1, 22);
  g.lineBetween(cx - 1, 22, cx + 1, 26);
  g.lineBetween(cx + 1, 26, cx, 30);
  // Pelvis line
  g.lineStyle(2, BONE_DARK, 0.7);
  g.lineBetween(cx - 6, 29, cx + 6, 29);

  // --- Shoulder joints (spiked) ---
  g.fillStyle(BONE_SHADOW);
  g.fillCircle(cx - 9, 16, 3.5);
  g.fillCircle(cx + 9, 16, 3.5);
  g.fillStyle(BONE_DARK);
  g.fillCircle(cx - 9, 16, 2);
  g.fillCircle(cx + 9, 16, 2);
  // Bone spurs on shoulders
  g.fillStyle(BONE_SHADOW);
  g.fillTriangle(cx - 12, 16, cx - 9, 12, cx - 6, 16);
  g.fillTriangle(cx + 6, 16, cx + 9, 12, cx + 12, 16);

  // --- Skull (cracked, scarred, terrifying) ---
  // Base skull shape, slightly narrower jaw
  g.fillStyle(BONE_SHADOW);
  g.fillCircle(cx, 9, 9);
  g.fillStyle(BONE);
  g.fillCircle(cx, 9, 8);
  // Darker lower skull for sunken cheeks
  g.fillStyle(BONE_DARK);
  g.setAlpha(0.35);
  g.fillCircle(cx - 5, 11, 3);
  g.fillCircle(cx + 5, 11, 3);
  g.setAlpha(1);

  // Jaw / teeth — grinning maw
  g.fillStyle(BONE);
  g.fillRoundedRect(cx - 5, 13, 10, 5, 2);
  g.fillStyle(BONE_HI);
  g.fillRect(cx - 4, 13, 8, 2);
  // Individual teeth (sharper, more visible)
  g.lineStyle(1, 0x1a1008, 0.8);
  for (let i = -3; i <= 3; i++) {
    g.lineBetween(cx + i * 1.3, 13, cx + i * 1.3, 17);
  }
  // Lower teeth
  g.lineStyle(1, 0x1a1008, 0.5);
  for (let i = -2; i <= 2; i++) {
    g.lineBetween(cx + i * 1.5, 16, cx + i * 1.5, 18);
  }

  // Nose cavity (dark, menacing)
  g.fillStyle(0x000000);
  g.setAlpha(0.6);
  g.fillTriangle(cx - 1.5, 10, cx + 1.5, 10, cx, 12.5);
  g.setAlpha(1);

  // Skull cracks
  g.lineStyle(1, BONE_DARK, 0.6);
  g.lineBetween(cx + 2, 2, cx + 4, 7);
  g.lineBetween(cx + 4, 7, cx + 7, 9);
  g.lineBetween(cx + 4, 7, cx + 3, 10);
  g.lineStyle(1, BONE_DARK, 0.4);
  g.lineBetween(cx - 3, 4, cx - 5, 8);
  g.lineBetween(cx - 5, 8, cx - 7, 10);

  // --- Eye sockets (deep, red hellfire glow) ---
  // Deep black sockets
  g.fillStyle(0x000000);
  g.fillCircle(cx - 4, 8, 3.2);
  g.fillCircle(cx + 4, 8, 3.2);
  // Inner dark ring
  g.fillStyle(0x100000);
  g.fillCircle(cx - 4, 8, 2.5);
  g.fillCircle(cx + 4, 8, 2.5);
  // Red eye glow — hot center
  g.fillStyle(0xff4020);
  g.fillCircle(cx - 4, 8, 1.6);
  g.fillCircle(cx + 4, 8, 1.6);
  g.fillStyle(0xff8040);
  g.fillCircle(cx - 4, 7.8, 0.8);
  g.fillCircle(cx + 4, 7.8, 0.8);
  // Specular
  g.fillStyle(0xffcc80);
  g.fillCircle(cx - 4.3, 7.3, 0.4);
  g.fillCircle(cx + 3.7, 7.3, 0.4);
  // Wide hellfire glow bleeding out of sockets
  g.fillStyle(EYE_GREEN);
  g.setAlpha(0.12);
  g.fillCircle(cx - 4, 8, 6);
  g.fillCircle(cx + 4, 8, 6);
  g.setAlpha(0.06);
  g.fillCircle(cx, 8, 10);
  g.setAlpha(1);

  // --- Crown (blackened iron, broken prongs, blood-crusted) ---
  // Base band — dark corroded iron
  g.fillStyle(CROWN_GOLD);
  g.fillRect(cx - 9, 1, 18, 5);
  g.fillStyle(CROWN_DARK);
  g.setAlpha(0.5);
  g.fillRect(cx - 9, 4, 18, 2);
  g.setAlpha(1);
  // Broken/jagged prongs (asymmetric — damaged)
  g.fillStyle(CROWN_GOLD);
  g.fillTriangle(cx - 9, 2, cx - 7, -5, cx - 5, 2);
  g.fillTriangle(cx - 2, 2, cx, -7, cx + 2, 2);
  g.fillTriangle(cx + 5, 2, cx + 7, -4, cx + 9, 2);
  // One prong is broken off
  g.fillStyle(CROWN_BRIGHT);
  g.fillTriangle(cx - 2, 2, cx, -7, cx + 1, 2);
  // Broken prong stub on the right
  g.fillStyle(CROWN_DARK);
  g.fillRect(cx + 6, 0, 3, 3);
  // Blood-crusted edges
  g.fillStyle(0x400808);
  g.setAlpha(0.45);
  g.fillRect(cx - 8, 4, 16, 2);
  g.setAlpha(1);
  // Crown jewels (dark red, like coagulated blood)
  g.fillStyle(0x880808);
  g.fillCircle(cx - 7, -3, 1.2);
  g.fillCircle(cx, -5, 1.5);
  // Empty socket where a jewel was ripped out
  g.fillStyle(0x000000);
  g.fillCircle(cx + 7, -2, 1.0);
  // Edge shadow
  g.lineStyle(1, 0x200404, 0.6);
  g.lineBetween(cx - 9, 5, cx + 9, 5);

  if (armed && attack && !swordBehind) {
    drawAttackSword(g, cx, attack.dir, attack.frame);
  }
}

function generatePlayerFrames(scene) {
  const idleLegs = [
    { hipOff: -4, kneeOff: 0, footOff: -1 },
    { hipOff: 4, kneeOff: 0, footOff: 1 },
  ];
  const runLegs = [
    [{ hipOff: -4, kneeOff: -5, footOff: -3 }, { hipOff: 4, kneeOff: 5, footOff: 3 }],
    [{ hipOff: -4, kneeOff: -3, footOff: -1 }, { hipOff: 4, kneeOff: 3, footOff: 2 }],
    [{ hipOff: -4, kneeOff: 1, footOff: 0 }, { hipOff: 4, kneeOff: -1, footOff: 0 }],
    [{ hipOff: -4, kneeOff: 5, footOff: 3 }, { hipOff: 4, kneeOff: -5, footOff: -3 }],
    [{ hipOff: -4, kneeOff: 3, footOff: 2 }, { hipOff: 4, kneeOff: -3, footOff: -1 }],
    [{ hipOff: -4, kneeOff: -1, footOff: 0 }, { hipOff: 4, kneeOff: 1, footOff: 0 }],
  ];
  const jumpLegs = [
    { hipOff: -4, kneeOff: -3, footOff: 2 },
    { hipOff: 4, kneeOff: 3, footOff: -2 },
  ];
  const fallLegs = [
    { hipOff: -4, kneeOff: 1, footOff: 2 },
    { hipOff: 4, kneeOff: -1, footOff: -1 },
  ];
  const wallLegs = [
    { hipOff: -3, kneeOff: 2, footOff: 3 },
    { hipOff: 3, kneeOff: 2, footOff: 3 },
  ];

  // Generate both unarmed (default) and armed variants
  const variants = [
    { suffix: '', armed: false },
    { suffix: '_armed', armed: true },
  ];

  for (const { suffix, armed } of variants) {
    const armOpt = { armed };

    // Idle
    const gi = scene.make.graphics({ add: false });
    drawPlayerBody(gi, idleLegs, 0, armOpt);
    gi.generateTexture(`player_idle${suffix}`, PW, PH);
    gi.destroy();

    // Run frames (6-frame cycle)
    for (let i = 0; i < 6; i++) {
      const g = scene.make.graphics({ add: false });
      drawPlayerBody(g, runLegs[i], Math.sin(i * Math.PI / 3) * 2, armOpt);
      g.generateTexture(`player_run${suffix}_${i}`, PW, PH);
      g.destroy();
    }

    // Jump
    const gj = scene.make.graphics({ add: false });
    drawPlayerBody(gj, jumpLegs, -2, armOpt);
    gj.generateTexture(`player_jump${suffix}`, PW, PH);
    gj.destroy();

    // Fall
    const gf = scene.make.graphics({ add: false });
    drawPlayerBody(gf, fallLegs, 3, armOpt);
    gf.generateTexture(`player_fall${suffix}`, PW, PH);
    gf.destroy();

    // Wall slide
    const gw = scene.make.graphics({ add: false });
    drawPlayerBody(gw, wallLegs, 4, armOpt);
    gw.generateTexture(`player_wallslide${suffix}`, PW, PH);
    gw.destroy();

    // Default "player" alias
    const ga = scene.make.graphics({ add: false });
    drawPlayerBody(ga, idleLegs, 0, armOpt);
    ga.generateTexture(suffix ? `player${suffix}` : 'player', PW, PH);
    ga.destroy();
  }

  // Dash afterimage (shared — no sword detail needed at this size)
  const gd = scene.make.graphics({ add: false });
  gd.fillStyle(BONE_DARK);
  gd.setAlpha(0.3);
  gd.fillRoundedRect(PW / 2 - 9, 14, 18, 18, 3);
  gd.fillTriangle(PW / 2 - 12, 38, PW / 2 + 12, 38, PW / 2, 20);
  gd.fillCircle(PW / 2, 9, 9);
  gd.fillStyle(EYE_GREEN);
  gd.setAlpha(0.3);
  gd.fillCircle(PW / 2 - 4, 8, 1.7);
  gd.fillCircle(PW / 2 + 4, 8, 1.7);
  gd.lineStyle(2, CROWN_GOLD, 0.3);
  gd.lineBetween(PW / 2 - 7, 2, PW / 2 + 7, 2);
  gd.generateTexture('player_afterimage', PW, PH);
  gd.destroy();
}

const IDLE_LEGS = [
  { hipOff: -4, kneeOff: 0, footOff: -1 },
  { hipOff: 4, kneeOff: 0, footOff: 1 },
];

function generatePlayerAttackFrames(scene) {
  const dirs = [
    { key: 'h', dir: 'h' },
    { key: 'u', dir: 'u' },
    { key: 'd', dir: 'd' },
  ];
  for (const { key, dir } of dirs) {
    for (let f = 0; f < 4; f++) {
      const g = scene.make.graphics({ add: false });
      drawPlayerBody(g, IDLE_LEGS, 0, { attack: { dir, frame: f } });
      g.generateTexture(`player_attack_${key}_${f}`, PW, PH);
      g.destroy();
    }
  }
}

function generatePlayerSlashTextures(scene) {
  const blade = 0xe8f4ff;
  const bladeEdge = 0x9ecfff;
  const glow = TEAL_GLOW;

  const arcStroke = (g, cx, cy, r, start, end, acw, thick, color, a) => {
    g.lineStyle(thick, color, a);
    g.beginPath();
    g.arc(cx, cy, r, start, end, acw);
    g.strokePath();
  };

  /** Curved greatsword trails: wind-up → chamber → wide swing → dissipating arc */
  const frames = {
    right: [
      (g) => {
        arcStroke(g, 18, 28, 14, Math.PI * 0.55, Math.PI * 0.95, false, 4, blade, 0.55);
        arcStroke(g, 18, 28, 14, Math.PI * 0.55, Math.PI * 0.95, false, 2, glow, 0.35);
        arcStroke(g, 18, 28, 16, Math.PI * 0.58, Math.PI * 0.92, false, 1.5, 0xffffff, 0.25);
      },
      (g) => {
        arcStroke(g, 10, 20, 18, Math.PI * 1.05, Math.PI * 1.55, false, 5, blade, 0.72);
        arcStroke(g, 10, 20, 18, Math.PI * 1.05, Math.PI * 1.55, false, 2.5, bladeEdge, 0.5);
        arcStroke(g, 10, 20, 20, Math.PI * 1.02, Math.PI * 1.52, false, 2, glow, 0.45);
      },
      (g) => {
        arcStroke(g, 6, 26, 30, Math.PI * 0.48, -0.12, true, 7, blade, 0.95);
        arcStroke(g, 6, 26, 30, Math.PI * 0.48, -0.12, true, 4, bladeEdge, 0.78);
        arcStroke(g, 6, 26, 32, Math.PI * 0.45, -0.1, true, 3.5, glow, 0.55);
        arcStroke(g, 6, 26, 28, Math.PI * 0.5, -0.08, true, 1.8, 0xffffff, 0.5);
        g.fillStyle(TEAL_BRIGHT, 0.45);
        g.fillCircle(38, 26, 2.5);
        g.fillCircle(34, 30, 2);
      },
      (g) => {
        arcStroke(g, 4, 30, 26, Math.PI * 0.35, Math.PI * 0.02, true, 4, blade, 0.42);
        arcStroke(g, 4, 30, 28, Math.PI * 0.33, 0.04, true, 2.5, glow, 0.32);
        g.fillStyle(TEAL_BRIGHT, 0.28);
        g.fillCircle(30, 34, 2);
      },
    ],
    left: [
      (g) => {
        arcStroke(g, 30, 28, 14, Math.PI * 0.05, Math.PI * 0.45, false, 4, blade, 0.55);
        arcStroke(g, 30, 28, 14, Math.PI * 0.05, Math.PI * 0.45, false, 2, glow, 0.35);
        arcStroke(g, 30, 28, 16, Math.PI * 0.08, Math.PI * 0.42, false, 1.5, 0xffffff, 0.25);
      },
      (g) => {
        arcStroke(g, 38, 20, 18, Math.PI * -0.05, Math.PI * 0.45, true, 5, blade, 0.72);
        arcStroke(g, 38, 20, 18, Math.PI * -0.05, Math.PI * 0.45, true, 2.5, bladeEdge, 0.5);
        arcStroke(g, 38, 20, 20, Math.PI * -0.02, Math.PI * 0.48, true, 2, glow, 0.45);
      },
      (g) => {
        arcStroke(g, 42, 26, 30, Math.PI * 0.52, Math.PI * -0.02, false, 7, blade, 0.95);
        arcStroke(g, 42, 26, 30, Math.PI * 0.52, Math.PI * -0.02, false, 4, bladeEdge, 0.78);
        arcStroke(g, 42, 26, 32, Math.PI * 0.55, 0, false, 3.5, glow, 0.55);
        arcStroke(g, 42, 26, 28, Math.PI * 0.5, -0.02, false, 1.8, 0xffffff, 0.5);
        g.fillStyle(TEAL_BRIGHT, 0.45);
        g.fillCircle(10, 26, 2.5);
        g.fillCircle(14, 30, 2);
      },
      (g) => {
        arcStroke(g, 44, 30, 26, Math.PI * 0.65, Math.PI * 0.98, false, 4, blade, 0.42);
        arcStroke(g, 44, 30, 28, Math.PI * 0.67, Math.PI, false, 2.5, glow, 0.32);
        g.fillStyle(TEAL_BRIGHT, 0.28);
        g.fillCircle(18, 34, 2);
      },
    ],
    up: [
      (g) => {
        arcStroke(g, 28, 30, 12, Math.PI * 0.1, Math.PI * 0.55, false, 3.5, blade, 0.55);
        arcStroke(g, 28, 30, 14, Math.PI * 0.12, Math.PI * 0.52, false, 2, glow, 0.35);
      },
      (g) => {
        arcStroke(g, 30, 28, 16, Math.PI * 1.15, Math.PI * 1.65, false, 5, blade, 0.78);
        arcStroke(g, 30, 28, 18, Math.PI * 1.12, Math.PI * 1.62, false, 2.5, bladeEdge, 0.55);
        arcStroke(g, 30, 28, 20, Math.PI * 1.1, Math.PI * 1.6, false, 2, glow, 0.4);
      },
      (g) => {
        arcStroke(g, 24, 36, 28, Math.PI * 1.35, Math.PI * 1.92, false, 6.5, blade, 0.95);
        arcStroke(g, 24, 36, 28, Math.PI * 1.35, Math.PI * 1.92, false, 3.5, bladeEdge, 0.8);
        arcStroke(g, 24, 36, 30, Math.PI * 1.33, Math.PI * 1.9, false, 3, glow, 0.5);
        arcStroke(g, 24, 36, 26, Math.PI * 1.38, Math.PI * 1.88, false, 1.6, 0xffffff, 0.48);
        g.fillStyle(TEAL_BRIGHT, 0.4);
        g.fillCircle(24, 4, 2.5);
      },
      (g) => {
        arcStroke(g, 22, 32, 22, Math.PI * 1.05, Math.PI * 1.45, false, 3.5, blade, 0.4);
        arcStroke(g, 22, 32, 24, Math.PI * 1.03, Math.PI * 1.42, false, 2, glow, 0.3);
      },
    ],
    down: [
      (g) => {
        arcStroke(g, 20, 18, 12, Math.PI * 0.45, Math.PI * 0.9, false, 3.5, blade, 0.55);
        arcStroke(g, 20, 18, 14, Math.PI * 0.48, Math.PI * 0.88, false, 2, glow, 0.35);
      },
      (g) => {
        arcStroke(g, 22, 16, 17, Math.PI * -0.35, Math.PI * 0.15, false, 5, blade, 0.78);
        arcStroke(g, 22, 16, 19, Math.PI * -0.33, Math.PI * 0.13, false, 2.5, bladeEdge, 0.55);
        arcStroke(g, 22, 16, 21, Math.PI * -0.3, Math.PI * 0.18, false, 2, glow, 0.4);
      },
      (g) => {
        arcStroke(g, 24, 8, 30, Math.PI * -0.08, Math.PI * 0.62, false, 6.5, blade, 0.95);
        arcStroke(g, 24, 8, 30, Math.PI * -0.08, Math.PI * 0.62, false, 3.5, bladeEdge, 0.8);
        arcStroke(g, 24, 8, 32, Math.PI * -0.05, Math.PI * 0.6, false, 3, glow, 0.5);
        arcStroke(g, 24, 8, 28, Math.PI * -0.1, Math.PI * 0.58, false, 1.6, 0xffffff, 0.48);
        g.fillStyle(TEAL_BRIGHT, 0.4);
        g.fillCircle(24, 42, 2.5);
      },
      (g) => {
        arcStroke(g, 24, 12, 24, Math.PI * 0.35, Math.PI * 0.85, false, 3.5, blade, 0.4);
        arcStroke(g, 24, 12, 26, Math.PI * 0.33, Math.PI * 0.83, false, 2, glow, 0.3);
      },
    ],
  };

  for (const [dir, drawFrames] of Object.entries(frames)) {
    drawFrames.forEach((draw, fi) => {
      const g = scene.make.graphics({ add: false });
      draw(g);
      g.generateTexture(`slash_${dir}_${fi}`, PW, PH);
      g.destroy();
    });
  }
}

function generateCrawlerTexture(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x1a0a0a);
  g.fillEllipse(20, 16, 30, 20);
  for (let i = 0; i < 6; i++) {
    g.fillTriangle(5 + i * 6, 8, 8 + i * 6, -1, 11 + i * 6, 8);
  }
  g.fillStyle(0xff4422);
  g.fillCircle(12, 16, 3);
  g.fillCircle(28, 16, 3);
  g.fillStyle(0xffaa44);
  g.fillCircle(12, 15.5, 1.2);
  g.fillCircle(28, 15.5, 1.2);
  g.lineStyle(2.5, 0x1a0a0a);
  g.lineBetween(7, 24, 2, 32);
  g.lineBetween(14, 24, 10, 32);
  g.lineBetween(26, 24, 30, 32);
  g.lineBetween(33, 24, 38, 32);
  g.generateTexture('crawler', 40, 34);
  g.destroy();
}

function generateFlyerTexture(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x14081e);
  g.fillEllipse(20, 20, 16, 22);
  g.fillStyle(0x200e30);
  g.fillEllipse(4, 14, 16, 10);
  g.fillEllipse(36, 14, 16, 10);
  g.fillStyle(0x8844aa);
  g.fillCircle(4, 14, 3);
  g.fillCircle(36, 14, 3);
  g.fillStyle(0x6622aa);
  g.setAlpha(0.3);
  g.fillEllipse(4, 14, 12, 6);
  g.fillEllipse(36, 14, 12, 6);
  g.setAlpha(1);
  g.fillStyle(0xff6644);
  g.fillCircle(20, 14, 4);
  g.fillStyle(0xffffff);
  g.fillCircle(20, 13, 1.5);
  g.generateTexture('flyer', 40, 40);
  g.destroy();
}

function generateBossTextures(scene) {
  const W = 64, H = 64;

  // Idle texture
  const g = scene.make.graphics({ add: false });
  drawBossBody(g, W, H, false);
  g.generateTexture('boss_idle', W, H);
  g.destroy();

  // Attack texture
  const ga = scene.make.graphics({ add: false });
  drawBossBody(ga, W, H, true);
  ga.generateTexture('boss_attack', W, H);
  ga.destroy();

  // Projectile (flaming skull)
  const gp = scene.make.graphics({ add: false });
  gp.fillStyle(0x220808);
  gp.fillCircle(10, 10, 10);
  gp.fillStyle(0xff4422);
  gp.fillCircle(10, 10, 7);
  gp.fillStyle(0xff8844);
  gp.fillCircle(10, 8, 4);
  gp.fillStyle(0xffcc44);
  gp.fillCircle(10, 7, 2);
  gp.fillStyle(0x110000);
  gp.fillCircle(7, 10, 2);
  gp.fillCircle(13, 10, 2);
  gp.fillStyle(0xff2200);
  gp.fillCircle(7, 10, 1);
  gp.fillCircle(13, 10, 1);
  gp.generateTexture('boss_projectile', 20, 20);
  gp.destroy();
}

function drawBossBody(g, W, H, attacking) {
  const cx = W / 2;

  // Tattered cape
  g.fillStyle(0x440808);
  g.fillTriangle(cx - 18, 20, cx + 18, 20, cx - 22, H - 4);
  g.fillTriangle(cx + 18, 20, cx + 22, H - 4, cx - 22, H - 4);
  g.fillStyle(0x330606);
  g.fillTriangle(cx - 10, 24, cx + 10, 24, cx - 14, H - 8);
  g.fillTriangle(cx + 10, 24, cx + 14, H - 8, cx - 14, H - 8);

  // Armored torso
  g.fillStyle(0x2a1a1a);
  g.fillRect(cx - 14, 22, 28, 20);
  g.fillStyle(0x3a2222);
  g.fillRect(cx - 12, 24, 24, 16);
  // Ribcage lines
  g.lineStyle(1.5, 0x665544, 0.7);
  for (let i = 0; i < 4; i++) {
    const ry = 26 + i * 4;
    g.lineBetween(cx - 10, ry, cx + 10, ry);
  }
  // Shoulder pauldrons
  g.fillStyle(0x444444);
  g.fillEllipse(cx - 16, 24, 14, 10);
  g.fillEllipse(cx + 16, 24, 14, 10);
  g.fillStyle(0x555555);
  g.fillEllipse(cx - 16, 23, 10, 6);
  g.fillEllipse(cx + 16, 23, 10, 6);
  // Spikes on pauldrons
  g.fillStyle(0x888888);
  g.fillTriangle(cx - 22, 22, cx - 19, 14, cx - 16, 22);
  g.fillTriangle(cx + 22, 22, cx + 19, 14, cx + 16, 22);

  // Skull head (larger)
  g.fillStyle(0xd8ccb8);
  g.fillEllipse(cx, 14, 22, 18);
  g.fillStyle(0xc8bca8);
  g.fillEllipse(cx, 16, 20, 14);
  // Jaw
  g.fillStyle(0xc0b4a0);
  g.fillRect(cx - 8, 18, 16, 6);
  // Eye sockets
  g.fillStyle(0x0a0404);
  g.fillEllipse(cx - 6, 12, 7, 6);
  g.fillEllipse(cx + 6, 12, 7, 6);
  // Glowing red eyes
  g.fillStyle(0xff2222);
  g.fillCircle(cx - 6, 12, 2.5);
  g.fillCircle(cx + 6, 12, 2.5);
  g.fillStyle(0xff6644);
  g.fillCircle(cx - 6, 11.5, 1.2);
  g.fillCircle(cx + 6, 11.5, 1.2);
  // Nose hole
  g.fillStyle(0x0a0404);
  g.fillTriangle(cx - 2, 16, cx, 14, cx + 2, 16);
  // Teeth
  g.fillStyle(0xd0c8b0);
  for (let i = 0; i < 5; i++) {
    g.fillRect(cx - 6 + i * 3, 20, 2, 3);
  }

  // Crown (dark iron with red gems)
  g.fillStyle(0x555555);
  g.fillRect(cx - 12, 4, 24, 6);
  g.fillStyle(0x666666);
  g.fillTriangle(cx - 12, 4, cx - 9, -4, cx - 6, 4);
  g.fillTriangle(cx - 3, 4, cx, -6, cx + 3, 4);
  g.fillTriangle(cx + 6, 4, cx + 9, -4, cx + 12, 4);
  // Red gems
  g.fillStyle(0xff2244);
  g.fillCircle(cx - 9, 0, 1.8);
  g.fillCircle(cx, -2, 2);
  g.fillCircle(cx + 9, 0, 1.8);

  // Legs (armored)
  g.fillStyle(0x2a1a1a);
  g.fillRect(cx - 10, 42, 8, 18);
  g.fillRect(cx + 2, 42, 8, 18);
  g.fillStyle(0x333333);
  g.fillRect(cx - 9, 44, 6, 14);
  g.fillRect(cx + 3, 44, 6, 14);
  // Boots
  g.fillStyle(0x444444);
  g.fillRect(cx - 12, 56, 10, 6);
  g.fillRect(cx + 2, 56, 10, 6);

  // Weapon
  if (attacking) {
    // Great axe swinging
    const wx = cx + 24;
    const wy = 16;
    // Shaft
    g.lineStyle(3.5, 0x553322, 1);
    g.lineBetween(cx + 14, 28, wx + 6, wy - 12);
    // Axe head
    g.fillStyle(0x888888);
    g.fillTriangle(wx - 2, wy - 14, wx + 14, wy - 4, wx - 2, wy + 6);
    g.fillStyle(0xaaaaaa);
    g.fillTriangle(wx, wy - 12, wx + 10, wy - 4, wx, wy + 4);
    // Edge gleam
    g.lineStyle(1.5, 0xcccccc, 0.7);
    g.lineBetween(wx + 12, wy - 6, wx + 2, wy + 4);
  } else {
    // Great axe resting
    const wx = cx + 18;
    const wy = 20;
    // Shaft
    g.lineStyle(3.5, 0x553322, 1);
    g.lineBetween(cx + 12, 26, wx, wy + 28);
    // Axe head at bottom
    g.fillStyle(0x888888);
    g.fillTriangle(wx - 8, wy + 22, wx + 8, wy + 16, wx + 8, wy + 32);
    g.fillStyle(0xaaaaaa);
    g.fillTriangle(wx - 6, wy + 24, wx + 6, wy + 18, wx + 6, wy + 30);
  }
}

function generateBruteTexture(scene) {
  const W = 64, H = 56;
  const g = scene.make.graphics({ add: false });
  const cx = W / 2;

  // Massive torso
  g.fillStyle(0x2a1a0a);
  g.fillRoundedRect(cx - 22, 16, 44, 28, 4);
  g.fillStyle(0x3a2814);
  g.fillRoundedRect(cx - 20, 18, 40, 24, 3);

  // Armor plates
  g.fillStyle(0x4a3a28);
  g.fillRect(cx - 18, 20, 36, 4);
  g.fillRect(cx - 18, 28, 36, 4);
  g.fillRect(cx - 18, 36, 36, 4);
  g.lineStyle(1.5, 0x5a4a38, 0.6);
  g.lineBetween(cx - 16, 22, cx + 16, 22);
  g.lineBetween(cx - 16, 30, cx + 16, 30);
  g.lineBetween(cx - 16, 38, cx + 16, 38);

  // Massive shoulder pauldrons
  g.fillStyle(0x4a4a50);
  g.fillEllipse(cx - 24, 20, 20, 14);
  g.fillEllipse(cx + 24, 20, 20, 14);
  g.fillStyle(0x5a5a60);
  g.fillEllipse(cx - 24, 19, 14, 8);
  g.fillEllipse(cx + 24, 19, 14, 8);
  // Spikes on shoulders
  g.fillStyle(0x6a6a70);
  g.fillTriangle(cx - 30, 18, cx - 27, 8, cx - 24, 18);
  g.fillTriangle(cx + 30, 18, cx + 27, 8, cx + 24, 18);

  // Thick legs
  g.fillStyle(0x2a1a0a);
  g.fillRect(cx - 14, 42, 10, 14);
  g.fillRect(cx + 4, 42, 10, 14);
  g.fillStyle(0x3a2814);
  g.fillRect(cx - 12, 44, 6, 10);
  g.fillRect(cx + 6, 44, 6, 10);

  // Skull head (bigger, angrier)
  g.fillStyle(0xd0c4b0);
  g.fillEllipse(cx, 10, 24, 18);
  g.fillStyle(0xc0b4a0);
  g.fillEllipse(cx, 12, 20, 14);
  // Jaw
  g.fillStyle(0xb0a490);
  g.fillRect(cx - 8, 16, 16, 6);
  g.lineStyle(1, 0x8a7a68, 0.8);
  for (let i = 0; i < 5; i++) {
    g.lineBetween(cx - 6 + i * 3, 18, cx - 6 + i * 3, 22);
  }
  // Eye sockets
  g.fillStyle(0x0a0404);
  g.fillEllipse(cx - 6, 8, 8, 6);
  g.fillEllipse(cx + 6, 8, 8, 6);
  // Glowing red eyes
  g.fillStyle(0xff3322);
  g.fillCircle(cx - 6, 8, 3);
  g.fillCircle(cx + 6, 8, 3);
  g.fillStyle(0xff8844);
  g.fillCircle(cx - 6, 7.5, 1.5);
  g.fillCircle(cx + 6, 7.5, 1.5);

  // Spiked crown / helmet
  g.fillStyle(0x555560);
  g.fillRect(cx - 10, 1, 20, 5);
  g.fillTriangle(cx - 10, 3, cx - 7, -4, cx - 4, 3);
  g.fillTriangle(cx - 2, 3, cx, -6, cx + 2, 3);
  g.fillTriangle(cx + 4, 3, cx + 7, -4, cx + 10, 3);
  g.fillStyle(0xff2244);
  g.fillCircle(cx, -3, 2);

  g.generateTexture('brute', W, H);
  g.destroy();
}

function lerpRgb(c1, c2, t) {
  const r1 = (c1 >> 16) & 0xff; const g1 = (c1 >> 8) & 0xff; const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff; const g2 = (c2 >> 8) & 0xff; const b2 = c2 & 0xff;
  const r = Math.floor(r1 + (r2 - r1) * t);
  const g = Math.floor(g1 + (g2 - g1) * t);
  const b = Math.floor(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

/** Procedural tiles generated at this size, scaled to TILE_SIZE in LevelManager */
const TILE_TEX_SIZE = 64;

function frac01(n) {
  return n - Math.floor(n);
}

/** Deterministic 0..1 noise for texture grain */
function hashNoise(x, y, seed = 0) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + seed * 4.17) * 43758.5453123;
  return frac01(s);
}

function scatterTileNoise(g, seed, baseRgb, strength = 0.06) {
  const S = TILE_TEX_SIZE;
  const nDots = 48;
  for (let i = 0; i < nDots; i++) {
    const px = (hashNoise(i, seed * 3, seed) * (S - 4)) + 2;
    const py = (hashNoise(seed, i * 2, i) * (S - 4)) + 2;
    const n = hashNoise(px, py, seed + i);
    g.fillStyle(0x000000, strength * (0.4 + n));
    g.fillCircle(px, py, 0.6 + n * 1.2);
    g.fillStyle(lerpRgb(baseRgb, 0xffffff, n * 0.15), strength * 0.5);
    g.fillCircle(px - 0.3, py - 0.3, 0.35);
  }
  g.setAlpha(1);
}

/** Chunky carved stone with top-left key light + depth (64px source, scaled to grid in LevelManager) */
function drawWallTile(g, seed, mossy) {
  const S = TILE_TEX_SIZE;
  const litTop = mossy ? 0x5a4830 : 0x6a5040;
  const litMid = mossy ? 0x3a2c1c : 0x4a3828;
  const shadowBot = mossy ? 0x1a1008 : 0x2a1c14;

  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    const rowCol = lerpRgb(litTop, shadowBot, t * t);
    g.fillStyle(rowCol);
    g.fillRect(0, y, S, 1);
  }
  for (let y = 0; y < S; y += 2) {
    const n = hashNoise(y, seed * 2, 7);
    g.fillStyle(0x000000, 0.018 * n);
    g.fillRect(0, y, S, 1);
  }

  g.fillStyle(0xffffff);
  g.setAlpha(0.055);
  g.fillRect(0, 0, 6, S);
  g.setAlpha(1);
  g.fillStyle(0x8a7858);
  g.setAlpha(0.12);
  g.fillRect(6, 0, 4, S);
  g.setAlpha(1);

  g.fillStyle(0x000000);
  g.setAlpha(0.28);
  g.fillRect(56, 0, 8, S);
  g.setAlpha(1);

  g.fillStyle(litMid);
  g.fillRect(10, 8, 44, 48);
  g.fillStyle(0x000000);
  g.setAlpha(0.12);
  g.fillRect(52, 8, 4, 48);
  g.setAlpha(1);

  g.fillStyle(0x000000);
  g.setAlpha(0.18);
  g.fillRect(0, 0, 14, 14);
  g.fillRect(S - 14, 0, 14, 14);
  g.fillRect(0, S - 10, 12, 10);
  g.fillRect(S - 12, S - 10, 12, 10);
  g.setAlpha(1);

  g.lineStyle(1, 0x000000, 0.14);
  for (let y = 16; y < 52; y += 16) {
    g.lineBetween(10, y, 54, y);
  }

  const cracks = [
    [[12, 0], [16, S]], [[48, 0], [44, S]], [[0, 20], [S, 28]],
    [[0, 44], [S, 40]], [[28, 0], [36, S]],
  ];
  g.lineStyle(1, 0x100804, 0.5);
  const c = cracks[seed % cracks.length];
  g.lineBetween(c[0][0], c[0][1], c[1][0], c[1][1]);
  g.lineStyle(1, 0x3a2818, 0.3);
  g.lineBetween((seed * 3) % 40 + 8, 0, (seed * 5) % 40 + 16, S);

  g.fillStyle(0x1a1008);
  g.setAlpha(0.22);
  g.fillRect(0, 56, S, 8);
  g.setAlpha(1);

  for (let i = 0; i < 22; i++) {
    const px = ((seed * 17 + i * 13) % 48) + 10;
    const py = ((seed * 11 + i * 7) % 48) + 10;
    g.fillStyle(0x000000);
    g.setAlpha(0.09);
    g.fillCircle(px, py, 2.2);
    g.setAlpha(1);
    g.fillStyle(lerpRgb(0x5a4830, 0x3a2818, (i % 5) / 5));
    g.fillCircle(px, py, 0.9);
  }

  if (mossy) {
    g.fillStyle(0x2a5020);
    g.setAlpha(0.26);
    for (let i = 0; i < 14; i++) {
      g.fillEllipse(4 + (i * 8 + seed) % 56, 2 + (i % 5), 10, 6);
    }
    g.setAlpha(0.36);
    g.fillStyle(0x1a3810);
    g.fillRect(0, 0, S, 14);
    g.setAlpha(1);
    g.lineStyle(1, 0x2a5820, 0.35);
    g.lineBetween(0, 12, S, 10);
  }

  scatterTileNoise(g, seed + (mossy ? 99 : 0), litMid, 0.055);

  g.lineStyle(2, 0x1a1410, 0.42);
  g.strokeRect(1, 1, S - 2, S - 2);
  g.lineStyle(1, 0x000000, 0.22);
  g.strokeRect(0.5, 0.5, S - 1, S - 1);
}

function generateTileTextures(scene) {
  const TS = TILE_TEX_SIZE;
  for (let s = 0; s < 3; s++) {
    const g = scene.make.graphics({ add: false });
    drawWallTile(g, s, false);
    g.generateTexture(s === 0 ? 'tile_wall' : `tile_wall_${s + 1}`, TS, TS);
    g.destroy();
  }

  const gm = scene.make.graphics({ add: false });
  drawWallTile(gm, 2, true);
  gm.generateTexture('tile_wall_mossy', TS, TS);
  gm.destroy();

  /** Island-style thick platform: rounded top, earthy body, shaded underside */
  const makePlat = (key, hue) => {
    const g2 = scene.make.graphics({ add: false });
    const topHi = hue === 0 ? 0x8a7858 : 0x887858;
    const topMid = hue === 0 ? 0x6a5838 : 0x685838;
    const faceHi = hue === 0 ? 0x4a3828 : 0x483828;
    const faceLo = 0x2a1c10;
    const edge = 0x140e06;

    for (let y = 12; y < 56; y++) {
      const t = (y - 12) / 44;
      g2.fillStyle(lerpRgb(faceHi, faceLo, t));
      g2.fillRect(2, y, 60, 1);
    }
    g2.fillStyle(faceLo);
    g2.fillEllipse(32, 56, 56, 16);
    g2.fillStyle(0x000000);
    g2.setAlpha(0.2);
    g2.fillRect(52, 12, 12, 44);
    g2.setAlpha(1);
    g2.fillStyle(0xffffff);
    g2.setAlpha(0.07);
    g2.fillRect(0, 8, 6, 40);
    g2.setAlpha(1);
    g2.fillStyle(topMid);
    g2.fillRect(0, 8, TS, 8);
    g2.fillStyle(topHi);
    g2.fillRoundedRect(0, 4, TS, 12, { tl: 8, tr: 8, bl: 0, br: 0 });
    g2.fillStyle(0xffffff);
    g2.setAlpha(0.15);
    g2.fillRect(4, 4, 56, 4);
    g2.setAlpha(1);
    g2.fillStyle(TEAL_GLOW);
    g2.setAlpha(0.09);
    g2.fillRect(8, 2, 48, 2);
    g2.setAlpha(1);
    g2.lineStyle(1, edge, 0.42);
    g2.lineBetween(12, 16, 16, 48);
    g2.lineBetween(44, 16, 40, 44);
    g2.lineBetween(28, 20, 32, 52);
    g2.fillStyle(0x000000);
    g2.setAlpha(0.36);
    g2.fillRect(2, 56, 60, 8);
    g2.setAlpha(1);
    scatterTileNoise(g2, hue * 31 + 40, faceHi, 0.05);
    g2.lineStyle(2, edge, 0.38);
    g2.strokeRoundedRect(1, 1, TS - 2, TS - 2, 6);
    g2.lineStyle(1, 0x000000, 0.28);
    g2.strokeRoundedRect(0.5, 0.5, TS - 1, TS - 1, 6);

    g2.generateTexture(key, TS, TS);
    g2.destroy();
  };
  makePlat('tile_platform', 0);
  makePlat('tile_platform_2', 1);

  /**
   * Terrain ledges: stepped top (mini stairs), earth/stone body, theme palettes.
   * Themes: mountain (trail), fungal (moss), crystal (rubble + shard glint)
   */
  const terracePalettes = {
    mountain: {
      faceHi: 0x4a3828, faceLo: 0x2a1c10, topMid: 0x6a5838, topHi: 0x8a7858, rim: 0xc9a060, edge: 0x140e06, speck: 0x5a4830,
    },
    fungal: {
      faceHi: 0x3a4828, faceLo: 0x1a2410, topMid: 0x4a5a38, topHi: 0x5a7048, rim: 0x5a8048, edge: 0x1a2810, speck: 0x3a5830,
    },
    crystal: {
      faceHi: 0x3a3050, faceLo: 0x1a1028, topMid: 0x484878, topHi: 0x6878a8, rim: 0x8899cc, edge: 0x140e18, speck: 0x5060a0,
    },
  };

  const drawTerracePlatform = (variant, theme) => {
    const g3 = scene.make.graphics({ add: false });
    const P = terracePalettes[theme];
    const { faceHi, faceLo, topMid, topHi, rim, edge, speck } = P;
    const TSz = TILE_TEX_SIZE;

    for (let y = 12; y < 56; y++) {
      const t = (y - 12) / 44;
      g3.fillStyle(lerpRgb(faceHi, faceLo, t));
      g3.fillRect(0, y, TSz, 1);
    }
    g3.fillStyle(faceLo);
    g3.fillEllipse(32, 56, 56, 16);
    g3.fillStyle(0x000000);
    g3.setAlpha(0.18);
    g3.fillRect(48, 12, 16, 44);
    g3.setAlpha(1);

    g3.fillStyle(topMid);
    g3.fillRect(0, 8, TSz, 8);
    g3.fillStyle(topHi);
    g3.fillRoundedRect(0, 4, TSz, 12, { tl: 8, tr: 8, bl: 0, br: 0 });
    g3.fillStyle(0xffffff);
    g3.setAlpha(0.15);
    g3.fillRect(4, 4, 56, 4);
    g3.setAlpha(0.1);
    g3.fillRect(20, 4, 24, 2);
    g3.fillRect(44, 2, 20, 2);
    g3.setAlpha(1);
    g3.fillStyle(rim);
    g3.setAlpha(0.28);
    g3.fillRect(2, 2, 60, 2);
    g3.setAlpha(1);

    for (let i = 0; i < 16; i++) {
      const sx = ((i * 17 + variant.length * 3) % 56) + 4;
      const sy = 4 + (i % 5);
      g3.fillStyle(speck);
      g3.setAlpha(0.32 + (i % 4) * 0.07);
      g3.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
      g3.setAlpha(1);
    }

    g3.lineStyle(1, edge, 0.34);
    g3.lineBetween(16, 16, 20, 48);
    g3.lineBetween(44, 16, 40, 44);

    if (variant === 'left') {
      g3.fillStyle(0xffffff);
      g3.setAlpha(0.1);
      g3.fillRect(0, 4, 10, 48);
      g3.setAlpha(1);
      g3.lineStyle(1, lerpRgb(topHi, 0xffffff, 0.2), 0.45);
      g3.lineBetween(0, 4, 0, 56);
    }
    if (variant === 'right') {
      g3.fillStyle(0xffffff);
      g3.setAlpha(0.08);
      g3.fillRect(54, 4, 10, 48);
      g3.setAlpha(1);
      g3.lineStyle(1, lerpRgb(faceHi, 0x000000, 0.3), 0.48);
      g3.lineBetween(63, 4, 63, 56);
    }

    if (variant === 'mid2') {
      g3.lineStyle(1, lerpRgb(faceLo, faceHi, 0.5), 0.48);
      g3.lineBetween(16, 16, 20, 48);
      g3.lineBetween(44, 16, 40, 48);
      g3.fillStyle(faceLo);
      g3.fillRect(28, 20, 8, 28);
    }
    if (variant === 'solo') {
      g3.fillStyle(faceLo);
      g3.fillRect(8, 40, 8, 12);
      g3.fillRect(48, 40, 8, 12);
      g3.lineStyle(1, edge, 0.34);
      g3.lineBetween(12, 52, 12, 60);
      g3.lineBetween(52, 52, 52, 60);
    }

    g3.fillStyle(0x000000);
    g3.setAlpha(0.4);
    g3.fillRect(0, 56, TSz, 8);
    g3.setAlpha(1);

    g3.lineStyle(1, edge, 0.3);
    if (variant === 'solo') {
      g3.lineBetween(4, 8, 4, 56);
      g3.lineBetween(60, 8, 60, 56);
    }

    scatterTileNoise(g3, variant.charCodeAt(0) + theme.length * 17, faceHi, 0.048);
    g3.lineStyle(2, edge, 0.32);
    g3.strokeRoundedRect(1, 1, TSz - 2, TSz - 2, 6);
    g3.lineStyle(1, 0x000000, 0.26);
    g3.strokeRoundedRect(0.5, 0.5, TSz - 1, TSz - 1, 6);

    return g3;
  };

  const terraceKeys = { mountain: 'tile_platform_mountain', fungal: 'tile_platform_fungal', crystal: 'tile_platform_crystal' };
  ['mountain', 'fungal', 'crystal'].forEach((th) => {
    ['mid', 'mid2', 'left', 'right', 'solo'].forEach((v) => {
      const g3 = drawTerracePlatform(v, th);
      const base = terraceKeys[th];
      const key = v === 'mid' ? base : `${base}_${v}`;
      g3.generateTexture(key, TILE_TEX_SIZE, TILE_TEX_SIZE);
      g3.destroy();
    });
  });

  /** Full tile (tile value 3) — carved stone steps / landing; reads as terrain, not a thin beam */
  const stairG = scene.make.graphics({ add: false });
  const stTop = 0x8a7858;
  const stFace = 0x4a3828;
  const TSt = TILE_TEX_SIZE;
  stairG.fillStyle(stFace);
  stairG.fillRect(0, 0, TSt, TSt);
  for (let y = 28; y < TSt; y++) {
    stairG.fillStyle(lerpRgb(0x4a3828, 0x1a1008, (y - 28) / 36));
    stairG.fillRect(0, y, TSt, 1);
  }
  stairG.fillStyle(stTop);
  stairG.fillRect(0, 0, TSt, 22);
  stairG.fillStyle(0xffffff);
  stairG.setAlpha(0.18);
  stairG.fillRect(2, 2, 60, 6);
  stairG.setAlpha(1);
  stairG.fillStyle(0x000000);
  stairG.setAlpha(0.34);
  stairG.fillRect(0, 22, TSt, 8);
  stairG.setAlpha(1);
  stairG.fillStyle(lerpRgb(stTop, 0x6a5838, 0.45));
  stairG.fillRect(0, 30, TSt, 18);
  stairG.fillStyle(0xffffff);
  stairG.setAlpha(0.1);
  stairG.fillRect(0, 30, TSt, 4);
  stairG.setAlpha(1);
  stairG.fillStyle(0x000000);
  stairG.setAlpha(0.38);
  stairG.fillRect(0, 48, TSt, 10);
  stairG.setAlpha(1);
  stairG.lineStyle(1, 0x140e06, 0.48);
  stairG.lineBetween(0, 30, TSt, 30);
  stairG.lineBetween(0, 30, 0, TSt);
  stairG.lineBetween(TSt - 1, 30, TSt - 1, TSt);
  scatterTileNoise(stairG, 901, stTop, 0.045);
  stairG.lineStyle(2, 0x1a1410, 0.4);
  stairG.strokeRect(1, 1, TSt - 2, TSt - 2);
  stairG.lineStyle(1, 0x000000, 0.28);
  stairG.strokeRect(0.5, 0.5, TSt - 1, TSt - 1);
  stairG.generateTexture('tile_stair_block', TSt, TSt);
  stairG.destroy();

  /** Packed earth / worn path — full tile for stair landings in fungal/crystal rooms */
  const pathG = scene.make.graphics({ add: false });
  const TP = TILE_TEX_SIZE;
  pathG.fillStyle(0x4a3828);
  pathG.fillRect(0, 0, TP, TP);
  pathG.fillStyle(0x6a5840);
  pathG.fillRect(0, 0, TP, 18);
  pathG.fillStyle(0x000000);
  pathG.setAlpha(0.18);
  pathG.fillRect(0, 18, TP, 12);
  pathG.setAlpha(1);
  pathG.fillStyle(0x5a4835);
  pathG.fillRect(0, 0, TP, 10);
  pathG.lineStyle(1, 0x3a2818, 0.32);
  pathG.lineBetween(0, 10, TP, 10);
  pathG.lineBetween(8, 16, 56, 24);
  scatterTileNoise(pathG, 702, 0x5a4835, 0.052);
  pathG.lineStyle(2, 0x2a2018, 0.35);
  pathG.strokeRect(1, 1, TP - 2, TP - 2);
  pathG.lineStyle(1, 0x000000, 0.26);
  pathG.strokeRect(0.5, 0.5, TP - 1, TP - 1);
  pathG.generateTexture('tile_ground_path', TP, TP);
  pathG.destroy();
}

function generateBackgroundTextures(scene) {
  // Stalactite (large) — shaded cone, light from upper-left
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x3a2818);
  g.fillTriangle(0, 0, 20, 64, 40, 0);
  g.fillStyle(0x5a4830);
  g.setAlpha(0.5);
  g.fillTriangle(4, 2, 20, 58, 18, 2);
  g.setAlpha(1);
  g.fillStyle(0x000000);
  g.setAlpha(0.35);
  g.fillTriangle(22, 2, 20, 60, 38, 2);
  g.setAlpha(1);
  g.lineStyle(2, 0x7a6848, 0.4);
  g.lineBetween(10, 8, 18, 48);
  g.fillStyle(TEAL_DARK);
  g.setAlpha(0.2);
  g.fillCircle(20, 52, 6);
  g.setAlpha(1);
  g.generateTexture('stalactite', 40, 64);
  g.destroy();

  const gs = scene.make.graphics({ add: false });
  gs.fillStyle(0x3a2818);
  gs.fillTriangle(0, 0, 8, 28, 16, 0);
  gs.fillStyle(0x5a4830);
  gs.setAlpha(0.45);
  gs.fillTriangle(2, 1, 8, 26, 14, 1);
  gs.setAlpha(1);
  gs.fillStyle(0x000000);
  gs.setAlpha(0.3);
  gs.fillTriangle(10, 1, 8, 26, 15, 1);
  gs.setAlpha(1);
  gs.generateTexture('stalactite_sm', 16, 28);
  gs.destroy();

  const gst = scene.make.graphics({ add: false });
  gst.fillStyle(0x3a2818);
  gst.fillTriangle(0, 40, 16, 0, 32, 40);
  gst.fillStyle(0x5a4830);
  gst.setAlpha(0.45);
  gst.fillTriangle(2, 38, 16, 2, 30, 38);
  gst.setAlpha(1);
  gst.fillStyle(0x000000);
  gst.setAlpha(0.25);
  gst.fillRect(0, 36, 32, 4);
  gst.setAlpha(1);
  gst.generateTexture('stalagmite', 32, 40);
  gst.destroy();

  // Large mushroom — cap + stem (reads as prop, not a creature with “eyes”)
  const gf = scene.make.graphics({ add: false });
  gf.fillStyle(0x0a0c12);
  gf.fillRect(9, 14, 6, 14);
  gf.fillStyle(0x121a22);
  gf.fillEllipse(12, 14, 8, 5);
  gf.fillStyle(0x1a2832);
  gf.fillEllipse(12, 10, 16, 10);
  gf.fillStyle(TEAL);
  gf.setAlpha(0.28);
  gf.fillEllipse(11, 9, 12, 7);
  gf.setAlpha(1);
  gf.fillStyle(TEAL_GLOW);
  gf.setAlpha(0.35);
  gf.fillEllipse(12, 11, 8, 4);
  gf.setAlpha(1);
  gf.lineStyle(1, 0x2a4050, 0.35);
  gf.lineBetween(12, 6, 12, 14);
  gf.generateTexture('fungus_glow', 24, 28);
  gf.destroy();

  // Ground moss / lichen mat — irregular, no paired dots (avoids “enemy eyes”)
  const gfs = scene.make.graphics({ add: false });
  gfs.fillStyle(0x0c1410);
  gfs.fillEllipse(8, 10, 15, 7);
  gfs.fillStyle(0x142018);
  gfs.fillEllipse(7, 9, 10, 5);
  gfs.fillStyle(0x1a2c24);
  gfs.fillEllipse(4, 8, 5, 4);
  gfs.fillEllipse(11, 7, 5, 3);
  gfs.fillEllipse(9, 10, 4, 3);
  gfs.fillStyle(0x243630);
  gfs.setAlpha(0.5);
  gfs.fillEllipse(6, 9, 3, 2);
  gfs.fillEllipse(12, 8, 2.5, 2);
  gfs.setAlpha(1);
  gfs.fillStyle(TEAL_DARK);
  gfs.setAlpha(0.18);
  gfs.fillEllipse(5, 7, 2, 1.5);
  gfs.setAlpha(1);
  gfs.generateTexture('fungus_small', 16, 12);
  gfs.destroy();

  // Crystal (larger)
  const gc = scene.make.graphics({ add: false });
  gc.fillStyle(TEAL_DARK);
  gc.fillTriangle(12, 0, 0, 36, 24, 36);
  gc.fillStyle(TEAL_GLOW);
  gc.setAlpha(0.3);
  gc.fillTriangle(12, 4, 5, 30, 19, 30);
  gc.setAlpha(1);
  gc.fillStyle(0xffffff);
  gc.setAlpha(0.15);
  gc.fillTriangle(10, 6, 6, 24, 12, 24);
  gc.setAlpha(1);
  gc.generateTexture('crystal', 24, 36);
  gc.destroy();

  // Crystal cluster
  const gcc = scene.make.graphics({ add: false });
  gcc.fillStyle(TEAL_DARK);
  gcc.fillTriangle(8, 4, 0, 32, 16, 32);
  gcc.fillTriangle(20, 0, 12, 32, 28, 32);
  gcc.fillTriangle(32, 6, 24, 32, 40, 32);
  gcc.fillStyle(TEAL_GLOW);
  gcc.setAlpha(0.25);
  gcc.fillTriangle(20, 2, 14, 28, 26, 28);
  gcc.setAlpha(1);
  gcc.generateTexture('crystal_cluster', 40, 32);
  gcc.destroy();

  // Chains
  const gch = scene.make.graphics({ add: false });
  gch.fillStyle(0x3a3028);
  for (let i = 0; i < 6; i++) {
    gch.strokeRoundedRect(2, i * 12, 8, 10, 3);
    gch.lineStyle(1, 0x4a4038);
  }
  gch.generateTexture('chain', 12, 72);
  gch.destroy();

  // Ruins pillar — rounded column shading
  const gp = scene.make.graphics({ add: false });
  for (let y = 8; y < 72; y++) {
    const t = (y - 8) / 64;
    gp.fillStyle(lerpRgb(0x3a2818, 0x1a1008, t));
    gp.fillRect(4, y, 24, 1);
  }
  gp.fillStyle(0x5a4830);
  gp.setAlpha(0.45);
  gp.fillRect(4, 8, 8, 64);
  gp.setAlpha(1);
  gp.fillStyle(0x000000);
  gp.setAlpha(0.35);
  gp.fillRect(22, 8, 6, 64);
  gp.setAlpha(1);
  gp.fillStyle(0x3a2818);
  gp.fillRect(0, 0, 32, 8);
  gp.fillRect(0, 72, 32, 8);
  gp.lineStyle(1, 0x000000, 0.25);
  gp.lineBetween(16, 8, 16, 72);
  gp.generateTexture('pillar', 32, 80);
  gp.destroy();

  const gbp = scene.make.graphics({ add: false });
  for (let y = 16; y < 48; y++) {
    const t = (y - 16) / 32;
    gbp.fillStyle(lerpRgb(0x3a2818, 0x1a1008, t));
    gbp.fillRect(4, y, 24, 1);
  }
  gbp.fillStyle(0x5a4830);
  gbp.setAlpha(0.4);
  gbp.fillRect(4, 16, 7, 32);
  gbp.setAlpha(1);
  gbp.fillStyle(0x000000);
  gbp.setAlpha(0.3);
  gbp.fillRect(22, 16, 6, 32);
  gbp.setAlpha(1);
  gbp.fillStyle(0x2a1c10);
  gbp.fillRect(0, 48, 32, 8);
  gbp.fillTriangle(4, 16, 28, 16, 16, 8);
  gbp.generateTexture('pillar_broken', 32, 56);
  gbp.destroy();

  // Vines
  const gv = scene.make.graphics({ add: false });
  gv.lineStyle(2, 0x0a3020);
  gv.beginPath();
  gv.moveTo(6, 0);
  gv.lineTo(4, 20);
  gv.lineTo(8, 40);
  gv.lineTo(3, 60);
  gv.lineTo(7, 80);
  gv.strokePath();
  gv.fillStyle(TEAL_DARK);
  gv.setAlpha(0.4);
  gv.fillCircle(4, 20, 3);
  gv.fillCircle(8, 45, 2);
  gv.fillCircle(3, 65, 3);
  gv.setAlpha(1);
  gv.generateTexture('vine', 12, 80);
  gv.destroy();

  // Light beam (vertical shaft of light)
  const gl = scene.make.graphics({ add: false });
  gl.fillStyle(TEAL_GLOW);
  gl.setAlpha(0.03);
  gl.fillTriangle(0, 0, 20, 128, 40, 0);
  gl.setAlpha(0.05);
  gl.fillTriangle(8, 0, 18, 128, 28, 0);
  gl.generateTexture('light_beam', 40, 128);
  gl.destroy();

  // Pine tree silhouette (mountain mid-ground)
  const pt = scene.make.graphics({ add: false });
  pt.fillStyle(0x0a1218);
  pt.fillTriangle(16, 96, 0, 96, 16, 8);
  pt.fillTriangle(16, 96, 32, 96, 16, 16);
  pt.fillStyle(0x060a0e);
  pt.fillRect(13, 88, 6, 10);
  pt.generateTexture('pine_tree', 32, 96);
  pt.destroy();

  // Snow rock cluster
  const sr = scene.make.graphics({ add: false });
  sr.fillStyle(0x4a3828);
  sr.fillCircle(12, 14, 11);
  sr.fillCircle(22, 16, 9);
  sr.fillStyle(0x7a6848);
  sr.setAlpha(0.5);
  sr.fillEllipse(10, 10, 10, 5);
  sr.fillEllipse(22, 12, 8, 4);
  sr.setAlpha(1);
  sr.generateTexture('snow_rock', 32, 28);
  sr.destroy();

  // Wooden bridge segment (decorative)
  const wb = scene.make.graphics({ add: false });
  wb.fillStyle(0x3a3028);
  wb.fillRect(0, 8, 64, 8);
  wb.lineStyle(2, 0x2a2218);
  wb.lineBetween(0, 8, 64, 8);
  wb.lineBetween(0, 16, 64, 16);
  for (let i = 0; i < 5; i++) {
    wb.lineBetween(8 + i * 12, 8, 8 + i * 12, 16);
  }
  wb.fillStyle(0x4a4038);
  wb.fillRect(0, 6, 64, 4);
  wb.generateTexture('wood_bridge', 64, 20);
  wb.destroy();

  // Mountain banner — tattered cloth (not a blade / weapon silhouette)
  const bn = scene.make.graphics({ add: false });
  bn.fillStyle(0x2a2838);
  bn.fillRect(2, 0, 3, 48);
  bn.fillStyle(TEAL_DARK);
  bn.beginPath();
  bn.moveTo(5, 6);
  bn.lineTo(20, 10);
  bn.lineTo(18, 18);
  bn.lineTo(22, 22);
  bn.lineTo(16, 28);
  bn.lineTo(19, 34);
  bn.lineTo(6, 30);
  bn.lineTo(5, 6);
  bn.closePath();
  bn.fillPath();
  bn.lineStyle(1, 0x4a5870, 0.4);
  bn.lineBetween(6, 12, 17, 16);
  bn.lineBetween(7, 22, 18, 26);
  bn.generateTexture('mountain_banner', 24, 48);
  bn.destroy();

  // Distant bird flock (tiny V shapes) — decorative
  const br = scene.make.graphics({ add: false });
  br.lineStyle(1, 0x1a2530, 0.6);
  br.lineBetween(0, 4, 4, 0);
  br.lineBetween(4, 0, 8, 4);
  br.lineBetween(12, 8, 16, 4);
  br.lineBetween(16, 4, 20, 8);
  br.generateTexture('birds_silhouette', 24, 12);
  br.destroy();

  // Ruined arch (Hallownest-style silhouette)
  const arch = scene.make.graphics({ add: false });
  arch.fillStyle(0x080810);
  arch.fillRect(0, 48, 64, 24);
  arch.fillRect(0, 0, 12, 72);
  arch.fillRect(52, 0, 12, 72);
  arch.fillTriangle(0, 48, 32, 8, 64, 48);
  arch.fillStyle(TEAL_DARK);
  arch.setAlpha(0.15);
  arch.lineBetween(6, 48, 32, 14);
  arch.lineBetween(58, 48, 32, 14);
  arch.setAlpha(1);
  arch.generateTexture('ruin_arch', 64, 72);
  arch.destroy();

  // Hanging moss / roots
  const hm = scene.make.graphics({ add: false });
  hm.lineStyle(2, 0x0a1810);
  for (let s = 0; s < 5; s++) {
    hm.beginPath();
    hm.moveTo(8 + s * 4, 0);
    hm.lineTo(6 + s * 4, 20 + s * 3);
    hm.lineTo(10 + s * 4, 40 + s * 2);
    hm.strokePath();
  }
  hm.fillStyle(TEAL_DARK);
  hm.setAlpha(0.35);
  hm.fillCircle(12, 36, 4);
  hm.fillCircle(20, 44, 3);
  hm.setAlpha(1);
  hm.generateTexture('hanging_moss', 32, 48);
  hm.destroy();

  // Ambient spore / soul mote (single glow)
  const sp = scene.make.graphics({ add: false });
  sp.fillStyle(TEAL_GLOW);
  sp.setAlpha(0.15);
  sp.fillCircle(8, 8, 8);
  sp.setAlpha(0.5);
  sp.fillCircle(8, 8, 3);
  sp.setAlpha(1);
  sp.fillStyle(0xffffff);
  sp.fillCircle(8, 8, 1);
  sp.generateTexture('glow_spore', 16, 16);
  sp.destroy();
}

/** Break up flat parallax fills with deterministic grain + soft highlights */
function enrichParallaxSurface(g, W, H, seed, opts = {}) {
  const step = opts.step ?? 4;
  const darkStr = opts.darkStr ?? 0.024;
  const hiStr = opts.hiStr ?? 0.014;
  const hiCount = opts.hiCount ?? 480;
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const n = hashNoise(x * 0.045, y * 0.045, seed);
      g.fillStyle(0x000000, darkStr * (0.35 + n * 0.65));
      g.fillRect(x, y, step, step);
    }
  }
  for (let i = 0; i < hiCount; i++) {
    const x = (hashNoise(i * 2, seed, 8) * (W - 8)) | 0;
    const y = (hashNoise(seed, i, 9) * (H - 8)) | 0;
    const n = hashNoise(x, y, seed + i);
    g.fillStyle(0xffffff, hiStr * n);
    g.fillRect(x, y, 2 + (i % 4), 1 + (i % 2));
  }
  g.setAlpha(1);
}

/** Soften hard triangle silhouettes with a low-alpha fringe along the bottom third */
function fringeParallaxSilhouettes(g, W, H, seed, color, alpha = 0.14) {
  g.fillStyle(color);
  g.setAlpha(alpha);
  for (let i = 0; i < 18; i++) {
    const x = (hashNoise(i, seed, 2) * (W - 40)) | 0;
    const w = 28 + ((i * 7) % 24);
    const yBase = H - 80 - (i % 5) * 12;
    g.fillEllipse(x + w * 0.5, yBase + 20, w, 36);
  }
  g.setAlpha(1);
}

/** Vertical atmosphere gradient + painterly parallax (HK / Metroid-inspired) */
function generateParallaxTextures(scene) {
  const W = 960;
  const H = 540;

  const drawAbyssGradient = (g, gradSeed = 1) => {
    for (let y = 0; y < H; y++) {
      const t = y / H;
      const wobble = (hashNoise(y, gradSeed, 0) - 0.5) * 0.055;
      const tw = Phaser.Math.Clamp(t + wobble, 0, 1);
      const r = Math.floor(Phaser.Math.Linear(18, 6, tw));
      const gg = Math.floor(Phaser.Math.Linear(12, 4, tw));
      const b = Math.floor(Phaser.Math.Linear(8, 2, tw));
      g.fillStyle((r << 16) | (gg << 8) | b);
      g.fillRect(0, y, W, 1);
    }
  };

  // --- Cavern far: deep earthy abyss + distant rock silhouettes + warm glow ---
  const gfar = scene.make.graphics({ add: false });
  drawAbyssGradient(gfar, 11);
  gfar.fillStyle(0x0e0a04);
  for (let i = 0; i < 8; i++) {
    const x = i * 120 + (i % 2) * 40;
    const h = 80 + (i % 4) * 35;
    gfar.fillTriangle(x, H, x + 40, H - h, x + 90, H);
  }
  gfar.fillStyle(0x080604);
  gfar.fillTriangle(0, H, 200, 160, 420, H);
  gfar.fillTriangle(380, H, 620, 120, 880, H);
  gfar.fillStyle(0x100c08);
  for (let i = 0; i < 12; i++) {
    const x = 40 + i * 78;
    gfar.fillTriangle(x, 0, x + 8 + (i % 3) * 4, 100 + (i % 5) * 25, x + 18, 0);
  }
  gfar.fillStyle(0x1a1408);
  gfar.setAlpha(0.35);
  gfar.fillRect(0, H - 120, W, 120);
  gfar.setAlpha(1);
  fringeParallaxSilhouettes(gfar, W, H, 41, 0x120c06, 0.09);
  enrichParallaxSurface(gfar, W, H, 101, { darkStr: 0.026, hiStr: 0.012 });
  gfar.generateTexture('bg_far_cavern', W, H);
  gfar.destroy();

  // --- Fungal far: sickly green-purple + bioluminescent pools ---
  const gfarf = scene.make.graphics({ add: false });
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const wobble = (hashNoise(y, 22, 0) - 0.5) * 0.05;
    const tw = Phaser.Math.Clamp(t + wobble, 0, 1);
    const r = Math.floor(Phaser.Math.Linear(6, 2, tw));
    const gg = Math.floor(Phaser.Math.Linear(14, 4, tw));
    const b = Math.floor(Phaser.Math.Linear(12, 6, tw));
    gfarf.fillStyle((r << 16) | (gg << 8) | b);
    gfarf.fillRect(0, y, W, 1);
  }
  gfarf.fillStyle(0x081820);
  gfarf.fillEllipse(200, 400, 300, 120);
  gfarf.fillEllipse(650, 420, 280, 100);
  gfarf.fillStyle(0x102818);
  gfarf.setAlpha(0.4);
  gfarf.fillRect(0, H - 100, W, 100);
  gfarf.setAlpha(1);
  fringeParallaxSilhouettes(gfarf, W, H, 52, 0x061410, 0.08);
  enrichParallaxSurface(gfarf, W, H, 202, { darkStr: 0.022, hiStr: 0.016, hiCount: 420 });
  gfarf.generateTexture('bg_far_fungal', W, H);
  gfarf.destroy();

  // --- Crystal / Chozo vibes: cool purple-teal cavern ---
  const gfarc = scene.make.graphics({ add: false });
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const wobble = (hashNoise(y, 33, 0) - 0.5) * 0.048;
    const tw = Phaser.Math.Clamp(t + wobble, 0, 1);
    const r = Math.floor(Phaser.Math.Linear(10, 3, tw));
    const gg = Math.floor(Phaser.Math.Linear(6, 2, tw));
    const b = Math.floor(Phaser.Math.Linear(24, 10, tw));
    gfarc.fillStyle((r << 16) | (gg << 8) | b);
    gfarc.fillRect(0, y, W, 1);
  }
  gfarc.fillStyle(0x0a0a18);
  gfarc.fillTriangle(0, H, 220, 200, 480, H);
  gfarc.fillTriangle(400, H, 640, 160, 960, H);
  gfarc.fillStyle(TEAL_DARK);
  gfarc.setAlpha(0.12);
  gfarc.fillTriangle(180, H, 240, 260, 300, H);
  gfarc.fillTriangle(600, H, 680, 240, 760, H);
  gfarc.setAlpha(1);
  fringeParallaxSilhouettes(gfarc, W, H, 63, 0x0a0818, 0.07);
  enrichParallaxSurface(gfarc, W, H, 303, { darkStr: 0.024, hiStr: 0.018 });
  gfarc.generateTexture('bg_far_crystal', W, H);
  gfarc.destroy();

  // --- Mid cavern: massive rock pillars + broken bridge shapes ---
  const gmid = scene.make.graphics({ add: false });
  gmid.fillStyle(0x140e08);
  gmid.fillRect(0, 0, W, H);
  const pillars = [[40, 120, 36], [220, 90, 32], [420, 140, 38], [620, 70, 34], [820, 110, 40]];
  for (const [px, pt, pw] of pillars) {
    gmid.fillStyle(0x1a1408);
    gmid.fillRect(px, pt, pw, H - pt);
    gmid.fillStyle(0x8a7848);
    gmid.setAlpha(0.1);
    gmid.fillRect(px + 4, pt, 4, H - pt);
    gmid.setAlpha(1);
    gmid.fillStyle(0x2a1c10);
    gmid.fillRect(px - 4, pt - 20, pw + 8, 24);
  }
  gmid.fillStyle(0x1a1408);
  gmid.fillRect(30, 280, 200, 16);
  gmid.fillRect(500, 320, 180, 14);
  gmid.fillRect(720, 260, 160, 12);
  gmid.fillStyle(0x2a1c10);
  gmid.setAlpha(0.5);
  gmid.fillEllipse(480, H + 40, 900, 100);
  gmid.setAlpha(1);
  enrichParallaxSurface(gmid, W, H, 404, { darkStr: 0.032, hiStr: 0.01, hiCount: 360, step: 5 });
  gmid.generateTexture('bg_mid_cavern', W, H);
  gmid.destroy();

  // --- Mid fungal: organic stalks + lantern glows ---
  const gmidf = scene.make.graphics({ add: false });
  gmidf.fillStyle(0x0c1208);
  gmidf.fillRect(0, 0, W, H);
  for (let i = 0; i < 20; i++) {
    const x = 20 + (i * 47) % 900;
    const h = 120 + (i % 7) * 25;
    gmidf.fillStyle(0x0a1808);
    gmidf.fillEllipse(x, H - 40, 18, h);
  }
  enrichParallaxSurface(gmidf, W, H, 505, { darkStr: 0.03, hiStr: 0.013, hiCount: 400 });
  gmidf.generateTexture('bg_mid_fungal', W, H);
  gmidf.destroy();
}

function generateAtmosphereTextures(scene) {
  const W = 960;
  const H = 540;
  const g = scene.make.graphics({ add: false });
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const a = Math.pow(t, 1.55) * 0.56;
    g.fillStyle(0x020210, a);
    g.fillRect(0, y, W, 1);
  }
  g.generateTexture('bg_fog_mist', W, H);
  g.destroy();

  const v = scene.make.graphics({ add: false });
  const cx = W / 2;
  const cy = H / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < H; y += 3) {
    for (let x = 0; x < W; x += 3) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const a = Math.pow(d, 2.0) * 0.52;
      if (a > 0.02) {
        v.fillStyle(0x000000, a);
        v.fillRect(x, y, 3, 3);
      }
    }
  }
  v.generateTexture('screen_vignette', W, H);
  v.destroy();
}

/** Sky + alpine peaks — desaturated / cooler so foreground teal gameplay reads clearly */
function generateMountainParallaxTextures(scene) {
  const W = 960;
  const H = 540;

  // Sky: dark earthy cavern ceiling
  const gsky = scene.make.graphics({ add: false });
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const wobble = (hashNoise(y, 77, 0) - 0.5) * 0.05;
    const tw = Phaser.Math.Clamp(t + wobble, 0, 1);
    const r = Math.floor(Phaser.Math.Linear(18, 6, tw));
    const gg = Math.floor(Phaser.Math.Linear(14, 4, tw));
    const b = Math.floor(Phaser.Math.Linear(10, 2, tw));
    const col = (r << 16) | (gg << 8) | b;
    gsky.fillStyle(col);
    gsky.fillRect(0, y, W, 1);
  }
  gsky.fillStyle(0x6a5838);
  gsky.setAlpha(0.04);
  gsky.fillCircle(680, 100, 50);
  gsky.setAlpha(1);
  enrichParallaxSurface(gsky, W, H, 606, { darkStr: 0.02, hiStr: 0.011, hiCount: 320 });
  gsky.generateTexture('bg_sky_mountain', W, H);
  gsky.destroy();

  // Far peaks — cool grey only, minimal bright snow (no “UI white”)
  const gfar = scene.make.graphics({ add: false });
  gfar.fillStyle(0x100c06);
  gfar.fillRect(0, 0, W, H);
  const peaks = [
    [0, H, 80, 180, 160, H],
    [120, H, 260, 120, 400, H],
    [340, H, 520, 90, 700, H],
    [600, H, 780, 140, 960, H],
  ];
  for (const p of peaks) {
    gfar.fillTriangle(p[0], p[1], p[2], p[3], p[4], p[5]);
  }
  gfar.fillStyle(0x7a6848);
  gfar.setAlpha(0.05);
  gfar.fillTriangle(100, 200, 260, 120, 280, 210);
  gfar.fillTriangle(500, 170, 520, 90, 540, 180);
  gfar.fillTriangle(700, 200, 780, 140, 820, 210);
  gfar.setAlpha(1);
  gfar.fillStyle(0x3a2818);
  gfar.setAlpha(0.05);
  gfar.fillRect(0, 300, W, 100);
  gfar.setAlpha(1);
  fringeParallaxSilhouettes(gfar, W, H, 88, 0x181208, 0.07);
  enrichParallaxSurface(gfar, W, H, 707, { darkStr: 0.025, hiStr: 0.012 });
  gfar.generateTexture('bg_far_mountain', W, H);
  gfar.destroy();

  // Mid — darker, lower contrast vs playfield
  const gmid = scene.make.graphics({ add: false });
  gmid.fillStyle(0x140e08);
  gmid.fillTriangle(0, H, 200, 280, 420, H);
  gmid.fillTriangle(380, H, 600, 240, 820, H);
  gmid.fillTriangle(700, H, 880, 300, 960, H);
  gmid.fillStyle(0x100c06);
  for (let i = 0; i < 18; i++) {
    const x = 30 + i * 52 + (i % 3) * 8;
    const h = 60 + (i % 5) * 14;
    gmid.fillTriangle(x, H, x - 14, H - h, x + 14, H - h);
  }
  gmid.fillStyle(0x0a0804);
  gmid.fillRect(0, H - 48, W, 48);
  enrichParallaxSurface(gmid, W, H, 808, { darkStr: 0.03, hiStr: 0.01, hiCount: 340, step: 5 });
  gmid.generateTexture('bg_mid_mountain', W, H);
  gmid.destroy();
}

function generateUITextures(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(TEAL);
  g.fillCircle(12, 12, 11);
  g.fillStyle(TEAL_GLOW);
  g.fillCircle(9, 8, 4);
  g.fillStyle(0xffffff);
  g.setAlpha(0.4);
  g.fillCircle(8, 7, 2);
  g.setAlpha(1);
  g.generateTexture('health_orb', 24, 24);
  g.destroy();

  const g2 = scene.make.graphics({ add: false });
  g2.lineStyle(2, TEAL_DARK, 0.5);
  g2.strokeCircle(12, 12, 11);
  g2.generateTexture('health_orb_empty', 24, 24);
  g2.destroy();

  const g3 = scene.make.graphics({ add: false });
  g3.fillStyle(TEAL, 0.8);
  g3.fillRoundedRect(0, 0, 48, 8, 4);
  g3.generateTexture('dash_bar_full', 48, 8);
  g3.destroy();

  const g4 = scene.make.graphics({ add: false });
  g4.fillStyle(SHADOW_LIGHT, 0.5);
  g4.fillRoundedRect(0, 0, 48, 8, 4);
  g4.generateTexture('dash_bar_empty', 48, 8);
  g4.destroy();

  // Map icon (scroll/parchment look)
  const gm = scene.make.graphics({ add: false });
  const mw = 28, mh = 28;
  // Parchment background
  gm.fillStyle(0x8a7858, 0.9);
  gm.fillRoundedRect(3, 4, 22, 20, 3);
  gm.fillStyle(0xa8956a, 0.8);
  gm.fillRoundedRect(5, 6, 18, 16, 2);
  // Grid lines (map markings)
  gm.lineStyle(1, 0x665538, 0.6);
  gm.lineBetween(8, 10, 22, 10);
  gm.lineBetween(8, 14, 22, 14);
  gm.lineBetween(8, 18, 22, 18);
  gm.lineBetween(12, 7, 12, 20);
  gm.lineBetween(18, 7, 18, 20);
  // "You are here" dot
  gm.fillStyle(0x44ff66);
  gm.fillCircle(14, 14, 2.5);
  // Scroll rolls top + bottom
  gm.fillStyle(0x7a6848);
  gm.fillRoundedRect(2, 2, 24, 4, 2);
  gm.fillRoundedRect(2, 22, 24, 4, 2);
  gm.generateTexture('map_icon', mw, mh);
  gm.destroy();
}

function generateOrbTexture(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(TEAL_GLOW);
  g.setAlpha(0.2);
  g.fillCircle(20, 20, 20);
  g.setAlpha(1);
  g.fillStyle(TEAL_GLOW);
  g.fillCircle(20, 20, 12);
  g.fillStyle(TEAL_BRIGHT);
  g.fillCircle(20, 20, 7);
  g.fillStyle(0xffffff);
  g.fillCircle(20, 20, 3);
  g.generateTexture('ability_orb', 40, 40);
  g.destroy();

  const g2 = scene.make.graphics({ add: false });
  g2.fillStyle(TEAL);
  g2.fillCircle(10, 10, 8);
  g2.fillStyle(TEAL_GLOW);
  g2.fillCircle(8, 7, 3);
  g2.fillStyle(0xffffff);
  g2.fillCircle(8, 7, 1.5);
  g2.generateTexture('health_pickup', 20, 20);
  g2.destroy();

  generateChestTextures(scene);
}

function generateChestTextures(scene) {
  const CW = 40, CH = 36;

  // --- Closed chest ---
  const gc = scene.make.graphics({ add: false });
  // Body
  gc.fillStyle(0x5a3818);
  gc.fillRoundedRect(4, 14, 32, 20, 3);
  gc.fillStyle(0x7a4c20);
  gc.fillRoundedRect(6, 16, 28, 16, 2);
  // Dark bottom edge
  gc.fillStyle(0x3a2010);
  gc.fillRect(4, 30, 32, 4);
  // Lid (curved top)
  gc.fillStyle(0x6a4018);
  gc.fillRoundedRect(3, 10, 34, 10, { tl: 6, tr: 6, bl: 0, br: 0 });
  gc.fillStyle(0x8a5828);
  gc.fillRoundedRect(5, 11, 30, 7, { tl: 5, tr: 5, bl: 0, br: 0 });
  // Metal bands
  gc.fillStyle(CROWN_GOLD);
  gc.fillRect(4, 19, 32, 3);
  gc.fillRect(18, 14, 4, 20);
  // Lock / clasp
  gc.fillStyle(CROWN_BRIGHT);
  gc.fillCircle(20, 20, 3.5);
  gc.fillStyle(CROWN_DARK);
  gc.fillCircle(20, 20, 2);
  // Highlight on lid
  gc.fillStyle(0xffffff);
  gc.setAlpha(0.12);
  gc.fillRoundedRect(6, 11, 14, 5, { tl: 4, tr: 2, bl: 0, br: 0 });
  gc.setAlpha(1);
  // Shadow bottom
  gc.fillStyle(0x000000);
  gc.setAlpha(0.25);
  gc.fillEllipse(20, 35, 30, 5);
  gc.setAlpha(1);
  gc.generateTexture('chest_closed', CW, CH);
  gc.destroy();

  // --- Open chest ---
  const go = scene.make.graphics({ add: false });
  // Body (same)
  go.fillStyle(0x5a3818);
  go.fillRoundedRect(4, 18, 32, 16, 3);
  go.fillStyle(0x7a4c20);
  go.fillRoundedRect(6, 20, 28, 12, 2);
  go.fillStyle(0x3a2010);
  go.fillRect(4, 30, 32, 4);
  // Inside glow (visible because lid is open)
  go.fillStyle(EYE_GREEN);
  go.setAlpha(0.35);
  go.fillRoundedRect(8, 18, 24, 10, 2);
  go.setAlpha(1);
  go.fillStyle(TEAL_GLOW);
  go.setAlpha(0.2);
  go.fillCircle(20, 16, 12);
  go.setAlpha(1);
  // Lid — tilted back (drawn as a flat shape above)
  go.fillStyle(0x6a4018);
  go.fillRoundedRect(2, 4, 36, 8, { tl: 6, tr: 6, bl: 0, br: 0 });
  go.fillStyle(0x8a5828);
  go.fillRoundedRect(4, 5, 32, 5, { tl: 5, tr: 5, bl: 0, br: 0 });
  // Lid inner face
  go.fillStyle(0x4a2810);
  go.fillRect(4, 10, 32, 4);
  // Metal bands
  go.fillStyle(CROWN_GOLD);
  go.fillRect(4, 23, 32, 2);
  go.fillRect(18, 18, 4, 16);
  // Band on lid
  go.fillStyle(CROWN_GOLD);
  go.fillRect(18, 4, 4, 8);
  // Sparkle particles above
  go.fillStyle(TEAL_GLOW);
  go.fillCircle(14, 10, 1.5);
  go.fillCircle(26, 8, 1.2);
  go.fillCircle(20, 5, 1.8);
  go.fillStyle(0xffffff);
  go.fillCircle(16, 6, 0.8);
  go.fillCircle(24, 4, 0.6);
  // Shadow bottom
  go.fillStyle(0x000000);
  go.setAlpha(0.25);
  go.fillEllipse(20, 35, 30, 5);
  go.setAlpha(1);
  go.generateTexture('chest_open', CW, CH);
  go.destroy();
}

/** Standing rest pod — two layers so player depth sits “inside” the capsule */
function generateRestPodTextures(scene) {
  const PW = 80;
  const PH = 96;

  // --- Back: floor, interior shadow, ambient glow (drawn behind player) ---
  const back = scene.make.graphics({ add: false });
  back.fillStyle(TEAL_GLOW, 0.06);
  back.fillEllipse(40, 52, 52, 70);
  back.fillStyle(0x060a10);
  back.fillEllipse(40, 54, 44, 58);
  back.fillStyle(0x0c1420);
  back.fillEllipse(40, 56, 38, 48);
  // Floor plate
  back.fillStyle(0x1e2838);
  back.fillRoundedRect(2, 86, 76, 8, 2);
  back.fillStyle(0x2a384c);
  back.fillRoundedRect(4, 88, 72, 4, 1);
  back.lineStyle(1, TEAL_GLOW, 0.35);
  back.lineBetween(8, 90, 72, 90);
  back.fillStyle(TEAL_GLOW, 0.12);
  back.fillRect(12, 91, 56, 2);
  // Inner wall rim
  back.lineStyle(1.5, TEAL, 0.2);
  back.strokeEllipse(40, 54, 40, 52);
  back.generateTexture('rest_pod_back', PW, PH);
  back.destroy();

  // --- Front: side columns + top shell only (center stays transparent) ---
  const fr = scene.make.graphics({ add: false });
  // Left column
  fr.fillStyle(0x2a3444);
  fr.fillRoundedRect(2, 28, 20, 66, 6);
  fr.lineStyle(2, 0x3d4d64, 1);
  fr.strokeRoundedRect(2, 28, 20, 66, 6);
  fr.lineStyle(1, TEAL_GLOW, 0.45);
  fr.lineBetween(18, 34, 18, 88);
  // Right column
  fr.fillStyle(0x2a3444);
  fr.fillRoundedRect(58, 28, 20, 66, 6);
  fr.lineStyle(2, 0x3d4d64, 1);
  fr.strokeRoundedRect(58, 28, 20, 66, 6);
  fr.lineStyle(1, TEAL_GLOW, 0.45);
  fr.lineBetween(62, 34, 62, 88);
  // Top corner caps (open center 24–56)
  fr.fillStyle(0x323c50);
  fr.fillRoundedRect(6, 20, 22, 16, 4);
  fr.fillRoundedRect(52, 20, 22, 16, 4);
  fr.lineStyle(2, TEAL_GLOW, 0.5);
  fr.beginPath();
  fr.arc(40, 28, 22, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(-20), false);
  fr.strokePath();
  // Accent lights
  fr.fillStyle(TEAL_BRIGHT, 0.9);
  fr.fillCircle(12, 58, 2.5);
  fr.fillCircle(68, 58, 2.5);
  fr.fillStyle(TEAL_GLOW, 0.35);
  fr.fillCircle(12, 58, 5);
  fr.fillCircle(68, 58, 5);
  fr.generateTexture('rest_pod_front', PW, PH);
  fr.destroy();
}

function generateParticleTexture(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(TEAL_GLOW);
  g.fillCircle(3, 3, 3);
  g.generateTexture('particle_teal', 6, 6);
  g.destroy();

  const g2 = scene.make.graphics({ add: false });
  g2.fillStyle(0xffffff);
  g2.fillCircle(3, 3, 3);
  g2.generateTexture('particle_white', 6, 6);
  g2.destroy();

  const g3 = scene.make.graphics({ add: false });
  g3.fillStyle(0x888899);
  g3.fillCircle(2, 2, 2);
  g3.generateTexture('particle_dust', 4, 4);
  g3.destroy();

  // Drip particle
  const g4 = scene.make.graphics({ add: false });
  g4.fillStyle(0x445566);
  g4.fillCircle(2, 2, 1.5);
  g4.fillRect(1, 0, 2, 3);
  g4.generateTexture('particle_drip', 4, 4);
  g4.destroy();
}

function generateDoorTexture(scene) {
  const PW = 36;
  const PH = 60;
  const g = scene.make.graphics({ add: false });
  const cx = PW / 2;
  const cy = PH / 2 + 2;

  for (let i = 0; i < 4; i++) {
    g.fillStyle(TEAL_GLOW, 0.05 + i * 0.03);
    g.fillEllipse(cx, cy, PW - 4 + i * 5, PH - 6 + i * 6);
  }

  g.fillStyle(0x1a0a2a, 0.5);
  g.fillEllipse(cx, cy, PW - 4, PH - 8);

  g.lineStyle(4, TEAL_BRIGHT, 0.9);
  g.strokeEllipse(cx, cy, PW - 8, PH - 14);
  g.lineStyle(2, 0xffffff, 0.4);
  g.strokeEllipse(cx, cy, PW - 12, PH - 20);
  g.lineStyle(3, TEAL_DARK, 0.95);
  g.strokeEllipse(cx, cy, PW - 16, PH - 26);

  g.fillStyle(0x030510, 0.98);
  g.fillEllipse(cx, cy + 1, PW - 20, PH - 32);
  g.fillStyle(TEAL, 0.12);
  g.fillEllipse(cx, cy + 5, PW - 28, PH - 40);
  g.fillStyle(TEAL_GLOW, 0.08);
  g.fillEllipse(cx, cy + 8, 10, 8);

  g.generateTexture('door', PW, PH);
  g.destroy();
}

function generateHazardTextures(scene) {
  // Obsidian moving platform (island-thick)
  const op = scene.make.graphics({ add: false });
  for (let y = 0; y < 32; y++) {
    op.fillStyle(lerpRgb(0x2a2436, 0x0a0810, y / 31));
    op.fillRect(0, y, 32, 1);
  }
  op.fillStyle(0x8a7a96);
  op.setAlpha(0.18);
  op.fillRect(2, 1, 28, 4);
  op.setAlpha(1);
  op.lineStyle(1, 0x5c3a76, 0.55);
  op.lineBetween(6, 4, 12, 24);
  op.lineBetween(16, 3, 25, 22);
  op.fillStyle(0x000000);
  op.setAlpha(0.4);
  op.fillRect(0, 26, 32, 6);
  op.setAlpha(1);
  op.lineStyle(1, 0x000000, 0.9);
  op.strokeRoundedRect(0, 0, 32, 32, 3);
  op.generateTexture('obsidian_platform', 32, 32);
  op.destroy();

  // Crumbling stone platform (island-thick)
  const cp = scene.make.graphics({ add: false });
  for (let y = 0; y < 32; y++) {
    cp.fillStyle(lerpRgb(0x4a4a56, 0x1a1a24, y / 31));
    cp.fillRect(0, y, 32, 1);
  }
  cp.fillStyle(0xffffff);
  cp.setAlpha(0.1);
  cp.fillRect(1, 1, 30, 4);
  cp.setAlpha(1);
  cp.lineStyle(1, 0x1a1a22, 0.8);
  cp.lineBetween(7, 4, 10, 24);
  cp.lineBetween(15, 3, 14, 26);
  cp.lineBetween(24, 5, 19, 26);
  cp.fillStyle(0x000000);
  cp.setAlpha(0.35);
  cp.fillRect(0, 26, 32, 6);
  cp.setAlpha(1);
  cp.lineStyle(1, 0x000000, 0.85);
  cp.strokeRoundedRect(0, 0, 32, 32, 3);
  cp.generateTexture('crumble_platform', 32, 32);
  cp.destroy();

  // Pendulum anchor
  const pa = scene.make.graphics({ add: false });
  pa.fillStyle(0x181820);
  pa.fillCircle(8, 8, 8);
  pa.fillStyle(0x2c2c38);
  pa.fillCircle(8, 8, 5);
  pa.lineStyle(1, 0x000000, 0.7);
  pa.strokeCircle(8, 8, 8);
  pa.generateTexture('pendulum_anchor', 16, 16);
  pa.destroy();

  // Pendulum blade
  const pb = scene.make.graphics({ add: false });
  pb.fillStyle(0x1e1e26);
  pb.fillTriangle(2, 0, 14, 0, 8, 28);
  pb.fillStyle(0x9098aa);
  pb.setAlpha(0.25);
  pb.fillTriangle(4, 1, 10, 1, 8, 20);
  pb.setAlpha(1);
  pb.fillStyle(0x000000);
  pb.setAlpha(0.3);
  pb.fillRect(5, 18, 6, 10);
  pb.setAlpha(1);
  pb.lineStyle(1, 0xaa3030, 0.8);
  pb.lineBetween(8, 4, 8, 22);
  pb.lineStyle(1, 0x000000, 0.9);
  pb.strokeTriangle(2, 0, 14, 0, 8, 28);
  pb.generateTexture('pendulum_blade', 16, 28);
  pb.destroy();

  // Spike wall panel
  const sw = scene.make.graphics({ add: false });
  sw.fillStyle(0x101018);
  sw.fillRect(0, 0, 32, 32);
  sw.fillStyle(0x2e2e3a);
  for (let i = 0; i < 4; i++) {
    const y = 4 + i * 7;
    sw.fillTriangle(0, y, 20, y + 3, 0, y + 6);
  }
  sw.fillStyle(0xaa2222);
  sw.setAlpha(0.4);
  sw.fillRect(0, 0, 2, 32);
  sw.setAlpha(1);
  sw.lineStyle(1, 0x000000, 0.9);
  sw.strokeRect(0, 0, 32, 32);
  sw.generateTexture('spike_wall', 32, 32);
  sw.destroy();

  // Magma strip tile
  const mt = scene.make.graphics({ add: false });
  for (let y = 0; y < 20; y++) {
    mt.fillStyle(lerpRgb(0x2a0200, 0x120000, y / 19));
    mt.fillRect(0, y, 32, 1);
  }
  mt.fillStyle(0xff4411);
  mt.fillEllipse(8, 8, 12, 6);
  mt.fillEllipse(22, 10, 14, 7);
  mt.fillStyle(0xffaa33);
  mt.setAlpha(0.6);
  mt.fillEllipse(10, 7, 6, 3);
  mt.fillEllipse(24, 9, 7, 3);
  mt.setAlpha(1);
  mt.fillStyle(0x000000);
  mt.setAlpha(0.28);
  mt.fillRect(0, 14, 32, 6);
  mt.setAlpha(1);
  mt.generateTexture('magma_tile', 32, 20);
  mt.destroy();

  // Ground detail: muddy patch (non-colliding decal)
  const mud = scene.make.graphics({ add: false });
  mud.fillStyle(0x16120e);
  mud.fillEllipse(24, 10, 46, 18);
  mud.fillStyle(0x201a14);
  mud.fillEllipse(26, 10, 34, 12);
  mud.fillStyle(0x5a4a34);
  mud.setAlpha(0.16);
  mud.fillEllipse(30, 8, 16, 5);
  mud.fillEllipse(18, 11, 10, 4);
  mud.setAlpha(1);
  mud.generateTexture('mud_patch', 48, 20);
  mud.destroy();

  // Ground detail: loose gravel
  const grav = scene.make.graphics({ add: false });
  grav.fillStyle(0x14161a);
  grav.fillRect(0, 9, 44, 8);
  grav.fillStyle(0x2a2e35);
  for (let i = 0; i < 20; i++) {
    const x = (i * 13) % 42;
    const y = 9 + (i % 6);
    grav.fillCircle(x + 1, y, 1 + (i % 2) * 0.4);
  }
  grav.fillStyle(0x707884);
  grav.setAlpha(0.22);
  grav.fillCircle(7, 10, 1.2);
  grav.fillCircle(20, 12, 1.2);
  grav.fillCircle(35, 11, 1.2);
  grav.setAlpha(1);
  grav.generateTexture('gravel_patch', 44, 18);
  grav.destroy();

  // Strong cinematic beam for tomb/forest mood
  const beam = scene.make.graphics({ add: false });
  beam.fillStyle(0xffe8b0);
  beam.setAlpha(0.14);
  beam.fillTriangle(0, 0, 72, 0, 36, 160);
  beam.setAlpha(0.08);
  beam.fillTriangle(10, 0, 62, 0, 36, 158);
  beam.setAlpha(1);
  beam.generateTexture('tomb_light_beam', 72, 160);
  beam.destroy();
}

/**
 * Sandro Maglione–style depth: close background (no outline, scrolls with stage),
 * foreground margin décor, subtle hero light.
 * @see https://www.sandromaglione.com/articles/pixel-art-platformer-level-design-full-guide
 */
function generateDepthLayersTextures(scene) {
  const mkClose = (key, base, accent, motif) => {
    const g = scene.make.graphics({ add: false });
    g.fillStyle(base);
    g.fillRect(0, 0, 64, 64);

    // Strong wall pattern so close-background separation is obvious.
    for (let y = 0; y < 64; y += 8) {
      g.fillStyle(lerpRgb(base, accent, 0.28 + ((y / 8) % 2) * 0.12));
      g.fillRect(0, y, 64, 7);
      g.fillStyle(0x000000);
      g.setAlpha(0.18);
      g.fillRect(0, y + 7, 64, 1);
      g.setAlpha(1);
    }

    for (let i = 0; i < 24; i++) {
      const x = 2 + (i * 13) % 60;
      const y = 2 + (i * 17) % 60;
      g.fillStyle(accent);
      g.setAlpha(0.08 + (i % 3) * 0.03);
      g.fillRect(x, y, 4 + (i % 3), 3 + (i % 2));
      g.setAlpha(1);
    }

    if (motif === 'fungal') {
      g.fillStyle(0x1c3c26);
      g.setAlpha(0.35);
      g.fillEllipse(10, 18, 14, 7);
      g.fillEllipse(34, 26, 18, 8);
      g.fillEllipse(50, 40, 15, 7);
      g.setAlpha(1);
    } else if (motif === 'crystal') {
      g.fillStyle(0x383c6a);
      g.setAlpha(0.34);
      g.fillTriangle(8, 62, 14, 46, 22, 62);
      g.fillTriangle(28, 62, 35, 42, 44, 62);
      g.fillTriangle(46, 62, 52, 48, 60, 62);
      g.setAlpha(1);
    } else if (motif === 'mountain') {
      g.fillStyle(0x3a2818);
      g.setAlpha(0.32);
      g.fillTriangle(0, 62, 12, 44, 24, 62);
      g.fillTriangle(18, 62, 34, 40, 52, 62);
      g.fillTriangle(44, 62, 56, 46, 64, 62);
      g.setAlpha(1);
    }

    g.generateTexture(key, 64, 64);
    g.destroy();
  };
  mkClose('bg_close_cavern', 0x1c1408, 0x3a2818, 'cavern');
  mkClose('bg_close_fungal', 0x141c0c, 0x2a4620, 'fungal');
  mkClose('bg_close_crystal', 0x1a1020, 0x3a3860, 'crystal');
  mkClose('bg_close_mountain', 0x2a2018, 0x4a3828, 'mountain');

  const fg = scene.make.graphics({ add: false });
  fg.fillStyle(0x060a08);
  for (let i = 0; i < 5; i++) {
    const ox = i * 7;
    fg.fillTriangle(ox + 2, 28, ox + 8, 28, ox + 5, 6 + (i % 3) * 2);
  }
  fg.fillStyle(0x1a3020);
  fg.setAlpha(0.85);
  fg.fillRect(0, 24, 40, 4);
  fg.setAlpha(1);
  fg.lineStyle(1, 0x000000, 0.5);
  for (let i = 0; i < 5; i++) {
    const ox = i * 7;
    fg.lineBetween(ox + 2, 28, ox + 5, 8);
    fg.lineBetween(ox + 8, 28, ox + 5, 8);
  }
  fg.generateTexture('fg_grass_clump', 40, 28);
  fg.destroy();

  const branch = scene.make.graphics({ add: false });
  branch.fillStyle(0x090c12);
  branch.fillRect(0, 0, 96, 14);
  branch.fillStyle(0x182030);
  branch.setAlpha(0.65);
  branch.fillRect(0, 1, 96, 4);
  branch.setAlpha(1);
  branch.fillStyle(0x0f2a1a);
  for (let i = 0; i < 10; i++) {
    const x = 4 + i * 9;
    branch.fillTriangle(x, 12, x + 4, 20 + (i % 3), x + 8, 12);
  }
  branch.generateTexture('fg_branch_strip', 96, 28);
  branch.destroy();

  const rim = scene.make.graphics({ add: false });
  const cx = 64;
  const cy = 64;
  for (let r = 56; r > 0; r -= 2) {
    const t = r / 56;
    rim.fillStyle(lerpRgb(0x4488aa, 0xaaffee, 0.4), (1 - t) * 0.14);
    rim.fillCircle(cx, cy, r);
  }
  rim.generateTexture('player_rim_light', 128, 128);
  rim.destroy();

  // --- Foreground rock formation (placed at screen margins, overlaps player) ---
  // Guide: foreground must be visible but not distract; darker than main, lighter than void
  const fgRock = scene.make.graphics({ add: false });
  fgRock.fillStyle(0x3a2818);
  fgRock.beginPath();
  fgRock.moveTo(0, 80); fgRock.lineTo(0, 14); fgRock.lineTo(14, 4);
  fgRock.lineTo(30, 12); fgRock.lineTo(44, 0); fgRock.lineTo(60, 10);
  fgRock.lineTo(72, 26); fgRock.lineTo(80, 50); fgRock.lineTo(74, 80);
  fgRock.closePath(); fgRock.fillPath();
  // Lit left face
  fgRock.fillStyle(0x5a4830);
  fgRock.beginPath();
  fgRock.moveTo(0, 14); fgRock.lineTo(14, 4); fgRock.lineTo(30, 12);
  fgRock.lineTo(18, 42); fgRock.lineTo(0, 52);
  fgRock.closePath(); fgRock.fillPath();
  // Shadow right face
  fgRock.fillStyle(0x1a1008);
  fgRock.beginPath();
  fgRock.moveTo(44, 0); fgRock.lineTo(60, 10); fgRock.lineTo(72, 26);
  fgRock.lineTo(80, 50); fgRock.lineTo(74, 80); fgRock.lineTo(48, 80);
  fgRock.closePath(); fgRock.fillPath();
  // Edge highlight
  fgRock.lineStyle(1, 0x7a6848, 0.5);
  fgRock.beginPath();
  fgRock.moveTo(0, 14); fgRock.lineTo(14, 4); fgRock.lineTo(30, 12);
  fgRock.lineTo(44, 0); fgRock.lineTo(60, 10);
  fgRock.strokePath();
  fgRock.generateTexture('fg_rock_formation', 80, 80);
  fgRock.destroy();

  // Smaller foreground rock
  const fgRockSm = scene.make.graphics({ add: false });
  fgRockSm.fillStyle(0x1e2434);
  fgRockSm.beginPath();
  fgRockSm.moveTo(0, 48); fgRockSm.lineTo(0, 12); fgRockSm.lineTo(10, 3);
  fgRockSm.lineTo(24, 0); fgRockSm.lineTo(36, 8); fgRockSm.lineTo(40, 28);
  fgRockSm.lineTo(38, 48);
  fgRockSm.closePath(); fgRockSm.fillPath();
  fgRockSm.fillStyle(0x5a4830);
  fgRockSm.fillRect(0, 8, 16, 30);
  fgRockSm.fillStyle(0x0c1018);
  fgRockSm.fillRect(22, 0, 18, 48);
  fgRockSm.lineStyle(1, 0x7a6848, 0.45);
  fgRockSm.lineBetween(0, 12, 10, 3);
  fgRockSm.lineBetween(10, 3, 24, 0);
  fgRockSm.generateTexture('fg_rock_formation_sm', 40, 48);
  fgRockSm.destroy();

  // Foreground torch bracket — warm glow overlaps scene
  const fgTorch = scene.make.graphics({ add: false });
  fgTorch.fillStyle(0x2a2838);
  fgTorch.fillRect(0, 18, 8, 28);
  fgTorch.fillStyle(0x3a384a);
  fgTorch.fillRect(1, 16, 16, 6);
  // Outer glow
  fgTorch.fillStyle(0xff6622);
  fgTorch.setAlpha(0.2);
  fgTorch.fillCircle(10, 10, 16);
  fgTorch.setAlpha(0.45);
  fgTorch.fillCircle(10, 10, 10);
  fgTorch.setAlpha(1);
  // Flame core
  fgTorch.fillStyle(0xffaa44);
  fgTorch.fillEllipse(10, 10, 8, 14);
  fgTorch.fillStyle(0xffdd88);
  fgTorch.fillEllipse(10, 8, 4, 8);
  fgTorch.fillStyle(0xffffff);
  fgTorch.setAlpha(0.6);
  fgTorch.fillEllipse(10, 7, 2, 4);
  fgTorch.setAlpha(1);
  fgTorch.generateTexture('fg_torch_bracket', 28, 48);
  fgTorch.destroy();

  // Large foreground mushroom cap for fungal rooms
  const fgMush = scene.make.graphics({ add: false });
  fgMush.fillStyle(0x0c1a10);
  fgMush.fillRect(18, 30, 12, 18);
  fgMush.fillStyle(0x1a3020);
  fgMush.fillEllipse(24, 22, 48, 34);
  fgMush.fillStyle(TEAL_DARK);
  fgMush.setAlpha(0.45);
  fgMush.fillEllipse(24, 18, 38, 24);
  fgMush.setAlpha(1);
  fgMush.fillStyle(TEAL_GLOW);
  fgMush.setAlpha(0.15);
  fgMush.fillEllipse(20, 16, 18, 12);
  fgMush.setAlpha(1);
  fgMush.fillStyle(0x060c08);
  fgMush.fillEllipse(24, 28, 44, 12);
  fgMush.lineStyle(1, TEAL_DARK, 0.35);
  fgMush.strokeEllipse(24, 22, 46, 32);
  fgMush.generateTexture('fg_mushroom_large', 48, 48);
  fgMush.destroy();

  // Large foreground crystal shard
  const fgCrys = scene.make.graphics({ add: false });
  fgCrys.fillStyle(0x1a1248);
  fgCrys.fillTriangle(18, 0, 0, 72, 36, 72);
  // Lit face
  fgCrys.fillStyle(0x2a2068);
  fgCrys.fillTriangle(18, 6, 6, 64, 18, 64);
  // Shadow face
  fgCrys.fillStyle(0x0c0828);
  fgCrys.fillTriangle(18, 6, 18, 64, 32, 64);
  // Inner glow
  fgCrys.fillStyle(TEAL_GLOW);
  fgCrys.setAlpha(0.2);
  fgCrys.fillTriangle(18, 14, 10, 50, 26, 50);
  fgCrys.setAlpha(1);
  // Bright edge
  fgCrys.lineStyle(1, 0x6688cc, 0.6);
  fgCrys.lineBetween(18, 0, 0, 72);
  fgCrys.lineBetween(18, 0, 36, 72);
  fgCrys.generateTexture('fg_crystal_large', 36, 72);
  fgCrys.destroy();

  // Foreground broken pillar fragment
  const fgPil = scene.make.graphics({ add: false });
  for (let y = 0; y < 72; y++) {
    fgPil.fillStyle(lerpRgb(0x4a3828, 0x2a1c10, y / 71));
    fgPil.fillRect(4, y, 28, 1);
  }
  fgPil.fillStyle(0x5a4830);
  fgPil.setAlpha(0.55);
  fgPil.fillRect(4, 0, 12, 72);
  fgPil.setAlpha(1);
  fgPil.fillStyle(0x1a1008);
  fgPil.fillRect(24, 0, 8, 72);
  // Capital (top cap)
  fgPil.fillStyle(0x4a3828);
  fgPil.fillRect(0, 0, 36, 8);
  fgPil.lineStyle(1, 0x7a6848, 0.5);
  fgPil.lineBetween(0, 8, 36, 8);
  // Broken bottom
  fgPil.fillStyle(0x2a1c10);
  fgPil.fillTriangle(4, 72, 32, 72, 22, 58);
  fgPil.fillTriangle(8, 72, 14, 56, 20, 72);
  fgPil.generateTexture('fg_pillar_fragment', 36, 72);
  fgPil.destroy();

  // Directional light shaft (wide, tapered) — visible warm beam
  const lShaft = scene.make.graphics({ add: false });
  lShaft.fillStyle(0xffeedd);
  lShaft.setAlpha(0.12);
  lShaft.fillTriangle(0, 0, 96, 0, 48, 320);
  lShaft.setAlpha(0.18);
  lShaft.fillTriangle(16, 0, 80, 0, 48, 300);
  lShaft.setAlpha(0.10);
  lShaft.fillTriangle(30, 0, 66, 0, 48, 260);
  lShaft.setAlpha(1);
  lShaft.generateTexture('light_shaft_warm', 96, 320);
  lShaft.destroy();

  const lShaftC = scene.make.graphics({ add: false });
  lShaftC.fillStyle(0xaaccff);
  lShaftC.setAlpha(0.10);
  lShaftC.fillTriangle(0, 0, 96, 0, 48, 320);
  lShaftC.setAlpha(0.15);
  lShaftC.fillTriangle(16, 0, 80, 0, 48, 300);
  lShaftC.setAlpha(0.08);
  lShaftC.fillTriangle(30, 0, 66, 0, 48, 260);
  lShaftC.setAlpha(1);
  lShaftC.generateTexture('light_shaft_cool', 96, 320);
  lShaftC.destroy();

  // Close-bg brick detail overlay — visible mortar lines + brick faces
  const cbBrick = scene.make.graphics({ add: false });
  cbBrick.fillStyle(0x181422);
  cbBrick.fillRect(0, 0, 64, 64);
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 16;
    for (let col = -1; col < 3; col++) {
      const bx = off + col * 32;
      cbBrick.fillStyle(lerpRgb(0x242038, 0x302a44, (row * 3 + col) % 5 / 4));
      cbBrick.fillRect(bx + 1, row * 16 + 1, 30, 14);
    }
    // Mortar lines
    cbBrick.fillStyle(0x0a0812);
    cbBrick.fillRect(0, row * 16, 64, 1);
  }
  // Vertical mortar
  cbBrick.fillStyle(0x0a0812);
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 16;
    for (let col = 0; col < 3; col++) {
      cbBrick.fillRect(off + col * 32, row * 16, 1, 16);
    }
  }
  cbBrick.generateTexture('cb_detail_bricks', 64, 64);
  cbBrick.destroy();

  // Close-bg root / vine network — thicker, more visible
  const cbRoot = scene.make.graphics({ add: false });
  cbRoot.lineStyle(4, 0x1a3020, 0.8);
  cbRoot.beginPath();
  cbRoot.moveTo(0, 10); cbRoot.lineTo(16, 22); cbRoot.lineTo(8, 40);
  cbRoot.lineTo(24, 52); cbRoot.lineTo(14, 64);
  cbRoot.strokePath();
  cbRoot.beginPath();
  cbRoot.moveTo(32, 0); cbRoot.lineTo(28, 20); cbRoot.lineTo(40, 34);
  cbRoot.lineTo(36, 50); cbRoot.lineTo(48, 60);
  cbRoot.strokePath();
  cbRoot.fillStyle(TEAL_DARK);
  cbRoot.setAlpha(0.4);
  cbRoot.fillCircle(16, 24, 5);
  cbRoot.fillCircle(40, 36, 4);
  cbRoot.fillCircle(24, 54, 4);
  cbRoot.setAlpha(1);
  cbRoot.fillStyle(TEAL_GLOW);
  cbRoot.setAlpha(0.12);
  cbRoot.fillCircle(16, 24, 3);
  cbRoot.fillCircle(40, 36, 2);
  cbRoot.setAlpha(1);
  cbRoot.generateTexture('cb_detail_roots', 48, 64);
  cbRoot.destroy();

  // Close-bg carved rune/symbol — brighter, more visible
  const cbRune = scene.make.graphics({ add: false });
  cbRune.lineStyle(2, 0x3a4c64, 0.65);
  cbRune.strokeCircle(16, 16, 12);
  cbRune.lineBetween(16, 4, 16, 28);
  cbRune.lineBetween(4, 16, 28, 16);
  cbRune.lineBetween(7, 7, 25, 25);
  cbRune.lineBetween(25, 7, 7, 25);
  cbRune.fillStyle(TEAL_DARK);
  cbRune.setAlpha(0.25);
  cbRune.fillCircle(16, 16, 6);
  cbRune.setAlpha(1);
  cbRune.fillStyle(TEAL_GLOW);
  cbRune.setAlpha(0.08);
  cbRune.fillCircle(16, 16, 3);
  cbRune.setAlpha(1);
  cbRune.generateTexture('cb_rune_mark', 32, 32);
  cbRune.destroy();
}

function generateNPCTextures(scene) {
  const W = 32, H = 40;

  // Old Hermit — hooded, hunched, with a staff (high contrast so he reads clearly)
  const gh = scene.make.graphics({ add: false });
  const cx = W / 2;
  // Silhouette / rim (reads against busy backgrounds)
  gh.lineStyle(3, 0x0a0604, 1);
  gh.strokeTriangle(cx - 11, 14, cx + 11, 14, cx - 13, H - 3);
  gh.strokeTriangle(cx + 11, 14, cx + 13, H - 3, cx - 13, H - 3);
  gh.lineStyle(2, 0x1a1410, 1);
  gh.strokeEllipse(cx, 12, 20, 17);
  // Robe — warmer, lighter folds
  gh.fillStyle(0x5c4430);
  gh.fillTriangle(cx - 10, 14, cx + 10, 14, cx - 12, H - 4);
  gh.fillTriangle(cx + 10, 14, cx + 12, H - 4, cx - 12, H - 4);
  gh.fillStyle(0x4a3420);
  gh.fillTriangle(cx - 6, 16, cx + 6, 16, cx - 8, H - 6);
  gh.fillTriangle(cx + 6, 16, cx + 8, H - 6, cx - 8, H - 6);
  gh.fillStyle(0x6a5844);
  gh.fillTriangle(cx - 4, 18, cx + 4, 18, cx - 5, H - 10);
  gh.fillTriangle(cx + 4, 18, cx + 5, H - 10, cx - 5, H - 10);
  // Hood
  gh.fillStyle(0x6e5a48);
  gh.fillEllipse(cx, 12, 18, 16);
  gh.fillStyle(0x4a3628);
  gh.fillEllipse(cx, 13, 14, 12);
  gh.fillStyle(0x2a1c14);
  gh.fillEllipse(cx, 13, 10, 9);
  // Eyes (brighter green)
  gh.fillStyle(0x66ff88);
  gh.fillCircle(cx - 3, 13, 2);
  gh.fillCircle(cx + 3, 13, 2);
  gh.fillStyle(0xccffdd);
  gh.fillCircle(cx - 3.2, 12.6, 0.7);
  gh.fillCircle(cx + 2.8, 12.6, 0.7);
  // Staff — wood + strong crystal
  gh.lineStyle(3, 0x2a2018);
  gh.lineBetween(cx + 12, 8, cx + 10, H - 2);
  gh.lineStyle(2.5, 0x8a7860);
  gh.lineBetween(cx + 12, 8, cx + 10, H - 2);
  gh.fillStyle(0x66ff99);
  gh.fillCircle(cx + 12, 7, 4);
  gh.fillStyle(0xaaffcc, 0.55);
  gh.fillCircle(cx + 12, 7, 7);
  gh.fillStyle(0xffffff, 0.35);
  gh.fillCircle(cx + 11, 6, 2);
  gh.generateTexture('npc_hermit', W, H);
  gh.destroy();

  // Fallen Knight — armored, kneeling/leaning
  const gk = scene.make.graphics({ add: false });
  // Armor body
  gk.fillStyle(0x555566);
  gk.fillRect(W / 2 - 8, 14, 16, 18);
  gk.fillStyle(0x666677);
  gk.fillRect(W / 2 - 6, 16, 12, 14);
  // Helmet
  gk.fillStyle(0x777788);
  gk.fillEllipse(W / 2, 10, 16, 14);
  gk.fillStyle(0x555566);
  gk.fillRect(W / 2 - 6, 10, 12, 4);
  // Visor slit
  gk.fillStyle(0x112233);
  gk.fillRect(W / 2 - 5, 10, 10, 2);
  // Blue eye glow
  gk.fillStyle(0x4488ff);
  gk.fillCircle(W / 2 - 2, 10, 1);
  gk.fillCircle(W / 2 + 2, 10, 1);
  // Shoulder pauldrons
  gk.fillStyle(0x777788);
  gk.fillEllipse(W / 2 - 10, 16, 8, 6);
  gk.fillEllipse(W / 2 + 10, 16, 8, 6);
  // Legs
  gk.fillStyle(0x444455);
  gk.fillRect(W / 2 - 6, 32, 5, 8);
  gk.fillRect(W / 2 + 1, 32, 5, 8);
  // Broken sword
  gk.lineStyle(2, 0x8899aa);
  gk.lineBetween(W / 2 + 10, 20, W / 2 + 14, 34);
  gk.generateTexture('npc_knight', W, H);
  gk.destroy();

  // Wandering Spirit — ghostly, translucent
  const gs = scene.make.graphics({ add: false });
  gs.fillStyle(0x8866cc, 0.5);
  gs.fillEllipse(W / 2, 16, 16, 20);
  gs.fillStyle(0xaa88ff, 0.3);
  gs.fillEllipse(W / 2, 14, 12, 16);
  // Trailing wispy body
  gs.fillStyle(0x8866cc, 0.25);
  gs.fillTriangle(W / 2 - 6, 22, W / 2 + 6, 22, W / 2, H);
  gs.fillStyle(0xaa88ff, 0.15);
  gs.fillTriangle(W / 2 - 3, 24, W / 2 + 3, 24, W / 2, H - 2);
  // Face
  gs.fillStyle(0xddccff, 0.7);
  gs.fillCircle(W / 2 - 3, 13, 2);
  gs.fillCircle(W / 2 + 3, 13, 2);
  gs.fillStyle(0xffffff, 0.5);
  gs.fillCircle(W / 2 - 3, 12.5, 0.8);
  gs.fillCircle(W / 2 + 3, 12.5, 0.8);
  gs.generateTexture('npc_spirit', W, H);
  gs.destroy();

  // Bone Merchant — solid silhouette (readable next to dark vignettes)
  const gm = scene.make.graphics({ add: false });
  const mx = W / 2;
  gm.lineStyle(2.5, 0x0a0604, 1);
  gm.strokeTriangle(mx - 10, 14, mx + 10, 14, mx - 12, H - 3);
  gm.strokeTriangle(mx + 10, 14, mx + 12, H - 3, mx - 12, H - 3);
  gm.strokeEllipse(mx, 10, 16, 13);
  // Tattered cloak
  gm.fillStyle(0x7a5838);
  gm.fillTriangle(mx - 9, 14, mx + 9, 14, mx - 11, H - 2);
  gm.fillTriangle(mx + 9, 14, mx + 11, H - 2, mx - 11, H - 2);
  gm.fillStyle(0x5a4020);
  gm.fillTriangle(mx - 5, 16, mx + 5, 16, mx - 7, H - 4);
  gm.fillStyle(0x8a6848);
  gm.fillTriangle(mx - 3, 18, mx + 3, 18, mx - 4, H - 8);
  // Skull head
  gm.fillStyle(0xeee4d4);
  gm.fillEllipse(mx, 10, 14, 12);
  gm.fillStyle(0xc8b8a0);
  gm.fillEllipse(mx, 11, 11, 9);
  gm.fillStyle(0x0a0404);
  gm.fillEllipse(mx - 3, 9, 4, 3);
  gm.fillEllipse(mx + 3, 9, 4, 3);
  gm.fillStyle(0xffe088);
  gm.fillCircle(mx - 3, 9, 1.4);
  gm.fillCircle(mx + 3, 9, 1.4);
  gm.lineStyle(1.5, 0x2a2018, 1);
  gm.strokeEllipse(mx, 10, 14, 12);
  // Bag
  gm.fillStyle(0x8a6848);
  gm.fillEllipse(mx + 10, 28, 10, 12);
  gm.fillStyle(0x6a4828);
  gm.fillEllipse(mx + 10, 27, 7, 8);
  gm.lineStyle(1.5, 0x1a1008, 1);
  gm.strokeEllipse(mx + 10, 28, 10, 12);
  gm.generateTexture('npc_merchant', W, H);
  gm.destroy();
}

function generateCoinTextures(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xd4a020);
  g.fillCircle(10, 10, 9);
  g.fillStyle(0xffc840);
  g.fillCircle(9, 8, 6);
  g.fillStyle(0xffe880);
  g.setAlpha(0.6);
  g.fillCircle(8, 7, 3);
  g.setAlpha(1);
  g.fillStyle(0x8a6a10);
  g.setAlpha(0.5);
  g.fillCircle(11, 12, 4);
  g.setAlpha(1);
  g.lineStyle(1.5, 0x8a6a10, 0.8);
  g.strokeCircle(10, 10, 9);
  g.fillStyle(0xd4a020);
  g.fillRect(8, 6, 4, 8);
  g.fillStyle(0xffc840);
  g.fillRect(8, 7, 4, 2);
  g.fillRect(8, 11, 4, 2);
  g.generateTexture('coin', 20, 20);
  g.destroy();

  const gi = scene.make.graphics({ add: false });
  gi.fillStyle(0xd4a020);
  gi.fillCircle(8, 8, 7);
  gi.fillStyle(0xffc840);
  gi.fillCircle(7, 7, 4.5);
  gi.fillStyle(0xffe880);
  gi.setAlpha(0.5);
  gi.fillCircle(6, 6, 2);
  gi.setAlpha(1);
  gi.lineStyle(1, 0x8a6a10, 0.7);
  gi.strokeCircle(8, 8, 7);
  gi.generateTexture('coin_icon', 16, 16);
  gi.destroy();
}

function generateTeleportTexture(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x2020a0);
  g.setAlpha(0.3);
  g.fillEllipse(24, 24, 48, 48);
  g.setAlpha(0.5);
  g.fillEllipse(24, 24, 36, 36);
  g.setAlpha(1);
  g.fillStyle(0x4466ff);
  g.setAlpha(0.4);
  g.fillEllipse(24, 24, 24, 24);
  g.setAlpha(1);
  g.fillStyle(0x88aaff);
  g.setAlpha(0.6);
  g.fillEllipse(24, 24, 12, 12);
  g.setAlpha(1);
  g.fillStyle(0xffffff);
  g.setAlpha(0.4);
  g.fillCircle(24, 24, 4);
  g.setAlpha(1);
  g.lineStyle(2, 0x4488ff, 0.6);
  g.strokeCircle(24, 24, 18);
  g.lineStyle(1, 0x88ccff, 0.4);
  g.strokeCircle(24, 24, 22);
  g.generateTexture('teleport_pad', 48, 48);
  g.destroy();
}

function generateKickTextures(scene) {
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xffaa44);
  g.setAlpha(0.7);
  g.fillEllipse(24, 16, 36, 20);
  g.fillStyle(0xff6622);
  g.setAlpha(0.5);
  g.fillEllipse(28, 16, 24, 14);
  g.setAlpha(1);
  g.fillStyle(0xffcc66);
  g.setAlpha(0.4);
  g.fillEllipse(32, 16, 12, 8);
  g.setAlpha(1);
  g.lineStyle(2, 0xff8844, 0.6);
  g.lineBetween(8, 10, 38, 14);
  g.lineBetween(8, 22, 38, 18);
  g.generateTexture('kick_effect', 48, 32);
  g.destroy();

  const gk = scene.make.graphics({ add: false });
  const cx = PW / 2;
  drawPlayerBody(gk, [
    { hipOff: -4, kneeOff: -2, footOff: 0 },
    { hipOff: 4, kneeOff: 8, footOff: 12 },
  ], -1);
  gk.generateTexture('player_kick', PW, PH);
  gk.destroy();
}
