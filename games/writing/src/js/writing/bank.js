// 題目查詢：把固定題庫與題型模板合成同一個查詢介面（由 id 取得題目）。

import { questionFromId } from './templates.js';

/** 題型代碼對應的顯示名稱。 */
export const TOPIC_LABEL = { prompt: '審題', material: '選材', description: '描寫', structure: '組織', rhetoric: '修辭', argument: '論述', revision: '修改' };

/**
 * 判斷 id 是否為模板題（`<模板代碼>#<參數>`）。
 * @param {string} id 題目 id。
 * @returns {boolean} 是模板題時為 true。
 */
export function isTemplateId(id) {
  return String(id).includes('#');
}

/**
 * 模板題 id 的模板代碼。
 * @param {string} id 題目 id。
 * @returns {string} 模板代碼。
 */
export function templateOf(id) {
  return String(id).split('#')[0];
}

/**
 * 建立題目查詢。
 * @param {{questions: object[]}} data 固定題庫（`questions.json` 的內容）。
 * @returns {{questions: object[], lookup: (id: string) => object | null}} 固定題庫清單與查詢函式（模板題每次查詢都重建，結果相同）。
 */
export function createBank(data) {
  const questions = data && Array.isArray(data.questions) ? data.questions : [];
  const byId = new Map(questions.map((q) => [q.id, q]));
  /**
   * 由 id 取得題目。
   * @param {string} id 題目 id。
   * @returns {object | null} 題目；不存在或參數不合用時為 null。
   */
  const lookup = (id) => (isTemplateId(id) ? questionFromId(id) : byId.get(id) || null);
  return { questions, lookup };
}
