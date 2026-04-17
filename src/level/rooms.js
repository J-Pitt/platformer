import { buildOrganicCaveRoom } from './organicCaveGen.js';

import { ch2Rooms } from './rooms_ch2.js';

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

// Maze-building primitives (shared with rooms_ch2.js). `climbWall` is a
// short solid pillar rising from the floor — the player has to jump
// over it, usually using adjacent platforms. `duckWall` hangs from the
// ceiling and leaves a crawlspace above the floor. Use them in sequence
// to close the direct sprint through a room.
function climbWall(tiles, col, floorRow, height) {
  for (let r = floorRow - height + 1; r <= floorRow; r++) setTile(tiles, r, col, 1);
}
function duckWall(tiles, col, floorRow, gapFromFloor) {
  for (let r = 1; r <= floorRow - gapFromFloor; r++) setTile(tiles, r, col, 1);
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
  fillRow(tiles, 6, 1, 6, 2);       // top-left landing (room3 door) — lowered for better approach / headroom
  fillRow(tiles, 6, 16, 20, 2);     // top-right landing (room4 door) — lowered for better approach / headroom

  // Mine-shaft roof — mostly closed stone with a narrow light well
  fillRect(tiles, 1, 1, 3, W - 2, 1);
  clearRect(tiles, 1, 9, 3, 12);
  clearRect(tiles, 3, 1, 5, 6);   // headroom above top-left landing (3 tiles of air)
  clearRect(tiles, 3, 16, 5, 20); // headroom above top-right landing

  // Bottom floor with gaps
  fillRect(tiles, H - 2, 1, H - 1, 7, 1);
  fillRect(tiles, H - 2, 9, H - 2, 13, 0);
  fillRect(tiles, H - 2, 14, H - 1, W - 2, 1);

  // Door openings
  clearRect(tiles, H - 4, 0, H - 2, 0);  // bottom-left back to room1
  clearRect(tiles, 5, 0, 7, 0);           // top-left to room3 — spans the landing row so the portal sits AT the ledge
  clearRect(tiles, 5, W - 1, 7, W - 1);   // top-right to room4 — same
  // Bottom door keeps its lip so the player can approach without dropping
  // past the frame; the top side doors intentionally omit a lip so the
  // opening is clear at the ledge's walking height. Triggering is handled
  // by the door's enlarged overlap body (extends one tile into the room).
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
      { type: 'door', targetRoom: 'room3', x: 1, y: 6, spawnX: 38, spawnY: 9 },
      { type: 'door', targetRoom: 'room4', x: W - 2, y: 6, spawnX: 2, spawnY: 19 },
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
      // New hazards — the shaft tests your wall jump
      { type: 'crusher', x: 11, y: 4, dropDist: 3, downTime: 400, upTime: 2200, phase: 'top' },
      { type: 'arrow_turret', x: 2, y: 17, dir: 'right', interval: 3000, burstSize: 2, burstSpacing: 150 },
      { type: 'arrow_turret', x: W - 3, y: 21, dir: 'left', interval: 3000, burstSize: 2, burstSpacing: 150 },
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
      { type: 'door', targetRoom: 'room2', x: W - 2, y: 10, spawnX: 2, spawnY: 5 },
      { type: 'door', targetRoom: 'room6', x: 1, y: 19, spawnX: 3, spawnY: 22 },
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
      // New hazards — fungal passage ambush points
      { type: 'arrow_turret', x: 2, y: 14, dir: 'right', interval: 2800, burstSize: 2, burstSpacing: 140 },
      { type: 'laser_beam', x: W - 3, y: 8, dir: 'left', length: 8, onTime: 900, offTime: 1400, phase: 0 },
      { type: 'crusher', x: 22, y: 6, dropDist: 3, downTime: 380, upTime: 2200, phase: 'up' },
      // Crucible pack — the passage closes around the map-reader.
      { type: 'crusher', x: 12, y: 6, dropDist: 3, downTime: 380, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 34, y: 6, dropDist: 3, downTime: 380, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: 11, dir: 'right', length: 8, onTime: 1000, offTime: 1300, phase: 500 },
      { type: 'saw_blade', x: 20, y: 18, axis: 'x', range: 96, speed: 1.2, phase: 0 },
      { type: 'saw_blade', x: 32, y: 18, axis: 'y', range: 64, speed: 1.1, phase: 0.5 },
      { type: 'pendulum_trap', x: 18, y: 6, length: 72, swing: 40, speed: 1.7, phase: 0.3 },
      { type: 'pendulum_trap', x: 28, y: 5, length: 80, swing: 42, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 15, y: 12, axis: 'y', range: 96, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'phase_platform', x: 24, y: 15, width: 3, onTime: 1200, offTime: 900, phase: 0 },
      { type: 'arrow_turret', x: W - 3, y: 16, dir: 'left', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'crumble_platform', x: 10, y: 14, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 38, y: 10, collapseDelay: 350, respawnDelay: 2200 },
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

  // Spike columns (wall-jump obstacles with danger) — grounded so you must
  // jump them instead of running under.
  fillRect(tiles, 6, 11, H - 3, 11, 1);
  fillRect(tiles, 6, 32, H - 3, 32, 1);

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
      { type: 'door', targetRoom: 'room2', x: 1, y: 19, spawnX: 19, spawnY: 5 },
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
      // New hazards — Crystal Hall dash gauntlet
      { type: 'laser_beam', x: 2, y: 15, dir: 'right', length: 10, onTime: 900, offTime: 1300, phase: 0 },
      { type: 'crusher', x: 22, y: 1, dropDist: 4, downTime: 400, upTime: 2200, phase: 'top' },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2800, burstSize: 2, burstSpacing: 140 },
      { type: 'phase_platform', x: 20, y: 10, width: 4, onTime: 1200, offTime: 900, phase: 0 },
      // Crucible pack — the crystals remember every footstep.
      { type: 'crusher', x: 14, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 38, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: W - 3, y: 9, dir: 'left', length: 10, onTime: 1000, offTime: 1300, phase: 500 },
      { type: 'saw_blade', x: 22, y: 21, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 36, y: 15, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 30, y: 5, length: 80, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'pendulum_trap', x: 16, y: 5, length: 72, swing: 42, speed: 1.6, phase: 0.4 },
      { type: 'moving_platform', x: 26, y: 16, axis: 'x', range: 96, speed: 1.1, phase: 0.8, spin: 0 },
      { type: 'moving_platform', x: 42, y: 14, axis: 'y', range: 80, speed: 1.0, phase: 0.3, spin: 0 },
      { type: 'phase_platform', x: 32, y: 13, width: 3, onTime: 1200, offTime: 900, phase: 500 },
      { type: 'arrow_turret', x: 2, y: 11, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'crumble_platform', x: 20, y: 11, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 36, y: 9, collapseDelay: 350, respawnDelay: 2200 },
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

  // Arena pillars (taller, with spike walls on faces) — grounded to block
  // sprinting between them.
  fillRect(tiles, 3, 10, H - 3, 10, 1);
  fillRect(tiles, 3, 29, H - 3, 29, 1);

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
      { type: 'door', targetRoom: 'room8', x: W - 2, y: 21, spawnX: 64, spawnY: 26 },
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
      // New hazards
      { type: 'crusher', x: 20, y: 1, dropDist: 4, downTime: 380, upTime: 2200, phase: 'top' },
      { type: 'laser_beam', x: 5, y: 11, dir: 'right', length: 5, onTime: 1100, offTime: 1500, phase: 0 },
      { type: 'arrow_turret', x: 36, y: 15, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 120 },
      // Crucible pack — the Guardian's proving ground earns its name.
      { type: 'crusher', x: 12, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 28, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: W - 3, y: 7, dir: 'left', length: 8, onTime: 1000, offTime: 1300, phase: 500 },
      { type: 'saw_blade', x: 20, y: 23, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 30, y: 17, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 14, y: 5, length: 72, swing: 42, speed: 1.7, phase: 0.3 },
      { type: 'pendulum_trap', x: 26, y: 5, length: 80, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 18, y: 20, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: 14, axis: 'y', range: 96, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'phase_platform', x: 18, y: 17, width: 3, onTime: 1200, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 28, y: 13, width: 3, onTime: 1200, offTime: 900, phase: 500 },
      { type: 'flame_jet', x: 18, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 0 },
      { type: 'flame_jet', x: 22, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 800 },
      { type: 'arrow_turret', x: 2, y: 15, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
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
    ambience: 'tunnel_guardian',
  };
}

