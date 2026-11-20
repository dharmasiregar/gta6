import { CAR, CITY, PLAYER } from './config.js';

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const roadCenters = Array.from({ length: CITY.blocks }, (_, index) => index * CITY.pitch + CITY.roadWidth / 2);

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

function makeParkedCars() {
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

function makeTraffic() {
  const traffic = [];
  for (let road = 0; road < CITY.blocks; road += 1) {
    const offset = road * CITY.pitch + CITY.roadWidth / 2;
    const direction = road % 2 === 0 ? 1 : -1;
    for (const fraction of [0.2, 0.68]) {
      const position = CITY.width * fraction;
      traffic.push({
        x: direction > 0 ? position : CITY.width - position,
        y: offset,
        angle: direction > 0 ? 0 : Math.PI,
        direction,
        axis: 'x',
        speed: 85,
        color: (road + traffic.length) % 6,
      });
      traffic.push({
        x: offset,
        y: direction > 0 ? position : CITY.width - position,
        angle: direction > 0 ? Math.PI / 2 : -Math.PI / 2,
        direction,
        axis: 'y',
        speed: 85,
        color: (road + traffic.length + 2) % 6,
      });
    }
  }
  return traffic;
}

function makePedestrians() {
  const pedestrians = [];
  for (let row = 0; row < CITY.blocks; row += 1) {
    for (let column = 0; column < CITY.blocks; column += 1) {
      const left = column * CITY.pitch + CITY.roadWidth + CITY.sidewalk / 2;
      const top = row * CITY.pitch + CITY.roadWidth + CITY.sidewalk / 2;
      const right = left + CITY.blockSize - CITY.sidewalk;
      const bottom = top + CITY.blockSize - CITY.sidewalk;
      const route = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
      for (let index = 0; index < 3; index += 1) {
        const segment = index % route.length;
        const from = route[segment];
        const to = route[(segment + 1) % route.length];
        const ratio = (index + 1) / 4;
        pedestrians.push({
          x: from.x + (to.x - from.x) * ratio,
          y: from.y + (to.y - from.y) * ratio,
          route,
          routeIndex: segment,
          speed: 25 + ((row * CITY.blocks + column + index) % 3) * 6,
          fleeTime: 0,
          fleeX: 0,
          fleeY: 0,
          down: false,
          color: (row + column + index) % 5,
        });
      }
    }
  }
  return pedestrians;
}

function nearestRoadCenter(value) {
  return roadCenters.reduce((best, center) => Math.abs(center - value) < Math.abs(best - value) ? center : best);
}

export function createWorld({ profile = null, onSave = () => {} } = {}) {
  const buildings = makeBuildings();
  const cars = makeParkedCars();
  const traffic = makeTraffic();
  const pedestrians = makePedestrians();
  const police = [];
  const station = { x: CITY.roadWidth + 86, y: CITY.roadWidth + CITY.sidewalk / 2 };
  const player = { ...station, carIndex: -1 };
  const mission = {
    type: 'delivery',
    phase: 'pickup',
    pickup: { x: roadCenters[CITY.blocks - 1], y: roadCenters[CITY.blocks - 1] },
    delivery: { x: roadCenters[0], y: roadCenters[CITY.blocks - 1] },
    destination: { x: roadCenters[0], y: roadCenters[0] },
    timeLeft: 0,
    reward: 500,
  };
  let wanted = 0;
  let cash = profile?.cash ?? 1250;
  let completedMissions = profile?.completedMissions ?? 0;
  let bustFine = 0;
  let troubleTime = 0;
  let decayTime = 0;
  if (profile && Number.isFinite(profile.x) && Number.isFinite(profile.y)) {
    player.x = clamp(profile.x, PLAYER.radius, CITY.width - PLAYER.radius);
    player.y = clamp(profile.y, PLAYER.radius, CITY.height - PLAYER.radius);
  }

  function persist() {
    onSave({
      cash,
      x: player.x,
      y: player.y,
      completedMissions,
    });
  }

  function allVehicles() {
    return [...cars, ...traffic, ...police];
  }

  function blocked(x, y, radius, ignoredCar = -1) {
    if (x < radius || y < radius || x > CITY.width - radius || y > CITY.height - radius) return true;
    if (buildings.some((building) => circleHitsRect(x, y, radius, building))) return true;
    return allVehicles().some((car, index) => !(index === ignoredCar && car === cars[ignoredCar]) && Math.hypot(car.x - x, car.y - y) < radius + 15);
  }

  function nearestCar() {
    let result = -1;
    let nearest = 78;
    for (let index = 0; index < cars.length; index += 1) {
      const candidate = distance(cars[index], player);
      if (candidate < nearest) {
        nearest = candidate;
        result = index;
      }
    }
    return result;
  }

  function nearestSlowTraffic() {
    let result = -1;
    let nearest = 62;
    for (let index = 0; index < traffic.length; index += 1) {
      const car = traffic[index];
      const candidate = distance(car, player);
      if (Math.abs(car.speed) <= 45 && candidate < nearest) {
        nearest = candidate;
        result = index;
      }
    }
    return result;
  }

  function raiseWanted(amount) {
    wanted = Math.min(5, wanted + amount);
    troubleTime = 0;
    decayTime = 0;
  }

  function interact() {
    if (player.carIndex < 0) {
      const trafficIndex = nearestSlowTraffic();
      if (trafficIndex >= 0) {
        const [car] = traffic.splice(trafficIndex, 1);
        const fleeX = Math.sign(car.x - player.x) || 1;
        const driver = {
          x: car.x,
          y: car.y,
          route: [{ x: car.x, y: car.y }, { x: car.x + fleeX * 80, y: car.y + 80 }],
          routeIndex: 0,
          speed: 25,
          fleeTime: 3.2,
          fleeX,
          fleeY: -1,
          down: false,
          robbed: true,
          color: 2,
        };
        pedestrians.push(driver);
        car.speed = 0;
        car.angle = car.axis === 'x'
          ? (car.direction > 0 ? 0 : Math.PI)
          : (car.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
        car.axis = undefined;
        player.carIndex = cars.push(car) - 1;
        player.x = car.x;
        player.y = car.y;
        const policeNearby = police.some((patrol) => distance(patrol, player) < 220);
        if (policeNearby) {
          raiseWanted(1);
          return 'Traffic car stolen near police. Wanted level increased.';
        }
        return 'Driver pulled out and fled. You took the traffic car.';
      }
      const index = nearestCar();
      if (index >= 0) {
        player.carIndex = index;
        if (pedestrians.some((pedestrian) => !pedestrian.down && distance(pedestrian, player) < 190)) {
          raiseWanted(1);
          return 'Car theft witnessed. Police are on the way.';
        }
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

  function punch() {
    if (player.carIndex >= 0) return '';
    const target = pedestrians
      .filter((pedestrian) => !pedestrian.down && !pedestrian.robbed && distance(pedestrian, player) < 34)
      .sort((a, b) => distance(a, player) - distance(b, player))[0];
    if (!target) return '';
    const length = distance(target, player) || 1;
    target.fleeX = (target.x - player.x) / length;
    target.fleeY = (target.y - player.y) / length;
    target.fleeTime = 3.5;
    target.robbed = true;
    cash += 25;
    raiseWanted(1);
    return 'Pedestrian punched. $25 taken; wanted level increased.';
  }

  function movePedestrians(dt) {
    let message = '';
    const vehicles = [...traffic, ...police];
    if (player.carIndex >= 0) vehicles.push(cars[player.carIndex]);

    for (const pedestrian of pedestrians) {
      if (pedestrian.down) continue;
      let danger = null;
      for (const vehicle of vehicles) {
        const gap = distance(vehicle, pedestrian);
        const speed = Math.abs(vehicle.speed);
        if (gap < 25 && speed > 30) {
          pedestrian.down = true;
          pedestrian.fleeTime = 0;
          if (player.carIndex >= 0 && vehicle === cars[player.carIndex]) {
            raiseWanted(1);
            if (!message) message = 'Pedestrian hit. Wanted level increased.';
          }
          break;
        }
        if (speed > 65 && gap < 125) {
          danger = vehicle;
          break;
        }
      }
      if (pedestrian.down) continue;

      if (danger) {
        const dx = pedestrian.x - danger.x;
        const dy = pedestrian.y - danger.y;
        const length = Math.hypot(dx, dy) || 1;
        pedestrian.fleeX = dx / length;
        pedestrian.fleeY = dy / length;
        pedestrian.fleeTime = 2.8;
      }
      pedestrian.fleeTime = Math.max(0, pedestrian.fleeTime - dt);
      if (pedestrian.fleeTime > 0) {
        pedestrian.x = clamp(pedestrian.x + pedestrian.fleeX * 95 * dt, 8, CITY.width - 8);
        pedestrian.y = clamp(pedestrian.y + pedestrian.fleeY * 95 * dt, 8, CITY.height - 8);
        continue;
      }

      let remaining = pedestrian.speed * dt;
      while (remaining > 0) {
        const target = pedestrian.route[(pedestrian.routeIndex + 1) % pedestrian.route.length];
        const dx = target.x - pedestrian.x;
        const dy = target.y - pedestrian.y;
        const gap = Math.hypot(dx, dy);
        if (gap <= remaining || gap < 0.01) {
          pedestrian.x = target.x;
          pedestrian.y = target.y;
          pedestrian.routeIndex = (pedestrian.routeIndex + 1) % pedestrian.route.length;
          remaining -= gap;
        } else {
          pedestrian.x += dx / gap * remaining;
          pedestrian.y += dy / gap * remaining;
          remaining = 0;
        }
      }
    }
    return message;
  }

  function moveTraffic(dt) {
    for (const car of traffic) {
      let gap = Infinity;
      const dx = car.axis === 'x' ? car.direction : 0;
      const dy = car.axis === 'y' ? car.direction : 0;
      for (const other of [...traffic, ...police]) {
        if (other === car) continue;
        const ahead = (other.x - car.x) * dx + (other.y - car.y) * dy;
        const beside = Math.abs((other.x - car.x) * dy - (other.y - car.y) * dx);
        if (ahead > 0 && beside < 34) gap = Math.min(gap, ahead);
      }
      const playerGap = distance(car, player);
      if (playerGap < 85) gap = Math.min(gap, Math.max(0, playerGap - 22));
      const desired = gap < 110 ? Math.max(0, 115 * (gap - 38) / 72) : 115;
      if (car.speed < desired) car.speed = Math.min(desired, car.speed + 55 * dt);
      else car.speed = Math.max(desired, car.speed - 150 * dt);
      if (car.axis === 'x') {
        car.x = (car.x + car.direction * car.speed * dt + CITY.width) % CITY.width;
      } else {
        car.y = (car.y + car.direction * car.speed * dt + CITY.height) % CITY.height;
      }
    }
  }

  function updatePolice(dt) {
    const wantedPolice = wanted === 0 ? 0 : Math.min(3, Math.ceil(wanted / 2));
    while (police.length > wantedPolice) police.pop();
    while (police.length < wantedPolice) {
      const xRoad = roadCenters[(Math.round(player.x / CITY.pitch) + police.length + 1) % CITY.blocks];
      const yRoad = roadCenters[(Math.round(player.y / CITY.pitch) + police.length + 2) % CITY.blocks];
      police.push({ x: xRoad, y: yRoad, angle: 0, speed: 0, color: 0, siren: 0 });
    }

    for (const patrol of police) {
      const targetX = nearestRoadCenter(player.x);
      const targetY = nearestRoadCenter(player.y);
      let waypoint;
      if (Math.abs(patrol.x - targetX) > 8) waypoint = { x: targetX, y: patrol.y };
      else waypoint = { x: targetX, y: targetY };
      if (Math.abs(patrol.x - waypoint.x) > 3) {
        patrol.angle = waypoint.x > patrol.x ? 0 : Math.PI;
        patrol.x += Math.sign(waypoint.x - patrol.x) * Math.min(Math.abs(waypoint.x - patrol.x), 155 * dt);
      } else if (Math.abs(patrol.y - waypoint.y) > 3) {
        patrol.angle = waypoint.y > patrol.y ? Math.PI / 2 : -Math.PI / 2;
        patrol.y += Math.sign(waypoint.y - patrol.y) * Math.min(Math.abs(waypoint.y - patrol.y), 155 * dt);
      } else {
        const gap = distance(patrol, player);
        if (gap < 150 && gap > 1) {
          patrol.angle = Math.atan2(player.y - patrol.y, player.x - patrol.x);
          patrol.x += Math.cos(patrol.angle) * Math.min(gap, 105 * dt);
          patrol.y += Math.sin(patrol.angle) * Math.min(gap, 105 * dt);
        }
      }
      patrol.speed = 155;
      patrol.siren += dt;
      const gap = distance(patrol, player);
      if ((player.carIndex < 0 && gap < 32) || (player.carIndex >= 0 && gap < 47 && Math.abs(cars[player.carIndex].speed) < 70)) {
        if (player.carIndex >= 0) cars[player.carIndex].speed = 0;
        if (player.carIndex >= 0) player.carIndex = -1;
        player.x = station.x;
        player.y = station.y;
        wanted = 0;
        troubleTime = 0;
        decayTime = 0;
        bustFine = 300;
        cash = Math.max(0, cash - bustFine);
        police.length = 0;
        mission.type = 'delivery';
        mission.phase = 'pickup';
        mission.timeLeft = 0;
        persist();
        return `Busted. $${bustFine} fine.`;
      }
    }
    return '';
  }

  function updateMission(dt) {
    if (mission.phase === 'delivery' || mission.phase === 'destination') {
      mission.timeLeft = Math.max(0, mission.timeLeft - dt);
      if (mission.timeLeft === 0) {
        mission.phase = 'pickup';
        return mission.type === 'passenger'
          ? 'Passenger trip expired. Find another fare.'
          : 'Delivery expired. The package is back at the pickup.';
      }
    }
    if (player.carIndex < 0) return '';
    const marker = mission.phase === 'pickup'
      ? mission.pickup
      : mission.type === 'passenger' ? mission.destination : mission.delivery;
    if (distance(cars[player.carIndex], marker) > 72) return '';
    if (mission.phase === 'pickup') {
      mission.phase = mission.type === 'passenger' ? 'destination' : 'delivery';
      mission.timeLeft = mission.type === 'passenger' ? 65 : 75;
      return mission.type === 'passenger'
        ? 'Passenger aboard. Reach the destination before time runs out!'
        : 'Package collected. Deliver it before the timer runs out!';
    }
    mission.phase = 'pickup';
    mission.timeLeft = 0;
    completedMissions += 1;
    if (mission.type === 'passenger') {
      const fare = 350;
      cash += fare;
      mission.type = 'delivery';
      persist();
      return `Passenger delivered. Fare: $${fare}.`;
    }
    cash += mission.reward;
    mission.type = 'passenger';
    persist();
    return `Package delivered. Earned $${mission.reward}.`;
  }

  function step(dt, direction, shouldInteract, shouldPunch = false) {
    let message = '';
    if (shouldInteract) message = interact();
    if (shouldPunch) message = punch() || message;
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

    troubleTime += dt;
    if (wanted > 0 && troubleTime >= 18) {
      decayTime += dt;
      if (decayTime >= 14) {
        wanted -= 1;
        decayTime = 0;
      }
    }
    moveTraffic(dt);
    const pedestrianMessage = movePedestrians(dt);
    if (!message && pedestrianMessage) message = pedestrianMessage;
    const policeMessage = updatePolice(dt);
    if (policeMessage) message = policeMessage;
    const missionMessage = updateMission(dt);
    if (!message && missionMessage) message = missionMessage;
    return message;
  }

  return {
    player,
    buildings,
    cars,
    traffic,
    pedestrians,
    police,
    mission,
    station,
    step,
    nearestCar,
    get completedMissions() { return completedMissions; },
    get bustFine() { return bustFine; },
    get wanted() { return wanted; },
    get cash() { return cash; },
    get speed() { return player.carIndex < 0 ? 0 : cars[player.carIndex].speed; },
  };
}
