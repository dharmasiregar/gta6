import { CONFIG, COLORS } from "./config.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const randomFrom = (rng, list) => list[Math.floor(rng() * list.length)];

export function makeRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function isRoad(x, y) {
  const { roadWidth, blockWidth } = CONFIG;
  return x % (roadWidth + blockWidth) < roadWidth || y % (roadWidth + blockWidth) < roadWidth;
}

export function createWorld(seed = 1) {
  const rng = makeRandom(seed);
  const world = {
    width: CONFIG.worldWidth, height: CONFIG.worldHeight, rng, time: 0,
    player: { x: 168, y: 168, angle: 0, health: 100, carId: null },
    cars: [], pedestrians: [], police: [], wanted: 0, cash: 250,
    mission: null, missionsDone: 0, status: "playing", bustTimer: 0,
    toast: "", toastTimer: 0, lastAction: 0,
  };
  let id = 1;
  for (let roadY = 0; roadY < world.height; roadY += CONFIG.roadWidth + CONFIG.blockWidth) {
    for (let x = 155; x < world.width; x += 210) {
      world.cars.push({
        id: id++, x: x + rng() * 28, y: roadY + 27 + rng() * 52,
        angle: rng() < 0.5 ? 0 : Math.PI, speed: 0,
        color: randomFrom(rng, COLORS.traffic), parked: rng() < 0.52,
        stolen: false, police: false,
      });
    }
  }
  for (let i = 0; i < 38; i += 1) {
    const x = 30 + rng() * (world.width - 60);
    const y = Math.floor(rng() * (world.height / 400)) * 400 + 10 + rng() * 92;
    world.pedestrians.push({ id: i + 1, x, y, angle: rng() * Math.PI * 2, speed: 12 + rng() * 17, cash: 8 + Math.floor(rng() * 38), fleeing: 0 });
  }
  world.trafficClock = 0;
  world.nextTrafficId = id;
  return world;
}

function roadDirection(x, y) {
  const unit = CONFIG.roadWidth + CONFIG.blockWidth;
  const onVertical = x % unit < CONFIG.roadWidth;
  if (onVertical) return Math.PI / 2;
  return 0;
}

function addWanted(world, amount = 1) {
  world.wanted = clamp(world.wanted + amount, 0, 5);
  world.toast = "WITNESSED — WANTED LEVEL RISING";
  world.toastTimer = 2.2;
}

function nearest(target, list, maxDistance) {
  return list.reduce((best, item) => {
    const d = distance(target, item);
    return d < maxDistance && (!best || d < best.distance) ? { item, distance: d } : best;
  }, null)?.item ?? null;
}

function interact(world) {
  const player = world.player;
  const nearbyCar = nearest(player, world.cars.filter((car) => !car.police), 52);
  if (player.carId !== null) {
    const car = world.cars.find((item) => item.id === player.carId);
    if (car) {
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 29;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 29;
      car.speed = 0;
    }
    player.carId = null;
    return;
  }
  if (nearbyCar) {
    player.carId = nearbyCar.id;
    if (!nearbyCar.stolen) {
      nearbyCar.stolen = true;
      addWanted(world, 1);
    }
    return;
  }
  const marker = world.mission?.x != null ? world.mission : null;
  if (marker && distance(player, marker) < 52) {
    world.cash += world.mission.reward;
    world.missionsDone += 1;
    world.mission = null;
    world.toast = "MISSION COMPLETE — CASH RECEIVED";
    world.toastTimer = 3;
    return;
  }
  if (!world.mission) {
    const rng = world.rng;
    world.mission = {
      type: rng() < 0.5 ? "delivery" : "passenger",
      x: 120 + rng() * (world.width - 240),
      y: 120 + rng() * (world.height - 240),
      reward: 125 + Math.floor(rng() * 76),
      time: CONFIG.missionSeconds,
    };
  }
}

function punch(world) {
  if (world.player.carId !== null) return;
  const pedestrian = nearest(world.player, world.pedestrians, 58);
  if (!pedestrian || world.time - world.lastAction < 0.28) return;
  world.lastAction = world.time;
  pedestrian.fleeing = 5;
  pedestrian.angle = Math.atan2(pedestrian.y - world.player.y, pedestrian.x - world.player.x);
  world.cash += pedestrian.cash;
  addWanted(world, 1);
}

