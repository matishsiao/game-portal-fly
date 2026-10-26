// 出題器的單元測試：同盤相容規則、常見度與題型、優先順序、不足時放寬。

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRound, compatible, candidatePool, DIFFICULTIES, DIFFICULTY_KEYS, MIX, REVIEW, seededRng } from '../src/js/deck.js';

/**
 * 產生測試用單字。
 * @param {number} n 數量。
 * @param {string} cat 分類。
 * @returns {object[]} 單字。
 */
function makeWords(n, cat = 'food') {
  const pos = ['n.', 'v.', 'adj.'];
  return Array.from({ length: n }, (_, i) => ({
    id: `${cat}-${i}`,
    en: `${String.fromCharCode(97 + (i % 26))}word${i}`,
    pos: pos[i % 3],
    zh: `中文${cat}${i}`,
    categories: [cat],
    level: (i % 3) + 1,
    syn: i % 10 === 0 ? `grp${Math.floor(i / 20)}` : '',
  }));
}

test('compatible：同義群組、相同中文、同一英文字的不同詞性不可同盤', () => {
  const a = { id: 'big', en: 'big', zh: '大的', syn: 'big' };
  assert.equal(compatible(a, { id: 'large', en: 'large', zh: '巨大的', syn: 'big' }), false);
  assert.equal(compatible(a, { id: 'huge', en: 'huge', zh: '大的', syn: '' }), false);
  assert.equal(compatible(a, { id: 'big-v', en: 'Big', zh: '變大', syn: '' }), false);
  assert.equal(compatible(a, { id: 'small', en: 'small', zh: '小的', syn: '' }), true);
});

for (const key of DIFFICULTY_KEYS) {
  test(`generateRound(${key})：盤數、配對數、常見度與同盤規則`, () => {
    const words = [...makeWords(90, 'food'), ...makeWords(90, 'drinks')];
    const byId = new Map(words.map((w) => [w.id, w]));
    const cfg = DIFFICULTIES[key];
    for (let s = 1; s <= 30; s++) {
      const { boards } = generateRound(words, { source: 'food', difficulty: key, rng: seededRng(s) });
      assert.equal(boards.length, cfg.boards);
      const all = boards.flatMap((b) => b.ids);
      assert.equal(new Set(all).size, all.length, '同一局不重複');
      for (const b of boards) {
        assert.equal(b.ids.length, cfg.pairs);
        assert.deepEqual([...b.left].sort(), [...b.ids].sort());
        assert.deepEqual([...b.right].sort(), [...b.ids].sort());
        const ws = b.ids.map((id) => byId.get(id));
        for (const w of ws) {
          assert.ok(w.categories.includes('food'));
          assert.ok(cfg.levels.includes(w.level));
        }
        for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) assert.ok(compatible(ws[i], ws[j]));
        if (cfg.samePos) assert.equal(new Set(ws.map((w) => w.pos)).size, 1, '困難以上同盤同詞性（數量足夠時）');
      }
    }
  });
}

test('優先出尚未學過的單字，其次待複習', () => {
  const words = makeWords(60, 'food').map((w) => ({ ...w, level: 1, pos: 'n.' }));
  const book = {};
  words.forEach((w, i) => {
    if (i >= 20) book[w.id] = { seen: 3, learned: true, lastSeen: 100 };
  });
  const { boards } = generateRound(words, { source: 'food', difficulty: 'easy', book, rng: seededRng(3) });
  const ids = boards.flatMap((b) => b.ids);
  assert.ok(ids.every((id) => Number(id.split('-')[1]) < 20), '20 個未學過的單字優先全部用上');
});

test('常見度不足時放寬到相鄰常見度；綜合與待複習來源', () => {
  const words = makeWords(40, 'food');
  const { pool, widened } = candidatePool(words, 'food', 'easy');
  assert.equal(widened, true);
  assert.ok(pool.some((w) => w.level === 2));
  const mix = candidatePool([...makeWords(60, 'food'), ...makeWords(60, 'drinks')], MIX, 'medium');
  assert.ok(mix.pool.some((w) => w.categories.includes('drinks')));
  const book = { 'food-0': { review: true, seen: 1 } };
  const review = candidatePool(makeWords(90, 'food'), REVIEW, 'easy', book);
  assert.ok(review.pool.some((w) => w.id === 'food-0'));
  assert.equal(review.widened, true);
});

test('單字不足一局時拋出錯誤', () => {
  assert.throws(() => generateRound(makeWords(10), { source: 'food', difficulty: 'expert', rng: seededRng(1) }));
});

test('同義群組陣列：任一群組相同就不能同盤', () => {
  const run = { id: 'run-v', en: 'run', zh: '跑步', syn: ['emergency:hurry', 'sports:run'] };
  assert.equal(compatible(run, { id: 'jog-v', en: 'jog', zh: '慢跑', syn: ['sports:run'] }), false);
  assert.equal(compatible(run, { id: 'swim-v', en: 'swim', zh: '游泳', syn: ['sports:swim'] }), true);
});
