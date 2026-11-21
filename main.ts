import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outputSetting = process.env.MAKEFUN_OUTPUT_DIR;
if (!outputSetting) throw new Error('Set MAKEFUN_OUTPUT_DIR to the dossier destination.');
const output = resolve(outputSetting);
const screenshots = join(root, 'screenshots');
const manifestPath = join(root, 'shots.json');

function imageSize(bytes: Buffer, name: string) {
  const suffix = extname(name).toLowerCase();
  if (suffix === '.png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    if (bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.length < 24) {
      throw new Error(`screenshots/${name} has a malformed PNG header.`);
    }
    return { format: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (suffix !== '.jpg' && suffix !== '.jpeg') throw new Error(`screenshots/${name} must be a JPEG or PNG.`);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`screenshots/${name} is not a JPEG.`);

  const frames = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error(`screenshots/${name} has an invalid JPEG marker.`);
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (frames.has(marker)) {
      if (length < 7) break;
      return {
        format: 'jpeg',
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  throw new Error(`screenshots/${name} has no readable JPEG dimensions.`);
}

const shots = JSON.parse(readFileSync(manifestPath, 'utf8')) as Array<{ name: string; query: string }>;
if (!Array.isArray(shots) || shots.length !== 4) throw new Error('shots.json must list exactly four screenshots.');
const names = new Set<string>();
for (const shot of shots) {
  if (!shot || typeof shot.name !== 'string' || basename(shot.name) !== shot.name || names.has(shot.name)) {
    throw new Error('shots.json contains an invalid or repeated screenshot name.');
  }
  names.add(shot.name);
  if (typeof shot.query !== 'string' || !shot.query.startsWith('?shot=')) {
    throw new Error(`shots.json has no shot query for ${shot.name}.`);
  }
  const file = join(screenshots, shot.name);
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`Missing screenshot listed in shots.json: ${shot.name}`);
  const bytes = readFileSync(file);
  if (bytes.length > 256 * 1024) throw new Error(`${shot.name} exceeds 256 KiB (${bytes.length} bytes).`);
  const dimensions = imageSize(bytes, shot.name);
  if (dimensions.width < 1 || dimensions.height < 1
    || Math.max(dimensions.width, dimensions.height) > 1280
    || Math.min(dimensions.width, dimensions.height) < 480) {
    throw new Error(`${shot.name} dimensions ${dimensions.width}x${dimensions.height} are outside the allowed range.`);
  }
}
const unexpected = readdirSync(screenshots).filter((name) => !names.has(name));
if (unexpected.length) throw new Error(`Remove unlisted files from screenshots/: ${unexpected.join(', ')}`);

mkdirSync(output, { recursive: true });
for (const entry of ['game', 'screenshots']) {
  cpSync(join(root, entry), join(output, entry), { recursive: true });
}
for (const entry of ['shots.json', 'README.md']) {
  cpSync(join(root, entry), join(output, entry));
}
const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);
console.log(`Copied game/, screenshots/ (${names.size} validated images), shots.json, and README.md to ${output}`);
