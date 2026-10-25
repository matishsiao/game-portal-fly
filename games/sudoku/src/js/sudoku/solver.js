// 回溯解題器：計算解答數量（驗證唯一解）與產生隨機完整盤面。

import { ALL, ROW_OF, COL_OF, BOX_OF, POPCOUNT, DIGITS, shuffle } from './core.js';

/**
 * 建立回溯搜尋用的狀態；盤面本身有衝突時回傳 null。
 * @param {ArrayLike<number>} grid 長度 81 的數字陣列，0 為空格。
 * @returns {{g: number[], rows: Int32Array, cols: Int32Array, boxes: Int32Array} | null} 搜尋狀態。
 */
function createSearch(grid) {
  const g = Array.from(grid);
  const rows = new Int32Array(9);
  const cols = new Int32Array(9);
  const boxes = new Int32Array(9);
  for (let i = 0; i < 81; i++) {
    const d = g[i];
    if (!d) continue;
    const b = 1 << (d - 1);
    if ((rows[ROW_OF[i]] | cols[COL_OF[i]] | boxes[BOX_OF[i]]) & b) return null;
    rows[ROW_OF[i]] |= b;
    cols[COL_OF[i]] |= b;
    boxes[BOX_OF[i]] |= b;
  }
  return { g, rows, cols, boxes };
}

/**
 * 以最少候選數優先的回溯搜尋走訪解答。
 * @param {ReturnType<typeof createSearch>} s 搜尋狀態（會在搜尋中暫時修改）。
 * @param {(g: number[]) => boolean} onSolution 找到解答時呼叫；回傳 true 表示停止搜尋。
 * @param {(() => number) | null} rng 提供時以亂數順序嘗試數字。
 * @returns {boolean} 是否因 onSolution 要求而停止。
 */
function search(s, onSolution, rng) {
  const { g, rows, cols, boxes } = s;
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (g[i]) continue;
    const m = ALL & ~(rows[ROW_OF[i]] | cols[COL_OF[i]] | boxes[BOX_OF[i]]);
    const n = POPCOUNT[m];
    if (n === 0) return false;
    if (n < bestCount) {
      best = i;
      bestMask = m;
      bestCount = n;
      if (n === 1) break;
    }
  }
  if (best === -1) return onSolution(g);
  const r = ROW_OF[best];
  const c = COL_OF[best];
  const bx = BOX_OF[best];
  const digits = rng ? shuffle(DIGITS[bestMask].slice(), rng) : DIGITS[bestMask];
  for (const d of digits) {
    const b = 1 << (d - 1);
    g[best] = d;
    rows[r] |= b;
    cols[c] |= b;
    boxes[bx] |= b;
    if (search(s, onSolution, rng)) return true;
    rows[r] &= ~b;
    cols[c] &= ~b;
    boxes[bx] &= ~b;
  }
  g[best] = 0;
  return false;
}

/**
 * 計算盤面解答數量，達到上限即停止。
 * @param {ArrayLike<number>} grid 長度 81 的數字陣列，0 為空格。
 * @param {number} [limit=2] 計數上限；驗證唯一解時用 2。
 * @returns {number} 解答數量（不超過 limit）。
 */
export function countSolutions(grid, limit = 2) {
  const s = createSearch(grid);
  if (!s) return 0;
  let count = 0;
  search(s, () => ++count >= limit, null);
  return count;
}

/**
 * 解出盤面的第一組解答。
 * @param {ArrayLike<number>} grid 長度 81 的數字陣列，0 為空格。
 * @returns {number[] | null} 解答，無解時為 null。
 */
export function solve(grid) {
  const s = createSearch(grid);
  if (!s) return null;
  let result = null;
  search(s, (g) => {
    result = g.slice();
    return true;
  }, null);
  return result;
}

/**
 * 產生隨機的完整合法盤面。
 * @param {() => number} rng 回傳 [0, 1) 的亂數函式。
 * @returns {number[]} 長度 81 的完整解答。
 */
export function generateSolution(rng) {
  const s = createSearch(new Array(81).fill(0));
  let result = null;
  search(s, (g) => {
    result = g.slice();
    return true;
  }, rng);
  return result;
}
