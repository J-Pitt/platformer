import { shakeScene } from './CameraRig.js';

const SLASH_DURATION = 320;
const SLASH_COOLDOWN = 400;
const SLASH_KNOCKBACK = 200;
const POGO_BOUNCE = -320;
const HIT_FREEZE_DURATION = 60;
const DAMAGE_INVULN_DURATION = 1000;
const PLAYER_KNOCKBACK = 160;
const KICK_DURATION = 250;
const KICK_COOLDOWN = 500;
const KICK_KNOCKBACK = 360;

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
  }

  /** Visual phase 0–3 for syncing player attack frames with slash duration */
  getSlashAnimPhase() {
    if (!this.isSlashing) return 0;
    const elapsed = SLASH_DURATION - this.slashTimer;
    return Math.min(3, Math.floor((elapsed / SLASH_DURATION) * 4));
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
    this.isSlashing = true;
    this.slashTimer = SLASH_DURATION;
    this.slashCooldownTimer = SLASH_COOLDOWN;
    this.slashDirection = this.getSlashDirection(input);

    this.ensureSlashAnimations();
    const dir = this.slashDirection;
    const tex = `slash_${dir}_0`;
    this.slashSprite = this.scene.add.sprite(this.player.x, this.player.y, tex);
    this.slashSprite.setDepth(11);
    this.slashSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.slashSprite.setAlpha(0.92);
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

    const reach = this.hasSpear ? 1.5 : 1;
    const size = { w: Math.round(44 * reach), h: Math.round(26 * reach) };
    if (this.slashDirection === 'up' || this.slashDirection === 'down') {
      size.w = Math.round(26 * reach);
      size.h = Math.round(44 * reach);
    }

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
  }

  onSlashHitEnemy(hitbox, enemy) {
    if (!enemy.active || enemy.isHit) return;

    const dmg = this.hasSpear ? 2 : 1;
    enemy.takeDamage(dmg, hitbox.slashDirection);

    this.scene.physics.pause();
    setTimeout(() => {
      if (this.scene && this.scene.physics) this.scene.physics.resume();
    }, HIT_FREEZE_DURATION);

    shakeScene(this.scene, 50, 0.008);

    if (hitbox.slashDirection === 'down') {
      this.player.body.velocity.y = POGO_BOUNCE;
    }
    if (hitbox.slashDirection === 'right') {
      this.player.body.velocity.x = -PLAYER_KNOCKBACK;
    } else if (hitbox.slashDirection === 'left') {
      this.player.body.velocity.x = PLAYER_KNOCKBACK;
    }
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
