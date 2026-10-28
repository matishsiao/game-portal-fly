// 題庫測試：上架題庫的格式、用語、提示不洩題與排序年份；用語規則本身的檢查。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bankErrors, questionErrors, bannedIn } from '../scripts/bank-rules.mjs';
import { TEMPLATE_CARDS } from '../src/js/social/templates.js';

/** 上架題庫。 */
const bank = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
/** 上架知識卡。 */
const cards = JSON.parse(readFileSync(new URL('../src/data/cards.json', import.meta.url), 'utf8'));

test('上架題庫全部符合題庫規則，每張知識卡都被題目連到', () => {
  assert.equal(bank.v, 1);
  assert.equal(cards.v, 1);
  const errors = bankErrors(bank.questions, cards.cards, { requireLinked: true });
  assert.deepEqual(errors, []);
  const ids = new Set(cards.cards.map((c) => c.id));
  for (const c of TEMPLATE_CARDS) assert.ok(!ids.has(c.id), `模板知識卡 ${c.id} 與題庫重複`);
});

/**
 * 建立一題合格的選擇題，再依需要覆寫欄位。
 * @param {object} [over] 覆寫的欄位。
 * @returns {object} 題目。
 */
function sample(over = {}) {
  return {
    id: 'medium-001', difficulty: 'medium', subject: 'history', topic: 'japanese-era', grade: 5, type: 'choice',
    question: '日本統治時期興建嘉南大圳，主要是為了解決什麼問題？',
    options: [{ text: '灌溉用水不足' }, { text: '交通不便', hint: '大圳是運水的。' }, { text: '城市缺電', hint: '想想大圳的水流到哪裡。' }, { text: '海岸侵蝕', hint: '嘉南平原的農田需要什麼？' }],
    answer: 0, keys: ['大圳裡流的是什麼？', '平原上的農田最需要什麼？'], explain: '嘉南大圳把水引到農田灌溉。', card: 'c',
    ...over,
  };
}

test('規則：不使用的用語、會過期的說法、排序年份與正確選項長度都會被擋下', () => {
  const cardIds = new Set(['c']);
  assert.deepEqual(questionErrors(sample(), cardIds), []);
  assert.ok(questionErrors(sample({ question: '日據時期興建嘉南大圳，主要是為了什麼？' }), cardIds).some((e) => e.includes('日據')));
  assert.ok(questionErrors(sample({ explain: '目前的總統是誰' }), cardIds).some((e) => e.includes('目前')));
  assert.ok(questionErrors(sample({ grade: 7 }), cardIds).some((e) => e.includes('grade')));
  assert.ok(questionErrors(sample({ topic: 'climate' }), cardIds).some((e) => e.includes('不屬於科目')));
  const order = sample({ type: 'order', items: ['甲', '乙', '丙'], years: [1895, 1683, 1949] });
  assert.ok(questionErrors(order, cardIds).some((e) => e.includes('years 須嚴格遞增')));
  assert.deepEqual(questionErrors({ ...order, years: [1683, 1895, 1949] }, cardIds), []);
  const long = sample({ options: [{ text: '把水引到嘉南平原的農田灌溉使用' }, { text: '交通', hint: 'a' }, { text: '用電', hint: 'b' }, { text: '海岸', hint: 'c' }] });
  assert.ok(questionErrors(long, cardIds).some((e) => e.includes('正確選項明顯較長')));
  // 「大陸」用在地理名詞是正常的，不應被擋。
  assert.deepEqual(bannedIn('歐亞大陸的大陸型氣候'), []);
  assert.deepEqual(bannedIn('台灣'), ['台灣']);
});
