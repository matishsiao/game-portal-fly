// 題庫檢查共用：題目與科學卡的格式、提示不洩題、正解長度與安全說明（測試與 check-bank 共用）。

import assert from 'node:assert/strict';

/** 已定義的學習階段代碼（不使用 `hard`）。 */
export const DIFFICULTIES = ['easy', 'medium', 'expert'];
/** 已定義的主題代碼。 */
export const TOPICS = ['life', 'earth', 'matter', 'force'];
/** 已定義的題型代碼。 */
export const TYPES = ['choice', 'order', 'sort'];

/**
 * 判斷是否為非空字串。
 * @param {any} s 值。
 * @returns {boolean} 是非空字串時為 true。
 */
const text = (s) => typeof s === 'string' && s.trim().length > 0;

/** 題庫不得出現的用字（左）與應改用的寫法（右）。 */
const WRONG_WORDS = [['台灣', '臺灣'], ['保特瓶', '寶特瓶']];
/** 每個學習階段「正確選項字數嚴格最長」的選擇題比例上限。 */
export const MAX_LONGEST_SHARE = 0.3;

/**
 * 檢查題目或科學卡的所有文字沒有出現應改寫的用字。
 * @param {object} obj 題目或科學卡。
 * @param {string} where 錯誤訊息的位置說明。
 */
function assertWording(obj, where) {
  const all = JSON.stringify(obj);
  for (const [bad, good] of WRONG_WORDS) assert.ok(!all.includes(bad), `${where} 出現「${bad}」，應寫「${good}」`);
}

/**
 * 檢查一題的格式與提示：欄位齊全、代碼合法、答案唯一、提示不含正確答案、正解不明顯較長；有傳入單元時也檢查單元。
 * @param {object} q 題目。
 * @param {Set<string>} cardIds 所有科學卡的 id。
 * @param {Map<string, object>} [units] 單元 id 對應單元；省略時不檢查單元。
 */
