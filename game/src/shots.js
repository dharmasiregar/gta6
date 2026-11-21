import { CITY } from './config.js';
import { createRandom } from './random.js';

const ROAD_Y = CITY.pitch + CITY.roadWidth / 2;
const DRIVE_STARTS = [CITY.pitch + 335, CITY.width / 2, CITY.width - CITY.pitch - 335];
const WALK_STARTS = [CITY.pitch + 280, CITY.width / 2 + 280, CITY.width - CITY.pitch + 280];

function takeWheel(world, x, y, speed) {
  const car = world.cars[0];
  car.x = x;
  car.y = y;
  car.angle = 0;
  car.speed = speed;
  world.player.carIndex = 0;
  world.player.x = x;
  world.player.y = y;
}

export function stageShot(scene, seed, world) {
  const index = Math.floor(createRandom(seed)() * DRIVE_STARTS.length);
  if (scene === 'start') return 'start';

  if (scene === 'chase') {
    const x = DRIVE_STARTS[index];
    takeWheel(world, x, ROAD_Y, 260);
    world.wanted = 4;
    world.police.push(
      { x: x - 68, y: ROAD_Y, angle: 0, speed: 155, color: 5, siren: 0.25 },
      { x: x - 138, y: ROAD_Y, angle: 0, speed: 155, color: 5, siren: 0.75 },
    );
    world.mission.pickup = { x: x + 280, y: ROAD_Y };
    return 'playing';
  }
  if (scene === 'drive') {
    const x = DRIVE_STARTS[index];
    takeWheel(world, x, ROAD_Y, 190);
    world.mission.pickup = { x: x + 210, y: ROAD_Y };
    return 'playing';
  }
  if (scene === 'mission') {
    const x = WALK_STARTS[index];
    world.player.x = x;
    world.player.y = ROAD_Y - 59;
    world.mission.pickup = { x: x + 42, y: ROAD_Y - 59 };
    return 'playing';
  }
  return '';
}
