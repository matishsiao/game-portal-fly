// 家園美術：臥室、客廳、浴室家具（繪製規則見 homeDraw.js 開頭說明，格式同 homeArt.js 的 HOME_ART）。

import { R, ramp, mix, rect, px, hash, ellipse, orb, shadow, woodGrain, weave, block, cushion, post, glass } from '../homeDraw.js';

/** 本分組專用的色階（木色、布料與陶瓷）。 */
const C = {
  pine: ramp('#c8935a'),
  honey: ramp('#c08850'),
  cherry: ramp('#9a5a36'),
  walnut: ramp('#7a4a2e'),
  pink: ramp('#f08ab0'),
  lilac: ramp('#c4a0e0'),
  teal: ramp('#4f8a7a'),
  velvet: ramp('#5b78c4'),
  orange: ramp('#e08a3a'),
  porcelain: ramp('#eef0f2'),
  aqua: ramp('#7ab8c8'),
  marble: ramp('#e4e0d8'),
  silk: ramp('#f0e2c4'),
  mirror: ramp('#a8d4ec'),
};

/**
 * 內凹的門板或抽屜面：外圈刻線、左上亮緣、右下暗緣。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
function panel(g, x, y, w, h, r) {
  rect(g, x, y, w, h, mix(r.d, r.o, 0.5));
  rect(g, x + 1, y + 1, w - 2, h - 2, r.b);
  rect(g, x + 1, y + 1, w - 2, 1, r.l);
  rect(g, x + 1, y + 1, 1, h - 2, r.l);
  rect(g, x + 1, y + h - 2, w - 2, 1, r.d);
  rect(g, x + w - 2, y + 1, 1, h - 2, r.d);
}

/**
 * 2 × 2 的黃銅圓把手（外框、本體與高光點）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左上 x。
 * @param {number} y 左上 y。
 */
function knob(g, x, y) {
  rect(g, x - 1, y, 4, 2, R.brass.o);
  rect(g, x, y - 1, 2, 4, R.brass.o);
  rect(g, x, y, 2, 2, R.brass.b);
  px(g, x, y, R.gold.h);
}

/**
 * 橫向的黃銅拉把（兩端固定座）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左 x。
 * @param {number} y y。
 * @param {number} w 寬。
 */
function pull(g, x, y, w) {
  rect(g, x - 1, y - 1, w + 2, 3, R.brass.o);
  rect(g, x, y, w, 1, R.brass.l);
  px(g, x, y, R.gold.h);
  px(g, x, y + 1, R.brass.d);
  px(g, x + w - 1, y + 1, R.brass.d);
}

/**
 * 小愛心（5 × 4 像素）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左上 x。
 * @param {number} y 左上 y。
 * @param {string} c 顏色。
 */
function heart(g, x, y, c) {
  rect(g, x, y, 2, 1, c);
  rect(g, x + 3, y, 2, 1, c);
  rect(g, x, y + 1, 5, 1, c);
  rect(g, x + 1, y + 2, 3, 1, c);
  px(g, x + 2, y + 3, c);
}

/**
 * 橢圓形桌面：外框、厚度側面、頂面、年輪紋與左上反光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 頂面中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {number} t 厚度。
 * @param {object} r 色階。
 */
function ovalTop(g, cx, cy, rx, ry, t, r) {
  ellipse(g, cx, cy + t, rx + 1, ry + 1, r.o);
  ellipse(g, cx, cy, rx + 1, ry + 1, r.o);
  ellipse(g, cx, cy + t, rx, ry, r.d);
  ellipse(g, cx, cy + t - 1, rx, ry, r.b);
  ellipse(g, cx, cy, rx, ry, r.l);
  for (let y = Math.ceil(cy - ry) + 1; y < cy + ry - 1; y += 2) {
    const half = rx * Math.sqrt(Math.max(0, 1 - ((y + 0.5 - cy) / ry) ** 2)) - 2;
    for (let x = Math.round(cx - half); x < cx + half; x++) if (hash(x >> 2, y, 5) < 0.55) px(g, x, y, mix(r.l, r.b, 0.55));
  }
  ellipse(g, cx - rx * 0.4, cy - ry * 0.45, rx * 0.35, 1, r.h);
}

