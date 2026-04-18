// Platformer multiplayer room server.
//
// Thin Express wrapper around Upstash Redis REST. Clients create or join a
// short alphanumeric room code, then heartbeat their per-player state into
// a Redis hash. Other clients poll the hash and render remote players.
//
// No authentication, no authoritative simulation: the server just stores
// and echoes state. PvP / anti-cheat is intentionally out of scope.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';

const PORT = Number.parseInt(process.env.PLATFORMER_ROOM_PORT, 10) || 3002;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error(
    '[roomServer] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set. '
    + 'Copy env.example to .env and fill them in.',
  );
  process.exit(1);
}

const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

// ---------- Utils ----------

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LEN = 5;
const PLAYER_STALE_MS = 10_000;
const ROOM_TTL_SEC = 60 * 60 * 6; // 6h idle expiry

function randRoomCode() {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    s += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return s;
}

function normaliseRoomCode(code) {
  return String(code || '').trim().toUpperCase();
}

function playerHashKey(code) {
  return `pl:room:${code}:players`;
}

function roomMetaKey(code) {
  return `pl:room:${code}:meta`;
}

function randPlayerId() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

function nowMs() {
  return Date.now();
}

function trimName(n) {
  return String(n || 'Traveler').trim().slice(0, 16) || 'Traveler';
}

function clampStateBlob(state) {
  if (!state || typeof state !== 'object') return null;
  const out = {
    x: Number(state.x) || 0,
    y: Number(state.y) || 0,
    roomId: String(state.roomId || 'room1').slice(0, 32),
    facing: state.facing === -1 ? -1 : 1,
    anim: String(state.anim || 'idle').slice(0, 32),
    name: trimName(state.name),
    hp: Number.isFinite(state.hp) ? Math.max(0, Math.min(20, state.hp)) : 5,
    maxHp: Number.isFinite(state.maxHp) ? Math.max(1, Math.min(20, state.maxHp)) : 5,
    color: Number.isFinite(state.color) ? (state.color >>> 0) % 0x1_00_00_00 : 0xffffff,
    ts: nowMs(),
  };
  return out;
}

async function storePlayerState(code, playerId, state) {
  const blob = clampStateBlob(state);
  if (!blob) return null;
  const key = playerHashKey(code);
  await redis.hset(key, { [playerId]: JSON.stringify(blob) });
  await redis.expire(key, ROOM_TTL_SEC);
  await redis.expire(roomMetaKey(code), ROOM_TTL_SEC);
  return blob;
}

async function readRoomPlayers(code, excludeId) {
  const raw = await redis.hgetall(playerHashKey(code));
  if (!raw) return [];
  const cutoff = nowMs() - PLAYER_STALE_MS;
  const out = [];
  const staleFields = [];
  for (const [pid, val] of Object.entries(raw)) {
    if (pid === excludeId) continue;
    let parsed = null;
    try {
      parsed = typeof val === 'string' ? JSON.parse(val) : val;
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed !== 'object') {
      staleFields.push(pid);
      continue;
    }
    if (parsed.ts && parsed.ts < cutoff) {
      staleFields.push(pid);
      continue;
    }
    out.push({ id: pid, ...parsed });
  }
  if (staleFields.length) {
    // Best-effort cleanup so the hash doesn't grow forever.
    redis.hdel(playerHashKey(code), ...staleFields).catch(() => {});
  }
  return out;
}

// ---------- Routes ----------

app.get('/platformer/room/health', async (_req, res) => {
  try {
    await redis.ping();
    res.json({ ok: true });
  } catch (e) {
    console.warn('[roomServer] health check failed', e?.message);
    res.status(503).json({ ok: false, error: 'redis_unreachable' });
  }
});

app.post('/platformer/room/create', async (req, res) => {
  const name = trimName(req.body?.name);
  let code = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = randRoomCode();
    // Reserve the metadata key only if it doesn't already exist.
    const set = await redis.set(
      roomMetaKey(candidate),
      JSON.stringify({ createdAt: nowMs(), host: name }),
      { nx: true, ex: ROOM_TTL_SEC },
    );
    if (set === 'OK' || set === true) {
      code = candidate;
      break;
    }
  }
  if (!code) return res.status(503).json({ error: 'could_not_allocate_code' });

  const playerId = randPlayerId();
  res.json({ roomCode: code, playerId, name });
});

app.post('/platformer/room/join', async (req, res) => {
  const code = normaliseRoomCode(req.body?.roomCode);
  const name = trimName(req.body?.name);
  if (!code || code.length !== ROOM_CODE_LEN) {
    return res.status(400).json({ error: 'invalid_code' });
  }
  const meta = await redis.get(roomMetaKey(code));
  if (!meta) return res.status(404).json({ error: 'room_not_found' });
  await redis.expire(roomMetaKey(code), ROOM_TTL_SEC);
  const playerId = randPlayerId();
  res.json({ roomCode: code, playerId, name });
});

app.post('/platformer/room/state', async (req, res) => {
  const code = normaliseRoomCode(req.body?.roomCode);
  const playerId = String(req.body?.playerId || '').slice(0, 32);
  if (!code || !playerId) return res.status(400).json({ error: 'missing_params' });
  const meta = await redis.get(roomMetaKey(code));
  if (!meta) return res.status(404).json({ error: 'room_not_found' });

  await storePlayerState(code, playerId, req.body?.state);
  const others = await readRoomPlayers(code, playerId);
  res.json({ ok: true, players: others, serverTime: nowMs() });
});

app.post('/platformer/room/leave', async (req, res) => {
  const code = normaliseRoomCode(req.body?.roomCode);
  const playerId = String(req.body?.playerId || '').slice(0, 32);
  if (code && playerId) {
    await redis.hdel(playerHashKey(code), playerId).catch(() => {});
  }
  res.json({ ok: true });
});

app.get('/platformer/room/players', async (req, res) => {
  const code = normaliseRoomCode(req.query?.roomCode);
  const playerId = String(req.query?.playerId || '').slice(0, 32);
  if (!code) return res.status(400).json({ error: 'missing_params' });
  const meta = await redis.get(roomMetaKey(code));
  if (!meta) return res.status(404).json({ error: 'room_not_found' });
  const players = await readRoomPlayers(code, playerId);
  res.json({ players, serverTime: nowMs() });
});

app.use((err, _req, res, _next) => {
  console.error('[roomServer] unhandled', err);
  res.status(500).json({ error: 'internal' });
});

app.listen(PORT, () => {
  console.log(`[roomServer] listening on http://localhost:${PORT}`);
  console.log(`[roomServer] upstash: ${UPSTASH_URL.replace(/^https?:\/\//, '').slice(0, 24)}...`);
});
