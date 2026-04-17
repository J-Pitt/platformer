/**
 * Chapter 2: The Surface Above — room definitions.
 *
 * Four biomes + a cathedral finale: Mountain (30-36), Forest (37-43) +
 * sanctuary3, Plains (44-49), Castle (50-56) + sanctuary4, Cathedral (57),
 * final boss (58). All room IDs are stable and must never be renumbered.
 */

// Tile helpers — same primitives as rooms.js. Kept local so rooms_ch2 has
// no circular import with the main rooms.js file.
function makeRoom(w, h) {
  const tiles = [];
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      if (r === 0 || r >= h - 2 || c === 0 || c === w - 1) row.push(1);
      else row.push(0);
    }
    tiles.push(row);
  }
  return tiles;
}
function setTile(tiles, row, col, val) {
  if (row >= 0 && row < tiles.length && col >= 0 && col < tiles[0].length) {
    tiles[row][col] = val;
  }
}
function fillRect(tiles, r1, c1, r2, c2, val) {
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) setTile(tiles, r, c, val);
}
function fillRow(tiles, row, c1, c2, val) { fillRect(tiles, row, c1, row, c2, val); }
function clearRect(tiles, r1, c1, r2, c2) { fillRect(tiles, r1, c1, r2, c2, 0); }

// ================ MOUNTAIN BIOME (30-36) ==================================

function buildRoom30() {
  // Entrance from the Void King throne — a cavern mouth that opens into
  // open mountain air. The west door returns to room29.
  const W = 40, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Stepped ledges going up and out
  fillRow(tiles, f - 3, 6, 12, 2);
  fillRow(tiles, f - 5, 14, 20, 2);
  fillRow(tiles, f - 3, 22, 28, 2);
  fillRow(tiles, f - 6, 30, 36, 2);
  return {
    name: 'Mouth of the Mountain',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room29', x: 1, y: f, spawnX: W - 3, spawnY: H - 3 },
      { type: 'door', targetRoom: 'room31', x: W - 2, y: f - 6, spawnX: 2, spawnY: 14 },
      { type: 'npc', npcType: 'hermit', x: 7, y: f,
        dialogue: [
          'You made it. Blessed be... I did not think any would.',
          'This is the first free air I have breathed in a lifetime.',
          'The road up is old and the passes are treacherous. Mind your step.',
        ] },
      { type: 'checkpoint_shrine', x: 5, y: f },
      { type: 'pine_tree', x: 12, y: f },
      { type: 'pine_tree', x: 24, y: f },
      { type: 'snow_rock', x: 30, y: f },
      { type: 'mountain_flag', x: 37, y: f - 6 },
      { type: 'fog_bank', x: 20, y: 4 },
      { type: 'lore_fragment', id: 'ch2_intro', x: 14, y: f - 4,
        text: 'Scratched on a wind-bitten stone: "The kings below are done. The long roads call again."' },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom31() {
  const W = 44, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 4, W - 1, 8, W - 1);
  // rising zigzag over a chasm
  clearRect(tiles, H - 2, 10, H - 1, 20); // chasm
  fillRow(tiles, f - 2, 6, 9, 2);
  fillRow(tiles, f - 4, 12, 18, 2);
  fillRow(tiles, f - 6, 20, 26, 2);
  fillRow(tiles, f - 8, 28, 34, 2);
  fillRow(tiles, f - 10, 34, 42, 2);
  return {
    name: 'Cragstep Ascent',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room30', x: 1, y: f, spawnX: W - 3, spawnY: H - 8 },
      { type: 'door', targetRoom: 'room32', x: W - 2, y: 6, spawnX: 2, spawnY: 16 },
      { type: 'ibex_ram', x: 16, y: f - 5 },
      { type: 'rock_hurler', x: 30, y: f - 11 },
      { type: 'falling_rocks', x: 22, y: f, interval: 2400, dropHeight: 10 },
      { type: 'pine_tree', x: 8, y: f },
      { type: 'pine_tree', x: 38, y: f - 11 },
      { type: 'snow_rock', x: 24, y: f - 7 },
      { type: 'crystal', x: 36, y: f - 11 },
    ],
    ambience: 'mountain_pass',
  };
}

