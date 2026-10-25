// 最小的 xlsx 讀取器：只用 Node.js 內建模組解開 ZIP、讀取共用字串與第一張工作表。
// 只做格式轉換（XML 實體與 Excel 的 _xHHHH_ 跳脫碼還原為原字元），不改變任何文字內容。

import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/**
 * 讀取 ZIP 檔中的所有項目。
 * @param {Buffer} buf ZIP 檔內容。
 * @returns {Map<string, Buffer>} 檔名 → 解壓後內容。
 * @throws {Error} 找不到中央目錄或遇到不支援的壓縮方式時。
 */
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('不是 ZIP 檔（找不到中央目錄）');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP 中央目錄格式錯誤');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data));
    else throw new Error(`不支援的壓縮方式 ${method}：${name}`);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/**
 * 還原 XML 實體與 Excel 的 _xHHHH_ 跳脫碼。
 * @param {string} s XML 文字。
 * @returns {string} 原始文字。
 */
export function decodeText(s) {
  return s
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * 取出共用字串表（含多段格式文字時串接各段）。
 * @param {string} xml sharedStrings.xml 內容。
 * @returns {string[]} 字串陣列。
 */
function sharedStrings(xml) {
  const out = [];
  for (const m of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = '';
    // 略過注音標示（<rPh>）等非正文的部分，只取 <t> 內容。
    const body = m[1].replace(/<rPh[\s\S]*?<\/rPh>/g, '');
    for (const t of body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t\/>/g)) text += t[1] ? decodeText(t[1]) : '';
    out.push(text);
  }
  return out;
}

/**
 * 把欄位代號（例如 "AB"）轉為從 0 起算的欄索引。
 * @param {string} letters 欄位代號。
 * @returns {number} 欄索引。
 */
function columnIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/**
 * 讀取 xlsx 第一張工作表的所有列。檔案可以是 xlsx，或內含單一 xlsx 的 zip（教育部下載檔）。
 * @param {string} file 檔案路徑。
 * @returns {string[][]} 每列的儲存格文字（空儲存格為空字串）。
 * @throws {Error} zip 中找不到 xlsx 時。
 */
export function readSheet(file) {
  let buf = readFileSync(file);
  if (file.toLowerCase().endsWith('.zip')) {
    const inner = [...readZip(buf)].find(([name]) => name.toLowerCase().endsWith('.xlsx'));
    if (!inner) throw new Error(`${file} 中找不到 xlsx`);
    buf = inner[1];
  }
  return readSheetBuffer(buf);
}

/**
 * 讀取 xlsx 內容（Buffer）第一張工作表的所有列。
 * @param {Buffer} buf xlsx 檔內容。
 * @returns {string[][]} 每列的儲存格文字（空儲存格為空字串）。
 */
export function readSheetBuffer(buf) {
  const zip = readZip(buf);
  const sst = zip.has('xl/sharedStrings.xml') ? sharedStrings(zip.get('xl/sharedStrings.xml').toString('utf8')) : [];
  const sheetName = [...zip.keys()].filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
  const xml = zip.get(sheetName).toString('utf8');
  const rows = [];
  for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = /r="([A-Z]+)\d+"/.exec(attrs);
      const type = /t="(\w+)"/.exec(attrs);
      const inner = c[2] || '';
      let value = '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner);
      if (type && type[1] === 's' && v) value = sst[Number(v[1])] ?? '';
      else if (type && type[1] === 'inlineStr') {
        for (const t of inner.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) value += decodeText(t[1]);
      } else if (v) value = decodeText(v[1]);
      const idx = ref ? columnIndex(ref[1]) : cells.length;
      while (cells.length < idx) cells.push('');
      cells[idx] = value;
    }
    rows.push(cells);
  }
  return rows;
}
