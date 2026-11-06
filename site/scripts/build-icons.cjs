#!/usr/bin/env node
/* Build the PWA icons from the app's dark field and green radar mark. No network. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgb) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    rgb.copy(raw, row + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function draw(size, maskable) {
  const rgb = Buffer.alloc(size * size * 3);
  const bg = [7, 13, 12];
  const green = [57, 240, 160];
  const amber = [255, 178, 77];
  function set(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, bg);
  const cx = (size - 1) / 2, cy = (size - 1) / 2;
  const scale = maskable ? 0.58 : 0.74;
  function ring(rad, w) {
    const r = rad * scale;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (Math.abs(d - r) <= w) set(x, y, green);
    }
  }
  ring(size * 0.18, Math.max(1.2, size * 0.01));
  ring(size * 0.30, Math.max(1.2, size * 0.01));
  ring(size * 0.42, Math.max(1.4, size * 0.012));
  const len = size * 0.42 * scale;
  const lw = Math.max(1.4, size * 0.014);
  const ang = -Math.PI / 5;
  const steps = Math.ceil(len * 2);
  for (let i = 0; i <= steps; i++) {
    const x = cx + Math.cos(ang) * (len * i / steps);
    const y = cy + Math.sin(ang) * (len * i / steps);
    for (let oy = -lw; oy <= lw; oy++) for (let ox = -lw; ox <= lw; ox++) {
      if (ox * ox + oy * oy <= lw * lw) set(x + ox, y + oy, green);
    }
  }
  const dot = size * 0.04;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (Math.hypot(x - cx, y - cy) <= dot) set(x, y, amber);
  }
  return encodePNG(size, rgb);
}

const dir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), draw(192, false));
fs.writeFileSync(path.join(dir, 'icon-512.png'), draw(512, false));
fs.writeFileSync(path.join(dir, 'icon-maskable-512.png'), draw(512, true));
fs.writeFileSync(path.join(dir, 'apple-touch-icon.png'), draw(180, false));
console.log('icons written', dir);
