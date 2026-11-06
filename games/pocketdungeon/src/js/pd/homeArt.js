// 家園美術（全部原創、以程式繪製）：家具、裝飾、地板與牆面、作物與家園材料圖示。
// 家園場景每格 32 像素（地城的 2 倍），以「部件」組合繪製：板材方塊、靠墊、圓柱、葉叢、玻璃與金屬框，
// 統一左上光源、每種顏色四階（外框、陰影、基底、亮面、高光）與材質紋理（木紋、石紋、布紋、玻璃反光、金屬高光）。
// 每件物件畫在自己的畫布上：寬 = 格數 × 32，高 = 格數 × 32 ＋ 向上突出的高度（立體感）；第一次使用時繪製並快取。

import { HT, makeCanvas, mix, ramp, R, rect, px, hash, ellipse, orb, shadow, woodGrain, stoneGrain, weave, block, cushion, post, glass, foliage, soil } from './homeDraw.js';
import { HOME_ITEMS } from './homeData.js';
import { ART as bedroomLiving } from './homeArt/bedroomLiving.js';
import { ART as kitchenWorkYard } from './homeArt/kitchenWorkYard.js';
import { ART as smallLights } from './homeArt/smallLights.js';
import { ART as wallGarden } from './homeArt/wallGarden.js';
import { ART as themeBoss } from './homeArt/themeBoss.js';
import { TILES as moreTiles, CROPS as moreCrops, ART as rugs } from './homeArt/tilesCrops.js';

export { HT, mix, ramp };

/** 已繪製的畫布快取（代碼與幀）。 */
const cache = new Map();

/**
 * 繪製一件物件：建立畫布並呼叫繪製函式。
 * @param {number} w 寬（格）。
 * @param {number} h 高（格）。
 * @param {number} up 向上突出的像素。
 * @param {(g: CanvasRenderingContext2D, W: number, H: number, frame: number) => void} draw 繪製函式（H 為整張畫布高度，底部為地面）。
 * @param {number} frame 動態幀。
 * @returns {HTMLCanvasElement} 畫布。
 */
function piece(w, h, up, draw, frame) {
  const c = makeCanvas(w * HT, h * HT + up);
  const g = c.getContext('2d');
  draw(g, c.width, c.height, frame);
  return c;
}

/**
 * 家具與裝飾的繪製方式：size 為佔用格數、up 為向上突出的像素、frames 為動態幀數、draw 為繪製函式。
 * 尚未完成美術的物件不在這裡（介面改用稀有度色塊的佔位圖）。
 */
