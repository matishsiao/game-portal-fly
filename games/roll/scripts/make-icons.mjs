// 產生 PWA 圖示（PNG 與 SVG）：上方天空藍、下方草地綠，中間是像素畫小精靈滾滾。只用 Node 內建模組。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PIXEL_PALETTE, PLAYER_PIXELS, pixelSvg } from '../src/js/sprites.js';

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
 * 兩個顏色線性混合。
 * @param {number[]} a 顏色 A。
 * @param {number[]} b 顏色 B。
 * @param {number} t 0～1。
 * @returns {number[]} 混合色。
 */
function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/**
 * 把 #rrggbb 轉成 RGB 陣列。
 * @param {string} h 十六進位色碼。
 * @returns {number[]} RGB。
 */
function hex(h) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/**
 * 計算圖示上某一點的顏色（u、v 為 0～1 的相對座標）。
 * @param {number} u 橫向。
 * @param {number} v 縱向。
 * @param {number} pad 安全區比例（maskable 用較大值縮小主體）。
 * @returns {number[]} RGB。
 */
function colorAt(u, v, pad) {
  const ground = 0.68;
  let c = v < ground ? mix([79, 179, 232], [168, 220, 246], v / ground) : v < ground + 0.04 ? [92, 184, 92] : mix([63, 154, 74], [44, 112, 52], (v - ground) / (1 - ground));
  // 滾滾：像素畫小精靈，站在草地上。
  const size = 0.5 * (1 - pad * 1.2);
  const left = 0.5 - size / 2;
  const top = ground + 0.03 - size;
  if (u >= left && u < left + size && v >= top && v < top + size) {
    const px = Math.floor(((u - left) / size) * 16);
    const py = Math.floor(((v - top) / size) * 16);
    const ch = PLAYER_PIXELS.normal[py][px];
    if (PIXEL_PALETTE[ch]) c = hex(PIXEL_PALETTE[ch]);
  }
  // 雲朵。
  const cloud = (x, y, s) => Math.hypot((u - x) / 1.8, v - y) < s;
  if (cloud(0.25, 0.2 + pad * 0.3, 0.06) || cloud(0.32, 0.17 + pad * 0.3, 0.05)) c = mix(c, [255, 255, 255], 0.75);
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
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 瀏覽器分頁與大廳卡片用的 SVG 圖示：天空、草地、木箱與像素畫小精靈。 */
export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb3e8"/><stop offset="1" stop-color="#a8dcf6"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9a4a"/><stop offset="1" stop-color="#2c7034"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#s)"/><path d="M0 38 H56 V44 Q56 56 44 56 H12 Q0 56 0 44Z" fill="url(#g)"/><rect y="38" width="56" height="2.5" fill="#5cb85c"/><ellipse cx="13" cy="11" rx="7" ry="3" fill="#fff" opacity=".75"/><ellipse cx="17" cy="9" rx="5" ry="3" fill="#fff" opacity=".75"/><rect x="39" y="28" width="10" height="10" rx="1.5" fill="#c8894a" stroke="#7a4b1e" stroke-width="1.5"/><path d="M40.5 29.5 L47.5 36.5 M47.5 29.5 L40.5 36.5" stroke="#8f5a2b" stroke-width="1.5"/>${pixelSvg(PLAYER_PIXELS.normal).replace('<svg ', '<svg x="11" y="15" width="24" height="24" ').replace(' aria-hidden="true"', '')}</svg>\n`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), ICON_SVG);
console.log(`圖示已輸出到 ${OUT}`);
