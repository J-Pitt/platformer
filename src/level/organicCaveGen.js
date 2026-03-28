/**
 * Organic cave generation (Phaser-compatible tile grid 0=air, 1=rock, 2=ledge).
 *
 * Technical mapping (design spec → code):
 * - Organic mass: 2D CA on interior cells; 8-neighbor count, border counts as wall.
 *   Smoothing rule: neighbors >= 5 → wall(1), else air(0). Default 5 CA passes + 2 post-carve.
 * - Initial density: Bernoulli(fillProbability) inside a noise-driven envelope (fbm ceiling/floor
 *   curves per column) → variable ceiling height, uneven floor band, choke vs cavern clearance.
 * - Sinuous connection: quadratic Bezier spine across the room + fbm radius wobble → carved disks.
 * - Momentum tunnelers: random walkers with high keep-direction probability → long thin side branches.
 * - Traverse guarantee: BFS from spawn; if exit not reached, carve a horizontal safety corridor.
 * - Ledges: sparse floating tile-2 runs in open air (void beneath).
 * - Rendering: LevelManager uses neighbor bitmask autotiling (organicWallStyle) + stalactite decor.
 *
 * Marching squares / DynamicTilemapLayer: not used here; the game builds Arcade static bodies from
 * the same grid. A future swap to putTileAt on a Tilemap could consume the same array.
 */

export function organicDecorRng(seed) {
  return mulberry32((seed ?? 1) >>> 0);
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2i(seed, x, y) {
  let h = (seed ^ (x * 374761393) ^ (y * 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/** 2D value noise in [0, 1] */
function valueNoise2(seed, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smoothstep(x - x0);
  const fy = smoothstep(y - y0);
  const v00 = hash2i(seed, x0, y0) / 4294967296;
  const v10 = hash2i(seed, x0 + 1, y0) / 4294967296;
  const v01 = hash2i(seed, x0, y0 + 1) / 4294967296;
  const v11 = hash2i(seed, x0 + 1, y0 + 1) / 4294967296;
  const xa = lerp(v00, v10, fx);
  const xb = lerp(v01, v11, fx);
  return lerp(xa, xb, fy);
}

function fbm(seed, x, y, octaves = 3) {
  let amp = 0.5;
  let f = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * valueNoise2(seed + i * 101, x * f, y * f);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

function cloneGrid(tiles) {
  return tiles.map((row) => row.slice());
}

function countWallNeighbors(grid, r, c, H, W, countSelf) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        if (countSelf && grid[r][c] === 1) n += 1;
        continue;
      }
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= H || cc < 0 || cc >= W) {
        n += 1;
        continue;
      }
      if (grid[rr][cc] === 1) n += 1;
    }
  }
  return n;
}

/** 5+ rule: neighbor walls >= 5 => wall, else empty */
function smoothStepCA(grid, H, W) {
  const next = cloneGrid(grid);
  for (let r = 1; r < H - 1; r += 1) {
    for (let c = 1; c < W - 1; c += 1) {
      const nw = countWallNeighbors(grid, r, c, H, W, false);
      next[r][c] = nw >= 5 ? 1 : 0;
    }
  }
  return next;
}

function carveDisk(grid, H, W, cr, cc, radius, val = 0) {
  const r2 = radius * radius;
  const ir = Math.ceil(radius);
  for (let dr = -ir; dr <= ir; dr += 1) {
    for (let dc = -ir; dc <= ir; dc += 1) {
      if (dr * dr + dc * dc > r2) continue;
      const r = Math.round(cr + dr);
      const c = Math.round(cc + dc);
      if (r < 1 || r >= H - 1 || c < 1 || c >= W - 1) continue;
      grid[r][c] = val;
    }
  }
}

