const KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", "e", "f", "p", "escape"]);

export function createInput(target = window) {
  const held = new Set();
  const pressed = new Set();
  const down = (event) => {
    const key = event.key.toLowerCase();
    if (!KEYS.has(key)) return;
    event.preventDefault();
    if (!held.has(key)) pressed.add(key);
    held.add(key);
  };
  const up = (event) => held.delete(event.key.toLowerCase());
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  return {
    held,
    isDown(...keys) { return keys.some((key) => held.has(key)); },
    consume(...keys) {
      const key = keys.find((candidate) => pressed.has(candidate));
      if (!key) return false;
      pressed.delete(key);
      return true;
    },
    clearPressed() { pressed.clear(); },
    destroy() {
      target.removeEventListener("keydown", down);
      target.removeEventListener("keyup", up);
    },
  };
}
