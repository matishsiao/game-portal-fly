// 把 design/heroes/ 的角色攻擊動作設計圖轉成遊戲用的 src/js/pd/heroSprites.js；
// 加 --bosses 時改把 design/bosses/ 的 Boss 動作圖轉成 src/js/pd/bossSprites.js；
// 加 --monsters 時改把 design/monsters/ 的一般怪物動作圖轉成 src/js/pd/monsterSprites.js（缺圖的怪物略過並警告）。
// 用法：node scripts/make-hero-sprites.mjs [--bosses | --monsters] [--preview 預覽圖.png] [--only 職業、Boss 或怪物]
// 需要 Chrome 與 puppeteer-core（在瀏覽器畫布中讀取像素）：
//   npm i --no-save puppeteer-core
// Chrome 預設為 macOS 的安裝位置，其他環境以環境變數 CHROME_PATH 指定。

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SHEETS as HERO_SHEETS, BOSS_SHEETS, MONSTER_SHEETS } from './hero-sprites/sheets.mjs';
import { MONSTERS } from '../src/js/pd/data.js';

const ROOT = new URL('../', import.meta.url);
const BOSSES = process.argv.includes('--bosses');
const MONS = process.argv.includes('--monsters');
/** 設計圖資料夾。 */
const DIR = MONS ? 'design/monsters' : BOSSES ? 'design/bosses' : 'design/heroes';
/** 要轉換的設計圖（角色、Boss 或一般怪物）；一般怪物只取實際存在的設計圖。 */
const SHEETS = MONS
  ? Object.fromEntries(Object.entries(MONSTER_SHEETS).filter(([k, s]) => {
    const ok = existsSync(new URL(`${DIR}/${s.file}`, ROOT));
    if (!ok) console.warn(`警告：缺少 ${DIR}/${s.file}，${k} 維持舊圖。`);
    return ok;
  }))
  : BOSSES ? BOSS_SHEETS : HERO_SHEETS;
/** 待機圖（第 1 個方向的第 1 格）換算後的預設高度（格）：角色 34，Boss 60（約 2.5 格高）；一般怪物以各自的 h 為準。 */
const TARGET_H = BOSSES ? 60 : 34;
/** 預設減色後的顏色數；一般怪物以各自的 colors 為準。 */
const COLORS = 24;
const NAMES = {
  warrior: '戰士', archer: '弓箭手', mage: '法師', thief: '盜賊', monk: '武僧', knight: '騎士',
  treant: '古樹守衛', golem: '熔岩魔像', lich: '霜之巫妖', bullKing: '巨角牛王', thunderbird: '雷鳥', necromancer: '死靈法師',
  pharaoh: '法老王', kraken: '深海巨妖', steamTitan: '蒸汽巨像', redDragon: '炎龍', demonLord: '魔王',
  ...Object.fromEntries(Object.entries(MONSTERS).map(([k, m]) => [k, m.name])),
};

/**
 * 讀取命令列參數。
 * @param {string} name 參數名稱（不含 --）。
 * @returns {string | undefined} 值。
 */
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/**
 * 載入 puppeteer-core；找不到時提示安裝方式並結束。
 * @returns {Promise<object>} puppeteer 模組。
 */
async function loadPuppeteer() {
  try {
    return (await import('puppeteer-core')).default;
  } catch {
    console.error('找不到 puppeteer-core，請先執行：npm i --no-save puppeteer-core');
    process.exit(1);
  }
}

/**
 * 去掉頭尾都透明的欄與列，回傳緊貼的像素與偏移。
 * @param {string[]} rows 像素列。
 * @returns {{dx: number, dy: number, rows: string[]}} 緊貼的像素與左上角偏移。
 */
function trim(rows) {
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c !== '.') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }));
  return { dx: x0, dy: y0, rows: rows.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1)) };
}

