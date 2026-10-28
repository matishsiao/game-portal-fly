// 題型模板測試：每個模板批次產生 2,000 題，只讀題目文字、以另一種算法獨立算出答案，必須與正確選項相同；格式符合題庫規則，且由 id 重建的題目相同。

import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, TEMPLATE_KEYS, TEMPLATE_CARDS, generate, questionFromId } from '../src/js/social/templates.js';
import { questionErrors } from '../scripts/bank-rules.mjs';

/**
 * 固定種子的亂數（mulberry32）。
 * @param {number} seed 種子。
 * @returns {() => number} 亂數。
 */
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 去掉千分位逗號後轉成數字。
 * @param {string} s 文字。
 * @returns {number} 數字。
 */
const num = (s) => Number(s.replace(/,/g, ''));

/** 每個模板的獨立解法：只讀題目文字，回傳正確選項應有的文字。 */
const SOLVERS = {
  /**
   * 世紀：逐一找出包含這一年的 100 年區間。
   * @param {string} q 題目。
   * @returns {string} 答案。
   */
  century: (q) => {
    const y = num(/西元 ([\d,]+) 年/.exec(q)[1]);
    for (let c = 1; c <= 30; c++) if (y > (c - 1) * 100 && y <= c * 100) return `${c} 世紀`;
    throw new Error('找不到世紀');
  },
  /**
   * 民國與西元：以民國元年＝1912 年逐年推算。
   * @param {string} q 題目。
   * @returns {string} 答案。
   */
  minguo: (q) => {
    let m = /^民國 (\d+) 年是西元幾年/.exec(q);
    if (m) {
      let y = 1912;
      for (let n = 1; n < Number(m[1]); n++) y++;
      return `西元 ${y} 年`;
    }
    m = /^西元 (\d+) 年是民國幾年/.exec(q);
    let n = 1;
    for (let y = 1912; y < Number(m[1]); y++) n++;
    return `民國 ${n} 年`;
  },
  /**
   * 比例尺：圖上距離乘以分母得到公分，再換成公尺或公里。
   * @param {string} q 題目。
   * @returns {string} 答案。
   */
  'map-scale': (q) => {
    const s = num(/1：([\d,]+)/.exec(q)[1]);
    const d = Number(/相距 (\d+) 公分/.exec(q)[1]);
    const cm = d * s;
    const m = cm / 100;
    const fmt = (n) => n.toLocaleString('en-US');
    return m >= 1000 ? `${fmt(m / 1000)} 公里` : `${fmt(m)} 公尺`;
  },
  /**
   * 時差：把兩地都換成「與 0 度經線的時差」，經由 0 度經線的時刻換算。
   * @param {string} q 題目。
   * @returns {string} 答案。
   */
  'time-zone': (q) => {
    const lons = [...q.matchAll(/(東|西)經 (\d+) 度/g)].map((m) => (m[1] === '東' ? 1 : -1) * Number(m[2]));
    const t = /是(凌晨 12 點|上午 (\d+) 點|中午 12 點|下午 (\d+) 點)時/.exec(q);
    const h = t[1] === '凌晨 12 點' ? 0 : t[1] === '中午 12 點' ? 12 : t[2] ? Number(t[2]) : Number(t[3]) + 12;
    // 以分鐘計算：先換成 0 度經線的時刻，再換成乙地。
    const utc = h * 60 - (lons[0] / 15) * 60;
    const local = utc + (lons[1] / 15) * 60;
    const day = Math.floor(local / (24 * 60));
    const hour = ((local / 60) % 24 + 24) % 24;
    const dayText = day < 0 ? '前一天' : day > 0 ? '隔天' : '同一天';
    const part = hour === 0 ? '凌晨 12 點' : hour < 12 ? `上午 ${hour} 點` : hour === 12 ? '中午 12 點' : `下午 ${hour - 12} 點`;
    return `${dayText}${part}`;
  },
  /**
   * 經緯度：緯度決定南北半球、經度決定東西半球。
   * @param {string} q 題目。
   * @returns {string} 答案。
   */
  'lat-lon': (q) => {
    const ns = /北緯/.test(q) ? '北半球' : '南半球';
    const ew = /東經/.test(q) ? '東半球' : '西半球';
    return `${ns}、${ew}`;
  },
};

test('每個模板 2,000 題：獨立算出的答案與正確選項相同、4 個選項不重複、格式符合題庫規則、由 id 重建相同', () => {
  const cardIds = new Set(TEMPLATE_CARDS.map((c) => c.id));
  for (const key of TEMPLATE_KEYS) {
    const r = rng(key.length * 97);
    for (let i = 0; i < 2000; i++) {
      const q = generate(key, r);
      assert.ok(q, `${key} 無法產生題目`);
      const right = q.options[q.answer].text;
      assert.equal(right, SOLVERS[key](q.question), `${key}：${q.question}`);
      assert.equal(new Set(q.options.map((o) => o.text)).size, 4, `${key} 選項重複：${q.question}`);
      // 題庫規則（id 格式除外：模板題的 id 是「模板代碼#參數」）。
      const errors = questionErrors({ ...q, id: `${q.difficulty}-000` }, cardIds);
      assert.deepEqual(errors, [], `${key}：${errors.join('；')}`);
      assert.deepEqual(questionFromId(q.id), q, `${key} 由 id 重建不同`);
      assert.ok(q.explain.includes(right.replace(/^(同一天|隔天|前一天)/, '')), `${key} 詳解沒有寫出答案：${q.explain}`);
    }
  }
});

test('不合用的參數與格式錯誤的 id 無法重建（存檔被改過時依資料損毀處理）', () => {
  assert.equal(questionFromId('century#50'), null);
  assert.equal(questionFromId('time-zone#120_120_8'), null);
  assert.equal(questionFromId('nope#1_2'), null);
  assert.equal(questionFromId('easy-001'), null);
  for (const key of TEMPLATE_KEYS) assert.ok(TEMPLATES[key].difficulties.length > 0);
});
