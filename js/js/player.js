/**
 * player.js
 * Player Entity: physics, jump/double-jump, sprinting, dodge-roll, shooting, stats,
 * and procedural/sprite animations for GLITCH WORLD.
 */

class Player {
  constructor(x = 100, y = 100, hasWeapon = false, imageCache = {}) {
    this.width = 34;
    this.height = 58;
    this.rect = new Rect(x, y, this.width, this.height);
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = right, -1 = left

    // Physics parameters
    this.walkSpeed = 250;
    this.runSpeed = 440;
    this.jumpSpeed = -620;
    this.doubleJumpSpeed = -540;
    this.gravity = 1400;
    this.terminalVelocity = 900;
    this.friction = 0.82;

    // Movement & state flags
    this.onGround = false;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;
    this.isRunning = false;
    this.isCrouching = false;
    this.isDodging = false;
    this.dodgeTimer = 0;
    this.state = 'idle'; // idle, walk, run, jump, fall, shoot, reload, dodge, hurt, death, victory
    this.animTime = 0;

    // Combat Stats
    this.maxHealth = 100;
    this.health = 100;
    this.maxArmor = 100;
    this.armor = 0;
    this.coins = 0;
    this.score = 0;
    this.hasKey = false;
    this.hasMasterKey = false;
    this.grenades = 0;

    // Weapon & Ammo System
    this.hasWeapon = hasWeapon;
    this.weaponType = 'pistol';
    this.weaponStats = {
      'pistol': { magazineSize: 12, damageMult: 1.0, fireCooldown: 0.22, reloadTime: 0.9 },
      'rifle': { magazineSize: 24, damageMult: 0.75, fireCooldown: 0.12, reloadTime: 1.1 }
    };
    this.unlockedWeapons = new Set(['pistol']);
    this.magazine = hasWeapon ? 12 : 0;
    this.ammoReserve = 0;
    this.fireCooldown = 0;
    this.isReloading = false;
    this.reloadTimer = 0;

    // Invulnerability & Death
    this.invulnTimer = 0;
    this.isAlive = true;
    this.deathTimer = 0;

    // Audio cadence triggers
    this.footstepFlag = false;
    this.jumpFlag = false;
    this.doubleJumpFlag = false;
    this._prevSwingSign = 0;
    this._prevJumpKeyDown = false;

    // Preloaded sprites
    this.imageCache = imageCache;
  }

  // --- Weapon Management ---
  giveWeapon() {
    this.hasWeapon = true;
    if (this.magazine === 0) {
      this.magazine = this.weaponStats[this.weaponType].magazineSize;
    }
  }

  unlockWeapon(type) {
    if (this.weaponStats[type]) {
      this.unlockedWeapons.add(type);
    }
  }

  switchWeapon(type) {
    if (type === this.weaponType || !this.unlockedWeapons.has(type) || this.isReloading) {
      return false;
    }
    this.weaponType = type;
    this.magazine = Math.min(this.magazine, this.weaponStats[type].magazineSize);
    return true;
  }

  addHealth(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addArmor(amount) {
    this.armor = Math.min(this.maxArmor, this.armor + amount);
  }

  addAmmo(amount) {
    this.ammoReserve += amount;
  }

  addCoins(amount) {
    this.coins += amount;
    this.score += amount * 10;
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0 || !this.isAlive || this.isDodging) return;

    // Armor absorbs 50% of damage
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.5);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health = Math.max(0, this.health - amount);
    this.invulnTimer = 0.8; // 800ms invulnerability
    this.state = 'hurt';

