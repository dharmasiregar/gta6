import test from "node:test";
import assert from "node:assert/strict";
import { loadSave, restoreProgress, saveIfCashChanged, saveProgress } from "./save.js";

function storageStub() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("progress loads saved values and falls back for malformed storage", () => {
  const storage = storageStub();
  storage.setItem("sidegrid-save-v1", JSON.stringify({ cash: 930, x: 400, y: 230, missionsDone: 3 }));
  assert.deepEqual(loadSave(storage), { cash: 930, x: 400, y: 230, missionsDone: 3 });
  storage.setItem("sidegrid-save-v1", "not-json");
  assert.deepEqual(loadSave(storage), { cash: 250, x: 168, y: 168, missionsDone: 0 });
});

test("cash changes are saved once and saved progress restores player state", () => {
  const storage = storageStub();
  const world = { cash: 250, player: { x: 168, y: 168 }, missionsDone: 0, width: 2400, height: 1800 };
  assert.equal(saveIfCashChanged(world, storage), true);
  assert.equal(saveIfCashChanged(world, storage), false);
  world.cash = 410;
  world.player.x = 520;
  world.missionsDone = 2;
  assert.equal(saveIfCashChanged(world, storage), true);
  assert.deepEqual(JSON.parse(storage.getItem("sidegrid-save-v1")), { cash: 410, x: 520, y: 168, missionsDone: 2 });
  const restored = { cash: 0, player: { x: 0, y: 0 }, missionsDone: 0, width: 2400, height: 1800 };
  restoreProgress(restored, loadSave(storage));
  assert.equal(restored.cash, 410);
  assert.equal(restored.player.x, 520);
  assert.equal(restored.missionsDone, 2);
});

test("explicit saves persist progress even without a cash change", () => {
  const storage = storageStub();
  const world = { cash: 300, player: { x: 40, y: 70 }, missionsDone: 1 };
  assert.equal(saveProgress(world, storage), true);
  assert.deepEqual(JSON.parse(storage.getItem("sidegrid-save-v1")), { cash: 300, x: 40, y: 70, missionsDone: 1 });
});
