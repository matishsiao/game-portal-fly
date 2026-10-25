// 數獨共用常數與工具：格子索引、單位（列／行／宮）、同儕格與候選數字位元遮罩。

/** 全部候選數字 1～9 的位元遮罩。 */
export const ALL = 0x1ff;

/** 每格所屬的列。 */
export const ROW_OF = new Uint8Array(81);
/** 每格所屬的行。 */
export const COL_OF = new Uint8Array(81);
/** 每格所屬的宮。 */
export const BOX_OF = new Uint8Array(81);

for (let i = 0; i < 81; i++) {
  ROW_OF[i] = Math.floor(i / 9);
  COL_OF[i] = i % 9;
  BOX_OF[i] = Math.floor(ROW_OF[i] / 3) * 3 + Math.floor(COL_OF[i] / 3);
}

/** 27 個單位：索引 0～8 為列、9～17 為行、18～26 為宮。 */
export const UNITS = [];
for (let u = 0; u < 27; u++) UNITS.push([]);
for (let i = 0; i < 81; i++) {
  UNITS[ROW_OF[i]].push(i);
  UNITS[9 + COL_OF[i]].push(i);
  UNITS[18 + BOX_OF[i]].push(i);
}

/** 每格的 20 個同儕格（同列、同行或同宮的其他格）。 */
export const PEERS = [];
/** SEES[a * 81 + b] 為 1 表示 a 與 b 互為同儕。 */
export const SEES = new Uint8Array(81 * 81);
for (let i = 0; i < 81; i++) {
  const peers = [];
  for (let j = 0; j < 81; j++) {
    if (i !== j && (ROW_OF[i] === ROW_OF[j] || COL_OF[i] === COL_OF[j] || BOX_OF[i] === BOX_OF[j])) {
      peers.push(j);
      SEES[i * 81 + j] = 1;
    }
  }
  PEERS.push(peers);
}

/** 每個 0～511 遮罩的位元數。 */
export const POPCOUNT = new Uint8Array(512);
/** 每個 0～511 遮罩包含的數字清單。 */
export const DIGITS = [];
for (let m = 0; m < 512; m++) {
  const list = [];
  for (let d = 1; d <= 9; d++) if (m & (1 << (d - 1))) list.push(d);
  POPCOUNT[m] = list.length;
  DIGITS.push(list);
}

/**
 * 取得數字對應的位元。
 * @param {number} d 數字 1～9。
 * @returns {number} 位元遮罩。
 */
export function bit(d) {
  return 1 << (d - 1);
}

/**
 * 判斷兩格是否互為同儕。
 * @param {number} a 格子索引。
 * @param {number} b 格子索引。
 * @returns {boolean} 同列、同行或同宮且不是同一格時為 true。
 */
export function sees(a, b) {
  return SEES[a * 81 + b] === 1;
}

/**
 * 將 81 字元字串（0 代表空格）轉為數字陣列。
 * @param {string} text 題目或解答字串。
 * @returns {number[]} 長度 81 的數字陣列。
 */
export function parseGrid(text) {
  return Array.from(text, (ch) => (ch >= '1' && ch <= '9' ? ch.charCodeAt(0) - 48 : 0));
}

/**
 * 將數字陣列轉為 81 字元字串。
 * @param {ArrayLike<number>} grid 長度 81 的數字陣列。
 * @returns {string} 以 0 代表空格的字串。
 */
export function gridToString(grid) {
  return Array.from(grid, (d) => String(d || 0)).join('');
}

/**
 * 以 FNV-1a 計算題目字串的雜湊，用於避免重複題目。
 * @param {string} text 題目字串。
 * @returns {string} 8 位十六進位雜湊。
 */
export function hashPuzzle(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * 原地打亂陣列（Fisher–Yates）。
 * @template T
 * @param {T[]} arr 要打亂的陣列。
 * @param {() => number} rng 回傳 [0, 1) 的亂數函式。
 * @returns {T[]} 同一個陣列。
 */
export function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 建立可重現的亂數產生器（mulberry32），供測試使用。
 * @param {number} seed 種子。
 * @returns {() => number} 回傳 [0, 1) 的亂數函式。
 */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