export function assertQuestion(q, cardIds, units) {
  const where = q.id;
  assert.match(String(q.id), new RegExp(`^${q.difficulty}-\\d{3}$`), `${where} id 格式`);
  assert.ok(DIFFICULTIES.includes(q.difficulty), `${where} 難度代碼`);
  assert.ok(TOPICS.includes(q.topic), `${where} 主題代碼`);
  assert.ok(TYPES.includes(q.type), `${where} 題型代碼`);
  assert.ok(text(q.question) && text(q.explain), `${where} 題目或詳解為空`);
  assert.ok(Array.isArray(q.keys) && q.keys.length === 2 && q.keys.every(text), `${where} 解題重點須恰好 2 段`);
  assert.ok(cardIds.has(q.card), `${where} 科學卡 ${q.card} 不存在`);
  assertWording(q, where);
  if (units) {
    const u = units.get(q.unit);
    assert.ok(u, `${where} 單元 ${q.unit} 不存在`);
    assert.equal(q.difficulty, u.stage, `${where} 學習階段與單元 ${u.id} 不一致`);
    if (u.topic !== 'inquiry') assert.equal(q.topic, u.topic, `${where} 主題與單元 ${u.id} 不一致`);
  }
  const hints = [...q.keys];
  if (q.type === 'choice') {
    assert.equal(q.options.length, 4, `${where} 選項數`);
    assert.equal(new Set(q.options.map((o) => o.text)).size, 4, `${where} 選項重複`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${where} answer`);
    const right = q.options[q.answer].text;
    q.options.forEach((o, i) => {
      assert.ok(text(o.text), `${where} 選項為空`);
      if (i === q.answer) assert.ok(!o.hint, `${where} 正確選項不應有 hint`);
      else {
        assert.ok(text(o.hint), `${where} 錯誤選項「${o.text}」缺少 hint`);
        hints.push(o.hint);
      }
    });
    for (const h of hints) assert.ok(!h.includes(right), `${where} 提示含正確答案：${h}`);
    const others = q.options.filter((_, i) => i !== q.answer).map((o) => o.text.length);
    const avg = others.reduce((a, b) => a + b, 0) / others.length;
    assert.ok(!(right.length > avg * 1.5 && right.length - avg >= 4), `${where} 正確選項明顯較長（${right.length} 字，其他平均 ${avg.toFixed(1)} 字）`);
    if (q.result !== undefined) assert.ok(text(q.result), `${where} result 為空`);
  } else if (q.type === 'order') {
    assert.ok(Array.isArray(q.items) && q.items.length >= 3 && q.items.length <= 5, `${where} 排序項目須 3～5 個`);
    assert.ok(q.items.every(text), `${where} 排序項目為空`);
    assert.equal(new Set(q.items).size, q.items.length, `${where} 排序項目重複`);
    const full = q.items.join('');
    for (const h of hints) assert.ok(!h.replace(/[\s→、，。]/g, '').includes(full.replace(/[\s→、，。]/g, '')), `${where} 提示寫出完整順序`);
  } else {
    assert.ok(Array.isArray(q.bins) && q.bins.length >= 2 && q.bins.length <= 3 && q.bins.every(text), `${where} 類別須 2～3 個`);
    assert.ok(Array.isArray(q.cards) && q.cards.length >= 4 && q.cards.length <= 8, `${where} 卡片須 4～8 張`);
    assert.equal(new Set(q.cards.map((c) => c.text)).size, q.cards.length, `${where} 卡片重複`);
    q.cards.forEach((c) => {
      assert.ok(text(c.text) && text(c.hint), `${where} 卡片「${c.text}」缺少文字或 hint`);
      assert.ok(Number.isInteger(c.bin) && c.bin >= 0 && c.bin < q.bins.length, `${where} 卡片「${c.text}」類別不合法`);
      assert.ok(!c.hint.includes(q.bins[c.bin]), `${where} 卡片「${c.text}」的 hint 寫出了類別名稱`);
    });
    q.bins.forEach((_, i) => assert.ok(q.cards.some((c) => c.bin === i), `${where} 類別「${q.bins[i]}」沒有卡片`));
  }
}

/**
 * 檢查一張科學卡：欄位齊全、說明不超過 80 字、小實驗必有安全說明，到戶外看太陽或天空的小實驗須提醒不要直接看太陽。
 * @param {object} c 科學卡。
 */
export function assertCard(c) {
  const where = `科學卡 ${c.id}`;
  assert.match(String(c.id), /^[a-z0-9-]+$/, `${where} id 格式`);
  assert.ok(TOPICS.includes(c.topic), `${where} 主題代碼`);
  assert.ok(text(c.title) && text(c.icon) && text(c.body) && text(c.example), `${where} 欄位不完整`);
  assert.ok(c.body.length <= 80, `${where} 說明超過 80 字（${c.body.length} 字）`);
  assertWording(c, where);
  if (c.experiment !== undefined) {
    const { steps, safety } = c.experiment;
    assert.ok(text(steps), `${where} 小實驗缺少步驟`);
    assert.ok(text(safety), `${where} 小實驗缺少安全說明`);
    if (/太陽|天空/.test(steps) && !/當太陽|晚上|夜/.test(steps)) assert.ok(safety.includes('不要直接看太陽'), `${where} 小實驗須提醒「不要直接看太陽」`);
  }
}

/**
 * 計算一組題目中，選擇題「正確選項字數嚴格最長」的比例（避免孩子靠挑最長的選項猜對）。
 * @param {object[]} questions 題目。
 * @returns {number} 比例（0～1）；沒有選擇題時為 0。
 */
export function longestShare(questions) {
  const choices = questions.filter((q) => q.type === 'choice');
  const longest = choices.filter((q) => {
    const len = q.options[q.answer].text.length;
    return q.options.every((o, i) => i === q.answer || o.text.length < len);
  });
  return choices.length ? longest.length / choices.length : 0;
}

/**
 * 列出需要人工判讀的提示問題（不視為錯誤）：錯誤選項 hint 與解題重點共用 4 字以上的片段，以及選擇題中含「還是」又和正確選項有 2 字相同的提示。
 * @param {object} q 題目。
 * @returns {string[]} 提醒訊息。
 */
export function lintHints(q) {
  const notes = [];
  const wrong = q.type === 'choice' ? q.options.filter((o) => o.hint).map((o) => o.hint) : (q.cards || []).map((c) => c.hint);
  /** 去掉標點與空白後的文字。 */
  const plain = (s) => s.replace(/[\s，。？！、：；「」（）]/g, '');
  for (const h of wrong) {
    for (const k of q.keys) {
      const a = plain(h);
      const b = plain(k);
      for (let i = 0; i + 4 <= a.length; i++) {
        if (b.includes(a.slice(i, i + 4))) {
          notes.push(`${q.id} 提示與解題重點重複「${a.slice(i, i + 4)}」`);
          break;
        }
      }
    }
  }
  if (q.type === 'choice') {
    const right = plain(q.options[q.answer].text);
    const pairs = [];
    for (let i = 0; i + 2 <= right.length; i++) pairs.push(right.slice(i, i + 2));
    for (const h of [...wrong, ...q.keys]) {
      const hit = h.includes('還是') && pairs.find((p) => plain(h).includes(p));
      if (hit) notes.push(`${q.id} 「還是」句型含正解的「${hit}」：${h}`);
    }
  }
  return notes;
}

/**
 * 依單元統計題數，以及是否有排順序或分類題（上架門檻用）。
 * @param {object[]} questions 題目。
 * @param {object[]} units 單元。
 * @returns {Array<{unit: object, total: number, interactive: number}>} 每個單元的題數與排序加分類題數。
 */
export function countUnits(questions, units) {
  return units.map((unit) => {
    const qs = questions.filter((q) => q.unit === unit.id);
    return { unit, total: qs.length, interactive: qs.filter((q) => q.type !== 'choice').length };
  });
}

/**
 * 依難度統計題數、主題、題型（題庫檢查與上架門檻用）。
 * @param {object[]} questions 題目。
 * @returns {Record<string, {total: number, topics: Record<string, number>, types: Record<string, number>}>} 統計。
 */
export function countBank(questions) {
  const out = {};
  for (const d of DIFFICULTIES) {
    const qs = questions.filter((q) => q.difficulty === d);
    const topics = Object.fromEntries(TOPICS.map((t) => [t, qs.filter((q) => q.topic === t).length]));
    const types = Object.fromEntries(TYPES.map((t) => [t, qs.filter((q) => q.type === t).length]));
    out[d] = { total: qs.length, topics, types };
  }
  return out;
}
