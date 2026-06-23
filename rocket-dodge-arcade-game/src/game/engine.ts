import { playExplosion, playCombo, playStart, playBoom } from './audio';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface Vec2 { x: number; y: number }

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  type: 'thrust' | 'explosion' | 'star' | 'trail';
}

export interface Asteroid {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  vertices: number[];
  hit: boolean;
}

export interface Star {
  x: number; y: number;
  size: number;
  speed: number;
  brightness: number;
}

export interface Rocket {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number;
  width: number;
  height: number;
  invincible: number;
  tilt: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export interface HighScore {
  score: number;
  date: string;
}

export interface GameData {
  state: GameState;
  rocket: Rocket;
  asteroids: Asteroid[];
  particles: Particle[];
  stars: Star[];
  score: number;
  highScores: HighScore[];
  screenShake: { x: number; y: number; intensity: number };
  difficulty: number;
  spawnTimer: number;
  width: number;
  height: number;
  combo: number;
  comboTimer: number;
  scorePopups: ScorePopup[];
  time: number;
  gameOverTime: number;
}

export interface ScorePopup {
  x: number; y: number;
  text: string;
  life: number;
  maxLife: number;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  pause: boolean;
  restart: boolean;
  start: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ROCKET_ACCEL = 1800;
const ROCKET_FRICTION = 0.92;
const ROCKET_MAX_SPEED = 600;
const ASTEROID_MIN_RADIUS = 15;
const ASTEROID_MAX_RADIUS = 50;
const BASE_SPAWN_INTERVAL = 1.2;
const MIN_SPAWN_INTERVAL = 0.25;
const INVINCIBLE_TIME = 1.5;
const STAR_COUNT = 120;
const SCORE_PER_SECOND = 10;
const HS_KEY = 'asteroid-dodger-hs';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function dist(a: Vec2, b: Vec2) { return Math.hypot(a.x - b.x, a.y - b.y); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function makeAsteroidVertices(count: number): number[] {
  const verts: number[] = [];
  for (let i = 0; i < count; i++) {
    verts.push(rand(0.7, 1.3));
  }
  return verts;
}

// ─── Init ────────────────────────────────────────────────────────────────────
export function loadHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(HS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return [];
}

function saveHighScores(scores: HighScore[]) {
  try {
    localStorage.setItem(HS_KEY, JSON.stringify(scores));
  } catch { /* noop */ }
}

export function initStars(w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: rand(0, w),
      y: rand(0, h),
      size: rand(0.5, 2.5),
      speed: rand(20, 80),
      brightness: rand(0.3, 1),
    });
  }
  return stars;
}

export function createGame(w: number, h: number): GameData {
  return {
    state: 'menu',
    rocket: {
      x: w / 2, y: h * 0.7,
      vx: 0, vy: 0,
      rotation: 0,
      width: 24, height: 40,
      invincible: INVINCIBLE_TIME,
      tilt: 0,
    },
    asteroids: [],
    particles: [],
    stars: initStars(w, h),
    score: 0,
    highScores: loadHighScores(),
    screenShake: { x: 0, y: 0, intensity: 0 },
    difficulty: 0,
    spawnTimer: 0,
    width: w,
    height: h,
    combo: 0,
    comboTimer: 0,
    scorePopups: [],
    time: 0,
    gameOverTime: 0,
  };
}

export function resetGame(g: GameData) {
  g.state = 'playing';
  g.rocket = {
    x: g.width / 2, y: g.height * 0.7,
    vx: 0, vy: 0,
    rotation: 0,
    width: 24, height: 40,
    invincible: INVINCIBLE_TIME,
    tilt: 0,
  };
  g.asteroids = [];
  g.particles = [];
  g.score = 0;
  g.screenShake = { x: 0, y: 0, intensity: 0 };
  g.difficulty = 0;
  g.spawnTimer = 0;
  g.combo = 0;
  g.comboTimer = 0;
  g.scorePopups = [];
  g.time = 0;
  g.gameOverTime = 0;
}

