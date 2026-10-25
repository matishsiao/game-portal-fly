// 邏輯解題器：只用指定的人類解題技巧推進盤面，並以所需最高技巧等級判定難度。
// 等級：1 簡單（Single）、2 中等（交集與數組）、3 困難（魚與 Wing）、4 專家（UR、鏈與著色）。

import { ALL, UNITS, PEERS, ROW_OF, COL_OF, BOX_OF, POPCOUNT, DIGITS, bit, sees } from './core.js';

/**
 * 建立邏輯解題狀態；盤面本身有衝突時回傳 null。
 * @param {ArrayLike<number>} grid 長度 81 的數字陣列，0 為空格。
 * @returns {{values: Int8Array, cand: Uint16Array} | null} 已填數字與每格候選遮罩。
 */
function createState(grid) {
  const values = new Int8Array(81);
  const cand = new Uint16Array(81).fill(ALL);
  const s = { values, cand };
  for (let i = 0; i < 81; i++) {
    const d = grid[i];
    if (!d) continue;
    if (!(cand[i] & bit(d))) return null;
    place(s, i, d);
  }
  return s;
}

/**
 * 在格子填入數字並從同儕格移除該候選。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @param {number} i 格子索引。
 * @param {number} d 數字。
 */
function place(s, i, d) {
  s.values[i] = d;
  s.cand[i] = 0;
  const b = ~bit(d);
  for (const p of PEERS[i]) s.cand[p] &= b;
}

/**
 * 從格子移除候選遮罩中的數字。
 * @param {{cand: Uint16Array}} s 解題狀態。
 * @param {number} i 格子索引。
 * @param {number} mask 要移除的候選遮罩。
 * @returns {boolean} 是否真的移除了候選。
 */
function eliminate(s, i, mask) {
  if (s.cand[i] & mask) {
    s.cand[i] &= ~mask;
    return true;
  }
  return false;
}

/**
 * 從同時看得到 a 與 b 的格子中移除數字 d。
 * @param {{cand: Uint16Array}} s 解題狀態。
 * @param {number} a 格子索引。
 * @param {number} b 格子索引。
 * @param {number} d 數字。
 * @param {number[]} [exclude=[]] 不處理的格子。
 * @returns {boolean} 是否有移除。
 */
function eliminateSeenByBoth(s, a, b, d, exclude = []) {
  const m = bit(d);
  let changed = false;
  for (const p of PEERS[a]) {
    if (p !== b && sees(p, b) && !exclude.includes(p) && eliminate(s, p, m)) changed = true;
  }
  return changed;
}

/**
 * 列出單位中仍有數字 d 候選的格子。
 * @param {{cand: Uint16Array}} s 解題狀態。
 * @param {number[]} unit 單位格子。
 * @param {number} d 數字。
 * @returns {number[]} 格子索引。
 */
function positions(s, unit, d) {
  const m = bit(d);
  const out = [];
  for (const i of unit) if (s.cand[i] & m) out.push(i);
  return out;
}

/**
 * 產生陣列中取 k 個元素的所有組合。
 * @template T
 * @param {T[]} arr 來源陣列。
 * @param {number} k 組合大小。
 * @returns {Generator<T[]>} 組合。
 */
function* combinations(arr, k, start = 0, prefix = []) {
  if (prefix.length === k) {
    yield prefix;
    return;
  }
  for (let i = start; i <= arr.length - (k - prefix.length); i++) {
    yield* combinations(arr, k, i + 1, [...prefix, arr[i]]);
  }
}

// ---------- 等級 1：Single ----------

