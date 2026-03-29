import { TEXTURE_ATTACK, TEXTURE_IDLE, TEX_H, TEX_W } from './constants.js';

const OUT = 0x1a120c;
const SCALE = 0xc89868;
const SCALE_HI = 0xe8c090;
const SCALE_SH = 0x8a6040;
const ARMOR = 0x58c8a0;
const ARMOR_HI = 0x88f0c8;
const APRON = 0xfff8e8;
const APRON_T = 0xffc890;
const EYE = 0x2a1810;
const HONEY = 0xffc040;
const WOOD = 0x6a4830;

function draw(g, cx, atk) {
  const lean = atk ? 2 : 0;
  const swing = atk ? 8 : 0;

  g.lineStyle(2.5, OUT, 1);
  g.strokeEllipse(cx - lean, 28, 16, 11);
  g.fillStyle(SCALE_SH);
  g.fillEllipse(cx - lean, 28, 15, 10);
  for (let i = 0; i < 4; i++) {
    g.lineStyle(1.2, OUT, 0.7);
    g.lineBetween(cx - 8 + i * 5 - lean, 24, cx - 6 + i * 5 - lean, 32);
  }
  g.fillStyle(SCALE);
  g.fillEllipse(cx - lean, 27, 11, 7);
  g.fillStyle(SCALE_HI);
  g.fillEllipse(cx - 4 - lean, 26, 4, 3);

  g.fillStyle(ARMOR);
  g.fillEllipse(cx - 13, 20, 8, 7);
  g.fillEllipse(cx + 13, 20, 8, 7);
  g.fillStyle(ARMOR_HI);
  g.fillEllipse(cx - 13, 19, 4, 3);
  g.fillEllipse(cx + 13, 19, 4, 3);
  g.lineStyle(2, OUT, 1);
  g.strokeEllipse(cx - 13, 20, 8, 7);
  g.strokeEllipse(cx + 13, 20, 8, 7);

  g.fillStyle(APRON);
  g.fillTriangle(cx - 9, 22, cx + 9, 22, cx, 36);
  g.fillRect(cx - 7, 22, 14, 11);
  g.lineStyle(1.5, OUT, 0.9);
  g.strokeTriangle(cx - 9, 22, cx + 9, 22, cx, 36);
  g.fillStyle(APRON_T);
  g.fillRect(cx - 8, 22, 16, 3);

  g.lineStyle(2.5, OUT, 1);
  g.strokeEllipse(cx - lean, 11, 14, 12);
  g.fillStyle(SCALE_SH);
  g.fillEllipse(cx - lean, 11, 13, 11);
  g.fillStyle(SCALE);
  g.fillEllipse(cx - lean, 10, 10, 8);
  g.fillStyle(EYE);
  g.fillCircle(cx - 4 - lean, 9, 2);
  g.fillCircle(cx + 4 - lean, 9, 2);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(cx - 4.5 - lean, 8.5, 0.7);
  g.fillCircle(cx + 3.5 - lean, 8.5, 0.7);
  g.fillStyle(0xffb8a8);
  g.fillEllipse(cx - lean, 12, 5, 2);

  const hx = cx + 12 + swing;
  const hy = 18;
  g.lineStyle(3.5, WOOD, 1);
  g.lineBetween(hx, hy + 2, hx + (atk ? 12 : 5), hy - (atk ? 4 : 10));
  g.fillStyle(HONEY);
  g.fillEllipse(hx + (atk ? 14 : 6), hy - (atk ? 8 : 12), 6, 9);
  g.fillStyle(0xffe8a0);
  g.fillEllipse(hx + (atk ? 14 : 6), hy - (atk ? 10 : 14), 3, 4);
  g.lineStyle(1.5, OUT, 1);
  g.strokeEllipse(hx + (atk ? 14 : 6), hy - (atk ? 8 : 12), 6, 9);
}

export function generatePipSidekickTextures(scene) {
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
