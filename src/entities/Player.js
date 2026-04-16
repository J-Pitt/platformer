import { MovementSystem } from '../systems/Movement.js';
import { CombatSystem } from '../systems/Combat.js';
import { TILE_SIZE } from '../level/rooms.js';

const MAX_HP = 5;

const JP_UNLOCK_ABILITIES = [
  'slash',
  'wallJump',
  'dash',
  'doubleJump',
  'spear',
  'kick',
  'map',
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
    return this.scene.inputManager.state;
  }

  playLandSquash() {
    if (this._juiceBusy || this.movement.isDashing || this.isDead) return;
    this._juiceBusy = true;
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 0.9,
      duration: 55,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.setScale(1, 1);
        this._juiceBusy = false;
      },
    });
  }

  playJumpSquash() {
    if (this._juiceBusy || this.movement.isDashing || this.isDead) return;
    this._juiceBusy = true;
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.92,
      scaleY: 1.08,
      duration: 45,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.setScale(1, 1);
        this._juiceBusy = false;
      },
    });
  }

  update(dt) {
    if (this.isDead) return;

    const input = this.getInputState();

    this.movement.update(dt, input);
    this.combat.update(dt, input);

    const onGround = this.body.blocked.down || this.body.touching.down;
    if (!this._wasOnGround && onGround && !this.movement.isDashing) {
      this.playLandSquash();
    } else if (this._wasOnGround && !onGround && this.body.velocity.y < -80) {
      this.playJumpSquash();
    }
    this._wasOnGround = onGround;

    this.updateAnimation();

    // Running particles
    if (onGround && Math.abs(this.body.velocity.x) > 80 && Math.random() < 0.3) {
      if (this.scene.dustEmitter) {
        this.scene.dustEmitter.emitParticleAt(this.x, this.y + 16, 1);
      }
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
      if (this.body.velocity.y < -20) {
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
    const hit = this.combat.takeDamage(amount);
    if (hit && fromX !== undefined) {
      const dir = this.x < fromX ? -1 : 1;
      this.body.velocity.x = dir * 180;
      this.body.velocity.y = -120;
    }
    return hit;
  }

  die() {
    this.isDead = true;
    this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 1.5, scaleY: 1.5,
      duration: 600, ease: 'Power2',
      onComplete: () => { this.scene.respawnPlayer(); },
    });
  }

  respawn() {
    this.isDead = false;
    this.hp = this.maxHp;
    this.body.allowGravity = true;
    this.setAlpha(1);
    this.setScale(1);
    this.clearTint();
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
      default: return false;
    }
  }

  /** JP profile: all abilities + 3 max HP (new solo game only). */
  applyJpUnlock() {
    for (const a of JP_UNLOCK_ABILITIES) {
      this.unlockAbility(a);
    }
    this.maxHp += 3;
    this.hp = this.maxHp;
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
  }
}
