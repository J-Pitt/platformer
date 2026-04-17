import { rooms, TILE_SIZE } from '../level/rooms.js';
import { isJpProfileName } from '../entities/Player.js';

export const ROOM_META = {
  room1:  { label: 'Broken Threshold',  col: 0,  row: 1 },
  room2:  { label: 'Vertical Shaft',    col: 1,  row: 1 },
  room3:  { label: 'Fungal Passage',    col: 2,  row: 2 },
  room4:  { label: 'Crystal Hall',      col: 2,  row: 0 },
  room5:  { label: 'Guardian Chamber',  col: 3,  row: 0 },
  room6:  { label: 'Sunken Aqueduct',   col: 3,  row: 2 },
  room7:  { label: 'Bone Corridor',     col: 4,  row: 2 },
  room8:  { label: 'The Crucible',      col: 4,  row: 1 },
  room9:  { label: 'Bone Tyrant',       col: 5,  row: 1 },
  room_organic: { label: 'Wind Cavern', col: 0,  row: 0 },
  // Frozen Depths
  room10: { label: 'Frozen Threshold',  col: 6,  row: 1 },
  room11: { label: 'Glacial Shaft',     col: 7,  row: 1 },
  room12: { label: 'Crystal Caverns',   col: 7,  row: 0 },
  room13: { label: 'Frost Warden',      col: 8,  row: 0 },
  // Molten Core
  room14: { label: 'Magma Descent',     col: 8,  row: 1 },
  room15: { label: 'Crucible Depths',   col: 9,  row: 1 },
  room16: { label: 'Ember Halls',       col: 9,  row: 2 },
  room17: { label: 'Inferno Guardian',  col: 10, row: 2 },
  // Shadow Sanctum
  room18: { label: 'Shadow Gate',       col: 10, row: 1 },
  room19: { label: 'Phantom Corridors', col: 11, row: 1 },
  room20: { label: 'Spectral Nave',     col: 11, row: 0 },
  room21: { label: 'Shadow Warden',     col: 12, row: 0 },
  // Ancient Library
  room22: { label: 'Ruined Archives',   col: 12, row: 1 },
  room23: { label: "Scholar's Tower",   col: 13, row: 1 },
  room24: { label: 'Forbidden Stacks',  col: 13, row: 2 },
  room25: { label: 'Archive Sentinel',  col: 14, row: 2 },
  // Void Nexus
  room26: { label: 'Void Threshold',    col: 14, row: 1 },
  room27: { label: 'Nexus Spire',       col: 15, row: 1 },
  room28: { label: 'Convergence',       col: 15, row: 0 },
  room29: { label: 'The Void King',     col: 16, row: 0 },
};

export const CONNECTIONS = [
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
  // Frozen Depths
  ['room9',  'room10'],
  ['room10', 'room11'],
  ['room11', 'room12'],
  ['room12', 'room13'],
  // Molten Core
  ['room13', 'room14'],
  ['room14', 'room15'],
  ['room15', 'room16'],
  ['room16', 'room17'],
  // Shadow Sanctum
  ['room17', 'room18'],
  ['room18', 'room19'],
  ['room19', 'room20'],
  ['room20', 'room21'],
  // Ancient Library
  ['room21', 'room22'],
  ['room22', 'room23'],
  ['room23', 'room24'],
  ['room24', 'room25'],
  // Void Nexus
  ['room25', 'room26'],
  ['room26', 'room27'],
  ['room27', 'room28'],
  ['room28', 'room29'],
  // Teleport shortcuts
  ['room16', 'room20'],
];

export const PIXEL_PER_TILE_BASE = 3;
export const GAP = 12;
export const ZOOM_LEVELS = [0.35, 0.5, 0.75, 1, 1.5, 2];
const PAN_SPEED = 6;

/**
 * Grid-lay out every known room given a `pixels-per-tile` scale. Shared
 * by the main MapOverlay and by the Codex page preview so both renderers
 * agree on room geometry.
 */
