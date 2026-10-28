// 主程式：畫面切換、猜測紀錄與輸入列、調色盤、提示與筆記、推理回顧、計時、Service Worker 與離線狀態。

import { DIFFICULTIES, DIFFICULTY_KEYS, randomSecret, codeKey, remainingAfterEach } from './codebreaker/core.js';
import {
  createGame, restartGame, configOf, hintsLeft, isOver, selectSlot, placeColor, clearSlot, copyLast, toggleExclude, applyUndo, submit, useHint,
} from './game.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';

/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 2500;
/** 顏色名稱（編號 1～9 依序）。 */
const COLOR_NAMES = ['紅色', '橘色', '黃色', '綠色', '青色', '藍色', '紫色', '粉紅色', '棕色'];
/** 底色較亮、數字需改用深色的顏色編號（0 起算）。 */
const LIGHT_COLORS = new Set([2]);

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
  mistakes: $('mistakes'),
  history: $('history'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  controls: document.querySelector('.controls'),
  progress: $('progress'),
  message: $('game-message'),
  input: $('input'),
  copyBtn: $('copy-btn'),
  palette: $('palette'),
  undoBtn: $('undo-btn'),
  eraseBtn: $('erase-btn'),
  notesBtn: $('notes-btn'),
  notesState: $('notes-state'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  submitBtn: $('submit-btn'),
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
  notesMode: false,
  undoStack: [],
  paused: false,
  running: false,
  segmentStart: 0,
  tickTimer: 0,
  message: '',
  messageError: false,
  messageTimer: 0,
  settings: store.loadSettings(),
  registration: null,
  updateRequested: false,
  modalResolve: null,
  lastUpdateCheck: 0,
  /** 目前畫面上的猜測紀錄列數（只在新增時補上新的一列）。 */
  renderedGuesses: -1,
  /** 已建立調色盤的難度。 */
  builtFor: '',
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
 * 取得目前累計耗時（含進行中的這一段）。
 * @returns {number} 毫秒。
 */
function currentElapsed() {
  if (!app.state) return 0;
  return app.state.elapsedMs + (app.running ? performance.now() - app.segmentStart : 0);
}

/** 立即存檔（使用目前累計耗時，不修改記憶體中的狀態）；已結束的一局不存。 */
function persist() {
  if (!app.state || isOver(app.state)) return;
  store.writeSave({ ...app.state, elapsedMs: currentElapsed() });
}

// ---------- 計時 ----------

/** 開始計時；只在遊戲畫面、未暫停且未完成時有效。 */
function startTimer() {
  if (app.running || !app.state || isOver(app.state) || app.paused) return;
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

// ---------- 遊戲流程 ----------

/**
 * 判斷是否有已操作過、尚未結束的一局。
 * @returns {boolean} 有時為 true。
 */
function hasTouchedGame() {
  const s = app.state || store.loadSave().state;
  return !!(s && s.touched && !isOver(s));
}

/**
 * 設定新的遊戲狀態並重設單局的執行期狀態。
 * @param {object} state 遊戲狀態。
 */
function setState(state) {
  app.state = state;
  app.notesMode = false;
  app.undoStack = [];
  app.paused = false;
  app.renderedGuesses = -1;
  clearMessage();
}

/**
 * 開始指定難度的新局；目前有進度時先確認。出題只是隨機抽出一組密碼（避開最近 50 局）。
 * @param {string} difficulty 難度代碼。
 * @param {{skipConfirm?: boolean}} [options] 選項。
 */
async function startNewGame(difficulty, { skipConfirm = false } = {}) {
  if (!skipConfirm && hasTouchedGame()) {
    const ok = await confirmDialog('開始新局？', '目前這一局的進度會被清除。', '開始新局');
    if (!ok) return;
  }
  if (app.running) stopTimer();
  const secret = randomSecret(DIFFICULTIES[difficulty], Math.random, store.loadRecent());
  setState(createGame({ difficulty, secret }));
  store.recordStart(difficulty);
  store.addRecent(codeKey(secret));
  persist();
  enterGame();
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
    if (isOver(app.state)) app.state = null;
  }
  app.paused = false;
  app.screen = 'home';
  els.game.hidden = true;
  els.home.hidden = false;
  renderHome();
}

/** 暫停遊戲並遮住猜測紀錄、輸入列與調色盤。 */
function pauseGame() {
  if (!app.state || isOver(app.state) || app.paused) return;
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

/** 重開本局（同一組密碼）；有進度時先確認。 */
async function restartCurrent() {
  if (!app.state) return;
  if (app.state.touched) {
    const ok = await confirmDialog('重開本局？', '會清除所有猜測、提示與筆記（密碼不變），耗時、錯誤次數與提示次數也會重設。', '重開本局');
    if (!ok) return;
  }
  stopTimer(false);
  setState(restartGame(app.state));
  persist();
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/**
 * 產生顏色圓形的 HTML。
 * @param {number} color 顏色編號（-1 為空位）。
 * @param {string} [extra=''] 額外的 class。
 * @returns {string} HTML。
 */
function pegHtml(color, extra = '') {
  if (color < 0) return `<span class="peg empty ${extra}"></span>`;
  return `<span class="peg${LIGHT_COLORS.has(color) ? ' light' : ''} ${extra}" style="--pc: var(--c${color + 1})" aria-label="${color + 1} 號 ${COLOR_NAMES[color]}">${color + 1}</span>`;
}

/**
 * 計算推理回顧的剩餘數：優先在 Web Worker 中計算，無法建立 Worker 時在主程式計算。
 * @param {object} s 遊戲狀態。
 * @returns {Promise<number[]>} 每次猜測後的剩餘數。
 */
function computeRecap(s) {
  const history = s.guesses.map((g) => ({ code: g.code, black: g.black, white: g.white }));
  return new Promise((resolve) => {
    /** 在主程式計算（延後一個事件循環，讓結束畫面先顯示）。 */
    const fallback = () => setTimeout(() => resolve(remainingAfterEach(configOf(s), history)), 30);
    let worker;
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    } catch {
      fallback();
      return;
    }
    /**
     * 接收 Worker 的計算結果。
     * @param {MessageEvent} event 結果訊息。
     */
    worker.onmessage = (event) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.counts);
      else fallback();
    };
    /**
     * Worker 載入或執行失敗時改在主程式計算。
     * @param {ErrorEvent} event 錯誤事件。
     */
    worker.onerror = (event) => {
      event.preventDefault();
      worker.terminate();
      fallback();
    };
    worker.postMessage({ difficulty: s.difficulty, history });
  });
}

/**
 * 產生推理回顧表格；剩餘數尚未算出時顯示「計算中」。
 * @param {object} s 遊戲狀態。
 * @param {number[] | null} counts 每次猜測後的剩餘數。
 * @returns {string} HTML。
 */
function recapHtml(s, counts) {
  const rows = s.guesses
    .map((g, k) => {
      const left = counts ? counts[k] : null;
      let note = '';
      if (g.conflict >= 0) note = `<span class="note warn">⚠ 與第 ${g.conflict + 1} 次不符</span>`;
      else if (left === 1 && k < s.guesses.length - 1) note = '<span class="note">已可確定密碼</span>';
      return `<tr><td>${k + 1}</td><td>${g.code.map((c) => pegHtml(c)).join('')}</td><td class="fb-cell">全對 ${g.black}<br>位置錯 ${g.white}</td><td class="left">${left === null ? '…' : left.toLocaleString('zh-TW')}</td><td>${note}</td></tr>`;
    })
    .join('');
  return `<h3 style="margin:14px 0 6px;font-size:16px">推理回顧</h3>
    <p style="margin:0 0 6px;font-size:13px">「剩餘」是送出該次猜測後，還有幾種可能的密碼。${counts ? '' : '計算中…'}</p>
    <table class="recap"><thead><tr><th>#</th><th>猜測</th><th>回饋</th><th class="left">剩餘</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

/**
 * 結束一局（猜中或用完次數）：停止計時、更新統計、清除存檔，顯示結果與推理回顧。
 * @param {'won' | 'lost'} result 結果。
 */
async function finishGame(result) {
  stopTimer(false);
  const s = app.state;
  const cfg = configOf(s);
  let badges = '';
  if (result === 'won') {
    const { newRecord, fewestGuesses } = store.recordComplete(s.difficulty, s.elapsedMs, s.hintsUsed, s.guesses.length);
    if (newRecord) badges += '<span class="record-badge">🏆 最佳時間</span> ';
    if (fewestGuesses) badges += '<span class="record-badge">🎯 最少次數</span>';
  } else {
    store.recordLoss(s.difficulty);
  }
  store.clearSave();
  app.undoStack = [];
  render();
  const summary =
    result === 'won'
      ? `${badges ? `<p>${badges}</p>` : ''}<dl class="result-list">
          <dt>難度</dt><dd>${cfg.label}</dd>
          <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
          <dt>猜測次數</dt><dd>${s.guesses.length} / ${cfg.maxGuesses}</dd>
          <dt>錯誤次數</dt><dd>${s.mistakes}（不合理猜測）</dd>
          <dt>已用提示</dt><dd>${s.hintsUsed} / ${cfg.hints}</dd>
        </dl>`
      : `<p>${cfg.maxGuesses} 次都用完了。密碼是：</p><div class="reveal">${s.secret.map((c) => pegHtml(c)).join('')}</div>
        <dl class="result-list"><dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd><dt>錯誤次數</dt><dd>${s.mistakes}（不合理猜測）</dd></dl>`;
  const pending = openModal({
    title: result === 'won' ? '破解成功！' : '這次沒破解',
    html: `${summary}<div id="recap">${recapHtml(s, null)}</div>`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'stay',
  });
  computeRecap(s).then((counts) => {
    const box = document.getElementById('recap');
    if (box) box.innerHTML = recapHtml(s, counts);
  });
  const choice = await pending;
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
 * 判斷目前是否可以操作。
 * @returns {boolean} 可操作時為 true。
 */
function canPlay() {
  return app.screen === 'game' && !!app.state && !isOver(app.state) && !app.paused && els.modal.hidden;
}

/**
 * 輸入列的變更完成後：記錄復原、存檔並重繪。
 * @param {{undo?: object}} r 操作結果。
 */
function afterEdit(r) {
  if (r.undo) app.undoStack.push(r.undo);
  persist();
  render();
}

/**
 * 點選調色盤的顏色：一般模式填入選取的位置，筆記模式切換排除標記。
 * @param {number} color 顏色編號。
 */
function onColor(color) {
  if (!canPlay()) return;
  const s = app.state;
  if (color >= configOf(s).colors) return;
  if (app.notesMode) {
    afterEdit(toggleExclude(s, color));
    return;
  }
  const r = placeColor(s, color);
  if (r.error === 'duplicate') showMessage('這個難度的密碼沒有重複的顏色，同一組猜測也不能重複');
  else if (r.error === 'locked') showMessage('提示揭示的位置不能修改');
  else if (r.undo) {
    clearMessage();
    afterEdit(r);
  }
}

/**
 * 點選輸入列的位置。
 * @param {number} p 位置。
 */
function onSlot(p) {
  if (!canPlay()) return;
  selectSlot(app.state, p);
  persist();
  render();
}

/** 清除選取位置的顏色。 */
function onErase() {
  if (!canPlay()) return;
  const r = clearSlot(app.state);
  if (r.error === 'locked') showMessage('提示揭示的位置不能清除');
  else if (r.undo) afterEdit(r);
}

/** 把上一次的猜測複製到輸入列。 */
function onCopy() {
  if (!canPlay()) return;
  const r = copyLast(app.state);
  if (r.error === 'none') showMessage('還沒有猜測可以沿用');
  else if (r.undo) afterEdit(r);
}

/** 復原輸入列的上一個變更。 */
function onUndo() {
  if (!canPlay()) return;
  const entry = app.undoStack.pop();
  if (!entry) {
    showMessage('沒有可以復原的操作（已送出的猜測不能復原）');
    return;
  }
  applyUndo(app.state, entry);
  persist();
  render();
}

/** 切換筆記模式。 */
function onToggleNotes() {
  if (!canPlay()) return;
  app.notesMode = !app.notesMode;
  render();
}

/** 使用提示：揭示最左邊尚未揭示的位置。 */
function onHint() {
  if (!canPlay()) return;
  const s = app.state;
  const r = useHint(s);
  if (r.result === 'no-quota') showMessage(`本局提示已用完（每局 ${configOf(s).hints} 次）`);
  else if (r.result === 'none') showMessage('只剩最後一個位置，不再提示');
  else if (r.result === 'revealed') {
    app.undoStack = [];
    showMessage(`已揭示第 ${r.pos + 1} 位，剩餘 ${hintsLeft(s)} 次提示`);
    persist();
    render();
  }
}

/** 送出目前的猜測。 */
function onSubmit() {
  if (!canPlay()) return;
  const s = app.state;
  const r = submit(s);
  if (r.error === 'incomplete') {
    showMessage('每個位置都要選好顏色才能送出');
    return;
  }
  if (r.error === 'repeat-guess') {
    showMessage('這組已經猜過了', true);
    return;
  }
  app.undoStack = [];
  if (r.conflict >= 0) showMessage(`⚠ 這組不可能是密碼：與第 ${r.conflict + 1} 次的回饋不符`, true);
  else clearMessage();
  persist();
  render();
  if (r.result === 'won' || r.result === 'lost') finishGame(r.result);
}

/**
 * 以方向鍵移動選取位置。
 * @param {number} d -1 往左、1 往右。
 */
function moveSlot(d) {
  if (!canPlay()) return;
  const n = app.state.input.length;
  selectSlot(app.state, (app.state.sel + d + n) % n);
  render();
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
  if (app.screen !== 'game') return;
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
  else if (/^[1-9]$/.test(key)) onColor(Number(key) - 1);
  else if (key === 'Backspace' || key === 'Delete') onErase();
  else if (key === 'Enter') onSubmit();
  else if (key === 'ArrowLeft') moveSlot(-1);
  else if (key === 'ArrowRight') moveSlot(1);
  else if (key.toLowerCase() === 'n') onToggleNotes();
  else if (key.toLowerCase() === 'h') onHint();
  else if (key.toLowerCase() === 'p' || key === 'Escape') pauseGame();
  else handled = false;
  if (handled) e.preventDefault();
}

// ---------- 選單、統計與說明 ----------

/**
 * 取得難度的說明文字。
 * @param {string} key 難度代碼。
 * @returns {string} 例如「4 位・6 色・可重複・10 次」。
 */
function describe(key) {
  const c = DIFFICULTIES[key];
  return `${c.pegs} 位・${c.colors} 色・${c.repeat ? '可重複' : '不重複'}・${c.maxGuesses} 次`;
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
      { label: '玩法', value: 'rules' },
      { label: '回首頁', value: 'home' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'new') {
    const difficulty = await openModal({
      title: '選擇難度',
      menu: DIFFICULTY_KEYS.map((key) => ({ label: `${DIFFICULTIES[key].label}（${describe(key)}）`, value: key })),
      actions: [{ label: '取消', value: null }],
    });
    if (difficulty) startNewGame(difficulty);
  } else if (choice === 'restart') restartCurrent();
  else if (choice === 'theme') cycleTheme();
  else if (choice === 'rules') openRules();
  else if (choice === 'home') goHome();
}

/** 顯示統計。 */
async function openStats() {
  const stats = store.loadStats();
  const rows = DIFFICULTY_KEYS.map((key) => {
    const s = stats[key];
    const best = s.bestMs === null ? '—' : formatTime(s.bestMs);
    const avg = s.completed ? formatTime(s.totalMs / s.completed) : '—';
    const fewest = s.bestGuesses === null ? '—' : s.bestGuesses;
    const avgGuesses = s.completed ? (s.totalGuesses / s.completed).toFixed(1) : '—';
    return `<tr><td>${DIFFICULTIES[key].label}</td><td>${s.started}</td><td>${s.completed}</td><td>${s.lost}</td><td>${best}</td><td>${avg}</td><td>${fewest}</td><td>${avgGuesses}</td><td>${s.noHint}</td></tr>`;
  }).join('');
  const choice = await openModal({
    title: '統計',
    html: `<div style="overflow-x:auto"><table class="stats-table">
      <thead><tr><th>難度</th><th>開局</th><th>完成</th><th>失敗</th><th>最佳</th><th>平均</th><th>最少次數</th><th>平均次數</th><th>無提示</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p style="margin-top:10px;font-size:13px">統計只存在這台裝置。「次數」是破解時用的猜測次數；「無提示」為未使用提示完成的局數。</p>`,
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
    html: `<p>保險箱的密碼由幾個顏色排成一列。每次猜一組，得到兩個線索：</p>
      <ul>
        <li><b>● 全對</b>：有幾個顏色放對了位置（顏色和位置都對）。</li>
        <li><b>○ 位置錯</b>：有幾個顏色是密碼裡有的，但放錯了位置。</li>
      </ul>
      <p>回饋只告訴你「幾個」，不告訴你「是哪一個」。例如密碼是 <b>紅 紅 藍 綠</b>，猜 <b>紅 藍 紅 黃</b> 會得到「全對 1、位置錯 2」：第 1 位的紅色全對；藍色和另一個紅色密碼裡有，但位置錯了；黃色密碼裡沒有。</p>
      <p>在次數用完前猜中整組密碼就破解成功。如果送出的猜測和先前的回饋矛盾（不可能是密碼），會標示 ⚠ 並記一次錯誤。</p>
      <p>每個顏色都印有數字，只看數字也能玩。「筆記」可以把確定不是的顏色劃掉；「提示」會揭示最左邊一個位置。</p>
      <p><b>電腦鍵盤</b>：數字鍵選顏色、左右方向鍵移動、Backspace 清除、Enter 送出、N 筆記、H 提示、P 或 Esc 暫停、Ctrl／⌘＋Z 復原。</p>`,
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
    b.innerHTML = `${cfg.label}<small>${cfg.pegs} 位 ${cfg.colors} 色・${cfg.repeat ? '可重複' : '不重複'}<br>最多 ${cfg.maxGuesses} 次</small>`;
    els.difficultyList.appendChild(b);
  }
}

/** 依難度建立輸入列與調色盤的按鈕；難度沒變時不重建。 */
function buildControls() {
  const s = app.state;
  const cfg = configOf(s);
  if (app.builtFor === s.difficulty) return;
  app.builtFor = s.difficulty;
  els.input.innerHTML = '';
  for (let p = 0; p < cfg.pegs; p++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'peg slot';
    b.dataset.p = String(p);
    els.input.appendChild(b);
  }
  els.palette.innerHTML = '';
  for (let c = 0; c < cfg.colors; c++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `peg color-btn${LIGHT_COLORS.has(c) ? ' light' : ''}`;
    b.style.setProperty('--pc', `var(--c${c + 1})`);
    b.dataset.c = String(c);
    b.textContent = String(c + 1);
    els.palette.appendChild(b);
  }
}

/** 補上尚未顯示的猜測紀錄列（重新開始時全部重建），並捲到最新一列。 */
function renderHistory() {
  const s = app.state;
  if (app.renderedGuesses > s.guesses.length || app.renderedGuesses < 0) {
    els.history.innerHTML = '';
    app.renderedGuesses = 0;
  }
  const cfg = configOf(s);
  for (let k = app.renderedGuesses; k < s.guesses.length; k++) {
    const g = s.guesses[k];
    const li = document.createElement('li');
    li.className = `guess-row${g.black === cfg.pegs ? ' won' : ''}`;
    li.innerHTML = `<span class="num">${k + 1}</span><span class="guess-pegs">${g.code.map((c) => pegHtml(c)).join('')}</span>
      <span class="feedback" aria-hidden="true"><span class="chip hit${g.black ? '' : ' zero'}">● 全對 ${g.black}</span><span class="chip near${g.white ? '' : ' zero'}">○ 位置錯 ${g.white}</span></span>
      ${g.conflict >= 0 ? `<span class="conflict">⚠ 與第 ${g.conflict + 1} 次的回饋不符（不合理猜測）</span>` : ''}`;
    li.setAttribute('aria-label', `第 ${k + 1} 次：${g.code.map((c) => `${c + 1} 號${COLOR_NAMES[c]}`).join('、')}。${explain(g, cfg)}${g.conflict >= 0 ? '；不合理猜測' : ''}`);
    els.history.appendChild(li);
  }
  if (app.renderedGuesses !== s.guesses.length) els.history.scrollTop = els.history.scrollHeight;
  app.renderedGuesses = s.guesses.length;
}

/** 重繪遊戲畫面。 */
function render() {
  const s = app.state;
  if (!s) return;
  const cfg = configOf(s);
  buildControls();
  renderHistory();
  const over = isOver(s);
  els.input.querySelectorAll('.slot').forEach((b, p) => {
    const c = s.input[p];
    b.className = `peg slot${c < 0 ? ' empty' : ''}${LIGHT_COLORS.has(c) ? ' light' : ''}${s.revealed[p] ? ' locked' : ''}${p === s.sel && !over ? ' selected' : ''}`;
    if (c >= 0) b.style.setProperty('--pc', `var(--c${c + 1})`);
    else b.style.removeProperty('--pc');
    b.textContent = c >= 0 ? String(c + 1) : '';
    b.setAttribute('aria-label', `第 ${p + 1} 位，${c >= 0 ? `${c + 1} 號${COLOR_NAMES[c]}` : '空'}${s.revealed[p] ? '（提示，已鎖定）' : ''}${p === s.sel ? '，已選取' : ''}`);
  });
  els.palette.querySelectorAll('.color-btn').forEach((b, c) => {
    b.classList.toggle('excluded', s.excluded[c]);
    b.classList.toggle('notes-mode', app.notesMode);
    b.disabled = over;
    b.setAttribute('aria-label', `${c + 1} 號${COLOR_NAMES[c]}${s.excluded[c] ? '（已排除）' : ''}`);
  });
  els.controls.classList.toggle('covered', app.paused);
  els.history.style.visibility = app.paused ? 'hidden' : '';
  const left = hintsLeft(s);
  els.hintCount.textContent = String(left);
  els.hintBtn.setAttribute('aria-disabled', String(left === 0 || over));
  els.hintBtn.setAttribute('aria-label', `提示，剩餘 ${left} 次`);
  els.notesBtn.setAttribute('aria-pressed', String(app.notesMode));
  els.notesState.textContent = app.notesMode ? '開' : '關';
  els.undoBtn.disabled = app.undoStack.length === 0 || over;
  els.submitBtn.disabled = over || s.input.some((c) => c < 0);
  els.copyBtn.disabled = over || !s.guesses.length;
  els.pauseBtn.disabled = over;
  els.gameDifficulty.textContent = cfg.label;
  els.mistakes.textContent = `錯誤 ${s.mistakes}`;
  const next = Math.min(s.guesses.length + 1, cfg.maxGuesses);
  const lastChance = !over && s.guesses.length === cfg.maxGuesses - 1;
  els.progress.textContent = over ? '' : `第 ${next}／${cfg.maxGuesses} 次${lastChance ? '（最後一次機會！）' : ''}・${cfg.pegs} 位 ${cfg.colors} 色${cfg.repeat ? '可重複' : '不重複'}`;
  renderTimer();
  renderMessage();
}

/**
 * 以完整的句子說明一次猜測的回饋，讓第一次玩的人也看得懂。
 * @param {{black: number, white: number}} g 猜測的回饋。
 * @param {object} cfg 難度設定。
 * @returns {string} 例如「有 2 個顏色和位置都對；另有 1 個顏色對，但位置不對」。
 */
function explain(g, cfg) {
  if (g.black === cfg.pegs) return '全部正確！';
  if (!g.black && !g.white) return '這些顏色都不在密碼裡';
  const parts = [];
  if (g.black) parts.push(`有 ${g.black} 個顏色和位置都對`);
  if (g.white) parts.push(`${g.black ? '另' : ''}有 ${g.white} 個顏色對，但位置不對`);
  const rest = cfg.pegs - g.black - g.white;
  if (rest) parts.push(`其餘 ${rest} 個都不對`);
  return parts.join('；');
}

/** 更新遊戲訊息列：暫時訊息優先，其次為筆記模式、開局說明，或以文字說明最新一次的回饋。 */
function renderMessage() {
  const s = app.state;
  let text = app.message;
  const error = app.messageError;
  if (!text && s && !app.paused && !isOver(s)) {
    const cfg = configOf(s);
    const last = s.guesses[s.guesses.length - 1];
    if (app.notesMode) text = '筆記模式：點顏色可以標記「排除」';
    else if (!last) text = '選好每個位置的顏色後按「送出」';
    else text = `第 ${s.guesses.length} 次：${explain(last, cfg)}`;
  }
  els.message.textContent = text;
  els.message.classList.toggle('error', error);
}

/** 更新首頁的「繼續遊戲」。 */
function renderHome() {
  const s = app.state && !isOver(app.state) ? app.state : store.loadSave().state;
  if (s && !isOver(s)) {
    const cfg = DIFFICULTIES[s.difficulty];
    const elapsed = app.state === s ? currentElapsed() : s.elapsedMs;
    els.continueDetail.textContent = `${cfg.label} · 第 ${s.guesses.length + 1}／${cfg.maxGuesses} 次 · ${formatTime(elapsed)}`;
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
  els.rulesBtn.addEventListener('click', openRules);
  els.statsBtn.addEventListener('click', openStats);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.input.addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (b) onSlot(Number(b.dataset.p));
  });
  els.palette.addEventListener('click', (e) => {
    const b = e.target.closest('.color-btn');
    if (b) onColor(Number(b.dataset.c));
  });
  els.copyBtn.addEventListener('click', onCopy);
  els.undoBtn.addEventListener('click', onUndo);
  els.eraseBtn.addEventListener('click', onErase);
  els.notesBtn.addEventListener('click', onToggleNotes);
  els.hintBtn.addEventListener('click', onHint);
  els.pauseBtn.addEventListener('click', pauseGame);
  els.submitBtn.addEventListener('click', onSubmit);
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

/** 啟動程式。 */
function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('codebreaker');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  buildDifficultyButtons();
  bindEvents();
  if (history.state && history.state.screen === 'game') history.replaceState(null, '');
  const notices = [];
  if (!store.storageAvailable()) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
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
