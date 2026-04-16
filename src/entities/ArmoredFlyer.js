import * as Phaser from 'phaser';

const HOVER_SPEED = 22;
const SWOOP_SPEED = 110;
const DETECT_RANGE = 240;
const RETURN_SPEED = 48;

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
 * Armored flyer — heavy sibling of Flyer.
 * Only vulnerable from above (pogo / downward slash) or to the spear.
 * Teaches the player to read vertical space and use down-strike.
 */
export class ArmoredFlyer extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'armored_flyer');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(26, 24);
    this.body.setOffset(7, 8);
    this.body.allowGravity = false;
    this.setDepth(4);

    this.hp = 2;
    this.maxHp = 2;
    this.damage = 1;
    this.isHit = false;
    this.isDead = false;

    this.homeX = x;
    this.homeY = y;
    this.hoverAngle = Math.random() * Math.PI * 2;
    this.state = 'hover';
    this.swoopTarget = null;
    this.swoopCooldown = 0;
    this.knockbackTimer = 0;
    this.hitCooldown = 0;
    this.wingTimer = 0;

    this._clangCooldown = 0;
  }

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.swoopCooldown = Math.max(0, this.swoopCooldown - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this._clangCooldown = Math.max(0, this._clangCooldown - dt);

    if (this.knockbackTimer > 0) return;

    this.isHit = false;

    this.wingTimer += dt;
    const wingScale = 1 + Math.sin(this.wingTimer * 0.006) * 0.08;
    this.scaleX = wingScale;

    const player = nearestPlayer(this, players);
    if (!player) return;
    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case 'hover':
        this.hoverAngle += dt * 0.0025;
        this.body.velocity.x = Math.cos(this.hoverAngle) * HOVER_SPEED;
        this.body.velocity.y = Math.sin(this.hoverAngle * 2) * HOVER_SPEED * 0.4;

        if (distToPlayer < DETECT_RANGE && this.swoopCooldown <= 0 && !player.isDead) {
          this.state = 'swoop';
          this.swoopTarget = { x: player.x, y: player.y };
        }
        break;

      case 'swoop': {
        if (!this.swoopTarget) { this.state = 'return'; break; }
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.swoopTarget.x, this.swoopTarget.y);
        this.body.velocity.x = Math.cos(angle) * SWOOP_SPEED;
        this.body.velocity.y = Math.sin(angle) * SWOOP_SPEED;
        const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, this.swoopTarget.x, this.swoopTarget.y);
        if (distToTarget < 18) {
          this.state = 'return';
          this.swoopCooldown = 2400;
        }
        break;
      }

      case 'return': {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.homeX, this.homeY);
        this.body.velocity.x = Math.cos(angle) * RETURN_SPEED;
        this.body.velocity.y = Math.sin(angle) * RETURN_SPEED;
        const distToHome = Phaser.Math.Distance.Between(this.x, this.y, this.homeX, this.homeY);
        if (distToHome < 8) this.state = 'hover';
        break;
      }
    }

    this.setFlipX(this.body.velocity.x < 0);
  }

  /**
   * Only takes damage from:
   *   - a downward strike (pogo)
   *   - the spear (piercing)
   * Any other hit bounces off (deflects player, plays clang visual).
   */
  takeDamage(amount, slashDir) {
    if (this.isDead) return;

    const hasSpear = this.scene.player?.combat?.hasSpear;
    const vulnerable = slashDir === 'down' || hasSpear;

    if (!vulnerable) {
      // Deflect — visual clang, briefly flash, no HP loss
      if (this._clangCooldown <= 0) {
        this._clangCooldown = 300;
        this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        this.scene.time.delayedCall(90, () => {
          if (this.active) this.clearTint();
        });
        // Visual spark
        const spark = this.scene.add.image(this.x, this.y, 'particle_white');
        spark.setBlendMode(Phaser.BlendModes.ADD);
        spark.setDepth(8);
        spark.setScale(1.5);
        this.scene.tweens.add({
          targets: spark, alpha: 0, scaleX: 3, scaleY: 3, duration: 220,
          onComplete: () => spark.destroy(),
        });
        // Knock the armored flyer slightly back
        const kbDir = { right: -1, left: 1, up: 0, down: 0 }[slashDir] || 0;
        this.body.velocity.x = kbDir * 80;
        this.body.velocity.y = -20;
        this.knockbackTimer = 140;
      }
      return;
    }

    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 300;

    this.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 140;
    this.body.velocity.y = slashDir === 'down' ? 140 : -60;
    this.knockbackTimer = 220;

    if (this.hp <= 0) this.die();
  }

  die() {
    this.isDead = true;
    this.body.velocity.set(0, 0);

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 14);
    }
    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead && p.hp < p.maxHp) p.hp = Math.min(p.hp + 1, p.maxHp);
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.2, scaleY: 0.2, rotation: Math.PI,
      duration: 450, onComplete: () => this.destroy(),
    });
  }

  canDamagePlayer() {
    return !this.isDead && this.hitCooldown <= 0;
  }
}
