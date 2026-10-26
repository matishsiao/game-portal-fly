// 產生 PWA 圖示（PNG 與 SVG）：天藍到湖水綠的底色上，兩張卡片以一條線相連。只用 Node 內建模組。
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
  let c = [58 + (34 - 58) * t, 167 + (179 - 167) * t, 224 + (154 - 224) * t].map(Math.round);
  const s = 1 - pad;
  const x = (u - 0.5) / s + 0.5;
  const y = (v - 0.5) / s + 0.5;
  const left = [0.12, 0.22, 0.3, 0.22, 0.05];
  const right = [0.58, 0.56, 0.3, 0.22, 0.05];
  // 兩張卡片之間的連線。
  const lx1 = 0.42;
  const ly1 = 0.33;
  const lx2 = 0.58;
  const ly2 = 0.67;
  const tt = Math.max(0, Math.min(1, ((x - lx1) * (lx2 - lx1) + (y - ly1) * (ly2 - ly1)) / ((lx2 - lx1) ** 2 + (ly2 - ly1) ** 2)));
  const d = Math.hypot(x - (lx1 + tt * (lx2 - lx1)), y - (ly1 + tt * (ly2 - ly1)));
  if (d < 0.025) c = [255, 255, 255];
  if (inRoundRect(x, y, left) || inRoundRect(x, y, right)) c = [255, 255, 255];
  // 卡片上的文字線條。
  const bar = (r, color) => {
    if (inRoundRect(x, y, [r[0] + 0.05, r[1] + 0.07, r[2] - 0.1, 0.035, 0.015]) || inRoundRect(x, y, [r[0] + 0.05, r[1] + 0.13, r[2] - 0.16, 0.03, 0.015])) c = color;
  };
  bar(left, [42, 149, 204]);
  bar(right, [34, 160, 130]);
  if (Math.hypot(x - lx1, y - ly1) < 0.04 || Math.hypot(x - lx2, y - ly2) < 0.04) c = [255, 214, 92];
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

/** 瀏覽器分頁與大廳卡片用的 SVG 圖示：英文卡片「A」與中文卡片「中」以線相連。 */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3aa7e0"/><stop offset="1" stop-color="#22b39a"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><path d="M23.5 18.5 L32.5 37.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><rect x="6" y="9" width="18" height="18" rx="4" fill="#fff"/><rect x="32" y="29" width="18" height="18" rx="4" fill="#fff"/><circle cx="23.5" cy="18.5" r="2.4" fill="#ffd65c"/><circle cx="32.5" cy="37.5" r="2.4" fill="#ffd65c"/><text x="15" y="23.5" font-family="Georgia, serif" font-weight="700" font-size="13" text-anchor="middle" fill="#2a95cc">A</text><text x="41" y="43" font-family="sans-serif" font-weight="700" font-size="11.5" text-anchor="middle" fill="#22a082">中</text></svg>\n`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), ICON_SVG);
console.log(`圖示已輸出到 ${OUT}`);
