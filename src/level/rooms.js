import { buildOrganicCaveRoom } from './organicCaveGen.js';

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

  // Floor terrain bumps (keep clear of cols 15+ so the route to the ravine / east door stays walkable)
  fillRect(tiles, 20, 9, 21, 13, 1);
  fillRect(tiles, 20, 8, 21, 9, 1);

  // Carved hall under the ruin — low ceiling strips (tunnel leading deeper)
  fillRect(tiles, 2, 16, 5, 34, 1);
  fillRect(tiles, 2, 38, 4, 52, 1);

  // Door gap in east wall
  clearRect(tiles, 17, W - 1, 22, W - 1);

  return {
    name: 'The Broken Threshold',
    width: W,
    height: H,
    /** Optional per-room follow feel (see CameraRig). */
    camera: { deadzoneHeight: 52, lerpY: 0.09 },
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'ability_orb', ability: 'slash', x: 45, y: 8, hint: 'Press W, C or J to slash' },
      { type: 'door', targetRoom: 'room2', x: W - 2, y: f, spawnX: 2, spawnY: 28 },
      { type: 'npc', npcType: 'hermit', x: 7, y: f, dialogue: [
        'Ah... another soul drawn to the Abyssal Depths. I wondered when the next would come.',
        'This place was once a great kingdom — the Throne of Ur-Karath, they called it. Built deep into the bones of the earth.',
        'But the king went mad. He sought power beyond death itself, and the land answered with ruin.',
        'The creatures you see here? They were his people once. Now they are... something else.',
        'Take that blade ahead. You will need it. And be wary — the deeper you go, the closer you get to what remains of him.'
      ]},
      { type: 'flyer', x: 43, y: 11 },
      { type: 'pendulum_trap', x: 28, y: 16, length: 80, swing: 44, speed: 1.4, phase: 0 },
      { type: 'crawler', x: 46, y: 17 },
      { type: 'flyer', x: 28, y: 6 },
      { type: 'crumble_platform', x: 36, y: 14, collapseDelay: 600, respawnDelay: 3000 },
      { type: 'crumble_platform', x: 48, y: 10, collapseDelay: 500, respawnDelay: 3000 },
      { type: 'moving_platform', x: 28, y: 21, axis: 'x', range: 128, speed: 1.1, phase: 0, spin: 0 },
      { type: 'flyer', x: 17, y: 7 },
      { type: 'flyer', x: 36, y: 10 },
      { type: 'flyer', x: 17, y: 9 },
      { type: 'moving_platform', x: 28, y: 18, axis: 'x', range: 64, speed: 1.0, phase: 1.5, spin: 0 },
      { type: 'wood_bridge', x: 27, y: f },
      { type: 'wood_bridge', x: 44, y: f - 1 },
      { type: 'chain', x: 6, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 34, y: 1 },
      { type: 'chain', x: 46, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
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
      { type: 'floor_spikes', x: 16, y: 21, onTime: 1200, offTime: 2500, phase: 0 },
      { type: 'fireball_shooter', x: 1, y: 10, dir: 'right', interval: 3000 },
      { type: 'flame_jet', x: 30, y: 21, dir: 'up', onTime: 1000, offTime: 2200, phase: 500 },
      { type: 'checkpoint_shrine', x: 6, y: 21 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: f + 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: f + 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 3, y: f + 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 4, y: f + 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 10, h: 8 },
      { type: 'cb_detail_bricks', x: 38, y: 2, w: 14, h: 10 },
      { type: 'cb_rune_mark', x: 15, y: 8 },
      { type: 'cb_rune_mark', x: 44, y: 6 },
      { type: 'cb_detail_roots', x: 20, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 48, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 6, y: 0, angle: -8, key: 'warm', alpha: 0.22, scale: 1.5 },
        { x: 24, y: 0, angle: 0, key: 'warm', alpha: 0.18, scale: 1.35 },
        { x: 42, y: 0, angle: 10, key: 'warm', alpha: 0.2, scale: 1.45 },
        { x: 50, y: 0, angle: -6, key: 'warm', alpha: 0.16, scale: 1.2 }
      ],
      ambientColor: 0xc4a882,
      ambientAlpha: 0.05,
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

  // Mine-shaft roof — mostly closed stone with a narrow light well
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 9, 3, 12);
  clearRect(tiles, 3, 1, 3, 6);   // headroom above top-left landing
  clearRect(tiles, 3, 16, 3, 20); // headroom above top-right landing

  // Bottom floor with gaps
  fillRect(tiles, H - 2, 1, H - 1, 7, 1);
  fillRect(tiles, H - 2, 9, H - 2, 13, 0);
  fillRect(tiles, H - 2, 14, H - 1, W - 2, 1);

  // Door openings
  clearRect(tiles, H - 4, 0, H - 2, 0);  // bottom-left back to room1
  clearRect(tiles, 3, 0, 5, 0);           // top-left to room3
  clearRect(tiles, 3, W - 1, 5, W - 1);   // top-right to room4
  // Lips where wall openings left column 0 / W-1 air on platform rows (no floor when stepping into doorway)
  setTile(tiles, 4, 0, 1);
  setTile(tiles, 4, W - 1, 1);
  setTile(tiles, H - 2, 0, 1);

  return {
    name: 'Vertical Shaft',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: 27 },
    objects: [
      { type: 'ability_orb', ability: 'wallJump', x: 11, y: 14, hint: 'Wall slide then jump!' },
      { type: 'door', targetRoom: 'room1', x: 1, y: H - 2, spawnX: 52, spawnY: 21 },
      { type: 'door', targetRoom: 'room3', x: 1, y: 4, spawnX: 38, spawnY: 9 },
      { type: 'door', targetRoom: 'room4', x: W - 2, y: 4, spawnX: 2, spawnY: 19 },
      { type: 'bench', x: 11, y: 20 },
      { type: 'npc', npcType: 'knight', x: 14, y: 20, dialogue: [
        'Do not... be alarmed. I am no threat. Not anymore.',
        'I was a knight of the Pale Guard. We came to slay the Bone Tyrant, to end his curse upon this land.',
        'We were thirty strong. The finest blades in the realm. We made it as far as the fungal passages before... the ground itself turned against us.',
        'The walls have eyes here, traveler. The stone remembers. And it serves him still.',
        'If you mean to press deeper, learn to read the walls. Sometimes what looks solid will crumble, and what looks empty hides teeth.'
      ]},
      { type: 'flyer', x: 10, y: 15 },
      { type: 'moving_platform', x: 11, y: 13, axis: 'x', range: 128, speed: 0.8, phase: 0, spin: 0 },
      { type: 'pendulum_trap', x: 11, y: 20, length: 64, swing: 36, speed: 1.5, phase: 0.5 },
      { type: 'crumble_platform', x: 11, y: 10, collapseDelay: 400, respawnDelay: 2500 },
      { type: 'moving_platform', x: 5, y: 18, axis: 'x', range: 64, speed: 0.7, phase: 0, spin: 0 },
      { type: 'flyer', x: 5, y: 22 },
      { type: 'flyer', x: 16, y: 12 },
      { type: 'crawler', x: 11, y: 23 },
      { type: 'flyer', x: 11, y: 9 },
      { type: 'flyer', x: 16, y: 18 },
      { type: 'chain', x: 5, y: 1 },
      { type: 'chain', x: 17, y: 1 },
      { type: 'stalactite_sm', x: 3, y: 1 },
      { type: 'stalactite_sm', x: 11, y: 1 },
      { type: 'stalactite_sm', x: 19, y: 1 },
      { type: 'vine', x: 8, y: 4 },
      { type: 'vine', x: 14, y: 4 },
      { type: 'stalactite_sm', x: 8, y: 1 },
      { type: 'stalactite_sm', x: 14, y: 1 },
      { type: 'glow_spore', x: 8, y: 8 },
      { type: 'glow_spore', x: 14, y: 10 },
      { type: 'chain', x: 11, y: 4 },
      { type: 'fireball_shooter', x: 1, y: 12, dir: 'right', interval: 2800 },
      { type: 'fireball_shooter', x: 20, y: 20, dir: 'left', interval: 3200 },
      { type: 'floor_spikes', x: 10, y: 27, onTime: 1500, offTime: 2000, phase: 0 },
      { type: 'flame_jet', x: 11, y: 8, dir: 'down', onTime: 1200, offTime: 1800, phase: 300 },
      { type: 'lore_fragment', x: 18, y: 26, text: "Carved into stone: \"We delved too greedily, and woke the dreaming king.\"" },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 16, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 2, w: 8, h: 12 },
      { type: 'cb_detail_bricks', x: 12, y: 14, w: 8, h: 10 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 6, y: 18 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 16, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 10, y: 0, angle: 0, key: 'warm', alpha: 0.2, scale: 1.65 },
        { x: 6, y: 0, angle: -5, key: 'warm', alpha: 0.14, scale: 1.15 },
        { x: 16, y: 0, angle: 6, key: 'warm', alpha: 0.12, scale: 1.1 }
      ],
      ambientColor: 0x8899aa,
      ambientAlpha: 0.045,
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

  // Stepping platforms (bridge row-18 bumps to the main tier)
  fillRow(tiles, 16, 6, 8, 2);
  fillRow(tiles, 16, 28, 31, 2);

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

  // Burrow ceiling + maze ribs (hallway weave, gaps stay ≤2 tiles vertical between routes)
  fillRect(tiles, 2, 8, 5, 26, 1);
  fillRect(tiles, 2, 30, 5, 42, 1);
  fillRect(tiles, 3, 14, 6, 22, 1);
  // Single main crawl: floor route stays continuous (no extra maze ribs)

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
    playerSpawn: { x: 40, y: 9 },
    objects: [
      { type: 'door', targetRoom: 'room2', x: W - 2, y: 10, spawnX: 2, spawnY: 3 },
      { type: 'door', targetRoom: 'room6', x: 1, y: 19, spawnX: 3, spawnY: 19 },
      { type: 'ability_orb', ability: 'map', x: 3, y: 3, hint: 'Press M or tap the map icon' },
      { type: 'moving_platform', x: 30, y: 12, axis: 'x', range: 44, speed: 1.2, phase: 0.4, spin: 0.6 },
      { type: 'crumble_platform', x: 24, y: 10, collapseDelay: 520, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 28, y: 10, collapseDelay: 380, respawnDelay: 2600 },
      { type: 'flyer', x: 8, y: 6 },
      { type: 'flyer', x: 18, y: 7 },
      { type: 'flyer', x: 30, y: 6 },
      { type: 'flyer', x: 14, y: 8 },
      { type: 'flyer', x: 38, y: 6 },
      { type: 'moving_platform', x: 16, y: 8, axis: 'x', range: 96, speed: 1.0, phase: 1.0, spin: 0 },
      { type: 'crumble_platform', x: 15, y: 14, collapseDelay: 450, respawnDelay: 2800 },
      { type: 'crumble_platform', x: 34, y: 13, collapseDelay: 380, respawnDelay: 2600 },
      { type: 'pendulum_trap', x: 36, y: 4, length: 64, swing: 40, speed: 1.9, phase: 1.5 },
      { type: 'flyer', x: 26, y: 8 },
      { type: 'moving_platform', x: 23, y: 6, axis: 'y', range: 64, speed: 0.7, phase: 0, spin: 0 },
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
      { type: 'secret_wall', x: 41, y: 17, hitsToBreak: 2, targetRoom: 'sanctuary1', spawnX: 3, spawnY: 14 },
      { type: 'lore_fragment', x: 42, y: 17, text: 'Hidden alcove: "The fungal bloom remembers the forest above." ' },
      { type: 'health_pickup', x: 43, y: 17 },
      { type: 'fungal_bloom_large', x: 10, y: 17 },
    ],
    foreground: [
      { type: 'fg_mushroom_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_mushroom_large', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 1, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 3, y: H - 1, flipX: true },
      { type: 'fg_mushroom_large', x: 5, y: H - 2, flipX: false },
      { type: 'fg_rock_formation', x: W - 1, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_roots', x: 4, y: 1, count: 4 },
      { type: 'cb_detail_roots', x: 20, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 3 },
      { type: 'cb_detail_bricks', x: 6, y: 12, w: 10, h: 6 },
      { type: 'cb_detail_bricks', x: 28, y: 10, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 16, y: 6, w: 8, h: 10 }
    ],
    lighting: {
      beams: [
        { x: 10, y: 0, angle: 5, key: 'cool', alpha: 0.08, scale: 0.95 },
        { x: 25, y: 0, angle: -5, key: 'cool', alpha: 0.06, scale: 0.85 },
        { x: 38, y: 0, angle: 3, key: 'cool', alpha: 0.08, scale: 1.0 }
      ],
      ambientColor: 0x22ffaa,
      ambientAlpha: 0.04,
    },
    ambience: 'tunnel_fungal',
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

  // Crystal tunnel — low roof bands + choke points
  fillRect(tiles, 2, 9, 5, 24, 1);
  fillRect(tiles, 2, 28, 5, 44, 1);
  fillRect(tiles, 3, 16, 6, 36, 1);

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
      { type: 'door', targetRoom: 'room5', x: W - 2, y: 19, spawnX: 3, spawnY: 21 },
      { type: 'weapon_pickup', weaponId: 'phantom_edge', x: 10, y: 18 },
      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 22, y: 18 },
      { type: 'moving_platform', x: 19, y: 17, axis: 'x', range: 36, speed: 1.5, phase: 0.2, spin: 1.5 },
      { type: 'moving_platform', x: 27, y: 13, axis: 'x', range: 34, speed: 1.35, phase: 2.1, spin: -1.3 },
      { type: 'crumble_platform', x: 40, y: 11, collapseDelay: 380, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 14, y: 14, collapseDelay: 500, respawnDelay: 2800 },
      { type: 'pendulum_trap', x: 22, y: 6, length: 72, swing: 46, speed: 1.7, phase: 0.3 },
      { type: 'crumble_platform', x: 22, y: 10, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'moving_platform', x: 8, y: 12, axis: 'y', range: 96, speed: 0.9, phase: 0, spin: 0 },
      { type: 'bench', x: 45, y: 8 },
      { type: 'npc', npcType: 'spirit', x: 42, y: 8, dialogue: [
        'You can see me? How curious. Most who pass through here are already too far gone to notice a spirit.',
        'These crystals... they are not natural. They grew from the king\'s experiments. He tried to bind souls to stone.',
        'I was a scholar in Ur-Karath. I studied the ley lines that run through the deep earth. The king used my research to fuel his transformation.',
        'When he finally turned, the crystals drank the light from our eyes. Now we drift between the facets, half-remembered.',
        'The deeper chambers hold the truth of what happened. If you reach the Crucible, you will understand why nothing can leave this place.'
      ]},
      { type: 'crawler', x: 18, y: 19 },
      { type: 'crawler', x: 39, y: 18 },
      { type: 'flyer', x: 18, y: 7 },
      { type: 'flyer', x: 37, y: 6 },
      { type: 'flyer', x: 10, y: 10 },
      { type: 'flyer', x: 25, y: 8 },
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
      { type: 'fg_rock_formation_sm', x: 1, y: H - 1, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 6, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 30, y: 4, w: 14, h: 10 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 24, y: 6 },
      { type: 'cb_rune_mark', x: 42, y: 10 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: -10, key: 'cool', alpha: 0.12, scale: 1.2 },
        { x: 28, y: 0, angle: 8, key: 'cool', alpha: 0.10, scale: 1.0 },
        { x: 40, y: 0, angle: -6, key: 'cool', alpha: 0.11, scale: 1.2 }
      ],
      ambientColor: 0xaa66ff,
      ambientAlpha: 0.045,
    },
    ambience: 'tunnel_crystal',
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
  // Right-side step (bridges raised floor at row 20 to row 16)
  fillRow(tiles, 18, 33, 37, 2);
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

  // Buried arena — ceiling slabs over side aisles
  fillRect(tiles, 2, 5, 5, 16, 1);
  fillRect(tiles, 2, 24, 5, 35, 1);

  // Door opening left
  clearRect(tiles, 17, 0, 20, 0);
  // Door opening right to room8
  clearRect(tiles, 17, W - 1, 20, W - 1);

  return {
    name: 'Guardian Chamber',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: 21 },
    objects: [
      { type: 'door', targetRoom: 'room4', x: 1, y: 21, spawnX: 47, spawnY: 19 },
      { type: 'door', targetRoom: 'room8', x: W - 2, y: 21, spawnX: 46, spawnY: 23 },
      { type: 'moving_platform', x: 20, y: 14, axis: 'x', range: 160, speed: 1.2, phase: 0, spin: 0 },
      { type: 'crumble_platform', x: 18, y: 8, collapseDelay: 340, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 21, y: 8, collapseDelay: 460, respawnDelay: 2400 },
      { type: 'moving_platform', x: 9, y: 6, axis: 'y', range: 128, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 28, y: 6, axis: 'y', range: 128, speed: 1.0, phase: 1.5, spin: 0 },
      { type: 'crumble_platform', x: 15, y: 12, collapseDelay: 320, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 25, y: 12, collapseDelay: 400, respawnDelay: 2200 },
      { type: 'npc', npcType: 'merchant', x: 15, y: 20, dialogue: [
        'Heh heh... a living one. Do not look at me like that — I was alive once, too.',
        'I trade in old things. Relics. Memories. Bones of the forgotten. This chamber was the Guardian\'s proving ground.',
        'Champions came here to prove their worth before entering the Crucible. Most did not survive. Those that did wished they hadn\'t.',
        'The Bone Tyrant was not always what he is now. He was a man who loved his kingdom too much to let it die. So he made a bargain with the Deep.',
        'The Deep gives nothing for free. It took his flesh, his mind, his people. Now he sits on a throne of their bones, dreaming of an empire that already crumbled.',
        'But his power is real. Whatever you do, do not underestimate the throne room. He has had centuries to prepare for visitors.'
      ]},
      { type: 'brute', x: 20, y: 21 },
      { type: 'armored_flyer', x: 18, y: 12 },
      { type: 'flyer', x: 26, y: 7 },
      { type: 'flyer', x: 8, y: 6 },
      { type: 'flyer', x: 28, y: 6 },
      { type: 'flyer', x: 16, y: 6 },
      { type: 'moving_platform', x: 15, y: 6, axis: 'x', range: 128, speed: 1.3, phase: 1.0, spin: 0 },
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
      { type: 'lore_fragment', x: 28, y: 21, text: "A shattered helm. The bone sentinels were warriors once, bound to protect." },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 2, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 8, y: 4, w: 12, h: 10 },
      { type: 'cb_detail_bricks', x: 24, y: 2, w: 14, h: 14 },
      { type: 'cb_rune_mark', x: 8, y: 6 },
      { type: 'cb_rune_mark', x: 20, y: 10 },
      { type: 'cb_rune_mark', x: 32, y: 6 },
      { type: 'cb_rune_mark', x: 14, y: 14 },
      { type: 'cb_rune_mark', x: 26, y: 14 }
    ],
    lighting: {
      beams: [
        { x: 20, y: 0, angle: 0, key: 'warm', alpha: 0.16, scale: 1.6 },
        { x: 10, y: 0, angle: -12, key: 'warm', alpha: 0.10, scale: 1.0 },
        { x: 30, y: 0, angle: 12, key: 'warm', alpha: 0.10, scale: 1.0 }
      ],
      ambientColor: 0xcc4488,
      ambientAlpha: 0.055,
    },
    locked: true,
    ambience: 'tunnel_guardian',
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

  // Stepping platforms (bridge floor bumps at row 18 to the main tier at row 14)
  fillRow(tiles, 16, 6, 9, 2);
  fillRow(tiles, 16, 26, 29, 2);
  fillRow(tiles, 16, 50, 53, 2);

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

  // Aqueduct tunnel — roof over the walkway
  fillRect(tiles, 2, 6, 5, 18, 1);
  fillRect(tiles, 2, 24, 5, 32, 1);
  fillRect(tiles, 2, 38, 5, 52, 1);

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
      { type: 'ability_orb', ability: 'doubleJump', x: 54, y: 6, hint: 'Press jump again in mid-air!' },
      { type: 'bench', x: 30, y: 13 },
      // Lava pits,
      // Moving platforms over lava,
      { type: 'moving_platform', x: 17, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 33, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 1.5, spin: 0 },
      { type: 'moving_platform', x: 47, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0.8, spin: 0 },
      // Vertical platforms,
      { type: 'moving_platform', x: 22, y: 6, axis: 'y', range: 96, speed: 0.8, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 42, y: 6, axis: 'y', range: 96, speed: 0.9, phase: 1.0, spin: 0 },
      // Traps,
      // Crumble platforms,
      { type: 'crumble_platform', x: 26, y: 11, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 38, y: 8, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 54, y: 10, collapseDelay: 420, respawnDelay: 2600 },
      // Enemies,
      { type: 'brute', x: 30, y: f },
      { type: 'flyer', x: 26, y: 6 },
      { type: 'flyer', x: 37, y: 4 },
      { type: 'flyer', x: 50, y: 7 },
      { type: 'flyer', x: 18, y: 12 },
      { type: 'flyer', x: 46, y: 10 },
      // Decorations,
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
      { type: 'stalactite_sm', x: 2, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'stalactite_sm', x: 36, y: 1 },
      { type: 'stalactite_sm', x: 52, y: 1 },
      { type: 'glow_spore', x: 15, y: 4 },
      { type: 'glow_spore', x: 35, y: 4 },
      { type: 'glow_spore', x: 50, y: 4 },
      { type: 'hanging_moss', x: 12, y: 2 },
      { type: 'hanging_moss', x: 30, y: 2 },
      { type: 'hanging_moss', x: 46, y: 2 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 3, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 30, y: 2, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 48, y: 4, w: 10, h: 8 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 46, y: 8 },
      { type: 'cb_detail_roots', x: 6, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 34, y: 1, count: 3 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: -8, key: 'warm', alpha: 0.14, scale: 1.2 },
        { x: 30, y: 0, angle: 5, key: 'warm', alpha: 0.12, scale: 1.0 },
        { x: 48, y: 0, angle: -10, key: 'warm', alpha: 0.16, scale: 1.3 }
      ],
      ambientColor: 0xffaa60,
      ambientAlpha: 0.045,
    },
    ambience: 'tunnel',
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

  // Bone corridor roof (rows 1–3 only — row 4 holds top landings)
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 12, 3, 17);

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
      { type: 'ability_orb', ability: 'spear', x: 26, y: 3, hint: 'Soul Spear — double damage and reach!' },
      { type: 'bench', x: 16, y: 9 },
      { type: 'npc', npcType: 'hermit', x: 18, y: 9, dialogue: [
        'So you have come this far. Further than the knights, further than the scholars. The Bone Corridor is the last passage before his domain.',
        'I have waited here a long time. Not by choice — the way back closed behind me years ago. Or was it centuries? Time moves strangely in the Deep.',
        'Let me tell you of the Bone Tyrant\'s final act. When he felt his kingdom slipping away, he bound every soul within these walls to himself.',
        'Not just the dead — the living, the stone, the very air. Everything here is part of him. Every enemy you have fought is a fragment of his will.',
        'If you defeat him, the binding may break. Or it may not. But either way, you will have your answer about what lies at the bottom of the world.',
        'Go. The Crucible awaits beyond the next chamber. And beyond the Crucible... the Throne.'
      ]},
      // Lava at bottom,
      // Hazards on platforms,
      // Moving platforms,
      { type: 'moving_platform', x: 10, y: 22, axis: 'x', range: 80, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 20, y: 16, axis: 'x', range: 64, speed: 1.3, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 12, y: 10, axis: 'x', range: 64, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 19, y: 5, axis: 'x', range: 48, speed: 1.4, phase: 1.5, spin: 0 },
      // Crumble,
      { type: 'crumble_platform', x: 16, y: 16, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 8, y: 12, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 18, y: 10, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 24, y: 8, collapseDelay: 300, respawnDelay: 2200 },
      // Enemies,
      { type: 'charger', x: 15, y: 22 },
      { type: 'flyer', x: 19, y: 11 },
      { type: 'flyer', x: 8, y: 8 },
      { type: 'flyer', x: 22, y: 4 },
      { type: 'flyer', x: 14, y: 6 },
      { type: 'flyer', x: 26, y: 10 },
      // Decorations,
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
      { type: 'chain', x: 12, y: 4 },
      { type: 'chain', x: 22, y: 3 },
      { type: 'ruin_arch', x: 10, y: 8 },
      { type: 'ruin_arch', x: 20, y: 6 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 16, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: 14, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 10, h: 10 },
      { type: 'cb_detail_bricks', x: 16, y: 2, w: 10, h: 12 },
      { type: 'cb_rune_mark', x: 8, y: 8 },
      { type: 'cb_rune_mark', x: 20, y: 6 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 18, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 8, y: 0, angle: -5, key: 'cool', alpha: 0.12, scale: 1.0 },
        { x: 18, y: 0, angle: 5, key: 'cool', alpha: 0.14, scale: 1.2 },
        { x: 26, y: 0, angle: -8, key: 'cool', alpha: 0.10, scale: 0.9 }
      ],
      ambientColor: 0xaaccee,
      ambientAlpha: 0.04,
    },
    ambience: 'tunnel',
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

  // Vaulted cavern ceiling (thin band — keep mid-level platforms clear)
  fillRect(tiles, 2, 6, 4, 20, 1);
  fillRect(tiles, 2, 30, 4, 44, 1);

  return {
    name: 'The Crucible',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room7', x: 1, y: f, spawnX: 26, spawnY: 5 },
      { type: 'door', targetRoom: 'room5', x: W - 2, y: f, spawnX: 37, spawnY: 21 },
      { type: 'door', targetRoom: 'room9', x: W / 2, y: 2, spawnX: 3, spawnY: 17 },
      // Central lava,
      // Moving platforms over lava,
      { type: 'moving_platform', x: 20, y: 20, axis: 'x', range: 128, speed: 1.3, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: 20, axis: 'x', range: 128, speed: 1.3, phase: 1.5, spin: 0 },
      // Side pillars with spikes,
      // Pendulums,
      // Vertical movers,
      { type: 'moving_platform', x: 7, y: 7, axis: 'y', range: 128, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 40, y: 7, axis: 'y', range: 128, speed: 1.1, phase: 1.5, spin: 0 },
      { type: 'moving_platform', x: 25, y: 4, axis: 'y', range: 64, speed: 0.9, phase: 0, spin: 0 },
      // Crumble,
      { type: 'crumble_platform', x: 38, y: 14, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 15, y: 10, collapseDelay: 280, respawnDelay: 1800 },
      { type: 'crumble_platform', x: 35, y: 10, collapseDelay: 280, respawnDelay: 1800 },
      // Enemies,
      { type: 'brute', x: 12, y: f },
      { type: 'brute', x: 36, y: f },
      { type: 'flyer', x: 39, y: 5 },
      { type: 'flyer', x: 15, y: 9 },
      { type: 'flyer', x: 35, y: 9 },
      { type: 'flyer', x: 25, y: 11 },
      // Health,
      // Decorations,
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
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 2, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 2, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 16, h: 14 },
      { type: 'cb_detail_bricks', x: 30, y: 2, w: 16, h: 14 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 20, y: 10 },
      { type: 'cb_rune_mark', x: 30, y: 6 },
      { type: 'cb_rune_mark', x: 40, y: 10 },
      { type: 'cb_rune_mark', x: 14, y: 16 },
      { type: 'cb_rune_mark', x: 36, y: 16 }
    ],
    lighting: {
      beams: [
        { x: 25, y: 0, angle: 0, key: 'warm', alpha: 0.18, scale: 1.8 },
        { x: 12, y: 0, angle: -12, key: 'warm', alpha: 0.12, scale: 1.2 },
        { x: 38, y: 0, angle: 12, key: 'warm', alpha: 0.12, scale: 1.2 }
      ],
      ambientColor: 0xff4444,
      ambientAlpha: 0.055,
    },
    locked: true,
    ambience: 'tunnel_guardian',
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

  // Throne antechamber — low stone dome
  fillRect(tiles, 2, 4, 5, W - 2, 1);
  clearRect(tiles, 3, 18, 4, 25);

  // Small terrain bumps on the floor
  fillRect(tiles, f, 14, f + 1, 15, 1);
  fillRect(tiles, f, W - 16, f + 1, W - 15, 1);

  // Door opening on left (entry from room8)
  clearRect(tiles, f - 2, 0, f + 1, 0);
  // Door opening on right (to room10 — unlocks after boss defeated)
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Throne of the Bone Tyrant',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room8', x: 1, y: f, spawnX: 46, spawnY: 23 },
      { type: 'door', targetRoom: 'room10', x: W - 2, y: f, spawnX: 3, spawnY: 19 },
      { type: 'boss', bossType: 'bone_tyrant', x: 27, y: 16 },
      { type: 'bench', x: 5, y: f },
      // Lava pits on the sides for danger,
      { type: 'magma_pool', x: W - 14, y: f + 1, width: 3 },
      // Decorations,
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
      { type: 'fireball_shooter', x: 1, y: 8, dir: 'right', interval: 2400 },
      { type: 'fireball_shooter', x: 42, y: 10, dir: 'left', interval: 2600 },
      { type: 'floor_spikes', x: 20, y: 17, onTime: 1200, offTime: 2200, phase: 0 },
      { type: 'saw_blade', x: 30, y: 8, axis: 'x', range: 80, speed: 1.1, phase: 0.5 },
      { type: 'flame_jet', x: 10, y: 17, dir: 'up', onTime: 1000, offTime: 2000, phase: 0 },
      { type: 'lore_fragment', x: 22, y: 16, text: "The Bone Tyrant fell here — but something older still watches." },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 2, w: 16, h: 12 },
      { type: 'cb_detail_bricks', x: W - 18, y: 2, w: 16, h: 12 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 22, y: 4 },
      { type: 'cb_rune_mark', x: W - 11, y: 6 },
      { type: 'cb_rune_mark', x: 16, y: 12 },
      { type: 'cb_rune_mark', x: W - 17, y: 12 }
    ],
    lighting: {
      beams: [
        { x: 22, y: 0, angle: 0, key: 'warm', alpha: 0.20, scale: 2.0 },
        { x: 10, y: 0, angle: -15, key: 'warm', alpha: 0.14, scale: 1.4 },
        { x: W - 11, y: 0, angle: 15, key: 'warm', alpha: 0.14, scale: 1.4 }
      ],
      ambientColor: 0xff2244,
      ambientAlpha: 0.065,
    },
    locked: true,
    ambience: 'tunnel_guardian',
  };
}

