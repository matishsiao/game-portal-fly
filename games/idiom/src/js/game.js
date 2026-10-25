// 遊戲狀態邏輯（不含畫面）：填字、替換、清除、復原、提示、成語完成判定、作答結果與存檔驗證。
//
// 一局由一或多個盤面組成：逐題模式（初級、中級）每題一個 1 × 4 盤面，依 index 逐題作答；
// 交叉模式（高級、專家）只有一個盤面。每個盤面另記錄：
//   filled    每格玩家填入的字（空字串為未填；非空格不使用）
//   hinted    每格是否為提示填入（鎖定）
//   wrong     每個成語是否曾答錯
//   hint      每個成語是否使用過提示
//   recorded  每個成語是否已記入成語本（避免重複記錄）
// 每格正確字（answers）由成語 id 取回文字推算，不寫入存檔。

import { DIFFICULTIES } from './idiom/generator.js';
import { answersOf, wordCells, cellWords, countChars } from './idiom/board.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新的一局。
 * @param {{difficulty: string, mode: string, boards: object[]}} data 出題結果。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ difficulty, mode, boards }) {
  return {
    v: SAVE_VERSION,
    difficulty,
    mode,
    boards: boards.map((b) => ({
      rows: b.rows,
      cols: b.cols,
      words: b.words.map((w) => ({ id: w.id, dir: w.dir, r: w.r, c: w.c })),
      blanks: b.blanks.slice(),
      bank: b.bank.slice(),
      filled: new Array(b.rows * b.cols).fill(''),
      hinted: new Array(b.rows * b.cols).fill(false),
      wrong: b.words.map(() => false),
      hint: b.words.map(() => false),
      recorded: b.words.map(() => false),
    })),
    index: 0,
    mistakes: 0,
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
 * 推算每個盤面的正確字。
 * @param {object} state 遊戲狀態。
 * @param {(id: string) => string} textOf 由成語 id 取得文字。
 * @returns {string[][]} 每個盤面的正確字。
 */
export function answersFor(state, textOf) {
  return state.boards.map((b) => answersOf(b, textOf));
}

/**
 * 取得目前作答中的盤面索引。
 * @param {object} state 遊戲狀態。
 * @returns {number} 盤面索引。
 */
export function currentIndex(state) {
  return state.mode === 'single' ? state.index : 0;
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
 * 判斷格子是否為空格（需要作答的格子）。
 * @param {object} board 盤面。
 * @param {number} cell 格子索引。
 * @returns {boolean} 空格時為 true。
 */
export function isBlank(board, cell) {
  return board.blanks.includes(cell);
}

/**
 * 判斷格子是否鎖定（題目給定的字或提示填入）。
 * @param {object} board 盤面。
 * @param {number} cell 格子索引。
 * @returns {boolean} 不可修改時為 true。
 */
export function isLocked(board, cell) {
  return !isBlank(board, cell) || board.hinted[cell];
}

/**
 * 取得格子目前顯示的字（給定的字、填入的字或空字串）。
 * @param {object} board 盤面。
 * @param {string[]} answers 正確字。
 * @param {number} cell 格子索引。
 * @returns {string} 字。
 */
export function shownChar(board, answers, cell) {
  return isBlank(board, cell) ? board.filled[cell] : answers[cell];
}

/**
 * 判斷空格是否填錯。
 * @param {object} board 盤面。
 * @param {string[]} answers 正確字。
 * @param {number} cell 格子索引。
 * @returns {boolean} 有填字且與正確字不同時為 true。
 */
export function isWrong(board, answers, cell) {
  return isBlank(board, cell) && board.filled[cell] !== '' && board.filled[cell] !== answers[cell];
}

/**
 * 判斷格子是否正確（給定的字或填對）。
 * @param {object} board 盤面。
 * @param {string[]} answers 正確字。
 * @param {number} cell 格子索引。
 * @returns {boolean} 正確時為 true。
 */
export function isCorrect(board, answers, cell) {
  return !isBlank(board, cell) || board.filled[cell] === answers[cell];
}

/**
 * 判斷成語是否完成（四格都正確）。
 * @param {object} board 盤面。
 * @param {string[]} answers 正確字。
 * @param {number} w 成語索引。
 * @returns {boolean} 完成時為 true。
 */
export function isWordDone(board, answers, w) {
  return wordCells(board, board.words[w]).every((cell) => isCorrect(board, answers, cell));
}

/**
 * 判斷盤面是否完成。
 * @param {object} board 盤面。
 * @param {string[]} answers 正確字。
 * @returns {boolean} 所有空格都正確時為 true。
 */
export function isBoardDone(board, answers) {
  return board.blanks.every((cell) => board.filled[cell] === answers[cell]);
}

/**
 * 計算字庫剩餘數量：字庫扣掉目前填在空格裡的字（含填錯的）。
 * @param {object} board 盤面。
 * @returns {Map<string, number>} 字 → 剩餘數量。
 */
export function remainingChars(board) {
  const left = countChars(board.bank);
  for (const cell of board.blanks) {
    const ch = board.filled[cell];
    if (ch) left.set(ch, left.get(ch) - 1);
  }
  return left;
}

/**
 * 取得字庫按鈕的顯示順序：依字庫排列順序，同一個字只出現一次。
 * @param {object} board 盤面。
 * @returns {string[]} 不重複的字。
 */
export function bankOrder(board) {
  return [...new Set(board.bank)];
}

/**
 * 找出下一個尚未填字的空格（從指定格之後依序尋找，到尾端後從頭開始）。
 * @param {object} board 盤面。
 * @param {number} from 起點格子（不含），-1 表示從頭。
 * @returns {number} 空格索引，全部已填時為 -1。
 */
export function nextEmpty(board, from) {
  const open = board.blanks.filter((cell) => !board.filled[cell] && !board.hinted[cell]);
  if (!open.length) return -1;
  return open.find((cell) => cell > from) ?? open[0];
}

/**
 * 標記某格所屬的成語（曾答錯或使用提示）。
 * @param {object} board 盤面（會被修改）。
 * @param {number} cell 格子索引。
 * @param {'wrong' | 'hint'} key 標記種類。
 */
function flagWords(board, cell, key) {
  cellWords(board)[cell].forEach((w) => {
    board[key][w] = true;
  });
}

/**
 * 在空格填入（或替換為）字庫中的字；原字歸還字庫。填錯時累計錯誤次數並標記所屬成語。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} board 盤面（會被修改）。
 * @param {string[]} answers 正確字。
 * @param {number} cell 格子索引。
 * @param {string} ch 字。
 * @returns {{undo: {cell: number, ch: string}, wrong: boolean} | null} 有變更時回傳復原紀錄與是否填錯；
 *   不可編輯、字相同或字庫已無該字時為 null。
 */
export function inputChar(state, board, answers, cell, ch) {
  if (state.completed || isLocked(board, cell) || board.filled[cell] === ch) return null;
  if ((remainingChars(board).get(ch) || 0) <= 0) return null;
  const undo = { cell, ch: board.filled[cell] };
  board.filled[cell] = ch;
  state.touched = true;
  const wrong = ch !== answers[cell];
  if (wrong) {
    state.mistakes++;
    flagWords(board, cell, 'wrong');
  }
  return { undo, wrong };
}

/**
 * 清除空格的字（歸還字庫）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} board 盤面（會被修改）。
 * @param {number} cell 格子索引。
 * @returns {{undo: {cell: number, ch: string}} | null} 有變更時回傳復原紀錄。
 */
export function erase(state, board, cell) {
  if (state.completed || isLocked(board, cell) || !board.filled[cell]) return null;
  const undo = { cell, ch: board.filled[cell] };
  board.filled[cell] = '';
  state.touched = true;
  return { undo };
}

/**
 * 套用復原紀錄；不扣回錯誤次數。字庫已無該字時不套用。
 * @param {object} board 盤面（會被修改）。
 * @param {{cell: number, ch: string}} entry 復原紀錄。
 * @returns {boolean} 是否有套用。
 */
export function applyUndo(board, entry) {
  if (!entry || isLocked(board, entry.cell)) return false;
  if (entry.ch && entry.ch !== board.filled[entry.cell] && (remainingChars(board).get(entry.ch) || 0) <= 0) return false;
  board.filled[entry.cell] = entry.ch;
  return true;
}

/**
 * 使用提示：填入選取空格的正確字；未選取或選取不可提示的格子時，選第一個未填對的空格。
 * 所需的字被錯誤填入佔用時，先從該錯誤格清除。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} board 盤面（會被修改）。
 * @param {string[]} answers 正確字。
 * @param {number} selected 目前選取的格子，未選取為 -1。
 * @returns {{result: 'filled' | 'already-correct' | 'no-quota' | 'completed', cell: number, cleared: number}}
 *   結果、作用的格子，以及被清除錯誤字的格子（沒有時為 -1）。
 */
export function useHint(state, board, answers, selected) {
  if (state.completed) return { result: 'completed', cell: -1, cleared: -1 };
  if (hintsLeft(state) <= 0) return { result: 'no-quota', cell: -1, cleared: -1 };
  let cell = selected;
  if (cell >= 0 && isBlank(board, cell) && !board.hinted[cell] && board.filled[cell] === answers[cell]) {
    return { result: 'already-correct', cell, cleared: -1 };
  }
  if (cell < 0 || isLocked(board, cell)) {
    cell = board.blanks.find((c) => board.filled[c] !== answers[c]);
    if (cell === undefined) return { result: 'completed', cell: -1, cleared: -1 };
  }
  const ch = answers[cell];
  board.filled[cell] = '';
  let cleared = -1;
  if ((remainingChars(board).get(ch) || 0) <= 0) {
    // 字庫中該字的數量等於需要它的空格數，用完時必有其他格填錯了這個字。
    cleared = board.blanks.find((c) => c !== cell && board.filled[c] === ch && ch !== answers[c]);
    if (cleared === undefined) cleared = -1;
    else board.filled[cleared] = '';
  }
  board.filled[cell] = ch;
  board.hinted[cell] = true;
  flagWords(board, cell, 'hint');
  state.hintsUsed++;
  state.touched = true;
  return { result: 'filled', cell, cleared };
}

/**
 * 取得成語的作答結果。
 * @param {object} board 盤面。
 * @param {number} w 成語索引。
 * @returns {'hint' | 'wrong' | 'perfect'} 使用提示、曾答錯或一次答對。
 */
export function wordResult(board, w) {
  if (board.hint[w]) return 'hint';
  return board.wrong[w] ? 'wrong' : 'perfect';
}

/**
 * 驗證讀回的存檔是否完整可用：成語 id 存在、盤面結構與字庫數量一致。
 * @param {any} s 存檔物件。
 * @param {(id: string) => string | undefined} textOf 由成語 id 取得文字（不存在時為 undefined）。
 * @returns {boolean} 可用時為 true。
 */
export function isValidSave(s, textOf) {
  if (!s || s.v !== SAVE_VERSION || !Object.prototype.hasOwnProperty.call(DIFFICULTIES, s.difficulty)) return false;
  if (s.mode !== DIFFICULTIES[s.difficulty].mode || !Array.isArray(s.boards) || !s.boards.length) return false;
  const nonNeg = (v) => Number.isInteger(v) && v >= 0;
  if (!nonNeg(s.index) || s.index >= s.boards.length || !nonNeg(s.mistakes) || !nonNeg(s.hintsUsed)) return false;
  if (!Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
  for (const b of s.boards) {
    if (!b || !nonNeg(b.rows) || !nonNeg(b.cols) || !Array.isArray(b.words) || !b.words.length) return false;
    const n = b.rows * b.cols;
    for (const w of b.words) {
      const text = textOf(w.id);
      if (!text || Array.from(text).length !== 4 || !['h', 'v'].includes(w.dir)) return false;
      const endR = w.dir === 'v' ? w.r + 3 : w.r;
      const endC = w.dir === 'h' ? w.c + 3 : w.c;
      if (!nonNeg(w.r) || !nonNeg(w.c) || endR >= b.rows || endC >= b.cols) return false;
    }
    const answers = answersOf(b, textOf);
    const arr = (a, check) => Array.isArray(a) && a.length === n && a.every(check);
    if (!arr(b.filled, (x) => typeof x === 'string') || !arr(b.hinted, (x) => typeof x === 'boolean')) return false;
    for (const key of ['wrong', 'hint', 'recorded']) {
      if (!Array.isArray(b[key]) || b[key].length !== b.words.length || !b[key].every((x) => typeof x === 'boolean')) return false;
    }
    if (!Array.isArray(b.blanks) || !b.blanks.every((c) => nonNeg(c) && c < n && answers[c])) return false;
    if (!Array.isArray(b.bank) || !b.bank.every((x) => typeof x === 'string' && x)) return false;
    const need = countChars(b.blanks.map((c) => answers[c]));
    const have = countChars(b.bank);
    for (const [ch, k] of need) if ((have.get(ch) || 0) < k) return false;
    for (let c = 0; c < n; c++) {
      if (b.filled[c] && !b.blanks.includes(c)) return false;
      if (b.hinted[c] && b.filled[c] !== answers[c]) return false;
    }
    for (const k of remainingChars(b).values()) if (k < 0) return false;
  }
  return true;
}
