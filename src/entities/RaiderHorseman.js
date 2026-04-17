import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage } from './_chapter2Base.js';

/**
 * A mounted plains raider that gallops back and forth across the room,
 * trampling the player on contact. Stops momentarily at wall edges.
 */
export class RaiderHorseman extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('raider_horseman') ? 'raider_horseman' : 'charger';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(40, 32);
    this.body.setOffset(4, 6);
    this.setDepth(4);

    this.hp = 5; this.maxHp = 5; this.damage = 2;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.pauseTimer = 0;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.pauseTimer = Math.max(0, this.pauseTimer - dt);
    if (this.knockbackTimer > 0) return;

    const lm = this.scene.levelManager;
    const p = nearestPlayer(this, players);
    if (p && !p.isDead) {
      const dx = p.x - this.x;
      if (Math.abs(dx) < 400) this.direction = dx > 0 ? 1 : -1;
    }

    if (this.pauseTimer > 0) { this.body.velocity.x = 0; return; }
    this.body.velocity.x = this.direction * 200;
    const wall = lm?.getTileAt(this.x + this.direction * 22, this.y);
    const gap = lm?.getTileAt(this.x + this.direction * 26, this.y + 30);
    if (wall || !gap) {
      this.pauseTimer = 300;
      this.direction *= -1;
    }
    this.setFlipX(this.direction < 0);
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir, { knockback: 140 }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
