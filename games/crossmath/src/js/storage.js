// 本機儲存：存檔、統計、設定、預先產生的題目與最近題目雜湊。所有讀寫都容錯。

import { isValidSave } from './game.js';
import { DIFFICULTY_KEYS } from './crossmath/generator.js';
import { isValidPuzzle } from './crossmath/core.js';

const KEYS = {
  save: 'crossmath.save',
  stats: 'crossmath.stats',
  settings: 'crossmath.settings',
  pregen: 'crossmath.pregen',
  recent: 'crossmath.recent',
};

const RECENT_LIMIT = 50;

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
 * 判斷 localStorage 是否可用。
 * @returns {boolean} 可用時為 true。
 */
export function storageAvailable() {
  try {
    localStorage.setItem('crossmath.probe', '1');
    localStorage.removeItem('crossmath.probe');
    return true;
  } catch {
    return false;
  }
}

/**
 * 讀取存檔。
 * @returns {{status: 'none' | 'ok' | 'corrupt', state?: object}} 讀取結果。
 */
export function loadSave() {
  const data = readJson(KEYS.save);
  if (data === undefined) return { status: 'none' };
  if (!isValidSave(data)) return { status: 'corrupt' };
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

/**
 * 建立空白統計。
 * @returns {Record<string, object>} 每個難度的統計。
 */
function emptyStats() {
  const stats = {};
  for (const key of DIFFICULTY_KEYS) {
    stats[key] = { started: 0, completed: 0, bestMs: null, totalMs: 0, noHint: 0 };
  }
  return stats;
}

/**
 * 讀取統計；資料損毀時重設為空白。
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
 * 記錄完成一局。
 * @param {string} difficulty 難度代碼。
 * @param {number} ms 耗時毫秒。
 * @param {number} hintsUsed 已用提示次數。
 * @returns {{newRecord: boolean}} 是否刷新最佳時間。
 */
export function recordComplete(difficulty, ms, hintsUsed) {
  const stats = loadStats();
  const s = stats[difficulty];
  const newRecord = s.bestMs === null || ms < s.bestMs;
  s.completed++;
  s.totalMs += ms;
  if (newRecord) s.bestMs = ms;
  if (hintsUsed === 0) s.noHint++;
  writeJson(KEYS.stats, stats);
  return { newRecord };
}

/** 重設統計。 */
export function resetStats() {
  writeJson(KEYS.stats, emptyStats());
}

/**
 * 讀取設定。
 * @returns {{theme: 'system' | 'light' | 'dark'}} 設定。
 */
export function loadSettings() {
  const data = readJson(KEYS.settings);
  const theme = data && ['system', 'light', 'dark'].includes(data.theme) ? data.theme : 'system';
  return { theme };
}

/**
 * 寫入設定。
 * @param {{theme: string}} settings 設定。
 */
export function saveSettings(settings) {
  writeJson(KEYS.settings, settings);
}

/**
 * 取出並刪除預先產生的題目。
 * @param {string} difficulty 難度代碼。
 * @returns {{difficulty: string, size: number, layout: string, givens: number[], solution: number[], hash: string} | null}
 *   題目，沒有或損毀時為 null。
 */
export function takePregen(difficulty) {
  const data = readJson(KEYS.pregen);
  if (!data || typeof data !== 'object') return null;
  const item = data[difficulty];
  delete data[difficulty];
  writeJson(KEYS.pregen, data);
  const ok = item && typeof item.hash === 'string' && isValidPuzzle(item);
  return ok ? { ...item, difficulty } : null;
}

/**
 * 判斷是否已有某難度的預先產生題目。
 * @param {string} difficulty 難度代碼。
 * @returns {boolean} 已有時為 true。
 */
export function hasPregen(difficulty) {
  const data = readJson(KEYS.pregen);
  return !!(data && data[difficulty]);
}

/**
 * 儲存預先產生的題目。
 * @param {{difficulty: string, size: number, layout: string, givens: number[], solution: number[], hash: string}} item 題目。
 */
export function storePregen(item) {
  const data = readJson(KEYS.pregen);
  const next = data && typeof data === 'object' ? data : {};
  const { size, layout, givens, solution, hash } = item;
  next[item.difficulty] = { size, layout, givens, solution, hash };
  writeJson(KEYS.pregen, next);
}

/**
 * 讀取最近題目雜湊。
 * @returns {string[]} 最多 50 筆。
 */
export function loadRecent() {
  const data = readJson(KEYS.recent);
  return Array.isArray(data) ? data.filter((h) => typeof h === 'string').slice(-RECENT_LIMIT) : [];
}

/**
 * 加入最近題目雜湊。
 * @param {string} hash 題目雜湊。
 */
export function addRecent(hash) {
  const list = loadRecent().filter((h) => h !== hash);
  list.push(hash);
  writeJson(KEYS.recent, list.slice(-RECENT_LIMIT));
}
