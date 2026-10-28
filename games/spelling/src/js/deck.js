// 出題（純邏輯）：依範圍與難度選 10 個單字，為每個單字打亂字母並加入干擾字母，確保答案唯一。

/** 難度設定：推薦的 Level、單字長度（只計需要拼的字母）、干擾字母數、是否預先填好首字母、每局提示額度。 */
export const DIFFICULTIES = {
  easy: { label: '簡單', level: 1, minLen: 3, maxLen: 7, decoys: 0, firstLetter: true, hints: 6 },
  medium: { label: '中等', level: 2, minLen: 3, maxLen: 9, decoys: 0, firstLetter: false, hints: 5 },
  hard: { label: '困難', level: 3, minLen: 3, maxLen: 99, decoys: 2, firstLetter: false, hints: 4 },
  expert: { label: '專家', level: 5, minLen: 3, maxLen: 99, decoys: 3, firstLetter: false, hints: 3 },
};
/** 難度代碼，依由易到難排列。 */
export const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES);
/** Level 1～6 推薦的難度。 */
export const RECOMMENDED = { 1: 'easy', 2: 'medium', 3: 'hard', 4: 'hard', 5: 'expert', 6: 'expert' };
/** 「待複習」範圍的代碼。 */
export const REVIEW = 'review';
/** 一局的單字數。 */
export const ROUND_SIZE = 10;
/** 干擾字母的候選（不使用 q、x、z、j，避免太容易看出是干擾）。 */
const DECOY_LETTERS = 'abcdefghiklmnoprstuvwy';
/** 為一個單字產生字母方塊的最多嘗試次數。 */
const TILE_TRIES = 40;

/**
 * 取出單字中需要拼的字母（小寫英文字母），空格、連字號與撇號不用拼。
 * @param {string} en 英文。
 * @returns {string} 需要拼的字母。
 */
