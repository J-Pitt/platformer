import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';
import { nearestPlayer, createBossHealthBar, damageBoss, bossDeath } from './_bossBase.js';

/**
 * Plains mini-boss — a mounted raider king. Gallops end-to-end trampling,
 * occasionally dismounts to throw spear volleys, then remounts. Wind gusts
 * kick up across the arena during phase 2 (<50% HP).
 */
export class WindbladeMarauder extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('windblade_marauder') ? 'windblade_marauder' : 'charger';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(44, 40);
    this.body.setOffset(6, 4);
    this.setScale(1.3);
    this.setDepth(5);

    this.hp = 28; this.maxHp = 28; this.damage = 2;
    this.isDead = false; this.activated = false; this.intangible = false;
    this.isBoss = true;
    this.hitCooldown = 0;
    this.direction = -1;
    this.state = 'gallop';
    this.stateTimer = 1600;
    this.phase = 1;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    createBossHealthBar(this, 'WINDBLADE MARAUDER', 0xffcc88);
    shakeScene(this.scene, 400, 0.015);
    this.scene.cameras.main.flash(400, 240, 200, 140);
  }

  update(dt, players) {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.stateTimer -= dt;

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    if (!this.activated && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 420) this.activate();
    if (!this.activated) return;

    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) {
      this.phase = 2;
      this.windPulse();
    }

    const lm = this.scene.levelManager;

    if (this.state === 'gallop') {
      this.body.velocity.x = this.direction * 220;
      const wall = lm?.getTileAt(this.x + this.direction * 22, this.y);
      if (wall || this.stateTimer <= 0) {
        this.direction *= -1;
        this.stateTimer = 1400;
        if (Math.random() < 0.4) {
          this.state = 'volley';
          this.stateTimer = 1400;
          this.body.velocity.x = 0;
        }
      }
    } else if (this.state === 'volley') {
      this.body.velocity.x = 0;
      const dx = p.x - this.x;
      this.direction = dx > 0 ? 1 : -1;
      if (this.stateTimer < 1200 && !this._vFired1) { this._vFired1 = true; this.throwSpear(-8); }
      if (this.stateTimer < 800 && !this._vFired2) { this._vFired2 = true; this.throwSpear(0); }
      if (this.stateTimer < 400 && !this._vFired3) { this._vFired3 = true; this.throwSpear(8); }
      if (this.stateTimer <= 0) {
        this._vFired1 = this._vFired2 = this._vFired3 = false;
        this.state = 'gallop';
        this.stateTimer = 2000;
      }
    }
    this.setFlipX(this.direction < 0);
  }

  throwSpear(offsetY) {
    const scene = this.scene;
    const tex = scene.textures.exists('raider_spear') ? 'raider_spear' : 'dagger_projectile';
    const proj = scene.physics.add.image(this.x + this.direction * 18, this.y + offsetY, tex).setDepth(4);
    proj.body.allowGravity = false;
    proj.setVelocityX(this.direction * 340);
    proj.damage = this.damage;
    proj.setFlipX(this.direction < 0);
    for (const p of scene.getActivePlayers?.() || [scene.player]) {
      scene.physics.add.overlap(p, proj, () => {
        if (proj._spent) return; proj._spent = true;
        if (p.takeDamage) p.takeDamage(proj.damage, proj.x);
        proj.destroy();
      });
    }
    if (scene.levelManager?.wallLayer) {
      scene.physics.add.collider(proj, scene.levelManager.wallLayer, () => proj.destroy());
    }
    scene.time.delayedCall(2200, () => { if (proj.active) proj.destroy(); });
  }

  windPulse() {
    this.scene.cameras.main.shake(500, 0.01);
    // Spawn short-lived wind gust sweeps across the floor
    const lm = this.scene.levelManager;
    const w = lm?.roomPixelW || 960;
    const h = lm?.roomPixelH || 540;
    const key = this.scene.textures.exists('wind_gust') ? 'wind_gust' : 'particle_dust';
    const gust = this.scene.add.tileSprite(w / 2, h - 40, w, 30, key).setAlpha(0).setDepth(4);
    this.scene.tweens.add({ targets: gust, alpha: 0.6, duration: 400, yoyo: true, hold: 600, onComplete: () => gust.destroy() });
  }

  takeDamage(amount, slashDir) { damageBoss(this, amount, slashDir); }
  die() { bossDeath(this, { message: 'THE MARAUDER RIDES NO MORE', messageColor: '#ffcc88' }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
