// 遊戲規則（純邏輯）：建立一局、選擇題作答、排順序與分類的擺放與檢查、解題重點、下一題、重開本局與存檔驗證。

/** 存檔格式版本。 */
export const SAVE_VERSION = 1;

/** 每局題數。 */
export const ROUND_SIZE = 8;

/** 每題的解題重點段數。 */
export const KEY_COUNT = 2;

/** 學習階段（共用難度代碼，不使用 `hard`）：遊戲內名稱、年級與每局「解題重點」額度。 */
export const DIFFICULTIES = {
  easy: { label: '低年級', grade: '小一～小二', hints: 5 },
  medium: { label: '中高年級', grade: '小三～小六', hints: 4 },
  expert: { label: '國中', grade: '國一～國三', hints: 3 },
};

/** 模式代碼：預習、練習（單元複習）、今日複習、綜合練習。 */
export const MODES = ['preview', 'practice', 'review', 'mixed'];

/** 預習時每局多給的解題重點次數。 */
export const PREVIEW_BONUS_HINTS = 2;

/** 難度代碼（依難度由低到高）。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/** 題型代碼。 */
export const TYPES = ['choice', 'order', 'sort'];

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
 * 題目中需要打亂順序的元素個數（選擇題的選項、排序題的項目、分類題的卡片）。
 * @param {object} q 題目。
 * @returns {number} 個數。
 */
export function partCount(q) {
  if (q.type === 'choice') return q.options.length;
  if (q.type === 'order') return q.items.length;
  return q.cards.length;
}

/**
 * 建立一題的作答紀錄。
 * @param {object} q 題目。
 * @param {number[]} order 顯示順序（order[顯示位置] ＝ 資料中的索引）。
 * @returns {object} 作答紀錄。
 */
function newItem(q, order) {
  const n = order.length;
  return {
    id: q.id,
    type: q.type,
    order,
    done: false,
    mistakes: 0,
    keysShown: 0,
    hintUsed: false,
    // 選擇題：選過的顯示位置。
    picked: [],
    // 排序題：place[格子] ＝ 放進的項目顯示位置（-1 為空）；分類題：place[卡片顯示位置] ＝ 類別（-1 為未放）。
    place: q.type === 'choice' ? [] : new Array(n).fill(-1),
    // 排序題以格子、分類題以卡片為單位，檢查時答對的會鎖定。
    locked: q.type === 'choice' ? [] : new Array(n).fill(false),
    // 最近一次檢查答錯的卡片（分類題，顯示其提示用）。
    lastWrong: [],
  };
}

/**
 * 建立新的一局。
 * @param {object} options 選項。
 * @param {string} options.difficulty 學習階段代碼。
 * @param {string} options.mode 模式代碼（見 MODES）。
 * @param {string | null} options.unit 單元 id（預習與練習）；今日複習與綜合練習為 null。
 * @param {string[]} options.ids 題目 id（依出題順序）。
 * @param {(id: string) => object | null} options.lookup 由 id 取得題目。
 * @param {() => number} [options.rng] 亂數產生器（打亂顯示順序用）。
 * @returns {object} 遊戲狀態（即存檔內容）。
 */
