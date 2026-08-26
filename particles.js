/**
 * particles.js
 * High-performance 2D Particle System for GLITCH WORLD.
 * Handles explosions, sparks, coin bursts, glitch holographic trails, and victory celebrations.
 */

class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.shape = shape; // 'circle', 'square', 'glitch_block', 'spark', 'confetti'
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
    this.gravity = 0;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.rotation += this.rotSpeed * dt;
  }

  draw(ctx, camX = 0, camY = 0) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, Math.min(1, this.life / this.maxLife));
    const drawX = this.x - camX;
    const drawY = this.y - camY;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(drawX, drawY);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.color;
    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, this.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'square' || this.shape === 'glitch_block') {
      const s = Math.max(2, this.size * alpha);
      ctx.fillRect(-s / 2, -s / 2, s, s);
    } else if (this.shape === 'confetti') {
      ctx.fillRect(-this.size, -this.size / 2, this.size * 2, this.size);
    } else if (this.shape === 'spark') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-this.size, 0);
      ctx.lineTo(this.size, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx, camX = 0, camY = 0) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx, camX, camY);
    }
  }

  clear() {
    this.particles = [];
  }

  // --- Particle Emitters ---
  emitBurst(x, y, color = '#ff0077', count = 16, speed = 140, life = 0.5, shape = 'circle') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      const p = new Particle(
        x,
        y,
        Math.cos(angle) * spd,
        Math.sin(angle) * spd,
        color,
        Math.random() * 4 + 3,
        Math.random() * life * 0.5 + life * 0.5,
        shape
      );
      p.gravity = 150;
      this.particles.push(p);
    }
  }

  emitExplosion(x, y, count = 28) {
    const colors = ['#ef4444', '#f97316', '#fbbf24', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 40;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        Math.random() * 6 + 4,
        Math.random() * 0.5 + 0.3,
        'circle'
      );
      p.gravity = 80;
      this.particles.push(p);
    }
  }

  emitGlitchTrail(x, y, count = 4) {
    const colors = ['#00f0ff', '#ff0077', '#a855f7', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = new Particle(
        x + (Math.random() - 0.5) * 20,
        y + (Math.random() - 0.5) * 35,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        color,
        Math.random() * 6 + 4,
        Math.random() * 0.3 + 0.15,
        'glitch_block'
      );
      this.particles.push(p);
    }
  }

  emitCoinSparkle(x, y, count = 8) {
    const colors = ['#ffe600', '#fffbeb', '#f59e0b'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 90 + 30;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        Math.random() * 4 + 2,
        Math.random() * 0.4 + 0.2,
        'spark'
      );
      p.gravity = 60;
      this.particles.push(p);
    }
  }

  emitFirework(x, y) {
    const colors = ['#00f0ff', '#ff0077', '#ffe600', '#10b981', '#a855f7', '#38bdf8'];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = Math.random() * 180 + 80;
      const p = new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        chosenColor,
        Math.random() * 4 + 2,
        Math.random() * 0.8 + 0.6,
        'circle'
      );
      p.gravity = 100;
      this.particles.push(p);
    }
  }

  emitConfetti(width, count = 3) {
    const colors = ['#00f0ff', '#ff0077', '#ffe600', '#10b981', '#a855f7', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = -10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const p = new Particle(
        x,
        y,
        (Math.random() - 0.5) * 60,
        Math.random() * 80 + 80,
        color,
        Math.random() * 5 + 4,
        4.0,
        'confetti'
      );
      p.gravity = 30;
      this.particles.push(p);
    }
  }
}
