// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為像素風斜劍：酒紅到深紫的漸層底，劍刃銀色、護手金色；SVG 版本與大廳卡片圖示相同。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
/** 漸層起點與終點顏色（左上酒紅、右下深紫）。 */
const FROM = [158, 42, 58];
const TO = [58, 29, 79];

/** 12 × 12 的像素劍：S 劍刃亮面、D 劍刃暗面、G 金色護手、B 握柄。 */
const SPRITE = [
  '..........SS',
  '.........SDS',
  '........SDS.',
  '.......SDS..',
  '......SDS...',
  '.....SDS....',
  '.G..SDS.....',
  '.GGSDS......',
  '..GGS.......',
  '..BGG.......',
  '.B..GG......',
  'B...........',
];
const PALETTE = { S: [240, 240, 240], D: [154, 163, 181], G: [232, 184, 74], B: [107, 66, 38] };
const HEX = { S: '#f0f0f0', D: '#9aa3b5', G: '#e8b84a', B: '#6b4226' };
/** 像素大小與左上角位置（56 × 56 的圖示座標）。 */
const PX = 3.5;
const OX = 7;
const OY = 7;

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
 * 取得圖示座標 (u, v)（0～56）上的顏色：像素劍或漸層底色。
 * @param {number} u 水平座標。
 * @param {number} v 垂直座標。
 * @returns {number[]} RGB。
 */
function colorAt(u, v) {
  const i = Math.floor((u - OX) / PX);
  const j = Math.floor((v - OY) / PX);
  const ch = SPRITE[j]?.[i];
  if (ch && PALETTE[ch]) return PALETTE[ch];
  const t = Math.max(0, Math.min(1, (u + v) / 112));
  return FROM.map((c, k) => Math.round(c + (TO[k] - c) * t));
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
  const rects = [];
  SPRITE.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (HEX[ch]) rects.push(`<rect x="${OX + i * PX}" y="${OY + j * PX}" width="${PX}" height="${PX}" fill="${HEX[ch]}"/>`);
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" shape-rendering="crispEdges"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9e2a3a"/><stop offset="1" stop-color="#3a1d4f"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/>${rects.join('')}</svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
