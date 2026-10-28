// 批次驗收出題：每個難度 × 每個 Level 各產生 ROUNDS 局，檢查單字不重複、意思不重複、字母方塊與干擾字母正確、答案唯一與出題時間。
// 用法：node scripts/check-puzzles.mjs（先執行 npm run words 產生 src/data/）

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { DIFFICULTIES, DIFFICULTY_KEYS, ROUND_SIZE, generateRound, meaningIndex, lettersOf, sameMeaning, samePos, relatedWords, canSpell } from '../src/js/deck.js';
import { LEVELS, unpackLevel, blankExample } from '../src/js/lexicon.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 每個組合產生的局數。 */
const ROUNDS = 100;
/** 每局出題的時間上限（毫秒）。 */
const LIMIT_MS = 50;

const words = LEVELS.flatMap((lv) => unpackLevel(lv, JSON.parse(readFileSync(join(ROOT, `src/data/level-${lv}.json`), 'utf8'))));
const byId = new Map(words.map((w) => [w.id, w]));
const index = meaningIndex(words);
let failed = 0;

/**
 * 記錄一個錯誤。
 * @param {string} where 位置。
 * @param {string} message 說明。
 */
function fail(where, message) {
  failed++;
  if (failed <= 30) console.log(`  ✕ ${where}：${message}`);
}

// 每個單字的例句都要能挖空（否則出題線索會露出答案）。
for (const w of words) if (blankExample(w) === w.example) fail(w.id, '例句挖空失敗');

for (const difficulty of DIFFICULTY_KEYS) {
  const d = DIFFICULTIES[difficulty];
  for (const level of LEVELS) {
    if (!words.some((w) => w.level === level)) continue;
    let slowest = 0;
    for (let r = 0; r < ROUNDS; r++) {
      const where = `${d.label} Level ${level} 第 ${r + 1} 局`;
      const t0 = performance.now();
      const { items } = generateRound(words, { range: level, difficulty, index });
      slowest = Math.max(slowest, performance.now() - t0);
      if (items.length !== ROUND_SIZE) fail(where, `只有 ${items.length} 個單字`);
      const ws = items.map((it) => byId.get(it.id));
      if (new Set(ws.map((w) => w.id)).size !== ws.length) fail(where, '單字重複');
      for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) if (sameMeaning(ws[i], ws[j])) fail(where, `${ws[i].en} 與 ${ws[j].en} 意思相同`);
      for (const [k, it] of items.entries()) {
        const w = ws[k];
        const letters = lettersOf(w.en);
        if (it.tiles.length !== letters.length + d.decoys) fail(where, `${w.en} 的字母方塊數量不對`);
        if (!canSpell(it.tiles, letters)) fail(where, `${w.en} 的字母方塊拼不出答案`);
        const extra = it.tiles.slice();
        for (const ch of letters) extra.splice(extra.indexOf(ch), 1);
        if (extra.some((ch) => letters.includes(ch))) fail(where, `${w.en} 的干擾字母出現在答案中`);
        if (letters.length > 1 && it.tiles.slice(0, letters.length).join('') === letters) fail(where, `${w.en} 打亂後與答案相同`);
        for (const o of relatedWords(w, index)) {
          if (!samePos(o, w) && lettersOf(o.en).length === letters.length && canSpell(it.tiles, lettersOf(o.en))) fail(where, `${w.en} 的方塊拼得出意思相同但詞性不同的 ${o.en}`);
        }
      }
    }
    if (slowest > LIMIT_MS) fail(`${d.label} Level ${level}`, `最慢 ${slowest.toFixed(1)} 毫秒，超過 ${LIMIT_MS} 毫秒`);
    console.log(`${failed ? '…' : '✓'} ${d.label}・Level ${level}：${ROUNDS} 局，最慢 ${slowest.toFixed(1)} 毫秒`);
  }
}
console.log(failed ? `✕ 共 ${failed} 個問題` : `✓ 全部合格（詞庫 ${words.length} 個單字）`);
process.exit(failed ? 1 : 0);
