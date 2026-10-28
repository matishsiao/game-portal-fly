// 固定題庫相容介面與可重現的測試亂數，不產生模板題。
/** 本遊戲不提供題型模板。 */
export const TEMPLATES = {};
/** 未使用模板，未知題號一律回傳空值。 */
export function questionFromId() { return null; }
/** 不支援產生模板題。 */
export function generateQuestion() { throw new Error('作文題須人工設計'); }
/** 建立可重現的亂數函式，供挑題測試使用。 */
export function createRng(seed) {
  let state = seed >>> 0;
  /** 推進亂數狀態並回傳零至一之間的值。 */
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}
