// 本機儲存：進行中的關卡、永久進度、物理圖鑑、統計與設定。所有讀寫都容錯。

const KEYS = {
  save: 'roll.save',
  progress: 'roll.progress',
  book: 'roll.book',
  stats: 'roll.stats',
  settings: 'roll.settings',
};

/** 遊戲目錄名稱（獲得紀錄的來源）。 */
const GAME_DIR = 'roll';

/** 獲得紀錄的共用鍵（大廳規格允許所有遊戲寫入；口袋地城讀取後發放獎勵禮包）。 */
const REWARD_KEY = 'games.rewards';

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


/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/** 章節代碼。 */
const DIFFICULTY_KEYS = ['easy', 'medium', 'hard', 'expert'];

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
 * @param {any} value 值。
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
    localStorage.setItem('roll.probe', '1');
    localStorage.removeItem('roll.probe');
    return true;
  } catch {
    return false;
  }
}

/**
 * 驗證存檔結構。
 * @param {any} s 存檔。
 * @param {(id: string) => boolean} levelExists 判斷關卡是否存在。
 * @returns {boolean} 可用時為 true。
 */
function validSave(s, levelExists) {
  const st = s && s.state;
  return (
    !!s &&
    s.v === SAVE_VERSION &&
    typeof s.levelId === 'string' &&
    levelExists(s.levelId) &&
    DIFFICULTY_KEYS.includes(s.difficulty) &&
    Number.isInteger(s.steps) &&
    s.steps >= 0 &&
    Number.isInteger(s.hintsUsed) &&
    s.hintsUsed >= 0 &&
    Number.isFinite(s.elapsedMs) &&
    s.elapsedMs >= 0 &&
    !!st &&
    Number.isInteger(st.w) &&
    Number.isInteger(st.h) &&
    Array.isArray(st.terrain) &&
    st.terrain.length === st.w * st.h &&
    Array.isArray(st.objects) &&
    st.objects.every((o) => o && typeof o.type === 'string' && Number.isInteger(o.x) && Number.isInteger(o.y)) &&
    !!st.player &&
    Number.isInteger(st.player.x) &&
    Number.isInteger(st.player.y)
  );
}

/**
 * 讀取進行中的關卡。
 * @param {(id: string) => boolean} levelExists 判斷關卡是否存在。
 * @returns {{status: 'none' | 'ok' | 'corrupt', save?: object}} 讀取結果。
 */
export function loadSave(levelExists) {
  const data = readJson(KEYS.save);
  if (data === undefined) return { status: 'none' };
  if (!validSave(data, levelExists)) return { status: 'corrupt' };
  return { status: 'ok', save: data };
}

/**
 * 寫入進行中的關卡。
 * @param {object} save 存檔。
 */
export function writeSave(save) {
  writeJson(KEYS.save, { ...save, v: SAVE_VERSION, completed: false });
}

/** 刪除進行中的關卡。 */
export function clearSave() {
  remove(KEYS.save);
}

/**
 * 讀取永久進度。
 * @returns {Record<string, {stars: number, bestSteps: number}>} 以關卡 id 為鍵。
 */
export function loadProgress() {
  const data = readJson(KEYS.progress);
  const out = {};
  if (data && typeof data === 'object') {
    for (const [id, p] of Object.entries(data)) {
      if (p && [1, 2, 3].includes(p.stars) && Number.isInteger(p.bestSteps)) out[id] = { stars: p.stars, bestSteps: p.bestSteps };
    }
  }
  return out;
}

/**
 * 記錄過關結果，只保留最佳星數與最少步數。
 * @param {string} id 關卡 id。
 * @param {number} stars 星數。
 * @param {number} steps 步數。
 * @returns {{newBestStars: boolean}} 是否刷新星數紀錄。
 */
export function recordLevel(id, stars, steps) {
  const progress = loadProgress();
  const old = progress[id];
  progress[id] = {
    stars: Math.max(stars, old ? old.stars : 0),
    bestSteps: old ? Math.min(old.bestSteps, steps) : steps,
  };
  writeJson(KEYS.progress, progress);
  // 獲得紀錄：每一關第一次過關、第一次三顆星（禮包等級依章節，三顆星 +1）。
  const tier = Math.min(4, Number(String(id).split('-')[0]) || 1);
  if (!old) addReward(`roll:${id}:clear`, 'clear', tier, `第 ${id} 關 第一次過關`);
  if (stars === 3 && (!old || old.stars < 3)) addReward(`roll:${id}:star3`, 'perfect', tier + 1, `第 ${id} 關 第一次三顆星`);
  return { newBestStars: !old || stars > old.stars };
}

/**
 * 讀取已看過的物理小知識。
 * @returns {Set<string>} 小知識鍵。
 */
export function loadBook() {
  const data = readJson(KEYS.book);
  return new Set(Array.isArray(data) ? data.filter((k) => typeof k === 'string') : []);
}

/**
 * 把小知識加入物理圖鑑。
 * @param {string[]} keys 小知識鍵。
 */
export function addToBook(keys) {
  const book = loadBook();
  keys.forEach((k) => book.add(k));
  writeJson(KEYS.book, [...book]);
}

/**
 * 建立空白統計。
 * @returns {Record<string, object>} 每個章節的統計。
 */
function emptyStats() {
  const stats = {};
  for (const key of DIFFICULTY_KEYS) stats[key] = { started: 0, completed: 0, bestMs: null, totalMs: 0, noHint: 0 };
  return stats;
}

/**
 * 讀取統計；損毀時重設為空白。
 * @returns {Record<string, {started: number, completed: number, bestMs: number | null, totalMs: number, noHint: number}>} 統計。
 */
export function loadStats() {
  const data = readJson(KEYS.stats);
  const stats = emptyStats();
  if (!data || typeof data !== 'object') return stats;
  const num = (v) => Number.isFinite(v) && v >= 0;
  for (const key of DIFFICULTY_KEYS) {
    const d = data[key];
    if (d && num(d.started) && num(d.completed) && num(d.totalMs) && num(d.noHint) && (d.bestMs === null || num(d.bestMs))) stats[key] = d;
  }
  return stats;
}

/**
 * 記錄開始一關。
 * @param {string} difficulty 章節代碼。
 */
export function recordStart(difficulty) {
  const stats = loadStats();
  stats[difficulty].started++;
  writeJson(KEYS.stats, stats);
}

/**
 * 記錄過關。
 * @param {string} difficulty 章節代碼。
 * @param {number} ms 耗時。
 * @param {number} hintsUsed 已用提示。
 * @returns {{newRecord: boolean}} 是否刷新該章最短時間。
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

/** 重設統計與永久進度以外的紀錄（統計歸零）。 */
export function resetStats() {
  writeJson(KEYS.stats, emptyStats());
}

/**
 * 讀取設定。
 * @returns {{theme: 'system' | 'light' | 'dark', swipe: boolean}} 設定（滑動操作預設開啟）。
 */
export function loadSettings() {
  const data = readJson(KEYS.settings);
  return {
    theme: data && ['system', 'light', 'dark'].includes(data.theme) ? data.theme : 'system',
    swipe: data && typeof data.swipe === 'boolean' ? data.swipe : true,
  };
}

/**
 * 寫入設定。
 * @param {{theme: string, swipe: boolean}} settings 設定。
 */
export function saveSettings(settings) {
  writeJson(KEYS.settings, settings);
}
