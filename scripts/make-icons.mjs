// 產生選單圖示：App 圖示（PNG、SVG）與各遊戲卡片用的 SVG 圖示，只用 Node 內建模組。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [47, 109, 181];
const TILE = [255, 255, 255];
const MARK = [58, 62, 70];
const ACCENT = [240, 140, 50];

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
 * 計算圖示上某一點的顏色：2 × 2 方塊，左上為數獨格線、右下為加號、其餘為純色。
 * @param {number} u 0～1 的橫向座標（已扣除留白）。
 * @param {number} v 0～1 的縱向座標（已扣除留白）。
 * @returns {number[]} RGB 顏色。
 */
function colorAt(u, v) {
  const gap = 0.08;
  const size = (1 - gap) / 2;
  const col = u < size ? 0 : u > size + gap ? 1 : -1;
  const row = v < size ? 0 : v > size + gap ? 1 : -1;
  if (col < 0 || row < 0) return BG;
  const x = (u - col * (size + gap)) / size;
  const y = (v - row * (size + gap)) / size;
  if (row === 0 && col === 0) {
    const line = (t) => Math.abs(t * 3 - Math.round(t * 3)) < 0.06 && t > 0.05 && t < 0.95;
    return line(x) || line(y) ? MARK : TILE;
  }
  if (row === 1 && col === 1) {
    const bar = (a, b) => Math.abs(a - 0.5) < 0.09 && b > 0.2 && b < 0.8;
    return bar(x, y) || bar(y, x) ? MARK : TILE;
  }
  return row === 0 ? ACCENT : TILE;
}

/**
 * 繪製 App 圖示並編碼為 PNG。
 * @param {number} size 邊長像素。
 * @param {number} padRatio 四周留白比例（maskable 需較大安全區）。
 * @returns {Buffer} PNG 檔案內容。
 */
function drawIcon(size, padRatio) {
  const pad = size * padRatio;
  const inner = size - pad * 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = (x - pad) / inner;
      const v = (y - pad) / inner;
      const color = u >= 0 && u < 1 && v >= 0 && v < 1 ? colorAt(u, v) : BG;
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

/** 選單 App 的 SVG 圖示。 */
const APP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#2f6db5"/><rect x="14" y="14" width="33" height="33" rx="4" fill="#fff"/><path d="M25 17v27M36 17v27M17 25h27M17 36h27" stroke="#3a3e46" stroke-width="2"/><rect x="53" y="14" width="33" height="33" rx="4" fill="#f08c32"/><rect x="14" y="53" width="33" height="33" rx="4" fill="#fff"/><rect x="53" y="53" width="33" height="33" rx="4" fill="#fff"/><path d="M69.5 60v19M60 69.5h19" stroke="#3a3e46" stroke-width="5"/></svg>\n`;

/** 數獨卡片圖示。 */
const SUDOKU_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#2f6db5"/><rect x="8" y="8" width="40" height="40" fill="#fff"/><path d="M12.4 8v40M16.9 8v40M25.8 8v40M30.2 8v40M39.1 8v40M43.6 8v40M8 12.4h40M8 16.9h40M8 25.8h40M8 30.2h40M8 39.1h40M8 43.6h40" stroke="#c9c2b4" stroke-width="0.6"/><path d="M21.3 8v40M34.7 8v40M8 21.3h40M8 34.7h40" stroke="#3a3e46" stroke-width="1.6"/><rect x="8" y="8" width="40" height="40" fill="none" stroke="#3a3e46" stroke-width="1.6"/><text x="14.6" y="19.5" font-size="8" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">5</text><text x="28" y="33" font-size="8" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#2a5ea3">3</text><text x="41.4" y="46.3" font-size="8" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">8</text></svg>\n`;

/** 數學填字卡片圖示：交叉的兩條算式。 */
const CROSSMATH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#f08c32"/><g font-family="sans-serif" font-weight="700" font-size="7.5" text-anchor="middle"><rect x="4" y="24" width="48" height="9.6" fill="#fff"/><rect x="23.2" y="4" width="9.6" height="48" fill="#fff"/><path d="M13.6 24v9.6M23.2 24v9.6M32.8 24v9.6M42.4 24v9.6M23.2 13.6h9.6M23.2 42.4h9.6" stroke="#3a3e46" stroke-width="0.8"/><rect x="4" y="24" width="48" height="9.6" fill="none" stroke="#3a3e46" stroke-width="1.2"/><rect x="23.2" y="4" width="9.6" height="48" fill="none" stroke="#3a3e46" stroke-width="1.2"/><text x="8.8" y="31.4" fill="#22252b">3</text><text x="18.4" y="31.4" fill="#2f6db5">+</text><text x="28" y="31.4" fill="#22252b">4</text><text x="37.6" y="31.4" fill="#2f6db5">=</text><text x="47.2" y="31.4" fill="#22252b">7</text><text x="28" y="11.8" fill="#22252b">8</text><text x="28" y="21.4" fill="#2f6db5">−</text><text x="28" y="40.6" fill="#2f6db5">=</text><text x="28" y="50.2" fill="#22252b">4</text></g></svg>\n`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0.1));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0.12));
writeFileSync(join(OUT, 'icon.svg'), APP_SVG);
writeFileSync(join(OUT, 'sudoku.svg'), SUDOKU_SVG);
writeFileSync(join(OUT, 'crossmath.svg'), CROSSMATH_SVG);
console.log(`圖示已輸出到 ${OUT}`);
