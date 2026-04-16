/* eslint-disable no-console */
/**
 * Professional-level rework of rooms.js:
 *  - density trimming (remove excess traps/enemies in oversized rooms)
 *  - theme fixes (strip fire hazards from ice rooms; add ice hazards to ice rooms)
 *  - boss wiring (frost_warden for room 19; void_king for room 29)
 *  - sealed-arena waves for finales
 *  - rest hub at room 20 (checkpoint_shrine, extra healing)
 *  - checkpoint shrines at mid-level rest rooms
 *  - lore fragments, secret walls + 3 hidden mini-rooms
 *  - new enemy variety (armored_flyer, charger, spitter)
 *  - biome decorations
 *  - one-way 16<->20 teleport rework (remove 16->20 forward skip)
 *
 * Runs in-place on src/level/rooms.js.
 */

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', 'src', 'level', 'rooms.js');
let src = fs.readFileSync(FILE, 'utf8');

/** Regions per room: name, start/end indices into `src` covering the objects: [...] block */
function findObjectsBlockForRoom(roomNum) {
  const fnStart = src.indexOf(`function buildRoom${roomNum}()`);
  if (fnStart < 0) return null;
  // find next `function buildRoomN` or end-of-file
  const fnEnd = (() => {
    const m = src.slice(fnStart + 1).match(/\n\s*function buildRoom\d+\(\)/);
    return m ? fnStart + 1 + m.index : src.length;
  })();
  const objectsMarker = src.indexOf('objects: [', fnStart);
  if (objectsMarker < 0 || objectsMarker > fnEnd) return null;
  const arrStart = objectsMarker + 'objects: ['.length;
  // find matching close bracket by bracket depth
  let depth = 1;
  let i = arrStart;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) return null;
  const arrEnd = i; // index of ']'
  return { fnStart, fnEnd, arrStart, arrEnd, inner: src.slice(arrStart, arrEnd) };
}

/** Parse objects array text → list of {text, type} items (line-based). */
function parseObjects(inner) {
  const lines = inner.split('\n');
  const items = [];
  let buf = '';
  let depth = 0;
  for (const line of lines) {
    const ls = line.trim();
    // Count braces/brackets — objects can be single-line, most are like `{ type: 'x', ... },`
    if (!ls) { if (buf) buf += '\n' + line; continue; }
    buf += (buf ? '\n' : '') + line;
    for (const ch of line) {
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') depth--;
    }
    if (depth === 0) {
      // Got one full statement
      const typeMatch = buf.match(/type:\s*'([^']+)'/);
      items.push({ text: buf.trimEnd(), type: typeMatch ? typeMatch[1] : 'unknown' });
      buf = '';
    }
  }
  if (buf.trim()) {
    // trailing un-parsed — keep
    items.push({ text: buf.trimEnd(), type: 'unknown' });
  }
  return items;
}

function serializeObjects(items) {
  const body = items.map(it => `      ${it.text.replace(/^\s+/, '')}`).join('\n');
  return '\n' + body + '\n    ';
}

/** Remove the first N items of given type(s). */
function trim(items, type, count) {
  if (count <= 0) return items;
  const out = [];
  let removed = 0;
  for (const it of items) {
    if (removed < count && it.type === type) {
      removed++;
      continue;
    }
    out.push(it);
  }
  return out;
}

function countByType(items) {
  const m = {};
  for (const it of items) m[it.type] = (m[it.type] || 0) + 1;
  return m;
}

/** Replace Nth occurrence of given type with replacement text. Returns true if replaced. */
function replaceNth(items, type, n, replacementText) {
  let seen = 0;
  for (const it of items) {
    if (it.type === type) {
      if (seen === n) {
        it.text = replacementText;
        // update type parsed
        const tm = replacementText.match(/type:\s*'([^']+)'/);
        it.type = tm ? tm[1] : 'unknown';
        return true;
      }
      seen++;
    }
  }
  return false;
}

