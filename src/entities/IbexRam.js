import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage } from './_chapter2Base.js';

/**
 * Mountain goat/ibex that charges horizontally at the player. Holds ground
 * patrol until line-of-sight, then telegraphs with a head-lower and bolts.
 */
export class IbexRam extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('ibex_ram') ? 'ibex_ram' : 'crawler';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(36, 22);
    this.body.setOffset(6, 10);
    this.setDepth(4);

    this.hp = 3; this.maxHp = 3; this.damage = 2;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.state = 'patrol';
    this.chargeTimer = 0;
    this.telegraph = 0;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.chargeTimer = Math.max(0, this.chargeTimer - dt);
    if (this.knockbackTimer > 0) return;

    const p = nearestPlayer(this, players);
    const lm = this.scene.levelManager;
    const sameRow = Math.abs(this.y - p.y) < 32;
    const dx = p.x - this.x;
    const dist = Math.abs(dx);

    if (this.state === 'patrol') {
      this.body.velocity.x = this.direction * 40;
      const checkX = this.x + this.direction * 20;
      const tile = lm?.getTileAt(checkX, this.y + 22);
      const wall = lm?.getTileAt(this.x + this.direction * 16, this.y);
      if (!tile || wall) this.direction *= -1;
      if (sameRow && dist < 260 && !p.isDead) {
        this.state = 'telegraph';
        this.telegraph = 520;
        this.direction = dx > 0 ? 1 : -1;
        this.body.velocity.x = 0;
      }
    } else if (this.state === 'telegraph') {
      this.telegraph -= dt;
      this.setScale(1 + 0.1 * Math.sin(this.telegraph / 50));
      if (this.telegraph <= 0) {
        this.setScale(1);
        this.state = 'charge';
        this.chargeTimer = 1100;
      }
    } else if (this.state === 'charge') {
      this.body.velocity.x = this.direction * 260;
      const wall = lm?.getTileAt(this.x + this.direction * 20, this.y);
      if (this.chargeTimer <= 0 || wall) {
        this.state = 'patrol';
        this.body.velocity.x = 0;
      }
    }
    this.setFlipX(this.direction < 0);
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir, { knockback: 160 }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
