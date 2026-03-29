import { TEXTURE_ATTACK, TEXTURE_IDLE, TEX_H, TEX_W } from './constants.js';

const OUT = 0x120810;
const SHELL = 0xd82828;
const SHELL_HI = 0xff5050;
const SPOT = 0x101010;
const BELLY = 0x1a1418;
const ARMOR = 0xc8c8e8;
const APRON = 0xffe840;
const APRON_T = 0xffa020;
const CHERRY = 0xc01030;
const FORK = 0xc0c8d8;

function draw(g, cx, atk) {
  const swing = atk ? 10 : 0;

  g.fillStyle(SHELL);
  g.lineStyle(2.5, OUT, 1);
  g.strokeCircle(cx, 22, 14);
  g.fillCircle(cx, 22, 13);
  g.fillStyle(SHELL_HI);
  g.fillCircle(cx - 4, 19, 5);
  for (const [dx, dy] of [[-6, 24], [4, 26], [-2, 30], [7, 20]]) {
    g.fillStyle(SPOT);
    g.fillCircle(cx + dx, dy, 2.2);
  }

  g.fillStyle(BELLY);
  g.fillEllipse(cx, 28, 10, 8);
  g.lineStyle(1.5, OUT, 0.8);
  g.strokeEllipse(cx, 28, 10, 8);

  g.fillStyle(ARMOR);
  g.fillEllipse(cx - 11, 18, 6, 5);
  g.fillEllipse(cx + 11, 18, 6, 5);
  g.lineStyle(1.5, OUT, 1);
  g.strokeEllipse(cx - 11, 18, 6, 5);
  g.strokeEllipse(cx + 11, 18, 6, 5);

  g.fillStyle(APRON);
  g.fillTriangle(cx - 7, 24, cx + 7, 24, cx, 35);
  g.lineStyle(1.2, OUT, 0.9);
  g.strokeTriangle(cx - 7, 24, cx + 7, 24, cx, 35);
  g.fillStyle(APRON_T);
  g.fillRect(cx - 6, 24, 12, 2);

  g.fillStyle(BELLY);
  g.fillCircle(cx, 12, 7);
  g.lineStyle(2, OUT, 1);
  g.strokeCircle(cx, 12, 7);
  g.fillStyle(0x2a2030);
  g.fillCircle(cx - 2.5, 11, 1.8);
  g.fillCircle(cx + 2.5, 11, 1.8);

  const fx = cx + 14 + swing;
  const fy = 16;
  g.lineStyle(2.5, OUT, 1);
  for (let i = 0; i < 4; i++) {
    g.lineBetween(fx, fy + i * 3, fx + (atk ? 2 : 0), fy + 14 + i * 0.5);
  }
  g.fillStyle(FORK);
  g.fillRect(fx - 1, fy, 3, 14);
  g.fillStyle(CHERRY);
  g.fillCircle(fx + (atk ? 8 : 4), fy - 2, 3.5);
  g.fillStyle(0x208020);
  g.fillEllipse(fx + (atk ? 8 : 4), fy - 5, 2, 3);
}

export function generateBuzzSidekickTextures(scene) {
  const cx = TEX_W / 2;
  const idle = scene.make.graphics({ add: false });
  draw(idle, cx, false);
  idle.generateTexture(TEXTURE_IDLE, TEX_W, TEX_H);
  idle.destroy();
  const a = scene.make.graphics({ add: false });
  draw(a, cx, true);
  a.generateTexture(TEXTURE_ATTACK, TEX_W, TEX_H);
  a.destroy();
}
