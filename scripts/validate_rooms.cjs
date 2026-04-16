/* eslint-disable no-console */
/**
 * Validation pass on rooms.js:
 *   - All door targetRoom values resolve
 *   - Every room (except lore/test) has a reachable entry (either playerSpawn or an incoming door)
 *   - Density within budgets
 *   - Each locked boss room has exactly 1 boss
 *   - No duplicate objects at identical coordinates + same type (clutter check)
 *   - All object type names are known to LevelManager
 */

const fs = require('fs');
const path = require('path');

const ROOMS_FILE = path.resolve(__dirname, '..', 'src', 'level', 'rooms.js');
const src = fs.readFileSync(ROOMS_FILE, 'utf8');

const KNOWN_TYPES = new Set([
  'door','ability_orb','bench','crawler','flyer','boss','brute','armored_flyer','charger','spitter',
  'npc','health_pickup','coin','teleport','merchant_shop','moving_platform','pendulum_trap',
  'spike_wall','crumble_platform','magma_pool','fireball_shooter','floor_spikes','saw_blade',
  'flame_jet','ice_patch','icicle_drop','checkpoint_shrine','lore_fragment','secret_wall',
  'ice_crystal_cluster','frozen_banner','fungal_bloom_large','void_rift',
  'weapon_pickup','item_pickup',
  // decoration-only types
  'stalactite','stalactite_sm','stalagmite','fungus','fungus_small','crystal','crystal_cluster',
  'chain','pillar','pillar_broken','vine','light_beam','pine_tree','snow_rock','wood_bridge',
  'mountain_banner','birds_silhouette','ruin_arch','hanging_moss','glow_spore','mud_patch',
  'gravel_patch','tomb_light_beam',
]);

function listRooms() {
  const res = [];
  const re = /function buildRoom(\d+)\(\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    res.push(parseInt(m[1], 10));
  }
  return res.sort((a, b) => a - b);
}

function getRoomRegion(num) {
  const fnStart = src.indexOf(`function buildRoom${num}()`);
  if (fnStart < 0) return null;
  const nextFn = src.slice(fnStart + 1).search(/\n\s*function buildRoom\d+\(\)/);
  const fnEnd = nextFn < 0 ? src.length : fnStart + 1 + nextFn;
  const nameMatch = src.slice(fnStart, fnEnd).match(/name:\s*'([^']+)'/);
  const lockedMatch = src.slice(fnStart, fnEnd).match(/locked:\s*true/);
  return {
    start: fnStart,
    end: fnEnd,
    body: src.slice(fnStart, fnEnd),
    name: nameMatch ? nameMatch[1] : `room${num}`,
    locked: !!lockedMatch,
  };
}

