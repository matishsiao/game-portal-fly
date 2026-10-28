// 挑題（純函式，可測試）：一般局依難度、科目、主題與題目紀錄挑 10 題；今日複習只挑到期的待複習題目。

import { ROUND_SIZE, shuffle } from '../game.js';
import { SUBJECTS, ALL_SUBJECTS } from './bank.js';
import { templatesFor, generate } from './templates.js';

/** 每局排序題、分類題各最多幾題（題庫足夠時至少各 1 題）。 */
export const MAX_PER_TYPE = { order: 2, sort: 2, choice: ROUND_SIZE };
/** 一般局中，到期的待複習題目最多幾題（其餘留給新題目）。 */
export const MAX_DUE = 3;
/** 每局模板題最多幾題。 */
export const MAX_TEMPLATES = 2;
/** 選「綜合」時每個科目至少幾題。 */
export const MIN_PER_SUBJECT = 2;
/** 選「全部主題」時同一個主題最多幾題。 */
export const MAX_PER_TOPIC = 3;
/** 間隔複習最長的間隔（毫秒）再多 1 天：到期日超過這個距離視為裝置時間異常。 */
export const MAX_INTERVAL_MS = 15 * 24 * 3600 * 1000;
/** 今日複習至少要有幾題到期才開局。 */
export const MIN_REVIEW = 3;

/**
 * 題目紀錄是否到期該複習。
 * @param {{review?: boolean, due?: number} | undefined} r 題目紀錄。
 * @param {number} now 目前時間（毫秒）。
 * @returns {boolean} 到期時為 true。
 */
export function isDue(r, now) {
  // 到期日比現在晚超過 MAX_INTERVAL_MS（裝置時間被往回調）時也視為到期，避免題目永遠不出現。
  return !!r && r.review === true && Number.isFinite(r.due) && (r.due <= now || r.due - now > MAX_INTERVAL_MS);
}

/**
 * 依「從未出現、最久沒出現」排序，同順位時隨機。
 * @param {object[]} list 候選題目。
 * @param {Record<string, {seen?: number, last?: number}>} record 題目紀錄。
 * @param {() => number} rng 亂數產生器。
 * @returns {object[]} 排序後的新陣列。
 */
