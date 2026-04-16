import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';

const PATROL_SPEED = 35;
const CHASE_SPEED = 70;
const DETECT_RANGE = 250;
const TURN_CHECK_OFFSET = 28;
const SLAM_TRIGGER_RANGE = 80;
const SLAM_SHOCK_RADIUS = 100;
const SLAM_COOLDOWN_MS = 3000;
const SLAM_JUMP_VELOCITY = -340;
const SLAM_TIMEOUT_MS = 2500;

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

export class Brute extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'brute');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(48, 44);
    this.body.setOffset(8, 10);
    this.setScale(1.5);
    this.setDepth(4);

    this.hp = 5;
    this.maxHp = 5;
    this.damage = 2;
    this.isHit = false;
    this.isDead = false;
    this.direction = 1;
    this.state = 'patrol';
    this.knockbackTimer = 0;
    this.hitCooldown = 0;
    this.slamCooldown = 0;
    this.slamState = null;
    this.slamStartedAt = 0;
  }

  isOnGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  applySlamShockwave(players) {
    const arr = Array.isArray(players) ? players : [players];
    for (const p of arr) {
      if (!p || p.isDead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (d <= SLAM_SHOCK_RADIUS) {
        p.takeDamage(this.damage, this.x);
      }
    }
    shakeScene(this.scene, 100, 0.006);
  }

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);

    if (this.knockbackTimer > 0) return;

    this.isHit = false;

    const player = nearestPlayer(this, players);
    if (!player) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const playerOnSameLevel = Math.abs(this.y - player.y) < 48;

    if (this.slamState) {
      if (this.scene.time.now - this.slamStartedAt > SLAM_TIMEOUT_MS) {
        this.slamState = null;
        this.body.velocity.x = 0;
      } else if (this.slamState === 'rising' && this.body.velocity.y > 40) {
        this.slamState = 'falling';
      } else if (this.slamState === 'falling' && this.isOnGround()) {
        this.applySlamShockwave(players);
        this.slamState = null;
        this.slamCooldown = SLAM_COOLDOWN_MS;
        this.body.velocity.x = 0;
      }
      return;
    }

    if (distToPlayer < DETECT_RANGE && playerOnSameLevel && !player.isDead) {
      this.state = 'chase';
    } else {
      this.state = 'patrol';
    }

    const canSlam =
      distToPlayer < SLAM_TRIGGER_RANGE
      && !player.isDead
      && this.slamCooldown <= 0
      && this.isOnGround();

    if (canSlam) {
      this.slamState = 'rising';
      this.slamStartedAt = this.scene.time.now;
      this.body.velocity.x = 0;
      this.body.velocity.y = SLAM_JUMP_VELOCITY;
      this.setFlipX(player.x < this.x);
      return;
    }

    if (this.state === 'patrol') {
      this.body.velocity.x = this.direction * PATROL_SPEED;

      const checkX = this.x + this.direction * TURN_CHECK_OFFSET;
      const checkY = this.y + 22;
      const tile = this.scene.levelManager.getTileAt(checkX, checkY);
      const wallTile = this.scene.levelManager.getTileAt(this.x + this.direction * 22, this.y);

      if (!tile || wallTile) {
        this.direction *= -1;
      }
    } else {
      const dir = player.x > this.x ? 1 : -1;
      this.body.velocity.x = dir * CHASE_SPEED;
      this.direction = dir;
    }

    this.setFlipX(this.direction < 0);
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;

    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 300;

    this.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 100;
    this.body.velocity.y = -80;
    this.knockbackTimer = 150;

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;
    this.slamState = null;

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 18);
    }

    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead && p.hp < p.maxHp) {
        p.hp = Math.min(p.hp + 1, p.maxHp);
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 500,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  canDamagePlayer() {
    if (this.isDead || this.hitCooldown > 0) return false;
    if (this.slamState) return false;
    return true;
  }
}
