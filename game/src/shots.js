import { CITY } from './config.js';

const ROAD_CENTER_Y = CITY.pitch + CITY.roadWidth / 2;
const DRIVE_X = [CITY.pitch + 335, CITY.width / 2, CITY.width - CITY.pitch - 335];
const WALK_X = [CITY.pitch + 280, CITY.width / 2 + 280, CITY.width - CITY.pitch + 280];

function setPlayerCar(world, x, y, speed) {
  const carIndex = 0;
  const car = world.cars[carIndex];
  car.x = x;
  car.y = y;
  car.angle = 0;
  car.speed = speed;
  world.player.carIndex = carIndex;
  world.player.x = x;
  world.player.y = y;
}

export function stageShot(scene, seed, world) {
  const variant = Math.abs(seed) % DRIVE_X.length;

  if (scene === 'start') return 'start';

  if (scene === 'chase') {
    const x = DRIVE_X[variant];
    setPlayerCar(world, x, ROAD_CENTER_Y, 260);
    world.wanted = 4;
    world.police.push(
      { x: x - 68, y: ROAD_CENTER_Y, angle: 0, speed: 155, color: 5, siren: 0.25 },
      { x: x - 138, y: ROAD_CENTER_Y, angle: 0, speed: 155, color: 5, siren: 0.75 },
    );
    world.mission.pickup = { x: x + 280, y: ROAD_CENTER_Y };
    return 'playing';
  }

  if (scene === 'drive') {
    const x = DRIVE_X[variant];
    setPlayerCar(world, x, ROAD_CENTER_Y, 190);
    world.mission.pickup = { x: x + 210, y: ROAD_CENTER_Y };
    return 'playing';
  }

  if (scene === 'mission') {
    const x = WALK_X[variant];
    world.player.x = x;
    world.player.y = ROAD_CENTER_Y - 59;
    world.mission.pickup = { x: x + 42, y: ROAD_CENTER_Y - 59 };
    return 'playing';
  }

  return '';
}
