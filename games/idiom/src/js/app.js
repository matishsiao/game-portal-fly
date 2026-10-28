// 主程式：詞庫載入、畫面切換、盤面與字庫、成語卡、成語本、資料來源、計時、出題排程、Service Worker 與離線狀態。

import { buildIndex } from './idiom/data.js';
import { DIFFICULTIES, DIFFICULTY_KEYS, generateGame } from './idiom/generator.js';
import { wordCells, cellWords } from './idiom/board.js';
import { maskRanges } from './idiom/mask.js';
import {
  createGame, restartGame, answersFor, currentIndex, inputChar, erase, applyUndo, useHint, remainingChars,
  bankOrder, nextEmpty, isBlank, isLocked, isWrong, isWordDone, isBoardDone, shownChar, wordResult, hintsLeft, hintQuota,
} from './game.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';

/** 前景出題逾時（毫秒）。 */
const GENERATE_TIMEOUT = { easy: 15000, medium: 15000, hard: 15000, expert: 30000 };
/** 背景預先產生的逾時（毫秒）。 */
const PREGEN_TIMEOUT = 60000;
/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 2500;
/** 成語完成閃爍時間（毫秒），須與 CSS 動畫長度一致。 */
const FLASH_MS = 700;
/** 首頁難度按鈕的說明。 */
const DIFFICULTY_DESC = {
  easy: '10 題・填 1 字',
  medium: '8 題・填 2 字',
  hard: '交叉・最大 9×9',
  expert: '交叉・最大 10×10',
};
/** 作答結果的文字。 */
const RESULT_TEXT = { perfect: '✓ 一次答對', wrong: '✕ 曾答錯', hint: '提示' };
/** 例句語義群組的編號（與《成語典》網站相同，以「一、」「二、」分組）。 */
const GROUP_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
/** 常見度名稱。 */
const LEVEL_TEXT = { 1: '常見', 2: '一般', 3: '進階' };

/**
 * 依 id 取得元素。
 * @param {string} id 元素 id。
 * @returns {HTMLElement} 元素。
 */
const $ = (id) => document.getElementById(id);

