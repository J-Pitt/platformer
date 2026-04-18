/**
 * In-scene modals for the title screen. Fully pointer + keyboard + gamepad
 * driven so nothing relies on `window.prompt` / `window.confirm`.
 *
 * Two modals are provided:
 *   - createNameEntry(scene, { initial, onConfirm, onCancel })
 *   - createConfirm  (scene, { message, yesLabel, noLabel, onYes, onNo })
 *
 * Both return a handle with:
 *   handle.handleKeyboard(e)      // wire to your scene's keydown listener
 *   handle.pollGamepad(pad, held) // call each frame; mutates `held`
 *   handle.close()                // programmatic dismiss (invokes onCancel/onNo)
 *   handle.isOpen
 *
 * Rendering lives on its own depth above the rest of the scene so it sits
 * cleanly on top of anything the scene had drawn.
 */

const DEPTH_DIM = 800;
const DEPTH_PANEL = 801;
const DEPTH_CONTENT = 802;
const DEPTH_HIGHLIGHT = 803;

const GP_SOUTH = 0;
const GP_EAST = 1;
const GP_WEST = 2;
const GP_SELECT = 8;
const GP_START = 9;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;
const GP_DPAD_LEFT = 14;
const GP_DPAD_RIGHT = 15;
const NAV_DEAD = 0.55;

function btn(pad, i) {
  const b = pad.buttons[i];
  return !!(b && (b.pressed || (typeof b.value === 'number' && b.value > 0.5)));
}

function readPadNav(pad) {
  let up = btn(pad, GP_DPAD_UP);
  let down = btn(pad, GP_DPAD_DOWN);
  let left = btn(pad, GP_DPAD_LEFT);
  let right = btn(pad, GP_DPAD_RIGHT);
  const axes = pad.axes;
  if (axes && axes.length >= 2) {
    if (axes[0] < -NAV_DEAD) left = true;
    if (axes[0] > NAV_DEAD) right = true;
    if (axes[1] < -NAV_DEAD) up = true;
    if (axes[1] > NAV_DEAD) down = true;
  }
  return {
    up, down, left, right,
    confirm: btn(pad, GP_SOUTH),
    cancel: btn(pad, GP_EAST),
    alt1: btn(pad, GP_WEST),
    start: btn(pad, GP_START),
    select: btn(pad, GP_SELECT),
  };
}

// ── Name entry ──────────────────────────────────────────────────────────

const KEY_GRID_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3'],
  ['4', '5', '6', '7', '8', '9', '-', '_', '.', "'"],
  ['SPACE', 'SPACE', 'SPACE', 'DEL', 'DEL', 'CANCEL', 'CANCEL', 'CANCEL', 'OK', 'OK'],
];
const COLS = 10;
const ROWS = KEY_GRID_ROWS.length;
const MAX_NAME_LEN = 16;

