// 出題器：
//   初級、中級  逐題模式：每題一個成語（1 × 4 盤面），挖空並組成字庫，以解題器確認沒有一題多解。
//   高級、專家  交叉填字盤：成語交叉擺放 → 挖空（維持不需猜測即可解出）→ 驗證唯一解。
// 出題時優先選玩家尚未完成過的成語，其次為待複習與較久未出現的成語。

import { answersOf, wordCells } from './board.js';
import { propagate, countSolutions, crossOnlyCells } from './solver.js';

/**
 * 難度設定（label 為遊戲內名稱；大廳以共用難度代碼顯示）。
 * single：questions 題數、blanksPer 每題空格數、bankSize 每題字庫字數、showMeaning 作答前顯示釋義。
 * cross：size 盤面長邊上限、short 短邊上限（手機直向時盤面寬於高，字格才夠大）、words 成語數範圍、blanks 空格比例範圍、minLevel3 常見度 3 的最低比例、crossOnly 須有只能經由交叉推出的空格。
 */
export const DIFFICULTIES = {
  easy: { label: '初級', hints: 5, mode: 'single', levels: [1], questions: 10, blanksPer: 1, bankSize: 6, showMeaning: false },
  medium: { label: '中級', hints: 4, mode: 'single', levels: [1, 2], questions: 8, blanksPer: 2, bankSize: 8, showMeaning: true },
  hard: { label: '高級', hints: 3, mode: 'cross', levels: [1, 2], size: 9, short: 8, words: [3, 6], blanks: [0.4, 0.55], minLevel3: 0, crossOnly: false },
  expert: { label: '專家', hints: 2, mode: 'cross', levels: [2, 3], size: 10, short: 8, words: [6, 9], blanks: [0.55, 0.7], minLevel3: 0.5, crossOnly: true },
};

/** 難度代碼依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/**
 * 原地打亂陣列（Fisher–Yates）。
 * @template T
 * @param {T[]} arr 陣列。
 * @param {() => number} rng 亂數函式。
 * @returns {T[]} 同一個陣列。
 */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 建立可重現的亂數產生器（mulberry32），供測試使用。
 * @param {number} seed 種子。
 * @returns {() => number} 回傳 [0, 1) 的亂數函式。
 */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 依出題優先順序排列成語：未完成過 → 待複習 → 較久未出現；同一層內隨機。
 * @param {{id: string}[]} pool 成語。
 * @param {{seen?: Record<string, number>, review?: string[]}} priority 成語本摘要（seen：最後出現的序號）。
 * @param {() => number} rng 亂數函式。
 * @returns {{id: string}[]} 排序後的新陣列。
 */
export function rankPool(pool, priority, rng) {
  const seen = (priority && priority.seen) || {};
  const review = new Set((priority && priority.review) || []);
  const keyed = pool.map((i) => {
    const tier = !(i.id in seen) ? 0 : review.has(i.id) ? 1 : 2;
    // 第 3 層依最後出現的序號由舊到新，加上少量亂數讓順序不固定。
    const order = tier === 2 ? seen[i.id] + rng() * 5 : rng();
    return { i, tier, order };
  });
  keyed.sort((a, b) => a.tier - b.tier || a.order - b.order);
  return keyed.map((k) => k.i);
}

/**
 * 計算題目雜湊（FNV-1a 32 位元）：本局所有成語 id 與空格位置。
 * @param {object[]} boards 盤面。
 * @returns {string} 8 位十六進位字串。
 */
