// 題型模板檢查：批次產生題目，以暴力列舉獨立算出答案，並檢查格式、洩題與存檔重建。

import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, createRng, generateQuestion, questionFromId } from '../src/js/olympiad/templates.js';
import { assertQuestion } from './helpers.mjs';

/** 每個模板批次產生的題數。 */
const COUNT = 2000;

/** 星期名稱（與模板無關的獨立定義，索引 0 為星期一）。 */
const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * 從題目文字取出所有整數。
 * @param {string} text 題目文字。
 * @returns {number[]} 依出現順序的整數。
 */
function numbersIn(text) {
  return (text.match(/\d+/g) || []).map(Number);
}

/**
 * 只看題目文字，以暴力列舉獨立算出正解（不使用模板的計算結果）。
 * @param {string} templateId 模板代碼。
 * @param {string} text 題目文字。
 * @returns {string[]} 所有符合題意的正解文字（應恰好一個）。
 */
const SOLVERS = {
  // 雞兔同籠：列舉兔子隻數。
  'chicken-legs'(text) {
    const [heads, legs] = numbersIn(text);
    const found = [];
    for (let r = 0; r <= heads; r++) if ((heads - r) * 2 + r * 4 === legs) found.push(`${r} 隻`);
    return found;
  },
  // 植樹：在路上逐公尺模擬種樹位置。
  'tree-planting'(text) {
    const [length, gap] = numbersIn(text);
    const spots = new Set();
    for (let x = 0; x <= length; x += gap) spots.add(x);
    if (text.includes('圓形')) spots.delete(length);
    else if (text.includes('終點不種')) spots.delete(length);
    else if (text.includes('兩端都不種')) { spots.delete(0); spots.delete(length); }
    return [`${spots.size} 棵`];
  },
  // 星期：一天一天往後數。
  'weekday-cycle'(text) {
    const day = DAYS.indexOf(/今天是星期(.)/.exec(text)[1]);
    const [days] = numbersIn(text);
    let d = day;
    for (let i = 0; i < days; i++) d = (d + 1) % 7;
    return [`星期${DAYS[d]}`];
  },
  // 年齡倍數：一年一年往後試。
  'age-multiple'(text) {
    const [mother, daughter, k] = numbersIn(text);
    const found = [];
    for (let y = 1; y <= 60; y++) if (mother + y === k * (daughter + y)) found.push(`${y} 年`);
    return found;
  },
  // 排隊：排出一列，標記小明的位置後數總人數。
  'queue-position'(text) {
    const [front, back] = numbersIn(text);
    const found = [];
    for (let n = 1; n <= 40; n++) if (front <= n && n - front + 1 === back) found.push(`${n} 人`);
    return found;
  },
  // 等差數列：檢查相鄰差都相同，再往後推一項。
  'sequence-add'(text) {
    const terms = numbersIn(text);
    const step = terms[1] - terms[0];
    for (let i = 2; i < terms.length; i++) if (terms[i] - terms[i - 1] !== step) return [];
    return [String(terms[terms.length - 1] + step)];
  },
  // 和差：列舉弟弟的顆數。
  'marble-sumdiff'(text) {
    const [total, diff] = numbersIn(text);
    const found = [];
    for (let s = 0; s <= total; s++) if (s + (s + diff) === total) found.push(`${s} 顆`);
    return found;
  },
  // 年齡差：一年一年往後加。
  'age-gap'(text) {
    let [child, mother, years] = numbersIn(text);
    for (let i = 0; i < years; i++) {
      child++;
      mother++;
    }
    return [`${mother - child} 歲`];
  },
  // 答題得分：列舉答對題數。
  'score-quiz'(text) {
    const [total, plus, minus, score] = numbersIn(text).filter((n, i) => i !== 1 && i !== 3);
    const found = [];
    for (let c = 0; c <= total; c++) if (plus * c - minus * (total - c) === score) found.push(`${c} 題`);
    return found;
  },
  // 兩旁植樹：逐一標出一邊的種樹位置再乘以 2。
  'tree-both-sides'(text) {
    const [length, gap] = numbersIn(text);
    const spots = new Set();
    for (let x = 0; x <= length; x += gap) spots.add(x);
    if (text.includes('兩端都不種')) {
      spots.delete(0);
      spots.delete(length);
    }
    return [`${spots.size * 2} 棵`];
  },
  // 追及：一分鐘一分鐘模擬兩人的位置。
  'chase'(text) {
    const [slow, head, fast] = numbersIn(text);
    for (let m = 1; m <= 1000; m++) {
      if (fast * m === slow * (head + m)) return [`${m} 分鐘`];
      if (fast * m > slow * (head + m)) return [];
    }
    return [];
  },
  // 合作工程：一天一天累加完成量（以分數的分子比較，避免小數誤差）。
  'work-together'(text) {
    const [a, b] = numbersIn(text);
    for (let d = 1; d <= a; d++) {
      if (d * (a + b) === a * b) return [`${d} 天`];
      if (d * (a + b) > a * b) return [];
    }
    return [];
  },
  // 連乘餘數：直接逐次相乘取餘數。
  'power-remainder'(text) {
    const [count, base, mod] = numbersIn(text);
    let r = 1;
    for (let i = 0; i < count; i++) r = (r * base) % mod;
    return [String(r)];
  },
  // 火車過橋：一秒一秒模擬車尾的位置。
  'train-bridge'(text) {
    const [train, v, bridge] = numbersIn(text);
    for (let t = 1; t <= 1000; t++) if (v * t - train >= bridge) return v * t - train === bridge ? [`${t} 秒`] : [];
    return [];
  },
  // 同餘：從 1 開始逐一檢查三個條件。
  'remainder-min'(text) {
    const nums = numbersIn(text);
    const [r3, r5, r7] = [nums[1], nums[3], nums[5]];
    for (let x = 1; x <= 1000; x++) if (x % 3 === r3 && x % 5 === r5 && x % 7 === r7) return [String(x)];
    return [];
  },
  // 兩兩配對：列舉所有 i < j 的組合；反推題則從 2 隊開始逐一試。
  'handshake'(text) {
    if (text.includes('一共有幾支')) {
      const [m] = numbersIn(text);
      const found = [];
      for (let t = 2; t <= 100; t++) {
        let c = 0;
        for (let i = 0; i < t; i++) for (let j = i + 1; j < t; j++) c++;
        if (c === m) found.push(`${t} 支`);
      }
      return found;
    }
    const [n] = numbersIn(text);
    let pairs = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs++;
    return [`${pairs} ${text.includes('握') ? '次' : '場'}`];
  },
};

