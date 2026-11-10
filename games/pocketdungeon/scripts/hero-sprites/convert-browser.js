// 角色動作圖轉換（在瀏覽器頁面中執行，由 scripts/make-hero-sprites.mjs 注入）：
// 把設計圖上一格一格的角色去白底、換算回原生像素格、減色成調色盤字元陣列。
// 可調參數（window 上）：BG_MIN／BG_SAT 白底判定的最低亮度與最大彩度、MAX_HOLE 被外框包住的白色小洞門檻（原圖像素）、
// EDGE_PASSES 清除外圍灰邊的次數。

/**
 * 讀取原圖某個區域的像素。
 * @param {HTMLImageElement} img 原圖。
 * @returns {{w:number,h:number,d:Uint8ClampedArray}} 像素。
 */
function grab(img, x, y, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, x, y, w, h, 0, 0, w, h);
  return { w, h, d: g.getImageData(0, 0, w, h).data };
}

/**
 * 從邊框往內填色，標出背景（接近白色、低彩度的淺色，包含淺灰的地面影子）。
 * @returns {Uint8Array} 1 為前景。
 */
function foreground(px) {
  const { w, h, d } = px;
  const bg = new Uint8Array(w * h);
  /** 是否為白底（亮且低彩度）。 */
  const isBg = (i) => {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn > (window.BG_MIN || 222) && mx - mn < (window.BG_SAT || 30);
  };
  const q = [];
  for (let x = 0; x < w; x++) { q.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { q.push(y * w, y * w + w - 1); }
  while (q.length) {
    const i = q.pop();
    if (bg[i] || !isBg(i)) continue;
    bg[i] = 1;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) q.push(i - 1); if (x < w - 1) q.push(i + 1);
    if (y > 0) q.push(i - w); if (y < h - 1) q.push(i + w);
  }
  // 被外框包住的白色小區塊（兩腳之間、弓與弓弦之間）也當背景；法師的白鬍子這類大塊白色保留。
  /** 是否為接近純白的像素。 */
  const isWhite = (i) => { const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]; return Math.min(r, g, b) > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 22; };
  const seen = new Uint8Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || seen[s] || !isWhite(s)) continue;
    const comp = [s]; seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % w;
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || bg[j] || !isWhite(j)) continue;
        if (Math.abs((j % w) - x) > 1) continue;
        seen[j] = 1; comp.push(j);
      }
    }
    if (comp.length < window.MAX_HOLE) for (const i of comp) bg[i] = 1;
  }
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) fg[i] = bg[i] ? 0 : 1;
  return fg;
}

/**
 * 找出最大的前景連通區塊的外框（排除旁邊格子的碎片）。
 */
function bbox(fg, w, h) {
  const seen = new Uint8Array(w * h);
  let best = null;
  for (let s = 0; s < w * h; s++) {
    if (!fg[s] || seen[s]) continue;
    const q = [s]; seen[s] = 1;
    const members = [];
    let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (q.length) {
      const i = q.pop(); n++; members.push(i);
      const x = i % w, y = (i / w) | 0;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const j of [i - 1, i + 1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || !fg[j]) continue;
        if (Math.abs((j % w) - x) > 1) continue;
        seen[j] = 1; q.push(j);
      }
    }
    if (!best || n > best.n) best = { n, x0, y0, x1, y1, members };
  }
  return best;
}

/**
 * 依像素格大小縮回原生解析度：每格取中央區域的中位數顏色，前景過半才算不透明。
 * @returns {{w:number,h:number,cells:(number[]|null)[]}} 原生像素。
 */
function downsample(px, fg, box, cell) {
  const W = Math.round((box.x1 - box.x0 + 1) / cell), H = Math.round((box.y1 - box.y0 + 1) / cell);
  const sx = (box.x1 - box.x0 + 1) / W, sy = (box.y1 - box.y0 + 1) / H;
  const cells = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ax = box.x0 + x * sx, ay = box.y0 + y * sy;
    let on = 0, tot = 0; const rs = [], gs = [], bs = [];
    for (let yy = Math.floor(ay); yy < Math.ceil(ay + sy); yy++) for (let xx = Math.floor(ax); xx < Math.ceil(ax + sx); xx++) {
      const i = yy * px.w + xx; tot++;
      if (!fg[i]) continue; on++;
      // 只取格子中央的像素算顏色，避開模糊的邊緣。
      const cx = (xx + 0.5 - ax) / sx, cy = (yy + 0.5 - ay) / sy;
      if (cx < 0.2 || cx > 0.8 || cy < 0.2 || cy > 0.8) continue;
      rs.push(px.d[i * 4]); gs.push(px.d[i * 4 + 1]); bs.push(px.d[i * 4 + 2]);
    }
    if (on * 2 < tot || !rs.length) { cells.push(null); continue; }
    /** 中位數。 */
    const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
    cells.push([med(rs), med(gs), med(bs)]);
  }
  return { w: W, h: H, cells };
}

