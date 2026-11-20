import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from './world.js';

test('the city creates sidewalk pedestrians and lane traffic', () => {
  const world = createWorld();
  assert.equal(world.cars.length, 32);
  assert.equal(world.traffic.length, 16);
  assert.equal(world.pedestrians.length, 48);
  world.step(0.1, { x: 0, y: 0 }, false);
  assert.ok(world.traffic.some((car) => car.speed > 0));
});

test('a witnessed car theft raises wanted level and brings police', () => {
  const world = createWorld();
  const car = world.cars[0];
  world.player.x = car.x;
  world.player.y = car.y;
  world.pedestrians[0].x = car.x + 100;
  world.pedestrians[0].y = car.y;

  const message = world.step(0, { x: 0, y: 0 }, true);
  assert.match(message, /theft witnessed/i);
  assert.equal(world.wanted, 1);
  assert.ok(world.police.length > 0);
});

test('hitting a pedestrian raises wanted level', () => {
  const world = createWorld();
  const car = world.cars[0];
  world.player.carIndex = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  car.speed = 80;
  world.pedestrians[0].x = car.x + 10;
  world.pedestrians[0].y = car.y;

  const message = world.step(0.01, { x: 0, y: 0 }, false);
  assert.match(message, /pedestrian hit/i);
  assert.equal(world.wanted, 1);
  assert.equal(world.pedestrians[0].down, true);
});

test('a nearby fast car makes pedestrians flee', () => {
  const world = createWorld();
  const car = world.traffic[0];
  const pedestrian = world.pedestrians[0];
  car.speed = 100;
  pedestrian.x = car.x + 100;
  pedestrian.y = car.y;
  const before = { x: pedestrian.x, y: pedestrian.y };

  world.step(0.1, { x: 0, y: 0 }, false);
  assert.ok(Math.hypot(pedestrian.x - before.x, pedestrian.y - before.y) > 0);
  assert.ok(pedestrian.fleeTime > 0);
});

test('punching a pedestrian pays cash, starts a flee, and raises wanted', () => {
  const world = createWorld();
  const pedestrian = world.pedestrians[0];
  world.player.x = pedestrian.x - 1;
  world.player.y = pedestrian.y;
  const cash = world.cash;

  assert.match(world.step(0, { x: 0, y: 0 }, false, true), /punched/i);
  assert.equal(world.cash, cash + 25);
  assert.equal(world.wanted, 1);
  assert.ok(pedestrian.fleeTime > 0);
  assert.equal(pedestrian.robbed, true);
});

test('a stopped traffic car can be stolen and alerts nearby police', () => {
  const world = createWorld();
  const car = world.traffic[0];
  car.speed = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  world.police.push({ x: car.x + 100, y: car.y, angle: 0, speed: 0, color: 0, siren: 0 });

  assert.match(world.step(0, { x: 0, y: 0 }, true), /stolen near police/i);
  assert.equal(world.player.carIndex, world.cars.length - 1);
  assert.equal(world.traffic.includes(car), false);
  assert.equal(world.wanted, 1);
  assert.ok(world.pedestrians.at(-1).fleeTime > 0);
});

test('traffic slows for the player and delivery missions pay out', () => {
  const world = createWorld();
  const traffic = world.traffic[0];
  const car = world.cars[0];
  world.player.x = traffic.x + traffic.direction * 30;
  world.player.y = traffic.y;
  const speed = traffic.speed;
  world.step(0.1, { x: 0, y: 0 }, false);
  assert.ok(traffic.speed < speed);

  world.player.carIndex = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  world.mission.pickup = { x: car.x, y: car.y };
  assert.match(world.step(0, { x: 0, y: 0 }, false), /package collected/i);
  assert.equal(world.mission.phase, 'delivery');

  world.mission.delivery = { x: car.x, y: car.y };
  const cash = world.cash;
  assert.match(world.step(0, { x: 0, y: 0 }, false), /package delivered/i);
  assert.equal(world.cash, cash + world.mission.reward);
  assert.equal(world.mission.phase, 'pickup');
});

test('passenger pickup pays a fare, counts completion, and autosaves', () => {
  let saved;
  const world = createWorld({ onSave: (progress) => { saved = progress; } });
  const car = world.cars[0];
  world.player.carIndex = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  world.mission.type = 'passenger';
  world.mission.pickup = { x: car.x, y: car.y };
  world.mission.destination = { x: car.x, y: car.y };

  assert.match(world.step(0, { x: 0, y: 0 }, false), /passenger aboard/i);
  assert.equal(world.mission.phase, 'destination');
  const cash = world.cash;
  assert.match(world.step(0, { x: 0, y: 0 }, false), /fare: \$350/i);
  assert.equal(world.cash, cash + 350);
  assert.equal(world.completedMissions, 1);
  assert.equal(saved.completedMissions, 1);
  assert.equal(saved.cash, world.cash);
});

test('a saved profile restores cash, position, and mission count', () => {
  const world = createWorld({
    profile: { cash: 875, x: 220, y: 310, completedMissions: 4 },
  });
  assert.equal(world.cash, 875);
  assert.deepEqual({ x: world.player.x, y: world.player.y }, { x: 220, y: 310 });
  assert.equal(world.completedMissions, 4);
});

test('wanted level decays after time out of trouble', () => {
  const world = createWorld();
  const car = world.cars[0];
  world.player.x = car.x;
  world.player.y = car.y;
  world.pedestrians[0].x = car.x + 100;
  world.pedestrians[0].y = car.y;
  world.step(0, { x: 0, y: 0 }, true);
  world.police[0].x = -10000;
  world.police[0].y = -10000;

  for (let index = 0; index < 660; index += 1) world.step(0.05, { x: 0, y: 0 }, false);
  assert.equal(world.wanted, 0);
});

test('police bust a pinned driver and apply a fine at the station', () => {
  let saved;
  const world = createWorld({ onSave: (progress) => { saved = progress; } });
  const car = world.cars[0];
  world.player.x = car.x;
  world.player.y = car.y;
  world.pedestrians[0].x = car.x + 100;
  world.pedestrians[0].y = car.y;
  world.step(0, { x: 0, y: 0 }, true);
  world.police[0].x = car.x + 10;
  world.police[0].y = car.y;
  const cash = world.cash;

  assert.match(world.step(0, { x: 0, y: 0 }, false), /busted/i);
  assert.equal(world.player.carIndex, -1);
  assert.deepEqual({ x: world.player.x, y: world.player.y }, world.station);
  assert.equal(world.cash, cash - 300);
  assert.equal(world.wanted, 0);
  assert.equal(saved.cash, world.cash);
  assert.deepEqual({ x: saved.x, y: saved.y }, world.station);
});

test('an expired delivery resets the mission to pickup', () => {
  const world = createWorld();
  world.mission.phase = 'delivery';
  world.mission.timeLeft = 0.1;
  assert.match(world.step(0.2, { x: 0, y: 0 }, false), /delivery expired/i);
  assert.equal(world.mission.phase, 'pickup');
  assert.equal(world.mission.timeLeft, 0);
});
