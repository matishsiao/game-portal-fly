// 家園美術：區域主題與 Boss 主題裝飾（繪製規則見 homeDraw.js 開頭說明，格式同 homeArt.js 的 HOME_ART）。
// 這一組是稀有與傳說收藏品，細節最多：多層光暈、刻面、動態火焰與機關，配色取自各區域與 Boss 的怪物圖。

import { mix, ramp, R, rect, px, hash, ellipse, orb, shadow, stoneGrain, block, post, foliage } from '../homeDraw.js';

// ── 本組共用的小工具 ──

/**
 * 以掃描線填滿多邊形（整數像素、不反鋸齒）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number[][]} pts 頂點 [[x, y], ...]。
 * @param {string} c 顏色。
 */
function poly(g, pts, c) {
  g.fillStyle = c;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
    const sy = y + 0.5;
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
    }
    // 交點由左到右排序。
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.round(xs[k]);
      const b = Math.round(xs[k + 1]);
      if (b > a) g.fillRect(a, y, b - a, 1);
    }
  }
}

/**
 * 把多邊形整體平移。
 * @param {number[][]} pts 頂點。
 * @param {number} dx 水平位移。
 * @param {number} dy 垂直位移。
 * @returns {number[][]} 平移後的新頂點。
 */
function shift(pts, dx, dy) {
  const out = [];
  for (const p of pts) out.push([p[0] + dx, p[1] + dy]);
  return out;
}

/**
 * 帶 1 像素外框的多邊形（先往四個方向各偏移 1 像素畫外框色，再畫填色）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number[][]} pts 頂點。
 * @param {string} c 填色。
 * @param {string} oc 外框色。
 */
function opoly(g, pts, c, oc) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) poly(g, shift(pts, dx, dy), oc);
  poly(g, pts, c);
}

/**
 * 粗線段：沿線段逐點蓋上 w × w 的方塊。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 起點 x。
 * @param {number} y0 起點 y。
 * @param {number} x1 終點 x。
 * @param {number} y1 終點 y。
 * @param {number} w 粗細。
 * @param {string} c 顏色。
 */
function seg(g, x0, y0, x1, y1, w, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const h = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) rect(g, Math.round(x0 + ((x1 - x0) * i) / n) - h, Math.round(y0 + ((y1 - y0) * i) / n) - h, w, w, c);
}

/**
 * 有外框、左側亮邊的粗折線（樹枝、觸手、牛角、杖身等）：先畫外框，再畫基底與亮面。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number[][]} pts 折線頂點 [[x, y, 粗細], ...]（粗細沿線漸變）。
 * @param {object} r 色階。
 * @param {boolean} [shade=true] 是否畫右側陰影與左側亮面。
 */
function limb(g, pts, r, shade = true) {
  for (let pass = 0; pass < 4; pass++) {
    if (pass > 1 && !shade) break;
    for (let i = 0; i + 1 < pts.length; i++) {
      const [x0, y0, w0] = pts[i];
      const [x1, y1, w1] = pts[i + 1];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const x = x0 + (x1 - x0) * t;
        const y = y0 + (y1 - y0) * t;
        const w = Math.max(1, Math.round(w0 + (w1 - w0) * t));
        const h = Math.floor(w / 2);
        if (pass === 0) rect(g, Math.round(x) - h - 1, Math.round(y) - h - 1, w + 2, w + 2, r.o);
        else if (pass === 1) rect(g, Math.round(x) - h, Math.round(y) - h, w, w, r.b);
        else if (pass === 2 && w > 2) rect(g, Math.round(x) + w - h - 1, Math.round(y) - h + 1, 1, Math.max(1, w - 1), r.d);
        else if (pass === 3 && w > 2) rect(g, Math.round(x) - h, Math.round(y) - h, 1, Math.max(1, w - 1), r.l);
      }
    }
  }
}

/**
 * 半透明光暈（內外兩層）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {string} c 顏色。
 * @param {number} [a=0.18] 外層透明度。
 */
function glow(g, cx, cy, rx, ry, c, a = 0.18) {
  g.globalAlpha = a;
  ellipse(g, cx, cy, rx, ry, c);
  g.globalAlpha = a * 1.2;
  ellipse(g, cx, cy, rx * 0.6, ry * 0.6, c);
  g.globalAlpha = 1;
}

/**
 * 水滴形火焰（外焰、內焰、焰心三層，尖端多一個像素）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} by 火焰底部 y。
 * @param {number} h 高度。
 * @param {string[]} pal [外焰, 內焰, 焰心]。
 * @param {number} [lean=0] 尖端左右偏移。
 */
function flame(g, x, by, h, pal, lean = 0) {
  const w = Math.max(1.5, h / 4 + 0.5);
  ellipse(g, x, by - h * 0.35, w + 0.5, h * 0.35 + 0.5, pal[0]);
  poly(g, [[x - w + 0.5, by - h * 0.4], [x + lean + 0.5, by - h - 1], [x + w + 0.5, by - h * 0.4]], pal[0]);
  ellipse(g, x, by - h * 0.32, w - 0.5, h * 0.28, pal[1]);
  poly(g, [[x - w + 1.5, by - h * 0.38], [x + lean * 0.6 + 0.5, by - h * 0.85], [x + w - 0.5, by - h * 0.38]], pal[1]);
  ellipse(g, x, by - h * 0.25, Math.max(1, w - 1.5), Math.max(1, h * 0.18), pal[2]);
}

/**
 * 齒輪：外圈齒、輪身（左上亮）、輪輻與軸心；rot 為旋轉角度。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} r 輪身半徑。
 * @param {number} teeth 齒數。
 * @param {number} rot 旋轉角度（弧度）。
 * @param {object} rr 色階。
 */
function gear(g, cx, cy, r, teeth, rot, rr) {
  const tip = [];
  for (let k = 0; k < teeth; k++) {
    const a = rot + (k / teeth) * Math.PI * 2;
    tip.push([cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1)]);
  }
  for (const [x, y] of tip) rect(g, Math.round(x) - 1, Math.round(y) - 1, 3, 3, rr.o);
  ellipse(g, cx, cy, r + 1, r + 1, rr.o);
  for (const [x, y] of tip) px(g, Math.round(x), Math.round(y), y < cy ? rr.l : rr.b);
  ellipse(g, cx, cy, r, r, rr.d);
  ellipse(g, cx - 0.5, cy - 0.5, r - 0.5, r - 0.5, rr.b);
  if (r >= 4) {
    ellipse(g, cx, cy, r - 2, r - 2, rr.d);
    for (let k = 0; k < 3; k++) {
      const a = rot + (k / 3) * Math.PI * 2;
      seg(g, cx, cy, cx + Math.cos(a) * (r - 1.5), cy + Math.sin(a) * (r - 1.5), 1, rr.b);
    }
  }
  ellipse(g, cx, cy, Math.max(1, r * 0.3), Math.max(1, r * 0.3), rr.l);
  px(g, Math.round(cx - r * 0.55), Math.round(cy - r * 0.55), rr.h);
}

/**
 * 牆上獎座底板：深色木盾牌、金色鑲邊與木紋，並在牆上留下淡淡的投影。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} [top=9] 盾牌上緣 y。
 */
function plaque(g, top = 9) {
  const pts = [[7, top], [25, top], [26, top + 2], [26, 21], [16, 30], [6, 21], [6, top + 2]];
  g.globalAlpha = 0.22;
  poly(g, shift(pts, 1, 2), '#000000');
  g.globalAlpha = 1;
  opoly(g, pts, R.gold.b, R.gold.o);
  const inner = [[8, top + 2], [24, top + 2], [24, 20], [16, 27], [8, 20]];
  poly(g, inner, R.darkWood.b);
  for (let y = top + 4; y < 26; y += 3) for (let x = 9; x < 24; x++) if (hash(x >> 2, y) < 0.55) px(g, x, y, R.darkWood.d);
  rect(g, 7, top, 18, 1, R.gold.h);
  rect(g, 8, top + 2, 16, 1, R.darkWood.l);
}

/**
 * 四芒星閃光（十字形、中心最亮）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {string} c 顏色。
 * @param {number} [s=1] 光芒長度。
 */
function sparkle(g, x, y, c, s = 1) {
  g.globalAlpha = 0.75;
  for (let k = 1; k <= s; k++) {
    px(g, x - k, y, c);
    px(g, x + k, y, c);
    px(g, x, y - k, c);
    px(g, x, y + k, c);
  }
  g.globalAlpha = 1;
  px(g, x, y, '#ffffff');
}

// 本組用到的額外色階。
const C = {
  slime: ramp('#62c45a'),
  shroom: ramp('#d8443e'),
  basalt: ramp('#4e3e3a'),
  lava: ramp('#f0602a'),
  ice: ramp('#7ec8ee'),
  snow: ramp('#dce8f2'),
  cloud: ramp('#eef0fa'),
  bone: ramp('#ece2c8'),
  wax: ramp('#8a70b8'),
  lapis: ramp('#2c5cb8'),
  turq: ramp('#3ab8b0'),
  coral: ramp('#f07a8c'),
  coralO: ramp('#f0a050'),
  rockSea: ramp('#b8a898'),
  amethyst: ramp('#7a48c0'),
  obsidian: ramp('#4a3254'),
  eyeLid: ramp('#5a3a7a'),
  bark: ramp('#7a5434'),
  treeLeaf: ramp('#4f9a3a'),
  golem: ramp('#625048'),
  lichBlue: ramp('#3e52a0'),
  frost: ramp('#8ab4ff'),
  bull: ramp('#8a4a2c'),
  horn: ramp('#f0e6c8'),
  muzzle: ramp('#b08262'),
  scroll: ramp('#2a4a9a'),
  paper: ramp('#f2e6c4'),
  thunder: ramp('#ffd84a'),
  tome: ramp('#5a3c84'),
  tentacle: ramp('#9a3e98'),
  jarWater: ramp('#3a9ab0'),
  titanB: ramp('#c0903e'),
  titanG: ramp('#6a6a7c'),
  dragon: ramp('#cc362c'),
  dragonW: ramp('#8a2222'),
  belly: ramp('#ffd04d'),
  velvet: ramp('#c42a3c'),
  demonHorn: ramp('#e8d8b8'),
};

/** 綠色幽火、紫色魔焰與一般火焰的三色。 */
const FIRE = {
  green: ['#2ab878', '#6af0a0', '#e8fff0'],
  violet: ['#8a3ad0', '#c890ff', '#f8eaff'],
  warm: ['#e04a2a', '#f8a030', '#fff0a0'],
};

