// 題庫規則（測試、題庫檢查與草稿驗證共用）：題目與知識卡的格式、中立用語、提示不洩題、正解長度、排序年份與數量統計。

import { SUBJECTS, TOPICS, TOPIC_INFO, GRADE_RANGE } from '../src/js/social/bank.js';

/** 已定義的難度代碼。 */
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];
/** 已定義的題型代碼。 */
export const TYPES = ['choice', 'order', 'sort'];
/** 知識卡重點說明的字數上限。 */
export const CARD_BODY_MAX = 100;
/** 資料判讀短文的字數上限。 */
export const MATERIAL_TEXT_MAX = 150;
/** 表格每格的字數上限。 */
export const TABLE_CELL_MAX = 12;

/**
 * 不使用的用語（與 data/terms.md 一致）。只列不會誤傷正常詞彙的寫法。
 * 例如「大陸」用於「歐亞大陸」「大陸型氣候」是正常地理名詞，所以只禁用「大陸地區」。
 */
export const BANNED = ['台灣', '台北', '台中', '台南', '台東', '大陸地區', '內地', '祖國', '荷蘭政府', '滿清', '日據', '播遷', '山胞', '蕃人', '生番', '熟番', '外籍新娘', '殘障', '最早開發', '鼓勵改日本姓名', '鼓勵改用日本姓名'];

/** 會過期的說法（題目不得使用；需要時改寫為有年份的說法並標 asOf）。 */
export const VOLATILE = ['目前', '最新', '現任', '現在的總統', '今年'];

/**
 * 判斷是否為非空字串。
 * @param {any} s 值。
 * @returns {boolean} 是非空字串時為 true。
 */
const text = (s) => typeof s === 'string' && s.trim().length > 0;

/**
 * 一題所有會顯示給玩家的文字（用來檢查用語）。
 * @param {object} q 題目。
 * @returns {string[]} 文字。
 */
function allText(q) {
  const out = [q.question, q.explain, ...(q.keys || [])];
  if (q.options) for (const o of q.options) out.push(o.text, o.hint || '');
  if (q.items) out.push(...q.items);
  if (q.bins) out.push(...q.bins);
  if (q.cards) for (const c of q.cards) out.push(c.text, c.hint || '');
  if (q.material) out.push(q.material.body || '', q.material.note || '', ...(q.material.head || []), ...(q.material.rows || []).flat());
  return out.filter((s) => typeof s === 'string');
}

/**
 * 檢查一段文字有沒有不使用的用語，回傳找到的用語。
 * @param {string} s 文字。
 * @returns {string[]} 找到的用語。
 */
export function bannedIn(s) {
  return BANNED.filter((w) => s.includes(w));
}

/**
 * 檢查一題，回傳錯誤訊息（沒有錯誤時為空陣列）。
 * @param {object} q 題目。
 * @param {Set<string>} cardIds 所有知識卡的 id。
 * @returns {string[]} 錯誤訊息。
 */
