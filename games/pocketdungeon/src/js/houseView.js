// 家裡場景（瀏覽器）：繪製房子與庭院（牆、地板、田地、家具、角色），處理點選移動、鍵盤移動、互動與佈置模式的預覽。
// 規則（能不能擺、找路）在 pd/home.js；這裡只負責畫面與輸入，資料變更透過 hooks 交給 app.js。

import { HOME_ITEMS, ANIMALS, GOODS, RANCH, LAND } from './pd/homeData.js';
import { homeLayout, placedRect, walkGrid, findPath, placedAt, areaAt, placeCheck, cropStage, animalState } from './pd/home.js';
import { homeArt, homeFrames, tileArt, cropArt, iconArt, dyedArt, HT } from './pd/homeArt.js';
import { R, ramp, rect, px, hash, ellipse, makeCanvas, soil } from './pd/homeDraw.js';
import { heroArt } from './pd/sprites.js';

/** 最上方多留給牆頂的像素。 */
const TOP = 16;
/** 角色每秒移動的格數。 */
const SPEED = 4.5;
/** 放在桌面上的小擺設往上抬的像素。 */
const TABLE_LIFT = 14;

/** 畫布解析度倍率：畫布以 2 倍解析度繪製（座標仍以家園像素計算），高密度的圖（庭院造景第二版、角色）才看得到細節。 */
export const HOUSE_HD = 2;

/**
 * 物件圖的顯示高度（高密度的圖，例如庭院造景第二版，換算回一般大小）。
 * @param {HTMLCanvasElement} art 物件圖。
 * @returns {number} 顯示高度（家園像素）。
 */
const artH = (art) => art.height / (art.density || 1);
/** 小地圖每格的像素。 */
const MINI_CELL = 4;
/** 小地圖的顏色。 */
const MINI = { ghost: 'rgba(255,255,255,0.07)', edge: 'rgba(255,255,255,0.55)', wall: '#5a4638', floor: '#c8a070', door: '#f0d090', grass: '#4f9a42', plot: '#7a5030', ready: '#ffe14d', item: '#7a5a8a', func: '#4ab0e0', animal: '#ffffff', player: '#ff4a4a', view: '#ffffff' };

/**
 * 庭院草地的一格（依位置變化的草葉與小花）。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @returns {HTMLCanvasElement} 32 × 32 的畫布。
 */
function grassTile(i, j) {
  const id = `${i % 4}-${j % 4}`;
  if (!grassTile.cache.has(id)) {
    const c = makeCanvas(HT, HT);
    const g = c.getContext('2d');
    const r = ramp('#5aa848');
    rect(g, 0, 0, HT, HT, r.b);
    for (let k = 0; k < 26; k++) {
      const x = Math.floor(hash(k, i % 4, j % 4) * 31);
      const y = Math.floor(hash(j % 4, k, i % 4) * 30) + 1;
      px(g, x, y, r.d);
      px(g, x + 1, y - 1, hash(x, y) < 0.5 ? r.l : r.d);
    }
    if (hash(i % 4, j % 4, 9) < 0.35) {
      const x = 6 + Math.floor(hash(i % 4, j % 4, 3) * 20);
      const y = 6 + Math.floor(hash(j % 4, i % 4, 5) * 20);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) px(g, x + dx, y + dy, '#f8f0f8');
      px(g, x, y, '#f0c040');
    }
    grassTile.cache.set(id, c);
  }
  return grassTile.cache.get(id);
}
grassTile.cache = new Map();

/**
 * 田地（空的）圖：翻過的泥土。
 * @returns {HTMLCanvasElement} 32 × 40 的畫布。
 */
function soilTile() {
  if (!soilTile.canvas) {
    const c = makeCanvas(HT, HT + 8);
    soil(c.getContext('2d'));
    soilTile.canvas = c;
  }
  return soilTile.canvas;
}

/** 家裡場景。 */
export class HouseView {
  /**
   * 建立場景。
   * @param {HTMLCanvasElement} canvas 畫布。
   * @param {object} ch 角色（讀取家園資料；不直接修改）。
   * @param {{interact: (target: {kind: 'item' | 'plot', index: number}) => void, place: (cell: {at: string, x: number, y: number}) => void, select: (index: number) => void, message: (text: string) => void, busy: () => boolean, itemArt: (item: object) => HTMLCanvasElement}} hooks 互動、擺放、選取、訊息的回呼、是否有對話框開著（開著時不處理輸入），以及裝備的圖（展示架用）。
   * @param {{stage?: HTMLElement, mini?: HTMLCanvasElement, float?: HTMLElement}} [view] 可捲動的外框（鏡頭跟隨角色）、小地圖畫布，以及跟著虛影或選取物件移動的浮動按鈕列；沒有時不跟隨、不畫小地圖、不顯示浮動按鈕。
   */
  constructor(canvas, ch, hooks, view = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.ch = ch;
    this.hooks = hooks;
    this.mode = 'walk';
    /** 佈置模式：要擺放的庫存物件代碼，或要移動的擺放索引。 */
    this.pick = null;
    this.moving = -1;
    /** 佈置模式：目前選取的已擺放物件；預覽（擺放中的虛影位置，按 ✓ 才真的擺上去）；是否正在拖曳虛影。 */
    this.selected = -1;
    this.preview = null;
    this.drag = false;
    this.time = 0;
    this.raf = 0;
    this.last = 0;
    /** 目前按住的指標（起點、捲動起點、目前位置、是否拖動過）；沒有按住時為 null。 */
    this.press = null;
    this.keys = new Set();
    this.stage = view.stage || null;
    this.mini = view.mini || null;
    this.float = view.float || null;
    this.miniG = this.mini ? this.mini.getContext('2d') : null;
    /** 鏡頭：free 為玩家自己移動過視角（角色再走動前不跟隨）；snap 為下一幀直接對準角色。 */
    this.cam = { free: false, snap: true };
    this.resetPlayer();
    this.onPointer = this.onPointer.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onKey = this.onKey.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMini = this.onMini.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.frame = this.frame.bind(this);
  }

