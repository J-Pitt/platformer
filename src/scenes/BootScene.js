import { generateAllTextures } from '../utils/SpriteGen.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    generateAllTextures(this);
    this.scene.start('IntroScene');
  }
}
