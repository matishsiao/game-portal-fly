// 本機儲存：角色、探險與設定存在 IndexedDB（資料庫 pocketdungeon）；大廳讀取用的摘要與統計存在 localStorage。
// IndexedDB 無法使用時改存記憶體（關閉後遺失）。所有讀寫都容錯，任何儲存錯誤不讓遊戲停止。

import { AREAS, AREA_KEYS, CLASS_KEYS, CLASSES, SHARED_SLOTS, STATUS } from './pd/data.js';
import { newSkills, SKILLS, SKILL_SLOTS } from './pd/skills.js';
import { levelCap, parseGem, socketCount } from './pd/rules.js';

/** IndexedDB 資料庫名稱。 */
const DB_NAME = 'pocketdungeon';
/** IndexedDB 結構版本（新增資料表時遞增）。 */
const DB_VERSION = 1;
/** 存檔資料格式版本。 */
export const FORMAT = 1;

/** localStorage 鍵。 */
const KEYS = {
  save: 'pocketdungeon.save',
  stats: 'pocketdungeon.stats',
  areaStats: 'pocketdungeon.areaStats',
  settings: 'pocketdungeon.settings',
};

/** IndexedDB 無法使用時的記憶體備援：{characters: Map, run: Map, meta: Map}。 */
const memoryDb = { characters: new Map(), run: new Map(), meta: new Map() };
/** localStorage 無法使用時的記憶體備援。 */
const memory = new Map();

/** 開啟中的資料庫（null 表示改用記憶體）。 */
let db = null;

/**
 * 開啟 IndexedDB；失敗時改用記憶體。
 * @returns {Promise<boolean>} IndexedDB 可用時為 true。
 */
export function openDb() {
  return new Promise((resolve) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(false);
      return;
    }
    /** 建立資料表（第一次開啟或版本升級時）。 */
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const name of ['characters', 'run', 'meta']) if (!d.objectStoreNames.contains(name)) d.createObjectStore(name);
    };
    /** 開啟成功。 */
    req.onsuccess = () => {
      db = req.result;
      resolve(true);
    };
    /** 開啟失敗（私密瀏覽、空間不足等）。 */
    req.onerror = () => resolve(false);
    /** 被其他分頁的舊版本阻擋時改用記憶體。 */
    req.onblocked = () => resolve(false);
  });
}

/**
 * 讀取某個資料表的全部內容。
 * @param {string} store 資料表名稱。
 * @returns {Promise<Map<string, any>>} 鍵值對。
 */
function readAll(store) {
  if (!db) return Promise.resolve(new Map(memoryDb[store]));
  return new Promise((resolve) => {
    const out = new Map();
    try {
      const req = db.transaction(store, 'readonly').objectStore(store).openCursor();
      /** 逐筆讀取。 */
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) {
          resolve(out);
          return;
        }
        out.set(String(cur.key), cur.value);
        cur.continue();
      };
      /** 讀取失敗時回傳已讀到的部分。 */
      req.onerror = () => resolve(out);
    } catch {
      resolve(out);
    }
  });
}

/**
 * 在一個交易中寫入或刪除多筆資料（value 為 undefined 時刪除）。
 * @param {{store: string, key: string, value?: any}[]} ops 操作。
 * @returns {Promise<boolean>} 是否成功。
 */
