// 作答規則測試：選擇題、排序題、分類題的作答與檢查，解題重點額度，完成與全對判定，以及存檔驗證（含今日複習模式）。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, restartGame, choose, placeOrder, unplaceOrder, placeSort, check, showKey, nextQuestion, currentItem, hintsLeft,
  isOver, isPerfect, isValidSave, DIFFICULTIES,
} from '../src/js/game.js';

/** 測試用題目。 */
const Q = {
  c1: { id: 'c1', type: 'choice', options: [{ text: '甲' }, { text: '乙', hint: 'x' }, { text: '丙', hint: 'y' }, { text: '丁', hint: 'z' }], answer: 0, keys: ['k1', 'k2'] },
  o1: { id: 'o1', type: 'order', items: ['一', '二', '三'], keys: ['k1', 'k2'] },
  s1: { id: 's1', type: 'sort', bins: ['A', 'B'], cards: [{ text: 'a', bin: 0 }, { text: 'b', bin: 1 }, { text: 'c', bin: 0 }, { text: 'd', bin: 1 }], keys: ['k1', 'k2'] },
};
/**
 * 由 id 取得題目。
 * @param {string} id 題目 id。
 * @returns {object | null} 題目。
 */
const lookup = (id) => Q[id] || null;
/** 不打亂順序的亂數（測試用：顯示順序等於資料順序）。 */
const noShuffle = () => 0.999;

/**
 * 建立一局。
 * @param {string[]} ids 題目 id。
 * @param {object} [over] 其他選項。
 * @returns {object} 遊戲狀態。
 */
const game = (ids, over = {}) => createGame({ difficulty: 'medium', subject: 'history', topics: ['japanese-era'], ids, lookup, rng: noShuffle, ...over });

test('選擇題：答錯計錯誤並停用，第 2 次答錯起自動顯示解題重點，答對才能下一題', () => {
  const s = game(['c1', 'o1']);
  const it = currentItem(s);
  const right = it.order.indexOf(0);
  const wrongs = [0, 1, 2, 3].filter((x) => x !== right);
  assert.equal(choose(s, wrongs[0], Q.c1).result, 'wrong');
  assert.equal(it.keysShown, 0);
  assert.equal(choose(s, wrongs[0], Q.c1).result, 'ignored');
  assert.equal(choose(s, wrongs[1], Q.c1).newKey, true);
  assert.equal(nextQuestion(s), false);
  assert.equal(choose(s, right, Q.c1).result, 'correct');
  assert.ok(nextQuestion(s));
  assert.equal(s.mistakes, 2);
  assert.equal(isPerfect(s), false);
});

test('排序題：檢查後錯的退回、對的鎖定，錯誤次數只加 1；分類題同樣處理', () => {
  const s = game(['o1', 's1']);
  const it = currentItem(s);
  // 依顯示位置把資料索引 2、1、0 放進格子（第 2 格是對的）。
  for (const idx of [2, 1, 0]) placeOrder(s, it.order.indexOf(idx));
  const r = check(s, Q.o1);
  assert.equal(r.result, 'wrong');
  assert.deepEqual(r.wrong, [0, 2]);
  assert.ok(it.locked[1]);
  assert.equal(s.mistakes, 1);
  assert.equal(unplaceOrder(s, 1), false, '鎖定的格子不能取回');
  for (const idx of [0, 2]) placeOrder(s, it.order.indexOf(idx));
  assert.equal(check(s, Q.o1).result, 'correct');
  nextQuestion(s);
  const st = currentItem(s);
  st.order.forEach((idx, c) => placeSort(s, c, Q.s1.cards[idx].bin, Q.s1));
  assert.equal(check(s, Q.s1).result, 'correct');
  nextQuestion(s);
  assert.ok(isOver(s));
});

test('解題重點：主動查看扣額度，用完或已全部顯示時停用；全對要求沒答錯也沒看解題重點', () => {
  const s = game(['c1']);
  assert.equal(showKey(s), 'shown');
  assert.equal(hintsLeft(s), DIFFICULTIES.medium.hints - 1);
  assert.equal(showKey(s), 'shown');
  assert.equal(showKey(s), 'all-shown');
  choose(s, currentItem(s).order.indexOf(0), Q.c1);
  nextQuestion(s);
  assert.equal(isPerfect(s), false);
  const clean = game(['c1']);
  choose(clean, currentItem(clean).order.indexOf(0), Q.c1);
  nextQuestion(clean);
  assert.ok(isPerfect(clean));
});

test('存檔驗證：科目、主題與模式都要正確；重開本局保留題目與顯示順序', () => {
  const s = game(['c1', 'o1', 's1']);
  choose(s, currentItem(s).order.indexOf(1), Q.c1);
  const saved = JSON.parse(JSON.stringify(s));
  assert.ok(isValidSave(saved, lookup));
  assert.ok(isValidSave({ ...saved, mode: 'review', subject: 'all', topics: [] }, lookup));
  assert.equal(isValidSave({ ...saved, mode: 'nope' }, lookup), false);
  assert.equal(isValidSave({ ...saved, topics: 'x' }, lookup), false);
  assert.equal(isValidSave({ ...saved, subject: undefined }, lookup), false);
  assert.equal(isValidSave({ ...saved, mistakes: 5 }, lookup), false);
  assert.equal(isValidSave({ ...saved, items: [{ ...saved.items[0], id: 'missing' }] }, lookup), false);
  const again = restartGame(s, lookup);
  assert.equal(again.mistakes, 0);
  assert.deepEqual(again.items.map((it) => it.order), s.items.map((it) => it.order));
  assert.equal(again.subject, 'history');
  assert.deepEqual(again.topics, ['japanese-era']);
});
