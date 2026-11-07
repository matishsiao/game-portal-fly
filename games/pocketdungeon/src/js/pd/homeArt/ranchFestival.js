// 家園美術：牧場動物（2×2 的圍欄與動物）與節慶裝飾（繪製規則見 homeDraw.js 開頭說明）。
// 四座牧場圍欄共用同一套圍欄畫法（後欄與兩側先畫、動物畫在中間、前欄最後畫），讓並排時風格一致；
// 雞舍用矮木圍欄、牛欄用較高較粗的深色木欄、羊圈用淺色細橫木欄（見 FENCE）；
// 牆飾畫在 32 × 32 的牆面上（不畫地面投影，改在右下方畫一層淡淡的牆面投影）。

import { mix, ramp, R, rect, px, hash, ellipse, orb, shadow, woodGrain, weave, block, post } from '../homeDraw.js';

/** 本分組專用的色階。 */
const C = {
  fence: ramp('#9a6a3c'),
  postWood: ramp('#7a5030'),
  dirt: ramp('#b08a5a'),
  meadow: ramp('#7cb850'),
  straw: ramp('#e6c45c'),
  hay: ramp('#d8b048'),
  comb: ramp('#e0383a'),
  beak: ramp('#f0a030'),
  chick: ramp('#f6d84a'),
  hide: ramp('#f4f0e8'),
  patch: ramp('#3a3440'),
  muzzle: ramp('#f0a0a8'),
  horn: ramp('#e8dcc0'),
  wool: ramp('#f2ead6'),
  face: ramp('#4a3e48'),
  hive: ramp('#f0d88a'),
  roofHive: ramp('#c86a3a'),
  skep: ramp('#d8a850'),
  bee: ramp('#f0c030'),
  paperRed: ramp('#d8343a'),
  silk: ramp('#d8404e'),
  jade: ramp('#3aa078'),
  lamp: ramp('#fff2d8'),
  pink: ramp('#f48aa8'),
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
 * 光點：在橢圓周圍點上一圈不透明的暖色小光點（不用半透明圓盤，避免在深色背景上變得灰濁）；
 * 每隔一點畫成十字小星芒，k 改變光點的相位，可用來做兩幀的閃爍。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rad 半徑（垂直方向壓扁為 0.75 倍）。
 * @param {string} c 光的顏色。
 * @param {number} [k=1] 相位。
 */
function glow(g, cx, cy, rad, c, k = 1) {
  const core = mix(c, '#ffffff', 0.55);
  for (let i = 0; i < 8; i++) {
    const a = ((i + k * 0.5) * Math.PI * 2) / 8;
    const r = rad * (i % 2 ? 0.92 : 1.05);
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r * 0.75);
    if (i % 2) {
      px(g, x, y, c);
      continue;
    }
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(g, x + dx, y + dy, c);
    px(g, x, y, core);
  }
}

/**
 * 逐像素明暗的立體橢圓：外框、左上亮、右下暗（比 orb 更柔和，適合動物身體）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {object} r 色階。
 */
function body(g, cx, cy, rx, ry, r) {
  // 逐像素決定外框或明暗。
  paint(g, cx - rx - 1, cy - ry - 1, rx * 2 + 3, ry * 2 + 3, function bodyPixel(x, y) {
    if (!inEll(x, y, cx, cy, rx, ry)) return null;
    if (!inEll(x, y, cx, cy, rx - 1, ry - 1)) return r.o;
    const nx = (x + 0.5 - cx) / rx;
    const ny = (y + 0.5 - cy) / ry;
    const lit = -nx * 0.45 - ny * 0.75;
    if (lit > 0.62) return r.h;
    if (lit > 0.22) return r.l;
    if (lit < -0.55) return r.d;
    return r.b;
  });
}

/**
 * 羊毛團：數個重疊的小圓球組成蓬鬆的輪廓，左上亮右下暗，表面點綴捲毛。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rx 水平半徑。
 * @param {number} ry 垂直半徑。
 * @param {object} r 色階。
 * @param {number} [seed=0] 種子。
 */
function fluff(g, cx, cy, rx, ry, r, seed = 0) {
  const puffs = [];
  const n = 9 + Math.round(rx / 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    puffs.push([cx + Math.cos(a) * (rx - 2.5), cy + Math.sin(a) * (ry - 2.2), 2.8 + hash(k, seed) * 1.2]);
  }
  puffs.push([cx, cy, Math.min(rx, ry) - 1]);
  for (const [x, y, s] of puffs) ellipse(g, x, y, s + 1, s + 1, r.o);
  for (const [x, y, s] of puffs) ellipse(g, x, y, s, s, r.d);
  for (const [x, y, s] of puffs) ellipse(g, x - s * 0.2, y - s * 0.25, s * 0.85, s * 0.8, r.b);
  for (const [x, y, s] of puffs) if (y < cy + ry * 0.3) ellipse(g, x - s * 0.35, y - s * 0.4, s * 0.45, s * 0.4, r.l);
  for (const [x, y, s] of puffs) if (y < cy) px(g, x - s * 0.4, y - s * 0.5, r.h);
  // 捲毛：小小的弧形陰影點。
  for (let k = 0; k < 10; k++) {
    const x = Math.round(cx - rx + 4 + hash(k, seed, 3) * (rx * 2 - 8));
    const y = Math.round(cy - ry + 4 + hash(seed, k, 5) * (ry * 2 - 7));
    px(g, x, y, mix(r.b, r.d, 0.6));
    px(g, x + 1, y + 1, mix(r.b, r.d, 0.6));
  }
}

/**
 * 圍欄的樣式：橫木與木樁的色階、木樁高與寬、每道橫木相對地面的上緣偏移與高度。
 * wood 為雞舍用的矮木圍欄；sturdy 為牛欄用的高而粗壯的深色木欄；light 為羊圈用的淺色細橫木欄。
 */