function buildRoom10() {
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Icy terrain bumps on floor
  fillRect(tiles, 18, 8, 19, 11, 1);
  fillRect(tiles, 17, 22, 19, 25, 1);
  fillRect(tiles, 18, 36, 19, 39, 1);

  // Frozen chasms in the floor
  clearRect(tiles, H - 2, 14, H - 2, 18);
  clearRect(tiles, H - 2, 30, H - 2, 34);

  // Zigzag ice platforms — horizontal traversal
  fillRow(tiles, 16, 4, 8, 2);
  fillRow(tiles, 14, 10, 15, 2);
  fillRow(tiles, 12, 6, 10, 2);
  fillRow(tiles, 16, 18, 23, 2);
  fillRow(tiles, 14, 26, 30, 2);
  fillRow(tiles, 12, 22, 26, 2);
  fillRow(tiles, 10, 28, 33, 2);
  fillRow(tiles, 16, 36, 40, 2);
  fillRow(tiles, 14, 42, 46, 2);
  fillRow(tiles, 10, 40, 44, 2);
  fillRow(tiles, 8, 14, 18, 2);
  fillRow(tiles, 8, 34, 38, 2);

  // Stair blocks near climb start
  setTile(tiles, f, 4, 3);
  setTile(tiles, 18, 5, 3);
  setTile(tiles, 17, 6, 3);

  // Frozen pillars
  fillRect(tiles, 6, 12, 12, 13, 1);
  fillRect(tiles, 6, 34, 12, 35, 1);

  // Ice tunnel ceiling
  fillRect(tiles, 2, 6, 5, 20, 1);
  fillRect(tiles, 2, 28, 5, 44, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Frozen Threshold',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room9', x: 1, y: f, spawnX: 40, spawnY: 17 },
      { type: 'door', targetRoom: 'room11', x: W - 2, y: f, spawnX: 2, spawnY: 27 },
      { type: 'bench', x: 24, y: 11 },
      { type: 'coin', x: 8, y: 11 },
      { type: 'coin', x: 28, y: 9 },
      { type: 'coin', x: 44, y: 9 },
      { type: 'coin', x: 16, y: 7 },
      { type: 'crawler', x: 9, y: 17 },
      { type: 'crawler', x: 30, y: 16 },
      { type: 'crawler', x: 42, y: f },
      { type: 'flyer', x: 16, y: 6 },
      { type: 'flyer', x: 28, y: 8 },
      { type: 'flyer', x: 40, y: 6 },
      { type: 'moving_platform', x: 16, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 1.5, spin: 0 },
      { type: 'wood_bridge', x: 15, y: f },
      { type: 'wood_bridge', x: 31, y: f },
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 20, y: f },
      { type: 'crystal', x: 38, y: f },
      { type: 'crystal_cluster', x: 12, y: f },
      { type: 'crystal_cluster', x: 32, y: f },
      { type: 'crystal_cluster', x: 46, y: f },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 24, y: 1 },
      { type: 'stalactite', x: 40, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 32, y: 1 },
      { type: 'stalactite_sm', x: 46, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 36, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 42, y: 6 },
      { type: 'ruin_arch', x: 16, y: f },
      { type: 'ruin_arch', x: 34, y: f },
      { type: 'gravel_patch', x: 8, y: f },
      { type: 'gravel_patch', x: 28, y: f },
      { type: 'gravel_patch', x: 44, y: f },
      { type: 'floor_spikes', x: 24, y: 19, onTime: 1200, offTime: 1800, phase: 0 },
      { type: 'floor_spikes', x: 40, y: 19, onTime: 1200, offTime: 1800, phase: 600 },
      { type: 'ice_patch', x: 20, y: 18, width: 3 },
      { type: 'ice_patch', x: 32, y: 18, width: 2 },
      { type: 'icicle_drop', x: 15, y: 4 },
      { type: 'icicle_drop', x: 38, y: 4 },
      { type: 'ice_crystal_cluster', x: 8, y: 19 },
      { type: 'frozen_banner', x: 44, y: 4 },
      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 6, y: 19 },
    ],
    foreground: [
      { type: 'fg_crystal_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 3, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 30, y: 2, w: 14, h: 10 },
      { type: 'cb_rune_mark', x: 12, y: 8 },
      { type: 'cb_rune_mark', x: 26, y: 6 },
      { type: 'cb_rune_mark', x: 42, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: -8, key: 'cool', alpha: 0.14, scale: 1.3 },
        { x: 26, y: 0, angle: 5, key: 'cool', alpha: 0.12, scale: 1.1 },
        { x: 42, y: 0, angle: -6, key: 'cool', alpha: 0.13, scale: 1.2 }
      ],
      ambientColor: 0x88ccff,
      ambientAlpha: 0.05,
    },
    ambience: 'tunnel_crystal',
  };
}

