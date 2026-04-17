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

// Maze-building primitives. A `climbWall` is a short solid pillar rising
// from the floor that the player has to jump over (usually with help from
// nearby platforms). A `duckWall` hangs from the ceiling and leaves a
// crawlspace above the floor that the player must drop under. Use both
// in sequence to force a zig-zag routing through a room.
function climbWall(tiles, col, floorRow, height) {
  for (let r = floorRow - height + 1; r <= floorRow; r++) setTile(tiles, r, col, 1);
}
function duckWall(tiles, col, floorRow, gapFromFloor) {
  for (let r = 1; r <= floorRow - gapFromFloor; r++) setTile(tiles, r, col, 1);
}

// ================ MOUNTAIN BIOME (30-36) ==================================

function buildRoom30() {
  // Entrance from the Void King throne — a cavern mouth that opens into
  // open mountain air. Now wider so the first gasp of "surface world"
  // reads as a vista, with an optional low path for secrets and a high
  // path for the stepped climb.
  const W = 52, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Stepped ledges going up and east — this is the main path
  fillRow(tiles, f - 3, 6, 12, 2);
  fillRow(tiles, f - 5, 14, 20, 2);
  fillRow(tiles, f - 3, 22, 28, 2);
  fillRow(tiles, f - 6, 30, 36, 2);
  fillRow(tiles, f - 4, 38, 44, 2);
  // Hidden low alcove behind the eastern pillar — slash the secret wall
  // at (47, f) to pop it, alcove carved below
  clearRect(tiles, f, 46, f, 50);
  // Maze barriers: force the player to actually use the stepped ledges
  // instead of sprinting the floor. A low crag, a low overhang, another
  // crag — the direct path is closed.
  climbWall(tiles, 13, f, 3);
  duckWall(tiles, 21, f, 3);
  climbWall(tiles, 29, f, 4);
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
          'Watch the stones — some are hollow. Some hide what the old kings left.',
        ] },
      { type: 'checkpoint_shrine', x: 5, y: f },
      // First secret of Chapter 2: a soul_crystal tucked behind a crumbling stone
      { type: 'secret_wall', x: 46, y: f, hitsToBreak: 2 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 48, y: f - 1 },
      // Coin trail along the ledges — introduces the risk/reward pattern
      { type: 'coin', x: 10, y: f - 4 },
      { type: 'coin', x: 17, y: f - 6 },
      { type: 'coin', x: 25, y: f - 4 },
      { type: 'coin', x: 33, y: f - 7 },
      { type: 'coin', x: 41, y: f - 5 },
      // First hawk to introduce the aerial threat
      { type: 'hawk_diver', x: 34, y: 5 },
      { type: 'pine_tree', x: 12, y: f },
      { type: 'pine_tree', x: 24, y: f },
      { type: 'pine_tree', x: 42, y: f },
      { type: 'snow_rock', x: 30, y: f },
      { type: 'snow_rock', x: 38, y: f },
      { type: 'mountain_flag', x: 37, y: f - 6 },
      { type: 'fog_bank', x: 20, y: 4 },
      { type: 'fog_bank', x: 36, y: 3 },
      { type: 'lore_fragment', id: 'ch2_intro', x: 14, y: f - 4,
        text: 'Scratched on a wind-bitten stone: "The kings below are done. The long roads call again."' },
      { type: 'lore_fragment', id: 'ch2_intro2', x: 33, y: f - 8,
        text: 'A pilgrim\'s cairn: "Take the step you fear. The mountain keeps no grudge against the climber."' },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom31() {
  const W = 48, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 4, W - 1, 8, W - 1);
  // rising zigzag over a chasm
  clearRect(tiles, H - 2, 10, H - 1, 22); // chasm
  fillRow(tiles, f - 2, 6, 9, 2);
  fillRow(tiles, f - 4, 12, 18, 2);
  fillRow(tiles, f - 6, 20, 26, 2);
  fillRow(tiles, f - 8, 28, 34, 2);
  fillRow(tiles, f - 10, 34, 42, 2);
  fillRow(tiles, f - 12, 40, 46, 2);
  // Hidden overhang alcove above the zigzag — reward for exploring up
  clearRect(tiles, 3, 24, 3, 27);
  return {
    name: 'Cragstep Ascent',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room30', x: 1, y: f, spawnX: W - 5, spawnY: H - 3 },
      { type: 'door', targetRoom: 'room32', x: W - 2, y: 6, spawnX: 2, spawnY: 16 },
      // Dueling enemy pressure from above and below
      { type: 'ibex_ram', x: 16, y: f - 5 },
      { type: 'ibex_ram', x: 36, y: f - 11 },
      { type: 'rock_hurler', x: 30, y: f - 11 },
      { type: 'hawk_diver', x: 22, y: 4 },
      { type: 'falling_rocks', x: 16, y: f, interval: 2600, dropHeight: 10 },
      { type: 'falling_rocks', x: 32, y: f, interval: 2200, dropHeight: 14 },
      // Mid-chasm coin lure — risk the plunge for the reward
      { type: 'coin', x: 11, y: f },
      { type: 'coin', x: 16, y: f },
      { type: 'coin', x: 21, y: f },
      { type: 'coin', x: 24, y: f - 7 },
      { type: 'coin', x: 32, y: f - 9 },
      { type: 'coin', x: 40, y: f - 11 },
      // Secret stash at the top — slash to reveal
      { type: 'secret_wall', x: 23, y: 3, hitsToBreak: 2 },
      { type: 'coin', x: 25, y: 3 },
      { type: 'coin', x: 26, y: 3 },
      { type: 'health_pickup', x: 27, y: 3 },
      { type: 'pine_tree', x: 8, y: f },
      { type: 'pine_tree', x: 38, y: f - 11 },
      { type: 'snow_rock', x: 24, y: f - 7 },
      { type: 'crystal', x: 36, y: f - 11 },
      // Hazards — cragstep is meant to punish a careless climb
      { type: 'crusher', x: 16, y: 1, dropDist: 4, downTime: 380, upTime: 2100, phase: 'top' },
      { type: 'crusher', x: 32, y: 1, dropDist: 4, downTime: 380, upTime: 2100, phase: 'up' },
      { type: 'arrow_turret', x: 2, y: f - 3, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'lore_fragment', id: 'cragstep_lore', x: 8, y: f,
        text: 'Cairn-carved: "Count the stones you leave behind. Count the stones that remain. One counts you back."' },
      // Crucible pack — turn cragstep into a proper climbing gauntlet.
      { type: 'pendulum_trap', x: 24, y: f - 9, length: 96, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 38, y: f - 11, length: 72, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'saw_blade', x: 20, y: f - 1, axis: 'x', range: 96, speed: 1.2, phase: 0 },
      { type: 'saw_blade', x: 28, y: f - 3, axis: 'y', range: 80, speed: 1.3, phase: 0.8 },
      { type: 'moving_platform', x: 18, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 32, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'crumble_platform', x: 22, y: f - 4, collapseDelay: 360, respawnDelay: 2200 },
      { type: 'crumble_platform', x: 38, y: f - 9, collapseDelay: 360, respawnDelay: 2200 },
      { type: 'arrow_turret', x: W - 3, y: f - 10, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'icicle_drop', x: 20, y: 3, interval: 2500, phase: 0 },
      { type: 'icicle_drop', x: 36, y: 3, interval: 2500, phase: 800 },
      { type: 'wind_gust_zone', x: 22, y: f - 2, w: 4, h: 3, dir: 'right', strength: 180 },
    ],
    ambience: 'mountain_pass',
  };
}

