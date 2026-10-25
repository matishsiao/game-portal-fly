// 關卡驗收：驗證全部關卡合法且可過關，列出每關最少步數與展開狀態數。
// 用法：node scripts/check-levels.mjs

import { CHAPTERS, readLevels, validateLevel, solveLevel } from './levels-lib.mjs';
import { LEVELS } from '../src/js/levels-data.js';
import { initialState, applyMove } from '../src/js/engine.js';

const levels = readLevels();
const errors = levels.flatMap(validateLevel);
const parById = new Map(LEVELS.map((l) => [l.id, l.par]));

for (const ch of CHAPTERS) {
  const list = levels.filter((l) => l.chapter === ch.chapter);
  console.log(`\n第 ${ch.chapter} 章 ${ch.title}（${list.length}/${ch.count} 關）`);
  if (list.length !== ch.count) errors.push(`第 ${ch.chapter} 章應有 ${ch.count} 關，實際 ${list.length} 關`);
  for (const [idx, level] of list.entries()) {
    if (errors.some((e) => e.startsWith(`${level.id}：`))) continue;
    const r = solveLevel(level);
    if (!r.solved) {
      errors.push(`${level.id}：無解（展開 ${r.states} 個狀態）`);
      continue;
    }
    // 重播最佳解，確認結果可重現。
    let s = initialState(level.rows);
    for (const m of r.moves) s = applyMove(s, m).state;
    if (!s.won) errors.push(`${level.id}：重播最佳解未過關`);
    if (idx < 5 && r.par > 30) errors.push(`${level.id}：章節前 5 關最少步數須不超過 30（目前 ${r.par}）`);
    if (parById.get(level.id) !== r.par) errors.push(`${level.id}：levels-data.js 的 par 已過期，請執行 npm run levels`);
    console.log(`  ${level.id} ${level.title.padEnd(10, '　')} 最少 ${String(r.par).padStart(3)} 步，狀態 ${r.states}`);
  }
}

if (errors.length) {
  console.error(`\n失敗：\n${errors.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\n全部關卡通過。');
}
