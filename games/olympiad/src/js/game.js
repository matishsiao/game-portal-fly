// 遊戲規則（純邏輯）：建立一局、作答判定、解題重點顯示、下一題、重開本局與存檔驗證。

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/** 每局題數。 */
export const ROUND_SIZE = 10;

/** 難度設定：遊戲內名稱、建議年級與每局「解題重點」額度。 */
export const DIFFICULTIES = {
  easy: { label: '初級', grade: '小一～小二', hints: 5 },
  medium: { label: '中級', grade: '小三～小四', hints: 4 },
  hard: { label: '高級', grade: '小五～小六', hints: 3 },
  expert: { label: '挑戰', grade: '高年級競賽', hints: 3 },
};

/** 難度代碼（依難度由低到高）。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/** 每題的解題重點段數。 */
export const KEY_COUNT = 2;

/**
 * 以亂數打亂陣列（Fisher–Yates），回傳新陣列。
 * @template T
 * @param {T[]} list 原陣列。
 * @param {() => number} rng 亂數產生器。
 * @returns {T[]} 打亂後的新陣列。
 */
export function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 建立一題的作答紀錄。
 * @param {string} id 題目 id。
 * @param {number[]} order 選項顯示順序（order[顯示位置] ＝ 題目 choices 的索引）。
 * @returns {{id: string, order: number[], picked: number[], keysShown: number, hintUsed: boolean, done: boolean}} 作答紀錄。
 */
function newItem(id, order) {
  return { id, order, picked: [], keysShown: 0, hintUsed: false, done: false };
}

/**
 * 建立新的一局。
 * @param {{difficulty: string, ids: string[], rng?: () => number}} options 難度、題目 id（依出題順序）與亂數產生器（打亂選項用）。
 * @returns {object} 遊戲狀態（即存檔內容）。
 */
