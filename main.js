/**
 * main.js
 * Master Application Bootstrap, Screen Router, Asset Loader, and Main Game Loop for GLITCH WORLD.
 */

class App {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.canvasWrapper = document.getElementById('canvas-wrapper');
    this.screens = {
      'auth': document.getElementById('auth-screen'),
      'home': document.getElementById('home-screen'),
      'level-select': document.getElementById('level-select-screen'),
      'settings': document.getElementById('settings-screen'),
      'about': document.getElementById('about-screen'),
      'history': document.getElementById('history-screen')
    };

    this.currentScreen = null;
    this.imageCache = {};
    this.lastTime = 0;

    this._initResponsiveResize();
  }

  async init() {
    console.log('[GlitchWorld] Initializing Web Game Engine...');

    // Load Settings
    window.settingsController.load();

    // Preload Image Assets
    await this._preloadImages();

    // Initialize Game Engine
    window.gameEngine = new GameEngine(this.canvas, this.imageCache);

    // Initial Screen Check
    const currentUser = window.storageManager.getCurrentUser();
    if (currentUser) {
      this.showScreen('home');
    } else {
      this.showScreen('auth');
    }

    // Start 60 FPS Application Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  showScreen(screenId) {
    // Hide HUD if navigating away from game
    if (screenId !== 'game') {
      window.uiManager.showHUD(false);
      if (window.gameEngine) window.gameEngine.isRunning = false;
    }

    // Update screen UI state
    for (const [id, el] of Object.entries(this.screens)) {
      if (el) {
        if (id === screenId) {
          el.classList.add('active');
          el.style.display = 'flex';
        } else {
          el.classList.remove('active');
          el.style.display = 'none';
        }
      }
    }

    this.currentScreen = screenId;

    if (screenId === 'home') {
      window.audioManager.playMusic('menu_music');
      window.homeController.update();
    } else if (screenId === 'settings') {
      window.settingsController.load();
    } else if (screenId === 'history') {
      window.historyController.refresh();
    } else if (screenId === 'auth') {
      window.audioManager.playMusic('menu_music');
      window.authController.reset();
    }
  }

  onLoginSuccess(username) {
    this.showScreen('home');
    window.uiManager.showToast(`Logged in as ${username}`, 'success');
  }

  startLevel(levelNumber) {
    this.showScreen('game');
    window.gameEngine.startLevel(levelNumber);
  }

  continueGame() {
    const user = window.storageManager.getCurrentUser();
    const prog = window.storageManager.getProgress(user);

    if (prog.checkpoint) {
      this.showScreen('game');
      window.gameEngine.startLevel(prog.checkpoint.level, { x: prog.checkpoint.x, y: prog.checkpoint.y });
    } else if (prog.unlockedLevels && prog.unlockedLevels.length > 0) {
      const highest = Math.max(...prog.unlockedLevels);
      this.showScreen('game');
      window.gameEngine.startLevel(highest);
    } else {
      this.startLevel(1);
    }
  }

  _loop(currentTime) {
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (window.gameEngine && window.gameEngine.isRunning) {
      window.gameEngine.update(dt);
      window.gameEngine.draw();
    }

    requestAnimationFrame((t) => this._loop(t));
  }

  _initResponsiveResize() {
    const resize = () => {
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const targetAspect = 16 / 9;
      const currentAspect = screenW / screenH;

      let w, h;
      if (currentAspect > targetAspect) {
        h = screenH;
        w = screenH * targetAspect;
      } else {
        w = screenW;
        h = screenW / targetAspect;
      }

      if (this.canvasWrapper) {
        this.canvasWrapper.style.width = `${w}px`;
        this.canvasWrapper.style.height = `${h}px`;
      }
    };

    window.addEventListener('resize', resize);
    resize();
  }

  async _preloadImages() {
    const manifest = [
      // Player
      'player/player_idle.png', 'player/player_walk.png', 'player/player_run.png',
      'player/player_jump.png', 'player/player_double_jump.png', 'player/player_shoot.png',
      'player/player_reload.png', 'player/player_hurt.png', 'player/player_dodge.png',
      'player/player_death.png',

      // Enemies
      'enemies/soldier_idle.png', 'enemies/soldier_walk.png', 'enemies/soldier_attack.png',
      'enemies/soldier_shoot.png', 'enemies/soldier_hurt.png', 'enemies/soldier_death.png',
      'enemies/guard_idle.png', 'enemies/guard_walk.png',
      'enemies/rifle_soldier_idle.png', 'enemies/rifle_soldier_walk.png', 'enemies/rifle_soldier_shoot.png',
      'enemies/assault_idle.png', 'enemies/assault_walk.png',
      'enemies/sniper_idle.png', 'enemies/sniper_walk.png', 'enemies/sniper_shoot.png',
      'enemies/heavy_gunner_idle.png', 'enemies/heavy_gunner_walk.png',
      'enemies/shield_soldier_idle.png', 'enemies/shield_soldier_walk.png',
      'enemies/drone_idle.png', 'enemies/drone_walk.png',

      // Boss
      'boss/boss_idle.png', 'boss/boss_walk.png', 'boss/boss_attack.png',
      'boss/boss_dash.png', 'boss/boss_shield.png', 'boss/boss_hurt.png', 'boss/boss_death.png',
      'boss/boss_idle_rage.png', 'boss/boss_attack_rage.png', 'boss/boss_dash_rage.png',

      // Levels
      'levels/level1_background.png', 'levels/level1_ground_tile.png', 'levels/level1_platform_tile.png',
      'levels/level2_background.png', 'levels/level2_ground_tile.png', 'levels/level2_platform_tile.png',
      'levels/level3_background.png', 'levels/level3_ground_tile.png', 'levels/level3_platform_tile.png',

      // Obstacles
      'obstacles/spike.png', 'obstacles/fire_trap.png', 'obstacles/electric_floor.png',
      'obstacles/laser.png', 'obstacles/explosive_barrel.png', 'obstacles/security_gate.png',
      'obstacles/moving_wall.png', 'obstacles/rotating_laser_pivot.png',

      // Collectibles
      'collectibles/coin.png', 'collectibles/health_pack.png', 'collectibles/armor_pack.png',
      'collectibles/ammo_box.png', 'collectibles/key.png', 'collectibles/master_key.png',
      'collectibles/checkpoint.png', 'collectibles/weapon_upgrade.png', 'collectibles/grenade.png',

      // UI
      'ui/icon_health.png', 'ui/icon_armor.png', 'ui/icon_ammo.png',
      'ui/icon_coin.png', 'ui/icon_score.png', 'ui/button.png'
    ];

    const promises = manifest.map((path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = `assets/images/${path}`;
        const key = path.split('/').pop().replace('.png', '');
        img.onload = () => {
          this.imageCache[key] = img;
          resolve();
        };
        img.onerror = () => {
          // Graceful fallback: non-fatal if image file is absent
          resolve();
        };
      });
    });

    await Promise.all(promises);
    console.log(`[GlitchWorld] Preloaded ${Object.keys(this.imageCache).length} sprite assets successfully.`);
  }
}

// Instantiate and start once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.mainApp = new App();
  window.mainApp.init();
});
