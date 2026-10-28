// 驗證題庫草稿或審閱定稿檔（格式為 { questions, cards }）：有錯誤時列出並以非 0 結束。
// 用法：node scripts/validate-bank.mjs <檔案…>

import { readFileSync } from 'node:fs';
import { bankErrors } from './bank-rules.mjs';

let failed = 0;
for (const file of process.argv.slice(2)) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.log(`✕ ${file}：JSON 格式錯誤（${err.message}）`);
    failed++;
    continue;
  }
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const cards = Array.isArray(data.cards) ? data.cards : [];
  const errors = bankErrors(questions, cards, { requireLinked: true });
  if (!questions.length) errors.push('沒有題目');
  if (errors.length) {
    failed++;
    console.log(`✕ ${file}：${errors.length} 個錯誤`);
    for (const e of errors.slice(0, 60)) console.log(`  - ${e}`);
  } else {
    console.log(`✓ ${file}：${questions.length} 題、${cards.length} 張知識卡`);
  }
}
process.exit(failed ? 1 : 0);
