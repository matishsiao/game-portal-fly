// 挑題：依題目紀錄從固定題庫與題型模板挑出一局的題目（純函式，可測試）。

import { TEMPLATES, generateQuestion } from './templates.js';
import { ROUND_SIZE, shuffle } from '../game.js';

/** 每局最多幾題模板題。 */
export const TEMPLATE_PER_ROUND = 4;

/** 同一局中同一題型最多幾題。 */
export const TOPIC_LIMIT = 3;

/** 模板記住最近幾題的參數，新題不得與其相同。 */
export const TEMPLATE_RECENT = 20;

/** 模板避開最近參數時最多重抽幾次。 */
const REROLL = 30;

/**
 * 依「待複習優先、再來最久沒出現」排序；從未出現的排最前面。
 * @param {Array<{key: string}>} list 候選（含 key）。
 * @param {Record<string, {seen?: number, last?: number, review?: boolean}>} record 題目紀錄。
 * @param {() => number} rng 亂數產生器（同順位時隨機）。
 * @param {boolean} reviewFirst 待複習是否排在從未出現之前（模板為 true，固定題為 false）。
 * @returns {Array<{key: string}>} 排序後的新陣列。
 */
function byPriority(list, record, rng, reviewFirst) {
  /**
   * 計算排序順位（數字小的優先）。
   * @param {{key: string}} c 候選。
   * @returns {number[]} [類別, 最後出現時間]。
   */
  const rank = (c) => {
    const r = record[c.key] || {};
    const unseen = !r.seen;
    const review = !!r.review;
    let group;
    if (reviewFirst) group = review ? 0 : unseen ? 1 : 2;
    else group = unseen ? 0 : review ? 1 : 2;
    return [group, r.last || 0];
  };
  return shuffle(list, rng)
    .map((c) => ({ c, r: rank(c) }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1])
    .map((x) => x.c);
}

/**
 * 依順序挑選，同題型不超過上限；不足時放寬題型上限補滿。
 * @param {Array<{key: string, topic: string}>} ordered 已排序的候選。
 * @param {number} count 要挑幾個。
 * @param {Record<string, number>} topicCount 已挑題型的計數（會被修改）。
 * @returns {Array<{key: string, topic: string}>} 挑中的候選。
 */
function takeWithTopicLimit(ordered, count, topicCount) {
  const out = [];
  for (const strict of [true, false]) {
    for (const c of ordered) {
      if (out.length >= count) break;
      if (out.includes(c)) continue;
      if (strict && (topicCount[c.topic] || 0) >= TOPIC_LIMIT) continue;
      out.push(c);
      topicCount[c.topic] = (topicCount[c.topic] || 0) + 1;
    }
  }
  return out;
}

/**
 * 以模板產生一題，盡量避開該模板最近出現過的參數。
 * @param {string} templateId 模板代碼。
 * @param {string[]} recent 最近出現過的題目 id。
 * @param {() => number} rng 亂數產生器。
 * @returns {object} 題目。
 */
function freshTemplateQuestion(templateId, recent, rng) {
  let q = generateQuestion(templateId, rng);
  for (let i = 0; i < REROLL && recent.includes(q.id); i++) q = generateQuestion(templateId, rng);
  return q;
}

/**
 * 挑出一局的題目 id。
 * @param {object} options 選項。
 * @param {string} options.difficulty 難度代碼。
 * @param {object[]} options.questions 固定題庫。
 * @param {Record<string, {seen?: number, last?: number, review?: boolean, recent?: string[]}>} [options.record] 題目紀錄（固定題以 id、模板以模板代碼為鍵）。
 * @param {() => number} [options.rng] 亂數產生器。
 * @returns {string[]} 題目 id（已打亂順序），最多 ROUND_SIZE 題。
 */
export function pickRound({ difficulty, questions, record = {}, rng = Math.random }) {
  const topicCount = {};
  const templates = Object.keys(TEMPLATES)
    .filter((key) => TEMPLATES[key].difficulty === difficulty)
    .map((key) => ({ key, topic: TEMPLATES[key].topic }));
  const pickedTemplates = takeWithTopicLimit(byPriority(templates, record, rng, true), Math.min(TEMPLATE_PER_ROUND, templates.length), topicCount);
  const fixed = questions.filter((q) => q.difficulty === difficulty).map((q) => ({ key: q.id, topic: q.topic }));
  const pickedFixed = takeWithTopicLimit(byPriority(fixed, record, rng, false), ROUND_SIZE - pickedTemplates.length, topicCount);
  const ids = [
    ...pickedFixed.map((c) => c.key),
    ...pickedTemplates.map((c) => freshTemplateQuestion(c.key, (record[c.key] && record[c.key].recent) || [], rng).id),
  ];
  return shuffle(ids, rng);
}
