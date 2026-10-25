// 算式計算、骨架解析、解題器、難度判定與出題器的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, parseLayout, isValidPuzzle, bankCounts, hashPuzzle, seededRng } from '../src/js/crossmath/core.js';
import { countSolutions } from '../src/js/crossmath/solver.js';
import { gradePuzzle } from '../src/js/crossmath/logic.js';
import { generatePuzzle, DIFFICULTIES, DIFFICULTY_KEYS } from '../src/js/crossmath/generator.js';
import { LAYOUT, SOLUTION, GIVENS } from './fixtures.mjs';


test('evaluate 先乘除後加減、同級由左至右', () => {
  assert.equal(evaluate([2, 3, 4], ['+', 'x']), 14);
  assert.equal(evaluate([2, 3, 4], ['x', '+']), 10);
  assert.equal(evaluate([20, 4, 2], ['/', '/']), null);
  assert.equal(evaluate([24, 4, 2], ['/', '/']), 3);
  assert.equal(evaluate([10, 4, 3], ['-', '+']), 9);
  assert.equal(evaluate([10, 2, 3], ['+', 'x']), 16);
  assert.equal(evaluate([12, 3, 2], ['-', 'x']), 6);
});

test('evaluate 拒絕不整除、除以 0 與負數', () => {
  assert.equal(evaluate([7, 2], ['/']), null);
  assert.equal(evaluate([7, 0], ['/']), null);
  assert.equal(evaluate([3, 5], ['-']), null);
  assert.equal(evaluate([3, 5, 9], ['-', '+']), null);
  assert.equal(evaluate([5, 5], ['-']), 0);
});

test('parseLayout 找出全部算式並建立交叉關係', () => {
  const ctx = parseLayout(7, LAYOUT);
  assert.ok(ctx);
  assert.equal(ctx.equations.length, 4);
  assert.deepEqual(ctx.numberCells, [0, 2, 4, 14, 18, 28, 30, 32]);
  assert.equal(ctx.cellEquations[0].length, 2);
  assert.equal(ctx.cellEquations[2].length, 1);
});

test('parseLayout 拒絕不合法的排版', () => {
  const rows = (list) => list.join('');
  // 運算子後直接接數字以外的格子。
  assert.equal(parseLayout(7, rows(['#++=#..', '.......', '.......', '.......', '.......', '.......', '.......'])), null);
  // 兩條算式相連成無意義的長串。
  assert.equal(parseLayout(7, rows(['#+#=##.', '.......', '.......', '.......', '.......', '.......', '.......'])), null);
  // 互不連通的兩條算式。
  assert.equal(parseLayout(7, rows(['#+#=#..', '.......', '.......', '.......', '#+#=#..', '.......', '.......'])), null);
  // 孤立的數字格。
  assert.equal(parseLayout(7, rows(['#+#=#..', '.......', '......#', '.......', '.......', '.......', '.......'])), null);
  // 運算子同時屬於兩個方向（直向會形成長度 2 的連續格）。
  assert.equal(parseLayout(7, rows(['#+#=#..', '.#.....', '.......', '.......', '.......', '.......', '.......'])), null);
  // 大小不符。
  assert.equal(parseLayout(8, LAYOUT), null);
});

test('isValidPuzzle 檢查解答、給定數字與空格', () => {
  const p = { size: 7, layout: LAYOUT, givens: GIVENS, solution: SOLUTION };
  assert.equal(isValidPuzzle(p), true);
  assert.equal(isValidPuzzle({ ...p, givens: SOLUTION }), false);
  const wrong = SOLUTION.slice();
  wrong[2] = 5;
  assert.equal(isValidPuzzle({ ...p, solution: wrong, givens: wrong.map((v, i) => (i === 0 ? 0 : v)) }), false);
  assert.equal(isValidPuzzle({ ...p, givens: GIVENS.map((v, i) => (i === 2 ? 9 : v)) }), false);
});

test('數字庫為空格解答的多重集合', () => {
  const counts = bankCounts({ layout: LAYOUT, givens: GIVENS, solution: SOLUTION });
  assert.equal(counts[3], 2);
  assert.equal(counts[2], 1);
  assert.equal(counts.reduce((a, b) => a + b, 0), 3);
});

test('countSolutions 能辨識唯一解與多解', () => {
  const ctx = parseLayout(7, LAYOUT);
  const bank = bankCounts({ layout: LAYOUT, givens: GIVENS, solution: SOLUTION });
  assert.equal(countSolutions(ctx, GIVENS, bank), 1);
  // 只有一條 ? + ? = 7，數字庫 {3, 4}：兩種填法。
  const single = ['#+#=#..', '.......', '.......', '.......', '.......', '.......', '.......'].join('');
  const sctx = parseLayout(7, single);
  const givens = new Array(49).fill(0);
  givens[4] = 7;
  const b = new Array(100).fill(0);
  b[3] = 1;
  b[4] = 1;
  assert.equal(countSolutions(sctx, givens, b), 2);
  b[4] = 0;
  b[5] = 1;
  assert.equal(countSolutions(sctx, givens, b), 0);
});

test('gradePuzzle：只需直接計算的題目為 L1', () => {
  const ctx = parseLayout(7, LAYOUT);
  const bank = bankCounts({ layout: LAYOUT, givens: GIVENS, solution: SOLUTION });
  const g = gradePuzzle(ctx, GIVENS, bank);
  assert.equal(g.solved, true);
  assert.equal(g.level, 1);
});

test('gradePuzzle：多解題目無法以邏輯解完', () => {
  const single = ['#+#=#..', '.......', '.......', '.......', '.......', '.......', '.......'].join('');
  const givens = new Array(49).fill(0);
  givens[4] = 7;
  const b = new Array(100).fill(0);
  b[3] = 1;
  b[4] = 1;
  assert.equal(gradePuzzle(parseLayout(7, single), givens, b).solved, false);
});

test('gradePuzzle：限制最高等級時不使用更高技巧', () => {
  const p = generatePuzzle('hard', { rng: seededRng(7) });
  const ctx = parseLayout(p.size, p.layout);
  const bank = bankCounts(p);
  assert.equal(gradePuzzle(ctx, p.givens, bank).level, 3);
  assert.equal(gradePuzzle(ctx, p.givens, bank, 2).solved, false);
});

for (const key of DIFFICULTY_KEYS) {
  test(`generatePuzzle(${key}) 產生唯一解且難度正確的題目`, () => {
    const cfg = DIFFICULTIES[key];
    const rng = seededRng(42);
    for (let n = 0; n < 3; n++) {
      const p = generatePuzzle(key, { rng });
      assert.equal(isValidPuzzle(p), true);
      assert.equal(p.size, cfg.size);
      const ctx = parseLayout(p.size, p.layout);
      for (const eq of ctx.equations) {
        assert.ok(eq.ops.every((op) => cfg.ops.includes(op)));
        assert.ok(eq.nums.every((i) => p.solution[i] >= 1 && p.solution[i] <= cfg.max));
      }
      const bank = bankCounts(p);
      assert.equal(countSolutions(ctx, p.givens, bank), 1);
      const g = gradePuzzle(ctx, p.givens, bank);
      assert.equal(g.solved, true);
      assert.equal(g.level, cfg.level);
      assert.equal(p.hash, hashPuzzle(p));
    }
  });
}

test('generatePuzzle 不重複最近的題目', () => {
  const first = generatePuzzle('easy', { rng: seededRng(5) });
  const again = generatePuzzle('easy', { rng: seededRng(5), exclude: [first.hash] });
  assert.notEqual(again.hash, first.hash);
});
