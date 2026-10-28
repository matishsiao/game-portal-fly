// 休息提醒（純邏輯）：累計連續遊玩時間，達 20 分鐘時在下一題前提醒看遠方休息。

/** 連續遊玩多久提醒一次（毫秒）。 */
export const REST_AFTER_MS = 20 * 60 * 1000;
/** 回到首頁超過多久，連續遊玩時間歸零（毫秒）。 */
export const REST_RESET_MS = 5 * 60 * 1000;
/** 同一局最多提醒幾次。 */
export const REST_MAX_PER_GAME = 3;

/**
 * 建立休息提醒的狀態。
 * @returns {{playedMs: number, leftAt: number | null, shownThisGame: number}} 狀態：累計遊玩毫秒、離開遊戲畫面的時刻（單調時鐘）、本局已提醒次數。
 */
export function createRest() {
  return { playedMs: 0, leftAt: null, shownThisGame: 0 };
}

/**
 * 加入一段遊玩時間（計時停止時呼叫，暫停與背景時間不會被加入）。
 * @param {object} rest 狀態（會被修改）。
 * @param {number} ms 這段遊玩的毫秒數。
 */
export function addPlay(rest, ms) {
  if (ms > 0) rest.playedMs += ms;
}

/**
 * 離開遊戲畫面（回首頁）時記下時刻。
 * @param {object} rest 狀態（會被修改）。
 * @param {number} now 單調時鐘的目前時刻（毫秒）。
 */
export function leaveGame(rest, now) {
  rest.leftAt = now;
}

/**
 * 進入遊戲畫面：離開超過 REST_RESET_MS 時累計歸零；開始新局時重設本局提醒次數。
 * @param {object} rest 狀態（會被修改）。
 * @param {number} now 單調時鐘的目前時刻（毫秒）。
 * @param {boolean} newGame 是否為新的一局。
 */
export function enterGame(rest, now, newGame) {
  if (rest.leftAt !== null && now - rest.leftAt > REST_RESET_MS) rest.playedMs = 0;
  rest.leftAt = null;
  if (newGame) rest.shownThisGame = 0;
}

/**
 * 是否應該在這次「下一題」前提醒；提醒後重新累計。
 * @param {object} rest 狀態（提醒時會被修改）。
 * @param {number} runningMs 尚未加入的進行中時間（毫秒）。
 * @param {boolean} enabled 設定是否開啟休息提醒。
 * @returns {boolean} 是否提醒。
 */
export function shouldRemind(rest, runningMs, enabled) {
  if (!enabled || rest.shownThisGame >= REST_MAX_PER_GAME) return false;
  if (rest.playedMs + Math.max(0, runningMs) < REST_AFTER_MS) return false;
  rest.playedMs = -Math.max(0, runningMs);
  rest.shownThisGame++;
  return true;
}