/**
 * Naked Single：只剩一個候選的空格直接填入。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function nakedSingle(s) {
  let changed = false;
  for (let i = 0; i < 81; i++) {
    if (!s.values[i] && POPCOUNT[s.cand[i]] === 1) {
      place(s, i, DIGITS[s.cand[i]][0]);
      changed = true;
    }
  }
  return changed;
}

/**
 * Hidden Single：某數字在單位中只剩一個位置時填入。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function hiddenSingle(s) {
  for (const unit of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const pos = positions(s, unit, d);
      if (pos.length === 1) {
        place(s, pos[0], d);
        return true;
      }
    }
  }
  return false;
}

// ---------- 等級 2：交集與數組 ----------

/**
 * Pointing 與 Claiming：宮與列／行交集只剩某數字的位置時，刪除交集外的候選。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function intersections(s) {
  let changed = false;
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    for (let b = 0; b < 9; b++) {
      const pos = positions(s, UNITS[18 + b], d);
      if (pos.length < 2) continue;
      if (pos.every((i) => ROW_OF[i] === ROW_OF[pos[0]])) {
        for (const i of UNITS[ROW_OF[pos[0]]]) if (BOX_OF[i] !== b && eliminate(s, i, m)) changed = true;
      }
      if (pos.every((i) => COL_OF[i] === COL_OF[pos[0]])) {
        for (const i of UNITS[9 + COL_OF[pos[0]]]) if (BOX_OF[i] !== b && eliminate(s, i, m)) changed = true;
      }
    }
    for (let u = 0; u < 18; u++) {
      const pos = positions(s, UNITS[u], d);
      if (pos.length < 2 || !pos.every((i) => BOX_OF[i] === BOX_OF[pos[0]])) continue;
      for (const i of UNITS[18 + BOX_OF[pos[0]]]) {
        if (!UNITS[u].includes(i) && eliminate(s, i, m)) changed = true;
      }
    }
    if (changed) return true;
  }
  return changed;
}

/**
 * Naked Pair／Triple：n 格的候選聯集正好 n 個數字時，從單位其他格刪除。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @param {number} n 數組大小。
 * @returns {boolean} 是否有進展。
 */
function nakedSubset(s, n) {
  for (const unit of UNITS) {
    const cells = unit.filter((i) => !s.values[i] && POPCOUNT[s.cand[i]] >= 2 && POPCOUNT[s.cand[i]] <= n);
    for (const combo of combinations(cells, n)) {
      let union = 0;
      for (const i of combo) union |= s.cand[i];
      if (POPCOUNT[union] !== n) continue;
      let changed = false;
      for (const i of unit) if (!s.values[i] && !combo.includes(i) && eliminate(s, i, union)) changed = true;
      if (changed) return true;
    }
  }
  return false;
}

/**
 * Hidden Pair／Triple：n 個數字只出現在單位中的 n 格時，刪除這些格的其他候選。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @param {number} n 數組大小。
 * @returns {boolean} 是否有進展。
 */
function hiddenSubset(s, n) {
  for (const unit of UNITS) {
    const digits = [];
    for (let d = 1; d <= 9; d++) {
      const c = positions(s, unit, d).length;
      if (c >= 2 && c <= n) digits.push(d);
    }
    for (const combo of combinations(digits, n)) {
      const cells = new Set();
      let mask = 0;
      for (const d of combo) {
        mask |= bit(d);
        for (const i of positions(s, unit, d)) cells.add(i);
      }
      if (cells.size !== n) continue;
      let changed = false;
      for (const i of cells) if (eliminate(s, i, ALL & ~mask)) changed = true;
      if (changed) return true;
    }
  }
  return false;
}

// ---------- 等級 3：魚與 Wing ----------

/**
 * X-Wing（n=2）／Swordfish（n=3）：數字在 n 條基準線上的位置只落在 n 條覆蓋線時，刪除覆蓋線上其他候選。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @param {number} n 魚的大小。
 * @returns {boolean} 是否有進展。
 */
function fish(s, n) {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    for (const byRow of [true, false]) {
      const lines = [];
      for (let k = 0; k < 9; k++) {
        const pos = positions(s, UNITS[byRow ? k : 9 + k], d);
        if (pos.length >= 2 && pos.length <= n) {
          lines.push({ k, covers: pos.map((i) => (byRow ? COL_OF[i] : ROW_OF[i])) });
        }
      }
      for (const combo of combinations(lines, n)) {
        const covers = new Set();
        for (const line of combo) for (const c of line.covers) covers.add(c);
        if (covers.size !== n) continue;
        const bases = combo.map((line) => line.k);
        let changed = false;
        for (const c of covers) {
          for (const i of UNITS[byRow ? 9 + c : c]) {
            const base = byRow ? ROW_OF[i] : COL_OF[i];
            if (!bases.includes(base) && eliminate(s, i, m)) changed = true;
          }
        }
        if (changed) return true;
      }
    }
  }
  return false;
}

