const BOSS_HP = 20;
const BOSS_DAMAGE = 2;
const DETECT_RANGE = 300;
const MELEE_RANGE = 70;
const RANGED_COOLDOWN = 2500;
const MELEE_COOLDOWN = 1200;
const SLAM_COOLDOWN = 4000;
const PROJECTILE_SPEED = 220;
const CHASE_SPEED = 65;
const PATROL_SPEED = 35;

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

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss_idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.body.setSize(48, 56);
    this.body.setOffset(8, 8);
    this.setScale(1.8);
    this.setDepth(5);

    this.hp = BOSS_HP;
    this.maxHp = BOSS_HP;
    this.damage = BOSS_DAMAGE;
    this.isHit = false;
    this.isDead = false;
    this.direction = -1;
    this.state = 'idle';
    this.knockbackTimer = 0;
    this.hitCooldown = 0;
    this.meleeCooldown = 0;
    this.rangedCooldown = RANGED_COOLDOWN * 0.5;
    this.slamCooldown = SLAM_COOLDOWN * 0.6;
    this.attackTimer = 0;
    this.attackPhase = null;
    this.projectiles = [];
    this.meleeHitbox = null;
    this.slamShockwave = null;
    this.activated = false;
    this.phaseTwo = false;

    this.healthBar = null;
    this.healthBarBg = null;
    this.nameText = null;
  }

  activate() {
    if (this.activated) return;
    this.activated = true;
    this.state = 'idle';
    this.createHealthBar();
  }

  createHealthBar() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const barW = 200;
    const barH = 10;
    const by = cam.height - 40;

    this.nameText = this.scene.add.text(cx, by - 18, 'BONE TYRANT', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff4466',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    this.healthBarBg = this.scene.add.rectangle(cx, by, barW + 4, barH + 4, 0x222222, 0.85)
      .setScrollFactor(0).setDepth(100).setAlpha(0);

    this.healthBar = this.scene.add.rectangle(cx - barW / 2, by, barW, barH, 0xff2244, 0.9)
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
    if (ratio < 0.3) {
      this.healthBar.fillColor = 0xff0022;
    } else if (ratio < 0.6) {
      this.healthBar.fillColor = 0xff6622;
    }
  }

  update(dt, players) {
    if (this.isDead) {
      this.updateProjectiles(dt);
      return;
    }

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.rangedCooldown = Math.max(0, this.rangedCooldown - dt);
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);
    this.isHit = false;

    if (this.knockbackTimer > 0) {
      this.updateProjectiles(dt);
      return;
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.finishAttack();
      }
      this.updateProjectiles(dt);
      return;
    }

    const player = nearestPlayer(this, players);
    if (!player) return;

    if (!this.activated) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
      if (dist < DETECT_RANGE && !player.isDead) {
        this.activate();
      }
      return;
    }

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const playerDir = player.x > this.x ? 1 : -1;
    this.direction = playerDir;
    this.setFlipX(this.direction < 0);

    if (!this.phaseTwo && this.hp <= this.maxHp * 0.5) {
      this.enterPhaseTwo();
    }

    if (player.isDead) {
      this.body.velocity.x = 0;
      this.updateProjectiles(dt);
      return;
    }

    if (dist < MELEE_RANGE && this.meleeCooldown <= 0) {
      this.startMeleeAttack(player);
    } else if (dist < MELEE_RANGE * 1.3 && this.slamCooldown <= 0) {
      this.startSlamAttack(player);
    } else if (dist > MELEE_RANGE * 1.5 && this.rangedCooldown <= 0) {
      this.startRangedAttack(player);
    } else {
      if (dist > MELEE_RANGE * 0.8) {
        this.body.velocity.x = playerDir * (dist < DETECT_RANGE ? CHASE_SPEED : PATROL_SPEED);
      } else {
        this.body.velocity.x = 0;
      }
    }

    this.updateProjectiles(dt);
  }

  enterPhaseTwo() {
    this.phaseTwo = true;
    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(200, () => {
      if (this.active) {
        this.clearTint();
        this.setTint(0xff8866);
      }
    });
    this.scene.cameras.main.shake(300, 0.015);
  }

  startMeleeAttack(player) {
    this.state = 'melee';
    this.attackTimer = 400;
    this.attackPhase = 'melee';
    this.body.velocity.x = 0;
    const cd = this.phaseTwo ? MELEE_COOLDOWN * 0.65 : MELEE_COOLDOWN;
    this.meleeCooldown = cd;

    this.setTexture('boss_attack');

    this.scene.time.delayedCall(150, () => {
      if (this.isDead || !this.active) return;
      this.createMeleeHitbox();
    });
  }

  createMeleeHitbox() {
    const ox = this.direction * 60;
    const hb = this.scene.physics.add.image(this.x + ox, this.y, 'particle_dust');
    hb.setVisible(false);
    hb.body.allowGravity = false;
    hb.body.setImmovable(true);
    hb.body.setSize(56, 48);
    this.meleeHitbox = hb;

    const overlaps = [];
    const allPlayers = this.scene.getActivePlayers();
    for (const p of allPlayers) {
      const ov = this.scene.physics.add.overlap(p, hb, () => {
        if (!hb.active) return;
        p.takeDamage(this.damage, this.x);
      });
      overlaps.push(ov);
    }

    this.scene.time.delayedCall(250, () => {
      if (hb.active) hb.destroy();
      this.meleeHitbox = null;
      for (const ov of overlaps) this.scene.physics.world.removeCollider(ov);
    });
  }

  startSlamAttack(player) {
    this.state = 'slam';
    this.attackTimer = 600;
    this.attackPhase = 'slam';
    this.body.velocity.x = 0;
    const cd = this.phaseTwo ? SLAM_COOLDOWN * 0.6 : SLAM_COOLDOWN;
    this.slamCooldown = cd;

    this.setTexture('boss_attack');

    this.body.velocity.y = -200;
    this.scene.time.delayedCall(300, () => {
      if (this.isDead || !this.active) return;
      this.body.velocity.y = 350;
      this.scene.time.delayedCall(200, () => {
        if (this.isDead || !this.active) return;
        this.scene.cameras.main.shake(200, 0.02);
        this.createSlamWave();
      });
    });
  }

  createSlamWave() {
    const waveL = this.scene.physics.add.image(this.x - 20, this.y + 20, 'particle_dust');
    waveL.setVisible(false);
    waveL.body.allowGravity = false;
    waveL.body.setSize(120, 24);
    waveL.body.velocity.x = -180;

    const waveR = this.scene.physics.add.image(this.x + 20, this.y + 20, 'particle_dust');
    waveR.setVisible(false);
    waveR.body.allowGravity = false;
    waveR.body.setSize(120, 24);
    waveR.body.velocity.x = 180;

    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const px = this.x + side * (20 + (i % 4) * 30);
      const py = this.y + 10;
      if (this.scene.textures.exists('particle_dust')) {
        const fx = this.scene.add.image(px, py, 'particle_dust');
        fx.setDepth(8);
        fx.setAlpha(0.7);
        fx.setScale(2);
        fx.setTint(0xff6644);
        this.scene.tweens.add({
          targets: fx, alpha: 0, y: py - 20, scaleX: 0.5, scaleY: 0.5,
          duration: 400, onComplete: () => fx.destroy(),
        });
      }
    }

    const waves = [waveL, waveR];
    const overlaps = [];
    const allPlayers = this.scene.getActivePlayers();
    for (const w of waves) {
      for (const p of allPlayers) {
        const ov = this.scene.physics.add.overlap(p, w, () => {
          if (!w.active) return;
          p.takeDamage(this.damage, this.x);
        });
        overlaps.push(ov);
      }
    }

    this.scene.time.delayedCall(500, () => {
      for (const w of waves) { if (w.active) w.destroy(); }
      for (const ov of overlaps) { this.scene.physics.world.removeCollider(ov); }
    });
  }

  startRangedAttack(player) {
    this.state = 'ranged';
    this.attackTimer = 500;
    this.attackPhase = 'ranged';
    this.body.velocity.x = 0;
    const cd = this.phaseTwo ? RANGED_COOLDOWN * 0.55 : RANGED_COOLDOWN;
    this.rangedCooldown = cd;

    this.setTexture('boss_attack');

    const count = this.phaseTwo ? 3 : 1;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(150 + i * 200, () => {
        if (this.isDead || !this.active) return;
        this.fireProjectile(player);
      });
    }
  }

  fireProjectile(player) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const proj = this.scene.physics.add.image(
      this.x + Math.cos(angle) * 30,
      this.y + Math.sin(angle) * 30,
      'boss_projectile',
    );
    proj.body.allowGravity = false;
    proj.body.setSize(16, 16);
    proj.setDepth(8);
    proj.setScale(1.5);
    proj.body.velocity.x = Math.cos(angle) * PROJECTILE_SPEED;
    proj.body.velocity.y = Math.sin(angle) * PROJECTILE_SPEED;
    proj._life = 3000;

    const projOverlaps = [];
    const allPlayers = this.scene.getActivePlayers();
    for (const p of allPlayers) {
      const ov = this.scene.physics.add.overlap(p, proj, () => {
        if (!proj.active) return;
        p.takeDamage(1, proj.x);
        proj.destroy();
        for (const o of projOverlaps) this.scene.physics.world.removeCollider(o);
      });
      projOverlaps.push(ov);
    }
    proj._overlaps = projOverlaps;

    this.projectiles.push(proj);
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
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
    this.state = 'idle';
    if (this.active) this.setTexture('boss_idle');
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;

    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 200;

    this.setTintFill(0xff4444);
    this.scene.time.delayedCall(80, () => {
      if (this.active && !this.isDead) {
        this.clearTint();
        if (this.phaseTwo) this.setTint(0xff8866);
      }
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 80;
    this.body.velocity.y = -40;
    this.knockbackTimer = 120;

    this.updateHealthBar();

    if (this.hp <= 0) {
      this.die();
    }
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

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 25);
    }
    this.scene.cameras.main.shake(500, 0.025);

    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead) {
        p.hp = p.maxHp;
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0, scaleX: 0.5, scaleY: 0.5,
      duration: 1200,
      ease: 'Power2',
      onComplete: () => {
        if (this.healthBar) this.healthBar.destroy();
        if (this.healthBarBg) this.healthBarBg.destroy();
        if (this.nameText) this.nameText.destroy();
        this.destroy();
      },
    });

    const victoryText = this.scene.add.text(this.x, this.y - 60, 'BOSS DEFEATED', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ff4466',
      stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20);

    this.scene.tweens.add({
      targets: victoryText, alpha: 0, y: this.y - 120,
      duration: 3000, delay: 1000,
      onComplete: () => victoryText.destroy(),
    });
  }

  canDamagePlayer() {
    return !this.isDead && this.hitCooldown <= 0;
  }
}
