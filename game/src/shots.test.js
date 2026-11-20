import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from './world.js';
import { stageShot } from './shots.js';

test('chase stage sets a fast car, four wanted stars, and two trailing police cars', () => {
  const world = createWorld();

  assert.equal(stageShot('chase', 1, world), 'playing');
  assert.ok(world.speed > 0);
  assert.equal(world.wanted, 4);
  assert.equal(world.police.length, 2);
  assert.ok(world.police.every((patrol) => patrol.x < world.player.x));
});

test('drive and mission stages show the intended player states', () => {
  const driver = createWorld();
  stageShot('drive', 2, driver);
  assert.ok(driver.player.carIndex >= 0);
  assert.ok(driver.speed > 0);

  const pedestrian = createWorld();
  stageShot('mission', 3, pedestrian);
  assert.equal(pedestrian.player.carIndex, -1);
  assert.ok(Math.hypot(
    pedestrian.player.x - pedestrian.mission.pickup.x,
    pedestrian.player.y - pedestrian.mission.pickup.y,
  ) < 50);
});

test('start stage keeps the title screen and unknown scenes are ignored', () => {
  const world = createWorld();
  assert.equal(stageShot('start', 4, world), 'start');
  assert.equal(stageShot('unknown', 4, world), '');
});
