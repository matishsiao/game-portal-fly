// 家園美術：地板與牆面樣式、地毯、作物（繪製規則見 homeDraw.js 開頭說明）。
// 地板 32 × 32 需四向無縫拼接、牆面 32 × 48 需水平無縫拼接：跨格的圖案以「世界座標」決定（i、j 以 4 格為週期），
// 跨越邊界的方塊同時畫在 x 與 x − 32，讓相鄰兩格畫出同一塊。

import { mix, ramp, R, rect, px, hash, ellipse, orb, foliage, soil } from '../homeDraw.js';

/**
 * 世界座標雜訊：以 4 格（128 像素）為週期，相鄰格與 i、j 迴繞時接縫處的值一致。
 * @param {number} i 格子 x（0～3）。
 * @param {number} j 格子 y（0～3）。
 * @param {number} x 格內 x（可超出 0～31）。
 * @param {number} y 格內 y（可超出 0～31）。
 * @param {number} [s=0] 種子。
 * @returns {number} 0～1。
 */
function wn(i, j, x, y, s = 0) {
  const wx = (((i * 32 + x) % 128) + 128) % 128;
  const wy = (((j * 32 + y) % 128) + 128) % 128;
  return hash(wx, wy, s);
}

/**
 * 一塊磚或石塊：圓角（四角留給灰縫）、左上亮邊、右下暗邊與世界座標斑點。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {object} r 色階。
 * @param {number} tone 0～1 的色調變化（0.5 為基底色）。
 * @param {number} i 格子 x（斑點用）。
 * @param {number} j 格子 y（斑點用）。
 * @param {number} [bevel=1] 斜邊寬度。
 */
function stoneBlock(g, x, y, w, h, r, tone, i, j, bevel = 1) {
  const c = mix(r.b, tone < 0.5 ? r.d : r.l, Math.abs(tone - 0.5) * 0.8);
  rect(g, x + 1, y, w - 2, h, c);
  rect(g, x, y + 1, w, h - 2, c);
  for (let k = 0; k < bevel; k++) {
    const t = bevel === 1 ? 1 : 1 - k * 0.45;
    rect(g, x + 1 + k, y + k, w - 2 - k * 2, 1, mix(c, r.h, 0.55 * t));
    rect(g, x + k, y + 1 + k, 1, h - 2 - k * 2, mix(c, r.l, 0.7 * t));
    rect(g, x + 1 + k, y + h - 1 - k, w - 2 - k * 2, 1, mix(c, r.d, 0.85 * t));
    rect(g, x + w - 1 - k, y + 1 + k, 1, h - 2 - k * 2, mix(c, r.d, 0.6 * t));
  }
  for (let b = bevel; b < h - bevel; b++) {
    for (let a = bevel; a < w - bevel; a++) {
      const v = wn(i, j, x + a, y + b, 17);
      if (v < 0.07) px(g, x + a, y + b, mix(c, r.d, 0.75));
      else if (v > 0.95) px(g, x + a, y + b, mix(c, r.l, 0.8));
    }
  }
}

/**
 * 畫一排會水平迴繞的方塊（最後一塊跨過右緣時，同時畫在 x − 32 補上左緣）。
 * @param {number[]} starts 每塊的起點 x（遞增，0～31）。
 * @param {(x: number, w: number, k: number) => void} each 每塊的繪製函式（x 起點、w 寬含 1 像素灰縫、k 序號）。
 */
function wrapRow(starts, each) {
  for (let k = 0; k < starts.length; k++) {
    const x = starts[k];
    const next = k + 1 < starts.length ? starts[k + 1] : starts[0] + 32;
    each(x, next - x, k);
    if (next > 32) each(x - 32, next - x, k);
  }
}

/**
 * 牆頂（上方 16 像素的深色帽緣），結構同 woodWall。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {object} r 色階。
 * @param {boolean} [joints=false] 是否畫出石材接縫。
 */
function wallTop(g, r, joints = false) {
  rect(g, 0, 0, 32, 16, r.o);
  rect(g, 0, 12, 32, 4, r.d);
  if (joints) {
    for (const x of [0, 16]) rect(g, x, 0, 1, 12, mix(r.o, r.d, 0.5));
    rect(g, 0, 11, 32, 1, mix(r.o, r.d, 0.5));
  }
}

/**
 * 踢腳板（牆面底部 5 像素），結構同 woodWall。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {object} r 色階。
 */
function baseboard(g, r) {
  rect(g, 0, 43, 32, 5, r.b);
  rect(g, 0, 43, 32, 1, r.l);
  rect(g, 0, 44, 32, 1, mix(r.b, r.l, 0.4));
  rect(g, 0, 47, 32, 1, r.d);
}

/**
 * 像素五角星（7 × 7 圖樣），外框選用。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {object} r 色階。
 * @param {boolean} [outline=true] 是否加外框。
 */
function pixelStar(g, cx, cy, r, outline = true) {
  const pat = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
  if (outline) {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      if (pat[y][x] !== '#') continue;
      rect(g, cx - 4 + x, cy - 4 + y, 3, 3, r.o);
    }
  }
  for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
    if (pat[y][x] !== '#') continue;
    px(g, cx - 3 + x, cy - 3 + y, y < 3 && x < 4 ? r.l : y > 4 ? r.d : r.b);
  }
  px(g, cx, cy - 2, r.h);
  px(g, cx - 1, cy, r.h);
}

/**
 * 四芒閃光（十字形，中心最亮）。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x 中心 x。
 * @param {number} y 中心 y。
 * @param {number} len 臂長。
 * @param {string} c 臂的顏色。
 * @param {string} core 中心顏色。
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
 * 齒輪：外圈齒、輪體、左上亮面、內圈與中心軸孔。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} rad 輪體半徑。
 * @param {number} teeth 齒數。
 * @param {object} r 色階。
 * @param {number} rot 旋轉角（弧度）。
 * @param {string} hole 軸孔顏色。
 */
function gearShape(g, cx, cy, rad, teeth, r, rot, hole) {
  const tips = [];
  for (let t = 0; t < teeth; t++) {
    const a = rot + (t / teeth) * Math.PI * 2;
    tips.push([Math.round(cx + Math.cos(a) * (rad + 1)), Math.round(cy + Math.sin(a) * (rad + 1))]);
  }
  for (const [x, y] of tips) rect(g, x - 2, y - 2, 4, 4, r.o);
  ellipse(g, cx, cy, rad + 1, rad + 1, r.o);
  for (const [x, y] of tips) rect(g, x - 1, y - 1, 2, 2, y < cy ? r.l : r.b);
  ellipse(g, cx, cy, rad, rad, r.d);
  ellipse(g, cx - 0.5, cy - 0.5, rad - 0.8, rad - 0.8, r.b);
  ellipse(g, cx - rad * 0.3, cy - rad * 0.3, rad * 0.45, rad * 0.4, r.l);
  ellipse(g, cx, cy, rad * 0.55, rad * 0.55, r.d);
  ellipse(g, cx, cy, rad * 0.45, rad * 0.45, r.b);
  ellipse(g, cx, cy, Math.max(1, rad * 0.22), Math.max(1, rad * 0.22), hole);
}

/**
 * 地板與牆面樣式（代碼 → (g, i, j) 繪製函式；地板 32 × 32、牆面 32 × 48）。
 */
