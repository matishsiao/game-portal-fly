// 遊戲規則的單元測試：畫線、截斷與恢復、清除、復原、提示、完成判定與存檔驗證。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, restartGame, beginSession, sessionAtHead, moveTo, headOf, clearPair, snapshot, restore,
  useHint, isComplete, isConnected, connectedCount, fillRatio, hintsLeft, isValidSave,
} from '../src/js/game.js';
import { SIZE, ENDS, SOLUTION } from './fixtures.mjs';

/**
 * 建立測試用的新局。
 * @returns {object} 遊戲狀態。
 */
function newGame() {
  return createGame({ difficulty: 'easy', size: SIZE, ends: ENDS, solution: SOLUTION });
}

/**
 * 從端點開始依序畫線。
 * @param {object} g 遊戲狀態。
 * @param {number[]} cells 起點端點與之後經過的格子。
 * @returns {object} 畫線階段。
 */
function draw(g, cells) {
  const { session } = beginSession(g, cells[0]);
  for (const c of cells.slice(1)) moveTo(g, session, c);
  return session;
}

test('從端點畫線到另一端點即連通，連通後不能再延伸', () => {
  const g = newGame();
  const s = draw(g, [0, 4, 8, 12, 13, 14, 15]);
  assert.equal(isConnected(g, 0), true);
  assert.equal(moveTo(g, s, 11), false);
  assert.equal(connectedCount(g), 1);
});

test('只能走到相鄰格，不能進入其他編號的端點', () => {
  const g = newGame();
  const { session } = beginSession(g, 0);
  assert.equal(moveTo(g, session, 8), false, '不相鄰');
  assert.equal(moveTo(g, session, 1), false, '其他編號的端點');
  assert.equal(moveTo(g, session, 4), true);
  assert.equal(moveTo(g, session, 5), false, '其他編號的端點');
  assert.equal(headOf(g, session), 4);
});

test('退回到線上的格子會截斷', () => {
  const g = newGame();
  const s = draw(g, [0, 4, 8, 12]);
  assert.equal(moveTo(g, s, 4), true);
  assert.deepEqual(g.paths[0], [0, 4]);
});

test('點線上的格子截斷到該格，點端點從該端點重新開始', () => {
  const g = newGame();
  draw(g, [0, 4, 8, 12]);
  beginSession(g, 8);
  assert.deepEqual(g.paths[0], [0, 4, 8]);
  beginSession(g, 15);
  assert.deepEqual(g.paths[0], [15]);
});

test('延伸進入其他線時截斷它，同一階段退回時恢復', () => {
  const g = newGame();
  draw(g, [1, 2, 3, 7, 11]);
  const s = draw(g, [5, 6]);
  assert.equal(moveTo(g, s, 7), true);
  assert.deepEqual(g.paths[1], [1, 2, 3], '編號 2 從 7 截斷');
  assert.equal(moveTo(g, s, 6), true);
  assert.deepEqual(g.paths[1], [1, 2, 3, 7, 11], '退回後恢復');
});

test('新的階段開始後，先前截斷的線不再恢復', () => {
  const g = newGame();
  draw(g, [1, 2, 3, 7, 11]);
  draw(g, [5, 6, 7]);
  const { session } = beginSession(g, 6);
  assert.deepEqual(g.paths[2], [5, 6]);
  assert.deepEqual(g.paths[1], [1, 2, 3]);
  assert.ok(session);
});

test('清除整條線；只含端點的線不算改變', () => {
  const g = newGame();
  draw(g, [0, 4, 8]);
  assert.equal(clearPair(g, 0), true);
  assert.deepEqual(g.paths[0], []);
  beginSession(g, 0);
  assert.equal(clearPair(g, 0), false);
});

test('復原還原所有線', () => {
  const g = newGame();
  draw(g, [1, 2, 3, 7, 11]);
  const before = snapshot(g);
  draw(g, [5, 6, 7]);
  restore(g, before);
  assert.deepEqual(g.paths[1], [1, 2, 3, 7, 11]);
  assert.deepEqual(g.paths[2], []);
});

test('鍵盤選取：沒有線時從第一個端點開始', () => {
  const g = newGame();
  const s = sessionAtHead(g, 1);
  assert.equal(headOf(g, s), 1);
  moveTo(g, s, 2);
  const again = sessionAtHead(g, 1);
  assert.equal(headOf(g, again), 2);
});

test('提示：未選取時提示解答最短的線，截斷重疊的線並鎖定', () => {
  const g = newGame();
  draw(g, [1, 2, 6]);
  const r = useHint(g, -1);
  assert.deepEqual(r, { result: 'filled', pair: 2 });
  assert.deepEqual(g.paths[2], [5, 6, 10, 9]);
  assert.deepEqual(g.paths[1], [1, 2], '編號 2 從 6 截斷');
  assert.equal(g.hinted[2], true);
  assert.equal(beginSession(g, 5).reason, 'hinted');
  const { session } = beginSession(g, 1);
  moveTo(g, session, 2);
  assert.equal(moveTo(g, session, 6), false, '不能進入提示鎖定的線');
  restore(g, [[], [], []]);
  assert.deepEqual(g.paths[2], [5, 6, 10, 9], '復原不影響提示的線');
});

test('提示：選取的線已正確時不扣次數；用完後不能再提示', () => {
  const g = newGame();
  draw(g, [9, 10, 6, 5]);
  assert.equal(useHint(g, 2).result, 'already-correct');
  assert.equal(g.hintsUsed, 0);
  g.hintsUsed = 3;
  assert.equal(hintsLeft(g), 0);
  assert.equal(useHint(g, 0).result, 'no-quota');
});

test('全部連通且填滿才完成', () => {
  const g = newGame();
  draw(g, [0, 4, 8, 12, 13, 14, 15]);
  draw(g, [1, 2, 3, 7, 11]);
  assert.equal(isComplete(g), false);
  draw(g, [5, 6, 10, 9]);
  assert.equal(isComplete(g), true);
  assert.equal(fillRatio(g), 1);
});

test('重開本局回到新局狀態', () => {
  const g = newGame();
  draw(g, [0, 4]);
  useHint(g, -1);
  g.strokes = 3;
  assert.deepEqual(restartGame(g), newGame());
});

test('存檔驗證會拒絕損毀資料', () => {
  const g = newGame();
  draw(g, [1, 2, 3]);
  const ok = JSON.parse(JSON.stringify(g));
  assert.equal(isValidSave(ok), true);
  assert.equal(isValidSave(null), false);
  assert.equal(isValidSave({ ...ok, v: 99 }), false);
  assert.equal(isValidSave({ ...ok, paths: [[0, 4], [4, 8], []] }), false, '重疊');
  assert.equal(isValidSave({ ...ok, paths: [[0, 1, 2], [], []] }), false, '穿過其他端點');
  assert.equal(isValidSave({ ...ok, paths: [[4, 8], [], []] }), false, '不是從端點開始');
  assert.equal(isValidSave({ ...ok, paths: [[0, 2], [], []] }), false, '不相鄰');
  assert.equal(isValidSave({ ...ok, hinted: [true, false, false] }), false, '提示的線與解答不符');
  assert.equal(isValidSave({ ...ok, solution: [[0, 4], SOLUTION[1], SOLUTION[2]] }), false);
});
