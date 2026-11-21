import { cp, mkdir, readFile } from "node:fs/promises";
import { basename, dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const screenshotRoot = resolve(root, "screenshots");
const MAX_BYTES = 256 * 1024;
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function imageInfo(bytes, file) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(pngSignature) && bytes.toString("ascii", 12, 16) === "IHDR") {
    return { type: "PNG", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset < bytes.length - 3) {
      if (bytes[offset] !== 0xff) throw new Error(`${file}: malformed JPEG marker`);
      while (bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset];
      offset += 1;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 1 >= bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) throw new Error(`${file}: malformed JPEG segment`);
      if (SOF_MARKERS.has(marker)) {
        return {
          type: "JPEG",
          height: bytes.readUInt16BE(offset + 3),
          width: bytes.readUInt16BE(offset + 5),
        };
      }
      offset += length;
    }
  }
  throw new Error(`${file}: expected a JPEG or PNG image`);
}

async function validateScreenshots() {
  const manifestPath = resolve(root, "shots.json");
  const shots = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(shots) || shots.length === 0) throw new Error("shots.json must list screenshot entries");
  const seen = new Set();
  for (const shot of shots) {
    if (!shot || typeof shot.file !== "string" || typeof shot.query !== "string") {
      throw new Error("Each shot entry must have a file and query");
    }
    if (basename(shot.file) !== shot.file || seen.has(shot.file)) {
      throw new Error(`Invalid or duplicate screenshot name: ${shot.file}`);
    }
    seen.add(shot.file);
    const file = resolve(screenshotRoot, shot.file);
    if (!file.startsWith(screenshotRoot + sep)) throw new Error(`Screenshot path escapes screenshots/: ${shot.file}`);
    const bytes = await readFile(file);
    if (bytes.length > MAX_BYTES) throw new Error(`${shot.file}: exceeds 256 KiB`);
    const info = imageInfo(bytes, shot.file);
    const longSide = Math.max(info.width, info.height);
    const shortSide = Math.min(info.width, info.height);
    if (!info.width || !info.height || longSide > 1280 || shortSide < 480) {
      throw new Error(`${shot.file}: dimensions ${info.width}x${info.height} are out of range`);
    }
    console.log(`Validated screenshots/${shot.file}: ${info.type}, ${info.width}x${info.height}, ${bytes.length} bytes`);
  }
}

async function main() {
  const outputSetting = process.env.MAKEFUN_OUTPUT_DIR;
  if (!outputSetting) throw new Error("MAKEFUN_OUTPUT_DIR is required");
  await validateScreenshots();
  const output = resolve(root, outputSetting);
  if (output === root) throw new Error("MAKEFUN_OUTPUT_DIR cannot be the repository root");
  await mkdir(output, { recursive: true });
  for (const name of ["game", "screenshots"]) {
    const source = resolve(root, name);
    if (output === source || output.startsWith(source + sep)) {
      throw new Error(`MAKEFUN_OUTPUT_DIR cannot be inside ${name}/`);
    }
    await cp(source, resolve(output, name), { recursive: true, force: true });
    console.log(`Copied ${name}/ to ${output}`);
  }
  for (const name of ["shots.json", "README.md"]) {
    await cp(resolve(root, name), resolve(output, name), { force: true });
    console.log(`Copied ${name} to ${output}`);
  }
}

main().catch((error) => {
  console.error("Handover failed:", error);
  process.exitCode = 1;
});
