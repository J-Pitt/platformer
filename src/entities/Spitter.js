import * as Phaser from 'phaser';

const DETECT_RANGE = 320;
const SHOT_COOLDOWN_MS = 2200;
const BURST_GAP_MS = 180;
const PROJECTILE_SPEED = 180;
const PROJECTILE_GRAVITY = 340;

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
 * Spitter — stationary grounded enemy.
 * Fires a 3-shot arcing burst when the player is in range and line-of-sight-ish.
 * Never moves; destroys itself when killed. Intended to force spatial awareness
 * without the density of a flyer.
 */
export class Spitter extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spitter');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(26, 26);
    this.body.setOffset(3, 4);
    this.body.allowGravity = true;
    this.body.setMaxVelocity(0, 400);
    this.setDepth(4);

    this.hp = 2;
    this.maxHp = 2;
    this.damage = 1;
    this.isHit = false;
    this.isDead = false;
    this.knockbackTimer = 0;
    this.hitCooldown = 0;

    this.shotCooldown = SHOT_COOLDOWN_MS * 0.4 + Math.random() * SHOT_COOLDOWN_MS * 0.4;
    this.burstRemaining = 0;
    this.burstGap = 0;
    this.aimDir = 1;
    this.puffTimer = 0;
    this.projectiles = [];
  }

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (this.knockbackTimer > 0) return;

    // No horizontal movement — anchor in place.
    this.body.velocity.x = 0;

    // Idle puff animation
    this.puffTimer += dt;
    this.setScale(1 + Math.sin(this.puffTimer * 0.004) * 0.04);

    // Cull dead projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) this.projectiles.splice(i, 1);
    }

    const player = nearestPlayer(this, players);
    if (!player || player.isDead) return;

    const dx = player.x - this.x;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.aimDir = dx >= 0 ? 1 : -1;
    this.setFlipX(this.aimDir < 0);

    if (this.burstRemaining > 0) {
      this.burstGap -= dt;
      if (this.burstGap <= 0) {
        this.fireShot(player);
        this.burstRemaining--;
        this.burstGap = BURST_GAP_MS;
        if (this.burstRemaining === 0) {
          this.shotCooldown = SHOT_COOLDOWN_MS;
        }
      }
      return;
    }

    this.shotCooldown -= dt;
    if (this.shotCooldown <= 0 && dist < DETECT_RANGE) {
      this.burstRemaining = 3;
      this.burstGap = 0;
    }
  }

  fireShot(player) {
    // Pre-compute arc: aim upward slightly so projectile arcs toward player
    const dx = player.x - this.x;
    const dy = player.y - this.y - 12;
    const angle = Math.atan2(dy, dx);
    const spread = (Math.random() - 0.5) * 0.08; // slight jitter
    const fa = angle + spread - 0.18; // aim a bit higher for arc
    const vx = Math.cos(fa) * PROJECTILE_SPEED;
    const vy = Math.sin(fa) * PROJECTILE_SPEED;

    const origin = { x: this.x + this.aimDir * 12, y: this.y - 10 };
    const bullet = this.scene.physics.add.image(origin.x, origin.y, 'spitter_orb');
    bullet.setDepth(6);
    bullet.setBlendMode(Phaser.BlendModes.ADD);
    bullet.body.allowGravity = true;
    bullet.body.setAllowGravity(true);
    bullet.body.gravity.y = PROJECTILE_GRAVITY;
    bullet.body.setSize(10, 10);
    bullet.body.velocity.x = vx;
    bullet.body.velocity.y = vy;

    bullet._life = 2800;
    bullet._owner = this;

    const destroy = () => {
      if (!bullet.active) return;
      const pop = this.scene.add.image(bullet.x, bullet.y, 'particle_teal');
      pop.setBlendMode(Phaser.BlendModes.ADD);
      pop.setDepth(7);
      pop.setScale(1.2);
      this.scene.tweens.add({
        targets: pop, alpha: 0, scaleX: 2.6, scaleY: 2.6, duration: 220,
        onComplete: () => pop.destroy(),
      });
      bullet.destroy();
    };

    for (const p of this.scene.getActivePlayers()) {
      this.scene.physics.add.overlap(p, bullet, () => {
        p.takeDamage(this.damage, bullet.x);
        destroy();
      });
    }
    this.scene.physics.add.collider(bullet, this.scene.levelManager.wallLayer, destroy);
    this.scene.physics.add.collider(bullet, this.scene.levelManager.platformGroup, destroy);

    bullet._destroyFn = destroy;
    this.projectiles.push(bullet);

    this.scene.time.delayedCall(bullet._life, () => {
      if (bullet.active) destroy();
    });

    // Visual flash at muzzle
    const flash = this.scene.add.image(origin.x, origin.y, 'particle_teal');
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(7);
    flash.setScale(1.2);
    this.scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 2.4, scaleY: 2.4, duration: 180,
      onComplete: () => flash.destroy(),
    });
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;
    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 300;

    this.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 40;
    this.body.velocity.y = -60;
    this.knockbackTimer = 140;

    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;

    // Kill all projectiles
    for (const p of this.projectiles) {
      if (p.active && p._destroyFn) p._destroyFn();
    }
    this.projectiles = [];

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 14);
    }
    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead && p.hp < p.maxHp) p.hp = Math.min(p.hp + 1, p.maxHp);
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 360,
      onComplete: () => this.destroy(),
    });
  }

  canDamagePlayer() {
    // Contact damage is low — main threat is the projectile
    return !this.isDead && this.hitCooldown <= 0;
  }
}