function buildRoom6() {
  // Double-jump acquisition room. Post-dash, pre-doubleJump: the whole
  // climb up to the orb is playable with just wall-jump + dash; the
  // descent back and the east exit are deliberately tuned so
  // players who grabbed the orb can now clear 4-tile air gaps with the
  // second jump they just earned.
  const W = 72, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 23

  // ----- A. Entrance run (cols 1..15) -----
  // Solid floor up to col 7, then a 6-tile dash-only lava chasm.
  fillRect(tiles, H - 2, 1, H - 1, 7, 1);
  fillRow(tiles, H - 1, 8, 14, 1);  // lava trough bottom
  fillRect(tiles, H - 2, 15, H - 1, 19, 1);
  // Low stone overhang forces the player to DASH the chasm instead of jumping.
  fillRect(tiles, 17, 3, 18, 19, 1);
  fillRect(tiles, 16, 3, 16, 6, 1);
  fillRect(tiles, 16, 14, 16, 19, 1);

  // ----- B. Wall-jump chimney (cols 20..26) -----
  // Two parallel stone columns: climb via alternating wall-jumps to reach row 10 ledge.
  fillRect(tiles, 8, 20, H - 3, 20, 1);
  fillRect(tiles, 8, 26, H - 3, 26, 1);
  // Floor between the columns is a drop-through gap (lava below)
  clearRect(tiles, H - 2, 21, H - 2, 25);
  fillRow(tiles, H - 1, 21, 25, 1);
  // Top ledge out of chimney
  fillRow(tiles, 8, 20, 29, 2);

  // ----- C. Middle aqueduct above lava (cols 27..48) -----
  // The whole floor is gone — cross on a mixed gauntlet of moving platforms,
  // crumble platforms, and the orb island.
  clearRect(tiles, H - 2, 27, H - 2, 50);
  fillRow(tiles, H - 1, 27, 50, 1);
  // Upper-mid ledge (row 14) — short segments forcing hops + moving platforms.
  fillRow(tiles, 14, 28, 31, 2);
  fillRow(tiles, 14, 44, 48, 2);
  // Orb platform way up at row 5, cols 36..42 (reachable via vertical movers).
  fillRow(tiles, 5, 36, 42, 2);
  // Wall nubs on either side of the orb for wall-jump dismount.
  fillRect(tiles, 7, 33, 11, 33, 1);
  fillRect(tiles, 7, 45, 11, 45, 1);

  // ----- D. Post-orb upper route (cols 49..W-2) -----
  // Floor returns at col 49 but only a thin ribbon.
  fillRect(tiles, H - 2, 49, H - 1, W - 2, 1);
  // Climb via three ascending ledges with 4-tile gaps — doubleJump required to skip
  // a missing crumble cleanly.
  fillRow(tiles, 17, 51, 55, 2);
  fillRow(tiles, 13, 56, 60, 2);
  fillRow(tiles, 9, 61, 65, 2);
  // East door ledge at row 8 (matches existing east door y).
  fillRow(tiles, 8, 66, W - 2, 2);

  // ----- E. Ambient ruin slabs (bg cover) -----
  fillRect(tiles, 2, 6, 4, 14, 1);
  fillRect(tiles, 2, 30, 3, 44, 1);
  fillRect(tiles, 2, 58, 3, W - 2, 1);

  // Door openings
  clearRect(tiles, f - 2, 0, f + 1, 0);        // west to room3
  clearRect(tiles, 6, W - 1, 9, W - 1);         // east to room7

  return {
    name: 'Sunken Aqueduct',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room3', x: 1, y: f, spawnX: 42, spawnY: 19 },
      { type: 'door', targetRoom: 'room7', x: W - 2, y: 8, spawnX: 2, spawnY: 19 },
      { type: 'ability_orb', ability: 'doubleJump', x: 39, y: 4, hint: 'Press jump again in mid-air!' },
      { type: 'bench', x: 4, y: f - 1 },

      // --- A. Entrance hazards ---
      { type: 'floor_spikes', x: 10, y: H - 2, onTime: 1200, offTime: 2000, phase: 0 },
      { type: 'floor_spikes', x: 12, y: H - 2, onTime: 1200, offTime: 2000, phase: 1000 },
      { type: 'fireball_shooter', x: 2, y: 19, dir: 'right', interval: 2400, phase: 0 },
      { type: 'flame_jet', x: 8, y: H - 2, dir: 'up', onTime: 900, offTime: 1800, phase: 0 },

      // --- B. Wall-jump chimney hazards ---
      { type: 'saw_blade', x: 23, y: 14, axis: 'y', range: 120, speed: 1.1, phase: 0 },
      { type: 'arrow_turret', x: 27, y: 12, dir: 'left', interval: 2500, burstSize: 3, burstSpacing: 110 },

      // --- C. Middle aqueduct: moving platforms + lava ---
      // Horizontal mover bridging col 31 → col 44 (the gap is ~12 tiles).
      { type: 'moving_platform', x: 37, y: 14, axis: 'x', range: 160, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 37, y: 18, axis: 'x', range: 160, speed: 1.2, phase: 1.5, spin: 0 },
      // Vertical riser to the orb (row 5)
      { type: 'moving_platform', x: 34, y: 10, axis: 'y', range: 120, speed: 0.9, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 44, y: 10, axis: 'y', range: 120, speed: 0.9, phase: 1.8, spin: 0 },
      // Crumble stepping stones under the mover path (for when timing fails)
      { type: 'crumble_platform', x: 33, y: 18, collapseDelay: 400, respawnDelay: 2800 },
      { type: 'crumble_platform', x: 40, y: 16, collapseDelay: 400, respawnDelay: 2800 },
      // Crusher centered on the orb approach — forces timing even mid-jump.
      { type: 'crusher', x: 39, y: 1, dropDist: 5, downTime: 450, upTime: 2000, phase: 'top' },
      // Lava hazards below
      { type: 'magma_pool', x: 34, y: H - 2, width: 10 },
      { type: 'magma_pool', x: 46, y: H - 2, width: 6 },

      // --- D. Post-orb climb ---
      { type: 'crumble_platform', x: 58, y: 13, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 63, y: 9, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'pendulum_trap', x: 60, y: 11, length: 90, swing: 42, speed: 1.4, phase: 0 },
      { type: 'pendulum_trap', x: 65, y: 7, length: 80, swing: 38, speed: 1.6, phase: 0.8 },
      { type: 'saw_blade', x: 53, y: 17, axis: 'x', range: 96, speed: 1.0, phase: 0 },

      // --- Enemies ---
      { type: 'brute', x: 5, y: f },
      { type: 'flyer', x: 24, y: 5 },
      { type: 'flyer', x: 38, y: 7 },
      { type: 'flyer', x: 54, y: 7 },
      { type: 'flyer', x: 60, y: 4 },
      { type: 'flyer', x: 66, y: 5 },

      // --- Decorations ---
      { type: 'stalactite', x: 10, y: 1 },
      { type: 'stalactite', x: 25, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite', x: 58, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 34, y: 1 },
      { type: 'stalactite_sm', x: 48, y: 1 },
      { type: 'stalactite_sm', x: 64, y: 1 },
      { type: 'chain', x: 14, y: 1 },
      { type: 'chain', x: 30, y: 1 },
      { type: 'chain', x: 46, y: 1 },
      { type: 'chain', x: 62, y: 1 },
      { type: 'vine', x: 22, y: 1 },
      { type: 'vine', x: 52, y: 1 },
      { type: 'ruin_arch', x: 10, y: f },
      { type: 'ruin_arch', x: 44, y: f },
      { type: 'ruin_arch', x: 62, y: f },
      { type: 'glow_spore', x: 16, y: 8 },
      { type: 'glow_spore', x: 32, y: 6 },
      { type: 'glow_spore', x: 48, y: 4 },
      { type: 'glow_spore', x: 60, y: 6 },
      { type: 'mud_patch', x: 4, y: f },
      { type: 'gravel_patch', x: 52, y: f },
      { type: 'hanging_moss', x: 12, y: 2 },
      { type: 'hanging_moss', x: 30, y: 2 },
      { type: 'hanging_moss', x: 46, y: 2 },
      { type: 'hanging_moss', x: 62, y: 2 },
      // Crucible pack — the aqueduct's machinery wakes after the double-jump.
      { type: 'crusher', x: 24, y: 1, dropDist: 4, downTime: 400, upTime: 2100, phase: 'top' },
      { type: 'crusher', x: 54, y: 1, dropDist: 4, downTime: 400, upTime: 2100, phase: 'up' },
      { type: 'crusher', x: 68, y: 1, dropDist: 4, downTime: 400, upTime: 2100, phase: 'down' },
      { type: 'laser_beam', x: 2, y: 12, dir: 'right', length: 12, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 15, dir: 'left', length: 12, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'pendulum_trap', x: 30, y: 5, length: 88, swing: 44, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 42, y: 5, length: 88, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'saw_blade', x: 29, y: 14, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 47, y: 14, axis: 'x', range: 96, speed: 1.3, phase: 0.8 },
      { type: 'flame_jet', x: 36, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 0 },
      { type: 'flame_jet', x: 42, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 800 },
      { type: 'arrow_turret', x: 52, y: f - 4, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'phase_platform', x: 52, y: 17, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 60, y: 13, width: 4, onTime: 1300, offTime: 900, phase: 500 },
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
      { type: 'door', targetRoom: 'room6', x: 1, y: 19, spawnX: 68, spawnY: 8 },
      { type: 'door', targetRoom: 'room8', x: W - 2, y: 5, spawnX: 2, spawnY: 26 },
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
      // Crucible pack — the corridor bares its teeth on the final approach.
      { type: 'crusher', x: 8, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 16, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 24, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: 15, dir: 'right', length: 8, onTime: 1000, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 19, dir: 'left', length: 8, onTime: 1000, offTime: 1300, phase: 500 },
      { type: 'saw_blade', x: 14, y: 25, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 22, y: 19, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 14, y: 5, length: 72, swing: 38, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 22, y: 8, length: 80, swing: 42, speed: 1.7, phase: 1.0 },
      { type: 'pendulum_trap', x: 8, y: 12, length: 64, swing: 36, speed: 1.9, phase: 0.5 },
      { type: 'phase_platform', x: 14, y: 13, width: 3, onTime: 1200, offTime: 900, phase: 0 },
      { type: 'arrow_turret', x: 2, y: 11, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'crumble_platform', x: 12, y: 21, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 24, y: 13, collapseDelay: 350, respawnDelay: 2200 },
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
  // The Crucible: a massive multi-tier lava chamber. With double-jump now
  // acquired (room6), everything here is tuned for long jump arcs, wall-jump
  // columns, and timing crushers / lasers over open lava.
  const W = 68, H = 30;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 27

  // ----- Arena floor: two narrow side platforms separated by a massive
  //       lava pit spanning ~36 tiles across the middle. -----
  fillRect(tiles, H - 2, 1, H - 1, 14, 1);
  clearRect(tiles, H - 2, 15, H - 2, 52);
  fillRect(tiles, H - 2, 53, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 15, 52, 1);

  // ----- Mid-low stepping islands over the pit (row 24) -----
  // Chain of tiny islands spaced for doubleJump gaps (3-4 tile gaps each).
  fillRow(tiles, 24, 17, 19, 2);
  fillRow(tiles, 24, 24, 26, 2);
  fillRow(tiles, 24, 32, 34, 2);
  fillRow(tiles, 24, 41, 43, 2);
  fillRow(tiles, 24, 48, 50, 2);

  // ----- Lower-mid zig platforms for alternate route -----
  fillRow(tiles, 21, 3, 9, 2);
  fillRow(tiles, 21, 58, 64, 2);
  fillRow(tiles, 19, 11, 15, 2);
  fillRow(tiles, 19, 52, 56, 2);

  // ----- Wall-jump columns framing the lava pit (left + right) -----
  fillRect(tiles, 12, 15, 24, 15, 1);  // tall left column
  fillRect(tiles, 12, 52, 24, 52, 1);  // tall right column
  // Outer wall-jump shafts near each edge for ascending
  fillRect(tiles, 10, 6, 20, 6, 1);
  fillRect(tiles, 10, 61, 20, 61, 1);

  // ----- Mid tier platforms (row 15) -----
  fillRow(tiles, 15, 3, 7, 2);
  fillRow(tiles, 15, 60, 64, 2);
  fillRow(tiles, 15, 20, 24, 2);
  fillRow(tiles, 15, 43, 47, 2);

  // ----- Upper tier platforms (row 10) - narrow, across lava -----
  fillRow(tiles, 10, 26, 30, 2);
  fillRow(tiles, 10, 37, 41, 2);

  // ----- Top route (row 6) with crumbles and crushers overhead -----
  fillRow(tiles, 6, 8, 12, 2);
  fillRow(tiles, 6, 55, 59, 2);
  fillRow(tiles, 5, 30, 38, 2);

  // Vaulted ceiling slabs
  fillRect(tiles, 2, 6, 4, 22, 1);
  fillRect(tiles, 2, 46, 4, 62, 1);

  // ----- Door openings -----
  clearRect(tiles, f - 2, 0, f + 1, 0);               // west to room7
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);       // east back to room5
  clearRect(tiles, 0, Math.floor(W / 2) - 2, 0, Math.floor(W / 2) + 1);  // top to room9
  fillRow(tiles, 4, Math.floor(W / 2) - 3, Math.floor(W / 2) + 2, 2);    // landing ledge under top door

  return {
    name: 'The Crucible',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 4, y: f },
    objects: [
      { type: 'door', targetRoom: 'room7', x: 1, y: f, spawnX: 26, spawnY: 5 },
      { type: 'door', targetRoom: 'room5', x: W - 2, y: f, spawnX: 37, spawnY: 21 },
      { type: 'door', targetRoom: 'room9', x: Math.floor(W / 2), y: 2, spawnX: 3, spawnY: 17 },

      // --- Lava pool visuals (over the open trench) ---
      { type: 'magma_pool', x: 16, y: H - 2, width: 36 },

      // --- Moving platforms over the pit (lifelines for stepping-island gaps) ---
      { type: 'moving_platform', x: 21, y: 20, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 20, axis: 'x', range: 96, speed: 1.2, phase: 1.5, spin: 0 },
      { type: 'moving_platform', x: 46, y: 20, axis: 'x', range: 96, speed: 1.1, phase: 0.8, spin: 0 },
      // Vertical movers climbing from stepping islands to row 15
      { type: 'moving_platform', x: 22, y: 19, axis: 'y', range: 96, speed: 0.9, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 42, y: 19, axis: 'y', range: 96, speed: 0.9, phase: 1.5, spin: 0 },
      // Mover connecting row 15 center to row 10 (short vertical hop)
      { type: 'moving_platform', x: 34, y: 12, axis: 'y', range: 60, speed: 1.2, phase: 0.5, spin: 0 },

      // --- Crushers: three overhead, staggered timing ---
      { type: 'crusher', x: 27, y: 1, dropDist: 6, downTime: 500, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 39, y: 1, dropDist: 6, downTime: 500, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 33, y: 1, dropDist: 5, downTime: 450, upTime: 2400, phase: 'down' },

      // --- Lasers crossing the upper section (horizontal beams to duck under) ---
      { type: 'laser_beam', x: 16, y: 10, dir: 'right', length: 10, onTime: 1200, offTime: 1400, phase: 0 },
      { type: 'laser_beam', x: 51, y: 7, dir: 'left', length: 10, onTime: 1200, offTime: 1400, phase: 700 },

      // --- Crumble stepping stones to reach the top ledge (row 6) ---
      { type: 'crumble_platform', x: 13, y: 8, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 17, y: 5, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 51, y: 8, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 55, y: 5, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 28, y: 12, collapseDelay: 400, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 39, y: 12, collapseDelay: 400, respawnDelay: 2400 },

      // --- Flame jets from the lava below (vertical) ---
      { type: 'flame_jet', x: 22, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 0 },
      { type: 'flame_jet', x: 30, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 850 },
      { type: 'flame_jet', x: 38, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 500 },
      { type: 'flame_jet', x: 46, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 1200 },

      // --- Pendulums sweeping the mid tier ---
      { type: 'pendulum_trap', x: 23, y: 14, length: 100, swing: 44, speed: 1.5, phase: 0 },
      { type: 'pendulum_trap', x: 45, y: 14, length: 100, swing: 44, speed: 1.5, phase: 1.2 },

      // --- Enemies ---
      { type: 'brute', x: 9, y: f },
      { type: 'brute', x: 60, y: f },
      { type: 'flyer', x: 20, y: 9 },
      { type: 'flyer', x: 34, y: 6 },
      { type: 'flyer', x: 48, y: 9 },
      { type: 'flyer', x: 28, y: 14 },
      { type: 'flyer', x: 40, y: 14 },

      // --- Decorations ---
      { type: 'stalactite', x: 12, y: 1 },
      { type: 'stalactite', x: 25, y: 1 },
      { type: 'stalactite', x: 42, y: 1 },
      { type: 'stalactite', x: 58, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 18, y: 1 },
      { type: 'stalactite_sm', x: 32, y: 1 },
      { type: 'stalactite_sm', x: 50, y: 1 },
      { type: 'stalactite_sm', x: 62, y: 1 },
      { type: 'chain', x: 10, y: 1 },
      { type: 'chain', x: 24, y: 1 },
      { type: 'chain', x: 44, y: 1 },
      { type: 'chain', x: 58, y: 1 },
      { type: 'ruin_arch', x: 14, y: f },
      { type: 'ruin_arch', x: 54, y: f },
      { type: 'glow_spore', x: 16, y: 6 },
      { type: 'glow_spore', x: 34, y: 3 },
      { type: 'glow_spore', x: 50, y: 6 },
      { type: 'hanging_moss', x: 14, y: 2 },
      { type: 'hanging_moss', x: 34, y: 2 },
      { type: 'hanging_moss', x: 52, y: 2 },
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
      { type: 'door', targetRoom: 'room8', x: 1, y: f, spawnX: 34, spawnY: 5 },
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
    ambience: 'tunnel_guardian',
  };
}

function buildRoom10() {
  // Frozen Threshold — rebuilt as an ice crucible in the spirit of room 8:
  // narrow side platforms either side of a big frozen chasm, wall-jump ice
  // pillars framing it, multi-tier routes overhead, and dense timing hazards.
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 19

  // ----- Arena floor: two narrow side platforms separated by a 22-wide
  //       frozen chasm down the middle. -----
  fillRect(tiles, H - 2, 1, H - 1, 10, 1);
  clearRect(tiles, H - 2, 11, H - 2, 38);
  fillRect(tiles, H - 2, 39, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 11, 38, 1);

  // ----- Stepping islands over the chasm (low tier, row 17) -----
  fillRow(tiles, 17, 13, 14, 2);
  fillRow(tiles, 17, 19, 20, 2);
  fillRow(tiles, 17, 28, 29, 2);
  fillRow(tiles, 17, 35, 36, 2);

  // ----- Wall-jump ice pillars framing the chasm -----
  fillRect(tiles, 8, 11, 18, 11, 1);
  fillRect(tiles, 8, 38, 18, 38, 1);
  // Outer ascending shafts near each edge — grounded so you can't sprint under them.
  fillRect(tiles, 6, 5, H - 3, 5, 1);
  fillRect(tiles, 6, 44, H - 3, 44, 1);

  // ----- Mid tier platforms (row 13) -----
  fillRow(tiles, 13, 3, 4, 2);
  fillRow(tiles, 13, 45, 46, 2);
  fillRow(tiles, 13, 15, 18, 2);
  fillRow(tiles, 13, 31, 34, 2);
  fillRow(tiles, 13, 23, 26, 2);

  // ----- Upper tier platforms (row 9) — narrow beams over the chasm -----
  fillRow(tiles, 9, 7, 10, 2);
  fillRow(tiles, 9, 39, 42, 2);
  fillRow(tiles, 9, 20, 23, 2);
  fillRow(tiles, 9, 26, 29, 2);

  // ----- Top route (row 6) with crumble links -----
  fillRow(tiles, 6, 13, 16, 2);
  fillRow(tiles, 6, 33, 36, 2);

  // Vaulted ice ceiling
  fillRect(tiles, 2, 6, 4, 20, 1);
  fillRect(tiles, 2, 29, 4, 44, 1);

  // ----- Door openings ----- left to room9, right to room11, plus a
  // top landing accessible only via upper route.
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  clearRect(tiles, 0, 24, 0, 26);
  fillRow(tiles, 4, 23, 27, 2);

  return {
    name: 'Frozen Threshold',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room9', x: 1, y: f, spawnX: 40, spawnY: 17 },
      { type: 'door', targetRoom: 'room11', x: W - 2, y: f, spawnX: 2, spawnY: 27 },
      // Optional top exit loops you back to room9 (secret skip for skilled players)
      { type: 'door', targetRoom: 'room9', x: 25, y: 2, spawnX: 3, spawnY: 17 },

      // --- Moving platforms: lifelines over the chasm ---
      { type: 'moving_platform', x: 16, y: 16, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 33, y: 16, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 24, y: 15, axis: 'y', range: 96, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 13, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 1.2, spin: 0 },

      // --- Crushers overhead, staggered like the Crucible ---
      { type: 'crusher', x: 15, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 25, y: 1, dropDist: 6, downTime: 450, upTime: 2200, phase: 'down' },
      { type: 'crusher', x: 34, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up' },

      // --- Horizontal lasers across the mid tier ---
      { type: 'laser_beam', x: 12, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: 37, y: 11, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 650 },

      // --- Icicles dropping over the chasm (ice-themed flame-jet analog) ---
      { type: 'icicle_drop', x: 17, y: 4 },
      { type: 'icicle_drop', x: 22, y: 4 },
      { type: 'icicle_drop', x: 28, y: 4 },
      { type: 'icicle_drop', x: 32, y: 4 },

      // --- Crumble stepping stones leading to the top door ---
      { type: 'crumble_platform', x: 18, y: 5, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 22, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 28, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 32, y: 5, collapseDelay: 380, respawnDelay: 2400 },

      // --- Pendulum ice picks sweeping the mid tier ---
      { type: 'pendulum_trap', x: 18, y: 9, length: 80, swing: 42, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 31, y: 9, length: 80, swing: 42, speed: 1.7, phase: 1.2 },

      // --- Saw blades drilling up from the chasm ---
      { type: 'saw_blade', x: 20, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 29, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0.8 },

      // --- Arrow turrets from opposite walls ---
      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },

      // --- Ice patches for slip hazard on the few safe platforms ---
      { type: 'ice_patch', x: 3, y: 13, width: 2 },
      { type: 'ice_patch', x: 45, y: 13, width: 2 },
      { type: 'ice_patch', x: 7, y: f - 1, width: 3 },
      { type: 'ice_patch', x: 39, y: f - 1, width: 3 },

      // --- Phase platforms bridging the worst gaps when they're on ---
      { type: 'phase_platform', x: 15, y: 17, width: 3, onTime: 1300, offTime: 1000, phase: 0 },
      { type: 'phase_platform', x: 31, y: 17, width: 3, onTime: 1300, offTime: 1000, phase: 600 },

      // --- Rewards ---
      { type: 'bench', x: 4, y: f },
      { type: 'coin', x: 22, y: 8 },
      { type: 'coin', x: 27, y: 8 },
      { type: 'coin', x: 8, y: 8 },
      { type: 'coin', x: 41, y: 8 },
      { type: 'coin', x: 14, y: 5 },
      { type: 'coin', x: 35, y: 5 },
      { type: 'item_pickup', itemId: 'ether_vial', amount: 1, x: 6, y: 19 },

      // --- Enemies ---
      { type: 'crawler', x: 7, y: f },
      { type: 'crawler', x: 42, y: f },
      { type: 'flyer', x: 16, y: 8 },
      { type: 'flyer', x: 33, y: 8 },
      { type: 'flyer', x: 24, y: 12 },
      { type: 'armored_flyer', x: 24, y: 5 },

      // --- Decorations ---
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 43, y: f },
      { type: 'crystal_cluster', x: 9, y: f },
      { type: 'crystal_cluster', x: 40, y: f },
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
      { type: 'ruin_arch', x: 8, y: f },
      { type: 'ruin_arch', x: 42, y: f },
      { type: 'ice_crystal_cluster', x: 20, y: 17 },
      { type: 'ice_crystal_cluster', x: 29, y: 17 },
      { type: 'frozen_banner', x: 44, y: 4 },
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
      { type: 'door', targetRoom: 'room12', x: W - 2, y: 3, spawnX: 2, spawnY: 22 },
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
      // Crucible pack — glacial shaft gains teeth on every tier.
      { type: 'crusher', x: 6, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 16, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'laser_beam', x: 2, y: 9, dir: 'right', length: 8, onTime: 1000, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 17, dir: 'left', length: 8, onTime: 1000, offTime: 1300, phase: 500 },
      { type: 'pendulum_trap', x: 6, y: 5, length: 64, swing: 36, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 16, y: 11, length: 72, swing: 40, speed: 1.7, phase: 1.0 },
      { type: 'saw_blade', x: 8, y: 24, axis: 'x', range: 80, speed: 1.3, phase: 0 },
      { type: 'icicle_drop', x: 6, y: 4, interval: 2400, phase: 0 },
      { type: 'icicle_drop', x: 16, y: 4, interval: 2400, phase: 800 },
      { type: 'moving_platform', x: 10, y: 22, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'arrow_turret', x: 2, y: 19, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'phase_platform', x: 10, y: 15, width: 3, onTime: 1200, offTime: 900, phase: 0 },
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
  // Crystal Caverns — expanded ice hub. Ice patches ride across conveyor
  // belts so stopping = sliding back; phase platforms chain together across
  // the biggest gaps. Mandatory wall-jump chimney in the center.
  const W = 68, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 23

  // ----- Floor with three hard chasms -----
  fillRect(tiles, H - 2, 1, H - 1, 10, 1);
  clearRect(tiles, H - 2, 11, H - 2, 19);         // first chasm (conveyor run)
  fillRow(tiles, H - 1, 11, 19, 1);
  fillRect(tiles, H - 2, 20, H - 1, 28, 1);
  clearRect(tiles, H - 2, 29, H - 2, 42);         // huge mid chasm (phase platform)
  fillRow(tiles, H - 1, 29, 42, 1);
  fillRect(tiles, H - 2, 43, H - 1, 52, 1);
  clearRect(tiles, H - 2, 53, H - 2, 60);         // east chasm (moving platform)
  fillRow(tiles, H - 1, 53, 60, 1);
  fillRect(tiles, H - 2, 61, H - 1, W - 2, 1);

  // ----- Conveyor deck (cols 11-19) — platform hanging over chasm -----
  fillRow(tiles, H - 4, 11, 19, 2);

  // ----- Wall-jump chimney (mid) cols 30..36 -----
  fillRect(tiles, 6, 30, 18, 30, 1);
  fillRect(tiles, 6, 36, 18, 36, 1);
  // Ledge caps for chimney top
  fillRow(tiles, 6, 30, 38, 2);

  // ----- Multi-tier platforms -----
  fillRow(tiles, 18, 5, 9, 2);
  fillRow(tiles, 14, 3, 7, 2);
  fillRow(tiles, 10, 6, 10, 2);
  fillRow(tiles, 18, 22, 27, 2);
  fillRow(tiles, 14, 20, 24, 2);
  fillRow(tiles, 10, 22, 26, 2);
  fillRow(tiles, 18, 41, 46, 2);
  fillRow(tiles, 14, 45, 50, 2);
  fillRow(tiles, 10, 42, 47, 2);
  fillRow(tiles, 18, 56, 64, 2);
  fillRow(tiles, 14, 58, 63, 2);
  fillRow(tiles, 10, 62, 66, 2);

  // Ice pillars — west pair frames the first chasm (cols 11-19 are open
  // below), east pair is grounded so it actually blocks a sprint.
  fillRect(tiles, 5, 14, 16, 15, 1);
  fillRect(tiles, 5, 48, H - 3, 49, 1);

  // Ice ceiling slabs
  fillRect(tiles, 2, 6, 4, 22, 1);
  fillRect(tiles, 2, 40, 4, 56, 1);

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
      { type: 'weapon_pickup', weaponId: 'throwing_daggers', x: 16, y: 19 },
      { type: 'merchant_shop', x: 34, y: 5, items: [
        { name: 'Health Refill', cost: 5, type: 'heal' },
        { name: 'Max HP +1', cost: 15, type: 'maxhp' }
      ], dialogue: [
        'Brr... even my wares are starting to frost over down here.',
        'Take what you need — coin spends the same whether it\'s frozen or not.'
      ]},

      // --- Conveyors (opposed directions across the first chasm deck) ---
      { type: 'conveyor', x: 12, y: 18, width: 4, dir: 'right', speed: 140 },
      { type: 'conveyor', x: 17, y: 18, width: 3, dir: 'left',  speed: 140 },

      // --- Phase platform chain across the huge mid chasm ---
      { type: 'phase_platform', x: 30, y: 20, width: 2, onTime: 1500, offTime: 1100, phase: 0 },
      { type: 'phase_platform', x: 34, y: 20, width: 2, onTime: 1500, offTime: 1100, phase: 700 },
      { type: 'phase_platform', x: 38, y: 20, width: 2, onTime: 1500, offTime: 1100, phase: 1400 },

      // --- Moving platform across east chasm ---
      { type: 'moving_platform', x: 56, y: 20, axis: 'x', range: 112, speed: 1.1, phase: 0, spin: 0 },

      // --- Ice patches that make conveyor slides deadlier ---
      { type: 'ice_patch', x: 12, y: H - 4, width: 4 },
      { type: 'ice_patch', x: 45, y: 18, width: 4 },
      { type: 'ice_patch', x: 24, y: 18, width: 3 },

      // --- Icicle drops from ceiling (over chasms) ---
      { type: 'icicle_drop', x: 15, y: 4 },
      { type: 'icicle_drop', x: 34, y: 4 },
      { type: 'icicle_drop', x: 56, y: 4 },

      // --- Floor spikes on the few solid-floor sections (force jumping over) ---
      { type: 'floor_spikes', x: 25, y: H - 2, onTime: 1100, offTime: 1800, phase: 0 },
      { type: 'floor_spikes', x: 48, y: H - 2, onTime: 1100, offTime: 1800, phase: 900 },

      // --- Arrow turret guarding the chimney top ---
      { type: 'arrow_turret', x: 36, y: 7, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 130 },

      // --- Laser beam across the east chasm (horizontal) ---
      { type: 'laser_beam', x: 53, y: 15, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },

      // --- Crumble platforms on upper route (for coin reward) ---
      { type: 'crumble_platform', x: 12, y: 12, collapseDelay: 400, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 54, y: 8, collapseDelay: 400, respawnDelay: 2400 },

      // --- Coins (upper route rewards the skilled path) ---
      { type: 'coin', x: 8, y: 9 },
      { type: 'coin', x: 24, y: 9 },
      { type: 'coin', x: 34, y: 5 },
      { type: 'coin', x: 44, y: 9 },
      { type: 'coin', x: 64, y: 9 },

      // --- Enemies ---
      { type: 'crawler', x: 22, y: f },
      { type: 'crawler', x: 48, y: f },
      { type: 'armored_flyer', x: 32, y: 10 },
      { type: 'flyer', x: 24, y: 6 },
      { type: 'flyer', x: 44, y: 6 },
      { type: 'flyer', x: 60, y: 8 },
      { type: 'flyer', x: 10, y: 10 },

      // --- Decorations ---
      { type: 'crystal', x: 6, y: f },
      { type: 'crystal', x: 24, y: f },
      { type: 'crystal', x: 46, y: f },
      { type: 'crystal', x: 62, y: f },
      { type: 'crystal_cluster', x: 10, y: f },
      { type: 'crystal_cluster', x: 48, y: f },
      { type: 'stalactite', x: 12, y: 1 },
      { type: 'stalactite', x: 28, y: 1 },
      { type: 'stalactite', x: 50, y: 1 },
      { type: 'stalactite_sm', x: 6, y: 1 },
      { type: 'stalactite_sm', x: 20, y: 1 },
      { type: 'stalactite_sm', x: 44, y: 1 },
      { type: 'stalactite_sm', x: 62, y: 1 },
      { type: 'chain', x: 10, y: 1 },
      { type: 'chain', x: 26, y: 1 },
      { type: 'chain', x: 44, y: 1 },
      { type: 'chain', x: 60, y: 1 },
      { type: 'light_beam', x: 16, y: 1 },
      { type: 'light_beam', x: 40, y: 1 },
      { type: 'light_beam', x: 56, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 34, y: 4 },
      { type: 'glow_spore', x: 50, y: 6 },
      { type: 'ruin_arch', x: 8, y: f },
      { type: 'ruin_arch', x: 40, y: f },
      { type: 'hanging_moss', x: 18, y: 2 },
      { type: 'hanging_moss', x: 48, y: 2 },
      { type: 'ice_crystal_cluster', x: 42, y: 18 },
      // Crucible pack — crystal caverns turn on the interloper.
      { type: 'crusher', x: 14, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 36, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 58, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: 12, dir: 'right', length: 10, onTime: 1000, offTime: 1300, phase: 0 },
      { type: 'saw_blade', x: 24, y: 17, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 48, y: 17, axis: 'x', range: 96, speed: 1.3, phase: 0.7 },
      { type: 'pendulum_trap', x: 22, y: 8, length: 88, swing: 44, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 46, y: 8, length: 88, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 34, y: 12, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'arrow_turret', x: 2, y: 16, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 11, dir: 'left', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'icicle_drop', x: 24, y: 4, interval: 2400, phase: 500 },
      { type: 'icicle_drop', x: 44, y: 4, interval: 2400, phase: 1100 },
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

  // Arena pillars — grounded so the boss room actually has walls instead
  // of hanging decor.
  fillRect(tiles, 4, 12, H - 3, 12, 1);
  fillRect(tiles, 4, W - 13, H - 3, W - 13, 1);

  // Icy ceiling
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 16, 4, 24);

  // Terrain bumps
  fillRect(tiles, f, 10, f + 1, 12, 1);
  fillRect(tiles, f, W - 13, f + 1, W - 11, 1);

  // Maze barriers — the trial chamber. No sprinting between the pillars
  // to the boss; climb, duck, climb.
  climbWall(tiles, 18, f, 3);
  duckWall(tiles, 22, f, 3);
  climbWall(tiles, 26, f, 3);

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
      { type: 'door', targetRoom: 'room12', x: 1, y: f, spawnX: 66, spawnY: 22 },
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
      // New hazards — boss-prep room gets extra teeth
      { type: 'crusher', x: 20, y: 2, dropDist: 4, downTime: 400, upTime: 2200, phase: 'top' },
      { type: 'arrow_turret', x: 2, y: 11, dir: 'right', interval: 3000, burstSize: 3, burstSpacing: 130 },
      { type: 'arrow_turret', x: 37, y: 11, dir: 'left', interval: 3000, burstSize: 3, burstSpacing: 130 },
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

  // Lava pillars — west pair stands over a magma gap (cols 11-16); east
  // pair is grounded so it actually blocks the path.
  fillRect(tiles, 5, 14, 14, 15, 1);
  fillRect(tiles, 5, 34, H - 3, 35, 1);

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
      // New hazards — magma descent teeth
      { type: 'crusher', x: 13, y: 1, dropDist: 5, downTime: 420, upTime: 2100, phase: 'top' },
      { type: 'crusher', x: 27, y: 1, dropDist: 5, downTime: 420, upTime: 2100, phase: 'up' },
      { type: 'crusher', x: 41, y: 1, dropDist: 5, downTime: 420, upTime: 2100, phase: 'down' },
      { type: 'laser_beam', x: 2, y: 15, dir: 'right', length: 7, onTime: 1100, offTime: 1400, phase: 0 },
      { type: 'conveyor', x: 4, y: H - 4, width: 5, dir: 'left', speed: 120 },
      { type: 'phase_platform', x: 11, y: 21, width: 2, onTime: 1300, offTime: 1000, phase: 0 },
      { type: 'phase_platform', x: 14, y: 21, width: 2, onTime: 1300, offTime: 1000, phase: 650 },
      // Crucible pack — magma pools erupt, pendulums swing over the crossings.
      { type: 'magma_pool', x: 11, y: H - 2, width: 6 },
      { type: 'magma_pool', x: 25, y: H - 2, width: 6 },
      { type: 'magma_pool', x: 39, y: H - 2, width: 6 },
      { type: 'flame_jet', x: 12, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 0 },
      { type: 'flame_jet', x: 26, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 600 },
      { type: 'flame_jet', x: 40, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 1200 },
      { type: 'pendulum_trap', x: 18, y: 8, length: 96, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 32, y: 6, length: 88, swing: 44, speed: 1.7, phase: 1.0 },
      { type: 'saw_blade', x: 20, y: 18, axis: 'y', range: 64, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 36, y: 14, axis: 'x', range: 96, speed: 1.2, phase: 0.5 },
      { type: 'arrow_turret', x: 2, y: 12, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 16, dir: 'left', interval: 2700, burstSize: 3, burstSpacing: 120 },
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
      { type: 'door', targetRoom: 'room16', x: W - 2, y: 3, spawnX: 3, spawnY: 22 },
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
      // Crucible-tier additions: flame jets rising from the lava below,
      // staggered crushers from the ceiling, lasers across, saw blades.
      { type: 'magma_pool', x: 7, y: H - 2, width: 16 },
      { type: 'flame_jet', x: 10, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 0 },
      { type: 'flame_jet', x: 16, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 700 },
      { type: 'flame_jet', x: 20, y: H - 2, dir: 'up', onTime: 1100, offTime: 1700, phase: 350 },
      { type: 'crusher', x: 9, y: 1, dropDist: 5, downTime: 440, upTime: 2100, phase: 'top' },
      { type: 'crusher', x: 20, y: 1, dropDist: 5, downTime: 440, upTime: 2100, phase: 'up' },
      { type: 'laser_beam', x: 3, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1400, phase: 0 },
      { type: 'laser_beam', x: 24, y: 15, dir: 'left', length: 8, onTime: 1100, offTime: 1400, phase: 650 },
      { type: 'saw_blade', x: 14, y: 20, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'arrow_turret', x: 2, y: 17, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 130 },
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
  // Ember Halls — lava-filled gauntlet. The floor is mostly open lava; the
  // only way across is alternating phase platforms, crushers, and
  // conveyors that push AGAINST your direction of travel.
  const W = 72, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 23

  // ----- Massive lava floor (only the two ends have solid ground) -----
  fillRect(tiles, H - 2, 1, H - 1, 8, 1);   // west landing
  clearRect(tiles, H - 2, 9, H - 2, 62);
  fillRow(tiles, H - 1, 9, 62, 1);
  fillRect(tiles, H - 2, 63, H - 1, W - 2, 1);

  // ----- Mid-tier staging slabs (row 20) for moving-platform hops -----
  fillRow(tiles, 20, 10, 13, 2);
  fillRow(tiles, 20, 58, 62, 2);

  // ----- Upper tier ledges (row 14) -----
  fillRow(tiles, 14, 4, 9, 2);
  fillRow(tiles, 14, 63, W - 2, 2);

  // ----- Wall-jump columns framing the lava pit -----
  fillRect(tiles, 8, 13, 18, 13, 1);
  fillRect(tiles, 8, 58, 18, 58, 1);

  // ----- Crusher anchor slabs (ceiling is thick here) -----
  fillRect(tiles, 2, 15, 4, 22, 1);
  fillRect(tiles, 2, 30, 4, 42, 1);
  fillRect(tiles, 2, 50, 4, 57, 1);

  // ----- Upper catwalk (row 8) reachable via wall-jumps -----
  fillRow(tiles, 8, 4, 10, 2);
  fillRow(tiles, 8, 64, W - 2, 2);
  fillRow(tiles, 8, 30, 42, 2);  // mid catwalk with crushers overhead

  // ----- Lava pillars (accent) -----
  fillRect(tiles, 10, 22, 18, 23, 1);
  fillRect(tiles, 10, 48, 18, 49, 1);

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

      // --- Lava pool visuals ---
      { type: 'magma_pool', x: 10, y: H - 2, width: 52 },

      // --- Phase platform chain across the mid-low lane ---
      { type: 'phase_platform', x: 14, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 0 },
      { type: 'phase_platform', x: 18, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 500 },
      { type: 'phase_platform', x: 24, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 1000 },
      { type: 'phase_platform', x: 28, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 0 },
      { type: 'phase_platform', x: 48, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 700 },
      { type: 'phase_platform', x: 52, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 200 },
      { type: 'phase_platform', x: 56, y: 20, width: 2, onTime: 1400, offTime: 1000, phase: 1200 },

      // --- Moving platforms to bridge the phase-platform gap (alternative route) ---
      { type: 'moving_platform', x: 34, y: 20, axis: 'x', range: 128, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 42, y: 20, axis: 'x', range: 128, speed: 1.1, phase: 1.5, spin: 0 },

      // --- Crushers (three timed from ceiling) ---
      { type: 'crusher', x: 18, y: 1, dropDist: 6, downTime: 500, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 34, y: 1, dropDist: 6, downTime: 500, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 50, y: 1, dropDist: 6, downTime: 500, upTime: 2000, phase: 'down' },
      { type: 'crusher', x: 40, y: 1, dropDist: 5, downTime: 400, upTime: 2600, phase: 'bottom' },

      // --- Conveyors on the upper catwalk (PUSH west, making retreat easier / advance harder) ---
      { type: 'conveyor', x: 30, y: 9, width: 6, dir: 'left', speed: 110 },
      { type: 'conveyor', x: 36, y: 9, width: 6, dir: 'right', speed: 110 },

      // --- Laser beams cutting the mid-upper area ---
      { type: 'laser_beam', x: 14, y: 12, dir: 'right', length: 10, onTime: 1200, offTime: 1400, phase: 0 },
      { type: 'laser_beam', x: 58, y: 12, dir: 'left',  length: 10, onTime: 1200, offTime: 1400, phase: 700 },

      // --- Flame jets from lava ---
      { type: 'flame_jet', x: 16, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 0 },
      { type: 'flame_jet', x: 24, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 500 },
      { type: 'flame_jet', x: 38, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 1000 },
      { type: 'flame_jet', x: 46, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 250 },
      { type: 'flame_jet', x: 56, y: H - 2, dir: 'up', onTime: 1000, offTime: 1600, phase: 800 },

      // --- Pendulums sweeping the mid-tier -----
      { type: 'pendulum_trap', x: 22, y: 14, length: 100, swing: 44, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 50, y: 14, length: 100, swing: 44, speed: 1.8, phase: 1.0 },

      // --- Arrow turret on the upper catwalk ---
      { type: 'arrow_turret', x: 34, y: 6, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 110 },

      // --- Crumble platforms for coin detours ---
      { type: 'crumble_platform', x: 15, y: 12, collapseDelay: 350, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 56, y: 12, collapseDelay: 350, respawnDelay: 2000 },

      // --- Coins (rewards for the high route) ---
      { type: 'coin', x: 8, y: 7 },
      { type: 'coin', x: 34, y: 7 },
      { type: 'coin', x: 40, y: 7 },
      { type: 'coin', x: 66, y: 7 },
      { type: 'coin', x: 22, y: 13 },
      { type: 'coin', x: 50, y: 13 },

      // --- Enemies ---
      { type: 'flyer', x: 16, y: 6 },
      { type: 'flyer', x: 32, y: 6 },
      { type: 'flyer', x: 48, y: 6 },
      { type: 'flyer', x: 60, y: 8 },
      { type: 'flyer', x: 12, y: 10 },
      { type: 'flyer', x: 54, y: 10 },
      { type: 'armored_flyer', x: 35, y: 4 },
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
      { type: 'door', targetRoom: 'room16', x: 1, y: f, spawnX: 68, spawnY: 22 },
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
      // New hazards — Inferno Guardian climb demands precision
      { type: 'crusher', x: 22, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'top' },
      { type: 'laser_beam', x: 2, y: 13, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 9, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 650 },
      { type: 'arrow_turret', x: 2, y: 16, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 16, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 120 },
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

  // Shadow Gate — rebuilt as a shadow crucible. A central void pit dominates
  // the room; stepping islands, crumble stones, and moving platforms provide
  // the only routes across. Wall-jump pillars frame the pit; the exits shift
  // so the top route is the fast path if you have the skill.

  // ----- Floor: narrow side platforms separated by a 22-tile shadow pit -----
  fillRect(tiles, H - 2, 1, H - 1, 10, 1);
  clearRect(tiles, H - 2, 11, H - 2, 38);
  fillRect(tiles, H - 2, 39, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 11, 38, 1);

  // Stepping islands over the pit (low tier, row 17)
  fillRow(tiles, 17, 14, 15, 2);
  fillRow(tiles, 17, 20, 21, 2);
  fillRow(tiles, 17, 28, 29, 2);
  fillRow(tiles, 17, 34, 35, 2);

  // Wall-jump shadow pillars framing the pit
  fillRect(tiles, 7, 11, 18, 11, 1);
  fillRect(tiles, 7, 38, 18, 38, 1);
  // Outer wall-jump shafts — grounded to become true blockers (they used to
  // hang above the floor and let you sprint right underneath).
  fillRect(tiles, 6, 5, H - 3, 5, 1);
  fillRect(tiles, 6, 44, H - 3, 44, 1);

  // Mid tier platforms (row 13)
  fillRow(tiles, 13, 3, 4, 2);
  fillRow(tiles, 13, 45, 46, 2);
  fillRow(tiles, 13, 14, 17, 2);
  fillRow(tiles, 13, 32, 35, 2);
  fillRow(tiles, 13, 22, 27, 2);

  // Upper tier (row 9) — narrow beams
  fillRow(tiles, 9, 7, 10, 2);
  fillRow(tiles, 9, 39, 42, 2);
  fillRow(tiles, 9, 19, 22, 2);
  fillRow(tiles, 9, 27, 30, 2);

  // Top route (row 5)
  fillRow(tiles, 5, 11, 14, 2);
  fillRow(tiles, 5, 35, 38, 2);

  // Vaulted ceiling
  fillRect(tiles, 2, 6, 4, 20, 1);
  fillRect(tiles, 2, 29, 4, 44, 1);

  // Door openings — keep the side doors but add a top exit to room 19
  // for skilled players who want a fast path.
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  clearRect(tiles, 0, 24, 0, 26);
  fillRow(tiles, 4, 23, 27, 2);

  return {
    name: 'Shadow Gate',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'weapon_pickup', weaponId: 'warden_greatsword', x: 7, y: 12 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 42, y: 8 },
      { type: 'door', targetRoom: 'room17', x: 1, y: f, spawnX: 41, spawnY: 21 },
      { type: 'door', targetRoom: 'room19', x: W - 2, y: f, spawnX: 2, spawnY: 4 },
      { type: 'door', targetRoom: 'room19', x: 25, y: 2, spawnX: 2, spawnY: 4 },
      { type: 'bench', x: 4, y: f },
      { type: 'npc', npcType: 'spirit', x: 8, y: f, dialogue: [
        'You have crossed from the burning halls into the Shadow Sanctum. Few mortals tread this far.',
        'This place exists between worlds — not quite alive, not quite dead. The shadows here remember the kingdom that was.',
        'The Bone Tyrant\'s reach extends even here, but his grip is weaker. The shadows obey older laws.',
        'Be wary of the Phantom Corridors ahead. They shift and twist. Trust your instincts over your eyes.',
        'If you survive the Sanctum, you will find paths to older, stranger places. Places even the Tyrant fears.'
      ]},

      // --- Moving platforms: lifelines over the shadow pit ---
      { type: 'moving_platform', x: 17, y: 16, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: 16, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 24, y: 15, axis: 'y', range: 96, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 13, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 1.2, spin: 0 },

      // --- Staggered crushers above the pit ---
      { type: 'crusher', x: 16, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 25, y: 1, dropDist: 6, downTime: 450, upTime: 2200, phase: 'down' },
      { type: 'crusher', x: 33, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up' },

      // --- Lasers across mid tier ---
      { type: 'laser_beam', x: 12, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: 37, y: 11, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 650 },

      // --- Pendulum wardens sweep the mid tier ---
      { type: 'pendulum_trap', x: 19, y: 8, length: 88, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 30, y: 8, length: 88, swing: 48, speed: 1.7, phase: 1.2 },

      // --- Crumble path to the top door ---
      { type: 'crumble_platform', x: 16, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 20, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 29, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 33, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 24, y: 7, collapseDelay: 380, respawnDelay: 2400 },

      // --- Arrow turrets from both walls ---
      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },

      // --- Phase platforms bridging the pit when active ---
      { type: 'phase_platform', x: 17, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 30, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 650 },

      // --- Saw blades drilling from the pit floor ---
      { type: 'saw_blade', x: 19, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 30, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0.8 },

      // --- Rewards ---
      { type: 'coin', x: 12, y: 12 },
      { type: 'coin', x: 24, y: 12 },
      { type: 'coin', x: 37, y: 12 },
      { type: 'coin', x: 13, y: 4 },
      { type: 'coin', x: 36, y: 4 },

      // --- Enemies ---
      { type: 'crawler', x: 7, y: f },
      { type: 'crawler', x: 42, y: f },
      { type: 'flyer', x: 16, y: 7 },
      { type: 'flyer', x: 33, y: 7 },
      { type: 'flyer', x: 24, y: 4 },
      { type: 'armored_flyer', x: 24, y: 11 },

      // --- Decorations ---
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
      { type: 'chain', x: 48, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 44, y: 6 },
      { type: 'ruin_arch', x: 6, y: f },
      { type: 'ruin_arch', x: 43, y: f },
      { type: 'hanging_moss', x: 20, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
      { type: 'void_rift', x: 24, y: 19 },
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
  // Spectral Nave — rebuilt as a shadow-cathedral crucible. A wide nave with
  // a deep void pit down the center, flanking wall-jump pillars, five tiers,
  // and an upper gallery reachable only via a crumble path to a top door.
  const W = 55, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 19

  // Two side platforms with a 24-wide void pit down the middle
  fillRect(tiles, H - 2, 1, H - 1, 11, 1);
  clearRect(tiles, H - 2, 12, H - 2, 42);
  fillRect(tiles, H - 2, 43, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 12, 42, 1);

  // Stepping islands across the nave
  fillRow(tiles, 17, 15, 16, 2);
  fillRow(tiles, 17, 22, 23, 2);
  fillRow(tiles, 17, 31, 32, 2);
  fillRow(tiles, 17, 38, 39, 2);

  // Wall-jump pillars framing the pit
  fillRect(tiles, 7, 12, 18, 12, 1);
  fillRect(tiles, 7, 42, 18, 42, 1);
  // Outer ascending shafts — grounded so the nave's flanks actually wall you in.
  fillRect(tiles, 6, 5, H - 3, 5, 1);
  fillRect(tiles, 6, 49, H - 3, 49, 1);

  // Mid tier choir stalls (row 13)
  fillRow(tiles, 13, 3, 4, 2);
  fillRow(tiles, 13, 50, 51, 2);
  fillRow(tiles, 13, 15, 19, 2);
  fillRow(tiles, 13, 35, 39, 2);
  fillRow(tiles, 13, 24, 30, 2);

  // Upper tier (row 9)
  fillRow(tiles, 9, 7, 11, 2);
  fillRow(tiles, 9, 43, 47, 2);
  fillRow(tiles, 9, 21, 25, 2);
  fillRow(tiles, 9, 29, 33, 2);

  // Top gallery (row 5)
  fillRow(tiles, 5, 12, 16, 2);
  fillRow(tiles, 5, 38, 42, 2);

  // Vaulted ceiling arches
  fillRect(tiles, 2, 6, 4, 22, 1);
  fillRect(tiles, 2, 32, 4, 48, 1);

  // Door openings — left to room19, right to room21, plus a top exit
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  clearRect(tiles, 0, 26, 0, 28);
  fillRow(tiles, 4, 25, 29, 2);

  return {
    name: 'Spectral Nave',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room19', x: 1, y: f, spawnX: 21, spawnY: 27 },
      { type: 'door', targetRoom: 'room21', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'door', targetRoom: 'room21', x: 27, y: 2, spawnX: 2, spawnY: 21 },
      { type: 'merchant_shop', x: 5, y: 12, items: [
        { name: 'Health Refill', cost: 5, type: 'heal' },
        { name: 'Max HP +1', cost: 20, type: 'maxhp' }
      ], dialogue: [
        'Shadows make fine customers — they never haggle. You, however, look like the haggling type.',
        'Coin for health, coin for power. Spend wisely — the Shadow Warden ahead does not forgive mistakes.'
      ]},

      // Lifelines over the void pit
      { type: 'moving_platform', x: 19, y: 16, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 35, y: 16, axis: 'x', range: 96, speed: 1.0, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 27, y: 15, axis: 'y', range: 96, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 14, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 40, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 1.2, spin: 0 },

      // Staggered crushers above the nave
      { type: 'crusher', x: 18, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 27, y: 1, dropDist: 6, downTime: 450, upTime: 2200, phase: 'down' },
      { type: 'crusher', x: 36, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up' },

      // Lasers crossing the mid tier
      { type: 'laser_beam', x: 13, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: 41, y: 11, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 650 },

      // Spectral pendulums sweeping the mid tier
      { type: 'pendulum_trap', x: 21, y: 8, length: 88, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 33, y: 8, length: 88, swing: 48, speed: 1.7, phase: 1.2 },

      // Crumble path up to the top gallery
      { type: 'crumble_platform', x: 17, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 21, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 33, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 37, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 27, y: 7, collapseDelay: 380, respawnDelay: 2400 },

      // Arrow turrets from both walls
      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },

      // Saw blades drilling from the pit
      { type: 'saw_blade', x: 21, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 33, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0.8 },

      // Phase platforms bridging the pit
      { type: 'phase_platform', x: 18, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 33, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 650 },

      { type: 'lore_fragment', x: 8, y: 19, text: "A hymnal of the Spectral Order — their chants still echo in the vaults." },
      { type: 'health_pickup', x: 46, y: 19 },
      { type: 'health_pickup', x: 47, y: 19 },

      { type: 'coin', x: 14, y: 12 },
      { type: 'coin', x: 27, y: 12 },
      { type: 'coin', x: 40, y: 12 },
      { type: 'coin', x: 14, y: 4 },
      { type: 'coin', x: 40, y: 4 },
      { type: 'coin', x: 27, y: 6 },

      { type: 'crawler', x: 8, y: f },
      { type: 'crawler', x: 46, y: f },
      { type: 'flyer', x: 19, y: 7 },
      { type: 'flyer', x: 35, y: 7 },
      { type: 'flyer', x: 27, y: 4 },
      { type: 'armored_flyer', x: 27, y: 11 },

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
      { type: 'crystal', x: 48, y: f },
      { type: 'crystal_cluster', x: 9, y: f },
      { type: 'crystal_cluster', x: 46, y: f },
      { type: 'light_beam', x: 16, y: 1 },
      { type: 'light_beam', x: 32, y: 1 },
      { type: 'light_beam', x: 48, y: 1 },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 30, y: 4 },
      { type: 'glow_spore', x: 46, y: 6 },
      { type: 'ruin_arch', x: 4, y: f },
      { type: 'ruin_arch', x: 49, y: f },
      { type: 'hanging_moss', x: 18, y: 2 },
      { type: 'hanging_moss', x: 38, y: 2 },
      { type: 'void_rift', x: 27, y: 19 },
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

  // Shadow arena pillars — grounded so the warden's flanks aren't just
  // floating decor you can run under.
  fillRect(tiles, 4, 12, H - 3, 12, 1);
  fillRect(tiles, 4, W - 13, H - 3, W - 13, 1);

  // Vaulted ceiling
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 18, 4, 26);

  // Shadow pits near pillars
  clearRect(tiles, H - 2, 13, H - 2, 16);
  clearRect(tiles, H - 2, W - 17, H - 2, W - 14);

  // Terrain bumps
  fillRect(tiles, f, 10, f + 1, 11, 1);
  fillRect(tiles, f, W - 12, f + 1, W - 11, 1);

  // Maze barriers — warden's arena forces a measured approach.
  climbWall(tiles, 19, f, 3);
  climbWall(tiles, 26, f, 3);
  climbWall(tiles, 35, f, 3);

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
      // New hazards — Shadow Warden trial
      { type: 'crusher', x: 22, y: 1, dropDist: 5, downTime: 400, upTime: 1900, phase: 'top' },
      { type: 'laser_beam', x: 2, y: 7, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 11, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 650 },
      { type: 'arrow_turret', x: 2, y: 17, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 17, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },
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
    ambience: 'tunnel',
  };
}

