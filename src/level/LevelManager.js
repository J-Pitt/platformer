import * as Phaser from 'phaser';
import { rooms, TILE_SIZE } from './rooms.js';
import { meetsAbilityRequirements } from './abilityGates.js';
import { organicDecorRng } from './organicCaveGen.js';
import { Crawler } from '../entities/Crawler.js';
import { Flyer } from '../entities/Flyer.js';
import { Boss } from '../entities/Boss.js';
import { Brute } from '../entities/Brute.js';
import { NPC } from '../entities/NPC.js';
import { ArmoredFlyer } from '../entities/ArmoredFlyer.js';
import { ChargerBrute } from '../entities/ChargerBrute.js';
import { Spitter } from '../entities/Spitter.js';
import { FrostWarden } from '../entities/FrostWarden.js';
import { VoidKing } from '../entities/VoidKing.js';
import { IbexRam } from '../entities/IbexRam.js';
import { RockHurler } from '../entities/RockHurler.js';
import { ThornSpider } from '../entities/ThornSpider.js';
import { BarkArcher } from '../entities/BarkArcher.js';
import { HawkDiver } from '../entities/HawkDiver.js';
import { RaiderHorseman } from '../entities/RaiderHorseman.js';
import { BannerPikeman } from '../entities/BannerPikeman.js';
import { Crossbowman } from '../entities/Crossbowman.js';
import { Lightwraith } from '../entities/Lightwraith.js';
import { PeakWarden } from '../entities/PeakWarden.js';
import { ThornrootHydra } from '../entities/ThornrootHydra.js';
import { WindbladeMarauder } from '../entities/WindbladeMarauder.js';
import { FallenPaladin } from '../entities/FallenPaladin.js';
import { ScouredSun } from '../entities/ScouredSun.js';

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
    this.fogParticles = null;
    this.parallaxLayers = [];
    this.dripEmitters = [];
    this.movingPlatforms = [];
    this.hazardZones = [];
    this.crumblePlatforms = [];
    this.hazardDamageCooldown = 0;
    this.fireballShooters = [];
    this.activeFireballs = [];
    this.floorSpikes = [];
    this.sawBlades = [];
    this.flameJets = [];
    this.icePatches = [];
    this.icicleDrops = [];
    this.activeIcicles = [];
    this.crushers = [];
    this.laserBeams = [];
    this.conveyors = [];
    this.phasePlatforms = [];
    this.arrowTurrets = [];
    this.activeArrowDarts = [];
    this.npcs = [];
    this.coins = [];
    this.teleports = [];
    this.checkpointShrines = [];
    this.loreFragments = [];
    this.secretWalls = [];
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
    this._levelCompleteTriggered = false;

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

    this.scene.cameraRig?.applyRoom(room);

    // Belt-and-suspenders: hard-snap the camera onto the player right now.
    // startFollow inside applyRoom is supposed to center instantly, but if
    // anything (a lingering follow target, a zoom change, a deadzone, etc.)
    // leaves the camera looking at stale coordinates, the player ends up
    // off-screen behind the fade-in. centerOn ignores follow state.
    const players = this.allPlayers.filter(Boolean);
    if (players.length) {
      const avgX = players.reduce((s, pl) => s + pl.x, 0) / players.length;
      const avgY = players.reduce((s, pl) => s + pl.y, 0) / players.length;
      this.scene.cameras.main.centerOn(avgX, avgY);
      if (this.scene._coopCamTarget) {
        this.scene._coopCamTarget.setPosition(avgX, avgY);
      }
    }
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
      // Chapter 2 outdoor biomes (use dedicated parallax if available, else fall back to cavern art).
      mountain_peak: { far: 'bg_far_peaks', mid: 'bg_mid_peaks' },
      mountain_pass: { far: 'bg_far_peaks', mid: 'bg_mid_peaks' },
      forest: { far: 'bg_far_forest', mid: 'bg_mid_forest' },
      forest_deep: { far: 'bg_far_forest', mid: 'bg_mid_forest' },
      plains: { far: 'bg_far_plains', mid: 'bg_mid_plains' },
      plains_storm: { far: 'bg_far_plains', mid: 'bg_mid_plains' },
      castle_courtyard: { far: 'bg_far_castle', mid: 'bg_mid_castle' },
      castle_interior: { far: 'bg_far_castle', mid: 'bg_mid_castle' },
      cathedral: { far: 'bg_far_cathedral', mid: 'bg_mid_cathedral' },
    };
    for (const k of Object.keys(bgKeys)) {
      if (!this.scene.textures.exists(bgKeys[k].far)) bgKeys[k].far = 'bg_far_cavern';
      if (!this.scene.textures.exists(bgKeys[k].mid)) bgKeys[k].mid = 'bg_mid_cavern';
    }

    const keys = bgKeys[amb] || bgKeys.cavern;

    // Deepest sky/void layer — farthest parallax (guide: multiple BG layers)
    const skyColor = {
      cavern: 0x020108, fungal: 0x020a06, crystal: 0x06020e, guardian: 0x080210, shaft: 0x020108,
      mountain: 0x020108, mountain_shaft: 0x020108,
      tunnel: 0x010206, tunnel_fungal: 0x010504, tunnel_crystal: 0x03010a, tunnel_guardian: 0x040208,
      mountain_peak: 0x1a2a4a, mountain_pass: 0x182038,
      forest: 0x082012, forest_deep: 0x04140c,
      plains: 0x284868, plains_storm: 0x182030,
      castle_courtyard: 0x1a1828, castle_interior: 0x100810,
      cathedral: 0x201020,
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
      mountain_peak: 0x203858,
      mountain_pass: 0x1a2850,
      forest: 0x0c2018,
      forest_deep: 0x061810,
      plains: 0x2a4868,
      plains_storm: 0x1a2030,
      castle_courtyard: 0x201830,
      castle_interior: 0x180820,
      cathedral: 0x3a1840,
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
      mountain_peak: 0.18,
      mountain_pass: 0.22,
      forest: 0.3,
      forest_deep: 0.4,
      plains: 0.15,
      plains_storm: 0.35,
      castle_courtyard: 0.32,
      castle_interior: 0.44,
      cathedral: 0.36,
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
      mountain_peak: { color: 0xbbcce0, alpha: 0.07 },
      mountain_pass: { color: 0x8aa0c8, alpha: 0.06 },
      forest: { color: 0x88cc88, alpha: 0.055 },
      forest_deep: { color: 0x55aa66, alpha: 0.05 },
      plains: { color: 0xffe0a0, alpha: 0.06 },
      plains_storm: { color: 0x6688cc, alpha: 0.06 },
      castle_courtyard: { color: 0xaa99cc, alpha: 0.05 },
      castle_interior: { color: 0x8866aa, alpha: 0.055 },
      cathedral: { color: 0xffcc66, alpha: 0.09 },
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
      mountain_peak: 'bg_close_peaks',
      mountain_pass: 'bg_close_peaks',
      forest: 'bg_close_forest',
      forest_deep: 'bg_close_forest',
      plains: 'bg_close_plains',
      plains_storm: 'bg_close_plains',
      castle_courtyard: 'bg_close_castle',
      castle_interior: 'bg_close_castle',
      cathedral: 'bg_close_cathedral',
    };
    for (const k of Object.keys(keyMap)) {
      if (!this.scene.textures.exists(keyMap[k])) keyMap[k] = 'bg_close_cavern';
    }
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
          if (amb === 'mountain' || amb === 'mountain_shaft' || amb === 'mountain_peak' || amb === 'mountain_pass') {
            platKey = pickTerrace('tile_platform_mountain');
          } else if (amb === 'fungal' || amb === 'tunnel_fungal') {
            platKey = pickTerrace('tile_platform_fungal');
          } else if (amb === 'crystal' || amb === 'guardian' || amb === 'tunnel_crystal' || amb === 'tunnel_guardian') {
            platKey = pickTerrace('tile_platform_crystal');
          } else if (amb === 'forest' || amb === 'forest_deep') {
            if (this.scene.textures.exists('tile_platform_forest')) {
              platKey = pickTerrace('tile_platform_forest');
            }
          } else if (amb === 'plains' || amb === 'plains_storm') {
            if (this.scene.textures.exists('tile_platform_plains')) {
              platKey = pickTerrace('tile_platform_plains');
            }
          } else if (amb === 'castle_courtyard' || amb === 'castle_interior' || amb === 'cathedral') {
            if (this.scene.textures.exists('tile_platform_castle')) {
              platKey = pickTerrace('tile_platform_castle');
            }
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

    const gs = this.scene.gameState;
    const checkFlag = (k) => !!gs && gs.hasFlag(k);
    const checkBoss = (k) => !!gs && gs.isBossDefeated(k);

    for (const obj of room.objects || []) {
      // Gating: allow objects to be filtered by world flags / boss clears so
      // persistent story beats (e.g. chapter2_unlocked) can reshape a room
      // without duplicating layouts.
      if (obj.requiresFlag && !checkFlag(obj.requiresFlag)) continue;
      if (obj.hiddenIfFlag && checkFlag(obj.hiddenIfFlag)) continue;
      if (obj.requiresBoss && !checkBoss(obj.requiresBoss)) continue;
      if (obj.hiddenIfBoss && checkBoss(obj.hiddenIfBoss)) continue;

      const px = obj.x * TILE_SIZE + TILE_SIZE / 2;
      const py = obj.y * TILE_SIZE + TILE_SIZE / 2;

      switch (obj.type) {
        case 'door': this.createDoor(px, py, obj); break;
        case 'ability_orb': this.createAbilityOrb(px, py, obj); break;
        case 'bench': this.createBench(px, py); break;
        case 'crawler': this.createCrawler(px, py); break;
        case 'flyer': this.createFlyer(px, py); break;
        case 'boss': this.createBoss(px, py, obj); break;
        case 'brute': this.createBrute(px, py); break;
        case 'armored_flyer': this.createArmoredFlyer(px, py); break;
        case 'charger': this.createChargerBrute(px, py); break;
        case 'spitter': this.createSpitter(px, py); break;
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
        case 'fireball_shooter': this.createFireballShooter(px, py, obj); break;
        case 'floor_spikes': this.createFloorSpikes(px, py, obj); break;
        case 'saw_blade': this.createSawBlade(px, py, obj); break;
        case 'flame_jet': this.createFlameJet(px, py, obj); break;
        case 'ice_patch': this.createIcePatch(px, py, obj); break;
        case 'icicle_drop': this.createIcicleDrop(px, py, obj); break;
        case 'crusher': this.createCrusher(px, py, obj); break;
        case 'laser_beam': this.createLaserBeam(px, py, obj); break;
        case 'conveyor': this.createConveyor(px, py, obj); break;
        case 'phase_platform': this.createPhasePlatform(px, py, obj); break;
        case 'arrow_turret': this.createArrowTurret(px, py, obj); break;
        case 'checkpoint_shrine': this.createCheckpointShrine(px, py, obj); break;
        case 'lore_fragment': this.createLoreFragment(px, py, obj); break;
        case 'secret_wall': this.createSecretWall(px, py, obj); break;
        case 'weapon_pickup': this.createWeaponPickup(px, py, obj); break;
        case 'item_pickup': this.createItemPickup(px, py, obj); break;
        case 'ice_crystal_cluster':
        case 'frozen_banner':
        case 'fungal_bloom_large':
        case 'void_rift':
          this.createDecoration(px, py, obj.type); break;
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
        case 'oak_tree':
        case 'thorn_bush':
        case 'wild_flower':
        case 'wheat_tuft':
        case 'fence_post':
        case 'banner_red':
        case 'banner_gold':
        case 'castle_window':
        case 'ivy_drape':
        case 'grass_blade':
        case 'rain_streak':
        case 'storm_cloud':
        case 'mountain_flag':
        case 'fog_bank':
          this.createDecoration(px, py, obj.type === 'fungus' ? 'fungus_glow' : obj.type);
          break;

        // Chapter 2 additions
        case 'crumble_wall': this.createCrumbleWall(px, py, obj); break;
        case 'grapple_anchor': this.createGrappleAnchor(px, py, obj); break;
        case 'checkpoint_totem': this.createCheckpointShrine(px, py, obj); break;
        case 'falling_rocks': this.createFallingRocks(px, py, obj); break;
        case 'snow_drift_slip': this.createIcePatch(px, py, { ...obj, _snow: true }); break;
        case 'thorn_snare': this.createThornSnare(px, py, obj); break;
        case 'bee_swarm_zone': this.createBeeSwarmZone(px, py, obj); break;
        case 'lightning_strike': this.createLightningStrike(px, py, obj); break;
        case 'wind_gust_zone': this.createWindGustZone(px, py, obj); break;
        case 'swinging_chandelier': this.createSwingingChandelier(px, py, obj); break;
        case 'arrow_slit_volley': this.createArrowSlitVolley(px, py, obj); break;
        case 'portcullis_drop': this.createPortcullisDrop(px, py, obj); break;

        case 'ibex_ram': this.createIbexRam(px, py); break;
        case 'rock_hurler': this.createRockHurler(px, py); break;
        case 'thorn_spider': this.createThornSpider(px, py); break;
        case 'bark_archer': this.createBarkArcher(px, py); break;
        case 'hawk_diver': this.createHawkDiver(px, py); break;
        case 'raider_horseman': this.createRaiderHorseman(px, py); break;
        case 'banner_pikeman': this.createBannerPikeman(px, py); break;
        case 'crossbowman': this.createCrossbowman(px, py); break;
        case 'lightwraith': this.createLightwraith(px, py); break;
      }
    }
  }

  get allPlayers() {
    if (typeof this.scene.getActivePlayers === 'function') {
      return this.scene.getActivePlayers();
    }
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

    // Drop the player onto the nearest floor below the spawn point. Prevents
    // portals from dumping the player into a bottomless pit / void when a
    // redesigned room shifts its floor rows. If no floor is found within
    // ~10 tiles we log and leave the spawn alone (caller will see them fall
    // and hit a hazard / room edge instead of vanishing silently).
    {
      const col = Math.floor(sx / TILE_SIZE);
      const startRow = Math.floor(sy / TILE_SIZE);
      const tiles = room.tiles;
      let floorRow = -1;
      if (col >= 0 && col < tiles[0].length) {
        for (let r = Math.max(0, startRow); r < Math.min(tiles.length, startRow + 10); r++) {
          const t = tiles[r]?.[col];
          if (t === 1 || t === 2 || t === 3) {
            floorRow = r;
            break;
          }
        }
      }
      if (floorRow >= 0) {
        const groundedSy = floorRow * TILE_SIZE - TILE_SIZE / 2;
        if (groundedSy > sy) sy = groundedSy;
      } else {
        console.warn(
          `[LevelManager] No floor below spawn (${spawnX},${spawnY}) in ${this.currentRoomId}; `
          + 'player may fall off-screen.',
        );
      }
    }

    const now = this.scene.time?.now ?? 0;
    const cpX = room.playerSpawn.x * TILE_SIZE + TILE_SIZE / 2;
    const cpY = room.playerSpawn.y * TILE_SIZE + TILE_SIZE / 2;

    // In couch co-op, fan the players out horizontally around the spawn
    // so they don't overlap and immediately shove each other into a wall.
    const players = this.allPlayers.filter(Boolean);
    const nP = players.length;
    players.forEach((p, idx) => {
      const offset = nP > 1 ? (idx - (nP - 1) / 2) * TILE_SIZE : 0;

      if (this.scene.tweens) this.scene.tweens.killTweensOf(p);

      p.setPosition(sx + offset, sy);
      p.setScale(1);
      p.setAlpha(1);
      p.setVisible(true);
      p.setAngle(0);
      p.setRotation(0);
      if (p === this.scene.player && typeof p.clearTint === 'function') {
        p.clearTint();
      }
      if (p.body) {
        p.body.enable = true;
        p.body.allowGravity = true;
        p.body.velocity.set(0, 0);
      }
      delete p._enteringDoor;

      // Block door-portal re-triggering for a short window after a room
      // load. Prevents ping-pong when a spawn point lands next to the return
      // portal.
      p._doorCooldownUntil = now + 600;

      p.spawnX = sx + offset;
      p.spawnY = sy;
      p.checkpointX = cpX + offset;
      p.checkpointY = cpY;
      p._checkpointRoom = this.currentRoomId;
      p.visitedRooms?.add(this.currentRoomId);
    });
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

    // Back-of-portal radial glow (soft teal halo around the opening).
    const portalHalo = this.scene.add.image(cx, cy, 'door');
    portalHalo.setDepth(2);
    portalHalo.setBlendMode(Phaser.BlendModes.ADD);
    portalHalo.setAlpha(0.35);
    portalHalo.setDisplaySize(ow * 1.7, oh * 1.25);

    const haloTween = this.scene.tweens.add({
      targets: portalHalo,
      alpha: { from: 0.22, to: 0.45 },
      scaleX: { from: portalHalo.scaleX * 0.95, to: portalHalo.scaleX * 1.08 },
      scaleY: { from: portalHalo.scaleY * 0.95, to: portalHalo.scaleY * 1.08 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

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
    door.setDepth(5);
    door.targetRoom = obj.targetRoom;
    door.spawnX = obj.spawnX;
    door.spawnY = obj.spawnY;
    door.requiresAbilities = Array.isArray(obj.requiresAbilities) ? obj.requiresAbilities : [];
    door.setAlpha(0.96);

    // Trigger body sizing:
    //   - Vertical door (wall opening): body matches opening width so the
    //     player has to walk right up to it. No horizontal "pull-in" from
    //     several tiles away.
    //   - Horizontal door (floor/ceiling): keep a small vertical buffer
    //     so a player running off an approach ledge still triggers the
    //     portal instead of falling past it.
    //
    // Post-load re-entry is handled by the player's _doorCooldownUntil
    // timer below, so we don't need an oversized trigger body for that.
    if (oh >= ow) {
      door.body.setSize(ow, oh, true);
    } else {
      door.body.setSize(ow, oh + TILE_SIZE, true);
    }

    const pulseTween = this.scene.tweens.add({
      targets: door,
      alpha: { from: 0.9, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const onDoor = (player) => {
      // The scene-wide `transitioning` flag is set synchronously inside
      // transitionToRoom, so it guards against the physics engine firing
      // this overlap a second time before the fade begins.
      if (this.scene.transitioning) return;
      // Post-load cooldown: keep the player from getting ping-ponged
      // right back to the previous room when the spawn lands inside the
      // return portal's enlarged trigger body.
      const now = this.scene.time?.now ?? 0;
      if (player._doorCooldownUntil && now < player._doorCooldownUntil) return;
      if (!meetsAbilityRequirements(player, door.requiresAbilities)) return;

      // Brief portal flash — purely a visual on the door itself, never on
      // the player. We must not tween the player's scale / alpha / angle
      // here; if the player is still in a transformed state when
      // positionPlayer runs (due to timing between the tween and the
      // camera fade), the player ends up shrunken and almost invisible
      // in the new room.
      this.scene.tweens.killTweensOf(portalHalo);
      this.scene.tweens.killTweensOf(portalGlow);
      this.scene.tweens.killTweensOf(door);
      portalHalo.setAlpha(0.6);
      portalGlow.setAlpha(0.95);
      this.scene.tweens.add({
        targets: [portalHalo, portalGlow],
        alpha: { from: 0.9, to: 1 },
        scaleX: '*=1.35',
        scaleY: '*=1.2',
        duration: 180,
        ease: 'Cubic.easeOut',
      });
      this.scene.tweens.add({
        targets: door,
        alpha: 1,
        scaleX: '*=1.15',
        scaleY: '*=1.05',
        duration: 180,
        ease: 'Cubic.easeOut',
      });

      const spark = this.scene.add.image(door.x, door.y, 'particle_teal');
      spark.setBlendMode(Phaser.BlendModes.ADD);
      spark.setDepth(6);
      spark.setScale(0.1);
      spark.setAlpha(0.9);
      this.scene.tweens.add({
        targets: spark,
        scale: 8,
        alpha: 0,
        duration: 260,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });

      this.scene.transitionToRoom(door.targetRoom, door.spawnX, door.spawnY);
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, door, onDoor);
    }
    this.doorZones.push({ door, portalGlow, portalHalo, glowTween, haloTween, pulseTween });
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
    // Legacy "rest pod" doorway has been retired in favor of the obelisk
    // shrine. Room data still contains {type:'bench'} entries; we route
    // them through the same checkpoint-shrine path so existing save points
    // are preserved (and end up with the nicer obelisk visual).
    this.createCheckpointShrine(x, y, {});
  }

  createCrawler(x, y) {
    const crawler = new Crawler(this.scene, x, y);
    this.scene.enemies.add(crawler);
  }

  createFlyer(x, y) {
    const flyer = new Flyer(this.scene, x, y);
    this.scene.enemies.add(flyer);
  }

  createBoss(x, y, obj = {}) {
    const bossType = obj.bossType || 'bone_tyrant';
    let boss;
    switch (bossType) {
      case 'void_king':    boss = new VoidKing(this.scene, x, y); break;
      case 'frost_warden': boss = new FrostWarden(this.scene, x, y); break;
      case 'peak_warden':       boss = new PeakWarden(this.scene, x, y); break;
      case 'thornroot_hydra':   boss = new ThornrootHydra(this.scene, x, y); break;
      case 'windblade_marauder': boss = new WindbladeMarauder(this.scene, x, y); break;
      case 'fallen_paladin':    boss = new FallenPaladin(this.scene, x, y); break;
      case 'scoured_sun':       boss = new ScouredSun(this.scene, x, y); break;
      case 'bone_tyrant':
      default:             boss = new Boss(this.scene, x, y); break;
    }
    this.scene.enemies.add(boss);
  }

  createBrute(x, y) {
    const brute = new Brute(this.scene, x, y);
    this.scene.enemies.add(brute);
  }

  createArmoredFlyer(x, y) {
    const af = new ArmoredFlyer(this.scene, x, y);
    this.scene.enemies.add(af);
  }

  createChargerBrute(x, y) {
    const cb = new ChargerBrute(this.scene, x, y);
    this.scene.enemies.add(cb);
  }

  createSpitter(x, y) {
    const sp = new Spitter(this.scene, x, y);
    this.scene.enemies.add(sp);
  }

  // ----- Chapter 2 enemies -------------------------------------------------

  createIbexRam(x, y) { this.scene.enemies.add(new IbexRam(this.scene, x, y)); }
  createRockHurler(x, y) { this.scene.enemies.add(new RockHurler(this.scene, x, y)); }
  createThornSpider(x, y) { this.scene.enemies.add(new ThornSpider(this.scene, x, y)); }
  createBarkArcher(x, y) { this.scene.enemies.add(new BarkArcher(this.scene, x, y)); }
  createHawkDiver(x, y) { this.scene.enemies.add(new HawkDiver(this.scene, x, y)); }
  createRaiderHorseman(x, y) { this.scene.enemies.add(new RaiderHorseman(this.scene, x, y)); }
  createBannerPikeman(x, y) { this.scene.enemies.add(new BannerPikeman(this.scene, x, y)); }
  createCrossbowman(x, y) { this.scene.enemies.add(new Crossbowman(this.scene, x, y)); }
  createLightwraith(x, y) { this.scene.enemies.add(new Lightwraith(this.scene, x, y)); }

  /**
   * A solid physical wall tile, drawn with a weathered stone-slab texture,
   * that can be shattered by `crumbleChapterWall()`. Used to seal the east
   * exit of room29 until The Void King falls.
   */
  createCrumbleWall(x, y, obj) {
    if (!this.wallLayer) return;
    const w = obj.w || 2;
    const h = obj.h || 4;
    const tx = Math.floor(obj.x);
    const ty = Math.floor(obj.y);
    const group = { sprites: [], id: obj.id || 'default' };
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const sx = (tx + c) * TILE_SIZE + TILE_SIZE / 2;
        const sy = (ty + r) * TILE_SIZE + TILE_SIZE / 2;
        const key = this.scene.textures.exists('tile_crumble_seal')
          ? 'tile_crumble_seal' : 'tile_wall';
        const wall = this.wallLayer.create(sx, sy, key);
        wall.setDisplaySize(TILE_SIZE, TILE_SIZE);
        wall.setDepth(3);
        wall.refreshBody();
        group.sprites.push(wall);
      }
    }
    if (!this.crumbleWalls) this.crumbleWalls = [];
    this.crumbleWalls.push(group);
  }

  /**
   * Physically dismantle every crumble_wall in the current room. Called from
   * `GameScene.triggerEastWallCrumble()`. Pieces tween out with dust plumes
   * and the sprites/colliders are removed so the player can walk through.
   */
  crumbleChapterWall() {
    if (!this.crumbleWalls || !this.crumbleWalls.length) return;
    for (const group of this.crumbleWalls) {
      for (let i = 0; i < group.sprites.length; i++) {
        const s = group.sprites[i];
        if (!s || !s.active) continue;
        const delay = 40 * i;
        if (this.scene.dustEmitter) {
          this.scene.time.delayedCall(delay, () => {
            this.scene.dustEmitter.emitParticleAt(s.x, s.y, 6);
          });
        }
        this.scene.tweens.add({
          targets: s,
          alpha: 0,
          y: s.y + 24 + Math.random() * 32,
          angle: (Math.random() - 0.5) * 40,
          scaleX: 0.1, scaleY: 0.1,
          duration: 900, delay,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            if (s.body) s.body.enable = false;
            s.destroy();
          },
        });
      }
    }
    this.crumbleWalls = [];
  }

  /**
   * Static, gravity-less anchor point the player's grapple projectile can
   * target. Stored in `this.grappleAnchors` for Combat system lookup.
   */
  createGrappleAnchor(x, y, obj) {
    const key = this.scene.textures.exists('grapple_anchor') ? 'grapple_anchor' : 'door';
    const anchor = this.scene.add.image(x, y, key);
    anchor.setDepth(3);
    const pulse = this.scene.tweens.add({
      targets: anchor,
      scale: { from: 0.9, to: 1.1 },
      alpha: { from: 0.85, to: 1 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    if (!this.grappleAnchors) this.grappleAnchors = [];
    this.grappleAnchors.push({ sprite: anchor, pulse, x, y });
  }

  // ----- Chapter 2 trap handlers ------------------------------------------

  /**
   * Periodic falling rocks trap: every N ms, drop a rock from (x, top) down
   * to the floor. Rocks deal damage on player overlap.
   */
  createFallingRocks(x, y, obj) {
    const interval = obj.interval || 2600;
    const dropHeight = (obj.dropHeight || 6) * TILE_SIZE;
    const warningKey = this.scene.textures.exists('rock_warning') ? 'rock_warning' : 'particle_dust';
    const rockKey = this.scene.textures.exists('falling_rock') ? 'falling_rock' : 'particle_dust';

    const timer = this.scene.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => {
        if (!this.scene.player || this.scene.transitioning) return;
        const startY = y - dropHeight;
        const warn = this.scene.add.image(x, y, warningKey)
          .setDepth(4).setAlpha(0.7).setTint(0xff6644);
        this.scene.tweens.add({
          targets: warn, alpha: { from: 0.3, to: 0.9 },
          duration: 180, yoyo: true, repeat: 2,
          onComplete: () => warn.destroy(),
        });
        this.scene.time.delayedCall(900, () => {
          const rock = this.scene.physics.add.image(x, startY, rockKey).setDepth(5);
          rock.body.allowGravity = true;
          rock.setScale(1.4);
          rock.damage = 1;
          for (const player of this.allPlayers) {
            const ov = this.scene.physics.add.overlap(player, rock, () => {
              if (rock._spent) return;
              rock._spent = true;
              if (player.takeDamage && rock.damage) player.takeDamage(rock.damage, rock.x);
              rock.destroy();
            });
            rock._ov = rock._ov || [];
            rock._ov.push(ov);
          }
          this.scene.physics.add.collider(rock, this.wallLayer, () => {
            if (this.scene.dustEmitter) this.scene.dustEmitter.emitParticleAt(rock.x, rock.y, 6);
            this.scene.time.delayedCall(260, () => { if (rock.active) rock.destroy(); });
          });
          this.hazardZones.push({ sprite: rock });
        });
      },
    });
    this.hazardZones.push({ zone: { destroy: () => timer.remove(false) } });
  }

  /**
   * Thorn snare: a patch on the floor. Slows the player and ticks damage
   * every 400ms while standing in it.
   */
  createThornSnare(x, y, obj) {
    const key = this.scene.textures.exists('thorn_snare') ? 'thorn_snare' : 'particle_dust';
    const sprite = this.scene.add.image(x, y, key).setDepth(3);
    const zone = this.scene.physics.add.image(x, y, key).setAlpha(0);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(TILE_SIZE * 2, TILE_SIZE);
    let lastDmg = 0;
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        const now = this.scene.time.now;
        if (now - lastDmg < 400) return;
        lastDmg = now;
        if (player.takeDamage) player.takeDamage(1, x);
      });
    }
    this.hazardZones.push({ sprite, zone });
  }

  /**
   * Bee swarm: a hovering cloud that pursues a short distance when the
   * player enters it, then returns. Deals contact damage.
   */
  createBeeSwarmZone(x, y, obj) {
    const key = this.scene.textures.exists('bee_swarm') ? 'bee_swarm' : 'particle_dust';
    const sprite = this.scene.add.image(x, y, key).setDepth(4).setAlpha(0.9);
    this.scene.tweens.add({
      targets: sprite,
      x: { from: x - 16, to: x + 16 },
      y: { from: y - 8, to: y + 8 },
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const zone = this.scene.physics.add.image(x, y, key).setAlpha(0);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(TILE_SIZE * 3, TILE_SIZE * 2);
    let lastDmg = 0;
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        const now = this.scene.time.now;
        if (now - lastDmg < 500) return;
        lastDmg = now;
        if (player.takeDamage) player.takeDamage(1, x);
      });
    }
    this.hazardZones.push({ sprite, zone });
  }

  /**
   * Lightning strike trap: periodic bolt falls in a fixed x column. Brief
   * warning flash, then a vertical damaging beam.
   */
  createLightningStrike(x, y, obj) {
    const interval = obj.interval || 3200;
    const phase = obj.phase || 0;
    const boltKey = this.scene.textures.exists('lightning_bolt') ? 'lightning_bolt' : 'particle_teal';

    let t = 0;
    const timer = this.scene.time.addEvent({
      delay: 100, loop: true,
      callback: () => {
        t += 100;
        if ((t + phase) % interval < 100) this.triggerLightning(x, boltKey);
      },
    });
    this.hazardZones.push({ zone: { destroy: () => timer.remove(false) } });
  }

  triggerLightning(x, boltKey) {
    const rph = this.roomPixelH;
    const warn = this.scene.add.rectangle(x, rph / 2, 8, rph, 0xffff88, 0.4)
      .setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: warn, alpha: 0.9, duration: 240, yoyo: true });
    this.scene.time.delayedCall(520, () => {
      warn.destroy();
      const bolt = this.scene.add.image(x, rph / 2, boltKey).setDisplaySize(16, rph).setDepth(6)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.cameras.main.flash(180, 240, 240, 180);
      this.scene.cameras.main.shake(180, 0.006);
      const zone = this.scene.physics.add.image(x, rph / 2, 'particle_teal').setAlpha(0);
      zone.body.allowGravity = false;
      zone.body.setImmovable(true);
      zone.body.setSize(16, rph);
      for (const player of this.allPlayers) {
        this.scene.physics.add.overlap(player, zone, () => {
          if (zone._spent) return; zone._spent = true;
          if (player.takeDamage) player.takeDamage(2, x);
        });
      }
      this.scene.time.delayedCall(220, () => { bolt.destroy(); zone.destroy(); });
    });
  }

  /**
   * Wind gust zone: horizontal push on the player while overlapping. Used
   * for gliding puzzles — push direction is obj.dir ('left'|'right'|'up').
   */
  createWindGustZone(x, y, obj) {
    const key = this.scene.textures.exists('wind_gust') ? 'wind_gust' : 'particle_dust';
    const w = (obj.w || 3) * TILE_SIZE;
    const h = (obj.h || 4) * TILE_SIZE;
    const dir = obj.dir || 'up';
    const strength = obj.strength || 260;

    const sprite = this.scene.add.tileSprite(x, y, w, h, key).setDepth(3).setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: sprite, alpha: { from: 0.35, to: 0.7 }, duration: 800, yoyo: true, repeat: -1,
    });
    if (dir === 'up' || dir === 'down') {
      this._windGustScrollY = (this._windGustScrollY || 0);
    }
    const zone = this.scene.physics.add.image(x, y, key).setAlpha(0);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(w, h);
    zone.body.checkCollision.none = true;

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        if (!player.body) return;
        if (dir === 'up') player.body.velocity.y = Math.min(player.body.velocity.y, -strength);
        else if (dir === 'down') player.body.velocity.y = Math.max(player.body.velocity.y, strength * 0.6);
        else if (dir === 'left') player.body.velocity.x = Math.min(player.body.velocity.x, -strength);
        else if (dir === 'right') player.body.velocity.x = Math.max(player.body.velocity.x, strength);
      });
    }
    this.hazardZones.push({ sprite, zone });
  }

  /**
   * Swinging chandelier: visual + lethal swinging brass arc across the
   * ceiling. Pendulum motion similar to pendulum_trap but with damage tick.
   */
  createSwingingChandelier(x, y, obj) {
    const length = obj.length || 96;
    const swing = obj.swing || 60;
    const speed = obj.speed || 1.2;
    const phase = obj.phase || 0;
    const anchorKey = this.scene.textures.exists('chandelier_anchor') ? 'chandelier_anchor' : 'chain';
    const bobKey = this.scene.textures.exists('chandelier') ? 'chandelier' : 'saw_blade';

    const anchor = this.scene.add.image(x, y, anchorKey).setDepth(3);
    const bob = this.scene.physics.add.image(x, y + length, bobKey).setDepth(4);
    bob.body.allowGravity = false;
    bob.body.setImmovable(true);
    bob.body.setSize(48, 24);
    bob.damage = 1;

    const start = this.scene.time.now;
    const timer = this.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (!bob.active) return;
        const t = (this.scene.time.now - start) / 1000;
        const ang = Math.sin(t * speed + phase) * (swing * Math.PI / 180);
        bob.x = x + Math.sin(ang) * length;
        bob.y = y + Math.cos(ang) * length;
      },
    });
    let lastDmg = 0;
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, bob, () => {
        const now = this.scene.time.now;
        if (now - lastDmg < 500) return;
        lastDmg = now;
        if (player.takeDamage) player.takeDamage(1, bob.x);
      });
    }
    this.hazardZones.push({ sprite: anchor, blade: bob, zone: { destroy: () => timer.remove(false) } });
  }

  /**
   * Arrow slit volley: a wall slit that fires horizontal arrows on interval.
   */
  createArrowSlitVolley(x, y, obj) {
    const interval = obj.interval || 2400;
    const dir = obj.dir === 'left' ? -1 : 1;
    const speed = obj.speed || 280;
    const slitKey = this.scene.textures.exists('arrow_slit') ? 'arrow_slit' : 'tile_wall_2';
    const arrowKey = this.scene.textures.exists('arrow_proj') ? 'arrow_proj' : 'particle_teal';

    const slit = this.scene.add.image(x, y, slitKey).setDepth(3);
    const timer = this.scene.time.addEvent({
      delay: interval, loop: true,
      callback: () => {
        if (!this.scene.player) return;
        const arr = this.scene.physics.add.image(x + dir * 12, y, arrowKey).setDepth(4).setFlipX(dir < 0);
        arr.body.allowGravity = false;
        arr.setVelocityX(dir * speed);
        arr.damage = 1;
        for (const player of this.allPlayers) {
          this.scene.physics.add.overlap(player, arr, () => {
            if (arr._spent) return; arr._spent = true;
            if (player.takeDamage) player.takeDamage(1, arr.x);
            arr.destroy();
          });
        }
        this.scene.physics.add.collider(arr, this.wallLayer, () => arr.destroy());
        this.scene.time.delayedCall(2200, () => { if (arr.active) arr.destroy(); });
      },
    });
    this.hazardZones.push({ sprite: slit, zone: { destroy: () => timer.remove(false) } });
  }

  /**
   * Portcullis: a heavy iron gate that drops when the player steps into its
   * tile column, then slowly retracts. Deals damage if the player is under.
   */
  createPortcullisDrop(x, y, obj) {
    const dropDist = (obj.dropDist || 4) * TILE_SIZE;
    const key = this.scene.textures.exists('portcullis') ? 'portcullis' : 'tile_wall';
    const gate = this.scene.physics.add.image(x, y - dropDist, key).setDepth(3);
    gate.body.allowGravity = false;
    gate.body.setImmovable(true);
    gate.body.setSize(TILE_SIZE, TILE_SIZE * 3);
    gate.damage = 2;

    const trigger = this.scene.physics.add.image(x, y + TILE_SIZE * 2, 'particle_dust').setAlpha(0);
    trigger.body.allowGravity = false;
    trigger.body.setImmovable(true);
    trigger.body.setSize(TILE_SIZE, TILE_SIZE * 4);

    let dropping = false;
    const dropIt = () => {
      if (dropping) return; dropping = true;
      this.scene.tweens.add({
        targets: gate, y: y, duration: 180, ease: 'Cubic.easeIn',
        onComplete: () => {
          this.scene.cameras.main.shake(120, 0.006);
          this.scene.time.delayedCall(1600, () => {
            this.scene.tweens.add({
              targets: gate, y: y - dropDist, duration: 1400, ease: 'Sine.easeInOut',
              onComplete: () => { dropping = false; },
            });
          });
        },
      });
    };
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, trigger, dropIt);
      this.scene.physics.add.overlap(player, gate, () => {
        if (!dropping) return;
        if (player.takeDamage) player.takeDamage(1, gate.x);
      });
    }
    this.hazardZones.push({ sprite: gate, zone: trigger });
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
      if (!meetsAbilityRequirements(player, pad.requiresAbilities)) return;
      this.scene.transitionToRoom(pad.targetRoom, pad.spawnX, pad.spawnY);
    };

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, pad, onTeleport);
    }
    this.teleports.push({ pad, glow });
  }

  createMerchantShop(x, y, obj) {
    const npcType = obj.npcType || 'merchant';
    const npcObj = {
      npcType,
      dialogue: obj.dialogue || [
        'Welcome, traveler. I have wares if you have coin.',
      ],
    };
    this.createNPC(x, y, npcObj);

    const items = obj.items || [
      { name: 'Ether Vial', cost: 6, type: 'consumable', id: 'ether_vial' },
      { name: 'Phantom Edge', cost: 18, type: 'weapon', id: 'phantom_edge' },
      { name: "Warden's Greatsword", cost: 32, type: 'weapon', id: 'warden_greatsword' },
      { name: 'Throwing Daggers', cost: 14, type: 'daggers' },
      { name: 'Dagger Refill (+3)', cost: 4, type: 'daggers_refill' },
      { name: 'Soul Crystal (+1 Max HP)', cost: 24, type: 'maxhp' },
      { name: 'Health Refill', cost: 5, type: 'heal' },
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
    const purchaseActions = [];
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

      // Show "OWNED" label for weapons already in the arsenal
      const inv = player.inventory;
      let ownedLabel = null;
      const isOwnedWeapon = item.type === 'weapon' && inv && inv.ownsWeapon(item.id);
      const isOwnedDaggers = item.type === 'daggers' && inv && inv.hasThrowingDaggers;
      if (isOwnedWeapon || isOwnedDaggers) {
        ownedLabel = this.scene.add.text(cx, iy, 'OWNED', {
          fontSize: '11px', fontFamily: 'monospace', color: '#8aa0b0',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(205);
        modalElements.push(ownedLabel);
        costT.setText('—');
      }

      const attemptPurchase = () => {
        if (player.coins < item.cost) return;
        // Don't re-sell owned weapons
        if ((item.type === 'weapon' && inv?.ownsWeapon(item.id)) ||
            (item.type === 'daggers' && inv?.hasThrowingDaggers)) {
          return;
        }

        let purchased = false;
        if (item.type === 'heal') {
          if (player.hp < player.maxHp) {
            player.hp = player.maxHp;
            purchased = true;
          }
        } else if (item.type === 'maxhp') {
          player.maxHp += 1;
          player.hp = player.maxHp;
          if (this.scene.hud?.rebuildHealthOrbs) this.scene.hud.rebuildHealthOrbs();
          purchased = true;
        } else if (item.type === 'consumable' && inv) {
          inv.addConsumable(item.id, 1);
          purchased = true;
        } else if (item.type === 'weapon' && inv) {
          if (inv.acquireWeapon(item.id)) {
            inv.setActiveWeapon(item.id);
            purchased = true;
            if (ownedLabel) ownedLabel.setText('OWNED');
          }
        } else if (item.type === 'daggers' && inv) {
          if (!inv.hasThrowingDaggers) {
            inv.grantThrowingDaggers(inv.daggerAmmoMax);
            purchased = true;
          }
        } else if (item.type === 'daggers_refill' && inv) {
          if (inv.hasThrowingDaggers && inv.daggerAmmo < inv.daggerAmmoMax) {
            inv.refillDaggers(3);
            purchased = true;
          }
        }

        if (!purchased) return;
        player.coins -= item.cost;
        coinText.setText(`Coins: ${player.coins}`);

        if (this.scene.hud) this.scene.hud.refresh();
        if (this.scene.hud?.refreshWeaponBadge) this.scene.hud.refreshWeaponBadge();
        costT.setColor(player.coins >= item.cost ? '#ffc840' : '#664420');
        this.scene.cameras.main.flash(150, 64, 192, 32);
      };
      bg.on('pointerdown', attemptPurchase);
      itemButtons.push(bg);
      purchaseActions.push(attemptPurchase);
    });

    const closeT = this.scene.add.text(cx, cy + panelH / 2 - 14,
      '[ CLOSE · ESC / B / START ]', {
        fontSize: '10px', fontFamily: 'monospace', color: '#6a5838',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(204)
      .setInteractive({ useHandCursor: true });
    modalElements.push(closeT);

    // Gamepad/keyboard cursor highlight
    let cursor = 0;
    const applyHighlight = () => {
      itemButtons.forEach((btn, idx) => {
        if (idx === cursor) btn.setFillStyle(0x5a3a1a, 0.95);
        else btn.setFillStyle(0x2a1c10, 0.8);
      });
    };
    applyHighlight();

    const dismiss = () => {
      if (this.scene._dialogueTick === shopTick) this.scene._dialogueTick = null;
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

    // Gamepad/keyboard polling tick (piggybacks on dialogue tick slot,
    // since showShopModal sets dialogueActive=true and GameScene runs _dialogueTick).
    const total = items.length;
    let armed = false;
    const shopTick = (input) => {
      if (!armed || !input) return;
      if (input.cancelPressed || input.menuPressed) { dismiss(); return; }
      if (input.navUpPressed) { cursor = (cursor - 1 + total) % total; applyHighlight(); return; }
      if (input.navDownPressed) { cursor = (cursor + 1) % total; applyHighlight(); return; }
      if (input.confirmPressed) {
        const act = purchaseActions[cursor];
        if (act) act();
      }
    };
    this.scene._dialogueTick = shopTick;

    this.scene.time.delayedCall(200, () => {
      this.scene.input.keyboard.on('keydown', keyDismiss);
      armed = true;
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

  createFireballShooter(x, y, obj) {
    const shooter = this.scene.add.image(x, y, 'fireball_shooter').setDepth(4);
    const dir = obj.dir || 'left';
    if (dir === 'right') shooter.setFlipX(true);
    if (dir === 'down') shooter.setRotation(Math.PI / 2);
    if (dir === 'up') shooter.setRotation(-Math.PI / 2);

    const entry = {
      type: 'fireball_shooter',
      sprite: shooter,
      dir,
      interval: obj.interval || 2500,
      timer: obj.phase || 0,
      originX: x,
      originY: y,
    };
    this.fireballShooters.push(entry);
  }

  spawnFireball(shooter) {
    const speed = 180;
    let vx = 0, vy = 0;
    switch (shooter.dir) {
      case 'left':  vx = -speed; break;
      case 'right': vx = speed;  break;
      case 'up':    vy = -speed; break;
      case 'down':  vy = speed;  break;
    }

    const fb = this.scene.physics.add.image(shooter.originX, shooter.originY, 'fireball');
    fb.body.allowGravity = false;
    fb.body.setSize(12, 12);
    fb.setDepth(6);
    fb.body.velocity.x = vx;
    fb.body.velocity.y = vy;
    fb.setBlendMode(Phaser.BlendModes.ADD);

    const overlaps = [];
    for (const player of this.allPlayers) {
      overlaps.push(this.scene.physics.add.overlap(player, fb, () => {
        this.applyHazardDamage(player, fb.x);
      }));
    }
    const wallCollider = this.scene.physics.add.collider(fb, this.wallLayer, () => {
      this.destroyFireball(fb);
    });

    fb._overlaps = overlaps;
    fb._wallCollider = wallCollider;
    fb._life = 3000;
    this.activeFireballs.push(fb);
  }

  destroyFireball(fb) {
    if (!fb.active) return;
    if (fb._overlaps) {
      for (const ov of fb._overlaps) this.scene.physics.world.removeCollider(ov);
    }
    if (fb._wallCollider) this.scene.physics.world.removeCollider(fb._wallCollider);
    fb.destroy();
  }

  createFloorSpikes(x, y, obj) {
    const sprite = this.scene.add.image(x, y, 'floor_spikes_down').setDepth(4);
    sprite.setOrigin(0.5, 1);

    // Hit zone covers the full height of the extended spikes. The sprite
    // is 32 tall with the base slab at y=22..32, so the spikes live in
    // y=0..22 (22 px of lethal steel). Zone is centered 11 px above the
    // sprite's anchor.
    const zone = this.scene.physics.add.image(x, y - 12, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(28, 22);
    zone.body.enable = false;

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.floorSpikes.push({
      type: 'floor_spikes',
      sprite,
      zone,
      extended: false,
      onTime: obj.onTime || 1500,
      offTime: obj.offTime || 2000,
      timer: obj.phase || 0,
    });
  }

  createSawBlade(x, y, obj) {
    const sprite = this.scene.add.image(x, y, 'saw_blade').setDepth(5);
    const zone = this.scene.physics.add.image(x, y, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(22, 22);

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.sawBlades.push({
      type: 'saw_blade',
      sprite,
      zone,
      baseX: x,
      baseY: y,
      axis: obj.axis || 'x',
      range: obj.range || 96,
      speed: obj.speed || 1.2,
      phase: obj.phase || 0,
    });
  }

  createFlameJet(x, y, obj) {
    const dir = obj.dir || 'up';
    const base = this.scene.add.image(x, y, 'flame_jet_base').setDepth(4);
    let flameX = x, flameY = y;
    let rotation = 0;
    switch (dir) {
      case 'up':    flameY = y - 28; break;
      case 'down':  flameY = y + 28; rotation = Math.PI; break;
      case 'left':  flameX = x - 28; rotation = Math.PI / 2; break;
      case 'right': flameX = x + 28; rotation = -Math.PI / 2; break;
    }
    if (dir === 'down') base.setRotation(Math.PI);
    if (dir === 'left') base.setRotation(Math.PI / 2);
    if (dir === 'right') base.setRotation(-Math.PI / 2);

    const flame = this.scene.add.image(flameX, flameY, 'flame_jet_flame').setDepth(5);
    flame.setRotation(rotation);
    flame.setBlendMode(Phaser.BlendModes.ADD);
    flame.setAlpha(0.85);
    flame.setVisible(false);

    const zw = dir === 'up' || dir === 'down' ? 14 : 36;
    const zh = dir === 'up' || dir === 'down' ? 36 : 14;
    const zone = this.scene.physics.add.image(flameX, flameY, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(zw, zh);
    zone.body.enable = false;

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.flameJets.push({
      type: 'flame_jet',
      base,
      flame,
      zone,
      active: false,
      onTime: obj.onTime || 1200,
      offTime: obj.offTime || 1800,
      timer: obj.phase || 0,
    });
  }

  createIcePatch(x, y, obj) {
    const width = Math.max(1, obj?.width || 2);
    const sprite = this.scene.add.image(x, y, 'ice_patch');
    sprite.setDepth(2);
    sprite.setDisplaySize(width * TILE_SIZE, TILE_SIZE * 0.55);
    sprite.setAlpha(0.85);

    const zone = this.scene.physics.add.image(x, y - 4, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(width * TILE_SIZE, TILE_SIZE * 0.7);

    const entry = { type: 'ice_patch', sprite, zone, width };
    this.icePatches.push(entry);
    this.decorations.push(sprite);

    // Subtle shimmer
    this.scene.tweens.add({
      targets: sprite, alpha: 0.7,
      duration: 1600 + Math.random() * 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        const body = player.body;
        if (body && body.blocked.down) player.onIce = true;
      });
    }
  }

  /** Ceiling-mounted icicle: drops when player walks under. */
  createIcicleDrop(x, y, obj) {
    const sprite = this.scene.add.image(x, y, 'icicle_drop').setDepth(4);
    sprite.setOrigin(0.5, 0);

    const entry = {
      type: 'icicle_drop',
      sprite,
      originX: x,
      originY: y,
      state: 'idle', // idle | wobble | falling | respawning
      triggerTimer: 0,
      respawnTimer: 0,
      respawnDelay: obj?.respawnDelay || 4500,
      triggerRange: obj?.triggerRange || 60,
      fallBody: null,
    };
    this.icicleDrops.push(entry);
    this.decorations.push(sprite);
  }

  /**
   * Ceiling-mounted crusher. Slams down, pauses, retracts, pauses, repeats.
   * obj fields: dropDist (tiles, default 4), dropSpeed (px/sec, default 620),
   *             riseSpeed (default 140), downTime (ms at bottom, default 400),
   *             upTime (ms at top, default 1500), phase ('up'|'down'|'top'|'bottom', default 'top')
   * Sprite origin (0.5, 0) anchors from ceiling downward. `y` param is the
   * top-row pixel center (from obj.y tile), so we store that as topY.
   */
  createCrusher(x, y, obj) {
    const dropDistTiles = obj.dropDist || 4;
    const dropDistPx = dropDistTiles * TILE_SIZE;

    const sprite = this.scene.physics.add.image(x, y, 'crusher_block');
    sprite.setDisplaySize(TILE_SIZE * 1.5, TILE_SIZE);
    sprite.setOrigin(0.5, 0);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.body.setSize(TILE_SIZE * 1.5, TILE_SIZE);
    sprite.body.offset.set(0, 0);
    sprite.body.checkCollision.down = false;
    sprite.body.checkCollision.left = false;
    sprite.body.checkCollision.right = false;
    sprite.setDepth(4);

    const zone = this.scene.physics.add.image(x, y + 4, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(TILE_SIZE * 1.3, 12);

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.crushers.push({
      sprite,
      zone,
      originTopY: y,
      dropDist: dropDistPx,
      dropSpeed: obj.dropSpeed || 620,
      riseSpeed: obj.riseSpeed || 140,
      downTime: obj.downTime || 400,
      upTime: obj.upTime || 1500,
      state: obj.phase || 'top',
      timer: 0,
    });

    for (const player of this.allPlayers) {
      this.scene.physics.add.collider(player, sprite);
    }
  }

  /**
   * Laser beam emitter. Static emitter + beam rectangle damage zone that
   * toggles on/off. obj fields: dir ('up'|'down'|'left'|'right'),
   * length (tiles, default 6), onTime, offTime, phase.
   */
  createLaserBeam(x, y, obj) {
    const dir = obj.dir || 'right';
    const lengthTiles = obj.length || 6;
    const lengthPx = lengthTiles * TILE_SIZE;

    const emitter = this.scene.add.image(x, y, 'laser_emitter').setDepth(4);
    if (dir === 'left') emitter.setFlipX(true);
    if (dir === 'up') emitter.setRotation(-Math.PI / 2);
    if (dir === 'down') emitter.setRotation(Math.PI / 2);

    // Beam sprite (tiled). Anchor to emitter edge.
    let beamX = x, beamY = y, beamW = lengthPx, beamH = 4;
    switch (dir) {
      case 'right': beamX = x + 10 + lengthPx / 2; break;
      case 'left':  beamX = x - 10 - lengthPx / 2; break;
      case 'down':  beamY = y + 10 + lengthPx / 2; beamW = 4; beamH = lengthPx; break;
      case 'up':    beamY = y - 10 - lengthPx / 2; beamW = 4; beamH = lengthPx; break;
    }

    const beam = this.scene.add.tileSprite(beamX, beamY, beamW, beamH, 'laser_beam');
    beam.setDepth(5);
    beam.setBlendMode(Phaser.BlendModes.ADD);
    beam.setVisible(false);

    const zone = this.scene.physics.add.image(beamX, beamY, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(beamW - 2, Math.max(2, beamH - 1));
    zone.body.enable = false;

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        this.applyHazardDamage(player, zone.x);
      });
    }

    this.laserBeams.push({
      emitter,
      beam,
      zone,
      active: false,
      onTime: obj.onTime || 1400,
      offTime: obj.offTime || 1600,
      timer: obj.phase || 0,
    });
  }

  /**
   * Conveyor belt surface. Creates a platform-like strip that pushes the
   * player horizontally while standing on top.
   * obj fields: width (tiles, default 3), dir ('left'|'right'), speed (px/sec, default 120)
   */
  createConveyor(x, y, obj) {
    const widthTiles = Math.max(1, obj.width || 3);
    const widthPx = widthTiles * TILE_SIZE;
    const dir = obj.dir === 'left' ? -1 : 1;
    const speed = (obj.speed || 120) * dir;

    // x here is the center of the leftmost tile (from spawnObjects). We want
    // the conveyor centered on its full width, so shift right by half the
    // extra tiles (widthTiles - 1) * TILE_SIZE / 2.
    const cx = x + (widthTiles - 1) * (TILE_SIZE / 2);
    const cy = y;

    const surface = this.scene.physics.add.image(cx, cy, 'conveyor_belt');
    surface.setDisplaySize(widthPx, 16);
    surface.body.allowGravity = false;
    surface.body.setImmovable(true);
    surface.body.setSize(widthPx, 16);
    surface.body.checkCollision.down = false;
    surface.body.checkCollision.left = false;
    surface.body.checkCollision.right = false;
    surface.setDepth(3);

    // Scroll the treads for visual feedback
    surface._scrollRate = dir * 2;

    // Arrow hint
    const arrow = this.scene.add.image(cx, cy - 14, 'conveyor_arrow').setDepth(3);
    arrow.setTint(dir > 0 ? 0xffdd88 : 0x88ddff);
    arrow.setAlpha(0.7);
    if (dir < 0) arrow.setFlipX(true);

    // Top overlap zone to nudge player
    const topZone = this.scene.physics.add.image(cx, cy - 8, 'particle_dust');
    topZone.setVisible(false);
    topZone.body.allowGravity = false;
    topZone.body.setImmovable(true);
    topZone.body.setSize(widthPx - 4, 6);

    for (const player of this.allPlayers) {
      this.scene.physics.add.collider(player, surface);
      this.scene.physics.add.overlap(player, topZone, () => {
        const body = player.body;
        if (body && body.blocked.down) {
          // Drag the player along the belt by shifting position each frame.
          // This stays independent of velocity so running with or against the
          // belt still feels like a smooth modifier rather than a hard cap.
          const delta = this.scene.game.loop.delta / 1000;
          player.x += speed * delta;
        }
      });
    }

    this.conveyors.push({ surface, arrow, topZone, speed });
    this.decorations.push(arrow);
  }

  /**
   * Phase platform — appears and disappears on a timer (no player-stand trigger).
   * obj fields: width (tiles, default 3), onTime (default 1600), offTime (default 1200),
   *             phase (default 0)
   */
  createPhasePlatform(x, y, obj) {
    const widthTiles = Math.max(1, obj.width || 3);
    const widthPx = widthTiles * TILE_SIZE;
    const cx = x + (widthTiles - 1) * (TILE_SIZE / 2);
    const cy = y;

    const sprite = this.scene.physics.add.image(cx, cy, 'phase_platform');
    sprite.setDisplaySize(widthPx, 12);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.body.setSize(widthPx, 12);
    sprite.body.checkCollision.down = false;
    sprite.body.checkCollision.left = false;
    sprite.body.checkCollision.right = false;
    sprite.setDepth(3);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.setAlpha(0.9);

    for (const player of this.allPlayers) {
      this.scene.physics.add.collider(player, sprite);
    }

    this.phasePlatforms.push({
      sprite,
      active: true,
      onTime: obj.onTime || 1600,
      offTime: obj.offTime || 1200,
      timer: obj.phase || 0,
    });
  }

  /**
   * Arrow turret — wall-mounted trap that fires a quick volley of darts.
   * obj fields: dir ('left'|'right'|'up'|'down'),
   *             interval (ms between volleys, default 2600),
   *             burstSize (darts per volley, default 3),
   *             burstSpacing (ms between darts in a volley, default 120),
   *             phase (initial timer offset, default 0)
   */
  createArrowTurret(x, y, obj) {
    const dir = obj.dir || 'left';
    const sprite = this.scene.add.image(x, y, 'arrow_turret').setDepth(4);
    if (dir === 'right') sprite.setFlipX(true);
    if (dir === 'up') sprite.setRotation(-Math.PI / 2);
    if (dir === 'down') sprite.setRotation(Math.PI / 2);

    this.arrowTurrets.push({
      sprite,
      dir,
      interval: obj.interval || 2600,
      burstSize: obj.burstSize || 3,
      burstSpacing: obj.burstSpacing || 120,
      phase: obj.phase || 0,
      timer: 0,
      burstsPending: 0,
      burstTimer: 0,
      originX: x,
      originY: y,
    });
  }

  spawnArrowDart(turret) {
    const speed = 360;
    let vx = 0, vy = 0, rot = 0;
    switch (turret.dir) {
      case 'left':  vx = -speed; rot = Math.PI; break;
      case 'right': vx = speed;  rot = 0; break;
      case 'up':    vy = -speed; rot = -Math.PI / 2; break;
      case 'down':  vy = speed;  rot = Math.PI / 2; break;
    }

    const dart = this.scene.physics.add.image(turret.originX, turret.originY, 'arrow_dart');
    dart.body.allowGravity = false;
    dart.body.setSize(10, 3);
    dart.setDepth(6);
    dart.setRotation(rot);
    dart.body.velocity.x = vx;
    dart.body.velocity.y = vy;

    const overlaps = [];
    for (const player of this.allPlayers) {
      overlaps.push(this.scene.physics.add.overlap(player, dart, () => {
        if (!dart.active) return;
        this.applyHazardDamage(player, dart.x);
        this._destroyArrowDart(dart);
      }));
    }
    const wc = this.scene.physics.add.collider(dart, this.wallLayer, () => {
      this._destroyArrowDart(dart);
    });
    dart._overlaps = overlaps;
    dart._wallCollider = wc;
    dart._life = 2400;
    this.activeArrowDarts.push(dart);
  }

  _destroyArrowDart(dart) {
    if (!dart.active) return;
    if (dart._overlaps) {
      for (const ov of dart._overlaps) this.scene.physics.world.removeCollider(ov);
    }
    if (dart._wallCollider) this.scene.physics.world.removeCollider(dart._wallCollider);
    dart.destroy();
  }

  /** Dynamically drops an active hitbox that damages player & despawns on wall hit. */
  _dropIcicle(entry) {
    entry.state = 'falling';
    const body = this.scene.physics.add.image(entry.sprite.x, entry.sprite.y, 'icicle_drop');
    body.setOrigin(0.5, 0).setDepth(5);
    body.body.allowGravity = false;
    body.body.setSize(10, 20);
    body.body.velocity.y = 360;
    entry.sprite.setVisible(false);
    entry.fallBody = body;

    const overlaps = [];
    for (const player of this.allPlayers) {
      overlaps.push(this.scene.physics.add.overlap(player, body, () => {
        if (!body.active) return;
        this.applyHazardDamage(player, body.x);
        this._destroyIcicleProjectile(entry, overlaps);
      }));
    }
    const wc = this.scene.physics.add.collider(body, this.wallLayer, () => {
      if (!body.active) return;
      const shatter = this.scene.add.image(body.x, body.y + 6, 'particle_white');
      shatter.setBlendMode(Phaser.BlendModes.ADD);
      shatter.setScale(1.4);
      this.scene.tweens.add({
        targets: shatter, alpha: 0, scaleX: 2.6, scaleY: 2.6, duration: 260,
        onComplete: () => shatter.destroy(),
      });
      this._destroyIcicleProjectile(entry, overlaps, wc);
    });
    entry.fallBodyOverlaps = overlaps;
    entry.fallBodyWallCollider = wc;
    this.activeIcicles.push(entry);
  }

  _destroyIcicleProjectile(entry, overlaps, wc) {
    if (entry.fallBody && entry.fallBody.active) entry.fallBody.destroy();
    for (const ov of overlaps || []) this.scene.physics.world.removeCollider(ov);
    if (wc) this.scene.physics.world.removeCollider(wc);
    entry.fallBody = null;
    entry.state = 'respawning';
    entry.respawnTimer = entry.respawnDelay;
  }

  /** Temporary ice patch created at runtime by Frost Warden breath. */
  createTemporaryIceStrip(xTileA, xTileB, yTile, durationMs) {
    const xA = Math.min(xTileA, xTileB);
    const xB = Math.max(xTileA, xTileB);
    const width = Math.max(1, xB - xA + 1);
    const cx = (xA + width / 2) * TILE_SIZE;
    const cy = yTile * TILE_SIZE - 6;
    const sprite = this.scene.add.image(cx, cy, 'ice_patch');
    sprite.setDepth(2);
    sprite.setDisplaySize(width * TILE_SIZE, TILE_SIZE * 0.55);
    sprite.setAlpha(0.92);

    const zone = this.scene.physics.add.image(cx, cy - 4, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(width * TILE_SIZE, TILE_SIZE * 0.7);

    const entry = { type: 'ice_patch', sprite, zone, width, _temporary: true };
    this.icePatches.push(entry);
    this.decorations.push(sprite);

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => {
        const body = player.body;
        if (body && body.blocked.down) player.onIce = true;
      });
    }

    this.scene.time.delayedCall(durationMs || 6000, () => {
      this.scene.tweens.add({
        targets: sprite, alpha: 0, duration: 650,
        onComplete: () => {
          if (sprite.active) sprite.destroy();
          if (zone.active) zone.destroy();
          const i = this.icePatches.indexOf(entry);
          if (i >= 0) this.icePatches.splice(i, 1);
        },
      });
    });
  }

  createCheckpointShrine(x, y, obj) {
    const base = this.scene.add.image(x, y, 'checkpoint_shrine');
    base.setDepth(3);
    base.setOrigin(0.5, 0.5);

    const lit = this.scene.add.image(x, y, 'checkpoint_shrine_lit');
    lit.setDepth(4);
    lit.setOrigin(0.5, 0.5);
    lit.setBlendMode(Phaser.BlendModes.ADD);
    lit.setAlpha(0);

    const glow = this.scene.add.image(x, y - 8, 'particle_teal');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setAlpha(0.2);
    glow.setScale(4);
    glow.setDepth(2);
    this.scene.tweens.add({
      targets: glow, alpha: 0.06, scaleX: 6, scaleY: 6,
      duration: 1400, yoyo: true, repeat: -1,
    });

    const zone = this.scene.physics.add.image(x, y, 'particle_dust');
    zone.setVisible(false);
    zone.body.allowGravity = false;
    zone.body.setImmovable(true);
    zone.body.setSize(TILE_SIZE, TILE_SIZE * 2);

    const state = { base, lit, glow, zone, activated: false };
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, zone, () => this.activateCheckpointShrine(state, x, y));
    }
    this.checkpointShrines.push(state);
    this.decorations.push(base);
    this.decorations.push(lit);
    this.decorations.push(glow);
  }

  activateCheckpointShrine(state, x, y) {
    if (state.activated) return;
    state.activated = true;

    for (const p of this.allPlayers) {
      p.setCheckpoint(x, y - 8);
      p.fullHeal();
      if (p.inventory?.hasThrowingDaggers) p.inventory.refillDaggers(3);
    }
    if (this.scene.hud) this.scene.hud.refresh();

    this.scene.tweens.add({ targets: state.lit, alpha: 1, duration: 420 });
    this.scene.cameras.main.flash(220, 64, 232, 192);

    // Save the game here — shrine is now a persistent save point
    if (this.scene.saveGameIfEligible) {
      this.scene.saveGameIfEligible(false);
    }

    const msg = this.scene.add.text(x, y - 48, 'SAVE POINT', {
      fontSize: '14px', fontFamily: 'monospace', color: '#40ffd8',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    const sub = this.scene.add.text(x, y - 34, 'Restored · Saved', {
      fontSize: '10px', fontFamily: 'monospace', color: '#a0f0c8',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: [msg, sub], alpha: 0, y: '-=24', duration: 1800, delay: 900,
      onComplete: () => { msg.destroy(); sub.destroy(); },
    });
  }

  createWeaponPickup(x, y, obj) {
    const weaponId = obj?.weaponId || 'phantom_edge';
    const texKey = this._weaponPickupTexture(weaponId);
    const glow = this.scene.add.image(x, y, 'pickup_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(3);
    glow.setScale(2);
    this.scene.tweens.add({
      targets: glow, alpha: 0.5, scale: 2.5,
      duration: 1100, yoyo: true, repeat: -1,
    });

    const sprite = this.scene.physics.add.image(x, y, texKey);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setDepth(5);
    this.scene.tweens.add({
      targets: sprite, y: y - 4,
      duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: sprite, angle: 6,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, sprite, () => {
        if (!sprite.active) return;
        this._collectWeapon(player, weaponId, sprite, glow, obj);
      });
    }
    if (!this.weaponPickups) this.weaponPickups = [];
    this.weaponPickups.push(sprite, glow);
  }

  _weaponPickupTexture(weaponId) {
    switch (weaponId) {
      case 'warden_greatsword': return 'pickup_warden_greatsword';
      case 'throwing_daggers': return 'pickup_throwing_daggers';
      case 'phantom_edge':
      default:
        return 'pickup_phantom_edge';
    }
  }

  _collectWeapon(player, weaponId, sprite, glow, obj) {
    const inv = player.inventory;
    if (!inv) return;

    let displayName = obj?.displayName;
    let gained = false;

    if (weaponId === 'throwing_daggers') {
      if (!inv.hasThrowingDaggers) {
        inv.grantThrowingDaggers(inv.daggerAmmoMax);
        displayName = displayName || 'Throwing Daggers';
        gained = true;
      } else {
        inv.refillDaggers(3);
        displayName = 'Dagger Refill';
        gained = true;
      }
    } else {
      if (inv.acquireWeapon(weaponId)) {
        inv.setActiveWeapon(weaponId);
        displayName = displayName || this._weaponLabelOf(weaponId);
        gained = true;
      } else {
        // Already owned — convert to a small gift: daggers if have them, else heal 1
        if (inv.hasThrowingDaggers) {
          inv.refillDaggers(3);
          displayName = 'Dagger Refill';
        } else {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          displayName = 'Soul Flicker';
        }
        gained = true;
      }
    }

    if (!gained) return;

    this._spawnPickupPop(sprite.x, sprite.y, displayName, 0xffcc88);
    this.scene.cameras.main.flash(160, 255, 220, 160);
    if (this.scene.hud?.refreshWeaponBadge) this.scene.hud.refreshWeaponBadge();
    sprite.destroy();
    glow.destroy();
  }

  _weaponLabelOf(weaponId) {
    switch (weaponId) {
      case 'phantom_edge': return 'Phantom Edge';
      case 'warden_greatsword': return "Warden's Greatsword";
      default: return 'New Weapon';
    }
  }

  createItemPickup(x, y, obj) {
    const itemId = obj?.itemId || 'ether_vial';
    const tex = itemId === 'soul_crystal' ? 'item_soul_crystal' : 'item_ether_vial';
    const glow = this.scene.add.image(x, y, 'pickup_glow');
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(3);
    glow.setScale(1.6);
    this.scene.tweens.add({
      targets: glow, alpha: 0.4, scale: 2,
      duration: 1000, yoyo: true, repeat: -1,
    });

    const sprite = this.scene.physics.add.image(x, y, tex);
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setDepth(5);
    this.scene.tweens.add({
      targets: sprite, y: y - 3,
      duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, sprite, () => {
        if (!sprite.active) return;
        const inv = player.inventory;
        if (!inv) return;
        if (itemId === 'soul_crystal') {
          player.maxHp += 1;
          player.hp = player.maxHp;
          if (this.scene.hud?.rebuildHealthOrbs) this.scene.hud.rebuildHealthOrbs();
          if (this.scene.hud) this.scene.hud.refresh();
          this._spawnPickupPop(sprite.x, sprite.y, 'Soul Crystal · Max HP +1', 0xff88aa);
        } else {
          inv.addConsumable(itemId, obj?.amount || 1);
          const label = itemId === 'ether_vial' ? 'Ether Vial' : itemId;
          this._spawnPickupPop(sprite.x, sprite.y, `${label} (x${inv.consumableCount(itemId)})`, 0x66ffa0);
        }
        this.scene.cameras.main.flash(120, 120, 255, 160);
        sprite.destroy();
        glow.destroy();
      });
    }
    if (!this.itemPickups) this.itemPickups = [];
    this.itemPickups.push(sprite, glow);
  }

  _spawnPickupPop(x, y, text, color = 0xffffff) {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height - 80;
    const panel = this.scene.add.rectangle(cx, cy, 300, 32, 0x0a0812, 0.85)
      .setScrollFactor(0).setDepth(210).setAlpha(0);
    const border = this.scene.add.rectangle(cx, cy, 302, 34, color, 0.55)
      .setScrollFactor(0).setDepth(209).setAlpha(0);
    const hex = '#' + color.toString(16).padStart(6, '0');
    const label = this.scene.add.text(cx, cy, `ACQUIRED · ${text}`, {
      fontSize: '12px', fontFamily: 'monospace', color: hex,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(211).setAlpha(0);

    this.scene.tweens.add({ targets: [panel, border, label], alpha: 1, duration: 200 });
    this.scene.time.delayedCall(1400, () => {
      this.scene.tweens.add({
        targets: [panel, border, label], alpha: 0, duration: 320,
        onComplete: () => { panel.destroy(); border.destroy(); label.destroy(); },
      });
    });

    // world-space sparkle
    const burst = this.scene.add.image(x, y, 'particle_white')
      .setBlendMode(Phaser.BlendModes.ADD).setScale(2).setDepth(12);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scale: 5, duration: 520,
      onComplete: () => burst.destroy(),
    });
  }

  createLoreFragment(x, y, obj) {
    const sprite = this.scene.physics.add.image(x, y, 'lore_fragment');
    sprite.body.allowGravity = false;
    sprite.body.setImmovable(true);
    sprite.setDepth(5);
    sprite.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: sprite, y: y - 6, duration: 1400, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.scene.tweens.add({
      targets: sprite, alpha: 0.6, duration: 900, yoyo: true, repeat: -1,
    });

    const text = obj?.text || 'An ancient memory lingers here.';

    const loreId = obj?.id || `${this.currentRoomId || 'room'}:${Math.round(x)},${Math.round(y)}`;
    for (const player of this.allPlayers) {
      this.scene.physics.add.overlap(player, sprite, () => {
        if (!sprite.active) return;
        if (player.inventory) player.inventory.addLore(loreId, text);
        this.showLoreToast(sprite.x, sprite.y, text);
        const burst = this.scene.add.image(sprite.x, sprite.y, 'particle_teal');
        burst.setBlendMode(Phaser.BlendModes.ADD);
        burst.setScale(2);
        this.scene.tweens.add({
          targets: burst, alpha: 0, scaleX: 4, scaleY: 4, duration: 520,
          onComplete: () => burst.destroy(),
        });
        sprite.destroy();
      });
    }
    this.loreFragments.push(sprite);
  }

  showLoreToast(wx, wy, text) {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height * 0.8;
    const panel = this.scene.add.rectangle(cx, cy, Math.min(cam.width - 80, 520), 72, 0x0a0612, 0.88)
      .setScrollFactor(0).setDepth(200).setAlpha(0);
    const border = this.scene.add.rectangle(cx, cy, Math.min(cam.width - 76, 524), 76, 0x8866cc, 0.6)
      .setScrollFactor(0).setDepth(199).setAlpha(0);
    const t = this.scene.add.text(cx, cy, text, {
      fontSize: '14px', fontFamily: 'monospace', color: '#d0b8ff',
      stroke: '#000', strokeThickness: 3, wordWrap: { width: 480 }, align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);
    this.scene.tweens.add({ targets: [panel, border, t], alpha: 1, duration: 240 });
    this.scene.time.delayedCall(3400, () => {
      this.scene.tweens.add({
        targets: [panel, border, t], alpha: 0, duration: 320,
        onComplete: () => { panel.destroy(); border.destroy(); t.destroy(); },
      });
    });
  }

  createSecretWall(x, y, obj) {
    if (!this.secretWallGroup) {
      this.secretWallGroup = this.scene.physics.add.staticGroup();
    }
    const sprite = this.secretWallGroup.create(x, y, 'secret_wall');
    sprite.setDisplaySize(TILE_SIZE, TILE_SIZE);
    sprite.setDepth(3);
    sprite.refreshBody();
    for (const player of this.allPlayers) {
      this.scene.physics.add.collider(player, sprite);
    }

    const state = {
      sprite,
      revealed: false,
      targetRoom: obj?.targetRoom || null,
      spawnX: obj?.spawnX,
      spawnY: obj?.spawnY,
      hitsToBreak: obj?.hitsToBreak || 1,
      hits: 0,
    };
    sprite._secretWall = state;
    this.secretWalls.push(state);
  }

  /** Called by Combat system when the player's slash overlaps a secret_wall. */
  onSecretWallHit(state) {
    if (!state || state.revealed || !state.sprite?.active) return;
    state.hits++;
    state.sprite.setTint(0xffdd99).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, () => {
      if (state.sprite?.active) state.sprite.clearTint();
    });
    if (state.hits < state.hitsToBreak) return;

    state.revealed = true;
    this.scene.cameras.main.flash(260, 220, 200, 120);
    this.scene.tweens.add({
      targets: state.sprite, alpha: 0, duration: 420,
      onComplete: () => {
        if (state.sprite?.active) {
          state.sprite.body.enable = false;
          state.sprite.setVisible(false);
        }
      },
    });

    // If this secret wall reveals a portal, spawn a door in its place
    if (state.targetRoom) {
      const door = this.scene.physics.add.image(state.sprite.x, state.sprite.y, 'door');
      door.body.allowGravity = false;
      door.body.setImmovable(true);
      door.setDisplaySize(TILE_SIZE, TILE_SIZE * 2);
      door.setDepth(5);
      door.targetRoom = state.targetRoom;
      door.spawnX = state.spawnX;
      door.spawnY = state.spawnY;
      door.requiresAbilities = [];
      door.setAlpha(0.96);
      for (const player of this.allPlayers) {
        this.scene.physics.add.overlap(player, door, (pl) => {
          if (this.scene.transitioning) return;
          const now = this.scene.time?.now ?? 0;
          if (pl._doorCooldownUntil && now < pl._doorCooldownUntil) return;
          this.scene.transitionToRoom(door.targetRoom, door.spawnX, door.spawnY);
        });
      }
      this.doorZones.push({ door, portalGlow: null, glowTween: null, pulseTween: null });
    }
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
    if (this._sealBumpCooldown > 0) this._sealBumpCooldown -= dt;

    // Reset slippery flag each frame — ice overlap sets it back on if still touching
    for (const p of this.allPlayers) { if (p) p.onIce = false; }

    const t = this.scene.time.now / 1000;
    const dtSec = dt / 1000;

    // Icicle drop triggers
    for (const ic of this.icicleDrops) {
      if (ic.state === 'idle') {
        const px = this.scene.player?.x;
        const py = this.scene.player?.y;
        if (px != null) {
          const dx = Math.abs(px - ic.originX);
          const below = py > ic.originY;
          if (dx < ic.triggerRange && below) {
            ic.state = 'wobble';
            ic.triggerTimer = 380;
            this.scene.tweens.add({
              targets: ic.sprite, x: ic.originX + 1.5, duration: 60, yoyo: true, repeat: 5, ease: 'Sine.easeInOut',
              onComplete: () => { if (ic.sprite?.active) ic.sprite.x = ic.originX; },
            });
          }
        }
      } else if (ic.state === 'wobble') {
        ic.triggerTimer -= dt;
        if (ic.triggerTimer <= 0) this._dropIcicle(ic);
      } else if (ic.state === 'respawning') {
        ic.respawnTimer -= dt;
        if (ic.respawnTimer <= 0) {
          ic.state = 'idle';
          if (ic.sprite?.active) {
            ic.sprite.setVisible(true);
            ic.sprite.setAlpha(0);
            ic.sprite.x = ic.originX;
            ic.sprite.y = ic.originY;
            this.scene.tweens.add({ targets: ic.sprite, alpha: 1, duration: 420 });
          }
        }
      }
    }
    // Cleanup finished icicle projectiles
    for (let i = this.activeIcicles.length - 1; i >= 0; i--) {
      const ic = this.activeIcicles[i];
      if (!ic.fallBody) { this.activeIcicles.splice(i, 1); continue; }
      if (!ic.fallBody.active) { this.activeIcicles.splice(i, 1); continue; }
    }

    for (const plat of this.movingPlatforms) {
      if (!plat.sprite || !plat.sprite.active) continue;
      const s = plat.sprite;
      const b = s.body;
      if (!b) continue;

      const angle = t * plat.speed + plat.phase;
      const sinA = Math.sin(angle);
      const cosA = Math.cos(angle);

      if (plat.axis === 'y') {
        s.y = plat.baseY + sinA * plat.range;
        b.velocity.x = 0;
        b.velocity.y = cosA * plat.range * plat.speed;
      } else {
        s.x = plat.baseX + sinA * plat.range;
        b.velocity.x = cosA * plat.range * plat.speed;
        b.velocity.y = 0;
      }
      b.updateFromGameObject();

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

    // Fireball shooters: count down timer, spawn fireballs
    for (const fs of this.fireballShooters) {
      fs.timer += dt;
      if (fs.timer >= fs.interval) {
        fs.timer -= fs.interval;
        this.spawnFireball(fs);
      }
    }

    // Active fireballs: decrement life, destroy expired
    for (let i = this.activeFireballs.length - 1; i >= 0; i--) {
      const fb = this.activeFireballs[i];
      if (!fb.active) { this.activeFireballs.splice(i, 1); continue; }
      fb._life -= dt;
      if (fb._life <= 0) {
        this.destroyFireball(fb);
        this.activeFireballs.splice(i, 1);
      }
    }

    // Floor spikes: cycle between extended and retracted
    for (const fs of this.floorSpikes) {
      fs.timer += dt;
      if (fs.extended) {
        if (fs.timer >= fs.onTime) {
          fs.timer = 0;
          fs.extended = false;
          fs.sprite.setTexture('floor_spikes_down');
          fs.zone.body.enable = false;
        }
      } else {
        if (fs.timer >= fs.offTime) {
          fs.timer = 0;
          fs.extended = true;
          fs.sprite.setTexture('floor_spikes_up');
          fs.zone.body.enable = true;
        } else if (fs.timer >= fs.offTime - 400) {
          fs.sprite.setAlpha(0.5 + Math.sin(t * 20) * 0.3);
        } else {
          fs.sprite.setAlpha(1);
        }
      }
    }

    // Saw blades: sine-wave motion + rotation
    for (const sb of this.sawBlades) {
      const angle = t * sb.speed + sb.phase;
      const sinA = Math.sin(angle);
      let bx, by;
      if (sb.axis === 'y') {
        bx = sb.baseX;
        by = sb.baseY + sinA * sb.range;
      } else {
        bx = sb.baseX + sinA * sb.range;
        by = sb.baseY;
      }
      sb.sprite.setPosition(bx, by);
      sb.sprite.rotation += 0.08;
      sb.zone.setPosition(bx, by);
      sb.zone.body.updateFromGameObject();
    }

    // Flame jets: cycle on/off
    for (const fj of this.flameJets) {
      fj.timer += dt;
      if (fj.active) {
        fj.flame.setAlpha(0.7 + Math.sin(t * 12) * 0.15);
        if (fj.timer >= fj.onTime) {
          fj.timer = 0;
          fj.active = false;
          fj.flame.setVisible(false);
          fj.zone.body.enable = false;
        }
      } else {
        if (fj.timer >= fj.offTime) {
          fj.timer = 0;
          fj.active = true;
          fj.flame.setVisible(true);
          fj.zone.body.enable = true;
        }
      }
    }

    // Crushers: four-phase cycle (top -> down -> bottom -> up)
    for (const cr of this.crushers) {
      if (!cr.sprite?.active) continue;
      cr.timer += dt;
      const topY = cr.originTopY;
      const bottomY = topY + cr.dropDist;
      if (cr.state === 'top') {
        // Anticipatory wobble near the end
        if (cr.timer >= cr.upTime) {
          cr.state = 'down';
          cr.timer = 0;
        } else if (cr.timer >= cr.upTime - 260) {
          cr.sprite.y = topY + Math.sin(t * 40) * 1.2;
        } else {
          cr.sprite.y = topY;
        }
      } else if (cr.state === 'down') {
        const newY = Math.min(bottomY, cr.sprite.y + cr.dropSpeed * dtSec);
        cr.sprite.y = newY;
        if (newY >= bottomY - 0.5) {
          cr.sprite.y = bottomY;
          cr.state = 'bottom';
          cr.timer = 0;
          // Tiny screen impact feel
          this.scene.cameras.main.shake?.(90, 0.003);
        }
      } else if (cr.state === 'bottom') {
        cr.sprite.y = bottomY;
        if (cr.timer >= cr.downTime) {
          cr.state = 'up';
          cr.timer = 0;
        }
      } else if (cr.state === 'up') {
        const newY = Math.max(topY, cr.sprite.y - cr.riseSpeed * dtSec);
        cr.sprite.y = newY;
        if (newY <= topY + 0.5) {
          cr.sprite.y = topY;
          cr.state = 'top';
          cr.timer = 0;
        }
      }
      if (cr.sprite.body) cr.sprite.body.updateFromGameObject();
      // Move damage zone to bottom teeth edge
      cr.zone.setPosition(cr.sprite.x, cr.sprite.y + cr.sprite.displayHeight - 4);
      cr.zone.body.updateFromGameObject();
    }

    // Laser beams: cycle on/off with warm-up pulse
    for (const lz of this.laserBeams) {
      lz.timer += dt;
      if (lz.active) {
        lz.beam.setAlpha(0.85 + Math.sin(t * 30) * 0.15);
        if (lz.timer >= lz.onTime) {
          lz.timer = 0;
          lz.active = false;
          lz.beam.setVisible(false);
          lz.zone.body.enable = false;
        }
      } else {
        if (lz.timer >= lz.offTime) {
          lz.timer = 0;
          lz.active = true;
          lz.beam.setVisible(true);
          lz.zone.body.enable = true;
        } else if (lz.timer >= lz.offTime - 320) {
          // Warning flicker right before firing
          lz.beam.setVisible(true);
          lz.beam.setAlpha(0.2 + Math.sin(t * 40) * 0.2);
          lz.zone.body.enable = false;
        }
      }
    }

    // Conveyors: scroll visuals
    for (const cv of this.conveyors) {
      if (!cv.surface?.active) continue;
      cv.surface.tilePositionX = (cv.surface.tilePositionX || 0) + cv.surface._scrollRate;
    }

    // Phase platforms: cycle visible/collidable with fade warning
    for (const pp of this.phasePlatforms) {
      if (!pp.sprite?.active) continue;
      pp.timer += dt;
      if (pp.active) {
        if (pp.timer >= pp.onTime - 400) {
          // Warning fade
          pp.sprite.setAlpha(0.4 + Math.sin(t * 18) * 0.2);
        } else {
          pp.sprite.setAlpha(0.9);
        }
        if (pp.timer >= pp.onTime) {
          pp.timer = 0;
          pp.active = false;
          pp.sprite.setVisible(false);
          pp.sprite.body.enable = false;
        }
      } else {
        if (pp.timer >= pp.offTime) {
          pp.timer = 0;
          pp.active = true;
          pp.sprite.setVisible(true);
          pp.sprite.setAlpha(0.9);
          pp.sprite.body.enable = true;
        }
      }
    }

    // Arrow turrets: fire volleys of darts
    for (const at of this.arrowTurrets) {
      at.timer += dt;
      // Offset initial fire by phase
      if (at.burstsPending > 0) {
        at.burstTimer -= dt;
        if (at.burstTimer <= 0) {
          this.spawnArrowDart(at);
          at.burstsPending--;
          at.burstTimer = at.burstSpacing;
        }
      } else if (at.timer >= at.interval + at.phase) {
        at.timer = 0;
        at.phase = 0;
        at.burstsPending = at.burstSize;
        at.burstTimer = 0;
      }
    }

    // Active arrow darts: life decrement / cleanup
    for (let i = this.activeArrowDarts.length - 1; i >= 0; i--) {
      const d = this.activeArrowDarts[i];
      if (!d.active) { this.activeArrowDarts.splice(i, 1); continue; }
      d._life -= dt;
      if (d._life <= 0) {
        this._destroyArrowDart(d);
        this.activeArrowDarts.splice(i, 1);
      }
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

  /** Trigger level-complete flow when the final boss room is cleared.
   *  Rooms are no longer sealed on entry; this simply watches for room29
   *  to be empty of enemies after the boss is defeated. */
  checkRoomCleared() {
    if (this._levelCompleteTriggered) return;
    if (!this.scene.enemies) return;
    const children = this.scene.enemies.getChildren();
    if (children.length === 0) return;
    const alive = children.filter(e => !e.isDead);
    if (alive.length > 0) return;

    // Void King arena — trigger chapter 2 unlock sequence.
    if (this.currentRoomId === 'room29'
        && !this.scene.gameState?.hasFlag('chapter2_unlocked')) {
      this._levelCompleteTriggered = true;
      this.scene.time.delayedCall(2500, () => {
        if (this.scene.playChapterTransition) this.scene.playChapterTransition();
        else this.scene.showLevelComplete();
      });
      return;
    }

    // Final boss arena — game complete.
    if (this.currentRoomId === 'room58'
        && !this.scene.gameState?.hasFlag('game_complete')) {
      this._levelCompleteTriggered = true;
      this.scene.time.delayedCall(2500, () => {
        if (this.scene.playGameCompleteSequence) this.scene.playGameCompleteSequence();
      });
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
    if (this.wallLayer) { this.wallLayer.clear(true, true); this.wallLayer = null; }
    if (this.platformGroup) { this.platformGroup.clear(true, true); this.platformGroup = null; }

    for (const d of this.doorZones) {
      if (d.glowTween) d.glowTween.stop();
      if (d.pulseTween) d.pulseTween.stop();
      if (d.haloTween) d.haloTween.stop();
      if (d.portalGlow && d.portalGlow.active) d.portalGlow.destroy();
      if (d.portalHalo && d.portalHalo.active) d.portalHalo.destroy();
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

    for (const fs of this.fireballShooters) {
      if (fs.sprite && fs.sprite.active) fs.sprite.destroy();
    }
    this.fireballShooters = [];

    for (const fb of this.activeFireballs) {
      this.destroyFireball(fb);
    }
    this.activeFireballs = [];

    for (const fs of this.floorSpikes) {
      if (fs.sprite && fs.sprite.active) fs.sprite.destroy();
      if (fs.zone && fs.zone.active) fs.zone.destroy();
    }
    this.floorSpikes = [];

    for (const sb of this.sawBlades) {
      if (sb.sprite && sb.sprite.active) sb.sprite.destroy();
      if (sb.zone && sb.zone.active) sb.zone.destroy();
    }
    this.sawBlades = [];

    for (const fj of this.flameJets) {
      if (fj.base && fj.base.active) fj.base.destroy();
      if (fj.flame && fj.flame.active) fj.flame.destroy();
      if (fj.zone && fj.zone.active) fj.zone.destroy();
    }
    this.flameJets = [];

    for (const ip of this.icePatches) {
      if (ip.sprite && ip.sprite.active) ip.sprite.destroy();
      if (ip.zone && ip.zone.active) ip.zone.destroy();
    }
    this.icePatches = [];

    for (const ic of this.icicleDrops) {
      if (ic.sprite && ic.sprite.active) ic.sprite.destroy();
      if (ic.fallBody && ic.fallBody.active) ic.fallBody.destroy();
    }
    this.icicleDrops = [];
    for (const ic of this.activeIcicles) {
      if (ic.fallBody && ic.fallBody.active) ic.fallBody.destroy();
    }
    this.activeIcicles = [];

    for (const cr of this.crushers) {
      if (cr.sprite && cr.sprite.active) cr.sprite.destroy();
      if (cr.zone && cr.zone.active) cr.zone.destroy();
    }
    this.crushers = [];

    for (const lz of this.laserBeams) {
      if (lz.emitter && lz.emitter.active) lz.emitter.destroy();
      if (lz.beam && lz.beam.active) lz.beam.destroy();
      if (lz.zone && lz.zone.active) lz.zone.destroy();
    }
    this.laserBeams = [];

    for (const cv of this.conveyors) {
      if (cv.surface && cv.surface.active) cv.surface.destroy();
      if (cv.topZone && cv.topZone.active) cv.topZone.destroy();
    }
    this.conveyors = [];

    for (const pp of this.phasePlatforms) {
      if (pp.sprite && pp.sprite.active) pp.sprite.destroy();
    }
    this.phasePlatforms = [];

    for (const at of this.arrowTurrets) {
      if (at.sprite && at.sprite.active) at.sprite.destroy();
    }
    this.arrowTurrets = [];

    for (const d of this.activeArrowDarts) {
      this._destroyArrowDart(d);
    }
    this.activeArrowDarts = [];

    for (const s of this.checkpointShrines) {
      if (s.base && s.base.active) s.base.destroy();
      if (s.lit && s.lit.active) s.lit.destroy();
      if (s.glow && s.glow.active) s.glow.destroy();
      if (s.zone && s.zone.active) s.zone.destroy();
    }
    this.checkpointShrines = [];

    for (const l of this.loreFragments) { if (l && l.active) l.destroy(); }
    this.loreFragments = [];

    if (this.weaponPickups) {
      for (const p of this.weaponPickups) { if (p && p.active) p.destroy(); }
      this.weaponPickups = [];
    }
    if (this.itemPickups) {
      for (const p of this.itemPickups) { if (p && p.active) p.destroy(); }
      this.itemPickups = [];
    }

    for (const sw of this.secretWalls) {
      if (sw.sprite && sw.sprite.active) sw.sprite.destroy();
    }
    this.secretWalls = [];
    if (this.secretWallGroup) { this.secretWallGroup.clear(true, true); this.secretWallGroup = null; }

    if (this.grappleAnchors) {
      for (const g of this.grappleAnchors) {
        if (g.pulse) g.pulse.stop();
        if (g.sprite && g.sprite.active) g.sprite.destroy();
      }
      this.grappleAnchors = [];
    }
    if (this.crumbleWalls) this.crumbleWalls = [];

    for (const n of this.npcs) {
      if (n.npc && n.npc.active) n.npc.destroy();
      if (n.zone && n.zone.active) n.zone.destroy();
    }
    this.npcs = [];

    if (this.scene.enemies) { this.scene.enemies.clear(true, true); }

    if (this.fogParticles) { this.fogParticles.destroy(); this.fogParticles = null; }

    for (const e of this.dripEmitters) { e.destroy(); }
    this.dripEmitters = [];

    for (const l of this.parallaxLayers) { if (l && l.active) l.destroy(); }
    this.parallaxLayers = [];

    this.scene.physics.world.colliders.destroy();
    this.hazardDamageCooldown = 0;
  }
}
