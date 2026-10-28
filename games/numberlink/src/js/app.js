// 主程式：畫面切換、盤面繪製、畫線操作（點選、拖曳、鍵盤）、計時、出題排程、Service Worker 與離線狀態。

import { DIFFICULTIES, DIFFICULTY_KEYS, generatePuzzle } from './numberlink/generator.js';
import { isAdjacent } from './numberlink/core.js';
import {
  createGame, restartGame, beginSession, sessionAtHead, moveTo, clearPair, snapshot, restore, useHint,
  endpointPair, ownerGrid, isConnected, connectedCount, fillRatio, isComplete, hintsLeft, hintQuota,
} from './game.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';

/** 前景出題逾時（毫秒）。 */
const GENERATE_TIMEOUT = { easy: 15000, medium: 15000, hard: 15000, expert: 30000 };
/** 背景預先產生的逾時（毫秒）。 */
const PREGEN_TIMEOUT = 60000;
/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 2500;
/** 連通閃爍時間（毫秒），須與 CSS 動畫長度一致。 */
const FLASH_MS = 700;
/** 編號顏色數量（超過時循環使用）。 */
const COLORS = 12;
/** 底色較亮、端點數字需改用深色的編號顏色（1 起算）。 */
const LIGHT_COLORS = new Set([4, 7, 10, 12]);
/** 拖曳時手指須進入格子中央的範圍（比例，兩側各留 15%）才算進入該格。 */
const DRAG_MARGIN = 0.15;
/** 連接方向位元：上、右、下、左。 */
const DIR = { u: 1, r: 2, d: 4, l: 8 };

/**
 * 依 id 取得元素。
 * @param {string} id 元素 id。
 * @returns {HTMLElement} 元素。
 */
const $ = (id) => document.getElementById(id);

const els = {
  home: $('home'),
  game: $('game'),
  themeBtn: $('theme-btn'),
  offlineStatus: $('offline-status'),
  homeNotice: $('home-notice'),
  continueBtn: $('continue-btn'),
  continueDetail: $('continue-detail'),
  difficultyList: $('difficulty-list'),
  rulesBtn: $('rules-btn'),
  statsBtn: $('stats-btn'),
  homeBtn: $('home-btn'),
  menuBtn: $('menu-btn'),
  gameDifficulty: $('game-difficulty'),
  timer: $('timer'),
  board: $('board'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  progress: $('progress'),
  message: $('game-message'),
  undoBtn: $('undo-btn'),
  eraseBtn: $('erase-btn'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  loading: $('loading'),
  loadingText: $('loading-text'),
  modal: $('modal'),
  modalTitle: $('modal-title'),
  modalBody: $('modal-body'),
  modalActions: $('modal-actions'),
  updateBanner: $('update-banner'),
  updateBtn: $('update-btn'),
};

/** 執行期狀態。 */
const app = {
  screen: 'home',
  state: null,
  /** 目前的畫線階段（選取的編號），未選取時為 null；counted 表示這一筆已計入筆數。 */
  session: null,
  /** 進行中的操作（一次點擊、拖曳或按鍵），記錄操作前的盤面供復原。 */
  action: null,
  /** 進行中的拖曳：指標 id 與最後進入的格子。 */
  drag: null,
  undoStack: [],
  paused: false,
  running: false,
  segmentStart: 0,
  tickTimer: 0,
  message: '',
  messageError: false,
  messageTimer: 0,
  pregenJob: null,
  settings: store.loadSettings(),
  registration: null,
  updateRequested: false,
  modalResolve: null,
  lastUpdateCheck: 0,
  /** 已連通的編號，用來偵測新連通的編號並閃爍一次。 */
  connected: new Set(),
  /** 目前盤面元素對應的題目，題目改變時重建盤面。 */
  builtKey: '',
};

/** 盤面格子元素（索引同盤面）。 */
let cells = [];

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
 * 取得目前累計耗時（含進行中的這一段）。
 * @returns {number} 毫秒。
 */
function currentElapsed() {
  if (!app.state) return 0;
  return app.state.elapsedMs + (app.running ? performance.now() - app.segmentStart : 0);
}

/** 立即存檔（使用目前累計耗時，不修改記憶體中的狀態）。 */
function persist() {
  if (!app.state || app.state.completed) return;
  store.writeSave({ ...app.state, elapsedMs: currentElapsed() });
}

// ---------- 計時 ----------

/** 開始計時；只在遊戲畫面、未暫停且未完成時有效。 */
function startTimer() {
  if (app.running || !app.state || app.state.completed || app.paused) return;
  app.running = true;
  app.segmentStart = performance.now();
  app.tickTimer = setInterval(renderTimer, 1000);
  renderTimer();
}

/**
 * 停止計時並把這一段時間加入累計值。
 * @param {boolean} [save=true] 是否同時存檔。
 */
function stopTimer(save = true) {
  if (app.running) {
    app.state.elapsedMs += performance.now() - app.segmentStart;
    app.running = false;
    clearInterval(app.tickTimer);
  }
  if (save) persist();
  renderTimer();
}

/** 更新畫面上的耗時。 */
function renderTimer() {
  els.timer.textContent = formatTime(currentElapsed());
}

// ---------- 主題 ----------

const THEME_LABEL = { system: '主題：跟隨系統', light: '主題：淺色', dark: '主題：深色' };

/** 套用目前主題設定。 */
function applyTheme() {
  const { theme } = app.settings;
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  els.themeBtn.textContent = THEME_LABEL[theme];
}

/** 依序切換 跟隨系統 → 淺色 → 深色。 */
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
 * @param {{label: string, value: any, className?: string}[]} [options.menu] 直向選單項目。
 * @param {{label: string, value: any, className?: string}[]} [options.actions] 底部按鈕。
 * @param {any} [options.dismissValue=null] 點背景或按 Esc 關閉時的回傳值。
 * @returns {Promise<any>} 使用者選擇的值。
 */
function openModal({ title, html = '', menu = [], actions = [], dismissValue = null }) {
  closeModal(dismissValue);
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html;
  els.modalActions.innerHTML = '';
  /**
   * 建立對話框按鈕。
   * @param {{label: string, value: any, className?: string}} item 按鈕設定。
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
 * 關閉對話框並回傳值給等待中的 Promise。
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
 * @param {string} text 說明文字。
 * @param {string} okLabel 確認按鈕文字。
 * @returns {Promise<boolean>} 是否確認。
 */
async function confirmDialog(title, text, okLabel) {
  const value = await openModal({
    title,
    html: `<p>${text}</p>`,
    actions: [
      { label: '取消', value: false },
      { label: okLabel, value: true, className: 'danger' },
    ],
    dismissValue: false,
  });
  return value === true;
}

/**
 * 顯示或隱藏出題中狀態。
 * @param {boolean} show 是否顯示。
 * @param {string} [text] 顯示文字。
 */
function showLoading(show, text = '出題中…') {
  els.loadingText.textContent = text;
  els.loading.hidden = !show;
}

// ---------- 出題 ----------

/**
 * 出題：優先在 Web Worker 中執行；Worker 無法建立或載入失敗時（例如沒有 Service Worker
 * 快取且已離線，抓不到 worker.js），改用主程式已載入的出題器直接出題。
 * @param {string} difficulty 難度代碼。
 * @param {number} timeoutMs Worker 出題逾時毫秒。
 * @returns {{promise: Promise<object>, cancel: () => void}} 出題工作。
 */
function createGenerateJob(difficulty, timeoutMs) {
  let worker = null;
  let timer = 0;
  let settled = false;
  let resolveFn = null;
  let rejectFn = null;
  /** 結束工作並釋放 Worker。 */
  const cleanup = () => {
    clearTimeout(timer);
    if (worker) worker.terminate();
    worker = null;
  };
  /**
   * 以結果結束工作；已結束時忽略。
   * @param {object | null} result 題目。
   * @param {Error} [error] 錯誤。
   */
  const finish = (result, error) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error) rejectFn(error);
    else resolveFn(result);
  };
  /** 改在主程式出題；延後一個事件循環，讓出題中畫面先顯示。 */
  const fallback = () => {
    cleanup();
    setTimeout(() => {
      if (settled) return;
      try {
        finish(generatePuzzle(difficulty, { exclude: store.loadRecent() }));
      } catch (err) {
        finish(null, err);
      }
    }, 50);
  };
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  } catch {
    fallback();
    return { promise, cancel: () => finish(null, new Error('cancelled')) };
  }
  timer = setTimeout(() => finish(null, new Error('timeout')), timeoutMs);
  /**
   * 接收 Worker 回傳的出題結果。
   * @param {MessageEvent} event 結果訊息。
   */
  worker.onmessage = (event) => {
    if (event.data.ok) finish(event.data.result);
    else finish(null, new Error(event.data.error));
  };
  /**
   * Worker 載入或執行失敗時改在主程式出題。
   * @param {ErrorEvent} event 錯誤事件。
   */
  worker.onerror = (event) => {
    event.preventDefault();
    fallback();
  };
  worker.postMessage({ difficulty, exclude: store.loadRecent() });
  return {
    promise,
    /** 取消工作。 */
    cancel: () => finish(null, new Error('cancelled')),
  };
}

