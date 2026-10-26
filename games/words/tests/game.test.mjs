// 遊戲規則的單元測試：配對、答錯、提示、換盤、單字本與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, tapCard, useHint, boardDone, nextBoard, isLastBoard, hintsLeft, applyBoardToBook, isValidSave, restartGame } from '../src/js/game.js';

/**
 * 建立測試用的一局：2 盤、每盤 3 組。
 * @returns {object} 遊戲狀態。
 */
function newGame() {
  return createGame({
    source: 'food',
    difficulty: 'easy',
    boards: [
      { ids: ['a', 'b', 'c'], left: ['a', 'b', 'c'], right: ['c', 'a', 'b'] },
      { ids: ['d', 'e', 'f'], left: ['d', 'e', 'f'], right: ['f', 'e', 'd'] },
    ],
  });
}

test('先點左欄或右欄都能配對；同欄改選與取消選取', () => {
  const g = newGame();
  assert.equal(tapCard(g, 'left', 'a').type, 'select');
  assert.equal(tapCard(g, 'left', 'b').type, 'select', '同欄點另一張改選');
  assert.equal(tapCard(g, 'left', 'b').type, 'deselect', '點同一張取消');
  assert.equal(tapCard(g, 'right', 'c').type, 'select');
  assert.equal(tapCard(g, 'left', 'c').type, 'match');
  assert.equal(tapCard(g, 'left', 'c').type, 'ignore', '已配對的卡片不能再點');
});

test('配錯計錯誤次數，記在題目（左欄）單字上，且不保留配對', () => {
  const g = newGame();
  tapCard(g, 'left', 'a');
  const r = tapCard(g, 'right', 'b');
  assert.deepEqual(r, { type: 'wrong', left: 'a', right: 'b' });
  assert.equal(g.mistakes, 1);
  assert.equal(g.results.a, 'wrong');
  assert.equal(g.results.b, undefined);
  assert.equal(g.matched[0].length, 0);
  assert.equal(g.selected, null);
});

test('提示配對第一組未完成的單字並扣次數；用完不能再提示', () => {
  const g = newGame();
  tapCard(g, 'left', 'a');
  tapCard(g, 'right', 'a');
  assert.deepEqual(useHint(g), { result: 'matched', id: 'b' });
  assert.equal(g.results.b, 'hint');
  assert.equal(hintsLeft(g), 4);
  g.hintsUsed = 5;
  assert.equal(useHint(g).result, 'no-quota');
});

test('一盤完成後進入下一盤；最後一盤沒有下一盤', () => {
  const g = newGame();
  for (const id of ['a', 'b', 'c']) {
    tapCard(g, 'left', id);
    tapCard(g, 'right', id);
  }
  assert.equal(boardDone(g), true);
  assert.equal(nextBoard(g), true);
  assert.equal(g.board, 1);
  assert.equal(isLastBoard(g), true);
  assert.equal(nextBoard(g), false);
});

test('單字本：一次答對為已學會；答錯或提示進入待複習；之後答對移出', () => {
  const book = {};
  applyBoardToBook(book, ['a', 'b', 'c'], { b: 'wrong', c: 'hint' }, 100);
  assert.equal(book.a.learned, true);
  assert.equal(book.b.review, true);
  assert.equal(book.c.review, true);
  assert.equal(book.b.learned, false);
  applyBoardToBook(book, ['b'], {}, 200);
  assert.equal(book.b.review, false);
  assert.equal(book.b.learned, true);
  assert.equal(book.b.seen, 2);
  assert.equal(book.b.lastSeen, 200);
});

test('存檔驗證與重開本局', () => {
  const g = newGame();
  tapCard(g, 'left', 'a');
  tapCard(g, 'right', 'b');
  const exists = (id) => 'abcdef'.includes(id);
  assert.equal(isValidSave(JSON.parse(JSON.stringify(g)), exists), true);
  assert.equal(isValidSave({ ...g, v: 9 }, exists), false);
  assert.equal(isValidSave(g, (id) => id !== 'f'), false, '詞庫中不存在的單字視為損毀');
  const r = restartGame(g);
  assert.equal(r.mistakes, 0);
  assert.deepEqual(r.matched, [[], []]);
  assert.deepEqual(r.boards, g.boards);
});