for (const id of Object.keys(TEMPLATES)) {
  test(`模板 ${id}：${COUNT} 題答案正確、恰好一個正解選項、不洩題`, () => {
    const rng = createRng(12345);
    for (let i = 0; i < COUNT; i++) {
      const q = generateQuestion(id, rng);
      assertQuestion(q);
      const solved = SOLVERS[id](q.question);
      assert.equal(solved.length, 1, `${q.id} 解答數`);
      assert.equal(q.choices[q.answer], solved[0], `${q.id} 答案`);
      assert.equal(q.choices.filter((c) => c === solved[0]).length, 1, `${q.id} 正解選項數`);
    }
  });

  test(`模板 ${id}：由 id 重建的題目與原題相同`, () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(id, rng);
      assert.deepEqual(questionFromId(q.id), q);
    }
  });
}

test('數字選項中正解的大小名次會變化，不能靠選最大或最小猜答案', () => {
  for (const id of Object.keys(TEMPLATES)) {
    if (id === 'weekday-cycle') continue;
    const rng = createRng(5);
    const ranks = new Set();
    let smallest = 0;
    for (let i = 0; i < 400; i++) {
      const q = generateQuestion(id, rng);
      const nums = q.choices.map((c) => parseInt(c, 10));
      const rank = nums.filter((n) => n < nums[q.answer]).length;
      ranks.add(rank);
      if (rank === 0) smallest++;
    }
    assert.ok(ranks.size >= 3, `${id} 正解名次只有 ${[...ranks].join('、')}`);
    assert.ok(smallest / 400 < 0.6, `${id} 正解是最小值的比例 ${smallest / 400}`);
  }
});

test('格式不符、不存在的模板或參數不合用的 id 回傳 null', () => {
  const bad = ['easy-001', 'nope#1-2', 'chicken-legs#', 'constructor#1', 'tree-planting#5-2-4', 'tree-planting#3-2-1',
    'tree-planting#1-7-5', 'chicken-legs#5-9', 'chicken-legs#8', 'chicken-legs#12-6', 'weekday-cycle#9-20',
    'weekday-cycle#7-21', 'weekday-cycle#1-0', 'queue-position#02-03', 'chase#14-4-4', 'score-quiz#10-3-1-3', 'score-quiz#18-3-4-14'];
  for (const id of bad) assert.equal(questionFromId(id), null, id);
});
