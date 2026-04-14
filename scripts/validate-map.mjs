/**
 * Build-time map connectivity check (topology only).
 * Does not model ability gates yet — add BFS state = (room, abilitySet) when you
 * encode orb pickup order per room.
 */
import { rooms } from '../src/level/rooms.js';

const START = 'room1';

function outgoing(room) {
  const list = [];
  for (const obj of room.objects || []) {
    if ((obj.type === 'door' || obj.type === 'teleport') && obj.targetRoom) {
      list.push({
        to: obj.targetRoom,
        requires: obj.requiresAbilities || [],
      });
    }
  }
  return list;
}

const ids = new Set(Object.keys(rooms));
const badRefs = [];

for (const [from, room] of Object.entries(rooms)) {
  for (const { to } of outgoing(room)) {
    if (!ids.has(to)) {
      badRefs.push(`${from} → missing "${to}"`);
    }
  }
}

if (badRefs.length) {
  console.error('[validate-map] Broken door/teleport targets:\n', badRefs.join('\n'));
  process.exit(1);
}

const seen = new Set([START]);
const queue = [START];
while (queue.length) {
  const id = queue.shift();
  const room = rooms[id];
  if (!room) continue;
  for (const { to } of outgoing(room)) {
    if (!seen.has(to)) {
      seen.add(to);
      queue.push(to);
    }
  }
}

const optionalUnreachable = new Set(['room_organic']);
const unreachable = [...ids].filter((id) => !seen.has(id) && !optionalUnreachable.has(id));
if (unreachable.length) {
  console.warn(
    `[validate-map] ${unreachable.length} room(s) not reachable from ${START} (topology; ignores requiresAbilities):`,
    unreachable.join(', '),
  );
}
const skipped = [...ids].filter((id) => !seen.has(id) && optionalUnreachable.has(id));
if (skipped.length) {
  console.log('[validate-map] Optional / dev rooms skipped for reachability:', skipped.join(', '));
}
if (!unreachable.length) {
  console.log(`[validate-map] OK — all gameplay rooms reachable from ${START} (topology only).`);
}
