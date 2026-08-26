/**
 * game.js
 * Core Game Loop, State Transitions, Pause, Game Over, Level Complete, and Victory for GLITCH WORLD.
 */

class GameEngine {
  constructor(canvas, imageCache = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageCache = imageCache;

    this.controls = new Controls(canvas);
    this.screenShake = new ScreenShake();
    this.particles = new ParticleSystem();

    this.currentLevelIndex = 1;
    this.level = null;
    this.player = null;
    this.bullets = [];
    this.muzzleFlashes = [];

    this.isRunning = false;
    this.isPaused = false;
    this.startTime = 0;
    this.levelStartTime = 0;

    // Modals
    this.pauseModal = document.getElementById('pause-modal');
    this.gameOverModal = document.getElementById('gameover-modal');
    this.levelCompleteModal = document.getElementById('level-complete-modal');
    this.victoryModal = document.getElementById('victory-modal');

    this._bindModalEvents();
  }

  _bindModalEvents() {
    // Pause Modal Buttons
    const btnResume = document.getElementById('pause-resume-btn');
    const btnRestart = document.getElementById('pause-restart-btn');
    const btnHome = document.getElementById('pause-home-btn');

    if (btnResume) btnResume.addEventListener('click', () => this.togglePause(false));
    if (btnRestart) btnRestart.addEventListener('click', () => {
      this.togglePause(false);
      this.startLevel(this.currentLevelIndex);
    });
    if (btnHome) btnHome.addEventListener('click', () => {
      this.togglePause(false);
      this.quitToHome();
    });

    // Game Over Modal Buttons
    const btnRespawn = document.getElementById('gameover-respawn-btn');
    const btnRetry = document.getElementById('gameover-retry-btn');
    const btnOverHome = document.getElementById('gameover-home-btn');

    if (btnRespawn) btnRespawn.addEventListener('click', () => this.respawnCheckpoint());
    if (btnRetry) btnRetry.addEventListener('click', () => this.startLevel(this.currentLevelIndex));
    if (btnOverHome) btnOverHome.addEventListener('click', () => this.quitToHome());

    // Level Complete Modal Button
    const btnNextLevel = document.getElementById('level-complete-next-btn');
    if (btnNextLevel) btnNextLevel.addEventListener('click', () => this.advanceToNextLevel());

    // Victory Modal Button
    const btnVictoryHome = document.getElementById('victory-home-btn');
    if (btnVictoryHome) btnVictoryHome.addEventListener('click', () => this.quitToHome());

    // In-game Pause Button in Top HUD
    const hudPauseBtn = document.getElementById('hud-pause-btn');
    if (hudPauseBtn) hudPauseBtn.addEventListener('click', () => this.togglePause(true));
  }

  startLevel(levelNumber, checkpointPos = null) {
    this.currentLevelIndex = levelNumber;
    this.bullets = [];
    this.muzzleFlashes = [];
    this.particles.clear();
    this.isPaused = false;
    this._hideModals();

    if (levelNumber === 1) {
      this.level = new Level1(this.imageCache, checkpointPos);
    } else if (levelNumber === 2) {
      this.level = new Level2(this.imageCache, checkpointPos);
    } else if (levelNumber === 3) {
      this.level = new Level3(this.imageCache, checkpointPos);
    }

    const spawnX = checkpointPos ? checkpointPos.x : this.level.activeCheckpoint.x;
    const spawnY = checkpointPos ? checkpointPos.y : this.level.activeCheckpoint.y;

    this.player = new Player(spawnX, spawnY, this.level.hasWeapon, this.imageCache);
    if (this.level.hasWeapon) {
      this.player.giveWeapon();
    }

    this.levelStartTime = Date.now();
    if (!this.startTime) this.startTime = Date.now();

    window.uiManager.showHUD(true);
    window.audioManager.playMusic(this.level.musicKey);

    this.isRunning = true;
  }

  togglePause(forceState = null) {
    if (!this.isRunning || (this.level && (this.level.completed || this.level.playerDied))) return;

    this.isPaused = forceState !== null ? forceState : !this.isPaused;
    window.audioManager.play('click', 0.4);

    if (this.pauseModal) {
      if (this.isPaused) {
        this.pauseModal.classList.add('active');
        this.pauseModal.style.display = 'flex';
      } else {
        this.pauseModal.classList.remove('active');
        this.pauseModal.style.display = 'none';
      }
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    // Update screen shake
    this.screenShake.update(dt);

    // Update glitch manager
    if (window.glitchManager && this.player) {
      window.glitchManager.update(dt, this.particles, {
        x: this.player.rect.centerx,
        y: this.player.rect.centery
      });
    }

    // Update level
    if (this.level && this.player) {
      this.level.update(
        dt,
        this.player,
        this.controls,
        this.bullets,
        this.muzzleFlashes,
        this.particles,
        this.screenShake
      );

      // Update HUD
      window.uiManager.updateHUD(this.player, this.level, window.glitchManager);

      // Check Player Death
      if (this.level.playerDied && !this._gameOverHandled) {
        this._gameOverHandled = true;
        setTimeout(() => this.handleGameOver(), 1000);
      }

      // Check Level Completion
      if (this.level.completed && !this._levelCompleteHandled) {
        this._levelCompleteHandled = true;
        this.handleLevelComplete();
      }
    }

    // Update Muzzle Flashes & Particles
    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      this.muzzleFlashes[i].update(dt);
      if (!this.muzzleFlashes[i].alive) this.muzzleFlashes.splice(i, 1);
    }
    this.particles.update(dt);
  }

