// 解題器：以字庫的字填入所有空格，使每個成語位置都是檢查用成語表中的成語。
//   propagate        邏輯推導（逐成語列舉候選、字庫數量限制），確認不需猜測即可解出
//   countSolutions   完整回溯，計算解答數量以驗證解答唯一
//   crossOnlyCells   找出「單看所屬成語與字庫無法確定、只能經由交叉推出」的空格

import { matchPattern } from './data.js';
import { wordCells, countChars } from './board.js';

/**
 * 準備解題需要的資料：每個成語的格子、已知字（非空格）與字庫數量。
 * @param {object} board 盤面。
 * @param {string[]} answers 每格正確字。
 * @returns {{cells: number[][], known: Map<number, string>, bank: Map<string, number>, blankSet: Set<number>}} 解題資料。
 */
function prepare(board, answers) {
  const blankSet = new Set(board.blanks);
  const cells = board.words.map((w) => wordCells(board, w));
  const known = new Map();
  for (const list of cells) for (const cell of list) if (!blankSet.has(cell)) known.set(cell, answers[cell]);
  return { cells, known, bank: countChars(board.bank), blankSet };
}

/**
 * 列出某個成語位置的候選成語：符合已知字、每個空格的字在其可能範圍內，且用字不超過字庫數量。
 * @param {object} index 詞庫索引。
 * @param {number[]} list 成語的四個格子。
 * @param {(cell: number) => string | null} fixed 取得格子已確定的字。
 * @param {(cell: number) => Set<string> | null} domain 取得空格可能的字（null 表示不限）。
 * @param {Map<string, number>} remaining 字庫剩餘數量（已確定的字已扣除）。
 * @returns {string[][]} 候選成語（拆成字）。
 */
function candidates(index, list, fixed, domain, remaining) {
  const pattern = list.map((cell) => fixed(cell));
  const out = [];
  for (const t of matchPattern(index, pattern)) {
    const chars = Array.from(t);
    const used = new Map();
    let ok = true;
    for (let p = 0; p < 4 && ok; p++) {
      if (pattern[p]) continue;
      const d = domain(list[p]);
      if (d && !d.has(chars[p])) ok = false;
      used.set(chars[p], (used.get(chars[p]) || 0) + 1);
    }
    if (ok) for (const [ch, n] of used) if ((remaining.get(ch) || 0) < n) ok = false;
    if (ok) out.push(chars);
  }
  return out;
}

/**
 * 邏輯推導：反覆以各成語的候選與字庫數量縮小每個空格可能的字，直到不再變化。
 * @param {object} board 盤面。
 * @param {string[]} answers 每格正確字。
 * @param {object} index 詞庫索引。
 * @returns {{solved: boolean, domains: Map<number, Set<string>>}} 是否不需猜測即可解出，以及每個空格最後的可能字。
 */
export function propagate(board, answers, index) {
  const { cells, known, bank, blankSet } = prepare(board, answers);
  const domains = new Map();
  const unique = [...bank.keys()];
  for (const b of blankSet) domains.set(b, new Set(unique));
  for (let guard = 0; guard < 200; guard++) {
    let changed = false;
    // 已確定的字扣除字庫數量；用完的字從其他空格移除。
    const fixedCount = new Map();
    for (const [b, d] of domains) if (d.size === 1) {
      const ch = d.values().next().value;
      fixedCount.set(ch, (fixedCount.get(ch) || 0) + 1);
    }
    const remaining = new Map();
    for (const [ch, n] of bank) {
      const left = n - (fixedCount.get(ch) || 0);
      if (left < 0) return { solved: false, domains };
      remaining.set(ch, left);
    }
    for (const d of domains.values()) {
      if (d.size <= 1) continue;
      for (const ch of [...d]) if (remaining.get(ch) <= 0) {
        d.delete(ch);
        changed = true;
      }
    }
    // 逐成語列舉候選。
    for (const list of cells) {
      if (!list.some((c) => blankSet.has(c) && domains.get(c).size > 1)) continue;
      const cands = candidates(
        index,
        list,
        (cell) => known.get(cell) || (domains.get(cell).size === 1 ? domains.get(cell).values().next().value : null),
        (cell) => domains.get(cell),
        remaining,
      );
      if (!cands.length) return { solved: false, domains };
      list.forEach((cell, p) => {
        const d = domains.get(cell);
        if (!d || d.size <= 1) return;
        const allowed = new Set(cands.map((chars) => chars[p]));
        for (const ch of [...d]) if (!allowed.has(ch)) {
          d.delete(ch);
          changed = true;
        }
      });
    }
    // 字庫唯一位置：某字的剩餘數量等於可放置的空格數時，這些空格必為該字。
    // 只有字庫恰為所有空格答案（每個字都要用掉）時才成立；有干擾字時略過。
    // 上面的步驟可能已確定新的格子，因此重新計算剩餘數量，避免同一個字被多放。
    const fixedNow = new Map();
    for (const d of domains.values()) if (d.size === 1) {
      const ch = d.values().next().value;
      fixedNow.set(ch, (fixedNow.get(ch) || 0) + 1);
    }
    for (const [ch, n] of bank) {
      const left = n - (fixedNow.get(ch) || 0);
      if (left <= 0 || board.bank.length !== board.blanks.length) continue;
      const open = [...domains].filter(([, d]) => d.size > 1 && d.has(ch));
      if (open.length === left) for (const [, d] of open) {
        d.clear();
        d.add(ch);
        changed = true;
      }
    }
    for (const d of domains.values()) if (!d.size) return { solved: false, domains };
    if (!changed) break;
  }
  const solved = [...domains.values()].every((d) => d.size === 1);
  return { solved, domains };
}

