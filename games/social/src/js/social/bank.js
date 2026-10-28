// 題庫查詢：題目與知識卡的查詢介面，以及科目、主題的顯示名稱與各難度涵蓋的主題。

/** 科目代碼（依顯示順序）。 */
export const SUBJECTS = ['history', 'geography', 'civics'];

/** 科目代碼對應的顯示名稱與圖示。 */
export const SUBJECT_INFO = {
  history: { label: '歷史', icon: '🏛️' },
  geography: { label: '地理', icon: '🗺️' },
  civics: { label: '公民', icon: '⚖️' },
};

/** 「綜合」（三個科目都出）的代碼。 */
export const ALL_SUBJECTS = 'all';

/** 主題代碼對應的科目與顯示名稱（依顯示順序）。 */
export const TOPIC_INFO = {
  local: { subject: 'history', label: '家鄉與地方變遷' },
  chronology: { subject: 'history', label: '年代與時間' },
  prehistory: { subject: 'history', label: '史前文化' },
  'early-modern-tw': { subject: 'history', label: '大航海時代與清帝國時期' },
  'japanese-era': { subject: 'history', label: '日本統治時期' },
  'postwar-tw': { subject: 'history', label: '戰後臺灣' },
  'china-east-asia': { subject: 'history', label: '中國與東亞史' },
  world: { subject: 'history', label: '世界史' },
  map: { subject: 'geography', label: '方位、地圖與經緯度' },
  landform: { subject: 'geography', label: '地形與水文' },
  climate: { subject: 'geography', label: '天氣與氣候' },
  population: { subject: 'geography', label: '人口與聚落' },
  'economy-geo': { subject: 'geography', label: '產業與區域' },
  'tw-geo': { subject: 'geography', label: '臺灣區域' },
  'east-asia-geo': { subject: 'geography', label: '中國與東亞' },
  'world-geo': { subject: 'geography', label: '世界區域' },
  life: { subject: 'civics', label: '家庭、學校與社區生活' },
  rights: { subject: 'civics', label: '權利與義務' },
  democracy: { subject: 'civics', label: '民主與選舉' },
  government: { subject: 'civics', label: '政府組織與地方自治' },
  law: { subject: 'civics', label: '法律與生活' },
  economy: { subject: 'civics', label: '經濟與消費' },
  society: { subject: 'civics', label: '社會團體與文化' },
  global: { subject: 'civics', label: '全球化與國際' },
};

/** 主題代碼（依顯示順序）。 */
export const TOPICS = Object.keys(TOPIC_INFO);

/** 各難度的建議年級範圍（題目的 grade 必須落在範圍內）。 */
export const GRADE_RANGE = { easy: [3, 4], medium: [5, 6], hard: [7, 8], expert: [9, 9] };

/**
 * 建立題庫查詢。
 * @param {{questions: object[]} | null} questionData 題目（`questions.json` 的內容）。
 * @param {{cards: object[]} | null} cardData 知識卡（`cards.json` 的內容）。
 * @returns {{questions: object[], cards: object[], lookup: (id: string) => object | null, card: (id: string) => object | null}} 題目、知識卡與查詢函式。
 */
export function createBank(questionData, cardData) {
  const questions = questionData && Array.isArray(questionData.questions) ? questionData.questions : [];
  const cards = cardData && Array.isArray(cardData.cards) ? cardData.cards : [];
  const byId = new Map(questions.map((q) => [q.id, q]));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  return {
    questions,
    cards,
    /**
     * 由 id 取得題目。
     * @param {string} id 題目 id。
     * @returns {object | null} 題目；不存在時為 null。
     */
    lookup: (id) => byId.get(id) || null,
    /**
     * 由 id 取得知識卡。
     * @param {string} id 知識卡 id。
     * @returns {object | null} 知識卡；不存在時為 null。
     */
    card: (id) => cardById.get(id) || null,
  };
}

/**
 * 某個難度、科目實際有題目的主題（依顯示順序），供首頁選主題。
 * @param {object[]} questions 題庫。
 * @param {string} difficulty 難度代碼。
 * @param {string} subject 科目代碼。
 * @returns {string[]} 主題代碼。
 */
export function topicsFor(questions, difficulty, subject) {
  const used = new Set(questions.filter((q) => q.difficulty === difficulty && q.subject === subject).map((q) => q.topic));
  return TOPICS.filter((t) => TOPIC_INFO[t].subject === subject && used.has(t));
}