/** Quadratic Bezier: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2 */
function quadBezier(p0, p1, p2, t) {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

function splineCarveMainTunnel(grid, H, W, seed) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const p0 = { x: W * 0.12 + rng() * 3, y: H * (0.42 + rng() * 0.12) };
  const p2 = { x: W * 0.88 - rng() * 3, y: H * (0.4 + rng() * 0.14) };
  const midX = W * 0.5 + (rng() - 0.5) * W * 0.12;
  const midY = H * (0.22 + rng() * 0.2);
  const p1 = { x: midX, y: midY };
  const steps = Math.max(120, W * 4);
  const baseR = 2.2 + rng() * 0.8;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const p = quadBezier(p0, p1, p2, t);
    const wobble = fbm(seed, p.x * 0.15, p.y * 0.15) * 1.2;
    carveDisk(grid, H, W, p.y + wobble * 0.3, p.x, baseR + wobble * 0.4, 0);
  }
}

const DIRS = [
  { dr: 0, dc: 1 },
  { dr: 0, dc: -1 },
  { dr: 1, dc: 0 },
  { dr: -1, dc: 0 },
];

function momentumTunnelers(grid, H, W, rng, count, steps, momentum) {
  for (let w = 0; w < count; w += 1) {
    let r = 2 + Math.floor(rng() * (H - 4));
    let c = 2 + Math.floor(rng() * (W - 4));
    let dir = DIRS[Math.floor(rng() * 4)];
    for (let s = 0; s < steps; s += 1) {
      if (rng() > momentum) {
        dir = DIRS[Math.floor(rng() * 4)];
      }
      r = Math.min(H - 3, Math.max(2, r + dir.dr));
      c = Math.min(W - 3, Math.max(2, c + dir.dc));
      carveDisk(grid, H, W, r, c, 1.35 + rng() * 0.5, 0);
    }
  }
}

/** Ensure border ring is solid rock */
function sealBorder(grid, H, W) {
  for (let c = 0; c < W; c += 1) {
    grid[0][c] = 1;
    grid[H - 1][c] = 1;
    if (H > 1) grid[H - 2][c] = 1;
  }
  for (let r = 0; r < H; r += 1) {
    grid[r][0] = 1;
    grid[r][W - 1] = 1;
  }
}

/**
 * Noise-driven ceiling row (inclusive top wall band) and floor row (start of bottom mass).
 * Produces narrow vertical clearance in some columns (choke) and tall in others (cavern).
 */
function envelopeRows(seed, W, H, col) {
  const nx = col * 0.09;
  const ceilN = fbm(seed, nx, 1.7);
  const floorN = fbm(seed, nx + 20, 4.2);
  const ceilRow = Math.floor(1 + ceilN * (H * 0.28));
  const floorRow = Math.floor(H - 2 - floorN * (H * 0.22));
  const minGap = 7;
  return {
    ceilRow: Math.max(1, Math.min(ceilRow, H - minGap - 4)),
    floorRow: Math.min(H - 2, Math.max(floorRow, ceilRow + minGap)),
  };
}

function initEnvelopeAndRandom(seed, W, H, fillProbability) {
  const rng = mulberry32(seed);
  const grid = [];
  for (let r = 0; r < H; r += 1) {
    const row = [];
    for (let c = 0; c < W; c += 1) {
      row.push(1);
    }
    grid.push(row);
  }

  for (let c = 1; c < W - 1; c += 1) {
    const { ceilRow, floorRow } = envelopeRows(seed, W, H, c);
    for (let r = 1; r < H - 1; r += 1) {
      if (r <= ceilRow || r >= floorRow) {
        grid[r][c] = 1;
      } else if (rng() < fillProbability) {
        grid[r][c] = 1;
      } else {
        grid[r][c] = 0;
      }
    }
  }
  return grid;
}

function ensureDoorGaps(grid, H, W, rowStart, rowEnd, colsWest, colsEast) {
  for (let r = rowStart; r <= rowEnd; r += 1) {
    if (r < 1 || r >= H - 1) continue;
    for (const c of colsWest) {
      if (c >= 1 && c < W - 1) grid[r][c] = 0;
    }
    for (const c of colsEast) {
      if (c >= 1 && c < W - 1) grid[r][c] = 0;
    }
  }
}

function bfsReachable(grid, H, W, sr, sc) {
  const vis = new Uint8Array(H * W);
  const q = [];
  const idx = (r, c) => r * W + c;
  const push = (r, c) => {
    if (r < 0 || r >= H || c < 0 || c >= W) return;
    if (grid[r][c] !== 0) return;
    const i = idx(r, c);
    if (vis[i]) return;
    vis[i] = 1;
    q.push(r, c);
  };
  push(sr, sc);
  for (let qi = 0; qi < q.length; qi += 2) {
    const r = q[qi];
    const c = q[qi + 1];
    push(r - 1, c);
    push(r + 1, c);
    push(r, c - 1);
    push(r, c + 1);
  }
  return vis;
}