// ─── Spawn ───────────────────────────────────────────────────────────────────
function spawnAsteroid(g: GameData) {
  const side = Math.floor(rand(0, 4));
  let x = 0, y = 0, vx = 0, vy = 0;
  const speed = rand(80, 200) + g.difficulty * 15;
  const radius = rand(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS);

  switch (side) {
    case 0: // top
      x = rand(0, g.width); y = -radius;
      vx = rand(-80, 80); vy = speed;
      break;
    case 1: // right
      x = g.width + radius; y = rand(0, g.height);
      vx = -speed; vy = rand(-80, 80);
      break;
    case 2: // bottom
      x = rand(0, g.width); y = g.height + radius;
      vx = rand(-80, 80); vy = -speed;
      break;
    case 3: // left
      x = -radius; y = rand(0, g.height);
      vx = speed; vy = rand(-80, 80);
      break;
  }

  // Bias toward player
  const toPlayer = { x: g.rocket.x - x, y: g.rocket.y - y };
  const mag = Math.hypot(toPlayer.x, toPlayer.y) || 1;
  vx += (toPlayer.x / mag) * speed * 0.3;
  vy += (toPlayer.y / mag) * speed * 0.3;

  g.asteroids.push({
    x, y, vx, vy, radius,
    rotation: rand(0, Math.PI * 2),
    rotSpeed: rand(-2, 2),
    vertices: makeAsteroidVertices(Math.floor(rand(7, 12))),
    hit: false,
  });
}

// ─── Particles ───────────────────────────────────────────────────────────────
function emitThrust(g: GameData, r: Rocket) {
  const angle = -Math.PI / 2 + r.tilt * 0.3;
  const backX = r.x - Math.cos(angle) * r.height * 0.4;
  const backY = r.y - Math.sin(angle) * r.height * 0.4;

  for (let i = 0; i < 2; i++) {
    g.particles.push({
      x: backX + rand(-4, 4),
      y: backY + rand(-2, 2),
      vx: -Math.cos(angle) * rand(60, 180) + rand(-30, 30),
      vy: -Math.sin(angle) * rand(60, 180) + rand(-30, 30),
      life: rand(0.2, 0.5),
      maxLife: 0.5,
      size: rand(2, 5),
      color: Math.random() > 0.5 ? '#ff6b35' : '#ffd23f',
      type: 'thrust',
    });
  }
}

function emitExplosion(g: GameData, x: number, y: number, count: number, color1: string, color2: string) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(50, 350);
    g.particles.push({
      x: x + rand(-5, 5),
      y: y + rand(-5, 5),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.3, 1.0),
      maxLife: 1.0,
      size: rand(2, 7),
      color: Math.random() > 0.5 ? color1 : color2,
      type: 'explosion',
    });
  }
}

function emitTrail(g: GameData, r: Rocket) {
  if (Math.random() > 0.3) return;
  g.particles.push({
    x: r.x + rand(-3, 3),
    y: r.y + rand(-3, 3),
    vx: rand(-10, 10),
    vy: rand(10, 40),
    life: rand(0.3, 0.8),
    maxLife: 0.8,
    size: rand(1, 3),
    color: '#4fc3f7',
    type: 'trail',
  });
}

