// 產生 PWA 圖示（PNG 與 SVG），只用 Node 內建模組，不需額外套件。
// 圖案為十字交叉的兩條算式：數字格為白色方塊，運算子以白色符號表示，交叉格以淡藍色標示。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [240, 140, 50];
const TILE = [255, 255, 255];
const CENTER = [188, 214, 245];
const LINE = [58, 62, 70];

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
 * 判斷格子內的相對座標 (u, v)（0～1）是否落在運算子符號上。
 * @param {string} symbol 運算子：'+'、'-' 或 '='。
 * @param {number} u 水平相對座標。
 * @param {number} v 垂直相對座標。
 * @returns {boolean} 屬於符號筆畫時為 true。
 */
function onSymbol(symbol, u, v) {
  const bar = 0.12;
  const inH = u > 0.2 && u < 0.8;
  const inV = v > 0.2 && v < 0.8;
  if (symbol === '+') return (inH && Math.abs(v - 0.5) < bar / 2) || (inV && Math.abs(u - 0.5) < bar / 2);
  if (symbol === '-') return inH && Math.abs(v - 0.5) < bar / 2;
  if (symbol === '=') return inH && (Math.abs(v - 0.36) < bar / 2 || Math.abs(v - 0.64) < bar / 2);
  return false;
}

/**
 * 取得十字圖案中某格的內容。
 * @param {number} row 列（0～4）。
 * @param {number} col 行（0～4）。
 * @returns {{kind: 'tile' | 'center' | 'symbol' | 'none', symbol?: string}} 格子內容。
 */
function cellAt(row, col) {
  const horizontal = ['tile', '+', 'center', '=', 'tile'];
  const vertical = ['tile', '-', 'center', '=', 'tile'];
  const pick = row === 2 ? horizontal[col] : col === 2 ? vertical[row] : null;
  if (!pick) return { kind: 'none' };
  if (pick === 'tile' || pick === 'center') return { kind: pick };
  return { kind: 'symbol', symbol: pick };
}

/**
 * 繪製圖示並編碼為 PNG。
 * @param {number} size 邊長像素。
 * @param {number} padRatio 圖案四周留白比例（maskable 需較大安全區）。
 * @returns {Buffer} PNG 檔案內容。
 */
function drawIcon(size, padRatio) {
  const pad = Math.round(size * padRatio);
  const area = size - pad * 2;
  const cell = area / 5;
  const gap = Math.max(1, Math.round(cell * 0.06));
  const border = Math.max(1, Math.round(size / 128));
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let color = BG;
      const ax = x - pad;
      const ay = y - pad;
      if (ax >= 0 && ay >= 0 && ax < area && ay < area) {
        const col = Math.min(4, Math.floor(ax / cell));
        const row = Math.min(4, Math.floor(ay / cell));
        const lx = ax - col * cell;
        const ly = ay - row * cell;
        const c = cellAt(row, col);
        const inside = lx >= gap && ly >= gap && lx < cell - gap && ly < cell - gap;
        if ((c.kind === 'tile' || c.kind === 'center') && inside) {
          const edge = lx < gap + border || ly < gap + border || lx >= cell - gap - border || ly >= cell - gap - border;
          color = edge ? LINE : c.kind === 'center' ? CENTER : TILE;
        } else if (c.kind === 'symbol' && onSymbol(c.symbol, lx / cell, ly / cell)) {
          color = TILE;
        }
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
 * 產生 SVG 版本的圖示（瀏覽器分頁用），與遊戲選單中的圖示一致。
 * @returns {string} SVG 內容。
 */
function drawSvg() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#f08c32"/>' +
    '<g font-family="sans-serif" font-weight="700" font-size="7.5" text-anchor="middle">' +
    '<rect x="4" y="24" width="48" height="9.6" fill="#fff"/><rect x="23.2" y="4" width="9.6" height="48" fill="#fff"/>' +
    '<path d="M13.6 24v9.6M23.2 24v9.6M32.8 24v9.6M42.4 24v9.6M23.2 13.6h9.6M23.2 42.4h9.6" stroke="#3a3e46" stroke-width="0.8"/>' +
    '<rect x="4" y="24" width="48" height="9.6" fill="none" stroke="#3a3e46" stroke-width="1.2"/>' +
    '<rect x="23.2" y="4" width="9.6" height="48" fill="none" stroke="#3a3e46" stroke-width="1.2"/>' +
    '<text x="8.8" y="31.4" fill="#22252b">3</text><text x="18.4" y="31.4" fill="#2f6db5">+</text>' +
    '<text x="28" y="31.4" fill="#22252b">4</text><text x="37.6" y="31.4" fill="#2f6db5">=</text>' +
    '<text x="47.2" y="31.4" fill="#22252b">7</text><text x="28" y="11.8" fill="#22252b">8</text>' +
    '<text x="28" y="21.4" fill="#2f6db5">−</text><text x="28" y="40.6" fill="#2f6db5">=</text>' +
    '<text x="28" y="50.2" fill="#22252b">4</text></g></svg>\n';
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0.1));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0.12));
writeFileSync(join(OUT, 'icon.svg'), drawSvg());
console.log(`圖示已輸出到 ${OUT}`);
