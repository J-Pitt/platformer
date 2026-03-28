import { MapOverlay } from './MapOverlay.js';
import { rooms } from '../level/rooms.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.healthOrbs = [];
    this.p2HealthOrbs = [];
    this.dashBarBg = null;
    this.dashBarFill = null;
    this.mapIcon = null;
    this.mapOverlay = new MapOverlay(scene);
    this.coinIcon = null;
    this.coinText = null;
    this.nameLabel = null;
    this.create();
    this.setupMapInput();
  }

  create() {
    const player = this.scene.player;
    const cam = this.scene.cameras.main;

    if (!this.scene.online && !this.scene.coopMode && this.scene.savedPlayerName) {
      this.nameLabel = this.scene.add.text(cam.width / 2, 10, this.scene.savedPlayerName, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#6a5838',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
    }

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

    this.coinIcon = this.scene.add.image(30, 74, 'coin_icon')
      .setScrollFactor(0).setDepth(100).setScale(1.2);
    this.coinText = this.scene.add.text(46, 74, '0', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffc840',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(100);
  }

  setupMapInput() {
    this._mTaps = [];
    this.scene.input.keyboard.on('keydown-M', () => {
      const now = Date.now();
      this._mTaps.push(now);
      // Keep only taps within last 800ms
      this._mTaps = this._mTaps.filter(t => now - t < 1500);

      if (this._mTaps.length >= 3) {
        this._mTaps = [];
        this.revealFullMap();
        return;
      }

      if (!this.scene.player.hasMap) return;
      this.mapOverlay.toggle();
    });
  }

  revealFullMap() {
    const player = this.scene.player;
    const roomIds = Object.keys(rooms);
    for (const id of roomIds) {
      player.visitedRooms.add(id);
    }
    if (!player.hasMap) player.hasMap = true;
    if (this.mapOverlay.visible) {
      this.mapOverlay.rebuild();
    } else {
      this.mapOverlay.show();
    }
    const cam = this.scene.cameras.main;
    const txt = this.scene.add.text(cam.width / 2, cam.height / 2 - 60, 'FULL MAP REVEALED', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffcc00',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400);
    this.scene.tweens.add({
      targets: txt, alpha: 0, y: txt.y - 20, duration: 2000, delay: 1000,
      onComplete: () => txt.destroy(),
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

    if (this.coinText) {
      this.coinText.setText(`${player.coins}`);
    }
  }

  refresh() {
    this.update();
  }
}
