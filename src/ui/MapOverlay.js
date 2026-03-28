import { rooms, TILE_SIZE } from '../level/rooms.js';

const ROOM_META = {
  room1: { label: 'Broken Threshold', col: 0, row: 1 },
  room2: { label: 'Vertical Shaft',   col: 1, row: 1 },
  room3: { label: 'Fungal Passage',   col: 2, row: 2 },
  room4: { label: 'Crystal Hall',     col: 2, row: 0 },
  room5: { label: 'Guardian Chamber', col: 3, row: 0 },
  room6: { label: 'Sunken Aqueduct',  col: 3, row: 2 },
  room7: { label: 'Bone Corridor',    col: 4, row: 2 },
  room8: { label: 'The Crucible',     col: 4, row: 1 },
  room9: { label: 'Bone Tyrant',      col: 5, row: 1 },
  room_organic: { label: 'Wind Cavern', col: 6, row: 1 },
};

const CONNECTIONS = [
  ['room1', 'room2'],
  ['room2', 'room3'],
  ['room2', 'room4'],
  ['room3', 'room6'],
  ['room4', 'room5'],
  ['room5', 'room8'],
  ['room6', 'room7'],
  ['room7', 'room8'],
  ['room8', 'room9'],
  ['room1', 'room_organic'],
];

const PIXEL_PER_TILE_BASE = 3;
const GAP = 12;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2];
const DEFAULT_ZOOM_IDX = 2;

