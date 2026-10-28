// 主程式：首頁、關卡列表、遊戲畫面、盤面繪製與動畫、操作、提示、星等與解鎖、物理小知識、計時、離線狀態。

import { initialState, applyMove, T } from './engine.js';
import { walkPath, solve } from './solver.js';
import { CHAPTERS, LEVELS } from './levels-data.js';
import { SPRITES } from './sprites.js';
import { TIPS, tipsForLevel } from './tips.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';
import { starsFor, chapterUnlocked, levelUnlocked, chapterSummary, chapterLevels } from './progress.js';

/** 每關提示次數。 */
const HINTS_PER_LEVEL = 3;
/** 按住方向鍵時，第一次重複前的等待與之後的重複間隔（毫秒）。 */
const REPEAT_DELAY = 280;
const REPEAT_INTERVAL = 140;
/** 滑動判定的最小距離（CSS px）。 */
const SWIPE_MIN = 28;
/** 暫時訊息顯示時間。 */
const MESSAGE_MS = 2500;
/** 提示求解逾時。 */
const HINT_TIMEOUT = 10000;
/** 操作箭頭符號。 */
const ARROW = { L: '←', R: '→', U: '↑', D: '↓' };

/**
 * 依 id 取得元素。
 * @param {string} id 元素 id。
 * @returns {HTMLElement} 元素。
 */
const $ = (id) => document.getElementById(id);

