// 出題器：隨機把盤面分割成數條不貼著自己的路徑 → 取路徑兩端為端點 → 驗證唯一解與難度。

import { neighbors, shuffle, hashPuzzle } from './core.js';
import { countSolutions } from './solver.js';
import { gradePuzzle } from './logic.js';

/**
 * 難度設定：
 * level 技巧等級範圍 [最低, 最高]、hints 每局提示額度、sizes 可能的盤面邊長、pairs 端點對數範圍（依邊長）。
 */
export const DIFFICULTIES = {
  easy: { label: '簡單', level: [1, 2], hints: 3, sizes: [4, 5], pairs: { 4: [3, 4], 5: [3, 5] } },
  medium: { label: '中等', level: [1, 3], hints: 3, sizes: [6, 7], pairs: { 6: [5, 6], 7: [5, 7] } },
  hard: { label: '困難', level: [3, 3], hints: 2, sizes: [8], pairs: { 8: [6, 9] } },
  expert: { label: '專家', level: [4, 4], hints: 2, sizes: [9, 10], pairs: { 9: [8, 11], 10: [8, 12] } },
};

/** 難度代碼依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/** 唯一解檢查的搜尋節點上限；超過時捨棄該題重新產生。 */
const SOLVE_BUDGET = 20000;

/**
 * 取得 [min, max] 範圍內的隨機整數。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @param {() => number} rng 亂數函式。
 * @returns {number} 隨機整數。
 */
function randInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * 判斷格子加到路徑尾端後，是否會貼到路徑上非相鄰的格子（不貼著自己，避免 2 × 2 同色與繞回）。
 * @param {number[][]} adj 相鄰表。
 * @param {Int16Array} owner 每格所屬路徑，-1 為空。
 * @param {number} cell 候選格子。
 * @param {number} id 路徑編號。
 * @param {number} tail 路徑目前的尾端。
 * @returns {boolean} 不會貼到自己時為 true。
 */
function keepsApart(adj, owner, cell, id, tail) {
  for (const nb of adj[cell]) if (nb !== tail && owner[nb] === id) return false;
  return true;
}

/**
 * 隨機把盤面分割成路徑：每條路徑從空格出發，盡量往「空鄰居較少」的格子走（減少留下孤立空格），
 * 路徑不貼著自己；最後把太短的路徑併入相鄰路徑的端點。
 * @param {number} size 盤面邊長。
 * @param {number} pairs 目標路徑數。
 * @param {() => number} rng 亂數函式。
 * @returns {number[][] | null} 路徑清單，失敗時為 null。
 */
function partition(size, pairs, rng) {
  const n = size * size;
  const adj = neighbors(size);
  const owner = new Int16Array(n).fill(-1);
  const paths = [];
  const target = n / pairs;
  /**
   * 計算格子的空鄰居數。
   * @param {number} i 格子索引。
   * @returns {number} 空鄰居數。
   */
  const freeDegree = (i) => adj[i].filter((nb) => owner[nb] === -1).length;
  for (;;) {
    const empties = [];
    for (let i = 0; i < n; i++) if (owner[i] === -1) empties.push(i);
    if (!empties.length) break;
    // 從空鄰居最少的空格出發，避免角落與夾縫被留下。
    let minDeg = 5;
    for (const i of empties) minDeg = Math.min(minDeg, freeDegree(i));
    const starts = empties.filter((i) => freeDegree(i) === minDeg);
    const start = starts[Math.floor(rng() * starts.length)];
    const id = paths.length;
    const path = [start];
    owner[start] = id;
    const maxLen = Math.max(3, Math.round(target * (0.6 + rng() * 0.9)));
    for (const end of ['tail', 'head']) {
      while (path.length < maxLen) {
        const tail = end === 'tail' ? path[path.length - 1] : path[0];
        const options = adj[tail].filter((nb) => owner[nb] === -1 && keepsApart(adj, owner, nb, id, tail));
        if (!options.length) break;
        shuffle(options, rng);
        // 大多數時候走空鄰居最少的格子，偶爾隨機，讓路徑形狀有變化。
        options.sort((a, b) => freeDegree(a) - freeDegree(b));
        const next = rng() < 0.75 ? options[0] : options[Math.floor(rng() * options.length)];
        owner[next] = id;
        if (end === 'tail') path.push(next);
        else path.unshift(next);
      }
    }
    paths.push(path);
  }
  return mergeShort(paths, owner, adj) ? paths.filter((p) => p.length) : null;
}

