// 遊戲規則的單元測試：填字、替換、字庫數量、清除、復原、提示、成語完成與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../scripts/moe-source.mjs';
import {
  createGame, restartGame, answersFor, inputChar, erase, applyUndo, useHint, remainingChars,
  isWordDone, isBoardDone, isWrong, wordResult, nextEmpty, isValidSave, hintsLeft,
} from '../src/js/game.js';

const idioms = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'idioms.json'), 'utf8'));
const byText = new Map(idioms.map((i) => [i.text, i.id]));
const textOf = (id) => (idioms.find((i) => i.id === id) || {}).text;

// 交叉盤：「一諾千金」橫向（第 0 列），「千」向下接「千鈞一髮」直向（第 2 行）。
// 空格：諾(1)、金(3)、鈞(6)、髮(14)；字庫另無干擾字。
const CROSS = {
  rows: 4,
  cols: 4,
  words: [
    { id: byText.get('一諾千金'), dir: 'h', r: 0, c: 0 },
    { id: byText.get('千鈞一髮'), dir: 'v', r: 0, c: 2 },
  ],
  blanks: [1, 3, 6, 14],
  bank: ['金', '鈞', '諾', '髮'],
};

/**
 * 建立測試用的交叉盤新局。
 * @returns {{state: object, board: object, answers: string[]}} 狀態、盤面與正確字。
 */
function newGame() {
  const state = createGame({ difficulty: 'hard', mode: 'cross', boards: [CROSS] });
  return { state, board: state.boards[0], answers: answersFor(state, textOf)[0] };
}

test('填錯會累計錯誤並標記所屬成語，改對後恢復', () => {
  const { state, board, answers } = newGame();
  const r = inputChar(state, board, answers, 1, '金');
  assert.equal(r.wrong, true);
  assert.equal(state.mistakes, 1);
  assert.equal(isWrong(board, answers, 1), true);
  assert.deepEqual(board.wrong, [true, false]);
  inputChar(state, board, answers, 1, '諾');
  assert.equal(isWrong(board, answers, 1), false);
  assert.equal(state.mistakes, 1);
});

test('填入從字庫扣除，替換與清除歸還', () => {
  const { state, board, answers } = newGame();
  inputChar(state, board, answers, 1, '諾');
  assert.equal(remainingChars(board).get('諾'), 0);
  assert.equal(inputChar(state, board, answers, 3, '諾'), null, '字庫已無「諾」');
  inputChar(state, board, answers, 1, '金');
  assert.equal(remainingChars(board).get('諾'), 1);
  assert.equal(remainingChars(board).get('金'), 0);
  erase(state, board, 1);
  assert.equal(remainingChars(board).get('金'), 1);
});

test('題目給定的字不能修改或清除', () => {
  const { state, board, answers } = newGame();
  assert.equal(inputChar(state, board, answers, 0, '諾'), null);
  assert.equal(erase(state, board, 2), null);
});

test('復原依序撤銷且字庫同步還原', () => {
  const { state, board, answers } = newGame();
  const stack = [inputChar(state, board, answers, 1, '金').undo, inputChar(state, board, answers, 1, '諾').undo];
  applyUndo(board, stack.pop());
  assert.equal(board.filled[1], '金');
  applyUndo(board, stack.pop());
  assert.equal(board.filled[1], '');
  assert.equal(remainingChars(board).get('金'), 1);
});

test('交叉的兩個成語各自完成，全部空格正確即盤面完成', () => {
  const { state, board, answers } = newGame();
  inputChar(state, board, answers, 1, '諾');
  inputChar(state, board, answers, 3, '金');
  assert.equal(isWordDone(board, answers, 0), true);
  assert.equal(isWordDone(board, answers, 1), false);
  inputChar(state, board, answers, 6, '鈞');
  inputChar(state, board, answers, 14, '髮');
  assert.equal(isWordDone(board, answers, 1), true);
  assert.equal(isBoardDone(board, answers), true);
  assert.equal(wordResult(board, 0), 'perfect');
});

test('提示填入選取格並鎖定；所需的字被錯誤佔用時先清除', () => {
  const { state, board, answers } = newGame();
  inputChar(state, board, answers, 3, '諾');
  const r = useHint(state, board, answers, 1);
  assert.deepEqual(r, { result: 'filled', cell: 1, cleared: 3 });
  assert.equal(board.filled[1], '諾');
  assert.equal(board.filled[3], '');
  assert.equal(board.hinted[1], true);
  assert.equal(inputChar(state, board, answers, 1, '金'), null, '提示的格子鎖定');
  assert.equal(wordResult(board, 0), 'hint');
  assert.ok(remainingChars(board).get('諾') === 0);
});

test('提示：選取已填對的格子不扣次數；未選取時填第一個未填對的空格；用完後不能再提示', () => {
  const { state, board, answers } = newGame();
  inputChar(state, board, answers, 1, '諾');
  assert.equal(useHint(state, board, answers, 1).result, 'already-correct');
  assert.equal(state.hintsUsed, 0);
  assert.equal(useHint(state, board, answers, -1).cell, 3);
  state.hintsUsed = 3;
  assert.equal(hintsLeft(state), 0);
  assert.equal(useHint(state, board, answers, -1).result, 'no-quota');
});

test('nextEmpty 依序找下一個未填的空格', () => {
  const { state, board, answers } = newGame();
  assert.equal(nextEmpty(board, -1), 1);
  inputChar(state, board, answers, 3, '金');
  assert.equal(nextEmpty(board, 1), 6);
  assert.equal(nextEmpty(board, 14), 1);
});

test('重開本局回到新局狀態', () => {
  const { state, board, answers } = newGame();
  inputChar(state, board, answers, 1, '金');
  useHint(state, board, answers, 3);
  state.elapsedMs = 9000;
  assert.deepEqual(restartGame(state), newGame().state);
});

test('存檔驗證：拒絕損毀或成語已不存在的存檔', () => {
  const { state, board, answers } = newGame();
  inputChar(state, board, answers, 1, '諾');
  const ok = JSON.parse(JSON.stringify(state));
  assert.equal(isValidSave(ok, textOf), true);
  assert.equal(isValidSave(null, textOf), false);
  assert.equal(isValidSave({ ...ok, v: 9 }, textOf), false);
  assert.equal(isValidSave(ok, () => undefined), false, '成語 id 不存在');
  const bad = JSON.parse(JSON.stringify(ok));
  bad.boards[0].filled[0] = '諾';
  assert.equal(isValidSave(bad, textOf), false, '非空格不得填字');
  const over = JSON.parse(JSON.stringify(ok));
  over.boards[0].filled[3] = '諾';
  assert.equal(isValidSave(over, textOf), false, '字庫數量不足');
  const mode = JSON.parse(JSON.stringify(ok));
  mode.mode = 'single';
  assert.equal(isValidSave(mode, textOf), false);
});