function buildRoom32() {
  // Hermitage of the Wind — grants the Glide ability. Expanded into a
  // tall hermitage with a practice chamber on the east so the player
  // must actually use glide to reach the exit door.
  const W = 42, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Climbing ledges up to the orb altar
  fillRow(tiles, f - 3, 6, 10, 2);
  fillRow(tiles, f - 6, 12, 18, 2);
  fillRow(tiles, f - 9, 20, 24, 2);
  // Altar platform
  fillRect(tiles, f - 9, 12, f - 7, 18, 1);
  // Practice chamber: after grabbing the orb the player has to glide
  // down to a low eastern ledge. Without glide they just bottom out.
  fillRow(tiles, f - 3, 34, 40, 2);
  // Hidden ceiling alcove reachable via glide
  clearRect(tiles, 3, 30, 3, 34);
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
      // Practice coins across the drop — requires glide to catch them all
      { type: 'coin', x: 20, y: f - 6 },
      { type: 'coin', x: 24, y: f - 4 },
      { type: 'coin', x: 28, y: f - 3 },
      { type: 'coin', x: 32, y: f - 4 },
      { type: 'coin', x: 36, y: f - 5 },
      // Glide-only ceiling secret with a health pickup
      { type: 'secret_wall', x: 31, y: 3, hitsToBreak: 2 },
      { type: 'health_pickup', x: 33, y: 3 },
      { type: 'coin', x: 32, y: 3 },
      // Gentle aerial resistance
      { type: 'hawk_diver', x: 28, y: 6 },
      { type: 'wind_gust_zone', x: 25, y: f - 10, w: 3, h: 6, dir: 'up', strength: 240 },
      { type: 'mountain_banner', x: 10, y: 2 },
      { type: 'mountain_banner', x: 20, y: 2 },
      { type: 'mountain_banner', x: 34, y: 2 },
      { type: 'pine_tree', x: 22, y: f },
      { type: 'glow_spore', x: 14, y: f - 12 },
      { type: 'glow_spore', x: 32, y: 4 },
      { type: 'lore_fragment', id: 'glide_note', x: 15, y: f,
        text: 'The hermit left a wind-tattered letter: "The Warden fell long ago. Carry on. The peaks still need crossing."' },
      { type: 'lore_fragment', id: 'glide_hermit_2', x: 32, y: 3,
        text: 'A sparrow\'s skeleton in a stone nest — and a scrap: "To fall is to learn. To fall twice is to remember."' },
      // Crucible pack — the hermitage tests the glide with live hazards.
      { type: 'crusher', x: 14, y: 1, dropDist: 5, downTime: 420, upTime: 2100, phase: 'top' },
      { type: 'crusher', x: 28, y: 1, dropDist: 5, downTime: 420, upTime: 2100, phase: 'up' },
      { type: 'laser_beam', x: 2, y: f - 6, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 4, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'arrow_turret', x: 2, y: f - 3, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'saw_blade', x: 26, y: f - 1, axis: 'y', range: 80, speed: 1.3, phase: 0 },
      { type: 'pendulum_trap', x: 22, y: f - 11, length: 88, swing: 48, speed: 1.8, phase: 0 },
      { type: 'moving_platform', x: 30, y: f - 6, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'icicle_drop', x: 20, y: 3, interval: 2400, phase: 0 },
      { type: 'icicle_drop', x: 34, y: 3, interval: 2400, phase: 900 },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom33() {
  // The Chasm — Glide required to cross east. Densified with stepped
  // micro-ledges and mid-air coins so the glide feels like an actual
  // expressive traversal instead of one hold-button hop.
  const W = 52, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Big chasm with only a glide-reachable far ledge
  clearRect(tiles, H - 2, 12, H - 1, 40);
  // High departure ledge
  fillRow(tiles, 8, 4, 14, 2);
  // Tiny stepping ledges over the chasm — glide from one to the next
  fillRow(tiles, 10, 20, 22, 2);
  fillRow(tiles, 11, 28, 30, 2);
  // High arrival ledge
  fillRow(tiles, 6, 40, 50, 2);
  // Secret cubby beneath the starting platform — drop off and hit it
  clearRect(tiles, f, 2, f, 4);
  return {
    name: 'The Chasm of Sighs',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room32', x: 1, y: f, spawnX: 2, spawnY: 16 },
      { type: 'door', targetRoom: 'room34', x: W - 2, y: 4, spawnX: 2, spawnY: 16,
        requiresAbilities: ['glide'] },
      // Mid-air coin arcs — ride the glide to collect
      { type: 'coin', x: 17, y: 12 },
      { type: 'coin', x: 21, y: 10 },
      { type: 'coin', x: 25, y: 12 },
      { type: 'coin', x: 29, y: 11 },
      { type: 'coin', x: 34, y: 9 },
      { type: 'coin', x: 38, y: 7 },
      // Secret pocket with a bonus — slash the wall under the starting ledge
      { type: 'secret_wall', x: 5, y: f, hitsToBreak: 2 },
      { type: 'coin', x: 3, y: f },
      { type: 'health_pickup', x: 2, y: f },
      // Hazards in the sky — thin the herd on the way across
      { type: 'hawk_diver', x: 26, y: 8 },
      { type: 'hawk_diver', x: 36, y: 4 },
      { type: 'hawk_diver', x: 46, y: 5 },
      { type: 'rock_hurler', x: 48, y: 5 },
      { type: 'fog_bank', x: 26, y: H - 2 },
      { type: 'fog_bank', x: 20, y: 14 },
      { type: 'fog_bank', x: 38, y: 11 },
      { type: 'mountain_banner', x: 8, y: 6 },
      { type: 'mountain_banner', x: 44, y: 4 },
      { type: 'snow_rock', x: 6, y: f },
      { type: 'lore_fragment', id: 'chasm_sigh', x: 7, y: f,
        text: 'The wind sounds almost like singing. Or grief. Easy to mistake the two.' },
      { type: 'lore_fragment', id: 'chasm_sigh_2', x: 46, y: 5,
        text: 'An arrival-stone, half-worn: "You crossed. Tell no one how. Let them learn too."' },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom34() {
  const W = 46, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 4, 0, 8, 0); // incoming high door from chasm
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 2, 4, 12, 2);
  fillRow(tiles, f - 4, 14, 22, 2);
  fillRow(tiles, f - 2, 24, 34, 2);
  fillRow(tiles, f - 6, 28, 40, 2);
  fillRow(tiles, f - 8, 14, 20, 2);
  // Ice slick section
  fillRect(tiles, H - 2, 16, H - 2, 22, 1);
  fillRect(tiles, H - 2, 36, H - 2, 40, 1);
  // Hidden sub-floor alcove under the east ridge
  clearRect(tiles, H - 2, 42, H - 2, 44);
  // Maze barriers — the plateau makes you work for the exit, not jog it.
  duckWall(tiles, 13, f, 3);
  climbWall(tiles, 23, f, 3);
  duckWall(tiles, 33, f, 3);
  return {
    name: 'Windbite Plateau',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 6 },
    objects: [
      { type: 'door', targetRoom: 'room33', x: 1, y: 6, spawnX: W - 4, spawnY: 14 },
      { type: 'door', targetRoom: 'room35', x: W - 2, y: f - 7, spawnX: 2, spawnY: 14 },
      // Enemies pushing from both sides
      { type: 'ibex_ram', x: 10, y: f - 3 },
      { type: 'ibex_ram', x: 30, y: f - 7 },
      { type: 'rock_hurler', x: 38, y: f - 7 },
      { type: 'hawk_diver', x: 22, y: 6 },
      { type: 'snow_drift_slip', x: 20, y: f },
      { type: 'snow_drift_slip', x: 38, y: f },
      { type: 'falling_rocks', x: 16, y: f, interval: 2800, dropHeight: 10 },
      { type: 'falling_rocks', x: 32, y: f, interval: 2400, dropHeight: 8 },
      // Fresh hazard: phase platform over the ice slick gap
      { type: 'phase_platform', x: 22, y: f - 2, width: 3, onTime: 1200, offTime: 900, phase: 0 },
      // Coins scattered on the upper ledges
      { type: 'coin', x: 7, y: f - 3 },
      { type: 'coin', x: 17, y: f - 9 },
      { type: 'coin', x: 28, y: f - 7 },
      { type: 'coin', x: 35, y: f - 7 },
      { type: 'coin', x: 39, y: f - 7 },
      // Sub-floor secret — drop into the alcove and slash
      { type: 'secret_wall', x: 41, y: H - 2, hitsToBreak: 2 },
      { type: 'coin', x: 43, y: H - 2 },
      { type: 'health_pickup', x: 44, y: H - 2 },
      { type: 'pine_tree', x: 6, y: f },
      { type: 'pine_tree', x: 38, y: f },
      { type: 'snow_rock', x: 26, y: f },
      { type: 'mountain_banner', x: 32, y: f - 7 },
      { type: 'lore_fragment', id: 'windbite_lore', x: 12, y: f - 3,
        text: 'A rusted crampon, anchor-stones long gone: "The Warden watched us from the slick. We never turned our backs."' },
      // Crucible pack — windbite gets teeth.
      { type: 'crusher', x: 12, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 26, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 38, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 5, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 7, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'saw_blade', x: 22, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 36, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.6 },
      { type: 'pendulum_trap', x: 18, y: f - 9, length: 96, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 32, y: f - 7, length: 88, swing: 44, speed: 1.7, phase: 1.0 },
      { type: 'moving_platform', x: 8, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 34, y: f - 5, axis: 'y', range: 64, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'icicle_drop', x: 10, y: 3, interval: 2400, phase: 0 },
      { type: 'icicle_drop', x: 26, y: 3, interval: 2400, phase: 600 },
      { type: 'icicle_drop', x: 40, y: 3, interval: 2400, phase: 1200 },
      { type: 'arrow_turret', x: W - 3, y: f - 3, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'wind_gust_zone', x: 14, y: f - 6, w: 6, h: 3, dir: 'right', strength: 180 },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom35() {
  const W = 38, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 2, W - 1, 6, W - 1);
  // Tall vertical corridor with ledges, gliding encouraged
  for (let y = 3; y < f; y += 3) {
    const off = (y / 3) % 2 === 0 ? 4 : W - 10;
    fillRow(tiles, y, off, off + 8, 2);
  }
  // Hidden cubby at mid-height, entrance high on west wall
  clearRect(tiles, 10, 1, 11, 3);
  return {
    name: 'Gale Spires',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room34', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room36', x: W - 2, y: 4, spawnX: 2, spawnY: 18 },
      // More enemy pressure — ledge turrets and dive predators
      { type: 'rock_hurler', x: 8, y: f },
      { type: 'hawk_diver', x: 22, y: 10 },
      { type: 'hawk_diver', x: 16, y: 6 },
      { type: 'hawk_diver', x: 30, y: 4 },
      { type: 'falling_rocks', x: 18, y: f, interval: 2400, dropHeight: 18 },
      { type: 'falling_rocks', x: 28, y: f, interval: 2800, dropHeight: 16 },
      // Coin ribbon up the zigzag
      { type: 'coin', x: 6, y: f - 2 },
      { type: 'coin', x: 10, y: f - 5 },
      { type: 'coin', x: 16, y: f - 8 },
      { type: 'coin', x: 22, y: f - 11 },
      { type: 'coin', x: 28, y: f - 14 },
      { type: 'coin', x: 32, y: f - 17 },
      // Mid-height secret — slash through the mural
      { type: 'secret_wall', x: 4, y: 10, hitsToBreak: 2 },
      { type: 'coin', x: 2, y: 10 },
      { type: 'health_pickup', x: 2, y: 11 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      { type: 'mountain_flag', x: 6, y: f - 13 },
      { type: 'lore_fragment', id: 'gale_note', x: 3, y: f,
        text: 'Pilgrim shrine: "Leave the ground. Trust the air. The Warden respects only those who do."' },
      { type: 'lore_fragment', id: 'gale_note_2', x: 3, y: 10,
        text: 'Carved deep in the stone: "Fly, then land. Then fly again. The sky owes nothing."' },
      // Hazards — spires tested by falling teeth and raking lasers
      { type: 'crusher', x: 10, y: 1, dropDist: 3, downTime: 380, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 26, y: 1, dropDist: 3, downTime: 380, upTime: 2000, phase: 'up' },
      { type: 'laser_beam', x: 2, y: 13, dir: 'right', length: 8, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 17, dir: 'left', length: 8, onTime: 1100, offTime: 1300, phase: 500 },
    ],
    ambience: 'mountain_peak',
  };
}

function buildRoom36() {
  // Peak Warden boss arena — kept visually clean but the approach
  // corridors and post-boss alcove get new life.
  const W = 44, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Wide platform for boss
  fillRow(tiles, f - 5, 8, 12, 2);
  fillRow(tiles, f - 5, 32, 36, 2);
  return {
    name: 'Throne of the Warden',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room35', x: 1, y: f, spawnX: W - 3, spawnY: 18 },
      { type: 'door', targetRoom: 'room37', x: W - 2, y: f, spawnX: 2, spawnY: 18,
        requiresBoss: 'boss_room36' },
      { type: 'boss', bossType: 'peak_warden', x: 22, y: f, hiddenIfBoss: 'boss_room36' },
      // Post-boss reward only spawns once the Warden falls — tidy the
      // arena with a proper pilgrim's tribute.
      { type: 'health_pickup', x: 22, y: f - 1, requiresBoss: 'boss_room36' },
      { type: 'coin', x: 10, y: f - 6, requiresBoss: 'boss_room36' },
      { type: 'coin', x: 22, y: f - 6, requiresBoss: 'boss_room36' },
      { type: 'coin', x: 34, y: f - 6, requiresBoss: 'boss_room36' },
      { type: 'lore_fragment', id: 'warden_ending', x: 22, y: f,
        requiresBoss: 'boss_room36',
        text: 'Where the Warden fell, her gauntlet remains. The metal is warm. You do not take it.' },
      { type: 'mountain_banner', x: 10, y: 2 },
      { type: 'mountain_banner', x: 22, y: 2 },
      { type: 'mountain_banner', x: 34, y: 2 },
      { type: 'snow_rock', x: 16, y: f },
      { type: 'snow_rock', x: 26, y: f },
      { type: 'fog_bank', x: 22, y: 3 },
      // Pre-boss gauntlet — the approach is lined with the Warden's defenses,
      // hidden until the boss itself falls so the hiddenIfBoss objects read
      // as a final trial and the post-victory arena stays clean.
      { type: 'crusher', x: 14, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'top', hiddenIfBoss: 'boss_room36' },
      { type: 'crusher', x: 30, y: 1, dropDist: 5, downTime: 420, upTime: 2000, phase: 'up', hiddenIfBoss: 'boss_room36' },
      { type: 'laser_beam', x: 2, y: f - 4, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0, hiddenIfBoss: 'boss_room36' },
      { type: 'laser_beam', x: W - 3, y: f - 4, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 600, hiddenIfBoss: 'boss_room36' },
      { type: 'arrow_turret', x: 2, y: f - 7, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120, hiddenIfBoss: 'boss_room36' },
      { type: 'arrow_turret', x: W - 3, y: f - 7, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120, hiddenIfBoss: 'boss_room36' },
      { type: 'icicle_drop', x: 18, y: 3, interval: 2400, phase: 0, hiddenIfBoss: 'boss_room36' },
      { type: 'icicle_drop', x: 26, y: 3, interval: 2400, phase: 600, hiddenIfBoss: 'boss_room36' },
    ],
    ambience: 'mountain_peak',
  };
}

