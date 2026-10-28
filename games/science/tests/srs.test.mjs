// 間隔複習測試：複習盒升降、下次複習日期（含跨月、跨年）、是否到期與單元進度。

import test from 'node:test';
import assert from 'node:assert/strict';
import { nextBox, dueDate, addDays, isDue, unitProgress, MAX_BOX } from '../src/js/science/srs.js';

test('一次答對盒子 ＋1（最多 5），答錯回到第 1 盒', () => {
  assert.equal(nextBox(0, true), 1);
  assert.equal(nextBox(3, true), 4);
  assert.equal(nextBox(MAX_BOX, true), MAX_BOX);
  assert.equal(nextBox(4, false), 1);
  assert.equal(nextBox(0, false), 1);
});

test('下次複習日期：第 1～5 盒分別隔 1、3、7、14、30 天，跨月跨年正確', () => {
  assert.equal(dueDate('2026-10-28', 1), '2026-10-29');
  assert.equal(dueDate('2026-10-28', 2), '2026-10-31');
  assert.equal(dueDate('2026-10-28', 3), '2026-11-04');
  assert.equal(dueDate('2026-12-25', 4), '2027-01-08');
  assert.equal(dueDate('2026-02-10', 5), '2026-03-12');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('到期：作答過且日期在今天以前；沒作答過的不算到期', () => {
  assert.equal(isDue({ box: 2, due: '2026-10-28' }, '2026-10-28'), true);
  assert.equal(isDue({ box: 2, due: '2026-10-29' }, '2026-10-28'), false);
  assert.equal(isDue({ box: 0, due: null }, '2026-10-28'), false);
  assert.equal(isDue(undefined, '2026-10-28'), false);
});

test('單元進度：未開始、練習中、已精熟（八成題目在第 2 盒以上）', () => {
  const qs = [...Array(10).keys()].map((i) => ({ id: `q${i}` }));
  assert.equal(unitProgress(qs, {}).status, 'new');
  const rec = {};
  for (let i = 0; i < 7; i++) rec[`q${i}`] = { box: 2 };
  rec.q7 = { box: 1 };
  assert.deepEqual(unitProgress(qs, rec), { status: 'learning', mastered: 7, tried: 8, total: 10 });
  rec.q7 = { box: 3 };
  assert.equal(unitProgress(qs, rec).status, 'mastered');
});