function movePlayer(world, input, dt) {
  const p = world.player;
  const x = Number(input.isDown("d", "arrowright")) - Number(input.isDown("a", "arrowleft"));
  const y = Number(input.isDown("s", "arrowdown")) - Number(input.isDown("w", "arrowup"));
  if (p.carId !== null) {
    const car = world.cars.find((item) => item.id === p.carId);
    if (!car) { p.carId = null; return; }
    const throttle = Number(input.isDown("w", "arrowup")) - Number(input.isDown("s", "arrowdown"));
    const steer = Number(input.isDown("d", "arrowright")) - Number(input.isDown("a", "arrowleft"));
    car.speed = clamp(car.speed + throttle * 185 * dt, -120, CONFIG.carMaxSpeed);
    car.speed *= Math.pow(0.985, dt * 60);
    car.angle += steer * (0.95 + Math.min(Math.abs(car.speed) / 180, 0.8)) * dt * Math.sign(car.speed || 1);
    car.x = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 18, world.width - 18);
    car.y = clamp(car.y + Math.sin(car.angle) * car.speed * dt, 18, world.height - 18);
    p.x = car.x; p.y = car.y; p.angle = car.angle;
    return;
  }
  if (!x && !y) return;
  const magnitude = Math.hypot(x, y);
  const vx = x / magnitude, vy = y / magnitude;
  p.angle = Math.atan2(vy, vx);
  const nx = clamp(p.x + vx * CONFIG.playerSpeed * dt, 12, world.width - 12);
  const ny = clamp(p.y + vy * CONFIG.playerSpeed * dt, 12, world.height - 12);
  p.x = nx; p.y = ny;
}

function moveTraffic(world, dt) {
  world.trafficClock += dt;
  if (world.trafficClock > 1.9) {
    world.trafficClock = 0;
    if (world.rng() < 0.78) {
      const vertical = world.rng() < 0.5;
      const car = {
        id: world.nextTrafficId++, x: vertical ? 166 + Math.floor(world.rng() * 6) * 400 : 0,
        y: vertical ? 0 : 166 + Math.floor(world.rng() * 4) * 400,
        angle: vertical ? Math.PI / 2 : 0, speed: 45 + world.rng() * 25,
        color: randomFrom(world.rng, COLORS.traffic), parked: false, stolen: false, police: false,
      };
      world.cars.push(car);
    }
  }
  for (const car of world.cars) {
    if (car.parked || car.police || car.id === world.player.carId) continue;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (car.x < 0 || car.x > world.width || car.y < 0 || car.y > world.height) {
      car.x = clamp(car.x, 0, world.width);
      car.y = clamp(car.y, 0, world.height);
      car.angle = roadDirection(car.x, car.y);
      if (car.x === 0 || car.x === world.width) car.angle = Math.PI;
      if (car.y === 0 || car.y === world.height) car.angle = -Math.PI / 2;
    }
  }
}