// ================ FOREST BIOME (37-43) + sanctuary3 =======================

function buildRoom37() {
  // Greenroad — first breath of forest. Open and wide so the tonal
  // shift from mountain feels deliberate. Still peppered with spiders
  // and a hidden mushroom ring for exploration hunters.
  const W = 48, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 8, 14, 2);
  fillRow(tiles, f - 5, 18, 24, 2);
  fillRow(tiles, f - 3, 28, 34, 2);
  fillRow(tiles, f - 6, 36, 44, 2);
  // Hidden stump-cave on the ground level, west of the first tree
  clearRect(tiles, f, 3, f, 5);
  // Thicket barriers — the road is choked. Climb a bramble, then duck a
  // branch, then climb another. No more straight-line strolls.
  climbWall(tiles, 16, f, 3);
  duckWall(tiles, 26, f, 3);
  climbWall(tiles, 35, f, 3);
  return {
    name: 'Greenroad',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room36', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room38', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      // Enemy pressure — web and dive
      { type: 'thorn_spider', x: 11, y: f - 4 },
      { type: 'thorn_spider', x: 32, y: f - 4 },
      { type: 'bark_archer', x: 20, y: f - 6 },
      { type: 'bee_swarm_zone', x: 38, y: f - 7 },
      { type: 'thorn_snare', x: 26, y: f },
      // Coin chain up the escalating ledges
      { type: 'coin', x: 11, y: f - 4 },
      { type: 'coin', x: 21, y: f - 6 },
      { type: 'coin', x: 30, y: f - 4 },
      { type: 'coin', x: 40, y: f - 7 },
      // Stump-cave secret — slash the mossy wood
      { type: 'secret_wall', x: 6, y: f, hitsToBreak: 2 },
      { type: 'coin', x: 4, y: f },
      { type: 'health_pickup', x: 3, y: f },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'oak_tree', x: 26, y: f },
      { type: 'oak_tree', x: 42, y: f },
      { type: 'thorn_bush', x: 16, y: f },
      { type: 'thorn_bush', x: 34, y: f },
      { type: 'wild_flower', x: 20, y: f },
      { type: 'wild_flower', x: 30, y: f },
      { type: 'grass_blade', x: 12, y: f },
      { type: 'grass_blade', x: 22, y: f },
      { type: 'lore_fragment', id: 'greenroad_lore', x: 5, y: f,
        text: 'Shepherd\'s marker, warm in the sun: "The underdark is behind you. Keep walking. Things grow here."' },
    ],
    ambience: 'forest',
  };
}

function buildRoom38() {
  const W = 46, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 2, 4, 8, 2);
  fillRow(tiles, f - 4, 12, 16, 2);
  fillRow(tiles, f - 6, 20, 26, 2);
  fillRow(tiles, f - 4, 30, 36, 2);
  fillRow(tiles, f - 7, 38, 44, 2);
  // Secret wall entrance to sanctuary3, plus a second small alcove
  clearRect(tiles, f, 40, f, 42);
  // Thornwood barriers — forcing the canopy-and-branch routing instead
  // of a flat run. The thornwood is not a footpath.
  climbWall(tiles, 10, f, 3);
  duckWall(tiles, 18, f, 3);
  climbWall(tiles, 28, f, 3);
  return {
    name: 'Thornwood Paths',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room37', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room39', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      // Sanctuary3 portal — keep at 2 hits so it isn't free, but also
      // stop being invisible under decor.
      { type: 'secret_wall', targetRoom: 'sanctuary3', x: 5, y: f - 1, spawnX: 3, spawnY: 14, hitsToBreak: 2 },
      // Second secret — a coin/item alcove behind the eastern brush
      { type: 'secret_wall', x: 41, y: f, hitsToBreak: 2 },
      { type: 'coin', x: 40, y: f },
      { type: 'coin', x: 42, y: f },
      { type: 'item_pickup', itemId: 'ether_vial', x: 41, y: f },
      // Enemies — more of them, and tougher mix
      { type: 'bark_archer', x: 24, y: f - 7 },
      { type: 'bark_archer', x: 40, y: f - 8 },
      { type: 'thorn_spider', x: 14, y: f - 5 },
      { type: 'thorn_spider', x: 28, y: f - 2 },
      { type: 'thorn_snare', x: 20, y: f },
      { type: 'thorn_snare', x: 32, y: f },
      { type: 'bee_swarm_zone', x: 32, y: f - 5 },
      // Coin path pushing the player toward hazards
      { type: 'coin', x: 6, y: f - 3 },
      { type: 'coin', x: 14, y: f - 5 },
      { type: 'coin', x: 23, y: f - 7 },
      { type: 'coin', x: 33, y: f - 5 },
      { type: 'coin', x: 41, y: f - 8 },
      // Arrow turret from the east tree line
      { type: 'arrow_turret', x: 2, y: f - 6, dir: 'right', interval: 3000, burstSize: 3, burstSpacing: 140 },
      { type: 'oak_tree', x: 8, y: f },
      { type: 'oak_tree', x: 30, y: f },
      { type: 'thorn_bush', x: 10, y: f },
      { type: 'thorn_bush', x: 28, y: f },
      { type: 'wild_flower', x: 26, y: f },
      { type: 'wild_flower', x: 36, y: f },
      { type: 'lore_fragment', id: 'thornwood_lore', x: 17, y: f,
        text: 'A knot in the oak reads, in old charcoal: "Cross the thorns. The spiders remember your grandmother."' },
      // Crucible pack — the thornwood closes around you.
      { type: 'crusher', x: 14, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 26, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 38, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 6, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 4, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 500 },
      { type: 'saw_blade', x: 24, y: f - 1, axis: 'x', range: 96, speed: 1.2, phase: 0 },
      { type: 'saw_blade', x: 36, y: f - 1, axis: 'y', range: 80, speed: 1.3, phase: 0.7 },
      { type: 'pendulum_trap', x: 22, y: f - 7, length: 88, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 34, y: f - 5, length: 80, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 10, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'arrow_turret', x: W - 3, y: f - 7, dir: 'left', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'crumble_platform', x: 18, y: f - 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 32, y: f - 5, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'phase_platform', x: 16, y: f - 2, width: 3, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 28, y: f - 2, width: 3, onTime: 1300, offTime: 900, phase: 500 },
    ],
    ambience: 'forest',
  };
}

