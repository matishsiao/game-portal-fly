// 家園繪圖工具（共用）：色階、像素圖形與部件（板材方塊、靠墊、柱子、玻璃、葉叢）與材質紋理。
// 所有家園美術（homeArt.js 與 homeArt/ 下各分組）都用這些工具，維持一致的光源、明暗與外框。
// 規則：統一左上光源；每種顏色用 ramp() 的五階（外框 o、陰影 d、基底 b、亮面 l、高光 h）；外框用深色而非純黑；
// 擺在地上的物件先畫 shadow() 投影；座標一律整數（rect、px、ellipse 都會對齊像素，不反鋸齒）。

/** 家園場景每格的像素數。 */
export const HT = 32;

/**
 * 建立畫布（瀏覽器環境）。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @returns {HTMLCanvasElement} 畫布。
 */
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * 混合兩個 #rrggbb 顏色。
 * @param {string} a 顏色 a。
 * @param {string} b 顏色 b。
 * @param {number} t 比例（0 為 a、1 為 b）。
 * @returns {string} 混合後的顏色。
 */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 由基底色產生五階色：外框 o（偏暗、帶原色調，不用純黑）、陰影 d、基底 b、亮面 l、高光 h。
 * @param {string} base 基底色。
 * @returns {{o: string, d: string, b: string, l: string, h: string}} 色階。
 */
export function ramp(base) {
  return { o: mix(mix(base, '#1a1020', 0.7), '#000000', 0.15), d: mix(base, '#1a1020', 0.32), b: base, l: mix(base, '#ffffff', 0.22), h: mix(base, '#ffffff', 0.5) };
}

/** 常用材質色階。 */
export const R = {
  wood: ramp('#a8743e'),
  darkWood: ramp('#6e4428'),
  lightWood: ramp('#d0a468'),
  stone: ramp('#8a9098'),
  sand: ramp('#d8b870'),
  red: ramp('#c0444a'),
  blue: ramp('#4a72c0'),
  cream: ramp('#efe4cc'),
  green: ramp('#4fa058'),
  leaf: ramp('#5aa848'),
  gold: ramp('#e0b040'),
  brass: ramp('#c8963a'),
  iron: ramp('#5a6070'),
  clay: ramp('#c0643a'),
  white: ramp('#f2f0ea'),
  black: ramp('#3a3448'),
  water: ramp('#4aa8d8'),
  fire: ramp('#f08a2a'),
  purple: ramp('#8a5ac8'),
  dragon: ramp('#c8402e'),
};

/**
 * 以整數座標填滿矩形。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {string} c 顏色。
 */
