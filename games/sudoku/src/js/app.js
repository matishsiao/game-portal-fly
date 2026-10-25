// 主程式：畫面切換、棋盤繪製、操作事件、計時、出題排程、Service Worker 與離線狀態。

import { DIFFICULTIES, DIFFICULTY_KEYS, generatePuzzle } from './sudoku/generator.js';
import { ROW_OF, COL_OF } from './sudoku/core.js';
import {
  createGame, restartGame, inputDigit, toggleNote, erase, applyUndo, useHint,
  isGiven, isLocked, isWrong, isComplete, isRelated, hintsLeft, hintQuota, remainingCounts,
} from './game.js';
import * as store from './storage.js';

/** 前景出題逾時（毫秒）。 */
const GENERATE_TIMEOUT = { easy: 15000, medium: 15000, hard: 15000, expert: 30000 };
/** 背景預先產生的逾時（毫秒）。 */
const PREGEN_TIMEOUT = 60000;
/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 2500;

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
  statsBtn: $('stats-btn'),
  homeBtn: $('home-btn'),
  menuBtn: $('menu-btn'),
  gameDifficulty: $('game-difficulty'),
  timer: $('timer'),
  mistakes: $('mistakes'),
  board: $('board'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  message: $('game-message'),
  undoBtn: $('undo-btn'),
  eraseBtn: $('erase-btn'),
  notesBtn: $('notes-btn'),
  notesState: $('notes-state'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  numpad: $('numpad'),
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
  selected: -1,
  notesMode: false,
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
};

const cells = [];
const numButtons = [];

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
  app.selected = -1;
  app.notesMode = false;
  app.undoStack = [];
  app.paused = false;
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
    const ok = await confirmDialog('重開本局？', '會清除所有輸入、筆記、提示，耗時與提示次數也會重設。', '重開本局');
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
  const { newRecord } = store.recordComplete(s.difficulty, s.elapsedMs, s.hintsUsed);
  store.clearSave();
  app.selected = -1;
  app.undoStack = [];
  render();
  const label = DIFFICULTIES[s.difficulty].label;
  const choice = await openModal({
    title: '完成！',
    html:
      (newRecord ? '<p><span class="record-badge">🏆 新紀錄</span></p>' : '') +
      `<dl class="result-list">
        <dt>難度</dt><dd>${label}</dd>
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>錯誤次數</dt><dd>${s.mistakes}</dd>
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

/** 盤面變更後：存檔、重繪並檢查完成。 */
function afterChange() {
  persist();
  render();
  if (isComplete(app.state)) finishGame();
}

/**
 * 選取格子。
 * @param {number} i 格子索引。
 */
function selectCell(i) {
  if (!canPlay()) return;
  app.selected = i;
  clearMessage();
  render();
}

/**
 * 輸入數字（一般模式填數字，筆記模式切換候選）。
 * @param {number} d 數字 1～9。
 */
function onDigit(d) {
  if (!canPlay()) return;
  const s = app.state;
  const i = app.selected;
  if (i < 0) {
    showMessage('請先選取一個格子');
    return;
  }
  if (isGiven(s, i)) {
    showMessage('題目給定的數字不能修改');
    return;
  }
  if (s.hinted[i]) {
    showMessage('提示填入的數字不能修改');
    return;
  }
  if (app.notesMode) {
    if (s.values[i]) {
      showMessage('此格已有數字，請先清除再加筆記');
      return;
    }
    const r = toggleNote(s, i, d);
    if (r) app.undoStack.push(r.undo);
  } else {
    const r = inputDigit(s, i, d);
    if (!r) return;
    app.undoStack.push(r.undo);
    clearMessage();
  }
  afterChange();
}

/** 清除選取格的數字或筆記。 */
function onErase() {
  if (!canPlay() || app.selected < 0) return;
  if (isLocked(app.state, app.selected)) {
    showMessage(isGiven(app.state, app.selected) ? '題目給定的數字不能清除' : '提示填入的數字不能清除');
    return;
  }
  const r = erase(app.state, app.selected);
  if (!r) return;
  app.undoStack.push(r.undo);
  clearMessage();
  afterChange();
}

/** 復原上一個操作。 */
function onUndo() {
  if (!canPlay()) return;
  const entry = app.undoStack.pop();
  if (!entry) {
    showMessage('沒有可以復原的操作');
    return;
  }
  applyUndo(app.state, entry);
  app.selected = entry.i;
  clearMessage();
  afterChange();
}

/** 切換筆記模式。 */
function onToggleNotes() {
  if (!canPlay()) return;
  app.notesMode = !app.notesMode;
  render();
}

/** 使用提示。 */
function onHint() {
  if (!canPlay()) return;
  const s = app.state;
  const r = useHint(s, app.selected);
  if (r.result === 'no-quota') {
    showMessage(`本局提示已用完（每局 ${hintQuota(s)} 次）`);
    return;
  }
  if (r.result === 'already-correct') {
    showMessage('此格已正確，未使用提示');
    return;
  }
  if (r.result !== 'filled') return;
  app.selected = r.cell;
  app.undoStack = [];
  showMessage(`已提示，剩餘 ${hintsLeft(s)} 次`);
  afterChange();
}

/**
 * 以方向鍵移動選取格。
 * @param {number} dr 列位移。
 * @param {number} dc 行位移。
 */
function moveSelection(dr, dc) {
  if (!canPlay()) return;
  if (app.selected < 0) {
    selectCell(40);
    return;
  }
  const r = (ROW_OF[app.selected] + dr + 9) % 9;
  const c = (COL_OF[app.selected] + dc + 9) % 9;
  selectCell(r * 9 + c);
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
  const key = e.key;
  let handled = true;
  if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'z') onUndo();
  else if (e.ctrlKey || e.metaKey || e.altKey) handled = false;
  else if (/^[1-9]$/.test(key)) onDigit(Number(key));
  else if (key === 'Backspace' || key === 'Delete' || key === '0') onErase();
  else if (key === 'ArrowUp') moveSelection(-1, 0);
  else if (key === 'ArrowDown') moveSelection(1, 0);
  else if (key === 'ArrowLeft') moveSelection(0, -1);
  else if (key === 'ArrowRight') moveSelection(0, 1);
  else if (key.toLowerCase() === 'n') onToggleNotes();
  else if (key.toLowerCase() === 'h') onHint();
  else if (key.toLowerCase() === 'p' || key === 'Escape') pauseGame();
  else handled = false;
  if (handled) e.preventDefault();
}

// ---------- 選單、統計與說明 ----------

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
        label: `${DIFFICULTIES[key].label}（提示 ${DIFFICULTIES[key].hints} 次）`,
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
    return `<tr><td>${DIFFICULTIES[key].label}</td><td>${s.started}</td><td>${s.completed}</td><td>${best}</td><td>${avg}</td><td>${s.noHint}</td></tr>`;
  }).join('');
  const choice = await openModal({
    title: '統計',
    html: `<table class="stats-table">
      <thead><tr><th>難度</th><th>開局</th><th>完成</th><th>最佳</th><th>平均</th><th>無提示</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="margin-top:10px;font-size:13px">統計只存在這台裝置。「無提示」為未使用提示完成的局數。</p>`,
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

// ---------- 繪製 ----------

/** 建立棋盤格子與數字鍵。 */
function buildBoard() {
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'button');
    cell.dataset.i = String(i);
    const value = document.createElement('span');
    value.className = 'value';
    const notes = document.createElement('div');
    notes.className = 'notes';
    for (let d = 1; d <= 9; d++) notes.appendChild(document.createElement('span'));
    cell.append(value, notes);
    els.board.appendChild(cell);
    cells.push({ el: cell, value, notes, noteSpans: Array.from(notes.children) });
  }
  for (let d = 1; d <= 9; d++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'num-btn';
    b.dataset.digit = String(d);
    b.innerHTML = `<span>${d}</span><small></small>`;
    els.numpad.appendChild(b);
    numButtons.push(b);
  }
}

/** 重繪遊戲畫面。 */
function render() {
  const s = app.state;
  if (!s) return;
  const sel = app.selected;
  const selValue = sel >= 0 && !app.paused ? s.values[sel] : 0;
  for (let i = 0; i < 81; i++) {
    const { el, value, notes, noteSpans } = cells[i];
    const v = s.values[i];
    const given = isGiven(s, i);
    const wrong = isWrong(s, i);
    el.classList.toggle('given', given);
    el.classList.toggle('hinted', s.hinted[i]);
    el.classList.toggle('wrong', wrong);
    el.classList.toggle('selected', i === sel);
    el.classList.toggle('related', sel >= 0 && i !== sel && isRelated(i, sel));
    el.classList.toggle('same', selValue > 0 && i !== sel && v === selValue);
    value.textContent = v ? String(v) : '';
    const noteMask = v ? 0 : s.notes[i];
    notes.hidden = noteMask === 0;
    if (noteMask) {
      for (let d = 1; d <= 9; d++) {
        const span = noteSpans[d - 1];
        const on = (noteMask & (1 << (d - 1))) !== 0;
        span.textContent = on ? String(d) : '';
        span.classList.toggle('match', on && d === selValue);
      }
    }
    let desc;
    if (!v) desc = noteMask ? `空格，筆記 ${[1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => noteMask & (1 << (d - 1))).join('、')}` : '空格';
    else if (given) desc = `題目 ${v}`;
    else if (s.hinted[i]) desc = `提示 ${v}`;
    else desc = `輸入 ${v}${wrong ? '，錯誤' : ''}`;
    el.setAttribute('aria-label', `第 ${ROW_OF[i] + 1} 列第 ${COL_OF[i] + 1} 行，${desc}`);
  }

  const counts = remainingCounts(s);
  numButtons.forEach((b, idx) => {
    const d = idx + 1;
    const done = counts[d] === 0;
    b.classList.toggle('done', done);
    b.classList.toggle('notes-mode', app.notesMode);
    b.disabled = done || s.completed;
    b.querySelector('small').textContent = done ? '' : String(counts[d]);
    b.setAttribute('aria-label', done ? `${d}，已全部填入` : `${d}，剩 ${counts[d]} 個`);
  });

  const left = hintsLeft(s);
  els.hintCount.textContent = String(left);
  els.hintBtn.setAttribute('aria-disabled', String(left === 0 || s.completed));
  els.hintBtn.setAttribute('aria-label', `提示，剩餘 ${left} 次`);
  els.notesBtn.setAttribute('aria-pressed', String(app.notesMode));
  els.notesState.textContent = app.notesMode ? '開' : '關';
  els.undoBtn.disabled = app.undoStack.length === 0 || s.completed;
  els.gameDifficulty.textContent = DIFFICULTIES[s.difficulty].label;
  els.mistakes.textContent = `錯誤 ${s.mistakes}`;
  els.pauseBtn.disabled = s.completed;
  renderTimer();
  renderMessage();
}

/** 更新遊戲訊息列：暫時訊息優先，否則顯示選取格的錯誤或筆記模式說明。 */
function renderMessage() {
  const s = app.state;
  let text = app.message;
  let error = app.messageError;
  if (!text && s && !app.paused) {
    if (s.completed) text = '本局已完成';
    else if (app.selected >= 0 && isWrong(s, app.selected)) {
      text = '✕ 此格數字錯誤';
      error = true;
    } else if (hintsLeft(s) === 0 && app.selected >= 0 && !isLocked(s, app.selected) && !s.values[app.selected]) {
      text = '本局提示已用完';
    } else if (app.notesMode) text = '筆記模式：點數字切換候選';
  }
  els.message.textContent = text;
  els.message.classList.toggle('error', error);
}

/** 更新首頁的「繼續遊戲」與提示訊息。 */
function renderHome() {
  const s = app.state && !app.state.completed ? app.state : store.loadSave().state;
  if (s && !s.completed) {
    const elapsed = app.state === s ? currentElapsed() : s.elapsedMs;
    els.continueDetail.textContent = `${DIFFICULTIES[s.difficulty].label} · ${formatTime(elapsed)} · 提示剩 ${hintsLeft(s)} 次`;
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
  document.querySelectorAll('.difficulty-btn').forEach((b) => {
    b.addEventListener('click', () => startNewGame(b.dataset.difficulty));
  });
  els.statsBtn.addEventListener('click', openStats);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.board.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell');
    if (cell) selectCell(Number(cell.dataset.i));
  });
  els.numpad.addEventListener('click', (e) => {
    const b = e.target.closest('.num-btn');
    if (b) onDigit(Number(b.dataset.digit));
  });
  els.undoBtn.addEventListener('click', onUndo);
  els.eraseBtn.addEventListener('click', onErase);
  els.notesBtn.addEventListener('click', onToggleNotes);
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
  applyTheme();
  buildBoard();
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
