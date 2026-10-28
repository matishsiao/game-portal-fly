// 遊戲規則測試：選擇題的想一想與解題重點、排順序與分類的擺放與檢查、額度、下一題、全對判定、重開本局與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createGame, restartGame, choose, placeOrder, unplaceOrder, placeSort, unplaceSort, canCheck, check, showKey, nextQuestion,
  isOver, currentItem, hintsLeft, itemResult, isPerfect, isValidSave,
} from '../src/js/game.js';
import { createBank } from '../src/js/science/bank.js';

/** 題庫查詢。 */
const bank = createBank(
  JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8')),
  JSON.parse(readFileSync(new URL('../src/data/cards.json', import.meta.url), 'utf8')),
);
const { lookup } = bank;
/** 固定的亂數產生器（測試可重現）。 */
const rng = (() => {
  let a = 7;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
})();

/**
 * 建立只有指定題目的一局。
 * @param {string[]} ids 題目 id。
 * @param {string} [difficulty='easy'] 難度代碼。
 * @returns {object} 遊戲狀態。
 */
const game = (ids, difficulty = 'easy', mode = 'mixed', unit = null) => createGame({ difficulty, mode, unit, ids, lookup, rng });

/**
 * 選擇題正確與錯誤選項的顯示位置。
 * @param {object} s 遊戲狀態。
 * @returns {{q: object, right: number, wrongs: number[]}} 題目與位置。
 */
function choiceSlots(s) {
  const item = currentItem(s);
  const q = lookup(item.id);
  const right = item.order.indexOf(q.answer);
  return { q, right, wrongs: [0, 1, 2, 3].filter((x) => x !== right) };
}

/**
 * 把排序題依正確順序放好。
 * @param {object} s 遊戲狀態。
 */
function solveOrder(s) {
  const item = currentItem(s);
  for (let i = 0; i < item.order.length; i++) if (item.place[i] < 0) placeOrder(s, item.order.indexOf(i));
}

/**
 * 把分類題每張卡放進正確的類別。
 * @param {object} s 遊戲狀態。
 */
function solveSort(s) {
  const item = currentItem(s);
  const q = lookup(item.id);
  item.order.forEach((index, c) => {
    if (!item.locked[c]) placeSort(s, c, q.cards[index].bin, q);
  });
}

test('選項、排序項目、分類卡片的顯示順序都會打亂，且是合法的排列', () => {
  const s = game(['easy-001', 'easy-002', 'easy-003']);
  assert.equal(s.items[0].order.length, 4);
  assert.equal(s.items[1].order.length, 4);
  assert.equal(s.items[2].order.length, 5);
  for (const it of s.items) assert.deepEqual([...it.order].sort(), [...it.order.keys()]);
});

test('選擇題：第 1 次答錯只顯示該選項的想一想，第 2 次起依序加上解題重點，都不扣額度', () => {
  const s = game(['easy-001']);
  const { q, right, wrongs } = choiceSlots(s);
  assert.equal(choose(s, wrongs[0], q).result, 'wrong');
  assert.equal(currentItem(s).keysShown, 0);
  choose(s, wrongs[1], q);
  assert.equal(currentItem(s).keysShown, 1);
  const third = choose(s, wrongs[2], q);
  assert.equal(third.lastOne, true);
  assert.equal(currentItem(s).keysShown, 2);
  assert.equal(choose(s, wrongs[0], q).result, 'ignored', '已選過的選項不重複計算');
  assert.equal(s.mistakes, 3);
  assert.equal(s.hintsUsed, 0);
  assert.equal(choose(s, right, q).result, 'correct');
  assert.equal(itemResult(currentItem(s)).wrong, 3);
});

test('排序題：放滿才能檢查；檢查後對的鎖定、錯的退回，錯誤只 ＋1 並顯示解題重點', () => {
  const s = game(['easy-002']);
  const item = currentItem(s);
  const q = lookup(item.id);
  assert.equal(canCheck(item), false);
  // 依相反的正確順序放入（全部放錯，除非剛好中間那格）。
  for (let i = item.order.length - 1; i >= 0; i--) placeOrder(s, item.order.indexOf(i));
  assert.equal(canCheck(item), true);
  const r = check(s, q);
  assert.equal(r.result, 'wrong');
  assert.equal(s.mistakes, 1);
  assert.equal(item.keysShown, 1);
  for (const slot of r.wrong) assert.equal(item.place[slot], -1);
  item.locked.forEach((l, i) => { if (l) assert.equal(item.order[item.place[i]], i); });
  // 鎖定的格子不能取回。
  const lockedSlot = item.locked.indexOf(true);
  if (lockedSlot >= 0) assert.equal(unplaceOrder(s, lockedSlot), false);
  solveOrder(s);
  assert.equal(check(s, q).result, 'correct');
  assert.equal(item.done, true);
});

test('排序題：未鎖定的格子可以取回再放', () => {
  const s = game(['easy-002']);
  placeOrder(s, 0);
  assert.equal(currentItem(s).place[0], 0);
  assert.equal(unplaceOrder(s, 0), true);
  assert.equal(currentItem(s).place[0], -1);
  assert.equal(placeOrder(s, 0), true);
  assert.equal(placeOrder(s, 0), false, '同一個項目不能放兩次');
});

