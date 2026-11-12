// 地城外圍地形（程式繪製）：房間與走廊外一圈牆緣以外的實心區域，原本只是一片背景色，
// 改畫成一塊塊高低不一、往上堆疊的石塊（3/4 俯視：看得到頂面與正面），並依區域加上熔岩、海水、冰水、虛空，
// 草原畫成茂密的樹林、天空之城畫成雲海。只在建立地圖離屏畫布時畫一次（不影響行走與碰撞）。
// 石塊、液體紋理、樹與雲使用 design/dungeon/terrain-*.png 轉換的圖（terrainSprites.js，密度 2；石塊為灰階、依區域上色），
// 缺圖時改用程式繪製。

import { TERRAIN_SPRITES } from './terrainSprites.js';

/** 一格的像素數（世界像素）。 */
const T = 16;
/** 石塊的邊長（半格）。 */
const B = 8;
/** 細節線寬（離屏畫布 2 倍密度下的 1 個像素）。 */
const F = 0.5;

/**
 * 各區域的地形樣式：liquid 液體種類與佔比門檻（越大越多）、kind 特殊地形（forest 樹林、cloud 雲海）、
 * glow 液體在暗處的自發光強度（0 表示不發光）。沒有列出的區域只有石塊。
 */
const STYLE = {
  lava: { liquid: 'lava', thr: 0.46, glow: 0.9 },
  dragon: { liquid: 'lava', thr: 0.42, glow: 0.9 },
  demon: { liquid: 'lava', thr: 0.38, glow: 0.85 },
  sea: { liquid: 'water', thr: 0.56, glow: 0.35 },
  ice: { liquid: 'ice', thr: 0.4, glow: 0.25 },
  abyss: { liquid: 'void', thr: 0.48, glow: 0.7 },
  grass: { kind: 'forest' },
  sky: { kind: 'cloud' },
};

/**
 * 0～1 的固定雜湊（同一個位置每次都一樣）。
 * @param {number} i x。
 * @param {number} j y。
 * @returns {number} 0～1。
 */
function hash(i, j) {
  let h = (i * 374761393 + j * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h & 0xffff) / 0x10000;
}

/**
 * 平滑的數值雜訊（格點雜湊雙線性內插），用來做成片的高低與液體範圍。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} s 格點間距（越大越平滑）。
 * @param {number} seed 種子。
 * @returns {number} 0～1。
 */
