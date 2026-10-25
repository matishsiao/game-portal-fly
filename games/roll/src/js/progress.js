// 星等與解鎖規則（純邏輯，可單元測試）。

import { LEVELS } from './levels-data.js';

/**
 * 取得章節的全部關卡。
 * @param {number} ch 章節編號。
 * @returns {object[]} 關卡。
 */
export function chapterLevels(ch) {
  return LEVELS.filter((l) => l.chapter === ch);
}

/**
 * 計算星數：步數等於最少步數且未用提示 3 星；不超過最少步數 × 1.5 得 2 星；其餘 1 星。
 * @param {number} steps 步數。
 * @param {number} par 最少步數。
 * @param {number} hintsUsed 已用提示次數。
 * @returns {number} 星數。
 */
export function starsFor(steps, par, hintsUsed) {
  if (steps <= par && hintsUsed === 0) return 3;
  if (steps <= Math.ceil(par * 1.5)) return 2;
  return 1;
}

/**
 * 判斷章節是否解鎖：第 1 章永遠解鎖；其餘章節在前一章第 15 關過關後解鎖。
 * @param {number} ch 章節編號。
 * @param {object} progress 永久進度。
 * @returns {boolean} 解鎖時為 true。
 */
export function chapterUnlocked(ch, progress) {
  return ch === 1 || !!progress[`${ch - 1}-15`];
}

/**
 * 判斷關卡是否解鎖：章節已解鎖，且為章節第一關或前一關已過關。
 * @param {object} level 關卡。
 * @param {object} progress 永久進度。
 * @returns {boolean} 解鎖時為 true。
 */
export function levelUnlocked(level, progress) {
  if (!chapterUnlocked(level.chapter, progress)) return false;
  const list = chapterLevels(level.chapter);
  const idx = list.indexOf(level);
  return idx === 0 || !!progress[list[idx - 1].id];
}

/**
 * 計算章節的星數與過關數。
 * @param {number} ch 章節編號。
 * @param {object} progress 永久進度。
 * @returns {{stars: number, max: number, cleared: number, three: number, total: number}} 摘要。
 */
export function chapterSummary(ch, progress) {
  const list = chapterLevels(ch);
  let stars = 0;
  let cleared = 0;
  let three = 0;
  for (const l of list) {
    const p = progress[l.id];
    if (!p) continue;
    cleared++;
    stars += p.stars;
    if (p.stars === 3) three++;
  }
  return { stars, max: list.length * 3, cleared, three, total: list.length };
}
