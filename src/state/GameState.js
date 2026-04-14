/**
 * Persistent world progress (flags, boss clears) separate from the Player body.
 * Abilities and stats stay on Player; this tracks cross-room / story state.
 */
export class GameState {
  constructor() {
    /** @type {Map<string, boolean>} */
    this.flags = new Map();
    /** @type {Map<string, boolean>} boss / unique encounter id → defeated */
    this.bosses = new Map();
  }

  reset() {
    this.flags.clear();
    this.bosses.clear();
  }

  /**
   * @param {string} key
   * @param {boolean} [value=true]
   */
  setFlag(key, value = true) {
    if (!key) return;
    this.flags.set(key, !!value);
  }

  /** @param {string} key */
  hasFlag(key) {
    return !!this.flags.get(key);
  }

  /**
   * @param {string} id
   * @param {boolean} [defeated=true]
   */
  setBossDefeated(id, defeated = true) {
    if (!id) return;
    this.bosses.set(id, !!defeated);
  }

  /** @param {string} id */
  isBossDefeated(id) {
    return !!this.bosses.get(id);
  }

  toJSON() {
    return {
      flags: Object.fromEntries(this.flags),
      bosses: Object.fromEntries(this.bosses),
    };
  }

  /**
   * @param {object|null|undefined} data
   */
  fromJSON(data) {
    this.reset();
    if (!data || typeof data !== 'object') return;
    if (data.flags && typeof data.flags === 'object') {
      for (const [k, v] of Object.entries(data.flags)) {
        if (v) this.flags.set(k, true);
      }
    }
    if (data.bosses && typeof data.bosses === 'object') {
      for (const [k, v] of Object.entries(data.bosses)) {
        if (v) this.bosses.set(k, true);
      }
    }
  }
}
