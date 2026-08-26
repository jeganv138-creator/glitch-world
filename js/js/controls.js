/**
 * controls.js
 * Input Controller for GLITCH WORLD.
 * Translates Keyboard, Mouse, and Mobile Touch interactions into unified control states.
 */

class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.run = false;
    this.crouch = false;
    this.dodge = false;
    this.shoot = false;
    this.glitch = false;
    this.reload = false;
    this.interact = false;
    this.weapon1 = false;
    this.weapon2 = false;
    this.pause = false;

    this.mouseX = 640;
    this.mouseY = 360;
    this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this._initKeyboard();
    this._initMouse();
    this._initTouch();
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Don't capture keys if user is typing in an input field
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') this.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.right = true;
      if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') this.jump = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.run = true;
      if (code === 'ControlLeft' || code === 'ControlRight' || code === 'KeyC') {
        this.crouch = true;
        this.dodge = true;
      }
      if (code === 'KeyG') {
        this.glitch = true;
        if (window.glitchManager) window.glitchManager.toggle();
      }
      if (code === 'KeyR') this.reload = true;
      if (code === 'KeyE') this.interact = true;
      if (code === 'Digit1') this.weapon1 = true;
      if (code === 'Digit2') this.weapon2 = true;
      if (code === 'Escape') {
        if (window.gameEngine) window.gameEngine.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const code = e.code;
      if (code === 'KeyA' || code === 'ArrowLeft') this.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.right = false;
      if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') this.jump = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.run = false;
      if (code === 'ControlLeft' || code === 'ControlRight' || code === 'KeyC') {
        this.crouch = false;
        this.dodge = false;
      }
      if (code === 'KeyG') this.glitch = false;
      if (code === 'KeyR') this.reload = false;
      if (code === 'KeyE') this.interact = false;
      if (code === 'Digit1') this.weapon1 = false;
      if (code === 'Digit2') this.weapon2 = false;
    });
  }

  _initMouse() {
    window.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      this.mouseX = (e.clientX - rect.left) * scaleX;
      this.mouseY = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click
        this.shoot = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.shoot = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _initTouch() {
    const bindBtn = (id, onStart, onEnd) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        el.classList.add('pressed');
        onStart();
      }, { passive: false });

      const endHandler = (e) => {
        e.preventDefault();
        el.classList.remove('pressed');
        onEnd();
      };
      el.addEventListener('touchend', endHandler, { passive: false });
      el.addEventListener('touchcancel', endHandler, { passive: false });
    };

    bindBtn('touch-left', () => { this.left = true; }, () => { this.left = false; });
    bindBtn('touch-right', () => { this.right = true; }, () => { this.right = false; });
    bindBtn('touch-jump', () => { this.jump = true; }, () => { this.jump = false; });
    bindBtn('touch-shoot', () => { this.shoot = true; }, () => { this.shoot = false; });
    bindBtn('touch-glitch', () => {
      if (window.glitchManager) window.glitchManager.toggle();
    }, () => {});
    bindBtn('touch-reload', () => { this.reload = true; }, () => { this.reload = false; });
    bindBtn('touch-dodge', () => { this.dodge = true; }, () => { this.dodge = false; });
  }

  reset() {
    this.left = false;
    this.right = false;
    this.jump = false;
    this.run = false;
    this.crouch = false;
    this.dodge = false;
    this.shoot = false;
    this.glitch = false;
    this.reload = false;
    this.interact = false;
    this.weapon1 = false;
    this.weapon2 = false;
  }
}
