// 去重改寫中計算題 expert-669 的答案驗證函式：以公式實際算出正解選項文字（格式同 tests/answers/x9p.mjs）。

/** 數字格式化：去掉浮點誤差，最多保留 2 位小數。 */
const n = (x) => String(Math.round(x * 100) / 100);

export default {
  // 效率＝輸出電能 ÷ 輸入光能 × 100%。
  'expert-669': () => { const input = 1000, output = 180; return `${n((output / input) * 100)}%`; },
};
