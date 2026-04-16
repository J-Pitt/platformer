import * as Phaser from 'phaser';
import { TouchControls } from './TouchControls.js';

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
const NAV_DEADZONE = 0.55;
const MAX_GAMEPAD_SLOTS = 16;

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.padIndex = -1;
    this.shown = false;
    this.hintShown = false;

    this.touch = new TouchControls();

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
      // Generic menu-navigation edges (edge-detected, consumable by UI overlays)
      confirmPressed: false,
      cancelPressed: false,
      navLeftPressed: false,
      navRightPressed: false,
      navUpPressed: false,
      navDownPressed: false,
    };

    // Previous-state snapshots for stick/dpad edge-detection on menus
    this._navPrev = { up: false, down: false, left: false, right: false };

    const onConnected = (e) => {
      console.log('Gamepad connected:', e.gamepad.id, 'index:', e.gamepad.index);
      this.refreshGamepads();
    };

    const onDisconnected = (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (e.gamepad.index === this.padIndex) {
        this.padIndex = -1;
        this.shown = false;
        this.prevButtons = {};
      }
    };

    window.addEventListener('gamepadconnected', onConnected);
    window.addEventListener('gamepaddisconnected', onDisconnected);

    // Firefox / macOS: gamepads often stay hidden until after a user gesture; refresh then
    const wake = () => {
      this.refreshGamepads();
    };
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake, { passive: true });
    window.addEventListener('mousedown', wake, { passive: true });

    this.refreshGamepads();
    this._maybeShowHint();
  }

  /** Scan navigator.getGamepads() every time — required for Firefox (snapshot updates each poll). */
  refreshGamepads() {
    const pad = this.findFirstConnectedGamepad();
    if (pad && this.padIndex < 0) {
      this.padIndex = pad.index;
      this.showControllerConnected(pad.id);
    }
  }

  findFirstConnectedGamepad() {
    if (!navigator.getGamepads) return null;
    const list = navigator.getGamepads();
    if (!list) return null;
    const len = typeof list.length === 'number' ? list.length : MAX_GAMEPAD_SLOTS;
    for (let i = 0; i < Math.max(len, MAX_GAMEPAD_SLOTS); i++) {
      const g = list[i];
      if (g && g.connected) return g;
    }
    return null;
  }

  _maybeShowHint() {
    if (!navigator.getGamepads) return;
    if (this.touch.active) return;
    this.scene.time.delayedCall(4000, () => {
      if (this.findFirstConnectedGamepad()) return;
      if (this.hintShown) return;
      this.hintShown = true;
      const cam = this.scene.cameras.main;
      const t = this.scene.add.text(
        cam.width / 2,
        cam.height - 28,
        'No gamepad yet — click the game, then press any controller button (use Xbox mode on 8BitDo for macOS)',
        {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#668899',
          align: 'center',
          wordWrap: { width: cam.width - 40 },
        },
      ).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0);
      this.scene.tweens.add({
        targets: t, alpha: 0.85, duration: 500,
      });
      this.scene.time.delayedCall(14000, () => {
        this.scene.tweens.add({
          targets: t, alpha: 0, duration: 800,
          onComplete: () => t.destroy(),
        });
      });
    });
  }

  showControllerConnected(name) {
    if (this.shown) return;
    this.shown = true;

    const text = this.scene.add.text(480, 500, `Controller: ${name}`, {
      fontSize: '13px', fontFamily: 'monospace', color: '#40ffd8',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0);

    this.scene.tweens.add({
      targets: text, alpha: 0.8, duration: 400, hold: 2500, yoyo: true,
      onComplete: () => text.destroy(),
    });
  }

  getGamepad() {
    if (!navigator.getGamepads) return null;
    const list = navigator.getGamepads();
    if (!list) return null;

    if (this.padIndex >= 0) {
      const g = list[this.padIndex];
      if (g && g.connected) return g;
    }

    const first = this.findFirstConnectedGamepad();
    if (first) {
      if (this.padIndex !== first.index) {
        this.padIndex = first.index;
        if (!this.shown) this.showControllerConnected(first.id);
      }
      return first;
    }

    this.padIndex = -1;
    return null;
  }

  readGamepadState(pad, prevButtons) {
    let gpLeft = false, gpRight = false, gpUp = false, gpDown = false;
    let gpJumpPressed = false, gpJumpHeld = false;
    let gpDashPressed = false, gpSlashPressed = false;

    const axes = pad.axes;
    if (axes && axes.length >= 2) {
      if (axes[0] < -STICK_DEADZONE) gpLeft = true;
      if (axes[0] > STICK_DEADZONE) gpRight = true;
      if (axes[1] < -STICK_DEADZONE) gpUp = true;
      if (axes[1] > STICK_DEADZONE) gpDown = true;
    }

    if (this.btnDown(pad, GP_DPAD_LEFT)) gpLeft = true;
    if (this.btnDown(pad, GP_DPAD_RIGHT)) gpRight = true;
    if (this.btnDown(pad, GP_DPAD_UP)) gpUp = true;
    if (this.btnDown(pad, GP_DPAD_DOWN)) gpDown = true;

    const jumpDown = this.btnDown(pad, GP_SOUTH);
    gpJumpPressed = jumpDown && !prevButtons[GP_SOUTH];
    gpJumpHeld = jumpDown;

    gpDashPressed = (this.btnDown(pad, GP_EAST) && !prevButtons[GP_EAST])
      || (this.btnDown(pad, GP_R1) && !prevButtons[GP_R1]);

    gpSlashPressed = (this.btnDown(pad, GP_WEST) && !prevButtons[GP_WEST])
      || (this.btnDown(pad, GP_L1) && !prevButtons[GP_L1]);

    const gpInteractPressed = this.btnDown(pad, GP_NORTH) && !prevButtons[GP_NORTH];

    // New action edges
    const gpThrowPressed = this.btnDown(pad, GP_L2) && !prevButtons[GP_L2];
    const gpKickPressed = this.btnDown(pad, GP_R2) && !prevButtons[GP_R2];
    const gpMenuPressed = this.btnDown(pad, GP_START) && !prevButtons[GP_START];
    const gpPausePressed = this.btnDown(pad, GP_SELECT) && !prevButtons[GP_SELECT];

    // Menu-nav edges: A=confirm, B=cancel, dpad/stick with deadzone
    const gpConfirmPressed = this.btnDown(pad, GP_SOUTH) && !prevButtons[GP_SOUTH];
    const gpCancelPressed = this.btnDown(pad, GP_EAST) && !prevButtons[GP_EAST];

    let navL = this.btnDown(pad, GP_DPAD_LEFT);
    let navR = this.btnDown(pad, GP_DPAD_RIGHT);
    let navU = this.btnDown(pad, GP_DPAD_UP);
    let navD = this.btnDown(pad, GP_DPAD_DOWN);
    if (axes && axes.length >= 2) {
      if (axes[0] < -NAV_DEADZONE) navL = true;
      if (axes[0] > NAV_DEADZONE) navR = true;
      if (axes[1] < -NAV_DEADZONE) navU = true;
      if (axes[1] > NAV_DEADZONE) navD = true;
    }

    return {
      left: gpLeft, right: gpRight, up: gpUp, down: gpDown,
      jumpPressed: gpJumpPressed, jumpHeld: gpJumpHeld,
      dashPressed: gpDashPressed, slashPressed: gpSlashPressed,
      interactPressed: gpInteractPressed,
      kickPressed: gpKickPressed,
      throwPressed: gpThrowPressed,
      menuPressed: gpMenuPressed,
      pausePressed: gpPausePressed,
      confirmPressed: gpConfirmPressed,
      cancelPressed: gpCancelPressed,
      navL, navR, navU, navD,
    };
  }

  update() {
    const cursors = this.scene.cursors;
    const keys = this.scene.keys;

    const kbLeft = cursors.left.isDown || keys.a.isDown;
    const kbRight = cursors.right.isDown || keys.d.isDown;
    const kbUp = cursors.up.isDown;
    const kbDown = cursors.down.isDown || keys.s.isDown;

    const kbJumpPressed = Phaser.Input.Keyboard.JustDown(cursors.up)
      || Phaser.Input.Keyboard.JustDown(keys.space)
      || Phaser.Input.Keyboard.JustDown(keys.z);
    const kbJumpHeld = cursors.up.isDown || keys.space.isDown || keys.z.isDown;
    const kbDashPressed = Phaser.Input.Keyboard.JustDown(keys.x)
      || Phaser.Input.Keyboard.JustDown(keys.shift)
      || Phaser.Input.Keyboard.JustDown(keys.q);
    const kbSlashPressed = Phaser.Input.Keyboard.JustDown(keys.c)
      || Phaser.Input.Keyboard.JustDown(keys.j)
      || Phaser.Input.Keyboard.JustDown(keys.w);

    const kbInteractPressed = keys.e && Phaser.Input.Keyboard.JustDown(keys.e);
    const kbKickPressed = (keys.f && Phaser.Input.Keyboard.JustDown(keys.f))
      || (keys.k && Phaser.Input.Keyboard.JustDown(keys.k));
    const kbThrowPressed = keys.g && Phaser.Input.Keyboard.JustDown(keys.g);
    const kbMenuPressed = (keys.i && Phaser.Input.Keyboard.JustDown(keys.i))
      || (keys.tab && Phaser.Input.Keyboard.JustDown(keys.tab));
    const kbPausePressed = (keys.p && Phaser.Input.Keyboard.JustDown(keys.p));
    const kbConfirmPressed = Phaser.Input.Keyboard.JustDown(keys.space)
      || (keys.enter && Phaser.Input.Keyboard.JustDown(keys.enter));
    const kbCancelPressed = keys.esc && Phaser.Input.Keyboard.JustDown(keys.esc);

    // Menu-nav edges from keyboard (edge-detected via prev-state)
    const rawNav = {
      up: cursors.up.isDown || keys.w.isDown,
      down: cursors.down.isDown || keys.s.isDown,
      left: cursors.left.isDown || keys.a.isDown,
      right: cursors.right.isDown || keys.d.isDown,
    };
    const kbNavUp = rawNav.up && !this._navPrev.up;
    const kbNavDown = rawNav.down && !this._navPrev.down;
    const kbNavLeft = rawNav.left && !this._navPrev.left;
    const kbNavRight = rawNav.right && !this._navPrev.right;

    let tLeft = false, tRight = false, tUp = false, tDown = false;
    let tJumpPressed = false, tJumpHeld = false;
    let tDashPressed = false, tSlashPressed = false;

    if (this.touch.active) {
      const t = this.touch.consume();
      tLeft = t._stickX < -0.01;
      tRight = t._stickX > 0.01;
      tUp = t._stickY < -0.01;
      tDown = t._stickY > 0.01;
      tJumpPressed = !!(t.jump && t.jump.justPressed);
      tJumpHeld = !!(t.jump && t.jump.held);
      tDashPressed = !!(t.dash && t.dash.justPressed);
      tSlashPressed = !!(t.slash && t.slash.justPressed);
    }

    const pad = this.getGamepad();

    let gpState = null;
    if (pad) {
      if (!this.shown) this.showControllerConnected(pad.id);
      gpState = this.readGamepadState(pad, this.prevButtons);
      this.storePrevButtons(pad);
    }

    this.state.left = kbLeft || tLeft || (gpState && gpState.left);
    this.state.right = kbRight || tRight || (gpState && gpState.right);
    this.state.up = kbUp || tUp || (gpState && gpState.up);
    this.state.down = kbDown || tDown || (gpState && gpState.down);
    this.state.jumpPressed = kbJumpPressed || tJumpPressed || (gpState && gpState.jumpPressed);
    this.state.jumpHeld = kbJumpHeld || tJumpHeld || (gpState && gpState.jumpHeld);
    this.state.dashPressed = kbDashPressed || tDashPressed || (gpState && gpState.dashPressed);
    this.state.slashPressed = kbSlashPressed || tSlashPressed || (gpState && gpState.slashPressed);
    this.state.interactPressed = kbInteractPressed
      || (gpState && gpState.interactPressed);
    this.state.kickPressed = kbKickPressed || (gpState && gpState.kickPressed);
    this.state.throwPressed = kbThrowPressed || (gpState && gpState.throwPressed);
    this.state.menuPressed = kbMenuPressed || (gpState && gpState.menuPressed);
    this.state.pausePressed = kbPausePressed || (gpState && gpState.pausePressed);

    // Generic UI nav edges
    this.state.confirmPressed = kbConfirmPressed || (gpState && gpState.confirmPressed);
    this.state.cancelPressed = kbCancelPressed || (gpState && gpState.cancelPressed);
    this.state.navLeftPressed = kbNavLeft || (gpState && gpState.navL && !this._gpNavPrevL);
    this.state.navRightPressed = kbNavRight || (gpState && gpState.navR && !this._gpNavPrevR);
    this.state.navUpPressed = kbNavUp || (gpState && gpState.navU && !this._gpNavPrevU);
    this.state.navDownPressed = kbNavDown || (gpState && gpState.navD && !this._gpNavPrevD);

    // Snapshot nav state for next frame edge detection
    this._navPrev.up = rawNav.up;
    this._navPrev.down = rawNav.down;
    this._navPrev.left = rawNav.left;
    this._navPrev.right = rawNav.right;
    if (gpState) {
      this._gpNavPrevL = gpState.navL;
      this._gpNavPrevR = gpState.navR;
      this._gpNavPrevU = gpState.navU;
      this._gpNavPrevD = gpState.navD;
    } else {
      this._gpNavPrevL = this._gpNavPrevR = this._gpNavPrevU = this._gpNavPrevD = false;
    }

    return this.state;
  }

  btnDown(pad, index) {
    const btn = pad.buttons[index];
    if (!btn) return false;
    return btn.pressed || btn.value > 0.5;
  }

  wasPrevDown(index) {
    return !!this.prevButtons[index];
  }

  storePrevButtons(pad) {
    for (let i = 0; i < pad.buttons.length; i++) {
      const btn = pad.buttons[i];
      this.prevButtons[i] = !!(btn && (btn.pressed || btn.value > 0.5));
    }
  }

  /**
   * What the *browser* Gamepad API sees (can be empty even if macOS lists the USB device).
   * Open the game with ?gamepaddebug=1 to show this on screen.
   */
  static formatGamepadsDebug() {
    if (!navigator.getGamepads) {
      return 'navigator.getGamepads: not supported';
    }
    const list = navigator.getGamepads();
    const lines = [
      'Browser Gamepad API (not the same as macOS System Info)',
      'Click game + press buttons — slots stay empty until then.',
      '—',
    ];
    if (!list) return lines.join('\n') + '\n(list is null)';
    lines.push(`list.length: ${list.length}`);
    let any = false;
    for (let i = 0; i < 8; i++) {
      const pad = list[i];
      if (!pad) {
        lines.push(`[${i}] —`);
        continue;
      }
      any = true;
      const shortId = (pad.id || '').slice(0, 52);
      lines.push(`[${i}] ${pad.connected ? 'CONNECTED' : 'disconnected'}`);
      lines.push(`     ${shortId}`);
      lines.push(`     map:${pad.mapping} btns:${pad.buttons?.length} axes:${pad.axes?.length}`);
    }
    if (!any) {
      lines.push('');
      lines.push('No gamepad objects in any slot.');
      lines.push('If macOS shows the device: try 8BitDo in');
      lines.push('Xbox mode (X+Start), or test gamepad-tester.com');
    }
    return lines.join('\n');
  }
}
