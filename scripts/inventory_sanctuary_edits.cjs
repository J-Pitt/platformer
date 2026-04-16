/* eslint-disable */
// Apply inventory/shop/sanctuary edits to rooms.js
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'level', 'rooms.js');
let src = fs.readFileSync(file, 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERT FAIL:', msg);
    process.exit(1);
  }
}

// --- 1) Prune duplicate checkpoint_shrines: keep rooms 1, 14, 26 only ----
// Current: 1, 6, 10, 14, 18, 20, 26 — remove from 6, 10, 18, 20.
// Keep line tokens to surgically match in each room.
{
  const before = src;
  // Remove from room 6 (line 791-ish): { type: 'checkpoint_shrine', x: 8, y: 19 },
  src = src.replace(/      \{ type: 'checkpoint_shrine', x: 8, y: 19 \},\n/g, '');
  // Remove from room 10: { type: 'checkpoint_shrine', x: 6, y: 19 },  — twice; keep 14 and 26 intact.
  // Use unique surrounding context for room10: its ambience line below
  src = src.replace(
    /      \{ type: 'checkpoint_shrine', x: 6, y: 19 \},\n(      \{ type: 'ice_crystal_cluster', x: 14, y: 13 \},)/,
    '$1\n',
  );
  // Remove from room 18: x: 4, y: 23
  src = src.replace(/      \{ type: 'checkpoint_shrine', x: 4, y: 23 \},\n/g, '');
  // Remove from room 20: x: 10, y: 19
  src = src.replace(/      \{ type: 'checkpoint_shrine', x: 10, y: 19 \},\n/g, '');
  assert(src !== before, 'shrine-prune removed nothing');
}

// --- 2) Wire existing secret walls (rooms 3, 11, 22) to sanctuary rooms ---
{
  // Room 3 (line ~383): secret_wall x=41 y=17 --> sanctuary1
  src = src.replace(
    `      { type: 'secret_wall', x: 41, y: 17, hitsToBreak: 2 },\n      { type: 'lore_fragment', x: 42, y: 17, text: 'Hidden alcove: "The fungal bloom remembers the forest above." ' },\n      { type: 'health_pickup', x: 43, y: 17 },`,
    `      { type: 'secret_wall', x: 41, y: 17, hitsToBreak: 2, targetRoom: 'sanctuary1', spawnX: 3, spawnY: 14 },\n      { type: 'lore_fragment', x: 42, y: 17, text: 'Hidden alcove: "The fungal bloom remembers the forest above." ' },\n      { type: 'health_pickup', x: 43, y: 17 },`,
  );

  // Room 11 (line ~1382): secret_wall x=20 y=24 --> no route change, just lore
  src = src.replace(
    `      { type: 'secret_wall', x: 20, y: 24, hitsToBreak: 2 },`,
    `      { type: 'secret_wall', x: 20, y: 24, hitsToBreak: 2 },\n      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 21, y: 24 },`,
  );

  // Room 22 (line ~2733): secret_wall x=44 y=17 --> sanctuary2
  src = src.replace(
    `      { type: 'secret_wall', x: 44, y: 17, hitsToBreak: 2 },`,
    `      { type: 'secret_wall', x: 44, y: 17, hitsToBreak: 2, targetRoom: 'sanctuary2', spawnX: 3, spawnY: 14 },`,
  );
}

