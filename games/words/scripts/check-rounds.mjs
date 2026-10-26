// 出題驗收：每個分類、每個難度各產生 50 局，檢查同盤規則、同局不重複、配對數與常見度。
// 用法：node scripts/check-rounds.mjs [每組局數=50]

import { WORDS, CATEGORIES } from '../src/js/words-data.js';
import { generateRound, compatible, DIFFICULTIES, DIFFICULTY_KEYS, MIX } from '../src/js/deck.js';

const count = Number(process.argv[2]) || 50;
const byId = new Map(WORDS.map((w) => [w.id, w]));
let failed = 0;
let rounds = 0;
let widenedRounds = 0;
const sources = [...CATEGORIES.filter((c) => c.count > 0).map((c) => c.id), MIX];

for (const source of sources) {
  for (const key of DIFFICULTY_KEYS) {
    const cfg = DIFFICULTIES[key];
    for (let n = 0; n < count; n++) {
      let r;
      try {
        r = generateRound(WORDS, { source, difficulty: key });
      } catch (err) {
        console.log(`✕ ${source}／${key}：${err.message}`);
        failed++;
        break;
      }
      rounds++;
      if (r.widened) widenedRounds++;
      const all = r.boards.flatMap((b) => b.ids);
      const problems = [];
      if (r.boards.length !== cfg.boards) problems.push('盤數錯誤');
      if (new Set(all).size !== all.length) problems.push('同一局重複出題');
      for (const b of r.boards) {
        if (b.ids.length !== cfg.pairs) problems.push('配對數錯誤');
        const ws = b.ids.map((id) => byId.get(id));
        if (source !== MIX && ws.some((w) => !w.categories.includes(source))) problems.push('出現其他分類的單字');
        if (!r.widened && ws.some((w) => !cfg.levels.includes(w.level))) problems.push('常見度不符');
        for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) if (!compatible(ws[i], ws[j])) problems.push(`同盤不相容：${ws[i].en}／${ws[j].en}`);
      }
      if (problems.length) {
        failed++;
        console.log(`✕ ${source}／${key}：${[...new Set(problems)].join('、')}`);
      }
    }
  }
}
console.log(`共 ${rounds} 局（${sources.length} 個來源 × 4 難度 × ${count}），失敗 ${failed}，因單字不足而放寬常見度 ${widenedRounds} 局。`);
process.exitCode = failed ? 1 : 0;