export function createGame({ difficulty, mode, unit, ids, lookup, rng = Math.random }) {
  return {
    v: SAVE_VERSION,
    difficulty,
    mode,
    unit,
    hintLimit: DIFFICULTIES[difficulty].hints + (mode === 'preview' ? PREVIEW_BONUS_HINTS : 0),
    items: ids.map((id) => {
      const q = lookup(id);
      return newItem(q, shuffle([...Array(partCount(q)).keys()], rng));
    }),
    index: 0,
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
}

/**
 * 重開本局：同一組題目與顯示順序，作答紀錄、耗時、錯誤次數與提示額度回到新局狀態。
 * @param {object} state 遊戲狀態。
 * @param {(id: string) => object | null} lookup 由 id 取得題目。
 * @returns {object} 新的遊戲狀態。
 */
export function restartGame(state, lookup) {
  return {
    ...state,
    items: state.items.map((it) => newItem(lookup(it.id), it.order.slice())),
    index: 0,
    mistakes: 0,
    hintsUsed: 0,
    elapsedMs: 0,
    touched: false,
    completed: false,
  };
}

/**
 * 是否已完成（每題都答對並按過「下一題」）。
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
  return Math.max(0, state.hintLimit - state.hintsUsed);
}

/**
 * 記一次答錯（整局與這一題各 ＋1），並依題型自動顯示下一段解題重點（不扣額度）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} item 作答紀錄（會被修改）。
 * @returns {boolean} 是否新顯示了一段解題重點。
 */
function addMistake(state, item) {
  state.mistakes++;
  item.mistakes++;
  // 選擇題第 2 次答錯起才加上解題重點（第 1 次先看選項的「想一想」）；排序題每次答錯都加上；分類題只看各卡片的提示。
  const auto = item.type === 'order' || (item.type === 'choice' && item.mistakes >= 2);
  if (auto && item.keysShown < KEY_COUNT) {
    item.keysShown++;
    return true;
  }
  return false;
}

/**
 * 選擇題作答：點選某個顯示位置的選項。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} slot 顯示位置（0～3）。
 * @param {object} q 題目。
 * @returns {{result: 'correct' | 'wrong' | 'ignored', lastOne?: boolean, newKey?: boolean}} 結果；lastOne 表示答錯後只剩一個選項。
 */
export function choose(state, slot, q) {
  const item = currentItem(state);
  if (!item || item.done || item.type !== 'choice' || !Number.isInteger(slot) || slot < 0 || slot >= item.order.length || item.picked.includes(slot)) {
    return { result: 'ignored' };
  }
  state.touched = true;
  item.picked.push(slot);
  if (item.order[slot] === q.answer) {
    item.done = true;
    return { result: 'correct' };
  }
  const newKey = addMistake(state, item);
  return { result: 'wrong', newKey, lastOne: item.picked.length === item.order.length - 1 };
}

/**
 * 排序題：把一個項目放進第一個空格。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} display 項目的顯示位置。
 * @returns {boolean} 是否放入。
 */
export function placeOrder(state, display) {
  const item = currentItem(state);
  if (!item || item.done || item.type !== 'order' || item.place.includes(display) || display < 0 || display >= item.order.length) return false;
  const slot = item.place.indexOf(-1);
  if (slot < 0) return false;
  item.place[slot] = display;
  item.lastWrong = [];
  state.touched = true;
  return true;
}

/**
 * 排序題：把格子裡的項目取回（鎖定的格子不能取回）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} slot 格子位置。
 * @returns {boolean} 是否取回。
 */
export function unplaceOrder(state, slot) {
  const item = currentItem(state);
  if (!item || item.done || item.type !== 'order' || item.locked[slot] || item.place[slot] < 0) return false;
  item.place[slot] = -1;
  return true;
}

/**
 * 分類題：把一張卡片放進某個類別（已鎖定的卡片不能移動）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} card 卡片的顯示位置。
 * @param {number} bin 類別索引。
 * @param {object} q 題目。
 * @returns {boolean} 是否放入。
 */
export function placeSort(state, card, bin, q) {
  const item = currentItem(state);
  if (!item || item.done || item.type !== 'sort' || item.locked[card] || card < 0 || card >= item.order.length) return false;
  if (!Number.isInteger(bin) || bin < 0 || bin >= q.bins.length) return false;
  item.place[card] = bin;
  item.lastWrong = item.lastWrong.filter((c) => c !== card);
  state.touched = true;
  return true;
}

/**
 * 分類題：把卡片從類別取回（已鎖定的不能取回）。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {number} card 卡片的顯示位置。
 * @returns {boolean} 是否取回。
 */
export function unplaceSort(state, card) {
  const item = currentItem(state);
  if (!item || item.done || item.type !== 'sort' || item.locked[card] || item.place[card] < 0) return false;
  item.place[card] = -1;
  return true;
}

/**
 * 排序題與分類題是否都放好了，可以檢查。
 * @param {object} item 作答紀錄。
 * @returns {boolean} 可以檢查時為 true。
 */
export function canCheck(item) {
  return !!item && !item.done && item.type !== 'choice' && item.place.every((p) => p >= 0);
}

/**
 * 檢查排序題或分類題：答對的鎖定，答錯的退回；有錯時錯誤次數只 ＋1。
 * @param {object} state 遊戲狀態（會被修改）。
 * @param {object} q 題目。
 * @returns {{result: 'correct' | 'wrong' | 'ignored', wrong?: number[], newKey?: boolean}} 結果；wrong 為答錯的格子（排序）或卡片（分類）顯示位置。
 */
export function check(state, q) {
  const item = currentItem(state);
  if (!canCheck(item)) return { result: 'ignored' };
  state.touched = true;
  const wrong = [];
  item.place.forEach((p, i) => {
    // 排序題：第 i 格放的項目，在資料中的索引必須是 i；分類題：第 i 張卡放的類別必須是它的 bin。
    const ok = item.type === 'order' ? item.order[p] === i : q.cards[item.order[i]].bin === p;
    if (ok) item.locked[i] = true;
    else wrong.push(i);
  });
  if (!wrong.length) {
    item.done = true;
    item.lastWrong = [];
    return { result: 'correct' };
  }
  for (const i of wrong) item.place[i] = -1;
  item.lastWrong = wrong;
  const newKey = addMistake(state, item);
  return { result: 'wrong', wrong, newKey };
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
 * @returns {{clean: boolean, wrong: number, hint: boolean}} clean：沒答錯且沒主動看解題重點；wrong：答錯次數；hint：是否主動看過解題重點。
 */
export function itemResult(item) {
  return { clean: item.done && item.mistakes === 0 && !item.hintUsed, wrong: item.mistakes, hint: item.hintUsed };
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
 * 判斷是否為 0～n-1 的排列。
 * @param {any} order 顯示順序。
 * @param {number} n 個數。
 * @returns {boolean} 是否合法。
 */
function isPermutation(order, n) {
  return Array.isArray(order) && order.length === n && [...Array(n).keys()].every((i) => order.includes(i));
}

/**
 * 驗證一題的作答紀錄與題目是否一致。
 * @param {any} it 作答紀錄。
 * @param {object} q 題目。
 * @param {'before' | 'current' | 'after'} where 相對於目前題號的位置。
 * @returns {boolean} 合法時為 true。
 */
function isValidItem(it, q, where) {
  const n = partCount(q);
  const count = (v) => Number.isInteger(v) && v >= 0;
  if (!it || it.id !== q.id || it.type !== q.type || !isPermutation(it.order, n)) return false;
  if (typeof it.done !== 'boolean' || typeof it.hintUsed !== 'boolean' || !count(it.mistakes) || !count(it.keysShown) || it.keysShown > KEY_COUNT) return false;
  if (!Array.isArray(it.picked) || !Array.isArray(it.place) || !Array.isArray(it.locked) || !Array.isArray(it.lastWrong)) return false;
  if (where === 'before' && !it.done) return false;
  if (where === 'after' && (it.done || it.mistakes || it.keysShown || it.hintUsed || it.picked.length || it.place.some((p) => p >= 0))) return false;
  if (q.type === 'choice') {
    if (new Set(it.picked).size !== it.picked.length || it.picked.some((p) => !Number.isInteger(p) || p < 0 || p >= n)) return false;
    const right = it.order.indexOf(q.answer);
    // 答對的選項必定是最後一個選的，且與 done 一致；答錯次數等於選錯的個數。
    if (it.picked.includes(right) !== it.done || (it.done && it.picked[it.picked.length - 1] !== right)) return false;
    return it.mistakes === it.picked.length - (it.done ? 1 : 0);
  }
  if (it.place.length !== n || it.locked.length !== n) return false;
  const max = q.type === 'order' ? n : q.bins.length;
  if (it.place.some((p) => !Number.isInteger(p) || p < -1 || p >= max)) return false;
  if (q.type === 'order' && new Set(it.place.filter((p) => p >= 0)).size !== it.place.filter((p) => p >= 0).length) return false;
  // 鎖定的位置必定已放好；完成的題目全部鎖定。
  if (it.locked.some((l, i) => l && it.place[i] < 0)) return false;
  return !it.done || it.locked.every(Boolean);
}

/**
 * 驗證存檔；版本不符、資料不完整或彼此矛盾時視為損毀。
 * @param {any} data 存檔內容。
 * @param {(id: string) => object | null} lookup 由題目 id 取得題目（題庫已刪除時為 null）。
 * @returns {boolean} 合法時為 true。
 */
export function isValidSave(data, lookup) {
  if (!data || typeof data !== 'object' || data.v !== SAVE_VERSION || !DIFFICULTIES[data.difficulty] || !MODES.includes(data.mode)) return false;
  if ((data.mode === 'preview' || data.mode === 'practice') !== (typeof data.unit === 'string')) return false;
  if (data.hintLimit !== DIFFICULTIES[data.difficulty].hints + (data.mode === 'preview' ? PREVIEW_BONUS_HINTS : 0)) return false;
  const { items } = data;
  if (!Array.isArray(items) || items.length === 0 || items.length > ROUND_SIZE) return false;
  if (!Number.isInteger(data.index) || data.index < 0 || data.index >= items.length) return false;
  const count = (v) => Number.isInteger(v) && v >= 0;
  if (!count(data.mistakes) || !count(data.hintsUsed) || data.hintsUsed > data.hintLimit) return false;
  if (!Number.isFinite(data.elapsedMs) || data.elapsedMs < 0 || data.completed) return false;
  let mistakes = 0;
  for (let i = 0; i < items.length; i++) {
    const q = items[i] && lookup(items[i].id);
    if (!q) return false;
    if (!isValidItem(items[i], q, i < data.index ? 'before' : i === data.index ? 'current' : 'after')) return false;
    mistakes += items[i].mistakes;
  }
  return mistakes === data.mistakes;
}
