import * as Phaser from 'phaser';
import { generateAllTextures } from '../utils/SpriteGen.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    generateAllTextures(this);

    const canvas = this.game.canvas;
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.style.outline = 'none';
    }
    const host = document.getElementById('game-container');
    if (host && canvas) {
      host.addEventListener('pointerdown', () => {
        try {
          canvas.focus({ preventScroll: true });
        } catch {
          canvas.focus();
        }
      }, { passive: true });
    }

    this.scene.start('IntroScene');
  }
}