/** 取消背景預先產生。 */
function cancelPregen() {
  if (app.pregenJob) {
    app.pregenJob.cancel();
    app.pregenJob = null;
  }
}

/**
 * 稍後在背景為指定難度預先產生下一題；完成後即停止。
 * @param {string} difficulty 難度代碼。
 */
function schedulePregen(difficulty) {
  if (store.hasPregen(difficulty)) return;
  cancelPregen();
  setTimeout(() => {
    if (app.pregenJob || store.hasPregen(difficulty)) return;
    const job = createGenerateJob(difficulty, PREGEN_TIMEOUT);
    app.pregenJob = job;
    job.promise
      .then((item) => store.storePregen(item))
      .catch(() => {})
      .finally(() => {
        if (app.pregenJob === job) app.pregenJob = null;
      });
  }, 1500);
}

/**
 * 取得新題目：優先使用預先產生的題目，否則即時出題；失敗時可重試。
 * @param {string} difficulty 難度代碼。
 * @returns {Promise<object | null>} 題目，使用者取消時為 null。
 */
async function obtainPuzzle(difficulty) {
  cancelPregen();
  const recent = store.loadRecent();
  const pre = store.takePregen(difficulty);
  if (pre && !recent.includes(pre.hash)) return pre;
  for (;;) {
    showLoading(true, `${DIFFICULTIES[difficulty].label}題目產生中…`);
    try {
      return await createGenerateJob(difficulty, GENERATE_TIMEOUT[difficulty]).promise;
    } catch (err) {
      showLoading(false);
      const reason = err.message === 'timeout' ? '出題時間過長，已停止。' : '出題時發生錯誤。';
      const retry = await openModal({
        title: '出題失敗',
        html: `<p>${reason}可以重試，或稍後再開始新局。</p>`,
        actions: [
          { label: '取消', value: false },
          { label: '重試', value: true, className: 'primary' },
        ],
        dismissValue: false,
      });
      if (!retry) return null;
    } finally {
      showLoading(false);
    }
  }
}

