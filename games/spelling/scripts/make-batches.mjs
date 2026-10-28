// 把 data/list.json 分成撰寫批次 data/batches/level-<n>-<批次>.json（每批最多 BATCH_SIZE 個單字），供撰寫 agent 使用。
// Level 1～2 全部分批；Level 3～6 先取 FIRST_RELEASE 個（依字母平均分布），其餘之後再補。
// 用法：node scripts/make-batches.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
/** 每批的單字數上限。 */
const BATCH_SIZE = 270;
/** 首次上架時 Level 3～6 每級的單字數。 */
const FIRST_RELEASE = 300;

/**
 * 從清單中依字母平均挑出 n 個（例如每 3 個取 1 個），避免集中在 a、b 開頭。
 * @param {object[]} rows 已依字母排序的單字。
 * @param {number} n 數量。
 * @returns {object[]} 挑出的單字。
 */
function spread(rows, n) {
  if (rows.length <= n) return rows;
  return Array.from({ length: n }, (_, i) => rows[Math.floor((i * rows.length) / n)]);
}

const list = JSON.parse(readFileSync(join(ROOT, 'data/list.json'), 'utf8'));
const dir = join(ROOT, 'data/batches');
mkdirSync(dir, { recursive: true });
// 已經產生過的批次不重新分（避免撰寫中的批次內容改變）。
const existing = existsSync(dir) ? readdirSync(dir) : [];
for (let level = 1; level <= 6; level++) {
  if (existing.some((f) => f.startsWith(`level-${level}-`))) continue;
  const rows = list.filter((w) => w.level === level).sort((a, b) => a.en.localeCompare(b.en));
  const picked = level <= 2 ? rows : spread(rows, FIRST_RELEASE);
  const count = Math.ceil(picked.length / BATCH_SIZE);
  for (let k = 0; k < count; k++) {
    const part = picked.filter((_, i) => i % count === k);
    const file = `level-${level}-${k + 1}.json`;
    writeFileSync(join(dir, file), `[\n${part.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n]\n`);
    console.log(`${file}：${part.length} 個`);
  }
}