function noise(x, y, s, seed) {
  const gx = x / s;
  const gy = y / s;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  /** 平滑插值曲線。 */
  const sm = (t) => t * t * (3 - 2 * t);
  const u = sm(gx - x0);
  const v = sm(gy - y0);
  const a = hash(x0 + seed, y0);
  const b = hash(x0 + 1 + seed, y0);
  const c = hash(x0 + seed, y0 + 1);
  const d = hash(x0 + 1 + seed, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * 把色碼調亮或調暗。
 * @param {string} hex `#rrggbb` 色碼。
 * @param {number} amt -1～1；正值往白色、負值往黑色。
 * @returns {string} 調整後的色碼。
 */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 混合兩個色碼。
 * @param {string} a `#rrggbb` 色碼。
 * @param {string} b `#rrggbb` 色碼。
 * @param {number} t 0～1；0 為 a、1 為 b。
 * @returns {string} 混合後的色碼。
 */
function mix(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = [16, 8, 0].map((sh) => Math.round(((na >> sh) & 255) * (1 - t) + ((nb >> sh) & 255) * t));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 每格到最近可行走格子的距離（8 方向步數；地板為 0，緊鄰地板的牆緣為 1）。
 * @param {number} w 地圖寬（格）。
 * @param {number} h 地圖高（格）。
 * @param {(i: number, j: number) => boolean} solid 是否為牆。
 * @returns {Uint8Array} 距離（最多 255）。
 */
export function wallDistance(w, h, solid) {
  const d = new Uint8Array(w * h).fill(255);
  const q = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (!solid(i, j)) { d[j * w + i] = 0; q.push(j * w + i); }
  for (let k = 0; k < q.length; k++) {
    const p = q[k];
    const i = p % w;
    const j = (p - i) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = i + dx;
        const y = j + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const n = y * w + x;
        if (d[n] > d[p] + 1) { d[n] = d[p] + 1; q.push(n); }
      }
    }
  }
  return d;
}

/** 液體紋理的週期（世界像素）：紋理左右上下無縫，依世界座標取樣，相鄰格自然相連。 */
const TEX = 64;

/**
 * 週期性的平滑雜訊（格點座標對 period 取餘數，整張紋理無縫）。
 * @param {number} x x。
 * @param {number} y y。
 * @param {number} s 格點間距。
 * @param {number} period 週期（格點數）。
 * @param {number} seed 種子。
 * @returns {number} 0～1。
 */
function pnoise(x, y, s, period, seed) {
  const gx = x / s;
  const gy = y / s;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  /** 平滑插值曲線。 */
  const sm = (t) => t * t * (3 - 2 * t);
  /** 週期格點的雜湊。 */
  const at = (a, b) => hash((((a % period) + period) % period) + seed, ((b % period) + period) % period);
  const u = sm(gx - x0);
  const v = sm(gy - y0);
  const a = at(x0, y0);
  const b = at(x0 + 1, y0);
  const c = at(x0, y0 + 1);
  const d = at(x0 + 1, y0 + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * 解析 #rrggbb。
 * @param {string} hex 色碼。
 * @returns {number[]} [r, g, b]。
 */
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * 把轉換的像素圖畫到新畫布；有 tint 時把灰階值（0～255）換成對應的顏色。
 * @param {{palette: Record<string, string>, w: number, h: number, rows: string[]}} sp 像素圖。
 * @param {((v: number) => string) | null} tint 灰階上色函式。
 * @returns {HTMLCanvasElement} 畫布（與圖同大小）。
 */
function spriteCanvas(sp, tint) {
  const c = document.createElement('canvas');
  c.width = sp.w;
  c.height = sp.h;
  const g = c.getContext('2d');
  const cols = Object.fromEntries(Object.entries(sp.palette).map(([k, v]) => [k, tint ? tint(rgb(v)[0]) : v]));
  sp.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || !cols[ch]) continue;
      g.fillStyle = cols[ch];
      g.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

/**
 * 由幾個顏色節點建立灰階上色函式（0 為第一個節點、255 為最後一個，中間線性內插）。
 * @param {string[]} stops 顏色節點（由暗到亮）。
 * @returns {(v: number) => string} 上色函式。
 */
function rampTint(stops) {
  return (v) => {
    const t = (v / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    return mix(stops[k], stops[k + 1], t - k);
  };
}

/**
 * 建立一張液體紋理（TEX × TEX 世界像素，依密度放大）：熔岩為大片亮橘的岩漿、深色岩殼與發光的裂縫；
 * 水面為深淺藍色與一道道波光；冰水較淡、多了冰裂紋；虛空是近黑的紫與發光的光點。
 * @param {'lava' | 'water' | 'ice' | 'void'} kind 種類。
 * @param {number} density 密度。
 * @returns {HTMLCanvasElement} 紋理。
 */
function liquidTexture(kind, density) {
  const N = TEX * density;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  const d = img.data;
  const P = (s) => TEX / s;
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const x = px / density;
      const y = py / density;
      const n = pnoise(x, y, 16, P(16), 3) * 0.65 + pnoise(x, y, 8, P(8), 9) * 0.25 + pnoise(x, y, 4, P(4), 17) * 0.1;
      let col;
      if (kind === 'lava') {
        if (n < 0.4) col = mix('#2a120c', '#4a1e12', Math.min(1, (0.4 - n) * 6) < 0.5 ? 1 : 0.4);
        else if (n < 0.44) col = '#ff9a2a';
        else if (n < 0.47) col = '#ffd166';
        else col = mix('#d9480f', '#ff8c1a', Math.min(1, (n - 0.47) * 3.2));
        if (n < 0.4 && n > 0.385) col = '#7a2a14';
      } else if (kind === 'void') {
        col = mix('#07030e', '#1c0c34', Math.min(1, n * 1.4));
        if (hash(px * 7 + 1, py * 13 + 5) < 0.004) col = '#c8a0ff';
      } else {
        const ice = kind === 'ice';
        col = mix(ice ? '#2c5878' : '#123f60', ice ? '#4a82a8' : '#1f6a96', n);
        const band = (n * 9 + y / 24) % 1;
        if (band < 0.07) col = ice ? '#bfe3f5' : '#5fb3d9';
        if (ice && Math.abs(((x + y * 0.6) % 23) - 11) < 0.3 && n > 0.5) col = '#e2f3fc';
      }
      const [r, gg, b] = rgb(col);
      const k = (py * N + px) * 4;
      d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * 從無縫紋理貼一格液體（依世界座標取樣）。
 * @param {CanvasRenderingContext2D} g 畫布（已縮放成世界像素）。
 * @param {HTMLCanvasElement} tex 紋理。
 * @param {number} x 左上 x。
 * @param {number} y 左上 y。
 * @param {number} density 紋理密度。
 */
function drawLiquid(g, tex, x, y, density) {
  g.drawImage(tex, (x % TEX) * density, (y % TEX) * density, T * density, T * density, x, y, T, T);
}

/**
 * 畫一個石塊（3/4 俯視）：頂面往上抬 h 像素，下方是正面；頂面有深色外框、左上亮邊、右下暗邊，正面較暗、有橫向石縫與底部陰影。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 地面上的左上 x。
 * @param {number} y 地面上的左上 y。
 * @param {number} h 高度（像素）。
 * @param {object} c 顏色（top 頂面、hi 亮邊、lo 暗邊、front 正面、frontLo 正面陰影、seam 石縫、outline 外框）。
 * @param {number} seed 變化用。
 * @param {number} [bw=B] 石塊邊長（半格的小石塊或一整格的大石塊）。
 */
function drawBlock(g, x, y, h, c, seed, bw = B) {
  const top = y - h;
  if (h > 0) {
    g.fillStyle = c.front;
    g.fillRect(x, top + bw, bw, h);
    g.fillStyle = c.frontLo;
    g.fillRect(x, y + bw - Math.min(3, h), bw, Math.min(3, h));
    // 堆疊的石縫：每 5 像素一道橫縫，上下層的直縫錯開。
    g.fillStyle = c.seam;
    for (let s = top + bw + 5, row = 0; s < y + bw - 0.5; s += 5, row++) {
      g.fillRect(x, s, bw, F);
      g.fillRect(x + (row % 2 ? bw * 0.35 : bw * 0.7) + (seed % 2), s - 5 + F, F, 5 - F);
    }
    g.fillStyle = c.hi;
    g.globalAlpha = 0.3;
    g.fillRect(x, top + bw, F, h);
    g.globalAlpha = 1;
    g.fillStyle = c.outline;
    g.fillRect(x + bw - F, top + bw, F, h);
  }
  g.fillStyle = c.outline;
  g.fillRect(x, top, bw, bw);
  g.fillStyle = c.top;
  g.fillRect(x + F, top + F, bw - 1, bw - 1);
  g.fillStyle = c.hi;
  g.fillRect(x + F, top + F, bw - 1, F);
  g.fillRect(x + F, top + F, F, bw - 1);
  g.fillStyle = c.lo;
  g.fillRect(x + bw - 1, top + 1, F, bw - 1.5);
  g.fillRect(x + 1, top + bw - 1, bw - 1.5, F);
  // 頂面的小缺口與裂紋。
  if (seed % 3 === 0) g.fillRect(x + 2 + (seed % 4), top + 3, 2, F);
  if (seed % 5 === 1) g.fillRect(x + 4, top + 2 + (seed % 3), F, 2);
}

/**
 * 畫一棵樹冠（草原外圍的樹林）：外框、深綠、中綠、亮綠疊成的圓形葉叢，或一棵層層的松樹。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} r 半徑。
 * @param {boolean} pine 是否為松樹。
 */
function drawTree(g, cx, cy, r, pine) {
  /** 畫一個實心圓。 */
  const disc = (x, y, rr, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); };
  if (pine) {
    for (let k = 0; k < 3; k++) {
      const w = r * (1.1 - k * 0.3);
      const by = cy + r * 0.7 - k * r * 0.55;
      for (const [col, d] of [['#10240c', 0.6], ['#245a24', 0], ['#3a7a32', -0.8]]) {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(cx - w - d * 0.4, by + d * 0.3);
        g.lineTo(cx + w + d * 0.4 - (d < 0 ? w * 0.6 : 0), by + d * 0.3);
        g.lineTo(cx - (d < 0 ? w * 0.3 : 0), by - r * 0.9 - d);
        g.closePath();
        g.fill();
      }
    }
    return;
  }
  disc(cx, cy, r + 0.6, '#132a0e');
  disc(cx, cy, r, '#2d5a20');
  disc(cx - r * 0.2, cy - r * 0.22, r * 0.72, '#3d7a2a');
  disc(cx - r * 0.35, cy - r * 0.4, r * 0.36, '#5a9a3a');
  g.fillStyle = '#1f4418';
  g.fillRect(cx + r * 0.2, cy + r * 0.3, 2, F);
  g.fillRect(cx - r * 0.5, cy + r * 0.45, 1.5, F);
}

/**
 * 畫一朵雲（天空之城外圍的雲海）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} cx 中心 x。
 * @param {number} cy 中心 y。
 * @param {number} r 大小。
 */
function drawCloud(g, cx, cy, r) {
  for (const [col, dy] of [['#b9cbe6', 1.2], ['#eef4fc', 0]]) {
    g.fillStyle = col;
    for (const [ox, oy, rr] of [[-r * 0.6, 0, 0.55], [0, -r * 0.25, 0.75], [r * 0.6, 0.1, 0.5]]) {
      g.beginPath();
      g.arc(cx + ox, cy + oy + dy, r * rr, 0, Math.PI * 2);
      g.fill();
    }
  }
}

/**
 * 畫外圍地形，並回傳要每幀疊加的自發光層與光源位置。
 * @param {CanvasRenderingContext2D} g 地圖離屏畫布（已依 density 縮放成世界像素）。
 * @param {{w: number, h: number, solid: (i: number, j: number) => boolean, theme: string, th: object, pal: object, density: number}} o
 *   地圖大小、是否為牆、區域色調名稱、色調、牆壁色盤、離屏畫布密度。
 * @returns {{emissive: HTMLCanvasElement | null, glowAlpha: number, glows: {x: number, y: number}[]}} 自發光層（液體在暗處仍然亮）、
 *   自發光層的不透明度與液體光源（世界像素）。
 */
export function drawTerrain(g, o) {
  const { w, h, solid, theme, th, pal, density } = o;
  const st = STYLE[theme] || {};
  const dist = wallDistance(w, h, solid);
  /** 是否為外圍地形（實心、離地板至少 2 格）。 */
  const deep = (i, j) => i >= 0 && j >= 0 && i < w && j < h && dist[j * w + i] >= 2 && solid(i, j);
  /** 是否為液體格（離地板至少 3 格，牆與液體之間至少隔一排石塊）。 */
  const liquid = (i, j) => !!st.liquid && deep(i, j) && dist[j * w + i] >= 3 && noise(i, j, 4, 11) * 0.8 + hash(i + 5, j + 3) * 0.2 < st.thr;
  /** 下方是牆面的格子（牆面往上加高半格，蓋住這一格的下半部）：只畫上半部的小石塊。 */
  const overFace = (i, j) => j + 2 < h && solid(i, j + 1) && !solid(i, j + 2);
  const glows = [];
  let emissive = null;
  let eg = null;
  if (st.liquid && st.glow) {
    emissive = document.createElement('canvas');
    emissive.width = w * T * density;
    emissive.height = h * T * density;
    eg = emissive.getContext('2d');
    eg.scale(density, density);
  }
  const ground = shade(th.bg, 0.08);
  const texKey = { lava: 'lava', water: 'water', ice: 'iceWater', void: 'void' }[st.liquid];
  const tex = !st.liquid ? null : TERRAIN_SPRITES[texKey] ? spriteCanvas(TERRAIN_SPRITES[texKey], null) : liquidTexture(st.liquid, density);
  // 設計圖紋理的密度（64 世界像素的紋理實際寬度 ÷ 64）。
  const texD = tex ? tex.width / TEX : density;
  // 第 1 層：地面與液體。
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!deep(i, j)) continue;
      const x = i * T;
      const y = j * T;
      if (st.kind === 'forest') { g.fillStyle = '#1a3212'; g.fillRect(x, y, T, T); continue; }
      if (st.kind === 'cloud') continue;
      if (!liquid(i, j)) { g.fillStyle = ground; g.fillRect(x, y, T, overFace(i, j) ? 8 : T); continue; }
      for (const gg of eg ? [g, eg] : [g]) drawLiquid(gg, tex, x, y, texD);
      // 岸邊：上方是石塊或牆時，靠岸處有一道陰影。
      if (!liquid(i, j - 1)) {
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x, y, T, 2);
      }
      if (hash(i + 71, j + 13) < 0.22) glows.push({ x: x + 8, y: y + 8 });
    }
  }
  /** 已轉成畫布的圖（樹、雲、上色後的石塊）。 */
  const canvases = new Map();
  /**
   * 畫一張地形圖：中心 x、底邊 y（世界像素），flip 時左右翻轉（同一張圖看起來不一樣），scale 為大小倍率。
   * @param {object} sp 像素圖（密度 2）。
   * @param {number} cx 中心 x。
   * @param {number} by 底邊 y。
   * @param {boolean} [flip=false] 是否依位置隨機翻轉。
   * @param {number} [scale=1] 大小倍率。
   */
  const art = (sp, cx, by, flip = false, scale = 1) => {
    if (!canvases.has(sp)) canvases.set(sp, spriteCanvas(sp, null));
    const c = canvases.get(sp);
    const dw = (c.width / 2) * scale;
    const dh = (c.height / 2) * scale;
    if (flip && hash(Math.round(cx), Math.round(by)) < 0.5) {
      g.save();
      g.translate(cx + dw / 2, by - dh);
      g.scale(-1, 1);
      g.drawImage(c, 0, 0, dw, dh);
      g.restore();
    } else g.drawImage(c, cx - dw / 2, by - dh, dw, dh);
  };
  // 第 2 層：由上往下畫（前面的蓋住後面的）。
  if (st.kind === 'forest' || st.kind === 'cloud') {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (!deep(i, j)) continue;
        const r = hash(i + 13, j + 29);
        const ox = (hash(i, j + 3) - 0.5) * 6;
        // 緊鄰牆緣的那一排往下挪，不蓋住牆緣。
        const oy = (deep(i, j - 1) ? (hash(i + 3, j) - 0.5) * 6 : 3);
        const pine = r < 0.3;
        if (st.kind === 'forest') {
          const sp = TERRAIN_SPRITES[`${pine ? 'pine' : 'tree'}@${hash(i + 61, j) < 0.5 ? 0 : 1}`];
          // 樹的圖底部對齊格子下緣附近，水平置中。
          if (sp) art(sp, i * T + 8 + ox, (j + 1) * T + oy - 2, true);
          else drawTree(g, i * T + 8 + ox, j * T + 8 + oy, 8 + r * 3, pine);
        } else if (r < 0.35 && dist[j * w + i] >= 3) {
          const sp = TERRAIN_SPRITES[`cloud@${hash(i + 61, j) < 0.5 ? 0 : 1}`];
          if (sp) art(sp, i * T + 8 + ox, j * T + 14 + oy, false, 0.7 + r * 0.5);
          else drawCloud(g, i * T + 8 + ox, j * T + 8 + oy, 6 + r * 8);
        }
      }
    }
    return { emissive, glowAlpha: st.glow || 0, glows };
  }
  const topBase = shade(mix(th.top, th.face, 0.15), -0.12);
  const frontBase = shade(mix(th.face, th.top, 0.15), -0.25);
  /**
   * 石塊的顏色（高的石塊頂面較亮）。
   * @param {number} lv 高度階（0～3）。
   * @param {number} a 變化用 x。
   * @param {number} b 變化用 y。
   * @returns {object} 顏色。
   */
  const colors = (lv, a, b) => {
    const top = shade(topBase, lv * 0.07 - 0.12 + (hash(a + 3, b) - 0.5) * 0.08);
    const front = shade(frontBase, (hash(a, b + 9) - 0.5) * 0.08);
    return { top, hi: shade(top, 0.25), lo: shade(top, -0.3), front, frontLo: shade(front, -0.45), seam: shade(front, -0.4), outline: pal.outline };
  };
  /**
   * 高度階：成片的平滑雜訊加一點隨機，分 4 階（0～3）。
   * @param {number} a x（小石塊座標）。
   * @param {number} b y。
   * @returns {number} 高度階。
   */
  const level = (a, b) => Math.floor(Math.min(0.999, Math.max(0, noise(a, b, 4, 3) * 1.5 + hash(a + 1, b + 7) * 0.3 - 0.4)) * 4);
  const HEIGHTS = [0, 6, 12, 18];
  // 設計圖石塊（灰階）依區域上色：外框 → 正面暗部 → 正面 → 頂面 → 頂面亮邊。
  const tint = rampTint([shade(th.line, -0.6), shade(th.face, -0.35), shade(mix(th.face, th.top, 0.35), -0.15), shade(th.top, -0.12), shade(th.top, 0.25)]);
  /**
   * 畫一個設計圖石塊（沒有圖時回傳 false，改用程式繪製）。
   * @param {string} key 圖的代碼（big、bigB、small 加 @高度階）。
   * @param {number} x 地面上的左上 x。
   * @param {number} y 地面上的左上 y。
   * @param {number} hgt 實際高度（像素；可能因靠近牆緣而壓低）。
   * @returns {boolean} 有畫出時為 true。
   */
  const sprBlock = (key, x, y, hgt) => {
    const lvKey = key.replace(/@\d$/, `@${Math.max(0, HEIGHTS.findIndex((v) => v >= hgt))}`);
    const sp = TERRAIN_SPRITES[lvKey];
    if (!sp) return false;
    if (!canvases.has(lvKey)) canvases.set(lvKey, spriteCanvas(sp, tint));
    const c = canvases.get(lvKey);
    const dw = c.width / 2;
    const dh = c.height / 2;
    // 圖的底邊對齊石塊在地面上的底邊（壓低時只露出上半部的高度差，底部被前面的石塊蓋住）。
    g.drawImage(c, x, y + dw - dh + (HEIGHTS[Math.max(0, HEIGHTS.findIndex((v) => v >= hgt))] - hgt), dw, dh);
    return true;
  };
  // 由上往下一列一列畫（前面的石塊蓋住後面的）；約一半的格子是一整格的大石塊，其他分成 4 個小石塊。
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!deep(i, j) || liquid(i, j)) continue;
      // 靠近牆緣（上方不是外圍地形）時壓低，石塊不會蓋住牆緣與南側的矮牆。
      const capTop = deep(i, j - 1) ? 99 : 1;
      const half = overFace(i, j);
      if (!half && hash(i + 401, j + 77) < 0.45) {
        const lv = level(i * 2, j * 2);
        const hb = Math.min(HEIGHTS[lv], capTop === 1 ? 0 : 99);
        if (!sprBlock(`${hash(i + 5, j + 91) < 0.5 ? 'big' : 'bigB'}@${lv}`, i * T, j * T, hb)) drawBlock(g, i * T, j * T, hb, colors(lv, i * 2, j * 2), Math.floor(hash(i + 23, j + 41) * 997), T);
        continue;
      }
      for (let sj = j * 2; sj < j * 2 + (half ? 1 : 2); sj++) {
        for (let si = i * 2; si < i * 2 + 2; si++) {
          const lv = level(si, sj);
          let hgt = HEIGHTS[lv];
          if (sj === j * 2) hgt = Math.min(hgt, capTop === 1 ? 0 : 99);
          else if (capTop === 1) hgt = Math.min(hgt, 6);
          if (!sprBlock(`small@${lv}`, si * B, sj * B, hgt)) drawBlock(g, si * B, sj * B, hgt, colors(lv, si, sj), Math.floor(hash(si + 23, sj + 41) * 997));
        }
      }
    }
  }
  return { emissive, glowAlpha: st.glow || 0, glows };
}
