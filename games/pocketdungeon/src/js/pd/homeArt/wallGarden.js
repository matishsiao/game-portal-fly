// 家園美術：牆飾與庭院造景（繪製規則見 homeDraw.js 開頭說明，格式同 homeArt.js 的 HOME_ART）。
// 牆飾畫在 32 × 32 的牆面上（不畫地面投影，改在右下方畫一層淡淡的牆面投影）；庭院造景的草地由場景繪製。

import { R, ramp, mix, rect, px, hash, ellipse, orb, shadow, woodGrain, stoneGrain, weave, block, post } from '../homeDraw.js';

/** 本分組專用的色階。 */
const C = {
  skin: ramp('#f0c49a'),
  hair: ramp('#8a5230'),
  gown: ramp('#7a5ab8'),
  steel: ramp('#c4ccd8'),
  leather: ramp('#8a3a2e'),
  parch: ramp('#e6d29c'),
  land: ramp('#9cc06a'),
  pine: ramp('#3f8a4a'),
  rose: ramp('#e8688c'),
  blush: ramp('#f4a8c0'),
  burlap: ramp('#d4ac6c'),
  straw: ramp('#e6c45c'),
  denim: ramp('#4a6aa8'),
  plaster: ramp('#e8dcc0'),
  roof: ramp('#b04a3a'),
  shroom: ramp('#d84850'),
  stem: ramp('#eee0c6'),
  fence: ramp('#9a6a3c'),
  postWood: ramp('#7a5030'),
  mailBlue: ramp('#3e78b8'),
  koi: ramp('#f08a3a'),
  sparrow: ramp('#a8744c'),
  bird: ramp('#5a8ad8'),
  lily: ramp('#4e9a48'),
  paper: ramp('#f4ecd8'),
};

/** 牆面投影與暗色外框共用的深色。 */
const SH = '#1a1020';

/**
 * 判斷像素中心是否在橢圓內。
 * @param {number} x 像素 x。
 * @param {number} y 像素 y。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @returns {boolean} 是否在橢圓內。
 */
function inEll(x, y, cx, cy, rx, ry) {
  if (rx <= 0 || ry <= 0) return false;
  const nx = (x + 0.5 - cx) / rx;
  const ny = (y + 0.5 - cy) / ry;
  return nx * nx + ny * ny <= 1;
}

/**
 * 逐像素繪製：對範圍內每個像素呼叫 fn，回傳顏色就點上，回傳 null 則略過。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 左 x。
 * @param {number} y0 上 y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {(x: number, y: number) => (string | null)} fn 決定顏色的函式。
 */
function paint(g, x0, y0, w, h, fn) {
  for (let y = Math.floor(y0); y < y0 + h; y++) {
    for (let x = Math.floor(x0); x < x0 + w; x++) {
      const c = fn(x, y);
      if (c) px(g, x, y, c);
    }
  }
}

/**
 * 以像素畫線段（兩端點含在內）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 起點 x。
 * @param {number} y0 起點 y。
 * @param {number} x1 終點 x。
 * @param {number} y1 終點 y。
 * @param {string} c 顏色。
 */
function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= n; k++) px(g, Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), c);
}

/**
 * 依字元圖案點像素（pal 把字元對應到顏色，未對應的字元為透明）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左上 x。
 * @param {number} y 左上 y。
 * @param {string[]} rows 每列的字元圖案。
 * @param {Object<string, string>} pal 調色盤。
 */
function sprite(g, x, y, rows, pal) {
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      const c = pal[rows[j][i]];
      if (c) px(g, x + i, y + j, c);
    }
  }
}

/**
 * 柔和的光暈（多層半透明同心橢圓）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rad 半徑。
 * @param {string} c 光的顏色。
 */
function glow(g, cx, cy, rad, c) {
  for (const [k, a] of [[1, 0.06], [0.78, 0.08], [0.56, 0.1], [0.36, 0.14]]) {
    g.globalAlpha = a;
    ellipse(g, cx, cy, rad * k, rad * k * 0.9, c);
  }
  g.globalAlpha = 1;
}

/**
 * 掛在牆上的物件投在牆面的影子（向右下偏移的淡色矩形）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 */
function wallDrop(g, x, y, w, h) {
  g.globalAlpha = 0.2;
  rect(g, x + 1, y + 2, w, h, SH);
  g.globalAlpha = 1;
}

/**
 * 掛在牆上的圓形物件投在牆面的影子。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 */
function wallDropOval(g, cx, cy, rx, ry) {
  g.globalAlpha = 0.2;
  ellipse(g, cx + 1, cy + 2, rx, ry, SH);
  g.globalAlpha = 1;
}

/**
 * 逐像素明暗的立體橢圓：外框、左上亮、右下暗（可用 yMax 截掉下半部，畫圓頂）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {object} r 色階。
 * @param {number} [yMax=Infinity] 只畫到這一列（含）。
 */
function shadeEll(g, cx, cy, rx, ry, r, yMax = Infinity) {
  // 逐像素決定外框或明暗。
  paint(g, cx - rx - 1, cy - ry - 1, rx * 2 + 3, ry * 2 + 3, function shadePixel(x, y) {
    if (y > yMax || !inEll(x, y, cx, cy, rx, ry)) return null;
    if (!inEll(x, y, cx, cy, rx - 1, ry - 1) || y === yMax) return r.o;
    const nx = (x + 0.5 - cx) / rx;
    const ny = (y + 0.5 - cy) / ry;
    const s = -(nx * 0.6 + ny * 0.8);
    if (s > 0.62) return r.h;
    if (s > 0.22) return r.l;
    if (s > -0.38) return r.b;
    return r.d;
  });
}

/**
 * 立體圓環（畫框、鐘框、舷窗框）：外緣外框、環身依角度明暗、內緣左上暗右下亮（表現內凹）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rxO 外圈水平半徑。
 * @param {number} ryO 外圈垂直半徑。
 * @param {number} rxI 內圈水平半徑。
 * @param {number} ryI 內圈垂直半徑。
 * @param {object} r 色階。
 */
function ringShade(g, cx, cy, rxO, ryO, rxI, ryI, r) {
  // 逐像素決定圓環的外框、環身與內緣顏色。
  paint(g, cx - rxO - 1, cy - ryO - 1, rxO * 2 + 3, ryO * 2 + 3, function ringPixel(x, y) {
    if (!inEll(x, y, cx, cy, rxO, ryO) || inEll(x, y, cx, cy, rxI, ryI)) return null;
    const nx = (x + 0.5 - cx) / rxO;
    const ny = (y + 0.5 - cy) / ryO;
    const n = Math.hypot(nx, ny) || 1;
    const s = -(nx * 0.6 + ny * 0.8) / n;
    if (!inEll(x, y, cx, cy, rxO - 1, ryO - 1)) return r.o;
    if (!inEll(x, y, cx, cy, rxI + 1, ryI + 1)) return s > 0 ? r.o : r.l;
    if (s > 0.7) return r.h;
    if (s > 0.25) return r.l;
    if (s > -0.4) return r.b;
    return r.d;
  });
}

/**
 * 方形畫框：外框、四邊斜面（上左亮、下右暗）、上緣高光與內緣刻線。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {number} t 框條粗細。
 * @param {object} r 色階。
 */
function frameRing(g, x, y, w, h, t, r) {
  rect(g, x, y, w, h, r.o);
  rect(g, x + 1, y + 1, w - 2, h - 2, r.b);
  rect(g, x + 1, y + 1, w - 2, t, r.l);
  rect(g, x + 1, y + 1, t, h - 2, r.l);
  rect(g, x + 1, y + h - 1 - t, w - 2, t, r.d);
  rect(g, x + w - 1 - t, y + 1, t, h - 2, r.d);
  rect(g, x + 1, y + 1, w - 3, 1, r.h);
  rect(g, x + 1 + t, y + 1 + t, w - 2 - 2 * t, h - 2 - 2 * t, r.o);
}

/**
 * 一把斜放的劍（劍尖朝上、劍柄朝下），用於交叉雙劍；同一函式也畫牆面投影。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 劍尖 x。
 * @param {number} y0 劍尖 y。
 * @param {number} dx 往下時 x 的方向（1 或 -1）。
 * @param {{blade: object, guard: object, grip: object, pommel: object}} p 各部位色階。
 */
function sword(g, x0, y0, dx, p) {
  // 劍身外框與劍身（兩像素寬的階梯，中間一道亮脊）。
  for (let k = 0; k <= 15; k++) rect(g, x0 + k * dx - 1, y0 + k - 1, 3, 3, p.blade.o);
  for (let k = 0; k <= 15; k++) {
    const x = x0 + k * dx;
    const y = y0 + k;
    px(g, x, y, k < 2 ? p.blade.h : p.blade.l);
    px(g, x + dx, y, k < 1 ? p.blade.l : p.blade.d);
    if (k > 1 && k < 14 && k % 4 === 1) px(g, x, y, p.blade.h);
  }
  // 握柄（纏皮）與護手。
  for (let k = 17; k <= 20; k++) rect(g, x0 + k * dx - 1, y0 + k - 1, 3, 3, p.grip.o);
  for (let k = 17; k <= 20; k++) {
    px(g, x0 + k * dx, y0 + k, k % 2 ? p.grip.l : p.grip.b);
    px(g, x0 + k * dx + dx, y0 + k, p.grip.d);
  }
  const gx = x0 + 16 * dx;
  const gy = y0 + 16;
  for (let j = -2; j <= 2; j++) rect(g, gx + j - 1, gy - j * dx - 1, 3, 3, p.guard.o);
  for (let j = -2; j <= 2; j++) {
    px(g, gx + j, gy - j * dx, j * dx < 0 ? p.guard.l : p.guard.b);
    px(g, gx + j, gy - j * dx + 1, p.guard.d);
  }
  px(g, gx, gy, p.guard.h);
  // 劍首圓球。
  orb(g, x0 + 22 * dx + 0.5, y0 + 22.5, 1.6, 1.6, p.pommel);
}

/**
 * 圓角石板（石板路用）：淡投影、外框、上左亮緣、下右暗緣、石紋與青苔。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 * @param {number} seed 種子。
 */
