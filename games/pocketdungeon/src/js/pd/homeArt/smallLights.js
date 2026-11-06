// 家園美術：小擺設與燈具（繪製規則見 homeDraw.js 開頭說明，格式同 homeArt.js 的 HOME_ART）。
// 小擺設（place 'small'）畫得小巧，放在格子中下方、約 12～24 像素寬並有小投影，可擺在桌上或地上；
// 牆上的燈具（place 'wall'）不畫地面投影。發光物件以半透明光暈表現，動態幀用於火焰閃爍與魔法光芒。

import { mix, ramp, R, rect, px, hash, ellipse, orb, shadow, woodGrain, block, post } from '../homeDraw.js';

/** 本組專用的額外色階。 */
const C = {
  cactus: ramp('#5a9a48'),
  shade: ramp('#3f8a72'),
  candle: ramp('#f4ecd8'),
  glassRim: ramp('#7aa4c0'),
  ocean: ramp('#3a7ac8'),
  land: ramp('#6ab04c'),
  porcelain: ramp('#f4f0f4'),
  rose: ramp('#e07a9a'),
  orange: ramp('#f0962a'),
  grape: ramp('#8a4ab0'),
  banana: ramp('#f0d040'),
  pear: ramp('#a8c848'),
  pink: ramp('#f0a8c0'),
  cream: ramp('#f8ecd8'),
  rosewood: ramp('#a85a44'),
  bear: ramp('#b07a48'),
  pig: ramp('#f0a0b4'),
  canary: ramp('#f4d040'),
  crystal: ramp('#7a64d8'),
  ice: ramp('#a8dcf0'),
  fabric: ramp('#f0dcb0'),
  lantern: ramp('#d8403a'),
  lacquer: ramp('#3a2a30'),
  wire: ramp('#3e5a40'),
  magic: ramp('#c070f0'),
};

/**
 * 半透明的柔和光暈（三層由外而內漸亮的橢圓）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {string} c 光色。
 * @param {number} [a=0.14] 每層透明度。
 */
function glow(g, cx, cy, rx, ry, c, a = 0.14) {
  g.globalAlpha = a;
  ellipse(g, cx, cy, rx, ry, c);
  ellipse(g, cx, cy, rx * 0.7, ry * 0.7, c);
  ellipse(g, cx, cy, rx * 0.42, ry * 0.42, c);
  g.globalAlpha = 1;
}

/**
 * 小火焰（3 幀閃爍）：外焰橘、內焰黃、焰心白，底部燭芯。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 火焰中心 x。
 * @param {number} y 燭芯所在 y（火焰底部）。
 * @param {number} f 幀（0～2）。
 */
function flame(g, x, y, f) {
  const h = [5, 6, 4][f % 3];
  const lean = [0, 1, -1][f % 3];
  px(g, x, y, '#3a2a20');
  rect(g, x - 1, y - 3, 3, 3, '#f08a2a');
  rect(g, x - 1 + (lean > 0 ? 1 : 0), y - h + 1, 2 - (lean === 0 ? 1 : 0), h - 4, '#f08a2a');
  px(g, x + lean, y - h, '#f8b040');
  rect(g, x, y - 4, 1, 3, '#ffe060');
  px(g, x, y - 2, '#fffbe8');
  px(g, x, y - 1, '#ffd040');
}

/**
 * 四角星形的閃光（十字加中心亮點），大小 0 為 3×3、1 為 5×5。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} y 中心 y。
 * @param {string} c 顏色。
 * @param {number} [size=0] 大小。
 */
function sparkle(g, x, y, c, size = 0) {
  const s = size + 1;
  rect(g, x - s, y, s * 2 + 1, 1, c);
  rect(g, x, y - s, 1, s * 2 + 1, c);
  px(g, x, y, '#ffffff');
}

/**
 * 粗管或粗線（有外框、左上亮邊與右下暗邊），用於燈臂、望遠鏡筒、腳架與壺嘴。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 起點 x。
 * @param {number} y0 起點 y。
 * @param {number} x1 終點 x。
 * @param {number} y1 終點 y。
 * @param {number} w 粗細（像素）。
 * @param {object} r 色階。
 */
function tube(g, x0, y0, x1, y1, w, r) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
  const hw = w / 2;
  for (const [x, y] of pts) rect(g, Math.round(x - hw) - 1, Math.round(y - hw) - 1, w + 2, w + 2, r.o);
  for (const [x, y] of pts) rect(g, Math.round(x - hw), Math.round(y - hw), w, w, r.b);
  if (w < 2) return;
  // 法線朝左上方：亮邊在左上、暗邊在右下。
  let nx = -(y1 - y0);
  let ny = x1 - x0;
  if (nx + ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  const d = Math.max(0.5, hw - 0.5);
  for (const [x, y] of pts) {
    px(g, Math.round(x + nx * d), Math.round(y + ny * d), r.l);
    if (w >= 3) px(g, Math.round(x - nx * d), Math.round(y - ny * d), r.d);
  }
}

/**
 * 直立的圓頂柱體（仙人掌的主幹與手臂）：圓弧頂、左亮右暗、外框。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左上 x。
 * @param {number} y 頂端 y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 */
function capsule(g, x, y, w, h, r) {
  const rr = w / 2;
  const cx = x + rr;
  ellipse(g, cx, y + rr, rr + 1, rr + 1, r.o);
  rect(g, x - 1, y + rr, w + 2, h - rr, r.o);
  ellipse(g, cx, y + rr, rr, rr, r.b);
  rect(g, x, y + rr, w, h - rr, r.b);
  rect(g, x + 1, y + rr - 1, 1, h - rr, r.l);
  rect(g, x + w - 1, y + rr, 1, h - rr, r.d);
  px(g, x + 1, y + Math.max(1, Math.floor(rr) - 1), r.h);
}

/**
 * 只畫橢圓的上半或下半（以剪裁實作），用於碗、燈罩與圓頂。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y（切線位置）。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {string} c 顏色。
 * @param {boolean} lower true 畫下半、false 畫上半。
 */
function halfEllipse(g, cx, cy, rx, ry, c, lower) {
  g.save();
  g.beginPath();
  if (lower) g.rect(0, Math.round(cy), 400, 400);
  else g.rect(0, 0, 400, Math.round(cy));
  g.clip();
  ellipse(g, cx, cy, rx, ry, c);
  g.restore();
}

/**
 * 扁平的圓盤（底座、托盤、盤子）：外框、正面厚度、頂面亮色與上緣高光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 頂面中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {number} th 厚度。
 * @param {object} r 色階。
 */
function disc(g, cx, cy, rx, ry, th, r) {
  ellipse(g, cx, cy + th, rx + 1, ry + 1, r.o);
  ellipse(g, cx, cy, rx + 1, ry + 1, r.o);
  ellipse(g, cx, cy + th, rx, ry, r.d);
  rect(g, cx - rx, cy, rx * 2, th, r.b);
  ellipse(g, cx, cy, rx, ry, r.l);
  ellipse(g, cx - rx * 0.25, cy - ry * 0.3, rx * 0.5, Math.max(0.6, ry * 0.4), r.h);
}

/**
 * 音符（♪）：符頭與符桿、符尾。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 符頭左上 x。
 * @param {number} y 符頭 y。
 * @param {string} c 顏色。
 */
function note(g, x, y, c) {
  rect(g, x, y, 2, 2, c);
  rect(g, x + 2, y - 4, 1, 5, c);
  px(g, x + 3, y - 3, c);
  px(g, x + 4, y - 2, c);
}

/**
 * 五芒小星燈泡（5×5）：深色外框、亮或暗的燈色。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} y 中心 y。
 * @param {object} r 色階。
 * @param {boolean} lit 是否正在發亮。
 */