export const HOME_ART = {
  // ── 家具 ──
  woodChair: {
    size: [1, 1], up: 14,
    /** 繪製「木椅」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 22);
      // 椅背：兩根柱子與三條橫木。
      post(g, 8, 4, 3, 26, R.wood);
      post(g, 21, 4, 3, 26, R.wood);
      for (const y of [6, 11, 16]) block(g, 8, y, 16, 1, 2, R.wood, null);
      block(g, 7, 3, 18, 2, 2, R.wood, 'wood', 2);
      // 座面與前腳。
      block(g, 6, 24, 20, 6, 4, R.wood, 'wood', 5);
      post(g, 7, 34, 3, 10, R.wood);
      post(g, 22, 34, 3, 10, R.wood);
    },
  },
  woodTable: {
    size: [1, 1], up: 6,
    /** 繪製「木桌」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 28);
      post(g, 5, 18, 3, 18, R.wood);
      post(g, 24, 18, 3, 18, R.wood);
      block(g, 2, 8, 28, 10, 4, R.wood, 'wood', 1);
      // 桌面前緣的裝飾線。
      rect(g, 3, 20, 26, 1, R.wood.l);
    },
  },
  woodBed: {
    size: [1, 2], up: 10,
    /** 繪製「木床」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      // 床頭板：上緣圓弧。
      block(g, 2, 4, 28, 2, 12, R.wood, 'wood', 4);
      rect(g, 6, 2, 20, 2, R.wood.o);
      rect(g, 7, 3, 18, 1, R.wood.l);
      // 床架與床墊。
      block(g, 2, 16, 28, 44, 6, R.wood, 'wood', 6);
      cushion(g, 4, 17, 24, 42, R.white);
      // 枕頭與被子（被子有摺邊）。
      cushion(g, 7, 19, 18, 8, R.cream);
      cushion(g, 4, 31, 24, 28, R.blue);
      rect(g, 4, 31, 24, 3, R.white.b);
      rect(g, 4, 34, 24, 1, R.blue.d);
      for (let i = 8; i < 26; i += 6) rect(g, i, 40, 2, 2, R.blue.l);
    },
  },
  bookcase: {
    size: [1, 1], up: 26,
    /** 繪製「書櫃」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 30);
      block(g, 2, 2, 28, 4, 50, R.darkWood, 'wood', 8);
      // 三層書架，每層一排顏色不同、高矮不一的書。
      const colors = ['#c0444a', '#4a72c0', '#4fa058', '#e0b040', '#8a5ac8', '#e8e0c8', '#d0743a'];
      for (let s = 0; s < 3; s++) {
        const y = 8 + s * 15;
        rect(g, 4, y, 24, 12, R.darkWood.o);
        let x = 5;
        let k = s * 3;
        while (x < 26) {
          const bw = 2 + Math.floor(hash(x, s, 3) * 2);
          const bh = 8 + Math.floor(hash(s, x, 5) * 4);
          const r = ramp(colors[k++ % colors.length]);
          rect(g, x, y + 12 - bh, bw, bh, r.b);
          rect(g, x, y + 12 - bh, 1, bh, r.l);
          rect(g, x, y + 12 - bh + 2, bw, 1, r.h);
          x += bw + (hash(x, k) < 0.2 ? 1 : 0);
        }
        rect(g, 4, y + 12, 24, 2, R.darkWood.l);
      }
    },
  },
  longSofa: {
    size: [2, 1], up: 12,
    /** 繪製「長沙發」。 */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 60);
      const r = R.red;
      // 椅背、扶手、座墊、腳。
      cushion(g, 6, 4, 52, 16, r);
      cushion(g, 2, 14, 10, 24, r);
      cushion(g, 52, 14, 10, 24, r);
      cushion(g, 12, 20, 20, 14, r);
      cushion(g, 32, 20, 20, 14, r);
      for (const x of [10, 30, 50]) px(g, x, 10, r.d);
      rect(g, 12, 33, 40, 4, r.d);
      for (const x of [5, 56]) post(g, x, 38, 3, 4, R.darkWood);
    },
  },
  fireplace: {
    size: [2, 1], up: 30, frames: 3,
    /** 繪製「壁爐」。 */
    draw(g, W, H, f) {
      shadow(g, 32, H - 2, 62);
      // 石砌爐身、木製爐台與煙囪。
      block(g, 14, 0, 36, 2, 14, R.stone, 'stone', 1);
      block(g, 2, 14, 60, 4, 42, R.stone, 'stone', 3);
      for (let y = 20; y < 56; y += 6) for (let x = 3 + ((y / 6) % 2) * 5; x < 61; x += 10) rect(g, x, y, 1, 5, R.stone.d);
      for (let y = 25; y < 56; y += 6) rect(g, 3, y, 58, 1, R.stone.d);
      block(g, 0, 12, 64, 3, 4, R.darkWood, 'wood', 2);
      // 爐口：拱形黑洞、木柴與火焰（3 幀）。
      rect(g, 14, 28, 36, 28, '#1a1020');
      rect(g, 16, 26, 32, 2, '#1a1020');
      rect(g, 20, 24, 24, 2, '#1a1020');
      g.globalAlpha = 0.35;
      ellipse(g, 32, 50, 18, 8, '#f08a2a');
      g.globalAlpha = 1;
      post(g, 20, 50, 24, 3, R.darkWood);
      const flames = [[24, 9], [30, 13], [36, 10], [41, 7]];
      flames.forEach(([x, h], k) => {
        const hh = h + ((f + k) % 3) - 1;
        ellipse(g, x, 49 - hh / 2, 3.5, hh / 2 + 1, '#e04a2a');
        ellipse(g, x, 49 - hh / 2 + 1, 2.5, hh / 2 - 1, '#f8a030');
        ellipse(g, x, 49 - hh / 4, 1.5, hh / 4, '#fff0a0');
      });
    },
  },
  workbench: {
    size: [2, 1], up: 10,
    /** 繪製「工作台」。 */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 60);
      for (const x of [5, 56]) post(g, x, 22, 4, 18, R.darkWood);
      rect(g, 6, 34, 52, 3, R.darkWood.d);
      block(g, 2, 10, 60, 10, 6, R.wood, 'wood', 9);
      // 桌上的工具：鐵鎚、鋸子、刨木屑與量尺。
      post(g, 12, 9, 2, 8, R.lightWood);
      block(g, 9, 6, 9, 2, 3, R.iron, null);
      rect(g, 30, 12, 14, 3, R.stone.l);
      for (let i = 30; i < 44; i += 2) px(g, i, 15, R.stone.d);
      rect(g, 44, 11, 4, 5, R.darkWood.b);
      for (const [x, y] of [[22, 14], [24, 16], [52, 13], [50, 15]]) px(g, x, y, R.lightWood.h);
      rect(g, 50, 17, 10, 2, R.gold.b);
    },
  },
  homeChest: {
    size: [1, 1], up: 6,
    /** 繪製「家用寶箱」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 28);
      block(g, 3, 16, 26, 4, 18, R.darkWood, 'wood', 3);
      // 圓頂蓋子與金屬包邊、鎖頭。
      rect(g, 3, 8, 26, 9, R.darkWood.o);
      rect(g, 4, 7, 24, 9, R.darkWood.l);
      rect(g, 4, 7, 24, 1, R.darkWood.h);
      rect(g, 4, 14, 24, 2, R.darkWood.d);
      for (const x of [7, 23]) {
        rect(g, x, 7, 3, 31, R.brass.o);
        rect(g, x + 1, 7, 1, 30, R.brass.l);
      }
      rect(g, 13, 16, 7, 8, R.brass.o);
      rect(g, 14, 17, 5, 6, R.gold.b);
      px(g, 14, 17, R.gold.h);
      rect(g, 16, 20, 1, 2, '#1a1020');
    },
  },
  piano: {
    size: [2, 1], up: 20,
    /** 繪製「鋼琴」。 */
    draw(g, W, H) {
      shadow(g, 32, H - 2, 60);
      block(g, 2, 2, 60, 4, 32, R.black, null);
      // 琴身亮面與琴蓋反光。
      rect(g, 4, 10, 2, 22, R.black.l);
      rect(g, 8, 6, 30, 1, R.black.h);
      // 譜架與樂譜。
      rect(g, 22, 8, 20, 10, R.black.o);
      rect(g, 24, 9, 16, 8, R.cream.l);
      for (let y = 11; y < 16; y += 2) rect(g, 25, y, 14, 1, R.cream.d);
      // 琴鍵：白鍵與黑鍵。
      block(g, 4, 34, 56, 6, 2, R.black, null);
      rect(g, 5, 35, 54, 5, R.white.l);
      for (let x = 5; x < 59; x += 4) rect(g, x + 3, 35, 1, 5, R.white.d);
      for (let x = 7; x < 57; x += 4) if (x % 28 !== 15) rect(g, x, 35, 2, 3, R.black.d);
      for (const x of [6, 55]) post(g, x, 42, 3, 8, R.black);
    },
  },
  // ── 小擺設與燈具 ──
  vase: {
    size: [1, 1], up: 8,
    /** 繪製「花瓶」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 4, 14);
      // 花束：三朵花與葉子。
      for (const [x, y, c] of [[11, 8, '#e05a7a'], [20, 6, '#f0c040'], [16, 12, '#f08ab0']]) {
        post(g, x + 1, y + 3, 1, 14, R.green);
        orb(g, x, y, 3, 3, ramp(c));
        px(g, x, y, '#fff6c0');
      }
      foliage(g, 12, 20, 3, R.leaf, 2);
      foliage(g, 21, 19, 3, R.leaf, 5);
      // 陶瓷花瓶：有釉面高光與花紋帶。
      orb(g, 16, 30, 7, 8, R.blue);
      rect(g, 12, 21, 8, 3, R.blue.o);
      rect(g, 13, 21, 6, 2, R.blue.b);
      rect(g, 10, 30, 12, 2, R.white.l);
      for (let x = 11; x < 21; x += 3) px(g, x, 30, R.blue.d);
    },
  },
  pottedPlant: {
    size: [1, 1], up: 14,
    /** 繪製「盆栽」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 3, 18);
      foliage(g, 16, 14, 10, R.leaf, 3);
      foliage(g, 10, 20, 6, R.leaf, 8);
      foliage(g, 22, 19, 6, R.leaf, 11);
      // 陶盆：上寬下窄、盆緣與泥土。
      for (let y = 0; y < 13; y++) {
        const w = 18 - Math.floor(y / 3);
        rect(g, 16 - w / 2 - 1, 30 + y, w + 2, 1, R.clay.o);
        rect(g, 16 - w / 2, 30 + y, w, 1, y < 2 ? R.clay.l : R.clay.b);
        px(g, 16 - w / 2, 30 + y, R.clay.l);
        px(g, 16 + w / 2 - 1, 30 + y, R.clay.d);
      }
      block(g, 5, 27, 22, 2, 3, R.clay, null);
      rect(g, 7, 28, 18, 1, '#4a3020');
    },
  },
  fishTank: {
    size: [1, 1], up: 10, frames: 4,
    /** 繪製「魚缸」。 */
    draw(g, W, H, f) {
      shadow(g, 16, H - 2, 30);
      // 木頭底座。
      block(g, 2, 32, 28, 3, 6, R.darkWood, 'wood', 1);
      // 水、砂石、水草、氣泡與兩條魚（4 幀游動）。
      rect(g, 3, 6, 26, 27, R.water.o);
      rect(g, 4, 9, 24, 23, R.water.b);
      rect(g, 4, 9, 24, 1, R.water.h);
      rect(g, 4, 10, 24, 3, R.water.l);
      rect(g, 4, 28, 24, 4, R.sand.b);
      for (let i = 4; i < 28; i += 2) px(g, i, 28 + (i % 3), R.sand.d);
      for (const [x, h] of [[7, 12], [10, 8], [24, 14]]) for (let y = 0; y < h; y++) px(g, x + (y % 4 < 2 ? 0 : 1), 28 - y, R.green.b);
      const fx = [8, 12, 16, 12][f];
      const ox = [18, 14, 10, 14][f];
      const dir = f < 2 ? 1 : -1;
      ellipse(g, fx, 16, 3, 2, '#f08a2a');
      px(g, fx - 4 * dir, 16, '#f08a2a');
      px(g, fx + dir, 15, '#1a1020');
      ellipse(g, ox, 22, 2.5, 1.5, '#f0e040');
      px(g, ox + 3 * dir, 22, '#f0e040');
      for (const [x, y] of [[20, 24 - f * 3], [21, 20 - ((f * 3) % 8)]]) if (y > 10) px(g, x, y, '#ffffff');
      glass(g, 4, 6, 24, 26, '#dff4ff');
    },
  },
  mantelClock: {
    size: [1, 1], up: 6,
    /** 繪製「座鐘」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 4, 20);
      // 拱頂木殼、圓形錶面、鐘擺窗與底座。
      block(g, 7, 6, 18, 3, 26, R.darkWood, 'wood', 6);
      rect(g, 10, 3, 12, 3, R.darkWood.o);
      rect(g, 11, 4, 10, 2, R.darkWood.l);
      orb(g, 16, 15, 6, 6, R.cream);
      ellipse(g, 16, 15, 7, 7, R.brass.d);
      ellipse(g, 16, 15, 6, 6, R.cream.l);
      for (const [x, y] of [[16, 10], [21, 15], [16, 20], [11, 15]]) px(g, x, y, R.black.b);
      rect(g, 16, 11, 1, 4, R.black.b);
      rect(g, 16, 15, 3, 1, R.black.b);
      rect(g, 12, 23, 8, 8, R.darkWood.o);
      rect(g, 13, 24, 6, 6, '#2a1a12');
      rect(g, 16, 24, 1, 4, R.brass.l);
      orb(g, 16, 28, 1.5, 1.5, R.gold);
      block(g, 5, 32, 22, 2, 3, R.darkWood, null);
    },
  },
  redCarpet: {
    size: [2, 2], up: 0,
    /** 繪製「紅地毯」。 */
    draw(g, W, H) {
      const r = R.red;
      rect(g, 2, 4, 60, 56, r.o);
      rect(g, 3, 5, 58, 54, r.b);
      weave(g, 3, 5, 58, 54, r);
      // 金色邊框與中央菱形花紋、流蘇。
      rect(g, 6, 8, 52, 1, R.gold.b);
      rect(g, 6, 55, 52, 1, R.gold.b);
      rect(g, 6, 8, 1, 48, R.gold.b);
      rect(g, 57, 8, 1, 48, R.gold.b);
      for (let k = 0; k < 12; k++) {
        rect(g, 32 - k, 20 + k, 2 * k + 1, 1, k % 3 === 0 ? R.gold.l : r.d);
        rect(g, 32 - k, 44 - k, 2 * k + 1, 1, k % 3 === 0 ? R.gold.l : r.d);
      }
      ellipse(g, 32, 32, 3, 3, R.gold.l);
      for (let x = 4; x < 60; x += 3) {
        rect(g, x, 1, 1, 3, R.cream.d);
        rect(g, x, 60, 1, 3, R.cream.d);
      }
    },
  },
  // ── 牆飾 ──
  landscapePainting: {
    size: [1, 1], up: 0,
    /** 繪製「風景畫」。 */
    draw(g) {
      // 金色畫框與山、湖、太陽的風景。
      rect(g, 3, 5, 26, 20, R.gold.o);
      rect(g, 4, 6, 24, 18, R.gold.b);
      rect(g, 4, 6, 24, 1, R.gold.h);
      rect(g, 4, 23, 24, 1, R.gold.d);
      rect(g, 6, 8, 20, 14, '#9ad0f0');
      rect(g, 6, 8, 20, 4, '#c8e8f8');
      ellipse(g, 21, 11, 2, 2, '#fff0a0');
      for (let i = 0; i < 20; i++) {
        const h1 = Math.max(0, 7 - Math.abs(i - 6));
        const h2 = Math.max(0, 5 - Math.abs(i - 14));
        rect(g, 6 + i, 18 - h1, 1, h1, '#6a8a9a');
        rect(g, 6 + i, 18 - h2, 1, h2, '#5a7a6a');
        if (h1 > 5) px(g, 6 + i, 18 - h1, '#ffffff');
      }
      rect(g, 6, 18, 20, 4, '#4a90c0');
      rect(g, 8, 19, 5, 1, '#9ad0f0');
      rect(g, 6, 21, 20, 1, '#4fa058');
    },
  },
  woodWindow: {
    size: [1, 1], up: 0,
    /** 繪製「木窗」。 */
    draw(g) {
      rect(g, 4, 3, 24, 24, R.wood.o);
      rect(g, 5, 4, 22, 22, R.wood.b);
      rect(g, 5, 4, 22, 1, R.wood.l);
      // 窗外藍天白雲、十字窗框與窗台。
      rect(g, 7, 6, 18, 18, '#8ac8f0');
      rect(g, 7, 6, 18, 6, '#b8e0f8');
      ellipse(g, 12, 10, 3, 1.5, '#ffffff');
      ellipse(g, 20, 15, 4, 1.5, '#ffffff');
      rect(g, 15, 6, 2, 18, R.wood.b);
      rect(g, 7, 14, 18, 2, R.wood.b);
      glass(g, 7, 6, 18, 18, '#e8f6ff');
      block(g, 3, 25, 26, 2, 2, R.wood, null);
    },
  },
  // ── 庭院造景 ──
  fountain: {
    size: [2, 2], up: 18, frames: 4,
    /** 繪製「噴水池」。 */
    draw(g, W, H, f) {
      shadow(g, 32, H - 4, 60);
      // 圓形石池（外圈石磚、池水與波紋）。
      ellipse(g, 32, 58, 30, 16, R.stone.o);
      ellipse(g, 32, 56, 29, 15, R.stone.l);
      ellipse(g, 32, 60, 29, 13, R.stone.b);
      for (let a = 0; a < 16; a++) {
        const x = 32 + Math.cos((a / 16) * Math.PI * 2) * 27;
        const y = 58 + Math.sin((a / 16) * Math.PI * 2) * 14;
        px(g, x, y, R.stone.d);
      }
      ellipse(g, 32, 55, 24, 10, R.water.d);
      ellipse(g, 32, 54, 23, 9, R.water.b);
      for (let k = 0; k < 3; k++) {
        const rr = 6 + ((f * 4 + k * 6) % 18);
        g.globalAlpha = 0.6;
        for (let a = 0; a < 20; a++) px(g, 32 + Math.cos((a / 20) * Math.PI * 2) * rr, 54 + Math.sin((a / 20) * Math.PI * 2) * rr * 0.4, R.water.h);
        g.globalAlpha = 1;
      }
      // 中央石柱、上層小盆與噴出的水花（4 幀）。
      post(g, 29, 22, 6, 32, R.stone);
      ellipse(g, 32, 22, 9, 4, R.stone.o);
      ellipse(g, 32, 21, 8, 3, R.stone.l);
      ellipse(g, 32, 21, 6, 2, R.water.b);
      for (let k = 0; k < 6; k++) {
        const t = ((f + k * 0.7) % 4) / 4;
        for (const s of [-1, 1]) {
          const x = 32 + s * (2 + t * 14);
          const y = 18 - Math.sin(t * Math.PI) * 14 + t * 30;
          if (y < 50) {
            px(g, x, y, R.water.h);
            px(g, x, y + 1, R.water.l);
          }
        }
      }
      rect(g, 31, 6, 2, 12, R.water.l);
      px(g, 31, 6, '#ffffff');
    },
  },
  streetLamp: {
    size: [1, 1], up: 40,
    /** 繪製「路燈」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 14);
      // 光暈、燈籠與黑鐵燈柱。
      g.globalAlpha = 0.18;
      ellipse(g, 16, 12, 14, 12, '#fff0a0');
      g.globalAlpha = 1;
      block(g, 11, 64, 10, 2, 5, R.iron, null);
      post(g, 15, 18, 3, 46, R.iron);
      rect(g, 9, 4, 14, 3, R.iron.o);
      rect(g, 11, 2, 10, 2, R.iron.o);
      rect(g, 10, 7, 12, 12, R.iron.o);
      rect(g, 11, 8, 10, 10, '#ffe890');
      rect(g, 12, 9, 3, 8, '#fff8d0');
      rect(g, 15, 7, 2, 12, R.iron.o);
      rect(g, 9, 18, 14, 2, R.iron.b);
    },
  },
  pharaohStatue: {
    size: [1, 1], up: 34,
    /** 繪製「法老王雕像」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 2, 28);
      const s = R.sand;
      // 台座。
      block(g, 3, 50, 26, 3, 12, s, 'stone', 3);
      for (let x = 5; x < 28; x += 4) rect(g, x, 56, 2, 1, s.d);
      // 坐姿雕像：身體、雙臂、頭巾（藍金條紋）、臉與胸前聖甲蟲。
      block(g, 8, 30, 16, 4, 16, s, 'stone', 7);
      rect(g, 6, 34, 4, 12, s.o);
      rect(g, 7, 34, 2, 11, s.b);
      rect(g, 22, 34, 4, 12, s.o);
      rect(g, 23, 34, 2, 11, s.d);
      rect(g, 6, 10, 20, 22, s.o);
      for (let y = 11; y < 31; y++) rect(g, 7, y, 18, 1, (y >> 1) % 2 ? R.blue.b : R.gold.b);
      rect(g, 7, 11, 18, 1, R.gold.h);
      rect(g, 11, 8, 10, 4, R.gold.o);
      rect(g, 12, 8, 8, 3, R.gold.l);
      rect(g, 11, 13, 10, 12, s.o);
      rect(g, 12, 13, 8, 11, s.l);
      rect(g, 12, 13, 8, 1, s.h);
      rect(g, 13, 16, 2, 1, '#1a1020');
      rect(g, 17, 16, 2, 1, '#1a1020');
      rect(g, 15, 18, 2, 3, s.b);
      rect(g, 14, 22, 4, 1, s.d);
      rect(g, 15, 24, 2, 5, s.d);
      orb(g, 16, 38, 2.5, 2, R.blue);
    },
  },
  dragonEgg: {
    size: [1, 1], up: 6,
    /** 繪製「龍蛋擺飾」。 */
    draw(g, W, H) {
      shadow(g, 16, H - 4, 18);
      // 金色托架。
      ellipse(g, 16, 32, 9, 3, R.gold.o);
      ellipse(g, 16, 31, 8, 2, R.gold.l);
      for (const x of [9, 22]) post(g, x, 32, 2, 4, R.gold);
      // 龍蛋：紅色鱗片紋、左上高光與一道裂縫透出的光。
      orb(g, 16, 18, 9, 12, R.dragon);
      for (let y = 10; y < 28; y += 4) for (let x = 9 + ((y / 4) % 2) * 2; x < 24; x += 4) {
        if ((x - 16) ** 2 / 64 + (y - 18) ** 2 / 121 < 0.85) {
          px(g, x, y, R.dragon.d);
          px(g, x + 1, y + 1, R.dragon.d);
        }
      }
      for (const [x, y] of [[18, 12], [19, 14], [18, 16], [20, 18], [19, 20]]) {
        px(g, x, y, '#fff0a0');
        px(g, x + 1, y, '#f8a030');
      }
      ellipse(g, 12, 12, 2, 3, R.dragon.h);
    },
  },
};

