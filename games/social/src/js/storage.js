// 本機儲存：存檔、統計、獎勵紀錄、題目紀錄（間隔複習、錯題本與挑題用）、知識圖鑑與設定。所有讀寫都容錯。

import { isValidSave, DIFFICULTY_KEYS } from './game.js';
import { SUBJECTS, ALL_SUBJECTS, TOPICS } from './social/bank.js';
import { isDue } from './social/pick.js';

const KEYS = {
  save: 'social.save',
  stats: 'social.stats',
  record: 'social.record',
  cards: 'social.cards',
  settings: 'social.settings',
};

/** 遊戲目錄名稱（獲得紀錄的來源）。 */
const GAME_DIR = 'social';

/** 獲得紀錄的共用鍵（學習遊戲寫入；口袋地城讀取後發放獎勵禮包）。 */
const REWARD_KEY = 'games.rewards';
/** 難度代碼對應的禮包等級與名稱。 */
const REWARD_TIER = { easy: [1, '簡單'], medium: [2, '中等'], hard: [3, '困難'], expert: [4, '專家'] };

/** localStorage 無法使用時的記憶體備援。 */
const memory = new Map();

/**
 * 讀取並解析 JSON；不存在時回傳 undefined，解析失敗時回傳 null。
 * @param {string} key 儲存鍵。
 * @returns {any} 解析結果。
 */
function readJson(key) {
  let text;
  try {
    text = localStorage.getItem(key);
  } catch {
    text = memory.has(key) ? memory.get(key) : null;
  }
  if (text === null || text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * 寫入 JSON；localStorage 失敗時改存記憶體。
 * @param {string} key 儲存鍵。
 * @param {any} value 要寫入的值。
 */
function writeJson(key, value) {
  const text = JSON.stringify(value);
  try {
    localStorage.setItem(key, text);
  } catch {
    memory.set(key, text);
  }
}

/**
 * 刪除儲存項目。
 * @param {string} key 儲存鍵。
 */
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略：儲存空間不可用時改用記憶體。
  }
  memory.delete(key);
}

/**
 * 新增一筆獲得紀錄（同一個 id 只記一次，重複過關不會再記）。
 * @param {string} id 紀錄代碼（遊戲:項目:種類）。
 * @param {'clear' | 'perfect' | 'daily'} type 第一次過關、第一次全對或當天第一次完成（每日練習）。
 * @param {number} tier 禮包等級（1～5）。
 * @param {string} label 顯示用的說明。
 * @returns {boolean} 是否新寫入（已存在時為 false）。
 */
function addReward(id, type, tier, label) {
  const raw = readJson(REWARD_KEY);
  const list = Array.isArray(raw) ? raw : [];
  if (list.some((r) => r && r.id === id)) return false;
  list.push({ id, game: GAME_DIR, type, tier: Math.min(5, tier), label, at: Date.now() });
  writeJson(REWARD_KEY, list.slice(-1000));
  return true;
}

/**
 * 今天的每日練習紀錄代碼（本機日期，例如 daily:2026-10-27）：所有學習遊戲共用，一天只記一次。
 * @returns {string} 紀錄代碼。
 */
