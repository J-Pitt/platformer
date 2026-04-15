/**
 * Shared helpers so title / intro menus work with Bluetooth TV remotes and
 * similar devices that show up as gamepads or send non-standard key codes.
 */

const STICK_DEADZONE = 0.25;
const GP_SOUTH = 0;
const GP_EAST = 1;
const GP_NORTH = 3;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;
const GP_DPAD_LEFT = 14;
const GP_DPAD_RIGHT = 15;

const MAX_SLOTS = 16;

export function getFirstConnectedGamepad() {
  if (!navigator.getGamepads) return null;
  const list = navigator.getGamepads();
  if (!list) return null;
  const len = typeof list.length === 'number' ? list.length : MAX_SLOTS;
  for (let i = 0; i < Math.max(len, MAX_SLOTS); i++) {
    const g = list[i];
    if (g && g.connected) return g;
  }
  return null;
}

function btnPressed(pad, i) {
  const b = pad.buttons[i];
  return !!(b && (b.pressed || (typeof b.value === 'number' && b.value > 0.5)));
}

/**
 * First frame any face / shoulder / stick-press fires (for “skip intro”).
 * @param {number[]} prevPressed - per-button pressed state last frame; mutated to match current.
 */
export function pollAnyGamepadActionEdge(pad, prevPressed) {
  let edge = false;
  for (let i = 0; i < pad.buttons.length; i++) {
    const p = btnPressed(pad, i);
    if (p && !prevPressed[i]) edge = true;
    prevPressed[i] = p;
  }
  return edge;
}

/**
 * @param {Gamepad} pad
 * @param {{ up: boolean, down: boolean, confirm: boolean }} prevHeld
 * @returns {{ up: boolean, down: boolean, confirm: boolean, upEdge: boolean, downEdge: boolean, confirmEdge: boolean }}
 */
export function pollMenuGamepadEdges(pad, prevHeld) {
  let up = false;
  let down = false;
  let confirm = false;

  const axes = pad.axes;
  if (axes && axes.length >= 2) {
    const ay = axes[1];
    if (ay < -STICK_DEADZONE) up = true;
    if (ay > STICK_DEADZONE) down = true;
  }

  if (btnPressed(pad, GP_DPAD_UP)) up = true;
  if (btnPressed(pad, GP_DPAD_DOWN)) down = true;
  if (btnPressed(pad, GP_DPAD_LEFT) || btnPressed(pad, GP_DPAD_RIGHT)) {
    /* ignore horizontal for vertical list */
  }

  if (btnPressed(pad, GP_SOUTH) || btnPressed(pad, GP_NORTH)) {
    confirm = true;
  }
  for (const idx of [8, 9]) {
    if (btnPressed(pad, idx)) confirm = true;
  }

  const upEdge = up && !prevHeld.up;
  const downEdge = down && !prevHeld.down;
  const confirmEdge = confirm && !prevHeld.confirm;

  return {
    up,
    down,
    confirm,
    upEdge,
    downEdge,
    confirmEdge,
  };
}

/**
 * @param {KeyboardEvent} e
 * @returns {{ navUp: boolean, navDown: boolean, confirm: boolean }}
 */
export function interpretMenuRemoteKeydown(e) {
  if (e.repeat) return { navUp: false, navDown: false, confirm: false };

  const { key, code } = e;

  const navUp = key === 'ArrowUp' || key === 'PageUp' || key === 'Home'
    || key === 'w' || key === 'W' || key === 'k' || key === 'K'
    || code === 'Numpad8';

  const navDown = key === 'ArrowDown' || key === 'PageDown' || key === 'End'
    || key === 's' || key === 'S' || key === 'j' || key === 'J'
    || code === 'Numpad2';

  const confirm = key === 'Enter' || key === ' ' || key === 'NumpadEnter'
    || code === 'Space' || code === 'Enter' || code === 'NumpadEnter';

  return { navUp, navDown, confirm };
}
