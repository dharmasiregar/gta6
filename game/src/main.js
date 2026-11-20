import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { clearSave, readSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas);
const input = createInput();
const MESSAGE_DURATION = 2.2;
let message = '';
let messageTime = 0;
let savedProfile = readSave();
let mode = 'start';
const query = new URLSearchParams(window.location.search);
const shotScene = query.get('shot');
const supportedShots = new Set(['chase', 'drive', 'mission', 'start']);
const shotSeedValue = Number(query.get('seed') ?? 1);
const shotSeed = Number.isFinite(shotSeedValue) ? Math.trunc(shotSeedValue) : 1;
const shotMode = supportedShots.has(shotScene);
let fine = 0;
let last = performance.now();

function reportSaveError(error) {
  console.error('Unable to save Sidegrid progress:', error);
  message = 'Progress could not be saved in this browser.';
  messageTime = MESSAGE_DURATION;
}

function makeWorld(profile = null) {
  return createWorld({
    profile,
    onSave(progress) {
      try {
        writeSave(progress);
        savedProfile = progress;
      } catch (error) {
        reportSaveError(error);
      }
    },
  });
}

let world = makeWorld();
if (shotMode) mode = stageShot(shotScene, shotSeed, world);

window.addEventListener('beforeunload', () => {
  if (!shotMode) world.save();
});

function frame(now) {
  requestAnimationFrame(frame);
  if (shotMode) {
    renderer.draw(world, '', false, mode, Boolean(savedProfile), fine, 0);
    return;
  }
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const startPressed = input.takeStart();
  const pausePressed = input.takePause();
  const click = input.takeClick();
  if (mode === 'start') {
    input.takeInteract();
    input.takePunch();
    const action = click ? renderer.menuAction(click.x, click.y, Boolean(savedProfile)) : '';
    if (action === 'continue') {
      world = makeWorld(savedProfile);
      mode = 'playing';
      message = 'Progress restored.';
      messageTime = MESSAGE_DURATION;
    } else if (action === 'start' || startPressed) {
      try {
        clearSave();
        savedProfile = null;
      } catch (error) {
        reportSaveError(error);
      }
      world = makeWorld();
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
    const interaction = world.step(dt, input.direction(), input.takeInteract(), input.takePunch());
    if (interaction) {
      message = interaction;
      messageTime = MESSAGE_DURATION;
      if (interaction.startsWith('Busted.')) {
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

requestAnimationFrame(frame);
