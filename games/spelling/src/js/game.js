// 一局的狀態與操作（純邏輯）：填入字母、退回、判定、提示、下一個單字、單字本更新與存檔驗證。

import { DIFFICULTIES, lettersOf } from './deck.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新局。
 * @param {{range: number | 'review', difficulty: string, items: {id: string, tiles: string[]}[]}} opt 範圍、難度與出題結果。
 * @param {(id: string) => object} getWord 依 id 取得單字。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ range, difficulty, items }, getWord) {
  const state = {
    v: SAVE_VERSION,
    range,
    difficulty,
    items: items.map((it) => ({ id: it.id, tiles: it.tiles.slice() })),
    index: 0,
    slots: [],
    locks: [],
    hinted: [],
    solved: false,
    flags: {},
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
  setupWord(state, getWord);
  return state;
}

/**
 * 重開本局：同樣的單字與字母方塊，所有操作、錯誤、提示與耗時回到新局狀態。
 * @param {object} state 遊戲狀態。
 * @param {(id: string) => object} getWord 依 id 取得單字。
 * @returns {object} 新的遊戲狀態。
 */
export function restartGame(state, getWord) {
  return createGame({ range: state.range, difficulty: state.difficulty, items: state.items }, getWord);
}

/**
 * 準備目前題號的空格；簡單難度預先填好並鎖定首字母（不算提示）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {(id: string) => object} getWord 依 id 取得單字。
 */
function setupWord(state, getWord) {
  const item = state.items[state.index];
  const letters = lettersOf(getWord(item.id).en);
  state.slots = Array(letters.length).fill(null);
  state.locks = Array(letters.length).fill(false);
  state.hinted = Array(letters.length).fill(false);
  state.solved = false;
  if (DIFFICULTIES[state.difficulty].firstLetter && letters.length > 1) {
    state.slots[0] = item.tiles.indexOf(letters[0]);
    state.locks[0] = true;
  }
}

/**
 * 目前的題目。
 * @param {object} state 遊戲狀態。
 * @returns {{id: string, tiles: string[]}} 題目。
 */
export function currentItem(state) {
  return state.items[state.index];
}

/**
 * 目前已放進空格的字母方塊編號。
 * @param {object} state 遊戲狀態。
 * @returns {Set<number>} 方塊編號。
 */
export function usedTiles(state) {
  return new Set(state.slots.filter((t) => t !== null));
}

/**
 * 空格是否都已填滿。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 填滿時為 true。
 */
export function isFull(state) {
  return state.slots.every((t) => t !== null);
}

/**
 * 點字母方塊：填入第一個空格。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} tile 方塊編號。
 * @returns {boolean} 有填入時為 true。
 */
export function placeTile(state, tile) {
  if (state.solved || usedTiles(state).has(tile) || !currentItem(state).tiles[tile]) return false;
  const pos = state.slots.indexOf(null);
  if (pos < 0) return false;
  state.slots[pos] = tile;
  state.touched = true;
  return true;
}

/**
 * 點已填入的字母：退回字母方塊區（鎖定的字母不能退回）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} pos 空格位置。
 * @returns {boolean} 有退回時為 true。
 */
export function removeAt(state, pos) {
  if (state.solved || state.locks[pos] || state.slots[pos] === null || state.slots[pos] === undefined) return false;
  state.slots[pos] = null;
  return true;
}

/**
 * 退格：退回最後面（最右邊）一個未鎖定的字母。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {boolean} 有退回時為 true。
 */
export function backspace(state) {
  for (let p = state.slots.length - 1; p >= 0; p--) if (removeAt(state, p)) return true;
  return false;
}

/**
 * 清除：退回所有未鎖定的字母。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {boolean} 有退回時為 true。
 */
export function clearSlots(state) {
  let any = false;
  for (let p = 0; p < state.slots.length; p++) any = removeAt(state, p) || any;
  return any;
}

/**
 * 目前空格拼出的字母。
 * @param {object} state 遊戲狀態。
 * @returns {string} 字母（未填的位置為空白）。
 */
export function spelled(state) {
  const tiles = currentItem(state).tiles;
  return state.slots.map((t) => (t === null ? ' ' : tiles[t])).join('');
}

/**
 * 空格填滿時判定。拼對（或拼出中文意思與詞性都相同的其他字）時完成這個單字；
 * 拼錯時位置正確的字母鎖定、錯誤的退回，錯誤次數 +1，這個單字列入待複習。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} word 目前的單字。
 * @param {object[]} [alternatives=[]] 可接受的其他單字（中文意思與詞性都相同）。
 * @returns {{right: boolean, alt: object | null, wrong: number[], letters: string}} 結果；wrong 為錯誤的位置，letters 為判定時拼出的字母。
 */
export function checkAnswer(state, word, alternatives = []) {
  const target = lettersOf(word.en);
  const got = spelled(state);
  if (!isFull(state)) return { right: false, alt: null, wrong: [], letters: got };
  const alt = got === target ? null : alternatives.find((w) => lettersOf(w.en) === got) || null;
  if (got === target || alt) {
    state.locks = state.locks.map(() => true);
    state.solved = true;
    return { right: true, alt, wrong: [], letters: got };
  }
  const wrong = [];
  for (let p = 0; p < target.length; p++) {
    if (got[p] === target[p]) state.locks[p] = true;
    else {
      state.slots[p] = null;
      wrong.push(p);
    }
  }
  state.mistakes++;
  markFlag(state, word.id, 'wrong');
  return { right: false, alt: null, wrong, letters: got };
}

/**
 * 記錄單字的答題狀況（答錯或用了提示）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {string} id 單字 id。
 * @param {'wrong' | 'hint'} kind 種類。
 */
function markFlag(state, id, kind) {
  state.flags[id] = { ...(state.flags[id] || { wrong: false, hint: false }), [kind]: true };
}

/**
 * 剩餘提示次數。
 * @param {object} state 遊戲狀態。
 * @returns {number} 次數。
 */
export function hintsLeft(state) {
  return DIFFICULTIES[state.difficulty].hints - state.hintsUsed;
}

/**
 * 提示：填入下一個尚未鎖定的正確字母並鎖定（該位置原本是錯的字母時先退回）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} word 目前的單字。
 * @returns {{ok: boolean, message: string, pos?: number}} 結果。
 */
export function useHint(state, word) {
  if (state.solved) return { ok: false, message: '這個單字已經拼好了' };
  if (hintsLeft(state) <= 0) return { ok: false, message: '這一局的提示已經用完了' };
  const target = lettersOf(word.en);
  const tiles = currentItem(state).tiles;
  const pos = state.locks.indexOf(false);
  if (pos < 0) return { ok: false, message: '所有字母都已經確定了' };
  if (state.slots[pos] !== null && tiles[state.slots[pos]] !== target[pos]) state.slots[pos] = null;
  if (state.slots[pos] === null) {
    const used = usedTiles(state);
    let tile = tiles.findIndex((ch, i) => ch === target[pos] && !used.has(i));
    if (tile < 0) {
      // 需要的字母都放在其他未鎖定的位置：從那裡借回來。
      const from = state.slots.findIndex((t, p) => p !== pos && !state.locks[p] && t !== null && tiles[t] === target[pos]);
      if (from < 0) return { ok: false, message: '找不到需要的字母' };
      tile = state.slots[from];
      state.slots[from] = null;
    }
    state.slots[pos] = tile;
  }
  state.locks[pos] = true;
  state.hinted[pos] = true;
  state.hintsUsed++;
  state.touched = true;
  markFlag(state, word.id, 'hint');
  return { ok: true, message: '', pos };
}

/**
 * 是否為最後一個單字。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 是時為 true。
 */
export function isLastWord(state) {
  return state.index >= state.items.length - 1;
}

/**
 * 前往下一個單字。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {(id: string) => object} getWord 依 id 取得單字。
 * @returns {boolean} 有下一個時為 true；已經是最後一個時為 false。
 */
export function nextWord(state, getWord) {
  if (!state.solved || isLastWord(state)) return false;
  state.index++;
  setupWord(state, getWord);
  return true;
}

/**
 * 把拼完的單字記入單字本：沒拼錯、沒用提示 → 已學會並移出待複習；否則列入待複習。
 * @param {Record<string, object>} book 單字本（會被修改）。
 * @param {string} id 單字 id。
 * @param {{wrong: boolean, hint: boolean} | undefined} flag 答題狀況。
 * @param {number} now 目前時間（毫秒）。
 */
export function applyWordToBook(book, id, flag, now) {
  const b = book[id] || { seen: 0, correct: 0, learned: false, review: false, lastSeen: 0 };
  b.seen++;
  b.lastSeen = now;
  if (flag && (flag.wrong || flag.hint)) b.review = true;
  else {
    b.correct++;
    b.learned = true;
    b.review = false;
  }
  book[id] = b;
}

/**
 * 驗證存檔格式與內容是否一致。
 * @param {any} data 存檔。
 * @param {(id: string) => object | undefined} getWord 依 id 取得單字（不存在時回傳 undefined）。
 * @returns {boolean} 正確時為 true。
 */
export function isValidSave(data, getWord) {
  if (!data || data.v !== SAVE_VERSION || !DIFFICULTIES[data.difficulty]) return false;
  if (!(data.range === 'review' || (Number.isInteger(data.range) && data.range >= 1 && data.range <= 6))) return false;
  if (!Array.isArray(data.items) || !data.items.length || !Number.isInteger(data.index) || data.index < 0 || data.index >= data.items.length) return false;
  for (const it of data.items) {
    const w = it && getWord(it.id);
    if (!w || !Array.isArray(it.tiles) || !it.tiles.every((t) => typeof t === 'string' && /^[a-z]$/.test(t))) return false;
    // 字母方塊必須包含這個單字所有的字母。
    const pool = it.tiles.slice();
    for (const ch of lettersOf(w.en)) {
      const k = pool.indexOf(ch);
      if (k < 0) return false;
      pool.splice(k, 1);
    }
  }
  const n = lettersOf(getWord(data.items[data.index].id).en).length;
  const tiles = data.items[data.index].tiles;
  const arr = (a) => Array.isArray(a) && a.length === n;
  if (!arr(data.slots) || !arr(data.locks) || !arr(data.hinted)) return false;
  const placed = data.slots.filter((t) => t !== null);
  if (!placed.every((t) => Number.isInteger(t) && t >= 0 && t < tiles.length) || new Set(placed).size !== placed.length) return false;
  if (data.locks.some((l, p) => l && data.slots[p] === null)) return false;
  const num = (v) => Number.isFinite(v) && v >= 0;
  return num(data.mistakes) && num(data.hintsUsed) && num(data.elapsedMs) && typeof data.solved === 'boolean' && !!data.flags && typeof data.flags === 'object';
}