function parseObjects(body) {
  // find objects: [ ... ] block
  const i = body.indexOf('objects: [');
  if (i < 0) return [];
  let depth = 1;
  let j = i + 'objects: ['.length;
  while (j < body.length && depth > 0) {
    const c = body[j];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    if (depth === 0) break;
    j++;
  }
  const inner = body.slice(i + 'objects: ['.length, j);
  const items = [];
  const lines = inner.split('\n');
  let buf = '';
  let d = 0;
  for (const line of lines) {
    if (!line.trim() && !buf) continue;
    buf += (buf ? '\n' : '') + line;
    for (const ch of line) { if (ch === '{' || ch === '[') d++; else if (ch === '}' || ch === ']') d--; }
    if (d === 0) {
      items.push(buf.trim());
      buf = '';
    }
  }
  // Filter out pure comment lines (// ...)
  return items.filter(s => s.length && !/^\s*\/\//.test(s));
}

function extractType(txt) { const m = txt.match(/type:\s*'([^']+)'/); return m ? m[1] : null; }
function extractAttr(txt, name) { const m = txt.match(new RegExp(`${name}:\\s*'([^']+)'`)); return m ? m[1] : null; }
function extractNumAttr(txt, name) { const m = txt.match(new RegExp(`${name}:\\s*(-?\\d+)`)); return m ? parseInt(m[1], 10) : null; }

const roomNums = listRooms();
const rooms = new Map();
for (const n of roomNums) {
  const r = getRoomRegion(n);
  if (!r) continue;
  const objs = parseObjects(r.body).map(txt => ({
    text: txt,
    type: extractType(txt),
    targetRoom: extractAttr(txt, 'targetRoom'),
    bossType: extractAttr(txt, 'bossType'),
    x: extractNumAttr(txt, 'x'),
    y: extractNumAttr(txt, 'y'),
  }));
  rooms.set(`room${n}`, { num: n, name: r.name, locked: r.locked, objects: objs });
}

const flags = [];

function flag(scope, msg) { flags.push(`[${scope}] ${msg}`); }

for (const [id, r] of rooms.entries()) {
  // 1) Door targets resolve
  for (const o of r.objects) {
    if (o.type === 'door' || o.type === 'teleport') {
      if (!o.targetRoom) flag(id, `${o.type} missing targetRoom`);
      else if (!rooms.has(o.targetRoom)) flag(id, `${o.type} → unknown room "${o.targetRoom}"`);
    }
  }

  // 2) Unknown object types
  for (const o of r.objects) {
    if (!o.type) { flag(id, `object missing type: ${o.text.slice(0, 80)}`); continue; }
    if (!KNOWN_TYPES.has(o.type)) flag(id, `unknown object type "${o.type}"`);
  }

  // 3) Density budgets (soft)
  const enemies = r.objects.filter(o => ['crawler','flyer','brute','armored_flyer','charger','spitter','boss'].includes(o.type));
  const traps = r.objects.filter(o => ['pendulum_trap','magma_pool','fireball_shooter','flame_jet','saw_blade','floor_spikes','moving_platform','crumble_platform','spike_wall','ice_patch','icicle_drop'].includes(o.type));
  const enemyMax = r.locked ? 6 : 6;
  const trapMax = r.locked ? 10 : 8;
  if (enemies.length > enemyMax) flag(id, `enemies=${enemies.length} > ${enemyMax}`);
  if (traps.length > trapMax) flag(id, `traps=${traps.length} > ${trapMax}`);

  // 4) locked room must have either a boss or regular enemies (wave-cleared arena)
  if (r.locked) {
    const bosses = r.objects.filter(o => o.type === 'boss');
    const enemyCount = r.objects.filter(o => ['crawler','flyer','brute','armored_flyer','charger','spitter'].includes(o.type)).length;
    if (bosses.length === 0 && enemyCount === 0) flag(id, `locked room has no boss and no enemies`);
    if (bosses.length > 1) flag(id, `locked room has ${bosses.length} bosses`);
  }

  // 5) Duplicate (type,x,y) triples
  const seen = new Map();
  for (const o of r.objects) {
    if (o.x == null || o.y == null) continue;
    const k = `${o.type}@${o.x},${o.y}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const [k, v] of seen.entries()) {
    if (v > 1) flag(id, `duplicate ${k} (${v}x)`);
  }
}

// 6) Reachability — BFS from room1 through doors+teleports
const reachable = new Set(['room1']);
const queue = ['room1'];
while (queue.length) {
  const id = queue.shift();
  const r = rooms.get(id);
  if (!r) continue;
  for (const o of r.objects) {
    if ((o.type === 'door' || o.type === 'teleport') && o.targetRoom) {
      if (rooms.has(o.targetRoom) && !reachable.has(o.targetRoom)) {
        reachable.add(o.targetRoom);
        queue.push(o.targetRoom);
      }
    }
  }
}

for (const [id, r] of rooms.entries()) {
  if (id === 'room_organic') continue;
  if (!reachable.has(id)) flag(id, 'unreachable from room1');
}

// 7) Ability orb collectibility — ensure orbs aren't embedded in walls (heuristic only)
// Skipped without full tile simulation.

// Print summary
console.log('====================================');
console.log('ROOM VALIDATION');
console.log('====================================');
console.log(`Rooms scanned: ${rooms.size}`);
console.log(`Flags: ${flags.length}`);
console.log('');
if (flags.length) {
  for (const f of flags) console.log('  ' + f);
  process.exit(1);
} else {
  console.log('  OK — no validation flags');
  process.exit(0);
}