test('分類題：放錯的卡片退回並記下（顯示它的想一想），分類題不自動顯示解題重點', () => {
  const s = game(['easy-003']);
  const item = currentItem(s);
  const q = lookup(item.id);
  // 全部放進第 0 類：屬於第 1 類的卡會錯。
  item.order.forEach((_, c) => placeSort(s, c, 0, q));
  const r = check(s, q);
  assert.equal(r.result, 'wrong');
  assert.equal(s.mistakes, 1);
  assert.equal(item.keysShown, 0);
  assert.deepEqual(item.lastWrong, r.wrong);
  for (const c of r.wrong) {
    assert.equal(item.place[c], -1);
    assert.equal(q.cards[item.order[c]].bin, 1);
  }
  const locked = item.locked.indexOf(true);
  assert.equal(unplaceSort(s, locked), false, '鎖定的卡片不能取回');
  assert.equal(placeSort(s, locked, 1, q), false, '鎖定的卡片不能移動');
  solveSort(s);
  assert.equal(check(s, q).result, 'correct');
});

test('主動查看解題重點扣額度；用完時拒絕', () => {
  const s = game(['medium-501', 'medium-502', 'medium-503'], 'medium');
  assert.equal(hintsLeft(s), 4);
  assert.equal(showKey(s), 'shown');
  assert.equal(showKey(s), 'shown');
  assert.equal(showKey(s), 'all-shown');
  for (let k = 0; k < 2; k++) {
    const { q, right } = choiceSlots(s);
    choose(s, right, q);
    nextQuestion(s);
    if (k === 0) {
      assert.equal(showKey(s), 'shown');
      assert.equal(showKey(s), 'shown');
    }
  }
  assert.equal(hintsLeft(s), 0);
  assert.equal(showKey(s), 'no-quota');
});

test('每題答對才能下一題；全部完成後結束，全對判定正確', () => {
  const s = game(['easy-001', 'easy-002', 'easy-003']);
  assert.equal(nextQuestion(s), false);
  const { q, right } = choiceSlots(s);
  choose(s, right, q);
  nextQuestion(s);
  solveOrder(s);
  check(s, lookup(currentItem(s).id));
  nextQuestion(s);
  solveSort(s);
  check(s, lookup(currentItem(s).id));
  nextQuestion(s);
  assert.equal(isOver(s), true);
  assert.equal(s.completed, true);
  assert.equal(isPerfect(s), true);
});

test('重開本局：題目與顯示順序不變，作答紀錄歸零', () => {
  const s = game(['easy-002', 'easy-003']);
  placeOrder(s, 0);
  showKey(s);
  const r = restartGame(s, lookup);
  assert.deepEqual(r.items.map((it) => [it.id, it.order]), s.items.map((it) => [it.id, it.order]));
  assert.equal(r.hintsUsed, 0);
  assert.deepEqual(r.items[0].place, [-1, -1, -1, -1]);
});

test('存檔驗證：進行中的各題型存檔合法；與題庫或規則矛盾時不合法', () => {
  const s = game(['easy-001', 'easy-002', 'easy-003']);
  const { q, right, wrongs } = choiceSlots(s);
  choose(s, wrongs[0], q);
  choose(s, right, q);
  nextQuestion(s);
  placeOrder(s, 1);
  const saved = JSON.parse(JSON.stringify(s));
  assert.equal(isValidSave(saved, lookup), true);
  assert.equal(isValidSave({ ...saved, mistakes: 0 }, lookup), false, '答錯次數不符');
  assert.equal(isValidSave({ ...saved, mode: 'practice' }, lookup), false, '練習模式必須有單元');
  assert.equal(isValidSave({ ...saved, hintLimit: 99 }, lookup), false, '提示額度與模式不符');
  const bad = JSON.parse(JSON.stringify(saved));
  bad.items[1].place = [1, 1, -1, -1];
  assert.equal(isValidSave(bad, lookup), false, '同一個項目放兩格');
  const bad2 = JSON.parse(JSON.stringify(saved));
  bad2.items[2].place[0] = 0;
  assert.equal(isValidSave(bad2, lookup), false, '還沒到的題目不應有作答');
  const bad3 = JSON.parse(JSON.stringify(saved));
  bad3.items[0].id = 'easy-999';
  assert.equal(isValidSave(bad3, lookup), false, '題目不存在');
});

test('預習：解題重點額度多 2 次，存檔記錄模式與單元', () => {
  const s = game(['medium-501', 'medium-502'], 'medium', 'preview', 'm-plants');
  assert.equal(hintsLeft(s), 6);
  assert.equal(s.mode, 'preview');
  assert.equal(s.unit, 'm-plants');
  assert.equal(isValidSave(JSON.parse(JSON.stringify(s)), lookup), true);
  const p = game(['medium-501'], 'medium', 'practice', 'm-plants');
  assert.equal(hintsLeft(p), 4);
});
