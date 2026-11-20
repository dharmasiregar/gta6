const KEYS = {
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
  up: new Set(['ArrowUp', 'KeyW']),
  down: new Set(['ArrowDown', 'KeyS']),
};

export function createInput() {
  const held = new Set();
  let interact = false;

  window.addEventListener('keydown', (event) => {
    if (Object.values(KEYS).some((keys) => keys.has(event.code)) || event.code === 'KeyE') {
      event.preventDefault();
    }
    if (event.code === 'KeyE' && !event.repeat) interact = true;
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());

  return {
    direction() {
      return {
        x: Number([...KEYS.right].some((key) => held.has(key))) - Number([...KEYS.left].some((key) => held.has(key))),
        y: Number([...KEYS.down].some((key) => held.has(key))) - Number([...KEYS.up].some((key) => held.has(key))),
      };
    },
    takeInteract() {
      const pressed = interact;
      interact = false;
      return pressed;
    },
  };
}
