import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage } from './_chapter2Base.js';

/**
 * Shared chapter-2 elite ghost: floats through walls toward the player,
 * fades out briefly when hit to dodge a second strike.
 */
export class Lightwraith extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('lightwraith') ? 'lightwraith' : 'flyer';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(26, 30);
    this.body.setOffset(6, 4);
    this.setDepth(4);
    this.setBlendMode(Phaser.BlendModes.ADD);

    this.hp = 4; this.maxHp = 4; this.damage = 2;
    this.isHit = false; this.isDead = false;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.phaseTimer = 0;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.phaseTimer = Math.max(0, this.phaseTimer - dt);

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 90;
    this.body.velocity.set((dx / len) * speed, (dy / len) * speed);
    this.setFlipX(dx < 0);
  }

  takeDamage(amount, slashDir) {
    if (this.phaseTimer > 0) return;
    applyStandardDamage(this, amount, slashDir);
    this.phaseTimer = 600;
    this.setAlpha(0.25);
    this.scene.time.delayedCall(600, () => { if (this.active) this.setAlpha(1); });
  }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0 && this.alpha > 0.6; }
}
