// 家園審圖頁：列出已完成美術的物件（含所有動態幀）、地板牆面、作物各階段、圖示，以及一間示範房間。

import { HOME_ART, TILE_ART, CROP_ART, MAT_ART, ICON_ART, homeArt, homeFrames, tileArt, cropArt, iconArt, HT } from '../js/pd/homeArt.js';
import { HOME_ITEMS, HOME_ITEM_KEYS, HOME_MATS, CROPS, CROP_KEYS, FURNITURE_CATS, DECOR_CATS, GOODS, GOOD_KEYS, MEALS, MEAL_KEYS } from '../js/pd/homeData.js';

const out = document.getElementById('out');
const scaleSel = document.getElementById('scale');

/**
 * 把畫布放大複製到新的畫布。
 * @param {HTMLCanvasElement} src 來源。
 * @param {number} s 倍率。
 * @returns {HTMLCanvasElement} 放大後的畫布。
 */
function scaled(src, s) {
  const c = document.createElement('canvas');
  c.width = src.width * s;
  c.height = src.height * s;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/**
 * 建立一張附說明的圖卡。
 * @param {HTMLCanvasElement} canvas 畫布。
 * @param {string} caption 說明。
 * @returns {HTMLElement} 圖卡。
 */
function figure(canvas, caption) {
  const f = document.createElement('figure');
  f.append(canvas);
  const c = document.createElement('figcaption');
  c.textContent = caption;
  f.append(c);
  return f;
}

/**
 * 加入一個區段。
 * @param {string} title 標題。
 * @param {HTMLElement[]} items 圖卡。
 */
function section(title, items) {
  const h = document.createElement('h2');
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid';
  grid.append(...items);
  out.append(h, grid);
}

/**
 * 畫一間示範房間：牆面、地板與幾件家具，檢查物件放在一起的質感。
 * @returns {HTMLCanvasElement} 畫布（原始大小）。
 */
function demoRoom() {
  const w = 8;
  const h = 6;
  const c = document.createElement('canvas');
  c.width = w * HT;
  c.height = h * HT + 16;
  const g = c.getContext('2d');
  for (let j = 1; j < h; j++) for (let i = 0; i < w; i++) g.drawImage(tileArt('woodFloor', i, j), i * HT, 16 + j * HT);
  for (let i = 0; i < w; i++) g.drawImage(tileArt('woodWall', i, 0), i * HT, 0);
  // 由上往下依序畫（下方的物件蓋住上方）。
  const items = [
    ['redCarpet', 3, 3], ['bookcase', 1, 1], ['fireplace', 3, 1], ['mantelClock', 6, 1], ['woodBed', 0, 3],
    ['woodTable', 4, 3], ['woodChair', 5, 3], ['vase', 4, 3], ['pottedPlant', 7, 2], ['longSofa', 3, 5], ['homeChest', 6, 5], ['fishTank', 1, 5],
  ];
  for (const [key, i, j] of [['woodWindow', 1, 0], ['landscapePainting', 5, 0]]) g.drawImage(homeArt(key), i * HT, 6);
  for (const [key, i, j] of items) {
    const a = homeArt(key);
    const it = HOME_ITEMS[key];
    const top = 16 + (j + it.size[1]) * HT - a.height;
    // 小擺設放在桌上時往上抬。
    const lift = key === 'vase' ? 14 : 0;
    g.drawImage(a, i * HT, top - lift);
  }
  return c;
}

/**
 * 依目前的放大倍率重新畫出整頁。
 */
function render() {
  const s = Number(scaleSel.value);
  out.innerHTML = '';
  section('示範房間', [figure(scaled(demoRoom(), s), '8 × 6 格的房間（木牆、木地板）')]);
  const items = Object.keys(HOME_ART).map((key) => {
    const n = homeFrames(key);
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '6px';
    for (let f = 0; f < n; f++) wrap.append(scaled(homeArt(key, f), s));
    const it = HOME_ITEMS[key];
    return figure(wrap, `${it.name}（${it.size.join('×')} 格${n > 1 ? `、${n} 幀` : ''}）`);
  });
  // 依分類排列，方便逐組檢查；?group=分類代碼 只看某一組。
  const only = new URLSearchParams(location.search).get('group');
  const cats = { ...FURNITURE_CATS, ...DECOR_CATS, ranch: '牧場動物', festival: '節慶裝飾' };
  for (const [cat, name] of Object.entries(cats)) {
    if (only && only !== cat) continue;
    const keys = HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].cat === cat && HOME_ART[k]);
    if (keys.length) section(`${name}（${keys.length} 件）`, keys.map((k) => items[Object.keys(HOME_ART).indexOf(k)]));
  }
  const missing = HOME_ITEM_KEYS.filter((k) => !HOME_ART[k] && !TILE_ART[k]);
  const p = document.createElement('p');
  p.textContent = `已完成 ${HOME_ITEM_KEYS.length - missing.length}／${HOME_ITEM_KEYS.length} 件；尚未完成：${missing.map((k) => HOME_ITEMS[k].name).join('、') || '無'}`;
  out.append(p);
  section('地板與牆面', Object.keys(TILE_ART).map((key) => {
    const c = document.createElement('canvas');
    const wall = HOME_ITEMS[key].place === 'wallTile';
    c.width = HT * 3;
    c.height = wall ? HT + 16 : HT * 2;
    const g = c.getContext('2d');
    for (let i = 0; i < 3; i++) for (let j = 0; j < (wall ? 1 : 2); j++) g.drawImage(tileArt(key, i, j), i * HT, j * HT);
    return figure(scaled(c, s), HOME_ITEMS[key].name);
  }));
  section('作物（剛種下、成長中、成熟）', Object.keys(CROP_ART).map((key) => {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '6px';
    for (let st = 0; st < 3; st++) wrap.append(scaled(cropArt(key, st), s));
    return figure(wrap, CROPS[key].name);
  }));
  const noCrop = CROP_KEYS.filter((k) => !CROP_ART[k]);
  if (noCrop.length) out.append(Object.assign(document.createElement('p'), { textContent: `尚未完成的作物：${noCrop.map((k) => CROPS[k].name).join('、')}` }));
  section('家園材料與圖示', [
    ...Object.keys(MAT_ART).map((key) => figure(scaled(iconArt(key), s), HOME_MATS.find((m) => m.key === key).name)),
    ...['seed', 'fertilizer', 'blueprint'].map((key) => figure(scaled(iconArt(key), s), { seed: '種子', fertilizer: '肥料', blueprint: '家具製作書' }[key])),
  ]);
  // 物產與料理圖示（尚未完成的列在最後）。
  section('物產與染料', GOOD_KEYS.filter((k) => ICON_ART[k]).map((k) => figure(scaled(iconArt(k), s), GOODS[k].name)));
  section('料理', MEAL_KEYS.filter((k) => ICON_ART[k]).map((k) => figure(scaled(iconArt(k), s), MEALS[k].name)));
  const noIcon = [...GOOD_KEYS.filter((k) => !ICON_ART[k]).map((k) => GOODS[k].name), ...MEAL_KEYS.filter((k) => !ICON_ART[k]).map((k) => MEALS[k].name)];
  if (noIcon.length) out.append(Object.assign(document.createElement('p'), { textContent: `尚未完成的圖示：${noIcon.join('、')}` }));
}

scaleSel.addEventListener('change', render);
render();
