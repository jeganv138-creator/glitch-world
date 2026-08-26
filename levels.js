/**
 * levels.js
 * Complete Level Architecture, Platform Physics, Hazards, Puzzles, and 3 Distinct Level Layouts for GLITCH WORLD.
 */

class MovingPlatform {
  constructor(x, y, w, h, rangePx, speed, axis = 'x', crush = false) {
    this.origin = { x, y };
    this.rect = new Rect(x, y, w, h);
    this.rangePx = rangePx;
    this.speed = speed;
    this.axis = axis;
    this.crush = crush;
    this.t = Math.random() * Math.PI * 2;
    this.dx = 0;
    this.dy = 0;
  }

  update(dt) {
    const oldX = this.rect.x;
    const oldY = this.rect.y;
    this.t += this.speed * dt;
    const offset = Math.sin(this.t) * this.rangePx;

    if (this.axis === 'x') {
      this.rect.x = Math.round(this.origin.x + offset);
    } else {
      this.rect.y = Math.round(this.origin.y + offset);
    }

    this.dx = this.rect.x - oldX;
    this.dy = this.rect.y - oldY;
  }

  draw(ctx, camX, camY, imageCache) {
    const r = new Rect(this.rect.x - camX, this.rect.y - camY, this.rect.width, this.rect.height);
    const sprite = this.crush ? imageCache['moving_wall'] : imageCache['level1_platform_tile'];

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, r.x, r.y, r.width, r.height);
    } else {
      ctx.fillStyle = this.crush ? '#ef4444' : '#00f0ff';
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.width, r.height, 4);
      ctx.fill();
    }
  }
}

class Switch {
  constructor(x, y, gateId) {
    this.rect = new Rect(x - 16, y - 16, 32, 32);
    this.gateId = gateId;
    this.activated = false;
  }

  draw(ctx, camX, camY) {
    const x = this.rect.centerx - camX;
    const y = this.rect.centery - camY;

    ctx.save();
    // Base
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 14, y - 6, 28, 16);

    // Lever
    const leverColor = this.activated ? '#10b981' : '#ef4444';
    const leverX = x + (this.activated ? 8 : -8);
    ctx.strokeStyle = leverColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(leverX, y - 16);
    ctx.stroke();

    ctx.fillStyle = leverColor;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Gate {
  constructor(x, y, w, h, gateId) {
    this.rect = new Rect(x, y, w, h);
    this.gateId = gateId;
    this.open = false;
    this.openProgress = 0; // 0 = closed, 1 = fully open
  }

  update(dt) {
    const target = this.open ? 1 : 0;
    this.openProgress += (target - this.openProgress) * Math.min(1, dt * 4);
  }

  draw(ctx, camX, camY, imageCache) {
    if (this.openProgress > 0.98) return;
    const r = new Rect(this.rect.x - camX, this.rect.y - camY, this.rect.width, this.rect.height);
    const slide = r.height * this.openProgress;

    const sprite = imageCache['security_gate'];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, r.x, r.y - slide, r.width, r.height);
    } else {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(r.x, r.y - slide, r.width, r.height);
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 2;
      for (let i = 0; i < r.width; i += 8) {
        ctx.beginPath();
        ctx.moveTo(r.x + i, r.y - slide);
        ctx.lineTo(r.x + i, r.y + r.height - slide);
        ctx.stroke();
      }
    }
  }
}

class RotatingLaser {
  constructor(pivotX, pivotY, length, speed, damage = 26, startAngle = 0) {
    this.pivot = { x: pivotX, y: pivotY };
    this.length = length;
    this.speed = speed; // radians per second
    this.angle = startAngle;
    this.damage = damage;
  }

  update(dt) {
    // Apply glitch slow down if active
    const timeScale = window.glitchManager && window.glitchManager.isActive ? 0.3 : 1.0;
    this.angle += this.speed * dt * timeScale;
  }

  endpoint() {
    return {
      x: this.pivot.x + Math.cos(this.angle) * this.length,
      y: this.pivot.y + Math.sin(this.angle) * this.length
    };
  }

  hitsRect(rect) {
    const end = this.endpoint();
    return PhysicsUtils.lineHitsRect(this.pivot.x, this.pivot.y, end.x, end.y, rect);
  }

