// 核心規則：難度設定、回饋計算（● 命中、○ 接近）、密碼列舉、候選篩選與出題。
//
// 密碼與猜測都以顏色編號陣列表示（0 ～ K − 1，畫面上顯示為 1 ～ K）。
// 回饋 {black, white}：black 為顏色與位置都正確的個數；white 為顏色正確但位置不對的個數。

/** 難度設定：label 名稱、pegs 位數、colors 顏色數、repeat 是否允許同色重複、maxGuesses 次數上限、hints 每局提示額度。 */
export const DIFFICULTIES = {
  easy: { label: '簡單', pegs: 4, colors: 6, repeat: false, maxGuesses: 10, hints: 3 },
  medium: { label: '中等', pegs: 4, colors: 6, repeat: true, maxGuesses: 10, hints: 3 },
  hard: { label: '困難', pegs: 5, colors: 8, repeat: true, maxGuesses: 12, hints: 2 },
  expert: { label: '專家', pegs: 6, colors: 9, repeat: true, maxGuesses: 12, hints: 2 },
};

/** 難度代碼依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/** 顏色總數上限。 */
export const MAX_COLORS = 9;

/**
 * 計算回饋。同色重複時，每種顏色取「猜測中的個數」與「密碼中的個數」較小者加總，再減去命中數即為接近數。
 * @param {ArrayLike<number>} secret 密碼。
 * @param {ArrayLike<number>} guess 猜測（長度與密碼相同）。
 * @returns {{black: number, white: number}} 回饋。
 */
export function feedback(secret, guess) {
  let black = 0;
  const cs = new Uint8Array(MAX_COLORS);
  const cg = new Uint8Array(MAX_COLORS);
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) black++;
    else {
      cs[secret[i]]++;
      cg[guess[i]]++;
    }
  }
  let white = 0;
  for (let c = 0; c < MAX_COLORS; c++) white += cs[c] < cg[c] ? cs[c] : cg[c];
  return { black, white };
}

/** 快速回饋計算的暫存陣列（重複使用，避免大量配置記憶體）。 */
const bufS = new Uint8Array(MAX_COLORS);
const bufG = new Uint8Array(MAX_COLORS);

/**
 * 快速計算回饋代碼（black × 10 + white）：密碼取自列舉陣列中的一段，供大量篩選使用。
 * @param {Uint8Array} digits 所有可能密碼的位元組陣列。
 * @param {number} offset 密碼在陣列中的起點。
 * @param {ArrayLike<number>} guess 猜測。
 * @param {number} pegs 位數。
 * @returns {number} 回饋代碼。
 */
export function feedbackAt(digits, offset, guess, pegs) {
  bufS.fill(0);
  bufG.fill(0);
  let black = 0;
  for (let i = 0; i < pegs; i++) {
    const s = digits[offset + i];
    const g = guess[i];
    if (s === g) black++;
    else {
      bufS[s]++;
      bufG[g]++;
    }
  }
  let white = 0;
  for (let c = 0; c < MAX_COLORS; c++) white += bufS[c] < bufG[c] ? bufS[c] : bufG[c];
  return black * 10 + white;
}

/**
 * 把回饋編成一個整數（black × 10 + white），方便比較與分組。
 * @param {ArrayLike<number>} secret 密碼。
 * @param {ArrayLike<number>} guess 猜測。
 * @returns {number} 回饋代碼。
 */
export function feedbackCode(secret, guess) {
  const { black, white } = feedback(secret, guess);
  return black * 10 + white;
}

/**
 * 判斷某組密碼是否與所有已知回饋相符。
 * @param {ArrayLike<number>} code 假設的密碼。
 * @param {{code: number[], black: number, white: number}[]} history 已送出的猜測與回饋。
 * @returns {number} 相符時為 -1，否則為第一個矛盾的猜測索引。
 */
export function firstConflict(code, history) {
  for (let k = 0; k < history.length; k++) {
    const h = history[k];
    const f = feedback(code, h.code);
    if (f.black !== h.black || f.white !== h.white) return k;
  }
  return -1;
}

/**
 * 判斷一組顏色是否符合難度（長度、顏色範圍、是否有不允許的重複）。
 * @param {any} code 顏色陣列。
 * @param {object} cfg 難度設定。
 * @returns {boolean} 合法時為 true。
 */
