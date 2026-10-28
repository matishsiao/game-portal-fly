// 合併題庫：把審閱定稿 data/bank/*.json 的題目與知識卡合併為 src/data/questions.json 與 src/data/cards.json（held 的題目不上架）。
// 用法：node scripts/build-bank.mjs            只用審閱定稿（data/bank/）
//       node scripts/build-bank.mjs --draft    改用初稿（data/draft/），只供本機測試畫面，不可提交或部署

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bankErrors } from './bank-rules.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const draft = process.argv.includes('--draft');
const dir = join(ROOT, draft ? 'data/draft' : 'data/bank');
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^(easy|medium|hard|expert)-\d+\.json$/.test(f)).sort() : [];
const questions = [];
const cards = [];
for (const f of files) {
  const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  questions.push(...(data.questions || []));
  cards.push(...(data.cards || []));
}
// 只保留被題目連到的知識卡（held 的題目移走後，可能有卡片沒有題目連到）。
const used = new Set(questions.map((q) => q.card));
const linked = cards.filter((c) => used.has(c.id));
questions.sort((a, b) => a.id.localeCompare(b.id));
const errors = bankErrors(questions, linked, { requireLinked: true });
if (errors.length) {
  for (const e of errors.slice(0, 40)) console.error(`✕ ${e}`);
  console.error(`題庫合併失敗：${errors.length} 個錯誤`);
  process.exit(1);
}
/**
 * 以每題一行的格式寫出 JSON，方便比對差異。
 * @param {string} file 檔名。
 * @param {string} key 陣列欄位名稱。
 * @param {object[]} rows 資料。
 */
const write = (file, key, rows) => writeFileSync(join(ROOT, 'src/data', file), `{\n  "v": 1,\n  "${key}": [\n${rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n')}\n  ]\n}\n`);
write('questions.json', 'questions', questions);
write('cards.json', 'cards', linked);
console.log(`題庫：${questions.length} 題、${linked.length} 張知識卡${draft ? '（初稿，只供本機測試，不可提交）' : ''}`);
