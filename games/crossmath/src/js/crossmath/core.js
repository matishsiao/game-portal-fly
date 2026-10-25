// 共用核心：算式計算、盤面骨架解析、題目驗證、雜湊與亂數工具。
//
// 盤面骨架（layout）為長度 size × size 的字串，每個字元代表一格：
//   '.' 空白區域   '#' 數字格   '+' '-' 'x' '/' 運算子   '=' 等號
// 數字值以長度 size × size 的陣列保存，非數字格為 0。

/** 運算子字元。 */
export const OPERATORS = ['+', '-', 'x', '/'];

/** 運算子在畫面上的符號。 */
export const OP_SYMBOL = { '+': '+', '-': '−', x: '×', '/': '÷', '=': '=' };

/** 支援的盤面邊長。 */
export const SIZES = [7, 9, 11];

/** 數字格數值上限。 */
export const MAX_VALUE = 99;

/**
 * 依運算順序計算算式左側：先乘除、後加減，同級由左至右。
 * 除法不整除、除數為 0 或計算過程出現負數時視為不合法。
 * @param {number[]} nums 運算元（只讀取前 ops.length + 1 個，其後的元素忽略）。
 * @param {string[]} ops 運算子字元。
 * @returns {number | null} 計算結果，不合法時為 null。
 */
export function evaluate(nums, ops) {
  const terms = [nums[0]];
  const addOps = [];
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    const n = nums[k + 1];
    const last = terms.length - 1;
    if (op === 'x') {
      terms[last] *= n;
    } else if (op === '/') {
      if (n === 0 || terms[last] % n !== 0) return null;
      terms[last] /= n;
    } else {
      addOps.push(op);
      terms.push(n);
    }
  }
  let acc = terms[0];
  for (let k = 0; k < addOps.length; k++) {
    acc = addOps[k] === '+' ? acc + terms[k + 1] : acc - terms[k + 1];
    if (acc < 0) return null;
  }
  return acc;
}

/**
 * 判斷一組完整數值是否讓算式成立。
 * @param {{ops: string[]}} eq 算式。
 * @param {number[]} nums 依序的數字（最後一個為等號右側）。
 * @returns {boolean} 成立時為 true。
 */
export function equationHolds(eq, nums) {
  // evaluate 只讀取前 ops.length + 1 個數字，不需要另外切出左側。
  return evaluate(nums, eq.ops) === nums[nums.length - 1];
}

/**
 * 從一段連續格子的字元判斷是否為合法算式（A ○ B [○ C] = D）。
 * @param {string[]} chars 連續格子的字元。
 * @returns {string[] | null} 合法時回傳運算子清單，否則為 null。
 */
function parseRun(chars) {
  const len = chars.length;
  if (len !== 5 && len !== 7) return null;
  const ops = [];
  for (let k = 0; k < len; k++) {
    const ch = chars[k];
    if (k % 2 === 0) {
      if (ch !== '#') return null;
    } else if (k === len - 2) {
      if (ch !== '=') return null;
    } else {
      if (!OPERATORS.includes(ch)) return null;
      ops.push(ch);
    }
  }
  return ops;
}

/** 解析結果快取（以骨架字串為鍵）。 */
const parseCache = new Map();

/**
 * 解析盤面骨架，找出所有算式並驗證排版規則：
 * 任何長度 2 以上的連續非空白格子都必須恰好是一條合法算式、運算子與等號只屬於一條算式、
 * 每個數字格至少屬於一條算式，且所有算式彼此連通。
 * @param {number} size 盤面邊長。
 * @param {string} layout 盤面骨架字串。
 * @returns {{size: number, layout: string, equations: {dir: 'h' | 'v', cells: number[], nums: number[], ops: string[]}[], numberCells: number[], cellEquations: number[][]} | null}
 *   解析結果；排版不合法時為 null。
 */
export function parseLayout(size, layout) {
  const key = `${size}:${layout}`;
  if (parseCache.has(key)) return parseCache.get(key);
  const result = parseUncached(size, layout);
  if (parseCache.size > 64) parseCache.clear();
  parseCache.set(key, result);
  return result;
}

/**
 * 實際執行骨架解析（不使用快取）。
 * @param {number} size 盤面邊長。
 * @param {string} layout 盤面骨架字串。
 * @returns {object | null} 同 parseLayout。
 */
