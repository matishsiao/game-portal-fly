// 題庫查詢：題目、科學卡與單元的查詢介面，以及主題、學習階段與模式的顯示名稱。

/** 主題代碼（依顯示順序）。 */
export const TOPICS = ['life', 'earth', 'matter', 'force'];

/** 主題代碼對應的顯示名稱與圖示。 */
export const TOPIC_INFO = {
  life: { label: '生命', icon: '🌱' },
  earth: { label: '地球', icon: '🌏' },
  matter: { label: '物質', icon: '🧪' },
  force: { label: '力與電磁', icon: '🧲' },
};

/** 學習地圖的單元分組：四大主題，再加上跨主題的「科學探究」。 */
export const UNIT_GROUPS = [...TOPICS, 'inquiry'];

/** 單元分組的顯示名稱與圖示（含「科學探究」）。 */
export const GROUP_INFO = { ...TOPIC_INFO, inquiry: { label: '科學探究', icon: '🔬' } };

/** 「綜合」的主題代碼。 */
export const ALL_TOPICS = 'all';

/** 模式代碼對應的顯示名稱：預習、練習（單元複習）、今日複習、綜合練習。 */
export const MODE_LABEL = { preview: '預習', practice: '練習', review: '今日複習', mixed: '綜合練習' };

/**
 * 建立題庫查詢。
 * @param {{questions: object[]} | null} questionData 題目（`questions.json` 的內容）。
 * @param {{cards: object[]} | null} cardData 科學卡（`cards.json` 的內容）。
 * @param {{units: object[]} | null} [unitData] 單元（`units.json` 的內容）。
 * @returns {{questions: object[], cards: object[], units: object[], lookup: (id: string) => object | null, card: (id: string) => object | null, unit: (id: string) => object | null, unitQuestions: (id: string) => object[]}} 資料與查詢函式。
 */
export function createBank(questionData, cardData, unitData = null) {
  const questions = questionData && Array.isArray(questionData.questions) ? questionData.questions : [];
  const cards = cardData && Array.isArray(cardData.cards) ? cardData.cards : [];
  const units = unitData && Array.isArray(unitData.units) ? unitData.units : [];
  const byId = new Map(questions.map((q) => [q.id, q]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const byUnit = new Map();
  for (const q of questions) {
    if (!byUnit.has(q.unit)) byUnit.set(q.unit, []);
    byUnit.get(q.unit).push(q);
  }
  return {
    questions,
    cards,
    units,
    /**
     * 由 id 取得題目。
     * @param {string} id 題目 id。
     * @returns {object | null} 題目；不存在時為 null。
     */
    lookup: (id) => byId.get(id) || null,
    /**
     * 由 id 取得科學卡。
     * @param {string} id 科學卡 id。
     * @returns {object | null} 科學卡；不存在時為 null。
     */
    card: (id) => cardById.get(id) || null,
    /**
     * 由 id 取得單元。
     * @param {string} id 單元 id。
     * @returns {object | null} 單元；不存在時為 null。
     */
    unit: (id) => unitById.get(id) || null,
    /**
     * 某個單元的所有題目。
     * @param {string} id 單元 id。
     * @returns {object[]} 題目（依題庫順序）。
     */
    unitQuestions: (id) => byUnit.get(id) || [],
  };
}