export class MapOverlay {
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
    this.visible = false;
    this.zoomIdx = DEFAULT_ZOOM_IDX;
    this.container = null;
    this._keyListeners = [];
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    this.zoomIdx = DEFAULT_ZOOM_IDX;
    this.build();
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.cleanup();
  }

  cleanup() {
    for (const el of this.elements) {
      if (el.destroy) el.destroy();
    }
    this.elements = [];
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    for (const fn of this._keyListeners) {
      this.scene.input.keyboard.off('keydown', fn);
    }
    this._keyListeners = [];
  }

  rebuild() {
    this.cleanup();
    this.build();
  }

  build() {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const player = this.scene.player;
    const currentRoom = this.scene.levelManager.currentRoomId;
    const ppt = PIXEL_PER_TILE_BASE * ZOOM_LEVELS[this.zoomIdx];

    const overlay = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.8)
      .setScrollFactor(0).setDepth(300).setInteractive();
    this.elements.push(overlay);

    const roomPositions = this.computeRoomPositions(ppt);

    const allBounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const rp of Object.values(roomPositions)) {
      allBounds.minX = Math.min(allBounds.minX, rp.x);
      allBounds.minY = Math.min(allBounds.minY, rp.y);
      allBounds.maxX = Math.max(allBounds.maxX, rp.x + rp.w);
      allBounds.maxY = Math.max(allBounds.maxY, rp.y + rp.h);
    }
    const totalW = allBounds.maxX - allBounds.minX;
    const totalH = allBounds.maxY - allBounds.minY;

    const currentRP = roomPositions[currentRoom];
    let offX, offY;
    if (currentRP) {
      offX = cx - (currentRP.x + currentRP.w / 2 - allBounds.minX);
      offY = cy - (currentRP.y + currentRP.h / 2 - allBounds.minY);
    } else {
      offX = cx - totalW / 2;
      offY = cy - totalH / 2;
    }

    this.container = this.scene.add.container(offX, offY).setScrollFactor(0).setDepth(301);

    for (const [a, b] of CONNECTIONS) {
      const aVis = player.visitedRooms.has(a);
      const bVis = player.visitedRooms.has(b);
      const rpA = roomPositions[a];
      const rpB = roomPositions[b];
      if (!rpA || !rpB) continue;

      const ax = rpA.x + rpA.w / 2 - allBounds.minX;
      const ay = rpA.y + rpA.h / 2 - allBounds.minY;
      const bx = rpB.x + rpB.w / 2 - allBounds.minX;
      const by = rpB.y + rpB.h / 2 - allBounds.minY;

      const g = this.scene.add.graphics();
      const lineColor = (aVis && bVis) ? 0x44ff66 : (aVis || bVis) ? 0x445533 : 0x222211;
      g.lineStyle(2, lineColor, (aVis && bVis) ? 0.6 : 0.3);
      g.lineBetween(ax, ay, bx, by);
      this.container.add(g);
    }

    for (const [roomId, rp] of Object.entries(roomPositions)) {
      const visited = player.visitedRooms.has(roomId);
      const isCurrent = roomId === currentRoom;
      const room = rooms[roomId];
      const rx = rp.x - allBounds.minX;
      const ry = rp.y - allBounds.minY;

      if (visited && room) {
        this.drawRoomTiles(rx, ry, room, ppt, isCurrent);
      } else {
        const rect = this.scene.add.rectangle(
          rx + rp.w / 2, ry + rp.h / 2, rp.w, rp.h,
          0x222211, 0.4,
        );
        this.container.add(rect);
      }

      if (isCurrent) {
        const highlight = this.scene.add.rectangle(
          rx + rp.w / 2, ry + rp.h / 2, rp.w + 4, rp.h + 4,
          0x44ff66, 0,
        );
        highlight.setStrokeStyle(2, 0x44ff66, 0.7);
        this.container.add(highlight);
      }

      const meta = ROOM_META[roomId];
      const labelText = visited ? (meta ? meta.label : roomId) : '???';
      const labelColor = isCurrent ? '#44ff66' : visited ? '#8a7858' : '#444433';
      const fontSize = ppt >= 3 ? '8px' : '7px';
      const label = this.scene.add.text(rx + rp.w / 2, ry + rp.h + 6, labelText, {
        fontSize, fontFamily: 'monospace', color: labelColor,
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0);
      this.container.add(label);
    }

    if (currentRoom && rooms[currentRoom] && player.visitedRooms.has(currentRoom)) {
      const rp = roomPositions[currentRoom];
      const room = rooms[currentRoom];
      const rx = rp.x - allBounds.minX;
      const ry = rp.y - allBounds.minY;

      const playerTileX = (player.x / TILE_SIZE);
      const playerTileY = (player.y / TILE_SIZE);
      const px = rx + playerTileX * ppt;
      const py = ry + playerTileY * ppt;

      const iconSize = Math.max(4, ppt * 1.2);
      const icon = this.scene.add.graphics();
      icon.fillStyle(0x44ff66, 1);
      icon.fillCircle(px, py, iconSize);
      icon.fillStyle(0xffffff, 0.8);
      icon.fillCircle(px, py, iconSize * 0.5);
      this.container.add(icon);

      const pulse = this.scene.add.circle(px, py, iconSize + 3, 0x44ff66, 0.3);
      this.container.add(pulse);
      this.scene.tweens.add({
        targets: pulse,
        scaleX: 1.8, scaleY: 1.8, alpha: 0,
        duration: 1000, yoyo: false, repeat: -1,
      });
    }

    const title = this.scene.add.text(cx, 20, 'DUNGEON MAP', {
      fontSize: '16px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(302);
    this.elements.push(title);

    const isMobile = 'ontouchstart' in window && navigator.maxTouchPoints > 1;
    const hint = this.scene.add.text(cx, cam.height - 16,
      isMobile ? '[ TAP TO CLOSE ]' : '[ M TO CLOSE ]', {
        fontSize: '11px', fontFamily: 'monospace', color: '#6a5838',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(302);
    this.elements.push(hint);

    this.createZoomButtons(cam);

    const zoomKey = (e) => {
      if (!this.visible) return;
      if (e.key === '=' || e.key === '+') this.zoomIn();
      else if (e.key === '-' || e.key === '_') this.zoomOut();
    };
    this.scene.input.keyboard.on('keydown', zoomKey);
    this._keyListeners.push(zoomKey);

    for (const el of this.elements) {
      if (el.setAlpha && !el._noFade) {
        const a = el.alpha;
        el.setAlpha(0);
        this.scene.tweens.add({ targets: el, alpha: a, duration: 150 });
      }
    }
    this.container.setAlpha(0);
    this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 150 });
  }

  createZoomButtons(cam) {
    const btnStyle = {
      fontSize: '20px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 3,
      backgroundColor: '#1a1008',
      padding: { x: 8, y: 4 },
    };

    const btnPlus = this.scene.add.text(cam.width - 20, cam.height / 2 - 24, '+', btnStyle)
      .setOrigin(1, 0.5).setScrollFactor(0).setDepth(303)
      .setInteractive({ useHandCursor: true });
    btnPlus.on('pointerdown', () => this.zoomIn());
    this.elements.push(btnPlus);

    const btnMinus = this.scene.add.text(cam.width - 20, cam.height / 2 + 24, '−', btnStyle)
      .setOrigin(1, 0.5).setScrollFactor(0).setDepth(303)
      .setInteractive({ useHandCursor: true });
    btnMinus.on('pointerdown', () => this.zoomOut());
    this.elements.push(btnMinus);

    const zoomLabel = this.scene.add.text(cam.width - 20, cam.height / 2 + 56,
      `${Math.round(ZOOM_LEVELS[this.zoomIdx] * 100)}%`, {
        fontSize: '9px', fontFamily: 'monospace', color: '#6a5838',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(303);
    this.elements.push(zoomLabel);
  }

  zoomIn() {
    if (this.zoomIdx < ZOOM_LEVELS.length - 1) {
      this.zoomIdx++;
      this.rebuild();
    }
  }

  zoomOut() {
    if (this.zoomIdx > 0) {
      this.zoomIdx--;
      this.rebuild();
    }
  }

  computeRoomPositions(ppt) {
    const positions = {};
    const colGroups = {};

    for (const [roomId, meta] of Object.entries(ROOM_META)) {
      const room = rooms[roomId];
      const w = room ? room.width * ppt : 20;
      const h = room ? room.height * ppt : 16;
      const key = `${meta.col}_${meta.row}`;
      if (!colGroups[meta.col]) colGroups[meta.col] = {};
      colGroups[meta.col][meta.row] = { roomId, w, h };
      positions[roomId] = { w, h, col: meta.col, row: meta.row };
    }

    const colWidths = {};
    const rowHeights = {};
    for (const [roomId, pos] of Object.entries(positions)) {
      colWidths[pos.col] = Math.max(colWidths[pos.col] || 0, pos.w);
      rowHeights[pos.row] = Math.max(rowHeights[pos.row] || 0, pos.h);
    }

    const colX = {};
    let runX = 0;
    const sortedCols = Object.keys(colWidths).map(Number).sort((a, b) => a - b);
    for (const c of sortedCols) {
      colX[c] = runX;
      runX += colWidths[c] + GAP;
    }

    const rowY = {};
    let runY = 0;
    const sortedRows = Object.keys(rowHeights).map(Number).sort((a, b) => a - b);
    for (const r of sortedRows) {
      rowY[r] = runY;
      runY += rowHeights[r] + GAP + 14;
    }

    for (const [roomId, pos] of Object.entries(positions)) {
      const cw = colWidths[pos.col];
      const rh = rowHeights[pos.row];
      pos.x = colX[pos.col] + (cw - pos.w) / 2;
      pos.y = rowY[pos.row] + (rh - pos.h) / 2;
    }

    return positions;
  }

  drawRoomTiles(rx, ry, room, ppt, isCurrent) {
    const g = this.scene.add.graphics();

    g.fillStyle(0x0a0806, 0.9);
    g.fillRect(rx, ry, room.width * ppt, room.height * ppt);

    for (let row = 0; row < room.tiles.length; row++) {
      for (let col = 0; col < room.tiles[row].length; col++) {
        const tile = room.tiles[row][col];
        if (tile === 0) continue;

        const tx = rx + col * ppt;
        const ty = ry + row * ppt;

        if (tile === 1) {
          g.fillStyle(0x6a5040, 0.9);
          g.fillRect(tx, ty, ppt, ppt);
        } else if (tile === 2) {
          g.fillStyle(0x88aa66, 0.8);
          g.fillRect(tx, ty, ppt, Math.max(1, ppt * 0.4));
        } else if (tile === 3) {
          g.fillStyle(0x7a6850, 0.7);
          g.fillRect(tx, ty, ppt, ppt);
        }
      }
    }

    if (room.objects) {
      for (const obj of room.objects) {
        const ox = rx + obj.x * ppt;
        const oy = ry + obj.y * ppt;

        if (obj.type === 'door') {
          g.fillStyle(0x44aaff, 0.8);
          g.fillRect(ox - ppt * 0.3, oy - ppt * 0.3, ppt * 0.6, ppt * 0.6);
        } else if (obj.type === 'bench') {
          g.fillStyle(0x40ffd8, 0.8);
          g.fillRect(ox - ppt * 0.3, oy - ppt * 0.3, ppt * 0.6, ppt * 0.6);
        } else if (obj.type === 'magma_pool') {
          const mw = obj.width || 3;
          g.fillStyle(0xff4422, 0.5);
          g.fillRect(ox - (mw / 2) * ppt, oy - ppt * 0.3, mw * ppt, ppt * 0.6);
        } else if (obj.type === 'ability_orb') {
          g.fillStyle(0xffcc00, 0.9);
          g.fillCircle(ox, oy, Math.max(2, ppt * 0.5));
        } else if (obj.type === 'boss') {
          g.fillStyle(0xff2244, 0.9);
          g.fillCircle(ox, oy, Math.max(3, ppt * 0.8));
        }
      }
    }

    this.container.add(g);
  }
}
