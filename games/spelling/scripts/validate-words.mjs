// 驗證詞庫檔：欄位、與大考中心清單一致、中文長度、例句包含單字等；有錯誤時列出並以非 0 結束。
// 用法：node scripts/validate-words.mjs <檔案…>（不給檔案時驗證 data/words/ 全部）

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 中文意思的字數上限。 */
export const ZH_MAX = 12;
/** 例句的英文單字數上限。 */
export const EXAMPLE_MAX_WORDS = 15;

/**
 * 判斷例句是否包含單字（原形或 form 指定的變化形，不分大小寫、須為完整的字）。
 * @param {string} example 例句。
 * @param {string} word 單字或變化形。
 * @returns {boolean} 包含時為 true。
 */
export function containsWord(example, word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z])${esc}($|[^A-Za-z])`, 'i').test(example);
}

/**
 * 驗證一組單字。
 * @param {object[]} words 單字。
 * @param {Map<string, {en: string, pos: string, level: number}>} list 大考中心清單（以 id 為鍵）。
 * @param {{reviewed?: boolean}} [opt] reviewed 為 true 時要求每筆都已審閱。
 * @returns {string[]} 錯誤訊息。
 */
export function validateWords(words, list, opt = {}) {
  const errors = [];
  if (!Array.isArray(words)) return ['檔案內容必須是 JSON 陣列'];
  const ids = new Set();
  for (const [i, w] of words.entries()) {
    const at = `第 ${i + 1} 筆（${w && w.id}）`;
    if (!w || typeof w !== 'object') {
      errors.push(`${at}：不是物件`);
      continue;
    }
    const src = list.get(w.id);
    if (!src) errors.push(`${at}：id 不在 data/list.json`);
    else {
      if (w.en !== src.en) errors.push(`${at}：en 必須是「${src.en}」`);
      if (w.pos !== src.pos) errors.push(`${at}：pos 必須是「${src.pos}」`);
      if (w.level !== src.level) errors.push(`${at}：level 必須是 ${src.level}`);
    }
    if (ids.has(w.id)) errors.push(`${at}：id 重複`);
    ids.add(w.id);
    if (typeof w.zh !== 'string' || !w.zh.trim()) errors.push(`${at}：zh 不可為空`);
    else {
      if ([...w.zh].length > ZH_MAX) errors.push(`${at}：zh 超過 ${ZH_MAX} 字`);
      if (/[A-Za-z()（）;；,]/.test(w.zh)) errors.push(`${at}：zh 不可有英文、括號或逗號（多個意思用「、」分隔）`);
    }
    if (typeof w.example !== 'string' || !w.example.trim()) errors.push(`${at}：example 不可為空`);
    else {
      if (w.example.trim().split(/\s+/).length > EXAMPLE_MAX_WORDS) errors.push(`${at}：example 超過 ${EXAMPLE_MAX_WORDS} 個英文單字`);
      if (typeof w.form !== 'string') errors.push(`${at}：form 必須是字串（原形時為空字串）`);
      else if (!containsWord(w.example, w.form || w.en)) errors.push(`${at}：example 沒有包含「${w.form || w.en}」${w.form ? '' : '（變化形請填 form）'}`);
    }
    if (typeof w.exampleZh !== 'string' || !w.exampleZh.trim()) errors.push(`${at}：exampleZh 不可為空`);
    if (opt.reviewed && w.reviewed !== true) errors.push(`${at}：尚未審閱（reviewed 不是 true）`);
  }
  return errors;
}

/**
 * 讀取大考中心清單（data/list.json），以 id 為鍵。
 * @returns {Map<string, {en: string, pos: string, level: number}>} 清單。
 */
export function loadList() {
  const rows = JSON.parse(readFileSync(join(ROOT, 'data/list.json'), 'utf8'));
  return new Map(rows.map((r) => [r.id, r]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dir = join(ROOT, 'data/words');
  const files = args.length ? args : existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [];
  const list = loadList();
  let failed = 0;
  for (const file of files) {
    let words;
    try {
      words = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.log(`✕ ${file}：JSON 格式錯誤（${e.message}）`);
      failed++;
      continue;
    }
    const errors = validateWords(words, list, { reviewed: file.includes('/data/words/') });
    if (errors.length) {
      failed++;
      console.log(`✕ ${file}：${errors.length} 個錯誤`);
      for (const e of errors.slice(0, 50)) console.log(`  - ${e}`);
    } else console.log(`✓ ${file}：${words.length} 個單字`);
  }
  process.exit(failed ? 1 : 0);
}
