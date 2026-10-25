// 遊戲狀態邏輯（不含畫面）：畫線、截斷、清除、提示、復原、完成判定與存檔驗證。
//
// 每個編號的線以格子序列表示：空陣列為沒有線，否則從該編號的某個端點開始；
// 走到另一個端點時該對連通。端點永遠屬於自己的編號。
//
// 「畫線階段」（session）：從選取一個編號開始，到取消選取或連通為止。階段開始時記下所有線的狀態，
// 選取的線每次變動後，其他線都從階段開始時的狀態，依目前選取的線重新截斷；
// 因此在同一階段中退回時，被截斷的線會恢復原狀。

import { DIFFICULTIES } from './numberlink/generator.js';
import { isValidPuzzle, isAdjacent, isPath, isSolved } from './numberlink/core.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新的一局。
 * @param {{difficulty: string, size: number, ends: number[][], solution: number[][]}} data 題目資料。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ difficulty, size, ends, solution }) {
  return {
    v: SAVE_VERSION,
    difficulty,
    size,
    ends: ends.map((e) => e.slice()),
    solution: solution.map((p) => p.slice()),
    paths: ends.map(() => []),
    hinted: ends.map(() => false),
    strokes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
}

/**
 * 以同一題目重開本局，所有進度歸零。
 * @param {object} state 目前狀態。
 * @returns {object} 新的遊戲狀態。
 */
export function restartGame(state) {
  return createGame(state);
}

/**
 * 複製所有線（供復原與畫線階段使用）。
 * @param {object} state 遊戲狀態。
 * @returns {number[][]} 線的副本。
 */
export function snapshot(state) {
  return state.paths.map((p) => p.slice());
}

/**
 * 還原所有線（復原）；提示鎖定的線不受影響。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number[][]} snap 先前的副本。
 * @returns {boolean} 是否有套用。
 */
export function restore(state, snap) {
  if (state.completed || !snap) return false;
  state.paths = snap.map((p, k) => (state.hinted[k] ? state.paths[k] : p.slice()));
  return true;
}

/**
 * 取得端點所屬的編號。
 * @param {object} state 遊戲狀態。
 * @param {number} cell 格子索引。
 * @returns {number} 編號索引，不是端點時為 -1。
 */
export function endpointPair(state, cell) {
  return state.ends.findIndex(([a, b]) => a === cell || b === cell);
}

/**
 * 計算每格目前所屬的編號（端點永遠屬於自己的編號）。
 * @param {object} state 遊戲狀態。
 * @returns {Int16Array} 長度為格子數，-1 為空格。
 */
export function ownerGrid(state) {
  const owner = new Int16Array(state.size * state.size).fill(-1);
  state.paths.forEach((p, k) => {
    for (const i of p) owner[i] = k;
  });
  state.ends.forEach(([a, b], k) => {
    owner[a] = k;
    owner[b] = k;
  });
  return owner;
}

/**
 * 判斷某編號是否已連通。
 * @param {object} state 遊戲狀態。
 * @param {number} k 編號索引。
 * @returns {boolean} 連通時為 true。
 */
export function isConnected(state, k) {
  const p = state.paths[k];
  if (p.length < 2) return false;
  const [a, b] = state.ends[k];
  return (p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a);
}

/**
 * 判斷某編號的線是否與解答完全一致（方向不限）。
 * @param {object} state 遊戲狀態。
 * @param {number} k 編號索引。
 * @returns {boolean} 一致時為 true。
 */
export function matchesSolution(state, k) {
  const p = state.paths[k];
  const s = state.solution[k];
  if (p.length !== s.length) return false;
  return p.every((c, i) => c === s[i]) || p.every((c, i) => c === s[s.length - 1 - i]);
}

/**
 * 計算已連通的編號數。
 * @param {object} state 遊戲狀態。
 * @returns {number} 已連通數。
 */
export function connectedCount(state) {
  return state.ends.reduce((n, _, k) => n + (isConnected(state, k) ? 1 : 0), 0);
}

/**
 * 計算被線（含端點）佔用的格子比例。
 * @param {object} state 遊戲狀態。
 * @returns {number} 0～1。
 */
export function fillRatio(state) {
  const owner = ownerGrid(state);
  let filled = 0;
  for (const o of owner) if (o >= 0) filled++;
  return filled / owner.length;
}

/**
 * 判斷是否完成：全部連通且填滿。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 完成時為 true。
 */
export function isComplete(state) {
  return isSolved(state.size, state.ends, state.paths);
}

/**
 * 取得本局提示額度。
 * @param {object} state 遊戲狀態。
 * @returns {number} 提示總次數。
 */
export function hintQuota(state) {
  return DIFFICULTIES[state.difficulty].hints;
}

/**
 * 取得剩餘提示次數。
 * @param {object} state 遊戲狀態。
 * @returns {number} 剩餘次數。
 */
export function hintsLeft(state) {
  return Math.max(0, hintQuota(state) - state.hintsUsed);
}

/**
 * 把線從第一個與 cells 重疊的格子截斷（保留之前的部分）。
 * @param {number[]} path 線。
 * @param {Set<number>} cells 要讓出的格子。
 * @returns {number[]} 截斷後的線（若連起點都被佔用則為空陣列）。
 */
function truncateAt(path, cells) {
  const cut = path.findIndex((c) => cells.has(c));
  return cut < 0 ? path.slice() : path.slice(0, cut);
}

/**
 * 依目前選取的線，從階段開始時的狀態重新截斷其他線。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {{k: number, base: number[][]}} session 畫線階段。
 */
function reflow(state, session) {
  const cells = new Set(state.paths[session.k]);
  state.paths = state.paths.map((p, j) => (j === session.k || state.hinted[j] ? p : truncateAt(session.base[j], cells)));
}

/**
 * 開始畫線階段：從端點、線上或線頭開始。
 * - 點端點：從這個端點重新開始（原本的線清除）。
 * - 點線上的格子：線截斷到該格。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} cell 格子索引。
 * @returns {{session: {k: number, base: number[][]} | null, reason?: 'hinted' | 'empty' | 'completed'}}
 *   畫線階段；無法開始時附上原因。
 */
export function beginSession(state, cell) {
  if (state.completed) return { session: null, reason: 'completed' };
  let k = endpointPair(state, cell);
  const owner = ownerGrid(state);
  if (k < 0) k = owner[cell];
  if (k < 0) return { session: null, reason: 'empty' };
  if (state.hinted[k]) return { session: null, reason: 'hinted' };
  const session = { k, base: snapshot(state) };
  const p = state.paths[k];
  const at = p.indexOf(cell);
  if (state.ends[k].includes(cell)) {
    // 點端點：從這個端點重新開始，原本的線清除。
    state.paths[k] = [cell];
  } else if (at >= 0) {
    state.paths[k] = p.slice(0, at + 1);
  }
  return { session };
}

/**
 * 以目前的線頭開始畫線階段（鍵盤選取用），不改變盤面。
 * 線頭為已畫部分的末端；沒有線時從第一個端點開始。
 * @param {object} state 遊戲狀態（會被修改：沒有線時建立只含端點的線）。
 * @param {number} k 編號索引。
 * @returns {{k: number, base: number[][]} | null} 畫線階段；提示鎖定或已完成時為 null。
 */
export function sessionAtHead(state, k) {
  if (state.completed || state.hinted[k]) return null;
  if (!state.paths[k].length) state.paths[k] = [state.ends[k][0]];
  return { k, base: snapshot(state) };
}

/**
 * 取得目前選取線的線頭。
 * @param {object} state 遊戲狀態。
 * @param {{k: number}} session 畫線階段。
 * @returns {number} 線頭格子索引。
 */
export function headOf(state, session) {
  const p = state.paths[session.k];
  return p[p.length - 1];
}

/**
 * 在畫線階段中把線頭移到指定格子：
 * - 線上的格子：退回到該格；
 * - 與線頭相鄰的空格或其他編號的線：延伸（其他線從該格截斷）；
 * - 同編號的另一個端點：延伸並連通。
 * 不能進入其他編號的端點或提示鎖定的線；已連通時只能退回。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {{k: number, base: number[][]}} session 畫線階段。
 * @param {number} cell 目標格子。
 * @returns {boolean} 盤面有改變時為 true。
 */
export function moveTo(state, session, cell) {
  if (state.completed) return false;
  const { k } = session;
  const p = state.paths[k];
  const head = p[p.length - 1];
  if (cell === head) return false;
  const at = p.indexOf(cell);
  if (at >= 0) {
    state.paths[k] = p.slice(0, at + 1);
    reflow(state, session);
    return true;
  }
  if (isConnected(state, k) || !isAdjacent(state.size, head, cell)) return false;
  const ep = endpointPair(state, cell);
  if (ep >= 0 && ep !== k) return false;
  const owner = ownerGrid(state);
  if (owner[cell] >= 0 && owner[cell] !== k && state.hinted[owner[cell]]) return false;
  p.push(cell);
  reflow(state, session);
  return true;
}

/**
 * 清除某編號的整條線。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} k 編號索引。
 * @returns {boolean} 有清除時為 true。
 */
export function clearPair(state, k) {
  if (state.completed || k < 0 || state.hinted[k] || !state.paths[k].length) return false;
  // 只含端點的線視為沒有線：清除但不算改變盤面。
  const had = state.paths[k].length > 1;
  state.paths[k] = [];
  if (had) state.touched = true;
  return had;
}

/**
 * 使用提示：把一條線改為解答路徑並鎖定。
 * - 已選取且尚未與解答一致：提示該編號。
 * - 已選取且已與解答一致：不生效、不扣次數。
 * - 未選取：從尚未與解答一致的編號中選解答路徑最短的一條。
 * 解答路徑經過的其他線從重疊處截斷。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} selected 目前選取的編號，未選取為 -1。
 * @returns {{result: 'filled' | 'already-correct' | 'no-quota' | 'completed', pair: number}} 結果與作用的編號。
 */
export function useHint(state, selected) {
  if (state.completed) return { result: 'completed', pair: -1 };
  if (hintsLeft(state) <= 0) return { result: 'no-quota', pair: -1 };
  let k = selected;
  if (k >= 0 && !state.hinted[k]) {
    if (matchesSolution(state, k)) return { result: 'already-correct', pair: k };
  } else {
    k = -1;
    state.ends.forEach((_, j) => {
      if (state.hinted[j] || matchesSolution(state, j)) return;
      if (k < 0 || state.solution[j].length < state.solution[k].length) k = j;
    });
    if (k < 0) return { result: 'completed', pair: -1 };
  }
  const cells = new Set(state.solution[k]);
  state.paths = state.paths.map((p, j) => (j === k ? state.solution[k].slice() : state.hinted[j] ? p : truncateAt(p, cells)));
  state.hinted[k] = true;
  state.hintsUsed++;
  state.touched = true;
  return { result: 'filled', pair: k };
}

/**
 * 驗證讀回的存檔是否完整可用：題目合法、每條線從自己的端點開始、只經過相鄰格、
 * 不穿過其他端點、線彼此不重疊，且提示鎖定的線與解答一致。
 * @param {any} s 存檔物件。
 * @returns {boolean} 可用時為 true。
 */
export function isValidSave(s) {
  if (!s || s.v !== SAVE_VERSION || !Object.prototype.hasOwnProperty.call(DIFFICULTIES, s.difficulty)) return false;
  if (!isValidPuzzle(s)) return false;
  const k = s.ends.length;
  const ints = (v) => Number.isInteger(v) && v >= 0;
  if (!Array.isArray(s.paths) || s.paths.length !== k) return false;
  if (!Array.isArray(s.hinted) || s.hinted.length !== k || !s.hinted.every((h) => typeof h === 'boolean')) return false;
  if (!ints(s.strokes) || !ints(s.hintsUsed) || !Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
  const used = new Set();
  const endOwner = new Map();
  s.ends.forEach(([a, b], j) => {
    endOwner.set(a, j);
    endOwner.set(b, j);
  });
  for (let j = 0; j < k; j++) {
    const p = s.paths[j];
    if (!Array.isArray(p)) return false;
    if (s.hinted[j] && !matchesSolution(s, j)) return false;
    if (!p.length) continue;
    if (!isPath(s.size, p) || !s.ends[j].includes(p[0])) return false;
    for (let t = 0; t < p.length; t++) {
      const c = p[t];
      if (used.has(c)) return false;
      used.add(c);
      const eo = endOwner.get(c);
      if (eo !== undefined && eo !== j) return false;
      if (eo === j && t > 0 && t < p.length - 1) return false;
    }
  }
  return true;
}