const FENCE = {
  wood: { rail: C.fence, post: C.postWood, h: 11, pw: 3, rails: [[-9, 4], [-5, 4]] },
  sturdy: { rail: ramp('#8a5a32'), post: ramp('#5e3a22'), h: 14, pw: 4, rails: [[-12, 5], [-6, 5]] },
  light: { rail: ramp('#e0d0aa'), post: ramp('#b8986a'), h: 10, pw: 2, rails: [[-8, 3], [-4, 3]] },
};

/**
 * 圍欄木樁：尖頂、左亮右暗、木紋點。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左 x。
 * @param {number} base 底部 y（地面）。
 * @param {number} h 高。
 * @param {object} [st=FENCE.wood] 圍欄樣式（決定色階與木樁寬）。
 */
function fencePost(g, x, base, h, st = FENCE.wood) {
  const p = st.post;
  const w = st.pw;
  post(g, x, base - h + 2, w, h - 2, p);
  rect(g, x - 1, base - h + 1, w + 2, 1, p.o);
  rect(g, x, base - h, w, 1, p.o);
  rect(g, x + (w > 2 ? 1 : 0), base - h - 1, Math.max(1, w - 2), 1, p.o);
  rect(g, x, base - h + 1, w, 1, p.l);
  rect(g, x + (w > 2 ? 1 : 0), base - h, Math.max(1, w - 2), 1, p.h);
  rect(g, x, base - 1, w, 1, p.d);
  if (w > 3) px(g, x + 1, base - Math.round(h / 2), p.d);
}

/**
 * 圍欄橫木（水平，預設 4 像素高：外框、亮面、基底、陰影與木紋）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 左 x。
 * @param {number} x1 右 x（不含）。
 * @param {number} y 上緣 y。
 * @param {number} seed 木紋種子。
 * @param {object} [r=C.fence] 橫木色階。
 * @param {number} [hh=4] 橫木高（含上下外框，至少 3）。
 */
function fenceRail(g, x0, x1, y, seed, r = C.fence, hh = 4) {
  rect(g, x0, y, x1 - x0, hh, r.o);
  rect(g, x0, y + 1, x1 - x0, 1, r.l);
  if (hh > 3) rect(g, x0, y + 2, x1 - x0, hh - 3, r.b);
  if (hh > 4) rect(g, x0, y + hh - 2, x1 - x0, 1, r.d);
  if (hh > 3) woodGrain(g, x0, y + 1, x1 - x0, hh - 2, r, seed);
}

/** 圍欄的尺寸：木樁高、後欄地面 y（相對於佔地上緣）、前欄距畫布底部、左右木樁 x。 */
const PEN = { h: 11, back: 9, front: 3, left: 1, right: 60 };

/**
 * 圍欄的地面：佔地範圍內的泥土或草地（邊緣略暗、散落小石子與草屑）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} H 畫布高。
 * @param {number} up 向上突出的像素（佔地上緣 y）。
 * @param {object} r 地面色階。
 * @param {number} seed 種子。
 */
function penGround(g, H, up, r, seed) {
  const top = up + PEN.back - 3;
  const bottom = H - PEN.front - 1;
  rect(g, 3, top, 58, bottom - top, r.d);
  rect(g, 4, top + 1, 56, bottom - top - 2, r.b);
  // 後方被圍欄遮住的陰影帶與零星的斑點。
  rect(g, 4, top + 1, 56, 2, mix(r.b, r.d, 0.5));
  for (let y = top + 3; y < bottom - 1; y++) {
    for (let x = 4; x < 60; x++) {
      const v = hash(x, y, seed);
      if (v < 0.05) px(g, x, y, r.d);
      else if (v > 0.96) px(g, x, y, r.l);
    }
  }
}

/**
 * 圍欄的後半部：後欄（兩道橫木）、兩側欄（直向的橫木條）與後方及中段的木樁。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} H 畫布高。
 * @param {number} up 佔地上緣 y。
 * @param {object} [st=FENCE.wood] 圍欄樣式。
 */
function penBack(g, H, up, st = FENCE.wood) {
  const yb = up + PEN.back;
  const yf = H - PEN.front;
  st.rails.forEach(
    // 後欄的每一道橫木。
    ([dy, hh], k) => fenceRail(g, PEN.left + 2, PEN.right + 1, yb + dy, 1 + k, st.rail, hh),
  );
  for (const x of [PEN.left, 21, 40, PEN.right]) fencePost(g, x, yb, st.h, st);
  // 兩側欄：由後往前的直向橫木條，中段一根木樁。
  const top = yb + st.rails[0][0] + 1;
  for (const x of [PEN.left, PEN.right]) {
    const r = st.rail;
    rect(g, x, top, st.pw, yf - yb, r.o);
    rect(g, x + 1, top, Math.max(1, st.pw - 2), yf - yb, x < 32 ? r.l : r.b);
    for (let y = top + 2; y < yf - 9; y += 5) px(g, x + 1, y, r.d);
    fencePost(g, x, Math.round((yb + yf) / 2), st.h, st);
  }
}

/**
 * 圍欄的前半部：前欄（兩道橫木、中央的木樁）與兩端的角樁，畫在動物之後。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} H 畫布高。
 * @param {object} [st=FENCE.wood] 圍欄樣式。
 */
function penFront(g, H, st = FENCE.wood) {
  const yf = H - PEN.front;
  g.globalAlpha = 0.18;
  rect(g, 2, yf - 1, 60, 2, '#000000');
  g.globalAlpha = 1;
  st.rails.forEach(
    // 前欄的每一道橫木。
    ([dy, hh], k) => fenceRail(g, PEN.left + 2, PEN.right + 1, yf + dy, 3 + k, st.rail, hh),
  );
  for (const x of [PEN.left, 21, 40, PEN.right]) fencePost(g, x, yf, st.h, st);
}

/**
 * 小草叢（三片葉尖）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左 x。
 * @param {number} y 底部 y。
 */
