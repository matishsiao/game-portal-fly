// 題庫與模板檢查：格式與洩題檢查、各模板批次產生，並列出各難度的題數、題型數與模板數。
// 用法：node scripts/check-bank.mjs            檢查格式並列出數量（數量未達上架門檻只警告）
//       node scripts/check-bank.mjs --strict   數量未達上架門檻時也視為失敗

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TEMPLATES, createRng, generateQuestion } from '../src/js/olympiad/templates.js';
import { DIFFICULTY_KEYS, DIFFICULTIES } from '../src/js/game.js';
import { assertQuestion } from '../tests/helpers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 上架門檻：每個難度的固定題數、題型數與模板數。 */
const MIN = { questions: 100, topics: 8, templates: 4 };
/** 每個模板批次產生的題數。 */
const TEMPLATE_RUNS = 2000;

const strict = process.argv.includes('--strict');
const bank = JSON.parse(readFileSync(join(ROOT, 'src/data/questions.json'), 'utf8'));
const errors = [];
const warnings = [];

const ids = new Set();
for (const q of bank.questions) {
  try {
    assertQuestion(q);
    if (ids.has(q.id)) throw new Error(`${q.id} id 重複`);
    ids.add(q.id);
  } catch (err) {
    errors.push(err.message);
  }
}

for (const key of Object.keys(TEMPLATES)) {
  const rng = createRng(2026);
  try {
    for (let i = 0; i < TEMPLATE_RUNS; i++) assertQuestion(generateQuestion(key, rng));
  } catch (err) {
    errors.push(`模板 ${key}：${err.message}`);
  }
}

console.log('難度\t固定題\t題型\t模板');
for (const d of DIFFICULTY_KEYS) {
  const qs = bank.questions.filter((q) => q.difficulty === d);
  const topics = new Set(qs.map((q) => q.topic)).size;
  const templates = Object.values(TEMPLATES).filter((t) => t.difficulty === d).length;
  console.log(`${DIFFICULTIES[d].label}\t${qs.length}\t${topics}\t${templates}`);
  if (qs.length < MIN.questions) warnings.push(`${DIFFICULTIES[d].label}：固定題 ${qs.length} 題，未達上架門檻 ${MIN.questions} 題`);
  if (topics < MIN.topics) warnings.push(`${DIFFICULTIES[d].label}：題型 ${topics} 種，未達上架門檻 ${MIN.topics} 種`);
  if (templates < MIN.templates) warnings.push(`${DIFFICULTIES[d].label}：模板 ${templates} 個，未達上架門檻 ${MIN.templates} 個`);
}

for (const w of warnings) console.log(`⚠ ${w}`);
for (const e of errors) console.log(`✕ ${e}`);
if (errors.length || (strict && warnings.length)) {
  console.log('題庫檢查失敗');
  process.exit(1);
}
console.log(`題庫檢查通過（格式 ${bank.questions.length} 題、模板 ${Object.keys(TEMPLATES).length} 個各 ${TEMPLATE_RUNS} 題）${warnings.length ? '；數量尚未達上架門檻' : ''}`);