/**
 * 地板與牆面樣式的繪製（每格一張 32 × 32 的圖；牆面為 32 × 48，含牆頂）。
 */
export const TILE_ART = {
  /** 繪製「木地板」樣式的一格。 */
  woodFloor(g, i, j) {
    // 木地板：水平木條（每條 8 像素高），條與條之間錯開的接縫、木紋。
    const r = R.wood;
    rect(g, 0, 0, 32, 32, r.b);
    for (let k = 0; k < 4; k++) {
      const y = k * 8;
      rect(g, 0, y, 32, 1, r.d);
      rect(g, 0, y + 1, 32, 1, r.l);
      woodGrain(g, 0, y + 2, 32, 6, r, i * 7 + j * 3 + k);
      const seam = (hash(i, j * 4 + k, 3) * 24 + k * 13) % 32;
      rect(g, seam, y, 1, 8, r.d);
      px(g, seam + 1, y + 1, r.h);
    }
  },
  /** 繪製「石磚」樣式的一格。 */
  stoneTile(g, i, j) {
    // 石磚：每格 4 塊方磚，磚縫、斑點與左上亮邊。
    const r = R.stone;
    rect(g, 0, 0, 32, 32, r.d);
    for (const [x, y] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
      rect(g, x + 1, y + 1, 14, 14, r.b);
      rect(g, x + 1, y + 1, 14, 1, r.l);
      rect(g, x + 1, y + 1, 1, 14, r.l);
      stoneGrain(g, x + 2, y + 2, 13, 13, r, i * 5 + j + x + y);
    }
  },
  /** 繪製「木牆」樣式的一格。 */
  woodWall(g, i) {
    // 木牆：上方 16 像素為牆頂（深色）、下方 32 像素為直向木板牆面與踢腳板。
    const r = R.wood;
    rect(g, 0, 0, 32, 16, r.o);
    rect(g, 0, 12, 32, 4, r.d);
    rect(g, 0, 16, 32, 32, r.b);
    for (let x = 0; x < 32; x += 8) {
      rect(g, x, 16, 1, 28, r.d);
      rect(g, x + 1, 16, 1, 28, r.l);
      for (let y = 18; y < 44; y += 3) if (hash(x, y, i) < 0.5) px(g, x + 3 + (y % 3), y, mix(r.b, r.d, 0.45));
    }
    rect(g, 0, 16, 32, 2, r.l);
    rect(g, 0, 43, 32, 5, R.darkWood.b);
    rect(g, 0, 43, 32, 1, R.darkWood.l);
  },
};

