export const TILE_SIZE = 32;

function makeRoom(w, h) {
  const tiles = [];
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      if (r === 0 || r >= h - 2 || c === 0 || c === w - 1) {
        row.push(1);
      } else {
        row.push(0);
      }
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
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      setTile(tiles, r, c, val);
    }
  }
}

function fillRow(tiles, row, c1, c2, val) {
  fillRect(tiles, row, c1, row, c2, val);
}

function clearRect(tiles, r1, c1, r2, c2) {
  fillRect(tiles, r1, c1, r2, c2, 0);
}

function buildRoom1() {
  const W = 56;
  const H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3; // floor tile row for spawns / doors

  // --- A) Entrance: ceiling overhang + challenge ledge ---
  fillRect(tiles, 1, 2, 3, 13, 1);
  fillRow(tiles, 14, 5, 11, 2);
  fillRow(tiles, 12, 4, 6, 2);   // elevated reward ledge (2 rows above row-14 = reachable)

  // --- B) Ravine: gap in bottom floor; cross on row-20 bridge (within ~72px jump reach) ---
  clearRect(tiles, H - 2, 24, H - 1, 32);
  fillRow(tiles, H - 1, 24, 32, 1);

  // Elevated runway: two segments + 1-tile gap reads as “broken causeway” (still trivial to cross)
  fillRow(tiles, 20, 22, 34, 2);
  fillRow(tiles, 20, 36, 52, 2);

  // --- C) Zigzag climb to orb (reads as a route, not one long shelf) ---
  fillRow(tiles, 18, 38, 48, 2);
  fillRow(tiles, 16, 36, 44, 2);
  fillRow(tiles, 14, 38, 48, 2);
  fillRow(tiles, 12, 40, 48, 2);
  fillRow(tiles, 10, 43, 47, 2);
  // Carved steps at climb start (full blocks — reads as stairs / ground)
  setTile(tiles, 21, 37, 3);
  setTile(tiles, 20, 38, 3);
  setTile(tiles, 19, 39, 3);

  // Hazard walls (tight passage + spike danger near climb)
  fillRect(tiles, 8, 18, 17, 19, 1);  // narrow wall — player runs under, spikes punish jumping
  fillRect(tiles, 7, 49, 10, 50, 1);  // thin pillar near climb top — spike wall on face

  // Floor terrain bumps (adds variety to the flat floor)
  fillRect(tiles, 20, 15, 21, 17, 1);
  fillRect(tiles, 20, 8, 21, 9, 1);

  // Door gap in east wall
  clearRect(tiles, 17, W - 1, 22, W - 1);

  return {
    name: 'The Broken Threshold',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'ability_orb', ability: 'slash', x: 45, y: 8, hint: 'Press C or J to slash' },
      { type: 'door', targetRoom: 'room2', x: W - 2, y: f, spawnX: 2, spawnY: 27 },
      { type: 'crawler', x: 12, y: f },
      { type: 'crawler', x: 40, y: 19 },
      { type: 'flyer', x: 44, y: 12 },
      { type: 'health_pickup', x: 8, y: 13 },
      { type: 'pendulum_trap', x: 28, y: 16, length: 80, swing: 44, speed: 1.4, phase: 0 },
      { type: 'spike_wall', x: 18, y: 18, width: 64, height: 16 },
      { type: 'spike_wall', x: 48, y: 8, width: 16, height: 96 },
      { type: 'crawler', x: 34, y: f },
      { type: 'crawler', x: 46, y: 17 },
      { type: 'flyer', x: 28, y: 6 },
      { type: 'crumble_platform', x: 36, y: 14, collapseDelay: 600, respawnDelay: 3000 },
      { type: 'crumble_platform', x: 48, y: 10, collapseDelay: 500, respawnDelay: 3000 },
      { type: 'magma_pool', x: 26, y: 22, width: 6 },
      { type: 'moving_platform', x: 28, y: 21, axis: 'x', range: 128, speed: 1.1, phase: 0, spin: 0 },
      { type: 'flyer', x: 18, y: 8 },
      { type: 'flyer', x: 36, y: 10 },
      { type: 'health_pickup', x: 5, y: 11 },
      { type: 'magma_pool', x: 28, y: 22, width: 5 },
      { type: 'flyer', x: 18, y: 10 },
      { type: 'moving_platform', x: 28, y: 18, axis: 'x', range: 64, speed: 1.0, phase: 1.5, spin: 0 },
      { type: 'wood_bridge', x: 27, y: f },
      { type: 'wood_bridge', x: 44, y: f - 1 },
      { type: 'pine_tree', x: 5, y: f },
      { type: 'pine_tree', x: 14, y: f },
      { type: 'pine_tree', x: 50, y: f - 2 },
      { type: 'pine_tree', x: 35, y: 14 },
      { type: 'snow_rock', x: 10, y: f },
      { type: 'snow_rock', x: 20, y: f },
      { type: 'snow_rock', x: 33, y: f - 1 },
      { type: 'snow_rock', x: 48, y: f - 2 },
      { type: 'mountain_banner', x: 9, y: 12 },
      { type: 'mountain_banner', x: 38, y: 10 },
      { type: 'birds_silhouette', x: 16, y: 3 },
      { type: 'birds_silhouette', x: 40, y: 2 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 34, y: 1 },
      { type: 'chain', x: 46, y: 1 },
      { type: 'tomb_light_beam', x: 12, y: 4 },
      { type: 'tomb_light_beam', x: 30, y: 4 },
      { type: 'tomb_light_beam', x: 46, y: 4 },
      { type: 'stalactite_sm', x: 12, y: 1 },
      { type: 'stalactite_sm', x: 28, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'vine', x: 18, y: 1 },
      { type: 'vine', x: 52, y: 1 },
      { type: 'ruin_arch', x: 8, y: f },
      { type: 'ruin_arch', x: 30, y: f - 1 },
      { type: 'glow_spore', x: 11, y: 10 },
      { type: 'glow_spore', x: 26, y: 8 },
      { type: 'glow_spore', x: 41, y: 6 },
      { type: 'mud_patch', x: 7, y: f },
      { type: 'mud_patch', x: 18, y: f },
      { type: 'mud_patch', x: 41, y: f - 1 },
      { type: 'gravel_patch', x: 13, y: f },
      { type: 'gravel_patch', x: 24, y: f - 1 },
      { type: 'gravel_patch', x: 50, y: f - 2 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: f + 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: f + 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 3, y: f + 1, flipX: false },
      { type: 'fg_torch_bracket', x: 1, y: 6 },
      { type: 'fg_torch_bracket', x: W - 2, y: 8 },
      { type: 'fg_rock_formation', x: W - 4, y: f + 1, flipX: true },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 10, h: 8 },
      { type: 'cb_detail_bricks', x: 38, y: 2, w: 14, h: 10 },
      { type: 'cb_rune_mark', x: 15, y: 8 },
      { type: 'cb_rune_mark', x: 44, y: 6 },
      { type: 'cb_detail_roots', x: 20, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 48, y: 1, count: 2 },
    ],
    lighting: {
      beams: [
        { x: 8, y: 0, angle: -12, key: 'warm', alpha: 0.18, scale: 1.4 },
        { x: 28, y: 0, angle: -8, key: 'warm', alpha: 0.12, scale: 1.1 },
        { x: 44, y: 0, angle: -15, key: 'warm', alpha: 0.14, scale: 1.2 },
      ],
      ambientColor: 0xffe8c0,
      ambientAlpha: 0.04,
    },
    ambience: 'mountain',
  };
}

