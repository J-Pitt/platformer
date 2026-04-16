import * as Phaser from 'phaser';
import { shakeScene } from '../systems/CameraRig.js';

const PATROL_SPEED = 40;
const CHASE_SPEED = 85;
const DETECT_RANGE = 320;
const LOSE_RANGE = 460;
const TURN_CHECK_OFFSET = 30;
const SLAM_TRIGGER_RANGE = 80;
const SLAM_SHOCK_RADIUS = 100;
const SLAM_COOLDOWN_MS = 3000;
const SLAM_JUMP_VELOCITY = -340;
const SLAM_TIMEOUT_MS = 2500;

// Mobility tuning
const JUMP_VELOCITY = -330;
const GAP_JUMP_VELOCITY = -280;
const JUMP_COOLDOWN_MS = 650;
const JUMP_PLAYER_ABOVE = 60;
const JUMP_REACH_HORIZ = 180;

function nearestPlayer(enemy, players) {
  const arr = Array.isArray(players) ? players : [players];
  let best = null;
  let bestDist = Infinity;
  for (const p of arr) {
    if (!p || p.isDead) continue;
    const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, p.x, p.y);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best || arr[0];
}

export class Brute extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'brute');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Frame is 64x56 drawn so the feet land at frame y=56. Match the body
    // to the full visible torso+legs so the enemy never looks half-buried
    // after physics settles (body bottom == sprite bottom).
    this.body.setSize(48, 50, true);
    this.body.setOffset(8, 6);
    this.setScale(1.5);
    this.setDepth(4);

    // Compensate spawn Y so body bottom starts on the floor rather than
    // 26 px below it (which made brutes visibly "sink" into the ground
    // before physics resolved the overlap on the first frame).
    this.y -= 26;

    this.hp = 5;
    this.maxHp = 5;
    this.damage = 2;
    this.isHit = false;
    this.isDead = false;
    this.direction = 1;
    this.state = 'patrol';
    this.knockbackTimer = 0;
    this.hitCooldown = 0;
    this.slamCooldown = 0;
    this.slamState = null;
    this.slamStartedAt = 0;
    this.jumpCooldown = 0;
    this._aggro = false;
  }

  isOnGround() {
    return this.body.blocked.down || this.body.touching.down;
  }

  applySlamShockwave(players) {
    const arr = Array.isArray(players) ? players : [players];
    for (const p of arr) {
      if (!p || p.isDead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (d <= SLAM_SHOCK_RADIUS) {
        p.takeDamage(this.damage, this.x);
      }
    }
    shakeScene(this.scene, 100, 0.006);
  }

  /** Look ahead along the current facing; if there's a pit but solid ground
   *  a few tiles later, return true so the brute hops the gap. */
  shouldHopGap() {
    const lm = this.scene.levelManager;
    if (!lm) return false;
    const dir = this.direction;
    const footY = this.y + 28;
    const ahead1 = lm.getTileAt(this.x + dir * 28, footY);
    const ahead2 = lm.getTileAt(this.x + dir * 56, footY);
    const ahead3 = lm.getTileAt(this.x + dir * 80, footY);
    const wallAhead = lm.getTileAt(this.x + dir * 26, this.y);
    if (wallAhead) return false;
    // Pit directly ahead but landing ground a little beyond
    return !ahead1 && (ahead2 || ahead3);
  }

  tryJumpTowardPlayer(player) {
    if (!this.isOnGround() || this.jumpCooldown > 0) return false;
    const above = this.y - player.y > JUMP_PLAYER_ABOVE;
    const horizReach = Math.abs(player.x - this.x) < JUMP_REACH_HORIZ;
    if (above && horizReach) {
      this.body.velocity.y = JUMP_VELOCITY;
      this.jumpCooldown = JUMP_COOLDOWN_MS;
      return true;
    }
    return false;
  }

  update(dt, players) {
    if (this.isDead) return;

    this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    this.slamCooldown = Math.max(0, this.slamCooldown - dt);
    this.jumpCooldown = Math.max(0, this.jumpCooldown - dt);

    if (this.knockbackTimer > 0) return;

    this.isHit = false;

    const player = nearestPlayer(this, players);
    if (!player) return;

    const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Slam in progress — let the physics arc play out
    if (this.slamState) {
      if (this.scene.time.now - this.slamStartedAt > SLAM_TIMEOUT_MS) {
        this.slamState = null;
        this.body.velocity.x = 0;
      } else if (this.slamState === 'rising' && this.body.velocity.y > 40) {
        this.slamState = 'falling';
      } else if (this.slamState === 'falling' && this.isOnGround()) {
        this.applySlamShockwave(players);
        this.slamState = null;
        this.slamCooldown = SLAM_COOLDOWN_MS;
        this.body.velocity.x = 0;
      }
      return;
    }

    // Aggro latch so brutes commit to the hunt instead of flipping between
    // patrol and chase when the player briefly leaves vertical alignment.
    if (distToPlayer < DETECT_RANGE && !player.isDead) this._aggro = true;
    else if (distToPlayer > LOSE_RANGE || player.isDead) this._aggro = false;

    this.state = this._aggro ? 'chase' : 'patrol';

    const canSlam =
      distToPlayer < SLAM_TRIGGER_RANGE
      && !player.isDead
      && Math.abs(player.y - this.y) < 40
      && this.slamCooldown <= 0
      && this.isOnGround();

    if (canSlam) {
      this.slamState = 'rising';
      this.slamStartedAt = this.scene.time.now;
      this.body.velocity.x = 0;
      this.body.velocity.y = SLAM_JUMP_VELOCITY;
      this.setFlipX(player.x < this.x);
      return;
    }

    if (this.state === 'patrol') {
      this.body.velocity.x = this.direction * PATROL_SPEED;

      const checkX = this.x + this.direction * TURN_CHECK_OFFSET;
      const checkY = this.y + 28;
      const floorTile = this.scene.levelManager.getTileAt(checkX, checkY);
      const wallTile = this.scene.levelManager.getTileAt(this.x + this.direction * 22, this.y);

      if (!floorTile || wallTile) {
        this.direction *= -1;
      }
    } else {
      const dir = player.x > this.x ? 1 : -1;
      this.direction = dir;
      this.body.velocity.x = dir * CHASE_SPEED;

      // Jump toward the player when they're perched above us.
      this.tryJumpTowardPlayer(player);

      // Hop gaps so we don't get stranded on an island of floor.
      if (this.isOnGround() && this.jumpCooldown <= 0 && this.shouldHopGap()) {
        this.body.velocity.y = GAP_JUMP_VELOCITY;
        this.jumpCooldown = JUMP_COOLDOWN_MS;
      }

      // Bump into a wall while chasing — try a wall-assist hop in case there's
      // a ledge the player is standing on.
      const wallAhead =
        (dir > 0 && this.body.blocked.right)
        || (dir < 0 && this.body.blocked.left);
      if (wallAhead && this.isOnGround() && this.jumpCooldown <= 0
          && this.y - player.y > 10) {
        this.body.velocity.y = JUMP_VELOCITY;
        this.jumpCooldown = JUMP_COOLDOWN_MS;
      }
    }

    this.setFlipX(this.direction < 0);
  }

  takeDamage(amount, slashDir) {
    if (this.isDead) return;

    this.hp -= amount;
    this.isHit = true;
    this.hitCooldown = 300;
    this._aggro = true;

    this.setTint(0xff4444).setTintMode(Phaser.TintModes.FILL);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint();
    });

    const kbDir = { right: 1, left: -1, up: 0, down: 0 }[slashDir] || 0;
    this.body.velocity.x = kbDir * 100;
    this.body.velocity.y = -80;
    this.knockbackTimer = 150;

    if (this.hp <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.body.velocity.set(0, 0);
    this.body.allowGravity = false;
    this.slamState = null;

    if (this.scene.enemyDeathEmitter) {
      this.scene.enemyDeathEmitter.emitParticleAt(this.x, this.y, 18);
    }

    for (const p of this.scene.getActivePlayers()) {
      if (!p.isDead && p.hp < p.maxHp) {
        p.hp = Math.min(p.hp + 1, p.maxHp);
      }
    }

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 500,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  canDamagePlayer() {
    if (this.isDead || this.hitCooldown > 0) return false;
    if (this.slamState) return false;
    return true;
  }
}