// ─── Update ──────────────────────────────────────────────────────────────────
export function update(g: GameData, dt: number, input: InputState) {
  if (g.state === 'menu') {
    g.time += dt;
    updateStars(g, dt);
    updateMenuAsteroids(g, dt);
    if (input.start) {
      playStart();
      resetGame(g);
    }
    return;
  }

  if (g.state === 'gameover') {
    g.time += dt;
    g.gameOverTime += dt;
    updateParticles(g, dt);
    updateStars(g, dt);
    if (input.restart || input.start) {
      playStart();
      resetGame(g);
    }
    return;
  }

  if (input.pause && g.state === 'playing') {
    g.state = 'paused';
    return;
  }
  if (input.pause && g.state === 'paused') {
    g.state = 'playing';
    return;
  }
  if (g.state === 'paused') {
    if (input.start) g.state = 'playing';
    return;
  }

  g.time += dt;
  g.difficulty = Math.min(g.time / 8, 30);

  // ── Rocket input ──
  const r = g.rocket;
  let ax = 0, ay = 0;

  if (input.left) ax -= ROCKET_ACCEL;
  if (input.right) ax += ROCKET_ACCEL;
  if (input.up) ay -= ROCKET_ACCEL;
  if (input.down) ay += ROCKET_ACCEL;

  const moving = ax !== 0 || ay !== 0;

  r.vx += ax * dt;
  r.vy += ay * dt;
  r.vx *= ROCKET_FRICTION;
  r.vy *= ROCKET_FRICTION;

  const speed = Math.hypot(r.vx, r.vy);
  if (speed > ROCKET_MAX_SPEED) {
    r.vx = (r.vx / speed) * ROCKET_MAX_SPEED;
    r.vy = (r.vy / speed) * ROCKET_MAX_SPEED;
  }

  r.x += r.vx * dt;
  r.y += r.vy * dt;

  // Clamp to screen
  const margin = 10;
  r.x = clamp(r.x, margin, g.width - margin);
  r.y = clamp(r.y, margin, g.height - margin);

  // Tilt
  const targetTilt = clamp(r.vx / ROCKET_MAX_SPEED * 0.6, -0.6, 0.6);
  r.tilt = lerp(r.tilt, targetTilt, 1 - Math.pow(0.001, dt));

  // Invincibility
  if (r.invincible > 0) r.invincible -= dt;

  // Thrust particles + boom sound
  if (moving) {
    emitThrust(g, r);
    playBoom();
  }
  emitTrail(g, r);

  // ── Score ──
  g.score += SCORE_PER_SECOND * dt * (1 + g.difficulty * 0.1);

  // Combo timer
  if (g.comboTimer > 0) {
    g.comboTimer -= dt;
    if (g.comboTimer <= 0) g.combo = 0;
  }

  // ── Spawn asteroids ──
  const interval = Math.max(MIN_SPAWN_INTERVAL, BASE_SPAWN_INTERVAL - g.difficulty * 0.04);
  g.spawnTimer -= dt;
  if (g.spawnTimer <= 0) {
    g.spawnTimer = interval;
    const count = 1 + Math.floor(g.difficulty / 8);
    for (let i = 0; i < count; i++) spawnAsteroid(g);
  }

  // ── Update asteroids ──
  for (let i = g.asteroids.length - 1; i >= 0; i--) {
    const a = g.asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rotation += a.rotSpeed * dt;

    // Remove off-screen
    const margin2 = a.radius + 100;
    if (a.x < -margin2 || a.x > g.width + margin2 ||
        a.y < -margin2 || a.y > g.height + margin2) {
      // Dodged! Increment combo
      if (!a.hit) {
        g.combo++;
        g.comboTimer = 3;
        if (g.combo > 1 && g.combo % 5 === 0) {
          const bonus = g.combo * 10;
          g.score += bonus;
          playCombo();
          g.scorePopups.push({
            x: g.width / 2, y: g.height * 0.3,
            text: `COMBO x${g.combo}! +${bonus}`,
            life: 1.5, maxLife: 1.5,
          });
        }
      }
      g.asteroids.splice(i, 1);
      continue;
    }

    // Collision with rocket
    if (r.invincible <= 0 && !a.hit) {
      const d = dist(r, a);
      const hitRadius = a.radius * 0.7 + Math.min(r.width, r.height) * 0.3;
      if (d < hitRadius) {
        // Game over!
        a.hit = true;
        g.screenShake.intensity = 20;
        playExplosion();
        emitExplosion(g, r.x, r.y, 60, '#ff6b35', '#ffd23f');
        emitExplosion(g, r.x, r.y, 30, '#4fc3f7', '#81d4fa');

        const finalScore = Math.floor(g.score);
        const hs = loadHighScores();
        hs.push({ score: finalScore, date: new Date().toLocaleDateString() });
        hs.sort((a2, b) => b.score - a2.score);
        const top = hs.slice(0, 10);
        saveHighScores(top);
        g.highScores = top;

        g.state = 'gameover';
        g.gameOverTime = 0;
        return;
      }
    }
  }

  // ── Near-miss detection ──
  for (const a of g.asteroids) {
    if (a.hit) continue;
    const d = dist(r, a);
    const nearDist = a.radius + 30;
    if (d < nearDist && d > a.radius * 0.7 + 10) {
      // Near miss bonus
      if (Math.random() < 0.02) {
        const bonus = Math.floor(5 + g.difficulty);
        g.score += bonus;
        g.scorePopups.push({
          x: r.x + rand(-20, 20), y: r.y - 30,
          text: `+${bonus}`,
          life: 0.8, maxLife: 0.8,
        });
      }
    }
  }

  // ── Particles ──
  updateParticles(g, dt);

  // ── Stars ──
  updateStars(g, dt);

  // ── Screen shake ──
  if (g.screenShake.intensity > 0) {
    g.screenShake.x = rand(-1, 1) * g.screenShake.intensity;
    g.screenShake.y = rand(-1, 1) * g.screenShake.intensity;
    g.screenShake.intensity *= Math.pow(0.01, dt);
    if (g.screenShake.intensity < 0.5) g.screenShake.intensity = 0;
  }

  // ── Score popups ──
  for (let i = g.scorePopups.length - 1; i >= 0; i--) {
    g.scorePopups[i].life -= dt;
    g.scorePopups[i].y -= 40 * dt;
    if (g.scorePopups[i].life <= 0) g.scorePopups.splice(i, 1);
  }
}