function buildRoom32() {
  // Short climbing room with the Glide ability orb.
  const W = 30, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 6, 10, 2);
  fillRow(tiles, f - 6, 12, 18, 2);
  fillRow(tiles, f - 9, 20, 24, 2);
  // Platform altar for the orb
  fillRect(tiles, f - 9, 12, f - 7, 18, 1);
  return {
    name: 'Hermitage of the Wind',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room31', x: 1, y: f, spawnX: W - 3, spawnY: 6 },
      { type: 'door', targetRoom: 'room33', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'ability_orb', ability: 'glide', x: 15, y: f - 10,
        hint: 'Hold JUMP while falling to glide on the wind.' },
      { type: 'checkpoint_shrine', x: 6, y: f },
      { type: 'mountain_banner', x: 10, y: 2 },
      { type: 'mountain_banner', x: 20, y: 2 },
      { type: 'pine_tree', x: 22, y: f },
      { type: 'glow_spore', x: 14, y: f - 12 },
      { type: 'lore_fragment', id: 'glide_note', x: 15, y: f,
        text: 'The hermit left a wind-tattered letter: "The Warden fell long ago. Carry on. The peaks still need crossing."' },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom33() {
  // The Chasm — Glide required to cross east.
  const W = 52, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Big chasm with only a glide-reachable far ledge
  clearRect(tiles, H - 2, 12, H - 1, 40);
  // High departure ledge
  fillRow(tiles, 8, 4, 14, 2);
  fillRow(tiles, 6, 40, 50, 2);
  return {
    name: 'The Chasm of Sighs',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room32', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room34', x: W - 2, y: 4, spawnX: 2, spawnY: 16,
        requiresAbilities: ['glide'] },
      { type: 'fog_bank', x: 26, y: H - 2 },
      { type: 'fog_bank', x: 20, y: 14 },
      { type: 'hawk_diver', x: 26, y: 8 },
      { type: 'mountain_banner', x: 8, y: 6 },
      { type: 'snow_rock', x: 6, y: f },
      { type: 'lore_fragment', id: 'chasm_sigh', x: 7, y: f,
        text: 'The wind sounds almost like singing. Or grief. Easy to mistake the two.' },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom34() {
  const W = 42, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 4, 0, 8, 0); // incoming high door from chasm
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 2, 4, 12, 2);
  fillRow(tiles, f - 4, 14, 22, 2);
  fillRow(tiles, f - 2, 24, 34, 2);
  fillRow(tiles, f - 6, 28, 40, 2);
  // Ice slick section
  fillRect(tiles, H - 2, 16, H - 2, 22, 1);
  return {
    name: 'Windbite Plateau',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 6 },
    objects: [
      { type: 'door', targetRoom: 'room33', x: 1, y: 6, spawnX: W - 4, spawnY: 14 },
      { type: 'door', targetRoom: 'room35', x: W - 2, y: f - 7, spawnX: 2, spawnY: 14 },
      { type: 'ibex_ram', x: 10, y: f - 3 },
      { type: 'ibex_ram', x: 30, y: f - 7 },
      { type: 'snow_drift_slip', x: 20, y: f },
      { type: 'falling_rocks', x: 32, y: f, interval: 2800, dropHeight: 8 },
      { type: 'pine_tree', x: 6, y: f },
      { type: 'pine_tree', x: 38, y: f },
      { type: 'mountain_banner', x: 32, y: f - 7 },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom35() {
  const W = 38, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 2, W - 1, 6, W - 1);
  // Tall vertical corridor with ledges, gliding encouraged
  for (let y = 3; y < f; y += 3) {
    const off = (y / 3) % 2 === 0 ? 4 : W - 10;
    fillRow(tiles, y, off, off + 8, 2);
  }
  return {
    name: 'Gale Spires',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room34', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room36', x: W - 2, y: 4, spawnX: 2, spawnY: 18 },
      { type: 'rock_hurler', x: 8, y: f },
      { type: 'hawk_diver', x: 22, y: 10 },
      { type: 'hawk_diver', x: 16, y: 6 },
      { type: 'falling_rocks', x: 18, y: f, interval: 2400, dropHeight: 14 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      { type: 'mountain_flag', x: 6, y: f - 13 },
      { type: 'lore_fragment', id: 'gale_note', x: 3, y: f,
        text: 'Pilgrim shrine: "Leave the ground. Trust the air. The Warden respects only those who do."' },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom36() {
  // Peak Warden boss arena.
  const W = 40, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Wide platform for boss
  fillRow(tiles, f - 5, 8, 12, 2);
  fillRow(tiles, f - 5, 28, 32, 2);
  return {
    name: 'Throne of the Warden',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room35', x: 1, y: f, spawnX: W - 3, spawnY: 18 },
      { type: 'door', targetRoom: 'room37', x: W - 2, y: f, spawnX: 2, spawnY: 18,
        requiresBoss: 'boss_room36' },
      { type: 'boss', bossType: 'peak_warden', x: 22, y: f, hiddenIfBoss: 'boss_room36' },
      { type: 'mountain_banner', x: 10, y: 2 },
      { type: 'mountain_banner', x: 30, y: 2 },
      { type: 'snow_rock', x: 16, y: f },
      { type: 'snow_rock', x: 26, y: f },
    ],
    ambience: 'mountain_peak',
  };
}

// ================ FOREST BIOME (37-43) + sanctuary3 =======================

function buildRoom37() {
  const W = 40, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 8, 14, 2);
  fillRow(tiles, f - 5, 18, 24, 2);
  fillRow(tiles, f - 3, 28, 34, 2);
  return {
    name: 'Greenroad',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room36', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room38', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      { type: 'thorn_spider', x: 11, y: f - 4 },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'oak_tree', x: 26, y: f },
      { type: 'thorn_bush', x: 16, y: f },
      { type: 'wild_flower', x: 20, y: f },
      { type: 'wild_flower', x: 30, y: f },
      { type: 'grass_blade', x: 12, y: f },
    ],
    ambience: 'forest',
  };
}