/**
 * 轉換一個職業：以正面待機格的高度換算像素格大小，各格去背、減色，記下在原圖格子裡的位置。
 * 只有特效、沒有角色的格子（高度不到第 1 格的六成）改用前一格。
 * @param {object} page puppeteer 頁面（已注入 convert-browser.js）。
 * @param {string} cls 職業。
 * @returns {Promise<{palette: Record<string, string>, frames: Record<string, object[]>}>} 調色盤與各方向的格子。
 */
async function convertClass(page, cls) {
  const sheet = SHEETS[cls];
  const src = 'data:image/png;base64,' + readFileSync(new URL(`${DIR}/${sheet.file}`, ROOT)).toString('base64');
  // 自動切格的設計圖：先在瀏覽器中依空白欄切出各格。
  if (sheet.auto) {
    sheet.cells = {
      right: await page.evaluate(async (src, a) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        return window.autoCells(img, a.n, a.y[0], a.y[1]);
      }, src, sheet.auto),
    };
  }
  const order = ['down', 'up', 'right'].filter((d) => sheet.cells[d]);
  const opts = { hole: sheet.hole ?? 80, bg: sheet.bg || [222, 30], edge: sheet.edge ?? 2 };
  const r = await page.evaluate(async (src, cells, order, opts, TARGET_H, COLORS) => {
    window.MAX_HOLE = opts.hole;
    window.BG_MIN = opts.bg[0];
    window.BG_SAT = opts.bg[1];
    window.EDGE_PASSES = opts.edge;
    const img = new Image();
    img.src = src;
    await img.decode();
    const cell = window.measureH(img, cells[order[0]][0]) / TARGET_H;
    return { cell, ...window.convertSet(img, order.flatMap((d) => cells[d]), cell, COLORS) };
  }, src, sheet.cells, order, opts, sheet.h ?? TARGET_H, sheet.colors ?? COLORS);
  const frames = {};
  let start = 0;
  for (const d of order) {
    const n = sheet.cells[d].length;
    const list = r.rows.slice(start, start + n).map((rows, k) => ({ rows, ...r.offs[start + k] }));
    for (let k = 1; k < n; k++) if (list[k].rows.length < list[0].rows.length * 0.6) list[k] = list[k - 1];
    frames[d === 'right' ? 'side' : d] = list;
    start += n;
  }
  console.log(`${NAMES[cls]}：像素格 ${r.cell.toFixed(2)}，${Object.entries(frames).map(([d, l]) => `${d} ${l.length} 格`).join('、')}`);
  return { palette: r.palette, frames };
}

/**
 * 把各格放到職業的共用畫布上：每個方向以格子中心為水平錨點、以第 1 格（待機）的腳底為基準線，
 * 保留設計圖中的前衝與後退；特效延伸到腳底以下的部分算進 foot。
 * @param {{palette: Record<string, string>, frames: Record<string, object[]>}} conv 轉換結果。
 * @returns {{palette: Record<string, string>, w: number, h: number, foot: number, frames: Record<string, {x: number, y: number, rows: string[]}[]>}} 遊戲用資料。
 */
function layout({ palette, frames }) {
  const placed = {};
  let minL = 0, maxR = 0, minT = 0, maxB = 0;
  for (const [d, list] of Object.entries(frames)) {
    const base = list[0].oy + list[0].rows.length;
    placed[d] = list.map((f) => {
      const t = trim(f.rows);
      const left = f.ox - f.cw / 2 + t.dx;
      const top = f.oy - base + t.dy;
      minL = Math.min(minL, left); maxR = Math.max(maxR, left + t.rows[0].length);
      minT = Math.min(minT, top); maxB = Math.max(maxB, top + t.rows.length);
      return { left, top, rows: t.rows };
    });
  }
  const half = Math.ceil(Math.max(-minL, maxR));
  const foot = Math.ceil(maxB);
  let h = Math.ceil(-minT) + foot;
  if (h % 2) h++;
  const baseY = h - foot;
  const out = {};
  for (const [d, list] of Object.entries(placed)) out[d] = list.map((f) => ({ x: Math.round(f.left + half), y: Math.round(f.top + baseY), rows: f.rows }));
  return { palette, w: half * 2, h, foot, frames: out };
}

