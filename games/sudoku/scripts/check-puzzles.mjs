// 批次出題驗收：每個難度產生 N 題，驗證唯一解與技巧等級，並統計出題時間。
// 用法：node scripts/check-puzzles.mjs [每難度題數，預設 100] [難度...]

import { performance } from 'node:perf_hooks';
import { generatePuzzle, DIFFICULTIES, DIFFICULTY_KEYS } from '../src/js/sudoku/generator.js';
import { countSolutions } from '../src/js/sudoku/solver.js';
import { gradePuzzle } from '../src/js/sudoku/logic.js';
import { parseGrid } from '../src/js/sudoku/core.js';

const count = Number(process.argv[2]) || 100;
const keys = process.argv.length > 3 ? process.argv.slice(3) : DIFFICULTY_KEYS;
let failed = 0;

for (const key of keys) {
  const cfg = DIFFICULTIES[key];
  const times = [];
  let bad = 0;
  let givensMin = 81;
  let givensMax = 0;
  for (let n = 0; n < count; n++) {
    const t0 = performance.now();
    const { puzzle, solution } = generatePuzzle(key);
    times.push(performance.now() - t0);
    const grid = parseGrid(puzzle);
    const givens = grid.filter(Boolean).length;
    givensMin = Math.min(givensMin, givens);
    givensMax = Math.max(givensMax, givens);
    const unique = countSolutions(grid, 2) === 1;
    const grade = gradePuzzle(grid);
    const matches = Array.from(puzzle).every((ch, i) => ch === '0' || ch === solution[i]);
    if (!unique || !grade.solved || grade.level !== cfg.level || !matches) bad++;
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  console.log(
    `${cfg.label}（${key}）：${count} 題，失敗 ${bad}，給定 ${givensMin}～${givensMax}，` +
      `平均 ${avg.toFixed(0)} ms，P95 ${p95.toFixed(0)} ms，最慢 ${times[times.length - 1].toFixed(0)} ms`,
  );
  failed += bad;
}

process.exitCode = failed ? 1 : 0;