  /** 角色回到門口內側、面向下方。 */
  resetPlayer() {
    const l = homeLayout(this.ch.home.level);
    this.player = { x: l.door.x, y: l.door.y - 1, path: [], face: 1, walk: 0, target: null };
  }

  /** 開始（綁定輸入、啟動繪製迴圈）。 */
  start() {
    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    document.addEventListener('keydown', this.onKey);
    document.addEventListener('keyup', this.onKeyUp);
    if (this.mini) this.mini.addEventListener('pointerdown', this.onMini);
    if (this.stage) this.stage.addEventListener('wheel', this.onWheel, { passive: true });
    this.resize();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  /** 停止（解除輸入、停止繪製迴圈）。 */
  stop() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    if (this.float) this.float.hidden = true;
    document.removeEventListener('keydown', this.onKey);
    document.removeEventListener('keyup', this.onKeyUp);
    if (this.mini) this.mini.removeEventListener('pointerdown', this.onMini);
    if (this.stage) this.stage.removeEventListener('wheel', this.onWheel);
  }

  /** 依地圖大小調整畫布（原始解析度），畫面大小由 CSS 縮放。 */
  resize() {
    const l = homeLayout(this.ch.home.level);
    this.canvas.width = l.cols * HT * HOUSE_HD;
    this.canvas.height = (l.rows * HT + TOP) * HOUSE_HD;
    if (this.mini) {
      const max = homeLayout(LAND.length);
      this.mini.width = Math.max(max.cols, l.cols) * MINI_CELL;
      this.mini.height = Math.max(max.rows, l.rows) * MINI_CELL;
    }
    this.cam.snap = true;
  }

  /**
   * 切換模式。
   * @param {'walk' | 'edit'} mode 走動或佈置。
   */
  setMode(mode) {
    this.mode = mode;
    this.pick = null;
    this.moving = -1;
    this.selected = -1;
    this.preview = null;
    this.drag = false;
    this.press = null;
  }

  /**
   * 開始擺放（手遊式）：選好庫存物件或按「移動」後，虛影先出現在畫面中央附近可以擺的位置，再拖曳或點地圖調整，按 ✓ 確認。
   * @param {{pick?: string, moving?: number}} what 要擺的庫存物件代碼，或要移動的擺放索引。
   */
  beginPlace(what) {
    this.pick = what.pick || null;
    this.moving = what.moving >= 0 ? what.moving : -1;
    this.drag = false;
    this.preview = this.moving >= 0 ? this.ghostOfPlaced(this.moving) : this.autoSpot();
  }

  /** 取消擺放（移動中的物件回到選取狀態）。 */
  cancelPlace() {
    if (this.moving >= 0) this.selected = this.moving;
    this.pick = null;
    this.moving = -1;
    this.preview = null;
    this.drag = false;
  }

  /**
   * 擺放中物件的代碼。
   * @returns {string | null} 代碼；沒有在擺放時為 null。
   */
  placingId() {
    return this.pick || (this.moving >= 0 && this.ch.home.placed[this.moving] ? this.ch.home.placed[this.moving].id : null);
  }

  /**
   * 已擺放物件目前位置的虛影（移動的起點）。
   * @param {number} index 擺放索引。
   * @returns {{at: string, x: number, y: number, ok: boolean, reason?: string}} 預覽。
   */
  ghostOfPlaced(index) {
    const p = this.ch.home.placed[index];
    const c = placeCheck(this.ch.home, p.id, p.at, p.x, p.y, index);
    return { at: p.at, x: p.x, y: p.y, ok: c.ok, reason: c.reason };
  }

