import * as SaveGame from '../persistence/SaveGame.js';

function fadeToScene(scene, key, payload) {
  scene.cameras.main.fade(300, 0, 0, 0, false, (_cam, progress) => {
    if (progress >= 1) {
      scene.scene.start(key, payload);
    }
  });
}

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
        const nm = window.prompt('Player name', SaveGame.getStoredPlayerName() || 'Traveler');
        if (nm === null) return;
        SaveGame.setStoredPlayerName(nm.trim() || 'Traveler');
        fadeToScene(this, 'SidekickSelectScene', {
          profileName: SaveGame.getStoredPlayerName(),
        });
      },
    });

    if (SaveGame.hasSavedGame()) {
      menuEntries.push({
        label: 'ERASE SAVE',
        onSelect: () => {
          if (window.confirm('Delete saved progress from this browser?')) {
            SaveGame.clearSavedGame();
            this.scene.restart();
          }
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

    const hint = this.add.text(cx, hintY, '↑↓ select · ENTER · Choose an ally on the next screen · Progress saves in this browser', {
      fontSize: '10px', fontFamily: 'monospace', color: '#4a3828',
      stroke: '#000', strokeThickness: 2,
      align: 'center',
      wordWrap: { width: cam.width - 48 },
    }).setOrigin(0.5);

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
      const e = menuEntries[this.selectedIndex];
      if (e) e.onSelect();
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

    this.input.keyboard.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex + nOpt - 1) % nOpt;
      updateSelection();
    });
    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % nOpt;
      updateSelection();
    });
    this.input.keyboard.on('keydown-ENTER', runSelection);
    this.input.keyboard.on('keydown-SPACE', runSelection);

    this.tweens.add({
      targets: hint, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1,
    });
  }
}