export function rect(g, x, y, w, h, c) {
  if (w <= 0 || h <= 0) return;
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * 點一個像素。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {string} c 顏色。
 */
export function px(g, x, y, c) {
  rect(g, x, y, 1, 1, c);
}

/**
 * 固定的雜湊亂數（同樣的輸入一定得到同樣的結果，紋理每次繪製都一樣）。
 * @param {number} a 參數 a。
 * @param {number} b 參數 b。
 * @param {number} [s=0] 種子。
 * @returns {number} 0～1。
 */
export function hash(a, b, s = 0) {
  let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * 以像素填滿橢圓（邊緣清晰，不反鋸齒）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {string} c 顏色。
 */
export function ellipse(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    if (x1 > x0) g.fillRect(x0, y, x1 - x0, 1);
  }
}

/**
 * 有外框與左上光源的球體或橢圓體（外框、陰影、基底、亮面、高光點）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {object} r 色階。
 */
export function orb(g, cx, cy, rx, ry, r) {
  ellipse(g, cx, cy, rx + 1, ry + 1, r.o);
  ellipse(g, cx, cy, rx, ry, r.d);
  ellipse(g, cx - rx * 0.12, cy - ry * 0.12, rx * 0.86, ry * 0.86, r.b);
  ellipse(g, cx - rx * 0.32, cy - ry * 0.34, rx * 0.42, ry * 0.36, r.l);
  ellipse(g, cx - rx * 0.42, cy - ry * 0.46, Math.max(1, rx * 0.16), Math.max(1, ry * 0.14), r.h);
}

/**
 * 物件底下的柔和投影（兩層半透明橢圓）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} by 底部 y。
 * @param {number} w 寬。
 */
export function shadow(g, cx, by, w) {
  g.globalAlpha = 0.16;
  ellipse(g, cx, by - 1, w / 2 + 2, 3.5, '#000000');
  g.globalAlpha = 0.18;
  ellipse(g, cx, by - 1, w / 2 - 1, 2.2, '#000000');
  g.globalAlpha = 1;
}

/**
 * 木紋：水平的深色細紋（有斷點與少量木節），疊在指定範圍。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 * @param {number} [seed=0] 種子。
 */
export function woodGrain(g, x, y, w, h, r, seed = 0) {
  for (let j = 1; j < h; j += 3) {
    for (let i = 0; i < w; i++) {
      const v = hash(i >> 2, j + seed, seed);
      if (v < 0.62) px(g, x + i, y + j, mix(r.b, r.d, 0.45));
    }
  }
  if (w > 8 && h > 5) {
    const kx = x + 2 + Math.floor(hash(seed, 7) * (w - 5));
    const ky = y + 1 + Math.floor(hash(seed, 9) * (h - 3));
    px(g, kx, ky, r.d);
    px(g, kx + 1, ky, r.d);
  }
}

/**
 * 石紋：斑點與少量裂縫。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 * @param {number} [seed=0] 種子。
 */
export function stoneGrain(g, x, y, w, h, r, seed = 0) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const v = hash(i, j, seed + 11);
      if (v < 0.07) px(g, x + i, y + j, r.d);
      else if (v > 0.95) px(g, x + i, y + j, r.l);
    }
  }
}

/**
 * 布紋：細小的交錯織點。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
export function weave(g, x, y, w, h, r) {
  for (let j = 0; j < h; j++) for (let i = (j % 2) * 2; i < w; i += 4) px(g, x + i, y + j, mix(r.b, r.d, 0.3));
}

/**
 * 3/4 俯視的板材方塊：上方頂面（較亮、上緣高光）與正面（基底色、底部陰影、右側陰影），外圍深色外框。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左上 x。
 * @param {number} y 左上 y（頂面上緣）。
 * @param {number} w 寬。
 * @param {number} top 頂面高。
 * @param {number} front 正面高。
 * @param {object} r 色階。
 * @param {'wood' | 'stone' | 'cloth' | null} [tex] 材質紋理。
 * @param {number} [seed=0] 紋理種子。
 */
export function block(g, x, y, w, top, front, r, tex = null, seed = 0) {
  rect(g, x - 1, y - 1, w + 2, top + front + 2, r.o);
  rect(g, x, y, w, top, r.l);
  rect(g, x, y, w, 1, r.h);
  rect(g, x, y + top, w, front, r.b);
  rect(g, x, y + top, w, 1, r.d);
  rect(g, x, y + top + front - 1, w, 1, r.d);
  rect(g, x + w - 1, y + top, 1, front, r.d);
  if (tex === 'wood') {
    woodGrain(g, x + 1, y + 1, w - 2, top - 1, { ...r, b: r.l, d: r.b }, seed);
    woodGrain(g, x + 1, y + top + 1, w - 2, front - 2, r, seed + 3);
  } else if (tex === 'stone') {
    stoneGrain(g, x, y + 1, w, top - 1, { ...r, b: r.l, d: r.b, l: r.h }, seed);
    stoneGrain(g, x, y + top + 1, w - 1, front - 2, r, seed + 5);
  } else if (tex === 'cloth') {
    weave(g, x + 1, y + 1, w - 2, top - 1, { ...r, b: r.l, d: r.b });
    weave(g, x + 1, y + top + 1, w - 2, front - 2, r);
  }
}

