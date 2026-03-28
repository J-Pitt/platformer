import { MovementSystem } from '../systems/Movement.js';
import { CombatSystem } from '../systems/Combat.js';

const MAX_HP = 5;

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, playerIndex = 0) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.playerIndex = playerIndex;

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
    this.visitedRooms = new Set();

    this.currentAnim = 'idle';
    /** When true, position/velocity come from network; skip local input physics. */
    this.remoteMode = false;

    this.setupAnimations();

    if (playerIndex === 1) {
      this.setTint(0x6688ff);
    }
  }

  setupAnimations() {
    if (this.scene.anims.exists('player_run')) return;

    this.scene.anims.create({
      key: 'player_run',
      frames: [
        { key: 'player_run_0' },
        { key: 'player_run_1' },
        { key: 'player_run_2' },
        { key: 'player_run_3' },
        { key: 'player_run_4' },
        { key: 'player_run_5' },
      ],
      frameRate: 12,
      repeat: -1,
    });
  }

  getInputState() {
    const mgr = this.scene.inputManager;
    return this.playerIndex === 1 ? mgr.state2 : mgr.state;
  }

  update(dt) {
    if (this.isDead) return;

    if (this.remoteMode) {
      this.updateAnimation();
      return;
    }

    const input = this.getInputState();

    this.movement.update(dt, input);
    this.combat.update(dt, input);

    this.updateAnimation();

    // Running particles
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (onGround && Math.abs(this.body.velocity.x) > 80 && Math.random() < 0.3) {
      if (this.scene.dustEmitter) {
        this.scene.dustEmitter.emitParticleAt(this.x, this.y + 16, 1);
      }
    }
  }

  updateAnimation() {
    if (this.movement.isDashing) return;

    // Sword swing poses (synced to combat slash)
    if (this.combat.isSlashing && this.combat.hasSlash) {
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
      this.setTexture('player_wallslide');
      this.currentAnim = 'wallslide';
      return;
    }

    if (!onGround) {
      if (this.body.velocity.y < -20) {
        this.setTexture('player_jump');
        this.currentAnim = 'jump';
      } else if (this.body.velocity.y > 20) {
        this.setTexture('player_fall');
        this.currentAnim = 'fall';
      }
      return;
    }

    if (moving) {
      if (this.currentAnim !== 'run') {
        this.play('player_run');
        this.currentAnim = 'run';
      }
    } else {
      this.setTexture('player_idle');
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
    this.setTintFill(0xffffff);
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    if (this.playerIndex === 1) {
      this.scene.tweens.add({
        targets: this,
        alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 400, ease: 'Power2',
        onComplete: () => { this.scene.respawnPlayer2(); },
      });
    } else {
      this.scene.tweens.add({
        targets: this,
        alpha: 0, scaleX: 1.5, scaleY: 1.5,
        duration: 600, ease: 'Power2',
        onComplete: () => { this.scene.respawnPlayer(); },
      });
    }
  }

  respawn() {
    this.isDead = false;
    this.hp = MAX_HP;
    this.body.allowGravity = true;
    this.setAlpha(1);
    this.setScale(1);
    this.clearTint();
    if (this.playerIndex === 1) this.setTint(0x6688ff);
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
    if (this.playerIndex === 1) this.setTint(0x6688ff);
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
      case 'map': return this.hasMap;
      default: return false;
    }
  }
}