/**
 * XY-Wing：樞紐 {a,b} 與兩翼 {a,c}、{b,c}，刪除同時看得到兩翼的 c。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function xyWing(s) {
  for (let p = 0; p < 81; p++) {
    if (POPCOUNT[s.cand[p]] !== 2) continue;
    const wings = PEERS[p].filter((q) => POPCOUNT[s.cand[q]] === 2 && POPCOUNT[s.cand[q] & s.cand[p]] === 1);
    for (const [w1, w2] of combinations(wings, 2)) {
      const c1 = s.cand[w1] & ~s.cand[p];
      const c2 = s.cand[w2] & ~s.cand[p];
      if (c1 !== c2 || (s.cand[w1] & s.cand[p]) === (s.cand[w2] & s.cand[p])) continue;
      if (eliminateSeenByBoth(s, w1, w2, DIGITS[c1][0], [p])) return true;
    }
  }
  return false;
}

/**
 * XYZ-Wing：樞紐 {a,b,c} 與兩翼 {a,c}、{b,c}，刪除同時看得到三格的 c。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function xyzWing(s) {
  for (let p = 0; p < 81; p++) {
    if (POPCOUNT[s.cand[p]] !== 3) continue;
    const wings = PEERS[p].filter((q) => POPCOUNT[s.cand[q]] === 2 && (s.cand[q] & s.cand[p]) === s.cand[q]);
    for (const [w1, w2] of combinations(wings, 2)) {
      if ((s.cand[w1] | s.cand[w2]) !== s.cand[p]) continue;
      const z = s.cand[w1] & s.cand[w2];
      if (POPCOUNT[z] !== 1) continue;
      let changed = false;
      for (const q of PEERS[p]) {
        if (q !== w1 && q !== w2 && sees(q, w1) && sees(q, w2) && eliminate(s, q, z)) changed = true;
      }
      if (changed) return true;
    }
  }
  return false;
}

// ---------- 等級 4：專家技巧 ----------

/**
 * 列出數字 d 的強連結（單位中只剩兩個位置的格子對）鄰接表。
 * @param {{cand: Uint16Array}} s 解題狀態。
 * @param {number} d 數字。
 * @returns {Map<number, Set<number>>} 每格的強連結對象。
 */
function strongLinks(s, d) {
  const links = new Map();
  for (const unit of UNITS) {
    const pos = positions(s, unit, d);
    if (pos.length !== 2) continue;
    const [a, b] = pos;
    if (!links.has(a)) links.set(a, new Set());
    if (!links.has(b)) links.set(b, new Set());
    links.get(a).add(b);
    links.get(b).add(a);
  }
  return links;
}

