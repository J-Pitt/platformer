import { TEXTURE_ATTACK, TEXTURE_IDLE, TEX_H, TEX_W } from './constants.js';

const OUT = 0x180828;
const SLIME = 0xb898f8;
const SLIME_HI = 0xe0d0ff;
const SLIME_SH = 0x7860c0;
const ARMOR = 0x68d0ff;
const APRON = 0xf8f8ff;
const APRON_T = 0xa898f0;
const STONE = 0x8890a0;
const STAR = 0xfff8a0;
const STICK = 0x6a5040;

function draw(g, cx, atk) {
  const bob = atk ? -2 : 0;
  const swing = atk ? 7 : 0;

  g.fillStyle(SLIME_SH);
  g.lineStyle(2, OUT, 0.9);
  for (let i = 0; i < 5; i++) {
    const ox = (i - 2) * 7;
    g.fillCircle(cx + ox, 10 + bob + Math.abs(ox) * 0.15, 6 - i * 0.3);
    g.strokeCircle(cx + ox, 10 + bob + Math.abs(ox) * 0.15, 6 - i * 0.3);
  }
  g.fillStyle(SLIME);
  g.fillEllipse(cx, 22 + bob, 14, 11);
  g.fillStyle(SLIME_HI);
  g.fillEllipse(cx - 4, 19 + bob, 6, 5);
  g.lineStyle(2.5, OUT, 1);
  g.strokeEllipse(cx, 22 + bob, 14, 11);

  g.fillStyle(ARMOR);
  g.fillEllipse(cx - 12, 20 + bob, 6, 5);
  g.fillEllipse(cx + 12, 20 + bob, 6, 5);
  g.lineStyle(1.5, OUT, 1);
  g.strokeEllipse(cx - 12, 20 + bob, 6, 5);
  g.strokeEllipse(cx + 12, 20 + bob, 6, 5);

  g.fillStyle(APRON);
  g.fillTriangle(cx - 8, 24 + bob, cx + 8, 24 + bob, cx, 36 + bob);
  g.lineStyle(1.2, OUT, 0.85);
  g.strokeTriangle(cx - 8, 24 + bob, cx + 8, 24 + bob, cx, 36 + bob);
  g.fillStyle(APRON_T);
  g.fillCircle(cx, 30 + bob, 2);

  g.fillStyle(0x303060);
  g.fillCircle(cx - 3, 18 + bob, 2);
  g.fillCircle(cx + 3, 18 + bob, 2);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - 3.3, 17.5 + bob, 0.7);
  g.fillCircle(cx + 2.7, 17.5 + bob, 0.7);

  const mx = cx + 11 + swing;
  const my = 26 + bob;
  g.fillStyle(STONE);
  g.fillRoundedRect(mx - 5, my - 4, 10, 7, 2);
  g.lineStyle(1.5, OUT, 1);
  g.strokeRoundedRect(mx - 5, my - 4, 10, 7, 2);
  g.lineStyle(3, STICK, 1);
  g.lineBetween(mx, my - 4, mx + (atk ? 2 : -1), my - 14);
  g.fillStyle(STAR);
  g.fillCircle(mx, my - 16, 4.5);
  g.lineStyle(1.2, OUT, 0.9);
  g.strokeCircle(mx, my - 16, 4.5);
  g.fillStyle(0xfff0c0);
  g.fillCircle(mx - 1.2, my - 17, 1.4);
  g.fillStyle(STAR, 0.85);
  g.fillTriangle(mx, my - 20, mx - 3, my - 14, mx + 3, my - 14);
}

export function generateNimbusSidekickTextures(scene) {
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
