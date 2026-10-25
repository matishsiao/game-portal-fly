// 邏輯解題器：只用指定等級以下的技巧解題，以解完全盤所需的最高技巧等級判定難度。
//
// 技巧等級（由易到難）：
//   L1 唯一出路：某個線頭只剩一個基本走法（相鄰空格或接上另一線頭）。
//   L2 空格出口：空格只剩兩個出口且其中有線頭時，該線頭必走進此格；
//                或排除會讓任何空格出口少於兩個的走法後，線頭只剩一個走法（死路排除）。
//   L3 區域推論：再排除會讓同編號兩線頭被隔開、或留下無線可填的空白區域的走法後，線頭只剩一個走法。
//   L4 不繞回：再排除會形成 2 × 2 同色區塊的走法（解答唯一時必然成立）後，線頭只剩一個走法。

import { Board } from './solver.js';

/** 技巧等級名稱。 */
export const TECHNIQUES = { 1: '唯一出路', 2: '空格出口', 3: '區域推論', 4: '不繞回' };

/**
 * 判斷走法是否會讓該編號形成 2 × 2 同色區塊（走法須已套用到盤面上）。
 * @param {Board} board 盤面（已套用走法）。
 * @param {number} cell 剛走進的格子。
 * @param {number} c 編號索引。
 * @returns {boolean} 形成 2 × 2 同色區塊時為 true。
 */
function makesSquare(board, cell, c) {
  const size = board.size;
  const r = Math.floor(cell / size);
  const col = cell % size;
  for (const dr of [-1, 0]) {
    for (const dc of [-1, 0]) {
      const r0 = r + dr;
      const c0 = col + dc;
      if (r0 < 0 || c0 < 0 || r0 + 1 >= size || c0 + 1 >= size) continue;
      const tl = r0 * size + c0;
      if ([tl, tl + 1, tl + size, tl + size + 1].every((i) => board.owner[i] === c)) return true;
    }
  }
  return false;
}

/**
 * 依技巧等級篩選某個線頭的走法。
 * @param {Board} board 盤面。
 * @param {number} c 編號索引。
 * @param {number} side 線頭。
 * @param {number} level 篩選等級（2：空格出口、3：再加區域、4：再加不繞回）。
 * @returns {{c: number, side: number, cell: number}[]} 剩下的走法。
 */
function filteredMoves(board, c, side, level) {
  const out = [];
  for (const m of board.movesOf(c, side)) {
    board.apply(m);
    let ok = board.exitsOk();
    if (ok && level >= 3) ok = board.regionsOk();
    if (ok && level >= 4 && m.cell >= 0) ok = !makesSquare(board, m.cell, c);
    board.undo();
    if (ok) out.push(m);
  }
  return out;
}

/**
 * 套用一次指定等級的技巧。
 * @param {Board} board 盤面（會被修改）。
 * @param {number} level 技巧等級 1～4。
 * @returns {boolean | 'contradiction'} 有走出一步時為 true；發現矛盾時為 'contradiction'。
 */
function step(board, level) {
  if (level === 2) {
    // 空格只剩兩個出口：出口中的線頭必定走進這一格。
    for (let e = 0; e < board.n; e++) {
      if (board.owner[e] !== -1) continue;
      const exits = board.adj[e].filter((nb) => board.owner[nb] === -1 || board.headColor[nb] >= 0);
      if (exits.length < 2) return 'contradiction';
      if (exits.length !== 2) continue;
      const heads = exits.filter((nb) => board.headColor[nb] >= 0);
      if (!heads.length) continue;
      if (heads.length === 2 && board.headColor[heads[0]] !== board.headColor[heads[1]]) return 'contradiction';
      const h = heads[0];
      const c = board.headColor[h];
      board.apply({ c, side: board.heads[c][0] === h ? 0 : 1, cell: e });
      return true;
    }
  }
  for (let c = 0; c < board.k; c++) {
    if (board.done[c]) continue;
    for (let side = 0; side < 2; side++) {
      const moves = level === 1 ? board.movesOf(c, side) : filteredMoves(board, c, side, level);
      if (!moves.length) return 'contradiction';
      if (moves.length === 1) {
        board.apply(moves[0]);
        return true;
      }
    }
  }
  return false;
}

/**
 * 判定題目難度。
 * @param {number} size 盤面邊長。
 * @param {number[][]} ends 每對端點。
 * @param {number} [maxLevel=4] 允許使用的最高技巧等級。
 * @returns {{solved: boolean, level: number, used: number[], paths: number[][] | null}}
 *   是否解完、使用到的最高等級、各等級使用次數（索引 1～4），以及解完時的路徑。
 */
export function gradePuzzle(size, ends, maxLevel = 4) {
  const board = new Board(size, ends);
  const used = [0, 0, 0, 0, 0];
  let level = 0;
  while (!board.solved()) {
    let progressed = false;
    for (let L = 1; L <= maxLevel; L++) {
      const r = step(board, L);
      if (r === 'contradiction') return { solved: false, level, used, paths: null };
      if (r) {
        used[L]++;
        level = Math.max(level, L);
        progressed = true;
        break;
      }
    }
    if (!progressed) return { solved: false, level, used, paths: null };
  }
  return { solved: true, level, used, paths: ends.map((_, c) => board.pathOf(c)) };
}
