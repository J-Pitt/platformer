import { shakeScene } from './CameraRig.js';

const MOVE_SPEED = 180;
const ACCELERATION = 1400;
const DECELERATION = 2000;
const JUMP_VELOCITY = -460;
const JUMP_CUT_MULTIPLIER = 0.4;
const COYOTE_TIME = 100;
const JUMP_BUFFER_TIME = 100;
const WALL_SLIDE_SPEED = 55;
const WALL_JUMP_VELOCITY_X = 240;
const WALL_JUMP_VELOCITY_Y = -420;
const WALL_JUMP_LOCKOUT = 180;
const DASH_SPEED = 520;
const DASH_DURATION = 440;
const DASH_COOLDOWN = 1000;

export class MovementSystem {
  constructor(player) {
    this.player = player;
    this.scene = player.scene;

    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallJumpLockoutTimer = 0;
    this.wallDir = 0;

    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashDir = 0;

    this.isWallSliding = false;
    this.wasOnGround = false;

    this.airJumpsUsed = 0;

    this.abilities = {
      wallJump: false,
      dash: false,
      doubleJump: false,
    };
  }

  update(dt, input) {
    const p = this.player;
    const body = p.body;
    const onGround = body.blocked.down || body.touching.down;
    const touchingWallLeft = body.blocked.left || body.touching.left;
    const touchingWallRight = body.blocked.right || body.touching.right;
    const touchingWall = touchingWallLeft || touchingWallRight;

    this.wallJumpLockoutTimer = Math.max(0, this.wallJumpLockoutTimer - dt);
    this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);

    if (this.isDashing) {
      this.updateDash(dt);
      return;
    }

    if (onGround) {
      this.coyoteTimer = COYOTE_TIME;
      this.wasOnGround = true;
      this.airJumpsUsed = 0;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.jumpPressed) {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    if (this.wallJumpLockoutTimer <= 0) {
      if (input.left) {
        body.velocity.x = Math.max(body.velocity.x - ACCELERATION * (dt / 1000), -MOVE_SPEED);
        p.setFlipX(true);
        p.facing = -1;
      } else if (input.right) {
        body.velocity.x = Math.min(body.velocity.x + ACCELERATION * (dt / 1000), MOVE_SPEED);
        p.setFlipX(false);
        p.facing = 1;
      } else {
        // Ice patches multiply deceleration (effectively slide) when onIce flag is set by LevelManager
        const decel = p.onIce ? DECELERATION * 0.08 : DECELERATION;
        if (body.velocity.x > 0) {
          body.velocity.x = Math.max(0, body.velocity.x - decel * (dt / 1000));
        } else if (body.velocity.x < 0) {
          body.velocity.x = Math.min(0, body.velocity.x + decel * (dt / 1000));
        }
      }
    }

    // Wall slide
    this.isWallSliding = false;
    if (this.abilities.wallJump && !onGround && touchingWall && body.velocity.y > 0) {
      const pressingIntoWall = (touchingWallLeft && input.left) || (touchingWallRight && input.right);
      if (pressingIntoWall) {
        this.isWallSliding = true;
        body.velocity.y = WALL_SLIDE_SPEED;
        this.wallDir = touchingWallLeft ? -1 : 1;
      }
    }

    // Jump
    if (this.jumpBufferTimer > 0) {
      if (this.coyoteTimer > 0) {
        body.velocity.y = JUMP_VELOCITY;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.emitJumpParticles();
      } else if (this.abilities.wallJump && this.isWallSliding) {
        body.velocity.y = WALL_JUMP_VELOCITY_Y;
        body.velocity.x = -this.wallDir * WALL_JUMP_VELOCITY_X;
        this.wallJumpLockoutTimer = WALL_JUMP_LOCKOUT;
        this.jumpBufferTimer = 0;
        this.isWallSliding = false;
        p.setFlipX(this.wallDir > 0);
        p.facing = -this.wallDir;
        this.emitWallJumpParticles();
      } else if (this.abilities.doubleJump && this.airJumpsUsed < 1) {
        body.velocity.y = JUMP_VELOCITY * 0.85;
        this.jumpBufferTimer = 0;
        this.airJumpsUsed++;
        this.emitJumpParticles();
        if (p.playDoubleJumpFlourish) p.playDoubleJumpFlourish();
      }
    }

    // Variable jump height
    if (!input.jumpHeld && body.velocity.y < JUMP_VELOCITY * JUMP_CUT_MULTIPLIER) {
      body.velocity.y *= JUMP_CUT_MULTIPLIER;
    }

    // Dash
    if (this.abilities.dash && this.dashCooldownTimer <= 0 && input.dashPressed) {
      this.startDash();
    }
  }

  startDash() {
    const p = this.player;
    this.isDashing = true;
    this.dashTimer = DASH_DURATION;
    this.dashCooldownTimer = DASH_COOLDOWN;
    this.dashDir = p.facing;
    p.body.velocity.y = 0;
    p.body.allowGravity = false;
    p.setInvulnerable(true);
    shakeScene(this.scene, 80, 0.005);
  }

  updateDash(dt) {
    const p = this.player;
    this.dashTimer -= dt;

    p.body.velocity.x = this.dashDir * DASH_SPEED;
    p.body.velocity.y = 0;

    if (Math.random() < 0.7) {
      const afterimage = this.scene.add.image(p.x, p.y, 'player_afterimage');
      afterimage.setAlpha(0.5);
      afterimage.setFlipX(p.flipX);
      this.scene.tweens.add({
        targets: afterimage,
        alpha: 0, scaleX: 0.8, scaleY: 0.8,
        duration: 280,
        onComplete: () => afterimage.destroy(),
      });
    }

    if (this.dashTimer <= 0) {
      this.isDashing = false;
      p.body.allowGravity = true;
      p.body.velocity.x = this.dashDir * MOVE_SPEED * 0.3;
      p.setInvulnerable(false);
    }
  }

  emitJumpParticles() {
    if (!this.scene.jumpEmitter) return;
    this.scene.jumpEmitter.emitParticleAt(this.player.x, this.player.y + 16, 8);
  }

  emitWallJumpParticles() {
    if (!this.scene.wallJumpEmitter) return;
    const offsetX = this.wallDir * 10;
    this.scene.wallJumpEmitter.emitParticleAt(this.player.x + offsetX, this.player.y, 10);
  }

  get dashReady() {
    return this.abilities.dash && this.dashCooldownTimer <= 0;
  }

  get dashCooldownPercent() {
    if (!this.abilities.dash) return 0;
    return 1 - this.dashCooldownTimer / DASH_COOLDOWN;
  }
}
