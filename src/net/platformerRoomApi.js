/**
 * Platformer online rooms — same shape as truthordare room API (create / join / get / state).
 * In dev, Vite proxies /platformer/room to localhost:3002.
 * In prod, VITE_PLATFORMER_ROOM_API_BASE points at the deployed room server.
 */

const PROD_ROOM_SERVER = 'https://platformer-room-server.fly.dev';

function getApiBase() {
  if (import.meta.env.VITE_PLATFORMER_ROOM_API_BASE) {
    return String(import.meta.env.VITE_PLATFORMER_ROOM_API_BASE).replace(/\/$/, '');
  }
  const isLocal = typeof location !== 'undefined' &&
    /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  return isLocal ? '' : PROD_ROOM_SERVER;
}

const ROOM_PATH = '/platformer/room';

async function parseResponse(res, fallbackError) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg = data.error || data.message || res.statusText || fallbackError;
    throw new Error(msg);
  }
  return data;
}

async function fetchRoom(url, options) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const msg = err.message || 'Network error';
    const hint =
      msg.includes('fetch') || err.name === 'TypeError'
        ? ' Start the platformer room server: npm run server (needs Upstash Redis in .env).'
        : '';
    throw new Error(msg + hint);
  }
}

export async function createPlatformerRoom(hostName = 'Host') {
  const BASE = getApiBase();
  const res = await fetchRoom(`${BASE}${ROOM_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName: (hostName || 'Host').trim() || 'Host' }),
  });
  return parseResponse(res, 'Failed to create room');
}

export async function joinPlatformerRoom(gameCode, playerName) {
  const BASE = getApiBase();
  const res = await fetchRoom(`${BASE}${ROOM_PATH}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameCode: String(gameCode || '').trim().toUpperCase(),
      playerName: (playerName || 'Player').trim() || 'Player',
    }),
  });
  return parseResponse(res, 'Failed to join room');
}

export async function getPlatformerRoom(roomId) {
  const BASE = getApiBase();
  const res = await fetchRoom(
    `${BASE}${ROOM_PATH}?roomId=${encodeURIComponent(roomId)}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' } },
  );
  return parseResponse(res, 'Failed to get room');
}

export async function updatePlatformerRoomState(roomId, state) {
  const BASE = getApiBase();
  const res = await fetchRoom(`${BASE}${ROOM_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, state }),
  });
  return parseResponse(res, 'Failed to update room');
}

/** Merges one of host/guest into state.platformer without clobbering the other slot. */
export async function patchPlatformerPlayerState(roomId, { slot, player, lead }) {
  const BASE = getApiBase();
  const body = { roomId, slot, player };
  if (lead && typeof lead === 'object') body.lead = lead;
  const res = await fetchRoom(`${BASE}${ROOM_PATH}/patch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse(res, 'Failed to patch room');
}

export async function getPlatformerRoomStatus() {
  const BASE = getApiBase();
  try {
    const res = await fetchRoom(`${BASE}${ROOM_PATH}/status`, { method: 'GET' });
    return parseResponse(res, 'Status failed');
  } catch {
    return { available: false };
  }
}

export function leavePlatformerRoomBeacon(roomId, playerName) {
  try {
    const BASE = getApiBase();
    fetch(`${BASE}${ROOM_PATH}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerName: (playerName || '').trim() }),
      keepalive: true,
    }).catch(() => {});
  } catch (_) {}
}
