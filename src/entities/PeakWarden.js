import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';
import {
  nearestPlayer, createBossHealthBar, damageBoss, bossDeath, updateBossHealthBar,
} from './_bossBase.js';

/**
 * Mountain mini-boss. Two phases:
 *  Phase 1: stomp-shockwave + rolling rocks.
 *  Phase 2 (<50% HP): summons a short rockfall rain across the arena.
 */
export class PeakWarden extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('peak_warden') ? 'peak_warden' : 'brute';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(42, 54);
    this.body.setOffset(11, 10);
    this.setScale(1.4);
    this.setDepth(5);

    this.hp = 24; this.maxHp = 24; this.damage = 2;
    this.isHit = false; this.isDead = false; this.intangible = false;
    this.isBoss = true;
    this.activated = false;
    this.phase = 1;
    this.knockbackTimer = 0; this.hitCooldown = 0;
    this.attackCooldown = 1800;
    this.direction = -1;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    createBossHealthBar(this, 'PEAK WARDEN', 0xaacce0);
    shakeScene(this.scene, 400, 0.015);
    this.scene.cameras.main.flash(500, 140, 200, 240);
  }

  update(dt, players) {
    if (this.isDead) return;
    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    if (!this.activated && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 360) this.activate();
    if (!this.activated) return;

    if (this.hp <= this.maxHp * 0.5 && this.phase === 1) this.phase = 2;

    const dx = p.x - this.x;
    this.direction = dx > 0 ? 1 : -1;
    this.setFlipX(this.direction < 0);

    const onGround = this.body.blocked.down || this.body.touching.down;
    if (onGround) this.body.velocity.x = this.direction * 60;

    if (this.attackCooldown <= 0) {
      if (this.phase === 1 || Math.random() < 0.5) this.stompShockwave();
      else this.rainRocks();
      this.attackCooldown = this.phase === 2 ? 2200 : 2600;
    }
  }

  stompShockwave() {
    const scene = this.scene;
    if (this.body) this.body.velocity.set(0, 0);
    shakeScene(scene, 320, 0.012);

    const spawnPulse = (dir) => {
      const pulse = scene.physics.add.image(this.x + dir * 24, this.y + 20, 'particle_dust')
        .setScale(3).setAlpha(0.6).setTint(0xaaccdd);
      pulse.body.allowGravity = false;
      pulse.setVelocityX(dir * 280);
      pulse.damage = this.damage;
      for (const p of scene.getActivePlayers?.() || [scene.player]) {
        scene.physics.add.overlap(p, pulse, () => {
          if (pulse._spent) return; pulse._spent = true;
          if (p.takeDamage) p.takeDamage(pulse.damage, pulse.x);
          pulse.destroy();
        });
      }
      scene.tweens.add({ targets: pulse, alpha: 0, scale: 1, duration: 900, onComplete: () => pulse.destroy() });
    };
    spawnPulse(-1);
    spawnPulse(1);
  }

  rainRocks() {
    const scene = this.scene;
    const lm = scene.levelManager;
    const width = lm?.roomPixelW || 960;
    const cols = 6;
    for (let i = 0; i < cols; i++) {
      const rx = 60 + (width - 120) * (i + Math.random() * 0.4) / cols;
      scene.time.delayedCall(i * 180, () => {
        const tex = scene.textures.exists('falling_rock') ? 'falling_rock' : 'particle_dust';
        const rock = scene.physics.add.image(rx, -20, tex).setDepth(4).setScale(1.2);
        rock.body.allowGravity = true;
        rock.damage = 1;
        for (const p of scene.getActivePlayers?.() || [scene.player]) {
          scene.physics.add.overlap(p, rock, () => {
            if (rock._spent) return; rock._spent = true;
            if (p.takeDamage) p.takeDamage(rock.damage, rock.x);
            rock.destroy();
          });
        }
        if (lm?.wallLayer) scene.physics.add.collider(rock, lm.wallLayer, () => rock.destroy());
        scene.time.delayedCall(3000, () => { if (rock.active) rock.destroy(); });
      });
    }
  }

  takeDamage(amount, slashDir) { damageBoss(this, amount, slashDir, { knockback: 80 }); }
  die() { bossDeath(this, { message: 'THE PEAK WARDEN KNEELS', messageColor: '#aaccdd' }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