function buildRoom39() {
  const W = 40, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Canopy climb
  fillRow(tiles, 14, 6, 12, 2);
  fillRow(tiles, 10, 14, 22, 2);
  fillRow(tiles, 6, 20, 34, 2);
  // Mid-air ledge for a grapple detour (post-grapple return)
  fillRow(tiles, 16, 28, 32, 2);
  // High canopy secret — past the tallest ivy
  clearRect(tiles, 3, 32, 4, 34);
  // Old Canopy barriers — the forest floor is a maze of roots. The
  // canopy above is the real path.
  climbWall(tiles, 15, f, 3);
  duckWall(tiles, 25, f, 3);
  climbWall(tiles, 33, f, 4);
  return {
    name: 'Old Canopy',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room38', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room40', x: W - 2, y: f, spawnX: 2, spawnY: 18 },
      // Heavier infestation — spiders on every strata
      { type: 'thorn_spider', x: 8, y: 13 },
      { type: 'thorn_spider', x: 18, y: 9 },
      { type: 'thorn_spider', x: 30, y: 5 },
      { type: 'bark_archer', x: 28, y: 5 },
      { type: 'bark_archer', x: 10, y: 13 },
      { type: 'thorn_snare', x: 14, y: f },
      { type: 'thorn_snare', x: 24, y: f },
      { type: 'bee_swarm_zone', x: 22, y: 8 },
      { type: 'bee_swarm_zone', x: 14, y: 11 },
      // Coins in the high branches
      { type: 'coin', x: 9, y: 13 },
      { type: 'coin', x: 17, y: 9 },
      { type: 'coin', x: 24, y: 5 },
      { type: 'coin', x: 30, y: 5 },
      { type: 'coin', x: 33, y: 5 },
      // Secret at the top of the canopy — glide/grapple return reward
      { type: 'secret_wall', x: 32, y: 4, hitsToBreak: 2 },
      { type: 'health_pickup', x: 33, y: 3 },
      { type: 'coin', x: 32, y: 3 },
      // Grapple anchor seeded for the return trip
      { type: 'grapple_anchor', x: 24, y: 3 },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'oak_tree', x: 34, y: f },
      { type: 'ivy_drape', x: 18, y: 4 },
      { type: 'ivy_drape', x: 30, y: 4 },
      { type: 'glow_spore', x: 14, y: 2 },
      { type: 'glow_spore', x: 22, y: 2 },
      // Hazards — canopy is crossfire central
      { type: 'arrow_turret', x: 2, y: f - 5, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'arrow_turret', x: W - 3, y: f - 5, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'arrow_turret', x: 2, y: 10, dir: 'right', interval: 3200, burstSize: 2, burstSpacing: 150 },
      { type: 'lore_fragment', id: 'canopy_lore', x: 30, y: 5,
        text: 'Bound with sinew to the branch: "The high places were never safe. Only quiet. A different thing."' },
      // Crucible pack — the canopy is alive and predatory.
      { type: 'crusher', x: 10, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 20, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 30, y: 1, dropDist: 4, downTime: 380, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 9, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 13, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'saw_blade', x: 14, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 28, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 16, y: 9, length: 80, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 26, y: 5, length: 72, swing: 42, speed: 1.7, phase: 1.0 },
      { type: 'moving_platform', x: 18, y: 13, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: 8, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'crumble_platform', x: 8, y: 13, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 26, y: 5, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'phase_platform', x: 18, y: 9, width: 3, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 28, y: 5, width: 3, onTime: 1300, offTime: 900, phase: 500 },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom40() {
  // Grove of the Lost Song — grants Grapple. Expanded into a proper
  // tutorial/practice pit: after the orb, the only way east is a short
  // grapple from anchor to anchor over a sunken hollow.
  const W = 44, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Orb altar on the west
  fillRow(tiles, f - 4, 10, 18, 2);
  fillRect(tiles, f - 5, 12, f - 4, 16, 1);
  // Practice pit — drop with thorn_snares at the bottom, anchors above
  fillRect(tiles, H - 2, 22, H - 2, 34, 1);
  clearRect(tiles, f, 22, f, 34);
  clearRect(tiles, f - 1, 22, f - 1, 34);
  // East arrival ledge
  fillRow(tiles, f - 4, 36, 42, 2);
  return {
    name: 'Grove of the Lost Song',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room39', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room41', x: W - 2, y: f, spawnX: 2, spawnY: 18 },
      { type: 'ability_orb', ability: 'grapple', x: 14, y: f - 5,
        hint: 'Press G near a glowing anchor to grapple to it.' },
      { type: 'checkpoint_shrine', x: 5, y: f },
      // Grapple practice line — two anchors across the pit
      { type: 'grapple_anchor', x: 24, y: f - 6 },
      { type: 'grapple_anchor', x: 30, y: f - 6 },
      { type: 'grapple_anchor', x: 35, y: f - 6 },
      // Pit hazards punish bad swings
      { type: 'thorn_snare', x: 26, y: H - 3 },
      { type: 'thorn_snare', x: 30, y: H - 3 },
      { type: 'thorn_snare', x: 34, y: H - 3 },
      // Coins in the air that reward clean arcs
      { type: 'coin', x: 24, y: f - 8 },
      { type: 'coin', x: 28, y: f - 9 },
      { type: 'coin', x: 32, y: f - 9 },
      { type: 'coin', x: 36, y: f - 8 },
      // Hidden pit-floor cache — drop in, then slash the root wall
      { type: 'secret_wall', x: 32, y: H - 3, hitsToBreak: 2 },
      { type: 'health_pickup', x: 33, y: H - 3 },
      { type: 'oak_tree', x: 8, y: f },
      { type: 'oak_tree', x: 40, y: f },
      { type: 'ivy_drape', x: 14, y: 2 },
      { type: 'ivy_drape', x: 28, y: 2 },
      { type: 'glow_spore', x: 12, y: 4 },
      { type: 'glow_spore', x: 26, y: 4 },
      { type: 'glow_spore', x: 34, y: 4 },
      { type: 'lore_fragment', id: 'grapple_note', x: 5, y: f,
        text: 'An old ranger rune: "Reach is not strength. Reach is choice."' },
      { type: 'lore_fragment', id: 'grapple_note_2', x: 38, y: f - 5,
        text: 'Bark-etched on the arrival oak: "Some bridges are not built. Some are chosen, one heartbeat at a time."' },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom41() {
  // Cliff of Old Oaks — vertical climb gated by Grapple. More anchors,
  // more reasons to stop and swing.
  const W = 28, H = 30;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 7, W - 1);
  // Staggered ledges
  fillRow(tiles, 22, 4, 10, 2);
  fillRow(tiles, 17, 16, 24, 2);
  fillRow(tiles, 12, 4, 14, 2);
  fillRow(tiles, 8, 16, 24, 2);
  // Hidden basement alcove under the first ledge
  clearRect(tiles, f, 2, f, 3);
  return {
    name: 'Cliff of Old Oaks',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room40', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room42', x: W - 2, y: 5, spawnX: 2, spawnY: 18,
        requiresAbilities: ['grapple'] },
      // Anchor chain up the cliff — with a branching high route
      { type: 'grapple_anchor', x: 12, y: 20 },
      { type: 'grapple_anchor', x: 18, y: 14 },
      { type: 'grapple_anchor', x: 22, y: 10 },
      { type: 'grapple_anchor', x: 10, y: 6 },
      // Pressure — archers above, spiders on walls, wraith from below
      { type: 'bark_archer', x: 20, y: 16 },
      { type: 'bark_archer', x: 8, y: 11 },
      { type: 'thorn_spider', x: 8, y: 8 },
      { type: 'thorn_spider', x: 18, y: 7 },
      { type: 'lightwraith', x: 14, y: 24 },
      // Coin beads along the grapple path
      { type: 'coin', x: 14, y: 19 },
      { type: 'coin', x: 20, y: 13 },
      { type: 'coin', x: 24, y: 9 },
      { type: 'coin', x: 12, y: 7 },
      { type: 'coin', x: 6, y: 11 },
      // Ground-level secret — hit the mossy wall just past the entrance
      { type: 'secret_wall', x: 4, y: f, hitsToBreak: 2 },
      { type: 'health_pickup', x: 3, y: f },
      { type: 'coin', x: 2, y: f },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'oak_tree', x: 22, y: f },
      { type: 'ivy_drape', x: 10, y: 3 },
      { type: 'ivy_drape', x: 20, y: 3 },
      { type: 'glow_spore', x: 14, y: 4 },
      { type: 'lore_fragment', id: 'cliff_lore', x: 7, y: f,
        text: 'At the root of the oldest oak: "The tree remembers. The climber does not need to."' },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom42() {
  const W = 44, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 3, 0, 7, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, 8, 4, 14, 2);
  fillRow(tiles, f - 4, 16, 24, 2);
  fillRow(tiles, f - 2, 26, 34, 2);
  fillRow(tiles, f - 6, 34, 42, 2);
  // Hollows maze — player drops from the high entrance and then has to
  // thread between root walls and low branches to reach the floor door.
  climbWall(tiles, 18, f, 3);
  duckWall(tiles, 28, f, 3);
  climbWall(tiles, 36, f, 3);
  return {
    name: 'Whispering Hollows',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 5 },
    objects: [
      { type: 'door', targetRoom: 'room41', x: 1, y: 5, spawnX: W - 3, spawnY: 6 },
      { type: 'door', targetRoom: 'room43', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      // Grapple crossings — swing the hollows
      { type: 'grapple_anchor', x: 20, y: 6 },
      { type: 'grapple_anchor', x: 32, y: 5 },
      { type: 'grapple_anchor', x: 14, y: 11 },
      // Enemies dense enough to force decisions
      { type: 'bark_archer', x: 8, y: 7 },
      { type: 'bark_archer', x: 36, y: f - 7 },
      { type: 'thorn_spider', x: 22, y: f - 5 },
      { type: 'thorn_spider', x: 30, y: f - 3 },
      { type: 'thorn_snare', x: 28, y: f },
      { type: 'thorn_snare', x: 18, y: f },
      { type: 'bee_swarm_zone', x: 32, y: f - 3 },
      { type: 'lightwraith', x: 18, y: 12 },
      { type: 'lightwraith', x: 40, y: f - 7 },
      // Coins along the grapple arc
      { type: 'coin', x: 17, y: 5 },
      { type: 'coin', x: 24, y: 4 },
      { type: 'coin', x: 30, y: 4 },
      { type: 'coin', x: 20, y: f - 5 },
      { type: 'coin', x: 28, y: f - 3 },
      // Ceiling secret — grapple up, slash the root wall
      { type: 'secret_wall', x: 26, y: 2, hitsToBreak: 2 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 27, y: 2 },
      { type: 'oak_tree', x: 4, y: f },
      { type: 'oak_tree', x: 36, y: f },
      // Hazards — hollows hide old siege engines
      { type: 'phase_platform', x: 18, y: f - 2, width: 4, onTime: 1200, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 24, y: f - 4, width: 4, onTime: 1200, offTime: 900, phase: 600 },
      { type: 'laser_beam', x: 2, y: 10, dir: 'right', length: 9, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 13, dir: 'left', length: 9, onTime: 1100, offTime: 1300, phase: 500 },
      { type: 'arrow_turret', x: W - 3, y: 7, dir: 'left', interval: 3200, burstSize: 3, burstSpacing: 140 },
      { type: 'lore_fragment', id: 'hollows_lore', x: 9, y: 7,
        text: 'Scrawled where the hollow collapsed: "The trees here stopped counting. The roots did not."' },
      // Crucible pack — the hollows swallow the careless.
      { type: 'crusher', x: 12, y: 1, dropDist: 5, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 24, y: 1, dropDist: 5, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 36, y: 1, dropDist: 5, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'saw_blade', x: 20, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 32, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 16, y: f - 8, length: 96, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 30, y: f - 6, length: 88, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 18, y: f - 1, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 28, y: f - 3, axis: 'y', range: 64, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'crumble_platform', x: 10, y: 8, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 38, y: f - 6, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'arrow_turret', x: 2, y: 7, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 130 },
    ],
    ambience: 'forest_deep',
  };
}

function buildRoom43() {
  // Thornroot Hydra arena — bigger dome, still open enough for the boss
  // to breathe but with post-fight relics to discover.
  const W = 42, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 5, 6, 10, 2);
  fillRow(tiles, f - 5, 32, 36, 2);
  return {
    name: 'Heart of the Thornroot',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room42', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room44', x: W - 2, y: f, spawnX: 2, spawnY: 16,
        requiresBoss: 'boss_room43' },
      { type: 'boss', bossType: 'thornroot_hydra', x: 20, y: f, hiddenIfBoss: 'boss_room43' },
      // Post-boss reward — the Thornroot leaves its brood uprooted
      { type: 'health_pickup', x: 20, y: f - 1, requiresBoss: 'boss_room43' },
      { type: 'coin', x: 10, y: f - 6, requiresBoss: 'boss_room43' },
      { type: 'coin', x: 20, y: f - 6, requiresBoss: 'boss_room43' },
      { type: 'coin', x: 30, y: f - 6, requiresBoss: 'boss_room43' },
      { type: 'lore_fragment', id: 'thornroot_ending', x: 20, y: f,
        requiresBoss: 'boss_room43',
        text: 'A single red petal in the ash. The Thornroot bloomed only once. You almost regret it.' },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'oak_tree', x: 32, y: f },
      { type: 'ivy_drape', x: 12, y: 2 },
      { type: 'ivy_drape', x: 30, y: 2 },
      { type: 'glow_spore', x: 18, y: 3 },
      { type: 'glow_spore', x: 26, y: 3 },
    ],
    ambience: 'forest_deep',
  };
}

function buildSanctuary3() {
  const W = 26, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 1, 0, f, 0);
  fillRow(tiles, f - 2, 8, 14, 1);
  // Small roof loft — glide up to reach a hidden ether vial stash
  fillRow(tiles, 4, 16, 22, 2);
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
          'The hydras in the Thornroot have been... generous. Their venom sells well.',
        ] },
      { type: 'checkpoint_shrine', x: 18, y: f },
      // Hidden stash above the merchant
      { type: 'item_pickup', itemId: 'ether_vial', x: 19, y: 3 },
      { type: 'coin', x: 17, y: 3 },
      { type: 'coin', x: 21, y: 3 },
      { type: 'lore_fragment', id: 'glade_note', x: 11, y: f - 3,
        text: 'Ivy covers the altar. Beneath it: "Rest here. Breathe. The wind remembers your name."' },
      { type: 'lore_fragment', id: 'glade_note_2', x: 19, y: 3,
        text: 'Hidden in the rafters, a traveler\'s diary page: "I sleep here when the road is kind. It has not been, lately."' },
      { type: 'oak_tree', x: 6, y: f },
      { type: 'wild_flower', x: 8, y: f },
      { type: 'wild_flower', x: 16, y: f },
      { type: 'glow_spore', x: 13, y: 4 },
      { type: 'glow_spore', x: 19, y: 3 },
      { type: 'ivy_drape', x: 22, y: 2 },
    ],
    ambience: 'forest',
  };
}

// ================ PLAINS BIOME (44-49) ====================================

