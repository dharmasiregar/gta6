const AXES = {
  x: { negative: ['ArrowLeft', 'KeyA'], positive: ['ArrowRight', 'KeyD'] },
  y: { negative: ['ArrowUp', 'KeyW'], positive: ['ArrowDown', 'KeyS'] },
};
const ACTIONS = ['KeyE', 'KeyF', 'KeyP', 'Enter'];

export function createInput(target = window) {
  const held = new Set();
  const tapped = new Set();
  let pointer = null;

  target.addEventListener('keydown', (event) => {
    if (Object.values(AXES).some(({ negative, positive }) =>
      negative.includes(event.code) || positive.includes(event.code)) || ACTIONS.includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat && ACTIONS.includes(event.code)) tapped.add(event.code);
    held.add(event.code);
  });
  target.addEventListener('keyup', (event) => held.delete(event.code));
  target.addEventListener('blur', () => held.clear());
  target.addEventListener('pointerdown', (event) => { pointer = { x: event.clientX, y: event.clientY }; });

  function take(code) {
    const pressed = tapped.has(code);
    tapped.delete(code);
    return pressed;
  }
  function axis(name) {
    const { negative, positive } = AXES[name];
    return Number(positive.some((key) => held.has(key))) - Number(negative.some((key) => held.has(key)));
  }

  return {
    direction: () => ({ x: axis('x'), y: axis('y') }),
    takeInteract: () => take('KeyE'),
    takePunch: () => take('KeyF'),
    takePause: () => take('KeyP'),
    takeStart: () => take('Enter'),
    takeClick() {
      const lastPointer = pointer;
      pointer = null;
      return lastPointer;
    },
  };
}