function buildRoom11() {
  const W = 24, H = 30;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Bottom floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Zigzag ascending platforms — wall-jump friendly
  fillRow(tiles, 26, 3, 7, 2);
  fillRow(tiles, 24, 14, 20, 2);
  fillRow(tiles, 22, 3, 8, 2);
  fillRow(tiles, 20, 13, 19, 2);
  fillRow(tiles, 18, 4, 9, 2);
  fillRow(tiles, 16, 14, 20, 2);
  fillRow(tiles, 14, 3, 8, 2);
  fillRow(tiles, 12, 12, 18, 2);
  fillRow(tiles, 10, 4, 9, 2);
  fillRow(tiles, 8, 14, 20, 2);
  fillRow(tiles, 6, 3, 8, 2);
  fillRow(tiles, 4, 16, 22, 2);

  // Wall columns for wall-jumping
  fillRect(tiles, 10, 10, 18, 11, 1);
  fillRect(tiles, 6, 10, 12, 11, 1);

  // Glacial ceiling
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 10, 3, 14);
  clearRect(tiles, 3, 16, 3, 22);

  // Terrain bump on floor
  fillRect(tiles, 26, 15, 27, 17, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 5, W - 1);

  return {
    name: 'Glacial Shaft',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 2, y: f },
    objects: [
      { type: 'door', targetRoom: 'room10', x: 1, y: f, spawnX: 47, spawnY: 19 },
      { type: 'door', targetRoom: 'room12', x: W - 2, y: 3, spawnX: 2, spawnY: 19 },
      { type: 'coin', x: 18, y: 23 },
      { type: 'coin', x: 6, y: 17 },
      { type: 'coin', x: 18, y: 11 },
      { type: 'flyer', x: 12, y: 20 },
      { type: 'flyer', x: 7, y: 13 },
      { type: 'flyer', x: 15, y: 7 },
      { type: 'flyer', x: 6, y: 4 },
      { type: 'pendulum_trap', x: 12, y: 8, length: 56, swing: 36, speed: 1.8, phase: 1.0 },
      { type: 'crumble_platform', x: 16, y: 20, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 6, y: 14, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 16, y: 12, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crystal', x: 5, y: f },
      { type: 'crystal', x: 18, y: f },
      { type: 'crystal_cluster', x: 10, y: f },
      { type: 'stalactite', x: 6, y: 1 },
      { type: 'stalactite', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 3, y: 1 },
      { type: 'stalactite_sm', x: 12, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 18, y: 1 },
      { type: 'glow_spore', x: 6, y: 10 },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 10, y: 16 },
      { type: 'vine', x: 4, y: 1 },
      { type: 'vine', x: 14, y: 1 },
      { type: 'floor_spikes', x: 12, y: 27, onTime: 1100, offTime: 1900, phase: 0 },
      { type: 'saw_blade', x: 12, y: 12, axis: 'y', range: 64, speed: 1.2, phase: 0 },
      { type: 'ice_patch', x: 8, y: 24, width: 2 },
      { type: 'icicle_drop', x: 10, y: 4 },
      { type: 'ice_crystal_cluster', x: 14, y: 15 },
      { type: 'secret_wall', x: 20, y: 24, hitsToBreak: 2 },
      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 21, y: 24 },
      { type: 'health_pickup', x: 21, y: 24 },
      { type: 'lore_fragment', x: 21, y: 25, text: 'Frozen in the glass: a traveler\'s final map, leading deeper still.' },
    ],
    foreground: [
      { type: 'fg_crystal_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 14, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 8, h: 10 },
      { type: 'cb_detail_bricks', x: 12, y: 14, w: 8, h: 10 },
      { type: 'cb_rune_mark', x: 6, y: 8 },
      { type: 'cb_rune_mark', x: 16, y: 18 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 14, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: 0, key: 'cool', alpha: 0.16, scale: 1.5 },
        { x: 6, y: 0, angle: -6, key: 'cool', alpha: 0.10, scale: 1.0 },
        { x: 18, y: 0, angle: 6, key: 'cool', alpha: 0.10, scale: 1.0 }
      ],
      ambientColor: 0x88ccff,
      ambientAlpha: 0.05,
    },
    ambience: 'tunnel_crystal',
  };
}

function buildRoom12() {
  const W = 55, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Floor terrain bumps
  fillRect(tiles, 18, 8, 19, 11, 1);
  fillRect(tiles, 17, 24, 19, 28, 1);
  fillRect(tiles, 18, 40, 19, 43, 1);

  // Floor gaps
  clearRect(tiles, H - 2, 16, H - 2, 20);
  clearRect(tiles, H - 2, 34, H - 2, 38);

  // Multi-tier platforms
  fillRow(tiles, 16, 4, 8, 2);
  fillRow(tiles, 14, 10, 15, 2);
  fillRow(tiles, 12, 5, 9, 2);
  fillRow(tiles, 16, 20, 25, 2);
  fillRow(tiles, 14, 28, 33, 2);
  fillRow(tiles, 12, 22, 27, 2);
  fillRow(tiles, 10, 30, 35, 2);
  fillRow(tiles, 16, 40, 45, 2);
  fillRow(tiles, 14, 46, 51, 2);
  fillRow(tiles, 10, 42, 47, 2);
  fillRow(tiles, 8, 16, 20, 2);
  fillRow(tiles, 8, 36, 40, 2);
  fillRow(tiles, 6, 26, 30, 2);

  // Frozen pillars
  fillRect(tiles, 5, 14, 12, 15, 1);
  fillRect(tiles, 5, 40, 12, 41, 1);

  // Ice ceiling
  fillRect(tiles, 2, 6, 5, 22, 1);
  fillRect(tiles, 2, 32, 5, 48, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Crystal Caverns',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room11', x: 1, y: f, spawnX: 21, spawnY: 3 },
      { type: 'door', targetRoom: 'room13', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'weapon_pickup', weaponId: 'throwing_daggers', x: 16, y: 14 },
      { type: 'merchant_shop', x: 28, y: 5, items: [
        { name: 'Health Refill', cost: 5, type: 'heal' },
        { name: 'Max HP +1', cost: 15, type: 'maxhp' }
      ], dialogue: [
        'Brr... even my wares are starting to frost over down here.',
        'Take what you need — coin spends the same whether it\'s frozen or not.'
      ]},
      { type: 'coin', x: 7, y: 11 },
      { type: 'coin', x: 22, y: 11 },
      { type: 'coin', x: 44, y: 9 },
      { type: 'coin', x: 18, y: 7 },
      { type: 'coin', x: 38, y: 7 },
      { type: 'crawler', x: 30, y: 13 },
      { type: 'crawler', x: 48, y: f },
      { type: 'armored_flyer', x: 25, y: 10 },
      { type: 'flyer', x: 32, y: 6 },
      { type: 'flyer', x: 46, y: 8 },
      { type: 'flyer', x: 10, y: 10 },
      { type: 'moving_platform', x: 18, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'crumble_platform', x: 12, y: 14, collapseDelay: 420, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 34, y: 10, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 48, y: 14, collapseDelay: 450, respawnDelay: 2800 },
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 22, y: f },
      { type: 'crystal', x: 36, y: f },
      { type: 'crystal', x: 50, y: f },
      { type: 'crystal_cluster', x: 10, y: f },
      { type: 'crystal_cluster', x: 30, y: f },
      { type: 'crystal_cluster', x: 46, y: f },
      { type: 'stalactite', x: 12, y: 1 },
      { type: 'stalactite', x: 28, y: 1 },
      { type: 'stalactite', x: 44, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'stalactite_sm', x: 36, y: 1 },
      { type: 'stalactite_sm', x: 50, y: 1 },
      { type: 'chain', x: 10, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'chain', x: 40, y: 1 },
      { type: 'light_beam', x: 16, y: 1 },
      { type: 'light_beam', x: 32, y: 1 },
      { type: 'light_beam', x: 48, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 28, y: 4 },
      { type: 'glow_spore', x: 42, y: 6 },
      { type: 'ruin_arch', x: 8, y: f },
      { type: 'ruin_arch', x: 32, y: f },
      { type: 'hanging_moss', x: 18, y: 2 },
      { type: 'hanging_moss', x: 38, y: 2 },
      { type: 'floor_spikes', x: 44, y: 19, onTime: 1200, offTime: 1600, phase: 800 },
      { type: 'ice_patch', x: 22, y: 18, width: 3 },
      { type: 'icicle_drop', x: 28, y: 4 },
      { type: 'ice_crystal_cluster', x: 42, y: 18 },
    ],
    foreground: [
      { type: 'fg_crystal_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 3, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 24, y: 2, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 44, y: 4, w: 8, h: 8 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 46, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'cool', alpha: 0.14, scale: 1.3 },
        { x: 28, y: 0, angle: 5, key: 'cool', alpha: 0.12, scale: 1.1 },
        { x: 44, y: 0, angle: -5, key: 'cool', alpha: 0.13, scale: 1.2 }
      ],
      ambientColor: 0x88ccff,
      ambientAlpha: 0.05,
    },
    ambience: 'tunnel_crystal',
  };
}

function buildRoom13() {
  const W = 40, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Raised side platforms
  fillRow(tiles, 18, 3, 8, 2);
  fillRow(tiles, 18, W - 9, W - 4, 2);
  fillRow(tiles, 14, 4, 9, 2);
  fillRow(tiles, 14, W - 10, W - 5, 2);
  fillRow(tiles, 10, 6, 10, 2);
  fillRow(tiles, 10, W - 11, W - 7, 2);

  // Central elevated platform
  fillRow(tiles, 16, 16, 24, 2);
  fillRow(tiles, 12, 14, 26, 2);
  fillRow(tiles, 8, 18, 22, 2);

  // Arena pillars
  fillRect(tiles, 4, 12, 14, 12, 1);
  fillRect(tiles, 4, W - 13, 14, W - 13, 1);

  // Icy ceiling
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 16, 4, 24);

  // Terrain bumps
  fillRect(tiles, f, 10, f + 1, 12, 1);
  fillRect(tiles, f, W - 13, f + 1, W - 11, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Frost Warden',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room12', x: 1, y: f, spawnX: 52, spawnY: 19 },
      { type: 'door', targetRoom: 'room14', x: W - 2, y: f, spawnX: 2, spawnY: 23 },
      { type: 'brute', x: 20, y: f },
      { type: 'brute', x: 30, y: f },
      { type: 'flyer', x: 20, y: 7 },
      { type: 'flyer', x: 30, y: 6 },
      { type: 'flyer', x: 14, y: 10 },
      { type: 'flyer', x: 26, y: 8 },
      { type: 'pendulum_trap', x: 20, y: 6, length: 80, swing: 46, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 10, y: 10, length: 64, swing: 40, speed: 1.6, phase: 1.0 },
      { type: 'moving_platform', x: 20, y: 10, axis: 'x', range: 128, speed: 1.2, phase: 0, spin: 0 },
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 18, y: f },
      { type: 'crystal', x: 32, y: f },
      { type: 'crystal_cluster', x: 14, y: f },
      { type: 'crystal_cluster', x: 26, y: f },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 20, y: 1 },
      { type: 'stalactite', x: 30, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 36, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 34, y: 1 },
      { type: 'ruin_arch', x: 16, y: f },
      { type: 'ruin_arch', x: 26, y: f },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 26, y: 4 },
      { type: 'glow_spore', x: 34, y: 6 },
      { type: 'hanging_moss', x: 18, y: 2 },
      { type: 'hanging_moss', x: 28, y: 2 },
      { type: 'saw_blade', x: 20, y: 10, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'floor_spikes', x: 10, y: 21, onTime: 1100, offTime: 1700, phase: 0 },
      { type: 'floor_spikes', x: 30, y: 21, onTime: 1100, offTime: 1700, phase: 550 },
      { type: 'ice_patch', x: 14, y: 20, width: 3 },
      { type: 'icicle_drop', x: 20, y: 4 },
      { type: 'frozen_banner', x: 30, y: 4 },
    ],
    foreground: [
      { type: 'fg_crystal_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 14, h: 12 },
      { type: 'cb_detail_bricks', x: 24, y: 2, w: 12, h: 12 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 20, y: 10 },
      { type: 'cb_rune_mark', x: 32, y: 6 }
    ],
    lighting: {
      beams: [
        { x: 20, y: 0, angle: 0, key: 'cool', alpha: 0.16, scale: 1.6 },
        { x: 10, y: 0, angle: -10, key: 'cool', alpha: 0.10, scale: 1.0 },
        { x: 30, y: 0, angle: 10, key: 'cool', alpha: 0.10, scale: 1.0 }
      ],
      ambientColor: 0x88ccff,
      ambientAlpha: 0.055,
    },
    locked: true,
    ambience: 'tunnel_crystal',
  };
}