/**
 * Unique Rectangle Type 1：跨兩宮的矩形中三格為相同雙值，第四格刪除這兩個數字。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function uniqueRectangle(s) {
  for (let r1 = 0; r1 < 8; r1++) {
    for (let r2 = r1 + 1; r2 < 9; r2++) {
      for (let c1 = 0; c1 < 8; c1++) {
        for (let c2 = c1 + 1; c2 < 9; c2++) {
          const cells = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
          if (new Set(cells.map((i) => BOX_OF[i])).size !== 2) continue;
          if (cells.some((i) => s.values[i])) continue;
          const bivalue = cells.filter((i) => POPCOUNT[s.cand[i]] === 2);
          if (bivalue.length !== 3) continue;
          const pair = s.cand[bivalue[0]];
          if (!bivalue.every((i) => s.cand[i] === pair)) continue;
          const other = cells.find((i) => !bivalue.includes(i));
          if ((s.cand[other] & pair) === pair && eliminate(s, other, pair)) return true;
        }
      }
    }
  }
  return false;
}

/**
 * W-Wing：兩個不互見的相同雙值格 {a,b}，以 a 的強連結相連時，刪除同時看得到兩格的 b。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function wWing(s) {
  const bivalue = [];
  for (let i = 0; i < 81; i++) if (POPCOUNT[s.cand[i]] === 2) bivalue.push(i);
  for (const [p, q] of combinations(bivalue, 2)) {
    if (s.cand[p] !== s.cand[q] || sees(p, q)) continue;
    const [a, b] = DIGITS[s.cand[p]];
    for (const [link, other] of [[a, b], [b, a]]) {
      const links = strongLinks(s, link);
      let found = false;
      for (const [u, targets] of links) {
        if (u === p || u === q || !sees(u, p)) continue;
        for (const v of targets) {
          if (v !== p && v !== q && sees(v, q)) found = true;
        }
      }
      if (found && eliminateSeenByBoth(s, p, q, other)) return true;
    }
  }
  return false;
}

/**
 * Simple Coloring：以強連結為數字著色，處理同色互見（color wrap）與看見兩色（color trap）。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function simpleColoring(s) {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    const links = strongLinks(s, d);
    const seen = new Set();
    for (const start of links.keys()) {
      if (seen.has(start)) continue;
      const color = new Map([[start, 0]]);
      const queue = [start];
      seen.add(start);
      while (queue.length) {
        const x = queue.shift();
        for (const y of links.get(x)) {
          if (color.has(y)) continue;
          color.set(y, 1 - color.get(x));
          seen.add(y);
          queue.push(y);
        }
      }
      if (color.size < 3) continue;
      const groups = [[], []];
      for (const [cell, c] of color) groups[c].push(cell);
      for (const c of [0, 1]) {
        const wrap = groups[c].some((a, idx) => groups[c].slice(idx + 1).some((b) => sees(a, b)));
        if (wrap) {
          let changed = false;
          for (const cell of groups[c]) if (eliminate(s, cell, m)) changed = true;
          if (changed) return true;
        }
      }
      let changed = false;
      for (let i = 0; i < 81; i++) {
        if (color.has(i) || !(s.cand[i] & m)) continue;
        if (groups[0].some((a) => sees(i, a)) && groups[1].some((b) => sees(i, b)) && eliminate(s, i, m)) {
          changed = true;
        }
      }
      if (changed) return true;
    }
  }
  return false;
}

/**
 * X-Chain：單一數字的強弱交替鏈；起點為假時終點必為真，刪除同時看得到兩端的候選。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function xChain(s) {
  for (let d = 1; d <= 9; d++) {
    const m = bit(d);
    const links = strongLinks(s, d);
    for (const start of links.keys()) {
      // on：在「起點為假」的前提下確定為真的格；off：確定為假的格。
      const on = new Set();
      const off = new Set([start]);
      const queue = [[start, false]];
      while (queue.length) {
        const [x, isOn] = queue.shift();
        if (!isOn) {
          for (const y of links.get(x) || []) {
            if (!on.has(y)) {
              on.add(y);
              queue.push([y, true]);
            }
          }
        } else {
          for (const z of PEERS[x]) {
            if (s.cand[z] & m && !off.has(z)) {
              off.add(z);
              queue.push([z, false]);
            }
          }
        }
      }
      if (on.has(start)) {
        place(s, start, d);
        return true;
      }
      for (const end of on) {
        if (eliminateSeenByBoth(s, start, end, d)) return true;
      }
    }
  }
  return false;
}

/**
 * XY-Chain：由雙值格串成的鏈；起點不是 d 時終點必為 d，刪除同時看得到兩端的 d。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @returns {boolean} 是否有進展。
 */
