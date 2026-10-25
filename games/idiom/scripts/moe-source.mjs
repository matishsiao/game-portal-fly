// 讀取教育部《成語典》原始下載檔並整理成條目（匯入腳本與詞庫驗證測試共用）。
// 只做不改變內容的格式轉換：去除換行字元中的 \r、例句依換行拆成陣列；文字一律保留原文。

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSheet } from './xlsx.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const MOE_DIR = join(ROOT, 'data', 'moe');

/** 欄位名稱（依教育部下載檔第一列）。 */
const COLUMNS = {
  id: '編號',
  text: '成語',
  zhuyin: '注音',
  meaning: '釋義',
  examples: '用法說明-例句',
  confusion: '辨識-形音辨誤',
  kind: '主條成語／非主條成語',
};

/**
 * 找出最新的《成語典》下載檔（檔名 dict_idioms_<版本>.zip）。
 * @returns {{file: string, version: string}} 檔案路徑與版本編號。
 * @throws {Error} 找不到下載檔時。
 */
export function latestSourceFile() {
  const files = readdirSync(MOE_DIR).filter((f) => /^dict_idioms_\d{4}_\d{8}\.(zip|xlsx)$/.test(f)).sort();
  if (!files.length) throw new Error(`${MOE_DIR} 中找不到 dict_idioms_<版本>.zip`);
  const name = files[files.length - 1];
  return { file: join(MOE_DIR, name), version: name.replace(/^dict_idioms_/, '').replace(/\.(zip|xlsx)$/, '') };
}

/**
 * 去除文字中的 \r（Excel 換行的格式差異），不改變其他任何字元。
 * @param {string} s 原始文字。
 * @returns {string} 換行統一為 \n 的文字。
 */
export function normalizeNewlines(s) {
  return s.replace(/\r/g, '');
}

/** 例句欄位中分隔不同語義群組的記號（單獨一行的全形「＆」，官網以「一、」「二、」分組顯示）。 */
export const GROUP_MARK = '＆';

/**
 * 把例句欄位依換行拆成例句，並依「＆」分成語義群組（略過空行），保留原文順序。
 * @param {string} s 原始例句欄位。
 * @returns {string[][]} 每個語義群組的例句。
 */
export function splitExamples(s) {
  const groups = [[]];
  for (const line of normalizeNewlines(s).split('\n')) {
    if (line.trim() === '') continue;
    if (line.trim() === GROUP_MARK) groups.push([]);
    else groups[groups.length - 1].push(line);
  }
  return groups.filter((g) => g.length);
}

/**
 * 讀取下載檔中的全部條目。
 * @param {string} file 下載檔路徑。
 * @returns {{id: string, text: string, zhuyin: string, meaning: string, examples: string, confusion: string, main: boolean}[]} 條目（欄位為原文）。
 * @throws {Error} 欄位名稱與預期不符時。
 */
export function readEntries(file) {
  const rows = readSheet(file);
  const head = rows[0];
  const idx = {};
  for (const [key, name] of Object.entries(COLUMNS)) {
    idx[key] = head.indexOf(name);
    if (idx[key] < 0) throw new Error(`找不到欄位「${name}」，下載檔格式可能已變更`);
  }
  return rows
    .slice(1)
    .filter((r) => r[idx.id])
    .map((r) => ({
      id: r[idx.id],
      text: r[idx.text] || '',
      zhuyin: r[idx.zhuyin] || '',
      meaning: r[idx.meaning] || '',
      examples: r[idx.examples] || '',
      confusion: r[idx.confusion] || '',
      main: (r[idx.kind] || '') === '主條成語',
    }));
}

/**
 * 判斷條目是否可作為遊戲題目：主條目、四個漢字、釋義、注音與例句皆不為空，
 * 且顯示的欄位不含私用區字元（罕用字自造字碼，一般字型無法顯示，又不得改字）。
 * @param {{text: string, zhuyin: string, meaning: string, examples: string, main: boolean}} e 條目。
 * @returns {boolean} 可用時為 true。
 */
export function isPlayable(e) {
  if (!e.main || !/^[㐀-鿿]{4}$/.test(e.text)) return false;
  if (!e.meaning.trim() || !e.zhuyin.trim() || !splitExamples(e.examples).length) return false;
  return !/[-]/.test(e.text + e.zhuyin + e.meaning + e.examples);
}