function buildRoom14() {
  const W = 50, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Floor segments with magma gaps
  fillRect(tiles, H - 2, 1, H - 1, 10, 1);
  clearRect(tiles, H - 2, 11, H - 2, 16);
  fillRect(tiles, H - 2, 17, H - 1, 24, 1);
  clearRect(tiles, H - 2, 25, H - 2, 30);
  fillRect(tiles, H - 2, 31, H - 1, 38, 1);
  clearRect(tiles, H - 2, 39, H - 2, 44);
  fillRect(tiles, H - 2, 45, H - 1, W - 2, 1);

  // Stepping platforms over lava and ascending routes
  fillRow(tiles, 20, 4, 8, 2);
  fillRow(tiles, 18, 10, 15, 2);
  fillRow(tiles, 16, 6, 10, 2);
  fillRow(tiles, 20, 18, 23, 2);
  fillRow(tiles, 18, 26, 31, 2);
  fillRow(tiles, 16, 22, 26, 2);
  fillRow(tiles, 14, 28, 33, 2);
  fillRow(tiles, 20, 36, 40, 2);
  fillRow(tiles, 18, 42, 46, 2);
  fillRow(tiles, 14, 38, 42, 2);
  fillRow(tiles, 12, 16, 20, 2);
  fillRow(tiles, 10, 34, 38, 2);
  fillRow(tiles, 8, 22, 26, 2);

  // Stair blocks near lava crossings
  setTile(tiles, f, 10, 3);
  setTile(tiles, 22, 11, 3);
  setTile(tiles, f, 38, 3);
  setTile(tiles, 22, 39, 3);

  // Lava pillars
  fillRect(tiles, 5, 14, 14, 15, 1);
  fillRect(tiles, 5, 34, 14, 35, 1);

  // Cavern ceiling
  fillRect(tiles, 2, 6, 5, 20, 1);
  fillRect(tiles, 2, 28, 5, 44, 1);

  // Terrain bumps
  fillRect(tiles, f, 8, f + 1, 10, 1);
  fillRect(tiles, f, 32, f + 1, 34, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Magma Descent',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room13', x: 1, y: f, spawnX: 37, spawnY: 21 },
      { type: 'door', targetRoom: 'room15', x: W - 2, y: f, spawnX: 4, spawnY: 25 },
      { type: 'ability_orb', ability: 'kick', x: 24, y: 7, hint: 'Press F or K to kick!' },
      { type: 'checkpoint_shrine', x: 5, y: f },
      { type: 'coin', x: 12, y: 17 },
      { type: 'coin', x: 28, y: 13 },
      { type: 'coin', x: 36, y: 9 },
      { type: 'coin', x: 18, y: 11 },
      { type: 'moving_platform', x: 13, y: 22, axis: 'x', range: 128, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 27, y: 22, axis: 'x', range: 128, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 41, y: 22, axis: 'x', range: 128, speed: 1.3, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 20, y: 8, axis: 'y', range: 128, speed: 0.9, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 38, y: 6, axis: 'y', range: 96, speed: 1.0, phase: 1.5, spin: 0 },
      { type: 'crumble_platform', x: 18, y: 18, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 32, y: 14, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 44, y: 18, collapseDelay: 420, respawnDelay: 2800 },
      { type: 'crawler', x: 22, y: 19 },
      { type: 'crawler', x: 36, y: f },
      { type: 'flyer', x: 16, y: 8 },
      { type: 'flyer', x: 30, y: 6 },
      { type: 'flyer', x: 42, y: 8 },
      { type: 'flyer', x: 10, y: 14 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 24, y: 1 },
      { type: 'stalactite', x: 40, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 32, y: 1 },
      { type: 'stalactite_sm', x: 46, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 36, y: 1 },
      { type: 'chain', x: 46, y: 1 },
      { type: 'ruin_arch', x: 10, y: f },
      { type: 'ruin_arch', x: 32, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 44, y: 6 },
      { type: 'mud_patch', x: 6, y: f },
      { type: 'mud_patch', x: 22, y: f },
      { type: 'gravel_patch', x: 34, y: f },
      { type: 'gravel_patch', x: 46, y: f },
      { type: 'lore_fragment', x: 22, y: 23, text: "Ash-scorched scripture: \"The Crucible judges all who would descend.\"" },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 12, h: 10 },
      { type: 'cb_detail_bricks', x: 28, y: 2, w: 14, h: 10 },
      { type: 'cb_rune_mark', x: 12, y: 8 },
      { type: 'cb_rune_mark', x: 26, y: 6 },
      { type: 'cb_rune_mark', x: 42, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'warm', alpha: 0.16, scale: 1.3 },
        { x: 28, y: 0, angle: 5, key: 'warm', alpha: 0.14, scale: 1.1 },
        { x: 42, y: 0, angle: -6, key: 'warm', alpha: 0.15, scale: 1.2 }
      ],
      ambientColor: 0xff6622,
      ambientAlpha: 0.055,
    },
    ambience: 'tunnel_guardian',
  };
}

function buildRoom15() {
  const W = 30, H = 28;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Bottom floor — solid near entry, open center (lava below)
  fillRect(tiles, H - 2, 1, H - 1, 6, 1);
  clearRect(tiles, H - 2, 7, H - 2, 22);
  fillRect(tiles, H - 2, 23, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 7, 22, 1);

  // Ascending zigzag platforms
  fillRow(tiles, 24, 10, 16, 2);
  fillRow(tiles, 22, 3, 8, 2);
  fillRow(tiles, 20, 14, 20, 2);
  fillRow(tiles, 18, 4, 10, 2);
  fillRow(tiles, 16, 16, 22, 2);
  fillRow(tiles, 14, 3, 8, 2);
  fillRow(tiles, 12, 14, 20, 2);
  fillRow(tiles, 10, 4, 10, 2);
  fillRow(tiles, 8, 16, 22, 2);
  fillRow(tiles, 6, 4, 10, 2);
  fillRow(tiles, 4, 18, W - 2, 2);

  // Wall column for wall-jumping
  fillRect(tiles, 10, 12, 20, 13, 1);

  // Cavern ceiling
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 14, 3, 18);
  clearRect(tiles, 3, 18, 3, W - 2);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 5, W - 1);

  return {
    name: 'Crucible Depths',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room14', x: 1, y: f, spawnX: 47, spawnY: 23 },
      { type: 'door', targetRoom: 'room16', x: W - 2, y: 3, spawnX: 2, spawnY: 19 },
      { type: 'coin', x: 16, y: 15 },
      { type: 'coin', x: 6, y: 9 },
      { type: 'coin', x: 20, y: 7 },
      { type: 'pendulum_trap', x: 8, y: 8, length: 64, swing: 38, speed: 2.0, phase: 1.0 },
      { type: 'pendulum_trap', x: 20, y: 4, length: 56, swing: 36, speed: 1.9, phase: 0.5 },
      { type: 'moving_platform', x: 14, y: 22, axis: 'x', range: 96, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 11, y: 9, axis: 'y', range: 96, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 20, y: 6, axis: 'x', range: 64, speed: 1.3, phase: 1.0, spin: 0 },
      { type: 'crumble_platform', x: 14, y: 18, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 6, y: 12, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 18, y: 10, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crawler', x: 16, y: 21 },
      { type: 'crawler', x: 6, y: 15 },
      { type: 'flyer', x: 14, y: 16 },
      { type: 'flyer', x: 7, y: 9 },
      { type: 'flyer', x: 18, y: 6 },
      { type: 'flyer', x: 6, y: 4 },
      { type: 'stalactite', x: 8, y: 1 },
      { type: 'stalactite', x: 20, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 14, y: 1 },
      { type: 'stalactite_sm', x: 24, y: 1 },
      { type: 'chain', x: 6, y: 1 },
      { type: 'chain', x: 16, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'glow_spore', x: 8, y: 10 },
      { type: 'glow_spore', x: 18, y: 6 },
      { type: 'glow_spore', x: 24, y: 12 },
      { type: 'ruin_arch', x: 4, y: f },
      { type: 'ruin_arch', x: 24, y: f },
      { type: 'vine', x: 10, y: 1 },
      { type: 'vine', x: 22, y: 1 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 14, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 10, h: 12 },
      { type: 'cb_detail_bricks', x: 16, y: 2, w: 10, h: 10 },
      { type: 'cb_rune_mark', x: 8, y: 8 },
      { type: 'cb_rune_mark', x: 20, y: 14 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 18, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: 0, key: 'warm', alpha: 0.18, scale: 1.5 },
        { x: 6, y: 0, angle: -8, key: 'warm', alpha: 0.12, scale: 1.0 },
        { x: 22, y: 0, angle: 8, key: 'warm', alpha: 0.12, scale: 1.0 }
      ],
      ambientColor: 0xff4422,
      ambientAlpha: 0.06,
    },
    ambience: 'tunnel_guardian',
  };
}

function buildRoom16() {
  const W = 55, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Floor with hazard gaps
  clearRect(tiles, H - 2, 12, H - 2, 16);
  clearRect(tiles, H - 2, 24, H - 2, 28);
  clearRect(tiles, H - 2, 38, H - 2, 42);

  // Terrain bumps
  fillRect(tiles, 18, 6, 19, 9, 1);
  fillRect(tiles, 17, 20, 19, 22, 1);
  fillRect(tiles, 18, 44, 19, 47, 1);

  // Multi-tier platforms — horizontal gauntlet
  fillRow(tiles, 16, 4, 9, 2);
  fillRow(tiles, 14, 12, 17, 2);
  fillRow(tiles, 12, 6, 10, 2);
  fillRow(tiles, 16, 18, 23, 2);
  fillRow(tiles, 14, 26, 31, 2);
  fillRow(tiles, 12, 20, 25, 2);
  fillRow(tiles, 10, 28, 34, 2);
  fillRow(tiles, 16, 34, 39, 2);
  fillRow(tiles, 14, 42, 47, 2);
  fillRow(tiles, 10, 40, 44, 2);
  fillRow(tiles, 8, 14, 18, 2);
  fillRow(tiles, 8, 46, 51, 2);
  fillRow(tiles, 6, 30, 34, 2);
  fillRow(tiles, 16, 48, 52, 2);

  // Lava pillars
  fillRect(tiles, 5, 10, 12, 11, 1);
  fillRect(tiles, 5, 36, 12, 37, 1);

  // Cavern ceiling
  fillRect(tiles, 2, 6, 5, 22, 1);
  fillRect(tiles, 2, 28, 5, 48, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Ember Halls',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room15', x: 1, y: f, spawnX: 27, spawnY: 3 },
      { type: 'door', targetRoom: 'room17', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'coin', x: 8, y: 11 },
      { type: 'coin', x: 22, y: 11 },
      { type: 'coin', x: 42, y: 9 },
      { type: 'coin', x: 16, y: 7 },
      { type: 'coin', x: 48, y: 7 },
      { type: 'moving_platform', x: 14, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 26, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 40, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'pendulum_trap', x: 26, y: 8, length: 72, swing: 42, speed: 2.0, phase: 1.0 },
      { type: 'pendulum_trap', x: 42, y: 10, length: 80, swing: 44, speed: 1.7, phase: 0.5 },
      { type: 'crumble_platform', x: 14, y: 14, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 30, y: 10, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 44, y: 14, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crawler', x: 44, y: 17 },
      { type: 'flyer', x: 14, y: 6 },
      { type: 'flyer', x: 27, y: 3 },
      { type: 'flyer', x: 44, y: 6 },
      { type: 'flyer', x: 20, y: 10 },
      { type: 'flyer', x: 38, y: 8 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 26, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 50, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 38, y: 1 },
      { type: 'chain', x: 50, y: 1 },
      { type: 'ruin_arch', x: 12, y: f },
      { type: 'ruin_arch', x: 30, y: f },
      { type: 'ruin_arch', x: 46, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 32, y: 4 },
      { type: 'glow_spore', x: 48, y: 6 },
      { type: 'mud_patch', x: 6, y: f },
      { type: 'mud_patch', x: 34, y: f },
      { type: 'gravel_patch', x: 20, y: f },
      { type: 'gravel_patch', x: 44, y: f },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 28, y: 2, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 44, y: 4, w: 8, h: 8 },
      { type: 'cb_rune_mark', x: 12, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 46, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'warm', alpha: 0.16, scale: 1.3 },
        { x: 28, y: 0, angle: 5, key: 'warm', alpha: 0.14, scale: 1.1 },
        { x: 46, y: 0, angle: -10, key: 'warm', alpha: 0.15, scale: 1.2 }
      ],
      ambientColor: 0xff5522,
      ambientAlpha: 0.05,
    },
    ambience: 'tunnel_guardian',
  };
}

