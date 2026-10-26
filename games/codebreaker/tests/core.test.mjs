// 回饋計算、密碼列舉、候選篩選、出題與參考策略的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIFFICULTIES, feedback, feedbackCode, firstConflict, isValidCode, enumerateCodes, remainingAfterEach, randomSecret, codeKey, seededRng,
} from '../src/js/codebreaker/core.js';
import { minimaxTree, simulateRandom } from '../src/js/codebreaker/strategy.js';

// 顏色編號：紅 0、藍 1、綠 2、黃 3（與規格「規則」一節的範例相同）。
const R = 0;
const B = 1;
const G = 2;
const Y = 3;

test('規格範例：密碼 紅 紅 藍 綠', () => {
  const secret = [R, R, B, G];
  assert.deepEqual(feedback(secret, [R, B, R, Y]), { black: 1, white: 2 });
  assert.deepEqual(feedback(secret, [R, R, R, R]), { black: 2, white: 0 });
  assert.deepEqual(feedback(secret, [G, B, R, R]), { black: 0, white: 4 });
});

test('回饋：無重複、全中、全不中、猜測有重複、密碼有重複', () => {
  assert.deepEqual(feedback([0, 1, 2, 3], [0, 1, 2, 3]), { black: 4, white: 0 });
  assert.deepEqual(feedback([0, 1, 2, 3], [4, 5, 4, 5]), { black: 0, white: 0 });
  assert.deepEqual(feedback([0, 1, 2, 3], [3, 2, 1, 0]), { black: 0, white: 4 });
  assert.deepEqual(feedback([0, 1, 2, 3], [0, 0, 0, 0]), { black: 1, white: 0 }, '猜測重複只算一次');
  assert.deepEqual(feedback([0, 0, 1, 1], [1, 1, 0, 0]), { black: 0, white: 4 });
  assert.deepEqual(feedback([0, 0, 1, 1], [0, 1, 0, 1]), { black: 2, white: 2 });
  assert.deepEqual(feedback([5, 5, 5, 1], [1, 5, 2, 2]), { black: 1, white: 1 });
  assert.equal(feedbackCode([0, 0, 1, 1], [0, 1, 0, 1]), 22);
});

test('回饋具對稱性：交換密碼與猜測結果相同', () => {
  const rng = seededRng(1);
  for (let n = 0; n < 500; n++) {
    const a = Array.from({ length: 5 }, () => Math.floor(rng() * 8));
    const b = Array.from({ length: 5 }, () => Math.floor(rng() * 8));
    assert.deepEqual(feedback(a, b), feedback(b, a));
  }
});

test('列舉的密碼數量符合規格', () => {
  assert.equal(enumerateCodes(DIFFICULTIES.easy).count, 360);
  assert.equal(enumerateCodes(DIFFICULTIES.medium).count, 1296);
  assert.equal(enumerateCodes(DIFFICULTIES.hard).count, 32768);
  const easy = enumerateCodes(DIFFICULTIES.easy);
  for (let i = 0; i < easy.count; i++) {
    const code = Array.from(easy.digits.subarray(i * 4, i * 4 + 4));
    assert.equal(isValidCode(code, DIFFICULTIES.easy), true);
  }
});

test('firstConflict 找出第一個矛盾的猜測', () => {
  const secret = [0, 1, 2, 3];
  const history = [[4, 5, 0, 1], [0, 2, 1, 5]].map((code) => ({ code, ...feedback(secret, code) }));
  assert.equal(firstConflict(secret, history), -1, '密碼本身一定相符');
  assert.equal(firstConflict([4, 5, 0, 1], history), 0);
  // [1, 0, 4, 5]：對第 1 次 [4,5,0,1] 為 0 ● 4 ○，與真實回饋 0 ● 2 ○ 不符。
  assert.equal(firstConflict([1, 0, 4, 5], history), 0);
});

test('remainingAfterEach 與逐一檢查的結果一致', () => {
  const cfg = DIFFICULTIES.medium;
  const all = enumerateCodes(cfg);
  const secret = [2, 2, 5, 0];
  const history = [[0, 0, 1, 1], [2, 3, 4, 5], [2, 2, 0, 5]].map((code) => ({ code, ...feedback(secret, code) }));
  const counts = remainingAfterEach(cfg, history, all);
  history.forEach((_, k) => {
    let n = 0;
    for (let i = 0; i < all.count; i++) {
      const code = Array.from(all.digits.subarray(i * 4, i * 4 + 4));
      if (firstConflict(code, history.slice(0, k + 1)) < 0) n++;
    }
    assert.equal(counts[k], n);
  });
  assert.equal(counts[counts.length - 1] >= 1, true);
});

test('randomSecret 符合難度且避開排除的密碼', () => {
  const rng = seededRng(3);
  for (const key of Object.keys(DIFFICULTIES)) {
    for (let n = 0; n < 50; n++) assert.equal(isValidCode(randomSecret(DIFFICULTIES[key], rng), DIFFICULTIES[key]), true);
  }
  const cfg = DIFFICULTIES.easy;
  const first = randomSecret(cfg, seededRng(9));
  const again = randomSecret(cfg, seededRng(9), [codeKey(first)]);
  assert.notEqual(codeKey(again), codeKey(first));
});

test('參考策略：簡單與中等最差次數不超過上限 − 2', () => {
  for (const key of ['easy', 'medium']) {
    const r = minimaxTree(DIFFICULTIES[key]);
    assert.ok(r.worst <= DIFFICULTIES[key].maxGuesses - 2, `${key} 最差 ${r.worst}`);
  }
});

test('參考策略：困難少量模擬不超過上限 − 2', () => {
  const r = simulateRandom(DIFFICULTIES.hard, 100, seededRng(7));
  assert.ok(r.worst <= DIFFICULTIES.hard.maxGuesses - 2, `最差 ${r.worst}`);
});
