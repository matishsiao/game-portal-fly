// 遊戲狀態邏輯（不含畫面）：輸入列編輯、排除標記、送出與回饋、不合理猜測判定、提示、復原、勝負與存檔驗證。
//
// 狀態欄位：
//   secret     密碼（顏色編號陣列）
//   guesses    已送出的猜測 [{code, black, white, conflict}]，conflict 為第一個矛盾的猜測索引（-1 表示合理）
//   input      目前輸入列（-1 為空位）；revealed 為提示揭示的位置（鎖定）
//   sel        目前選取的位置；excluded 為筆記中被排除的顏色
//   result     'won'、'lost' 或 null（進行中）

import { DIFFICULTIES, feedback, firstConflict, isValidCode, codeKey } from './codebreaker/core.js';

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/**
 * 建立新的一局。
 * @param {{difficulty: string, secret: number[]}} data 難度與密碼。
 * @returns {object} 遊戲狀態。
 */
export function createGame({ difficulty, secret }) {
  const cfg = DIFFICULTIES[difficulty];
  return {
    v: SAVE_VERSION,
    difficulty,
    secret: secret.slice(),
    guesses: [],
    input: new Array(cfg.pegs).fill(-1),
    revealed: new Array(cfg.pegs).fill(false),
    sel: 0,
    excluded: new Array(cfg.colors).fill(false),
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
    result: null,
  };
}

/**
 * 以同一組密碼重開本局，所有進度歸零。
 * @param {object} state 目前狀態。
 * @returns {object} 新的遊戲狀態。
 */
export function restartGame(state) {
  return createGame(state);
}

/**
 * 取得難度設定。
 * @param {object} state 遊戲狀態。
 * @returns {object} 難度設定。
 */
export function configOf(state) {
  return DIFFICULTIES[state.difficulty];
}

/**
 * 取得剩餘提示次數。
 * @param {object} state 遊戲狀態。
 * @returns {number} 剩餘次數。
 */
export function hintsLeft(state) {
  return Math.max(0, configOf(state).hints - state.hintsUsed);
}

/**
 * 判斷這一局是否已結束（猜中或用完次數）。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 已結束時為 true。
 */
export function isOver(state) {
  return state.result !== null;
}

/**
 * 記錄輸入列目前的內容，供復原使用。
 * @param {object} state 遊戲狀態。
 * @returns {{input: number[], sel: number, excluded: boolean[]}} 復原紀錄。
 */
function snapshot(state) {
  return { input: state.input.slice(), sel: state.sel, excluded: state.excluded.slice() };
}

/**
 * 找出下一個可填的空位（從 from 之後往右找，到尾端後從頭找）。
 * @param {object} state 遊戲狀態。
 * @param {number} from 起點（不含）。
 * @returns {number} 位置，沒有空位時為 -1。
 */
export function nextEmpty(state, from) {
  const n = state.input.length;
  for (let k = 1; k <= n; k++) {
    const p = (from + k) % n;
    if (state.input[p] < 0 && !state.revealed[p]) return p;
  }
  return -1;
}

/**
 * 選取位置。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} p 位置。
 * @returns {boolean} 有效時為 true。
 */
export function selectSlot(state, p) {
  if (isOver(state) || p < 0 || p >= state.input.length) return false;
  state.sel = p;
  return true;
}

/**
 * 在選取的位置填入顏色，並移到下一個空位。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} color 顏色編號。
 * @returns {{undo?: object, error?: 'over' | 'locked' | 'duplicate' | 'same'}} 復原紀錄或錯誤原因。
 */
export function placeColor(state, color) {
  const cfg = configOf(state);
  if (isOver(state)) return { error: 'over' };
  if (color < 0 || color >= cfg.colors) return { error: 'same' };
  let p = state.sel;
  if (state.revealed[p]) {
    const next = nextEmpty(state, p);
    if (next < 0) return { error: 'locked' };
    p = next;
  }
  if (state.input[p] === color) return { error: 'same' };
  if (!cfg.repeat && state.input.some((c, k) => k !== p && c === color)) return { error: 'duplicate' };
  const undo = snapshot(state);
  state.input[p] = color;
  state.touched = true;
  const next = nextEmpty(state, p);
  state.sel = next >= 0 ? next : p;
  return { undo };
}

/**
 * 清除選取位置的顏色。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {{undo?: object, error?: 'over' | 'locked' | 'empty'}} 復原紀錄或錯誤原因。
 */
export function clearSlot(state) {
  if (isOver(state)) return { error: 'over' };
  const p = state.sel;
  if (state.revealed[p]) return { error: 'locked' };
  if (state.input[p] < 0) return { error: 'empty' };
  const undo = snapshot(state);
  state.input[p] = -1;
  state.touched = true;
  return { undo };
}

/**
 * 把上一次的猜測複製到輸入列（提示揭示的位置不變）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {{undo?: object, error?: 'over' | 'none'}} 復原紀錄或錯誤原因。
 */
export function copyLast(state) {
  if (isOver(state)) return { error: 'over' };
  const last = state.guesses[state.guesses.length - 1];
  if (!last) return { error: 'none' };
  const undo = snapshot(state);
  state.input = last.code.map((c, p) => (state.revealed[p] ? state.secret[p] : c));
  if (!configOf(state).repeat) {
    // 不可重複的難度中，揭示的顏色若出現在其他位置，清掉那些位置。
    state.input = state.input.map((c, p) => (!state.revealed[p] && state.revealed.some((r, q) => r && state.secret[q] === c) ? -1 : c));
  }
  state.touched = true;
  const empty = nextEmpty(state, -1);
  state.sel = empty >= 0 ? empty : state.sel;
  return { undo };
}

