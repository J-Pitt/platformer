import * as Phaser from 'phaser';
import { shakeScene } from './CameraRig.js';

const POGO_BOUNCE = -320;
const HIT_FREEZE_DURATION = 60;
const DAMAGE_INVULN_DURATION = 1000;
const PLAYER_KNOCKBACK = 160;
const KICK_DURATION = 250;
const KICK_COOLDOWN = 500;
const KICK_KNOCKBACK = 360;
const DAGGER_SPEED = 480;
const DAGGER_DAMAGE = 1;
const DAGGER_LIFETIME = 900;

export class CombatSystem {
  constructor(player) {
    this.player = player;
    this.scene = player.scene;

    this.isSlashing = false;
    this.slashTimer = 0;
    this.slashCooldownTimer = 0;
    this.slashSprite = null;
    this.slashHitbox = null;
    this.slashTween = null;
    this.hasSlash = false;
    this.hasSpear = false;
    this.hasKick = false;

    this.isKicking = false;
    this.kickTimer = 0;
    this.kickCooldownTimer = 0;
    this.kickHitbox = null;
    this.kickSprite = null;

    this.invulnTimer = 0;
    this.isInvulnerable = false;
  }

  update(dt, input) {
    this.slashCooldownTimer = Math.max(0, this.slashCooldownTimer - dt);
    this.kickCooldownTimer = Math.max(0, this.kickCooldownTimer - dt);

    if (this.isInvulnerable) {
      this.invulnTimer -= dt;
      this.player.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 0.3 : 1);
      if (this.invulnTimer <= 0) {
        this.isInvulnerable = false;
        this.player.setAlpha(1);
      }
    }

    if (this.isSlashing) {
      this.slashTimer -= dt;
      if (this.slashTimer <= 0) {
        this.endSlash();
      } else {
        this.positionSlashHitbox();
      }
      return;
    }

    if (this.isKicking) {
      this.kickTimer -= dt;
      if (this.kickTimer <= 0) {
        this.endKick();
      } else {
        this.positionKickHitbox();
      }
      return;
    }

    if (this.hasSlash && input.slashPressed && this.slashCooldownTimer <= 0) {
      this.startSlash(input);
    }

    if (this.hasKick && input.kickPressed && this.kickCooldownTimer <= 0 && !this.isSlashing) {
      this.startKick();
    }

