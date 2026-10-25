// 出題器：產生完整解答後對稱挖空，驗證唯一解並以邏輯解題器確認難度。

import { gridToString, hashPuzzle, shuffle } from './core.js';
import { countSolutions, generateSolution } from './solver.js';
import { gradePuzzle } from './logic.js';

/** 難度設定：技巧等級、每局提示額度與給定數字參考範圍。 */
export const DIFFICULTIES = {
  easy: { label: '簡單', level: 1, hints: 30, givens: [36, 45] },
  medium: { label: '中等', level: 2, hints: 20, givens: [30, 35] },
  hard: { label: '困難', level: 3, hints: 10, givens: [24, 29] },
  expert: { label: '專家', level: 4, hints: 5, givens: [22, 27] },
};

/** 難度代碼依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/**
 * 以 180 度旋轉對稱的方式挖空，挖空過程保持唯一解且不超過目標技巧等級。
 * @param {number[]} solution 完整解答。
 * @param {{level: number, givens: number[]}} cfg 難度設定。
 * @param {() => number} rng 亂數函式。
 * @returns {number[] | null} 符合難度的題目，失敗時為 null。
 */
function dig(solution, cfg, rng) {
  const [minGivens, maxGivens] = cfg.givens;
  const target = minGivens + Math.floor(rng() * (maxGivens - minGivens + 1));
  const grid = solution.slice();
  let givens = 81;
  const order = [];
  for (let i = 0; i <= 40; i++) order.push(i);
  shuffle(order, rng);
  for (const i of order) {
    if (givens <= target) break;
    const cells = i === 40 ? [40] : [i, 80 - i];
    if (givens - cells.length < minGivens) continue;
    for (const c of cells) grid[c] = 0;
    // 每次挖空都須維持唯一解，且不需要超過目標等級的技巧即可解完。
    const ok = countSolutions(grid, 2) === 1 && gradePuzzle(grid, cfg.level).solved;
    if (ok) {
      givens -= cells.length;
    } else {
      for (const c of cells) grid[c] = solution[c];
    }
  }
  if (givens > maxGivens) return null;
  return gradePuzzle(grid, cfg.level).level === cfg.level ? grid : null;
}

/**
 * 產生指定難度的題目與解答。
 * @param {string} difficulty 難度代碼（easy／medium／hard／expert）。
 * @param {object} [options] 選項。
 * @param {() => number} [options.rng=Math.random] 亂數函式。
 * @param {Iterable<string>} [options.exclude=[]] 不可重複的題目雜湊。
 * @param {number} [options.maxAttempts=Infinity] 最多嘗試次數。
 * @returns {{difficulty: string, puzzle: string, solution: string, hash: string, attempts: number}} 題目資料。
 * @throws {Error} 難度不存在或超過嘗試次數時。
 */
export function generatePuzzle(difficulty, { rng = Math.random, exclude = [], maxAttempts = Infinity } = {}) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`未知的難度：${difficulty}`);
  const excluded = new Set(exclude);
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const solution = generateSolution(rng);
    const grid = dig(solution, cfg, rng);
    if (!grid) continue;
    const puzzle = gridToString(grid);
    const hash = hashPuzzle(puzzle);
    if (excluded.has(hash)) continue;
    return { difficulty, puzzle, solution: gridToString(solution), hash, attempts };
  }
  throw new Error('超過出題嘗試次數');
}
