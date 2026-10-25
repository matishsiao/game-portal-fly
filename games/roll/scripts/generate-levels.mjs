// 關卡設計輔助：隨機產生候選盤面，以解題器篩選「可過關、物件不可或缺、有一定難度」的關卡，
// 依難度排序輸出供設計者挑選與調整。產生的盤面不會直接上架。
// 用法：node scripts/generate-levels.mjs <章節 1-4> [候選數量=12] [嘗試次數=4000] [種子=1] [起始難度百分位=0] [候選上限=候選數量×30]

import { initialState, applyMove, stateKey, T } from '../src/js/engine.js';
import { solve } from '../src/js/solver.js';

const chapter = Number(process.argv[2] || 1);
const want = Number(process.argv[3] || 12);
const tries = Number(process.argv[4] || 4000);
let seed = Number(process.argv[5] || 1);
const fromRank = Number(process.argv[6] || 0);
const cap = Number(process.argv[7] || want * 30);

/**
 * 可重現的亂數（mulberry32）。
 * @returns {number} [0, 1) 的亂數。
 */
function rand() {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * 取得 [a, b] 的隨機整數。
 * @param {number} a 下限。
 * @param {number} b 上限。
 * @returns {number} 整數。
 */
function ri(a, b) {
  return a + Math.floor(rand() * (b - a + 1));
}

/** 各章可使用的物件與特色。 */
const FEATURES = {
  1: { objects: ['B', 'S'], must: ['B', 'S'], water: false, crumble: false, spring: false },
  2: { objects: ['B', 'S', 'o'], must: ['B', 'o'], water: true, crumble: false, spring: false },
  3: { objects: ['B', 'S', 'I'], must: ['I', 'S'], water: false, crumble: true, spring: false },
  4: { objects: ['B', 'S', 'I', 'o'], must: ['^'], water: true, crumble: true, spring: true },
};

/**
 * 隨機產生一個候選盤面。
 * @returns {string[]} 盤面文字。
 */
function randomBoard() {
  const f = FEATURES[chapter];
  const w = ri(8, 10);
  const h = ri(7, 10);
  const g = Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? '#' : '.')));
  // 平台：每隔 2～3 列一層，含隨機缺口。
  const floors = [];
  for (let y = h - 2; y >= 2; y -= ri(2, 3)) floors.push(y);
  for (const y of floors) {
    if (y === h - 2 && rand() < 0.5) continue;
    for (let x = 1; x < w - 1; x++) if (rand() < 0.72) g[y][x] = '#';
  }
  // 底層坑洞可放水。
  if (f.water) {
    for (let x = 1; x < w - 1; x++) {
      if (g[h - 2][x] === '.' && rand() < 0.6) g[h - 2][x] = '~';
    }
    for (const y of floors) {
      for (let x = 1; x < w - 1; x++) if (g[y][x] === '.' && g[y + 1] && g[y + 1][x] === '#' && rand() < 0.15) g[y][x] = '~';
    }
  }
  // 易碎磚與彈簧。
  for (const y of floors) {
    for (let x = 1; x < w - 1; x++) {
      if (g[y][x] !== '#') continue;
      if (f.crumble && rand() < 0.12) g[y][x] = 'x';
      else if (f.spring && rand() < 0.08) g[y][x] = '^';
    }
  }
  // 梯子：從某層往上連到上一層。
  const ladders = ri(0, 2);
  for (let k = 0; k < ladders; k++) {
    const x = ri(1, w - 2);
    const y1 = ri(2, h - 3);
    for (let y = y1; y < h - 1 && g[y][x] !== '#'; y++) g[y][x] = 'H';
  }
  // 表面格：下方有支撐的空氣格。
  const surfaces = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (g[y][x] === '.' && ['#', 'x', '^', 'H'].includes(g[y + 1][x])) surfaces.push([x, y]);
    }
  }
  if (surfaces.length < 4) return null;
  surfaces.sort(() => rand() - 0.5);
  const [px, py] = surfaces.pop();
  g[py][px] = '@';
  const [gx, gy] = surfaces.pop();
  g[gy][gx] = '*';
  const n = ri(2, 4);
  for (let k = 0; k < n && surfaces.length; k++) {
    const [x, y] = surfaces.pop();
    g[y][x] = f.objects[ri(0, f.objects.length - 1)];
  }
  return g.map((r) => r.join(''));
}

/**
 * 以替換字元的方式檢查某元素是否不可或缺：替換後無解才算必要。
 * @param {string[]} rows 盤面。
 * @param {string} ch 要替換的字元。
 * @param {string} to 替換成的字元。
 * @returns {boolean} 不可或缺時為 true（盤面中沒有該字元也視為 false）。
 */
function essential(rows, ch, to) {
  if (!rows.some((r) => r.includes(ch))) return false;
  const replaced = rows.map((r) => r.split(ch).join(to));
  try {
    return !solve(initialState(replaced), { maxStates: 200000 }).solved;
  } catch {
    return false;
  }
}

