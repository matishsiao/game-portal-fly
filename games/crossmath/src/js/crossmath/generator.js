// 出題器：產生連通的算式骨架 → 填入合法數值 → 挖空，並驗證唯一解與難度。
//
// 數字格一律放在偶數列、偶數行（「節點」），橫向算式在偶數列、直向算式在偶數行，
// 因此運算子格不會重疊，算式只會在數字格交叉。

import { evaluate, hashPuzzle, shuffle, bankCounts, parseLayout } from './core.js';
import { countSolutions } from './solver.js';
import { gradePuzzle } from './logic.js';

/**
 * 難度設定：
 * level 技巧等級、hints 每局提示額度、size 盤面邊長、equations 算式數量範圍、max 數值上限、
 * ops 可用運算子、longChance 新算式為長算式的機率、minLong 最少長算式數、blanks 空格比例範圍。
 */
export const DIFFICULTIES = {
  easy: { label: '簡單', level: 1, hints: 5, size: 7, equations: [4, 6], max: 20, ops: ['+', '-'], longChance: 0, minLong: 0, blanks: [0.3, 0.4] },
  medium: { label: '中等', level: 2, hints: 4, size: 9, equations: [6, 9], max: 50, ops: ['+', '-', 'x'], longChance: 0, minLong: 0, blanks: [0.4, 0.5] },
  hard: { label: '困難', level: 3, hints: 3, size: 11, equations: [8, 12], max: 99, ops: ['+', '-', 'x', '/'], longChance: 0.25, minLong: 0, blanks: [0.5, 0.6] },
  expert: { label: '專家', level: 4, hints: 2, size: 11, equations: [10, 14], max: 99, ops: ['+', '-', 'x', '/'], longChance: 0.4, minLong: 2, blanks: [0.6, 0.7] },
};

/** 難度代碼依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/**
 * 取得 [min, max] 範圍內的隨機整數。
 * @param {number} min 最小值。
 * @param {number} max 最大值。
 * @param {() => number} rng 亂數函式。
 * @returns {number} 隨機整數。
 */
function randInt(min, max, rng) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * 產生算式骨架：從一條算式開始，反覆在既有數字格上長出垂直方向的新算式。
 * @param {object} cfg 難度設定。
 * @param {() => number} rng 亂數函式。
 * @returns {{dir: 'h' | 'v', line: number, start: number, len: number}[] | null}
 *   以節點座標表示的算式（len 為數字格數 3 或 4），失敗時為 null。
 */
function generateSkeleton(cfg, rng) {
  const m = (cfg.size + 1) / 2;
  const target = randInt(cfg.equations[0], cfg.equations[1], rng);
  const eqs = [];
  /**
   * 隨機決定新算式的數字格數。
   * @returns {number} 3 或 4。
   */
  const pickLen = () => (rng() < cfg.longChance ? 4 : 3);
  /**
   * 判斷新算式是否與同方向的既有算式重疊。
   * @param {{dir: string, line: number, start: number, len: number}} eq 新算式。
   * @returns {boolean} 可放置時為 true。
   */
  const fits = (eq) => {
    if (eq.start < 0 || eq.start + eq.len > m) return false;
    return eqs.every((o) => o.dir !== eq.dir || o.line !== eq.line || o.start + o.len <= eq.start || eq.start + eq.len <= o.start);
  };
  const first = { dir: rng() < 0.5 ? 'h' : 'v', line: randInt(0, m - 1, rng), len: pickLen() };
  first.start = randInt(0, m - first.len, rng);
  eqs.push(first);
  for (let tries = 0; eqs.length < target && tries < 400; tries++) {
    const base = eqs[Math.floor(rng() * eqs.length)];
    const k = Math.floor(rng() * base.len);
    // 交叉節點在 base 上的座標：橫向算式的節點為 (line, start + k)。
    const node = base.dir === 'h' ? [base.line, base.start + k] : [base.start + k, base.line];
    const len = pickLen();
    const offset = Math.floor(rng() * len);
    const eq = base.dir === 'h'
      ? { dir: 'v', line: node[1], start: node[0] - offset, len }
      : { dir: 'h', line: node[0], start: node[1] - offset, len };
    if (fits(eq)) eqs.push(eq);
  }
  if (eqs.length < cfg.equations[0]) return null;
  if (eqs.filter((e) => e.len === 4).length < cfg.minLong) return null;
  return eqs;
}

