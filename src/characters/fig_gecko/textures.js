import { TEXTURE_ATTACK, TEXTURE_IDLE, TEX_H, TEX_W } from './constants.js';

const OUT = 0x0c1814;
const SKIN = 0x58c898;
const SKIN_HI = 0x90f0c8;
const SKIN_SH = 0x389068;
const BELLY = 0xe8f8e8;
const ARMOR = 0xc07040;
const ARMOR_HI = 0xf0a070;
const APRON = 0xf5f0e0;
const BOBA = 0x604848;
const PEARL = 0x181018;
const STRAW = 0xff6088;
const STRAW_STRIPE = 0xffffff;

function draw(g, cx, atk) {
  const lean = atk ? 2 : 0;
  const puff = atk ? 10 : 0;

  g.lineStyle(2.5, OUT, 1);
  g.strokeEllipse(cx - lean, 28, 13, 9);
  g.fillStyle(SKIN_SH);
  g.fillEllipse(cx - lean, 28, 12, 8);
  g.fillStyle(SKIN);
  g.fillEllipse(cx - lean, 27, 9, 6);
  g.fillStyle(BELLY);
  g.fillEllipse(cx - lean, 28, 6, 4);

  g.fillStyle(ARMOR);
  g.fillEllipse(cx - 12, 21, 7, 6);
  g.fillEllipse(cx + 12, 21, 7, 6);
  g.fillStyle(ARMOR_HI);
  g.fillEllipse(cx - 12, 20, 3, 2.5);
  g.fillEllipse(cx + 12, 20, 3, 2.5);
  g.lineStyle(2, OUT, 1);
  g.strokeEllipse(cx - 12, 21, 7, 6);
  g.strokeEllipse(cx + 12, 21, 7, 6);

  g.fillStyle(APRON);
  g.fillTriangle(cx - 8, 23, cx + 8, 23, cx, 35);
  g.lineStyle(1.3, OUT, 0.85);
  g.strokeTriangle(cx - 8, 23, cx + 8, 23, cx, 35);
  g.fillStyle(BOBA);
  g.fillCircle(cx - 3, 29, 1.8);
  g.fillCircle(cx + 3, 30, 1.8);
  g.fillCircle(cx, 33, 1.6);

  g.lineStyle(2.5, OUT, 1);
  g.strokeEllipse(cx - lean - 2, 11, 13, 11);
  g.fillStyle(SKIN_SH);
  g.fillEllipse(cx - lean - 2, 11, 12, 10);
  g.fillStyle(SKIN);
  g.fillEllipse(cx - lean - 2, 10, 9, 7);
  g.fillStyle(SKIN_HI);
  g.fillEllipse(cx - 6 - lean, 7, 5, 4);
  g.fillEllipse(cx + 8 - lean, 7, 5, 4);

  g.fillStyle(0x204030);
  g.fillEllipse(cx - 4 - lean, 9, 3.5, 4);
  g.fillEllipse(cx + 4 - lean, 9, 3.5, 4);
  g.fillStyle(0xfff8c0);
  g.fillEllipse(cx - 4.5 - lean, 8.2, 1.5, 2);
  g.fillEllipse(cx + 3.5 - lean, 8.2, 1.5, 2);
  g.fillStyle(PEARL);
  g.fillCircle(cx - 4 - lean, 9, 1.2);
  g.fillCircle(cx + 4 - lean, 9, 1.2);

  g.fillStyle(SKIN);
  g.fillTriangle(cx - 10 - lean, 12, cx - 6 - lean, 12, cx - 9 - lean, 15);
  g.fillTriangle(cx + 10 - lean, 12, cx + 6 - lean, 12, cx + 9 - lean, 15);

  const sx = cx + 12 + puff;
  const sy = 19;
  g.fillStyle(STRAW);
  g.fillRoundedRect(sx, sy - 3, atk ? 14 : 6, 4, 2);
  g.fillStyle(STRAW_STRIPE, 0.5);
  g.fillRect(sx + 1, sy - 2, atk ? 12 : 4, 1);
  g.lineStyle(1.5, OUT, 1);
  g.strokeRoundedRect(sx, sy - 3, atk ? 14 : 6, 4, 2);
  g.fillStyle(0x303040);
  g.fillCircle(sx + (atk ? 15 : 7), sy - 1, 2.2);
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(sx + (atk ? 14 : 6), sy - 2, 1);
}

export function generateFigSidekickTextures(scene) {
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
