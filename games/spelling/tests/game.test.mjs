// 出題與一局操作的單元測試：字母方塊、干擾字母、答案唯一、填入與退回、判定、提示、單字本與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DIFFICULTIES, ROUND_SIZE, REVIEW, lettersOf, meaningIndex, makeTiles, canSpell, generateRound, sameMeaning,
} from '../src/js/deck.js';
import {
  createGame, placeTile, removeAt, backspace, clearSlots, checkAnswer, useHint, hintsLeft, nextWord, isLastWord, spelled,
  applyWordToBook, isValidSave, restartGame, usedTiles,
} from '../src/js/game.js';

/**
 * 固定種子的亂數（mulberry32），讓測試結果可重現。
 * @param {number} seed 種子。
 * @returns {() => number} 亂數。
 */
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 測試用詞庫：每個 Level 30 個不同意思的字，另有同義與同字母的特例。 */
const WORDS = [];
const BASE = ['apple', 'bread', 'chair', 'dance', 'eagle', 'flame', 'grape', 'house', 'igloo', 'juice', 'kite', 'lemon', 'mango', 'night', 'ocean', 'piano', 'queen', 'river', 'snake', 'table', 'uncle', 'voice', 'water', 'yacht', 'zebra', 'cloud', 'green', 'plant', 'smile', 'train'];
for (let level = 1; level <= 6; level++) {
  BASE.forEach((en, i) => WORDS.push({ id: `${en}-${level}`, en, pos: 'n.', level, zh: `意思${level}-${i}`, example: '', exampleZh: '', form: '' }));
}
WORDS.push({ id: 'big', en: 'big', pos: 'adj.', level: 1, zh: '大的', example: '', exampleZh: '', form: '' });
WORDS.push({ id: 'large', en: 'large', pos: 'adj.', level: 2, zh: '大的、寬敞的', example: '', exampleZh: '', form: '' });
WORDS.push({ id: 'listen', en: 'listen', pos: 'v.', level: 1, zh: '聽', example: '', exampleZh: '', form: '' });
WORDS.push({ id: 'silent', en: 'silent', pos: 'adj.', level: 3, zh: '安靜的', example: '', exampleZh: '', form: '' });
WORDS.push({ id: 'oclock', en: "o'clock", pos: 'adv.', level: 1, zh: '點鐘', example: '', exampleZh: '', form: '' });
const byId = new Map(WORDS.map((w) => [w.id, w]));
const getWord = (id) => byId.get(id);

test('需要拼的字母只含英文字母；同義判斷依中文意思項目', () => {
  assert.equal(lettersOf("o'clock"), 'oclock');
  assert.equal(lettersOf('ice cream'), 'icecream');
  assert.ok(sameMeaning(byId.get('big'), byId.get('large')));
  assert.ok(!sameMeaning(byId.get('big'), byId.get('listen')));
});

test('字母方塊：包含答案所有字母與指定數量的干擾字母，干擾字母不與答案重複，順序不等於答案', () => {
  const index = meaningIndex(WORDS);
  const r = rng(1);
  for (let k = 0; k < 200; k++) {
    for (const decoys of [0, 2, 3]) {
      const w = WORDS[k % WORDS.length];
      const tiles = makeTiles(w, decoys, index, r);
      const letters = lettersOf(w.en);
      assert.equal(tiles.length, letters.length + decoys);
      assert.ok(canSpell(tiles, letters));
      const extra = tiles.slice();
      for (const ch of letters) extra.splice(extra.indexOf(ch), 1);
      assert.ok(extra.every((ch) => !letters.includes(ch) && !'qxzj'.includes(ch)));
      assert.notEqual(tiles.slice(0, letters.length).join(''), letters);
    }
  }
});

test('字母方塊拼不出中文意思相同但詞性不同的字', () => {
  const words = [
    { id: 'a', en: 'lead', pos: 'v.', zh: '帶領', level: 1 },
    { id: 'b', en: 'deal', pos: 'n.', zh: '帶領', level: 1 },
  ];
  const index = meaningIndex(words);
  // lead 的字母與 deal 相同，詞性不同 → 無法產生（不能出題）。
  assert.equal(makeTiles(words[0], 0, index, rng(2)), null);
});