/**
 * 作物的繪製（每個階段 32 × 40：田地一格加上向上突出 8 像素）。
 * stage 0 剛種下、1 成長中、2 成熟。
 */
export const CROP_ART = {
  /** 繪製「蘋果樹」的生長階段。 */
  apple(g, stage) {
    soil(g);
    if (stage === 0) {
      post(g, 15, 26, 2, 8, R.darkWood);
      foliage(g, 16, 24, 4, R.leaf, 1);
      return;
    }
    post(g, 14, 18, 4, 18, R.darkWood);
    foliage(g, 16, 14, stage === 1 ? 9 : 13, R.leaf, 4);
    if (stage === 2) for (const [x, y] of [[10, 12], [20, 9], [22, 18], [13, 19], [17, 14]]) {
      orb(g, x, y, 2, 2, R.red);
    }
  },
  /** 繪製「紅草」的生長階段。 */
  redHerb(g, stage) {
    soil(g);
    // 一叢鋸齒葉（由外而內疊三層），成熟時頂端開出紅色花穗。
    const size = [4, 7, 9][stage];
    foliage(g, 12, 33 - size / 2, size * 0.55, R.green, 3);
    foliage(g, 20, 33 - size / 2, size * 0.55, R.green, 6);
    foliage(g, 16, 31 - size * 0.7, size * 0.6, R.leaf, 9);
    if (stage === 2) for (const [x, y] of [[11, 21], [16, 17], [21, 20], [14, 23], [19, 24]]) {
      ellipse(g, x, y, 1.5, 2.5, R.red.o);
      ellipse(g, x, y, 1, 2, R.red.b);
      px(g, x, y - 1, R.red.h);
    }
  },
};