export const TILES = {
  /**
   * 紅磚地板：16 × 8 的順砌紅磚（每排錯開半塊）、淺灰泥縫、每塊磚色調略有不同與斑點。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   * @param {number} j 格子 y（0～3）。
   */
  redBrick(g, i, j) {
    const r = ramp('#b4523c');
    const m = ramp('#bcb09c');
    rect(g, 0, 0, 32, 32, m.b);
    for (let k = 0; k < 4; k++) {
      const row = (j * 4 + k) % 16;
      const off = (row % 2) * 8;
      const y = k * 8;
      for (let n = 0; n < 3; n++) {
        const x0 = off - 16 + n * 16;
        const id = ((((i * 32 + x0) >> 4) % 8) + 8) % 8;
        stoneBlock(g, x0, y, 15, 7, r, hash(id, row, 5), i, j);
        // 泥縫的陰影：磚的右下方暗一階。
        rect(g, x0 + 1, y + 7, 15, 1, m.d);
      }
    }
  },
  /**
   * 大理石：每格 4 塊拋光石板（交錯微帶冷色），隨機蜿蜒的灰色石紋與左上的光澤反光。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   * @param {number} j 格子 y（0～3）。
   */
  marble(g, i, j) {
    const r = ramp('#e6e2dc');
    rect(g, 0, 0, 32, 32, mix(r.d, r.b, 0.35));
    for (const [sx, sy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
      const alt = ((sx + sy) / 16) % 2;
      const base = alt ? mix(r.b, '#cfd6e2', 0.55) : r.b;
      const seed = i * 13 + j * 7 + sx + sy * 3;
      rect(g, sx + 1, sy + 1, 15, 15, base);
      rect(g, sx + 1, sy + 1, 15, 1, r.h);
      rect(g, sx + 1, sy + 1, 1, 15, mix(base, r.h, 0.6));
      rect(g, sx + 1, sy + 15, 15, 1, mix(base, r.d, 0.35));
      rect(g, sx + 15, sy + 1, 1, 15, mix(base, r.d, 0.25));
      // 雲霧般的淡色塊。
      for (let b = 2; b < 15; b++) for (let a = 2; a < 15; a++) {
        if (hash(sx + a, sy + b, seed) < 0.08) px(g, sx + a, sy + b, mix(base, r.d, 0.18));
      }
      // 主石紋：由上緣蜿蜒到下緣，旁邊伴隨較淡的細紋；中途分出一條支紋。
      const vein = mix(base, '#8a8a9e', 0.42);
      const soft = mix(base, '#a4a4b8', 0.22);
      if (hash(seed, 11) < 0.3) {
        for (let k = 0; k < 3; k++) px(g, sx + 3 + k, sy + 5 - k, '#ffffff');
        continue;
      }
      let x = sx + 3 + Math.floor(hash(seed, 1) * 10);
      let bx = 0;
      let by = 0;
      for (let y = sy + 2; y < sy + 15; y++) {
        px(g, x, y, vein);
        if (hash(seed, y, 4) < 0.5) px(g, x + 1, y, soft);
        if (y === sy + 7) {
          bx = x;
          by = y;
        }
        const step = hash(seed, y, 2);
        if (step < 0.3) x -= 1;
        else if (step > 0.62) x += 1;
        x = Math.max(sx + 2, Math.min(sx + 14, x));
      }
      const dir = hash(seed, 9) < 0.5 ? -1 : 1;
      for (let k = 1; k < 6; k++) {
        const vx = bx + dir * k;
        if (vx > sx + 1 && vx < sx + 15) px(g, vx, by + Math.floor(k / 2), soft);
      }
      // 拋光反光：左上的短斜線。
      for (let k = 0; k < 3; k++) px(g, sx + 3 + k, sy + 5 - k, '#ffffff');
    }
  },
  /**
   * 榻榻米：每格兩張 16 × 32 的草蓆（依位置直放或橫放），沿長邊的藺草織紋與深綠布邊。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   * @param {number} j 格子 y（0～3）。
   */
  tatami(g, i, j) {
    const r = ramp('#c6be74');
    const heri = ramp('#3e5a40');
    const vertical = (i + j) % 2 === 0;
    for (let m = 0; m < 2; m++) {
      const x = vertical ? m * 16 : 0;
      const y = vertical ? 0 : m * 16;
      const w = vertical ? 16 : 32;
      const h = vertical ? 32 : 16;
      rect(g, x, y, w, h, r.b);
      // 藺草織紋：與長邊平行，每 2 像素一深一淺，夾雜細小的節點。
      for (let a = 0; a < (vertical ? w : h); a++) {
        const c = a % 2 ? mix(r.b, r.d, 0.28) : mix(r.b, r.l, 0.25);
        if (vertical) rect(g, x + a, y, 1, h, c);
        else rect(g, x, y + a, w, 1, c);
      }
      for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) {
        if (hash(x + a, y + b, i * 4 + j + 31) < 0.05) px(g, x + a, y + b, mix(r.b, r.d, 0.5));
      }
      // 兩條長邊的布邊（深綠、內側一條亮線），短邊只有淺淺的接縫。
      if (vertical) {
        for (const ex of [x, x + w - 3]) {
          rect(g, ex, y, 3, h, heri.b);
          rect(g, ex + 1, y, 1, h, heri.l);
        }
        rect(g, x, y, w, 1, r.d);
        rect(g, x + 3, y + 1, w - 6, 1, r.l);
      } else {
        for (const ey of [y, y + h - 3]) {
          rect(g, x, ey, w, 3, heri.b);
          rect(g, x, ey + 1, w, 1, heri.l);
        }
        rect(g, x, y, 1, h, r.d);
        rect(g, x + 1, y + 3, 1, h - 6, r.l);
      }
      rect(g, x, y + h - 1, w, 1, mix(heri.d, r.d, 0.3));
      rect(g, x + w - 1, y, 1, h, mix(heri.d, r.d, 0.3));
    }
  },
  /**
   * 貝殼磁磚：薄荷綠與珊瑚粉交錯的釉面方磚，綠磚上有扇貝、粉磚上有小海星，帶珍珠光澤。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   * @param {number} j 格子 y（0～3）。
   */
  shellTile(g, i, j) {
    const teal = ramp('#8ed4cc');
    const pink = ramp('#f2bcc2');
    const cream = ramp('#f6ead2');
    const coral = ramp('#e8806a');
    rect(g, 0, 0, 32, 32, mix(cream.b, cream.d, 0.25));
    for (const [sx, sy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
      const isTeal = ((sx + sy) / 16) % 2 === 0;
      const t = isTeal ? teal : pink;
      rect(g, sx + 1, sy + 1, 15, 15, t.b);
      rect(g, sx + 1, sy + 1, 15, 1, t.l);
      rect(g, sx + 1, sy + 1, 1, 15, t.l);
      rect(g, sx + 1, sy + 15, 15, 1, t.d);
      rect(g, sx + 15, sy + 1, 1, 15, mix(t.b, t.d, 0.6));
      // 珍珠光澤：一道柔和的斜向亮帶。
      for (let k = 0; k < 12; k++) {
        px(g, sx + 2 + k, sy + 13 - k, mix(t.b, t.h, 0.35));
        if (k > 1 && k < 10) px(g, sx + 3 + k, sy + 13 - k, mix(t.b, t.h, 0.2));
      }
      const cx = sx + 8;
      const cy = sy + 8;
      if (isTeal) {
        // 扇貝：放射狀的貝肋，下方的貝殼耳。
        const rows = [[-4, 2], [-3, 4], [-2, 5], [-1, 5], [0, 5], [1, 4], [2, 3], [3, 1]];
        for (const [dy, hw] of rows) rect(g, cx - hw - 1, cy + dy - 1, hw * 2 + 3, 3, cream.o);
        rect(g, cx - 3, cy + 3, 7, 3, cream.o);
        for (const [dy, hw] of rows) rect(g, cx - hw, cy + dy, hw * 2 + 1, 1, cream.b);
        rect(g, cx - 2, cy + 4, 5, 1, cream.d);
        for (const off of [-4, -2, 0, 2, 4]) {
          for (let dy = -3; dy <= 3; dy++) {
            const x = cx + Math.round((off * (3 - dy)) / 7);
            px(g, x, cy + dy, cream.d);
          }
        }
        rect(g, cx - 2, cy - 4, 5, 1, cream.h);
        px(g, cx - 3, cy - 3, cream.h);
        px(g, cx - 4, cy - 2, cream.l);
      } else {
        // 小海星：五隻短臂與中心的小點。
        const pts = [];
        for (let a = 0; a < 5; a++) {
          const ang = -Math.PI / 2 + (a / 5) * Math.PI * 2 + hash(i, j, sx + sy) * 0.6;
          for (let d = 0; d <= 4; d++) pts.push([Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), d]);
        }
        for (const [x, y] of pts) rect(g, x - 1, y - 1, 3, 3, coral.o);
        for (const [x, y, d] of pts) {
          px(g, x, y, d < 3 ? coral.b : coral.l);
          if (d < 3) px(g, x + 1, y, coral.b);
        }
        px(g, cx, cy, coral.h);
        px(g, cx - 1, cy - 1, coral.h);
      }
    }
  },
  /**
   * 星空地板：深藍紫的拋光磚，隱約的磚縫、細碎星點（世界座標，跨格連續）與偶爾一顆大閃星。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   * @param {number} j 格子 y（0～3）。
   */
  starFloor(g, i, j) {
    const r = ramp('#262058');
    rect(g, 0, 0, 32, 32, r.b);
    // 星雲：大範圍、平滑起伏的紫色與藍色淡斑（以世界座標的正弦組合，週期整除 128）。
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const wx = i * 32 + x;
      const wy = j * 32 + y;
      const v = Math.sin((wx / 128) * Math.PI * 4 + Math.sin((wy / 128) * Math.PI * 2) * 2) + Math.cos((wy / 128) * Math.PI * 4 + (wx / 128) * Math.PI * 2);
      const d = wn(i, j, x, y, 3) * 0.6;
      if (v + d > 1.4) px(g, x, y, mix(r.b, '#5a3a98', 0.45));
      else if (v + d > 0.9) px(g, x, y, mix(r.b, '#3a3a8a', 0.4));
      else if (v - d < -1.5) px(g, x, y, mix(r.b, r.d, 0.6));
    }
    // 磚縫與磚面左上亮邊（16 像素一塊）。
    for (const k of [0, 16]) {
      rect(g, k, 0, 1, 32, r.d);
      rect(g, 0, k, 32, 1, r.d);
      rect(g, k + 1, 0, 1, 32, mix(r.b, r.l, 0.3));
      rect(g, 0, k + 1, 32, 1, mix(r.b, r.l, 0.3));
    }
    // 細碎星點。
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const v = wn(i, j, x, y, 8);
      if (v < 0.012) px(g, x, y, '#fff6c8');
      else if (v < 0.03) px(g, x, y, mix(r.b, '#c8d8ff', 0.6));
    }
    // 小十字星（避開格緣，不跨格）。
    for (let k = 0; k < 2; k++) {
      const x = 3 + Math.floor(hash(i, j, 40 + k) * 26);
      const y = 3 + Math.floor(hash(j, i, 50 + k) * 26);
      sparkle(g, x, y, 1, mix(r.b, '#c8d8ff', 0.7), '#ffffff');
    }
    if (hash(i, j, 77) < 0.5) {
      const x = 6 + Math.floor(hash(i, j, 78) * 20);
      const y = 6 + Math.floor(hash(i, j, 79) * 20);
      g.globalAlpha = 0.25;
      ellipse(g, x + 0.5, y + 0.5, 4, 4, '#fff0a0');
      g.globalAlpha = 1;
      sparkle(g, x, y, 3, '#fff0a0', '#fffbe0');
    }
  },
  /**
   * 石牆：三排大小不一的灰石塊（深色灰縫、圓角、左上亮右下暗、斑點與偶見裂紋）。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  stoneWall(g, i) {
    const r = R.stone;
    wallTop(g, r, true);
    rect(g, 0, 16, 32, 27, mix(r.d, r.o, 0.5));
    const rows = [[18, 8, [0, 12, 21]], [26, 9, [6, 17, 27]], [35, 8, [3, 13, 24]]];
    rows.forEach(
      /**
       * 畫一排石塊。
       * @param {[number, number, number[]]} row 起點 y、高度與每塊起點 x。
       * @param {number} ri 排序號。
       */
      ([y, h, starts], ri) => {
        wrapRow(starts,
          /**
           * 畫一塊石頭（跨格的石塊色調只依排與序號決定），完整落在格內者偶有裂紋。
           * @param {number} x 起點 x。
           * @param {number} w 寬（含灰縫）。
           * @param {number} k 序號。
           */
          (x, w, k) => {
            stoneBlock(g, x, y, w - 1, h - 1, r, hash(ri, k, 21), i, 0);
            if (x >= 0 && x + w <= 32 && hash(i, ri * 3 + k, 22) < 0.3) {
              const cx = x + 3 + Math.floor(hash(i, k, 23) * (w - 7));
              for (let t = 0; t < 4; t++) px(g, cx + (t >> 1), y + 2 + t, r.d);
            }
          });
      });
    rect(g, 0, 16, 32, 2, r.l);
    rect(g, 0, 16, 32, 1, r.h);
    baseboard(g, R.darkWood);
  },
  /**
   * 花紋壁紙：暖米色底、淡色菱格暗紋，兩排交錯的五瓣玫瑰小花與綠葉。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  floralPaper(g, i) {
    const r = ramp('#ecd8cc');
    const rose = ramp('#d8667e');
    const leaf = R.leaf;
    wallTop(g, ramp('#8a5a52'));
    rect(g, 0, 16, 32, 27, r.b);
    // 菱格暗紋（週期 8，水平無縫）。
    for (let y = 16; y < 43; y++) for (let x = 0; x < 32; x++) {
      if ((x + y) % 8 === 0 || (x - y + 64) % 8 === 0) {
        if ((x + y) % 2 === 0) px(g, x, y, mix(r.b, r.d, 0.14));
      }
    }
    /**
     * 一朵小花：外框、五片花瓣、金色花心與兩片葉子。
     * @param {number} cx 中心 x。
     * @param {number} cy 中心 y。
     */
    const flower = (cx, cy) => {
      const petals = [[0, -2], [2, -1], [1, 2], [-1, 2], [-2, -1]];
      for (const [lx, ly] of [[-4, 2], [4, 2]]) {
        ellipse(g, cx + lx, cy + ly, 2, 1.5, leaf.o);
      }
      for (const [lx, ly] of [[-4, 2], [4, 2]]) {
        ellipse(g, cx + lx, cy + ly, 1.5, 1, leaf.b);
        px(g, cx + lx - 1, cy + ly - 1, leaf.l);
      }
      for (const [dx, dy] of petals) ellipse(g, cx + dx + 0.5, cy + dy + 0.5, 2.2, 2.2, rose.o);
      for (const [dx, dy] of petals) ellipse(g, cx + dx + 0.5, cy + dy + 0.5, 1.5, 1.5, dy < 0 ? rose.l : rose.b);
      px(g, cx - 2, cy - 2, rose.h);
      rect(g, cx, cy, 1, 1, R.gold.l);
      px(g, cx + 1, cy + 1, R.gold.d);
    };
    for (const x of [8, 24]) flower(x, 23);
    for (const x of [0, 16, 32]) flower(x, 35);
    // 小花之間的小點綴。
    for (const [x, y] of [[0, 23], [16, 23], [8, 35], [24, 35], [32, 23]]) {
      px(g, x, y, rose.d);
      px(g, x - 1, y, mix(r.b, rose.b, 0.4));
      px(g, x + 1, y, mix(r.b, rose.b, 0.4));
    }
    rect(g, 0, 16, 32, 2, r.l);
    rect(g, 0, 16, 32, 1, r.h);
    rect(g, 0, 42, 32, 1, r.d);
    baseboard(g, R.darkWood);
  },
  /**
   * 條紋壁紙：上半部薄荷綠與奶油色直條紋（細線點綴）、木質腰線，下半部白色護牆板。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  stripePaper(g, i) {
    const mint = ramp('#88c4ac');
    const cream = R.cream;
    const panel = ramp('#e8e2d6');
    const wood = R.lightWood;
    wallTop(g, ramp('#4a6e62'));
    for (let x = 0; x < 32; x++) {
      const p = x % 8;
      const c = p < 4 ? (p === 0 ? mint.l : mint.b) : p === 6 ? mint.d : cream.b;
      rect(g, x, 16, 1, 17, c);
    }
    // 薄荷條紋上的細小菱點（每 6 像素一個，交錯排列）。
    for (let y = 19; y < 32; y += 6) for (let x = 0; x < 32; x += 8) {
      const yy = y + ((x / 8) % 2) * 3;
      px(g, x + 2, yy, mint.h);
      px(g, x + 1, yy, mix(mint.b, mint.h, 0.4));
      px(g, x + 3, yy, mix(mint.b, mint.h, 0.4));
    }
    // 腰線：木質線板（亮上緣、暗下緣）。
    rect(g, 0, 32, 32, 3, wood.b);
    rect(g, 0, 32, 32, 1, wood.h);
    rect(g, 0, 34, 32, 1, wood.d);
    rect(g, 0, 35, 32, 1, wood.o);
    // 護牆板：每 16 像素一片，內凹的框線。
    rect(g, 0, 36, 32, 7, panel.b);
    for (const x of [0, 16]) {
      rect(g, x, 36, 1, 7, panel.d);
      rect(g, x + 3, 37, 11, 1, panel.d);
      rect(g, x + 3, 37, 1, 5, panel.d);
      rect(g, x + 4, 41, 10, 1, panel.h);
      rect(g, x + 13, 38, 1, 4, panel.h);
      rect(g, x + 4, 38, 9, 3, panel.l);
    }
    rect(g, 0, 16, 32, 2, mint.l);
    rect(g, 0, 16, 32, 1, mint.h);
    baseboard(g, panel);
  },
  /**
   * 紅磚牆：四排順砌紅磚（錯開半塊）、淺色灰縫與磚面斑點。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  brickWall(g, i) {
    const r = ramp('#b04a36');
    const m = ramp('#c8bca8');
    wallTop(g, r);
    rect(g, 0, 16, 32, 27, m.b);
    for (let k = 0; k < 4; k++) {
      const y = 18 + k * 6;
      const off = (k % 2) * 8;
      for (let n = 0; n < 3; n++) {
        const x0 = off - 16 + n * 16;
        const id = ((((i * 32 + x0) >> 4) % 8) + 8) % 8;
        stoneBlock(g, x0, y, 15, 5, r, hash(id, k, 9), i, 0);
        rect(g, x0 + 1, y + 5, 15, 1, m.d);
      }
    }
    rect(g, 0, 42, 32, 1, m.d);
    rect(g, 0, 16, 32, 2, m.l);
    rect(g, 0, 16, 32, 1, m.h);
    baseboard(g, R.darkWood);
  },
  /**
   * 海洋壁紙：由淺到深的海水漸層、上方的波浪紋、氣泡、海草與一條小魚（每格位置不同）。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  oceanPaper(g, i) {
    const top = '#9adcf0';
    const deep = '#3a7cc4';
    const sea = ramp('#4a96d0');
    wallTop(g, ramp('#2a5a8a'));
    // 漸層（每 3 像素一階，階與階之間用棋盤點混色）。
    for (let y = 16; y < 43; y++) {
      const t = Math.floor((y - 16) / 3) / 8;
      rect(g, 0, y, 32, 1, mix(top, deep, t));
      if ((y - 16) % 3 === 2) for (let x = y % 2; x < 32; x += 2) px(g, x, y, mix(top, deep, t + 0.125));
    }
    // 波浪紋：週期 8 的弧形浪花。
    for (const [y, c] of [[20, '#e8f8ff'], [27, mix(top, '#ffffff', 0.3)]]) {
      for (let x = 0; x < 32; x++) {
        const p = x % 8;
        const dy = p < 2 ? 1 : p < 6 ? 0 : 1;
        if (p === 7) continue;
        px(g, x, y + dy - (p === 3 || p === 4 ? 1 : 0), c);
      }
    }
    // 海草：從底部長出的兩株（位置固定，不跨格）。
    const weed = ramp('#3a9a6a');
    for (const [bx, h] of [[5, 9], [27, 7]]) {
      for (let k = 0; k < h; k++) {
        const x = bx + (Math.floor(k / 2) % 2);
        rect(g, x - 1, 42 - k, 3, 1, weed.o);
      }
      for (let k = 0; k < h; k++) {
        const x = bx + (Math.floor(k / 2) % 2);
        px(g, x, 42 - k, k > h - 3 ? weed.l : weed.b);
      }
    }
    // 小魚：身體、尾鰭、眼睛與腹部高光。
    const fish = ramp(['#f0a040', '#f06a6a', '#f0d040', '#e88ac0'][i % 4]);
    const fx = 10 + Math.floor(hash(i, 3) * 10);
    const fy = 30 + Math.floor(hash(i, 4) * 5);
    const left = hash(i, 5) < 0.5;
    const s = left ? 1 : -1;
    ellipse(g, fx, fy, 4, 2.6, fish.o);
    rect(g, fx + s * 4 - (left ? 0 : 2), fy - 3, 3, 6, fish.o);
    ellipse(g, fx, fy, 3, 1.6, fish.b);
    rect(g, fx + s * 4 - (left ? -1 : 1), fy - 2, 1, 4, fish.d);
    rect(g, fx - 2, fy - 1, 4, 1, fish.l);
    px(g, fx - s * 2, fy - 1, '#ffffff');
    px(g, fx - s * 2 + (left ? 0 : -1), fy, '#1a2a48');
    // 氣泡：小圓圈（不跨格）。
    for (let k = 0; k < 3; k++) {
      const bx = fx - s * 4 - s * k + (k === 2 ? s : 0);
      const by = fy - 4 - k * 3;
      if (k === 2) {
        rect(g, bx - 1, by - 1, 3, 3, '#e8f8ff');
        px(g, bx, by, sea.l);
      } else px(g, bx, by, '#e8f8ff');
    }
    rect(g, 0, 16, 32, 2, mix(top, '#ffffff', 0.4));
    rect(g, 0, 16, 32, 1, '#ffffff');
    rect(g, 0, 42, 32, 1, mix(deep, '#1a2a48', 0.3));
    baseboard(g, ramp('#e8dcc0'));
  },
  /**
   * 齒輪壁紙：深褐色紙面，咬合的黃銅齒輪紋樣、上方的銅管與鉚釘。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  gearPaper(g, i) {
    const paper = ramp('#7a5a44');
    const brass = ramp('#c8a058');
    const pale = { o: mix(paper.b, paper.d, 0.6), d: mix(paper.b, brass.d, 0.45), b: mix(paper.b, brass.b, 0.45), l: mix(paper.b, brass.l, 0.6), h: brass.h };
    wallTop(g, ramp('#4a3428'));
    rect(g, 0, 16, 32, 27, paper.b);
    for (let y = 16; y < 43; y++) for (let x = 0; x < 32; x++) {
      const v = wn(i, 0, x, y, 12);
      if (v < 0.06) px(g, x, y, mix(paper.b, paper.d, 0.4));
      else if (v > 0.97) px(g, x, y, mix(paper.b, paper.l, 0.4));
    }
    // 大齒輪落在格緣（兩側各畫一半），小齒輪在中間與它咬合。
    for (const x of [0, 32]) gearShape(g, x, 32, 7, 10, pale, 0, paper.d);
    gearShape(g, 16, 38, 4, 7, pale, 0.3, paper.d);
    gearShape(g, 16, 24, 3, 6, pale, 0.2, paper.d);
    // 銅管：橫跨上方，每 16 像素一個接頭與鉚釘。
    rect(g, 0, 18, 32, 4, brass.o);
    rect(g, 0, 19, 32, 1, brass.l);
    rect(g, 0, 20, 32, 1, brass.b);
    for (const x of [8, 24]) {
      rect(g, x - 2, 17, 5, 6, brass.o);
      rect(g, x - 1, 18, 3, 4, brass.b);
      px(g, x - 1, 18, brass.h);
      px(g, x + 1, 21, brass.d);
    }
    rect(g, 0, 16, 32, 1, paper.l);
    rect(g, 0, 17, 32, 1, mix(paper.b, paper.l, 0.5));
    rect(g, 0, 42, 32, 1, paper.d);
    baseboard(g, brass);
  },
  /**
   * 城堡石牆：兩排厚重的方正石塊（兩像素斜邊、深灰縫），偶有苔蘚與裂紋。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  castleWall(g, i) {
    const r = ramp('#6c7288');
    const moss = ramp('#5a8a4a');
    wallTop(g, ramp('#4a4e60'), true);
    rect(g, 0, 16, 32, 27, r.o);
    const rows = [[18, 12, [4, 20]], [30, 13, [12, 28]]];
    rows.forEach(
      /**
       * 畫一排城堡石塊。
       * @param {[number, number, number[]]} row 起點 y、高度與每塊起點 x。
       * @param {number} ri 排序號。
       */
      ([y, h, starts], ri) => {
        wrapRow(starts,
          /**
           * 畫一塊方正石塊（兩像素斜邊），完整落在格內者偶有裂紋或底部苔蘚。
           * @param {number} x 起點 x。
           * @param {number} w 寬（含灰縫）。
           * @param {number} k 序號。
           */
          (x, w, k) => {
            stoneBlock(g, x, y, w - 1, h - 1, r, hash(ri, k, 31), i, 0, 2);
            if (x >= 0 && x + w <= 32) {
              const v = hash(i, ri * 2 + k, 32);
              if (v < 0.35) {
                // 由上緣斜向延伸的細裂紋（旁邊一道亮邊）。
                let cx = x + 4 + Math.floor(hash(i, k, 33) * 6);
                for (let t = 0; t < h - 5; t++) {
                  px(g, cx, y + 2 + t, mix(r.o, r.d, 0.3));
                  px(g, cx + 1, y + 2 + t, mix(r.b, r.l, 0.5));
                  if (hash(i, t, 36) < 0.45) cx += 1;
                }
              } else if (v > 0.7 && ri === 1) {
                for (let a = 2; a < w - 3; a++) {
                  if (hash(i, a, 34) < 0.6) px(g, x + a, y + h - 3, moss.b);
                  if (hash(i, a, 35) < 0.35) px(g, x + a, y + h - 4, moss.l);
                }
              }
            }
          });
      });
    rect(g, 0, 16, 32, 2, r.l);
    rect(g, 0, 16, 32, 1, r.h);
    baseboard(g, ramp('#4a4e60'));
  },
  /**
   * 星星壁紙：深藍底、金色五角星與銀色小十字星交錯排列、細碎星點與淡色直紋。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  starPaper(g, i) {
    const r = ramp('#2c3670');
    const gold = R.gold;
    wallTop(g, ramp('#1e2450'));
    rect(g, 0, 16, 32, 27, r.b);
    for (const x of [0, 16]) rect(g, x, 16, 1, 27, mix(r.b, r.l, 0.25));
    for (let y = 16; y < 43; y++) for (let x = 0; x < 32; x++) {
      if (wn(i, 0, x, y, 14) < 0.015) px(g, x, y, mix(r.b, '#c8d8ff', 0.55));
    }
    pixelStar(g, 8, 24, gold);
    pixelStar(g, 24, 36, gold);
    sparkle(g, 24, 23, 2, mix(r.b, '#c8d8ff', 0.7), '#e8f0ff');
    sparkle(g, 8, 36, 2, mix(r.b, '#c8d8ff', 0.7), '#e8f0ff');
    rect(g, 0, 16, 32, 2, r.l);
    rect(g, 0, 16, 32, 1, r.h);
    rect(g, 0, 42, 32, 1, r.d);
    baseboard(g, gold);
  },
  /**
   * 砂岩牆：上緣雕刻的鋸齒飾帶，下方兩排帶波浪層理的砂岩石塊與風化小孔。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} i 格子 x（0～3）。
   */
  sandstoneWall(g, i) {
    const r = ramp('#d4a868');
    wallTop(g, ramp('#a87a48'), true);
    rect(g, 0, 16, 32, 27, r.d);
    // 雕刻飾帶：週期 8 的三角鋸齒。
    rect(g, 0, 18, 32, 6, mix(r.b, r.d, 0.5));
    for (let x = 0; x < 32; x++) {
      const p = x % 8;
      const hgt = p < 4 ? p + 1 : 8 - p;
      rect(g, x, 23 - hgt, 1, hgt, p < 4 ? r.l : r.b);
      px(g, x, 23 - hgt, p < 4 ? r.h : r.l);
    }
    rect(g, 0, 23, 32, 1, r.o);
    const rows = [[24, 9, [2, 22]], [33, 10, [12, 28]]];
    rows.forEach(
      /**
       * 畫一排砂岩石塊。
       * @param {[number, number, number[]]} row 起點 y、高度與每塊起點 x。
       * @param {number} ri 排序號。
       */
      ([y, h, starts], ri) => {
        wrapRow(starts,
          /**
           * 畫一塊砂岩：石塊本體加上隨世界座標起伏的層理線與風化小孔。
           * @param {number} x 起點 x。
           * @param {number} w 寬（含灰縫）。
           * @param {number} k 序號。
           */
          (x, w, k) => {
            const tone = hash(ri, k, 41);
            stoneBlock(g, x, y, w - 1, h - 1, r, tone, i, 0);
            const c = mix(r.b, tone < 0.5 ? r.d : r.l, Math.abs(tone - 0.5) * 0.8);
            for (let a = 1; a < w - 2; a++) {
              const wx = i * 32 + x + a;
              const wave = Math.round(Math.sin((wx / 32) * Math.PI * 2) * 1.2);
              for (let b = 2; b < h - 2; b++) {
                if ((b + wave + 30) % 3 === 0) px(g, x + a, y + b, mix(c, r.d, 0.3));
                if ((b + wave + 30) % 3 === 1 && wn(i, 0, x + a, y + b, 42) < 0.3) px(g, x + a, y + b, mix(c, r.l, 0.4));
              }
            }
            if (x >= 0 && x + w <= 32) {
              const hx = x + 3 + Math.floor(hash(i, k, 43) * (w - 7));
              const hy = y + 3 + Math.floor(hash(k, i, 44) * (h - 6));
              px(g, hx, hy, r.o);
              px(g, hx + 1, hy, r.d);
              px(g, hx, hy + 1, r.l);
            }
          });
      });
    rect(g, 0, 16, 32, 2, r.l);
    rect(g, 0, 16, 32, 1, r.h);
    baseboard(g, ramp('#a87a48'));
  },
};

