import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage, fireProjectile } from './_chapter2Base.js';

/**
 * Treant archer rooted to its tile. Fires straight horizontal arrows at the
 * player's row when in range.
 */
export class BarkArcher extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('bark_archer') ? 'bark_archer' : 'spitter';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(24, 40);
    this.body.setOffset(8, 4);
    this.setDepth(4);

    this.hp = 3; this.maxHp = 3; this.damage = 1;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.fireCooldown = 1200;
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
    const sameLvl = Math.abs(this.y - p.y) < 56;
    this.direction = dx > 0 ? 1 : -1;
    this.setFlipX(this.direction < 0);

    if (sameLvl && Math.abs(dx) < 420 && this.fireCooldown <= 0) {
      this.fireCooldown = 2100;
      fireProjectile(this.scene, this.x + this.direction * 14, this.y, this.direction * 300, 0,
        'arrow_proj', { damage: 1, lifespan: 2000 });
    }
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
