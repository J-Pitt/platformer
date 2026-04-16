import * as Phaser from 'phaser';
import { getFirstConnectedGamepad, pollAnyGamepadActionEdge } from '../utils/menuRemoteInput.js';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;
    const cx = W / 2;
    const cy = H / 2;

    this._elements = [];
    this._skipped = false;
    this._transitioning = false;
    this._introGpBtnPrev = [];

    const bg = this.add.rectangle(cx, cy, W, H, 0x000000);
    this._elements.push(bg);

    // --- BEAT 1 (0–5s): The fallen kingdom ---
    const beat1Bg = this.add.rectangle(cx, cy, W, H, 0x020108).setAlpha(0);
    this._elements.push(beat1Bg);

    if (this.textures.exists('bg_far_cavern')) {
      const far = this.add.image(cx, cy, 'bg_far_cavern').setAlpha(0).setScale(1);
      this._elements.push(far);
      this.tweens.add({ targets: far, alpha: 0.3, duration: 2000, delay: 500 });
      this.tweens.add({ targets: far, alpha: 0, duration: 1500, delay: 4500 });
    }

    const t1a = this.makeText(cx, cy - 40,
      'In the depths beneath the world,\na king once ruled from a throne of bone.',
      { fontSize: '18px', color: '#8a7858', align: 'center' });
    this.fadeText(t1a, 600, 4000);

    const t1b = this.makeText(cx, cy + 30,
      'His crown burned with emerald fire.\nHis blade cut through the dark.',
      { fontSize: '15px', color: '#6a5838', align: 'center' });
    this.fadeText(t1b, 1800, 4000);

    // Particle dust floating
    const dustConfig = {
      x: { min: 0, max: W }, y: { min: 0, max: H },
      lifespan: 4000, quantity: 1, frequency: 200,
      alpha: { start: 0.25, end: 0 },
      speedX: { min: -5, max: 5 }, speedY: { min: -15, max: -5 },
      scale: { start: 1, end: 0.3 }, blendMode: 'ADD',
    };
    let dustEmitter;
    if (this.textures.exists('particle_teal')) {
      dustEmitter = this.add.particles(0, 0, 'particle_teal', dustConfig);
      dustEmitter.setDepth(5);
      this._elements.push(dustEmitter);
    }

    // --- BEAT 2 (5–10s): The fall ---
    const t2a = this.makeText(cx, cy - 40,
      'Then the abyss swallowed everything.',
      { fontSize: '20px', color: '#aa4444', align: 'center' });
    this.fadeText(t2a, 5500, 4000);

    const t2b = this.makeText(cx, cy + 10,
      'His army fell. His weapons scattered.\nThe throne was consumed by darkness.',
      { fontSize: '15px', color: '#884444', align: 'center' });
    this.fadeText(t2b, 6800, 4000);

    // Red flash at beat 2 start
    this.time.delayedCall(5300, () => {
      if (this._skipped) return;
      this.cameras.main.flash(600, 60, 10, 10);
    });

    // Crawlers & enemies silhouette
    if (this.textures.exists('crawler')) {
      for (let i = 0; i < 5; i++) {
        const ex = 120 + i * 180;
        const ey = H - 100 + (i % 3) * 20;
        const enemy = this.add.image(ex, ey, 'crawler').setAlpha(0).setScale(1.5).setTint(0x440000);
        this._elements.push(enemy);
        this.tweens.add({ targets: enemy, alpha: 0.4, duration: 800, delay: 6000 + i * 300 });
        this.tweens.add({ targets: enemy, alpha: 0, duration: 1000, delay: 9500 });
      }
    }

    // --- BEAT 3 (10–16s): Awakening ---
    if (this.textures.exists('bg_far_fungal')) {
      const mid = this.add.image(cx, cy, 'bg_far_fungal').setAlpha(0);
      this._elements.push(mid);
      this.tweens.add({ targets: mid, alpha: 0.25, duration: 2000, delay: 10500 });
      this.tweens.add({ targets: mid, alpha: 0, duration: 1500, delay: 15000 });
    }

    const t3a = this.makeText(cx, cy - 50,
      'Ages pass...',
      { fontSize: '22px', color: '#4a6a5a', align: 'center' });
    this.fadeText(t3a, 10500, 2200);

    const t3b = this.makeText(cx, cy - 10,
      'Something stirs in the ruins.',
      { fontSize: '18px', color: '#44ff66', align: 'center' });
    this.fadeText(t3b, 12000, 3500);

    // Player silhouette awakening
    if (this.textures.exists('player_idle')) {
      const king = this.add.image(cx, cy + 60, 'player_idle').setAlpha(0).setScale(3).setOrigin(0.5);
      this._elements.push(king);
      this.tweens.add({
        targets: king, alpha: 1, duration: 2000, delay: 12500, ease: 'Sine.easeIn',
      });
      this.tweens.add({
        targets: king, y: cy + 50, duration: 3000, delay: 12500, ease: 'Sine.easeInOut', yoyo: true,
      });
      this.tweens.add({ targets: king, alpha: 0, duration: 1000, delay: 16500 });
    }

    // Green eye-glow flash
    this.time.delayedCall(13000, () => {
      if (this._skipped) return;
      this.cameras.main.flash(300, 20, 80, 30);
    });

    const t3c = this.makeText(cx, cy + 120,
      'The Bone King rises.',
      { fontSize: '16px', color: '#40ffd8', align: 'center' });
    this.fadeText(t3c, 13500, 3000);

    // --- BEAT 4 (16–20s): The call ---
    const t4a = this.makeText(cx, cy - 30,
      'Reclaim your blade.\nReclaim your power.',
      { fontSize: '20px', color: '#d4c8a8', align: 'center' });
    this.fadeText(t4a, 16800, 3000);

    const t4b = this.makeText(cx, cy + 40,
      'The Bone Throne awaits.',
      { fontSize: '26px', color: '#44ff66', align: 'center' });
    this.fadeText(t4b, 18000, 2500);

    // Crown sparkle
    if (this.textures.exists('particle_teal')) {
      this.time.delayedCall(18500, () => {
        if (this._skipped) return;
        for (let i = 0; i < 12; i++) {
          const spark = this.add.image(
            cx + Phaser.Math.Between(-80, 80),
            cy + Phaser.Math.Between(-40, 40),
            'particle_teal',
          ).setAlpha(0).setScale(2).setBlendMode('ADD');
          this._elements.push(spark);
          this.tweens.add({
            targets: spark, alpha: 0.7, scaleX: 3, scaleY: 3,
            duration: 400, delay: i * 60, yoyo: true,
            onComplete: () => spark.destroy(),
          });
        }
      });
    }

    // --- Transition to title (20s) ---
    this.time.delayedCall(20500, () => {
      if (this._skipped) return;
      this.goToTitle();
    });

    // Skip prompt
    const skip = this.makeText(cx, H - 30,
      'Press any key or tap to skip',
      { fontSize: '11px', color: '#3a3828', align: 'center' });
    skip.setAlpha(0.5);
    this.tweens.add({ targets: skip, alpha: 0.2, duration: 1200, yoyo: true, repeat: -1 });

    this.time.delayedCall(300, () => {
      this.input.keyboard.once('keydown', () => this.skipIntro());
      this.input.once('pointerdown', () => this.skipIntro());
      if (this.input.gamepad) {
        this.input.gamepad.once('down', () => this.skipIntro());
      }
    });
  }

  update() {
    if (this._skipped || this._transitioning) return;
    const pad = getFirstConnectedGamepad();
    if (!pad) {
      this._introGpBtnPrev = [];
      return;
    }
    if (pollAnyGamepadActionEdge(pad, this._introGpBtnPrev)) {
      this.skipIntro();
    }
  }

  makeText(x, y, content, style) {
    const txt = this.add.text(x, y, content, {
      fontFamily: 'monospace',
      stroke: '#000',
      strokeThickness: 3,
      lineSpacing: 6,
      ...style,
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
    this._elements.push(txt);
    return txt;
  }

  fadeText(txt, delay, holdMs) {
    this.tweens.add({
      targets: txt, alpha: 1, y: txt.y - 6,
      duration: 800, delay, ease: 'Power2',
    });
    this.tweens.add({
      targets: txt, alpha: 0,
      duration: 600, delay: delay + holdMs, ease: 'Power2',
    });
  }

  skipIntro() {
    if (this._skipped) return;
    this._skipped = true;
    this.goToTitle();
  }

  goToTitle() {
    if (this._transitioning) return;
    this._transitioning = true;

    this.tweens.killAll();
    this.time.removeAllEvents();

    const cam = this.cameras.main;
    const curtain = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000000)
      .setAlpha(0).setScrollFactor(0).setDepth(999);

    this.tweens.add({
      targets: curtain,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        this.scene.start('TitleScene');
      },
    });
  }
}
