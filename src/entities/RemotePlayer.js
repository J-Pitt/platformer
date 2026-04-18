import * as Phaser from 'phaser';

/**
 * Visual-only ghost of another networked player. Not a physics body — it
 * doesn't collide with terrain, enemies, or the local player. We simply
 * interpolate toward the last heartbeat snapshot and float a name tag above.
 */
export class RemotePlayer {
  constructor(scene, id, initial) {
    this.scene = scene;
    this.id = id;

    this.sprite = scene.add.sprite(initial.x, initial.y, 'player');
    this.sprite.setDepth(4);
    this.sprite.setAlpha(0.92);
    this.sprite.setTint(initial.color ?? 0xffffff);

    this.nameTag = scene.add.text(initial.x, initial.y - 26, initial.name || 'Traveler', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5, 1).setDepth(10);

    this.targetX = initial.x;
    this.targetY = initial.y;
    this.prevX = initial.x;
    this.prevY = initial.y;
    this.anim = initial.anim || 'idle';
    this.facing = initial.facing === -1 ? -1 : 1;
    this.roomId = initial.roomId || 'room1';
    this.color = initial.color ?? 0xffffff;
    this.name = initial.name || 'Traveler';

    this._lastUpdateMs = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  }

  applySnapshot(snap) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._lastUpdateMs = now;

    this.prevX = this.sprite.x;
    this.prevY = this.sprite.y;
    this.targetX = Number(snap.x) || this.targetX;
    this.targetY = Number(snap.y) || this.targetY;
    this.roomId = String(snap.roomId || this.roomId);
    this.facing = snap.facing === -1 ? -1 : 1;
    this.anim = String(snap.anim || this.anim);

    if (snap.name && snap.name !== this.name) {
      this.name = snap.name;
      this.nameTag.setText(this.name);
    }
    const tint = Number.isFinite(snap.color) ? snap.color : this.color;
    if (tint !== this.color) {
      this.color = tint;
      this.sprite.setTint(tint);
    }

    this._updateAnim();
  }

  _updateAnim() {
    const s = this.sprite;
    s.setFlipX(this.facing === -1);

    const wantRun = this.anim === 'run' || this.anim === 'run_armed';
    const wantArmed = this.anim === 'run_armed' || this.anim === 'idle_armed';

    if (wantRun) {
      const key = wantArmed && this.scene.anims.exists('player_run_armed')
        ? 'player_run_armed'
        : 'player_run';
      if (this.scene.anims.exists(key) && s.anims.currentAnim?.key !== key) {
        s.play(key, true);
      }
    } else {
      if (s.anims.isPlaying) s.stop();
      // Idle / jump / fall: use first frame of the appropriate sheet.
      const base = wantArmed ? 'player_run_armed_0' : 'player_run_0';
      if (this.scene.textures.exists(base)) {
        s.setTexture(base);
      } else {
        s.setTexture('player');
      }
    }
  }

  setVisibleInRoom(isInRoom) {
    this.sprite.setVisible(isInRoom);
    this.nameTag.setVisible(isInRoom);
  }

  tick(dt) {
    // Simple exponential smoothing toward latest target. 60ms time constant
    // gives a responsive-but-not-jittery feel at ~180ms heartbeat cadence.
    const s = this.sprite;
    const alpha = 1 - Math.exp(-dt / 60);
    s.x = s.x + (this.targetX - s.x) * alpha;
    s.y = s.y + (this.targetY - s.y) * alpha;

    this.nameTag.setPosition(s.x, s.y - 26);
  }

  destroy() {
    this.sprite?.destroy();
    this.nameTag?.destroy();
    this.sprite = null;
    this.nameTag = null;
  }
}