function buildRoom44() {
  const W = 56, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  // Gentle scarecrow mounds so the plains don't feel flat
  fillRow(tiles, f - 3, 16, 20, 2);
  fillRow(tiles, f - 2, 28, 32, 2);
  fillRow(tiles, f - 4, 40, 46, 2);
  // Hedgerow barriers — the open plains aren't actually open. Fencelines
  // and haystacks block the straight sprint to the east door.
  climbWall(tiles, 13, f, 3);
  duckWall(tiles, 25, f, 3);
  climbWall(tiles, 37, f, 3);
  duckWall(tiles, 49, f, 3);
  return {
    name: 'The Open Plains',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room43', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room45', x: W - 2, y: f, spawnX: 2, spawnY: 14 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      // Proper raiding party, not one lonely horseman
      { type: 'raider_horseman', x: 24, y: f },
      { type: 'raider_horseman', x: 38, y: f },
      { type: 'hawk_diver', x: 32, y: 6 },
      { type: 'hawk_diver', x: 20, y: 4 },
      { type: 'bee_swarm_zone', x: 14, y: f - 5 },
      // Wheat-field coin trail
      { type: 'coin', x: 18, y: f - 4 },
      { type: 'coin', x: 22, y: f - 4 },
      { type: 'coin', x: 30, y: f - 3 },
      { type: 'coin', x: 42, y: f - 5 },
      { type: 'coin', x: 48, y: f - 5 },
      // Secret behind the western scarecrow fence
      { type: 'secret_wall', x: 11, y: f, hitsToBreak: 2 },
      { type: 'coin', x: 9, y: f },
      { type: 'coin', x: 10, y: f },
      { type: 'health_pickup', x: 8, y: f },
      { type: 'fence_post', x: 10, y: f },
      { type: 'fence_post', x: 12, y: f },
      { type: 'fence_post', x: 14, y: f },
      { type: 'fence_post', x: 36, y: f },
      { type: 'fence_post', x: 38, y: f },
      { type: 'wheat_tuft', x: 18, y: f },
      { type: 'wheat_tuft', x: 22, y: f },
      { type: 'wheat_tuft', x: 28, y: f },
      { type: 'wheat_tuft', x: 44, y: f },
      { type: 'wild_flower', x: 36, y: f },
      { type: 'wild_flower', x: 42, y: f },
      { type: 'wild_flower', x: 50, y: f },
      { type: 'lore_fragment', id: 'plains_note', x: 6, y: f,
        text: 'A scarecrow stands in fields long harvested. The wind turns its face to you.' },
      { type: 'lore_fragment', id: 'plains_note_2', x: 44, y: f - 5,
        text: 'A sun-bleached ledger page: "Last harvest: none. Reason: everyone left. Signed, the fields."' },
      // Crucible pack — even open plains have teeth.
      { type: 'crusher', x: 16, y: 1, dropDist: 4, downTime: 420, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 30, y: 1, dropDist: 4, downTime: 420, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 44, y: 1, dropDist: 4, downTime: 420, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 6, dir: 'right', length: 12, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 4, dir: 'left', length: 12, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'arrow_turret', x: 2, y: f - 3, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: f - 3, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 120 },
      { type: 'saw_blade', x: 22, y: f - 1, axis: 'x', range: 128, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 42, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 18, y: f - 8, length: 96, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 34, y: f - 7, length: 88, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 10, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 34, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 50, y: f - 4, axis: 'x', range: 64, speed: 1.2, phase: 1.2, spin: 0 },
      { type: 'phase_platform', x: 20, y: f - 2, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 34, y: f - 3, width: 4, onTime: 1300, offTime: 900, phase: 500 },
    ],
    ambience: 'plains',
  };
}

function buildRoom45() {
  const W = 50, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 10, 16, 2);
  fillRow(tiles, f - 4, 22, 30, 2);
  fillRow(tiles, f - 3, 34, 40, 2);
  fillRow(tiles, f - 7, 26, 32, 2);
  fillRow(tiles, f - 6, 42, 48, 2);
  // Windmill maze — broken wagon walls and sagging rails block the
  // sprint. Use the rising tiers to cross.
  climbWall(tiles, 20, f, 3);
  duckWall(tiles, 32, f, 3);
  climbWall(tiles, 41, f, 3);
  return {
    name: 'Windmill Rise',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room44', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room46', x: W - 2, y: f, spawnX: 2, spawnY: 14 },
      { type: 'raider_horseman', x: 18, y: f },
      { type: 'raider_horseman', x: 36, y: f },
      { type: 'hawk_diver', x: 28, y: 5 },
      { type: 'hawk_diver', x: 14, y: 4 },
      { type: 'crossbowman', x: 46, y: f - 7 },
      // The windmill's wind — gust lifts you to the high ledge + coins
      { type: 'wind_gust_zone', x: 26, y: f - 6, w: 3, h: 5, dir: 'up', strength: 300 },
      // Mid-air coins only reachable via the gust
      { type: 'coin', x: 26, y: f - 9 },
      { type: 'coin', x: 28, y: f - 10 },
      { type: 'coin', x: 30, y: f - 9 },
      { type: 'coin', x: 44, y: f - 8 },
      // Secret below the eastern platform — drop, slash
      { type: 'secret_wall', x: 40, y: f, hitsToBreak: 2 },
      { type: 'health_pickup', x: 41, y: f },
      { type: 'coin', x: 42, y: f },
      // Arrow turret from a distant fencepost
      { type: 'arrow_turret', x: 2, y: f - 4, dir: 'right', interval: 3000, burstSize: 3, burstSpacing: 130 },
      { type: 'fence_post', x: 8, y: f },
      { type: 'fence_post', x: 10, y: f },
      { type: 'fence_post', x: 20, y: f },
      { type: 'fence_post', x: 32, y: f },
      { type: 'oak_tree', x: 42, y: f },
      { type: 'wheat_tuft', x: 14, y: f },
      { type: 'wheat_tuft', x: 24, y: f },
      { type: 'wheat_tuft', x: 36, y: f },
      { type: 'lore_fragment', id: 'windmill_lore', x: 6, y: f,
        text: 'The windmill\'s stones are cracked. Someone carved on the base: "It turned for my grandfather. It will turn again."' },
      // Crucible pack — the mill's sails are deadly.
      { type: 'crusher', x: 14, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 26, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 38, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 7, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'saw_blade', x: 16, y: f - 1, axis: 'x', range: 96, speed: 1.4, phase: 0 },
      { type: 'saw_blade', x: 32, y: f - 1, axis: 'x', range: 128, speed: 1.3, phase: 0.7 },
      { type: 'pendulum_trap', x: 20, y: f - 9, length: 88, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 36, y: f - 6, length: 80, swing: 44, speed: 1.7, phase: 1.0 },
      { type: 'moving_platform', x: 14, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 38, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'crumble_platform', x: 22, y: f - 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'crumble_platform', x: 36, y: f - 3, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'phase_platform', x: 16, y: f - 2, width: 3, onTime: 1300, offTime: 900, phase: 0 },
    ],
    ambience: 'plains',
  };
}

function buildRoom46() {
  const W = 46, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 6, 6, 10, 2);
  fillRow(tiles, f - 10, 12, 18, 2);
  fillRow(tiles, f - 6, 22, 28, 2);
  fillRow(tiles, f - 10, 30, 36, 2);
  fillRow(tiles, f - 14, 18, 26, 2);
  fillRow(tiles, f - 6, 38, 44, 2);
  // Storm-shattered fencewalls on the ground — you cannot run the
  // gauntlet, you have to ride the gusts up and route around.
  climbWall(tiles, 12, f, 3);
  climbWall(tiles, 22, f, 3);
  climbWall(tiles, 36, f, 3);
  return {
    name: 'Stormgate',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room45', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room47', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      // Three lightning bolts instead of two — scary corridor
      { type: 'lightning_strike', x: 16 * 32, y: 0, interval: 3600, phase: 0 },
      { type: 'lightning_strike', x: 24 * 32, y: 0, interval: 3400, phase: 1200 },
      { type: 'lightning_strike', x: 32 * 32, y: 0, interval: 3600, phase: 1800 },
      // Two gust columns — puzzle-piece your way up
      { type: 'wind_gust_zone', x: 14, y: f - 12, w: 3, h: 6, dir: 'up', strength: 280 },
      { type: 'wind_gust_zone', x: 32, y: f - 12, w: 3, h: 6, dir: 'up', strength: 280 },
      // Coins between the lightning strikes — time it right!
      { type: 'coin', x: 16, y: f - 13 },
      { type: 'coin', x: 22, y: f - 15 },
      { type: 'coin', x: 24, y: f - 15 },
      { type: 'coin', x: 32, y: f - 13 },
      // Top-of-room reward for surviving the storm
      { type: 'item_pickup', itemId: 'soul_crystal', x: 22, y: f - 15 },
      // Hidden cellar — drop off the east and slash the storm door
      { type: 'secret_wall', x: 40, y: f, hitsToBreak: 2 },
      { type: 'health_pickup', x: 42, y: f },
      { type: 'coin', x: 43, y: f },
      // Aerial threats — rain can't stop the hawks
      { type: 'hawk_diver', x: 20, y: 8 },
      { type: 'hawk_diver', x: 36, y: 5 },
      { type: 'storm_cloud', x: 16, y: 2 },
      { type: 'storm_cloud', x: 28, y: 2 },
      { type: 'storm_cloud', x: 38, y: 2 },
      { type: 'rain_streak', x: 14, y: 4 },
      { type: 'rain_streak', x: 26, y: 4 },
      { type: 'rain_streak', x: 34, y: 4 },
      { type: 'lore_fragment', id: 'stormgate_lore', x: 5, y: f,
        text: 'A farmer\'s post, lightning-scarred: "The sky opens at the gate. The gate opens only for the brave."' },
    ],
    ambience: 'plains_storm',
  };
}

function buildRoom47() {
  const W = 50, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 8, 14, 2);
  fillRow(tiles, f - 5, 20, 28, 2);
  fillRow(tiles, f - 3, 32, 40, 2);
  fillRow(tiles, f - 7, 38, 46, 2);
  // Snare pit mid-room for the unwary runner
  fillRect(tiles, H - 2, 16, H - 2, 20, 1);
  // Flats maze — a broken riverwall and a collapsed levee force the
  // player up onto the ledges. The snare pit funnels the detour.
  climbWall(tiles, 16, f, 3);
  duckWall(tiles, 30, f, 3);
  climbWall(tiles, 42, f, 3);
  return {
    name: 'Riverwind Flats',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room46', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room48', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      // Two raiders and two lightwraiths — a full skirmish
      { type: 'raider_horseman', x: 18, y: f },
      { type: 'raider_horseman', x: 32, y: f },
      { type: 'hawk_diver', x: 24, y: 6 },
      { type: 'hawk_diver', x: 40, y: 4 },
      { type: 'lightwraith', x: 36, y: f - 5 },
      { type: 'lightwraith', x: 44, y: f - 7 },
      { type: 'crossbowman', x: 26, y: f - 6 },
      // Floor hazards herding the player onto ledges
      { type: 'thorn_snare', x: 17, y: f },
      { type: 'thorn_snare', x: 19, y: f },
      { type: 'floor_spikes', x: 22, y: f - 5, w: 3 },
      // Coins for risk takers
      { type: 'coin', x: 10, y: f - 4 },
      { type: 'coin', x: 25, y: f - 6 },
      { type: 'coin', x: 36, y: f - 4 },
      { type: 'coin', x: 42, y: f - 8 },
      { type: 'coin', x: 44, y: f - 8 },
      // Secret — drop into the pit, slash under the central platform
      { type: 'secret_wall', x: 18, y: H - 3, hitsToBreak: 2 },
      { type: 'health_pickup', x: 17, y: H - 3 },
      { type: 'coin', x: 19, y: H - 3 },
      { type: 'wheat_tuft', x: 10, y: f },
      { type: 'wheat_tuft', x: 22, y: f },
      { type: 'wheat_tuft', x: 42, y: f },
      { type: 'wild_flower', x: 30, y: f },
      { type: 'lore_fragment', id: 'riverwind_lore', x: 7, y: f,
        text: 'Riverstone, wind-smoothed: "The river here is called Leavetaking. Nothing that crosses it comes back whole."' },
      // Crucible pack — the river runs with edges.
      { type: 'crusher', x: 14, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 26, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 38, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 6, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 8, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'arrow_turret', x: 2, y: f - 3, dir: 'right', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'arrow_turret', x: W - 3, y: f - 3, dir: 'left', interval: 2800, burstSize: 3, burstSpacing: 130 },
      { type: 'saw_blade', x: 24, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 38, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 14, y: f - 7, length: 96, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 36, y: f - 8, length: 88, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 18, y: f - 2, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 34, y: f - 4, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 44, y: f - 5, axis: 'x', range: 64, speed: 1.2, phase: 1.2, spin: 0 },
      { type: 'phase_platform', x: 14, y: f - 2, width: 3, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 32, y: f - 2, width: 3, onTime: 1300, offTime: 900, phase: 500 },
    ],
    ambience: 'plains',
  };
}

