import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage, fireProjectile } from './_chapter2Base.js';

/** Stationary mountain giant that lobs rocks in an arc at the player. */
export class RockHurler extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('rock_hurler') ? 'rock_hurler' : 'brute';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(28, 34);
    this.body.setOffset(10, 10);
    this.setDepth(4);

    this.hp = 4; this.maxHp = 4; this.damage = 1;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.throwCooldown = 1400;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.body.velocity.x = 0;
    if (this.knockbackTimer > 0) return;

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    const dx = p.x - this.x;
    const dist = Math.abs(dx);
    this.direction = dx > 0 ? 1 : -1;
    this.setFlipX(this.direction < 0);

    if (dist < 420 && dist > 60 && this.throwCooldown <= 0) {
      this.throwCooldown = 2800;
      const vx = this.direction * 260;
      const vy = -180;
      fireProjectile(this.scene, this.x, this.y - 12, vx, vy, 'thrown_rock',
        { gravity: true, damage: 1, lifespan: 2400 });
    }
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir, { knockback: 120 }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
