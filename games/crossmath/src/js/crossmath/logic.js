// 邏輯解題器：只用指定等級以下的技巧解題，以解完全盤所需的最高技巧等級判定難度。
//
// 技巧等級（由易到難）：
//   L1 直接計算：算式只剩一個未知格，直接算出數值。
//   L2 單式列舉：算式有 2～3 個未知格，以剩餘數字庫列舉組合，某格只剩一種可能時填入。
//   L3 交叉推論：交叉格取橫、直兩條算式列舉結果的交集；或某數值剩餘數量等於可放置格數（數字庫唯一位置）。
//   L4 進階推論：保留各格候選，在多條算式間反覆刪減（候選鏈結），並套用數字庫子集刪除。

import { enumerateEquation, availableValues } from './solver.js';

/** 技巧等級名稱。 */
export const TECHNIQUES = { 1: '直接計算', 2: '單式列舉', 3: '交叉推論', 4: '進階推論' };

/**
 * 判定題目難度。
 * @param {{equations: object[], numberCells: number[], cellEquations: number[][]}} ctx 骨架解析結果。
 * @param {number[]} givens 題目數值（0 為空格）。
 * @param {number[]} bank 數字庫數量。
 * @param {number} [maxLevel=4] 允許使用的最高技巧等級。
 * @returns {{solved: boolean, level: number, used: number[]}} 是否解完、使用到的最高等級，以及各等級使用次數（索引 1～4）。
 */
export function gradePuzzle(ctx, givens, bank, maxLevel = 4) {
  const solver = new LogicSolver(ctx, givens, bank);
  const used = [0, 0, 0, 0, 0];
  let level = 0;
  while (solver.blanks() > 0) {
    let progressed = false;
    for (let L = 1; L <= maxLevel; L++) {
      const r = solver.step(L);
      if (r === 'contradiction') return { solved: false, level, used };
      if (r) {
        used[L]++;
        level = Math.max(level, L);
        progressed = true;
        break;
      }
    }
    if (!progressed) return { solved: false, level, used };
  }
  return { solved: true, level, used };
}

/** 以邏輯技巧逐步解題的狀態機。 */
class LogicSolver {
  /**
   * 建立解題狀態。
   * @param {object} ctx 骨架解析結果。
   * @param {number[]} givens 題目數值。
   * @param {number[]} bank 數字庫數量。
   */
  constructor(ctx, givens, bank) {
    this.ctx = ctx;
    this.values = givens.slice();
    this.counts = bank.slice();
    /** L4 保留的候選（格子 → 數值集合）。 */
    this.cand = new Map();
  }

  /**
   * 計算剩餘空格數。
   * @returns {number} 空格數。
   */
  blanks() {
    let n = 0;
    for (const c of this.ctx.numberCells) if (this.values[c] === 0) n++;
    return n;
  }

  /**
   * 填入確定的數值並更新數字庫。
   * @param {number} c 格子索引。
   * @param {number} v 數值。
   * @returns {boolean} 數字庫仍有該數值而成功填入時為 true。
   */
  place(c, v) {
    if (this.values[c] !== 0) return true;
    if (this.counts[v] <= 0) return false;
    this.values[c] = v;
    this.counts[v]--;
    this.cand.delete(c);
    return true;
  }

  /**
   * 套用一次指定等級的技巧。
   * @param {number} level 技巧等級 1～4。
   * @returns {boolean | 'contradiction'} 有填入數值時為 true；發現矛盾時為 'contradiction'。
   */
  step(level) {
    if (level === 1) return this.direct();
    if (level === 2) return this.singleEquation();
    if (level === 3) return this.cross();
    return this.advanced();
  }

  /**
   * 以剩餘數字庫為範圍列舉一條算式。
   * @param {object} eq 算式。
   * @returns {Map<number, Set<number>> | false | null} 同 enumerateEquation。
   */
  enumerateWithBank(eq) {
    const pool = availableValues(this.counts);
    return enumerateEquation(eq, this.values, this.counts, () => pool);
  }

  /**
   * 計算算式中的未知格數。
   * @param {object} eq 算式。
   * @returns {number} 未知格數。
   */
  unknownCount(eq) {
    let n = 0;
    for (const c of eq.nums) if (this.values[c] === 0) n++;
    return n;
  }

  /**
   * L1 直接計算：只剩一個未知格的算式。
   * @returns {boolean | 'contradiction'} 結果。
   */
  direct() {
    let progressed = false;
    for (const eq of this.ctx.equations) {
      if (this.unknownCount(eq) !== 1) continue;
      const r = this.enumerateWithBank(eq);
      if (r === false) return 'contradiction';
      const [[c, set]] = r;
      if (set.size !== 1) continue;
      if (!this.place(c, set.values().next().value)) return 'contradiction';
      progressed = true;
    }
    return progressed;
  }

