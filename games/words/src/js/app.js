// 主程式：首頁分類、配對連線畫面、單字卡、單字本、統計、計時、發音、離線狀態與更新。

import { CATEGORIES, WORDS } from './words-data.js';
import { DIFFICULTIES, DIFFICULTY_KEYS, MIX, REVIEW, generateRound } from './deck.js';
import {
  createGame, restartGame, currentBoard, isMatched, tapCard, useHint, hintsLeft, boardDone, nextBoard, isLastBoard, applyBoardToBook,
} from './game.js';
import { initSpeech, speechAvailable, speak, voiceOptions, currentVoiceName, configureSpeech } from './speech.js';
import * as store from './storage.js';

/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 2200;
/** 答錯標示的時間（毫秒）。 */
const WRONG_MS = 650;
/** 右欄卡片的鍵盤按鍵。 */
const RIGHT_KEYS = ['q', 'w', 'e', 'r', 't', 'y'];

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
  learnedCount: $('learned-count'),
  totalCount: $('total-count'),
  mixBtn: $('mix-btn'),
  reviewBtn: $('review-btn'),
  reviewCount: $('review-count'),
  groups: $('category-groups'),
  portalLink: $('portal-link'),
  bookBtn: $('book-btn'),
  statsBtn: $('stats-btn'),
  rulesBtn: $('rules-btn'),
  settingsBtn: $('settings-btn'),
  homeBtn: $('home-btn'),
  menuBtn: $('menu-btn'),
  gameTitle: $('game-title'),
  boardProgress: $('board-progress'),
  timer: $('timer'),
  mistakes: $('mistakes'),
  columnHint: $('column-hint'),
  columns: $('columns'),
  lines: $('lines'),
  leftCol: $('left-col'),
  rightCol: $('right-col'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  message: $('game-message'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  modal: $('modal'),
  modalTitle: $('modal-title'),
  modalBody: $('modal-body'),
  modalActions: $('modal-actions'),
  updateBanner: $('update-banner'),
  updateBtn: $('update-btn'),
};

const wordById = new Map(WORDS.map((w) => [w.id, w]));
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

/** 執行期狀態。 */
const app = {
  screen: 'home',
  state: null,
  running: false,
  segmentStart: 0,
  tickTimer: 0,
  paused: false,
  busy: false,
  wrongIds: [],
  wrongTimer: 0,
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
 * 跳脫 HTML 特殊字元。
 * @param {string} text 文字。
 * @returns {string} 安全的 HTML。
 */
function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * 取得出題來源的顯示名稱。
 * @param {string} source 分類 id、MIX 或 REVIEW。
 * @returns {string} 名稱。
 */
function sourceName(source) {
  if (source === MIX) return '綜合';
  if (source === REVIEW) return '待複習';
  const c = categoryById.get(source);
  return c ? c.name : source;
}

/**
 * 取得目前累計耗時。
 * @returns {number} 毫秒。
 */
function currentElapsed() {
  if (!app.state) return 0;
  return app.state.elapsedMs + (app.running ? performance.now() - app.segmentStart : 0);
}

/** 立即存檔。 */
function persist() {
  if (!app.state || app.state.completed) return;
  store.writeSave({ ...app.state, elapsedMs: currentElapsed() });
}

/** 開始計時。 */
function startTimer() {
  if (app.running || !app.state || app.state.completed || app.paused) return;
  app.running = true;
  app.segmentStart = performance.now();
  app.tickTimer = setInterval(renderTimer, 1000);
  renderTimer();
}

/**
 * 停止計時並累加這一段時間。
 * @param {boolean} [save=true] 是否存檔。
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

/** 更新耗時顯示。 */
function renderTimer() {
  els.timer.textContent = formatTime(currentElapsed());
}

// ---------- 主題 ----------

const THEME_LABEL = { system: '主題：跟隨系統', light: '主題：淺色', dark: '主題：深色' };

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

/**
 * 是否顯示發音按鈕（設定開啟且裝置有英文語音）。
 * @returns {boolean} 顯示時為 true。
 */
function speechOn() {
  return app.settings.speech && speechAvailable();
}

// ---------- 對話框 ----------

/**
 * 開啟對話框並等待使用者選擇。
 * @param {object} options 選項。
 * @param {string} options.title 標題。
 * @param {string} [options.html] 內容 HTML（動態文字須先跳脫）。
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
  bindSpeakButtons(els.modalBody);
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
 * @param {string} okLabel 確認按鈕。
 * @returns {Promise<boolean>} 是否確認。
 */
async function confirmDialog(title, text, okLabel) {
  const v = await openModal({
    title,
    html: `<p>${esc(text)}</p>`,
    actions: [
      { label: '取消', value: false },
      { label: okLabel, value: true, className: 'danger' },
    ],
    dismissValue: false,
  });
  return v === true;
}

/**
 * 產生發音按鈕的 HTML（不可用時為空字串）。
 * 遊戲卡片本身是按鈕，按鈕裡不能再放按鈕（手機上點按會被外層卡片接走），所以卡片內改用 span。
 * @param {string} en 英文。
 * @param {boolean} [inCard=false] 是否放在遊戲卡片內。
 * @returns {string} HTML。
 */
function speakButton(en, inCard = false) {
  if (!speechOn()) return '';
  const tag = inCard ? 'span' : 'button';
  const type = inCard ? 'role="button"' : 'type="button"';
  return `<${tag} ${type} class="speak-btn" data-speak="${esc(en)}" aria-label="唸出 ${esc(en)}">🔊</${tag}>`;
}

/**
 * 讓容器內的發音按鈕可點按（不觸發卡片選取）。
 * @param {HTMLElement} root 容器。
 */
function bindSpeakButtons(root) {
  root.querySelectorAll('[data-speak]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      speak(b.dataset.speak);
    });
  });
}