function tuft(g, x, y) {
  sprite(g, x, y - 3, ['.g..', 'gGg.', 'gGGg'], { g: '#3f8a3a', G: '#6ab84a' });
}

/**
 * 一小撮散落的稻草或乾草（幾道斜向細線）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {object} r 色階。
 * @param {number} seed 種子。
 */
function strands(g, x, y, r, seed) {
  for (let k = 0; k < 4; k++) {
    const dx = Math.round(hash(k, seed) * 6);
    const dy = Math.round(hash(seed, k) * 3);
    const dir = hash(k, k, seed) < 0.5 ? 1 : -1;
    line(g, x + dx, y + dy, x + dx + dir * 2, y + dy + 1, k % 2 ? r.l : r.d);
  }
}

/**
 * 母雞：白色身體、上翹的尾羽、紅雞冠與肉垂、黃嘴、橘色腳；啄食時頭往前下壓。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 身體中心 x。
 * @param {number} y 腳底 y。
 * @param {boolean} peck 是否低頭啄食。
 */
function hen(g, x, y, peck) {
  const w = C.hide;
  shadow(g, x, y + 1, 16);
  // 腳。
  for (const dx of [-2, 2]) {
    rect(g, x + dx, y - 4, 1, 4, C.beak.d);
    rect(g, x + dx - 1, y - 1, 3, 1, C.beak.d);
  }
  // 尾羽（三片上翹的羽毛）。
  ellipse(g, x + 7, y - 12, 3.5, 5, w.o);
  ellipse(g, x + 7, y - 12, 2.5, 4, w.b);
  px(g, x + 6, y - 15, w.h);
  line(g, x + 8, y - 15, x + 8, y - 10, w.d);
  // 身體與翅膀。
  body(g, x, y - 8, 8, 5.5, w);
  ellipse(g, x + 1, y - 7, 5, 2.6, w.o);
  ellipse(g, x + 1, y - 7.5, 4, 1.8, w.b);
  rect(g, x - 2, y - 9, 5, 1, w.l);
  for (const dx of [1, 3]) px(g, x + dx, y - 6, w.d);
  // 頭（抬頭或低頭啄食）。
  const hx = peck ? x - 9 : x - 6;
  const hy = peck ? y - 6 : y - 15;
  if (!peck) {
    ellipse(g, x - 5, y - 11, 3, 3.5, w.o);
    ellipse(g, x - 5, y - 11, 2, 2.6, w.b);
  } else {
    ellipse(g, x - 7, y - 8, 3, 2.5, w.o);
    ellipse(g, x - 7, y - 8, 2, 1.6, w.b);
  }
  body(g, hx, hy, 3.5, 3.5, w);
  // 雞冠、嘴、肉垂與眼睛。
  sprite(g, hx - 2, hy - 6, ['.o.o.', 'oroRo', 'orrrr', '.ooo.'], { o: C.comb.o, r: C.comb.b, R: C.comb.h });
  sprite(g, hx - 6, hy - 1, ['ooo', 'obb', 'ooo'], { o: C.beak.o, b: C.beak.b });
  rect(g, hx - 3, hy + 2, 2, 3, C.comb.o);
  px(g, hx - 3, hy + 2, C.comb.b);
  px(g, hx - 1, hy - 1, SH);
}

/**
 * 小雞：黃色圓滾滾的身體、小嘴與黑眼睛，可往上跳。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} y 腳底 y。
 * @param {number} hop 跳起的高度。
 * @param {number} dir 面向（-1 向左、1 向右）。
 */
function chick(g, x, y, hop, dir) {
  const r = C.chick;
  shadow(g, x, y + 1, hop ? 4 : 6);
  const by = y - hop;
  px(g, x - 1, by - 1, C.beak.d);
  px(g, x + 1, by - 1, C.beak.d);
  body(g, x, by - 4, 3.5, 3, r);
  body(g, x + dir * 2, by - 7, 2.5, 2.5, r);
  px(g, x + dir * 5, by - 7, C.beak.b);
  px(g, x + dir * 5 - dir, by - 7, C.beak.o);
  px(g, x + dir * 3, by - 8, SH);
  px(g, x - dir * 2, by - 4, r.d);
}

/**
 * 牛：白底黑斑的身體、粉紅鼻頭、小角與耳朵、粉紅乳房、甩動的尾巴；低頭時頭往下壓。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 身體中心 x。
 * @param {number} y 腳底 y。
 * @param {number} f 幀（0 抬頭、1 低頭並甩尾）。
 */
