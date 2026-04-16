import * as Phaser from 'phaser';
import { isMobileDevice } from './TouchControls.js';

const DEFAULT = {
  deadzoneWidth: 60,
  deadzoneHeight: 40,
  lerpX: 0.08,
  lerpY: 0.08,
};

const MOBILE_ZOOM = 1.8;
const MOBILE_DEADZONE = { width: 30, height: 20 };
const MOBILE_LERP = { x: 0.1, y: 0.1 };

/** Clamp so stacked shakes cannot blow up the view. */
const SHAKE_DURATION_CAP = 600;
const SHAKE_INTENSITY_CAP = 0.035;

export class CameraRig {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
  }

  /**
   * Apply per-room camera tuning (deadzone + follow lerp).
   * @param {object} [room]
   */
  applyRoom(room) {
    const c = room?.camera || {};
    const mobile = isMobileDevice();

    const dw = mobile ? MOBILE_DEADZONE.width : (c.deadzoneWidth ?? DEFAULT.deadzoneWidth);
    const dh = mobile ? MOBILE_DEADZONE.height : (c.deadzoneHeight ?? DEFAULT.deadzoneHeight);
    const lx = mobile ? MOBILE_LERP.x : (c.lerpX ?? DEFAULT.lerpX);
    const ly = mobile ? MOBILE_LERP.y : (c.lerpY ?? DEFAULT.lerpY);

    if (mobile) {
      this.cam.setZoom(MOBILE_ZOOM);
    }

    this.cam.setDeadzone(dw, dh);
    const target = this.scene.localFollowTarget?.() ?? this.scene.player;
    if (target) {
      this.cam.startFollow(target, true, lx, ly);
    }
  }

  /**
   * @param {number} duration ms
   * @param {number} intensity 0–1 scale (Phaser shake strength)
   */
  shake(duration, intensity) {
    const d = Math.min(Math.max(0, duration), SHAKE_DURATION_CAP);
    const i = Math.min(Math.max(0, intensity), SHAKE_INTENSITY_CAP);
    if (d <= 0 || i <= 0) return;
    this.cam.shake(d, i);
  }
}

/**
 * Use from entities so scenes without a rig still shake (e.g. tests).
 * @param {Phaser.Scene} scene
 * @param {number} duration
 * @param {number} intensity
 */
export function shakeScene(scene, duration, intensity) {
  if (scene.cameraRig) {
    scene.cameraRig.shake(duration, intensity);
  } else {
    scene.cameras.main.shake(duration, intensity);
  }
}
