// 把轉換產生的圖資料模組（rows 字元陣列格式）封裝成 PNG 圖集：像素存到同名的 .png，模組改成只有調色盤、大小與圖集位置，
// 由 src/js/pd/spritePack.js 在載入時還原。圖集每像素存調色盤編號（8 位元灰階），PNG 為無損格式，還原後的資料與原本完全相同。
// 用法：node scripts/sprite-pack.mjs <模組路徑>...（例如 src/js/pd/monsterSprites.js）
// 轉換工具（make-hero-sprites、make-sheet-sprites）寫出模組後會自動呼叫 packFile。

import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { basename, resolve } from 'node:path';

/** CRC32 表。 */
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/**
 * 計算 CRC32。
 * @param {Buffer} buf 資料。
 * @returns {number} CRC。
 */
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * 產生一個 PNG 區塊。
 * @param {string} type 區塊種類。
 * @param {Buffer} data 內容。
 * @returns {Buffer} 區塊。
 */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/**
 * 把 8 位元灰階像素（調色盤編號）編碼成 PNG；每列試過 5 種濾波，取差值絕對值總和最小的，以利壓縮。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {Uint8Array} px 每像素 1 位元組。
 * @returns {Buffer} PNG 檔內容。
 */
export function encodePng(w, h, px) {
  const stride = w;
  const bpp = 1;
  const raw = Buffer.alloc((stride + 1) * h);
  const line = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    let best = -1, bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const v = px[y * stride + x];
        const a = x >= bpp ? px[y * stride + x - bpp] : 0;
        const b = y ? px[(y - 1) * stride + x] : 0;
        const c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
        let pred = 0;
        if (f === 1) pred = a;
        else if (f === 2) pred = b;
        else if (f === 3) pred = (a + b) >> 1;
        else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        const d = (v - pred) & 255;
        line[x] = d;
        sum += d < 128 ? d : 256 - d;
      }
      if (sum < bestSum) { bestSum = sum; best = f; line.copy(raw, y * (stride + 1) + 1); }
    }
    raw[y * (stride + 1)] = best;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * 把資料中所有的 rows 搬到圖集：回傳圖集像素與替換後的描述（rows 換成 { $r: [x, y, w, h] }）。
 * 圖集每像素存「調色盤編號」：0 為透明，n 為該圖調色盤（依鍵的順序）第 n 個顏色，所以每像素只要 1 位元組。
 * 以「架子」排列（依高度由大到小，每列寬 1024）。
 * @param {Record<string, any>} data 圖資料。
 * @returns {{meta: Record<string, any>, w: number, h: number, px: Uint8Array}} 描述與圖集。
 */
export function packData(data) {
  const meta = structuredClone(data);
  const items = [];
  /**
   * 遞迴收集有 rows 的節點。
   * @param {any} node 節點。
   * @param {Record<string, string> | null} palette 最近一層的調色盤。
   */
  const walk = (node, palette) => {
    if (!node || typeof node !== 'object') return;
    const pal = node.palette || palette;
    if (Array.isArray(node.rows) && node.rows.every((r) => typeof r === 'string')) {
      const w = Math.max(1, ...node.rows.map((r) => r.length));
      items.push({ node, pal, w, h: node.rows.length });
      return;
    }
    for (const [k, v] of Object.entries(node)) if (k !== 'palette' && v && typeof v === 'object') walk(v, pal);
  };
  walk(meta, null);
  const W = 1024;
  const order = items.slice().sort((a, b) => b.h - a.h);
  let x = 0, y = 0, shelf = 0;
  for (const it of order) {
    if (x + it.w > W) { x = 0; y += shelf + 1; shelf = 0; }
    it.x = x; it.y = y;
    x += it.w + 1;
    shelf = Math.max(shelf, it.h);
  }
  const H = y + shelf;
  const px = new Uint8Array(W * H);
  for (const it of items) {
    const keys = Object.keys(it.pal || {});
    if (keys.length > 255) throw new Error('調色盤超過 255 色');
    const idx = Object.fromEntries(keys.map((k, n) => [k, n + 1]));
    it.node.rows.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) {
        if (row[rx] === '.' || !idx[row[rx]]) continue;
        px[(it.y + ry) * W + it.x + rx] = idx[row[rx]];
      }
    });
    const lens = it.node.rows.map((r) => r.length);
    if (lens.some((l) => l !== it.w)) it.node.$len = lens;
    it.node.$r = [it.x, it.y, it.w, it.h];
    delete it.node.rows;
  }
  return { meta, w: W, h: H, px };
}

/**
 * 封裝一個圖資料模組：匯入模組取得資料，寫出同名 PNG，並把模組改寫成只有描述的精簡版本（保留檔案開頭的說明註解）。
 * 已經封裝過的模組（內容引用 spritePack.js）會略過。
 * @param {string} path 模組路徑。
 * @returns {Promise<void>}
 */
export async function packFile(path) {
  const abs = resolve(path);
  const src = readFileSync(abs, 'utf8');
  if (src.includes("from './spritePack.js'") || src.includes("from '../spritePack.js'")) { console.log(`${path}：已封裝，略過`); return; }
  const mod = await import(`${pathToFileURL(abs).href}?t=${Date.now()}`);
  const names = Object.keys(mod);
  if (names.length !== 1) throw new Error(`${path} 應該只匯出一個資料物件`);
  const name = names[0];
  const { meta, w, h, px } = packData(mod[name]);
  const png = abs.replace(/\.js$/, '.png');
  writeFileSync(png, encodePng(w, h, px));
  const header = src.split('\n').filter((l, i, a) => l.startsWith('//') && a.slice(0, i).every((p) => p.startsWith('//'))).join('\n');
  const rel = abs.includes('/homeArt/') ? '../spritePack.js' : './spritePack.js';
  const js = `${header}\n// 像素存在同名的 ${basename(png)}（無損 PNG 圖集），載入時由 spritePack.js 還原成 rows；瀏覽器中使用前要 await spritesReady()。\n\n`
    + `import { unpack } from '${rel}';\n\n`
    + `/**\n * 圖資料（解碼後與原本的 rows 格式相同）。\n * @type {Record<string, any>}\n */\n`
    + `export const ${name} = {};\n\n`
    + `unpack(${name}, ${JSON.stringify(meta)}, new URL('./${basename(png)}', import.meta.url));\n`;
  writeFileSync(abs, js);
  console.log(`${path}：${Math.round(src.length / 1024)} KB → 模組 ${Math.round(js.length / 1024)} KB ＋ PNG ${Math.round(readFileSync(png).length / 1024)} KB（${w} × ${h}）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const p of process.argv.slice(2)) await packFile(p);
}
