#!/usr/bin/env node
/**
 * level_audit.cjs
 * Static analysis of src/level/rooms.js — per-room density, content breakdown,
 * theme mismatches, and progression hooks. No side effects.
 *
 * Parses the file textually to find buildRoomN() function bodies, then extracts:
 *   - name, width/height (where findable)
 *   - ambience, locked
 *   - counts of each object type
 *   - door targets
 *   - ability orbs
 *   - lighting beams count
 */

const fs = require('fs');
const path = require('path');

const ROOMS_PATH = path.join(__dirname, '..', 'src', 'level', 'rooms.js');
const src = fs.readFileSync(ROOMS_PATH, 'utf8');

// Split file on top-level buildRoomN declarations
const roomRe = /function\s+(buildRoom\d+)\s*\(\s*\)\s*\{([\s\S]*?)\n\}/g;

const rooms = [];
let m;
while ((m = roomRe.exec(src))) {
  rooms.push({ fn: m[1], body: m[2] });
}

function countMatches(body, regex) {
  const r = new RegExp(regex.source || regex, regex.flags || 'g');
  const out = [];
  let x;
  while ((x = r.exec(body))) out.push(x);
  return out;
}

const ENEMY_TYPES = ['crawler', 'flyer', 'brute', 'boss'];
const TRAP_TYPES = [
  'pendulum_trap', 'spike_wall', 'crumble_platform', 'magma_pool',
  'fireball_shooter', 'floor_spikes', 'saw_blade', 'flame_jet',
  'moving_platform',
];
const DECORATION_TYPES = [
  'stalactite', 'stalactite_sm', 'stalagmite', 'fungus', 'fungus_small',
  'crystal', 'crystal_cluster', 'chain', 'pillar', 'pillar_broken',
  'vine', 'light_beam', 'pine_tree', 'snow_rock', 'wood_bridge',
  'mountain_banner', 'birds_silhouette', 'ruin_arch', 'hanging_moss',
  'glow_spore', 'mud_patch', 'gravel_patch', 'tomb_light_beam',
];
const MISC_TYPES = ['npc', 'coin', 'bench', 'teleport', 'merchant_shop', 'health_pickup'];

function extractName(body) {
  const n = body.match(/name:\s*'([^']+)'/) || body.match(/name:\s*"([^"]+)"/);
  return n ? n[1] : '(unnamed)';
}
function extractAmbience(body) {
  const a = body.match(/ambience:\s*'([^']+)'/) || body.match(/ambience:\s*"([^"]+)"/);
  return a ? a[1] : '(none)';
}
function extractWH(body) {
  const w = body.match(/const\s+W\s*=\s*(\d+)/) || body.match(/W\s*=\s*(\d+)/);
  const h = body.match(/const\s+H\s*=\s*(\d+)/) || body.match(/H\s*=\s*(\d+)/);
  return {
    W: w ? +w[1] : null,
    H: h ? +h[1] : null,
  };
}
function extractLocked(body) {
  return /locked:\s*true/.test(body);
}

function countType(body, t) {
  const r = new RegExp(`\\btype:\\s*'${t}'`, 'g');
  return (body.match(r) || []).length;
}

function extractDoorTargets(body) {
  const re = /type:\s*'door'[^}]*?targetRoom:\s*'([^']+)'/g;
  const out = [];
  let x;
  while ((x = re.exec(body))) out.push(x[1]);
  return out;
}

function extractOrbs(body) {
  const re = /type:\s*'ability_orb'[^}]*?ability:\s*'([^']+)'/g;
  const out = [];
  let x;
  while ((x = re.exec(body))) out.push(x[1]);
  return out;
}

function extractTeleports(body) {
  const re = /type:\s*'teleport'[^}]*?targetRoom:\s*'([^']+)'/g;
  const out = [];
  let x;
  while ((x = re.exec(body))) out.push(x[1]);
  return out;
}

function countLightingBeams(body) {
  const m = body.match(/beams:\s*\[([\s\S]*?)\]/);
  if (!m) return 0;
  return (m[1].match(/\{[^}]*\}/g) || []).length;
}

const report = [];
for (const r of rooms) {
  const idx = Number(r.fn.replace('buildRoom', ''));
  const name = extractName(r.body);
  const amb = extractAmbience(r.body);
  const locked = extractLocked(r.body);
  const wh = extractWH(r.body);

  const enemyCounts = {};
  let enemyTotal = 0;
  for (const t of ENEMY_TYPES) {
    const c = countType(r.body, t);
    enemyCounts[t] = c;
    enemyTotal += c;
  }

  const trapCounts = {};
  let trapTotal = 0;
  for (const t of TRAP_TYPES) {
    const c = countType(r.body, t);
    trapCounts[t] = c;
    trapTotal += c;
  }

  let decoTotal = 0;
  for (const t of DECORATION_TYPES) {
    decoTotal += countType(r.body, t);
  }

  const miscCounts = {};
  for (const t of MISC_TYPES) {
    miscCounts[t] = countType(r.body, t);
  }

  const doors = extractDoorTargets(r.body);
  const orbs = extractOrbs(r.body);
  const teleports = extractTeleports(r.body);
  const beams = countLightingBeams(r.body);

  report.push({
    idx, fn: r.fn, name, ambience: amb, locked, W: wh.W, H: wh.H,
    enemyTotal, enemyCounts, trapTotal, trapCounts, decoTotal, miscCounts,
    doors, teleports, orbs, beams,
  });
}

