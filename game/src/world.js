import { CAR, CITY, PLAYER } from './config.js';

function circleHitsRect(x, y, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function makeBuildings() {
  const buildings = [];
  for (let row = 0; row < CITY.blocks; row += 1) {
    for (let column = 0; column < CITY.blocks; column += 1) {
      const left = column * CITY.pitch + CITY.roadWidth + CITY.sidewalk + 12;
      const top = row * CITY.pitch + CITY.roadWidth + CITY.sidewalk + 12;
      const width = CITY.blockSize - CITY.sidewalk * 2 - 24;
      const height = CITY.blockSize - CITY.sidewalk * 2 - 24;
      const gapX = 34;
      const gapY = 38;
      const parts = [
        { x: left, y: top, width: (width - gapX) / 2, height: (height - gapY) / 2 },
        { x: left + (width + gapX) / 2, y: top, width: (width - gapX) / 2, height: (height - gapY) / 2 },
        { x: left, y: top + (height + gapY) / 2, width: (width - gapX) / 2, height: (height - gapY) / 2 },
        { x: left + (width + gapX) / 2, y: top + (height + gapY) / 2, width: (width - gapX) / 2, height: (height - gapY) / 2 },
      ];
      for (let index = 0; index < parts.length; index += 1) {
        buildings.push({ ...parts[index], color: (row * 3 + column + index) % 5 });
      }
    }
  }
  return buildings;
}

function makeCars() {
  const cars = [];
  const add = (x, y, angle, color) => cars.push({ x, y, angle, color, speed: 0 });
  for (let segment = 0; segment < CITY.blocks; segment += 1) {
    const start = segment * CITY.pitch;
    for (const offset of [235, 420]) {
      const coordinate = start + offset;
      add(coordinate, start + 35, 0, (segment + offset) % 6);
      add(coordinate + 80, start + CITY.roadWidth - 35, Math.PI, (segment + offset + 2) % 6);
      add(start + 35, coordinate, Math.PI / 2, (segment + offset + 1) % 6);
      add(start + CITY.roadWidth - 35, coordinate + 80, -Math.PI / 2, (segment + offset + 3) % 6);
    }
  }
  return cars;
}

export function createWorld() {
  const buildings = makeBuildings();
  const cars = makeCars();
  const player = { x: CITY.roadWidth + 86, y: CITY.roadWidth + CITY.sidewalk / 2, carIndex: -1 };

  function blocked(x, y, radius, ignoredCar = -1) {
    if (x < radius || y < radius || x > CITY.width - radius || y > CITY.height - radius) return true;
    if (buildings.some((building) => circleHitsRect(x, y, radius, building))) return true;
    return cars.some((car, index) => index !== ignoredCar && Math.hypot(car.x - x, car.y - y) < radius + 15);
  }

  function nearestCar() {
    let result = -1;
    let distance = 78;
    for (let index = 0; index < cars.length; index += 1) {
      const car = cars[index];
      const candidate = Math.hypot(car.x - player.x, car.y - player.y);
      if (candidate < distance) {
        distance = candidate;
        result = index;
      }
    }
    return result;
  }

  function interact() {
    if (player.carIndex < 0) {
      const index = nearestCar();
      if (index >= 0) {
        player.carIndex = index;
        return 'In vehicle. Drive with W/S and steer with A/D. Press E to get out.';
      }
      return 'Walk close to a parked car to get in.';
    }

    const car = cars[player.carIndex];
    const sideX = Math.sin(car.angle) * (CAR.height / 2 + PLAYER.radius + 3);
    const sideY = -Math.cos(car.angle) * (CAR.height / 2 + PLAYER.radius + 3);
    const exits = [
      { x: car.x + sideX, y: car.y + sideY },
      { x: car.x - sideX, y: car.y - sideY },
    ];
    const exit = exits.find((point) => !blocked(point.x, point.y, PLAYER.radius, player.carIndex));
    if (!exit) return 'No room to get out here.';
    player.x = exit.x;
    player.y = exit.y;
    car.speed = 0;
    player.carIndex = -1;
    return 'On foot. Walk with WASD or the arrow keys.';
  }

  function step(dt, direction, shouldInteract) {
    let message = '';
    if (shouldInteract) message = interact();
    if (player.carIndex < 0) {
      const length = Math.hypot(direction.x, direction.y) || 1;
      const dx = direction.x / length * PLAYER.speed * dt;
      const dy = direction.y / length * PLAYER.speed * dt;
      if (!blocked(player.x + dx, player.y, PLAYER.radius)) player.x += dx;
      if (!blocked(player.x, player.y + dy, PLAYER.radius)) player.y += dy;
    } else {
      const index = player.carIndex;
      const car = cars[index];
      const throttle = direction.y < 0 ? 1 : direction.y > 0 ? -1 : 0;
      if (throttle > 0) car.speed = Math.min(CAR.maxSpeed, car.speed + CAR.acceleration * dt);
      else if (throttle < 0) car.speed = Math.max(-CAR.maxReverse, car.speed - CAR.reverseAcceleration * dt);
      else if (car.speed > 0) car.speed = Math.max(0, car.speed - CAR.friction * dt);
      else if (car.speed < 0) car.speed = Math.min(0, car.speed + CAR.friction * dt);

      const steeringScale = Math.min(1, Math.abs(car.speed) / 45);
      car.angle += direction.x * CAR.steering * steeringScale * dt * (car.speed < 0 ? -1 : 1);
      const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
      const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!blocked(nextX, nextY, 24, index)) {
        car.x = nextX;
        car.y = nextY;
      } else {
        car.speed = 0;
      }
      player.x = car.x;
      player.y = car.y;
    }
    return message;
  }

  return { player, buildings, cars, step, nearestCar, get speed() { return player.carIndex < 0 ? 0 : cars[player.carIndex].speed; } };
}
