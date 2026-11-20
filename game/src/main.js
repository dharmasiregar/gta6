import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';

const canvas = document.getElementById('game');
const world = createWorld();
const renderer = createRenderer(canvas);
const input = createInput();
const MESSAGE_DURATION = 2.2;
let message = '';
let messageTime = 0;
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const interaction = world.step(dt, input.direction(), input.takeInteract());
  if (interaction) {
    message = interaction;
    messageTime = MESSAGE_DURATION;
  }
  messageTime = Math.max(0, messageTime - dt);
  renderer.draw(world, messageTime > 0 ? message : '', world.player.carIndex < 0 && world.nearestCar() >= 0);
}

requestAnimationFrame(frame);
