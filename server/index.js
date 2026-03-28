/**
 * Platformer online room API — same pattern as truthordare/server (Upstash Redis REST).
 * Default port 3002. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in .env (copy env.example).
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const { config } = await import('dotenv');
  config({ path: join(__dirname, '..', '.env') });
} catch {}

import express from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

const PORT = Number(process.env.PORT || process.env.PLATFORMER_ROOM_PORT) || 3002;
const REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const REDIS_KEY_PREFIX = 'platformer:';
const ROOM_TTL_SEC = 86400;

if (!REST_URL || !REST_TOKEN) {
  console.error('Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env (see env.example).');
  process.exit(1);
}

const redis = new Redis({ url: REST_URL, token: REST_TOKEN });

const ALLOWED_ORIGINS = [
  'https://main.d1mvd9eeikcm44.amplifyapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];
if (process.env.ALLOWED_ORIGIN) ALLOWED_ORIGINS.push(process.env.ALLOWED_ORIGIN);
const isLocalOrigin = (o) => !o || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o);
const isAmplifyOrigin = (o) => o && /\.amplifyapp\.com$/.test(new URL(o).hostname);

function roomKey(roomId) {
  return `${REDIS_KEY_PREFIX}room:${roomId}`;
}
function codeKey(gameCode) {
  return `${REDIS_KEY_PREFIX}code:${String(gameCode).toUpperCase()}`;
}

function randomGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function parseRoom(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

const app = express();
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin) || isLocalOrigin(origin) || isAmplifyOrigin(origin)) return cb(null, true);
      return cb(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
);
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/platformer/room/status', (_, res) => {
  res.json({ available: !!(REST_URL && REST_TOKEN) });
});

app.post('/platformer/room', async (req, res) => {
  try {
    const body = req.body || {};
    if (body.roomId !== undefined && body.state !== undefined) {
      const { roomId, state } = body;
      const raw = await redis.get(roomKey(roomId));
      if (!raw) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      const room = parseRoom(raw);
      room.state = state;
      room.updatedAt = new Date().toISOString();
      await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC });
      return res.json({ success: true, roomId });
    }

    const hostName = (body.hostName && String(body.hostName).trim()) ? String(body.hostName).trim() : 'Host';
    let code;
    let exists = true;
    for (let attempt = 0; attempt < 10 && exists; attempt += 1) {
      code = randomGameCode();
      exists = (await redis.get(codeKey(code))) != null;
    }
    if (exists) {
      return res.status(500).json({ success: false, error: 'Could not generate unique code' });
    }
    const roomId = randomUUID();
    const room = {
      roomId,
      gameCode: code,
      hostName,
      players: [hostName],
      state: { platformer: {} },
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC });
    await redis.set(codeKey(code), roomId, { ex: ROOM_TTL_SEC });
    return res.json({ success: true, roomId, gameCode: code, players: [hostName] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/platformer/room/join', async (req, res) => {
  try {
    const { gameCode, playerName } = req.body || {};
    if (!gameCode || !playerName || !String(playerName).trim()) {
      return res.status(400).json({ success: false, error: 'gameCode and playerName required' });
    }
    const code = String(gameCode).trim().toUpperCase();
    const roomId = await redis.get(codeKey(code));
    if (!roomId) {
      return res.status(404).json({ success: false, error: 'Game code not found' });
    }
    const raw = await redis.get(roomKey(roomId));
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    const room = parseRoom(raw);
    const players = Array.isArray(room.players) ? [...room.players] : [];
    const name = String(playerName).trim() || 'Player';
    if (players.includes(name)) {
      return res.json({ success: true, roomId, players, state: room.state || null });
    }
    if (players.length >= 2) {
      return res.status(403).json({ success: false, error: 'Room full (max 2 players)' });
    }
    players.push(name);
    room.players = players;
    room.updatedAt = new Date().toISOString();
    if (!Array.isArray(room.messages)) room.messages = [];
    await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC });
    return res.json({ success: true, roomId, players, state: room.state || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/platformer/room', async (req, res) => {
  try {
    const roomId = req.query.roomId;
    if (!roomId) {
      return res.status(400).json({ success: false, error: 'roomId required' });
    }
    const raw = await redis.get(roomKey(roomId));
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    const room = parseRoom(raw);
    return res.json({
      success: true,
      roomId: room.roomId,
      gameCode: room.gameCode,
      players: room.players || [],
      state: room.state || null,
      messages: room.messages || [],
      updatedAt: room.updatedAt || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/** Merge one player slot + optional lead fields without clobbering the other slot. */
app.post('/platformer/room/patch', async (req, res) => {
  try {
    const { roomId, slot, player, lead } = req.body || {};
    if (!roomId || (slot !== 'host' && slot !== 'guest')) {
      return res.status(400).json({ success: false, error: 'roomId and slot (host|guest) required' });
    }
    const raw = await redis.get(roomKey(roomId));
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    const room = parseRoom(raw);
    const st = room.state && typeof room.state === 'object' ? { ...room.state } : {};
    const plat = { ...(st.platformer && typeof st.platformer === 'object' ? st.platformer : {}) };
    if (player && typeof player === 'object') plat[slot] = player;
    if (lead && typeof lead === 'object') Object.assign(plat, lead);
    st.platformer = plat;
    room.state = st;
    room.updatedAt = new Date().toISOString();
    await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/platformer/room/leave', async (req, res) => {
  try {
    const { roomId, playerName } = req.body || {};
    if (!roomId || !String(playerName || '').trim()) {
      return res.status(400).json({ success: false, error: 'roomId and playerName required' });
    }
    const raw = await redis.get(roomKey(roomId));
    if (!raw) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }
    const room = parseRoom(raw);
    const players = Array.isArray(room.players) ? [...room.players] : [];
    const i = players.findIndex((p) => String(p).trim() === String(playerName).trim());
    if (i === -1) {
      return res.json({ success: true, left: false, players });
    }
    players.splice(i, 1);
    room.players = players;
    room.updatedAt = new Date().toISOString();
    await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC });
    return res.json({ success: true, left: true, players });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Platformer room server on http://localhost:${PORT}`);
});
