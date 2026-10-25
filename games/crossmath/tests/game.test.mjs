// 遊戲規則的單元測試：填入、替換、數字庫、筆記、清除、提示、復原與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, restartGame, isValidSave, inputValue, toggleNote, erase, applyUndo, useHint,
  isComplete, hintsLeft, remainingCounts, isWrong, completedEquations, directCells,
} from '../src/js/game.js';
import { LAYOUT, SOLUTION, GIVENS } from './fixtures.mjs';

/**
 * 建立測試用的新局。
 * @returns {object} 遊戲狀態。
 */
function newGame() {
  return createGame({ difficulty: 'easy', size: 7, layout: LAYOUT, givens: GIVENS, solution: SOLUTION });
}

test('填錯會標示並累計錯誤，改對後恢復', () => {
  const g = newGame();
  const r = inputValue(g, 0, 2);
  assert.equal(r.wrong, true);
  assert.equal(g.mistakes, 1);
  assert.equal(isWrong(g, 0), true);
  inputValue(g, 0, 3);
  assert.equal(isWrong(g, 0), false);
  assert.equal(g.mistakes, 1);
});

test('填入會從數字庫取出，替換與清除會放回', () => {
  const g = newGame();
  assert.equal(remainingCounts(g)[3], 2);
  inputValue(g, 0, 3);
  assert.equal(remainingCounts(g)[3], 1);
  inputValue(g, 0, 2);
  assert.equal(remainingCounts(g)[3], 2);
  assert.equal(remainingCounts(g)[2], 0);
  assert.equal(inputValue(g, 18, 2), null, '數字庫已無 2 時不能填入');
  erase(g, 0);
  assert.equal(remainingCounts(g)[2], 1);
});

test('給定數字不能修改或清除，非數字格不能操作', () => {
  const g = newGame();
  assert.equal(inputValue(g, 2, 3), null);
  assert.equal(erase(g, 2), null);
  assert.equal(toggleNote(g, 2, 3), null);
  assert.equal(inputValue(g, 1, 3), null);
});

test('筆記只能加在空格且限數字庫數值，填入數字時清除筆記', () => {
  const g = newGame();
  toggleNote(g, 0, 3);
  toggleNote(g, 0, 2);
  assert.deepEqual(g.notes[0], [2, 3]);
  assert.equal(toggleNote(g, 0, 9), null);
  assert.equal(remainingCounts(g)[3], 2, '筆記不佔用數字庫');
  inputValue(g, 0, 3);
  assert.deepEqual(g.notes[0], []);
  assert.equal(toggleNote(g, 0, 2), null);
});

test('清除先清數字，沒有數字時清筆記', () => {
  const g = newGame();
  toggleNote(g, 0, 3);
  erase(g, 0);
  assert.deepEqual(g.notes[0], []);
  inputValue(g, 0, 3);
  erase(g, 0);
  assert.equal(g.values[0], 0);
  assert.equal(erase(g, 0), null);
});

test('復原依序撤銷、數字庫同步還原且不扣回錯誤次數', () => {
  const g = newGame();
  const stack = [];
  stack.push(toggleNote(g, 0, 3).undo);
  stack.push(inputValue(g, 0, 2).undo);
  stack.push(inputValue(g, 0, 3).undo);
  applyUndo(g, stack.pop());
  assert.equal(g.values[0], 2);
  assert.equal(remainingCounts(g)[2], 0);
  applyUndo(g, stack.pop());
  assert.equal(g.values[0], 0);
  assert.deepEqual(g.notes[0], [3]);
  assert.equal(remainingCounts(g)[2], 1);
  applyUndo(g, stack.pop());
  assert.deepEqual(g.notes[0], []);
  assert.equal(g.mistakes, 1);
});

test('提示：選取未填對的格子時填入正解並鎖定', () => {
  const g = newGame();
  inputValue(g, 18, 3);
  const r = useHint(g, 18);
  assert.deepEqual(r, { result: 'filled', cell: 18, cleared: -1 });
  assert.equal(g.values[18], 2);
  assert.equal(g.hinted[18], true);
  assert.equal(g.hintsUsed, 1);
  assert.equal(remainingCounts(g)[3], 2, '原本填錯的數字回到數字庫');
  assert.equal(inputValue(g, 18, 3), null);
  assert.equal(erase(g, 18), null);
  assert.equal(applyUndo(g, { i: 18, value: 0, notes: [] }), false);
});

test('提示：所需數值被其他格的錯誤佔用時清除該格', () => {
  const g = newGame();
  inputValue(g, 0, 3);
  inputValue(g, 18, 3);
  assert.equal(remainingCounts(g)[3], 0);
  const r = useHint(g, 30);
  assert.equal(r.result, 'filled');
  assert.equal(r.cleared, 18);
  assert.equal(g.values[18], 0);
  assert.equal(g.values[30], 3);
  assert.equal(g.values[0], 3);
  assert.ok(remainingCounts(g).every((c) => c >= 0));
});

test('提示：選取已填對的格子不扣次數', () => {
  const g = newGame();
  inputValue(g, 0, 3);
  assert.equal(useHint(g, 0).result, 'already-correct');
  assert.equal(g.hintsUsed, 0);
});

test('提示：未選取或選到鎖定格時優先挑可直接計算的格子', () => {
  const g = newGame();
  assert.deepEqual(directCells(g).sort((a, b) => a - b), [0, 18, 30]);
  for (const selected of [-1, 2]) {
    const r = useHint(g, selected, () => 0);
    assert.equal(r.result, 'filled');
    assert.notEqual(r.cell, 2);
    assert.equal(g.values[r.cell], SOLUTION[r.cell]);
  }
});

test('提示用完後不能再提示', () => {
  const g = newGame();
  g.hintsUsed = 5;
  assert.equal(hintsLeft(g), 0);
  assert.equal(useHint(g, 0).result, 'no-quota');
});

test('全部填對即完成，算式全部標示完成，數字庫歸零', () => {
  const g = newGame();
  assert.equal(completedEquations(g).size, 0);
  inputValue(g, 0, 3);
  assert.equal(completedEquations(g).size, 2, '3 + 4 = 7 與 3 + 5 = 8 同時完成');
  inputValue(g, 18, 2);
  inputValue(g, 30, 3);
  assert.equal(isComplete(g), true);
  assert.equal(completedEquations(g).size, 4);
  assert.ok(remainingCounts(g).every((c) => c === 0));
});

test('重開本局回到新局狀態', () => {
  const g = newGame();
  inputValue(g, 0, 2);
  useHint(g, 18);
  g.elapsedMs = 5000;
  assert.deepEqual(restartGame(g), newGame());
});

test('存檔驗證會拒絕損毀資料', () => {
  const g = newGame();
  inputValue(g, 0, 3);
  assert.equal(isValidSave(JSON.parse(JSON.stringify(g))), true);
  assert.equal(isValidSave(null), false);
  assert.equal(isValidSave({ ...g, v: 99 }), false);
  assert.equal(isValidSave({ ...g, values: g.values.slice(1) }), false);
  assert.equal(isValidSave({ ...g, values: g.values.map((v, i) => (i === 2 ? 9 : v)) }), false, '給定數字被改');
  assert.equal(isValidSave({ ...g, values: g.values.map((v, i) => (i === 18 || i === 30 ? 3 : v)) }), false, '數字庫數量不一致');
  assert.equal(isValidSave({ ...g, notes: g.notes.map((n, i) => (i === 18 ? [9] : n)) }), false);
  assert.equal(isValidSave({ ...g, layout: g.layout.replace('+', '.') }), false);
});
