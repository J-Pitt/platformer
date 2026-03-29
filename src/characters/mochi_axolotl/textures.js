import {
  MOCHI_TEXTURE_ATTACK,
  MOCHI_TEXTURE_IDLE,
  TEX_H,
  TEX_W,
} from './constants.js';

const OUTLINE = 0x1a0c18;
const SKIN = 0xff9aab;
const SKIN_HI = 0xffc4d0;
const SKIN_SH = 0xd87088;
const GILL = 0xff6a9a;
const ARMOR_M = 0xb838d8;
const ARMOR_M_HI = 0xe070ff;
const ARMOR_CY = 0x38d8f0;
const APRON = 0xf5ecd8;
const APRON_TRIM = 0xff9ec8;
const EYE = 0x2244aa;
const EYE_HI = 0xffffff;
const MALLET_GLASS = 0xb8e8ff;
const MALLET_FLUID = 0x66c8ff;
const MALLET_STAR = 0xffe066;
const MALLET_HANDLE = 0x7a5420;

function drawMochiBody(g, cx, attack) {
  const lean = attack ? 2 : 0;
  const armSwing = attack ? 6 : 0;

  g.lineStyle(2.5, OUTLINE, 1);
  g.strokeEllipse(cx, 30, 14, 10);
  g.fillStyle(SKIN_SH);
  g.fillEllipse(cx, 30, 13, 9);
  g.fillStyle(SKIN);
  g.fillEllipse(cx - lean, 29, 10, 7);

  g.fillStyle(ARMOR_M);
  g.fillEllipse(cx - 12, 22, 7, 6);
  g.fillEllipse(cx + 12, 22, 7, 6);
  g.fillStyle(ARMOR_CY);
  g.fillEllipse(cx - 12, 22, 4, 3);
  g.fillEllipse(cx + 12, 22, 4, 3);

  g.lineStyle(2, OUTLINE, 1);
  g.strokeEllipse(cx - 12, 22, 7, 6);
  g.strokeEllipse(cx + 12, 22, 7, 6);

  g.fillStyle(APRON);
  g.fillTriangle(cx - 9, 24, cx + 9, 24, cx, 38);
  g.fillRect(cx - 8, 24, 16, 12);
  g.lineStyle(1.5, OUTLINE, 0.9);
  g.strokeTriangle(cx - 9, 24, cx + 9, 24, cx, 38);
  g.fillStyle(APRON_TRIM);
  g.fillCircle(cx, 30, 2);
  g.lineStyle(1, OUTLINE, 0.7);
  g.strokeCircle(cx, 30, 2);

  g.fillStyle(GILL);
  for (let i = 0; i < 3; i++) {
    const ox = -10 - i * 3.5;
    g.fillEllipse(cx + ox, 14 + i * 0.5, 4, 5 + i);
    g.fillEllipse(cx - ox, 14 + i * 0.5, 4, 5 + i);
  }
  g.lineStyle(1.2, OUTLINE, 0.85);
  for (let i = 0; i < 3; i++) {
    const ox = -10 - i * 3.5;
    g.strokeEllipse(cx + ox, 14 + i * 0.5, 4, 5 + i);
    g.strokeEllipse(cx - ox, 14 + i * 0.5, 4, 5 + i);
  }

  g.lineStyle(2.5, OUTLINE, 1);
  g.strokeEllipse(cx - lean, 12, 15, 13);
  g.fillStyle(SKIN_SH);
  g.fillEllipse(cx - lean, 12, 14, 12);
  g.fillStyle(SKIN);
  g.fillEllipse(cx - lean, 11, 11, 9);
  g.fillStyle(SKIN_HI);
  g.fillEllipse(cx - lean - 3, 9, 4, 3);

  g.fillStyle(EYE);
  g.fillCircle(cx - 4 - lean, 11, 2.2);
  g.fillCircle(cx + 4 - lean, 11, 2.2);
  g.fillStyle(EYE_HI);
  g.fillCircle(cx - 4.5 - lean, 10.5, 0.8);
  g.fillCircle(cx + 3.5 - lean, 10.5, 0.8);

  g.lineStyle(1.5, OUTLINE, 1);
  g.lineBetween(cx - 2 - lean, 14, cx + 2 - lean, 14);

  const hx = cx + 14 + armSwing;
  const hy = 20;
  g.lineStyle(3, MALLET_HANDLE, 1);
  g.lineBetween(hx, hy + 4, hx + (attack ? 10 : 4), hy - (attack ? 2 : 6));
  g.fillStyle(MALLET_GLASS);
  g.fillRoundedRect(hx + (attack ? 4 : -2), hy - 14, 5, 16, 2);
  g.fillStyle(MALLET_FLUID, 0.75);
  g.fillRoundedRect(hx + (attack ? 5 : -1), hy - 6, 3, 6, 1);
  g.lineStyle(1.5, OUTLINE, 1);
  g.strokeRoundedRect(hx + (attack ? 4 : -2), hy - 14, 5, 16, 2);
  g.fillStyle(MALLET_STAR);
  g.fillCircle(hx + (attack ? 6 : 1), hy - 16, 3.5);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(hx + (attack ? 5 : 0), hy - 17, 1.2);
}

/**
 * Procedural textures for Mochi (axolotl squire + candy thermometer mallet).
 */
export function generateMochiSidekickTextures(scene) {
  const cx = TEX_W / 2;

  const idle = scene.make.graphics({ add: false });
  drawMochiBody(idle, cx, false);
  idle.generateTexture(MOCHI_TEXTURE_IDLE, TEX_W, TEX_H);
  idle.destroy();

  const atk = scene.make.graphics({ add: false });
  drawMochiBody(atk, cx, true);
  atk.generateTexture(MOCHI_TEXTURE_ATTACK, TEX_W, TEX_H);
  atk.destroy();
}