    if (this.health <= 0) {
      this.isAlive = false;
      this.state = 'death';
    }
  }

  tryShoot() {
    if (!this.hasWeapon || this.isReloading || this.fireCooldown > 0 || !this.isAlive) {
      return false;
    }
    if (this.magazine <= 0) {
      this.startReload();
      return false;
    }

    this.magazine--;
    this.fireCooldown = this.weaponStats[this.weaponType].fireCooldown;
    return true;
  }

  startReload() {
    const stats = this.weaponStats[this.weaponType];
    if (this.isReloading || this.magazine >= stats.magazineSize) return;
    if (this.ammoReserve <= 0 && this.magazine > 0) return;

    this.isReloading = true;
    this.reloadTimer = stats.reloadTime;
    window.audioManager.play('reload', 0.6);
  }

  dodgeRoll() {
    if (this.onGround && !this.isDodging && this.dodgeTimer <= 0 && this.isAlive) {
      this.isDodging = true;
      this.dodgeTimer = 0.35;
      this.vx = 480 * this.facing;
      window.audioManager.play('footstep', 0.5);
    }
  }

  muzzlePosition() {
    const cx = this.rect.centerx + this.facing * (this.width * 0.65);
    const cy = this.rect.centery - 4;
    return { x: cx, y: cy };
  }

  // --- Input & Physics Update ---
  handleInput(controls, dt) {
    if (!this.isAlive) return;

    this.isRunning = controls.run;
    this.isCrouching = controls.crouch;

    let targetSpeed = this.walkSpeed;
    if (this.isCrouching) targetSpeed *= 0.5;
    else if (this.isRunning) targetSpeed = this.runSpeed;

    let moving = false;
    if (controls.left) {
      this.vx = -targetSpeed;
      this.facing = -1;
      moving = true;
    } else if (controls.right) {
      this.vx = targetSpeed;
      this.facing = 1;
      moving = true;
    } else if (!this.isDodging) {
      this.vx *= Math.pow(this.friction, dt * 60);
      if (Math.abs(this.vx) < 5) this.vx = 0;
    }

    // Jump & Double Jump edge detection
    this.jumpFlag = false;
    this.doubleJumpFlag = false;
    if (controls.jump && !this._prevJumpKeyDown) {
      if (this.onGround) {
        this.vy = this.jumpSpeed;
        this.onGround = false;
        this.canDoubleJump = true;
        this.hasDoubleJumped = false;
        this.jumpFlag = true;
      } else if (this.canDoubleJump && !this.hasDoubleJumped) {
        this.vy = this.doubleJumpSpeed;
        this.hasDoubleJumped = true;
        this.canDoubleJump = false;
        this.doubleJumpFlag = true;
      }
    }
    this._prevJumpKeyDown = controls.jump;

    // Dodge Roll
    if (controls.dodge) {
      this.dodgeRoll();
    }

    // Reload Key
    if (controls.reload && this.hasWeapon && !this.isReloading) {
      this.startReload();
    }

    // Weapon Switch Keys (1 = Pistol, 2 = Rifle)
    if (controls.weapon1) this.switchWeapon('pistol');
    if (controls.weapon2) this.switchWeapon('rifle');

    // Visual State Machine
    if (this.isDodging) {
      this.state = 'dodge';
    } else if (!this.onGround) {
      this.state = this.vy < 0 ? (this.hasDoubleJumped ? 'double_jump' : 'jump') : 'fall';
    } else if (this.isReloading) {
      this.state = 'reload';
    } else if (moving) {
      this.state = this.isRunning ? 'run' : 'walk';
    } else {
      this.state = 'idle';
    }

    if (this.fireCooldown > 0 && (this.state === 'idle' || this.state === 'walk' || this.state === 'run')) {
      this.state = 'shoot';
    }

    // Footstep cadence
    this.footstepFlag = false;
    if (this.onGround && moving && (this.state === 'walk' || this.state === 'run')) {
      const swingFreq = this.state === 'run' ? 14 : 9;
      const swing = Math.sin(this.animTime * swingFreq);
      const sign = swing > 0 ? 1 : (swing < 0 ? -1 : 0);
      if (sign !== 0 && sign !== this._prevSwingSign) {
        this.footstepFlag = true;
      }
      this._prevSwingSign = sign;
    }
  }

  moveAndCollide(dt, solidRects = []) {
    this.vy += this.gravity * dt;
    this.vy = Math.min(this.terminalVelocity, this.vy);

    // Horizontal Movement & Collision
    this.rect.x += this.vx * dt;
    for (let i = 0; i < solidRects.length; i++) {
      const wall = solidRects[i];
      if (this.rect.colliderect(wall)) {
        if (this.vx > 0) {
          this.rect.right = wall.left;
        } else if (this.vx < 0) {
          this.rect.left = wall.right;
        }
        this.vx = 0;
      }
    }

    // Vertical Movement & Collision
    this.onGround = false;
    this.rect.y += this.vy * dt;
    for (let i = 0; i < solidRects.length; i++) {
      const wall = solidRects[i];
      if (this.rect.colliderect(wall)) {
        if (this.vy > 0) {
          this.rect.bottom = wall.top;
          this.vy = 0;
          this.onGround = true;
          this.hasDoubleJumped = false;
        } else if (this.vy < 0) {
          this.rect.top = wall.bottom;
          this.vy = 0;
        }
      }
    }
  }

  updateTimers(dt) {
    this.animTime += dt;

    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const stats = this.weaponStats[this.weaponType];
        const needed = stats.magazineSize - this.magazine;
        const take = Math.min(this.ammoReserve, needed);
        this.magazine += take;
        this.ammoReserve -= take;
      }
    }

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
      }
    }
  }

  // --- Rendering (Sprite with Procedural Fallback) ---
  draw(ctx, camX = 0, camY = 0) {
    // Damage flicker
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer * 16) % 2 === 0 && this.isAlive) {
      return;
    }

    const drawX = this.rect.centerx - camX;
    const drawY = this.rect.bottom - camY;

    ctx.save();

    // Check if real sprite exists
    const spriteKey = `player_${this.state}`;
    const sprite = this.imageCache[spriteKey] || this.imageCache['player_idle'];

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.translate(drawX, drawY);
      if (this.facing < 0) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(sprite, -this.width / 2, -this.height, this.width, this.height);
    } else {
      // Procedural Humanoid Rig Animation
      this._drawProcedural(ctx, drawX, drawY);
    }

    // Glitch Aura when Glitch Mode is Active
    if (window.glitchManager && window.glitchManager.isActive) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      ctx.strokeRect(drawX - this.width / 2 - 2, drawY - this.height - 2, this.width + 4, this.height + 4);
    }

    ctx.restore();
  }

  _drawProcedural(ctx, x, y) {
    const t = this.animTime;
    const flip = this.facing;

    let legSwing = 0;
    if (this.state === 'walk' || this.state === 'run') {
      legSwing = Math.sin(t * (this.state === 'run' ? 14 : 9)) * (this.state === 'run' ? 14 : 9);
    } else {
      legSwing = Math.sin(t * 2.2) * 2; // Idle breathing
    }

    const crouchOff = this.isCrouching ? 12 : 0;
    const headBob = this.state === 'idle' ? Math.sin(t * 2.0) * 2 : 0;

    const hipY = y - 22 + crouchOff;
    const headY = y - 48 + crouchOff + headBob;

    // Legs
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(x - 5, hipY);
    ctx.lineTo(x - 5 + legSwing * 0.4, y);
    ctx.moveTo(x + 5, hipY);
    ctx.lineTo(x + 5 - legSwing * 0.4, y);
    ctx.stroke();

    // Torso
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.roundRect(x - 11, hipY - 26, 22, 26 - crouchOff, 6);
    ctx.fill();

    // Arms & Gun
    const armY = hipY - 20;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#e2e8f0';
    if (this.state === 'shoot' && this.hasWeapon) {
      ctx.beginPath();
      ctx.moveTo(x, armY);
      ctx.lineTo(x + flip * 22, armY + 2);
      ctx.stroke();

      // Gun
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + flip * 16, armY + 2);
      ctx.lineTo(x + flip * 30, armY + 2);
      ctx.stroke();
    } else if (this.isReloading) {
      const reloadDip = Math.sin((this.reloadTimer / 0.9) * Math.PI) * 12;
      ctx.beginPath();
      ctx.moveTo(x, armY);
      ctx.lineTo(x + flip * 14, armY + 10 + reloadDip);
      ctx.stroke();
    } else {
      const armSwing = Math.sin(t * (this.state === 'run' ? 14 : 4)) * (this.state !== 'idle' ? 10 : 3);
      ctx.beginPath();
      ctx.moveTo(x, armY);
      ctx.lineTo(x - armSwing, armY + 16);
      ctx.moveTo(x, armY);
      ctx.lineTo(x + armSwing, armY + 16);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(x, headY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Cyber Visor
    ctx.fillStyle = '#ff0077';
    ctx.shadowColor = '#ff0077';
    ctx.shadowBlur = 6;
    ctx.fillRect(x - 6, headY - 2, 12, 4);
    ctx.shadowBlur = 0;
  }
}