/**
 * 把骨架平移到盤面中央（以節點為單位，維持數字格在偶數列、偶數行）。
 * @param {{dir: string, line: number, start: number, len: number}[]} eqs 骨架算式（會被修改）。
 * @param {number} size 盤面邊長。
 */
function centerSkeleton(eqs, size) {
  const m = (size + 1) / 2;
  let minR = m;
  let maxR = -1;
  let minC = m;
  let maxC = -1;
  for (const eq of eqs) {
    const [r0, r1] = eq.dir === 'h' ? [eq.line, eq.line] : [eq.start, eq.start + eq.len - 1];
    const [c0, c1] = eq.dir === 'h' ? [eq.start, eq.start + eq.len - 1] : [eq.line, eq.line];
    minR = Math.min(minR, r0);
    maxR = Math.max(maxR, r1);
    minC = Math.min(minC, c0);
    maxC = Math.max(maxC, c1);
  }
  const dr = Math.floor((m - (maxR - minR + 1)) / 2) - minR;
  const dc = Math.floor((m - (maxC - minC + 1)) / 2) - minC;
  for (const eq of eqs) {
    if (eq.dir === 'h') {
      eq.line += dr;
      eq.start += dc;
    } else {
      eq.line += dc;
      eq.start += dr;
    }
  }
}

/**
 * 取得算式各數字格的盤面索引。
 * @param {{dir: string, line: number, start: number, len: number}} eq 算式。
 * @param {number} size 盤面邊長。
 * @returns {number[]} 數字格索引（依閱讀順序）。
 */
function nodeCells(eq, size) {
  const out = [];
  for (let k = 0; k < eq.len; k++) {
    const r = eq.dir === 'h' ? eq.line * 2 : (eq.start + k) * 2;
    const c = eq.dir === 'h' ? (eq.start + k) * 2 : eq.line * 2;
    out.push(r * size + c);
  }
  return out;
}

/**
 * 判斷算式數值是否「不無聊」：乘除的運算元不為 1。
 * @param {number[]} nums 數字（最後一個為結果）。
 * @param {string[]} ops 運算子。
 * @returns {boolean} 可接受時為 true。
 */
function isNice(nums, ops) {
  for (let k = 0; k < ops.length; k++) {
    if (ops[k] === 'x' && (nums[k] === 1 || nums[k + 1] === 1)) return false;
    if (ops[k] === '/' && nums[k + 1] === 1) return false;
  }
  return true;
}

/** 填數值時每條算式的抽樣次數上限。 */
const FILL_SAMPLES = 400;

/**
 * 為一條算式隨機找出一組合法填法：未定格中隨機留一格，其餘隨機抽樣，再掃描留下那格的所有可能值。
 * @param {number[]} known 已知數值（0 為未定）。
 * @param {string[]} ops 運算子。
 * @param {number} max 數值上限。
 * @param {() => number} rng 亂數函式。
 * @returns {number[] | null} 完整數值，找不到時為 null。
 */
function solveEquation(known, ops, max, rng) {
  const free = [];
  known.forEach((v, k) => {
    if (v === 0) free.push(k);
  });
  const nums = known.slice();
  const last = nums.length - 1;
  /**
   * 檢查目前 nums 是否成立且不無聊。
   * @returns {boolean} 成立時為 true。
   */
  const holds = () => evaluate(nums, ops) === nums[last] && isNice(nums, ops);
  if (free.length === 0) return holds() ? nums : null;
  const samples = free.length === 1 ? 1 : FILL_SAMPLES;
  const results = [];
  for (let sample = 0; sample < samples; sample++) {
    const scan = free[Math.floor(rng() * free.length)];
    for (const k of free) if (k !== scan) nums[k] = randInt(1, max, rng);
    results.length = 0;
    for (let v = 1; v <= max; v++) {
      nums[scan] = v;
      if (holds()) results.push(v);
    }
    if (results.length) {
      nums[scan] = results[Math.floor(rng() * results.length)];
      return nums;
    }
  }
  return null;
}

/**
 * 依骨架填入所有數值：依建立順序逐條算式選擇運算子與數值。
 * @param {object[]} eqs 骨架算式。
 * @param {object} cfg 難度設定。
 * @param {() => number} rng 亂數函式。
 * @returns {{values: number[], ops: string[][]} | null} 盤面數值與每條算式的運算子，失敗時為 null。
 */
