import { CAR, CITY, FONT, PALETTE } from './config.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function rounded(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function buttonsFor(width, height, canContinue) {
  const y = height / 2 + (canContinue ? 176 : 145);
  return {
    continue: canContinue ? { x: width / 2 - 115, y: y - 55, width: 230, height: 44 } : null,
    start: { x: width / 2 - 115, y, width: 230, height: 44 },
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let pixelRatio = 1;

  function resize() {
    pixelRatio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }

  function drawCity() {
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
        context.setLineDash([20, 22]);
        context.strokeStyle = PALETTE.roadLine;
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

  function drawBuildings(blocks) {
    for (const building of blocks) {
      context.fillStyle = '#1b2824';
      context.fillRect(building.x + 8, building.y + 10, building.width, building.height);
      context.fillStyle = PALETTE.building[building.color];
      context.fillRect(building.x, building.y, building.width, building.height);
      context.fillStyle = PALETTE.roof[building.color];
      context.fillRect(building.x + 8, building.y + 8, building.width - 16, building.height - 16);
      context.fillStyle = '#766754';
      context.fillRect(building.x + building.width * 0.42, building.y + building.height - 20, building.width * 0.16, 20);
      context.fillStyle = '#d8c6a5';
      for (let x = building.x + 22; x < building.x + building.width - 14; x += 38) {
        context.fillRect(x, building.y + 15, 13, 5);
        context.fillRect(x, building.y + building.height - 22, 13, 5);
      }
    }
  }

  function drawCar(car, active = false) {
    context.save();
    context.translate(car.x, car.y);
    context.rotate(car.angle);
    context.fillStyle = '#1b2020';
    rounded(context, -CAR.width / 2, -CAR.height / 2, CAR.width, CAR.height, 6);
    context.fillStyle = PALETTE.car[car.color];
    rounded(context, -CAR.width / 2 + 2, -CAR.height / 2 + 2, CAR.width - 4, CAR.height - 4, 5);
    context.fillStyle = PALETTE.glass;
    rounded(context, -7, -CAR.height / 2 + 4, 15, CAR.height - 8, 3);
    context.fillStyle = '#262b2c';
    for (const side of [-1, 1]) {
      context.fillRect(-CAR.width / 2 + 7, side * (CAR.height / 2 - 1), 8, 3);
      context.fillRect(CAR.width / 2 - 15, side * (CAR.height / 2 - 1), 8, 3);
    }
    if (active) {
      context.strokeStyle = '#f6edbf';
      context.lineWidth = 2;
      context.strokeRect(-CAR.width / 2 - 2, -CAR.height / 2 - 2, CAR.width + 4, CAR.height + 4);
    }
    context.restore();
  }

  function drawPerson(person) {
    if (person.down) {
      context.fillStyle = '#37332e';
      context.beginPath();
      context.ellipse(person.x, person.y, 10, 5, 0, 0, Math.PI * 2);
      context.fill();
      return;
    }
    context.fillStyle = ['#e7a65b', '#a8c77e', '#d08075', '#9db9d2', '#d4c5a5'][person.color];
    context.beginPath();
    context.arc(person.x, person.y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#f1d2aa';
    context.beginPath();
    context.arc(person.x + 1, person.y - 5, 3, 0, Math.PI * 2);
    context.fill();
  }

  function drawPolice(patrol) {
    drawCar({ ...patrol, color: 5 });
    context.save();
    context.translate(patrol.x, patrol.y);
    context.rotate(patrol.angle);
    context.fillStyle = Math.floor(patrol.siren * 8) % 2 ? '#f05252' : '#58c8ec';
    context.fillRect(-3, -CAR.height / 2 - 1, 7, 3);
    context.restore();
  }

  function markerPosition(world) {
    return world.mission.phase === 'pickup'
      ? world.mission.pickup
      : world.mission.type === 'passenger' ? world.mission.destination : world.mission.delivery;
  }

  function drawMarker(marker, label, clock) {
    const pulse = 1 + Math.sin(clock / 170) * 0.18;
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

  function drawMap(world) {
    const mapWidth = Math.min(188, width * 0.34);
    const mapHeight = mapWidth * CITY.height / CITY.width;
    const x = width - mapWidth - 18;
    const y = 18;
    context.fillStyle = PALETTE.panel;
    rounded(context, x - 7, y - 7, mapWidth + 14, mapHeight + 14, 8);
    const scaleX = mapWidth / CITY.width;
    const scaleY = mapHeight / CITY.height;
    context.fillStyle = PALETTE.grass;
    context.fillRect(x, y, mapWidth, mapHeight);
    context.fillStyle = '#555c5d';
    for (let i = 0; i < CITY.blocks; i += 1) {
      context.fillRect(x + i * CITY.pitch * scaleX, y, CITY.roadWidth * scaleX, mapHeight);
      context.fillRect(x, y + i * CITY.pitch * scaleY, mapWidth, CITY.roadWidth * scaleY);
    }
    context.fillStyle = '#a58a70';
    for (const building of world.buildings) {
      context.fillRect(x + building.x * scaleX, y + building.y * scaleY, building.width * scaleX, building.height * scaleY);
    }
    const mission = markerPosition(world);
    context.fillStyle = '#ffe778';
    context.shadowColor = '#ffe778';
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(x + mission.x * scaleX, y + mission.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = '#70bce5';
    for (const patrol of world.police) context.fillRect(x + patrol.x * scaleX - 2, y + patrol.y * scaleY - 2, 4, 4);
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(x + world.player.x * scaleX, y + world.player.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#f2f0db';
    context.lineWidth = 1;
    context.strokeRect(x, y, mapWidth, mapHeight);
  }

  function drawButton(rect, label, highlight = false) {
    context.fillStyle = highlight ? '#58d8d0' : 'rgba(255,255,255,0.12)';
    rounded(context, rect.x, rect.y, rect.width, rect.height, 9);
    context.fillStyle = highlight ? '#102826' : PALETTE.text;
    context.font = `700 16px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
  }

  function drawOverlay(mode, world, canContinue, fine) {
    context.fillStyle = 'rgba(9, 15, 17, 0.82)';
    context.fillRect(0, 0, width, height);
    const panelWidth = Math.min(560, width - 32);
    const panelHeight = mode === 'start' ? 510 : 340;
    const x = (width - panelWidth) / 2;
    const y = (height - panelHeight) / 2;
    context.fillStyle = PALETTE.panel;
    rounded(context, x, y, panelWidth, panelHeight, 18);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    if (mode === 'start') {
      context.fillStyle = PALETTE.text;
      context.font = `800 46px ${FONT}`;
      context.fillText('Sidegrid', width / 2, y + 68);
      context.fillStyle = '#f2d86c';
      context.font = `600 17px ${FONT}`;
      context.fillText('Every turn has a price. Every street has a story.', width / 2, y + 112);
      context.fillStyle = PALETTE.muted;
      context.font = `500 14px ${FONT}`;
      context.fillText('WASD / Arrows  Move   ·   E  Enter / exit / steal', width / 2, y + 177);
      context.fillText('W / S  Drive   ·   A / D  Steer   ·   F  Punch', width / 2, y + 207);
      context.fillText('P  Pause   ·   Enter  Start', width / 2, y + 237);
      const buttons = buttonsFor(width, height, canContinue);
      if (buttons.continue) drawButton(buttons.continue, 'Continue', true);
      drawButton(buttons.start, 'Start', !canContinue);
      context.fillStyle = PALETTE.muted;
      context.font = `500 12px ${FONT}`;
      context.fillText('A small city is waiting. Make your own route through it.', width / 2, y + panelHeight - 22);
      return;
    }

    context.fillStyle = mode === 'busted' ? '#f27770' : PALETTE.text;
    context.font = `800 36px ${FONT}`;
    context.fillText(mode === 'busted' ? 'BUSTED' : 'PAUSED', width / 2, y + 67);
    context.fillStyle = PALETTE.text;
    context.font = `600 18px ${FONT}`;
    if (mode === 'busted') {
      context.fillText(`Fine paid: $${fine}`, width / 2, y + 135);
      context.fillText('Press Enter to get back on the street', width / 2, y + 205);
    } else {
      context.fillText('WASD / Arrows  Walk   ·   E  Enter / exit / steal', width / 2, y + 132);
      context.fillText('W / S  Drive   ·   A / D  Steer   ·   F  Punch', width / 2, y + 166);
      context.fillText('P  Resume', width / 2, y + 218);
    }
  }

  function draw(world, message, nearCar, mode = 'playing', canContinue = false, fine = 0, clock = performance.now()) {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, width, height);
    const cameraX = clamp(world.player.x - width / 2, 0, CITY.width - width);
    const cameraY = clamp(world.player.y - height / 2, 0, CITY.height - height);
    context.save();
    context.translate(-cameraX, -cameraY);
    drawCity();
    drawBuildings(world.buildings);
    const label = world.mission.phase === 'pickup'
      ? (world.mission.type === 'passenger' ? 'PASSENGER' : 'PICKUP')
      : (world.mission.type === 'passenger' ? 'DROP OFF' : 'DELIVER');
    drawMarker(markerPosition(world), label, clock);
    world.pedestrians.forEach(drawPerson);
    world.cars.forEach((car, index) => drawCar(car, index === world.player.carIndex));
    world.traffic.forEach((car) => drawCar(car));
    world.police.forEach(drawPolice);
    if (world.player.carIndex < 0) drawPlayer(world.player);
    context.restore();

    context.font = `600 16px ${FONT}`;
    context.textBaseline = 'middle';
    context.fillStyle = PALETTE.panel;
    rounded(context, 18, 18, 300, 136, 10);
    context.fillStyle = PALETTE.text;
    context.textAlign = 'left';
    context.fillText(world.player.carIndex < 0 ? 'ON FOOT' : 'IN CAR', 32, 41);
    context.fillStyle = PALETTE.muted;
    context.fillText(`SPEED  ${Math.round(Math.abs(world.speed) * 0.36)} km/h`, 32, 67);
    context.fillStyle = '#f2d86c';
    context.fillText(`WANTED  ${'★'.repeat(world.wanted)}${'☆'.repeat(5 - world.wanted)}`, 32, 91);
    context.fillStyle = PALETTE.text;
    context.textAlign = 'right';
    context.fillText(`$${world.cash}`, 304, 41);
    context.fillStyle = PALETTE.muted;
    context.textAlign = 'left';
    context.fillText(`MISSIONS  ${world.completedMissions}`, 32, 116);

    context.font = `500 13px ${FONT}`;
    context.fillStyle = PALETTE.panel;
    rounded(context, 18, height - 76, Math.min(width - 36, 560), 58, 7);
    context.fillStyle = PALETTE.muted;
    const missionText = world.mission.phase === 'pickup'
      ? `MISSION  ${world.mission.type === 'passenger' ? 'Pick up passenger' : 'Drive to the glowing pickup'}`
      : `MISSION  ${world.mission.type === 'passenger' ? 'Drop off passenger' : 'Deliver package'}  ${Math.ceil(world.mission.timeLeft)}s`;
    context.fillText(missionText, 30, height - 57);
    context.fillText(message || (nearCar
      ? 'E  Get in car'
      : world.player.carIndex < 0 ? 'WASD / Arrows  Walk    E  Enter car    F  Punch' : 'W/S  Drive    A/D  Steer    E  Get out'), 30, height - 35);
    drawMap(world);
    if (mode !== 'playing') drawOverlay(mode, world, canContinue, fine);
  }

  function menuAction(x, y, canContinue) {
    const buttons = buttonsFor(width, height, canContinue);
    const inside = (button) => button && x >= button.x && x <= button.x + button.width
      && y >= button.y && y <= button.y + button.height;
    if (inside(buttons.continue)) return 'continue';
    return inside(buttons.start) ? 'start' : '';
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, menuAction };
}
