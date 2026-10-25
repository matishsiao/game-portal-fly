// 盤面狀態與完整解題器：從每對端點的兩端同時「長線」，以剪枝回溯計算解答數量。
//
// 線頭（head）：每個尚未連通的編號有兩個線頭，分別是從兩個端點長出的線的末端。
// 走法（move）：線頭延伸到相鄰空格，或兩個線頭相鄰時「接上」使該編號連通。

import { neighbors, isAdjacent } from './core.js';

/** 以「長線」方式解題的盤面狀態（可套用與撤銷走法）。 */
export class Board {
  /**
   * 建立只有端點的盤面。
   * @param {number} size 盤面邊長。
   * @param {number[][]} ends 每對端點。
   */
  constructor(size, ends) {
    this.size = size;
    this.n = size * size;
    this.adj = neighbors(size);
    this.k = ends.length;
    /** 每格所屬編號（索引），-1 為空格。 */
    this.owner = new Int8Array(this.n).fill(-1);
    /** 每格若是未連通編號的線頭，記錄其編號，否則為 -1。 */
    this.headColor = new Int8Array(this.n).fill(-1);
    /** 每個編號的兩個線頭。 */
    this.heads = ends.map((pair) => pair.slice());
    /** 每個編號是否已連通。 */
    this.done = new Uint8Array(this.k);
    this.empty = this.n;
    /** 已套用的走法，供撤銷。 */
    this.history = [];
    /** 每個編號兩端長出的格子序列（含端點）。 */
    this.trails = ends.map(([a, b]) => [[a], [b]]);
    ends.forEach(([a, b], c) => {
      this.owner[a] = c;
      this.owner[b] = c;
      this.headColor[a] = c;
      this.headColor[b] = c;
      this.empty -= 2;
    });
  }

  /**
   * 判斷是否已解完：全部編號連通且沒有空格。
   * @returns {boolean} 解完時為 true。
   */
  solved() {
    return this.empty === 0 && this.done.every((d) => d === 1);
  }

  /**
   * 列出某個線頭的基本走法（不檢查之後是否還有解）。
   * @param {number} c 編號索引。
   * @param {number} side 線頭（0 或 1）。
   * @returns {{c: number, side: number, cell: number}[]} 走法；cell 為 -1 表示接上另一個線頭。
   */
  movesOf(c, side) {
    if (this.done[c]) return [];
    const h = this.heads[c][side];
    const other = this.heads[c][1 - side];
    const out = [];
    for (const nb of this.adj[h]) {
      if (this.owner[nb] === -1) out.push({ c, side, cell: nb });
      else if (nb === other) out.push({ c, side, cell: -1 });
    }
    return out;
  }

  /**
   * 套用走法。
   * @param {{c: number, side: number, cell: number}} m 走法。
   */
  apply(m) {
    const { c, side, cell } = m;
    if (cell === -1) {
      this.done[c] = 1;
      this.headColor[this.heads[c][0]] = -1;
      this.headColor[this.heads[c][1]] = -1;
      this.history.push({ m, old: -1 });
      return;
    }
    const old = this.heads[c][side];
    this.owner[cell] = c;
    this.headColor[old] = -1;
    this.headColor[cell] = c;
    this.heads[c][side] = cell;
    this.trails[c][side].push(cell);
    this.empty--;
    this.history.push({ m, old });
  }

  /** 撤銷最後一個走法。 */
  undo() {
    const { m, old } = this.history.pop();
    const { c, side, cell } = m;
    if (cell === -1) {
      this.done[c] = 0;
      this.headColor[this.heads[c][0]] = c;
      this.headColor[this.heads[c][1]] = c;
      return;
    }
    this.owner[cell] = -1;
    this.headColor[cell] = -1;
    this.headColor[old] = c;
    this.heads[c][side] = old;
    this.trails[c][side].pop();
    this.empty++;
  }

  /**
   * 取得某編號目前的完整路徑（已連通時由端點 a 走到 b）。
   * @param {number} c 編號索引。
   * @returns {number[]} 格子序列。
   */
  pathOf(c) {
    const [fromA, fromB] = this.trails[c];
    return [...fromA, ...fromB.slice().reverse()];
  }

  /**
   * 計算空格的出口數：相鄰的空格與未連通編號的線頭。
   * @param {number} e 空格索引。
   * @returns {number} 出口數。
   */
  exits(e) {
    let count = 0;
    for (const nb of this.adj[e]) if (this.owner[nb] === -1 || this.headColor[nb] >= 0) count++;
    return count;
  }

  /**
   * 空格出口檢查：每個空格至少要有兩個出口，否則線無法經過它。
   * @returns {boolean} 全部空格都有足夠出口時為 true。
   */
  exitsOk() {
    for (let e = 0; e < this.n; e++) if (this.owner[e] === -1 && this.exits(e) < 2) return false;
    return true;
  }