report.sort((a, b) => a.idx - b.idx);

const DENSITY_LIMIT_ENEMIES = 6;
const DENSITY_LIMIT_TRAPS = 8;

console.log('='.repeat(100));
console.log('LEVEL AUDIT — per-room breakdown');
console.log('='.repeat(100));
console.log(
  'Room | Name                          | Ambience           | Lkd | W×H     | E | T | D | Orbs     | Doors',
);
console.log('-'.repeat(100));
for (const r of report) {
  const pad = (s, n) => String(s).padEnd(n);
  const num = (n, w) => String(n).padStart(w);
  console.log(
    `${num(r.idx, 4)} | ${pad(r.name, 29)} | ${pad(r.ambience, 18)} | ${pad(r.locked ? 'Y' : ' ', 3)} | ${pad(`${r.W}×${r.H}`, 7)} | ${num(r.enemyTotal, 1)} | ${num(r.trapTotal, 2)} | ${num(r.decoTotal, 2)} | ${pad(r.orbs.join(',') || '', 8)} | ${r.doors.join('→')}`,
  );
}

console.log('\n' + '='.repeat(100));
console.log(`FLAGS — rooms exceeding density budgets (enemies > ${DENSITY_LIMIT_ENEMIES} or traps > ${DENSITY_LIMIT_TRAPS})`);
console.log('='.repeat(100));
for (const r of report) {
  const ef = r.enemyTotal > DENSITY_LIMIT_ENEMIES;
  const tf = r.trapTotal > DENSITY_LIMIT_TRAPS;
  if (!ef && !tf) continue;
  const parts = [];
  if (ef) parts.push(`enemies=${r.enemyTotal}`);
  if (tf) parts.push(`traps=${r.trapTotal}`);
  console.log(`  room${r.idx} (${r.name}): ${parts.join(', ')}`);
  const ec = Object.entries(r.enemyCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(' ');
  const tc = Object.entries(r.trapCounts).filter(([, v]) => v > 0).map(([k, v]) => `${k}=${v}`).join(' ');
  if (ec) console.log(`      enemies: ${ec}`);
  if (tc) console.log(`      traps:   ${tc}`);
}

console.log('\n' + '='.repeat(100));
console.log('FLAGS — theme/name mismatches');
console.log('='.repeat(100));
for (const r of report) {
  const nameLower = r.name.toLowerCase();
  const amb = r.ambience;
  const isIceName = /froz|ice|frost|glacier|crystal/.test(nameLower);
  const hasMagma = r.trapCounts['magma_pool'] > 0;
  const hasFlameJet = r.trapCounts['flame_jet'] > 0;
  const hasFireball = r.trapCounts['fireball_shooter'] > 0;
  if (isIceName && (hasMagma || hasFlameJet || hasFireball)) {
    const what = [];
    if (hasMagma) what.push(`magma_pool=${r.trapCounts.magma_pool}`);
    if (hasFlameJet) what.push(`flame_jet=${r.trapCounts.flame_jet}`);
    if (hasFireball) what.push(`fireball_shooter=${r.trapCounts.fireball_shooter}`);
    console.log(`  room${r.idx} "${r.name}" [${amb}]: ice-themed but has ${what.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(100));
console.log('FLAGS — room graph / flow');
console.log('='.repeat(100));
const allDoors = {};
for (const r of report) allDoors[`room${r.idx}`] = r.doors;
for (const r of report) {
  if (r.doors.length === 0) console.log(`  room${r.idx} has no forward doors`);
  if (r.teleports.length > 0) {
    console.log(`  room${r.idx} has teleport -> ${r.teleports.join(', ')}`);
  }
}

console.log('\n' + '='.repeat(100));
console.log('SUMMARY TOTALS');
console.log('='.repeat(100));
const total = report.reduce((a, r) => ({
  enemy: a.enemy + r.enemyTotal,
  trap: a.trap + r.trapTotal,
  deco: a.deco + r.decoTotal,
}), { enemy: 0, trap: 0, deco: 0 });
console.log(`  total enemies: ${total.enemy}`);
console.log(`  total traps:   ${total.trap}`);
console.log(`  total deco:    ${total.deco}`);
console.log(`  total rooms:   ${report.length}`);

console.log('\nAmbience histogram:');
const ambHist = {};
for (const r of report) ambHist[r.ambience] = (ambHist[r.ambience] || 0) + 1;
for (const [k, v] of Object.entries(ambHist).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(22)} ${v}`);
}

console.log('\nConsecutive same-ambience streaks:');
let streakAmb = null, streakLen = 0, streakStart = 0;
for (let i = 0; i < report.length; i++) {
  const r = report[i];
  if (r.ambience === streakAmb) {
    streakLen++;
  } else {
    if (streakLen >= 3) {
      console.log(`  rooms ${streakStart}-${streakStart + streakLen - 1} all "${streakAmb}" (${streakLen})`);
    }
    streakAmb = r.ambience;
    streakLen = 1;
    streakStart = r.idx;
  }
}
if (streakLen >= 3) {
  console.log(`  rooms ${streakStart}-${streakStart + streakLen - 1} all "${streakAmb}" (${streakLen})`);
}
