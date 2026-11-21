import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { clearSave, readSave, writeSave } from './save.js';
import { stageShot } from './shots.js';
import { createWorld } from './world.js';

const canvas = document.querySelector('#game');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('The game canvas is missing.');

const renderer = createRenderer(canvas);
const input = createInput();
const messageLifetime = 2.2;
const shotScene = new URLSearchParams(location.search).get('shot');
const validShots = new Set(['chase', 'drive', 'mission', 'start']);
const shotMode = validShots.has(shotScene);
const seedValue = Number(new URLSearchParams(location.search).get('seed') ?? 1);
const shotSeed = Number.isFinite(seedValue) ? Math.trunc(seedValue) : 1;
let savedProfile = readSave();
let mode = 'start';
let message = '';
let messageTime = 0;
let fine = 0;
let previousFrame = performance.now();

function showSaveError(error) {
  console.error('Unable to save Sidegrid progress:', error);
  message = 'Progress could not be saved in this browser.';
  messageTime = messageLifetime;
}

function newWorld(profile = null) {
  return createWorld({
    profile,
    onSave(progress) {
      try {
        writeSave(progress);
        savedProfile = progress;
      } catch (error) {
        showSaveError(error);
      }
    },
  });
}

let world = newWorld();
if (shotMode) mode = stageShot(shotScene, shotSeed, world);

window.addEventListener('beforeunload', () => {
  if (!shotMode) world.save();
});

function tick(now) {
  requestAnimationFrame(tick);
  if (shotMode) {
    renderer.draw(world, '', false, mode, Boolean(savedProfile), fine, 0);
    return;
  }

  const dt = Math.min((now - previousFrame) / 1000, 0.05);
  previousFrame = now;
  const startPressed = input.takeStart();
  const pausePressed = input.takePause();
  const click = input.takeClick();

  if (mode === 'start') {
    input.takeInteract();
    input.takePunch();
    const action = click ? renderer.menuAction(click.x, click.y, Boolean(savedProfile)) : '';
    if (action === 'continue') {
      world = newWorld(savedProfile);
      mode = 'playing';
      message = 'Progress restored.';
      messageTime = messageLifetime;
    } else if (action === 'start' || startPressed) {
      try {
        clearSave();
        savedProfile = null;
      } catch (error) {
        showSaveError(error);
      }
      world = newWorld();
      mode = 'playing';
    }
  } else if (mode === 'busted') {
    input.takeInteract();
    input.takePunch();
    if (startPressed) mode = 'playing';
  } else if (mode === 'paused') {
    input.takeInteract();
    input.takePunch();
    if (pausePressed) mode = 'playing';
  } else if (pausePressed) {
    world.save();
    mode = 'paused';
    input.takeInteract();
    input.takePunch();
  } else {
    const response = world.step(dt, input.direction(), input.takeInteract(), input.takePunch());
    if (response) {
      message = response;
      messageTime = messageLifetime;
      if (response.startsWith('Busted.')) {
        fine = world.bustFine;
        mode = 'busted';
      }
    }
    messageTime = Math.max(0, messageTime - dt);
  }

  renderer.draw(
    world,
    messageTime > 0 ? message : '',
    world.player.carIndex < 0 && world.nearestCar() >= 0,
    mode,
    Boolean(savedProfile),
    fine,
  );
}

requestAnimationFrame(tick);