// ═══════════════════════════════════════════════════════════════
//  ANCIENT LIBRARY  (rooms 22–25)
// ═══════════════════════════════════════════════════════════════

function buildRoom22() {
  // Ruined Archives — rebuilt as a library crucible. The central aisle has
  // collapsed into a deep pit; toppled shelves frame it as wall-jump columns;
  // falling books, pendulum censers, and arrow traps from the old scholars'
  // wards make the crossing a gauntlet.
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3; // 19

  // ----- Floor: two side platforms around a 22-wide collapse pit -----
  fillRect(tiles, H - 2, 1, H - 1, 10, 1);
  clearRect(tiles, H - 2, 11, H - 2, 38);
  fillRect(tiles, H - 2, 39, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 11, 38, 1);

  // ----- Stepping islands over the pit (low tier, row 17) -----
  fillRow(tiles, 17, 14, 15, 2);
  fillRow(tiles, 17, 21, 22, 2);
  fillRow(tiles, 17, 28, 29, 2);
  fillRow(tiles, 17, 34, 35, 2);

  // ----- Toppled-shelf wall-jump pillars -----
  fillRect(tiles, 7, 11, 18, 11, 1);
  fillRect(tiles, 7, 38, 18, 38, 1);
  // Outer ascending shafts — grounded so the library's flanks really block.
  fillRect(tiles, 6, 5, H - 3, 5, 1);
  fillRect(tiles, 6, 44, H - 3, 44, 1);

  // ----- Mid tier shelves (row 13) -----
  fillRow(tiles, 13, 3, 4, 2);
  fillRow(tiles, 13, 45, 46, 2);
  fillRow(tiles, 13, 14, 18, 2);
  fillRow(tiles, 13, 31, 35, 2);
  fillRow(tiles, 13, 22, 27, 2);

  // ----- Upper tier shelves (row 9) -----
  fillRow(tiles, 9, 7, 10, 2);
  fillRow(tiles, 9, 39, 42, 2);
  fillRow(tiles, 9, 20, 23, 2);
  fillRow(tiles, 9, 26, 29, 2);

  // ----- Top gallery (row 5) -----
  fillRow(tiles, 5, 11, 15, 2);
  fillRow(tiles, 5, 34, 38, 2);

  // Crumbling ceiling
  fillRect(tiles, 2, 6, 4, 20, 1);
  fillRect(tiles, 2, 29, 4, 44, 1);

  // ----- Door openings: side doors + top tower door (scholar's tower) -----
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  clearRect(tiles, 0, 24, 0, 26);
  fillRow(tiles, 4, 23, 27, 2);

  return {
    name: 'Ruined Archives',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room21', x: 1, y: f, spawnX: 41, spawnY: 21 },
      { type: 'door', targetRoom: 'room23', x: W - 2, y: f, spawnX: 2, spawnY: 29 },
      { type: 'door', targetRoom: 'room23', x: 25, y: 2, spawnX: 21, spawnY: 3 },
      { type: 'npc', npcType: 'hermit', x: 7, y: f, dialogue: [
        'Welcome to the Ruined Archives. Or what remains of them.',
        'These shelves once held every text ever written in the kingdom of Ur-Karath. Treaties, poems, histories — all of it.',
        'When the Bone Tyrant turned, the scholars tried to preserve what they could. They failed. The knowledge rotted with the rest.',
        'But fragments remain. The walls themselves hold echoes of what was written here. If you listen closely, you can almost hear the words.',
        'The Scholar\'s Tower above still stands, mostly. If you can reach the top, you may find something worth the climb.'
      ]},

      // --- Moving shelves: lifelines over the collapse pit ---
      { type: 'moving_platform', x: 17, y: 16, axis: 'x', range: 96, speed: 1.0, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: 16, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 24, y: 15, axis: 'y', range: 96, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 13, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 1.2, spin: 0 },

      // --- Falling masonry from the collapsing ceiling ---
      { type: 'falling_rocks', x: 17, y: 4, interval: 2400, phase: 0 },
      { type: 'falling_rocks', x: 24, y: 4, interval: 2400, phase: 1200 },
      { type: 'falling_rocks', x: 31, y: 4, interval: 2400, phase: 600 },

      // --- Ancient crusher wards above the pit ---
      { type: 'crusher', x: 16, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 33, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up' },

      // --- Warding lasers across the mid aisle ---
      { type: 'laser_beam', x: 12, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: 37, y: 11, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 650 },

      // --- Censer pendulums swinging over the mid tier ---
      { type: 'pendulum_trap', x: 19, y: 8, length: 88, swing: 48, speed: 1.6, phase: 0 },
      { type: 'pendulum_trap', x: 30, y: 8, length: 88, swing: 48, speed: 1.6, phase: 1.2 },

      // --- Crumbling shelves to the top gallery ---
      { type: 'crumble_platform', x: 16, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 20, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 30, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 33, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 24, y: 7, collapseDelay: 380, respawnDelay: 2400 },

      // --- Arrow turrets from the old wards ---
      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },

      // --- Phase platforms bridging the worst gaps ---
      { type: 'phase_platform', x: 17, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 30, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 650 },

      // --- Rewards ---
      { type: 'coin', x: 12, y: 12 },
      { type: 'coin', x: 24, y: 12 },
      { type: 'coin', x: 37, y: 12 },
      { type: 'coin', x: 13, y: 4 },
      { type: 'coin', x: 36, y: 4 },
      { type: 'coin', x: 25, y: 6 },
      { type: 'secret_wall', x: 44, y: 17, hitsToBreak: 2, targetRoom: 'sanctuary2', spawnX: 3, spawnY: 14 },
      { type: 'lore_fragment', x: 45, y: 17, text: 'A scholar\'s confession: "We called it Void. It called us first." ' },
      { type: 'health_pickup', x: 46, y: 17 },

      // --- Enemies ---
      { type: 'spitter', x: 7, y: f },
      { type: 'crawler', x: 42, y: f },
      { type: 'flyer', x: 16, y: 7 },
      { type: 'flyer', x: 33, y: 7 },
      { type: 'flyer', x: 24, y: 4 },
      { type: 'armored_flyer', x: 24, y: 11 },

      // --- Decorations ---
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
      { type: 'ruin_arch', x: 6, y: f },
      { type: 'ruin_arch', x: 43, y: f },
      { type: 'hanging_moss', x: 20, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
      { type: 'fungal_bloom_large', x: 3, y: f },
      { type: 'fungus', x: 46, y: f },
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
      // New hazards — Scholar's Tower climb
      { type: 'crusher', x: 16, y: 4, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 6, y: 16, dropDist: 3, downTime: 380, upTime: 1900, phase: 'up' },
      { type: 'laser_beam', x: 2, y: 19, dir: 'right', length: 7, onTime: 1100, offTime: 1200, phase: 0 },
      { type: 'arrow_turret', x: 2, y: 25, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
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
  // Forbidden Stacks — deep-archive crucible. A central collapse pit with
  // toppled-shelf wall-jump columns, five tiers, and crumble stones leading
  // to a top exit to the Scholar's Tower.
  const W = 55, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  // Two side platforms with a 24-wide central pit
  fillRect(tiles, H - 2, 1, H - 1, 11, 1);
  clearRect(tiles, H - 2, 12, H - 2, 42);
  fillRect(tiles, H - 2, 43, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 12, 42, 1);

  // Stepping islands
  fillRow(tiles, 17, 15, 16, 2);
  fillRow(tiles, 17, 22, 23, 2);
  fillRow(tiles, 17, 31, 32, 2);
  fillRow(tiles, 17, 38, 39, 2);

  // Wall-jump pillars — grounded so they actually wall off the sprint lane.
  fillRect(tiles, 7, 12, H - 3, 12, 1);
  fillRect(tiles, 7, 42, H - 3, 42, 1);
  fillRect(tiles, 6, 5, 16, 5, 1);
  fillRect(tiles, 6, 49, 16, 49, 1);

  // Mid tier (row 13)
  fillRow(tiles, 13, 3, 4, 2);
  fillRow(tiles, 13, 50, 51, 2);
  fillRow(tiles, 13, 15, 19, 2);
  fillRow(tiles, 13, 35, 39, 2);
  fillRow(tiles, 13, 24, 30, 2);

  // Upper tier (row 9)
  fillRow(tiles, 9, 7, 11, 2);
  fillRow(tiles, 9, 43, 47, 2);
  fillRow(tiles, 9, 21, 25, 2);
  fillRow(tiles, 9, 29, 33, 2);

  // Top gallery (row 5)
  fillRow(tiles, 5, 12, 16, 2);
  fillRow(tiles, 5, 38, 42, 2);

  // Ceiling
  fillRect(tiles, 2, 6, 4, 22, 1);
  fillRect(tiles, 2, 32, 4, 48, 1);

  // Doors — sides + top exit
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  clearRect(tiles, 0, 26, 0, 28);
  fillRow(tiles, 4, 25, 29, 2);

  return {
    name: 'Forbidden Stacks',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room23', x: 1, y: f, spawnX: 18, spawnY: 4 },
      { type: 'door', targetRoom: 'room25', x: W - 2, y: f, spawnX: 2, spawnY: 21 },
      { type: 'door', targetRoom: 'room25', x: 27, y: 2, spawnX: 2, spawnY: 21 },
      { type: 'merchant_shop', x: 5, y: 12, items: [
        { name: 'Health Refill', cost: 5, type: 'heal' },
        { name: 'Max HP +1', cost: 25, type: 'maxhp' }
      ], dialogue: [
        'They say forbidden knowledge has a price. So does forbidden merchandise, apparently.',
        'Stock up while you can. The Archive Sentinel does not appreciate browsing without buying.'
      ]},

      // Lifelines
      { type: 'moving_platform', x: 19, y: 16, axis: 'x', range: 96, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 35, y: 16, axis: 'x', range: 96, speed: 1.1, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 27, y: 15, axis: 'y', range: 96, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 14, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 40, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 1.2, spin: 0 },

      // Crushers
      { type: 'crusher', x: 18, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 27, y: 1, dropDist: 6, downTime: 450, upTime: 2200, phase: 'down' },
      { type: 'crusher', x: 36, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up' },

      // Lasers + arrow turrets (scholars' wards)
      { type: 'laser_beam', x: 13, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: 41, y: 11, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 650 },
      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },

      // Falling masonry from the ceiling
      { type: 'falling_rocks', x: 19, y: 4, interval: 2400, phase: 0 },
      { type: 'falling_rocks', x: 27, y: 4, interval: 2400, phase: 1200 },
      { type: 'falling_rocks', x: 35, y: 4, interval: 2400, phase: 600 },

      // Pendulum censers
      { type: 'pendulum_trap', x: 21, y: 8, length: 88, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 33, y: 8, length: 88, swing: 48, speed: 1.7, phase: 1.2 },

      // Crumble path to the tower
      { type: 'crumble_platform', x: 17, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 21, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 33, y: 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 37, y: 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 27, y: 7, collapseDelay: 380, respawnDelay: 2400 },

      // Saw blades drilling from the pit
      { type: 'saw_blade', x: 21, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 33, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0.8 },

      // Phase platforms bridging the pit
      { type: 'phase_platform', x: 18, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 33, y: 19, width: 4, onTime: 1300, offTime: 900, phase: 650 },

      // Coins rewarding all three tiers
      { type: 'coin', x: 14, y: 12 },
      { type: 'coin', x: 27, y: 12 },
      { type: 'coin', x: 40, y: 12 },
      { type: 'coin', x: 14, y: 4 },
      { type: 'coin', x: 40, y: 4 },
      { type: 'coin', x: 27, y: 6 },
      { type: 'coin', x: 6, y: 12 },
      { type: 'coin', x: 48, y: 12 },

      // Enemies
      { type: 'crawler', x: 8, y: f },
      { type: 'crawler', x: 46, y: f },
      { type: 'armored_flyer', x: 27, y: 11 },
      { type: 'flyer', x: 19, y: 7 },
      { type: 'flyer', x: 35, y: 7 },
      { type: 'flyer', x: 27, y: 4 },

      { type: 'fungus', x: 4, y: f },
      { type: 'fungus', x: 48, y: f },
      { type: 'fungus_small', x: 10, y: f },
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
      { type: 'ruin_arch', x: 6, y: f },
      { type: 'ruin_arch', x: 48, y: f },
      { type: 'hanging_moss', x: 16, y: 2 },
      { type: 'hanging_moss', x: 36, y: 2 },
      { type: 'fungal_bloom_large', x: 46, y: 19 },
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

  // Archive sentinels — pillars, grounded so the sentinel's flanks really wall.
  fillRect(tiles, 4, 12, H - 3, 12, 1);
  fillRect(tiles, 4, W - 13, H - 3, W - 13, 1);

  // Vaulted ceiling
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 18, 4, 26);

  // Floor pits
  clearRect(tiles, H - 2, 13, H - 2, 16);
  clearRect(tiles, H - 2, W - 17, H - 2, W - 14);

  // Terrain bumps
  fillRect(tiles, f, 10, f + 1, 11, 1);
  fillRect(tiles, f, W - 12, f + 1, W - 11, 1);

  // Maze barriers — rubble blocks the aisle to the sentinel.
  climbWall(tiles, 19, f, 3);
  climbWall(tiles, 25, f, 3);
  climbWall(tiles, 35, f, 3);

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
    ambience: 'tunnel_fungal',
  };
}

// ═══════════════════════════════════════════════════════════════
//  VOID NEXUS  (rooms 26–29)
// ═══════════════════════════════════════════════════════════════

function buildRoom26() {
  // Void Threshold — the final approach. A yawning void pit dominates the
  // center. Wall-jump pillars, multi-tier platforms, and a crumble path to a
  // top exit for the bravest.
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;

  fillRect(tiles, H - 2, 1, H - 1, 10, 1);
  clearRect(tiles, H - 2, 11, H - 2, 38);
  fillRect(tiles, H - 2, 39, H - 1, W - 2, 1);
  fillRow(tiles, H - 1, 11, 38, 1);

  fillRow(tiles, 17, 14, 15, 2);
  fillRow(tiles, 17, 20, 21, 2);
  fillRow(tiles, 17, 28, 29, 2);
  fillRow(tiles, 17, 34, 35, 2);

  fillRect(tiles, 7, 11, 18, 11, 1);
  fillRect(tiles, 7, 38, 18, 38, 1);
  fillRect(tiles, 6, 5, H - 3, 5, 1);
  fillRect(tiles, 6, 44, H - 3, 44, 1);

  fillRow(tiles, 13, 3, 4, 2);
  fillRow(tiles, 13, 45, 46, 2);
  fillRow(tiles, 13, 14, 17, 2);
  fillRow(tiles, 13, 32, 35, 2);
  fillRow(tiles, 13, 22, 27, 2);

  fillRow(tiles, 9, 7, 10, 2);
  fillRow(tiles, 9, 39, 42, 2);
  fillRow(tiles, 9, 19, 22, 2);
  fillRow(tiles, 9, 27, 30, 2);

  fillRow(tiles, 5, 11, 14, 2);
  fillRow(tiles, 5, 35, 38, 2);

  fillRect(tiles, 2, 6, 4, 20, 1);
  fillRect(tiles, 2, 29, 4, 44, 1);

  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  clearRect(tiles, 0, 24, 0, 26);
  fillRow(tiles, 4, 23, 27, 2);

  return {
    name: 'Void Threshold',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room25', x: 1, y: f, spawnX: 41, spawnY: 21 },
      { type: 'door', targetRoom: 'room27', x: W - 2, y: f, spawnX: 2, spawnY: 29 },
      { type: 'door', targetRoom: 'room27', x: 25, y: 2, spawnX: 4, spawnY: 29 },
      { type: 'npc', npcType: 'knight', x: 5, y: f, dialogue: [
        'Halt. I know that look — the look of someone who has come too far to turn back.',
        'Beyond this threshold lies the Void Nexus. It is not a place that belongs to our world.',
        'The Bone Tyrant tried to harness the Void\'s power. Instead, it consumed the deepest parts of his kingdom.',
        'The creatures here are not his subjects — they are something else entirely. Fragments of emptiness given form.',
        'I have stood watch here for... I cannot remember how long. If you enter the Nexus, there may be no return.',
        'But if you are strong enough to reach the Void King, you may end this curse once and for all. Go with whatever courage you have left.'
      ]},

      { type: 'moving_platform', x: 17, y: 16, axis: 'x', range: 96, speed: 1.2, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: 16, axis: 'x', range: 96, speed: 1.3, phase: 1.0, spin: 0 },
      { type: 'moving_platform', x: 24, y: 15, axis: 'y', range: 96, speed: 0.9, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 13, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 36, y: 11, axis: 'y', range: 64, speed: 1.1, phase: 1.2, spin: 0 },

      { type: 'crusher', x: 16, y: 1, dropDist: 5, downTime: 380, upTime: 1900, phase: 'top' },
      { type: 'crusher', x: 25, y: 1, dropDist: 6, downTime: 420, upTime: 2100, phase: 'down' },
      { type: 'crusher', x: 33, y: 1, dropDist: 5, downTime: 380, upTime: 1900, phase: 'up' },

      { type: 'laser_beam', x: 12, y: 11, dir: 'right', length: 8, onTime: 1100, offTime: 1200, phase: 0 },
      { type: 'laser_beam', x: 37, y: 11, dir: 'left', length: 8, onTime: 1100, offTime: 1200, phase: 650 },

      { type: 'pendulum_trap', x: 19, y: 8, length: 88, swing: 48, speed: 2.0, phase: 1.0 },
      { type: 'pendulum_trap', x: 30, y: 8, length: 88, swing: 48, speed: 1.8, phase: 0.5 },

      { type: 'crumble_platform', x: 16, y: 4, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 20, y: 3, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 29, y: 3, collapseDelay: 320, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 33, y: 4, collapseDelay: 350, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 24, y: 7, collapseDelay: 320, respawnDelay: 2000 },

      { type: 'saw_blade', x: 19, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 30, y: 17, axis: 'y', range: 80, speed: 1.3, phase: 0.8 },

      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 13, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },

      { type: 'phase_platform', x: 17, y: 19, width: 4, onTime: 1200, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 30, y: 19, width: 4, onTime: 1200, offTime: 900, phase: 600 },

      { type: 'void_rift', x: 24, y: 19 },
      { type: 'void_rift', x: 17, y: 17 },
      { type: 'void_rift', x: 32, y: 17 },

      { type: 'checkpoint_shrine', x: 4, y: 19 },
      { type: 'lore_fragment', x: 45, y: 19, text: "At the Void Threshold, reality thins. The King waits beyond." },

      { type: 'coin', x: 13, y: 12 },
      { type: 'coin', x: 24, y: 12 },
      { type: 'coin', x: 37, y: 12 },
      { type: 'coin', x: 13, y: 4 },
      { type: 'coin', x: 37, y: 4 },
      { type: 'coin', x: 24, y: 6 },

      { type: 'crawler', x: 7, y: f },
      { type: 'crawler', x: 42, y: f },
      { type: 'flyer', x: 17, y: 7 },
      { type: 'flyer', x: 33, y: 7 },
      { type: 'flyer', x: 24, y: 4 },
      { type: 'armored_flyer', x: 24, y: 11 },

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
      { type: 'crystal', x: 42, y: f },
      { type: 'crystal_cluster', x: 9, y: f },
      { type: 'crystal_cluster', x: 45, y: f },
      { type: 'glow_spore', x: 14, y: 6 },
      { type: 'glow_spore', x: 28, y: 4 },
      { type: 'glow_spore', x: 42, y: 6 },
      { type: 'ruin_arch', x: 8, y: f },
      { type: 'ruin_arch', x: 43, y: f },
      { type: 'gravel_patch', x: 3, y: f },
      { type: 'mud_patch', x: 48, y: f },
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
      // Crucible pack — the spire narrows its teeth at every tier.
      { type: 'crusher', x: 6, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 20, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'laser_beam', x: 2, y: 9, dir: 'right', length: 8, onTime: 1000, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 15, dir: 'left', length: 8, onTime: 1000, offTime: 1300, phase: 600 },
      { type: 'pendulum_trap', x: 14, y: 11, length: 80, swing: 42, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 6, y: 19, length: 72, swing: 40, speed: 1.7, phase: 1.0 },
      { type: 'saw_blade', x: 18, y: 23, axis: 'x', range: 80, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 10, y: 17, axis: 'y', range: 64, speed: 1.2, phase: 0.5 },
      { type: 'arrow_turret', x: 2, y: 13, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 21, dir: 'left', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'phase_platform', x: 11, y: 6, width: 3, onTime: 1200, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 14, y: 13, width: 3, onTime: 1200, offTime: 900, phase: 500 },
      { type: 'void_rift', x: 8, y: 24 },
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

  // Arena pillars — outer pair grounded so they block the flanks; inner
  // pair hangs over the central pit as wall-jump markers.
  fillRect(tiles, 3, 8, H - 3, 8, 1);
  fillRect(tiles, 3, 46, H - 3, 46, 1);
  fillRect(tiles, 3, 20, 8, 20, 1);
  fillRect(tiles, 3, 34, 8, 34, 1);

  // Vaulted ceiling
  fillRect(tiles, 2, 6, 4, 22, 1);
  fillRect(tiles, 2, 32, 4, 48, 1);

  // Maze barriers — the final approach. Both banks of the lava pit
  // require climbing over rubble, not a clean sprint to the platforms.
  climbWall(tiles, 10, f, 3);
  climbWall(tiles, 48, f, 3);

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
      // New hazards — Convergence approach
      { type: 'crusher', x: 14, y: 2, dropDist: 5, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 27, y: 2, dropDist: 5, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 40, y: 2, dropDist: 5, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: 17, dir: 'right', length: 13, onTime: 1100, offTime: 1200, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 17, dir: 'left', length: 13, onTime: 1100, offTime: 1200, phase: 650 },
      { type: 'phase_platform', x: 18, y: 22, width: 6, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 30, y: 22, width: 6, onTime: 1300, offTime: 900, phase: 650 },
      { type: 'arrow_turret', x: 2, y: 21, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 21, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 120 },
      // Crucible pack — Convergence takes its final tithe before the king's hall.
      { type: 'crusher', x: 8, y: 2, dropDist: 5, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'crusher', x: 48, y: 2, dropDist: 5, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'saw_blade', x: 22, y: 18, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 32, y: 12, axis: 'y', range: 96, speed: 1.2, phase: 0.7 },
      { type: 'saw_blade', x: 44, y: 15, axis: 'y', range: 80, speed: 1.3, phase: 0.3 },
      { type: 'pendulum_trap', x: 20, y: 6, length: 88, swing: 46, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 27, y: 3, length: 80, swing: 42, speed: 1.9, phase: 0.5 },
      { type: 'pendulum_trap', x: 34, y: 6, length: 88, swing: 46, speed: 1.8, phase: 1.0 },
      { type: 'crumble_platform', x: 20, y: 16, collapseDelay: 350, respawnDelay: 2000 },
      { type: 'crumble_platform', x: 34, y: 16, collapseDelay: 350, respawnDelay: 2000 },
      { type: 'moving_platform', x: 27, y: 9, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'void_rift', x: 20, y: 22 },
      { type: 'void_rift', x: 34, y: 22 },
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

  // Arena pillars framing the center — grounded so the king's arena has
  // real walls, not floating banners.
  fillRect(tiles, 4, 12, H - 3, 12, 1);
  fillRect(tiles, 4, W - 13, H - 3, W - 13, 1);

  // Throne ceiling — oppressive stone dome
  fillRect(tiles, 2, 4, 5, W - 5, 1);
  clearRect(tiles, 3, 20, 4, 28);

  // Terrain bumps near sides
  fillRect(tiles, f, 8, f + 1, 10, 1);
  fillRect(tiles, f, W - 11, f + 1, W - 9, 1);

  // Door opening on left
  clearRect(tiles, f - 2, 0, f + 1, 0);

  // East chapter-2 exit: tile opening is pre-carved but sealed by a crumble
  // wall until the Void King falls and chapter2_unlocked is set. The seal
  // spawns via objects so it can be filtered by world flags.
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);

  return {
    name: 'The Void King',
    width: W,
    height: H,
    tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room28', x: 1, y: f, spawnX: 52, spawnY: 23 },
      { type: 'boss', bossType: 'void_king', x: 30, y: f, hiddenIfBoss: 'boss_room29' },
      { type: 'crumble_wall', id: 'chapter2_gate', x: W - 1, y: f - 2, w: 1, h: 4,
        hiddenIfFlag: 'chapter2_unlocked' },
      { type: 'door', targetRoom: 'room30', x: W - 2, y: f, spawnX: 2, spawnY: 14,
        requiresFlag: 'chapter2_unlocked' },
      { type: 'lore_fragment', id: 'ch2_unlock', x: 32, y: f, requiresFlag: 'chapter2_unlocked',
        text: 'A wind smelling of pine and rain blows through the broken stone. The world above remembers.' },
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
  ...ch2Rooms,
};
