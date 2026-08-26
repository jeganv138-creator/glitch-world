/**
 * collision.js
 * Comprehensive Collision and Geometric Physics Math for GLITCH WORLD.
 */

class Rect {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  get left() { return this.x; }
  get right() { return this.x + this.width; }
  get top() { return this.y; }
  get bottom() { return this.y + this.height; }
  get centerx() { return this.x + this.width / 2; }
  get centery() { return this.y + this.height / 2; }

  set left(val) { this.x = val; }
  set right(val) { this.x = val - this.width; }
  set top(val) { this.y = val; }
  set bottom(val) { this.y = val - this.height; }
  set centerx(val) { this.x = val - this.width / 2; }
  set centery(val) { this.y = val - this.height / 2; }

  colliderect(other) {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }

  collidepoint(px, py) {
    return (
      px >= this.x &&
      px <= this.x + this.width &&
      py >= this.y &&
      py <= this.y + this.height
    );
  }

  clone() {
    return new Rect(this.x, this.y, this.width, this.height);
  }
}

const PhysicsUtils = {
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Checks whether a target point falls inside an enemy's vision cone.
   * @param {Array<number>} origin [x, y]
   * @param {number} angleFacing in radians (0 = right, PI = left)
   * @param {number} fovDegrees Field of view angle in degrees
   * @param {number} rangePx Maximum vision distance in px
   * @param {Array<number>} target [x, y]
   */
  pointInCone(origin, angleFacing, fovDegrees, rangePx, target) {
    const dx = target[0] - origin[0];
    const dy = target[1] - origin[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > rangePx) return false;

    const angleToTarget = Math.atan2(dy, dx);
    let diff = angleToTarget - angleFacing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const halfFov = (fovDegrees * Math.PI) / 360;
    return Math.abs(diff) <= halfFov;
  },

  /**
   * Tests line segment intersection against an AABB rectangle (e.g. for laser sweeps).
   */
  lineHitsRect(x1, y1, x2, y2, rect, steps = 12) {
    if (rect.collidepoint(x1, y1) || rect.collidepoint(x2, y2)) return true;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (rect.collidepoint(px, py)) return true;
    }
    return false;
  }
};
