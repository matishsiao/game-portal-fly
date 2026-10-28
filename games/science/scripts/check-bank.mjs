// 題庫檢查：格式、提示不洩題、科學卡，並列出各難度的題數、主題與題型分布。
// 用法：node scripts/check-bank.mjs            檢查格式並列出數量（數量未達上架門檻只警告）
//       node scripts/check-bank.mjs --strict   數量未達上架門檻時也視為失敗
//       node scripts/check-bank.mjs --lint     另外列出需要人工判讀的提示（重複線索、「還是」句型）

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertQuestion, assertCard, countBank, countUnits, longestShare, lintHints, DIFFICULTIES, TOPICS, MAX_LONGEST_SHARE } from '../tests/helpers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 上架門檻：每個單元的題數與排序加分類題數、每個學習階段的排序題與分類題數，以及每張科學卡平均最多幾題。 */
const MIN = { unit: 10, interactive: 1, order: 10, sort: 10, questionsPerCard: 3 };

const strict = process.argv.includes('--strict');
const bank = JSON.parse(readFileSync(join(ROOT, 'src/data/questions.json'), 'utf8'));
const cards = JSON.parse(readFileSync(join(ROOT, 'src/data/cards.json'), 'utf8')).cards;
const errors = [];
const warnings = [];
const cardIds = new Set(cards.map((c) => c.id));
const units = JSON.parse(readFileSync(join(ROOT, 'src/data/units.json'), 'utf8')).units;
const unitMap = new Map(units.map((u) => [u.id, u]));

for (const q of bank.questions) {
  try {
    assertQuestion(q, cardIds, unitMap);
  } catch (err) {
    errors.push(err.message);
  }
}
const used = new Set(bank.questions.map((q) => q.card));
for (const c of cards) {
  try {
    assertCard(c);
    if (!used.has(c.id)) throw new Error(`科學卡 ${c.id} 沒有任何題目連到`);
  } catch (err) {
    errors.push(err.message);
  }
}

const counts = countBank(bank.questions);
const unitCounts = countUnits(bank.questions, units);
console.log('階段\t題數\t單元\t達標單元\t生命\t地球\t物質\t力電\t選擇\t排序\t分類');
for (const d of DIFFICULTIES) {
  const c = counts[d];
  const us = unitCounts.filter((x) => x.unit.stage === d);
  const ok = us.filter((x) => x.total >= MIN.unit && x.interactive >= MIN.interactive).length;
  console.log([d, c.total, us.length, ok, ...TOPICS.map((t) => c.topics[t]), c.types.choice, c.types.order, c.types.sort].join('\t'));
  for (const x of us) {
    if (x.total < MIN.unit) warnings.push(`${x.unit.id}（${x.unit.title}）：${x.total} 題，未達 ${MIN.unit} 題`);
    else if (x.interactive < MIN.interactive) warnings.push(`${x.unit.id}（${x.unit.title}）：沒有排序或分類題`);
  }
  const share = longestShare(bank.questions.filter((q) => q.difficulty === d));
  if (share > MAX_LONGEST_SHARE) errors.push(`${d}：正確選項字數最長的選擇題占 ${(share * 100).toFixed(1)}%，超過 ${MAX_LONGEST_SHARE * 100}%`);
  if (c.types.order < MIN.order) warnings.push(`${d}：排序題 ${c.types.order} 題，未達 ${MIN.order} 題`);
  if (c.types.sort < MIN.sort) warnings.push(`${d}：分類題 ${c.types.sort} 題，未達 ${MIN.sort} 題`);
}
console.log(`科學卡：${cards.length} 張（平均每張 ${(bank.questions.length / Math.max(1, cards.length)).toFixed(1)} 題）`);
if (bank.questions.length > cards.length * MIN.questionsPerCard) warnings.push(`科學卡太少：平均每張超過 ${MIN.questionsPerCard} 題`);
const verbose = process.argv.includes('--verbose');
if (!verbose && warnings.length > 12) {
  const n = warnings.length;
  warnings.splice(12, n, `……還有 ${n - 12} 項，加 --verbose 顯示全部`);
}

if (process.argv.includes('--lint')) {
  const notes = bank.questions.flatMap(lintHints);
  for (const n of notes) console.log(`· ${n}`);
  console.log(`需要人工判讀的提示：${notes.length} 項`);
}
for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✕ ${e}`);
if (errors.length || (strict && warnings.length)) {
  console.log('題庫檢查失敗');
  process.exit(1);
}
console.log(`題庫檢查通過（${bank.questions.length} 題、${cards.length} 張科學卡）${warnings.length ? '；數量尚未達上架門檻' : ''}`);
