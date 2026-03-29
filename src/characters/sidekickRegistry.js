import { SIDEKICK_CONFIG as mochi } from './mochi_axolotl/config.js';
import { SIDEKICK_CONFIG as pip } from './pip_pangolin/config.js';
import { SIDEKICK_CONFIG as buzz } from './buzz_beetle/config.js';
import { SIDEKICK_CONFIG as nimbus } from './nimbus_slime/config.js';
import { SIDEKICK_CONFIG as ember } from './ember_fox/config.js';
import { SIDEKICK_CONFIG as fig } from './fig_gecko/config.js';

import { generateMochiSidekickTextures } from './mochi_axolotl/textures.js';
import { generatePipSidekickTextures } from './pip_pangolin/textures.js';
import { generateBuzzSidekickTextures } from './buzz_beetle/textures.js';
import { generateNimbusSidekickTextures } from './nimbus_slime/textures.js';
import { generateEmberSidekickTextures } from './ember_fox/textures.js';
import { generateFigSidekickTextures } from './fig_gecko/textures.js';

/** @type {import('./sidekickTypes.js').SidekickConfig[]} */
export const SIDEKICK_LIST = [mochi, pip, buzz, nimbus, ember, fig];

/** @type {Record<string, import('./sidekickTypes.js').SidekickConfig>} */
export const SIDEKICK_BY_ID = Object.fromEntries(SIDEKICK_LIST.map((c) => [c.id, c]));

export const DEFAULT_SIDEKICK_ID = mochi.id;

/** @param {string} id */
export function getSidekickConfig(id) {
  return SIDEKICK_BY_ID[id] || SIDEKICK_BY_ID[DEFAULT_SIDEKICK_ID];
}

/** @param {string} [id] */
export function isValidSidekickId(id) {
  return typeof id === 'string' && id in SIDEKICK_BY_ID;
}

export function generateAllSidekickTextures(scene) {
  generateMochiSidekickTextures(scene);
  generatePipSidekickTextures(scene);
  generateBuzzSidekickTextures(scene);
  generateNimbusSidekickTextures(scene);
  generateEmberSidekickTextures(scene);
  generateFigSidekickTextures(scene);
}
