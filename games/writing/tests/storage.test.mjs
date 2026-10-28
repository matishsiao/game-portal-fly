// 本機儲存測試：統計、獎勵紀錄（第一次過關、第一次全對、每日練習、不重複）、題目紀錄與待練習、設定。

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

/** 查詢：固定題 easy-001 與所有模板題都存在。 */
const lookup = (id) => (id === 'easy-001' || id.includes('#') ? { id } : null);

test('第一次過關寫入 clear；全對再寫入 perfect（等級 +1）；每日練習；重複過關不再寫入', () => {
  localStorage.map.clear();
  const first = store.recordComplete('medium', 60000, false);
  assert.deepEqual(rewards().filter((r) => r.type !== 'daily').map((r) => [r.id, r.tier]), [['writing:medium:clear', 2]]);
  assert.ok(rewards().some((r) => r.type === 'daily' && r.id.startsWith('daily:')));
  assert.deepEqual(first.rewards, ['中等 第一次過關', '今天的每日練習']);
  const second = store.recordComplete('medium', 50000, true);
  assert.deepEqual(second.rewards, ['中等 第一次全對']);
  assert.deepEqual(rewards().filter((r) => r.type === 'perfect').map((r) => [r.id, r.tier, r.game]), [['writing:medium:perfect', 3, 'writing']]);
  store.recordComplete('medium', 40000, true);
  assert.equal(rewards().length, 3);
  const stats = store.loadStats().medium;
  assert.equal(stats.completed, 3);
  assert.equal(stats.noHint, 2);
  assert.equal(stats.bestMs, 40000);
});

test('重設統計後再過關不會重複給禮包', () => {
  store.resetStats();
  store.recordComplete('medium', 30000, true);
  assert.equal(rewards().length, 3);
});

test('已有其他遊戲的紀錄時只附加，不修改既有紀錄', () => {
  localStorage.map.clear();
  const other = [{ id: 'idiom:easy:clear', game: 'idiom', type: 'clear', tier: 1, label: 'x', at: 1 }];
  localStorage.setItem('games.rewards', JSON.stringify(other));
  store.recordComplete('expert', 1000, true);
  const list = rewards();
  assert.deepEqual(list[0], other[0]);
  assert.deepEqual(list.filter((r) => r.game === 'writing' && r.type !== 'daily').map((r) => r.tier), [4, 5]);
});

test('題目紀錄：答錯進待練習，一次答對移出；模板題以模板記錄並顯示答錯的那一題', () => {
  localStorage.map.clear();
  store.markSeen(['easy-001', 'chicken-legs#12-5'], 1000);
  store.markResult('easy-001', false);
  store.markResult('chicken-legs#12-5', false);
  assert.deepEqual(new Set(store.reviewIds(lookup)), new Set(['easy-001', 'chicken-legs#12-5']));
  const rec = store.loadRecord();
  assert.deepEqual(rec['chicken-legs'].recent, ['chicken-legs#12-5']);
  store.markSeen(['chicken-legs#14-4'], 2000);
  store.markResult('chicken-legs#14-4', true);
  store.markResult('easy-001', true);
  assert.deepEqual(store.reviewIds(lookup), []);
  assert.equal(store.practicedCount(lookup), 1);
});

test('重設統計不清除待練習；清除待練習需另外操作', () => {
  localStorage.map.clear();
  store.markSeen(['easy-001'], 1);
  store.markResult('easy-001', false);
  store.resetStats();
  assert.deepEqual(store.reviewIds(lookup), ['easy-001']);
  store.clearReview();
  assert.deepEqual(store.reviewIds(lookup), []);
});

test('紀錄與統計損毀時視為空白，不影響遊戲', () => {
  localStorage.setItem('writing.record', '{壞掉');
  localStorage.setItem('writing.stats', '[1,2]');
  assert.deepEqual(store.loadRecord(), {});
  assert.equal(store.loadStats().easy.completed, 0);
});

test('設定：預設跟隨系統、休息提醒開啟', () => {
  localStorage.map.clear();
  assert.deepEqual(store.loadSettings(), { theme: 'system', rest: true });
  store.saveSettings({ theme: 'dark', rest: false });
  assert.deepEqual(store.loadSettings(), { theme: 'dark', rest: false });
});