function buildRoom2() {
  const W = 22, H = 30;
  const tiles = makeRoom(W, H);

  // Wall columns for wall-jumping (requires orb from mid-shaft)
  fillRect(tiles, 6, 8, 12, 9, 1);    // upper-left column
  fillRect(tiles, 6, 13, 12, 14, 1);  // upper-right column

  // Zigzag staircase (≤2-row vertical gaps, ≤4-tile horizontal — basic jump only)
  fillRow(tiles, 26, 3, 6, 2);      // step 1: from floor left
  fillRow(tiles, 24, 9, 12, 2);     // step 2: center (between lower columns)
  fillRow(tiles, 22, 16, 19, 2);    // step 3: right (past right column)
  fillRow(tiles, 20, 10, 13, 2);    // step 4: center
  fillRow(tiles, 18, 4, 6, 2);      // step 5: left (before left column)
  fillRow(tiles, 16, 10, 13, 2);    // step 6: center (between lower columns)
  fillRow(tiles, 14, 4, 7, 2);      // step 7: left
  fillRow(tiles, 12, 10, 12, 2);    // step 8: center (between upper columns)
  fillRow(tiles, 10, 10, 12, 2);    // step 9: center (straight up through gap)
  fillRow(tiles, 8, 10, 12, 2);     // step 10: center
  fillRow(tiles, 6, 10, 12, 2);     // step 11: center (orb is at row 5 above)
  fillRow(tiles, 4, 1, 6, 2);       // top-left landing (room3 door)
  fillRow(tiles, 4, 16, 20, 2);     // top-right landing (room4 door)

  // Bottom floor with gaps
  fillRect(tiles, H - 2, 1, H - 1, 7, 1);
  fillRect(tiles, H - 2, 9, H - 2, 13, 0);
  fillRect(tiles, H - 2, 14, H - 1, W - 2, 1);

  // Door openings
  clearRect(tiles, H - 4, 0, H - 2, 0);  // bottom-left back to room1
  clearRect(tiles, 3, 0, 5, 0);           // top-left to room3
  clearRect(tiles, 3, W - 1, 5, W - 1);   // top-right to room4

  return {
    name: 'Vertical Shaft',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: 27 },
    objects: [
      { type: 'ability_orb', ability: 'wallJump', x: 11, y: 14, hint: 'Wall slide then jump!' },
      { type: 'door', targetRoom: 'room1', x: 1, y: H - 3, spawnX: 52, spawnY: 21 },
      { type: 'door', targetRoom: 'room3', x: 1, y: 4, spawnX: 38, spawnY: 10 },
      { type: 'door', targetRoom: 'room4', x: W - 2, y: 4, spawnX: 2, spawnY: 19 },
      { type: 'bench', x: 11, y: 20 },
      { type: 'health_pickup', x: 17, y: 21 },
      { type: 'flyer', x: 11, y: 16 },
      { type: 'moving_platform', x: 11, y: 13, axis: 'x', range: 128, speed: 0.8, phase: 0, spin: 0 },
      { type: 'pendulum_trap', x: 11, y: 20, length: 64, swing: 36, speed: 1.5, phase: 0.5 },
      { type: 'crumble_platform', x: 11, y: 10, collapseDelay: 400, respawnDelay: 2500 },
      { type: 'spike_wall', x: 9, y: 27, width: 128, height: 16 },
      { type: 'magma_pool', x: 9, y: 28, width: 5 },
      { type: 'moving_platform', x: 11, y: 22, axis: 'y', range: 128, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 5, y: 18, axis: 'x', range: 64, speed: 0.7, phase: 0, spin: 0 },
      { type: 'flyer', x: 5, y: 22 },
      { type: 'flyer', x: 16, y: 12 },
      { type: 'crawler', x: 16, y: 27 },
      { type: 'crawler', x: 17, y: 27 },
      { type: 'crawler', x: 5, y: 13 },
      { type: 'crawler', x: 11, y: 23 },
      { type: 'flyer', x: 11, y: 9 },
      { type: 'flyer', x: 16, y: 18 },
      { type: 'magma_pool', x: 11, y: 28, width: 3 },
      { type: 'moving_platform', x: 11, y: 22, axis: 'y', range: 64, speed: 0.7, phase: 0.3, spin: 0 },
      { type: 'chain', x: 5, y: 1 },
      { type: 'chain', x: 17, y: 1 },
      { type: 'stalactite_sm', x: 3, y: 1 },
      { type: 'stalactite_sm', x: 11, y: 1 },
      { type: 'stalactite_sm', x: 19, y: 1 },
      { type: 'vine', x: 8, y: 4 },
      { type: 'vine', x: 14, y: 4 },
      { type: 'pine_tree', x: 4, y: 28 },
      { type: 'pine_tree', x: 18, y: 28 },
      { type: 'snow_rock', x: 11, y: 28 },
      { type: 'mountain_banner', x: 12, y: 8 },
      { type: 'birds_silhouette', x: 8, y: 6 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 16, flipX: false },
      { type: 'fg_torch_bracket', x: 1, y: 12 },
      { type: 'fg_torch_bracket', x: W - 2, y: 14 },
      { type: 'fg_torch_bracket', x: 1, y: 22 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 2, w: 8, h: 12 },
      { type: 'cb_detail_bricks', x: 12, y: 14, w: 8, h: 10 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 6, y: 18 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 16, y: 1, count: 2 },
    ],
    lighting: {
      beams: [
        { x: 10, y: 0, angle: 0, key: 'cool', alpha: 0.14, scale: 1.6 },
        { x: 6, y: 0, angle: -5, key: 'cool', alpha: 0.08, scale: 1.0 },
      ],
      ambientColor: 0xaaccee,
      ambientAlpha: 0.03,
    },
    ambience: 'mountain_shaft',
  };
}