function buildRoom48() {
  const W = 44, H = 24;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 6, 6, 14, 2);
  fillRow(tiles, f - 10, 20, 28, 2);
  fillRow(tiles, f - 6, 30, 36, 2);
  fillRow(tiles, f - 14, 14, 22, 2);
  fillRow(tiles, f - 8, 38, 42, 2);
  // Weathervane maze — the ground is a scatter of lightning-fused
  // stone walls. Up you must go, riding the gusts between them.
  climbWall(tiles, 18, f, 3);
  climbWall(tiles, 30, f, 3);
  return {
    name: 'Weathervane',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room47', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room49', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      // Double lightning corridor
      { type: 'lightning_strike', x: 16 * 32, y: 0, interval: 4000, phase: 0 },
      { type: 'lightning_strike', x: 28 * 32, y: 0, interval: 3600, phase: 1600 },
      // Two gusts — puzzle your path to the top
      { type: 'wind_gust_zone', x: 24, y: f - 12, w: 3, h: 7, dir: 'up', strength: 280 },
      { type: 'wind_gust_zone', x: 10, y: f - 14, w: 3, h: 7, dir: 'up', strength: 260 },
      // Aerial pressure
      { type: 'hawk_diver', x: 30, y: 8 },
      { type: 'hawk_diver', x: 18, y: 4 },
      { type: 'rock_hurler', x: 36, y: f - 7 },
      { type: 'raider_horseman', x: 14, y: f },
      { type: 'raider_horseman', x: 26, y: f },
      { type: 'crossbowman', x: 40, y: f - 9 },
      // Coin trail — high for reward, low for safety
      { type: 'coin', x: 18, y: f - 15 },
      { type: 'coin', x: 22, y: f - 15 },
      { type: 'coin', x: 14, y: f - 10 },
      { type: 'coin', x: 24, y: f - 12 },
      { type: 'coin', x: 40, y: f - 9 },
      // Pedestal reward on top of the weathervane
      { type: 'item_pickup', itemId: 'ether_vial', x: 20, y: f - 15 },
      // Secret on the east — drop past the ledge and slash
      { type: 'secret_wall', x: 41, y: f, hitsToBreak: 2 },
      { type: 'health_pickup', x: 42, y: f },
      { type: 'storm_cloud', x: 20, y: 3 },
      { type: 'storm_cloud', x: 32, y: 3 },
      { type: 'rain_streak', x: 14, y: 5 },
      { type: 'rain_streak', x: 28, y: 5 },
      { type: 'lore_fragment', id: 'weathervane_lore', x: 5, y: f,
        text: 'Engraved brass at the shrine: "Pray to the vane. The wind is the only god still answering."' },
    ],
    ambience: 'plains_storm',
  };
}

function buildRoom49() {
  const W = 48, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 5, 8, 12, 2);
  fillRow(tiles, f - 5, 36, 40, 2);
  return {
    name: 'The Marauder\'s Field',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room48', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room50', x: W - 2, y: f, spawnX: 2, spawnY: 16,
        requiresBoss: 'boss_room49' },
      { type: 'boss', bossType: 'windblade_marauder', x: 24, y: f, hiddenIfBoss: 'boss_room49' },
      // Post-boss spoils — the raider's camp falls silent
      { type: 'health_pickup', x: 24, y: f - 1, requiresBoss: 'boss_room49' },
      { type: 'coin', x: 10, y: f - 6, requiresBoss: 'boss_room49' },
      { type: 'coin', x: 24, y: f - 6, requiresBoss: 'boss_room49' },
      { type: 'coin', x: 38, y: f - 6, requiresBoss: 'boss_room49' },
      { type: 'item_pickup', itemId: 'ether_vial', x: 24, y: f - 7, requiresBoss: 'boss_room49' },
      { type: 'lore_fragment', id: 'marauder_ending', x: 10, y: f,
        requiresBoss: 'boss_room49',
        text: 'On the Marauder\'s broken banner: "We did not fall to the castle. We did not fall to the sky. We fell to a stranger from below."' },
      { type: 'fence_post', x: 8, y: f }, { type: 'fence_post', x: 10, y: f },
      { type: 'fence_post', x: 34, y: f }, { type: 'fence_post', x: 36, y: f },
      { type: 'wheat_tuft', x: 16, y: f }, { type: 'wheat_tuft', x: 28, y: f },
      { type: 'wheat_tuft', x: 42, y: f },
      { type: 'storm_cloud', x: 24, y: 3 },
    ],
    ambience: 'plains',
  };
}

// ================ CASTLE BIOME (50-56) + sanctuary4 =======================

function buildRoom50() {
  const W = 46, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 3, 8, 14, 2);
  fillRow(tiles, f - 5, 18, 24, 2);
  fillRow(tiles, f - 3, 28, 34, 2);
  fillRow(tiles, f - 6, 36, 44, 2);
  // Hidden barracks beneath the western platform
  clearRect(tiles, f, 4, f, 5);
  // Castle Gate maze — inner wall columns and a low archway divide
  // the approach. Use the garrison's own tiers to climb over.
  climbWall(tiles, 16, f, 3);
  duckWall(tiles, 26, f, 3);
  climbWall(tiles, 35, f, 4);
  return {
    name: 'Castle Gate',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room49', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room51', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 4, y: f },
      // Full garrison waiting behind the threshold
      { type: 'banner_pikeman', x: 16, y: f - 6 },
      { type: 'banner_pikeman', x: 28, y: f - 4 },
      { type: 'crossbowman', x: 30, y: f - 4 },
      { type: 'crossbowman', x: 40, y: f - 7 },
      { type: 'lightwraith', x: 22, y: f - 6 },
      // Coins on the climb, gated by guards
      { type: 'coin', x: 11, y: f - 4 },
      { type: 'coin', x: 21, y: f - 6 },
      { type: 'coin', x: 31, y: f - 4 },
      { type: 'coin', x: 40, y: f - 7 },
      // Secret barracks — slash the tapestry near the entrance
      { type: 'secret_wall', x: 6, y: f, hitsToBreak: 2 },
      { type: 'health_pickup', x: 4, y: f },
      { type: 'coin', x: 5, y: f },
      // Arrow slits covering the approach
      { type: 'arrow_slit_volley', x: 2 * 32, y: 10 * 32, dir: 'right', interval: 2600 },
      { type: 'arrow_slit_volley', x: 43 * 32, y: 8 * 32, dir: 'left', interval: 2600 },
      { type: 'banner_red', x: 10, y: 2 },
      { type: 'banner_red', x: 22, y: 2 },
      { type: 'banner_red', x: 34, y: 2 },
      { type: 'castle_window', x: 16, y: 4 },
      { type: 'castle_window', x: 28, y: 4 },
      { type: 'lore_fragment', id: 'castle_intro', x: 5, y: f,
        text: 'The gate is open. No guard stopped you. Something inside is colder than arrows.' },
      { type: 'lore_fragment', id: 'castle_intro_2', x: 39, y: f - 7,
        text: 'Nailed to a pike: a letter, never sent. "Queen is gone. Garrison is gone. The walls still stand. We cannot explain it."' },
    ],
    ambience: 'castle_courtyard',
  };
}