  draw() {
    if (!this.level || !this.player) return;

    this.ctx.clearRect(0, 0, 1280, 720);

    // Render Level Geometry, Entities, and Particles
    this.level.draw(
      this.ctx,
      this.player,
      this.bullets,
      this.muzzleFlashes,
      this.particles,
      this.screenShake
    );

    // Apply Post-Processing Glitch Screen Shader
    if (window.glitchManager) {
      window.glitchManager.applyScreenShader(this.ctx, this.canvas);
    }
  }

  handleGameOver() {
    this.isRunning = false;
    window.audioManager.playMusic('game_over', false);

    const timePlayed = this._formatTime(Date.now() - this.startTime);

    // Record defeat in history
    window.storageManager.addHistoryEntry({
      levelReached: `Level ${this.currentLevelIndex}`,
      result: 'Defeat',
      score: this.player ? this.player.score : 0,
      coins: this.player ? this.player.coins : 0,
      enemiesDefeated: this.level ? this.level.enemiesDefeated : 0,
      timePlayed: timePlayed
    });

    // Populate Game Over Modal
    const statScore = document.getElementById('gameover-score');
    const statCoins = document.getElementById('gameover-coins');
    const statLevel = document.getElementById('gameover-level');

    if (statScore && this.player) statScore.textContent = this.player.score;
    if (statCoins && this.player) statCoins.textContent = this.player.coins;
    if (statLevel) statLevel.textContent = `Level ${this.currentLevelIndex}`;

    if (this.gameOverModal) {
      this.gameOverModal.classList.add('active');
      this.gameOverModal.style.display = 'flex';
    }
  }

  respawnCheckpoint() {
    this._gameOverHandled = false;
    this._hideModals();
    const user = window.storageManager.getCurrentUser();
    const prog = window.storageManager.getProgress(user);

    if (prog.checkpoint && prog.checkpoint.level === this.currentLevelIndex) {
      this.startLevel(this.currentLevelIndex, { x: prog.checkpoint.x, y: prog.checkpoint.y });
    } else {
      this.startLevel(this.currentLevelIndex);
    }
  }

  handleLevelComplete() {
    this.isRunning = false;

    // Unlock next level in storage
    const nextLvl = this.currentLevelIndex + 1;
    if (nextLvl <= 3) {
      window.storageManager.unlockLevel(nextLvl);
    }

    if (this.currentLevelIndex === 3) {
      // VICTORY!
      this.handleVictory();
    } else {
      // Level Complete Interstitial
      window.audioManager.playMusic('victory', false);
      const titleEl = document.getElementById('level-complete-title');
      const scoreEl = document.getElementById('level-complete-score');
      const coinsEl = document.getElementById('level-complete-coins');

      if (titleEl) titleEl.textContent = `LEVEL ${this.currentLevelIndex} COMPLETE`;
      if (scoreEl && this.player) scoreEl.textContent = this.player.score;
      if (coinsEl && this.player) coinsEl.textContent = this.player.coins;

      if (this.levelCompleteModal) {
        this.levelCompleteModal.classList.add('active');
        this.levelCompleteModal.style.display = 'flex';
      }
    }
  }

  advanceToNextLevel() {
    this._levelCompleteHandled = false;
    this._hideModals();
    this.startLevel(this.currentLevelIndex + 1);
  }

  handleVictory() {
    window.audioManager.playMusic('victory', true);

    const timePlayed = this._formatTime(Date.now() - this.startTime);

    // Save Victory to History
    window.storageManager.addHistoryEntry({
      levelReached: 'Level 3 (Victory)',
      result: 'Victory',
      score: this.player ? this.player.score + 500 : 500,
      coins: this.player ? this.player.coins : 0,
      enemiesDefeated: this.level ? this.level.enemiesDefeated + 1 : 1,
      timePlayed: timePlayed
    });

    // Populate Victory Modal
    const statScore = document.getElementById('victory-score');
    const statCoins = document.getElementById('victory-coins');
    const statEnemies = document.getElementById('victory-enemies');
    const statTime = document.getElementById('victory-time');

    if (statScore && this.player) statScore.textContent = this.player.score + 500;
    if (statCoins && this.player) statCoins.textContent = this.player.coins;
    if (statEnemies && this.level) statEnemies.textContent = this.level.enemiesDefeated + 1;
    if (statTime) statTime.textContent = timePlayed;

    // Victory celebration fireworks
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.particles.emitFirework(Math.random() * 800 + 240, Math.random() * 200 + 100);
      }, i * 300);
    }

    if (this.victoryModal) {
      this.victoryModal.classList.add('active');
      this.victoryModal.style.display = 'flex';
    }
  }

  quitToHome() {
    this.isRunning = false;
    this.isPaused = false;
    this._gameOverHandled = false;
    this._levelCompleteHandled = false;
    this._hideModals();
    window.uiManager.showHUD(false);

    if (window.mainApp) {
      window.mainApp.showScreen('home');
    }
  }

  _hideModals() {
    [this.pauseModal, this.gameOverModal, this.levelCompleteModal, this.victoryModal].forEach(m => {
      if (m) {
        m.classList.remove('active');
        m.style.display = 'none';
      }
    });
  }

  _formatTime(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