// 其餘物件、地板牆面、地毯與作物的美術分組放在 homeArt/ 下，合併進同一份表。
Object.assign(HOME_ART, bedroomLiving, kitchenWorkYard, smallLights, wallGarden, themeBoss, rugs);
Object.assign(TILE_ART, moreTiles);
Object.assign(CROP_ART, moreCrops);

/**
 * 家園材料圖示（32 × 32）。
 */
export const MAT_ART = {
  /** 繪製「木材」圖示。 */
  wood(g) {
    // 三根綁在一起的圓木：年輪切面與樹皮。
    for (const [x, y] of [[9, 20], [21, 20], [15, 11]]) {
      rect(g, x - 8, y - 5, 16, 10, R.darkWood.o);
      rect(g, x - 7, y - 4, 13, 8, R.darkWood.b);
      rect(g, x - 7, y - 4, 13, 1, R.darkWood.l);
      orb(g, x + 5, y, 4, 5, R.lightWood);
      ellipse(g, x + 5, y, 2, 3, R.lightWood.d);
      px(g, x + 5, y, R.lightWood.l);
    }
    rect(g, 11, 13, 2, 14, R.red.b);
  },
  /** 繪製「石塊」圖示。 */
  stone(g) {
    orb(g, 13, 19, 10, 8, R.stone);
    orb(g, 22, 22, 6, 5, R.stone);
    stoneGrain(g, 6, 14, 20, 12, R.stone, 4);
  },
  /** 繪製「黏土」圖示。 */
  clay(g) {
    orb(g, 16, 19, 11, 8, R.clay);
    rect(g, 9, 17, 6, 1, R.clay.d);
    rect(g, 18, 21, 5, 1, R.clay.d);
  },
  /** 繪製「冰晶」圖示。 */
  ice(g) {
    for (const [x, h, w] of [[11, 18, 5], [18, 24, 6], [24, 14, 4]]) {
      const r = ramp('#8ad0f0');
      for (let y = 0; y < h; y++) {
        const ww = y < 4 ? Math.ceil((w * (y + 1)) / 4) : w;
        rect(g, x - ww / 2 - 1, 28 - h + y, ww + 2, 1, r.o);
        rect(g, x - ww / 2, 28 - h + y, ww, 1, y < 4 ? r.h : r.b);
        px(g, x - ww / 2, 28 - h + y, r.l);
      }
    }
  },
  /** 繪製「羽毛」圖示。 */
  feather(g) {
    const r = ramp('#f0e8d0');
    for (let k = 0; k < 20; k++) {
      const x = 8 + k;
      const y = 26 - k;
      const w = k < 3 || k > 17 ? 2 : 5;
      rect(g, x - w - 1, y - 1, w * 2 + 2, 3, r.o);
    }
    for (let k = 0; k < 20; k++) {
      const x = 8 + k;
      const y = 26 - k;
      const w = k < 3 || k > 17 ? 2 : 5;
      rect(g, x - w, y, w, 1, r.l);
      rect(g, x, y, w, 1, r.b);
      px(g, x, y, r.d);
    }
  },
  /** 繪製「骨片」圖示。 */
  bone(g) {
    const r = ramp('#e0dcc8');
    for (let k = 0; k < 14; k++) rect(g, 9 + k, 22 - k, 3, 3, r.o);
    for (const [x, y] of [[8, 23], [11, 26], [22, 9], [25, 12]]) ellipse(g, x, y, 3.5, 3.5, r.o);
    for (let k = 0; k < 14; k++) rect(g, 10 + k, 22 - k, 2, 2, r.b);
    for (const [x, y] of [[8, 23], [11, 26], [22, 9], [25, 12]]) {
      ellipse(g, x, y, 2.5, 2.5, r.b);
      px(g, x - 1, y - 1, r.h);
    }
  },
  /** 繪製「細沙」圖示。 */
  sand(g) {
    const r = ramp('#e8c878');
    ellipse(g, 16, 25, 13, 6, r.o);
    ellipse(g, 16, 24, 12, 5, r.b);
    ellipse(g, 14, 20, 8, 6, r.o);
    ellipse(g, 14, 20, 7, 5, r.l);
    for (let k = 0; k < 18; k++) px(g, 6 + hash(k, 1) * 20, 18 + hash(k, 2) * 9, k % 2 ? r.d : r.h);
  },
  /** 繪製「貝殼」圖示。 */
  shell(g) {
    const r = ramp('#f0a8b8');
    ellipse(g, 16, 17, 12, 10, r.o);
    ellipse(g, 16, 17, 11, 9, r.b);
    for (let k = -4; k <= 4; k++) for (let t = 0; t < 9; t++) px(g, 16 + k * t * 0.27, 25 - t, k % 2 ? r.d : r.l);
    rect(g, 12, 25, 8, 4, r.o);
    rect(g, 13, 25, 6, 3, r.d);
    px(g, 11, 11, r.h);
  },
  /** 繪製「齒輪」圖示。 */
  gear(g) {
    const r = ramp('#c8a050');
    for (let a = 0; a < 8; a++) {
      const x = 16 + Math.cos((a / 8) * Math.PI * 2) * 11;
      const y = 16 + Math.sin((a / 8) * Math.PI * 2) * 11;
      rect(g, x - 3, y - 3, 6, 6, r.o);
      rect(g, x - 2, y - 2, 4, 4, r.b);
    }
    orb(g, 16, 16, 10, 10, r);
    ellipse(g, 16, 16, 4, 4, r.o);
    ellipse(g, 16, 16, 3, 3, '#3a2a20');
  },
  /** 繪製「龍鱗」圖示。 */
  scale(g) {
    for (const [x, y] of [[11, 13], [21, 13], [16, 21]]) {
      orb(g, x, y, 6, 7, R.dragon);
      rect(g, x - 1, y - 4, 2, 7, R.dragon.d);
    }
  },
  /** 繪製「暗晶」圖示。 */
  dark(g) {
    const r = ramp('#7a4ac8');
    for (const [x, h, w] of [[12, 16, 6], [19, 22, 7], [25, 12, 4]]) {
      for (let y = 0; y < h; y++) {
        const ww = y < 5 ? Math.ceil((w * (y + 1)) / 5) : w;
        rect(g, x - ww / 2 - 1, 28 - h + y, ww + 2, 1, r.o);
        rect(g, x - ww / 2, 28 - h + y, ww, 1, y < 5 ? r.l : r.b);
        px(g, x + ww / 2 - 1, 28 - h + y, r.d);
      }
    }
    g.globalAlpha = 0.3;
    ellipse(g, 18, 18, 13, 12, '#c89aff');
    g.globalAlpha = 1;
  },
  /** 繪製「布料」圖示。 */
  cloth(g) {
    // 一捲布：側面的捲軸圓與展開的布面。
    block(g, 4, 10, 22, 4, 14, R.purple, 'cloth', 2);
    orb(g, 26, 17, 4, 8, R.purple);
    ellipse(g, 26, 17, 1.5, 3, R.purple.d);
    rect(g, 4, 15, 22, 1, R.gold.l);
  },
};

