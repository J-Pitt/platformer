import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage } from './_chapter2Base.js';

/** Plains hawk that circles high, then dives at the player in a straight line. */
export class HawkDiver extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('hawk_diver') ? 'hawk_diver' : 'flyer';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(28, 22);
    this.body.setOffset(6, 8);
    this.setDepth(4);

    this.hp = 2; this.maxHp = 2; this.damage = 2;
    this.isHit = false; this.isDead = false;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.homeX = x; this.homeY = y;
    this.state = 'circle';
    this.diveCooldown = 1800;
    this.angle0 = 0;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.diveCooldown = Math.max(0, this.diveCooldown - dt);
    if (this.knockbackTimer > 0) return;

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;

    if (this.state === 'circle') {
      this.angle0 += dt / 240;
      this.x = this.homeX + Math.cos(this.angle0) * 60;
      this.y = this.homeY + Math.sin(this.angle0) * 20;
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      if (Math.abs(dx) < 220 && dy > 20 && this.diveCooldown <= 0) {
        this.state = 'dive';
        const len = Math.hypot(dx, dy) || 1;
        this.body.velocity.set((dx / len) * 320, (dy / len) * 320);
        this.diveCooldown = 2600;
      }
    } else {
      // dive straight until it hits something or reaches low altitude
      if (this.y > this.homeY + 140) {
        this.state = 'circle';
        this.body.velocity.set(0, 0);
      }
    }
    this.setFlipX(this.body.velocity.x < 0);
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
