import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from './world.js';
import { stageShot } from './shots.js';

test('chase scene stages a fast driver, four stars, and two trailing police', () => {
  const world = createWorld();
  assert.equal(stageShot('chase', 1, world), 'playing');
  assert.ok(world.speed > 0);
  assert.equal(world.wanted, 4);
  assert.equal(world.police.length, 2);
  assert.ok(world.police.every((car) => car.x < world.player.x));
  assert.ok(world.mission.pickup.x > world.player.x);
});

test('drive and mission scenes stage the expected player and marker', () => {
  const driver = createWorld();
  assert.equal(stageShot('drive', 1, driver), 'playing');
  assert.ok(driver.player.carIndex >= 0);
  assert.ok(driver.speed > 0);
  assert.equal(driver.traffic.length, 16);
  assert.equal(driver.pedestrians.length, 48);

  const pedestrian = createWorld();
  assert.equal(stageShot('mission', 1, pedestrian), 'playing');
  assert.equal(pedestrian.player.carIndex, -1);
  assert.ok(Math.hypot(
    pedestrian.player.x - pedestrian.mission.pickup.x,
    pedestrian.player.y - pedestrian.mission.pickup.y,
  ) < 50);
});

test('scene positions are seeded and start/unknown requests stay safe', () => {
  const first = createWorld();
  const second = createWorld();
  stageShot('drive', 17, first);
  stageShot('drive', 17, second);
  assert.deepEqual(first.player, second.player);

  const start = createWorld();
  assert.equal(stageShot('start', 1, start), 'start');
  const before = { ...start.player };
  assert.equal(stageShot('not-a-scene', 1, start), '');
  assert.deepEqual(start.player, before);
});