export function questionErrors(q, cardIds) {
  const e = [];
  const where = q && q.id;
  /**
   * 條件不成立時記一個錯誤。
   * @param {boolean} ok 條件。
   * @param {string} msg 說明。
   */
  const need = (ok, msg) => {
    if (!ok) e.push(`${where}：${msg}`);
  };
  if (!q || typeof q !== 'object') return ['題目不是物件'];
  need(DIFFICULTIES.includes(q.difficulty), '難度代碼不合法');
  need(new RegExp(`^${q.difficulty}-\\d{3}$`).test(String(q.id)), 'id 格式須為 <難度>-<三位數>');
  need(SUBJECTS.includes(q.subject), '科目代碼不合法');
  need(TOPICS.includes(q.topic), `主題代碼 ${q.topic} 不合法`);
  need(!TOPIC_INFO[q.topic] || TOPIC_INFO[q.topic].subject === q.subject, `主題 ${q.topic} 不屬於科目 ${q.subject}`);
  const range = GRADE_RANGE[q.difficulty];
  need(range && Number.isInteger(q.grade) && q.grade >= range[0] && q.grade <= range[1], `grade 須在 ${range ? range.join('～') : '?'} 之間`);
  need(TYPES.includes(q.type), '題型代碼不合法');
  need(text(q.question) && text(q.explain), '題目或詳解為空');
  need(Array.isArray(q.keys) && q.keys.length === 2 && q.keys.every(text), '解題重點須恰好 2 段');
  need(cardIds.has(q.card), `知識卡 ${q.card} 不存在`);
  if (q.asOf !== undefined) need(Number.isInteger(q.asOf) && q.asOf >= 1900 && q.asOf <= 2100, 'asOf 須為西元年');
  for (const s of allText(q)) {
    for (const w of bannedIn(s)) e.push(`${where}：使用了不使用的用語「${w}」（見 data/terms.md）`);
    for (const w of VOLATILE) if (s.includes(w)) e.push(`${where}：使用了會過期的說法「${w}」`);
  }
  const hints = [...(q.keys || [])];
  if (q.type === 'choice') {
    need(Array.isArray(q.options) && q.options.length === 4, '選項須 4 個');
    if (!Array.isArray(q.options) || q.options.length !== 4) return e;
    need(new Set(q.options.map((o) => o.text)).size === 4, '選項重複');
    need(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, 'answer 須為 0～3');
    const right = q.options[q.answer] ? q.options[q.answer].text : '';
    q.options.forEach((o, i) => {
      need(text(o.text), '選項為空');
      if (i === q.answer) need(!o.hint, '正確選項不應有 hint');
      else {
        need(text(o.hint), `錯誤選項「${o.text}」缺少 hint`);
        if (text(o.hint)) hints.push(o.hint);
      }
    });
    for (const h of hints) need(!right || !h.includes(right), `提示含正確答案：${h}`);
    const others = q.options.filter((_, i) => i !== q.answer).map((o) => String(o.text).length);
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    need(!(right.length > avg * 1.5 && right.length - avg >= 4), `正確選項明顯較長（${right.length} 字，其他平均 ${avg.toFixed(1)} 字）`);
    if (q.material !== undefined) {
      const m = q.material;
      need(m && (m.kind === 'table' || m.kind === 'text'), 'material.kind 須為 table 或 text');
      if (m && m.kind === 'text') need(text(m.body) && m.body.length <= MATERIAL_TEXT_MAX, `短文須 1～${MATERIAL_TEXT_MAX} 字`);
      if (m && m.kind === 'table') {
        const okHead = Array.isArray(m.head) && m.head.length >= 2 && m.head.every(text);
        need(okHead, '表格表頭須至少 2 欄');
        need(Array.isArray(m.rows) && m.rows.length >= 2 && m.rows.length <= 6, '表格須 2～6 列');
        if (okHead && Array.isArray(m.rows)) {
          for (const r of m.rows) need(Array.isArray(r) && r.length === m.head.length && r.every((c) => typeof c === 'string' && c.length <= TABLE_CELL_MAX), `表格每列須 ${m.head.length} 格、每格不超過 ${TABLE_CELL_MAX} 字`);
        }
      }
      need(m && text(m.note), 'material.note 須標示「改寫」「虛構資料」或資料年份');
    }
  } else if (q.type === 'order') {
    need(Array.isArray(q.items) && q.items.length >= 3 && q.items.length <= 5 && q.items.every(text), '排序項目須 3～5 個');
    if (!Array.isArray(q.items)) return e;
    need(new Set(q.items).size === q.items.length, '排序項目重複');
    const strip = (s) => s.replace(/[\s→、，。]/g, '');
    for (const h of hints) need(!strip(h).includes(strip(q.items.join(''))), `提示寫出完整順序：${h}`);
    if (q.years !== undefined) {
      need(Array.isArray(q.years) && q.years.length === q.items.length && q.years.every(Number.isFinite), 'years 須與 items 一樣長且都是數字（西元年，西元前用負數）');
      if (Array.isArray(q.years)) need(q.years.every((y, i) => i === 0 || y > q.years[i - 1]), `years 須嚴格遞增（排序答案與年份不符）：${q.years.join('、')}`);
    }
    for (const it of q.items) need(!/\d{3,4}\s*年/.test(it) || q.question.includes('年份'), `排序項目不得含年份：${it}`);
  } else if (q.type === 'sort') {
    need(Array.isArray(q.bins) && q.bins.length >= 2 && q.bins.length <= 3 && q.bins.every(text), '類別須 2～3 個');
    need(Array.isArray(q.cards) && q.cards.length >= 4 && q.cards.length <= 8, '卡片須 4～8 張');
    if (!Array.isArray(q.cards) || !Array.isArray(q.bins)) return e;
    need(new Set(q.cards.map((c) => c.text)).size === q.cards.length, '卡片重複');
    for (const c of q.cards) {
      need(text(c.text) && text(c.hint), `卡片「${c.text}」缺少文字或 hint`);
      need(Number.isInteger(c.bin) && c.bin >= 0 && c.bin < q.bins.length, `卡片「${c.text}」類別不合法`);
      if (text(c.hint) && q.bins[c.bin]) need(!c.hint.includes(q.bins[c.bin]), `卡片「${c.text}」的 hint 寫出了類別名稱`);
    }
    q.bins.forEach((b, i) => need(q.cards.some((c) => c.bin === i), `類別「${b}」沒有卡片`));
  }
  return e;
}