/**
 * 把少於 3 格的路徑接到相鄰路徑的端點；接上後仍須不貼著自己。
 * @param {number[][]} paths 路徑清單（會被修改，被併入的路徑變為空陣列）。
 * @param {Int16Array} owner 每格所屬路徑（會被修改）。
 * @param {number[][]} adj 相鄰表。
 * @returns {boolean} 全部路徑都至少 3 格時為 true。
 */
function mergeShort(paths, owner, adj) {
  for (let guard = 0; guard < paths.length * 4; guard++) {
    const short = paths.findIndex((p) => p.length > 0 && p.length < 3);
    if (short < 0) return true;
    const p = paths[short];
    let merged = false;
    for (const [mine, flipMine] of [[p[p.length - 1], false], [p[0], true]]) {
      for (const nb of adj[mine]) {
        const other = owner[nb];
        if (other < 0 || other === short) continue;
        const q = paths[other];
        if (nb !== q[0] && nb !== q[q.length - 1]) continue;
        // 組成新路徑：p（尾端接 nb）+ q（從 nb 開始）。
        const a = flipMine ? p.slice().reverse() : p.slice();
        const b = nb === q[0] ? q.slice() : q.slice().reverse();
        const joined = [...a, ...b];
        if (!isApart(joined, adj)) continue;
        for (const i of joined) owner[i] = other;
        paths[other] = joined;
        paths[short] = [];
        merged = true;
        break;
      }
      if (merged) break;
    }
    if (!merged) return false;
  }
  return !paths.some((p) => p.length > 0 && p.length < 3);
}

/**
 * 判斷路徑是否不貼著自己：路徑上非相鄰順序的兩格不得相鄰。
 * @param {number[]} path 路徑。
 * @param {number[][]} adj 相鄰表。
 * @returns {boolean} 不貼著自己時為 true。
 */
function isApart(path, adj) {
  const pos = new Map(path.map((cell, k) => [cell, k]));
  for (let k = 0; k < path.length; k++) {
    for (const nb of adj[path[k]]) {
      const j = pos.get(nb);
      if (j !== undefined && Math.abs(j - k) > 1) return false;
    }
  }
  return true;
}

/**
 * 產生指定難度的題目與解答。
 * @param {string} difficulty 難度代碼（easy／medium／hard／expert）。
 * @param {object} [options] 選項。
 * @param {() => number} [options.rng=Math.random] 亂數函式。
 * @param {Iterable<string>} [options.exclude=[]] 不可重複的題目雜湊。
 * @param {number} [options.maxAttempts=Infinity] 最多嘗試次數。
 * @returns {{difficulty: string, size: number, ends: number[][], solution: number[][], hash: string, attempts: number}} 題目資料。
 * @throws {Error} 難度不存在或超過嘗試次數時。
 */
export function generatePuzzle(difficulty, { rng = Math.random, exclude = [], maxAttempts = Infinity } = {}) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`未知的難度：${difficulty}`);
  const excluded = new Set(exclude);
  // 每局先決定盤面大小再反覆嘗試，讓同一難度的各種大小出現機率相同。
  const size = cfg.sizes[Math.floor(rng() * cfg.sizes.length)];
  const [minPairs, maxPairs] = cfg.pairs[size];
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const paths = partition(size, randInt(minPairs, maxPairs, rng), rng);
    if (!paths || paths.length < minPairs || paths.length > maxPairs) continue;
    shuffle(paths, rng);
    const ends = paths.map((p) => [p[0], p[p.length - 1]]);
    const puzzle = { size, ends };
    const hash = hashPuzzle(puzzle);
    if (excluded.has(hash)) continue;
    const grade = gradePuzzle(size, ends, cfg.level[1]);
    if (!grade.solved || grade.level < cfg.level[0]) continue;
    try {
      if (countSolutions(size, ends, 2, { nodes: SOLVE_BUDGET }) !== 1) continue;
    } catch {
      continue;
    }
    return { difficulty, size, ends, solution: paths, hash, attempts };
  }
  throw new Error('超過出題嘗試次數');
}