function buildRoom3() {
  const W = 45, H = 22;
  const tiles = makeRoom(W, H);

  // Organic terrain bumps on floor
  fillRect(tiles, 18, 6, 19, 9, 1);
  fillRect(tiles, 17, 15, 19, 18, 1);
  fillRect(tiles, 18, 28, 19, 31, 1);
  fillRect(tiles, 17, 36, 19, 38, 1);

  // Platforms
  fillRow(tiles, 14, 4, 7, 2);
  fillRow(tiles, 11, 10, 14, 2);
  fillRow(tiles, 14, 18, 22, 2);
  fillRow(tiles, 10, 24, 28, 2);
  fillRow(tiles, 13, 30, 33, 2);
  fillRow(tiles, 10, 36, 40, 2);
  fillRow(tiles, 7, 20, 23, 2);
  fillRow(tiles, 7, 8, 11, 2);

  // Rock formations in floor
  fillRect(tiles, 19, 22, 19, 25, 1);

  // Hidden alcove top-left for the map chest
  fillRow(tiles, 4, 2, 5, 2);

  // Door opening on right
  clearRect(tiles, 9, W - 1, 12, W - 1);
  // Door opening on left
  clearRect(tiles, 17, 0, 20, 0);

  return {
    name: 'Fungal Passage',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 40, y: 10 },
    objects: [
      { type: 'door', targetRoom: 'room2', x: W - 2, y: 10, spawnX: 2, spawnY: 4 },
      { type: 'door', targetRoom: 'room6', x: 1, y: 19, spawnX: 3, spawnY: 19 },
      { type: 'ability_orb', ability: 'map', x: 3, y: 3, hint: 'Press M or tap the map icon' },
      { type: 'moving_platform', x: 30, y: 12, axis: 'x', range: 44, speed: 1.2, phase: 0.4, spin: 0.6 },
      { type: 'crumble_platform', x: 24, y: 10, collapseDelay: 520, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 28, y: 10, collapseDelay: 380, respawnDelay: 2600 },
      { type: 'pendulum_trap', x: 17, y: 9, length: 72, swing: 42, speed: 1.8, phase: 0.5 },
      { type: 'spike_wall', x: 2, y: 10, width: 16, height: 96, flipX: false },
      { type: 'health_pickup', x: 26, y: 10 },
      { type: 'health_pickup', x: 12, y: 11 },
      { type: 'flyer', x: 8, y: 6 },
      { type: 'flyer', x: 20, y: 5 },
      { type: 'flyer', x: 32, y: 4 },
      { type: 'flyer', x: 14, y: 8 },
      { type: 'flyer', x: 38, y: 6 },
      { type: 'crawler', x: 12, y: 19 },
      { type: 'crawler', x: 32, y: 19 },
      { type: 'moving_platform', x: 16, y: 8, axis: 'x', range: 96, speed: 1.0, phase: 1.0, spin: 0 },
      { type: 'pendulum_trap', x: 28, y: 6, length: 64, swing: 38, speed: 1.6, phase: 0 },
      { type: 'crawler', x: 20, y: 19 },
      { type: 'crawler', x: 40, y: 19 },
      { type: 'crumble_platform', x: 15, y: 14, collapseDelay: 450, respawnDelay: 2800 },
      { type: 'crumble_platform', x: 34, y: 13, collapseDelay: 380, respawnDelay: 2600 },
      { type: 'spike_wall', x: 6, y: 18, width: 128, height: 16 },
      { type: 'spike_wall', x: 28, y: 18, width: 128, height: 16 },
      { type: 'magma_pool', x: 22, y: 20, width: 4 },
      { type: 'magma_pool', x: 36, y: 20, width: 3 },
      { type: 'flyer', x: 26, y: 8 },
      { type: 'moving_platform', x: 22, y: 6, axis: 'y', range: 64, speed: 0.7, phase: 0, spin: 0 },
      { type: 'fungus', x: 3, y: 19 },
      { type: 'fungus', x: 8, y: 19 },
      { type: 'fungus', x: 14, y: 19 },
      { type: 'fungus', x: 22, y: 19 },
      { type: 'fungus', x: 30, y: 19 },
      { type: 'fungus', x: 37, y: 19 },
      { type: 'fungus', x: 42, y: 19 },
      { type: 'fungus_small', x: 5, y: 19 },
      { type: 'fungus_small', x: 12, y: 17 },
      { type: 'fungus_small', x: 19, y: 19 },
      { type: 'fungus_small', x: 26, y: 19 },
      { type: 'fungus_small', x: 34, y: 19 },
      { type: 'fungus_small', x: 40, y: 19 },
      { type: 'vine', x: 6, y: 1 },
      { type: 'vine', x: 16, y: 1 },
      { type: 'vine', x: 28, y: 1 },
      { type: 'vine', x: 39, y: 1 },
      { type: 'light_beam', x: 10, y: 1 },
      { type: 'light_beam', x: 25, y: 1 },
      { type: 'light_beam', x: 35, y: 1 },
      { type: 'ruin_arch', x: 10, y: 18 },
      { type: 'ruin_arch', x: 32, y: 17 },
      { type: 'hanging_moss', x: 8, y: 2 },
      { type: 'hanging_moss', x: 22, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
      { type: 'glow_spore', x: 14, y: 8 },
      { type: 'glow_spore', x: 24, y: 5 },
      { type: 'glow_spore', x: 34, y: 7 },
      { type: 'glow_spore', x: 20, y: 12 },
    ],
    foreground: [
      { type: 'fg_mushroom_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_mushroom_large', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 1, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 3, y: H - 1, flipX: true },
      { type: 'fg_mushroom_large', x: 5, y: H - 2, flipX: false },
      { type: 'fg_rock_formation', x: W - 1, y: H - 1, flipX: true },
    ],
    closeBgDetails: [
      { type: 'cb_detail_roots', x: 4, y: 1, count: 4 },
      { type: 'cb_detail_roots', x: 20, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 3 },
      { type: 'cb_detail_bricks', x: 6, y: 12, w: 10, h: 6 },
      { type: 'cb_detail_bricks', x: 28, y: 10, w: 12, h: 8 },
    ],
    lighting: {
      beams: [
        { x: 10, y: 0, angle: 5, key: 'cool', alpha: 0.10, scale: 1.0 },
        { x: 25, y: 0, angle: -5, key: 'cool', alpha: 0.08, scale: 0.9 },
        { x: 38, y: 0, angle: 3, key: 'cool', alpha: 0.10, scale: 1.1 },
      ],
      ambientColor: 0x22ffaa,
      ambientAlpha: 0.03,
    },
    ambience: 'fungal',
  };
}

