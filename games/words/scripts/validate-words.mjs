// 詞庫驗證：檢查單字檔的欄位格式與規則（撰寫、審閱與單元測試共用）。
// 用法：node scripts/validate-words.mjs <檔案...>（不指定時檢查 data/words/ 全部檔案）

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATEGORIES = JSON.parse(readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8'));
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const POS = new Set(['n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'pron.', 'num.', 'det.', 'interj.', 'phr.']);

/** 常見的簡化字（出現即判定不是繁體中文）。 */
const SIMPLIFIED = '这们为说时会对发长东车门问间关开过还么个来气让买卖样边头现见视话语读写书钱银铁机场飞师医药汤饭鸡鱼饮厨卫灯电脑网线运动乐剧员专业园区岛湾桥楼层号码钟岁历节阴风云雾凉热温湿冻转换';

/**
 * 依英文單字產生例句中可能出現的變化形（複數、第三人稱、過去式、進行式、比較級）。
 * @param {string} word 單字（取詞組的最後一個字）。
 * @returns {string[]} 可能的字形。
 */
function inflections(word) {
  const w = word.toLowerCase();
  const out = new Set([w, `${w}s`, `${w}es`, `${w}d`, `${w}ed`, `${w}ing`, `${w}er`, `${w}est`, `${w}'s`]);
  if (w.endsWith('y')) ['ies', 'ied', 'ier', 'iest'].forEach((s) => out.add(w.slice(0, -1) + s));
  if (w.endsWith('e')) ['ing'].forEach((s) => out.add(w.slice(0, -1) + s));
  if (/[^aeiou][aeiou][^aeiouwy]$/.test(w)) ['ing', 'ed', 'er', 'est'].forEach((s) => out.add(w + w.slice(-1) + s));
  if (w.endsWith('f')) out.add(`${w.slice(0, -1)}ves`);
  if (w.endsWith('fe')) out.add(`${w.slice(0, -2)}ves`);
  return [...out];
}

/**
 * 判斷例句是否包含指定字串（不分大小寫、需為完整單字）。
 * @param {string} sentence 例句。
 * @param {string} text 要找的字或詞組。
 * @returns {boolean} 包含時為 true。
 */
function containsWord(sentence, text) {
  const esc = text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`).test(sentence.toLowerCase());
}

/**
 * 驗證一個單字檔。
 * @param {string} file 檔案路徑。
 * @param {object} [options] 選項。
 * @param {boolean} [options.requireReviewed=false] 是否要求每個單字都已審閱。
 * @returns {string[]} 錯誤訊息。
 */
export function validateFile(file, { requireReviewed = false } = {}) {
  const errors = [];
  const cat = basename(file, '.json');
  let list;
  try {
    list = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return [`${file}：JSON 格式錯誤（${err.message}）`];
  }
  if (!CATEGORY_IDS.has(cat)) errors.push(`${file}：檔名不是分類 id`);
  if (!Array.isArray(list)) return [`${file}：內容須為陣列`];
  if (list.length < 50) errors.push(`${file}：只有 ${list.length} 個單字，至少 50 個`);
  const ids = new Set();
  const enPos = new Set();
  const zhSyn = new Map();
  list.forEach((w, i) => {
    const at = `${file} 第 ${i + 1} 筆（${w && w.en}）`;
    if (!w || typeof w !== 'object') {
      errors.push(`${at}：不是物件`);
      return;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.id || '')) errors.push(`${at}：id 格式錯誤`);
    if (ids.has(w.id)) errors.push(`${at}：id 重複`);
    ids.add(w.id);
    if (!/^[A-Za-z][A-Za-z '-]*[A-Za-z]$|^[A-Za-z]$/.test(w.en || '')) errors.push(`${at}：en 只能有英文字母、空格、連字號、撇號`);
    const key = `${(w.en || '').toLowerCase()}|${w.pos}`;
    if (enPos.has(key)) errors.push(`${at}：同一單字與詞性重複`);
    enPos.add(key);
    if (!POS.has(w.pos)) errors.push(`${at}：pos 不合法（${w.pos}）`);
    if (typeof w.zh !== 'string' || !w.zh.trim() || !/[一-鿿]/.test(w.zh)) errors.push(`${at}：zh 須為中文`);
    else {
      if ([...w.zh].length > 12) errors.push(`${at}：zh 超過 12 字`);
      if (/[()（）]/.test(w.zh)) errors.push(`${at}：zh 不要括號說明`);
      const bad = [...w.zh].filter((ch) => SIMPLIFIED.includes(ch));
      if (bad.length) errors.push(`${at}：zh 含簡化字「${bad.join('')}」`);
    }
    if (!Array.isArray(w.categories) || w.categories[0] !== cat) errors.push(`${at}：categories 第一個須為 ${cat}`);
    else for (const c of w.categories) if (!CATEGORY_IDS.has(c)) errors.push(`${at}：未知分類 ${c}`);
    if (![1, 2, 3].includes(w.level)) errors.push(`${at}：level 須為 1、2、3`);
    if (typeof w.syn !== 'string' || (w.syn && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.syn))) errors.push(`${at}：syn 格式錯誤`);
    if (typeof w.example !== 'string' || !w.example.trim()) errors.push(`${at}：缺少 example`);
    else {
      const words = w.example.trim().split(/\s+/).length;
      if (words > 15) errors.push(`${at}：example 超過 15 個單字（${words}）`);
      const form = (w.form || '').trim();
      if (form) {
        if (!containsWord(w.example, form)) errors.push(`${at}：example 不含 form「${form}」`);
      } else if (!containsWord(w.example, w.en || '')) {
        const parts = (w.en || '').split(' ');
        const last = parts.pop();
        const ok = inflections(last).some((f) => containsWord(w.example, [...parts, f].join(' ')));
        if (!ok) errors.push(`${at}：example 不含該單字（變化形請填 form）`);
      }
      const bad = [...(w.exampleZh || '')].filter((ch) => SIMPLIFIED.includes(ch));
      if (bad.length) errors.push(`${at}：exampleZh 含簡化字「${bad.join('')}」`);
    }
    if (typeof w.exampleZh !== 'string' || !/[一-鿿]/.test(w.exampleZh)) errors.push(`${at}：缺少中文 exampleZh`);
    if (typeof w.form !== 'string') errors.push(`${at}：form 須為字串（沒有變化形時填空字串）`);
    if (requireReviewed && w.reviewed !== true) errors.push(`${at}：尚未審閱`);
    if (w.zh) {
      const prev = zhSyn.get(w.zh);
      if (prev && (prev.syn !== w.syn || !w.syn)) errors.push(`${at}：與「${prev.en}」中文相同，須屬於同一個 syn 群組`);
      else zhSyn.set(w.zh, w);
    }
  });
  return errors;
}

// 直接執行時驗證指定檔案。
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let files = process.argv.slice(2);
  if (!files.length) {
    const dir = join(ROOT, 'data', 'words');
    files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f)) : [];
  }
  let total = 0;
  for (const f of files) {
    const errs = validateFile(f, { requireReviewed: f.includes(`${'data'}/words/`) });
    total += errs.length;
    if (errs.length) console.log(errs.join('\n'));
    else console.log(`✓ ${f}（${JSON.parse(readFileSync(f, 'utf8')).length} 個單字）`);
  }
  process.exitCode = total ? 1 : 0;
}
