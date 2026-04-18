/**
 * Multiplayer client.
 *
 * Owns the lifecycle of an online session: creating/joining a room via the
 * room server, heartbeating local player state, and polling the server for
 * other players' state. The scene layer (GameScene) owns rendering via
 * RemotePlayer instances.
 *
 * The session is intentionally "shared world": every connected player sees
 * the others walk around, change rooms, jump, etc. There is no authority
 * over enemies, combat, or doors — each client still plays its own game.
 */

const DEFAULT_API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PLATFORMER_ROOM_API_BASE)
  || '';

const HEARTBEAT_MS = 180;
const POLL_ONLY_MS = 220;

function apiUrl(path) {
  const base = DEFAULT_API_BASE || '';
  return `${base}${path}`;
}

async function postJSON(path, body, timeoutMs = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json?.error || `http_${res.status}`);
      err.status = res.status;
      err.data = json;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

export async function createRoom(name) {
  return postJSON('/platformer/room/create', { name });
}

export async function joinRoom(roomCode, name) {
  return postJSON('/platformer/room/join', { roomCode, name });
}

export async function pingHealth() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(apiUrl('/platformer/room/health'), { signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    return res.ok && json?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export class MultiplayerClient {
  constructor({ roomCode, playerId, name, color }) {
    this.roomCode = roomCode;
    this.playerId = playerId;
    this.name = name;
    this.color = color ?? 0xffffff;

    /** Last remote snapshot keyed by playerId. */
    this.players = new Map();

    /** @type {null | (players: Map<string, object>) => void} */
    this.onPlayersUpdate = null;
    /** @type {null | (err: Error) => void} */
    this.onConnectionError = null;

    this._closed = false;
    this._heartbeatInFlight = false;
    this._nextHeartbeatAt = 0;
    this._getLocalState = null;
    this._consecutiveErrors = 0;
  }

  /** Register the callback GameScene uses to produce heartbeat payloads. */
  bindLocalStateProvider(fn) {
    this._getLocalState = fn;
  }

  start() {
    if (this._started || this._closed) return;
    this._started = true;
    this._tickHandle = setInterval(() => this._tick(), HEARTBEAT_MS);
  }

  async _tick() {
    if (this._closed || this._heartbeatInFlight) return;
    if (!this._getLocalState) return;

    const state = this._getLocalState();
    if (!state) return;

    this._heartbeatInFlight = true;
    try {
      const res = await postJSON('/platformer/room/state', {
        roomCode: this.roomCode,
        playerId: this.playerId,
        state: {
          ...state,
          name: this.name,
          color: this.color,
        },
      }, 5000);

      this._consecutiveErrors = 0;
      const list = Array.isArray(res?.players) ? res.players : [];
      this._ingestPlayers(list);
    } catch (e) {
      this._consecutiveErrors++;
      if (this._consecutiveErrors === 1 || this._consecutiveErrors % 8 === 0) {
        console.warn('[mp] heartbeat failed', e?.message || e);
        if (this.onConnectionError) this.onConnectionError(e);
      }
    } finally {
      this._heartbeatInFlight = false;
    }
  }

  _ingestPlayers(list) {
    const seen = new Set();
    for (const p of list) {
      if (!p?.id) continue;
      seen.add(p.id);
      this.players.set(p.id, {
        id: p.id,
        x: Number(p.x) || 0,
        y: Number(p.y) || 0,
        roomId: String(p.roomId || 'room1'),
        facing: p.facing === -1 ? -1 : 1,
        anim: String(p.anim || 'idle'),
        name: String(p.name || 'Traveler'),
        color: Number.isFinite(p.color) ? p.color : 0xffffff,
        hp: Number.isFinite(p.hp) ? p.hp : 5,
        maxHp: Number.isFinite(p.maxHp) ? p.maxHp : 5,
        ts: Number(p.ts) || Date.now(),
      });
    }
    for (const id of [...this.players.keys()]) {
      if (!seen.has(id)) this.players.delete(id);
    }
    if (this.onPlayersUpdate) this.onPlayersUpdate(this.players);
  }

  async leave() {
    if (this._closed) return;
    this._closed = true;
    if (this._tickHandle) {
      clearInterval(this._tickHandle);
      this._tickHandle = null;
    }
    try {
      await postJSON('/platformer/room/leave', {
        roomCode: this.roomCode,
        playerId: this.playerId,
      }, 2000);
    } catch {
      // best-effort — the server will TTL us out anyway.
    }
  }
}

/**
 * Deterministic-ish hue from a player name so remote players get a stable
 * recognisable tint without having to pick manually.
 */
export function colorFromName(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // Bias toward bright, high-saturation hues; never near-black or near-white.
  const hue = h % 360;
  return hslToRgbHex(hue, 0.65, 0.58);
}

function hslToRgbHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const rr = Math.round((r + m) * 255);
  const gg = Math.round((g + m) * 255);
  const bb = Math.round((b + m) * 255);
  return ((rr << 16) | (gg << 8) | bb) >>> 0;
}

export { HEARTBEAT_MS, POLL_ONLY_MS };
