import {
  createPlatformerRoom,
  joinPlatformerRoom,
  getPlatformerRoom,
} from '../net/platformerRoomApi.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;

    this.add.rectangle(cx, cy, cam.width, cam.height, 0x050508);

    this.add.text(cx, cy - 110, 'ABYSSAL DEPTHS', {
      fontSize: '42px', fontFamily: 'monospace', color: '#44ff66',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 68, 'Into the Bone Throne', {
      fontSize: '14px', fontFamily: 'monospace', color: '#6a5838',
      stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    const mkOpt = (y, label) => this.add.text(cx, cy + y, label, {
      fontSize: '19px', fontFamily: 'monospace', color: '#d4c8a8',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const opt1 = mkOpt(8, '1 PLAYER');
    const opt2 = mkOpt(38, '2 PLAYERS (LOCAL + GAMEPAD)');
    const opt3 = mkOpt(68, 'ONLINE — HOST (GET CODE)');
    const opt4 = mkOpt(98, 'ONLINE — JOIN (ENTER CODE)');

    const hint = this.add.text(cx, cy + 132, '↑↓ select · ENTER · Online needs: npm run server + Redis (.env)', {
      fontSize: '10px', fontFamily: 'monospace', color: '#4a3828',
      stroke: '#000', strokeThickness: 2,
      align: 'center',
      wordWrap: { width: cam.width - 48 },
    }).setOrigin(0.5);

    this.selectedIndex = 0;
    const options = [opt1, opt2, opt3, opt4];
    const arrow = this.add.text(cx - 120, opt1.y, '>', {
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

    const fadeToGame = (payload) => {
      this.cameras.main.fade(300, 0, 0, 0, false, (_cam, progress) => {
        if (progress >= 1) {
          this.scene.start('GameScene', payload);
        }
      });
    };

    const launchLocal = (coopMode) => {
      fadeToGame({ coopMode });
    };

    const startOnlineHost = () => {
      const name = window.prompt('Your display name', 'Host');
      if (name === null) return;
      (async () => {
        try {
          const cr = await createPlatformerRoom(name.trim() || 'Host');
          options.forEach((o) => o.setVisible(false));
          arrow.setVisible(false);
          hint.setVisible(false);
          const wait = this.add.text(
            cx,
            cy + 20,
            `Room code: ${cr.gameCode}\n\nSend this code to your friend.\nWaiting for them to join…`,
            {
              fontSize: '16px',
              fontFamily: 'monospace',
              color: '#44ff66',
              stroke: '#000',
              strokeThickness: 4,
              align: 'center',
            },
          ).setOrigin(0.5);

          const poll = this.time.addEvent({
            delay: 750,
            loop: true,
            callback: async () => {
              try {
                const r = await getPlatformerRoom(cr.roomId);
                if (r.players?.length >= 2) {
                  poll.remove();
                  wait.destroy();
                  fadeToGame({
                    coopMode: false,
                    online: {
                      roomId: cr.roomId,
                      isHost: true,
                      playerName: (name.trim() || 'Host'),
                      gameCode: cr.gameCode,
                    },
                  });
                }
              } catch (e) {
                console.warn(e);
              }
            },
          });
          this.events.once('shutdown', () => poll.remove());
        } catch (e) {
          alert(e.message || String(e));
          this.scene.start('TitleScene');
        }
      })();
    };

    const startOnlineJoin = () => {
      const code = window.prompt('Room code (6 letters/numbers)');
      if (code === null) return;
      const name = window.prompt('Your display name', 'Player');
      if (name === null) return;
      (async () => {
        try {
          const r = await joinPlatformerRoom(code, name.trim() || 'Player');
          if (!r.roomId) throw new Error('Join failed');
          fadeToGame({
            coopMode: false,
            online: {
              roomId: r.roomId,
              isHost: false,
              playerName: (name.trim() || 'Player'),
            },
          });
        } catch (e) {
          alert(e.message || String(e));
        }
      })();
    };

    const runSelection = () => {
      switch (this.selectedIndex) {
        case 0: launchLocal(false); break;
        case 1: launchLocal(true); break;
        case 2: startOnlineHost(); break;
        case 3: startOnlineJoin(); break;
        default: break;
      }
    };

    opt1.on('pointerdown', () => { this.selectedIndex = 0; runSelection(); });
    opt2.on('pointerdown', () => { this.selectedIndex = 1; runSelection(); });
    opt3.on('pointerdown', () => { this.selectedIndex = 2; runSelection(); });
    opt4.on('pointerdown', () => { this.selectedIndex = 3; runSelection(); });
    opt1.on('pointerover', () => { this.selectedIndex = 0; updateSelection(); });
    opt2.on('pointerover', () => { this.selectedIndex = 1; updateSelection(); });
    opt3.on('pointerover', () => { this.selectedIndex = 2; updateSelection(); });
    opt4.on('pointerover', () => { this.selectedIndex = 3; updateSelection(); });

    this.input.keyboard.on('keydown-UP', () => {
      this.selectedIndex = (this.selectedIndex + 3) % 4;
      updateSelection();
    });
    this.input.keyboard.on('keydown-DOWN', () => {
      this.selectedIndex = (this.selectedIndex + 1) % 4;
      updateSelection();
    });
    this.input.keyboard.on('keydown-ENTER', runSelection);
    this.input.keyboard.on('keydown-SPACE', runSelection);

    this.tweens.add({
      targets: hint, alpha: 0.4, duration: 1500, yoyo: true, repeat: -1,
    });
  }
}