/**
 * 產生一張單字卡的 HTML：英文、發音、詞性、中文、例句（該字以粗體標示）與翻譯。
 * @param {object} w 單字。
 * @param {string} [mark=''] 附加標記（例如「答錯」）。
 * @returns {string} HTML。
 */
function wordCardHtml(w, mark = '') {
  const form = w.form || w.en;
  const ex = esc(w.example);
  const re = new RegExp(`(^|[^A-Za-z])(${esc(form).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^A-Za-z]|$)`, 'i');
  const highlighted = re.test(ex) ? ex.replace(re, '$1<b>$2</b>') : ex;
  return `<div class="word-card">
    <div class="word-head"><span class="word-en">${esc(w.en)}</span>${speakButton(w.en)}<span class="word-pos">${esc(w.pos)}</span>${mark ? `<span class="word-mark">${esc(mark)}</span>` : ''}<span class="word-zh">${esc(w.zh)}</span></div>
    <p class="word-example">${highlighted}</p>
    <p class="word-example-zh">${esc(w.exampleZh)}</p>
  </div>`;
}

// ---------- 首頁 ----------

/** 繪製首頁：學習進度、快速開始與分類卡片。 */
function renderHome() {
  const book = store.loadBook();
  const learned = WORDS.filter((w) => book[w.id] && book[w.id].learned).length;
  const review = WORDS.filter((w) => book[w.id] && book[w.id].review).length;
  els.learnedCount.textContent = String(learned);
  els.totalCount.textContent = String(WORDS.length);
  els.reviewCount.textContent = String(review);
  els.reviewCount.hidden = review === 0;
  els.groups.innerHTML = '';
  const groups = [...new Set(CATEGORIES.map((c) => c.group))];
  for (const g of groups) {
    const section = document.createElement('section');
    section.innerHTML = `<h2 class="group-title">${esc(g)}</h2><div class="category-grid"></div>`;
    const grid = section.querySelector('.category-grid');
    for (const c of CATEGORIES.filter((x) => x.group === g && x.count > 0)) {
      const ids = WORDS.filter((w) => w.categories.includes(c.id));
      const done = ids.filter((w) => book[w.id] && book[w.id].learned).length;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'category-card';
      b.innerHTML = `<span class="category-icon" aria-hidden="true">${c.icon}</span>
        <span class="category-text"><span class="category-name">${esc(c.name)}</span>
        <span class="category-sub">${done} / ${ids.length}</span>
        <span class="mini-bar"><span style="width:${ids.length ? (done / ids.length) * 100 : 0}%"></span></span></span>`;
      b.addEventListener('click', () => chooseDifficulty(c.id));
      grid.appendChild(b);
    }
    if (grid.children.length) els.groups.appendChild(section);
  }
  const saved = app.state && !app.state.completed ? app.state : store.loadSave((id) => wordById.has(id)).state;
  if (saved && !saved.completed) {
    els.continueDetail.textContent = `${sourceName(saved.source)}・${DIFFICULTIES[saved.difficulty].label}・第 ${saved.board + 1} / ${saved.boards.length} 盤`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
}

/**
 * 選擇難度後開始新局。
 * @param {string} source 分類 id、MIX 或 REVIEW。
 */
async function chooseDifficulty(source) {
  const wait = openModal({
    title: `${sourceName(source)}：選擇難度`,
    html: `<div class="difficulty-list">${DIFFICULTY_KEYS.map((k) => {
      const d = DIFFICULTIES[k];
      const desc = `${d.pairs} 組 × ${d.boards} 盤${d.reverse ? '・中文配英文' : ''}`;
      return `<button type="button" class="difficulty-btn" data-difficulty="${k}">${d.label}<small>${desc}</small></button>`;
    }).join('')}</div>`,
    actions: [{ label: '取消', value: null }],
  });
  els.modalBody.querySelectorAll('.difficulty-btn').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.difficulty)));
  const difficulty = await wait;
  if (difficulty) startNewGame(source, difficulty);
}

