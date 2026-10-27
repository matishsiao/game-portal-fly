// 本機儲存：存檔、統計、設定、預先產生的題目與最近題目雜湊。所有讀寫都容錯。

import { isValidSave, createGame } from './game.js';
import { DIFFICULTY_KEYS } from './idiom/generator.js';

const KEYS = {
  save: 'idiom.save',
  stats: 'idiom.stats',
  settings: 'idiom.settings',
  pregen: 'idiom.pregen',
  recent: 'idiom.recent',
  book: 'idiom.book',
};

/** 遊戲目錄名稱（獲得紀錄的來源）。 */
const GAME_DIR = 'idiom';

/** 獲得紀錄的共用鍵（大廳規格允許所有遊戲寫入；口袋地城讀取後發放獎勵禮包）。 */
const REWARD_KEY = 'games.rewards';
/** 難度代碼對應的禮包等級與名稱。 */
const REWARD_TIER = { easy: [1, '簡單'], medium: [2, '中等'], hard: [3, '困難'], expert: [4, '專家'] };

/**
 * 新增一筆獲得紀錄（同一個 id 只記一次，重複過關不會再記）。
 * @param {string} id 紀錄代碼（遊戲:項目:種類）。
 * @param {'clear' | 'perfect'} type 第一次過關或第一次全對。
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
    localStorage.setItem('idiom.probe', '1');
    localStorage.removeItem('idiom.probe');
    return true;
  } catch {
    return false;
  }
}

/**
 * 讀取存檔。
 * @param {(id: string) => string | undefined} textOf 由成語 id 取得文字（用來確認成語仍存在於詞庫）。
 * @returns {{status: 'none' | 'ok' | 'corrupt', state?: object}} 讀取結果。
 */
export function loadSave(textOf) {
  const data = readJson(KEYS.save);
  if (data === undefined) return { status: 'none' };
  if (!isValidSave(data, textOf)) return { status: 'corrupt' };
  return { status: 'ok', state: data };
}

/**
 * 讀取存檔的摘要（不驗證詞庫，供首頁在詞庫載入前顯示）。
 * @returns {{difficulty: string, elapsedMs: number, hintsUsed: number, mode: string, index: number, boards: number} | null} 摘要。
 */
export function saveSummary() {
  const data = readJson(KEYS.save);
  if (!data || typeof data !== 'object' || data.completed || !Array.isArray(data.boards)) return null;
  return { difficulty: data.difficulty, elapsedMs: data.elapsedMs, hintsUsed: data.hintsUsed, mode: data.mode, index: data.index, boards: data.boards.length };
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
  // 獲得紀錄：這個難度第一次過關、第一次沒用提示過關（重複過關不會再記）。
  const firstClear = s.completed === 0;
  const firstPerfect = hintsUsed === 0 && s.noHint === 0;
  const newRecord = s.bestMs === null || ms < s.bestMs;
  s.completed++;
  s.totalMs += ms;
  if (newRecord) s.bestMs = ms;
  if (hintsUsed === 0) s.noHint++;
  writeJson(KEYS.stats, stats);
  const [tier, name] = REWARD_TIER[difficulty] || [1, difficulty];
  if (firstClear) addReward(`${GAME_DIR}:${difficulty}:clear`, 'clear', tier, `${name} 第一次過關`);
  if (firstPerfect) addReward(`${GAME_DIR}:${difficulty}:perfect`, 'perfect', tier + 1, `${name} 第一次全對（沒用提示）`);
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
 * @param {(id: string) => string | undefined} textOf 由成語 id 取得文字（用來驗證題目）。
 * @returns {{difficulty: string, mode: string, boards: object[], hash: string} | null} 題目，沒有或損毀時為 null。
 */
export function takePregen(difficulty, textOf) {
  const data = readJson(KEYS.pregen);
  if (!data || typeof data !== 'object') return null;
  const item = data[difficulty];
  delete data[difficulty];
  writeJson(KEYS.pregen, data);
  let ok = false;
  try {
    ok = !!item && typeof item.hash === 'string' && isValidSave(createGame({ ...item, difficulty }), textOf);
  } catch {
    ok = false;
  }
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
 * @param {{difficulty: string, mode: string, boards: object[], hash: string}} item 題目。
 */
export function storePregen(item) {
  const data = readJson(KEYS.pregen);
  const next = data && typeof data === 'object' ? data : {};
  const { mode, boards, hash } = item;
  next[item.difficulty] = { mode, boards, hash };
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

/**
 * 讀取成語本：每個成語的完成次數、是否待複習與最後完成的序號。資料損毀時視為空白。
 * @returns {{seq: number, items: Record<string, {n: number, review: boolean, last: number}>}} 成語本。
 */
export function loadBook() {
  const data = readJson(KEYS.book);
  const book = { seq: 0, items: {} };
  if (!data || typeof data !== 'object' || !Number.isInteger(data.seq) || !data.items || typeof data.items !== 'object') return book;
  book.seq = data.seq;
  for (const [id, v] of Object.entries(data.items)) {
    if (v && Number.isInteger(v.n) && v.n > 0 && typeof v.review === 'boolean' && Number.isInteger(v.last)) book.items[id] = v;
  }
  return book;
}

/**
 * 記錄完成一個成語：一次答對時移出待複習，曾答錯或使用提示時列入待複習。
 * @param {string} id 成語 id。
 * @param {boolean} perfect 是否一次答對（未答錯、未使用提示）。
 */
export function recordWord(id, perfect) {
  const book = loadBook();
  book.seq++;
  const item = book.items[id] || { n: 0, review: false, last: 0 };
  item.n++;
  item.last = book.seq;
  item.review = !perfect;
  book.items[id] = item;
  writeJson(KEYS.book, book);
}

/**
 * 取得出題用的成語本摘要。
 * @returns {{seen: Record<string, number>, review: string[]}} 已完成成語的最後序號與待複習清單。
 */
export function bookPriority() {
  const { items } = loadBook();
  const seen = {};
  const review = [];
  for (const [id, v] of Object.entries(items)) {
    seen[id] = v.last;
    if (v.review) review.push(id);
  }
  return { seen, review };
}
