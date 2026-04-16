/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const FILE = path.resolve(__dirname, '..', 'src', 'level', 'rooms.js');
let src = fs.readFileSync(FILE, 'utf8');

function findObjectsBlockForRoom(roomNum) {
  const fnStart = src.indexOf(`function buildRoom${roomNum}()`);
  if (fnStart < 0) return null;
  const next = src.slice(fnStart + 1).match(/\n\s*function buildRoom\d+\(\)/);
  const fnEnd = next ? fnStart + 1 + next.index : src.length;
  const objectsMarker = src.indexOf('objects: [', fnStart);
  if (objectsMarker < 0 || objectsMarker > fnEnd) return null;
  const arrStart = objectsMarker + 'objects: ['.length;
  let depth = 1, i = arrStart;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    if (depth === 0) break;
    i++;
  }
  return { arrStart, arrEnd: i, inner: src.slice(arrStart, i) };
}
function parseObjects(inner) {
  const lines = inner.split('\n');
  const items = [];
  let buf = '', depth = 0;
  for (const line of lines) {
    if (!line.trim() && !buf) continue;
    buf += (buf ? '\n' : '') + line;
    for (const ch of line) { if (ch === '{' || ch === '[') depth++; else if (ch === '}' || ch === ']') depth--; }
    if (depth === 0) {
      const t = buf.match(/type:\s*'([^']+)'/);
      items.push({ text: buf.trimEnd(), type: t ? t[1] : null });
      buf = '';
    }
  }
  return items;
}
function serialize(items) {
  return '\n' + items.map(it => '      ' + it.text.replace(/^\s+/, '')).join('\n') + '\n    ';
}

const TRAPS = ['pendulum_trap','magma_pool','fireball_shooter','flame_jet','saw_blade','floor_spikes','moving_platform','crumble_platform','spike_wall','ice_patch','icicle_drop'];

const plan = [
  { room: 10, trapMax: 8 },
  { room: 11, trapMax: 8 },
  { room: 12, trapMax: 8 },
  { room: 19, trapMax: 10 }, // boss arena gets higher budget
];

for (const { room, trapMax } of plan) {
  const region = findObjectsBlockForRoom(room);
  if (!region) continue;
  let items = parseObjects(region.inner).filter(it => it.text.trim().length && !/^\s*\/\//.test(it.text));
  let count = items.filter(it => TRAPS.includes(it.type)).length;
  // Priority: drop pendulum_trap, then saw_blade, then crumble_platform, then moving_platform, then floor_spikes
  const dropOrder = ['pendulum_trap','saw_blade','crumble_platform','moving_platform','floor_spikes','spike_wall'];
  while (count > trapMax) {
    let removed = false;
    for (const t of dropOrder) {
      const idx = items.findIndex(it => it.type === t);
      if (idx >= 0) { items.splice(idx, 1); count--; removed = true; break; }
    }
    if (!removed) break;
  }
  items = items.map(it => ({ ...it, text: it.text.endsWith(',') ? it.text : it.text + ',' }));
  const newInner = serialize(items);
  src = src.slice(0, region.arrStart) + newInner + src.slice(region.arrEnd);
}

fs.writeFileSync(FILE, src);
console.log('Ice/frost room trap trim applied.');
