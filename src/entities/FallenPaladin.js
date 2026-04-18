import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';
import {
  nearestPlayer, createBossHealthBar, damageBoss, bossDeath, updateBossHealthBar,
} from './_bossBase.js';

/**
 * Castle mini-boss — The Fallen Paladin. Armor phase takes reduced damage
 * until shattered at 66% HP; then unarmored phase: faster + holy cross-slash
 * wave attacks.
 */
export class FallenPaladin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('fallen_paladin_armored') ? 'fallen_paladin_armored' : 'boss';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(40, 54);
    this.body.setOffset(8, 6);
    this.setScale(1.4);
    this.setDepth(5);

    this.hp = 30; this.maxHp = 30; this.damage = 2;
    this.isDead = false; this.activated = false; this.intangible = false;
    this.isBoss = true;
    this.hitCooldown = 0;
    this.direction = -1;
    this.armored = true;
    this.attackCooldown = 1800;
    this.slashCooldown = 3200;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    createBossHealthBar(this, 'THE FALLEN PALADIN', 0xd8c088);
    shakeScene(this.scene, 500, 0.016);
    this.scene.cameras.main.flash(500, 240, 220, 140);
  }

  update(dt, players) {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.slashCooldown = Math.max(0, this.slashCooldown - dt);

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    if (!this.activated && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 400) this.activate();
    if (!this.activated) return;

    if (this.armored && this.hp <= this.maxHp * 0.66) this.shatterArmor();

    const dx = p.x - this.x;
    this.direction = dx > 0 ? 1 : -1;
    this.setFlipX(this.direction < 0);

    const speed = this.armored ? 70 : 130;
    this.body.velocity.x = this.direction * speed;

    if (this.attackCooldown <= 0 && Math.abs(dx) < 80) {
      this.attackCooldown = this.armored ? 1500 : 900;
      this.shieldSlam();
    }
    if (!this.armored && this.slashCooldown <= 0 && Math.abs(dx) < 300) {
      this.slashCooldown = 2400;
      this.holyCross();
    }
  }

  shatterArmor() {
    this.armored = false;
    if (this.scene.textures.exists('fallen_paladin_bare')) {
      this.setTexture('fallen_paladin_bare');
    }
    shakeScene(this.scene, 500, 0.02);
    if (this.scene.enemyDeathEmitter) this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 18);
    this.scene.cameras.main.flash(400, 255, 240, 180);
  }

  shieldSlam() {
    const scene = this.scene;
    const hit = scene.physics.add.image(this.x + this.direction * 30, this.y, 'particle_teal')
      .setAlpha(0.5).setScale(2.2).setTint(0xffe0a0);
    hit.body.allowGravity = false;
    hit.body.setSize(60, 24);
    for (const p of scene.getActivePlayers?.() || [scene.player]) {
      scene.physics.add.overlap(p, hit, () => {
        if (hit._spent) return; hit._spent = true;
        if (p.takeDamage) p.takeDamage(this.damage, hit.x);
      });
    }
    scene.time.delayedCall(320, () => { if (hit.active) hit.destroy(); });
  }

  holyCross() {
    const scene = this.scene;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const vx = Math.cos(angle) * 280;
      const vy = Math.sin(angle) * 280;
      const wave = scene.physics.add.image(this.x, this.y, 'particle_teal')
        .setTint(0xffeeaa).setScale(1.6).setAlpha(0.85);
      wave.body.allowGravity = false;
      wave.setVelocity(vx, vy);
      wave.damage = this.damage;
      for (const p of scene.getActivePlayers?.() || [scene.player]) {
        scene.physics.add.overlap(p, wave, () => {
          if (wave._spent) return; wave._spent = true;
          if (p.takeDamage) p.takeDamage(wave.damage, wave.x);
          wave.destroy();
        });
      }
      scene.time.delayedCall(1100, () => { if (wave.active) wave.destroy(); });
    }
  }

  takeDamage(amount, slashDir) {
    const effective = this.armored ? Math.max(1, Math.floor(amount / 2)) : amount;
    damageBoss(this, effective, slashDir);
  }
  die() { bossDeath(this, { message: 'THE PALADIN FINDS PEACE', messageColor: '#d8c088' }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