/** 地毯（格式同 homeArt.js 的 HOME_ART）。 */
export const ART = {
  blueCarpet: {
    size: [2, 2], up: 0,
    /**
     * 藍地毯：橢圓形的編織地毯，由外而內深淺藍與奶油色的同心編繩圈，中央一朵雪花紋。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const cx = W / 2;
      const cy = H / 2;
      const rx = 29;
      const ry = 27;
      const rings = [ramp('#2a4a8a'), ramp('#4a72c0'), ramp('#efe4cc'), ramp('#4a72c0'), ramp('#7aa8e0'), ramp('#2a4a8a'), ramp('#efe4cc')];
      ellipse(g, cx, cy, rx + 1, ry + 1, rings[0].o);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        if (d >= 1) continue;
        const f = (1 - d) * rings.length;
        const ri = Math.min(rings.length - 1, Math.floor(f));
        const frac = f - ri;
        const r = rings[ri];
        // 編繩：沿圓周每段交替斜向，股的中央亮、兩側暗。
        const arc = (Math.atan2(ny, nx) * rx * (1 - (ri + 0.5) / rings.length)) / 3;
        const u = arc + (ri % 2 ? frac : -frac) * 0.9;
        const t = u - Math.floor(u);
        let c = t < 0.35 ? r.l : t < 0.75 ? r.b : r.d;
        if (ri === rings.length - 1) c = r.b;
        if (frac < 0.12 && ri > 0) c = mix(r.d, rings[ri - 1].d, 0.5);
        // 整體左上受光。
        if (nx + ny < -0.9 && c === r.b) c = mix(r.b, r.l, 0.5);
        px(g, x, y, c);
      }
      // 中央雪花紋。
      const s = R.blue;
      for (let k = -4; k <= 4; k++) {
        px(g, cx + k, cy, s.b);
        px(g, cx, cy + k, s.b);
        if (Math.abs(k) < 4) {
          px(g, cx + k, cy + k, s.l);
          px(g, cx + k, cy - k, s.l);
        }
      }
      px(g, cx, cy, '#ffffff');
      g.globalAlpha = 0.18;
      ellipse(g, cx - 8, cy - 9, 12, 7, '#ffffff');
      g.globalAlpha = 1;
    },
  },
  checkCarpet: {
    size: [2, 1], up: 0,
    /**
     * 格紋地毯：綠色基調的蘇格蘭格紋（深藍粗條、紅與黃細線，斜紋交織），深色包邊與兩端的流蘇。
     * @param {CanvasRenderingContext2D} g 繪圖環境。
     * @param {number} W 畫布寬。
     * @param {number} H 畫布高。
     */
    draw(g, W, H) {
      const green = ramp('#3e7a4e');
      const navy = ramp('#2c3a60');
      const red = R.red;
      const yellow = R.gold;
      /**
       * 格紋條帶的顏色（依位置在 16 像素週期內的位置）。
       * @param {number} p 位置。
       * @returns {string} 顏色。
       */
      const band = (p) => {
        const q = ((p % 16) + 16) % 16;
        if (q < 5) return green.b;
        if (q < 9) return navy.b;
        if (q === 11) return red.b;
        if (q === 14) return yellow.l;
        return mix(green.b, green.d, 0.3);
      };
      const x0 = 5;
      const y0 = 3;
      const w = W - 10;
      const h = H - 6;
      rect(g, x0 - 1, y0 - 1, w + 2, h + 2, navy.o);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = band(x - 2);
        const b = band(y - 2);
        let c = (x + y) % 2 === 0 ? a : b;
        if (a === navy.b && b === navy.b) c = navy.d;
        px(g, x0 + x, y0 + y, c);
      }
      // 包邊：深藍滾邊，上緣亮、下緣暗。
      rect(g, x0, y0, w, 2, navy.b);
      rect(g, x0, y0 + h - 2, w, 2, navy.d);
      rect(g, x0, y0, w, 1, navy.l);
      rect(g, x0, y0, 2, h, navy.b);
      rect(g, x0 + w - 2, y0, 2, h, navy.d);
      // 兩端流蘇。
      for (let y = y0 + 1; y < y0 + h - 1; y += 2) {
        rect(g, 1, y, 3, 1, R.cream.d);
        px(g, 1, y, R.cream.b);
        rect(g, W - 4, y, 3, 1, R.cream.d);
        px(g, W - 2, y, R.cream.b);
      }
    },
  },
};