export function lettersOf(en) {
  return en.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * 拆出中文意思的各個項目（以「、」分隔）。
 * @param {string} zh 中文意思。
 * @returns {string[]} 意思。
 */
export function meaningsOf(zh) {
  return zh.split('、').map((s) => s.trim()).filter(Boolean);
}

/**
 * 拆出詞性的各個項目（例如「n./v.」→ ['n.', 'v.']）。
 * @param {string} pos 詞性。
 * @returns {string[]} 詞性。
 */
export function posOf(pos) {
  return pos.split('/').filter(Boolean);
}

/**
 * 兩個單字是否有相同的中文意思（任一個意思項目相同）。
 * @param {{zh: string}} a 單字。
 * @param {{zh: string}} b 單字。
 * @returns {boolean} 相同時為 true。
 */
export function sameMeaning(a, b) {
  const set = new Set(meaningsOf(a.zh));
  return meaningsOf(b.zh).some((m) => set.has(m));
}

/**
 * 兩個單字是否有相同的詞性（任一個詞性相同）。
 * @param {{pos: string}} a 單字。
 * @param {{pos: string}} b 單字。
 * @returns {boolean} 相同時為 true。
 */
export function samePos(a, b) {
  const set = new Set(posOf(a.pos));
  return posOf(b.pos).some((p) => set.has(p));
}

/**
 * 建立「中文意思 → 單字」索引，用來找同義字（可接受的其他答案）與需要避開的字。
 * @param {object[]} words 詞庫。
 * @returns {Map<string, object[]>} 索引。
 */
export function meaningIndex(words) {
  const index = new Map();
  for (const w of words) {
    for (const m of meaningsOf(w.zh)) {
      if (!index.has(m)) index.set(m, []);
      index.get(m).push(w);
    }
  }
  return index;
}

/**
 * 與單字有相同中文意思的其他單字。
 * @param {object} word 單字。
 * @param {Map<string, object[]>} index 中文意思索引。
 * @returns {object[]} 其他單字（不含自己、不重複）。
 */
export function relatedWords(word, index) {
  const out = new Map();
  for (const m of meaningsOf(word.zh)) for (const w of index.get(m) || []) if (w.id !== word.id) out.set(w.id, w);
  return [...out.values()];
}

/**
 * 判斷一組字母方塊能否拼出某個字（字母數相同且每個字母都夠用）。
 * @param {string[]} tiles 字母方塊。
 * @param {string} letters 要拼的字母。
 * @returns {boolean} 拼得出時為 true。
 */
export function canSpell(tiles, letters) {
  const count = new Map();
  for (const t of tiles) count.set(t, (count.get(t) || 0) + 1);
  for (const ch of letters) {
    const n = count.get(ch) || 0;
    if (!n) return false;
    count.set(ch, n - 1);
  }
  return true;
}

/**
 * 洗牌（Fisher–Yates）。
 * @param {any[]} arr 陣列（不修改）。
 * @param {() => number} rng 亂數。
 * @returns {any[]} 新陣列。
 */
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 字母方塊的順序是否太容易（與答案相同，或開頭一半與答案相同）。
 * @param {string[]} tiles 字母方塊。
 * @param {string} letters 答案字母。
 * @returns {boolean} 太容易時為 true。
 */
function tooEasy(tiles, letters) {
  const half = Math.max(2, Math.ceil(letters.length / 2));
  return tiles.slice(0, half).join('') === letters.slice(0, half);
}

/**
 * 為一個單字產生字母方塊：打亂答案的字母並加入干擾字母。
 * 干擾字母不與答案的字母重複，且不能讓方塊拼得出「中文意思相同但詞性不同」的字（那會被判錯，造成混淆）。
 * @param {object} word 單字。
 * @param {number} decoys 干擾字母數。
 * @param {Map<string, object[]>} index 中文意思索引。
 * @param {() => number} rng 亂數。
 * @returns {string[] | null} 字母方塊；無法產生時為 null。
 */
export function makeTiles(word, decoys, index, rng) {
  const letters = lettersOf(word.en);
  const avoid = relatedWords(word, index).filter((w) => !samePos(w, word)).map((w) => lettersOf(w.en)).filter((l) => l.length === letters.length);
  const pool = [...DECOY_LETTERS].filter((ch) => !letters.includes(ch));
  for (let t = 0; t < TILE_TRIES; t++) {
    const extra = shuffle(pool, rng).slice(0, decoys);
    if (extra.length < decoys) return null;
    const tiles = shuffle([...letters, ...extra], rng);
    if (letters.length > 1 && tooEasy(tiles, letters)) continue;
    if (avoid.some((l) => canSpell(tiles, l))) continue;
    return tiles;
  }
  return null;
}

/**
 * 單字的優先順序：未學會 → 待複習 → 學會已久；同組內隨機。數字越小越優先。
 * @param {object} word 單字。
 * @param {Record<string, {learned: boolean, review: boolean, lastSeen?: number}>} book 單字本。
 * @returns {number} 優先順序。
 */
function priority(word, book) {
  const b = book[word.id];
  if (!b || !b.learned) return b && b.review ? 1 : 0;
  return b.review ? 1 : 2;
}

/**
 * 產生一局：依範圍與難度選 ROUND_SIZE 個單字並產生字母方塊。
 * @param {object[]} words 詞庫（已審閱的單字）。
 * @param {object} opt 選項。
 * @param {number | 'review'} opt.range Level（1～6）或「待複習」。
 * @param {string} opt.difficulty 難度代碼。
 * @param {Record<string, object>} [opt.book] 單字本。
 * @param {string[]} [opt.recent] 最近出過的單字 id。
 * @param {() => number} [opt.rng] 亂數。
 * @param {Map<string, object[]>} [opt.index] 中文意思索引（未提供時即時建立）。
 * @returns {{items: {id: string, tiles: string[]}[], widened: boolean}} 一局的單字與字母方塊；widened 表示放寬了長度或範圍。
 * @throws {Error} 範圍內的單字不足一局時。
 */
export function generateRound(words, opt) {
  const d = DIFFICULTIES[opt.difficulty];
  const rng = opt.rng || Math.random;
  const book = opt.book || {};
  const recent = new Set(opt.recent || []);
  const index = opt.index || meaningIndex(words);
  let widened = false;
  let pool;
  if (opt.range === REVIEW) {
    const review = words.filter((w) => book[w.id] && book[w.id].review);
    pool = review;
    if (review.length < ROUND_SIZE) {
      // 待複習不足：以這些單字的 Level 中尚未學會的單字補足。
      const levels = new Set(review.map((w) => w.level));
      if (!levels.size) levels.add(d.level);
      pool = review.concat(words.filter((w) => levels.has(w.level) && !(book[w.id] && book[w.id].learned) && !review.includes(w)));
      widened = true;
    }
  } else {
    pool = words.filter((w) => w.level === opt.range);
  }
  const fits = (w) => {
    const n = lettersOf(w.en).length;
    return n >= d.minLen && n <= d.maxLen;
  };
  // 依序放寬：長度與最近出過 → 只放寬最近出過 → 只放寬長度 → 全部。
  const stages = [(w) => fits(w) && !recent.has(w.id), (w) => fits(w), (w) => !recent.has(w.id), () => true];
  let candidates = [];
  for (const [i, keep] of stages.entries()) {
    candidates = pool.filter(keep);
    if (candidates.length >= ROUND_SIZE * 2 || (i === stages.length - 1 && candidates.length >= ROUND_SIZE)) {
      if (i >= 2) widened = true;
      break;
    }
  }
  const ordered = shuffle(candidates, rng).sort((a, b) => priority(a, book) - priority(b, book));
  const items = [];
  const chosen = [];
  for (const w of ordered) {
    if (items.length >= ROUND_SIZE) break;
    // 同一局不出現中文意思相同的兩個字。
    if (chosen.some((c) => sameMeaning(c, w))) continue;
    const tiles = makeTiles(w, d.decoys, index, rng);
    if (!tiles) continue;
    chosen.push(w);
    items.push({ id: w.id, tiles });
  }
  if (items.length < ROUND_SIZE) throw new Error('單字不足');
  return { items, widened };
}