/**
 * 介面用的小圖示（32 × 32）：種子袋、肥料與家具製作書。
 */
export const ICON_ART = {
  /** 繪製「種子袋」圖示。 */
  seed(g) {
    const r = ramp('#b08a52');
    orb(g, 16, 21, 10, 9, r);
    weave(g, 9, 16, 14, 10, r);
    rect(g, 11, 11, 10, 3, r.o);
    rect(g, 12, 12, 8, 1, R.red.b);
    post(g, 15, 4, 2, 8, R.green);
    foliage(g, 13, 6, 2.5, R.leaf, 1);
    foliage(g, 20, 5, 2.5, R.leaf, 4);
  },
  /** 繪製「肥料」圖示。 */
  fertilizer(g) {
    const r = ramp('#5a8a3a');
    block(g, 7, 6, 18, 3, 22, r, 'cloth', 3);
    rect(g, 10, 14, 12, 8, R.cream.l);
    foliage(g, 16, 17, 3, R.leaf, 2);
    rect(g, 7, 6, 18, 2, r.h);
  },
  /** 繪製「家具製作書」圖示。 */
  blueprint(g) {
    const r = ramp('#2a5a9a');
    rect(g, 4, 7, 24, 19, r.o);
    rect(g, 5, 8, 22, 17, r.b);
    for (let x = 7; x < 26; x += 4) rect(g, x, 8, 1, 17, r.l);
    for (let y = 10; y < 25; y += 4) rect(g, 5, y, 22, 1, r.l);
    rect(g, 9, 12, 12, 1, '#ffffff');
    rect(g, 9, 12, 1, 9, '#ffffff');
    rect(g, 20, 12, 1, 9, '#ffffff');
    rect(g, 9, 20, 12, 1, '#ffffff');
    orb(g, 27, 8, 3, 3, R.cream);
    orb(g, 5, 25, 3, 3, R.cream);
  },
};

