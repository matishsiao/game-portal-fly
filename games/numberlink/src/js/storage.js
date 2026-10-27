// 本機儲存：存檔、統計、設定、預先產生的題目與最近題目雜湊。所有讀寫都容錯。

import { isValidSave } from './game.js';
import { DIFFICULTY_KEYS } from './numberlink/generator.js';
import { isValidPuzzle } from './numberlink/core.js';

const KEYS = {
  save: 'numberlink.save',
  stats: 'numberlink.stats',
  settings: 'numberlink.settings',
  pregen: 'numberlink.pregen',
  recent: 'numberlink.recent',
};

/** 遊戲目錄名稱（獲得紀錄的來源）。 */
const GAME_DIR = 'numberlink';

/** 獲得紀錄的共用鍵（大廳規格允許所有遊戲寫入；口袋地城讀取後發放獎勵禮包）。 */
const REWARD_KEY = 'games.rewards';
/** 難度代碼對應的禮包等級與名稱。 */
const REWARD_TIER = { easy: [1, '簡單'], medium: [2, '中等'], hard: [3, '困難'], expert: [4, '專家'] };

/**
 * 新增一筆獲得紀錄（同一個 id 只記一次，重複過關不會再記）。
 * @param {string} id 紀錄代碼（遊戲:項目:種類）。
 * @param {'clear' | 'perfect' | 'daily'} type 第一次過關、第一次全對或當天第一次完成（每日練習）。
 * @param {number} tier 禮包等級（1～5）。
 * @param {string} label 顯示用的說明。
 */
function addReward(id, type, tier, label) {
  const raw = readJson(REWARD_KEY);
  const list = Array.isArray(raw) ? raw : [];
  if (list.some((r) => r && r.id === id)) return;
  list.push({ id, game: GAME_DIR, type, tier: Math.min(5, tier), label, at: Date.now() });
  writeJson(REWARD_KEY, list.slice(-1000));
}

/**
 * 今天的每日練習紀錄代碼（本機日期，例如 daily:2026-10-27）：所有遊戲共用，一天只記一次。
 * @returns {string} 紀錄代碼。
 */
function dailyId() {
  const d = new Date();
  return `daily:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


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
    localStorage.setItem('numberlink.probe', '1');
    localStorage.removeItem('numberlink.probe');
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
    stats[key] = { started: 0, completed: 0, bestMs: null, totalMs: 0, noHint: 0, perfect: 0 };
  }
  return stats;
}

/**
 * 讀取統計；資料損毀時重設為空白。
 * @returns {Record<string, {started: number, completed: number, bestMs: number | null, totalMs: number, noHint: number, perfect: number}>} 統計。
 */
export function loadStats() {
  const data = readJson(KEYS.stats);
  const stats = emptyStats();
  if (!data || typeof data !== 'object') return stats;
  for (const key of DIFFICULTY_KEYS) {
    const d = data[key];
    const num = (v) => Number.isFinite(v) && v >= 0;
    if (d && num(d.started) && num(d.completed) && num(d.totalMs) && num(d.noHint) && (d.bestMs === null || num(d.bestMs))) {
      // perfect 為本遊戲額外的欄位，舊資料沒有時補 0。
      stats[key] = { ...d, perfect: num(d.perfect) ? d.perfect : 0 };
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
 * @param {boolean} perfect 筆數是否等於端點對數。
 * @returns {{newRecord: boolean}} 是否刷新最佳時間。
 */
export function recordComplete(difficulty, ms, hintsUsed, perfect) {
  const stats = loadStats();
  const s = stats[difficulty];
  // 獲得紀錄：這個難度第一次過關、第一次沒用提示過關（重複過關不會再記）。
  const firstClear = s.completed === 0;
  const firstPerfect = hintsUsed === 0 && s.noHint === 0;
  const newRecord = s.bestMs === null || ms < s.bestMs;
  s.completed++;
  s.totalMs += ms;
  if (newRecord) s.bestMs = ms;
  if (hintsUsed === 0) s.noHint++;
  if (perfect) s.perfect++;
  writeJson(KEYS.stats, stats);
  const [tier, name] = REWARD_TIER[difficulty] || [1, difficulty];
  if (firstClear) addReward(`${GAME_DIR}:${difficulty}:clear`, 'clear', tier, `${name} 第一次過關`);
  if (firstPerfect) addReward(`${GAME_DIR}:${difficulty}:perfect`, 'perfect', tier + 1, `${name} 第一次全對（沒用提示）`);
  // 每日練習：今天第一次在任何遊戲過關（口袋地城每天可領一次入場卷）。
  addReward(dailyId(), 'daily', 1, `今天第一次過關（${name}）`);
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
 * @returns {{difficulty: string, size: number, ends: number[][], solution: number[][], hash: string} | null}
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
 * @param {{difficulty: string, size: number, ends: number[][], solution: number[][], hash: string}} item 題目。
 */
export function storePregen(item) {
  const data = readJson(KEYS.pregen);
  const next = data && typeof data === 'object' ? data : {};
  const { size, ends, solution, hash } = item;
  next[item.difficulty] = { size, ends, solution, hash };
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