// ---------- 遊戲流程 ----------

/**
 * 開始新局（目前有已操作過的一局時先確認）。
 * @param {string} source 分類 id、MIX 或 REVIEW。
 * @param {string} difficulty 難度代碼。
 */
async function startNewGame(source, difficulty) {
  const existing = app.state && !app.state.completed ? app.state : store.loadSave((id) => wordById.has(id)).state;
  if (existing && existing.touched && !existing.completed) {
    if (!(await confirmDialog('開始新局？', '目前這一局的進度會被清除。', '開始新局'))) return;
  }
  let round;
  try {
    round = generateRound(WORDS, { source, difficulty, book: store.loadBook(), recent: store.loadRecent() });
  } catch {
    await openModal({ title: '單字不足', html: '<p>這個分類的單字還不夠組成一局，請改選其他分類或難度。</p>', actions: [{ label: '好', value: null, className: 'primary' }] });
    return;
  }
  if (app.running) stopTimer(false);
  app.state = createGame({ source, difficulty, boards: round.boards });
  app.paused = false;
  store.recordStart(difficulty);
  persist();
  enterGame();
  if (round.widened) showMessage(source === REVIEW ? '待複習的單字不夠，已加入其他單字' : '這個難度的單字不夠，已加入相鄰程度的單字');
}

/** 從存檔繼續。 */
function continueGame() {
  if (!app.state) {
    const saved = store.loadSave((id) => wordById.has(id));
    if (saved.status !== 'ok') {
      renderHome();
      return;
    }
    app.state = saved.state;
  }
  enterGame();
}

/** 切換到遊戲畫面。 */
function enterGame() {
  app.screen = 'game';
  app.paused = false;
  if (!history.state || history.state.screen !== 'game') history.pushState({ screen: 'game' }, '');
  els.home.hidden = true;
  els.game.hidden = false;
  els.pauseCover.hidden = true;
  renderBoard();
  startTimer();
}

/** 回首頁（經由瀏覽歷史，讓返回鍵行為一致）。 */
function goHome() {
  if (history.state && history.state.screen === 'game') history.back();
  else showHome();
}