// ---------- 遊戲流程 ----------

/**
 * 判斷是否有已操作過、尚未完成的一局。
 * @returns {boolean} 有時為 true。
 */
function hasTouchedGame() {
  const s = app.state || store.loadSave().state;
  return !!(s && s.touched && !s.completed);
}

/**
 * 重設單局的執行期狀態。
 * @param {object} state 新的遊戲狀態。
 */
function setState(state) {
  app.state = state;
  app.session = null;
  app.action = null;
  app.drag = null;
  app.undoStack = [];
  app.paused = false;
  app.connected = new Set(state.ends.map((_, k) => k).filter((k) => isConnected(state, k)));
  clearMessage();
}

/**
 * 開始指定難度的新局；目前有進度時先確認。
 * @param {string} difficulty 難度代碼。
 * @param {{skipConfirm?: boolean}} [options] 選項。
 */
async function startNewGame(difficulty, { skipConfirm = false } = {}) {
  if (!skipConfirm && hasTouchedGame()) {
    const ok = await confirmDialog('開始新局？', '目前這一局的進度會被清除。', '開始新局');
    if (!ok) return;
  }
  if (app.running) stopTimer();
  const data = await obtainPuzzle(difficulty);
  if (!data) {
    if (app.screen === 'game' && app.state && !app.state.completed) startTimer();
    return;
  }
  setState(createGame(data));
  store.recordStart(difficulty);
  store.addRecent(data.hash);
  persist();
  enterGame();
  schedulePregen(difficulty);
}

/** 從存檔繼續遊戲。 */
function continueGame() {
  if (!app.state) {
    const saved = store.loadSave();
    if (saved.status !== 'ok') {
      renderHome();
      return;
    }
    setState(saved.state);
  }
  enterGame();
}

