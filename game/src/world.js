import { CAR, CITY, PLAYER } from './config.js';

const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const centers = Array.from({ length: CITY.blocks }, (_, i) => i * CITY.pitch + CITY.roadWidth / 2);

function touchesBuilding(x, y, radius, block) {
  const nearX = clamp(x, block.x, block.x + block.width);
  const nearY = clamp(y, block.y, block.y + block.height);
  return (x - nearX) ** 2 + (y - nearY) ** 2 < radius ** 2;
}

function buildBlocks() {
  const result = [];
  for (let row = 0; row < CITY.blocks; row += 1) {
    for (let column = 0; column < CITY.blocks; column += 1) {
      const x = column * CITY.pitch + CITY.roadWidth + CITY.sidewalk + 12;
      const y = row * CITY.pitch + CITY.roadWidth + CITY.sidewalk + 12;
      const width = CITY.blockSize - CITY.sidewalk * 2 - 24;
      const halfW = (width - 34) / 2;
      const halfH = (width - 38) / 2;
      const parts = [
        [x, y, halfW, halfH],
        [x + halfW + 34, y, halfW, halfH],
        [x, y + halfH + 38, halfW, halfH],
        [x + halfW + 34, y + halfH + 38, halfW, halfH],
      ];
      parts.forEach(([bx, by, w, h], index) => {
        result.push({ x: bx, y: by, width: w, height: h, color: (row * 3 + column + index) % 5 });
      });
    }
  }
  return result;
}

function buildParkedCars() {
  const cars = [];
  for (let segment = 0; segment < CITY.blocks; segment += 1) {
    const start = segment * CITY.pitch;
    for (const offset of [235, 420]) {
      const x = start + offset;
      const y = start + offset;
      cars.push({ x, y: start + 35, angle: 0, speed: 0, color: (segment + offset) % 6 });
      cars.push({ x: x + 80, y: start + CITY.roadWidth - 35, angle: Math.PI, speed: 0, color: (segment + offset + 2) % 6 });
      cars.push({ x: start + 35, y, angle: Math.PI / 2, speed: 0, color: (segment + offset + 1) % 6 });
      cars.push({ x: start + CITY.roadWidth - 35, y: y + 80, angle: -Math.PI / 2, speed: 0, color: (segment + offset + 3) % 6 });
    }
  }
  return cars;
}

function buildTraffic() {
  const traffic = [];
  for (let road = 0; road < CITY.blocks; road += 1) {
    const lane = road * CITY.pitch + CITY.roadWidth / 2;
    const direction = road % 2 === 0 ? 1 : -1;
    for (const fraction of [0.2, 0.68]) {
      const position = CITY.width * fraction;
      traffic.push({
        x: direction > 0 ? position : CITY.width - position,
        y: lane,
        angle: direction > 0 ? 0 : Math.PI,
        direction, axis: 'x', speed: 85, color: (road + traffic.length) % 6,
      });
      traffic.push({
        x: lane,
        y: direction > 0 ? position : CITY.width - position,
        angle: direction > 0 ? Math.PI / 2 : -Math.PI / 2,
        direction, axis: 'y', speed: 85, color: (road + traffic.length + 2) % 6,
      });
    }
  }
  return traffic;
}

