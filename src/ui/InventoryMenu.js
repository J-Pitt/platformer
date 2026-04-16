import * as Phaser from 'phaser';
import { WEAPONS, CONSUMABLES } from '../systems/Inventory.js';
import { rooms } from '../level/rooms.js';

/**
 * Full-screen tabbed inventory / menu overlay.
 * Tabs: Arsenal · Items · Map · Lore · Stats
 * Opened / closed by GameScene when the menu input fires.
 */
export class InventoryMenu {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.tabs = ['Arsenal', 'Items', 'Map', 'Lore', 'Stats'];
    this.activeTab = 0;
    this.elements = [];
    this.bodyElements = [];
    this._keyHandlers = [];
    this._cursor = 0;
  }

  open() {
    if (this.visible) return;
    this.visible = true;
    this.activeTab = 0;
    this._cursor = 0;
    this._build();
    this._bindKeys();
  }

  close() {
    if (!this.visible) return;
    this.visible = false;
    this._unbindKeys();
    for (const el of this.elements) { if (el && el.destroy) el.destroy(); }
    this.elements = [];
    this.bodyElements = [];
  }

  toggle() { this.visible ? this.close() : this.open(); }

  _build() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const scrim = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x05030a, 0.85)
      .setScrollFactor(0).setDepth(280);
    this.elements.push(scrim);

    const panelW = Math.min(cam.width - 40, 720);
    const panelH = Math.min(cam.height - 40, 460);
    const panel = this.scene.add.rectangle(cx, cy, panelW, panelH, 0x0c0814, 0.97)
      .setScrollFactor(0).setDepth(281);
    const border = this.scene.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0x8866cc, 0.55)
      .setScrollFactor(0).setDepth(280);
    this.elements.push(panel, border);

    const title = this.scene.add.text(cx - panelW / 2 + 20, cy - panelH / 2 + 14, 'SANCTUM', {
      fontSize: '22px', fontFamily: 'monospace', color: '#d0b8ff',
      stroke: '#000', strokeThickness: 4,
    }).setScrollFactor(0).setDepth(283);
    this.elements.push(title);

    const name = this.scene.savedPlayerName || 'Traveler';
    const sub = this.scene.add.text(cx - panelW / 2 + 20, cy - panelH / 2 + 42, `${name}'s Belongings`, {
      fontSize: '11px', fontFamily: 'monospace', color: '#8a7aa0',
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(283);
    this.elements.push(sub);

    // Tab bar
    const tabY = cy - panelH / 2 + 76;
    this.tabLabels = [];
    this.tabs.forEach((name, i) => {
      const tx = cx - panelW / 2 + 28 + i * Math.min(130, (panelW - 60) / this.tabs.length);
      const t = this.scene.add.text(tx, tabY, name.toUpperCase(), {
        fontSize: '13px', fontFamily: 'monospace',
        color: i === this.activeTab ? '#ffe680' : '#6a5a80',
        stroke: '#000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(283).setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this._setTab(i));
      this.tabLabels.push(t);
      this.elements.push(t);
    });

    // Tab underline
    this.tabUnderline = this.scene.add.rectangle(0, tabY + 12, 12, 2, 0xffe680, 0.9)
      .setScrollFactor(0).setDepth(283);
    this.elements.push(this.tabUnderline);

    // Divider
    const div = this.scene.add.rectangle(cx, tabY + 22, panelW - 40, 1, 0x5a4870, 0.5)
      .setScrollFactor(0).setDepth(283);
    this.elements.push(div);

    // Footer hint (keyboard + gamepad)
    const footer = this.scene.add.text(cx, cy + panelH / 2 - 16,
      '[ ←/→  or  L/R : TABS   ·   ↑/↓ : SELECT   ·   ENTER  or  A : USE   ·   ESC / B / START : CLOSE ]', {
        fontSize: '10px', fontFamily: 'monospace', color: '#6a5a80',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(283);
    this.elements.push(footer);

    // Coin count in top-right
    const coinText = this.scene.add.text(cx + panelW / 2 - 20, cy - panelH / 2 + 20,
      `Coins · ${this.scene.player.coins}`, {
        fontSize: '13px', fontFamily: 'monospace', color: '#ffc840',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(283);
    this.elements.push(coinText);

    // Body
    this._layout = { cx, cy, panelW, panelH, contentTop: tabY + 34 };
    this._renderBody();
  }

  _setTab(i) {
    if (i < 0 || i >= this.tabs.length) return;
    this.activeTab = i;
    this._cursor = 0;
    for (let k = 0; k < this.tabLabels.length; k++) {
      this.tabLabels[k].setColor(k === i ? '#ffe680' : '#6a5a80');
    }
    if (this.tabUnderline && this.tabLabels[i]) {
      const lbl = this.tabLabels[i];
      this.tabUnderline.setPosition(lbl.x + lbl.width / 2, lbl.y + 14);
      this.tabUnderline.setSize(lbl.width + 6, 2);
    }
    this._renderBody();
  }

  _clearBody() {
    for (const el of this.bodyElements) { if (el && el.destroy) el.destroy(); }
    this.bodyElements = [];
  }

  _renderBody() {
    this._clearBody();
    const { cx, panelW, panelH, contentTop, cy } = this._layout;
    const left = cx - panelW / 2 + 24;
    const right = cx + panelW / 2 - 24;
    const bottom = cy + panelH / 2 - 40;

    switch (this.tabs[this.activeTab]) {
      case 'Arsenal': this._renderArsenal(left, right, contentTop, bottom); break;
      case 'Items': this._renderItems(left, right, contentTop, bottom); break;
      case 'Map': this._renderMap(left, right, contentTop, bottom); break;
      case 'Lore': this._renderLore(left, right, contentTop, bottom); break;
      case 'Stats': this._renderStats(left, right, contentTop, bottom); break;
    }
  }

  _renderArsenal(left, right, top, bottom) {
    const player = this.scene.player;
    const inv = player.inventory;
    const entries = Object.values(WEAPONS).filter(w => inv.ownsWeapon(w.id));

    this._addBodyText(left, top, 'MELEE ARSENAL', '#ffc86a');
    this._addBodyText(left, top + 16,
      'Tap a weapon to equip. The currently-equipped blade shapes every slash.',
      '#8a7aa0', 10);

    let y = top + 44;
    entries.forEach((w, idx) => {
      const selected = idx === this._cursor;
      const equipped = inv.activeWeaponId === w.id;
      const rowBg = this.scene.add.rectangle((left + right) / 2, y + 22,
        right - left, 44,
        selected ? 0x3a2a5a : 0x1a1224, selected ? 0.7 : 0.55)
        .setScrollFactor(0).setDepth(283)
        .setInteractive({ useHandCursor: true });
      rowBg.on('pointerdown', () => {
        this._cursor = idx;
        inv.setActiveWeapon(w.id);
        this._renderBody();
      });
      this.bodyElements.push(rowBg);

      if (this.scene.textures.exists(w.icon)) {
        const ic = this.scene.add.image(left + 22, y + 22, w.icon)
          .setScrollFactor(0).setDepth(284);
        this.bodyElements.push(ic);
      }

      const nameColor = equipped ? '#ffe680' : (selected ? '#d0c8ff' : '#cfc8e0');
      const nameT = this.scene.add.text(left + 44, y + 10, w.name, {
        fontSize: '14px', fontFamily: 'monospace', color: nameColor,
        stroke: '#000', strokeThickness: 3,
      }).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(nameT);

      const descT = this.scene.add.text(left + 44, y + 28,
        `DMG ${w.damage}  ·  Reach ${w.reach.toFixed(2)}  ·  CD ${w.cooldownMs}ms`, {
          fontSize: '10px', fontFamily: 'monospace', color: '#8a7aa0',
          stroke: '#000', strokeThickness: 2,
        }).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(descT);

      if (equipped) {
        const tag = this.scene.add.text(right - 8, y + 22, 'EQUIPPED', {
          fontSize: '11px', fontFamily: 'monospace', color: '#ffe680',
          stroke: '#000', strokeThickness: 3,
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(284);
        this.bodyElements.push(tag);
      }

      y += 52;
    });

    // Ranged
    y += 10;
    const hasD = inv.hasThrowingDaggers;
    const dRow = this.scene.add.rectangle((left + right) / 2, y + 16,
      right - left, 34, hasD ? 0x241a34 : 0x110a1a, hasD ? 0.55 : 0.35)
      .setScrollFactor(0).setDepth(283);
    this.bodyElements.push(dRow);

    if (this.scene.textures.exists('weapon_throwing_daggers')) {
      const dIc = this.scene.add.image(left + 22, y + 16, 'weapon_throwing_daggers')
        .setScrollFactor(0).setDepth(284);
      this.bodyElements.push(dIc);
    }
    const dName = this.scene.add.text(left + 44, y + 8,
      hasD ? `Throwing Daggers  (${inv.daggerAmmo}/${inv.daggerAmmoMax})` : 'Throwing Daggers — locked', {
        fontSize: '13px', fontFamily: 'monospace', color: hasD ? '#e0d8ff' : '#55456a',
        stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(284);
    this.bodyElements.push(dName);
    const dHint = this.scene.add.text(right - 8, y + 16,
      hasD ? 'PRESS G TO THROW' : 'Find or buy to unlock', {
        fontSize: '10px', fontFamily: 'monospace', color: '#8a7aa0',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(284);
    this.bodyElements.push(dHint);
  }

  _renderItems(left, right, top, bottom) {
    const player = this.scene.player;
    const inv = player.inventory;
    this._addBodyText(left, top, 'INVENTORY', '#a0ffc8');
    this._addBodyText(left, top + 16,
      'Consumables restore vitality between encounters. Press ENTER or click to use.',
      '#8a7aa0', 10);

    const ownedIds = this._ownedConsumableIds();
    let y = top + 44;
    let any = false;
    for (let i = 0; i < ownedIds.length; i++) {
      const id = ownedIds[i];
      const count = inv.consumableCount(id);
      if (count <= 0) continue;
      any = true;
      const selected = i === this._cursor;
      const c = CONSUMABLES[id];
      const rowBg = this.scene.add.rectangle((left + right) / 2, y + 22,
        right - left, 44,
        selected ? 0x2d4a24 : 0x1a2818, selected ? 0.72 : 0.55)
        .setScrollFactor(0).setDepth(283)
        .setInteractive({ useHandCursor: true });
      rowBg.on('pointerdown', () => {
        this._cursor = i;
        const used = inv.useConsumable(id);
        if (used) this._renderBody();
      });
      this.bodyElements.push(rowBg);
      if (this.scene.textures.exists(c.icon)) {
        const ic = this.scene.add.image(left + 22, y + 22, c.icon)
          .setScrollFactor(0).setDepth(284);
        this.bodyElements.push(ic);
      }
      const nameT = this.scene.add.text(left + 44, y + 10,
        `${c.name}  ×${count}`, {
          fontSize: '14px', fontFamily: 'monospace', color: '#cfe8d0',
          stroke: '#000', strokeThickness: 3,
        }).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(nameT);
      const desc = this.scene.add.text(left + 44, y + 28, c.desc, {
        fontSize: '10px', fontFamily: 'monospace', color: '#8aa090',
        stroke: '#000', strokeThickness: 2,
      }).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(desc);
      y += 52;
    }
    if (!any) {
      const empty = this.scene.add.text((left + right) / 2, top + 120,
        'No items yet. Merchants and secret shrines offer rare vials.', {
          fontSize: '12px', fontFamily: 'monospace', color: '#6a5a80',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(empty);
    }
  }

  _renderMap(left, right, top, bottom) {
    const player = this.scene.player;
    const lm = this.scene.levelManager;
    this._addBodyText(left, top, 'CARTOGRAPHY', '#88ccff');
    const visited = player.visitedRooms.size;
    const total = Object.keys(rooms).length;
    this._addBodyText(left, top + 16, `Rooms discovered: ${visited} / ${total}`, '#8a9ab0', 11);

    const desc = player.hasMap
      ? 'Press M on the world screen to view the full map.'
      : 'Find a Map Fragment to enable the world overlay (M).';
    this._addBodyText(left, top + 36, desc, '#8a7aa0', 10);

    // Mini dot map of visited rooms: simple grid
    const ids = Object.keys(rooms);
    const cols = 8;
    const cell = 20;
    const startX = left + 10;
    const startY = top + 64;
    ids.forEach((id, i) => {
      const cx = startX + (i % cols) * cell + cell / 2;
      const cy = startY + Math.floor(i / cols) * cell + cell / 2;
      const vis = player.visitedRooms.has(id);
      const cur = lm?.currentRoomId === id;
      const color = cur ? 0xffe680 : (vis ? 0x66ccff : 0x30303a);
      const dot = this.scene.add.rectangle(cx, cy, cell - 4, cell - 4, color, cur ? 1 : (vis ? 0.8 : 0.4))
        .setScrollFactor(0).setDepth(284);
      this.bodyElements.push(dot);
    });
  }

  _renderLore(left, right, top, bottom) {
    const inv = this.scene.player.inventory;
    this._addBodyText(left, top, 'LORE CODEX', '#d0b8ff');
    const entries = inv.getLoreEntries();
    this._addBodyText(left, top + 16, `Fragments recovered: ${entries.length}`, '#8a7aa0', 11);

    if (entries.length === 0) {
      const empty = this.scene.add.text((left + right) / 2, top + 100,
        'No fragments recovered. Look for floating tablets in the depths.', {
          fontSize: '12px', fontFamily: 'monospace', color: '#6a5a80',
          stroke: '#000', strokeThickness: 2, wordWrap: { width: right - left - 40 },
          align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(empty);
      return;
    }

    let y = top + 44;
    entries.forEach((entry) => {
      const panel = this.scene.add.rectangle((left + right) / 2, y + 22,
        right - left, 44, 0x180a28, 0.55)
        .setScrollFactor(0).setDepth(283);
      this.bodyElements.push(panel);
      const t = this.scene.add.text(left + 12, y + 8, '"' + (entry.text || '') + '"', {
        fontSize: '11px', fontFamily: 'monospace', color: '#d0b8ff',
        stroke: '#000', strokeThickness: 2,
        wordWrap: { width: right - left - 24 },
      }).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(t);
      y += Math.max(52, t.height + 18);
      if (y > bottom - 20) return;
    });
  }

  _renderStats(left, right, top, bottom) {
    const player = this.scene.player;
    this._addBodyText(left, top, 'STATUS', '#ffe0a0');
    const lines = [
      `HP: ${player.hp} / ${player.maxHp}`,
      `Coins: ${player.coins}`,
      `Rooms visited: ${player.visitedRooms.size}`,
      '',
      'ABILITIES:',
      `  Slash:        ${player.hasAbility('slash') ? 'YES' : '—'}`,
      `  Double Jump:  ${player.hasAbility('doubleJump') ? 'YES' : '—'}`,
      `  Wall Jump:    ${player.hasAbility('wallJump') ? 'YES' : '—'}`,
      `  Dash:         ${player.hasAbility('dash') ? 'YES' : '—'}`,
      `  Spear:        ${player.hasAbility('spear') ? 'YES' : '—'}`,
      `  Kick:         ${player.hasAbility('kick') ? 'YES' : '—'}`,
      `  Map:          ${player.hasAbility('map') ? 'YES' : '—'}`,
    ];
    const t = this.scene.add.text(left, top + 28, lines.join('\n'), {
      fontSize: '12px', fontFamily: 'monospace', color: '#e0d4b8',
      stroke: '#000', strokeThickness: 2, lineSpacing: 4,
    }).setScrollFactor(0).setDepth(284);
    this.bodyElements.push(t);
  }

  _addBodyText(x, y, text, color = '#d0d0d0', size = 13) {
    const t = this.scene.add.text(x, y, text, {
      fontSize: `${size}px`, fontFamily: 'monospace', color,
      stroke: '#000', strokeThickness: 2,
    }).setScrollFactor(0).setDepth(284);
    this.bodyElements.push(t);
    return t;
  }

  _bindKeys() {
    const kb = this.scene.input.keyboard;
    const handlers = [];
    const on = (evt, fn) => { kb.on(evt, fn); handlers.push([evt, fn]); };

    on('keydown-LEFT', () => this._setTab((this.activeTab - 1 + this.tabs.length) % this.tabs.length));
    on('keydown-RIGHT', () => this._setTab((this.activeTab + 1) % this.tabs.length));
    on('keydown-A', () => this._setTab((this.activeTab - 1 + this.tabs.length) % this.tabs.length));
    on('keydown-D', () => this._setTab((this.activeTab + 1) % this.tabs.length));

    on('keydown-UP', () => this._moveCursor(-1));
    on('keydown-DOWN', () => this._moveCursor(1));
    on('keydown-W', () => this._moveCursor(-1));
    on('keydown-S', () => this._moveCursor(1));

    on('keydown-ENTER', () => this._activate());
    on('keydown-E', () => this._activate());
    on('keydown-SPACE', () => this._activate());

    on('keydown-ESC', () => this.close());
    on('keydown-I', () => this.close());
    on('keydown-TAB', () => this.close());

    this._keyHandlers = handlers;
  }

  _unbindKeys() {
    const kb = this.scene.input.keyboard;
    for (const [evt, fn] of this._keyHandlers) kb.off(evt, fn);
    this._keyHandlers = [];
  }

  /**
   * Called from GameScene.update every frame while the menu is visible.
   * Reads edge-detected state (includes gamepad) for fully pad-driven nav.
   */
  tick(input) {
    if (!this.visible || !input) return;

    if (input.cancelPressed || input.menuPressed) {
      this.close();
      if (this.scene.physics) this.scene.physics.resume();
      return;
    }
    if (input.navLeftPressed) {
      this._setTab((this.activeTab - 1 + this.tabs.length) % this.tabs.length);
      return;
    }
    if (input.navRightPressed) {
      this._setTab((this.activeTab + 1) % this.tabs.length);
      return;
    }
    if (input.navUpPressed) { this._moveCursor(-1); return; }
    if (input.navDownPressed) { this._moveCursor(1); return; }
    if (input.confirmPressed) { this._activate(); return; }
  }

  _ownedConsumableIds() {
    const inv = this.scene.player.inventory;
    return Object.keys(CONSUMABLES).filter((id) => inv.consumableCount(id) > 0);
  }

  _moveCursor(delta) {
    const tab = this.tabs[this.activeTab];
    const inv = this.scene.player.inventory;
    if (tab === 'Arsenal') {
      const list = Object.values(WEAPONS).filter(w => inv.ownsWeapon(w.id));
      if (list.length === 0) return;
      this._cursor = (this._cursor + delta + list.length) % list.length;
      this._renderBody();
    } else if (tab === 'Items') {
      const list = this._ownedConsumableIds();
      if (list.length === 0) return;
      this._cursor = (this._cursor + delta + list.length) % list.length;
      this._renderBody();
    }
  }

  _activate() {
    const inv = this.scene.player.inventory;
    const tab = this.tabs[this.activeTab];
    if (tab === 'Arsenal') {
      const list = Object.values(WEAPONS).filter(w => inv.ownsWeapon(w.id));
      const w = list[this._cursor];
      if (w) {
        inv.setActiveWeapon(w.id);
        this._renderBody();
      }
    } else if (tab === 'Items') {
      const list = this._ownedConsumableIds();
      const id = list[this._cursor];
      if (id && inv.useConsumable(id)) {
        this._cursor = Math.min(this._cursor, Math.max(0, this._ownedConsumableIds().length - 1));
        this._renderBody();
      }
    }
  }
}