/**
 * 柔軟的靠墊或床墊：圓角、上緣高光、下緣陰影、布紋。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
export function cushion(g, x, y, w, h, r) {
  rect(g, x + 1, y - 1, w - 2, h + 2, r.o);
  rect(g, x - 1, y + 1, w + 2, h - 2, r.o);
  rect(g, x, y, w, h, r.b);
  rect(g, x, y, 1, 1, r.o);
  rect(g, x + w - 1, y, 1, 1, r.o);
  rect(g, x, y + h - 1, 1, 1, r.o);
  rect(g, x + w - 1, y + h - 1, 1, 1, r.o);
  weave(g, x + 1, y + 2, w - 2, h - 3, r);
  rect(g, x + 1, y + 1, w - 2, 1, r.l);
  rect(g, x + 2, y + 1, Math.max(1, Math.floor(w / 3)), 1, r.h);
  rect(g, x + 1, y + h - 2, w - 2, 1, r.d);
}

/**
 * 細長的柱子或桌腳（左亮右暗）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬（至少 2）。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
export function post(g, x, y, w, h, r) {
  rect(g, x - 1, y, w + 2, h + 1, r.o);
  rect(g, x, y, w, h, r.b);
  rect(g, x, y, 1, h, r.l);
  rect(g, x + w - 1, y, 1, h, r.d);
}

/**
 * 玻璃面：半透明淺藍底、外框與兩道斜向反光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {string} [tint='#bfe6ff'] 玻璃顏色。
 */
export function glass(g, x, y, w, h, tint = '#bfe6ff') {
  g.globalAlpha = 0.55;
  rect(g, x, y, w, h, tint);
  g.globalAlpha = 0.9;
  for (let k = 0; k < Math.min(w, h); k++) {
    px(g, x + 2 + k, y + h - 3 - k, '#ffffff');
    if (k < Math.min(w, h) - 4) px(g, x + 5 + k, y + h - 3 - k, '#ffffff');
  }
  g.globalAlpha = 1;
}

/**
 * 葉叢：數個重疊的小葉團，左上亮右下暗，邊緣帶外框。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rad 半徑。
 * @param {object} r 色階。
 * @param {number} [seed=0] 種子。
 */
export function foliage(g, cx, cy, rad, r, seed = 0) {
  const blobs = [];
  const n = 5 + Math.floor(rad / 3);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + hash(k, seed) * 0.6;
    const d = rad * (0.45 + hash(seed, k) * 0.25);
    blobs.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, rad * (0.42 + hash(k, k, seed) * 0.12)]);
  }
  blobs.push([cx, cy, rad * 0.6]);
  for (const [x, y, s] of blobs) ellipse(g, x, y, s + 1, s + 1, r.o);
  for (const [x, y, s] of blobs) ellipse(g, x, y, s, s, r.d);
  for (const [x, y, s] of blobs) ellipse(g, x - s * 0.15, y - s * 0.2, s * 0.8, s * 0.75, r.b);
  for (const [x, y, s] of blobs) if (y < cy + rad * 0.2) ellipse(g, x - s * 0.3, y - s * 0.35, s * 0.4, s * 0.35, r.l);
  for (const [x, y, s] of blobs) if (x < cx && y < cy) px(g, x - s * 0.4, y - s * 0.45, r.h);
}

/**
 * 田地：深色翻過的泥土與畦溝。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 */
export function soil(g) {
  const r = ramp('#6a4428');
  rect(g, 2, 26, 28, 13, r.o);
  rect(g, 3, 27, 26, 11, r.b);
  for (let y = 29; y < 38; y += 3) rect(g, 4, y, 24, 1, r.d);
  for (let x = 4; x < 28; x += 5) px(g, x, 28, r.l);
}

