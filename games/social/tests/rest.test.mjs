// 休息提醒測試：累計 20 分鐘提醒、提醒後重新累計、每局上限、離開超過 5 分鐘歸零、可關閉。

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRest, addPlay, leaveGame, enterGame, shouldRemind, REST_AFTER_MS, REST_RESET_MS, REST_MAX_PER_GAME } from '../src/js/rest.js';

const MIN = 60 * 1000;

test('累計 20 分鐘後提醒，提醒後重新累計', () => {
  const r = createRest();
  addPlay(r, 19 * MIN);
  assert.equal(shouldRemind(r, 0, true), false);
  assert.equal(shouldRemind(r, 1 * MIN, true), true);
  addPlay(r, 1 * MIN);
  assert.equal(shouldRemind(r, 0, true), false, '提醒時進行中的時間不重複計入');
  addPlay(r, REST_AFTER_MS);
  assert.equal(shouldRemind(r, 0, true), true);
});

test('關閉設定時不提醒；同一局最多提醒 3 次，新局重設', () => {
  const r = createRest();
  addPlay(r, REST_AFTER_MS);
  assert.equal(shouldRemind(r, 0, false), false);
  for (let i = 0; i < REST_MAX_PER_GAME; i++) {
    assert.equal(shouldRemind(r, 0, true), true);
    addPlay(r, REST_AFTER_MS);
  }
  assert.equal(shouldRemind(r, 0, true), false);
  enterGame(r, 0, true);
  assert.equal(shouldRemind(r, 0, true), true);
});

test('回首頁超過 5 分鐘才回來，連續遊玩時間歸零；短暫離開則保留', () => {
  const r = createRest();
  addPlay(r, 15 * MIN);
  leaveGame(r, 1000);
  enterGame(r, 1000 + 60 * 1000, false);
  assert.equal(r.playedMs, 15 * MIN);
  leaveGame(r, 2000);
  enterGame(r, 2000 + REST_RESET_MS + 1, false);
  assert.equal(r.playedMs, 0);
});