function buildRoom17() {
  const W = 44, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Lava pits near old pillar footings
  clearRect(tiles, H - 2, 13, H - 2, 16);
  clearRect(tiles, H - 2, W - 17, H - 2, W - 14);

  // ── Lower band: staggered row-20 islands ──
  fillRow(tiles, 20, 5, 9, 2);
  fillRow(tiles, 20, 11, 15, 2);
  fillRow(tiles, 20, 18, 23, 2);
  fillRow(tiles, 20, 28, 33, 2);
  fillRow(tiles, 20, 35, 39, 2);

  // Row 18: side catwalks only — mid gap so you cannot elevator straight up the middle
  fillRow(tiles, 18, 3, 12, 2);
  fillRow(tiles, 18, 32, 42, 2);

  // Row 17: short side shelves + one centre ledge (rest stop / brute arena)
  fillRow(tiles, 17, 7, 12, 2);
  fillRow(tiles, 17, 19, 25, 2);
  fillRow(tiles, 17, 32, 37, 2);

  // ── Zigzag climb: 2-row vertical gaps, alternating L/R (row-17 centre shelf is the landing between 19↔15) ──
  fillRow(tiles, 19, 14, 18, 2);
  fillRow(tiles, 15, 12, 16, 2);
  fillRow(tiles, 13, 20, 24, 2);
  fillRow(tiles, 11, 14, 18, 2);
  fillRow(tiles, 9, 19, 23, 2);
  fillRow(tiles, 7, 16, 20, 2);
  // Bench landing (open vault above — was sealed by row-5 ceiling slab)
  fillRow(tiles, 6, 15, 29, 2);

  // Mid-air crumbs: link side shelves to centre without a full runway (still tricky)
  fillRow(tiles, 16, 13, 16, 2);
  fillRow(tiles, 16, 28, 28, 2);

  // Light interior ribs — break sightlines without sealing the climb
  fillRect(tiles, 12, 8, 14, 8, 1);
  fillRect(tiles, 12, 36, 14, 36, 1);
  fillRect(tiles, 15, 11, 15, 13, 1);
  fillRect(tiles, 15, 31, 15, 33, 1);

  // Vaulted ceiling: only side lintels — wide open centre (cols ~12–32) through rows 2–5
  fillRect(tiles, 2, 4, 5, 11, 1);
  fillRect(tiles, 2, 33, 5, W - 5, 1);

  // Floor nubs
  fillRect(tiles, f, 10, f + 1, 11, 1);
  fillRect(tiles, f, W - 12, f + 1, W - 11, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Inferno Guardian',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room16', x: 1, y: f, spawnX: 52, spawnY: 19 },
      { type: 'door', targetRoom: 'room18', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'bench', x: 22, y: 6 },
      { type: 'brute', x: 16, y: f },
      { type: 'brute', x: 28, y: f },
      { type: 'brute', x: 21, y: 16 },
      { type: 'pendulum_trap', x: 22, y: 5, length: 80, swing: 48, speed: 1.9, phase: 0 },
      { type: 'pendulum_trap', x: 14, y: 9, length: 72, swing: 42, speed: 1.7, phase: 1.2 },
      { type: 'pendulum_trap', x: 30, y: 9, length: 72, swing: 42, speed: 1.7, phase: 0.6 },
      { type: 'moving_platform', x: 22, y: 10, axis: 'x', range: 120, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 11, y: 11, axis: 'y', range: 96, speed: 1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: W - 12, y: 11, axis: 'y', range: 96, speed: 1, phase: 1.5, spin: 0 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 22, y: 1 },
      { type: 'stalactite', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 28, y: 1 },
      { type: 'stalactite_sm', x: 38, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 20, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'chain', x: 36, y: 1 },
      { type: 'ruin_arch', x: 16, y: f },
      { type: 'ruin_arch', x: 28, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 22, y: 3 },
      { type: 'glow_spore', x: 30, y: 6 },
      { type: 'hanging_moss', x: 20, y: 2 },
      { type: 'hanging_moss', x: 26, y: 2 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 16, h: 14 },
      { type: 'cb_detail_bricks', x: 26, y: 2, w: 14, h: 14 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 22, y: 10 },
      { type: 'cb_rune_mark', x: 34, y: 6 },
      { type: 'cb_rune_mark', x: 16, y: 16 },
      { type: 'cb_rune_mark', x: 28, y: 16 }
    ],
    lighting: {
      beams: [
        { x: 22, y: 0, angle: 0, key: 'warm', alpha: 0.18, scale: 1.8 },
        { x: 10, y: 0, angle: -12, key: 'warm', alpha: 0.12, scale: 1.2 },
        { x: 34, y: 0, angle: 12, key: 'warm', alpha: 0.12, scale: 1.2 }
      ],
      ambientColor: 0xff3322,
      ambientAlpha: 0.06,
    },
    locked: true,
    ambience: 'tunnel_guardian',
  };
}

// ═══════════════════════════════════════════════════════════════
//  SHADOW SANCTUM  (rooms 18–21)
// ═══════════════════════════════════════════════════════════════

function buildRoom18() {
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Shadow terrain bumps
  fillRect(tiles, 18, 8, 19, 11, 1);
  fillRect(tiles, 17, 24, 19, 27, 1);
  fillRect(tiles, 18, 38, 19, 41, 1);

  // Shadow pits in floor
  clearRect(tiles, H - 2, 14, H - 2, 18);
  clearRect(tiles, H - 2, 32, H - 2, 36);

  // Horizontal traversal platforms
  fillRow(tiles, 16, 4, 9, 2);
  fillRow(tiles, 14, 12, 17, 2);
  fillRow(tiles, 12, 6, 10, 2);
  fillRow(tiles, 16, 20, 26, 2);
  fillRow(tiles, 14, 28, 33, 2);
  fillRow(tiles, 12, 22, 27, 2);
  fillRow(tiles, 10, 30, 35, 2);
  fillRow(tiles, 16, 38, 43, 2);
  fillRow(tiles, 14, 44, 47, 2);
  fillRow(tiles, 8, 16, 20, 2);
  fillRow(tiles, 8, 36, 40, 2);

  setTile(tiles, f, 4, 3);
  setTile(tiles, 18, 5, 3);

  // Shadow pillars
  fillRect(tiles, 5, 14, 12, 15, 1);
  fillRect(tiles, 5, 34, 12, 35, 1);

  // Ceiling bands
  fillRect(tiles, 2, 6, 5, 22, 1);
  fillRect(tiles, 2, 28, 5, 46, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Shadow Gate',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'weapon_pickup', weaponId: 'warden_greatsword', x: 12, y: 16 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 42, y: 10 },
      { type: 'door', targetRoom: 'room17', x: 1, y: f, spawnX: 41, spawnY: 21 },
      { type: 'door', targetRoom: 'room19', x: W - 2, y: f, spawnX: 2, spawnY: 4 },
      { type: 'bench', x: 24, y: 11 },
      { type: 'npc', npcType: 'spirit', x: 10, y: 17, dialogue: [
        'You have crossed from the burning halls into the Shadow Sanctum. Few mortals tread this far.',
        'This place exists between worlds — not quite alive, not quite dead. The shadows here remember the kingdom that was.',
        'The Bone Tyrant\'s reach extends even here, but his grip is weaker. The shadows obey older laws.',
        'Be wary of the Phantom Corridors ahead. They shift and twist. Trust your instincts over your eyes.',
        'If you survive the Sanctum, you will find paths to older, stranger places. Places even the Tyrant fears.'
      ]},
      { type: 'coin', x: 8, y: 11 },
      { type: 'coin', x: 26, y: 11 },
      { type: 'coin', x: 42, y: 13 },
      { type: 'coin', x: 18, y: 7 },
      { type: 'crawler', x: 12, y: f },
      { type: 'crawler', x: 30, y: f },
      { type: 'crawler', x: 44, y: f },
      { type: 'flyer', x: 16, y: 6 },
      { type: 'flyer', x: 28, y: 6 },
      { type: 'flyer', x: 42, y: 6 },
      { type: 'moving_platform', x: 16, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 34, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'pendulum_trap', x: 22, y: 10, length: 72, swing: 42, speed: 1.6, phase: 0 },
      { type: 'crumble_platform', x: 20, y: 14, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 40, y: 16, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 26, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 46, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 38, y: 1 },
      { type: 'chain', x: 48, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 44, y: 6 },
      { type: 'ruin_arch', x: 12, y: f },
      { type: 'ruin_arch', x: 32, y: f },
      { type: 'hanging_moss', x: 20, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
      { type: 'gravel_patch', x: 6, y: f },
      { type: 'gravel_patch', x: 28, y: f },
      { type: 'mud_patch', x: 20, y: f },
      { type: 'mud_patch', x: 44, y: f },
      { type: 'floor_spikes', x: 14, y: 19, onTime: 900, offTime: 1400, phase: 0 },
      { type: 'floor_spikes', x: 28, y: 19, onTime: 900, offTime: 1400, phase: 350 },
      { type: 'floor_spikes', x: 42, y: 19, onTime: 900, offTime: 1400, phase: 700 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 28, y: 2, w: 12, h: 8 },
      { type: 'cb_rune_mark', x: 12, y: 8 },
      { type: 'cb_rune_mark', x: 30, y: 6 },
      { type: 'cb_rune_mark', x: 44, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'cool', alpha: 0.10, scale: 1.2 },
        { x: 28, y: 0, angle: 5, key: 'cool', alpha: 0.08, scale: 1.0 },
        { x: 44, y: 0, angle: -6, key: 'cool', alpha: 0.10, scale: 1.1 }
      ],
      ambientColor: 0x443366,
      ambientAlpha: 0.06,
    },
    ambience: 'tunnel',
  };
}

function buildRoom19() {
  const W = 24, H = 30;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Bottom floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Descending zigzag platforms — pendulum gauntlet
  fillRow(tiles, 4, 3, 8, 2);
  fillRow(tiles, 6, 14, 20, 2);
  fillRow(tiles, 8, 3, 9, 2);
  fillRow(tiles, 10, 12, 18, 2);
  fillRow(tiles, 12, 4, 10, 2);
  fillRow(tiles, 14, 14, 20, 2);
  fillRow(tiles, 16, 3, 9, 2);
  fillRow(tiles, 18, 12, 18, 2);
  fillRow(tiles, 20, 4, 10, 2);
  fillRow(tiles, 22, 14, 20, 2);
  fillRow(tiles, 24, 3, 8, 2);
  fillRow(tiles, 26, 14, 20, 2);

  // Wall columns for wall-sliding
  fillRect(tiles, 8, 10, 16, 11, 1);
  fillRect(tiles, 18, 10, 24, 11, 1);

  // Phantom ceiling
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 3, 3, 8);
  clearRect(tiles, 3, 14, 3, 20);

  // Terrain bumps at bottom
  fillRect(tiles, 26, 4, 27, 6, 1);

  // Door openings
  clearRect(tiles, 3, 0, 5, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Frost Warden Arena',
    locked: true,
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 5, y: 3 },
    objects: [
      { type: 'door', targetRoom: 'room18', x: 1, y: 4, spawnX: 47, spawnY: 19 },
      { type: 'door', targetRoom: 'room20', x: W - 2, y: f, spawnX: 2, spawnY: 19 },
      { type: 'coin', x: 16, y: 9 },
      { type: 'coin', x: 6, y: 15 },
      { type: 'coin', x: 18, y: 21 },
      { type: 'pendulum_trap', x: 8, y: 26, length: 56, swing: 36, speed: 1.8, phase: 0.5 },
      { type: 'flyer', x: 12, y: 8 },
      { type: 'flyer', x: 8, y: 14 },
      { type: 'flyer', x: 16, y: 20 },
      { type: 'flyer', x: 5, y: 23 },
      { type: 'moving_platform', x: 12, y: 12, axis: 'x', range: 64, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 12, y: 20, axis: 'x', range: 64, speed: 1.0, phase: 1.0, spin: 0 },
      { type: 'crumble_platform', x: 14, y: 10, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 6, y: 16, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 16, y: 22, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'stalactite', x: 6, y: 1 },
      { type: 'stalactite', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 3, y: 1 },
      { type: 'stalactite_sm', x: 12, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 18, y: 1 },
      { type: 'glow_spore', x: 6, y: 8 },
      { type: 'glow_spore', x: 16, y: 16 },
      { type: 'glow_spore', x: 8, y: 24 },
      { type: 'vine', x: 4, y: 1 },
      { type: 'vine', x: 14, y: 1 },
      { type: 'boss', bossType: 'frost_warden', x: 12, y: 26 },
      { type: 'ice_patch', x: 8, y: 28, width: 3 },
      { type: 'ice_patch', x: 16, y: 28, width: 3 },
      { type: 'icicle_drop', x: 10, y: 3 },
      { type: 'icicle_drop', x: 14, y: 3 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 14, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 8, h: 12 },
      { type: 'cb_detail_bricks', x: 12, y: 14, w: 8, h: 10 },
      { type: 'cb_rune_mark', x: 6, y: 8 },
      { type: 'cb_rune_mark', x: 16, y: 18 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 14, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: 0, key: 'cool', alpha: 0.08, scale: 1.4 },
        { x: 6, y: 0, angle: -6, key: 'cool', alpha: 0.06, scale: 0.9 },
        { x: 18, y: 0, angle: 6, key: 'cool', alpha: 0.06, scale: 0.9 }
      ],
      ambientColor: 0x332255,
      ambientAlpha: 0.07,
    },
    ambience: 'tunnel_crystal',
  };
}

function buildRoom20() {
  const W = 55, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Floor with spectral gaps
  clearRect(tiles, H - 2, 14, H - 2, 18);
  clearRect(tiles, H - 2, 30, H - 2, 34);
  clearRect(tiles, H - 2, 42, H - 2, 46);

  // Terrain bumps
  fillRect(tiles, 18, 6, 19, 9, 1);
  fillRect(tiles, 17, 22, 19, 24, 1);
  fillRect(tiles, 18, 48, 19, 51, 1);

  // Multi-tier platforms — wide nave layout
  fillRow(tiles, 16, 4, 9, 2);
  fillRow(tiles, 14, 12, 17, 2);
  fillRow(tiles, 12, 6, 10, 2);
  fillRow(tiles, 16, 20, 26, 2);
  fillRow(tiles, 14, 28, 33, 2);
  fillRow(tiles, 12, 22, 28, 2);
  fillRow(tiles, 10, 32, 38, 2);
  fillRow(tiles, 16, 36, 41, 2);
  fillRow(tiles, 14, 44, 50, 2);
  fillRow(tiles, 10, 44, 48, 2);
  fillRow(tiles, 8, 16, 20, 2);
  fillRow(tiles, 8, 38, 42, 2);
  fillRow(tiles, 6, 26, 30, 2);

  // Spectral pillars
  fillRect(tiles, 5, 12, 12, 13, 1);
  fillRect(tiles, 5, 40, 12, 41, 1);

  // Nave ceiling arches
  fillRect(tiles, 2, 6, 5, 22, 1);
  fillRect(tiles, 2, 28, 5, 48, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Spectral Nave',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room19', x: 1, y: f, spawnX: 21, spawnY: 27 },
      { type: 'door', targetRoom: 'room21', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'merchant_shop', x: 36, y: 9, items: [
        { name: 'Health Refill', cost: 5, type: 'heal' },
        { name: 'Max HP +1', cost: 20, type: 'maxhp' }
      ], dialogue: [
        'Shadows make fine customers — they never haggle. You, however, look like the haggling type.',
        'Coin for health, coin for power. Spend wisely — the Shadow Warden ahead does not forgive mistakes.'
      ]},
      { type: 'coin', x: 8, y: 11 },
      { type: 'coin', x: 18, y: 7 },
      { type: 'coin', x: 34, y: 9 },
      { type: 'coin', x: 46, y: 9 },
      { type: 'coin', x: 28, y: 5 },
      { type: 'crawler', x: 10, y: f },
      { type: 'crawler', x: 30, y: 13 },
      { type: 'crawler', x: 47, y: 18 },
      { type: 'flyer', x: 16, y: 6 },
      { type: 'flyer', x: 31, y: 6 },
      { type: 'flyer', x: 46, y: 8 },
      { type: 'moving_platform', x: 16, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 44, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 0.5, spin: 0 },
      { type: 'pendulum_trap', x: 22, y: 10, length: 72, swing: 42, speed: 1.6, phase: 0 },
      { type: 'pendulum_trap', x: 38, y: 8, length: 64, swing: 38, speed: 1.8, phase: 1.2 },
      { type: 'crumble_platform', x: 14, y: 14, collapseDelay: 420, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 34, y: 10, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 26, y: 1 },
      { type: 'stalactite', x: 44, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 36, y: 1 },
      { type: 'stalactite_sm', x: 50, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 38, y: 1 },
      { type: 'chain', x: 50, y: 1 },
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 22, y: f },
      { type: 'crystal', x: 38, y: f },
      { type: 'crystal_cluster', x: 12, y: f },
      { type: 'crystal_cluster', x: 34, y: f },
      { type: 'crystal_cluster', x: 50, y: f },
      { type: 'light_beam', x: 16, y: 1 },
      { type: 'light_beam', x: 32, y: 1 },
      { type: 'light_beam', x: 48, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 46, y: 6 },
      { type: 'ruin_arch', x: 10, y: f },
      { type: 'ruin_arch', x: 34, y: f },
      { type: 'hanging_moss', x: 18, y: 2 },
      { type: 'hanging_moss', x: 38, y: 2 },
      { type: 'floor_spikes', x: 50, y: 19, onTime: 800, offTime: 1200, phase: 900 },
      { type: 'lore_fragment', x: 22, y: 19, text: "A hymnal of the Spectral Order — their chants still echo in the vaults." },
      { type: 'health_pickup', x: 11, y: 19 },
      { type: 'health_pickup', x: 12, y: 19 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 24, y: 2, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 44, y: 4, w: 8, h: 8 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 46, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'cool', alpha: 0.10, scale: 1.3 },
        { x: 28, y: 0, angle: 5, key: 'cool', alpha: 0.08, scale: 1.0 },
        { x: 46, y: 0, angle: -6, key: 'cool', alpha: 0.10, scale: 1.2 }
      ],
      ambientColor: 0x553388,
      ambientAlpha: 0.055,
    },
    ambience: 'tunnel',
  };
}

