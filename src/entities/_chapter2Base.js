import * as Phaser from 'phaser';

/**
 * Shared helpers for Chapter 2 enemies. These enemies follow a unified
 * "approach + attack" loop but are simpler than the full Crawler/Flyer
 * rig in Chapter 1 — just enough to read as distinct threats.
 */

export function nearestPlayer(enemy, players) {
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

/** Flash red + knockback when hit, drop dead with death burst below 0 HP. */
export function applyStandardDamage(enemy, amount, slashDir, opts = {}) {
  if (enemy.isDead) return;
  enemy.hp -= amount;
  enemy.isHit = true;
  enemy.hitCooldown = 300;
  if (typeof enemy.setTint === 'function') {
    enemy.setTint(0xff4444);
    if (typeof enemy.setTintMode === 'function') enemy.setTintMode(Phaser.TintModes.FILL);
    enemy.scene.time.delayedCall(100, () => { if (enemy.active && enemy.clearTint) enemy.clearTint(); });
  }
  const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
  if (enemy.body) {
    enemy.body.velocity.x = kbDir * (opts.knockback || 220);
    enemy.body.velocity.y = -(opts.bounce || 90);
  }
  enemy.knockbackTimer = 200;
  if (enemy.hp <= 0) standardDeath(enemy, opts);
}

export function standardDeath(enemy, opts = {}) {
  enemy.isDead = true;
  if (enemy.body) {
    enemy.body.velocity.set(0, 0);
    enemy.body.allowGravity = false;
  }
  if (enemy.scene.enemyDeathEmitter) {
    enemy.scene.enemyDeathEmitter.emitParticleAt(enemy.x, enemy.y, opts.particles || 12);
  }
  if (!opts.noHeal) {
    for (const p of enemy.scene.getActivePlayers?.() || [enemy.scene.player]) {
      if (p && !p.isDead && p.hp < p.maxHp) p.hp = Math.min(p.hp + 1, p.maxHp);
    }
  }
  enemy.scene.tweens.add({
    targets: enemy,
    alpha: 0, scaleX: 0.3, scaleY: 0.3,
    duration: 320,
    onComplete: () => enemy.destroy(),
  });
}

/** Utility: fire a simple projectile sprite that damages the player on hit. */
export function fireProjectile(scene, x, y, vx, vy, texKey, opts = {}) {
  const tex = scene.textures.exists(texKey) ? texKey : 'particle_teal';
  const proj = scene.physics.add.image(x, y, tex).setDepth(4);
  proj.body.allowGravity = !!opts.gravity;
  proj.setVelocity(vx, vy);
  proj.damage = opts.damage || 1;
  const lifespan = opts.lifespan || 2400;
  const onHit = (player) => {
    if (proj._spent) return; proj._spent = true;
    if (player.takeDamage) player.takeDamage(proj.damage, proj.x);
    proj.destroy();
  };
  const players = scene.getActivePlayers?.() || [scene.player];
  for (const p of players) {
    scene.physics.add.overlap(p, proj, onHit);
  }
  if (scene.levelManager?.wallLayer) {
    scene.physics.add.collider(proj, scene.levelManager.wallLayer, () => proj.destroy());
  }
  scene.time.delayedCall(lifespan, () => { if (proj.active) proj.destroy(); });
  return proj;
}