function buildRoom38() {
  const W = 42, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 2, 4, 8, 2);
  fillRow(tiles, f - 4, 12, 16, 2);
  fillRow(tiles, f - 6, 20, 26, 2);
  fillRow(tiles, f - 4, 30, 36, 2);
  // Secret wall entrance to sanctuary3
  return {
    name: 'Thornwood Paths',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room37', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room39', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'secret_wall', targetRoom: 'sanctuary3', x: 5, y: f - 1, spawnX: 3, spawnY: 14 },
      { type: 'bark_archer', x: 24, y: f - 7 },
      { type: 'thorn_spider', x: 14, y: f - 5 },
      { type: 'thorn_snare', x: 20, y: f },
      { type: 'bee_swarm_zone', x: 32, y: f - 5 },
      { type: 'oak_tree', x: 8, y: f },
      { type: 'thorn_bush', x: 10, y: f },
      { type: 'wild_flower', x: 26, y: f },
    ],
    ambience: 'forest',
  };
}

function buildRoom39() {
  const W = 36, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Canopy climb
  fillRow(tiles, 14, 6, 12, 2);
  fillRow(tiles, 10, 14, 22, 2);
  fillRow(tiles, 6, 20, 32, 2);
  return {
    name: 'Old Canopy',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room38', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room40', x: W - 2, y: f, spawnX: 2, spawnY: 18 },
      { type: 'thorn_spider', x: 8, y: 13 },
      { type: 'thorn_spider', x: 18, y: 9 },
      { type: 'bark_archer', x: 28, y: 5 },
      { type: 'thorn_snare', x: 14, y: f },
      { type: 'bee_swarm_zone', x: 22, y: 8 },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'ivy_drape', x: 18, y: 4 },
      { type: 'ivy_drape', x: 30, y: 4 },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom40() {
  // Grapple ability orb
  const W = 32, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 4, 10, 22, 2);
  fillRect(tiles, f - 5, 14, f - 4, 18, 1);
  return {
    name: 'Grove of the Lost Song',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room39', x: 1, y: f, spawnX: W - 3, spawnY: 18 },
      { type: 'door', targetRoom: 'room41', x: W - 2, y: f, spawnX: 2, spawnY: 18 },
      { type: 'ability_orb', ability: 'grapple', x: 16, y: f - 5,
        hint: 'Press G near a glowing anchor to grapple to it.' },
      { type: 'checkpoint_shrine', x: 5, y: f },
      { type: 'oak_tree', x: 8, y: f },
      { type: 'oak_tree', x: 26, y: f },
      { type: 'ivy_drape', x: 14, y: 2 },
      { type: 'glow_spore', x: 12, y: 4 },
      { type: 'glow_spore', x: 22, y: 4 },
      { type: 'lore_fragment', id: 'grapple_note', x: 5, y: f,
        text: 'An old ranger rune: "Reach is not strength. Reach is choice."' },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom41() {
  // Vertical shaft with grapple anchors
  const W = 24, H = 28;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 7, W - 1);
  // Staggered ledges
  fillRow(tiles, 20, 4, 10, 2);
  fillRow(tiles, 14, 14, 22, 2);
  fillRow(tiles, 9, 4, 12, 2);
  return {
    name: 'Cliff of Old Oaks',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room40', x: 1, y: f, spawnX: W - 3, spawnY: 18 },
      { type: 'door', targetRoom: 'room42', x: W - 2, y: 5, spawnX: 2, spawnY: 18,
        requiresAbilities: ['grapple'] },
      { type: 'grapple_anchor', x: 14, y: 17 },
      { type: 'grapple_anchor', x: 18, y: 6 },
      { type: 'bark_archer', x: 18, y: 13 },
      { type: 'thorn_spider', x: 8, y: 8 },
      { type: 'lightwraith', x: 14, y: 20 },
      { type: 'oak_tree', x: 6, y: f },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom42() {
  const W = 40, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 3, 0, 7, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, 8, 4, 14, 2);
  fillRow(tiles, f - 4, 16, 24, 2);
  fillRow(tiles, f - 2, 26, 34, 2);
  return {
    name: 'Whispering Hollows',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 5 },
    objects: [
      { type: 'door', targetRoom: 'room41', x: 1, y: 5, spawnX: W - 3, spawnY: 6 },
      { type: 'door', targetRoom: 'room43', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'grapple_anchor', x: 20, y: 6 },
      { type: 'bark_archer', x: 8, y: 7 },
      { type: 'thorn_spider', x: 22, y: f - 5 },
      { type: 'thorn_snare', x: 28, y: f },
      { type: 'bee_swarm_zone', x: 32, y: f - 3 },
      { type: 'lightwraith', x: 18, y: 12 },
      { type: 'oak_tree', x: 4, y: f },
      { type: 'oak_tree', x: 36, y: f },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom43() {
  // Thornroot Hydra arena
  const W = 38, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  return {
    name: 'Heart of the Thornroot',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room42', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room44', x: W - 2, y: f, spawnX: 2, spawnY: 16,
        requiresBoss: 'boss_room43' },
      { type: 'boss', bossType: 'thornroot_hydra', x: 20, y: f, hiddenIfBoss: 'boss_room43' },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'oak_tree', x: 32, y: f },
      { type: 'ivy_drape', x: 12, y: 2 },
      { type: 'ivy_drape', x: 24, y: 2 },
    ],
    ambience: 'forest_deep',
  };
}