test('出題：每局 10 個不重複、意思不重複的單字，長度符合難度，優先未學會的字', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    for (let level = 1; level <= 6; level++) {
      const { items } = generateRound(WORDS, { range: level, difficulty, rng: rng(level * 7) });
      assert.equal(items.length, ROUND_SIZE);
      const ws = items.map((it) => byId.get(it.id));
      assert.equal(new Set(ws.map((w) => w.id)).size, ROUND_SIZE);
      assert.ok(ws.every((w) => w.level === level));
      for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) assert.ok(!sameMeaning(ws[i], ws[j]));
      items.forEach((it) => assert.equal(it.tiles.length, lettersOf(byId.get(it.id).en).length + DIFFICULTIES[difficulty].decoys));
    }
  }
  const learned = Object.fromEntries(WORDS.filter((w) => w.level === 1).slice(0, 20).map((w) => [w.id, { learned: true, review: false }]));
  const { items } = generateRound(WORDS, { range: 1, difficulty: 'medium', book: learned, rng: rng(3) });
  assert.ok(items.filter((it) => learned[it.id]).length <= 0 + Math.max(0, ROUND_SIZE - (WORDS.filter((w) => w.level === 1).length - 20)));
});

test('出題：待複習不足時以同 Level 未學會的字補足；單字不足時丟出錯誤', () => {
  const book = { 'apple-2': { learned: false, review: true }, 'bread-2': { learned: false, review: true } };
  const { items, widened } = generateRound(WORDS, { range: REVIEW, difficulty: 'medium', book, rng: rng(4) });
  assert.equal(items.length, ROUND_SIZE);
  assert.ok(widened);
  assert.ok(items.every((it) => byId.get(it.id).level === 2));
  assert.throws(() => generateRound(WORDS.slice(0, 5), { range: 1, difficulty: 'easy' }));
});

/**
 * 建立一局只有指定單字與固定字母方塊的遊戲。
 * @param {string} difficulty 難度。
 * @param {{id: string, tiles: string[]}[]} items 題目。
 * @returns {object} 遊戲狀態。
 */
function gameWith(difficulty, items) {
  return createGame({ range: 1, difficulty, items }, getWord);
}

/**
 * 依字母依序點方塊（每個字母取第一個還沒用的方塊）。
 * @param {object} state 遊戲狀態。
 * @param {string} letters 字母。
 */
function type(state, letters) {
  const tiles = state.items[state.index].tiles;
  for (const ch of letters) {
    const used = usedTiles(state);
    placeTile(state, tiles.findIndex((t, i) => t === ch && !used.has(i)));
  }
}

test('填入、退回、退格與清除；鎖定的字母不能退回', () => {
  const s = gameWith('medium', [{ id: 'apple-1', tiles: ['p', 'l', 'a', 'e', 'p'] }]);
  type(s, 'apl');
  assert.equal(spelled(s), 'apl  ');
  assert.ok(removeAt(s, 1));
  assert.equal(spelled(s), 'a l  ');
  type(s, 'p');
  assert.equal(spelled(s), 'apl  ', '退回後下一個字母填入第一個空格');
  assert.ok(backspace(s));
  assert.equal(spelled(s), 'ap   ');
  clearSlots(s);
  assert.equal(spelled(s), '     ');
  // 簡單難度：首字母預先填好並鎖定，不能退回，也不算提示。
  const e = gameWith('easy', [{ id: 'apple-1', tiles: ['p', 'l', 'a', 'e', 'p'] }]);
  assert.equal(spelled(e), 'a    ');
  assert.equal(removeAt(e, 0), false);
  clearSlots(e);
  assert.equal(spelled(e), 'a    ');
  assert.equal(e.hintsUsed, 0);
});

