import { TouchControls } from './TouchControls.js';

const GP_SOUTH = 0;
const GP_EAST = 1;
const GP_WEST = 2;
const GP_NORTH = 3;
const GP_L1 = 4;
const GP_R1 = 5;
const GP_DPAD_UP = 12;
const GP_DPAD_DOWN = 13;
const GP_DPAD_LEFT = 14;
const GP_DPAD_RIGHT = 15;

const STICK_DEADZONE = 0.25;
const MAX_GAMEPAD_SLOTS = 16;

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.padIndex = -1;
    this.shown = false;
    this.hintShown = false;
    this.coopMode = false;
    this.onlineMode = false;
    /** 0 = local is P1 (green), 1 = local is P2 (blue) */
    this.localPlayerSlot = 0;

    this.touch = new TouchControls();

    this.prevButtons = {};
    this.prevButtons2 = {};

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
    };

    this.state2 = {
      left: false,
      right: false,
      up: false,
      down: false,
      jumpPressed: false,
      jumpHeld: false,
      dashPressed: false,
      slashPressed: false,
      interactPressed: false,
    };

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

  setOnlineMode(enabled, localPlayerSlot) {
    this.onlineMode = !!enabled;
    this.localPlayerSlot = localPlayerSlot === 1 ? 1 : 0;
    if (this.onlineMode) this.coopMode = false;
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

    return {
      left: gpLeft, right: gpRight, up: gpUp, down: gpDown,
      jumpPressed: gpJumpPressed, jumpHeld: gpJumpHeld,
      dashPressed: gpDashPressed, slashPressed: gpSlashPressed,
      interactPressed: gpInteractPressed,
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

    let tLeft = false, tRight = false, tUp = false, tDown = false;
    let tJumpPressed = false, tJumpHeld = false;
    let tDashPressed = false, tSlashPressed = false;

    if (this.touch.active) {
      const t = this.touch.consume();
      tLeft = !!(t.left && t.left.pressed);
      tRight = !!(t.right && t.right.pressed);
      tUp = !!(t.up && t.up.pressed);
      tDown = !!(t.down && t.down.pressed);
      tJumpPressed = !!(t.jump && t.jump.justPressed);
      tJumpHeld = !!(t.jump && t.jump.held);
      tDashPressed = !!(t.dash && t.dash.justPressed);
      tSlashPressed = !!(t.slash && t.slash.justPressed);
    }

    const pad = this.getGamepad();

    if (this.onlineMode) {
      let gpState = null;
      if (pad) {
        if (!this.shown) this.showControllerConnected(pad.id);
        gpState = this.readGamepadState(pad, this.prevButtons);
        this.storePrevButtons(pad);
      }

      const local = {
        left: kbLeft || tLeft || (gpState && gpState.left),
        right: kbRight || tRight || (gpState && gpState.right),
        up: kbUp || tUp || (gpState && gpState.up),
        down: kbDown || tDown || (gpState && gpState.down),
        jumpPressed: kbJumpPressed || tJumpPressed || (gpState && gpState.jumpPressed),
        jumpHeld: kbJumpHeld || tJumpHeld || (gpState && gpState.jumpHeld),
        dashPressed: kbDashPressed || tDashPressed || (gpState && gpState.dashPressed),
        slashPressed: kbSlashPressed || tSlashPressed || (gpState && gpState.slashPressed),
        interactPressed: kbInteractPressed || (gpState && gpState.interactPressed),
      };

      const z = () => ({
        left: false, right: false, up: false, down: false,
        jumpPressed: false, jumpHeld: false, dashPressed: false, slashPressed: false, interactPressed: false,
      });

      if (this.localPlayerSlot === 0) {
        Object.assign(this.state, local);
        Object.assign(this.state2, z());
      } else {
        Object.assign(this.state2, local);
        Object.assign(this.state, z());
      }
    } else if (this.coopMode) {
      // Co-op: keyboard + touch -> P1, gamepad -> P2
      this.state.left = kbLeft || tLeft;
      this.state.right = kbRight || tRight;
      this.state.up = kbUp || tUp;
      this.state.down = kbDown || tDown;
      this.state.jumpPressed = kbJumpPressed || tJumpPressed;
      this.state.jumpHeld = kbJumpHeld || tJumpHeld;
      this.state.dashPressed = kbDashPressed || tDashPressed;
      this.state.slashPressed = kbSlashPressed || tSlashPressed;
      this.state.interactPressed = kbInteractPressed;

      if (pad) {
        if (!this.shown) this.showControllerConnected(pad.id);
        const gp = this.readGamepadState(pad, this.prevButtons);
        this.state2.left = gp.left;
        this.state2.right = gp.right;
        this.state2.up = gp.up;
        this.state2.down = gp.down;
        this.state2.jumpPressed = gp.jumpPressed;
        this.state2.jumpHeld = gp.jumpHeld;
        this.state2.dashPressed = gp.dashPressed;
        this.state2.slashPressed = gp.slashPressed;
        this.state2.interactPressed = gp.interactPressed;
        this.storePrevButtons(pad);
      } else {
        this.state2.left = false;
        this.state2.right = false;
        this.state2.up = false;
        this.state2.down = false;
        this.state2.jumpPressed = false;
        this.state2.jumpHeld = false;
        this.state2.dashPressed = false;
        this.state2.slashPressed = false;
        this.state2.interactPressed = false;
      }
    } else {
      // Solo: keyboard + touch + gamepad all -> P1
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
