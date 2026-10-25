// 提示用 Web Worker：在背景執行緒從目前狀態求最佳解，避免卡住畫面。

import { solve } from './solver.js';

/**
 * 接收目前狀態，回傳最佳解操作序列。
 * @param {MessageEvent<{state: object}>} event 請求。
 */
self.onmessage = (event) => {
  try {
    const r = solve(event.data.state, { maxStates: 1500000 });
    self.postMessage({ ok: true, solved: r.solved, moves: r.moves });
  } catch (err) {
    self.postMessage({ ok: false, error: String(err && err.message ? err.message : err) });
  }
};
