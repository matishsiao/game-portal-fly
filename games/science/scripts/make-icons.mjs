// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為苔綠漸層底上的白色嫩芽（莖與兩片葉子）與左上角的米白太陽；SVG 版本與大廳卡片圖示相同。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
/** 漸層起點與終點顏色（與遊戲主色相同）。 */
const BRAND_1 = [95, 122, 82];
const BRAND_2 = [75, 100, 64];
/** 嫩芽顏色。 */
const WHITE = [255, 253, 248];
/** 太陽顏色（米白）。 */
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
 * 點 (u, v) 是否在旋轉過的橢圓內。
 * @param {number} u 水平座標。
 * @param {number} v 垂直座標。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 長半軸。
 * @param {number} ry 短半軸。
 * @param {number} angle 旋轉角度（弧度）。
 * @returns {boolean} 在內部時為 true。
 */
function inEllipse(u, v, cx, cy, rx, ry, angle) {
  const dx = u - cx;
  const dy = v - cy;
  const x = dx * Math.cos(angle) + dy * Math.sin(angle);
  const y = -dx * Math.sin(angle) + dy * Math.cos(angle);
  return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
}

/**
 * 取得圖示座標 (u, v)（0～56）上的顏色。
 * @param {number} u 水平座標。
 * @param {number} v 垂直座標。
 * @returns {number[]} RGB。
 */
function colorAt(u, v) {
  // 莖：中央的直條，下方地面一條橫線。
  if (Math.abs(u - 28) < 2 && v > 24 && v < 46) return WHITE;
  if (Math.abs(v - 46) < 1.6 && u > 14 && u < 42) return WHITE;
  // 兩片葉子。
  if (inEllipse(u, v, 20, 24, 9, 4.6, Math.PI / 6)) return WHITE;
  if (inEllipse(u, v, 36, 20, 9, 4.6, -Math.PI / 5)) return WHITE;
  // 左上角的太陽。
  if (Math.hypot(u - 11, v - 10) < 4.5) return CREAM;
  const t = Math.min(1, Math.max(0, (u + v) / 112));
  return BRAND_1.map((x, i) => Math.round(x + (BRAND_2[i] - x) * t));
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f7a52"/><stop offset="1" stop-color="#4b6440"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><path d="M28 24v22M14 46h28" stroke="#fffdf8" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="20" cy="24" rx="9" ry="4.6" transform="rotate(30 20 24)" fill="#fffdf8"/><ellipse cx="36" cy="20" rx="9" ry="4.6" transform="rotate(-36 36 20)" fill="#fffdf8"/><circle cx="11" cy="10" r="4.5" fill="#f3ead2"/></svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