  draw(ctx, camX, camY, imageCache) {
    const px = this.pivot.x - camX;
    const py = this.pivot.y - camY;
    const end = this.endpoint();
    const ex = end.x - camX;
    const ey = end.y - camY;

    ctx.save();
    // Pivot
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();

    // Laser Beam
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Hazard {
  constructor(rect, kind, damage = 20, togglePeriod = 0) {
    this.rect = new Rect(rect.x, rect.y, rect.w, rect.h);
    this.kind = kind; // 'spike', 'fire', 'laser', 'electric'
    this.damage = damage;
    this.togglePeriod = togglePeriod; // seconds, 0 = always active
    this.timer = 0;
    this.active = true;
  }

  update(dt) {
    if (this.togglePeriod > 0) {
      this.timer += dt;
      if (this.timer >= this.togglePeriod) {
        this.timer = 0;
        this.active = !this.active;
      }
    }
  }

  draw(ctx, camX, camY, imageCache) {
    const x = this.rect.x - camX;
    const y = this.rect.y - camY;
    const w = this.rect.width;
    const h = this.rect.height;

    ctx.save();
    if (this.kind === 'spike') {
      const sprite = imageCache['spike'];
      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        for (let cx = x; cx < x + w; cx += 20) {
          ctx.drawImage(sprite, cx, y, Math.min(20, x + w - cx), h);
        }
      } else {
        ctx.fillStyle = '#94a3b8';
        const count = Math.max(1, Math.floor(w / 14));
        for (let i = 0; i < count; i++) {
          const bx = x + i * 14;
          ctx.beginPath();
          ctx.moveTo(bx, y + h);
          ctx.lineTo(bx + 7, y);
          ctx.lineTo(bx + 14, y + h);
          ctx.fill();
        }
      }
    } else if (this.kind === 'fire') {
      if (this.active) {
        const sprite = imageCache['fire_trap'];
        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
          ctx.drawImage(sprite, x, y, w, h);
        } else {
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillRect(x, y, w, h);
        }
      }
    } else if (this.kind === 'laser') {
      ctx.fillStyle = this.active ? '#ef4444' : 'rgba(239, 68, 68, 0.2)';
      ctx.shadowColor = this.active ? '#ef4444' : 'transparent';
      ctx.shadowBlur = this.active ? 15 : 0;
      ctx.fillRect(x, y, w, h);
    } else if (this.kind === 'electric') {
      ctx.fillStyle = this.active ? '#38bdf8' : '#1e293b';
      ctx.shadowColor = this.active ? '#00f0ff' : 'transparent';
      ctx.shadowBlur = this.active ? 15 : 0;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }
}

class Pickup {
  constructor(x, y, kind, amount = 0) {
    this.rect = new Rect(x - 10, y - 10, 20, 20);
    this.kind = kind; // 'coin', 'health', 'ammo', 'armor', 'weapon_rifle', 'grenade'
    this.amount = amount;
    this.collected = false;
    this.bobT = Math.random() * Math.PI * 2;
  }

  update(dt) {
    this.bobT += dt * 3;
  }