/**
 * 細莖：一像素寬的莖與兩側外框。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} x x。
 * @param {number} y 頂端 y。
 * @param {number} h 長度。
 * @param {object} r 色階。
 */
function stem(g, x, y, h, r) {
  rect(g, x - 1, y - 1, 3, h + 1, r.o);
  rect(g, x, y, 1, h, r.b);
}

/**
 * 果樹（結構同 apple）：stage 0 小樹苗，之後是樹幹與樹冠，成熟時掛果。
 * @param {CanvasRenderingContext2D} g 繪圖環境。
 * @param {number} stage 階段 0～2。
 * @param {object} leaf 樹葉色階。
 * @param {number} seed 樹冠種子。
 * @returns {boolean} 是否已畫出樹冠（stage 0 回傳 false）。
 */
function fruitTree(g, stage, leaf, seed) {
  soil(g);
  if (stage === 0) {
    rect(g, 15, 26, 2, 8, R.darkWood.o);
    rect(g, 14, 26, 4, 9, R.darkWood.o);
    rect(g, 15, 26, 2, 8, R.darkWood.b);
    px(g, 15, 27, R.darkWood.l);
    foliage(g, 16, 24, 4, leaf, seed);
    return false;
  }
  rect(g, 13, 18, 6, 19, R.darkWood.o);
  rect(g, 14, 18, 4, 18, R.darkWood.b);
  rect(g, 14, 18, 1, 18, R.darkWood.l);
  rect(g, 17, 18, 1, 18, R.darkWood.d);
  rect(g, 12, 35, 8, 1, R.darkWood.o);
  px(g, 15, 28, R.darkWood.d);
  px(g, 16, 31, R.darkWood.d);
  foliage(g, 16, 14, stage === 1 ? 9 : 13, leaf, seed + 3);
  return true;
}

