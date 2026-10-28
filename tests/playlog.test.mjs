// 共用模組 playlog.js 的單元測試：遊玩歷程（最近 100 筆）、帳號凍結（密碼與時間），以及各遊戲的複本與正本一致。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  HISTORY_KEY, HISTORY_LIMIT, MIN_SESSION_MS, RESUME_GAP_MS, FREEZE_KEY,
  parseHistory, upsertHistory, freezeState, validateFreeze, makeFreeze, checkPassword, hashPassword, formatRemain, trackPlay,
} from '../src/playlog.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOUR = 3600 * 1000;

/**
 * 建立一筆遊玩紀錄。
 * @param {number} n 序號（也是開始時間）。
 * @returns {object} 紀錄。
 */
function entry(n) {
  return { id: `sudoku:${n}`, game: 'sudoku', start: n, end: n + 1000, ms: 1000 };
}

test('遊玩歷程：同一個 id 更新而不重複，依開始時間排列，只保留最新 100 筆', () => {
  let list = [];
  for (let n = 1; n <= HISTORY_LIMIT + 20; n++) list = upsertHistory(list, entry(n));
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list[0].start, 21);
  assert.equal(list.at(-1).start, HISTORY_LIMIT + 20);
  list = upsertHistory(list, { ...entry(50), ms: 9999 });
  assert.equal(list.length, HISTORY_LIMIT);
  assert.equal(list.find((r) => r.id === 'sudoku:50').ms, 9999);
});

test('遊玩歷程：損毀或格式錯誤的資料被忽略', () => {
  assert.deepEqual(parseHistory(null), []);
  assert.deepEqual(parseHistory('x'), []);
  assert.deepEqual(parseHistory([null, { id: 'a' }, entry(3), entry(1)]).map((r) => r.start), [1, 3]);
  assert.equal(upsertHistory({ bad: true }, entry(1)).length, 1);
});

test('凍結設定：時數為 1～168 的整數，密碼 4～32 字且兩次相同', () => {
  assert.equal(validateFreeze(1, 'abcd', 'abcd'), '');
  assert.equal(validateFreeze(168, 'abcd', 'abcd'), '');
  assert.notEqual(validateFreeze(0, 'abcd', 'abcd'), '');
  assert.notEqual(validateFreeze(169, 'abcd', 'abcd'), '');
  assert.notEqual(validateFreeze(1.5, 'abcd', 'abcd'), '');
  assert.notEqual(validateFreeze(NaN, 'abcd', 'abcd'), '');
  assert.notEqual(validateFreeze(1, 'abc', 'abc'), '');
  assert.notEqual(validateFreeze(1, 'a'.repeat(33), 'a'.repeat(33)), '');
  assert.equal(validateFreeze(1, 'abcd', 'abce'), '兩次輸入的密碼不一樣');
});

test('凍結：以小時計算，時間到了仍凍結，只有正確密碼能解除；不存明碼', async () => {
  const now = Date.UTC(2026, 9, 28, 6, 0);
  const data = await makeFreeze('秘密1234', 3, now);
  assert.equal(data.until - data.at, 3 * HOUR);
  assert.ok(!JSON.stringify(data).includes('秘密1234'));
  const before = freezeState(data, now + HOUR);
  assert.equal(before.expired, false);
  assert.equal(before.remainMs, 2 * HOUR);
  const after = freezeState(data, now + 5 * HOUR);
  assert.equal(after.expired, true);
  assert.equal(await checkPassword(data, '秘密1234'), true);
  assert.equal(await checkPassword(data, '秘密12345'), false);
  assert.equal(await checkPassword(data, ''), false);
});

test('凍結：沒有 crypto.subtle 時的退路雜湊也能驗證；資料不完整視為沒有凍結', async () => {
  const salt = 'abc';
  const data = { v: 1, at: 0, until: HOUR, salt, alg: 'fnv', hash: await hashPassword('pass1', salt, 'fnv') };
  assert.ok(freezeState(data, 0));
  assert.equal(await checkPassword(data, 'pass1'), true);
  assert.equal(await checkPassword(data, 'pass2'), false);
  assert.equal(freezeState(null, 0), null);
  assert.equal(freezeState({ v: 1, until: HOUR }, 0), null);
});

test('剩餘時間格式', () => {
  assert.equal(formatRemain(30 * 1000), '1 分');
  assert.equal(formatRemain(HOUR), '1 小時');
  assert.equal(formatRemain(2 * HOUR + 5 * 60000), '2 小時 5 分');
});

/**
 * 建立最小的瀏覽器環境（document、window、localStorage、performance、Date.now），供 trackPlay 測試。
 * @returns {{store: Map<string, string>, advance: (ms: number) => void, hide: () => void, show: () => void, restore: () => void}} 控制介面。
 */