  draw(ctx, camX, camY, imageCache) {
    if (this.collected) return;
    const yOff = Math.sin(this.bobT) * 4;
    const x = this.rect.centerx - camX;
    const y = this.rect.centery - camY + yOff;

    ctx.save();
    const spriteName = {
      'coin': 'coin',
      'health': 'health_pack',
      'armor': 'armor_pack',
      'ammo': 'ammo_box',
      'weapon_rifle': 'weapon_upgrade',
      'grenade': 'grenade'
    }[this.kind];

    const sprite = imageCache[spriteName];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, x - 12, y - 12, 24, 24);
    } else {
      const colors = {
        'coin': '#ffe600',
        'health': '#ef4444',
        'armor': '#38bdf8',
        'ammo': '#fbbf24',
        'weapon_rifle': '#00f0ff',
        'grenade': '#4b5563'
      };
      ctx.fillStyle = colors[this.kind] || '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

class ExplosiveBarrel {
  constructor(x, y) {
    this.rect = new Rect(x, y, 26, 34);
    this.health = 20;
    this.exploded = false;
  }

  takeDamage(amt) {
    this.health -= amt;
    if (this.health <= 0) this.exploded = true;
  }

  draw(ctx, camX, camY, imageCache) {
    if (this.exploded) return;
    const r = new Rect(this.rect.x - camX, this.rect.y - camY, this.rect.width, this.rect.height);

    const sprite = imageCache['explosive_barrel'];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, r.x, r.y, r.width, r.height);
    } else {
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(r.x, r.y, r.width, r.height, 4);
      ctx.fill();
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// --- Base Level Class ---
class LevelBase {
  constructor(imageCache = {}, checkpointPos = null) {
    this.name = 'Level';
    this.missionText = 'Explore and reach the exit';
    this.musicKey = 'level1_music';
    this.hasWeapon = false;
    this.width = 3800;
    this.height = 720;
    this.artKey = 'level1';

    this.platforms = [];
    this.movingPlatforms = [];
    this.hazards = [];
    this.rotatingLasers = [];
    this.switches = [];
    this.gates = [];
    this.pickups = [];
    this.barrels = [];
    this.enemies = [];
    this.boss = null;
    this.checkpoints = [];
    this.activeCheckpoint = checkpointPos || { x: 100, y: 480 };

    this.keyPos = null;
    this.keyCollected = false;
    this.exitRect = null;
    this.exitLocked = true;
    this.exitOpenProgress = 0;

    this.completed = false;
    this.playerDied = false;
    this.enemiesDefeated = 0;
    this.elapsed = 0;
    this.camX = 0;
    this.camY = 0;

    this.imageCache = imageCache;
  }

  allSolids() {
    const solids = [...this.platforms];
    for (let i = 0; i < this.movingPlatforms.length; i++) {
      solids.push(this.movingPlatforms[i].rect);
    }
    for (let i = 0; i < this.gates.length; i++) {
      if (this.gates[i].openProgress < 0.6) {
        solids.push(this.gates[i].rect);
      }
    }
    return solids;
  }

  update(dt, player, controls, bullets, muzzleFlashes, particles, screenShake) {
    this.elapsed += dt;

    // 1. Update Platforms, Gates, Hazards & Lasers
    for (let i = 0; i < this.movingPlatforms.length; i++) {
      this.movingPlatforms[i].update(dt);
    }
    for (let i = 0; i < this.hazards.length; i++) {
      this.hazards[i].update(dt);
    }
    for (let i = 0; i < this.rotatingLasers.length; i++) {
      this.rotatingLasers[i].update(dt);
    }
    for (let i = 0; i < this.gates.length; i++) {
      this.gates[i].update(dt);
    }
    for (let i = 0; i < this.pickups.length; i++) {
      this.pickups[i].update(dt);
    }

    // 2. Switches & Gates Interaction (Press E / Auto on Touch)
    for (let i = 0; i < this.switches.length; i++) {
      const sw = this.switches[i];
      if (!sw.activated && sw.rect.colliderect(player.rect)) {
        sw.activated = true;
        window.audioManager.play('success', 0.5);
      }
    }
    for (let i = 0; i < this.gates.length; i++) {
      const gate = this.gates[i];
      const linked = this.switches.filter(s => s.gateId === gate.gateId);
      if (linked.length > 0) {
        gate.open = linked.every(s => s.activated);
      }
    }

    // 3. Player Shooting
    if (player.hasWeapon && controls.shoot && player.isAlive) {
      if (player.tryShoot()) {
        const muzzle = player.muzzlePosition();
        const mouseWorldX = controls.mouseX + this.camX;
        const mouseWorldY = controls.mouseY + this.camY;
        const dx = mouseWorldX - muzzle.x;
        const dy = mouseWorldY - muzzle.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const dmg = 18 * player.weaponStats[player.weaponType].damageMult;

        bullets.push(new Bullet(muzzle.x, muzzle.y, [dx / dist, dy / dist], dmg, 'player'));
        muzzleFlashes.push(new MuzzleFlash(muzzle.x, muzzle.y));
        window.audioManager.play('shoot', 0.6);
      }
    }

    // 4. Update Audio Flags
    if (player.footstepFlag) window.audioManager.play('footstep', 0.3);
    if (player.jumpFlag) window.audioManager.play('jump', 0.5);
    if (player.doubleJumpFlag) window.audioManager.play('double_jump', 0.5);

    // 5. Update Bullets & Collisions
    const solids = this.allSolids();
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(dt, solids);
      if (!b.alive) {
        bullets.splice(i, 1);
        continue;
      }

      // Player Bullet Hits
      if (b.owner === 'player') {
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          if (e.alive && e.rect.colliderect(b.rect)) {
            e.takeDamage(b.damage, particles);
            b.alive = false;
            window.audioManager.play('enemy_hit', 0.5);
            break;
          }
        }
        if (b.alive && this.boss && this.boss.alive && this.boss.rect.colliderect(b.rect)) {
          this.boss.takeDamage(b.damage);
          b.alive = false;
          window.audioManager.play('enemy_hit', 0.5);
        }
        if (b.alive) {
          for (let j = 0; j < this.barrels.length; j++) {
            const barrel = this.barrels[j];
            if (!barrel.exploded && barrel.rect.colliderect(b.rect)) {
              barrel.takeDamage(30);
              b.alive = false;
              break;
            }
          }
        }
      } else if (b.owner === 'enemy') {
        if (b.rect.colliderect(player.rect)) {
          player.takeDamage(b.damage);
          b.alive = false;
          window.audioManager.play('player_hurt', 0.5);
          if (screenShake) screenShake.add(0.35);
        }
      }
    }

    // 6. Update Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      e.update(dt, player, this.platforms, bullets, this.enemies);
      if (!e.alive && !e._looted) {
        e._looted = true;
        this.enemiesDefeated++;
        this.pickups.push(new Pickup(e.rect.centerx, e.rect.centery, 'coin', 5));
        window.audioManager.play('death', 0.4);
      }
    }

    // 7. Update Boss (Level 3)
    if (this.boss) {
      const wasAlive = this.boss.alive;
      this.boss.update(dt, player, bullets, particles, screenShake);
      if (wasAlive && !this.boss.alive) {
        particles.emitExplosion(this.boss.rect.centerx, this.boss.rect.centery, 50);
        window.audioManager.play('explosion', 0.9);
        if (screenShake) screenShake.add(0.9);
      }
    }

    // 8. Process Explosive Barrels
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const b = this.barrels[i];
      if (b.exploded) {
        particles.emitExplosion(b.rect.centerx, b.rect.centery, 30);
        window.audioManager.play('explosion', 0.8);
        if (screenShake) screenShake.add(0.5);

        // AoE damage
        const distP = PhysicsUtils.distance(player.rect.centerx, player.rect.centery, b.rect.centerx, b.rect.centery);
        if (distP < 140) player.takeDamage(35);
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          const distE = PhysicsUtils.distance(e.rect.centerx, e.rect.centery, b.rect.centerx, b.rect.centery);
          if (distE < 140) e.takeDamage(60, particles);
        }
        this.barrels.splice(i, 1);
      }
    }

    // 9. Hazard & Laser Collisions
    for (let i = 0; i < this.hazards.length; i++) {
      const hz = this.hazards[i];
      if (hz.active && hz.rect.colliderect(player.rect)) {
        player.takeDamage(hz.damage * dt * 2.5);
      }
    }
    for (let i = 0; i < this.rotatingLasers.length; i++) {
      const rl = this.rotatingLasers[i];
      if (rl.hitsRect(player.rect)) {
        player.takeDamage(rl.damage * dt * 2.5);
      }
    }

    // 10. Collect Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      const pu = this.pickups[i];
      if (!pu.collected && pu.rect.colliderect(player.rect)) {
        pu.collected = true;
        this._applyPickup(player, pu);
      }
    }

    // 11. Key Hunt & Exit Door
    const keyBlocked = this.boss && this.boss.alive;
    if (this.keyPos && !this.keyCollected && !keyBlocked) {
      const keyRect = new Rect(this.keyPos.x - 16, this.keyPos.y - 16, 32, 32);
      if (keyRect.colliderect(player.rect)) {
        this.keyCollected = true;
        player.hasKey = true;
        this.exitLocked = false;
        window.audioManager.play('key_collect', 0.8);
        window.audioManager.play('door_open', 0.7);
        particles.emitBurst(this.keyPos.x, this.keyPos.y, '#ffe600', 25, 160);
      }
    }

    const targetOpen = !this.exitLocked ? 1 : 0;
    this.exitOpenProgress += (targetOpen - this.exitOpenProgress) * Math.min(1, dt * 3);

    if (this.exitRect && !this.exitLocked && this.exitOpenProgress > 0.6 && this.exitRect.colliderect(player.rect)) {
      this.completed = true;
    }

    // 12. Checkpoints
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      const cpRect = new Rect(cp.x - 20, cp.y - 40, 40, 60);
      if (cpRect.colliderect(player.rect) && (this.activeCheckpoint.x !== cp.x || this.activeCheckpoint.y !== cp.y)) {
        this.activeCheckpoint = cp;
        window.storageManager.saveCheckpoint(this.levelIndex, cp, {
          health: player.health,
          armor: player.armor,
          ammo: player.ammoReserve,
          coins: player.coins,
          score: player.score
        });
        window.audioManager.play('success', 0.5);
      }
    }

    // 13. Move and Carry Player on Platforms
    player.handleInput(controls, dt);
    player.moveAndCollide(dt, solids);
    this._carryPlayerOnMovingPlatforms(player);
    player.updateTimers(dt);

    if (player.rect.top > this.height + 200) {
      player.takeDamage(player.maxHealth);
    }

    if (!player.isAlive) {
      this.playerDied = true;
    }

    // 14. Camera Follow
    const targetCamX = PhysicsUtils.clamp(player.rect.centerx - 1280 / 2, 0, Math.max(0, this.width - 1280));
    this.camX += (targetCamX - this.camX) * 0.12;
    this.camY = 0;
  }

  _carryPlayerOnMovingPlatforms(player) {
    if (!player.onGround) return;
    for (let i = 0; i < this.movingPlatforms.length; i++) {
      const mp = this.movingPlatforms[i];
      if (mp.dx === 0 && mp.dy === 0) continue;
      const standingOnTop = (
        Math.abs(player.rect.bottom - mp.rect.top) <= 5 &&
        player.rect.right > mp.rect.left &&
        player.rect.left < mp.rect.right
      );
      if (standingOnTop) {
        player.rect.x += mp.dx;
        player.rect.bottom = mp.rect.top;
        break;
      }
    }
  }

  _applyPickup(player, pu) {
    if (pu.kind === 'coin') {
      player.addCoins(pu.amount || 1);
      window.audioManager.play('coin', 0.5);
    } else if (pu.kind === 'health') {
      player.addHealth(pu.amount || 30);
      window.audioManager.play('success', 0.5);
    } else if (pu.kind === 'ammo') {
      player.addAmmo(pu.amount || 24);
      window.audioManager.play('success', 0.5);
    } else if (pu.kind === 'armor') {
      player.addArmor(pu.amount || 30);
      window.audioManager.play('success', 0.5);
    } else if (pu.kind === 'weapon_rifle') {
      player.unlockWeapon('rifle');
      player.switchWeapon('rifle');
      window.audioManager.play('success', 0.8);
    }
  }

  // --- Draw Function ---
  draw(ctx, player, bullets, muzzleFlashes, particles, screenShake) {
    const shake = screenShake ? screenShake.offset : { x: 0, y: 0 };
    const drawCamX = this.camX - shake.x;
    const drawCamY = this.camY - shake.y;

    // 1. Background
    const bgSprite = this.imageCache[`${this.artKey}_background`];
    if (bgSprite && bgSprite.complete && bgSprite.naturalWidth > 0) {
      ctx.drawImage(bgSprite, 0, 0, 1280, 720);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 1280, 720);
    }

    // 2. Platforms
    const groundTile = this.imageCache[`${this.artKey}_ground_tile`];
    const platTile = this.imageCache[`${this.artKey}_platform_tile`];

    for (let i = 0; i < this.platforms.length; i++) {
      const p = this.platforms[i];
      const r = new Rect(p.x - drawCamX, p.y - drawCamY, p.width, p.height);
      if (r.right < 0 || r.left > 1280) continue;

      const tile = p.height >= 100 ? groundTile : platTile;
      if (tile && tile.complete && tile.naturalWidth > 0) {
        this._drawTiled(ctx, tile, r);
      } else {
        ctx.fillStyle = p.height >= 100 ? '#334155' : '#475569';
        ctx.fillRect(r.x, r.y, r.width, r.height);
      }
    }

    // 3. Moving Platforms & Gates & Switches
    for (let i = 0; i < this.movingPlatforms.length; i++) {
      this.movingPlatforms[i].draw(ctx, drawCamX, drawCamY, this.imageCache);
    }
    for (let i = 0; i < this.gates.length; i++) {
      this.gates[i].draw(ctx, drawCamX, drawCamY, this.imageCache);
    }
    for (let i = 0; i < this.switches.length; i++) {
      this.switches[i].draw(ctx, drawCamX, drawCamY);
    }

    // 4. Hazards & Lasers & Barrels
    for (let i = 0; i < this.hazards.length; i++) {
      this.hazards[i].draw(ctx, drawCamX, drawCamY, this.imageCache);
    }
    for (let i = 0; i < this.rotatingLasers.length; i++) {
      this.rotatingLasers[i].draw(ctx, drawCamX, drawCamY, this.imageCache);
    }
    for (let i = 0; i < this.barrels.length; i++) {
      this.barrels[i].draw(ctx, drawCamX, drawCamY, this.imageCache);
    }

    // 5. Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      this.pickups[i].draw(ctx, drawCamX, drawCamY, this.imageCache);
    }

    // 6. Key
    if (this.keyPos && !this.keyCollected && !(this.boss && this.boss.alive)) {
      const kx = this.keyPos.x - drawCamX;
      const ky = this.keyPos.y - drawCamY + Math.sin(this.elapsed * 4) * 6;
      const keySprite = this.imageCache[this.keyArt || 'key'];

      if (keySprite && keySprite.complete && keySprite.naturalWidth > 0) {
        ctx.drawImage(keySprite, kx - 16, ky - 16, 32, 32);
      } else {
        ctx.fillStyle = '#ffe600';
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(kx, ky, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 7. Checkpoints & Exit Door
    this._drawCheckpoints(ctx, drawCamX, drawCamY);
    this._drawExitDoor(ctx, drawCamX, drawCamY);

    // 8. Enemies & Boss
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].draw(ctx, drawCamX, drawCamY);
    }
    if (this.boss) {
      this.boss.draw(ctx, drawCamX, drawCamY);
    }

    // 9. Bullets & Muzzle Flashes & Player & Particles
    for (let i = 0; i < bullets.length; i++) {
      bullets[i].draw(ctx, drawCamX, drawCamY);
    }
    for (let i = 0; i < muzzleFlashes.length; i++) {
      muzzleFlashes[i].draw(ctx, drawCamX, drawCamY);
    }

    player.draw(ctx, drawCamX, drawCamY);
    particles.draw(ctx, drawCamX, drawCamY);
  }

  _drawTiled(ctx, tile, r) {
    const tw = tile.naturalWidth || 64;
    const th = tile.naturalHeight || 64;
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.width, r.height);
    ctx.clip();

    for (let y = r.y; y < r.bottom; y += th) {
      for (let x = r.x; x < r.right; x += tw) {
        ctx.drawImage(tile, x, y, tw, th);
      }
    }
    ctx.restore();
  }

  _drawCheckpoints(ctx, camX, camY) {
    const sprite = this.imageCache['checkpoint'];
    for (let i = 0; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i];
      const x = cp.x - camX;
      const y = cp.y - camY;
      const isActive = this.activeCheckpoint && this.activeCheckpoint.x === cp.x && this.activeCheckpoint.y === cp.y;

      if (sprite && sprite.complete && sprite.naturalWidth > 0) {
        ctx.save();
        if (isActive) {
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 15;
        }
        ctx.drawImage(sprite, x - 16, y - 32, 32, 32);
        ctx.restore();
      } else {
        ctx.fillStyle = isActive ? '#10b981' : '#64748b';
        ctx.fillRect(x - 2, y - 30, 4, 30);
        ctx.beginPath();
        ctx.moveTo(x + 2, y - 30);
        ctx.lineTo(x + 16, y - 22);
        ctx.lineTo(x + 2, y - 14);
        ctx.fill();
      }
    }
  }

  _drawExitDoor(ctx, camX, camY) {
    if (!this.exitRect) return;
    const r = new Rect(this.exitRect.x - camX, this.exitRect.y - camY, this.exitRect.width, this.exitRect.height);

    ctx.save();
    // Door frame
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(r.x - 4, r.y - 4, r.width + 8, r.height + 8, 8);
    ctx.fill();

    // Sliding Panels
    const slide = (r.width / 2) * this.exitOpenProgress;
    const doorColor = !this.exitLocked ? '#10b981' : '#64748b';

    ctx.fillStyle = doorColor;
    ctx.fillRect(r.x - slide, r.y, r.width / 2, r.height);
    ctx.fillRect(r.x + r.width / 2 + slide, r.y, r.width / 2, r.height);

    if (!this.exitLocked) {
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 16;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    }
    ctx.restore();
  }
}

