import * as Phaser from 'phaser';
import { nearestPlayer, applyStandardDamage } from './_chapter2Base.js';

/** Castle pikeman — steady walker with a long-reach forward jab. */
export class BannerPikeman extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('banner_pikeman') ? 'banner_pikeman' : 'brute';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(26, 38);
    this.body.setOffset(8, 6);
    this.setDepth(4);

    this.hp = 4; this.maxHp = 4; this.damage = 2;
    this.isHit = false; this.isDead = false;
    this.direction = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.jabCooldown = 1400;
    this.jabSprite = null;
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.jabCooldown = Math.max(0, this.jabCooldown - dt);
    if (this.knockbackTimer > 0) return;

    const lm = this.scene.levelManager;
    const p = nearestPlayer(this, players);
    if (!p) return;
    const dx = p.x - this.x;
    const sameLvl = Math.abs(this.y - p.y) < 40;

    if (sameLvl && Math.abs(dx) < 90 && this.jabCooldown <= 0) {
      this.jab();
      this.jabCooldown = 1600;
      this.body.velocity.x = 0;
      return;
    }

    if (sameLvl && Math.abs(dx) < 280) {
      this.direction = dx > 0 ? 1 : -1;
      this.body.velocity.x = this.direction * 70;
    } else {
      this.body.velocity.x = this.direction * 40;
    }
    const wall = lm?.getTileAt(this.x + this.direction * 14, this.y);
    const edge = lm?.getTileAt(this.x + this.direction * 18, this.y + 24);
    if (wall || !edge) this.direction *= -1;
    this.setFlipX(this.direction < 0);
  }

  jab() {
    const hit = this.scene.physics.add.image(this.x + this.direction * 30, this.y, 'particle_teal')
      .setAlpha(0.5).setScale(2);
    hit.body.allowGravity = false;
    hit.body.setSize(36, 14);
    this.jabSprite = hit;
    const players = this.scene.getActivePlayers?.() || [this.scene.player];
    for (const p of players) {
      this.scene.physics.add.overlap(p, hit, () => {
        if (hit._spent) return; hit._spent = true;
        if (p.takeDamage) p.takeDamage(this.damage, this.x);
      });
    }
    this.scene.time.delayedCall(260, () => { if (hit.active) hit.destroy(); });
  }

  takeDamage(amount, slashDir) { applyStandardDamage(this, amount, slashDir); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
