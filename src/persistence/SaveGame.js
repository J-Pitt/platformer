import { TILE_SIZE, rooms } from '../level/rooms.js';

const STORAGE_KEY = 'abyssal_depths_save_v1';
const PLAYER_NAME_KEY = 'abyssal_depths_player_name';
export const SAVE_VERSION = 1;

export function getStoredPlayerName() {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredPlayerName(name) {
  const n = String(name || '').trim().slice(0, 28) || 'Traveler';
  try {
    localStorage.setItem(PLAYER_NAME_KEY, n);
  } catch {
    /* ignore */
  }
  return n;
}

export function loadGameState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== SAVE_VERSION || typeof s.roomId !== 'string') return null;
    if (!rooms[s.roomId]) return null;
    return s;
  } catch {
    return null;
  }
}

export function hasSavedGame() {
  return loadGameState() != null;
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getSummary() {
  const s = loadGameState();
  if (!s) return null;
  return {
    playerName: s.playerName || getStoredPlayerName() || 'Traveler',
    roomId: s.roomId,
    roomName: rooms[s.roomId]?.name || s.roomId,
    savedAt: s.savedAt || null,
  };
}

function collectAbilities(player) {
  const keys = ['slash', 'wallJump', 'dash', 'doubleJump', 'spear', 'kick', 'map'];
  return keys.filter((k) => player.hasAbility(k));
}

export function buildSaveState(scene) {
  const p = scene.player;
  const lm = scene.levelManager;
  if (!p || !lm?.currentRoomId) return null;

  const playerName =
    scene.savedPlayerName ||
    getStoredPlayerName() ||
    loadGameState()?.playerName ||
    'Traveler';

  const tileX = Math.floor(p.x / TILE_SIZE);
  const tileY = Math.floor(p.y / TILE_SIZE);

  return {
    version: SAVE_VERSION,
    playerName,
    roomId: lm.currentRoomId,
    spawnTileX: tileX,
    spawnTileY: tileY,
    hp: p.hp,
    maxHp: p.maxHp,
    coins: p.coins,
    hasMap: p.hasMap,
    visitedRooms: [...p.visitedRooms],
    abilities: collectAbilities(p),
    checkpointRoom: p._checkpointRoom || lm.currentRoomId,
    checkpointTileX: Math.floor(p.checkpointX / TILE_SIZE),
    checkpointTileY: Math.floor(p.checkpointY / TILE_SIZE),
    savedAt: new Date().toISOString(),
  };
}

export function persistState(state) {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (state.playerName) setStoredPlayerName(state.playerName);
  } catch (e) {
    console.warn('[SaveGame] persist failed', e);
  }
}