function updatePolice(world, dt) {
  const wantedCount = world.wanted > 0 ? Math.min(world.wanted, 3) : 0;
  while (world.police.length < wantedCount) {
    const angle = world.rng() * Math.PI * 2;
    world.police.push({
      id: world.nextTrafficId++, x: clamp(world.player.x + Math.cos(angle) * 360, 20, world.width - 20),
      y: clamp(world.player.y + Math.sin(angle) * 360, 20, world.height - 20),
      angle: Math.atan2(world.player.y - (world.player.y + Math.sin(angle) * 360), world.player.x - (world.player.x + Math.cos(angle) * 360)),
      speed: 105, color: COLORS.police, parked: false, stolen: false, police: true,
    });
  }
  while (world.police.length > wantedCount) world.police.pop();
  for (const car of world.police) {
    const dx = world.player.x - car.x, dy = world.player.y - car.y;
    const targetAngle = Math.atan2(dy, dx);
    let turn = ((targetAngle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    car.angle += clamp(turn, -1.5 * dt, 1.5 * dt);
    car.speed = 105 + world.wanted * 8;
    car.x = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 16, world.width - 16);
    car.y = clamp(car.y + Math.sin(car.angle) * car.speed * dt, 16, world.height - 16);
    if (distance(car, world.player) < (world.player.carId === null ? 25 : 31)) {
      world.status = "busted";
      world.bustTimer = 0;
      world.cash = Math.max(0, world.cash - 100);
      world.player.carId = null;
      break;
    }
  }
}

function updatePedestrians(world, dt) {
  for (const ped of world.pedestrians) {
    if (ped.fleeing > 0) ped.fleeing = Math.max(0, ped.fleeing - dt);
    else if (world.rng() < dt * 0.6) ped.angle += (world.rng() - 0.5) * 1.8;
    const speed = ped.speed * (ped.fleeing ? 2.5 : 1);
    ped.x = clamp(ped.x + Math.cos(ped.angle) * speed * dt, 10, world.width - 10);
    ped.y = clamp(ped.y + Math.sin(ped.angle) * speed * dt, 10, world.height - 10);
    const vehicle = world.cars.find((car) => car.speed > 50 && !car.police && distance(car, ped) < 20);
    if (vehicle) {
      ped.fleeing = 4;
      ped.angle = Math.atan2(ped.y - vehicle.y, ped.x - vehicle.x);
      addWanted(world, 1);
    }
  }
}

export function stepWorld(world, input, dt) {
  if (world.status !== "playing") return;
  const frame = Math.min(dt, 0.05);
  world.time += frame;
  world.toastTimer = Math.max(0, world.toastTimer - frame);
  movePlayer(world, input, frame);
  moveTraffic(world, frame);
  updatePedestrians(world, frame);
  updatePolice(world, frame);
  if (world.mission) {
    world.mission.time -= frame;
    if (world.mission.time <= 0) {
      world.mission = null;
      world.toast = "MISSION TIMED OUT";
      world.toastTimer = 2.5;
    } else if (distance(world.player, world.mission) < 34 && input.consume("e")) {
      world.cash += world.mission.reward;
      world.missionsDone += 1;
      world.toast = "MISSION COMPLETE — CASH RECEIVED";
      world.toastTimer = 3;
      world.mission = null;
    }
  }
  if (input.consume("e")) interact(world);
  if (input.consume("f")) punch(world);
  if (world.wanted > 0 && world.time % 42 < frame && world.police.every((car) => distance(car, world.player) > 500)) world.wanted -= 1;
}

export function createShotWorld(scene, seed = 1) {
  const world = createWorld(seed);
  world.status = scene === "start" ? "start" : "playing";
  if (scene === "chase") {
    world.player.x = 660; world.player.y = 420; world.player.angle = 0;
    world.cars.push({ id: world.nextTrafficId++, x: 660, y: 420, angle: 0, speed: 210, color: "#b94c3e", parked: false, stolen: true, police: false });
    world.player.carId = world.cars.at(-1).id;
    world.wanted = 4;
    world.police = [
      { id: world.nextTrafficId++, x: 515, y: 380, angle: 0, speed: 145, color: COLORS.police, parked: false, stolen: false, police: true },
      { id: world.nextTrafficId++, x: 470, y: 458, angle: 0, speed: 145, color: COLORS.police, parked: false, stolen: false, police: true },
    ];
    world.mission = { type: "delivery", x: 1050, y: 420, reward: 175, time: 27 };
  } else if (scene === "drive") {
    world.player.x = 665; world.player.y = 416; world.player.angle = 0;
    const car = world.cars.find((item) => item.parked);
    if (car) { car.x = 665; car.y = 416; car.angle = 0; car.parked = false; car.speed = 145; world.player.carId = car.id; }
    world.cars.push({ id: world.nextTrafficId++, x: 845, y: 415, angle: 0, speed: 45, color: "#d0aa47", parked: false, stolen: false, police: false });
    world.cars.push({ id: world.nextTrafficId++, x: 500, y: 502, angle: Math.PI, speed: 50, color: "#427a87", parked: false, stolen: false, police: false });
  } else if (scene === "mission") {
    world.player.x = 656; world.player.y = 410; world.player.angle = 0;
    world.mission = { type: "delivery", x: 692, y: 422, reward: 175, time: 33 };
  }
  world.cash = 1840;
  return world;
}

export function getWorldGeometry() {
  return { roadWidth: CONFIG.roadWidth, blockWidth: CONFIG.blockWidth, colors: COLORS };
}