function buildRoom4() {
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);

  // Crystal terrain — raised areas
  fillRect(tiles, 18, 7, 19, 10, 1);
  fillRect(tiles, 17, 35, 19, 38, 1);

  // Dash gap in the floor (cols 20-25 are open)
  clearRect(tiles, H - 2, 20, H - 1, 25);
  fillRow(tiles, H - 1, 20, 25, 1); // bottom row solid, but row above is pit

  // Ground stairs up from main floor (left) — 2-tile vertical steps (~64px) for max jump
  fillRow(tiles, 18, 4, 7, 2);
  fillRow(tiles, 16, 4, 7, 2);
  // Platforms
  fillRow(tiles, 14, 3, 7, 2);
  fillRow(tiles, 11, 9, 13, 2);
  fillRow(tiles, 14, 15, 18, 2);
  fillRow(tiles, 10, 22, 23, 2);  // stepping stone over gap
  fillRow(tiles, 14, 27, 31, 2);
  fillRow(tiles, 11, 33, 37, 2);
  fillRow(tiles, 14, 39, 43, 2);
  fillRow(tiles, 8, 44, 47, 2);
  fillRow(tiles, 7, 14, 17, 2);
  // Rising route to dash orb (≤2 tile vertical between steps)
  fillRow(tiles, 17, 4, 12, 2);
  fillRow(tiles, 15, 12, 22, 2);
  fillRow(tiles, 13, 20, 32, 2);
  fillRow(tiles, 11, 30, 40, 2);
  fillRow(tiles, 9, 38, 46, 2);
  fillRow(tiles, 7, 44, 47, 2);
  // Landing under orb / bench
  setTile(tiles, 7, 45, 3);
  setTile(tiles, 8, 45, 3);
  // Ascent on the right to high ledge (bench / dash orb) — 2-row steps to row 8
  fillRow(tiles, 18, 40, 46, 2);
  fillRow(tiles, 16, 41, 46, 2);
  fillRow(tiles, 14, 42, 46, 2);
  fillRow(tiles, 12, 43, 47, 2);
  fillRow(tiles, 10, 43, 47, 2);

  // Spike columns (wall-jump obstacles with danger)
  fillRect(tiles, 6, 11, 12, 11, 1);
  fillRect(tiles, 6, 32, 12, 32, 1);

  // Door openings
  clearRect(tiles, 17, 0, 19, 0);   // left to room2
  clearRect(tiles, 17, W - 1, 19, W - 1);  // right to room5

  return {
    name: 'Crystal Hall',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: 19 },
    objects: [
      { type: 'ability_orb', ability: 'dash', x: 45, y: 7, hint: 'Press X or Shift to dash' },
      { type: 'door', targetRoom: 'room2', x: 1, y: 19, spawnX: 19, spawnY: 4 },
      { type: 'door', targetRoom: 'room5', x: W - 2, y: 19, spawnX: 2, spawnY: 21 },
      { type: 'magma_pool', x: 23, y: 20, width: 8 },
      { type: 'moving_platform', x: 19, y: 17, axis: 'x', range: 36, speed: 1.5, phase: 0.2, spin: 1.5 },
      { type: 'moving_platform', x: 27, y: 13, axis: 'x', range: 34, speed: 1.35, phase: 2.1, spin: -1.3 },
      { type: 'pendulum_trap', x: 31, y: 9, length: 78, swing: 50, speed: 1.9, phase: 1.8 },
      { type: 'crumble_platform', x: 40, y: 11, collapseDelay: 380, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 14, y: 14, collapseDelay: 500, respawnDelay: 2800 },
      { type: 'health_pickup', x: 22, y: 9 },
      { type: 'spike_wall', x: 22, y: 20, width: 96, height: 16 },
      { type: 'spike_wall', x: 11, y: 8, width: 16, height: 96 },
      { type: 'spike_wall', x: 32, y: 8, width: 16, height: 96 },
      { type: 'pendulum_trap', x: 22, y: 6, length: 72, swing: 46, speed: 1.7, phase: 0.3 },
      { type: 'crumble_platform', x: 22, y: 10, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'moving_platform', x: 8, y: 12, axis: 'y', range: 96, speed: 0.9, phase: 0, spin: 0 },
      { type: 'bench', x: 45, y: 8 },
      { type: 'crawler', x: 5, y: 13 },
      { type: 'crawler', x: 30, y: 13 },
      { type: 'crawler', x: 42, y: 13 },
      { type: 'crawler', x: 18, y: 19 },
      { type: 'crawler', x: 38, y: 19 },
      { type: 'flyer', x: 18, y: 6 },
      { type: 'flyer', x: 35, y: 5 },
      { type: 'flyer', x: 10, y: 10 },
      { type: 'flyer', x: 25, y: 8 },
      { type: 'magma_pool', x: 10, y: 20, width: 3 },
      { type: 'moving_platform', x: 35, y: 8, axis: 'y', range: 80, speed: 0.8, phase: 1.0, spin: 0 },
      { type: 'crystal', x: 12, y: 19 },
      { type: 'crystal', x: 18, y: 19 },
      { type: 'crystal', x: 28, y: 19 },
      { type: 'crystal', x: 40, y: 19 },
      { type: 'crystal_cluster', x: 9, y: 19 },
      { type: 'crystal_cluster', x: 33, y: 19 },
      { type: 'crystal_cluster', x: 46, y: 19 },
      { type: 'stalactite', x: 15, y: 1 },
      { type: 'stalactite', x: 30, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite_sm', x: 8, y: 1 },
      { type: 'stalactite_sm', x: 22, y: 1 },
      { type: 'stalactite_sm', x: 37, y: 1 },
      { type: 'light_beam', x: 10, y: 1 },
      { type: 'light_beam', x: 25, y: 1 },
      { type: 'light_beam', x: 38, y: 1 },
      { type: 'pillar', x: 14, y: 16 },
      { type: 'pillar_broken', x: 34, y: 17 },
      { type: 'chain', x: 20, y: 1 },
      { type: 'chain', x: 44, y: 1 },
      { type: 'ruin_arch', x: 12, y: 17 },
      { type: 'ruin_arch', x: 38, y: 16 },
      { type: 'hanging_moss', x: 18, y: 2 },
      { type: 'hanging_moss', x: 30, y: 2 },
      { type: 'glow_spore', x: 22, y: 6 },
      { type: 'glow_spore', x: 35, y: 4 },
      { type: 'glow_spore', x: 8, y: 10 },
    ],
    foreground: [
      { type: 'fg_crystal_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_crystal_large', x: 2, y: H - 2, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 1, y: H - 1, flipX: false },
      { type: 'fg_torch_bracket', x: 1, y: 10 },
      { type: 'fg_torch_bracket', x: W - 2, y: 12 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 6, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 30, y: 4, w: 14, h: 10 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 24, y: 6 },
      { type: 'cb_rune_mark', x: 42, y: 10 },
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: -10, key: 'cool', alpha: 0.12, scale: 1.2 },
        { x: 28, y: 0, angle: 8, key: 'cool', alpha: 0.10, scale: 1.0 },
        { x: 40, y: 0, angle: -6, key: 'cool', alpha: 0.14, scale: 1.3 },
      ],
      ambientColor: 0xaa66ff,
      ambientAlpha: 0.04,
    },
    ambience: 'crystal',
  };
}

