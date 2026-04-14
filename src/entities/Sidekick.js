import { DEFAULT_SIDEKICK_ID, getSidekickConfig } from '../characters/sidekickRegistry.js';
import { shakeScene } from '../systems/CameraRig.js';

export class Sidekick extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene
   * @param {import('../characters/sidekickTypes.js').SidekickConfig} [config]
   */
  constructor(scene, config) {
    const cfg = config || getSidekickConfig(DEFAULT_SIDEKICK_ID);
    super(scene, 0, 0, cfg.textureIdle);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    /** @type {import('../characters/sidekickTypes.js').SidekickConfig} */
    this.cfg = cfg;

    this.body.allowGravity = false;
    this.body.setSize(cfg.bodyWidth, cfg.bodyHeight);
    this.body.setOffset(cfg.bodyOffsetX, cfg.bodyOffsetY);
    this.setDepth(5.5);
    this.setScale(cfg.displayScale ?? 1.08);

    this.facing = 1;
    this.cooldownMs = 0;
    this.attackMs = 0;
    this.hitbox = null;
    this.hitOverlap = null;
  }

  cancelAttackState() {
    if (this.hitOverlap) {
      this.scene.physics.world.removeCollider(this.hitOverlap);
      this.hitOverlap = null;
    }
    if (this.hitbox) {
      this.hitbox.destroy();
      this.hitbox = null;
    }
    this.attackMs = 0;
    this.setTexture(this.cfg.textureIdle);
  }

  snapNearPlayer() {
    const p = this.scene.player;
    if (!p || !p.body) return;
    const f = p.facing >= 0 ? 1 : -1;
    this.facing = f;
    this.setFlipX(f < 0);
    this.setPosition(
      p.x - f * this.cfg.followOffsetX,
      p.y + this.cfg.followOffsetY,
    );
    this.body.setVelocity(0, 0);
  }

  hasEnemyInRange() {
    const group = this.scene.enemies;
    if (!group) return false;
    const r2 = this.cfg.detectRangePx * this.cfg.detectRangePx;
    for (const e of group.getChildren()) {
      if (!e || !e.active || e.isDead) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (dx * dx + dy * dy <= r2) return true;
    }
    return false;
  }

  beginAttack() {
    this.cooldownMs = this.cfg.attackCooldownMs;
    this.attackMs = this.cfg.attackDurationMs;
    this.setTexture(this.cfg.textureAttack);

    const hb = this.scene.physics.add.image(this.x, this.y);
    hb.setVisible(false);
    hb.body.allowGravity = false;
    hb.body.setSize(this.cfg.hitboxW, this.cfg.hitboxH);
    hb.setActive(true);
    this.hitbox = hb;
    this.positionHitbox();

    if (this.scene.enemies) {
      this.hitOverlap = this.scene.physics.add.overlap(
        hb,
        this.scene.enemies,
        this.onHitEnemy,
        null,
        this,
      );
    }
  }

  positionHitbox() {
    if (!this.hitbox) return;
    const off = this.cfg.hitboxOffsetX * this.facing;
    this.hitbox.setPosition(this.x + off, this.y - 2);
  }

  onHitEnemy(_hb, enemy) {
    if (!enemy || !enemy.active || enemy.isDead) return;
    if (enemy.isHit) return;

    const dir = this.facing > 0 ? 'right' : 'left';
    enemy.takeDamage(this.cfg.damage, dir);
    shakeScene(this.scene, 35, 0.004);
  }

  update(dt) {
    const p = this.scene.player;
    if (!p || !p.body || p.isDead) return;

    this.facing = p.facing >= 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);

    const tx = p.x - this.facing * this.cfg.followOffsetX;
    const ty = p.y + this.cfg.followOffsetY;
    const k = 4.8;
    this.body.setVelocity(
      Phaser.Math.Clamp((tx - this.x) * k, -240, 240),
      Phaser.Math.Clamp((ty - this.y) * k, -240, 240),
    );

    const roomH = this.scene.levelManager?.roomPixelH ?? 1080;
    if (this.y > roomH + 48) {
      this.snapNearPlayer();
    }

    if (this.attackMs > 0) {
      this.attackMs -= dt;
      this.positionHitbox();
      if (this.attackMs <= 0) {
        this.cancelAttackState();
      }
      return;
    }

    this.cooldownMs -= dt;
    if (this.cooldownMs <= 0 && this.hasEnemyInRange()) {
      this.beginAttack();
    }
  }
}