// ==========================================================================
// LEVEL 1: ADVENTURE FOREST
// ==========================================================================
class Level1 extends LevelBase {
  constructor(imageCache, checkpointPos) {
    super(imageCache, checkpointPos);
    this.levelIndex = 1;
    this.name = 'LEVEL 1 - Adventure Forest';
    this.missionText = 'Explore the forest & find the Hidden Key';
    this.musicKey = 'level1_music';
    this.artKey = 'level1';
    this.hasWeapon = false;
    this.width = 3800;
    this.build();
  }

  build() {
    const groundY = 560;
    // Ground Segments
    this.platforms.push(new Rect(0, groundY, 700, 160));
    this.platforms.push(new Rect(780, groundY, 500, 160));
    this.platforms.push(new Rect(1120, groundY - 40, 40, 200));
    this.platforms.push(new Rect(1400, groundY, 600, 160));
    this.platforms.push(new Rect(2100, groundY, 500, 160));
    this.platforms.push(new Rect(2700, groundY, 500, 160));
    this.platforms.push(new Rect(3320, groundY, 480, 160));

    // Floating Platforms
    const plats = [
      [760, 470], [1050, 420], [1330, 460],
      [1900, 450], [2020, 380], [2500, 460], [3150, 440]
    ];
    for (let i = 0; i < plats.length; i++) {
      this.platforms.push(new Rect(plats[i][0], plats[i][1], 110, 22));
    }

    // Hidden Underground Tunnel with Bonus Coins & Health
    this.platforms.push(new Rect(3200, groundY + 200, 250, 40));
    this.platforms.push(new Rect(3200, groundY + 40, 20, 160));
    this.pickups.push(new Pickup(3260, groundY + 150, 'coin', 5));
    this.pickups.push(new Pickup(3320, groundY + 150, 'coin', 5));
    this.pickups.push(new Pickup(3380, groundY + 150, 'coin', 5));
    this.pickups.push(new Pickup(3400, groundY + 150, 'health', 40));

    // Moving Platforms
    this.movingPlatforms.push(new MovingPlatform(1180, 500, 90, 20, 70, 1.2, 'x'));
    this.movingPlatforms.push(new MovingPlatform(2600, 420, 90, 20, 60, 1.4, 'y'));
    this.movingPlatforms.push(new MovingPlatform(3050, 470, 90, 20, 55, 1.1, 'y'));

    // Hazards
    this.hazards.push(new Hazard({ x: 900, y: groundY - 16, w: 60, h: 16 }, 'spike', 20));
    this.hazards.push(new Hazard({ x: 2260, y: groundY - 16, w: 80, h: 16 }, 'spike', 20));
    this.hazards.push(new Hazard({ x: 2860, y: groundY - 16, w: 60, h: 16 }, 'spike', 20));
    this.hazards.push(new Hazard({ x: 3450, y: groundY - 16, w: 70, h: 16 }, 'spike', 22));
    this.hazards.push(new Hazard({ x: 1500, y: 420, w: 60, h: 16 }, 'fire', 16, 1.3));

    // Coins & Health
    const coins = [
      [200, 500], [250, 500], [300, 500], [820, 430], [1060, 380],
      [1340, 420], [1750, 500], [1910, 410], [2030, 340], [2450, 500],
      [2560, 420], [2900, 500], [3180, 400], [3600, 500], [3650, 500]
    ];
    for (let i = 0; i < coins.length; i++) {
      this.pickups.push(new Pickup(coins[i][0], coins[i][1], 'coin', 1));
    }
    this.pickups.push(new Pickup(1500, 500, 'health', 25));
    this.pickups.push(new Pickup(2750, 500, 'health', 25));
    this.pickups.push(new Pickup(3600, 400, 'health', 25));

    // Checkpoints
    this.checkpoints = [
      { x: 760, y: 480 },
      { x: 1900, y: 480 },
      { x: 2750, y: 480 },
      { x: 3350, y: 480 }
    ];

    this.keyPos = { x: 2050, y: 320 };
    this.exitRect = new Rect(this.width - 160, groundY - 120, 70, 120);
  }
}

