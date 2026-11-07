// 家園美術：新作物（牧草與臺灣特產）的三個生長階段，以及物產、染料、料理的 32 × 32 圖示（繪製規則見 homeDraw.js 開頭說明）。

import { mix, ramp, R, rect, px, hash, ellipse, orb, block, foliage, soil } from '../homeDraw.js';

/**
 * 依判斷函式逐像素填色，並在形狀外圍描一圈 1 像素外框（上下左右相鄰的像素）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 範圍左。
 * @param {number} y0 範圍上。
 * @param {number} x1 範圍右。
 * @param {number} y1 範圍下。
 * @param {(x: number, y: number) => boolean} inside 像素是否在形狀內。
 * @param {(x: number, y: number) => string} shade 形狀內像素的顏色。
 * @param {string | null} o 外框顏色（null 不描框）。
 */
function paint(g, x0, y0, x1, y1, inside, shade, o) {
  for (let y = y0 - 1; y <= y1 + 1; y++) {
    for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (inside(x, y)) px(g, x, y, shade(x, y));
      else if (o && (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1))) px(g, x, y, o);
    }
  }
}

/**
 * 圓潤物體的明暗（左上光源）：依正規化座標決定用色階的哪一階。
 * @param {object} r 色階。
 * @param {number} nx 正規化 x（邊緣約 ±1）。
 * @param {number} ny 正規化 y（邊緣約 ±1）。
 * @returns {string} 顏色。
 */
function tone(r, nx, ny) {
  const dh = (nx + 0.4) ** 2 + (ny + 0.45) ** 2;
  if (dh < 0.03) return r.h;
  if (dh < 0.2) return r.l;
  if (nx + ny > 0.75 || (nx * nx + ny * ny > 0.72 && nx + ny > 0.15)) return r.d;
  return r.b;
}

/**
 * 產生以橢圓中心正規化的明暗函式（給 paint 的 shade 用）。
 * @param {object} r 色階。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @returns {(x: number, y: number) => string} 明暗函式。
 */
function lit(r, cx, cy, rx, ry) {
  // 把像素中心換成正規化座標後套用 tone。
  return (x, y) => tone(r, (x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
}

/**
 * 判斷像素中心是否在多邊形內（射線交叉法）。
 * @param {number[][]} pts 頂點。
 * @param {number} x x。
 * @param {number} y y。
 * @returns {boolean} 是否在內。
 */
function inPoly(pts, x, y) {
  const qx = x + 0.5;
  const qy = y + 0.5;
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[j];
    if (ay > qy !== by > qy && qx < ((bx - ax) * (qy - ay)) / (by - ay) + ax) c = !c;
  }
  return c;
}

/**
 * 細莖。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y 頂端 y。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
function stem(g, x, y, h, r) {
  rect(g, x - 1, y - 1, 3, h + 1, r.o);
  rect(g, x, y, 1, h, r.b);
}

/**
 * 一組細長的葉片或草莖（先畫全部外框再上色，重疊處會融成一叢）：底部 w 寬、上半變細，可彎曲。
 * 每片為 [x0, y0, x1, y1, w, bend, tip]：bend 為 x 方向的彎曲指數（1 為直線），tip 為葉尖色階（可省略）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {Array<Array<number | object>>} list 葉片清單。
 * @param {object} r 色階。
 * @param {number} [tipFrom=0.7] 葉尖色階從葉片的哪個比例開始。
 */
function blades(g, list, r, tipFrom = 0.7) {
  const pts = [];
  for (const [x0, y0, x1, y1, w = 1, bend = 1, tip = null] of list) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([Math.round(x0 + (x1 - x0) * t ** bend), Math.round(y0 + (y1 - y0) * t), t < 0.45 ? w : 1, t, tip]);
    }
  }
  for (const [x, y, w] of pts) {
    rect(g, x - 1, y, w + 2, 1, r.o);
    rect(g, x, y - 1, w, 3, r.o);
  }
  for (const [x, y, w, t, tip] of pts) {
    const c = tip && t >= tipFrom ? tip : r;
    px(g, x, y, t > 0.85 ? c.l : c.b);
    if (w > 1) px(g, x + 1, y, c.d);
    if (w > 2) px(g, x + 1, y, c.b);
    if (w > 2) px(g, x + w - 1, y, c.d);
  }
}

/**
 * 一片葉子（兩端尖、中段寬，受光的一側較亮，中央有葉脈）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 葉柄 x。
 * @param {number} y0 葉柄 y。
 * @param {number} x1 葉尖 x。
 * @param {number} y1 葉尖 y。
 * @param {number} wid 最寬處的半寬。
 * @param {object} r 色階。
 * @param {boolean} [vein=true] 是否畫葉脈。
 */
function leaf(g, x0, y0, x1, y1, wid, r, vein = true) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  const lightSide = uy - ux;
  /**
   * 像素相對葉軸的位置。
   * @param {number} x x。
   * @param {number} y y。
   * @returns {number[]} [沿葉軸比例 t, 垂直距離 d]。
   */
  const at = (x, y) => {
    const qx = x + 0.5 - x0;
    const qy = y + 0.5 - y0;
    return [(qx * ux + qy * uy) / len, -qx * uy + qy * ux];
  };
  const pad = Math.ceil(wid) + 1;
  paint(
    g, Math.min(x0, x1) - pad, Math.min(y0, y1) - pad, Math.max(x0, x1) + pad, Math.max(y0, y1) + pad,
    // 葉形：沿葉軸的半寬為正弦曲線（略偏向葉柄一端）。
    (x, y) => {
      const [t, d] = at(x, y);
      return t >= 0 && t <= 1 && Math.abs(d) <= wid * Math.sin(Math.PI * t ** 0.8) + 0.25;
    },
    // 葉脈用陰影色，受光側用亮面色，葉柄附近帶一點高光。
    (x, y) => {
      const [t, d] = at(x, y);
      if (vein && Math.abs(d) < 0.5 && t > 0.1 && t < 0.85) return r.d;
      if (d * lightSide > 0) return t > 0.25 && t < 0.5 && Math.abs(d) > wid * 0.5 ? r.h : r.l;
      return r.b;
    },
    r.o,
  );
}

/**
 * 十字閃光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} y 中心 y。
 * @param {number} len 臂長。
 * @param {string} c 顏色。
 * @param {string} core 內圈顏色。
 */
function sparkle(g, x, y, len, c, core) {
  rect(g, x - len, y, len * 2 + 1, 1, c);
  rect(g, x, y - len, 1, len * 2 + 1, c);
  if (len > 1) {
    px(g, x - 1, y, core);
    px(g, x + 1, y, core);
    px(g, x, y - 1, core);
    px(g, x, y + 1, core);
  }
  px(g, x, y, '#ffffff');
}

/**
 * 帶外框的像素點組（每點以十字外框描邊，再上色）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {Array<[number, number, string]>} pts 點（x、y、顏色）。
 * @param {string} o 外框顏色。
 */
function dots(g, pts, o) {
  for (const [x, y] of pts) {
    rect(g, x - 1, y, 3, 1, o);
    rect(g, x, y - 1, 1, 3, o);
  }
  for (const [x, y, c] of pts) px(g, x, y, c);
}

/**
 * 芒果果實：略斜的橢圓，黃橙色、受光的上半帶紅暈。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 短半徑。
 * @param {number} ry 長半徑。
 * @param {number} ang 傾斜角（弧度）。
 */
function mangoFruit(g, cx, cy, rx, ry, ang) {
  const yel = ramp('#f2b030');
  const red = ramp('#e8603a');
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  /**
   * 像素在果實座標系的正規化位置。
   * @param {number} x x。
   * @param {number} y y。
   * @returns {number[]} [u, v]。
   */
  const uv = (x, y) => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    return [(dx * c + dy * s) / rx, (-dx * s + dy * c) / ry];
  };
  const m = Math.ceil(Math.max(rx, ry)) + 1;
  paint(
    g, cx - m, cy - m, cx + m, cy + m,
    // 果實輪廓：下端略胖的橢圓。
    (x, y) => {
      const [u, v] = uv(x, y);
      return (u / (v > 0 ? 1.08 : 0.94)) ** 2 + v * v <= 1;
    },
    // 上半部（遠離果蒂的另一端除外）帶紅暈，其餘為黃橙色。
    (x, y) => {
      const nx = (x + 0.5 - cx) / Math.max(rx, ry);
      const ny = (y + 0.5 - cy) / Math.max(rx, ry);
      const blush = (nx - 0.35) ** 2 + (ny + 0.4) ** 2 < 0.55;
      return tone(blush ? red : yel, nx * 1.1, ny * 1.1);
    },
    red.o,
  );
}