// --- 3) Add weapon pickups + item pickups in existing rooms -------------
// Phantom Edge in room 4 (early mid), Warden's Greatsword in room 18 (mid-late),
// Throwing Daggers in room 12 (after ice act), scattered Ether Vials.
{
  // Helper to insert after the playerSpawn objects-opening `objects: [`
  function injectAfter(needle, injection, opts = {}) {
    const idx = src.indexOf(needle);
    if (idx < 0) { console.warn('[inject] no match for', needle.slice(0, 40)); return; }
    const insertAt = idx + needle.length;
    src = src.slice(0, insertAt) + injection + src.slice(insertAt);
  }

  // Room 4: Phantom Edge near midpoint
  injectAfter(
    "    name: 'Crystal Maw',\n",
    '',
  ); // no-op anchor to verify file
  // Find room4's objects `    objects: [` marker from room name
  const r4Idx = src.indexOf("name: 'Crystal Maw'");
  if (r4Idx >= 0) {
    const objIdx = src.indexOf('objects: [', r4Idx);
    if (objIdx >= 0) {
      const insertAt = objIdx + 'objects: ['.length;
      src = src.slice(0, insertAt)
        + `\n      { type: 'weapon_pickup', weaponId: 'phantom_edge', x: 10, y: 16 },`
        + `\n      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 22, y: 18 },`
        + src.slice(insertAt);
    }
  }

  const r12Idx = src.indexOf("name: 'Frostbite Corridor'");
  if (r12Idx >= 0) {
    const objIdx = src.indexOf('objects: [', r12Idx);
    if (objIdx >= 0) {
      const insertAt = objIdx + 'objects: ['.length;
      src = src.slice(0, insertAt)
        + `\n      { type: 'weapon_pickup', weaponId: 'throwing_daggers', x: 16, y: 14 },`
        + src.slice(insertAt);
    }
  }

  const r18Idx = src.indexOf("function buildRoom18");
  if (r18Idx >= 0) {
    const objIdx = src.indexOf('objects: [', r18Idx);
    if (objIdx >= 0) {
      const insertAt = objIdx + 'objects: ['.length;
      src = src.slice(0, insertAt)
        + `\n      { type: 'weapon_pickup', weaponId: 'warden_greatsword', x: 12, y: 16 },`
        + `\n      { type: 'item_pickup', itemId: 'soul_crystal', x: 42, y: 10 },`
        + src.slice(insertAt);
    }
  }

  const r25Idx = src.indexOf("function buildRoom25");
  if (r25Idx >= 0) {
    const objIdx = src.indexOf('objects: [', r25Idx);
    if (objIdx >= 0) {
      const insertAt = objIdx + 'objects: ['.length;
      src = src.slice(0, insertAt)
        + `\n      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 8, y: 18 },`
        + src.slice(insertAt);
    }
  }
}