function buildRoom51() {
  const W = 48, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 2, 6, 10, 2);
  fillRow(tiles, f - 4, 14, 22, 2);
  fillRow(tiles, f - 6, 26, 34, 2);
  fillRow(tiles, f - 4, 36, 42, 2);
  fillRow(tiles, f - 8, 18, 28, 2);
  // Outer Ward maze — partition walls between platforms mean the
  // courtyard becomes a gauntlet, not a racetrack.
  climbWall(tiles, 12, f, 3);
  duckWall(tiles, 24, f, 3);
  climbWall(tiles, 35, f, 3);
  return {
    name: 'Outer Ward',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room50', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room52', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      // Sanctuary4 entrance — kept easy-ish, 2 hits
      { type: 'secret_wall', targetRoom: 'sanctuary4', x: 7, y: f - 1, spawnX: 3, spawnY: 14, hitsToBreak: 2 },
      // Second secret — high up over the chandelier
      { type: 'secret_wall', x: 22, y: f - 9, hitsToBreak: 2 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 23, y: f - 9 },
      // Patrol + crossbow squad
      { type: 'banner_pikeman', x: 18, y: f - 5 },
      { type: 'banner_pikeman', x: 28, y: f - 7 },
      { type: 'crossbowman', x: 32, y: f - 7 },
      { type: 'crossbowman', x: 42, y: f - 5 },
      { type: 'lightwraith', x: 24, y: f - 3 },
      // Coins up the tiered platforms
      { type: 'coin', x: 8, y: f - 3 },
      { type: 'coin', x: 18, y: f - 5 },
      { type: 'coin', x: 30, y: f - 7 },
      { type: 'coin', x: 40, y: f - 5 },
      { type: 'coin', x: 22, y: f - 9 },
      // Castle crossfire
      { type: 'arrow_slit_volley', x: 5 * 32, y: 6 * 32, dir: 'right', interval: 2400 },
      { type: 'arrow_slit_volley', x: 42 * 32, y: 5 * 32, dir: 'left', interval: 2800 },
      { type: 'arrow_slit_volley', x: 20 * 32, y: 13 * 32, dir: 'right', interval: 2600 },
      { type: 'swinging_chandelier', x: 22 * 32, y: 2 * 32, length: 96, swing: 50, speed: 1.1 },
      { type: 'swinging_chandelier', x: 36 * 32, y: 2 * 32, length: 110, swing: 48, speed: 0.9, phase: 1.2 },
      { type: 'banner_gold', x: 12, y: 2 },
      { type: 'banner_gold', x: 32, y: 2 },
      { type: 'banner_gold', x: 44, y: 2 },
      { type: 'castle_window', x: 22, y: 4 },
      { type: 'castle_window', x: 36, y: 4 },
      { type: 'lore_fragment', id: 'ward_lore', x: 9, y: f - 3,
        text: 'Mural fragment: a queen crowned in shadow, her subjects kneeling with empty chests. Someone scratched: "LIAR."' },
      // Crucible pack — the Ward's garrison wakes up.
      { type: 'crusher', x: 12, y: 1, dropDist: 5, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 24, y: 1, dropDist: 5, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 36, y: 1, dropDist: 5, downTime: 400, upTime: 2000, phase: 'down' },
      { type: 'laser_beam', x: 2, y: f - 5, dir: 'right', length: 10, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: f - 7, dir: 'left', length: 10, onTime: 1100, offTime: 1300, phase: 600 },
      { type: 'arrow_turret', x: 2, y: f - 3, dir: 'right', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: f - 3, dir: 'left', interval: 2700, burstSize: 3, burstSpacing: 120 },
      { type: 'saw_blade', x: 22, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 38, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 20, y: f - 9, length: 96, swing: 48, speed: 1.7, phase: 0 },
      { type: 'pendulum_trap', x: 32, y: f - 7, length: 88, swing: 44, speed: 1.8, phase: 1.0 },
      { type: 'moving_platform', x: 16, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 38, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'portcullis_drop', x: 18 * 32, y: 13 * 32, dropDist: 4 },
      { type: 'portcullis_drop', x: 32 * 32, y: 13 * 32, dropDist: 4 },
      { type: 'phase_platform', x: 16, y: f - 3, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 30, y: f - 5, width: 4, onTime: 1300, offTime: 900, phase: 500 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom52() {
  const W = 32, H = 28;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 3, W - 1, 7, W - 1);
  // Vertical rampart climb — grapple required
  fillRow(tiles, 22, 4, 12, 2);
  fillRow(tiles, 16, 14, 22, 2);
  fillRow(tiles, 11, 4, 14, 2);
  fillRow(tiles, 6, 16, 24, 2);
  // Hidden powder magazine alcove
  clearRect(tiles, f, 2, f, 4);
  return {
    name: 'Rampart Climb',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room51', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room53', x: W - 2, y: 5, spawnX: 2, spawnY: 18,
        requiresAbilities: ['grapple'] },
      // Four anchors — branching paths up
      { type: 'grapple_anchor', x: 18, y: 19 },
      { type: 'grapple_anchor', x: 22, y: 13 },
      { type: 'grapple_anchor', x: 8, y: 8 },
      { type: 'grapple_anchor', x: 22, y: 4 },
      // Defense-in-depth garrison
      { type: 'crossbowman', x: 8, y: 21 },
      { type: 'crossbowman', x: 20, y: 10 },
      { type: 'crossbowman', x: 24, y: 5 },
      { type: 'banner_pikeman', x: 16, y: 15 },
      { type: 'lightwraith', x: 14, y: 17 },
      // Coin pillars on each climb tier
      { type: 'coin', x: 8, y: 21 },
      { type: 'coin', x: 18, y: 15 },
      { type: 'coin', x: 10, y: 10 },
      { type: 'coin', x: 20, y: 5 },
      { type: 'coin', x: 24, y: 5 },
      // Secret magazine — slash the powder crate
      { type: 'secret_wall', x: 5, y: f, hitsToBreak: 2 },
      { type: 'item_pickup', itemId: 'ether_vial', x: 3, y: f },
      { type: 'coin', x: 4, y: f },
      { type: 'banner_red', x: 6, y: 2 },
      { type: 'banner_red', x: 20, y: 2 },
      { type: 'castle_window', x: 14, y: 4 },
      // Hazards — rampart defences
      { type: 'crusher', x: 14, y: 1, dropDist: 4, downTime: 380, upTime: 1900, phase: 'top' },
      { type: 'crusher', x: 22, y: 1, dropDist: 4, downTime: 380, upTime: 1900, phase: 'up' },
      { type: 'arrow_turret', x: 2, y: 12, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 18, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'phase_platform', x: 6, y: 14, width: 3, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 16, y: 9, width: 3, onTime: 1300, offTime: 900, phase: 600 },
      { type: 'lore_fragment', id: 'rampart_lore', x: 4, y: f,
        text: 'Quartermaster\'s tally, water-stained: "4000 bolts, 200 barrels, 3 kings. All running out at once."' },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom53() {
  const W = 46, H = 20;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 3, 0, 7, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, 8, 4, 12, 2);
  fillRow(tiles, f - 4, 16, 22, 2);
  fillRow(tiles, f - 3, 28, 36, 2);
  fillRow(tiles, f - 6, 38, 44, 2);
  // Highwalk maze — banner-columns and a low stone lintel. Between the
  // portcullises and the swinging chandeliers, there is no clean run.
  climbWall(tiles, 14, f, 3);
  duckWall(tiles, 26, f, 3);
  climbWall(tiles, 37, f, 3);
  return {
    name: 'Highwalk',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 5 },
    objects: [
      { type: 'door', targetRoom: 'room52', x: 1, y: 5, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room54', x: W - 2, y: f, spawnX: 2, spawnY: 14 },
      // Triple threat: pike, crossbow, wraith
      { type: 'banner_pikeman', x: 18, y: f - 5 },
      { type: 'banner_pikeman', x: 32, y: f - 4 },
      { type: 'crossbowman', x: 30, y: f - 4 },
      { type: 'crossbowman', x: 42, y: f - 7 },
      { type: 'lightwraith', x: 24, y: f - 5 },
      // Two chandeliers to swing past
      { type: 'swinging_chandelier', x: 12 * 32, y: 2 * 32, length: 72, swing: 56, speed: 1.3 },
      { type: 'swinging_chandelier', x: 26 * 32, y: 2 * 32, length: 96, swing: 52, speed: 1.1, phase: 1.0 },
      { type: 'swinging_chandelier', x: 38 * 32, y: 2 * 32, length: 80, swing: 58, speed: 1.4, phase: 0.5 },
      // Dropping portcullis forces timing
      { type: 'portcullis_drop', x: 20 * 32, y: 10 * 32, dropDist: 4 },
      { type: 'portcullis_drop', x: 34 * 32, y: 10 * 32, dropDist: 4 },
      // Arrow slits from both sides
      { type: 'arrow_slit_volley', x: 3 * 32, y: 4 * 32, dir: 'right', interval: 2200 },
      { type: 'arrow_slit_volley', x: 43 * 32, y: 6 * 32, dir: 'left', interval: 2400 },
      // Coins on the swinging path
      { type: 'coin', x: 12, y: 5 },
      { type: 'coin', x: 26, y: 5 },
      { type: 'coin', x: 38, y: 5 },
      { type: 'coin', x: 19, y: f - 5 },
      { type: 'coin', x: 32, y: f - 4 },
      { type: 'coin', x: 40, y: f - 7 },
      // Secret in the upper stonework — slash a cracked stone
      { type: 'secret_wall', x: 20, y: 4, hitsToBreak: 2 },
      { type: 'health_pickup', x: 21, y: 4 },
      { type: 'coin', x: 22, y: 4 },
      { type: 'castle_window', x: 18, y: 4 },
      { type: 'castle_window', x: 30, y: 4 },
      { type: 'banner_gold', x: 26, y: 2 },
      { type: 'banner_gold', x: 40, y: 2 },
      { type: 'lore_fragment', id: 'highwalk_lore', x: 4, y: 5,
        text: 'A soldier\'s hash-marks, counting down to zero. Then, scrawled beside: "ALL DONE. ALL FORGIVEN."' },
      // Crucible pack — the highwalk becomes a murder-hole.
      { type: 'crusher', x: 10, y: 1, dropDist: 4, downTime: 380, upTime: 1900, phase: 'top' },
      { type: 'crusher', x: 22, y: 1, dropDist: 4, downTime: 380, upTime: 1900, phase: 'up' },
      { type: 'crusher', x: 34, y: 1, dropDist: 4, downTime: 380, upTime: 1900, phase: 'down' },
      { type: 'saw_blade', x: 18, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 32, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 20, y: f - 7, length: 96, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 34, y: f - 6, length: 88, swing: 44, speed: 1.7, phase: 1.0 },
      { type: 'moving_platform', x: 14, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 30, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'crumble_platform', x: 24, y: f - 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'phase_platform', x: 22, y: f - 2, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 32, y: f - 2, width: 4, onTime: 1300, offTime: 900, phase: 500 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom54() {
  const W = 42, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, 4, W - 1, 8, W - 1);
  fillRow(tiles, 20, 6, 14, 2);
  fillRow(tiles, 16, 14, 22, 2);
  fillRow(tiles, 12, 20, 30, 2);
  fillRow(tiles, 8, 28, 38, 2);
  fillRow(tiles, 6, 14, 22, 2);
  // Hidden cache below the entrance floor
  clearRect(tiles, f, 2, f, 4);
  return {
    name: 'Keep Spires',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room53', x: 1, y: f, spawnX: W - 3, spawnY: 14 },
      { type: 'door', targetRoom: 'room55', x: W - 2, y: 6, spawnX: 2, spawnY: 18,
        requiresAbilities: ['grapple'] },
      // Chain of anchors — plan the arc or die
      { type: 'grapple_anchor', x: 18, y: 13 },
      { type: 'grapple_anchor', x: 26, y: 9 },
      { type: 'grapple_anchor', x: 34, y: 5 },
      { type: 'grapple_anchor', x: 16, y: 3 },
      // Pressure from every side
      { type: 'lightwraith', x: 18, y: 14 },
      { type: 'lightwraith', x: 28, y: 10 },
      { type: 'crossbowman', x: 30, y: 7 },
      { type: 'crossbowman', x: 36, y: 7 },
      { type: 'banner_pikeman', x: 10, y: 19 },
      // Coin arcs on the grapple path
      { type: 'coin', x: 18, y: 12 },
      { type: 'coin', x: 24, y: 8 },
      { type: 'coin', x: 32, y: 4 },
      { type: 'coin', x: 18, y: 5 },
      { type: 'coin', x: 22, y: 5 },
      // Hidden cache under the entrance
      { type: 'secret_wall', x: 5, y: f, hitsToBreak: 2 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 3, y: f },
      { type: 'coin', x: 4, y: f },
      { type: 'banner_red', x: 6, y: 2 },
      { type: 'banner_red', x: 24, y: 2 },
      { type: 'castle_window', x: 20, y: 4 },
      { type: 'castle_window', x: 32, y: 4 },
      { type: 'ivy_drape', x: 30, y: 2 },
      // Hazards — keep spires trial, now with more teeth
      { type: 'crusher', x: 12, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'crusher', x: 24, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'up' },
      { type: 'crusher', x: 34, y: 1, dropDist: 4, downTime: 400, upTime: 2000, phase: 'top' },
      { type: 'laser_beam', x: 2, y: 17, dir: 'right', length: 9, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 11, dir: 'left', length: 9, onTime: 1100, offTime: 1300, phase: 500 },
      { type: 'phase_platform', x: 22, y: 14, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 28, y: 10, width: 3, onTime: 1300, offTime: 900, phase: 400 },
      { type: 'lore_fragment', id: 'keep_spires_lore', x: 7, y: f,
        text: 'Siege journal: "We held the spires for three winters. Then we forgot why. Then we held them anyway."' },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom55() {
  const W = 46, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, 4, 0, 8, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, 8, 4, 14, 2);
  fillRow(tiles, f - 3, 18, 26, 2);
  fillRow(tiles, f - 2, 30, 38, 2);
  fillRow(tiles, f - 6, 38, 44, 2);
  // Throne Approach maze — heavy oak doors and broken pillars in the
  // hall. The garrison's last-line walls force the pilgrim's route.
  climbWall(tiles, 17, f, 3);
  duckWall(tiles, 29, f, 3);
  climbWall(tiles, 40, f, 3);
  return {
    name: 'Throne Approach',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: 6 },
    objects: [
      { type: 'door', targetRoom: 'room54', x: 1, y: 6, spawnX: W - 3, spawnY: 5 },
      { type: 'door', targetRoom: 'room56', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 6, y: f },
      // Honor guard — the palace doesn't fall quietly
      { type: 'banner_pikeman', x: 22, y: f - 4 },
      { type: 'banner_pikeman', x: 32, y: f - 3 },
      { type: 'banner_pikeman', x: 40, y: f - 7 },
      { type: 'crossbowman', x: 20, y: f - 4 },
      { type: 'crossbowman', x: 36, y: f - 3 },
      { type: 'lightwraith', x: 26, y: f - 4 },
      { type: 'swinging_chandelier', x: 18 * 32, y: 2 * 32, length: 120, swing: 44, speed: 1.0 },
      { type: 'swinging_chandelier', x: 30 * 32, y: 2 * 32, length: 120, swing: 44, speed: 1.2, phase: 1.5 },
      { type: 'swinging_chandelier', x: 40 * 32, y: 2 * 32, length: 110, swing: 48, speed: 1.1, phase: 0.7 },
      { type: 'portcullis_drop', x: 26 * 32, y: 13 * 32, dropDist: 4 },
      // Coins along the gauntlet
      { type: 'coin', x: 19, y: f - 5 },
      { type: 'coin', x: 22, y: f - 5 },
      { type: 'coin', x: 32, y: f - 4 },
      { type: 'coin', x: 36, y: f - 4 },
      { type: 'coin', x: 42, y: f - 8 },
      // Secret alcove behind a pillar at the east end
      { type: 'secret_wall', x: 43, y: f, hitsToBreak: 2 },
      { type: 'health_pickup', x: 44, y: f },
      { type: 'banner_gold', x: 10, y: 2 },
      { type: 'banner_gold', x: 22, y: 2 },
      { type: 'banner_gold', x: 34, y: 2 },
      { type: 'banner_gold', x: 42, y: 2 },
      { type: 'castle_window', x: 14, y: 4 },
      { type: 'castle_window', x: 30, y: 4 },
      { type: 'castle_window', x: 38, y: 4 },
      // Hazards — feasting hall defences turn on the intruder
      { type: 'crusher', x: 14, y: 1, dropDist: 5, downTime: 400, upTime: 1900, phase: 'top' },
      { type: 'crusher', x: 28, y: 1, dropDist: 5, downTime: 400, upTime: 1900, phase: 'up' },
      { type: 'laser_beam', x: 2, y: 9, dir: 'right', length: 9, onTime: 1100, offTime: 1300, phase: 0 },
      { type: 'laser_beam', x: W - 3, y: 13, dir: 'left', length: 9, onTime: 1100, offTime: 1300, phase: 500 },
      { type: 'arrow_turret', x: 2, y: 14, dir: 'right', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'arrow_turret', x: W - 3, y: 14, dir: 'left', interval: 2600, burstSize: 3, burstSpacing: 120 },
      { type: 'lore_fragment', id: 'throne_approach_lore', x: 8, y: f,
        text: 'A banquet hall, decayed. Twelve settings, twelve goblets. The wine is still wet in one.' },
      // Crucible pack — the honor guard pulls every lever in the palace.
      { type: 'crusher', x: 20, y: 1, dropDist: 5, downTime: 400, upTime: 1900, phase: 'down' },
      { type: 'crusher', x: 34, y: 1, dropDist: 5, downTime: 400, upTime: 1900, phase: 'top' },
      { type: 'crusher', x: 42, y: 1, dropDist: 5, downTime: 400, upTime: 1900, phase: 'up' },
      { type: 'saw_blade', x: 22, y: f - 1, axis: 'x', range: 96, speed: 1.3, phase: 0 },
      { type: 'saw_blade', x: 36, y: f - 1, axis: 'y', range: 80, speed: 1.2, phase: 0.5 },
      { type: 'pendulum_trap', x: 20, y: f - 9, length: 96, swing: 48, speed: 1.8, phase: 0 },
      { type: 'pendulum_trap', x: 34, y: f - 7, length: 88, swing: 44, speed: 1.7, phase: 1.0 },
      { type: 'moving_platform', x: 16, y: f - 3, axis: 'x', range: 96, speed: 1.1, phase: 0, spin: 0 },
      { type: 'moving_platform', x: 34, y: f - 5, axis: 'y', range: 80, speed: 1.0, phase: 0.5, spin: 0 },
      { type: 'moving_platform', x: 24, y: f - 2, axis: 'x', range: 128, speed: 1.2, phase: 1.2, spin: 0 },
      { type: 'crumble_platform', x: 26, y: f - 4, collapseDelay: 380, respawnDelay: 2400 },
      { type: 'phase_platform', x: 18, y: f - 3, width: 4, onTime: 1300, offTime: 900, phase: 0 },
      { type: 'phase_platform', x: 32, y: f - 2, width: 4, onTime: 1300, offTime: 900, phase: 500 },
      { type: 'portcullis_drop', x: 34 * 32, y: 13 * 32, dropDist: 4 },
    ],
    ambience: 'castle_interior',
  };
}

function buildRoom56() {
  const W = 44, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 5, 6, 10, 2);
  fillRow(tiles, f - 5, 34, 38, 2);
  return {
    name: 'Throne of the Fallen',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room55', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room57', x: W - 2, y: f, spawnX: 2, spawnY: 16,
        requiresBoss: 'boss_room56' },
      { type: 'boss', bossType: 'fallen_paladin', x: 24, y: f, hiddenIfBoss: 'boss_room56' },
      // Post-boss catharsis — the throne room goes still
      { type: 'health_pickup', x: 22, y: f - 1, requiresBoss: 'boss_room56' },
      { type: 'coin', x: 8, y: f - 6, requiresBoss: 'boss_room56' },
      { type: 'coin', x: 36, y: f - 6, requiresBoss: 'boss_room56' },
      { type: 'coin', x: 22, y: f - 6, requiresBoss: 'boss_room56' },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 22, y: f - 7,
        requiresBoss: 'boss_room56' },
      { type: 'lore_fragment', id: 'paladin_ending', x: 22, y: f,
        requiresBoss: 'boss_room56',
        text: 'The Fallen Paladin\'s helm rolls once, twice, and stops facing the sun-window. A breath you had not known you were holding lets go.' },
      { type: 'banner_gold', x: 12, y: 2 },
      { type: 'banner_gold', x: 22, y: 2 },
      { type: 'banner_gold', x: 34, y: 2 },
      { type: 'castle_window', x: 20, y: 4 },
      { type: 'castle_window', x: 30, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

function buildSanctuary4() {
  const W = 28, H = 18;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 1, 0, f, 0);
  fillRow(tiles, f - 2, 9, 16, 1);
  // Parapet loft with a hidden relic
  fillRow(tiles, 4, 18, 24, 2);
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
          'I used to sell to knights. Now I sell to the wind. You are an improvement.',
        ] },
      { type: 'checkpoint_shrine', x: 19, y: f },
      { type: 'lore_fragment', id: 'parapet_note', x: 12, y: f - 3,
        text: 'On a brass plaque: "IF YOU READ THIS AND ARE STILL BREATHING, YOU HAVE COME FURTHER THAN ANY OF US."' },
      { type: 'lore_fragment', id: 'parapet_note_2', x: 21, y: 3,
        text: 'A knight\'s last letter, unsent: "Tell the stranger from below that we are sorry. Tell them: we always were."' },
      // Parapet loft cache
      { type: 'item_pickup', itemId: 'ether_vial', x: 20, y: 3 },
      { type: 'coin', x: 19, y: 3 },
      { type: 'coin', x: 22, y: 3 },
      { type: 'health_pickup', x: 24, y: 3 },
      { type: 'banner_gold', x: 6, y: 2 },
      { type: 'banner_gold', x: 20, y: 2 },
      { type: 'castle_window', x: 13, y: 4 },
    ],
    ambience: 'castle_interior',
  };
}