/**
 * 果樹（同 apple 的結構）：stage 0 小樹苗，之後是樹幹與樹冠。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} stage 階段 0～2。
 * @param {object} lf 樹葉色階。
 * @param {number} seed 樹冠種子。
 * @returns {boolean} 是否已畫出樹冠（stage 0 回傳 false）。
 */
function fruitTree(g, stage, lf, seed) {
  soil(g);
  const wd = R.darkWood;
  if (stage === 0) {
    rect(g, 14, 26, 4, 9, wd.o);
    rect(g, 15, 26, 2, 8, wd.b);
    px(g, 15, 27, wd.l);
    foliage(g, 16, 24, 4, lf, seed);
    return false;
  }
  rect(g, 13, 18, 6, 19, wd.o);
  rect(g, 14, 18, 4, 18, wd.b);
  rect(g, 14, 18, 1, 18, wd.l);
  rect(g, 17, 18, 1, 18, wd.d);
  rect(g, 12, 35, 8, 1, wd.o);
  px(g, 15, 28, wd.d);
  px(g, 16, 31, wd.d);
  foliage(g, 16, 14, stage === 1 ? 9 : 13, lf, seed + 3);
  return true;
}

/**
 * 白色餐盤（淺藍色盤緣）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 */
function plate(g, cx, cy, rx, ry) {
  const w = R.white;
  const band = ramp('#8ab0d8');
  ellipse(g, cx, cy + 1, rx + 1, ry + 1, w.o);
  ellipse(g, cx, cy + 1, rx, ry, w.d);
  ellipse(g, cx, cy, rx, ry, w.b);
  ellipse(g, cx, cy, rx - 1, ry - 1, band.l);
  ellipse(g, cx, cy, rx - 2, ry - 1.5, w.l);
  ellipse(g, cx, cy + 0.5, rx - 4, ry - 2.5, w.b);
}

/**
 * 染料瓶：圓底燒瓶、軟木塞，瓶中裝著指定顏色的染料。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {string} hex 染料顏色。
 */
function dyeBottle(g, hex) {
  const liq = ramp(hex);
  const gl = ramp('#cfe4ee');
  const cork = R.lightWood;
  const o = mix(liq.o, gl.o, 0.4);
  // 軟木塞。
  rect(g, 12, 3, 8, 6, cork.o);
  rect(g, 13, 4, 6, 4, cork.b);
  rect(g, 13, 4, 6, 1, cork.l);
  rect(g, 18, 5, 1, 3, cork.d);
  px(g, 14, 6, cork.d);
  paint(
    g, 6, 8, 26, 30,
    // 瓶身：圓形瓶腹、細瓶頸與外翻的瓶口。
    (x, y) => {
      const dx = x + 0.5 - 16;
      if (y >= 8 && y <= 9) return Math.abs(dx) <= 4;
      if (y >= 10 && y <= 14) return Math.abs(dx) <= 3;
      return (dx / 9.5) ** 2 + ((y + 0.5 - 21) / 8.6) ** 2 <= 1;
    },
    // 液面以下是染料（左上亮、右下暗），以上是透明玻璃。
    (x, y) => {
      const nx = (x + 0.5 - 16) / 9.5;
      const ny = (y + 0.5 - 21) / 8.6;
      if (y <= 9) return y === 8 ? gl.h : gl.l;
      if (y < 17) return x < 15 ? gl.h : x > 17 && y > 13 ? gl.d : gl.b;
      if (y === 17) return x > 21 ? liq.b : liq.l;
      if (nx * nx + ny * ny > 0.62 && nx + ny > 0.2) return liq.d;
      if (nx < -0.25 && ny < 0.5) return liq.l;
      return liq.b;
    },
    o,
  );
  // 玻璃反光。
  rect(g, 10, 18, 1, 5, liq.h);
  px(g, 11, 17, liq.h);
  px(g, 10, 24, '#ffffff');
  px(g, 14, 11, '#ffffff');
  px(g, 14, 12, '#ffffff');
  rect(g, 20, 26, 2, 1, liq.l);
}

/**
 * 果汁杯：略收窄的玻璃杯、條紋吸管，杯中裝著指定顏色的果汁（杯緣裝飾由呼叫端另外畫）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {string} hex 果汁顏色。
 */
function juiceGlass(g, hex) {
  const liq = ramp(hex);
  const gl = ramp('#cfe4ee');
  // 吸管（杯口以上的部分；杯中的部分隱約透出）。
  for (let k = 0; k < 9; k++) {
    rect(g, 19 + Math.floor(k / 2) - 1, 9 - k - 1, 3, 3, R.red.o);
  }
  for (let k = 0; k < 9; k++) px(g, 19 + Math.floor(k / 2), 9 - k, k % 3 === 0 ? '#ffffff' : R.red.b);
  /**
   * 杯子在某列的半寬（上寬下窄）。
   * @param {number} y y。
   * @returns {number} 半寬。
   */
  const hw = (y) => 7.5 - ((y - 7) * 1.8) / 21;
  paint(
    g, 6, 7, 26, 28,
    // 杯形：上寬下窄的梯形。
    (x, y) => y >= 7 && y <= 28 && Math.abs(x + 0.5 - 16) <= hw(y),
    // 杯壁、厚杯底與果汁（左側亮、右側暗、液面有一道亮線）。
    (x, y) => {
      const dx = x + 0.5 - 16;
      const edge = hw(y) - Math.abs(dx);
      if (y >= 26) return y === 26 ? gl.l : gl.b;
      if (edge < 1) return dx < 0 ? gl.h : gl.d;
      if (y < 11) return dx < -3 ? gl.h : gl.l;
      if (y === 11) return liq.h;
      if (y === 12) return liq.l;
      if (dx < -3) return liq.l;
      if (dx > 3) return liq.d;
      return liq.b;
    },
    gl.o,
  );
  // 杯中的吸管與冰塊、玻璃反光。
  for (let y = 12; y < 25; y++) px(g, 18 - Math.floor((y - 12) / 7), y, mix(liq.b, R.red.l, 0.45));
  rect(g, 12, 15, 4, 3, mix(liq.l, '#ffffff', 0.45));
  rect(g, 12, 15, 4, 1, mix(liq.h, '#ffffff', 0.6));
  rect(g, 10, 13, 1, 9, '#ffffff');
  px(g, 10, 23, liq.h);
}

/**
 * 草藥束：數根莖在下方綁成一束，上方展開，每根莖頂端由 head 畫出花或葉。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {object} stalk 莖的色階。
 * @param {number[][]} tips 每根莖的頂端座標。
 * @param {(x: number, y: number, i: number) => void} head 畫莖頂的函式。
 * @param {object} [lf] 莖上小葉的色階（省略則不畫）。
 */
function herbBundle(g, stalk, tips, head, lf) {
  const list = tips.map(
    // 每根莖從綁繩處伸向頂端。
    ([x, y]) => [16, 24, x, y, 1, 1],
  );
  for (const x of [12, 14, 17, 19]) list.push([16, 24, x, 30, 1, 1]);
  blades(g, list, stalk);
  if (lf) {
    for (const [x, y, i] of [[11, 17, 0], [21, 16, 1], [13, 13, 2]]) {
      leaf(g, i === 1 ? x - 3 : x + 3, y + 2, x, y - 1, 1.6, lf, false);
    }
  }
  tips.forEach(
    // 依序畫每根莖頂端的花或葉。
    ([x, y], i) => head(x, y, i),
  );
  // 綁繩。
  const tw = ramp('#c89a5a');
  rect(g, 12, 22, 9, 5, tw.o);
  rect(g, 13, 23, 7, 3, tw.b);
  rect(g, 13, 23, 7, 1, tw.l);
  px(g, 15, 25, tw.d);
  px(g, 18, 25, tw.d);
}