/**
 * 檢查一張知識卡，回傳錯誤訊息。
 * @param {object} c 知識卡。
 * @returns {string[]} 錯誤訊息。
 */
export function cardErrors(c) {
  const e = [];
  const where = `知識卡 ${c && c.id}`;
  /**
   * 條件不成立時記一個錯誤。
   * @param {boolean} ok 條件。
   * @param {string} msg 說明。
   */
  const need = (ok, msg) => {
    if (!ok) e.push(`${where}：${msg}`);
  };
  need(/^[a-z0-9-]+$/.test(String(c && c.id)), 'id 只能有小寫英文、數字與連字號');
  need(SUBJECTS.includes(c.subject), '科目代碼不合法');
  need(text(c.title) && text(c.icon) && text(c.body) && text(c.life), '欄位不完整（title、icon、body、life）');
  need(!text(c.body) || c.body.length <= CARD_BODY_MAX, `重點說明超過 ${CARD_BODY_MAX} 字`);
  if (c.mnemonic !== undefined) need(text(c.mnemonic), 'mnemonic 為空');
  for (const s of [c.title, c.body, c.life, c.mnemonic].filter((x) => typeof x === 'string')) {
    for (const w of bannedIn(s)) e.push(`${where}：使用了不使用的用語「${w}」`);
    for (const w of VOLATILE) if (s.includes(w)) e.push(`${where}：使用了會過期的說法「${w}」`);
  }
  return e;
}

/**
 * 檢查整個題庫（題目與知識卡），回傳錯誤訊息。
 * @param {object[]} questions 題目。
 * @param {object[]} cards 知識卡。
 * @param {{requireLinked?: boolean, knownCards?: string[]}} [opt] requireLinked：每張知識卡都必須被題目連到；knownCards：其他檔案已有的知識卡 id（題目可以連到，但不可重複定義）。
 * @returns {string[]} 錯誤訊息。
 */
export function bankErrors(questions, cards, opt = {}) {
  const e = [];
  const known = new Set(opt.knownCards || []);
  for (const c of cards) if (known.has(c.id)) e.push(`知識卡 id 與其他檔案重複：${c.id}`);
  const cardIds = new Set([...cards.map((c) => c.id), ...known]);
  const ids = questions.map((q) => q && q.id);
  for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) e.push(`題目 id 重複：${id}`);
  const cids = cards.map((c) => c && c.id);
  for (const id of new Set(cids.filter((id, i) => cids.indexOf(id) !== i))) e.push(`知識卡 id 重複：${id}`);
  for (const q of questions) e.push(...questionErrors(q, cardIds));
  const used = new Set(questions.map((q) => q.card));
  for (const c of cards) {
    e.push(...cardErrors(c));
    if (opt.requireLinked && !used.has(c.id)) e.push(`知識卡 ${c.id} 沒有任何題目連到`);
  }
  return e;
}

/**
 * 依難度統計題數、科目、主題、題型與資料判讀題（題庫檢查與上架門檻用）。
 * @param {object[]} questions 題目。
 * @returns {Record<string, {total: number, subjects: Record<string, number>, topics: Record<string, number>, types: Record<string, number>, material: number}>} 統計。
 */
export function countBank(questions) {
  const out = {};
  for (const d of DIFFICULTIES) {
    const qs = questions.filter((q) => q.difficulty === d);
    out[d] = {
      total: qs.length,
      subjects: Object.fromEntries(SUBJECTS.map((s) => [s, qs.filter((q) => q.subject === s).length])),
      topics: Object.fromEntries(TOPICS.map((t) => [t, qs.filter((q) => q.topic === t).length]).filter(([, n]) => n > 0)),
      types: Object.fromEntries(TYPES.map((t) => [t, qs.filter((q) => q.type === t).length])),
      material: qs.filter((q) => q.material).length,
    };
  }
  return out;
}
