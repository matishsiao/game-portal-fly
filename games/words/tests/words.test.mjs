// 詞庫的單元測試：每個分類檔通過驗證且已審閱、分類數量、總數上限與 id 唯一。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateFile } from '../scripts/validate-words.mjs';
import { WORDS, CATEGORIES } from '../src/js/words-data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data', 'words');
const categories = JSON.parse(readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8'));

test('每個分類都有審閱過的詞庫檔與審閱紀錄，且通過驗證', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, categories.length, '每個分類一個檔案');
  const reviews = new Set(readdirSync(join(ROOT, 'data', 'reviews')));
  for (const f of files) {
    assert.deepEqual(validateFile(join(DIR, f), { requireReviewed: true }), [], f);
    assert.ok(reviews.has(f.replace('.json', '.md')), `${f} 缺少審閱紀錄`);
  }
});

test('合併後的詞庫：id 唯一、總數不超過 5,000、每個分類至少 50 個', () => {
  const ids = WORDS.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(WORDS.length <= 5000);
  for (const c of CATEGORIES) assert.ok(c.count >= 50, `${c.name} 只有 ${c.count} 個`);
});