export function computeRoomPositions(ppt) {
  const positions = {};
  for (const [roomId, meta] of Object.entries(ROOM_META)) {
    const room = rooms[roomId];
    const w = room ? room.width * ppt : 20;
    const h = room ? room.height * ppt : 16;
    positions[roomId] = { w, h, col: meta.col, row: meta.row };
  }

  const colWidths = {};
  const rowHeights = {};
  for (const pos of Object.values(positions)) {
    colWidths[pos.col] = Math.max(colWidths[pos.col] || 0, pos.w);
    rowHeights[pos.row] = Math.max(rowHeights[pos.row] || 0, pos.h);
  }

  const colX = {};
  let runX = 0;
  for (const c of Object.keys(colWidths).map(Number).sort((a, b) => a - b)) {
    colX[c] = runX;
    runX += colWidths[c] + GAP;
  }

  const rowY = {};
  let runY = 0;
  for (const r of Object.keys(rowHeights).map(Number).sort((a, b) => a - b)) {
    rowY[r] = runY;
    runY += rowHeights[r] + GAP + 14;
  }

  for (const pos of Object.values(positions)) {
    const cw = colWidths[pos.col];
    const rh = rowHeights[pos.row];
    pos.x = colX[pos.col] + (cw - pos.w) / 2;
    pos.y = rowY[pos.row] + (rh - pos.h) / 2;
  }
  return positions;
}

export function getTotalBounds(positions) {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const rp of Object.values(positions)) {
    b.minX = Math.min(b.minX, rp.x);
    b.minY = Math.min(b.minY, rp.y);
    b.maxX = Math.max(b.maxX, rp.x + rp.w);
    b.maxY = Math.max(b.maxY, rp.y + rp.h + 20);
  }
  return { ...b, w: b.maxX - b.minX, h: b.maxY - b.minY };
}

export class MapOverlay {
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
    this.visible = false;
    this.zoomIdx = 0;
    this.container = null;
    this._keyListeners = [];
    this._dragging = false;
    this._dragStartX = 0;
    this._dragStartY = 0;
    this._containerStartX = 0;
    this._containerStartY = 0;
    this._panKeys = { up: false, down: false, left: false, right: false };
    this._updateEvent = null;

