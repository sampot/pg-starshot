import { StarshotAudio } from "./audio.js";
import { StarshotGame, W, H } from "./game.js";

const audio = new StarshotAudio();
const game = new StarshotGame();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btn-start");
const btnMute = document.getElementById("btn-mute");
const btnReset = document.getElementById("btn-reset");

canvas.width = W;
canvas.height = H;

/** @type {Set<string>} */
const keys = new Set();
let lastTs = 0;
let running = true;
let pointerDown = false;

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncHud() {
  scoreEl.textContent = String(game.score);
  livesEl.textContent = String(game.lives);
  waveEl.textContent = String(game.wave);
  if (game.status === "ready") {
    btnStart.textContent = "出擊";
    btnStart.disabled = false;
  } else if (game.status === "playing") {
    btnStart.textContent = "戰鬥中";
    btnStart.disabled = true;
  } else if (game.status === "clear") {
    btnStart.textContent = "下一波";
    btnStart.disabled = false;
  } else {
    btnStart.textContent = "再來一局";
    btnStart.disabled = false;
  }
}

function pointerToGameX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  return (clientX - rect.left) * scale;
}

function drawShip(x, y, w, h, fill, blink) {
  if (blink && Math.floor(performance.now() / 80) % 2 === 0) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.15);
  ctx.lineTo(x - w * 0.18, y + h * 0.25);
  ctx.lineTo(x + w * 0.18, y + h * 0.25);
  ctx.closePath();
  ctx.fill();
}

function drawEnemy(e) {
  const colors = [
    cssVar("--enemy-a", "#f472b6"),
    cssVar("--enemy-b", "#fbbf24"),
    cssVar("--enemy-c", "#a78bfa"),
  ];
  ctx.fillStyle = colors[e.kind % 3];
  if (e.kind === 0) {
    // Diamond
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - e.h / 2);
    ctx.lineTo(e.x + e.w / 2, e.y);
    ctx.lineTo(e.x, e.y + e.h / 2);
    ctx.lineTo(e.x - e.w / 2, e.y);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 1) {
    // Hex-ish
    const rx = e.w / 2;
    const ry = e.h / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = e.x + Math.cos(a) * rx;
      const py = e.y + Math.sin(a) * ry;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    // Rounded body + fins
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(e.x - e.w * 0.55, e.y - 3, e.w * 0.2, 6);
    ctx.fillRect(e.x + e.w * 0.35, e.y - 3, e.w * 0.2, 6);
  }
  if (e.hp > 1) {
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function draw() {
  const bg = cssVar("--board", "#070b14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (const s of game.stars) {
    ctx.globalAlpha = 0.35 + (s.s / 3) * 0.5;
    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;

  for (const e of game.enemies) drawEnemy(e);

  for (const b of game.bullets) {
    ctx.beginPath();
    ctx.fillStyle = b.from === "p" ? cssVar("--ship", "#5eead4") : "#fb7185";
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const p of game.particles) {
    ctx.globalAlpha = Math.min(1, p.life / 12);
    ctx.fillStyle = `hsl(${p.hue} 80% 60%)`;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;

  const ship = game.player;
  drawShip(
    ship.x,
    ship.y,
    ship.w,
    ship.h,
    cssVar("--ship", "#5eead4"),
    game.invuln > 0,
  );

  if (game.status === "ready") {
    banner("移動自機 · 出擊開始掃射");
  } else if (game.status === "clear") {
    banner(`第 ${game.wave} 波清除！`);
  } else if (game.status === "over") {
    banner("任務結束");
  }
}

function banner(msg) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(36, H / 2 - 28, W - 72, 56);
  ctx.fillStyle = cssVar("--neon", "#fbbf24");
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(msg, W / 2, H / 2);
}

function handleEvents(events) {
  for (const e of events) {
    if (e === "shoot") audio.shoot();
    else if (e === "hit") audio.hit();
    else if (e === "chip") audio.chip();
    else if (e === "hurt") {
      audio.hurt();
      setStatus(`被擊中 · 剩 ${game.lives} 條命`, "warn");
    } else if (e === "clear") {
      audio.waveClear();
      setStatus(`波次清除！分數 ${game.score}`, "win");
    } else if (e === "over") {
      audio.gameOver();
      setStatus(`結束 · 分數 ${game.score}`, "lose");
    }
  }
}

function frame(ts) {
  if (!running) return;
  const dt = Math.min(2, (ts - lastTs) / (1000 / 60) || 1);
  lastTs = ts;

  if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
    game.nudgePlayer(-PLAYER_STEP * dt);
  }
  if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
    game.nudgePlayer(PLAYER_STEP * dt);
  }

  const firing =
    game.status === "playing" &&
    (game.wantFire || keys.has(" ") || pointerDown);
  game.setFiring(firing);

  const { events } = game.update(dt);
  if (events.length) handleEvents(events);

  draw();
  syncHud();
  requestAnimationFrame(frame);
}

const PLAYER_STEP = 6.2;

async function tryStart() {
  await audio.unlock();
  if (game.status === "playing") return;
  game.start();
  audio.startBeep();
  setStatus(`第 ${game.wave} 波 · 掃清星屑！`);
  syncHud();
}

btnStart.addEventListener("click", () => {
  void tryStart();
});

btnReset.addEventListener("click", async () => {
  await audio.unlock();
  game.resetAll();
  setStatus("已重來 · 出擊開始");
  syncHud();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  audio.setEnabled(!audio.enabled);
  btnMute.textContent = audio.enabled ? "音效開" : "音效關";
  btnMute.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
});

canvas.addEventListener("pointermove", (e) => {
  game.setPlayerFromCenter(pointerToGameX(e.clientX));
});

canvas.addEventListener("pointerdown", (e) => {
  pointerDown = true;
  canvas.setPointerCapture?.(e.pointerId);
  game.setPlayerFromCenter(pointerToGameX(e.clientX));
  if (game.status !== "playing") void tryStart();
});

canvas.addEventListener("pointerup", () => {
  pointerDown = false;
});

canvas.addEventListener("pointercancel", () => {
  pointerDown = false;
});

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if (game.status !== "playing") void tryStart();
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

document.body.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => draw());

setStatus("移動自機 · 出擊開始掃射");
syncHud();
requestAnimationFrame((ts) => {
  lastTs = ts;
  requestAnimationFrame(frame);
});