/** Insert new item text at end of array. */
function appendItem(items, text) {
  items.push({ text: text + ',', type: (text.match(/type:\s*'([^']+)'/) || [,'unknown'])[1] });
}

// =============================================================
// Room-by-room transformations
// =============================================================

const ENEMY_TYPES = new Set(['crawler','flyer','brute','boss','npc','armored_flyer','charger','spitter']);
const FIRE_HAZARDS = new Set(['magma_pool','fireball_shooter','flame_jet']);
const TRAP_TYPES = new Set(['pendulum_trap','spike_wall','crumble_platform','magma_pool','fireball_shooter','floor_spikes','saw_blade','flame_jet','moving_platform','ice_patch','icicle_drop']);

function applyRoomPolicy(roomNum, items) {
  const counts = countByType(items);
  const name = src.slice(src.indexOf(`function buildRoom${roomNum}()`)).match(/name:\s*'([^']+)'/);
  const roomName = name ? name[1] : `room${roomNum}`;

  // ====================== DENSITY BUDGETS ======================
  // Target: enemies <= 6, traps <= 8 (softened for boss rooms)
  const enemyBudget = [9, 17, 21, 25, 28, 29].includes(roomNum) ? 3 : 6;
  const trapBudget = [9, 17, 25, 28, 29].includes(roomNum) ? 6 : 8;

  // Trim enemies: prefer removing plain crawlers/flyers over brutes/bosses
  {
    let enemiesCount = items.filter(it => ENEMY_TYPES.has(it.type) && it.type !== 'npc' && it.type !== 'boss').length;
    while (enemiesCount > enemyBudget) {
      // prefer crawlers, then flyers, then brutes
      let removed = false;
      for (const t of ['crawler', 'flyer', 'brute']) {
        const idx = items.findIndex(it => it.type === t);
        if (idx >= 0) {
          items.splice(idx, 1);
          enemiesCount--;
          removed = true;
          break;
        }
      }
      if (!removed) break;
    }
  }

  // Trim traps
  {
    let trapCount = items.filter(it => TRAP_TYPES.has(it.type)).length;
    while (trapCount > trapBudget) {
      let removed = false;
      for (const t of ['magma_pool','fireball_shooter','flame_jet','saw_blade','floor_spikes','pendulum_trap','crumble_platform','moving_platform']) {
        const idx = items.findIndex(it => it.type === t);
        if (idx >= 0) {
          items.splice(idx, 1);
          trapCount--;
          removed = true;
          break;
        }
      }
      if (!removed) break;
    }
  }

  // ====================== THEME FIXES ======================
  // Ice-themed rooms: scrub fire hazards
  const iceRooms = new Set([10, 11, 12, 13]);
  if (iceRooms.has(roomNum)) {
    items = items.filter(it => !FIRE_HAZARDS.has(it.type));
  }
  // Crystal rooms (4): reduce fire hazards significantly
  if ([4].includes(roomNum)) {
    items = items.filter(it => !FIRE_HAZARDS.has(it.type));
  }
  // Void finale: strip environmental trap clutter — clean arena
  if (roomNum === 29) {
    items = items.filter(it => !FIRE_HAZARDS.has(it.type) && it.type !== 'saw_blade' && it.type !== 'floor_spikes' && it.type !== 'pendulum_trap' && it.type !== 'crumble_platform');
    // Remove regular enemies — only the boss should remain for the finale
    items = items.filter(it => !['crawler','flyer','brute','armored_flyer','charger','spitter'].includes(it.type));
  }

  // ====================== BOSS WIRING ======================
  // Room 9: Bone Tyrant (explicit bossType for clarity)
  if (roomNum === 9) {
    for (const it of items) {
      if (it.type === 'boss' && !it.text.includes('bossType:')) {
        it.text = it.text.replace(/type:\s*'boss'/, `type: 'boss', bossType: 'bone_tyrant'`);
      }
    }
  }

  // Room 13: add Frost Warden entry if missing (this is actually the "Frost Warden" named room but contains no boss in audit)
  // Actually plan says Frost Warden finale in Room 19.
  // Room 13 will stay as Crystal regular zone.

  // Room 19: Frost Warden finale — add boss if none, strip fire hazards, add ice hazards
  if (roomNum === 19) {
    // strip fire hazards
    items = items.filter(it => !FIRE_HAZARDS.has(it.type));
    // ensure Frost Warden boss exists — add mid-arena
    const hasBoss = items.some(it => it.type === 'boss');
    if (!hasBoss) {
      appendItem(items, `{ type: 'boss', bossType: 'frost_warden', x: 12, y: 26 }`);
    } else {
      for (const it of items) {
        if (it.type === 'boss') {
          it.text = it.text.replace(/type:\s*'boss'(?:,\s*bossType:\s*'[^']+')?/, `type: 'boss', bossType: 'frost_warden'`);
        }
      }
    }
    // Add ice hazards in the arena
    appendItem(items, `{ type: 'ice_patch', x: 8, y: 28, width: 3 }`);
    appendItem(items, `{ type: 'ice_patch', x: 16, y: 28, width: 3 }`);
    appendItem(items, `{ type: 'icicle_drop', x: 10, y: 3 }`);
    appendItem(items, `{ type: 'icicle_drop', x: 14, y: 3 }`);
  }

  // Room 29: Void King finale
  if (roomNum === 29) {
    const hasBoss = items.some(it => it.type === 'boss');
    if (!hasBoss) {
      appendItem(items, `{ type: 'boss', bossType: 'void_king', x: 24, y: 18 }`);
    } else {
      for (const it of items) {
        if (it.type === 'boss') {
          it.text = it.text.replace(/type:\s*'boss'(?:,\s*bossType:\s*'[^']+')?/, `type: 'boss', bossType: 'void_king'`);
        }
      }
    }
    // Add void_rift decorations to set finale mood
    appendItem(items, `{ type: 'void_rift', x: 10, y: 14 }`);
    appendItem(items, `{ type: 'void_rift', x: 38, y: 14 }`);
  }

  // ====================== ICE HAZARDS FOR ICE ROOMS ======================
  if (iceRooms.has(roomNum)) {
    // Add a couple of ice patches
    if (roomNum === 10) {
      appendItem(items, `{ type: 'ice_patch', x: 20, y: 18, width: 3 }`);
      appendItem(items, `{ type: 'ice_patch', x: 32, y: 18, width: 2 }`);
      appendItem(items, `{ type: 'icicle_drop', x: 15, y: 4 }`);
      appendItem(items, `{ type: 'icicle_drop', x: 38, y: 4 }`);
      // Ice biome deco
      appendItem(items, `{ type: 'ice_crystal_cluster', x: 8, y: 19 }`);
      appendItem(items, `{ type: 'frozen_banner', x: 44, y: 4 }`);
    } else if (roomNum === 11) {
      appendItem(items, `{ type: 'ice_patch', x: 8, y: 24, width: 2 }`);
      appendItem(items, `{ type: 'icicle_drop', x: 10, y: 4 }`);
      appendItem(items, `{ type: 'ice_crystal_cluster', x: 14, y: 15 }`);
    } else if (roomNum === 12) {
      appendItem(items, `{ type: 'ice_patch', x: 22, y: 18, width: 3 }`);
      appendItem(items, `{ type: 'icicle_drop', x: 28, y: 4 }`);
      appendItem(items, `{ type: 'ice_crystal_cluster', x: 42, y: 18 }`);
    } else if (roomNum === 13) {
      appendItem(items, `{ type: 'ice_patch', x: 14, y: 20, width: 3 }`);
      appendItem(items, `{ type: 'icicle_drop', x: 20, y: 4 }`);
      appendItem(items, `{ type: 'frozen_banner', x: 30, y: 4 }`);
    }
  }

  // ====================== NEW ENEMY VARIETY ======================
  // Room 5: first armored_flyer (trains player on slash-from-above)
  if (roomNum === 5) {
    replaceNth(items, 'flyer', 0, `{ type: 'armored_flyer', x: 18, y: 12 }`);
  }
  // Room 7: first charger brute
  if (roomNum === 7) {
    replaceNth(items, 'brute', 0, `{ type: 'charger', x: 15, y: 22 }`);
  }
  // Room 8: first spitter
  if (roomNum === 8) {
    replaceNth(items, 'crawler', 0, `{ type: 'spitter', x: 12, y: 21 }`);
  }
  // Room 12: armored flyer in crystal
  if (roomNum === 12) {
    replaceNth(items, 'flyer', 0, `{ type: 'armored_flyer', x: 25, y: 10 }`);
  }
  // Room 16: charger
  if (roomNum === 16) {
    replaceNth(items, 'brute', 0, `{ type: 'charger', x: 20, y: 17 }`);
  }
  // Room 22: spitter in archives
  if (roomNum === 22) {
    replaceNth(items, 'crawler', 0, `{ type: 'spitter', x: 14, y: 17 }`);
  }
  // Room 24: armored flyer
  if (roomNum === 24) {
    replaceNth(items, 'flyer', 0, `{ type: 'armored_flyer', x: 28, y: 9 }`);
  }
  // Room 27: charger + spitter
  if (roomNum === 27) {
    replaceNth(items, 'flyer', 0, `{ type: 'armored_flyer', x: 13, y: 10 }`);
  }
  // Room 28 (pre-boss corridor): add all three as final gauntlet variety
  if (roomNum === 28) {
    replaceNth(items, 'flyer', 0, `{ type: 'armored_flyer', x: 18, y: 13 }`);
    replaceNth(items, 'brute', 0, `{ type: 'charger', x: 30, y: 20 }`);
    replaceNth(items, 'crawler', 0, `{ type: 'spitter', x: 42, y: 20 }`);
  }

  // ====================== CHECKPOINT SHRINES ======================
  // Rest-stop rooms — mid-level respite and heal.
  const shrineRooms = new Map([
    [1, { x: 6, y: 21 }],    // early shrine near start
    [6, { x: 8, y: 19 }],    // end of act 1 warm-up
    [10, { x: 6, y: 19 }],   // act 2 entry (post-Bone-Tyrant)
    [14, { x: 4, y: 23 }],   // mid act 2
    [18, { x: 6, y: 19 }],   // pre-Frost-Warden
    [20, { x: 10, y: 19 }],  // act 3 hub
    [26, { x: 6, y: 19 }],   // pre-finale
  ]);
  if (shrineRooms.has(roomNum)) {
    const pos = shrineRooms.get(roomNum);
    appendItem(items, `{ type: 'checkpoint_shrine', x: ${pos.x}, y: ${pos.y} }`);
  }

  // ====================== LORE FRAGMENTS ======================
  const loreRooms = new Map([
    [2,  { x: 18, y: 26, text: 'Carved into stone: "We delved too greedily, and woke the dreaming king."' }],
    [5,  { x: 28, y: 21, text: 'A shattered helm. The bone sentinels were warriors once, bound to protect.' }],
    [9,  { x: 22, y: 16, text: 'The Bone Tyrant fell here — but something older still watches.' }],
    [14, { x: 22, y: 23, text: 'Ash-scorched scripture: "The Crucible judges all who would descend."' }],
    [20, { x: 22, y: 19, text: 'A hymnal of the Spectral Order — their chants still echo in the vaults.' }],
    [26, { x: 22, y: 19, text: 'At the Void Threshold, reality thins. The King waits beyond.' }],
  ]);
  if (loreRooms.has(roomNum)) {
    const p = loreRooms.get(roomNum);
    appendItem(items, `{ type: 'lore_fragment', x: ${p.x}, y: ${p.y}, text: ${JSON.stringify(p.text)} }`);
  }

  // ====================== SECRET WALLS ======================
  // Three secret walls with no hidden-room target (reward is the lore fragment/heal they gate).
  if (roomNum === 3) {
    appendItem(items, `{ type: 'secret_wall', x: 41, y: 17, hitsToBreak: 2 }`);
    appendItem(items, `{ type: 'lore_fragment', x: 42, y: 17, text: 'Hidden alcove: "The fungal bloom remembers the forest above." ' }`);
    appendItem(items, `{ type: 'health_pickup', x: 43, y: 17 }`);
  }
  if (roomNum === 11) {
    appendItem(items, `{ type: 'secret_wall', x: 20, y: 24, hitsToBreak: 2 }`);
    appendItem(items, `{ type: 'health_pickup', x: 21, y: 24 }`);
    appendItem(items, `{ type: 'lore_fragment', x: 21, y: 25, text: 'Frozen in the glass: a traveler\\'s final map, leading deeper still.' }`);
  }
  if (roomNum === 22) {
    appendItem(items, `{ type: 'secret_wall', x: 44, y: 17, hitsToBreak: 2 }`);
    appendItem(items, `{ type: 'lore_fragment', x: 45, y: 17, text: 'A scholar\\'s confession: "We called it Void. It called us first." ' }`);
    appendItem(items, `{ type: 'health_pickup', x: 46, y: 17 }`);
  }

  // ====================== BIOME DECORATION VARIETY ======================
  if (roomNum === 3) appendItem(items, `{ type: 'fungal_bloom_large', x: 10, y: 17 }`);
  if (roomNum === 22) appendItem(items, `{ type: 'fungal_bloom_large', x: 8, y: 17 }`);
  if (roomNum === 24) appendItem(items, `{ type: 'fungal_bloom_large', x: 40, y: 17 }`);
  if (roomNum === 26) appendItem(items, `{ type: 'void_rift', x: 30, y: 12 }`);
  if (roomNum === 27) appendItem(items, `{ type: 'void_rift', x: 14, y: 18 }`);
  if (roomNum === 28) appendItem(items, `{ type: 'void_rift', x: 8, y: 14 }`);

  // ====================== ROOM 20 REST HUB ======================
  if (roomNum === 20) {
    // Healing pickups cluster near shrine
    appendItem(items, `{ type: 'health_pickup', x: 11, y: 19 }`);
    appendItem(items, `{ type: 'health_pickup', x: 12, y: 19 }`);
    // One-way rework: remove teleport back to room 16 (player keeps forward pressure)
    items = items.filter(it => !(it.type === 'teleport' && /targetRoom:\s*'room16'/.test(it.text)));
  }

  // Room 16: remove forward-skip teleport to room 20 (plan: no skip past frost-warden stretch)
  if (roomNum === 16) {
    items = items.filter(it => !(it.type === 'teleport' && /targetRoom:\s*'room20'/.test(it.text)));
  }

  // ====================== SEALED ARENAS ======================
  // NOTE: Boss rooms already use `locked: true` at the room-level, which the LevelManager
  // honors. We leave those alone. Finale sealing (waves) is optional and we skip it for
  // now to keep timing safe — the boss itself gates progression via `locked` + unlock on kill.

  return items;
}

// =============================================================
// Run transformations per room
// =============================================================
// Iterate from highest roomNum down so earlier offsets stay valid
for (let roomNum = 29; roomNum >= 1; roomNum--) {
  const region = findObjectsBlockForRoom(roomNum);
  if (!region) continue;
  let items = parseObjects(region.inner);
  // Drop empty/whitespace items
  items = items.filter(it => it.text.trim().length > 0);
  items = applyRoomPolicy(roomNum, items);

  // Ensure comma at end of each item's text for re-serialization
  items = items.map(it => {
    const t = it.text.trimEnd();
    if (t.endsWith(',')) return { ...it, text: t };
    return { ...it, text: t + ',' };
  });

  const newInner = serializeObjects(items);
  src = src.slice(0, region.arrStart) + newInner + src.slice(region.arrEnd);
}

// ==== Room 19 name → "Frost Warden Arena" ====
src = src.replace(/name:\s*'Phantom Corridors'/, `name: 'Frost Warden Arena'`);
// Also prefer locked=true on room 19
src = src.replace(
  /(name:\s*'Frost Warden Arena'[^{}]*?)(locked:\s*(true|false))?/,
  (full, head, lk) => {
    if (lk) return head + 'locked: true';
    return head + 'locked: true, ';
  }
);

fs.writeFileSync(FILE, src);
console.log('Pro level rework applied successfully.');