function buildSanctuary3() {
  const W = 24, H = 16;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 1, 0, f, 0);
  fillRow(tiles, f - 2, 8, 14, 1);
  return {
    name: 'Glade Sanctum',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room38', x: 1, y: f, spawnX: 6, spawnY: 16 },
      { type: 'merchant_shop', npcType: 'traveler', x: 12, y: f,
        dialogue: [
          'Out under the sky again — I never thought the old roads would open.',
          'I carry a few useful things. Take what you need, traveler.',
        ] },
      { type: 'checkpoint_shrine', x: 18, y: f },
      { type: 'lore_fragment', id: 'glade_note', x: 11, y: f - 3,
        text: 'Ivy covers the altar. Beneath it: "Rest here. Breathe. The wind remembers your name."' },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'wild_flower', x: 8, y: f },
      { type: 'wild_flower', x: 16, y: f },
      { type: 'glow_spore', x: 13, y: 4 },
    ],
    ambience: 'forest',
  };
}

// ================ PLAINS BIOME (44-49) ====================================

function buildRoom44() {
  const W = 52, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  return {
    name: 'The Open Plains',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room43', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room45', x: W - 2, y: f, spawnX: 2, spawnY: 14 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      { type: 'raider_horseman', x: 24, y: f },
      { type: 'hawk_diver', x: 32, y: 6 },
      { type: 'fence_post', x: 10, y: f },
      { type: 'fence_post', x: 12, y: f },
      { type: 'fence_post', x: 14, y: f },
      { type: 'wheat_tuft', x: 18, y: f },
      { type: 'wheat_tuft', x: 22, y: f },
      { type: 'wild_flower', x: 36, y: f },
      { type: 'wild_flower', x: 42, y: f },
      { type: 'lore_fragment', id: 'plains_note', x: 6, y: f,
        text: 'A scarecrow stands in fields long harvested. The wind turns its face to you.' },
    ],
    ambience: 'plains',
  };
}

