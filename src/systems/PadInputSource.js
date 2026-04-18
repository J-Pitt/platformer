/**
 * Dedicated gamepad-only input source.
 *
 * Unlike `InputManager` (which fans keyboard + touch + the first-available
 * gamepad into a single state for the main player), this class is bound to
 * exactly one gamepad slot and produces the same `state` shape that
 * `Player.getInputState()` consumes. It is used for Player 2 in couch co-op.
 *
 * No keyboard / touch fallback on purpose: the keyboard is P1's, and we
 * don't want a stray WASD press to accidentally steer P2.
 */

const GP_SOUTH = 0;
const GP_EAST = 1;
const GP_WEST = 2;
const GP_NORTH = 3;
const GP_L1 = 4;
const GP_R1 = 5;
const GP_L2 = 6;
const GP_R2 = 7;
const GP_SELECT = 8;
const GP_START = 9;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;
const GP_DPAD_LEFT = 14;
const GP_DPAD_RIGHT = 15;

const STICK_DEADZONE = 0.25;

function btnDown(pad, i) {
  const b = pad?.buttons?.[i];
  return !!(b && (b.pressed || (typeof b.value === 'number' && b.value > 0.5)));
}

export class PadInputSource {
  constructor(padIndex) {
    this.padIndex = padIndex;
    this.prevButtons = {};
    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      jumpPressed: false,
      jumpHeld: false,
      dashPressed: false,
      slashPressed: false,
      interactPressed: false,
      kickPressed: false,
      throwPressed: false,
      menuPressed: false,
      pausePressed: false,
      confirmPressed: false,
      cancelPressed: false,
      navLeftPressed: false,
      navRightPressed: false,
      navUpPressed: false,
      navDownPressed: false,
      l1Pressed: false,
      r1Pressed: false,
    };
  }

  getPad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const list = navigator.getGamepads();
    if (!list) return null;
    const pad = list[this.padIndex];
    return pad && pad.connected ? pad : null;
  }

  /** Returns true if the assigned slot has gone away. */
  isDisconnected() {
    return !this.getPad();
  }

  /** Updates `this.state` in place. Safe to call every frame. */
  update() {
    const pad = this.getPad();
    const s = this.state;

    if (!pad) {
      for (const k of Object.keys(s)) s[k] = false;
      this.prevButtons = {};
      return s;
    }

    let left = btnDown(pad, GP_DPAD_LEFT);
    let right = btnDown(pad, GP_DPAD_RIGHT);
    let up = btnDown(pad, GP_DPAD_UP);
    let down = btnDown(pad, GP_DPAD_DOWN);
    const axes = pad.axes;
    if (axes && axes.length >= 2) {
      if (axes[0] < -STICK_DEADZONE) left = true;
      if (axes[0] > STICK_DEADZONE) right = true;
      if (axes[1] < -STICK_DEADZONE) up = true;
      if (axes[1] > STICK_DEADZONE) down = true;
    }

    const edge = (i) => btnDown(pad, i) && !this.prevButtons[i];

    s.left = left;
    s.right = right;
    s.up = up;
    s.down = down;

    s.jumpHeld = btnDown(pad, GP_SOUTH);
    s.jumpPressed = edge(GP_SOUTH);
    s.dashPressed = edge(GP_EAST) || edge(GP_R1);
    s.slashPressed = edge(GP_WEST) || edge(GP_L1);
    s.interactPressed = edge(GP_NORTH);
    s.kickPressed = edge(GP_R2);
    s.throwPressed = edge(GP_L2);
    s.menuPressed = edge(GP_START);
    s.pausePressed = edge(GP_SELECT);
    s.confirmPressed = edge(GP_SOUTH);
    s.cancelPressed = edge(GP_EAST);
    s.l1Pressed = edge(GP_L1);
    s.r1Pressed = edge(GP_R1);

    // Menu-nav edges aren't used by Player; keep them off for P2 so they
    // can't open menus (P1 owns the pause / inventory UI).
    s.navLeftPressed = false;
    s.navRightPressed = false;
    s.navUpPressed = false;
    s.navDownPressed = false;

    for (let i = 0; i < (pad.buttons?.length ?? 0); i++) {
      const b = pad.buttons[i];
      this.prevButtons[i] = !!(b && (b.pressed || b.value > 0.5));
    }

    return s;
  }

  /** Did the assigned pad just press *any* face/shoulder button this frame?
   *  Used for "press any button to join" detection by the owner. */
  static anyActionEdge(pad, prevButtons) {
    if (!pad) return false;
    let edge = false;
    for (let i = 0; i < (pad.buttons?.length ?? 0); i++) {
      const b = pad.buttons[i];
      const now = !!(b && (b.pressed || b.value > 0.5));
      if (now && !prevButtons[i]) edge = true;
      prevButtons[i] = now;
    }
    return edge;
  }
}