export function createNameEntry(scene, {
  initial = 'Traveler',
  title = 'ENTER YOUR NAME',
  maxLen = MAX_NAME_LEN,
  onConfirm,
  onCancel,
} = {}) {
  const cam = scene.cameras.main;
  const cx = cam.width / 2;
  const cy = cam.height / 2;

  const panelW = Math.min(cam.width - 40, 520);
  const panelH = 300;

  const elements = [];
  const push = (el) => { elements.push(el); return el; };

  let buffer = String(initial || '').slice(0, maxLen);
  let cursorRow = 0;
  let cursorCol = 0;
  let isOpen = true;

  // Dim backdrop
  push(scene.add.rectangle(cx, cy, cam.width, cam.height, 0x02030a, 0.72)
    .setScrollFactor(0).setDepth(DEPTH_DIM).setInteractive());

  // Panel
  push(scene.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0x44ff66, 0.55)
    .setScrollFactor(0).setDepth(DEPTH_PANEL));
  push(scene.add.rectangle(cx, cy, panelW, panelH, 0x0b0f0a, 0.97)
    .setScrollFactor(0).setDepth(DEPTH_PANEL));

  // Title
  push(scene.add.text(cx, cy - panelH / 2 + 22, title, {
    fontSize: '18px', fontFamily: 'monospace', color: '#44ff66',
    stroke: '#000', strokeThickness: 4,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT));

  // Name field
  const nameFieldY = cy - panelH / 2 + 70;
  const nameField = scene.add.rectangle(cx, nameFieldY, panelW - 40, 36, 0x061107, 0.95)
    .setScrollFactor(0).setDepth(DEPTH_CONTENT);
  push(nameField);
  const nameBorder = scene.add.rectangle(cx, nameFieldY, panelW - 40 + 2, 36 + 2, 0x44ff66, 0.4)
    .setScrollFactor(0).setDepth(DEPTH_CONTENT);
  push(nameBorder);
  const nameText = scene.add.text(cx, nameFieldY, '', {
    fontSize: '20px', fontFamily: 'monospace', color: '#d4ffda',
    stroke: '#000', strokeThickness: 3,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT);
  push(nameText);

  let caretVisible = true;
  const caretTimer = scene.time.addEvent({
    delay: 450,
    loop: true,
    callback: () => { caretVisible = !caretVisible; refreshName(); },
  });

  const refreshName = () => {
    const shown = buffer + (caretVisible ? '_' : ' ');
    nameText.setText(shown);
  };
  refreshName();

  // Key grid
  const gridTop = nameFieldY + 34;
  const gridLeft = cx - panelW / 2 + 28;
  const cellW = (panelW - 56) / COLS;
  const cellH = 26;

  const cellNodes = []; // [row][col] = { bg, txt, label }
  for (let r = 0; r < ROWS; r++) {
    cellNodes[r] = [];
    for (let c = 0; c < COLS; c++) {
      const label = KEY_GRID_ROWS[r][c];
      // Skip continuation cells of wide buttons (same label adjacent)
      const prevLabel = c > 0 ? KEY_GRID_ROWS[r][c - 1] : null;
      if (label === prevLabel) { cellNodes[r][c] = null; continue; }

      // Compute span (how many cells wide this button is)
      let span = 1;
      while (c + span < COLS && KEY_GRID_ROWS[r][c + span] === label) span++;

      const x = gridLeft + (c + span / 2) * cellW;
      const y = gridTop + r * cellH + cellH / 2;
      const w = cellW * span - 4;

      const bg = scene.add.rectangle(x, y, w, cellH - 4, 0x162018, 0.8)
        .setScrollFactor(0).setDepth(DEPTH_CONTENT)
        .setInteractive({ useHandCursor: true });
      push(bg);

      const displayText =
        label === 'SPACE' ? 'SPACE'
          : label === 'DEL' ? 'DEL'
            : label === 'OK' ? 'OK'
              : label === 'CANCEL' ? 'CANCEL'
                : label;

      const t = scene.add.text(x, y, displayText, {
        fontSize: label.length > 1 ? '11px' : '14px',
        fontFamily: 'monospace', color: '#cfe8d0',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT + 1);
      push(t);

      bg.on('pointerdown', () => {
        cursorRow = r;
        cursorCol = c;
        activateCurrent();
      });
      bg.on('pointerover', () => {
        cursorRow = r;
        cursorCol = c;
        refreshHighlight();
      });

      const node = { bg, txt: t, label, col: c, row: r, span };
      for (let k = 0; k < span; k++) cellNodes[r][c + k] = node;
      c += span - 1;
    }
  }

  // Find the "canonical" column for a cell index so navigation lands on the
  // same wide button when moving up/down.
  const canonicalCol = (r, c) => {
    const node = cellNodes[r][c];
    return node ? node.col : c;
  };

  const refreshHighlight = () => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const node = cellNodes[r][c];
        if (!node) continue;
        if (c !== node.col) continue; // only touch canonical cell once
        const active = r === cursorRow
          && canonicalCol(r, cursorCol) === node.col;
        if (active) {
          node.bg.setFillStyle(0x44ff66, 0.25);
          node.bg.setStrokeStyle(2, 0x44ff66, 0.9);
          node.txt.setColor('#eaffea');
        } else {
          node.bg.setFillStyle(0x162018, 0.8);
          node.bg.setStrokeStyle(0);
          node.txt.setColor('#cfe8d0');
        }
      }
    }
  };
  refreshHighlight();

  // Footer hint
  push(scene.add.text(cx, cy + panelH / 2 - 18,
    '[ TYPE / ← → ↑ ↓ ]   [ A · ENTER TO INSERT ]   [ X · SPACE ]   [ B · BACKSPACE ]   [ START · OK ]   [ SELECT · CANCEL ]',
    {
      fontSize: '9px', fontFamily: 'monospace', color: '#5a7060',
      stroke: '#000', strokeThickness: 2,
      align: 'center',
      wordWrap: { width: panelW - 40 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT));

  // ── Actions ─────────────────────────────────────────────────────────
  const insertChar = (ch) => {
    if (buffer.length >= maxLen) return;
    buffer += ch;
    refreshName();
  };
  const backspace = () => {
    if (buffer.length === 0) return;
    buffer = buffer.slice(0, -1);
    refreshName();
  };
  const insertSpace = () => insertChar(' ');

  const confirmName = () => {
    const clean = buffer.trim().slice(0, maxLen) || 'Traveler';
    cleanup();
    if (typeof onConfirm === 'function') onConfirm(clean);
  };
  const cancelName = () => {
    cleanup();
    if (typeof onCancel === 'function') onCancel();
  };

  const activateCurrent = () => {
    const node = cellNodes[cursorRow][cursorCol];
    if (!node) return;
    cursorCol = node.col;
    refreshHighlight();
    const lbl = node.label;
    if (lbl === 'SPACE') return insertSpace();
    if (lbl === 'DEL') return backspace();
    if (lbl === 'OK') return confirmName();
    if (lbl === 'CANCEL') return cancelName();
    insertChar(lbl);
  };

  const moveCursor = (dx, dy) => {
    let nr = cursorRow;
    let nc = cursorCol;
    if (dx !== 0) {
      // Move by whole-cell (respecting wide buttons)
      const step = dx > 0 ? 1 : -1;
      let safety = 0;
      while (safety++ < COLS) {
        nc = (nc + step + COLS) % COLS;
        const node = cellNodes[nr][nc];
        if (node && node.col === nc) break;
      }
    }
    if (dy !== 0) {
      nr = (nr + dy + ROWS) % ROWS;
      // Snap to canonical col of whatever we land on
      const node = cellNodes[nr][Math.min(nc, COLS - 1)];
      if (node) nc = node.col;
    }
    cursorRow = nr;
    cursorCol = nc;
    refreshHighlight();
  };

  // ── Cleanup ─────────────────────────────────────────────────────────
  const cleanup = () => {
    if (!isOpen) return;
    isOpen = false;
    if (caretTimer) caretTimer.remove();
    for (const el of elements) if (el && el.destroy) el.destroy();
  };

  // ── Input handlers ──────────────────────────────────────────────────
  const handleKeyboard = (e) => {
    if (!isOpen) return false;
    const { key } = e;

    if (key === 'Enter') { confirmName(); e.preventDefault(); return true; }
    if (key === 'Escape') { cancelName(); e.preventDefault(); return true; }
    if (key === 'Backspace') { backspace(); e.preventDefault(); return true; }
    if (key === 'Tab') { e.preventDefault(); return true; }

    if (key === 'ArrowLeft') { moveCursor(-1, 0); e.preventDefault(); return true; }
    if (key === 'ArrowRight') { moveCursor(1, 0); e.preventDefault(); return true; }
    if (key === 'ArrowUp') { moveCursor(0, -1); e.preventDefault(); return true; }
    if (key === 'ArrowDown') { moveCursor(0, 1); e.preventDefault(); return true; }

    if (key.length === 1) {
      const ch = key;
      // Accept letters, digits, space, and a few punctuation marks.
      if (/^[A-Za-z0-9 \-_.']$/.test(ch)) {
        insertChar(ch.length === 1 ? ch.toUpperCase() : ch);
        e.preventDefault();
        return true;
      }
    }
    return false;
  };

  const pollGamepad = (pad, held) => {
    if (!isOpen || !pad) return;
    const s = readPadNav(pad);
    const edge = (k, cur) => cur && !held[k];
    if (edge('up', s.up)) moveCursor(0, -1);
    else if (edge('down', s.down)) moveCursor(0, 1);
    else if (edge('left', s.left)) moveCursor(-1, 0);
    else if (edge('right', s.right)) moveCursor(1, 0);
    else if (edge('confirm', s.confirm)) activateCurrent();
    else if (edge('cancel', s.cancel)) backspace();
    else if (edge('alt1', s.alt1)) insertSpace();
    else if (edge('start', s.start)) confirmName();
    else if (edge('select', s.select)) cancelName();

    held.up = s.up; held.down = s.down;
    held.left = s.left; held.right = s.right;
    held.confirm = s.confirm; held.cancel = s.cancel;
    held.alt1 = s.alt1; held.start = s.start; held.select = s.select;
  };

  return {
    get isOpen() { return isOpen; },
    handleKeyboard,
    pollGamepad,
    close: cancelName,
  };
}

// ── Yes / no confirm ────────────────────────────────────────────────────

export function createConfirm(scene, {
  title = 'Confirm',
  message = '',
  yesLabel = 'YES',
  noLabel = 'NO',
  destructive = false,
  onYes,
  onNo,
} = {}) {
  const cam = scene.cameras.main;
  const cx = cam.width / 2;
  const cy = cam.height / 2;

  const panelW = Math.min(cam.width - 40, 420);
  const panelH = 180;

  const elements = [];
  const push = (el) => { elements.push(el); return el; };

  let selected = 1; // default to NO (safer for destructive)
  let isOpen = true;

  push(scene.add.rectangle(cx, cy, cam.width, cam.height, 0x02030a, 0.72)
    .setScrollFactor(0).setDepth(DEPTH_DIM).setInteractive());

  const accent = destructive ? 0xff6644 : 0x44ff66;
  push(scene.add.rectangle(cx, cy, panelW + 4, panelH + 4, accent, 0.55)
    .setScrollFactor(0).setDepth(DEPTH_PANEL));
  push(scene.add.rectangle(cx, cy, panelW, panelH, 0x0b0f0a, 0.97)
    .setScrollFactor(0).setDepth(DEPTH_PANEL));

  push(scene.add.text(cx, cy - panelH / 2 + 22, title.toUpperCase(), {
    fontSize: '16px', fontFamily: 'monospace',
    color: destructive ? '#ff8866' : '#44ff66',
    stroke: '#000', strokeThickness: 4,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT));

  push(scene.add.text(cx, cy - 20, message, {
    fontSize: '13px', fontFamily: 'monospace', color: '#d4c8a8',
    stroke: '#000', strokeThickness: 2,
    align: 'center',
    wordWrap: { width: panelW - 40 },
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT));

  const btnY = cy + panelH / 2 - 40;
  const btnW = 100;
  const btnH = 32;
  const gap = 30;

  const yesBg = scene.add.rectangle(cx - btnW / 2 - gap / 2, btnY, btnW, btnH, 0x162018, 0.9)
    .setScrollFactor(0).setDepth(DEPTH_CONTENT).setInteractive({ useHandCursor: true });
  push(yesBg);
  const yesTxt = scene.add.text(yesBg.x, btnY, yesLabel, {
    fontSize: '13px', fontFamily: 'monospace', color: '#cfe8d0',
    stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT + 1);
  push(yesTxt);

  const noBg = scene.add.rectangle(cx + btnW / 2 + gap / 2, btnY, btnW, btnH, 0x162018, 0.9)
    .setScrollFactor(0).setDepth(DEPTH_CONTENT).setInteractive({ useHandCursor: true });
  push(noBg);
  const noTxt = scene.add.text(noBg.x, btnY, noLabel, {
    fontSize: '13px', fontFamily: 'monospace', color: '#cfe8d0',
    stroke: '#000', strokeThickness: 2,
  }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT + 1);
  push(noTxt);

  push(scene.add.text(cx, cy + panelH / 2 - 12,
    '[ ← → ]   [ A · ENTER · CHOOSE ]   [ B · ESC · NO ]', {
      fontSize: '9px', fontFamily: 'monospace', color: '#5a7060',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH_CONTENT));

  const highlight = () => {
    const opts = [
      { bg: yesBg, txt: yesTxt },
      { bg: noBg, txt: noTxt },
    ];
    opts.forEach((o, i) => {
      if (i === selected) {
        o.bg.setFillStyle(accent, 0.25);
        o.bg.setStrokeStyle(2, accent, 0.95);
        o.txt.setColor('#eaffea');
      } else {
        o.bg.setFillStyle(0x162018, 0.9);
        o.bg.setStrokeStyle(0);
        o.txt.setColor('#cfe8d0');
      }
    });
  };
  highlight();

  const cleanup = () => {
    if (!isOpen) return;
    isOpen = false;
    for (const el of elements) if (el && el.destroy) el.destroy();
  };

  const answerYes = () => { cleanup(); if (typeof onYes === 'function') onYes(); };
  const answerNo = () => { cleanup(); if (typeof onNo === 'function') onNo(); };
  const activate = () => { if (selected === 0) answerYes(); else answerNo(); };

  yesBg.on('pointerdown', () => { selected = 0; highlight(); activate(); });
  yesBg.on('pointerover', () => { selected = 0; highlight(); });
  noBg.on('pointerdown', () => { selected = 1; highlight(); activate(); });
  noBg.on('pointerover', () => { selected = 1; highlight(); });

  const handleKeyboard = (e) => {
    if (!isOpen) return false;
    const { key } = e;
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      selected = 0; highlight(); e.preventDefault(); return true;
    }
    if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      selected = 1; highlight(); e.preventDefault(); return true;
    }
    if (key === 'Enter' || key === ' ') {
      activate(); e.preventDefault(); return true;
    }
    if (key === 'Escape') { answerNo(); e.preventDefault(); return true; }
    if (key === 'y' || key === 'Y') { answerYes(); e.preventDefault(); return true; }
    if (key === 'n' || key === 'N') { answerNo(); e.preventDefault(); return true; }
    return false;
  };

  const pollGamepad = (pad, held) => {
    if (!isOpen || !pad) return;
    const s = readPadNav(pad);
    const edge = (k, cur) => cur && !held[k];
    if (edge('left', s.left)) { selected = 0; highlight(); }
    else if (edge('right', s.right)) { selected = 1; highlight(); }
    else if (edge('confirm', s.confirm)) activate();
    else if (edge('cancel', s.cancel)) answerNo();
    else if (edge('start', s.start)) activate();
    held.left = s.left; held.right = s.right;
    held.confirm = s.confirm; held.cancel = s.cancel;
    held.start = s.start;
  };

  return {
    get isOpen() { return isOpen; },
    handleKeyboard,
    pollGamepad,
    close: answerNo,
  };
}
