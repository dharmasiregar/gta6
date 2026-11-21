import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorld } from './world.js';

const idle = { x: 0, y: 0 };

test('builds a populated city and advances its traffic', () => {
  const world = createWorld();
  assert.equal(world.cars.length, 32);
  assert.equal(world.traffic.length, 16);
  assert.equal(world.pedestrians.length, 48);
  world.step(0.1, idle, false);
  assert.ok(world.traffic.some((car) => car.speed > 0));
});

test('witnessed car theft raises wanted level and creates police', () => {
  const world = createWorld();
  Object.assign(world.player, world.cars[0]);
  world.pedestrians[0].x = world.cars[0].x + 100;
  world.pedestrians[0].y = world.cars[0].y;
  assert.match(world.step(0, idle, true), /theft witnessed/i);
  assert.equal(world.wanted, 1);
  assert.ok(world.police.length > 0);
});

test('hitting a pedestrian in a moving car raises wanted level', () => {
  const world = createWorld();
  const car = world.cars[0];
  world.player.carIndex = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  car.speed = 80;
  world.pedestrians[0].x = car.x + 10;
  world.pedestrians[0].y = car.y;
  assert.match(world.step(0.01, idle, false), /pedestrian hit/i);
  assert.equal(world.wanted, 1);
  assert.equal(world.pedestrians[0].down, true);
});

test('nearby fast vehicles make pedestrians flee', () => {
  const world = createWorld();
  const car = world.traffic[0];
  const person = world.pedestrians[0];
  car.speed = 100;
  person.x = car.x + 100;
  person.y = car.y;
  const before = { x: person.x, y: person.y };
  world.step(0.1, idle, false);
  assert.ok(Math.hypot(person.x - before.x, person.y - before.y) > 0);
  assert.ok(person.fleeTime > 0);
});

test('punching a pedestrian adds cash, wanted level, and an immediate save', () => {
  let saved;
  const world = createWorld({ onSave: (progress) => { saved = progress; } });
  const person = world.pedestrians[0];
  world.player.x = person.x - 1;
  world.player.y = person.y;
  const cashBefore = world.cash;
  assert.match(world.step(0, idle, false, true), /punched/i);
  assert.equal(world.cash, cashBefore + 25);
  assert.equal(world.wanted, 1);
  assert.ok(person.fleeTime > 0);
  assert.equal(person.robbed, true);
  assert.deepEqual(saved, {
    cash: world.cash,
    x: world.player.x,
    y: world.player.y,
    completedMissions: world.completedMissions,
  });
});

test('a stopped traffic car can be taken from its driver', () => {
  const world = createWorld();
  const car = world.traffic[0];
  car.speed = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  world.police.push({ x: car.x + 100, y: car.y, angle: 0, speed: 0, color: 5, siren: 0 });
  assert.match(world.step(0, idle, true), /stolen near police/i);
  assert.equal(world.player.carIndex, world.cars.length - 1);
  assert.equal(world.traffic.includes(car), false);
  assert.equal(world.wanted, 1);
  assert.ok(world.pedestrians.at(-1).fleeTime > 0);
});

test('traffic yields and completing a delivery pays and saves cash', () => {
  let saved;
  const world = createWorld({ onSave: (progress) => { saved = progress; } });
  const traffic = world.traffic[0];
  world.player.x = traffic.x + traffic.direction * 30;
  world.player.y = traffic.y;
  const speedBefore = traffic.speed;
  world.step(0.1, idle, false);
  assert.ok(traffic.speed < speedBefore);

  const car = world.cars[0];
  world.player.carIndex = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  world.mission.pickup = { x: car.x, y: car.y };
  assert.match(world.step(0, idle, false), /package collected/i);
  assert.equal(world.mission.phase, 'delivery');

  world.mission.delivery = { x: car.x, y: car.y };
  const cashBefore = world.cash;
  assert.match(world.step(0, idle, false), /package delivered/i);
  assert.equal(world.cash, cashBefore + world.mission.reward);
  assert.equal(world.mission.phase, 'pickup');
  assert.equal(saved.cash, world.cash);
  assert.equal(saved.completedMissions, 1);
});

test('a passenger trip pays its fare and increments the completed count', () => {
  let saved;
  const world = createWorld({ onSave: (progress) => { saved = progress; } });
  const car = world.cars[0];
  world.player.carIndex = 0;
  world.player.x = car.x;
  world.player.y = car.y;
  world.mission.type = 'passenger';
  world.mission.pickup = { x: car.x, y: car.y };
  world.mission.destination = { x: car.x, y: car.y };
  assert.match(world.step(0, idle, false), /passenger aboard/i);
  assert.equal(world.mission.phase, 'destination');
  const cashBefore = world.cash;
  assert.match(world.step(0, idle, false), /fare: \$350/i);
  assert.equal(world.cash, cashBefore + 350);
  assert.equal(world.completedMissions, 1);
  assert.equal(saved.completedMissions, 1);
  assert.equal(saved.cash, world.cash);
});

test('a saved profile restores cash, position, and mission progress', () => {
  const world = createWorld({ profile: { cash: 875, x: 220, y: 310, completedMissions: 4 } });
  assert.equal(world.cash, 875);
  assert.deepEqual({ x: world.player.x, y: world.player.y }, { x: 220, y: 310 });
  assert.equal(world.completedMissions, 4);
});

test('wanted stars eventually cool off after a crime', () => {
  const world = createWorld();
  const car = world.cars[0];
  world.player.x = car.x;
  world.player.y = car.y;
  world.pedestrians[0].x = car.x + 100;
  world.pedestrians[0].y = car.y;
  world.step(0, idle, true);
  world.police[0].x = -10000;
  world.police[0].y = -10000;
  for (let frame = 0; frame < 660; frame += 1) world.step(0.05, idle, false);
  assert.equal(world.wanted, 0);
});

test('police arrest a pinned driver, charge a fine, and save the result', () => {
  let saved;
  const world = createWorld({ onSave: (progress) => { saved = progress; } });
  const car = world.cars[0];
  world.player.x = car.x;
  world.player.y = car.y;
  world.pedestrians[0].x = car.x + 100;
  world.pedestrians[0].y = car.y;
  world.step(0, idle, true);
  world.police[0].x = car.x + 10;
  world.police[0].y = car.y;
  const cashBefore = world.cash;
  assert.match(world.step(0, idle, false), /busted/i);
  assert.equal(world.player.carIndex, -1);
  assert.deepEqual({ x: world.player.x, y: world.player.y }, world.station);
  assert.equal(world.cash, cashBefore - 300);
  assert.equal(world.wanted, 0);
  assert.equal(saved.cash, world.cash);
  assert.deepEqual({ x: saved.x, y: saved.y }, world.station);
});

test('an expired delivery is reset to its pickup point', () => {
  const world = createWorld();
  world.mission.phase = 'delivery';
  world.mission.timeLeft = 0.1;
  assert.match(world.step(0.2, idle, false), /delivery expired/i);
  assert.equal(world.mission.phase, 'pickup');
  assert.equal(world.mission.timeLeft, 0);
});
