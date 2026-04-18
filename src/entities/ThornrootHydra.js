import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';
import {
  nearestPlayer, createBossHealthBar, damageBoss, bossDeath, updateBossHealthBar,
} from './_bossBase.js';

/**
 * Forest mini-boss — a three-headed hydra buried in the roots. Each head is
 * independently targetable and spits thorn projectiles; killing all three
 * destroys the hydra. Individual heads regenerate 50% HP if not fully killed.
 */
class HydraHead extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, parent, x, y, index) {
    const tex = scene.textures.exists('hydra_head') ? 'hydra_head' : 'spitter';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(36, 36);
    this.body.setOffset(6, 6);
    this.setDepth(5);
    this.parent = parent;
    this.index = index;
    this.hp = 8; this.maxHp = 8; this.damage = 2;
    this.isDead = false; this.hitCooldown = 0;
    this.isBoss = true;
    this.fireCooldown = 1400 + index * 600;
    this.baseX = x; this.baseY = y;
    this.tween = scene.tweens.add({
      targets: this,
      y: y - 8, duration: 1100 + index * 220, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  tick(dt, player) {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (!player || player.isDead) return;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = 2400;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 260;
      const tex = this.scene.textures.exists('thorn_proj') ? 'thorn_proj' : 'particle_teal';
      const proj = this.scene.physics.add.image(this.x, this.y, tex).setDepth(4);
      proj.body.allowGravity = false;
      proj.setVelocity((dx / len) * speed, (dy / len) * speed);
      proj.damage = 1;
      for (const p of this.scene.getActivePlayers?.() || [this.scene.player]) {
        this.scene.physics.add.overlap(p, proj, () => {
          if (proj._spent) return; proj._spent = true;
          if (p.takeDamage) p.takeDamage(proj.damage, proj.x);
          proj.destroy();
        });
      }
      if (this.scene.levelManager?.wallLayer) {
        this.scene.physics.add.collider(proj, this.scene.levelManager.wallLayer, () => proj.destroy());
      }
      this.scene.time.delayedCall(2200, () => { if (proj.active) proj.destroy(); });
    }
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;
    this.hp -= amount;
    this.hitCooldown = 200;
    this.setTint(0xff8888);
    this.scene.time.delayedCall(90, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) {
      this.isDead = true;
      if (this.tween) this.tween.stop();
      this.scene.tweens.add({
        targets: this, alpha: 0, scale: 0.3, duration: 500,
        onComplete: () => this.destroy(),
      });
      this.parent.onHeadDeath();
    }
  }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}

export class ThornrootHydra extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('hydra_base') ? 'hydra_base' : 'boss';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(80, 40);
    this.body.setOffset(4, 20);
    this.setDepth(4);
    this.setScale(1.2);

    this.hp = 24; this.maxHp = 24; this.damage = 0;
    this.isDead = false;
    this.isBoss = true;
    this.activated = false;
    this.heads = [];
    this.headsAlive = 3;
    this.hitCooldown = 0;
    this.intangible = true;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    createBossHealthBar(this, 'THORNROOT HYDRA', 0x66cc66);
    shakeScene(this.scene, 500, 0.015);
    // Spawn heads
    const positions = [
      { x: this.x - 80, y: this.y - 60 },
      { x: this.x, y: this.y - 100 },
      { x: this.x + 80, y: this.y - 60 },
    ];
    positions.forEach((pos, i) => {
      const h = new HydraHead(this.scene, this, pos.x, pos.y, i);
      this.heads.push(h);
      this.scene.enemies.add(h);
    });
  }

  update(dt, players) {
    if (this.isDead) return;
    const p = Array.isArray(players) ? players[0] : players;
    if (!this.activated && p && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 380) this.activate();
    for (const h of this.heads) h.tick(dt, p);
  }

  onHeadDeath() {
    this.headsAlive--;
    this.hp = Math.max(0, this.headsAlive * 8);
    updateBossHealthBar(this);
    if (this.headsAlive <= 0) this.die();
  }

  takeDamage() { /* invulnerable - hit the heads */ }
  canDamagePlayer() { return false; }
  die() { bossDeath(this, { message: 'THE HYDRA WITHERS', messageColor: '#66cc66' }); }
}
