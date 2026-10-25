// 批次出題驗收：每個難度產生 N 題，驗證盤面大小、端點對數、路徑長度、唯一解與技巧等級，並統計出題時間。
// 用法：node scripts/check-puzzles.mjs [每難度題數，預設 100] [難度...]

import { performance } from 'node:perf_hooks';
import { generatePuzzle, DIFFICULTIES, DIFFICULTY_KEYS } from '../src/js/numberlink/generator.js';
import { isValidPuzzle, isAdjacent } from '../src/js/numberlink/core.js';
import { countSolutions } from '../src/js/numberlink/solver.js';
import { gradePuzzle } from '../src/js/numberlink/logic.js';

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
  if (!isValidPuzzle(p)) return ['題目資料不合法'];
  const problems = [];
  if (!cfg.sizes.includes(p.size)) problems.push(`盤面大小 ${p.size}`);
  const [minPairs, maxPairs] = cfg.pairs[p.size] || [0, 0];
  if (p.ends.length < minPairs || p.ends.length > maxPairs) problems.push(`端點對數 ${p.ends.length}`);
  if (p.solution.some((path) => path.length < 3)) problems.push('路徑少於 3 格');
  if (p.ends.some(([a, b]) => isAdjacent(p.size, a, b))) problems.push('端點相鄰');
  if (countSolutions(p.size, p.ends, 2) !== 1) problems.push('非唯一解');
  const g = gradePuzzle(p.size, p.ends);
  if (!g.solved || g.level < cfg.level[0] || g.level > cfg.level[1]) problems.push(`技巧等級 ${g.level}`);
  return problems;
}

for (const key of keys) {
  const cfg = DIFFICULTIES[key];
  const times = [];
  const reasons = new Map();
  const sizes = new Map();
  let bad = 0;
  for (let n = 0; n < count; n++) {
    const t0 = performance.now();
    const p = generatePuzzle(key);
    times.push(performance.now() - t0);
    sizes.set(p.size, (sizes.get(p.size) || 0) + 1);
    const problems = inspect(p, cfg);
    if (problems.length) {
      bad++;
      for (const r of problems) reasons.set(r, (reasons.get(r) || 0) + 1);
    }
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  const sizeText = [...sizes].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}×${s}:${n}`).join(' ');
  console.log(
    `${cfg.label}（${key}）：${count} 題，失敗 ${bad}，${sizeText}，` +
      `平均 ${avg.toFixed(0)} ms，P95 ${p95.toFixed(0)} ms，最慢 ${times[times.length - 1].toFixed(0)} ms`,
  );
  for (const [r, n] of reasons) console.log(`  ${r}：${n}`);
  failed += bad;
}

process.exitCode = failed ? 1 : 0;
