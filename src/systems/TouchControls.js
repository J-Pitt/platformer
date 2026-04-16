export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)) return true;
  return 'ontouchstart' in window && navigator.maxTouchPoints > 1;
}

const STICK_DEADZONE = 0.22;

export class TouchControls {
  constructor() {
    this.active = false;

    /** Normalized stick axes: -1..1 each. */
    this.stickX = 0;
    this.stickY = 0;

    this._pressed = {};
    this._justPressed = {};
    this._held = {};
    this._activeCount = {};

    this._stickTouchId = null;

    if (!isMobileDevice()) return;

    this.active = true;
    document.body.classList.add('mobile-layout');

    const el = document.getElementById('touch-controls');
    if (el) el.classList.add('visible');

    const leftPanel = document.getElementById('ctrl-left');
    const rightPanel = document.getElementById('ctrl-right');
    const stickZone = document.getElementById('stick-zone');
    const actionPanel = el?.querySelector('.action-panel');
    const pauseBtn = document.getElementById('btn-pause');

    if (leftPanel && stickZone) leftPanel.appendChild(stickZone);
    if (rightPanel && pauseBtn) rightPanel.appendChild(pauseBtn);
    if (rightPanel && actionPanel) rightPanel.appendChild(actionPanel);

    this._initStick();
    this._initButtons();
  }

  _initStick() {
    const zone = document.getElementById('stick-zone');
    const knob = document.getElementById('stick-knob');
    if (!zone || !knob) return;

    const getZoneCenter = () => {
      const r = zone.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: r.width / 2 };
    };

    const moveKnob = (nx, ny) => {
      knob.style.transform = `translate(calc(-50% + ${nx * 40}px), calc(-50% + ${ny * 40}px))`;
    };

    const resetKnob = () => {
      knob.style.transform = 'translate(-50%, -50%)';
      zone.classList.remove('active');
      this.stickX = 0;
      this.stickY = 0;
    };

    const onDown = (e) => {
      e.preventDefault();
      if (this._stickTouchId !== null) return;
      const touch = e.changedTouches[0];
      this._stickTouchId = touch.identifier;
      zone.classList.add('active');
      this._updateStick(touch, getZoneCenter(), moveKnob);
    };

    const onMove = (e) => {
      if (this._stickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this._stickTouchId) {
          e.preventDefault();
          this._updateStick(t, getZoneCenter(), moveKnob);
          return;
        }
      }
    };

    const onUp = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._stickTouchId) {
          this._stickTouchId = null;
          resetKnob();
          return;
        }
      }
    };

    zone.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp, { passive: true });
    window.addEventListener('touchcancel', onUp, { passive: true });
  }

  _updateStick(touch, zoneInfo, moveKnob) {
    const dx = touch.clientX - zoneInfo.cx;
    const dy = touch.clientY - zoneInfo.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = zoneInfo.radius;
    const clamped = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const nx = (clamped / maxR) * Math.cos(angle);
    const ny = (clamped / maxR) * Math.sin(angle);
    this.stickX = Math.abs(nx) > STICK_DEADZONE ? nx : 0;
    this.stickY = Math.abs(ny) > STICK_DEADZONE ? ny : 0;
    moveKnob(nx, ny);
  }

  _initButtons() {
    const btnEls = document.querySelectorAll('.touch-btn');
    btnEls.forEach((btn) => {
      const key = btn.dataset.btn;
      if (!key) return;
      if (this._activeCount[key] === undefined) {
        this._pressed[key] = false;
        this._justPressed[key] = false;
        this._held[key] = false;
        this._activeCount[key] = 0;
      }

      const onDown = (e) => {
        e.preventDefault();
        this._activeCount[key]++;
        if (!this._pressed[key]) {
          this._justPressed[key] = true;
        }
        this._pressed[key] = true;
        this._held[key] = true;
        btn.classList.add('active');
      };

      const onUp = (e) => {
        e.preventDefault();
        this._activeCount[key] = Math.max(0, this._activeCount[key] - 1);
        btn.classList.remove('active');
        if (this._activeCount[key] === 0) {
          this._pressed[key] = false;
          this._held[key] = false;
        }
      };

      btn.addEventListener('touchstart', onDown, { passive: false });
      btn.addEventListener('touchend', onUp, { passive: false });
      btn.addEventListener('touchcancel', onUp, { passive: false });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  consume() {
    const snapshot = {};
    for (const key of Object.keys(this._pressed)) {
      snapshot[key] = {
        pressed: this._pressed[key],
        justPressed: this._justPressed[key],
        held: this._held[key],
      };
      this._justPressed[key] = false;
    }
    snapshot._stickX = this.stickX;
    snapshot._stickY = this.stickY;
    return snapshot;
  }
}
