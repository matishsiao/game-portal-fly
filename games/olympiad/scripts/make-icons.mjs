// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為霧藍紫漸層底，左上白色「＋」、右下白色「×」，中間一個米白色圓點；SVG 版本與大廳卡片圖示相同。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
/** 漸層起點與終點顏色（與遊戲主色相同）。 */
const BRAND_1 = [95, 106, 160];
const BRAND_2 = [74, 82, 127];
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
  // 左上「＋」：中心 (19, 19)，臂長 9、粗 5。
  const px = Math.abs(u - 19);
  const py = Math.abs(v - 19);
  if ((px < 2.5 && py < 9) || (py < 2.5 && px < 9)) return WHITE;
  // 右下「×」：中心 (37, 37)，兩條對角線，臂長 7.5、粗 5。
  const dx = u - 37;
  const dy = v - 37;
  if (Math.abs(dx) < 7.5 && Math.abs(dy) < 7.5 && (Math.abs(dx - dy) / Math.SQRT2 < 2.5 || Math.abs(dx + dy) / Math.SQRT2 < 2.5)) return WHITE;
  // 右上與左下的圓點。
  if (Math.hypot(u - 39, v - 17) < 4 || Math.hypot(u - 17, v - 39) < 4) return CREAM;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f6aa0"/><stop offset="1" stop-color="#4a527f"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><path d="M19 10v18M10 19h18" stroke="#fffdf8" stroke-width="5" stroke-linecap="round"/><path d="M31.7 31.7l10.6 10.6M42.3 31.7L31.7 42.3" stroke="#fffdf8" stroke-width="5" stroke-linecap="round"/><circle cx="39" cy="17" r="4" fill="#f3ead2"/><circle cx="17" cy="39" r="4" fill="#f3ead2"/></svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
