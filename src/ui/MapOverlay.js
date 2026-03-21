const ROOM_DATA = {
  room1: { label: 'Broken Threshold', col: 0, row: 1 },
  room2: { label: 'Vertical Shaft',   col: 1, row: 1 },
  room3: { label: 'Fungal Passage',   col: 2, row: 2 },
  room4: { label: 'Crystal Hall',     col: 2, row: 0 },
  room5: { label: 'Guardian Chamber', col: 3, row: 0 },
  room6: { label: 'Sunken Aqueduct',  col: 3, row: 2 },
  room7: { label: 'Bone Corridor',    col: 4, row: 2 },
  room8: { label: 'The Crucible',     col: 4, row: 1 },
  room9: { label: 'Bone Tyrant',      col: 5, row: 1 },
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
];

export class MapOverlay {
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
    this.visible = false;
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (this.visible) return;
    this.visible = true;

    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const player = this.scene.player;
    const currentRoom = this.scene.levelManager.currentRoomId;

    const overlay = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x000000, 0.75)
      .setScrollFactor(0).setDepth(300);
    this.elements.push(overlay);

    const panelW = Math.min(cam.width - 40, 520);
    const panelH = Math.min(cam.height - 60, 340);

    const panel = this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1a1008, 0.95)
      .setScrollFactor(0).setDepth(301);
    this.elements.push(panel);

    const border = this.scene.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0x44ff66, 0.25)
      .setScrollFactor(0).setDepth(300);
    this.elements.push(border);

    const title = this.scene.add.text(cx, cy - panelH / 2 + 18, 'DUNGEON MAP', {
      fontSize: '16px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(302);
    this.elements.push(title);

    const gridW = panelW - 80;
    const gridH = panelH - 80;
    const mapCx = cx;
    const mapCy = cy + 10;

    const maxCol = Math.max(...Object.values(ROOM_DATA).map(r => r.col));
    const maxRow = Math.max(...Object.values(ROOM_DATA).map(r => r.row));
    const cellW = gridW / Math.max(maxCol, 1);
    const cellH = gridH / Math.max(maxRow, 1);

    const getPos = (roomId) => {
      const rd = ROOM_DATA[roomId];
      const rx = mapCx - gridW / 2 + rd.col * cellW;
      const ry = mapCy - gridH / 2 + rd.row * cellH;
      return { x: rx, y: ry };
    };

    for (const [a, b] of CONNECTIONS) {
      const visited = player.visitedRooms.has(a) && player.visitedRooms.has(b);
      const pa = getPos(a);
      const pb = getPos(b);
      const g = this.scene.add.graphics().setScrollFactor(0).setDepth(302);
      g.lineStyle(2, visited ? 0x44ff66 : 0x333322, visited ? 0.5 : 0.25);
      g.lineBetween(pa.x, pa.y, pb.x, pb.y);
      this.elements.push(g);
    }

    for (const [roomId, rd] of Object.entries(ROOM_DATA)) {
      const visited = player.visitedRooms.has(roomId);
      const isCurrent = roomId === currentRoom;
      const pos = getPos(roomId);

      const nodeSize = isCurrent ? 14 : 10;
      const nodeColor = isCurrent ? 0x44ff66 : visited ? 0x668844 : 0x333322;
      const nodeAlpha = visited ? 1 : 0.4;

      const node = this.scene.add.rectangle(pos.x, pos.y, nodeSize, nodeSize, nodeColor, nodeAlpha)
        .setScrollFactor(0).setDepth(303);
      this.elements.push(node);

      if (isCurrent) {
        const glow = this.scene.add.rectangle(pos.x, pos.y, nodeSize + 8, nodeSize + 8, 0x44ff66, 0.2)
          .setScrollFactor(0).setDepth(302);
        this.elements.push(glow);
        this.scene.tweens.add({
          targets: glow, alpha: 0.05, duration: 800, yoyo: true, repeat: -1,
        });
      }

      if (visited) {
        const label = this.scene.add.text(pos.x, pos.y + nodeSize / 2 + 8, rd.label, {
          fontSize: '9px', fontFamily: 'monospace',
          color: isCurrent ? '#44ff66' : '#8a7858',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(303);
        this.elements.push(label);
      } else {
        const label = this.scene.add.text(pos.x, pos.y + nodeSize / 2 + 8, '???', {
          fontSize: '9px', fontFamily: 'monospace', color: '#444433',
          stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(303);
        this.elements.push(label);
      }
    }

    const hint = this.scene.add.text(cx, cy + panelH / 2 - 16,
      'ontouchstart' in window ? '[ TAP TO CLOSE ]' : '[ M TO CLOSE ]', {
        fontSize: '11px', fontFamily: 'monospace', color: '#6a5838',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(303);
    this.elements.push(hint);

    for (const el of this.elements) {
      if (el.setAlpha) {
        const target = el.alpha;
        el.setAlpha(0);
        this.scene.tweens.add({
          targets: el, alpha: target, duration: 200,
        });
      }
    }
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;

    this.scene.tweens.add({
      targets: this.elements, alpha: 0, duration: 150,
      onComplete: () => {
        for (const el of this.elements) {
          if (el.destroy) el.destroy();
        }
        this.elements = [];
      },
    });
  }
}