/** 顯示首頁；進行中的一局停止計時並存檔。 */
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

/** 暫停並遮住卡片。 */
function pauseGame() {
  if (!app.state || app.state.completed || app.paused) return;
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

/** 重開本局（已操作時先確認）。 */
async function restartCurrent() {
  if (!app.state) return;
  if (app.state.touched && !(await confirmDialog('重開本局？', '會回到第一盤，錯誤次數、耗時與提示次數都會重設。', '重開本局'))) return;
  stopTimer(false);
  app.state = restartGame(app.state);
  persist();
  renderBoard();
  startTimer();
}

// ---------- 盤面 ----------

/**
 * 判斷卡片文字是否較長，需要縮小字級。
 * @param {string} text 文字。
 * @returns {boolean} 較長時為 true。
 */
function isLong(text) {
  return /[一-鿿]/.test(text) ? text.length > 6 : text.length > 12;
}

/**
 * 建立一張卡片。
 * @param {'left' | 'right'} side 欄位。
 * @param {object} w 單字。
 * @param {boolean} showEnglish 卡片顯示英文（否則顯示中文）。
 * @param {number} index 在欄位中的順序（鍵盤快捷鍵用）。
 * @returns {HTMLButtonElement} 卡片。
 */
function makeCard(side, w, showEnglish, index) {
  const b = document.createElement('button');
  b.type = 'button';
  const text = showEnglish ? w.en : w.zh;
  b.className = `card${showEnglish ? ' en' : ' zh'}${isLong(text) ? ' long' : ''}`;
  b.dataset.side = side;
  b.dataset.id = w.id;
  const key = side === 'left' ? String(index + 1) : RIGHT_KEYS[index].toUpperCase();
  b.setAttribute('aria-label', `${text}（按鍵 ${key}）`);
  b.innerHTML = `<span>${esc(text)}</span>${showEnglish ? speakButton(w.en, true) : ''}`;
  /** 點到發音圖示時只發音，不選取卡片；其他位置選取卡片。 */
  b.addEventListener('click', (e) => {
    const sp = e.target.closest('[data-speak]');
    if (sp) speak(sp.dataset.speak);
    else onCard(side, w.id);
  });
  return b;
}

/** 重繪目前這一盤的卡片、連線與資訊。 */
function renderBoard() {
  const s = app.state;
  if (!s) return;
  const cfg = DIFFICULTIES[s.difficulty];
  const board = currentBoard(s);
  els.gameTitle.textContent = `${sourceName(s.source)}・${cfg.label}`;
  els.boardProgress.textContent = `第 ${s.board + 1} / ${s.boards.length} 盤`;
  els.columnHint.textContent = cfg.reverse ? '把中文連到正確的英文' : '把英文連到正確的中文';
  els.leftCol.innerHTML = '';
  els.rightCol.innerHTML = '';
  board.left.forEach((id, i) => els.leftCol.appendChild(makeCard('left', wordById.get(id), !cfg.reverse, i)));
  board.right.forEach((id, i) => els.rightCol.appendChild(makeCard('right', wordById.get(id), cfg.reverse, i)));
  renderState();
}

/** 依狀態更新卡片樣式、連線與上方資訊。 */
function renderState() {
  const s = app.state;
  if (!s) return;
  els.columns.querySelectorAll('.card').forEach((c) => {
    const id = c.dataset.id;
    const matched = isMatched(s, id);
    c.classList.toggle('matched', matched);
    c.classList.toggle('hinted', matched && s.results[id] === 'hint');
    c.classList.toggle('selected', !!s.selected && s.selected.side === c.dataset.side && s.selected.id === id);
    c.classList.toggle('wrong', app.wrongIds.includes(`${c.dataset.side}:${id}`));
    c.disabled = matched;
  });
  drawLines();
  els.mistakes.textContent = `錯誤 ${s.mistakes}`;
  els.hintCount.textContent = String(hintsLeft(s));
  els.hintBtn.setAttribute('aria-label', `提示，剩餘 ${hintsLeft(s)} 次`);
  renderTimer();
}

/** 依已配對的單字，在兩欄卡片之間畫出連線。 */
function drawLines() {
  const s = app.state;
  const box = els.columns.getBoundingClientRect();
  els.lines.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  let html = '';
  for (const id of s.matched[s.board]) {
    const a = els.leftCol.querySelector(`[data-id="${CSS.escape(id)}"]`);
    const b = els.rightCol.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!a || !b) continue;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x1 = ra.right - box.left;
    const y1 = ra.top + ra.height / 2 - box.top;
    const x2 = rb.left - box.left;
    const y2 = rb.top + rb.height / 2 - box.top;
    html += `<line class="line${s.results[id] === 'hint' ? ' hint' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }
  els.lines.innerHTML = html;
}

/**
 * 顯示訊息。
 * @param {string} text 訊息。
 * @param {'' | 'error' | 'good'} [kind=''] 樣式。
 */
function showMessage(text, kind = '') {
  clearTimeout(app.messageTimer);
  els.message.textContent = text;
  els.message.className = `game-message${kind ? ` ${kind}` : ''}`;
  app.messageTimer = setTimeout(() => {
    els.message.textContent = '';
    els.message.className = 'game-message';
  }, MESSAGE_MS);
}

/**
 * 判斷目前能否操作。
 * @returns {boolean} 可操作時為 true。
 */
function canPlay() {
  return app.screen === 'game' && !!app.state && !app.state.completed && !app.paused && !app.busy && els.modal.hidden;
}

/**
 * 點選卡片。
 * @param {'left' | 'right'} side 欄位。
 * @param {string} id 單字 id。
 */
function onCard(side, id) {
  if (!canPlay()) return;
  const r = tapCard(app.state, side, id);
  if (r.type === 'ignore') return;
  if (r.type === 'wrong') {
    clearTimeout(app.wrongTimer);
    app.wrongIds = [`left:${r.left}`, `right:${r.right}`];
    app.wrongTimer = setTimeout(() => {
      app.wrongIds = [];
      renderState();
    }, WRONG_MS);
    showMessage('✕ 配錯了，再試一次', 'error');
  } else if (r.type === 'match') {
    showMessage('✓ 正確！', 'good');
  }
  persist();
  renderState();
  if (r.type === 'match' && boardDone(app.state)) finishBoard();
}

/** 使用提示。 */
function onHint() {
  if (!canPlay()) return;
  const r = useHint(app.state);
  if (r.result === 'no-quota') {
    showMessage(`本局提示已用完（每局 ${DIFFICULTIES[app.state.difficulty].hints} 次）`, 'error');
    return;
  }
  if (r.result !== 'matched') return;
  showMessage(`已提示：${wordById.get(r.id).en} ＝ ${wordById.get(r.id).zh}`);
  persist();
  renderState();
  if (boardDone(app.state)) finishBoard();
}

/** 一盤完成：更新單字本，顯示本盤單字卡，再進入下一盤或結束。 */
async function finishBoard() {
  const s = app.state;
  app.busy = true;
  const ids = currentBoard(s).ids;
  store.saveBook(applyBoardToBook(store.loadBook(), ids, s.results, Date.now()));
  store.addRecent(ids);
  await new Promise((r) => setTimeout(r, 350));
  const last = isLastBoard(s);
  const cards = ids.map((id) => wordCardHtml(wordById.get(id), s.results[id] === 'wrong' ? '答錯' : s.results[id] === 'hint' ? '提示' : '')).join('');
  stopTimer();
  await openModal({
    title: `第 ${s.board + 1} 盤完成`,
    html: `<div class="word-cards">${cards}</div>`,
    actions: [{ label: last ? '查看結果' : '下一盤', value: true, className: 'primary' }],
    dismissValue: true,
  });
  app.busy = false;
  if (last) {
    finishRound();
    return;
  }
  nextBoard(s);
  persist();
  renderBoard();
  startTimer();
}

/** 一局完成：更新統計、清除存檔並顯示結果。 */
async function finishRound() {
  const s = app.state;
  stopTimer(false);
  s.completed = true;
  const { newRecord } = store.recordComplete(s.difficulty, s.elapsedMs, s.hintsUsed);
  store.clearSave();
  const all = s.boards.flatMap((b) => b.ids);
  const missed = all.filter((id) => s.results[id]);
  const choice = await openModal({
    title: '完成！',
    html: `${newRecord ? '<p><span class="record-badge">🏆 新紀錄</span></p>' : ''}
      <dl class="result-list">
        <dt>分類</dt><dd>${esc(sourceName(s.source))}</dd>
        <dt>難度</dt><dd>${DIFFICULTIES[s.difficulty].label}</dd>
        <dt>單字數</dt><dd>${all.length} 個</dd>
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>錯誤次數</dt><dd>${s.mistakes}</dd>
        <dt>已用提示</dt><dd>${s.hintsUsed} / ${DIFFICULTIES[s.difficulty].hints}</dd>
      </dl>
      ${missed.length ? `<p style="margin-top:14px;font-weight:700">需要複習的單字（${missed.length}）</p><div class="word-cards">${missed.map((id) => wordCardHtml(wordById.get(id), s.results[id] === 'wrong' ? '答錯' : '提示')).join('')}</div>` : '<p style="margin-top:14px">全部一次答對，太厲害了！</p>'}`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'home',
  });
  if (choice === 'again') startNewGame(s.source, s.difficulty);
  else goHome();
}

// ---------- 選單、單字本、統計、玩法、設定 ----------

/** 遊戲中的選單。 */
async function openGameMenu() {
  const choice = await openModal({
    title: '選單',
    menu: [
      { label: '重開本局', value: 'restart' },
      { label: '單字本', value: 'book' },
      { label: `發音按鈕：${app.settings.speech ? '開' : '關'}`, value: 'speech' },
      { label: THEME_LABEL[app.settings.theme], value: 'theme' },
      { label: '回首頁', value: 'home' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'restart') restartCurrent();
  else if (choice === 'book') openBook();
  else if (choice === 'speech') toggleSpeech();
  else if (choice === 'theme') cycleTheme();
  else if (choice === 'home') goHome();
}

/** 切換發音按鈕。 */
function toggleSpeech() {
  app.settings.speech = !app.settings.speech;
  store.saveSettings(app.settings);
  if (app.screen === 'game') renderBoard();
}

/**
 * 單字本：已學會與待複習兩個分頁，可依分類篩選與搜尋。
 * @param {'learned' | 'review'} [tab='learned'] 分頁。
 */
async function openBook(tab = 'learned') {
  const book = store.loadBook();
  const learned = WORDS.filter((w) => book[w.id] && book[w.id].learned).length;
  const options = CATEGORIES.filter((c) => c.count > 0).map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  const wait = openModal({
    title: `單字本（已學會 ${learned} / ${WORDS.length}）`,
    html: `<div class="tabs"><button type="button" data-tab="learned">已學會</button><button type="button" data-tab="review">待複習</button></div>
      <div class="book-tools"><input id="book-search" type="search" placeholder="搜尋英文或中文" autocomplete="off"><select id="book-cat"><option value="">全部分類</option>${options}</select></div>
      <div id="book-list" class="book-list"></div>`,
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
  const search = $('book-search');
  const cat = $('book-cat');
  const list = $('book-list');
  let current = tab;
  /** 依分頁、分類與搜尋字串重繪清單。 */
  const render = () => {
    els.modalBody.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === current));
    const q = search.value.trim().toLowerCase();
    const rows = WORDS.filter((w) => {
      const b = book[w.id];
      if (!b || !(current === 'learned' ? b.learned : b.review)) return false;
      if (cat.value && !w.categories.includes(cat.value)) return false;
      return !q || w.en.toLowerCase().includes(q) || w.zh.includes(q);
    });
    list.innerHTML = rows.length
      ? rows.slice(0, 300).map((w) => `<button type="button" class="book-row" data-id="${w.id}"><b>${esc(w.en)}</b><span>${esc(w.zh)}</span></button>`).join('')
      : `<p style="color:var(--text-muted)">${current === 'learned' ? '還沒有學會的單字，去玩一局吧！' : '目前沒有待複習的單字。'}</p>`;
    list.querySelectorAll('.book-row').forEach((r) => r.addEventListener('click', () => closeModal({ word: r.dataset.id, tab: current })));
  };
  els.modalBody.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      current = b.dataset.tab;
      render();
    }),
  );
  search.addEventListener('input', render);
  cat.addEventListener('change', render);
  render();
  const choice = await wait;
  if (choice && choice.word) {
    await openModal({ title: '單字卡', html: wordCardHtml(wordById.get(choice.word)), actions: [{ label: '回單字本', value: null, className: 'primary' }] });
    openBook(choice.tab);
  }
}

/** 顯示統計。 */
async function openStats() {
  const stats = store.loadStats();
  const rows = DIFFICULTY_KEYS.map((k) => {
    const s = stats[k];
    return `<tr><td>${DIFFICULTIES[k].label}</td><td>${s.started}</td><td>${s.completed}</td><td>${s.bestMs === null ? '—' : formatTime(s.bestMs)}</td><td>${s.completed ? formatTime(s.totalMs / s.completed) : '—'}</td><td>${s.noHint}</td></tr>`;
  }).join('');
  const choice = await openModal({
    title: '統計',
    html: `<table class="stats-table"><thead><tr><th>難度</th><th>開局</th><th>完成</th><th>最佳</th><th>平均</th><th>無提示</th></tr></thead><tbody>${rows}</tbody></table>
      <p style="margin-top:10px;font-size:13px">統計只存在這台裝置；單字學習進度請看單字本。</p>`,
    actions: [
      { label: '重設統計', value: 'reset', className: 'danger' },
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'reset' && (await confirmDialog('重設統計？', '所有難度的統計都會歸零（單字本不受影響）。', '重設'))) {
    store.resetStats();
    openStats();
  }
}

/** 顯示玩法。 */
function openRules() {
  openModal({
    title: '玩法',
    html: `<p>點一張左邊的卡片，再點右邊意思相同的卡片，就能連成一條線。先點右邊也可以。</p>
      <p>每一盤全部配對完成後會顯示單字卡，可以看例句、聽發音（🔊）。一局共 5 盤。</p>
      <p>簡單到困難是英文配中文；專家反過來，是中文配英文。</p>
      <p>答錯或使用提示的單字會放進「待複習」，之後一次答對就會移出；首頁的「待複習」可以專門練習它們。</p>
      <p>發音使用手機內建的英文語音，離線時能否發音取決於手機是否內建英文語音；可以在「設定」關閉。</p>
      <p>鍵盤：數字 1～6 選左欄、Q W E R T Y 選右欄、H 提示、P 暫停。</p>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

/** 選擇語音時試聽的句子。 */
const SAMPLE_TEXT = 'Hello! Where is the boarding gate?';

/** 儲存設定並套用到發音模組。 */
function applySpeechSettings() {
  store.saveSettings(app.settings);
  configureSpeech(app.settings);
}

/** 讓玩家選擇發音語音；選好後試聽一次。 */
async function chooseVoice() {
  const auto = { label: `${app.settings.voice ? '' : '✓ '}自動（推薦）`, value: '' };
  const items = voiceOptions().map((v) => ({ label: `${v.name === app.settings.voice ? '✓ ' : ''}${v.name}（${v.lang}）`, value: v.name }));
  const choice = await openModal({
    title: '發音語音',
    html: '<p>依音質排序；選擇後會試聽一次。聲音不自然時可換一個試試。</p><p>iPhone、iPad 與 Mac 可到「設定 › 輔助使用 › 朗讀內容 › 聲音 › 英文」下載「加強版」或「高品質」語音，下載後會自動優先使用。</p>',
    menu: [auto, ...items],
    actions: [{ label: '返回', value: null }],
  });
  if (choice === null) return;
  app.settings.voice = choice;
  applySpeechSettings();
  speak(SAMPLE_TEXT);
}

/** 顯示設定。 */
async function openSettings() {
  const choice = await openModal({
    title: '設定',
    menu: [
      { label: `發音按鈕：${app.settings.speech ? '開' : '關'}${speechAvailable() ? '' : '（此裝置沒有英文語音）'}`, value: 'speech' },
      ...(speechAvailable() ? [
        { label: `發音語音：${app.settings.voice ? currentVoiceName() : `自動（${currentVoiceName()}）`}`, value: 'voice' },
        { label: `語速：${app.settings.rate === 'slow' ? '慢速' : '正常'}`, value: 'rate' },
      ] : []),
      { label: THEME_LABEL[app.settings.theme], value: 'theme' },
    ],
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
  if (choice === 'speech') {
    toggleSpeech();
    openSettings();
  } else if (choice === 'voice') {
    await chooseVoice();
    openSettings();
  } else if (choice === 'rate') {
    app.settings.rate = app.settings.rate === 'slow' ? 'normal' : 'slow';
    applySpeechSettings();
    speak(SAMPLE_TEXT);
    openSettings();
  } else if (choice === 'theme') {
    cycleTheme();
    openSettings();
  }
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
  if (app.screen !== 'game' || !app.state) return;
  if (app.paused) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      resumeGame();
    }
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  const board = currentBoard(app.state);
  let handled = true;
  if (/^[1-6]$/.test(key) && board.left[Number(key) - 1]) onCard('left', board.left[Number(key) - 1]);
  else if (RIGHT_KEYS.includes(key) && board.right[RIGHT_KEYS.indexOf(key)]) onCard('right', board.right[RIGHT_KEYS.indexOf(key)]);
  else if (key === 'h') onHint();
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

/** 更新離線狀態（詢問本遊戲自己註冊的 Service Worker）。 */
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

/** 玩家同意更新。 */
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
    // 忽略。
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

/** 綁定事件。 */
function bindEvents() {
  els.themeBtn.addEventListener('click', cycleTheme);
  els.continueBtn.addEventListener('click', continueGame);
  els.mixBtn.addEventListener('click', () => chooseDifficulty(MIX));
  els.reviewBtn.addEventListener('click', () => chooseDifficulty(REVIEW));
  els.bookBtn.addEventListener('click', () => openBook());
  els.statsBtn.addEventListener('click', openStats);
  els.rulesBtn.addEventListener('click', openRules);
  els.settingsBtn.addEventListener('click', openSettings);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
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
      app.busy = false;
      showHome();
    }
  });
  window.addEventListener('resize', () => {
    if (app.screen === 'game' && app.state) drawLines();
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
  applyTheme();
  bindEvents();
  if (history.state && history.state.screen) history.replaceState(null, '');
  const notices = [];
  if (!store.storageAvailable()) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  const saved = store.loadSave((id) => wordById.has(id));
  if (saved.status === 'corrupt') {
    store.clearSave();
    notices.push('先前的遊戲進度資料損毀或詞庫已更新，已無法恢復，請開始新局；單字本不受影響。');
  }
  if (isIosBrowserTab()) notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟；只在 Safari 中玩時，7 天未使用可能被清除資料。');
  els.homeNotice.innerHTML = notices.map((n) => `<p>${esc(n)}</p>`).join('');
  els.homeNotice.hidden = notices.length === 0;
  setupPortalLink();
  showHome();
  configureSpeech(app.settings);
  initSpeech(() => {
    if (app.screen === 'game' && app.state) renderBoard();
  });
  setupServiceWorker();
}

init();