function buildRoom21() {
  const W = 44, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Raised side platforms
  fillRow(tiles, 18, 3, 8, 2);
  fillRow(tiles, 18, W - 9, W - 4, 2);
  fillRow(tiles, 14, 4, 10, 2);
  fillRow(tiles, 14, W - 11, W - 5, 2);
  fillRow(tiles, 10, 6, 10, 2);
  fillRow(tiles, 10, W - 11, W - 7, 2);

  // Central platforms
  fillRow(tiles, 16, 16, 28, 2);
  fillRow(tiles, 12, 18, 26, 2);
  fillRow(tiles, 8, 20, 24, 2);

  // Shadow arena pillars
  fillRect(tiles, 4, 12, 16, 12, 1);
  fillRect(tiles, 4, W - 13, 16, W - 13, 1);

  // Vaulted ceiling
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 18, 4, 26);

  // Shadow pits near pillars
  clearRect(tiles, H - 2, 13, H - 2, 16);
  clearRect(tiles, H - 2, W - 17, H - 2, W - 14);

  // Terrain bumps
  fillRect(tiles, f, 10, f + 1, 11, 1);
  fillRect(tiles, f, W - 12, f + 1, W - 11, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Shadow Warden',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room20', x: 1, y: f, spawnX: 52, spawnY: 19 },
      { type: 'door', targetRoom: 'room22', x: W - 2, y: f, spawnX: 2, spawnY: 19 },
      { type: 'bench', x: 5, y: f },
      { type: 'brute', x: 16, y: f },
      { type: 'brute', x: 28, y: f },
      { type: 'flyer', x: 28, y: 10 },
      { type: 'pendulum_trap', x: 22, y: 6, length: 80, swing: 48, speed: 1.9, phase: 0 },
      { type: 'pendulum_trap', x: 14, y: 10, length: 72, swing: 42, speed: 1.7, phase: 1.2 },
      { type: 'pendulum_trap', x: 30, y: 10, length: 72, swing: 42, speed: 1.7, phase: 0.6 },
      { type: 'moving_platform', x: 22, y: 10, axis: 'x', range: 160, speed: 1.3, phase: 0, spin: 0 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 22, y: 1 },
      { type: 'stalactite', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 28, y: 1 },
      { type: 'stalactite_sm', x: 38, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 20, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'chain', x: 36, y: 1 },
      { type: 'ruin_arch', x: 16, y: f },
      { type: 'ruin_arch', x: 28, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 22, y: 3 },
      { type: 'glow_spore', x: 30, y: 6 },
      { type: 'hanging_moss', x: 20, y: 2 },
      { type: 'hanging_moss', x: 26, y: 2 },
      { type: 'saw_blade', x: 10, y: 16, axis: 'x', range: 80, speed: 1.3, phase: 1.0 },
      { type: 'floor_spikes', x: 8, y: 21, onTime: 800, offTime: 1200, phase: 0 },
      { type: 'floor_spikes', x: 20, y: 21, onTime: 800, offTime: 1200, phase: 400 },
      { type: 'floor_spikes', x: 34, y: 21, onTime: 800, offTime: 1200, phase: 800 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 16, h: 14 },
      { type: 'cb_detail_bricks', x: 26, y: 2, w: 14, h: 14 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 22, y: 10 },
      { type: 'cb_rune_mark', x: 34, y: 6 },
      { type: 'cb_rune_mark', x: 16, y: 16 },
      { type: 'cb_rune_mark', x: 28, y: 16 }
    ],
    lighting: {
      beams: [
        { x: 22, y: 0, angle: 0, key: 'cool', alpha: 0.12, scale: 1.6 },
        { x: 10, y: 0, angle: -12, key: 'cool', alpha: 0.08, scale: 1.0 },
        { x: 34, y: 0, angle: 12, key: 'cool', alpha: 0.08, scale: 1.0 }
      ],
      ambientColor: 0x442266,
      ambientAlpha: 0.065,
    },
    locked: true,
    ambience: 'tunnel',
  };
}

// ═══════════════════════════════════════════════════════════════
//  ANCIENT LIBRARY  (rooms 22–25)
// ═══════════════════════════════════════════════════════════════

function buildRoom22() {
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Broken bridge gaps in floor
  clearRect(tiles, H - 2, 12, H - 2, 16);
  clearRect(tiles, H - 2, 28, H - 2, 32);

  // Terrain bumps — rubble piles
  fillRect(tiles, 18, 6, 19, 9, 1);
  fillRect(tiles, 17, 20, 19, 23, 1);
  fillRect(tiles, 18, 36, 19, 39, 1);

  // Horizontal platforms — archive shelves
  fillRow(tiles, 16, 4, 9, 2);
  fillRow(tiles, 14, 12, 16, 2);
  fillRow(tiles, 12, 4, 8, 2);
  fillRow(tiles, 16, 18, 24, 2);
  fillRow(tiles, 14, 26, 32, 2);
  fillRow(tiles, 12, 20, 26, 2);
  fillRow(tiles, 10, 28, 34, 2);
  fillRow(tiles, 16, 34, 40, 2);
  fillRow(tiles, 14, 42, 47, 2);
  fillRow(tiles, 10, 40, 44, 2);
  fillRow(tiles, 8, 14, 18, 2);
  fillRow(tiles, 8, 34, 38, 2);

  setTile(tiles, f, 4, 3);
  setTile(tiles, 18, 5, 3);

  // Archive pillars
  fillRect(tiles, 5, 10, 12, 11, 1);
  fillRect(tiles, 5, 34, 12, 35, 1);

  // Ceiling — crumbling stone
  fillRect(tiles, 2, 6, 5, 20, 1);
  fillRect(tiles, 2, 26, 5, 44, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Ruined Archives',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room21', x: 1, y: f, spawnX: 41, spawnY: 21 },
      { type: 'door', targetRoom: 'room23', x: W - 2, y: f, spawnX: 2, spawnY: 29 },
      { type: 'npc', npcType: 'hermit', x: 10, y: 17, dialogue: [
        'Welcome to the Ruined Archives. Or what remains of them.',
        'These shelves once held every text ever written in the kingdom of Ur-Karath. Treaties, poems, histories — all of it.',
        'When the Bone Tyrant turned, the scholars tried to preserve what they could. They failed. The knowledge rotted with the rest.',
        'But fragments remain. The walls themselves hold echoes of what was written here. If you listen closely, you can almost hear the words.',
        'The Scholar\'s Tower above still stands, mostly. If you can reach the top, you may find something worth the climb.'
      ]},
      { type: 'coin', x: 8, y: 11 },
      { type: 'coin', x: 22, y: 11 },
      { type: 'coin', x: 38, y: 7 },
      { type: 'coin', x: 16, y: 7 },
      { type: 'spitter', x: 14, y: 17 },
      { type: 'crawler', x: 30, y: 13 },
      { type: 'crawler', x: 44, y: f },
      { type: 'flyer', x: 16, y: 6 },
      { type: 'flyer', x: 28, y: 6 },
      { type: 'flyer', x: 44, y: 8 },
      { type: 'moving_platform', x: 14, y: 18, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'pendulum_trap', x: 20, y: 10, length: 72, swing: 40, speed: 1.5, phase: 0 },
      { type: 'crumble_platform', x: 14, y: 14, collapseDelay: 450, respawnDelay: 2800 },
      { type: 'crumble_platform', x: 36, y: 10, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'fungus', x: 3, y: f },
      { type: 'fungus', x: 18, y: f },
      { type: 'fungus', x: 34, y: f },
      { type: 'fungus', x: 46, y: f },
      { type: 'fungus_small', x: 10, y: f },
      { type: 'fungus_small', x: 26, y: f },
      { type: 'fungus_small', x: 42, y: f },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 24, y: 1 },
      { type: 'stalactite', x: 40, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 32, y: 1 },
      { type: 'stalactite_sm', x: 46, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 38, y: 1 },
      { type: 'vine', x: 14, y: 1 },
      { type: 'vine', x: 30, y: 1 },
      { type: 'vine', x: 44, y: 1 },
      { type: 'glow_spore', x: 12, y: 6 },
      { type: 'glow_spore', x: 28, y: 4 },
      { type: 'glow_spore', x: 42, y: 6 },
      { type: 'ruin_arch', x: 10, y: f },
      { type: 'ruin_arch', x: 30, y: f },
      { type: 'hanging_moss', x: 16, y: 2 },
      { type: 'hanging_moss', x: 34, y: 2 },
      { type: 'gravel_patch', x: 6, y: f },
      { type: 'gravel_patch', x: 26, y: f },
      { type: 'mud_patch', x: 16, y: f },
      { type: 'mud_patch', x: 40, y: f },
      { type: 'floor_spikes', x: 12, y: 19, onTime: 700, offTime: 1200, phase: 0 },
      { type: 'floor_spikes', x: 26, y: 19, onTime: 700, offTime: 1200, phase: 350 },
      { type: 'floor_spikes', x: 42, y: 19, onTime: 700, offTime: 1200, phase: 700 },
      { type: 'secret_wall', x: 44, y: 17, hitsToBreak: 2, targetRoom: 'sanctuary2', spawnX: 3, spawnY: 14 },
      { type: 'lore_fragment', x: 45, y: 17, text: 'A scholar\'s confession: "We called it Void. It called us first." ' },
      { type: 'health_pickup', x: 46, y: 17 },
      { type: 'fungal_bloom_large', x: 8, y: 17 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_mushroom_large', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 26, y: 2, w: 14, h: 10 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 4 },
      { type: 'cb_detail_roots', x: 32, y: 1, count: 3 },
      { type: 'cb_rune_mark', x: 12, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 44, y: 8 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: -6, key: 'warm', alpha: 0.12, scale: 1.2 },
        { x: 26, y: 0, angle: 5, key: 'warm', alpha: 0.10, scale: 1.0 },
        { x: 42, y: 0, angle: -8, key: 'warm', alpha: 0.11, scale: 1.1 }
      ],
      ambientColor: 0x66aa44,
      ambientAlpha: 0.045,
    },
    ambience: 'tunnel_fungal',
  };
}

function buildRoom23() {
  const W = 24, H = 32;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Bottom floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Ascending zigzag — wall-jump required for some shortcuts
  fillRow(tiles, 28, 3, 8, 2);
  fillRow(tiles, 26, 14, 20, 2);
  fillRow(tiles, 24, 3, 9, 2);
  fillRow(tiles, 22, 13, 19, 2);
  fillRow(tiles, 20, 4, 10, 2);
  fillRow(tiles, 18, 14, 20, 2);
  fillRow(tiles, 16, 3, 8, 2);
  fillRow(tiles, 14, 12, 18, 2);
  fillRow(tiles, 12, 4, 10, 2);
  fillRow(tiles, 10, 14, 20, 2);
  fillRow(tiles, 8, 3, 8, 2);
  fillRow(tiles, 6, 14, 20, 2);
  fillRow(tiles, 4, 16, 22, 2);

  // Wall columns for wall-jumping
  fillRect(tiles, 12, 10, 22, 11, 1);
  fillRect(tiles, 6, 10, 12, 11, 1);

  // Tower ceiling
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 10, 3, 14);
  clearRect(tiles, 3, 16, 3, 22);

  // Terrain bump
  fillRect(tiles, 28, 16, 29, 18, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 5, W - 1);

  return {
    name: 'Scholar\'s Tower',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room22', x: 1, y: f, spawnX: 47, spawnY: 19 },
      { type: 'door', targetRoom: 'room24', x: W - 2, y: 4, spawnX: 2, spawnY: 19 },
      { type: 'coin', x: 16, y: 25 },
      { type: 'coin', x: 6, y: 15 },
      { type: 'coin', x: 18, y: 9 },
      { type: 'crumble_platform', x: 16, y: 26, collapseDelay: 450, respawnDelay: 2800 },
      { type: 'crumble_platform', x: 6, y: 20, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 16, y: 14, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 6, y: 8, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'flyer', x: 12, y: 22 },
      { type: 'flyer', x: 7, y: 15 },
      { type: 'flyer', x: 15, y: 9 },
      { type: 'flyer', x: 6, y: 6 },
      { type: 'pendulum_trap', x: 12, y: 18, length: 64, swing: 38, speed: 1.6, phase: 0 },
      { type: 'pendulum_trap', x: 12, y: 10, length: 56, swing: 36, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 12, y: 24, axis: 'x', range: 64, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 12, y: 14, axis: 'x', range: 64, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'fungus', x: 4, y: f },
      { type: 'fungus', x: 16, y: f },
      { type: 'fungus_small', x: 8, y: f },
      { type: 'fungus_small', x: 20, y: f },
      { type: 'stalactite', x: 6, y: 1 },
      { type: 'stalactite', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 3, y: 1 },
      { type: 'stalactite_sm', x: 12, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 18, y: 1 },
      { type: 'vine', x: 4, y: 1 },
      { type: 'vine', x: 14, y: 1 },
      { type: 'glow_spore', x: 6, y: 10 },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 10, y: 18 },
    ],
    foreground: [
      { type: 'fg_mushroom_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 16, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 8, h: 12 },
      { type: 'cb_detail_bricks', x: 12, y: 16, w: 8, h: 10 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 14, y: 1, count: 2 },
      { type: 'cb_rune_mark', x: 6, y: 8 },
      { type: 'cb_rune_mark', x: 16, y: 20 }
    ],
    lighting: {
      beams: [
        { x: 12, y: 0, angle: 0, key: 'warm', alpha: 0.12, scale: 1.4 },
        { x: 6, y: 0, angle: -6, key: 'warm', alpha: 0.08, scale: 0.9 },
        { x: 18, y: 0, angle: 6, key: 'warm', alpha: 0.08, scale: 0.9 }
      ],
      ambientColor: 0x558833,
      ambientAlpha: 0.045,
    },
    ambience: 'tunnel_fungal',
  };
}

