// 家園美術：廚房、工作與興趣、收納與展示、庭院家具（繪製規則見 homeDraw.js 開頭說明，格式同 homeArt.js 的 HOME_ART）。

import { mix, ramp, R, rect, px, hash, ellipse, orb, shadow, woodGrain, stoneGrain, weave, block, cushion, post, foliage } from '../homeDraw.js';

/** 冰晶色階（冰櫃、展示架）。 */
const ICE = ramp('#8ad0f0');
/** 銀亮金屬色階（盔甲、劍刃）。 */
const SILVER = ramp('#b4bcc8');
/** 深色洞口（爐口、門洞），帶一點暖色調，不用純黑。 */
const HOLE = '#24141a';
/** 玻璃瓶身的淡藍色。 */
const GLASS = '#d8eef6';

/**
 * 磚縫：在範圍內畫交錯排列的磚塊灰縫，每塊磚左上角點一個亮點。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 * @param {number} [bw=8] 磚寬。
 * @param {number} [bh=5] 磚高（含灰縫）。
 */
function bricks(g, x, y, w, h, r, bw = 8, bh = 5) {
  for (let row = 0; row * bh < h; row++) {
    const y0 = y + row * bh;
    const hh = Math.min(bh - 1, h - row * bh);
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let i = off - bw; i < w; i += bw) {
      const jx = i + bw - 1;
      if (jx >= 0 && jx < w) rect(g, x + jx, y0, 1, hh, r.d);
      const sx = Math.max(0, i);
      if (sx < w) px(g, x + sx, y0, r.l);
    }
    if (row * bh + bh - 1 < h) rect(g, x, y0 + bh - 1, w, 1, r.d);
  }
}

/**
 * 斜向的木棍或支腳：由 (x0, y0) 逐列畫到 (x1, y1)，先畫外框再填色（左亮右暗）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 起點 x。
 * @param {number} y0 起點 y（上端）。
 * @param {number} x1 終點 x。
 * @param {number} y1 終點 y（下端）。
 * @param {number} w 粗細。
 * @param {object} r 色階。
 */
function pole(g, x0, y0, x1, y1, w, r) {
  const n = Math.max(1, y1 - y0);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = y0; y <= y1; y++) {
      const x = Math.round(x0 + ((x1 - x0) * (y - y0)) / n);
      if (pass === 0) {
        rect(g, x - 1, y - 1, w + 2, 3, r.o);
      } else {
        rect(g, x, y, w, 1, r.b);
        px(g, x, y, r.l);
        if (w > 2) px(g, x + w - 1, y, r.d);
      }
    }
  }
}

/**
 * 黃銅小把手或門扣（2×2，左上高光、右下陰影）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {object} [r=R.brass] 色階。
 */
function knob(g, x, y, r = R.brass) {
  rect(g, x, y, 2, 2, r.b);
  px(g, x, y, r.h);
  px(g, x + 1, y + 1, r.d);
}

/**
 * 有凹框的門板：外框、內凹面板、上緣亮線與右下陰影。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
function panel(g, x, y, w, h, r) {
  rect(g, x, y, w, h, r.o);
  rect(g, x + 1, y + 1, w - 2, h - 2, r.b);
  rect(g, x + 1, y + 1, w - 2, 1, r.l);
  rect(g, x + 1, y + 1, 1, h - 2, r.l);
  rect(g, x + 3, y + 3, w - 6, h - 6, r.d);
  rect(g, x + 4, y + 4, w - 8, h - 8, r.b);
  rect(g, x + 3, y + h - 3, w - 6, 1, r.l);
}

/**
 * 正面看的盤子：彩色盤緣、白色盤面、凹陷的盤心與左上反光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rad 半徑。
 * @param {object} rim 盤緣色階。
 */
function plate(g, cx, cy, rad, rim) {
  ellipse(g, cx, cy, rad + 1, rad + 1, rim.o);
  ellipse(g, cx, cy, rad, rad, rim.b);
  ellipse(g, cx, cy, rad - 1, rad - 1, R.white.l);
  ellipse(g, cx + 0.5, cy + 0.5, rad * 0.55, rad * 0.55, R.white.d);
  ellipse(g, cx, cy, rad * 0.5, rad * 0.5, R.white.b);
  px(g, cx - rad * 0.55, cy - rad * 0.55, R.white.h);
}

/**
 * 圓肚玻璃瓶：玻璃外殼、下半部的藥水、細瓶頸、軟木塞與反光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} by 瓶底 y。
 * @param {number} rx 瓶身水平半徑。
 * @param {number} ry 瓶身垂直半徑。
 * @param {number} neck 瓶頸高。
 * @param {object} liq 藥水色階。
 */
function flask(g, cx, by, rx, ry, neck, liq) {
  const cy = by - ry;
  rect(g, cx - 2, cy - ry - neck - 2, 4, neck + 3, liq.o);
  rect(g, cx - 1, cy - ry - neck, 2, neck + 1, GLASS);
  rect(g, cx - 2, cy - ry - neck - 3, 4, 2, R.lightWood.b);
  px(g, cx - 2, cy - ry - neck - 3, R.lightWood.h);
  ellipse(g, cx, cy, rx + 1, ry + 1, liq.o);
  ellipse(g, cx, cy, rx, ry, GLASS);
  const top = Math.floor(cy - ry * 0.15);
  for (let y = top; y <= cy + ry; y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const a = Math.round(cx - half);
    const b = Math.round(cx + half);
    rect(g, a, y, b - a, 1, y === top ? liq.l : liq.b);
    if (b - a > 2) px(g, b - 1, y, liq.d);
  }
  px(g, cx - Math.round(rx * 0.5), cy - Math.round(ry * 0.45), '#ffffff');
  px(g, cx - Math.round(rx * 0.5), cy - Math.round(ry * 0.45) + 1, '#ffffff');
}

/**
 * 淡淡的玻璃反光：薄薄一層淺藍與兩道短斜光，不會蓋住櫃內的東西。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 */
function shine(g, x, y, w, h) {
  g.globalAlpha = 0.14;
  rect(g, x, y, w, h, '#dff4ff');
  g.globalAlpha = 0.6;
  const n = Math.min(6, Math.floor(Math.min(w, h) / 2));
  for (let k = 0; k < n; k++) {
    px(g, x + 1 + k, y + n - k, '#ffffff');
    if (k < n - 2) px(g, x + 4 + k, y + n - k, '#ffffff');
  }
  g.globalAlpha = 1;
}

/**
 * 格紋布（2×2 的小方格，交錯深淺），用於毛巾、桌巾與布簾。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
function gingham(g, x, y, w, h, r) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = (i >> 1) % 2;
      const b = (j >> 1) % 2;
      px(g, x + i, y + j, a && b ? r.d : a || b ? r.b : R.cream.l);
    }
  }
}

/**
 * 木條箱：板條正面、四周框條、斜撐與四角鐵釘。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y（頂面上緣）。
 * @param {number} w 寬。
 * @param {number} top 頂面高。
 * @param {number} h 正面高。
 * @param {object} r 色階。
 * @param {number} seed 紋理種子。
 */
function crate(g, x, y, w, top, h, r, seed) {
  block(g, x, y, w, top, h, r, 'wood', seed);
  const fy = y + top;
  for (let j = 4; j < h - 1; j += 4) rect(g, x + 2, fy + j, w - 4, 1, r.d);
  rect(g, x, fy, 2, h, r.l);
  rect(g, x + w - 2, fy, 2, h, r.d);
  rect(g, x, fy + 1, w, 2, r.l);
  rect(g, x, fy + h - 2, w, 1, r.d);
  for (let k = 0; k < w - 4; k++) {
    const yy = fy + h - 3 - Math.round((k * (h - 5)) / (w - 5));
    rect(g, x + 2 + k, yy, 1, 2, r.l);
    px(g, x + 2 + k, yy + 2, r.d);
  }
  for (const [nx, ny] of [[x, fy + 1], [x + w - 2, fy + 1], [x, fy + h - 3], [x + w - 2, fy + h - 3]]) px(g, nx + 1 - (nx > x ? 1 : 0), ny, R.iron.l);
}

