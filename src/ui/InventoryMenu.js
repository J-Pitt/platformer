import * as Phaser from 'phaser';
import { WEAPONS, CONSUMABLES } from '../systems/Inventory.js';
import { rooms } from '../level/rooms.js';

/**
 * Codex / tome overlay. Each tab is a "page"; flipping pages is driven by
 * left/right (d-pad / WASD / arrows) or the shoulder buttons L1/R1 on a
 * gamepad (and [ / ] on the keyboard).
 *
 * Pages: Arsenal · Items · Map · Lore · Stats
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

    // Consume the same edge that opened us so tick() on the opening frame
    // doesn't immediately close the menu.
    this._inputGracePeriodMs = 0;
  }

  open() {
    if (this.visible) return;
    this.visible = true;
    this.activeTab = 0;
    this._cursor = 0;
    // Suppress close-on-menuPressed / cancelPressed for a few ms so the
    // button press that opened us doesn't instantly dismiss us.
    this._inputGracePeriodMs = 160;
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

    // Deep scrim
    this.elements.push(this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x04020a, 0.82)
      .setScrollFactor(0).setDepth(280));

    const panelW = Math.min(cam.width - 40, 720);
    const panelH = Math.min(cam.height - 40, 460);

    // Codex-style panel: warm parchment-dark with amber border + a subtle
    // inner glow band.
    this.elements.push(this.scene.add.rectangle(cx, cy, panelW + 6, panelH + 6, 0xc89c5a, 0.55)
      .setScrollFactor(0).setDepth(280));
    this.elements.push(this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1a1208, 0.98)
      .setScrollFactor(0).setDepth(281));
    this.elements.push(this.scene.add.rectangle(cx, cy - panelH / 2 + 50, panelW - 20, 1, 0xc89c5a, 0.35)
      .setScrollFactor(0).setDepth(282));

    // Decorative corner flourishes
    const cornerColor = 0xc89c5a;
    const cornerOffsetX = panelW / 2 - 14;
    const cornerOffsetY = panelH / 2 - 14;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        this.elements.push(this.scene.add.rectangle(cx + sx * cornerOffsetX, cy + sy * cornerOffsetY, 16, 2, cornerColor, 0.85)
          .setScrollFactor(0).setDepth(283));
        this.elements.push(this.scene.add.rectangle(cx + sx * cornerOffsetX, cy + sy * cornerOffsetY, 2, 16, cornerColor, 0.85)
          .setScrollFactor(0).setDepth(283));
      }
    }

    // Header: CODEX title + owner subtitle
    this.elements.push(this.scene.add.text(cx, cy - panelH / 2 + 22, 'CODEX', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffd48a',
      stroke: '#000', strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284));

    const name = this.scene.savedPlayerName || 'Traveler';
    this.elements.push(this.scene.add.text(cx, cy - panelH / 2 + 44,
      `Chronicles of ${name}`, {
        fontSize: '10px', fontFamily: 'monospace', color: '#a68660',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(284));

    // Coin tally, top-right bookplate
    this.elements.push(this.scene.add.text(cx + panelW / 2 - 16, cy - panelH / 2 + 22,
      `⛁ ${this.scene.player.coins}`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffc840',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(284));

    // Page navigation strip: ◀  PAGE TITLE  ▶  with chapter name + dots.
    const navY = cy - panelH / 2 + 74;

    this.leftArrow = this.scene.add.text(cx - panelW / 2 + 28, navY, '◀', {
      fontSize: '20px', fontFamily: 'monospace', color: '#a68660',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284)
      .setInteractive({ useHandCursor: true });
    this.leftArrow.on('pointerdown', () => this._flipPage(-1));
    this.elements.push(this.leftArrow);

    this.rightArrow = this.scene.add.text(cx + panelW / 2 - 28, navY, '▶', {
      fontSize: '20px', fontFamily: 'monospace', color: '#a68660',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284)
      .setInteractive({ useHandCursor: true });
    this.rightArrow.on('pointerdown', () => this._flipPage(1));
    this.elements.push(this.rightArrow);

    // Big current chapter heading.
    this.pageHeading = this.scene.add.text(cx, navY, '', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffd48a',
      stroke: '#000', strokeThickness: 4,
      letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284);
    this.elements.push(this.pageHeading);

    // Tiny dots indicating page position (below heading).
    this.pageDots = [];
    const dotY = navY + 18;
    const dotGap = 14;
    const dotsTotal = this.tabs.length;
    const dotStart = cx - ((dotsTotal - 1) * dotGap) / 2;
    for (let i = 0; i < dotsTotal; i++) {
      const dot = this.scene.add.rectangle(dotStart + i * dotGap, dotY, 8, 8, 0xc89c5a, 0.4)
        .setScrollFactor(0).setDepth(284)
        .setInteractive({ useHandCursor: true });
      dot.on('pointerdown', () => this._setTab(i));
      this.pageDots.push(dot);
      this.elements.push(dot);
    }

    // Bottom ribbon with hints, laid out in two lines for clarity.
    this.elements.push(this.scene.add.rectangle(cx, cy + panelH / 2 - 38, panelW - 20, 1, 0xc89c5a, 0.3)
      .setScrollFactor(0).setDepth(282));
    this.elements.push(this.scene.add.text(cx, cy + panelH / 2 - 24,
      'L1 · [   ◀ TURN PAGE ▶   ]  · R1', {
        fontSize: '10px', fontFamily: 'monospace', color: '#c89c5a',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(284));
    this.elements.push(this.scene.add.text(cx, cy + panelH / 2 - 12,
      '↑↓ · SELECT    A · ENTER · USE    B · ESC · CLOSE    START · CLOSE', {
        fontSize: '9px', fontFamily: 'monospace', color: '#7a6040',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(284));

    // Body area
    this._layout = { cx, cy, panelW, panelH, contentTop: dotY + 24 };
    this._renderBody();
    this._refreshPageChrome();
  }

  _refreshPageChrome() {
    if (!this.pageHeading) return;
    this.pageHeading.setText(this.tabs[this.activeTab].toUpperCase());
    for (let i = 0; i < this.pageDots.length; i++) {
      const dot = this.pageDots[i];
      if (!dot) continue;
      if (i === this.activeTab) {
        dot.setFillStyle(0xffd48a, 1);
        dot.setSize(10, 10);
      } else {
        dot.setFillStyle(0xc89c5a, 0.4);
        dot.setSize(8, 8);
      }
    }
  }

  _flipPage(delta) {
    const next = (this.activeTab + delta + this.tabs.length) % this.tabs.length;
    this._setTab(next, delta);
  }

  _setTab(i, direction = 0) {
    if (i < 0 || i >= this.tabs.length) return;
    if (i === this.activeTab && direction === 0) return;
    this.activeTab = i;
    this._cursor = 0;
    this._refreshPageChrome();

    // Page-turn animation: slide the body horizontally while swapping content.
    this._renderBody();
    if (direction !== 0 && this.bodyElements.length > 0) {
      const shift = direction * 28;
      for (const el of this.bodyElements) {
        if (!el || typeof el.x !== 'number') continue;
        const targetX = el.x;
        el.x -= shift;
        el.alpha = 0;
        this.scene.tweens.add({
          targets: el,
          x: targetX,
          alpha: 1,
          duration: 170,
          ease: 'Cubic.easeOut',
        });
      }
    }
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
    // Pointer-driven nav (page dots, arrows, weapon/item rows) is set up in
    // _build; continuous input (directional nav, confirm, close, page flip)
    // is driven from tick() via the InputManager edges. That single path
    // gives us consistent behavior across keyboard, gamepad, and touch, and
    // respects the post-open grace period.
    this._keyHandlers = [];
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

    // Decrement the open-grace period so the button that opened the menu
    // can't immediately close it again on the same / next frame.
    if (this._inputGracePeriodMs > 0) {
      const delta = this.scene.game?.loop?.delta ?? 16;
      this._inputGracePeriodMs = Math.max(0, this._inputGracePeriodMs - delta);
      // Swallow close-class inputs during grace period.
      if (input.menuPressed || input.cancelPressed) return;
    }

    if (input.cancelPressed || input.menuPressed) {
      this.close();
      if (this.scene.physics) this.scene.physics.resume();
      return;
    }
    // Page turn: shoulder buttons, [ / ] keys, or d-pad left/right.
    if (input.l1Pressed || input.navLeftPressed) {
      this._flipPage(-1);
      return;
    }
    if (input.r1Pressed || input.navRightPressed) {
      this._flipPage(1);
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