function buildRoom24() {
  const W = 55, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Floor with gaps — collapsed stacks
  clearRect(tiles, H - 2, 10, H - 2, 14);
  clearRect(tiles, H - 2, 24, H - 2, 28);
  clearRect(tiles, H - 2, 38, H - 2, 42);

  // Terrain bumps
  fillRect(tiles, 18, 4, 19, 7, 1);
  fillRect(tiles, 17, 18, 19, 21, 1);
  fillRect(tiles, 18, 44, 19, 47, 1);

  // Dense platform layout — heavy platforming challenge
  fillRow(tiles, 16, 4, 8, 2);
  fillRow(tiles, 14, 10, 14, 2);
  fillRow(tiles, 12, 4, 8, 2);
  fillRow(tiles, 10, 10, 14, 2);
  fillRow(tiles, 16, 16, 22, 2);
  fillRow(tiles, 14, 24, 28, 2);
  fillRow(tiles, 12, 18, 24, 2);
  fillRow(tiles, 10, 26, 32, 2);
  fillRow(tiles, 8, 20, 24, 2);
  fillRow(tiles, 16, 30, 36, 2);
  fillRow(tiles, 14, 38, 42, 2);
  fillRow(tiles, 12, 32, 38, 2);
  fillRow(tiles, 10, 40, 46, 2);
  fillRow(tiles, 8, 34, 38, 2);
  fillRow(tiles, 16, 44, 50, 2);
  fillRow(tiles, 6, 26, 30, 2);
  fillRow(tiles, 8, 46, 50, 2);

  // Library pillars
  fillRect(tiles, 4, 8, 12, 9, 1);
  fillRect(tiles, 4, 30, 12, 31, 1);
  fillRect(tiles, 4, 46, 12, 47, 1);

  // Ceiling — vaulted archive roof
  fillRect(tiles, 2, 4, 5, 18, 1);
  fillRect(tiles, 2, 22, 5, 40, 1);
  fillRect(tiles, 2, 44, 5, 52, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Forbidden Stacks',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room23', x: 1, y: f, spawnX: 21, spawnY: 4 },
      { type: 'door', targetRoom: 'room25', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'merchant_shop', x: 28, y: 5, items: [
        { name: 'Health Refill', cost: 5, type: 'heal' },
        { name: 'Max HP +1', cost: 25, type: 'maxhp' }
      ], dialogue: [
        'They say forbidden knowledge has a price. So does forbidden merchandise, apparently.',
        'Stock up while you can. The Archive Sentinel does not appreciate browsing without buying.'
      ]},
      { type: 'coin', x: 6, y: 11 },
      { type: 'coin', x: 22, y: 7 },
      { type: 'coin', x: 36, y: 7 },
      { type: 'coin', x: 48, y: 7 },
      { type: 'coin', x: 14, y: 9 },
      { type: 'crawler', x: 50, y: f },
      { type: 'armored_flyer', x: 28, y: 9 },
      { type: 'flyer', x: 25, y: 6 },
      { type: 'flyer', x: 42, y: 6 },
      { type: 'flyer', x: 18, y: 10 },
      { type: 'flyer', x: 37, y: 7 },
      { type: 'moving_platform', x: 12, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 26, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 40, y: 18, axis: 'x', range: 96, speed: 1.3, phase: 0.5, spin: 0 },
      { type: 'pendulum_trap', x: 48, y: 6, length: 64, swing: 38, speed: 1.9, phase: 0.5 },
      { type: 'crumble_platform', x: 12, y: 14, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 26, y: 12, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 42, y: 14, collapseDelay: 400, respawnDelay: 2600 },
      { type: 'crumble_platform', x: 34, y: 10, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'fungus', x: 4, y: f },
      { type: 'fungus', x: 22, y: f },
      { type: 'fungus', x: 36, y: f },
      { type: 'fungus', x: 50, y: f },
      { type: 'fungus_small', x: 10, y: f },
      { type: 'fungus_small', x: 30, y: f },
      { type: 'fungus_small', x: 46, y: f },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 26, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 50, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 38, y: 1 },
      { type: 'chain', x: 50, y: 1 },
      { type: 'vine', x: 14, y: 1 },
      { type: 'vine', x: 30, y: 1 },
      { type: 'vine', x: 46, y: 1 },
      { type: 'light_beam', x: 12, y: 1 },
      { type: 'light_beam', x: 28, y: 1 },
      { type: 'light_beam', x: 44, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 46, y: 6 },
      { type: 'ruin_arch', x: 10, y: f },
      { type: 'ruin_arch', x: 32, y: f },
      { type: 'hanging_moss', x: 16, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
      { type: 'fungal_bloom_large', x: 40, y: 17 },
    ],
    foreground: [
      { type: 'fg_mushroom_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 12, h: 8 },
      { type: 'cb_detail_bricks', x: 24, y: 2, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 44, y: 4, w: 8, h: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 4 },
      { type: 'cb_detail_roots', x: 34, y: 1, count: 3 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 28, y: 6 },
      { type: 'cb_rune_mark', x: 46, y: 8 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'warm', alpha: 0.12, scale: 1.2 },
        { x: 28, y: 0, angle: 5, key: 'warm', alpha: 0.10, scale: 1.0 },
        { x: 46, y: 0, angle: -6, key: 'warm', alpha: 0.11, scale: 1.1 }
      ],
      ambientColor: 0x77aa55,
      ambientAlpha: 0.04,
    },
    ambience: 'tunnel_fungal',
  };
}

function buildRoom25() {
  const W = 44, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Raised side platforms
  fillRow(tiles, 18, 3, 8, 2);
  fillRow(tiles, 18, W - 9, W - 4, 2);
  fillRow(tiles, 14, 4, 10, 2);
  fillRow(tiles, 14, W - 11, W - 5, 2);
  fillRow(tiles, 10, 6, 10, 2);
  fillRow(tiles, 10, W - 11, W - 7, 2);

  // Central platforms
  fillRow(tiles, 16, 16, 28, 2);
  fillRow(tiles, 12, 18, 26, 2);
  fillRow(tiles, 8, 20, 24, 2);

  // Archive sentinels — pillars
  fillRect(tiles, 4, 12, 16, 12, 1);
  fillRect(tiles, 4, W - 13, 16, W - 13, 1);

  // Vaulted ceiling
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 18, 4, 26);

  // Floor pits
  clearRect(tiles, H - 2, 13, H - 2, 16);
  clearRect(tiles, H - 2, W - 17, H - 2, W - 14);

  // Terrain bumps
  fillRect(tiles, f, 10, f + 1, 11, 1);
  fillRect(tiles, f, W - 12, f + 1, W - 11, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Archive Sentinel',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 8, y: 18 },
      { type: 'door', targetRoom: 'room24', x: 1, y: f, spawnX: 52, spawnY: 19 },
      { type: 'door', targetRoom: 'room26', x: W - 2, y: f, spawnX: 2, spawnY: 19 },
      { type: 'brute', x: 16, y: f },
      { type: 'brute', x: 28, y: f },
      { type: 'brute', x: 22, y: 15 },
      { type: 'pendulum_trap', x: 22, y: 6, length: 80, swing: 48, speed: 1.9, phase: 0 },
      { type: 'pendulum_trap', x: 14, y: 10, length: 72, swing: 42, speed: 1.7, phase: 1.2 },
      { type: 'pendulum_trap', x: 30, y: 10, length: 72, swing: 42, speed: 1.7, phase: 0.6 },
      { type: 'moving_platform', x: 22, y: 10, axis: 'x', range: 160, speed: 1.3, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 11, y: 9, axis: 'y', range: 128, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 30, y: 9, axis: 'y', range: 128, speed: 1.1, phase: 1.5, spin: 0 },
      { type: 'fungus', x: 4, y: f },
      { type: 'fungus', x: 18, y: f },
      { type: 'fungus', x: 34, y: f },
      { type: 'fungus_small', x: 10, y: f },
      { type: 'fungus_small', x: 26, y: f },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 22, y: 1 },
      { type: 'stalactite', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 16, y: 1 },
      { type: 'stalactite_sm', x: 28, y: 1 },
      { type: 'stalactite_sm', x: 38, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 20, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'chain', x: 36, y: 1 },
      { type: 'ruin_arch', x: 16, y: f },
      { type: 'ruin_arch', x: 28, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 22, y: 3 },
      { type: 'glow_spore', x: 30, y: 6 },
      { type: 'hanging_moss', x: 20, y: 2 },
      { type: 'hanging_moss', x: 26, y: 2 },
      { type: 'vine', x: 12, y: 2 },
      { type: 'vine', x: 32, y: 2 },
    ],
    foreground: [
      { type: 'fg_mushroom_large', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 16, h: 14 },
      { type: 'cb_detail_bricks', x: 26, y: 2, w: 14, h: 14 },
      { type: 'cb_detail_roots', x: 6, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 30, y: 1, count: 3 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 22, y: 10 },
      { type: 'cb_rune_mark', x: 34, y: 6 }
    ],
    lighting: {
      beams: [
        { x: 22, y: 0, angle: 0, key: 'warm', alpha: 0.14, scale: 1.6 },
        { x: 10, y: 0, angle: -10, key: 'warm', alpha: 0.08, scale: 1.0 },
        { x: 34, y: 0, angle: 10, key: 'warm', alpha: 0.08, scale: 1.0 }
      ],
      ambientColor: 0x669944,
      ambientAlpha: 0.055,
    },
    locked: true,
    ambience: 'tunnel_fungal',
  };
}

// ═══════════════════════════════════════════════════════════════
//  VOID NEXUS  (rooms 26–29)
// ═══════════════════════════════════════════════════════════════

function buildRoom26() {
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Hazardous floor — multiple gaps
  clearRect(tiles, H - 2, 10, H - 2, 14);
  clearRect(tiles, H - 2, 22, H - 2, 26);
  clearRect(tiles, H - 2, 34, H - 2, 38);

  // Terrain bumps
  fillRect(tiles, 18, 4, 19, 7, 1);
  fillRect(tiles, 17, 16, 19, 19, 1);
  fillRect(tiles, 18, 40, 19, 43, 1);

  // Horizontal gauntlet platforms
  fillRow(tiles, 16, 3, 8, 2);
  fillRow(tiles, 14, 10, 14, 2);
  fillRow(tiles, 12, 4, 8, 2);
  fillRow(tiles, 16, 16, 21, 2);
  fillRow(tiles, 14, 22, 26, 2);
  fillRow(tiles, 12, 16, 20, 2);
  fillRow(tiles, 10, 24, 30, 2);
  fillRow(tiles, 16, 28, 33, 2);
  fillRow(tiles, 14, 34, 38, 2);
  fillRow(tiles, 12, 30, 36, 2);
  fillRow(tiles, 16, 40, 46, 2);
  fillRow(tiles, 8, 12, 16, 2);
  fillRow(tiles, 8, 36, 40, 2);
  fillRow(tiles, 6, 22, 26, 2);

  // Void pillars
  fillRect(tiles, 4, 10, 12, 11, 1);
  fillRect(tiles, 4, 32, 12, 33, 1);

  // Ceiling
  fillRect(tiles, 2, 4, 5, 20, 1);
  fillRect(tiles, 2, 26, 5, 44, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Void Threshold',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room25', x: 1, y: f, spawnX: 41, spawnY: 21 },
      { type: 'door', targetRoom: 'room27', x: W - 2, y: f, spawnX: 2, spawnY: 29 },
      { type: 'npc', npcType: 'knight', x: 8, y: f, dialogue: [
        'Halt. I know that look — the look of someone who has come too far to turn back.',
        'Beyond this threshold lies the Void Nexus. It is not a place that belongs to our world.',
        'The Bone Tyrant tried to harness the Void\'s power. Instead, it consumed the deepest parts of his kingdom.',
        'The creatures here are not his subjects — they are something else entirely. Fragments of emptiness given form.',
        'I have stood watch here for... I cannot remember how long. If you enter the Nexus, there may be no return.',
        'But if you are strong enough to reach the Void King, you may end this curse once and for all. Go with whatever courage you have left.'
      ]},
      { type: 'coin', x: 6, y: 11 },
      { type: 'coin', x: 24, y: 5 },
      { type: 'coin', x: 38, y: 7 },
      { type: 'coin', x: 14, y: 7 },
      { type: 'crawler', x: 30, y: f },
      { type: 'crawler', x: 44, y: f },
      { type: 'flyer', x: 14, y: 6 },
      { type: 'flyer', x: 27, y: 6 },
      { type: 'flyer', x: 40, y: 6 },
      { type: 'flyer', x: 20, y: 10 },
      { type: 'pendulum_trap', x: 30, y: 8, length: 72, swing: 42, speed: 2.0, phase: 1.0 },
      { type: 'pendulum_trap', x: 42, y: 10, length: 80, swing: 44, speed: 1.8, phase: 0.5 },
      { type: 'moving_platform', x: 12, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 24, y: 18, axis: 'x', range: 96, speed: 1.3, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 18, axis: 'x', range: 96, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'crumble_platform', x: 14, y: 14, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 30, y: 12, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 42, y: 14, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 24, y: 1 },
      { type: 'stalactite', x: 40, y: 1 },
      { type: 'stalactite_sm', x: 4, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 32, y: 1 },
      { type: 'stalactite_sm', x: 46, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 36, y: 1 },
      { type: 'chain', x: 46, y: 1 },
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 20, y: f },
      { type: 'crystal', x: 42, y: f },
      { type: 'crystal_cluster', x: 14, y: f },
      { type: 'crystal_cluster', x: 30, y: f },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 28, y: 4 },
      { type: 'glow_spore', x: 42, y: 6 },
      { type: 'ruin_arch', x: 12, y: f },
      { type: 'ruin_arch', x: 34, y: f },
      { type: 'gravel_patch', x: 8, y: f },
      { type: 'gravel_patch', x: 28, y: f },
      { type: 'mud_patch', x: 18, y: f },
      { type: 'mud_patch', x: 44, y: f },
      { type: 'checkpoint_shrine', x: 6, y: 19 },
      { type: 'lore_fragment', x: 22, y: 19, text: "At the Void Threshold, reality thins. The King waits beyond." },
      { type: 'void_rift', x: 30, y: 12 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_crystal_large', x: 2, y: H - 1, flipX: false },
      { type: 'fg_rock_formation_sm', x: W - 4, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 4, w: 14, h: 10 },
      { type: 'cb_detail_bricks', x: 28, y: 2, w: 12, h: 8 },
      { type: 'cb_rune_mark', x: 10, y: 8 },
      { type: 'cb_rune_mark', x: 24, y: 6 },
      { type: 'cb_rune_mark', x: 42, y: 8 },
      { type: 'cb_detail_roots', x: 8, y: 1, count: 3 },
      { type: 'cb_detail_roots', x: 36, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 14, y: 0, angle: -8, key: 'cool', alpha: 0.12, scale: 1.2 },
        { x: 26, y: 0, angle: 5, key: 'cool', alpha: 0.10, scale: 1.0 },
        { x: 42, y: 0, angle: -10, key: 'cool', alpha: 0.12, scale: 1.2 }
      ],
      ambientColor: 0x6622aa,
      ambientAlpha: 0.06,
    },
    ambience: 'tunnel_guardian',
  };
}

