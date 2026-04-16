import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';

const HP = 18;
const DAMAGE = 2;
const DETECT_RANGE = 340;
const MELEE_RANGE = 72;
const MELEE_COOLDOWN = 1300;
const BREATH_COOLDOWN = 3200;
const BARRAGE_COOLDOWN = 2600;
const PATROL_SPEED = 30;
const CHASE_SPEED = 58;
const PROJECTILE_SPEED = 200;

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
 * Frost Warden — Act 2 mini-boss.
 * Signature: frost breath cone that freezes the floor into a slippery patch.
 * Also has a 3-icicle barrage and a melee swing.
 */
export class FrostWarden extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'frost_warden');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(48, 60);
    this.body.setOffset(12, 10);
    this.setScale(1.5);
    this.setDepth(5);

    this.hp = HP;
    this.maxHp = HP;
    this.damage = DAMAGE;
    this.isHit = false;
    this.isDead = false;
    this.direction = -1;
    this.knockbackTimer = 0;
    this.hitCooldown = 0;
    this.meleeCooldown = MELEE_COOLDOWN * 0.5;
    this.breathCooldown = BREATH_COOLDOWN * 0.5;
    this.barrageCooldown = BARRAGE_COOLDOWN * 0.6;
    this.attackTimer = 0;
    this.attackPhase = null;
    this.activated = false;
    this.phaseTwo = false;

    this.projectiles = [];
    this.meleeHitbox = null;
    this.breathHitbox = null;

    this.healthBar = null;
    this.healthBarBg = null;
    this.nameText = null;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    this.createHealthBar();
  }

  createHealthBar() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const barW = 200;
    const barH = 10;
    const by = cam.height - 40;

    this.nameText = this.scene.add.text(cx, by - 18, 'THE FROST WARDEN', {
      fontSize: '14px', fontFamily: 'monospace', color: '#80d0ff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    this.healthBarBg = this.scene.add.rectangle(cx, by, barW + 4, barH + 4, 0x222233, 0.85)
      .setScrollFactor(0).setDepth(100).setAlpha(0);

    this.healthBar = this.scene.add.rectangle(cx - barW / 2, by, barW, barH, 0x80d0ff, 0.95)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

    this.scene.tweens.add({
      targets: [this.nameText, this.healthBarBg, this.healthBar],
      alpha: 1, duration: 600, delay: 200,
    });
  }

  updateHealthBar() {
    if (!this.healthBar) return;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barW = 200;
    this.healthBar.width = barW * ratio;
    if (ratio < 0.3) this.healthBar.fillColor = 0x408acc;
    else if (ratio < 0.6) this.healthBar.fillColor = 0x60b0e0;
  }

  update(dt, players) {
    if (this.isDead) {
      this.updateProjectiles(dt);
      return;
    }

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.breathCooldown = Math.max(0, this.breathCooldown - dt);
    this.barrageCooldown = Math.max(0, this.barrageCooldown - dt);
    this.isHit = false;

    if (this.knockbackTimer > 0) { this.updateProjectiles(dt); return; }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.finishAttack();
      this.updateProjectiles(dt);
      return;
    }

    const player = nearestPlayer(this, players);
    if (!player) return;

    if (!this.activated) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (d < DETECT_RANGE && !player.isDead) this.activate();
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    this.direction = player.x > this.x ? 1 : -1;
    this.setFlipX(this.direction < 0);

    if (!this.phaseTwo && this.hp <= this.maxHp * 0.5) this.enterPhaseTwo();

    if (player.isDead) { this.body.velocity.x = 0; this.updateProjectiles(dt); return; }

    if (dist < MELEE_RANGE && this.meleeCooldown <= 0) {
      this.startMelee();
    } else if (dist < MELEE_RANGE * 3.5 && this.breathCooldown <= 0 && Math.abs(this.y - player.y) < 80) {
      this.startFrostBreath();
    } else if (dist > MELEE_RANGE * 1.3 && this.barrageCooldown <= 0) {
      this.startIcicleBarrage(player);
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
  }

  enterPhaseTwo() {
    this.phaseTwo = true;
    this.setTint(0x80d0ff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(220, () => { if (this.active) this.clearTint(); });
    shakeScene(this.scene, 280, 0.015);
    this.scene.cameras.main.flash(200, 120, 200, 240);
  }

  startMelee() {
    this.attackTimer = 420;
    this.attackPhase = 'melee';
    this.body.velocity.x = 0;
    this.meleeCooldown = this.phaseTwo ? MELEE_COOLDOWN * 0.65 : MELEE_COOLDOWN;

    this.scene.time.delayedCall(180, () => {
      if (this.isDead || !this.active) return;
      const ox = this.direction * 52;
      const hb = this.scene.physics.add.image(this.x + ox, this.y, 'particle_white');
      hb.setVisible(false);
      hb.body.allowGravity = false;
      hb.body.setSize(46, 42);
      this.meleeHitbox = hb;
      const ovs = [];
      for (const p of this.scene.getActivePlayers()) {
        const ov = this.scene.physics.add.overlap(p, hb, () => {
          if (!hb.active) return;
          p.takeDamage(this.damage, this.x);
        });
        ovs.push(ov);
      }
      this.scene.time.delayedCall(220, () => {
        if (hb.active) hb.destroy();
        this.meleeHitbox = null;
        for (const ov of ovs) this.scene.physics.world.removeCollider(ov);
      });
    });
  }

  /** Horizontal frost cone that damages the player and lays a slippery ice patch on floor. */
  startFrostBreath() {
    this.attackTimer = 900;
    this.attackPhase = 'breath';
    this.body.velocity.x = 0;
    this.breathCooldown = this.phaseTwo ? BREATH_COOLDOWN * 0.75 : BREATH_COOLDOWN;

    // Charge-up flash
    this.setTint(0xcae8ff).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(300, () => {
      if (!this.active || this.isDead) return;
      this.clearTint();
      this.emitBreath();
    });
  }

  emitBreath() {
    const BREATH_LEN = 150;
    const BREATH_H = 54;
    const cx = this.x + this.direction * (BREATH_LEN / 2 + 12);
    const cy = this.y + 4;

    // Visual: white/cyan cone
    const cone = this.scene.add.rectangle(cx, cy, BREATH_LEN, BREATH_H, 0xcae8ff, 0.55);
    cone.setDepth(8);
    cone.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: cone, alpha: 0, duration: 620, onComplete: () => cone.destroy(),
    });

    // Damage zone
    const hb = this.scene.physics.add.image(cx, cy, 'particle_white');
    hb.setVisible(false);
    hb.body.allowGravity = false;
    hb.body.setSize(BREATH_LEN, BREATH_H);
    this.breathHitbox = hb;

    const ovs = [];
    for (const p of this.scene.getActivePlayers()) {
      const ov = this.scene.physics.add.overlap(p, hb, () => {
        if (!hb.active) return;
        p.takeDamage(this.damage, this.x);
      });
      ovs.push(ov);
    }
    this.scene.time.delayedCall(520, () => {
      if (hb.active) hb.destroy();
      this.breathHitbox = null;
      for (const ov of ovs) this.scene.physics.world.removeCollider(ov);
    });

    // Freeze the floor below the cone into a temporary ice patch
    const lm = this.scene.levelManager;
    if (lm && typeof lm.createIcePatch === 'function') {
      const startX = Math.min(this.x, cx + (this.direction * BREATH_LEN) / 2);
      const endX = Math.max(this.x, cx + (this.direction * BREATH_LEN) / 2);
      const yTile = Math.floor((this.y + 40) / 32);
      const xTileA = Math.floor(startX / 32);
      const xTileB = Math.floor(endX / 32);
      lm.createTemporaryIceStrip(xTileA, xTileB, yTile, 7000);
    }

    shakeScene(this.scene, 140, 0.008);
  }

  startIcicleBarrage(player) {
    this.attackTimer = 700;
    this.attackPhase = 'barrage';
    this.body.velocity.x = 0;
    this.barrageCooldown = this.phaseTwo ? BARRAGE_COOLDOWN * 0.65 : BARRAGE_COOLDOWN;

    const count = this.phaseTwo ? 4 : 3;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(120 + i * 140, () => {
        if (this.isDead || !this.active) return;
        this.fireIcicle(player, i, count);
      });
    }
  }

  fireIcicle(player, i, total) {
    const base = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const spread = (i - (total - 1) / 2) * 0.12;
    const a = base + spread;
    const proj = this.scene.physics.add.image(
      this.x + Math.cos(a) * 30,
      this.y + Math.sin(a) * 30 - 8,
      'icicle_shard',
    );
    proj.body.allowGravity = false;
    proj.body.setSize(10, 20);
    proj.setDepth(8);
    proj.body.velocity.x = Math.cos(a) * PROJECTILE_SPEED;
    proj.body.velocity.y = Math.sin(a) * PROJECTILE_SPEED;
    proj.rotation = a + Math.PI / 2;
    proj._life = 2400;

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

    // Also collide with walls to destroy projectile
    const lm = this.scene.levelManager;
    if (lm && lm.wallLayer) {
      this.scene.physics.add.collider(proj, lm.wallLayer, () => {
        if (!proj.active) return;
        proj.destroy();
        for (const o of ovs) this.scene.physics.world.removeCollider(o);
      });
    }

    this.projectiles.push(proj);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) { this.projectiles.splice(i, 1); continue; }
      p._life -= dt;
      if (p._life <= 0) {
        if (p._overlaps) {
          for (const ov of p._overlaps) this.scene.physics.world.removeCollider(ov);
        }
        p.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  finishAttack() {
    this.attackPhase = null;
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;
    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 180;

    this.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(80, () => {
      if (this.active && !this.isDead) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 80;
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
        if (p._overlaps) {
          for (const ov of p._overlaps) this.scene.physics.world.removeCollider(ov);
        }
        p.destroy();
      }
    }
    this.projectiles = [];
    if (this.meleeHitbox && this.meleeHitbox.active) this.meleeHitbox.destroy();
    if (this.breathHitbox && this.breathHitbox.active) this.breathHitbox.destroy();

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 22);
    }
    shakeScene(this.scene, 500, 0.025);

    const rid = this.scene.levelManager?.currentRoomId;
    if (rid && this.scene.gameState?.setBossDefeated) {
      this.scene.gameState.setBossDefeated(`boss_${rid}`);
    }

    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead) p.hp = p.maxHp;
    }

    this.scene.tweens.add({
      targets: this, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 1200, ease: 'Power2',
      onComplete: () => {
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.nameText) this.nameText.destroy();
        this.destroy();
      },
    });

    const victoryText = this.scene.add.text(this.x, this.y - 60, 'FROST WARDEN SHATTERED', {
      fontSize: '24px', fontFamily: 'monospace', color: '#80d0ff',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);
    this.scene.tweens.add({
      targets: victoryText, alpha: 0, y: this.y - 120, duration: 3000, delay: 1000,
      onComplete: () => victoryText.destroy(),
    });
  }

  canDamagePlayer() {
    return !this.isDead && this.hitCooldown <= 0;
  }
}