function starBulb(g, x, y, r, lit) {
  const rows = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
  const shape = [];
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < 7; i++) if (rows[j][i] === '#') shape.push([i - 3, j - 3]);
  if (lit) glow(g, x, y, 7, 7, r.l, 0.15);
  for (const [dx, dy] of shape) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(g, x + dx + ox, y + dy + oy, r.o);
  for (const [dx, dy] of shape) px(g, x + dx, y + dy, lit ? (dx + dy > 1 ? r.b : r.l) : (dx + dy > 1 ? r.o : r.d));
  if (lit) {
    px(g, x, y, '#ffffff');
    px(g, x - 1, y - 1, r.h);
    px(g, x, y - 2, r.h);
    px(g, x - 2, y - 1, r.h);
  } else px(g, x - 1, y - 1, r.b);
}

/** 小擺設與燈具的繪製方式（代碼 → { size, up, frames?, draw }）。 */
export const ART = {
  // ── 小擺設 ──
  cactus: {
    size: [1, 1], up: 6,
    /**
     * 仙人掌：陶盆裡的柱狀仙人掌（兩隻手臂、縱向稜線、白色小刺）與頂端粉紅小花。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      const c = C.cactus;
      shadow(g, 16, H - 3, 14);
      // 手臂（先畫，主幹蓋住接合處）。
      capsule(g, 6, b - 25, 5, 10, c);
      rect(g, 7, b - 17, 6, 4, c.o);
      rect(g, 7, b - 16, 6, 2, c.b);
      rect(g, 7, b - 16, 6, 1, c.l);
      capsule(g, 21, b - 29, 5, 10, c);
      rect(g, 19, b - 21, 6, 4, c.o);
      rect(g, 19, b - 20, 6, 2, c.b);
      rect(g, 19, b - 20, 6, 1, c.l);
      // 主幹與稜線。
      capsule(g, 12, b - 32, 8, 24, c);
      for (const x of [14, 17]) rect(g, x, b - 28, 1, 19, c.d);
      for (const x of [8, 23]) rect(g, x, (x === 8 ? b - 22 : b - 26), 1, 6, c.d);
      // 小刺。
      for (let y = b - 28; y < b - 10; y += 3) {
        px(g, 13, y, c.h);
        px(g, 16, y + 1, c.h);
        px(g, 19, y, c.l);
      }
      for (const [x, y] of [[7, b - 21], [9, b - 18], [22, b - 25], [24, b - 22], [11, b - 15], [21, b - 19]]) px(g, x, y, c.h);
      // 頂端小花。
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-1, -1], [1, -1]]) px(g, 16 + dx, b - 33 + dy, C.rose.b);
      rect(g, 15, b - 34, 3, 2, C.rose.l);
      px(g, 16, b - 33, '#fff0a0');
      // 陶盆：盆緣、盆身（上寬下窄）與泥土。
      for (let y = 0; y < 8; y++) {
        const w = 14 - Math.floor(y / 3);
        rect(g, 16 - w / 2 - 1, b - 8 + y, w + 2, 1, R.clay.o);
        rect(g, 16 - w / 2, b - 8 + y, w, 1, R.clay.b);
        px(g, 16 - w / 2, b - 8 + y, R.clay.l);
        px(g, 16 + w / 2 - 1, b - 8 + y, R.clay.d);
      }
      rect(g, 11, b - 1, 10, 1, R.clay.o);
      block(g, 8, b - 11, 16, 2, 2, R.clay, null);
      rect(g, 9, b - 10, 14, 1, '#5a3a24');
      for (let x = 11; x < 21; x += 3) px(g, x, b - 5, R.clay.l);
    },
  },
  deskLamp: {
    size: [1, 1], up: 10,
    /**
     * 檯燈：圓形銅底座、兩節可彎燈臂與關節、綠色燈罩，罩下透出暖光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 14, H - 3, 18);
      // 罩下光錐。
      g.globalAlpha = 0.16;
      for (let y = b - 18; y < b; y++) {
        const w = 6 + (y - (b - 18)) * 0.9;
        rect(g, 21 - w / 2, y, w, 1, '#fff0a0');
      }
      g.globalAlpha = 1;
      // 底座與開關。
      disc(g, 11, b - 4, 7, 2.5, 2, R.brass);
      rect(g, 15, b - 5, 2, 1, R.red.b);
      // 燈臂與關節。
      tube(g, 10, b - 5, 7, b - 17, 2, R.brass);
      tube(g, 7, b - 17, 16, b - 26, 2, R.brass);
      orb(g, 7, b - 17, 1.5, 1.5, R.brass);
      orb(g, 11, b - 5, 1.5, 1.5, R.brass);
      // 燈罩：半圓殼與罩緣、燈泡。
      const s = C.shade;
      halfEllipse(g, 20, b - 19, 8, 7, s.o, false);
      halfEllipse(g, 20, b - 19, 7, 6, s.b, false);
      halfEllipse(g, 18, b - 21, 4, 3, s.l, false);
      px(g, 16, b - 23, s.h);
      px(g, 17, b - 24, s.h);
      rect(g, 19, b - 26, 3, 2, s.o);
      rect(g, 11, b - 19, 18, 2, s.o);
      rect(g, 12, b - 19, 16, 1, R.brass.l);
      glow(g, 20, b - 16, 6, 3, '#fff0a0', 0.3);
      rect(g, 18, b - 17, 4, 1, '#fff8d0');
      px(g, 20, b - 16, '#ffffff');
    },
  },
  candlestick: {
    size: [1, 1], up: 10, frames: 3,
    /**
     * 燭台：三叉銅燭台（弧形燭臂、托盤）插著三根滴蠟白燭，火焰 3 幀閃爍並有暖色光暈。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const b = H - 4;
      shadow(g, 16, H - 3, 16);
      glow(g, 16, b - 26, 13 + (f === 1 ? 1 : 0), 10, '#ffd870', 0.1);
      // 底座與燭柱（有圓節）。
      disc(g, 16, b - 4, 7, 2.5, 2, R.brass);
      post(g, 15, b - 17, 3, 13, R.brass);
      for (const y of [b - 8, b - 13]) {
        ellipse(g, 16.5, y, 3, 1.5, R.brass.o);
        ellipse(g, 16.5, y, 2, 1, R.brass.l);
      }
      // 弧形燭臂（左右兩側往上彎）。
      for (let x = 7; x <= 26; x++) {
        const t = (x - 16.5) / 9.5;
        const y = Math.round(b - 13 - t * t * 7);
        rect(g, x - 1, y - 1, 2, 4, R.brass.o);
      }
      for (let x = 7; x <= 26; x++) {
        const t = (x - 16.5) / 9.5;
        const y = Math.round(b - 13 - t * t * 7);
        px(g, x, y, R.brass.l);
        px(g, x, y + 1, R.brass.d);
      }
      // 三個燭杯與蠟燭（中央較高）。
      const cand = [[8, b - 21, 8], [16, b - 26, 9], [25, b - 21, 8]];
      for (const [x, y, h] of cand) {
        ellipse(g, x + 0.5, y + h, 3.5, 1.5, R.brass.o);
        ellipse(g, x + 0.5, y + h, 2.5, 1, R.brass.l);
        rect(g, x - 2, y - 1, 6, h + 1, C.candle.o);
        rect(g, x - 1, y, 4, h, C.candle.b);
        rect(g, x - 1, y, 1, h, C.candle.h);
        rect(g, x + 2, y, 1, h, C.candle.d);
        px(g, x + 1, y + 1, C.candle.l);
        px(g, x + 1, y + 2, C.candle.l);
        rect(g, x - 1, y, 4, 1, C.candle.l);
      }
      for (let i = 0; i < 3; i++) flame(g, cand[i][0] + 1, cand[i][1] - 1, (f + i) % 3);
    },
  },
  hourglass: {
    size: [1, 1], up: 6,
    /**
     * 沙漏：上下木板、兩側車削木柱、雙玻璃球與流下的沙（上半剩一些、下半堆成小丘）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 20);
      const gl = C.glassRim;
      // 玻璃球外框與玻璃。
      for (const cy of [b - 20, b - 11]) {
        ellipse(g, 16, cy, 6, 5, gl.d);
        ellipse(g, 16, cy, 5, 4, '#e4f4fc');
      }
      rect(g, 15, b - 16, 3, 2, gl.d);
      px(g, 16, b - 16, '#e4f4fc');
      px(g, 16, b - 15, '#e4f4fc');
      // 沙子：上半的殘沙、中間細流與下半的小丘。
      const s = ramp('#e0a848');
      g.save();
      g.beginPath();
      g.rect(0, b - 19, 32, 4);
      g.clip();
      ellipse(g, 16, b - 20, 5, 4, s.b);
      g.restore();
      rect(g, 13, b - 19, 7, 1, s.l);
      rect(g, 16, b - 15, 1, 6, s.l);
      for (let k = 0; k < 4; k++) rect(g, 16 - k - 1, b - 10 + k, (k + 1) * 2 + 1, 1, k === 0 ? s.l : s.b);
      rect(g, 12, b - 7, 9, 1, s.d);
      for (const [x, y] of [[14, b - 8], [18, b - 8], [17, b - 9]]) px(g, x, y, s.d);
      // 玻璃反光。
      for (const cy of [b - 20, b - 11]) {
        px(g, 13, cy - 2, '#ffffff');
        px(g, 12, cy - 1, '#ffffff');
        px(g, 12, cy, '#ffffff');
      }
      // 上下木板與兩根木柱（有圓節）。
      for (const x of [8, 23]) {
        post(g, x, b - 25, 2, 20, R.darkWood);
        for (const y of [b - 22, b - 16, b - 9]) rect(g, x - 1, y, 4, 2, R.darkWood.l);
        for (const y of [b - 22, b - 16, b - 9]) px(g, x + 2, y + 1, R.darkWood.d);
      }
      block(g, 6, b - 28, 20, 2, 2, R.wood, 'wood', 3);
      block(g, 6, b - 5, 20, 2, 3, R.wood, 'wood', 8);
      for (const x of [7, 24]) rect(g, x, b - 1, 1, 1, R.wood.o);
    },
  },
  globe: {
    size: [1, 1], up: 8,
    /**
     * 地球儀：木底座與支柱、黃銅半圈子午環、海洋與大陸的球體與軸心。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 16);
      disc(g, 16, b - 4, 7, 2.5, 2, R.darkWood);
      post(g, 15, b - 10, 3, 6, R.wood);
      ellipse(g, 16.5, b - 10, 3, 1.5, R.brass.o);
      ellipse(g, 16.5, b - 10, 2, 1, R.brass.l);
      // 黃銅子午環（右側半圈，在球後方）。
      const cx = 16;
      const cy = b - 21;
      for (let a = -100; a <= 100; a += 3) {
        const t = (a * Math.PI) / 180;
        rect(g, cx + Math.cos(t) * 11 - 1, cy + Math.sin(t) * 11 - 1, 3, 3, R.brass.o);
      }
      for (let a = -100; a <= 100; a += 3) {
        const t = (a * Math.PI) / 180;
        px(g, cx + Math.cos(t) * 11, cy + Math.sin(t) * 11, a < 0 ? R.brass.l : R.brass.b);
      }
      // 海洋球體與大陸（左上亮、右下暗）。
      orb(g, cx, cy, 9, 9, C.ocean);
      g.save();
      g.beginPath();
      g.arc(cx, cy, 9, 0, Math.PI * 2);
      g.clip();
      const l = C.land;
      for (const [x, y, rx, ry] of [[cx - 4, cy - 4, 4, 3], [cx - 2, cy + 1, 2, 4], [cx + 4, cy - 1, 3, 2.5], [cx + 5, cy + 4, 2, 2], [cx - 6, cy + 5, 2, 1.5]]) {
        ellipse(g, x, y, rx + 1, ry + 1, l.d);
        ellipse(g, x, y, rx, ry, x < cx && y < cy ? l.l : l.b);
      }
      ellipse(g, cx - 5, cy - 5, 1.5, 1, l.h);
      rect(g, cx - 3, cy - 9, 6, 1, '#f4f8ff');
      g.globalAlpha = 0.35;
      halfEllipse(g, cx + 3, cy + 3, 8, 8, C.ocean.o, true);
      g.globalAlpha = 1;
      g.restore();
      px(g, cx - 5, cy - 6, '#ffffff');
      px(g, cx - 6, cy - 5, '#ffffff');
      // 軸心（上下兩點）。
      orb(g, cx + 1, cy - 11, 1, 1, R.brass);
      orb(g, cx - 1, cy + 11, 1, 1, R.brass);
    },
  },
  bookPile: {
    size: [1, 1], up: 4,
    /**
     * 書堆：五本大小顏色不同的書交錯疊起（書脊有燙金帶、書頁有紙紋），最上方擺一副圓眼鏡。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 24);
      // [x, 寬, 正面高, 色階, 正面是書脊（true）或書頁（false）]
      const books = [[5, 22, 4, R.red, true], [7, 19, 3, R.cream, false], [4, 21, 4, R.blue, true], [8, 18, 3, C.grape, false], [6, 19, 4, R.green, true]];
      let y = b - 1;
      for (const [x, w, fh, r, spine] of books) {
        y -= 2 + fh + 1;
        block(g, x, y + 1, w, 2, fh, spine ? r : C.cream, null);
        rect(g, x, y + 1, w, 2, r.l);
        rect(g, x, y + 1, w, 1, r.h);
        if (spine) {
          // 書脊：燙金帶與書名小塊。
          for (const bx of [x + 2, x + w - 4]) rect(g, bx, y + 3, 2, fh, R.gold.l);
          rect(g, x + Math.floor(w / 2) - 3, y + 3 + Math.floor(fh / 2), 6, 1, R.gold.b);
          rect(g, x, y + 3, w, 1, r.d);
        } else {
          // 書頁：上下封面與頁紋。
          rect(g, x, y + 3, w, 1, r.b);
          rect(g, x, y + 2 + fh, w, 1, r.d);
          for (let k = 0; k < fh - 2; k++) for (let i = x + 1; i < x + w - 1; i += 2) px(g, i + (k % 2), y + 4 + k, C.cream.d);
        }
      }
      // 書籤緞帶（從第二本垂下）。
      rect(g, 20, b - 10, 1, 5, R.red.b);
      px(g, 20, b - 5, R.red.d);
      // 圓眼鏡。
      const gy = y - 1;
      for (const x of [11, 18]) {
        ellipse(g, x, gy, 3, 2, R.black.o);
        ellipse(g, x, gy, 2, 1, '#cfeaf8');
        px(g, x - 1, gy - 1, '#ffffff');
      }
      rect(g, 13, gy - 1, 3, 1, R.black.o);
    },
  },
  teaSet: {
    size: [1, 1], up: 4,
    /**
     * 茶具組：銀托盤上的白瓷茶壺（粉紅花紋、金邊、壺蓋與壺嘴）與一套杯碟，壺嘴冒出熱氣。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 26);
      // 托盤。
      disc(g, 16, b - 4, 13, 3.5, 2, R.stone);
      ellipse(g, 16, b - 4, 11, 2.5, R.stone.b);
      // 壺嘴、把手。
      tube(g, 7, b - 10, 3, b - 15, 2, C.porcelain);
      px(g, 2, b - 16, C.porcelain.o);
      for (let a = -70; a <= 70; a += 10) {
        const t = (a * Math.PI) / 180;
        rect(g, 19 + Math.cos(t) * 3 - 1, b - 11 + Math.sin(t) * 3 - 1, 3, 3, C.porcelain.o);
      }
      for (let a = -70; a <= 70; a += 10) {
        const t = (a * Math.PI) / 180;
        px(g, 19 + Math.cos(t) * 3, b - 11 + Math.sin(t) * 3, C.porcelain.b);
      }
      // 壺身、花紋帶、壺蓋與蓋鈕。
      orb(g, 12, b - 10, 7, 5.5, C.porcelain);
      rect(g, 6, b - 10, 13, 1, R.gold.b);
      for (const [x, y] of [[8, b - 8], [12, b - 7], [16, b - 8]]) {
        px(g, x, y, C.rose.b);
        px(g, x - 1, y, C.rose.l);
        px(g, x + 1, y, C.rose.l);
        px(g, x, y + 1, R.leaf.b);
      }
      ellipse(g, 12, b - 15, 4.5, 1.8, C.porcelain.o);
      ellipse(g, 12, b - 15, 3.5, 1, C.porcelain.l);
      orb(g, 12, b - 17, 1.5, 1.5, R.gold);
      // 茶杯與杯碟。
      ellipse(g, 24, b - 4, 5, 1.8, C.porcelain.o);
      ellipse(g, 24, b - 4, 4, 1, C.porcelain.l);
      rect(g, 20, b - 10, 8, 6, C.porcelain.o);
      rect(g, 21, b - 9, 6, 4, C.porcelain.b);
      rect(g, 21, b - 9, 2, 4, C.porcelain.l);
      rect(g, 26, b - 9, 1, 4, C.porcelain.d);
      rect(g, 21, b - 9, 6, 1, '#a0603a');
      rect(g, 21, b - 8, 6, 1, R.gold.l);
      px(g, 24, b - 7, C.rose.b);
      rect(g, 28, b - 9, 2, 3, C.porcelain.o);
      px(g, 28, b - 8, C.porcelain.b);
      // 熱氣。
      g.globalAlpha = 0.6;
      for (const [x, y] of [[2, b - 19], [3, b - 20], [3, b - 21], [2, b - 22], [24, b - 12], [25, b - 13], [24, b - 14]]) px(g, x, y, '#ffffff');
      g.globalAlpha = 1;
    },
  },
  fruitBowl: {
    size: [1, 1], up: 4,
    /**
     * 水果盤：木碗裡堆著葡萄、蘋果、柳橙、香蕉與梨子，碗身有木紋與上緣高光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      const wd = R.wood;
      shadow(g, 16, H - 3, 22);
      // 碗內側。
      ellipse(g, 16, b - 9, 13, 3.5, wd.o);
      ellipse(g, 16, b - 9, 12, 2.5, wd.d);
      // 香蕉（後方的弧形）。
      for (let x = 15; x <= 27; x++) {
        const t = (x - 21) / 6;
        const y = Math.round(b - 16 + t * t * 4);
        rect(g, x - 1, y - 1, 2, 5, C.banana.o);
      }
      for (let x = 15; x <= 27; x++) {
        const t = (x - 21) / 6;
        const y = Math.round(b - 16 + t * t * 4);
        px(g, x, y, C.banana.l);
        px(g, x, y + 1, C.banana.b);
        px(g, x, y + 2, C.banana.d);
      }
      px(g, 27, b - 13, '#5a3a20');
      // 葡萄串、柳橙、蘋果、梨子。
      for (const [x, y] of [[6, b - 12], [9, b - 12], [7, b - 14], [10, b - 15], [8, b - 10], [11, b - 11], [5, b - 10]]) orb(g, x, y, 1.6, 1.6, C.grape);
      rect(g, 9, b - 18, 1, 2, R.green.d);
      px(g, 10, b - 18, R.leaf.b);
      orb(g, 21, b - 11, 4, 4, C.orange);
      px(g, 23, b - 13, C.orange.d);
      orb(g, 27, b - 10, 2.5, 3, C.pear);
      orb(g, 14, b - 13, 4, 4, R.red);
      rect(g, 14, b - 19, 1, 3, '#5a3a20');
      px(g, 15, b - 19, R.leaf.l);
      px(g, 16, b - 19, R.leaf.b);
      px(g, 16, b - 18, R.leaf.d);
      // 碗身（下半，蓋住水果底部）、碗腳與木紋。
      halfEllipse(g, 16, b - 9, 13, 8, wd.o, true);
      halfEllipse(g, 16, b - 9, 12, 7, wd.b, true);
      halfEllipse(g, 14, b - 9, 9, 5, wd.l, true);
      halfEllipse(g, 16, b - 6, 10, 3, wd.b, true);
      rect(g, 4, b - 9, 24, 1, wd.h);
      rect(g, 4, b - 8, 24, 1, wd.l);
      for (let x = 7; x < 26; x += 4) px(g, x, b - 5, wd.d);
      rect(g, 22, b - 6, 4, 1, wd.d);
      rect(g, 12, b - 2, 8, 2, wd.o);
      rect(g, 13, b - 2, 6, 1, wd.d);
    },
  },
  cakeStand: {
    size: [1, 1], up: 10,
    /**
     * 蛋糕架：玻璃腳盤上的雙層草莓鮮奶油蛋糕（粉紅糖霜滴落、奶油夾層、草莓與一根小蠟燭）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 14);
      // 腳盤。
      disc(g, 16, b - 3, 5, 1.8, 1, C.glassRim);
      post(g, 15, b - 10, 3, 7, C.glassRim);
      disc(g, 16, b - 11, 13, 3, 1, C.glassRim);
      ellipse(g, 16, b - 11, 11, 2, '#e4f4fc');
      /**
       * 畫一層圓柱蛋糕（奶油側面、粉紅糖霜頂與滴落）。
       * @param {number} cx 中心 x。
       * @param {number} by 底部 y。
       * @param {number} rx 半寬。
       * @param {number} h 高。
       */
      const tier = (cx, by, rx, h) => {
        const ty = by - h;
        ellipse(g, cx, by, rx + 1, 2.5, C.cream.o);
        rect(g, cx - rx - 1, ty, rx * 2 + 2, h, C.cream.o);
        ellipse(g, cx, ty, rx + 1, 2.5, C.cream.o);
        ellipse(g, cx, by, rx, 1.5, C.cream.d);
        rect(g, cx - rx, ty, rx * 2, h, C.cream.b);
        rect(g, cx - rx, ty, 2, h, C.cream.l);
        rect(g, cx + rx - 2, ty, 2, h, C.cream.d);
        rect(g, cx - rx, by - Math.ceil(h / 2), rx * 2, 1, '#e86a7a');
        ellipse(g, cx, ty, rx, 1.5, C.pink.l);
        rect(g, cx - rx, ty, rx * 2, 2, C.pink.b);
        for (let x = cx - rx; x < cx + rx; x++) if (hash(x, by, 3) < 0.45) rect(g, x, ty + 2, 1, 1 + Math.floor(hash(by, x) * 2), C.pink.b);
        rect(g, cx - rx + 1, ty - 1, rx, 1, C.pink.h);
      };
      tier(16, b - 12, 9, 8);
      tier(16, b - 21, 6, 6);
      // 草莓與蠟燭。
      for (const x of [9, 16, 23]) {
        orb(g, x, b - 20, 1.5, 1.5, R.red);
        px(g, x, b - 22, R.leaf.b);
      }
      for (const x of [12, 20]) {
        orb(g, x, b - 28, 1.5, 1.5, R.red);
        px(g, x, b - 30, R.leaf.b);
      }
      rect(g, 15, b - 33, 3, 6, C.rose.o);
      rect(g, 16, b - 32, 1, 5, C.rose.l);
      flame(g, 16, b - 34, 0);
    },
  },
  musicBox: {
    size: [1, 1], up: 10, frames: 2,
    /**
     * 音樂盒：打開的玫瑰木盒（蓋內鏡子、金邊、鑰匙孔與側邊發條），盒上有旋轉的小芭蕾舞者，音符飄出（2 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const b = H - 4;
      const w = C.rosewood;
      shadow(g, 16, H - 3, 22);
      // 打開的盒蓋（看見蓋內鏡子）。
      rect(g, 5, b - 30, 22, 14, w.o);
      rect(g, 6, b - 29, 20, 12, w.b);
      rect(g, 6, b - 29, 20, 1, w.l);
      rect(g, 8, b - 27, 16, 9, R.gold.d);
      rect(g, 9, b - 26, 14, 7, '#c8e4f0');
      rect(g, 9, b - 26, 14, 2, '#e4f4fc');
      for (let k = 0; k < 4; k++) px(g, 11 + k, b - 21 - k, '#ffffff');
      // 盒身：頂面（絨布內襯）與正面。
      block(g, 5, b - 16, 22, 4, 11, w, 'wood', 4);
      rect(g, 7, b - 15, 18, 2, '#8a2a4a');
      rect(g, 7, b - 15, 18, 1, '#a83a5a');
      rect(g, 5, b - 11, 22, 1, R.gold.b);
      rect(g, 5, b - 3, 22, 1, R.gold.d);
      // 鑰匙孔與正面金色花紋。
      ellipse(g, 16, b - 8, 2, 2, R.gold.o);
      ellipse(g, 16, b - 8, 1.2, 1.2, R.gold.l);
      px(g, 16, b - 8, R.black.o);
      px(g, 16, b - 7, R.black.o);
      for (const x of [9, 22]) {
        px(g, x, b - 8, R.gold.l);
        px(g, x - 1, b - 7, R.gold.b);
        px(g, x + 1, b - 7, R.gold.b);
      }
      // 側邊發條。
      rect(g, 27, b - 9, 2, 1, R.brass.o);
      rect(g, 28, b - 12, 2, 6, R.brass.o);
      rect(g, 28, b - 11, 1, 4, R.brass.l);
      // 芭蕾舞者（2 幀轉向）。
      const d = f ? -1 : 1;
      rect(g, 16, b - 16, 1, 3, R.gold.b);
      ellipse(g, 16.5, b - 20, 4, 1.6, C.pink.o);
      ellipse(g, 16.5, b - 20, 3, 1, C.pink.l);
      rect(g, 16, b - 24, 2, 4, C.pink.b);
      rect(g, 16, b - 24, 1, 4, C.pink.h);
      rect(g, 16 + d, b - 19, 1, 3, '#f4d0b8');
      orb(g, 16.5, b - 26, 1.3, 1.3, ramp('#f4d0b8'));
      px(g, 16 + (d > 0 ? 1 : 0), b - 28, '#6a3a20');
      rect(g, d > 0 ? 18 : 14, b - 25, 2, 1, '#f4d0b8');
      px(g, d > 0 ? 15 : 18, b - 27, '#f4d0b8');
      // 飄出的音符。
      note(g, f ? 3 : 2, f ? 9 : 11, '#5a3a6a');
      note(g, f ? 26 : 27, f ? 6 : 8, '#5a3a6a');
    },
  },
  photoFrame: {
    size: [1, 1], up: 2,
    /**
     * 相框：木框加金色內襯，照片是藍天草地上的小勇者與貓咪，後方有支撐腳。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 20);
      // 後方支撐腳。
      tube(g, 21, b - 10, 25, b - 1, 2, R.darkWood);
      // 木框與金色內襯。
      const x = 7;
      const y = b - 25;
      rect(g, x - 1, y - 1, 20, 25, R.wood.o);
      rect(g, x, y, 18, 23, R.wood.b);
      woodGrain(g, x, y, 18, 23, R.wood, 5);
      rect(g, x, y, 18, 1, R.wood.h);
      rect(g, x, y, 1, 23, R.wood.l);
      rect(g, x + 17, y, 1, 23, R.wood.d);
      rect(g, x, y + 22, 18, 1, R.wood.d);
      rect(g, x + 2, y + 2, 14, 19, R.gold.b);
      rect(g, x + 2, y + 2, 14, 1, R.gold.h);
      // 照片：天空、雲、草地、小勇者與貓。
      const px0 = x + 3;
      const py0 = y + 3;
      rect(g, px0, py0, 12, 17, '#9ad0f0');
      rect(g, px0, py0, 12, 5, '#c8e8f8');
      ellipse(g, px0 + 9, py0 + 3, 2, 1, '#ffffff');
      rect(g, px0, py0 + 12, 12, 5, '#6ab04c');
      rect(g, px0, py0 + 12, 12, 1, '#8ac860');
      // 小勇者。
      rect(g, px0 + 3, py0 + 5, 3, 3, '#f4d0b8');
      rect(g, px0 + 3, py0 + 5, 3, 1, '#6a3a20');
      px(g, px0 + 4, py0 + 6, '#2a2030');
      rect(g, px0 + 2, py0 + 8, 5, 4, R.red.b);
      rect(g, px0 + 2, py0 + 8, 1, 4, R.red.l);
      rect(g, px0 + 3, py0 + 12, 1, 2, R.blue.d);
      rect(g, px0 + 5, py0 + 12, 1, 2, R.blue.d);
      rect(g, px0 + 7, py0 + 7, 1, 2, '#f4d0b8');
      // 貓。
      rect(g, px0 + 8, py0 + 11, 3, 3, R.sand.b);
      px(g, px0 + 8, py0 + 10, R.sand.b);
      px(g, px0 + 10, py0 + 10, R.sand.b);
      px(g, px0 + 9, py0 + 12, '#2a2030');
      rect(g, px0 + 11, py0 + 13, 1, 1, R.sand.d);
      // 玻璃反光。
      g.globalAlpha = 0.5;
      for (let k = 0; k < 5; k++) px(g, px0 + 1 + k, py0 + 6 - k, '#ffffff');
      g.globalAlpha = 1;
    },
  },
  telescope: {
    size: [1, 1], up: 16,
    /**
     * 望遠鏡：木製三腳架、黃銅接頭與斜指天空的鏡筒（分節銅環、目鏡與前端鏡片）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      shadow(g, 16, H - 3, 24);
      // 後腳、左右前腳。
      tube(g, 16, b - 18, 18, b - 4, 2, R.darkWood);
      tube(g, 16, b - 18, 7, b, 2, R.wood);
      tube(g, 16, b - 18, 25, b, 2, R.wood);
      rect(g, 10, b - 6, 13, 1, R.wood.o);
      // 鏡筒：主筒（藏青）、前端銅罩、銅環與目鏡。
      tube(g, 8, b - 15, 24, b - 30, 5, ramp('#3a4a8a'));
      tube(g, 22, b - 28, 27, b - 33, 6, R.brass);
      tube(g, 5, b - 12, 8, b - 15, 3, R.brass);
      tube(g, 3, b - 10, 5, b - 12, 2, R.black);
      for (const t of [0.35, 0.65]) {
        const x = Math.round(8 + 16 * t);
        const y = Math.round(b - 15 - 15 * t);
        tube(g, x - 2, y + 2, x + 2, y - 2, 1, R.brass);
      }
      // 前端鏡片。
      ellipse(g, 28, b - 34, 2.5, 2.5, R.brass.o);
      ellipse(g, 28, b - 34, 1.7, 1.7, '#a8dcf8');
      px(g, 27, b - 35, '#ffffff');
      // 銅接頭。
      orb(g, 16, b - 19, 2.5, 2, R.brass);
    },
  },
  birdcage: {
    size: [1, 1], up: 16, frames: 2,
    /**
     * 鳥籠：圓頂黃銅鳥籠（吊環、直欄與環帶、底盤），籠內木棲桿上有一隻金絲雀（2 幀轉頭啾啾）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const b = H - 4;
      const br = R.brass;
      shadow(g, 16, H - 3, 22);
      const top = b - 34;
      const wall = b - 24;
      // 籠內淡色背景。
      g.globalAlpha = 0.35;
      ellipse(g, 16, wall, 9, 10, '#4a3a4a');
      rect(g, 7, wall, 18, 20, '#4a3a4a');
      g.globalAlpha = 1;
      // 棲桿、小水杯與金絲雀。
      tube(g, 9, b - 13, 23, b - 13, 1, R.wood);
      rect(g, 19, b - 9, 4, 3, R.blue.o);
      rect(g, 20, b - 9, 2, 2, R.blue.l);
      // 直欄（圓頂部分依橢圓收攏）。
      for (let x = 8; x <= 25; x += 4) {
        const dx = (x + 0.5 - 16.5) / 9.5;
        const ty = Math.round(wall - Math.sqrt(Math.max(0, 1 - dx * dx)) * 10);
        rect(g, x, ty, 1, b - 5 - ty, br.d);
        px(g, x, ty, br.l);
        if (x < 16) rect(g, x, ty + 1, 1, Math.max(0, b - 7 - ty) >> 1, br.b);
      }
      // 金絲雀（畫在欄杆前方，小尺寸時較清楚）。
      const c = C.canary;
      const hy = f ? b - 21 : b - 20;
      orb(g, 15, b - 16, 3.5, 2.5, c);
      rect(g, 10, b - 16, 3, 2, c.d);
      px(g, 10, b - 17, c.o);
      orb(g, 17, hy, 2.2, 2.2, c);
      px(g, 18, hy - 1, '#2a2030');
      px(g, 20, hy, '#f08a2a');
      if (f) px(g, 20, hy + 1, '#f08a2a');
      rect(g, 13, b - 15, 3, 1, c.l);
      px(g, 14, b - 13, '#f08a2a');
      px(g, 16, b - 13, '#f08a2a');
      if (f) {
        px(g, 23, hy - 3, R.gold.l);
        px(g, 24, hy - 4, R.gold.l);
      }
      // 圓頂外緣、環帶、頂鈕與吊環。
      for (let a = 180; a <= 360; a += 4) {
        const t = (a * Math.PI) / 180;
        px(g, 16.5 + Math.cos(t) * 9.5, wall + Math.sin(t) * 10, br.o);
      }
      for (const y of [wall, b - 11]) {
        rect(g, 6, y - 1, 21, 3, br.o);
        rect(g, 7, y, 19, 1, br.l);
      }
      orb(g, 16.5, top - 1, 1.5, 1.5, br);
      for (let a = 0; a < 360; a += 30) {
        const t = (a * Math.PI) / 180;
        px(g, 16.5 + Math.cos(t) * 2.5, top - 5 + Math.sin(t) * 2.5, br.o);
      }
      // 底盤。
      block(g, 5, b - 7, 23, 2, 3, br, null);
      rect(g, 6, b - 3, 21, 1, br.o);
    },
  },
  teddyBear: {
    size: [1, 1], up: 6,
    /**
     * 玩偶熊：坐姿的棕色絨毛熊（圓耳、奶油色口鼻與肚子、腳掌肉墊）與紅色領結。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      const c = C.bear;
      shadow(g, 16, H - 3, 22);
      // 手臂（身體後方）、身體與肚子。
      orb(g, 7, b - 10, 2.5, 4, c);
      orb(g, 25, b - 10, 2.5, 4, c);
      orb(g, 16, b - 9, 7, 6.5, c);
      ellipse(g, 16, b - 8, 4, 4, C.cream.b);
      ellipse(g, 15, b - 9, 2.5, 2.5, C.cream.l);
      // 腿與腳掌肉墊。
      for (const x of [10, 22]) {
        orb(g, x, b - 3, 3.5, 3, c);
        ellipse(g, x, b - 2, 2, 1.8, C.cream.b);
        px(g, x - 1, b - 3, C.cream.d);
        px(g, x + 1, b - 3, C.cream.d);
      }
      // 耳朵與頭。
      for (const x of [10, 22]) {
        orb(g, x, b - 25, 2.8, 2.8, c);
        ellipse(g, x, b - 25, 1.4, 1.4, c.d);
      }
      orb(g, 16, b - 20, 7.5, 6.5, c);
      // 毛絨質感（零星亮點）。
      for (let k = 0; k < 14; k++) {
        const x = 10 + Math.floor(hash(k, 1, 7) * 12);
        const y = b - 25 + Math.floor(hash(k, 2, 7) * 18);
        if (x < 15 && y < b - 18) px(g, x, y, c.l);
      }
      // 口鼻、眼睛與嘴。
      ellipse(g, 16, b - 17, 3.5, 2.5, C.cream.l);
      rect(g, 15, b - 19, 3, 2, R.black.o);
      px(g, 15, b - 19, R.black.l);
      px(g, 16, b - 17, R.black.o);
      px(g, 15, b - 16, R.black.o);
      px(g, 17, b - 16, R.black.o);
      for (const x of [12, 20]) {
        rect(g, x, b - 22, 2, 2, R.black.o);
        px(g, x, b - 22, '#ffffff');
      }
      px(g, 11, b - 19, C.rose.l);
      px(g, 21, b - 19, C.rose.l);
      // 紅色領結。
      rect(g, 11, b - 15, 4, 4, R.red.o);
      rect(g, 18, b - 15, 4, 4, R.red.o);
      rect(g, 12, b - 14, 2, 2, R.red.b);
      rect(g, 19, b - 14, 2, 2, R.red.d);
      px(g, 12, b - 14, R.red.l);
      rect(g, 15, b - 14, 3, 2, R.red.o);
      px(g, 16, b - 14, R.red.l);
    },
  },
  piggyBank: {
    size: [1, 1], up: 2,
    /**
     * 存錢筒：粉紅小豬（投幣孔、捲尾巴、鼻子與花朵彩繪），一枚金幣正要投進去。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const b = H - 4;
      const p = C.pig;
      shadow(g, 15, H - 3, 22);
      // 後腳（較暗）、捲尾巴。
      for (const x of [10, 21]) post(g, x, b - 5, 3, 4, ramp(p.d));
      for (const [x, y] of [[4, b - 12], [3, b - 13], [3, b - 14], [4, b - 15], [5, b - 14], [5, b - 11]]) px(g, x, y, p.o);
      // 身體。
      orb(g, 15, b - 10, 10, 7, p);
      // 前腳。
      for (const x of [7, 18]) {
        post(g, x, b - 4, 3, 3, p);
        rect(g, x, b - 1, 3, 1, p.o);
      }
      // 耳朵、鼻子、眼睛。
      for (const [x, y] of [[18, b - 18], [22, b - 17]]) {
        rect(g, x - 1, y - 1, 4, 4, p.o);
        rect(g, x, y, 2, 2, p.b);
        px(g, x, y, p.l);
      }
      ellipse(g, 25, b - 10, 2.8, 3.2, p.o);
      ellipse(g, 25, b - 10, 1.8, 2.3, p.l);
      px(g, 24, b - 11, p.o);
      px(g, 26, b - 11, p.o);
      px(g, 24, b - 9, p.o);
      px(g, 26, b - 9, p.o);
      rect(g, 20, b - 13, 2, 2, R.black.o);
      px(g, 20, b - 13, '#ffffff');
      px(g, 22, b - 10, C.rose.b);
      // 身上的花朵彩繪。
      for (const [x, y] of [[10, b - 8], [14, b - 6]]) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(g, x + dx, y + dy, '#ffffff');
        px(g, x, y, R.gold.l);
      }
      // 投幣孔與金幣。
      rect(g, 11, b - 17, 6, 2, p.o);
      rect(g, 12, b - 17, 4, 1, '#3a2030');
      rect(g, 12, b - 23, 4, 6, R.gold.o);
      rect(g, 13, b - 22, 2, 5, R.gold.l);
      px(g, 13, b - 22, R.gold.h);
      rect(g, 12, b - 17, 4, 1, R.gold.o);
      sparkle(g, 19, b - 23, '#fff4b0');
    },
  },
  crystalBall: {
    size: [1, 1], up: 8, frames: 4,
    /**
     * 水晶球：金爪托座上的紫色水晶球，球內星雲漩渦旋轉、外圍光暈脈動與閃光（4 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const b = H - 4;
      const cr = C.crystal;
      const cx = 16;
      const cy = b - 16;
      shadow(g, 16, H - 3, 18);
      glow(g, cx, cy, 13 + (f % 2), 12 + (f % 2), '#c8a0ff', 0.12);
      // 底座：深色木座與金邊。
      disc(g, 16, b - 6, 8, 2.5, 3, R.darkWood);
      rect(g, 8, b - 5, 16, 1, R.gold.b);
      // 玻璃球與內部漩渦。
      orb(g, cx, cy, 9, 9, cr);
      g.save();
      g.beginPath();
      g.arc(cx, cy, 8.5, 0, Math.PI * 2);
      g.clip();
      for (let k = 0; k < 26; k++) {
        const a = k * 0.42 + f * (Math.PI / 2);
        const rr = 1 + k * 0.26;
        const c = k % 3 === 0 ? '#ffffff' : k % 2 ? '#f0b8ff' : '#9ae8ff';
        px(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8, c);
        if (k > 6) px(g, cx - Math.cos(a) * rr * 0.7, cy - Math.sin(a) * rr * 0.6, cr.l);
      }
      g.restore();
      ellipse(g, cx - 4, cy - 5, 2.5, 1.5, cr.h);
      px(g, cx - 5, cy - 5, '#ffffff');
      px(g, cx + 5, cy + 5, cr.l);
      // 金爪。
      for (const x of [9, 16, 23]) {
        rect(g, x - 1, b - 10, 3, 4, R.gold.o);
        px(g, x, b - 9, R.gold.l);
        px(g, x, b - 8, R.gold.b);
      }
      // 閃光。
      const sp = [[4, b - 26], [27, b - 22], [26, b - 30], [5, b - 14]];
      for (let i = 0; i < sp.length; i++) if ((i + f) % 4 < 2) sparkle(g, sp[i][0], sp[i][1], '#e8c8ff', (i + f) % 4 === 0 ? 1 : 0);
    },
  },
  // ── 燈具 ──
  chandelier: {
    size: [1, 1], up: 30, frames: 3,
    /**
     * 吊燈：從上方垂下的鐵鍊、金色燈環與五根蠟燭（後排較小）、垂掛的水晶吊墜與底部大水晶，地面映出暖光（3 幀閃爍）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const gd = R.gold;
      const ice = C.ice;
      // 地面暖光。
      glow(g, 16, H - 5, 13, 4, '#ffe8a0', 0.12);
      glow(g, 16, 20, 16 + (f === 1 ? 1 : 0), 12, '#ffd870', 0.1);
      // 鐵鍊與頂蓋。
      rect(g, 12, 0, 9, 2, gd.o);
      rect(g, 13, 0, 7, 1, gd.b);
      for (let y = 2; y < 14; y += 3) {
        rect(g, 15, y, 3, 3, R.iron.o);
        px(g, 16, y + 1, y % 2 ? R.iron.l : R.iron.b);
      }
      // 後排兩根蠟燭（較小較暗）。
      for (const x of [10, 22]) {
        rect(g, x - 1, 17, 4, 6, C.candle.o);
        rect(g, x, 18, 2, 5, C.candle.d);
      }
      flame(g, 11, 16, (f + 1) % 3);
      flame(g, 23, 16, (f + 2) % 3);
      // 中央燈柱。
      post(g, 15, 14, 3, 16, gd);
      orb(g, 16.5, 22, 3, 2.5, gd);
      // 燈環（橢圓，前緣較亮）。
      for (let a = 0; a < 360; a += 4) {
        const t = (a * Math.PI) / 180;
        rect(g, 16.5 + Math.cos(t) * 12 - 1, 26 + Math.sin(t) * 3.5 - 1, 3, 3, gd.o);
      }
      for (let a = 0; a < 360; a += 4) {
        const t = (a * Math.PI) / 180;
        px(g, 16.5 + Math.cos(t) * 12, 26 + Math.sin(t) * 3.5, Math.sin(t) > 0 ? gd.l : gd.d);
      }
      // 環上與中央的水晶吊墜。
      for (const [x, y, n] of [[6, 28, 3], [11, 30, 4], [16, 30, 5], [22, 30, 4], [27, 28, 3]]) {
        rect(g, x, y, 1, n - 2, ice.d);
        rect(g, x - 1, y + n - 2, 3, 2, ice.o);
        px(g, x, y + n - 2, ice.h);
        px(g, x, y + n, ice.l);
      }
      for (let k = 0; k < 4; k++) rect(g, 16 - Math.min(k, 3 - k), 34 + k, 1 + Math.min(k, 3 - k) * 2, 1, k < 2 ? ice.l : ice.b);
      rect(g, 16, 34, 1, 4, ice.h);
      px(g, 16, 38, ice.d);
      // 前排三根蠟燭與燭杯。
      for (const x of [5, 16, 27]) {
        ellipse(g, x + 0.5, 25, 3, 1.3, gd.o);
        ellipse(g, x + 0.5, 25, 2, 0.8, gd.l);
        rect(g, x - 1, x === 16 ? 17 : 18, 4, x === 16 ? 8 : 7, C.candle.o);
        rect(g, x, x === 16 ? 18 : 19, 2, x === 16 ? 6 : 5, C.candle.b);
        px(g, x, x === 16 ? 18 : 19, C.candle.h);
      }
      flame(g, 5, 17, f);
      flame(g, 16, 16, (f + 2) % 3);
      flame(g, 27, 17, (f + 1) % 3);
    },
  },
  floorLamp: {
    size: [1, 1], up: 34,
    /**
     * 立燈：圓形鐵底座、細長燈桿、亮著的布燈罩（直褶、金色飾邊與流蘇）與拉繩，燈罩周圍有暖光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const fb = C.fabric;
      shadow(g, 16, H - 2, 16);
      glow(g, 16, 16, 16, 15, '#fff0b0', 0.12);
      // 燈罩下方的光。
      g.globalAlpha = 0.14;
      for (let y = 25; y < 40; y++) {
        const w = 22 - (y - 25) * 1.2;
        rect(g, 16 - w / 2, y, w, 1, '#fff0a0');
      }
      g.globalAlpha = 1;
      // 燈桿與底座。
      post(g, 15, 24, 2, H - 29, R.brass);
      for (const y of [32, 46]) {
        rect(g, 14, y, 4, 2, R.brass.o);
        rect(g, 15, y, 2, 1, R.brass.l);
      }
      disc(g, 16, H - 7, 7, 2.5, 2, R.brass);
      // 燈罩：上窄下寬，左亮右暗，直褶紋。
      for (let y = 0; y < 18; y++) {
        const w = 12 + Math.floor(y * 0.67) * 2;
        const x0 = 16 - w / 2;
        rect(g, x0 - 1, 6 + y, w + 2, 1, fb.o);
        for (let i = 0; i < w; i++) {
          const t = i / w;
          let c = t < 0.25 ? fb.h : t < 0.6 ? fb.l : t < 0.85 ? fb.b : fb.d;
          if (i % 4 === 3) c = mix(c, fb.d, 0.5);
          px(g, x0 + i, 6 + y, c);
        }
      }
      rect(g, 9, 5, 14, 1, fb.o);
      rect(g, 10, 6, 12, 1, R.gold.l);
      rect(g, 4, 22, 24, 2, R.gold.b);
      rect(g, 4, 22, 24, 1, R.gold.l);
      for (let x = 4; x < 28; x += 2) rect(g, x, 24, 1, 2, R.gold.d);
      // 拉繩與珠子。
      rect(g, 22, 24, 1, 6, R.brass.d);
      orb(g, 22, 31, 1, 1, R.gold);
    },
  },
  paperLantern: {
    size: [1, 1], up: 0,
    /**
     * 紙燈籠（牆掛）：掛釘與吊繩、黑漆上下蓋、紅紙燈身（橫向竹骨、內部透出暖光與金色圓紋）與金色流蘇。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const l = C.lantern;
      const lq = C.lacquer;
      glow(g, 16, 16, 15, 14, '#ffb070', 0.1);
      // 掛釘與吊繩。
      rect(g, 15, 0, 3, 2, R.iron.o);
      px(g, 16, 0, R.iron.l);
      rect(g, 16, 2, 1, 3, R.gold.d);
      // 燈身：紅紙、內部暖光、橫向竹骨。
      ellipse(g, 16.5, 16, 12, 10, l.o);
      ellipse(g, 16.5, 16, 11, 9, l.d);
      ellipse(g, 15.5, 15.5, 9.5, 8, l.b);
      ellipse(g, 14.5, 15, 6, 6, l.l);
      ellipse(g, 14, 14.5, 3, 3.5, mix(l.h, '#ffe0a0', 0.4));
      for (let y = 9; y <= 23; y += 3) {
        const dy = (y + 0.5 - 16) / 9;
        const half = Math.round(11 * Math.sqrt(Math.max(0, 1 - dy * dy)));
        g.globalAlpha = 0.55;
        rect(g, 16.5 - half, y, half * 2, 1, l.o);
        g.globalAlpha = 1;
      }
      // 金色圓紋。
      ellipse(g, 16.5, 16, 4, 4, R.gold.d);
      ellipse(g, 16.5, 16, 3, 3, R.gold.l);
      rect(g, 16, 13, 1, 7, R.gold.d);
      rect(g, 14, 16, 5, 1, R.gold.d);
      px(g, 16, 16, R.gold.h);
      // 上下黑漆蓋。
      block(g, 11, 5, 11, 1, 2, lq, null);
      block(g, 11, 25, 11, 1, 2, lq, null);
      px(g, 12, 5, lq.h);
      // 金色流蘇。
      rect(g, 15, 28, 3, 1, R.gold.o);
      for (const x of [14, 15, 16, 17, 18]) rect(g, x, 29, 1, x === 16 ? 3 : 2, x < 16 ? R.gold.l : R.gold.b);
    },
  },
  fairyLights: {
    size: [2, 1], up: 0, frames: 3,
    /**
     * 星星燈串（牆掛 2 格寬）：三根掛釘之間垂下的兩段電線，掛著五彩星形燈泡，輪流閃爍（3 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const wr = C.wire;
      const colors = [R.gold, C.pink, C.ice, ramp('#a8e060'), C.orange];
      const nails = [[3, 5], [32, 7], [60, 5]];
      const bulbs = [];
      // 兩段下垂的電線（拋物線），沿線記下燈泡位置。
      for (let s = 0; s < 2; s++) {
        const [x0, y0] = nails[s];
        const [x1, y1] = nails[s + 1];
        const pts = [];
        for (let x = x0; x <= x1; x++) {
          const t = (x - x0) / (x1 - x0);
          pts.push([x, Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 7)]);
        }
        for (const [x, y] of pts) rect(g, x, y - 1, 1, 3, wr.o);
        for (const [x, y] of pts) px(g, x, y, wr.b);
        for (const t of [0.17, 0.5, 0.83]) bulbs.push(pts[Math.round(t * (pts.length - 1))]);
      }
      // 掛釘。
      for (const [x, y] of nails) {
        rect(g, x - 1, y - 2, 3, 3, R.iron.o);
        px(g, x, y - 1, R.iron.h);
      }
      // 星形燈泡（燈座、星星，輪流發亮）。
      for (let i = 0; i < bulbs.length; i++) {
        const [x, y] = bulbs[i];
        const r = colors[i % colors.length];
        rect(g, x - 1, y + 1, 3, 3, wr.o);
        px(g, x, y + 2, wr.l);
        starBulb(g, x, y + 7, r, (i + f) % 3 !== 0);
      }
      // 發亮時的小閃光。
      for (let i = 0; i < bulbs.length; i++) {
        if ((i + f) % 3 !== 1 || i % 2) continue;
        const [x, y] = bulbs[i];
        sparkle(g, x + 5, y + 3, '#ffffff');
      }
    },
  },
  magicLamp: {
    size: [1, 1], up: 10, frames: 4,
    /**
     * 魔法燈：金色神燈（壺蓋寶石、彎嘴、把手、紅寶石）從壺嘴冒出旋轉上升的紫藍魔法煙與閃光（4 幀），帶發光光暈。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const b = H - 4;
      const gd = R.gold;
      const m = C.magic;
      shadow(g, 15, H - 3, 20);
      glow(g, 20, b - 22, 12 + (f % 2), 14, '#d8a0ff', 0.12);
      // 魔法煙：從壺嘴往上盤旋的光團。
      for (let k = 0; k < 9; k++) {
        const t = k / 8;
        const x = 26 - t * 8 + Math.sin(t * 7 + f * (Math.PI / 2)) * 3;
        const y = b - 13 - t * 26;
        const r = 0.8 + t * 2.6 - (t > 0.9 ? 1.2 : 0);
        g.globalAlpha = 0.9;
        ellipse(g, x, y, r + 1, r + 1, m.d);
        g.globalAlpha = 1;
      }
      for (let k = 0; k < 9; k++) {
        const t = k / 8;
        const x = 26 - t * 8 + Math.sin(t * 7 + f * (Math.PI / 2)) * 3;
        const y = b - 13 - t * 26;
        const r = 0.8 + t * 2.6 - (t > 0.9 ? 1.2 : 0);
        g.globalAlpha = 0.85;
        ellipse(g, x, y, r, r, k % 2 ? m.l : mix(m.l, '#9ae8ff', 0.5));
        ellipse(g, x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.4, m.h);
        g.globalAlpha = 1;
      }
      // 把手。
      for (let a = 90; a <= 270; a += 12) {
        const t = (a * Math.PI) / 180;
        rect(g, 6 + Math.cos(t) * 3.5 - 1, b - 9 + Math.sin(t) * 3 - 1, 3, 3, gd.o);
      }
      for (let a = 90; a <= 270; a += 12) {
        const t = (a * Math.PI) / 180;
        px(g, 6 + Math.cos(t) * 3.5, b - 9 + Math.sin(t) * 3, gd.l);
      }
      // 壺嘴（往右上彎）。
      tube(g, 19, b - 6, 24, b - 9, 3, gd);
      tube(g, 24, b - 9, 27, b - 13, 2, gd);
      // 壺身、壺腳、壺蓋與寶石。
      disc(g, 14, b - 3, 4, 1.5, 1, gd);
      orb(g, 13, b - 7, 8, 4, gd);
      rect(g, 5, b - 7, 17, 1, gd.d);
      for (let x = 7; x < 20; x += 3) px(g, x, b - 6, gd.l);
      ellipse(g, 13, b - 11, 4.5, 1.5, gd.o);
      ellipse(g, 13, b - 11, 3.5, 1, gd.l);
      orb(g, 13, b - 14, 2.5, 2, gd);
      orb(g, 13, b - 17, 1, 1.2, C.magic);
      orb(g, 13, b - 7, 1.5, 1.5, R.red);
      // 閃光。
      const sp = [[6, b - 22], [28, b - 30], [12, b - 32], [27, b - 20]];
      for (let i = 0; i < sp.length; i++) if ((i + f) % 4 < 2) sparkle(g, sp[i][0], sp[i][1], '#f0d8ff', (i + f) % 4 === 0 ? 1 : 0);
    },
  },
};
