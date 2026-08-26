/**
 * enemy.js
 * Advanced Dynamic Enemy AI Finite State Machine for GLITCH WORLD.
 * States: PATROL -> ALERT -> CHASE -> ATTACK -> COVER -> SEARCH -> PATROL
 */

const ENEMY_PRESETS = {
  'soldier':        { health: 40,  damage: 8,  speed: 95,  vision: 260, attackRange: 240, fireRate: 1.4 },
  'guard':          { health: 55,  damage: 10, speed: 75,  vision: 220, attackRange: 200, fireRate: 1.6 },
  'rifle_soldier':  { health: 45,  damage: 12, speed: 110, vision: 320, attackRange: 320, fireRate: 1.1 },
  'assault':        { health: 60,  damage: 14, speed: 130, vision: 300, attackRange: 260, fireRate: 1.0 },
  'sniper':         { health: 35,  damage: 28, speed: 50,  vision: 480, attackRange: 460, fireRate: 2.2 },
  'drone':          { health: 30,  damage: 9,  speed: 150, vision: 340, attackRange: 280, fireRate: 0.9 },
  'heavy_gunner':   { health: 110, damage: 16, speed: 65,  vision: 260, attackRange: 240, fireRate: 0.65 },
  'shield_soldier': { health: 90,  damage: 9,  speed: 70,  vision: 240, attackRange: 200, fireRate: 1.5 }
};

const COVER_CAPABLE_TYPES = new Set(['rifle_soldier', 'shield_soldier', 'sniper', 'heavy_gunner']);

class Enemy {
  constructor(x, y, type = 'soldier', patrolPoints = null, imageCache = {}) {
    const stats = ENEMY_PRESETS[type] || ENEMY_PRESETS['soldier'];
    this.type = type;
    this.width = type === 'drone' ? 36 : 30;
    this.height = type === 'drone' ? 24 : 52;
    this.rect = new Rect(x, y, this.width, this.height);

    this.maxHealth = stats.health;
    this.health = stats.health;
    this.damage = stats.damage;
    this.speed = stats.speed;
    this.visionRange = stats.vision;
    this.attackRange = stats.attackRange;
    this.fireRate = stats.fireRate;

    this.isFlying = type === 'drone';
    this.patrolPoints = patrolPoints || [{ x: x - 80, y: y }, { x: x + 80, y: y }];
    this.patrolIndex = 0;
    this.facing = 1;

    // AI States: patrol, alert, chase, attack, cover, search, dead
    this.state = 'patrol';
    this.fireCooldown = Math.random() * 0.5;
    this.alertTimer = 0;
    this.searchTimer = 0;
    this.coverTimer = 0;
    this.coverPoint = null;
    this.lastKnownPlayerPos = null;
    this.calledBackup = false;

    this.timesHitRecently = 0;
    this.recentHitTimer = 0;

    this.alive = true;
    this.deathTimer = 0;
    this.deathAnimDuration = 0.45;
    this.animTime = 0;

    this.imageCache = imageCache;
  }

  get deathFinished() {
    return !this.alive && this.deathTimer <= 0;
  }

