// 詞庫索引：遊戲可用成語、常見度、易混淆字，以及檢查用成語表的位置索引（找出符合「□諾千□」樣式的成語）。

/**
 * 建立詞庫索引。
 * @param {{idioms: {id: string, text: string}[], levels: Record<string, {level: number, confusables?: Record<string, string[]>}>, check: string[]}} raw
 *   idioms.json、idiom-levels.json、idiom-check.json 的內容。
 * @returns {object} 索引：idioms、byId、level(id)、confusables(id)、checkSet、check4、posIndex。
 */
export function buildIndex({ idioms, levels, check }) {
  const byId = new Map(idioms.map((i) => [i.id, i]));
  const check4 = [];
  for (const t of check) if (Array.from(t).length === 4) check4.push(t);
  const checkSet = new Set(check4);
  for (const i of idioms) if (!checkSet.has(i.text)) {
    checkSet.add(i.text);
    check4.push(i.text);
  }
  const posIndex = [new Map(), new Map(), new Map(), new Map()];
  for (const t of check4) {
    Array.from(t).forEach((ch, p) => {
      const list = posIndex[p].get(ch);
      if (list) list.push(t);
      else posIndex[p].set(ch, [t]);
    });
  }
  return {
    idioms,
    byId,
    /**
     * 取得成語的常見度（未分級時為 2）。
     * @param {string} id 成語 id。
     * @returns {number} 1～3。
     */
    level: (id) => (levels[id] && levels[id].level) || 2,
    /**
     * 取得成語的易混淆字。
     * @param {string} id 成語 id。
     * @returns {Record<string, string[]>} 字 → 易混淆字。
     */
    confusables: (id) => (levels[id] && levels[id].confusables) || {},
    checkSet,
    check4,
    posIndex,
  };
}

/**
 * 找出檢查表中符合樣式的四字成語。
 * @param {object} index 詞庫索引。
 * @param {(string | null)[]} pattern 長度 4，已知的字或 null。
 * @returns {string[]} 符合的成語。
 */
export function matchPattern(index, pattern) {
  let best = null;
  for (let p = 0; p < 4; p++) {
    if (!pattern[p]) continue;
    const list = index.posIndex[p].get(pattern[p]) || [];
    if (!best || list.length < best.length) best = list;
  }
  const base = best || index.check4;
  return base.filter((t) => {
    const chars = Array.from(t);
    return pattern.every((ch, p) => !ch || chars[p] === ch);
  });
}