/** 區域主題與 Boss 主題裝飾的繪製方式（代碼 → { size, up, frames?, draw }）。 */
export const ART = {
  // ── 區域主題 ──
  slimeCushion: {
    size: [1, 1], up: 4,
    /**
     * 史萊姆抱枕：圓滾滾的果凍形布偶，透明感氣泡、縫線、笑臉與布標。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 4;
      shadow(g, 16, by + 1, 26);
      const s = C.slime;
      /**
       * 麻糬形輪廓：上半部是橢圓，下緣稍微內收成圓角。
       * @param {number} cx 中心 x。
       * @param {number} bottom 底部 y。
       * @param {number} rx 半寬。
       * @param {number} h 高。
       * @param {string} c 顏色。
       */
      const dome = (cx, bottom, rx, h, c) => {
        for (let y = bottom - h; y < bottom; y++) {
          const t = (bottom - y) / h;
          const u = t >= 0.4 ? (t - 0.4) / 0.6 : ((0.4 - t) / 0.4) * 0.62;
          const half = rx * Math.sqrt(Math.max(0, 1 - u * u));
          rect(g, Math.round(cx - half), y, Math.round(cx + half) - Math.round(cx - half), 1, c);
        }
      };
      dome(16, by + 1, 14, 22, s.o);
      dome(16, by, 13, 20, s.d);
      dome(15, by - 2, 12, 17, s.b);
      ellipse(g, 11, by - 13, 6, 3.5, s.l);
      ellipse(g, 9, by - 14, 2, 1.5, s.h);
      px(g, 14, by - 17, s.h);
      // 果凍內的小氣泡與縫線。
      for (const [x, y, r] of [[24, by - 10, 1.5], [21, by - 15, 1], [7, by - 6, 1]]) {
        ellipse(g, x, y, r, r, s.l);
        px(g, x - 1, y - 1, s.h);
      }
      for (let x = 5; x < 27; x += 2) px(g, x, by - 3, s.d);
      // 頂端的小水滴尖。
      opoly(g, [[13, by - 19], [17, by - 25], [19, by - 19]], s.b, s.o);
      px(g, 16, by - 22, s.l);
      dome(16, by - 17, 5, 2, s.b);
      // 臉：大眼、高光、腮紅、小嘴。
      for (const x of [10, 20]) {
        rect(g, x, by - 12, 3, 5, '#1f2a24');
        rect(g, x - 1, by - 11, 5, 3, '#1f2a24');
        px(g, x, by - 11, '#ffffff');
        px(g, x + 1, by - 11, '#ffffff');
        px(g, x + 2, by - 8, '#6a8a7a');
      }
      g.globalAlpha = 0.55;
      ellipse(g, 8, by - 6, 2.5, 1.2, '#ff8aa8');
      ellipse(g, 24, by - 6, 2.5, 1.2, '#ff8aa8');
      g.globalAlpha = 1;
      rect(g, 15, by - 7, 1, 1, '#1f2a24');
      rect(g, 16, by - 6, 1, 1, '#1f2a24');
      rect(g, 17, by - 7, 1, 1, '#1f2a24');
      // 右下角的布標。
      rect(g, 25, by - 6, 4, 5, R.cream.o);
      rect(g, 26, by - 5, 2, 3, R.cream.l);
      px(g, 26, by - 4, R.red.b);
    },
  },
  mushroomStool: {
    size: [1, 1], up: 6,
    /**
     * 蘑菇凳：紅底白點的菌傘當座面，下方菌褶陰影與粗壯的乳白菌柄。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 2;
      shadow(g, 16, by, 26);
      const st = R.cream;
      // 菌柄（底部外擴的根部）。
      rect(g, 9, 19, 14, by - 19, st.o);
      rect(g, 7, by - 5, 18, 5, st.o);
      rect(g, 10, 19, 12, by - 20, st.b);
      rect(g, 8, by - 4, 16, 3, st.b);
      rect(g, 10, 19, 2, by - 20, st.l);
      rect(g, 19, 19, 3, by - 20, st.d);
      rect(g, 8, by - 2, 16, 1, st.d);
      for (const x of [13, 16]) for (let y = 23; y < by - 4; y += 3) px(g, x, y, mix(st.b, st.d, 0.5));
      px(g, 11, 24, st.h);
      // 菌褶：菌傘下的暗色環。
      ellipse(g, 16, 20, 12, 3, st.o);
      ellipse(g, 16, 20, 11, 2, mix(st.d, '#7a4a3a', 0.4));
      for (let x = 7; x < 26; x += 2) px(g, x, 20, st.d);
      // 菌傘：外框、陰影、基底、頂面亮區。
      ellipse(g, 16, 12, 15, 9, C.shroom.o);
      ellipse(g, 16, 12, 14, 8, C.shroom.d);
      ellipse(g, 15, 11, 13, 7, C.shroom.b);
      ellipse(g, 14, 8, 10, 4, C.shroom.l);
      ellipse(g, 11, 7, 4, 1.5, C.shroom.h);
      // 白色斑點（有陰影）。
      for (const [x, y, rx, ry] of [[8, 11, 2.5, 2], [17, 6, 3, 1.5], [23, 10, 2, 1.5], [13, 15, 2, 1.5], [21, 15, 1.5, 1]]) {
        ellipse(g, x + 0.5, y + 0.5, rx, ry, C.shroom.d);
        ellipse(g, x, y, rx, ry, R.white.b);
        px(g, Math.round(x - rx * 0.4), Math.round(y - ry * 0.4), '#ffffff');
      }
    },
  },
  lavaLamp: {
    size: [1, 1], up: 14, frames: 4,
    /**
     * 熔岩石燈：玄武岩底座與燈帽（裂縫透出岩漿光），玻璃燈管內的岩漿團上下浮動（4 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 4;
      shadow(g, 16, by, 20);
      glow(g, 16, 24, 15, 18, '#ff8a3a', f % 2 ? 0.14 : 0.1);
      const top = 10;
      const bot = by - 9;
      /**
       * 燈管在 y 列的半寬（上窄、中寬、下略收）。
       * @param {number} y 列。
       * @returns {number} 半寬。
       */
      const hw = (y) => 3 + 4 * Math.sin(Math.PI * (0.1 + 0.75 * ((y - top) / (bot - top))));
      // 燈管外框與液體（上暗紅、下亮橘）。
      for (let y = top; y < bot; y++) {
        const w = hw(y);
        rect(g, Math.round(16 - w) - 1, y, Math.round(16 + w) - Math.round(16 - w) + 2, 1, C.basalt.o);
      }
      for (let y = top; y < bot; y++) {
        const w = hw(y);
        const t = (y - top) / (bot - top);
        rect(g, Math.round(16 - w), y, Math.round(16 + w) - Math.round(16 - w), 1, mix('#8a1a2a', '#e8501a', t));
      }
      // 岩漿團：位置隨幀變化。
      const blobs = [[15, [28, 24, 19, 15][f], 3.5, 3], [17, [15, 19, 23, 27][f], 2.5, 2.5], [14, [21, 17, 14, 18][f], 1.5, 1.5]];
      for (const [x, y, rx, ry] of blobs) {
        ellipse(g, x, y, rx + 0.5, ry + 0.5, '#f07020');
        ellipse(g, x, y, rx, ry, '#ffa830');
        ellipse(g, x - 0.5, y - 0.5, rx * 0.5, ry * 0.5, '#ffe070');
      }
      ellipse(g, 16, bot - 1, 6, 2, '#ffa830');
      ellipse(g, 16, bot - 1, 4, 1, '#ffe070');
      // 玻璃反光。
      g.globalAlpha = 0.55;
      for (let y = top + 3; y < bot - 3; y++) px(g, Math.round(16 - hw(y)) + 1, y, '#ffffff');
      g.globalAlpha = 0.3;
      for (let y = top + 5; y < bot - 6; y++) px(g, Math.round(16 - hw(y)) + 2, y, '#ffffff');
      g.globalAlpha = 1;
      // 燈帽與底座：玄武岩，裂縫透出橘光。
      block(g, 11, top - 5, 10, 2, 3, C.basalt, 'stone', 2);
      orb(g, 16, top - 6, 2, 1.5, C.basalt);
      opoly(g, [[8, by], [24, by], [22, bot], [10, bot]], C.basalt.b, C.basalt.o);
      rect(g, 9, bot, 14, 2, C.basalt.l);
      rect(g, 9, bot, 14, 1, C.basalt.h);
      rect(g, 20, bot + 2, 3, by - bot - 2, C.basalt.d);
      stoneGrain(g, 9, bot + 2, 11, by - bot - 2, C.basalt, 4);
      const cracks = [[11, bot + 3], [12, bot + 4], [12, bot + 5], [13, bot + 6], [17, bot + 3], [18, bot + 4], [17, bot + 5], [18, bot + 6], [19, bot + 7]];
      for (const [x, y] of cracks) px(g, x, y, f % 2 ? '#ffb030' : '#f07020');
      px(g, 12, bot + 5, '#ffe070');
    },
  },
  mimicBank: {
    size: [1, 1], up: 8,
    /**
     * 寶箱怪存錢筒：可愛的寶箱怪，蓋子微開露出圓牙與舌頭，大眼睛與投幣口，上方一枚金幣正要投進去。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 4;
      shadow(g, 16, by, 26);
      const w = R.wood;
      const gd = R.gold;
      // 小短腳。
      for (const x of [7, 22]) {
        rect(g, x - 1, by - 3, 5, 4, w.o);
        rect(g, x, by - 3, 3, 3, w.d);
      }
      // 箱身。
      block(g, 5, by - 14, 22, 1, 11, w, 'wood', 3);
      // 張開的嘴：暗紅口腔、上下圓牙、舌頭。
      rect(g, 5, by - 17, 22, 4, '#3a1020');
      rect(g, 6, by - 15, 20, 2, '#5a1a2a');
      for (let x = 7; x < 25; x += 4) {
        rect(g, x, by - 17, 3, 2, R.white.b);
        px(g, x + 1, by - 15, R.white.b);
        px(g, x, by - 17, R.white.h);
        rect(g, x + 2, by - 14, 2, 1, R.white.d);
        px(g, x + 2, by - 15, R.white.b);
      }
      rect(g, 13, by - 15, 6, 2, '#e05a7a');
      rect(g, 13, by - 13, 6, 6, '#a02a4a');
      rect(g, 14, by - 13, 4, 5, '#f07a98');
      rect(g, 14, by - 8, 4, 1, '#a02a4a');
      px(g, 15, by - 12, '#ffc0d0');
      rect(g, 16, by - 12, 1, 3, '#c84a6a');
      // 箱身金屬片與鎖扣。
      for (const x of [7, 23]) {
        rect(g, x, by - 13, 2, 10, gd.o);
        rect(g, x, by - 13, 1, 9, gd.l);
        px(g, x, by - 11, gd.h);
      }
      rect(g, 5, by - 4, 22, 1, gd.d);
      // 蓋子：圓頂、木紋、金屬片。
      ellipse(g, 16, by - 23, 12, 5, w.o);
      rect(g, 4, by - 23, 24, 7, w.o);
      ellipse(g, 16, by - 23, 11, 4, w.l);
      rect(g, 5, by - 23, 22, 6, w.b);
      rect(g, 5, by - 18, 22, 1, w.d);
      for (let x = 6; x < 26; x += 3) px(g, x, by - 21, w.d);
      ellipse(g, 12, by - 25, 4, 1, w.h);
      for (const x of [7, 23]) {
        rect(g, x, by - 27, 2, 10, gd.o);
        rect(g, x, by - 26, 1, 8, gd.l);
      }
      rect(g, 4, by - 18, 24, 1, gd.b);
      // 投幣口與金幣。
      rect(g, 12, by - 27, 8, 2, w.o);
      rect(g, 13, by - 27, 6, 1, '#1a1020');
      ellipse(g, 16, by - 30, 3, 3, gd.o);
      ellipse(g, 16, by - 30, 2, 2, gd.l);
      rect(g, 16, by - 31, 1, 2, gd.d);
      px(g, 15, by - 31, gd.h);
      // 大眼睛。
      for (const x of [11, 21]) {
        ellipse(g, x, by - 22, 3, 3, w.o);
        ellipse(g, x, by - 22, 2.5, 2.5, '#ffffff');
        rect(g, x - 1, by - 22, 2, 2, '#1a1020');
        px(g, x - 1, by - 22, '#ffffff');
      }
      sparkle(g, 26, by - 30, '#fff0a0');
    },
  },
  iceSculpture: {
    size: [1, 1], up: 26,
    /**
     * 冰晶雕塑：雪白台座上三根刻面冰晶（左亮右暗、中央稜線），冰霧與閃光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 2;
      shadow(g, 16, by, 26);
      glow(g, 16, by - 26, 14, 20, '#bfe6ff', 0.12);
      block(g, 5, by - 12, 22, 4, 8, C.snow, 'stone', 6);
      for (let x = 6; x < 26; x += 5) rect(g, x, by - 12, 2, 2, '#ffffff');
      /**
       * 一根刻面冰晶：底部中心 x、底 y、半寬、高度、傾斜。
       * @param {number} x 底部中心 x。
       * @param {number} b 底部 y。
       * @param {number} w 半寬。
       * @param {number} h 高度。
       * @param {number} lean 尖端水平偏移。
       */
      const crystal = (x, b, w, h, lean) => {
        const r = C.ice;
        const tip = [x + lean, b - h];
        const sh = b - h + w * 1.6;
        const L = [x - w + lean * 0.75, sh];
        const Rr = [x + w + lean * 0.75, sh];
        opoly(g, [tip, Rr, [x + w, b], [x - w, b], L], r.b, r.o);
        poly(g, [tip, [x + lean * 0.1, b], [x - w, b], L], r.l);
        poly(g, [tip, [tip[0] + 1, sh], [x + lean * 0.1 + 1, b], [x + lean * 0.1, b]], r.h);
        poly(g, [[Rr[0] - 1, sh], Rr, [x + w, b], [x + w - 1, b]], r.d);
        g.globalAlpha = 0.6;
        for (let k = 2; k < h - w * 2; k += 5) px(g, Math.round(x - w * 0.5 + lean * (1 - k / h) * 0.8), b - k, '#ffffff');
        g.globalAlpha = 1;
      };
      crystal(9, by - 12, 3, 22, -4);
      crystal(23, by - 12, 3, 19, 4);
      crystal(16, by - 11, 4.5, 38, 0);
      // 底部冰霧與閃光。
      g.globalAlpha = 0.4;
      ellipse(g, 16, by - 12, 12, 2, '#ffffff');
      g.globalAlpha = 1;
      sparkle(g, 13, 8, '#ffffff', 2);
      sparkle(g, 26, 18, '#dff4ff', 1);
      sparkle(g, 5, 24, '#dff4ff', 1);
    },
  },
  cloudLamp: {
    size: [1, 1], up: 12, frames: 2,
    /**
     * 雲朵燈：黃銅燈桿頂著一朵蓬鬆的笑臉雲，內部透出暖光，下方掛著一顆小星星（2 幀明暗與閃爍）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 4;
      shadow(g, 16, by, 18);
      glow(g, 16, 17, 16, 13, '#fff0a0', f ? 0.2 : 0.14);
      // 木頭底座與黃銅燈桿。
      ellipse(g, 16, by - 2, 8, 3, R.lightWood.o);
      ellipse(g, 16, by - 2, 7, 2, R.lightWood.b);
      ellipse(g, 15, by - 3, 5, 1, R.lightWood.l);
      post(g, 15, 24, 2, by - 27, R.brass);
      px(g, 15, 28, R.brass.h);
      // 雲：多團重疊的圓，左上亮、底部帶淡紫陰影。
      const cl = C.cloud;
      const blobs = [[9, 18, 5], [15, 13, 6.5], [22, 14, 5], [25, 19, 4], [17, 20, 6], [7, 21, 3.5], [11, 21, 4.5]];
      for (const [x, y, s] of blobs) ellipse(g, x, y, s + 1, s + 1, mix(cl.o, '#5a4a8a', 0.3));
      for (const [x, y, s] of blobs) ellipse(g, x, y, s, s, mix(cl.d, '#b8a8e8', 0.35));
      for (const [x, y, s] of blobs) ellipse(g, x - 0.5, y - 1, s - 1, s - 1.2, cl.b);
      for (const [x, y, s] of blobs) if (y < 19) ellipse(g, x - s * 0.3, y - s * 0.35, s * 0.45, s * 0.35, '#ffffff');
      // 內部暖光。
      g.globalAlpha = f ? 0.55 : 0.4;
      ellipse(g, 16, 18, 7, 3.5, '#fff4b0');
      g.globalAlpha = 1;
      // 笑瞇瞇的臉。
      for (const x of [12, 19]) {
        px(g, x - 1, 17, '#4a3a5a');
        px(g, x, 16, '#4a3a5a');
        px(g, x + 1, 17, '#4a3a5a');
      }
      rect(g, 15, 19, 2, 1, '#4a3a5a');
      g.globalAlpha = 0.6;
      ellipse(g, 10, 19, 1.5, 1, '#ff9ab8');
      ellipse(g, 22, 19, 1.5, 1, '#ff9ab8');
      g.globalAlpha = 1;
      // 掛著的小星星。
      for (let y = 24; y < 28; y++) px(g, 24, y, R.brass.d);
      poly(g, [[24.5, 26], [26, 29], [29, 29.5], [26.5, 31], [27.5, 34], [24.5, 32.5], [21.5, 34], [22.5, 31], [20, 29.5], [23, 29]], R.gold.o);
      poly(g, [[24.5, 27], [25.5, 29.5], [27.5, 30], [25.8, 31], [26.5, 33], [24.5, 32], [22.5, 33], [23.2, 31], [21.5, 30], [23.5, 29.5]], f ? R.gold.h : R.gold.l);
      if (f) sparkle(g, 28, 26, '#fff8c0');
      else sparkle(g, 6, 10, '#fff8c0');
    },
  },
  featherCharm: {
    size: [1, 1], up: 0,
    /**
     * 羽毛掛飾：皮繩纏繞的木環、中央織網與綠松石珠，下方垂著三根羽毛（藍、金白、青）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const cx = 16;
      const cy = 11;
      // 釘子與吊繩。
      px(g, cx, 1, R.iron.l);
      rect(g, cx - 1, 1, 1, 1, R.iron.o);
      for (let y = 2; y < cy - 7; y++) px(g, cx, y, R.cream.d);
      // 牆上投影。
      g.globalAlpha = 0.2;
      ellipse(g, cx + 1, cy + 2, 9, 9, '#000000');
      g.globalAlpha = 1;
      // 木環（外框、木色、內框），中間挖空。
      ellipse(g, cx, cy, 9, 9, R.wood.o);
      ellipse(g, cx, cy, 8, 8, R.wood.b);
      ellipse(g, cx - 1, cy - 1, 7, 7, R.wood.l);
      ellipse(g, cx, cy, 6.5, 6.5, R.wood.o);
      g.globalCompositeOperation = 'destination-out';
      ellipse(g, cx, cy, 5.5, 5.5, '#000000');
      g.globalCompositeOperation = 'source-over';
      // 皮繩纏繞紋。
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2;
        px(g, Math.round(cx + Math.cos(a) * 7.5), Math.round(cy + Math.sin(a) * 7.5), k % 2 ? R.wood.d : R.darkWood.b);
      }
      // 織網：八條線收向中央的珠子。
      g.globalAlpha = 0.9;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2;
        seg(g, cx + Math.cos(a) * 5.5, cy + Math.sin(a) * 5.5, cx + Math.cos(a) * 1.5, cy + Math.sin(a) * 1.5, 1, R.cream.b);
      }
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.6;
        px(g, Math.round(cx + Math.cos(a) * 3.5), Math.round(cy + Math.sin(a) * 3.5), R.cream.l);
      }
      g.globalAlpha = 1;
      orb(g, cx, cy, 1.5, 1.5, C.turq);
      // 三根羽毛：繩子、珠子、羽片與羽軸。
      const feathers = [[9, 18, C.lapis, -1], [16, 20, R.gold, 0], [23, 18, C.turq, 1]];
      for (const [x, y, r, lean] of feathers) {
        for (let k = 0; k < 3; k++) px(g, x, y + k, R.cream.d);
        orb(g, x, y + 3, 1, 1, R.red);
        const tip = y + 4;
        const bot = 31;
        opoly(g, [[x, tip], [x + 2.5, tip + 3], [x + 2 + lean, bot - 2], [x + lean, bot], [x - 2 + lean, bot - 2], [x - 2.5, tip + 3]], r.b, r.o);
        poly(g, [[x, tip], [x, bot], [x - 2 + lean, bot - 2], [x - 2.5, tip + 3]], r.l);
        for (let yy = tip + 1; yy < bot; yy++) px(g, Math.round(x + (lean * (yy - tip)) / (bot - tip)), yy, R.white.h);
        for (let yy = tip + 3; yy < bot - 1; yy += 3) px(g, x + 2, yy, r.o);
        px(g, x - 1, tip + 2, r.h);
      }
    },
  },
  skullCandle: {
    size: [1, 1], up: 18, frames: 3,
    /**
     * 骷髏燭台：圓滾滾的可愛骷髏（大眼窩、閃光、小虎牙）頂著融蠟的紫蠟燭，綠色幽火搖曳（3 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 4;
      shadow(g, 16, by, 22);
      glow(g, 16, 10, 12, 12, '#6af0a0', [0.12, 0.17, 0.14][f]);
      // 鐵燭盤。
      ellipse(g, 16, by - 2, 11, 3.5, R.iron.o);
      ellipse(g, 16, by - 2, 10, 2.5, R.iron.b);
      ellipse(g, 15, by - 3, 8, 1.5, R.iron.l);
      const b = C.bone;
      // 下顎與牙齒。
      rect(g, 10, by - 10, 12, 7, b.o);
      rect(g, 11, by - 10, 10, 6, b.d);
      rect(g, 11, by - 10, 10, 3, b.b);
      for (let x = 11; x < 21; x += 3) {
        rect(g, x, by - 8, 2, 2, b.l);
        px(g, x + 2, by - 8, b.o);
      }
      // 頭顱。
      orb(g, 16, by - 17, 10, 9, b);
      for (const [x, y] of [[10, by - 20], [22, by - 13], [8, by - 15]]) px(g, x, y, b.d);
      // 大眼窩（暗紫）與綠色光點。
      for (const x of [11, 21]) {
        ellipse(g, x, by - 15, 3.5, 3.5, b.o);
        ellipse(g, x, by - 15, 2.5, 3, '#3a2448');
        px(g, x - 1, by - 16, '#6af0a0');
        px(g, x, by - 16, '#e8fff0');
      }
      // 心形小鼻子。
      px(g, 15, by - 12, '#3a2448');
      px(g, 17, by - 12, '#3a2448');
      px(g, 16, by - 11, '#3a2448');
      g.globalAlpha = 0.45;
      ellipse(g, 7, by - 11, 1.5, 1, '#ff9ab8');
      ellipse(g, 25, by - 11, 1.5, 1, '#ff9ab8');
      g.globalAlpha = 1;
      // 蠟燭與流下來的蠟。
      const w = C.wax;
      rect(g, 12, by - 37, 8, 12, w.o);
      rect(g, 13, by - 37, 6, 11, w.b);
      rect(g, 13, by - 37, 1, 11, w.l);
      rect(g, 18, by - 37, 1, 11, w.d);
      rect(g, 13, by - 37, 6, 1, w.h);
      ellipse(g, 16, by - 25, 7, 2, w.o);
      ellipse(g, 16, by - 25, 6, 1.5, w.b);
      for (const [x, h] of [[11, 4], [14, 2], [20, 5], [22, 2]]) {
        rect(g, x - 1, by - 25, 3, h + 1, w.o);
        rect(g, x, by - 25, 1, h, w.l);
      }
      rect(g, 16, by - 39, 1, 2, '#2a2030');
      // 綠色幽火（3 幀）。
      flame(g, 16, by - 38, [9, 11, 10][f], FIRE.green, [-1, 0, 1][f]);
    },
  },
  scarabCharm: {
    size: [1, 1], up: 10,
    /**
     * 聖甲蟲飾品：砂岩小台座上，金色聖甲蟲展開青金石與綠松石羽翼，前足高舉紅色太陽圓盤。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 4;
      shadow(g, 16, by, 22);
      const s = R.sand;
      block(g, 7, by - 8, 18, 3, 5, s, 'stone', 4);
      for (let x = 9; x < 24; x += 3) px(g, x, by - 3, s.d);
      const gd = R.gold;
      // 兩側羽翼：三排羽毛（金、青金石、綠松石），尾端略垂。
      const rows = [[gd, 0], [C.lapis, 1], [C.turq, 2]];
      for (const [r, k] of rows) {
        const y = 15 + k * 3;
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? 1 + k * 2 : 18;
          const x1 = side < 0 ? 14 : 31 - k * 2;
          rect(g, x0 - 1, y - 1, x1 - x0 + 2, 5, r.o);
          for (let x = x0; x < x1; x++) {
            const out = side < 0 ? x1 - x : x - x0;
            const droop = out > 8 ? 1 : 0;
            rect(g, x, y + droop, 1, 3 - droop, (x - x0) % 3 === (side < 0 ? 0 : 2) ? r.d : r.b);
            px(g, x, y + droop, r.l);
          }
        }
      }
      // 身體：頭、胸、鞘翅（中央分線）。
      orb(g, 16, by - 15, 5, 6, C.lapis);
      rect(g, 16, by - 21, 1, 11, C.lapis.o);
      for (const x of [13, 19]) px(g, x, by - 14, C.lapis.h);
      ellipse(g, 16, 16, 4.5, 2.5, gd.o);
      ellipse(g, 16, 16, 3.5, 1.5, gd.b);
      rect(g, 13, 15, 6, 1, gd.l);
      orb(g, 16, 12, 2.5, 2, gd);
      // 前足捧著太陽圓盤。
      for (const [x0, y0, x1, y1] of [[13, 13, 12, 8], [19, 13, 20, 8]]) seg(g, x0, y0, x1, y1, 1, gd.d);
      glow(g, 16, 5, 6, 5, '#ffb040', 0.2);
      orb(g, 16, 5, 3.5, 3.5, ramp('#e8502a'));
      px(g, 15, 3, '#ffe0a0');
      // 後足。
      for (const [x0, y0, x1, y1] of [[12, 27, 9, 30], [20, 27, 23, 30]]) seg(g, x0, y0, x1, y1, 1, gd.d);
      sparkle(g, 26, 9, '#fff0a0', 1);
    },
  },
  coralDecor: {
    size: [1, 1], up: 16,
    /**
     * 珊瑚擺設：礁石底座上一株粉紅分枝珊瑚與一株橘色小珊瑚，前方開口蚌殼含珍珠、海星與氣泡。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 4;
      shadow(g, 16, by, 26);
      // 粉紅分枝珊瑚（由主幹向上分叉，枝端圓頭）。
      const pink = [
        [[15, by - 5, 4], [15, by - 14, 4], [10, by - 22, 3], [8, by - 30, 2], [6, by - 35, 2]],
        [[10, by - 22, 3], [13, by - 29, 2], [13, by - 34, 2]],
        [[15, by - 14, 4], [20, by - 24, 3], [18, by - 32, 2], [19, by - 37, 2]],
        [[20, by - 24, 3], [24, by - 30, 2], [26, by - 34, 2]],
      ];
      for (const b of pink) limb(g, b, C.coral, false);
      for (const b of pink) for (let i = 0; i + 1 < b.length; i++) seg(g, b[i][0], b[i][1], b[i + 1][0], b[i + 1][1], Math.max(1, b[i + 1][2] - 1), C.coral.b);
      for (const b of pink) for (let i = 0; i + 1 < b.length; i++) seg(g, b[i][0] - 1, b[i][1], b[i + 1][0] - 1, b[i + 1][1], 1, C.coral.l);
      for (const [x, y] of [[6, by - 36], [13, by - 35], [19, by - 38], [26, by - 35]]) {
        orb(g, x, y, 1.5, 1.5, C.coral);
      }
      for (const [x, y] of [[15, by - 10], [11, by - 20], [19, by - 20], [9, by - 27], [17, by - 29], [23, by - 28]]) px(g, x, y, C.coral.h);
      // 橘色小珊瑚。
      const orange = [[[24, by - 4, 3], [25, by - 12, 2], [28, by - 18, 2]], [[25, by - 12, 2], [22, by - 17, 2]]];
      for (const b of orange) limb(g, b, C.coralO);
      for (const [x, y] of [[28, by - 19], [22, by - 18]]) orb(g, x, y, 1, 1, C.coralO);
      // 礁石底座。
      const rk = C.rockSea;
      ellipse(g, 16, by - 3, 14, 5, rk.o);
      ellipse(g, 16, by - 3, 13, 4, rk.b);
      ellipse(g, 14, by - 5, 9, 2, rk.l);
      stoneGrain(g, 4, by - 6, 24, 6, rk, 9);
      // 蚌殼與珍珠。
      ellipse(g, 7, by - 5, 5, 3, ramp('#e8c8d8').o);
      ellipse(g, 7, by - 5, 4, 2, ramp('#e8c8d8').b);
      ellipse(g, 7, by - 9, 4.5, 2.5, ramp('#e8c8d8').o);
      ellipse(g, 7, by - 9, 3.5, 1.5, ramp('#e8c8d8').l);
      for (let x = 4; x < 11; x += 2) px(g, x, by - 4, ramp('#e8c8d8').d);
      orb(g, 7, by - 6, 1.5, 1.5, R.white);
      // 海星。
      const sf = ramp('#f0a040');
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
        seg(g, 22, by - 3, 22 + Math.cos(a) * 3.5, by - 3 + Math.sin(a) * 3, 2, sf.o);
      }
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k / 5) * Math.PI * 2;
        seg(g, 22, by - 3, 22 + Math.cos(a) * 2.5, by - 3 + Math.sin(a) * 2, 1, sf.l);
      }
      px(g, 22, by - 3, sf.h);
      // 氣泡。
      for (const [x, y, r] of [[4, 14, 1.5], [7, 9, 1], [28, 6, 1]]) {
        g.globalAlpha = 0.6;
        ellipse(g, x, y, r, r, '#bfe6ff');
        g.globalAlpha = 1;
        px(g, Math.round(x - r * 0.5), Math.round(y - r * 0.5), '#ffffff');
      }
    },
  },
  gearClock: {
    size: [1, 1], up: 44, frames: 4,
    /**
     * 齒輪擺鐘：深色木殼的落地鐘，鏤空錶盤露出轉動的黃銅與鐵齒輪，玻璃窗內鐘擺左右擺動（4 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 2;
      shadow(g, 16, by, 26);
      const dw = R.darkWood;
      const br = R.brass;
      // 底座與腳。
      for (const x of [5, 23]) {
        rect(g, x, by - 3, 4, 3, br.o);
        rect(g, x + 1, by - 3, 2, 2, br.b);
      }
      block(g, 4, by - 18, 24, 2, 13, dw, 'wood', 4);
      rect(g, 8, by - 13, 16, 6, dw.o);
      rect(g, 9, by - 12, 14, 4, dw.d);
      rect(g, 9, by - 12, 14, 1, dw.l);
      // 腰身與鐘擺窗。
      block(g, 7, 32, 18, 1, by - 50, dw, 'wood', 7);
      rect(g, 9, 35, 14, by - 56, br.o);
      rect(g, 10, 36, 12, by - 58, '#1e140e');
      const a = [-0.28, 0, 0.28, 0][f];
      const px0 = 16;
      const py0 = 36;
      const L = by - 66;
      const bx = px0 + Math.sin(a) * L;
      const byy = py0 + Math.cos(a) * L;
      seg(g, px0, py0, bx, byy, 1, br.l);
      orb(g, bx, byy, 3, 3, R.gold);
      g.globalAlpha = 0.35;
      for (let k = 0; k < 7; k++) px(g, 11 + k, 47 - k, '#ffffff');
      rect(g, 10, 36, 12, 1, '#dff4ff');
      g.globalAlpha = 1;
      // 鐘頭：拱頂、黃銅頂飾與鏤空錶盤。
      block(g, 3, 5, 26, 2, 26, dw, 'wood', 2);
      ellipse(g, 16, 6, 10, 5, dw.o);
      ellipse(g, 16, 6, 9, 4, dw.l);
      rect(g, 6, 6, 20, 2, dw.l);
      const rot = (f / 4) * ((Math.PI * 2) / 8);
      gear(g, 16, 3, 2.5, 8, rot, br);
      for (const x of [4, 27]) orb(g, x, 5, 1.5, 1.5, br);
      // 錶盤圓環（刻度），中間鏤空看到齒輪。
      ellipse(g, 16, 19, 11, 11, br.o);
      ellipse(g, 16, 19, 10, 10, br.b);
      ellipse(g, 15, 18, 9, 9, br.l);
      ellipse(g, 16, 19, 8, 8, R.cream.o);
      ellipse(g, 16, 19, 7.5, 7.5, R.cream.l);
      ellipse(g, 16, 19, 5.5, 5.5, R.cream.d);
      ellipse(g, 16, 19, 5, 5, '#3a2818');
      ellipse(g, 15, 18, 3, 3, '#4a3420');
      for (let k = 0; k < 12; k++) {
        const ang = (k / 12) * Math.PI * 2;
        px(g, Math.round(16 + Math.cos(ang) * 6.5), Math.round(19 + Math.sin(ang) * 6.5), k % 3 ? R.black.l : R.black.o);
      }
      gear(g, 14, 18, 3, 8, rot, R.gold);
      gear(g, 19, 22, 2, 6, -rot * 1.33, ramp('#9aa0b0'));
      // 指針。
      seg(g, 16, 19, 16, 13, 1, R.black.o);
      seg(g, 16, 19, 20, 20, 1, R.black.o);
      orb(g, 16, 19, 1, 1, R.gold);
      ellipse(g, 11, 13, 2, 1, '#ffffff');
    },
  },
  darkChandelier: {
    size: [1, 1], up: 22, frames: 3,
    /**
     * 暗晶吊燈：鍛鐵吊架掛著一圈燭環，三支黑蠟燭燃著紫色魔焰，下方垂掛紫水晶墜飾（3 幀火光搖曳）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 4;
      shadow(g, 13, by, 22);
      glow(g, 18, 22, 15, 15, '#b070ff', [0.12, 0.16, 0.13][f]);
      const ir = R.iron;
      // 吊架：底座、立柱、橫臂與吊鉤。
      ellipse(g, 6, by - 2, 6, 2.5, ir.o);
      ellipse(g, 6, by - 2, 5, 1.5, ir.b);
      post(g, 4, 6, 2, by - 8, ir);
      rect(g, 3, 3, 17, 4, ir.o);
      rect(g, 4, 4, 15, 2, ir.b);
      rect(g, 4, 4, 15, 1, ir.l);
      orb(g, 5, 4, 2, 2, C.amethyst);
      for (let k = 0; k < 4; k++) px(g, 7 + k * 3, 5, ir.d);
      rect(g, 17, 6, 2, 3, ir.o);
      // 三條吊鏈。
      for (const x of [10, 18, 26]) {
        const n = 12;
        for (let i = 0; i <= n; i++) if (i % 2 === 0) px(g, Math.round(18 + ((x - 18) * i) / n), 9 + i, ir.l);
      }
      // 燭環。
      const ring = ramp('#7a7090');
      ellipse(g, 18, 23, 10, 3.5, ring.o);
      ellipse(g, 18, 23, 9, 2.5, ring.b);
      ellipse(g, 18, 22, 7.5, 1.5, ring.o);
      ellipse(g, 18, 25, 8, 1, ring.d);
      for (let x = 11; x < 18; x += 2) px(g, x, 24, ring.h);
      // 紫水晶墜飾（菱形刻面，中間最長）。
      for (const [x, len] of [[11, 6], [14, 9], [18, 13], [22, 9], [25, 6]]) {
        const y = 25;
        opoly(g, [[x, y], [x + 2, y + 2], [x, y + len], [x - 2, y + 2]], C.amethyst.b, C.amethyst.o);
        poly(g, [[x, y], [x, y + len], [x - 2, y + 2]], C.amethyst.l);
        px(g, x - 1, y + 2, C.amethyst.h);
      }
      // 三支黑蠟燭與紫色魔焰。
      for (const [x, k] of [[10, 0], [18, 1], [26, 2]]) {
        rect(g, x - 2, 14, 4, 8, R.black.o);
        rect(g, x - 1, 14, 2, 7, R.black.b);
        px(g, x - 1, 14, R.black.h);
        rect(g, x - 2, 20, 4, 2, ir.d);
        flame(g, x, 14, [6, 8, 7][(f + k) % 3], FIRE.violet, [0, 1, -1][(f + k) % 3]);
      }
      sparkle(g, 24, 33, '#e8c8ff', 1);
    },
  },
  abyssEye: {
    size: [1, 1], up: 14, frames: 4,
    /**
     * 深淵之眼：暗色觸爪台座捧著一顆大眼球，紫色虹膜與縱向瞳孔四處張望，會眨眼（4 幀：張望、張望、半閉、閉眼）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 4;
      shadow(g, 16, by, 22);
      glow(g, 16, 20, 16, 15, '#a040e0', 0.16);
      const ob = C.obsidian;
      // 台座。
      block(g, 8, by - 7, 16, 2, 4, ob, 'stone', 3);
      // 後方兩隻觸爪。
      limb(g, [[11, by - 7, 3], [5, by - 15, 3], [5, by - 25, 2], [8, by - 30, 1]], ob);
      limb(g, [[21, by - 7, 3], [27, by - 15, 3], [27, by - 25, 2], [24, by - 30, 1]], ob);
      // 眼球。
      const cx = 16;
      const cy = 20;
      const r = 10;
      ellipse(g, cx, cy, r + 1, r + 1, '#2a1838');
      ellipse(g, cx, cy, r, r, '#b8a8d0');
      ellipse(g, cx - 1, cy - 1, r - 1.5, r - 1.5, '#ece4f4');
      const ix = cx + [-3, 2, 0, 0][f];
      const iy = cy + [1, 0, 0, 0][f];
      ellipse(g, ix, iy, 5.5, 5.5, '#4a1a6a');
      ellipse(g, ix, iy, 4.5, 4.5, '#a040d0');
      ellipse(g, ix - 0.5, iy - 0.5, 3.5, 3.5, '#d070f0');
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        px(g, Math.round(ix + Math.cos(a) * 3), Math.round(iy + Math.sin(a) * 3), '#8a2ab0');
      }
      rect(g, ix - 1, iy - 3, 2, 7, '#1a0a24');
      px(g, ix - 2, iy - 2, '#ffffff');
      px(g, ix - 3, iy - 2, '#ffffff');
      px(g, ix - 2, iy - 3, '#ffffff');
      px(g, ix + 2, iy + 2, '#f0d0ff');
      ellipse(g, cx - 5, cy - 6, 2, 1, '#ffffff');
      // 眼瞼：依幀蓋住上半部（半閉）或整顆（閉眼），邊緣有睫毛。
      const lid = [cy - r - 2, cy - r - 2, cy - 3, cy + r + 1][f];
      if (lid > cy - r) {
        const L = C.eyeLid;
        for (let y = cy - r - 1; y < Math.min(lid, cy + r + 1); y++) {
          const dy = (y + 0.5 - cy) / (r + 1);
          if (Math.abs(dy) > 1) continue;
          const half = (r + 1) * Math.sqrt(1 - dy * dy);
          rect(g, Math.round(cx - half), y, Math.round(cx + half) - Math.round(cx - half), 1, y < cy - 4 ? L.l : L.b);
        }
        const dy = (lid + 0.5 - cy) / (r + 1);
        const half = Math.abs(dy) < 1 ? (r + 1) * Math.sqrt(1 - dy * dy) : 0;
        if (lid >= cy + r) {
          rect(g, cx - 7, cy + 1, 15, 1, L.o);
          for (const x of [cx - 5, cx, cx + 5]) px(g, x, cy + 2, L.o);
        } else {
          rect(g, Math.round(cx - half), lid, Math.round(half * 2), 1, L.o);
          for (const x of [cx - 6, cx - 2, cx + 2, cx + 6]) px(g, x, lid + 1, L.o);
        }
        ellipse(g, cx - 4, cy - 7, 2.5, 1, L.h);
      }
      // 前方兩隻觸爪抱住眼球。
      limb(g, [[13, by - 7, 3], [8, by - 10, 3], [7, by - 15, 2], [9, by - 18, 1]], ob);
      limb(g, [[19, by - 7, 3], [24, by - 10, 3], [25, by - 15, 2], [23, by - 18, 1]], ob);
      // 漂浮的暗色光點。
      for (const [x, y] of [[3, 6 + (f % 2)], [29, 9 - (f % 2)], [27, 2 + (f % 2)]]) px(g, x, y, '#d070f0');
    },
  },

  // ── Boss 主題 ──
  treantBonsai: {
    size: [1, 1], up: 20,
    /**
     * 古樹守衛盆景：長方形陶盆、盤根錯節的樹幹（帶古樹守衛的黃色眼睛與微笑），上方三團盆景葉冠。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const by = H - 4;
      shadow(g, 16, by, 26);
      const bk = C.bark;
      // 樹幹與枝條。
      limb(g, [[16, by - 9, 6], [14, by - 16, 7], [17, by - 24, 6], [14, by - 31, 4], [10, by - 36, 3]], bk);
      limb(g, [[17, by - 24, 4], [22, by - 31, 3], [24, by - 37, 2]], bk);
      limb(g, [[15, by - 30, 2], [17, by - 41, 2]], bk);
      for (const [x, y] of [[13, by - 14], [15, by - 20], [18, by - 22], [14, by - 26]]) {
        px(g, x, y, bk.d);
        px(g, x, y + 1, bk.d);
      }
      // 樹幹上的臉。
      for (const x of [12, 18]) {
        rect(g, x - 1, by - 21, 4, 3, bk.o);
        rect(g, x, by - 20, 2, 1, '#ffe14d');
        px(g, x, by - 20, '#fff8c0');
      }
      rect(g, 14, by - 16, 4, 1, bk.o);
      px(g, 13, by - 17, bk.o);
      px(g, 18, by - 17, bk.o);
      // 葉冠（盆景式的三團，加上頂端小嫩芽）。
      foliage(g, 9, by - 37, 6, C.treeLeaf, 3);
      foliage(g, 24, by - 38, 6, C.treeLeaf, 7);
      foliage(g, 17, by - 44, 6.5, C.treeLeaf, 11);
      for (const [x, y] of [[17, by - 52], [7, by - 44], [27, by - 45]]) {
        rect(g, x - 1, y, 3, 2, C.treeLeaf.o);
        px(g, x, y, C.treeLeaf.l);
      }
      for (const [x, y] of [[11, by - 40], [21, by - 46], [26, by - 36]]) orb(g, x, y, 1, 1, ramp('#f07aa0'));
      // 陶盆、土壤、苔蘚與根。
      block(g, 4, by - 10, 24, 3, 6, R.clay, null);
      for (let x = 6; x < 27; x += 4) px(g, x, by - 5, R.clay.d);
      rect(g, 5, by - 10, 22, 2, '#4a3020');
      for (let x = 5; x < 27; x++) if (hash(x, 3) < 0.5) px(g, x, by - 10, C.treeLeaf.b);
      limb(g, [[14, by - 9, 2], [8, by - 9, 1]], bk, false);
      limb(g, [[18, by - 9, 2], [24, by - 9, 1]], bk, false);
      for (const x of [6, 24]) rect(g, x, by - 1, 3, 1, R.clay.o);
    },
  },
  golemStatue: {
    size: [1, 1], up: 38, frames: 2,
    /**
     * 熔岩魔像雕像：石台座上的岩石魔像（大拳頭、低垂的頭），身上裂縫與胸口核心透出岩漿光（2 幀脈動）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 2;
      shadow(g, 16, by, 28);
      const rk = C.golem;
      const hot = f ? '#ffd84a' : '#ff8a3a';
      glow(g, 16, 36, 14, 16, '#ff6a2a', f ? 0.16 : 0.1);
      // 台座（金色名牌）。
      block(g, 3, by - 13, 26, 3, 9, R.stone, 'stone', 8);
      rect(g, 11, by - 8, 10, 4, R.gold.o);
      rect(g, 12, by - 7, 8, 2, R.gold.l);
      // 雙腿。
      block(g, 8, by - 25, 6, 2, 10, rk, 'stone', 1);
      block(g, 18, by - 25, 6, 2, 10, rk, 'stone', 2);
      // 軀幹。
      block(g, 6, 24, 20, 5, 17, rk, 'stone', 5);
      // 肩膀與手臂、大拳頭。
      for (const [x, s] of [[1, 6], [25, 7]]) {
        block(g, x, 28, 6, 3, 12, rk, 'stone', s);
        block(g, x - 1 + (x > 16 ? 1 : 0), 42, 7, 2, 6, rk, 'stone', s + 3);
        rect(g, x, 45, 6, 1, rk.d);
        orb(g, x + 3, 26, 4, 3.5, rk);
      }
      // 頭（縮在肩膀之間）與發光的眼睛。
      block(g, 10, 13, 12, 4, 9, rk, 'stone', 9);
      rect(g, 9, 21, 14, 2, rk.d);
      rect(g, 12, 18, 3, 2, rk.o);
      rect(g, 17, 18, 3, 2, rk.o);
      rect(g, 12, 18, 3, 1, '#ffd84a');
      rect(g, 17, 18, 3, 1, '#ffd84a');
      px(g, 12, 18, '#fff8c0');
      px(g, 17, 18, '#fff8c0');
      // 岩漿裂縫與胸口核心。
      const cracks = [[[9, 30], [11, 33], [10, 36], [12, 39]], [[23, 30], [21, 33], [22, 37]], [[3, 33], [4, 36], [3, 38]], [[28, 32], [27, 35]], [[11, 52], [10, 54]], [[20, 51], [21, 54]]];
      for (const c of cracks) for (let i = 0; i + 1 < c.length; i++) seg(g, c[i][0], c[i][1], c[i + 1][0], c[i + 1][1], 1, i % 2 ? '#ff6a2a' : hot);
      ellipse(g, 16, 35, 4.5, 4, rk.o);
      ellipse(g, 16, 35, 3.5, 3, '#c83a1a');
      ellipse(g, 16, 35, 2.5, 2, '#ff6a2a');
      ellipse(g, 15.5, 34.5, 1.5, 1, hot);
      px(g, 15, 34, '#ffffff');
    },
  },
  lichStaff: {
    size: [1, 1], up: 0,
    /**
     * 霜之巫妖冰杖：斜掛在兩根黃銅掛勾上的深藍法杖，金色爪冠鑲著發光冰晶，垂下藍色流蘇，周圍冰霜閃光。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const shaft = [[4, 30, 3], [22, 10, 3]];
      // 牆上投影。
      g.globalAlpha = 0.2;
      seg(g, 6, 31, 25, 11, 4, '#000000');
      ellipse(g, 27, 8, 4, 6, '#000000');
      g.globalAlpha = 1;
      // 杖身：深藍木、金色纏帶。
      limb(g, shaft, C.lichBlue);
      for (const t of [0.15, 0.55, 0.88]) {
        const x = Math.round(4 + 18 * t);
        const y = Math.round(30 - 20 * t);
        rect(g, x - 2, y - 1, 4, 3, R.gold.o);
        rect(g, x - 1, y - 1, 2, 2, R.gold.l);
      }
      orb(g, 4, 30, 1.5, 1.5, R.gold);
      // 掛勾。
      for (const [x, y] of [[9, 27], [17, 19]]) {
        rect(g, x - 1, y, 3, 3, R.brass.o);
        px(g, x, y + 1, R.brass.l);
      }
      // 流蘇。
      for (let y = 13; y < 22; y++) px(g, 20 + ((y >> 2) % 2), y, C.lichBlue.l);
      orb(g, 20, 22, 1.5, 2, C.lichBlue);
      // 頂端爪冠與冰晶。
      glow(g, 26, 7, 7, 7, '#5fe0ff', 0.22);
      const fr = C.frost;
      opoly(g, [[26, 0], [30, 6], [27, 14], [22, 7]], fr.b, fr.o);
      poly(g, [[26, 0], [27, 14], [22, 7]], fr.l);
      seg(g, 26, 2, 26, 11, 1, fr.h);
      px(g, 24, 6, '#ffffff');
      for (const [x0, y0, x1, y1] of [[22, 11, 21, 6], [25, 13, 30, 9], [21, 12, 25, 14]]) {
        seg(g, x0, y0, x1, y1, 2, R.gold.o);
        seg(g, x0, y0, x1, y1, 1, R.gold.l);
      }
      orb(g, 22, 11, 1.5, 1.5, R.gold);
      sparkle(g, 30, 1, '#dff4ff', 1);
      sparkle(g, 17, 5, '#dff4ff', 1);
      px(g, 29, 16, '#bfe6ff');
    },
  },
  bullHead: {
    size: [1, 1], up: 0,
    /**
     * 巨角牛王頭像：金邊木盾獎座上一顆友善的牛王頭（大彎角、金色小王冠、金鼻環、圓眼）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      plaque(g, 10);
      const bl = C.bull;
      // 大彎角（由頭往外、往上彎）。
      limb(g, [[11, 10, 4], [6, 9, 3], [3, 6, 3], [2, 2, 2], [3, 0, 1]], C.horn);
      limb(g, [[21, 10, 4], [26, 9, 3], [29, 6, 3], [30, 2, 2], [29, 0, 1]], C.horn);
      for (const [x, y] of [[6, 10], [3, 6], [26, 10], [29, 6]]) px(g, x, y, C.horn.d);
      // 耳朵。
      for (const [x, s] of [[6, -1], [26, 1]]) {
        ellipse(g, x, 13, 3, 2, bl.o);
        ellipse(g, x, 13, 2, 1, '#e8a0a0');
        px(g, x + s * 2, 13, bl.b);
      }
      // 頭部輪廓、陰影與亮面。
      opoly(g, [[9, 7], [23, 7], [25, 12], [23, 22], [9, 22], [7, 12]], bl.b, bl.o);
      poly(g, [[20, 8], [23, 8], [24, 12], [22, 21], [20, 21]], bl.d);
      poly(g, [[10, 8], [15, 8], [11, 12], [9, 12]], bl.l);
      // 額頭毛簇與金色小王冠。
      poly(g, [[12, 8], [20, 8], [18, 11], [16, 9], [14, 11]], bl.d);
      opoly(g, [[12, 6], [13, 3], [14.5, 5], [16, 2], [17.5, 5], [19, 3], [20, 6]], R.gold.b, R.gold.o);
      rect(g, 12, 5, 8, 1, R.gold.l);
      px(g, 16, 3, R.gold.h);
      px(g, 16, 5, R.red.b);
      // 眼睛（圓、帶高光）。
      for (const x of [12, 19]) {
        rect(g, x - 1, 13, 4, 3, bl.o);
        rect(g, x, 13, 2, 2, '#ffffff');
        px(g, x + 1, 14, '#1a1020');
        px(g, x, 13, '#ffffff');
      }
      // 口鼻與鼻環。
      ellipse(g, 16, 21, 7, 4.5, bl.o);
      ellipse(g, 16, 21, 6, 3.5, C.muzzle.b);
      ellipse(g, 15, 20, 4, 1.5, C.muzzle.l);
      for (const x of [13, 18]) rect(g, x, 21, 2, 2, C.muzzle.o);
      ellipse(g, 16, 26, 2.5, 2, R.gold.o);
      ellipse(g, 16, 26, 1.5, 1, C.muzzle.d);
      px(g, 14, 25, R.gold.h);
      rect(g, 14, 27, 5, 1, R.gold.b);
    },
  },
  thunderScroll: {
    size: [1, 1], up: 0,
    /**
     * 雷鳥羽毛掛軸：藍色裱邊的掛軸，米色畫心畫著一根金黃雷鳥羽毛、閃電與烏雲，右下角紅色印章。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      // 吊繩與釘子。
      seg(g, 16, 1, 7, 5, 1, R.cream.d);
      seg(g, 16, 1, 25, 5, 1, R.cream.d);
      px(g, 16, 1, R.iron.l);
      // 牆上投影。
      g.globalAlpha = 0.2;
      rect(g, 8, 7, 18, 23, '#000000');
      g.globalAlpha = 1;
      // 裱布與畫心。
      const sc = C.scroll;
      rect(g, 6, 6, 20, 23, sc.o);
      rect(g, 7, 6, 18, 22, sc.b);
      rect(g, 7, 6, 1, 22, sc.l);
      rect(g, 24, 6, 1, 22, sc.d);
      rect(g, 9, 9, 14, 17, R.cream.o);
      rect(g, 9, 9, 14, 17, C.paper.b);
      for (let y = 10; y < 26; y += 4) px(g, 22, y, C.paper.d);
      // 烏雲與閃電。
      for (const [x, y, s] of [[12, 11, 2], [14, 11, 2.5], [17, 11, 2]]) ellipse(g, x, y, s, s * 0.7, '#8a90a8');
      rect(g, 10, 12, 9, 1, '#6a7088');
      poly(g, [[13, 13], [15, 13], [13, 16], [15, 16], [11, 21], [12, 17], [11, 17]], '#5fa8ff');
      px(g, 13, 14, '#ffffff');
      // 雷鳥羽毛（右半陰影、中央羽軸、羽枝缺口）。
      const th = C.thunder;
      opoly(g, [[21, 11], [22, 14], [20, 19], [16, 23], [14, 24], [15, 20], [17, 15]], th.b, th.o);
      poly(g, [[21, 11], [14, 24], [15, 20], [17, 15]], th.l);
      seg(g, 21, 12, 13, 25, 1, '#e8a030');
      for (const [x, y] of [[21, 16], [19, 19], [16, 22]]) px(g, x, y, C.paper.b);
      px(g, 17, 16, th.h);
      // 紅色印章。
      rect(g, 19, 22, 3, 3, '#c0303a');
      px(g, 20, 23, '#f0a0a0');
      // 上下軸桿與金色軸頭。
      for (const y of [4, 28]) {
        rect(g, 5, y, 22, 3, R.darkWood.o);
        rect(g, 5, y + 1, 22, 1, R.darkWood.l);
        for (const x of [3, 27]) {
          rect(g, x, y - 1 + 1, 3, 3, R.gold.o);
          px(g, x + 1, y + 1, R.gold.l);
        }
      }
      // 下方流蘇。
      for (let y = 31; y < 32; y++) px(g, 16, y, R.gold.b);
    },
  },
  necroTome: {
    size: [1, 1], up: 12, frames: 3,
    /**
     * 死靈法師魔法書：厚重的紫色皮革書，金色包角與書扣，封面有綠寶石眼睛的可愛骷髏徽記，上方飄著綠色符文（3 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 4;
      shadow(g, 16, by, 28);
      glow(g, 16, by - 14, 14, 10, '#5fff8a', [0.1, 0.14, 0.12][f]);
      const t = C.tome;
      const top = by - 20;
      // 書本外框、封面頂面、書頁側邊與底封。
      rect(g, 3, top - 1, 26, 21, t.o);
      rect(g, 4, top, 24, 13, t.b);
      rect(g, 4, top, 24, 1, t.h);
      rect(g, 4, top + 1, 2, 12, t.l);
      rect(g, 26, top + 1, 2, 12, t.d);
      for (let y = top + 2; y < top + 12; y += 3) for (let x = 7; x < 26; x++) if (hash(x >> 1, y, 4) < 0.2) px(g, x, y, t.d);
      rect(g, 5, top + 13, 22, 4, R.cream.l);
      for (let y = top + 14; y < top + 17; y++) for (let x = 5; x < 27; x += 2) px(g, x + (y % 2), y, R.cream.d);
      rect(g, 4, top + 17, 24, 2, t.d);
      rect(g, 4, top + 13, 1, 6, t.b);
      // 金色包角。
      for (const [x, y, sx, sy] of [[4, top, 1, 1], [27, top, -1, 1]]) {
        poly(g, [[x + (sx < 0 ? 1 : 0), y], [x + sx * 4 + (sx < 0 ? 1 : 0), y], [x + (sx < 0 ? 1 : 0), y + sy * 4]], R.gold.l);
      }
      for (const x of [4, 24]) rect(g, x, top + 11, 4, 2, R.gold.b);
      // 書扣：從封面跨過書頁。
      rect(g, 24, top + 5, 5, 10, R.gold.o);
      rect(g, 25, top + 6, 3, 8, R.gold.b);
      px(g, 25, top + 6, R.gold.h);
      rect(g, 25, top + 12, 3, 2, R.gold.d);
      // 綠色書籤緞帶。
      rect(g, 9, top + 17, 2, 5, '#2a8a5a');
      px(g, 9, top + 21, '#5fff8a');
      // 封面骷髏徽記：骨白頭骨、綠寶石眼。
      const b = C.bone;
      ellipse(g, 15, top + 6, 5, 4, b.o);
      ellipse(g, 15, top + 6, 4, 3, b.b);
      ellipse(g, 14, top + 5, 2, 1, b.h);
      rect(g, 12, top + 9, 7, 3, b.o);
      rect(g, 13, top + 9, 5, 2, b.b);
      for (const x of [14, 16]) px(g, x, top + 10, b.d);
      for (const x of [13, 17]) {
        rect(g, x, top + 6, 2, 2, '#1a3a2a');
        px(g, x, top + 6, '#5fff8a');
      }
      // 交叉骨。
      seg(g, 9, top + 2, 21, top + 11, 1, b.d);
      seg(g, 21, top + 2, 9, top + 11, 1, b.d);
      ellipse(g, 15, top + 6, 4, 3, b.b);
      for (const x of [13, 17]) {
        rect(g, x, top + 6, 2, 2, '#1a3a2a');
        px(g, x, top + 6, '#5fff8a');
      }
      ellipse(g, 14, top + 5, 2, 1, b.h);
      // 飄浮的綠色符文（逐幀上升）。
      const runes = [[7, [0, 0, 1, 1, 0, 1, 1, 1, 0]], [16, [1, 0, 1, 0, 1, 0, 1, 1, 1]], [24, [1, 1, 0, 0, 1, 0, 0, 1, 1]]];
      for (let k = 0; k < runes.length; k++) {
        // 以 3×3 點陣畫一個符文，位置依幀與序號錯開上升。
        const [x, bits] = runes[k];
        const y = top - 6 - ((f + k) % 3) * 3;
        g.globalAlpha = 0.35;
        ellipse(g, x + 1, y + 1, 3, 3, '#5fff8a');
        g.globalAlpha = 1;
        for (let i = 0; i < 9; i++) if (bits[i]) px(g, x + (i % 3), y + Math.floor(i / 3), (f + k) % 3 === 2 ? '#c8ffd8' : '#5fff8a');
      }
    },
  },
  krakenSpecimen: {
    size: [1, 1], up: 36, frames: 3,
    /**
     * 深海巨妖觸手標本：木台座上的玻璃標本罐，青綠藥水中捲著一隻帶吸盤的紫色觸手，氣泡上升（3 幀），黃銅蓋與標籤。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 2;
      shadow(g, 16, by, 28);
      // 台座與黃銅名牌。
      block(g, 3, by - 10, 26, 3, 7, R.darkWood, 'wood', 5);
      rect(g, 11, by - 6, 10, 3, R.brass.o);
      rect(g, 12, by - 5, 8, 1, R.brass.l);
      const jt = 14;
      const jb = by - 11;
      // 罐子外框與藥水。
      rect(g, 5, jt + 2, 22, jb - jt - 2, '#2a3a4a');
      rect(g, 6, jt + 1, 20, jb - jt, '#2a3a4a');
      rect(g, 6, jt + 2, 20, jb - jt - 2, '#9ad0e0');
      rect(g, 7, jt + 6, 18, jb - jt - 7, C.jarWater.b);
      rect(g, 7, jt + 6, 18, 1, C.jarWater.h);
      rect(g, 7, jt + 7, 18, 2, C.jarWater.l);
      rect(g, 7, jb - 4, 18, 3, C.jarWater.d);
      // 捲曲的觸手與吸盤。
      const tn = C.tentacle;
      const curl = [[12, jb - 1, 7], [10, jb - 8, 6], [11, jb - 15, 5], [15, jb - 20, 5], [20, jb - 23, 4], [22, jb - 28, 3], [20, jb - 32, 3], [16, jb - 32, 2], [15, jb - 29, 2], [17, jb - 27, 1]];
      limb(g, curl, tn);
      for (const [x, y] of [[14, jb - 3], [13, jb - 9], [14, jb - 14], [17, jb - 18], [21, jb - 21], [23, jb - 26]]) {
        ellipse(g, x, y, 1.5, 1, '#f0b8e8');
        px(g, x, y, tn.d);
      }
      limb(g, [[21, jb - 1, 4], [23, jb - 6, 3], [21, jb - 10, 2], [19, jb - 9, 1]], tn);
      // 氣泡（逐幀上升）。
      for (const [x, y0] of [[9, 0], [23, 7], [12, 13]]) {
        const y = jb - 4 - ((y0 + f * 6) % 26);
        if (y > jt + 6) {
          ellipse(g, x, y, 1, 1, '#dff4ff');
          px(g, x, y, '#ffffff');
        }
      }
      // 玻璃反光。
      g.globalAlpha = 0.45;
      rect(g, 8, jt + 4, 1, jb - jt - 8, '#ffffff');
      rect(g, 24, jt + 4, 1, jb - jt - 8, '#dff4ff');
      g.globalAlpha = 0.3;
      for (let k = 0; k < 8; k++) {
        px(g, 10 + k, jt + 20 - k, '#ffffff');
        px(g, 12 + k, jt + 20 - k, '#ffffff');
      }
      g.globalAlpha = 1;
      // 黃銅瓶蓋與標籤。
      rect(g, 6, jt - 4, 20, 6, R.brass.o);
      rect(g, 7, jt - 3, 18, 4, R.brass.b);
      rect(g, 7, jt - 3, 18, 1, R.brass.h);
      rect(g, 7, jt, 18, 1, R.brass.d);
      for (let x = 8; x < 25; x += 3) px(g, x, jt - 1, R.brass.l);
      rect(g, 13, jt - 6, 6, 2, R.brass.o);
      rect(g, 14, jt - 6, 4, 1, R.brass.l);
      rect(g, 18, jt + 5, 7, 5, R.cream.o);
      rect(g, 19, jt + 5, 5, 4, C.paper.l);
      rect(g, 20, jt + 6, 3, 1, R.black.l);
      rect(g, 20, jt + 8, 2, 1, R.black.l);
    },
  },
  titanModel: {
    size: [1, 1], up: 32, frames: 3,
    /**
     * 蒸汽巨像模型：展示台上的黃銅鐵甲機器人模型，胸口齒輪轉動、舷窗與護目透出橘光，肩上煙囪冒出蒸汽（3 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 2;
      shadow(g, 16, by, 28);
      const bz = C.titanB;
      const gr = C.titanG;
      // 展示台。
      block(g, 3, by - 11, 26, 3, 8, R.darkWood, 'wood', 3);
      rect(g, 11, by - 7, 10, 3, R.brass.o);
      rect(g, 12, by - 6, 8, 1, R.brass.l);
      // 腿與腳。
      for (const x of [9, 18]) {
        block(g, x, by - 22, 5, 1, 9, bz, null);
        block(g, x - 1, by - 15, 7, 1, 3, gr, null);
        px(g, x + 1, by - 19, bz.h);
      }
      // 煙囪（肩後）與蒸汽。
      for (const x of [5, 25]) {
        post(g, x, 14, 3, 14, gr);
        rect(g, x - 2, 12, 7, 3, gr.o);
        rect(g, x - 1, 12, 5, 2, gr.l);
      }
      // 蒸汽：每支煙囪三團，越往上越大越淡，位置依幀輪替。
      const puffs = [[0, 9, 2], [2, 5, 3], [-1, 1, 2.5]];
      for (const [side, dx] of [[6, 0], [26, 1]]) {
        for (let k = 0; k < 3; k++) {
          const [ox, oy, os] = puffs[(k + f + dx) % 3];
          g.globalAlpha = 0.8 - ((k + f + dx) % 3) * 0.22;
          ellipse(g, side + ox * (side > 16 ? -1 : 1), oy, os, os * 0.85, '#f0f0f8');
        }
        g.globalAlpha = 1;
      }
      // 軀幹：鐵灰外殼、黃銅胸甲、舷窗、齒輪與鉚釘。
      block(g, 7, 22, 18, 3, 16, gr, null);
      rect(g, 9, 27, 14, 10, bz.o);
      rect(g, 10, 27, 12, 9, bz.b);
      rect(g, 10, 27, 12, 1, bz.h);
      rect(g, 21, 28, 1, 8, bz.d);
      gear(g, 13, 32, 2.5, 7, (f / 3) * ((Math.PI * 2) / 7), gr);
      ellipse(g, 19, 31, 2.5, 2.5, bz.o);
      ellipse(g, 19, 31, 1.5, 1.5, f === 1 ? '#ffb060' : '#ff8a3a');
      px(g, 18, 30, '#fff0c0');
      for (const [x, y] of [[8, 24], [23, 24], [8, 36], [23, 36]]) px(g, x, y, gr.h);
      // 手臂（活塞）與拳頭。
      for (const x of [2, 25]) {
        block(g, x, 24, 5, 2, 9, bz, null);
        rect(g, x + 2, 35, 1, 3, gr.l);
        orb(g, x + 2.5, 40, 3, 2.5, gr);
      }
      // 頭：黃銅圓頂、護目鏡橘光與天線。
      block(g, 10, 11, 12, 3, 9, bz, null);
      ellipse(g, 16, 11, 6, 3, bz.o);
      ellipse(g, 16, 11, 5, 2, bz.l);
      rect(g, 11, 15, 10, 3, '#2a1a12');
      rect(g, 12, 16, 8, 1, f === 1 ? '#ffb060' : '#ff8a3a');
      px(g, 13, 16, '#fff0c0');
      seg(g, 16, 8, 16, 4, 1, gr.b);
      orb(g, 16, 3, 1, 1, R.red);
    },
  },
  dragonHead: {
    size: [1, 1], up: 0,
    /**
     * 炎龍頭標本：金邊木盾獎座上一顆可愛的紅龍頭（深紅耳鰭、米色彎角、黃色大眼、黃色下巴鱗片與小虎牙）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      plaque(g, 10);
      const d = C.dragon;
      const w = C.dragonW;
      // 兩側翼狀耳鰭（三根尖刺）。
      for (const s of [-1, 1]) {
        const x = 16 + s * 9;
        opoly(g, [[x, 8], [x + s * 7, 4], [x + s * 5, 9], [x + s * 7, 12], [x + s * 4, 14], [x + s * 6, 18], [x, 18]], w.b, w.o);
        for (const y of [9, 13]) seg(g, x + s, y, x + s * 4, y - 2, 1, w.d);
      }
      // 彎角。
      limb(g, [[11, 8, 3], [9, 4, 2], [10, 1, 1]], C.horn);
      limb(g, [[21, 8, 3], [23, 4, 2], [22, 1, 1]], C.horn);
      // 頭部。
      opoly(g, [[9, 6], [23, 6], [26, 13], [24, 22], [8, 22], [6, 13]], d.b, d.o);
      poly(g, [[21, 7], [23, 7], [25, 13], [23, 21], [21, 21]], d.d);
      poly(g, [[10, 7], [15, 7], [10, 12], [8, 12]], d.l);
      for (const [x, y] of [[13, 9], [16, 8], [19, 9], [15, 11], [18, 11]]) {
        px(g, x, y, d.d);
        px(g, x + 1, y, d.d);
      }
      // 眉骨與黃色大眼（縱瞳、高光）。
      for (const [x, s] of [[11, -1], [19, 1]]) {
        rect(g, x - 1, 12, 5, 4, d.o);
        rect(g, x, 13, 3, 2, '#ffe14d');
        px(g, x + 1, 13, '#1a1020');
        px(g, x + 1, 14, '#1a1020');
        px(g, x, 13, '#fff8c0');
        seg(g, x - 1 + (s > 0 ? 1 : 0), 11, x + 3 - (s > 0 ? 1 : 0), 11 + (s > 0 ? 0 : 0), 1, d.d);
      }
      // 口鼻：亮紅鼻樑、鼻孔、黃色下巴、微笑與虎牙。
      ellipse(g, 16, 20, 7, 4.5, d.o);
      ellipse(g, 16, 20, 6, 3.5, d.b);
      ellipse(g, 15, 19, 4, 1.5, d.l);
      for (const x of [13, 18]) rect(g, x, 18, 2, 1, d.o);
      ellipse(g, 16, 25, 5.5, 2.5, C.belly.o);
      ellipse(g, 16, 25, 4.5, 1.8, C.belly.b);
      for (const x of [13, 16, 19]) px(g, x, 26, C.belly.d);
      rect(g, 12, 23, 9, 1, d.o);
      for (const x of [13, 19]) {
        px(g, x, 24, R.white.h);
        px(g, x, 25, R.white.b);
      }
      // 鼻孔冒出的小火花。
      px(g, 11, 17, '#ffd04d');
      px(g, 22, 16, '#f8a030');
      px(g, 23, 15, '#ffd04d');
    },
  },
  demonThrone: {
    size: [2, 2], up: 40, frames: 4,
    /**
     * 魔王王座：兩階黑曜石台階與紅地毯、尖拱高背上鑲著發光的黃色魔眼寶石、一對大彎角、紅絲絨椅墊與扶手，扶手頂端燃著紫色魔焰（4 幀）。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     * @param {number} f 動態幀。
     */
    draw(g, W, H, f) {
      const by = H - 2;
      shadow(g, 32, by, 62);
      const ob = C.obsidian;
      const vv = C.velvet;
      const gd = R.gold;
      glow(g, 32, 40, 30, 34, '#a040e0', [0.1, 0.13, 0.15, 0.12][f]);
      // 台階（兩階）與紅地毯。
      block(g, 2, by - 20, 60, 5, 15, ob, 'stone', 3);
      block(g, 8, by - 27, 48, 4, 6, ob, 'stone', 5);
      for (let x = 4; x < 60; x += 8) rect(g, x, by - 14, 1, 12, ob.d);
      rect(g, 22, by - 27, 20, 27, vv.o);
      rect(g, 23, by - 27, 18, 26, vv.b);
      rect(g, 23, by - 27, 18, 1, vv.h);
      rect(g, 23, by - 23, 18, 1, vv.l);
      rect(g, 23, by - 20, 18, 1, vv.d);
      rect(g, 23, by - 15, 18, 1, vv.l);
      for (const x of [23, 40]) rect(g, x, by - 27, 1, 26, gd.b);
      // 大彎角（從椅背上角往外往上彎）。
      limb(g, [[16, 26, 6], [9, 22, 5], [5, 14, 4], [5, 6, 3], [8, 1, 2]], C.demonHorn);
      limb(g, [[48, 26, 6], [55, 22, 5], [59, 14, 4], [59, 6, 3], [56, 1, 2]], C.demonHorn);
      for (const [x, y] of [[9, 22], [6, 15], [5, 9], [55, 22], [58, 15], [59, 9]]) rect(g, x - 1, y, 3, 1, C.demonHorn.d);
      // 高背：尖拱黑曜石外框。
      const back = [[12, 22], [20, 12], [32, 3], [44, 12], [52, 22], [52, 70], [12, 70]];
      opoly(g, back, ob.b, ob.o);
      poly(g, [[12, 22], [20, 12], [32, 3], [32, 70], [12, 70]], ob.l);
      poly(g, [[46, 16], [52, 22], [52, 70], [48, 70]], ob.d);
      seg(g, 13, 22, 20, 13, 1, ob.h);
      seg(g, 20, 13, 31, 4, 1, ob.h);
      // 邊緣尖刺。
      for (const y of [30, 42, 54]) {
        poly(g, [[12, y], [8, y + 3], [12, y + 6]], ob.o);
        poly(g, [[52, y], [56, y + 3], [52, y + 6]], ob.o);
      }
      // 紅絲絨靠背（菱格與金色鈕釦）與金邊。
      const panel = [[18, 26], [24, 19], [32, 13], [40, 19], [46, 26], [46, 62], [18, 62]];
      opoly(g, panel, vv.b, gd.b);
      poly(g, [[18, 26], [24, 19], [32, 13], [32, 62], [18, 62]], mix(vv.b, vv.l, 0.5));
      for (let y = 28; y < 62; y += 6) {
        for (let x = 21 + ((y / 6) % 2) * 3; x < 45; x += 6) {
          px(g, x, y, gd.l);
          px(g, x + 1, y + 1, vv.d);
          px(g, x - 1, y + 1, vv.d);
          px(g, x, y + 2, vv.d);
        }
      }
      // 頂端魔眼寶石（脈動）。
      ellipse(g, 32, 22, 6, 6, gd.o);
      ellipse(g, 32, 22, 5, 5, gd.b);
      ellipse(g, 31, 21, 4, 4, gd.l);
      glow(g, 32, 22, 9, 9, '#ffe14d', [0.15, 0.22, 0.3, 0.22][f]);
      ellipse(g, 32, 22, 4, 3, '#5a1020');
      ellipse(g, 32, 22, 3.5, 2.2, '#ffe14d');
      ellipse(g, 32, 22, 2, 2, '#f08a2a');
      rect(g, 32, 20, 1, 4, '#3a1020');
      px(g, 30, 21, '#ffffff');
      px(g, 31, 21, '#fff8c0');
      // 椅墊（頂面與正面）。
      block(g, 15, 58, 34, 7, 8, vv, 'cloth');
      rect(g, 15, 58, 34, 1, vv.h);
      for (const x of [22, 32, 42]) px(g, x, 61, gd.l);
      rect(g, 15, 72, 34, 2, gd.d);
      // 扶手、金色球飾與紫色魔焰。
      for (const [x, k] of [[5, 0], [49, 1]]) {
        block(g, x, 50, 10, 4, 22, ob, 'stone', 7 + k);
        rect(g, x, 54, 10, 1, gd.b);
        rect(g, x + 2, 60, 6, 8, ob.o);
        rect(g, x + 3, 61, 4, 6, vv.d);
        orb(g, x + 5, 48, 3, 3, gd);
        // 爪形椅腳。
        for (const dx of [1, 4, 7]) {
          rect(g, x + dx, 74, 2, 3, gd.o);
          px(g, x + dx, 75, gd.l);
        }
        glow(g, x + 5, 40, 5, 6, '#c890ff', 0.25);
        flame(g, x + 5, 46, [8, 10, 9, 11][(f + k * 2) % 4], FIRE.violet, [0, 1, 0, -1][(f + k) % 4]);
      }
      sparkle(g, 40, 8, '#fff0a0', 1);
      sparkle(g, 26, 34, '#ffe0e8', 1);
    },
  },
};