  takeDamage(amount, particles = null) {
    if (!this.alive) return;
    this.health -= amount;
    this.recentHitTimer = 0.7;
    this.timesHitRecently++;

    if (particles) {
      particles.emitBurst(this.rect.centerx, this.rect.centery, '#ef4444', 12, 120, 0.4);
    }

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.state = 'dead';
      this.deathTimer = this.deathAnimDuration;
      if (particles) {
        particles.emitExplosion(this.rect.centerx, this.rect.centery, 16);
      }
    }
  }

  canSeePlayer(player) {
    const origin = [this.rect.centerx, this.rect.centery];
    const angle = this.facing > 0 ? 0 : Math.PI;
    const target = [player.rect.centerx, player.rect.centery];
    return PhysicsUtils.pointInCone(origin, angle, 90, this.visionRange, target);
  }

  update(dt, player, solidRects = [], bulletsOut = [], allEnemies = []) {
    if (!this.alive) {
      if (this.deathTimer > 0) this.deathTimer -= dt;
      return;
    }

    // Apply time-dilation if Glitch Mode is active
    const timeScale = window.glitchManager ? window.glitchManager.getTimeScale() : 1.0;
    const effectiveDt = dt * timeScale;

    this.animTime += effectiveDt;
    if (this.fireCooldown > 0) this.fireCooldown -= effectiveDt;
    if (this.recentHitTimer > 0) this.recentHitTimer -= effectiveDt;

    const playerVisible = player.isAlive && this.canSeePlayer(player);
    const distToPlayer = PhysicsUtils.distance(
      this.rect.centerx, this.rect.centery,
      player.rect.centerx, player.rect.centery
    );

    // --- State Machine Transitions ---
    if (this.state === 'patrol') {
      if (playerVisible) {
        this.state = 'alert';
        this.alertTimer = 0.35;
      }
    } else if (this.state === 'alert') {
      this.alertTimer -= effectiveDt;
      if (playerVisible) {
        if (this.alertTimer <= 0) {
          this.state = 'chase';
          this.lastKnownPlayerPos = { x: player.rect.centerx, y: player.rect.centery };
          this._alertSquad(allEnemies);
        }
      } else {
        this.state = 'patrol';
      }
    } else if (this.state === 'chase') {
      if (playerVisible) {
        this.lastKnownPlayerPos = { x: player.rect.centerx, y: player.rect.centery };
        if (distToPlayer <= this.attackRange) {
          this.state = 'attack';
        }
      } else {
        this.state = 'search';
        this.searchTimer = 2.2;
      }
    } else if (this.state === 'attack') {
      if (!playerVisible) {
        this.state = 'search';
        this.searchTimer = 2.2;
      } else if (distToPlayer > this.attackRange * 1.15) {
        this.state = 'chase';
      } else if (COVER_CAPABLE_TYPES.has(this.type) && this.recentHitTimer > 0 && this.timesHitRecently >= 2) {
        // Retreat to cover
        this.state = 'cover';
        this.coverTimer = 1.4;
        this.timesHitRecently = 0;
        const awayDir = this.rect.centerx > player.rect.centerx ? 1 : -1;
        this.coverPoint = { x: this.rect.centerx + awayDir * 120, y: this.rect.centery };
      }
    } else if (this.state === 'cover') {
      this.coverTimer -= effectiveDt;
      if (this.coverTimer <= 0) {
        this.state = playerVisible ? 'chase' : 'search';
        this.searchTimer = 2.0;
      }
    } else if (this.state === 'search') {
      this.searchTimer -= effectiveDt;
      if (playerVisible) {
        this.state = 'chase';
        this.lastKnownPlayerPos = { x: player.rect.centerx, y: player.rect.centery };
      } else if (this.searchTimer <= 0) {
        this.state = 'patrol';
      }
    }

    // --- State Actions & Movement ---
    if (this.state === 'patrol') {
      this._patrolMove(effectiveDt);
    } else if (this.state === 'alert') {
      this.facing = player.rect.centerx >= this.rect.centerx ? 1 : -1;
    } else if (this.state === 'chase') {
      this._chaseMove(effectiveDt, player.rect.centerx, player.rect.centery);
    } else if (this.state === 'attack') {
      this.facing = player.rect.centerx >= this.rect.centerx ? 1 : -1;
      this._tryShoot(player, bulletsOut);
    } else if (this.state === 'cover' && this.coverPoint) {
      this.facing = player.rect.centerx >= this.rect.centerx ? 1 : -1;
      this._chaseMove(effectiveDt, this.coverPoint.x, this.coverPoint.y, 8);
    } else if (this.state === 'search' && this.lastKnownPlayerPos) {
      this._chaseMove(effectiveDt, this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, 16);
    }

    // Ground gravity for non-flying enemies
    if (!this.isFlying) {
      this.rect.y += 600 * effectiveDt;
      for (let i = 0; i < solidRects.length; i++) {
        const wall = solidRects[i];
        if (this.rect.colliderect(wall)) {
          this.rect.bottom = wall.top;
          break;
        }
      }
    }
  }

  _alertSquad(allEnemies) {
    if (this.calledBackup) return;
    this.calledBackup = true;
    for (let i = 0; i < allEnemies.length; i++) {
      const other = allEnemies[i];
      if (other !== this && other.alive && other.state === 'patrol') {
        const d = PhysicsUtils.distance(this.rect.centerx, this.rect.centery, other.rect.centerx, other.rect.centery);
        if (d < 280) {
          other.state = 'chase';
          other.lastKnownPlayerPos = this.lastKnownPlayerPos;
        }
      }
    }
  }

  _patrolMove(dt) {
    if (!this.patrolPoints || this.patrolPoints.length === 0) return;
    const target = this.patrolPoints[this.patrolIndex];
    const dx = target.x - this.rect.centerx;

    if (Math.abs(dx) < 6) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
    } else {
      this.facing = dx > 0 ? 1 : -1;
      this.rect.x += this.facing * this.speed * dt;
    }

    if (this.isFlying) {
      const dy = target.y - this.rect.centery;
      if (Math.abs(dy) > 4) {
        this.rect.y += (dy > 0 ? 1 : -1) * this.speed * dt;
      }
    }
  }

  _chaseMove(dt, targetX, targetY, stopDist = 12) {
    const dx = targetX - this.rect.centerx;
    if (Math.abs(dx) > stopDist) {
      this.facing = dx > 0 ? 1 : -1;
      this.rect.x += this.facing * this.speed * 1.35 * dt;
    }

    if (this.isFlying) {
      const dy = targetY - this.rect.centery;
      if (Math.abs(dy) > stopDist) {
        this.rect.y += (dy > 0 ? 1 : -1) * this.speed * dt;
      }
    }
  }

  _tryShoot(player, bulletsOut) {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = this.fireRate;

    const dx = player.rect.centerx - this.rect.centerx;
    const dy = player.rect.centery - this.rect.centery;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Sniper & rifle soldiers are highly accurate; others have small spread
    let spread = (this.type === 'sniper' || this.type === 'rifle_soldier') ? 0 : (Math.random() - 0.5) * 0.12;
    let ndx = dx / dist;
    let ndy = dy / dist;

    if (spread !== 0) {
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);
      const rx = ndx * cos - ndy * sin;
      const ry = ndx * sin + ndy * cos;
      ndx = rx;
      ndy = ry;
    }

    bulletsOut.push(new Bullet(this.rect.centerx, this.rect.centery, [ndx, ndy], this.damage, 'enemy'));
    window.audioManager.play('gunshot', 0.4);
  }

  // --- Rendering ---
  draw(ctx, camX = 0, camY = 0) {
    if (this.deathFinished) return;

    const drawX = this.rect.centerx - camX;
    const drawY = this.rect.bottom - camY;

    ctx.save();

    // Draw Vision Cone if on Patrol or Alert
    if (this.alive && (this.state === 'patrol' || this.state === 'alert' || this.state === 'chase' || this.state === 'attack')) {
      this._drawVisionCone(ctx, drawX, drawY - 26);
    }

    if (!this.alive) {
      // Fading death collapse
      const alpha = Math.max(0, this.deathTimer / this.deathAnimDuration);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(drawX, drawY - 6, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Sprite drawing
    const spriteKey = `${this.type}_${this.state === 'attack' ? 'shoot' : (this.state === 'patrol' || this.state === 'chase' ? 'walk' : 'idle')}`;
    const sprite = this.imageCache[spriteKey] || this.imageCache[`soldier_${this.state === 'attack' ? 'shoot' : 'idle'}`];

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.translate(drawX, drawY);
      if (this.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(sprite, -this.width / 2, -this.height, this.width, this.height);
    } else {
      this._drawProcedural(ctx, drawX, drawY);
    }

    // Health Bar
    this._drawHealthBar(ctx, drawX, drawY);

    ctx.restore();
  }

  _drawVisionCone(ctx, x, y) {
    const angle = this.facing > 0 ? 0 : Math.PI;
    const fov = (90 * Math.PI) / 180;
    const color = (this.state === 'chase' || this.state === 'attack') ? 'rgba(239, 68, 68, 0.18)' : 'rgba(255, 230, 0, 0.12)';

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, this.visionRange, angle - fov / 2, angle + fov / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawHealthBar(ctx, x, y) {
    const barW = 32;
    const barH = 4;
    const pct = Math.max(0, this.health / this.maxHealth);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - barW / 2, y - this.height - 12, barW, barH);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - barW / 2, y - this.height - 12, barW * pct, barH);
  }

  _drawProcedural(ctx, x, y) {
    const colors = {
      'soldier': '#94a3b8', 'guard': '#64748b', 'rifle_soldier': '#10b981',
      'assault': '#f97316', 'sniper': '#3b82f6', 'drone': '#00f0ff',
      'heavy_gunner': '#ef4444', 'shield_soldier': '#a855f7'
    };
    const bodyColor = colors[this.type] || '#94a3b8';

    if (this.isFlying) {
      // Drone Body
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(x - 18, y - 20, 36, 16, 6);
      ctx.fill();
      // Glowing eye
      ctx.fillStyle = '#ff0077';
      ctx.beginPath();
      ctx.arc(x + this.facing * 6, y - 12, 4, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Humanoid Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(x - 11, y - 44, 22, 30, 4);
    ctx.fill();

    // Head
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x, y - 48, 9, 0, Math.PI * 2);
    ctx.fill();

    // Gun
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 32);
    ctx.lineTo(x + this.facing * 20, y - 32);
    ctx.stroke();

    // Shield (if shield soldier)
    if (this.type === 'shield_soldier') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x + this.facing * 12, y - 48, 6, 44);
    }
  }
}