/**
 * 分析最佳解用到的物理機制。
 * @param {object} s 起始狀態。
 * @param {string[]} moves 最佳解。
 * @returns {{floatRide: boolean, spring: boolean, crumble: boolean, balloonRide: boolean}} 是否用到各機制。
 */
function mechanics(s, moves) {
  const used = { floatRide: false, spring: false, crumble: false, balloonRide: false };
  let cur = s;
  const crumbles = (st) => st.terrain.filter((t) => t === T.CRUMBLE).length;
  for (const m of moves) {
    const next = applyMove(cur, m).state;
    const p = next.player;
    const below = next.objects.find((o) => o.x === p.x && o.y === p.y + 1);
    if (below && (below.type === 'B' || below.type === 'I') && next.terrain[below.y * next.w + below.x] === T.WATER) used.floatRide = true;
    if (below && below.type === 'O' && p.y < cur.player.y) used.balloonRide = true;
    if (next.hover) used.spring = true;
    if (crumbles(next) < crumbles(cur)) used.crumble = true;
    cur = next;
  }
  return used;
}

/**
 * 計算最佳解中改變物件位置的步數（推動或觸發連鎖的次數）。
 * @param {object} s 起始狀態。
 * @param {string[]} moves 最佳解。
 * @returns {number} 改變物件的步數。
 */
function objectMoves(s, moves) {
  let count = 0;
  let cur = s;
  for (const m of moves) {
    const next = applyMove(cur, m).state;
    if (stateKey(next).split('|').slice(1).join('|') !== stateKey(cur).split('|').slice(1).join('|')) count++;
    cur = next;
  }
  return count;
}

/**
 * 精簡盤面：逐一嘗試移除物件、梯子、水、易碎磚、彈簧與多餘的牆，
 * 只要仍可過關且最少步數不減少就保留移除結果，讓每個元素都有作用。
 * @param {string[]} rows 盤面。
 * @param {number} par 原本的最少步數。
 * @returns {{rows: string[], par: number, states: number}} 精簡後的盤面。
 */
function prune(rows, par) {
  let cur = rows.map((r) => r.split(''));
  let best = { rows, par, states: 0 };
  const h = cur.length;
  const w = cur[0].length;
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const ch = cur[y][x];
        const to = { B: '.', S: '.', I: '.', o: '.', H: '.', '~': '#', x: '#', '^': '#' }[ch];
        if (to === undefined) continue;
        cur[y][x] = to;
        const test = cur.map((r) => r.join(''));
        let r;
        try {
          r = solve(initialState(test), { maxStates: 300000 });
        } catch {
          r = { solved: false };
        }
        if (r.solved && r.moves.length >= best.par) best = { rows: test, par: r.moves.length, states: r.states };
        else cur[y][x] = ch;
      }
    }
  }
  return best;
}

const found = [];
const seen = new Set();
for (let t = 0; t < tries && found.length < cap; t++) {
  const rows = randomBoard();
  if (!rows) continue;
  let s;
  try {
    s = initialState(rows);
  } catch {
    continue;
  }
  if (s.won || s.dead) continue;
  const r = solve(s, { maxStates: 300000 });
  if (!r.solved || r.moves.length < 8) continue;
  // 物件必須不可或缺：移除所有可推動物件後無解。
  if (!essential(rows, 'B', '.') && !essential(rows, 'S', '.') && !essential(rows, 'I', '.') && !essential(rows, 'o', '.')) continue;
  const f = FEATURES[chapter];
  const pruned = prune(rows, r.moves.length);
  const ps = initialState(pruned.rows);
  const pr = solve(ps);
  const pushes = objectMoves(ps, pr.moves);
  if (pushes < 2) continue;
  const used = mechanics(ps, pr.moves);
  const featureOk = {
    1: true,
    2: used.floatRide || used.balloonRide,
    3: essential(pruned.rows, 'I', '.') || used.crumble,
    4: used.spring && (used.floatRide || used.balloonRide || used.crumble || essential(pruned.rows, 'I', '.') || pushes >= 3),
  }[chapter];
  if (!featureOk) continue;
  const key = stateKey(ps);
  if (seen.has(key)) continue;
  seen.add(key);
  found.push({ rows: pruned.rows, par: pr.moves.length, states: pr.states, pushes, score: pr.moves.length + pushes * 4 + Math.log2(pr.states) });
}

found.sort((a, b) => a.score - b.score);
// 依難度由易到難平均挑選，並保證包含最難的一個。
const picks = [];
const start = Math.floor(fromRank * (found.length - 1));
for (let k = 0; k < want && found.length; k++) {
  const idx = start + Math.round((k / Math.max(1, want - 1)) * (found.length - 1 - start));
  if (!picks.includes(found[idx])) picks.push(found[idx]);
}
for (const p of picks) {
  console.log(`--- par ${p.par}，推動 ${p.pushes}，狀態 ${p.states}`);
  console.log(p.rows.join('\n'));
}
console.error(`候選 ${found.length} 個，輸出 ${picks.length} 個`);