function buildRoom5() {
  const W = 40, H = 24;
  const tiles = makeRoom(W, H);

  // Arena multi-tier floor
  fillRect(tiles, 20, 8, 21, 14, 1);
  fillRect(tiles, 20, 25, 21, 32, 1);

  // Magma pit in center floor
  clearRect(tiles, 22, 17, 22, 22);

  // Stairs from entry floor toward arena (left) — 2-tile vertical steps
  fillRow(tiles, 18, 2, 6, 2);
  fillRow(tiles, 16, 2, 8, 2);
  fillRow(tiles, 14, 3, 8, 2);
  // Platforms for verticality (row 16 ledge overlaps entry stairs — one fillRow)
  fillRow(tiles, 12, 10, 14, 2);
  fillRow(tiles, 16, 16, 23, 2);
  fillRow(tiles, 12, 25, 29, 2);
  fillRow(tiles, 16, 31, 35, 2);
  fillRow(tiles, 8, 17, 22, 2);
  fillRow(tiles, 9, 6, 9, 2);
  fillRow(tiles, 9, 30, 33, 2);
  fillRow(tiles, 14, 5, 11, 2);
  fillRow(tiles, 10, 12, 22, 2);

  // Arena pillars (taller, with spike walls on faces)
  fillRect(tiles, 3, 10, 12, 10, 1);
  fillRect(tiles, 3, 29, 12, 29, 1);

  // Door opening left
  clearRect(tiles, 17, 0, 20, 0);
  // Door opening right to room8
  clearRect(tiles, 17, W - 1, 20, W - 1);

  return {
    name: 'Guardian Chamber',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 10, y: 21 },
    objects: [
      { type: 'door', targetRoom: 'room4', x: 1, y: 21, spawnX: 47, spawnY: 19 },
      { type: 'door', targetRoom: 'room8', x: W - 2, y: 21, spawnX: 46, spawnY: 23 },
      { type: 'magma_pool', x: 17, y: 22, width: 6 },
      { type: 'health_pickup', x: 20, y: 9 },
      { type: 'moving_platform', x: 20, y: 14, axis: 'x', range: 160, speed: 1.2, phase: 0, spin: 0 },
      { type: 'pendulum_trap', x: 12, y: 9, length: 88, swing: 44, speed: 1.5, phase: 0.2 },
      { type: 'pendulum_trap', x: 28, y: 9, length: 88, swing: 44, speed: 1.7, phase: 1.6 },
      { type: 'spike_wall', x: 10, y: 14, width: 16, height: 64, flipX: false },
      { type: 'spike_wall', x: 29, y: 14, width: 16, height: 64, flipX: true },
      { type: 'crumble_platform', x: 18, y: 8, collapseDelay: 340, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 21, y: 8, collapseDelay: 460, respawnDelay: 2400 },
      { type: 'spike_wall', x: 10, y: 6, width: 16, height: 96 },
      { type: 'spike_wall', x: 29, y: 6, width: 16, height: 96 },
      { type: 'magma_pool', x: 6, y: 22, width: 3 },
      { type: 'magma_pool', x: 30, y: 22, width: 3 },
      { type: 'moving_platform', x: 10, y: 6, axis: 'y', range: 128, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 29, y: 6, axis: 'y', range: 128, speed: 1.0, phase: 1.5, spin: 0 },
      { type: 'crumble_platform', x: 15, y: 12, collapseDelay: 320, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 25, y: 12, collapseDelay: 400, respawnDelay: 2200 },
      { type: 'crawler', x: 8, y: 21 },
      { type: 'crawler', x: 20, y: 21 },
      { type: 'crawler', x: 32, y: 21 },
      { type: 'crawler', x: 14, y: 11 },
      { type: 'crawler', x: 24, y: 15 },
      { type: 'crawler', x: 36, y: 15 },
      { type: 'flyer', x: 7, y: 5 },
      { type: 'flyer', x: 20, y: 4 },
      { type: 'flyer', x: 33, y: 5 },
      { type: 'flyer', x: 14, y: 8 },
      { type: 'flyer', x: 26, y: 7 },
      { type: 'flyer', x: 10, y: 3 },
      { type: 'flyer', x: 30, y: 3 },
      { type: 'flyer', x: 16, y: 6 },
      { type: 'moving_platform', x: 15, y: 6, axis: 'x', range: 128, speed: 1.3, phase: 1.0, spin: 0 },
      { type: 'spike_wall', x: 20, y: 22, width: 192, height: 16 },
      { type: 'pillar', x: 10, y: 18 },
      { type: 'pillar', x: 29, y: 18 },
      { type: 'crystal_cluster', x: 15, y: 21 },
      { type: 'crystal_cluster', x: 25, y: 21 },
      { type: 'chain', x: 6, y: 1 },
      { type: 'chain', x: 16, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'chain', x: 34, y: 1 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 20, y: 1 },
      { type: 'stalactite', x: 30, y: 1 },
      { type: 'ruin_arch', x: 12, y: 19 },
      { type: 'ruin_arch', x: 28, y: 19 },
      { type: 'glow_spore', x: 18, y: 6 },
      { type: 'glow_spore', x: 24, y: 4 },
      { type: 'glow_spore', x: 32, y: 6 },
      { type: 'hanging_moss', x: 20, y: 2 },
    ],
    foreground: [
      { type: 'fg_pillar_fragment', x: 0, y: H - 1, flipX: false },
      { type: 'fg_pillar_fragment', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 2, flipX: false },
      { type: 'fg_torch_bracket', x: 1, y: 8 },
      { type: 'fg_torch_bracket', x: W - 2, y: 8 },
      { type: 'fg_torch_bracket', x: 1, y: 16 },
      { type: 'fg_torch_bracket', x: W - 2, y: 16 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 14, h: 12 },
      { type: 'cb_detail_bricks', x: 24, y: 2, w: 14, h: 14 },
      { type: 'cb_rune_mark', x: 8, y: 6 },
      { type: 'cb_rune_mark', x: 20, y: 10 },
      { type: 'cb_rune_mark', x: 32, y: 6 },
      { type: 'cb_rune_mark', x: 14, y: 14 },
      { type: 'cb_rune_mark', x: 26, y: 14 },
    ],
    lighting: {
      beams: [
        { x: 20, y: 0, angle: 0, key: 'warm', alpha: 0.16, scale: 1.6 },
        { x: 10, y: 0, angle: -12, key: 'warm', alpha: 0.10, scale: 1.0 },
        { x: 30, y: 0, angle: 12, key: 'warm', alpha: 0.10, scale: 1.0 },
      ],
      ambientColor: 0xcc4488,
      ambientAlpha: 0.05,
    },
    locked: true,
    ambience: 'guardian',
  };
}

