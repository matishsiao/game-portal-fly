// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為保險箱風格：深灰金屬底、黃銅外框的面板，面板上一排四顆密碼顏色，下方為回饋小點；SVG 版本與大廳卡片圖示相同。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [45, 48, 54];
const PANEL = [28, 30, 34];
const BRASS = [200, 162, 74];
const WHITE = [240, 240, 240];

/** 四顆密碼顏色（以 56 × 56 的圖示座標表示）。 */
const PEGS = [
  { x: 14, color: [229, 56, 59], hex: '#e5383b', n: '1' },
  { x: 23.3, color: [47, 111, 222], hex: '#2f6fde', n: '6' },
  { x: 32.7, color: [46, 158, 68], hex: '#2e9e44', n: '4' },
  { x: 42, color: [242, 193, 46], hex: '#f2c12e', n: '3' },
];
/** 回饋小點：兩個命中（實心白）、一個接近（空心）。 */
const DOTS = [
  { x: 22, fill: true },
  { x: 28, fill: true },
  { x: 34, fill: false },
];

/**
 * 計算 PNG 區塊使用的 CRC32。
 * @param {Buffer} buf 資料。
 * @returns {number} CRC32 值。
 */
function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

/**
 * 組成 PNG 區塊。
 * @param {string} type 區塊類型。
 * @param {Buffer} data 區塊資料。
 * @returns {Buffer} 完整區塊。
 */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * 取得圖示座標 (u, v)（0～56）上的顏色。
 * @param {number} u 水平座標。
 * @param {number} v 垂直座標。
 * @returns {number[]} RGB。
 */
function colorAt(u, v) {
  const inPanel = u >= 7 && u < 49 && v >= 14 && v < 42;
  const onFrame = inPanel && (u < 8.5 || u >= 47.5 || v < 15.5 || v >= 40.5);
  for (const p of PEGS) if (Math.hypot(u - p.x, v - 24) < 4) return p.color;
  for (const d of DOTS) {
    const r = Math.hypot(u - d.x, v - 34.5);
    if (d.fill ? r < 1.9 : r < 1.9 && r > 1.1) return WHITE;
  }
  if (onFrame) return BRASS;
  if (inPanel) return PANEL;
  return BG;
}

/**
 * 繪製圖示並編碼為 PNG。
 * @param {number} size 邊長像素。
 * @param {number} padRatio 圖案四周額外留白比例（maskable 需較大安全區）。
 * @returns {Buffer} PNG 檔案內容。
 */
function drawIcon(size, padRatio) {
  const pad = size * padRatio;
  const scale = 56 / (size - pad * 2);
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const color = colorAt((x + 0.5 - pad) * scale, (y + 0.5 - pad) * scale);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = color[0];
      raw[o + 1] = color[1];
      raw[o + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * 產生 SVG 版本的圖示（瀏覽器分頁與大廳卡片用）。
 * @returns {string} SVG 內容。
 */
function drawSvg() {
  const pegs = PEGS.map(
    (p) =>
      `<circle cx="${p.x}" cy="24" r="4" fill="${p.hex}"/><text x="${p.x}" y="25.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${p.n}</text>`,
  ).join('');
  const dots = DOTS.map((d) => `<circle cx="${d.x}" cy="34.5" r="1.6" ${d.fill ? 'fill="#f0f0f0"' : 'fill="none" stroke="#f0f0f0" stroke-width="0.8"'}/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b5058"/><stop offset="1" stop-color="#1f2226"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><rect x="7.75" y="14.75" width="40.5" height="26.5" rx="3" fill="#1c1e22" stroke="#c8a24a" stroke-width="1.5"/>${pegs}${dots}</svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
