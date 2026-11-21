export const SAVE_KEY = 'sidegrid-save-v1';

function validProgress(record) {
  return record
    && Number.isFinite(record.cash) && record.cash >= 0
    && Number.isFinite(record.x) && Number.isFinite(record.y)
    && Number.isInteger(record.completedMissions) && record.completedMissions >= 0;
}

export function readSave(storage = globalThis.localStorage) {
  if (!storage) return null;
  const encoded = storage.getItem(SAVE_KEY);
  if (encoded === null) return null;
  let record;
  try {
    record = JSON.parse(encoded);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  if (!validProgress(record)) return null;
  return {
    cash: Math.floor(record.cash),
    x: record.x,
    y: record.y,
    completedMissions: record.completedMissions,
  };
}

export function writeSave(progress, storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable.');
  storage.setItem(SAVE_KEY, JSON.stringify(progress));
}

export function clearSave(storage = globalThis.localStorage) {
  if (!storage) throw new Error('Local storage is unavailable.');
  storage.removeItem(SAVE_KEY);
}
