// 詞庫索引、解題器與出題器的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../scripts/moe-source.mjs';
import { buildIndex, matchPattern } from '../src/js/idiom/data.js';
import { answersOf, wordCells } from '../src/js/idiom/board.js';
import { countSolutions, propagate, crossOnlyCells } from '../src/js/idiom/solver.js';
import { generateGame, DIFFICULTIES, DIFFICULTY_KEYS, isValidLayout, rankPool, seededRng, shuffle } from '../src/js/idiom/generator.js';

const read = (name) => JSON.parse(readFileSync(join(ROOT, 'src', 'data', name), 'utf8'));
const index = buildIndex({ idioms: read('idioms.json'), levels: read('idiom-levels.json'), check: read('idiom-check.json') });
const textOf = (id) => index.byId.get(id).text;
const idOf = (text) => index.idioms.find((i) => i.text === text).id;

/**
 * 建立單一成語的 1 × 4 盤面。
 * @param {string} text 成語。
 * @param {number[]} blanks 空格位置。
 * @param {string[]} bank 字庫。
 * @returns {object} 盤面。
 */
function single(text, blanks, bank) {
  return { rows: 1, cols: 4, words: [{ id: idOf(text), dir: 'h', r: 0, c: 0 }], blanks, bank };
}

test('matchPattern 找出符合樣式的成語', () => {
  const list = matchPattern(index, ['一', null, '千', '金']);
  assert.ok(list.includes('一諾千金'));
  assert.ok(list.includes('一字千金'));
  assert.ok(list.every((t) => t.startsWith('一') && t.endsWith('千金')));
});

test('一□千金：字庫同時有「諾」與「字」時為一題多解', () => {
  const b = single('一諾千金', [1], ['諾', '字', '山', '水']);
  const ans = answersOf(b, textOf);
  assert.equal(countSolutions(b, ans, index), 2);
  b.bank = ['諾', '山', '水'];
  assert.equal(countSolutions(b, ans, index), 1);
});

test('一□千金：出題時字庫不會同時出現「諾」與「字」', () => {
  const pool = [index.byId.get(idOf('一諾千金'))];
  let checked = 0;
  for (let seed = 1; seed < 400 && checked < 8; seed++) {
    const g = generateGame('easy', { ...index, idioms: [...pool, ...index.idioms.filter((i) => index.level(i.id) === 1).slice(0, 30)] }, { rng: seededRng(seed), priority: {} });
    for (const b of g.boards) {
      if (textOf(b.words[0].id) !== '一諾千金' || b.blanks[0] !== 1) continue;
      checked++;
      assert.ok(!(b.bank.includes('諾') && b.bank.includes('字')), b.bank.join(''));
    }
  }
  assert.ok(checked > 0, '至少要檢查到一次「一□千金」');
});

test('propagate 與字庫順序無關', () => {
  const g = generateGame('expert', index, { rng: seededRng(6) });
  const b = g.boards[0];
  const ans = answersOf(b, textOf);
  for (let k = 0; k < 10; k++) {
    const copy = { ...b, bank: shuffle(b.bank.slice(), seededRng(k)) };
    assert.equal(propagate(copy, ans, index).solved, true);
  }
});

test('isValidLayout 拒絕相鄰拼出多餘連續字格的排版', () => {
  const id1 = idOf('一諾千金');
  const id2 = idOf('一字千金');
  // 兩個橫向成語上下相鄰，會形成多段長度 2 的直向連續字格。
  const bad = { rows: 2, cols: 4, words: [{ id: id1, dir: 'h', r: 0, c: 0 }, { id: id2, dir: 'h', r: 1, c: 0 }], blanks: [], bank: [] };
  assert.equal(isValidLayout(bad, 9), false);
});

test('rankPool：未完成過的成語優先，其次待複習，再來是較久未出現的', () => {
  const pool = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const ranked = rankPool(pool, { seen: { a: 5, b: 1, c: 9 }, review: ['c'] }, seededRng(1)).map((i) => i.id);
  assert.deepEqual(ranked, ['d', 'c', 'b', 'a']);
});

for (const key of DIFFICULTY_KEYS) {
  test(`generateGame(${key}) 符合難度設定、沒有一題多解且不需猜測`, () => {
    const cfg = DIFFICULTIES[key];
    const rng = seededRng(42);
    for (let n = 0; n < 3; n++) {
      const g = generateGame(key, index, { rng });
      assert.equal(g.boards.length, cfg.mode === 'single' ? cfg.questions : 1);
      for (const b of g.boards) {
        const ans = answersOf(b, textOf);
        assert.equal(countSolutions(b, ans, index), 1);
        assert.equal(propagate(b, ans, index).solved, true);
        assert.ok(b.words.every((w) => cfg.levels.includes(index.level(w.id))));
        if (cfg.mode === 'single') {
          assert.equal(b.blanks.length, cfg.blanksPer);
          assert.equal(b.bank.length, cfg.bankSize);
        } else {
          assert.equal(isValidLayout(b, cfg.size), true);
          assert.deepEqual([...b.bank].sort(), b.blanks.map((c) => ans[c]).sort());
          if (cfg.crossOnly) assert.ok(crossOnlyCells(b, ans, index).length > 0);
          for (const w of b.words) assert.equal(wordCells(b, w).map((c) => ans[c]).join(''), textOf(w.id));
        }
      }
    }
  });
}

test('逐題模式：同一局的空格不會全部在同一個位置', () => {
  for (let seed = 1; seed < 30; seed++) {
    const g = generateGame('easy', index, { rng: seededRng(seed) });
    assert.ok(new Set(g.boards.map((b) => b.blanks.join())).size > 1);
  }
});

test('釋義遮蔽：成語、含空格字的片段與註解寫法被遮住，其餘文字不變', async () => {
  const { maskRanges } = await import('../src/js/idiom/mask.js');
  const meaning = '貫，本指以線穿錢。後用「惡貫滿盈」比喻罪大惡極。\n盈，滿。';
  const ranges = maskRanges(meaning, '惡貫滿盈', [1, 3]);
  const masked = ranges.map(([a, b]) => meaning.slice(a, b));
  assert.ok(masked.includes('惡貫滿盈'));
  assert.ok(masked.includes('貫'), '開頭的「貫，」');
  assert.ok(masked.includes('盈'), '換行後的「盈，」');
  assert.ok(!masked.some((m) => m.includes('罪大惡極')));
  // 範圍互不重疊且依序排列。
  ranges.forEach(([a, b], k) => {
    assert.ok(a < b);
    if (k) assert.ok(a >= ranges[k - 1][1]);
  });
});
