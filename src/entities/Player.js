import * as Phaser from 'phaser';
import { MovementSystem } from '../systems/Movement.js';
import { CombatSystem } from '../systems/Combat.js';
import { Inventory, WEAPONS } from '../systems/Inventory.js';
import { TILE_SIZE } from '../level/rooms.js';
import { shakeScene } from '../systems/CameraRig.js';

const MAX_HP = 5;

const JP_UNLOCK_ABILITIES = [
  'slash',
  'wallJump',
  'dash',
  'doubleJump',
  'spear',
  'kick',
  'map',
  'glide',
  'grapple',
];

/** Solo dev profile: exact name JP (case-insensitive). */
export function isJpProfileName(name) {
  return String(name ?? '').trim().toUpperCase() === 'JP';
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(16, 28);
    this.body.setOffset(16, 14);
    this.body.setMaxVelocity(300, 500);
    this.setDepth(5);

    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.facing = 1;
    this.isDead = false;

    this.movement = new MovementSystem(this);
    this.combat = new CombatSystem(this);
    this.inventory = new Inventory(this);

    this.spawnX = x;
    this.spawnY = y;
    this.checkpointX = x;
    this.checkpointY = y;

    this.hasMap = false;
    this.coins = 0;
    this.visitedRooms = new Set();

    this.currentAnim = 'idle';

    /** Land / jump squash–stretch (solo feel). */
    this._wasOnGround = false;
    this._juiceBusy = false;
    this._idleTween = null;
    this._lastVy = 0;
    this._hurtFlashTimer = 0;
    this._tiltTarget = 0;

    this.setupAnimations();

  }

  setupAnimations() {
    if (!this.scene.anims.exists('player_run')) {
      this.scene.anims.create({
        key: 'player_run',
        frames: [0, 1, 2, 3, 4, 5].map(i => ({ key: `player_run_${i}` })),
        frameRate: 12,
        repeat: -1,
      });
    }
    if (!this.scene.anims.exists('player_run_armed')) {
      this.scene.anims.create({
        key: 'player_run_armed',
        frames: [0, 1, 2, 3, 4, 5].map(i => ({ key: `player_run_armed_${i}` })),
        frameRate: 12,
        repeat: -1,
      });
    }
  }

  getInputState() {
    if (typeof this._inputProvider === 'function') return this._inputProvider();
    return this.scene.inputManager.state;
  }

  /**
   * Override the default input source (InputManager → P1). Used by couch
   * co-op to route a dedicated gamepad into Player 2.
   */
  setInputProvider(fn) {
    this._inputProvider = fn;
  }

  playLandSquash(impact = 1) {
    if (this._juiceBusy || this.movement.isDashing || this.isDead) return;
    this.stopIdleTween();
    this._juiceBusy = true;
    const k = Phaser.Math.Clamp(impact, 0.4, 1.8);
    const sx = 1 + 0.16 * k;
    const sy = 1 - 0.18 * k;
    this.scene.tweens.add({
      targets: this,
      scaleX: sx,
      scaleY: sy,
      duration: 55 + 20 * k,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.setScale(1, 1);
        this._juiceBusy = false;
      },
    });

    // Ring of dust on heavier landings
    if (impact > 0.85 && this.scene.dustEmitter) {
      const n = Math.round(6 + k * 6);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        const r = 10 + k * 4;
        this.scene.dustEmitter.emitParticleAt(
          this.x + Math.cos(ang) * r,
          this.y + 16,
          1,
        );
      }
    }
    if (impact > 1.1) shakeScene(this.scene, 90, 0.003);
  }

  playJumpSquash() {
    if (this._juiceBusy || this.movement.isDashing || this.isDead) return;
    this.stopIdleTween();
    this._juiceBusy = true;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.88,
      scaleY: 1.14,
      duration: 60,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.setScale(1, 1);
        this._juiceBusy = false;
      },
    });
  }

  /** Quick burst tween when a slash starts — gives the swing some oomph. */
  playSlashFlourish(dir) {
    if (this.isDead) return;
    const sx = dir === 'up' || dir === 'down' ? 0.9 : 1.18;
    const sy = dir === 'up' || dir === 'down' ? 1.18 : 0.9;
    this.stopIdleTween();
    this.scene.tweens.add({
      targets: this,
      scaleX: sx,
      scaleY: sy,
      duration: 50,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.setScale(1, 1),
    });
  }

  /** Aerial flourish for double jump — ring of particles + quick spin. */
  playDoubleJumpFlourish() {
    if (this.isDead) return;
    this.stopIdleTween();
    this.scene.tweens.add({
      targets: this,
      angle: this.facing > 0 ? 360 : -360,
      duration: 280,
      ease: 'Cubic.easeOut',
      onStart: () => { this.angle = 0; },
      onComplete: () => { this.angle = 0; },
    });
    if (this.scene.jumpEmitter) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2;
        this.scene.jumpEmitter.emitParticleAt(
          this.x + Math.cos(ang) * 12,
          this.y + Math.sin(ang) * 12,
          1,
        );
      }
    }
  }

  /** Damage reaction: hurt flash, recoil tilt, shake. */
  playHurtReaction(fromX) {
    if (this.isDead) return;
    this.stopIdleTween();
    this._hurtFlashTimer = 120;
    const dir = fromX !== undefined ? (this.x < fromX ? -1 : 1) : 0;
    shakeScene(this.scene, 120, 0.006);
    this.scene.tweens.add({
      targets: this,
      angle: dir * 12,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => { this.angle = 0; },
    });
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.8, scaleY: 1.2,
      duration: 70, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => this.setScale(1, 1),
    });
  }

  startIdleTween() {
    if (this._idleTween || this._juiceBusy || this.isDead) return;
    this.setScale(1, 1);
    this._idleTween = this.scene.tweens.add({
      targets: this,
      scaleY: { from: 1, to: 1.05 },
      scaleX: { from: 1, to: 0.97 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  stopIdleTween() {
    if (this._idleTween) {
      this._idleTween.stop();
      this._idleTween = null;
      this.setScale(1, 1);
    }
  }

  update(dt) {
    if (this.isDead) return;

    const input = this.getInputState();

    this.movement.update(dt, input);
    this.combat.update(dt, input);
    this.inventory.update(dt);

    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!this._wasOnGround && onGround && !this.movement.isDashing) {
      // Scale impact by how hard we were falling just before landing
      const impact = Phaser.Math.Clamp(Math.abs(this._lastVy) / 240, 0.5, 1.6);
      this.playLandSquash(impact);
    } else if (this._wasOnGround && !onGround && this.body.velocity.y < -80) {
      this.playJumpSquash();
    }
    this._wasOnGround = onGround;
    this._lastVy = this.body.velocity.y;

    // Gentle lean when running at speed; reset when still / airborne
    const vx = this.body.velocity.x;
    const movingFast = onGround && Math.abs(vx) > 120 && !this.combat.isSlashing && !this.combat.isKicking;
    if (movingFast && !this._juiceBusy && this._hurtFlashTimer <= 0) {
      this._tiltTarget = Phaser.Math.Clamp(vx / 20, -10, 10);
    } else {
      this._tiltTarget = 0;
    }
    // Exponential smooth-toward
    const blend = Math.min(1, dt / 80);
    this.angle = this.angle * (1 - blend) + this._tiltTarget * blend;

    // Hurt flash: alternate bright-white tint briefly
    if (this._hurtFlashTimer > 0) {
      this._hurtFlashTimer -= dt;
      const on = Math.floor(this._hurtFlashTimer / 40) % 2 === 0;
      if (on) this.setTintFill(0xffffff); else this.clearTint();
      if (this._hurtFlashTimer <= 0) this.clearTint();
    }

    this.updateAnimation();

    // Idle breathing — only when genuinely still + on ground + no busy state
    const trulyIdle = onGround && Math.abs(vx) < 5 &&
      !this.combat.isSlashing && !this.combat.isKicking &&
      !this.movement.isDashing && !this._juiceBusy && this._hurtFlashTimer <= 0;
    if (trulyIdle) this.startIdleTween();
    else this.stopIdleTween();

    // Running particles
    if (onGround && Math.abs(vx) > 80 && Math.random() < 0.3) {
      if (this.scene.dustEmitter) {
        this.scene.dustEmitter.emitParticleAt(this.x, this.y + 16, 1);
      }
    }

    // Wall slide sparks
    if (this.movement.isWallSliding && this.scene.dustEmitter && Math.random() < 0.45) {
      const wd = this.movement.wallDir || (this.body.blocked.left ? -1 : 1);
      this.scene.dustEmitter.emitParticleAt(this.x + wd * 8, this.y + 6, 1);
    }
  }

  updateAnimation() {
    if (this.movement.isDashing) return;

    const armed = this.combat.hasSlash;
    const s = armed ? '_armed' : '';

    if (this.combat.isKicking && this.combat.hasKick) {
      this.setTexture('player_kick');
      this.currentAnim = 'kick';
      return;
    }

    if (this.combat.isSlashing && armed) {
      const phase = this.combat.getSlashAnimPhase();
      const d = this.combat.slashDirection;
      let tex;
      if (d === 'up') tex = `player_attack_u_${phase}`;
      else if (d === 'down') tex = `player_attack_d_${phase}`;
      else tex = `player_attack_h_${phase}`;
      this.setTexture(tex);
      if (d === 'right') this.setFlipX(false);
      else if (d === 'left') this.setFlipX(true);
      this.currentAnim = 'slash';
      return;
    }

    const onGround = this.body.blocked.down || this.body.touching.down;
    const moving = Math.abs(this.body.velocity.x) > 20;

    if (this.movement.isWallSliding) {
      this.setTexture(`player_wallslide${s}`);
      this.currentAnim = 'wallslide';
      return;
    }

    if (!onGround) {
      if (this.movement.isGliding && this.scene.textures.exists('player_glide')) {
        this.setTexture('player_glide');
        this.currentAnim = 'glide';
      } else if (this.body.velocity.y < -20) {
        this.setTexture(`player_jump${s}`);
        this.currentAnim = 'jump';
      } else if (this.body.velocity.y > 20) {
        this.setTexture(`player_fall${s}`);
        this.currentAnim = 'fall';
      }
      return;
    }

    const runKey = armed ? 'player_run_armed' : 'player_run';
    if (moving) {
      if (this.currentAnim !== 'run' || this._lastArmed !== armed) {
        this.play(runKey);
        this.currentAnim = 'run';
        this._lastArmed = armed;
      }
    } else {
      this.setTexture(`player_idle${s}`);
      this.currentAnim = 'idle';
    }
  }

  setInvulnerable(val) {
    this.combat.setInvulnerable(val);
  }

  takeDamage(amount, fromX) {
    // JP godMode: absorb the hit silently — no HP loss, no knockback, no
    // hurt anim. Damage still "registers" (return true) so hazards/enemies
    // don't accidentally re-trigger the same frame.
    if (this.godMode) return true;
    const hit = this.combat.takeDamage(amount);
    if (hit) {
      if (fromX !== undefined) {
        const dir = this.x < fromX ? -1 : 1;
        this.body.velocity.x = dir * 180;
        this.body.velocity.y = -120;
      }
      this.playHurtReaction(fromX);
    }
    return hit;
  }

  die() {
    this.isDead = true;
    this.stopIdleTween();
    this.angle = 0;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 600, ease: 'Power2',
      onComplete: () => { this.scene.respawnPlayer(this); },
    });
  }

  respawn() {
    this.isDead = false;
    this.hp = this.maxHp;
    this.body.allowGravity = true;
    this.setAlpha(1);
    this.setScale(1);
    this.angle = 0;
    this._hurtFlashTimer = 0;
    this._tiltTarget = 0;
    this.clearTint();
    this.stopIdleTween();
    this.setPosition(this.spawnX, this.spawnY);
    this.body.velocity.set(0, 0);
    this.combat.isInvulnerable = false;
    this.combat.invulnTimer = 0;
    this.movement.isDashing = false;
    this.movement.dashTimer = 0;
    this.currentAnim = 'idle';
  }

  /** Restore to full health (e.g. rest pod / bench). */
  fullHeal() {
    this.hp = this.maxHp;
    this.combat.isInvulnerable = false;
    this.combat.invulnTimer = 0;
    this.setAlpha(1);
    this.clearTint();
    if (this.combat.isSlashing) {
      this.combat.endSlash();
    }
  }

  setCheckpoint(x, y) {
    this.checkpointX = x;
    this.checkpointY = y;
    this._checkpointRoom = this.scene.levelManager.currentRoomId;
  }

  unlockAbility(ability) {
    switch (ability) {
      case 'slash':
        this.combat.hasSlash = true;
        break;
      case 'wallJump':
        this.movement.abilities.wallJump = true;
        break;
      case 'dash':
        this.movement.abilities.dash = true;
        break;
      case 'doubleJump':
        this.movement.abilities.doubleJump = true;
        break;
      case 'spear':
        this.combat.hasSpear = true;
        break;
      case 'kick':
        this.combat.hasKick = true;
        break;
      case 'map':
        this.hasMap = true;
        break;
      case 'glide':
        this.movement.abilities.glide = true;
        break;
      case 'grapple':
        this.movement.abilities.grapple = true;
        break;
    }
  }

  hasAbility(ability) {
    switch (ability) {
      case 'slash': return this.combat.hasSlash;
      case 'wallJump': return this.movement.abilities.wallJump;
      case 'dash': return this.movement.abilities.dash;
      case 'doubleJump': return this.movement.abilities.doubleJump;
      case 'spear': return this.combat.hasSpear;
      case 'kick': return this.combat.hasKick;
      case 'map': return this.hasMap;
      case 'glide': return !!this.movement.abilities.glide;
      case 'grapple': return !!this.movement.abilities.grapple;
      default: return false;
    }
  }

  /**
   * Fire a grapple at the nearest grapple_anchor within range. Called from
   * MovementSystem.update when throwPressed is tapped while grapple is
   * unlocked. If no anchor is in range, nothing happens (silent miss).
   */
  tryGrapple() {
    if (this.movement.isGrappling) return;
    if (!this.movement.abilities.grapple) return;
    const anchors = this.scene.levelManager?.grappleAnchors;
    if (!anchors || !anchors.length) return;
    let best = null;
    let bestDist = Infinity;
    for (const a of anchors) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y);
      if (d < bestDist && d < 260) { bestDist = d; best = a; }
    }
    if (!best) return;
    this.movement.startGrappleTo(best.x, best.y);
  }

  /** JP profile: all abilities + every weapon + 3 max HP + map + god mode (new solo game only). */
  applyJpUnlock() {
    for (const a of JP_UNLOCK_ABILITIES) {
      this.unlockAbility(a);
    }
    for (const id of Object.keys(WEAPONS)) {
      this.inventory.acquireWeapon(id);
    }
    this.maxHp += 3;
    this.hp = this.maxHp;
    this.hasMap = true;
    this.godMode = true;
  }

  /** Apply data from SaveGame.loadGameState() after loadRoom(). */
  applySaveState(s) {
    if (!s) return;
    if (typeof s.maxHp === 'number' && s.maxHp >= 1) this.maxHp = s.maxHp;
    if (typeof s.hp === 'number') this.hp = Math.min(s.hp, this.maxHp);
    this.coins = typeof s.coins === 'number' ? s.coins : 0;
    this.hasMap = !!s.hasMap;
    this.visitedRooms = new Set(Array.isArray(s.visitedRooms) ? s.visitedRooms : []);
    for (const a of s.abilities || []) {
      this.unlockAbility(a);
    }
    if (s.checkpointRoom && s.checkpointTileX != null && s.checkpointTileY != null) {
      this.checkpointX = s.checkpointTileX * TILE_SIZE + TILE_SIZE / 2;
      this.checkpointY = s.checkpointTileY * TILE_SIZE + TILE_SIZE / 2;
      this._checkpointRoom = s.checkpointRoom;
    }
    if (s.inventory) this.inventory.fromJSON(s.inventory);
  }
}
