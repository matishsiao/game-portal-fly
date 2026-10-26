// 參考策略：驗證次數上限是否足夠（只用於驗收腳本與測試，遊戲中不使用）。
//   minimaxTree     簡單、中等：每次從相符的密碼中挑「最大剩餘數最小」的一組，對所有密碼完整展開決策樹
//   simulateRandom  困難、專家：每次從相符的密碼中隨機挑一組，對隨機密碼逐一模擬

import { enumerateCodes, feedbackAt } from './core.js';

/**
 * 依回饋把候選分組。
 * @param {{pegs: number, digits: Uint8Array}} all 所有可能的密碼。
 * @param {Int32Array | number[]} cands 候選（密碼索引）。
 * @param {ArrayLike<number>} guess 猜測。
 * @returns {Map<number, number[]>} 回饋代碼 → 候選索引。
 */
function partition(all, cands, guess) {
  const groups = new Map();
  for (const idx of cands) {
    const f = feedbackAt(all.digits, idx * all.pegs, guess, all.pegs);
    const g = groups.get(f);
    if (g) g.push(idx);
    else groups.set(f, [idx]);
  }
  return groups;
}

/**
 * 取得某個索引的密碼。
 * @param {{pegs: number, digits: Uint8Array}} all 所有可能的密碼。
 * @param {number} idx 索引。
 * @returns {Uint8Array} 密碼。
 */
function codeAt(all, idx) {
  return all.digits.subarray(idx * all.pegs, idx * all.pegs + all.pegs);
}

/**
 * 極小化最大剩餘數策略：對所有可能的密碼完整展開決策樹，計算最差與平均猜測次數。
 * 猜測只從目前相符的密碼中挑選（與規格的參考策略相同）。
 * @param {object} cfg 難度設定。
 * @returns {{worst: number, average: number, games: number}} 最差次數、平均次數與局數（即密碼總數）。
 */
export function minimaxTree(cfg) {
  const all = enumerateCodes(cfg);
  let worst = 0;
  let total = 0;
  /**
   * 遞迴處理一個節點：選出猜測，依回饋分組後往下展開。
   * @param {number[]} cands 目前相符的密碼。
   * @param {number} depth 這次是第幾次猜測。
   */
  const solve = (cands, depth) => {
    let best = null;
    let bestScore = Infinity;
    for (const g of cands) {
      let score = 0;
      for (const list of partition(all, cands, codeAt(all, g)).values()) score = Math.max(score, list.length);
      if (score < bestScore) {
        bestScore = score;
        best = g;
      }
    }
    const groups = partition(all, cands, codeAt(all, best));
    for (const [f, list] of groups) {
      if (f === cfg.pegs * 10) {
        worst = Math.max(worst, depth);
        total += depth;
      } else solve(list, depth + 1);
    }
  };
  solve(Array.from({ length: all.count }, (_, i) => i), 1);
  return { worst, average: total / all.count, games: all.count };
}

/**
 * 隨機相符策略：第一次猜固定的一組（各色兩兩一組，例如 1 1 2 2 3 3），之後每次從相符的密碼中隨機挑一組。
 * @param {object} cfg 難度設定。
 * @param {number} games 模擬局數。
 * @param {() => number} rng 亂數函式。
 * @returns {{worst: number, average: number, games: number}} 最差次數、平均次數與局數。
 */
export function simulateRandom(cfg, games, rng) {
  const all = enumerateCodes(cfg);
  const first = Array.from({ length: cfg.pegs }, (_, p) => Math.floor(p / 2) % cfg.colors);
  // 第一次猜測固定，事先把全部密碼依回饋分組，模擬時直接取用。
  const firstGroups = partition(all, Array.from({ length: all.count }, (_, i) => i), first);
  let worst = 0;
  let total = 0;
  for (let n = 0; n < games; n++) {
    const secretIdx = Math.floor(rng() * all.count);
    const secret = codeAt(all, secretIdx);
    let f = feedbackAt(all.digits, secretIdx * all.pegs, first, all.pegs);
    let guesses = 1;
    let cands = firstGroups.get(f);
    while (f !== cfg.pegs * 10) {
      const g = codeAt(all, cands[Math.floor(rng() * cands.length)]);
      guesses++;
      f = feedbackAt(secret, 0, g, all.pegs);
      if (f === cfg.pegs * 10) break;
      const next = [];
      for (const idx of cands) if (feedbackAt(all.digits, idx * all.pegs, g, all.pegs) === f) next.push(idx);
      cands = next;
    }
    worst = Math.max(worst, guesses);
    total += guesses;
  }
  return { worst, average: total / games, games };
}
