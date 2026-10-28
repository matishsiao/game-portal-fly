// 產生 PWA 圖示（PNG 與 SVG）：葡萄紫到桃紅的底色上，三塊字母方塊排在一列，下方是金色的答案空格線。只用 Node 內建模組。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');

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
 * @param {Buffer} data 資料。
 * @returns {Buffer} 區塊。
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
 * 判斷點是否在圓角矩形內。
 * @param {number} u 橫座標（0～1）。
 * @param {number} v 縱座標（0～1）。
 * @param {number[]} r 矩形 [x, y, w, h, 圓角]。
 * @returns {boolean} 在內部時為 true。
 */
function inRoundRect(u, v, [x, y, w, h, rad]) {
  if (u < x || v < y || u > x + w || v > y + h) return false;
  const cx = Math.min(Math.max(u, x + rad), x + w - rad);
  const cy = Math.min(Math.max(v, y + rad), y + h - rad);
  return Math.hypot(u - cx, v - cy) <= rad;
}

/**
 * 計算圖示上某一點的顏色。
 * @param {number} u 橫向（0～1）。
 * @param {number} v 縱向（0～1）。
 * @param {number} pad 主體縮放（maskable 用較大安全區）。
 * @returns {number[]} RGB。
 */
function colorAt(u, v, pad) {
  const t = (u + v) / 2;
  let c = [124 + (217 - 124) * t, 92 + (70 - 92) * t, 240 + (143 - 240) * t].map(Math.round);
  const s = 1 - pad;
  const x = (u - 0.5) / s + 0.5;
  const y = (v - 0.5) / s + 0.5;
  // 三塊字母方塊（白色、帶深色底邊）與方塊上的字母筆畫。
  for (const left of [0.1, 0.38, 0.66]) {
    const tile = [left, 0.24, 0.24, 0.28, 0.05];
    if (inRoundRect(x, y, [left, 0.27, 0.24, 0.28, 0.05])) c = [86, 60, 180];
    if (inRoundRect(x, y, tile)) c = [255, 255, 255];
    if (inRoundRect(x, y, [left + 0.06, 0.31, 0.12, 0.035, 0.015]) || inRoundRect(x, y, [left + 0.06, 0.39, 0.08, 0.035, 0.015])) c = [124, 92, 240];
  }
  // 答案空格線。
  if (inRoundRect(x, y, [0.12, 0.7, 0.2, 0.05, 0.02]) || inRoundRect(x, y, [0.4, 0.7, 0.2, 0.05, 0.02]) || inRoundRect(x, y, [0.68, 0.7, 0.2, 0.05, 0.02])) c = [255, 214, 92];
  return c;
}

/**
 * 繪製圖示並編碼為 PNG。
 * @param {number} size 邊長。
 * @param {number} pad 安全區比例。
 * @returns {Buffer} PNG。
 */
function drawIcon(size, pad) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const c = colorAt((x + 0.5) / size, (y + 0.5) / size, pad);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** 瀏覽器分頁與大廳卡片用的 SVG 圖示：三塊字母方塊「A」「B」「C」與下方的金色答案空格線。 */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cf0"/><stop offset="1" stop-color="#d9468f"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><g font-family="Menlo, monospace" font-weight="700" font-size="11" text-anchor="middle" fill="#7c5cf0"><rect x="5.5" y="15" width="13" height="15" rx="3" fill="#563cb4"/><rect x="5.5" y="13" width="13" height="15" rx="3" fill="#fff"/><text x="12" y="24.5">A</text><rect x="21.5" y="15" width="13" height="15" rx="3" fill="#563cb4"/><rect x="21.5" y="13" width="13" height="15" rx="3" fill="#fff"/><text x="28" y="24.5">B</text><rect x="37.5" y="15" width="13" height="15" rx="3" fill="#563cb4"/><rect x="37.5" y="13" width="13" height="15" rx="3" fill="#fff"/><text x="44" y="24.5">C</text></g><g fill="#ffd65c"><rect x="6.5" y="39" width="11" height="3" rx="1.5"/><rect x="22.5" y="39" width="11" height="3" rx="1.5"/><rect x="38.5" y="39" width="11" height="3" rx="1.5"/></g></svg>\n`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), ICON_SVG);
console.log(`圖示已輸出到 ${OUT}`);
