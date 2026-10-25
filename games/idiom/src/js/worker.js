// 出題 Web Worker：在背景執行緒載入詞庫並產生題目，避免卡住畫面。

import { buildIndex } from './idiom/data.js';
import { generateGame } from './idiom/generator.js';

/** 詞庫索引（第一次出題時載入，之後重用）。 */
let indexPromise = null;

/**
 * 載入詞庫並建立索引。
 * @returns {Promise<object>} 詞庫索引。
 */
function loadIndex() {
  if (!indexPromise) {
    indexPromise = Promise.all(
      ['idioms.json', 'idiom-levels.json', 'idiom-check.json'].map((name) =>
        fetch(new URL(`../data/${name}`, import.meta.url)).then((res) => {
          if (!res.ok) throw new Error(`無法載入 ${name}`);
          return res.json();
        }),
      ),
    ).then(([idioms, levels, check]) => buildIndex({ idioms, levels, check }));
    indexPromise.catch(() => {
      indexPromise = null;
    });
  }
  return indexPromise;
}

/**
 * 接收出題請求並回傳結果。
 * @param {MessageEvent<{difficulty: string, exclude: string[], priority: object}>} event 請求。
 */
self.onmessage = async (event) => {
  const { difficulty, exclude, priority } = event.data;
  try {
    const index = await loadIndex();
    self.postMessage({ ok: true, result: generateGame(difficulty, index, { exclude, priority }) });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
