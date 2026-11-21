import assert from 'node:assert/strict';
import test from 'node:test';
import { clearSave, readSave, SAVE_KEY, writeSave } from './save.js';

function memoryStorage() {
  const contents = new Map();
  return {
    getItem: (key) => contents.get(key) ?? null,
    setItem: (key, value) => contents.set(key, value),
    removeItem: (key) => contents.delete(key),
  };
}

test('progress can be stored, restored, and cleared', () => {
  const storage = memoryStorage();
  const progress = { cash: 875, x: 120, y: 240, completedMissions: 3 };
  writeSave(progress, storage);
  assert.deepEqual(readSave(storage), progress);
  assert.ok(storage.getItem(SAVE_KEY));
  clearSave(storage);
  assert.equal(readSave(storage), null);
});

test('invalid or malformed records are ignored', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_KEY, '{broken');
  assert.equal(readSave(storage), null);
  storage.setItem(SAVE_KEY, JSON.stringify({ cash: -1, x: 2, y: 3, completedMissions: 1 }));
  assert.equal(readSave(storage), null);
  storage.setItem(SAVE_KEY, JSON.stringify({ cash: 1, x: 2, y: 3, completedMissions: 1.5 }));
  assert.equal(readSave(storage), null);
});

test('storage failures surface instead of being silently treated as a save', () => {
  const brokenStorage = {
    getItem() { throw new Error('storage denied'); },
    setItem() { throw new Error('storage denied'); },
    removeItem() { throw new Error('storage denied'); },
  };
  assert.throws(() => readSave(brokenStorage), /storage denied/);
  assert.throws(() => writeSave({}, brokenStorage), /storage denied/);
  assert.throws(() => clearSave(brokenStorage), /storage denied/);
});
