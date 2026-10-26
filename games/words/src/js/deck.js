// 出題器（純邏輯）：依分類與難度選字並組成一局的每一盤，同一盤避開同義字與相同中文。

/** 難度設定。 */
export const DIFFICULTIES = {
  easy: { label: '簡單', pairs: 4, boards: 5, levels: [1], hints: 5, reverse: false, samePos: false, similarSpelling: false },
  medium: { label: '中等', pairs: 5, boards: 5, levels: [1, 2], hints: 4, reverse: false, samePos: false, similarSpelling: false },
  hard: { label: '困難', pairs: 6, boards: 5, levels: [2, 3], hints: 3, reverse: false, samePos: true, similarSpelling: false },
  expert: { label: '專家', pairs: 6, boards: 5, levels: [2, 3], hints: 2, reverse: true, samePos: true, similarSpelling: true },
};

/** 難度代碼依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);

/** 特殊出題來源：綜合（全部分類）與待複習。 */
export const MIX = 'mix';
export const REVIEW = 'review';

/**
 * 原地打亂陣列（Fisher–Yates）。
 * @template T
 * @param {T[]} arr 陣列。
 * @param {() => number} rng 亂數函式。
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
 * 建立可重現的亂數（mulberry32），供測試使用。
 * @param {number} seed 種子。
 * @returns {() => number} 亂數函式。
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

/**
 * 取得單字的同義群組清單；建置後的詞庫是陣列（每個分類各自的群組），測試資料可用字串。
 * @param {object} w 單字。
 * @returns {string[]} 同義群組 id。
 */
function synGroups(w) {
  if (Array.isArray(w.syn)) return w.syn;
  return w.syn ? [w.syn] : [];
}

/**
 * 判斷兩個單字能否出現在同一盤：不同義、中文不同、不是同一個英文字的不同詞性。
 * @param {object} a 單字。
 * @param {object} b 單字。
 * @returns {boolean} 可以同盤時為 true。
 */
export function compatible(a, b) {
  if (a.id === b.id) return false;
  const groups = synGroups(b);
  if (synGroups(a).some((g) => groups.includes(g))) return false;
  if (a.zh === b.zh) return false;
  if (a.en.toLowerCase() === b.en.toLowerCase()) return false;
  return true;
}

/**
 * 取得出題候選單字；指定難度的常見度不足一局所需時，自動加入相鄰常見度。
 * @param {object[]} words 全部單字。
 * @param {string} source 分類 id、MIX 或 REVIEW。
 * @param {string} difficulty 難度代碼。
 * @param {Record<string, object>} book 單字本。
 * @returns {{pool: object[], widened: boolean}} 候選單字與是否放寬常見度。
 */
export function candidatePool(words, source, difficulty, book = {}) {
  const cfg = DIFFICULTIES[difficulty];
  const need = cfg.pairs * cfg.boards;
  let base = words;
  if (source === REVIEW) base = words.filter((w) => book[w.id] && book[w.id].review);
  else if (source !== MIX) base = words.filter((w) => w.categories.includes(source));
  let pool = base.filter((w) => cfg.levels.includes(w.level));
  let widened = false;
  if (pool.length < need) {
    const extra = [...new Set([...cfg.levels, cfg.levels[0] - 1, cfg.levels[cfg.levels.length - 1] + 1])].filter((l) => l >= 1 && l <= 3);
    pool = base.filter((w) => extra.includes(w.level));
    widened = true;
  }
  if (source === REVIEW && pool.length < need) {
    // 待複習不足時，以同常見度的其他單字補足。
    const ids = new Set(pool.map((w) => w.id));
    pool = pool.concat(words.filter((w) => !ids.has(w.id) && cfg.levels.includes(w.level)));
    widened = true;
  }
  return { pool, widened };
}

/**
 * 計算單字的出題優先順序：尚未學過最優先，其次待複習，再來是越久沒出現越優先。
 * @param {object} w 單字。
 * @param {Record<string, object>} book 單字本。
 * @param {Set<string>} recent 最近出現過的單字。
 * @param {() => number} rng 亂數函式（同一層級內隨機）。
 * @returns {number} 分數，越小越優先。
 */
function priority(w, book, recent, rng) {
  const b = book[w.id];
  let tier = 3;
  if (!b || !b.seen) tier = 0;
  else if (b.review) tier = 1;
  else if (!b.learned) tier = 2;
  const age = b && b.lastSeen ? b.lastSeen : 0;
  return tier * 1e15 + (recent.has(w.id) ? 5e14 : 0) + age + rng();
}

/**
 * 從候選單字中組出一盤：先選一個種子單字，再依難度挑相容的單字。
 * @param {object[]} ordered 依優先順序排列、尚未使用的單字。
 * @param {object} cfg 難度設定。
 * @returns {object[] | null} 一盤的單字；湊不齊時為 null。
 */
function buildBoard(ordered, cfg) {
  for (const seed of ordered) {
    const picked = [seed];
    // 困難以上優先挑同詞性；專家再優先挑開頭字母相同的單字。
    const ranked = ordered
      .filter((w) => w !== seed)
      .map((w, idx) => {
        let score = idx;
        if (cfg.samePos && w.pos !== seed.pos) score += 10000;
        if (cfg.similarSpelling && w.en[0].toLowerCase() !== seed.en[0].toLowerCase()) score += 1000;
        return { w, score };
      })
      .sort((a, b) => a.score - b.score)
      .map((x) => x.w);
    for (const w of ranked) {
      if (picked.length === cfg.pairs) break;
      if (picked.every((p) => compatible(p, w))) picked.push(w);
    }
    if (picked.length === cfg.pairs) return picked;
  }
  return null;
}

/**
 * 產生一局。
 * @param {object[]} words 全部單字。
 * @param {object} options 選項。
 * @param {string} options.source 分類 id、MIX 或 REVIEW。
 * @param {string} options.difficulty 難度代碼。
 * @param {Record<string, object>} [options.book={}] 單字本。
 * @param {string[]} [options.recent=[]] 最近出現過的單字 id。
 * @param {() => number} [options.rng=Math.random] 亂數函式。
 * @returns {{boards: {ids: string[], left: string[], right: string[]}[], widened: boolean}} 每一盤的單字與左右欄排列。
 * @throws {Error} 單字不足一局時。
 */
export function generateRound(words, { source, difficulty, book = {}, recent = [], rng = Math.random }) {
  const cfg = DIFFICULTIES[difficulty];
  if (!cfg) throw new Error(`未知的難度：${difficulty}`);
  const { pool, widened } = candidatePool(words, source, difficulty, book);
  const recentSet = new Set(recent);
  let ordered = pool
    .map((w) => ({ w, p: priority(w, book, recentSet, rng) }))
    .sort((a, b) => a.p - b.p)
    .map((x) => x.w);
  const boards = [];
  for (let k = 0; k < cfg.boards; k++) {
    const picked = buildBoard(ordered, cfg);
    if (!picked) throw new Error('這個分類的單字不足以組成一局');
    const used = new Set(picked.map((w) => w.id));
    ordered = ordered.filter((w) => !used.has(w.id));
    const ids = picked.map((w) => w.id);
    boards.push({ ids, left: shuffle(ids.slice(), rng), right: shuffle(ids.slice(), rng) });
  }
  return { boards, widened };
}
