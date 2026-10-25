// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為墨綠底上的 2 × 2 字格「一諾千金」，其中「諾」為待填的空格；SVG 版本與大廳卡片圖示相同。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [47, 122, 92];
const TILE = [255, 255, 255];
const BLANK = [214, 238, 225];
const EDGE = [23, 68, 51];

/** 四個字格：位置（以 56 × 56 的圖示座標表示）、字與是否為空格。 */
const TILES = [
  { x: 9, y: 9, ch: '一', blank: false },
  { x: 29, y: 9, ch: '諾', blank: true },
  { x: 9, y: 29, ch: '千', blank: false },
  { x: 29, y: 29, ch: '金', blank: false },
];
const TILE_SIZE = 18;
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
  for (const t of TILES) {
    const dx = u - t.x;
    const dy = v - t.y;
    if (dx < 0 || dy < 0 || dx >= TILE_SIZE || dy >= TILE_SIZE) continue;
    const edge = dx < 1 || dy < 1 || dx >= TILE_SIZE - 1 || dy >= TILE_SIZE - 1;
    if (edge) return EDGE;
    return t.blank ? BLANK : TILE;
  }
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
  const tiles = TILES.map(
    (t) =>
      `<rect x="${t.x}" y="${t.y}" width="${TILE_SIZE}" height="${TILE_SIZE}" rx="3" fill="${t.blank ? '#d6eee1' : '#fff'}" stroke="#174433" stroke-width="1"${t.blank ? ' stroke-dasharray="2 1.5"' : ''}/>` +
      `<text x="${t.x + TILE_SIZE / 2}" y="${t.y + 13.6}" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="${t.blank ? '#2f7a5c' : '#22252b'}">${t.ch}</text>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#2f7a5c"/>${tiles.join('')}</svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
