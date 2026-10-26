// 推理回顧 Web Worker：完整列舉所有可能的密碼，計算每次猜測後還剩幾種可能，避免卡住畫面。

import { DIFFICULTIES, remainingAfterEach } from './codebreaker/core.js';

/**
 * 接收推理回顧的請求並回傳每次猜測後的剩餘數。
 * @param {MessageEvent<{difficulty: string, history: {code: number[], black: number, white: number}[]}>} event 請求。
 */
self.onmessage = (event) => {
  const { difficulty, history } = event.data;
  try {
    self.postMessage({ ok: true, counts: remainingAfterEach(DIFFICULTIES[difficulty], history) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