const els = {
  home: $('home'),
  game: $('game'),
  book: $('book'),
  themeBtn: $('theme-btn'),
  offlineStatus: $('offline-status'),
  homeNotice: $('home-notice'),
  continueBtn: $('continue-btn'),
  continueDetail: $('continue-detail'),
  difficultyList: $('difficulty-list'),
  bookBtn: $('book-btn'),
  rulesBtn: $('rules-btn'),
  statsBtn: $('stats-btn'),
  sourceBtn: $('source-btn'),
  homeBtn: $('home-btn'),
  menuBtn: $('menu-btn'),
  gameDifficulty: $('game-difficulty'),
  timer: $('timer'),
  mistakes: $('mistakes'),
  board: $('board'),
  clue: $('clue'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  message: $('game-message'),
  undoBtn: $('undo-btn'),
  eraseBtn: $('erase-btn'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  bank: $('bank'),
  bookBack: $('book-back'),
  bookSummary: $('book-summary'),
  bookLevel: $('book-level'),
  bookSearch: $('book-search'),
  bookList: $('book-list'),
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
  /** 詞庫索引與資料來源資訊（載入完成前為 null）。 */
  index: null,
  source: null,
  state: null,
  /** 每個盤面的正確字。 */
  answers: [],
  /** 目前盤面每格所屬的成語。 */
  cellWords: [],
  /** 目前選取的格子與成語（交叉模式中同一格可能屬於兩個成語）。 */
  sel: -1,
  activeWord: 0,
  undoStack: [],
  /** 已完成的成語（「盤面:成語」），用來偵測新完成的成語。 */
  done: new Set(),
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
  builtKey: '',
  clueKey: '',
  /** 最近一次完成時是否刷新紀錄。 */
  newRecord: false,
  bookTab: 'all',
};

/** 盤面格子元素（索引同盤面；空白區域只有 el）。 */
let cells = [];

// ---------- 共用工具 ----------

/**
 * 跳脫 HTML 特殊字元（顯示《成語典》文字時使用，不改變文字內容）。
 * @param {string} s 文字。
 * @returns {string} 可安全放入 HTML 的字串。
 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

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
 * 由成語 id 取得文字。
 * @param {string} id 成語 id。
 * @returns {string | undefined} 成語，不存在時為 undefined。
 */
function textOf(id) {
  const item = app.index && app.index.byId.get(id);
  return item ? item.text : undefined;
}

/**
 * 取得目前作答中的盤面。
 * @returns {object} 盤面。
 */
function board() {
  return app.state.boards[currentIndex(app.state)];
}

/**
 * 取得目前盤面的正確字。
 * @returns {string[]} 正確字。
 */
function answers() {
  return app.answers[currentIndex(app.state)];
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
 * 開啟對話框並等待使用者選擇。內容中帶有 data-modal-value 的按鈕點選後也會關閉對話框並回傳該值。
 * @param {object} options 選項。
 * @param {string} options.title 標題。
 * @param {string} [options.html] 內容 HTML（文字須先經 esc 跳脫）。
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
  els.modal.querySelector('.dialog').scrollTop = 0;
  const first = els.modalActions.querySelector('button.primary') || els.modal.querySelector('button');
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

// ---------- 詞庫 ----------

/**
 * 載入詞庫與資料來源資訊。
 * @returns {Promise<void>} 載入完成。
 * @throws {Error} 任何檔案無法載入時。
 */
async function loadData() {
  const names = ['idioms.json', 'idiom-levels.json', 'idiom-check.json', 'source.json'];
  const [idioms, levels, check, source] = await Promise.all(
    names.map((name) =>
      fetch(`data/${name}`).then((res) => {
        if (!res.ok) throw new Error(name);
        return res.json();
      }),
    ),
  );
  app.index = buildIndex({ idioms, levels, check });
  app.source = source;
}

// ---------- 出題 ----------

/**
 * 出題：優先在 Web Worker 中執行；Worker 無法建立或載入失敗時，改用主程式已載入的詞庫與出題器。
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
  const request = { difficulty, exclude: store.loadRecent(), priority: store.bookPriority() };
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
        finish(generateGame(difficulty, app.index, { exclude: request.exclude, priority: request.priority }));
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
   * 接收 Worker 回傳的出題結果；Worker 內載入詞庫失敗時改在主程式出題。
   * @param {MessageEvent} event 結果訊息。
   */
  worker.onmessage = (event) => {
    if (event.data.ok) finish(event.data.result);
    else fallback();
  };
  /**
   * Worker 載入或執行失敗時改在主程式出題。
   * @param {ErrorEvent} event 錯誤事件。
   */
  worker.onerror = (event) => {
    event.preventDefault();
    fallback();
  };
  worker.postMessage(request);
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
 * 稍後在背景為指定難度預先產生下一局；完成後即停止。
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
 * 取得新的一局：優先使用預先產生的題目，否則即時出題；失敗時可重試。
 * @param {string} difficulty 難度代碼。
 * @returns {Promise<object | null>} 題目，使用者取消時為 null。
 */
async function obtainPuzzle(difficulty) {
  cancelPregen();
  const recent = store.loadRecent();
  const pre = store.takePregen(difficulty, textOf);
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
  const s = app.state || store.loadSave(textOf).state;
  return !!(s && s.touched && !s.completed);
}

/**
 * 選取目前盤面的第一個未填空格（沒有時選第一個空格）。
 */
function selectFirstEmpty() {
  const b = board();
  const cell = nextEmpty(b, -1);
  app.sel = cell >= 0 ? cell : b.blanks[0];
  app.activeWord = app.cellWords[app.sel] ? app.cellWords[app.sel][0] : 0;
}

/** 進入目前盤面：建立格子與成語的對應，並選取第一個空格。 */
function prepareBoard() {
  app.cellWords = cellWords(board());
  app.undoStack = [];
  selectFirstEmpty();
}

/**
 * 設定新的遊戲狀態並重設單局的執行期狀態。
 * @param {object} state 遊戲狀態。
 */
function setState(state) {
  app.state = state;
  app.answers = answersFor(state, textOf);
  app.paused = false;
  app.done = new Set();
  state.boards.forEach((b, bi) => {
    b.words.forEach((_, w) => {
      if (isWordDone(b, app.answers[bi], w)) app.done.add(`${bi}:${w}`);
    });
  });
  prepareBoard();
  clearMessage();
}

/**
 * 開始指定難度的新局；目前有進度時先確認。
 * @param {string} difficulty 難度代碼。
 * @param {{skipConfirm?: boolean}} [options] 選項。
 */
async function startNewGame(difficulty, { skipConfirm = false } = {}) {
  if (!app.index) return;
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
  setState(createGame({ difficulty, mode: data.mode, boards: data.boards }));
  store.recordStart(difficulty);
  store.addRecent(data.hash);
  persist();
  enterGame();
  schedulePregen(difficulty);
}

/** 從存檔繼續遊戲。 */
function continueGame() {
  if (!app.index) return;
  if (!app.state) {
    const saved = store.loadSave(textOf);
    if (saved.status !== 'ok') {
      renderHome();
      return;
    }
    setState(saved.state);
  }
  enterGame();
}

/**
 * 切換顯示的畫面。
 * @param {'home' | 'game' | 'book'} name 畫面。
 */
function showScreen(name) {
  app.screen = name;
  els.home.hidden = name !== 'home';
  els.game.hidden = name !== 'game';
  els.book.hidden = name !== 'book';
}

/** 切換到遊戲畫面並開始計時；逐題模式中若目前這題已完成（例如重新整理前停在成語卡），再顯示成語卡。 */
function enterGame() {
  app.paused = false;
  if (!history.state || history.state.screen !== 'game') history.pushState({ screen: 'game' }, '');
  showScreen('game');
  els.pauseCover.hidden = true;
  render();
  if (app.state.mode === 'single' && isBoardDone(board(), answers())) {
    onQuestionDone();
    return;
  }
  startTimer();
}

/** 從遊戲畫面或成語本回首頁（經由瀏覽器歷史，讓返回鍵行為一致）。 */
function goHome() {
  if (history.state && (history.state.screen === 'game' || history.state.screen === 'book')) history.back();
  else showHome();
}

/** 顯示首頁；進行中的一局會先停止計時並存檔。 */
function showHome() {
  if (app.state) {
    stopTimer();
    if (app.state.completed) app.state = null;
  }
  app.paused = false;
  showScreen('home');
  renderHome();
}

/** 暫停遊戲並遮住盤面、線索與字庫。 */
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
    const ok = await confirmDialog('重開本局？', '會清除所有填入的字與提示，耗時、錯誤次數與提示次數也會重設。', '重開本局');
    if (!ok) return;
  }
  stopTimer(false);
  setState(restartGame(app.state));
  persist();
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/** 完成一局：停止計時、更新統計並清除存檔。 */
function completeGame() {
  stopTimer(false);
  const s = app.state;
  s.completed = true;
  app.newRecord = store.recordComplete(s.difficulty, s.elapsedMs, s.hintsUsed).newRecord;
  store.clearSave();
  app.undoStack = [];
  render();
}

/** 顯示完成畫面：統計與本局所有成語的作答結果，點選成語可看成語卡。 */
async function showResults() {
  const s = app.state;
  const words = [];
  s.boards.forEach((b) => b.words.forEach((w, k) => words.push({ id: w.id, result: wordResult(b, k) })));
  const list = words
    .map(({ id, result }) => `<button type="button" data-modal-value="card:${esc(id)}"><span>${esc(textOf(id))}</span><span class="tag ${result}">${RESULT_TEXT[result]}</span></button>`)
    .join('');
  const choice = await openModal({
    title: '完成！',
    html:
      (app.newRecord ? '<p><span class="record-badge">🏆 新紀錄</span></p>' : '') +
      `<dl class="result-list">
        <dt>難度</dt><dd>${DIFFICULTIES[s.difficulty].label}</dd>
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>錯誤次數</dt><dd>${s.mistakes}</dd>
        <dt>已用提示</dt><dd>${s.hintsUsed} / ${hintQuota(s)}</dd>
      </dl>
      <div class="result-words">${list}</div>`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'stay',
  });
  if (typeof choice === 'string' && choice.startsWith('card:')) {
    await openCard(choice.slice(5), '返回結果');
    showResults();
  } else if (choice === 'again') startNewGame(s.difficulty, { skipConfirm: true });
  else if (choice === 'home') goHome();
}

/** 逐題模式：一題完成後顯示成語卡，再進入下一題；最後一題完成後顯示完成畫面。 */
async function onQuestionDone() {
  const s = app.state;
  const b = board();
  const last = s.index === s.boards.length - 1;
  stopTimer();
  if (last) completeGame();
  await openCard(b.words[0].id, last ? '看結果' : '下一題');
  if (last) {
    showResults();
    return;
  }
  if (app.screen !== 'game' || app.state !== s) return;
  s.index++;
  prepareBoard();
  persist();
  render();
  startTimer();
}

// ---------- 成語卡、資料來源、成語本 ----------

/**
 * 產生成語卡內容（《成語典》原文；例句依語義群組分組，例句中的成語以底色標示）。
 * @param {string} id 成語 id。
 * @returns {string} HTML。
 */
function cardHtml(id) {
  const item = app.index.byId.get(id);
  const mark = (s) => esc(s).split(esc(item.text)).join(`<mark>${esc(item.text)}</mark>`);
  return `<div class="idiom-card">
      <p class="card-title">${esc(item.text)}</p>
      <p class="card-zhuyin">${esc(item.zhuyin)}</p>
      <h3>釋義</h3>
      <p class="card-meaning">${esc(item.meaning)}</p>
      <h3>例句</h3>
      ${item.examples
        .map(
          (group, g) =>
            `${item.examples.length > 1 ? `<p class="card-group">${GROUP_NUMBERS[g] || g + 1}、</p>` : ''}<ol class="card-examples">${group.map((ex) => `<li>${mark(ex)}</li>`).join('')}</ol>`,
        )
        .join('')}
      <p class="card-source">資料來源：教育部《成語典》 <button type="button" data-modal-value="source">出處與授權</button></p>
    </div>`;
}

/**
 * 顯示成語卡。
 * @param {string} id 成語 id。
 * @param {string} [primaryLabel='關閉'] 主要按鈕文字。
 * @returns {Promise<void>} 成語卡關閉後完成。
 */
async function openCard(id, primaryLabel = '關閉') {
  const choice = await openModal({ title: '成語卡', html: cardHtml(id), actions: [{ label: primaryLabel, value: 'ok', className: 'primary' }], dismissValue: 'ok' });
  if (choice === 'source') {
    await openSources();
    await openCard(id, primaryLabel);
  }
}

/**
 * 顯示資料來源頁：出處、版本、網址、授權條款與教育部使用說明。
 * @returns {Promise<void>} 關閉後完成。
 */
async function openSources() {
  const src = app.source || {};
  await openModal({
    title: '資料來源',
    html: `<div class="source-page">
      <p>本遊戲的成語、注音、釋義與例句取自：</p>
      <p><b>${esc(src.publisher || '中華民國教育部（Ministry of Education, R.O.C.）')}。《成語典》（版本編號：${esc(src.version || '')}）網址：<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.url)}</a></b></p>
      <p>授權條款：<a href="${esc(src.licenseUrl)}" target="_blank" rel="noopener">${esc(src.license || '')}</a>。遊戲中顯示的《成語典》內容皆為原文，未經修改。</p>
      <p>教育部公眾授權使用說明：<a href="${esc(src.notice)}" target="_blank" rel="noopener">PDF</a>、<a href="${esc(src.noticeOdt)}" target="_blank" rel="noopener">ODT</a>（隨本遊戲一起散布，離線也能開啟）。</p>
      <p>作答時，釋義中會透露答案的文字以色塊遮住（只改變顯示樣式，文字未修改），答完後在成語卡完整顯示。</p>
      <p>常見度分級與易混淆字為本遊戲自行整理，不屬於《成語典》內容。</p>
      <p>內容如有錯誤或遺漏，請向教育部《成語典》回報。</p>
    </div>`,
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
}

/** 開啟成語本。 */
function openBook() {
  if (!app.index) return;
  if (!history.state || history.state.screen !== 'book') history.pushState({ screen: 'book' }, '');
  showScreen('book');
  renderBook();
}

/** 繪製成語本：已學會數量、全部／待複習分頁、常見度篩選與搜尋。 */
function renderBook() {
  const { items } = store.loadBook();
  const known = Object.entries(items).filter(([id]) => app.index.byId.has(id));
  els.bookSummary.textContent = `已學會 ${known.length} / ${app.index.idioms.length}`;
  document.querySelectorAll('.book-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === app.bookTab)));
  const level = Number(els.bookLevel.value);
  const q = els.bookSearch.value.trim();
  const rows = known
    .filter(([id, v]) => app.bookTab === 'all' || v.review)
    .filter(([id]) => !level || app.index.level(id) === level)
    .filter(([id]) => {
      if (!q) return true;
      const item = app.index.byId.get(id);
      return item.text.includes(q) || item.meaning.includes(q);
    })
    .sort((a, b) => b[1].last - a[1].last);
  els.bookList.innerHTML = rows.length
    ? rows
        .map(([id, v]) => `<li><button type="button" data-id="${esc(id)}"><span>${esc(textOf(id))}</span><span class="meta">${LEVEL_TEXT[app.index.level(id)]}・完成 ${v.n} 次${v.review ? '・<span class="review">待複習</span>' : ''}</span></button></li>`)
        .join('')
    : `<li class="book-empty">${known.length ? '沒有符合的成語' : '完成成語後會收錄在這裡'}</li>`;
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
 * 判斷目前是否可以操作盤面。
 * @returns {boolean} 可操作時為 true。
 */
function canPlay() {
  return app.screen === 'game' && !!app.state && !app.state.completed && !app.paused && els.modal.hidden;
}

/**
 * 讓指定格子單次閃爍（成語完成或提示清除錯誤格時使用）。
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

/**
 * 盤面變更後：存檔、重繪、標示新完成的成語並記入成語本，檢查本題或本盤是否完成。
 */
function afterChange() {
  const s = app.state;
  const bi = currentIndex(s);
  const b = board();
  const ans = answers();
  const fresh = [];
  b.words.forEach((w, k) => {
    const key = `${bi}:${k}`;
    if (!isWordDone(b, ans, k) || app.done.has(key)) return;
    app.done.add(key);
    fresh.push(k);
    if (!b.recorded[k]) {
      store.recordWord(w.id, wordResult(b, k) === 'perfect');
      b.recorded[k] = true;
    }
  });
  persist();
  render();
  for (const k of fresh) flashCells(wordCells(b, b.words[k]));
  if (isBoardDone(b, ans)) {
    if (s.mode === 'single') onQuestionDone();
    else {
      completeGame();
      showResults();
    }
  } else if (fresh.length && s.mode === 'cross') {
    showMessage(`完成「${textOf(b.words[fresh[0]].id)}」，點線索可看成語卡`);
  }
}

/**
 * 選取格子；交叉模式中再點同一格時，在該格所屬的兩個成語間切換。
 * @param {number} i 格子索引。
 */
function selectCell(i) {
  if (!canPlay() || !answers()[i]) return;
  const words = app.cellWords[i];
  if (i === app.sel && words.length > 1) {
    app.activeWord = words[(words.indexOf(app.activeWord) + 1) % words.length];
  } else {
    app.sel = i;
    if (!words.includes(app.activeWord)) app.activeWord = words[0];
  }
  clearMessage();
  render();
}

/**
 * 選取成語（點線索）：選取其第一個未填空格；已完成的成語則顯示成語卡。
 * @param {number} w 成語索引。
 */
async function selectWord(w) {
  if (!canPlay()) return;
  const b = board();
  if (isWordDone(b, answers(), w)) {
    app.activeWord = w;
    render();
    stopTimer();
    await openCard(b.words[w].id);
    startTimer();
    return;
  }
  const list = wordCells(b, b.words[w]);
  app.activeWord = w;
  app.sel = list.find((c) => isBlank(b, c) && !b.filled[c]) ?? list.find((c) => isBlank(b, c)) ?? list[0];
  clearMessage();
  render();
}

/**
 * 填入後移到下一個空格：優先找目前成語中的空格，其次整個盤面。
 * @param {number} from 剛填入的格子。
 */
function advance(from) {
  const b = board();
  const inWord = wordCells(b, b.words[app.activeWord]).filter((c) => isBlank(b, c) && !b.filled[c] && !b.hinted[c]);
  const next = inWord.length ? inWord.find((c) => c > from) ?? inWord[0] : nextEmpty(b, from);
  if (next >= 0) {
    app.sel = next;
    if (!app.cellWords[next].includes(app.activeWord)) app.activeWord = app.cellWords[next][0];
  }
}

/**
 * 點選字庫的字：填入目前選取的空格（未選取時選第一個未填空格），並移到下一個空格。
 * @param {string} ch 字。
 */
function onChar(ch) {
  if (!canPlay()) return;
  const s = app.state;
  const b = board();
  if (app.sel < 0 || !isBlank(b, app.sel)) selectFirstEmpty();
  const i = app.sel;
  if (!isBlank(b, i)) {
    showMessage('題目給定的字不能修改');
    return;
  }
  if (b.hinted[i]) {
    showMessage('提示填入的字不能修改');
    return;
  }
  if (b.filled[i] === ch) return;
  if ((remainingChars(b).get(ch) || 0) <= 0) {
    showMessage(`字庫裡的「${ch}」已經用完`);
    return;
  }
  const r = inputChar(s, b, answers(), i, ch);
  if (!r) return;
  app.undoStack.push(r.undo);
  clearMessage();
  if (!r.wrong) advance(i);
  afterChange();
}

/** 清除選取格的字（歸還字庫）。 */
function onErase() {
  if (!canPlay() || app.sel < 0) return;
  const b = board();
  if (isLocked(b, app.sel)) {
    showMessage(isBlank(b, app.sel) ? '提示填入的字不能清除' : '題目給定的字不能清除');
    return;
  }
  const r = erase(app.state, b, app.sel);
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
  applyUndo(board(), entry);
  app.sel = entry.cell;
  clearMessage();
  afterChange();
}

/** 使用提示。 */
function onHint() {
  if (!canPlay()) return;
  const s = app.state;
  const b = board();
  const r = useHint(s, b, answers(), app.sel);
  if (r.result === 'no-quota') {
    showMessage(`本局提示已用完（每局 ${hintQuota(s)} 次）`);
    return;
  }
  if (r.result === 'already-correct') {
    showMessage('此格已正確，未使用提示');
    return;
  }
  if (r.result !== 'filled') return;
  app.sel = r.cell;
  if (!app.cellWords[r.cell].includes(app.activeWord)) app.activeWord = app.cellWords[r.cell][0];
  app.undoStack = [];
  if (r.cleared >= 0) {
    showMessage(`已提示，剩餘 ${hintsLeft(s)} 次；已清除填錯的「${answers()[r.cell]}」`);
    afterChange();
    flashCells([r.cleared]);
  } else {
    showMessage(`已提示，剩餘 ${hintsLeft(s)} 次`);
    afterChange();
  }
}

/**
 * 以方向鍵移動選取格：在該方向上找最近的字格（同一直線優先）。
 * @param {number} dr 列方向（-1、0、1）。
 * @param {number} dc 行方向（-1、0、1）。
 */
function moveSelection(dr, dc) {
  if (!canPlay()) return;
  const b = board();
  const ans = answers();
  if (app.sel < 0) {
    selectFirstEmpty();
    render();
    return;
  }
  const r0 = Math.floor(app.sel / b.cols);
  const c0 = app.sel % b.cols;
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < ans.length; i++) {
    if (!ans[i]) continue;
    const r = Math.floor(i / b.cols);
    const c = i % b.cols;
    const along = dr ? (r - r0) * dr : (c - c0) * dc;
    if (along <= 0) continue;
    const score = along + (dr ? Math.abs(c - c0) : Math.abs(r - r0)) * 2;
    if (score < bestScore) {
      best = i;
      bestScore = score;
    }
  }
  if (best >= 0) {
    app.sel = best;
    const words = app.cellWords[best];
    const wantDir = dr ? 'v' : 'h';
    const match = words.find((w) => b.words[w].dir === wantDir);
    app.activeWord = match !== undefined ? match : words[0];
    render();
  }
}

/**
 * 實體鍵盤操作。
 * @param {KeyboardEvent} e 鍵盤事件。
 */
function onKeyDown(e) {
  if (!els.modal.hidden) {
    if (e.key === 'Escape') closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
    else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      const primary = els.modalActions.querySelector('button.primary');
      if (primary) {
        e.preventDefault();
        primary.click();
      }
    }
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
  else if (/^[1-9]$/.test(key)) {
    const ch = bankOrder(board())[Number(key) - 1];
    if (ch) onChar(ch);
  } else if (key === 'Backspace' || key === 'Delete') onErase();
  else if (key === 'ArrowUp') moveSelection(-1, 0);
  else if (key === 'ArrowDown') moveSelection(1, 0);
  else if (key === 'ArrowLeft') moveSelection(0, -1);
  else if (key === 'ArrowRight') moveSelection(0, 1);
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
      { label: '資料來源', value: 'source' },
      { label: '回首頁', value: 'home' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'new') {
    const difficulty = await openModal({
      title: '選擇難度',
      menu: DIFFICULTY_KEYS.map((key) => ({ label: `${DIFFICULTIES[key].label}（${DIFFICULTY_DESC[key]}）`, value: key })),
      actions: [{ label: '取消', value: null }],
    });
    if (difficulty) startNewGame(difficulty);
  } else if (choice === 'restart') {
    restartCurrent();
  } else if (choice === 'theme') {
    cycleTheme();
  } else if (choice === 'source') {
    openSources();
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

/** 顯示玩法說明。 */
function openRules() {
  openModal({
    title: '玩法',
    html: `<p>成語中有空格，從下方<b>字庫</b>選字填入，完成成語。</p>
      <ol>
        <li><b>初級</b>：每題填 1 個字；<b>中級</b>：每題填 2 個字，題目下方的釋義是線索。</li>
        <li><b>高級、專家</b>：多個成語交叉共用文字；點格子或下方線索可以看該成語的釋義。</li>
        <li>點空格選取，再點字庫的字填入，會自動移到下一個空格。點其他字可以直接替換。</li>
        <li>每完成一個成語，都可以看到「成語卡」：注音、釋義與例句，內容來自教育部《成語典》。</li>
      </ol>
      <p>填錯會立即以紅色和 ✕ 標示並記一次錯誤。答錯或用提示完成的成語，會列入「成語本」的待複習。</p>
      <p>作答時，釋義中會透露答案的文字以色塊遮住，答完後完整顯示。</p>
      <p><b>電腦鍵盤</b>：方向鍵移動、數字鍵 1～9 選字庫中的字、Backspace 清除、Enter 下一題、H 提示、P 或 Esc 暫停、Ctrl／⌘＋Z 復原。</p>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

// ---------- 繪製 ----------

/** 建立首頁的難度按鈕（詞庫載入前停用）。 */
function buildDifficultyButtons() {
  els.difficultyList.innerHTML = '';
  for (const key of DIFFICULTY_KEYS) {
    const cfg = DIFFICULTIES[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'difficulty-btn';
    b.dataset.difficulty = key;
    b.disabled = !app.index;
    b.innerHTML = `${cfg.label}<small>${DIFFICULTY_DESC[key]}・提示 ${cfg.hints} 次</small>`;
    els.difficultyList.appendChild(b);
  }
}

/**
 * 計算交叉模式中每個成語的線索標籤（依起點位置編號，例如「橫 2」）。
 * @param {object} b 盤面。
 * @returns {string[]} 每個成語的標籤。
 */
function wordLabels(b) {
  const starts = [...new Set(b.words.map((w) => w.r * b.cols + w.c))].sort((x, y) => x - y);
  return b.words.map((w) => `${w.dir === 'h' ? '橫' : '直'} ${starts.indexOf(w.r * b.cols + w.c) + 1}`);
}

/** 依目前盤面建立格子；盤面沒變時不重建。 */
function buildBoard() {
  const s = app.state;
  const bi = currentIndex(s);
  const b = board();
  const key = `${s.difficulty}:${bi}:${JSON.stringify(b.words)}`;
  if (app.builtKey === key) return;
  app.builtKey = key;
  app.clueKey = '';
  const ans = answers();
  els.board.innerHTML = '';
  els.board.classList.toggle('single', s.mode === 'single');
  els.board.style.setProperty('--rows', String(b.rows));
  els.board.style.setProperty('--cols', String(b.cols));
  els.board.style.setProperty('--max-cell', s.mode === 'single' ? '76px' : '60px');
  const numbers = new Map();
  if (s.mode === 'cross') {
    const labels = wordLabels(b);
    b.words.forEach((w, k) => numbers.set(w.r * b.cols + w.c, labels[k].split(' ')[1]));
  }
  cells = [];
  for (let i = 0; i < b.rows * b.cols; i++) {
    const el = document.createElement('div');
    el.dataset.i = String(i);
    if (!ans[i]) {
      el.className = 'cell void';
      el.setAttribute('aria-hidden', 'true');
      cells.push({ el });
    } else {
      el.className = 'cell char';
      el.setAttribute('role', 'button');
      const text = document.createElement('span');
      el.appendChild(text);
      if (numbers.has(i)) {
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = numbers.get(i);
        el.appendChild(num);
      }
      cells.push({ el, text });
    }
    els.board.appendChild(el);
  }
}

/**
 * 產生遮住答案的釋義 HTML：以 .mask 樣式遮住會透露答案的文字（文字不變，見 idiom/mask.js）。
 * @param {string} meaning 釋義原文。
 * @param {string} text 成語。
 * @param {number[]} blankPos 空格在成語中的位置。
 * @returns {string} HTML。
 */
function maskedMeaning(meaning, text, blankPos) {
  let html = '';
  let pos = 0;
  for (const [a, b] of maskRanges(meaning, text, blankPos)) {
    html += esc(meaning.slice(pos, a)) + `<span class="mask" aria-hidden="true">${esc(meaning.slice(a, b))}</span>`;
    pos = b;
  }
  return html + esc(meaning.slice(pos));
}

/** 繪製線索區：中級顯示本題釋義；交叉模式顯示成語清單與目前成語的釋義。 */
function renderClue() {
  const s = app.state;
  const b = board();
  const ans = answers();
  const cfg = DIFFICULTIES[s.difficulty];
  const doneMask = b.words.map((_, k) => (isWordDone(b, ans, k) ? 1 : 0)).join('');
  const key = `${currentIndex(s)}:${app.activeWord}:${doneMask}:${app.paused}`;
  if (key === app.clueKey) return;
  app.clueKey = key;
  if (s.mode === 'single' && !cfg.showMeaning) {
    els.clue.innerHTML = '';
    return;
  }
  const w = s.mode === 'single' ? 0 : app.activeWord;
  const word = b.words[w];
  const item = app.index.byId.get(word.id);
  const list = wordCells(b, word);
  const blankPos = list.map((c, p) => (isBlank(b, c) ? p : -1)).filter((p) => p >= 0);
  const done = isWordDone(b, ans, w);
  const meaning = done ? esc(item.meaning) : maskedMeaning(item.meaning, item.text, blankPos);
  let html = '';
  if (s.mode === 'cross') {
    const labels = wordLabels(b);
    const order = b.words.map((_, k) => k).sort((x, y) => labels[x].localeCompare(labels[y], 'zh-Hant', { numeric: true }));
    html += `<div class="clue-chips">${order
      .map((k) => `<button type="button" class="clue-chip${isWordDone(b, ans, k) ? ' done' : ''}" data-w="${k}" aria-pressed="${k === w}">${labels[k]}${isWordDone(b, ans, k) ? ' ✓' : ''}</button>`)
      .join('')}</div>`;
    html += `<div class="clue-text"><span class="clue-label">${labels[w]}${done ? '（已完成，點上方線索看成語卡）' : ''}</span>${meaning}</div>`;
  } else {
    html += `<div class="clue-text"><span class="clue-label">釋義</span>${meaning}</div>`;
  }
  els.clue.innerHTML = html;
}

/** 重繪遊戲畫面。 */
function render() {
  const s = app.state;
  if (!s || !app.index) return;
  buildBoard();
  const b = board();
  const ans = answers();
  const sel = app.paused ? -1 : app.sel;
  const related = new Set(sel >= 0 && b.words[app.activeWord] ? wordCells(b, b.words[app.activeWord]) : []);
  const selChar = sel >= 0 ? shownChar(b, ans, sel) : '';
  for (let i = 0; i < cells.length; i++) {
    const { el, text } = cells[i];
    if (!ans[i]) continue;
    const ch = shownChar(b, ans, i);
    const blank = isBlank(b, i);
    const wrong = isWrong(b, ans, i);
    el.classList.toggle('given', !blank);
    el.classList.toggle('blank', blank && !ch);
    el.classList.toggle('hinted', b.hinted[i]);
    el.classList.toggle('wrong', wrong);
    el.classList.toggle('selected', i === sel);
    el.classList.toggle('related', related.has(i) && i !== sel);
    el.classList.toggle('same', !!selChar && i !== sel && ch === selChar);
    el.classList.toggle('done', app.cellWords[i].length > 0 && app.cellWords[i].every((k) => isWordDone(b, ans, k)));
    text.textContent = app.paused ? '' : ch;
    let desc;
    if (!blank) desc = `題目「${ch}」`;
    else if (!ch) desc = '空格';
    else if (b.hinted[i]) desc = `提示「${ch}」`;
    else desc = `填入「${ch}」${wrong ? '，錯誤' : ''}`;
    el.setAttribute('aria-label', `第 ${Math.floor(i / b.cols) + 1} 列第 ${(i % b.cols) + 1} 行，${desc}`);
  }
  renderClue();
  els.clue.hidden = app.paused;

  const left = remainingChars(b);
  els.bank.innerHTML = '';
  for (const [k, ch] of bankOrder(b).entries()) {
    const n = left.get(ch) || 0;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bank-btn';
    btn.dataset.ch = ch;
    btn.classList.toggle('empty', n === 0);
    btn.classList.toggle('same', ch === selChar);
    btn.disabled = s.completed || n === 0;
    btn.innerHTML = `<span>${esc(ch)}</span><small>${n > 1 ? `×${n}` : ''}</small>`;
    btn.setAttribute('aria-label', `${ch}，${n ? `剩 ${n} 個` : '已用完'}${k < 9 ? `，鍵盤 ${k + 1}` : ''}`);
    els.bank.appendChild(btn);
  }
  els.bank.classList.toggle('covered', app.paused);

  const hints = hintsLeft(s);
  els.hintCount.textContent = String(hints);
  els.hintBtn.setAttribute('aria-disabled', String(hints === 0 || s.completed));
  els.hintBtn.setAttribute('aria-label', `提示，剩餘 ${hints} 次`);
  els.undoBtn.disabled = app.undoStack.length === 0 || s.completed;
  const cfg = DIFFICULTIES[s.difficulty];
  els.gameDifficulty.textContent = s.mode === 'single' ? `${cfg.label} ${s.index + 1}/${s.boards.length}` : cfg.label;
  els.mistakes.textContent = `錯誤 ${s.mistakes}`;
  els.pauseBtn.disabled = s.completed;
  renderTimer();
  renderMessage();
}

/** 更新遊戲訊息列：暫時訊息優先，其次為選取格的錯誤或提示用完的說明。 */
function renderMessage() {
  const s = app.state;
  let text = app.message;
  let error = app.messageError;
  if (!text && s && !app.paused && app.index) {
    const b = board();
    if (s.completed) text = '本局已完成';
    else if (app.sel >= 0 && isWrong(b, answers(), app.sel)) {
      text = '✕ 此格的字錯誤';
      error = true;
    } else if (hintsLeft(s) === 0) text = '本局提示已用完';
    else if (s.mode === 'single') text = '點字庫的字填入空格';
  }
  els.message.textContent = text;
  els.message.classList.toggle('error', error);
}

/** 更新首頁的「繼續遊戲」。 */
function renderHome() {
  const s = app.state && !app.state.completed ? app.state : store.saveSummary();
  if (s && !s.completed && DIFFICULTIES[s.difficulty]) {
    const cfg = DIFFICULTIES[s.difficulty];
    const elapsed = app.state === s ? currentElapsed() : s.elapsedMs;
    const boards = Array.isArray(s.boards) ? s.boards.length : s.boards;
    const progress = s.mode === 'single' ? ` 第 ${s.index + 1}/${boards} 題` : '';
    els.continueDetail.textContent = `${cfg.label}${progress} · ${formatTime(elapsed)} · 提示剩 ${Math.max(0, cfg.hints - s.hintsUsed)} 次`;
    els.continueBtn.hidden = false;
    els.continueBtn.disabled = !app.index;
  } else {
    els.continueBtn.hidden = true;
  }
  els.difficultyList.querySelectorAll('button').forEach((b) => {
    b.disabled = !app.index;
  });
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
 * 與遊戲大廳部署在同一網域時，首次開啟可能暫時由大廳的 Service Worker 控制。
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

/**
 * 判斷是否為 iOS／iPadOS 的瀏覽器分頁（非主畫面 App）。
 * @returns {boolean} 是時為 true。
 */
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
  els.bookBtn.addEventListener('click', openBook);
  els.rulesBtn.addEventListener('click', openRules);
  els.statsBtn.addEventListener('click', openStats);
  els.sourceBtn.addEventListener('click', openSources);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.board.addEventListener('click', (e) => {
    const cell = e.target.closest('.cell.char');
    if (cell) selectCell(Number(cell.dataset.i));
  });
  els.clue.addEventListener('click', (e) => {
    const chip = e.target.closest('.clue-chip');
    if (chip) selectWord(Number(chip.dataset.w));
  });
  els.bank.addEventListener('click', (e) => {
    const b = e.target.closest('.bank-btn');
    if (b) onChar(b.dataset.ch);
  });
  els.undoBtn.addEventListener('click', onUndo);
  els.eraseBtn.addEventListener('click', onErase);
  els.hintBtn.addEventListener('click', onHint);
  els.pauseBtn.addEventListener('click', pauseGame);
  els.resumeBtn.addEventListener('click', resumeGame);
  els.updateBtn.addEventListener('click', applyUpdate);
  els.bookBack.addEventListener('click', goHome);
  document.querySelectorAll('.book-tab').forEach((t) =>
    t.addEventListener('click', () => {
      app.bookTab = t.dataset.tab;
      renderBook();
    }),
  );
  els.bookLevel.addEventListener('change', renderBook);
  els.bookSearch.addEventListener('input', renderBook);
  els.bookList.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) openCard(b.dataset.id);
  });
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) {
      closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
      return;
    }
    const v = e.target.closest('[data-modal-value]');
    if (v) closeModal(v.dataset.modalValue);
  });
  document.addEventListener('keydown', onKeyDown);

  window.addEventListener('popstate', () => {
    if (app.screen === 'game' || app.screen === 'book') {
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
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.dialog, .clue-text, input')) e.preventDefault();
  });
}

/**
 * 與遊戲大廳部署在同一網域時（大廳會在 localStorage 記錄自己的路徑），顯示返回大廳的連結。
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

/** 啟動程式：先顯示首頁，詞庫載入完成後才能開始遊戲。 */
async function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('idiom');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  buildDifficultyButtons();
  bindEvents();
  if (history.state && history.state.screen) history.replaceState(null, '');
  const notices = [];
  if (!store.storageAvailable()) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  if (isIosBrowserTab()) {
    notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟：主畫面 App 與 Safari 的進度互不相通，只在 Safari 中玩時，7 天未使用可能被清除資料。');
  }
  showHomeNotice(notices);
  setupPortalLink();
  showHome();
  setupServiceWorker();
  try {
    await loadData();
  } catch {
    showHomeNotice([...notices, '詞庫載入失敗，請連網後重新開啟。']);
    return;
  }
  const saved = store.loadSave(textOf);
  if (saved.status === 'corrupt') {
    store.clearSave();
    notices.push('先前的遊戲進度資料損毀，或其中的成語已不在詞庫中，請開始新局。');
    showHomeNotice(notices);
  }
  renderHome();
}

init();