/**
 * 取得家具或裝飾的圖（有快取）。
 * @param {string} key 代碼（HOME_ART 中沒有的回傳 null）。
 * @param {number} [frame=0] 動態幀。
 * @returns {HTMLCanvasElement | null} 畫布。
 */
export function homeArt(key, frame = 0) {
  const a = HOME_ART[key];
  if (!a) return null;
  const f = frame % (a.frames || 1);
  const id = `h-${key}-${f}`;
  if (!cache.has(id)) cache.set(id, piece(a.size[0], a.size[1], a.up, a.draw, f));
  return cache.get(id);
}

/**
 * 動態物件的幀數。
 * @param {string} key 代碼。
 * @returns {number} 幀數（靜態物件為 1）。
 */
export function homeFrames(key) {
  return (HOME_ART[key] && HOME_ART[key].frames) || 1;
}

/**
 * 取得地板或牆面樣式的一格圖（依位置變化紋理）。
 * @param {string} key 樣式代碼（TILE_ART 中沒有的回傳 null）。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @returns {HTMLCanvasElement | null} 畫布（地板 32 × 32、牆面 32 × 48）。
 */
export function tileArt(key, i = 0, j = 0) {
  const draw = TILE_ART[key];
  if (!draw) return null;
  const id = `t-${key}-${i % 4}-${j % 4}`;
  if (!cache.has(id)) {
    const wall = HOME_ITEMS[key].place === 'wallTile';
    const c = makeCanvas(HT, wall ? HT + 16 : HT);
    draw(c.getContext('2d'), i % 4, j % 4);
    cache.set(id, c);
  }
  return cache.get(id);
}

