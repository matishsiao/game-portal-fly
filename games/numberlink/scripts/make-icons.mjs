// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為 5 × 5 盤面上的三條彩色連線（青綠主色底），SVG 版本與大廳卡片圖示相同。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [24, 163, 155];
const BOARD = [255, 255, 255];
const GRID = [214, 220, 222];

/** 三條連線：顏色與折線頂點（以 56 × 56 的圖示座標表示，格子中心為 12 + 8 × 行列）。 */
const LINES = [
  { color: [229, 56, 59], hex: '#e5383b', label: '1', points: [[12, 12], [44, 12], [44, 28]] },
  { color: [47, 111, 222], hex: '#2f6fde', label: '2', points: [[12, 20], [12, 44], [28, 44]] },
  { color: [46, 158, 68], hex: '#2e9e44', label: '3', points: [[20, 20], [36, 20], [36, 36]] },
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
 * 計算點到線段的距離。
 * @param {number} x 點的 x。
 * @param {number} y 點的 y。
 * @param {number[]} a 線段起點。
 * @param {number[]} b 線段終點。
 * @returns {number} 距離。
 */
function distToSegment(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

/**
 * 取得圖示座標 (u, v)（0～56）上的顏色。
 * @param {number} u 水平座標。
 * @param {number} v 垂直座標。
 * @returns {number[]} RGB。
 */
function colorAt(u, v) {
  if (u < 8 || v < 8 || u >= 48 || v >= 48) return BG;
  for (const line of LINES) {
    const pts = line.points;
    if (Math.hypot(u - pts[0][0], v - pts[0][1]) < 3.4) return line.color;
    if (Math.hypot(u - pts[pts.length - 1][0], v - pts[pts.length - 1][1]) < 3.4) return line.color;
    for (let k = 1; k < pts.length; k++) if (distToSegment(u, v, pts[k - 1], pts[k]) < 1.6) return line.color;
  }
  const gx = (u - 8) % 8;
  const gy = (v - 8) % 8;
  if (gx < 0.35 || gy < 0.35) return GRID;
  return BOARD;
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
  const grid = [];
  for (let k = 1; k < 5; k++) grid.push(`M${8 + k * 8} 8v40M8 ${8 + k * 8}h40`);
  const lines = LINES.map((l) => {
    const d = l.points.map(([x, y], k) => `${k ? 'L' : 'M'}${x} ${y}`).join('');
    const [s, e] = [l.points[0], l.points[l.points.length - 1]];
    const dot = ([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="3.6" fill="${l.hex}"/><text x="${x}" y="${y + 1.9}" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${l.label}</text>`;
    return `<path d="${d}" fill="none" stroke="${l.hex}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>${dot(s)}${dot(e)}`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#18a39b"/><rect x="8" y="8" width="40" height="40" rx="2" fill="#fff"/><path d="${grid.join('')}" stroke="#d6dcde" stroke-width="0.6"/>${lines.join('')}</svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
