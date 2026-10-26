// 遊戲規則的單元測試：輸入列編輯、送出、不合理猜測、提示、復原、勝負與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, restartGame, placeColor, clearSlot, copyLast, toggleExclude, applyUndo, submit, useHint, hintsLeft, isValidSave, selectSlot,
} from '../src/js/game.js';

/**
 * 建立測試用的新局。
 * @param {string} [difficulty='medium'] 難度。
 * @param {number[]} [secret=[0, 0, 1, 2]] 密碼。
 * @returns {object} 遊戲狀態。
 */
function newGame(difficulty = 'medium', secret = [0, 0, 1, 2]) {
  return createGame({ difficulty, secret });
}

/**
 * 依序填入一整列。
 * @param {object} g 遊戲狀態。
 * @param {number[]} code 顏色。
 */
function fill(g, code) {
  code.forEach((c, p) => {
    selectSlot(g, p);
    placeColor(g, c);
  });
}

test('填入後自動移到下一個空位，清除與替換', () => {
  const g = newGame();
  placeColor(g, 3);
  assert.deepEqual(g.input, [3, -1, -1, -1]);
  assert.equal(g.sel, 1);
  selectSlot(g, 0);
  placeColor(g, 4);
  assert.equal(g.input[0], 4);
  selectSlot(g, 0);
  clearSlot(g);
  assert.equal(g.input[0], -1);
});

test('不可重複的難度不能填入重複顏色', () => {
  const g = newGame('easy', [0, 1, 2, 3]);
  placeColor(g, 5);
  assert.equal(placeColor(g, 5).error, 'duplicate');
});

test('未填滿不能送出；不能送出相同的猜測', () => {
  const g = newGame();
  placeColor(g, 1);
  assert.equal(submit(g).error, 'incomplete');
  fill(g, [1, 1, 3, 3]);
  assert.equal(submit(g).result, 'continue');
  fill(g, [1, 1, 3, 3]);
  assert.equal(submit(g).error, 'repeat-guess');
  assert.equal(g.guesses.length, 1);
});

test('送出計算回饋並判定不合理猜測', () => {
  const g = newGame('medium', [0, 0, 1, 2]);
  fill(g, [0, 3, 3, 3]);
  const r1 = submit(g);
  assert.deepEqual([r1.black, r1.white, r1.conflict], [1, 0, -1]);
  // 與第 1 次回饋（1 ● 0 ○）矛盾：若密碼是 3 3 3 3，對 0 3 3 3 會是 3 ●。
  fill(g, [3, 3, 3, 3]);
  const r2 = submit(g);
  assert.equal(r2.conflict, 0);
  assert.equal(g.mistakes, 1);
  fill(g, [0, 4, 4, 4]);
  assert.equal(submit(g).conflict, -1);
  assert.equal(g.mistakes, 1);
});

test('猜中即完成；用完次數即失敗', () => {
  const g = newGame('medium', [0, 0, 1, 2]);
  fill(g, [0, 0, 1, 2]);
  assert.equal(submit(g).result, 'won');
  assert.equal(g.result, 'won');
  assert.equal(g.completed, true);
  assert.equal(placeColor(g, 1).error, 'over');

  // 10 組互不相同、都沒猜中的猜測：5 5 5 x（x = 0～5）與 4 4 4 x（x = 0～3）。
  const h = newGame('medium', [0, 0, 1, 2]);
  const misses = [0, 1, 2, 3, 4, 5].map((x) => [5, 5, 5, x]).concat([0, 1, 2, 3].map((x) => [4, 4, 4, x]));
  for (const code of misses) {
    fill(h, code);
    assert.notEqual(submit(h).error, 'repeat-guess');
  }
  assert.equal(h.result, 'lost');
  assert.equal(h.completed, false);
});

test('提示依序揭示最左邊的位置並鎖定，之後每次都沿用', () => {
  const g = newGame('medium', [0, 0, 1, 2]);
  assert.deepEqual(useHint(g), { result: 'revealed', pos: 0 });
  assert.equal(g.input[0], 0);
  selectSlot(g, 0);
  assert.equal(clearSlot(g).error, 'locked');
  fill(g, [9, 3, 3, 3].map((c, p) => (p === 0 ? 0 : c)));
  submit(g);
  assert.equal(g.input[0], 0, '送出後揭示的位置保留');
  assert.deepEqual(useHint(g), { result: 'revealed', pos: 1 });
  assert.equal(useHint(g).result, 'revealed');
  assert.equal(hintsLeft(g), 0);
  assert.equal(useHint(g).result, 'no-quota');
});

test('提示不揭示最後一個位置', () => {
  const g = newGame('easy', [0, 1, 2, 3]);
  g.revealed = [true, true, true, false];
  g.input = [0, 1, 2, -1];
  assert.equal(useHint(g).result, 'none');
});

test('沿用上次、排除標記與復原', () => {
  const g = newGame();
  fill(g, [1, 2, 3, 4]);
  submit(g);
  const r = copyLast(g);
  assert.deepEqual(g.input, [1, 2, 3, 4]);
  const t = toggleExclude(g, 5);
  assert.equal(g.excluded[5], true);
  applyUndo(g, t.undo);
  assert.equal(g.excluded[5], false);
  applyUndo(g, r.undo);
  assert.deepEqual(g.input, [-1, -1, -1, -1]);
});

test('重開本局：同一組密碼，進度歸零', () => {
  const g = newGame();
  fill(g, [1, 2, 3, 4]);
  submit(g);
  useHint(g);
  g.elapsedMs = 3000;
  assert.deepEqual(restartGame(g), newGame());
});

test('存檔驗證會拒絕損毀資料', () => {
  const g = newGame();
  fill(g, [1, 2, 3, 4]);
  submit(g);
  const ok = JSON.parse(JSON.stringify(g));
  assert.equal(isValidSave(ok), true);
  assert.equal(isValidSave({ ...ok, v: 9 }), false);
  assert.equal(isValidSave({ ...ok, secret: [0, 0, 1] }), false);
  assert.equal(isValidSave({ ...ok, guesses: [{ ...ok.guesses[0], black: 3 }] }), false, '回饋與密碼不符');
  assert.equal(isValidSave({ ...ok, input: [9, -1, -1, -1] }), false);
  assert.equal(isValidSave({ ...ok, result: 'won' }), false);
});
