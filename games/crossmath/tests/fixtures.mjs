// 測試共用的小盤面（7 × 7）。
// 3 + 4 = 7（第 0 列）、8 − 3 = 5（第 4 列）、3 + 5 = 8（第 0 行）、7 − 2 = 5（第 4 行）。
// 空格為索引 0（解 3）、18（解 2）、30（解 3），數字庫為 {2, 3, 3}。

export const LAYOUT = ['#+#=#..', '+...-..', '#...#..', '=...=..', '#-#=#..', '.......', '.......'].join('');
export const SOLUTION = new Array(49).fill(0);
Object.entries({ 0: 3, 2: 4, 4: 7, 14: 5, 18: 2, 28: 8, 30: 3, 32: 5 }).forEach(([i, v]) => {
  SOLUTION[Number(i)] = v;
});
export const GIVENS = SOLUTION.map((v, i) => ([0, 18, 30].includes(i) ? 0 : v));
