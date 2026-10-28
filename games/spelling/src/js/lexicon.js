// 詞庫：載入 data/level-<1～6>.json（建置時由 data/words/ 產生），並提供例句挖空等工具。

/** Level 的數量。 */
export const LEVELS = [1, 2, 3, 4, 5, 6];
/** 各 Level 的說明（大考中心詞彙表的分級）。 */
export const LEVEL_DESC = { 1: '最基礎', 2: '基礎', 3: '中級', 4: '中高級', 5: '進階', 6: '最進階' };

/**
 * 把一個 Level 的資料檔（陣列的陣列，節省空間）轉為單字物件。
 * @param {number} level Level。
 * @param {any[][]} rows 資料列：[id, en, pos, zh, example, form, exampleZh]。
 * @returns {object[]} 單字。
 */
export function unpackLevel(level, rows) {
  return rows.map(([id, en, pos, zh, example, form, exampleZh]) => ({ id, en, pos, level, zh, example, form, exampleZh }));
}

/**
 * 載入所有 Level 的詞庫（從 Service Worker 快取或網路）。
 * @param {(url: string) => Promise<any>} [fetchJson] 讀取 JSON 的函式（測試時可替換）。
 * @returns {Promise<object[]>} 全部單字。
 */
export async function loadLexicon(fetchJson = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(url))))) {
  const parts = await Promise.all(LEVELS.map((lv) => fetchJson(`data/level-${lv}.json`).then((rows) => unpackLevel(lv, rows))));
  return parts.flat();
}

/**
 * 例句挖空：把例句中的單字（或變化形）換成底線，作為出題的線索。
 * @param {{en: string, form: string, example: string}} word 單字。
 * @param {string} [blank='＿＿＿'] 取代的文字。
 * @returns {string} 挖空後的例句；找不到單字時原樣回傳。
 */
export function blankExample(word, blank = '＿＿＿') {
  const target = word.form || word.en;
  const esc = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return word.example.replace(new RegExp(`(^|[^A-Za-z])${esc}(?=[^A-Za-z]|$)`, 'i'), `$1${blank}`);
}
