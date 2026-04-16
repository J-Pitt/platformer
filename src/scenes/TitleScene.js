import * as Phaser from 'phaser';
import * as SaveGame from '../persistence/SaveGame.js';
import {
  getFirstConnectedGamepad,
  interpretMenuRemoteKeydown,
  pollMenuGamepadEdges,
} from '../utils/menuRemoteInput.js';
import { createNameEntry, createConfirm } from '../ui/TitleModals.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.add.rectangle(cx, cy, cam.width, cam.height, 0x050508);

    this.add.text(cx, cy - 148, 'ABYSSAL DEPTHS', {
      fontSize: '42px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 108, 'Into the Bone Throne', {
      fontSize: '14px', fontFamily: 'monospace', color: '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    let menuTop = cy - 62;
    const summary = SaveGame.getSummary();
    if (summary) {
      const sub = summary.savedAt
        ? `${summary.roomName} · ${new Date(summary.savedAt).toLocaleString()}`
        : summary.roomName;
      const saveBlurb = this.add.text(
        cx,
        cy - 88,
        `${summary.playerName} — ${sub}\nSaved in this browser — highlight CONTINUE to resume`,
        {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#5a8068',
          stroke: '#000',
          strokeThickness: 2,
          align: 'center',
          lineSpacing: 6,
          wordWrap: { width: cam.width - 56 },
        },
      ).setOrigin(0.5, 0);
      menuTop = saveBlurb.y + saveBlurb.height + 18;
    }

    const touchEl = document.getElementById('touch-controls');
    if (touchEl) touchEl.classList.remove('visible');

    const mkOpt = (absY, label) => {
      const txt = this.add.text(cx, absY, label, {
        fontSize: '19px', fontFamily: 'monospace', color: '#d4c8a8',
        stroke: '#000', strokeThickness: 4,
        padding: { top: 6, bottom: 6, left: 16, right: 16 },
      }).setOrigin(0.5);
      const hitPadX = 40;
      const hitPadY = 8;
      txt.setInteractive(
        new Phaser.Geom.Rectangle(
          -hitPadX, -hitPadY,
          txt.width + hitPadX * 2, txt.height + hitPadY * 2,
        ),
        Phaser.Geom.Rectangle.Contains,
      );
      return txt;
    };

    const fadeToGame = (payload) => {
      this.cameras.main.fade(300, 0, 0, 0, false, (_cam, progress) => {
        if (progress >= 1) {
          this.scene.start('GameScene', payload);
        }
      });
    };

    const menuEntries = [];

    if (SaveGame.hasSavedGame()) {
      menuEntries.push({
        label: 'CONTINUE',
        onSelect: () => fadeToGame({ fromSave: true }),
      });
    }

    menuEntries.push({
      label: 'NEW GAME',
      onSelect: () => {
        this.openNameEntry({
          initial: SaveGame.getStoredPlayerName() || 'Traveler',
          onConfirm: (name) => {
            const stored = SaveGame.setStoredPlayerName(name);
            fadeToGame({ profileName: stored });
          },
        });
      },
    });

    if (SaveGame.hasSavedGame()) {
      menuEntries.push({
        label: 'ERASE SAVE',
        onSelect: () => {
          this.openConfirm({
            title: 'Erase Save',
            message: 'Delete saved progress from this browser?\nThis cannot be undone.',
            yesLabel: 'DELETE',
            noLabel: 'CANCEL',
            destructive: true,
            onYes: () => {
              SaveGame.clearSavedGame();
              this.scene.restart();
            },
          });
        },
      });
    }

    const rowH = 32;
    const menuBottom = menuTop + (menuEntries.length - 1) * rowH;
    const hintY = Math.min(cam.height - 28, menuBottom + 36);

    const options = [];
    for (let i = 0; i < menuEntries.length; i++) {
      const t = mkOpt(menuTop + i * rowH, menuEntries[i].label);
      options.push(t);
      menuEntries[i]._txt = t;
    }

    const hint = this.add.text(
      cx,
      hintY,
      'D-pad / stick · OK or ENTER · keyboard · Progress saves in this browser',
      {
        fontSize: '10px', fontFamily: 'monospace', color: '#4a3828',
        stroke: '#000', strokeThickness: 2,
        align: 'center',
        wordWrap: { width: cam.width - 48 },
      },
    ).setOrigin(0.5);

    this.selectedIndex = 0;
    const nOpt = options.length;
    const arrow = this.add.text(cx - 120, options[0].y, '>', {
      fontSize: '22px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);

    const updateSelection = () => {
      arrow.setY(options[this.selectedIndex].y);
      options.forEach((o, i) => {
        o.setColor(i === this.selectedIndex ? '#44ff66' : '#d4c8a8');
      });
    };
    updateSelection();

    const runSelection = () => {
      const entry = menuEntries[this.selectedIndex];
      if (entry) entry.onSelect();
    };

    const navUp = () => {
      this.selectedIndex = (this.selectedIndex + nOpt - 1) % nOpt;
      updateSelection();
    };
    const navDown = () => {
      this.selectedIndex = (this.selectedIndex + 1) % nOpt;
      updateSelection();
    };

    for (let i = 0; i < nOpt; i++) {
      const idx = i;
      options[i].on('pointerdown', () => {
        this.selectedIndex = idx;
        updateSelection();
        runSelection();
      });
      options[i].on('pointerover', () => {
        this.selectedIndex = idx;
        updateSelection();
      });
    }

    this._titleKeyHandler = (e) => {
      // Open modals steal input first.
      if (this._modal && this._modal.isOpen) {
        if (this._modal.handleKeyboard(e)) e.stopImmediatePropagation();
        return;
      }
      const { navUp: ku, navDown: kd, confirm } = interpretMenuRemoteKeydown(e);
      if (!ku && !kd && !confirm) return;
      e.preventDefault();
      if (ku) navUp();
      else if (kd) navDown();
      else if (confirm) runSelection();
    };
    window.addEventListener('keydown', this._titleKeyHandler, true);

    this._titleMenu = { nOpt, updateSelection, runSelection };
    this._menuGpHeld = { up: false, down: false, confirm: false };
    this._modal = null;
    this._modalGpHeld = {};

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this._titleKeyHandler, true);
      if (this._modal && this._modal.isOpen) this._modal.close();
      this._modal = null;
      this._titleMenu = null;
    });

    const canvas = this.game.canvas;
    if (canvas) {
      requestAnimationFrame(() => {
        try {
          canvas.focus({ preventScroll: true });
        } catch {
          canvas.focus();
        }
      });
    }

    this.tweens.add({
      targets: hint, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1,
    });
  }

  update() {
    const pad = getFirstConnectedGamepad();

    // Modals take over all input while open.
    if (this._modal && this._modal.isOpen) {
      if (pad) this._modal.pollGamepad(pad, this._modalGpHeld);
      // Keep menu gamepad state quiet so the modal doesn't double-trigger it.
      this._menuGpHeld = { up: true, down: true, confirm: true };
      return;
    }

    const menu = this._titleMenu;
    if (!menu) return;
    if (!pad) {
      this._menuGpHeld = { up: false, down: false, confirm: false };
      return;
    }

    const edges = pollMenuGamepadEdges(pad, this._menuGpHeld);
    this._menuGpHeld = { up: edges.up, down: edges.down, confirm: edges.confirm };

    const { nOpt, updateSelection, runSelection } = menu;
    if (edges.upEdge) {
      this.selectedIndex = (this.selectedIndex + nOpt - 1) % nOpt;
      updateSelection();
    } else if (edges.downEdge) {
      this.selectedIndex = (this.selectedIndex + 1) % nOpt;
      updateSelection();
    } else if (edges.confirmEdge) {
      runSelection();
    }
  }

  openNameEntry(opts) {
    if (this._modal && this._modal.isOpen) return;
    // Pre-seed held flags so a still-held confirm button doesn't instantly fire
    // the first cell of the new modal.
    this._modalGpHeld = {
      up: true, down: true, left: true, right: true,
      confirm: true, cancel: true, alt1: true, start: true, select: true,
    };
    this._modal = createNameEntry(this, {
      initial: opts.initial,
      onConfirm: (name) => {
        this._modal = null;
        if (opts.onConfirm) opts.onConfirm(name);
      },
      onCancel: () => {
        this._modal = null;
        if (opts.onCancel) opts.onCancel();
      },
    });
  }

  openConfirm(opts) {
    if (this._modal && this._modal.isOpen) return;
    this._modalGpHeld = {
      up: true, down: true, left: true, right: true,
      confirm: true, cancel: true, start: true,
    };
    this._modal = createConfirm(this, {
      title: opts.title,
      message: opts.message,
      yesLabel: opts.yesLabel,
      noLabel: opts.noLabel,
      destructive: opts.destructive,
      onYes: () => {
        this._modal = null;
        if (opts.onYes) opts.onYes();
      },
      onNo: () => {
        this._modal = null;
        if (opts.onNo) opts.onNo();
      },
    });
  }
}
