import test from "node:test";
import assert from "node:assert/strict";
import { createShotWorld, createWorld, stepWorld } from "./world.js";

function controls(...pressedKeys) {
  const pressed = new Set(pressedKeys);
  return {
    isDown: () => false,
    consume(...keys) {
      const key = keys.find((candidate) => pressed.has(candidate));
      if (!key) return false;
      pressed.delete(key);
      return true;
    },
  };
}

test("world generation is repeatable for the same seed", () => {
  const first = createWorld(123);
  const second = createWorld(123);
  assert.deepEqual(first.cars, second.cars);
  assert.deepEqual(first.pedestrians, second.pedestrians);
});

test("entering an unclaimed car sets wanted level and marks it stolen", () => {
  const world = createWorld(9);
  const car = world.cars[0];
  world.player.x = car.x;
  world.player.y = car.y;
  stepWorld(world, controls("e"), 0.016);
  assert.equal(world.player.carId, car.id);
  assert.equal(car.stolen, true);
  assert.equal(world.wanted, 1);
});

test("missions pay and increment the completed count at the marker", () => {
  const world = createWorld(4);
  world.player.x = 1000;
  world.player.y = 1000;
  world.mission = { type: "delivery", x: 1000, y: 1000, reward: 150, time: 20 };
  stepWorld(world, controls("e"), 0.016);
  assert.equal(world.cash, 400);
  assert.equal(world.missionsDone, 1);
  assert.equal(world.mission, null);
});

test("shot scenes stage the expected deterministic game state", () => {
  const chase = createShotWorld("chase", 1);
  assert.equal(chase.player.carId !== null, true);
  assert.equal(chase.wanted, 4);
  assert.equal(chase.police.length, 2);
  assert.equal(chase.mission.type, "delivery");

  const foot = createShotWorld("mission", 1);
  assert.equal(foot.player.carId, null);
  assert.equal(foot.mission.type, "delivery");
  assert.deepEqual(
    [createShotWorld("mission", 1).mission.x, createShotWorld("mission", 1).mission.y],
    [foot.mission.x, foot.mission.y],
  );
  assert.equal(createShotWorld("start", 1).status, "start");
  const drive = createShotWorld("drive", 1);
  assert.notEqual(drive.player.carId, null);
  assert.equal(drive.cars.find((car) => car.id === drive.player.carId).speed > 0, true);
});
