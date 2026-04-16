import * as Phaser from 'phaser';
import { WEAPONS, CONSUMABLES } from '../systems/Inventory.js';
import { rooms, TILE_SIZE } from '../level/rooms.js';
import {
  ROOM_META,
  CONNECTIONS,
  ZOOM_LEVELS,
  PIXEL_PER_TILE_BASE,
  computeRoomPositions,
  getTotalBounds,
} from './MapOverlay.js';

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
    // Kill any in-flight page-flip tweens so they can't re-show body
    // elements after we destroy them.
    if (this.scene && this.scene.tweens) {
      for (const el of this.bodyElements) {
        if (el) this.scene.tweens.killTweensOf(el);
      }
      for (const el of this.elements) {
        if (el) this.scene.tweens.killTweensOf(el);
      }
    }
    // Previously only `this.elements` were destroyed, so the last page's
    // body text / rows stayed alive as orphan game objects after closing.
    for (const el of this.bodyElements) { if (el && el.destroy) el.destroy(); }
    for (const el of this.elements) { if (el && el.destroy) el.destroy(); }
    this.elements = [];
    this.bodyElements = [];
    this.pageHeading = null;
    this.pageDots = [];
    this.leftArrow = null;
    this.rightArrow = null;
  }

  toggle() { this.visible ? this.close() : this.open(); }

  _build() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    const goldLight = 0xe6c069;
    const goldDark = 0x8a5a1a;
    const leatherDark = 0x2a1408;
    const leatherMid = 0x3c1e0c;

    // Full-screen dim
    this.elements.push(this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x04020a, 0.85)
      .setScrollFactor(0).setDepth(280));

    const panelW = Math.min(cam.width - 40, 720);
    const panelH = Math.min(cam.height - 40, 460);

    // Drop shadow beneath the book
    this.elements.push(this.scene.add.rectangle(cx + 6, cy + 10, panelW + 24, panelH + 24, 0x000000, 0.55)
      .setScrollFactor(0).setDepth(279));

    // Tooled leather cover: dark brown base, a slightly lighter mid slab
    // on top, then a parchment page sunken into the center.
    this.elements.push(this.scene.add.rectangle(cx, cy, panelW + 18, panelH + 18, leatherDark, 1)
      .setScrollFactor(0).setDepth(280));
    this.elements.push(this.scene.add.rectangle(cx, cy, panelW + 10, panelH + 10, leatherMid, 1)
      .setScrollFactor(0).setDepth(280));

    // Leather grain (thin darker bands across the cover)
    for (let i = 0; i < 10; i++) {
      const gy = cy - panelH / 2 - 4 + (i + 1) * ((panelH + 8) / 11);
      this.elements.push(this.scene.add.rectangle(cx, gy, panelW + 8, 1, 0x0e0604, 0.45)
        .setScrollFactor(0).setDepth(280));
    }

    // Gold tooling border (outer + inner double line)
    const outerPadX = panelW / 2 + 8;
    const outerPadY = panelH / 2 + 8;
    const addRect = (x, y, w, h, color, alpha = 1, depth = 281) => {
      this.elements.push(this.scene.add.rectangle(x, y, w, h, color, alpha)
        .setScrollFactor(0).setDepth(depth));
    };
    addRect(cx, cy - outerPadY, panelW + 14, 1, goldLight, 0.95);
    addRect(cx, cy + outerPadY, panelW + 14, 1, goldLight, 0.95);
    addRect(cx - outerPadX, cy, 1, panelH + 16, goldLight, 0.95);
    addRect(cx + outerPadX, cy, 1, panelH + 16, goldLight, 0.95);
    addRect(cx, cy - outerPadY + 4, panelW + 2, 1, goldDark, 0.7);
    addRect(cx, cy + outerPadY - 4, panelW + 2, 1, goldDark, 0.7);
    addRect(cx - outerPadX + 4, cy, 1, panelH + 4, goldDark, 0.7);
    addRect(cx + outerPadX - 4, cy, 1, panelH + 4, goldDark, 0.7);

    // Inset page (the "parchment" — still dark brown so existing warm
    // text reads, but warmer and a touch lighter than before).
    this.elements.push(this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1c1108, 0.99)
      .setScrollFactor(0).setDepth(281));
    // Parchment warm tint (faint brown wash on top)
    this.elements.push(this.scene.add.rectangle(cx, cy, panelW, panelH, 0x4a2a10, 0.08)
      .setScrollFactor(0).setDepth(281));
    // Vignette corners — darker triangles to simulate aged page corners.
    const cornerG = this.scene.add.graphics().setScrollFactor(0).setDepth(282);
    cornerG.fillStyle(0x000000, 0.35);
    const cSize = 60;
    const L = cx - panelW / 2;
    const R = cx + panelW / 2;
    const T = cy - panelH / 2;
    const B = cy + panelH / 2;
    cornerG.fillTriangle(L, T,         L + cSize, T, L, T + cSize); // TL
    cornerG.fillTriangle(R, T,         R - cSize, T, R, T + cSize); // TR
    cornerG.fillTriangle(L, B,         L + cSize, B, L, B - cSize); // BL
    cornerG.fillTriangle(R, B,         R - cSize, B, R, B - cSize); // BR
    this.elements.push(cornerG);

    // Faint ruled lines across the page (book feel)
    const ruledStart = cy - panelH / 2 + 104;
    const ruledEnd = cy + panelH / 2 - 54;
    for (let ly = ruledStart; ly < ruledEnd; ly += 22) {
      this.elements.push(this.scene.add.rectangle(cx, ly, panelW - 60, 1, 0x4a2a12, 0.14)
        .setScrollFactor(0).setDepth(282));
    }

    // Subtle center spine
    this.elements.push(this.scene.add.rectangle(cx, cy, 2, panelH - 40, 0x000000, 0.22)
      .setScrollFactor(0).setDepth(282));
    this.elements.push(this.scene.add.rectangle(cx + 1, cy, 1, panelH - 40, 0x6a3e18, 0.18)
      .setScrollFactor(0).setDepth(282));

    // Ornamental top + bottom bands that frame the title + hints
    this.elements.push(this.scene.add.rectangle(cx, cy - panelH / 2 + 54, panelW - 60, 1, goldLight, 0.55)
      .setScrollFactor(0).setDepth(282));
    this.elements.push(this.scene.add.rectangle(cx, cy - panelH / 2 + 58, panelW - 80, 1, goldDark, 0.45)
      .setScrollFactor(0).setDepth(282));
    // Tiny gold diamonds flanking the band
    for (const sx of [-1, 1]) {
      const d = this.scene.add.rectangle(cx + sx * (panelW / 2 - 46), cy - panelH / 2 + 56, 6, 6, goldLight, 0.9)
        .setScrollFactor(0).setDepth(283);
      d.setRotation(Math.PI / 4);
      this.elements.push(d);
    }

    // Decorative corner flourishes (gold L-brackets + ornament dot)
    const cornerOffsetX = panelW / 2 - 16;
    const cornerOffsetY = panelH / 2 - 16;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        this.elements.push(this.scene.add.rectangle(
          cx + sx * cornerOffsetX, cy + sy * cornerOffsetY, 22, 2, goldLight, 0.9,
        ).setScrollFactor(0).setDepth(283));
        this.elements.push(this.scene.add.rectangle(
          cx + sx * cornerOffsetX, cy + sy * cornerOffsetY, 2, 22, goldLight, 0.9,
        ).setScrollFactor(0).setDepth(283));
        const orn = this.scene.add.rectangle(
          cx + sx * (cornerOffsetX - 12), cy + sy * (cornerOffsetY - 12), 5, 5, goldDark, 0.95,
        ).setScrollFactor(0).setDepth(283);
        orn.setRotation(Math.PI / 4);
        this.elements.push(orn);
      }
    }

    // Red ribbon bookmark poking out of the bottom-left — classic book detail
    const ribbonX = cx - panelW / 2 + 54;
    this.elements.push(this.scene.add.rectangle(ribbonX, cy + panelH / 2 + 10, 10, 24, 0x8b1a1a, 1)
      .setScrollFactor(0).setDepth(282));
    this.elements.push(this.scene.add.rectangle(ribbonX - 3, cy + panelH / 2 + 10, 2, 24, 0xc53030, 0.85)
      .setScrollFactor(0).setDepth(283));
    const tail = this.scene.add.triangle(ribbonX, cy + panelH / 2 + 28,
      -5, 0, 5, 0, 0, 8, 0x6a1010, 1)
      .setScrollFactor(0).setDepth(282);
    this.elements.push(tail);

    // Header: CODEX title + owner subtitle (sits on the ornamental band)
    this.elements.push(this.scene.add.text(cx, cy - panelH / 2 + 26, '✦  CODEX  ✦', {
      fontSize: '22px', fontFamily: 'serif', fontStyle: 'bold', color: '#ffd48a',
      stroke: '#000', strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284));

    const name = this.scene.savedPlayerName || 'Traveler';
    this.elements.push(this.scene.add.text(cx, cy - panelH / 2 + 48,
      `~ Chronicles of ${name} ~`, {
        fontSize: '11px', fontFamily: 'serif', fontStyle: 'italic', color: '#b88a50',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(284));

    // Coin tally, top-right bookplate
    this.elements.push(this.scene.add.text(cx + panelW / 2 - 16, cy - panelH / 2 + 26,
      `⛁ ${this.scene.player.coins}`, {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffc840',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(284));

    // Page navigation strip: ◀  CHAPTER HEADING  ▶
    const navY = cy - panelH / 2 + 80;

    this.leftArrow = this.scene.add.text(cx - panelW / 2 + 28, navY, '◀', {
      fontSize: '20px', fontFamily: 'serif', color: '#c89a56',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284)
      .setInteractive({ useHandCursor: true });
    this.leftArrow.on('pointerdown', () => this._flipPage(-1));
    this.elements.push(this.leftArrow);

    this.rightArrow = this.scene.add.text(cx + panelW / 2 - 28, navY, '▶', {
      fontSize: '20px', fontFamily: 'serif', color: '#c89a56',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284)
      .setInteractive({ useHandCursor: true });
    this.rightArrow.on('pointerdown', () => this._flipPage(1));
    this.elements.push(this.rightArrow);

    // Current chapter heading — serif / italic for a manuscript feel
    this.pageHeading = this.scene.add.text(cx, navY, '', {
      fontSize: '22px', fontFamily: 'serif', fontStyle: 'bold italic', color: '#ffd48a',
      stroke: '#000', strokeThickness: 4,
      letterSpacing: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(284);
    this.elements.push(this.pageHeading);

    // Page indicator dots below the chapter heading
    this.pageDots = [];
    const dotY = navY + 20;
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

    // Bottom hint ribbon — two lines
    this.elements.push(this.scene.add.rectangle(cx, cy + panelH / 2 - 40, panelW - 60, 1, goldDark, 0.45)
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
    this._layout = { cx, cy, panelW, panelH, contentTop: dotY + 26 };
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

    this._addBodyText(left, top, "CARTOGRAPHER'S ATLAS", '#ffc86a');
    const visited = player.visitedRooms.size;
    const total = Object.keys(rooms).length;
    this._addBodyText(left + (right - left) - 4, top,
      `Charted: ${visited} / ${total}`, '#b88a50', 11
    ).setOrigin(1, 0);
    this._addBodyText(left, top + 18,
      "Every chamber of the depths, as the scholars recorded them. Dimmed wings remain unexplored.",
      '#8a7050', 10,
    );

    // Available rectangle for the atlas drawing
    const atlasTop = top + 40;
    const atlasBottom = bottom - 18;
    const atlasLeft = left;
    const atlasRight = right;
    const availW = atlasRight - atlasLeft;
    const availH = atlasBottom - atlasTop;

    // Parchment frame for the map itself
    const frame = this.scene.add.rectangle(
      (atlasLeft + atlasRight) / 2, (atlasTop + atlasBottom) / 2,
      availW + 6, availH + 6,
      0x08060a, 0.55,
    ).setScrollFactor(0).setDepth(282);
    this.bodyElements.push(frame);
    const frameInner = this.scene.add.rectangle(
      (atlasLeft + atlasRight) / 2, (atlasTop + atlasBottom) / 2,
      availW, availH,
      0x18100a, 0.85,
    ).setScrollFactor(0).setDepth(282);
    this.bodyElements.push(frameInner);
    // Gold frame strokes (top/bottom thin lines, corners)
    const fG = this.scene.add.graphics().setScrollFactor(0).setDepth(283);
    fG.lineStyle(1, 0x8a5a1a, 0.7);
    fG.strokeRect(atlasLeft, atlasTop, availW, availH);
    this.bodyElements.push(fG);

    // Compute the largest pixels-per-tile that makes the whole atlas fit
    // in the available box. `computeRoomPositions` scales room widths by
    // `ppt` but uses a fixed `GAP` between columns/rows, so the overall
    // bounds scale linearly:
    //
    //   bounds.w(ppt) = contentW * ppt + fixedGapX
    //   bounds.h(ppt) = contentH * ppt + fixedGapY
    //
    // Solve for the ppt that fills availW / availH (with a little padding).
    const cols = new Set(Object.values(ROOM_META).map((m) => m.col)).size;
    const rows = new Set(Object.values(ROOM_META).map((m) => m.row)).size;
    const fixedGapX = (cols - 1) * 12;
    const fixedGapY = (rows - 1) * (12 + 14) + 20;
    const unitPos = computeRoomPositions(1);
    const unitBounds = getTotalBounds(unitPos);
    const contentW = Math.max(1, unitBounds.w - fixedGapX);
    const contentH = Math.max(1, unitBounds.h - fixedGapY);
    const paddingX = 20;
    const paddingY = 28;
    const pptByW = (availW - paddingX - fixedGapX) / contentW;
    const pptByH = (availH - paddingY - fixedGapY) / contentH;
    const ppt = Math.max(0.25, Math.min(pptByW, pptByH, ZOOM_LEVELS[ZOOM_LEVELS.length - 1] * PIXEL_PER_TILE_BASE));
    const positions = computeRoomPositions(ppt);
    const bounds = getTotalBounds(positions);

    // Center the map in the atlas box
    const offX = atlasLeft + (availW - bounds.w) / 2 - bounds.minX;
    const offY = atlasTop + (availH - bounds.h) / 2 - bounds.minY;

    const currentRoom = lm?.currentRoomId;

    // Ink-drawn map graphics (connections + rooms + tiles)
    const g = this.scene.add.graphics().setScrollFactor(0).setDepth(283);
    this.bodyElements.push(g);

    // Connections: sepia ink lines
    for (const [a, b] of CONNECTIONS) {
      const rpA = positions[a];
      const rpB = positions[b];
      if (!rpA || !rpB) continue;
      const aVis = player.visitedRooms.has(a);
      const bVis = player.visitedRooms.has(b);
      const lit = aVis && bVis;
      const ax = offX + rpA.x + rpA.w / 2;
      const ay = offY + rpA.y + rpA.h / 2;
      const bx = offX + rpB.x + rpB.w / 2;
      const by = offY + rpB.y + rpB.h / 2;
      g.lineStyle(1.5, lit ? 0xe0a860 : 0x6a4a2a, lit ? 0.85 : 0.45);
      g.lineBetween(ax, ay, bx, by);
    }

    // Rooms: render tile-level detail for ALL rooms (user wanted the
    // whole map uncovered). Unvisited rooms draw at reduced opacity so
    // there's still a sense of progress without hiding geometry.
    for (const [id, rp] of Object.entries(positions)) {
      const room = rooms[id];
      const rx = offX + rp.x;
      const ry = offY + rp.y;
      const isCurrent = currentRoom === id;
      const visitedRoom = player.visitedRooms.has(id);
      const alphaMul = visitedRoom ? 1 : 0.55;

      // Room backdrop (dark)
      g.fillStyle(visitedRoom ? 0x0a0806 : 0x040302, visitedRoom ? 0.95 : 0.75);
      g.fillRect(rx, ry, rp.w, rp.h);

      // Tile detail
      if (room && ppt >= 1.05) {
        for (let row = 0; row < room.tiles.length; row++) {
          const rowArr = room.tiles[row];
          for (let col = 0; col < rowArr.length; col++) {
            const t = rowArr[col];
            if (t === 0) continue;
            const tx = rx + col * ppt;
            const ty = ry + row * ppt;
            if (t === 1) g.fillStyle(visitedRoom ? 0x8a6a40 : 0x3e2e18, alphaMul);
            else if (t === 2) g.fillStyle(visitedRoom ? 0x9a8050 : 0x4a3820, alphaMul * 0.9);
            else if (t === 3) g.fillStyle(visitedRoom ? 0x7a5a34 : 0x362818, alphaMul);
            g.fillRect(tx, ty, Math.max(1, ppt), Math.max(1, ppt));
          }
        }
      } else if (room) {
        // ppt too low to render tiles — just a muted filled rect.
        g.fillStyle(visitedRoom ? 0x6a4a2a : 0x2e2010, visitedRoom ? 0.85 : 0.5);
        g.fillRect(rx + 1, ry + 1, rp.w - 2, rp.h - 2);
      }

      // Object markers (only if the room has been seen — otherwise it's
      // spoiler territory, but keep door hints visible since the edges
      // show in the shape anyway).
      if (room && room.objects && visitedRoom && ppt >= 1) {
        for (const obj of room.objects) {
          const ox = rx + obj.x * ppt;
          const oy = ry + obj.y * ppt;
          switch (obj.type) {
            case 'door':
              g.fillStyle(0x44aaff, 0.85);
              g.fillRect(ox - ppt * 0.35, oy - ppt * 0.35, ppt * 0.7, ppt * 0.7);
              break;
            case 'boss':
              g.fillStyle(0xff2a3a, 0.9);
              g.fillCircle(ox, oy, Math.max(2.5, ppt * 0.8));
              break;
            case 'checkpoint_shrine':
              g.fillStyle(0x40ffd8, 0.85);
              g.fillRect(ox - ppt * 0.3, oy - ppt * 0.3, ppt * 0.6, ppt * 0.6);
              break;
            case 'ability_orb':
              g.fillStyle(0xffcc00, 0.9);
              g.fillCircle(ox, oy, Math.max(1.6, ppt * 0.55));
              break;
            case 'merchant_shop':
              g.fillStyle(0xff88ff, 0.85);
              g.fillCircle(ox, oy, Math.max(1.5, ppt * 0.5));
              break;
            case 'teleport':
              g.fillStyle(0x44ccff, 0.85);
              g.fillCircle(ox, oy, Math.max(1.5, ppt * 0.5));
              break;
          }
        }
      }

      // Room outline — gold for current, brass for visited, faded for unseen
      if (isCurrent) {
        g.lineStyle(2, 0xffe680, 1);
        g.strokeRect(rx - 1, ry - 1, rp.w + 2, rp.h + 2);
      } else if (visitedRoom) {
        g.lineStyle(1, 0xc89c5a, 0.85);
        g.strokeRect(rx, ry, rp.w, rp.h);
      } else {
        g.lineStyle(1, 0x6a4a28, 0.5);
        g.strokeRect(rx, ry, rp.w, rp.h);
      }
    }

    // Player blip on the current room
    if (currentRoom && positions[currentRoom] && player.visitedRooms.has(currentRoom)) {
      const rp = positions[currentRoom];
      const ptx = offX + rp.x + (player.x / TILE_SIZE) * ppt;
      const pty = offY + rp.y + (player.y / TILE_SIZE) * ppt;
      g.fillStyle(0x44ff66, 1);
      g.fillCircle(ptx, pty, Math.max(2.5, ppt * 0.9));
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(ptx, pty, Math.max(1.2, ppt * 0.4));
    }

    // Legend along the bottom of the atlas box
    const legendY = atlasBottom - 10;
    const legendItems = [
      { label: 'You', color: 0x44ff66 },
      { label: 'Explored', color: 0xc89c5a },
      { label: 'Unknown', color: 0x6a4a28 },
      { label: 'Door', color: 0x44aaff },
      { label: 'Boss', color: 0xff2a3a },
      { label: 'Shrine', color: 0x40ffd8 },
    ];
    let lx = atlasLeft + 10;
    const legendG = this.scene.add.graphics().setScrollFactor(0).setDepth(284);
    this.bodyElements.push(legendG);
    for (const item of legendItems) {
      legendG.fillStyle(item.color, 0.95);
      legendG.fillRect(lx, legendY - 3, 7, 7);
      legendG.lineStyle(1, 0x000000, 0.6);
      legendG.strokeRect(lx, legendY - 3, 7, 7);
      const t = this.scene.add.text(lx + 10, legendY, item.label, {
        fontSize: '9px', fontFamily: 'monospace', color: '#c89c5a',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(284);
      this.bodyElements.push(t);
      lx += 16 + t.width + 10;
    }
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