    // JP fast-travel: solo-dev profile gets an extra affordance — arrow
    // keys move a gold "pin" between visited rooms, Enter/Space warps
    // straight there. Non-JP players keep pan-on-arrow behavior.
    this._fastTravelEnabled = isJpProfileName(scene.savedPlayerName);
    this._selectedRoomId = null;
    this._selectionRect = null;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    this.zoomIdx = this.bestFitZoom();
    if (this._fastTravelEnabled) {
      const cur = this.scene.levelManager?.currentRoomId;
      if (cur && ROOM_META[cur]) this._selectedRoomId = cur;
      else this._selectedRoomId = this._firstVisitedRoom();
    }
    this.build();
  }

  _firstVisitedRoom() {
    for (const id of Object.keys(ROOM_META)) {
      if (this._isVisited(id)) return id;
    }
    return null;
  }

  /**
   * JP god-mode: every room with metadata counts as "visited" so the
   * whole dungeon shows up fully drawn (tiles, doors, orbs, bosses,
   * coins…). Normal players still see only what they've explored.
   */
  _isVisited(roomId) {
    if (this._fastTravelEnabled) return !!ROOM_META[roomId];
    return !!this.scene.player?.visitedRooms?.has(roomId);
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
      this.scene.input.keyboard.off('keyup', fn);
    }
    this._keyListeners = [];
    if (this._updateEvent) {
      this.scene.events.off('update', this._updateEvent);
      this._updateEvent = null;
    }
    this._dragging = false;
    this._panKeys = { up: false, down: false, left: false, right: false };
  }

  rebuild() {
    const oldX = this.container ? this.container.x : null;
    const oldY = this.container ? this.container.y : null;
    this.cleanup();
    this.build(oldX, oldY);
  }

  bestFitZoom() {
    const cam = this.scene.cameras.main;
    const margin = 80;
    const availW = cam.width - margin;
    const availH = cam.height - margin;

    for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) {
      const ppt = PIXEL_PER_TILE_BASE * ZOOM_LEVELS[i];
      const positions = this.computeRoomPositions(ppt);
      const bounds = this.getTotalBounds(positions);
      if (bounds.w <= availW && bounds.h <= availH) return i;
    }
    return 0;
  }

  getTotalBounds(positions) {
    return getTotalBounds(positions);
  }

  build(restoreX, restoreY) {
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
    const allBounds = this.getTotalBounds(roomPositions);
    const totalW = allBounds.w;
    const totalH = allBounds.h;

    let offX, offY;
    // Priority: caller-provided restore > JP selection re-center > current-room center.
    const focusRoomId = this._centerOnSelection
      ? this._selectedRoomId
      : currentRoom;
    this._centerOnSelection = false;
    if (restoreX != null && restoreY != null) {
      offX = restoreX;
      offY = restoreY;
    } else {
      const focusRP = roomPositions[focusRoomId];
      if (focusRP) {
        offX = cx - (focusRP.x + focusRP.w / 2 - allBounds.minX);
        offY = cy - (focusRP.y + focusRP.h / 2 - allBounds.minY);
      } else {
        offX = cx - totalW / 2;
        offY = cy - totalH / 2;
      }
    }

    this.container = this.scene.add.container(offX, offY).setScrollFactor(0).setDepth(301);
    this._mapTotalW = totalW;
    this._mapTotalH = totalH;

    for (const [a, b] of CONNECTIONS) {
      const aVis = this._isVisited(a);
      const bVis = this._isVisited(b);
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
      const visited = this._isVisited(roomId);
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

    if (currentRoom && rooms[currentRoom] && this._isVisited(currentRoom)) {
      const rp = roomPositions[currentRoom];
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
    let hintStr;
    if (this._fastTravelEnabled) {
      hintStr = isMobile
        ? '[ TAP ROOM TO TRAVEL  ·  TAP AWAY TO CLOSE ]'
        : '[ ARROWS: PICK ROOM  ·  ENTER: TRAVEL  ·  WASD/DRAG: PAN  ·  M: CLOSE ]';
    } else {
      hintStr = isMobile ? '[ DRAG TO PAN  ·  TAP TO CLOSE ]' : '[ DRAG / ARROWS TO PAN  ·  M TO CLOSE ]';
    }
    const hint = this.scene.add.text(cx, cam.height - 16, hintStr, {
      fontSize: '11px', fontFamily: 'monospace', color: this._fastTravelEnabled ? '#ffcc44' : '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(302);
    this.elements.push(hint);

    if (this._fastTravelEnabled) {
      this._renderSelectionHighlight(roomPositions, allBounds);
      this._setupTapToTravel(roomPositions, allBounds);

      const badge = this.scene.add.text(20, 20, 'JP GOD MODE · FULL MAP', {
        fontSize: '10px', fontFamily: 'monospace', color: '#ffcc44',
        stroke: '#000', strokeThickness: 3,
        backgroundColor: '#1a1008', padding: { x: 6, y: 3 },
      }).setOrigin(0, 0).setScrollFactor(0).setDepth(303);
      this.elements.push(badge);
    }

    this.createZoomButtons(cam);
    this.setupDrag(overlay);
    this.setupPanKeys();

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

  setupDrag(overlay) {
    overlay.on('pointerdown', (pointer) => {
      this._dragging = true;
      this._dragStartX = pointer.x;
      this._dragStartY = pointer.y;
      this._containerStartX = this.container.x;
      this._containerStartY = this.container.y;
      this._dragMoved = false;
    });

    this.scene.input.on('pointermove', (pointer) => {
      if (!this._dragging || !this.container) return;
      const dx = pointer.x - this._dragStartX;
      const dy = pointer.y - this._dragStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this._dragMoved = true;
      this.container.x = this._containerStartX + dx;
      this.container.y = this._containerStartY + dy;
    });

    this.scene.input.on('pointerup', () => {
      this._dragging = false;
    });
  }

  setupPanKeys() {
    const keys = this._panKeys;
    const jp = this._fastTravelEnabled;

    const onDown = (e) => {
      if (!this.visible) return;
      // In JP mode the arrow keys drive the fast-travel cursor; pan still
      // works on WASD. In default mode both sets pan.
      if (jp) {
        if (e.key === 'ArrowUp')    { this._moveSelection(0, -1); return; }
        if (e.key === 'ArrowDown')  { this._moveSelection(0,  1); return; }
        if (e.key === 'ArrowLeft')  { this._moveSelection(-1, 0); return; }
        if (e.key === 'ArrowRight') { this._moveSelection( 1, 0); return; }
        if (e.key === 'Enter' || e.key === ' ') { this._travelToSelection(); return; }
      } else {
        if (e.key === 'ArrowUp')    keys.up = true;
        if (e.key === 'ArrowDown')  keys.down = true;
        if (e.key === 'ArrowLeft')  keys.left = true;
        if (e.key === 'ArrowRight') keys.right = true;
      }
      if (e.key === 'w') keys.up = true;
      if (e.key === 's') keys.down = true;
      if (e.key === 'a') keys.left = true;
      if (e.key === 'd') keys.right = true;
      if (e.key === '=' || e.key === '+') this.zoomIn();
      else if (e.key === '-' || e.key === '_') this.zoomOut();
    };
    const onUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    };

    this.scene.input.keyboard.on('keydown', onDown);
    this.scene.input.keyboard.on('keyup', onUp);
    this._keyListeners.push(onDown, onUp);

    this._updateEvent = () => {
      if (!this.visible || !this.container) return;
      if (keys.up) this.container.y += PAN_SPEED;
      if (keys.down) this.container.y -= PAN_SPEED;
      if (keys.left) this.container.x += PAN_SPEED;
      if (keys.right) this.container.x -= PAN_SPEED;
    };
    this.scene.events.on('update', this._updateEvent);
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
    return computeRoomPositions(ppt);
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
        } else if (obj.type === 'coin') {
          g.fillStyle(0xffc840, 0.8);
          g.fillCircle(ox, oy, Math.max(1.5, ppt * 0.3));
        } else if (obj.type === 'teleport') {
          g.fillStyle(0x44ccff, 0.8);
          g.fillCircle(ox, oy, Math.max(2, ppt * 0.5));
        } else if (obj.type === 'merchant_shop') {
          g.fillStyle(0xff88ff, 0.8);
          g.fillCircle(ox, oy, Math.max(2, ppt * 0.5));
        }
      }
    }

    this.container.add(g);
  }

  // ─── JP fast-travel helpers ──────────────────────────────────────────

  /** Draw the gold pin on the currently-selected room. */
  _renderSelectionHighlight(roomPositions, allBounds) {
    if (!this._selectedRoomId) return;
    const rp = roomPositions[this._selectedRoomId];
    if (!rp) return;
    const rx = rp.x - allBounds.minX;
    const ry = rp.y - allBounds.minY;

    const rect = this.scene.add.rectangle(
      rx + rp.w / 2, ry + rp.h / 2, rp.w + 8, rp.h + 8,
      0xffcc44, 0,
    );
    rect.setStrokeStyle(2, 0xffcc44, 1);
    this.container.add(rect);
    this._selectionRect = rect;

    // Gentle pulse to distinguish from the fixed "current room" outline.
    this.scene.tweens.add({
      targets: rect, alpha: 0.4, duration: 520, yoyo: true, repeat: -1,
    });
  }

  /** Allow clicking a visited room to warp to it. */
  _setupTapToTravel(roomPositions, allBounds) {
    for (const [roomId, rp] of Object.entries(roomPositions)) {
      if (!this._isVisited(roomId)) continue;
      const rx = rp.x - allBounds.minX;
      const ry = rp.y - allBounds.minY;
      const hit = this.scene.add.rectangle(
        rx + rp.w / 2, ry + rp.h / 2, rp.w + 6, rp.h + 10, 0xffffff, 0,
      );
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerup', (pointer) => {
        if (this._dragMoved) return;
        if (pointer.event && pointer.event.button !== undefined && pointer.event.button !== 0) return;
        this._selectedRoomId = roomId;
        this._travelToSelection();
      });
      this.container.add(hit);
    }
  }

  /** Pick the nearest visited room in the given direction. */
  _moveSelection(dx, dy) {
    const cur = this._selectedRoomId;
    if (!cur) return;
    const curMeta = ROOM_META[cur];
    if (!curMeta) return;

    let best = null;
    let bestScore = Infinity;
    for (const [id, meta] of Object.entries(ROOM_META)) {
      if (id === cur || !this._isVisited(id)) continue;
      const ccol = meta.col - curMeta.col;
      const crow = meta.row - curMeta.row;
      // Must be meaningfully in the requested direction.
      if (dx !== 0 && Math.sign(ccol) !== Math.sign(dx)) continue;
      if (dy !== 0 && Math.sign(crow) !== Math.sign(dy)) continue;
      if (dx === 0 && ccol !== 0 && Math.abs(ccol) > Math.abs(crow)) continue;
      if (dy === 0 && crow !== 0 && Math.abs(crow) > Math.abs(ccol)) continue;
      // Score: primary-axis distance plus a small penalty for off-axis drift.
      const primary = dx !== 0 ? Math.abs(ccol) : Math.abs(crow);
      const offAxis = dx !== 0 ? Math.abs(crow) : Math.abs(ccol);
      const score = primary * 10 + offAxis;
      if (score < bestScore) { bestScore = score; best = id; }
    }
    if (best) {
      this._selectedRoomId = best;
      this._centerOnSelection = true;
      // Force a full re-center rather than a position-preserving rebuild.
      this.cleanup();
      this.build();
    }
  }

  /** Warp the player to the selected room (or bail with a flash). */
  _travelToSelection() {
    const target = this._selectedRoomId;
    if (!target) return;
    const scene = this.scene;
    if (!this._isVisited(target)) {
      scene.cameras.main.flash(200, 180, 40, 40);
      return;
    }
    if (target === scene.levelManager?.currentRoomId) {
      this.hide();
      return;
    }
    this.hide();
    scene.cameras.main.fade(240, 0, 0, 0, true, (_cam, p) => {
      if (p < 1) return;
      scene.levelManager.loadRoom(target);
      scene.cameras.main.fadeIn(320, 0, 0, 0);
    });
  }
}