function cowFig(g, x, y, f) {
  const w = C.hide;
  const k = C.patch;
  shadow(g, x, y + 1, 36);
  // 遠側的兩條腿（較暗）。
  for (const dx of [-8, 9]) {
    post(g, x + dx, y - 10, 3, 9, { ...w, b: w.d, l: w.b });
    rect(g, x + dx - 1, y - 2, 5, 2, k.o);
  }
  // 尾巴：由臀部垂下，末端黑色毛束，第 2 幀往外甩。
  const tx = x + 15;
  const tail = f ? [[tx, y - 20], [tx + 3, y - 17], [tx + 5, y - 14], [tx + 6, y - 12]] : [[tx, y - 20], [tx + 1, y - 17], [tx + 1, y - 14], [tx + 1, y - 11]];
  for (let s = 0; s < tail.length - 1; s++) {
    line(g, tail[s][0], tail[s][1], tail[s + 1][0], tail[s + 1][1], w.o);
    line(g, tail[s][0] - 1, tail[s][1], tail[s + 1][0] - 1, tail[s + 1][1], w.o);
  }
  const [ex, ey] = tail[tail.length - 1];
  ellipse(g, ex, ey + 1, 2, 2.5, k.o);
  ellipse(g, ex - 0.5, ey + 0.5, 1, 1.5, k.b);
  // 身體與黑色斑塊（只畫在身體內）。
  const cy = y - 17;
  body(g, x, cy, 15, 8.5, w);
  const spots = [[x - 5, cy - 3, 5, 3.5], [x + 7, cy + 1, 4.5, 4], [x + 1, cy + 5, 3, 2], [x + 12, cy - 5, 2.5, 2]];
  // 斑塊逐像素裁在身體內，左上帶一點亮面。
  paint(g, x - 15, cy - 9, 31, 19, function spotPixel(px0, py0) {
    if (!inEll(px0, py0, x, cy, 14, 7.5)) return null;
    for (const [sx, sy, rx, ry] of spots) {
      if (inEll(px0, py0, sx, sy, rx, ry)) return inEll(px0, py0, sx - 1, sy - 1, rx - 1.5, ry - 1.5) && py0 < sy ? k.l : k.b;
    }
    return null;
  });
  rect(g, x - 8, cy - 7, 10, 1, w.h);
  // 乳房。
  ellipse(g, x + 5, y - 8, 3.5, 2.5, C.muzzle.o);
  ellipse(g, x + 5, y - 8.5, 2.5, 1.6, C.muzzle.b);
  for (const dx of [3, 5, 7]) px(g, x + dx, y - 6, C.muzzle.d);
  // 近側的兩條腿與黑蹄。
  for (const dx of [-11, 6]) {
    post(g, x + dx, y - 10, 3, 9, w);
    rect(g, x + dx - 1, y - 2, 5, 2, k.o);
    rect(g, x + dx, y - 2, 2, 1, k.l);
  }
  // 頭：正面朝前，第 2 幀低頭吃草。
  const hx = x - 15;
  const hy = cy - 4 + (f ? 4 : 0);
  ellipse(g, hx - 6, hy - 3, 3.5, 2, w.o);
  ellipse(g, hx + 6, hy - 3, 3.5, 2, w.o);
  ellipse(g, hx - 6, hy - 3, 2.5, 1, C.muzzle.l);
  ellipse(g, hx + 6, hy - 3, 2.5, 1, w.d);
  sprite(g, hx - 4, hy - 9, ['oo....oo', 'oho..oho', '.oho.ho.'], { o: C.horn.o, h: C.horn.l });
  body(g, hx, hy, 5.5, 6, w);
  // 單眼的黑斑、眼睛與鼻頭。
  paint(g, hx - 6, hy - 6, 6, 7, function eyePatch(ax, ay) {
    return inEll(ax, ay, hx - 2.5, hy - 2, 3, 3.2) && inEll(ax, ay, hx, hy, 4.6, 5.2) ? k.b : null;
  });
  px(g, hx - 3, hy - 2, '#ffffff');
  px(g, hx - 2, hy - 2, SH);
  px(g, hx + 2, hy - 2, SH);
  ellipse(g, hx, hy + 4, 5, 3, C.muzzle.o);
  ellipse(g, hx, hy + 4, 4, 2, C.muzzle.b);
  rect(g, hx - 2, hy + 3, 3, 1, C.muzzle.l);
  px(g, hx - 2, hy + 4, C.muzzle.d);
  px(g, hx + 2, hy + 4, C.muzzle.d);
}

/**
 * 綿羊：蓬鬆的羊毛身體、深色的臉與腳、頭頂一撮羊毛；可低頭吃草或跳起來（小羊）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 身體中心 x。
 * @param {number} y 腳底 y。
 * @param {number} s 大小倍率（1 為成羊）。
 * @param {number} lift 跳起的高度。
 * @param {boolean} graze 是否低頭吃草。
 * @param {number} seed 羊毛種子。
 */
function sheepFig(g, x, y, s, lift, graze, seed) {
  const fc = C.face;
  const rx = Math.round(12 * s);
  const ry = Math.round(8 * s);
  const legH = Math.round(7 * s);
  shadow(g, x, y + 1, lift ? rx * 1.4 : rx * 2 + 2);
  const by = y - lift;
  // 四條深色的腿（遠側較暗）。
  for (const [dx, far] of [[-rx + 4, true], [rx - 6, true], [-rx + 2, false], [rx - 4, false]]) {
    const lx = x + Math.round(dx * 0.9);
    rect(g, lx - 1, by - legH - 1, 4, legH + 1, fc.o);
    rect(g, lx, by - legH, 2, legH - 1, far ? fc.d : fc.b);
    if (!far) px(g, lx, by - legH, fc.l);
  }
  fluff(g, x, by - legH - ry + 3, rx, ry, C.wool, seed);
  // 頭：深色長臉、橫向的耳朵、白眼與頭頂羊毛。
  const hx = x - rx + Math.round(1 * s);
  const hy = by - legH - ry + 2 + (graze ? Math.round(6 * s) : 0);
  const hr = Math.max(2.5, 4 * s);
  ellipse(g, hx - hr - 1, hy - 1, 2.5 * s + 0.5, 1.5, fc.o);
  ellipse(g, hx + hr + 1, hy - 1, 2.5 * s + 0.5, 1.5, fc.o);
  ellipse(g, hx - hr - 1, hy - 1, 1.6 * s + 0.4, 0.6, fc.l);
  body(g, hx, hy + 1, hr, hr * 1.25, fc);
  fluff(g, hx, hy - hr, hr + 1.5, Math.max(2.2, hr * 0.6), C.wool, seed + 4);
  px(g, hx - Math.round(hr / 2), hy + 1, '#ffffff');
  px(g, hx + Math.round(hr / 2), hy + 1, '#ffffff');
  px(g, hx - Math.round(hr / 2), hy + 2, SH);
  px(g, hx + Math.round(hr / 2), hy + 2, SH);
  px(g, hx, hy + Math.round(hr), C.muzzle.d);
}

/**
 * 蜜蜂：黃黑條紋的小身體與半透明的白色翅膀。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左 x。
 * @param {number} y 上 y。
 * @param {boolean} up 翅膀是否往上拍。
 */