/**
 * k-means 減色：回傳調色盤，暗色統一成外框色。
 */
function quantize(all, k) {
  const pts = all.filter(Boolean);
  let cent = [];
  // 以最遠點法挑初始中心。
  cent.push(pts[0]);
  while (cent.length < k) {
    let far = null, fd = -1;
    for (const p of pts) {
      const d = Math.min(...cent.map((c) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2));
      if (d > fd) { fd = d; far = p; }
    }
    cent.push(far);
  }
  for (let it = 0; it < 12; it++) {
    const acc = cent.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      cent.forEach((c, i) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i; } });
      acc[bi][0] += p[0]; acc[bi][1] += p[1]; acc[bi][2] += p[2]; acc[bi][3]++;
    }
    cent = acc.map((a, i) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : cent[i]));
  }
  return cent.map((c) => c.map(Math.round));
}

/** 找最接近的調色盤索引。 */
function nearest(pal, p) {
  let bi = 0, bd = Infinity;
  pal.forEach((c, i) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; bi = i; } });
  return bi;
}

const KEYS = 'oabcdefghijklmnpqrstuvwxyzABCDEFGHIJ';

/**
 * 轉換一組角色圖（共用調色盤）。
 * @param {HTMLImageElement} img 原圖。
 * @param {{x:number,y:number,w:number,h:number}[]} boxes 各張圖的裁切範圍。
 * @param {number} cell 像素格大小。
 * @param {number} k 顏色數。
 */
window.convertSet = function (img, boxes, cell, k) {
  const sprites = boxes.map((b) => {
    const px = grab(img, b.x, b.y, b.w, b.h);
    const fg = foreground(px);
    const box = bbox(fg, px.w, px.h);
    // 只保留最大的連通區塊，去掉旁邊格子裁進來的碎片。
    fg.fill(0);
    for (const i of box.members) fg[i] = 1;
    // 只保留最大區塊範圍內的前景。
    const ds = downsample(px, fg, box, cell);
    for (let pass = 0; pass < (window.EDGE_PASSES ?? 2); pass++) {
      const kill = [];
      for (let y = 0; y < ds.h; y++) for (let x = 0; x < ds.w; x++) {
        const c = ds.cells[y * ds.w + x];
        if (!c) continue;
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= ds.w || yy >= ds.h || !ds.cells[yy * ds.w + xx]; });
        const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2], sat = Math.max(...c) - Math.min(...c);
        if (edge && l > 95 && sat < 35) kill.push(y * ds.w + x);
      }
      for (const i of kill) ds.cells[i] = null;
    }
    // 記下這張圖在格子裡的位置（換算成原生像素），讓動畫各格依原圖的位置對齊。
    ds.ox = box.x0 / cell; ds.oy = box.y0 / cell; ds.cw = b.w / cell; ds.ch = b.h / cell;
    return ds;
  });
  const pal = quantize(sprites.flatMap((s) => s.cells), k);
  // 很暗的顏色合併成外框色。
  /** 亮度。 */
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const outline = pal.map((c) => lum(c) < 45);
  const order = pal.map((c, i) => i).sort((a, b) => (outline[b] - outline[a]) || lum(pal[a]) - lum(pal[b]));
  const keyOf = {}; const palette = {};
  let n = 1;
  for (const i of order) {
    if (outline[i]) { keyOf[i] = 'o'; continue; }
    keyOf[i] = KEYS[n++];
    palette[keyOf[i]] = '#' + pal[i].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  palette.o = '#1a1020';
  const rows = sprites.map((s) => {
    const r = [];
    for (let y = 0; y < s.h; y++) {
      let line = '';
      for (let x = 0; x < s.w; x++) { const c = s.cells[y * s.w + x]; line += c ? keyOf[nearest(pal, c)] : '.'; }
      r.push(line);
    }
    return r;
  });
  return { palette, rows, offs: sprites.map((s) => ({ ox: s.ox, oy: s.oy, cw: s.cw, ch: s.ch })) };
};

/**
 * 量出某一格中最大前景區塊的高度（原圖像素），用來換算像素格大小。
 * @param {HTMLImageElement} img 原圖。
 * @param {{x:number,y:number,w:number,h:number}} b 格子。
 * @returns {number} 高度。
 */
window.measureH = function (img, b) {
  const px = grab(img, b.x, b.y, b.w, b.h);
  const fg = foreground(px);
  const box = bbox(fg, px.w, px.h);
  return box.y1 - box.y0 + 1;
};