/** 臥室、客廳、浴室家具的繪製方式（代碼 → { size, up, frames?, draw }）。 */
export const ART = {
  // ── 臥室 ──
  bunkBed: {
    size: [1, 2], up: 30,
    /**
     * 雙層床：松木床架、上下兩層床墊與被子、上層護欄與前方梯子。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.pine;
      shadow(g, 16, H - 2, 32);
      // 下層：床頭板、床架、床墊、枕頭與橘色格紋被。
      block(g, 3, 40, 26, 2, 9, w, 'wood', 2);
      block(g, 2, 50, 28, 32, 5, w, 'wood', 4);
      cushion(g, 4, 51, 24, 30, R.white);
      cushion(g, 7, 53, 18, 7, R.cream);
      cushion(g, 4, 62, 24, 19, C.orange);
      rect(g, 4, 62, 24, 3, R.white.b);
      rect(g, 4, 65, 24, 1, C.orange.d);
      for (let x = 7; x < 27; x += 5) rect(g, x, 66, 1, 14, C.orange.l);
      for (let y = 70; y < 80; y += 5) rect(g, 5, y, 22, 1, C.orange.l);
      // 上層的陰影投在下層床頭。
      g.globalAlpha = 0.35;
      rect(g, 3, 38, 26, 7, '#1a1020');
      g.globalAlpha = 1;
      // 上層：床頭板、床架、床墊、枕頭與綠色星星被。
      block(g, 3, 4, 26, 2, 8, w, 'wood', 6);
      block(g, 2, 13, 28, 21, 4, w, 'wood', 8);
      cushion(g, 4, 14, 24, 19, R.white);
      cushion(g, 7, 15, 18, 6, R.cream);
      cushion(g, 4, 22, 24, 11, R.green);
      rect(g, 4, 22, 24, 2, R.white.b);
      rect(g, 4, 24, 24, 1, R.green.d);
      for (const [x, y] of [[8, 27], [16, 29], [23, 26]]) {
        px(g, x, y, R.gold.h);
        px(g, x - 1, y, R.gold.b);
        px(g, x + 1, y, R.gold.b);
        px(g, x, y - 1, R.gold.b);
        px(g, x, y + 1, R.gold.b);
      }
      // 上層護欄：前緣一根細橫木。
      rect(g, 3, 31, 19, 3, w.o);
      rect(g, 4, 32, 17, 1, w.l);
      // 梯子：靠右側，一根側軌搭配右床柱，中間是踏階。
      post(g, 22, 13, 2, 75, w);
      for (let y = 18; y < 88; y += 7) {
        rect(g, 22, y - 1, 7, 4, w.o);
        rect(g, 24, y, 4, 1, w.l);
        rect(g, 24, y + 1, 4, 1, w.b);
      }
      // 四角床柱與柱頭。
      for (const x of [1, 28]) {
        post(g, x, 3, 3, 87, w);
        rect(g, x - 1, 1, 5, 3, w.o);
        rect(g, x, 1, 3, 2, w.l);
        px(g, x, 1, w.h);
      }
    },
  },
  princessBed: {
    size: [2, 2], up: 40,
    /**
     * 公主床：皇冠頂的粉紅床幔、綁起來的紗簾、白色雕花床頭與愛心被子。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const wh = R.white;
      const p = C.pink;
      const l = C.lilac;
      shadow(g, 32, H - 2, 64);
      // 後方床柱與背後的紫色床幔（垂直皺褶）。
      for (const x of [5, 56]) post(g, x, 10, 3, 46, wh);
      rect(g, 7, 12, 50, 30, l.o);
      for (let x = 8; x < 56; x++) {
        const k = (x - 8) % 6;
        rect(g, x, 12, 1, 29, k < 2 ? l.l : k < 4 ? l.b : l.d);
      }
      // 白色拱形床頭板：金邊、粉紅軟墊與愛心。
      ellipse(g, 32, 40, 25, 15, wh.o);
      ellipse(g, 32, 40, 24, 14, wh.b);
      ellipse(g, 31, 39, 22, 12, wh.l);
      ellipse(g, 32, 41, 20, 11, R.gold.d);
      ellipse(g, 32, 41, 19, 10, p.b);
      weave(g, 14, 32, 36, 12, p);
      ellipse(g, 28, 36, 8, 2, p.l);
      heart(g, 30, 34, R.gold.l);
      px(g, 31, 34, R.gold.h);
      // 床架、床墊、枕頭。
      block(g, 4, 46, 56, 44, 6, wh, null);
      for (let x = 8; x < 58; x += 8) px(g, x, 93, R.gold.b);
      rect(g, 4, 91, 56, 1, R.gold.b);
      cushion(g, 6, 47, 52, 42, wh);
      cushion(g, 9, 49, 20, 9, R.cream);
      cushion(g, 35, 49, 20, 9, R.cream);
      cushion(g, 26, 53, 12, 7, p);
      heart(g, 30, 55, p.h);
      // 粉紅被子：反摺床單、愛心圖案與蕾絲下襬。
      cushion(g, 6, 62, 52, 26, p);
      rect(g, 6, 62, 52, 4, wh.l);
      rect(g, 6, 65, 52, 1, wh.d);
      rect(g, 6, 66, 52, 1, p.d);
      for (let y = 70; y < 86; y += 7) for (let x = 11 + ((y / 7) % 2) * 6; x < 52; x += 12) heart(g, x, y, p.l);
      for (let x = 6; x < 58; x += 4) {
        rect(g, x, 88, 3, 2, wh.l);
        px(g, x + 1, 90, wh.b);
      }
      // 頂篷：皇冠、布篷與扇形垂邊。
      rect(g, 26, 1, 12, 7, R.gold.o);
      rect(g, 27, 3, 10, 4, R.gold.b);
      for (const x of [27, 31, 35]) rect(g, x, 1, 2, 2, R.gold.l);
      rect(g, 27, 3, 10, 1, R.gold.l);
      px(g, 32, 5, '#e05a7a');
      px(g, 29, 5, R.blue.l);
      px(g, 35, 5, R.blue.l);
      block(g, 2, 7, 60, 4, 3, p, 'cloth');
      for (let x = 2; x < 62; x += 6) {
        ellipse(g, x + 3, 14, 4, 3, p.o);
        ellipse(g, x + 3, 14, 3, 2, p.b);
        px(g, x + 2, 13, p.l);
        px(g, x + 3, 16, wh.l);
      }
      // 前方床柱與金色柱頭。
      for (const x of [2, 59]) {
        post(g, x, 12, 3, 86, wh);
        orb(g, x + 1, 99, 2, 1, R.gold);
      }
      // 前方紗簾：從頂篷垂下，用金色緞帶在中段綁起。
      for (const [x0, dir] of [[3, 1], [61, -1]]) {
        for (let y = 16; y < 74; y++) {
          const t = y < 42 ? 10 - Math.round(((y - 16) / 26) * 7) : 3 + Math.round(((y - 42) / 32) * 5);
          const xs = dir > 0 ? x0 : x0 - t;
          rect(g, xs - 1, y, t + 2, 1, l.o);
          rect(g, xs, y, t, 1, l.b);
          px(g, dir > 0 ? xs : xs + t - 1, y, l.l);
          if (t > 4) px(g, xs + Math.floor(t / 2), y, l.d);
        }
        rect(g, dir > 0 ? x0 : x0 - 7, 74, 7, 1, l.o);
        const tx = dir > 0 ? x0 - 1 : x0 - 5;
        rect(g, tx, 40, 6, 4, R.gold.o);
        rect(g, tx + 1, 41, 4, 2, R.gold.l);
        px(g, tx + 1, 41, R.gold.h);
      }
    },
  },
  hammock: {
    size: [2, 1], up: 16,
    /**
     * 吊床：兩根木柱、繩索、彩色條紋布兜、流蘇與小枕頭。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = R.wood;
      shadow(g, 32, H - 3, 54);
      // 木柱與底座。
      for (const x of [3, 57]) {
        post(g, x, 4, 4, 38, w);
        rect(g, x - 1, 2, 6, 3, w.o);
        rect(g, x, 2, 4, 2, w.l);
        block(g, x - 3, 40, 10, 2, 3, w, null);
      }
      // 吊床的弧線：後緣較高、前緣下垂較深，中間看得到布兜內面。
      /**
       * 依 x 算出布兜後緣的 y。
       * @param {number} x x。
       * @returns {number} 後緣 y。
       */
      const back = (x) => Math.round(13 + 6 * (1 - ((x - 32) / 21) ** 2));
      /**
       * 依 x 算出布兜前緣的 y。
       * @param {number} x x。
       * @returns {number} 前緣 y。
       */
      const front = (x) => Math.round(18 + 16 * (1 - ((x - 32) / 21) ** 2));
      // 繩索：從柱頂拉到兩端的撐桿（扇形三條）。
      for (let k = 0; k <= 5; k++) {
        for (const [dy, sl] of [[7, 1.2], [9, 1.0], [11, 0.8]]) {
          px(g, 7 + k, dy + Math.round(k * sl), R.cream.d);
          px(g, 56 - k, dy + Math.round(k * sl), R.cream.d);
        }
      }
      // 布兜：沿著弧線的長條紋（紅、奶油、藍、奶油、金），後緣與前緣有外框。
      const stripes = [R.red, R.cream, C.velvet, R.cream, R.gold];
      for (let x = 12; x <= 52; x++) {
        const y0 = back(x);
        const y1 = front(x);
        rect(g, x, y0 - 1, 1, y1 - y0 + 5, R.black.o);
        for (let y = y0; y <= y1; y++) {
          const s = stripes[Math.min(4, Math.floor(((y - y0) / Math.max(1, y1 - y0 + 1)) * 5))];
          const shade = x > 40 ? s.d : x < 22 ? s.l : s.b;
          px(g, x, y, y === y0 ? s.d : shade);
        }
        // 前緣的布邊（外側，較暗）與流蘇。
        px(g, x, y1 + 1, R.red.l);
        px(g, x, y1 + 2, R.red.d);
        if (x % 2 === 0) rect(g, x, y1 + 3, 1, 2 + (x % 4 === 0 ? 1 : 0), R.cream.d);
      }
      // 兩端撐桿。
      for (const x of [11, 52]) {
        rect(g, x - 1, back(x) - 3, 3, front(x) - back(x) + 7, w.o);
        rect(g, x, back(x) - 2, 1, front(x) - back(x) + 5, w.l);
      }
      // 躺在布兜裡的小枕頭。
      cushion(g, 15, 17, 9, 6, R.white);
      px(g, 17, 19, R.blue.l);
      px(g, 21, 20, R.blue.l);
    },
  },
  wardrobe: {
    size: [2, 1], up: 34,
    /**
     * 衣櫃：頂飾線板、雙開門（內凹門板、黃銅把手）、下方長抽屜與櫃腳，門縫露出一角圍巾。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.cherry;
      shadow(g, 32, H - 2, 62);
      for (const x of [5, 55]) post(g, x, 58, 4, 5, w);
      block(g, 3, 8, 58, 3, 50, w, 'wood', 3);
      // 頂飾線板與中央金色飾片。
      block(g, 1, 2, 62, 4, 3, w, 'wood', 1);
      rect(g, 2, 9, 60, 1, w.d);
      rect(g, 29, 3, 6, 3, R.gold.o);
      rect(g, 30, 3, 4, 2, R.gold.l);
      px(g, 30, 3, R.gold.h);
      // 兩扇門：上下兩塊內凹門板。
      for (const x of [5, 33]) {
        panel(g, x, 13, 26, 36, w);
        panel(g, x + 3, 16, 20, 18, w);
        panel(g, x + 3, 37, 20, 9, w);
        woodGrain(g, x + 5, 18, 16, 14, w, x);
      }
      rect(g, 31, 12, 2, 38, w.o);
      // 門縫露出的紅色圍巾。
      rect(g, 31, 38, 2, 6, R.red.b);
      px(g, 31, 38, R.red.l);
      rect(g, 30, 43, 4, 3, R.red.o);
      rect(g, 31, 43, 2, 2, R.red.b);
      knob(g, 28, 30);
      knob(g, 34, 30);
      // 下方長抽屜。
      panel(g, 5, 51, 54, 6, w);
      pull(g, 14, 53, 6);
      pull(g, 44, 53, 6);
    },
  },
  dresser: {
    size: [1, 1], up: 12,
    /**
     * 五斗櫃：上排兩個小抽屜、下方三個寬抽屜，黃銅把手與圓球櫃腳；頂面留空可擺小物。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.honey;
      shadow(g, 16, H - 2, 30);
      for (const x of [3, 26]) {
        orb(g, x + 1.5, 40.5, 2, 1.5, w);
      }
      block(g, 1, 6, 30, 6, 32, w, 'wood', 5);
      rect(g, 1, 12, 30, 1, w.l);
      // 上排兩個小抽屜。
      panel(g, 3, 14, 13, 5, w);
      panel(g, 16, 14, 13, 5, w);
      knob(g, 9, 16);
      knob(g, 22, 16);
      // 下方三個寬抽屜。
      for (let k = 0; k < 3; k++) {
        const y = 20 + k * 5;
        panel(g, 3, y, 26, 5, w);
        pull(g, 7, y + 2, 4);
        pull(g, 21, y + 2, 4);
      }
      rect(g, 2, 36, 28, 1, w.d);
    },
  },
  vanity: {
    size: [1, 1], up: 28,
    /**
     * 梳妝台：金框橢圓鏡、桌上香水瓶與梳子、前方小抽屜與彎腳。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = R.white;
      shadow(g, 16, H - 2, 30);
      // 鏡架與橢圓鏡（金框、鏡面反光）。
      for (const x of [5, 25]) post(g, x, 14, 2, 18, w);
      ellipse(g, 16, 15, 11, 14, R.gold.o);
      ellipse(g, 16, 15, 10, 13, R.gold.b);
      ellipse(g, 15, 14, 9, 12, R.gold.l);
      ellipse(g, 16, 15, 8, 11, R.gold.d);
      ellipse(g, 16, 15, 7, 10, C.mirror.b);
      ellipse(g, 15, 13, 5, 7, C.mirror.l);
      for (let k = 0; k < 6; k++) px(g, 12 + k, 18 - k, '#ffffff');
      for (let k = 0; k < 3; k++) px(g, 16 + k, 21 - k, '#ffffff');
      // 鏡頂蝴蝶結。
      rect(g, 12, 0, 8, 4, C.pink.o);
      rect(g, 13, 1, 2, 2, C.pink.l);
      rect(g, 17, 1, 2, 2, C.pink.b);
      rect(g, 15, 1, 2, 2, C.pink.d);
      // 桌面、抽屜與桌腳。
      for (const x of [3, 26]) {
        post(g, x, 44, 3, 13, w);
        px(g, x + (x < 16 ? -1 : 3), 55, w.o);
      }
      block(g, 1, 30, 30, 6, 13, w, null);
      rect(g, 1, 42, 30, 1, C.pink.b);
      panel(g, 4, 37, 24, 5, C.pink);
      knob(g, 15, 39);
      // 桌上：紫色香水瓶、口紅與梳子。
      orb(g, 7, 31, 2.5, 2.5, R.purple);
      rect(g, 6, 27, 3, 2, R.gold.b);
      rect(g, 22, 31, 7, 2, C.walnut.b);
      for (let x = 22; x < 29; x += 2) px(g, x, 30, C.walnut.d);
      rect(g, 13, 29, 2, 4, R.gold.d);
      rect(g, 13, 28, 2, 1, R.red.b);
    },
  },
  nightstand: {
    size: [1, 1], up: 4,
    /**
     * 床頭櫃：胡桃木小櫃、一個抽屜與下層開放格（放著一本書）；頂面留空可擺檯燈。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.walnut;
      shadow(g, 16, H - 2, 26);
      for (const x of [5, 24]) post(g, x, 29, 3, 5, w);
      block(g, 3, 4, 26, 7, 25, w, 'wood', 2);
      panel(g, 5, 13, 22, 7, w);
      knob(g, 15, 16);
      // 開放格：內側陰影與一本平放的書。
      rect(g, 5, 21, 22, 6, w.o);
      rect(g, 6, 22, 20, 5, mix(w.d, w.o, 0.5));
      rect(g, 6, 22, 20, 1, mix(w.d, '#1a1020', 0.5));
      block(g, 9, 24, 12, 1, 2, R.blue, null);
      rect(g, 9, 26, 12, 1, R.cream.l);
      px(g, 20, 25, R.gold.l);
    },
  },
  // ── 客廳 ──
  armchair: {
    size: [1, 1], up: 14,
    /**
     * 扶手椅：深色木框、墨綠絨布靠背（拉扣）、木製扶手與細腳。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const f = C.teal;
      const w = R.darkWood;
      shadow(g, 16, H - 2, 28);
      // 木框靠背與絨布靠墊。
      block(g, 5, 1, 22, 2, 24, w, 'wood', 4);
      rect(g, 9, 0, 14, 1, w.o);
      cushion(g, 7, 4, 18, 19, f);
      for (const [x, y] of [[11, 9], [16, 9], [21, 9], [13, 14], [19, 14]]) {
        px(g, x, y, f.o);
        px(g, x - 1, y - 1, f.d);
        px(g, x + 1, y + 1, f.l);
      }
      // 座墊。
      cushion(g, 6, 24, 20, 10, f);
      rect(g, 6, 32, 20, 2, f.d);
      // 扶手：布面側邊與木製扶手頂。
      for (const x of [1, 24]) {
        cushion(g, x + 1, 19, 6, 15, f);
        block(g, x, 17, 8, 2, 2, w, null);
        px(g, x + 1, 17, w.h);
      }
      // 前橫木與木腳。
      block(g, 3, 35, 26, 1, 3, w, 'wood', 1);
      for (const x of [4, 25]) post(g, x, 39, 3, 5, w);
    },
  },
  sofa: {
    size: [1, 1], up: 12,
    /**
     * 單人沙發：圓潤的藍色絨布、拉扣靠背、奶油色抱枕（金流蘇）與黃銅短腳。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const f = C.velvet;
      shadow(g, 16, H - 2, 30);
      cushion(g, 4, 3, 24, 18, f);
      for (const [x, y] of [[10, 8], [16, 8], [22, 8], [13, 13], [19, 13]]) {
        px(g, x, y, f.o);
        px(g, x + 1, y + 1, f.l);
      }
      cushion(g, 8, 20, 16, 13, f);
      rect(g, 8, 20, 16, 1, f.d);
      // 圓胖扶手（前端捲起）。
      for (const x of [1, 23]) {
        cushion(g, x, 14, 8, 23, f);
        ellipse(g, x + 4, 30, 3, 3, f.d);
        ellipse(g, x + 4, 30, 2, 2, f.l);
        px(g, x + 3, 29, f.h);
      }
      // 裙邊與黃銅腳。
      rect(g, 8, 33, 16, 4, f.o);
      rect(g, 9, 33, 14, 3, f.d);
      for (let x = 10; x < 23; x += 3) px(g, x, 35, f.b);
      for (const x of [4, 25]) {
        post(g, x, 38, 3, 3, R.brass);
        px(g, x, 38, R.gold.h);
      }
      // 抱枕：斜放的奶油色方枕與金色流蘇角。
      cushion(g, 10, 13, 11, 9, R.cream);
      px(g, 15, 17, R.cream.d);
      for (const [x, y] of [[9, 12], [21, 12], [9, 22], [21, 22]]) px(g, x, y, R.gold.l);
    },
  },
  rockingChair: {
    size: [1, 1], up: 18,
    /**
     * 搖椅：高靠背直條、紅格子座墊、扶手、弧形搖腳與披在椅背上的毛毯。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = ramp('#8a5a34');
      shadow(g, 16, H - 2, 28);
      // 靠背：兩根高柱、弧形頂欄與直條。
      for (const x of [7, 22]) post(g, x, 3, 3, 33, w);
      for (const x of [11, 14, 17, 20]) {
        rect(g, x - 1, 7, 3, 20, w.o);
        rect(g, x, 7, 1, 20, w.l);
      }
      rect(g, 6, 1, 20, 6, w.o);
      rect(g, 8, 0, 16, 1, w.o);
      rect(g, 7, 2, 18, 4, w.b);
      rect(g, 8, 1, 16, 1, w.l);
      rect(g, 7, 2, 18, 1, w.l);
      rect(g, 7, 5, 18, 1, w.d);
      woodGrain(g, 8, 2, 16, 3, w, 4);
      // 披在椅背右上的橘色針織毛毯（斜摺下襬、一道奶油色條紋與流蘇）。
      const t = C.orange;
      for (let y = 2; y < 18; y++) {
        const x1 = y < 12 ? 26 : 26 - (y - 12);
        rect(g, 17, y, x1 - 17, 1, t.o);
        rect(g, 18, y, x1 - 19, 1, y === 13 || y === 14 ? R.cream.l : t.b);
        px(g, 18, y, y === 13 || y === 14 ? R.cream.h : t.l);
        px(g, x1 - 2, y, t.d);
      }
      for (let y = 4; y < 12; y += 2) for (let x = 19 + (y % 4 === 0 ? 1 : 0); x < 24; x += 2) px(g, x, y, t.d);
      rect(g, 18, 2, 7, 1, t.h);
      for (let k = 0; k < 6; k++) px(g, 18 + k, 18 - Math.max(0, k - 2) + 1, t.d);
      // 座面與紅格子座墊。
      block(g, 5, 26, 22, 6, 3, w, 'wood', 2);
      cushion(g, 7, 25, 18, 6, R.red);
      for (let x = 9; x < 24; x += 4) rect(g, x, 26, 1, 4, R.red.l);
      rect(g, 8, 27, 16, 1, R.red.d);
      // 扶手。
      for (const x of [2, 25]) {
        rect(g, x - 1, 22, 3, 12, w.o);
        rect(g, x, 22, 1, 12, w.l);
        block(g, x - 1, 19, 6, 2, 1, w, null);
      }
      // 椅腳與弧形搖腳。
      for (const x of [6, 23]) post(g, x, 35, 3, 8, w);
      for (let x = 1; x < 31; x++) {
        const y = 44 - Math.round(((x - 16) / 15) ** 2 * 5);
        rect(g, x, y - 1, 1, 4, w.o);
        px(g, x, y, w.l);
        px(g, x, y + 1, w.d);
      }
    },
  },
  teaTable: {
    size: [1, 1], up: 4,
    /**
     * 茶几：胡桃木橢圓桌面（年輪紋）、三支彎腳與下層小托板；頂面留空可擺茶具。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.walnut;
      shadow(g, 16, H - 2, 28);
      // 後腳、下層托板與前腳。
      post(g, 15, 14, 3, 18, w);
      ovalTop(g, 16, 26, 10, 3, 1, w);
      for (const x of [5, 25]) {
        post(g, x, 14, 3, 17, w);
        rect(g, x + (x < 16 ? -1 : 3), 30, 1, 2, w.o);
      }
      ovalTop(g, 16, 11, 15, 8, 3, w);
    },
  },
  diningTable: {
    size: [2, 1], up: 8,
    /**
     * 長餐桌：櫻桃木厚桌面、蕾絲桌旗、雕花橫裙與車削桌腳；頂面留空可擺餐具。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.cherry;
      shadow(g, 32, H - 2, 62);
      // 後方桌腳（較暗）。
      for (const x of [9, 52]) post(g, x, 18, 3, 12, ramp(w.d));
      // 前方車削桌腳：中段的圓鼓。
      for (const x of [4, 56]) {
        post(g, x, 22, 4, 16, w);
        rect(g, x - 2, 28, 8, 4, w.o);
        rect(g, x - 1, 29, 6, 2, w.b);
        rect(g, x - 1, 29, 2, 1, w.h);
      }
      block(g, 1, 6, 62, 12, 4, w, 'wood', 3);
      // 桌裙：雕花波浪。
      rect(g, 7, 22, 50, 3, w.o);
      rect(g, 8, 22, 48, 2, w.d);
      for (let x = 10; x < 56; x += 6) {
        rect(g, x, 24, 3, 1, w.o);
        px(g, x + 1, 25, w.o);
      }
      // 蕾絲桌旗（兩端垂下桌緣）。
      rect(g, 2, 10, 60, 5, R.cream.o);
      rect(g, 2, 10, 60, 4, R.cream.l);
      rect(g, 2, 10, 60, 1, R.cream.h);
      for (let x = 4; x < 60; x += 3) px(g, x, 12, R.cream.d);
      rect(g, 2, 13, 60, 1, R.red.b);
    },
  },
  glassCabinet: {
    size: [1, 1], up: 36,
    /**
     * 玻璃展示櫃：木框與拱頂、玻璃門後的盤子、茶杯、獎盃與水晶，下方雙門小櫃。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = C.walnut;
      shadow(g, 16, H - 2, 30);
      for (const x of [3, 26]) post(g, x, 61, 3, 4, w);
      block(g, 2, 7, 28, 3, 54, w, 'wood', 6);
      // 拱頂飾板。
      block(g, 1, 4, 30, 3, 3, w, 'wood', 2);
      rect(g, 10, 1, 12, 3, w.o);
      rect(g, 11, 2, 10, 2, w.l);
      px(g, 16, 2, R.gold.h);
      // 櫃內：深色背板與兩層隔板。
      rect(g, 4, 12, 24, 37, w.o);
      rect(g, 5, 13, 22, 35, mix(w.d, R.cream.d, 0.25));
      for (const y of [24, 36]) {
        rect(g, 5, y, 22, 2, w.l);
        rect(g, 5, y + 2, 22, 1, w.o);
      }
      // 上層：直立的藍花盤與金獎盃。
      orb(g, 10, 18, 4, 4, R.white);
      ellipse(g, 10, 18, 2, 2, R.blue.l);
      px(g, 10, 18, R.blue.b);
      rect(g, 19, 21, 5, 3, R.gold.o);
      rect(g, 20, 21, 3, 2, R.gold.b);
      rect(g, 21, 19, 1, 2, R.gold.d);
      ellipse(g, 21.5, 16, 3, 3, R.gold.o);
      ellipse(g, 21.5, 16, 2, 2, R.gold.l);
      px(g, 21, 15, R.gold.h);
      // 中層：兩只茶杯與茶托。
      for (const x of [8, 18]) {
        rect(g, x, 30, 6, 5, R.white.o);
        rect(g, x + 1, 30, 4, 4, R.white.l);
        rect(g, x + 1, 32, 4, 1, C.pink.b);
        px(g, x + 6, 31, R.white.o);
        rect(g, x - 1, 35, 8, 1, R.white.d);
      }
      // 下層：紫色水晶與小花瓶。
      for (let k = 0; k < 5; k++) rect(g, 9 - Math.floor(k / 2), 40 + k, 3 + Math.floor(k / 2) * 2, 1, k < 2 ? R.purple.l : R.purple.b);
      px(g, 9, 41, R.purple.h);
      orb(g, 20, 44, 3, 3, R.green);
      rect(g, 19, 39, 2, 2, R.green.d);
      // 玻璃門與中間門框。
      glass(g, 5, 13, 22, 35, '#dff4ff');
      rect(g, 15, 12, 2, 37, w.b);
      px(g, 15, 12, w.l);
      knob(g, 13, 30);
      knob(g, 17, 30);
      // 下方雙門小櫃。
      panel(g, 4, 50, 12, 10, w);
      panel(g, 16, 50, 12, 10, w);
      knob(g, 13, 54);
      knob(g, 17, 54);
    },
  },
  // ── 浴室 ──
  bathtub: {
    size: [2, 1], up: 14,
    /**
     * 浴缸：貓腳浴缸（白色缸緣、淺藍外殼）、泡泡滿溢的熱水、小黃鴨與黃銅水龍頭。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const e = C.aqua;
      const p = C.porcelain;
      shadow(g, 32, H - 2, 60);
      // 後方兩隻貓腳。
      for (const x of [12, 51]) orb(g, x, 39, 2, 2, ramp(R.brass.d));
      // 缸身：底部收圓的淺藍外殼。
      for (let y = 18; y < 41; y++) {
        const ins = y > 30 ? Math.round((y - 30) ** 2 / 7) : 0;
        rect(g, 2 + ins, y, 60 - ins * 2, 1, e.o);
        rect(g, 3 + ins, y, 58 - ins * 2, 1, e.b);
        px(g, 3 + ins, y, e.l);
        rect(g, 57 - ins, y, 4, 1, e.d);
      }
      rect(g, 4, 22, 54, 1, R.gold.b);
      rect(g, 4, 23, 54, 1, e.d);
      for (let x = 8; x < 56; x += 8) px(g, x, 30, e.l);
      // 前方兩隻黃銅貓腳。
      for (const x of [9, 54]) {
        orb(g, x, 41, 3, 2, R.brass);
        px(g, x - 2, 43, R.brass.o);
        px(g, x + 2, 43, R.brass.o);
      }
      // 缸緣與熱水。
      rect(g, 3, 6, 58, 14, p.o);
      rect(g, 2, 8, 60, 10, p.o);
      rect(g, 4, 7, 56, 12, p.l);
      rect(g, 3, 9, 58, 8, p.l);
      rect(g, 4, 7, 50, 1, p.h);
      rect(g, 4, 17, 56, 2, p.b);
      rect(g, 8, 9, 48, 7, p.d);
      rect(g, 7, 10, 50, 5, p.d);
      rect(g, 9, 10, 46, 6, R.water.b);
      rect(g, 8, 11, 48, 4, R.water.b);
      rect(g, 10, 10, 30, 1, R.water.l);
      // 小黃鴨。
      orb(g, 40, 12, 3, 2, R.gold);
      orb(g, 42, 9, 2, 2, R.gold);
      px(g, 44, 9, R.clay.b);
      px(g, 42, 8, '#1a1020');
      // 泡泡：在水面堆起並溢出缸緣。
      for (const [x, y, s] of [[14, 11, 3], [19, 10, 2.5], [24, 12, 3], [29, 10, 2], [50, 11, 3], [54, 10, 2], [46, 13, 2], [17, 16, 2], [33, 13, 2]]) {
        ellipse(g, x, y, s + 1, s, mix(p.d, e.d, 0.3));
        ellipse(g, x, y, s, s - 0.5, '#ffffff');
        px(g, x - 1, y - 1, '#d8f0ff');
      }
      for (const [x, y] of [[26, 4], [31, 2], [48, 5]]) {
        ellipse(g, x, y, 1.5, 1.5, mix(p.d, e.d, 0.3));
        px(g, x, y, '#ffffff');
      }
      // 黃銅水龍頭（左端缸緣上，鵝頸出水口）與冷熱旋鈕。
      rect(g, 5, 1, 4, 9, R.brass.o);
      rect(g, 6, 2, 2, 7, R.brass.b);
      px(g, 6, 2, R.gold.h);
      rect(g, 5, 0, 9, 3, R.brass.o);
      rect(g, 6, 1, 7, 1, R.brass.l);
      rect(g, 11, 2, 3, 3, R.brass.o);
      px(g, 12, 3, R.brass.d);
      px(g, 12, 5, R.water.l);
      for (const [x, c] of [[3, R.red], [11, R.blue]]) {
        rect(g, x - 1, 6, 4, 3, R.brass.o);
        rect(g, x, 7, 2, 1, c.l);
      }
    },
  },
  washbasin: {
    size: [1, 1], up: 24,
    /**
     * 洗臉台：磁磚背板與圓鏡、大理石檯面與洗臉盆、黃銅龍頭、牙刷杯與香皂、下方木櫃。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const m = C.marble;
      const w = C.honey;
      shadow(g, 16, H - 2, 30);
      // 磁磚背板與圓鏡。
      rect(g, 3, 1, 26, 25, R.white.o);
      rect(g, 4, 2, 24, 23, R.white.l);
      for (let y = 2; y < 25; y += 6) rect(g, 4, y + 5, 24, 1, R.white.d);
      for (let y = 2; y < 25; y += 6) for (let x = 4 + ((y / 6) % 2) * 3; x + 5 < 28; x += 6) rect(g, x + 5, y, 1, 5, R.white.d);
      ellipse(g, 16, 11, 8, 8, R.brass.o);
      ellipse(g, 16, 11, 7, 7, R.brass.l);
      ellipse(g, 16, 11, 6, 6, C.mirror.b);
      ellipse(g, 15, 10, 4, 4, C.mirror.l);
      for (let k = 0; k < 5; k++) px(g, 12 + k, 14 - k, '#ffffff');
      px(g, 17, 15, '#ffffff');
      // 木櫃與兩扇小門。
      block(g, 3, 32, 26, 1, 20, w, 'wood', 4);
      panel(g, 5, 34, 11, 16, w);
      panel(g, 16, 34, 11, 16, w);
      knob(g, 13, 41);
      knob(g, 18, 41);
      rect(g, 3, 53, 26, 1, w.o);
      // 大理石檯面與洗臉盆。
      block(g, 1, 24, 30, 7, 3, m, 'stone', 3);
      ellipse(g, 16, 28, 9, 3.5, m.o);
      ellipse(g, 16, 28, 8, 2.5, C.porcelain.d);
      ellipse(g, 16, 29, 7, 1.5, C.porcelain.b);
      ellipse(g, 17, 29, 3, 1, R.water.l);
      // 龍頭與冷熱旋鈕。
      rect(g, 15, 20, 3, 6, R.brass.o);
      rect(g, 16, 21, 1, 4, R.brass.l);
      rect(g, 15, 20, 5, 2, R.brass.o);
      px(g, 18, 21, R.brass.b);
      orb(g, 12, 24, 1.2, 1.2, R.red);
      orb(g, 21, 24, 1.2, 1.2, R.blue);
      // 牙刷杯與香皂。
      rect(g, 3, 23, 5, 6, R.green.o);
      rect(g, 4, 24, 3, 4, R.green.l);
      rect(g, 4, 20, 1, 4, R.blue.b);
      rect(g, 6, 21, 1, 3, C.pink.b);
      px(g, 4, 20, '#ffffff');
      rect(g, 24, 26, 5, 3, C.pink.o);
      rect(g, 25, 26, 3, 2, C.pink.l);
      px(g, 25, 26, '#ffffff');
    },
  },
  screen: {
    size: [1, 1], up: 26,
    /**
     * 屏風：三扇摺疊木框屏風，米色絹面畫著櫻花枝，中間那扇向後折（較暗），黃銅鉸鏈。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = R.darkWood;
      shadow(g, 16, H - 2, 30);
      for (let i = 0; i < 3; i++) {
        const x = 1 + i * 10;
        const back = i === 1;
        const y = back ? 2 : 4;
        const h = back ? 50 : 50;
        const s = back ? ramp(C.silk.d) : C.silk;
        // 木框、拱頂與小腳。
        rect(g, x - 1, y - 1, 12, h + 2, w.o);
        rect(g, x + 1, y - 3, 8, 3, w.o);
        rect(g, x + 2, y - 2, 6, 2, back ? w.b : w.l);
        rect(g, x, y, 10, h, back ? w.d : w.b);
        rect(g, x, y, 1, h, back ? w.b : w.l);
        rect(g, x + 1, y + h, 2, 3, w.o);
        rect(g, x + 7, y + h, 2, 3, w.o);
        // 絹面與櫻花枝。
        rect(g, x + 2, y + 2, 6, h - 4, s.b);
        rect(g, x + 2, y + 2, 6, 1, s.l);
        for (let k = 0; k < h - 6; k += 2) if (hash(i, k, 3) < 0.25) px(g, x + 2 + Math.floor(hash(k, i) * 6), y + 3 + k, s.d);
        for (let k = 0; k < 18; k++) {
          const bx = x + 2 + Math.round(((k + i * 7) % 18) / 3);
          px(g, bx, y + h - 6 - k * 2, back ? w.d : w.b);
        }
        for (let k = 0; k < 4; k++) {
          const fx = x + 3 + Math.floor(hash(i, k, 9) * 4);
          const fy = y + 6 + Math.floor(hash(k, i, 5) * (h - 18));
          px(g, fx, fy, back ? C.pink.d : C.pink.b);
          px(g, fx + 1, fy, back ? C.pink.b : C.pink.l);
          px(g, fx, fy + 1, back ? C.pink.b : C.pink.l);
          px(g, fx + 1, fy + 1, back ? C.pink.d : C.pink.b);
        }
        // 下方木格。
        rect(g, x + 2, y + h - 10, 6, 1, w.o);
        for (let k = 0; k < 3; k++) rect(g, x + 2 + k * 2, y + h - 9, 1, 7, back ? w.d : w.b);
      }
      // 鉸鏈。
      for (const x of [10, 20]) {
        for (const y of [12, 44]) {
          rect(g, x, y, 2, 3, R.brass.o);
          px(g, x, y + 1, R.brass.l);
        }
      }
    },
  },
  towelRack: {
    size: [1, 1], up: 16,
    /**
     * 毛巾架：木製直立架、上下兩根橫桿掛著條紋毛巾，底層木條上疊著兩條摺好的毛巾。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     */
    draw(g, W, H) {
      const w = R.lightWood;
      shadow(g, 16, H - 2, 28);
      // 側柱與腳座。
      for (const x of [3, 26]) {
        post(g, x, 3, 3, 40, w);
        orb(g, x + 1.5, 2.5, 2, 2, w);
        block(g, x - 3, 42, 9, 1, 2, w, null);
      }
      // 橫桿（上、中、下）。
      for (const y of [8, 18, 37]) {
        rect(g, 5, y - 1, 22, 4, w.o);
        rect(g, 5, y, 22, 1, w.l);
        rect(g, 5, y + 1, 22, 1, w.b);
      }
      // 上桿的藍白條紋浴巾（下緣流蘇）。
      const b = R.blue;
      rect(g, 6, 7, 15, 21, b.o);
      for (let y = 8; y < 27; y++) {
        const st = y === 22 || y === 24;
        rect(g, 7, y, 13, 1, st ? R.white.l : b.b);
        px(g, 7, y, st ? R.white.h : b.l);
        rect(g, 18, y, 2, 1, st ? R.white.d : b.d);
      }
      rect(g, 7, 8, 13, 2, b.l);
      rect(g, 7, 8, 13, 1, b.h);
      weave(g, 8, 11, 10, 10, b);
      for (let x = 7; x < 20; x += 2) px(g, x, 28, b.d);
      // 中桿右側的粉紅擦手巾（在浴巾前面）。
      const p = C.pink;
      rect(g, 17, 17, 9, 12, p.o);
      rect(g, 18, 18, 7, 10, p.b);
      rect(g, 18, 18, 7, 2, p.l);
      px(g, 18, 18, p.h);
      rect(g, 18, 25, 7, 1, R.white.l);
      rect(g, 23, 20, 2, 8, p.d);
      weave(g, 19, 21, 4, 4, p);
      // 底層：兩條摺好的毛巾（奶油、綠）。
      block(g, 7, 32, 18, 1, 4, R.cream, 'cloth');
      block(g, 9, 29, 14, 1, 3, R.green, 'cloth');
      rect(g, 10, 30, 4, 1, R.green.h);
      rect(g, 8, 34, 4, 1, R.cream.h);
    },
  },
};
