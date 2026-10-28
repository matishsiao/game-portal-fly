// 國中七年級計算題（顯微鏡倍率、染色體數、遺傳機率）的獨立驗算：以計算或列舉算出正確選項文字。

/** 求最大公因數。 */
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/**
 * 把分數化成最簡分數字串（分母為 1 時只寫分子）。
 * @param {number} n 分子。
 * @param {number} d 分母。
 * @returns {string} 例如「3/4」。
 */
const frac = (n, d) => {
  const g = gcd(n, d);
  return d / g === 1 ? `${n / g}` : `${n / g}/${d / g}`;
};

/**
 * 列舉兩個親代的配子組合，得到所有子代基因型（每個組合機率相同）。
 * @param {string} p1 親代 1 的一對基因，例如「Rr」。
 * @param {string} p2 親代 2 的一對基因。
 * @returns {string[]} 子代基因型（大寫在前）。
 */
const cross = (p1, p2) => {
  const kids = [];
  for (const a of p1) for (const b of p2) kids.push([a, b].sort().join(''));
  return kids;
};

/**
 * 子代符合條件的機率（最簡分數字串）。
 * @param {string[]} kids 子代基因型。
 * @param {(g: string) => boolean} ok 條件。
 * @returns {string} 機率。
 */
const prob = (kids, ok) => frac(kids.filter(ok).length, kids.length);

/** 有顯性（大寫）基因。 */
const dominant = (g) => /[A-Z]/.test(g);

/** 國字數字（1～9）。 */
const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

export default {
  // 目鏡 10× 與物鏡 40× 的放大倍率
  'expert-104': () => `${10 * 40} 倍`,
  // 減數分裂後精子的染色體數
  'expert-162': () => `${46 / 2} 條`,
  // Rr × Rr 子代表現圓形（顯性）的機率
  'expert-171': () => prob(cross('Rr', 'Rr'), dominant),
  // Tt × tt 子代矮莖（隱性）的機率
  'expert-172': () => prob(cross('Tt', 'tt'), (g) => !dominant(g)),
  // Bb × Bb 生 8 隻，預期白毛（bb）隻數
  'expert-176': () => {
    const kids = cross('Bb', 'Bb');
    return `${(8 * kids.filter((g) => !dominant(g)).length) / kids.length} 隻`;
  },
  // 第三胎為男孩的機率：卵都帶 X，精子帶 X 或 Y，與前兩胎無關
  'expert-179': () => {
    const kids = [];
    for (const egg of ['X']) for (const sperm of ['X', 'Y']) kids.push(egg + sperm);
    return prob(kids, (g) => g.includes('Y'));
  },
  // 子一代 Tt 自花授粉，子二代矮莖的比例
  'expert-180': () => {
    const f1 = cross('TT', 'tt')[0];
    const kids = cross(f1, f1);
    const n = kids.filter((g) => !dominant(g)).length;
    const g = gcd(n, kids.length);
    return `約${CN[kids.length / g]}分之${CN[n / g]}是矮莖`;
  },
};
