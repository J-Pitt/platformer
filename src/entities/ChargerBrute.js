import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';

const PATROL_SPEED = 28;
const DETECT_RANGE = 320;
const CHARGE_SPEED = 260;
const TELEGRAPH_MS = 900;
const CHARGE_COOLDOWN_MS = 2400;
const WALL_STUN_MS = 1600;
const TURN_CHECK_OFFSET = 30;

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
 * Charger — patrolling brute variant with a telegraphed horizontal charge.
 * When it sees the player on the same level it winds up with a red glow
 * then lunges. Hitting a wall at charge speed stuns it (vulnerable window).
 */
export class ChargerBrute extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'charger');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(46, 44);
    this.body.setOffset(9, 10);
    this.setScale(1.45);
    this.setDepth(4);

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

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);

    if (this.knockbackTimer > 0) return;

    this.isHit = false;

    if (this.telegraphOverlay && this.telegraphOverlay.active) {
      this.telegraphOverlay.setPosition(this.x, this.y);
    }

    const player = nearestPlayer(this, players);

    switch (this.state) {
      case 'patrol': {
        if (!player) { this.body.velocity.x = 0; return; }
        this.body.velocity.x = this.direction * PATROL_SPEED;

        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const sameLevel = Math.abs(this.y - player.y) < 56;

        if (distToPlayer < DETECT_RANGE && sameLevel && this.chargeCooldown <= 0 && !player.isDead) {
          this.state = 'telegraph';
          this.telegraphTimer = TELEGRAPH_MS;
          this.chargeDir = player.x > this.x ? 1 : -1;
          this.direction = this.chargeDir;
          this.body.velocity.x = 0;
          this.ensureTelegraphOverlay();
        }

        // Edge / wall turnaround
        const checkX = this.x + this.direction * TURN_CHECK_OFFSET;
        const checkY = this.y + 24;
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
        // Detect wall impact
        const hitWall = (this.chargeDir > 0 && this.body.blocked.right)
          || (this.chargeDir < 0 && this.body.blocked.left);
        if (hitWall) {
          this.state = 'stun';
          this.stunTimer = WALL_STUN_MS;
          this.body.velocity.x = 0;
          shakeScene(this.scene, 160, 0.012);
          this.setTint(0x4488ff).setTintMode(Phaser.TintModes.FILL);
          this.scene.time.delayedCall(120, () => { if (this.active) this.clearTint(); });
          // Dust
          if (this.scene.dustEmitter) {
            this.scene.dustEmitter.emitParticleAt(this.x + this.chargeDir * 22, this.y + 16, 10);
          }
        }
        break;
      }

      case 'stun': {
        this.body.velocity.x = 0;
        this.stunTimer -= dt;
        // Wobble
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

    // Double damage while stunned — reward the "bait into wall" mechanic
    const mult = this.state === 'stun' ? 2 : 1;

    this.hp -= amount * mult;
    this.isHit = true;
    this.hitCooldown = 300;

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
