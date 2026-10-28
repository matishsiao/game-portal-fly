// 挑題測試：綜合練習四個主題都有、排序與分類題至少各 1 題、科學卡不重複；單元練習只出該單元；預習選擇題在前；今日複習只出到期題目。

import test from 'node:test';
import assert from 'node:assert/strict';
import { pickRound, dueCount, MAX_PER_TYPE, MIN_REVIEW } from '../src/js/science/pick.js';
import { TOPICS } from '../src/js/science/bank.js';

/** 測試用的今天。 */
const TODAY = '2026-10-28';

/**
 * 產生測試用的假題庫：每個主題兩個單元，每個單元選擇題、排序題、分類題若干，每題一張不同的科學卡。
 * @param {number} perCell 每個「單元 × 題型」的題數（選擇題為 3 倍）。
 * @returns {object[]} 題目。
 */
function fakeBank(perCell) {
  const qs = [];
  let n = 1;
  for (const topic of TOPICS) {
    for (const u of [1, 2]) {
      for (const type of ['choice', 'choice', 'choice', 'order', 'sort']) {
        for (let i = 0; i < perCell; i++) {
          const id = `medium-${String(n++).padStart(3, '0')}`;
          qs.push({ id, difficulty: 'medium', topic, unit: `m-${topic}-${u}`, type, card: `card-${id}` });
        }
      }
    }
  }
  return qs;
}

/**
 * 固定的亂數產生器。
 * @param {number} seed 種子。
 * @returns {() => number} 亂數產生器。
 */
const rngOf = (seed) => {
  let a = seed;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
};

test('綜合練習：每局 8 題、四個主題都有、排序與分類各 1～2 題、科學卡不重複', () => {
  const qs = fakeBank(2);
  for (let seed = 1; seed <= 40; seed++) {
    const ids = pickRound({ difficulty: 'medium', mode: 'mixed', questions: qs, today: TODAY, rng: rngOf(seed) });
    const picked = ids.map((id) => qs.find((q) => q.id === id));
    assert.equal(ids.length, 8);
    for (const t of TOPICS) assert.ok(picked.some((q) => q.topic === t), `缺少主題 ${t}`);
    for (const type of ['order', 'sort']) {
      const n = picked.filter((q) => q.type === type).length;
      assert.ok(n >= 1 && n <= MAX_PER_TYPE[type], `${type} ${n} 題`);
    }
    assert.equal(new Set(picked.map((q) => q.card)).size, 8);
  }
});

test('練習：只出該單元，排序與分類各至少 1 題；答錯過的優先於已熟練的', () => {
  const qs = fakeBank(2);
  const unit = 'm-earth-1';
  const inUnit = qs.filter((q) => q.unit === unit);
  const record = {};
  for (const q of inUnit) record[q.id] = { seen: 1, last: 10, review: false, box: 3, due: '2026-12-01' };
  const wrong = inUnit[1];
  record[wrong.id] = { seen: 1, last: 10, review: true, box: 1, due: '2026-12-01' };
  const ids = pickRound({ difficulty: 'medium', mode: 'practice', unit, questions: qs, record, today: TODAY, rng: rngOf(4) });
  assert.equal(ids.length, 8);
  for (const id of ids) assert.equal(qs.find((q) => q.id === id).unit, unit);
  assert.ok(ids.includes(wrong.id), '答錯過的題目應優先');
  for (const type of ['order', 'sort']) assert.ok(ids.some((id) => qs.find((q) => q.id === id).type === type));
});

test('預習：沒出現過的優先，選擇題排在前面', () => {
  const qs = fakeBank(2);
  const unit = 'm-life-1';
  const inUnit = qs.filter((q) => q.unit === unit);
  const record = { [inUnit[0].id]: { seen: 1, last: 10, review: false, box: 2, due: '2026-12-01' } };
  const ids = pickRound({ difficulty: 'medium', mode: 'preview', unit, questions: qs, record, today: TODAY, rng: rngOf(9) });
  assert.ok(!ids.includes(inUnit[0].id), '出現過的題目不應優先');
  const types = ids.map((id) => qs.find((q) => q.id === id).type);
  const firstOther = types.findIndex((t) => t !== 'choice');
  assert.ok(types.slice(firstOther).every((t) => t !== 'choice'), '選擇題應排在前面');
});

test('今日複習：只出到期的題目；不足 MIN_REVIEW 題時不開局；到期題數正確', () => {
  const qs = fakeBank(1);
  const record = {};
  qs.slice(0, 5).forEach((q) => { record[q.id] = { seen: 1, last: 1, review: false, box: 2, due: '2026-10-27' }; });
  qs.slice(5, 9).forEach((q) => { record[q.id] = { seen: 1, last: 1, review: false, box: 3, due: '2026-11-03' }; });
  assert.equal(dueCount('medium', qs, record, TODAY), 5);
  const ids = pickRound({ difficulty: 'medium', mode: 'review', questions: qs, record, today: TODAY, rng: rngOf(2) });
  assert.deepEqual(new Set(ids), new Set(qs.slice(0, 5).map((q) => q.id)));
  const few = {};
  qs.slice(0, MIN_REVIEW - 1).forEach((q) => { few[q.id] = { seen: 1, last: 1, review: false, box: 1, due: TODAY }; });
  assert.deepEqual(pickRound({ difficulty: 'medium', mode: 'review', questions: qs, record: few, today: TODAY, rng: rngOf(3) }), []);
});
