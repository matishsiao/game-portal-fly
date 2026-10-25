// 解題器：以廣度優先搜尋找出最少步數的解法；也提供不推動物件的走路路徑。

import { applyMove, stateKey } from './engine.js';

/** 搜尋時嘗試的操作順序。 */
const ORDER = ['L', 'R', 'U', 'D'];

/**
 * 以廣度優先搜尋找最少步數解。
 * @param {object} start 起始狀態。
 * @param {object} [options] 選項。
 * @param {number} [options.maxStates=2000000] 最多展開的狀態數。
 * @returns {{solved: boolean, moves: string[], states: number}} 是否有解、最佳解操作序列與展開狀態數。
 */
export function solve(start, { maxStates = 2000000 } = {}) {
  if (start.won) return { solved: true, moves: [], states: 1 };
  const parents = new Map([[stateKey(start), null]]);
  let frontier = [start];
  while (frontier.length && parents.size < maxStates) {
    const next = [];
    for (const s of frontier) {
      const key = stateKey(s);
      for (const m of ORDER) {
        const r = applyMove(s, m);
        if (!r.ok || r.state.dead) continue;
        const k = stateKey(r.state);
        if (parents.has(k)) continue;
        parents.set(k, [key, m]);
        if (r.state.won) return { solved: true, moves: tracePath(parents, k), states: parents.size };
        next.push(r.state);
      }
    }
    frontier = next;
  }
  return { solved: false, moves: [], states: parents.size };
}

/**
 * 從終點狀態沿父節點回推操作序列。
 * @param {Map<string, [string, string] | null>} parents 狀態鍵 → [父狀態鍵, 操作]。
 * @param {string} key 終點狀態鍵。
 * @returns {string[]} 操作序列。
 */
function tracePath(parents, key) {
  const moves = [];
  let k = key;
  while (parents.get(k)) {
    const [parent, m] = parents.get(k);
    moves.push(m);
    k = parent;
  }
  return moves.reverse();
}

/**
 * 找出滾滾走到目標格、途中不推動任何物件也不改變盤面的最短路徑（點選目的地用）。
 * @param {object} start 起始狀態。
 * @param {number} tx 目標橫座標。
 * @param {number} ty 目標縱座標。
 * @param {number} [maxDepth=80] 最多步數。
 * @returns {string[] | null} 操作序列；無法到達時為 null。
 */
export function walkPath(start, tx, ty, maxDepth = 80) {
  if (start.player.x === tx && start.player.y === ty) return [];
  const base = stateKey(start).split('|').slice(1).join('|');
  const parents = new Map([[stateKey(start), null]]);
  let frontier = [start];
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next = [];
    for (const s of frontier) {
      const key = stateKey(s);
      for (const m of ORDER) {
        const r = applyMove(s, m);
        if (!r.ok || r.state.dead) continue;
        const k = stateKey(r.state);
        // 物件與易碎磚的狀態必須不變（不推動、不觸發連鎖反應）。
        if (k.split('|').slice(1).join('|') !== base || parents.has(k)) continue;
        parents.set(k, [key, m]);
        if (r.state.player.x === tx && r.state.player.y === ty) return tracePath(parents, k);
        if (r.state.won) continue;
        next.push(r.state);
      }
    }
    frontier = next;
  }
  return null;
}
