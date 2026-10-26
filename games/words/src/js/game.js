// 遊戲狀態邏輯（不含畫面）：選取、配對、答錯、提示、換盤與單字本更新。

import { DIFFICULTIES } from './deck.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新的一局。
 * @param {{source: string, difficulty: string, boards: {ids: string[], left: string[], right: string[]}[]}} data 出題結果。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ source, difficulty, boards }) {
  return {
    v: SAVE_VERSION,
    source,
    difficulty,
    boards,
    board: 0,
    matched: boards.map(() => []),
    selected: null,
    results: {},
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
}

/**
 * 以同一組題目重開本局。
 * @param {object} state 目前狀態。
 * @returns {object} 新的遊戲狀態。
 */
export function restartGame(state) {
  return createGame(state);
}

/**
 * 取得目前這一盤。
 * @param {object} state 遊戲狀態。
 * @returns {{ids: string[], left: string[], right: string[]}} 盤面。
 */
export function currentBoard(state) {
  return state.boards[state.board];
}

/**
 * 判斷單字在目前這一盤是否已配對完成。
 * @param {object} state 遊戲狀態。
 * @param {string} id 單字 id。
 * @returns {boolean} 已配對時為 true。
 */
export function isMatched(state, id) {
  return state.matched[state.board].includes(id);
}

/**
 * 點選一張卡片。左欄與右欄可以任意先點；再點另一欄的卡片即配對。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {'left' | 'right'} side 卡片所在欄。
 * @param {string} id 卡片代表的單字 id。
 * @returns {{type: 'ignore' | 'select' | 'deselect' | 'match' | 'wrong', left?: string, right?: string}} 結果。
 */
export function tapCard(state, side, id) {
  if (state.completed || isMatched(state, id) || !currentBoard(state).ids.includes(id)) return { type: 'ignore' };
  const sel = state.selected;
  if (!sel || sel.side === side) {
    if (sel && sel.id === id) {
      state.selected = null;
      return { type: 'deselect' };
    }
    state.selected = { side, id };
    return { type: 'select' };
  }
  state.selected = null;
  state.touched = true;
  const left = side === 'left' ? id : sel.id;
  const right = side === 'right' ? id : sel.id;
  if (left === right) {
    state.matched[state.board].push(left);
    return { type: 'match', left, right };
  }
  state.mistakes++;
  // 答錯記在題目（左欄）那個單字上。
  if (state.results[left] !== 'hint') state.results[left] = 'wrong';
  return { type: 'wrong', left, right };
}

/**
 * 取得本局提示額度。
 * @param {object} state 遊戲狀態。
 * @returns {number} 剩餘次數。
 */
export function hintsLeft(state) {
  return Math.max(0, DIFFICULTIES[state.difficulty].hints - state.hintsUsed);
}

/**
 * 使用提示：依左欄順序配對第一組尚未完成的單字。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {{result: 'matched' | 'no-quota' | 'none', id?: string}} 結果。
 */
export function useHint(state) {
  if (state.completed) return { result: 'none' };
  if (hintsLeft(state) <= 0) return { result: 'no-quota' };
  const id = currentBoard(state).left.find((w) => !isMatched(state, w));
  if (!id) return { result: 'none' };
  state.matched[state.board].push(id);
  state.results[id] = 'hint';
  state.hintsUsed++;
  state.selected = null;
  state.touched = true;
  return { result: 'matched', id };
}

/**
 * 判斷目前這一盤是否全部配對完成。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 完成時為 true。
 */
export function boardDone(state) {
  return state.matched[state.board].length === currentBoard(state).ids.length;
}

/**
 * 判斷是否為最後一盤。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 是時為 true。
 */
export function isLastBoard(state) {
  return state.board === state.boards.length - 1;
}

/**
 * 進入下一盤。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {boolean} 有下一盤時為 true。
 */
export function nextBoard(state) {
  if (isLastBoard(state)) return false;
  state.board++;
  state.selected = null;
  return true;
}

/**
 * 依一盤的作答結果更新單字本：一次答對即「已學會」並移出待複習；答錯或使用提示則列入待複習。
 * @param {Record<string, object>} book 單字本（會被修改）。
 * @param {string[]} ids 這一盤的單字。
 * @param {Record<string, string>} results 作答結果（沒有紀錄代表一次答對）。
 * @param {number} now 目前時間戳記。
 * @returns {Record<string, object>} 同一個單字本。
 */
export function applyBoardToBook(book, ids, results, now) {
  for (const id of ids) {
    const b = book[id] || { seen: 0, correct: 0, learned: false, review: false, lastSeen: 0 };
    b.seen++;
    b.lastSeen = now;
    if (results[id]) {
      b.review = true;
    } else {
      b.correct++;
      b.learned = true;
      b.review = false;
    }
    book[id] = b;
  }
  return book;
}

/**
 * 驗證讀回的存檔。
 * @param {any} s 存檔。
 * @param {(id: string) => boolean} wordExists 判斷單字是否存在。
 * @returns {boolean} 可用時為 true。
 */
export function isValidSave(s, wordExists) {
  if (!s || s.v !== SAVE_VERSION || !DIFFICULTIES[s.difficulty] || typeof s.source !== 'string') return false;
  if (!Array.isArray(s.boards) || !s.boards.length || !Number.isInteger(s.board) || s.board < 0 || s.board >= s.boards.length) return false;
  if (!Array.isArray(s.matched) || s.matched.length !== s.boards.length) return false;
  const okBoard = (b) => Array.isArray(b.ids) && b.ids.every(wordExists) && [b.left, b.right].every((col) => Array.isArray(col) && col.length === b.ids.length && col.every((id) => b.ids.includes(id)));
  if (!s.boards.every(okBoard)) return false;
  if (!s.matched.every((m, i) => Array.isArray(m) && m.every((id) => s.boards[i].ids.includes(id)))) return false;
  return Number.isInteger(s.mistakes) && s.mistakes >= 0 && Number.isInteger(s.hintsUsed) && s.hintsUsed >= 0 && Number.isFinite(s.elapsedMs) && s.elapsedMs >= 0 && !!s.results && typeof s.results === 'object';
}
