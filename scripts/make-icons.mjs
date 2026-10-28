// 產生選單圖示：App 圖示（PNG、SVG）與各遊戲卡片用的 SVG 圖示，只用 Node 內建模組。
// 用法：node scripts/make-icons.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'icons');
const BG = [47, 109, 181];
const TILE = [255, 255, 255];
const MARK = [58, 62, 70];
const ACCENT = [240, 140, 50];

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
 * 計算圖示上某一點的顏色：2 × 2 方塊，左上為數獨格線、右下為加號、其餘為純色。
 * @param {number} u 0～1 的橫向座標（已扣除留白）。
 * @param {number} v 0～1 的縱向座標（已扣除留白）。
 * @returns {number[]} RGB 顏色。
 */
function colorAt(u, v) {
  const gap = 0.08;
  const size = (1 - gap) / 2;
  const col = u < size ? 0 : u > size + gap ? 1 : -1;
  const row = v < size ? 0 : v > size + gap ? 1 : -1;
  if (col < 0 || row < 0) return BG;
  const x = (u - col * (size + gap)) / size;
  const y = (v - row * (size + gap)) / size;
  if (row === 0 && col === 0) {
    const line = (t) => Math.abs(t * 3 - Math.round(t * 3)) < 0.06 && t > 0.05 && t < 0.95;
    return line(x) || line(y) ? MARK : TILE;
  }
  if (row === 1 && col === 1) {
    const bar = (a, b) => Math.abs(a - 0.5) < 0.09 && b > 0.2 && b < 0.8;
    return bar(x, y) || bar(y, x) ? MARK : TILE;
  }
  return row === 0 ? ACCENT : TILE;
}

/**
 * 繪製 App 圖示並編碼為 PNG。
 * @param {number} size 邊長像素。
 * @param {number} padRatio 四周留白比例（maskable 需較大安全區）。
 * @returns {Buffer} PNG 檔案內容。
 */