/** 切換到遊戲畫面並開始計時。 */
function enterGame() {
  app.screen = 'game';
  app.paused = false;
  if (!history.state || history.state.screen !== 'game') history.pushState({ screen: 'game' }, '');
  els.home.hidden = true;
  els.game.hidden = false;
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/** 從遊戲畫面回首頁（經由瀏覽器歷史，讓返回鍵行為一致）。 */
function goHome() {
  if (history.state && history.state.screen === 'game') history.back();
  else showHome();
}

/** 顯示首頁；進行中的一局會先停止計時並存檔。 */
function showHome() {
  if (app.state) {
    stopTimer();
    if (app.state.completed) app.state = null;
  }
  app.paused = false;
  app.screen = 'home';
  els.game.hidden = true;
  els.home.hidden = false;
  renderHome();
}

/**
 * 暫停遊戲並遮住棋盤。
 */
function pauseGame() {
  if (!app.state || app.state.completed || app.paused) return;
  stopTimer();
  app.paused = true;
  app.session = null;
  app.drag = null;
  app.action = null;
  els.pauseCover.hidden = false;
  render();
}

/** 從暫停恢復。 */
function resumeGame() {
  if (!app.paused) return;
  app.paused = false;
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/** 重開本局；有進度時先確認。 */
async function restartCurrent() {
  if (!app.state) return;
  if (app.state.touched) {
    const ok = await confirmDialog('重開本局？', '會清除所有的線與提示，耗時、筆數與提示次數也會重設。', '重開本局');
    if (!ok) return;
  }
  stopTimer(false);
  setState(restartGame(app.state));
  persist();
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/** 完成一局：停止計時、更新統計、清除存檔並顯示結算。 */
async function finishGame() {
  stopTimer(false);
  const s = app.state;
  s.completed = true;
  const perfect = s.hintsUsed === 0 && s.strokes === s.ends.length;
  const { newRecord } = store.recordComplete(s.difficulty, s.elapsedMs, s.hintsUsed, perfect);
  store.clearSave();
  app.session = null;
  app.undoStack = [];
  render();
  const label = DIFFICULTIES[s.difficulty].label;
  const choice = await openModal({
    title: '完成！',
    html:
      (newRecord || perfect
        ? `<p>${newRecord ? '<span class="record-badge">🏆 新紀錄</span> ' : ''}${perfect ? '<span class="record-badge">✨ 完美</span>' : ''}</p>`
        : '') +
      `<dl class="result-list">
        <dt>難度</dt><dd>${label}・${s.size} × ${s.size}</dd>
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>筆數</dt><dd>${s.strokes}（${s.ends.length} 對端點）</dd>
        <dt>已用提示</dt><dd>${s.hintsUsed} / ${hintQuota(s)}</dd>
      </dl>`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'stay',
  });
  if (choice === 'again') startNewGame(s.difficulty, { skipConfirm: true });
  else if (choice === 'home') goHome();
}

// ---------- 操作 ----------

/**
 * 顯示暫時訊息。
 * @param {string} text 訊息。
 * @param {boolean} [error=false] 是否為錯誤樣式。
 */
function showMessage(text, error = false) {
  app.message = text;
  app.messageError = error;
  clearTimeout(app.messageTimer);
  app.messageTimer = setTimeout(() => {
    clearMessage();
    renderMessage();
  }, MESSAGE_MS);
  renderMessage();
}

/** 清除暫時訊息。 */
function clearMessage() {
  clearTimeout(app.messageTimer);
  app.message = '';
  app.messageError = false;
}

/**
 * 判斷目前是否可以操作棋盤。
 * @returns {boolean} 可操作時為 true。
 */
function canPlay() {
  return app.screen === 'game' && !!app.state && !app.state.completed && !app.paused && els.modal.hidden;
}

/**
 * 讓指定格子單次閃爍（一對端點連通時使用）。
 * @param {Iterable<number>} list 格子索引。
 */
function flashCells(list) {
  for (const i of list) {
    const el = cells[i] && cells[i].el;
    if (!el) continue;
    el.classList.remove('flash');
    // 強制重新計算樣式，讓同一格可以再次播放動畫。
    void el.offsetWidth;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), FLASH_MS);
  }
}

/** 偵測新連通的編號並閃爍其端點一次。 */
function flashNewConnections() {
  const s = app.state;
  const now = new Set(s.ends.map((_, k) => k).filter((k) => isConnected(s, k)));
  const fresh = [];
  for (const k of now) if (!app.connected.has(k)) fresh.push(...s.ends[k]);
  app.connected = now;
  if (fresh.length) flashCells(fresh);
}

/** 盤面變更後：存檔、重繪、標示新連通的編號並檢查完成。 */
function afterChange() {
  persist();
  render();
  flashNewConnections();
  const s = app.state;
  if (isComplete(s)) finishGame();
  else if (connectedCount(s) === s.ends.length) showMessage('全部連通了，但還有空格沒有填滿', true);
}

/**
 * 以盤面座標描述格子（列、行由 1 起算）。
 * @param {number} i 格子索引。
 * @returns {string} 例如「第 3 列第 5 行」。
 */
function cellName(i) {
  const size = app.state.size;
  return `第 ${Math.floor(i / size) + 1} 列第 ${(i % size) + 1} 行`;
}

/** 開始一個操作（一次點擊、一次拖曳或一次按鍵）：記下操作前的盤面供復原。 */
function beginAction() {
  app.action = { before: snapshot(app.state) };
}

/**
 * 結束操作：盤面有改變時存入復原紀錄、計入筆數並存檔；選取的編號連通後自動取消選取。
 */
function endAction() {
  const a = app.action;
  app.action = null;
  if (!a) return;
  const s = app.state;
  const changed = JSON.stringify(a.before) !== JSON.stringify(s.paths);
  if (!changed) {
    render();
    return;
  }
  s.touched = true;
  app.undoStack.push(a.before);
  if (app.session) {
    if (!app.session.counted) {
      app.session.counted = true;
      s.strokes++;
    }
    if (isConnected(s, app.session.k)) app.session = null;
  }
  afterChange();
}

/**
 * 在目前的畫線階段把線頭移到某格。
 * @param {number} cell 目標格子。
 * @returns {boolean} 盤面有改變時為 true。
 */
function stepTo(cell) {
  if (!app.session) return false;
  const moved = moveTo(app.state, app.session, cell);
  if (moved) render();
  return moved;
}

/**
 * 取得目前選取線的線頭。
 * @returns {number} 線頭格子索引，未選取時為 -1。
 */
function currentHead() {
  if (!app.session) return -1;
  const p = app.state.paths[app.session.k];
  return p.length ? p[p.length - 1] : -1;
}

/**
 * 選取某個編號（鍵盤用）：線頭為已畫部分的末端，沒有線時為第一個端點。
 * @param {number} k 編號索引。
 */
function selectPair(k) {
  const s = app.state;
  if (k < 0 || k >= s.ends.length) return;
  if (s.hinted[k]) {
    showMessage(`編號 ${k + 1} 是提示的線，已鎖定`);
    return;
  }
  const session = sessionAtHead(s, k);
  app.session = session ? { ...session, counted: false } : null;
  clearMessage();
  render();
}

/**
 * 依編號循環選取下一個（或上一個）尚未連通的編號；全部連通時在所有可修改的編號間循環。
 * @param {number} dir 1 為下一個，-1 為上一個。
 */
function cyclePair(dir) {
  const s = app.state;
  const k = s.ends.length;
  const open = s.ends.map((_, j) => j).filter((j) => !s.hinted[j] && !isConnected(s, j));
  const pool = open.length ? open : s.ends.map((_, j) => j).filter((j) => !s.hinted[j]);
  if (!pool.length) return;
  const cur = app.session ? app.session.k : dir > 0 ? -1 : k;
  const sorted = dir > 0 ? pool : pool.slice().reverse();
  const next = sorted.find((j) => (dir > 0 ? j > cur : j < cur));
  selectPair(next === undefined ? sorted[0] : next);
}

/**
 * 按下格子（點選或拖曳的起點）：
 * - 已選取時：點線頭不動作；點自己的線退回；點相鄰格延伸；
 * - 其他情況：點端點或線改選該編號，點空格取消選取。
 * @param {number} cell 格子索引。
 */
function handlePress(cell) {
  const s = app.state;
  if (app.session) {
    const p = s.paths[app.session.k];
    const head = p[p.length - 1];
    if (cell === head) return;
    if (p.includes(cell) || isAdjacent(s.size, head, cell)) {
      if (stepTo(cell)) return;
    }
  }
  if (endpointPair(s, cell) < 0 && ownerGrid(s)[cell] < 0) {
    app.session = null;
    render();
    return;
  }
  const r = beginSession(s, cell);
  if (!r.session) {
    app.session = null;
    if (r.reason === 'hinted') showMessage('提示的線已鎖定，不能修改');
    render();
    return;
  }
  app.session = { ...r.session, counted: false };
  clearMessage();
  render();
}

/**
 * 拖曳進入新的格子：退回自己的線、延伸到相鄰格，或在同一直線上依序補上跳過的格子
 * （任何一格無法通過時整段忽略）。
 * @param {number} cell 格子索引。
 */
function dragTo(cell) {
  const s = app.state;
  const p = s.paths[app.session.k];
  const head = p[p.length - 1];
  if (p.includes(cell) || isAdjacent(s.size, head, cell)) {
    stepTo(cell);
    return;
  }
  const n = s.size;
  const [hr, hc, cr, cc] = [Math.floor(head / n), head % n, Math.floor(cell / n), cell % n];
  if (hr !== cr && hc !== cc) return;
  const step = hr === cr ? Math.sign(cc - hc) : Math.sign(cr - hr) * n;
  const backup = snapshot(s);
  for (let x = head + step; ; x += step) {
    if (!moveTo(s, app.session, x)) {
      s.paths = backup;
      return;
    }
    if (x === cell) break;
  }
  render();
}

/**
 * 由畫面座標取得格子。
 * @param {number} x 視窗座標 x。
 * @param {number} y 視窗座標 y。
 * @param {boolean} strict 是否要求落在格子中央範圍內（拖曳防抖動）。
 * @returns {number} 格子索引，不在盤面或不在中央範圍時為 -1。
 */
function cellFromPoint(x, y, strict) {
  const rect = els.board.getBoundingClientRect();
  const n = app.state.size;
  const fx = ((x - rect.left) / rect.width) * n;
  const fy = ((y - rect.top) / rect.height) * n;
  const c = Math.floor(fx);
  const r = Math.floor(fy);
  if (c < 0 || r < 0 || c >= n || r >= n) return -1;
  if (strict) {
    const ox = fx - c;
    const oy = fy - r;
    if (ox < DRAG_MARGIN || ox > 1 - DRAG_MARGIN || oy < DRAG_MARGIN || oy > 1 - DRAG_MARGIN) return -1;
  }
  return r * n + c;
}

/**
 * 指標按下：開始一個操作並處理點選。
 * @param {PointerEvent} e 指標事件。
 */
function onPointerDown(e) {
  if (!canPlay() || app.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const cell = cellFromPoint(e.clientX, e.clientY, false);
  if (cell < 0) return;
  e.preventDefault();
  try {
    els.board.setPointerCapture(e.pointerId);
  } catch {
    // 忽略：不支援時仍可點選。
  }
  app.drag = { id: e.pointerId, last: cell };
  beginAction();
  handlePress(cell);
}

/**
 * 指標移動：拖曳中進入新格子時畫線。
 * @param {PointerEvent} e 指標事件。
 */
function onPointerMove(e) {
  if (!app.drag || e.pointerId !== app.drag.id || !app.session || !canPlay()) return;
  const cell = cellFromPoint(e.clientX, e.clientY, true);
  if (cell < 0 || cell === app.drag.last) return;
  app.drag.last = cell;
  dragTo(cell);
}

/**
 * 指標放開或取消：結束這次操作。
 * @param {PointerEvent} e 指標事件。
 */
function onPointerUp(e) {
  if (!app.drag || e.pointerId !== app.drag.id) return;
  app.drag = null;
  endAction();
}

/** 清除選取編號的整條線。 */
function onErase() {
  if (!canPlay()) return;
  if (!app.session) {
    showMessage('請先選取要清除的線');
    return;
  }
  beginAction();
  clearPair(app.state, app.session.k);
  app.session = null;
  endAction();
}

/** 復原上一個操作。 */
function onUndo() {
  if (!canPlay()) return;
  const entry = app.undoStack.pop();
  if (!entry) {
    showMessage('沒有可以復原的操作');
    return;
  }
  app.session = null;
  restore(app.state, entry);
  clearMessage();
  afterChange();
}

/** 使用提示。 */
function onHint() {
  if (!canPlay()) return;
  const s = app.state;
  const r = useHint(s, app.session ? app.session.k : -1);
  if (r.result === 'no-quota') {
    showMessage(`本局提示已用完（每局 ${hintQuota(s)} 次）`);
    return;
  }
  if (r.result === 'already-correct') {
    showMessage('這條線已正確，未使用提示');
    return;
  }
  if (r.result !== 'filled') return;
  app.session = null;
  app.undoStack = [];
  showMessage(`已提示編號 ${r.pair + 1}，剩餘 ${hintsLeft(s)} 次`);
  afterChange();
}

/**
 * 以方向鍵移動線頭：朝前一格方向為退回，其他方向為延伸。
 * @param {number} dr 列方向（-1、0、1）。
 * @param {number} dc 行方向（-1、0、1）。
 */
function onArrow(dr, dc) {
  if (!canPlay()) return;
  if (!app.session) {
    cyclePair(1);
    return;
  }
  const s = app.state;
  const n = s.size;
  const head = currentHead();
  const r = Math.floor(head / n) + dr;
  const c = (head % n) + dc;
  if (r < 0 || c < 0 || r >= n || c >= n) return;
  beginAction();
  if (!stepTo(r * n + c)) showMessage('這個方向不能走');
  endAction();
}

/** 線頭退回一格（Backspace）。 */
function onRetreat() {
  if (!canPlay() || !app.session) return;
  const p = app.state.paths[app.session.k];
  if (p.length < 2) return;
  beginAction();
  stepTo(p[p.length - 2]);
  endAction();
}

/**
 * 實體鍵盤操作。
 * @param {KeyboardEvent} e 鍵盤事件。
 */
function onKeyDown(e) {
  if (!els.modal.hidden) {
    if (e.key === 'Escape') closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
    return;
  }
  if (app.screen !== 'game' || !els.loading.hidden) return;
  if (app.paused) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resumeGame();
    }
    return;
  }
  if (!canPlay()) return;
  const key = e.key;
  let handled = true;
  if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'z') onUndo();
  else if (e.ctrlKey || e.metaKey || e.altKey) handled = false;
  else if (key === 'Tab') cyclePair(e.shiftKey ? -1 : 1);
  else if (/^[1-9]$/.test(key)) selectPair(Number(key) - 1);
  else if (key === 'ArrowUp') onArrow(-1, 0);
  else if (key === 'ArrowDown') onArrow(1, 0);
  else if (key === 'ArrowLeft') onArrow(0, -1);
  else if (key === 'ArrowRight') onArrow(0, 1);
  else if (key === 'Backspace') onRetreat();
  else if (key === 'Delete') onErase();
  else if (key.toLowerCase() === 'h') onHint();
  else if (key.toLowerCase() === 'p' || key === 'Escape') pauseGame();
  else handled = false;
  if (handled) e.preventDefault();
}

