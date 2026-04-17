import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage, fireProjectile } from './_chapter2Base.js';

/** Castle crossbowman — stationary, fires heavy bolts with a long reload. */
export class Crossbowman extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('crossbowman') ? 'crossbowman' : 'spitter';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(24, 34);
    this.body.setOffset(8, 6);
    this.setDepth(4);

    this.hp = 3; this.maxHp = 3; this.damage = 2;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.fireCooldown = 1600;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.body.velocity.x = 0;
    if (this.knockbackTimer > 0) return;

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    const dx = p.x - this.x;
    this.direction = dx > 0 ? 1 : -1;
    this.setFlipX(this.direction < 0);

    if (Math.abs(dx) < 520 && Math.abs(this.y - p.y) < 96 && this.fireCooldown <= 0) {
      this.fireCooldown = 3000;
      fireProjectile(this.scene, this.x + this.direction * 16, this.y + 2,
        this.direction * 360, 0, 'crossbow_bolt', { damage: 2, lifespan: 2000 });
    }
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