test('判定：拼錯時位置正確的字母鎖定、錯誤的退回並計錯誤；拼對完成；同義字也算對', () => {
  const s = gameWith('medium', [{ id: 'apple-1', tiles: ['p', 'l', 'a', 'e', 'p'] }]);
  type(s, 'aplpe');
  const r = checkAnswer(s, getWord('apple-1'));
  assert.equal(r.right, false);
  assert.deepEqual(r.wrong, [2, 3]);
  assert.deepEqual(s.locks, [true, true, false, false, true]);
  assert.equal(spelled(s), 'ap  e');
  assert.equal(s.mistakes, 1);
  assert.equal(s.flags['apple-1'].wrong, true);
  type(s, 'pl');
  assert.equal(checkAnswer(s, getWord('apple-1')).right, true);
  assert.ok(s.solved);
  // 本題 big，但字母方塊拼得出 large（中文意思與詞性相同）→ 也算拼對。
  const g = gameWith('medium', [{ id: 'big', tiles: ['g', 'i', 'b'] }]);
  type(g, 'big');
  assert.equal(checkAnswer(g, getWord('big'), [getWord('large')]).right, true);
});

test('提示：填入並鎖定下一個正確字母，錯的字母先退回；需要的字母在別格時借回來；用完後停用', () => {
  const s = gameWith('expert', [{ id: 'apple-1', tiles: ['p', 'l', 'a', 'e', 'p', 'k', 'm', 'r'] }]);
  type(s, 'pa');
  let r = useHint(s, getWord('apple-1'));
  assert.ok(r.ok);
  assert.equal(spelled(s)[0], 'a');
  assert.ok(s.locks[0] && s.hinted[0]);
  assert.equal(s.flags['apple-1'].hint, true);
  // 第 2 格是 a（錯的）已被借走後為空；再提示填入 p。
  r = useHint(s, getWord('apple-1'));
  assert.ok(r.ok);
  assert.equal(spelled(s).slice(0, 2), 'ap');
  assert.equal(hintsLeft(s), DIFFICULTIES.expert.hints - 2);
  useHint(s, getWord('apple-1'));
  assert.equal(hintsLeft(s), 0);
  assert.equal(useHint(s, getWord('apple-1')).ok, false);
});

test('下一個單字、最後一個與重開本局', () => {
  const s = gameWith('medium', [{ id: 'kite-1', tiles: ['e', 't', 'i', 'k'] }, { id: 'oclock', tiles: ['k', 'c', 'o', 'l', 'c', 'o'] }]);
  assert.equal(nextWord(s, getWord), false, '還沒拼對不能前往下一個');
  type(s, 'kite');
  checkAnswer(s, getWord('kite-1'));
  assert.ok(nextWord(s, getWord));
  assert.ok(isLastWord(s));
  assert.equal(s.slots.length, 6, "o'clock 只需要拼 6 個字母");
  const again = restartGame(s, getWord);
  assert.equal(again.index, 0);
  assert.equal(again.mistakes, 0);
  assert.deepEqual(again.items, s.items);
});

test('單字本：沒錯、沒用提示 → 已學會並移出待複習；答錯或提示 → 待複習', () => {
  const book = {};
  applyWordToBook(book, 'a', { wrong: true, hint: false }, 1);
  assert.deepEqual([book.a.learned, book.a.review], [false, true]);
  applyWordToBook(book, 'a', undefined, 2);
  assert.deepEqual([book.a.learned, book.a.review, book.a.seen, book.a.correct], [true, false, 2, 1]);
  applyWordToBook(book, 'a', { wrong: false, hint: true }, 3);
  assert.deepEqual([book.a.learned, book.a.review], [true, true]);
});

test('存檔驗證：正確的存檔通過；版本、單字或字母方塊不符時判定損毀', () => {
  const s = gameWith('hard', [{ id: 'apple-1', tiles: ['p', 'l', 'a', 'e', 'p', 'k', 'm'] }]);
  type(s, 'ap');
  const saved = JSON.parse(JSON.stringify(s));
  assert.ok(isValidSave(saved, getWord));
  assert.equal(isValidSave({ ...saved, v: 99 }, getWord), false);
  assert.equal(isValidSave({ ...saved, items: [{ id: 'nope', tiles: ['a'] }] }, getWord), false);
  assert.equal(isValidSave({ ...saved, items: [{ id: 'apple-1', tiles: ['a', 'p', 'l'] }] }, getWord), false);
  assert.equal(isValidSave({ ...saved, slots: [0, 0, null, null, null] }, getWord), false);
  assert.equal(isValidSave(null, getWord), false);
});
