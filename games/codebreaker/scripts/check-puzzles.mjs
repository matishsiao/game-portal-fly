// 次數上限驗證與出題檢查：以參考策略確認每個難度的最差猜測次數 ≤ 次數上限 − 2，並確認連續出題不重複。
//   簡單、中等：對所有可能的密碼完整展開極小化最大剩餘數策略（比隨機抽樣更嚴格）。
//   困難、專家：隨機相符策略模擬 N 組隨機密碼（預設 2,000，固定亂數種子以便重現）。
// 用法：node scripts/check-puzzles.mjs [模擬局數，預設 2000] [難度...]

import { performance } from 'node:perf_hooks';
import { DIFFICULTIES, DIFFICULTY_KEYS, randomSecret, codeKey, isValidCode, seededRng } from '../src/js/codebreaker/core.js';
import { minimaxTree, simulateRandom } from '../src/js/codebreaker/strategy.js';

const games = Number(process.argv[2]) || 2000;
const keys = process.argv.length > 3 ? process.argv.slice(3) : DIFFICULTY_KEYS;
let failed = 0;

for (const key of keys) {
  const cfg = DIFFICULTIES[key];
  const t0 = performance.now();
  const r = key === 'easy' || key === 'medium' ? minimaxTree(cfg) : simulateRandom(cfg, games, seededRng(1));
  const ms = performance.now() - t0;
  const limitOk = r.worst <= cfg.maxGuesses - 2;
  // 連續出題 100 局：符合難度，且不與最近 50 局重複。
  const recent = [];
  let repeatOk = true;
  for (let n = 0; n < 100; n++) {
    const secret = randomSecret(cfg, Math.random, recent);
    if (!isValidCode(secret, cfg) || recent.includes(codeKey(secret))) repeatOk = false;
    recent.push(codeKey(secret));
    if (recent.length > 50) recent.shift();
  }
  console.log(
    `${cfg.label}（${key}）：${cfg.pegs} 位 ${cfg.colors} 色${cfg.repeat ? '可重複' : '不重複'}，` +
      `${r.games} 局，最差 ${r.worst} 次、平均 ${r.average.toFixed(2)} 次（上限 ${cfg.maxGuesses}），` +
      `${limitOk ? '合格' : '不合格'}；出題${repeatOk ? '不重複' : '有重複'}；${(ms / 1000).toFixed(1)} 秒`,
  );
  if (!limitOk || !repeatOk) failed++;
}

process.exitCode = failed ? 1 : 0;