function buildRoom45() {
  const W = 46, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 10, 16, 2);
  fillRow(tiles, f - 4, 22, 30, 2);
  fillRow(tiles, f - 3, 34, 40, 2);
  return {
    name: 'Windmill Rise',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room44', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room46', x: W - 2, y: f, spawnX: 2, spawnY: 14 },
      { type: 'raider_horseman', x: 18, y: f },
      { type: 'hawk_diver', x: 28, y: 5 },
      { type: 'wind_gust_zone', x: 26, y: f - 6, w: 3, h: 4, dir: 'up', strength: 300 },
      { type: 'fence_post', x: 8, y: f },
      { type: 'fence_post', x: 10, y: f },
      { type: 'oak_tree', x: 42, y: f },
      { type: 'wheat_tuft', x: 14, y: f },
      { type: 'wheat_tuft', x: 24, y: f },
    ],
    ambience: 'plains',
  };
}

function buildRoom46() {
  const W = 42, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 6, 6, 10, 2);
  fillRow(tiles, f - 10, 12, 18, 2);
  fillRow(tiles, f - 6, 22, 28, 2);
  fillRow(tiles, f - 10, 30, 36, 2);
  return {
    name: 'Stormgate',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room45', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room47', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'lightning_strike', x: 16 * 32, y: 0, interval: 3600, phase: 0 },
      { type: 'lightning_strike', x: 28 * 32, y: 0, interval: 3600, phase: 1800 },
      { type: 'wind_gust_zone', x: 14, y: f - 12, w: 3, h: 6, dir: 'up', strength: 280 },
      { type: 'hawk_diver', x: 20, y: 8 },
      { type: 'storm_cloud', x: 24, y: 2 },
      { type: 'rain_streak', x: 14, y: 4 },
      { type: 'rain_streak', x: 30, y: 4 },
    ],
    ambience: 'plains_storm',
  };
}

function buildRoom47() {
  const W = 46, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 8, 14, 2);
  fillRow(tiles, f - 5, 20, 28, 2);
  fillRow(tiles, f - 3, 32, 40, 2);
  return {
    name: 'Riverwind Flats',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room46', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room48', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'raider_horseman', x: 18, y: f },
      { type: 'raider_horseman', x: 32, y: f },
      { type: 'hawk_diver', x: 24, y: 6 },
      { type: 'lightwraith', x: 36, y: f - 5 },
      { type: 'wheat_tuft', x: 10, y: f },
      { type: 'wheat_tuft', x: 22, y: f },
    ],
    ambience: 'plains',
  };
}