const els = {
  home: $('home'),
  chapter: $('chapter'),
  game: $('game'),
  themeBtn: $('theme-btn'),
  offlineStatus: $('offline-status'),
  homeNotice: $('home-notice'),
  continueBtn: $('continue-btn'),
  continueDetail: $('continue-detail'),
  chapterList: $('chapter-list'),
  portalLink: $('portal-link'),
  bookBtn: $('book-btn'),
  statsBtn: $('stats-btn'),
  rulesBtn: $('rules-btn'),
  chapterBackBtn: $('chapter-back-btn'),
  chapterTitle: $('chapter-title'),
  chapterStars: $('chapter-stars'),
  chapterTheme: $('chapter-theme'),
  levelGrid: $('level-grid'),
  gameBackBtn: $('game-back-btn'),
  levelName: $('level-name'),
  steps: $('steps'),
  timer: $('timer'),
  menuBtn: $('menu-btn'),
  levelHint: $('level-hint'),
  boardWrap: $('board-wrap'),
  board: $('board'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  message: $('game-message'),
  undoBtn: $('undo-btn'),
  restartBtn: $('restart-btn'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  loading: $('loading'),
  modal: $('modal'),
  modalTitle: $('modal-title'),
  modalBody: $('modal-body'),
  modalActions: $('modal-actions'),
  updateBanner: $('update-banner'),
  updateBtn: $('update-btn'),
};

const levelIndex = new Map(LEVELS.map((l, i) => [l.id, i]));

/** 執行期狀態。 */
const app = {
  screen: 'home',
  chapter: 1,
  level: null,
  state: null,
  history: [],
  steps: 0,
  hintsUsed: 0,
  elapsedMs: 0,
  touched: false,
  running: false,
  segmentStart: 0,
  tickTimer: 0,
  paused: false,
  anim: null,
  winPending: false,
  queue: [],
  cell: 40,
  view: null,
  lastMoveAt: 0,
  facing: 'R',
  message: '',
  messageKind: '',
  messageTimer: 0,
  settings: store.loadSettings(),
  registration: null,
  updateRequested: false,
  modalResolve: null,
};

// ---------- 共用工具 ----------

/**
 * 將毫秒格式化為 mm:ss，超過 1 小時為 h:mm:ss。
 * @param {number} ms 毫秒。
 * @returns {string} 時間字串。
 */
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * 等待指定毫秒。
 * @param {number} ms 毫秒。
 * @returns {Promise<void>} 等待完成。
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 判斷系統是否要求減少動態效果。
 * @returns {boolean} 要求時為 true。
 */
function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 取得章節資訊。
 * @param {number} ch 章節編號。
 * @returns {object} 章節。
 */
function chapterInfo(ch) {
  return CHAPTERS.find((c) => c.chapter === ch);
}

// ---------- 計時與存檔 ----------

/**
 * 取得目前累計耗時。
 * @returns {number} 毫秒。
 */
function currentElapsed() {
  return app.elapsedMs + (app.running ? performance.now() - app.segmentStart : 0);
}

/** 立即存檔目前關卡。 */
function persist() {
  if (!app.level || !app.state || app.state.won) return;
  store.writeSave({
    levelId: app.level.id,
    difficulty: chapterInfo(app.level.chapter).difficulty,
    state: app.state,
    steps: app.steps,
    hintsUsed: app.hintsUsed,
    elapsedMs: currentElapsed(),
    touched: app.touched,
  });
}

/** 開始計時。 */
function startTimer() {
  if (app.running || !app.state || app.state.won || app.paused) return;
  app.running = true;
  app.segmentStart = performance.now();
  app.tickTimer = setInterval(renderHud, 1000);
  renderHud();
}

/**
 * 停止計時並累加這一段時間。
 * @param {boolean} [save=true] 是否存檔。
 */
function stopTimer(save = true) {
  if (app.running) {
    app.elapsedMs += performance.now() - app.segmentStart;
    app.running = false;
    clearInterval(app.tickTimer);
  }
  if (save) persist();
  renderHud();
}

// ---------- 主題 ----------

const THEME_LABEL = { system: '主題：跟隨系統', light: '主題：淺色', dark: '主題：深色' };

/**
 * 取得滑動操作開關的選單文字。
 * @returns {string} 文字。
 */
function swipeLabel() {
  return `滑動操作：${app.settings.swipe ? '開' : '關'}`;
}

/** 套用主題。 */
function applyTheme() {
  const { theme } = app.settings;
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  els.themeBtn.textContent = THEME_LABEL[theme];
}

/** 切換主題。 */
function cycleTheme() {
  const order = ['system', 'light', 'dark'];
  app.settings.theme = order[(order.indexOf(app.settings.theme) + 1) % order.length];
  store.saveSettings(app.settings);
  applyTheme();
}

// ---------- 對話框 ----------

/**
 * 開啟對話框並等待使用者選擇。
 * @param {object} options 選項。
 * @param {string} options.title 標題。
 * @param {string} [options.html] 內容 HTML（僅限程式內建字串）。
 * @param {{label: string, value: any, className?: string}[]} [options.menu] 直向選單。
 * @param {{label: string, value: any, className?: string}[]} [options.actions] 底部按鈕。
 * @param {any} [options.dismissValue=null] 點背景或按 Esc 時的回傳值。
 * @returns {Promise<any>} 選擇的值。
 */
function openModal({ title, html = '', menu = [], actions = [], dismissValue = null }) {
  closeModal(dismissValue);
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html;
  els.modalActions.innerHTML = '';
  /**
   * 建立按鈕。
   * @param {{label: string, value: any, className?: string}} item 設定。
   * @returns {HTMLButtonElement} 按鈕。
   */
  const makeButton = (item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.label;
    if (item.className) b.className = item.className;
    b.addEventListener('click', () => closeModal(item.value));
    return b;
  };
  if (menu.length) {
    const list = document.createElement('div');
    list.className = 'menu-list';
    menu.forEach((item) => list.appendChild(makeButton(item)));
    els.modalBody.appendChild(list);
  }
  actions.forEach((item) => els.modalActions.appendChild(makeButton(item)));
  els.modalActions.hidden = actions.length === 0;
  els.modal.hidden = false;
  els.modal.dataset.dismiss = JSON.stringify(dismissValue);
  const first = els.modal.querySelector('button.primary') || els.modal.querySelector('button');
  if (first) first.focus({ preventScroll: true });
  return new Promise((resolve) => {
    app.modalResolve = resolve;
  });
}

/**
 * 關閉對話框。
 * @param {any} value 回傳值。
 */
function closeModal(value) {
  if (els.modal.hidden) return;
  els.modal.hidden = true;
  const resolve = app.modalResolve;
  app.modalResolve = null;
  if (resolve) resolve(value);
}

/**
 * 顯示確認對話框。
 * @param {string} title 標題。
 * @param {string} text 說明。
 * @param {string} okLabel 確認按鈕文字。
 * @returns {Promise<boolean>} 是否確認。
 */
async function confirmDialog(title, text, okLabel) {
  const v = await openModal({
    title,
    html: `<p>${text}</p>`,
    actions: [
      { label: '取消', value: false },
      { label: okLabel, value: true, className: 'danger' },
    ],
    dismissValue: false,
  });
  return v === true;
}

/**
 * 顯示一張物理小知識卡。
 * @param {object} tip 小知識。
 * @param {string} [okLabel='知道了'] 按鈕文字。
 * @returns {Promise<any>} 關閉後完成。
 */
function showTip(tip, okLabel = '知道了') {
  return openModal({
    title: `物理小知識：${tip.title}`,
    html: `<div class="tip-card"><div class="tip-art">${SPRITES[tip.sprite]}</div><div><p>${tip.text}</p></div></div>
      <p class="tip-example">生活例子：${tip.example}</p>`,
    actions: [{ label: okLabel, value: true, className: 'primary' }],
    dismissValue: true,
  });
}

// ---------- 訊息 ----------

/**
 * 顯示訊息。
 * @param {string} text 訊息。
 * @param {'' | 'error' | 'hint'} [kind=''] 樣式。
 * @param {boolean} [sticky=false] 是否保留到下一次操作。
 */
function showMessage(text, kind = '', sticky = false) {
  app.message = text;
  app.messageKind = kind;
  clearTimeout(app.messageTimer);
  if (!sticky) {
    app.messageTimer = setTimeout(() => {
      app.message = '';
      app.messageKind = '';
      renderMessage();
    }, MESSAGE_MS);
  }
  renderMessage();
}

/** 清除訊息。 */
function clearMessage() {
  clearTimeout(app.messageTimer);
  app.message = '';
  app.messageKind = '';
  renderMessage();
}

/** 更新訊息列。 */
function renderMessage() {
  let text = app.message;
  let kind = app.messageKind;
  if (!text && app.state && app.state.dead) {
    text = '✕ 滾滾掉進水裡了！請復原或重新開始';
    kind = 'error';
  }
  els.message.textContent = text;
  els.message.className = `game-message${kind ? ` ${kind}` : ''}`;
}

// ---------- 畫面切換 ----------

/**
 * 顯示指定畫面。
 * @param {'home' | 'chapter' | 'game'} name 畫面名稱。
 */
function setScreen(name) {
  app.screen = name;
  els.home.hidden = name !== 'home';
  els.chapter.hidden = name !== 'chapter';
  els.game.hidden = name !== 'game';
  // 關卡列表與遊戲畫面使用明亮的天空、白雲與山丘背景。
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
}

/** 顯示首頁。 */
function showHome() {
  leaveGame();
  setScreen('home');
  renderHome();
}

/**
 * 顯示章節的關卡列表。
 * @param {number} ch 章節編號。
 */
function showChapter(ch) {
  leaveGame();
  app.chapter = ch;
  setScreen('chapter');
  renderChapter();
}

/** 離開遊戲畫面時停止計時並存檔。 */
function leaveGame() {
  if (app.screen === 'game') {
    fastForward();
    stopTimer();
    app.queue = [];
    app.paused = false;
    els.pauseCover.hidden = true;
  }
}

/**
 * 進入下一層畫面並記錄瀏覽歷史，讓返回鍵回到上一層。
 * @param {'chapter' | 'game'} screen 畫面。
 */
function pushScreen(screen) {
  if (!history.state || history.state.screen !== screen) history.pushState({ screen }, '');
}

/** 由畫面上的返回按鈕回到上一層（經由瀏覽歷史）。 */
function goBack() {
  if (history.state && history.state.screen) history.back();
  else if (app.screen === 'game') showChapter(app.level ? app.level.chapter : app.chapter);
  else showHome();
}

// ---------- 首頁與關卡列表 ----------

/** 繪製首頁的章節卡片與繼續遊戲。 */
function renderHome() {
  const progress = store.loadProgress();
  els.chapterList.innerHTML = '';
  for (const ch of CHAPTERS) {
    const sum = chapterSummary(ch.chapter, progress);
    const unlocked = chapterUnlocked(ch.chapter, progress);
    const icon = { 1: 'box', 2: 'water', 3: 'ice', 4: 'spring' }[ch.chapter];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chapter-card${unlocked ? '' : ' locked'}`;
    b.innerHTML = `<span class="chapter-icon">${SPRITES[icon]}</span>
      <span class="chapter-text">
        <span class="chapter-label">第 ${ch.chapter} 章</span>
        <span class="chapter-name">${ch.title}</span>
        <span class="chapter-sub">${unlocked ? `已過關 ${sum.cleared} / ${sum.total}` : `🔒 通過第 ${ch.chapter - 1} 章第 15 關後解鎖`}</span>
        <span class="progress-bar"><span style="width:${(sum.cleared / sum.total) * 100}%"></span></span>
      </span>
      <span class="chapter-stars">★ ${sum.stars}/${sum.max}</span>`;
    b.addEventListener('click', () => {
      if (!unlocked) {
        openModal({ title: '尚未解鎖', html: `<p>通過第 ${ch.chapter - 1} 章第 15 關後，就能進入第 ${ch.chapter} 章。</p>`, actions: [{ label: '好', value: null, className: 'primary' }] });
        return;
      }
      pushScreen('chapter');
      showChapter(ch.chapter);
    });
    els.chapterList.appendChild(b);
  }
  const saved = store.loadSave((id) => levelIndex.has(id));
  if (saved.status === 'ok') {
    const level = LEVELS[levelIndex.get(saved.save.levelId)];
    els.continueDetail.textContent = `${level.id} ${level.title} · ${saved.save.steps} 步 · ${formatTime(saved.save.elapsedMs)}`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
}

/** 繪製關卡列表。 */
function renderChapter() {
  const progress = store.loadProgress();
  const info = chapterInfo(app.chapter);
  const sum = chapterSummary(app.chapter, progress);
  els.chapterTitle.textContent = `第 ${info.chapter} 章`;
  els.chapterStars.textContent = `★ ${sum.stars}/${sum.max}`;
  els.chapterTheme.textContent = `${info.title}・已過關 ${sum.cleared} / ${sum.total}`;
  els.levelGrid.innerHTML = '';
  const saved = store.loadSave((id) => levelIndex.has(id));
  for (const level of chapterLevels(app.chapter)) {
    const unlocked = levelUnlocked(level, progress);
    const p = progress[level.id];
    const b = document.createElement('button');
    b.type = 'button';
    const current = saved.status === 'ok' && saved.save.levelId === level.id;
    const state = !unlocked ? ' locked' : p ? (p.stars === 3 ? ' cleared perfect' : ' cleared') : ' open';
    b.className = `level-btn${state}${current ? ' current' : ''}`;
    const num = Number(level.id.split('-')[1]);
    b.innerHTML = unlocked ? `${num}<small>${p ? '★'.repeat(p.stars) + '☆'.repeat(3 - p.stars) : '☆☆☆'}</small>` : `🔒<small>${num}</small>`;
    b.setAttribute('aria-label', `${level.id} ${level.title}${unlocked ? (p ? `，${p.stars} 星` : '') : '，未解鎖'}`);
    b.addEventListener('click', () => {
      if (!unlocked) {
        showLockedLevel();
        return;
      }
      openLevel(level);
    });
    els.levelGrid.appendChild(b);
  }
}

/** 說明關卡尚未解鎖。 */
function showLockedLevel() {
  openModal({ title: '尚未解鎖', html: '<p>先通過前一關，就能挑戰這一關。</p>', actions: [{ label: '好', value: null, className: 'primary' }] });
}

// ---------- 開始關卡 ----------

/**
 * 開啟關卡：有存檔時接續，否則從頭開始（目前有其他已操作的關卡時先確認）。
 * @param {object} level 關卡。
 */
async function openLevel(level) {
  const saved = store.loadSave((id) => levelIndex.has(id));
  if (saved.status === 'ok' && saved.save.levelId === level.id) {
    resumeLevel(saved.save);
    return;
  }
  if (saved.status === 'ok' && saved.save.touched) {
    const other = LEVELS[levelIndex.get(saved.save.levelId)];
    const ok = await confirmDialog('開始這一關？', `「${other.id} ${other.title}」進行到一半，開始新的關卡會放棄它（已得到的星星不受影響）。`, '開始');
    if (!ok) return;
  }
  await startLevel(level);
}

/**
 * 從頭開始一關。
 * @param {object} level 關卡。
 */
async function startLevel(level) {
  app.level = level;
  app.view = null;
  app.facing = 'R';
  app.anim = null;
  app.winPending = false;
  app.state = initialState(level.rows);
  app.history = [];
  app.steps = 0;
  app.hintsUsed = 0;
  app.elapsedMs = 0;
  app.touched = false;
  app.queue = [];
  app.paused = false;
  clearMessage();
  store.recordStart(chapterInfo(level.chapter).difficulty);
  persist();
  await showNewTips(level);
  enterGame();
}

/**
 * 從存檔接續一關。
 * @param {object} save 存檔。
 */
function resumeLevel(save) {
  app.level = LEVELS[levelIndex.get(save.levelId)];
  app.view = null;
  app.facing = 'R';
  app.anim = null;
  app.winPending = false;
  app.state = save.state;
  app.history = [];
  app.steps = save.steps;
  app.hintsUsed = save.hintsUsed;
  app.elapsedMs = save.elapsedMs;
  app.touched = !!save.touched;
  app.queue = [];
  app.paused = false;
  clearMessage();
  enterGame();
}

/**
 * 顯示本關新出現物件的物理小知識，並收錄到物理圖鑑。
 * @param {object} level 關卡。
 */
async function showNewTips(level) {
  const book = store.loadBook();
  const fresh = tipsForLevel(level).filter((k) => !book.has(k));
  for (const key of fresh) {
    await showTip(TIPS.find((t) => t.key === key), '開始挑戰');
    store.addToBook([key]);
  }
}

/** 進入遊戲畫面。 */
function enterGame() {
  if (app.screen !== 'game') {
    if (!history.state || history.state.screen !== 'chapter') pushScreen('chapter');
    pushScreen('game');
  }
  app.chapter = app.level.chapter;
  setScreen('game');
  els.pauseCover.hidden = true;
  els.levelName.textContent = `${app.level.id} ${app.level.title}`;
  els.levelHint.textContent = app.level.hint;
  els.levelHint.hidden = !app.level.hint;
  buildBoard();
  renderAll();
  startTimer();
}

// ---------- 盤面繪製 ----------

/** 依畫面大小建立盤面：地形格與角色、物件。 */
function buildBoard() {
  const s = app.state;
  const wrap = els.boardWrap.getBoundingClientRect();
  const cell = Math.max(20, Math.min(64, Math.floor(Math.min(wrap.width / s.w, wrap.height / s.h))));
  app.cell = cell;
  const board = els.board;
  board.innerHTML = '';
  board.style.width = `${cell * s.w}px`;
  board.style.height = `${cell * s.h}px`;
  board.style.setProperty('--cell', `${cell}px`);
  const terrainEls = [];
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const t = s.terrain[y * s.w + x];
      const d = document.createElement('div');
      d.className = 'cell';
      d.style.cssText = `left:${x * cell}px;top:${y * cell}px;width:${cell}px;height:${cell}px`;
      board.appendChild(d);
      terrainEls.push(d);
      paintTerrain(d, s, x, y, t);
    }
  }
  const objectEls = s.objects.map((o) => {
    const d = document.createElement('div');
    d.className = `entity obj-${o.type}`;
    d.style.width = d.style.height = `${cell}px`;
    d.innerHTML = SPRITES[{ B: 'box', S: 'stone', I: 'ice', O: 'balloon' }[o.type]];
    board.appendChild(d);
    return d;
  });
  const player = document.createElement('div');
  player.className = 'entity player';
  player.style.width = player.style.height = `${cell}px`;
  player.innerHTML = `<div class="ball">${SPRITES.player}</div>`;
  board.appendChild(player);
  app.view = { terrainEls, objectEls, player, ball: player.firstElementChild, look: 'normal', terrain: s.terrain.slice() };
}

/**
 * 繪製一格地形。
 * @param {HTMLElement} d 格子元素。
 * @param {object} s 狀態。
 * @param {number} x 橫座標。
 * @param {number} y 縱座標。
 * @param {number} t 地形代碼。
 */
function paintTerrain(d, s, x, y, t) {
  d.className = 'cell';
  d.innerHTML = '';
  if (t === T.WALL) {
    d.classList.add('wall');
    const above = y > 0 ? s.terrain[(y - 1) * s.w + x] : T.WALL;
    if (above !== T.WALL) d.classList.add('top');
  } else if (t === T.LADDER) d.innerHTML = SPRITES.ladder;
  else if (t === T.WATER) d.innerHTML = SPRITES.water;
  else if (t === T.GOAL) d.innerHTML = SPRITES.goal;
  else if (t === T.CRUMBLE) d.innerHTML = SPRITES.crumble;
  else if (t === T.SPRING) d.innerHTML = SPRITES.spring;
}

/**
 * 依狀態更新角色與物件的位置、已碎裂的易碎磚。
 * @param {object} s 狀態。
 */
function renderEntities(s) {
  const v = app.view;
  if (!v) return;
  const c = app.cell;
  s.objects.forEach((o, i) => {
    const el = v.objectEls[i];
    if (el) el.style.transform = `translate(${o.x * c}px, ${o.y * c}px)`;
  });
  v.player.style.transform = `translate(${s.player.x * c}px, ${s.player.y * c}px)`;
  v.ball.style.transform = faceTransform();
  const look = s.dead ? 'dizzy' : s.won ? 'happy' : 'normal';
  if (v.look !== look) {
    v.look = look;
    v.ball.innerHTML = SPRITES[{ normal: 'player', happy: 'playerHappy', dizzy: 'playerDizzy' }[look]];
  }
  v.player.classList.toggle('hover', !!s.hover);
  v.player.classList.toggle('dead', !!s.dead);
  renderTerrain(s);
}

/**
 * 取得滾滾面向的 transform：往左走時水平翻轉。
 * @param {string} [extra=''] 附加在後面的 transform。
 * @returns {string} transform 字串。
 */
function faceTransform(extra = '') {
  return `${app.facing === 'L' ? 'scaleX(-1)' : 'scaleX(1)'}${extra ? ` ${extra}` : ''}`;
}

/**
 * 只更新有變化的地形格（例如被壓碎的易碎磚）。
 * @param {object} s 狀態。
 */
function renderTerrain(s) {
  const v = app.view;
  if (!v) return;
  for (let i = 0; i < s.terrain.length; i++) {
    if (s.terrain[i] !== v.terrain[i]) {
      paintTerrain(v.terrainEls[i], s, i % s.w, Math.floor(i / s.w), s.terrain[i]);
      v.terrain[i] = s.terrain[i];
    }
  }
}

/** 更新上方資訊與按鈕狀態。 */
function renderHud() {
  els.steps.textContent = `${app.steps} 步`;
  els.timer.textContent = formatTime(currentElapsed());
  const left = HINTS_PER_LEVEL - app.hintsUsed;
  els.hintCount.textContent = String(left);
  els.hintBtn.setAttribute('aria-label', `提示，剩餘 ${left} 次`);
  els.undoBtn.disabled = app.history.length === 0;
}

/** 重繪整個遊戲畫面。 */
function renderAll() {
  if (!app.state) return;
  renderEntities(app.state);
  renderHud();
  renderMessage();
}

// ---------- 操作 ----------

/**
 * 判斷目前能否操作。
 * @returns {boolean} 可操作時為 true。
 */
function canPlay() {
  return (
    app.screen === 'game' &&
    !!app.state &&
    !!app.view &&
    app.view.terrain.length === app.state.terrain.length &&
    !app.state.won &&
    !app.paused &&
    !app.winPending &&
    els.modal.hidden &&
    els.loading.hidden
  );
}

/**
 * 執行一步移動。動畫進行中時，先把目前的動畫直接跳到結束，再立即執行新的操作，
 * 讓每次按鍵都馬上有反應。
 * @param {'L' | 'R' | 'U' | 'D'} move 操作。
 * @param {boolean} [fromQueue=false] 是否為自動行走佇列中的下一步（玩家的新操作會中斷自動行走）。
 * @returns {boolean | undefined} 操作有效為 true、無效為 false、目前不能操作為 undefined。
 */
function doMove(move, fromQueue = false) {
  if (!canPlay()) return undefined;
  if (!fromQueue) app.queue = [];
  fastForward();
  if (app.state.dead) {
    showMessage('滾滾掉進水裡了，請先復原或重新開始', 'error');
    return false;
  }
  const frames = [];
  const prev = app.state;
  const r = applyMove(prev, move, frames);
  if (!r.ok) {
    app.queue = [];
    showMessage(r.reason, 'error');
    if (move === 'L' || move === 'R') {
      app.facing = move;
      if (app.view) app.view.ball.style.transform = faceTransform();
    }
    nudge(move);
    return false;
  }
  if (move === 'L' || move === 'R') app.facing = move;
  app.history.push(prev);
  app.state = r.state;
  app.steps++;
  app.touched = true;
  app.lastMoveAt = performance.now();
  if (app.messageKind !== 'error' || !app.state.dead) clearMessage();
  persist();
  renderHud();
  const done = animateMove(prev, frames, r.state);
  if (r.state.won) {
    app.queue = [];
    app.winPending = true;
    done.then(() => sleep(150)).then(() => {
      app.winPending = false;
      finishLevel();
    });
  } else if (r.state.dead) {
    app.queue = [];
    done.then(renderMessage);
  } else {
    done.then(() => {
      if (app.queue.length && !app.anim) doMove(app.queue.shift(), true);
    });
  }
  return true;
}

/**
 * 計算每個動畫影格的長度：第一格（走路或推動）較長，之後的重力影格逐漸加快，像自由落體一樣加速。
 * @param {object[]} frames 影格。
 * @returns {number[]} 毫秒。
 */
function frameDurations(frames) {
  return frames.map((f, i) => (i === 0 ? 130 : Math.max(38, Math.round(115 / Math.sqrt(i + 1)))));
}

/**
 * 以連續的關鍵影格播放一次操作：每個角色或物件沿著自己的路徑平順移動，滾滾移動時同時滾動。
 * @param {object} prev 操作前的狀態。
 * @param {object[]} frames 影格。
 * @param {object} final 最終狀態。
 * @returns {Promise<void>} 播放完成（或被跳過）時完成。
 */
function animateMove(prev, frames, final) {
  const v = app.view;
  if (!v || reducedMotion() || frames.length === 0) {
    renderEntities(final);
    return Promise.resolve();
  }
  const durations = frameDurations(frames);
  const total = durations.reduce((a, b) => a + b, 0);
  const times = [0];
  durations.forEach((d) => times.push(times[times.length - 1] + d));
  const offsets = times.map((t) => t / total);
  const seq = [prev, ...frames];
  const c = app.cell;
  const animations = [];
  /**
   * 為一個元素建立關鍵影格動畫；位置完全沒變時不播放。
   * @param {HTMLElement} el 元素。
   * @param {string[]} values 每個影格的 transform。
   */
  const play = (el, values) => {
    if (!el || values.every((t) => t === values[0])) return;
    const keyframes = values.map((transform, i) => ({ transform, offset: offsets[i] }));
    animations.push(el.animate(keyframes, { duration: total, easing: 'linear', fill: 'forwards' }));
  };
  prev.objects.forEach((o, i) => play(v.objectEls[i], seq.map((st) => `translate(${st.objects[i].x * c}px, ${st.objects[i].y * c}px)`)));
  play(v.player, seq.map((st) => `translate(${st.player.x * c}px, ${st.player.y * c}px)`));
  v.ball.style.transform = faceTransform();
  if (frames[0].player.x !== prev.player.x || frames[0].player.y !== prev.player.y) {
    // 走路或爬梯時輕輕跳一下。
    animations.push(
      v.ball.animate(
        [
          { transform: faceTransform('translateY(0)') },
          { transform: faceTransform('translateY(-16%) scale(0.96, 1.05)'), offset: 0.45 },
          { transform: faceTransform('translateY(0)') },
        ],
        { duration: durations[0], easing: 'ease-out' },
      ),
    );
  }
  const timers = [];
  frames.forEach((f, i) => {
    const before = i === 0 ? prev : frames[i - 1];
    if (f.terrain.some((t, k) => t !== before.terrain[k])) timers.push(setTimeout(() => renderTerrain(f), times[i + 1]));
  });
  const fell = final.player.y > prev.player.y && !final.hover;
  const anim = { animations, timers, final, fell };
  app.anim = anim;
  if (!animations.length) {
    finishAnim(anim);
    return Promise.resolve();
  }
  return Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => finishAnim(anim));
}

/**
 * 結束一段動畫：套用最終位置並移除動畫；落地時讓滾滾輕微壓扁再彈回。
 * @param {object} anim 動畫紀錄。
 */
function finishAnim(anim) {
  if (app.anim !== anim) return;
  app.anim = null;
  anim.timers.forEach(clearTimeout);
  renderEntities(anim.final);
  anim.animations.forEach((a) => a.cancel());
  if (anim.fell && app.view && !reducedMotion()) {
    app.view.ball.animate(
      [{ transform: faceTransform('scale(1, 1)') }, { transform: faceTransform('translateY(7%) scale(1.14, 0.86)') }, { transform: faceTransform('scale(1, 1)') }],
      { duration: 170, easing: 'ease-out' },
    );
  }
}

/** 把進行中的動畫直接跳到結束。 */
function fastForward() {
  if (app.anim) finishAnim(app.anim);
}

/**
 * 無效操作時讓滾滾往該方向輕碰一下再彈回，並在支援的裝置上輕微震動。
 * @param {string} move 操作。
 */
function nudge(move) {
  if (navigator.vibrate) {
    try {
      navigator.vibrate(12);
    } catch {
      // 忽略：部分瀏覽器不允許震動。
    }
  }
  const v = app.view;
  if (!v || reducedMotion()) return;
  const [dx, dy] = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] }[move] || [0, 0];
  const off = `translate(${dx * 6}px, ${dy * 6}px)`;
  const base = faceTransform();
  v.ball.animate([{ transform: base }, { transform: `${off} ${base}` }, { transform: base }], { duration: 150, easing: 'ease-out' });
}

/** 復原一步。 */
function undo() {
  if (!canPlay()) return;
  app.queue = [];
  fastForward();
  const prev = app.history.pop();
  if (!prev) {
    showMessage('沒有可以復原的步驟');
    return;
  }
  app.state = prev;
  app.steps = Math.max(0, app.steps - 1);
  clearMessage();
  persist();
  renderAll();
}

/** 重新開始本關（已操作時先確認）：步數、耗時與提示都回到新局狀態。 */
async function restartLevel() {
  if (!app.level) return;
  if (app.touched && !(await confirmDialog('重新開始本關？', '會回到這一關的開頭，步數、耗時與提示次數都會重設。', '重新開始'))) return;
  stopTimer(false);
  app.anim = null;
  app.state = initialState(app.level.rows);
  app.history = [];
  app.steps = 0;
  app.hintsUsed = 0;
  app.elapsedMs = 0;
  app.touched = false;
  app.queue = [];
  clearMessage();
  persist();
  buildBoard();
  renderAll();
  if (!app.paused) startTimer();
}

/**
 * 點選盤面的格子：沿不推動物件的最短路徑走過去。
 * @param {number} clientX 點選的畫面橫座標。
 * @param {number} clientY 點選的畫面縱座標。
 */
function onBoardTap(clientX, clientY) {
  if (!canPlay() || app.state.dead) return;
  fastForward();
  const rect = els.board.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) / app.cell);
  const y = Math.floor((clientY - rect.top) / app.cell);
  if (x < 0 || y < 0 || x >= app.state.w || y >= app.state.h) return;
  const path = walkPath(app.state, x, y);
  if (path === null) {
    showMessage('走不到那裡，或需要推動東西才能過去', 'error');
    return;
  }
  if (path.length === 0) return;
  app.queue = path.slice(1);
  doMove(path[0], true);
}

/**
 * 在背景求最佳解；Web Worker 無法使用時改在主程式計算。
 * @param {object} state 目前狀態。
 * @returns {Promise<{solved: boolean, moves: string[]}>} 解。
 */
function solveForHint(state) {
  return new Promise((resolve, reject) => {
    let worker;
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    } catch {
      setTimeout(() => resolve(solve(state, { maxStates: 1500000 })), 30);
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('timeout'));
    }, HINT_TIMEOUT);
    /**
     * 接收解答。
     * @param {MessageEvent} ev 結果。
     */
    worker.onmessage = (ev) => {
      clearTimeout(timer);
      worker.terminate();
      if (ev.data.ok) resolve({ solved: ev.data.solved, moves: ev.data.moves });
      else reject(new Error(ev.data.error));
    };
    /**
     * Worker 載入失敗時改在主程式計算。
     * @param {ErrorEvent} ev 錯誤。
     */
    worker.onerror = (ev) => {
      ev.preventDefault();
      clearTimeout(timer);
      worker.terminate();
      setTimeout(() => resolve(solve(state, { maxStates: 1500000 })), 30);
    };
    worker.postMessage({ state });
  });
}

/** 使用提示：示範從目前狀態出發的最佳解下 3 步。 */
async function useHint() {
  if (!canPlay()) return;
  app.queue = [];
  fastForward();
  if (app.hintsUsed >= HINTS_PER_LEVEL) {
    showMessage(`本關提示已用完（每關 ${HINTS_PER_LEVEL} 次）`, 'error');
    return;
  }
  if (app.state.dead) {
    showMessage('滾滾掉進水裡了，先按「復原」回到上一步吧', 'error');
    return;
  }
  els.loading.hidden = false;
  let result;
  try {
    result = await solveForHint(app.state);
  } catch {
    result = null;
  } finally {
    els.loading.hidden = true;
  }
  if (!result) {
    showMessage('思考太久了，請再試一次', 'error');
    return;
  }
  if (!result.solved) {
    showMessage('目前已經無法過關，請復原幾步或重新開始（不扣提示）', 'error');
    return;
  }
  app.hintsUsed++;
  persist();
  renderHud();
  showMessage(`提示：${result.moves.slice(0, 3).map((m) => ARROW[m]).join(' ')}`, 'hint', true);
}

// ---------- 暫停 ----------

/** 暫停並遮住盤面。 */
function pauseGame() {
  if (app.screen !== 'game' || !app.state || app.state.won || app.paused) return;
  stopTimer();
  app.paused = true;
  els.pauseCover.hidden = false;
}

/** 從暫停恢復。 */
function resumeGame() {
  if (!app.paused) return;
  app.paused = false;
  els.pauseCover.hidden = true;
  startTimer();
}

// ---------- 過關 ----------

/** 過關：計算星數、更新進度與統計、清除存檔並顯示結果。 */
async function finishLevel() {
  stopTimer(false);
  const level = app.level;
  const ms = app.elapsedMs;
  const stars = starsFor(app.steps, level.par, app.hintsUsed);
  const before = store.loadProgress();
  const hadNextChapter = chapterUnlocked(level.chapter + 1, before);
  store.recordLevel(level.id, stars, app.steps);
  store.recordComplete(chapterInfo(level.chapter).difficulty, ms, app.hintsUsed);
  store.clearSave();
  const progress = store.loadProgress();
  const idx = levelIndex.get(level.id);
  const next = LEVELS[idx + 1];
  const nextOk = next && levelUnlocked(next, progress) && next.chapter === level.chapter;
  const chapterOpened = !hadNextChapter && CHAPTERS.some((c) => c.chapter === level.chapter + 1) && chapterUnlocked(level.chapter + 1, progress);
  const starHtml = [1, 2, 3].map((n) => `<span class="${n <= stars ? 'on' : 'off'}">★</span>`).join('');
  const actions = [{ label: '關卡列表', value: 'list' }, { label: '重玩', value: 'retry' }];
  if (nextOk) actions.push({ label: '下一關', value: 'next', className: 'primary' });
  const choice = await openModal({
    title: '過關！',
    html: `<div class="win-hero">${SPRITES.playerHappy}</div><div class="win-stars">${starHtml}</div>
      <dl class="result-list">
        <dt>步數</dt><dd>${app.steps} 步（最少 ${level.par} 步）</dd>
        <dt>耗時</dt><dd>${formatTime(ms)}</dd>
        <dt>提示</dt><dd>${app.hintsUsed ? `用了 ${app.hintsUsed} 次` : '沒有使用'}</dd>
      </dl>
      ${stars < 3 ? `<p style="margin-top:12px;font-size:14px">${app.hintsUsed ? '不用提示' : `用 ${level.par} 步`}過關就能拿到 3 顆星！</p>` : ''}
      ${chapterOpened ? `<p style="margin-top:8px;font-weight:700">🎉 第 ${level.chapter + 1} 章已解鎖！</p>` : ''}`,
    actions,
    dismissValue: 'list',
  });
  app.state = null;
  if (choice === 'next') await startLevel(next);
  else if (choice === 'retry') await startLevel(level);
  else goBack();
}

// ---------- 選單、圖鑑、統計、玩法 ----------

/** 遊戲中的選單。 */
async function openGameMenu() {
  const choice = await openModal({
    title: '選單',
    menu: [
      { label: '重新開始本關', value: 'restart' },
      { label: '物理圖鑑', value: 'book' },
      { label: swipeLabel(), value: 'swipe' },
      { label: THEME_LABEL[app.settings.theme], value: 'theme' },
      { label: '回關卡列表', value: 'list' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'restart') restartLevel();
  else if (choice === 'book') openBook();
  else if (choice === 'theme') cycleTheme();
  else if (choice === 'swipe') {
    app.settings.swipe = !app.settings.swipe;
    store.saveSettings(app.settings);
    showMessage(app.settings.swipe ? '已開啟滑動操作：在盤面上滑動即可移動' : '已關閉滑動操作（搭車晃動時可避免誤觸）');
  } else if (choice === 'list') goBack();
}

/** 物理圖鑑：列出看過的小知識。 */
async function openBook() {
  const book = store.loadBook();
  const items = TIPS.map(
    (t) => `<button type="button" class="book-item${book.has(t.key) ? '' : ' locked'}" data-key="${t.key}">
      <span class="tip-art">${book.has(t.key) ? SPRITES[t.sprite] : ''}</span>
      <span><b>${book.has(t.key) ? t.title : '？？？'}</b><br><small>${book.has(t.key) ? '點一下看說明' : '在關卡中遇到後解鎖'}</small></span></button>`,
  ).join('');
  const wait = openModal({
    title: `物理圖鑑（${TIPS.filter((t) => book.has(t.key)).length} / ${TIPS.length}）`,
    html: `<div class="book-list">${items}</div>`,
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
  els.modalBody.querySelectorAll('.book-item').forEach((b) => {
    b.addEventListener('click', () => {
      if (book.has(b.dataset.key)) closeModal(b.dataset.key);
    });
  });
  const key = await wait;
  if (key) {
    await showTip(TIPS.find((t) => t.key === key), '回圖鑑');
    openBook();
  }
}

/** 顯示統計。 */
async function openStats() {
  const stats = store.loadStats();
  const progress = store.loadProgress();
  const rows = CHAPTERS.map((c) => {
    const sum = chapterSummary(c.chapter, progress);
    const s = stats[c.difficulty];
    return `<tr><td>第 ${c.chapter} 章</td><td>${sum.cleared}/${sum.total}</td><td>${sum.stars}/${sum.max}</td><td>${sum.three}</td><td>${s.bestMs === null ? '—' : formatTime(s.bestMs)}</td></tr>`;
  }).join('');
  const choice = await openModal({
    title: '統計',
    html: `<table class="stats-table"><thead><tr><th>章節</th><th>過關</th><th>星數</th><th>三星</th><th>最快</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:10px;font-size:13px">「最快」為該章任一關的最短過關時間。統計只存在這台裝置。</p>`,
    actions: [
      { label: '重設統計', value: 'reset', className: 'danger' },
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'reset' && (await confirmDialog('重設統計？', '過關次數與時間紀錄會歸零（關卡星數與解鎖進度不受影響）。', '重設'))) {
    store.resetStats();
    openStats();
  }
}

/** 顯示玩法說明。 */
function openRules() {
  const item = (sprite, name, text) => `<div class="book-item"><span class="tip-art">${SPRITES[sprite]}</span><span><b>${name}</b><br><small>${text}</small></span></div>`;
  openModal({
    title: '玩法',
    html: `<p>用下方的方向鍵移動滾滾，抵達旗子就過關。也可以直接點盤面上的位置，滾滾會自己走過去。</p>
      <p>滾滾不會跳，只能靠梯子、彈簧或氣球到高處；走錯了可以「復原」，卡住了可以「重來」。</p>
      <div class="book-list">
        ${item('box', '木箱', '可推動；掉進水裡會浮起來')}
        ${item('stone', '石塊', '可推動；會沉進水裡；從高處掉落能壓碎易碎磚')}
        ${item('ice', '冰塊', '推一下滑到底；會浮在水上')}
        ${item('balloon', '氣球', '往上飄，能帶滾滾上去，抬不動石塊')}
        ${item('spring', '彈簧', '把滾滾彈起三格，在最高點往左右跳')}
        ${item('crumble', '易碎磚', '被高處掉下的石塊壓碎')}
        ${item('water', '水', '滾滾不會游泳，掉進去要復原')}
      </div>
      <p style="margin-top:10px">星星：過關 1 顆；步數不超過最少步數的 1.5 倍 2 顆；用最少步數而且沒用提示 3 顆。</p>
      <p>鍵盤：方向鍵移動、U 或 Ctrl＋Z 復原、R 重來、H 提示、P 暫停。</p>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

// ---------- 鍵盤 ----------

/**
 * 實體鍵盤操作。
 * @param {KeyboardEvent} e 鍵盤事件。
 */
function onKeyDown(e) {
  if (!els.modal.hidden) {
    if (e.key === 'Escape') closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
    return;
  }
  if (app.screen !== 'game') return;
  if (app.paused) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resumeGame();
    }
    return;
  }
  const key = e.key.toLowerCase();
  const map = { arrowleft: 'L', arrowright: 'R', arrowup: 'U', arrowdown: 'D' };
  let handled = true;
  if ((e.ctrlKey || e.metaKey) && key === 'z') undo();
  else if (e.ctrlKey || e.metaKey || e.altKey) handled = false;
  else if (map[key]) doMove(map[key]);
  else if (key === 'u') undo();
  else if (key === 'r') restartLevel();
  else if (key === 'h') useHint();
  else if (key === 'p' || key === 'escape') pauseGame();
  else handled = false;
  if (handled) e.preventDefault();
}

// ---------- Service Worker 與離線狀態 ----------

/**
 * 設定首頁的離線狀態。
 * @param {string} text 文字。
 * @param {boolean} ready 是否已可離線使用。
 */
function setOfflineStatus(text, ready) {
  els.offlineStatus.textContent = text;
  els.offlineStatus.classList.toggle('ready', ready);
}

/**
 * 透過 MessageChannel 詢問 Service Worker。
 * @param {ServiceWorker} sw Service Worker。
 * @param {object} message 訊息。
 * @param {number} timeoutMs 逾時。
 * @returns {Promise<any>} 回覆。
 */
function askServiceWorker(sw, message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    /**
     * 接收回覆。
     * @param {MessageEvent} event 回覆。
     */
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    sw.postMessage(message, [channel.port2]);
  });
}

/**
 * 更新離線狀態。詢問本遊戲自己註冊的 Service Worker，
 * 而不是目前控制頁面的那一個（與大廳同網域時首次開啟可能由大廳控制）。
 */
async function refreshOfflineStatus() {
  const own = app.registration && app.registration.active;
  if (!own) {
    setOfflineStatus('離線資源下載中…（請保持連線）', false);
    return;
  }
  try {
    const r = await askServiceWorker(own, { type: 'CHECK_CACHE' }, 5000);
    if (r && r.ok) setOfflineStatus(`✓ 已可離線使用${r.label ? `・版本 ${r.label}` : ''}`, true);
    else setOfflineStatus(`離線資源不完整（缺 ${r ? r.missing : '?'} 個檔案），請連網後重新開啟`, false);
  } catch {
    setOfflineStatus('無法確認離線狀態，請連網後重新開啟', false);
  }
}

/**
 * 有新版本等待啟用時顯示更新橫幅。
 * @param {ServiceWorkerRegistration} reg 註冊資訊。
 */
function checkWaiting(reg) {
  els.updateBanner.hidden = !(reg.waiting && reg.active);
}

/** 玩家同意更新：存檔後啟用新版並重新載入。 */
function applyUpdate() {
  persist();
  const reg = app.registration;
  if (reg && reg.waiting) {
    app.updateRequested = true;
    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    location.reload();
  }
}

/** 註冊 Service Worker 並監看更新與離線狀態。 */
async function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    setOfflineStatus('此瀏覽器不支援離線使用', false);
    return;
  }
  let reg;
  try {
    reg = await navigator.serviceWorker.register('./sw.js');
  } catch {
    setOfflineStatus('開發模式：未啟用離線快取', false);
    return;
  }
  app.registration = reg;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (app.updateRequested) location.reload();
    else refreshOfflineStatus();
  });
  reg.addEventListener('updatefound', () => {
    const w = reg.installing;
    if (!w) return;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed') checkWaiting(reg);
      if (w.state === 'activated') refreshOfflineStatus();
    });
  });
  checkWaiting(reg);
  refreshOfflineStatus();
}

// ---------- 初始化 ----------

/** 與遊戲大廳同網域時顯示返回大廳的連結。 */
function setupPortalLink() {
  let path = null;
  try {
    path = localStorage.getItem('games.portal');
  } catch {
    // 忽略：無法讀取時不顯示。
  }
  if (!path || !path.startsWith('/') || path.startsWith('//')) return;
  els.portalLink.href = path;
  els.portalLink.hidden = false;
}

/**
 * 判斷是否為 iOS 瀏覽器分頁（非主畫面 App）。
 * @returns {boolean} 是時為 true。
 */
function isIosBrowserTab() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return ios && !standalone;
}

/**
 * 方向鍵：按下的瞬間就移動；按住不放時，短暫停頓後持續移動（等前一步動畫播完再走下一步）。
 * @param {HTMLButtonElement} b 方向鍵。
 */
function bindDpadButton(b) {
  const move = b.dataset.move;
  let held = false;
  let since = 0;
  let timer = 0;
  /** 放開按鍵。 */
  const release = () => {
    held = false;
    clearInterval(timer);
    b.classList.remove('pressed');
  };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (b.setPointerCapture) b.setPointerCapture(e.pointerId);
    held = true;
    since = performance.now();
    b.classList.add('pressed');
    if (doMove(move) === false) return;
    clearInterval(timer);
    timer = setInterval(() => {
      if (!held) return;
      const now = performance.now();
      if (now - since < REPEAT_DELAY || app.anim || now - app.lastMoveAt < REPEAT_INTERVAL) return;
      if (doMove(move) === false) release();
    }, 30);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => b.addEventListener(t, release));
  // 鍵盤（Enter／空白鍵）觸發的 click 沒有指標座標，仍然可以操作。
  b.addEventListener('click', (e) => {
    if (e.detail === 0) doMove(move);
  });
}

/** 盤面手勢：滑動移動一步（可在選單關閉）；輕點則自動走到該格。 */
function bindBoardGestures() {
  let start = null;
  els.board.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  els.board.addEventListener('pointerup', (e) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    if (dist >= SWIPE_MIN) {
      if (!app.settings.swipe) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) doMove(dx > 0 ? 'R' : 'L');
      else if (Math.abs(dy) > Math.abs(dx) * 1.2) doMove(dy > 0 ? 'D' : 'U');
      return;
    }
    onBoardTap(e.clientX, e.clientY);
  });
  els.board.addEventListener('pointercancel', () => {
    start = null;
  });
}

/** 綁定事件。 */
function bindEvents() {
  els.themeBtn.addEventListener('click', cycleTheme);
  els.continueBtn.addEventListener('click', () => {
    const saved = store.loadSave((id) => levelIndex.has(id));
    if (saved.status === 'ok') resumeLevel(saved.save);
    else renderHome();
  });
  els.bookBtn.addEventListener('click', openBook);
  els.statsBtn.addEventListener('click', openStats);
  els.rulesBtn.addEventListener('click', openRules);
  els.chapterBackBtn.addEventListener('click', goBack);
  els.gameBackBtn.addEventListener('click', goBack);
  els.menuBtn.addEventListener('click', openGameMenu);
  bindBoardGestures();
  document.querySelectorAll('.dpad-btn').forEach(bindDpadButton);
  els.undoBtn.addEventListener('click', undo);
  els.restartBtn.addEventListener('click', restartLevel);
  els.hintBtn.addEventListener('click', useHint);
  els.pauseBtn.addEventListener('click', pauseGame);
  els.resumeBtn.addEventListener('click', resumeGame);
  els.updateBtn.addEventListener('click', applyUpdate);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
  });
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('popstate', (e) => {
    closeModal(null);
    const screen = e.state && e.state.screen;
    if (screen === 'chapter') showChapter(app.level && app.screen === 'game' ? app.level.chapter : app.chapter);
    else if (screen === 'game' && app.level) enterGame();
    else showHome();
  });
  window.addEventListener('resize', () => {
    if (app.screen === 'game' && app.state) {
      buildBoard();
      renderAll();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (app.screen === 'game') pauseGame();
      persist();
    } else if (app.screen === 'home') {
      renderHome();
    }
  });
  window.addEventListener('pagehide', persist);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** 啟動。 */
function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('roll');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  document.querySelectorAll('.deco-sprite').forEach((d) => {
    d.innerHTML = SPRITES[d.dataset.sprite];
  });
  bindEvents();
  if (history.state && history.state.screen) history.replaceState(null, '');
  const notices = [];
  if (!store.storageAvailable()) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  const saved = store.loadSave((id) => levelIndex.has(id));
  if (saved.status === 'corrupt') {
    store.clearSave();
    notices.push('先前進行中的關卡資料損毀，已無法恢復；關卡星數與解鎖進度不受影響。');
  }
  if (isIosBrowserTab()) {
    notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟；只在 Safari 中玩時，7 天未使用可能被清除資料。');
  }
  els.homeNotice.innerHTML = notices.map((n) => `<p>${n}</p>`).join('');
  els.homeNotice.hidden = notices.length === 0;
  setupPortalLink();
  showHome();
  setupServiceWorker();
}

init();
