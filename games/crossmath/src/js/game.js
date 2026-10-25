// 遊戲狀態邏輯（不含畫面）：填入、替換、清除、筆記、提示、復原、數字庫與完成判定。

import { DIFFICULTIES } from './crossmath/generator.js';
import { parseLayout, isValidPuzzle, bankCounts, MAX_VALUE } from './crossmath/core.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新的一局。
 * @param {{difficulty: string, size: number, layout: string, givens: number[], solution: number[]}} data 題目資料。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ difficulty, size, layout, givens, solution }) {
  return {
    v: SAVE_VERSION,
    difficulty,
    size,
    layout,
    givens: givens.slice(),
    solution: solution.slice(),
    values: givens.slice(),
    notes: givens.map(() => []),
    hinted: givens.map(() => false),
    hintsUsed: 0,
    mistakes: 0,
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
 * 取得盤面骨架解析結果（有快取）。
 * @param {object} state 遊戲狀態。
 * @returns {{equations: object[], numberCells: number[], cellEquations: number[][]}} 解析結果。
 */
export function context(state) {
  return parseLayout(state.size, state.layout);
}

/**
 * 驗證讀回的存檔結構是否完整可用（含數字庫數量一致）。
 * @param {any} s 存檔物件。
 * @returns {boolean} 可用時為 true。
 */
export function isValidSave(s) {
  if (!s || s.v !== SAVE_VERSION || !Object.prototype.hasOwnProperty.call(DIFFICULTIES, s.difficulty)) return false;
  if (!isValidPuzzle(s)) return false;
  const n = s.size * s.size;
  const arr = (a, check) => Array.isArray(a) && a.length === n && a.every(check);
  const bank = new Set(bankValues(s));
  const ok =
    arr(s.values, (v) => Number.isInteger(v) && v >= 0 && v <= MAX_VALUE) &&
    arr(s.notes, (list) => Array.isArray(list) && list.every((v) => bank.has(v))) &&
    arr(s.hinted, (h) => typeof h === 'boolean') &&
    Number.isInteger(s.hintsUsed) &&
    s.hintsUsed >= 0 &&
    Number.isInteger(s.mistakes) &&
    s.mistakes >= 0 &&
    Number.isFinite(s.elapsedMs) &&
    s.elapsedMs >= 0;
  if (!ok) return false;
  for (let i = 0; i < n; i++) {
    if (s.layout[i] !== '#' && s.values[i] !== 0) return false;
    if (s.givens[i] && s.values[i] !== s.givens[i]) return false;
    if (s.hinted[i] && s.values[i] !== s.solution[i]) return false;
  }
  return remainingCounts(s).every((c) => c >= 0);
}

/**
 * 判斷格子是否為數字格。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 數字格時為 true。
 */
export function isNumberCell(state, i) {
  return i >= 0 && state.layout[i] === '#';
}

/**
 * 判斷格子是否為題目給定數字。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 給定數字時為 true。
 */
export function isGiven(state, i) {
  return isNumberCell(state, i) && state.givens[i] !== 0;
}

/**
 * 判斷格子是否鎖定（給定數字或提示填入）。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 不可修改時為 true。
 */
export function isLocked(state, i) {
  return isGiven(state, i) || !!state.hinted[i];
}

/**
 * 判斷格子目前的數字是否錯誤。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 有填數字且與解答不同時為 true。
 */
export function isWrong(state, i) {
  const v = state.values[i];
  return isNumberCell(state, i) && v !== 0 && v !== state.solution[i];
}

/**
 * 判斷數字格是否已填入正確數字。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 正確時為 true。
 */
export function isCorrect(state, i) {
  return isNumberCell(state, i) && state.values[i] === state.solution[i];
}

/**
 * 判斷全盤是否完成。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 所有數字格都正確時為 true。
 */
export function isComplete(state) {
  return context(state).numberCells.every((i) => isCorrect(state, i));
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
 * 取得本題數字庫中出現的所有數值。
 * @param {object} state 遊戲狀態或題目資料。
 * @returns {number[]} 由小到大、不重複的數值。
 */
export function bankValues(state) {
  const counts = bankCounts(state);
  const out = [];
  for (let v = 1; v <= MAX_VALUE; v++) if (counts[v] > 0) out.push(v);
  return out;
}

/**
 * 計算數字庫剩餘數量：數字庫總數扣掉目前填在空格裡的數字（含填錯的）。
 * @param {object} state 遊戲狀態。
 * @returns {number[]} 索引為數值、內容為剩餘數量。
 */
export function remainingCounts(state) {
  const counts = bankCounts(state);
  for (let i = 0; i < state.layout.length; i++) {
    if (state.layout[i] === '#' && state.givens[i] === 0 && state.values[i] > 0) counts[state.values[i]]--;
  }
  return counts;
}

/**
 * 取得格子所屬的算式索引。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {number[]} 算式索引。
 */
export function equationsOf(state, i) {
  return i >= 0 ? context(state).cellEquations[i] : [];
}

/**
 * 取得所有數字格都已正確填入的算式。
 * @param {object} state 遊戲狀態。
 * @returns {Set<number>} 已完成的算式索引。
 */
export function completedEquations(state) {
  const out = new Set();
  context(state).equations.forEach((eq, e) => {
    if (eq.nums.every((i) => isCorrect(state, i))) out.add(e);
  });
  return out;
}

/**
 * 找出可直接計算的未填對格子：所屬某條算式的其他數字格都已正確。
 * @param {object} state 遊戲狀態。
 * @returns {number[]} 格子索引。
 */
export function directCells(state) {
  const out = new Set();
  for (const eq of context(state).equations) {
    const pending = eq.nums.filter((i) => !isCorrect(state, i));
    if (pending.length === 1) out.add(pending[0]);
  }
  return Array.from(out);
}

/**
 * 記錄格子目前內容，供復原使用。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {{i: number, value: number, notes: number[]}} 復原紀錄。
 */
function snapshot(state, i) {
  return { i, value: state.values[i], notes: state.notes[i].slice() };
}

/**
 * 判斷格子是否可由玩家編輯。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 可編輯時為 true。
 */
function editable(state, i) {
  return !state.completed && isNumberCell(state, i) && !isLocked(state, i);
}

/**
 * 在空格填入（或替換為）數字庫中的數字；原數字回到數字庫。填錯時累計錯誤次數並保留在盤面。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} i 格子索引。
 * @param {number} v 數值。
 * @returns {{undo: object, wrong: boolean} | null} 有變更時回傳復原紀錄與是否填錯；
 *   不可編輯、數值相同或數字庫已無該數值時為 null。
 */
export function inputValue(state, i, v) {
  if (!editable(state, i) || state.values[i] === v) return null;
  if (remainingCounts(state)[v] <= 0) return null;
  const undo = snapshot(state, i);
  state.values[i] = v;
  state.notes[i] = [];
  state.touched = true;
  const wrong = isWrong(state, i);
  if (wrong) state.mistakes++;
  return { undo, wrong };
}

/**
 * 在空格切換筆記候選數字；只能使用本題數字庫中出現過的數值。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} i 格子索引。
 * @param {number} v 數值。
 * @returns {{undo: object} | null} 有變更時回傳復原紀錄。
 */
export function toggleNote(state, i, v) {
  if (!editable(state, i) || state.values[i] !== 0 || !bankValues(state).includes(v)) return null;
  const undo = snapshot(state, i);
  const list = state.notes[i];
  state.notes[i] = list.includes(v) ? list.filter((x) => x !== v) : [...list, v].sort((a, b) => a - b);
  state.touched = true;
  return { undo };
}

/**
 * 清除格子的數字（回到數字庫）；沒有數字時清除筆記。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} i 格子索引。
 * @returns {{undo: object} | null} 有變更時回傳復原紀錄。
 */
export function erase(state, i) {
  if (!editable(state, i)) return null;
  if (!state.values[i] && !state.notes[i].length) return null;
  const undo = snapshot(state, i);
  if (state.values[i]) state.values[i] = 0;
  else state.notes[i] = [];
  state.touched = true;
  return { undo };
}

/**
 * 套用復原紀錄；不扣回錯誤次數。數字庫已無該數值時不套用。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {{i: number, value: number, notes: number[]}} entry 復原紀錄。
 * @returns {boolean} 是否有套用。
 */
export function applyUndo(state, entry) {
  if (!entry || !editable(state, entry.i)) return false;
  const current = state.values[entry.i];
  if (entry.value && entry.value !== current && remainingCounts(state)[entry.value] <= 0) return false;
  state.values[entry.i] = entry.value;
  state.notes[entry.i] = entry.notes.slice();
  return true;
}

/**
 * 使用提示。
 * - 選取的可編輯格尚未填對：填入正解。
 * - 選取的可編輯格已填對：不生效、不扣次數。
 * - 未選取或選取鎖定格：優先從可直接計算的未填對格子隨機挑一格，沒有時從所有未填對格子挑。
 * 所需數值在數字庫中已用完時，從一個填錯該數值的格子清除它再填入。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} selected 目前選取的格子，未選取為 -1。
 * @param {() => number} [rng=Math.random] 亂數函式。
 * @returns {{result: 'filled' | 'already-correct' | 'no-quota' | 'completed', cell: number, cleared: number}}
 *   結果、作用的格子，以及被清除錯誤數字的格子（沒有時為 -1）。
 */
export function useHint(state, selected, rng = Math.random) {
  if (state.completed) return { result: 'completed', cell: -1, cleared: -1 };
  if (hintsLeft(state) <= 0) return { result: 'no-quota', cell: -1, cleared: -1 };
  let cell = selected;
  if (!isNumberCell(state, cell) || isLocked(state, cell)) {
    const pending = context(state).numberCells.filter((i) => !isCorrect(state, i));
    if (!pending.length) return { result: 'completed', cell: -1, cleared: -1 };
    const direct = directCells(state);
    const pool = direct.length ? direct : pending;
    cell = pool[Math.floor(rng() * pool.length)];
  } else if (isCorrect(state, cell)) {
    return { result: 'already-correct', cell, cleared: -1 };
  }
  const v = state.solution[cell];
  state.values[cell] = 0;
  let cleared = -1;
  if (remainingCounts(state)[v] <= 0) {
    // 數字庫總數等於解答中該數值的空格數，用完時必有其他格填錯了這個數值。
    cleared = context(state).numberCells.find((i) => i !== cell && state.values[i] === v && isWrong(state, i));
    if (cleared === undefined) cleared = -1;
    else state.values[cleared] = 0;
  }
  state.values[cell] = v;
  state.notes[cell] = [];
  state.hinted[cell] = true;
  state.hintsUsed++;
  state.touched = true;
  return { result: 'filled', cell, cleared };
}
