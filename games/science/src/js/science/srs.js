// 間隔複習（純邏輯）：複習盒的升降、下次複習日期、是否到期，以及單元進度。

/** 各複習盒的複習間隔（天）；第 0 盒為還沒作答過。 */
export const BOX_DAYS = [0, 1, 3, 7, 14, 30];

/** 最高的複習盒。 */
export const MAX_BOX = BOX_DAYS.length - 1;

/** 單元「已精熟」的門檻：單元中至少這個比例的題目在第 2 盒以上。 */
export const MASTERY_RATIO = 0.8;

/**
 * 把本機時間轉成 `YYYY-MM-DD`。
 * @param {Date} [d] 時間；預設為現在。
 * @returns {string} 日期字串。
 */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 日期加上天數。
 * @param {string} day `YYYY-MM-DD`。
 * @param {number} days 天數。
 * @returns {string} 新的日期字串。
 */
export function addDays(day, days) {
  const [y, m, d] = day.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + days));
}

/**
 * 作答後的新複習盒：一次答對 ＋1（最多 MAX_BOX），答錯或看了解題重點回到第 1 盒。
 * @param {number} box 目前的複習盒（0～MAX_BOX）。
 * @param {boolean} clean 是否一次答對。
 * @returns {number} 新的複習盒。
 */
export function nextBox(box, clean) {
  return clean ? Math.min(MAX_BOX, Math.max(0, box) + 1) : 1;
}

/**
 * 依複習盒算出下次複習日期。
 * @param {string} today 今天 `YYYY-MM-DD`。
 * @param {number} box 複習盒（1～MAX_BOX）。
 * @returns {string} 下次複習日期。
 */
export function dueDate(today, box) {
  return addDays(today, BOX_DAYS[Math.min(MAX_BOX, Math.max(1, box))]);
}

/**
 * 題目是否到期要複習（作答過且下次複習日期在今天以前）。
 * @param {{box?: number, due?: string} | undefined} r 題目紀錄。
 * @param {string} today 今天 `YYYY-MM-DD`。
 * @returns {boolean} 到期時為 true。
 */
export function isDue(r, today) {
  return !!r && r.box > 0 && typeof r.due === 'string' && r.due <= today;
}

/**
 * 單元進度：熟練題數（第 2 盒以上）、作答過的題數與狀態。
 * @param {object[]} questions 單元的題目。
 * @param {Record<string, {box?: number}>} record 題目紀錄。
 * @returns {{status: 'new' | 'learning' | 'mastered', mastered: number, tried: number, total: number}} 進度。
 */
export function unitProgress(questions, record) {
  const total = questions.length;
  let mastered = 0;
  let tried = 0;
  for (const q of questions) {
    const box = (record[q.id] && record[q.id].box) || 0;
    if (box > 0) tried++;
    if (box >= 2) mastered++;
  }
  let status = 'learning';
  if (tried === 0) status = 'new';
  else if (total > 0 && mastered >= Math.ceil(total * MASTERY_RATIO)) status = 'mastered';
  return { status, mastered, tried, total };
}
