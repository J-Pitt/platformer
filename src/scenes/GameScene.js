import { Player } from '../entities/Player.js';
import { LevelManager } from '../level/LevelManager.js';
import { HUD } from '../ui/HUD.js';
import { InputManager } from '../systems/InputManager.js';
import { TILE_SIZE } from '../level/rooms.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.setupInput();
    this.setupParticleEmitters();

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
    this.hud = new HUD(this);

    if (this.textures.exists('player_rim_light')) {
      this.playerRimLight = this.add.image(0, 0, 'player_rim_light');
      this.playerRimLight.setBlendMode(Phaser.BlendModes.ADD);
      this.playerRimLight.setDepth(6);
      this.playerRimLight.setAlpha(0.32);
    }

    this.transitioning = false;

    this.levelManager.loadRoom('room1');

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(60, 40);

    // Cinematic edge darkening (Metroidvania readability)
    if (this.textures.exists('screen_vignette')) {
      this.add.image(480, 270, 'screen_vignette')
        .setScrollFactor(0)
        .setDepth(199)
        .setAlpha(0.68)
        .setBlendMode(Phaser.BlendModes.MULTIPLY);
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

  update(time, delta) {
    if (this.transitioning) return;

    const dt = Math.min(delta, 33.33);

    this.inputManager.update();

    if (this.hud && this.hud.mapOverlay && this.hud.mapOverlay.visible) {
      return;
    }

    this.player.update(dt);
    if (this.levelManager) this.levelManager.update(dt);

    if (this.playerRimLight) {
      this.playerRimLight.setPosition(this.player.x, this.player.y);
    }

    if (this.gamepadDebugText) {
      this.gamepadDebugText.setText(InputManager.formatGamepadsDebug());
    }

    // Kill zone — below current room
    const roomH = this.levelManager.roomPixelH;
    if (this.player.y > roomH + 32 && !this.player.isDead) {
      this.player.die();
    }

    if (this.enemies) {
      this.enemies.getChildren().forEach((enemy) => {
        if (enemy.update) enemy.update(dt, this.player);
      });
    }

    this.levelManager.checkRoomCleared();
    this.hud.update();
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
      }
    });
  }

  respawnPlayer() {
    this.transitioning = true;

    this.cameras.main.fade(400, 10, 0, 0, false, (cam, progress) => {
      if (progress >= 1) {
        this.levelManager.loadRoom(this.levelManager.currentRoomId);
        this.player.respawn();
        this.cameras.main.fadeIn(400, 0, 0, 0);
        this.transitioning = false;
      }
    });
  }

  findCheckpointRoom() {
    return this.player._checkpointRoom || this.levelManager.currentRoomId;
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
