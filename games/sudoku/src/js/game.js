// 遊戲狀態邏輯（不含畫面）：輸入、筆記、清除、提示、復原與完成判定。

import { DIFFICULTIES } from './sudoku/generator.js';
import { ROW_OF, COL_OF, BOX_OF } from './sudoku/core.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新的一局。
 * @param {{difficulty: string, puzzle: string, solution: string}} data 題目資料。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ difficulty, puzzle, solution }) {
  return {
    v: SAVE_VERSION,
    difficulty,
    puzzle,
    solution,
    values: Array.from(puzzle, Number),
    notes: new Array(81).fill(0),
    hinted: new Array(81).fill(false),
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
 * 驗證讀回的存檔結構是否完整可用。
 * @param {any} s 存檔物件。
 * @returns {boolean} 可用時為 true。
 */
export function isValidSave(s) {
  const digits81 = (t) => typeof t === 'string' && /^[0-9]{81}$/.test(t);
  const arr81 = (a, check) => Array.isArray(a) && a.length === 81 && a.every(check);
  return (
    !!s &&
    s.v === SAVE_VERSION &&
    Object.prototype.hasOwnProperty.call(DIFFICULTIES, s.difficulty) &&
    digits81(s.puzzle) &&
    digits81(s.solution) &&
    !s.solution.includes('0') &&
    arr81(s.values, (d) => Number.isInteger(d) && d >= 0 && d <= 9) &&
    arr81(s.notes, (m) => Number.isInteger(m) && m >= 0 && m <= 0x1ff) &&
    arr81(s.hinted, (h) => typeof h === 'boolean') &&
    Number.isInteger(s.hintsUsed) &&
    s.hintsUsed >= 0 &&
    Number.isInteger(s.mistakes) &&
    s.mistakes >= 0 &&
    Number.isFinite(s.elapsedMs) &&
    s.elapsedMs >= 0 &&
    Array.from(s.puzzle).every((ch, i) => ch === '0' || (Number(ch) === s.values[i] && ch === s.solution[i]))
  );
}

/**
 * 判斷格子是否為題目給定數字。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 給定數字時為 true。
 */
export function isGiven(state, i) {
  return state.puzzle[i] !== '0';
}

/**
 * 判斷格子是否鎖定（給定數字或提示填入）。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 不可修改時為 true。
 */
export function isLocked(state, i) {
  return isGiven(state, i) || state.hinted[i];
}

/**
 * 判斷格子目前的數字是否錯誤。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 有填數字且與解答不同時為 true。
 */
export function isWrong(state, i) {
  const v = state.values[i];
  return v !== 0 && v !== Number(state.solution[i]);
}

/**
 * 判斷格子是否已填入正確數字。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {boolean} 正確時為 true。
 */
export function isCorrect(state, i) {
  return state.values[i] === Number(state.solution[i]);
}

/**
 * 判斷全盤是否完成。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 所有格子都正確時為 true。
 */
export function isComplete(state) {
  for (let i = 0; i < 81; i++) if (!isCorrect(state, i)) return false;
  return true;
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
 * 計算每個數字尚未正確填入的數量。
 * @param {object} state 遊戲狀態。
 * @returns {number[]} 索引 1～9 為剩餘數量。
 */
export function remainingCounts(state) {
  const counts = new Array(10).fill(9);
  counts[0] = 0;
  for (let i = 0; i < 81; i++) if (isCorrect(state, i)) counts[state.values[i]]--;
  return counts;
}

/**
 * 判斷兩格是否同列、同行或同宮（含同一格）。
 * @param {number} a 格子索引。
 * @param {number} b 格子索引。
 * @returns {boolean} 相關時為 true。
 */
export function isRelated(a, b) {
  return ROW_OF[a] === ROW_OF[b] || COL_OF[a] === COL_OF[b] || BOX_OF[a] === BOX_OF[b];
}

/**
 * 記錄格子目前內容，供復原使用。
 * @param {object} state 遊戲狀態。
 * @param {number} i 格子索引。
 * @returns {{i: number, value: number, notes: number}} 復原紀錄。
 */
function snapshot(state, i) {
  return { i, value: state.values[i], notes: state.notes[i] };
}

/**
 * 在格子填入數字；填錯時累計錯誤次數並保留在盤面。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} i 格子索引。
 * @param {number} d 數字 1～9。
 * @returns {{undo: object, wrong: boolean} | null} 有變更時回傳復原紀錄與是否填錯。
 */
export function inputDigit(state, i, d) {
  if (state.completed || i < 0 || isLocked(state, i) || state.values[i] === d) return null;
  const undo = snapshot(state, i);
  state.values[i] = d;
  state.notes[i] = 0;
  state.touched = true;
  const wrong = isWrong(state, i);
  if (wrong) state.mistakes++;
  return { undo, wrong };
}

/**
 * 在空格切換筆記候選數字。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} i 格子索引。
 * @param {number} d 數字 1～9。
 * @returns {{undo: object} | null} 有變更時回傳復原紀錄。
 */
export function toggleNote(state, i, d) {
  if (state.completed || i < 0 || isLocked(state, i) || state.values[i] !== 0) return null;
  const undo = snapshot(state, i);
  state.notes[i] ^= 1 << (d - 1);
  state.touched = true;
  return { undo };
}

/**
 * 清除格子的數字；沒有數字時清除筆記。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} i 格子索引。
 * @returns {{undo: object} | null} 有變更時回傳復原紀錄。
 */
export function erase(state, i) {
  if (state.completed || i < 0 || isLocked(state, i)) return null;
  if (!state.values[i] && !state.notes[i]) return null;
  const undo = snapshot(state, i);
  if (state.values[i]) state.values[i] = 0;
  else state.notes[i] = 0;
  state.touched = true;
  return { undo };
}

/**
 * 套用復原紀錄；不扣回錯誤次數。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {{i: number, value: number, notes: number}} entry 復原紀錄。
 * @returns {boolean} 是否有套用。
 */
export function applyUndo(state, entry) {
  if (state.completed || !entry || isLocked(state, entry.i)) return false;
  state.values[entry.i] = entry.value;
  state.notes[entry.i] = entry.notes;
  return true;
}

/**
 * 使用提示。
 * - 選取的可編輯格尚未填對：填入正解。
 * - 選取的可編輯格已填對：不生效、不扣次數。
 * - 未選取或選取鎖定格：從尚未填對的格子隨機挑一格。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} selected 目前選取的格子，未選取為 -1。
 * @param {() => number} [rng=Math.random] 亂數函式。
 * @returns {{result: 'filled' | 'already-correct' | 'no-quota' | 'completed', cell: number}} 結果與作用的格子。
 */
export function useHint(state, selected, rng = Math.random) {
  if (state.completed) return { result: 'completed', cell: -1 };
  if (hintsLeft(state) <= 0) return { result: 'no-quota', cell: -1 };
  let cell = selected;
  if (cell < 0 || isLocked(state, cell)) {
    const candidates = [];
    for (let i = 0; i < 81; i++) if (!isCorrect(state, i)) candidates.push(i);
    if (!candidates.length) return { result: 'completed', cell: -1 };
    cell = candidates[Math.floor(rng() * candidates.length)];
  } else if (isCorrect(state, cell)) {
    return { result: 'already-correct', cell };
  }
  state.values[cell] = Number(state.solution[cell]);
  state.notes[cell] = 0;
  state.hinted[cell] = true;
  state.hintsUsed++;
  state.touched = true;
  return { result: 'filled', cell };
}