export function hashBoards(boards) {
  const text = boards.map((b) => `${b.words.map((w) => `${w.id}@${w.dir}${w.r},${w.c}`).join(';')}|${b.blanks.join(',')}`).join('/');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * 產生逐題模式的一題：決定空格位置，從易混淆字與其他成語同位置的字挑干擾字，確認沒有一題多解。
 * @param {{id: string, text: string}} idiom 成語。
 * @param {object} cfg 難度設定。
 * @param {object} index 詞庫索引。
 * @param {{id: string, text: string}[]} pool 同難度的成語（干擾字來源）。
 * @param {number[] | null} avoid 不要使用的空格位置組合（避免與前面題目完全相同時使用）。
 * @param {() => number} rng 亂數函式。
 * @returns {object | null} 盤面，失敗時為 null。
 */
function makeQuestion(idiom, cfg, index, pool, avoid, rng) {
  const chars = Array.from(idiom.text);
  const conf = index.confusables(idiom.id);
  for (let attempt = 0; attempt < 6; attempt++) {
    const blanks = shuffle([0, 1, 2, 3], rng).slice(0, cfg.blanksPer).sort((a, b) => a - b);
    if (avoid && avoid.join() === blanks.join()) continue;
    const answers = blanks.map((p) => chars[p]);
    const board = { rows: 1, cols: 4, words: [{ id: idiom.id, dir: 'h', r: 0, c: 0 }], blanks, bank: answers.slice() };
    const solution = chars.slice();
    // 干擾字來源：易混淆字優先，再來是其他成語同位置的字，最後是其他成語的任意字。
    const sources = [];
    for (const p of blanks) sources.push(...shuffle((conf[chars[p]] || []).slice(), rng));
    const others = shuffle(pool.slice(), rng).slice(0, 80);
    for (const p of blanks) for (const o of others) sources.push(Array.from(o.text)[p]);
    for (const o of others) sources.push(...Array.from(o.text));
    for (const d of sources) {
      if (board.bank.length >= cfg.bankSize) break;
      if (!/^[㐀-鿿]$/.test(d) || board.bank.includes(d)) continue;
      board.bank.push(d);
      if (countSolutions(board, solution, index, 2) !== 1) board.bank.pop();
    }
    if (board.bank.length === cfg.bankSize) {
      shuffle(board.bank, rng);
      return board;
    }
  }
  return null;
}

/**
 * 產生逐題模式的一局。
 * @param {object} cfg 難度設定。
 * @param {object} index 詞庫索引。
 * @param {object} priority 成語本摘要。
 * @param {() => number} rng 亂數函式。
 * @returns {object[]} 每題的盤面。
 * @throws {Error} 成語不足時。
 */
function generateSingle(cfg, index, priority, rng) {
  const pool = index.idioms.filter((i) => cfg.levels.includes(index.level(i.id)));
  const ranked = rankPool(pool, priority, rng);
  const boards = [];
  for (const idiom of ranked) {
    if (boards.length >= cfg.questions) break;
    // 避免整局的空格都在同一個位置：最後一題若會造成全部相同，就換位置。
    const same = boards.length === cfg.questions - 1 && boards.every((b) => b.blanks.join() === boards[0].blanks.join());
    const q = makeQuestion(idiom, cfg, index, pool, same ? boards[0].blanks : null, rng);
    if (q) boards.push(q);
  }
  if (boards.length < cfg.questions) throw new Error('可用成語不足');
  return boards;
}

/**
 * 判斷成語能否放在盤面上：在範圍內、與既有字相容，且不會與其他成語相鄰拼出多餘的連續字格。
 * @param {Map<string, string>} grid 已放的字（鍵為 "r,c"）。
 * @param {Map<string, string>} dirs 每格已被哪些方向的成語使用（"h"、"v"、"hv"）。
 * @param {string[]} chars 成語的字。
 * @param {string} dir 方向。
 * @param {number} r 起點列。
 * @param {number} c 起點行。
 * @param {number} size 盤面長邊上限。
 * @param {number} short 盤面短邊上限。
 * @param {{minR: number, maxR: number, minC: number, maxC: number}} box 目前的外框。
 * @returns {boolean} 可放置時為 true。
 */
function canPlace(grid, dirs, chars, dir, r, c, size, short, box) {
  const dr = dir === 'v' ? 1 : 0;
  const dc = dir === 'h' ? 1 : 0;
  const nr0 = Math.min(box.minR, r);
  const nr1 = Math.max(box.maxR, r + dr * 3);
  const nc0 = Math.min(box.minC, c);
  const nc1 = Math.max(box.maxC, c + dc * 3);
  const h = nr1 - nr0 + 1;
  const w = nc1 - nc0 + 1;
  if (Math.max(h, w) > size || Math.min(h, w) > short) return false;
  const key = (rr, cc) => `${rr},${cc}`;
  if (grid.has(key(r - dr, c - dc)) || grid.has(key(r + dr * 4, c + dc * 4))) return false;
  let crossings = 0;
  for (let k = 0; k < 4; k++) {
    const rr = r + dr * k;
    const cc = c + dc * k;
    const existing = grid.get(key(rr, cc));
    if (existing !== undefined) {
      if (existing !== chars[k] || (dirs.get(key(rr, cc)) || '').includes(dir)) return false;
      crossings++;
      continue;
    }
    // 新格的兩側（垂直於方向）不得有字，否則會拼出多餘的連續字格。
    if (grid.has(key(rr + dc, cc + dr)) || grid.has(key(rr - dc, cc - dr))) return false;
  }
  return crossings > 0 || grid.size === 0;
}

/**
 * 產生交叉填字盤的擺放：從一個成語開始，反覆找出與既有字相同的字，垂直交叉放上新成語。
 * @param {object} cfg 難度設定。
 * @param {object} index 詞庫索引。
 * @param {object[]} ranked 依優先順序排列的成語。
 * @param {() => number} rng 亂數函式。
 * @returns {object | null} 盤面（尚未挖空），失敗時為 null。
 */
function layout(cfg, index, ranked, rng) {
  const target = cfg.words[0] + Math.floor(rng() * (cfg.words[1] - cfg.words[0] + 1));
  const grid = new Map();
  const dirs = new Map();
  const words = [];
  const used = new Set();
  const box = { minR: 0, maxR: 0, minC: 0, maxC: 0 };
  // 依字建立候選索引（只取優先順序前段，讓未完成過的成語較常出現）。
  const head = ranked.slice(0, Math.max(300, Math.floor(ranked.length * 0.6)));
  const byChar = new Map();
  for (const i of head) for (const [k, ch] of Array.from(i.text).entries()) {
    if (!byChar.has(ch)) byChar.set(ch, []);
    byChar.get(ch).push({ i, k });
  }
  /**
   * 放上成語並更新外框。
   * @param {{id: string, text: string}} idiom 成語。
   * @param {string} dir 方向。
   * @param {number} r 起點列。
   * @param {number} c 起點行。
   */
  const place = (idiom, dir, r, c) => {
    const chars = Array.from(idiom.text);
    for (let k = 0; k < 4; k++) {
      const rr = dir === 'v' ? r + k : r;
      const cc = dir === 'h' ? c + k : c;
      grid.set(`${rr},${cc}`, chars[k]);
      dirs.set(`${rr},${cc}`, (dirs.get(`${rr},${cc}`) || '') + dir);
      box.minR = Math.min(box.minR, rr);
      box.maxR = Math.max(box.maxR, rr);
      box.minC = Math.min(box.minC, cc);
      box.maxC = Math.max(box.maxC, cc);
    }
    words.push({ id: idiom.id, dir, r, c, level: index.level(idiom.id) });
    used.add(idiom.id);
  };
  place(head[Math.floor(rng() * Math.min(20, head.length))], rng() < 0.5 ? 'h' : 'v', 0, 0);
  box.maxR = words[0].dir === 'v' ? 3 : 0;
  box.maxC = words[0].dir === 'h' ? 3 : 0;
  for (let tries = 0; words.length < target && tries < 300; tries++) {
    const base = words[Math.floor(rng() * words.length)];
    const k = Math.floor(rng() * 4);
    const r0 = base.dir === 'v' ? base.r + k : base.r;
    const c0 = base.dir === 'h' ? base.c + k : base.c;
    const ch = grid.get(`${r0},${c0}`);
    if ((dirs.get(`${r0},${c0}`) || '').length > 1) continue;
    const dir = base.dir === 'h' ? 'v' : 'h';
    const options = (byChar.get(ch) || []).filter((o) => !used.has(o.i.id));
    if (!options.length) continue;
    // 專家須有足夠的常見度 3：尚未達到比例時優先嘗試常見度 3 的成語。
    const needHard = cfg.minLevel3 > 0 && words.filter((w) => w.level === 3).length < Math.ceil(target * cfg.minLevel3);
    const sorted = shuffle(options.slice(), rng).sort((a, b) => (needHard ? (index.level(b.i.id) === 3) - (index.level(a.i.id) === 3) : 0));
    for (const o of sorted.slice(0, 40)) {
      const r = dir === 'v' ? r0 - o.k : r0;
      const c = dir === 'h' ? c0 - o.k : c0;
      if (canPlace(grid, dirs, Array.from(o.i.text), dir, r, c, cfg.size, cfg.short, box)) {
        place(o.i, dir, r, c);
        break;
      }
    }
  }
  if (words.length < cfg.words[0]) return null;
  if (words.filter((w) => w.level === 3).length < Math.ceil(words.length * cfg.minLevel3)) return null;
  const rows = box.maxR - box.minR + 1;
  const cols = box.maxC - box.minC + 1;
  const placed = words.map((w) => ({ id: w.id, dir: w.dir, r: w.r - box.minR, c: w.c - box.minC }));
  // 直長的盤面轉置為橫寬（橫、直互換後閱讀方向仍是由左至右、由上至下），讓手機直向時字格較大。
  if (rows > cols) {
    return { rows: cols, cols: rows, words: placed.map((w) => ({ id: w.id, dir: w.dir === 'h' ? 'v' : 'h', r: w.c, c: w.r })), blanks: [], bank: [] };
  }
  return { rows, cols, words: placed, blanks: [], bank: [] };
}

/**
 * 交叉盤挖空：依隨機順序挖空字格，每次都確認仍可不經猜測解出，達到目標比例即停止。
 * @param {object} board 盤面（會被修改）。
 * @param {string[]} answers 每格正確字。
 * @param {object} cfg 難度設定。
 * @param {object} index 詞庫索引。
 * @param {() => number} rng 亂數函式。
 * @returns {boolean} 成功時為 true。
 */
function dig(board, answers, cfg, index, rng) {
  const filled = [];
  answers.forEach((ch, i) => {
    if (ch) filled.push(i);
  });
  const min = Math.ceil(filled.length * cfg.blanks[0]);
  const max = Math.floor(filled.length * cfg.blanks[1]);
  const target = min + Math.floor(rng() * (max - min + 1));
  board.blanks = [];
  board.bank = [];
  for (const cell of shuffle(filled.slice(), rng)) {
    if (board.blanks.length >= target) break;
    board.blanks.push(cell);
    board.bank.push(answers[cell]);
    if (!propagate(board, answers, index).solved) {
      board.blanks.pop();
      board.bank.pop();
    }
  }
  if (board.blanks.length < min) return false;
  board.blanks.sort((a, b) => a - b);
  if (countSolutions(board, answers, index, 2) !== 1) return false;
  if (cfg.crossOnly && !crossOnlyCells(board, answers, index).length) return false;
  shuffle(board.bank, rng);
  return true;
}

/**
 * 產生交叉填字盤。
 * @param {object} cfg 難度設定。
 * @param {object} index 詞庫索引。
 * @param {object} priority 成語本摘要。
 * @param {() => number} rng 亂數函式。
 * @returns {object | null} 盤面，失敗時為 null。
 */
function generateCross(cfg, index, priority, rng) {
  const pool = index.idioms.filter((i) => cfg.levels.includes(index.level(i.id)));
  const ranked = rankPool(pool, priority, rng);
  const board = layout(cfg, index, ranked, rng);
  if (!board) return null;
  const answers = answersOf(board, (id) => index.byId.get(id).text);
  for (let d = 0; d < 4; d++) if (dig(board, answers, cfg, index, rng)) return board;
  return null;
}

/**
 * 產生指定難度的一局。
 * @param {string} difficulty 難度代碼。
 * @param {object} index 詞庫索引。
 * @param {object} [options] 選項。
 * @param {() => number} [options.rng=Math.random] 亂數函式。
 * @param {Iterable<string>} [options.exclude=[]] 不可重複的題目雜湊。
 * @param {{seen?: Record<string, number>, review?: string[]}} [options.priority={}] 成語本摘要。
 * @param {number} [options.maxAttempts=Infinity] 最多嘗試次數。
 * @returns {{difficulty: string, mode: string, boards: object[], hash: string, attempts: number}} 一局的題目。
 * @throws {Error} 難度不存在或超過嘗試次數時。
 */
export function generateGame(difficulty, index, { rng = Math.random, exclude = [], priority = {}, maxAttempts = Infinity } = {}) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`未知的難度：${difficulty}`);
  const excluded = new Set(exclude);
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    let boards;
    if (cfg.mode === 'single') boards = generateSingle(cfg, index, priority, rng);
    else {
      const b = generateCross(cfg, index, priority, rng);
      if (!b) continue;
      boards = [b];
    }
    const hash = hashBoards(boards);
    if (excluded.has(hash)) continue;
    return { difficulty, mode: cfg.mode, boards, hash, attempts };
  }
  throw new Error('超過出題嘗試次數');
}