function buildRoom6() {
  const W = 60, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Lower floor segments with lava gaps
  fillRect(tiles, H - 2, 1, H - 1, 14, 1);
  clearRect(tiles, H - 2, 15, H - 2, 19);
  fillRect(tiles, H - 2, 20, H - 1, 30, 1);
  clearRect(tiles, H - 2, 31, H - 2, 35);
  fillRect(tiles, H - 2, 36, H - 1, 44, 1);
  clearRect(tiles, H - 2, 45, H - 2, 49);
  fillRect(tiles, H - 2, 50, H - 1, W - 2, 1);

  // Elevated platforms (aqueduct channels)
  fillRow(tiles, 14, 4, 10, 2);
  fillRow(tiles, 12, 8, 14, 2);
  fillRow(tiles, 10, 16, 22, 2);
  fillRow(tiles, 14, 24, 30, 2);
  fillRow(tiles, 11, 28, 34, 2);
  fillRow(tiles, 8, 36, 42, 2);
  fillRow(tiles, 14, 44, 50, 2);
  fillRow(tiles, 10, 48, 54, 2);
  fillRow(tiles, 7, 52, 56, 2);

  // Pillars / walls
  fillRect(tiles, 4, 20, 9, 21, 1);
  fillRect(tiles, 4, 40, 9, 41, 1);

  // Terrain bumps
  fillRect(tiles, 18, 5, 19, 7, 1);
  fillRect(tiles, 18, 25, 19, 27, 1);
  fillRect(tiles, 18, 51, 19, 53, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);        // left back to room3
  clearRect(tiles, 6, W - 1, 9, W - 1);         // right to room7

  return {
    name: 'Sunken Aqueduct',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room3', x: 1, y: f, spawnX: 42, spawnY: 19 },
      { type: 'door', targetRoom: 'room7', x: W - 2, y: 8, spawnX: 2, spawnY: 19 },
      { type: 'bench', x: 30, y: 13 },
      { type: 'health_pickup', x: 18, y: 9 },
      { type: 'health_pickup', x: 50, y: 9 },
      // Lava pits
      { type: 'magma_pool', x: 15, y: 20, width: 5 },
      { type: 'magma_pool', x: 31, y: 20, width: 5 },
      { type: 'magma_pool', x: 45, y: 20, width: 5 },
      // Moving platforms over lava
      { type: 'moving_platform', x: 17, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 33, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 1.5, spin: 0 },
      { type: 'moving_platform', x: 47, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0.8, spin: 0 },
      // Vertical platforms
      { type: 'moving_platform', x: 22, y: 6, axis: 'y', range: 96, speed: 0.8, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 42, y: 6, axis: 'y', range: 96, speed: 0.9, phase: 1.0, spin: 0 },
      // Traps
      { type: 'pendulum_trap', x: 12, y: 10, length: 80, swing: 44, speed: 1.5, phase: 0 },
      { type: 'pendulum_trap', x: 34, y: 8, length: 72, swing: 40, speed: 1.7, phase: 1.2 },
      { type: 'pendulum_trap', x: 52, y: 6, length: 64, swing: 38, speed: 1.8, phase: 0.5 },
      { type: 'spike_wall', x: 20, y: 10, width: 16, height: 80 },
      { type: 'spike_wall', x: 40, y: 10, width: 16, height: 80 },
      { type: 'spike_wall', x: 8, y: 18, width: 96, height: 16 },
      { type: 'spike_wall', x: 44, y: 18, width: 96, height: 16 },
      // Crumble platforms
      { type: 'crumble_platform', x: 14, y: 12, collapseDelay: 450, respawnDelay: 2800 },
      { type: 'crumble_platform', x: 26, y: 11, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 38, y: 8, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 54, y: 10, collapseDelay: 420, respawnDelay: 2600 },
      // Enemies
      { type: 'crawler', x: 8, y: f },
      { type: 'crawler', x: 22, y: f },
      { type: 'crawler', x: 38, y: f },
      { type: 'crawler', x: 52, y: f },
      { type: 'flyer', x: 14, y: 8 },
      { type: 'flyer', x: 26, y: 6 },
      { type: 'flyer', x: 38, y: 5 },
      { type: 'flyer', x: 50, y: 7 },
      { type: 'flyer', x: 18, y: 12 },
      { type: 'flyer', x: 46, y: 10 },
      // Decorations
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 25, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite', x: 55, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 48, y: 1 },
      { type: 'chain', x: 14, y: 1 },
      { type: 'chain', x: 30, y: 1 },
      { type: 'chain', x: 46, y: 1 },
      { type: 'vine', x: 8, y: 1 },
      { type: 'vine', x: 22, y: 1 },
      { type: 'vine', x: 38, y: 1 },
      { type: 'vine', x: 52, y: 1 },
      { type: 'ruin_arch', x: 10, y: f },
      { type: 'ruin_arch', x: 28, y: f },
      { type: 'ruin_arch', x: 44, y: f },
      { type: 'glow_spore', x: 16, y: 8 },
      { type: 'glow_spore', x: 32, y: 6 },
      { type: 'glow_spore', x: 48, y: 4 },
      { type: 'mud_patch', x: 6, y: f },
      { type: 'mud_patch', x: 24, y: f },
      { type: 'mud_patch', x: 40, y: f },
      { type: 'gravel_patch', x: 12, y: f },
      { type: 'gravel_patch', x: 36, y: f },
      { type: 'gravel_patch', x: 54, y: f },
      { type: 'pine_tree', x: 4, y: f },
      { type: 'pine_tree', x: 26, y: f },
      { type: 'pine_tree', x: 50, y: f },
      { type: 'snow_rock', x: 10, y: f },
      { type: 'snow_rock', x: 34, y: f },
      { type: 'snow_rock', x: 56, y: f },
      { type: 'tomb_light_beam', x: 15, y: 4 },
      { type: 'tomb_light_beam', x: 35, y: 4 },
      { type: 'tomb_light_beam', x: 50, y: 4 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 3, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true },
      { type: 'fg_torch_bracket', x: 1, y: 8 },
      { type: 'fg_torch_bracket', x: W - 2, y: 8 },
      { type: 'fg_torch_bracket', x: 20, y: 6 },
      { type: 'fg_torch_bracket', x: 40, y: 6 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 30, y: 2, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 48, y: 4, w: 10, h: 8 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 46, y: 8 },
      { type: 'cb_detail_roots', x: 6, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 34, y: 1, count: 3 },
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: -8, key: 'warm', alpha: 0.14, scale: 1.2 },
        { x: 30, y: 0, angle: 5, key: 'warm', alpha: 0.12, scale: 1.0 },
        { x: 48, y: 0, angle: -10, key: 'warm', alpha: 0.16, scale: 1.3 },
      ],
      ambientColor: 0xffaa60,
      ambientAlpha: 0.04,
    },
    ambience: 'cavern',
  };
}

