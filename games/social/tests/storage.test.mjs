// 本機儲存測試：間隔複習的狀態推進、題目紀錄（含模板）、設定與獎勵紀錄；以記憶體模擬 localStorage。

import test from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
globalThis.localStorage = {
  /** 讀取。 */
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  /** 寫入。 */
  setItem: (k, v) => store.set(k, String(v)),
  /** 刪除。 */
  removeItem: (k) => store.delete(k),
};

const s = await import('../src/js/storage.js');
const DAY = 24 * 3600 * 1000;

test('間隔複習：答錯 1 天後到期，到期後一次答對依序延長為 3、7、14 天，再答對即已掌握；期間答錯回到 1 天', () => {
  let now = 0;
  let r = s.nextReviewState(undefined, false, now);
  assert.deepEqual([r.review, r.stage, r.due, r.mastered], [true, 0, DAY, false]);
  // 還沒到期就答對：不改變。
  assert.deepEqual(s.nextReviewState(r, true, now + DAY / 2), r);
  for (const [stage, days] of [[1, 3], [2, 7], [3, 14]]) {
    now = r.due;
    r = s.nextReviewState(r, true, now);
    assert.deepEqual([r.review, r.stage, r.due - now], [true, stage, days * DAY]);
  }
  now = r.due;
  const done = s.nextReviewState(r, true, now);
  assert.deepEqual([done.review, done.mastered, done.due], [false, true, null]);
  const again = s.nextReviewState(r, false, now);
  assert.deepEqual([again.review, again.stage, again.due - now], [true, 0, DAY]);
  // 從未錯過、第一次就一次答對：直接已掌握。
  assert.equal(s.nextReviewState(undefined, true, 0).mastered, true);
});

test('題目紀錄：模板題以模板代碼記錄並保留最近的參數；錯題本只列固定題；今日複習計數包含到期的模板', () => {
  store.clear();
  s.markSeen(['hard-001', 'century#1624', 'century#1895'], 1000);
  const rec = s.loadRecord();
  assert.equal(rec.century.seen, 2);
  assert.deepEqual(rec.century.recent, ['century#1624', 'century#1895']);
  s.markResult('hard-001', false, 1000);
  s.markResult('century#1895', false, 1000);
  const lookup = (id) => (id === 'hard-001' ? { id } : null);
  assert.deepEqual(s.reviewIds(lookup), ['hard-001']);
  assert.equal(s.dueCount(lookup, ['century'], 1000 + DAY), 2);
  assert.equal(s.dueCount(lookup, ['century'], 1000), 0);
  s.clearReview();
  assert.equal(s.dueCount(lookup, ['century'], 1000 + DAY), 0);
});

test('設定：科目與主題記住選擇；損毀的設定回到預設', () => {
  store.clear();
  assert.deepEqual(s.loadSettings(), { theme: 'system', rest: true, subject: 'all', topics: [] });
  s.saveSettings({ theme: 'dark', rest: false, subject: 'history', topics: ['japanese-era', 'nope'] });
  assert.deepEqual(s.loadSettings(), { theme: 'dark', rest: false, subject: 'history', topics: ['japanese-era'] });
  store.set('social.settings', '{bad');
  assert.equal(s.loadSettings().subject, 'all');
});

test('完成一局：第一次過關、第一次全對與每日練習寫入 games.rewards，重複過關不再寫入', () => {
  store.clear();
  s.recordStart('medium');
  const first = s.recordComplete('medium', 60000, true);
  assert.ok(first.rewards.length === 3);
  const list = JSON.parse(store.get('games.rewards'));
  assert.deepEqual(list.map((r) => r.id).slice(0, 2), ['social:medium:clear', 'social:medium:perfect']);
  assert.equal(list[1].tier, 3);
  const again = s.recordComplete('medium', 50000, true);
  assert.equal(again.rewards.length, 0);
  assert.equal(s.loadStats().medium.completed, 2);
});