function writeMany(ops) {
  const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  if (!db) {
    for (const op of ops) {
      if (op.value === undefined) memoryDb[op.store].delete(op.key);
      else memoryDb[op.store].set(op.key, clone(op.value));
    }
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    try {
      const stores = [...new Set(ops.map((o) => o.store))];
      const tx = db.transaction(stores, 'readwrite');
      for (const op of ops) {
        const s = tx.objectStore(op.store);
        if (op.value === undefined) s.delete(op.key);
        else s.put(clone(op.value), op.key);
      }
      /** 交易完成。 */
      tx.oncomplete = () => resolve(true);
      /** 交易失敗（空間不足等）。 */
      tx.onerror = () => resolve(false);
      /** 交易中止。 */
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * 判斷是否為合法的裝備資料。
 * @param {any} it 裝備。
 * @returns {boolean} 合法時為 true。
 */
function isValidItem(it) {
  return !!it && typeof it.id === 'string' && ['weapon', 'helmet', 'armor', 'boots', 'accessory'].includes(it.slot) && Number.isInteger(it.rarity) && it.rarity >= 0 && it.rarity <= 3
    && Number.isInteger(it.enhance) && it.enhance >= 0 && it.enhance <= 10 && it.stats && typeof it.stats === 'object' && typeof it.name === 'string'
    && (it.gems === undefined || (Array.isArray(it.gems) && it.gems.length <= socketCount(it) && it.gems.every((k) => parseGem(k))))
    && (it.status === undefined || (Array.isArray(it.status) && STATUS[it.status[0]] && Number.isFinite(it.status[1])));
}

/**
 * 判斷是否為合法的角色資料。
 * @param {any} ch 角色。
 * @returns {boolean} 合法時為 true。
 */
export function isValidCharacter(ch) {
  const n = (v) => Number.isFinite(v) && v >= 0;
  return !!ch && CLASS_KEYS.includes(ch.cls) && ch.id === ch.cls && typeof ch.name === 'string' && Number.isInteger(ch.level) && ch.level >= 1 && ch.level <= levelCap(ch.rebirth || 0)
    && n(ch.xp) && n(ch.gold) && Array.isArray(ch.bag) && ch.bag.every(isValidItem) && ch.equipped && typeof ch.equipped === 'object'
    && Object.values(ch.equipped).every((it) => it === null || isValidItem(it)) && ch.unlocked && typeof ch.unlocked === 'object' && AREA_KEYS.some((k) => Number.isInteger(ch.unlocked[k]))
    && n(ch.potions) && n(ch.scroll) && ch.stats && typeof ch.stats === 'object' && (ch.rebirth === undefined || (Number.isInteger(ch.rebirth) && ch.rebirth >= 0 && ch.rebirth <= 3))
    && ch.skills && typeof ch.skills.lv === 'object' && Array.isArray(ch.skills.slots) && ch.skills.slots.length === SKILL_SLOTS
    && ch.skills.slots.every((id) => id === null || (SKILLS[id] && SKILLS[id].cls === ch.cls))
    && (ch.cures === undefined || n(ch.cures)) && (ch.gems === undefined || (typeof ch.gems === 'object' && Object.entries(ch.gems).every(([k, v]) => parseGem(k) && Number.isInteger(v) && v >= 0)));
}

/**
 * 判斷探險資料是否合法且屬於某個現有角色。
 * @param {any} run 探險。
 * @param {Map<string, object>} characters 角色。
 * @returns {boolean} 合法時為 true。
 */
function isValidRun(run, characters) {
  const s = run && run.snap;
  return !!s && characters.has(run.charId) && AREA_KEYS.includes(s.area) && Number.isInteger(s.depth) && s.depth >= 1 && Number.isInteger(s.floor) && s.floor >= 0 && s.floor <= 3
    && Number.isFinite(s.seed) && Number.isFinite(s.elapsed) && s.player && Number.isFinite(s.player.x) && Number.isFinite(s.player.hp) && Array.isArray(s.monsters)
    && Array.isArray(s.pickups) && Array.isArray(s.chests) && typeof s.explored === 'string' && s.loot && Array.isArray(s.loot.items);
}

/**
 * 建立新角色。
 * @param {string} cls 職業代碼。
 * @param {string} name 名稱（最多 8 字）。
 * @returns {object} 角色。
 */
export function newCharacter(cls, name) {
  return {
    id: cls, cls, name: [...(name.trim() || CLASSES[cls].name)].slice(0, 8).join(''), level: 1, xp: 0, gold: 50,
    equipped: { weapon: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null }, bag: [], bagSize: 20, bagExpand: 0, potions: 3, scroll: 1, cures: 1, gems: {},
    unlocked: { grass: 1 }, clears: {}, evolved: {}, rebirth: 0, shop: null, created: Date.now(), skills: newSkills(cls),
    stats: { playMs: 0, kills: 0, maxHit: 0, legends: 0, deaths: 0, runs: 0 },
  };
}

/**
 * 讀取全部資料並驗證。
 * @returns {Promise<{characters: Map<string, object>, run: object | null, meta: object, shared: {items: object[], gold: number}, problems: string[]}>} 角色、進行中的探險、設定、共用倉庫與資料損毀說明。
 */
export async function loadAll() {
  const problems = [];
  const rawChars = await readAll('characters');
  const characters = new Map();
  for (const [k, ch] of rawChars) {
    // 加入技能之前建立的角色沒有技能資料，補上預設值（技能點由等級計算，不會損失）。
    if (ch && !ch.skills && CLASS_KEYS.includes(ch.cls)) ch.skills = newSkills(ch.cls);
    // 技能欄擴充為 4 格之前（2 格）的角色：補上空的技能 3、4。
    if (ch && ch.skills && Array.isArray(ch.skills.slots)) while (ch.skills.slots.length < SKILL_SLOTS) ch.skills.slots.push(null);
    // 寶石與淨化藥水加入之前的角色：補上空的寶石袋與 0 瓶淨化藥水。
    if (ch && typeof ch === 'object') {
      if (!ch.gems || typeof ch.gems !== 'object') ch.gems = {};
      if (!Number.isFinite(ch.cures)) ch.cures = 0;
    }
    // 區域插入主線前的角色：已解鎖較後面的區域時，前面（含新加入）的區域也一併解鎖深度 1。
    if (ch && ch.unlocked && typeof ch.unlocked === 'object') {
      const last = AREA_KEYS.reduce((idx, k, i) => (Number.isInteger(ch.unlocked[k]) && ch.unlocked[k] >= 1 ? i : idx), -1);
      for (let i = 0; i < last; i++) if (!(ch.unlocked[AREA_KEYS[i]] >= 1)) ch.unlocked[AREA_KEYS[i]] = 1;
    }
    // 裝備欄擴充前（武器、防具、飾品 3 格）的角色：飾品移到飾品 1，補上新欄位。
    if (ch && ch.equipped && 'accessory' in ch.equipped) {
      const { accessory, ...rest } = ch.equipped;
      ch.equipped = { weapon: null, helmet: null, armor: null, boots: null, acc1: accessory, acc2: null, ...rest };
    }
    if (isValidCharacter(ch)) characters.set(k, ch);
    else problems.push(`角色資料（${CLASSES[k] ? CLASSES[k].name : k}）損毀，已無法讀取`);
  }
  const metaMap = await readAll('meta');
  const meta = metaMap.get('meta') || { v: FORMAT, current: null };
  let shared = metaMap.get('shared') || { items: [], gold: 0 };
  if (!isValidShared(shared)) {
    problems.push('共用倉庫資料損毀，已重設為空（各角色的資料不受影響）');
    shared = { items: [], gold: 0 };
  }
  if (meta.v !== FORMAT) problems.push('存檔格式版本無法辨識');
  const runMap = await readAll('run');
  let run = runMap.get('run') || null;
  if (run && !isValidRun(run, characters)) {
    problems.push('進行中的探險資料損毀，已捨棄這一趟（角色資料保留）');
    run = null;
    await writeMany([{ store: 'run', key: 'run' }]);
    removeKey(KEYS.save);
  }
  if (!run) removeKey(KEYS.save);
  return { characters, run, meta, shared, problems };
}

/**
 * 儲存角色（可同時儲存或刪除進行中的探險，並更新大廳摘要）。
 * @param {object} ch 角色。
 * @param {object | null | undefined} [run] 探險：物件時寫入、null 時刪除、undefined 時不變。
 * @returns {Promise<boolean>} 是否成功。
 */
export function saveProgress(ch, run) {
  const ops = [{ store: 'characters', key: ch.id, value: ch }];
  if (run) {
    ops.push({ store: 'run', key: 'run', value: run });
    writeJson(KEYS.save, {
      v: FORMAT, difficulty: AREAS[run.snap.area].code, area: run.snap.area, elapsedMs: Math.round(run.snap.elapsed * 1000), completed: false,
      name: ch.name, cls: ch.cls, level: ch.level, depth: run.snap.depth, floor: run.snap.floor,
    });
  } else if (run === null) {
    ops.push({ store: 'run', key: 'run' });
    removeKey(KEYS.save);
  }
  return writeMany(ops);
}

/**
 * 判斷共用倉庫資料是否合法。
 * @param {any} sh 共用倉庫。
 * @returns {boolean} 合法時為 true。
 */
function isValidShared(sh) {
  return !!sh && Array.isArray(sh.items) && sh.items.length <= SHARED_SLOTS && sh.items.every(isValidItem) && Number.isFinite(sh.gold) && sh.gold >= 0;
}

/**
 * 在同一個交易中儲存角色與共用倉庫（存取共用倉庫時使用，避免只存到一半）。
 * @param {object} ch 角色。
 * @param {{items: object[], gold: number}} shared 共用倉庫。
 * @returns {Promise<boolean>} 是否成功。
 */
export function saveShared(ch, shared) {
  return writeMany([
    { store: 'characters', key: ch.id, value: ch },
    { store: 'meta', key: 'shared', value: shared },
  ]);
}

/**
 * 刪除角色。
 * @param {string} id 角色 id。
 * @returns {Promise<boolean>} 是否成功。
 */
export function deleteCharacter(id) {
  return writeMany([{ store: 'characters', key: id }]);
}

/**
 * 儲存目前選取的角色。
 * @param {string | null} current 角色 id。
 * @returns {Promise<boolean>} 是否成功。
 */
export function saveMeta(current) {
  return writeMany([{ store: 'meta', key: 'meta', value: { v: FORMAT, current } }]);
}

/**
 * 判斷是否正在使用 IndexedDB（否則為記憶體）。
 * @returns {boolean} 使用 IndexedDB 時為 true。
 */
export function persistent() {
  return !!db;
}

// ---------- localStorage（大廳摘要、統計、設定） ----------

/**
 * 讀取並解析 JSON；不存在或解析失敗時回傳 null。
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
  if (text === null || text === undefined) return null;
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
 * 刪除 localStorage 項目。
 * @param {string} key 儲存鍵。
 */
function removeKey(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略：儲存空間不可用時只有記憶體備援。
  }
  memory.delete(key);
}

/** 大廳使用的難度代碼。 */
const CODES = ['easy', 'medium', 'hard', 'expert'];

/**
 * 建立空白統計。
 * @param {string[]} keys 鍵（區域代碼或難度代碼）。
 * @returns {Record<string, object>} 每個鍵的統計。
 */
function emptyStats(keys) {
  const stats = {};
  for (const key of keys) stats[key] = { started: 0, completed: 0, bestMs: null, totalMs: 0, noHint: 0, deaths: 0, kills: 0, bestDepth: 0 };
  return stats;
}

/**
 * 讀取並驗證一組統計；個別項目損毀時改為空白。
 * @param {any} data 原始資料。
 * @param {string[]} keys 鍵。
 * @returns {Record<string, object>} 統計。
 */
function parseStats(data, keys) {
  const stats = emptyStats(keys);
  if (!data || typeof data !== 'object') return stats;
  const num = (v) => Number.isFinite(v) && v >= 0;
  for (const key of keys) {
    const d = data[key];
    if (d && num(d.started) && num(d.completed) && num(d.totalMs) && num(d.noHint) && (d.bestMs === null || num(d.bestMs))) {
      // deaths、kills、bestDepth 為本遊戲額外的欄位，不完整時補預設值。
      stats[key] = { ...d, deaths: num(d.deaths) ? d.deaths : 0, kills: num(d.kills) ? d.kills : 0, bestDepth: num(d.bestDepth) ? d.bestDepth : 0 };
    }
  }
  return stats;
}

/**
 * 讀取各區域的統計（遊戲內顯示用）。
 * 區域插入主線前只有 `pocketdungeon.stats`（當時區域代碼與難度代碼相同），第一次讀取時以它為初始值。
 * @returns {Record<string, {started: number, completed: number, bestMs: number | null, totalMs: number, noHint: number, deaths: number, kills: number, bestDepth: number}>} 統計。
 */
export function loadStats() {
  const data = readJson(KEYS.areaStats);
  return parseStats(data || readJson(KEYS.stats), AREA_KEYS);
}

/**
 * 大廳用的統計（以難度代碼合併各區域：同一個難度代碼的區域加總，最佳時間取最短）。
 * @param {Record<string, object>} areaStats 各區域的統計。
 * @returns {Record<string, object>} 以 easy、medium、hard、expert 為鍵的統計。
 */
function portalStats(areaStats) {
  const out = emptyStats(CODES);
  for (const key of AREA_KEYS) {
    const a = areaStats[key];
    const o = out[AREAS[key].code];
    for (const f of ['started', 'completed', 'totalMs', 'noHint', 'deaths', 'kills']) o[f] += a[f];
    o.bestDepth = Math.max(o.bestDepth, a.bestDepth);
    if (a.bestMs !== null && (o.bestMs === null || a.bestMs < o.bestMs)) o.bestMs = a.bestMs;
  }
  return out;
}

/**
 * 寫入各區域統計，並同步更新大廳讀取的統計。
 * @param {Record<string, object>} stats 各區域的統計。
 */
function writeStats(stats) {
  writeJson(KEYS.areaStats, stats);
  writeJson(KEYS.stats, portalStats(stats));
}

/**
 * 記錄進入區域。
 * @param {string} area 區域代碼。
 * @param {number} depth 深度。
 */
export function recordStart(area, depth) {
  const stats = loadStats();
  stats[area].started++;
  stats[area].bestDepth = Math.max(stats[area].bestDepth, depth);
  writeStats(stats);
}

/**
 * 記錄探險結束。
 * @param {string} area 區域代碼。
 * @param {{result: 'victory' | 'dead' | 'recall', ms: number, kills: number, potionsUsed: number}} r 結果、耗時、擊倒數與用掉的藥水數。
 * @returns {{newRecord: boolean}} 擊敗 Boss 時是否刷新該區域的最短耗時。
 */
export function recordEnd(area, r) {
  const stats = loadStats();
  const s = stats[area];
  s.kills += r.kills;
  let newRecord = false;
  if (r.result === 'victory') {
    newRecord = s.bestMs === null || r.ms < s.bestMs;
    s.completed++;
    s.totalMs += r.ms;
    if (newRecord) s.bestMs = r.ms;
    if (r.potionsUsed === 0) s.noHint++;
  } else if (r.result === 'dead') {
    s.deaths++;
  }
  writeStats(stats);
  return { newRecord };
}

/** 重設統計。 */
export function resetStats() {
  writeStats(emptyStats(AREA_KEYS));
}

/** 預設設定。 */
const DEFAULT_SETTINGS = { theme: 'system', tapMove: false, aimAssist: true, saver: false, shake: true, minimap: true };

/**
 * 讀取設定。
 * @returns {{theme: string, tapMove: boolean, aimAssist: boolean, saver: boolean, shake: boolean, minimap: boolean}} 設定。
 */
export function loadSettings() {
  const data = readJson(KEYS.settings) || {};
  const out = { ...DEFAULT_SETTINGS };
  if (['system', 'light', 'dark'].includes(data.theme)) out.theme = data.theme;
  for (const k of ['tapMove', 'aimAssist', 'saver', 'shake', 'minimap']) if (typeof data[k] === 'boolean') out[k] = data[k];
  return out;
}

/**
 * 寫入設定。
 * @param {object} settings 設定。
 */
export function saveSettings(settings) {
  writeJson(KEYS.settings, settings);
}