function buildRoom7() {
  const W = 30, H = 28;
  const tiles = makeRoom(W, H);

  // Multi-level bone corridor (narrow, vertical challenge)
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Tiered platforms (ascending gauntlet)
  fillRow(tiles, 24, 3, 8, 2);
  fillRow(tiles, 22, 12, 18, 2);
  fillRow(tiles, 20, 22, 27, 2);
  fillRow(tiles, 18, 4, 10, 2);
  fillRow(tiles, 16, 14, 20, 2);
  fillRow(tiles, 14, 22, 27, 2);
  fillRow(tiles, 12, 3, 9, 2);
  fillRow(tiles, 10, 14, 19, 2);
  fillRow(tiles, 8, 22, 27, 2);
  fillRow(tiles, 6, 4, 10, 2);
  fillRow(tiles, 4, 14, 20, 2);

  // Narrow pillars (obstacle weaving)
  fillRect(tiles, 10, 10, 18, 11, 1);
  fillRect(tiles, 6, 20, 14, 21, 1);

  // Terrain bumps
  fillRect(tiles, 25, 18, 26, 20, 1);
  fillRect(tiles, 25, 6, 26, 8, 1);

  // Door openings
  clearRect(tiles, 17, 0, 20, 0);         // left back to room6
  clearRect(tiles, 3, W - 1, 6, W - 1);   // right to room8

  return {
    name: 'Bone Corridor',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: 19 },
    objects: [
      { type: 'door', targetRoom: 'room6', x: 1, y: 19, spawnX: 56, spawnY: 8 },
      { type: 'door', targetRoom: 'room8', x: W - 2, y: 5, spawnX: 2, spawnY: 19 },
      { type: 'bench', x: 16, y: 9 },
      { type: 'health_pickup', x: 6, y: 5 },
      { type: 'health_pickup', x: 24, y: 7 },
      // Lava at bottom
      { type: 'magma_pool', x: 10, y: 26, width: 10 },
      { type: 'spike_wall', x: 10, y: 25, width: 320, height: 16 },
      // Hazards on platforms
      { type: 'spike_wall', x: 10, y: 18, width: 16, height: 64 },
      { type: 'spike_wall', x: 20, y: 10, width: 16, height: 64 },
      { type: 'pendulum_trap', x: 8, y: 14, length: 72, swing: 42, speed: 1.6, phase: 0 },
      { type: 'pendulum_trap', x: 18, y: 8, length: 64, swing: 38, speed: 1.8, phase: 1.0 },
      { type: 'pendulum_trap', x: 25, y: 4, length: 56, swing: 36, speed: 2.0, phase: 0.5 },
      // Moving platforms
      { type: 'moving_platform', x: 10, y: 22, axis: 'x', range: 80, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 20, y: 16, axis: 'x', range: 64, speed: 1.3, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 12, y: 10, axis: 'x', range: 64, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 20, y: 6, axis: 'x', range: 48, speed: 1.4, phase: 1.5, spin: 0 },
      // Crumble
      { type: 'crumble_platform', x: 16, y: 16, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 8, y: 12, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 18, y: 10, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 24, y: 8, collapseDelay: 300, respawnDelay: 2200 },
      // Enemies
      { type: 'crawler', x: 6, y: 23 },
      { type: 'crawler', x: 14, y: 21 },
      { type: 'crawler', x: 24, y: 19 },
      { type: 'crawler', x: 6, y: 17 },
      { type: 'crawler', x: 16, y: 15 },
      { type: 'crawler', x: 24, y: 13 },
      { type: 'flyer', x: 10, y: 16 },
      { type: 'flyer', x: 20, y: 12 },
      { type: 'flyer', x: 8, y: 8 },
      { type: 'flyer', x: 22, y: 4 },
      { type: 'flyer', x: 14, y: 6 },
      { type: 'flyer', x: 26, y: 10 },
      // Decorations
      { type: 'stalactite', x: 8, y: 1 },
      { type: 'stalactite', x: 18, y: 1 },
      { type: 'stalactite', x: 26, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 14, y: 1 },
      { type: 'stalactite_sm', x: 22, y: 1 },
      { type: 'chain', x: 6, y: 1 },
      { type: 'chain', x: 16, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'vine', x: 10, y: 1 },
      { type: 'vine', x: 20, y: 1 },
      { type: 'ruin_arch', x: 6, y: 25 },
      { type: 'ruin_arch', x: 22, y: 25 },
      { type: 'glow_spore', x: 8, y: 10 },
      { type: 'glow_spore', x: 18, y: 6 },
      { type: 'glow_spore', x: 26, y: 3 },
      { type: 'mountain_banner', x: 12, y: 12 },
      { type: 'mountain_banner', x: 22, y: 8 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 16, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: 14, flipX: true },
      { type: 'fg_pillar_fragment', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_torch_bracket', x: 1, y: 10 },
      { type: 'fg_torch_bracket', x: W - 2, y: 10 },
      { type: 'fg_torch_bracket', x: 1, y: 20 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 10, h: 10 },
      { type: 'cb_detail_bricks', x: 16, y: 2, w: 10, h: 12 },
      { type: 'cb_rune_mark', x: 8, y: 8 },
      { type: 'cb_rune_mark', x: 20, y: 6 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 18, y: 1, count: 2 },
    ],
    lighting: {
      beams: [
        { x: 8, y: 0, angle: -5, key: 'cool', alpha: 0.12, scale: 1.0 },
        { x: 18, y: 0, angle: 5, key: 'cool', alpha: 0.14, scale: 1.2 },
        { x: 26, y: 0, angle: -8, key: 'cool', alpha: 0.10, scale: 0.9 },
      ],
      ambientColor: 0xaaccee,
      ambientAlpha: 0.03,
    },
    ambience: 'mountain_shaft',
  };
}

function buildRoom8() {
  const W = 50, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor with lava pit center
  fillRect(tiles, H - 2, 1, H - 1, 15, 1);
  clearRect(tiles, H - 2, 16, H - 2, 33);
  fillRect(tiles, H - 2, 34, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 16, 33, 1);

  // Multi-tier platforms
  fillRow(tiles, 20, 3, 8, 2);
  fillRow(tiles, 18, 10, 16, 2);
  fillRow(tiles, 20, 33, 38, 2);
  fillRow(tiles, 18, 40, 46, 2);
  fillRow(tiles, 14, 6, 12, 2);
  fillRow(tiles, 14, 37, 43, 2);
  fillRow(tiles, 16, 18, 24, 2);
  fillRow(tiles, 16, 26, 32, 2);
  fillRow(tiles, 12, 20, 29, 2);
  fillRow(tiles, 10, 14, 18, 2);
  fillRow(tiles, 10, 32, 36, 2);
  fillRow(tiles, 8, 22, 28, 2);
  fillRow(tiles, 6, 10, 14, 2);
  fillRow(tiles, 6, 36, 40, 2);

  // Arena pillars
  fillRect(tiles, 3, 8, 13, 8, 1);
  fillRect(tiles, 3, 41, 13, 41, 1);
  fillRect(tiles, 3, 18, 7, 18, 1);
  fillRect(tiles, 3, 31, 7, 31, 1);

  // Door opening left
  clearRect(tiles, f - 2, 0, f + 1, 0);
  // Door opening right (back to room5)
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Top center opening to boss room
  clearRect(tiles, 0, 23, 0, 26);
  fillRow(tiles, 4, 22, 27, 2);

  return {
    name: 'The Crucible',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room7', x: 1, y: f, spawnX: 26, spawnY: 5 },
      { type: 'door', targetRoom: 'room5', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'door', targetRoom: 'room9', x: W / 2, y: 2, spawnX: 3, spawnY: 17 },
      // Central lava
      { type: 'magma_pool', x: 16, y: 24, width: 18 },
      { type: 'spike_wall', x: 16, y: 23, width: 576, height: 16 },
      // Moving platforms over lava
      { type: 'moving_platform', x: 20, y: 20, axis: 'x', range: 128, speed: 1.3, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: 20, axis: 'x', range: 128, speed: 1.3, phase: 1.5, spin: 0 },
      // Side pillars with spikes
      { type: 'spike_wall', x: 8, y: 8, width: 16, height: 80 },
      { type: 'spike_wall', x: 41, y: 8, width: 16, height: 80 },
      { type: 'spike_wall', x: 18, y: 4, width: 16, height: 48 },
      { type: 'spike_wall', x: 31, y: 4, width: 16, height: 48 },
      // Pendulums
      { type: 'pendulum_trap', x: 14, y: 8, length: 88, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 25, y: 5, length: 72, swing: 44, speed: 2.0, phase: 1.0 },
      { type: 'pendulum_trap', x: 36, y: 8, length: 88, swing: 48, speed: 1.8, phase: 2.0 },
      // Vertical movers
      { type: 'moving_platform', x: 8, y: 8, axis: 'y', range: 128, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 41, y: 8, axis: 'y', range: 128, speed: 1.1, phase: 1.5, spin: 0 },
      { type: 'moving_platform', x: 25, y: 4, axis: 'y', range: 64, speed: 0.9, phase: 0, spin: 0 },
      // Crumble
      { type: 'crumble_platform', x: 12, y: 14, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 22, y: 12, collapseDelay: 300, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 28, y: 12, collapseDelay: 300, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 38, y: 14, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 15, y: 10, collapseDelay: 280, respawnDelay: 1800 },
      { type: 'crumble_platform', x: 35, y: 10, collapseDelay: 280, respawnDelay: 1800 },
      // Enemies (heavy combat room)
      { type: 'crawler', x: 6, y: f },
      { type: 'crawler', x: 12, y: f },
      { type: 'crawler', x: 36, y: f },
      { type: 'crawler', x: 44, y: f },
      { type: 'crawler', x: 20, y: 15 },
      { type: 'crawler', x: 30, y: 15 },
      { type: 'crawler', x: 10, y: 13 },
      { type: 'crawler', x: 40, y: 13 },
      { type: 'flyer', x: 10, y: 5 },
      { type: 'flyer', x: 20, y: 3 },
      { type: 'flyer', x: 30, y: 3 },
      { type: 'flyer', x: 40, y: 5 },
      { type: 'flyer', x: 15, y: 8 },
      { type: 'flyer', x: 25, y: 6 },
      { type: 'flyer', x: 35, y: 8 },
      { type: 'flyer', x: 12, y: 12 },
      { type: 'flyer', x: 38, y: 12 },
      { type: 'flyer', x: 25, y: 10 },
      // Health
      { type: 'health_pickup', x: 25, y: 7 },
      { type: 'health_pickup', x: 8, y: 13 },
      { type: 'health_pickup', x: 42, y: 13 },
      // Decorations
      { type: 'stalactite', x: 12, y: 1 },
      { type: 'stalactite', x: 25, y: 1 },
      { type: 'stalactite', x: 38, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 32, y: 1 },
      { type: 'stalactite_sm', x: 44, y: 1 },
      { type: 'chain', x: 10, y: 1 },
      { type: 'chain', x: 20, y: 1 },
      { type: 'chain', x: 30, y: 1 },
      { type: 'chain', x: 40, y: 1 },
      { type: 'pillar', x: 8, y: f },
      { type: 'pillar', x: 41, y: f },
      { type: 'ruin_arch', x: 14, y: f },
      { type: 'ruin_arch', x: 36, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 25, y: 3 },
      { type: 'glow_spore', x: 34, y: 6 },
      { type: 'glow_spore', x: 10, y: 10 },
      { type: 'glow_spore', x: 40, y: 10 },
      { type: 'hanging_moss', x: 14, y: 2 },
      { type: 'hanging_moss', x: 25, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
    ],
    foreground: [
      { type: 'fg_pillar_fragment', x: 0, y: H - 1, flipX: false },
      { type: 'fg_pillar_fragment', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 2, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 2, flipX: true },
      { type: 'fg_torch_bracket', x: 1, y: 6 },
      { type: 'fg_torch_bracket', x: W - 2, y: 6 },
      { type: 'fg_torch_bracket', x: 1, y: 14 },
      { type: 'fg_torch_bracket', x: W - 2, y: 14 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 16, h: 14 },
      { type: 'cb_detail_bricks', x: 30, y: 2, w: 16, h: 14 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 20, y: 10 },
      { type: 'cb_rune_mark', x: 30, y: 6 },
      { type: 'cb_rune_mark', x: 40, y: 10 },
      { type: 'cb_rune_mark', x: 14, y: 16 },
      { type: 'cb_rune_mark', x: 36, y: 16 },
    ],
    lighting: {
      beams: [
        { x: 25, y: 0, angle: 0, key: 'warm', alpha: 0.18, scale: 1.8 },
        { x: 12, y: 0, angle: -12, key: 'warm', alpha: 0.12, scale: 1.2 },
        { x: 38, y: 0, angle: 12, key: 'warm', alpha: 0.12, scale: 1.2 },
      ],
      ambientColor: 0xff4444,
      ambientAlpha: 0.05,
    },
    locked: true,
    ambience: 'guardian',
  };
}

