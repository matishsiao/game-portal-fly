// 釋義遮蔽：作答時找出釋義中會透露答案的文字範圍，畫面以樣式遮住（文字本身不變）。
// 遮住的範圍：
//   - 成語本身；
//   - 成語中含有空格字的連續 2～3 字片段；
//   - 點出空格字的註解寫法：「「X」」、「X，音…」，以及位於開頭、換行或句號之後的「X，」。

/**
 * 計算釋義中要遮住的範圍。
 * @param {string} meaning 釋義原文。
 * @param {string} text 成語。
 * @param {number[]} blankPos 空格在成語中的位置（0～3）。
 * @returns {number[][]} 依起點排序、互不重疊的 [起點, 終點) 範圍（以 UTF-16 索引表示）。
 */
export function maskRanges(meaning, text, blankPos) {
  const chars = Array.from(text);
  const ranges = [];
  /**
   * 標記所有出現位置。
   * @param {string} needle 搜尋字串。
   * @param {number} [offset=0] 要遮住部分在 needle 中的起點。
   * @param {number} [length=needle.length] 要遮住部分的長度。
   */
  const add = (needle, offset = 0, length = needle.length) => {
    for (let i = meaning.indexOf(needle); i >= 0; i = meaning.indexOf(needle, i + 1)) ranges.push([i + offset, i + offset + length]);
  };
  add(text);
  for (let len = 2; len <= 3; len++) {
    for (let st = 0; st + len <= 4; st++) {
      if (blankPos.some((p) => p >= st && p < st + len)) add(chars.slice(st, st + len).join(''));
    }
  }
  for (const p of blankPos) {
    const ch = chars[p];
    add(`「${ch}」`, 1, 1);
    add(`${ch}，音`, 0, 1);
    for (let i = meaning.indexOf(`${ch}，`); i >= 0; i = meaning.indexOf(`${ch}，`, i + 1)) {
      if (i === 0 || '\n。'.includes(meaning[i - 1])) ranges.push([i, i + 1]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  const merged = [];
  for (const [a, b] of ranges) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged;
}