/**
 * 取得作物某個階段的圖。
 * @param {string} key 作物代碼（CROP_ART 中沒有的回傳 null）。
 * @param {number} stage 階段 0～2。
 * @returns {HTMLCanvasElement | null} 畫布（32 × 40）。
 */
export function cropArt(key, stage) {
  const draw = CROP_ART[key];
  if (!draw) return null;
  const id = `c-${key}-${stage}`;
  if (!cache.has(id)) {
    const c = makeCanvas(HT, HT + 8);
    draw(c.getContext('2d'), stage);
    cache.set(id, c);
  }
  return cache.get(id);
}

/**
 * 取得 32 × 32 的圖示（家園材料，或 seed、fertilizer、blueprint）。
 * @param {string} key 材料代碼或圖示代碼。
 * @returns {HTMLCanvasElement | null} 畫布。
 */
export function iconArt(key) {
  const draw = MAT_ART[key] || ICON_ART[key];
  if (!draw) return null;
  const id = `i-${key}`;
  if (!cache.has(id)) {
    const c = makeCanvas(HT, HT);
    draw(c.getContext('2d'));
    cache.set(id, c);
  }
  return cache.get(id);
}

/**
 * 把畫布放大成 data URL（介面中的 <img> 用，整數倍放大、不模糊）。
 * @param {HTMLCanvasElement} src 畫布。
 * @param {number} [scale=2] 倍率。
 * @returns {string} data URL。
 */
export function toDataUrl(src, scale = 2) {
  const c = makeCanvas(src.width * scale, src.height * scale);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}
