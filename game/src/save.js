export const SAVE_KEY = 'sidegrid-save-v1';

export function readSave(storage = globalThis.localStorage) {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(SAVE_KEY));
    if (!value || !Number.isFinite(value.cash) || value.cash < 0 || !Number.isFinite(value.x) || !Number.isFinite(value.y)
      || !Number.isInteger(value.completedMissions) || value.completedMissions < 0) return null;
    return {
      cash: Math.max(0, Math.floor(value.cash)),
      x: value.x,
      y: value.y,
      completedMissions: value.completedMissions,
    };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export function writeSave(progress, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable.');
  storage.setItem(SAVE_KEY, JSON.stringify(progress));
}

export function clearSave(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable.');
  storage.removeItem(SAVE_KEY);
}