function buildRoom48() {
  const W = 40, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 6, 6, 14, 2);
  fillRow(tiles, f - 10, 20, 28, 2);
  fillRow(tiles, f - 6, 30, 36, 2);
  return {
    name: 'Weathervane',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room47', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room49', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      { type: 'lightning_strike', x: 16 * 32, y: 0, interval: 4000, phase: 0 },
      { type: 'wind_gust_zone', x: 24, y: f - 12, w: 3, h: 7, dir: 'up', strength: 280 },
      { type: 'hawk_diver', x: 30, y: 8 },
      { type: 'raider_horseman', x: 14, y: f },
      { type: 'storm_cloud', x: 20, y: 3 },
    ],
    ambience: 'plains_storm',
  };
}

function buildRoom49() {
  const W = 44, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  return {
    name: 'The Marauder\'s Field',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room48', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room50', x: W - 2, y: f, spawnX: 2, spawnY: 16,
        requiresBoss: 'boss_room49' },
      { type: 'boss', bossType: 'windblade_marauder', x: 24, y: f, hiddenIfBoss: 'boss_room49' },
      { type: 'fence_post', x: 8, y: f }, { type: 'fence_post', x: 10, y: f },
      { type: 'fence_post', x: 34, y: f }, { type: 'fence_post', x: 36, y: f },
      { type: 'wheat_tuft', x: 16, y: f }, { type: 'wheat_tuft', x: 28, y: f },
    ],
    ambience: 'plains',
  };
}

// ================ CASTLE BIOME (50-56) + sanctuary4 =======================

function buildRoom50() {
  const W = 40, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 8, 14, 2);
  fillRow(tiles, f - 5, 18, 24, 2);
  fillRow(tiles, f - 3, 28, 34, 2);
  return {
    name: 'Castle Gate',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room49', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room51', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      { type: 'banner_pikeman', x: 16, y: f - 6 },
      { type: 'crossbowman', x: 30, y: f - 4 },
      { type: 'banner_red', x: 10, y: 2 },
      { type: 'banner_red', x: 30, y: 2 },
      { type: 'castle_window', x: 20, y: 4 },
      { type: 'lore_fragment', id: 'castle_intro', x: 5, y: f,
        text: 'The gate is open. No guard stopped you. Something inside is colder than arrows.' },
    ],
    ambience: 'castle_courtyard',
  };
}

