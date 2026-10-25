// 批次出題驗收：每個難度產生 N 題，驗證排版、數值限制、運算子、唯一解與技巧等級，並統計出題時間。
// 用法：node scripts/check-puzzles.mjs [每難度題數，預設 100] [難度...]

import { performance } from 'node:perf_hooks';
import { generatePuzzle, DIFFICULTIES, DIFFICULTY_KEYS } from '../src/js/crossmath/generator.js';
import { parseLayout, isValidPuzzle, bankCounts, evaluate } from '../src/js/crossmath/core.js';
import { countSolutions } from '../src/js/crossmath/solver.js';
import { gradePuzzle } from '../src/js/crossmath/logic.js';

const count = Number(process.argv[2]) || 100;
const keys = process.argv.length > 3 ? process.argv.slice(3) : DIFFICULTY_KEYS;
let failed = 0;

/**
 * 檢查一題是否符合該難度的所有規則。
 * @param {object} p 題目資料。
 * @param {object} cfg 難度設定。
 * @returns {string[]} 不符合的項目，空陣列表示全部通過。
 */
function inspect(p, cfg) {
  const problems = [];
  const ctx = parseLayout(p.size, p.layout);
  if (!ctx || !isValidPuzzle(p)) return ['題目資料不合法'];
  if (p.size !== cfg.size) problems.push('盤面大小');
  const eqCount = ctx.equations.length;
  if (eqCount < cfg.equations[0] || eqCount > cfg.equations[1]) problems.push(`算式數量 ${eqCount}`);
  const longCount = ctx.equations.filter((eq) => eq.ops.length === 2).length;
  if (longCount < cfg.minLong || (cfg.longChance === 0 && longCount > 0)) problems.push(`長算式 ${longCount}`);
  for (const eq of ctx.equations) {
    if (eq.ops.some((op) => !cfg.ops.includes(op))) problems.push('運算子');
    const nums = eq.nums.map((c) => p.solution[c]);
    if (nums.some((v) => v < 1 || v > cfg.max)) problems.push('數值範圍');
    if (evaluate(nums.slice(0, -1), eq.ops) !== nums[nums.length - 1]) problems.push('算式不成立');
  }
  const blanks = ctx.numberCells.filter((c) => p.givens[c] === 0).length;
  const ratio = blanks / ctx.numberCells.length;
  if (ratio < cfg.blanks[0] - 1e-9 || ratio > cfg.blanks[1] + 1e-9) problems.push(`空格比例 ${ratio.toFixed(2)}`);
  const bank = bankCounts(p);
  if (countSolutions(ctx, p.givens, bank, 2) !== 1) problems.push('非唯一解');
  const grade = gradePuzzle(ctx, p.givens, bank);
  if (!grade.solved || grade.level !== cfg.level) problems.push(`技巧等級 ${grade.level}`);
  return problems;
}

for (const key of keys) {
  const cfg = DIFFICULTIES[key];
  const times = [];
  const reasons = new Map();
  let bad = 0;
  for (let n = 0; n < count; n++) {
    const t0 = performance.now();
    const p = generatePuzzle(key);
    times.push(performance.now() - t0);
    const problems = inspect(p, cfg);
    if (problems.length) {
      bad++;
      for (const r of problems) reasons.set(r, (reasons.get(r) || 0) + 1);
    }
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  console.log(
    `${cfg.label}（${key}）：${count} 題，失敗 ${bad}，` +
      `平均 ${avg.toFixed(0)} ms，P95 ${p95.toFixed(0)} ms，最慢 ${times[times.length - 1].toFixed(0)} ms`,
  );
  for (const [r, n] of reasons) console.log(`  ${r}：${n}`);
  failed += bad;
}

process.exitCode = failed ? 1 : 0;
