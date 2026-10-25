// 盤面結構（逐題模式的一題，或一個交叉填字盤）：
//   rows、cols  盤面大小
//   words       成語位置 [{id, dir: 'h' | 'v', r, c}]，每個成語四格
//   blanks      空格的格子索引（索引 = 列 × cols ＋ 行）
//   bank        字庫（所有空格答案加上干擾字，可重複）
// 格子的正確字由成語 id 取回文字後推算（answersOf），存檔不另存成語文字。

/**
 * 取得成語佔用的四個格子索引。
 * @param {{cols: number}} board 盤面。
 * @param {{dir: string, r: number, c: number}} w 成語位置。
 * @returns {number[]} 格子索引（依閱讀順序）。
 */
export function wordCells(board, w) {
  const out = [];
  for (let k = 0; k < 4; k++) {
    const r = w.dir === 'h' ? w.r : w.r + k;
    const c = w.dir === 'h' ? w.c + k : w.c;
    out.push(r * board.cols + c);
  }
  return out;
}

/**
 * 推算每格的正確字。
 * @param {{rows: number, cols: number, words: {id: string}[]}} board 盤面。
 * @param {(id: string) => string} textOf 由成語 id 取得文字。
 * @returns {string[]} 長度 rows × cols，空白區域為空字串。
 */
export function answersOf(board, textOf) {
  const out = new Array(board.rows * board.cols).fill('');
  for (const w of board.words) {
    const chars = Array.from(textOf(w.id));
    wordCells(board, w).forEach((cell, k) => {
      out[cell] = chars[k];
    });
  }
  return out;
}

/**
 * 取得每格所屬的成語（索引）。
 * @param {object} board 盤面。
 * @returns {number[][]} 長度 rows × cols。
 */
export function cellWords(board) {
  const out = Array.from({ length: board.rows * board.cols }, () => []);
  board.words.forEach((w, k) => {
    for (const cell of wordCells(board, w)) out[cell].push(k);
  });
  return out;
}

/**
 * 計算字的數量。
 * @param {string[]} chars 字。
 * @returns {Map<string, number>} 字 → 數量。
 */
export function countChars(chars) {
  const m = new Map();
  for (const ch of chars) m.set(ch, (m.get(ch) || 0) + 1);
  return m;
}
