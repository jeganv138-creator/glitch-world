/**
 * boss.js
 * Level 3 Mini-Boss: Attack patterns (Machine Gun, Grenades, Dash Charge, Shield)
 * and Rage Mode for GLITCH WORLD.
 */

class MiniBoss {
  constructor(x, y, imageCache = {}) {
    this.width = 70;
    this.height = 100;
    this.rect = new Rect(x, y, this.width, this.height);

    this.maxHealth = 600;
    this.health = 600;
    this.rageThreshold = 0.30; // 30% health
    this.rageMode = false;
    this.alive = true;
    this.facing = -1;

    this.state = 'idle'; // idle, machinegun, grenade, dash, shield, dead
    this.attackTimer = 2.0;
    this.currentAttack = null;
    this.attackPhaseTimer = 0;
    this.burstCount = 0;
    this.dashVx = 0;
    this.shieldTimer = 0;
    this.hitFlash = 0;
    this.deathTimer = 0;
    this.animTime = 0;

    this.grenades = [];
    this.imageCache = imageCache;
  }

  takeDamage(amount) {
    if (!this.alive) return;

    // Shield mode absorbs 85% of damage
    if (this.state === 'shield') {
      amount *= 0.15;
    }

    this.health -= amount;
    this.hitFlash = 0.12;

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.state = 'dead';
      this.deathTimer = 1.6;
    } else if (this.health / this.maxHealth <= this.rageThreshold && !this.rageMode) {
      this.rageMode = true;
      window.audioManager.play('glitch_activate', 0.8);
    }
  }

  update(dt, player, bulletsOut = [], particles = null, screenShake = null) {
    if (!this.alive) {
      if (this.deathTimer > 0) {
        this.deathTimer -= dt;
        this.animTime += dt;
      }
      return;
    }

    // Apply glitch time-dilation if active
    const timeScale = window.glitchManager ? window.glitchManager.getTimeScale() : 1.0;
    const effectiveDt = dt * timeScale;

    this.animTime += effectiveDt;
    if (this.hitFlash > 0) this.hitFlash -= effectiveDt;

    this.facing = player.rect.centerx >= this.rect.centerx ? 1 : -1;

    // Update Boss Grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.update(effectiveDt);
      if (g.exploded) {
        const d = PhysicsUtils.distance(g.x, g.y, player.rect.centerx, player.rect.centery);
        if (d < g.radius) {
          player.takeDamage(24);
          if (screenShake) screenShake.add(0.5);
        }
        if (particles) particles.emitExplosion(g.x, g.y, 20);
        window.audioManager.play('explosion', 0.7);
        this.grenades.splice(i, 1);
      }
    }

    const speedMult = this.rageMode ? 1.6 : 1.0;

    // Attack Routine
    if (!this.currentAttack) {
      this.attackTimer -= effectiveDt;
      // Slowly drift toward player
      const dx = player.rect.centerx - this.rect.centerx;
      if (Math.abs(dx) > 140) {
        this.rect.x += (dx > 0 ? 1 : -1) * 80 * speedMult * effectiveDt;
      }

      if (this.attackTimer <= 0) {
        this._startAttack(player);
      }
    } else {
      this._runAttack(effectiveDt, player, bulletsOut, speedMult, screenShake);
    }
  }

  _startAttack(player) {
    const attacks = ['machinegun', 'grenade', 'dash'];
    if (!this.rageMode) attacks.push('shield');

    this.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
    this.state = this.currentAttack;
    this.attackPhaseTimer = 0;
    this.burstCount = 0;

    if (this.currentAttack === 'dash') {
      const dir = player.rect.centerx >= this.rect.centerx ? 1 : -1;
      this.dashVx = dir * (this.rageMode ? 560 : 400);
      window.audioManager.play('footstep', 0.8);
    } else if (this.currentAttack === 'shield') {
      this.shieldTimer = 2.0;
      window.audioManager.play('reload', 0.6);
    }
  }

  _runAttack(dt, player, bulletsOut, speedMult, screenShake) {
    this.attackPhaseTimer += dt;

    if (this.currentAttack === 'machinegun') {
      const cadence = this.rageMode ? 0.18 : 0.28;
      const targetCount = this.rageMode ? 10 : 6;
      if (this.attackPhaseTimer >= cadence * (this.burstCount + 1)) {
        this.burstCount++;
        const dx = player.rect.centerx - this.rect.centerx;
        const dy = player.rect.centery - this.rect.centery;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        bulletsOut.push(new Bullet(this.rect.centerx, this.rect.centery, [dx / dist, dy / dist], 14, 'enemy'));
        window.audioManager.play('gunshot', 0.5);

        if (this.burstCount >= targetCount) {
          this._endAttack();
        }
      }
    } else if (this.currentAttack === 'grenade') {
      if (this.attackPhaseTimer >= 0.3 && this.burstCount === 0) {
        this.burstCount = 1;
        this.grenades.push(new Grenade(this.rect.centerx, this.rect.centery - 20, player.rect.centerx, player.rect.centery));
        window.audioManager.play('shoot', 0.6);
      }
      if (this.attackPhaseTimer >= 1.4) {
        this._endAttack();
      }
    } else if (this.currentAttack === 'dash') {
      this.rect.x += this.dashVx * dt;
      if (this.rect.colliderect(player.rect)) {
        player.takeDamage(22);
        if (screenShake) screenShake.add(0.6);
        this._endAttack();
      }
      if (this.attackPhaseTimer >= 0.9) {
        this._endAttack();
      }
    } else if (this.currentAttack === 'shield') {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this._endAttack();
      }
    }
  }

  _endAttack() {
    this.currentAttack = null;
    this.state = 'idle';
    this.attackTimer = this.rageMode ? 1.3 : 2.0;
  }

  // --- Drawing ---
  draw(ctx, camX = 0, camY = 0) {
    if (!this.alive) {
      if (this.deathTimer > 0) this._drawDeathAnim(ctx, camX, camY);
      return;
    }

    const drawX = this.rect.centerx - camX;
    const drawY = this.rect.bottom - camY;

    ctx.save();

    // Rage Mode Aura
    if (this.rageMode) {
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 20;
    }

    // Hit Flash
    if (this.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
    }

    // Sprite drawing
    const spriteKey = `boss_${this.state}${this.rageMode ? '_rage' : ''}`;
    const sprite = this.imageCache[spriteKey] || this.imageCache[`boss_idle`];

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.translate(drawX, drawY);
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(sprite, -this.width / 2, -this.height, this.width, this.height);
    } else {
      this._drawProcedural(ctx, drawX, drawY);
    }

    // Energy Shield Barrier
    if (this.state === 'shield') {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(drawX, drawY - this.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw Grenades
    for (let i = 0; i < this.grenades.length; i++) {
      this.grenades[i].draw(ctx, camX, camY);
    }

    ctx.restore();
  }

  _drawProcedural(ctx, x, y) {
    const bodyColor = this.rageMode ? '#dc2626' : '#7c3aed';

    // Massive Body
    ctx.fillStyle = this.hitFlash > 0 ? '#ffffff' : bodyColor;
    ctx.beginPath();
    ctx.roundRect(x - 32, y - 85, 64, 75, 8);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x, y - 92, 16, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - 12, y - 96, 24, 6);
  }

  _drawDeathAnim(ctx, camX, camY) {
    const x = this.rect.centerx - camX;
    const y = this.rect.bottom - camY;
    const alpha = Math.max(0, this.deathTimer / 1.6);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.roundRect(x - 32, y - 60, 64, 50, 8);
    ctx.fill();

    // Expanding shockwave ring
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y - 50, (1 - alpha) * 120 + 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
