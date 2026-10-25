// 星等與解鎖規則的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { starsFor, chapterUnlocked, levelUnlocked, chapterSummary, chapterLevels } from '../src/js/progress.js';
import { LEVELS } from '../src/js/levels-data.js';

test('星數：最少步數且未用提示 3 星；不超過 1.5 倍 2 星；其餘 1 星', () => {
  assert.equal(starsFor(10, 10, 0), 3);
  assert.equal(starsFor(10, 10, 1), 2, '用了提示最多 2 星');
  assert.equal(starsFor(15, 10, 0), 2);
  assert.equal(starsFor(16, 10, 0), 1);
  assert.equal(starsFor(11, 7, 0), 2, '1.5 倍無條件進位（7 × 1.5 = 10.5 → 11）');
});

test('解鎖：章節第一關開放，其餘依序；前一章第 15 關過關後解鎖下一章', () => {
  const ch1 = chapterLevels(1);
  assert.equal(levelUnlocked(ch1[0], {}), true);
  assert.equal(levelUnlocked(ch1[1], {}), false);
  assert.equal(levelUnlocked(ch1[1], { [ch1[0].id]: { stars: 1, bestSteps: 9 } }), true);
  assert.equal(chapterUnlocked(2, {}), false);
  assert.equal(chapterUnlocked(2, { '1-15': { stars: 1, bestSteps: 9 } }), true);
  const ch2 = chapterLevels(2);
  assert.equal(levelUnlocked(ch2[0], { '1-15': { stars: 1, bestSteps: 9 } }), true);
});

test('章節摘要計算星數、過關數與三星數', () => {
  const sum = chapterSummary(1, { '1-01': { stars: 3, bestSteps: 5 }, '1-02': { stars: 2, bestSteps: 6 } });
  assert.deepEqual([sum.stars, sum.cleared, sum.three, sum.total], [5, 2, 1, chapterLevels(1).length]);
});

test('每關都有最少步數，關卡 id 依章節排序且不重複', () => {
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [...ids].sort());
  for (const l of LEVELS) assert.ok(Number.isInteger(l.par) && l.par > 0, l.id);
});
