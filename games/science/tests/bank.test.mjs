// 題庫檢查：每題格式正確、提示不洩題、科學卡齊全且都被題目連到。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertQuestion, assertCard, longestShare, MAX_LONGEST_SHARE } from './helpers.mjs';

/** 題庫內容。 */
const bank = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
/** 科學卡內容。 */
const cards = JSON.parse(readFileSync(new URL('../src/data/cards.json', import.meta.url), 'utf8'));
/** 單元內容。 */
const units = JSON.parse(readFileSync(new URL('../src/data/units.json', import.meta.url), 'utf8'));

test('每題格式正確、提示不含正確答案、正確選項不明顯較長', () => {
  assert.equal(bank.v, 1);
  const ids = new Set(cards.cards.map((c) => c.id));
  const unitMap = new Map(units.units.map((u) => [u.id, u]));
  for (const q of bank.questions) assertQuestion(q, ids, unitMap);
});

test('單元 id 不重複、學習階段與分組代碼合法', () => {
  assert.equal(units.v, 1);
  const ids = units.units.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const u of units.units) {
    assert.ok(['easy', 'medium', 'expert'].includes(u.stage), u.id);
    assert.ok(['life', 'earth', 'matter', 'force', 'inquiry'].includes(u.topic), u.id);
    assert.ok(u.title && u.icon, u.id);
  }
});

test('題目 id 不重複', () => {
  const ids = bank.questions.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('每張科學卡格式正確、id 不重複、小實驗都有安全說明，且至少被一題連到', () => {
  assert.equal(cards.v, 1);
  const ids = cards.cards.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  const used = new Set(bank.questions.map((q) => q.card));
  for (const c of cards.cards) {
    assertCard(c);
    assert.ok(used.has(c.id), `科學卡 ${c.id} 沒有任何題目連到`);
  }
});

test('每個學習階段「正確選項字數最長」的選擇題不超過 30%', () => {
  for (const d of ['easy', 'medium', 'expert']) {
    const share = longestShare(bank.questions.filter((q) => q.difficulty === d));
    assert.ok(share <= MAX_LONGEST_SHARE, `${d}：${(share * 100).toFixed(1)}%`);
  }
});