/**
 * 以回溯法計算解答數量（每個成語位置都必須是檢查表中的成語，且用盡字庫），找到 limit 組即停止。
 * @param {object} board 盤面。
 * @param {string[]} answers 每格正確字（只用非空格的部分）。
 * @param {object} index 詞庫索引。
 * @param {number} [limit=2] 最多計算幾組。
 * @returns {number} 解答數量（最多 limit）。
 */
export function countSolutions(board, answers, index, limit = 2) {
  const { cells, known, bank } = prepare(board, answers);
  const assign = new Map(known);
  const remaining = new Map(bank);
  let found = 0;
  /** 遞迴搜尋：每層選擇候選最少的未完成成語。 */
  const search = () => {
    let best = null;
    let bestList = null;
    for (const list of cells) {
      if (list.every((c) => assign.has(c))) continue;
      const cands = candidates(index, list, (cell) => assign.get(cell) || null, () => null, remaining);
      if (!cands.length) return;
      if (!best || cands.length < best.length) {
        best = cands;
        bestList = list;
      }
    }
    if (!best) {
      // 全部成語都已填滿：確認每個位置都是成語（填入的過程可能讓已滿的成語未被檢查）。
      if (cells.every((list) => index.checkSet.has(list.map((c) => assign.get(c)).join('')))) found++;
      return;
    }
    for (const chars of best) {
      const placed = [];
      bestList.forEach((cell, p) => {
        if (!assign.has(cell)) {
          assign.set(cell, chars[p]);
          remaining.set(chars[p], remaining.get(chars[p]) - 1);
          placed.push(cell);
        }
      });
      const fullOk = cells.every((list) => !list.every((c) => assign.has(c)) || index.checkSet.has(list.map((c) => assign.get(c)).join('')));
      if (fullOk) search();
      for (const cell of placed) {
        const ch = assign.get(cell);
        remaining.set(ch, remaining.get(ch) + 1);
        assign.delete(cell);
      }
      if (found >= limit) return;
    }
  };
  search();
  return found;
}

/**
 * 找出只能經由交叉推出的空格：該格所屬的每一個成語，單看自身的已知字與字庫時，該格都有兩種以上可能。
 * @param {object} board 盤面。
 * @param {string[]} answers 每格正確字。
 * @param {object} index 詞庫索引。
 * @returns {number[]} 空格索引。
 */
export function crossOnlyCells(board, answers, index) {
  const { cells, known, bank, blankSet } = prepare(board, answers);
  const ambiguous = new Map();
  for (const list of cells) {
    const cands = candidates(index, list, (cell) => known.get(cell) || null, () => null, bank);
    list.forEach((cell, p) => {
      if (!blankSet.has(cell)) return;
      const many = new Set(cands.map((chars) => chars[p])).size > 1;
      ambiguous.set(cell, (ambiguous.has(cell) ? ambiguous.get(cell) : true) && many);
    });
  }
  return [...ambiguous].filter(([, v]) => v).map(([cell]) => cell);
}