function parseUncached(size, layout) {
  if (!SIZES.includes(size) || typeof layout !== 'string' || layout.length !== size * size) return null;
  if (!/^[.#+\-x/=]+$/.test(layout)) return null;
  const equations = [];
  const owners = new Array(size * size).fill(0);
  for (const dir of ['h', 'v']) {
    for (let line = 0; line < size; line++) {
      let run = [];
      for (let k = 0; k <= size; k++) {
        const idx = k < size ? (dir === 'h' ? line * size + k : k * size + line) : -1;
        if (idx >= 0 && layout[idx] !== '.') {
          run.push(idx);
          continue;
        }
        if (run.length >= 2) {
          const ops = parseRun(run.map((i) => layout[i]));
          if (!ops) return null;
          equations.push({ dir, cells: run, nums: run.filter((_, j) => j % 2 === 0), ops });
          for (const i of run) owners[i]++;
        }
        run = [];
      }
    }
  }
  if (!equations.length) return null;
  const numberCells = [];
  const cellEquations = Array.from({ length: size * size }, () => []);
  equations.forEach((eq, e) => {
    for (const i of eq.nums) cellEquations[i].push(e);
  });
  for (let i = 0; i < size * size; i++) {
    const ch = layout[i];
    if (ch === '.') continue;
    if (ch === '#') {
      if (owners[i] === 0) return null;
      numberCells.push(i);
    } else if (owners[i] !== 1) {
      return null;
    }
  }
  // 連通性：從第一條算式經由共用數字格走訪全部算式。
  const seen = new Set([0]);
  const queue = [0];
  while (queue.length) {
    const e = queue.shift();
    for (const i of equations[e].nums) {
      for (const other of cellEquations[i]) {
        if (!seen.has(other)) {
          seen.add(other);
          queue.push(other);
        }
      }
    }
  }
  if (seen.size !== equations.length) return null;
  return { size, layout, equations, numberCells, cellEquations };
}

/**
 * 驗證完整題目資料：骨架合法、解答使所有算式成立、數值範圍正確、給定數字與解答一致且至少有一個空格。
 * @param {any} p 題目資料 {size, layout, givens, solution}。
 * @returns {boolean} 合法時為 true。
 */
export function isValidPuzzle(p) {
  if (!p || typeof p !== 'object') return false;
  const ctx = parseLayout(p.size, p.layout);
  if (!ctx) return false;
  const n = p.size * p.size;
  const intArray = (a) => Array.isArray(a) && a.length === n && a.every((v) => Number.isInteger(v) && v >= 0 && v <= MAX_VALUE);
  if (!intArray(p.givens) || !intArray(p.solution)) return false;
  let blanks = 0;
  for (let i = 0; i < n; i++) {
    if (p.layout[i] === '#') {
      if (p.solution[i] < 1) return false;
      if (p.givens[i] === 0) blanks++;
      else if (p.givens[i] !== p.solution[i]) return false;
    } else if (p.solution[i] !== 0 || p.givens[i] !== 0) {
      return false;
    }
  }
  if (blanks === 0) return false;
  return ctx.equations.every((eq) => equationHolds(eq, eq.nums.map((i) => p.solution[i])));
}

/**
 * 計算數字庫：所有空格解答數值的數量。
 * @param {{layout: string, givens: number[], solution: number[]}} p 題目資料。
 * @returns {number[]} 長度 MAX_VALUE + 1，索引為數值、內容為數量。
 */
export function bankCounts(p) {
  const counts = new Array(MAX_VALUE + 1).fill(0);
  for (let i = 0; i < p.layout.length; i++) {
    if (p.layout[i] === '#' && p.givens[i] === 0) counts[p.solution[i]]++;
  }
  return counts;
}

/**
 * 計算題目雜湊（FNV-1a 32 位元），用於避免重複出題。
 * @param {{size: number, layout: string, givens: number[]}} p 題目資料。
 * @returns {string} 8 位十六進位字串。
 */
export function hashPuzzle(p) {
  const text = `${p.size}|${p.layout}|${p.givens.join(',')}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * 原地打亂陣列（Fisher–Yates）。
 * @template T
 * @param {T[]} arr 要打亂的陣列。
 * @param {() => number} rng 回傳 [0, 1) 的亂數函式。
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
