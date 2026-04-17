import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';

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

/** Shared health bar + name plate for chapter-2 bosses. */
export function createBossHealthBar(boss, name, color = 0xcc44ff) {
  const scene = boss.scene;
  const cam = scene.cameras.main;
  const cx = cam.width / 2;
  const barW = 260;
  const barH = 12;
  const by = cam.height - 46;

  boss.nameText = scene.add.text(cx, by - 20, name, {
    fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
    stroke: '#000', strokeThickness: 4,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);
  boss.healthBarBg = scene.add.rectangle(cx, by, barW + 4, barH + 4, 0x1a0a2a, 0.9)
    .setScrollFactor(0).setDepth(100).setAlpha(0);
  boss.healthBar = scene.add.rectangle(cx - barW / 2, by, barW, barH, color, 0.95)
    .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

  scene.tweens.add({
    targets: [boss.nameText, boss.healthBarBg, boss.healthBar],
    alpha: 1, duration: 800,
  });
  boss._hpBarWidth = barW;
}

export function updateBossHealthBar(boss) {
  if (!boss.healthBar) return;
  const w = Math.max(0, (boss.hp / boss.maxHp) * (boss._hpBarWidth || 260));
  boss.healthBar.width = w;
}

export function destroyBossHealthBar(boss) {
  if (boss.healthBar) boss.healthBar.destroy();
  if (boss.healthBarBg) boss.healthBarBg.destroy();
  if (boss.nameText) boss.nameText.destroy();
}

/** Shared boss damage handler. Flash, knock back, clamp HP. */
export function damageBoss(boss, amount, slashDir, opts = {}) {
  if (boss.isDead) return;
  if (boss.intangible) return;
  boss.hp -= amount;
  boss.isHit = true;
  boss.hitCooldown = 260;
  if (typeof boss.setTint === 'function') {
    boss.setTint(0xffffff);
    boss.scene.time.delayedCall(90, () => { if (boss.active && boss.clearTint) boss.clearTint(); });
  }
  if (opts.knockback && boss.body) {
    const kbDir = { right: 1, left: -1 }[slashDir] || 0;
    boss.body.velocity.x = kbDir * opts.knockback;
  }
  updateBossHealthBar(boss);
  if (boss.hp <= 0) {
    if (typeof boss.die === 'function') boss.die();
  }
}

/** Shared boss death cleanup + world flag set + full player heal. */
export function bossDeath(boss, opts = {}) {
  boss.isDead = true;
  if (boss.body) {
    boss.body.velocity.set(0, 0);
    boss.body.allowGravity = false;
  }
  if (boss.scene.enemyDeathEmitter) {
    boss.scene.enemyDeathEmitter.emitParticleAt(boss.x, boss.y, opts.particles || 30);
  }
  shakeScene(boss.scene, 650, 0.02);
  const rid = boss.scene.levelManager?.currentRoomId;
  if (rid && boss.scene.gameState?.setBossDefeated) {
    boss.scene.gameState.setBossDefeated(`boss_${rid}`);
  }
  for (const p of boss.scene.getActivePlayers?.() || [boss.scene.player]) {
    if (p && !p.isDead) p.hp = p.maxHp;
  }
  boss.scene.tweens.add({
    targets: boss, alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 1100, ease: 'Power2',
    onComplete: () => {
      destroyBossHealthBar(boss);
      boss.destroy();
    },
  });
  if (opts.message) {
    const msg = boss.scene.add.text(boss.x, boss.y - 50, opts.message, {
      fontSize: '22px', fontFamily: 'monospace', color: opts.messageColor || '#ffd488',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    boss.scene.tweens.add({
      targets: msg, alpha: 0, y: msg.y - 90, duration: 2800, delay: 900,
      onComplete: () => msg.destroy(),
    });
  }
}
