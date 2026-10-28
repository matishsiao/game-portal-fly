// 驗證題庫草稿或審閱定稿檔（格式為 { questions, cards }）：有錯誤時列出並以非 0 結束。題目可以連到其他批次定稿（data/bank/）的知識卡。
// 用法：node scripts/validate-bank.mjs <檔案…>

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { bankErrors } from './bank-rules.mjs';

const BANK = join(dirname(fileURLToPath(import.meta.url)), '..', 'data/bank');

/**
 * 其他批次定稿中的知識卡 id（新批次的題目可以沿用）；同名批次（自己的定稿）不算。
 * @param {string} file 正在驗證的檔案。
 * @returns {string[]} 知識卡 id。
 */
function knownCards(file) {
  if (!existsSync(BANK)) return [];
  return readdirSync(BANK)
    .filter((f) => f.endsWith('.json') && f !== basename(file))
    .flatMap((f) => (JSON.parse(readFileSync(join(BANK, f), 'utf8')).cards || []).map((c) => c.id));
}

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
  const errors = bankErrors(questions, cards, { requireLinked: true, knownCards: knownCards(file) });
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