  /**
   * 找一個靠近目前畫面中央、可以擺的位置；整張地圖都不能擺時回傳最近的位置（紅色）。
   * @returns {{at: string, x: number, y: number, ok: boolean, reason?: string} | null} 預覽。
   */
  autoSpot() {
    const l = homeLayout(this.ch.home.level);
    let cx = l.cols / 2;
    let cy = l.rows / 2;
    const st = this.stage;
    if (st && st.clientWidth) {
      const s = this.viewScale();
      cx = (st.scrollLeft - this.canvas.offsetLeft + st.clientWidth / 2) / s / HT;
      cy = ((st.scrollTop - this.canvas.offsetTop + st.clientHeight / 2) / s - TOP) / HT;
    }
    const cells = [];
    for (let y = 0; y < l.rows; y++) for (let x = 0; x < l.cols; x++) cells.push({ x, y, d: (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 });
    // 依離畫面中央的距離排序。
    cells.sort((a, b) => a.d - b.d);
    let first = null;
    for (const c of cells) {
      const pv = this.previewAt(c);
      if (!pv) continue;
      if (pv.ok) return pv;
      if (!first) first = pv;
    }
    return first;
  }

  /**
   * 每一幀：更新角色移動並重畫。
   * @param {number} ts 時間戳記（毫秒）。
   */
  frame(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    this.time += dt;
    this.update(dt);
    this.draw();
    this.edgeScroll(dt);
    this.follow(dt);
    this.drawMini();
    this.positionFloat();
    this.raf = requestAnimationFrame(this.frame);
  }

  /**
   * 角色沿路徑移動；鍵盤按住方向鍵時一格一格走；走到目標旁邊時觸發互動。
   * @param {number} dt 秒。
   */
  update(dt) {
    const p = this.player;
    if (!p.path.length && this.mode === 'walk') {
      const dir = [['ArrowLeft', -1, 0], ['ArrowRight', 1, 0], ['ArrowUp', 0, -1], ['ArrowDown', 0, 1], ['a', -1, 0], ['d', 1, 0], ['w', 0, -1], ['s', 0, 1]].find(([k]) => this.keys.has(k));
      if (dir) {
        const [, dx, dy] = dir;
        const grid = this.grid();
        const nx = Math.round(p.x) + dx;
        const ny = Math.round(p.y) + dy;
        if (dx) p.face = dx;
        if (grid[ny] && grid[ny][nx]) p.path.push({ x: nx, y: ny });
      }
    }
    if (p.path.length) {
      this.cam.free = false;
      const next = p.path[0];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const d = Math.hypot(dx, dy);
      if (dx) p.face = Math.sign(dx);
      const step = SPEED * dt;
      if (d <= step) {
        p.x = next.x;
        p.y = next.y;
        p.path.shift();
        if (!p.path.length && p.target) {
          const t = p.target;
          p.target = null;
          this.hooks.interact(t);
        }
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      p.walk += dt;
    } else p.walk = 0;
  }

  /**
   * 目前的可行走表。
   * @returns {boolean[][]} [y][x]。
   */
  grid() {
    return walkGrid(homeLayout(this.ch.home.level), this.ch.home.placed);
  }

  /**
   * 指標事件的地圖格（依畫布在畫面上的縮放換算）。
   * @param {PointerEvent} e 指標事件。
   * @returns {{x: number, y: number}} 地圖座標。
   */
  cellOf(e) {
    const r = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * (this.canvas.width / HOUSE_HD);
    const sy = ((e.clientY - r.top) / r.height) * (this.canvas.height / HOUSE_HD);
    return { x: Math.floor(sx / HT), y: Math.floor((sy - TOP) / HT) };
  }

  /**
   * 指標在畫布上的原始像素座標。
   * @param {PointerEvent | {clientX: number, clientY: number}} e 指標事件或座標。
   * @returns {{x: number, y: number}} 畫布像素座標。
   */
  canvasPx(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * (this.canvas.width / HOUSE_HD), y: ((e.clientY - r.top) / r.height) * (this.canvas.height / HOUSE_HD) };
  }

  /**
   * 指標是否按在擺放中的虛影上（含物件圖往上突出的部分，四周多留一點方便手指按）。
   * @param {PointerEvent} e 指標事件。
   * @returns {boolean} 按在虛影上時為 true。
   */
  onGhost(e) {
    const id = this.placingId();
    const pv = this.preview;
    if (!id || !pv) return false;
    const r = placedRect({ id, at: pv.at, x: pv.x, y: pv.y }, homeLayout(this.ch.home.level));
    const art = homeArt(id);
    const bottom = pv.at === 'wall' ? TOP + HT : TOP + (r.y + r.h) * HT;
    const top = pv.at === 'wall' ? 0 : bottom - Math.max(r.h * HT, art ? artH(art) : 0);
    const m = 10;
    const c = this.canvasPx(e);
    return c.x >= r.x * HT - m && c.x <= (r.x + r.w) * HT + m && c.y >= top - m && c.y <= bottom + m;
  }

  /**
   * 指標移動：拖曳虛影時移動物品（到畫面邊緣時由 edgeScroll 自動捲動）；拖曳其他地方時平移地圖。
   * @param {PointerEvent} e 指標事件。
   */
  onMove(e) {
    const pr = this.press;
    if (!pr || pr.id !== e.pointerId) return;
    pr.cx = e.clientX;
    pr.cy = e.clientY;
    if (this.drag) {
      this.dragTo(e);
      return;
    }
    const dx = e.clientX - pr.x;
    const dy = e.clientY - pr.y;
    if (!pr.moved && Math.hypot(dx, dy) < 8) return;
    pr.moved = true;
    if (!this.stage) return;
    this.cam.free = true;
    this.stage.scrollLeft = pr.sl - dx;
    this.stage.scrollTop = pr.st - dy;
  }

  /**
   * 把虛影移到指標所在的格子（位置有變時通知 app 更新資訊卡）。
   * @param {{clientX: number, clientY: number}} e 指標座標。
   */
  dragTo(e) {
    const pv = this.previewAt(this.cellOf(e));
    if (!pv) return;
    const old = this.preview;
    if (old && old.at === pv.at && old.x === pv.x && old.y === pv.y) return;
    this.preview = pv;
    this.hooks.pending();
  }

  /**
   * 拖曳虛影到畫面邊緣時自動捲動地圖（越靠邊越快），並讓虛影跟著手指的新位置。
   * @param {number} dt 秒。
   */
  edgeScroll(dt) {
    const pr = this.press;
    const st = this.stage;
    if (!this.drag || !pr || !st || pr.cx == null) return;
    const r = st.getBoundingClientRect();
    const edge = 48;
    // 某一邊的捲動速度（-1～1）。
    const push = (v, lo, hi) => (v < lo + edge ? -(lo + edge - v) / edge : v > hi - edge ? (v - (hi - edge)) / edge : 0);
    const vx = push(pr.cx, r.left, r.right);
    const vy = push(pr.cy, r.top, r.bottom);
    if (!vx && !vy) return;
    const speed = 520 * dt;
    st.scrollLeft += Math.max(-1, Math.min(1, vx)) * speed;
    st.scrollTop += Math.max(-1, Math.min(1, vy)) * speed;
    this.cam.free = true;
    this.dragTo({ clientX: pr.cx, clientY: pr.cy });
  }

  /**
   * 放開指標：結束拖曳；沒有拖動時當成點一下（擺放中把虛影移過去、佈置時選取物件、走動時走過去）。
   * @param {PointerEvent} e 指標事件。
   */
  onUp(e) {
    const pr = this.press;
    if (!pr || pr.id !== e.pointerId) return;
    this.press = null;
    const wasDrag = this.drag;
    this.drag = false;
    if (this.canvas.hasPointerCapture && this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (wasDrag || pr.moved || e.type === 'pointercancel') return;
    this.tap(this.cellOf(e));
  }

  /**
   * 手指（或滑鼠）在某一格時的擺放預覽：物件以手指為中心，超出區域時推回區域內；附上能不能擺。
   * @param {{x: number, y: number}} cell 地圖座標。
   * @returns {{at: string, x: number, y: number, ok: boolean, reason?: string} | null} 預覽；不在任何區域時為 null。
   */
  previewAt(cell) {
    const l = homeLayout(this.ch.home.level);
    const id = this.placingId();
    if (!id) return null;
    const it = HOME_ITEMS[id];
    // 牆飾：點在牆面那排或室內第一排都掛到牆上。
    const wall = it.place === 'wall';
    const a = areaAt(l, cell.x, wall && cell.y === l.house.y ? l.wall.y : cell.y);
    if (!a) return null;
    const area = a.at === 'yard' ? l.yard : a.at === 'wall' ? { ...l.wall, h: 1 } : l.house;
    const [w, hh] = it.size;
    const ph = a.at === 'wall' ? 1 : hh;
    const x = Math.max(0, Math.min(area.w - w, a.x - Math.floor((w - 1) / 2)));
    const y = Math.max(0, Math.min(area.h - ph, a.y - Math.floor((ph - 1) / 2)));
    const c = placeCheck(this.ch.home, id, a.at, x, y, this.moving);
    return { at: a.at, x, y, ok: c.ok, reason: c.reason };
  }

  /**
   * 按下畫面：按在擺放中的虛影上時開始拖曳物品，否則記下起點（拖動就平移地圖，沒拖動就在放開時當成點一下）。
   * @param {PointerEvent} e 指標事件。
   */
  onPointer(e) {
    e.preventDefault();
    if (this.hooks.busy() || this.press) return;
    const st = this.stage;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, sl: st ? st.scrollLeft : 0, st: st ? st.scrollTop : 0, moved: false };
    this.drag = this.mode === 'edit' && this.onGhost(e);
    if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(e.pointerId);
  }

  /**
   * 點一下地圖：走動模式走過去（點到功能家具或田地時走到旁邊並互動）；佈置模式擺放中時把虛影移過去，否則選取物件。
   * @param {{x: number, y: number}} cell 地圖座標。
   */
  tap(cell) {
    const h = this.ch.home;
    const l = homeLayout(h.level);
    if (this.mode === 'edit') {
      if (this.placingId()) {
        const pv = this.previewAt(cell);
        if (!pv) return;
        this.preview = pv;
        this.hooks.pending();
        return;
      }
      this.selected = placedAt(h, cell.x, cell.y === l.house.y && placedAt(h, cell.x, cell.y) < 0 ? l.wall.y : cell.y);
      this.hooks.select(this.selected);
      return;
    }
    const p = this.player;
    const from = { x: Math.round(p.x), y: Math.round(p.y) };
    const index = placedAt(h, cell.x, cell.y);
    const plot = l.plots.findIndex((pl) => pl.x === cell.x && pl.y === cell.y);
    const target = plot >= 0 ? { kind: 'plot', index: plot } : index >= 0 && HOME_ITEMS[h.placed[index].id].place === 'floor' ? { kind: 'item', index } : null;
    const path = findPath(this.grid(), from, cell);
    if (!path) return;
    p.path = path;
    p.target = target;
    if (!path.length && target) {
      p.target = null;
      this.hooks.interact(target);
    }
  }

  /**
   * 按鍵：方向鍵與 WASD 移動，空白鍵、Enter、J 與面前的家具互動。
   * @param {KeyboardEvent} e 鍵盤事件。
   */
  onKey(e) {
    if (this.hooks.busy()) return;
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's'].includes(k)) {
      this.keys.add(k);
      e.preventDefault();
    } else if ([' ', 'Enter', 'j'].includes(k) && this.mode === 'walk') {
      // 與上下左右相鄰的功能家具或田地互動（先看面向的那一側）。
      const p = this.player;
      const h = this.ch.home;
      const l = homeLayout(h.level);
      const cx = Math.round(p.x);
      const cy = Math.round(p.y);
      for (const [dx, dy] of [[p.face, 0], [0, -1], [0, 1], [-p.face, 0]]) {
        const plot = l.plots.findIndex((pl) => pl.x === cx + dx && pl.y === cy + dy);
        if (plot >= 0) {
          this.hooks.interact({ kind: 'plot', index: plot });
          e.preventDefault();
          return;
        }
        const index = placedAt(h, cx + dx, cy + dy);
        if (index >= 0 && HOME_ITEMS[h.placed[index].id].place === 'floor') {
          this.hooks.interact({ kind: 'item', index });
          e.preventDefault();
          return;
        }
      }
    }
  }

  /**
   * 放開按鍵。
   * @param {KeyboardEvent} e 鍵盤事件。
   */
  onKeyUp(e) {
    this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }

  /**
   * 每個家園像素在畫面上的大小（CSS 像素）。
   * @returns {number} 縮放倍率。
   */
  viewScale() {
    return this.canvas.clientWidth / (this.canvas.width / HOUSE_HD) || 1;
  }

  /**
   * 把視角移到某個地圖位置的中心（外框可以捲動時才有作用）。
   * @param {number} x 地圖 x（格，可以有小數）。
   * @param {number} y 地圖 y（格，可以有小數）。
   * @param {number} k 這一幀靠近的比例（1 為直接對準）。
   */
  centerOn(x, y, k) {
    const st = this.stage;
    if (!st) return;
    const s = this.viewScale();
    const tx = this.canvas.offsetLeft + (x + 0.5) * HT * s - st.clientWidth / 2;
    const ty = this.canvas.offsetTop + (TOP + (y + 0.5) * HT) * s - st.clientHeight / 2;
    st.scrollLeft += (tx - st.scrollLeft) * k;
    st.scrollTop += (ty - st.scrollTop) * k;
  }

  /**
   * 鏡頭跟隨：走動模式下平滑對準角色；玩家自己移動過視角或在佈置模式時不跟隨。
   * @param {number} dt 秒。
   */
  follow(dt) {
    if (!this.stage) return;
    if (this.cam.snap) {
      this.cam.snap = false;
      this.centerOn(this.player.x, this.player.y, 1);
      return;
    }
    if (this.mode !== 'walk' || this.cam.free) return;
    this.centerOn(this.player.x, this.player.y, Math.min(1, dt * 6));
  }

  /**
   * 點小地圖：視角移到點的位置（角色再走動前不會被拉回）。
   * @param {PointerEvent} e 指標事件。
   */
  onMini(e) {
    e.preventDefault();
    e.stopPropagation();
    const r = this.mini.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * this.mini.width / MINI_CELL;
    const y = ((e.clientY - r.top) / r.height) * this.mini.height / MINI_CELL;
    const l = homeLayout(this.ch.home.level);
    this.cam.free = true;
    this.centerOn(Math.min(l.cols - 1, Math.max(0, x - 0.5)), Math.min(l.rows - 1, Math.max(0, y - 0.5)), 1);
  }

  /** 用滑鼠滾輪捲動畫面時暫停跟隨。 */
  onWheel() {
    this.cam.free = true;
  }

  /**
   * 小地圖：目前的房子與庭院（牆、地板、草地、田地、家具、動物、角色），虛線框是土地擴建到最大的範圍，白框是目前看得到的區域。
   */
  drawMini() {
    const g = this.miniG;
    if (!g) return;
    const h = this.ch.home;
    const l = homeLayout(h.level);
    const C = MINI_CELL;
    const W = this.mini.width;
    const H = this.mini.height;
    g.clearRect(0, 0, W, H);
    // 擴建到最大的範圍（已經最大時就是目前的範圍）。
    const max = homeLayout(LAND.length);
    if (h.level < LAND.length) {
      g.fillStyle = MINI.ghost;
      g.fillRect(0, 0, max.cols * C, max.rows * C);
      g.strokeStyle = MINI.edge;
      g.lineWidth = 1;
      g.setLineDash([2, 2]);
      g.strokeRect(0.5, 0.5, max.cols * C - 1, max.rows * C - 1);
      g.setLineDash([]);
    }
    // 一格的顏色。
    const cell = (x, y, color) => {
      g.fillStyle = color;
      g.fillRect(x * C, y * C, C, C);
    };
    for (let y = 0; y < l.rows; y++) {
      for (let x = 0; x < l.cols; x++) {
        const inHouse = x >= l.house.x && x < l.house.x + l.house.w && y >= l.house.y && y < l.house.y + l.house.h;
        if (inHouse) cell(x, y, MINI.floor);
        else if (y <= l.door.y) cell(x, y, x === l.door.x && y === l.door.y ? MINI.door : MINI.wall);
        else cell(x, y, MINI.grass);
      }
    }
    // 田地（成熟的是黃色）。
    l.plots.forEach((pl, i) => cell(pl.x, pl.y, cropStage(h.plots[i]) === 2 ? MINI.ready : MINI.plot));
    // 擋路的家具與動物（功能家具是藍色，方便找工作台、藥草台）。
    for (const p of h.placed) {
      const it = HOME_ITEMS[p.id];
      if (it.place !== 'floor') continue;
      const r = placedRect(p, l);
      g.fillStyle = it.type === 'animal' ? MINI.animal : it.func ? MINI.func : MINI.item;
      g.fillRect(r.x * C + 1, r.y * C + 1, r.w * C - 2, r.h * C - 2);
    }
    // 角色（閃爍）。
    if (Math.floor(this.time * 3) % 3) {
      g.fillStyle = MINI.player;
      g.fillRect(Math.round(this.player.x * C) - 1, Math.round(this.player.y * C) - 1, C + 2, C + 2);
    }
    // 目前看得到的區域（畫面放大、地圖比外框大時）。
    const st = this.stage;
    if (st && (st.scrollWidth > st.clientWidth + 1 || st.scrollHeight > st.clientHeight + 1)) {
      const s = this.viewScale() * HT / C;
      const vx = (st.scrollLeft - this.canvas.offsetLeft) / s;
      const vy = (st.scrollTop - this.canvas.offsetTop) / s - (TOP / HT) * C;
      g.strokeStyle = MINI.view;
      g.lineWidth = 1;
      g.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round(st.clientWidth / s) - 1, Math.round(st.clientHeight / s) - 1);
    }
  }

  /**
   * 地圖矩形在 .house-view 裡的位置（CSS 像素，已扣掉捲動）。
   * @param {{x: number, y: number, w: number, h: number}} r 地圖矩形。
   * @param {boolean} wall 是否為牆飾（畫在牆面那排）。
   * @returns {{left: number, top: number, width: number, height: number}} 位置。
   */
  viewRect(r, wall) {
    const s = this.viewScale();
    const st = this.stage;
    const sl = st ? st.scrollLeft : 0;
    const stp = st ? st.scrollTop : 0;
    const top = wall ? 0 : TOP + r.y * HT;
    return { left: this.canvas.offsetLeft - sl + r.x * HT * s, top: this.canvas.offsetTop - stp + top * s, width: r.w * HT * s, height: (wall ? TOP + HT : r.h * HT) * s };
  }

  /** 浮動按鈕列跟著虛影（擺放中）或選取的物件；放在物件下方，太靠下時改放上方。 */
  positionFloat() {
    const el = this.float;
    if (!el) return;
    const h = this.ch.home;
    const l = homeLayout(h.level);
    const id = this.placingId();
    let target = null;
    if (this.mode === 'edit' && id && this.preview) target = { r: placedRect({ id, at: this.preview.at, x: this.preview.x, y: this.preview.y }, l), wall: this.preview.at === 'wall' };
    else if (this.mode === 'edit' && this.selected >= 0 && h.placed[this.selected]) target = { r: placedRect(h.placed[this.selected], l), wall: h.placed[this.selected].at === 'wall' };
    el.hidden = !target;
    if (!target) return;
    const v = this.viewRect(target.r, target.wall);
    const box = el.parentElement;
    const fw = el.offsetWidth;
    const fh = el.offsetHeight;
    const vh = this.stage ? this.stage.clientHeight : box.clientHeight;
    let top = v.top + v.height + 6;
    if (top + fh > vh - 4) top = Math.max(4, v.top - fh - 6);
    const left = Math.max(4, Math.min(box.clientWidth - fw - 4, v.left + v.width / 2 - fw / 2));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }

  /** 重畫整個場景。 */
  draw() {
    const g = this.g;
    const h = this.ch.home;
    const l = homeLayout(h.level);
    // 以家園像素座標繪製，畫布本身是 HOUSE_HD 倍解析度。
    g.setTransform(HOUSE_HD, 0, 0, HOUSE_HD, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a1020';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // 地圖列轉成畫布 y。
    const Y = (row) => TOP + row * HT;
    // 庭院草地（含左右兩側）與籬笆。
    for (let j = l.yard.y - 1; j < l.rows; j++) for (let i = 0; i < l.cols; i++) g.drawImage(grassTile(i, j), i * HT, Y(j));
    // 室內地板。
    const floorKey = tileArt(h.tiles.floor) ? h.tiles.floor : 'woodFloor';
    for (let j = 0; j < l.house.h; j++) for (let i = 0; i < l.house.w; i++) g.drawImage(tileArt(floorKey, i, j), (l.house.x + i) * HT, Y(l.house.y + j));
    this.drawWalls(l, h);
    // 田地與作物（成熟的作物閃閃發光）。
    // 畫一塊田地（空地或作物）。
    l.plots.forEach((pl, i) => {
      const plot = h.plots[i];
      const stage = cropStage(plot);
      const art = stage >= 0 ? cropArt(plot.crop, stage) : null;
      g.drawImage(art || soilTile(), pl.x * HT, Y(pl.y) - 8);
      if (stage === 2) this.sparkle(pl.x * HT, Y(pl.y) - 8, i);
    });
    // 動態物件目前的幀。
    const frameNo = (key) => Math.floor(this.time * 4) % homeFrames(key);
    // 擺放物件的圖（染色過的用染色版）。
    const artOf = (p) => (p.dye && GOODS[p.dye] ? dyedArt(p.id, frameNo(p.id), GOODS[p.dye].dye) : homeArt(p.id, frameNo(p.id)));
    // 移動中的物件只畫虛影，原位置不畫（像手遊把建築拿起來）。
    const lifted = this.mode === 'edit' && this.moving >= 0 && this.preview ? h.placed[this.moving] : null;
    // 地毯（最底層）與牆飾。
    for (const p of h.placed) {
      if (p === lifted) continue;
      const place = HOME_ITEMS[p.id].place;
      if (place !== 'rug' && place !== 'wall') continue;
      const art = artOf(p);
      if (!art) continue;
      const r = placedRect(p, l);
      this.blit(art, r.x * HT, place === 'wall' ? Y(0) - 4 : Y(r.y + r.h) - artH(art), p.rot);
    }
    // 家具、小擺設與角色依底部高度排序（下面的蓋住上面的）。
    const sprites = [];
    for (const p of h.placed) {
      const it = HOME_ITEMS[p.id];
      if (p === lifted || (it.place !== 'floor' && it.place !== 'small')) continue;
      const art = artOf(p);
      const r = placedRect(p, l);
      const onTable = it.place === 'small' && h.placed.some((q) => HOME_ITEMS[q.id].top && HOME_ITEMS[q.id].place === 'floor' && placedRect(q, l).x <= r.x && placedRect(q, l).x + placedRect(q, l).w > r.x && placedRect(q, l).y <= r.y && placedRect(q, l).y + placedRect(q, l).h > r.y);
      const base = Y(r.y + r.h);
      sprites.push({
        z: base + (onTable ? 1 : 0),
        // 畫出物件，以及展示架上的裝備、動物的狀態泡泡。
        draw: () => {
          if (art) this.blit(art, r.x * HT, base - artH(art) - (onTable ? TABLE_LIFT : 0), p.rot);
          else this.placeholder(r, Y);
          if (p.show && p.show.length && art) this.drawShelf(p, r, base - artH(art));
          if (it.type === 'animal') this.drawBubble(p, r, Y);
        },
      });
    }
    const p = this.player;
    sprites.push({ z: Y(p.y + 1) - 2, draw: () => this.drawPlayer(p, Y) });
    sprites.sort((a, b) => a.z - b.z);
    for (const s of sprites) s.draw();
    if (this.mode === 'edit') this.drawEdit(l, h, Y);
  }

  /**
   * 牆：最上排的牆面（套用牆面樣式）、左右與下方的牆頂（俯視的深色牆頂），以及下方中間的門。
   * @param {object} l 配置。
   * @param {object} h 家園資料。
   */
  drawWalls(l, h) {
    const g = this.g;
    const wallKey = tileArt(h.tiles.wall) ? h.tiles.wall : 'woodWall';
    for (let i = 0; i < l.house.w; i++) g.drawImage(tileArt(wallKey, i, 0), (l.house.x + i) * HT, 0);
    const cap = ramp('#4a3a32');
    // 畫一段俯視的牆頂（上緣亮、下緣暗）。
    const capCell = (x, y, w, hh) => {
      rect(g, x, y, w, hh, cap.b);
      rect(g, x, y, w, 2, cap.l);
      rect(g, x, y + hh - 2, w, 2, cap.d);
    };
    // 左右牆（含最上排的角落），與下方牆。
    capCell(0, 0, HT, TOP + (l.house.h + 1) * HT);
    capCell((l.cols - 1) * HT, 0, HT, TOP + (l.house.h + 1) * HT);
    rect(g, HT - 2, TOP + HT, 2, l.house.h * HT, cap.o);
    rect(g, (l.cols - 1) * HT, TOP + HT, 2, l.house.h * HT, cap.o);
    const by = TOP + l.door.y * HT;
    capCell(0, by, l.cols * HT, HT);
    // 門：門框、打開的門板與門前的腳踏墊。
    const dx = l.door.x * HT;
    rect(g, dx, by, HT, HT, R.darkWood.o);
    rect(g, dx + 3, by, HT - 6, HT, R.wood.b);
    g.drawImage(tileArt(tileArt(h.tiles.floor) ? h.tiles.floor : 'woodFloor', 0, 0), 0, 0, HT - 6, HT, dx + 3, by, HT - 6, HT);
    rect(g, dx, by, 3, HT, R.darkWood.b);
    rect(g, dx + HT - 3, by, 3, HT, R.darkWood.b);
    rect(g, dx + 1, by, 1, HT, R.darkWood.l);
    rect(g, dx + 5, by + 20, HT - 10, 8, R.red.d);
    rect(g, dx + 6, by + 21, HT - 12, 6, R.red.b);
  }

  /**
   * 畫一張圖（翻轉時左右鏡射）。
   * @param {HTMLCanvasElement} art 圖。
   * @param {number} x x。
   * @param {number} y y。
   * @param {number} rot 1 為翻轉。
   */
  blit(art, x, y, rot) {
    const g = this.g;
    // 高密度的圖縮回一般大小（地圖畫布放大顯示時保留細節）。
    const dn = art.density || 1;
    const w = art.width / dn;
    const h = art.height / dn;
    if (!rot) {
      g.drawImage(art, x, y, w, h);
      return;
    }
    g.save();
    g.translate(x + w, y);
    g.scale(-1, 1);
    g.drawImage(art, 0, 0, w, h);
    g.restore();
  }

  /**
   * 成熟作物上的閃光（幾個十字星輪流亮起）。
   * @param {number} x 作物圖左上 x。
   * @param {number} y 作物圖左上 y。
   * @param {number} seed 每塊田不同的相位。
   */
  sparkle(x, y, seed) {
    const g = this.g;
    const t = this.time * 2 + seed * 0.7;
    for (let k = 0; k < 3; k++) {
      const a = (Math.sin(t + k * 2.1) + 1) / 2;
      if (a < 0.55) continue;
      const sx = x + 6 + ((k * 11 + seed * 5) % 20);
      const sy = y + 4 + ((k * 7 + seed * 3) % 14);
      g.globalAlpha = a;
      rect(g, sx - 2, sy, 5, 1, '#fff8c0');
      rect(g, sx, sy - 2, 1, 5, '#fff8c0');
      px(g, sx, sy, '#ffffff');
    }
    g.globalAlpha = 1;
  }

  /**
   * 展示架上的裝備（每件放大 2 倍，排在架子上）。
   * @param {object} p 展示架的擺放資料。
   * @param {{x: number, y: number, w: number, h: number}} r 佔用的地圖格。
   * @param {number} top 展示架圖的上緣（畫布 y）。
   */
  drawShelf(p, r, top) {
    const g = this.g;
    // 畫一件展示的裝備。
    p.show.forEach((item, k) => {
      const art = this.hooks.itemArt && this.hooks.itemArt(item);
      if (!art) return;
      // 高密度的道具圖（density）換算成相同的顯示大小。
      const w = (art.width * 2) / (art.density || 1);
      const hh = (art.height * 2) / (art.density || 1);
      const cx = r.x * HT + (r.w * HT * (k + 1)) / (p.show.length + 1);
      g.drawImage(art, Math.round(cx - w / 2), Math.round(top + 14 - hh / 2), w, hh);
    });
  }

  /**
   * 動物頭上的泡泡：有產物時顯示產物圖示，沒有飼料時顯示牧草圖示。
   * @param {object} p 動物的擺放資料。
   * @param {{x: number, y: number, w: number, h: number}} r 佔用的地圖格。
   * @param {(row: number) => number} Y 列轉像素。
   */
  drawBubble(p, r, Y) {
    const st = animalState(p);
    const icon = st.ready ? iconArt(ANIMALS[p.id].product) : st.hungry ? iconArt(RANCH.feed) : null;
    if (!icon) return;
    const g = this.g;
    const bob = Math.round(Math.sin(this.time * 3) * 1.5);
    const x = r.x * HT + r.w * HT - 22;
    const y = Y(r.y) - 18 + bob;
    rect(g, x, y, 22, 20, '#3a2a3a');
    rect(g, x + 1, y + 1, 20, 18, st.ready ? '#fff8e8' : '#ffe0e0');
    rect(g, x + 8, y + 20, 6, 2, '#3a2a3a');
    rect(g, x + 9, y + 19, 4, 1, st.ready ? '#fff8e8' : '#ffe0e0');
    g.drawImage(icon, x + 3, y + 2, 16, 16);
    if (st.ready > 1) {
      rect(g, x + 15, y - 3, 9, 9, '#c0303a');
      g.fillStyle = '#ffffff';
      g.font = 'bold 8px sans-serif';
      g.fillText(String(st.ready), x + 17, y + 4);
    }
  }

  /**
   * 還沒有美術的物件：稀有度顏色的方塊。
   * @param {{x: number, y: number, w: number, h: number}} r 佔用的地圖格。
   * @param {(row: number) => number} Y 列轉像素。
   */
  placeholder(r, Y) {
    const g = this.g;
    rect(g, r.x * HT + 4, Y(r.y) + 4, r.w * HT - 8, r.h * HT - 8, R.purple.d);
    rect(g, r.x * HT + 6, Y(r.y) + 6, r.w * HT - 12, r.h * HT - 12, R.purple.b);
  }

  /**
   * 角色（2 倍大的職業圖，走路時換腳；面向左時鏡射）。
   * @param {object} p 角色位置。
   * @param {(row: number) => number} Y 列轉像素。
   */
  drawPlayer(p, Y) {
    const art = heroArt(this.ch.cls);
    const cycle = [1, 0, 2, 0];
    const f = p.walk > 0 ? art.frames[cycle[Math.floor(p.walk * 8) % 4]] : art.frames[0];
    const w = (f.width * 2) / art.density;
    const hh = (f.height * 2) / art.density;
    const x = Math.round(p.x * HT + (HT - w) / 2);
    // 角色圖腳底以下留有特效用的列，往下移回讓腳踩在地上。
    const y = Math.round(Y(p.y + 1) - hh - 2 + (art.foot * 2) / art.density);
    const g = this.g;
    g.globalAlpha = 0.3;
    ellipse(g, p.x * HT + HT / 2, Y(p.y + 1) - 3, 10, 3, '#000000');
    g.globalAlpha = 1;
    g.save();
    if (p.face < 0) {
      g.translate(x + w, y);
      g.scale(-1, 1);
      g.drawImage(f, 0, 0, w, hh);
    } else g.drawImage(f, x, y, w, hh);
    g.restore();
  }

  /**
   * 佈置模式：可擺放範圍的格線、選取物件的外框與擺放預覽（綠色可以擺、紅色不行）。
   * @param {object} l 配置。
   * @param {object} h 家園資料。
   * @param {(row: number) => number} Y 列轉像素。
   */
  drawEdit(l, h, Y) {
    const g = this.g;
    g.globalAlpha = 0.18;
    for (const a of [l.house, l.yard]) {
      for (let i = 0; i <= a.w; i++) rect(g, (a.x + i) * HT, Y(a.y), 1, a.h * HT, '#ffffff');
      for (let j = 0; j <= a.h; j++) rect(g, a.x * HT, Y(a.y + j), a.w * HT, 1, '#ffffff');
    }
    g.globalAlpha = 1;
    if (this.selected >= 0 && h.placed[this.selected] && !this.placingId()) {
      const r = placedRect(h.placed[this.selected], l);
      const y = h.placed[this.selected].at === 'wall' ? Y(0) : Y(r.y);
      g.strokeStyle = Math.floor(this.time * 3) % 2 ? '#ffe14d' : '#ffffff';
      g.lineWidth = 2;
      g.strokeRect(r.x * HT + 1, y + 1, r.w * HT - 2, r.h * HT - 2);
    }
    const pv = this.preview;
    const id = this.placingId();
    if (pv && id) {
      const r = placedRect({ id, at: pv.at, x: pv.x, y: pv.y }, l);
      const y = pv.at === 'wall' ? Y(0) : Y(r.y);
      const hh = pv.at === 'wall' ? TOP + HT : r.h * HT;
      const color = pv.ok ? '#4fe078' : '#e04a5a';
      // 佔用的格子：每格一個半透明方塊與外框（手遊式的地基）。
      for (let j = 0; j < (pv.at === 'wall' ? 1 : r.h); j++) {
        for (let i = 0; i < r.w; i++) {
          const cy = pv.at === 'wall' ? y : y + j * HT;
          const ch = pv.at === 'wall' ? hh : HT;
          g.globalAlpha = 0.35;
          rect(g, (r.x + i) * HT + 1, cy + 1, HT - 2, ch - 2, color);
          g.globalAlpha = 0.9;
          g.strokeStyle = color;
          g.lineWidth = 1;
          g.strokeRect((r.x + i) * HT + 1.5, cy + 1.5, HT - 3, ch - 3);
        }
      }
      g.globalAlpha = 1;
      // 物件虛影（上下輕輕浮動，表示還沒放下）。
      const lift = this.moving >= 0 ? h.placed[this.moving] : null;
      const art = lift && lift.dye && GOODS[lift.dye] ? dyedArt(id, 0, GOODS[lift.dye].dye) : homeArt(id);
      if (art) {
        const bob = Math.round(Math.sin(this.time * 5) * 1.5) - 3;
        g.globalAlpha = 0.85;
        this.blit(art, r.x * HT, (pv.at === 'wall' ? Y(0) - 4 : Y(r.y + r.h) - artH(art)) + bob, lift ? lift.rot : 0);
        g.globalAlpha = 1;
      }
      // 外框（擺放中的整體範圍）。
      g.strokeStyle = Math.floor(this.time * 3) % 2 ? color : '#ffffff';
      g.lineWidth = 2;
      g.strokeRect(r.x * HT + 1, y + 1, r.w * HT - 2, hh - 2);
    }
  }
}