export function isValidCode(code, cfg) {
  if (!Array.isArray(code) || code.length !== cfg.pegs) return false;
  if (!code.every((c) => Number.isInteger(c) && c >= 0 && c < cfg.colors)) return false;
  return cfg.repeat || new Set(code).size === code.length;
}

/**
 * 列舉難度的所有可能密碼，存成連續的位元組陣列（第 i 組位於 [i × pegs, (i + 1) × pegs)）。
 * @param {object} cfg 難度設定。
 * @returns {{pegs: number, count: number, digits: Uint8Array}} 所有可能的密碼。
 */
export function enumerateCodes(cfg) {
  const { pegs, colors, repeat } = cfg;
  const out = [];
  const cur = new Array(pegs).fill(0);
  /**
   * 遞迴填入第 p 位。
   * @param {number} p 位置。
   */
  const walk = (p) => {
    if (p === pegs) {
      out.push(...cur);
      return;
    }
    for (let c = 0; c < colors; c++) {
      if (!repeat && cur.slice(0, p).includes(c)) continue;
      cur[p] = c;
      walk(p + 1);
    }
  };
  if (repeat) {
    // 可重複時直接以 K 進位展開，避免遞迴的陣列展開過慢。
    const count = colors ** pegs;
    const digits = new Uint8Array(count * pegs);
    for (let i = 0; i < count; i++) {
      let x = i;
      for (let p = pegs - 1; p >= 0; p--) {
        digits[i * pegs + p] = x % colors;
        x = Math.floor(x / colors);
      }
    }
    return { pegs, count, digits };
  }
  walk(0);
  return { pegs, count: out.length / pegs, digits: Uint8Array.from(out) };
}

/**
 * 計算每次猜測後還剩幾種可能的密碼（推理回顧）。
 * @param {object} cfg 難度設定。
 * @param {{code: number[], black: number, white: number}[]} history 已送出的猜測與回饋。
 * @param {{pegs: number, count: number, digits: Uint8Array}} [all] 所有可能的密碼（未提供時自行列舉）。
 * @returns {number[]} 第 k 個數字為前 k + 1 次猜測後的剩餘數。
 */
export function remainingAfterEach(cfg, history, all = enumerateCodes(cfg)) {
  const { pegs, count, digits } = all;
  let alive = new Int32Array(count);
  for (let i = 0; i < count; i++) alive[i] = i;
  let size = count;
  const out = [];
  for (const h of history) {
    const next = new Int32Array(size);
    let n = 0;
    const want = h.black * 10 + h.white;
    for (let k = 0; k < size; k++) {
      const idx = alive[k];
      if (feedbackAt(digits, idx * pegs, h.code, pegs) === want) next[n++] = idx;
    }
    alive = next;
    size = n;
    out.push(n);
  }
  return out;
}

/**
 * 以密碼內容產生比較用的字串（例如 "0-3-3-5"）。
 * @param {number[]} code 密碼。
 * @returns {string} 字串。
 */
export function codeKey(code) {
  return code.join('-');
}

/**
 * 均勻隨機抽出一組密碼；與 exclude 中的密碼相同時重抽。
 * @param {object} cfg 難度設定。
 * @param {() => number} [rng=Math.random] 亂數函式。
 * @param {Iterable<string>} [exclude=[]] 不可重複的密碼（codeKey）。
 * @returns {number[]} 密碼。
 */
export function randomSecret(cfg, rng = Math.random, exclude = []) {
  const excluded = new Set(exclude);
  for (let attempt = 0; ; attempt++) {
    const pool = Array.from({ length: cfg.colors }, (_, c) => c);
    const code = [];
    for (let p = 0; p < cfg.pegs; p++) {
      if (cfg.repeat) code.push(Math.floor(rng() * cfg.colors));
      else code.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    // 可能的密碼數遠多於 50，正常情況很快就會抽到不重複的；保險起見最多重抽 1,000 次。
    if (!excluded.has(codeKey(code)) || attempt > 1000) return code;
  }
}

/**
 * 建立可重現的亂數產生器（mulberry32），供測試與驗收腳本使用。
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
