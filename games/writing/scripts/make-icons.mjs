// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為墨綠底的筆記本，白色書頁與米白橫線。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
/** 漸層起點與終點顏色（與遊戲主色相同）。 */
const BRAND_1 = [82, 123, 112];
const BRAND_2 = [54, 93, 85];
/** 符號顏色。 */
const WHITE = [255, 253, 248];
/** 圓點顏色（米白）。 */
const CREAM = [243, 234, 210];

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
  // 打開的筆記本：中央書脊與左右書頁。
  if (u > 11 && u < 45 && v > 12 && v < 43) {
    if (Math.abs(u - 28) < 1 || v < 14 || v > 41 || u < 13 || u > 43) return WHITE;
    if ((v > 21 && v < 23 || v > 29 && v < 31) && (u > 16 && u < 24 || u > 32 && u < 40)) return CREAM;
  }
  const t = Math.min(1, Math.max(0, (u + v) / 112));
  return BRAND_1.map((c, i) => Math.round(c + (BRAND_2[i] - c) * t));
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#365d55"/><path d="M12 13h32v29H12zM28 13v29M16 22h8m8 0h8M16 30h8m8 0h8" fill="none" stroke="#fffdf8" stroke-width="2"/></svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