function buildRoom9() {
  const W = 44, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor — wide open for the boss fight
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Raised side platforms (escape routes / vantage)
  fillRow(tiles, 14, 2, 6, 2);
  fillRow(tiles, 14, W - 7, W - 3, 2);
  fillRow(tiles, 10, 4, 8, 2);
  fillRow(tiles, 10, W - 9, W - 5, 2);

  // Central elevated platform
  fillRow(tiles, 12, 18, 25, 2);
  fillRow(tiles, 8, 20, 23, 2);

  // Pillars framing the arena (boss aesthetic)
  fillRect(tiles, 4, 10, 14, 10, 1);
  fillRect(tiles, 4, W - 11, 14, W - 11, 1);

  // Small terrain bumps on the floor
  fillRect(tiles, f, 14, f + 1, 15, 1);
  fillRect(tiles, f, W - 16, f + 1, W - 15, 1);

  // Door opening on left (entry from room8)
  clearRect(tiles, f - 2, 0, f + 1, 0);

  return {
    name: 'Throne of the Bone Tyrant',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room8', x: 1, y: f, spawnX: 46, spawnY: 23 },
      { type: 'boss', x: 28, y: f },
      { type: 'bench', x: 5, y: f },
      { type: 'health_pickup', x: 6, y: 9 },
      { type: 'health_pickup', x: W - 7, y: 9 },
      { type: 'health_pickup', x: 22, y: 7 },
      // Lava pits on the sides for danger
      { type: 'magma_pool', x: 12, y: f + 1, width: 3 },
      { type: 'magma_pool', x: W - 14, y: f + 1, width: 3 },
      // Decorations
      { type: 'pillar', x: 10, y: f },
      { type: 'pillar', x: W - 11, y: f },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 16, y: 1 },
      { type: 'chain', x: W - 17, y: 1 },
      { type: 'chain', x: W - 9, y: 1 },
      { type: 'stalactite', x: 12, y: 1 },
      { type: 'stalactite', x: 22, y: 1 },
      { type: 'stalactite', x: W - 13, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: W - 7, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 22, y: 4 },
      { type: 'glow_spore', x: W - 15, y: 6 },
      { type: 'ruin_arch', x: 12, y: f },
      { type: 'ruin_arch', x: W - 13, y: f },
    ],
    foreground: [
      { type: 'fg_pillar_fragment', x: 0, y: H - 1, flipX: false },
      { type: 'fg_pillar_fragment', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_torch_bracket', x: 1, y: 6 },
      { type: 'fg_torch_bracket', x: W - 2, y: 6 },
      { type: 'fg_torch_bracket', x: 1, y: 12 },
      { type: 'fg_torch_bracket', x: W - 2, y: 12 },
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 2, w: 16, h: 12 },
      { type: 'cb_detail_bricks', x: W - 18, y: 2, w: 16, h: 12 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 22, y: 4 },
      { type: 'cb_rune_mark', x: W - 11, y: 6 },
      { type: 'cb_rune_mark', x: 16, y: 12 },
      { type: 'cb_rune_mark', x: W - 17, y: 12 },
    ],
    lighting: {
      beams: [
        { x: 22, y: 0, angle: 0, key: 'warm', alpha: 0.20, scale: 2.0 },
        { x: 10, y: 0, angle: -15, key: 'warm', alpha: 0.14, scale: 1.4 },
        { x: W - 11, y: 0, angle: 15, key: 'warm', alpha: 0.14, scale: 1.4 },
      ],
      ambientColor: 0xff2244,
      ambientAlpha: 0.06,
    },
    locked: true,
    ambience: 'guardian',
  };
}

export const rooms = {
  room1: buildRoom1(),
  room2: buildRoom2(),
  room3: buildRoom3(),
  room4: buildRoom4(),
  room5: buildRoom5(),
  room6: buildRoom6(),
  room7: buildRoom7(),
  room8: buildRoom8(),
  room9: buildRoom9(),
};