function xyChain(s) {
  const bivalue = [];
  for (let i = 0; i < 81; i++) if (POPCOUNT[s.cand[i]] === 2) bivalue.push(i);
  for (const start of bivalue) {
    for (const d of DIGITS[s.cand[start]]) {
      const first = DIGITS[s.cand[start] & ~bit(d)][0];
      const visited = new Set([start * 10 + first]);
      const queue = [[start, first]];
      while (queue.length) {
        const [cell, v] = queue.shift();
        for (const t of PEERS[cell]) {
          if (POPCOUNT[s.cand[t]] !== 2 || !(s.cand[t] & bit(v))) continue;
          const w = DIGITS[s.cand[t] & ~bit(v)][0];
          const key = t * 10 + w;
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push([t, w]);
          if (w === d && t !== start && eliminateSeenByBoth(s, start, t, d)) return true;
        }
      }
    }
  }
  return false;
}

/** 依由易到難排列的技巧清單：[等級, 名稱, 函式]。 */
const TECHNIQUES = [
  [1, 'Naked Single', nakedSingle],
  [1, 'Hidden Single', hiddenSingle],
  [2, 'Pointing/Claiming', intersections],
  [2, 'Naked Pair', (s) => nakedSubset(s, 2)],
  [2, 'Hidden Pair', (s) => hiddenSubset(s, 2)],
  [2, 'Naked Triple', (s) => nakedSubset(s, 3)],
  [2, 'Hidden Triple', (s) => hiddenSubset(s, 3)],
  [3, 'X-Wing', (s) => fish(s, 2)],
  [3, 'Swordfish', (s) => fish(s, 3)],
  [3, 'XY-Wing', xyWing],
  [3, 'XYZ-Wing', xyzWing],
  [4, 'Unique Rectangle', uniqueRectangle],
  [4, 'W-Wing', wWing],
  [4, 'Simple Coloring', simpleColoring],
  [4, 'X-Chain', xChain],
  [4, 'XY-Chain', xyChain],
];

/**
 * 確認解題狀態與正確解答一致（測試用）。
 * @param {{values: Int8Array, cand: Uint16Array}} s 解題狀態。
 * @param {ArrayLike<number>} solution 正確解答。
 * @param {string} name 剛套用的技巧名稱。
 * @throws {Error} 填錯數字或刪除了正解候選時。
 */
function verifyState(s, solution, name) {
  for (let i = 0; i < 81; i++) {
    const ok = s.values[i] ? s.values[i] === solution[i] : (s.cand[i] & bit(solution[i])) !== 0;
    if (!ok) throw new Error(`${name} 在第 ${i} 格產生錯誤推論`);
  }
}

/**
 * 以邏輯技巧解題並判定難度。
 * 注意：Unique Rectangle 假設題目為唯一解，呼叫前應先驗證唯一解。
 * @param {ArrayLike<number>} grid 長度 81 的數字陣列，0 為空格。
 * @param {number} [maxLevel=4] 允許使用的最高技巧等級。
 * @param {object} [options] 選項。
 * @param {ArrayLike<number>} [options.verify] 提供正確解答時，每一步都驗證推論正確（測試用）。
 * @returns {{solved: boolean, level: number, used: Record<string, number>}}
 *   是否解完、使用到的最高等級（全部已填時為 0），以及各技巧使用次數。
 * @throws {Error} 驗證模式下推論錯誤時。
 */
export function gradePuzzle(grid, maxLevel = 4, { verify } = {}) {
  const s = createState(grid);
  const used = {};
  if (!s) return { solved: false, level: 0, used };
  let level = 0;
  for (;;) {
    if (s.values.every((v) => v)) return { solved: true, level, used };
    let progressed = false;
    for (const [lvl, name, technique] of TECHNIQUES) {
      if (lvl > maxLevel) break;
      if (technique(s)) {
        level = Math.max(level, lvl);
        used[name] = (used[name] || 0) + 1;
        if (verify) verifyState(s, verify, name);
        progressed = true;
        break;
      }
    }
    if (!progressed) return { solved: false, level, used };
    for (let i = 0; i < 81; i++) {
      if (!s.values[i] && s.cand[i] === 0) return { solved: false, level, used };
    }
  }
}
