const KEYS = {
  left: new Set(['ArrowLeft', 'KeyA']),
  right: new Set(['ArrowRight', 'KeyD']),
  up: new Set(['ArrowUp', 'KeyW']),
  down: new Set(['ArrowDown', 'KeyS']),
};

export function createInput() {
  const held = new Set();
  let interact = false;
  let punch = false;
  let start = false;
  let pause = false;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (Object.values(KEYS).some((keys) => keys.has(event.code))
      || ['KeyE', 'KeyF', 'KeyP', 'Enter'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === 'KeyE' && !event.repeat) interact = true;
    if (event.code === 'KeyF' && !event.repeat) punch = true;
    if (event.code === 'KeyP' && !event.repeat) pause = true;
    if (event.code === 'Enter' && !event.repeat) start = true;
    held.add(event.code);
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  window.addEventListener('pointerdown', (event) => {
    click = { x: event.clientX, y: event.clientY };
  });

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
    takePunch() {
      const pressed = punch;
      punch = false;
      return pressed;
    },
    takeStart() {
      const pressed = start;
      start = false;
      return pressed;
    },
    takePause() {
      const pressed = pause;
      pause = false;
      return pressed;
    },
    takeClick() {
      const position = click;
      click = null;
      return position;
    },
  };
}