    if (input.throwPressed && !this.isSlashing && !this.isKicking) {
      this.tryThrowDagger();
    }
  }

  /** Stats for the current swing — pulled from the equipped weapon (falls back to default). */
  getWeaponStats() {
    const w = this.player.inventory?.activeWeapon?.() || null;
    const stats = {
      slashMs: w?.slashMs ?? 320,
      cooldownMs: w?.cooldownMs ?? 400,
      damage: w?.damage ?? 1,
      reach: w?.reach ?? 1.0,
      knockback: w?.knockback ?? 200,
      tint: w?.color ?? null,
    };
    if (this.hasSpear) {
      stats.damage += 1;
      stats.reach *= 1.12;
    }
    return stats;
  }

  /** Visual phase 0–3 for syncing player attack frames with slash duration */
  getSlashAnimPhase() {
    if (!this.isSlashing) return 0;
    const total = this._currentSlashMs || 320;
    const elapsed = total - this.slashTimer;
    return Math.min(3, Math.floor((elapsed / total) * 4));
  }

  getSlashDirection(input) {
    if (input.up) return 'up';
    if (input.down) {
      const onGround = this.player.body.blocked.down || this.player.body.touching.down;
      if (!onGround) return 'down';
    }
    return this.player.facing > 0 ? 'right' : 'left';
  }

  ensureSlashAnimations() {
    if (this.scene.anims.exists('slash_anim_right')) return;
    const dirs = ['right', 'left', 'up', 'down'];
    for (const dir of dirs) {
      const key = `slash_anim_${dir}`;
      if (this.scene.anims.exists(key)) continue;
      this.scene.anims.create({
        key,
        frames: [0, 1, 2, 3].map((fi) => ({ key: `slash_${dir}_${fi}` })),
        frameRate: 26,
        repeat: 0,
      });
    }
  }

  startSlash(input) {
    const stats = this.getWeaponStats();
    this.isSlashing = true;
    this.slashTimer = stats.slashMs;
    this._currentSlashMs = stats.slashMs;
    this._currentSlashStats = stats;
    this.slashCooldownTimer = stats.cooldownMs;
    this.slashDirection = this.getSlashDirection(input);

    this.ensureSlashAnimations();
    const dir = this.slashDirection;
    if (this.player.playSlashFlourish) this.player.playSlashFlourish(dir);
    const tex = `slash_${dir}_0`;
    this.slashSprite = this.scene.add.sprite(this.player.x, this.player.y, tex);
    this.slashSprite.setDepth(11);
    this.slashSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.slashSprite.setAlpha(0.92);
    if (stats.tint) this.slashSprite.setTint(stats.tint);
    this.slashSprite.play(`slash_anim_${dir}`);

    // Motion polish: quick scale-out as the swing commits (frame 1–2)
    this.slashTween = this.scene.tweens.add({
      targets: this.slashSprite,
      scaleX: { from: 0.78, to: 1.22 },
      scaleY: { from: 0.78, to: 1.22 },
      duration: 95,
      ease: 'Cubic.easeOut',
      yoyo: false,
      onComplete: () => {
        if (!this.slashSprite || !this.slashSprite.active) return;
        this.scene.tweens.add({
          targets: this.slashSprite,
          scaleX: 1,
          scaleY: 1,
          duration: 110,
          ease: 'Sine.easeInOut',
        });
      },
    });

    const reach = stats.reach;
    const size = { w: Math.round(44 * reach), h: Math.round(26 * reach) };
    if (this.slashDirection === 'up' || this.slashDirection === 'down') {
      size.w = Math.round(26 * reach);
      size.h = Math.round(44 * reach);
    }
    this.slashSprite.setScale(reach);

    this.slashHitbox = this.scene.physics.add.image(this.player.x, this.player.y);
    this.slashHitbox.body.setSize(size.w, size.h);
    this.slashHitbox.body.allowGravity = false;
    this.slashHitbox.setVisible(false);
    this.slashHitbox.slashDirection = this.slashDirection;

    this.positionSlashHitbox();

    if (this.scene.enemies) {
      this.slashOverlap = this.scene.physics.add.overlap(
        this.slashHitbox, this.scene.enemies,
        this.onSlashHitEnemy, null, this,
      );
    }

    // Hitting a secret_wall tile with the slash reveals it
    const sg = this.scene.levelManager?.secretWallGroup;
    if (sg) {
      this.slashWallOverlap = this.scene.physics.add.overlap(
        this.slashHitbox, sg,
        (hitbox, wall) => {
          const state = wall._secretWall;
          if (state) this.scene.levelManager.onSecretWallHit(state);
        }, null, this,
      );
    }
  }

  positionSlashHitbox() {
    if (!this.slashHitbox) return;
    const p = this.player;
    const offsets = {
      right: { x: 28, y: 0 },
      left: { x: -28, y: 0 },
      up: { x: 0, y: -28 },
      down: { x: 0, y: 28 },
    };
    const off = offsets[this.slashDirection];
    this.slashHitbox.setPosition(p.x + off.x, p.y + off.y);
    if (this.slashSprite) {
      this.slashSprite.setPosition(p.x + off.x, p.y + off.y);
    }
  }

  endSlash() {
    this.isSlashing = false;
    if (this.slashTween) {
      this.slashTween.stop();
      this.slashTween = null;
    }
    if (this.slashSprite) {
      this.scene.tweens.killTweensOf(this.slashSprite);
      this.slashSprite.destroy();
      this.slashSprite = null;
    }
    if (this.slashHitbox) { this.slashHitbox.destroy(); this.slashHitbox = null; }
    if (this.slashOverlap) {
      this.scene.physics.world.removeCollider(this.slashOverlap);
      this.slashOverlap = null;
    }
    if (this.slashWallOverlap) {
      this.scene.physics.world.removeCollider(this.slashWallOverlap);
      this.slashWallOverlap = null;
    }
  }

  onSlashHitEnemy(hitbox, enemy) {
    if (!enemy.active || enemy.isHit) return;

    const stats = this._currentSlashStats || this.getWeaponStats();
    enemy.takeDamage(stats.damage, hitbox.slashDirection);

    this.scene.physics.pause();
    setTimeout(() => {
      if (this.scene && this.scene.physics) this.scene.physics.resume();
    }, HIT_FREEZE_DURATION);

    const intensity = 0.004 + Math.min(0.012, stats.damage * 0.004);
    shakeScene(this.scene, 50 + stats.damage * 15, intensity);

    if (hitbox.slashDirection === 'down') {
      this.player.body.velocity.y = POGO_BOUNCE;
    }
    const kb = stats.knockback * 0.8;
    if (hitbox.slashDirection === 'right') {
      this.player.body.velocity.x = -kb;
    } else if (hitbox.slashDirection === 'left') {
      this.player.body.velocity.x = kb;
    }
    if (enemy.body) {
      const eDir = hitbox.slashDirection === 'left' ? -1 : hitbox.slashDirection === 'right' ? 1 : 0;
      if (eDir !== 0) enemy.body.velocity.x += eDir * stats.knockback * 0.6;
    }
  }

  /** Throw a dagger projectile from the player in the facing direction. */
  tryThrowDagger() {
    const inv = this.player.inventory;
    if (!inv || !inv.tryThrowDagger()) return;
    const p = this.player;
    const dir = p.facing || 1;
    const proj = this.scene.physics.add.image(p.x + dir * 10, p.y - 2, 'dagger_projectile');
    proj.setDepth(9);
    proj.body.allowGravity = false;
    proj.setFlipX(dir < 0);
    proj.setVelocity(dir * DAGGER_SPEED, 0);
    proj._lifeMs = DAGGER_LIFETIME;
    proj._damage = DAGGER_DAMAGE + (this.hasSpear ? 1 : 0);

    // Rotating feel while flying
    this.scene.tweens.add({
      targets: proj, angle: { from: 0, to: dir > 0 ? 720 : -720 },
      duration: DAGGER_LIFETIME, ease: 'Linear',
    });

    // Damage on hit
    if (this.scene.enemies) {
      const col = this.scene.physics.add.overlap(proj, this.scene.enemies, (pj, enemy) => {
        if (!enemy.active || enemy.isHit) return;
        enemy.takeDamage(pj._damage, dir > 0 ? 'right' : 'left');
        shakeScene(this.scene, 40, 0.004);
        this._destroyDagger(pj, col);
      });
      proj._overlapCol = col;
    }
    // Kill on wall
    if (this.scene.levelManager?.wallLayer) {
      const coll = this.scene.physics.add.collider(proj, this.scene.levelManager.wallLayer, () => {
        this._destroyDagger(proj, proj._overlapCol);
      });
      proj._wallCol = coll;
    }

    this.scene.time.delayedCall(DAGGER_LIFETIME, () => this._destroyDagger(proj, proj._overlapCol));

    // Small muzzle flash
    const flash = this.scene.add.image(p.x + dir * 14, p.y - 2, 'particle_white')
      .setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setDepth(10);
    this.scene.tweens.add({
      targets: flash, alpha: 0, scale: 0.4, duration: 160,
      onComplete: () => flash.destroy(),
    });
  }

  _destroyDagger(proj, col) {
    if (!proj || !proj.active) return;
    if (col) {
      try { this.scene.physics.world.removeCollider(col); } catch { /* noop */ }
    }
    if (proj._wallCol) {
      try { this.scene.physics.world.removeCollider(proj._wallCol); } catch { /* noop */ }
    }
    proj.destroy();
  }

  startKick() {
    this.isKicking = true;
    this.kickTimer = KICK_DURATION;
    this.kickCooldownTimer = KICK_COOLDOWN;

    const p = this.player;
    const dir = p.facing;
    this.kickSprite = this.scene.add.image(p.x, p.y, 'kick_effect');
    this.kickSprite.setDepth(11);
    this.kickSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.kickSprite.setAlpha(0.85);
    this.kickSprite.setFlipX(dir < 0);

    this.scene.tweens.add({
      targets: this.kickSprite,
      scaleX: { from: 0.6, to: 1.3 },
      scaleY: { from: 0.8, to: 1.1 },
      alpha: { from: 0.85, to: 0.3 },
      duration: KICK_DURATION,
      ease: 'Cubic.easeOut',
    });

    this.kickHitbox = this.scene.physics.add.image(p.x, p.y);
    this.kickHitbox.body.setSize(36, 22);
    this.kickHitbox.body.allowGravity = false;
    this.kickHitbox.setVisible(false);
    this.kickHitbox.kickDir = dir;

    this.positionKickHitbox();

    if (this.scene.enemies) {
      this.kickOverlap = this.scene.physics.add.overlap(
        this.kickHitbox, this.scene.enemies,
        this.onKickHitEnemy, null, this,
      );
    }

    p.body.velocity.x += dir * 80;
  }

  positionKickHitbox() {
    if (!this.kickHitbox) return;
    const p = this.player;
    const offX = p.facing * 24;
    this.kickHitbox.setPosition(p.x + offX, p.y + 6);
    if (this.kickSprite) {
      this.kickSprite.setPosition(p.x + offX, p.y + 4);
    }
  }

  endKick() {
    this.isKicking = false;
    if (this.kickSprite) {
      this.scene.tweens.killTweensOf(this.kickSprite);
      this.kickSprite.destroy();
      this.kickSprite = null;
    }
    if (this.kickHitbox) { this.kickHitbox.destroy(); this.kickHitbox = null; }
    if (this.kickOverlap) {
      this.scene.physics.world.removeCollider(this.kickOverlap);
      this.kickOverlap = null;
    }
  }

  onKickHitEnemy(hitbox, enemy) {
    if (!enemy.active || enemy.isHit) return;
    enemy.takeDamage(1, hitbox.kickDir > 0 ? 'right' : 'left');

    this.scene.physics.pause();
    setTimeout(() => {
      if (this.scene && this.scene.physics) this.scene.physics.resume();
    }, HIT_FREEZE_DURATION);

    shakeScene(this.scene, 60, 0.01);
    const kb = KICK_KNOCKBACK;
    if (enemy.body) {
      enemy.body.velocity.x = hitbox.kickDir * kb;
      enemy.body.velocity.y = -120;
    }
    this.player.body.velocity.x = -hitbox.kickDir * 100;
  }

  takeDamage(amount) {
    if (this.isInvulnerable || this.player.movement.isDashing) return false;

    this.player.hp -= amount;
    this.isInvulnerable = true;
    this.invulnTimer = DAMAGE_INVULN_DURATION;

    this.player.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (this.player.active) this.player.clearTint();
    });

    shakeScene(this.scene, 100, 0.01);

    if (this.player.hp <= 0) {
      this.player.die();
    }
    return true;
  }

  setInvulnerable(val) {
    this.isInvulnerable = val;
    if (!val) {
      this.invulnTimer = 0;
      this.player.setAlpha(1);
    }
  }

  destroy() {
    this.endSlash();
    this.endKick();
  }
}