/**
 * 判斷交叉盤的排版是否合法：每段長度 2 以上的連續字格恰為一個成語、全部連通，且盤面不超過上限。
 * @param {object} board 盤面。
 * @param {number} size 盤面上限。
 * @returns {boolean} 合法時為 true。
 */
export function isValidLayout(board, size) {
  if (board.rows > size || board.cols > size) return false;
  const occupied = new Set();
  const wordSets = board.words.map((w) => wordCells(board, w).join(','));
  for (const w of board.words) for (const cell of wordCells(board, w)) occupied.add(cell);
  const runs = [];
  for (const dir of ['h', 'v']) {
    const lines = dir === 'h' ? board.rows : board.cols;
    const len = dir === 'h' ? board.cols : board.rows;
    for (let line = 0; line < lines; line++) {
      let run = [];
      for (let k = 0; k <= len; k++) {
        const cell = k < len ? (dir === 'h' ? line * board.cols + k : k * board.cols + line) : -1;
        if (cell >= 0 && occupied.has(cell)) run.push(cell);
        else {
          if (run.length >= 2) runs.push(run.join(','));
          run = [];
        }
      }
    }
  }
  if (runs.length !== board.words.length || !runs.every((r) => wordSets.includes(r))) return false;
  // 連通：經由共用格可走遍所有成語。
  const seen = new Set([0]);
  const queue = [0];
  const cellsOf = board.words.map((w) => new Set(wordCells(board, w)));
  while (queue.length) {
    const a = queue.shift();
    board.words.forEach((_, b) => {
      if (!seen.has(b) && [...cellsOf[a]].some((c) => cellsOf[b].has(c))) {
        seen.add(b);
        queue.push(b);
      }
    });
  }
  return seen.size === board.words.length;
}
