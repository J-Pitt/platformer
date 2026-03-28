import {
  getPlatformerRoom,
  patchPlatformerPlayerState,
  leavePlatformerRoomBeacon,
} from './platformerRoomApi.js';

/**
 * Polls Redis-backed room state: each client writes host/guest player blobs;
 * host also publishes leadRoomId / spawn for guest room transitions.
 */
export class PlatformerOnlineSync {
  constructor(scene, opts) {
    this.scene = scene;
    this.roomId = opts.roomId;
    this.isHost = !!opts.isHost;
    this.playerName = opts.playerName || 'Player';
    this.slotKey = this.isHost ? 'host' : 'guest';
    this.peerKey = this.isHost ? 'guest' : 'host';
    this.appliedLeadSeq = 0;
    this.leadSeqCounter = 0;
    this._hostLeadPatch = null;
    this._timer = null;
    this._stopped = false;
  }

  get localPlayer() {
    return this.isHost ? this.scene.player : this.scene.player2;
  }

  get peerPlayer() {
    return this.isHost ? this.scene.player2 : this.scene.player;
  }

  packPlayer(p) {
    const rid = this.scene.levelManager?.currentRoomId || 'room1';
    if (!p || !p.body) {
      return { x: 0, y: 0, vx: 0, vy: 0, facing: 1, roomId: rid };
    }
    return {
      x: p.x,
      y: p.y,
      vx: p.body.velocity.x,
      vy: p.body.velocity.y,
      facing: p.facing,
      roomId: rid,
    };
  }

  applyPeerBlob(blob) {
    const peer = this.peerPlayer;
    if (!blob || typeof blob.x !== 'number' || !peer?.body) return;
    peer.setPosition(blob.x, blob.y);
    peer.body.setVelocity(blob.vx || 0, blob.vy || 0);
    if (blob.facing === 1 || blob.facing === -1) peer.facing = blob.facing;
  }

  applyGuestLead(fresh) {
    if (this.isHost) return;
    const plat = fresh.state?.platformer;
    if (!plat?.leadRoomId || !plat.leadSeq) return;
    if (plat.leadSeq <= this.appliedLeadSeq) return;
    this.appliedLeadSeq = plat.leadSeq;
    const cur = this.scene.levelManager.currentRoomId;
    if (cur !== plat.leadRoomId) {
      this.scene._pendingNetRoom = {
        roomId: plat.leadRoomId,
        spawnX: plat.leadSpawnX,
        spawnY: plat.leadSpawnY,
      };
    }
  }

  queueHostLead(roomId, spawnX, spawnY) {
    if (!this.isHost) return;
    this.leadSeqCounter += 1;
    this._hostLeadPatch = {
      leadRoomId: roomId,
      leadSpawnX: spawnX,
      leadSpawnY: spawnY,
      leadSeq: this.leadSeqCounter,
    };
  }

  async syncTick() {
    if (this._stopped || this._inFlight) return;
    this._inFlight = true;
    const scene = this.scene;
    if (!scene.levelManager?.currentRoomId) { this._inFlight = false; return; }

    try {
      const fresh = await getPlatformerRoom(this.roomId);
      if (!fresh.success) return;

      const existingPlat = fresh.state?.platformer || {};
      this.applyGuestLead(fresh);
      this.applyPeerBlob(existingPlat[this.peerKey]);

      const me = this.packPlayer(this.localPlayer);
      const lead = this._hostLeadPatch;
      this._hostLeadPatch = null;
      await patchPlatformerPlayerState(this.roomId, {
        slot: this.slotKey,
        player: me,
        lead: lead || undefined,
      });
    } catch (e) {
      console.warn('[PlatformerOnlineSync]', e.message || e);
    } finally {
      this._inFlight = false;
    }
  }

  start() {
    if (this._timer) return;
    this._timer = this.scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        void this.syncTick();
      },
    });
    this.scene.events.once('shutdown', () => this.stop());
  }

  stop() {
    this._stopped = true;
    if (this._timer) {
      this._timer.destroy();
      this._timer = null;
    }
    leavePlatformerRoomBeacon(this.roomId, this.playerName);
  }
}