function bee(g, x, y, up) {
  rect(g, x - 1, y, 5, 3, C.bee.o);
  rect(g, x, y + 1, 3, 1, C.bee.b);
  px(g, x + 1, y + 1, SH);
  px(g, x, y + 1, C.bee.h);
  g.globalAlpha = 0.85;
  px(g, x + 1, up ? y - 2 : y - 1, '#ffffff');
  px(g, x + 2, up ? y - 2 : y - 1, '#e8f4ff');
  if (up) px(g, x + 1, y - 1, '#e8f4ff');
  g.globalAlpha = 1;
}

/**
 * 小花：圓形花瓣與花心，帶一根莖。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 花心 x。
 * @param {number} y 花心 y。
 * @param {string} c 花瓣顏色。
 * @param {number} stem 莖長。
 */
function flower(g, x, y, c, stem) {
  const r = ramp(c);
  rect(g, x, y + 2, 1, stem, '#3f8a3a');
  px(g, x + 1, y + 2 + Math.floor(stem / 2), '#6ab84a');
  sprite(g, x - 2, y - 2, ['.oo.', 'ohlo', 'olco', '.oo.'], { o: r.o, h: r.h, l: r.l, c: R.gold.l });
  px(g, x - 2, y, r.b);
  px(g, x + 2, y - 1, r.b);
}

/**
 * 牆飾在牆面上的淡投影（形狀往右下偏移）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x0 範圍左 x。
 * @param {number} y0 範圍上 y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {(x: number, y: number) => boolean} inside 判斷像素是否在形狀內。
 */
function wallDrop(g, x0, y0, w, h, inside) {
  g.globalAlpha = 0.2;
  // 形狀往右下偏移 1、2 像素的投影。
  paint(g, x0, y0, w + 2, h + 3, function dropPixel(x, y) {
    return inside(x - 1, y - 2) ? SH : null;
  });
  g.globalAlpha = 1;
}

/**
 * 一堆乾草：半橢圓的草堆（外框、左亮右暗、零星的深淺草屑），兩側各垂下一縷草。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} by 底部 y（草堆的地面）。
 * @param {number} rx 水平半徑。
 * @param {number} ry 高度。
 */
function hayPile(g, cx, by, rx, ry) {
  const hy = C.hay;
  shadow(g, cx, by, rx * 2);
  // 逐點判斷乾草堆的顏色。
  paint(g, cx - rx - 1, by - ry - 1, rx * 2 + 3, ry + 2, function hayPixel(x, y) {
    if (!inEll(x, y, cx, by, rx, ry) || y > by - 1) return null;
    if (!inEll(x, y, cx, by, rx - 1, ry - 1)) return hy.o;
    const v = hash(x >> 1, y, 9);
    if (v < 0.18) return hy.d;
    if (v > 0.85) return hy.h;
    return x < cx - 2 ? hy.l : hy.b;
  });
  for (const [x, y] of [[cx - rx + 2, by - 2], [cx + rx - 3, by - 3]]) line(g, x, y, x + (x < cx ? -3 : 3), y + 1, hy.b);
}

/**
 * 木製水槽：粗木板釘成的長槽（深色木頭、正面兩道箍條），槽裡裝滿水並帶一道反光。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 左 x。
 * @param {number} y 上緣 y。
 * @param {number} w 寬。
 */
function trough(g, x, y, w) {
  const r = R.darkWood;
  shadow(g, x + w / 2, y + 10, w + 4);
  block(g, x, y, w, 4, 5, r, 'wood', 7);
  rect(g, x + 1, y + 1, w - 2, 2, R.water.d);
  rect(g, x + 1, y + 1, w - 2, 1, R.water.b);
  rect(g, x + 2, y + 1, Math.round(w / 3), 1, R.water.l);
  px(g, x + 3, y + 1, R.water.h);
  for (const bx of [x + 2, x + w - 4]) rect(g, bx, y + 4, 2, 5, R.iron.b);
}