function dailyId() {
  const d = new Date();
  return `daily:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 判斷 localStorage 是否可用。
 * @returns {boolean} 可用時為 true。
 */
export function storageAvailable() {
  try {
    localStorage.setItem('social.probe', '1');
    localStorage.removeItem('social.probe');
    return true;
  } catch {
    return false;
  }
}

// ---------- 存檔 ----------

/**
 * 讀取存檔。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目。
 * @returns {{status: 'none' | 'ok' | 'corrupt', state?: object}} 讀取結果。
 */
export function loadSave(lookup) {
  const data = readJson(KEYS.save);
  if (data === undefined) return { status: 'none' };
  if (!isValidSave(data, lookup)) return { status: 'corrupt' };
  return { status: 'ok', state: data };
}

/**
 * 寫入存檔。
 * @param {object} state 遊戲狀態。
 */
export function writeSave(state) {
  writeJson(KEYS.save, state);
}

/** 刪除存檔。 */
export function clearSave() {
  remove(KEYS.save);
}

// ---------- 統計與獎勵 ----------

/**
 * 建立空白統計。
 * @returns {Record<string, object>} 每個難度的統計。
 */
function emptyStats() {
  const stats = {};
  for (const key of DIFFICULTY_KEYS) stats[key] = { started: 0, completed: 0, bestMs: null, totalMs: 0, noHint: 0 };
  return stats;
}

/**
 * 讀取統計；資料損毀的難度重設為空白。
 * @returns {Record<string, {started: number, completed: number, bestMs: number | null, totalMs: number, noHint: number}>} 統計。
 */
export function loadStats() {
  const data = readJson(KEYS.stats);
  const stats = emptyStats();
  if (!data || typeof data !== 'object') return stats;
  for (const key of DIFFICULTY_KEYS) {
    const d = data[key];
    const num = (v) => Number.isFinite(v) && v >= 0;
    if (d && num(d.started) && num(d.completed) && num(d.totalMs) && num(d.noHint) && (d.bestMs === null || num(d.bestMs))) {
      stats[key] = d;
    }
  }
  return stats;
}

/**
 * 記錄開始一局。
 * @param {string} difficulty 難度代碼。
 */
export function recordStart(difficulty) {
  const stats = loadStats();
  stats[difficulty].started++;
  writeJson(KEYS.stats, stats);
}

/**
 * 記錄完成一局，並寫入獎勵紀錄（第一次過關、第一次全對與每日練習）。
 * @param {string} difficulty 難度代碼。
 * @param {number} ms 耗時毫秒。
 * @param {boolean} perfect 是否全對（沒答錯、沒主動看解題重點）。
 * @returns {{newRecord: boolean, rewards: string[]}} 是否刷新最佳時間，以及這次新得到的禮包說明。
 */
export function recordComplete(difficulty, ms, perfect) {
  const stats = loadStats();
  const s = stats[difficulty];
  // 獲得紀錄：這個難度第一次過關、第一次全對（重複過關不會再記）。
  const firstClear = s.completed === 0;
  const firstPerfect = perfect && s.noHint === 0;
  const newRecord = s.bestMs === null || ms < s.bestMs;
  s.completed++;
  s.totalMs += ms;
  if (newRecord) s.bestMs = ms;
  if (perfect) s.noHint++;
  writeJson(KEYS.stats, stats);
  const [tier, name] = REWARD_TIER[difficulty] || [1, difficulty];
  const rewards = [];
  if (firstClear && addReward(`${GAME_DIR}:${difficulty}:clear`, 'clear', tier, `${name} 第一次過關`)) rewards.push(`${name} 第一次過關`);
  if (firstPerfect && addReward(`${GAME_DIR}:${difficulty}:perfect`, 'perfect', tier + 1, `${name} 第一次全對（沒答錯、沒看解題重點）`)) rewards.push(`${name} 第一次全對`);
  // 每日練習：今天第一次在任何學習遊戲過關（口袋地城每天可領一次入場卷）。
  if (addReward(dailyId(), 'daily', 1, `今天第一次過關（${name}）`)) rewards.push('今天的每日練習');
  return { newRecord, rewards };
}

/** 重設統計（不影響錯題本與題目紀錄）。 */
export function resetStats() {
  writeJson(KEYS.stats, emptyStats());
}

// ---------- 題目紀錄（挑題、間隔複習與錯題本） ----------

/** 一天的毫秒數。 */
const DAY_MS = 24 * 3600 * 1000;
/** 間隔複習：答錯後 1 天到期；之後每次到期後一次答對，間隔依序為 3、7、14 天；再答對即「已掌握」。 */
export const INTERVAL_DAYS = [1, 3, 7, 14];
/** 模板題記住最近幾題的參數（避免重複出同一組數字）。 */
const TEMPLATE_RECENT = 20;

/**
 * 題目紀錄的鍵：固定題用題目 id，模板題用模板代碼（「century#1624」→「century」）。
 * @param {string} id 題目 id。
 * @returns {string} 紀錄的鍵。
 */
export function recordKey(id) {
  const i = String(id).indexOf('#');
  return i < 0 ? id : id.slice(0, i);
}

/**
 * 讀取題目紀錄；損毀時視為空白，個別不合格的項目略過。
 * @returns {Record<string, {seen: number, last: number, review: boolean, stage: number, due: number | null, mastered: boolean, recent?: string[]}>} 以題目 id（模板為模板代碼）為鍵的紀錄。
 */
export function loadRecord() {
  const data = readJson(KEYS.record);
  const out = {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  for (const [id, r] of Object.entries(data)) {
    if (!r || !Number.isInteger(r.seen) || !Number.isFinite(r.last) || typeof r.review !== 'boolean') continue;
    out[id] = {
      seen: r.seen,
      last: r.last,
      review: r.review,
      stage: Number.isInteger(r.stage) && r.stage >= 0 && r.stage < INTERVAL_DAYS.length ? r.stage : 0,
      due: Number.isFinite(r.due) ? r.due : null,
      mastered: r.mastered === true,
    };
    if (Array.isArray(r.recent)) out[id].recent = r.recent.filter((x) => typeof x === 'string').slice(-TEMPLATE_RECENT);
  }
  return out;
}

/**
 * 開局時記錄題目出現（出現次數、最後出現時間；模板另記這一題的參數）。
 * @param {string[]} ids 本局題目 id。
 * @param {number} now 目前時間（毫秒）。
 */
export function markSeen(ids, now) {
  const record = loadRecord();
  for (const id of ids) {
    const key = recordKey(id);
    const r = record[key] || { seen: 0, last: 0, review: false, stage: 0, due: null, mastered: false };
    r.seen++;
    r.last = now;
    if (key !== id) r.recent = [...(r.recent || []).filter((x) => x !== id), id].slice(-TEMPLATE_RECENT);
    record[key] = r;
  }
  writeJson(KEYS.record, record);
}

/**
 * 依一題的作答結果更新間隔複習狀態（純函式）。
 * - 答錯或看了解題重點：列入待複習，1 天後到期（待複習期間答錯也回到 1 天）。
 * - 一次答對：待複習且已到期時，間隔延長一階（3、7、14 天），最後一階之後即「已掌握」；還沒到期就答對不改變；不在待複習中則直接「已掌握」。
 * @param {object | undefined} prev 原本的紀錄。
 * @param {boolean} clean 是否一次答對。
 * @param {number} now 目前時間（毫秒）。
 * @returns {object} 新的紀錄。
 */
export function nextReviewState(prev, clean, now) {
  const r = { seen: 1, last: now, review: false, stage: 0, due: null, mastered: false, ...(prev || {}) };
  if (!clean) return { ...r, review: true, stage: 0, due: now + INTERVAL_DAYS[0] * DAY_MS, mastered: false };
  if (!r.review) return { ...r, mastered: true };
  if (!isDue(r, now)) return r;
  const stage = r.stage + 1;
  if (stage >= INTERVAL_DAYS.length) return { ...r, review: false, stage: 0, due: null, mastered: true };
  return { ...r, stage, due: now + INTERVAL_DAYS[stage] * DAY_MS };
}

/**
 * 一題答對後更新題目紀錄（間隔複習）。
 * @param {string} id 題目 id（模板題更新模板的紀錄）。
 * @param {boolean} clean 是否一次答對（沒答錯、沒看解題重點）。
 * @param {number} now 目前時間（毫秒）。
 */
export function markResult(id, clean, now) {
  const record = loadRecord();
  const key = recordKey(id);
  record[key] = nextReviewState(record[key], clean, now);
  writeJson(KEYS.record, record);
}

/**
 * 錯題本：待複習的題目 id（固定題），最近出現的在前。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目（不存在的略過）。
 * @returns {string[]} 題目 id。
 */
export function reviewIds(lookup) {
  return Object.entries(loadRecord())
    .filter(([id, r]) => r.review && !id.includes('#') && lookup(id))
    .sort((a, b) => b[1].last - a[1].last)
    .map(([id]) => id);
}

/**
 * 今天到期、可以「今日複習」的題目數（固定題與模板）。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目。
 * @param {string[]} templateKeys 所有模板代碼。
 * @param {number} now 目前時間（毫秒）。
 * @returns {number} 題數。
 */
export function dueCount(lookup, templateKeys, now) {
  return Object.entries(loadRecord()).filter(([id, r]) => isDue(r, now) && (templateKeys.includes(id) || lookup(id))).length;
}

/**
 * 某難度、科目各主題的進度：題數與已掌握題數。
 * @param {object[]} questions 題庫。
 * @param {string} difficulty 難度代碼。
 * @param {string} subject 科目代碼。
 * @returns {Record<string, {total: number, mastered: number}>} 以主題代碼為鍵。
 */
export function topicProgress(questions, difficulty, subject) {
  const record = loadRecord();
  const out = {};
  for (const q of questions) {
    if (q.difficulty !== difficulty || q.subject !== subject) continue;
    const p = out[q.topic] || (out[q.topic] = { total: 0, mastered: 0 });
    p.total++;
    if (record[q.id] && record[q.id].mastered) p.mastered++;
  }
  return out;
}

/** 清除錯題本（所有題目的待複習標記與到期日；已掌握的紀錄保留）。 */
export function clearReview() {
  const record = loadRecord();
  for (const r of Object.values(record)) {
    r.review = false;
    r.stage = 0;
    r.due = null;
  }
  writeJson(KEYS.record, record);
}

// ---------- 知識圖鑑 ----------

/**
 * 讀取已收集的知識卡；損毀時視為空白。
 * @returns {Record<string, number>} 以知識卡 id 為鍵、收集時間（毫秒）為值。
 */
export function loadCards() {
  const data = readJson(KEYS.cards);
  const out = {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  for (const [id, at] of Object.entries(data)) if (Number.isFinite(at)) out[id] = at;
  return out;
}

/**
 * 收集一張知識卡（已收集過的不重複記錄）。
 * @param {string} id 知識卡 id。
 * @param {number} now 目前時間（毫秒）。
 * @returns {boolean} 是否為第一次收集。
 */
export function collectCard(id, now) {
  const cards = loadCards();
  if (cards[id]) return false;
  cards[id] = now;
  writeJson(KEYS.cards, cards);
  return true;
}

// ---------- 設定 ----------

/**
 * 讀取設定。
 * @returns {{theme: 'system' | 'light' | 'dark', rest: boolean, subject: string, topics: string[]}} 主題、休息提醒開關、上次選的科目與主題（空陣列表示全部主題）。
 */
export function loadSettings() {
  const data = readJson(KEYS.settings);
  const theme = data && ['system', 'light', 'dark'].includes(data.theme) ? data.theme : 'system';
  const rest = !(data && data.rest === false);
  const subject = data && (SUBJECTS.includes(data.subject) || data.subject === ALL_SUBJECTS) ? data.subject : ALL_SUBJECTS;
  const topics = data && Array.isArray(data.topics) ? data.topics.filter((t) => TOPICS.includes(t)) : [];
  return { theme, rest, subject, topics };
}

/**
 * 寫入設定。
 * @param {{theme: string, rest: boolean, subject: string, topics: string[]}} settings 設定。
 */
export function saveSettings(settings) {
  writeJson(KEYS.settings, settings);
}
