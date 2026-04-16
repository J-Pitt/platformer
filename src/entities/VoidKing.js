import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';
import { Crawler } from './Crawler.js';

const HP = 30;
const DAMAGE = 2;
const DETECT_RANGE = 360;
const MELEE_RANGE = 76;
const TELEPORT_COOLDOWN = 3600;
const ORB_COOLDOWN = 2100;
const SLAM_COOLDOWN = 4800;
const PATROL_SPEED = 26;
const CHASE_SPEED = 46;
const PROJECTILE_SPEED = 230;

function nearestPlayer(enemy, players) {
  const arr = Array.isArray(players) ? players : [players];
  let best = null;
  let bestDist = Infinity;
  for (const p of arr) {
    if (!p || p.isDead) continue;
    const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best || arr[0];
}

/**
 * The Void King — final boss, three-phase fight.
 * Phase 1 (100-66% HP): teleport + triple void-orb volley
 * Phase 2 (66-33% HP): summons shadow crawlers, ground-slam shockwave
 * Phase 3 (<33% HP):   arena darkens, king briefly intangible between teleports,
 *                       landings leave harmful void puddles
 */
export class VoidKing extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'void_king');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(44, 60);
    this.body.setOffset(14, 10);
    this.setScale(1.6);
    this.setDepth(5);

    this.hp = HP;
    this.maxHp = HP;
    this.damage = DAMAGE;
    this.isHit = false;
    this.isDead = false;
    this.direction = -1;
    this.knockbackTimer = 0;
    this.hitCooldown = 0;

    this.teleportCooldown = TELEPORT_COOLDOWN * 0.4;
    this.orbCooldown = ORB_COOLDOWN * 0.5;
    this.slamCooldown = SLAM_COOLDOWN * 0.7;

    this.attackTimer = 0;
    this.attackPhase = null;
    this.activated = false;
    this.phase = 1;
    this.intangible = false;
    this.lastTeleportAt = 0;

    this.projectiles = [];
    this.voidPuddles = [];
    this.summons = [];
    this.darkOverlay = null;

    this.healthBar = null;
    this.healthBarBg = null;
    this.nameText = null;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    this.createHealthBar();
    shakeScene(this.scene, 400, 0.018);
    this.scene.cameras.main.flash(600, 140, 40, 180);
  }

  createHealthBar() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const barW = 260;
    const barH = 12;
    const by = cam.height - 46;

    this.nameText = this.scene.add.text(cx, by - 20, 'THE VOID KING', {
      fontSize: '16px', fontFamily: 'monospace', color: '#cc88ff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    this.healthBarBg = this.scene.add.rectangle(cx, by, barW + 4, barH + 4, 0x1a0a2a, 0.9)
      .setScrollFactor(0).setDepth(100).setAlpha(0);

    this.healthBar = this.scene.add.rectangle(cx - barW / 2, by, barW, barH, 0xcc44ff, 0.95)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

    this.scene.tweens.add({
      targets: [this.nameText, this.healthBarBg, this.healthBar],
      alpha: 1, duration: 700, delay: 200,
    });
  }

  updateHealthBar() {
    if (!this.healthBar) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barW = 260;
    this.healthBar.width = barW * ratio;
    if (ratio < 0.33) this.healthBar.fillColor = 0x800080;
    else if (ratio < 0.66) this.healthBar.fillColor = 0xaa44cc;
  }

  update(dt, players) {
    if (this.isDead) {
      this.updateProjectiles(dt);
      this.updateVoidPuddles(dt);
      return;
    }

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.teleportCooldown = Math.max(0, this.teleportCooldown - dt);
    this.orbCooldown = Math.max(0, this.orbCooldown - dt);
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);
    this.isHit = false;

    if (this.knockbackTimer > 0) {
      this.updateProjectiles(dt);
      this.updateVoidPuddles(dt);
      return;
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.finishAttack();
      this.updateProjectiles(dt);
      this.updateVoidPuddles(dt);
      return;
    }

    const player = nearestPlayer(this, players);
    if (!player) return;

    if (!this.activated) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (d < DETECT_RANGE && !player.isDead) this.activate();
      return;
    }

    // Phase transitions
    if (this.phase === 1 && this.hp <= this.maxHp * 0.66) this.enterPhase(2);
    else if (this.phase === 2 && this.hp <= this.maxHp * 0.33) this.enterPhase(3);

    this.direction = player.x > this.x ? 1 : -1;
    this.setFlipX(this.direction < 0);

    if (player.isDead) {
      this.body.velocity.x = 0;
      this.updateProjectiles(dt);
      this.updateVoidPuddles(dt);
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Phase-gated behaviors
    if (this.phase >= 1 && this.teleportCooldown <= 0 && dist < MELEE_RANGE * 1.4 && Math.random() < 0.5) {
      this.teleportAway(player);
    } else if (this.orbCooldown <= 0 && dist > MELEE_RANGE) {
      this.voidOrbVolley(player);
    } else if (this.phase >= 2 && this.slamCooldown <= 0 && dist < MELEE_RANGE * 2) {
      this.voidSlam(player);
    } else {
      const onGround = this.body.blocked.down || this.body.touching.down;
      if (onGround) {
        if (dist > MELEE_RANGE * 0.9) {
          this.body.velocity.x = this.direction * (dist < DETECT_RANGE ? CHASE_SPEED : PATROL_SPEED);
        } else {
          this.body.velocity.x = 0;
        }
      }
    }

    this.updateProjectiles(dt);
    this.updateVoidPuddles(dt);
  }

  enterPhase(p) {
    this.phase = p;
    shakeScene(this.scene, 320, 0.018);
    this.scene.cameras.main.flash(280, 140, 40, 200);
    if (p === 2) {
      this.setTint(0xaa44cc).setTintMode(Phaser.TintModes.FILL);
      this.scene.time.delayedCall(200, () => { if (this.active) this.clearTint(); });
      this.summonAdds();
    } else if (p === 3) {
      this.setTint(0xcc44ff).setTintMode(Phaser.TintModes.FILL);
      this.scene.time.delayedCall(220, () => { if (this.active) this.clearTint(); });
      this.addDarkOverlay();
      this.teleportCooldown = 0;
      this.orbCooldown = 0;
    }
  }

  addDarkOverlay() {
    if (this.darkOverlay) return;
    const cam = this.scene.cameras.main;
    const o = this.scene.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x080418, 0);
    o.setScrollFactor(0).setDepth(9).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.darkOverlay = o;
    this.scene.tweens.add({ targets: o, fillAlpha: 0.42, duration: 1100 });
  }

  summonAdds() {
    if (!this.scene.levelManager) return;
    const spots = [
      { x: this.x - 120, y: this.y },
      { x: this.x + 120, y: this.y },
    ];
    for (const s of spots) {
      const add = new Crawler(this.scene, s.x, s.y);
      add.setTint(0x8040ff);
      add.hp = 2;
      this.scene.enemies.add(add);
      this.summons.push(add);
      // Entrance swirl
      const swirl = this.scene.add.image(s.x, s.y, 'void_orb');
      swirl.setScale(1.8);
      swirl.setBlendMode(Phaser.BlendModes.ADD);
      swirl.setDepth(8);
      this.scene.tweens.add({
        targets: swirl, alpha: 0, scaleX: 3.5, scaleY: 3.5, duration: 450,
        onComplete: () => swirl.destroy(),
      });
    }
  }

  teleportAway(player) {
    this.attackTimer = 420;
    this.attackPhase = 'teleport';
    this.teleportCooldown = this.phase >= 3 ? TELEPORT_COOLDOWN * 0.45 : TELEPORT_COOLDOWN;

    const startX = this.x;
    const startY = this.y;

    // Fade out
    this.intangible = true;
    this.scene.tweens.add({
      targets: this, alpha: 0.15, duration: 180, ease: 'Sine.easeIn',
      onComplete: () => {
        if (this.isDead || !this.active) return;
        // Pick new position: some distance from player, within room
        const rpw = this.scene.levelManager.roomPixelW;
        const rph = this.scene.levelManager.roomPixelH;
        let nx = player.x + (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 120);
        let ny = player.y - 30;
        nx = Phaser.Math.Clamp(nx, 80, rpw - 80);
        ny = Phaser.Math.Clamp(ny, 100, rph - 100);
        this.setPosition(nx, ny);
        this.body.velocity.set(0, 0);

        // Phase 3: drop a void puddle at the exit point
        if (this.phase >= 3) {
          this.dropVoidPuddle(startX, Math.min(rph - 12, startY + 40));
        }

        // Fade back in
        this.scene.tweens.add({
          targets: this, alpha: 1, duration: 260, ease: 'Sine.easeOut',
          onComplete: () => { this.intangible = false; },
        });
      },
    });
  }

  voidOrbVolley(player) {
    this.attackTimer = 500;
    this.attackPhase = 'orb';
    this.body.velocity.x = 0;
    this.orbCooldown = this.phase >= 3 ? ORB_COOLDOWN * 0.55 : ORB_COOLDOWN;

    const count = this.phase >= 2 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(140 + i * 160, () => {
        if (this.isDead || !this.active) return;
        const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const spread = (i - (count - 1) / 2) * 0.22;
        const a = base + spread;
        const proj = this.scene.physics.add.image(
          this.x + Math.cos(a) * 30,
          this.y + Math.sin(a) * 30 - 8,
          'void_orb',
        );
        proj.body.allowGravity = false;
        proj.body.setSize(14, 14);
        proj.setDepth(8);
        proj.setBlendMode(Phaser.BlendModes.ADD);
        proj.body.velocity.x = Math.cos(a) * PROJECTILE_SPEED;
        proj.body.velocity.y = Math.sin(a) * PROJECTILE_SPEED;
        proj._life = 2800;

        const ovs = [];
        for (const p of this.scene.getActivePlayers()) {
          const ov = this.scene.physics.add.overlap(p, proj, () => {
            if (!proj.active) return;
            p.takeDamage(1, proj.x);
            proj.destroy();
            for (const o of ovs) this.scene.physics.world.removeCollider(o);
          });
          ovs.push(ov);
        }
        proj._overlaps = ovs;

        const lm = this.scene.levelManager;
        if (lm?.wallLayer) {
          this.scene.physics.add.collider(proj, lm.wallLayer, () => {
            if (!proj.active) return;
            proj.destroy();
            for (const o of ovs) this.scene.physics.world.removeCollider(o);
          });
        }

        // Subtle swirl tween
        this.scene.tweens.add({
          targets: proj, scaleX: 1.3, scaleY: 1.3, duration: 260, yoyo: true, repeat: -1,
        });

        this.projectiles.push(proj);
      });
    }
  }

  voidSlam(player) {
    this.attackTimer = 780;
    this.attackPhase = 'slam';
    this.body.velocity.x = 0;
    this.slamCooldown = this.phase >= 3 ? SLAM_COOLDOWN * 0.6 : SLAM_COOLDOWN;

    this.body.velocity.y = -240;
    this.scene.time.delayedCall(300, () => {
      if (this.isDead || !this.active) return;
      this.body.velocity.y = 420;
      this.scene.time.delayedCall(240, () => {
        if (this.isDead || !this.active) return;
        shakeScene(this.scene, 240, 0.022);

        // Shockwave — advancing in both directions but with hold
        const mk = (dir) => {
          const w = this.scene.physics.add.image(this.x + dir * 16, this.y + 24, 'particle_white');
          w.setVisible(false);
          w.body.allowGravity = false;
          w.body.setSize(120, 24);
          w.body.velocity.x = dir * 220;
          const fx = this.scene.add.image(this.x + dir * 16, this.y + 24, 'void_orb');
          fx.setScale(2);
          fx.setBlendMode(Phaser.BlendModes.ADD);
          fx.setDepth(8);
          this.scene.tweens.add({
            targets: fx, x: fx.x + dir * 240, alpha: 0, scaleX: 4, scaleY: 4,
            duration: 640, onComplete: () => fx.destroy(),
          });
          const ovs = [];
          for (const p of this.scene.getActivePlayers()) {
            const ov = this.scene.physics.add.overlap(p, w, () => {
              if (!w.active) return;
              p.takeDamage(this.damage, w.x);
            });
            ovs.push(ov);
          }
          this.scene.time.delayedCall(640, () => {
            if (w.active) w.destroy();
            for (const ov of ovs) this.scene.physics.world.removeCollider(ov);
          });
        };
        mk(1);
        mk(-1);

        if (this.phase >= 3) {
          this.dropVoidPuddle(this.x, this.y + 40);
        }
      });
    });
  }

  dropVoidPuddle(x, y) {
    const pu = this.scene.physics.add.image(x, y, 'void_puddle');
    pu.body.allowGravity = false;
    pu.body.setSize(28, 10);
    pu.body.setImmovable(true);
    pu.setDepth(3);
    pu.setBlendMode(Phaser.BlendModes.ADD);
    pu.setAlpha(0);
    pu._life = 5200;

    this.scene.tweens.add({ targets: pu, alpha: 0.85, duration: 260 });
    this.scene.tweens.add({
      targets: pu, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1,
    });

    const ovs = [];
    for (const p of this.scene.getActivePlayers()) {
      const ov = this.scene.physics.add.overlap(p, pu, () => {
        if (!pu.active) return;
        this.scene.levelManager?.applyHazardDamage?.(p, pu.x);
      });
      ovs.push(ov);
    }
    pu._overlaps = ovs;

    this.voidPuddles.push(pu);
  }

  updateVoidPuddles(dt) {
    for (let i = this.voidPuddles.length - 1; i >= 0; i--) {
      const p = this.voidPuddles[i];
      if (!p.active) { this.voidPuddles.splice(i, 1); continue; }
      p._life -= dt;
      if (p._life <= 600) {
        p.setAlpha(Math.max(0, p._life / 600 * 0.85));
      }
      if (p._life <= 0) {
        if (p._overlaps) for (const ov of p._overlaps) this.scene.physics.world.removeCollider(ov);
        p.destroy();
        this.voidPuddles.splice(i, 1);
      }
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) { this.projectiles.splice(i, 1); continue; }
      p._life -= dt;
      if (p._life <= 0) {
        if (p._overlaps) for (const ov of p._overlaps) this.scene.physics.world.removeCollider(ov);
        p.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  finishAttack() {
    this.attackPhase = null;
  }

  takeDamage(amount, slashDir) {
    if (this.isDead || this.intangible) return;
    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 180;

    this.setTint(0xff88ff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(70, () => {
      if (this.active && !this.isDead) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 70;
    this.body.velocity.y = -40;
    this.knockbackTimer = 120;

    this.updateHealthBar();
    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    for (const p of this.projectiles) {
      if (p.active) {
        if (p._overlaps) for (const ov of p._overlaps) this.scene.physics.world.removeCollider(ov);
        p.destroy();
      }
    }
    this.projectiles = [];
    for (const p of this.voidPuddles) {
      if (p.active) {
        if (p._overlaps) for (const ov of p._overlaps) this.scene.physics.world.removeCollider(ov);
        p.destroy();
      }
    }
    this.voidPuddles = [];

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 36);
    }
    shakeScene(this.scene, 700, 0.03);

    const rid = this.scene.levelManager?.currentRoomId;
    if (rid && this.scene.gameState?.setBossDefeated) {
      this.scene.gameState.setBossDefeated(`boss_${rid}`);
    }

    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead) p.hp = p.maxHp;
    }

    if (this.darkOverlay) {
      this.scene.tweens.add({
        targets: this.darkOverlay, fillAlpha: 0, duration: 1200,
        onComplete: () => this.darkOverlay?.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.4, scaleY: 0.4, duration: 1400, ease: 'Power2',
      onComplete: () => {
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.nameText) this.nameText.destroy();
        this.destroy();
      },
    });

    const victoryText = this.scene.add.text(this.x, this.y - 60, 'THE VOID KING HAS FALLEN', {
      fontSize: '28px', fontFamily: 'monospace', color: '#cc88ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: victoryText, alpha: 0, y: this.y - 140, duration: 3600, delay: 1200,
      onComplete: () => victoryText.destroy(),
    });
  }

  canDamagePlayer() {
    if (this.isDead || this.hitCooldown > 0 || this.intangible) return false;
    return true;
  }
}
