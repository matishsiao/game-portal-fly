// 多物件設計圖的轉換工具（批次設定見 scripts/hero-sprites/sheet-sets.mjs）。
// 用法：
//   node scripts/make-sheet-sprites.mjs <批次> --refs <資料夾>   產生給設計者的參考圖（目前的圖依設計圖的排列放大排好）
//   node scripts/make-sheet-sprites.mjs <批次> [--preview 預覽圖.png]   把設計圖轉成遊戲用的圖（寫入批次的 out）
// 需要開發伺服器（npm run dev，預設 http://localhost:5191，可用 --url 指定）、Chrome 與 puppeteer-core（npm i --no-save puppeteer-core）。
// 每張設計圖上的物件依列、再依欄自動找出，數量必須與設定相符；每個物件等比例縮進目前圖片的不透明範圍（地板與牆面則剛好填滿）。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SETS } from './hero-sprites/sheet-sets.mjs';
import { packFile } from './sprite-pack.mjs';

const ROOT = new URL('../', import.meta.url);

/**
 * 讀取命令列參數。
 * @param {string} name 參數名稱（不含 --）。
 * @returns {string | undefined} 值。
 */
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const setName = process.argv[2];
const SET = SETS[setName];
if (!SET) {
  console.error(`未知的批次：${setName}（可用：${Object.keys(SETS).join('、')}）`);
  process.exit(1);
}
const URL_BASE = arg('url') || 'http://localhost:5191';

/**
 * 在瀏覽器中取得目前的圖（給參考圖與量範圍用）：回傳每個代碼的 data URL、畫布大小與不透明範圍。
 * 在頁面中執行，source 決定來源：item 道具、icon 家園圖示、crop 作物、furniture 家具、tile 家園地板牆面、dungeon 地城圖塊。
 * @param {string} source 來源。
 * @param {string[]} keys 代碼。
 * @returns {Promise<Record<string, {url: string, w: number, h: number, box: {x0:number,y0:number,x1:number,y1:number}}>>} 目前的圖。
 */
async function currentArt(source, keys) {
  /**
   * 量出畫布的不透明範圍。
   * @param {HTMLCanvasElement} c 畫布。
   * @returns {{x0:number,y0:number,x1:number,y1:number}} 範圍（含）。
   */
  const measure = (c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return x1 < 0 ? { x0: 0, y0: 0, x1: c.width - 1, y1: c.height - 1 } : { x0, y0, x1, y1 };
  };
  const out = {};
  // 圖資料存在 PNG 圖集裡，要先等解碼完成。
  await (await import('/js/pd/spritePack.js')).spritesReady();
  /**
   * 記錄一張圖。
   * @param {string} k 代碼。
   * @param {HTMLCanvasElement} c 畫布。
   */
  const put = (k, c) => { out[k] = { url: c.toDataURL(), w: c.width, h: c.height, box: measure(c) }; };
  if (source === 'dungeon') {
    const { World } = await import('/js/pd/world.js');
    const { Renderer } = await import('/js/pd/render.js');
    const { newCharacter } = await import('/js/storage.js');
    const { AREAS } = await import('/js/pd/data.js');
    const { walkable } = await import('/js/pd/dungeon.js');
    const byTheme = {};
    for (const k of keys) (byTheme[k.split('.')[0]] ||= []).push(k);
    for (const [theme, ks] of Object.entries(byTheme)) {
      const area = Object.keys(AREAS).find((a) => AREAS[a].theme === theme);
      const cv = document.createElement('canvas');
      const r = new Renderer(cv, document.createElement('canvas'));
      const w = new World(newCharacter('knight', '參考'), { area, depth: 2, seed: 5, floor: 1 });
      r.legacyTiles = true;
      r.buildFloor(w);
      const src = r.floorCache.canvas;
      const f = w.floor;
      const D = src.width / (f.w * 16);
      const solid = (i, j) => !walkable(w.tileAt(i, j));
      /**
       * 從地圖離屏畫布裁一塊（世界像素座標）。
       * @param {number} x x。
       * @param {number} y y。
       * @param {number} cw 寬。
       * @param {number} chh 高。
       * @returns {HTMLCanvasElement} 畫布。
       */
      const crop = (x, y, cw, chh) => {
        const c = document.createElement('canvas'); c.width = cw * D; c.height = chh * D;
        c.getContext('2d').drawImage(src, x * D, y * D, cw * D, chh * D, 0, 0, cw * D, chh * D);
        return c;
      };
      const floors = []; const faces = []; const tops = [];
      for (let j = 2; j < f.h - 2; j++) for (let i = 2; i < f.w - 2; i++) {
        const t = f.tiles[j * f.w + i];
        if (!solid(i, j) && !solid(i - 1, j) && !solid(i + 1, j) && !solid(i, j - 1) && !solid(i, j + 1) && t === 1) floors.push([i, j]);
        if (solid(i, j) && !solid(i, j + 1) && solid(i, j - 1) && solid(i - 1, j) && solid(i + 1, j) && !solid(i - 1, j + 1) && !solid(i + 1, j + 1)) faces.push([i, j]);
        if (solid(i, j) && solid(i, j + 1) && solid(i, j - 1) && solid(i - 1, j) && solid(i + 1, j) && !solid(i, j + 2)) tops.push([i, j]);
      }
      for (const k of ks) {
        const [kind, v] = k.split('.')[1].split('@');
        const n = Number(v || 0);
        if (kind === 'floor') { const [i, j] = floors[(n * 7) % floors.length]; put(k, crop(i * 16, j * 16, 16, 16)); }
        if (kind === 'face') { const [i, j] = faces[(n * 5 + 1) % faces.length]; put(k, crop(i * 16, j * 16 - 8, 16, 24)); }
        if (kind === 'top' || kind === 'rim') { const [i, j] = tops[(n * 3) % tops.length]; put(k, crop(i * 16, j * 16, 16, 16)); }
        if (kind === 'pillar') {
          // 圓柱：在空白畫布上畫一根（寬 12、高 28 世界像素）。
          const c = crop(0, 0, 12, 28);
          const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
          const [i, j] = faces[0];
          g.drawImage(src, (i * 16 + 2) * D, (j * 16 - 12) * D, 12 * D, 28 * D, 0, 0, c.width, c.height);
          put(k, c);
        }
      }
    }
    return out;
  }
  const sprites = await import('/js/pd/sprites.js');
  const home = await import('/js/pd/homeArt.js');
  for (const k of keys) {
    const [key, v] = k.split('@');
    let c = null;
    if (source === 'item') c = (sprites.itemArtLegacy || sprites.itemArt)(key);
    if (source === 'icon') c = (home.iconArtLegacy || home.iconArt)(key);
    if (source === 'crop') c = (home.cropArtLegacy || home.cropArt)(key, Number(v));
    if (source === 'furniture') c = (home.homeArtLegacy || home.homeArt)(key);
    if (source === 'tile') c = (home.tileArtLegacy || home.tileArt)(key, Number(v), Number(v));
    put(k, c);
  }
  return out;
}