function slab(g, x, y, w, h, r, seed) {
  g.globalAlpha = 0.22;
  rect(g, x + 1, y + 2, w - 1, h - 1, SH);
  g.globalAlpha = 1;
  rect(g, x + 1, y, w - 2, h, r.o);
  rect(g, x, y + 1, w, h - 2, r.o);
  rect(g, x + 1, y + 1, w - 2, h - 2, r.b);
  stoneGrain(g, x + 2, y + 2, w - 4, h - 4, r, seed);
  rect(g, x + 2, y + 1, w - 4, 1, r.l);
  rect(g, x + 1, y + 2, 1, h - 4, r.l);
  px(g, x + 2, y + 2, r.h);
  rect(g, x + 2, y + h - 2, w - 3, 1, r.d);
  rect(g, x + w - 2, y + 2, 1, h - 4, r.d);
  if (h > 6) {
    for (let i = 0; i < 3; i++) px(g, x + 2 + Math.floor(hash(seed, i) * (w - 4)), y + h - 2, '#5a9a48');
  }
  const cx = x + 3 + Math.floor(hash(seed, 3) * (w - 7));
  const cy = y + 3 + Math.floor(hash(seed, 5) * (h - 6));
  if (w > 9 && h > 6) {
    px(g, cx, cy, r.d);
    px(g, cx + 1, cy + 1, r.d);
    px(g, cx + 2, cy + 1, r.d);
  }
}

/**
 * 一小片葉子（外框、陰影、基底、左上亮點），排成花圈或藤蔓用。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rad 半徑。
 * @param {object} r 色階。
 * @param {number} pass 繪製階段（0 外框、1 本體）。
 */
function leaf(g, cx, cy, rad, r, pass) {
  if (pass === 0) {
    ellipse(g, cx, cy, rad + 1, rad + 1, r.o);
    return;
  }
  ellipse(g, cx, cy, rad, rad, r.d);
  ellipse(g, cx - rad * 0.2, cy - rad * 0.25, rad * 0.75, rad * 0.7, r.b);
  px(g, cx - rad * 0.45, cy - rad * 0.5, r.l);
}

/**
 * 依「#」圖案畫一個有外框與明暗的小圖形（上左緣亮、下右緣暗、周圍一圈外框）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左上 x。
 * @param {number} y 左上 y。
 * @param {string[]} rows 圖案（# 為填色）。
 * @param {object} r 色階。
 */
function shape(g, x, y, rows, r) {
  /**
   * 判斷圖案中某格是否填色。
   * @param {number} i 欄。
   * @param {number} j 列。
   * @returns {boolean} 是否填色。
   */
  const on = (i, j) => j >= 0 && j < rows.length && rows[j][i] === '#';
  for (let j = -1; j <= rows.length; j++) {
    for (let i = -1; i <= rows[0].length; i++) {
      if (on(i, j)) continue;
      if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) px(g, x + i, y + j, r.o);
    }
  }
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      if (!on(i, j)) continue;
      let c = r.b;
      if (!on(i, j - 1) || !on(i - 1, j)) c = r.l;
      if (!on(i, j + 1) || !on(i + 1, j)) c = r.d;
      if (!on(i, j - 1) && !on(i - 1, j)) c = r.h;
      px(g, x + i, y + j, c);
    }
  }
}

/**
 * 一朵小玫瑰（外框、花瓣與螺旋花心）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {object} r 色階。
 */
function rose(g, cx, cy, r) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  sprite(g, x - 2, y - 2, [
    '.ooo.',
    'olhbo',
    'ohdbo',
    'obbdo',
    '.ooo.',
  ], { o: r.o, h: r.h, l: r.l, b: r.b, d: r.d });
}

/**
 * 小花（四瓣與花心），用於花圃與池塘。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} y 中心 y。
 * @param {object} r 花瓣色階。
 * @param {string} core 花心顏色。
 */
function flower(g, x, y, r, core) {
  sprite(g, x - 2, y - 2, [
    '.oo.',
    'olbo',
    'obdo',
    '.oo.',
  ], { o: r.o, l: r.l, b: r.b, d: r.d });
  sprite(g, x - 3, y - 3, [
    '..oo..',
    '.ollo.',
    'olXbbo',
    'ob.bdo',
    '.obdo.',
    '..oo..',
  ], { o: r.o, l: r.h, b: r.l, d: r.b, X: core });
  px(g, x - 1, y - 1, core);
}

