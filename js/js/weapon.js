/**
 * weapon.js
 * Weapon Systems, Projectiles, Muzzle Flashes, and Grenades for GLITCH WORLD.
 */

class Bullet {
  constructor(x, y, dir, damage, owner = 'player') {
    this.x = x;
    this.y = y;
    this.dir = dir; // [dx, dy] normalized
    this.damage = damage;
    this.owner = owner; // 'player' or 'enemy'
    this.speed = owner === 'player' ? 950 : 620; // px per second
    this.alive = true;
    this.life = 2.5; // Max travel time
    this.trail = [];
  }

  get rect() {
    return new Rect(this.x - 3, this.y - 3, 6, 6);
  }

  update(dt, solidRects = []) {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }

    // Save previous position for tracer
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 4) this.trail.shift();

    const moveX = this.dir[0] * this.speed * dt;
    const moveY = this.dir[1] * this.speed * dt;
    this.x += moveX;
    this.y += moveY;

    // Check collision against solid level geometry
    const r = this.rect;
    for (let i = 0; i < solidRects.length; i++) {
      const solid = solidRects[i];
      if (r.colliderect(solid)) {
        this.alive = false;
        break;
      }
    }
  }

  draw(ctx, camX = 0, camY = 0) {
    if (!this.alive) return;
    const drawX = this.x - camX;
    const drawY = this.y - camY;

    ctx.save();

    // Draw tracer tail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x - camX, this.trail[0].y - camY);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x - camX, this.trail[i].y - camY);
      }
      ctx.strokeStyle = this.owner === 'player' ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 60, 60, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw glowing bullet head
    ctx.fillStyle = this.owner === 'player' ? '#00f0ff' : '#ff4444';
    ctx.shadowColor = this.owner === 'player' ? '#00f0ff' : '#ff0000';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(drawX, drawY, this.owner === 'player' ? 3.5 : 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class MuzzleFlash {
  constructor(x, y, color = '#ffe600') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 0.08;
    this.maxLife = 0.08;
    this.radius = 12;
  }

  get alive() {
    return this.life > 0;
  }

  update(dt) {
    this.life -= dt;
  }

  draw(ctx, camX = 0, camY = 0) {
    if (!this.alive) return;
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(this.x - camX, this.y - camY, this.radius * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Grenade {
  constructor(x, y, targetX, targetY) {
    this.x = x;
    this.y = y;
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / dist) * 380;
    this.vy = -450;
    this.gravity = 750;
    this.fuse = 1.4; // Seconds until detonation
    this.alive = true;
    this.exploded = false;
    this.radius = 80;
    this.rotation = 0;
  }

  get rect() {
    return new Rect(this.x - 8, this.y - 8, 16, 16);
  }

  update(dt, solidRects = []) {
    if (!this.alive) return;
    this.fuse -= dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation += 10 * dt;

    // Bounce off floor if hitting solids
    const r = this.rect;
    for (let i = 0; i < solidRects.length; i++) {
      if (r.colliderect(solidRects[i])) {
        this.y = solidRects[i].top - 8;
        this.vy = -this.vy * 0.45;
        this.vx *= 0.7;
        break;
      }
    }

    if (this.fuse <= 0) {
      this.alive = false;
      this.exploded = true;
    }
  }

  draw(ctx, camX = 0, camY = 0) {
    if (!this.alive) return;
    ctx.save();
    ctx.translate(this.x - camX, this.y - camY);
    ctx.rotate(this.rotation);

    // Grenade Body
    ctx.fillStyle = '#4b5563';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flashing red fuse indicator
    if (Math.floor(this.fuse * 8) % 2 === 0) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
