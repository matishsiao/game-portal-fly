// 遊戲規則的單元測試：輸入、筆記、清除、提示、復原與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, restartGame, isValidSave, inputDigit, toggleNote, erase, applyUndo, useHint,
  isComplete, hintsLeft, remainingCounts, isWrong,
} from '../src/js/game.js';

const PUZZLE = '003020600900305001001806400008102900700000008006708200002609500800203009005010300';
const SOLUTION = '483921657967345821251876493548132976729564138136798245372689514814253769695417382';

/**
 * 建立測試用的新局。
 * @returns {object} 遊戲狀態。
 */
function newGame() {
  return createGame({ difficulty: 'easy', puzzle: PUZZLE, solution: SOLUTION });
}

test('填錯會標示並累計錯誤，改對後恢復', () => {
  const g = newGame();
  const r = inputDigit(g, 0, 1);
  assert.equal(r.wrong, true);
  assert.equal(g.mistakes, 1);
  assert.equal(isWrong(g, 0), true);
  inputDigit(g, 0, 4);
  assert.equal(isWrong(g, 0), false);
  assert.equal(g.mistakes, 1);
});

test('給定數字不能修改或清除', () => {
  const g = newGame();
  assert.equal(inputDigit(g, 2, 5), null);
  assert.equal(erase(g, 2), null);
  assert.equal(toggleNote(g, 2, 5), null);
});

test('筆記只能加在空格，填入數字時清除筆記', () => {
  const g = newGame();
  toggleNote(g, 0, 4);
  toggleNote(g, 0, 8);
  assert.equal(g.notes[0], (1 << 3) | (1 << 7));
  inputDigit(g, 0, 4);
  assert.equal(g.notes[0], 0);
  assert.equal(toggleNote(g, 0, 1), null);
});

test('清除先清數字，沒有數字時清筆記', () => {
  const g = newGame();
  toggleNote(g, 0, 4);
  erase(g, 0);
  assert.equal(g.notes[0], 0);
  inputDigit(g, 0, 4);
  erase(g, 0);
  assert.equal(g.values[0], 0);
  assert.equal(erase(g, 0), null);
});

test('復原依序撤銷且不扣回錯誤次數', () => {
  const g = newGame();
  const stack = [];
  stack.push(toggleNote(g, 0, 4).undo);
  stack.push(inputDigit(g, 0, 1).undo);
  stack.push(inputDigit(g, 0, 4).undo);
  applyUndo(g, stack.pop());
  assert.equal(g.values[0], 1);
  applyUndo(g, stack.pop());
  assert.equal(g.values[0], 0);
  assert.equal(g.notes[0], 1 << 3);
  applyUndo(g, stack.pop());
  assert.equal(g.notes[0], 0);
  assert.equal(g.mistakes, 1);
});

test('提示：選取未填對的格子時填入正解並鎖定', () => {
  const g = newGame();
  inputDigit(g, 0, 1);
  const r = useHint(g, 0);
  assert.deepEqual(r, { result: 'filled', cell: 0 });
  assert.equal(g.values[0], 4);
  assert.equal(g.hinted[0], true);
  assert.equal(g.hintsUsed, 1);
  assert.equal(inputDigit(g, 0, 5), null);
  assert.equal(erase(g, 0), null);
  assert.equal(applyUndo(g, { i: 0, value: 0, notes: 0 }), false);
});

test('提示：選取已填對的格子不扣次數', () => {
  const g = newGame();
  inputDigit(g, 0, 4);
  assert.equal(useHint(g, 0).result, 'already-correct');
  assert.equal(g.hintsUsed, 0);
});

test('提示：未選取或選到鎖定格時隨機挑尚未填對的格子', () => {
  const g = newGame();
  for (const selected of [-1, 2]) {
    const r = useHint(g, selected, () => 0);
    assert.equal(r.result, 'filled');
    assert.notEqual(r.cell, 2);
    assert.equal(g.values[r.cell], Number(SOLUTION[r.cell]));
  }
});

test('提示用完後不能再提示', () => {
  const g = newGame();
  g.hintsUsed = 30;
  assert.equal(hintsLeft(g), 0);
  assert.equal(useHint(g, 0).result, 'no-quota');
});

test('全部填對即完成，剩餘數量歸零', () => {
  const g = newGame();
  for (let i = 0; i < 81; i++) if (!g.values[i]) inputDigit(g, i, Number(SOLUTION[i]));
  assert.equal(isComplete(g), true);
  assert.deepEqual(remainingCounts(g).slice(1), new Array(9).fill(0));
});

test('重開本局回到新局狀態', () => {
  const g = newGame();
  inputDigit(g, 0, 1);
  useHint(g, 1);
  g.elapsedMs = 5000;
  const r = restartGame(g);
  assert.deepEqual(r, newGame());
});

test('存檔驗證會拒絕損毀資料', () => {
  const g = newGame();
  assert.equal(isValidSave(JSON.parse(JSON.stringify(g))), true);
  assert.equal(isValidSave(null), false);
  assert.equal(isValidSave({ ...g, v: 99 }), false);
  assert.equal(isValidSave({ ...g, values: g.values.slice(1) }), false);
  assert.equal(isValidSave({ ...g, values: [9, ...g.values.slice(1)].map((v, i) => (i === 2 ? 1 : v)) }), false);
});
