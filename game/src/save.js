const DEFAULT_SAVE = Object.freeze({ cash: 250, x: 168, y: 168, missionsDone: 0 });

export function loadSave(storage = globalThis.localStorage, key = "sidegrid-save-v1") {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return { ...DEFAULT_SAVE };
    const data = JSON.parse(raw);
    return {
      cash: finiteNonnegative(data.cash, DEFAULT_SAVE.cash),
      x: finiteNonnegative(data.x, DEFAULT_SAVE.x),
      y: finiteNonnegative(data.y, DEFAULT_SAVE.y),
      missionsDone: Math.floor(finiteNonnegative(data.missionsDone, 0)),
    };
  } catch (error) {
    return { ...DEFAULT_SAVE };
  }
}

function finiteNonnegative(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function saveProgress(world, storage = globalThis.localStorage, key = "sidegrid-save-v1") {
  if (!storage) return false;
  const payload = {
    cash: world.cash,
    x: world.player.x,
    y: world.player.y,
    missionsDone: world.missionsDone,
  };
  try {
    storage.setItem(key, JSON.stringify(payload));
    world._savedCash = world.cash;
    return true;
  } catch (error) {
    return false;
  }
}

export function saveIfCashChanged(world, storage = globalThis.localStorage, key = "sidegrid-save-v1") {
  return world._savedCash !== world.cash ? saveProgress(world, storage, key) : false;
}

export function restoreProgress(world, save) {
  world.cash = save.cash;
  world.player.x = Math.min(save.x, world.width - 12);
  world.player.y = Math.min(save.y, world.height - 12);
  world.missionsDone = save.missionsDone;
  world._savedCash = save.cash;
  return world;
}