function fakeBrowser() {
  const store = new Map();
  const listeners = { doc: {}, win: {} };
  let clock = Date.UTC(2026, 9, 28, 1, 0);
  let mono = 1000;
  /**
   * 觸發事件。
   * @param {object} target 監聽表。
   * @param {string} type 事件名稱。
   */
  const fire = (target, type) => (target[type] || []).forEach((fn) => fn({}));
  const saved = { document: globalThis.document, window: globalThis.window, localStorage: globalThis.localStorage, now: Date.now, perf: Object.getOwnPropertyDescriptor(globalThis, 'performance') };
  globalThis.document = {
    visibilityState: 'visible',
    /** 註冊 document 事件。 */
    addEventListener: (type, fn) => (listeners.doc[type] ||= []).push(fn),
  };
  globalThis.window = {
    /** 註冊 window 事件。 */
    addEventListener: (type, fn) => (listeners.win[type] ||= []).push(fn),
  };
  globalThis.localStorage = {
    /** 讀取。 */
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    /** 寫入。 */
    setItem: (k, v) => store.set(k, String(v)),
    /** 刪除。 */
    removeItem: (k) => store.delete(k),
  };
  Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => mono } });
  Date.now = () => clock;
  return {
    store,
    /** 時間前進（牆上時鐘與單調時鐘同步）。 */
    advance: (ms) => {
      clock += ms;
      mono += ms;
    },
    /** 切到背景。 */
    hide: () => {
      globalThis.document.visibilityState = 'hidden';
      fire(listeners.doc, 'visibilitychange');
    },
    /** 回到前景。 */
    show: () => {
      globalThis.document.visibilityState = 'visible';
      fire(listeners.doc, 'visibilitychange');
    },
    /** 還原全域物件。 */
    restore: () => {
      globalThis.document = saved.document;
      globalThis.window = saved.window;
      globalThis.localStorage = saved.localStorage;
      Date.now = saved.now;
      Object.defineProperty(globalThis, 'performance', saved.perf);
    },
  };
}

test('trackPlay：前景時間累計、短暫離開接續同一段、太短不記錄、凍結時不計時', async () => {
  const b = fakeBrowser();
  try {
    const history = () => JSON.parse(b.store.get(HISTORY_KEY) || '[]');
    trackPlay('sudoku');
    b.advance(MIN_SESSION_MS - 1000);
    b.hide();
    assert.equal(history().length, 0, '未達最短時間不記錄');
    b.advance(60 * 1000);
    b.show();
    b.advance(5 * 60 * 1000);
    b.hide();
    assert.equal(history().length, 1);
    assert.equal(history()[0].game, 'sudoku');
    assert.equal(history()[0].ms, MIN_SESSION_MS - 1000 + 5 * 60 * 1000, '背景時間不算');
    b.advance(RESUME_GAP_MS + 1000);
    b.show();
    b.advance(20 * 1000);
    b.hide();
    assert.equal(history().length, 2, '離開太久算新的一段');
    assert.equal(history()[1].ms, 20 * 1000);
    b.store.set(FREEZE_KEY, JSON.stringify(await makeFreeze('abcd', 1, Date.now())));
    b.advance(RESUME_GAP_MS + 1000);
    b.show();
    b.advance(60 * 1000);
    b.hide();
    assert.equal(history().length, 2, '凍結時不記錄');
  } finally {
    b.restore();
  }
});

test('已上架遊戲的 src/js/playlog.js 與大廳的 src/playlog.js 完全相同', () => {
  const master = readFileSync(join(ROOT, 'src/playlog.js'), 'utf8');
  // 以組合清單（scripts/assemble.mjs 的 GAMES）為準；開發中的遊戲上架前才須加入。
  const games = [...readFileSync(join(ROOT, 'scripts/assemble.mjs'), 'utf8').matchAll(/^\s+(\w+): 'games\/\1',$/gm)].map((m) => m[1]);
  assert.ok(games.length >= 8);
  for (const g of games) {
    const copy = join(ROOT, 'games', g, 'src/js/playlog.js');
    assert.ok(existsSync(copy), `${g} 缺少 src/js/playlog.js`);
    assert.equal(readFileSync(copy, 'utf8'), master, `${g} 的 playlog.js 與正本不同，請重新複製`);
    const app = readFileSync(join(ROOT, 'games', g, 'src/js/app.js'), 'utf8');
    assert.ok(app.includes(`trackPlay('${g}')`) && app.includes('guardFreeze('), `${g} 未啟用遊玩歷程與凍結`);
  }
});