// ---------- 選單、統計與說明 ----------

/**
 * 取得難度的盤面大小說明。
 * @param {string} key 難度代碼。
 * @returns {string} 例如「9×9、10×10」。
 */
function sizeText(key) {
  return DIFFICULTIES[key].sizes.map((n) => `${n}×${n}`).join('、');
}

/** 遊戲中的選單。 */
async function openGameMenu() {
  if (!app.state) return;
  const choice = await openModal({
    title: '選單',
    menu: [
      { label: '開始新局…', value: 'new' },
      { label: '重開本局', value: 'restart', className: 'danger-text' },
      { label: THEME_LABEL[app.settings.theme], value: 'theme' },
      { label: '回首頁', value: 'home' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'new') {
    const difficulty = await openModal({
      title: '選擇難度',
      menu: DIFFICULTY_KEYS.map((key) => ({
        label: `${DIFFICULTIES[key].label}（${sizeText(key)}，提示 ${DIFFICULTIES[key].hints} 次）`,
        value: key,
      })),
      actions: [{ label: '取消', value: null }],
    });
    if (difficulty) startNewGame(difficulty);
  } else if (choice === 'restart') {
    restartCurrent();
  } else if (choice === 'theme') {
    cycleTheme();
  } else if (choice === 'home') {
    goHome();
  }
}

/** 顯示統計。 */
async function openStats() {
  const stats = store.loadStats();
  const rows = DIFFICULTY_KEYS.map((key) => {
    const s = stats[key];
    const best = s.bestMs === null ? '—' : formatTime(s.bestMs);
    const avg = s.completed ? formatTime(s.totalMs / s.completed) : '—';
    return `<tr><td>${DIFFICULTIES[key].label}</td><td>${s.started}</td><td>${s.completed}</td><td>${best}</td><td>${avg}</td><td>${s.noHint}</td><td>${s.perfect}</td></tr>`;
  }).join('');
  const choice = await openModal({
    title: '統計',
    html: `<table class="stats-table">
      <thead><tr><th>難度</th><th>開局</th><th>完成</th><th>最佳</th><th>平均</th><th>無提示</th><th>完美</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="margin-top:10px;font-size:13px">統計只存在這台裝置。「無提示」為未使用提示完成的局數；「完美」為未使用提示且每對端點一筆就連好的局數。</p>`,
    actions: [
      { label: '重設統計', value: 'reset', className: 'danger' },
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'reset' && (await confirmDialog('重設統計？', '所有難度的統計都會歸零，無法復原。', '重設'))) {
    store.resetStats();
    openStats();
  }
}

/** 顯示玩法說明。 */
function openRules() {
  openModal({
    title: '玩法',
    html: `<p>把相同數字（相同顏色）的兩個圓點用線連起來。</p>
      <ol>
        <li>線只能上下左右走，不能斜走。</li>
        <li>線不能交叉，也不能重疊。</li>
        <li>所有編號都連好，<b>而且每一格都被線填滿</b>才算完成。</li>
      </ol>
      <p><b>點選畫線</b>：點一個圓點，再一格一格點相鄰的格子；點線上的格子可以退回。<b>拖曳</b>也可以畫線。</p>
      <p>線畫進別條線時會把它截斷；同一筆內退回，被截斷的線會恢復。「筆數」等於端點對數且沒用提示就是「完美」。</p>
      <p><b>電腦鍵盤</b>：Tab 或數字鍵選編號、方向鍵畫線、Backspace 退回一格、Delete 清除整條線、H 提示、P 或 Esc 暫停、Ctrl／⌘＋Z 復原。</p>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

// ---------- 繪製 ----------

/** 建立首頁的難度按鈕。 */
function buildDifficultyButtons() {
  els.difficultyList.innerHTML = '';
  for (const key of DIFFICULTY_KEYS) {
    const cfg = DIFFICULTIES[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'difficulty-btn';
    b.dataset.difficulty = key;
    b.innerHTML = `${cfg.label}<small>${sizeText(key)} · 提示 ${cfg.hints} 次</small>`;
    els.difficultyList.appendChild(b);
  }
}

/** 依目前題目建立盤面格子；題目沒變時不重建。 */
function buildBoard() {
  const s = app.state;
  const key = s ? `${s.size}:${JSON.stringify(s.ends)}` : '';
  if (!s || app.builtKey === key) return;
  app.builtKey = key;
  els.board.innerHTML = '';
  els.board.style.setProperty('--n', String(s.size));
  cells = [];
  for (let i = 0; i < s.size * s.size; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.dataset.i = String(i);
    el.setAttribute('role', 'gridcell');
    if (i % s.size === s.size - 1) el.classList.add('last-col');
    if (i >= s.size * (s.size - 1)) el.classList.add('last-row');
    el.innerHTML = '<span class="arm up"></span><span class="arm right"></span><span class="arm down"></span><span class="arm left"></span><span class="knob"></span>';
    const end = document.createElement('span');
    end.className = 'end';
    end.hidden = true;
    el.appendChild(end);
    els.board.appendChild(el);
    cells.push({ el, end });
  }
}

/**
 * 計算兩個相鄰格子之間的方向位元（從 a 看 b）。
 * @param {number} size 盤面邊長。
 * @param {number} a 格子索引。
 * @param {number} b 相鄰格子索引。
 * @returns {number} DIR 中的位元。
 */
function dirBit(size, a, b) {
  if (b === a - size) return DIR.u;
  if (b === a + size) return DIR.d;
  return b === a + 1 ? DIR.r : DIR.l;
}

/** 重繪遊戲畫面。 */
function render() {
  const s = app.state;
  if (!s) return;
  buildBoard();
  const n = s.size;
  const owner = ownerGrid(s);
  const links = new Uint8Array(n * n);
  const onPath = new Uint8Array(n * n);
  s.paths.forEach((p) => {
    if (p.length < 2) return;
    for (let t = 0; t < p.length; t++) {
      onPath[p[t]] = 1;
      if (t > 0) links[p[t]] |= dirBit(n, p[t], p[t - 1]);
      if (t < p.length - 1) links[p[t]] |= dirBit(n, p[t], p[t + 1]);
    }
  });
  const picked = app.session && !app.paused ? app.session.k : -1;
  const head = picked >= 0 ? currentHead() : -1;
  const showUnfilled = !s.completed && connectedCount(s) === s.ends.length;
  const endOf = new Map();
  s.ends.forEach(([a, b], k) => {
    endOf.set(a, k);
    endOf.set(b, k);
  });

  for (let i = 0; i < cells.length; i++) {
    const { el, end } = cells[i];
    const k = owner[i];
    const ep = endOf.has(i) ? endOf.get(i) : -1;
    if (k >= 0) {
      const color = (k % COLORS) + 1;
      el.style.setProperty('--pc', `var(--p${color})`);
      el.style.setProperty('--pc-text', LIGHT_COLORS.has(color) ? '#1b1b1b' : '#fff');
    } else {
      el.style.removeProperty('--pc');
    }
    const bits = links[i];
    el.classList.toggle('filled', onPath[i] === 1);
    el.classList.toggle('on', onPath[i] === 1 && ep < 0);
    el.classList.toggle('u', (bits & DIR.u) !== 0);
    el.classList.toggle('r', (bits & DIR.r) !== 0);
    el.classList.toggle('d', (bits & DIR.d) !== 0);
    el.classList.toggle('l', (bits & DIR.l) !== 0);
    el.classList.toggle('end-cell', ep >= 0);
    el.classList.toggle('picked', picked >= 0 && k === picked);
    el.classList.toggle('head', i === head);
    el.classList.toggle('hinted', ep >= 0 && s.hinted[ep]);
    el.classList.toggle('unfilled', showUnfilled && k < 0);
    end.hidden = ep < 0;
    end.textContent = ep >= 0 ? String(ep + 1) : '';
    let desc;
    if (ep >= 0) desc = `編號 ${ep + 1} 端點${isConnected(s, ep) ? '，已連通' : ''}${s.hinted[ep] ? '，提示' : ''}`;
    else if (k >= 0) desc = `編號 ${k + 1} 的線`;
    else desc = '空格';
    el.setAttribute('aria-label', `${cellName(i)}，${desc}`);
  }

  const connected = connectedCount(s);
  els.progress.textContent = app.paused ? '' : `連線 ${connected}／${s.ends.length}・填滿 ${Math.floor(fillRatio(s) * 100)}%・${s.strokes} 筆`;
  const left = hintsLeft(s);
  els.hintCount.textContent = String(left);
  els.hintBtn.setAttribute('aria-disabled', String(left === 0 || s.completed));
  els.hintBtn.setAttribute('aria-label', `提示，剩餘 ${left} 次`);
  els.undoBtn.disabled = app.undoStack.length === 0 || s.completed;
  els.eraseBtn.setAttribute('aria-disabled', String(!app.session));
  els.gameDifficulty.textContent = `${DIFFICULTIES[s.difficulty].label} ${n}×${n}`;
  els.pauseBtn.disabled = s.completed;
  renderTimer();
  renderMessage();
}

/** 更新遊戲訊息列：暫時訊息優先，其次為選取中的編號或未填滿提示。 */
function renderMessage() {
  const s = app.state;
  let text = app.message;
  let error = app.messageError;
  if (!text && s && !app.paused) {
    if (s.completed) text = '本局已完成';
    else if (connectedCount(s) === s.ends.length) {
      text = '還有空格沒有填滿（紅底格子）';
      error = true;
    } else if (app.session) {
      text = isConnected(s, app.session.k) ? `編號 ${app.session.k + 1} 已連通` : `編號 ${app.session.k + 1}：點相鄰格子延伸，點線上格子退回`;
    } else if (hintsLeft(s) === 0) text = '本局提示已用完';
  }
  els.message.textContent = text;
  els.message.classList.toggle('error', error);
}

/** 更新首頁的「繼續遊戲」與提示訊息。 */
function renderHome() {
  const s = app.state && !app.state.completed ? app.state : store.loadSave().state;
  if (s && !s.completed) {
    const elapsed = app.state === s ? currentElapsed() : s.elapsedMs;
    els.continueDetail.textContent = `${DIFFICULTIES[s.difficulty].label} ${s.size}×${s.size} · ${formatTime(elapsed)} · 提示剩 ${hintsLeft(s)} 次`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
}

/**
 * 在首頁顯示提示訊息。
 * @param {string[]} paragraphs 段落文字（內建字串）。
 */
function showHomeNotice(paragraphs) {
  els.homeNotice.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');
  els.homeNotice.hidden = paragraphs.length === 0;
}

// ---------- Service Worker 與離線狀態 ----------

/**
 * 設定首頁的離線狀態文字。
 * @param {string} text 狀態文字。
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
 * @param {number} timeoutMs 逾時毫秒。
 * @returns {Promise<any>} 回覆內容。
 */
function askServiceWorker(sw, message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    /**
     * 接收回覆。
     * @param {MessageEvent} event 回覆事件。
     */
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data);
    };
    sw.postMessage(message, [channel.port2]);
  });
}

/**
 * 確認所有必要資源都在快取中，更新離線狀態。
 * 詢問本遊戲自己註冊的 Service Worker，而不是目前控制頁面的那一個：
 * 與遊戲選單部署在同一網域時，首次開啟可能暫時由選單的 Service Worker 控制。
 */
async function refreshOfflineStatus() {
  const own = app.registration && app.registration.active;
  if (!own) {
    setOfflineStatus('離線資源下載中…（請保持連線）', false);
    return;
  }
  try {
    const result = await askServiceWorker(own, { type: 'CHECK_CACHE' }, 5000);
    if (result && result.ok) setOfflineStatus(`✓ 已可離線使用${result.label ? `・版本 ${result.label}` : ''}`, true);
    else setOfflineStatus(`離線資源不完整（缺 ${result ? result.missing : '?'} 個檔案），請連網後重新開啟`, false);
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

/** 使用者同意更新：存檔後啟用新版並重新載入。 */
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
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') checkWaiting(reg);
      if (worker.state === 'activated') refreshOfflineStatus();
    });
  });
  checkWaiting(reg);
  refreshOfflineStatus();
}

/** 回到前景時偶爾檢查新版本（最多每小時一次，失敗不影響遊戲）。 */
function maybeCheckUpdate() {
  const reg = app.registration;
  if (!reg || !navigator.onLine || Date.now() - app.lastUpdateCheck < 3600000) return;
  app.lastUpdateCheck = Date.now();
  reg.update().catch(() => {});
}

// ---------- 初始化 ----------

/** 判斷是否為 iOS／iPadOS 的瀏覽器分頁（非主畫面 App）。 */
function isIosBrowserTab() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return ios && !standalone;
}

/** 綁定所有事件。 */
function bindEvents() {
  els.themeBtn.addEventListener('click', cycleTheme);
  els.continueBtn.addEventListener('click', continueGame);
  els.difficultyList.addEventListener('click', (e) => {
    const b = e.target.closest('.difficulty-btn');
    if (b) startNewGame(b.dataset.difficulty);
  });
  els.rulesBtn.addEventListener('click', openRules);
  els.statsBtn.addEventListener('click', openStats);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.board.addEventListener('pointerdown', onPointerDown);
  els.board.addEventListener('pointermove', onPointerMove);
  els.board.addEventListener('pointerup', onPointerUp);
  els.board.addEventListener('pointercancel', onPointerUp);
  els.undoBtn.addEventListener('click', onUndo);
  els.eraseBtn.addEventListener('click', onErase);
  els.hintBtn.addEventListener('click', onHint);
  els.pauseBtn.addEventListener('click', pauseGame);
  els.resumeBtn.addEventListener('click', resumeGame);
  els.updateBtn.addEventListener('click', applyUpdate);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
  });
  document.addEventListener('keydown', onKeyDown);

  window.addEventListener('popstate', () => {
    if (app.screen === 'game') {
      closeModal(null);
      showHome();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (app.screen === 'game') pauseGame();
      persist();
    } else {
      maybeCheckUpdate();
      if (app.screen === 'home') renderHome();
    }
  });
  window.addEventListener('pagehide', persist);

  // 防止誤觸：iOS 捏合縮放、長按選單。
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

/**
 * 與遊戲選單部署在同一網域時（選單會在 localStorage 記錄自己的路徑），顯示返回選單的連結。
 */
function setupPortalLink() {
  let path = null;
  try {
    path = localStorage.getItem('games.portal');
  } catch {
    // 忽略：無法讀取時不顯示連結。
  }
  if (!path || !path.startsWith('/') || path.startsWith('//')) return;
  const link = $('portal-link');
  link.href = path;
  link.hidden = false;
}

/** 啟動程式。 */
function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('numberlink');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  buildDifficultyButtons();
  bindEvents();
  if (history.state && history.state.screen === 'game') history.replaceState(null, '');

  const notices = [];
  if (!store.storageAvailable()) {
    notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  }
  const saved = store.loadSave();
  if (saved.status === 'corrupt') {
    store.clearSave();
    notices.push('先前的遊戲進度資料損毀，已無法恢復，請開始新局。');
  }
  if (isIosBrowserTab()) {
    notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟：主畫面 App 與 Safari 的進度互不相通，只在 Safari 中玩時，7 天未使用可能被清除資料。');
  }
  showHomeNotice(notices);
  setupPortalLink();
  showHome();
  setupServiceWorker();
}

init();
