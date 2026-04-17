import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';
import {
  nearestPlayer, createBossHealthBar, damageBoss, bossDeath, updateBossHealthBar,
} from './_bossBase.js';

/**
 * Final boss — a hovering solar orb. Three phases:
 *  Phase 1 (>66%): solar flare — radial bursts of projectiles.
 *  Phase 2 (33-66%): eclipse tracking — dark beam follows player + summons wraiths.
 *  Phase 3 (<33%): rising sun — descends slowly while blasting ground rings.
 */
export class ScouredSun extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const tex = scene.textures.exists('scoured_sun') ? 'scoured_sun' : 'void_king';
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.allowGravity = false;
    this.body.setSize(60, 60);
    this.body.setOffset(2, 2);
    this.setScale(1.8);
    this.setDepth(5);
    this.setBlendMode(Phaser.BlendModes.ADD);

    this.hp = 48; this.maxHp = 48; this.damage = 2;
    this.isDead = false; this.activated = false; this.intangible = false;
    this.hitCooldown = 0;
    this.phase = 1;
    this.attackCooldown = 1200;
    this.homeX = x; this.homeY = y;
    this.t = 0;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    createBossHealthBar(this, 'THE SCOURED SUN', 0xffcc44);
    shakeScene(this.scene, 700, 0.02);
    this.scene.cameras.main.flash(900, 255, 220, 100);
  }

  update(dt, players) {
    if (this.isDead) return;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.t += dt / 1000;

    const p = nearestPlayer(this, players);
    if (!p || p.isDead) return;
    if (!this.activated && Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) < 500) this.activate();
    if (!this.activated) return;

    const pct = this.hp / this.maxHp;
    if (pct <= 0.33) this.phase = 3;
    else if (pct <= 0.66) this.phase = 2;
    else this.phase = 1;

    // Float pattern per phase
    if (this.phase === 1) {
      this.x = this.homeX + Math.cos(this.t) * 80;
      this.y = this.homeY + Math.sin(this.t * 0.8) * 40;
    } else if (this.phase === 2) {
      this.x = Phaser.Math.Linear(this.x, p.x, 0.02);
      this.y = this.homeY + Math.sin(this.t) * 20;
    } else {
      this.y = Phaser.Math.Linear(this.y, this.homeY + 80, 0.004);
      this.x = this.homeX + Math.sin(this.t * 1.5) * 140;
    }

    if (this.attackCooldown <= 0) {
      if (this.phase === 1) this.solarFlare();
      else if (this.phase === 2) this.eclipseBeam(p);
      else this.risingSunRing();
      this.attackCooldown = this.phase === 3 ? 1100 : this.phase === 2 ? 1800 : 2200;
    }
  }

  solarFlare() {
    const scene = this.scene;
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (this.t % 1);
      const vx = Math.cos(a) * 220;
      const vy = Math.sin(a) * 220;
      const proj = scene.physics.add.image(this.x, this.y, 'particle_teal')
        .setTint(0xffcc44).setScale(1.4).setBlendMode(Phaser.BlendModes.ADD);
      proj.body.allowGravity = false;
      proj.setVelocity(vx, vy);
      proj.damage = 1;
      for (const p of scene.getActivePlayers?.() || [scene.player]) {
        scene.physics.add.overlap(p, proj, () => {
          if (proj._spent) return; proj._spent = true;
          if (p.takeDamage) p.takeDamage(proj.damage, proj.x);
          proj.destroy();
        });
      }
      scene.time.delayedCall(1800, () => { if (proj.active) proj.destroy(); });
    }
  }

  eclipseBeam(player) {
    const scene = this.scene;
    const bx = player.x;
    const warn = scene.add.rectangle(bx, this.y + 300, 12, 520, 0x221166, 0.6).setDepth(4);
    scene.tweens.add({ targets: warn, alpha: 0.9, duration: 500, yoyo: true });
    scene.time.delayedCall(800, () => {
      warn.destroy();
      const beam = scene.physics.add.image(bx, this.y + 300, 'particle_teal').setTint(0x221166)
        .setDisplaySize(20, 540).setBlendMode(Phaser.BlendModes.MULTIPLY);
      beam.body.allowGravity = false;
      beam.body.setImmovable(true);
      beam.body.setSize(20, 540);
      beam.damage = 2;
      for (const p of scene.getActivePlayers?.() || [scene.player]) {
        scene.physics.add.overlap(p, beam, () => {
          if (beam._spent) return; beam._spent = true;
          if (p.takeDamage) p.takeDamage(beam.damage, beam.x);
        });
      }
      scene.time.delayedCall(500, () => beam.destroy());
    });
  }

  risingSunRing() {
    const scene = this.scene;
    const ring = scene.add.circle(this.x, this.y, 20, 0xffaa44, 0.5)
      .setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: ring, radius: 260, alpha: 0, duration: 1400, ease: 'Cubic.easeOut',
      onUpdate: () => { if (ring.setRadius) ring.setRadius(ring.radius); },
      onComplete: () => ring.destroy(),
    });
    // Damaging ring at two moments
    scene.time.delayedCall(500, () => this.ringPulse(this.x, this.y, 160));
    scene.time.delayedCall(1000, () => this.ringPulse(this.x, this.y, 240));
  }

  ringPulse(cx, cy, radius) {
    const scene = this.scene;
    for (const p of scene.getActivePlayers?.() || [scene.player]) {
      const d = Phaser.Math.Distance.Between(cx, cy, p.x, p.y);
      if (Math.abs(d - radius) < 40) {
        if (p.takeDamage) p.takeDamage(1, cx);
      }
    }
  }

  takeDamage(amount, slashDir) { damageBoss(this, amount, slashDir); }
  die() { bossDeath(this, { message: 'THE SUN FADES', messageColor: '#ffcc44' }); }
  canDamagePlayer() { return !this.isDead && this.hitCooldown <= 0; }
}