function buildRoom51() {
  const W = 44, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 2, 6, 10, 2);
  fillRow(tiles, f - 4, 14, 22, 2);
  fillRow(tiles, f - 6, 26, 34, 2);
  fillRow(tiles, f - 4, 36, 42, 2);
  return {
    name: 'Outer Ward',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room50', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room52', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'secret_wall', targetRoom: 'sanctuary4', x: 7, y: f - 1, spawnX: 3, spawnY: 14 },
      { type: 'banner_pikeman', x: 18, y: f - 5 },
      { type: 'crossbowman', x: 32, y: f - 7 },
      { type: 'arrow_slit_volley', x: 5 * 32, y: 6 * 32, dir: 'right', interval: 2400 },
      { type: 'arrow_slit_volley', x: 40 * 32, y: 5 * 32, dir: 'left', interval: 2800 },
      { type: 'swinging_chandelier', x: 22 * 32, y: 2 * 32, length: 96, swing: 50, speed: 1.1 },
      { type: 'banner_gold', x: 12, y: 2 },
      { type: 'banner_gold', x: 32, y: 2 },
      { type: 'castle_window', x: 22, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom52() {
  const W = 30, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 7, W - 1);
  // Vertical rampart climb — grapple required
  fillRow(tiles, 20, 4, 12, 2);
  fillRow(tiles, 14, 14, 22, 2);
  fillRow(tiles, 9, 4, 14, 2);
  return {
    name: 'Rampart Climb',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room51', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room53', x: W - 2, y: 5, spawnX: 2, spawnY: 18,
        requiresAbilities: ['grapple'] },
      { type: 'grapple_anchor', x: 18, y: 17 },
      { type: 'grapple_anchor', x: 22, y: 7 },
      { type: 'crossbowman', x: 8, y: 19 },
      { type: 'crossbowman', x: 20, y: 8 },
      { type: 'banner_red', x: 6, y: 2 },
      { type: 'castle_window', x: 14, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom53() {
  const W = 42, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 3, 0, 7, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, 8, 4, 12, 2);
  fillRow(tiles, f - 4, 16, 22, 2);
  fillRow(tiles, f - 3, 28, 36, 2);
  return {
    name: 'Highwalk',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 5 },
    objects: [
      { type: 'door', targetRoom: 'room52', x: 1, y: 5, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room54', x: W - 2, y: f, spawnX: 2, spawnY: 14 },
      { type: 'banner_pikeman', x: 18, y: f - 5 },
      { type: 'crossbowman', x: 30, y: f - 4 },
      { type: 'swinging_chandelier', x: 12 * 32, y: 2 * 32, length: 72, swing: 56, speed: 1.3 },
      { type: 'portcullis_drop', x: 20 * 32, y: 10 * 32, dropDist: 4 },
      { type: 'arrow_slit_volley', x: 3 * 32, y: 4 * 32, dir: 'right', interval: 2200 },
      { type: 'castle_window', x: 18, y: 4 },
      { type: 'banner_gold', x: 26, y: 2 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom54() {
  const W = 38, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 4, W - 1, 8, W - 1);
  fillRow(tiles, 18, 6, 14, 2);
  fillRow(tiles, 14, 14, 22, 2);
  fillRow(tiles, 10, 20, 30, 2);
  fillRow(tiles, 7, 28, 36, 2);
  return {
    name: 'Keep Spires',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room53', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room55', x: W - 2, y: 6, spawnX: 2, spawnY: 18,
        requiresAbilities: ['grapple'] },
      { type: 'grapple_anchor', x: 16, y: 11 },
      { type: 'grapple_anchor', x: 26, y: 6 },
      { type: 'lightwraith', x: 18, y: 12 },
      { type: 'crossbowman', x: 28, y: 6 },
      { type: 'banner_red', x: 6, y: 2 },
      { type: 'castle_window', x: 20, y: 4 },
      { type: 'ivy_drape', x: 30, y: 2 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom55() {
  const W = 42, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 4, 0, 8, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, 8, 4, 14, 2);
  fillRow(tiles, f - 3, 18, 26, 2);
  fillRow(tiles, f - 2, 30, 38, 2);
  return {
    name: 'Throne Approach',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 6 },
    objects: [
      { type: 'door', targetRoom: 'room54', x: 1, y: 6, spawnX: W - 3, spawnY: 5 },
      { type: 'door', targetRoom: 'room56', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 6, y: f },
      { type: 'banner_pikeman', x: 22, y: f - 4 },
      { type: 'banner_pikeman', x: 32, y: f - 3 },
      { type: 'swinging_chandelier', x: 18 * 32, y: 2 * 32, length: 120, swing: 44, speed: 1.0 },
      { type: 'swinging_chandelier', x: 30 * 32, y: 2 * 32, length: 120, swing: 44, speed: 1.2, phase: 1.5 },
      { type: 'banner_gold', x: 10, y: 2 },
      { type: 'banner_gold', x: 22, y: 2 },
      { type: 'banner_gold', x: 34, y: 2 },
      { type: 'castle_window', x: 14, y: 4 },
      { type: 'castle_window', x: 30, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom56() {
  const W = 40, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  return {
    name: 'Throne of the Fallen',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room55', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room57', x: W - 2, y: f, spawnX: 2, spawnY: 16,
        requiresBoss: 'boss_room56' },
      { type: 'boss', bossType: 'fallen_paladin', x: 24, y: f, hiddenIfBoss: 'boss_room56' },
      { type: 'banner_gold', x: 12, y: 2 },
      { type: 'banner_gold', x: 28, y: 2 },
      { type: 'castle_window', x: 20, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

function buildSanctuary4() {
  const W = 26, H = 16;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 1, 0, f, 0);
  fillRow(tiles, f - 2, 9, 16, 1);
  return {
    name: 'Parapet Sanctum',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room51', x: 1, y: f, spawnX: 9, spawnY: 16 },
      { type: 'merchant_shop', npcType: 'traveler', x: 13, y: f,
        dialogue: [
          'The last sanctum the old roads still know. Past here is the sun-work of a mad god.',
          'Trade well. You will need what I have left.',
        ] },
      { type: 'checkpoint_shrine', x: 19, y: f },
      { type: 'lore_fragment', id: 'parapet_note', x: 12, y: f - 3,
        text: 'On a brass plaque: "IF YOU READ THIS AND ARE STILL BREATHING, YOU HAVE COME FURTHER THAN ANY OF US."' },
      { type: 'banner_gold', x: 6, y: 2 },
      { type: 'banner_gold', x: 20, y: 2 },
      { type: 'castle_window', x: 13, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

// ================ FINALE (57-58) ==========================================

function buildRoom57() {
  const W = 40, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 4, 10, 14, 2);
  fillRow(tiles, f - 4, 26, 30, 2);
  fillRow(tiles, f - 8, 16, 24, 2);
  return {
    name: 'Cathedral of the Sun',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room56', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room58', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 20, y: f },
      { type: 'banner_gold', x: 8, y: 2 },
      { type: 'banner_gold', x: 32, y: 2 },
      { type: 'castle_window', x: 14, y: 4 },
      { type: 'castle_window', x: 26, y: 4 },
      { type: 'ivy_drape', x: 20, y: 2 },
      { type: 'lore_fragment', id: 'cathedral_note', x: 6, y: f,
        text: 'The sun is painted in cracked gold leaf above. Somewhere beyond this wall, the painting opens its eye.' },
      { type: 'npc', npcType: 'hermit', x: 15, y: f,
        dialogue: [
          'So. You found the cathedral. The last place. I will not walk beyond this door with you.',
          'The Sun in there was once a god, they say. Or a god\'s idea of a sun.',
          'Hold tight what you have left. Everything you kept alive comes with you past this threshold.',
        ] },
    ],
    ambience: 'cathedral',
  };
}

function buildRoom58() {
  // Final boss arena — big open dome.
  const W = 48, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  // Elevated side platforms
  fillRow(tiles, f - 5, 4, 10, 2);
  fillRow(tiles, f - 5, W - 11, W - 5, 2);
  fillRow(tiles, f - 10, 14, 20, 2);
  fillRow(tiles, f - 10, W - 21, W - 15, 2);
  return {
    name: 'The Scoured Sun',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room57', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'boss', bossType: 'scoured_sun', x: W / 2, y: 6, hiddenIfBoss: 'boss_room58' },
      { type: 'banner_gold', x: 6, y: 2 },
      { type: 'banner_gold', x: W - 7, y: 2 },
      { type: 'castle_window', x: 18, y: 4 },
      { type: 'castle_window', x: 30, y: 4 },
      { type: 'ivy_drape', x: 24, y: 2 },
    ],
    ambience: 'cathedral',
  };
}

export const ch2Rooms = {
  room30: buildRoom30(),
  room31: buildRoom31(),
  room32: buildRoom32(),
  room33: buildRoom33(),
  room34: buildRoom34(),
  room35: buildRoom35(),
  room36: buildRoom36(),
  room37: buildRoom37(),
  room38: buildRoom38(),
  room39: buildRoom39(),
  room40: buildRoom40(),
  room41: buildRoom41(),
  room42: buildRoom42(),
  room43: buildRoom43(),
  room44: buildRoom44(),
  room45: buildRoom45(),
  room46: buildRoom46(),
  room47: buildRoom47(),
  room48: buildRoom48(),
  room49: buildRoom49(),
  room50: buildRoom50(),
  room51: buildRoom51(),
  room52: buildRoom52(),
  room53: buildRoom53(),
  room54: buildRoom54(),
  room55: buildRoom55(),
  room56: buildRoom56(),
  room57: buildRoom57(),
  room58: buildRoom58(),
  sanctuary3: buildSanctuary3(),
  sanctuary4: buildSanctuary4(),
};
