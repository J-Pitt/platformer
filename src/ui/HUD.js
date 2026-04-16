import { MapOverlay } from './MapOverlay.js';
import { rooms } from '../level/rooms.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;
    this.healthOrbs = [];
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

    if (this.scene.savedPlayerName) {
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

    this.dashBarBg = this.scene.add.image(30, 56, 'dash_bar_empty')
      .setScrollFactor(0).setDepth(100).setOrigin(0, 0.5).setVisible(false);

    this.dashBarFill = this.scene.add.image(30, 56, 'dash_bar_full')
      .setScrollFactor(0).setDepth(101).setOrigin(0, 0.5).setVisible(false);

    this.mapIcon = this.scene.add.image(cam.width - 30, 30, 'map_icon')
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

    // Active weapon badge (bottom-left)
    this.weaponBadgeBg = this.scene.add.rectangle(26, cam.height - 60, 40, 40, 0x0c0814, 0.9)
      .setScrollFactor(0).setDepth(100);
    this.weaponBadgeBorder = this.scene.add.rectangle(26, cam.height - 60, 42, 42, 0x8866cc, 0.55)
      .setScrollFactor(0).setDepth(99);
    this.weaponBadgeIcon = this.scene.add.image(26, cam.height - 60, 'weapon_rusted_blade')
      .setScrollFactor(0).setDepth(101);
    this.weaponBadgeText = this.scene.add.text(50, cam.height - 60, 'Rusted Blade', {
      fontSize: '11px', fontFamily: 'monospace', color: '#d0c8e0',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.daggerAmmoText = this.scene.add.text(50, cam.height - 48, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#d4c8a8',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    const menuHint = this.scene.add.text(26, cam.height - 38,
      '[I / START] Menu', {
        fontSize: '9px', fontFamily: 'monospace', color: '#6a5a80',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(101);
    this.menuHint = menuHint;
    this.refreshWeaponBadge();

    /** Playtest: show `rooms.js` id + human name for room-by-room notes. */
    this._roomLabelKey = '';
    this.roomDebugLabel = this.scene.add.text(8, 92, '', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#9a8a68',
      stroke: '#000',
      strokeThickness: 3,
      lineSpacing: 3,
      wordWrap: { width: Math.min(240, cam.width - 120) },
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(100);
  }

  setupMapInput() {
    this._mTaps = [];
    this.scene.input.keyboard.on('keydown-M', () => {
      const now = Date.now();
      this._mTaps.push(now);
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

    const lm = this.scene.levelManager;
    const rid = lm?.currentRoomId || '—';
    const rname = lm?.currentRoom?.name || '';
    const key = `${rid}\n${rname}`;
    if (key !== this._roomLabelKey && this.roomDebugLabel) {
      this._roomLabelKey = key;
      this.roomDebugLabel.setText(rname ? `${rid}\n${rname}` : rid);
    }
  }

  refresh() {
    this.update();
    this.refreshWeaponBadge();
  }

  refreshWeaponBadge() {
    const p = this.scene.player;
    if (!p || !p.inventory) return;
    const w = p.inventory.activeWeapon();
    if (this.weaponBadgeIcon && w && this.scene.textures.exists(w.icon)) {
      this.weaponBadgeIcon.setTexture(w.icon);
    }
    if (this.weaponBadgeText) this.weaponBadgeText.setText(w?.name || 'Unarmed');
    if (this.daggerAmmoText) {
      if (p.inventory.hasThrowingDaggers) {
        this.daggerAmmoText.setText(`[G] Daggers ${p.inventory.daggerAmmo}/${p.inventory.daggerAmmoMax}`);
      } else {
        this.daggerAmmoText.setText('');
      }
    }
  }

  rebuildHealthOrbs() {
    const player = this.scene.player;
    for (const o of this.healthOrbs) {
      if (o.full?.destroy) o.full.destroy();
      if (o.empty?.destroy) o.empty.destroy();
    }
    this.healthOrbs = [];
    for (let i = 0; i < player.maxHp; i++) {
      const full = this.scene.add.image(30 + i * 28, 30, 'health_orb')
        .setScrollFactor(0).setDepth(100);
      const empty = this.scene.add.image(30 + i * 28, 30, 'health_orb_empty')
        .setScrollFactor(0).setDepth(99);
      this.healthOrbs.push({ full, empty });
    }
  }
}