// ================ FINALE (57-58) ==========================================

function buildRoom57() {
  const W = 46, H = 22;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  clearRect(tiles, f - 2, W - 1, f + 1, W - 1);
  fillRow(tiles, f - 4, 10, 14, 2);
  fillRow(tiles, f - 4, 32, 36, 2);
  fillRow(tiles, f - 8, 18, 28, 2);
  fillRow(tiles, f - 12, 20, 26, 2);
  // Cathedral maze — sacred columns divide the nave. The last approach
  // to the Sun is not a run; it is a pilgrimage.
  climbWall(tiles, 16, f, 3);
  duckWall(tiles, 30, f, 3);
  climbWall(tiles, 42, f, 3);
  return {
    name: 'Cathedral of the Sun',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room56', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'door', targetRoom: 'room58', x: W - 2, y: f, spawnX: 2, spawnY: 16 },
      { type: 'checkpoint_shrine', x: 20, y: f },
      // Pre-finale reward pile — the merchant's last words made good
      { type: 'health_pickup', x: 12, y: f - 5 },
      { type: 'health_pickup', x: 34, y: f - 5 },
      { type: 'item_pickup', itemId: 'soul_crystal', x: 23, y: f - 13 },
      { type: 'item_pickup', itemId: 'ether_vial', x: 24, y: f - 9 },
      { type: 'coin', x: 10, y: f - 5 },
      { type: 'coin', x: 14, y: f - 5 },
      { type: 'coin', x: 32, y: f - 5 },
      { type: 'coin', x: 36, y: f - 5 },
      { type: 'coin', x: 20, y: f - 9 },
      { type: 'coin', x: 26, y: f - 9 },
      { type: 'coin', x: 21, y: f - 13 },
      { type: 'coin', x: 25, y: f - 13 },
      // Hidden relic room — one final secret before the Sun
      { type: 'secret_wall', x: 5, y: f, hitsToBreak: 3 },
      { type: 'health_pickup', x: 3, y: f },
      { type: 'coin', x: 2, y: f },
      { type: 'coin', x: 4, y: f },
      { type: 'banner_gold', x: 8, y: 2 },
      { type: 'banner_gold', x: 22, y: 2 },
      { type: 'banner_gold', x: 36, y: 2 },
      { type: 'castle_window', x: 14, y: 4 },
      { type: 'castle_window', x: 26, y: 4 },
      { type: 'castle_window', x: 32, y: 4 },
      { type: 'ivy_drape', x: 20, y: 2 },
      { type: 'ivy_drape', x: 30, y: 2 },
      { type: 'lore_fragment', id: 'cathedral_note', x: 6, y: f,
        text: 'The sun is painted in cracked gold leaf above. Somewhere beyond this wall, the painting opens its eye.' },
      { type: 'lore_fragment', id: 'cathedral_note_2', x: 23, y: f - 13,
        text: 'At the cathedral\'s apex, a single sentence in a thousand languages: "WE WERE NEVER READY."' },
      { type: 'npc', npcType: 'hermit', x: 15, y: f,
        dialogue: [
          'So. You found the cathedral. The last place. I will not walk beyond this door with you.',
          'The Sun in there was once a god, they say. Or a god\'s idea of a sun.',
          'Hold tight what you have left. Everything you kept alive comes with you past this threshold.',
          'If it helps: I am proud of you. Truly. You should hear that before the end.',
        ] },
    ],
    ambience: 'cathedral',
  };
}

function buildRoom58() {
  // Final boss arena — big open dome. Intentionally kept clean of
  // hazards so the Scoured Sun's patterns are the whole show.
  const W = 52, H = 26;
  const tiles = makeRoom(W, H);
  const f = H - 3;
  clearRect(tiles, f - 2, 0, f + 1, 0);
  // Elevated side platforms
  fillRow(tiles, f - 5, 4, 10, 2);
  fillRow(tiles, f - 5, W - 11, W - 5, 2);
  fillRow(tiles, f - 10, 14, 20, 2);
  fillRow(tiles, f - 10, W - 21, W - 15, 2);
  fillRow(tiles, f - 14, 22, 30, 2);
  return {
    name: 'The Scoured Sun',
    width: W, height: H, tiles,
    playerSpawn: { x: 3, y: f },
    objects: [
      { type: 'door', targetRoom: 'room57', x: 1, y: f, spawnX: W - 3, spawnY: 16 },
      { type: 'boss', bossType: 'scoured_sun', x: W / 2, y: 6, hiddenIfBoss: 'boss_room58' },
      // Post-victory throne
      { type: 'lore_fragment', id: 'scoured_sun_ending', x: W / 2, y: f,
        requiresBoss: 'boss_room58',
        text: 'The Scoured Sun goes out. You stand in the dark on holy stone. The dark, for once, does not frighten you.' },
      { type: 'banner_gold', x: 6, y: 2 },
      { type: 'banner_gold', x: W - 7, y: 2 },
      { type: 'banner_gold', x: W / 2, y: 2 },
      { type: 'castle_window', x: 18, y: 4 },
      { type: 'castle_window', x: 30, y: 4 },
      { type: 'castle_window', x: 40, y: 4 },
      { type: 'ivy_drape', x: 24, y: 2 },
      { type: 'ivy_drape', x: 34, y: 2 },
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