/** 牧場動物與節慶裝飾的繪製方式（格式同 HOME_ART）。 */
export const ART = {
  // ── 牧場動物 ──
  chicken: {
    size: [2, 2], up: 14, frames: 2,
    /**
     * 雞舍圍欄：矮木圍欄圍著撒滿稻草的泥地，後方一座稻草屋頂的小雞窩（窩裡有蛋）、水盆與穀粒；
     * 白色母雞與兩隻小雞，第 2 幀母雞低頭啄食、小雞跳起。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const up = 14;
      penGround(g, H, up, C.dirt, 1);
      for (const [x, y, s] of [[10, 52, 1], [44, 40, 2], [28, 64, 3], [50, 60, 4], [16, 36, 5]]) strands(g, x, y, C.straw, s);
      penBack(g, H, up);
      // 雞窩：木箱、稻草斜屋頂、圓形入口裡的稻草窩與蛋。
      shadow(g, 15, 43, 22);
      block(g, 5, 28, 20, 3, 12, R.wood, 'wood', 6);
      ellipse(g, 15, 37, 5, 4, R.wood.o);
      rect(g, 10, 37, 11, 4, R.wood.o);
      ellipse(g, 15, 37, 4, 3, '#2a1a20');
      rect(g, 11, 37, 9, 3, '#2a1a20');
      rect(g, 11, 38, 9, 2, C.straw.d);
      for (const x of [11, 14, 17]) px(g, x, 37, C.straw.l);
      ellipse(g, 16, 37, 2, 2, R.white.o);
      ellipse(g, 16, 37, 1.2, 1.4, R.cream.l);
      px(g, 15, 36, '#ffffff');
      for (let y = 0; y < 9; y++) {
        const hw = 4 + Math.round(y * 1.05);
        rect(g, 15 - hw - 1, 20 + y, hw * 2 + 2, 1, C.straw.o);
        rect(g, 15 - hw, 20 + y, hw, 1, C.straw.l);
        rect(g, 15, 20 + y, hw, 1, C.straw.b);
        for (let x = 15 - hw + (y % 2); x < 15 + hw; x += 3) px(g, x, 20 + y, y % 3 === 2 ? C.straw.d : C.straw.h);
      }
      rect(g, 3, 28, 25, 1, C.straw.o);
      for (let x = 4; x < 27; x += 2) px(g, x, 29, C.straw.d);
      // 水盆與穀粒。
      ellipse(g, 49, 45, 6, 3, R.stone.o);
      ellipse(g, 49, 45, 5, 2, R.stone.l);
      ellipse(g, 49, 45.5, 3.5, 1.2, R.water.b);
      px(g, 47, 45, R.water.h);
      for (const [x, y] of [[20, 63], [23, 65], [18, 66], [26, 62], [22, 61]]) px(g, x, y, R.gold.l);
      // 母雞與小雞。
      hen(g, 33, 63, f === 1);
      chick(g, 47, 64, 0, -1);
      chick(g, 54, 67, f === 1 ? 4 : 0, -1);
      penFront(g, H);
    },
  },
  beehive: {
    size: [2, 2], up: 16, frames: 2,
    /**
     * 蜂箱：一片草地上，木架撐著兩層淺黃色的蜂箱（斜屋頂、出入口與降落板），旁邊一個稻草編的圓頂蜂巢，
     * 前方幾朵小花，小蜜蜂在周圍飛舞，兩幀的位置與翅膀不同。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const gr = C.meadow;
      // 草地：圓角的一片草皮，邊緣深色、上方亮。
      ellipse(g, 32, H - 26, 31, 24, gr.o);
      ellipse(g, 32, H - 26, 30, 23, gr.d);
      ellipse(g, 31, H - 27, 29, 21, gr.b);
      ellipse(g, 27, H - 34, 18, 10, mix(gr.b, gr.l, 0.5));
      for (let k = 0; k < 40; k++) {
        const x = 6 + Math.floor(hash(k, 3) * 52);
        const y = H - 46 + Math.floor(hash(3, k) * 38);
        if (inEll(x, y, 32, H - 26, 27, 20)) px(g, x, y, hash(k, k) < 0.5 ? gr.d : gr.l);
      }
      for (const [x, y] of [[6, 62], [56, 58], [12, 74], [50, 75], [30, 40]]) tuft(g, x, y);
      // 木架與兩層蜂箱。
      shadow(g, 24, H - 13, 30);
      for (const x of [12, 33]) post(g, x, H - 26, 3, 13, R.darkWood);
      block(g, 9, H - 30, 30, 3, 3, R.darkWood, 'wood', 3);
      const hv = C.hive;
      block(g, 12, H - 45, 24, 3, 12, hv, 'wood', 1);
      block(g, 12, H - 59, 24, 3, 11, hv, 'wood', 2);
      for (const y of [H - 37, H - 51]) {
        rect(g, 16, y, 3, 2, hv.o);
        rect(g, 29, y, 3, 2, hv.o);
      }
      rect(g, 18, H - 34, 12, 2, '#2a1a20');
      block(g, 16, H - 32, 16, 1, 1, R.wood, null);
      // 斜屋頂。
      for (let y = 0; y < 7; y++) {
        const hw = 6 + y * 2;
        rect(g, 24 - hw - 1, H - 66 + y, hw * 2 + 2, 1, C.roofHive.o);
        rect(g, 24 - hw, H - 66 + y, hw, 1, C.roofHive.l);
        rect(g, 24, H - 66 + y, hw, 1, C.roofHive.b);
      }
      rect(g, 23, H - 66, 2, 7, C.roofHive.h);
      rect(g, 9, H - 59, 30, 1, C.roofHive.o);
      rect(g, 10, H - 60, 28, 1, C.roofHive.d);
      // 稻草編的圓頂蜂巢（一圈圈的草繩與小入口）。
      const sk = C.skep;
      shadow(g, 49, H - 14, 18);
      // 逐點判斷稻草蜂巢的顏色。
      paint(g, 38, H - 34, 23, 22, function skepPixel(x, y) {
        if (!inEll(x, y, 49, H - 15, 10, 17) || y > H - 16) return null;
        if (!inEll(x, y, 49, H - 15, 9, 16) || y === H - 16) return sk.o;
        const ring = (y - (H - 34)) % 4;
        if (ring === 0) return sk.d;
        const lit = (x - 49) / 10;
        if (ring === 1 && lit < 0) return sk.h;
        return lit < -0.3 ? sk.l : lit > 0.45 ? sk.d : sk.b;
      });
      ellipse(g, 49, H - 19, 2.5, 2, '#2a1a20');
      rect(g, 47, H - 19, 5, 2, '#2a1a20');
      // 前方的小花。
      for (const [x, y, c, s] of [[8, H - 20, '#f48aa8', 4], [14, H - 14, '#ffffff', 3], [36, H - 9, '#b080e0', 3], [57, H - 22, '#f48aa8', 3], [42, H - 6, '#ffe070', 2]]) flower(g, x, y, c, s);
      // 蜜蜂（兩幀飛到不同位置）。
      const bees = f === 0 ? [[8, H - 54], [41, H - 64], [24, H - 29], [53, H - 42], [4, H - 34]] : [[12, H - 58], [45, H - 58], [21, H - 30], [57, H - 38], [8, H - 40]];
      // 每隻蜜蜂的翅膀依幀與編號交錯上下拍動。
      bees.forEach(([x, y], k) => bee(g, x, y, (f + k) % 2 === 0));
    },
  },
  cow: {
    size: [2, 2], up: 18, frames: 2,
    /**
     * 乳牛圍欄：較高較粗的深色木欄裡的泥地，左後方一座木水槽、右後方一堆乾草，黑白斑乳牛（粉紅鼻頭、小角、粉紅乳房）；
     * 第 2 幀低頭吃草並甩動尾巴。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const up = 18;
      penGround(g, H, up, C.dirt, 2);
      penBack(g, H, up, FENCE.sturdy);
      // 乾草堆與左後方的木水槽。
      hayPile(g, 49, up + 26, 10, 14);
      trough(g, 6, up + 13, 17);
      for (const [x, y, s2] of [[8, 60, 1], [44, 64, 2], [18, 70, 3]]) strands(g, x, y, C.hay, s2);
      for (const [x, y] of [[52, 72]]) tuft(g, x, y);
      cowFig(g, 35, H - 13, f);
      penFront(g, H, FENCE.sturdy);
    },
  },
  sheep: {
    size: [2, 2], up: 16, frames: 2,
    /**
     * 綿羊圍欄：淺色細橫木欄裡的草地，左後方一小堆乾草，一隻蓬鬆的綿羊（深色臉與腳）與一隻小羊；
     * 第 2 幀綿羊低頭吃草、小羊跳起來。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const up = 16;
      penGround(g, H, up, C.meadow, 3);
      for (const [x, y] of [[8, 40], [50, 36], [12, 70], [28, 44], [44, 72], [56, 54]]) tuft(g, x, y);
      for (const [x, y, c] of [[38, 34, '#ffffff'], [10, 56, '#ffe070']]) {
        px(g, x, y, c);
        px(g, x - 1, y + 1, c);
        px(g, x + 1, y + 1, c);
        px(g, x, y + 1, R.gold.b);
      }
      penBack(g, H, up, FENCE.light);
      // 左後方一小堆乾草。
      hayPile(g, 14, up + 22, 8, 10);
      sheepFig(g, 38, H - 21, 1, 0, f === 1, 1);
      sheepFig(g, 17, H - 12, 0.6, f === 1 ? 4 : 0, false, 7);
      penFront(g, H, FENCE.light);
    },
  },
  // ── 節慶裝飾 ──
  springCouplet: {
    size: [1, 1], up: 0,
    /**
     * 春聯（斗方）：菱形的紅紙，粗金邊與內側細金線、四角灑金點，中央是帶暗紅字影的金色「春」字，上方以紅繩掛在釘上。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const cx = 16;
      const cy = 17;
      /**
       * 判斷像素是否在菱形紙面內。
       * @param {number} x x。
       * @param {number} y y。
       * @param {number} [k=0] 往內縮的像素。
       * @returns {boolean} 是否在範圍內。
       */
      const inD = (x, y, k = 0) => Math.abs(x + 0.5 - cx) + Math.abs(y + 0.5 - cy) <= 13 - k;
      wallDrop(g, 2, 3, 28, 28, inD);
      const r = C.paperRed;
      // 紙面：外框、粗金邊、紅色窄帶與內側細金線，紅紙左上亮、右下暗。
      paint(g, 2, 3, 29, 29, function couplPixel(x, y) {
        if (!inD(x, y)) return null;
        if (!inD(x, y, 1)) return r.o;
        if (!inD(x, y, 2)) return x + y < cx + cy ? R.gold.h : R.gold.b;
        if (!inD(x, y, 3)) return r.d;
        if (!inD(x, y, 4)) return x + y < cx + cy ? R.gold.l : R.gold.d;
        const t = (x - cx) + (y - cy);
        if (t < -8) return r.l;
        if (t > 7) return r.d;
        return r.b;
      });
      // 四角的灑金點。
      for (const [x, y] of [[16, 7], [7, 17], [25, 17], [16, 27]]) px(g, x, y, R.gold.l);
      // 中央的金色「春」字：上方三橫穿一豎，下方撇捺張開，中間夾著「日」；先畫右下的暗紅字影再畫金字。
      const chun = [
        '......x......',
        '...xxxxxxx...',
        '......x......',
        '....xxxxx....',
        '......x......',
        '.xxxxxxxxxxx.',
        '.....x.x.....',
        '....x...x....',
        '...x.xxx.x...',
        '..x..x.x..x..',
        '.x...xxx...x.',
        '.....x.x.....',
        '.....xxx.....',
      ];
      // 逐列點出字影。
      chun.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === 'x') px(g, 11 + i, 12 + j, r.o);
      });
      // 逐列點出金字（左上的筆畫用亮金色）。
      chun.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === 'x') px(g, 10 + i, 11 + j, i + j < 9 ? R.gold.h : R.gold.l);
      });
      // 掛釘與紅繩。
      rect(g, 15, 0, 3, 2, R.iron.o);
      px(g, 16, 0, R.iron.l);
      line(g, 16, 2, 16, 4, R.red.d);
    },
  },
  sachet: {
    size: [1, 1], up: 0,
    /**
     * 端午香包：釘子垂下的紅繩、翠綠串珠，紅色錦緞的葫蘆形布包（金線滾邊、繡花與綠葉），下方繫著五彩流蘇。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     */
    draw(g) {
      const s = C.silk;
      /**
       * 判斷像素是否在香包布面內（上小下大的葫蘆形）。
       * @param {number} x x。
       * @param {number} y y。
       * @returns {boolean} 是否在範圍內。
       */
      const inBag = (x, y) => inEll(x, y, 16, 18, 7.5, 6.5) || inEll(x, y, 16, 10.5, 4, 3.2) || (y >= 10 && y <= 14 && Math.abs(x + 0.5 - 16) < 3.4);
      wallDrop(g, 7, 6, 18, 20, inBag);
      // 掛釘、紅繩與綠色串珠。
      rect(g, 15, 0, 3, 2, R.iron.o);
      px(g, 16, 0, R.iron.l);
      rect(g, 16, 2, 1, 3, R.red.b);
      orb(g, 16.5, 5.5, 1.3, 1.3, C.jade);
      // 布包：外框、金線滾邊、紅緞（左上亮、右下暗）。
      paint(g, 7, 6, 18, 20, function bagPixel(x, y) {
        if (!inBag(x, y)) return null;
        if (!inBag(x - 1, y) || !inBag(x + 1, y) || !inBag(x, y + 1) || !inBag(x, y - 1)) return s.o;
        if (!inBag(x - 2, y) || !inBag(x + 2, y) || !inBag(x, y + 2)) return x < 16 ? R.gold.l : R.gold.d;
        const lit = (x - 16) * 0.5 + (y - 16) * 0.6;
        if (lit < -3.5) return s.h;
        if (lit < -1.5) return s.l;
        if (lit > 3) return s.d;
        return s.b;
      });
      weave(g, 11, 15, 10, 7, s);
      // 束口的金繩結。
      rect(g, 12, 13, 9, 2, R.gold.o);
      rect(g, 13, 13, 7, 1, R.gold.l);
      px(g, 16, 14, R.gold.h);
      // 繡花：五瓣花與兩片綠葉。
      sprite(g, 13, 15, [
        '..oo...',
        '.oppo..',
        'oppypoo',
        'opyYypg',
        '.oppoGg',
        'gGoo...',
        '.g.....',
      ], { o: C.pink.d, p: C.pink.l, y: R.gold.b, Y: R.gold.h, g: C.jade.d, G: C.jade.l });
      px(g, 11, 18, R.gold.l);
      px(g, 21, 21, R.gold.l);
      // 五彩流蘇：串珠與五色絲線。
      orb(g, 16.5, 25.5, 1.3, 1.3, C.jade);
      const colors = [R.red.b, R.gold.l, C.jade.b, R.blue.l, C.pink.b];
      rect(g, 13, 27, 7, 1, R.gold.o);
      // 每條絲線一種顏色，中間那條較長。
      colors.forEach((c, k) => {
        const x = 14 + k;
        rect(g, x, 28, 1, k === 2 ? 4 : 3, c);
      });
      px(g, 13, 28, R.red.d);
      px(g, 19, 28, C.pink.d);
    },
  },
  moonLantern: {
    size: [1, 1], up: 6, frames: 2,
    /**
     * 中秋燈籠（兔子燈）：白紙糊的小兔身體裡透出暖黃燭光（兩幀明暗閃爍，周圍的暖橘光點交錯閃動），粉紅長耳、紅眼睛、
     * 背上的紅花，底下兩個小木輪與一根提燈的竹竿。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 寬。
     * @param {number} H 高。
     * @param {number} f 幀。
     */
    draw(g, W, H, f) {
      const l = C.lamp;
      const warm = f ? '#ffd070' : '#ffb848';
      glow(g, 17, H - 14, 13, f ? '#ffc040' : '#ffa830', f);
      shadow(g, 16, H - 3, 20);
      // 提燈的竹竿與吊繩。
      line(g, 26, H - 30, 22, H - 16, R.lightWood.o);
      line(g, 27, H - 30, 23, H - 16, R.lightWood.l);
      line(g, 26, H - 30, 30, H - 34, R.lightWood.o);
      // 小木輪（後輪先畫）。
      for (const x of [10, 22]) {
        ellipse(g, x, H - 6, 3, 3, R.darkWood.o);
        ellipse(g, x, H - 6, 2, 2, R.darkWood.l);
        px(g, x, H - 6, R.darkWood.o);
      }
      // 身體：白紙、內部的暖光、竹骨的細線。
      paint(g, 4, H - 22, 26, 16, function lampPixel(x, y) {
        if (!inEll(x, y, 17, H - 13, 10, 7)) return null;
        if (!inEll(x, y, 17, H - 13, 9, 6)) return l.o;
        const d = Math.hypot((x + 0.5 - 17) / 9, (y + 0.5 - (H - 13)) / 6);
        if (d < (f ? 0.45 : 0.38)) return '#fff6c8';
        if (d < (f ? 0.75 : 0.68)) return mix(l.b, warm, 0.35);
        return x + y < 17 + H - 13 ? l.b : mix(l.d, warm, 0.25);
      });
      for (const x of [13, 21]) for (let y = H - 18; y < H - 8; y++) if (inEll(x, y, 17, H - 13, 8, 5)) px(g, x, y, mix(l.d, warm, 0.4));
      // 尾巴。
      ellipse(g, 27, H - 15, 2.5, 2.5, l.o);
      ellipse(g, 27, H - 15, 1.6, 1.6, '#ffffff');
      // 頭與長耳朵。
      for (const [x, lean] of [[6, 1], [10, 2]]) {
        for (let k = 0; k < 7; k++) {
          const ex = x + Math.round((k * lean) / 6);
          const ey = H - 21 - k;
          rect(g, ex - 2, ey, 4, 1, l.o);
          if (k > 0 && k < 6) rect(g, ex - 1, ey, 2, 1, k > 1 ? C.pink.l : l.b);
        }
        rect(g, x + lean - 1, H - 28, 2, 1, l.o);
      }
      // 逐點判斷頭部的顏色。
      paint(g, 2, H - 24, 14, 12, function headPixel(x, y) {
        if (!inEll(x, y, 8, H - 18, 6, 5)) return null;
        if (!inEll(x, y, 8, H - 18, 5, 4)) return l.o;
        const d = Math.hypot((x + 0.5 - 9) / 5, (y + 0.5 - (H - 17)) / 4);
        return d < 0.6 ? mix(l.b, warm, f ? 0.4 : 0.3) : l.b;
      });
      px(g, 6, H - 19, R.red.b);
      px(g, 6, H - 20, '#ffffff');
      px(g, 4, H - 17, C.pink.b);
      px(g, 8, H - 16, C.pink.l);
      // 背上的紅紙花。
      sprite(g, 16, H - 22, ['.oo.', 'orro', 'orRo', '.oo.'], { o: R.red.o, r: R.red.b, R: R.gold.l });
    },
  },
};
