import { MapOverlay } from './MapOverlay.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.healthOrbs = [];
    this.p2HealthOrbs = [];
    this.dashBarBg = null;
    this.dashBarFill = null;
    this.mapIcon = null;
    this.mapOverlay = new MapOverlay(scene);
    this.create();
    this.setupMapInput();
  }

  create() {
    const player = this.scene.player;
    const cam = this.scene.cameras.main;

    for (let i = 0; i < player.maxHp; i++) {
      const full = this.scene.add.image(30 + i * 28, 30, 'health_orb')
        .setScrollFactor(0).setDepth(100);
      const empty = this.scene.add.image(30 + i * 28, 30, 'health_orb_empty')
        .setScrollFactor(0).setDepth(99);
      this.healthOrbs.push({ full, empty });
    }

    if (this.scene.player2) {
      const p2 = this.scene.player2;
      for (let i = 0; i < p2.maxHp; i++) {
        const rx = cam.width - 30 - i * 28;
        const full = this.scene.add.image(rx, 30, 'health_orb')
          .setScrollFactor(0).setDepth(100).setTint(0x6688ff);
        const empty = this.scene.add.image(rx, 30, 'health_orb_empty')
          .setScrollFactor(0).setDepth(99);
        this.p2HealthOrbs.push({ full, empty });
      }

      this.scene.add.text(cam.width - 30, 48, 'P2', {
        fontSize: '10px', fontFamily: 'monospace', color: '#6688ff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

      this.scene.add.text(30, 48, 'P1', {
        fontSize: '10px', fontFamily: 'monospace', color: '#44ff66',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(100);
    }

    this.dashBarBg = this.scene.add.image(30, 56, 'dash_bar_empty')
      .setScrollFactor(0).setDepth(100).setOrigin(0, 0.5).setVisible(false);

    this.dashBarFill = this.scene.add.image(30, 56, 'dash_bar_full')
      .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5).setVisible(false);

    const mapY = this.scene.player2 ? 66 : 30;
    this.mapIcon = this.scene.add.image(cam.width - 30, mapY, 'map_icon')
      .setScrollFactor(0).setDepth(100).setScale(1.4).setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.mapIcon.on('pointerdown', () => {
      this.mapOverlay.toggle();
    });
  }

  setupMapInput() {
    this.scene.input.keyboard.on('keydown-M', () => {
      if (!this.scene.player.hasMap) return;
      this.mapOverlay.toggle();
    });
  }

  update() {
    const player = this.scene.player;

    for (let i = 0; i < this.healthOrbs.length; i++) {
      this.healthOrbs[i].full.setVisible(i < player.hp);
    }

    if (this.scene.player2) {
      const p2 = this.scene.player2;
      for (let i = 0; i < this.p2HealthOrbs.length; i++) {
        this.p2HealthOrbs[i].full.setVisible(i < p2.hp);
      }
    }

    if (player.hasAbility('dash')) {
      this.dashBarBg.setVisible(true);
      this.dashBarFill.setVisible(true);
      const pct = player.movement.dashCooldownPercent;
      this.dashBarFill.setScale(pct, 1);
      this.dashBarFill.setAlpha(pct >= 1 ? 1 : 0.5);
    }

    if (player.hasMap && this.mapIcon) {
      this.mapIcon.setVisible(true);
    }
  }

  refresh() {
    this.update();
  }
}