function byPriority(list, record, rng) {
  /**
   * 計算排序順位（數字小的優先）。
   * @param {object} q 題目。
   * @returns {number[]} [是否出現過, 最後出現時間]。
   */
  const rank = (q) => {
    const r = record[q.id] || {};
    return [r.seen ? 1 : 0, r.last || 0];
  };
  return shuffle(list, rng)
    .map((q) => ({ q, r: rank(q) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1])
    .map((x) => x.q);
}

/**
 * 挑出一般局的題目。
 * @param {object} options 選項。
 * @param {string} options.difficulty 難度代碼。
 * @param {string} options.subject 科目代碼或 `all`。
 * @param {string[]} [options.topics] 選的主題（空陣列表示全部）。
 * @param {object[]} options.questions 題庫。
 * @param {Record<string, object>} [options.record] 題目紀錄（模板以模板代碼為鍵）。
 * @param {number} [options.now] 目前時間（毫秒）。
 * @param {() => number} [options.rng] 亂數產生器。
 * @returns {{ids: string[], extra: object[], widened: boolean}} 題目 id（已打亂順序）、本局產生的模板題，以及是否因主題題數不足而放寬到同科目其他主題。
 */
export function pickRound({ difficulty, subject, topics = [], questions, record = {}, now = Date.now(), rng = Math.random }) {
  const inSubject = questions.filter((q) => q.difficulty === difficulty && (subject === ALL_SUBJECTS || q.subject === subject));
  const inTopics = topics.length ? inSubject.filter((q) => topics.includes(q.topic)) : inSubject;
  const tplKeys = templatesFor(difficulty, subject, topics);
  const widened = topics.length > 0 && inTopics.length + Math.min(MAX_TEMPLATES, tplKeys.length) < ROUND_SIZE;
  const pool = widened ? inSubject : inTopics;
  const picked = [];
  const cards = new Set();
  const types = { choice: 0, order: 0, sort: 0 };
  const topicCount = {};
  const subjectCount = Object.fromEntries(SUBJECTS.map((s) => [s, 0]));
  /**
   * 加入一題，並記下它的知識卡、題型、主題與科目。
   * @param {object} q 題目。
   */
  const add = (q) => {
    picked.push(q);
    cards.add(q.card);
    types[q.type]++;
    topicCount[q.topic] = (topicCount[q.topic] || 0) + 1;
    subjectCount[q.subject]++;
  };
  /**
   * 是否可以加入。
   * @param {object} q 題目。
   * @param {boolean} strict 是否遵守題型、主題上限與知識卡不重複。
   * @returns {boolean} 可以時為 true。
   */
  const ok = (q, strict) => !picked.includes(q) && (!strict || (!cards.has(q.card) && types[q.type] < MAX_PER_TYPE[q.type] && (topics.length > 0 || (topicCount[q.topic] || 0) < MAX_PER_TOPIC)));
  // 1. 到期的待複習題目（最早到期的優先），最多 MAX_DUE 題。
  const due = pool.filter((q) => isDue(record[q.id], now)).sort((a, b) => record[a.id].due - record[b.id].due);
  for (const q of due) if (picked.length < MAX_DUE && ok(q, true)) add(q);
  const ordered = byPriority(pool.filter((q) => !picked.includes(q)), record, rng);
  // 2. 綜合時每個科目至少 MIN_PER_SUBJECT 題。
  if (subject === ALL_SUBJECTS) {
    for (const s of SUBJECTS) {
      for (const q of ordered) {
        if (subjectCount[s] >= MIN_PER_SUBJECT) break;
        if (q.subject === s && ok(q, true)) add(q);
      }
    }
  }
  // 3. 排序題、分類題各至少 1 題。
  for (const type of ['order', 'sort']) {
    if (!types[type]) {
      const q = ordered.find((c) => c.type === type && ok(c, true));
      if (q) add(q);
    }
  }
  // 4. 模板題：待複習的模板優先，其餘依最久沒出現；每個模板一局最多 1 題。
  const extra = [];
  const tplOrder = shuffle(tplKeys, rng).sort((a, b) => Number(!!(record[b] && record[b].review)) - Number(!!(record[a] && record[a].review)) || ((record[a] && record[a].last) || 0) - ((record[b] && record[b].last) || 0));
  for (const key of tplOrder) {
    if (extra.length >= MAX_TEMPLATES || picked.length + extra.length >= ROUND_SIZE) break;
    const q = generate(key, rng, new Set((record[key] && record[key].recent) || []));
    if (q) extra.push(q);
  }
  // 5. 依優先順序補滿；不足時放寬限制。
  for (const strict of [true, false]) {
    for (const q of ordered) {
      if (picked.length + extra.length >= ROUND_SIZE) break;
      if (ok(q, strict)) add(q);
    }
  }
  return { ids: shuffle([...picked.map((q) => q.id), ...extra.map((q) => q.id)], rng), extra, widened };
}

/**
 * 挑出今日複習的題目：所有到期的待複習題目（最早到期的優先），最多 ROUND_SIZE 題；到期的模板以新參數出題。
 * @param {object} options 選項。
 * @param {object[]} options.questions 題庫。
 * @param {Record<string, object>} options.record 題目紀錄。
 * @param {number} [options.now] 目前時間（毫秒）。
 * @param {() => number} [options.rng] 亂數產生器。
 * @param {string[]} [options.templateKeys] 所有模板代碼。
 * @returns {{ids: string[], extra: object[], difficulty: string}} 題目 id、模板題，以及題目中最多的難度（決定解題重點額度）。
 */
export function pickReview({ questions, record, now = Date.now(), rng = Math.random, templateKeys = [] }) {
  const due = questions.filter((q) => isDue(record[q.id], now)).sort((a, b) => record[a.id].due - record[b.id].due).slice(0, ROUND_SIZE);
  const extra = [];
  for (const key of templateKeys.filter((k) => isDue(record[k], now))) {
    if (due.length + extra.length >= ROUND_SIZE) break;
    const q = generate(key, rng, new Set(record[key].recent || []));
    if (q) extra.push(q);
  }
  const all = [...due, ...extra];
  const counts = {};
  for (const q of due) counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
  const difficulty = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 'medium';
  return { ids: all.length >= MIN_REVIEW ? shuffle(all.map((q) => q.id), rng) : [], extra, difficulty };
}
