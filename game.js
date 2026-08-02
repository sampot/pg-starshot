/**
 * Fixed-screen star shooter. Original geometry & waves — not a clone of any commercial title.
 */

export const W = 480;
export const H = 640;

const PLAYER_W = 28;
const PLAYER_H = 24;
const PLAYER_Y = H - 56;
const PLAYER_SPEED = 6.2;
const BULLET_SPEED = 11;
const FIRE_COOLDOWN = 14; // frames @60fps-ish

/**
 * @typedef {{ x: number, y: number, vx: number, vy: number, r: number, from: 'p'|'e' }} Bullet
 * @typedef {{ x: number, y: number, vx: number, vy: number, hp: number, kind: number, w: number, h: number, points: number, shootCd: number }} Enemy
 * @typedef {{ x: number, y: number, life: number, hue: number }} Particle
 */

export class StarshotGame {
  constructor() {
    this.resetAll();
  }

  resetAll() {
    this.score = 0;
    this.lives = 3;
    this.wave = 1;
    this.status = "ready"; // ready | playing | clear | over
    this.playerX = W / 2;
    this.playerY = PLAYER_Y;
    this.invuln = 0;
    this.fireCd = 0;
    this.wantFire = false;
    /** @type {Bullet[]} */
    this.bullets = [];
    /** @type {Enemy[]} */
    this.enemies = [];
    /** @type {Particle[]} */
    this.particles = [];
    /** @type {{ x: number, y: number, s: number, sp: number }[]} */
    this.stars = Array.from({ length: 48 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 0.6 + Math.random() * 1.8,
      sp: 0.4 + Math.random() * 1.6,
    }));
    this.spawnWave(this.wave);
  }

  spawnWave(wave) {
    this.enemies = [];
    const rows = Math.min(2 + Math.floor((wave - 1) / 2), 5);
    const cols = Math.min(4 + (wave % 3), 7);
    const gapX = 52;
    const gapY = 44;
    const totalW = cols * gapX;
    const startX = (W - totalW) / 2 + gapX / 2;
    const startY = 72;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Mild checker gaps on later waves
        if (wave > 2 && (r + c + wave) % 5 === 0) continue;
        const kind = (r + wave) % 3;
        const hp = wave >= 4 && kind === 2 ? 2 : 1;
        this.enemies.push({
          x: startX + c * gapX,
          y: startY + r * gapY,
          vx: (0.7 + wave * 0.08) * (c % 2 === 0 ? 1 : -1),
          vy: 0.15 + wave * 0.02,
          hp,
          kind,
          w: kind === 2 ? 30 : 24,
          h: kind === 2 ? 26 : 22,
          points: (kind + 1) * 20 * hp,
          shootCd: 40 + Math.floor(Math.random() * 90),
        });
      }
    }
  }

  start() {
    if (this.status === "over") {
      this.resetAll();
    }
    if (this.status === "clear") {
      this.wave += 1;
      this.spawnWave(this.wave);
      this.bullets = [];
    }
    this.status = "playing";
    this.wantFire = true;
    return true;
  }

  setPlayerFromCenter(cx) {
    this.playerX = Math.max(PLAYER_W / 2, Math.min(W - PLAYER_W / 2, cx));
  }

  nudgePlayer(dx) {
    this.setPlayerFromCenter(this.playerX + dx);
  }

  setFiring(on) {
    this.wantFire = on;
  }

  /**
   * @param {number} dt
   * @returns {{ events: string[] }}
   */
  update(dt) {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing") {
      this.tickStars(dt * 0.35);
      return { events };
    }

    this.tickStars(dt);
    if (this.invuln > 0) this.invuln -= dt;

    // Fire
    this.fireCd -= dt;
    if (this.wantFire && this.fireCd <= 0) {
      this.bullets.push({
        x: this.playerX,
        y: this.playerY - PLAYER_H / 2,
        vx: 0,
        vy: -BULLET_SPEED,
        r: 3.5,
        from: "p",
      });
      this.fireCd = FIRE_COOLDOWN;
      events.push("shoot");
    }

    // Move enemies (bounce sideways, slow drift down)
    for (const e of this.enemies) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < e.w / 2 + 8 || e.x > W - e.w / 2 - 8) e.vx *= -1;
      if (e.y > H * 0.55) e.vy = Math.min(e.vy, 0.05);

      e.shootCd -= dt;
      if (e.shootCd <= 0 && e.y < H * 0.62) {
        e.shootCd = 70 + Math.random() * 110 - Math.min(40, this.wave * 4);
        if (Math.random() < 0.35 + this.wave * 0.04) {
          this.bullets.push({
            x: e.x,
            y: e.y + e.h / 2,
            vx: (this.playerX - e.x) * 0.012,
            vy: 3.2 + this.wave * 0.15,
            r: 3,
            from: "e",
          });
          events.push("enemyShoot");
        }
      }
    }

    // Bullets
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this.bullets = this.bullets.filter(
      (b) => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20,
    );

    // Player bullets vs enemies
    for (const b of this.bullets) {
      if (b.from !== "p") continue;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
          e.hp -= 1;
          b.y = -999;
          if (e.hp <= 0) {
            this.score += e.points;
            this.burst(e.x, e.y, e.kind === 0 ? 190 : e.kind === 1 ? 40 : 320);
            events.push("hit");
          } else {
            events.push("chip");
          }
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    // Enemy bullets / body vs player
    if (this.invuln <= 0) {
      const px = this.playerX;
      const py = this.playerY;
      let hit = false;
      for (const b of this.bullets) {
        if (b.from !== "e") continue;
        if (Math.abs(b.x - px) < PLAYER_W * 0.35 && Math.abs(b.y - py) < PLAYER_H * 0.4) {
          b.y = H + 99;
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (const e of this.enemies) {
          if (
            Math.abs(e.x - px) < (e.w + PLAYER_W) * 0.35 &&
            Math.abs(e.y - py) < (e.h + PLAYER_H) * 0.35
          ) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        this.lives -= 1;
        this.invuln = 90;
        this.burst(px, py, 12);
        events.push("hurt");
        if (this.lives <= 0) {
          this.status = "over";
          this.wantFire = false;
          events.push("over");
        }
      }
    }

    // Particles
    for (const p of this.particles) p.life -= dt;
    this.particles = this.particles.filter((p) => p.life > 0);

    if (this.enemies.length === 0 && this.status === "playing") {
      this.status = "clear";
      this.wantFire = false;
      this.bullets = this.bullets.filter((b) => b.from === "p");
      events.push("clear");
    }

    return { events };
  }

  tickStars(dt) {
    for (const s of this.stars) {
      s.y += s.sp * dt;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    }
  }

  burst(x, y, hue) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        life: 10 + Math.random() * 14,
        hue,
      });
    }
  }

  get player() {
    return { x: this.playerX, y: this.playerY, w: PLAYER_W, h: PLAYER_H };
  }
}