  /**
   * L2 單式列舉：2～3 個未知格的算式，列舉後某格只剩一種可能。
   * @returns {boolean | 'contradiction'} 結果。
   */
  singleEquation() {
    for (const eq of this.ctx.equations) {
      const k = this.unknownCount(eq);
      if (k < 2 || k > 3) continue;
      const r = this.enumerateWithBank(eq);
      if (r === false) return 'contradiction';
      if (!r) continue;
      let progressed = false;
      for (const [c, set] of r) {
        if (set.size === 1) {
          if (!this.place(c, set.values().next().value)) return 'contradiction';
          progressed = true;
        }
      }
      if (progressed) return true;
    }
    return false;
  }

  /**
   * 計算每個空格在所屬各算式列舉結果的交集（不保留狀態）。
   * @returns {Map<number, Set<number>> | false} 每個空格的候選；有矛盾時為 false。
   */
  intersections() {
    const pool = availableValues(this.counts);
    const result = new Map();
    for (const c of this.ctx.numberCells) if (this.values[c] === 0) result.set(c, new Set(pool));
    for (const eq of this.ctx.equations) {
      if (this.unknownCount(eq) === 0) continue;
      const r = this.enumerateWithBank(eq);
      if (r === false) return false;
      if (!r) continue;
      for (const [c, set] of r) {
        const cur = result.get(c);
        for (const v of cur) if (!set.has(v)) cur.delete(v);
        if (!cur.size) return false;
      }
    }
    return result;
  }

  /**
   * 數字庫唯一位置：某數值的剩餘數量等於候選中含有該數值的格數時，全部填入。
   * @param {Map<number, Set<number>>} cand 每個空格的候選。
   * @returns {boolean | 'contradiction'} 結果。
   */
  bankPositions(cand) {
    for (const v of availableValues(this.counts)) {
      const cells = [];
      for (const [c, set] of cand) if (set.has(v)) cells.push(c);
      if (cells.length < this.counts[v]) return 'contradiction';
      if (cells.length === this.counts[v]) {
        for (const c of cells) if (!this.place(c, v)) return 'contradiction';
        return true;
      }
    }
    return false;
  }

  /**
   * 候選只剩一個的格子直接填入。
   * @param {Map<number, Set<number>>} cand 每個空格的候選。
   * @returns {boolean | 'contradiction'} 結果。
   */
  singles(cand) {
    let progressed = false;
    for (const [c, set] of cand) {
      if (set.size === 0) return 'contradiction';
      if (set.size === 1) {
        if (!this.place(c, set.values().next().value)) return 'contradiction';
        progressed = true;
      }
    }
    return progressed;
  }

  /**
   * L3 交叉推論。
   * @returns {boolean | 'contradiction'} 結果。
   */
  cross() {
    const cand = this.intersections();
    if (!cand) return 'contradiction';
    const r = this.singles(cand);
    if (r) return r;
    return this.bankPositions(cand);
  }

  /**
   * L4 進階推論：保留候選並反覆以算式列舉與數字庫子集刪減，直到能填入或無法再推進。
   * @returns {boolean | 'contradiction'} 結果。
   */
  advanced() {
    const base = this.intersections();
    if (!base) return 'contradiction';
    for (const [c, set] of base) {
      const prev = this.cand.get(c);
      if (prev) for (const v of set) if (!prev.has(v)) set.delete(v);
      this.cand.set(c, set);
    }
    for (let guard = 0; guard < 200; guard++) {
      let changed = false;
      for (const eq of this.ctx.equations) {
        if (this.unknownCount(eq) === 0) continue;
        const r = enumerateEquation(eq, this.values, this.counts, (c) => Array.from(this.cand.get(c)));
        if (r === false) return 'contradiction';
        if (!r) continue;
        for (const [c, set] of r) {
          const cur = this.cand.get(c);
          for (const v of cur) {
            if (!set.has(v)) {
              cur.delete(v);
              changed = true;
            }
          }
        }
      }
      if (this.nakedSubsets()) changed = true;
      const s = this.singles(this.cand);
      if (s) return s;
      const b = this.bankPositions(this.cand);
      if (b) return b;
      if (!changed) return false;
    }
    return false;
  }

  /**
   * 數字庫子集：k 個空格（k = 2、3）的候選聯集 U 的剩餘總數恰為 k 時，其他空格刪除 U 中的數值。
   * @returns {boolean} 有刪除候選時為 true。
   */
  nakedSubsets() {
    const cells = Array.from(this.cand.keys()).filter((c) => this.cand.get(c).size <= 3);
    let changed = false;
    /**
     * 檢查一組空格是否構成子集並刪除其他格的候選。
     * @param {number[]} group 空格組合。
     */
    const tryGroup = (group) => {
      const union = new Set();
      for (const c of group) for (const v of this.cand.get(c)) union.add(v);
      let total = 0;
      for (const v of union) total += this.counts[v];
      if (total !== group.length) return;
      for (const [c, set] of this.cand) {
        if (group.includes(c)) continue;
        for (const v of union) {
          if (set.delete(v)) changed = true;
        }
      }
    };
    for (let a = 0; a < cells.length; a++) {
      for (let b = a + 1; b < cells.length; b++) {
        tryGroup([cells[a], cells[b]]);
        for (let d = b + 1; d < cells.length; d++) tryGroup([cells[a], cells[b], cells[d]]);
      }
    }
    return changed;
  }
}
