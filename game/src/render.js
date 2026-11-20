import { CAR, CITY, FONT, PALETTE } from './config.js';

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let ratio = 1;

  function resize() {
    ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }

  function drawRoads() {
    context.fillStyle = PALETTE.grass;
    context.fillRect(0, 0, CITY.width, CITY.height);
    for (let row = 0; row < CITY.blocks; row += 1) {
      for (let column = 0; column < CITY.blocks; column += 1) {
        const x = column * CITY.pitch;
        const y = row * CITY.pitch;
        context.fillStyle = PALETTE.road;
        context.fillRect(x, y, CITY.pitch, CITY.roadWidth);
        context.fillRect(x, y, CITY.roadWidth, CITY.pitch);

        context.fillStyle = PALETTE.sidewalk;
        context.fillRect(x + CITY.roadWidth, y + CITY.roadWidth, CITY.blockSize, CITY.sidewalk);
        context.fillRect(x + CITY.roadWidth, y + CITY.roadWidth, CITY.sidewalk, CITY.blockSize);
        context.fillRect(x + CITY.roadWidth, y + CITY.roadWidth + CITY.blockSize - CITY.sidewalk, CITY.blockSize, CITY.sidewalk);
        context.fillRect(x + CITY.roadWidth + CITY.blockSize - CITY.sidewalk, y + CITY.roadWidth, CITY.sidewalk, CITY.blockSize);

        context.strokeStyle = '#d1d0c3';
        context.lineWidth = 2;
        context.setLineDash([12, 12]);
        context.beginPath();
        context.moveTo(x + CITY.roadWidth, y + CITY.roadWidth + CITY.sidewalk);
        context.lineTo(x + CITY.roadWidth + CITY.blockSize, y + CITY.roadWidth + CITY.sidewalk);
        context.moveTo(x + CITY.roadWidth + CITY.sidewalk, y + CITY.roadWidth);
        context.lineTo(x + CITY.roadWidth + CITY.sidewalk, y + CITY.roadWidth + CITY.blockSize);
        context.stroke();
        context.setLineDash([]);

        context.strokeStyle = PALETTE.roadLine;
        context.lineWidth = 2;
        context.setLineDash([20, 22]);
        context.beginPath();
        context.moveTo(x + CITY.roadWidth / 2, y + 8);
        context.lineTo(x + CITY.roadWidth / 2, y + CITY.roadWidth - 8);
        context.moveTo(x + 8, y + CITY.roadWidth / 2);
        context.lineTo(x + CITY.roadWidth - 8, y + CITY.roadWidth / 2);
        context.stroke();
        context.setLineDash([]);
      }
    }
  }

  function drawBuildings(buildings) {
    for (const building of buildings) {
      context.fillStyle = '#1b2824';
      context.fillRect(building.x + 8, building.y + 10, building.width, building.height);
      context.fillStyle = PALETTE.building[building.color];
      context.fillRect(building.x, building.y, building.width, building.height);
      context.fillStyle = PALETTE.roof[building.color];
      context.fillRect(building.x + 8, building.y + 8, building.width - 16, building.height - 16);
      context.fillStyle = '#766754';
      context.fillRect(building.x + building.width * 0.42, building.y + building.height - 20, building.width * 0.16, 20);
      context.fillStyle = '#d8c6a5';
      for (let wx = building.x + 22; wx < building.x + building.width - 14; wx += 38) {
        context.fillRect(wx, building.y + 15, 13, 5);
        context.fillRect(wx, building.y + building.height - 22, 13, 5);
      }
    }
  }

  function drawCar(car, index, activeIndex) {
    context.save();
    context.translate(car.x, car.y);
    context.rotate(car.angle);
    context.fillStyle = '#1b2020';
    roundedRect(context, -CAR.width / 2, -CAR.height / 2, CAR.width, CAR.height, 6);
    context.fillStyle = PALETTE.car[car.color];
    roundedRect(context, -CAR.width / 2 + 2, -CAR.height / 2 + 2, CAR.width - 4, CAR.height - 4, 5);
    context.fillStyle = PALETTE.glass;
    roundedRect(context, -7, -CAR.height / 2 + 4, 15, CAR.height - 8, 3);
    context.fillStyle = '#262b2c';
    context.fillRect(-CAR.width / 2 + 7, -CAR.height / 2 - 2, 8, 3);
    context.fillRect(CAR.width / 2 - 15, -CAR.height / 2 - 2, 8, 3);
    context.fillRect(-CAR.width / 2 + 7, CAR.height / 2 - 1, 8, 3);
    context.fillRect(CAR.width / 2 - 15, CAR.height / 2 - 1, 8, 3);
    if (index === activeIndex) {
      context.strokeStyle = '#f6edbf';
      context.lineWidth = 2;
      context.strokeRect(-CAR.width / 2 - 2, -CAR.height / 2 - 2, CAR.width + 4, CAR.height + 4);
    }
    context.restore();
  }

  function drawPedestrian(pedestrian) {
    if (pedestrian.down) {
      context.fillStyle = '#37332e';
      context.beginPath();
      context.ellipse(pedestrian.x, pedestrian.y, 10, 5, 0, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.fillStyle = ['#e7a65b', '#a8c77e', '#d08075', '#9db9d2', '#d4c5a5'][pedestrian.color];
    context.beginPath();
    context.arc(pedestrian.x, pedestrian.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f1d2aa';
    context.beginPath();
    context.arc(pedestrian.x + 1, pedestrian.y - 5, 3, 0, Math.PI * 2);
    context.fill();
  }

  function drawPolice(patrol) {
    drawCar({ ...patrol, color: 5 }, -1, -2);
    context.save();
    context.translate(patrol.x, patrol.y);
    context.rotate(patrol.angle);
    context.fillStyle = Math.floor(patrol.siren * 8) % 2 ? '#f05252' : '#58c8ec';
    context.fillRect(-3, -CAR.height / 2 - 1, 7, 3);
    context.restore();
  }

  function drawMissionMarker(marker, label) {
    const pulse = 1 + Math.sin(performance.now() / 170) * 0.18;
    context.save();
    context.shadowColor = '#f6df78';
    context.shadowBlur = 22;
    context.fillStyle = 'rgba(246, 223, 120, 0.28)';
    context.beginPath();
    context.arc(marker.x, marker.y, 21 * pulse, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = '#ffef9c';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(marker.x, marker.y, 12 * pulse, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#fff2a4';
    context.font = `700 12px ${FONT}`;
    context.textAlign = 'center';
    context.fillText(label, marker.x, marker.y - 26);
    context.restore();
  }

  function drawPlayer(player) {
    context.fillStyle = '#102826';
    context.beginPath();
    context.arc(player.x, player.y + 3, 13, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f5e5bb';
    context.beginPath();
    context.arc(player.x + 3, player.y - 3, 3, 0, Math.PI * 2);
    context.fill();
  }

  function drawMinimap(world) {
    const mapWidth = Math.min(188, width * 0.34);
    const mapHeight = mapWidth * CITY.height / CITY.width;
    const x = width - mapWidth - 18;
    const y = 18;
    context.fillStyle = PALETTE.panel;
    roundedRect(context, x - 7, y - 7, mapWidth + 14, mapHeight + 14, 8);
    const scaleX = mapWidth / CITY.width;
    const scaleY = mapHeight / CITY.height;
    context.fillStyle = PALETTE.grass;
    context.fillRect(x, y, mapWidth, mapHeight);
    context.fillStyle = '#555c5d';
    for (let index = 0; index < CITY.blocks; index += 1) {
      context.fillRect(x + index * CITY.pitch * scaleX, y, CITY.roadWidth * scaleX, mapHeight);
      context.fillRect(x, y + index * CITY.pitch * scaleY, mapWidth, CITY.roadWidth * scaleY);
    }
    context.fillStyle = '#a58a70';
    for (const building of world.buildings) {
      context.fillRect(x + building.x * scaleX, y + building.y * scaleY, building.width * scaleX, building.height * scaleY);
    }
    const missionMarker = world.mission.phase === 'pickup' ? world.mission.pickup : world.mission.delivery;
    context.fillStyle = '#ffe778';
    context.shadowColor = '#ffe778';
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(x + missionMarker.x * scaleX, y + missionMarker.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#70bce5';
    for (const patrol of world.police) {
      context.fillRect(x + patrol.x * scaleX - 2, y + patrol.y * scaleY - 2, 4, 4);
    }
    const marker = world.player;
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(x + marker.x * scaleX, y + marker.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#f2f0db';
    context.lineWidth = 1;
    context.strokeRect(x, y, mapWidth, mapHeight);
  }

  function draw(world, message, nearCar) {
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, width, height);
    const target = world.player;
    const cameraX = Math.max(0, Math.min(CITY.width - width, target.x - width / 2));
    const cameraY = Math.max(0, Math.min(CITY.height - height, target.y - height / 2));
    context.save();
    context.translate(-cameraX, -cameraY);
    drawRoads();
    drawBuildings(world.buildings);
    const missionMarker = world.mission.phase === 'pickup' ? world.mission.pickup : world.mission.delivery;
    drawMissionMarker(missionMarker, world.mission.phase === 'pickup' ? 'PICKUP' : 'DELIVER');
    for (const pedestrian of world.pedestrians) drawPedestrian(pedestrian);
    for (let index = 0; index < world.cars.length; index += 1) drawCar(world.cars[index], index, world.player.carIndex);
    for (const car of world.traffic) drawCar(car, -1, -2);
    for (const patrol of world.police) drawPolice(patrol);
    if (world.player.carIndex < 0) drawPlayer(world.player);
    context.restore();

    context.font = `600 16px ${FONT}`;
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.panel;
    roundedRect(context, 18, 18, 300, 112, 10);
    context.fillStyle = PALETTE.text;
    context.textAlign = 'left';
    context.fillText(world.player.carIndex < 0 ? 'ON FOOT' : 'IN CAR', 32, 41);
    context.fillStyle = PALETTE.muted;
    const speed = Math.round(Math.abs(world.speed) * 0.36);
    context.fillText(`SPEED  ${speed} km/h`, 32, 67);
    context.fillStyle = '#f2d86c';
    context.fillText(`WANTED  ${'★'.repeat(world.wanted)}${'☆'.repeat(5 - world.wanted)}`, 32, 91);
    context.fillStyle = PALETTE.text;
    context.textAlign = 'right';
    context.fillText(`$${world.cash}`, 304, 41);
    context.textAlign = 'left';

    context.font = `500 13px ${FONT}`;
    context.fillStyle = PALETTE.panel;
    roundedRect(context, 18, height - 76, Math.min(width - 36, 560), 58, 7);
    context.fillStyle = PALETTE.muted;
    const missionText = world.mission.phase === 'pickup'
      ? 'MISSION  Drive to the glowing pickup'
      : `MISSION  Deliver package  ${Math.ceil(world.mission.timeLeft)}s`;
    context.fillText(missionText, 30, height - 57);
    context.fillText(message || (nearCar ? 'E  Get in car' : world.player.carIndex < 0 ? 'WASD / Arrows  Walk    E  Enter nearby car' : 'W/S  Drive    A/D  Steer    E  Get out'), 30, height - 35);
    drawMinimap(world);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
