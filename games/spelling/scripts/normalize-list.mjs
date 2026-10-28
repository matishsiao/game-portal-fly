// 整理大考中心詞彙表：把 data/ceec/ceec-108.json 的原始詞條展開為一個單字一筆的 data/list.json，排除的詞條寫入 data/excluded.json（附原因）。
// 用法：node scripts/normalize-list.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 手動排除的詞條（原始寫法 → 原因）：自動規則無法正確處理的少數情況。 */
const MANUAL_EXCLUDE = {
  'am/a.m.': '時間縮寫（a.m.），拼字時會和 be 動詞 am 混淆',
  'pm/p.m.': '時間縮寫（p.m.）',
  'Mr./Mister': '稱謂縮寫與專有用法',
  'O.K./OK/okay': '縮寫與口語寫法不一',
};

/** 手動修正詞性（單字 → 詞性）：詞條中縮寫跟在衍生字後面時，自動規則會給錯詞性。 */
const MANUAL_POS = {
  ad: 'n.',
};

/**
 * 去除重音符號並把彎引號改為直引號（café → cafe、o’clock → o'clock）。
 * @param {string} text 文字。
 * @returns {string} 正規化後的文字。
 */
function plain(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").trim();
}

/**
 * 計算兩個字串的編輯距離（Levenshtein）。
 * @param {string} a 字串。
 * @param {string} b 字串。
 * @returns {number} 編輯距離。
 */
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

/**
 * 判斷 b 是否只是 a 的拼寫變體（例如 toward／towards、judgment／judgement、disk／disc）。
 * @param {string} a 第一種寫法。
 * @param {string} b 其他寫法。
 * @returns {boolean} 是拼寫變體時為 true。
 */
function isSpellingVariant(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  // 只差 1 個字母（towards、judgement、disc），或等長且差 2 個字母；fireman／firewoman、prince／princess 等不同的字分開收。
  const d = distance(x, y);
  return x === y || (Math.min(x.length, y.length) >= 4 && (d === 1 || (d === 2 && x.length === y.length)));
}

/**
 * 把詞性字串拆成本字與括號（衍生字）兩組，例如「v./(n.)」→ { main: 'v.', paren: 'n.' }。
 * @param {string} pos 原始詞性。
 * @returns {{main: string, paren: string}} 詞性。
 */
function splitPos(pos) {
  const parts = pos.split('/').filter(Boolean);
  const main = parts.filter((p) => !p.startsWith('(')).map((p) => (p.endsWith('.') ? p : `${p}.`));
  const paren = parts.filter((p) => p.startsWith('(')).map((p) => p.replace(/[()]/g, '')).map((p) => (p.endsWith('.') ? p : `${p}.`));
  return { main: main.join('/'), paren: paren.join('/') };
}

/**
 * 展開一筆原始詞條為單字清單。
 * @param {{raw: string, pos: string, level: number}} entry 原始詞條。
 * @returns {{words: {en: string, pos: string}[], excluded: {en: string, reason: string}[]}} 展開結果。
 */