function updateParticles(g: GameData, dt: number) {
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const p = g.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.type === 'explosion') {
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    if (p.life <= 0) g.particles.splice(i, 1);
  }
}

function updateStars(g: GameData, dt: number) {
  for (const s of g.stars) {
    s.y += s.speed * dt;
    if (s.y > g.height + 5) {
      s.y = -5;
      s.x = rand(0, g.width);
    }
  }
}

function updateMenuAsteroids(g: GameData, dt: number) {
  // Spawn occasional asteroids for background effect
  if (Math.random() < dt * 0.8) {
    spawnAsteroid(g);
  }
  for (let i = g.asteroids.length - 1; i >= 0; i--) {
    const a = g.asteroids[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rotation += a.rotSpeed * dt;
    const m = a.radius + 100;
    if (a.x < -m || a.x > g.width + m || a.y < -m || a.y > g.height + m) {
      g.asteroids.splice(i, 1);
    }
  }
}

// ─── Render ──────────────────────────────────────────────────────────────────
export function render(ctx: CanvasRenderingContext2D, g: GameData) {
  const { width: W, height: H } = g;

  ctx.save();

  // Screen shake
  if (g.screenShake.intensity > 0) {
    ctx.translate(g.screenShake.x, g.screenShake.y);
  }

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#0a0a1a');
  gradient.addColorStop(0.5, '#0d1033');
  gradient.addColorStop(1, '#1a0a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(-10, -10, W + 20, H + 20);

  // Stars
  for (const s of g.stars) {
    ctx.globalAlpha = s.brightness * (0.5 + 0.5 * Math.sin(g.time * 2 + s.x));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Particles
  for (const p of g.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;

    if (p.type === 'explosion') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + (1 - alpha) * 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === 'thrust') {
      const s = p.size * alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Asteroids
  for (const a of g.asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);

    // Glow
    const glowGrad = ctx.createRadialGradient(0, 0, a.radius * 0.3, 0, 0, a.radius * 1.5);
    glowGrad.addColorStop(0, 'rgba(255,107,53,0.1)');
    glowGrad.addColorStop(1, 'rgba(255,107,53,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, a.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    for (let i = 0; i < a.vertices.length; i++) {
      const angle = (i / a.vertices.length) * Math.PI * 2;
      const r2 = a.radius * a.vertices[i];
      const px = Math.cos(angle) * r2;
      const py = Math.sin(angle) * r2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const asteroidGrad = ctx.createRadialGradient(-a.radius * 0.3, -a.radius * 0.3, 0, 0, 0, a.radius);
    asteroidGrad.addColorStop(0, '#8b7355');
    asteroidGrad.addColorStop(0.5, '#6b5344');
    asteroidGrad.addColorStop(1, '#3d2b1f');
    ctx.fillStyle = asteroidGrad;
    ctx.fill();

    ctx.strokeStyle = '#a08060';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Craters
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(a.radius * 0.2, -a.radius * 0.1, a.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-a.radius * 0.3, a.radius * 0.25, a.radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Rocket
  if (g.state === 'playing' || g.state === 'paused') {
    const r = g.rocket;
    const blink = r.invincible > 0 && Math.sin(r.invincible * 15) > 0;

    if (!blink) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.tilt);

      // Engine glow
      const speed2 = Math.hypot(r.vx, r.vy);
      if (speed2 > 30) {
        const glowSize = 10 + (speed2 / ROCKET_MAX_SPEED) * 20;
        const glow = ctx.createRadialGradient(0, r.height * 0.35, 0, 0, r.height * 0.35, glowSize);
        glow.addColorStop(0, 'rgba(255,210,63,0.8)');
        glow.addColorStop(0.5, 'rgba(255,107,53,0.3)');
        glow.addColorStop(1, 'rgba(255,107,53,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, r.height * 0.35, glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Body
      drawRocket(ctx, r.width, r.height);

      ctx.restore();
    }
  }

  // Score popups
  for (const sp of g.scorePopups) {
    const alpha = clamp(sp.life / sp.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd23f';
    ctx.font = `bold ${14 + (1 - alpha) * 4}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(sp.text, sp.x, sp.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // ── Vignette ──
  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  // ── HUD ──
  if (g.state === 'playing') {
    drawHUD(ctx, g);
  }

  // ── Overlays ──
  if (g.state === 'menu') {
    drawMenuOverlay(ctx, g);
  } else if (g.state === 'paused') {
    drawPauseOverlay(ctx, g);
  } else if (g.state === 'gameover') {
    drawGameOverOverlay(ctx, g);
  }
}

function drawRocket(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Rocket body
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.bezierCurveTo(w * 0.6, -h * 0.25, w * 0.5, h * 0.2, w * 0.35, h / 2);
  ctx.lineTo(-w * 0.35, h / 2);
  ctx.bezierCurveTo(-w * 0.5, h * 0.2, -w * 0.6, -h * 0.25, 0, -h / 2);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  bodyGrad.addColorStop(0, '#c0c8d8');
  bodyGrad.addColorStop(0.3, '#e8ecf2');
  bodyGrad.addColorStop(0.5, '#ffffff');
  bodyGrad.addColorStop(0.7, '#e8ecf2');
  bodyGrad.addColorStop(1, '#a0a8b8');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.strokeStyle = '#8090a0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Nose cone
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.bezierCurveTo(w * 0.3, -h * 0.35, w * 0.4, -h * 0.15, w * 0.35, -h * 0.05);
  ctx.lineTo(-w * 0.35, -h * 0.05);
  ctx.bezierCurveTo(-w * 0.4, -h * 0.15, -w * 0.3, -h * 0.35, 0, -h / 2);
  ctx.closePath();
  ctx.fillStyle = '#ff4444';
  ctx.fill();

  // Window
  ctx.beginPath();
  ctx.arc(0, -h * 0.08, w * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#4fc3f7';
  ctx.fill();
  ctx.strokeStyle = '#b0b8c8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Window highlight
  ctx.beginPath();
  ctx.arc(-w * 0.05, -h * 0.12, w * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();

  // Fins
  ctx.fillStyle = '#ff4444';
  // Left fin
  ctx.beginPath();
  ctx.moveTo(-w * 0.35, h * 0.25);
  ctx.lineTo(-w * 0.7, h * 0.55);
  ctx.lineTo(-w * 0.3, h * 0.5);
  ctx.closePath();
  ctx.fill();
  // Right fin
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h * 0.25);
  ctx.lineTo(w * 0.7, h * 0.55);
  ctx.lineTo(w * 0.3, h * 0.5);
  ctx.closePath();
  ctx.fill();
}

function drawHUD(ctx: CanvasRenderingContext2D, g: GameData) {
  const score = Math.floor(g.score);

  // Score
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, 10, 10, 160, 40, 12);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`⭐ ${score.toLocaleString()}`, 22, 31);

  // Combo
  if (g.combo > 1) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`COMBO x${g.combo}`, 22, 60);
  }

  // Pause hint
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ESC to pause', g.width - 65, 37);

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawMenuOverlay(ctx: CanvasRenderingContext2D, g: GameData) {
  const W = g.width, H = g.height;

  // Dim
  ctx.fillStyle = 'rgba(5, 5, 20, 0.6)';
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Glow effect
  ctx.shadowColor = '#4fc3f7';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(48, W * 0.09)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('🚀 ASTEROID DODGER', W / 2, H * 0.25);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#b0b8d0';
  ctx.font = `${Math.min(18, W * 0.04)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('Dodge asteroids. Survive. Set records.', W / 2, H * 0.33);

  // Controls
  ctx.fillStyle = '#8090a0';
  ctx.font = `${Math.min(14, W * 0.032)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('🎮  Arrow Keys / WASD / Tap the ▲▼◀▶ buttons', W / 2, H * 0.42);
  ctx.fillText('⏸  ESC to pause  |  Tap ⏸ button', W / 2, H * 0.47);

  // Play button
  const btnW = Math.min(220, W * 0.5);
  const btnH = 56;
  const btnX = W / 2 - btnW / 2;
  const btnY = H * 0.55;

  const pulse = 1 + Math.sin(g.time * 3) * 0.02;
  ctx.save();
  ctx.translate(W / 2, btnY + btnH / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-W / 2, -(btnY + btnH / 2));

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#4fc3f7');
  btnGrad.addColorStop(1, '#0288d1');
  ctx.fillStyle = btnGrad;
  roundRect(ctx, btnX, btnY, btnW, btnH, 28);
  ctx.fill();

  ctx.shadowColor = '#4fc3f7';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(22, W * 0.045)}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('▶  START GAME', W / 2, btnY + btnH / 2 + 1);

  ctx.restore();

  // High scores
  if (g.highScores.length > 0) {
    const startY = H * 0.68;
    ctx.fillStyle = '#ffd23f';
    ctx.font = `bold ${Math.min(16, W * 0.035)}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🏆 HIGH SCORES', W / 2, startY);

    ctx.fillStyle = '#b0b8d0';
    ctx.font = `${Math.min(14, W * 0.03)}px "Segoe UI", system-ui, sans-serif`;
    const count = Math.min(5, g.highScores.length);
    for (let i = 0; i < count; i++) {
      const hs = g.highScores[i];
      ctx.fillText(`${i + 1}. ${hs.score.toLocaleString()}  —  ${hs.date}`, W / 2, startY + 24 + i * 22);
    }
  }

  ctx.restore();
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, g: GameData) {
  const W = g.width, H = g.height;

  ctx.fillStyle = 'rgba(5, 5, 20, 0.7)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(42, W * 0.08)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('⏸ PAUSED', W / 2, H * 0.4);

  ctx.fillStyle = '#b0b8d0';
  ctx.font = `${Math.min(18, W * 0.04)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText(`Score: ${Math.floor(g.score).toLocaleString()}`, W / 2, H * 0.48);

  ctx.fillStyle = '#8090a0';
  ctx.font = `${Math.min(14, W * 0.032)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('Press ESC or tap to resume', W / 2, H * 0.56);
}

function drawGameOverOverlay(ctx: CanvasRenderingContext2D, g: GameData) {
  const W = g.width, H = g.height;

  ctx.fillStyle = 'rgba(15, 5, 5, 0.75)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.shadowColor = '#ff4444';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff4444';
  ctx.font = `bold ${Math.min(48, W * 0.09)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('💥 GAME OVER', W / 2, H * 0.25);
  ctx.shadowBlur = 0;

  // Final score
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(32, W * 0.06)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText(`Score: ${Math.floor(g.score).toLocaleString()}`, W / 2, H * 0.35);

  // Best score — animated growing text
  const bestScore = g.highScores.length > 0 ? g.highScores[0].score : 0;
  const isNewHS = Math.floor(g.score) >= bestScore && bestScore > 0;
  const t = Math.min(g.gameOverTime / 0.8, 1); // 0→1 over 0.8 seconds
  const easedT = 1 - Math.pow(1 - t, 3); // ease-out cubic

  if (isNewHS) {
    // Grows from small to big with glow
    const size = Math.min(28, W * 0.055) * easedT;
    const glowPulse = 15 + Math.sin(g.gameOverTime * 5) * 10;
    ctx.shadowColor = '#ffd23f';
    ctx.shadowBlur = glowPulse * easedT;
    ctx.fillStyle = '#ffd23f';
    ctx.font = `bold ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText('🎉 NEW HIGH SCORE! 🎉', W / 2, H * 0.42);
    ctx.shadowBlur = 0;
  } else if (bestScore > 0) {
    // Grows from small to final size
    const size = Math.min(20, W * 0.042) * easedT;
    const glowPulse = 8 + Math.sin(g.gameOverTime * 3) * 5;
    ctx.shadowColor = '#4fc3f7';
    ctx.shadowBlur = glowPulse * easedT;
    ctx.fillStyle = '#4fc3f7';
    ctx.font = `bold ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillText(`🏆 Best: ${bestScore.toLocaleString()}`, W / 2, H * 0.42);
    ctx.shadowBlur = 0;
  }

  // Restart button
  const btnW = Math.min(220, W * 0.5);
  const btnH = 50;
  const btnX = W / 2 - btnW / 2;
  const btnY = H * 0.50;

  const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  btnGrad.addColorStop(0, '#ff6b35');
  btnGrad.addColorStop(1, '#d84315');
  ctx.fillStyle = btnGrad;
  roundRect(ctx, btnX, btnY, btnW, btnH, 25);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.min(20, W * 0.04)}px "Segoe UI", system-ui, sans-serif`;
  ctx.fillText('🔄  PLAY AGAIN', W / 2, btnY + btnH / 2 + 1);

  ctx.restore();
}
