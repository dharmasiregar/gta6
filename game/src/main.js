import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createShotWorld, createWorld, stepWorld } from "./world.js";
import { loadSave, restoreProgress, saveIfCashChanged, saveProgress } from "./save.js";
import { render } from "./render.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const input = createInput();
const startScreen = document.querySelector("#start-screen");
const pauseScreen = document.querySelector("#pause-screen");
const bustedScreen = document.querySelector("#busted-screen");
const hud = document.querySelector("#hud");
const bustedCopy = document.querySelector("#fine-copy");
const ui = {
  cash: document.querySelector("#cash"),
  wanted: document.querySelector("#wanted"),
  speed: document.querySelector("#speed"),
  mission: document.querySelector("#mission-label"),
  hint: document.querySelector("#hint"),
  minimap: document.querySelector("#minimap"),
};

canvas.width = CONFIG.width;
canvas.height = CONFIG.height;
const params = new URLSearchParams(location.search);
const shot = params.get("shot");
const seed = Number(params.get("seed")) || 1;
const shotMode = ["chase", "drive", "mission", "start"].includes(shot);
let world = shotMode ? createShotWorld(shot, seed) : createWorld(seed);
let paused = false;
let lastFrame = 0;
const stored = loadSave();
if (!shotMode) restoreProgress(world, stored);

function showGame() {
  startScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  bustedScreen.classList.add("hidden");
  hud.classList.remove("hidden");
}

function startNew() {
  world = createWorld(Date.now());
  world._savedCash = world.cash;
  showGame();
}

function continueGame() {
  world = createWorld(Date.now());
  restoreProgress(world, loadSave());
  showGame();
}

function togglePause() {
  if (world.status !== "playing" || startScreen.classList.contains("hidden") === false) return;
  paused = !paused;
  pauseScreen.classList.toggle("hidden", !paused);
  if (paused) saveProgress(world);
}

document.querySelector("#start-button").addEventListener("click", startNew);
document.querySelector("#continue-button").addEventListener("click", continueGame);
document.querySelector("#busted-button").addEventListener("click", () => {
  world.status = "playing";
  world.wanted = 0;
  world.police = [];
  world.player.health = 100;
  world.cash = Math.max(0, world.cash);
  world._savedCash = world.cash;
  world.player.x = Math.min(world.width - 30, world.player.x + 115);
  showGame();
  saveProgress(world);
});
window.addEventListener("beforeunload", () => {
  if (!shotMode) saveProgress(world);
});

if (shotMode) {
  hud.classList.toggle("hidden", shot === "start");
  startScreen.classList.toggle("hidden", shot !== "start");
  world._savedCash = world.cash;
} else {
  hud.classList.add("hidden");
  startScreen.classList.remove("hidden");
}

function frame(timestamp) {
  const dt = lastFrame ? (timestamp - lastFrame) / 1000 : 0;
  lastFrame = timestamp;
  if (!shotMode && input.consume("p", "escape")) togglePause();
  if (!shotMode && !paused && world.status === "playing" && startScreen.classList.contains("hidden")) {
    stepWorld(world, input, dt);
    saveIfCashChanged(world);
  }
  if (world.status === "busted") {
    paused = false;
    pauseScreen.classList.add("hidden");
    hud.classList.add("hidden");
    bustedCopy.textContent = "You paid a $100 fine. Catch your breath, then head back out.";
    bustedScreen.classList.remove("hidden");
  } else if (world.status === "playing" && shot !== "start") {
    render(ctx, world, ui);
  } else {
    ctx.fillStyle = "#18241d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 13; i += 1) {
      ctx.fillStyle = i % 2 ? "#28372d" : "#334237";
      ctx.fillRect(i * 112 - 50, 0, 54, canvas.height);
    }
    ctx.fillStyle = "#b9ad69";
    ctx.fillRect(0, 430, canvas.width, 12);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
