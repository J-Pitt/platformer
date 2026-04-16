import * as Phaser from 'phaser';

const PATROL_SPEED = 50;
const CHASE_SPEED = 100;
const DETECT_RANGE = 200;
const TURN_CHECK_OFFSET = 18;

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

export class Crawler extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'crawler');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(28, 20);
    this.body.setOffset(6, 10);
    this.setDepth(4);

    this.hp = 2;
    this.maxHp = 2;
    this.damage = 1;
    this.isHit = false;
    this.isDead = false;
    this.direction = 1;
    this.state = 'patrol';
    this.knockbackTimer = 0;
    this.hitCooldown = 0;
  }

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);

    if (this.knockbackTimer > 0) return;

    this.isHit = false;

    const player = nearestPlayer(this, players);
    if (!player) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const playerOnSameLevel = Math.abs(this.y - player.y) < 40;

    if (distToPlayer < DETECT_RANGE && playerOnSameLevel && !player.isDead) {
      this.state = 'chase';
    } else {
      this.state = 'patrol';
    }

    if (this.state === 'patrol') {
      this.body.velocity.x = this.direction * PATROL_SPEED;

      const checkX = this.x + this.direction * TURN_CHECK_OFFSET;
      const checkY = this.y + 20;
      const tile = this.scene.levelManager.getTileAt(checkX, checkY);
      const wallTile = this.scene.levelManager.getTileAt(this.x + this.direction * 14, this.y);

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

    // Knockback
    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 200;
    this.body.velocity.y = -80;
    this.knockbackTimer = 200;

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 12);
    }

    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead && p.hp < p.maxHp) {
        p.hp = Math.min(p.hp + 1, p.maxHp);
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 300,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  canDamagePlayer() {
    return !this.isDead && this.hitCooldown <= 0;
  }
}