/** 作物的繪製（每個階段 32 × 40，格式同 CROP_ART）。 */
export const CROPS = {
  /**
   * 牧草：三叢彎曲的草莖，逐漸長高轉綠；成熟時草尖帶金黃色。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  hay(g, stage) {
    soil(g);
    const h = [6, 13, 21][stage];
    const back = ramp(stage === 0 ? '#6aa848' : '#3e8a38');
    const front = ramp(stage === 0 ? '#7ab850' : '#58a640');
    const tip = stage === 2 ? ramp('#dcb848') : null;
    for (const [cx, by, s, r] of [[16, 31, 1, back], [9, 36, 0.82, front], [23, 36, 0.86, front]]) {
      const hh = Math.round(h * s);
      const spread = 1 + h / 8;
      const list = [-2, -1, 0, 1, 2].map(
        // 每片草莖：往兩側彎出，越外側越矮。
        (k) => [cx + (k > 0 ? 1 : 0), by, cx + Math.round(k * spread), by - Math.round(hh * (1 - Math.abs(k) * 0.12)), 2, 1.8, tip],
      );
      blades(g, list, r, 0.84);
    }
    if (stage === 2) {
      // 少許成熟的穗粒。
      for (const [x, y] of [[13, 13], [19, 12], [7, 20], [26, 19]]) dots(g, [[x, y, R.gold.l], [x, y + 1, R.gold.b]], R.gold.o);
    }
  },
  /**
   * 鳳梨：灰綠色的尖葉蓮座；成熟時中央長出帶冠芽的金黃色鳳梨。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  pineapple(g, stage) {
    soil(g);
    const dark = ramp('#3e7a5a');
    const light = ramp('#5e9c66');
    const len = [6, 11, 13][stage];
    /**
     * 產生一圈從底部向外放射的尖葉。
     * @param {number} by 底部 y。
     * @param {number[]} angs 角度（度，0 為正上方）。
     * @param {number} l 長度。
     * @returns {number[][]} 葉片清單。
     */
    const ring = (by, angs, l) => angs.map(
      // 依角度算出葉尖位置。
      (a) => {
      const rad = (a * Math.PI) / 180;
        return [16 + Math.sign(a), by, Math.round(16 + Math.sin(rad) * l), Math.round(by - Math.cos(rad) * l), 2, 1];
      },
    );
    blades(g, ring(34, [-68, -46, -24, 24, 46, 68], len), dark);
    if (stage === 2) {
      // 鳳梨果實：菱格紋的金黃色橢圓與頂端冠芽。
      const fr = ramp('#e8a832');
      blades(g, [[16, 15, 16, 3, 2], [15, 15, 11, 6, 2], [17, 15, 21, 6, 2], [15, 16, 9, 10, 1], [17, 16, 23, 10, 1]], light);
      paint(
        g, 10, 14, 22, 30,
        // 果實輪廓。
        (x, y) => ((x + 0.5 - 16) / 5.6) ** 2 + ((y + 0.5 - 22) / 7.2) ** 2 <= 1,
        // 斜向格紋：格線用陰影色，格心偏亮，再疊上整體明暗。
        (x, y) => {
          const base = tone(fr, (x + 0.5 - 16) / 5.6, (y + 0.5 - 22) / 7.2);
          if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) return base === fr.d ? fr.o : fr.d;
          return base;
        },
        fr.o,
      );
      blades(g, ring(34, [-56, -18, 18, 56], 8), light);
      return;
    }
    blades(g, ring(34, [-36, -10, 10, 36], len * 0.85), light);
  },
  /**
   * 茶樹：圓潤的深綠茶叢（可重複採收）；成熟時樹叢頂端冒出嫩綠的新芽。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  tea(g, stage) {
    soil(g);
    const lf = ramp('#2e7a3e');
    const bud = ramp('#9ad850');
    const twig = ramp('#6a4a30');
    if (stage === 0) {
      stem(g, 16, 25, 9, twig);
      leaf(g, 16, 29, 10, 26, 2, lf);
      leaf(g, 16, 27, 22, 23, 2, lf);
      leaf(g, 16, 25, 16, 20, 1.5, bud, false);
      return;
    }
    const big = stage === 2;
    for (const x of [12, 20]) stem(g, x, 30, 6, twig);
    const blobs = big ? [[9, 27, 6.5], [23, 27, 6.5], [16, 26, 7], [12, 20, 6], [20, 19, 6.5]] : [[11, 29, 5], [21, 29, 5], [16, 25, 6]];
    blobs.forEach(
      // 由後往前疊上葉團。
      ([x, y, s], i) => foliage(g, x, y, s, lf, i * 5 + 2),
    );
    // 葉團表面的葉片輪廓（淺色短線）。
    for (let k = 0; k < 10; k++) {
      const x = 7 + Math.floor(hash(k, 3) * 18);
      const y = (big ? 16 : 23) + Math.floor(hash(k, 7) * (big ? 13 : 8));
      px(g, x, y, lf.l);
      px(g, x + 1, y + 1, lf.d);
    }
    if (!big) return;
    // 嫩芽：一心二葉，亮綠色。
    for (const [x, y] of [[9, 15], [15, 11], [21, 12], [26, 19], [5, 21], [18, 16]]) {
      dots(g, [[x, y - 2, bud.h], [x, y - 1, bud.l], [x - 1, y, bud.l], [x - 2, y - 1, bud.b], [x + 1, y, bud.b], [x + 2, y - 1, bud.d], [x, y, bud.b], [x, y + 1, bud.d]], bud.o);
    }
  },
  /**
   * 稻米：水田格；秧苗成排插在水中，長高後轉為金黃，成熟時稻穗沉甸甸地垂下。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  rice(g, stage) {
    soil(g);
    // 田裡的淺水：泥色水面、波紋與天光倒影。
    const wt = ramp('#5a8c96');
    rect(g, 3, 27, 26, 11, wt.b);
    rect(g, 3, 27, 26, 1, wt.d);
    rect(g, 3, 37, 26, 1, wt.d);
    for (const [x, y, w] of [[5, 30, 4], [19, 29, 5], [11, 34, 3], [22, 35, 4]]) rect(g, x, y, w, 1, wt.l);
    px(g, 6, 29, wt.h);
    px(g, 25, 33, wt.h);
    const green = ramp('#5aa83c');
    const ripe = ramp('#b8b040');
    if (stage === 0) {
      for (const [x, y] of [[8, 31], [16, 31], [24, 31], [8, 36], [16, 36], [24, 36]]) {
        rect(g, x - 2, y + 1, 5, 1, wt.l);
        blades(g, [[x, y, x - 2, y - 4, 1, 1.5], [x, y, x, y - 5, 1], [x, y, x + 2, y - 4, 1, 1.5]], green);
      }
      return;
    }
    const h = stage === 1 ? 12 : 17;
    const leafR = stage === 1 ? green : ripe;
    const grain = ramp('#e8c450');
    for (const [x, by, s] of [[9, 31, 0.9], [23, 31, 0.9], [16, 36, 1]]) {
      rect(g, x - 3, by + 1, 7, 1, wt.l);
      const hh = Math.round(h * s);
      blades(g, [[x, by, x - 4, by - hh + 3, 1, 1.6], [x, by, x - 1, by - hh, 1], [x, by, x + 1, by - hh + 1, 1], [x, by, x + 4, by - hh + 4, 1, 1.6]], leafR);
      if (stage !== 2) continue;
      // 稻穗：從莖頂往兩側彎垂的穀粒串。
      for (const side of [-1, 1]) {
        const tx = x + (side < 0 ? -1 : 1);
        const ty = by - hh + (side < 0 ? 0 : 1);
        const pts = [];
        for (let k = 0; k < 6; k++) pts.push([tx + side * Math.round(k * 0.8), ty + Math.round(k * k * 0.22), k % 2 ? grain.b : grain.l]);
        pts[0][2] = grain.h;
        dots(g, pts, grain.o);
        for (const [gx, gy] of pts.slice(1, 5)) px(g, gx - side, gy + 1, grain.d);
      }
    }
  },
  /**
   * 芒果樹：深綠樹冠；成長中開出黃色小花穗，成熟時垂掛紅黃色的芒果。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  mango(g, stage) {
    const lf = ramp('#2e7a3a');
    if (!fruitTree(g, stage, lf, 6)) return;
    if (stage === 1) {
      for (const [x, y] of [[11, 10], [19, 8], [21, 15], [13, 16], [16, 12]]) {
        dots(g, [[x, y - 1, '#fff2a0'], [x - 1, y, R.gold.l], [x + 1, y, R.gold.l], [x, y, R.gold.b], [x, y + 1, R.gold.d]], R.gold.o);
      }
      return;
    }
    for (const [x, y, a] of [[9, 14, 0.3], [21, 10, -0.3], [23, 19, -0.2], [13, 21, 0.2], [17, 13, 0]]) {
      px(g, x, y - 4, lf.o);
      px(g, x, y - 5, lf.o);
      mangoFruit(g, x, y, 2.2, 3, a);
    }
  },
};

/** 物產、染料與料理圖示（32 × 32，格式同 ICON_ART）。 */
export const ICONS = {
  /** 繪製「蘋果」圖示。 */
  apple(g) {
    orb(g, 16, 19, 10, 9, R.red);
    // 頂部凹陷與果蒂、葉子。
    rect(g, 14, 10, 4, 1, R.red.o);
    px(g, 16, 11, R.red.d);
    rect(g, 15, 5, 3, 7, R.darkWood.o);
    rect(g, 16, 6, 1, 5, R.darkWood.b);
    leaf(g, 17, 8, 25, 5, 2.4, R.leaf);
    px(g, 21, 24, R.red.l);
  },
  /** 繪製「橘子」圖示。 */
  orange(g) {
    const r = ramp('#f08a24');
    orb(g, 16, 18, 10, 9.5, r);
    // 果皮上的細小油胞。
    for (let k = 0; k < 14; k++) {
      const x = 9 + Math.floor(hash(k, 2) * 15);
      const y = 12 + Math.floor(hash(k, 5) * 13);
      px(g, x, y, (x + y) < 26 ? r.b : r.d);
    }
    dots(g, [[16, 9, R.green.b], [15, 9, R.green.d], [17, 9, R.green.d], [16, 8, R.green.l]], R.green.o);
    leaf(g, 17, 8, 26, 4, 2.6, R.leaf);
  },
  /** 繪製「葡萄」圖示。 */
  grape(g) {
    const r = ramp('#7a3a9e');
    rect(g, 15, 3, 3, 6, R.darkWood.o);
    rect(g, 16, 4, 1, 5, R.darkWood.b);
    leaf(g, 17, 6, 25, 4, 2.6, R.leaf);
    for (const [y, xs] of [[11, [9, 15, 21]], [16, [12, 18, 24]], [16, [6]], [21, [9, 15, 21]], [26, [15]]]) {
      for (const x of xs) orb(g, x + 1, y, 3, 3, r);
    }
  },
  /** 繪製「紅草」圖示。 */
  redHerb(g) {
    const r = R.red;
    // 莖頂各開一團紅色小花。
    herbBundle(g, R.green, [[8, 9], [15, 5], [22, 7], [26, 14], [6, 16]], (x, y) => {
      for (const [dx, dy] of [[-1, 1], [1, 1], [0, -1]]) orb(g, x + dx, y + dy, 1.6, 1.6, r);
      px(g, x - 1, y - 1, r.h);
    }, R.leaf);
  },
  /** 繪製「藍草」圖示。 */
  blueHerb(g) {
    const fl = ramp('#5a6ae8');
    const st = ramp('#2e8a7a');
    // 莖頂是薰衣草般的藍色花穗。
    herbBundle(g, st, [[8, 10], [15, 6], [22, 8], [26, 15], [6, 17]], (x, y) => {
      const pts = [];
      for (let k = 0; k < 6; k++) pts.push([x + (k % 2 ? 1 : 0), y + k, k < 2 ? fl.l : k % 2 ? fl.d : fl.b], [x + (k % 2 ? 0 : 1), y + k, k < 2 ? fl.h : fl.b]);
      dots(g, pts, fl.o);
    }, ramp('#46a894'));
  },
  /** 繪製「解毒草」圖示。 */
  antidote(g) {
    const lf = ramp('#7ab83e');
    const st = ramp('#5e9a32');
    // 莖頂是寬大的黃綠色葉片。
    herbBundle(g, st, [[7, 10], [14, 4], [21, 5], [27, 11]], (x, y) => {
      leaf(g, 16 + Math.round((x - 16) * 0.45), 17, x, y, 3, lf);
    });
  },
  /** 繪製「星光花」圖示。 */
  starflower(g) {
    const lf = ramp('#3e9a6a');
    stem(g, 16, 22, 9, lf);
    leaf(g, 16, 29, 9, 24, 2, lf);
    leaf(g, 16, 27, 23, 22, 2, lf);
    const p = ramp('#f6d860');
    /**
     * 五角星在某角度的半徑。
     * @param {number} a 角度（弧度）。
     * @returns {number} 半徑。
     */
    const starR = (a) => {
      const t = ((a + Math.PI / 2) / ((Math.PI * 2) / 5) + 10) % 1;
      const k = Math.abs(t - 0.5) * 2;
      return 10 * (0.42 + 0.58 * k * k);
    };
    paint(
      g, 5, 2, 27, 25,
      // 星形輪廓。
      (x, y) => {
        const dx = x + 0.5 - 16.5;
        const dy = y + 0.5 - 14;
        return Math.hypot(dx, dy) <= starR(Math.atan2(dy, dx));
      },
      // 中心發白，左上亮、右下暗。
      (x, y) => {
        const dx = x + 0.5 - 16.5;
        const dy = y + 0.5 - 14;
        if (Math.hypot(dx, dy) < 2.6) return '#fffbe8';
        if (dx + dy < -2.5) return p.l;
        if (dx + dy > 4) return p.d;
        return p.b;
      },
      p.o,
    );
    px(g, 16, 13, R.fire.b);
    px(g, 13, 10, '#ffffff');
    sparkle(g, 4, 5, 2, '#fff0a0', '#fffbe0');
    sparkle(g, 28, 20, 2, '#c8e0ff', '#ffffff');
    sparkle(g, 27, 4, 1, '#fff0a0', '#ffffff');
  },
  /** 繪製「棉花」圖示。 */
  cotton(g) {
    const tw = ramp('#7a5034');
    stem(g, 16, 25, 6, tw);
    blades(g, [[15, 21, 7, 25, 2], [16, 22, 16, 28, 2], [16, 21, 25, 25, 2]], tw);
    const w = R.white;
    for (const [x, y, s] of [[16, 10, 6], [9, 17, 5.5], [23, 17, 5.5], [16, 20, 6]]) orb(g, x, y, s, s * 0.92, w);
    for (const [x, y] of [[12, 13], [20, 13], [16, 16]]) px(g, x, y, w.d);
  },
  /** 繪製「牧草」圖示。 */
  hay(g) {
    const r = ramp('#d8b048');
    const green = ramp('#9ab848');
    /**
     * 草捆在某列的半寬（中間綁起處最窄）。
     * @param {number} y y。
     * @returns {number} 半寬。
     */
    const hw = (y) => 6 + Math.abs(y - 18) * 0.42;
    /**
     * 某欄草莖的末端起伏（上下兩端參差不齊）。
     * @param {number} x x。
     * @param {number} s 種子。
     * @returns {number} 起伏量。
     */
    const jag = (x, s) => Math.floor(hash(x, s) * 3);
    paint(
      g, 3, 3, 29, 30,
      // 束腰形的草捆，上下兩端參差。
      (x, y) => Math.abs(x + 0.5 - 16) <= hw(y) && y >= 4 + jag(x, 1) && y <= 29 - jag(x, 2),
      // 一根根直向的草莖：依欄位交錯亮暗，左亮右暗，夾雜少量青草。
      (x, y) => {
        const v = hash(x, 7);
        const c = v < 0.12 ? green : r;
        const dx = x + 0.5 - 16;
        if (dx > hw(y) - 2.5) return c.d;
        if (dx < -hw(y) + 2) return c.l;
        if (v > 0.75) return dx < 0 ? c.h : c.l;
        if (v > 0.3) return dx > 3 ? mix(c.b, c.d, 0.4) : c.b;
        return mix(c.b, c.d, 0.55);
      },
      r.o,
    );
    // 綁繩。
    const tie = R.red;
    rect(g, 8, 16, 17, 5, tie.o);
    rect(g, 9, 17, 15, 3, tie.b);
    rect(g, 9, 17, 15, 1, tie.l);
    rect(g, 22, 17, 2, 3, tie.d);
  },
  /** 繪製「鳳梨」圖示。 */
  pineapple(g) {
    const lf = ramp('#4e9a5a');
    blades(g, [[16, 12, 16, 1, 2], [15, 12, 10, 3, 2], [17, 12, 22, 3, 2], [14, 13, 7, 8, 2], [18, 13, 25, 8, 2]], lf);
    const fr = ramp('#e8a832');
    paint(
      g, 7, 11, 25, 30,
      // 果實輪廓。
      (x, y) => ((x + 0.5 - 16) / 8.4) ** 2 + ((y + 0.5 - 20.5) / 9.6) ** 2 <= 1,
      // 菱格紋與鱗目上的亮點，再疊上整體明暗。
      (x, y) => {
        const base = tone(fr, (x + 0.5 - 16) / 8.4, (y + 0.5 - 20.5) / 9.6);
        const a = (x + y) % 5;
        const b = (x - y + 50) % 5;
        if (a === 0 || b === 0) return base === fr.d || base === fr.b ? fr.d : fr.b;
        if (a === 2 && b === 2) return base === fr.d ? fr.b : fr.h;
        return base;
      },
      fr.o,
    );
    blades(g, [[15, 13, 12, 9, 1], [17, 13, 20, 9, 1]], ramp('#6ab866'));
  },
  /** 繪製「茶葉」圖示。 */
  tea(g) {
    const lf = ramp('#3e8a3a');
    const bud = ramp('#8ccc4a');
    blades(g, [[18, 29, 17, 12, 1]], ramp('#6a4a30'));
    leaf(g, 17, 25, 5, 17, 5, lf);
    leaf(g, 18, 21, 28, 11, 4.5, lf);
    leaf(g, 17, 16, 17, 2, 3, bud);
    // 葉緣細鋸齒。
    for (const [x, y] of [[7, 20], [10, 22], [26, 16], [23, 19]]) px(g, x, y, lf.o);
  },
  /** 繪製「稻米」圖示。 */
  rice(g) {
    const sack = ramp('#c8a46a');
    const rc = R.white;
    // 插在袋口的兩支稻穗（在袋子後面），穗頭往外垂。
    const grain = ramp('#e8c450');
    blades(g, [[12, 12, 9, 3, 1], [20, 12, 23, 2, 1]], ramp('#b8a040'));
    for (const [x, y, side] of [[9, 3, -1], [23, 2, 1]]) {
      const pts = [];
      for (let k = 0; k < 6; k++) pts.push([x + side * Math.round(k * 0.6), y + 1 + k, k % 2 ? grain.b : grain.l]);
      pts[0][2] = grain.h;
      dots(g, pts, grain.o);
    }
    paint(
      g, 4, 9, 28, 30,
      // 麻布袋：方中帶圓的袋身，袋口略收。
      (x, y) => {
        const nx = (x + 0.5 - 16) / 11.5;
        const ny = (y + 0.5 - 21) / 8.6;
        return y >= 11 && nx ** 4 + ny ** 4 <= 1;
      },
      // 左亮右暗、袋底陰影，加上麻布織紋。
      (x, y) => {
        const c = tone(sack, (x + 0.5 - 16) / 11.5, (y + 0.5 - 20) / 9);
        return (x + (y % 2) * 2) % 4 === 0 && c !== sack.h ? mix(c, sack.d, 0.5) : c;
      },
      sack.o,
    );
    // 袋口的白米堆。
    ellipse(g, 16, 12, 10, 4, sack.o);
    ellipse(g, 16, 12, 9, 3, rc.d);
    ellipse(g, 15, 11, 7, 2.5, rc.b);
    ellipse(g, 13, 10.5, 3, 1, rc.h);
    for (let k = 0; k < 8; k++) px(g, 9 + Math.floor(hash(k, 4) * 14), 10 + Math.floor(hash(k, 8) * 4), k % 2 ? rc.l : rc.d);
    // 袋口翻折邊與正面的紅色「米」字印。
    rect(g, 6, 14, 20, 1, sack.d);
    const mk = R.red;
    for (const [x, y] of [[16, 18], [16, 19], [16, 20], [16, 21], [16, 22], [16, 23], [13, 20], [14, 20], [15, 20], [17, 20], [18, 20], [19, 20], [14, 18], [18, 18], [14, 22], [13, 23], [18, 22], [19, 23], [15, 21], [17, 21]]) {
      px(g, x, y, mk.b);
    }
    px(g, 16, 18, mk.l);
  },
  /** 繪製「芒果」圖示。 */
  mango(g) {
    mangoFruit(g, 15, 18, 9.5, 11.5, -0.45);
    rect(g, 20, 5, 3, 4, R.darkWood.o);
    px(g, 21, 6, R.darkWood.b);
    px(g, 21, 7, R.darkWood.b);
    leaf(g, 22, 6, 29, 11, 2.4, R.leaf);
  },
  /** 繪製「雞蛋」圖示。 */
  egg(g) {
    /**
     * 畫一顆蛋（上窄下寬）。
     * @param {number} cx 中心 x。
     * @param {number} cy 中心 y。
     * @param {number} rx 水平半徑。
     * @param {number} ry 垂直半徑。
     * @param {object} r 色階。
     */
    const one = (cx, cy, rx, ry, r) => paint(
      g, cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1,
      // 蛋形：上半部較窄。
      (x, y) => {
        const ny = (y + 0.5 - cy) / ry;
        const k = ny < 0 ? 1 + ny * 0.24 : 1;
        return ((x + 0.5 - cx) / (rx * k)) ** 2 + ny * ny <= 1;
      },
      lit(r, cx, cy, rx, ry),
      r.o,
    );
    one(21, 15, 6, 8, ramp('#d8a070'));
    one(13, 19, 7.5, 9.5, ramp('#f4e6cc'));
  },
  /** 繪製「牛奶」圖示。 */
  milk(g) {
    const gl = ramp('#cfe4ee');
    const m = R.white;
    /**
     * 奶瓶在某列的半寬（瓶頸、瓶肩、瓶身）。
     * @param {number} y y。
     * @returns {number} 半寬（0 表示不在瓶上）。
     */
    const hw = (y) => {
      if (y < 7 || y > 29) return 0;
      if (y < 11) return 3.5;
      if (y < 15) return 3.5 + (y - 10) * 0.8;
      if (y > 28) return 6;
      return 7;
    };
    paint(
      g, 7, 7, 25, 29,
      // 奶瓶輪廓。
      (x, y) => Math.abs(x + 0.5 - 16) <= hw(y),
      // 瓶中的牛奶（左亮右暗），頂端一小段透明玻璃。
      (x, y) => {
        const dx = x + 0.5 - 16;
        if (y < 9) return dx < 0 ? gl.h : gl.l;
        if (dx > hw(y) - 1.5) return m.d;
        if (dx < -hw(y) + 2.5) return m.h;
        return y > 27 ? m.d : m.b;
      },
      gl.o,
    );
    // 紙蓋與綁線、藍色標籤。
    const cap = R.blue;
    rect(g, 11, 4, 10, 5, cap.o);
    rect(g, 12, 5, 8, 3, cap.b);
    rect(g, 12, 5, 8, 1, cap.l);
    rect(g, 11, 8, 10, 1, cap.d);
    rect(g, 9, 18, 14, 7, cap.o);
    rect(g, 10, 19, 12, 5, cap.b);
    rect(g, 10, 19, 12, 1, cap.l);
    rect(g, 13, 20, 6, 3, m.h);
    rect(g, 14, 21, 4, 1, cap.l);
    rect(g, 11, 12, 1, 5, '#ffffff');
  },
  /** 繪製「羊毛」圖示。 */
  wool(g) {
    const r = ramp('#eedcc4');
    // 拖出的一段毛線。
    blades(g, [[22, 24, 29, 29, 1, 2], [29, 29, 26, 30, 1]], r);
    orb(g, 15.5, 16.5, 11, 10.5, r);
    /**
     * 是否在毛線球內（略內縮，纏繞線不碰到外框）。
     * @param {number} x x。
     * @param {number} y y。
     * @returns {boolean} 是否在內。
     */
    const inBall = (x, y) => ((x + 0.5 - 15.5) / 10) ** 2 + ((y + 0.5 - 16.5) / 9.5) ** 2 <= 1;
    // 兩組方向不同、略彎的纏繞線：左上一組斜向右下，右下一組斜向右上。
    for (const [ang, offs, upper] of [[0.6, [-7, -4, -1], true], [-0.9, [-1, 2, 5, 8], false]]) {
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      for (const off of offs) {
        for (let s = -12; s <= 12; s += 0.5) {
          const x = Math.round(15.5 - dy * off + dx * s - dy * s * s * 0.025);
          const y = Math.round(16.5 + dx * off + dy * s + dx * s * s * 0.025);
          const nx = (x + 0.5 - 15.5) / 11;
          const ny = (y + 0.5 - 16.5) / 10.5;
          if (!inBall(x, y) || (nx + ny < 0.15) !== upper) continue;
          px(g, x, y, nx + ny > 0.6 ? r.o : r.d);
          if (nx + ny < -0.3) px(g, x - 1, y - 1, r.h);
        }
      }
    }
  },
  /** 繪製「蜂蜜」圖示。 */
  honey(g) {
    const h = ramp('#e8981e');
    const gl = ramp('#cfe4ee');
    paint(
      g, 5, 9, 27, 29,
      // 圓胖的玻璃罐。
      (x, y) => {
        const nx = (x + 0.5 - 16) / 10.5;
        const ny = (y + 0.5 - 19.5) / 9.6;
        return y >= 10 && nx ** 4 + ny ** 2 <= 1;
      },
      // 罐中的蜂蜜：左亮右暗，頂端一道玻璃。
      (x, y) => {
        const nx = (x + 0.5 - 16) / 10.5;
        if (y < 12) return gl.l;
        if (y === 12) return h.l;
        if (nx > 0.62) return h.d;
        if (nx < -0.55) return h.l;
        return h.b;
      },
      h.o,
    );
    // 罐口的格紋布蓋與綁繩。
    const c1 = R.red;
    paint(
      g, 5, 3, 27, 11,
      // 布蓋輪廓：上方圓頂、下方張開的裙邊。
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 16);
        if (y < 4 || y > 11) return false;
        if (y < 8) return dx <= 6 + (y - 4) * 0.9;
        return dx <= 10 + (y - 8) * 0.4 && !(y === 11 && x % 3 === 0);
      },
      // 紅白格紋（右側偏暗）。
      (x, y) => {
        const red = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
        const dark = x > 21 || y > 9;
        if (red) return dark ? c1.d : c1.b;
        return dark ? R.cream.b : R.cream.h;
      },
      c1.o,
    );
    rect(g, 7, 9, 18, 2, R.darkWood.b);
    rect(g, 7, 9, 18, 1, R.darkWood.l);
    // 標籤（蜂巢圖樣）與玻璃反光、滴下的蜂蜜。
    rect(g, 10, 17, 12, 8, R.cream.o);
    rect(g, 11, 18, 10, 6, R.cream.l);
    for (const [x, y] of [[13, 19], [17, 19], [15, 21], [19, 21], [13, 22]]) {
      rect(g, x, y, 2, 2, h.b);
      px(g, x, y, h.l);
    }
    rect(g, 7, 15, 1, 6, h.h);
    rect(g, 25, 11, 2, 4, h.o);
    rect(g, 25, 11, 1, 3, h.l);
  },
  /** 繪製「獸肉」圖示。 */
  meat(g) {
    const bone = ramp('#ece4cc');
    // 骨頭：貫穿肉塊的斜棒與兩端的骨節。
    for (let k = 0; k < 20; k++) rect(g, 6 + k - 1, 25 - k - 1, 3, 3, bone.o);
    for (const [x, y] of [[4, 25], [6, 28], [25, 4], [28, 6]]) ellipse(g, x, y, 3.5, 3.5, bone.o);
    for (let k = 0; k < 20; k++) px(g, 6 + k, 25 - k, bone.b);
    for (const [x, y] of [[4, 25], [6, 28], [25, 4], [28, 6]]) {
      ellipse(g, x, y, 2.5, 2.5, bone.b);
      px(g, x - 1, y - 1, bone.h);
    }
    const m = ramp('#b84a36');
    const c = Math.cos(-Math.PI / 4);
    const s = Math.sin(-Math.PI / 4);
    /**
     * 像素在肉塊座標系的正規化位置（長軸沿骨頭方向）。
     * @param {number} x x。
     * @param {number} y y。
     * @returns {number[]} [u, v]。
     */
    const uv = (x, y) => {
      const dx = x + 0.5 - 15.5;
      const dy = y + 0.5 - 16.5;
      return [(dx * c + dy * s) / 10, (-dx * s + dy * c) / 8];
    };
    paint(
      g, 4, 5, 28, 28,
      // 肉塊輪廓：沿骨頭方向的橢圓。
      (x, y) => {
        const [u, v] = uv(x, y);
        return u * u + v * v <= 1;
      },
      // 外圈烤得較深，左上帶一道油亮的高光。
      (x, y) => {
        const nx = (x + 0.5 - 15.5) / 10;
        const ny = (y + 0.5 - 16.5) / 10;
        const [u, v] = uv(x, y);
        if (u * u + v * v > 0.8 && nx + ny > -0.2) return m.d;
        return tone(m, nx * 1.15, ny * 1.15);
      },
      m.o,
    );
    for (const [x, y] of [[13, 19], [17, 15], [19, 20]]) {
      rect(g, x, y, 3, 1, m.d);
    }
  },
  /** 繪製「紅色染料」圖示。 */
  dyeRed(g) {
    dyeBottle(g, '#d03a40');
  },
  /** 繪製「橙色染料」圖示。 */
  dyeOrange(g) {
    dyeBottle(g, '#f08a24');
  },
  /** 繪製「綠色染料」圖示。 */
  dyeGreen(g) {
    dyeBottle(g, '#3aa84a');
  },
  /** 繪製「藍色染料」圖示。 */
  dyeBlue(g) {
    dyeBottle(g, '#3a68d8');
  },
  /** 繪製「紫色染料」圖示。 */
  dyePurple(g) {
    dyeBottle(g, '#8a48c8');
  },
  /** 繪製「蘋果汁」圖示。 */
  appleJuice(g) {
    juiceGlass(g, '#f0c040');
    // 杯緣的蘋果切片。
    const r = R.red;
    ellipse(g, 9, 7, 5, 4, r.o);
    ellipse(g, 9, 7, 4, 3, r.b);
    ellipse(g, 9, 7.5, 3.4, 2.4, R.cream.l);
    px(g, 8, 7, R.darkWood.b);
    px(g, 10, 7, R.darkWood.b);
    px(g, 6, 5, r.l);
  },
  /** 繪製「橘子汁」圖示。 */
  orangeJuice(g) {
    juiceGlass(g, '#f88a1c');
    // 杯緣的橘子切片（果瓣放射）。
    const r = ramp('#f08a24');
    ellipse(g, 9, 7, 5, 5, r.o);
    ellipse(g, 9, 7, 4, 4, r.b);
    ellipse(g, 9, 7, 3, 3, r.h);
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0], [-1, -1], [1, 1]]) px(g, 9 + dx, 7 + dy, r.l);
    px(g, 9, 7, '#ffffff');
  },
  /** 繪製「葡萄汁」圖示。 */
  grapeJuice(g) {
    juiceGlass(g, '#7a2c8c');
    // 杯緣的一小串葡萄。
    const r = ramp('#8a4aae');
    for (const [x, y] of [[7, 5], [11, 5], [9, 8]]) orb(g, x, y, 2, 2, r);
    px(g, 9, 2, R.darkWood.b);
  },
  /** 繪製「蛋餅」圖示。 */
  omelette(g) {
    plate(g, 16, 21, 14, 8);
    const crust = ramp('#e2b878');
    const eggR = ramp('#f2cc3a');
    const sauce = ramp('#6a3a22');
    for (const [x, y] of [[10, 16], [22, 16], [16, 22]]) {
      // 一段蛋餅捲，切面朝上：側面一圈餅皮厚度，頂面是餅皮與蛋層捲成的螺旋。
      ellipse(g, x, y + 2, 6.5, 4.5, crust.o);
      ellipse(g, x, y + 2, 5.5, 3.5, crust.d);
      ellipse(g, x, y, 6.5, 4.5, crust.o);
      ellipse(g, x, y, 5.5, 3.5, crust.l);
      ellipse(g, x, y, 4.5, 2.6, eggR.b);
      ellipse(g, x, y, 3.3, 1.8, R.cream.l);
      ellipse(g, x, y, 2, 1, eggR.l);
      px(g, x, y, R.cream.h);
      px(g, x - 3, y - 2, crust.h);
      px(g, x + 4, y + 1, eggR.d);
      px(g, x + 3, y, eggR.d);
    }
    // 淋上的醬油膏與蔥花。
    for (let x = 6; x < 27; x++) {
      const y = 15 + Math.round(Math.sin(x * 0.7) * 1.5) + (x > 12 && x < 20 ? 6 : 0);
      px(g, x, y, sauce.b);
      if (x % 3 === 0) px(g, x, y + 1, sauce.d);
    }
    for (const [x, y] of [[8, 14], [20, 13], [24, 18], [14, 22], [18, 24]]) px(g, x, y, R.leaf.l);
  },
  /** 繪製「布丁」圖示。 */
  pudding(g) {
    plate(g, 16, 25, 13, 5);
    const cu = ramp('#f4d070');
    const ca = ramp('#8a4a1e');
    /**
     * 布丁在某列的半寬（上窄下寬）。
     * @param {number} y y。
     * @returns {number} 半寬。
     */
    const hw = (y) => 6 + ((y - 9) * 3.5) / 15;
    paint(
      g, 5, 9, 27, 25,
      // 梯形布丁，上緣兩角磨圓。
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 16);
        return y >= 9 && y <= 25 && dx <= hw(y) && !(y === 9 && dx > hw(y) - 1.5);
      },
      // 上方焦糖（往下流的幾道），下方卡士達；左亮右暗。
      (x, y) => {
        const dx = x + 0.5 - 16;
        const drip = { 11: 4, 14: 6, 18: 3, 20: 5 }[x] || 0;
        const r = y < 13 + drip ? ca : cu;
        if (y === 9) return r.l;
        if (dx > hw(y) - 2) return r.d;
        if (dx < -hw(y) + 2) return r.l;
        if (y === 25) return r.d;
        return r.b;
      },
      ca.o,
    );
    px(g, 12, 10, ca.h);
    px(g, 13, 10, ca.h);
    rect(g, 9, 17, 1, 5, cu.h);
    // 頂上的櫻桃。
    blades(g, [[17, 6, 20, 2, 1]], R.green);
    orb(g, 16, 7, 2, 2, R.red);
  },
  /** 繪製「起司」圖示。 */
  cheese(g) {
    const r = ramp('#f2c440');
    const rind = ramp('#e09a28');
    const top = [[3, 16], [24, 8], [29, 16]];
    const front = [[3, 16], [29, 16], [29, 27], [3, 24]];
    const side = [[24, 8], [29, 16], [29, 27], [26, 20]];
    paint(
      g, 3, 8, 29, 27,
      // 楔形起司：頂面三角形與正面梯形。
      (x, y) => inPoly(top, x, y) || inPoly(front, x, y) || inPoly(side, x, y),
      // 頂面最亮、正面基底、靠右變暗，頂面與正面交界一道高光。
      (x, y) => {
        if (inPoly(top, x, y)) return y >= 15 ? r.h : r.l;
        if (x >= 27) return rind.d;
        return x > 22 ? mix(r.b, r.d, 0.4) : r.b;
      },
      r.o,
    );
    // 孔洞。
    for (const [x, y, rx, ry] of [[9, 20, 2, 1.6], [17, 22, 2.5, 2], [23, 19, 1.5, 1.4], [12, 13, 1.6, 0.8], [20, 12, 1.2, 0.7], [6, 23, 1, 1]]) {
      ellipse(g, x, y, rx, ry, r.d);
      ellipse(g, x + 0.4, y + 0.4, rx * 0.6, ry * 0.6, r.o);
    }
  },
  /** 繪製「蜂蜜蛋糕」圖示。 */
  honeyCake(g) {
    const sp = ramp('#f2c860');
    const crust = ramp('#9a5626');
    const hn = ramp('#e8981e');
    block(g, 4, 9, 24, 7, 13, sp);
    // 頂面焦糖色外皮。
    rect(g, 4, 9, 24, 7, crust.b);
    rect(g, 4, 9, 24, 1, crust.l);
    rect(g, 5, 10, 6, 1, crust.h);
    rect(g, 4, 15, 24, 1, crust.d);
    // 蛋糕體的細孔與底部烘焙紙。
    for (let k = 0; k < 22; k++) px(g, 5 + Math.floor(hash(k, 1) * 21), 17 + Math.floor(hash(k, 6) * 7), k % 3 ? sp.l : sp.d);
    rect(g, 4, 25, 24, 3, R.cream.l);
    rect(g, 4, 27, 24, 1, R.cream.d);
    // 淋上的蜂蜜（在頂面與正面上緣往下滴）。
    rect(g, 7, 11, 17, 3, hn.o);
    rect(g, 8, 12, 15, 1, hn.b);
    rect(g, 9, 12, 5, 1, hn.h);
    for (const [x, l] of [[9, 4], [14, 6], [20, 3]]) {
      rect(g, x - 1, 13, 4, l + 1, hn.o);
      rect(g, x, 13, 2, l, hn.b);
      px(g, x, 13, hn.l);
    }
  },
  /** 繪製「燉肉」圖示。 */
  meatStew(g) {
    // 熱氣。
    g.globalAlpha = 0.55;
    for (const [x, ph] of [[11, 0], [17, 2], [22, 1]]) {
      for (let y = 2; y < 10; y++) px(g, x + Math.round(Math.sin((y + ph) * 0.9)), y, '#ffffff');
    }
    g.globalAlpha = 1;
    const bw = ramp('#4a72c0');
    paint(
      g, 2, 11, 30, 30,
      // 碗：上緣橢圓加上半圓碗身與碗腳。
      (x, y) => {
        const dx = x + 0.5 - 16;
        if (((dx / 14) ** 2 + ((y + 0.5 - 15) / 4) ** 2) <= 1) return true;
        if (y >= 15 && y <= 27) return (dx / 14) ** 2 + ((y + 0.5 - 15) / 12.5) ** 2 <= 1;
        return y >= 27 && y <= 29 && Math.abs(dx) <= 5;
      },
      // 碗身左亮右暗、下方陰影，碗口一道亮邊。
      (x, y) => {
        const dx = x + 0.5 - 16;
        if (y >= 28) return bw.d;
        if (dx > 7 || y > 24) return bw.d;
        if (dx < -8 && y > 15) return bw.l;
        return bw.b;
      },
      bw.o,
    );
    rect(g, 9, 22, 14, 1, bw.h);
    rect(g, 9, 21, 14, 1, bw.l);
    // 湯面與料：肉塊、紅蘿蔔、馬鈴薯、香草。
    const soup = ramp('#8a4a2a');
    ellipse(g, 16, 15, 12.5, 3.5, bw.l);
    ellipse(g, 16, 15, 11.5, 3, soup.b);
    ellipse(g, 14, 14.5, 8, 1.6, soup.l);
    const meatR = ramp('#7a3a22');
    for (const [x, y] of [[10, 14], [19, 15]]) orb(g, x, y, 2.5, 2, meatR);
    const car = ramp('#f07a28');
    for (const [x, y] of [[15, 13], [23, 14]]) {
      rect(g, x - 1, y - 1, 4, 4, car.o);
      rect(g, x, y, 2, 2, car.b);
      px(g, x, y, car.h);
    }
    orb(g, 14, 16, 1.6, 1.4, R.cream);
    for (const [x, y] of [[12, 12], [21, 13], [17, 17]]) px(g, x, y, R.leaf.l);
  },
  /** 繪製「飯糰」圖示。 */
  riceBall(g) {
    const rc = R.white;
    paint(
      g, 3, 4, 29, 29,
      // 圓角三角形：三角形與橢圓的交集。
      (x, y) => {
        const dx = Math.abs(x + 0.5 - 16);
        return y >= 4 && y <= 28 && dx <= (y + 0.5 - 3) * 0.6 && (dx / 13) ** 2 + ((y + 0.5 - 18) / 11.5) ** 2 <= 1;
      },
      // 白飯：整體明暗再加上米粒的細點。
      (x, y) => {
        const c = tone(rc, (x + 0.5 - 16) / 12, (y + 0.5 - 18) / 11);
        const v = hash(x, y, 3);
        if (v < 0.12) return c === rc.d ? rc.o : rc.d;
        if (v > 0.9 && c !== rc.d) return rc.h;
        return c;
      },
      rc.o,
    );
    // 海苔。
    const nori = ramp('#2e4436');
    rect(g, 10, 19, 12, 10, nori.o);
    rect(g, 11, 20, 10, 8, nori.b);
    rect(g, 11, 20, 10, 1, nori.l);
    rect(g, 19, 21, 2, 7, nori.d);
    rect(g, 12, 22, 1, 4, nori.l);
    px(g, 13, 21, nori.h);
  },
  /** 繪製「鳳梨酥」圖示。 */
  pineappleCake(g) {
    const ps = ramp('#d8963a');
    const fill = ramp('#e8a020');
    /**
     * 一塊烤得金黃的酥皮：頂面中央烤色較亮、四周較深，表面帶烘烤斑點。
     * @param {number} x 左上 x。
     * @param {number} y 左上 y。
     * @param {number} w 寬。
     * @param {number} top 頂面高。
     * @param {number} front 正面高。
     */
    const pastry = (x, y, w, top, front) => {
      block(g, x, y, w, top, front, ps);
      rect(g, x + 2, y + 1, w - 4, top - 2, ps.l);
      rect(g, x + 3, y + 1, Math.floor(w / 3), 1, ps.h);
      rect(g, x + 1, y + top - 1, w - 2, 1, mix(ps.l, ps.b, 0.5));
      for (let k = 0; k < w; k++) {
        if (hash(k, x) < 0.35) px(g, x + k, y + top + 1 + Math.floor(hash(x, k) * (front - 3)), ps.d);
        if (hash(k, y) < 0.25) px(g, x + 2 + Math.floor(hash(y, k) * (w - 4)), y + 1 + Math.floor(hash(k, 3) * (top - 2)), ps.l);
      }
    };
    // 後方完整的一塊。
    pastry(3, 6, 17, 6, 10);
    // 前方切開的一塊：正面露出鳳梨餡。
    pastry(13, 14, 16, 5, 11);
    rect(g, 15, 21, 12, 7, fill.o);
    rect(g, 16, 22, 10, 5, fill.b);
    rect(g, 16, 22, 10, 1, fill.l);
    for (const [x, y] of [[18, 24], [21, 23], [24, 25], [17, 26]]) rect(g, x, y, 2, 1, fill.d);
    px(g, 17, 22, fill.h);
  },
  /** 繪製「芒果冰」圖示。 */
  mangoIce(g) {
    const ice = ramp('#e8f2f8');
    const bw = R.white;
    // 刨冰堆。
    paint(
      g, 4, 4, 28, 21,
      // 圓頂的冰山。
      (x, y) => y <= 20 && ((x + 0.5 - 16) / 12) ** 2 + ((y + 0.5 - 20) / 15) ** 2 <= 1,
      // 冰的明暗與細碎冰晶。
      (x, y) => {
        const c = tone(ice, (x + 0.5 - 16) / 12, (y + 0.5 - 14) / 9);
        return hash(x, y, 9) < 0.1 ? ice.d : c;
      },
      mix(ice.o, '#6a8aa8', 0.3),
    );
    // 煉乳淋醬。
    const milk = ramp('#f8ecc0');
    for (let x = 8; x < 25; x++) px(g, x, 12 + Math.round(Math.sin(x * 0.8) * 1.5), milk.d);
    // 碗。
    paint(
      g, 3, 18, 29, 29,
      // 碗口與碗身。
      (x, y) => {
        const dx = x + 0.5 - 16;
        if (y >= 18 && y <= 26) return (dx / 13) ** 2 + ((y + 0.5 - 18) / 9) ** 2 <= 1;
        return y >= 26 && y <= 28 && Math.abs(dx) <= 5;
      },
      // 左亮右暗，下方陰影，碗口一圈藍線。
      (x, y) => {
        const dx = x + 0.5 - 16;
        if (y === 20) return R.blue.l;
        if (y >= 26 || dx > 8) return bw.d;
        if (dx < -8) return bw.h;
        return bw.b;
      },
      bw.o,
    );
    rect(g, 4, 18, 24, 1, bw.h);
    // 芒果丁。
    const mg = ramp('#f2a028');
    for (const [x, y] of [[14, 5], [9, 10], [16, 10], [22, 11], [12, 15], [19, 15]]) {
      rect(g, x - 1, y - 1, 5, 5, mg.o);
      rect(g, x, y, 3, 3, mg.b);
      rect(g, x, y, 2, 1, mg.l);
      px(g, x, y, mg.h);
      px(g, x + 2, y + 2, mg.d);
    }
  },
  /** 繪製「烏龍茶」圖示。 */
  oolongTea(g) {
    const cl = ramp('#9a5a3a');
    // 茶壺把手（後方）與壺嘴。
    paint(
      g, 18, 11, 27, 25,
      // 環形把手。
      (x, y) => {
        const d = Math.hypot((x + 0.5 - 21) / 5, (y + 0.5 - 17) / 5.5);
        return d <= 1 && d >= 0.55 && x >= 20;
      },
      // 左亮右暗。
      (x) => (x > 24 ? cl.d : cl.b),
      cl.o,
    );
    blades(g, [[8, 19, 2, 11, 2, 1.3]], cl);
    orb(g, 12, 18, 9, 7.5, cl);
    // 壺蓋與蓋鈕。
    orb(g, 12, 11, 5, 1.6, cl);
    orb(g, 12, 8, 1.6, 1.6, cl);
    rect(g, 6, 13, 12, 1, cl.d);
    // 前方的小茶杯與琥珀色茶湯。
    const cup = R.white;
    const tea = ramp('#c88a30');
    paint(
      g, 17, 19, 30, 30,
      // 杯身：上寬下窄。
      (x, y) => y >= 20 && y <= 29 && Math.abs(x + 0.5 - 24) <= 6 - (y - 20) * 0.25,
      // 杯口茶湯，杯身左亮右暗。
      (x, y) => {
        const dx = x + 0.5 - 24;
        if (y === 20) return cup.l;
        if (y === 21) return Math.abs(dx) < 4.5 ? (dx < -1 ? tea.l : tea.b) : cup.b;
        if (dx > 3) return cup.d;
        if (dx < -3.5) return cup.h;
        return y > 27 ? cup.d : cup.b;
      },
      cup.o,
    );
    rect(g, 21, 24, 6, 1, R.green.b);
    // 茶香熱氣。
    g.globalAlpha = 0.6;
    for (let y = 12; y < 19; y++) px(g, 25 + Math.round(Math.sin(y * 0.9)), y, '#ffffff');
    g.globalAlpha = 1;
  },
};
