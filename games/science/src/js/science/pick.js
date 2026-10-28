// 挑題：依模式（預習、練習、今日複習、綜合練習）、題目紀錄與題型比例挑出一局的題目（純函式，可測試）。

import { ROUND_SIZE, shuffle } from '../game.js';
import { TOPICS } from './bank.js';
import { isDue } from './srs.js';

/** 每局排順序題、分類題各最多幾題（題庫足夠時至少各 1 題）。 */
export const MAX_PER_TYPE = { order: 2, sort: 2, choice: ROUND_SIZE };

/** 今日複習至少要有幾題到期才開局。 */
export const MIN_REVIEW = 3;

/**
 * 依優先順序排序，同順位時隨機。
 * - 預習：沒出現過的優先，其次是最久沒出現的。
 * - 其他模式：到期要複習的、待複習（答錯過）的、沒出現過的、最久沒出現的。
 * @param {object[]} list 候選題目。
 * @param {Record<string, object>} record 題目紀錄。
 * @param {string} mode 模式代碼。
 * @param {string} today 今天 `YYYY-MM-DD`。
 * @param {() => number} rng 亂數產生器。
 * @returns {object[]} 排序後的新陣列。
 */
function byPriority(list, record, mode, today, rng) {
  /**
   * 計算排序順位（數字小的優先）。
   * @param {object} q 題目。
   * @returns {Array<number | string>} [類別, 次要排序值]。
   */
  const rank = (q) => {
    const r = record[q.id] || {};
    if (mode === 'preview') return [r.seen ? 1 : 0, r.last || 0];
    if (isDue(r, today)) return [0, r.due];
    if (r.review) return [1, r.last || 0];
    return [r.seen ? 3 : 2, r.last || 0];
  };
  return shuffle(list, rng)
    .map((q) => ({ q, r: rank(q) }))
    .sort((a, b) => a.r[0] - b.r[0] || (a.r[1] < b.r[1] ? -1 : a.r[1] > b.r[1] ? 1 : 0))
    .map((x) => x.q);
}

/**
 * 挑出一局的題目 id。
 * - 預習、練習：只出該單元；排順序題、分類題各至少 1 題、最多 2 題（題庫足夠時）。預習時選擇題排在前面，排序與分類題排在後面。
 * - 今日複習：只出這個學習階段到期的題目，最多 ROUND_SIZE 題；不足 MIN_REVIEW 題時回傳空陣列。
 * - 綜合練習：整個學習階段，四個主題各至少 1 題，排順序題與分類題各至少 1 題。
 * - 同一局同一張科學卡最多 1 題；題目不足時才放寬題型上限與科學卡限制。
 * @param {object} options 選項。
 * @param {string} options.difficulty 學習階段代碼。
 * @param {string} options.mode 模式代碼。
 * @param {string | null} [options.unit] 單元 id（預習與練習）。
 * @param {object[]} options.questions 題庫。
 * @param {Record<string, object>} [options.record] 題目紀錄。
 * @param {string} options.today 今天 `YYYY-MM-DD`。
 * @param {() => number} [options.rng] 亂數產生器。
 * @returns {string[]} 題目 id，最多 ROUND_SIZE 題。
 */
export function pickRound({ difficulty, mode, unit = null, questions, record = {}, today, rng = Math.random }) {
  let candidates = questions.filter((q) => q.difficulty === difficulty);
  if (mode === 'preview' || mode === 'practice') candidates = candidates.filter((q) => q.unit === unit);
  if (mode === 'review') candidates = candidates.filter((q) => isDue(record[q.id], today));
  const pool = byPriority(candidates, record, mode, today, rng);
  if (mode === 'review' && pool.length < MIN_REVIEW) return [];
  const picked = [];
  const cards = new Set();
  const types = { choice: 0, order: 0, sort: 0 };
  /**
   * 加入一題，並記下它的科學卡與題型。
   * @param {object} q 題目。
   */
  const add = (q) => {
    picked.push(q);
    cards.add(q.card);
    types[q.type]++;
  };
  /**
   * 是否可以加入。
   * @param {object} q 題目。
   * @param {boolean} strict 是否遵守題型上限與科學卡不重複。
   * @returns {boolean} 可以時為 true。
   */
  const ok = (q, strict) => !picked.includes(q) && (!strict || (!cards.has(q.card) && types[q.type] < MAX_PER_TYPE[q.type]));
  // 1. 綜合練習：每個主題先挑 1 題。
  if (mode === 'mixed') {
    for (const t of TOPICS) {
      const q = pool.find((c) => c.topic === t && ok(c, true));
      if (q) add(q);
    }
  }
  // 2. 今日複習以外：排順序題、分類題各至少 1 題。
  if (mode !== 'review') {
    for (const type of ['order', 'sort']) {
      if (!types[type]) {
        const q = pool.find((c) => c.type === type && ok(c, true));
        if (q && picked.length < ROUND_SIZE) add(q);
      }
    }
  }
  // 3. 依優先順序補滿；不足時放寬限制。
  for (const strict of [true, false]) {
    for (const q of pool) {
      if (picked.length >= ROUND_SIZE) break;
      if (ok(q, strict)) add(q);
    }
  }
  // 預習由易到難：選擇題在前，排序與分類題在後；其他模式打亂順序。
  if (mode === 'preview') {
    const shuffled = shuffle(picked, rng);
    return [...shuffled.filter((q) => q.type === 'choice'), ...shuffled.filter((q) => q.type !== 'choice')].map((q) => q.id);
  }
  return shuffle(picked.map((q) => q.id), rng);
}

/**
 * 某個學習階段今天到期要複習的題數。
 * @param {string} difficulty 學習階段代碼。
 * @param {object[]} questions 題庫。
 * @param {Record<string, object>} record 題目紀錄。
 * @param {string} today 今天 `YYYY-MM-DD`。
 * @returns {number} 到期題數。
 */
export function dueCount(difficulty, questions, record, today) {
  return questions.filter((q) => q.difficulty === difficulty && isDue(record[q.id], today)).length;
}