// ==========================================================================
// LEVEL 2: MILITARY BASE
// ==========================================================================
class Level2 extends LevelBase {
  constructor(imageCache, checkpointPos) {
    super(imageCache, checkpointPos);
    this.levelIndex = 2;
    this.name = 'LEVEL 2 - Military Base';
    this.missionText = 'Infiltrate the base, unlock the security gate & escape';
    this.musicKey = 'level2_music';
    this.artKey = 'level2';
    this.hasWeapon = true;
    this.width = 3800;
    this.build();
  }

  build() {
    const groundY = 560;
    this.platforms.push(new Rect(0, groundY, 900, 160));
    this.platforms.push(new Rect(980, groundY, 700, 160));
    this.platforms.push(new Rect(1780, groundY, 700, 160));
    this.platforms.push(new Rect(2580, groundY, 500, 160));
    this.platforms.push(new Rect(3180, groundY, 620, 160));

    // Platforms
    const plats = [
      [920, 460], [1250, 420], [1560, 460], [2000, 420],
      [2350, 460], [2480, 380], [3050, 440]
    ];
    for (let i = 0; i < plats.length; i++) {
      this.platforms.push(new Rect(plats[i][0], plats[i][1], 130, 22));
    }

    // High Watchtowers
    [500, 1500, 2900].forEach(x => {
      this.platforms.push(new Rect(x, groundY - 220, 90, 220));
    });

    // Moving Platforms & Moving Walls
    this.movingPlatforms.push(new MovingPlatform(2150, 480, 100, 20, 90, 1.1, 'x'));
    this.movingPlatforms.push(new MovingPlatform(2800, 440, 90, 20, 70, 1.3, 'y', true));

    // Puzzle: Switch & Security Gate
    this.switches.push(new Switch(2250, groundY - 40, 'gate_a'));
    this.gates.push(new Gate(2560, groundY - 160, 24, 160, 'gate_a'));

    // Laser Security Barriers & Hazards
    this.hazards.push(new Hazard({ x: 1300, y: groundY - 150, w: 10, h: 150 }, 'laser', 25, 1.5));
    this.hazards.push(new Hazard({ x: 2050, y: groundY - 150, w: 10, h: 150 }, 'laser', 25, 1.2));
    this.hazards.push(new Hazard({ x: 3300, y: groundY - 150, w: 10, h: 150 }, 'laser', 26, 1.0));
    this.hazards.push(new Hazard({ x: 1650, y: groundY - 16, w: 80, h: 16 }, 'fire', 18, 1.0));
    this.hazards.push(new Hazard({ x: 3000, y: groundY - 16, w: 60, h: 16 }, 'spike', 20));

    // Explosive Barrels
    this.barrels.push(new ExplosiveBarrel(1120, groundY - 34));
    this.barrels.push(new ExplosiveBarrel(2700, groundY - 34));
    this.barrels.push(new ExplosiveBarrel(3450, groundY - 34));

    // AI Soldiers Roster
    this.enemies.push(new Enemy(1050, groundY - 52, 'soldier', [{ x: 1000, y: groundY - 52 }, { x: 1300, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(1300, groundY - 52, 'guard', [{ x: 1250, y: groundY - 52 }, { x: 1550, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(1850, groundY - 52, 'guard', [{ x: 1800, y: groundY - 52 }, { x: 2050, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(2280, groundY - 52, 'rifle_soldier', [{ x: 2200, y: groundY - 52 }, { x: 2400, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(2950, groundY - 52, 'soldier', [{ x: 2900, y: groundY - 52 }, { x: 3150, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(3400, groundY - 52, 'rifle_soldier', [{ x: 3350, y: groundY - 52 }, { x: 3600, y: groundY - 52 }], this.imageCache));

    // Pickups
    const coins = [
      [300, 500], [650, 500], [1420, 500], [2000, 500],
      [2450, 340], [3100, 500], [3300, 500], [3650, 500]
    ];
    for (let i = 0; i < coins.length; i++) {
      this.pickups.push(new Pickup(coins[i][0], coins[i][1], 'coin', 2));
    }
    this.pickups.push(new Pickup(700, 500, 'ammo', 24));
    this.pickups.push(new Pickup(1950, 500, 'ammo', 24));
    this.pickups.push(new Pickup(3200, 500, 'ammo', 30));
    this.pickups.push(new Pickup(1400, 500, 'health', 30));
    this.pickups.push(new Pickup(2800, 500, 'armor', 25));
    this.pickups.push(new Pickup(3500, 500, 'weapon_rifle')); // Unlock Rifle!

    // Checkpoints
    this.checkpoints = [
      { x: 950, y: 480 },
      { x: 1850, y: 480 },
      { x: 2650, y: 480 },
      { x: 3250, y: 480 }
    ];

    this.keyPos = { x: 2620, y: 320 };
    this.exitRect = new Rect(this.width - 160, groundY - 120, 70, 120);
  }
}

// ==========================================================================
// LEVEL 3: DARK FORTRESS & MINI-BOSS FIGHT
// ==========================================================================
class Level3 extends LevelBase {
  constructor(imageCache, checkpointPos) {
    super(imageCache, checkpointPos);
    this.levelIndex = 3;
    this.name = 'LEVEL 3 - Dark Fortress';
    this.missionText = 'Defeat the Fortress Commander & Escape with the Master Key';
    this.musicKey = 'level3_music';
    this.artKey = 'level3';
    this.keyArt = 'master_key';
    this.hasWeapon = true;
    this.width = 4400;

    this.arenaTriggerX = 3720;
    this.arenaWall = new Rect(3700, 160, 20, 400);
    this.arenaSealed = false;
    this.masterKeySpawned = false;

    this.build();
  }

  build() {
    const groundY = 560;
    this.platforms.push(new Rect(0, groundY, 800, 160));
    this.platforms.push(new Rect(880, groundY, 600, 160));
    this.platforms.push(new Rect(1620, groundY, 700, 160));
    this.platforms.push(new Rect(2460, groundY, 500, 160));
    this.platforms.push(new Rect(3100, groundY, 500, 160));
    this.platforms.push(new Rect(3700, groundY, 700, 160));

    const plats = [
      [820, 460], [1100, 400], [1450, 460], [1900, 420],
      [2250, 460], [2700, 400], [3050, 460], [3450, 420]
    ];
    for (let i = 0; i < plats.length; i++) {
      this.platforms.push(new Rect(plats[i][0], plats[i][1], 130, 22));
    }

    // Moving Platforms & Crushing Walls
    this.movingPlatforms.push(new MovingPlatform(1350, 480, 100, 20, 100, 1.1, 'x'));
    this.movingPlatforms.push(new MovingPlatform(2150, 460, 90, 20, 80, 1.4, 'y'));
    this.movingPlatforms.push(new MovingPlatform(2900, 480, 110, 20, 90, 0.9, 'x', true));
    this.movingPlatforms.push(new MovingPlatform(3500, groundY - 180, 30, 180, 120, 0.7, 'x', true));

    // Two-Switch Treasure Room
    this.switches.push(new Switch(1150, groundY - 40, 'treasure'));
    this.switches.push(new Switch(2550, groundY - 40, 'treasure'));
    this.gates.push(new Gate(1980, groundY - 140, 24, 140, 'treasure'));
    this.platforms.push(new Rect(1990, groundY - 140, 220, 20));
    this.pickups.push(new Pickup(2020, groundY - 40, 'coin', 10));
    this.pickups.push(new Pickup(2070, groundY - 40, 'coin', 10));
    this.pickups.push(new Pickup(2120, groundY - 40, 'coin', 10));
    this.pickups.push(new Pickup(2170, groundY - 40, 'coin', 10));
    this.pickups.push(new Pickup(2100, groundY - 90, 'armor', 40));

    // Rotating Lasers & Electric Floors
    this.hazards.push(new Hazard({ x: 1250, y: groundY - 10, w: 150, h: 10 }, 'electric', 22, 1.3));
    this.hazards.push(new Hazard({ x: 3350, y: groundY - 10, w: 150, h: 10 }, 'electric', 24, 1.1));
    this.hazards.push(new Hazard({ x: 1550, y: groundY - 16, w: 70, h: 16 }, 'spike', 24));
    this.hazards.push(new Hazard({ x: 2900, y: groundY - 16, w: 70, h: 16 }, 'spike', 24));
    this.hazards.push(new Hazard({ x: 2380, y: groundY - 16, w: 60, h: 16 }, 'fire', 20, 0.8));

    this.rotatingLasers.push(new RotatingLaser(2700, groundY - 90, 150, 1.2, 26));
    this.rotatingLasers.push(new RotatingLaser(3600, groundY - 120, 130, -1.5, 28));

    // Explosive Barrels
    this.barrels.push(new ExplosiveBarrel(1500, groundY - 34));
    this.barrels.push(new ExplosiveBarrel(2500, groundY - 34));
    this.barrels.push(new ExplosiveBarrel(3200, groundY - 34));

    // Elite Enemies Roster
    this.enemies.push(new Enemy(950, groundY - 52, 'assault', [{ x: 900, y: groundY - 52 }, { x: 1200, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(1700, groundY - 52, 'sniper', [{ x: 1650, y: groundY - 52 }, { x: 1650, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(2000, 300, 'drone', [{ x: 1900, y: 300 }, { x: 2300, y: 300 }], this.imageCache));
    this.enemies.push(new Enemy(2550, groundY - 52, 'heavy_gunner', [{ x: 2500, y: groundY - 52 }, { x: 2800, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(3050, groundY - 52, 'shield_soldier', [{ x: 3000, y: groundY - 52 }, { x: 3250, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(3450, groundY - 52, 'assault', [{ x: 3400, y: groundY - 52 }, { x: 3650, y: groundY - 52 }], this.imageCache));
    this.enemies.push(new Enemy(2400, 300, 'drone', [{ x: 2300, y: 300 }, { x: 2700, y: 300 }], this.imageCache));

    // Pickups
    this.pickups.push(new Pickup(1000, 500, 'ammo', 30));
    this.pickups.push(new Pickup(2200, 500, 'ammo', 30));
    this.pickups.push(new Pickup(3300, 500, 'ammo', 30));
    this.pickups.push(new Pickup(1800, 500, 'health', 35));
    this.pickups.push(new Pickup(2600, 500, 'armor', 30));
    this.pickups.push(new Pickup(3900, 500, 'health', 40));

    // Checkpoints
    this.checkpoints = [
      { x: 900, y: 480 },
      { x: 1900, y: 480 },
      { x: 2900, y: 480 },
      { x: 3750, y: 480 }
    ];

    // Mini-Boss and Arena
    this.boss = new MiniBoss(4150, groundY - 100, this.imageCache);
    this.keyPos = { x: 4200, y: 380 };
    this.exitRect = new Rect(this.width - 160, groundY - 120, 70, 120);
  }

  update(dt, player, controls, bullets, muzzleFlashes, particles, screenShake) {
    // Arena Seal Trigger
    if (!this.arenaSealed && player.rect.centerx > this.arenaTriggerX) {
      this.arenaSealed = true;
      this.platforms.push(this.arenaWall);
      window.audioManager.playMusic('boss_music');
      if (screenShake) screenShake.add(0.4);
    }

    super.update(dt, player, controls, bullets, muzzleFlashes, particles, screenShake);

    // Unseal Arena when Boss is Defeated
    if (this.boss && !this.boss.alive && !this.masterKeySpawned) {
      this.masterKeySpawned = true;
      window.audioManager.play('door_open', 0.8);
      window.audioManager.playMusic('level3_music');
      const idx = this.platforms.indexOf(this.arenaWall);
      if (idx !== -1) this.platforms.splice(idx, 1);
    }
  }

  draw(ctx, player, bullets, muzzleFlashes, particles, screenShake) {
    super.draw(ctx, player, bullets, muzzleFlashes, particles, screenShake);
    this._drawDynamicLighting(ctx, player);
  }

  _drawDynamicLighting(ctx, player) {
    // Dynamic Vignette Lighting (Dark fortress flashlight)
    const px = player.rect.centerx - this.camX;
    const py = player.rect.centery - this.camY;
    const radius = 260;

    const grad = ctx.createRadialGradient(px, py, 60, px, py, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.7, 'rgba(5, 5, 12, 0.4)');
    grad.addColorStop(1, 'rgba(5, 5, 12, 0.85)');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
    ctx.restore();
  }
}
