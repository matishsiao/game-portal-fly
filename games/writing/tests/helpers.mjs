// 測試共用：題目格式與「解題重點不洩題」檢查。

import assert from 'node:assert/strict';

/** 已定義的難度代碼。 */
export const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'];

/** 已定義的題型代碼（與規格「題庫」一節的表一致）。 */
export const TOPICS = ['prompt', 'material', 'description', 'structure', 'rhetoric', 'argument', 'revision'];

/**
 * 判斷文字中是否出現某個選項（數字開頭的選項前一個字不能是數字，避免「5 棵」誤判「15 棵」）。
 * @param {string} text 要檢查的文字。
 * @param {string} choice 選項文字。
 * @returns {boolean} 是否出現。
 */
export function mentions(text, choice) {
  let i = text.indexOf(choice);
  while (i !== -1) {
    const before = text[i - 1];
    const after = text[i + choice.length];
    const digitBefore = /^\d/.test(choice) && before !== undefined && /\d/.test(before);
    const digitAfter = /\d$/.test(choice) && after !== undefined && /\d/.test(after);
    if (!digitBefore && !digitAfter) return true;
    i = text.indexOf(choice, i + 1);
  }
  return false;
}

/**
 * 檢查一題的格式與解題重點：4 個不同選項、answer 合法、2 段 keys 不含正解、詳解含正解。
 * @param {object} q 題目。
 */
export function assertQuestion(q) {
  const where = q.id;
  assert.ok(DIFFICULTIES.includes(q.difficulty), `${where} 難度代碼`);
  assert.ok(TOPICS.includes(q.topic), `${where} 題型代碼`);
  assert.equal(typeof q.question, 'string', `${where} 題目`);
  assert.equal(q.choices.length, 4, `${where} 選項數`);
  assert.equal(new Set(q.choices).size, 4, `${where} 選項重複：${q.choices.join('、')}`);
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${where} answer`);
  assert.equal(q.keys.length, 2, `${where} 解題重點段數`);
  const correct = q.choices[q.answer];
  // 正解若本來就出現在題目中（例如題目資料「100 個 2」），解題重點引用題目資料不算洩題。
  const inQuestion = mentions(q.question, correct);
  for (const k of q.keys) {
    assert.ok(k.length > 0, `${where} 解題重點為空`);
    assert.ok(inQuestion || !mentions(k, correct), `${where} 解題重點洩題：${k}`);
  }
  const num = /^\d+/.exec(correct);
  assert.ok(mentions(q.explain, num ? num[0] : correct), `${where} 詳解不含正解`);
}
