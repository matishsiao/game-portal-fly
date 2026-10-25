// 共用核心：盤面相鄰關係、題目與路徑驗證、雜湊與亂數工具。
//
// 題目資料：
//   size      盤面邊長 N（4～10），格子索引 i = 列 × N + 行
//   ends      每對端點 [a, b]（索引為編號 − 1）
//   solution  每對端點的解答路徑（由 a 走到 b 的格子序列）

/** 支援的盤面邊長範圍。 */
export const MIN_SIZE = 4;
export const MAX_SIZE = 10;

/** 相鄰表快取（以邊長為鍵）。 */
const neighborCache = new Map();

/**
 * 取得每個格子上下左右相鄰的格子。
 * @param {number} size 盤面邊長。
 * @returns {number[][]} 索引為格子、內容為相鄰格子清單。
 */
export function neighbors(size) {
  if (neighborCache.has(size)) return neighborCache.get(size);
  const out = [];
  for (let i = 0; i < size * size; i++) {
    const r = Math.floor(i / size);
    const c = i % size;
    const list = [];
    if (r > 0) list.push(i - size);
    if (c < size - 1) list.push(i + 1);
    if (r < size - 1) list.push(i + size);
    if (c > 0) list.push(i - 1);
    out.push(list);
  }
  neighborCache.set(size, out);
  return out;
}

/**
 * 判斷兩格是否上下左右相鄰。
 * @param {number} size 盤面邊長。
 * @param {number} a 格子索引。
 * @param {number} b 格子索引。
 * @returns {boolean} 相鄰時為 true。
 */
export function isAdjacent(size, a, b) {
  const ra = Math.floor(a / size);
  const rb = Math.floor(b / size);
  return (ra === rb && Math.abs(a - b) === 1) || (Math.abs(a - b) === size && a % size === b % size);
}

/**
 * 判斷格子序列是否為一條合法路徑：每一步相鄰且不重複。
 * @param {number} size 盤面邊長。
 * @param {number[]} path 格子序列。
 * @returns {boolean} 合法時為 true。
 */
export function isPath(size, path) {
  if (!Array.isArray(path) || !path.length) return false;
  const seen = new Set();
  for (let k = 0; k < path.length; k++) {
    const i = path[k];
    if (!Number.isInteger(i) || i < 0 || i >= size * size || seen.has(i)) return false;
    seen.add(i);
    if (k > 0 && !isAdjacent(size, path[k - 1], i)) return false;
  }
  return true;
}

/**
 * 判斷一組路徑是否為完整解答：每條路徑連接對應的兩端點、互不重疊且填滿全部格子。
 * @param {number} size 盤面邊長。
 * @param {number[][]} ends 每對端點。
 * @param {number[][]} paths 每對端點的路徑（方向不限）。
 * @returns {boolean} 為完整解答時為 true。
 */
export function isSolved(size, ends, paths) {
  if (!Array.isArray(paths) || paths.length !== ends.length) return false;
  const used = new Set();
  for (let k = 0; k < ends.length; k++) {
    const p = paths[k];
    if (!isPath(size, p) || p.length < 2) return false;
    const [a, b] = ends[k];
    const ok = (p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a);
    if (!ok) return false;
    for (const i of p) {
      if (used.has(i)) return false;
      used.add(i);
    }
  }
  return used.size === size * size;
}

/**
 * 驗證完整題目資料：邊長、端點不重複、解答合法且填滿盤面。
 * @param {any} p 題目資料 {size, ends, solution}。
 * @returns {boolean} 合法時為 true。
 */
export function isValidPuzzle(p) {
  if (!p || typeof p !== 'object') return false;
  const { size, ends, solution } = p;
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) return false;
  if (!Array.isArray(ends) || ends.length < 2) return false;
  const seen = new Set();
  for (const pair of ends) {
    if (!Array.isArray(pair) || pair.length !== 2) return false;
    for (const i of pair) {
      if (!Number.isInteger(i) || i < 0 || i >= size * size || seen.has(i)) return false;
      seen.add(i);
    }
  }
  return isSolved(size, ends, solution);
}

/**
 * 計算題目雜湊（FNV-1a 32 位元），用於避免重複出題。
 * @param {{size: number, ends: number[][]}} p 題目資料。
 * @returns {string} 8 位十六進位字串。
 */
export function hashPuzzle(p) {
  const text = `${p.size}|${p.ends.map((e) => e.join('-')).join(',')}`;
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