function fillValues(eqs, cfg, rng) {
  const size = cfg.size;
  const values = new Array(size * size).fill(0);
  const allOps = [];
  for (const eq of eqs) {
    const cells = nodeCells(eq, size);
    let done = false;
    for (let attempt = 0; attempt < 12 && !done; attempt++) {
      const ops = [];
      for (let k = 0; k < eq.len - 2; k++) ops.push(cfg.ops[Math.floor(rng() * cfg.ops.length)]);
      const nums = solveEquation(cells.map((c) => values[c]), ops, cfg.max, rng);
      if (!nums) continue;
      cells.forEach((c, k) => {
        values[c] = nums[k];
      });
      allOps.push(ops);
      done = true;
    }
    if (!done) return null;
  }
  return { values, ops: allOps };
}

/**
 * 組成盤面骨架字串。
 * @param {object[]} eqs 骨架算式。
 * @param {string[][]} ops 每條算式的運算子。
 * @param {number} size 盤面邊長。
 * @returns {string} 骨架字串。
 */
function buildLayout(eqs, ops, size) {
  const chars = new Array(size * size).fill('.');
  eqs.forEach((eq, e) => {
    const cells = nodeCells(eq, size);
    const step = eq.dir === 'h' ? 1 : size;
    cells.forEach((c, k) => {
      chars[c] = '#';
      if (k < cells.length - 1) chars[c + step] = k === cells.length - 2 ? '=' : ops[e][k];
    });
  });
  return chars.join('');
}

/**
 * 挖空：依隨機順序逐一挖空數字格，維持以目標等級以下技巧可解，達到目標空格數即停止。
 * @param {object} ctx 骨架解析結果。
 * @param {number[]} solution 完整解答。
 * @param {object} cfg 難度設定。
 * @param {() => number} rng 亂數函式。
 * @returns {number[] | null} 題目數值，失敗時為 null。
 */
function dig(ctx, solution, cfg, rng) {
  const cells = ctx.numberCells;
  const n = cells.length;
  const minBlanks = Math.ceil(cfg.blanks[0] * n);
  const maxBlanks = Math.floor(cfg.blanks[1] * n);
  if (maxBlanks < minBlanks) return null;
  const target = randInt(minBlanks, maxBlanks, rng);
  const givens = solution.slice();
  let blanks = 0;
  for (const c of shuffle(cells.slice(), rng)) {
    if (blanks >= target) break;
    givens[c] = 0;
    const p = { layout: ctx.layout, givens, solution };
    const ok = gradePuzzle(ctx, givens, bankCounts(p), cfg.level).solved;
    if (ok) blanks++;
    else givens[c] = solution[c];
  }
  if (blanks < minBlanks) return null;
  const finalBank = bankCounts({ layout: ctx.layout, givens, solution });
  if (gradePuzzle(ctx, givens, finalBank, cfg.level).level !== cfg.level) return null;
  if (countSolutions(ctx, givens, finalBank, 2) !== 1) return null;
  return givens;
}

/**
 * 產生指定難度的題目與解答。
 * @param {string} difficulty 難度代碼（easy／medium／hard／expert）。
 * @param {object} [options] 選項。
 * @param {() => number} [options.rng=Math.random] 亂數函式。
 * @param {Iterable<string>} [options.exclude=[]] 不可重複的題目雜湊。
 * @param {number} [options.maxAttempts=Infinity] 最多嘗試次數。
 * @returns {{difficulty: string, size: number, layout: string, givens: number[], solution: number[], hash: string, attempts: number}} 題目資料。
 * @throws {Error} 難度不存在或超過嘗試次數時。
 */
export function generatePuzzle(difficulty, { rng = Math.random, exclude = [], maxAttempts = Infinity } = {}) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`未知的難度：${difficulty}`);
  const excluded = new Set(exclude);
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const eqs = generateSkeleton(cfg, rng);
    if (!eqs) continue;
    centerSkeleton(eqs, cfg.size);
    const filled = fillValues(eqs, cfg, rng);
    if (!filled) continue;
    const layout = buildLayout(eqs, filled.ops, cfg.size);
    const ctx = parseLayout(cfg.size, layout);
    if (!ctx) continue;
    // 同一組數值嘗試數種挖空順序，提高達到目標難度的機會。
    for (let d = 0; d < 8; d++) {
      const givens = dig(ctx, filled.values, cfg, rng);
      if (!givens) continue;
      const puzzle = { size: cfg.size, layout, givens, solution: filled.values };
      const hash = hashPuzzle(puzzle);
      if (excluded.has(hash)) continue;
      return { difficulty, ...puzzle, hash, attempts };
    }
  }
  throw new Error('超過出題嘗試次數');
}
