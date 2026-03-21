export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.add.rectangle(cx, cy, cam.width, cam.height, 0x050508);

    this.add.text(cx, cy - 100, 'ABYSSAL DEPTHS', {
      fontSize: '42px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 55, 'Into the Bone Throne', {
      fontSize: '14px', fontFamily: 'monospace', color: '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const opt1 = this.add.text(cx, cy + 20, '1 PLAYER', {
      fontSize: '22px', fontFamily: 'monospace', color: '#d4c8a8',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const opt2 = this.add.text(cx, cy + 65, '2 PLAYERS', {
      fontSize: '22px', fontFamily: 'monospace', color: '#d4c8a8',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const hint = this.add.text(cx, cy + 120, 'Player 2 uses a gamepad', {
      fontSize: '11px', fontFamily: 'monospace', color: '#4a3828',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.selectedIndex = 0;
    const options = [opt1, opt2];
    const arrow = this.add.text(cx - 100, opt1.y, '>', {
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

    const launch = (coopMode) => {
      this.cameras.main.fade(300, 0, 0, 0, false, (_cam, progress) => {
        if (progress >= 1) {
          this.scene.start('GameScene', { coopMode });
        }
      });
    };

    opt1.on('pointerdown', () => launch(false));
    opt2.on('pointerdown', () => launch(true));
    opt1.on('pointerover', () => { this.selectedIndex = 0; updateSelection(); });
    opt2.on('pointerover', () => { this.selectedIndex = 1; updateSelection(); });

    this.input.keyboard.on('keydown-UP', () => {
      this.selectedIndex = 0;
      updateSelection();
    });
    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectedIndex = 1;
      updateSelection();
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      launch(this.selectedIndex === 1);
    });
    this.input.keyboard.on('keydown-SPACE', () => {
      launch(this.selectedIndex === 1);
    });

    this.tweens.add({
      targets: hint, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1,
    });
  }
}
