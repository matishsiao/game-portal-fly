// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [47, 109, 181];
const BOARD = [255, 255, 255];
const LINE = [58, 62, 70];
const THIN = [201, 194, 180];
const FILL = [188, 214, 245];

/** 預先填色的格子（列, 行），讓圖示看起來像進行中的盤面。 */
const FILLED = [[0, 0], [1, 4], [2, 7], [3, 2], [4, 4], [5, 6], [6, 1], [7, 4], [8, 8]];

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
 * 繪製圖示並編碼為 PNG。
 * @param {number} size 邊長像素。
 * @param {number} padRatio 棋盤四周留白比例（maskable 需較大安全區）。
 * @returns {Buffer} PNG 檔案內容。
 */
function drawIcon(size, padRatio) {
  const pad = Math.round(size * padRatio);
  const boardSize = size - pad * 2;
  const cell = boardSize / 9;
  const thick = Math.max(2, Math.round(size / 64));
  const thin = Math.max(1, Math.round(size / 192));
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let color = BG;
      const bx = x - pad;
      const by = y - pad;
      if (bx >= 0 && by >= 0 && bx < boardSize && by < boardSize) {
        const col = Math.min(8, Math.floor(bx / cell));
        const row = Math.min(8, Math.floor(by / cell));
        color = FILLED.some(([r, c]) => r === row && c === col) ? FILL : BOARD;
        const nearX = Math.round(bx / cell);
        const nearY = Math.round(by / cell);
        const dx = Math.abs(bx - nearX * cell);
        const dy = Math.abs(by - nearY * cell);
        if ((nearX % 3 === 0 && dx < thick) || (nearY % 3 === 0 && dy < thick)) color = LINE;
        else if (dx < thin || dy < thin) color = THIN;
      }
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
 * 產生 SVG 版本的圖示（瀏覽器分頁用）。
 * @returns {string} SVG 內容。
 */
function drawSvg() {
  const lines = [];
  for (let k = 1; k < 9; k++) {
    const p = 12 + (k * 76) / 9;
    const w = k % 3 === 0 ? 2.4 : 0.8;
    const color = k % 3 === 0 ? '#3a3e46' : '#c9c2b4';
    lines.push(`<line x1="${p}" y1="12" x2="${p}" y2="88" stroke="${color}" stroke-width="${w}"/>`);
    lines.push(`<line x1="12" y1="${p}" x2="88" y2="${p}" stroke="${color}" stroke-width="${w}"/>`);
  }
  const fills = FILLED.map(([r, c]) => `<rect x="${12 + (c * 76) / 9}" y="${12 + (r * 76) / 9}" width="${76 / 9}" height="${76 / 9}" fill="#bcd6f5"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#2f6db5"/><rect x="12" y="12" width="76" height="76" fill="#fff"/>${fills.join('')}${lines.join('')}<rect x="12" y="12" width="76" height="76" fill="none" stroke="#3a3e46" stroke-width="2.4"/></svg>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0.1));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0.12));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