function drawIcon(size, padRatio) {
  const pad = size * padRatio;
  const inner = size - pad * 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = (x - pad) / inner;
      const v = (y - pad) / inner;
      const color = u >= 0 && u < 1 && v >= 0 && v < 1 ? colorAt(u, v) : BG;
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

/** 選單 App 的 SVG 圖示。 */
const APP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#2f6db5"/><rect x="14" y="14" width="33" height="33" rx="4" fill="#fff"/><path d="M25 17v27M36 17v27M17 25h27M17 36h27" stroke="#3a3e46" stroke-width="2"/><rect x="53" y="14" width="33" height="33" rx="4" fill="#f08c32"/><rect x="14" y="53" width="33" height="33" rx="4" fill="#fff"/><rect x="53" y="53" width="33" height="33" rx="4" fill="#fff"/><path d="M69.5 60v19M60 69.5h19" stroke="#3a3e46" stroke-width="5"/></svg>\n`;

/** 數獨卡片圖示。 */
const SUDOKU_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#2f6db5"/><rect x="8" y="8" width="40" height="40" fill="#fff"/><path d="M12.4 8v40M16.9 8v40M25.8 8v40M30.2 8v40M39.1 8v40M43.6 8v40M8 12.4h40M8 16.9h40M8 25.8h40M8 30.2h40M8 39.1h40M8 43.6h40" stroke="#c9c2b4" stroke-width="0.6"/><path d="M21.3 8v40M34.7 8v40M8 21.3h40M8 34.7h40" stroke="#3a3e46" stroke-width="1.6"/><rect x="8" y="8" width="40" height="40" fill="none" stroke="#3a3e46" stroke-width="1.6"/><text x="14.6" y="19.5" font-size="8" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">5</text><text x="28" y="33" font-size="8" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#2a5ea3">3</text><text x="41.4" y="46.3" font-size="8" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">8</text></svg>\n`;

/** 數學填字卡片圖示：交叉的兩條算式。 */
const CROSSMATH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#f08c32"/><g font-family="sans-serif" font-weight="700" font-size="7.5" text-anchor="middle"><rect x="4" y="24" width="48" height="9.6" fill="#fff"/><rect x="23.2" y="4" width="9.6" height="48" fill="#fff"/><path d="M13.6 24v9.6M23.2 24v9.6M32.8 24v9.6M42.4 24v9.6M23.2 13.6h9.6M23.2 42.4h9.6" stroke="#3a3e46" stroke-width="0.8"/><rect x="4" y="24" width="48" height="9.6" fill="none" stroke="#3a3e46" stroke-width="1.2"/><rect x="23.2" y="4" width="9.6" height="48" fill="none" stroke="#3a3e46" stroke-width="1.2"/><text x="8.8" y="31.4" fill="#22252b">3</text><text x="18.4" y="31.4" fill="#2f6db5">+</text><text x="28" y="31.4" fill="#22252b">4</text><text x="37.6" y="31.4" fill="#2f6db5">=</text><text x="47.2" y="31.4" fill="#22252b">7</text><text x="28" y="11.8" fill="#22252b">8</text><text x="28" y="21.4" fill="#2f6db5">−</text><text x="28" y="40.6" fill="#2f6db5">=</text><text x="28" y="50.2" fill="#22252b">4</text></g></svg>\n`;

/** 數字連線卡片圖示：5 × 5 盤面上的三條彩色連線，與 games/numberlink 的 icon.svg 相同。 */
const NUMBERLINK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#18a39b"/><rect x="8" y="8" width="40" height="40" rx="2" fill="#fff"/><path d="M16 8v40M8 16h40M24 8v40M8 24h40M32 8v40M8 32h40M40 8v40M8 40h40" stroke="#d6dcde" stroke-width="0.6"/><path d="M12 12L44 12L44 28" fill="none" stroke="#e5383b" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.6" fill="#e5383b"/><text x="12" y="13.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">1</text><circle cx="44" cy="28" r="3.6" fill="#e5383b"/><text x="44" y="29.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">1</text><path d="M12 20L12 44L28 44" fill="none" stroke="#2f6fde" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="20" r="3.6" fill="#2f6fde"/><text x="12" y="21.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">2</text><circle cx="28" cy="44" r="3.6" fill="#2f6fde"/><text x="28" y="45.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">2</text><path d="M20 20L36 20L36 36" fill="none" stroke="#2e9e44" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="20" cy="20" r="3.6" fill="#2e9e44"/><text x="20" y="21.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">3</text><circle cx="36" cy="36" r="3.6" fill="#2e9e44"/><text x="36" y="37.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">3</text></svg>\n`;

/** 成語填字卡片圖示：墨綠底上的 2 × 2 字格「一諾千金」，與 games/idiom 的 icon.svg 相同。 */
const IDIOM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" rx="12" fill="#2f7a5c"/><rect x="9" y="9" width="18" height="18" rx="3" fill="#fff" stroke="#174433" stroke-width="1"/><text x="18" y="22.6" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">一</text><rect x="29" y="9" width="18" height="18" rx="3" fill="#d6eee1" stroke="#174433" stroke-width="1" stroke-dasharray="2 1.5"/><text x="38" y="22.6" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#2f7a5c">諾</text><rect x="9" y="29" width="18" height="18" rx="3" fill="#fff" stroke="#174433" stroke-width="1"/><text x="18" y="42.6" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">千</text><rect x="29" y="29" width="18" height="18" rx="3" fill="#fff" stroke="#174433" stroke-width="1"/><text x="38" y="42.6" font-size="12" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#22252b">金</text></svg>\n`;

/** 滾滾解謎卡片圖示：天空與草地上的像素畫小精靈滾滾和木箱，與 games/roll 的 icon.svg 相同。 */
const ROLL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fb3e8"/><stop offset="1" stop-color="#a8dcf6"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f9a4a"/><stop offset="1" stop-color="#2c7034"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#s)"/><path d="M0 38 H56 V44 Q56 56 44 56 H12 Q0 56 0 44Z" fill="url(#g)"/><rect y="38" width="56" height="2.5" fill="#5cb85c"/><ellipse cx="13" cy="11" rx="7" ry="3" fill="#fff" opacity=".75"/><ellipse cx="17" cy="9" rx="5" ry="3" fill="#fff" opacity=".75"/><rect x="39" y="28" width="10" height="10" rx="1.5" fill="#c8894a" stroke="#7a4b1e" stroke-width="1.5"/><path d="M40.5 29.5 L47.5 36.5 M47.5 29.5 L40.5 36.5" stroke="#8f5a2b" stroke-width="1.5"/><svg x="11" y="15" width="24" height="24" viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="0" width="1" height="1" fill="#2e7d32"/><rect x="5" y="0" width="2" height="1" fill="#5cb85c"/><rect x="9" y="0" width="2" height="1" fill="#5cb85c"/><rect x="11" y="0" width="1" height="1" fill="#2e7d32"/><rect x="6" y="1" width="1" height="1" fill="#2e7d32"/><rect x="7" y="1" width="2" height="1" fill="#5cb85c"/><rect x="9" y="1" width="1" height="1" fill="#2e7d32"/><rect x="5" y="2" width="6" height="1" fill="#2b2140"/><rect x="3" y="3" width="2" height="1" fill="#2b2140"/><rect x="5" y="3" width="6" height="1" fill="#ffcf4a"/><rect x="11" y="3" width="2" height="1" fill="#2b2140"/><rect x="2" y="4" width="1" height="1" fill="#2b2140"/><rect x="3" y="4" width="1" height="1" fill="#ffcf4a"/><rect x="4" y="4" width="2" height="1" fill="#fff3b3"/><rect x="6" y="4" width="7" height="1" fill="#ffcf4a"/><rect x="13" y="4" width="1" height="1" fill="#2b2140"/><rect x="1" y="5" width="1" height="1" fill="#2b2140"/><rect x="2" y="5" width="1" height="1" fill="#ffcf4a"/><rect x="3" y="5" width="2" height="1" fill="#fff3b3"/><rect x="5" y="5" width="9" height="1" fill="#ffcf4a"/><rect x="14" y="5" width="1" height="1" fill="#2b2140"/><rect x="1" y="6" width="1" height="1" fill="#2b2140"/><rect x="2" y="6" width="1" height="1" fill="#ffcf4a"/><rect x="3" y="6" width="1" height="1" fill="#fff3b3"/><rect x="4" y="6" width="1" height="1" fill="#ffffff"/><rect x="5" y="6" width="1" height="1" fill="#2b2140"/><rect x="6" y="6" width="4" height="1" fill="#ffcf4a"/><rect x="10" y="6" width="1" height="1" fill="#ffffff"/><rect x="11" y="6" width="1" height="1" fill="#2b2140"/><rect x="12" y="6" width="2" height="1" fill="#ffcf4a"/><rect x="14" y="6" width="1" height="1" fill="#2b2140"/><rect x="0" y="7" width="1" height="1" fill="#2b2140"/><rect x="1" y="7" width="3" height="1" fill="#ffcf4a"/><rect x="4" y="7" width="2" height="1" fill="#2b2140"/><rect x="6" y="7" width="4" height="1" fill="#ffcf4a"/><rect x="10" y="7" width="2" height="1" fill="#2b2140"/><rect x="12" y="7" width="3" height="1" fill="#ffcf4a"/><rect x="15" y="7" width="1" height="1" fill="#2b2140"/><rect x="0" y="8" width="1" height="1" fill="#2b2140"/><rect x="1" y="8" width="3" height="1" fill="#ffcf4a"/><rect x="4" y="8" width="2" height="1" fill="#2b2140"/><rect x="6" y="8" width="4" height="1" fill="#ffcf4a"/><rect x="10" y="8" width="2" height="1" fill="#2b2140"/><rect x="12" y="8" width="3" height="1" fill="#ffcf4a"/><rect x="15" y="8" width="1" height="1" fill="#2b2140"/><rect x="0" y="9" width="1" height="1" fill="#2b2140"/><rect x="1" y="9" width="1" height="1" fill="#ffcf4a"/><rect x="2" y="9" width="2" height="1" fill="#ff8fa3"/><rect x="4" y="9" width="8" height="1" fill="#ffcf4a"/><rect x="12" y="9" width="2" height="1" fill="#ff8fa3"/><rect x="14" y="9" width="1" height="1" fill="#ffcf4a"/><rect x="15" y="9" width="1" height="1" fill="#2b2140"/><rect x="0" y="10" width="1" height="1" fill="#2b2140"/><rect x="1" y="10" width="5" height="1" fill="#ffcf4a"/><rect x="6" y="10" width="1" height="1" fill="#2b2140"/><rect x="7" y="10" width="2" height="1" fill="#ffcf4a"/><rect x="9" y="10" width="1" height="1" fill="#2b2140"/><rect x="10" y="10" width="5" height="1" fill="#ffcf4a"/><rect x="15" y="10" width="1" height="1" fill="#2b2140"/><rect x="1" y="11" width="1" height="1" fill="#2b2140"/><rect x="2" y="11" width="1" height="1" fill="#f0a030"/><rect x="3" y="11" width="4" height="1" fill="#ffcf4a"/><rect x="7" y="11" width="2" height="1" fill="#2b2140"/><rect x="9" y="11" width="4" height="1" fill="#ffcf4a"/><rect x="13" y="11" width="1" height="1" fill="#f0a030"/><rect x="14" y="11" width="1" height="1" fill="#2b2140"/><rect x="1" y="12" width="1" height="1" fill="#2b2140"/><rect x="2" y="12" width="2" height="1" fill="#f0a030"/><rect x="4" y="12" width="8" height="1" fill="#ffcf4a"/><rect x="12" y="12" width="2" height="1" fill="#f0a030"/><rect x="14" y="12" width="1" height="1" fill="#2b2140"/><rect x="2" y="13" width="2" height="1" fill="#2b2140"/><rect x="4" y="13" width="8" height="1" fill="#f0a030"/><rect x="12" y="13" width="2" height="1" fill="#2b2140"/><rect x="3" y="14" width="1" height="1" fill="#2b2140"/><rect x="4" y="14" width="2" height="1" fill="#ffcf4a"/><rect x="6" y="14" width="1" height="1" fill="#2b2140"/><rect x="9" y="14" width="1" height="1" fill="#2b2140"/><rect x="10" y="14" width="2" height="1" fill="#ffcf4a"/><rect x="12" y="14" width="1" height="1" fill="#2b2140"/><rect x="3" y="15" width="4" height="1" fill="#2b2140"/><rect x="9" y="15" width="4" height="1" fill="#2b2140"/></svg></svg>\n`;

/** 密碼偵探卡片圖示：深灰金屬底、黃銅框面板上的四顆密碼顏色與回饋小點，與 games/codebreaker 的 icon.svg 相同。 */
const CODEBREAKER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b5058"/><stop offset="1" stop-color="#1f2226"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><rect x="7.75" y="14.75" width="40.5" height="26.5" rx="3" fill="#1c1e22" stroke="#c8a24a" stroke-width="1.5"/><circle cx="14" cy="24" r="4" fill="#e5383b"/><text x="14" y="25.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">1</text><circle cx="23.3" cy="24" r="4" fill="#2f6fde"/><text x="23.3" y="25.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">6</text><circle cx="32.7" cy="24" r="4" fill="#2e9e44"/><text x="32.7" y="25.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">4</text><circle cx="42" cy="24" r="4" fill="#f2c12e"/><text x="42" y="25.9" font-size="5" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">3</text><circle cx="22" cy="34.5" r="1.6" fill="#f0f0f0"/><circle cx="28" cy="34.5" r="1.6" fill="#f0f0f0"/><circle cx="34" cy="34.5" r="1.6" fill="none" stroke="#f0f0f0" stroke-width="0.8"/></svg>\n`;

/** 英文單字連線卡片圖示：英文卡片與中文卡片以線相連，與 games/words 的 icon.svg 相同。 */
const WORDS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3aa7e0"/><stop offset="1" stop-color="#22b39a"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><path d="M23.5 18.5 L32.5 37.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><rect x="6" y="9" width="18" height="18" rx="4" fill="#fff"/><rect x="32" y="29" width="18" height="18" rx="4" fill="#fff"/><circle cx="23.5" cy="18.5" r="2.4" fill="#ffd65c"/><circle cx="32.5" cy="37.5" r="2.4" fill="#ffd65c"/><text x="15" y="23.5" font-family="Georgia, serif" font-weight="700" font-size="13" text-anchor="middle" fill="#2a95cc">A</text><text x="41" y="43" font-family="sans-serif" font-weight="700" font-size="11.5" text-anchor="middle" fill="#22a082">中</text></svg>\n`;

/** 英文單字拼圖卡片圖示：三塊字母方塊與金色答案空格線，與 games/spelling 的 icon.svg 相同。 */
const SPELLING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cf0"/><stop offset="1" stop-color="#d9468f"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><g font-family="Menlo, monospace" font-weight="700" font-size="11" text-anchor="middle" fill="#7c5cf0"><rect x="5.5" y="15" width="13" height="15" rx="3" fill="#563cb4"/><rect x="5.5" y="13" width="13" height="15" rx="3" fill="#fff"/><text x="12" y="24.5">A</text><rect x="21.5" y="15" width="13" height="15" rx="3" fill="#563cb4"/><rect x="21.5" y="13" width="13" height="15" rx="3" fill="#fff"/><text x="28" y="24.5">B</text><rect x="37.5" y="15" width="13" height="15" rx="3" fill="#563cb4"/><rect x="37.5" y="13" width="13" height="15" rx="3" fill="#fff"/><text x="44" y="24.5">C</text></g><g fill="#ffd65c"><rect x="6.5" y="39" width="11" height="3" rx="1.5"/><rect x="22.5" y="39" width="11" height="3" rx="1.5"/><rect x="38.5" y="39" width="11" height="3" rx="1.5"/></g></svg>\n`;

/** 口袋地城卡片圖示：酒紅到深紫漸層底上的像素斜劍，與 games/pocketdungeon 的 icon.svg 相同。 */
const POCKETDUNGEON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" shape-rendering="crispEdges"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9e2a3a"/><stop offset="1" stop-color="#3a1d4f"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><rect x="42" y="7" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="45.5" y="7" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="38.5" y="10.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="42" y="10.5" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="45.5" y="10.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="35" y="14" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="38.5" y="14" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="42" y="14" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="31.5" y="17.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="35" y="17.5" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="38.5" y="17.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="28" y="21" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="31.5" y="21" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="35" y="21" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="24.5" y="24.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="28" y="24.5" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="31.5" y="24.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="10.5" y="28" width="3.5" height="3.5" fill="#e8b84a"/><rect x="21" y="28" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="24.5" y="28" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="28" y="28" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="10.5" y="31.5" width="3.5" height="3.5" fill="#e8b84a"/><rect x="14" y="31.5" width="3.5" height="3.5" fill="#e8b84a"/><rect x="17.5" y="31.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="21" y="31.5" width="3.5" height="3.5" fill="#9aa3b5"/><rect x="24.5" y="31.5" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="14" y="35" width="3.5" height="3.5" fill="#e8b84a"/><rect x="17.5" y="35" width="3.5" height="3.5" fill="#e8b84a"/><rect x="21" y="35" width="3.5" height="3.5" fill="#f0f0f0"/><rect x="14" y="38.5" width="3.5" height="3.5" fill="#6b4226"/><rect x="17.5" y="38.5" width="3.5" height="3.5" fill="#e8b84a"/><rect x="21" y="38.5" width="3.5" height="3.5" fill="#e8b84a"/><rect x="10.5" y="42" width="3.5" height="3.5" fill="#6b4226"/><rect x="21" y="42" width="3.5" height="3.5" fill="#e8b84a"/><rect x="24.5" y="42" width="3.5" height="3.5" fill="#e8b84a"/><rect x="7" y="45.5" width="3.5" height="3.5" fill="#6b4226"/></svg>\n`;

/** 奧數挑戰卡片圖示：霧藍紫漸層底上的白色「＋」「×」與米白圓點，與 games/olympiad 的 icon.svg 相同。 */
const OLYMPIAD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f6aa0"/><stop offset="1" stop-color="#4a527f"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><path d="M19 10v18M10 19h18" stroke="#fffdf8" stroke-width="5" stroke-linecap="round"/><path d="M31.7 31.7l10.6 10.6M42.3 31.7L31.7 42.3" stroke="#fffdf8" stroke-width="5" stroke-linecap="round"/><circle cx="39" cy="17" r="4" fill="#f3ead2"/><circle cx="17" cy="39" r="4" fill="#f3ead2"/></svg>\n`;

/** 自然探險卡片圖示：苔綠漸層底上的白色雙葉幼苗與米白太陽，與 games/science 的 icon.svg 相同。 */
const SCIENCE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f7a52"/><stop offset="1" stop-color="#4b6440"/></linearGradient></defs><rect width="56" height="56" rx="12" fill="url(#g)"/><path d="M28 24v22M14 46h28" stroke="#fffdf8" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="20" cy="24" rx="9" ry="4.6" transform="rotate(30 20 24)" fill="#fffdf8"/><ellipse cx="36" cy="20" rx="9" ry="4.6" transform="rotate(-36 36 20)" fill="#fffdf8"/><circle cx="11" cy="10" r="4.5" fill="#f3ead2"/></svg>\n`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), drawIcon(192, 0.1));
writeFileSync(join(OUT, 'icon-512.png'), drawIcon(512, 0.1));
writeFileSync(join(OUT, 'icon-maskable-512.png'), drawIcon(512, 0.2));
writeFileSync(join(OUT, 'apple-touch-icon.png'), drawIcon(180, 0.12));
writeFileSync(join(OUT, 'icon.svg'), APP_SVG);
writeFileSync(join(OUT, 'sudoku.svg'), SUDOKU_SVG);
writeFileSync(join(OUT, 'crossmath.svg'), CROSSMATH_SVG);
writeFileSync(join(OUT, 'numberlink.svg'), NUMBERLINK_SVG);
writeFileSync(join(OUT, 'idiom.svg'), IDIOM_SVG);
writeFileSync(join(OUT, 'codebreaker.svg'), CODEBREAKER_SVG);
writeFileSync(join(OUT, 'roll.svg'), ROLL_SVG);
writeFileSync(join(OUT, 'words.svg'), WORDS_SVG);
writeFileSync(join(OUT, 'spelling.svg'), SPELLING_SVG);
writeFileSync(join(OUT, 'pocketdungeon.svg'), POCKETDUNGEON_SVG);
writeFileSync(join(OUT, 'olympiad.svg'), OLYMPIAD_SVG);
writeFileSync(join(OUT, 'science.svg'), SCIENCE_SVG);
console.log(`圖示已輸出到 ${OUT}`);
