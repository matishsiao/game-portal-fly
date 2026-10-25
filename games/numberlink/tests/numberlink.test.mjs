// 盤面工具、完整解題器、邏輯解題器與出題器的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { neighbors, isAdjacent, isPath, isSolved, isValidPuzzle, hashPuzzle, seededRng } from '../src/js/numberlink/core.js';
import { countSolutions, solve } from '../src/js/numberlink/solver.js';
import { gradePuzzle } from '../src/js/numberlink/logic.js';
import { generatePuzzle, DIFFICULTIES, DIFFICULTY_KEYS } from '../src/js/numberlink/generator.js';
import { SIZE, ENDS, SOLUTION } from './fixtures.mjs';

/**
 * 不剪枝的暴力解題：依編號順序，從端點 a 以深度優先走到 b，最後檢查是否填滿。
 * @param {number} size 盤面邊長。
 * @param {number[][]} ends 每對端點。
 * @param {number} limit 最多計算幾組。
 * @returns {number} 解答數量（最多 limit）。
 */
function bruteCount(size, ends, limit) {
  const adj = neighbors(size);
  const owner = new Int8Array(size * size).fill(-1);
  ends.forEach(([a, b], c) => {
    owner[a] = c;
    owner[b] = c;
  });
  let found = 0;
  /**
   * 從 cur 延伸編號 c 的線。
   * @param {number} c 編號索引。
   * @param {number} cur 目前格子。
   */
  const walk = (c, cur) => {
    if (found >= limit) return;
    for (const nb of adj[cur]) {
      if (nb === ends[c][1]) {
        if (c + 1 < ends.length) walk(c + 1, ends[c + 1][0]);
        else if (owner.every((o) => o >= 0)) found++;
      } else if (owner[nb] === -1) {
        owner[nb] = c;
        walk(c, nb);
        owner[nb] = -1;
      }
    }
  };
  walk(0, ends[0][0]);
  return found;
}

test('相鄰判斷不會跨列', () => {
  assert.equal(isAdjacent(4, 3, 4), false);
  assert.equal(isAdjacent(4, 2, 3), true);
  assert.equal(isAdjacent(4, 1, 5), true);
  assert.equal(isAdjacent(4, 0, 5), false);
  assert.deepEqual(neighbors(4)[0], [1, 4]);
});

test('路徑與完整解答判斷', () => {
  assert.equal(isPath(SIZE, [0, 1, 2]), true);
  assert.equal(isPath(SIZE, [0, 2]), false);
  assert.equal(isPath(SIZE, [0, 1, 0]), false);
  assert.equal(isSolved(SIZE, ENDS, SOLUTION), true);
  assert.equal(isSolved(SIZE, ENDS, [SOLUTION[0], SOLUTION[1], [5, 6, 10]]), false, '未連到端點');
  assert.equal(isSolved(SIZE, ENDS, [SOLUTION[0].slice().reverse(), SOLUTION[1], SOLUTION[2]]), true, '方向不限');
  assert.equal(isValidPuzzle({ size: SIZE, ends: ENDS, solution: SOLUTION }), true);
  assert.equal(isValidPuzzle({ size: 3, ends: ENDS, solution: SOLUTION }), false);
  assert.equal(isValidPuzzle({ size: SIZE, ends: [[0, 15], [1, 11], [5, 5]], solution: SOLUTION }), false);
});

test('完整解題器的解答數與暴力搜尋一致', () => {
  const rng = seededRng(3);
  const cells = Array.from({ length: 16 }, (_, i) => i);
  let checked = 0;
  for (let t = 0; t < 300; t++) {
    const pairs = 2 + Math.floor(rng() * 3);
    const pick = cells.slice().sort(() => rng() - 0.5).slice(0, pairs * 2);
    const ends = [];
    for (let k = 0; k < pairs; k++) ends.push([pick[2 * k], pick[2 * k + 1]]);
    const expected = bruteCount(4, ends, 3);
    assert.equal(countSolutions(4, ends, 3), expected, JSON.stringify(ends));
    if (expected > 0) checked++;
  }
  assert.ok(checked > 10, '至少要比對到一些有解的盤面');
});

test('solve 找到的解答合法', () => {
  const p = generatePuzzle('medium', { rng: seededRng(11) });
  const paths = solve(p.size, p.ends);
  assert.ok(paths);
  assert.equal(isSolved(p.size, p.ends, paths), true);
});

test('gradePuzzle 解完的路徑即為唯一解', () => {
  const p = generatePuzzle('hard', { rng: seededRng(5) });
  const g = gradePuzzle(p.size, p.ends);
  assert.equal(g.solved, true);
  assert.equal(g.level, 3);
  assert.equal(isSolved(p.size, p.ends, g.paths), true);
  g.paths.forEach((path, k) => assert.deepEqual(path, p.solution[k]));
  assert.equal(gradePuzzle(p.size, p.ends, 2).solved, false, '限制在 L2 時解不完');
});

for (const key of DIFFICULTY_KEYS) {
  test(`generatePuzzle(${key}) 產生唯一解且難度正確的題目`, () => {
    const cfg = DIFFICULTIES[key];
    const rng = seededRng(42);
    for (let n = 0; n < 3; n++) {
      const p = generatePuzzle(key, { rng });
      assert.equal(isValidPuzzle(p), true);
      assert.ok(cfg.sizes.includes(p.size));
      const [minPairs, maxPairs] = cfg.pairs[p.size];
      assert.ok(p.ends.length >= minPairs && p.ends.length <= maxPairs);
      assert.ok(p.solution.every((path) => path.length >= 3));
      assert.ok(p.ends.every(([a, b]) => !isAdjacent(p.size, a, b)));
      assert.equal(countSolutions(p.size, p.ends, 2), 1);
      const g = gradePuzzle(p.size, p.ends);
      assert.equal(g.solved, true);
      assert.ok(g.level >= cfg.level[0] && g.level <= cfg.level[1]);
      assert.equal(p.hash, hashPuzzle(p));
    }
  });
}

test('generatePuzzle 不重複最近的題目', () => {
  const first = generatePuzzle('easy', { rng: seededRng(9) });
  const again = generatePuzzle('easy', { rng: seededRng(9), exclude: [first.hash] });
  assert.notEqual(again.hash, first.hash);
});
