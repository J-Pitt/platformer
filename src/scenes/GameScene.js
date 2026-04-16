import * as Phaser from 'phaser';
import { Player, isJpProfileName } from '../entities/Player.js';
import { LevelManager } from '../level/LevelManager.js';
import { HUD } from '../ui/HUD.js';
import { InputManager } from '../systems/InputManager.js';
import { TILE_SIZE, rooms } from '../level/rooms.js';
import * as SaveGame from '../persistence/SaveGame.js';
import { GameState } from '../state/GameState.js';
import { CameraRig } from '../systems/CameraRig.js';
export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create(data) {
    this.setupInput();
    this.setupParticleEmitters();

    const touchEl = document.getElementById('touch-controls');
    if (touchEl) touchEl.classList.remove('visible');

    this.inputManager = new InputManager(this);

    const urlParams = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    if (urlParams.has('gamepaddebug')) {
      this.gamepadDebugText = this.add.text(8, 8, '', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#7fffaa',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 8 },
        lineSpacing: 4,
      }).setOrigin(0, 0).setDepth(300).setScrollFactor(0);
    }

    this.player = new Player(this, 0, 0);

    this.levelManager = new LevelManager(this);
    this.gameState = new GameState();
    this.cameraRig = new CameraRig(this);

    this.transitioning = false;
    this.paused = false;
    this.pauseElements = [];
    this.dialogueActive = false;

    const saved = data?.fromSave ? SaveGame.loadGameState() : null;

    if (saved) {
      this.savedPlayerName = saved.playerName || SaveGame.getStoredPlayerName() || 'Traveler';
      this.gameState.fromJSON(saved.world);
      this.levelManager.loadRoom(saved.roomId, saved.spawnTileX, saved.spawnTileY);
      this.player.applySaveState(saved);
    } else {
      this.gameState.reset();
      this.savedPlayerName =
        (data?.profileName && String(data.profileName).trim()) ||
        SaveGame.getStoredPlayerName() ||
        'Traveler';
      this.levelManager.loadRoom('room1');
      if (isJpProfileName(this.savedPlayerName)) {
        this.player.applyJpUnlock();
      }
    }

    this.hud = new HUD(this);

    if (this.textures.exists('player_rim_light')) {
      this.playerRimLight = this.add.image(0, 0, 'player_rim_light');
      this.playerRimLight.setBlendMode(Phaser.BlendModes.ADD);
      this.playerRimLight.setDepth(6);
      this.playerRimLight.setAlpha(0.38);
    }

    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => this.togglePause());

    this._secretWarpSeq = [];
    this._secretWarpPattern = ['up', 'down', 'up', 'down', 'left', 'right', 'left', 'right'];
    this._secretWarpDeadline = null;
    this._secretWarpPrevDirs = { up: false, down: false, left: false, right: false };

    this._upStuckHoldMs = 0;
    this._upRecoverArmed = true;

    this.setupSoloAutosave();
    this.time.delayedCall(2000, () => this.saveGameIfEligible(false));

    if (this.textures.exists('screen_vignette')) {
      this.add.image(480, 270, 'screen_vignette')
        .setScrollFactor(0)
        .setDepth(199)
        .setAlpha(0.68)
        .setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    // Phaser 4: subtle full-viewport bloom via unified Filters (replaces v3 Bloom FX).
    if (this.sys.game?.renderer?.type === Phaser.WEBGL && typeof Phaser.Actions?.AddEffectBloom === 'function') {
      try {
        Phaser.Actions.AddEffectBloom(this.cameras.main, {
          threshold: 0.82,
          blurRadius: 5,
          blurSteps: 1,
          blurQuality: 1,
          blendAmount: 0.07,
        });
      } catch (e) {
        console.warn('[GameScene] AddEffectBloom skipped', e);
      }
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      w: this.input.keyboard.addKey('W'),
      a: this.input.keyboard.addKey('A'),
      s: this.input.keyboard.addKey('S'),
      d: this.input.keyboard.addKey('D'),
      q: this.input.keyboard.addKey('Q'),
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      z: this.input.keyboard.addKey('Z'),
      x: this.input.keyboard.addKey('X'),
      c: this.input.keyboard.addKey('C'),
      j: this.input.keyboard.addKey('J'),
      shift: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      e: this.input.keyboard.addKey('E'),
      f: this.input.keyboard.addKey('F'),
      k: this.input.keyboard.addKey('K'),
      saveGame: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
    };
  }

  setupParticleEmitters() {
    this.dustEmitter = this.add.particles(0, 0, 'particle_dust', {
      lifespan: 400,
      speed: { min: 10, max: 30 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.5, end: 0 },
      emitting: false,
    });
    this.dustEmitter.setDepth(3);

    this.jumpEmitter = this.add.particles(0, 0, 'particle_dust', {
      lifespan: 350,
      speed: { min: 20, max: 60 },
      angle: { min: 240, max: 300 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      emitting: false,
    });
    this.jumpEmitter.setDepth(3);

    this.wallJumpEmitter = this.add.particles(0, 0, 'particle_teal', {
      lifespan: 450,
      speed: { min: 30, max: 70 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 0.7, end: 0 },
      emitting: false,
      blendMode: 'ADD',
    });
    this.wallJumpEmitter.setDepth(3);

    this.enemyDeathEmitter = this.add.particles(0, 0, 'particle_teal', {
      lifespan: 700,
      speed: { min: 40, max: 120 },
      scale: { start: 1.8, end: 0 },
      alpha: { start: 0.8, end: 0 },
      emitting: false,
      blendMode: 'ADD',
    });
    this.enemyDeathEmitter.setDepth(10);
  }

  localFollowTarget() {
    return this.player;
  }

  update(time, delta) {
    if (this.transitioning) return;

    const dt = Math.min(delta, 33.33);

    this.inputManager.update();
    this.pollSecretWarpDirectionalEdges();

    if (this.inputManager.touch.active) {
      const t = this.inputManager.touch._pressed;
      if (t.pause && !this._pauseTouchPrev) {
        this.togglePause();
      }
      this._pauseTouchPrev = !!t.pause;
    }

    if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.saveGame)) {
        this.saveGameIfEligible(true);
      }
      return;
    }

    if (this.dialogueActive) return;

    if (this.hud && this.hud.mapOverlay && this.hud.mapOverlay.visible) {
      return;
    }

    this.pollUpHoldSoftRecover(dt);

    this.player.update(dt);
    if (this.levelManager) this.levelManager.update(dt);

    if (this.playerRimLight) {
      this.playerRimLight.setPosition(this.player.x, this.player.y);
    }

    if (this.gamepadDebugText) {
      this.gamepadDebugText.setText(InputManager.formatGamepadsDebug());
    }

    const roomH = this.levelManager.roomPixelH;
    if (this.player.y > roomH + 32 && !this.player.isDead) {
      this.player.die();
    }
    const activePlayers = this.getActivePlayers();
    if (this.enemies) {
      this.enemies.getChildren().forEach((enemy) => {
        if (enemy.update) enemy.update(dt, activePlayers);
      });
    }

    this.levelManager.checkRoomCleared();
    this.hud.update();
  }

  /** Konami-style: ↑↓↑↓←→←→ within 5s (arrows / WASD / d-pad / stick). */
  pollSecretWarpDirectionalEdges() {
    if (!this.sys.isActive() || this.transitioning) return;
    if (!this.levelManager?.currentRoom) return;

    const st = this.inputManager.state;
    const prev = this._secretWarpPrevDirs;
    const edge = (k) => !!(st[k] && !prev[k]);
    if (edge('up')) this.feedSecretWarpDirection('up');
    else if (edge('down')) this.feedSecretWarpDirection('down');
    else if (edge('left')) this.feedSecretWarpDirection('left');
    else if (edge('right')) this.feedSecretWarpDirection('right');
    this._secretWarpPrevDirs = {
      up: !!st.up,
      down: !!st.down,
      left: !!st.left,
      right: !!st.right,
    };
  }

  feedSecretWarpDirection(dir) {
    if (!this.sys.isActive() || this.transitioning) return;
    if (!this.levelManager?.currentRoom) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pat = this._secretWarpPattern;
    const windowMs = 5000;

    if (this._secretWarpDeadline != null && now > this._secretWarpDeadline) {
      this._secretWarpSeq = [];
      this._secretWarpDeadline = null;
    }

    const expected = pat[this._secretWarpSeq.length];
    if (dir !== expected) {
      this._secretWarpSeq = dir === pat[0] ? [dir] : [];
      this._secretWarpDeadline = this._secretWarpSeq.length ? now + windowMs : null;
      return;
    }

    this._secretWarpSeq.push(dir);
    if (this._secretWarpSeq.length === 1) {
      this._secretWarpDeadline = now + windowMs;
    }

    if (this._secretWarpSeq.length >= pat.length) {
      this._secretWarpSeq = [];
      this._secretWarpDeadline = null;
      this.secretWarpRandomRoom();
    }
  }

  secretWarpRandomRoom() {
    if (this.transitioning) return;

    const cur = this.levelManager.currentRoomId;
    let ids = Object.keys(rooms).filter((id) => rooms[id] && id !== cur);
    if (ids.length === 0) ids = Object.keys(rooms).filter((id) => rooms[id]);
    if (ids.length === 0) return;
    const pick = ids[Phaser.Math.Between(0, ids.length - 1)];
    const room = rooms[pick];
    const sx = room.playerSpawn?.x ?? 3;
    const sy = room.playerSpawn?.y ?? 10;

    const cam = this.cameras.main;
    const toast = this.add.text(cam.width / 2, 48, `WARP → ${pick}`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffcc44',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(350);
    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: toast.y - 12,
      duration: 1400,
      delay: 400,
      onComplete: () => toast.destroy(),
    });

    this.transitionToRoom(pick, sx, sy);
  }

  transitionToRoom(roomId, spawnX, spawnY) {
    if (this.transitioning) return;
    this.transitioning = true;
    if (this.hud && this.hud.mapOverlay) this.hud.mapOverlay.hide();

    this.cameras.main.fade(300, 0, 0, 0, false, (cam, progress) => {
      if (progress >= 1) {
        this.levelManager.loadRoom(roomId, spawnX, spawnY);
        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.transitioning = false;
        this.saveGameIfEligible(false);
      }
    });
  }

  setupSoloAutosave() {
    this._flushSaveToStorage = () => {
      try {
        const st = SaveGame.buildSaveState(this);
        if (st) SaveGame.persistState(st);
      } catch (e) {
        console.warn('[SaveGame] flush failed', e);
      }
    };

    this._onVisibilitySave = () => {
      if (document.visibilityState === 'hidden') this._flushSaveToStorage();
    };

    window.addEventListener('beforeunload', this._flushSaveToStorage);
    window.addEventListener('pagehide', this._flushSaveToStorage);
    document.addEventListener('visibilitychange', this._onVisibilitySave);

    this._autosaveTimer = this.time.addEvent({
      delay: 12000,
      loop: true,
      callback: () => {
        if (!this.sys.isActive() || this.transitioning || this.paused) return;
        this.saveGameIfEligible(false);
      },
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._flushSaveToStorage();
      window.removeEventListener('beforeunload', this._flushSaveToStorage);
      window.removeEventListener('pagehide', this._flushSaveToStorage);
      document.removeEventListener('visibilitychange', this._onVisibilitySave);
      if (this._autosaveTimer) {
        this._autosaveTimer.remove();
        this._autosaveTimer = null;
      }
    });
  }

  saveGameIfEligible(showToast) {
    const st = SaveGame.buildSaveState(this);
    if (!st) return;
    SaveGame.persistState(st);
    if (showToast) this.showSaveToast();
  }

  showSaveToast() {
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, cam.height / 2 + 4, 'SAVED', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#40ffd8',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(352);
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: t.y - 24,
      duration: 900,
      delay: 200,
      onComplete: () => t.destroy(),
    });
  }

  getActivePlayers() {
    return [this.player];
  }

  respawnPlayer() {
    this.transitioning = true;

    this.cameras.main.fade(400, 10, 0, 0, false, (cam, progress) => {
      if (progress >= 1) {
        this.levelManager.loadRoom(this.levelManager.currentRoomId);
        this.player.respawn();
        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.transitioning = false;
        this.saveGameIfEligible(false);
      }
    });
  }

  findCheckpointRoom() {
    return this.player._checkpointRoom || this.levelManager.currentRoomId;
  }

  /** Hold UP 10s → reload checkpoint room (recover from soft-locks). Release UP before it can trigger again. */
  pollUpHoldSoftRecover(dt) {
    if (!this.player || this.player.isDead) return;
    if (!this.levelManager?.currentRoom) return;

    const upHeld = !!this.inputManager.state.up;
    if (!upHeld) {
      this._upRecoverArmed = true;
      this._upStuckHoldMs = 0;
      return;
    }
    if (!this._upRecoverArmed) return;

    this._upStuckHoldMs += dt;
    if (this._upStuckHoldMs < 10000) return;

    this._upStuckHoldMs = 0;
    this._upRecoverArmed = false;
    this.softRecoverGameplay();
  }

  resetLocalPlayersAfterRecover() {
    const pl = this.player;
    pl.body.velocity.set(0, 0);
    pl.movement.isDashing = false;
    pl.movement.dashTimer = 0;
    pl.movement.dashCooldownTimer = 0;
    pl.movement.wallJumpLockoutTimer = 0;
    pl.movement.airJumpsUsed = 0;
    if (pl.combat.isSlashing) pl.combat.endSlash();
    if (pl.combat.isKicking) pl.combat.endKick();
    pl.combat.isInvulnerable = false;
    pl.combat.invulnTimer = 0;
    pl.setAlpha(1);
  }

  softRecoverGameplay() {
    if (this.transitioning) return;
    if (!this.levelManager?.currentRoom || !this.player) return;

    this.transitioning = true;
    if (this.hud?.mapOverlay) this.hud.mapOverlay.hide();

    const roomId = this.findCheckpointRoom();
    const tx = Math.floor(this.player.checkpointX / TILE_SIZE);
    const ty = Math.floor(this.player.checkpointY / TILE_SIZE);

    this.cameras.main.fade(280, 0, 0, 0, false, (cam, progress) => {
      if (progress < 1) return;
      this.levelManager.loadRoom(roomId, tx, ty);
      this.resetLocalPlayersAfterRecover();
      this.cameras.main.fadeIn(320, 0, 0, 0);
      this.transitioning = false;
      this.saveGameIfEligible(false);

      const mainCam = this.cameras.main;
      const t = this.add.text(mainCam.width / 2, 52, 'CHECKPOINT RELOAD', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ffcc66',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(352);
      this.tweens.add({
        targets: t,
        alpha: 0,
        y: t.y - 16,
        duration: 1600,
        delay: 400,
        onComplete: () => t.destroy(),
      });
    });
  }

  togglePause() {
    if (this.transitioning) return;
    if (this.hud && this.hud.mapOverlay && this.hud.mapOverlay.visible) return;

    this.paused = !this.paused;
    if (this.paused) {
      this.physics.pause();
      this.saveGameIfEligible(false);
      this.showPauseOverlay();
    } else {
      this.physics.resume();
      this.hidePauseOverlay();
    }
  }

  showPauseOverlay() {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const bg = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.6)
      .setScrollFactor(0).setDepth(250);
    this.pauseElements.push(bg);

    const title = this.add.text(cx, cy - 20, 'PAUSED', {
      fontSize: '36px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(251);
    this.pauseElements.push(title);

    if (this.savedPlayerName) {
      const who = this.add.text(cx, cy - 58, this.savedPlayerName, {
        fontSize: '13px', fontFamily: 'monospace', color: '#8a7858',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(251);
      this.pauseElements.push(who);
    }

    const isMobile = 'ontouchstart' in window && navigator.maxTouchPoints > 1;
    let resumeHint = isMobile ? '[ TAP PAUSE TO RESUME ]' : '[ P OR ESC TO RESUME ]';
    if (!isMobile) {
      resumeHint += '  ·  B SAVE';
    }
    const hint = this.add.text(cx, cy + 30, resumeHint, {
      fontSize: '12px', fontFamily: 'monospace', color: '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(251);
    this.pauseElements.push(hint);

    if (isMobile) {
      const saveT = this.add.text(cx, cy + 58, '[ TAP TO SAVE ]', {
        fontSize: '14px', fontFamily: 'monospace', color: '#40ffd8',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(251).setInteractive({ useHandCursor: true });
      saveT.on('pointerdown', () => this.saveGameIfEligible(true));
      this.pauseElements.push(saveT);
    }
  }

  hidePauseOverlay() {
    for (const el of this.pauseElements) {
      if (el.destroy) el.destroy();
    }
    this.pauseElements = [];
  }

  showLevelComplete() {
    this.transitioning = true;
    this.physics.pause();

    const bg = this.add.rectangle(480, 270, 960, 540, 0x000000, 0)
      .setDepth(50).setScrollFactor(0);

    this.tweens.add({ targets: bg, fillAlpha: 0.7, duration: 1000 });

    const title = this.add.text(480, 220, 'LEVEL COMPLETE', {
      fontSize: '40px', fontFamily: 'monospace', color: '#40ffd8', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0).setAlpha(0);

    const sub = this.add.text(480, 280, 'The depths await...', {
      fontSize: '20px', fontFamily: 'monospace', color: '#8899aa', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(51).setScrollFactor(0).setAlpha(0);

    this.tweens.add({
      targets: title, alpha: 1, y: 210, duration: 1000, delay: 500, ease: 'Power2',
    });
    this.tweens.add({
      targets: sub, alpha: 0.8, duration: 1000, delay: 1200,
    });
  }
}
