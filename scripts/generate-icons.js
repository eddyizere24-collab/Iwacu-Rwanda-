// Script to generate valid 192x192 and 512x512 PNG icons for IWACU RWANDA PWA
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, drawFn) {
  // RGBA buffer: width * height * 4 bytes
  // PNG raw scanline has 1 filter byte (0) followed by width * 4 bytes
  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(lineSize * height);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = lineOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression method: 0
  ihdr[11] = 0; // Filter method: 0
  ihdr[12] = 0; // Interlace: 0

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = crc32(chunk.subarray(4, 8 + data.length));
    chunk.writeInt32BE(crc, 8 + data.length);
    return chunk;
  }

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return ~crc;
}

// Brand color palette (Rwanda Flag: Sky Blue #00A1DE, Yellow #E5A823, Green #20603D)
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = w * 0.46;

  // Background rounded rectangle or circle
  if (dist > maxR) {
    // Transparent outside
    return [0, 0, 0, 0];
  }

  // Background: Rich royal blue gradient
  const grad = y / h;
  let r = Math.round(0 + grad * 10);
  let g = Math.round(130 + grad * 30);
  let b = Math.round(220 - grad * 20);

  // Center golden sun disc
  const sunR = w * 0.22;
  if (dist < sunR) {
    // Golden Sun
    return [245, 175, 25, 255];
  }

  // Sun rays
  if (dist >= sunR && dist <= w * 0.38) {
    const angle = Math.atan2(dy, dx);
    const rayCount = 24;
    const rayAngle = ((angle + Math.PI) / (2 * Math.PI)) * rayCount;
    const rayFraction = rayAngle - Math.floor(rayAngle);
    if (rayFraction > 0.25 && rayFraction < 0.75) {
      // Ray color
      return [250, 195, 45, 240];
    }
  }

  // Bottom green band
  if (y > h * 0.75) {
    return [32, 120, 60, 255];
  }

  return [r, g, b, 255];
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPNG(192, 192, drawIcon));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPNG(512, 512, drawIcon));

console.log('Successfully generated public/icons/icon-192.png and icon-512.png');
