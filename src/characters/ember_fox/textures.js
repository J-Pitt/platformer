import { TEXTURE_ATTACK, TEXTURE_IDLE, TEX_H, TEX_W } from './constants.js';

const OUT = 0x180c08;
const FUR = 0xf07830;
const FUR_HI = 0xffa868;
const FUR_SH = 0xb84818;
const WHITE = 0xf8f0e8;
const ARMOR = 0x404850;
const ARMOR_HOT = 0xff6020;
const APRON = 0x2a2420;
const APRON_STRIPE = 0xffb020;
const EYE = 0x101820;
const METAL = 0xb8c0d0;

function draw(g, cx, atk) {
  const lean = atk ? 2 : 0;
  const swing = atk ? 9 : 0;

  g.fillStyle(FUR_SH);
  g.lineStyle(2.5, OUT, 1);
  g.strokeEllipse(cx - lean, 28, 12, 9);
  g.fillEllipse(cx - lean, 28, 11, 8);
  g.fillStyle(FUR);
  g.fillEllipse(cx - lean, 27, 8, 6);
  g.fillStyle(FUR_HI);
  g.fillEllipse(cx - 3 - lean, 25, 4, 3);

  g.fillStyle(ARMOR);
  g.fillEllipse(cx - 12, 20, 7, 6);
  g.fillEllipse(cx + 12, 20, 7, 6);
  g.fillStyle(ARMOR_HOT);
  g.fillEllipse(cx - 12, 20, 3, 2.5);
  g.fillEllipse(cx + 12, 20, 3, 2.5);
  g.lineStyle(2, OUT, 1);
  g.strokeEllipse(cx - 12, 20, 7, 6);
  g.strokeEllipse(cx + 12, 20, 7, 6);

  g.fillStyle(APRON);
  g.fillTriangle(cx - 8, 23, cx + 8, 23, cx, 35);
  g.fillStyle(APRON_STRIPE);
  g.fillRect(cx - 7, 26, 14, 2);
  g.fillRect(cx - 7, 30, 14, 2);
  g.lineStyle(1.3, OUT, 0.85);
  g.strokeTriangle(cx - 8, 23, cx + 8, 23, cx, 35);

  g.fillStyle(FUR);
  g.fillTriangle(cx - 8 - lean, 6, cx - 2 - lean, 14, cx - 12 - lean, 12);
  g.fillTriangle(cx + 8 - lean, 6, cx + 2 - lean, 14, cx + 12 - lean, 12);
  g.lineStyle(2, OUT, 1);
  g.strokeTriangle(cx - 8 - lean, 6, cx - 2 - lean, 14, cx - 12 - lean, 12);
  g.strokeTriangle(cx + 8 - lean, 6, cx + 2 - lean, 14, cx + 12 - lean, 12);

  g.fillStyle(WHITE);
  g.fillEllipse(cx - lean, 12, 11, 9);
  g.lineStyle(2, OUT, 1);
  g.strokeEllipse(cx - lean, 12, 11, 9);
  g.fillStyle(FUR);
  g.fillEllipse(cx - lean, 14, 7, 5);
  g.fillStyle(EYE);
  g.fillCircle(cx - 3 - lean, 11, 1.8);
  g.fillCircle(cx + 3 - lean, 11, 1.8);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - 3.3 - lean, 10.6, 0.6);
  g.fillCircle(cx + 2.8 - lean, 10.6, 0.6);
  g.fillStyle(0x181010);
  g.fillTriangle(cx - 1 - lean, 13, cx + 1 - lean, 13, cx - lean, 15);

  const tx = cx + 13 + swing;
  const ty = 17;
  g.lineStyle(2.5, OUT, 1);
  g.lineBetween(tx, ty + 8, tx + (atk ? 4 : 1), ty - 8);
  g.fillStyle(METAL);
  g.fillRect(tx - 1.5, ty - 10, 3, 18);
  for (let i = -1; i <= 1; i++) {
    g.lineBetween(tx + i * 3, ty - 10, tx + i * 3 + (atk ? 2 : 0), ty - 16);
  }
}

export function generateEmberSidekickTextures(scene) {
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
