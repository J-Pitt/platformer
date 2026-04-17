import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage } from './_chapter2Base.js';

/**
 * Forest spider that drops from a web thread when the player passes under,
 * then scuttles along the floor toward them.
 */
export class ThornSpider extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('thorn_spider') ? 'thorn_spider' : 'crawler';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(24, 18);
    this.body.setOffset(8, 12);
    this.setDepth(4);

    this.hp = 2; this.maxHp = 2; this.damage = 1;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.state = 'hang';
    this.hangY = y;
    this.body.allowGravity = false;

    // Web thread visual
    this.thread = scene.add.rectangle(x, y - 30, 1, 60, 0xffffff, 0.3).setOrigin(0.5, 1).setDepth(3);
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.knockbackTimer > 0) return;

    const p = nearestPlayer(this, players);
    if (!p) return;

    if (this.state === 'hang') {
      // Subtle bob
      this.y = this.hangY + Math.sin(this.scene.time.now / 300) * 3;
      if (this.thread && this.thread.active) {
        this.thread.x = this.x;
        this.thread.setSize(1, this.y - (this.hangY - 60));
      }
      const dx = p.x - this.x;
      if (Math.abs(dx) < 48 && p.y > this.y) {
        this.state = 'drop';
        this.body.allowGravity = true;
        if (this.thread) { this.thread.destroy(); this.thread = null; }
      }
    } else {
      const onGround = this.body.blocked.down || this.body.touching.down;
      if (onGround) this.state = 'chase';
      const dx = p.x - this.x;
      this.direction = dx > 0 ? 1 : -1;
      this.body.velocity.x = this.direction * (this.state === 'chase' ? 130 : 60);
      this.setFlipX(this.direction < 0);
    }
  }

  takeDamage(amount, slashDir) {
    if (this.state === 'hang') {
      this.state = 'drop';
      this.body.allowGravity = true;
      if (this.thread) { this.thread.destroy(); this.thread = null; }
    }
    applyStandardDamage(this, amount, slashDir);
  }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }

  destroy(fromScene) {
    if (this.thread) { this.thread.destroy(); this.thread = null; }
    super.destroy(fromScene);
  }
}