/** 牆飾與庭院造景的繪製方式（代碼 → { size, up, frames?, draw }）。 */
export const ART = {
  // ── 牆飾 ──
  portrait: {
    size: [1, 1], up: 0,
    /**
     * 肖像畫：深色木框、金色內襯，畫中是笑咪咪、綁紅蝴蝶結的女孩。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      wallDrop(g, 4, 3, 24, 26);
      frameRing(g, 4, 3, 24, 26, 2, R.darkWood);
      // 畫布底色（上亮下暗的暈影）。
      paint(g, 8, 7, 16, 18, function portraitBg(x, y) {
        // 背景由左上的暖光漸暗到右下。
        const t = Math.min(1, Math.max(0, ((y - 7) / 18) * 0.7 + ((x - 8) / 16) * 0.3));
        return mix('#6a8a74', '#2e4440', t);
      });
      // 長髮（臉的後方）、肩膀與衣領。
      shadeEll(g, 16, 13.5, 6.5, 6.5, C.hair, 18);
      for (const x of [9, 21]) {
        rect(g, x, 14, 2, 8, C.hair.o);
        rect(g, x + (x < 16 ? 1 : 0), 14, 1, 7, x < 16 ? C.hair.l : C.hair.d);
      }
      shadeEll(g, 16, 25.5, 7.5, 4.5, C.gown, 24);
      sprite(g, 13, 21, ['ww..ww', '.wwww.', '..gg..'], { w: R.white.l, g: R.gold.l });
      rect(g, 15, 19, 2, 2, C.skin.d);
      // 臉、瀏海、眼睛、腮紅與微笑。
      shadeEll(g, 16, 14.5, 4.5, 5, C.skin);
      ellipse(g, 16, 10.5, 5, 2.5, C.hair.o);
      ellipse(g, 16, 11, 4.2, 2, C.hair.b);
      rect(g, 13, 10, 3, 1, C.hair.l);
      px(g, 13, 10, C.hair.h);
      px(g, 14, 14, '#2a1a24');
      px(g, 17, 14, '#2a1a24');
      px(g, 14, 13, C.skin.d);
      px(g, 17, 13, C.skin.d);
      g.globalAlpha = 0.7;
      px(g, 13, 16, '#f07888');
      px(g, 18, 16, '#f07888');
      g.globalAlpha = 1;
      sprite(g, 14, 16, ['m..m', '.mm.'], { m: '#a83a40' });
      // 紅色蝴蝶結。
      sprite(g, 19, 8, ['oo.oo', 'orooro', 'orRro', 'oo.oo'], { o: R.red.o, r: R.red.b, R: R.red.h });
      // 金色名牌。
      rect(g, 12, 26, 8, 2, R.gold.o);
      rect(g, 13, 26, 6, 1, R.gold.l);
    },
  },
  worldMap: {
    size: [2, 1], up: 0,
    /**
     * 世界地圖：上下木軸的羊皮紙掛軸，畫著海洋、三塊大陸、山脈、虛線航路、紅色叉叉與羅盤。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const p = C.parch;
      // 掛繩與釘子。
      line(g, 9, 4, 31, 1, R.darkWood.o);
      line(g, 55, 4, 32, 1, R.darkWood.o);
      rect(g, 31, 0, 2, 2, R.iron.l);
      wallDrop(g, 7, 6, 50, 21);
      // 羊皮紙（邊緣略暗、帶斑點與水漬）。
      rect(g, 8, 6, 48, 21, p.o);
      rect(g, 9, 7, 46, 19, p.b);
      // 紙面斑點與邊緣老化。
      paint(g, 9, 7, 46, 19, function parchPixel(x, y) {
        if (x === 9 || x === 54) return p.d;
        const v = hash(x, y, 41);
        if (v < 0.05) return p.d;
        if (v > 0.96) return p.l;
        return null;
      });
      g.globalAlpha = 0.25;
      ellipse(g, 47, 22, 5, 2, p.d);
      g.globalAlpha = 1;
      // 海洋、淺灘與陸地（逐像素判斷遮罩）。
      const conts = [[19, 14, 6, 4], [16, 18.5, 3.5, 3], [34, 13, 5, 3], [37, 18, 4, 3.5], [47, 18.5, 4.5, 3], [49, 13.5, 2.5, 2]];
      /**
       * 判斷像素是否落在大陸上（可外擴 d 像素）。
       * @param {number} x x。
       * @param {number} y y。
       * @param {number} d 外擴。
       * @returns {boolean} 是否在陸地。
       */
      const isLand = (x, y, d) => conts.some(([cx, cy, rx, ry]) => inEll(x, y, cx, cy, rx + d, ry + d));
      // 陸地外緣深綠、淺灘淺藍、海洋帶波紋。
      paint(g, 11, 9, 42, 15, function mapPixel(x, y) {
        if (isLand(x, y, 0)) {
          if (!isLand(x - 1, y, 0) || !isLand(x + 1, y, 0) || !isLand(x, y - 1, 0) || !isLand(x, y + 1, 0)) return C.land.o;
          if (hash(x, y, 7) < 0.12) return C.land.d;
          return y % 5 === 0 && x % 3 === 0 ? C.land.l : C.land.b;
        }
        if (isLand(x, y, 1.3)) return '#c4e2e4';
        if ((x + y * 3) % 11 === 0 && y % 3 === 1) return '#c4e2ec';
        return '#94c4d8';
      });
      rect(g, 11, 9, 42, 1, p.d);
      rect(g, 11, 23, 42, 1, p.l);
      // 沙漠、山脈與森林。
      ellipse(g, 36, 19, 2, 1.5, '#d8c078');
      for (const [x, y] of [[17, 14], [21, 13], [33, 13]]) sprite(g, x - 2, y - 1, ['..o..', '.olo.', 'olbdo'], { o: '#5a3e28', l: '#c8a070', b: '#a07850', d: '#7a5838' });
      for (const [x, y] of [[48, 18], [46, 19], [17, 19]]) px(g, x, y, C.pine.d);
      // 虛線航路與寶藏叉叉。
      for (let k = 0; k <= 18; k++) {
        if (k % 3 === 2) continue;
        const t = k / 18;
        px(g, Math.round(24 + t * 18), Math.round(19 + Math.sin(t * Math.PI) * 3), R.red.b);
      }
      sprite(g, 46, 17, ['o.o', '.o.', 'o.o'], { o: R.red.d });
      // 羅盤。
      sprite(g, 26, 9, ['..r..', '..w..', 'gwhwg', '..w..', '..g..'], { r: R.red.b, w: R.cream.l, h: R.gold.h, g: R.gold.d });
      // 上下木軸與金色軸頭。
      for (const y of [4, 25]) {
        rect(g, 6, y, 52, 3, R.darkWood.o);
        rect(g, 7, y + 1, 50, 1, R.darkWood.l);
        rect(g, 7, y + 2, 50, 1, R.darkWood.b);
        orb(g, 5.5, y + 1.5, 1.5, 1.5, R.gold);
        orb(g, 58.5, y + 1.5, 1.5, 1.5, R.gold);
      }
      rect(g, 9, 7, 46, 1, p.d);
    },
  },
  wallClock: {
    size: [1, 1], up: 0,
    /**
     * 掛鐘：圓形胡桃木框、黃銅內圈、奶油色錶面、刻度、十點十分的指針與紅色秒針。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      wallDropOval(g, 16.5, 15.5, 12, 12);
      ringShade(g, 16.5, 15.5, 12.5, 12.5, 8.5, 8.5, R.darkWood);
      // 錶面：外圈黃銅細邊，左上內緣有一圈淡陰影，表現凹在框內。
      paint(g, 8, 7, 18, 18, function facePixel(x, y) {
        if (!inEll(x, y, 16.5, 15.5, 8.5, 8.5)) return null;
        if (!inEll(x, y, 16.5, 15.5, 7.5, 7.5)) return x + y < 31 ? R.brass.l : R.brass.d;
        if (!inEll(x + 1, y + 1, 16.5, 15.5, 7.5, 7.5)) return R.cream.d;
        return inEll(x, y, 14.5, 13.5, 4, 4) ? R.cream.h : R.cream.l;
      });
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const x = 16 + Math.round(Math.sin(a) * 6);
        const y = 15 - Math.round(Math.cos(a) * 6);
        px(g, x, y, k % 3 === 0 ? R.black.b : R.cream.d);
        if (k % 3 === 0) px(g, x - Math.round(Math.sin(a)), y + Math.round(Math.cos(a)), R.black.l);
      }
      line(g, 16, 15, 12, 13, R.black.o);
      line(g, 16, 14, 13, 12, R.black.b);
      line(g, 16, 15, 20, 11, R.black.b);
      line(g, 16, 15, 16, 20, R.red.b);
      rect(g, 15, 14, 2, 2, R.brass.o);
      px(g, 15, 14, R.gold.h);
      // 刻在木框上的四顆黃銅鉚釘。
      for (const [x, y] of [[16, 4], [27, 15], [16, 26], [5, 15]]) {
        px(g, x, y, R.gold.h);
        px(g, x + 1, y, R.brass.d);
      }
    },
  },
  crest: {
    size: [1, 1], up: 0,
    /**
     * 盾牌徽章：金邊盾牌、紅藍四分盾面、金十字分隔、白色圓章上的金星與鉚釘。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      /**
       * 盾牌在某一列的半寬（上方平直、下方收成尖端）。
       * @param {number} y 列。
       * @returns {number} 半寬。
       */
      const hw = (y) => (y < 15 ? 10.5 : 10.5 * Math.sqrt(Math.max(0, 1 - ((y - 14.5) / 13) ** 2)));
      /**
       * 判斷像素是否在內縮 d 像素後的盾牌內。
       * @param {number} x x。
       * @param {number} y y。
       * @param {number} d 內縮。
       * @returns {boolean} 是否在盾內。
       */
      const inShield = (x, y, d) => y >= 3 + d && y <= 27 - d && Math.abs(x + 0.5 - 16) <= hw(y) - d;
      g.globalAlpha = 0.2;
      // 盾牌的牆面投影。
      paint(g, 4, 4, 26, 27, function dropPixel(x, y) {
        return inShield(x - 1, y - 2, 0) ? SH : null;
      });
      g.globalAlpha = 1;
      // 外框、金色盾緣、四分盾面（各自左上亮右下暗）。
      paint(g, 4, 2, 24, 27, function shieldPixel(x, y) {
        if (!inShield(x, y, 0)) return null;
        if (!inShield(x, y, 1)) return R.gold.o;
        if (!inShield(x, y, 2.5)) return y === 4 ? R.gold.h : x < 16 ? R.gold.l : R.gold.d;
        if (!inShield(x, y, 3.5)) return R.gold.o;
        if (x === 15 || x === 16 || y === 14) return x === 15 || y === 14 ? R.gold.l : R.gold.b;
        const r = (x < 16) === (y < 14) ? R.blue : R.red;
        const nx = (x + 0.5 - 16) / 10;
        const ny = (y + 0.5 - 15) / 12;
        const s = -(nx * 0.6 + ny * 0.8);
        if ((x + y) % 4 === 0 && hash(x, y, 2) < 0.5) return mix(r.b, r.d, 0.35);
        return s > 0.3 ? r.l : s > -0.35 ? r.b : r.d;
      });
      // 中央金星。
      shape(g, 11, 9, [
        '....#....',
        '...###...',
        '...###...',
        '#########',
        '.#######.',
        '..#####..',
        '..##.##..',
        '.##...##.',
      ], R.gold);
      // 鉚釘。
      for (const [x, y] of [[8, 6], [23, 6], [16, 25]]) {
        px(g, x, y, R.gold.h);
        px(g, x + 1, y + 1, R.gold.d);
      }
    },
  },
  crossedSwords: {
    size: [1, 1], up: 0,
    /**
     * 交叉雙劍：兩把劍尖朝上的鋼劍交叉，金色護手、皮革握柄與劍首，交叉處綁紅色緞帶。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const sh = ramp('#2a2030');
      const shadowPal = { blade: sh, guard: sh, grip: sh, pommel: sh };
      g.globalAlpha = 0.18;
      sword(g, 5, 4, 1, shadowPal);
      sword(g, 28, 4, -1, shadowPal);
      g.globalAlpha = 1;
      const pal = { blade: C.steel, guard: R.gold, grip: C.leather, pommel: R.gold };
      sword(g, 4, 2, 1, pal);
      sword(g, 27, 2, -1, pal);
      // 交叉處的紅色緞帶。
      sprite(g, 12, 11, [
        '.oo...oo.',
        'orro.orro',
        'orhrorrro',
        '.orrdrro.',
        '..oodoo..',
        '..odo.do.',
        '.odo..odo',
        '.oo....oo',
      ], { o: R.red.o, r: R.red.b, h: R.red.h, d: R.red.d });
    },
  },
  roundWindow: {
    size: [1, 1], up: 0,
    /**
     * 圓窗：舷窗般的圓形木框與黃銅螺栓，窗外藍天、白雲與綠色山丘，十字窗櫺與玻璃反光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      wallDropOval(g, 16.5, 15.5, 12.5, 12.5);
      ringShade(g, 16.5, 15.5, 12.5, 12.5, 8.5, 8.5, R.wood);
      // 窗外景色：上淺下深的天空、雲朵、遠山與草丘。
      paint(g, 7, 6, 20, 20, function skyPixel(x, y) {
        if (!inEll(x, y, 16.5, 15.5, 8.5, 8.5)) return null;
        if (y > 20 - Math.round(Math.sin((x - 6) * 0.5) * 1.5)) return y > 22 ? '#5a9a4a' : '#7cc068';
        if (y > 18 - Math.round(Math.cos((x - 4) * 0.35) * 2)) return '#8aa8c0';
        if (inEll(x, y, 12.5, 11.5, 3, 1.6) || inEll(x, y, 15, 10.5, 2.2, 1.6)) return y < 11 ? '#ffffff' : '#e4eef8';
        if (inEll(x, y, 21, 15.5, 2.5, 1.2)) return '#f0f6fc';
        return y < 12 ? '#b8e0f8' : '#94cdf2';
      });
      // 十字窗櫺（中間亮、兩側暗）。
      paint(g, 7, 6, 20, 20, function mullionPixel(x, y) {
        if (!inEll(x, y, 16.5, 15.5, 8.5, 8.5)) return null;
        if (x === 16 || y === 15) return R.wood.l;
        if (x === 17 || y === 16) return R.wood.d;
        return null;
      });
      g.globalAlpha = 0.7;
      for (let k = 0; k < 5; k++) {
        px(g, 10 + k, 13 - k, '#ffffff');
        px(g, 19 + k, 22 - k, '#ffffff');
      }
      g.globalAlpha = 1;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
        const x = Math.round(16 + Math.cos(a) * 10.5);
        const y = Math.round(15 + Math.sin(a) * 10.5);
        px(g, x, y, R.brass.l);
        px(g, x + 1, y + 1, R.brass.o);
      }
    },
  },
  curtain: {
    size: [1, 1], up: 0,
    /**
     * 窗簾：黃銅窗簾桿、扇貝形上簾、兩片以金色綁帶束起的紅色布簾，後方露出藍天窗景。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      // 後方的窗戶。
      wallDrop(g, 6, 6, 20, 21);
      rect(g, 6, 6, 20, 21, R.wood.o);
      rect(g, 7, 7, 18, 19, '#9ad2f4');
      rect(g, 7, 7, 18, 6, '#c0e4f8');
      ellipse(g, 15, 15, 3, 1.2, '#ffffff');
      rect(g, 15, 7, 2, 19, R.wood.b);
      rect(g, 7, 17, 18, 2, R.wood.b);
      rect(g, 15, 7, 1, 19, R.wood.l);
      // 兩片布簾（上寬、綁帶處收窄、下方散開；直向褶痕）。
      const r = R.red;
      for (const side of [0, 1]) {
        // 依列寬與褶痕位置決定布簾顏色。
        paint(g, 2, 8, 28, 21, function drapePixel(x, y) {
          const w = y <= 18 ? Math.round(9 - ((y - 8) / 10) * 5) : Math.round(4 + ((y - 18) / 9) * 6);
          const lx = side === 0 ? x - 4 : 27 - x;
          if (y > 27 || lx < -1 || lx > w) return null;
          if (lx === -1 || lx === w || y === 27) return r.o;
          const u = lx / w;
          if (y === 26) return r.d;
          if (u < 0.22) return y < 14 && side === 0 ? r.h : r.l;
          if (u < 0.42) return r.b;
          if (u < 0.58) return r.d;
          if (u < 0.8) return r.b;
          return r.d;
        });
      }
      // 金色綁帶。
      for (const x0 of [3, 23]) {
        rect(g, x0, 17, 6, 3, R.gold.o);
        rect(g, x0 + 1, 18, 4, 1, R.gold.l);
        px(g, x0 + 1, 18, R.gold.h);
      }
      // 扇貝形上簾與流蘇。
      paint(g, 3, 5, 26, 6, function valancePixel(x, y) {
        // 每 6 像素一個扇貝的下緣。
        const depth = Math.round(2.4 * Math.sin((Math.PI * ((x - 3) % 6)) / 6));
        const bottom = 7 + depth;
        if (y > bottom + 1) return null;
        if (y === bottom + 1) return r.o;
        if (y === bottom) return R.gold.b;
        return y === 5 ? r.l : r.b;
      });
      // 窗簾桿與兩端球飾。
      rect(g, 2, 3, 28, 3, R.brass.o);
      rect(g, 3, 4, 26, 1, R.brass.l);
      orb(g, 2.5, 4.5, 1.8, 1.8, R.gold);
      orb(g, 29.5, 4.5, 1.8, 1.8, R.gold);
    },
  },
  banner: {
    size: [1, 1], up: 0,
    /**
     * 旗幟：木桿掛著藍色燕尾旗，金邊、金色王冠徽紋（鑲紅寶石），兩端垂著金流蘇。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      /**
       * 判斷像素是否在旗面內（下方為燕尾缺口）。
       * @param {number} x x。
       * @param {number} y y。
       * @returns {boolean} 是否在旗面內。
       */
      const inFlag = (x, y) => x >= 8 && x <= 23 && y >= 5 && y <= 27 && !(y > 20 && Math.abs(x + 0.5 - 16) < (y - 20) * 1.15);
      g.globalAlpha = 0.2;
      // 旗面的牆面投影。
      paint(g, 8, 6, 18, 25, function flagDrop(x, y) {
        return inFlag(x - 1, y - 2) ? SH : null;
      });
      g.globalAlpha = 1;
      const r = R.blue;
      // 外框、金色鑲邊與帶波浪褶痕的藍色旗面。
      paint(g, 7, 5, 18, 24, function flagPixel(x, y) {
        if (!inFlag(x, y)) return null;
        if (!inFlag(x - 1, y) || !inFlag(x + 1, y) || !inFlag(x, y + 1)) return r.o;
        if (!inFlag(x - 2, y) || !inFlag(x + 2, y) || !inFlag(x, y + 2)) return x < 12 ? R.gold.l : R.gold.b;
        const fold = (x - 8) % 5;
        if (fold === 0) return r.l;
        if (fold === 3) return r.d;
        return x < 12 && y < 12 ? r.l : r.b;
      });
      weave(g, 11, 7, 10, 14, r);
      // 王冠徽紋。
      sprite(g, 11, 9, [
        'o...o...o',
        'oho.oho.o',
        'ohooohooo',
        'ohhbbbbbo',
        'ohrbRbrbo',
        'obbbbbbdo',
        'ooooooooo',
      ], { o: R.gold.o, h: R.gold.h, b: R.gold.b, d: R.gold.d, r: R.red.b, R: R.blue.h });
      sprite(g, 11, 9, ['h...h...h'], { h: R.gold.h });
      // 旗桿、球飾與流蘇。
      rect(g, 4, 3, 24, 3, R.darkWood.o);
      rect(g, 5, 4, 22, 1, R.darkWood.l);
      orb(g, 3.5, 4.5, 1.6, 1.6, R.gold);
      orb(g, 28.5, 4.5, 1.6, 1.6, R.gold);
      for (const x of [5, 26]) {
        rect(g, x, 6, 1, 4, R.gold.d);
        rect(g, x - 1, 10, 3, 4, R.gold.o);
        rect(g, x, 10, 1, 3, R.gold.l);
      }
    },
  },
  wreath: {
    size: [1, 1], up: 0,
    /**
     * 花圈：常綠葉片圍成的圓環，點綴紅莓果、松果與小白花，下方繫著紅色蝴蝶結。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      wallDropOval(g, 16.5, 15.5, 11, 11);
      const leaves = [];
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * Math.PI * 2;
        const rr = 8 + (k % 2 ? 1.2 : -0.6);
        leaves.push([16.5 + Math.cos(a) * rr, 15.5 + Math.sin(a) * rr, 2.6 + hash(k, 3) * 0.8]);
      }
      for (const [x, y, s] of leaves) leaf(g, x, y, s, C.pine, 0);
      for (const [x, y, s] of leaves) leaf(g, x, y, s, C.pine, 1);
      for (const [x, y] of leaves) if (x < 17 && y < 16) px(g, x - 1, y - 2, C.pine.h);
      // 松果、莓果與小白花。
      for (const a of [0.3, 2.4, 4.2]) {
        const x = Math.round(16 + Math.cos(a) * 8.5);
        const y = Math.round(15 + Math.sin(a) * 8.5);
        sprite(g, x - 1, y - 1, ['oo.', 'obo', 'odo', '.o.'], { o: '#4a2a18', b: '#a06a3a', d: '#7a4a28' });
      }
      for (let k = 0; k < 9; k++) {
        const a = (k / 9) * Math.PI * 2 + 0.9;
        const x = Math.round(16 + Math.cos(a) * 9);
        const y = Math.round(15 + Math.sin(a) * 9);
        rect(g, x, y, 2, 2, R.red.o);
        px(g, x, y, R.red.l);
        if (k % 3 === 1) sprite(g, x - 3, y - 4, ['.w.', 'wyw', '.w.'], { w: '#ffffff', y: R.gold.l });
      }
      // 紅色蝴蝶結。
      sprite(g, 10, 21, [
        '.ooo.....ooo.',
        'orhro...orrro',
        'orrrrooorrrdo',
        'orrrrdrdrrrdo',
        '.oddoooooddo.',
        '....odo.odo..',
        '...odo...odo.',
        '...oo.....oo.',
      ], { o: R.red.o, r: R.red.b, h: R.red.h, d: R.red.d });
    },
  },
  mirror: {
    size: [1, 1], up: 0,
    /**
     * 鏡子：橢圓形金色雕花框、頂端紅寶石與捲飾，鏡面由淺到深並有兩道斜向反光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      wallDropOval(g, 16.5, 15.5, 10, 12.5);
      ringShade(g, 16.5, 15.5, 10, 12.5, 7.5, 10, R.gold);
      // 鏡面：上亮下暗，兩道斜向反光，左上內緣淡陰影。
      paint(g, 8, 4, 18, 23, function mirrorPixel(x, y) {
        if (!inEll(x, y, 16.5, 15.5, 7.5, 10)) return null;
        if (!inEll(x + 1, y + 1, 16.5, 15.5, 7.5, 10)) return '#7a9cb0';
        const d = x + y;
        if (d >= 22 && d <= 24) return '#ffffff';
        if (d === 27) return '#eef8fc';
        if (d >= 36 && d <= 37) return '#e4f2f8';
        return mix('#d6eef8', '#86aec4', (y - 6) / 20);
      });
      // 頂端捲飾與紅寶石、兩側小金珠、底部垂飾。
      sprite(g, 12, 1, ['.oo.....oo.', 'olho...ohlo', '.oolooolooo'], { o: R.gold.o, l: R.gold.l, h: R.gold.h });
      orb(g, 16.5, 3.5, 1.8, 1.8, R.red);
      for (const x of [6, 27]) {
        px(g, x, 15, R.gold.h);
        px(g, x, 16, R.gold.d);
      }
      sprite(g, 15, 27, ['olo', '.o.'], { o: R.gold.o, l: R.gold.l });
    },
  },
  certificate: {
    size: [1, 1], up: 0,
    /**
     * 獎狀：細木框裡的奶油色獎狀紙，藍色雙線邊、紅色標題、內文、簽名與金色徽章緞帶。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      wallDrop(g, 5, 4, 22, 24);
      frameRing(g, 5, 4, 22, 24, 1, R.darkWood);
      rect(g, 8, 7, 16, 18, C.paper.l);
      weave(g, 8, 8, 16, 16, { ...C.paper, b: C.paper.l, d: C.paper.b });
      // 雙線邊框與四角花飾。
      for (const [d, c] of [[1, '#6a8ad0'], [2, '#b4c4e8']]) {
        rect(g, 8 + d, 7 + d, 16 - 2 * d, 1, c);
        rect(g, 8 + d, 24 - d, 16 - 2 * d, 1, c);
        rect(g, 8 + d, 7 + d, 1, 18 - 2 * d, c);
        rect(g, 23 - d, 7 + d, 1, 18 - 2 * d, c);
      }
      for (const [x, y] of [[9, 8], [22, 8], [9, 23], [22, 23]]) px(g, x, y, R.gold.b);
      // 標題、內文與簽名。
      rect(g, 12, 10, 8, 2, R.red.b);
      rect(g, 12, 10, 8, 1, R.red.l);
      for (const [y, w] of [[14, 12], [16, 12], [18, 8]]) for (let i = 0; i < w; i++) if (hash(i, y) > 0.18) px(g, 10 + i, y, '#8a8070');
      sprite(g, 10, 20, ['.o..o.', 'o.oo.o', '......', 'dddddd'], { o: '#2a3a7a', d: '#a49a88' });
      // 金色徽章與緞帶。
      rect(g, 18, 22, 2, 4, R.red.o);
      rect(g, 21, 22, 2, 4, R.red.o);
      px(g, 18, 22, R.red.b);
      px(g, 22, 22, R.red.b);
      shadeEll(g, 20.5, 20.5, 3, 3, R.gold);
      px(g, 20, 20, R.gold.h);
    },
  },
  wallSconce: {
    size: [1, 1], up: 0,
    /**
     * 壁燈：黃銅背板與燈座，玻璃燈罩裡點著蠟燭，四周暖黃色光暈。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      glow(g, 16, 11, 15, '#ffe6a0');
      // 背板（橢圓、雕花邊）。
      wallDropOval(g, 16.5, 20.5, 3.5, 6);
      shadeEll(g, 16.5, 20.5, 3.5, 6, R.brass);
      px(g, 16, 17, R.brass.o);
      px(g, 16, 23, R.brass.o);
      // 玻璃燈罩的背面、蠟燭與火焰。
      /**
       * 燈罩在某一列的半寬（鬱金香形）。
       * @param {number} y 列。
       * @returns {number} 半寬。
       */
      const hw = (y) => 3 + 2.2 * Math.sin((Math.PI * (y - 3)) / 15);
      g.globalAlpha = 0.35;
      // 燈罩玻璃底色。
      paint(g, 10, 4, 14, 14, function glassBack(x, y) {
        return Math.abs(x + 0.5 - 16.5) <= hw(y) ? '#fff4d0' : null;
      });
      g.globalAlpha = 1;
      rect(g, 14, 11, 5, 7, R.cream.o);
      rect(g, 15, 11, 3, 6, R.cream.l);
      px(g, 15, 11, R.cream.h);
      rect(g, 17, 12, 1, 5, R.cream.b);
      px(g, 16, 10, '#3a2a20');
      sprite(g, 15, 5, ['.y.', '.y.', 'yoy', 'ywy', '.y.'], { y: '#ffc848', o: '#fff0a0', w: '#ffffff' });
      // 燈罩輪廓與左側反光。
      paint(g, 10, 3, 14, 15, function glassEdge(x, y) {
        const d = Math.abs(x + 0.5 - 16.5);
        if (d > hw(y)) return null;
        if (d > hw(y) - 1) return '#c0d8e0';
        if (x === Math.round(16.5 - hw(y) + 1) && y > 5 && y < 14) return '#ffffff';
        return null;
      });
      rect(g, 12, 3, 9, 1, R.brass.d);
      // 燈座托盤。
      shadeEll(g, 16.5, 18, 5.5, 2, R.brass);
      rect(g, 11, 18, 11, 1, R.brass.o);
      px(g, 16, 20, R.brass.d);
    },
  },
  windChime: {
    size: [1, 1], up: 0, frames: 4,
    /**
     * 風鈴：透明玻璃鈴、上面畫著金魚，下方的舌與紙籤隨風擺動（4 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const s = [0, 1, 0, -1][f];
      // 釘子與吊繩。
      px(g, 16, 2, R.iron.l);
      px(g, 17, 3, R.iron.o);
      line(g, 16, 3, 16, 5, R.red.d);
      // 玻璃鈴（半透明圓頂）。
      g.globalAlpha = 0.18;
      ellipse(g, 17.5, 12.5, 6, 6, SH);
      g.globalAlpha = 0.8;
      // 玻璃鈴的邊緣、內部與左側反光。
      paint(g, 9, 5, 16, 9, function bellPixel(x, y) {
        if (y > 12 || !inEll(x, y, 16.5, 12, 6.5, 6.5)) return null;
        if (!inEll(x, y, 16.5, 12, 5.5, 5.5)) return '#6aa0bc';
        if (x === 12 && y > 8 && y < 12) return '#ffffff';
        return y < 8 ? '#e4f6fc' : '#c4e8f4';
      });
      g.globalAlpha = 1;
      rect(g, 10, 12, 13, 2, '#6aa0bc');
      rect(g, 11, 12, 11, 1, '#e4f6fc');
      // 鈴上的金魚。
      sprite(g, 11, 9, ['.rr..r', 'rrrrrr', 'yrrr.r'], { r: '#e84a3a', y: '#ffd060' });
      px(g, 12, 9, '#1a1020');
      sprite(g, 19, 9, ['.g', 'g.', '.g'], { g: '#4a9a6a' });
      px(g, 13, 7, '#ffffff');
      // 鈴舌、繩子與隨風擺動的紙籤。
      const bx = 16 + Math.round(s * 0.5);
      line(g, 16, 12, bx, 16, '#a03a30');
      rect(g, bx - 1, 15, 2, 2, '#6aa0bc');
      px(g, bx - 1, 15, '#ffffff');
      // 紙籤：越往下擺動越大，上方紅色帶、中段白色、下方水波紋。
      paint(g, 9, 17, 16, 12, function stripPixel(x, y) {
        const off = Math.round((s * (y - 17)) / 5);
        const lx = x - (14 + bx - 16 + off);
        if (y > 27 || lx < -1 || lx > 4) return null;
        if (lx === -1 || lx === 4 || y === 27) return C.paper.o;
        if (y < 19) return R.red.b;
        if (y === 23 || y === 25) return (lx + y) % 2 ? R.blue.l : R.blue.b;
        return lx === 0 ? C.paper.h : lx === 3 ? C.paper.d : C.paper.l;
      });
    },
  },

  // ── 庭院造景 ──
  woodFence: {
    size: [1, 1], up: 4,
    /**
     * 木籬笆：兩端尖頂木樁、兩道橫木與鐵釘；並排放置時橫木會接成一整條。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      g.globalAlpha = 0.18;
      rect(g, 0, H - 7, 32, 3, '#000000');
      g.globalAlpha = 1;
      const r = C.fence;
      for (const y of [12, 21]) {
        rect(g, 0, y, 32, 5, r.o);
        rect(g, 0, y + 1, 32, 1, r.l);
        rect(g, 0, y + 2, 32, 2, r.b);
        rect(g, 0, y + 3, 32, 1, r.d);
        woodGrain(g, 0, y + 1, 32, 3, r, y);
        for (const x of [6, 25]) {
          px(g, x, y + 2, R.iron.b);
          px(g, x, y + 1, R.iron.l);
        }
      }
      // 兩端木樁（尖頂、左亮右暗、木紋）。
      const p = C.postWood;
      for (const x of [1, 28]) {
        post(g, x, 7, 3, H - 13, p);
        rect(g, x - 1, 6, 5, 1, p.o);
        rect(g, x, 5, 3, 1, p.o);
        px(g, x + 1, 4, p.o);
        rect(g, x, 6, 3, 1, p.l);
        px(g, x + 1, 5, p.h);
        for (let y = 9; y < H - 7; y += 4) px(g, x + 1, y + (x % 2), p.d);
        rect(g, x, H - 8, 3, 1, p.d);
      }
      for (const [x, y] of [[4, H - 7], [27, H - 7]]) sprite(g, x, y - 2, ['.g.', 'gGg'], { g: '#3f8a3a', G: '#6ab84a' });
    },
  },
  whiteFence: {
    size: [1, 1], up: 6,
    /**
     * 白柵欄：四根尖頭白木條釘在兩道橫木上，每 8 像素一根，並排時間距一致。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      g.globalAlpha = 0.18;
      rect(g, 0, H - 7, 32, 3, '#000000');
      g.globalAlpha = 1;
      const w = R.white;
      // 後方兩道橫木。
      for (const y of [14, 25]) {
        rect(g, 0, y, 32, 4, w.o);
        rect(g, 0, y + 1, 32, 1, w.b);
        rect(g, 0, y + 2, 32, 1, w.d);
      }
      // 尖頭直條。
      for (let x0 = 3; x0 < 32; x0 += 8) {
        rect(g, x0 - 1, 8, 5, H - 14, w.o);
        rect(g, x0, 8, 3, H - 16, w.b);
        rect(g, x0, 8, 1, H - 16, w.h);
        rect(g, x0 + 2, 8, 1, H - 16, w.d);
        rect(g, x0, 7, 3, 1, w.o);
        px(g, x0 + 1, 6, w.o);
        px(g, x0 + 1, 7, w.h);
        rect(g, x0, 8, 2, 1, w.h);
        rect(g, x0, H - 9, 3, 1, mix(w.d, '#8a7a5a', 0.25));
        for (const y of [16, 27]) {
          px(g, x0 + 1, y, R.iron.l);
        }
      }
    },
  },
  flowerBed: {
    size: [1, 1], up: 8,
    /**
     * 花圃：木板圍成的花台與鬆軟泥土，種著紅色鬱金香、白色雛菊、藍色小花與黃花。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      block(g, 2, H - 17, 28, 6, 10, R.wood, 'wood', 4);
      // 泥土。
      rect(g, 4, H - 16, 24, 4, '#5a3a22');
      for (let i = 0; i < 24; i += 3) px(g, 4 + i, H - 15 + (i % 2), '#7a5434');
      // 葉叢與莖。
      for (const [x, y] of [[7, H - 17], [16, H - 18], [25, H - 17]]) {
        ellipse(g, x, y, 4, 2.5, R.leaf.o);
        ellipse(g, x, y, 3, 1.6, R.leaf.b);
        px(g, x - 2, y - 1, R.leaf.l);
      }
      const stems = [[6, 9], [11, 6], [16, 4], [21, 7], [26, 10], [9, 14], [23, 13]];
      for (const [x, y] of stems) {
        line(g, x, y + 2, x, H - 17, R.green.d);
        px(g, x + 1, y + 7, R.leaf.b);
      }
      // 花朵（鬱金香、雛菊、藍花、黃花）。
      const tulip = R.red;
      for (const [x, y] of [[11, 6], [21, 7]]) {
        sprite(g, x - 2, y - 2, ['o.o.o', 'ohbbo', 'olbdo', 'obbdo', '.ooo.'], { o: tulip.o, h: tulip.h, l: tulip.l, b: tulip.b, d: tulip.d });
      }
      flower(g, 16, 4, R.white, R.gold.b);
      flower(g, 6, 9, ramp('#6a8ae0'), '#ffffff');
      flower(g, 26, 10, R.gold, R.fire.d);
      flower(g, 9, 14, ramp('#e888c8'), R.gold.l);
      flower(g, 23, 13, R.white, R.gold.b);
    },
  },
  stonePath: {
    size: [1, 1], up: 0,
    /**
     * 石板路：平鋪在地上的五塊大小不一的圓角石板，縫隙露出草地，邊緣有青苔。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const warm = ramp(mix('#8a9098', '#a89478', 0.35));
      const cool = ramp('#8c949e');
      slab(g, 1, 1, 15, 12, R.stone, 1);
      slab(g, 17, 2, 14, 10, warm, 2);
      slab(g, 2, 15, 12, 15, warm, 3);
      slab(g, 15, 13, 15, 9, cool, 4);
      slab(g, 16, 23, 13, 8, R.stone, 5);
      for (const [x, y] of [[15, 6], [14, 30], [30, 22]]) {
        px(g, x, y, R.stone.l);
        px(g, x + 1, y, R.stone.d);
      }
    },
  },
  mailbox: {
    size: [1, 1], up: 14,
    /**
     * 信箱：木柱上的藍色拱頂信箱，門板有黃銅把手、側面立起紅色小旗，信封從門縫露出。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 14);
      // 木柱與底部小石。
      post(g, 14, 22, 4, H - 25, R.wood);
      woodGrain(g, 15, 24, 2, H - 28, R.wood, 3);
      rect(g, 13, H - 4, 6, 1, R.wood.o);
      rect(g, 11, 22, 10, 2, R.wood.o);
      rect(g, 12, 22, 8, 1, R.wood.l);
      // 箱身：圓頂長方形側面（上亮下暗）、左端門板與接縫。
      const b = C.mailBlue;
      rect(g, 6, 7, 21, 1, b.o);
      rect(g, 5, 8, 23, 14, b.o);
      rect(g, 6, 8, 21, 13, b.b);
      rect(g, 6, 8, 21, 1, b.h);
      rect(g, 6, 9, 21, 2, b.l);
      rect(g, 6, 19, 21, 2, b.d);
      rect(g, 26, 9, 1, 11, b.d);
      for (let x = 13; x < 26; x += 4) rect(g, x, 12, 1, 6, mix(b.b, b.d, 0.5));
      rect(g, 6, 8, 4, 13, b.l);
      rect(g, 6, 8, 4, 1, b.h);
      rect(g, 10, 8, 1, 13, b.o);
      rect(g, 6, 20, 4, 1, b.d);
      rect(g, 7, 14, 2, 2, R.brass.o);
      px(g, 7, 14, R.brass.h);
      px(g, 8, 15, R.brass.d);
      // 門縫露出的信封（白色、紅色郵票）。
      rect(g, 2, 11, 7, 5, '#6a5a50');
      rect(g, 3, 12, 5, 3, '#ffffff');
      px(g, 3, 12, '#c8c0b8');
      px(g, 4, 13, '#c8c0b8');
      px(g, 4, 12, R.red.b);
      rect(g, 9, 11, 1, 5, b.o);
      // 側面立起的紅色小旗。
      rect(g, 22, 3, 2, 15, R.iron.o);
      rect(g, 22, 4, 1, 13, R.iron.l);
      rect(g, 24, 3, 6, 5, R.red.o);
      rect(g, 24, 4, 5, 3, R.red.b);
      rect(g, 24, 4, 5, 1, R.red.l);
      orb(g, 22.5, 16.5, 1.4, 1.4, R.iron);
    },
  },
  scarecrowDecor: {
    size: [1, 1], up: 28,
    /**
     * 稻草人：麻布頭套上縫著笑臉與鈕扣眼、戴草帽，紅格紋襯衫、牛仔吊帶褲，袖口冒出稻草，手臂停著一隻小藍鳥。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 14);
      post(g, 15, 40, 3, H - 43, R.darkWood);
      rect(g, 14, H - 4, 5, 1, R.darkWood.o);
      /**
       * 紅格紋布的顏色（每 4 像素一道暗格線、交叉處更暗，偶有奶油色細線）。
       * @param {number} x x。
       * @param {number} y y。
       * @returns {string} 顏色。
       */
      const plaid = (x, y) => {
        const a = x % 4 === 0;
        const c = y % 4 === 1;
        if (a && c) return R.red.o;
        if (a || c) return R.red.d;
        if (x % 8 === 2 || y % 8 === 3) return R.red.l;
        return R.red.b;
      };
      // 袖子（橫跨兩側）與袖口稻草。
      rect(g, 3, 24, 26, 7, R.red.o);
      // 袖子格紋，下緣暗。
      paint(g, 4, 25, 24, 5, function sleevePixel(x, y) {
        return y === 29 ? R.red.d : plaid(x, y);
      });
      for (const [x, d] of [[3, -1], [28, 1]]) {
        for (let k = 0; k < 5; k++) line(g, x, 25 + k, x + d * (2 + (k % 3)), 24 + k * 1.5, k % 2 ? C.straw.b : C.straw.l);
      }
      // 上身、鈕扣與吊帶褲。
      rect(g, 9, 23, 15, 17, R.red.o);
      // 上身格紋，右側暗。
      paint(g, 10, 24, 13, 15, function shirtPixel(x, y) {
        return x === 22 ? R.red.d : plaid(x, y);
      });
      const d = C.denim;
      rect(g, 10, 32, 13, 12, d.o);
      rect(g, 11, 33, 11, 10, d.b);
      rect(g, 11, 33, 11, 1, d.l);
      rect(g, 21, 33, 1, 10, d.d);
      rect(g, 16, 38, 1, 5, d.o);
      for (const x of [11, 20]) rect(g, x, 23, 2, 10, d.b);
      for (const x of [11, 20]) px(g, x, 23, d.l);
      for (const x of [12, 20]) px(g, x, 33, R.gold.h);
      rect(g, 18, 35, 3, 3, R.gold.b);
      px(g, 18, 35, R.gold.h);
      px(g, 19, 36, R.gold.d);
      // 褲腳稻草。
      for (let k = 0; k < 9; k++) line(g, 12 + k, 43, 11 + k + (k % 3), 46 + (k % 2), k % 2 ? C.straw.b : C.straw.l);
      // 麻布頭、縫線笑臉、鈕扣眼與腮紅。
      shadeEll(g, 16.5, 17, 6.5, 6.5, C.burlap);
      for (let y = 12; y < 23; y += 3) for (let x = 11; x < 22; x += 3) if (inEll(x, y, 16.5, 17, 5.5, 5.5)) px(g, x, y, C.burlap.d);
      for (const x of [13, 18]) {
        rect(g, x, 15, 2, 2, '#2a1a24');
        px(g, x, 15, '#6a5a70');
      }
      g.globalAlpha = 0.6;
      rect(g, 11, 18, 2, 1, '#f07070');
      rect(g, 20, 18, 2, 1, '#f07070');
      g.globalAlpha = 1;
      sprite(g, 12, 18, ['m.......m', '.m.m.m.m.', '..m.m.m..'], { m: '#5a3420' });
      rect(g, 15, 22, 3, 2, C.straw.o);
      // 草帽（帽冠、紅色帽帶與小花、帽簷）與帽下稻草。
      for (const [x, y] of [[9, 13], [8, 14], [23, 13], [24, 14]]) line(g, x, y, x + (x < 16 ? -1 : 1), y + 3, C.straw.l);
      shadeEll(g, 16.5, 11.5, 11, 2.8, C.straw);
      rect(g, 11, 3, 11, 9, C.straw.o);
      rect(g, 12, 4, 9, 7, C.straw.b);
      rect(g, 12, 4, 9, 1, C.straw.l);
      rect(g, 12, 4, 2, 7, C.straw.l);
      rect(g, 20, 5, 1, 6, C.straw.d);
      for (let x = 13; x < 20; x += 2) px(g, x, 6, C.straw.d);
      rect(g, 12, 9, 9, 2, R.red.b);
      rect(g, 12, 9, 9, 1, R.red.l);
      sprite(g, 18, 8, ['.w.', 'wyw', '.w.'], { w: '#ffffff', y: R.gold.b });
      // 停在右手臂上的小藍鳥。
      orb(g, 25, 21.5, 2.5, 2, C.bird);
      orb(g, 27.5, 19, 1.6, 1.6, C.bird);
      px(g, 29, 19, R.fire.b);
      px(g, 28, 18, '#1a1020');
      px(g, 22, 21, C.bird.o);
      px(g, 23, 22, C.bird.d);
      px(g, 25, 24, R.fire.d);
    },
  },
  birdbath: {
    size: [1, 1], up: 12,
    /**
     * 鳥浴盆：石台座與雕紋石柱上托著淺石盆，盆中清水反光，一隻小麻雀停在盆緣。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const s = R.stone;
      shadow(g, 16, H - 2, 22);
      block(g, 8, H - 9, 16, 2, 4, s, 'stone', 2);
      // 石柱（直向凹槽）與柱頭。
      post(g, 13, 22, 6, H - 31, s);
      for (const x of [15, 17]) rect(g, x, 25, 1, H - 35, s.d);
      rect(g, 11, H - 12, 10, 2, s.o);
      rect(g, 12, H - 12, 8, 1, s.l);
      // 盆身底部（碗形）。
      shadeEll(g, 16.5, 18.5, 10, 5, s);
      // 盆緣、水面與反光。
      ellipse(g, 16.5, 15.5, 13.5, 4.5, s.o);
      ellipse(g, 16.5, 15.5, 12.5, 3.5, s.l);
      ellipse(g, 16.5, 16, 12, 3, s.b);
      ellipse(g, 16.5, 15.5, 10.5, 2.5, s.d);
      ellipse(g, 16.5, 16, 10, 2, R.water.b);
      rect(g, 9, 15, 6, 1, R.water.h);
      rect(g, 18, 17, 4, 1, R.water.l);
      stoneGrain(g, 4, 18, 25, 4, s, 9);
      px(g, 5, 14, s.h);
      // 停在盆緣的麻雀（面向水面）與水花。
      const b = C.sparrow;
      orb(g, 25.5, 11.5, 3, 2.2, b);
      orb(g, 22.5, 9.5, 1.8, 1.8, b);
      px(g, 20, 10, R.gold.d);
      px(g, 22, 9, '#1a1020');
      rect(g, 26, 12, 3, 1, b.d);
      line(g, 28, 11, 30, 9, b.o);
      px(g, 24, 14, b.o);
      px(g, 26, 14, b.o);
      px(g, 23, 12, R.cream.l);
      for (const [x, y] of [[18, 12], [16, 11]]) px(g, x, y, R.water.h);
    },
  },
  stoneLantern: {
    size: [1, 1], up: 24,
    /**
     * 石燈籠：日式台座、石柱、火袋（燈窗透出暖光）、四角上翹的石笠與寶珠，點綴青苔。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const s = R.stone;
      glow(g, 16, 22, 14, '#ffe6a0');
      shadow(g, 16, H - 2, 24);
      block(g, 6, H - 9, 20, 3, 5, s, 'stone', 1);
      post(g, 12, 32, 8, H - 41, s);
      stoneGrain(g, 13, 33, 6, H - 42, s, 4);
      block(g, 8, 28, 16, 2, 3, s, 'stone', 2);
      // 火袋與燈窗。
      block(g, 9, 16, 14, 1, 11, s, null);
      rect(g, 11, 18, 10, 8, s.o);
      rect(g, 12, 19, 8, 6, '#ffd870');
      rect(g, 13, 20, 6, 4, '#fff4c0');
      rect(g, 15, 19, 2, 6, s.d);
      px(g, 16, 22, '#ffffff');
      // 石笠（梯形、四角上翹）。
      for (let y = 7; y <= 14; y++) {
        const hw = Math.round(4 + (y - 7) * 1.45);
        rect(g, 16 - hw - 1, y, hw * 2 + 2, 1, s.o);
        if (y > 7) {
          rect(g, 16 - hw, y, hw, 1, y < 10 ? s.h : s.l);
          rect(g, 16, y, hw, 1, s.b);
          px(g, 16 + hw - 1, y, s.d);
        }
      }
      rect(g, 2, 15, 28, 2, s.o);
      rect(g, 3, 15, 26, 1, s.d);
      for (const x of [1, 30]) {
        rect(g, x, 12, 1, 4, s.o);
        px(g, x + (x < 16 ? 1 : -1), 13, s.l);
      }
      // 寶珠。
      orb(g, 16, 4.5, 2.5, 2.5, s);
      px(g, 15, 1, s.o);
      // 青苔。
      for (const [x, y] of [[8, 9 + 3], [22, 11], [7, H - 9], [24, H - 8], [13, 29]]) {
        px(g, x, y, '#5a9a48');
        px(g, x + 1, y, '#3f7a3a');
      }
    },
  },
  flowerArch: {
    size: [2, 1], up: 40,
    /**
     * 花拱門：兩側白色格柵立柱撐起半圓拱，綠藤纏繞、開滿粉紅與白色玫瑰，中間可走過。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = R.white;
      shadow(g, 8, H - 3, 12);
      shadow(g, 56, H - 3, 12);
      // 兩側格柵立柱（前後兩根柱，中間斜格）。
      for (const x0 of [3, 52]) {
        // 斜向交叉的格柵條。
        paint(g, x0 + 2, 32, 5, H - 37, function latticePixel(x, y) {
          const a = (x - x0 + y) % 5 === 0;
          const b = (y - (x - x0)) % 5 === 0;
          if (a || b) return a && b ? w.d : w.b;
          return null;
        });
        post(g, x0, 30, 2, H - 34, w);
        post(g, x0 + 7, 30, 2, H - 34, w);
        rect(g, x0 - 1, 30, 11, 2, w.o);
        rect(g, x0, 30, 9, 1, w.l);
      }
      // 半圓拱（放射狀板條）。
      paint(g, 2, 3, 60, 31, function archPixel(x, y) {
        // 拱的外框、板條與明暗。
        if (y > 31) return null;
        const o = inEll(x, y, 32, 32, 30, 28);
        const i = inEll(x, y, 32, 32, 22, 20);
        if (!o || i) return null;
        if (!inEll(x, y, 32, 32, 29, 27) || !inEll(x, y, 32, 32, 23, 21)) return w.o;
        const a = Math.atan2(y + 0.5 - 32, x + 0.5 - 32);
        if (Math.abs(((a * 180) / Math.PI) % 12) < 2.2) return w.d;
        if (inEll(x, y, 32, 32, 26.5, 24.5) && !inEll(x, y, 32, 32, 25.5, 23.5)) return w.d;
        return x < 32 ? w.l : w.b;
      });
      // 藤蔓葉片與玫瑰（沿拱與立柱分佈）。
      const pts = [];
      for (let k = 0; k <= 26; k++) {
        const a = Math.PI + (k / 26) * Math.PI;
        const rr = 26 + (hash(k, 1) - 0.5) * 6;
        pts.push([32 + Math.cos(a) * rr, 32 + Math.sin(a) * rr * 0.93]);
      }
      for (let y = 34; y < H - 6; y += 5) {
        pts.push([6 + hash(y, 2) * 5, y]);
        pts.push([55 + hash(y, 3) * 5, y]);
      }
      for (const [x, y] of pts) leaf(g, x, y, 2.4, R.leaf, 0);
      for (const [x, y] of pts) leaf(g, x, y, 2.4, R.leaf, 1);
      for (let k = 0; k < 10; k++) {
        const a = Math.PI + ((k + 0.5) / 10) * Math.PI;
        line(g, Math.round(32 + Math.cos(a) * 22), Math.round(32 + Math.sin(a) * 20), Math.round(32 + Math.cos(a) * 21), Math.round(32 + Math.sin(a) * 20) + 3 + (k % 3), R.leaf.d);
      }
      const pink = C.rose;
      const white = ramp('#f4eef0');
      pts.forEach(
        /**
         * 每隔幾片葉子開一朵玫瑰（粉紅與白交錯）。
         * @param {number[]} pt 位置。
         * @param {number} k 索引。
         */
        function bloom(pt, k) {
          if (k % 3 !== 1) return;
          rose(g, pt[0] + 1, pt[1], k % 2 ? pink : white);
        },
      );
    },
  },
  woodBridge: {
    size: [2, 1], up: 10,
    /**
     * 小木橋：拱形橋面鋪著橫向木板，後側沿弧線的扶手與立柱、前緣矮木樁，橋邊有深色橫樑。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const r = R.wood;
      const d = R.darkWood;
      /**
       * 橋面後緣在某一欄的 y（拱形）。
       * @param {number} x 欄。
       * @returns {number} y。
       */
      const yt = (x) => 21 - Math.round(10 * Math.sin((Math.PI * (x + 0.5)) / 64));
      g.globalAlpha = 0.16;
      ellipse(g, 32, H - 6, 31, 3, '#000000');
      g.globalAlpha = 1;
      const posts = [3, 18, 32, 46, 60];
      // 後扶手。
      for (const x of posts) {
        rect(g, x - 1, yt(x) - 8, 3, 9, d.o);
        rect(g, x, yt(x) - 7, 1, 8, d.b);
      }
      for (let x = 1; x < 63; x++) {
        const y = yt(x) - 9;
        rect(g, x, y, 1, 3, d.o);
        px(g, x, y + 1, x < 32 ? d.h : d.l);
      }
      // 橋面木板與側邊橫樑。
      for (let x = 0; x < 64; x++) {
        const y0 = yt(x);
        const seam = x % 5 === 4;
        const tone = hash(Math.floor(x / 5), 3) < 0.35 ? r.l : r.b;
        rect(g, x, y0 - 1, 1, 1, r.o);
        for (let y = y0; y < y0 + 10; y++) {
          let c = seam ? r.d : tone;
          if (y === y0) c = seam ? r.d : r.h;
          else if (y === y0 + 9) c = r.d;
          else if (!seam && hash(x, y, 5) < 0.08) c = r.d;
          px(g, x, y, c);
        }
        if (!seam && x % 5 === 1) px(g, x, y0 + 2, R.iron.b);
        rect(g, x, y0 + 10, 1, 1, d.o);
        rect(g, x, y0 + 11, 1, 1, d.l);
        rect(g, x, y0 + 12, 1, 2, d.b);
        rect(g, x, y0 + 14, 1, 1, d.o);
      }
      rect(g, 0, yt(0) - 1, 1, 16, r.o);
      rect(g, 63, yt(63) - 1, 1, 16, r.o);
      // 前緣的矮木樁（只露出頂端，不擋住橋面）。
      for (const x of posts) {
        rect(g, x - 1, yt(x) + 6, 3, 6, d.o);
        rect(g, x, yt(x) + 7, 1, 4, d.l);
        px(g, x, yt(x) + 7, d.h);
      }
    },
  },
  pond: {
    size: [2, 2], up: 4, frames: 4,
    /**
     * 池塘：圓石砌成的池岸、深淺不一的池水、蓮葉與粉紅睡蓮、小青蛙、香蒲，錦鯉游動與漣漪擴散（4 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const E = [[31, 39, 25, 18], [40, 32, 18, 13], [19, 47, 14, 11]];
      /**
       * 判斷像素是否在池形內（可外擴或內縮 d 像素）。
       * @param {number} x x。
       * @param {number} y y。
       * @param {number} d 外擴（負值為內縮）。
       * @returns {boolean} 是否在池形內。
       */
      const inPond = (x, y, d) => E.some(([cx, cy, rx, ry]) => inEll(x, y, cx, cy, rx + d, ry + d));
      g.globalAlpha = 0.18;
      ellipse(g, 32, 50, 31, 15, '#000000');
      g.globalAlpha = 1;
      const s = R.stone;
      const w = R.water;
      // 池水（深處較暗、靠上緣有池岸陰影、少量反光）與圓石池岸。
      paint(g, 0, 0, W, H, function pondPixel(x, y) {
        if (inPond(x, y, 0)) {
          if (!inPond(x, y - 2, 0)) return w.o;
          if (!inPond(x, y - 4, 0)) return w.d;
          if (inPond(x, y, -9)) return hash(x >> 2, y, 3) < 0.04 ? w.l : mix(w.b, w.d, 0.55);
          if (inPond(x, y, -4)) return mix(w.b, w.d, 0.25);
          return w.b;
        }
        if (inPond(x, y, 4.5)) {
          const off = Math.floor(y / 4) % 2 ? 2 : 0;
          const cx = Math.floor((x + off) / 5);
          const cy = Math.floor(y / 4);
          const lx = (x + off) % 5;
          const ly = y % 4;
          if (lx === 4 || ly === 3) return s.o;
          const v = hash(cx, cy, 8);
          const base = v < 0.3 ? s.d : v < 0.75 ? s.b : mix(s.b, '#a89478', 0.35);
          if (lx === 0 && ly === 0) return s.h;
          if (ly === 0 || lx === 0) return s.l;
          if (hash(cx, cy, 9) < 0.15 && ly === 2) return '#5a9a48';
          return base;
        }
        if (inPond(x, y, 5.5)) return s.o;
        return null;
      });
      // 錦鯉（依幀沿池中游動）。
      const path = [[36, 46], [30, 49], [24, 46], [30, 43]];
      const [kx, ky] = path[f];
      const dir = f === 0 || f === 3 ? 1 : -1;
      g.globalAlpha = 0.85;
      ellipse(g, kx, ky, 3.5, 1.6, C.koi.b);
      px(g, kx - 4 * dir, ky - 1, C.koi.b);
      px(g, kx - 4 * dir, ky + 1, C.koi.b);
      rect(g, kx - 1, ky - 1, 2, 1, '#ffffff');
      px(g, kx + 2 * dir, ky, '#1a1020');
      g.globalAlpha = 1;
      // 漣漪（兩處、依幀擴散）。
      for (const [cx, cy, ph] of [[44, 34, 0], [20, 48, 2]]) {
        const t = (f + ph) % 4;
        const rr = 2 + t * 2.2;
        g.globalAlpha = 0.75 - t * 0.17;
        for (let a = 0; a < 24; a++) {
          const x = Math.round(cx + Math.cos((a / 24) * Math.PI * 2) * rr);
          const y = Math.round(cy + Math.sin((a / 24) * Math.PI * 2) * rr * 0.45);
          if (inPond(x, y, -1)) px(g, x, y, w.h);
        }
        g.globalAlpha = 1;
      }
      // 反光橫紋。
      for (const [x, y, l] of [[22, 36, 5], [40, 44, 4], [33, 54, 6]]) rect(g, x, y, l, 1, w.l);
      // 蓮葉（帶缺口）。
      for (const [cx, cy, rx, ry, notch] of [[18, 40, 5, 3, 1], [44, 47, 6, 3.5, -1], [30, 31, 4, 2.5, 1], [50, 36, 3.5, 2, -1]]) {
        const L = C.lily;
        // 蓮葉外框、葉脈、缺口與明暗。
        paint(g, cx - rx - 1, cy - ry - 1, rx * 2 + 3, ry * 2 + 3, function padPixel(x, y) {
          if (!inEll(x, y, cx, cy, rx, ry)) return null;
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          if (dx * notch > 0 && Math.abs(dy) < Math.abs(dx) * 0.35 + 0.3) return null;
          if (!inEll(x, y, cx, cy, rx - 1, ry - 1)) return L.o;
          if (dx * notch > 0 && Math.abs(dy) < Math.abs(dx) * 0.35 + 1.1) return L.o;
          if (Math.round(dy) === 0 || Math.round(dx) === 0) return L.d;
          return dy < 0 && dx < 0 ? L.l : L.b;
        });
      }
      // 睡蓮花。
      sprite(g, 15, 35, [
        '..o.o..',
        '.ohoho.',
        'ohlylho',
        '.obbbo.',
        '..ooo..',
      ], { o: C.rose.o, h: '#ffffff', l: C.blush.l, y: R.gold.l, b: C.rose.b });
      // 蓮葉上的小青蛙。
      orb(g, 44, 45, 2.5, 2, R.green);
      px(g, 42, 43, '#ffffff');
      px(g, 45, 43, '#ffffff');
      px(g, 42, 44, '#1a1020');
      px(g, 45, 44, '#1a1020');
      px(g, 43, 46, R.green.o);
      // 左後方的香蒲。
      for (const [x, top] of [[8, 22], [11, 18], [14, 24]]) {
        line(g, x, top, x, top + 14, R.green.d);
        px(g, x - 1, top + 14, R.green.o);
        rect(g, x - 1, top + 2, 3, 5, '#4a2a18');
        rect(g, x, top + 3, 1, 3, '#8a5a34');
        px(g, x, top + 3, '#b07a4a');
      }
      line(g, 6, 34, 4, 26, R.leaf.b);
      line(g, 16, 35, 18, 28, R.leaf.b);
    },
  },
  windmill: {
    size: [1, 1], up: 36, frames: 4,
    /**
     * 風車：白灰泥塔身、拱形木門與小窗、紅色圓頂，四片格子帆布葉片轉動（4 幀共轉 90 度，循環無縫）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      shadow(g, 16, H - 2, 24);
      const p = C.plaster;
      // 塔身（上窄下寬、左亮右暗、石紋）。
      for (let y = 24; y < H - 3; y++) {
        const hw = Math.round(6 + ((y - 24) / (H - 27)) * 4);
        rect(g, 16 - hw - 1, y, hw * 2 + 2, 1, p.o);
        for (let x = 16 - hw; x < 16 + hw; x++) {
          const u = (x - (16 - hw)) / (hw * 2);
          let c = u < 0.2 ? p.l : u < 0.7 ? p.b : p.d;
          if (hash(x, y, 6) < 0.06) c = p.d;
          if (y % 9 === 0 && hash(x >> 2, y, 1) < 0.5) c = mix(c, p.d, 0.5);
          px(g, x, y, c);
        }
      }
      rect(g, 6, H - 4, 20, 1, p.o);
      // 拱形木門與小窗。
      sprite(g, 13, H - 14, [
        '.oooo.',
        'oddddo',
        'oblbdo',
        'oblbdo',
        'oblbdo',
        'oblbyo',
        'oblbdo',
        'oblbdo',
        'oblbdo',
        'oooooo',
      ], { o: R.darkWood.o, d: R.darkWood.d, b: R.darkWood.b, l: R.darkWood.l, y: R.gold.l });
      sprite(g, 14, 36, ['oooo', 'oblo', 'obbo', 'oooo'], { o: R.darkWood.o, b: '#5a7aa8', l: '#c0e0f8' });
      // 紅色圓頂與屋簷。
      shadeEll(g, 16, 25, 9, 12, C.roof, 25);
      for (let y = 16; y < 25; y += 3) {
        // 屋瓦橫紋。
        paint(g, 7, y, 18, 1, function shinglePixel(x, yy) {
          return inEll(x, yy, 16, 25, 8, 11) && (x + y) % 3 !== 0 ? C.roof.d : null;
        });
      }
      rect(g, 5, 24, 22, 3, R.darkWood.o);
      rect(g, 6, 25, 20, 1, R.darkWood.l);
      px(g, 15, 12, C.roof.o);
      px(g, 16, 12, C.roof.o);
      // 四片葉片（每片：木桿與一側的格子帆布）。
      const hx = 16;
      const hy = 21;
      const base = (f * Math.PI) / 8 + Math.PI / 4;
      // 對每片葉片求沿桿方向與垂直方向的座標，決定木桿、帆布、格子或外框。
      paint(g, 0, 3, W, 38, function bladePixel(x, y) {
        const dx = x + 0.5 - hx;
        const dy = y + 0.5 - hy;
        let edge = false;
        for (let k = 0; k < 4; k++) {
          const a = base + (k * Math.PI) / 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const u = dx * ca + dy * sa;
          const v = -dx * sa + dy * ca;
          if (u > -0.5 && u < 15.5 && Math.abs(v) < 0.8) return R.darkWood.b;
          if (u >= 4 && u <= 15 && v >= 0.8 && v <= 5) {
            if (v > 4 || u > 14.2 || (u - 4) % 2.7 < 0.9) return R.lightWood.b;
            return v < 2.2 ? R.cream.h : R.cream.l;
          }
          if ((u > -1.3 && u < 16.3 && Math.abs(v) < 1.6) || (u >= 3 && u <= 16 && v > 0 && v <= 6)) edge = true;
        }
        return edge ? R.darkWood.o : null;
      });
      orb(g, hx + 0.5, hy + 0.5, 2, 2, R.iron);
    },
  },
  mushroomLamp: {
    size: [1, 1], up: 14,
    /**
     * 蘑菇燈：紅底白點的大蘑菇傘、傘下發出暖黃光、菇柄上有小圓窗與小門，旁邊冒出一朵小蘑菇與螢火蟲。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      glow(g, 16, 22, 16, '#ffe2a0');
      shadow(g, 16, H - 2, 20);
      // 菇柄（下寬上窄）、圓窗與小門。
      const st = C.stem;
      for (let y = 19; y < H - 3; y++) {
        const hw = Math.round(4 + ((y - 19) / (H - 22)) * 2);
        rect(g, 16 - hw - 1, y, hw * 2 + 2, 1, st.o);
        rect(g, 16 - hw, y, hw * 2, 1, st.b);
        px(g, 16 - hw, y, st.h);
        rect(g, 16 - hw + 1, y, 2, 1, st.l);
        rect(g, 16 + hw - 2, y, 2, 1, st.d);
      }
      rect(g, 9, H - 4, 14, 1, st.o);
      ellipse(g, 16, 27.5, 2.5, 2.5, R.darkWood.o);
      ellipse(g, 16, 27.5, 1.6, 1.6, '#ffe070');
      px(g, 15, 27, '#ffffff');
      sprite(g, 14, H - 11, ['.oo.', 'obbo', 'obbo', 'obyo', 'obbo', 'oooo'], { o: R.darkWood.o, b: R.darkWood.b, y: R.gold.l });
      // 傘下發光的菌褶。
      ellipse(g, 16, 19.5, 12, 3, '#c89a50');
      ellipse(g, 16, 19.5, 11, 2, '#ffe8a0');
      for (let x = 7; x < 26; x += 2) px(g, x, 20, '#f0c070');
      rect(g, 13, 20, 6, 1, '#fff8d8');
      // 紅色蘑菇傘與白點。
      shadeEll(g, 16, 19, 14, 13, C.shroom, 19);
      for (const [x, y, rr] of [[10, 12, 2], [18, 9, 2.5], [24, 15, 1.6], [6, 17, 1.4], [14, 16, 1.5]]) {
        ellipse(g, x, y, rr + 0.6, rr + 0.6, C.shroom.d);
        ellipse(g, x, y, rr, rr, '#fbf4ea');
        px(g, x - 1, y - 1, '#ffffff');
      }
      // 旁邊的小蘑菇。
      rect(g, 26, H - 8, 3, 5, st.o);
      rect(g, 27, H - 8, 1, 4, st.l);
      shadeEll(g, 27.5, H - 8, 4, 3.5, C.shroom, H - 8);
      px(g, 26, H - 10, '#ffffff');
      // 螢火蟲。
      for (const [x, y] of [[4, 24], [28, 22], [6, 33]]) {
        g.globalAlpha = 0.35;
        ellipse(g, x + 0.5, y + 0.5, 2, 2, '#fff4a0');
        g.globalAlpha = 1;
        px(g, x, y, '#fffbd0');
      }
    },
  },
};
