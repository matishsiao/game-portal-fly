// 出題 Web Worker：在背景執行緒產生題目，避免卡住畫面。

import { generatePuzzle } from './numberlink/generator.js';

/**
 * 接收出題請求並回傳結果。
 * @param {MessageEvent<{difficulty: string, exclude: string[]}>} event 請求。
 */
self.onmessage = (event) => {
  const { difficulty, exclude } = event.data;
  try {
    const result = generatePuzzle(difficulty, { exclude });
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