const { default: puppeteer } = await import('puppeteer-core').catch(() => {
  console.error('找不到 puppeteer-core，請先執行：npm i --no-save puppeteer-core');
  process.exit(1);
});
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('頁面錯誤：', e.message));
  await page.goto(`${URL_BASE}/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => { document.body.innerHTML = ''; });
  await page.addScriptTag({ content: readFileSync(new URL('scripts/hero-sprites/convert-browser.js', ROOT), 'utf8') });
  const allKeys = SET.sheets.flatMap((s) => s.keys);
  const cur = await page.evaluate(`(${currentArt.toString()})(${JSON.stringify(SET.source)}, ${JSON.stringify(allKeys)})`);

  if (arg('refs')) {
    // 參考圖：每張設計圖一張，目前的圖整數倍放大後依列排好，物件之間留大片白色空隙。
    const dir = arg('refs');
    mkdirSync(dir, { recursive: true });
    for (const sheet of SET.sheets) {
      const b64 = await page.evaluate(async (sheet, cur) => {
        const imgs = [];
        for (const k of sheet.keys) { const im = new Image(); im.src = cur[k].url; await im.decode(); imgs.push(im); }
        const maxW = Math.max(...imgs.map((i) => i.width)), maxH = Math.max(...imgs.map((i) => i.height));
        const z = Math.max(1, Math.floor(Math.min(1600 / sheet.cols / maxW, 900 / Math.ceil(sheet.keys.length / sheet.cols) / maxH) * 0.7));
        const cw = maxW * z * 1.45, ch = maxH * z * 1.4;
        const c = document.createElement('canvas');
        c.width = Math.round(cw * sheet.cols); c.height = Math.round(ch * Math.ceil(sheet.keys.length / sheet.cols));
        const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false;
        imgs.forEach((im, n) => {
          const cx = (n % sheet.cols) * cw + cw / 2, cy = Math.floor(n / sheet.cols) * ch + ch / 2;
          g.drawImage(im, Math.round(cx - (im.width * z) / 2), Math.round(cy - (im.height * z) / 2), im.width * z, im.height * z);
        });
        return c.toDataURL().split(',')[1];
      }, sheet, cur);
      writeFileSync(`${dir}/${sheet.file}`, Buffer.from(b64, 'base64'));
    }
    console.log(`已產生 ${SET.sheets.length} 張參考圖：${dir}`);
  } else {
    const result = {};
    let ok = true;
    for (const sheet of SET.sheets) {
      const path = new URL(`${SET.dir}/${sheet.file}`, ROOT);
      if (!existsSync(path)) { console.warn(`缺少 ${SET.dir}/${sheet.file}，略過`); continue; }
      const src = 'data:image/png;base64,' + readFileSync(path).toString('base64');
      const targets = sheet.keys.map((k) => {
        const c = cur[k];
        const D = SET.density;
        const kind = k.includes('.') ? k.split('.')[1].split('@')[0] : '';
        if (kind === 'pillar') return { tw: 24, th: 56, mode: 'contain', align: 'bottom', k: SET.colors };
        if (SET.exact) return { tw: c.w * D, th: c.h * D, mode: 'exact', k: SET.colors, outline: false };
        // 等比例縮進目前圖片的不透明範圍，水平置中、貼齊底部，再放回原畫布的位置。
        return { tw: (c.box.x1 - c.box.x0 + 1) * D, th: (c.box.y1 - c.box.y0 + 1) * D, mode: 'contain', align: 'bottom', k: SET.colors, place: { x: c.box.x0 * D, y: c.box.y0 * D, w: c.w * D, h: c.h * D } };
      });
      const r = await page.evaluate(async (src, targets) => {
        window.BG_MIN = 250; window.BG_SAT = 6; window.MAX_HOLE = 0; window.EDGE_PASSES = 0;
        const img = new Image(); img.src = src; await img.decode();
        const boxes = window.autoBlobs(img);
        if (boxes.length !== targets.length) return { error: `找到 ${boxes.length} 個物件，應為 ${targets.length} 個` };
        return { items: boxes.map((b, i) => window.convertFit(img, b, targets[i])) };
      }, src, targets);
      if (r.error) { console.error(`${sheet.file}：${r.error}`); ok = false; continue; }
      r.items.forEach((it, i) => {
        const t = targets[i];
        if (t.place) {
          // 放回原畫布：在 place 的位置貼上 tw × th 的圖。
          const rows = Array.from({ length: t.place.h }, () => '.'.repeat(t.place.w));
          it.rows.forEach((row, y) => { const yy = t.place.y + y; if (yy < t.place.h) rows[yy] = rows[yy].slice(0, t.place.x) + row + rows[yy].slice(t.place.x + row.length); });
          result[sheet.keys[i]] = { palette: it.palette, w: t.place.w, h: t.place.h, rows };
        } else result[sheet.keys[i]] = { palette: it.palette, w: it.w, h: it.h, rows: it.rows };
      });
      console.log(`${sheet.file}：${r.items.length} 個`);
    }
    let js = `// 由 scripts/make-sheet-sprites.mjs ${setName} 從 ${SET.dir}/ 的原創設計圖轉換產生，請修改設計圖或轉換參數後重新產生，不要手動修改。\n`;
    js += `// 每張圖：palette 調色盤（'.' 透明、'o' 外框）、w × h 畫布大小（密度 ${SET.density}）、rows 像素列。\n\n`;
    js += `/**\n * 由設計圖轉換的圖（${setName}）。\n * @type {Record<string, {palette: Record<string, string>, w: number, h: number, rows: string[]}>}\n */\n`;
    js += `export const ${SET.name} = {\n`;
    for (const [k, s] of Object.entries(result)) {
      const pal = JSON.stringify(s.palette).replace(/"([a-zA-Z])":/g, '$1: ').replace(/,/g, ', ').replace(/"/g, "'");
      js += `  '${k}': { palette: ${pal}, w: ${s.w}, h: ${s.h}, rows: [\n${s.rows.map((row) => `    '${row}',`).join('\n')}\n  ] },\n`;
    }
    js += '};\n';
    if (Object.keys(result).length) {
      writeFileSync(new URL(SET.out, ROOT), js);
      // 封裝成 PNG 圖集（模組只留描述）。
      await packFile(new URL(SET.out, ROOT).pathname);
      console.log(`已寫入 ${SET.out}（${Object.keys(result).length} 張，${Math.round(js.length / 1024)} KB）${ok ? '' : '；有設計圖物件數不符，請檢查上方訊息'}`);
    }
    if (arg('preview')) {
      const b64 = await page.evaluate((result) => {
        const list = Object.entries(result);
        const z = 3, cols = 8;
        const cw = Math.max(...list.map(([, s]) => s.w)) * z + 8, ch = Math.max(...list.map(([, s]) => s.h)) * z + 8;
        const c = document.createElement('canvas'); c.width = cw * cols; c.height = ch * Math.ceil(list.length / cols);
        const g = c.getContext('2d'); g.fillStyle = '#4a6a3a'; g.fillRect(0, 0, c.width, c.height);
        list.forEach(([, s], n) => {
          const ox = (n % cols) * cw + 4, oy = Math.floor(n / cols) * ch + 4;
          s.rows.forEach((row, y) => [...row].forEach((chh, x) => { if (chh !== '.') { g.fillStyle = s.palette[chh]; g.fillRect(ox + x * z, oy + y * z, z, z); } }));
        });
        return c.toDataURL().split(',')[1];
      }, result);
      writeFileSync(arg('preview'), Buffer.from(b64, 'base64'));
      console.log(`預覽圖：${arg('preview')}`);
    }
  }
} finally {
  await browser.close();
}