export function createGame({ difficulty, ids, rng = Math.random }) {
  return {
    v: SAVE_VERSION,
    difficulty,
    items: ids.map((id) => newItem(id, shuffle([0, 1, 2, 3], rng))),
    index: 0,
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
}

/**
 * 重開本局：同一組題目與選項順序，作答紀錄、耗時、錯誤次數與提示額度回到新局狀態。
 * @param {object} state 遊戲狀態。
 * @returns {object} 新的遊戲狀態。
 */
export function restartGame(state) {
  return {
    ...state,
    items: state.items.map((it) => newItem(it.id, it.order.slice())),
    index: 0,
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
}

/**
 * 是否已完成（10 題都答對並按過「下一題」）。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 已完成時為 true。
 */
export function isOver(state) {
  return state.index >= state.items.length;
}

/**
 * 目前這一題的作答紀錄。
 * @param {object} state 遊戲狀態。
 * @returns {object | null} 作答紀錄；已完成時為 null。
 */
export function currentItem(state) {
  return isOver(state) ? null : state.items[state.index];
}

/**
 * 本局剩餘的「解題重點」主動查看次數。
 * @param {object} state 遊戲狀態。
 * @returns {number} 剩餘次數。
 */
export function hintsLeft(state) {
  return Math.max(0, DIFFICULTIES[state.difficulty].hints - state.hintsUsed);
}

/**
 * 作答：點選某個顯示位置的選項。答錯時標記並顯示下一段解題重點（不扣額度）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} slot 顯示位置（0～3）。
 * @param {number} answer 正確選項在題目 choices 中的索引。
 * @returns {{result: 'correct' | 'wrong' | 'ignored', newKey?: boolean, lastOne?: boolean}} 結果；lastOne 表示答錯後只剩一個選項。
 */
export function choose(state, slot, answer) {
  const item = currentItem(state);
  if (!item || item.done || !Number.isInteger(slot) || slot < 0 || slot > 3 || item.picked.includes(slot)) {
    return { result: 'ignored' };
  }
  state.touched = true;
  item.picked.push(slot);
  if (item.order[slot] === answer) {
    item.done = true;
    return { result: 'correct' };
  }
  state.mistakes++;
  const newKey = item.keysShown < KEY_COUNT;
  if (newKey) item.keysShown++;
  return { result: 'wrong', newKey, lastOne: item.picked.length === 3 };
}

/**
 * 主動查看下一段解題重點（扣一次額度）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {'shown' | 'no-quota' | 'all-shown' | 'ignored'} 結果。
 */
export function showKey(state) {
  const item = currentItem(state);
  if (!item || item.done) return 'ignored';
  if (item.keysShown >= KEY_COUNT) return 'all-shown';
  if (hintsLeft(state) === 0) return 'no-quota';
  state.touched = true;
  item.keysShown++;
  item.hintUsed = true;
  state.hintsUsed++;
  return 'shown';
}

/**
 * 進入下一題；目前這題答對後才有效。最後一題之後標記完成。
 * @param {object} state 遊戲狀態（會被修改）。
 * @returns {boolean} 是否前進。
 */
export function nextQuestion(state) {
  const item = currentItem(state);
  if (!item || !item.done) return false;
  state.index++;
  if (isOver(state)) state.completed = true;
  return true;
}

/**
 * 一題的作答結果。
 * @param {object} item 作答紀錄。
 * @returns {{clean: boolean, wrong: number, hint: boolean}} clean：一次答對且沒主動看解題重點；wrong：答錯次數；hint：是否主動看過解題重點。
 */
export function itemResult(item) {
  const wrong = Math.max(0, item.picked.length - (item.done ? 1 : 0));
  return { clean: item.done && wrong === 0 && !item.hintUsed, wrong, hint: item.hintUsed };
}

/**
 * 本局是否全對：沒有答錯，也沒有主動看解題重點。
 * @param {object} state 遊戲狀態。
 * @returns {boolean} 全對時為 true。
 */
export function isPerfect(state) {
  return state.mistakes === 0 && state.hintsUsed === 0;
}

/**
 * 判斷是否為 0～3 的排列。
 * @param {any} order 選項順序。
 * @returns {boolean} 是否合法。
 */
function isPermutation(order) {
  return Array.isArray(order) && order.length === 4 && [0, 1, 2, 3].every((n) => order.includes(n));
}

/**
 * 驗證存檔；版本不符、資料不完整或彼此矛盾時視為損毀。
 * @param {any} data 存檔內容。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目（題庫已刪除或參數不合用時為 null）。
 * @returns {boolean} 合法時為 true。
 */
export function isValidSave(data, lookup) {
  if (!data || typeof data !== 'object' || data.v !== SAVE_VERSION || !DIFFICULTIES[data.difficulty]) return false;
  const { items } = data;
  if (!Array.isArray(items) || items.length === 0 || items.length > ROUND_SIZE) return false;
  if (!Number.isInteger(data.index) || data.index < 0 || data.index >= items.length) return false;
  const count = (v) => Number.isInteger(v) && v >= 0;
  if (!count(data.mistakes) || !count(data.hintsUsed) || data.hintsUsed > DIFFICULTIES[data.difficulty].hints) return false;
  if (!Number.isFinite(data.elapsedMs) || data.elapsedMs < 0 || data.completed) return false;
  let wrongTotal = 0;
  let hintTotal = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || typeof it.id !== 'string' || !isPermutation(it.order) || !lookup(it.id)) return false;
    const q = lookup(it.id);
    if (!Array.isArray(it.picked) || new Set(it.picked).size !== it.picked.length || it.picked.some((p) => !Number.isInteger(p) || p < 0 || p > 3)) return false;
    const correctSlot = it.order.indexOf(q.answer);
    const pickedCorrect = it.picked.includes(correctSlot);
    // 答對的選項必定是最後一個選的，且與 done 一致；目前題之前的都已答對，之後的都還沒作答。
    if (pickedCorrect !== it.done || (it.done && it.picked[it.picked.length - 1] !== correctSlot)) return false;
    if (i < data.index && !it.done) return false;
    if (i > data.index && (it.picked.length || it.keysShown || it.hintUsed)) return false;
    if (!count(it.keysShown) || it.keysShown > KEY_COUNT || typeof it.hintUsed !== 'boolean') return false;
    wrongTotal += it.picked.length - (it.done ? 1 : 0);
    hintTotal += it.hintUsed ? 1 : 0;
  }
  return wrongTotal === data.mistakes && hintTotal <= data.hintsUsed;
}