/**
 * 作物（代碼 → (g, stage) 繪製函式，32 × 40）。
 */
export const CROPS = {
  /**
   * 橘子樹：深綠樹冠；成長中開白色小花，成熟時掛滿帶葉的橘子。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  orange(g, stage) {
    const leaf = ramp('#3a8a40');
    if (!fruitTree(g, stage, leaf, 2)) return;
    if (stage === 1) {
      for (const [x, y] of [[12, 11], [19, 9], [20, 16], [13, 17], [16, 13]]) {
        px(g, x - 1, y, '#ffffff');
        px(g, x + 1, y, '#ffffff');
        px(g, x, y - 1, '#ffffff');
        px(g, x, y + 1, mix('#ffffff', leaf.l, 0.4));
        px(g, x, y, R.gold.l);
      }
      return;
    }
    const fruit = ramp('#f08a24');
    for (const [x, y] of [[9, 11], [21, 8], [23, 17], [12, 19], [17, 13], [15, 6], [27, 12]]) {
      orb(g, x, y, 2, 2, fruit);
      px(g, x, y - 3, leaf.o);
      px(g, x + 1, y - 3, leaf.l);
      px(g, x + 1, y + 1, fruit.d);
    }
  },
  /**
   * 葡萄藤：木製棚架；剛種下是小芽，成長中藤蔓爬上棚架，成熟時棚頂滿葉並垂下紫色葡萄串。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  grape(g, stage) {
    soil(g);
    const wood = R.lightWood;
    const leaf = ramp('#4e9a3c');
    const vine = ramp('#7a5a34');
    // 棚架：兩根立柱、兩道橫桿。
    for (const x of [5, 25]) {
      rect(g, x - 1, 6, 4, 31, wood.o);
      rect(g, x, 7, 2, 29, wood.b);
      rect(g, x, 7, 1, 29, wood.l);
    }
    for (const y of [8, 17]) {
      rect(g, 3, y - 1, 26, 4, wood.o);
      rect(g, 4, y, 24, 2, wood.b);
      rect(g, 4, y, 24, 1, wood.l);
      for (const x of [6, 26]) px(g, x, y + 1, wood.d);
    }
    if (stage === 0) {
      stem(g, 16, 29, 6, vine);
      foliage(g, 14, 28, 2.5, leaf, 1);
      foliage(g, 18, 27, 2.5, leaf, 5);
      return;
    }
    // 主藤：從根部彎曲向上，到達上橫桿後沿桿兩側延伸。
    const top = stage === 1 ? 17 : 9;
    for (let y = 36; y >= top; y--) {
      const x = 16 + Math.round(Math.sin(y * 0.45) * 1.5);
      rect(g, x - 1, y, 3, 1, vine.o);
    }
    for (let y = 36; y >= top; y--) {
      const x = 16 + Math.round(Math.sin(y * 0.45) * 1.5);
      px(g, x, y, y % 4 === 0 ? vine.l : vine.b);
    }
    // 捲鬚。
    for (const [x, y] of [[19, 24], [12, 21]]) {
      px(g, x, y, leaf.d);
      px(g, x + 1, y - 1, leaf.d);
      px(g, x, y - 2, leaf.d);
    }
    if (stage === 1) {
      for (const [x, y, s] of [[13, 29, 2.5], [19, 25, 3], [12, 20, 3], [21, 17, 3], [16, 15, 3.5]]) foliage(g, x, y, s, leaf, x + y);
      return;
    }
    for (const [x, y, s] of [[8, 10, 4.5], [15, 8, 5], [23, 9, 4.5], [18, 18, 3.5], [12, 25, 3]]) foliage(g, x, y, s, leaf, x * 3 + y);
    // 葡萄串：倒三角排列的小顆粒（先畫全部外框再上色）。
    const grape = ramp('#7a3a9e');
    for (const [cx, cy] of [[9, 15], [22, 15], [15, 20]]) {
      const pts = [];
      const rows = [4, 3, 3, 2, 1];
      for (let ry = 0; ry < rows.length; ry++) {
        for (let k = 0; k < rows[ry]; k++) pts.push([cx - rows[ry] + 1 + k * 2 + (ry % 2), cy + ry * 2]);
      }
      for (const [x, y] of pts) rect(g, x - 1, y - 1, 3, 3, grape.o);
      for (const [x, y] of pts) {
        rect(g, x, y, 2, 2, grape.b);
        px(g, x, y, grape.l);
        px(g, x + 1, y + 1, grape.d);
      }
      px(g, pts[0][0], pts[0][1], grape.h);
      px(g, cx, cy - 2, vine.b);
    }
  },
  /**
   * 藍草：藍綠色的葉叢（結構同 redHerb），成熟時抽出薰衣草般的藍色花穗。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  blueHerb(g, stage) {
    soil(g);
    const size = [4, 7, 9][stage];
    const dark = ramp('#2e8a7a');
    const light = ramp('#46a894');
    foliage(g, 12, 33 - size / 2, size * 0.55, dark, 2);
    foliage(g, 20, 33 - size / 2, size * 0.55, dark, 7);
    foliage(g, 16, 31 - size * 0.7, size * 0.6, light, 11);
    if (stage !== 2) return;
    const flower = ramp('#5a6ae8');
    for (const [x, y, h] of [[11, 15, 7], [16, 11, 8], [21, 14, 7]]) {
      stem(g, x, y + h - 1, 5, dark);
      for (let k = 0; k < h; k++) {
        const ox = k % 2 ? 1 : -1;
        rect(g, x + ox - 1, y + k - 1, 3, 3, flower.o);
      }
      for (let k = 0; k < h; k++) {
        const ox = k % 2 ? 1 : -1;
        px(g, x + ox, y + k, k < 2 ? flower.l : flower.b);
        px(g, x, y + k, k < h - 2 ? flower.d : flower.b);
      }
      px(g, x - 1, y, flower.h);
    }
  },
  /**
   * 解毒草：黃綠色寬葉叢（結構同 redHerb），成熟時頂端開出白色傘狀小花團。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  antidote(g, stage) {
    soil(g);
    const size = [4, 7, 9][stage];
    const dark = ramp('#5e9a32');
    const light = ramp('#94c43e');
    foliage(g, 11, 33 - size / 2, size * 0.6, dark, 4);
    foliage(g, 21, 33 - size / 2, size * 0.6, dark, 8);
    foliage(g, 16, 31 - size * 0.7, size * 0.62, light, 12);
    // 葉脈：中央葉團上的淺色細線。
    if (stage > 0) for (let k = 0; k < size; k++) px(g, 16 - Math.floor(k / 3), 31 - size * 0.7 - size * 0.4 + k, light.h);
    if (stage !== 2) return;
    const petal = R.white;
    for (const [cx, cy] of [[10, 20], [16, 16], [22, 19]]) {
      stem(g, cx, cy + 2, 4, dark);
      const pts = [[-2, 0], [0, -1], [2, 0], [-1, 1], [1, 1], [0, 0], [-3, 1], [3, 1]];
      for (const [dx, dy] of pts) rect(g, cx + dx - 1, cy + dy - 1, 3, 3, petal.o);
      for (const [dx, dy] of pts) px(g, cx + dx, cy + dy, dy < 1 ? petal.h : petal.b);
      px(g, cx, cy, R.gold.l);
      px(g, cx - 2, cy, R.gold.b);
      px(g, cx + 2, cy, R.gold.b);
    }
  },
  /**
   * 星光花：細莖與尖葉；成長中是紫色花苞，成熟時綻放發光的金白色星形花朵與閃光。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  starflower(g, stage) {
    soil(g);
    const leaf = ramp('#3e9a6a');
    if (stage === 0) {
      stem(g, 16, 29, 6, leaf);
      foliage(g, 14, 29, 2, leaf, 2);
      foliage(g, 18, 28, 2, leaf, 6);
      px(g, 16, 27, '#fff6c8');
      sparkle(g, 21, 24, 1, '#c8e0ff', '#ffffff');
      return;
    }
    const top = stage === 1 ? 18 : 15;
    stem(g, 16, top, 35 - top, leaf);
    // 尖葉：左右各兩片，往上翹。
    for (const [y, s] of [[31, -1], [28, 1], [24, -1]]) {
      for (let k = 1; k <= 5; k++) rect(g, 16 + s * k - 1, y - Math.floor(k / 2) - 1, 3, 3, leaf.o);
      for (let k = 1; k <= 5; k++) px(g, 16 + s * k, y - Math.floor(k / 2), k < 3 ? leaf.b : leaf.l);
    }
    if (stage === 1) {
      const bud = ramp('#6a5ad0');
      orb(g, 16, top - 1, 2.5, 3.5, bud);
      px(g, 16, top - 5, leaf.b);
      rect(g, 14, top + 1, 5, 1, leaf.b);
      sparkle(g, 21, top - 3, 1, '#c8e0ff', '#ffffff');
      return;
    }
    // 光暈。
    const cx = 16;
    const cy = 11;
    g.globalAlpha = 0.18;
    ellipse(g, cx, cy, 12, 11, '#fff2a0');
    g.globalAlpha = 0.28;
    ellipse(g, cx, cy, 8, 7.5, '#fff6c0');
    g.globalAlpha = 1;
    // 星形花瓣：以極座標判斷像素是否落在五角星內。
    const petal = ramp('#f6d860');
    /**
     * 五角星在某角度的半徑。
     * @param {number} a 角度（弧度）。
     * @param {number} out 外半徑。
     * @returns {number} 半徑。
     */
    const starR = (a, out) => {
      const t = ((a + Math.PI / 2) / ((Math.PI * 2) / 5)) % 1;
      const k = Math.abs(((t + 1) % 1) - 0.5) * 2;
      return out * 0.45 + out * 0.55 * k * k;
    };
    for (const [out, layer] of [[8, 'o'], [7, 'b']]) {
      for (let y = cy - 9; y <= cy + 9; y++) for (let x = cx - 9; x <= cx + 9; x++) {
        const dx = x + 0.5 - (cx + 0.5);
        const dy = y + 0.5 - (cy + 0.5);
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > starR(Math.atan2(dy, dx), out)) continue;
        let c = petal[layer];
        if (layer === 'b') {
          if (d < 2.2) c = '#fffbe8';
          else if (dx + dy < -2) c = petal.l;
          else if (dx + dy > 4) c = petal.d;
        }
        px(g, x, y, c);
      }
    }
    px(g, cx, cy, R.fire.b);
    px(g, cx - 3, cy - 3, '#ffffff');
    sparkle(g, 5, 7, 2, '#fff0a0', '#fffbe0');
    sparkle(g, 27, 15, 2, '#c8e0ff', '#ffffff');
    sparkle(g, 25, 3, 1, '#fff0a0', '#ffffff');
    sparkle(g, 7, 22, 1, '#c8e0ff', '#ffffff');
  },
  /**
   * 棉花：深綠的灌叢（結構同 redHerb）；成長中結出綠色棉鈴，成熟時棉鈴裂開露出蓬鬆的白棉。
   * @param {CanvasRenderingContext2D} g 繪圖環境。
   * @param {number} stage 階段 0～2。
   */
  cotton(g, stage) {
    soil(g);
    const size = [4, 7, 9][stage];
    const dark = ramp('#3a7a3a');
    const light = ramp('#5a9a48');
    const twig = ramp('#7a5034');
    if (stage > 0) for (const [x, y, h] of [[12, 22, 13], [20, 21, 14], [16, 18, 17]]) stem(g, x, y, h, twig);
    foliage(g, 12, 33 - size / 2, size * 0.55, dark, 5);
    foliage(g, 20, 33 - size / 2, size * 0.55, dark, 9);
    foliage(g, 16, 31 - size * 0.7, size * 0.55, light, 13);
    if (stage === 0) return;
    const spots = [[10, 20], [16, 16], [22, 19], [13, 26], [20, 26]];
    if (stage === 1) {
      const boll = ramp('#7aa84a');
      for (const [x, y] of spots.slice(0, 4)) {
        orb(g, x, y, 1.5, 2, boll);
        px(g, x, y + 2, twig.b);
      }
      return;
    }
    const fluff = R.white;
    for (const [x, y] of spots) {
      // 裂開的棉鈴（褐色萼片）上頂著三團白棉。
      rect(g, x - 2, y + 2, 5, 2, twig.o);
      rect(g, x - 1, y + 2, 3, 1, twig.b);
      for (const [dx, dy, s] of [[-1.5, 0.5, 2], [1.5, 0.5, 2], [0, -1, 2.2]]) ellipse(g, x + dx, y + dy, s + 1, s + 1, mix(fluff.o, fluff.d, 0.5));
      for (const [dx, dy, s] of [[-1.5, 0.5, 2], [1.5, 0.5, 2], [0, -1, 2.2]]) {
        ellipse(g, x + dx, y + dy, s, s, fluff.d);
        ellipse(g, x + dx - 0.4, y + dy - 0.4, s * 0.75, s * 0.75, fluff.b);
      }
      px(g, x - 1, y - 2, '#ffffff');
      px(g, x - 2, y, fluff.h);
    }
  },
};