  /**
   * 區域檢查：
   * - 每個未連通編號的兩個線頭須相鄰，或同時接觸到同一個空白區域；
   * - 每個空白區域都須有某個未連通編號的兩個線頭同時接觸它（才可能有線經過並填滿）。
   * @returns {boolean} 通過時為 true。
   */
  regionsOk() {
    const comp = new Int16Array(this.n).fill(-1);
    let count = 0;
    const queue = [];
    for (let s = 0; s < this.n; s++) {
      if (this.owner[s] !== -1 || comp[s] !== -1) continue;
      comp[s] = count;
      queue.length = 0;
      queue.push(s);
      while (queue.length) {
        const x = queue.pop();
        for (const nb of this.adj[x]) {
          if (this.owner[nb] === -1 && comp[nb] === -1) {
            comp[nb] = count;
            queue.push(nb);
          }
        }
      }
      count++;
    }
    if (count === 0) return this.done.every((d, c) => d === 1 || isAdjacent(this.size, this.heads[c][0], this.heads[c][1]));
    const served = new Uint8Array(count);
    for (let c = 0; c < this.k; c++) {
      if (this.done[c]) continue;
      const [a, b] = this.heads[c];
      const touchA = new Set();
      for (const nb of this.adj[a]) if (comp[nb] >= 0) touchA.add(comp[nb]);
      let shared = false;
      for (const nb of this.adj[b]) {
        if (comp[nb] >= 0 && touchA.has(comp[nb])) {
          served[comp[nb]] = 1;
          shared = true;
        }
      }
      if (!shared && !isAdjacent(this.size, a, b)) return false;
    }
    for (let r = 0; r < count; r++) if (!served[r]) return false;
    return true;
  }

  /**
   * 完整可行性檢查（解題器使用）：空格出口與區域檢查。
   * @returns {boolean} 可能還有解時為 true。
   */
  viable() {
    return this.exitsOk() && this.regionsOk();
  }
}

/**
 * 列出某線頭通過完整可行性檢查的走法。
 * @param {Board} board 盤面。
 * @param {number} c 編號索引。
 * @param {number} side 線頭。
 * @returns {{c: number, side: number, cell: number}[]} 可行走法。
 */
function viableMoves(board, c, side) {
  const out = [];
  for (const m of board.movesOf(c, side)) {
    board.apply(m);
    if (board.viable()) out.push(m);
    board.undo();
  }
  return out;
}

/**
 * 回溯搜尋：每層選擇可行走法最少的線頭，找到解答時呼叫 onSolution。
 * @param {Board} board 盤面。
 * @param {(board: Board) => boolean} onSolution 找到解答時呼叫，回傳 true 表示停止搜尋。
 * @param {{nodes: number}} budget 搜尋節點上限（超過時拋出錯誤），避免極端情況卡住。
 */
function search(board, onSolution, budget) {
  let nodes = 0;
  let stop = false;
  /** 遞迴搜尋。 */
  const walk = () => {
    if (++nodes > budget.nodes) throw new Error('budget');
    if (board.solved()) {
      stop = onSolution(board);
      return;
    }
    let best = null;
    for (let c = 0; c < board.k; c++) {
      if (board.done[c]) continue;
      for (let side = 0; side < 2; side++) {
        const moves = viableMoves(board, c, side);
        if (!moves.length) return;
        if (!best || moves.length < best.length) best = moves;
        if (best.length === 1) break;
      }
      if (best && best.length === 1) break;
    }
    if (!best) return;
    for (const m of best) {
      board.apply(m);
      walk();
      board.undo();
      if (stop) return;
    }
  };
  if (board.viable()) walk();
}

/**
 * 以回溯法計算解答數量，找到 limit 組即停止。
 * @param {number} size 盤面邊長。
 * @param {number[][]} ends 每對端點。
 * @param {number} [limit=2] 最多計算幾組。
 * @param {{nodes: number}} [budget] 搜尋節點上限。
 * @returns {number} 解答數量（最多 limit）。
 */
export function countSolutions(size, ends, limit = 2, budget = { nodes: Infinity }) {
  let found = 0;
  search(new Board(size, ends), () => ++found >= limit, budget);
  return found;
}

/**
 * 求出一組解答。
 * @param {number} size 盤面邊長。
 * @param {number[][]} ends 每對端點。
 * @returns {number[][] | null} 每對端點由 a 走到 b 的路徑，無解時為 null。
 */
export function solve(size, ends) {
  let result = null;
  search(
    new Board(size, ends),
    (board) => {
      result = ends.map((_, c) => board.pathOf(c));
      return true;
    },
    { nodes: Infinity },
  );
  return result;
}
