export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)) return true;
  return 'ontouchstart' in window && navigator.maxTouchPoints > 1;
}

export class TouchControls {
  constructor() {
    this.active = false;
    this._pressed = {};
    this._justPressed = {};
    this._held = {};
    this._activeCount = {};

    if (!isMobileDevice()) return;

    this.active = true;
    const el = document.getElementById('touch-controls');
    if (el) el.classList.add('visible');

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
    return snapshot;
  }
}