// --- 4) Sanctuary rooms — append builders before `export const rooms` ----
const sanctuarySrc = `
function buildSanctuary1() {
  // A quiet alcove behind Room 3's secret wall: a small hub with merchant + shrine.
  const W = 26, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  // Inner platforms / altars
  fillRow(tiles, f - 2, 10, 15, 1);

  // Door back to room 3
  clearRect(tiles, f - 1, 0, f, 0);

  return {
    name: 'Veil Sanctum',
    width: W,
    height: H,
    camera: { deadzoneHeight: 36, lerpY: 0.08 },
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room3', x: 1, y: f, spawnX: 41, spawnY: 17 },
      { type: 'merchant_shop', npcType: 'traveler', x: 13, y: f,
        dialogue: [
          'So you wandered through the veil. Good — only those who look beyond the obvious ever find this place.',
          'I walk the old roads, trading with those still clinging to this hollow land.',
          'My wares are honest. My prices... negotiable only on your end.',
          'Take what you need, and breathe a while. The depths will wait.',
        ],
      },
      { type: 'checkpoint_shrine', x: 19, y: f },
      { type: 'lore_fragment', id: 'sanctum_1a', x: 6, y: f - 2,
        text: 'The traveler\\'s coat is patched with crests from a dozen forgotten houses. "I gather what no king ever will again," he muttered once.' },
      { type: 'lore_fragment', id: 'sanctum_1b', x: 22, y: f - 2,
        text: 'Carved along the altar: THE FIRST LIGHT IS KINDLED BY THE LAST BREATH. This is a place for beginnings.' },
      { type: 'fungal_bloom_large', x: 4, y: f },
      { type: 'glow_spore', x: 12, y: 6 },
      { type: 'glow_spore', x: 18, y: 4 },
      { type: 'glow_spore', x: 8, y: 8 },
      { type: 'chain', x: 11, y: 1 },
      { type: 'chain', x: 15, y: 1 },
      { type: 'ruin_arch', x: 9, y: f },
      { type: 'ruin_arch', x: 17, y: f - 1 },
    ],
    foreground: [],
    lighting: {
      beams: [
        { x: 13, y: 0, angle: 0, key: 'warm', alpha: 0.35, scale: 1.6 },
      ],
      ambientColor: 0x88aacc,
      ambientAlpha: 0.08,
    },
    ambience: 'tunnel_crystal',
  };
}

function buildSanctuary2() {
  // Late-game hub behind Room 22's secret wall: bigger merchant stock, a warden-scholar.
  const W = 28, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  fillRow(tiles, f - 2, 10, 17, 1);
  fillRow(tiles, f - 4, 13, 15, 1);

  clearRect(tiles, f - 1, 0, f, 0);

  return {
    name: 'Ember Sanctum',
    width: W,
    height: H,
    camera: { deadzoneHeight: 36, lerpY: 0.08 },
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room22', x: 1, y: f, spawnX: 44, spawnY: 17 },
      { type: 'merchant_shop', npcType: 'traveler', x: 14, y: f,
        dialogue: [
          'Back again, and deeper than most survive. You smell of ash and old stone.',
          'Be careful past the Frost Warden — the corridor beyond does things to a mind unready for them.',
          'I carry heavier steel here for those still willing to carry it. Strike well.',
          'And if you see him — the one who wears the Void like a crown — do not speak his true name.',
        ],
        items: [
          { name: 'Ether Vial', cost: 6, type: 'consumable', id: 'ether_vial' },
          { name: "Warden's Greatsword", cost: 32, type: 'weapon', id: 'warden_greatsword' },
          { name: 'Phantom Edge', cost: 18, type: 'weapon', id: 'phantom_edge' },
          { name: 'Throwing Daggers', cost: 14, type: 'daggers' },
          { name: 'Dagger Refill (+3)', cost: 4, type: 'daggers_refill' },
          { name: 'Soul Crystal (+1 Max HP)', cost: 22, type: 'maxhp' },
          { name: 'Health Refill', cost: 5, type: 'heal' },
        ],
      },
      { type: 'checkpoint_shrine', x: 22, y: f },
      { type: 'lore_fragment', id: 'sanctum_2a', x: 6, y: f - 2,
        text: 'A torn page: "The Void King was a scholar once. He loved nothing but the reading of stars — and then, the unreading of them."' },
      { type: 'lore_fragment', id: 'sanctum_2b', x: 14, y: f - 4,
        text: 'A warden\\'s journal, half-burned: "The ice and the void are not enemies. They are siblings — patient in different ways."' },
      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 24, y: f - 2 },
      { type: 'void_rift', x: 4, y: f },
      { type: 'void_rift', x: 24, y: 6 },
      { type: 'chain', x: 11, y: 1 },
      { type: 'chain', x: 17, y: 1 },
      { type: 'ruin_arch', x: 9, y: f },
      { type: 'ruin_arch', x: 19, y: f - 1 },
      { type: 'glow_spore', x: 20, y: 4 },
      { type: 'glow_spore', x: 7, y: 8 },
    ],
    foreground: [],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: 0, key: 'warm', alpha: 0.28, scale: 1.5 },
        { x: 22, y: 0, angle: 4, key: 'warm', alpha: 0.2, scale: 1.2 },
      ],
      ambientColor: 0xcc88aa,
      ambientAlpha: 0.08,
    },
    ambience: 'tunnel_guardian',
  };
}
`;
{
  const marker = 'export const rooms = {';
  const idx = src.indexOf(marker);
  assert(idx >= 0, 'no export const rooms marker');
  src = src.slice(0, idx) + sanctuarySrc + '\n' + src.slice(idx);

  // Register in rooms map after room_organic:
  src = src.replace(
    `  room_organic: buildOrganicCaveRoom({ width: 56, height: 26, seed: 1337 }),\n};`,
    `  room_organic: buildOrganicCaveRoom({ width: 56, height: 26, seed: 1337 }),\n  sanctuary1: buildSanctuary1(),\n  sanctuary2: buildSanctuary2(),\n};`,
  );
}

fs.writeFileSync(file, src);
console.log('rooms.js inventory/sanctuary edits applied.');
