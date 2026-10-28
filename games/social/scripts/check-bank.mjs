// 題庫檢查：格式、用語、提示不洩題、排序年份，並依難度列出科目、主題、題型與資料判讀題數。
// 用法：node scripts/check-bank.mjs            檢查格式並列出數量（數量未達門檻只警告）
//       node scripts/check-bank.mjs --release  首次上架門檻未達時視為失敗
//       node scripts/check-bank.mjs --full     列出與完整版目標的差距（不失敗）
//       node scripts/check-bank.mjs --dates    列出有時效性（asOf）的題目，供每年重新查核

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bankErrors, countBank, DIFFICULTIES } from './bank-rules.mjs';
import { SUBJECTS, TOPIC_INFO } from '../src/js/social/bank.js';
import { TEMPLATE_KEYS, TEMPLATE_CARDS } from '../src/js/social/templates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 首次上架門檻。 */
const RELEASE = { total: 200, subject: 60, topic: 10, typeRatio: 0.1, materialRatio: 0.15, cards: 300, templates: 5 };
/** 完整版目標。 */
const FULL = { total: 400, subject: 120, topic: 20, cards: 600 };

const args = process.argv.slice(2);
const questions = JSON.parse(readFileSync(join(ROOT, 'src/data/questions.json'), 'utf8')).questions;
const cards = JSON.parse(readFileSync(join(ROOT, 'src/data/cards.json'), 'utf8')).cards;

if (args.includes('--dates')) {
  const dated = questions.filter((q) => q.asOf);
  console.log(`有時效性的題目：${dated.length} 題（每年重新查核）`);
  for (const q of dated.sort((a, b) => a.asOf - b.asOf)) console.log(`  ${q.asOf}  ${q.id}  ${q.question.slice(0, 40)}`);
  process.exit(0);
}

const errors = bankErrors(questions, [...cards, ...TEMPLATE_CARDS], { requireLinked: false });
const counts = countBank(questions);
const warnings = [];
const gaps = [];
console.log('難度\t題數\t歷史\t地理\t公民\t選擇\t排序\t分類\t資料判讀');
for (const d of DIFFICULTIES) {
  const c = counts[d];
  console.log([d, c.total, ...SUBJECTS.map((s) => c.subjects[s]), c.types.choice, c.types.order, c.types.sort, c.material].join('\t'));
  if (c.total < RELEASE.total) warnings.push(`${d}：${c.total} 題，未達首次上架 ${RELEASE.total} 題`);
  for (const s of SUBJECTS) if (c.subjects[s] < RELEASE.subject) warnings.push(`${d}：${s} ${c.subjects[s]} 題，未達 ${RELEASE.subject} 題`);
  for (const [t, n] of Object.entries(c.topics)) if (n < RELEASE.topic) warnings.push(`${d}：主題 ${t} ${n} 題，未達 ${RELEASE.topic} 題`);
  for (const t of ['order', 'sort']) if (c.types[t] < c.total * RELEASE.typeRatio) warnings.push(`${d}：${t} ${c.types[t]} 題，未達 10%`);
  if ((d === 'hard' || d === 'expert') && c.material < c.total * RELEASE.materialRatio) warnings.push(`${d}：資料判讀 ${c.material} 題，未達 15%`);
  if (c.total < FULL.total) gaps.push(`${d}：還差 ${FULL.total - c.total} 題到完整版 ${FULL.total} 題`);
  for (const [t, n] of Object.entries(c.topics)) if (n < FULL.topic) gaps.push(`${d}：${TOPIC_INFO[t].label} 還差 ${FULL.topic - n} 題`);
}
console.log(`知識卡：${cards.length} 張；題型模板：${TEMPLATE_KEYS.length} 個`);
if (cards.length < RELEASE.cards) warnings.push(`知識卡 ${cards.length} 張，未達首次上架 ${RELEASE.cards} 張`);
if (TEMPLATE_KEYS.length < RELEASE.templates) warnings.push(`題型模板 ${TEMPLATE_KEYS.length} 個，未達 ${RELEASE.templates} 個`);
if (args.includes('--full')) for (const g of gaps) console.log(`… ${g}`);
for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✕ ${e}`);
if (errors.length || (args.includes('--release') && warnings.length)) {
  console.log('題庫檢查失敗');
  process.exit(1);
}
console.log(`題庫檢查通過（${questions.length} 題、${cards.length} 張知識卡）${warnings.length ? '；數量尚未達首次上架門檻' : ''}`);
