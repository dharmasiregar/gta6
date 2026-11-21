export const CITY = {
  blocks: 4,
  blockSize: 520,
  roadWidth: 150,
  sidewalk: 32,
  get pitch() { return this.blockSize + this.roadWidth; },
  get width() { return this.blocks * this.pitch; },
  get height() { return this.blocks * this.pitch; },
};

export const PLAYER = { radius: 11, speed: 190 };
export const CAR = {
  width: 44,
  height: 24,
  acceleration: 250,
  reverseAcceleration: 160,
  maxSpeed: 340,
  maxReverse: 130,
  steering: 2.4,
  friction: 95,
};

export const PALETTE = {
  backdrop: '#18231f',
  grass: '#263c32',
  road: '#343a3d',
  roadLine: '#d3b86e',
  sidewalk: '#a9a89a',
  building: ['#b78662', '#9d7663', '#bd9b73', '#887b70', '#a88a72'],
  roof: ['#c49b78', '#aa8068', '#d0aa83', '#998779', '#b9997a'],
  player: '#58d8d0',
  car: ['#db785d', '#70a5cf', '#e4c36e', '#92b17a', '#b58ac3', '#e1e2d9'],
  glass: '#a8d1d2',
  text: '#f5f3e8',
  muted: '#c2c9bd',
  panel: 'rgba(20, 27, 25, 0.88)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