/**
 * 切換顏色的排除標記（筆記）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} color 顏色編號。
 * @returns {{undo?: object, error?: 'over'}} 復原紀錄或錯誤原因。
 */
export function toggleExclude(state, color) {
  if (isOver(state)) return { error: 'over' };
  const undo = snapshot(state);
  state.excluded[color] = !state.excluded[color];
  state.touched = true;
  return { undo };
}

/**
 * 套用復原紀錄（只影響輸入列、選取位置與排除標記）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {{input: number[], sel: number, excluded: boolean[]}} entry 復原紀錄。
 * @returns {boolean} 是否有套用。
 */
export function applyUndo(state, entry) {
  if (!entry || isOver(state)) return false;
  state.input = entry.input.map((c, p) => (state.revealed[p] ? state.secret[p] : c));
  state.sel = entry.sel;
  state.excluded = entry.excluded.slice();
  return true;
}

/**
 * 送出目前輸入列：計算回饋、判定是否與先前回饋矛盾，並判斷勝負。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {{result?: 'won' | 'lost' | 'continue', conflict?: number, black?: number, white?: number,
 *   error?: 'over' | 'incomplete' | 'repeat-guess'}} 結果或錯誤原因。
 */
export function submit(state) {
  const cfg = configOf(state);
  if (isOver(state)) return { error: 'over' };
  if (state.input.some((c) => c < 0)) return { error: 'incomplete' };
  const key = codeKey(state.input);
  if (state.guesses.some((g) => codeKey(g.code) === key)) return { error: 'repeat-guess' };
  const code = state.input.slice();
  const conflict = firstConflict(code, state.guesses);
  const { black, white } = feedback(state.secret, code);
  state.guesses.push({ code, black, white, conflict });
  if (conflict >= 0) state.mistakes++;
  state.touched = true;
  let result = 'continue';
  if (black === cfg.pegs) result = 'won';
  else if (state.guesses.length >= cfg.maxGuesses) result = 'lost';
  if (result !== 'continue') {
    state.result = result;
    state.completed = result === 'won';
  }
  state.input = state.revealed.map((r, p) => (r ? state.secret[p] : -1));
  const empty = nextEmpty(state, -1);
  state.sel = empty >= 0 ? empty : 0;
  return { result, conflict, black, white };
}

/**
 * 使用提示：揭示最左邊尚未揭示的位置，鎖定並填入正確顏色。
 * 不可重複的難度中，若該顏色已填在其他位置，清掉那個位置。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {{result: 'revealed' | 'no-quota' | 'none' | 'over', pos: number}} 結果與揭示的位置。
 */
export function useHint(state) {
  if (isOver(state)) return { result: 'over', pos: -1 };
  if (hintsLeft(state) <= 0) return { result: 'no-quota', pos: -1 };
  const p = state.revealed.findIndex((r) => !r);
  // 最後一個位置不揭示：全部揭示等於直接給答案。
  if (p < 0 || state.revealed.filter((r) => !r).length <= 1) return { result: 'none', pos: -1 };
  const color = state.secret[p];
  if (!configOf(state).repeat) state.input = state.input.map((c, q) => (q !== p && c === color ? -1 : c));
  state.revealed[p] = true;
  state.input[p] = color;
  state.hintsUsed++;
  state.touched = true;
  if (state.sel === p) {
    const next = nextEmpty(state, p);
    state.sel = next >= 0 ? next : p;
  }
  return { result: 'revealed', pos: p };
}

/**
 * 驗證讀回的存檔是否完整可用：密碼與猜測符合難度、回饋與密碼重新計算一致、次數不超過上限。
 * @param {any} s 存檔物件。
 * @returns {boolean} 可用時為 true。
 */
export function isValidSave(s) {
  if (!s || s.v !== SAVE_VERSION || !Object.prototype.hasOwnProperty.call(DIFFICULTIES, s.difficulty)) return false;
  const cfg = DIFFICULTIES[s.difficulty];
  const nonNeg = (v) => Number.isInteger(v) && v >= 0;
  if (!isValidCode(s.secret, cfg)) return false;
  if (!Array.isArray(s.guesses) || s.guesses.length > cfg.maxGuesses) return false;
  for (let k = 0; k < s.guesses.length; k++) {
    const g = s.guesses[k];
    if (!g || !isValidCode(g.code, cfg)) return false;
    const f = feedback(s.secret, g.code);
    if (f.black !== g.black || f.white !== g.white) return false;
    if (g.conflict !== firstConflict(g.code, s.guesses.slice(0, k))) return false;
  }
  const arr = (a, n, check) => Array.isArray(a) && a.length === n && a.every(check);
  if (!arr(s.input, cfg.pegs, (c) => Number.isInteger(c) && c >= -1 && c < cfg.colors)) return false;
  if (!arr(s.revealed, cfg.pegs, (r) => typeof r === 'boolean')) return false;
  if (!arr(s.excluded, cfg.colors, (x) => typeof x === 'boolean')) return false;
  if (s.revealed.some((r, p) => r && s.input[p] !== s.secret[p])) return false;
  if (!nonNeg(s.sel) || s.sel >= cfg.pegs || !nonNeg(s.mistakes) || !nonNeg(s.hintsUsed)) return false;
  if (!Number.isFinite(s.elapsedMs) || s.elapsedMs < 0) return false;
  return s.result === null && !s.completed;
}
