/**
 * ui.js
 * In-game HUD Manager, Mini-map Renderer, Boss Bar, and Screen Shake System for GLITCH WORLD.
 */

class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.duration = 0;
    this.offset = { x: 0, y: 0 };
  }

  add(intensity, duration = 0.3) {
    this.intensity = Math.min(1.0, this.intensity + intensity);
    this.duration = duration;
  }

  update(dt) {
    if (this.duration > 0) {
      this.duration -= dt;
      const mag = this.intensity * 12;
      this.offset.x = (Math.random() - 0.5) * mag * 2;
      this.offset.y = (Math.random() - 0.5) * mag * 2;
      this.intensity = Math.max(0, this.intensity - dt * 2.5);
    } else {
      this.offset.x = 0;
      this.offset.y = 0;
      this.intensity = 0;
    }
  }
}

class UIManager {
  constructor() {
    // HUD Elements
    this.hudOverlay = document.getElementById('hud-overlay');
    this.healthFill = document.getElementById('hud-health-fill');
    this.healthVal = document.getElementById('hud-health-val');
    this.armorFill = document.getElementById('hud-armor-fill');
    this.armorVal = document.getElementById('hud-armor-val');
    this.glitchFill = document.getElementById('hud-glitch-fill');
    this.glitchVal = document.getElementById('hud-glitch-val');

    this.coinsVal = document.getElementById('hud-coins-val');
    this.scoreVal = document.getElementById('hud-score-val');
    this.ammoVal = document.getElementById('hud-ammo-val');
    this.levelTitle = document.getElementById('hud-level-title');
    this.objectiveText = document.getElementById('hud-objective-text');
    this.keyBadge = document.getElementById('hud-key-badge');

    // Boss Bar
    this.bossContainer = document.getElementById('hud-boss-container');
    this.bossName = document.getElementById('hud-boss-name');
    this.bossFill = document.getElementById('hud-boss-fill');
    this.bossRageTag = document.getElementById('hud-boss-rage-tag');

    // Mini-map Canvas
    this.minimapCanvas = document.getElementById('minimapCanvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

    // Toast
    this.toastEl = document.getElementById('checkpoint-toast');
    this.toastTimeout = null;
  }

  showHUD(show = true) {
    if (this.hudOverlay) {
      this.hudOverlay.style.display = show ? 'block' : 'none';
      if (show) this.hudOverlay.classList.add('active');
      else this.hudOverlay.classList.remove('active');
    }
  }

  updateHUD(player, level, glitchManager) {
    if (!player || !level) return;

    // Health
    if (this.healthFill) {
      const hpPct = Math.max(0, Math.min(100, (player.health / player.maxHealth) * 100));
      this.healthFill.style.width = `${hpPct}%`;
    }
    if (this.healthVal) this.healthVal.textContent = `${Math.ceil(player.health)}`;

    // Armor
    if (this.armorFill) {
      const armPct = Math.max(0, Math.min(100, (player.armor / player.maxArmor) * 100));
      this.armorFill.style.width = `${armPct}%`;
    }
    if (this.armorVal) this.armorVal.textContent = `${Math.ceil(player.armor)}`;

    // Glitch Energy
    if (glitchManager && this.glitchFill) {
      const glitchPct = Math.max(0, Math.min(100, (glitchManager.energy / glitchManager.maxEnergy) * 100));
      this.glitchFill.style.width = `${glitchPct}%`;
      if (this.glitchVal) this.glitchVal.textContent = `${Math.ceil(glitchManager.energy)}%`;
    }

    // Coins, Score, Ammo
    if (this.coinsVal) this.coinsVal.textContent = `${player.coins}`;
    if (this.scoreVal) this.scoreVal.textContent = `${player.score}`;
    if (this.ammoVal) {
      if (player.hasWeapon) {
        this.ammoVal.textContent = `${player.magazine} / ${player.ammoReserve}`;
      } else {
        this.ammoVal.textContent = `N/A`;
      }
    }

    // Level & Mission Text
    if (this.levelTitle) this.levelTitle.textContent = level.name;
    if (this.objectiveText) this.objectiveText.textContent = level.missionText;

    // Key Badge
    if (this.keyBadge) {
      if (level.keyCollected || player.hasKey || player.hasMasterKey) {
        this.keyBadge.textContent = 'KEY: SECURED';
        this.keyBadge.classList.add('acquired');
      } else {
        this.keyBadge.textContent = 'KEY: MISSING';
        this.keyBadge.classList.remove('acquired');
      }
    }

    // Boss Bar
    this.updateBossBar(level.boss);

    // Mini-map
    this.renderMinimap(level, player);
  }

  updateBossBar(boss) {
    if (!this.bossContainer) return;
    if (boss && boss.alive) {
      this.bossContainer.classList.add('active');
      this.bossContainer.style.display = 'flex';
      const pct = Math.max(0, Math.min(100, (boss.health / boss.maxHealth) * 100));
      if (this.bossFill) this.bossFill.style.width = `${pct}%`;
      if (this.bossRageTag) {
        this.bossRageTag.style.display = boss.rageMode ? 'inline' : 'none';
      }
    } else {
      this.bossContainer.classList.remove('active');
      this.bossContainer.style.display = 'none';
    }
  }

  renderMinimap(level, player) {
    if (!this.minimapCtx || !this.minimapCanvas) return;
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    const scaleX = w / level.width;
    const scaleY = h / level.height;

    // Platforms
    ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
    for (let i = 0; i < level.platforms.length; i++) {
      const p = level.platforms[i];
      ctx.fillRect(p.x * scaleX, p.y * scaleY, Math.max(2, p.width * scaleX), Math.max(2, p.height * scaleY));
    }

    // Exit Door (Green)
    if (level.exitRect) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(level.exitRect.x * scaleX, level.exitRect.y * scaleY, 4, 8);
    }

    // Key (Gold)
    if (level.keyPos && !level.keyCollected) {
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(level.keyPos.x * scaleX, level.keyPos.y * scaleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies (Red)
    ctx.fillStyle = '#ef4444';
    for (let i = 0; i < level.enemies.length; i++) {
      const e = level.enemies[i];
      if (e.alive) {
        ctx.fillRect(e.rect.x * scaleX, e.rect.y * scaleY, 3, 3);
      }
    }

    // Boss (Large Purple)
    if (level.boss && level.boss.alive) {
      ctx.fillStyle = level.boss.rageMode ? '#f97316' : '#a855f7';
      ctx.fillRect(level.boss.rect.x * scaleX, level.boss.rect.y * scaleY, 6, 6);
    }

    // Player (Cyan with pulse)
    if (player && player.isAlive) {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(player.rect.centerx * scaleX, player.rect.centery * scaleY, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  showCheckpointToast(text = 'CHECKPOINT ACTIVATED') {
    if (!this.toastEl) return;
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2000);
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Global Singleton Export
window.uiManager = new UIManager();
