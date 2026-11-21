import { CONFIG, COLORS } from "./config.js";

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCity(ctx, world, camera) {
  rect(ctx, 0, 0, CONFIG.width, CONFIG.height, COLORS.grass);
  const unit = CONFIG.roadWidth + CONFIG.blockWidth;
  const startX = Math.floor(camera.x / unit) * unit - unit;
  const endX = camera.x + CONFIG.width + unit;
  const startY = Math.floor(camera.y / unit) * unit - unit;
  const endY = camera.y + CONFIG.height + unit;
  for (let x = startX; x <= endX; x += unit) {
    rect(ctx, x - camera.x, 0, CONFIG.roadWidth, CONFIG.height, COLORS.road);
    rect(ctx, x - camera.x + 7, 0, 10, CONFIG.height, COLORS.sidewalk);
    rect(ctx, x - camera.x + CONFIG.roadWidth - 17, 0, 10, CONFIG.height, COLORS.sidewalk);
    ctx.strokeStyle = COLORS.lane; ctx.setLineDash([18, 19]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - camera.x + CONFIG.roadWidth / 2, 0); ctx.lineTo(x - camera.x + CONFIG.roadWidth / 2, CONFIG.height); ctx.stroke();
  }
  for (let y = startY; y <= endY; y += unit) {
    rect(ctx, 0, y - camera.y, CONFIG.width, CONFIG.roadWidth, COLORS.road);
    rect(ctx, 0, y - camera.y + 7, CONFIG.width, 10, COLORS.sidewalk);
    rect(ctx, 0, y - camera.y + CONFIG.roadWidth - 17, CONFIG.width, 10, COLORS.sidewalk);
    ctx.strokeStyle = COLORS.lane; ctx.setLineDash([18, 19]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, y - camera.y + CONFIG.roadWidth / 2); ctx.lineTo(CONFIG.width, y - camera.y + CONFIG.roadWidth / 2); ctx.stroke();
  }
  ctx.setLineDash([]);
  for (let y = startY - unit; y < endY; y += unit) {
    for (let x = startX - unit; x < endX; x += unit) {
      const bx = x + CONFIG.roadWidth + 18 - camera.x;
      const by = y + CONFIG.roadWidth + 18 - camera.y;
      const seed = Math.abs(Math.floor(x / unit) * 17 + Math.floor(y / unit) * 31);
      rect(ctx, bx, by, CONFIG.blockWidth - 36, CONFIG.blockWidth - 36, COLORS.building[seed % COLORS.building.length]);
      rect(ctx, bx + 8, by + 8, CONFIG.blockWidth - 52, CONFIG.blockWidth - 52, "#10171128");
      for (let wy = by + 25; wy < by + CONFIG.blockWidth - 55; wy += 38) {
        for (let wx = bx + 23; wx < bx + CONFIG.blockWidth - 55; wx += 42) rect(ctx, wx, wy, 13, 9, "#d4c98755");
      }
      rect(ctx, bx + 20, by + CONFIG.blockWidth - 58, 42, 18, "#4e594d");
    }
  }
}

function drawCar(ctx, car, camera) {
  const x = car.x - camera.x, y = car.y - camera.y;
  ctx.save(); ctx.translate(x, y); ctx.rotate(car.angle);
  rect(ctx, -19, -10, 38, 20, "#121512");
  rect(ctx, -17, -8, 34, 16, car.police ? COLORS.police : car.color);
  rect(ctx, -5, -7, 12, 14, "#7d9994");
  if (car.police) {
    rect(ctx, -2, -11, 6, 3, "#e6504b");
    rect(ctx, 4, -11, 6, 3, "#4c8ed1");
  }
  ctx.restore();
}

function drawMinimap(world, canvas) {
  const ctx = canvas.getContext("2d");
  const sx = canvas.width / world.width, sy = canvas.height / world.height;
  rect(ctx, 0, 0, canvas.width, canvas.height, "#20362b");
  const unit = CONFIG.roadWidth + CONFIG.blockWidth;
  ctx.fillStyle = "#49504a";
  for (let x = 0; x < world.width; x += unit) ctx.fillRect(x * sx, 0, CONFIG.roadWidth * sx, canvas.height);
  for (let y = 0; y < world.height; y += unit) ctx.fillRect(0, y * sy, canvas.width, CONFIG.roadWidth * sy);
  if (world.mission) { ctx.fillStyle = "#f4d94c"; ctx.beginPath(); ctx.arc(world.mission.x * sx, world.mission.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const car of world.police) { ctx.fillStyle = "#e94b48"; ctx.fillRect(car.x * sx - 2, car.y * sy - 2, 4, 4); }
  ctx.fillStyle = "#f8eeae"; ctx.beginPath(); ctx.arc(world.player.x * sx, world.player.y * sy, 3, 0, Math.PI * 2); ctx.fill();
}

export function render(ctx, world, ui) {
  const canvas = ctx.canvas;
  const camera = {
    x: Math.max(0, Math.min(world.width - CONFIG.width, world.player.x - CONFIG.width / 2)),
    y: Math.max(0, Math.min(world.height - CONFIG.height, world.player.y - CONFIG.height / 2)),
  };
  drawCity(ctx, world, camera);
  if (world.mission) {
    const x = world.mission.x - camera.x, y = world.mission.y - camera.y;
    const pulse = 18 + Math.sin(world.time * 4) * 4;
    ctx.fillStyle = "#f2d84b55"; ctx.beginPath(); ctx.arc(x, y, pulse + 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#ffeb72"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fff4aa"; ctx.font = "bold 12px Arial"; ctx.fillText(world.mission.type === "delivery" ? "DELIVERY" : "PICKUP", x - 28, y - 28);
  }
  for (const ped of world.pedestrians) {
    ctx.fillStyle = ped.fleeing ? "#f5a66b" : "#dfc7ad";
    ctx.beginPath(); ctx.arc(ped.x - camera.x, ped.y - camera.y, 5, 0, Math.PI * 2); ctx.fill();
  }
  for (const car of world.cars) drawCar(ctx, car, camera);
  for (const car of world.police) drawCar(ctx, car, camera);
  if (world.player.carId === null) {
    const x = world.player.x - camera.x, y = world.player.y - camera.y;
    ctx.save(); ctx.translate(x, y); ctx.rotate(world.player.angle);
    ctx.fillStyle = COLORS.player; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -7); ctx.lineTo(-5, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  drawMinimap(world, ui.minimap);
  ui.cash.textContent = "$" + world.cash.toLocaleString("en-US");
  ui.wanted.textContent = "★".repeat(world.wanted) + "☆".repeat(5 - world.wanted);
  const playerCar = world.cars.find((car) => car.id === world.player.carId);
  ui.speed.textContent = `${playerCar ? Math.round(Math.abs(playerCar.speed) * 0.34) : 0} MPH`;
  ui.mission.textContent = world.mission ? `${world.mission.type.toUpperCase()}  ·  ${Math.ceil(world.mission.time)}s  ·  $${world.mission.reward}` : "NO JOB ACTIVE · E near a marker for work";
  ui.hint.textContent = world.toastTimer > 0 ? world.toast : playerCar ? "W/S accelerate · A/D steer · E exit · P pause" : "WASD / arrows move · E interact · F punch · P pause";
  if (canvas.width !== CONFIG.width || canvas.height !== CONFIG.height) {
    canvas.width = CONFIG.width; canvas.height = CONFIG.height;
  }
}
