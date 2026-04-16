import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';

const PATROL_SPEED = 32;
const CHASE_SPEED = 90;
const DETECT_RANGE = 360;
const LOSE_RANGE = 480;
const CHARGE_SPEED = 280;
const TELEGRAPH_MS = 900;
const CHARGE_COOLDOWN_MS = 2400;
const WALL_STUN_MS = 1600;
const TURN_CHECK_OFFSET = 30;

const JUMP_VELOCITY = -320;
const GAP_JUMP_VELOCITY = -270;
const JUMP_COOLDOWN_MS = 700;
const JUMP_PLAYER_ABOVE = 60;
const JUMP_REACH_HORIZ = 200;

function nearestPlayer(enemy, players) {
  const arr = Array.isArray(players) ? players : [players];
  let best = null;
  let bestDist = Infinity;
  for (const p of arr) {
    if (!p || p.isDead) continue;
    const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best || arr[0];
}

/**
 * Charger — patrolling brute variant with a telegraphed horizontal charge,
 * aggressive pursuit, and platform-hopping mobility. When it sees the player
 * it either winds up a charge (same-level) or chases while jumping gaps and
 * short ledges. Hitting a wall at charge speed stuns it (vulnerable window).
 */
export class ChargerBrute extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'charger');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Frame 64x56, feet rendered down to frame y=56. Match body size so the
    // enemy visually stands on the floor instead of sinking into it.
    this.body.setSize(46, 48, true);
    this.body.setOffset(9, 8);
    this.setScale(1.45);
    this.setDepth(4);

    // Lift spawn so body.bottom starts above the floor tile (prevents the
    // "half sunk into the ground" look on the first physics step).
    this.y -= 26;

    this.hp = 4;
    this.maxHp = 4;
    this.damage = 2;
    this.isHit = false;
    this.isDead = false;
    this.direction = 1;
    this.state = 'patrol';
    this.knockbackTimer = 0;
    this.hitCooldown = 0;

    this.chargeCooldown = 0;
    this.telegraphTimer = 0;
    this.chargeDir = 1;
    this.stunTimer = 0;
    this.telegraphOverlay = null;

    this.jumpCooldown = 0;
    this._aggro = false;
  }

  isOnGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  ensureTelegraphOverlay() {
    if (this.telegraphOverlay && this.telegraphOverlay.active) return;
    this.telegraphOverlay = this.scene.add.image(this.x, this.y, 'particle_white');
    this.telegraphOverlay.setTint(0xff3344);
    this.telegraphOverlay.setBlendMode(Phaser.BlendModes.ADD);
    this.telegraphOverlay.setDepth(this.depth + 1);
    this.telegraphOverlay.setScale(2.2);
    this.telegraphOverlay.setAlpha(0);
  }

  clearTelegraphOverlay() {
    if (this.telegraphOverlay) {
      this.telegraphOverlay.destroy();
      this.telegraphOverlay = null;
    }
  }

  shouldHopGap() {
    const lm = this.scene.levelManager;
    if (!lm) return false;
    const dir = this.direction;
    const footY = this.y + 30;
    const ahead1 = lm.getTileAt(this.x + dir * 30, footY);
    const ahead2 = lm.getTileAt(this.x + dir * 58, footY);
    const ahead3 = lm.getTileAt(this.x + dir * 84, footY);
    const wallAhead = lm.getTileAt(this.x + dir * 28, this.y);
    if (wallAhead) return false;
    return !ahead1 && (ahead2 || ahead3);
  }

  tryJumpTowardPlayer(player) {
    if (!this.isOnGround() || this.jumpCooldown > 0) return false;
    const above = this.y - player.y > JUMP_PLAYER_ABOVE;
    const horizReach = Math.abs(player.x - this.x) < JUMP_REACH_HORIZ;
    if (above && horizReach) {
      this.body.velocity.y = JUMP_VELOCITY;
      this.jumpCooldown = JUMP_COOLDOWN_MS;
      return true;
    }
    return false;
  }

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);

    if (this.knockbackTimer > 0) return;

    this.isHit = false;

    if (this.telegraphOverlay && this.telegraphOverlay.active) {
      this.telegraphOverlay.setPosition(this.x, this.y);
    }

    const player = nearestPlayer(this, players);
    if (!player) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const sameLevel = Math.abs(this.y - player.y) < 56;

    if (distToPlayer < DETECT_RANGE && !player.isDead) this._aggro = true;
    else if (distToPlayer > LOSE_RANGE || player.isDead) this._aggro = false;

    switch (this.state) {
      case 'patrol': {
        if (this._aggro && sameLevel && this.chargeCooldown <= 0) {
          // Telegraphed horizontal charge
          this.state = 'telegraph';
          this.telegraphTimer = TELEGRAPH_MS;
          this.chargeDir = player.x > this.x ? 1 : -1;
          this.direction = this.chargeDir;
          this.body.velocity.x = 0;
          this.ensureTelegraphOverlay();
          break;
        }

        if (this._aggro) {
          // Pursue — chase the player across platforms
          const dir = player.x > this.x ? 1 : -1;
          this.direction = dir;
          this.body.velocity.x = dir * CHASE_SPEED;

          this.tryJumpTowardPlayer(player);

          if (this.isOnGround() && this.jumpCooldown <= 0 && this.shouldHopGap()) {
            this.body.velocity.y = GAP_JUMP_VELOCITY;
            this.jumpCooldown = JUMP_COOLDOWN_MS;
          }

          const wallAhead =
            (dir > 0 && this.body.blocked.right)
            || (dir < 0 && this.body.blocked.left);
          if (wallAhead && this.isOnGround() && this.jumpCooldown <= 0
              && this.y - player.y > 10) {
            this.body.velocity.y = JUMP_VELOCITY;
            this.jumpCooldown = JUMP_COOLDOWN_MS;
          }
          break;
        }

        // Passive patrol
        this.body.velocity.x = this.direction * PATROL_SPEED;
        const checkX = this.x + this.direction * TURN_CHECK_OFFSET;
        const checkY = this.y + 30;
        const floorTile = this.scene.levelManager?.getTileAt?.(checkX, checkY);
        const wallTile = this.scene.levelManager?.getTileAt?.(this.x + this.direction * 26, this.y);
        if (!floorTile || wallTile) this.direction *= -1;
        break;
      }

      case 'telegraph': {
        this.body.velocity.x = 0;
        this.telegraphTimer -= dt;
        const t = 1 - (this.telegraphTimer / TELEGRAPH_MS);
        if (this.telegraphOverlay) {
          this.telegraphOverlay.setAlpha(0.25 + Math.sin(t * 18) * 0.3);
          this.telegraphOverlay.setScale(2.2 + t * 0.5);
        }
        if (this.telegraphTimer <= 0) {
          this.state = 'charge';
          this.clearTelegraphOverlay();
          this.body.velocity.x = this.chargeDir * CHARGE_SPEED;
          shakeScene(this.scene, 80, 0.005);
        }
        break;
      }

      case 'charge': {
        this.body.velocity.x = this.chargeDir * CHARGE_SPEED;
        const hitWall = (this.chargeDir > 0 && this.body.blocked.right)
          || (this.chargeDir < 0 && this.body.blocked.left);
        if (hitWall) {
          this.state = 'stun';
          this.stunTimer = WALL_STUN_MS;
          this.body.velocity.x = 0;
          shakeScene(this.scene, 160, 0.012);
          this.setTint(0x4488ff).setTintMode(Phaser.TintModes.FILL);
          this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
          if (this.scene.dustEmitter) {
            this.scene.dustEmitter.emitParticleAt(this.x + this.chargeDir * 22, this.y + 16, 10);
          }
        }
        break;
      }

      case 'stun': {
        this.body.velocity.x = 0;
        this.stunTimer -= dt;
        this.rotation = Math.sin(this.scene.time.now * 0.02) * 0.05;
        if (this.stunTimer <= 0) {
          this.rotation = 0;
          this.state = 'patrol';
          this.chargeCooldown = CHARGE_COOLDOWN_MS;
        }
        break;
      }
    }

    this.setFlipX(this.direction < 0);
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;

    const mult = this.state === 'stun' ? 2 : 1;

    this.hp -= amount * mult;
    this.isHit = true;
    this.hitCooldown = 300;
    this._aggro = true;

    this.setTint(mult > 1 ? 0xffd540 : 0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 80;
    this.body.velocity.y = -90;
    this.knockbackTimer = 150;

    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.clearTelegraphOverlay();
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 20);
    }
    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead && p.hp < p.maxHp) p.hp = Math.min(p.hp + 1, p.maxHp);
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 500,
      onComplete: () => this.destroy(),
    });
  }

  canDamagePlayer() {
    if (this.isDead || this.hitCooldown > 0) return false;
    if (this.state === 'stun') return false;
    return true;
  }

  destroy(fromScene) {
    this.clearTelegraphOverlay();
    super.destroy(fromScene);
  }
}
