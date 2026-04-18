import * as Phaser from 'phaser';
import { Player, isJpProfileName } from '../entities/Player.js';
import { WEAPONS } from '../systems/Inventory.js';
import { LevelManager } from '../level/LevelManager.js';
import { HUD } from '../ui/HUD.js';
import { InputManager } from '../systems/InputManager.js';
import { TILE_SIZE, rooms } from '../level/rooms.js';
import * as SaveGame from '../persistence/SaveGame.js';
import { GameState } from '../state/GameState.js';
import { CameraRig } from '../systems/CameraRig.js';
import { InventoryMenu } from '../ui/InventoryMenu.js';
import { MultiplayerClient, colorFromName } from '../systems/Multiplayer.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { PadInputSource } from '../systems/PadInputSource.js';
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

    // JP profile always runs in god mode, even on reloaded saves. Also
    // top up the weapon rack in case this save predates the "all weapons"
    // unlock.
    if (isJpProfileName(this.savedPlayerName)) {
      this.player.godMode = true;
      this.player.hasMap = true;
      for (const id of Object.keys(WEAPONS)) {
        this.player.inventory.acquireWeapon(id);
      }
    }

    this.hud = new HUD(this);
    this.inventoryMenu = new InventoryMenu(this);

    if (this.textures.exists('player_rim_light')) {
      this.playerRimLight = this.add.image(0, 0, 'player_rim_light');
      this.playerRimLight.setBlendMode(Phaser.BlendModes.ADD);
      this.playerRimLight.setDepth(6);
      this.playerRimLight.setAlpha(0.38);
    }

    // Keyboard pause/escape paths. Menu-toggle (I / TAB / gamepad START) is
    // handled every frame via InputManager's menuPressed edge so a single
    // press doesn't get double-consumed by both a listener and the edge.
    this.input.keyboard.on('keydown-P', () => this.togglePause());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryMenu?.visible) { this.inventoryMenu.close(); this.physics.resume(); return; }
      this.togglePause();
    });

    this._secretWarpSeq = [];
    this._secretWarpPattern = ['up', 'down', 'up', 'down', 'left', 'right', 'left', 'right'];
    this._secretWarpDeadline = null;
    this._secretWarpPrevDirs = { up: false, down: false, left: false, right: false };

    this._upStuckHoldMs = 0;
    this._upRecoverArmed = true;

    this.setupSoloAutosave();
    this.time.delayedCall(2000, () => this.saveGameIfEligible(false));

    if (data?.multiplayer) {
      this.setupMultiplayer(data.multiplayer);
    }

    if (data?.coopHint) {
      this.showCoopJoinHint();
    }

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
      g: this.input.keyboard.addKey('G'),
      i: this.input.keyboard.addKey('I'),
      k: this.input.keyboard.addKey('K'),
      tab: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB),
      saveGame: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B),
      p: this.input.keyboard.addKey('P'),
      enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      esc: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      pageLeft: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.OPEN_BRACKET),
      pageRight: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CLOSED_BRACKET),
    };

    // Prevent Tab from moving browser focus away from the canvas
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.TAB,
    ]);
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

  _gpPadActive() {
    return !!(this.inputManager && this.inputManager.getGamepad && this.inputManager.getGamepad());
  }

  update(time, delta) {
    if (this.transitioning) return;

    const dt = Math.min(delta, 33.33);

    this.inputManager.update();
    const input = this.inputManager.state;
    this.pollSecretWarpDirectionalEdges();

    if (this.inputManager.touch.active) {
      const t = this.inputManager.touch._pressed;
      if (t.pause && !this._pauseTouchPrev) {
        this.togglePause();
      }
      this._pauseTouchPrev = !!t.pause;
    }

    // Gamepad-driven global toggles: START opens/closes inventory, SELECT pauses
    if (input.menuPressed) this.toggleInventoryMenu();
    else if (input.pausePressed) {
      if (this.inventoryMenu?.visible) { this.inventoryMenu.close(); this.physics.resume(); }
      else this.togglePause();
    }

    if (this.paused) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.saveGame)
        || (input.confirmPressed && this._gpPadActive())) {
        this.saveGameIfEligible(true);
      }
      return;
    }

    if (this.inventoryMenu && this.inventoryMenu.visible) {
      if (typeof this.inventoryMenu.tick === 'function') this.inventoryMenu.tick(input);
      return;
    }
    if (this.dialogueActive) {
      if (typeof this._dialogueTick === 'function') this._dialogueTick(input);
      return;
    }

    if (this.hud && this.hud.mapOverlay && this.hud.mapOverlay.visible) {
      if (input.cancelPressed || input.menuPressed) this.hud.mapOverlay.hide();
      return;
    }

    this.pollUpHoldSoftRecover(dt);

    if (this.player2Input) this.player2Input.update();
    this.pollCoopJoin();

    this.player.update(dt);
    if (this.player2 && !this.player2.isDead) this.player2.update(dt);
    if (this.levelManager) this.levelManager.update(dt);

    if (this.multiplayer) this.updateMultiplayer(dt);
    if (this.coopCameraEnabled) this.updateCoopCamera();

    if (this.playerRimLight) {
      this.playerRimLight.setPosition(this.player.x, this.player.y);
    }
    if (this.player2RimLight && this.player2) {
      this.player2RimLight.setPosition(this.player2.x, this.player2.y);
    }

    if (this.gamepadDebugText) {
      this.gamepadDebugText.setText(InputManager.formatGamepadsDebug());
    }

    const roomH = this.levelManager.roomPixelH;
    for (const pl of this.getActivePlayers()) {
      if (pl.y > roomH + 32 && !pl.isDead) pl.die();
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

    // Use the FADE_OUT_COMPLETE event rather than polling the per-frame
    // progress callback: the event fires exactly once, after the effect
    // has marked itself complete, so we can't accidentally load the room
    // while the Fade.update loop is still executing (which would make
    // fadeIn reset state mid-tick).
    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.levelManager.loadRoom(roomId, spawnX, spawnY);
      cam.fadeIn(400, 0, 0, 0);
      this.transitioning = false;
      this.saveGameIfEligible(false);
    });
    cam.fade(300, 0, 0, 0, true);
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
    const list = [this.player];
    if (this.player2) list.push(this.player2);
    return list;
  }

  respawnPlayer(who) {
    // Couch co-op: if a specific player died but the other is still alive,
    // respawn just them at their checkpoint without tearing down the room.
    const target = who || this.player;
    const other = target === this.player ? this.player2 : this.player;
    const otherAlive = other && !other.isDead;
    if (this.player2 && otherAlive) {
      target.respawn();
      this.showCoopToast(`${target === this.player ? 'P1' : 'P2'} REVIVED`);
      return;
    }

    this.transitioning = true;
    this.cameras.main.fade(400, 10, 0, 0, false, (cam, progress) => {
      if (progress >= 1) {
        this.levelManager.loadRoom(this.levelManager.currentRoomId);
        this.player.respawn();
        if (this.player2) this.player2.respawn();
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

  toggleInventoryMenu() {
    if (this.transitioning) return;
    if (this.dialogueActive) return;
    if (this.paused) return;
    if (this.hud?.mapOverlay?.visible) this.hud.mapOverlay.hide();
    if (!this.inventoryMenu) return;
    if (!this.inventoryMenu.visible) {
      this.physics.pause();
      this.saveGameIfEligible(false);
      this.inventoryMenu.open();
    } else {
      this.inventoryMenu.close();
      this.physics.resume();
    }
  }

  togglePause() {
    if (this.transitioning) return;
    if (this.hud && this.hud.mapOverlay && this.hud.mapOverlay.visible) return;
    if (this.inventoryMenu?.visible) return;

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
    let resumeHint = isMobile
      ? '[ TAP PAUSE TO RESUME ]'
      : '[ P / ESC / SELECT TO RESUME ]';
    if (!isMobile) {
      resumeHint += '  ·  B / A (pad) SAVE';
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

  /**
   * Post-Void-King chapter bridge. Plays lore cards, then crumbles the east
   * wall of the throne arena to reveal a new door leading to chapter 2.
   * Sets the chapter2_unlocked flag so the door persists across reloads.
   */
  playChapterTransition() {
    if (this._chapterTransitionPlayed) return;
    this._chapterTransitionPlayed = true;
    this.transitioning = true;
    if (this.hud?.mapOverlay) this.hud.mapOverlay.hide();

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const scrim = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0)
      .setScrollFactor(0).setDepth(250);
    this.tweens.add({ targets: scrim, fillAlpha: 0.78, duration: 1400 });

    const cards = [
      'The Void King lies still.',
      'His crown cracks open, and a wind that has not stirred in ages\nrises from the stone — warm, tasting of rain.',
      'Somewhere above, a wall that has stood for a thousand years begins to fall.',
    ];

    const showCard = (i, cb) => {
      if (i >= cards.length) { cb(); return; }
      const t = this.add.text(cx, cy - 20, cards[i], {
        fontSize: '18px', fontFamily: 'monospace', color: '#e0d4b8',
        stroke: '#000', strokeThickness: 4, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(251).setAlpha(0);
      this.tweens.add({
        targets: t, alpha: 1, duration: 700, yoyo: true, hold: 1700,
        onComplete: () => { t.destroy(); showCard(i + 1, cb); },
      });
    };

    showCard(0, () => {
      this.triggerEastWallCrumble();
      this.time.delayedCall(2600, () => {
        this.tweens.add({
          targets: scrim, fillAlpha: 0, duration: 900,
          onComplete: () => scrim.destroy(),
        });
        this.transitioning = false;
      });
    });
  }

  /**
   * Physical/visual: shatter the crumble wall sealing room 29's east side,
   * set the chapter2_unlocked flag, and spawn the door into chapter 2.
   */
  triggerEastWallCrumble() {
    const lm = this.levelManager;
    if (!lm) return;
    this.gameState?.setFlag('chapter2_unlocked', true);
    this.cameras.main.shake(1600, 0.012);
    if (lm.crumbleChapterWall) lm.crumbleChapterWall();
    if (typeof this.saveGameIfEligible === 'function') {
      this.time.delayedCall(2800, () => this.saveGameIfEligible(false));
    }
  }

  /**
   * Victory sequence after The Scoured Sun. Fades to gold, displays the
   * epilogue cards, sets the game_complete flag, and leaves the scene in a
   * settled "bow" state (input still works so the player can wander, save).
   */
  playGameCompleteSequence() {
    if (this._gameCompletePlayed) return;
    this._gameCompletePlayed = true;
    this.gameState?.setFlag('game_complete', true);
    this.transitioning = true;
    if (this.hud?.mapOverlay) this.hud.mapOverlay.hide();
    this.physics.pause();

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const wash = this.add.rectangle(cx, cy, cam.width, cam.height, 0xffd488, 0)
      .setScrollFactor(0).setDepth(260).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: wash, fillAlpha: 0.85, duration: 1800 });

    const scrim = this.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0)
      .setScrollFactor(0).setDepth(261);
    this.tweens.add({ targets: scrim, fillAlpha: 0.78, duration: 2400, delay: 1400 });

    const cards = [
      'The Scoured Sun scatters.',
      'Warmth returns to the stones of Ur-Karath.\nRain falls on fields that forgot the taste of it.',
      'You walk on into the morning.',
    ];

    const showCard = (i, cb) => {
      if (i >= cards.length) { cb(); return; }
      const t = this.add.text(cx, cy - 10, cards[i], {
        fontSize: '20px', fontFamily: 'monospace', color: '#fff0c8',
        stroke: '#000', strokeThickness: 4, align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(262).setAlpha(0);
      this.tweens.add({
        targets: t, alpha: 1, duration: 900, yoyo: true, hold: 2200,
        onComplete: () => { t.destroy(); showCard(i + 1, cb); },
      });
    };

    this.time.delayedCall(1800, () => {
      showCard(0, () => {
        const title = this.add.text(cx, cy - 30, 'THE DEPTHS HAVE ENDED', {
          fontSize: '32px', fontFamily: 'monospace', color: '#ffd880',
          stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(263).setAlpha(0);
        const sub = this.add.text(cx, cy + 20, 'a quiet morning beyond the ruin', {
          fontSize: '16px', fontFamily: 'monospace', color: '#e0c898',
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(263).setAlpha(0);
        this.tweens.add({ targets: [title, sub], alpha: 1, duration: 1600 });
      });
    });
  }

  // ── Multiplayer ─────────────────────────────────────────────────────────

  setupMultiplayer(mpData) {
    const { roomCode, playerId, name } = mpData;
    const color = colorFromName(name);
    this.multiplayer = new MultiplayerClient({ roomCode, playerId, name, color });
    this.remotePlayers = new Map();

    this.multiplayer.bindLocalStateProvider(() => this.snapshotLocalPlayer());
    this.multiplayer.onPlayersUpdate = (players) => this.reconcileRemotePlayers(players);
    this.multiplayer.onConnectionError = () => {
      this.showMultiplayerToast('Network hiccup…');
    };
    this.multiplayer.start();

    const cam = this.cameras.main;
    const pillBg = this.add.rectangle(cam.width - 90, 18, 160, 22, 0x000000, 0.55)
      .setOrigin(0.5).setScrollFactor(0).setDepth(220);
    const codeTxt = this.add.text(cam.width - 90, 18, `ROOM ${roomCode}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#9effc2',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(221);
    this._mpHudPill = pillBg;
    this._mpHudCode = codeTxt;

    const onShutdown = () => this.teardownMultiplayer();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, onShutdown);
    this.events.once(Phaser.Scenes.Events.DESTROY, onShutdown);
    window.addEventListener('beforeunload', onShutdown);
  }

  snapshotLocalPlayer() {
    if (!this.player || this.player.isDead === true) return null;
    const roomId = this.levelManager?.currentRoomId || 'room1';
    const playingKey = this.player.anims?.currentAnim?.key || '';
    const armed = playingKey.endsWith('_armed');
    let anim = this.player.currentAnim || 'idle';
    if (anim === 'run' && armed) anim = 'run_armed';
    if (anim === 'idle' && armed) anim = 'idle_armed';
    return {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      roomId,
      facing: this.player.facing === -1 ? -1 : 1,
      anim,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
    };
  }

  reconcileRemotePlayers(playersMap) {
    if (!this.remotePlayers) return;
    const currentRoom = this.levelManager?.currentRoomId;
    const seen = new Set();
    for (const [id, snap] of playersMap) {
      seen.add(id);
      let rp = this.remotePlayers.get(id);
      if (!rp) {
        rp = new RemotePlayer(this, id, snap);
        this.remotePlayers.set(id, rp);
      } else {
        rp.applySnapshot(snap);
      }
      rp.setVisibleInRoom(rp.roomId === currentRoom);
    }
    for (const [id, rp] of [...this.remotePlayers]) {
      if (!seen.has(id)) {
        rp.destroy();
        this.remotePlayers.delete(id);
      }
    }
  }

  updateMultiplayer(dt) {
    if (!this.remotePlayers) return;
    const currentRoom = this.levelManager?.currentRoomId;
    for (const rp of this.remotePlayers.values()) {
      rp.setVisibleInRoom(rp.roomId === currentRoom);
      if (rp.roomId === currentRoom) rp.tick(dt);
    }
  }

  showMultiplayerToast(message) {
    if (this._mpToastTimer && this._mpToastTimer.getProgress() < 1) return;
    const cam = this.cameras.main;
    const t = this.add.text(cam.width - 90, 40, message, {
      fontSize: '11px', fontFamily: 'monospace', color: '#ffaa66',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(221);
    this._mpToastTimer = this.time.delayedCall(1500, () => t.destroy());
  }

  teardownMultiplayer() {
    if (this.remotePlayers) {
      for (const rp of this.remotePlayers.values()) rp.destroy();
      this.remotePlayers.clear();
      this.remotePlayers = null;
    }
    if (this.multiplayer) {
      this.multiplayer.leave().catch(() => {});
      this.multiplayer = null;
    }
    this._mpHudPill?.destroy?.();
    this._mpHudCode?.destroy?.();
    this._mpHudPill = null;
    this._mpHudCode = null;
  }

  // ── Couch co-op (local 2-player) ────────────────────────────────────────

  /**
   * If an unused gamepad slot has any button pressed, spawn P2.
   *
   * Cheap by design: throttled to ~8 fps, short-circuited when there's
   * nothing plausible to scan (solo with 0–1 pads, or P1 is keyboard-only
   * and InputManager hasn't claimed a pad yet — otherwise the first button
   * press on a controller would bind P2 instead of giving P1 a pad).
   */
  pollCoopJoin() {
    if (this.player2 || this._coopJoinDisabled) return;
    if (!navigator.getGamepads) return;

    this._coopPollCounter = (this._coopPollCounter | 0) + 1;
    if (this._coopPollCounter < 8) return;
    this._coopPollCounter = 0;

    const p1Index = this.inputManager?.padIndex ?? -1;
    if (p1Index < 0) return;

    const list = navigator.getGamepads();
    if (!list) return;

    let connected = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i] && list[i].connected) connected++;
      if (connected >= 2) break;
    }
    if (connected < 2) return;

    if (!this._coopJoinPrev) this._coopJoinPrev = new Map();
    for (let i = 0; i < list.length; i++) {
      const pad = list[i];
      if (!pad || !pad.connected) { this._coopJoinPrev.delete(i); continue; }
      if (i === p1Index) continue;
      let prev = this._coopJoinPrev.get(i);
      if (!prev) { prev = {}; this._coopJoinPrev.set(i, prev); }
      if (PadInputSource.anyActionEdge(pad, prev)) {
        this.spawnPlayer2(i);
        return;
      }
    }
  }

  spawnPlayer2(padIndex) {
    if (this.player2) return;

    this.player2Input = new PadInputSource(padIndex);

    const p2 = new Player(this, this.player.x + 24, this.player.y);
    p2.setInputProvider(() => this.player2Input.state);
    p2.setTint(0x88c8ff);
    p2.setDepth(5);
    if (this.player.godMode) p2.godMode = true;
    if (this.player.hasMap) p2.hasMap = true;
    if (isJpProfileName(this.savedPlayerName)) p2.applyJpUnlock();
    this.player2 = p2;

    // Flip the camera over first so the upcoming room reload's applyRoom
    // picks up the midpoint target instead of snapping to P1.
    this.enableCoopCamera();

    // Rebuild the current room so every collider/overlap the level wires
    // up (walls, platforms, enemies, hazards, portals, pickups, NPCs, …)
    // is registered against BOTH players. Reloading in place is simpler
    // and safer than trying to replay every spawn path by hand — and
    // positionPlayer fans them out around the spawn.
    this.levelManager.loadRoom(this.levelManager.currentRoomId);

    this.setupHudForPlayer2();

    this.showCoopToast('PLAYER 2 JOINED');
    this._coopJoinPrev?.delete(padIndex);
    this.hideCoopJoinHint();
  }

  /** Persistent HUD banner nudging P2 to press a button on a 2nd pad. */
  showCoopJoinHint() {
    if (this._coopHint || this.player2) return;
    const cam = this.cameras.main;
    const bg = this.add.rectangle(cam.width / 2, 40, 420, 28, 0x001122, 0.78)
      .setScrollFactor(0).setDepth(259).setStrokeStyle(1, 0x88c8ff, 0.7);
    const txt = this.add.text(
      cam.width / 2, 40,
      'PLAYER 2: press any button on a 2nd controller to join',
      {
        fontSize: '11px', fontFamily: 'monospace', color: '#88c8ff',
        stroke: '#000', strokeThickness: 3,
      },
    ).setOrigin(0.5).setScrollFactor(0).setDepth(260);
    const pulse = this.tweens.add({
      targets: [bg, txt], alpha: { from: 1, to: 0.55 },
      duration: 900, yoyo: true, repeat: -1,
    });
    this._coopHint = { bg, txt, pulse };
  }

  hideCoopJoinHint() {
    if (!this._coopHint) return;
    const { bg, txt, pulse } = this._coopHint;
    this._coopHint = null;
    pulse?.remove?.();
    this.tweens.add({
      targets: [bg, txt], alpha: 0, duration: 300,
      onComplete: () => { bg.destroy(); txt.destroy(); },
    });
  }

  enableCoopCamera() {
    if (this.coopCameraEnabled) return;
    this.coopCameraEnabled = true;

    this._coopCamTarget = this.add.rectangle(
      this.player.x,
      this.player.y,
      2, 2, 0xff0000, 0,
    ).setDepth(-100);

    // Scene-level hook CameraRig.applyRoom consults when choosing a follow target.
    this.localFollowTarget = () => this._coopCamTarget;

    const cam = this.cameras.main;
    cam.startFollow(this._coopCamTarget, true, 0.12, 0.12);
  }

  updateCoopCamera() {
    if (!this._coopCamTarget || !this.player2) return;
    const ax = this.player.x;
    const ay = this.player.y;
    const bx = this.player2.x;
    const by = this.player2.y;
    this._coopCamTarget.setPosition((ax + bx) * 0.5, (ay + by) * 0.5);

    const cam = this.cameras.main;
    const viewW = cam.width;
    const viewH = cam.height;
    const dx = Math.abs(ax - bx);
    const dy = Math.abs(ay - by);
    const needZoomX = dx > viewW * 0.7 ? viewW * 0.7 / dx : 1;
    const needZoomY = dy > viewH * 0.7 ? viewH * 0.7 / dy : 1;
    const target = Math.max(0.65, Math.min(1, needZoomX, needZoomY));
    const current = cam.zoom;
    cam.setZoom(current + (target - current) * 0.08);
  }

  setupHudForPlayer2() {
    if (this._hudP2Created) return;
    this._hudP2Created = true;

    const baseY = 98;
    const label = this.add.text(30, baseY, 'P2', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#88c8ff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);

    const hearts = [];
    for (let i = 0; i < this.player2.maxHp; i++) {
      const full = this.add.image(54 + i * 22, baseY, 'health_orb')
        .setScrollFactor(0).setDepth(100).setScale(0.8).setTint(0x88c8ff);
      const empty = this.add.image(54 + i * 22, baseY, 'health_orb_empty')
        .setScrollFactor(0).setDepth(99).setScale(0.8);
      hearts.push({ full, empty });
    }
    this._hudP2 = { label, hearts };

    this._hudP2UpdateEvt = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.player2 || !this._hudP2) return;
        for (let i = 0; i < this._hudP2.hearts.length; i++) {
          this._hudP2.hearts[i].full.setVisible(i < this.player2.hp);
        }
      },
    });
  }

  showCoopToast(msg) {
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, 120, msg, {
      fontSize: '14px', fontFamily: 'monospace', color: '#88c8ff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(260).setAlpha(0);
    this.tweens.add({
      targets: t, alpha: 1, duration: 250, hold: 1100, yoyo: true,
      onComplete: () => t.destroy(),
    });
  }
}
