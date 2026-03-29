import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { SidekickSelectScene } from './scenes/SidekickSelectScene.js';
import { GameScene } from './scenes/GameScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  pixelArt: false,
  backgroundColor: '#050508',
  input: {
    gamepad: true,
    touch: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, IntroScene, TitleScene, SidekickSelectScene, GameScene],
};

new Phaser.Game(config);