export function expandEntry(entry) {
  const words = [];
  const excluded = [];
  if (MANUAL_EXCLUDE[entry.raw]) return { words, excluded: [{ en: entry.raw, reason: MANUAL_EXCLUDE[entry.raw] }] };
  const { main, paren } = splitPos(entry.pos);
  // 代名詞的各種格（he (him, his, himself)）：只取主格。
  const pronoun = entry.raw.match(/^(\S+) \((.+)\)$/);
  const raw = pronoun ? pronoun[1] : entry.raw;
  if (pronoun) excluded.push({ en: pronoun[2], reason: '代名詞的受格、所有格與反身代名詞，只收主格' });
  const variants = raw.split('/').map(plain).filter(Boolean);
  const kept = [];
  for (const v of variants) {
    const suffix = v.match(/^([A-Za-z' -]+)\(([A-Za-z]+)\)$/);
    if (suffix) {
      const [, base, extra] = suffix;
      kept.push({ en: base, pos: main || paren });
      // glove(s)：複數可省略，只收單數；agree(ment)、capital(ism)：另收衍生字；argue(argument)：括號內是完整的字。
      if (extra === 's') excluded.push({ en: `${base}s`, reason: '複數寫法，只收單數' });
      else kept.push({ en: extra.length > 4 && extra.slice(0, 3) === base.slice(0, 3) ? extra : base + extra, pos: paren || main });
      continue;
    }
    kept.push({ en: v, pos: main });
  }
  for (const w of kept) {
    const same = words.find((x) => isSpellingVariant(x.en, w.en));
    if (same) {
      // 大小寫不同的同一個字（Internet／internet）：保留小寫。
      if (same.en.toLowerCase() === w.en.toLowerCase() && w.en === w.en.toLowerCase() && same.en !== w.en) {
        excluded.push({ en: same.en, reason: `與 ${w.en} 只差大小寫，收小寫` });
        same.en = w.en;
      } else if (same.en !== w.en) excluded.push({ en: w.en, reason: `${same.en} 的拼寫變體，只收第一種寫法` });
      else excluded.push({ en: w.en, reason: '只差重音符號，收不含重音的寫法' });
      continue;
    }
    if (/\./.test(w.en)) excluded.push({ en: w.en, reason: '含句點的縮寫' });
    else if (w.en.length < 2) excluded.push({ en: w.en, reason: '只有 1 個字母' });
    else if (/[A-Z]/.test(w.en)) excluded.push({ en: w.en, reason: '專有名詞或大寫縮寫' });
    else if (!/^[a-z][a-z' -]*[a-z]$/.test(w.en)) excluded.push({ en: w.en, reason: '含英文字母以外的字元' });
    else words.push(w);
  }
  return { words, excluded };
}

/**
 * 由英文單字產生 id：小寫，空格與撇號改為連字號。
 * @param {string} en 英文。
 * @returns {string} id。
 */
export function slug(en) {
  return en.toLowerCase().replace(/[ ']+/g, '-');
}

/**
 * 整理整份詞彙表。
 * @param {{raw: string, pos: string, level: number}[]} raw 原始詞條。
 * @returns {{list: {id: string, en: string, pos: string, level: number}[], excluded: {raw: string, en: string, level: number, reason: string}[]}} 結果。
 */
export function normalizeList(raw) {
  const list = [];
  const excluded = [];
  const seen = new Map();
  for (const entry of raw) {
    const r = expandEntry(entry);
    for (const e of r.excluded) excluded.push({ raw: entry.raw, en: e.en, level: entry.level, reason: e.reason });
    for (const w of r.words) {
      const prev = seen.get(w.en);
      // 同一個字在不同詞條重複出現（例如 measure 的動詞與 measures 措施）：詞性不同才另收一筆。
      if (prev && prev.pos === w.pos) {
        excluded.push({ raw: entry.raw, en: w.en, level: entry.level, reason: `與第 ${prev.level} 級的 ${w.en} 重複` });
        continue;
      }
      const id = prev ? `${slug(w.en)}-2` : slug(w.en);
      const item = { id, en: w.en, pos: MANUAL_POS[w.en] || w.pos, level: entry.level };
      if (!prev) seen.set(w.en, item);
      list.push(item);
    }
  }
  return { list, excluded };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data/ceec/ceec-108.json'), 'utf8'));
  const { list, excluded } = normalizeList(raw);
  /**
   * 以每行一筆的 JSON 陣列寫檔，方便比對差異。
   * @param {string} file 檔名。
   * @param {object[]} rows 資料。
   */
  const write = (file, rows) => writeFileSync(join(ROOT, file), `[\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n]\n`);
  write('data/list.json', list);
  write('data/excluded.json', excluded);
  const byLevel = [1, 2, 3, 4, 5, 6].map((lv) => list.filter((w) => w.level === lv).length);
  console.log(`單字 ${list.length} 個（Level 1～6：${byLevel.join('／')}），排除 ${excluded.length} 筆`);
}
