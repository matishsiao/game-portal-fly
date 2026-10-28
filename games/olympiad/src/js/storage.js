// 本機儲存：存檔、統計、獎勵紀錄、題目紀錄（錯題本與挑題用）與設定。所有讀寫都容錯。

import { isValidSave, DIFFICULTY_KEYS } from './game.js';
import { isTemplateId, templateOf } from './olympiad/bank.js';
import { TEMPLATE_RECENT } from './olympiad/pick.js';

const KEYS = {
  save: 'olympiad.save',
  stats: 'olympiad.stats',
  record: 'olympiad.record',
  settings: 'olympiad.settings',
};

/** 遊戲目錄名稱（獲得紀錄的來源）。 */
const GAME_DIR = 'olympiad';

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
    localStorage.setItem('olympiad.probe', '1');
    localStorage.removeItem('olympiad.probe');
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

// ---------- 題目紀錄（挑題與錯題本） ----------

/**
 * 讀取題目紀錄；損毀時視為空白，個別不合格的項目略過。
 * @returns {Record<string, {seen: number, last: number, review: boolean, recent?: string[], wrongId?: string}>} 題目紀錄。
 */
export function loadRecord() {
  const data = readJson(KEYS.record);
  const out = {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) return out;
  for (const [key, r] of Object.entries(data)) {
    if (!r || typeof r !== 'object' || !Number.isInteger(r.seen) || !Number.isFinite(r.last) || typeof r.review !== 'boolean') continue;
    const entry = { seen: r.seen, last: r.last, review: r.review };
    if (Array.isArray(r.recent)) entry.recent = r.recent.filter((x) => typeof x === 'string').slice(-TEMPLATE_RECENT);
    if (typeof r.wrongId === 'string') entry.wrongId = r.wrongId;
    out[key] = entry;
  }
  return out;
}

/**
 * 紀錄的鍵：固定題為題目 id，模板題為模板代碼。
 * @param {string} id 題目 id。
 * @returns {string} 紀錄的鍵。
 */
function recordKey(id) {
  return isTemplateId(id) ? templateOf(id) : id;
}

/**
 * 開局時記錄題目出現（出現次數、最後出現時間；模板另記最近的題目 id）。
 * @param {string[]} ids 本局題目 id。
 * @param {number} now 目前時間（毫秒）。
 */
export function markSeen(ids, now) {
  const record = loadRecord();
  for (const id of ids) {
    const key = recordKey(id);
    const r = record[key] || { seen: 0, last: 0, review: false };
    r.seen++;
    r.last = now;
    if (isTemplateId(id)) r.recent = [...(r.recent || []).filter((x) => x !== id), id].slice(-TEMPLATE_RECENT);
    record[key] = r;
  }
  writeJson(KEYS.record, record);
}

/**
 * 一題答對後更新待複習狀態：一次答對（沒答錯、沒看解題重點）移出，否則加入；模板題記住這一題供錯題本顯示。
 * @param {string} id 題目 id。
 * @param {boolean} clean 是否一次答對。
 */
export function markResult(id, clean) {
  const record = loadRecord();
  const key = recordKey(id);
  const r = record[key] || { seen: 1, last: Date.now(), review: false };
  r.review = !clean;
  if (isTemplateId(id)) {
    if (clean) delete r.wrongId;
    else r.wrongId = id;
  }
  record[key] = r;
  writeJson(KEYS.record, record);
}

/**
 * 錯題本：待複習的題目 id（模板題為最後一次答錯的那一題）。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目（不存在的略過）。
 * @returns {string[]} 題目 id，最近出現的在前。
 */
export function reviewIds(lookup) {
  return Object.entries(loadRecord())
    .filter(([, r]) => r.review)
    .sort((a, b) => b[1].last - a[1].last)
    .map(([key, r]) => (r.wrongId && templateOf(r.wrongId) === key ? r.wrongId : key))
    .filter((id) => lookup(id));
}

/**
 * 已練習過的固定題數（出現過即算）。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目。
 * @returns {number} 題數。
 */
export function practicedCount(lookup) {
  return Object.entries(loadRecord()).filter(([key, r]) => r.seen > 0 && !isTemplateId(key) && lookup(key)).length;
}

/** 清除錯題本（所有題目的待複習標記）。 */
export function clearReview() {
  const record = loadRecord();
  for (const r of Object.values(record)) {
    r.review = false;
    delete r.wrongId;
  }
  writeJson(KEYS.record, record);
}

// ---------- 設定 ----------

/**
 * 讀取設定。
 * @returns {{theme: 'system' | 'light' | 'dark', rest: boolean}} 主題與休息提醒開關。
 */
export function loadSettings() {
  const data = readJson(KEYS.settings);
  const theme = data && ['system', 'light', 'dark'].includes(data.theme) ? data.theme : 'system';
  const rest = !(data && data.rest === false);
  return { theme, rest };
}

/**
 * 寫入設定。
 * @param {{theme: string, rest: boolean}} settings 設定。
 */
export function saveSettings(settings) {
  writeJson(KEYS.settings, settings);
}
