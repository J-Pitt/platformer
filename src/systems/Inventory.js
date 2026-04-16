/**
 * Weapon catalog + Inventory system.
 *
 * A "weapon" here is a *melee* swing profile (reach / cooldown / damage / knockback).
 * The Combat system reads the active weapon from `player.inventory.activeWeapon()`
 * to shape every slash. Ranged secondary (throwing daggers) is separate — see
 * `inventory.hasThrowingDaggers` / `tryThrowDagger()`.
 *
 * Intentionally data-driven so adding a new weapon is: add an entry here, place a
 * pickup in rooms.js, done.
 */

export const WEAPONS = {
  // Default weapon — always present.
  rusted_blade: {
    id: 'rusted_blade',
    name: 'Rusted Blade',
    desc: 'A battered sword. Reliable, if unremarkable.',
    icon: 'weapon_rusted_blade',
    damage: 1,
    reach: 1.0,
    cooldownMs: 400,
    slashMs: 320,
    knockback: 200,
    color: 0xa8a8b0,
    starter: true,
  },
  phantom_edge: {
    id: 'phantom_edge',
    name: 'Phantom Edge',
    desc: 'A whisper-light blade. Strikes twice as fast but shallow of reach.',
    icon: 'weapon_phantom_edge',
    damage: 1,
    reach: 0.85,
    cooldownMs: 220,
    slashMs: 200,
    knockback: 140,
    color: 0x88ccff,
  },
  warden_greatsword: {
    id: 'warden_greatsword',
    name: "Warden's Greatsword",
    desc: 'Massive. Slow. Crushing. Two damage per swing, and it stays out longer.',
    icon: 'weapon_warden_greatsword',
    damage: 2,
    reach: 1.45,
    cooldownMs: 620,
    slashMs: 420,
    knockback: 320,
    color: 0xffc05a,
  },
  // Upgraded spear still works — the "spear" flag is a passive that strengthens
  // whatever blade is equipped. We model it as a permanent modifier (see Combat).
};

export const CONSUMABLES = {
  ether_vial: {
    id: 'ether_vial',
    name: 'Ether Vial',
    desc: 'Restores 2 HP when used. Quaff on demand.',
    icon: 'item_ether_vial',
    effect: (player) => {
      if (player.hp >= player.maxHp) return false;
      player.hp = Math.min(player.maxHp, player.hp + 2);
      if (player.scene.hud) player.scene.hud.refresh();
      return true;
    },
  },
  soul_crystal: {
    id: 'soul_crystal',
    name: 'Soul Crystal',
    desc: 'A shard of condensed vitality. +1 Max HP, fully restored.',
    icon: 'item_soul_crystal',
    effect: (player) => {
      player.maxHp += 1;
      player.hp = player.maxHp;
      if (player.scene.hud) player.scene.hud.rebuildHealthOrbs?.();
      if (player.scene.hud) player.scene.hud.refresh();
      return true;
    },
  },
};

export class Inventory {
  constructor(player) {
    this.player = player;
    /** Map<weaponId, true> */
    this.weaponsOwned = { rusted_blade: true };
    this.activeWeaponId = 'rusted_blade';
    /** Map<consumableId, count> */
    this.consumables = {};
    /** Set<loreId> — keyed by lore text or explicit id */
    this.loreCollected = new Set();
    /** Throwing daggers ammo / ability */
    this.hasThrowingDaggers = false;
    this.daggerAmmo = 0;
    this.daggerAmmoMax = 6;
    this.daggerCooldownMs = 0;
    this.throwCooldownDuration = 320;
  }

  update(dt) {
    if (this.daggerCooldownMs > 0) this.daggerCooldownMs -= dt;
  }

  activeWeapon() {
    return WEAPONS[this.activeWeaponId] || WEAPONS.rusted_blade;
  }

  ownsWeapon(id) { return !!this.weaponsOwned[id]; }

  acquireWeapon(id) {
    if (!WEAPONS[id]) return false;
    if (this.weaponsOwned[id]) return false;
    this.weaponsOwned[id] = true;
    return true;
  }

  setActiveWeapon(id) {
    if (!this.weaponsOwned[id]) return false;
    this.activeWeaponId = id;
    if (this.player.scene.hud?.refreshWeaponBadge) {
      this.player.scene.hud.refreshWeaponBadge();
    }
    return true;
  }

  grantThrowingDaggers(ammo = 6) {
    this.hasThrowingDaggers = true;
    this.daggerAmmo = Math.min(this.daggerAmmoMax, this.daggerAmmo + ammo);
  }

  refillDaggers(amount = 3) {
    this.daggerAmmo = Math.min(this.daggerAmmoMax, this.daggerAmmo + amount);
  }

  addConsumable(id, amount = 1) {
    if (!CONSUMABLES[id]) return;
    this.consumables[id] = (this.consumables[id] || 0) + amount;
  }

  consumableCount(id) { return this.consumables[id] || 0; }

  useConsumable(id) {
    if (!this.consumables[id] || this.consumables[id] <= 0) return false;
    const c = CONSUMABLES[id];
    if (!c) return false;
    const ok = c.effect(this.player);
    if (!ok) return false;
    this.consumables[id] -= 1;
    if (this.consumables[id] <= 0) delete this.consumables[id];
    return true;
  }

  addLore(id, text) {
    if (this.loreCollected.has(id)) return false;
    this.loreCollected.add(id);
    if (!this._loreIndex) this._loreIndex = {};
    this._loreIndex[id] = text;
    return true;
  }

  getLoreEntries() {
    if (!this._loreIndex) return [];
    return Array.from(this.loreCollected).map((id) => ({ id, text: this._loreIndex[id] }));
  }

  tryThrowDagger() {
    if (!this.hasThrowingDaggers) return false;
    if (this.daggerAmmo <= 0) return false;
    if (this.daggerCooldownMs > 0) return false;
    this.daggerAmmo -= 1;
    this.daggerCooldownMs = this.throwCooldownDuration;
    return true;
  }

  toJSON() {
    return {
      weaponsOwned: Object.keys(this.weaponsOwned),
      activeWeaponId: this.activeWeaponId,
      consumables: { ...this.consumables },
      loreIds: [...this.loreCollected],
      loreIndex: this._loreIndex ? { ...this._loreIndex } : {},
      hasThrowingDaggers: this.hasThrowingDaggers,
      daggerAmmo: this.daggerAmmo,
      daggerAmmoMax: this.daggerAmmoMax,
    };
  }

  fromJSON(s) {
    if (!s || typeof s !== 'object') return;
    this.weaponsOwned = { rusted_blade: true };
    for (const id of s.weaponsOwned || []) {
      if (WEAPONS[id]) this.weaponsOwned[id] = true;
    }
    if (s.activeWeaponId && this.weaponsOwned[s.activeWeaponId]) {
      this.activeWeaponId = s.activeWeaponId;
    }
    this.consumables = {};
    for (const [k, v] of Object.entries(s.consumables || {})) {
      if (CONSUMABLES[k]) this.consumables[k] = v | 0;
    }
    this.loreCollected = new Set(s.loreIds || []);
    this._loreIndex = s.loreIndex ? { ...s.loreIndex } : {};
    this.hasThrowingDaggers = !!s.hasThrowingDaggers;
    this.daggerAmmoMax = s.daggerAmmoMax || 6;
    this.daggerAmmo = Math.min(this.daggerAmmoMax, s.daggerAmmo || 0);
  }
}
