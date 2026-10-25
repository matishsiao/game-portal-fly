// 解題器：單條算式列舉與完整回溯解題（計算解答數量以驗證唯一解）。

import { equationHolds, MAX_VALUE } from './core.js';

/** 單條算式列舉的組合數上限；超過時視為無法約束（回傳 null）。 */
export const ENUM_LIMIT = 40000;

/**
 * 列舉一條算式中未知格的所有可能填法。
 * 每個未知格只能使用 domain 給的數值，且同一數值使用次數不得超過數字庫剩餘數量。
 * @param {{nums: number[], ops: string[]}} eq 算式。
 * @param {number[]} values 目前盤面數值（0 為未知）。
 * @param {number[]} counts 數字庫剩餘數量（索引為數值）。
 * @param {(cell: number) => number[]} domain 取得某格可嘗試的數值。
 * @returns {Map<number, Set<number>> | false | null}
 *   每個未知格的可能數值；算式已無法成立時為 false；組合數過多而不列舉時為 null。
 */
export function enumerateEquation(eq, values, counts, domain) {
  const unknown = [];
  const doms = [];
  let product = 1;
  for (const c of eq.nums) {
    if (values[c] === 0) {
      const d = domain(c);
      unknown.push(c);
      doms.push(d);
      product *= d.length;
    }
  }
  if (!unknown.length) return equationHolds(eq, eq.nums.map((c) => values[c])) ? new Map() : false;
  if (product === 0) return false;
  if (product > ENUM_LIMIT) return null;
  const pos = unknown.map((c) => eq.nums.indexOf(c));
  const nums = eq.nums.map((c) => values[c]);
  const found = unknown.map(() => new Set());
  let any = false;
  /**
   * 遞迴填入第 k 個未知格。
   * @param {number} k 未知格序號。
   */
  const walk = (k) => {
    if (k === unknown.length) {
      if (equationHolds(eq, nums)) {
        any = true;
        for (let j = 0; j < unknown.length; j++) found[j].add(nums[pos[j]]);
      }
      return;
    }
    for (const v of doms[k]) {
      if (counts[v] <= 0) continue;
      counts[v]--;
      nums[pos[k]] = v;
      walk(k + 1);
      counts[v]++;
    }
  };
  walk(0);
  if (!any) return false;
  const out = new Map();
  unknown.forEach((c, j) => out.set(c, found[j]));
  return out;
}

/**
 * 取得數字庫中仍有剩餘的數值。
 * @param {number[]} counts 數字庫剩餘數量。
 * @returns {number[]} 由小到大的數值清單。
 */
export function availableValues(counts) {
  const out = [];
  for (let v = 1; v <= MAX_VALUE; v++) if (counts[v] > 0) out.push(v);
  return out;
}

/**
 * 以回溯法計算解答數量（把數字庫分配到所有空格，使所有算式成立），找到 limit 組即停止。
 * @param {{equations: object[], numberCells: number[], cellEquations: number[][]}} ctx 骨架解析結果。
 * @param {number[]} givens 題目數值（0 為空格）。
 * @param {number[]} bank 數字庫數量。
 * @param {number} [limit=2] 最多計算幾組。
 * @returns {number} 解答數量（最多 limit）。
 */
export function countSolutions(ctx, givens, bank, limit = 2) {
  const values = givens.slice();
  const counts = bank.slice();
  let found = 0;
  /** 遞迴搜尋：每層選擇候選最少的空格。 */
  const search = () => {
    const pool = availableValues(counts);
    /**
     * 數字庫中所有剩餘數值皆可嘗試。
     * @returns {number[]} 數值清單。
     */
    const domain = () => pool;
    const options = [];
    for (const eq of ctx.equations) {
      const r = enumerateEquation(eq, values, counts, domain);
      if (r === false) return;
      options.push(r);
    }
    let best = -1;
    let bestCand = null;
    for (const c of ctx.numberCells) {
      if (values[c] !== 0) continue;
      let cand = null;
      for (const e of ctx.cellEquations[c]) {
        const r = options[e];
        if (!r) continue;
        const s = r.get(c);
        cand = cand ? cand.filter((v) => s.has(v)) : Array.from(s);
      }
      if (!cand) cand = pool;
      if (!cand.length) return;
      if (!bestCand || cand.length < bestCand.length) {
        best = c;
        bestCand = cand;
        if (cand.length === 1) break;
      }
    }
    if (best < 0) {
      found++;
      return;
    }
    for (const v of bestCand) {
      if (counts[v] <= 0) continue;
      values[best] = v;
      counts[v]--;
      search();
      counts[v]++;
      values[best] = 0;
      if (found >= limit) return;
    }
  };
  search();
  return found;
}