function carveCorridorIfBlocked(grid, H, W, sr, sc, er, ec) {
  let vis = bfsReachable(grid, H, W, sr, sc);
  if (vis[er * W + ec]) return;

  let cr = sr;
  let cc = sc;
  const maxSteps = W * H * 2;
  for (let step = 0; step < maxSteps; step += 1) {
    if (cr === er && cc === ec) break;
    if (cc < ec) cc += 1;
    else if (cc > ec) cc -= 1;
    else if (cr < er) cr += 1;
    else if (cr > er) cr -= 1;
    carveDisk(grid, H, W, cr, cc, 1.8, 0);
  }
  vis = bfsReachable(grid, H, W, sr, sc);
  if (!vis[er * W + ec]) {
    for (let c = 1; c < W - 1; c += 1) {
      const r = Math.floor((sr + er) / 2);
      carveDisk(grid, H, W, r, c, 2, 0);
    }
  }
}

/** Small floating ledges (tile 2): thin walk surfaces with void beneath */
function placeNaturalLedges(grid, H, W, rng) {
  for (let r = 2; r < H - 4; r += 1) {
    for (let c = 2; c < W - 3; c += 1) {
      if (grid[r][c] !== 0) continue;
      if (rng() > 0.035) continue;
      const len = 2 + Math.floor(rng() * 3);
      let ok = true;
      for (let k = 0; k < len; k += 1) {
        const cc = c + k;
        if (cc >= W - 2 || grid[r][cc] !== 0) {
          ok = false;
          break;
        }
        if (r + 1 >= H || grid[r + 1][cc] !== 0) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let k = 0; k < len; k += 1) {
        grid[r][c + k] = 2;
      }
    }
  }
}

/**
 * @param {object} opts
 * @param {number} [opts.width]
 * @param {number} [opts.height]
 * @param {number} [opts.seed]
 * @param {number} [opts.fillProbability] initial wall density in interior (0–1)
 * @param {number} [opts.smoothIterations] CA passes (default 5)
 */
export function buildOrganicCaveRoom(opts = {}) {
  const W = opts.width ?? 56;
  const H = opts.height ?? 26;
  const seed = opts.seed ?? 42;
  const fillProbability = opts.fillProbability ?? 0.46;
  const smoothIterations = opts.smoothIterations ?? 5;

  let grid = initEnvelopeAndRandom(seed, W, H, fillProbability);

  const rngPost = mulberry32(seed ^ 0x85ebca6b);
  for (let i = 0; i < smoothIterations; i += 1) {
    grid = smoothStepCA(grid, H, W);
  }

  splineCarveMainTunnel(grid, H, W, seed);
  momentumTunnelers(grid, H, W, rngPost, 14, 180, 0.88);

  for (let i = 0; i < 2; i += 1) {
    grid = smoothStepCA(grid, H, W);
  }

  sealBorder(grid, H, W);

  const f = H - 3;
  ensureDoorGaps(grid, H, W, f - 2, f + 1, [1, 2], [W - 2, W - 3]);

  carveCorridorIfBlocked(grid, H, W, f, 3, f, W - 3);

  placeNaturalLedges(grid, H, W, rngPost);

  const tiles = grid;

  return {
    name: 'Wind-Hewn Cavern (Procedural)',
    width: W,
    height: H,
    tiles,
    ambience: 'cavern',
    organicWallStyle: true,
    organicDecor: true,
    organicDecorSeed: seed,
    playerSpawn: { x: 4, y: f },
    objects: [
      {
        type: 'door',
        targetRoom: 'room2',
        x: W - 2,
        y: f,
        spawnX: 2,
        spawnY: 27,
      },
      {
        type: 'door',
        targetRoom: 'room1',
        x: 1,
        y: f,
        spawnX: 48,
        spawnY: f,
      },
    ],
  };
}