/** 廚房、工作與興趣、收納與展示、庭院家具的繪製方式（代碼 → { size, up, frames?, draw }）。 */
export const ART = {
  // ── 廚房 ──
  stove: {
    size: [1, 1], up: 16,
    /**
     * 爐灶：石砌爐身、鐵製爐面兩個爐口、燉湯鐵鍋與銅水壺、正面燒著炭火的火口。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      block(g, 2, 14, 28, 8, 24, R.stone, 'stone', 2);
      bricks(g, 2, 23, 27, 22, R.stone, 9, 5);
      // 鐵爐面與爐圈（右邊爐圈燒紅）。
      rect(g, 3, 15, 26, 6, R.iron.o);
      rect(g, 4, 15, 24, 5, R.iron.b);
      rect(g, 4, 15, 24, 1, R.iron.l);
      ellipse(g, 22, 18, 5, 2, R.iron.d);
      ellipse(g, 22, 18, 4, 1.4, '#e05a2a');
      ellipse(g, 22, 18, 2.5, 0.8, R.iron.d);
      // 火口：拱形洞口、炭火與兩根木柴。
      rect(g, 8, 29, 16, 14, R.stone.o);
      rect(g, 10, 27, 12, 2, R.stone.o);
      rect(g, 9, 30, 14, 12, HOLE);
      rect(g, 11, 28, 10, 2, HOLE);
      g.globalAlpha = 0.5;
      ellipse(g, 16, 39, 7, 3, '#f08a2a');
      g.globalAlpha = 1;
      rect(g, 10, 38, 12, 2, R.darkWood.b);
      rect(g, 10, 38, 12, 1, R.darkWood.l);
      for (const [x, c] of [[11, '#f8a030'], [13, '#e04a2a'], [15, '#fff0a0'], [17, '#f8a030'], [19, '#e04a2a'], [20, '#f8a030']]) px(g, x, 37 - (x % 3 === 0 ? 1 : 0), c);
      ellipse(g, 16, 35, 2, 2.5, '#f08a2a');
      ellipse(g, 16, 36, 1, 1.5, '#fff0a0');
      rect(g, 8, 42, 16, 1, R.stone.l);
      for (const x of [10, 13, 16, 19, 22]) rect(g, x, 30, 1, 12, R.iron.o);
      // 鐵鍋：鍋身、鍋耳、橘色濃湯與泡泡。
      rect(g, 3, 8, 14, 11, R.iron.o);
      rect(g, 4, 9, 12, 9, R.iron.b);
      rect(g, 4, 9, 2, 9, R.iron.l);
      rect(g, 14, 9, 2, 9, R.iron.d);
      rect(g, 2, 10, 2, 2, R.iron.o);
      rect(g, 16, 10, 2, 2, R.iron.o);
      ellipse(g, 10, 8, 7, 2.5, R.iron.o);
      ellipse(g, 10, 8, 6, 1.6, '#e0903a');
      px(g, 8, 8, '#f8c070');
      px(g, 12, 7, '#f8c070');
      px(g, 6, 7, R.iron.h);
      // 熱氣。
      g.globalAlpha = 0.55;
      for (const [x, y] of [[8, 4], [9, 3], [9, 2], [8, 1], [12, 5], [13, 4], [13, 3], [12, 2]]) px(g, x, y, '#ffffff');
      g.globalAlpha = 1;
      // 銅水壺：壺身、提把、壺嘴與壺蓋。
      orb(g, 23, 12, 5, 4, R.brass);
      rect(g, 19, 15, 9, 2, R.brass.o);
      rect(g, 20, 15, 7, 1, R.brass.d);
      rect(g, 27, 10, 3, 1, R.brass.o);
      rect(g, 29, 8, 1, 2, R.brass.o);
      rect(g, 19, 5, 8, 1, R.iron.o);
      rect(g, 19, 5, 1, 4, R.iron.o);
      rect(g, 26, 5, 1, 4, R.iron.o);
      rect(g, 22, 7, 2, 1, R.brass.o);
    },
  },
  oven: {
    size: [1, 1], up: 20,
    /**
     * 烤爐：石砌底座上的圓頂陶土窯、拱形爐口內的麵包與火光、小煙囪冒煙、倚在旁邊的木鏟。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      // 煙囪與煙。
      block(g, 20, 6, 5, 2, 10, R.clay, null);
      g.globalAlpha = 0.4;
      ellipse(g, 23, 3, 2.5, 2, '#d8d8e0');
      ellipse(g, 26, 1, 2, 1.5, '#d8d8e0');
      g.globalAlpha = 1;
      // 石砌底座。
      block(g, 2, 34, 28, 4, 12, R.stone, 'stone', 4);
      bricks(g, 2, 39, 27, 10, R.stone, 7, 5);
      // 圓頂窯身與磚紋。
      orb(g, 16, 27, 13, 12, R.clay);
      for (let y = 19; y < 38; y += 4) {
        const dy = (y + 0.5 - 27) / 12;
        if (Math.abs(dy) >= 1) continue;
        const half = Math.round(13 * Math.sqrt(1 - dy * dy)) - 1;
        rect(g, 16 - half, y, half * 2, 1, mix(R.clay.b, R.clay.d, 0.7));
        for (let x = 16 - half + ((y >> 2) % 2) * 3; x < 16 + half; x += 6) px(g, x, y - 1, R.clay.d);
      }
      // 拱形爐口：淺色拱石、深色內部、火光與麵包。
      ellipse(g, 16, 30, 8, 7, R.clay.o);
      rect(g, 8, 30, 17, 8, R.clay.o);
      ellipse(g, 16, 30, 7, 6, R.clay.l);
      rect(g, 9, 30, 15, 8, R.clay.l);
      for (const [x, y] of [[9, 28], [12, 25], [16, 24], [20, 25], [23, 28]]) px(g, x, y, R.clay.d);
      ellipse(g, 16, 31, 5, 4, HOLE);
      rect(g, 11, 31, 11, 6, HOLE);
      g.globalAlpha = 0.45;
      ellipse(g, 16, 35, 5, 2.5, '#f08a2a');
      g.globalAlpha = 1;
      for (const x of [12, 14, 19, 21]) px(g, x, 36, x % 2 ? '#f8a030' : '#e04a2a');
      const bread = ramp('#d89a50');
      orb(g, 16, 34, 4, 2, bread);
      for (const x of [14, 16, 18]) px(g, x, 33, bread.d);
      // 爐口前的石台。
      block(g, 7, 37, 18, 2, 2, R.stone, null);
      // 倚在右側的木鏟。
      post(g, 27, 14, 2, 22, R.lightWood);
      rect(g, 25, 36, 6, 10, R.lightWood.o);
      rect(g, 26, 36, 4, 9, R.lightWood.b);
      rect(g, 26, 36, 1, 9, R.lightWood.l);
      px(g, 27, 40, R.lightWood.d);
    },
  },
  counter: {
    size: [1, 1], up: 8,
    /**
     * 流理台：有大理石紋的石檯面（頂面保持乾淨可放東西）、抽屜、雙門木櫃與掛在檯邊的格紋毛巾。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      block(g, 2, 17, 28, 1, 21, R.wood, 'wood', 3);
      // 抽屜列與兩扇門。
      for (const x of [3, 16]) {
        rect(g, x, 20, 13, 5, R.wood.o);
        rect(g, x + 1, 21, 11, 3, R.wood.b);
        rect(g, x + 1, 21, 11, 1, R.wood.l);
        rect(g, x + 5, 22, 3, 1, R.brass.b);
        px(g, x + 5, 22, R.brass.h);
        panel(g, x, 26, 13, 11, R.wood);
        knob(g, x === 3 ? 13 : 17, 30);
      }
      rect(g, 3, 37, 26, 1, R.darkWood.o);
      // 石檯面與大理石紋。
      block(g, 1, 6, 30, 10, 3, R.stone, null);
      for (let k = 0; k < 9; k++) {
        px(g, 4 + k * 2, 14 - Math.floor(k * 0.9), R.stone.h);
        px(g, 5 + k * 2, 14 - Math.floor(k * 0.9), R.stone.b);
      }
      for (let k = 0; k < 5; k++) px(g, 20 + k, 9 + (k % 2), R.stone.b);
      for (const [x, y] of [[8, 9], [26, 13], [14, 8], [23, 12]]) px(g, x, y, R.stone.h);
      rect(g, 2, 16, 28, 1, R.stone.l);
      // 格紋毛巾。
      rect(g, 19, 18, 8, 11, R.red.o);
      gingham(g, 20, 18, 6, 10, R.red);
      rect(g, 20, 18, 6, 1, R.red.d);
      for (const x of [20, 22, 24]) px(g, x, 28, R.cream.d);
    },
  },
  cupboard: {
    size: [1, 1], up: 28,
    /**
     * 碗櫃：雕花頂冠、上層玻璃門內排著藍邊盤子與杯碗、中段檯面、下層嵌板木門。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      block(g, 2, 6, 28, 3, 50, R.wood, 'wood', 7);
      // 頂冠與中央雕花。
      block(g, 1, 3, 30, 2, 3, R.darkWood, null);
      rect(g, 12, 0, 8, 3, R.darkWood.o);
      rect(g, 13, 1, 6, 2, R.darkWood.l);
      px(g, 16, 1, R.gold.l);
      // 上層櫃內：深色背板、兩層隔板、盤子、碗與杯子。
      rect(g, 4, 11, 24, 22, R.darkWood.o);
      rect(g, 5, 12, 22, 20, R.darkWood.d);
      rect(g, 5, 12, 22, 1, mix(R.darkWood.d, '#000000', 0.25));
      for (const [x, rim] of [[9, R.blue], [16, R.red], [23, R.blue]]) plate(g, x, 17, 3.5, rim);
      rect(g, 5, 21, 22, 2, R.wood.l);
      rect(g, 5, 22, 22, 1, R.wood.d);
      for (let k = 0; k < 3; k++) {
        ellipse(g, 9, 30 - k * 2, 4, 1.6, R.white.o);
        ellipse(g, 9, 30 - k * 2, 3, 1, k === 2 ? R.white.h : R.white.l);
      }
      for (const [x, r] of [[16, R.clay], [22, R.green]]) {
        rect(g, x - 2, 26, 5, 5, r.o);
        rect(g, x - 1, 26, 3, 4, r.b);
        px(g, x - 1, 26, r.h);
        rect(g, x + 3, 27, 2, 2, r.o);
        px(g, x + 3, 27, r.b);
      }
      rect(g, 5, 31, 22, 1, R.wood.l);
      // 玻璃門框。
      rect(g, 4, 11, 24, 1, R.wood.b);
      rect(g, 15, 11, 2, 22, R.wood.b);
      px(g, 15, 11, R.wood.l);
      shine(g, 5, 12, 10, 20);
      shine(g, 17, 12, 10, 20);
      knob(g, 13, 22);
      knob(g, 17, 22);
      // 中段檯面。
      block(g, 1, 33, 30, 2, 2, R.wood, null);
      // 下層兩扇門與底座。
      panel(g, 3, 38, 13, 17, R.wood);
      panel(g, 16, 38, 13, 17, R.wood);
      knob(g, 13, 45);
      knob(g, 17, 45);
      rect(g, 2, 55, 28, 2, R.darkWood.d);
    },
  },
  iceBox: {
    size: [1, 1], up: 18,
    /**
     * 冰櫃：淺色木櫃身、冰藍色金屬包角、上層結霜的冰晶門（雪花圖樣）、下層木門與黃銅把手、頂上的冰塊與冰柱、底部冷氣。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 28);
      block(g, 3, 8, 26, 4, 38, R.lightWood, 'wood', 5);
      // 冰藍包角與鉚釘。
      for (const x of [3, 27]) {
        rect(g, x, 12, 2, 37, ICE.o);
        rect(g, x, 12, 1, 37, ICE.l);
        for (let y = 15; y < 48; y += 8) px(g, x + 1, y, ICE.h);
      }
      rect(g, 3, 12, 26, 1, ICE.b);
      // 頂上的兩塊冰（半透明立方）。
      for (const [x, y, s] of [[7, 2, 7], [15, 4, 6]]) {
        rect(g, x - 1, y - 1, s + 2, s + 2, ICE.o);
        g.globalAlpha = 0.85;
        rect(g, x, y, s, s, ICE.l);
        rect(g, x, y, s, 2, ICE.h);
        rect(g, x + s - 1, y + 2, 1, s - 2, ICE.b);
        g.globalAlpha = 1;
        px(g, x + 1, y + 1, '#ffffff');
      }
      // 上層冰晶門：結霜面板與雪花。
      rect(g, 6, 14, 20, 13, ICE.o);
      rect(g, 7, 15, 18, 11, ICE.b);
      rect(g, 7, 15, 18, 3, ICE.l);
      for (let i = 0; i < 18; i++) if (hash(i, 3) < 0.5) px(g, 7 + i, 25 - Math.floor(hash(i, 5) * 2), ICE.h);
      for (let k = -3; k <= 3; k++) {
        px(g, 16 + k, 20, '#ffffff');
        px(g, 16, 20 + k, '#ffffff');
        if (Math.abs(k) < 3) {
          px(g, 16 + k, 20 + k, ICE.h);
          px(g, 16 + k, 20 - k, ICE.h);
        }
      }
      // 冰柱。
      for (const [x, l] of [[6, 2], [9, 3], [12, 1], [19, 2], [23, 3], [25, 1]]) {
        rect(g, x, 27, 1, l, ICE.h);
        px(g, x, 27 + l, ICE.l);
      }
      // 下層木門與黃銅拉把。
      panel(g, 6, 30, 20, 16, R.lightWood);
      rect(g, 21, 33, 3, 8, R.brass.o);
      rect(g, 22, 34, 1, 6, R.brass.l);
      for (const y of [32, 42]) rect(g, 4, y, 3, 2, R.iron.b);
      // 冷氣。
      g.globalAlpha = 0.35;
      ellipse(g, 9, 48, 5, 1.5, '#ffffff');
      ellipse(g, 22, 49, 4, 1.2, '#ffffff');
      g.globalAlpha = 1;
    },
  },
  sink: {
    size: [1, 1], up: 12,
    /**
     * 水槽：石砌底櫃掛著格紋布簾、石檯面上的水槽（水面、泡泡與一個碗）、黃銅水龍頭與水滴、角落的陶罐。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      block(g, 2, 19, 28, 1, 23, R.stone, 'stone', 8);
      // 布簾（有皺褶）。
      rect(g, 4, 22, 24, 18, R.blue.o);
      gingham(g, 5, 23, 22, 16, R.blue);
      for (const x of [9, 15, 21]) rect(g, x, 23, 1, 16, R.blue.d);
      rect(g, 4, 22, 24, 2, R.darkWood.b);
      rect(g, 4, 22, 24, 1, R.darkWood.l);
      // 黃銅水龍頭。
      post(g, 14, 3, 2, 8, R.brass);
      rect(g, 13, 1, 8, 3, R.brass.o);
      rect(g, 14, 2, 6, 1, R.brass.l);
      rect(g, 19, 3, 2, 3, R.brass.o);
      px(g, 19, 4, R.brass.b);
      rect(g, 11, 4, 3, 2, R.red.b);
      px(g, 11, 4, R.red.h);
      px(g, 20, 8, R.water.l);
      // 石檯面與水槽。
      block(g, 1, 9, 30, 10, 3, R.stone, 'stone', 3);
      rect(g, 4, 11, 22, 7, R.stone.o);
      rect(g, 5, 11, 20, 6, R.stone.d);
      rect(g, 5, 13, 20, 4, R.water.b);
      rect(g, 5, 13, 20, 1, R.water.l);
      for (const [x, y] of [[7, 14], [11, 15], [22, 14]]) px(g, x, y, R.water.h);
      ellipse(g, 15, 14, 4, 1.5, R.white.o);
      ellipse(g, 15, 14, 3, 1, R.white.l);
      for (const [x, y] of [[9, 12], [10, 11], [20, 12]]) px(g, x, y, '#ffffff');
      rect(g, 5, 18, 20, 1, R.stone.l);
      // 角落的陶罐與肥皂。
      orb(g, 27, 8, 3, 3.5, R.clay);
      rect(g, 26, 3, 3, 2, R.clay.o);
      rect(g, 2, 9, 4, 2, R.cream.o);
      rect(g, 3, 9, 2, 1, R.cream.h);
    },
  },
  barrelRack: {
    size: [2, 1], up: 18,
    /**
     * 木桶架：深色木架上疊成三角的三個橫躺木桶（鐵箍、桶板、銅龍頭、標籤），架頂放一個馬克杯。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 62);
      post(g, 3, 6, 3, 42, R.darkWood);
      post(g, 58, 6, 3, 42, R.darkWood);
      block(g, 1, 4, 62, 2, 2, R.darkWood, 'wood', 1);
      /**
       * 一個橫躺木桶的桶底：後方桶身、鐵箍外圈、直向桶板、銅龍頭與標籤。
       * @param {number} cx 中心 x。
       * @param {number} cy 中心 y。
       * @param {number} rad 半徑。
       * @param {string|null} tag 標籤顏色。
       */
      const barrel = (cx, cy, rad, tag) => {
        ellipse(g, cx + 1, cy - 2, rad + 1, rad + 1, R.wood.o);
        ellipse(g, cx + 1, cy - 2, rad, rad, R.wood.d);
        ellipse(g, cx, cy, rad + 1, rad + 1, R.iron.o);
        ellipse(g, cx, cy, rad, rad, R.iron.b);
        ellipse(g, cx - 0.5, cy - 0.5, rad - 0.5, rad - 0.5, R.iron.l);
        ellipse(g, cx, cy, rad - 1.5, rad - 1.5, R.iron.b);
        ellipse(g, cx, cy, rad - 2, rad - 2, R.wood.b);
        ellipse(g, cx - 1, cy - 1, rad - 4, rad - 4, R.wood.l);
        for (let x = cx - rad + 4; x < cx + rad - 2; x += 4) {
          for (let y = cy - rad + 2; y <= cy + rad - 2; y++) {
            if ((x - cx) ** 2 + (y - cy) ** 2 < (rad - 2) ** 2) px(g, x, y, R.wood.d);
          }
        }
        px(g, cx - rad + 3, cy - rad + 5, R.wood.h);
        px(g, cx - rad + 4, cy - rad + 4, R.wood.h);
        if (tag) {
          const t = ramp(tag);
          rect(g, cx - 4, cy - 4, 8, 5, t.o);
          rect(g, cx - 3, cy - 3, 6, 3, R.cream.l);
          rect(g, cx - 2, cy - 2, 4, 1, t.b);
        }
        rect(g, cx - 1, cy + 3, 3, 4, R.brass.o);
        rect(g, cx, cy + 3, 1, 3, R.brass.l);
        rect(g, cx - 2, cy + 4, 5, 1, R.brass.b);
      };
      barrel(32, 16, 10, '#c0444a');
      barrel(17, 36, 11, '#4fa058');
      barrel(47, 36, 11, null);
      // 前方托架與架頂馬克杯。
      block(g, 2, 44, 60, 2, 3, R.darkWood, 'wood', 6);
      for (const x of [9, 24, 39, 54]) rect(g, x, 46, 2, 2, R.darkWood.d);
      rect(g, 50, -1, 1, 1, R.cream.d);
      rect(g, 48, 0, 6, 5, R.clay.o);
      rect(g, 49, 1, 4, 3, R.clay.b);
      px(g, 49, 1, R.clay.h);
      rect(g, 54, 1, 2, 3, R.clay.o);
    },
  },
  dishRack: {
    size: [1, 1], up: 18,
    /**
     * 餐具架：開放式木架，上層立著四個彩色盤緣的盤子（前方有橫桿擋住），中層掛著馬克杯，底層放碗與插著湯匙的筒子。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 28);
      // 後方背板（淺色木條）。
      rect(g, 4, 4, 24, 42, R.lightWood.o);
      rect(g, 5, 5, 22, 40, R.lightWood.d);
      for (let x = 5; x < 27; x += 4) rect(g, x, 5, 1, 40, mix(R.lightWood.d, R.lightWood.o, 0.4));
      // 立著的盤子。
      for (const [x, rim] of [[8, R.blue], [13, R.red], [18, R.green], [23, R.gold]]) plate(g, x, 11, 4.5, rim);
      // 盤子前的擋桿與支柱。
      rect(g, 3, 15, 26, 3, R.wood.o);
      rect(g, 4, 16, 24, 1, R.wood.l);
      // 中層隔板與掛鉤上的馬克杯。
      block(g, 3, 21, 26, 2, 2, R.wood, null);
      for (const [x, r] of [[8, R.red], [16, R.cream], [24, R.blue]]) {
        rect(g, x, 26, 1, 2, R.iron.l);
        rect(g, x - 3, 28, 6, 6, r.o);
        rect(g, x - 2, 28, 4, 5, r.b);
        px(g, x - 2, 28, r.h);
        rect(g, x - 2, 32, 4, 1, r.d);
        rect(g, x + 3, 29, 2, 3, r.o);
        px(g, x + 3, 30, r.b);
      }
      // 底層：一疊碗與餐具筒。
      block(g, 3, 37, 26, 2, 2, R.wood, null);
      for (let k = 0; k < 3; k++) {
        ellipse(g, 10, 35 - k * 2, 5, 1.8, R.white.o);
        ellipse(g, 10, 35 - k * 2, 4, 1, k === 2 ? R.white.h : R.white.l);
      }
      rect(g, 19, 31, 7, 6, R.clay.o);
      rect(g, 20, 31, 5, 5, R.clay.b);
      rect(g, 20, 31, 1, 5, R.clay.l);
      for (const [x, h] of [[20, 5], [22, 7], [24, 4]]) {
        rect(g, x, 31 - h, 1, h, SILVER.b);
        rect(g, x - 1, 30 - h, 3, 2, SILVER.l);
      }
      // 側柱與腳。
      post(g, 2, 3, 2, 45, R.wood);
      post(g, 28, 3, 2, 45, R.wood);
      block(g, 1, 2, 30, 1, 2, R.wood, null);
      block(g, 3, 44, 26, 1, 3, R.wood, null);
    },
  },
  // ── 工作與興趣 ──
  herbTable: {
    size: [1, 1], up: 24,
    /**
     * 藥草台：後方晾著三束倒掛的藥草，桌上有石臼與杵、紫色圓瓶、綠色長瓶與紅色小瓶，桌下層架放陶罐。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      // 晾藥草的架子與三束藥草。
      post(g, 3, 3, 2, 27, R.darkWood);
      post(g, 27, 3, 2, 27, R.darkWood);
      block(g, 2, 2, 28, 1, 2, R.darkWood, null);
      for (const [x, c] of [[9, '#5aa848'], [16, '#9a78d8'], [23, '#c8b040']]) {
        const r = ramp(c);
        rect(g, x, 5, 1, 2, R.cream.d);
        rect(g, x - 1, 7, 3, 2, R.cream.b);
        for (let j = 0; j < 9; j++) {
          const hw = 1 + Math.floor(j / 2.5);
          for (let i = -hw; i <= hw; i++) {
            const v = hash(i + x, j, 4);
            px(g, x + i, 9 + j, Math.abs(i) === hw ? r.d : v < 0.3 ? r.l : v > 0.85 ? r.h : r.b);
          }
        }
        rect(g, x, 9, 1, 6, mix(r.d, '#6e4428', 0.5));
      }
      // 桌子部分整體往下移，讓藥草束露出來。
      g.translate(0, 6);
      // 桌腳、下層架與陶罐。
      post(g, 3, 30, 3, 16, R.wood);
      post(g, 26, 30, 3, 16, R.wood);
      block(g, 4, 38, 24, 2, 2, R.wood, null);
      for (const [x, r] of [[11, R.clay], [19, R.sand]]) {
        orb(g, x, 35, 3.5, 3, r);
        rect(g, x - 2, 31, 4, 2, r.o);
        rect(g, x - 1, 31, 2, 1, r.l);
      }
      // 桌面。
      block(g, 1, 20, 30, 7, 4, R.wood, 'wood', 4);
      // 石臼與杵（臼裡是綠色藥泥）。
      orb(g, 8, 24, 5, 3.5, R.stone);
      ellipse(g, 8, 22, 4, 1.4, R.stone.o);
      ellipse(g, 8, 22, 3, 0.9, '#6ab048');
      pole(g, 9, 15, 12, 21, 2, R.stone);
      // 藥水瓶。
      flask(g, 17, 25, 3.5, 3.5, 3, R.purple);
      flask(g, 24, 25, 2, 5, 2, R.green);
      flask(g, 28, 25, 1.5, 2, 1, R.red);
      // 散落的葉片。
      px(g, 4, 21, R.leaf.l);
      px(g, 13, 26, R.leaf.b);
      px(g, 14, 25, R.leaf.l);
      g.translate(0, -6);
    },
  },
  forge: {
    size: [1, 1], up: 26, frames: 3,
    /**
     * 鍛造爐：石砌煙囪與陶土磚爐罩、頂上一床會閃爍的炭火（3 幀）、往上飄的火星、正面的火口與掛在側邊的鐵鉗。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      shadow(g, 16, H - 2, 30);
      // 地上的火光。
      g.globalAlpha = 0.18;
      ellipse(g, 16, H - 4, 16, 4, '#f08a2a');
      g.globalAlpha = 1;
      // 煙囪與爐罩。
      block(g, 10, 0, 12, 2, 13, R.stone, 'stone', 2);
      for (let y = 0; y < 9; y++) {
        const w = 14 + y * 2;
        rect(g, 16 - w / 2 - 1, 15 + y, w + 2, 1, R.clay.o);
        rect(g, 16 - w / 2, 15 + y, w, 1, y === 0 ? R.clay.l : R.clay.b);
        px(g, 16 - w / 2, 15 + y, R.clay.l);
        px(g, 16 + w / 2 - 1, 15 + y, R.clay.d);
        if (y % 3 === 2) rect(g, 16 - w / 2 + 1, 15 + y, w - 2, 1, R.clay.d);
      }
      block(g, 2, 24, 28, 1, 2, R.iron, null);
      // 石砌爐身。
      block(g, 2, 28, 28, 6, 22, R.stone, 'stone', 5);
      bricks(g, 2, 35, 27, 20, R.stone, 9, 5);
      // 炭床：每幀亮暗不同的炭塊與上方的火光。
      rect(g, 4, 29, 24, 5, HOLE);
      const coal = ['#3a2028', '#a02a20', '#e04a2a', '#f8a030', '#fff0a0'];
      for (let j = 0; j < 2; j++) {
        for (let i = 0; i < 12; i++) {
          const heat = Math.floor(hash(i, j, f + 1) * 3 + (Math.abs(i - 5.5) < 3 ? 2 : 1) - j * 0.5);
          const c = coal[Math.max(0, Math.min(4, heat))];
          rect(g, 4 + i * 2, 29 + j * 2 + (i % 2), 2, 2, c);
        }
      }
      g.globalAlpha = 0.3 + f * 0.05;
      ellipse(g, 16, 27, 11, 4, '#f8a030');
      g.globalAlpha = 1;
      // 火星（每幀位置不同）。
      for (let k = 0; k < 4; k++) {
        const y = 26 - ((f * 5 + k * 7) % 14);
        const x = 9 + k * 5 + ((f + k) % 2);
        px(g, x, y, k % 2 ? '#fff0a0' : '#f8a030');
      }
      // 正面火口。
      rect(g, 10, 39, 12, 11, R.stone.o);
      rect(g, 11, 37, 10, 2, R.stone.o);
      rect(g, 11, 40, 10, 9, HOLE);
      rect(g, 12, 38, 8, 2, HOLE);
      for (let i = 0; i < 10; i++) px(g, 11 + i, 48 - (hash(i, f, 9) < 0.4 ? 1 : 0), hash(i, f) < 0.5 ? '#e04a2a' : '#f8a030');
      g.globalAlpha = 0.4;
      ellipse(g, 16, 46, 5, 2, '#f08a2a');
      g.globalAlpha = 1;
      // 掛在右側的鐵鉗。
      pole(g, 29, 26, 30, 42, 1, R.iron);
      pole(g, 30, 26, 29, 42, 1, R.iron);
    },
  },
  loom: {
    size: [1, 1], up: 22,
    /**
     * 織布機：木框、上方經紗梁、直向經紗、綜框橫桿、橫放的梭子、已織好的條紋花布捲在前梁上，旁邊一顆毛線球。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      post(g, 3, 4, 3, 46, R.wood);
      post(g, 26, 4, 3, 46, R.wood);
      // 經紗。
      rect(g, 6, 8, 20, 24, '#4a3020');
      for (let x = 6; x < 26; x += 2) {
        rect(g, x, 8, 1, 24, R.cream.l);
        px(g, x, 20, R.cream.d);
      }
      // 上梁與綜框橫桿。
      block(g, 1, 2, 30, 2, 4, R.wood, 'wood', 1);
      block(g, 4, 18, 24, 1, 2, R.darkWood, null);
      // 已織好的花布（紅藍條紋與菱形）。
      const red = R.red;
      const blue = R.blue;
      for (let y = 0; y < 10; y++) {
        const r = y < 2 || y > 7 ? blue : y === 2 || y === 7 ? R.cream : red;
        rect(g, 6, 31 + y, 20, 1, r.b);
      }
      weave(g, 6, 31, 20, 10, red);
      for (let k = 0; k < 3; k++) {
        for (const cx of [10, 16, 22]) {
          px(g, cx - k, 34 + k, R.gold.l);
          px(g, cx + k, 34 + k, R.gold.l);
          px(g, cx - (2 - k), 37 + k, R.gold.l);
          px(g, cx + (2 - k), 37 + k, R.gold.l);
        }
      }
      // 梭子（兩端尖、中間有紅色紗管）。
      rect(g, 9, 27, 14, 3, R.lightWood.o);
      rect(g, 7, 28, 18, 1, R.lightWood.o);
      rect(g, 10, 28, 12, 1, R.lightWood.l);
      rect(g, 13, 28, 6, 1, R.red.b);
      // 前梁（捲著布）與底座橫木。
      block(g, 2, 40, 28, 2, 4, R.darkWood, 'wood', 2);
      rect(g, 6, 42, 20, 3, R.red.d);
      rect(g, 6, 42, 20, 1, R.red.b);
      block(g, 2, 50, 28, 1, 2, R.wood, null);
      // 毛線球。
      orb(g, 26, 49, 4, 4, R.purple);
      for (const [x, y] of [[24, 47], [25, 49], [27, 48], [26, 51]]) px(g, x, y, R.purple.d);
      rect(g, 21, 52, 4, 1, R.purple.b);
    },
  },
  desk: {
    size: [1, 1], up: 8,
    /**
     * 書桌：深色木桌面（右後角有墨水瓶與羽毛筆，其餘留空可放東西）、左側桌腳、右側三層抽屜櫃與後擋板。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      const r = R.darkWood;
      // 後擋板、左桌腳與右抽屜櫃。
      rect(g, 4, 19, 13, 9, r.o);
      rect(g, 5, 19, 12, 8, r.d);
      post(g, 3, 19, 3, 19, r);
      block(g, 17, 18, 12, 1, 20, r, 'wood', 2);
      for (let k = 0; k < 3; k++) {
        const y = 20 + k * 6;
        rect(g, 18, y, 10, 5, r.o);
        rect(g, 19, y + 1, 8, 3, r.b);
        rect(g, 19, y + 1, 8, 1, r.l);
        rect(g, 21, y + 2, 4, 1, R.brass.b);
        px(g, 21, y + 2, R.brass.h);
      }
      // 桌面（前緣有裝飾線）。
      block(g, 1, 8, 30, 9, 3, r, 'wood', 5);
      rect(g, 2, 18, 28, 1, r.l);
      // 墨水瓶與羽毛筆。
      orb(g, 25, 12, 2, 2, R.black);
      rect(g, 24, 9, 3, 1, R.black.o);
      for (let k = 0; k < 6; k++) {
        px(g, 27 + Math.floor(k / 2), 10 - k, R.white.l);
        px(g, 28 + Math.floor(k / 2), 10 - k, k > 1 ? R.white.b : R.white.d);
      }
      px(g, 26, 11, R.black.l);
    },
  },
  easel: {
    size: [1, 1], up: 30,
    /**
     * 畫架：三腳木架、畫布上畫著彩虹與綠丘、托架上的畫筆，地上放著沾滿顏料的調色盤與插筆罐。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 26);
      // 後腳與兩支前腳。
      post(g, 15, 2, 2, 52, R.wood);
      pole(g, 11, 2, 5, 58, 2, R.lightWood);
      pole(g, 20, 2, 26, 58, 2, R.lightWood);
      rect(g, 8, 44, 16, 2, R.lightWood.o);
      rect(g, 8, 44, 16, 1, R.lightWood.b);
      // 畫布：白底、彩虹、天空與綠丘。
      rect(g, 4, 5, 24, 23, R.cream.o);
      g.save();
      g.beginPath();
      g.rect(5, 6, 22, 21);
      g.clip();
      rect(g, 5, 6, 22, 21, '#9ad0f0');
      rect(g, 5, 6, 22, 6, '#c8e8f8');
      for (const [rad, c] of [[10, '#e0444a'], [9, '#f0a030'], [8, '#f0e040'], [7, '#5ab050'], [6, '#4a8ad8'], [5, '#8a5ac8'], [4, '#9ad0f0']]) ellipse(g, 16, 24, rad, rad, c);
      ellipse(g, 9, 9, 2, 2, '#fff0a0');
      ellipse(g, 22, 9, 3, 1.2, '#ffffff');
      ellipse(g, 10, 29, 9, 6, '#4fa058');
      ellipse(g, 23, 30, 9, 6, '#5ab84a');
      rect(g, 5, 24, 22, 3, '#4fa058');
      for (const [x, y] of [[8, 25], [19, 25], [13, 26]]) px(g, x, y, '#f0e040');
      g.restore();
      rect(g, 5, 6, 22, 1, R.white.h);
      rect(g, 26, 6, 1, 21, R.cream.d);
      // 頂部夾子與托架、架上的畫筆。
      rect(g, 13, 2, 6, 4, R.wood.o);
      rect(g, 14, 3, 4, 2, R.wood.l);
      block(g, 3, 27, 26, 2, 2, R.wood, null);
      rect(g, 7, 26, 8, 1, R.lightWood.l);
      rect(g, 15, 26, 2, 1, R.red.b);
      // 調色盤（腰果形、拇指孔、顏料）。
      ellipse(g, 23, 52, 7, 3.5, R.lightWood.o);
      ellipse(g, 23, 52, 6, 2.6, R.lightWood.l);
      ellipse(g, 20, 52, 1, 1, R.lightWood.o);
      for (const [x, y, c] of [[23, 50, '#e0444a'], [26, 51, '#4a8ad8'], [27, 53, '#f0e040'], [24, 54, '#5ab050'], [21, 54, '#ffffff']]) {
        rect(g, x, y, 2, 1, c);
        px(g, x, y + 1, c);
      }
      // 插筆罐。
      for (const [x, h, c] of [[5, 7, '#e0444a'], [7, 9, '#4a8ad8'], [9, 6, '#f0e040']]) {
        rect(g, x, 50 - h, 1, h, R.lightWood.b);
        rect(g, x, 49 - h, 1, 2, c);
      }
      rect(g, 3, 49, 8, 7, R.blue.o);
      rect(g, 4, 49, 6, 6, R.blue.b);
      rect(g, 4, 49, 1, 6, R.blue.l);
      rect(g, 4, 49, 6, 1, R.blue.h);
    },
  },
  // ── 收納與展示 ──
  crates: {
    size: [1, 1], up: 18,
    /**
     * 木箱堆：下層一大一小兩個條板箱（小的是裝滿蘋果的開口箱），上層疊一個漆著紅色箭頭、冒出稻草的箱子。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      // 右下：開口蘋果箱。
      crate(g, 18, 28, 12, 4, 16, R.wood, 3);
      rect(g, 19, 29, 10, 3, '#3a2418');
      for (const [x, y] of [[21, 28], [25, 29], [28, 28], [23, 26]]) {
        orb(g, x, y, 2, 2, R.red);
        px(g, x, y - 2, R.darkWood.b);
      }
      px(g, 24, 25, R.leaf.l);
      // 左下大箱。
      crate(g, 2, 26, 17, 4, 18, R.lightWood, 6);
      // 上層箱、稻草與紅色箭頭記號。
      for (let i = 0; i < 12; i++) {
        const h = 1 + Math.floor(hash(i, 2) * 3);
        rect(g, 7 + i, 10 - h, 1, h, i % 2 ? R.sand.l : R.sand.b);
      }
      crate(g, 6, 10, 15, 4, 14, R.lightWood, 9);
      const s = mix(R.red.b, R.lightWood.b, 0.25);
      for (let k = 0; k < 4; k++) rect(g, 13 - k, 16 + k, k * 2 + 1, 1, s);
      rect(g, 12, 20, 3, 3, s);
      // 箱上的釘子。
      for (const [x, y] of [[4, 32], [16, 32], [4, 42], [16, 42]]) px(g, x, y, R.iron.l);
    },
  },
  shelf: {
    size: [1, 1], up: 28,
    /**
     * 置物架：開放式三層木架與直條背板，上層放兩罐果醬與疊好的布，中層是裝毛線的籃子與一捲繩子，下層放陶罐與鐵皮盒。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      // 背板。
      rect(g, 4, 4, 24, 52, R.wood.o);
      rect(g, 5, 5, 22, 51, R.wood.d);
      for (let x = 9; x < 27; x += 5) rect(g, x, 5, 1, 51, mix(R.wood.d, R.wood.o, 0.5));
      // 上層：果醬罐與布堆。
      for (const [x, c] of [[8, '#c0444a'], [14, '#e0a030']]) {
        const r = ramp(c);
        rect(g, x - 3, 10, 7, 9, R.black.o);
        rect(g, x - 2, 11, 5, 7, GLASS);
        rect(g, x - 2, 13, 5, 5, r.b);
        rect(g, x - 2, 13, 5, 1, r.l);
        px(g, x - 2, 14, '#ffffff');
        rect(g, x - 3, 9, 7, 2, R.cream.o);
        rect(g, x - 2, 8, 5, 2, ramp(c === '#c0444a' ? '#e8e0c8' : '#c0444a').b);
      }
      for (const [k, r] of [[0, R.blue], [1, R.cream], [2, R.green]]) {
        rect(g, 19, 15 - k * 3, 8, 3, r.o);
        rect(g, 20, 15 - k * 3, 6, 2, r.b);
        rect(g, 20, 15 - k * 3, 6, 1, r.l);
      }
      block(g, 2, 18, 28, 2, 2, R.wood, 'wood', 1);
      // 中層：毛線籃與繩捲。
      rect(g, 5, 27, 13, 8, R.sand.o);
      rect(g, 6, 27, 11, 7, R.sand.b);
      for (let y = 28; y < 34; y += 2) for (let x = 6 + (y % 4 === 0 ? 1 : 0); x < 17; x += 2) px(g, x, y, R.sand.d);
      orb(g, 9, 26, 2.5, 2.5, R.red);
      orb(g, 14, 25, 2.5, 2.5, R.blue);
      ellipse(g, 23, 30, 4.5, 4.5, R.sand.o);
      ellipse(g, 23, 30, 3.5, 3.5, R.sand.l);
      ellipse(g, 23, 30, 2, 2, R.sand.d);
      ellipse(g, 23, 30, 1, 1, R.sand.o);
      block(g, 2, 34, 28, 2, 2, R.wood, 'wood', 4);
      // 下層：陶罐與鐵皮盒。
      orb(g, 9, 46, 4, 4, R.clay);
      rect(g, 7, 40, 5, 2, R.clay.o);
      rect(g, 8, 40, 3, 1, R.clay.l);
      rect(g, 6, 46, 7, 1, R.clay.d);
      block(g, 16, 42, 10, 2, 6, R.blue, null);
      rect(g, 16, 46, 10, 1, R.gold.b);
      block(g, 2, 50, 28, 2, 2, R.wood, 'wood', 7);
      // 側柱。
      post(g, 2, 3, 2, 54, R.wood);
      post(g, 28, 3, 2, 54, R.wood);
    },
  },
  weaponRack: {
    size: [1, 1], up: 26,
    /**
     * 武器架（裝飾用）：深色木架，插著銀劍、綁紅緞帶的長槍與小斧，前方倚著一面金邊藍色圓盾。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      post(g, 3, 6, 3, 44, R.darkWood);
      post(g, 26, 6, 3, 44, R.darkWood);
      block(g, 2, 8, 28, 1, 3, R.darkWood, 'wood', 2);
      // 長槍：木桿、葉形槍頭與紅緞帶。
      post(g, 16, 6, 2, 38, R.lightWood);
      rect(g, 15, 0, 4, 7, SILVER.o);
      rect(g, 16, 1, 2, 5, SILVER.l);
      px(g, 16, 1, SILVER.h);
      rect(g, 14, 7, 6, 2, R.red.b);
      rect(g, 13, 9, 2, 3, R.red.d);
      rect(g, 19, 9, 2, 4, R.red.b);
      // 銀劍：劍刃、中央血槽、金色護手、握柄與劍首。
      rect(g, 8, 12, 5, 22, SILVER.o);
      rect(g, 9, 11, 3, 1, SILVER.o);
      rect(g, 9, 12, 3, 22, SILVER.b);
      rect(g, 9, 12, 1, 22, SILVER.h);
      rect(g, 10, 14, 1, 18, SILVER.d);
      rect(g, 5, 33, 11, 3, R.gold.o);
      rect(g, 6, 34, 9, 1, R.gold.l);
      rect(g, 9, 36, 3, 5, R.darkWood.o);
      rect(g, 10, 36, 1, 5, R.red.b);
      orb(g, 10, 42, 1.5, 1.5, R.gold);
      // 小斧：握柄與半月形斧頭。
      post(g, 23, 14, 2, 30, R.wood);
      ellipse(g, 26, 18, 4, 5, SILVER.o);
      ellipse(g, 26, 18, 3, 4, SILVER.b);
      rect(g, 22, 14, 4, 8, SILVER.o);
      rect(g, 23, 15, 3, 6, SILVER.b);
      rect(g, 28, 15, 1, 6, SILVER.h);
      // 下方插槽橫木與底座。
      block(g, 2, 38, 28, 2, 3, R.darkWood, 'wood', 5);
      block(g, 1, 46, 30, 3, 7, R.darkWood, 'wood', 8);
      // 圓盾：金邊、藍面、中央盾釘與星形。
      orb(g, 22, 46, 7, 7, R.gold);
      orb(g, 22, 46, 5.5, 5.5, R.blue);
      for (let k = -2; k <= 2; k++) {
        px(g, 22 + k, 46, R.gold.l);
        px(g, 22, 46 + k, R.gold.l);
      }
      px(g, 21, 45, R.gold.h);
      px(g, 23, 47, R.gold.l);
      px(g, 21, 47, R.gold.l);
      px(g, 23, 45, R.gold.l);
    },
  },
  armorStand: {
    size: [1, 1], up: 32,
    /**
     * 盔甲架（裝飾用）：圓形木底座與立柱上掛著羽飾頭盔、肩甲、刻金星的銀胸甲、皮帶與裙甲。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 24);
      // 底座與立柱。
      ellipse(g, 16, 58, 11, 4, R.darkWood.o);
      ellipse(g, 16, 57, 10, 3, R.darkWood.b);
      ellipse(g, 15, 56, 8, 2, R.darkWood.l);
      post(g, 15, 40, 2, 16, R.darkWood);
      // 裙甲。
      for (const [x, d] of [[9, 0], [14, 1], [19, 0]]) {
        rect(g, x - 1, 38, 6, 8 + d, SILVER.o);
        rect(g, x, 38, 4, 7 + d, SILVER.b);
        rect(g, x, 38, 1, 7 + d, SILVER.l);
        rect(g, x, 43 + d, 4, 1, SILVER.d);
      }
      // 胸甲：上寬下窄、左亮右暗、中央稜線。
      for (let y = 0; y < 18; y++) {
        const hw = y < 4 ? 7 + Math.floor(y / 2) : 9 - Math.floor((y - 4) / 4);
        rect(g, 16 - hw - 1, 20 + y, hw * 2 + 2, 1, SILVER.o);
        rect(g, 16 - hw, 20 + y, hw * 2, 1, SILVER.b);
        rect(g, 16 - hw, 20 + y, 2, 1, SILVER.l);
        rect(g, 16 + hw - 2, 20 + y, 2, 1, SILVER.d);
        px(g, 15, 20 + y, SILVER.h);
      }
      rect(g, 12, 19, 8, 2, SILVER.o);
      ellipse(g, 16, 20, 3, 1, '#4a3a48');
      // 胸前金星。
      for (const [x, y] of [[16, 25], [15, 26], [16, 26], [17, 26], [13, 27], [14, 27], [15, 27], [16, 27], [17, 27], [18, 27], [19, 27], [15, 28], [16, 28], [17, 28], [14, 29], [15, 29], [17, 29], [18, 29]]) px(g, x, y, R.gold.b);
      px(g, 16, 26, R.gold.h);
      // 皮帶與金扣。
      rect(g, 8, 35, 16, 3, R.darkWood.o);
      rect(g, 9, 35, 14, 2, R.darkWood.b);
      rect(g, 14, 35, 4, 3, R.gold.o);
      rect(g, 15, 36, 2, 1, R.gold.l);
      // 肩甲。
      orb(g, 7, 22, 4, 3.5, SILVER);
      orb(g, 25, 22, 4, 3.5, SILVER);
      rect(g, 4, 24, 7, 1, SILVER.d);
      rect(g, 22, 24, 7, 1, SILVER.d);
      // 頭盔：紅色羽飾、圓頂、面罩縫與鉚釘。
      for (let k = 0; k < 8; k++) {
        ellipse(g, 17 + k, 3 + Math.floor(k * k / 10), 2.5, 2, R.red.o);
      }
      for (let k = 0; k < 8; k++) {
        ellipse(g, 17 + k, 3 + Math.floor(k * k / 10), 1.5, 1.2, k < 3 ? R.red.l : R.red.b);
      }
      orb(g, 16, 11, 7, 7, SILVER);
      rect(g, 9, 13, 15, 6, SILVER.o);
      rect(g, 10, 13, 13, 5, SILVER.b);
      rect(g, 10, 13, 2, 5, SILVER.l);
      rect(g, 21, 13, 2, 5, SILVER.d);
      rect(g, 11, 14, 11, 1, '#2a2a38');
      rect(g, 15, 14, 2, 4, '#2a2a38');
      px(g, 11, 17, SILVER.h);
      px(g, 21, 17, SILVER.h);
      rect(g, 15, 4, 2, 2, R.gold.b);
    },
  },
  trophyShelf: {
    size: [2, 1], up: 32,
    /**
     * 展示架：深色木櫃配紅絨背板與冰晶玻璃層板，上層放金獎盃、冰晶簇與星星獎牌，下層放銀盾牌、軟墊上的寶石與金王冠，前方兩扇玻璃門。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 62);
      const r = R.darkWood;
      block(g, 2, 6, 60, 3, 52, r, 'wood', 4);
      block(g, 0, 3, 64, 2, 3, r, null);
      rect(g, 26, 0, 12, 3, r.o);
      rect(g, 27, 1, 10, 2, r.l);
      orb(g, 32, 1, 1.5, 1.5, R.gold);
      // 紅絨背板。
      const velvet = ramp('#7a2a3a');
      rect(g, 4, 11, 56, 41, r.o);
      rect(g, 5, 12, 54, 39, velvet.d);
      for (let y = 12; y < 51; y += 2) for (let x = 5 + (y % 4 === 0 ? 1 : 0); x < 59; x += 3) px(g, x, y, velvet.b);
      g.globalAlpha = 0.25;
      ellipse(g, 32, 12, 26, 4, '#fff0c0');
      g.globalAlpha = 1;
      // 冰晶玻璃層板。
      rect(g, 5, 31, 54, 2, ICE.l);
      rect(g, 5, 33, 54, 1, ICE.d);
      // 上層：金獎盃。
      rect(g, 9, 27, 10, 4, r.o);
      rect(g, 10, 27, 8, 3, r.l);
      rect(g, 12, 28, 4, 1, R.gold.l);
      rect(g, 13, 23, 2, 4, R.gold.o);
      rect(g, 11, 22, 6, 2, R.gold.d);
      ellipse(g, 14, 18, 5, 5, R.gold.o);
      rect(g, 9, 13, 11, 5, R.gold.o);
      ellipse(g, 14, 18, 4, 4, R.gold.b);
      rect(g, 10, 14, 9, 4, R.gold.b);
      rect(g, 11, 14, 2, 6, R.gold.l);
      px(g, 11, 15, R.gold.h);
      rect(g, 10, 14, 9, 1, R.gold.h);
      for (const x of [7, 19]) {
        rect(g, x, 15, 3, 5, R.gold.o);
        px(g, x + 1, 16, mix(velvet.d, R.gold.d, 0.2));
        px(g, x + 1, 17, mix(velvet.d, R.gold.d, 0.2));
      }
      // 上層：冰晶簇。
      for (const [x, h, w] of [[29, 10, 3], [32, 14, 4], [36, 9, 3]]) {
        rect(g, x - 1, 30 - h, w + 2, h + 1, ICE.o);
        rect(g, x, 30 - h + 1, w, h, ICE.b);
        rect(g, x, 30 - h + 1, 1, h, ICE.h);
        px(g, x + Math.floor(w / 2), 30 - h, ICE.h);
      }
      rect(g, 27, 29, 13, 2, R.stone.b);
      // 上層：星星獎牌（緞帶）。
      for (let k = 0; k < 8; k++) {
        px(g, 44 + Math.floor(k / 2), 14 + k, R.red.b);
        px(g, 45 + Math.floor(k / 2), 14 + k, R.red.l);
        px(g, 53 - Math.floor(k / 2), 14 + k, R.blue.b);
        px(g, 52 - Math.floor(k / 2), 14 + k, R.blue.l);
      }
      orb(g, 49, 25, 4, 4, R.gold);
      for (const [x, y] of [[49, 23], [48, 24], [49, 24], [50, 24], [47, 25], [48, 25], [49, 25], [50, 25], [51, 25], [48, 26], [50, 26]]) px(g, x, y, R.gold.d);
      // 下層：銀盾牌。
      for (let y = 0; y < 13; y++) {
        const hw = y < 7 ? 5 : 5 - (y - 6);
        rect(g, 14 - hw - 1, 37 + y, hw * 2 + 2, 1, SILVER.o);
        rect(g, 14 - hw, 37 + y, hw * 2, 1, SILVER.b);
        px(g, 14 - hw, 37 + y, SILVER.h);
      }
      rect(g, 13, 38, 2, 10, R.red.b);
      rect(g, 10, 41, 8, 2, R.red.b);
      // 下層：軟墊上的藍寶石。
      cushion(g, 26, 45, 12, 5, R.red);
      for (let y = 0; y < 7; y++) {
        const hw = y < 2 ? 2 + y : 4 - Math.floor((y - 2) * 0.8);
        rect(g, 32 - hw, 38 + y, hw * 2, 1, y < 2 ? R.blue.l : R.blue.b);
      }
      px(g, 30, 39, '#ffffff');
      // 下層：金王冠。
      rect(g, 43, 44, 13, 6, R.gold.o);
      rect(g, 44, 45, 11, 4, R.gold.b);
      rect(g, 44, 45, 11, 1, R.gold.l);
      for (const x of [44, 49, 54]) {
        rect(g, x - 1, 40, 3, 5, R.gold.o);
        px(g, x, 41, R.gold.l);
        px(g, x, 42, R.gold.b);
      }
      px(g, 47, 47, R.red.l);
      px(g, 51, 47, R.blue.l);
      // 底層隔板與兩扇玻璃門。
      rect(g, 5, 50, 54, 2, r.l);
      rect(g, 4, 11, 56, 1, r.b);
      rect(g, 31, 11, 2, 41, r.b);
      px(g, 31, 11, r.l);
      shine(g, 5, 12, 26, 38);
      shine(g, 33, 12, 26, 38);
      knob(g, 28, 30);
      knob(g, 34, 30);
      // 下方抽屜與名牌。
      rect(g, 4, 52, 56, 5, r.o);
      rect(g, 5, 53, 54, 3, r.b);
      rect(g, 5, 53, 54, 1, r.l);
      rect(g, 28, 54, 8, 2, R.brass.b);
      px(g, 28, 54, R.brass.h);
    },
  },
  // ── 庭院家具 ──
  bench: {
    size: [2, 1], up: 14,
    /**
     * 長椅：公園風格，三條木椅背、木條座面、黑鐵捲花扶手與椅腳。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 60);
      // 鐵製後柱與椅背木條。
      post(g, 6, 6, 3, 22, R.iron);
      post(g, 55, 6, 3, 22, R.iron);
      for (const [y, s] of [[6, 1], [11, 2], [16, 3]]) block(g, 3, y, 58, 1, 3, R.wood, 'wood', s);
      // 座面（三片木條）與前緣。
      block(g, 2, 24, 60, 8, 3, R.wood, 'wood', 5);
      for (const y of [27, 30]) rect(g, 2, y, 60, 1, R.wood.d);
      for (let x = 2; x < 62; x += 12) px(g, x + 5, 25, R.wood.h);
      // 前腳與捲花扶手。
      post(g, 5, 35, 3, 8, R.iron);
      post(g, 56, 35, 3, 8, R.iron);
      for (const [x, d] of [[3, 1], [57, -1]]) {
        rect(g, x, 18, 5, 2, R.iron.o);
        rect(g, x + (d > 0 ? 0 : 1), 18, 4, 1, R.iron.l);
        rect(g, x + (d > 0 ? 0 : 4), 18, 1, 8, R.iron.o);
        ellipse(g, x + 2, 23, 2, 2, R.iron.o);
        px(g, x + 2, 23, R.iron.l);
      }
      // 後方支撐橫桿。
      rect(g, 8, 39, 48, 1, R.iron.o);
    },
  },
  picnicTable: {
    size: [2, 1], up: 10,
    /**
     * 野餐桌：後方長凳、木條桌面中央鋪紅白格紋桌巾（頂面可放東西）、交叉 A 字桌腳與前方長凳。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 62);
      // 後凳。
      block(g, 4, 6, 56, 3, 2, R.wood, 'wood', 1);
      // A 字桌腳。
      for (const x of [10, 52]) {
        pole(g, x - 1, 26, x - 6, 39, 2, R.darkWood);
        pole(g, x + 1, 26, x + 6, 39, 2, R.darkWood);
      }
      // 桌面（三片木條）。
      block(g, 2, 12, 60, 12, 3, R.wood, 'wood', 2);
      for (const y of [16, 20]) rect(g, 2, y, 60, 1, R.wood.d);
      // 格紋桌巾（垂在前方，下緣波浪）。
      rect(g, 21, 12, 22, 16, R.red.o);
      gingham(g, 22, 12, 20, 15, R.red);
      rect(g, 22, 12, 20, 1, R.red.h);
      rect(g, 22, 24, 20, 1, R.red.d);
      for (let x = 22; x < 42; x += 4) {
        px(g, x, 27, R.red.o);
        px(g, x + 3, 27, R.red.o);
      }
      // 前凳與凳腳。
      block(g, 2, 31, 60, 3, 3, R.wood, 'wood', 7);
      for (const x of [6, 56]) post(g, x, 38, 2, 2, R.darkWood);
    },
  },
  swing: {
    size: [2, 1], up: 36, frames: 4,
    /**
     * 鞦韆：兩組 A 字木支架與橫梁，掛著兩條麻繩與紅坐墊木板（4 幀前後擺動），左支架纏著綠藤小花。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      shadow(g, 32, H - 2, 62);
      const sx = [0, 2, 0, -2][f];
      const sy = [0, -1, 0, -1][f];
      // 坐墊在地上的影子（跟著擺動）。
      g.globalAlpha = 0.14;
      ellipse(g, 32 + sx, H - 6, 14, 2, '#000000');
      g.globalAlpha = 1;
      // 支架（後腳較細、前腳較粗）。
      for (const x of [6, 56]) {
        pole(g, x, 6, x - 4, H - 4, 3, R.wood);
        pole(g, x, 6, x + 4, H - 4, 3, R.wood);
      }
      rect(g, 3, 44, 7, 2, R.wood.o);
      rect(g, 55, 44, 7, 2, R.wood.o);
      block(g, 1, 3, 62, 2, 4, R.wood, 'wood', 1);
      // 掛環與麻繩。
      const seatY = 50 + sy;
      for (const x0 of [20, 44]) {
        rect(g, x0 - 1, 8, 3, 2, R.iron.b);
        for (let y = 10; y < seatY; y++) {
          const x = Math.round(x0 + (sx * (y - 10)) / (seatY - 10));
          px(g, x, y, y % 3 === 0 ? R.cream.d : R.cream.b);
          px(g, x + 1, y, R.sand.d);
        }
      }
      // 坐板與紅坐墊。
      block(g, 15 + sx, seatY, 34, 2, 3, R.darkWood, 'wood', 3);
      cushion(g, 18 + sx, seatY - 3, 28, 4, R.red);
      // 藤蔓與小花。
      for (let y = 14; y < 56; y += 5) {
        px(g, 4 + ((y >> 2) % 2) - Math.floor((y - 6) / 13), y, R.leaf.d);
        ellipse(g, 5 - Math.floor((y - 6) / 13) + ((y >> 2) % 2 ? 1 : -1), y + 2, 1.5, 1.2, R.leaf.b);
      }
      for (const [x, y, c] of [[5, 20, '#f08ab0'], [3, 33, '#f0e040'], [2, 46, '#f08ab0']]) {
        px(g, x, y, c);
        px(g, x + 1, y + 1, c);
        px(g, x - 1, y + 1, c);
        px(g, x, y + 2, c);
        px(g, x, y + 1, '#fff6c0');
      }
    },
  },
  well: {
    size: [1, 1], up: 32,
    /**
     * 水井：圓形石砌井身（弧形石縫、青苔）、井口水面、兩根木柱撐起紅瓦屋頂、纏著麻繩的捲軸與搖把、吊著的小木桶。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      // 井口與水面。
      ellipse(g, 16, 40, 15, 6, R.stone.o);
      ellipse(g, 16, 40, 14, 5, R.stone.l);
      ellipse(g, 16, 40, 11, 3.5, R.stone.d);
      ellipse(g, 16, 41, 10, 2.5, R.water.d);
      rect(g, 11, 41, 4, 1, R.water.l);
      // 木柱、捲軸、麻繩與搖把。
      post(g, 4, 12, 3, 30, R.wood);
      post(g, 25, 12, 3, 30, R.wood);
      rect(g, 6, 20, 20, 3, R.darkWood.o);
      rect(g, 7, 21, 18, 1, R.darkWood.l);
      rect(g, 11, 19, 10, 5, R.cream.o);
      for (let x = 11; x < 21; x += 2) {
        rect(g, x, 20, 1, 3, R.cream.b);
        rect(g, x + 1, 20, 1, 3, R.cream.d);
      }
      rect(g, 28, 21, 3, 1, R.iron.o);
      rect(g, 30, 21, 1, 6, R.iron.o);
      rect(g, 29, 26, 3, 2, R.darkWood.b);
      rect(g, 16, 24, 1, 8, R.cream.d);
      // 小木桶。
      rect(g, 12, 31, 9, 7, R.wood.o);
      rect(g, 13, 32, 7, 5, R.wood.b);
      rect(g, 13, 32, 2, 5, R.wood.l);
      rect(g, 12, 33, 9, 1, R.iron.b);
      rect(g, 12, 36, 9, 1, R.iron.b);
      rect(g, 13, 31, 7, 1, R.water.b);
      // 紅瓦屋頂：三角屋面、瓦片排與屋脊。
      for (let y = 0; y < 14; y++) {
        const hw = 3 + Math.floor(y * 1.05);
        rect(g, 16 - hw - 1, 1 + y, hw * 2 + 2, 1, R.red.o);
        if (y > 0) {
          rect(g, 16 - hw, 1 + y, hw, 1, R.red.l);
          rect(g, 16, 1 + y, hw, 1, R.red.b);
        }
        if (y % 3 === 2) {
          rect(g, 16 - hw, 1 + y, hw * 2, 1, R.red.d);
          for (let x = 16 - hw + (y % 2) * 2; x < 16 + hw; x += 4) px(g, x, y, R.red.d);
        }
      }
      rect(g, 15, 0, 2, 15, R.red.h);
      px(g, 16, 0, R.red.o);
      rect(g, 1, 15, 30, 2, R.darkWood.o);
      rect(g, 2, 15, 28, 1, R.darkWood.l);
      // 石砌井身：弧形石縫、左亮右暗、青苔。
      for (let y = 40; y < 58; y++) {
        const bottom = y > 54 ? Math.round(14 * Math.sqrt(Math.max(0, 1 - ((y - 54) / 4) ** 2))) : 14;
        rect(g, 16 - bottom - 1, y, bottom * 2 + 2, 1, R.stone.o);
        rect(g, 16 - bottom, y, bottom * 2, 1, R.stone.b);
        rect(g, 16 - bottom, y, 3, 1, R.stone.l);
        rect(g, 16 + bottom - 3, y, 3, 1, R.stone.d);
      }
      for (let row = 0; row < 3; row++) {
        const base = 45 + row * 5;
        for (let x = 3; x < 29; x++) {
          const t = (x - 16) / 14;
          px(g, x, base + Math.round(2 * (1 - t * t)), R.stone.d);
        }
        for (let x = 6 + (row % 2) * 4; x < 28; x += 8) {
          const t = (x - 16) / 14;
          const y0 = base - 4 + Math.round(2 * (1 - t * t));
          rect(g, x, y0 + 1, 1, 4, R.stone.d);
          px(g, x + 1, y0 + 1, R.stone.h);
        }
      }
      stoneGrain(g, 4, 42, 24, 12, R.stone, 7);
      ellipse(g, 16, 41, 15, 1.5, R.stone.l);
      ellipse(g, 16, 41, 11, 1, R.stone.d);
      for (const [x, y] of [[5, 56], [6, 55], [7, 56], [22, 50], [23, 49]]) px(g, x, y, R.leaf.b);
    },
  },
  doghouse: {
    size: [1, 1], up: 22,
    /**
     * 狗屋：直條木板牆、紅色斜屋頂、門上掛骨頭名牌、拱形門裡探出頭的小狗，門邊一碗狗糧。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      const w = R.lightWood;
      // 五角形牆面與直條木板。
      for (let y = 8; y < 50; y++) {
        const hw = y < 26 ? Math.round((12 * (y - 8)) / 18) : 12;
        rect(g, 16 - hw - 1, y, hw * 2 + 2, 1, w.o);
        rect(g, 16 - hw, y, hw * 2, 1, w.b);
        for (let x = 16 - hw + 3; x < 16 + hw; x += 4) px(g, x, y, w.d);
        if (hw > 1) px(g, 16 - hw, y, w.l);
      }
      woodGrain(g, 5, 28, 22, 20, w, 3);
      rect(g, 4, 48, 24, 2, w.d);
      // 紅屋頂：兩道斜板、瓦片刻痕與屋脊。
      const r = R.red;
      for (let y = 4; y < 29; y++) {
        const off = Math.round(((y - 4) * 15) / 24);
        for (const s of [-1, 1]) {
          const x0 = s < 0 ? 16 - off - 2 : 16 + off - 4;
          rect(g, x0 - 1, y, 8, 1, r.o);
          rect(g, x0, y, 6, 1, s < 0 ? r.l : r.b);
          if (y % 4 === 0) rect(g, x0, y, 6, 1, r.d);
          px(g, s < 0 ? x0 : x0 + 5, y, s < 0 ? r.h : r.d);
        }
      }
      rect(g, 14, 3, 4, 3, r.o);
      rect(g, 15, 3, 2, 2, r.h);
      // 拱形門洞與小狗。
      ellipse(g, 16, 36, 7, 6, w.o);
      rect(g, 9, 36, 15, 14, w.o);
      ellipse(g, 16, 36, 6, 5, HOLE);
      rect(g, 10, 36, 13, 13, HOLE);
      const dog = ramp('#c8925a');
      ellipse(g, 11, 42, 2, 4, dog.d);
      ellipse(g, 21, 42, 2, 4, dog.d);
      orb(g, 16, 42, 5, 4, dog);
      ellipse(g, 16, 45, 3, 2, R.cream.l);
      px(g, 14, 41, '#1a1020');
      px(g, 18, 41, '#1a1020');
      px(g, 14, 40, '#ffffff');
      rect(g, 15, 44, 2, 1, '#1a1020');
      px(g, 16, 46, '#e05a7a');
      rect(g, 11, 47, 11, 2, dog.b);
      rect(g, 12, 47, 2, 1, dog.l);
      rect(g, 19, 47, 2, 1, dog.l);
      // 骨頭名牌。
      rect(g, 11, 24, 10, 5, R.darkWood.o);
      rect(g, 12, 25, 8, 3, R.darkWood.l);
      rect(g, 14, 26, 4, 1, R.white.l);
      for (const x of [13, 18]) {
        px(g, x, 25, R.white.l);
        px(g, x, 27, R.white.l);
      }
      // 狗糧碗。
      ellipse(g, 26, 50, 5, 2.5, R.blue.o);
      rect(g, 21, 48, 11, 3, R.blue.o);
      rect(g, 22, 48, 9, 2, R.blue.b);
      rect(g, 22, 48, 3, 1, R.blue.l);
      ellipse(g, 26, 48, 4, 1.2, '#8a5a30');
      for (const x of [24, 26, 28]) px(g, x, 47, '#b07840');
    },
  },
  gazebo: {
    size: [2, 2], up: 44,
    /**
     * 涼亭（2×2）：石砌基座上的木板平台、正面台階、四根木柱與欄杆、後方長椅、紅白布幔的瓦頂與金色頂飾、中央吊著一籃花。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 64);
      // 石基座與木板平台。
      block(g, 2, 66, 60, 30, 8, R.stone, 'stone', 3);
      bricks(g, 2, 97, 59, 7, R.stone, 10, 4);
      rect(g, 3, 67, 58, 28, R.lightWood.b);
      for (let y = 67; y < 95; y += 4) {
        rect(g, 3, y + 3, 58, 1, R.lightWood.d);
        px(g, 3 + Math.floor(hash(y, 1) * 50), y + 1, R.lightWood.d);
        rect(g, 3, y, 58, 1, R.lightWood.l);
      }
      rect(g, 3, 67, 58, 1, R.lightWood.h);
      // 正面台階。
      block(g, 22, 101, 20, 2, 4, R.stone, 'stone', 6);
      // 後方柱子、後欄杆與長椅。
      post(g, 9, 30, 3, 40, R.wood);
      post(g, 52, 30, 3, 40, R.wood);
      rect(g, 12, 54, 40, 2, R.wood.o);
      rect(g, 12, 54, 40, 1, R.wood.l);
      for (let x = 14; x < 52; x += 4) rect(g, x, 56, 1, 12, R.wood.d);
      block(g, 14, 62, 36, 3, 3, R.wood, 'wood', 4);
      for (const x of [16, 46]) rect(g, x, 68, 2, 3, R.wood.d);
      // 前方柱子與左右欄杆（中間留入口）。
      post(g, 3, 34, 4, 62, R.wood);
      post(g, 57, 34, 4, 62, R.wood);
      for (const [x0, x1] of [[7, 22], [42, 57]]) {
        for (let x = x0 + 2; x < x1; x += 4) post(g, x, 82, 1, 12, R.lightWood);
        block(g, x0, 79, x1 - x0, 1, 2, R.wood, null);
        rect(g, x0, 92, x1 - x0, 2, R.wood.o);
      }
      // 屋頂：瓦片列、左亮右暗。
      for (let y = 0; y < 28; y++) {
        const hw = Math.min(32, 3 + Math.floor(y * 1.12));
        const yy = 4 + y;
        rect(g, 32 - hw, yy, hw * 2, 1, R.clay.o);
        if (hw > 1) {
          rect(g, 32 - hw + 1, yy, hw - 1, 1, R.clay.l);
          rect(g, 32, yy, hw - 1, 1, R.clay.b);
        }
        if (y % 4 === 3) {
          rect(g, 32 - hw + 1, yy, hw * 2 - 2, 1, R.clay.d);
          for (let x = 32 - hw + 2 + (y % 8 === 3 ? 2 : 0); x < 32 + hw - 1; x += 5) px(g, x, yy - 1, R.clay.d);
        }
      }
      rect(g, 31, 6, 2, 26, R.clay.h);
      // 屋簷橫木與紅白布幔。
      block(g, 0, 31, 64, 1, 3, R.darkWood, 'wood', 2);
      for (let k = 0; k < 8; k++) {
        const c = k % 2 ? R.cream : R.red;
        const x = k * 8;
        for (let j = 0; j < 5; j++) rect(g, x + j, 35 + j, 8 - j * 2, 1, j === 0 ? c.l : c.b);
        px(g, x + 3, 39, c.o);
        px(g, x + 4, 39, c.o);
      }
      // 頂飾。
      rect(g, 31, 0, 2, 5, R.gold.o);
      orb(g, 32, 3, 2, 2, R.gold);
      // 吊花籃。
      rect(g, 32, 40, 1, 8, R.iron.b);
      ellipse(g, 32, 50, 5, 3, R.sand.o);
      ellipse(g, 32, 49, 4, 2, R.sand.b);
      foliage(g, 32, 47, 4, R.leaf, 6);
      for (const [x, y, c] of [[29, 46, '#f08ab0'], [34, 45, '#f0e040'], [32, 48, '#e05a7a']]) {
        px(g, x, y, c);
        px(g, x + 1, y, c);
      }
    },
  },
};
