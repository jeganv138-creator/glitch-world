/**
 * home.js
 * Home Menu and Level Selection Controllers for GLITCH WORLD.
 * Features live animated player character preview and level unlock management.
 */

class HomeController {
  constructor() {
    this.homeScreen = document.getElementById('home-screen');
    this.levelSelectScreen = document.getElementById('level-select-screen');

    this.userGreeting = document.getElementById('home-user-greeting');
    this.btnStart = document.getElementById('home-btn-start');
    this.btnContinue = document.getElementById('home-btn-continue');
    this.btnSettings = document.getElementById('home-btn-settings');
    this.btnHistory = document.getElementById('home-btn-history');
    this.btnAbout = document.getElementById('home-btn-about');
    this.btnLogout = document.getElementById('home-btn-logout');

    // Level Select Elements
    this.btnBackHome = document.getElementById('level-select-back-btn');
    this.levelCards = {
      1: document.getElementById('level-card-1'),
      2: document.getElementById('level-card-2'),
      3: document.getElementById('level-card-3')
    };

    // Live Player Preview Canvas
    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;
    this.animTime = 0;
    this.previewPlayer = new Player(100, 190);

    this._bindEvents();
    this._startPreviewLoop();
  }

  _bindEvents() {
    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        this.openLevelSelect();
      });
    }

    if (this.btnContinue) {
      this.btnContinue.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.continueGame();
      });
    }

    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.showScreen('settings');
      });
    }

    if (this.btnHistory) {
      this.btnHistory.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.historyController) window.historyController.refresh();
        if (window.mainApp) window.mainApp.showScreen('history');
      });
    }

    if (this.btnAbout) {
      this.btnAbout.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.showScreen('about');
      });
    }

    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        window.storageManager.logout();
        if (window.mainApp) window.mainApp.showScreen('auth');
      });
    }

    if (this.btnBackHome) {
      this.btnBackHome.addEventListener('click', () => {
        window.audioManager.play('click', 0.5);
        if (window.mainApp) window.mainApp.showScreen('home');
      });
    }

    // Level Card Clicks
    for (let lvl = 1; lvl <= 3; lvl++) {
      const card = this.levelCards[lvl];
      if (card) {
        card.addEventListener('click', () => {
          if (!card.classList.contains('locked')) {
            window.audioManager.play('click', 0.6);
            if (window.mainApp) window.mainApp.startLevel(lvl);
          } else {
            window.audioManager.play('error', 0.5);
            window.uiManager.showToast(`Level ${lvl} is locked. Complete previous level to unlock!`, 'warning');
          }
        });
      }
    }
  }

  update() {
    const user = window.storageManager.getCurrentUser();
    if (this.userGreeting) {
      this.userGreeting.textContent = `WELCOME BACK, ${user.toUpperCase()}`;
    }

    // Update Continue button state
    const prog = window.storageManager.getProgress(user);
    if (this.btnContinue) {
      const hasSavedProgress = prog.checkpoint !== null || prog.highestLevelCompleted > 0;
      this.btnContinue.disabled = !hasSavedProgress;
    }

    // Update Level Cards Lock States
    const unlocked = prog.unlockedLevels || [1];
    for (let lvl = 1; lvl <= 3; lvl++) {
      const card = this.levelCards[lvl];
      if (card) {
        const isUnlocked = unlocked.includes(lvl);
        const lockOverlay = card.querySelector('.lock-overlay');
        if (isUnlocked) {
          card.classList.remove('locked');
          if (lockOverlay) lockOverlay.style.display = 'none';
        } else {
          card.classList.add('locked');
          if (lockOverlay) lockOverlay.style.display = 'flex';
        }
      }
    }
  }

  openLevelSelect() {
    this.update();
    if (window.mainApp) window.mainApp.showScreen('level-select');
  }

  _startPreviewLoop() {
    const loop = () => {
      this._renderPreview();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _renderPreview() {
    if (!this.previewCtx || !this.previewCanvas) return;
    const ctx = this.previewCtx;
    ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

    this.animTime += 0.025;
    this.previewPlayer.animTime = this.animTime;
    this.previewPlayer.state = 'idle';

    // Draw Player in Center with Idle Animation
    ctx.save();
    this.previewPlayer.draw(ctx, 0, 0);
    ctx.restore();
  }
}

// Global Singleton Export
window.homeController = new HomeController();
