import { SIDEKICK_LIST } from '../characters/sidekickRegistry.js';

export class SidekickSelectScene extends Phaser.Scene {
  constructor() {
    super('SidekickSelectScene');
  }

  create(data) {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const profileName = (data?.profileName && String(data.profileName).trim())
      || 'Traveler';

    this.add.rectangle(cx, cam.height / 2, cam.width, cam.height, 0x050508);

    this.add.text(cx, 52, 'CHOOSE YOUR ALLY', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#44ff66',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(cx, 86, `Traveler: ${profileName}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#6a8068',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const touchEl = document.getElementById('touch-controls');
    if (touchEl) touchEl.classList.remove('visible');

    this.selectedIndex = 0;
    const previews = [];
    const n = SIDEKICK_LIST.length;
    const spacing = n > 5 ? 86 : 100;
    const startX = cx - ((n - 1) * spacing) / 2;
    const py = 175;

    for (let i = 0; i < SIDEKICK_LIST.length; i++) {
      const cfg = SIDEKICK_LIST[i];
      const px = startX + i * spacing;
      const img = this.add.image(px, py, cfg.textureIdle).setScale(2.2).setDepth(2);
      img.setInteractive({ useHandCursor: true });
      previews.push({ img, cfg, index: i });

      img.on('pointerover', () => {
        this.selectedIndex = i;
        this.refreshSelection(previews);
      });
      img.on('pointerdown', () => {
        this.selectedIndex = i;
        this.refreshSelection(previews);
        this.confirmSelection(profileName);
      });
    }

    this.detailName = this.add.text(cx, py + 62, '', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffe8c0',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.detailSub = this.add.text(cx, py + 88, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#8a9888',
      stroke: '#000',
      strokeThickness: 2,
      align: 'center',
      wordWrap: { width: cam.width - 80 },
    }).setOrigin(0.5);

    this.hint = this.add.text(cx, cam.height - 36, '← → pick ally · ENTER / SPACE / CLICK to begin', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#4a5848',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.refreshSelection(previews);

    const left = () => {
      this.selectedIndex = (this.selectedIndex + SIDEKICK_LIST.length - 1) % SIDEKICK_LIST.length;
      this.refreshSelection(previews);
    };
    const right = () => {
      this.selectedIndex = (this.selectedIndex + 1) % SIDEKICK_LIST.length;
      this.refreshSelection(previews);
    };

    this.input.keyboard.on('keydown-LEFT', left);
    this.input.keyboard.on('keydown-A', left);
    this.input.keyboard.on('keydown-RIGHT', right);
    this.input.keyboard.on('keydown-D', right);
    this.input.keyboard.on('keydown-ENTER', () => this.confirmSelection(profileName));
    this.input.keyboard.on('keydown-SPACE', () => this.confirmSelection(profileName));
  }

  refreshSelection(previews) {
    for (const p of previews) {
      const on = p.index === this.selectedIndex;
      p.img.setAlpha(on ? 1 : 0.38);
      p.img.setScale(on ? 2.45 : 2.2);
    }
    const cfg = SIDEKICK_LIST[this.selectedIndex];
    this.detailName.setText(cfg.displayName);
    this.detailSub.setText(`${cfg.tagline}\n${cfg.weaponLine}`);
  }

  confirmSelection(profileName) {
    const cfg = SIDEKICK_LIST[this.selectedIndex];
    this.cameras.main.fade(280, 0, 0, 0, false, (_cam, progress) => {
      if (progress >= 1) {
        this.scene.start('GameScene', {
          profileName,
          sidekickId: cfg.id,
        });
      }
    });
  }
}
