// 本機儲存測試：獎勵紀錄、複習本、科學圖鑑與設定。

import test from 'node:test';
import assert from 'node:assert/strict';

/** 模擬瀏覽器的 localStorage。 */
class MemoryStorage {
  /** 建立空白儲存。 */
  constructor() {
    this.map = new Map();
  }

  /**
   * 讀取。
   * @param {string} k 鍵。
   * @returns {string | null} 值。
   */
  getItem(k) {
    return this.map.has(k) ? this.map.get(k) : null;
  }

  /**
   * 寫入。
   * @param {string} k 鍵。
   * @param {string} v 值。
   */
  setItem(k, v) {
    this.map.set(k, String(v));
  }

  /**
   * 刪除。
   * @param {string} k 鍵。
   */
  removeItem(k) {
    this.map.delete(k);
  }
}

globalThis.localStorage = new MemoryStorage();
const store = await import('../src/js/storage.js');

/**
 * 讀取共用的獎勵紀錄。
 * @returns {object[]} 紀錄。
 */
const rewards = () => JSON.parse(localStorage.getItem('games.rewards') || '[]');

test('第一次過關寫入 clear，第一次全對寫入 perfect（等級 +1），每日練習；重複不寫入', () => {
  localStorage.map.clear();
  assert.deepEqual(store.recordComplete('expert', 1000, false).rewards, ['專家 第一次過關', '今天的每日練習']);
  assert.deepEqual(store.recordComplete('expert', 900, true).rewards, ['專家 第一次全對']);
  assert.deepEqual(store.recordComplete('expert', 800, true).rewards, []);
  assert.deepEqual(rewards().filter((r) => r.type !== 'daily').map((r) => [r.id, r.tier, r.game]), [
    ['science:expert:clear', 4, 'science'],
    ['science:expert:perfect', 5, 'science'],
  ]);
});

test('複習本：答錯或看提示加入，之後一次答對移出；重設統計不影響', () => {
  localStorage.map.clear();
  const lookup = (id) => (id.startsWith('easy-') ? { id } : null);
  store.markSeen(['easy-001', 'easy-002'], 10);
  store.markResult('easy-001', false, '2026-10-28');
  store.markResult('easy-002', true, '2026-10-28');
  assert.deepEqual(store.reviewIds(lookup), ['easy-001']);
  store.resetStats();
  assert.deepEqual(store.reviewIds(lookup), ['easy-001']);
  store.markResult('easy-001', true, '2026-10-29');
  assert.deepEqual(store.reviewIds(lookup), []);
});

test('科學圖鑑：第一次收集回傳 true，重複收集不改變時間；損毀時視為空白', () => {
  localStorage.map.clear();
  assert.equal(store.collectCard('melting', 100), true);
  assert.equal(store.collectCard('melting', 200), false);
  assert.deepEqual(store.loadCards(), { melting: 100 });
  localStorage.setItem('science.cards', '[壞掉');
  assert.deepEqual(store.loadCards(), {});
});

test('設定：預設中年級、跟隨系統、休息提醒開啟；不合法的學習階段回到預設', () => {
  localStorage.map.clear();
  assert.deepEqual(store.loadSettings(), { theme: 'system', rest: true, stage: 'medium' });
  store.saveSettings({ theme: 'dark', rest: false, stage: 'expert' });
  assert.deepEqual(store.loadSettings(), { theme: 'dark', rest: false, stage: 'expert' });
  store.saveSettings({ theme: 'dark', rest: false, stage: 'college' });
  assert.equal(store.loadSettings().stage, 'medium');
});

test('間隔複習：一次答對盒子 ＋1 並依盒子排下次日期；答錯回到第 1 盒、隔天複習', () => {
  localStorage.map.clear();
  store.markSeen(['medium-501'], 1);
  assert.deepEqual(store.markResult('medium-501', true, '2026-10-28'), { before: 0, after: 1 });
  assert.equal(store.loadRecord()['medium-501'].due, '2026-10-29');
  store.markResult('medium-501', true, '2026-10-29');
  assert.deepEqual([store.loadRecord()['medium-501'].box, store.loadRecord()['medium-501'].due], [2, '2026-11-01']);
  store.markResult('medium-501', false, '2026-11-01');
  assert.deepEqual([store.loadRecord()['medium-501'].box, store.loadRecord()['medium-501'].due], [1, '2026-11-02']);
});