function buildPedestrians() {
  const people = [];
  for (let row = 0; row < CITY.blocks; row += 1) {
    for (let column = 0; column < CITY.blocks; column += 1) {
      const left = column * CITY.pitch + CITY.roadWidth + CITY.sidewalk / 2;
      const top = row * CITY.pitch + CITY.roadWidth + CITY.sidewalk / 2;
      const right = left + CITY.blockSize - CITY.sidewalk;
      const bottom = top + CITY.blockSize - CITY.sidewalk;
      const path = [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
      for (let i = 0; i < 3; i += 1) {
        const from = path[i];
        const to = path[(i + 1) % path.length];
        const fraction = (i + 1) / 4;
        people.push({
          x: from.x + (to.x - from.x) * fraction,
          y: from.y + (to.y - from.y) * fraction,
          path, waypoint: i, speed: 25 + ((row * CITY.blocks + column + i) % 3) * 6,
          fleeTime: 0, fleeX: 0, fleeY: 0, down: false, robbed: false,
          color: (row + column + i) % 5,
        });
      }
    }
  }
  return people;
}

function nearestCenter(value) {
  return centers.reduce((best, center) =>
    Math.abs(center - value) < Math.abs(best - value) ? center : best);
}

export function createWorld({ profile = null, onSave = () => {} } = {}) {
  const buildings = buildBlocks();
  const cars = buildParkedCars();
  const traffic = buildTraffic();
  const pedestrians = buildPedestrians();
  const police = [];
  const station = { x: CITY.roadWidth + 86, y: CITY.roadWidth + CITY.sidewalk / 2 };
  const player = { ...station, carIndex: -1 };
  const mission = {
    type: 'delivery',
    phase: 'pickup',
    pickup: { x: centers[CITY.blocks - 1], y: centers[CITY.blocks - 1] },
    delivery: { x: centers[0], y: centers[CITY.blocks - 1] },
    destination: { x: centers[0], y: centers[0] },
    timeLeft: 0,
    reward: 500,
  };
  let cash = profile?.cash ?? 1250;
  let completedMissions = profile?.completedMissions ?? 0;
  let wanted = 0;
  let bustFine = 0;
  let troubleTime = 0;
  let decayTime = 0;
  if (profile && Number.isFinite(profile.x) && Number.isFinite(profile.y)) {
    player.x = clamp(profile.x, PLAYER.radius, CITY.width - PLAYER.radius);
    player.y = clamp(profile.y, PLAYER.radius, CITY.height - PLAYER.radius);
  }

  function persist() {
    onSave({ cash, x: player.x, y: player.y, completedMissions });
  }
  function vehicles() {
    return [...cars, ...traffic, ...police];
  }
  function blocked(x, y, radius, ignoredCar = -1) {
    if (x < radius || y < radius || x > CITY.width - radius || y > CITY.height - radius) return true;
    if (buildings.some((building) => touchesBuilding(x, y, radius, building))) return true;
    return vehicles().some((vehicle) => vehicle !== cars[ignoredCar]
      && Math.hypot(vehicle.x - x, vehicle.y - y) < radius + 15);
  }
  function nearestParkedCar() {
    let found = -1;
    let gap = 78;
    cars.forEach((car, index) => {
      const candidate = distance(car, player);
      if (candidate < gap) { gap = candidate; found = index; }
    });
    return found;
  }
  function nearestSlowTraffic() {
    let found = -1;
    let gap = 62;
    traffic.forEach((car, index) => {
      const candidate = distance(car, player);
      if (Math.abs(car.speed) <= 45 && candidate < gap) { gap = candidate; found = index; }
    });
    return found;
  }
  function addWanted(stars = 1) {
    wanted = Math.min(5, wanted + stars);
    troubleTime = 0;
    decayTime = 0;
  }

  function interact() {
    if (player.carIndex < 0) {
      const trafficIndex = nearestSlowTraffic();
      if (trafficIndex >= 0) {
        const [car] = traffic.splice(trafficIndex, 1);
        const escapeDirection = Math.sign(car.x - player.x) || 1;
        pedestrians.push({
          x: car.x, y: car.y,
          path: [{ x: car.x, y: car.y }, { x: car.x + escapeDirection * 80, y: car.y + 80 }],
          waypoint: 0, speed: 25, fleeTime: 3.2, fleeX: escapeDirection, fleeY: -1,
          down: false, robbed: true, color: 2,
        });
        car.speed = 0;
        car.angle = car.axis === 'x'
          ? (car.direction > 0 ? 0 : Math.PI)
          : (car.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
        delete car.axis;
        player.carIndex = cars.push(car) - 1;
        player.x = car.x;
        player.y = car.y;
        if (police.some((patrol) => distance(patrol, player) < 220)) {
          addWanted();
          return 'Traffic car stolen near police. Wanted level increased.';
        }
        return 'Driver pulled out and fled. You took the traffic car.';
      }
      const index = nearestParkedCar();
      if (index < 0) return 'Walk close to a parked car to get in.';
      player.carIndex = index;
      if (pedestrians.some((person) => !person.down && distance(person, player) < 190)) {
        addWanted();
        return 'Car theft witnessed. Police are on the way.';
      }
      return 'In vehicle. Drive with W/S and steer with A/D. Press E to get out.';
    }

    const car = cars[player.carIndex];
    const offsetX = Math.sin(car.angle) * (CAR.height / 2 + PLAYER.radius + 3);
    const offsetY = -Math.cos(car.angle) * (CAR.height / 2 + PLAYER.radius + 3);
    const exit = [
      { x: car.x + offsetX, y: car.y + offsetY },
      { x: car.x - offsetX, y: car.y - offsetY },
    ].find(({ x, y }) => !blocked(x, y, PLAYER.radius, player.carIndex));
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
      .filter((person) => !person.down && !person.robbed && distance(person, player) < 34)
      .sort((a, b) => distance(a, player) - distance(b, player))[0];
    if (!target) return '';
    const gap = distance(target, player) || 1;
    target.fleeX = (target.x - player.x) / gap;
    target.fleeY = (target.y - player.y) / gap;
    target.fleeTime = 3.5;
    target.robbed = true;
    cash += 25;
    addWanted();
    persist();
    return 'Pedestrian punched. $25 taken; wanted level increased.';
  }

  function movePedestrians(dt) {
    let notice = '';
    const hazards = [...traffic, ...police];
    if (player.carIndex >= 0) hazards.push(cars[player.carIndex]);
    for (const person of pedestrians) {
      if (person.down) continue;
      let danger = null;
      for (const vehicle of hazards) {
        const gap = distance(vehicle, person);
        if (gap < 25 && Math.abs(vehicle.speed) > 30) {
          person.down = true;
          person.fleeTime = 0;
          if (player.carIndex >= 0 && vehicle === cars[player.carIndex]) {
            addWanted();
            if (!notice) notice = 'Pedestrian hit. Wanted level increased.';
          }
          break;
        }
        if (Math.abs(vehicle.speed) > 65 && gap < 125) { danger = vehicle; break; }
      }
      if (person.down) continue;
      if (danger) {
        const dx = person.x - danger.x;
        const dy = person.y - danger.y;
        const length = Math.hypot(dx, dy) || 1;
        person.fleeX = dx / length;
        person.fleeY = dy / length;
        person.fleeTime = 2.8;
      }
      person.fleeTime = Math.max(0, person.fleeTime - dt);
      if (person.fleeTime > 0) {
        person.x = clamp(person.x + person.fleeX * 95 * dt, 8, CITY.width - 8);
        person.y = clamp(person.y + person.fleeY * 95 * dt, 8, CITY.height - 8);
        continue;
      }

      let remaining = person.speed * dt;
      while (remaining > 0) {
        const target = person.path[(person.waypoint + 1) % person.path.length];
        const dx = target.x - person.x;
        const dy = target.y - person.y;
        const gap = Math.hypot(dx, dy);
        if (gap <= remaining || gap < 0.01) {
          person.x = target.x;
          person.y = target.y;
          person.waypoint = (person.waypoint + 1) % person.path.length;
          remaining -= gap;
        } else {
          person.x += dx / gap * remaining;
          person.y += dy / gap * remaining;
          remaining = 0;
        }
      }
    }
    return notice;
  }

  function moveTraffic(dt) {
    for (const car of traffic) {
      let nearestAhead = Infinity;
      const axisX = car.axis === 'x' ? car.direction : 0;
      const axisY = car.axis === 'y' ? car.direction : 0;
      for (const other of [...traffic, ...police]) {
        if (other === car) continue;
        const dx = other.x - car.x;
        const dy = other.y - car.y;
        const ahead = dx * axisX + dy * axisY;
        const across = Math.abs(dx * axisY - dy * axisX);
        if (ahead > 0 && across < 34) nearestAhead = Math.min(nearestAhead, ahead);
      }
      const playerGap = distance(car, player);
      if (playerGap < 85) nearestAhead = Math.min(nearestAhead, Math.max(0, playerGap - 22));
      const targetSpeed = nearestAhead < 110 ? Math.max(0, 115 * (nearestAhead - 38) / 72) : 115;
      car.speed = car.speed < targetSpeed
        ? Math.min(targetSpeed, car.speed + 55 * dt)
        : Math.max(targetSpeed, car.speed - 150 * dt);
      if (car.axis === 'x') car.x = (car.x + car.direction * car.speed * dt + CITY.width) % CITY.width;
      else car.y = (car.y + car.direction * car.speed * dt + CITY.height) % CITY.height;
    }
  }

  function updatePolice(dt) {
    const count = wanted === 0 ? 0 : Math.min(3, Math.ceil(wanted / 2));
    while (police.length > count) police.pop();
    while (police.length < count) {
      const n = police.length;
      police.push({
        x: centers[(Math.round(player.x / CITY.pitch) + n + 1) % CITY.blocks],
        y: centers[(Math.round(player.y / CITY.pitch) + n + 2) % CITY.blocks],
        angle: 0, speed: 0, color: 5, siren: 0,
      });
    }

    for (const patrol of police) {
      const roadX = nearestCenter(player.x);
      const roadY = nearestCenter(player.y);
      const target = Math.abs(patrol.x - roadX) > 8 ? { x: roadX, y: patrol.y } : { x: roadX, y: roadY };
      if (Math.abs(patrol.x - target.x) > 3) {
        patrol.angle = target.x > patrol.x ? 0 : Math.PI;
        patrol.x += Math.sign(target.x - patrol.x) * Math.min(Math.abs(target.x - patrol.x), 155 * dt);
      } else if (Math.abs(patrol.y - target.y) > 3) {
        patrol.angle = target.y > patrol.y ? Math.PI / 2 : -Math.PI / 2;
        patrol.y += Math.sign(target.y - patrol.y) * Math.min(Math.abs(target.y - patrol.y), 155 * dt);
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
      if ((player.carIndex < 0 && gap < 32)
        || (player.carIndex >= 0 && gap < 47 && Math.abs(cars[player.carIndex].speed) < 70)) {
        if (player.carIndex >= 0) cars[player.carIndex].speed = 0;
        player.carIndex = -1;
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
    const target = mission.phase === 'pickup'
      ? mission.pickup
      : mission.type === 'passenger' ? mission.destination : mission.delivery;
    if (distance(cars[player.carIndex], target) > 72) return '';
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
      cash += 350;
      mission.type = 'delivery';
      persist();
      return 'Passenger delivered. Fare: $350.';
    }
    cash += mission.reward;
    mission.type = 'passenger';
    persist();
    return `Package delivered. Earned $${mission.reward}.`;
  }

  function drive(dt, direction) {
    const car = cars[player.carIndex];
    const throttle = direction.y < 0 ? 1 : direction.y > 0 ? -1 : 0;
    if (throttle > 0) car.speed = Math.min(CAR.maxSpeed, car.speed + CAR.acceleration * dt);
    else if (throttle < 0) car.speed = Math.max(-CAR.maxReverse, car.speed - CAR.reverseAcceleration * dt);
    else if (car.speed > 0) car.speed = Math.max(0, car.speed - CAR.friction * dt);
    else car.speed = Math.min(0, car.speed + CAR.friction * dt);
    const steering = Math.min(1, Math.abs(car.speed) / 45);
    car.angle += direction.x * CAR.steering * steering * dt * (car.speed < 0 ? -1 : 1);
    const nextX = car.x + Math.cos(car.angle) * car.speed * dt;
    const nextY = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!blocked(nextX, nextY, 24, player.carIndex)) {
      car.x = nextX;
      car.y = nextY;
    } else {
      car.speed = 0;
    }
    player.x = car.x;
    player.y = car.y;
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
      drive(dt, direction);
    }

    troubleTime += dt;
    if (wanted > 0 && troubleTime >= 18) {
      decayTime += dt;
      if (decayTime >= 14) { wanted -= 1; decayTime = 0; }
    }
    moveTraffic(dt);
    const pedestrianNotice = movePedestrians(dt);
    if (!message && pedestrianNotice) message = pedestrianNotice;
    const arrestNotice = updatePolice(dt);
    if (arrestNotice) message = arrestNotice;
    const missionNotice = updateMission(dt);
    if (!message && missionNotice) message = missionNotice;
    return message;
  }

  return {
    player, buildings, cars, traffic, pedestrians, police, mission, station, step,
    nearestCar: nearestParkedCar,
    save: persist,
    get completedMissions() { return completedMissions; },
    get bustFine() { return bustFine; },
    get wanted() { return wanted; },
    set wanted(level) { wanted = clamp(Math.floor(level), 0, 5); },
    get cash() { return cash; },
    get speed() { return player.carIndex < 0 ? 0 : cars[player.carIndex].speed; },
  };
}