/**
 * 產生 heroSprites.js 的內容。
 * @param {Record<string, object>} result 各職業的遊戲用資料。
 * @returns {string} 檔案內容。
 */
function render(result) {
  let js = `// 職業角色圖（2 倍密度的像素圖，由 design/heroes/ 的原創設計圖轉換而來）：每個字元對應調色盤中的一個顏色，'.' 為透明、'o' 為外框。
// 每個職業有共用的畫布大小（w × h，腳底在倒數第 foot 列之上），frames 依方向（down 正面、up 背面、side 面向右）
// 存 6～8 格攻擊動畫（第 1 格同時是待機圖），每格只存緊貼角色的像素與它在畫布上的位置（x, y）。
// 只有 1 格的職業表示還沒有動作圖，攻擊時以程式變形表現。走路幀由 heroArt 依待機圖產生。
// 由 scripts/make-hero-sprites.mjs 產生，請修改設計圖或轉換參數後重新產生，不要手動修改。

/**
 * 各職業的角色圖。
 * @type {Record<string, {palette: Record<string, string>, w: number, h: number, foot: number, frames: Record<'down' | 'up' | 'side', {x: number, y: number, rows: string[]}[]>}>}
 */
export const HERO_SPRITES = {\n`;
  for (const cls of Object.keys(SHEETS)) {
    const s = result[cls];
    const pal = JSON.stringify(s.palette).replace(/"([a-zA-Z])":/g, '$1: ').replace(/,/g, ', ').replace(/"/g, "'");
    js += `  // ${NAMES[cls]}（畫布 ${s.w} × ${s.h}）\n  ${cls}: {\n    palette: ${pal},\n    w: ${s.w},\n    h: ${s.h},\n    foot: ${s.foot},\n    frames: {\n`;
    for (const d of ['down', 'up', 'side']) {
      js += `      ${d}: [\n`;
      for (const f of s.frames[d]) js += `        { x: ${f.x}, y: ${f.y}, rows: [\n${f.rows.map((r) => `          '${r}',`).join('\n')}\n        ] },\n`;
      js += `      ],\n`;
    }
    js += `    },\n  },\n`;
  }
  return js + `};\n`;
}

/**
 * 產生 bossSprites.js 或 monsterSprites.js 的內容（兩者格式相同：一列 4 格、面向右）。
 * @param {Record<string, object>} result 各 Boss 或怪物的遊戲用資料。
 * @returns {string} 檔案內容。
 */
function renderBosses(result) {
  let js = MONS
    ? `// 一般怪物圖（高密度像素圖，由 design/monsters/ 的原創設計圖轉換而來）：每個字元對應調色盤中的一個顏色，'.' 為透明、'o' 為外框。
// 每隻怪物有共用的畫布大小（w × h，腳底在倒數第 foot 列之上），frames 依序為待機 A、待機 B、蓄力、出招（面向右），
// 每格只存緊貼的像素與它在畫布上的位置（x, y）。沒有列在這裡的怪物沿用 sprites.js 的 MONSTER_ART 舊圖。
// 由 scripts/make-hero-sprites.mjs --monsters 產生，請修改設計圖或轉換參數後重新產生，不要手動修改。

/**
 * 各一般怪物的圖。
 * @type {Record<string, {palette: Record<string, string>, w: number, h: number, foot: number, frames: {x: number, y: number, rows: string[]}[]}>}
 */
export const MONSTER_SPRITES = {\n`
    : `// Boss 圖（高密度像素圖，由 design/bosses/ 的原創設計圖轉換而來）：每個字元對應調色盤中的一個顏色，'.' 為透明、'o' 為外框。
// 每隻 Boss 有共用的畫布大小（w × h，腳底在倒數第 foot 列之上），frames 依序為待機 A、待機 B、蓄力、出招（面向右），
// 每格只存緊貼的像素與它在畫布上的位置（x, y）。進化 Boss 的配色由 sprites.js 依此圖轉換。
// 由 scripts/make-hero-sprites.mjs --bosses 產生，請修改設計圖或轉換參數後重新產生，不要手動修改。

/**
 * 各 Boss 的圖。
 * @type {Record<string, {palette: Record<string, string>, w: number, h: number, foot: number, frames: {x: number, y: number, rows: string[]}[]}>}
 */
export const BOSS_SPRITES = {\n`;
  for (const k of Object.keys(SHEETS)) {
    const s = result[k];
    const pal = JSON.stringify(s.palette).replace(/"([a-zA-Z])":/g, '$1: ').replace(/,/g, ', ').replace(/"/g, "'");
    js += `  // ${NAMES[k]}（畫布 ${s.w} × ${s.h}）\n  ${k}: {\n    palette: ${pal},\n    w: ${s.w},\n    h: ${s.h},\n    foot: ${s.foot},\n    frames: [\n`;
    for (const f of s.frames.side) js += `      { x: ${f.x}, y: ${f.y}, rows: [\n${f.rows.map((r) => `        '${r}',`).join('\n')}\n      ] },\n`;
    js += `    ],\n  },\n`;
  }
  return js + `};\n`;
}

/**
 * 輸出預覽圖：每個職業 3 列（正面、背面、側面），每格放大 3 倍。
 * @param {object} page puppeteer 頁面。
 * @param {Record<string, object>} result 各職業的遊戲用資料。
 * @param {string} out 輸出路徑。
 * @returns {Promise<void>}
 */
async function preview(page, result, out) {
  const size = await page.evaluate((result) => {
    document.body.innerHTML = '';
    document.body.style.cssText = 'background:#4a6a3a;margin:0';
    let y = 6, maxX = 0;
    for (const { palette, w, h, frames } of Object.values(result)) {
      for (const d of ['down', 'up', 'side'].filter((dd) => frames[dd])) {
        let x = 6;
        for (const f of frames[d]) {
          const c = document.createElement('canvas');
          c.width = w * 3; c.height = h * 3;
          const g = c.getContext('2d');
          f.rows.forEach((row, yy) => [...row].forEach((ch, xx) => {
            if (ch !== '.') { g.fillStyle = palette[ch]; g.fillRect((f.x + xx) * 3, (f.y + yy) * 3, 3, 3); }
          }));
          c.style.cssText = `position:absolute;left:${x}px;top:${y}px`;
          document.body.append(c);
          x += c.width + 6;
        }
        maxX = Math.max(maxX, x);
        y += h * 3 + 6;
      }
      y += 10;
    }
    return { w: maxX, h: y };
  }, result);
  await page.setViewport({ width: size.w, height: size.h });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size.w, height: size.h } });
  console.log(`預覽圖：${out}`);
}

const puppeteer = await loadPuppeteer();
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
try {
  const page = await browser.newPage();
  await page.setContent('<body></body>');
  await page.addScriptTag({ content: readFileSync(new URL('scripts/hero-sprites/convert-browser.js', ROOT), 'utf8') });
  const only = arg('only');
  const result = {};
  for (const cls of Object.keys(SHEETS)) if (!only || cls === only) result[cls] = layout(await convertClass(page, cls));
  if (only) {
    console.log('只轉換單一項目時不寫入檔案（可搭配 --preview 檢查）。');
  } else {
    const js = BOSSES || MONS ? renderBosses(result) : render(result);
    const out = MONS ? 'src/js/pd/monsterSprites.js' : BOSSES ? 'src/js/pd/bossSprites.js' : 'src/js/pd/heroSprites.js';
    writeFileSync(new URL(out, ROOT), js);
    console.log(`已寫入 ${out}（${Math.round(js.length / 1024)} KB）`);
  }
  if (arg('preview')) await preview(page, result, arg('preview'));
} finally {
  await browser.close();
}
