/**
 * glitch.js
 * Core Glitch Ability Engine for GLITCH WORLD.
 * Manages glitch energy, barrier phasing, hidden platforms, time-dilation, and visual shader distortion.
 */

class GlitchManager {
  constructor() {
    this.maxEnergy = 100;
    this.energy = 100;
    this.isActive = false;
    this.drainRate = 26; // Energy drained per second when active
    this.rechargeRate = 18; // Energy restored per second when inactive
    this.cooldownTimer = 0;
    this.minEnergyToActivate = 15;

    // Distortion animation timers
    this.distortionTime = 0;
    this.sliceOffsets = [];
    this.numSlices = 8;
    for (let i = 0; i < this.numSlices; i++) {
      this.sliceOffsets.push(0);
    }
  }

  toggle(player) {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate() {
    if (this.energy < this.minEnergyToActivate || this.cooldownTimer > 0) {
      window.audioManager.play('error', 0.4);
      return false;
    }
    this.isActive = true;
    window.audioManager.play('glitch_activate', 0.6);
    return true;
  }

  deactivate() {
    if (this.isActive) {
      this.isActive = false;
      this.cooldownTimer = 0.4; // 400ms cooldown before next activation
    }
  }

  update(dt, particles = null, playerPos = null) {
    this.distortionTime += dt;

    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (this.isActive) {
      this.energy -= this.drainRate * dt;
      if (this.energy <= 0) {
        this.energy = 0;
        this.deactivate();
        window.audioManager.play('player_hurt', 0.3);
      }

      // Emit glitch trail particles around player
      if (particles && playerPos) {
        particles.emitGlitchTrail(playerPos.x, playerPos.y, 2);
      }

      // Update scanline slice jitter
      for (let i = 0; i < this.numSlices; i++) {
        if (Math.random() < 0.3) {
          this.sliceOffsets[i] = (Math.random() - 0.5) * 22;
        } else {
          this.sliceOffsets[i] *= 0.8;
        }
      }
    } else {
      this.energy = Math.min(this.maxEnergy, this.energy + this.rechargeRate * dt);
    }
  }

  /**
   * Applies post-processing glitch canvas distortion if glitch mode is active.
   */
  applyScreenShader(ctx, canvas) {
    if (!this.isActive) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    // 1. Digital Scanline Displacement Slices
    const sliceH = h / this.numSlices;
    for (let i = 0; i < this.numSlices; i++) {
      const offset = this.sliceOffsets[i];
      if (Math.abs(offset) > 1.5) {
        const sy = i * sliceH;
        ctx.drawImage(canvas, 0, sy, w, sliceH, offset, sy, w, sliceH);
      }
    }

    // 2. Cyan & Magenta RGB Color Channel Splitting
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(Math.sin(this.distortionTime * 20) * 4, 0, w, h);

    ctx.fillStyle = '#ff0077';
    ctx.fillRect(-Math.cos(this.distortionTime * 15) * 4, 0, w, h);

    // 3. Cyber Grid Scanlines
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    for (let y = 0; y < h; y += 6) {
      if ((y + Math.floor(this.distortionTime * 60)) % 12 === 0) {
        ctx.fillRect(0, y, w, 2);
      }
    }

    ctx.restore();
  }

  /**
   * Returns whether an obstacle can be phased through right now.
   */
  canPhaseThrough(obstacle) {
    return this.isActive && (obstacle.glitchable || obstacle.isGlitchWall);
  }

  /**
   * Returns whether a hidden platform or secret passage is revealed.
   */
  isRevealed(object) {
    return !object.hiddenGlitch || this.isActive;
  }

  /**
   * Returns the time dilation factor for enemies/projectiles in glitch state.
   */
  getTimeScale() {
    return this.isActive ? 0.45 : 1.0;
  }
}

// Global Singleton Export
window.glitchManager = new GlitchManager();
