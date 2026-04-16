import { rooms, TILE_SIZE } from './rooms.js';
import { meetsAbilityRequirements } from './abilityGates.js';
import { organicDecorRng } from './organicCaveGen.js';
import { Crawler } from '../entities/Crawler.js';
import { Flyer } from '../entities/Flyer.js';
import { Boss } from '../entities/Boss.js';
import { Brute } from '../entities/Brute.js';
import { NPC } from '../entities/NPC.js';

/**
 * Center + size (px) of the contiguous air gap at a wall/floor so door portals match the opening.
 */
function getDoorOpeningWorldBounds(room, doorCol, doorRow) {
  const tiles = room.tiles;
  if (!tiles?.length) return null;
  const H = tiles.length;
  const W = tiles[0].length;
  const TS = TILE_SIZE;

  const expandV = (openCol, seedR) => {
    if (openCol < 0 || openCol >= W) return null;
    let r = seedR;
    if (tiles[r]?.[openCol] !== 0) {
      let found = false;
      for (let d = 0; d < H && !found; d++) {
        if (r + d < H && tiles[r + d][openCol] === 0) {
          r = r + d;
          found = true;
          break;
        }
        if (r - d >= 0 && tiles[r - d][openCol] === 0) {
          r = r - d;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    let rMin = r;
    let rMax = r;
    while (rMin > 0 && tiles[rMin - 1][openCol] === 0) rMin--;
    while (rMax < H - 1 && tiles[rMax + 1][openCol] === 0) rMax++;
    const h = (rMax - rMin + 1) * TS;
    const w = TS;
    const cx = openCol * TS + TS / 2;
    const cy = rMin * TS + h / 2;
    return { cx, cy, w, h };
  };

  const expandH = (openRow, seedC) => {
    if (openRow < 0 || openRow >= H) return null;
    let c = seedC;
    if (tiles[openRow][c] !== 0) {
      let found = false;
      for (let d = 0; d < W && !found; d++) {
        if (c + d < W && tiles[openRow][c + d] === 0) {
          c = c + d;
          found = true;
          break;
        }
        if (c - d >= 0 && tiles[openRow][c - d] === 0) {
          c = c - d;
          found = true;
          break;
        }
      }
      if (!found) return null;
    }
    let cMin = c;
    let cMax = c;
    while (cMin > 0 && tiles[openRow][cMin - 1] === 0) cMin--;
    while (cMax < W - 1 && tiles[openRow][cMax + 1] === 0) cMax++;
    const w = (cMax - cMin + 1) * TS;
    const h = TS;
    const cx = cMin * TS + w / 2;
    const cy = openRow * TS + TS / 2;
    return { cx, cy, w, h };
  };

  if (doorCol <= 1) {
    const b = expandV(0, doorRow);
    if (b) return b;
  }
  if (doorCol >= W - 2) {
    const b = expandV(W - 1, doorRow);
    if (b) return b;
  }
  if (doorRow <= 3) {
    const b = expandH(0, doorCol);
    if (b) return b;
  }
  if (doorRow >= H - 4 && H >= 3) {
    const b = expandH(H - 2, doorCol);
    if (b) return b;
  }

  return null;
}

export class LevelManager {
  constructor(scene) {
    this.scene = scene;
    this.currentRoomId = null;
    this.currentRoom = null;
    this.wallLayer = null;
    this.platformGroup = null;
    this.doorZones = [];
    this.decorations = [];
    this.abilityOrbs = [];
    this.benches = [];
    this.healthPickups = [];
    this.roomLocked = false;
    this.fogParticles = null;
    this.parallaxLayers = [];
    this.dripEmitters = [];
    this.movingPlatforms = [];
    this.hazardZones = [];
    this.crumblePlatforms = [];
    this.hazardDamageCooldown = 0;
    this.npcs = [];
    this.coins = [];
    this.teleports = [];
    this.roomLockVisuals = [];
    this.roomLockTweens = [];
    /** Fixed-screen notice when entering enemy-locked rooms */
    this.roomLockNoticeText = null;
    this.roomLockNoticeTimer = null;
  }

  get roomWidth() {
    return this.currentRoom ? this.currentRoom.width : 30;
  }

  get roomHeight() {
    return this.currentRoom ? this.currentRoom.height : 17;
  }

  get roomPixelW() {
    return this.roomWidth * TILE_SIZE;
  }

  get roomPixelH() {
    return this.roomHeight * TILE_SIZE;
  }

  loadRoom(roomId, spawnX, spawnY) {
    this.clearCurrentRoom();

    let room = rooms[roomId];
    if (!room) {
      console.warn(`[LevelManager] Unknown room "${roomId}", using room1`);
      roomId = 'room1';
      room = rooms.room1;
    }
    if (!room) return;

    this.currentRoomId = roomId;
    this.currentRoom = room;
    this.roomLocked = room.locked || false;

    this.createParallaxBackground(room);
    this.buildTiles(room);
    this.spawnObjects(room);
    this.renderCloseBgDetails(room);
    this.renderForegroundElements(room);
    this.renderDirectionalLighting(room);
    this.setupCollisions();
    this.positionPlayer(room, spawnX, spawnY);
    this.showRoomName(room.name);
    this.setupAmbience(room.ambience);

    this.scene.cameras.main.setBounds(0, 0, this.roomPixelW, this.roomPixelH);
    this.scene.physics.world.setBounds(0, 0, this.roomPixelW, this.roomPixelH);

    if (this.roomLocked) {
      this.lockDoors();
    }

    this.scene.cameraRig?.applyRoom(room);
  }

  createParallaxBackground(room) {
    const rpw = room.width * TILE_SIZE;
    const rph = room.height * TILE_SIZE;
    const amb = room.ambience || 'cavern';

    const bgKeys = {
      cavern: { far: 'bg_far_cavern', mid: 'bg_mid_cavern' },
      mountain: { far: 'bg_far_cavern', mid: 'bg_mid_cavern' },
      mountain_shaft: { far: 'bg_far_cavern', mid: 'bg_mid_cavern' },
      shaft: { far: 'bg_far_cavern', mid: 'bg_mid_cavern' },
      fungal: { far: 'bg_far_fungal', mid: 'bg_mid_fungal' },
      crystal: { far: 'bg_far_crystal', mid: 'bg_mid_cavern' },
      guardian: { far: 'bg_far_crystal', mid: 'bg_mid_cavern' },
      tunnel: { far: 'bg_far_cavern', mid: 'bg_mid_cavern' },
      tunnel_fungal: { far: 'bg_far_fungal', mid: 'bg_mid_fungal' },
      tunnel_crystal: { far: 'bg_far_crystal', mid: 'bg_mid_cavern' },
      tunnel_guardian: { far: 'bg_far_crystal', mid: 'bg_mid_cavern' },
    };

    const keys = bgKeys[amb] || bgKeys.cavern;

    // Deepest sky/void layer — farthest parallax (guide: multiple BG layers)
    const skyColor = {
      cavern: 0x020108, fungal: 0x020a06, crystal: 0x06020e, guardian: 0x080210, shaft: 0x020108,
      mountain: 0x020108, mountain_shaft: 0x020108,
      tunnel: 0x010206, tunnel_fungal: 0x010504, tunnel_crystal: 0x03010a, tunnel_guardian: 0x040208,
    };
    const sky = this.scene.add.rectangle(rpw / 2, rph / 2, rpw, rph, skyColor[amb] || 0x040210);
    sky.setScrollFactor(0.01, 0.01);
    sky.setDepth(-14);
    this.parallaxLayers.push(sky);

    const far = this.scene.add.tileSprite(rpw / 2, rph / 2, rpw, rph, keys.far);
    far.setScrollFactor(0.04, 0.05);
    far.setDepth(-11);
    far.setAlpha(1);
    this.parallaxLayers.push(far);

    const mid = this.scene.add.tileSprite(rpw / 2, rph / 2, rpw, rph, keys.mid);
    mid.setScrollFactor(0.14, 0.16);
    mid.setDepth(-6);
    const midAlpha = amb.startsWith('tunnel') ? 0.56 : 0.82;
    mid.setAlpha(midAlpha);
    this.parallaxLayers.push(mid);

    this.addCloseBackgroundLayer(room);

    const mist = this.scene.add.tileSprite(rpw / 2, rph / 2, rpw, rph, 'bg_fog_mist');
    mist.setScrollFactor(0.05, 0.04);
    mist.setDepth(-5);
    let mistA = 0.56;
    if (amb === 'fungal' || amb === 'tunnel_fungal') mistA = 0.68;
    else if (amb === 'crystal' || amb === 'tunnel_crystal') mistA = 0.64;
    else if (amb.startsWith('tunnel')) mistA = 0.66;
    mist.setAlpha(mistA);
    mist.setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.parallaxLayers.push(mist);

    const tints = {
      cavern: 0x120828,
      mountain: 0x100820,
      mountain_shaft: 0x0a1020,
      shaft: 0x081028,
      fungal: 0x082818,
      crystal: 0x180828,
      guardian: 0x140820,
      tunnel: 0x060818,
      tunnel_fungal: 0x041810,
      tunnel_crystal: 0x100818,
      tunnel_guardian: 0x120818,
    };
    const tintAlpha = {
      cavern: 0.42,
      mountain: 0.4,
      mountain_shaft: 0.44,
      shaft: 0.42,
      fungal: 0.44,
      crystal: 0.42,
      guardian: 0.44,
      tunnel: 0.5,
      tunnel_fungal: 0.52,
      tunnel_crystal: 0.5,
      tunnel_guardian: 0.54,
    };
    const overlay = this.scene.add.rectangle(
      rpw / 2, rph / 2, rpw, rph,
      tints[amb] || 0x0a0a12,
      tintAlpha[amb] ?? 0.35,
    );
    overlay.setScrollFactor(1, 1);
    overlay.setDepth(-4);
    this.parallaxLayers.push(overlay);

    const castCfg = {
      fungal: { color: 0x22ffaa, alpha: 0.065 },
      crystal: { color: 0xaa66ff, alpha: 0.072 },
      cavern: { color: 0x4488cc, alpha: 0.052 },
      mountain: { color: 0x5588aa, alpha: 0.045 },
      mountain_shaft: { color: 0x5588cc, alpha: 0.052 },
      shaft: { color: 0x5588cc, alpha: 0.06 },
      guardian: { color: 0xcc4488, alpha: 0.065 },
      tunnel: { color: 0x3366aa, alpha: 0.045 },
      tunnel_fungal: { color: 0x18aa66, alpha: 0.052 },
      tunnel_crystal: { color: 0x7744cc, alpha: 0.06 },
      tunnel_guardian: { color: 0xaa3366, alpha: 0.052 },
    };
    const cc = castCfg[amb];
    if (cc) {
      const cast = this.scene.add.rectangle(rpw / 2, rph / 2, rpw, rph, cc.color, cc.alpha);
      cast.setScrollFactor(1, 1);
      cast.setBlendMode(Phaser.BlendModes.ADD);
      cast.setDepth(-3);
      this.parallaxLayers.push(cast);
    }

    this.addUndergroundVignette(room, { strength: 'tunnel', amb: room.ambience || 'cavern' });

    this.addForegroundFraming(room);
  }

  /**
   * Drawn at depth 0 so it sits ON TOP of the close parallax (-2) — otherwise tunnel tint at -3 was invisible.
   * Still below tiles (3) and player (5). strength: 'tunnel' | 'shaft'
   */
  addUndergroundVignette(room, opts) {
    const rpw = room.width * TILE_SIZE;
    const rph = room.height * TILE_SIZE;
    const strength = opts.strength;
    const isTunnel = strength === 'tunnel';
    const isEntrance = strength === 'entrance';
    const amb = opts.amb || '';
    const depth = 0;

    if (isEntrance) {
      const topH = rph * 0.32;
      const top = this.scene.add.rectangle(rpw / 2, topH * 0.4, rpw, topH, 0x060810, 0.38);
      top.setScrollFactor(1, 1);
      top.setDepth(depth);
      this.parallaxLayers.push(top);
      const sideW = Math.min(80, rpw * 0.07);
      const leftE = this.scene.add.rectangle(sideW / 2, rph / 2, sideW, rph, 0x000000, 0.22);
      leftE.setScrollFactor(1, 1);
      leftE.setDepth(depth);
      this.parallaxLayers.push(leftE);
      const rightE = this.scene.add.rectangle(rpw - sideW / 2, rph / 2, sideW, rph, 0x000000, 0.22);
      rightE.setScrollFactor(1, 1);
      rightE.setDepth(depth);
      this.parallaxLayers.push(rightE);
      return;
    }

    const topH = rph * (isTunnel ? 0.46 : 0.38);
    const topColor = isTunnel
      ? (amb.includes('crystal') ? 0x0a0618 : amb.includes('fungal') ? 0x040a08 : 0x050508)
      : 0x04060a;
    const topAlpha = isTunnel ? 0.72 : 0.5;
    const top = this.scene.add.rectangle(rpw / 2, topH * 0.42, rpw, topH, topColor, topAlpha);
    top.setScrollFactor(1, 1);
    top.setDepth(depth);
    this.parallaxLayers.push(top);

    const sideW = Math.min(120, Math.max(56, rpw * 0.1));
    const sideAlpha = isTunnel ? 0.55 : 0.4;
    const left = this.scene.add.rectangle(sideW / 2, rph / 2, sideW, rph, 0x000000, sideAlpha);
    left.setScrollFactor(1, 1);
    left.setDepth(depth);
    this.parallaxLayers.push(left);
    const right = this.scene.add.rectangle(rpw - sideW / 2, rph / 2, sideW, rph, 0x000000, sideAlpha);
    right.setScrollFactor(1, 1);
    right.setDepth(depth);
    this.parallaxLayers.push(right);

    const floorH = isTunnel ? 140 : 100;
    const floorBand = this.scene.add.rectangle(rpw / 2, rph - floorH * 0.35, rpw, floorH, 0x000000, isTunnel ? 0.38 : 0.28);
    floorBand.setScrollFactor(1, 1);
    floorBand.setDepth(depth);
    this.parallaxLayers.push(floorBand);

    if (isTunnel) {
      const crush = this.scene.add.rectangle(rpw / 2, rph * 0.38, rpw * 0.88, rph * 0.42, 0x000000, 0.18);
      crush.setScrollFactor(1, 1);
      crush.setDepth(depth);
      this.parallaxLayers.push(crush);
    }
  }

  /** Close background: scrolls with stage, no hard outline — reads as “wall behind” playfield */
  addCloseBackgroundLayer(room) {
    if (!this.scene.textures.exists('bg_close_cavern')) return;

    const rpw = room.width * TILE_SIZE;
    const rph = room.height * TILE_SIZE;
    const amb = room.ambience || 'cavern';
    const keyMap = {
      mountain: 'bg_close_cavern',
      mountain_shaft: 'bg_close_cavern',
      fungal: 'bg_close_fungal',
      crystal: 'bg_close_crystal',
      guardian: 'bg_close_crystal',
      cavern: 'bg_close_cavern',
      shaft: 'bg_close_cavern',
      tunnel: 'bg_close_cavern',
      tunnel_fungal: 'bg_close_fungal',
      tunnel_crystal: 'bg_close_crystal',
      tunnel_guardian: 'bg_close_crystal',
    };
    const key = keyMap[amb] || 'bg_close_cavern';

    const close = this.scene.add.tileSprite(rpw / 2, rph / 2, rpw, rph, key);
    close.setScrollFactor(1, 1);
    close.setDepth(-2);
    close.setAlpha(0.9);
    this.parallaxLayers.push(close);

    // Directional ambient light wash on the close background (themed per room)
    const lightCfg = {
      mountain: { color: 0x886644, alpha: 0.06 },
      mountain_shaft: { color: 0x6688aa, alpha: 0.06 },
      fungal: { color: 0x44cc88, alpha: 0.09 },
      crystal: { color: 0x8866cc, alpha: 0.10 },
      guardian: { color: 0xcc6688, alpha: 0.09 },
      cavern: { color: 0x6688aa, alpha: 0.07 },
      shaft: { color: 0x6688aa, alpha: 0.07 },
      tunnel: { color: 0x446688, alpha: 0.05 },
      tunnel_fungal: { color: 0x338866, alpha: 0.06 },
      tunnel_crystal: { color: 0x6644aa, alpha: 0.06 },
      tunnel_guardian: { color: 0x884466, alpha: 0.06 },
    };
    const lc = lightCfg[amb] || lightCfg.cavern;
    const light = this.scene.add.rectangle(rpw * 0.25, rph * 0.4, rpw * 0.55, rph * 0.85, lc.color, lc.alpha);
    light.setScrollFactor(1, 1);
    light.setDepth(-1);
    light.setBlendMode(Phaser.BlendModes.ADD);
    this.parallaxLayers.push(light);
  }

  /** Foreground margin décor — overlaps player at screen edges for depth (guide: foreground layer)
   * Grass, branches, plus theme-appropriate elements that never hide the main character */
  addForegroundFraming(room) {
    const rpw = room.width * TILE_SIZE;
    const rph = room.height * TILE_SIZE;
    const floorY = rph - 6; // used if grass framing is re-enabled

    if (false && this.scene.textures.exists('fg_grass_clump')) {
      const xs = [56, 112, 168, rpw - 168, rpw - 112, rpw - 56];
      for (let i = 0; i < xs.length; i++) {
        const g = this.scene.add.image(xs[i], floorY, 'fg_grass_clump');
        g.setOrigin(0.5, 1);
        g.setDepth(22);
        g.setAlpha(0.72);
        g.setFlipX(i % 2 === 1);
        g.setScale(0.88 + (i % 3) * 0.06);
        this.parallaxLayers.push(g);
      }

      // Extra grass along floor at irregular intervals for organic feel
      const extraCount = Math.floor(rpw / 140);
      for (let i = 0; i < extraCount; i++) {
        const ex = 80 + i * 140 + (i % 3) * 20;
        if (ex > rpw - 80) break;
        const eg = this.scene.add.image(ex, floorY + 2, 'fg_grass_clump');
        eg.setOrigin(0.5, 1);
        eg.setDepth(20);
        eg.setAlpha(0.45);
        eg.setScale(0.6 + (i % 4) * 0.08);
        eg.setFlipX(i % 2 === 0);
        this.parallaxLayers.push(eg);
      }
    }

    if (false && this.scene.textures.exists('fg_branch_strip')) {
      const topY = 14;
      const left = this.scene.add.image(72, topY, 'fg_branch_strip');
      left.setOrigin(0.5, 0);
      left.setDepth(21);
      left.setAlpha(0.55);
      this.parallaxLayers.push(left);

      const right = this.scene.add.image(rpw - 72, topY + 4, 'fg_branch_strip');
      right.setOrigin(0.5, 0);
      right.setFlipX(true);
      right.setDepth(21);
      right.setAlpha(0.55);
      this.parallaxLayers.push(right);

      // Additional branch strips at ceiling edges (guide: foreground at margins)
      if (rpw > 600) {
        const mid = this.scene.add.image(rpw * 0.4, topY + 6, 'fg_branch_strip');
        mid.setOrigin(0.5, 0);
        mid.setDepth(21);
        mid.setAlpha(0.35);
        mid.setScale(0.8);
        this.parallaxLayers.push(mid);
      }
    }
  }

  /** Render room-specific close-background detail objects (bricks, roots, runes) */
  renderCloseBgDetails(room) {
    if (!room.closeBgDetails) return;
    for (const detail of room.closeBgDetails) {
      const key = detail.type;
      if (!this.scene.textures.exists(key)) continue;

      if (key === 'cb_detail_bricks' && detail.w && detail.h) {
        const startX = detail.x * TILE_SIZE;
        const startY = detail.y * TILE_SIZE;
        for (let dy = 0; dy < detail.h; dy += 2) {
          for (let dx = 0; dx < detail.w; dx += 2) {
            const bx = startX + dx * TILE_SIZE + TILE_SIZE;
            const by = startY + dy * TILE_SIZE + TILE_SIZE;
            const d = this.scene.add.image(bx, by, key);
            d.setDepth(-1);
            d.setAlpha(0.50 + (dx + dy) % 3 * 0.06);
            d.setScale(1);
            this.decorations.push(d);
          }
        }
      } else if (key === 'cb_detail_roots' && detail.count) {
        for (let i = 0; i < detail.count; i++) {
          const rx = detail.x * TILE_SIZE + i * 52 + TILE_SIZE;
          const ry = detail.y * TILE_SIZE + TILE_SIZE / 2;
          const d = this.scene.add.image(rx, ry, key);
          d.setDepth(-1);
          d.setAlpha(0.55);
          d.setScale(1.3);
          d.setOrigin(0.5, 0);
          d.setFlipX(i % 2 === 1);
          this.decorations.push(d);
        }
      } else if (key === 'cb_rune_mark') {
        const rx = detail.x * TILE_SIZE + TILE_SIZE / 2;
        const ry = detail.y * TILE_SIZE + TILE_SIZE / 2;
        const d = this.scene.add.image(rx, ry, key);
        d.setDepth(-1);
        d.setAlpha(0.40);
        d.setScale(1.2);
        this.scene.tweens.add({
          targets: d, alpha: 0.22,
          duration: 3000 + Math.random() * 2000, yoyo: true, repeat: -1,
        });
        this.decorations.push(d);
      }
    }
  }

  /** Render room-specific foreground elements that overlap the player for depth.
   * Guide: foreground is displayed above main layer for 3D depth, placed at margins. */
  renderForegroundElements(room) {
    if (!room.foreground) return;
    const H = room.height;
    const W = room.width;

    const coversDoorway = (fg) => {
      const t = fg.type;
      if (t !== 'fg_rock_formation' && t !== 'fg_rock_formation_sm' && t !== 'fg_pillar_fragment') {
        return false;
      }
      if (fg.y < H - 2) return false;
      return fg.x <= 3 || fg.x >= W - 4;
    };

    for (const fg of room.foreground) {
      if (coversDoorway(fg)) continue;
      const key = fg.type;
      if (!this.scene.textures.exists(key)) continue;

      const px = fg.x * TILE_SIZE + TILE_SIZE / 2;
      const py = fg.y * TILE_SIZE + TILE_SIZE / 2;
      const img = this.scene.add.image(px, py, key);
      img.setDepth(22);
      img.setAlpha(0.92);
      if (fg.flipX) img.setFlipX(true);

      if (key === 'fg_rock_formation') {
        img.setOrigin(0.5, 1);
        img.setScale(fg.scale || 2.2);
      } else if (key === 'fg_rock_formation_sm') {
        img.setOrigin(0.5, 1);
        img.setScale(fg.scale || 1.6);
      } else if (key === 'fg_mushroom_large') {
        img.setOrigin(0.5, 1);
        img.setScale(fg.scale || 2.0);
        img.setAlpha(0.85);
      } else if (key === 'fg_crystal_large') {
        img.setOrigin(0.5, 1);
        img.setScale(fg.scale || 2.0);
        img.setAlpha(0.82);
      } else if (key === 'fg_pillar_fragment') {
        img.setOrigin(0.5, 1);
        img.setScale(fg.scale || 1.8);
        img.setAlpha(0.88);
      } else if (key === 'fg_torch_bracket') {
        img.setOrigin(0, 0.5);
        img.setScale(fg.scale || 1.5);
        img.setAlpha(1);
        img.setDepth(23);
        const glow = this.scene.add.image(px + 12, py - 12, 'particle_white');
        glow.setScale(8);
        glow.setAlpha(0.12);
        glow.setDepth(21);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({
          targets: glow, alpha: 0.04, scaleX: 10, scaleY: 10,
          duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1,
        });
        this.parallaxLayers.push(glow);
      } else {
        img.setScale(fg.scale || 1.5);
      }

      this.parallaxLayers.push(img);
    }
  }

  /** Render directional light beams and ambient color from room lighting config */
  renderDirectionalLighting(room) {
    if (!room.lighting) return;
    const rpw = room.width * TILE_SIZE;
    const rph = room.height * TILE_SIZE;

    for (const beam of room.lighting.beams || []) {
      const shaftKey = beam.key === 'warm' ? 'light_shaft_warm' : 'light_shaft_cool';
      if (!this.scene.textures.exists(shaftKey)) continue;

      const bx = beam.x * TILE_SIZE + TILE_SIZE / 2;
      const by = beam.y * TILE_SIZE;
      const shaft = this.scene.add.image(bx, by, shaftKey);
      shaft.setOrigin(0.5, 0);
      shaft.setDepth(8);
      const baseAlpha = (beam.alpha || 0.15) * 1.85;
      const scale = (beam.scale || 1) * 1.45;
      shaft.setAlpha(baseAlpha);
      shaft.setScale(scale);
      shaft.setRotation(Phaser.Math.DegToRad(beam.angle || 0));
      shaft.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: shaft, alpha: baseAlpha * 0.5,
        duration: 3000 + Math.random() * 2000, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.parallaxLayers.push(shaft);

      const glow = this.scene.add.image(bx, by, shaftKey);
      glow.setOrigin(0.5, 0);
      glow.setDepth(7);
      glow.setAlpha(baseAlpha * 0.28);
      glow.setScale(scale * 2.15);
      glow.setRotation(Phaser.Math.DegToRad(beam.angle || 0));
      glow.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: glow, alpha: baseAlpha * 0.12,
        duration: 3400 + Math.random() * 1800, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.parallaxLayers.push(glow);
    }

    if (room.lighting.ambientColor != null) {
      const ambient = this.scene.add.rectangle(
        rpw / 2, rph / 2, rpw, rph,
        room.lighting.ambientColor,
        (room.lighting.ambientAlpha || 0.04) * 2,
      );
      ambient.setScrollFactor(1, 1);
      ambient.setDepth(9);
      ambient.setBlendMode(Phaser.BlendModes.ADD);
      this.parallaxLayers.push(ambient);
    }
  }

  buildTiles(room) {
    this.wallLayer = this.scene.physics.add.staticGroup();
    this.platformGroup = this.scene.physics.add.staticGroup();

    for (let row = 0; row < room.tiles.length; row++) {
      for (let col = 0; col < room.tiles[row].length; col++) {
        const tile = room.tiles[row][col];
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;

        if (tile === 1) {
          const key = room.organicWallStyle
            ? this.pickOrganicWallKey(room.tiles, row, col)
            : (() => {
              const isTop = row > 0 && room.tiles[row - 1][col] !== 1;
              const wallHash = Math.abs(row * 131 + col * 17) % 3;
              const wallKeys = ['tile_wall', 'tile_wall_2', 'tile_wall_3'];
              return isTop ? 'tile_wall_mossy' : wallKeys[wallHash];
            })();
          const wall = this.wallLayer.create(x, y, key);
          wall.setDisplaySize(TILE_SIZE, TILE_SIZE);
          wall.setDepth(3);
          wall.refreshBody();
        } else if (tile === 3) {
          const a = room.ambience || '';
          const usePath = a === 'fungal' || a === 'crystal' || a === 'guardian'
            || a === 'tunnel_fungal' || a === 'tunnel_crystal' || a === 'tunnel_guardian';
          const key = usePath ? 'tile_ground_path' : 'tile_stair_block';
          const step = this.wallLayer.create(x, y, key);
          step.setDisplaySize(TILE_SIZE, TILE_SIZE);
          step.setDepth(3);
          step.refreshBody();
        } else if (tile === 2) {
          const useAlt = (row + col) % 2 === 0;
          const rowTiles = room.tiles[row];
          const leftP = col > 0 && rowTiles[col - 1] === 2;
          const rightP = col < rowTiles.length - 1 && rowTiles[col + 1] === 2;

          let platKey = useAlt ? 'tile_platform' : 'tile_platform_2';
          const amb = room.ambience;
          const pickTerrace = (prefix) => {
            if (!leftP && !rightP) return `${prefix}_solo`;
            if (!leftP && rightP) return `${prefix}_left`;
            if (leftP && !rightP) return `${prefix}_right`;
            return (row + col * 3) % 5 === 0 ? `${prefix}_mid2` : prefix;
          };
          if (amb === 'mountain' || amb === 'mountain_shaft') {
            platKey = pickTerrace('tile_platform_mountain');
          } else if (amb === 'fungal' || amb === 'tunnel_fungal') {
            platKey = pickTerrace('tile_platform_fungal');
          } else if (amb === 'crystal' || amb === 'guardian' || amb === 'tunnel_crystal' || amb === 'tunnel_guardian') {
            platKey = pickTerrace('tile_platform_crystal');
          }

          const plat = this.platformGroup.create(x, y, platKey);
          plat.setDisplaySize(TILE_SIZE, TILE_SIZE);
          plat.setDepth(3);
          plat.body.setSize(TILE_SIZE, TILE_SIZE);
          plat.body.checkCollision.down = false;
          plat.body.checkCollision.left = false;
          plat.body.checkCollision.right = false;
          plat.refreshBody();
        }
      }
    }
    if (room.organicDecor) {
      this.placeOrganicCaveDecor(room);
    }
  }

  /** Neighbor bitmask autotile for organic cave walls (rock vs air; platforms excluded). */
  pickOrganicWallKey(tiles, row, col) {
    const H = tiles.length;
    const W = tiles[0].length;
    const rock = (r, c) => {
      if (r < 0 || r >= H || c < 0 || c >= W) return true;
      const t = tiles[r][c];
      return t === 1 || t === 3;
    };
    const air = (r, c) => !rock(r, c);
    const airN = air(row - 1, col);
    const airS = air(row + 1, col);
    const airW = air(row, col - 1);
    const airE = air(row, col + 1);
    if (airN) return 'tile_wall_mossy';
    if (airS && (airW || airE)) return 'tile_wall_3';
    if (airW !== airE) return 'tile_wall_2';
    const wallHash = Math.abs(row * 131 + col * 17) % 3;
    return ['tile_wall', 'tile_wall_2', 'tile_wall_3'][wallHash];
  }

  placeOrganicCaveDecor(room) {
    const { tiles } = room;
    if (!tiles?.length) return;
    const H = tiles.length;
    const W = tiles[0].length;
    const rng = organicDecorRng(room.organicDecorSeed ?? 0);
    for (let r = 1; r < H - 2; r += 1) {
      for (let c = 1; c < W - 1; c += 1) {
        if (tiles[r][c] !== 1) continue;
        if (tiles[r + 1][c] !== 0) continue;
        if (rng() > 0.028) continue;
        const px = c * TILE_SIZE + TILE_SIZE / 2;
        const py = r * TILE_SIZE + TILE_SIZE * 0.42;
        const key = rng() > 0.58 ? 'stalactite' : 'stalactite_sm';
        this.createDecoration(px, py, key);
      }
    }
  }

  spawnObjects(room) {
    this.scene.enemies = this.scene.physics.add.group();

    for (const obj of room.objects || []) {
      const px = obj.x * TILE_SIZE + TILE_SIZE / 2;
      const py = obj.y * TILE_SIZE + TILE_SIZE / 2;

      switch (obj.type) {
        case 'door': this.createDoor(px, py, obj); break;
        case 'ability_orb': this.createAbilityOrb(px, py, obj); break;
        case 'bench': this.createBench(px, py); break;
        case 'crawler': this.createCrawler(px, py); break;
        case 'flyer': this.createFlyer(px, py); break;
        case 'boss': this.createBoss(px, py); break;
        case 'brute': this.createBrute(px, py); break;
        case 'npc': this.createNPC(px, py, obj); break;
        case 'health_pickup': this.createHealthPickup(px, py); break;
        case 'coin': this.createCoin(px, py); break;
        case 'teleport': this.createTeleport(px, py, obj); break;
        case 'merchant_shop': this.createMerchantShop(px, py, obj); break;
        case 'moving_platform': this.createMovingPlatform(px, py, obj); break;
        case 'pendulum_trap': this.createPendulumTrap(px, py, obj); break;
        case 'spike_wall': this.createSpikeWall(px, py, obj); break;
        case 'crumble_platform': this.createCrumblePlatform(px, py, obj); break;
        case 'magma_pool': this.createMagmaPool(px, py, obj); break;
        case 'stalactite':
        case 'stalactite_sm':
        case 'stalagmite':
        case 'fungus':
        case 'fungus_small':
        case 'crystal':
        case 'crystal_cluster':
        case 'chain':
        case 'pillar':
        case 'pillar_broken':
        case 'vine':
        case 'light_beam':
        case 'pine_tree':
        case 'snow_rock':
        case 'wood_bridge':
        case 'mountain_banner':
        case 'birds_silhouette':
        case 'ruin_arch':
        case 'hanging_moss':
        case 'glow_spore':
        case 'mud_patch':
        case 'gravel_patch':
        case 'tomb_light_beam':
          this.createDecoration(px, py, obj.type === 'fungus' ? 'fungus_glow' : obj.type);
          break;
      }
    }
  }

  get allPlayers() {
    return [this.scene.player];
  }

  setupCollisions() {
    for (const player of this.allPlayers) {
      this.scene.physics.add.collider(player, this.wallLayer);
      this.scene.physics.add.collider(player, this.platformGroup);
      for (const plat of this.movingPlatforms) {
        if (plat.sprite && plat.sprite.body) this.scene.physics.add.collider(player, plat.sprite);
      }
      for (const cp of this.crumblePlatforms) {
        if (!cp.sprite || !cp.sprite.body) continue;
        this.scene.physics.add.collider(player, cp.sprite, () => this.startCrumble(cp), null, this);
      }
      this.scene.physics.add.overlap(
        player, this.scene.enemies, this.onPlayerTouchEnemy, null, this,
      );
    }
    this.scene.physics.add.collider(this.scene.enemies, this.wallLayer);
    this.scene.physics.add.collider(this.scene.enemies, this.platformGroup);
  }

  positionPlayer(room, spawnX, spawnY) {
    const sx = spawnX !== undefined
      ? spawnX * TILE_SIZE + TILE_SIZE / 2
      : room.playerSpawn.x * TILE_SIZE + TILE_SIZE / 2;
    let sy = spawnY !== undefined
      ? spawnY * TILE_SIZE + TILE_SIZE / 2
      : room.playerSpawn.y * TILE_SIZE + TILE_SIZE / 2;

    // Nudge upward if the spawn tile is solid/platform so the player doesn't get embedded
    for (let i = 0; i < 6; i++) {
      const col = Math.floor(sx / TILE_SIZE);
      const row = Math.floor(sy / TILE_SIZE);
      if (row >= 0 && row < room.tiles.length && col >= 0 && col < room.tiles[0].length) {
        const tile = room.tiles[row][col];
        if (tile === 1 || tile === 2 || tile === 3) {
          sy -= TILE_SIZE;
          continue;
        }
      }
      break;
    }

    this.scene.player.setPosition(sx, sy);
    this.scene.player.body.velocity.set(0, 0);
    this.scene.player.spawnX = sx;
    this.scene.player.spawnY = sy;
    this.scene.player.checkpointX = room.playerSpawn.x * TILE_SIZE + TILE_SIZE / 2;
    this.scene.player.checkpointY = room.playerSpawn.y * TILE_SIZE + TILE_SIZE / 2;
    this.scene.player._checkpointRoom = this.currentRoomId;
    this.scene.player.visitedRooms.add(this.currentRoomId);
  }

  createDoor(px, py, obj) {
    const room = this.currentRoom;
    const opening = room
      ? getDoorOpeningWorldBounds(room, Math.floor(obj.x), Math.floor(obj.y))
      : null;
    const cx = opening?.cx ?? px;
    const cy = opening?.cy ?? py;
    const ow = opening?.w ?? TILE_SIZE * 2;
    const oh = opening?.h ?? TILE_SIZE * 4;

    const portalGlow = this.scene.add.image(cx, cy, 'door');
    portalGlow.setDepth(3);
    portalGlow.setBlendMode(Phaser.BlendModes.ADD);
    portalGlow.setAlpha(0.22);
    portalGlow.setDisplaySize(ow, oh);
    const glowTween = this.scene.tweens.add({
      targets: portalGlow,
      alpha: { from: 0.14, to: 0.32 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const door = this.scene.physics.add.image(cx, cy, 'door');
    door.body.allowGravity = false;
    door.body.setImmovable(true);
    door.setDisplaySize(ow, oh);
    door.body.setSize(ow, oh);
    door.setDepth(5);
    door.targetRoom = obj.targetRoom;
    door.spawnX = obj.spawnX;
    door.spawnY = obj.spawnY;
    door.requiresAbilities = Array.isArray(obj.requiresAbilities) ? obj.requiresAbilities : [];
    door.setAlpha(0.96);
    door.refreshBody();

    const pulseTween = this.scene.tweens.add({
      targets: door,
      alpha: { from: 0.9, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const onDoor = (player) => {
      if (this.roomLocked) return;
      if (!meetsAbilityRequirements(player, door.requiresAbilities)) return;
      this.scene.transitionToRoom(door.targetRoom, door.spawnX, door.spawnY);
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, door, onDoor);
    }
    this.doorZones.push({ door, portalGlow, glowTween, pulseTween });
  }

  createAbilityOrb(x, y, obj) {
    if (this.scene.player.hasAbility(obj.ability)) return;

    const chest = this.scene.physics.add.image(x, y, 'chest_closed');
    chest.body.allowGravity = false;
    chest.body.setImmovable(true);
    chest.setDepth(6);
    chest.ability = obj.ability;
    chest.hint = obj.hint;

    const glow = this.scene.add.image(x, y, 'ability_orb');
    glow.setAlpha(0.1);
    glow.setScale(2);
    glow.setDepth(5);
    this.scene.tweens.add({
      targets: glow, alpha: 0.03, scaleX: 2.5, scaleY: 2.5,
      duration: 1400, yoyo: true, repeat: -1,
    });

    const sparkle = this.scene.add.image(x, y - 10, 'particle_teal');
    sparkle.setAlpha(0.25);
    sparkle.setScale(1.5);
    sparkle.setDepth(7);
    sparkle.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: sparkle, alpha: 0.06, y: y - 16, scaleX: 2, scaleY: 2,
      duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(
        player, chest, () => this.openTreasureChest(chest, glow, sparkle),
      );
    }
    this.abilityOrbs.push({ orb: chest, glow });
  }

  openTreasureChest(chest, glow, sparkle) {
    if (!chest.active || chest._opened) return;
    chest._opened = true;

    const ability = chest.ability;
    const hint = chest.hint;
    for (const p of this.allPlayers) {
      p.unlockAbility(ability);
    }

    this.scene.physics.pause();
    this.scene.cameras.main.flash(400, 64, 232, 192);

    chest.setTexture('chest_open');

    this.scene.tweens.add({
      targets: chest, y: chest.y - 6, duration: 200, ease: 'Back.easeOut',
      yoyo: true,
    });

    if (sparkle) { sparkle.destroy(); }
    if (glow) {
      this.scene.tweens.add({
        targets: glow, alpha: 0, duration: 600,
        onComplete: () => glow.destroy(),
      });
    }

    this.scene.time.delayedCall(400, () => {
      this.showChestModal(chest.x, chest.y, ability, hint, () => {
        this.scene.physics.resume();
      });
    });
  }

  showChestModal(wx, wy, ability, hint, onClose) {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const names = { slash: 'SLASH', wallJump: 'WALL JUMP', dash: 'DASH', map: 'DUNGEON MAP', kick: 'KICK', spear: 'SOUL SPEAR', doubleJump: 'DOUBLE JUMP' };
    const abilityName = names[ability] || ability.toUpperCase();

    const modalElements = [];

    const overlay = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0)
      .setScrollFactor(0).setDepth(200);
    modalElements.push(overlay);

    const panelW = 320;
    const panelH = 180;

    const border = this.scene.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0x44ff66, 0.35)
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    modalElements.push(border);

    const panel = this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1a1008, 0.94)
      .setScrollFactor(0).setDepth(202).setAlpha(0);
    modalElements.push(panel);

    const borderTop = this.scene.add.rectangle(cx, cy - panelH / 2, panelW, 3, 0x44ff66, 0.6)
      .setScrollFactor(0).setDepth(203).setAlpha(0);
    modalElements.push(borderTop);

    const borderBot = this.scene.add.rectangle(cx, cy + panelH / 2, panelW, 3, 0x44ff66, 0.3)
      .setScrollFactor(0).setDepth(203).setAlpha(0);
    modalElements.push(borderBot);

    const borderL = this.scene.add.rectangle(cx - panelW / 2, cy, 3, panelH, 0x44ff66, 0.4)
      .setScrollFactor(0).setDepth(203).setAlpha(0);
    modalElements.push(borderL);

    const borderR = this.scene.add.rectangle(cx + panelW / 2, cy, 3, panelH, 0x44ff66, 0.4)
      .setScrollFactor(0).setDepth(203).setAlpha(0);
    modalElements.push(borderR);

    const headerText = this.scene.add.text(cx, cy - 50, 'YOU FOUND', {
      fontSize: '14px', fontFamily: 'monospace', color: '#8a7858',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204).setAlpha(0);
    modalElements.push(headerText);

    const nameText = this.scene.add.text(cx, cy - 20, abilityName, {
      fontSize: '32px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204).setAlpha(0);
    modalElements.push(nameText);

    const hintText = this.scene.add.text(cx, cy + 20, hint || '', {
      fontSize: '13px', fontFamily: 'monospace', color: '#d4c8a8',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204).setAlpha(0);
    modalElements.push(hintText);

    const isMobile = 'ontouchstart' in window && navigator.maxTouchPoints > 1;
    const promptLabel = isMobile ? '[ TAP TO CONTINUE ]' : '[ PRESS ANY KEY ]';
    const continueText = this.scene.add.text(cx, cy + 60, promptLabel, {
      fontSize: '12px', fontFamily: 'monospace', color: '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204).setAlpha(0);
    modalElements.push(continueText);

    this.scene.tweens.add({
      targets: overlay, fillAlpha: 0.55, duration: 300,
    });
    this.scene.tweens.add({
      targets: [border, panel, borderTop, borderBot, borderL, borderR,
        headerText, nameText, hintText],
      alpha: 1, duration: 350, delay: 100, ease: 'Power2',
    });
    this.scene.tweens.add({
      targets: continueText, alpha: 1, duration: 600, delay: 600,
    });
    this.scene.tweens.add({
      targets: continueText, alpha: 0.4, duration: 800, delay: 1200,
      yoyo: true, repeat: -1,
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      this.scene.input.keyboard.off('keydown', dismiss);
      if (this._chestPadListener) {
        this.scene.input.gamepad.off('down', this._chestPadListener);
        this._chestPadListener = null;
      }
      this.scene.input.off('pointerdown', dismiss);
      this.scene.tweens.add({
        targets: modalElements, alpha: 0, duration: 250,
        onComplete: () => {
          modalElements.forEach(el => el.destroy());
          if (onClose) onClose();
        },
      });
    };

    this.scene.time.delayedCall(500, () => {
      this.scene.input.keyboard.on('keydown', dismiss);
      this.scene.input.on('pointerdown', dismiss);
      if (this.scene.input.gamepad) {
        this._chestPadListener = dismiss;
        this.scene.input.gamepad.on('down', dismiss);
      }
    });
  }

  createBench(x, y) {
    // y is tile center; pod sits on floor at bottom of that tile
    const floorY = y + TILE_SIZE / 2;

    const podBack = this.scene.add.image(x, floorY, 'rest_pod_back');
    podBack.setOrigin(0.5, 1);
    podBack.setDepth(2);

    const podFront = this.scene.add.image(x, floorY, 'rest_pod_front');
    podFront.setOrigin(0.5, 1);
    podFront.setDepth(7); // player depth 5 — reads as standing inside the pod

    const glow = this.scene.add.image(x, floorY - 44, 'particle_teal');
    glow.setScale(9);
    glow.setAlpha(0.1);
    glow.setDepth(1);
    this.scene.tweens.add({
      targets: glow, alpha: 0.03, scaleX: 11, scaleY: 11,
      duration: 2200, yoyo: true, repeat: -1,
    });

    const trigger = this.scene.physics.add.image(x, floorY - 44, 'particle_teal');
    trigger.setVisible(false);
    trigger.body.allowGravity = false;
    trigger.body.setImmovable(true);
    trigger.body.setSize(38, 52);

    const state = {
      podBack,
      podFront,
      glow,
      trigger,
      floorY,
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(
        player, trigger, () => this.interactRestPod(state),
      );
    }
    this.benches.push(state);
  }

  interactRestPod(state) {
    if (state._resting) return;
    state._resting = true;
    const { podBack, floorY } = state;
    for (const p of this.allPlayers) {
      p.setCheckpoint(podBack.x, floorY - 18);
      p.fullHeal();
    }

    this.scene.cameras.main.flash(200, 0, 128, 96);
    const text = this.scene.add.text(podBack.x, floorY - 86, 'RESTING...', {
      fontSize: '16px', fontFamily: 'monospace', color: '#40ffd8', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    if (this.scene.hud) this.scene.hud.refresh();

    this.scene.tweens.add({
      targets: text, alpha: 0, y: '-=20', duration: 1500, delay: 800,
      onComplete: () => { text.destroy(); state._resting = false; },
    });
  }

  createCrawler(x, y) {
    const crawler = new Crawler(this.scene, x, y);
    this.scene.enemies.add(crawler);
  }

  createFlyer(x, y) {
    const flyer = new Flyer(this.scene, x, y);
    this.scene.enemies.add(flyer);
  }

  createBoss(x, y) {
    const boss = new Boss(this.scene, x, y);
    this.scene.enemies.add(boss);
  }

  createBrute(x, y) {
    const brute = new Brute(this.scene, x, y);
    this.scene.enemies.add(brute);
  }

  createNPC(x, y, obj) {
    const npc = new NPC(this.scene, x, y, obj.npcType, obj.dialogue);
    this.scene.physics.add.collider(npc, this.wallLayer);
    this.scene.physics.add.collider(npc, this.platformGroup);
    for (const player of this.allPlayers) {
      this.scene.physics.add.collider(player, npc);
    }

    const zone = this.scene.physics.add.image(x, y, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(96, 48);

    let playerInZone = false;
    const tryInteract = (player) => {
      if (npc.isTalking || this.scene.dialogueActive) return;
      const body = player.body;
      if (!body || !body.blocked.down) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
      if (dist > 62) return;
      const input = player.getInputState();
      if (!input.interactPressed) return;
      this.scene.dialogueActive = true;
      this.scene.physics.pause();
      npc.interact(() => {
        this.scene.dialogueActive = false;
        this.scene.physics.resume();
      });
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(
        player, zone,
        () => {
          if (!playerInZone) {
            playerInZone = true;
            npc.setPlayerNearby(true);
          }
          tryInteract(player);
        },
      );
    }

    this.scene.time.addEvent({
      delay: 200, loop: true,
      callback: () => {
        if (!zone.active || !this.scene.player) return;
        let anyNear = false;
        for (const player of this.allPlayers) {
          const dist = Phaser.Math.Distance.Between(
            player.x, player.y, zone.x, zone.y,
          );
          if (dist <= 58) anyNear = true;
        }
        if (!anyNear) {
          if (playerInZone) {
            playerInZone = false;
            npc.setPlayerNearby(false);
          }
        }
      },
    });

    this.npcs.push({ npc, zone });
  }

  createHealthPickup(x, y) {
    const pickup = this.scene.physics.add.image(x, y, 'health_pickup');
    pickup.body.allowGravity = false;
    pickup.setDepth(3);
    this.scene.tweens.add({
      targets: pickup, y: y - 6, duration: 1200,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(
        player, pickup, () => {
          if (!pickup.active) return;
          if (player.hp < player.maxHp) {
            player.hp = Math.min(player.hp + 1, player.maxHp);
            if (this.scene.hud) this.scene.hud.refresh();
          }
          pickup.destroy();
        },
      );
    }
    this.healthPickups.push(pickup);
  }

  createCoin(x, y) {
    const coin = this.scene.physics.add.image(x, y, 'coin');
    coin.body.allowGravity = false;
    coin.setDepth(3);
    this.scene.tweens.add({
      targets: coin, y: y - 5, duration: 1000,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: coin, angle: 360, duration: 2400, repeat: -1, ease: 'Linear',
    });
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(
        player, coin, () => {
          if (!coin.active) return;
          player.coins++;
          if (this.scene.hud) this.scene.hud.refresh();
          const txt = this.scene.add.text(coin.x, coin.y - 10, '+1', {
            fontSize: '14px', fontFamily: 'monospace', color: '#ffc840',
            stroke: '#000', strokeThickness: 2,
          }).setOrigin(0.5).setDepth(20);
          this.scene.tweens.add({
            targets: txt, alpha: 0, y: '-=20', duration: 800,
            onComplete: () => txt.destroy(),
          });
          coin.destroy();
        },
      );
    }
    this.coins.push(coin);
  }

  createTeleport(x, y, obj) {
    const pad = this.scene.physics.add.image(x, y, 'teleport_pad');
    pad.body.allowGravity = false;
    pad.body.setImmovable(true);
    pad.setDepth(1);
    pad.setAlpha(0.8);
    pad.targetRoom = obj.targetRoom;
    pad.spawnX = obj.spawnX;
    pad.spawnY = obj.spawnY;
    pad.requiresAbilities = Array.isArray(obj.requiresAbilities) ? obj.requiresAbilities : [];

    const glow = this.scene.add.image(x, y, 'particle_teal');
    glow.setScale(6);
    glow.setAlpha(0.15);
    glow.setDepth(0);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: glow, alpha: 0.05, scaleX: 8, scaleY: 8,
      duration: 1800, yoyo: true, repeat: -1,
    });
    this.decorations.push(glow);

    this.scene.tweens.add({
      targets: pad, angle: 360, duration: 6000, repeat: -1, ease: 'Linear',
    });

    const onTeleport = (player) => {
      if (this.roomLocked) return;
      if (!meetsAbilityRequirements(player, pad.requiresAbilities)) return;
      this.scene.transitionToRoom(pad.targetRoom, pad.spawnX, pad.spawnY);
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, pad, onTeleport);
    }
    this.teleports.push({ pad, glow });
  }

  createMerchantShop(x, y, obj) {
    const npcObj = { npcType: 'merchant', dialogue: obj.dialogue || [
      'Welcome, traveler. I have wares if you have coin.',
    ]};
    this.createNPC(x, y, npcObj);

    const items = obj.items || [
      { name: 'Health Refill', cost: 5, type: 'heal' },
      { name: 'Max HP +1', cost: 15, type: 'maxhp' },
    ];

    const zone = this.scene.physics.add.image(x, y, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(80, 48);

    let shopOpen = false;
    const tryShop = (player) => {
      if (shopOpen || this.scene.dialogueActive) return;
      const body = player.body;
      if (!body || !body.blocked.down) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, x, y);
      if (dist > 62) return;
      const input = player.getInputState();
      if (!input.interactPressed) return;
      shopOpen = true;
      this.scene.dialogueActive = true;
      this.scene.physics.pause();
      this.showShopModal(player, items, () => {
        shopOpen = false;
        this.scene.dialogueActive = false;
        this.scene.physics.resume();
      });
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => tryShop(player));
    }
  }

  showShopModal(player, items, onClose) {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const modalElements = [];

    const overlay = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0)
      .setScrollFactor(0).setDepth(200);
    modalElements.push(overlay);
    this.scene.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: 200 });

    const panelW = 300;
    const panelH = 60 + items.length * 44;
    const panel = this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1a1008, 0.94)
      .setScrollFactor(0).setDepth(202).setAlpha(0);
    modalElements.push(panel);
    this.scene.tweens.add({ targets: panel, alpha: 1, duration: 200 });

    const border = this.scene.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0xd4a020, 0.4)
      .setScrollFactor(0).setDepth(201).setAlpha(0);
    modalElements.push(border);
    this.scene.tweens.add({ targets: border, alpha: 1, duration: 200 });

    const title = this.scene.add.text(cx, cy - panelH / 2 + 18, 'MERCHANT', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffc840',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204).setAlpha(0);
    modalElements.push(title);
    this.scene.tweens.add({ targets: title, alpha: 1, duration: 250 });

    const coinText = this.scene.add.text(cx + panelW / 2 - 10, cy - panelH / 2 + 18,
      `Coins: ${player.coins}`, {
        fontSize: '12px', fontFamily: 'monospace', color: '#d4a020',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(204).setAlpha(0);
    modalElements.push(coinText);
    this.scene.tweens.add({ targets: coinText, alpha: 1, duration: 250 });

    const itemButtons = [];
    items.forEach((item, i) => {
      const iy = cy - panelH / 2 + 50 + i * 44;

      const bg = this.scene.add.rectangle(cx, iy, panelW - 24, 36, 0x2a1c10, 0.8)
        .setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
      modalElements.push(bg);

      const nameT = this.scene.add.text(cx - panelW / 2 + 24, iy, item.name, {
        fontSize: '13px', fontFamily: 'monospace', color: '#d4c8a8',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(204);
      modalElements.push(nameT);

      const costT = this.scene.add.text(cx + panelW / 2 - 24, iy,
        `${item.cost} coins`, {
          fontSize: '12px', fontFamily: 'monospace',
          color: player.coins >= item.cost ? '#ffc840' : '#664420',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(204);
      modalElements.push(costT);

      bg.on('pointerdown', () => {
        if (player.coins < item.cost) return;
        player.coins -= item.cost;
        coinText.setText(`Coins: ${player.coins}`);

        if (item.type === 'heal') {
          player.hp = player.maxHp;
        } else if (item.type === 'maxhp') {
          player.maxHp += 1;
          player.hp = player.maxHp;
        }

        if (this.scene.hud) this.scene.hud.refresh();
        costT.setColor(player.coins >= item.cost ? '#ffc840' : '#664420');

        this.scene.cameras.main.flash(150, 64, 192, 32);
      });
      itemButtons.push(bg);
    });

    const closeT = this.scene.add.text(cx, cy + panelH / 2 - 14, '[ CLOSE ]', {
      fontSize: '11px', fontFamily: 'monospace', color: '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(204)
      .setInteractive({ useHandCursor: true });
    modalElements.push(closeT);

    const dismiss = () => {
      this.scene.tweens.add({
        targets: modalElements, alpha: 0, duration: 200,
        onComplete: () => {
          modalElements.forEach(el => el.destroy());
          if (onClose) onClose();
        },
      });
    };

    closeT.on('pointerdown', dismiss);
    const keyDismiss = (e) => {
      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        this.scene.input.keyboard.off('keydown', keyDismiss);
        dismiss();
      }
    };
    this.scene.time.delayedCall(200, () => {
      this.scene.input.keyboard.on('keydown', keyDismiss);
    });
  }

  createDecoration(x, y, key) {
    const deco = this.scene.add.image(x, y, key);
    // Layer separation per Maglione guide:
    // close-bg (depth -2): pillars, arches, trees, bridges — no outline, behind gameplay
    // main-adjacent (depth 2): ground details, moss — near-playfield elements
    // glow/particle (depth 4): spores, light — atmospheric on top
    const closeBgKeys = ['pillar', 'pillar_broken', 'chain', 'light_beam', 'pine_tree', 'wood_bridge', 'ruin_arch', 'birds_silhouette'];
    const mainAdjacentKeys = ['hanging_moss', 'mud_patch', 'gravel_patch', 'fungus_small', 'snow_rock', 'mountain_banner'];
    if (closeBgKeys.includes(key)) {
      deco.setDepth(-2);
    } else if (mainAdjacentKeys.includes(key)) {
      deco.setDepth(2);
    } else {
      deco.setDepth(1);
    }

    if (key === 'fungus_glow') {
      deco.setAlpha(0.95);
      this.scene.tweens.add({
        targets: deco, alpha: 0.65,
        duration: 2000 + Math.random() * 800, yoyo: true, repeat: -1,
      });
    }
    if (key === 'fungus_small') {
      deco.setAlpha(0.9);
    }
    if (key === 'light_beam') {
      deco.setAlpha(0.5);
      deco.setBlendMode('ADD');
      this.scene.tweens.add({
        targets: deco, alpha: 0.2,
        duration: 3000 + Math.random() * 2000, yoyo: true, repeat: -1,
      });
    }
    if (key === 'vine') {
      this.scene.tweens.add({
        targets: deco, x: x + 2,
        duration: 2000 + Math.random() * 1000, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (key === 'mountain_banner') {
      this.scene.tweens.add({
        targets: deco, angle: 4,
        duration: 2000 + Math.random() * 500, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (key === 'birds_silhouette') {
      deco.setDepth(-3);
      deco.setAlpha(0.55);
      this.scene.tweens.add({
        targets: deco, x: x + 80,
        duration: 12000 + Math.random() * 4000, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    if (key === 'pine_tree') {
      deco.setAlpha(0.85);
    }
    if (key === 'ruin_arch') {
      deco.setAlpha(0.9);
    }
    if (key === 'hanging_moss') {
      deco.setDepth(2);
      deco.setAlpha(0.85);
    }
    if (key === 'mud_patch' || key === 'gravel_patch') {
      deco.setDepth(2);
      deco.setAlpha(0.9);
    }
    if (key === 'tomb_light_beam') {
      deco.setDepth(-1);
      deco.setBlendMode(Phaser.BlendModes.ADD);
      deco.setAlpha(0.5);
      this.scene.tweens.add({
        targets: deco, alpha: 0.24, duration: 2600 + Math.random() * 1400, yoyo: true, repeat: -1,
      });
    }
    if (key === 'glow_spore') {
      deco.setDepth(4);
      deco.setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: deco,
        alpha: 0.35,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 1800 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.decorations.push(deco);
  }

  createMovingPlatform(x, y, obj) {
    const plat = this.scene.physics.add.image(x, y, 'obsidian_platform');
    plat.setDisplaySize(TILE_SIZE, TILE_SIZE);
    plat.body.allowGravity = false;
    plat.body.setImmovable(true);
    plat.body.setSize(TILE_SIZE, TILE_SIZE);
    plat.body.checkCollision.down = false;
    plat.body.checkCollision.left = false;
    plat.body.checkCollision.right = false;
    plat.setDepth(3);

    this.movingPlatforms.push({
      sprite: plat,
      baseX: x,
      baseY: y,
      axis: obj.axis || 'x',
      range: obj.range || 64,
      speed: obj.speed || 0.9,
      phase: obj.phase || 0,
      spin: obj.spin || 0,
    });
  }

  createPendulumTrap(x, y, obj) {
    const chainLen = obj.length || 90;
    const anchor = this.scene.add.image(x, y - chainLen, 'pendulum_anchor').setDepth(2);
    const blade = this.scene.add.image(x, y, 'pendulum_blade').setDepth(4);

    const zone = this.scene.physics.add.image(x, y, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(26, 26);

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.hazardZones.push({
      type: 'pendulum',
      anchor,
      blade,
      zone,
      originX: x,
      originY: y - chainLen,
      len: chainLen,
      swing: obj.swing || 46,
      speed: obj.speed || 1.6,
      phase: obj.phase || 0,
    });
  }

  createSpikeWall(x, y, obj) {
    const spikes = this.scene.add.image(x, y, 'spike_wall');
    spikes.setDisplaySize(obj.width || 32, obj.height || 32);
    spikes.setDepth(4);
    if (obj.flipX) spikes.setFlipX(true);
    if (obj.flipY) spikes.setFlipY(true);

    const zone = this.scene.physics.add.image(x, y, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    const w = obj.width || 30;
    const h = obj.height || 24;
    zone.body.setSize(w, h);
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.hazardZones.push({ type: 'spike', sprite: spikes, zone });
  }

  createCrumblePlatform(x, y, obj) {
    const sprite = this.scene.physics.add.image(x, y, 'crumble_platform');
    sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.body.setSize(TILE_SIZE, TILE_SIZE);
    sprite.body.checkCollision.down = false;
    sprite.body.checkCollision.left = false;
    sprite.body.checkCollision.right = false;
    sprite.setDepth(3);

    this.crumblePlatforms.push({
      sprite,
      collapseDelay: obj.collapseDelay || 420,
      respawnDelay: obj.respawnDelay || 2600,
      crumbling: false,
      broken: false,
    });
  }

  createMagmaPool(x, y, obj) {
    const width = obj.width || 3;
    for (let i = 0; i < width; i++) {
      const tile = this.scene.add.image(x + (i - (width - 1) / 2) * TILE_SIZE, y, 'magma_tile');
      tile.setDepth(2);
      tile.setBlendMode(Phaser.BlendModes.ADD);
      tile.setAlpha(0.9);
      this.scene.tweens.add({
        targets: tile,
        alpha: 0.55,
        scaleY: 1.08,
        duration: 420 + i * 80,
        yoyo: true,
        repeat: -1,
      });
      this.decorations.push(tile);
    }

    const zone = this.scene.physics.add.image(x, y + 6, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(width * TILE_SIZE, 16);
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }
    this.hazardZones.push({ type: 'magma', zone });
  }

  startCrumble(cp) {
    if (!cp || cp.crumbling || cp.broken || !cp.sprite.active) return;
    cp.crumbling = true;

    this.scene.tweens.add({
      targets: cp.sprite,
      alpha: 0.25,
      x: cp.sprite.x + Phaser.Math.Between(-2, 2),
      duration: cp.collapseDelay,
      ease: 'Linear',
      onComplete: () => {
        if (!cp.sprite.active) return;
        cp.broken = true;
        cp.crumbling = false;
        cp.sprite.setVisible(false);
        cp.sprite.body.enable = false;
        cp.sprite.alpha = 1;
        this.scene.time.delayedCall(cp.respawnDelay, () => {
          if (!cp.sprite.active) return;
          cp.broken = false;
          cp.sprite.setVisible(true);
          cp.sprite.body.enable = true;
        });
      },
    });
  }

  applyHazardDamage(player, fromX) {
    if (this.hazardDamageCooldown > 0) return;
    this.hazardDamageCooldown = 180;
    player.takeDamage(1, fromX);
  }

  update(dt) {
    this.hazardDamageCooldown = Math.max(0, this.hazardDamageCooldown - dt);

    const t = this.scene.time.now / 1000;
    const dtSec = dt / 1000;

    for (const plat of this.movingPlatforms) {
      if (!plat.sprite || !plat.sprite.active) continue;
      const s = plat.sprite;
      const b = s.body;
      if (!b) continue;

      if (plat.axis === 'y') {
        const targetY = plat.baseY + Math.sin(t * plat.speed + plat.phase) * plat.range;
        b.velocity.x = 0;
        b.velocity.y = (targetY - s.y) / dtSec;
      } else {
        const targetX = plat.baseX + Math.sin(t * plat.speed + plat.phase) * plat.range;
        b.velocity.x = (targetX - s.x) / dtSec;
        b.velocity.y = 0;
      }
      if (plat.spin) {
        s.rotation += plat.spin * dtSec;
      }
    }

    for (const hz of this.hazardZones) {
      if (hz.type !== 'pendulum' || !hz.zone?.active) continue;
      const ang = Math.sin(t * hz.speed + hz.phase) * hz.swing;
      const rad = Phaser.Math.DegToRad(ang);
      const bx = hz.originX + Math.sin(rad) * hz.len;
      const by = hz.originY + Math.cos(rad) * hz.len;
      hz.blade.setPosition(bx, by);
      hz.blade.setRotation(rad);
      hz.zone.setPosition(bx, by);
      hz.zone.body.updateFromGameObject();

    }
  }

  setupAmbience(type) {
    if (this.fogParticles) { this.fogParticles.destroy(); this.fogParticles = null; }
    for (const e of this.dripEmitters) { e.destroy(); }
    this.dripEmitters = [];

    const rpw = this.roomPixelW;
    const rph = this.roomPixelH;

    const config = {
      cavern: { particle: 'particle_dust', quantity: 2, frequency: 150, alpha: { start: 0.3, end: 0 }, speedY: { min: 10, max: 30 } },
      tunnel: { particle: 'particle_dust', quantity: 3, frequency: 120, alpha: { start: 0.32, end: 0 }, speedY: { min: 8, max: 24 } },
      shaft: { particle: 'particle_dust', quantity: 2, frequency: 200, alpha: { start: 0.2, end: 0 }, speedY: { min: -30, max: -8 } },
      fungal: { particle: 'particle_teal', quantity: 2, frequency: 100, alpha: { start: 0.4, end: 0 }, speedY: { min: -20, max: -5 } },
      tunnel_fungal: { particle: 'particle_teal', quantity: 3, frequency: 85, alpha: { start: 0.38, end: 0 }, speedY: { min: -18, max: -4 } },
      crystal: { particle: 'particle_teal', quantity: 2, frequency: 180, alpha: { start: 0.3, end: 0 }, speedY: { min: -10, max: 10 } },
      tunnel_crystal: { particle: 'particle_teal', quantity: 3, frequency: 150, alpha: { start: 0.28, end: 0 }, speedY: { min: -8, max: 8 } },
      guardian: { particle: 'particle_white', quantity: 2, frequency: 120, alpha: { start: 0.25, end: 0 }, speedY: { min: -25, max: -8 } },
      tunnel_guardian: { particle: 'particle_white', quantity: 3, frequency: 100, alpha: { start: 0.22, end: 0 }, speedY: { min: -22, max: -6 } },
      mountain: { particle: 'particle_white', quantity: 2, frequency: 90, alpha: { start: 0.35, end: 0 }, speedY: { min: 15, max: 45 } },
      mountain_shaft: { particle: 'particle_dust', quantity: 2, frequency: 140, alpha: { start: 0.22, end: 0 }, speedY: { min: -35, max: -10 } },
    };

    const c = config[type] || config.cavern;
    this.fogParticles = this.scene.add.particles(0, 0, c.particle, {
      x: { min: 0, max: rpw },
      y: { min: 0, max: rph },
      lifespan: 5000, quantity: c.quantity, frequency: c.frequency,
      alpha: c.alpha, speedX: { min: -8, max: 8 }, speedY: c.speedY,
      scale: { start: 1.2, end: 0.3 }, blendMode: 'ADD',
    });
    this.fogParticles.setDepth(-1);

    // Water drips from ceiling in cavern/shaft rooms
    if (type === 'cavern' || type === 'shaft' || type === 'guardian' || type === 'mountain_shaft'
      || type === 'tunnel' || type === 'tunnel_fungal' || type === 'tunnel_crystal' || type === 'tunnel_guardian') {
      const dripCount = Math.floor(rpw / 200);
      for (let i = 0; i < dripCount; i++) {
        const dx = 80 + Math.random() * (rpw - 160);
        const drip = this.scene.add.particles(dx, 16, 'particle_drip', {
          lifespan: 2000, quantity: 1, frequency: 1500 + Math.random() * 2000,
          alpha: { start: 0.5, end: 0 }, speedY: { min: 40, max: 80 },
          speedX: 0, scale: { start: 0.8, end: 0.3 }, gravityY: 100,
        });
        drip.setDepth(2);
        this.dripEmitters.push(drip);
      }
    }
  }

  getTileAt(worldX, worldY) {
    const room = this.currentRoom;
    if (!room) return null;
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (row < 0 || row >= room.tiles.length || col < 0 || col >= room.tiles[0].length) return null;
    const tile = room.tiles[row][col];
    return tile === 1 || tile === 2 || tile === 3 ? tile : null;
  }

  lockDoors() {
    for (const d of this.doorZones) {
      if (d.pulseTween) d.pulseTween.pause();
      if (d.glowTween) d.glowTween.pause();
      d.door.setTint(0xff3333);
      d.door.setAlpha(0.78);
      if (d.portalGlow) {
        d.portalGlow.setTint(0xff4444);
        d.portalGlow.setAlpha(0.32);
      }
    }
    this.showRoomLockBarrier();
    this.showRoomLockEnemyNotice();
  }

  unlockDoors() {
    this.clearRoomLockNotice();
    this.destroyRoomLockVisuals();
    this.roomLocked = false;
    for (const d of this.doorZones) {
      d.door.clearTint();
      d.door.setAlpha(0.96);
      if (d.portalGlow) {
        d.portalGlow.clearTint();
        d.portalGlow.setAlpha(0.2);
      }
      if (d.pulseTween) d.pulseTween.resume();
      if (d.glowTween) d.glowTween.resume();
    }
    this.scene.cameras.main.flash(300, 64, 232, 192);
  }

  destroyRoomLockVisuals() {
    for (const tw of this.roomLockTweens) {
      if (tw && tw.stop) tw.stop();
    }
    this.roomLockTweens = [];
    for (const o of this.roomLockVisuals) {
      if (o && o.active) o.destroy();
    }
    this.roomLockVisuals = [];
  }

  showRoomLockBarrier() {
    this.destroyRoomLockVisuals();

    const rpw = this.roomPixelW;
    const rph = this.roomPixelH;
    const band = Math.max(12, Math.min(18, Math.floor(TILE_SIZE * 0.45)));
    const fill = 0x660011;
    const edge = 0xff3344;

    const addBand = (cx, cy, w, h) => {
      const r = this.scene.add.rectangle(cx, cy, w, h, fill)
        .setAlpha(0.35).setDepth(4).setScrollFactor(1);
      this.roomLockVisuals.push(r);
      const tw = this.scene.tweens.add({
        targets: r,
        alpha: { from: 0.2, to: 0.5 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.roomLockTweens.push(tw);
      return r;
    };

    addBand(rpw / 2, band / 2, rpw, band);
    addBand(rpw / 2, rph - band / 2, rpw, band);
    addBand(band / 2, rph / 2, band, rph);
    addBand(rpw - band / 2, rph / 2, band, rph);

    const g = this.scene.add.graphics().setDepth(10).setScrollFactor(1);
    g.lineStyle(3, edge, 0.92);
    g.strokeRect(2, 2, rpw - 4, rph - 4);
    g.lineStyle(2, edge, 0.55);
    const step = 22;
    for (let x = step; x < rpw; x += step) {
      g.lineBetween(x, 0, x, band + 8);
      g.lineBetween(x, rph, x, rph - band - 8);
    }
    for (let y = step; y < rph; y += step) {
      g.lineBetween(0, y, band + 8, y);
      g.lineBetween(rpw, y, rpw - band - 8, y);
    }
    this.roomLockVisuals.push(g);

    const twG = this.scene.tweens.add({
      targets: g,
      alpha: { from: 0.75, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.roomLockTweens.push(twG);
  }

  clearRoomLockNotice() {
    if (this.roomLockNoticeTimer) {
      this.roomLockNoticeTimer.remove(false);
      this.roomLockNoticeTimer = null;
    }
    if (this.roomLockNoticeText?.active) {
      this.scene.tweens.killTweensOf(this.roomLockNoticeText);
      this.roomLockNoticeText.destroy();
    }
    this.roomLockNoticeText = null;
  }

  /** Big red screen-fixed message: enemy-locked room (shown 7s). */
  showRoomLockEnemyNotice() {
    this.clearRoomLockNotice();

    const cam = this.scene.cameras.main;
    const msg = 'This room is sealed until you\ndefeat every enemy.\nClear them to unlock the exits.';
    const text = this.scene.add.text(cam.centerX, cam.height * 0.2, msg, {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ff2222',
      stroke: '#1a0000',
      strokeThickness: 10,
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(55);

    this.roomLockNoticeText = text;

    this.roomLockNoticeTimer = this.scene.time.delayedCall(7000, () => {
      this.roomLockNoticeTimer = null;
      if (!text.active) return;
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        duration: 450,
        ease: 'Sine.easeIn',
        onComplete: () => {
          if (text.active) text.destroy();
          if (this.roomLockNoticeText === text) this.roomLockNoticeText = null;
        },
      });
    });
  }

  checkRoomCleared() {
    if (!this.roomLocked) return;
    const alive = this.scene.enemies.getChildren().filter(e => !e.isDead);
    if (alive.length === 0) {
      this.unlockDoors();

      const text = this.scene.add.text(
        this.roomPixelW / 2, this.roomPixelH / 2 - 50, 'AREA CLEARED',
        { fontSize: '32px', fontFamily: 'monospace', color: '#40ffd8', stroke: '#000', strokeThickness: 5 },
      ).setOrigin(0.5).setDepth(20);

      this.scene.tweens.add({
        targets: text, alpha: 0, y: '-=30', duration: 2000, delay: 1000,
        onComplete: () => text.destroy(),
      });

      if (this.currentRoomId === 'room29') {
        this.scene.time.delayedCall(2500, () => {
          this.scene.showLevelComplete();
        });
      }
    }
  }

  onPlayerTouchEnemy(player, enemy) {
    if (enemy.canDamagePlayer && enemy.canDamagePlayer()) {
      player.takeDamage(enemy.damage, enemy.x);
    }
  }

  showRoomName(name) {
    const cam = this.scene.cameras.main;
    const text = this.scene.add.text(cam.width / 2, 70, name, {
      fontSize: '24px', fontFamily: 'monospace', color: '#8899aa', stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setAlpha(0).setScrollFactor(0);

    this.scene.tweens.add({
      targets: text, alpha: 0.8, duration: 800, hold: 2000, yoyo: true,
      onComplete: () => text.destroy(),
    });
  }

  clearCurrentRoom() {
    this.clearRoomLockNotice();

    if (this.wallLayer) { this.wallLayer.clear(true, true); this.wallLayer = null; }
    if (this.platformGroup) { this.platformGroup.clear(true, true); this.platformGroup = null; }

    for (const d of this.doorZones) {
      if (d.glowTween) d.glowTween.stop();
      if (d.pulseTween) d.pulseTween.stop();
      if (d.portalGlow && d.portalGlow.active) d.portalGlow.destroy();
      d.door.destroy();
    }
    this.doorZones = [];

    for (const o of this.abilityOrbs) {
      if (o.orb && o.orb.active) o.orb.destroy();
      if (o.glow && o.glow.active) o.glow.destroy();
    }
    this.abilityOrbs = [];

    for (const b of this.benches) {
      if (b.podBack) b.podBack.destroy();
      if (b.podFront) b.podFront.destroy();
      if (b.trigger) b.trigger.destroy();
      if (b.glow) b.glow.destroy();
    }
    this.benches = [];

    for (const p of this.healthPickups) { if (p && p.active) p.destroy(); }
    this.healthPickups = [];

    for (const c of this.coins) { if (c && c.active) c.destroy(); }
    this.coins = [];

    for (const t of this.teleports) {
      if (t.pad && t.pad.active) t.pad.destroy();
    }
    this.teleports = [];

    for (const d of this.decorations) { if (d && d.active) d.destroy(); }
    this.decorations = [];

    for (const mp of this.movingPlatforms) {
      if (mp.sprite && mp.sprite.active) mp.sprite.destroy();
    }
    this.movingPlatforms = [];

    for (const cp of this.crumblePlatforms) {
      if (cp.sprite && cp.sprite.active) cp.sprite.destroy();
    }
    this.crumblePlatforms = [];

    for (const hz of this.hazardZones) {
      if (hz.sprite && hz.sprite.active) hz.sprite.destroy();
      if (hz.anchor && hz.anchor.active) hz.anchor.destroy();
      if (hz.blade && hz.blade.active) hz.blade.destroy();
      if (hz.zone && hz.zone.active) hz.zone.destroy();
    }
    this.hazardZones = [];

    for (const n of this.npcs) {
      if (n.npc && n.npc.active) n.npc.destroy();
      if (n.zone && n.zone.active) n.zone.destroy();
    }
    this.npcs = [];

    if (this.scene.enemies) { this.scene.enemies.clear(true, true); }

    if (this.fogParticles) { this.fogParticles.destroy(); this.fogParticles = null; }

    for (const e of this.dripEmitters) { e.destroy(); }
    this.dripEmitters = [];

    this.destroyRoomLockVisuals();

    for (const l of this.parallaxLayers) { if (l && l.active) l.destroy(); }
    this.parallaxLayers = [];

    this.scene.physics.world.colliders.destroy();
    this.hazardDamageCooldown = 0;
  }
}
