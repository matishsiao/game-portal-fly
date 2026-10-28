// 題庫格式檢查：每題格式正確、id 不重複、解題重點不洩題。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertQuestion, mentions } from './helpers.mjs';

/** 題庫內容。 */
const bank = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));

test('題庫每題格式正確且解題重點不洩題', () => {
  assert.equal(bank.v, 1);
  for (const q of bank.questions) assertQuestion(q);
});

test('題目 id 不重複且符合「難度-三位數」格式', () => {
  const ids = bank.questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const q of bank.questions) assert.match(q.id, new RegExp(`^${q.difficulty}-\\d{3}$`));
});

test('洩題檢查不會把「15 棵」當成「5 棵」', () => {
  assert.equal(mentions('一共 15 棵', '5 棵'), false);
  assert.equal(mentions('一共 5 棵', '5 棵'), true);
  assert.equal(mentions('答案 52', '5'), false);
});
