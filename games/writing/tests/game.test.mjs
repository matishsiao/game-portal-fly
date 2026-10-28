// 遊戲規則測試：作答判定、解題重點顯示規則、額度、下一題、全對判定、重開本局與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createGame, restartGame, choose, showKey, nextQuestion, isOver, currentItem, hintsLeft, itemResult, isPerfect, isValidSave, DIFFICULTIES,
} from '../src/js/game.js';
import { createBank } from '../src/js/writing/bank.js';
import { createRng } from '../src/js/writing/templates.js';

/** 題目查詢（固定題庫與模板）。 */
const bank = createBank(JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8')));
/** 測試用的 10 題初級題目 id（題庫前 10 題）。 */
const IDS = bank.questions.filter((q) => q.difficulty === 'easy').slice(0, 10).map((q) => q.id);

/**
 * 建立一局測試用的遊戲。
 * @param {string} [difficulty='easy'] 難度代碼。
 * @returns {object} 遊戲狀態。
 */
function newGame(difficulty = 'easy') {
  return createGame({ difficulty, ids: IDS, rng: createRng(1) });
}

/**
 * 目前題目的正確選項與錯誤選項的顯示位置。
 * @param {object} s 遊戲狀態。
 * @returns {{answer: number, right: number, wrongs: number[]}} 正確答案索引、正確位置與錯誤位置。
 */
function slots(s) {
  const item = currentItem(s);
  const { answer } = bank.lookup(item.id);
  const right = item.order.indexOf(answer);
  return { answer, right, wrongs: [0, 1, 2, 3].filter((x) => x !== right) };
}

test('一次答對：題目完成，不扣額度、不累計錯誤', () => {
  const s = newGame();
  const { answer, right } = slots(s);
  assert.deepEqual(choose(s, right, answer), { result: 'correct' });
  assert.equal(currentItem(s).done, true);
  assert.equal(s.mistakes, 0);
  assert.equal(itemResult(currentItem(s)).clean, true);
});

test('答錯依序顯示第 1、2 段解題重點，第 3 次答錯只剩一個選項，且不自動作答', () => {
  const s = newGame();
  const { answer, wrongs } = slots(s);
  const r1 = choose(s, wrongs[0], answer);
  assert.equal(r1.result, 'wrong');
  assert.equal(currentItem(s).keysShown, 1);
  const r2 = choose(s, wrongs[1], answer);
  assert.equal(currentItem(s).keysShown, 2);
  assert.equal(r2.lastOne, false);
  const r3 = choose(s, wrongs[2], answer);
  assert.equal(r3.lastOne, true);
  assert.equal(r3.newKey, false);
  assert.equal(currentItem(s).done, false);
  assert.equal(s.mistakes, 3);
  assert.equal(s.hintsUsed, 0, '答錯自動顯示的不扣額度');
});

test('已選過的選項再點不會重複計算', () => {
  const s = newGame();
  const { answer, wrongs } = slots(s);
  choose(s, wrongs[0], answer);
  assert.equal(choose(s, wrongs[0], answer).result, 'ignored');
  assert.equal(s.mistakes, 1);
});

test('主動查看解題重點扣額度；兩段都顯示後不再扣；額度用完時拒絕', () => {
  const s = newGame('hard');
  s.items = s.items.map((it) => ({ ...it, id: IDS[0] }));
  assert.equal(showKey(s), 'shown');
  assert.equal(showKey(s), 'shown');
  assert.equal(showKey(s), 'all-shown');
  assert.equal(s.hintsUsed, 2);
  const { answer, right } = slots(s);
  choose(s, right, answer);
  nextQuestion(s);
  assert.equal(showKey(s), 'shown');
  assert.equal(hintsLeft(s), 0);
  assert.equal(showKey(s), 'no-quota');
  assert.equal(DIFFICULTIES.hard.hints, 3);
});

test('看過解題重點後再答錯，顯示的是下一段', () => {
  const s = newGame();
  const { answer, wrongs } = slots(s);
  showKey(s);
  choose(s, wrongs[0], answer);
  assert.equal(currentItem(s).keysShown, 2);
});

test('答對後才能下一題；10 題完成後結束，全對判定正確', () => {
  const s = newGame();
  assert.equal(nextQuestion(s), false);
  for (let i = 0; i < 10; i++) {
    const { answer, right } = slots(s);
    choose(s, right, answer);
    assert.equal(nextQuestion(s), true);
  }
  assert.equal(isOver(s), true);
  assert.equal(s.completed, true);
  assert.equal(isPerfect(s), true);
});

test('有答錯或看過解題重點就不是全對', () => {
  const a = newGame();
  const { answer, wrongs } = slots(a);
  choose(a, wrongs[0], answer);
  assert.equal(isPerfect(a), false);
  const b = newGame();
  showKey(b);
  assert.equal(isPerfect(b), false);
});

test('重開本局：題目與選項順序不變，作答紀錄歸零', () => {
  const s = newGame();
  const { answer, wrongs } = slots(s);
  choose(s, wrongs[0], answer);
  showKey(s);
  s.elapsedMs = 5000;
  const r = restartGame(s);
  assert.deepEqual(r.items.map((it) => [it.id, it.order]), s.items.map((it) => [it.id, it.order]));
  assert.equal(r.mistakes, 0);
  assert.equal(r.hintsUsed, 0);
  assert.equal(r.elapsedMs, 0);
  assert.equal(r.items[0].picked.length, 0);
  assert.equal(r.items[0].keysShown, 0);
});

test('存檔驗證：正常進度合法，損毀或與題庫矛盾時不合法', () => {
  const s = newGame();
  const { answer, wrongs, right } = slots(s);
  choose(s, wrongs[0], answer);
  showKey(s);
  choose(s, right, answer);
  const saved = JSON.parse(JSON.stringify(s));
  assert.equal(isValidSave(saved, bank.lookup), true);
  assert.equal(isValidSave({ ...saved, v: 99 }, bank.lookup), false);
  assert.equal(isValidSave({ ...saved, mistakes: 0 }, bank.lookup), false, '答錯次數與紀錄不符');
  assert.equal(isValidSave({ ...saved, items: [{ ...saved.items[0], id: 'easy-999' }, ...saved.items.slice(1)] }, bank.lookup), false, '題目不存在');
  assert.equal(isValidSave({ ...saved, items: [{ ...saved.items[0], order: [0, 0, 1, 2] }, ...saved.items.slice(1)] }, bank.lookup), false);
  assert.equal(isValidSave({ ...saved, index: 3 }, bank.lookup), false, '前面的題目還沒答對');
  assert.equal(isValidSave(null, bank.lookup), false);
});

// 作文題庫不接受舊數學模板題號。
test('存檔拒絕不存在的模板題號', () => {
  const s = createGame({ difficulty: 'medium', ids: ['chicken-legs#12-5', 'medium-001'], rng: createRng(2) });
  assert.equal(isValidSave(s, bank.lookup), false);
});
