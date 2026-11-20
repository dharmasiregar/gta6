import assert from 'node:assert/strict';
import test from 'node:test';
import { clearSave, readSave, SAVE_KEY, writeSave } from './save.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test('save progress round-trips and can be cleared', () => {
  const storage = memoryStorage();
  const progress = { cash: 875, x: 120, y: 240, completedMissions: 3 };
  writeSave(progress, storage);
  assert.deepEqual(readSave(storage), progress);
  assert.equal(storage.getItem(SAVE_KEY) !== null, true);
  clearSave(storage);
  assert.equal(readSave(storage), null);
});

test('malformed saves are ignored', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, '{broken');
  assert.equal(readSave(storage), null);
  storage.setItem(SAVE_KEY, JSON.stringify({ cash: -1, x: 2, y: 3, completedMissions: 1 }));
  assert.equal(readSave(storage), null);
});
