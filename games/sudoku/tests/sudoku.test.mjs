// 出題器、解題器與難度判定的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGrid, gridToString, hashPuzzle, seededRng, UNITS } from '../src/js/sudoku/core.js';
import { countSolutions, solve, generateSolution } from '../src/js/sudoku/solver.js';
import { gradePuzzle } from '../src/js/sudoku/logic.js';
import { generatePuzzle, DIFFICULTIES, DIFFICULTY_KEYS } from '../src/js/sudoku/generator.js';

const EASY = '003020600900305001001806400008102900700000008006708200002609500800203009005010300';

/**
 * 檢查完整盤面是否符合數獨規則。
 * @param {number[]} grid 完整盤面。
 * @returns {boolean} 每個單位都恰好含 1～9 時為 true。
 */
function isValidSolution(grid) {
  return UNITS.every((unit) => new Set(unit.map((i) => grid[i])).size === 9 && unit.every((i) => grid[i] >= 1));
}

test('countSolutions 能辨識唯一解、多解與無解', () => {
  const grid = parseGrid(EASY);
  assert.equal(countSolutions(grid), 1);
  const open = grid.slice();
  open.fill(0, 0, 27);
  assert.equal(countSolutions(open), 2);
  const broken = grid.slice();
  broken[0] = 3;
  assert.equal(countSolutions(broken), 0);
});

test('solve 與 generateSolution 產生合法完整盤面', () => {
  assert.ok(isValidSolution(solve(parseGrid(EASY))));
  assert.ok(isValidSolution(generateSolution(seededRng(1))));
});

test('gradePuzzle 判定只需 Single 的題目為簡單', () => {
  const result = gradePuzzle(parseGrid(EASY));
  assert.equal(result.solved, true);
  assert.equal(result.level, 1);
});

test('parseGrid／gridToString 互轉且雜湊穩定', () => {
  assert.equal(gridToString(parseGrid(EASY)), EASY);
  assert.equal(hashPuzzle(EASY), hashPuzzle(EASY));
  assert.notEqual(hashPuzzle(EASY), hashPuzzle(EASY.replace('3', '0')));
});

for (const key of DIFFICULTY_KEYS) {
  test(`generatePuzzle(${key}) 產生唯一解且難度正確，所有推論都正確`, () => {
    const rng = seededRng(42 + key.length);
    const cfg = DIFFICULTIES[key];
    for (let n = 0; n < 15; n++) {
      const { puzzle, solution, hash } = generatePuzzle(key, { rng });
      const grid = parseGrid(puzzle);
      const sol = parseGrid(solution);
      assert.equal(hash, hashPuzzle(puzzle));
      assert.ok(isValidSolution(sol));
      assert.ok(grid.every((d, i) => d === 0 || d === sol[i]));
      assert.equal(countSolutions(grid), 1);
      const givens = grid.filter(Boolean).length;
      assert.ok(givens >= cfg.givens[0] && givens <= cfg.givens[1], `給定數字 ${givens}`);
      const grade = gradePuzzle(grid, 4, { verify: sol });
      assert.equal(grade.solved, true);
      assert.equal(grade.level, cfg.level);
    }
  });
}

test('所有技巧在大量隨機盤面上都不產生錯誤推論', () => {
  const rng = seededRng(7);
  const used = {};
  for (let n = 0; n < 150; n++) {
    const sol = generateSolution(rng);
    // 隨機挖到只剩 22～26 個數字，製造需要進階技巧的盤面。
    const grid = sol.slice();
    const order = Array.from({ length: 81 }, (_, i) => i).sort(() => rng() - 0.5);
    let givens = 81;
    for (const i of order) {
      if (givens <= 22) break;
      grid[i] = 0;
      if (countSolutions(grid) !== 1) grid[i] = sol[i];
      else givens--;
    }
    const grade = gradePuzzle(grid, 4, { verify: sol });
    for (const [name, c] of Object.entries(grade.used)) used[name] = (used[name] || 0) + c;
  }
  for (const name of ['X-Wing', 'XY-Wing', 'Unique Rectangle', 'X-Chain', 'XY-Chain']) {
    assert.ok(used[name] > 0, `${name} 未被觸發，無法驗證`);
  }
});

test('generatePuzzle 會避開排除清單中的題目', () => {
  const first = generatePuzzle('easy', { rng: seededRng(99) });
  const second = generatePuzzle('easy', { rng: seededRng(99), exclude: [first.hash] });
  assert.notEqual(second.hash, first.hash);
});