function buildRoom27() {
  const W = 26, H = 32;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Bottom floor with lava center
  fillRect(tiles, H - 2, 1, H - 1, 6, 1);
  clearRect(tiles, H - 2, 7, H - 2, 18);
  fillRect(tiles, H - 2, 19, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 7, 18, 1);

  // Ascending zigzag — very difficult
  fillRow(tiles, 28, 3, 8, 2);
  fillRow(tiles, 26, 16, 22, 2);
  fillRow(tiles, 24, 4, 10, 2);
  fillRow(tiles, 22, 16, 22, 2);
  fillRow(tiles, 20, 3, 8, 2);
  fillRow(tiles, 18, 14, 20, 2);
  fillRow(tiles, 16, 4, 10, 2);
  fillRow(tiles, 14, 16, 22, 2);
  fillRow(tiles, 12, 3, 8, 2);
  fillRow(tiles, 10, 14, 20, 2);
  fillRow(tiles, 8, 4, 10, 2);
  fillRow(tiles, 6, 16, 22, 2);
  fillRow(tiles, 4, 10, 16, 2);

  // Wall columns — wall-jump mandatory
  fillRect(tiles, 10, 11, 22, 12, 1);
  fillRect(tiles, 6, 11, 10, 12, 1);

  // Spire ceiling
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 10, 3, 16);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 2, 10, 2, 16);
  clearRect(tiles, 0, 10, 0, 16);

  return {
    name: 'Nexus Spire',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room26', x: 1, y: f, spawnX: 47, spawnY: 19 },
      { type: 'door', targetRoom: 'room28', x: 13, y: 2, spawnX: 2, spawnY: 23 },
      { type: 'coin', x: 18, y: 25 },
      { type: 'coin', x: 6, y: 15 },
      { type: 'coin', x: 18, y: 9 },
      { type: 'armored_flyer', x: 13, y: 10 },
      { type: 'flyer', x: 8, y: 18 },
      { type: 'flyer', x: 18, y: 12 },
      { type: 'flyer', x: 6, y: 6 },
      { type: 'flyer', x: 13, y: 3 },
      { type: 'pendulum_trap', x: 8, y: 4, length: 48, swing: 34, speed: 2.2, phase: 0.3 },
      { type: 'crumble_platform', x: 18, y: 26, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 6, y: 20, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 18, y: 14, collapseDelay: 300, respawnDelay: 1800 },
      { type: 'crumble_platform', x: 6, y: 8, collapseDelay: 280, respawnDelay: 1600 },
      { type: 'moving_platform', x: 14, y: 24, axis: 'x', range: 64, speed: 1.3, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 14, y: 16, axis: 'x', range: 64, speed: 1.4, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 14, y: 8, axis: 'x', range: 48, speed: 1.5, phase: 0.5, spin: 0 },
      { type: 'stalactite', x: 6, y: 1 },
      { type: 'stalactite', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 3, y: 1 },
      { type: 'stalactite_sm', x: 14, y: 1 },
      { type: 'stalactite_sm', x: 22, y: 1 },
      { type: 'chain', x: 8, y: 1 },
      { type: 'chain', x: 20, y: 1 },
      { type: 'glow_spore', x: 8, y: 10 },
      { type: 'glow_spore', x: 18, y: 6 },
      { type: 'glow_spore', x: 6, y: 20 },
      { type: 'vine', x: 4, y: 1 },
      { type: 'vine', x: 16, y: 1 },
      { type: 'crystal', x: 4, y: f },
      { type: 'crystal', x: 22, y: f },
      { type: 'crystal_cluster', x: 12, y: 3 },
      { type: 'void_rift', x: 14, y: 18 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 1, y: H - 1, flipX: true },
      { type: 'fg_rock_formation_sm', x: 0, y: 16, flipX: false }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 4, w: 10, h: 12 },
      { type: 'cb_detail_bricks', x: 14, y: 14, w: 8, h: 10 },
      { type: 'cb_rune_mark', x: 6, y: 8 },
      { type: 'cb_rune_mark', x: 18, y: 18 },
      { type: 'cb_detail_roots', x: 4, y: 1, count: 2 },
      { type: 'cb_detail_roots', x: 16, y: 1, count: 2 }
    ],
    lighting: {
      beams: [
        { x: 13, y: 0, angle: 0, key: 'cool', alpha: 0.14, scale: 1.5 },
        { x: 6, y: 0, angle: -8, key: 'cool', alpha: 0.08, scale: 0.9 },
        { x: 20, y: 0, angle: 8, key: 'cool', alpha: 0.08, scale: 0.9 }
      ],
      ambientColor: 0x5511aa,
      ambientAlpha: 0.065,
    },
    ambience: 'tunnel_guardian',
  };
}

function buildRoom28() {
  const W = 55, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor with central lava pit
  fillRect(tiles, H - 2, 1, H - 1, 16, 1);
  clearRect(tiles, H - 2, 17, H - 2, 37);
  fillRect(tiles, H - 2, 38, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 17, 37, 1);

  // Multi-tier platforms — massive combat arena
  fillRow(tiles, 20, 3, 8, 2);
  fillRow(tiles, 18, 10, 16, 2);
  fillRow(tiles, 20, 38, 44, 2);
  fillRow(tiles, 18, 46, 52, 2);
  fillRow(tiles, 14, 6, 12, 2);
  fillRow(tiles, 14, 42, 48, 2);
  fillRow(tiles, 16, 20, 26, 2);
  fillRow(tiles, 16, 28, 34, 2);
  fillRow(tiles, 12, 22, 32, 2);
  fillRow(tiles, 10, 14, 18, 2);
  fillRow(tiles, 10, 36, 40, 2);
  fillRow(tiles, 8, 24, 30, 2);
  fillRow(tiles, 6, 10, 14, 2);
  fillRow(tiles, 6, 40, 44, 2);

  // Arena pillars
  fillRect(tiles, 3, 8, 14, 8, 1);
  fillRect(tiles, 3, 46, 14, 46, 1);
  fillRect(tiles, 3, 20, 8, 20, 1);
  fillRect(tiles, 3, 34, 8, 34, 1);

  // Vaulted ceiling
  fillRect(tiles, 2, 6, 4, 22, 1);
  fillRect(tiles, 2, 32, 4, 48, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'Convergence',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room27', x: 1, y: f, spawnX: 23, spawnY: 4 },
      { type: 'door', targetRoom: 'room29', x: W - 2, y: f, spawnX: 2, spawnY: 19 },
      { type: 'bench', x: 6, y: f },
      { type: 'coin', x: 12, y: 13 },
      { type: 'coin', x: 26, y: 7 },
      { type: 'coin', x: 44, y: 13 },
      { type: 'coin', x: 16, y: 9 },
      { type: 'coin', x: 38, y: 9 },
      { type: 'coin', x: 30, y: 11 },
      { type: 'charger', x: 30, y: 20 },
      { type: 'brute', x: 40, y: f },
      { type: 'brute', x: 28, y: 15 },
      { type: 'moving_platform', x: 22, y: 20, axis: 'x', range: 160, speed: 1.3, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: 20, axis: 'x', range: 160, speed: 1.3, phase: 1.5, spin: 0 },
      { type: 'moving_platform', x: 7, y: 7, axis: 'y', range: 160, speed: 1.1, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 45, y: 7, axis: 'y', range: 160, speed: 1.1, phase: 1.5, spin: 0 },
      { type: 'crumble_platform', x: 30, y: 12, collapseDelay: 280, respawnDelay: 1800 },
      { type: 'crumble_platform', x: 40, y: 14, collapseDelay: 300, respawnDelay: 2000 },
      { type: 'stalactite', x: 12, y: 1 },
      { type: 'stalactite', x: 27, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'stalactite_sm', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 48, y: 1 },
      { type: 'chain', x: 10, y: 1 },
      { type: 'chain', x: 22, y: 1 },
      { type: 'chain', x: 32, y: 1 },
      { type: 'chain', x: 44, y: 1 },
      { type: 'ruin_arch', x: 14, y: f },
      { type: 'ruin_arch', x: 40, y: f },
      { type: 'crystal', x: 18, y: f },
      { type: 'crystal', x: 36, y: f },
      { type: 'crystal_cluster', x: 24, y: 11 },
      { type: 'crystal_cluster', x: 30, y: 11 },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 27, y: 3 },
      { type: 'glow_spore', x: 38, y: 6 },
      { type: 'glow_spore', x: 10, y: 10 },
      { type: 'glow_spore', x: 44, y: 10 },
      { type: 'hanging_moss', x: 14, y: 2 },
      { type: 'hanging_moss', x: 27, y: 2 },
      { type: 'hanging_moss', x: 40, y: 2 },
      { type: 'void_rift', x: 8, y: 14 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_crystal_large', x: 2, y: H - 2, flipX: false },
      { type: 'fg_crystal_large', x: W - 4, y: H - 2, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 4, y: 2, w: 18, h: 14 },
      { type: 'cb_detail_bricks', x: 34, y: 2, w: 18, h: 14 },
      { type: 'cb_rune_mark', x: 10, y: 6 },
      { type: 'cb_rune_mark', x: 22, y: 10 },
      { type: 'cb_rune_mark', x: 32, y: 6 },
      { type: 'cb_rune_mark', x: 44, y: 10 },
      { type: 'cb_rune_mark', x: 16, y: 16 },
      { type: 'cb_rune_mark', x: 38, y: 16 }
    ],
    lighting: {
      beams: [
        { x: 27, y: 0, angle: 0, key: 'cool', alpha: 0.16, scale: 1.8 },
        { x: 12, y: 0, angle: -12, key: 'cool', alpha: 0.10, scale: 1.1 },
        { x: 42, y: 0, angle: 12, key: 'cool', alpha: 0.10, scale: 1.1 }
      ],
      ambientColor: 0x7722cc,
      ambientAlpha: 0.06,
    },
    locked: true,
    ambience: 'tunnel_guardian',
  };
}

function buildRoom29() {
  const W = 48, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Arena floor — wide open with lava on sides
  fillRect(tiles, H - 2, 1, H - 1, W - 2, 1);

  // Lava pits on sides
  clearRect(tiles, H - 2, 2, H - 2, 6);
  clearRect(tiles, H - 2, W - 7, H - 2, W - 3);

  // Side platforms for maneuvering
  fillRow(tiles, 16, 2, 6, 2);
  fillRow(tiles, 16, W - 7, W - 3, 2);
  fillRow(tiles, 12, 3, 7, 2);
  fillRow(tiles, 12, W - 8, W - 4, 2);
  fillRow(tiles, 8, 4, 8, 2);
  fillRow(tiles, 8, W - 9, W - 5, 2);

  // Central elevated platform — boss showdown stage
  fillRow(tiles, 14, 18, 30, 2);
  fillRow(tiles, 10, 20, 28, 2);
  fillRow(tiles, 6, 22, 26, 2);

  // Arena pillars framing the center
  fillRect(tiles, 4, 12, 16, 12, 1);
  fillRect(tiles, 4, W - 13, 16, W - 13, 1);

  // Throne ceiling — oppressive stone dome
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 20, 4, 28);

  // Terrain bumps near sides
  fillRect(tiles, f, 8, f + 1, 10, 1);
  fillRect(tiles, f, W - 11, f + 1, W - 9, 1);

  // Door opening on left
  clearRect(tiles, f - 2, 0, f + 1, 0);

  return {
    name: 'The Void King',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room28', x: 1, y: f, spawnX: 52, spawnY: 23 },
      { type: 'boss', bossType: 'void_king', x: 30, y: f },
      { type: 'moving_platform', x: 14, y: 12, axis: 'y', range: 128, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: W - 15, y: 12, axis: 'y', range: 128, speed: 1.0, phase: 1.5, spin: 0 },
      { type: 'chain', x: 10, y: 1 },
      { type: 'chain', x: 18, y: 1 },
      { type: 'chain', x: W - 19, y: 1 },
      { type: 'chain', x: W - 11, y: 1 },
      { type: 'stalactite', x: 14, y: 1 },
      { type: 'stalactite', x: 24, y: 1 },
      { type: 'stalactite', x: W - 15, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'stalactite_sm', x: W - 7, y: 1 },
      { type: 'crystal', x: 16, y: f },
      { type: 'crystal', x: W - 17, y: f },
      { type: 'crystal_cluster', x: 22, y: 13 },
      { type: 'crystal_cluster', x: 28, y: 13 },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 24, y: 3 },
      { type: 'glow_spore', x: W - 17, y: 6 },
      { type: 'ruin_arch', x: 14, y: f },
      { type: 'ruin_arch', x: W - 15, y: f },
      { type: 'hanging_moss', x: 22, y: 2 },
      { type: 'hanging_moss', x: 28, y: 2 },
      { type: 'void_rift', x: 10, y: 14 },
      { type: 'void_rift', x: 38, y: 14 },
    ],
    foreground: [
      { type: 'fg_rock_formation', x: 0, y: H - 1, flipX: false },
      { type: 'fg_rock_formation', x: W - 2, y: H - 1, flipX: true },
      { type: 'fg_crystal_large', x: 2, y: H - 1, flipX: false },
      { type: 'fg_crystal_large', x: W - 3, y: H - 1, flipX: true }
    ],
    closeBgDetails: [
      { type: 'cb_detail_bricks', x: 2, y: 2, w: 18, h: 14 },
      { type: 'cb_detail_bricks', x: W - 20, y: 2, w: 18, h: 14 },
      { type: 'cb_rune_mark', x: 12, y: 6 },
      { type: 'cb_rune_mark', x: 24, y: 4 },
      { type: 'cb_rune_mark', x: W - 13, y: 6 },
      { type: 'cb_rune_mark', x: 18, y: 14 },
      { type: 'cb_rune_mark', x: W - 19, y: 14 }
    ],
    lighting: {
      beams: [
        { x: 24, y: 0, angle: 0, key: 'cool', alpha: 0.18, scale: 2.0 },
        { x: 12, y: 0, angle: -15, key: 'cool', alpha: 0.12, scale: 1.3 },
        { x: W - 13, y: 0, angle: 15, key: 'cool', alpha: 0.12, scale: 1.3 }
      ],
      ambientColor: 0x8833dd,
      ambientAlpha: 0.07,
    },
    locked: true,
    ambience: 'tunnel_guardian',
  };
}


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
        text: 'The traveler\'s coat is patched with crests from a dozen forgotten houses. "I gather what no king ever will again," he muttered once.' },
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
        text: 'A warden\'s journal, half-burned: "The ice and the void are not enemies. They are siblings — patient in different ways."' },
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
  room10: buildRoom10(),
  room11: buildRoom11(),
  room12: buildRoom12(),
  room13: buildRoom13(),
  room14: buildRoom14(),
  room15: buildRoom15(),
  room16: buildRoom16(),
  room17: buildRoom17(),
  room18: buildRoom18(),
  room19: buildRoom19(),
  room20: buildRoom20(),
  room21: buildRoom21(),
  room22: buildRoom22(),
  room23: buildRoom23(),
  room24: buildRoom24(),
  room25: buildRoom25(),
  room26: buildRoom26(),
  room27: buildRoom27(),
  room28: buildRoom28(),
  room29: buildRoom29(),
  room_organic: buildOrganicCaveRoom({ width: 56, height: 26, seed: 1337 }),
  sanctuary1: buildSanctuary1(),
  sanctuary2: buildSanctuary2(),
};
