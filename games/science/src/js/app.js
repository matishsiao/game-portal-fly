// 主程式：畫面切換、三種題型（選擇、排順序、分類）的作答、想一想與解題重點、實驗結果、科學卡與圖鑑、完成畫面、複習本、休息提醒、計時、Service Worker 與離線狀態。

import {
  DIFFICULTIES, DIFFICULTY_KEYS, createGame, restartGame, isOver, currentItem, hintsLeft, choose, placeOrder, unplaceOrder, placeSort, unplaceSort,
  canCheck, check, showKey, nextQuestion, itemResult, isPerfect,
} from './game.js';
import { createBank, TOPICS, TOPIC_INFO, UNIT_GROUPS, GROUP_INFO, MODE_LABEL } from './science/bank.js';
import { pickRound, dueCount, MIN_REVIEW } from './science/pick.js';
import { dateKey, unitProgress } from './science/srs.js';
import * as rest from './rest.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';

/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 3000;
/** 選項的顯示代號。 */
const LETTERS = ['A', 'B', 'C', 'D'];
/** 題型的顯示名稱。 */
const TYPE_LABEL = { choice: '選擇題', order: '排順序', sort: '分類' };

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
  stageList: $('stage-list'),
  todayBtn: $('today-btn'),
  todayDetail: $('today-detail'),
  unitMap: $('unit-map'),
  mixedBtn: $('mixed-btn'),
  cardsBtn: $('cards-btn'),
  reviewBtn: $('review-btn'),
  rulesBtn: $('rules-btn'),
  statsBtn: $('stats-btn'),
  restBtn: $('rest-btn'),
  homeBtn: $('home-btn'),
  menuBtn: $('menu-btn'),
  gameDifficulty: $('game-difficulty'),
  progress: $('progress'),
  timer: $('timer'),
  mistakes: $('mistakes'),
  playArea: $('play-area'),
  sheet: $('sheet'),
  topic: $('topic'),
  question: $('question'),
  hints: $('hints'),
  hintsList: $('hints-list'),
  result: $('result'),
  resultText: $('result-text'),
  explain: $('explain'),
  explainText: $('explain-text'),
  card: $('card'),
  message: $('game-message'),
  work: $('work'),
  pauseCover: $('pause-cover'),
  pauseTitle: $('pause-title'),
  pauseSub: $('pause-sub'),
  resumeBtn: $('resume-btn'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
  checkBtn: $('check-btn'),
  nextBtn: $('next-btn'),
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
  bank: createBank(null, null),
  paused: false,
  running: false,
  segmentStart: 0,
  tickTimer: 0,
  message: '',
  messageTimer: 0,
  settings: store.loadSettings(),
  rest: rest.createRest(),
  registration: null,
  updateRequested: false,
  modalResolve: null,
  lastUpdateCheck: 0,
  /** 分類題中目前選取的卡片顯示位置（-1 為未選取；不存檔）。 */
  selectedCard: -1,
  /** 本局新收集的科學卡 id。 */
  newCards: [],
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
 * @returns {string} 可安全放入 HTML 的文字。
 */
function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * 由題目 id 取得題目。
 * @param {string} id 題目 id。
 * @returns {object | null} 題目。
 */
function lookup(id) {
  return app.bank.lookup(id);
}

/**
 * 取得目前累計耗時（含進行中的這一段）。
 * @returns {number} 毫秒。
 */
function currentElapsed() {
  if (!app.state) return 0;
  return app.state.elapsedMs + (app.running ? performance.now() - app.segmentStart : 0);
}

/** 立即存檔（使用目前累計耗時，不修改記憶體中的狀態）；已完成的一局不存。 */
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
 * 停止計時並把這一段時間加入累計值（也計入休息提醒的連續遊玩時間）。
 * @param {boolean} [save=true] 是否同時存檔。
 */
function stopTimer(save = true) {
  if (app.running) {
    const seg = performance.now() - app.segmentStart;
    app.state.elapsedMs += seg;
    rest.addPlay(app.rest, seg);
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

// ---------- 主題與設定 ----------

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

/** 更新首頁的休息提醒開關文字。 */
function renderRestButton() {
  els.restBtn.textContent = `休息提醒：${app.settings.rest ? '開' : '關'}`;
  els.restBtn.setAttribute('aria-pressed', String(app.settings.rest));
}

/** 切換休息提醒。 */
function toggleRest() {
  app.settings.rest = !app.settings.rest;
  store.saveSettings(app.settings);
  renderRestButton();
}

// ---------- 對話框 ----------

/**
 * 開啟對話框並等待使用者選擇。
 * @param {object} options 選項。
 * @param {string} options.title 標題。
 * @param {string} [options.html] 內容 HTML（文字須先以 esc() 跳脫）。
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
    html: `<p>${esc(text)}</p>`,
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
 * 判斷是否有已操作過、尚未完成的一局。
 * @returns {boolean} 有時為 true。
 */
function hasTouchedGame() {
  const s = app.state || store.loadSave(lookup).state;
  return !!(s && s.touched && !isOver(s));
}

/**
 * 設定新的遊戲狀態並重設單局的執行期狀態。
 * @param {object} state 遊戲狀態。
 */
function setState(state) {
  app.state = state;
  if (!Array.isArray(state.newCards)) state.newCards = [];
  app.paused = false;
  app.selectedCard = -1;
  clearMessage();
}

/**
 * 單元進度的顯示文字。
 * @param {{status: string, mastered: number, total: number}} p 單元進度。
 * @returns {string} 例如「練習中・6 / 12 題熟練」。
 */
function progressText(p) {
  const label = { new: '未開始', learning: '練習中', mastered: '已精熟' }[p.status];
  return p.status === 'new' ? `${label}・共 ${p.total} 題` : `${label}・${p.mastered} / ${p.total} 題熟練`;
}

/**
 * 某個單元目前的進度。
 * @param {string} unitId 單元 id。
 * @returns {{status: string, mastered: number, tried: number, total: number}} 進度。
 */
function progressOf(unitId) {
  return unitProgress(app.bank.unitQuestions(unitId), store.loadRecord());
}

/**
 * 開始新局；目前有進度時先確認。
 * @param {object} options 選項。
 * @param {string} options.difficulty 學習階段代碼。
 * @param {string} options.mode 模式代碼（preview、practice、review、mixed）。
 * @param {string | null} [options.unit] 單元 id（預習與練習）。
 * @param {boolean} [options.skipConfirm] 是否略過「覆蓋目前進度」的確認。
 */
async function startNewGame({ difficulty, mode, unit = null, skipConfirm = false }) {
  if (!app.bank.questions.length) {
    showHomeNotice(['題庫尚未載入，請連網後重新開啟。']);
    return;
  }
  if (!skipConfirm && hasTouchedGame()) {
    const ok = await confirmDialog('開始新局？', '目前這一局的進度會被清除。', '開始新局');
    if (!ok) return;
  }
  const today = dateKey();
  const ids = pickRound({ difficulty, mode, unit, questions: app.bank.questions, record: store.loadRecord(), today });
  if (!ids.length) {
    showHomeNotice([mode === 'review' ? `今天到期的題目不到 ${MIN_REVIEW} 題，明天再來複習吧！` : '這個單元的題目還在準備中，請先選其他單元。']);
    return;
  }
  // 預習：先讀這個單元的科學卡（最多 3 張），按「開始作答」才進入題目。
  if (mode === 'preview') {
    const cards = [...new Set(app.bank.unitQuestions(unit).map((q) => q.card))].map((id) => app.bank.card(id)).filter(Boolean).slice(0, 3);
    const go = await openModal({
      title: `先讀一讀：${app.bank.unit(unit).title}`,
      html: `<p>預習前先讀一讀這個單元的重點，等一下作答時就用得上。</p>${cards.map((c) => `<div class="sci-card" style="margin-bottom:10px">${cardHtml(c)}</div>`).join('')}`,
      actions: [
        { label: '取消', value: false },
        { label: '開始作答', value: true, className: 'primary' },
      ],
      dismissValue: false,
    });
    if (go !== true) return;
  }
  if (app.running) stopTimer();
  const state = createGame({ difficulty, mode, unit, ids, lookup });
  // 記下開局時的單元進度，完成畫面顯示進度變化。
  state.startStatus = unit ? progressOf(unit).status : null;
  setState(state);
  store.recordStart(difficulty);
  store.markSeen(ids, Date.now());
  persist();
  enterGame(true);
}

/** 從存檔繼續遊戲。 */
function continueGame() {
  if (!app.state) {
    const saved = store.loadSave(lookup);
    if (saved.status !== 'ok') {
      renderHome();
      return;
    }
    setState(saved.state);
  }
  enterGame(false);
}

/**
 * 切換到遊戲畫面並開始計時。
 * @param {boolean} newGame 是否為新的一局（重設本局的休息提醒次數）。
 */
function enterGame(newGame) {
  app.screen = 'game';
  app.paused = false;
  rest.enterGame(app.rest, performance.now(), newGame);
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
  if (app.screen === 'game') rest.leaveGame(app.rest, performance.now());
  app.paused = false;
  app.screen = 'home';
  els.game.hidden = true;
  els.home.hidden = false;
  renderHome();
}

/**
 * 暫停遊戲並遮住題目、提示與作答區。
 * @param {{restReminder?: boolean}} [options] restReminder 為 true 時顯示休息提醒的文字。
 */
function pauseGame({ restReminder = false } = {}) {
  if (!app.state || isOver(app.state) || app.paused) return;
  stopTimer();
  app.paused = true;
  els.pauseTitle.textContent = restReminder ? '休息一下吧！' : '已暫停';
  els.pauseSub.hidden = !restReminder;
  els.resumeBtn.textContent = restReminder ? '休息好了，繼續' : '繼續';
  els.pauseCover.hidden = false;
  render();
  els.resumeBtn.focus({ preventScroll: true });
}

/** 從暫停恢復。 */
function resumeGame() {
  if (!app.paused) return;
  app.paused = false;
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/** 重開本局（同一組題目與顯示順序）；有進度時先確認。 */
async function restartCurrent() {
  if (!app.state) return;
  if (app.state.touched) {
    const ok = await confirmDialog('重開本局？', '會清除這一局的作答紀錄（題目不變），耗時、答錯次數與解題重點次數也會重設。', '重開本局');
    if (!ok) return;
  }
  stopTimer(false);
  setState(restartGame(app.state, lookup));
  persist();
  els.pauseCover.hidden = true;
  render();
  startTimer();
}

/**
 * 一題作答結果的文字標籤。
 * @param {object} item 作答紀錄。
 * @returns {string} 例如「✓ 一次答對」「✕ 答錯 2 次」「💡 看了解題重點」。
 */
function resultLabel(item) {
  const r = itemResult(item);
  if (r.clean) return '✓ 一次答對';
  const parts = [];
  if (r.wrong) parts.push(`✕ 答錯 ${r.wrong} 次`);
  if (r.hint) parts.push('💡 看了解題重點');
  return parts.join('・');
}

/**
 * 題目的正確答案文字（完成畫面與複習本使用）。
 * @param {object} q 題目。
 * @returns {string} HTML。
 */
function answerHtml(q) {
  if (q.type === 'choice') return esc(q.options[q.answer].text);
  if (q.type === 'order') return q.items.map(esc).join(' → ');
  return q.bins.map((b, i) => `<b>${esc(b)}</b>：${q.cards.filter((c) => c.bin === i).map((c) => esc(c.text)).join('、')}`).join('<br>');
}

/**
 * 科學卡的 HTML。
 * @param {object} c 科學卡。
 * @param {boolean} [isNew=false] 是否為新收集的卡片。
 * @returns {string} HTML。
 */
function cardHtml(c, isNew = false) {
  const exp = c.experiment
    ? `<p><span class="card-label">🏠 在家做做看：</span>${esc(c.experiment.steps)}</p><p><span class="card-label">⚠️ 注意：</span>${esc(c.experiment.safety)}</p>`
    : '';
  return `<h3><span class="card-icon" aria-hidden="true">${esc(c.icon)}</span>${esc(c.title)}${isNew ? '<span class="new-badge">新收集</span>' : ''}</h3>
    <p>${esc(c.body)}</p><p><span class="card-label">生活中的例子：</span>${esc(c.example)}</p>${exp}`;
}

/**
 * 題目、正確答案、解題重點與詳解的 HTML（完成畫面與複習本使用）。
 * @param {object} q 題目。
 * @returns {string} HTML。
 */
function questionDetailHtml(q) {
  return `<p class="detail-q">${esc(q.question)}</p>
    <p><b>答案：</b>${answerHtml(q)}</p>
    <p class="detail-label">💡 解題重點</p><ol class="detail-keys">${q.keys.map((k) => `<li>${esc(k)}</li>`).join('')}</ol>
    <p class="detail-label">詳解</p><p>${esc(q.explain)}</p>`;
}

/** 完成一局：停止計時、更新統計與獎勵、清除存檔，顯示完成畫面。 */
async function finishGame() {
  stopTimer(false);
  const s = app.state;
  const cfg = DIFFICULTIES[s.difficulty];
  const perfect = isPerfect(s);
  const { newRecord, rewards } = store.recordComplete(s.difficulty, s.elapsedMs, perfect);
  store.clearSave();
  render();
  const badges = [newRecord ? '<span class="record-badge">🏆 最佳時間</span>' : '', perfect ? '<span class="record-badge">⭐ 全對</span>' : ''].join(' ').trim();
  const rewardHtml = rewards.length ? `<p class="reward-got">🎁 獲得口袋地城獎勵：${rewards.map(esc).join('、')}</p>` : '';
  const newCards = s.newCards.map((id) => app.bank.card(id)).filter(Boolean);
  let progressHtml = '';
  if (s.unit) {
    const now = progressOf(s.unit);
    const label = { new: '未開始', learning: '練習中', mastered: '已精熟' };
    const change = s.startStatus && s.startStatus !== now.status ? `${label[s.startStatus]} → ` : '';
    progressHtml = `<dt>單元進度</dt><dd>${change}${esc(progressText(now))}</dd>`;
  }
  const cardsHtml = newCards.length
    ? `<h3 class="result-head">新收集的科學卡（${newCards.length} 張）</h3><p>${newCards.map((c) => `${esc(c.icon)} ${esc(c.title)}`).join('、')}</p>`
    : '';
  const list = s.items
    .map((it, k) => {
      const q = lookup(it.id);
      return `<details class="result-item"><summary><span>第 ${k + 1} 題・${esc(app.bank.unit(q.unit).title)}・${TYPE_LABEL[q.type]}</span><span class="result-tag${itemResult(it).clean ? ' clean' : ''}">${resultLabel(it)}</span></summary>${questionDetailHtml(q)}</details>`;
    })
    .join('');
  const choice = await openModal({
    title: perfect ? '太厲害了，全部一次答對！' : '完成了！',
    html: `${badges ? `<p>${badges}</p>` : ''}${rewardHtml}
      <dl class="result-list">
        <dt>難度</dt><dd>${cfg.label}</dd>
        <dt>範圍</dt><dd>${esc(scopeText(s))}</dd>${progressHtml}
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>答錯次數</dt><dd>${s.mistakes}</dd>
        <dt>看解題重點</dt><dd>${s.hintsUsed} / ${cfg.hints}</dd>
      </dl>${cardsHtml}
      <h3 class="result-head">每題結果（點開看詳解）</h3>${list}`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: s.mode === 'preview' ? '接著練習這個單元' : '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'stay',
  });
  if (choice === 'again') startNewGame({ difficulty: s.difficulty, mode: s.mode === 'preview' ? 'practice' : s.mode, unit: s.unit, skipConfirm: true });
  else goHome();
}

// ---------- 操作 ----------

/**
 * 顯示暫時訊息。
 * @param {string} text 訊息。
 */
function showMessage(text) {
  app.message = text;
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
}

/**
 * 判斷目前是否可以操作。
 * @returns {boolean} 可操作時為 true。
 */
function canPlay() {
  return app.screen === 'game' && !!app.state && !isOver(app.state) && !app.paused && els.modal.hidden;
}

/**
 * 把新出現的區塊捲進作答區的可見範圍（只捲動作答區，不捲動整頁）。
 * @param {HTMLElement} box 要顯示的區塊。
 */
function revealInSheet(box) {
  if (box.hidden) return;
  const sheet = els.sheet;
  const top = box.offsetTop - sheet.offsetTop;
  const bottom = top + box.offsetHeight;
  if (bottom > sheet.scrollTop + sheet.clientHeight) sheet.scrollTop = Math.max(0, Math.min(top, bottom - sheet.clientHeight + 4));
}

/** 一題答對後：更新複習本、收集科學卡、存檔並把詳解捲進畫面。 */
function afterCorrect() {
  const item = currentItem(app.state);
  const q = lookup(item.id);
  store.markResult(item.id, itemResult(item).clean, dateKey());
  if (store.collectCard(q.card, Date.now())) app.state.newCards.push(q.card);
  clearMessage();
  persist();
  render();
  revealInSheet(els.result.hidden ? els.explain : els.result);
  els.nextBtn.focus({ preventScroll: true });
}

/**
 * 選擇題：點選選項作答。
 * @param {number} slot 顯示位置（0～3）。
 */
function onChoose(slot) {
  if (!canPlay()) return;
  const item = currentItem(app.state);
  if (item.type !== 'choice') return;
  const r = choose(app.state, slot, lookup(item.id));
  if (r.result === 'ignored') return;
  if (r.result === 'correct') {
    afterCorrect();
    return;
  }
  showMessage(r.lastOne ? '再想一想！只剩下一個選項了' : '再想一想！看看上面的提示');
  persist();
  render();
  revealInSheet(els.hints);
}

/**
 * 排序題：點選項目放進第一個空格。
 * @param {number} display 項目的顯示位置。
 */
function onPlaceOrder(display) {
  if (!canPlay() || !placeOrder(app.state, display)) return;
  clearMessage();
  persist();
  render();
}

/**
 * 排序題：點選格子取回項目。
 * @param {number} slot 格子位置。
 */
function onUnplaceOrder(slot) {
  if (!canPlay()) return;
  const item = currentItem(app.state);
  if (item.locked[slot]) {
    showMessage('這一格已經確定是對的，不用再換');
    return;
  }
  if (unplaceOrder(app.state, slot)) {
    persist();
    render();
  }
}

/**
 * 分類題：點選卡片（選取或取回）。
 * @param {number} card 卡片的顯示位置。
 */
function onPickCard(card) {
  if (!canPlay()) return;
  const item = currentItem(app.state);
  if (item.locked[card]) {
    showMessage('這張卡已經確定放對了');
    return;
  }
  if (item.place[card] >= 0) {
    unplaceSort(app.state, card);
    app.selectedCard = card;
    persist();
  } else {
    app.selectedCard = app.selectedCard === card ? -1 : card;
  }
  render();
}

/**
 * 分類題：點選類別，把選取的卡片放進去。
 * @param {number} bin 類別索引。
 */
function onPickBin(bin) {
  if (!canPlay()) return;
  if (app.selectedCard < 0) {
    showMessage('先點一張卡片，再點要放進的類別');
    return;
  }
  const item = currentItem(app.state);
  if (placeSort(app.state, app.selectedCard, bin, lookup(item.id))) {
    // 不自動選取下一張：孩子習慣「點卡片 → 點類別」，自動選取後再點同一張反而會取消選取。
    app.selectedCard = -1;
    clearMessage();
    persist();
    render();
  }
}

/** 排序題與分類題：檢查答案。 */
function onCheck() {
  if (!canPlay()) return;
  const item = currentItem(app.state);
  if (item.type === 'choice') return;
  if (!canCheck(item)) {
    showMessage(item.type === 'order' ? '每一格都放好才能檢查' : '每張卡片都放進類別才能檢查');
    return;
  }
  const r = check(app.state, lookup(item.id));
  if (r.result === 'correct') {
    app.selectedCard = -1;
    afterCorrect();
    return;
  }
  app.selectedCard = -1;
  showMessage(`有 ${r.wrong.length} 個${item.type === 'order' ? '位置' : '卡片'}不對，已經退回來了，再想一想`);
  persist();
  render();
  revealInSheet(els.hints);
}

/** 主動查看下一段解題重點。 */
function onHint() {
  if (!canPlay()) return;
  const r = showKey(app.state);
  if (r === 'no-quota') showMessage(`這一局的解題重點用完了（每局 ${DIFFICULTIES[app.state.difficulty].hints} 次）`);
  else if (r === 'all-shown') showMessage('這一題的解題重點都已經顯示了');
  else if (r === 'shown') {
    clearMessage();
    persist();
    render();
    revealInSheet(els.hints);
  }
}

/** 進入下一題；最後一題後完成本局。連續遊玩夠久時先提醒休息。 */
function onNext() {
  if (!canPlay() || !nextQuestion(app.state)) return;
  if (isOver(app.state)) {
    finishGame();
    return;
  }
  app.selectedCard = -1;
  clearMessage();
  persist();
  render();
  els.sheet.scrollTop = 0;
  const running = app.running ? performance.now() - app.segmentStart : 0;
  if (rest.shouldRemind(app.rest, running, app.settings.rest)) pauseGame({ restReminder: true });
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
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const key = e.key.toLowerCase();
  const item = app.state && currentItem(app.state);
  let handled = true;
  if (item && item.type === 'choice' && /^[1-4]$/.test(key)) onChoose(Number(key) - 1);
  else if (item && item.type === 'choice' && ['a', 'b', 'c', 'd'].includes(key)) onChoose(key.charCodeAt(0) - 97);
  else if (key === 'enter') {
    if (item && item.done) onNext();
    else onCheck();
  } else if (key === 'h') onHint();
  else if (key === 'p' || key === 'escape') pauseGame();
  else handled = false;
  if (handled) e.preventDefault();
}

// ---------- 選單、統計、圖鑑、複習本與說明 ----------

/** 遊戲中的選單。 */
async function openGameMenu() {
  if (!app.state) return;
  const choice = await openModal({
    title: '選單',
    menu: [
      { label: '換一組題目（同一個範圍）', value: 'new' },
      { label: '重開本局', value: 'restart', className: 'danger-text' },
      { label: THEME_LABEL[app.settings.theme], value: 'theme' },
      { label: '玩法', value: 'rules' },
      { label: '回首頁', value: 'home' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'new') {
    const s = app.state;
    startNewGame({ difficulty: s.difficulty, mode: s.mode, unit: s.unit });
  } else if (choice === 'restart') restartCurrent();
  else if (choice === 'theme') cycleTheme();
  else if (choice === 'rules') openRules();
  else if (choice === 'home') goHome();
}

/**
 * 一局的範圍說明。
 * @param {object} s 遊戲狀態。
 * @returns {string} 例如「國中・預習・直線運動」「中年級・今日複習」。
 */
function scopeText(s) {
  const parts = [DIFFICULTIES[s.difficulty].label, MODE_LABEL[s.mode]];
  if (s.unit && app.bank.unit(s.unit)) parts.push(app.bank.unit(s.unit).title);
  return parts.join('・');
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
  const collected = Object.keys(store.loadCards()).filter((id) => app.bank.card(id)).length;
  const choice = await openModal({
    title: '統計',
    html: `<div style="overflow-x:auto"><table class="stats-table">
      <thead><tr><th>難度</th><th>開局</th><th>完成</th><th>最佳</th><th>平均</th><th>全對</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p style="margin-top:10px">科學圖鑑已收集 ${collected} / ${app.bank.cards.length} 張。</p>
      <p style="font-size:14px">統計只存在這台裝置。「全對」是沒答錯、也沒看解題重點完成的局數。重設統計不會清除科學圖鑑與複習本。</p>`,
    actions: [
      { label: '重設統計', value: 'reset', className: 'danger' },
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'reset' && (await confirmDialog('重設統計？', '所有難度的統計都會歸零，無法復原（科學圖鑑與複習本會保留）。', '重設'))) {
    store.resetStats();
    openStats();
  }
}

/** 顯示科學圖鑑：依主題分組，已收集的可以點開閱讀，未收集的只顯示名稱。 */
async function openCards() {
  const got = store.loadCards();
  const total = app.bank.cards.length;
  const count = app.bank.cards.filter((c) => got[c.id]).length;
  const groups = TOPICS.map((t) => {
    const cards = app.bank.cards.filter((c) => c.topic === t);
    if (!cards.length) return '';
    const have = cards.filter((c) => got[c.id]);
    const grid = cards
      .map((c) => (got[c.id]
        ? `<details class="result-item"><summary><span>${esc(c.icon)} ${esc(c.title)}</span></summary><div class="sci-card">${cardHtml(c)}</div></details>`
        : `<p class="result-item" style="opacity:.6">❔ ${esc(c.title)}（還沒收集）</p>`))
      .join('');
    return `<h3 class="result-head"><span class="tag" data-topic="${t}">${TOPIC_INFO[t].icon} ${TOPIC_INFO[t].label}</span> ${have.length} / ${cards.length}</h3>${grid}`;
  }).join('');
  await openModal({
    title: `科學圖鑑（${count} / ${total}）`,
    html: `<p>答對題目就會收集到那一題的科學卡。點開已收集的卡片可以再讀一次。</p>${groups}`,
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
}

/** 顯示複習本：待複習的題目依難度分組，可直接看答案與詳解。 */
async function openReview() {
  const ids = store.reviewIds(lookup);
  const groups = DIFFICULTY_KEYS.map((key) => {
    const qs = ids.map(lookup).filter((q) => q.difficulty === key);
    if (!qs.length) return '';
    const items = qs
      .map((q) => `<details class="result-item"><summary><span>${esc(q.question)}</span></summary>${questionDetailHtml(q)}</details>`)
      .join('');
    return `<h3 class="result-head">${DIFFICULTIES[key].label}（${qs.length} 題）</h3>${items}`;
  }).join('');
  const html = ids.length
    ? `<p>答錯或看過解題重點的題目會放在這裡。之後在遊戲中一次答對，就會自動移出。</p>${groups}`
    : '<p>目前沒有待複習的題目。答錯或看過解題重點的題目會放在這裡。</p>';
  const choice = await openModal({
    title: `複習本（${ids.length} 題）`,
    html,
    actions: [
      ...(ids.length ? [{ label: '清除複習本', value: 'clear', className: 'danger' }] : []),
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'clear' && (await confirmDialog('清除複習本？', '所有待複習的題目都會移出複習本，無法復原。', '清除'))) {
    store.clearReview();
    openReview();
  }
}

/** 顯示玩法說明。 */
function openRules() {
  openModal({
    title: '玩法',
    html: `<p>先選學習階段（低年級、中年級、高年級、國中），再從學習地圖點選單元：</p>
      <ul>
        <li><b>預習</b>：學校還沒教到的單元，先讀科學卡再作答，解題重點多 2 次。</li>
        <li><b>練習</b>：學過的單元，答錯過和很久沒練的題目優先。</li>
        <li><b>今日複習</b>：答對的題目會隔 3 天、7 天、14 天、30 天再出現一次；答錯的隔天就再練。每天把到期的題目複習完，就不容易忘記。</li>
        <li><b>綜合練習</b>：整個學習階段隨機出題。</li>
      </ul>
      <p>單元裡八成的題目都一次答對、而且之後沒再答錯，就會變成「已精熟」。每局 8 題，有三種題型：</p>
      <ul>
        <li><b>選擇題</b>：點你覺得對的答案。有些題目是「預測實驗」，答對後會看到 🔬 實驗結果。</li>
        <li><b>排順序</b>：依照順序點選項目，放進 1、2、3… 的格子；點格子可以拿回來。放好後按「檢查」。</li>
        <li><b>分類</b>：先點一張卡片，再點要放進的類別；點已放好的卡片可以拿回來。放好後按「檢查」。</li>
      </ul>
      <p><b>答錯了沒關係</b>：會出現「💡 想一想」，告訴你剛剛的想法哪裡可以再想一想。排順序和分類檢查後，對的會留下來，錯的會退回。</p>
      <p>每題答對後會看到詳解和一張<b>科學卡</b>，第一次看到的卡片會收進「科學圖鑑」。卡片上的「在家做做看」，記得照安全說明做，需要時請大人陪同。</p>
      <p>🎁 每個難度第一次過關、第一次全對（沒答錯、沒看解題重點），都可以到「口袋地城」領獎勵禮包；每天過關一局還能領入場卷。</p>
      <p>👀 連續玩 20 分鐘會提醒你看看遠方休息一下（可在首頁關閉）。</p>
      <p><b>電腦鍵盤</b>：選擇題 1～4 或 A～D、Enter 檢查或下一題、H 解題重點、P 或 Esc 暫停。</p>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

// ---------- 繪製 ----------

/** 建立首頁的學習階段按鈕。 */
function buildHomeButtons() {
  els.stageList.innerHTML = '';
  for (const key of DIFFICULTY_KEYS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'stage-tab';
    b.setAttribute('role', 'tab');
    b.dataset.stage = key;
    b.innerHTML = `${DIFFICULTIES[key].label}<small>${DIFFICULTIES[key].grade}</small>`;
    els.stageList.appendChild(b);
  }
}

/**
 * 選擇首頁的學習階段（記住選擇）。
 * @param {string} stage 學習階段代碼。
 */
function selectStage(stage) {
  app.settings.stage = stage;
  store.saveSettings(app.settings);
  renderHome();
}

/** 繪製首頁的學習階段、今日複習與學習地圖。 */
function renderStage() {
  const stage = app.settings.stage;
  els.stageList.querySelectorAll('.stage-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.stage === stage)));
  const record = store.loadRecord();
  const due = dueCount(stage, app.bank.questions, record, dateKey());
  els.todayDetail.textContent = due >= MIN_REVIEW ? `今天有 ${due} 題到期，複習一下吧！` : due > 0 ? `今天有 ${due} 題到期（滿 ${MIN_REVIEW} 題才開始）` : '今天的複習完成了';
  els.todayBtn.setAttribute('aria-disabled', String(due < MIN_REVIEW));
  const units = app.bank.units.filter((u) => u.stage === stage);
  els.unitMap.innerHTML = UNIT_GROUPS.map((g) => {
    const list = units.filter((u) => u.topic === g);
    if (!list.length) return '';
    const items = list.map((u) => {
      const p = unitProgress(app.bank.unitQuestions(u.id), record);
      const pct = p.total ? Math.round((p.mastered / p.total) * 100) : 0;
      const ref = u.term || (u.grade ? `${u.grade} 年級` : '');
      return `<button type="button" class="unit-btn" data-unit="${u.id}" data-status="${p.status}">
        <span class="unit-icon" aria-hidden="true">${esc(u.icon)}</span>
        <span class="unit-main"><span class="unit-title">${esc(u.title)}${ref ? `<span class="unit-ref">參考：${esc(ref)}</span>` : ''}</span>
        <span class="unit-progress">${p.total ? esc(progressText(p)) : '題目準備中'}</span>
        <span class="unit-bar" aria-hidden="true"><span style="width:${pct}%"></span></span></span>
      </button>`;
    }).join('');
    return `<h3 class="unit-group"><span class="tag" data-topic="${g}">${GROUP_INFO[g].icon} ${GROUP_INFO[g].label}</span></h3>${items}`;
  }).join('');
}

/**
 * 點選學習地圖上的單元：選擇預習或練習。
 * @param {string} unitId 單元 id。
 */
async function openUnit(unitId) {
  const u = app.bank.unit(unitId);
  const qs = app.bank.unitQuestions(unitId);
  if (!u) return;
  if (!qs.length) {
    showHomeNotice([`「${u.title}」的題目還在準備中，請先選其他單元。`]);
    return;
  }
  const p = progressOf(unitId);
  const ref = u.term || (u.grade ? `${u.grade} 年級` : '');
  const choice = await openModal({
    title: `${u.icon} ${u.title}`,
    html: `<p>${esc(progressText(p))}${ref ? `・參考：${esc(ref)}（各版本課本可能不同）` : ''}</p>
      <p><b>預習</b>：還沒在學校學到時，先讀這個單元的科學卡，再作答，解題重點多 2 次。</p>
      <p><b>練習</b>：學過以後複習，答錯過和很久沒練的題目優先。</p>`,
    actions: [
      { label: '取消', value: null },
      { label: '預習', value: 'preview' },
      { label: '練習', value: 'practice', className: 'primary' },
    ],
  });
  if (choice) startNewGame({ difficulty: u.stage, mode: choice, unit: unitId });
}

/**
 * 繪製「想一想」：選擇題選錯的選項提示、分類題放錯的卡片提示，以及已顯示的解題重點。
 * @param {object} item 作答紀錄。
 * @param {object} q 題目。
 */
function renderHints(item, q) {
  const lines = [];
  if (q.type === 'choice') {
    for (const slot of item.picked) {
      const opt = q.options[item.order[slot]];
      if (opt.hint) lines.push(`<li class="hint-wrong"><b>${esc(opt.text)}</b>：${esc(opt.hint)}</li>`);
    }
  } else if (q.type === 'sort' && !item.done) {
    for (const c of item.lastWrong) {
      const card = q.cards[item.order[c]];
      lines.push(`<li class="hint-wrong"><b>${esc(card.text)}</b>：${esc(card.hint)}</li>`);
    }
  }
  for (const k of q.keys.slice(0, item.keysShown)) lines.push(`<li>${esc(k)}</li>`);
  if (q.type === 'choice' && !item.done && item.picked.length === q.options.length - 1) {
    lines.push('<li><b>只剩下一個選項了，想一想它為什麼是對的，再點點看。</b></li>');
  }
  els.hintsList.innerHTML = lines.join('');
  els.hints.hidden = lines.length === 0;
}

/**
 * 繪製選擇題的選項（答對後只留下正確選項）。
 * @param {object} item 作答紀錄。
 * @param {object} q 題目。
 */
function renderChoices(item, q) {
  const box = document.createElement('div');
  box.className = 'choices';
  item.order.forEach((index, slot) => {
    const picked = item.picked.includes(slot);
    const correct = picked && index === q.answer;
    const wrong = picked && !correct;
    if (item.done && !correct) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `choice${wrong ? ' wrong' : ''}${correct ? ' correct' : ''}`;
    b.dataset.slot = String(slot);
    b.disabled = wrong || item.done;
    b.innerHTML = `<span class="choice-letter">${LETTERS[slot]}</span><span class="choice-text">${esc(q.options[index].text)}</span><span class="choice-mark" aria-hidden="true">${correct ? '✓' : wrong ? '✕' : ''}</span>`;
    b.setAttribute('aria-label', `${LETTERS[slot]}：${q.options[index].text}${correct ? '，答對了' : wrong ? '，不對' : ''}`);
    box.appendChild(b);
  });
  els.work.appendChild(box);
}

/**
 * 繪製排序題：編號格子與還沒放的項目。
 * @param {object} item 作答紀錄。
 * @param {object} q 題目。
 */
function renderOrder(item, q) {
  if (!item.done) {
    // 待放的項目放在格子上方，檢查後退回的項目一定看得到。
    els.work.insertAdjacentHTML('beforeend', '<p class="work-note">依照順序點選項目，放進下面的格子；點格子可以拿回來。</p>');
    const pool = document.createElement('div');
    pool.className = 'pool';
    item.order.forEach((_, display) => {
      if (item.place.includes(display)) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.display = String(display);
      b.textContent = q.items[item.order[display]];
      pool.appendChild(b);
    });
    els.work.appendChild(pool);
  }
  const slots = document.createElement('div');
  slots.className = 'slots';
  item.place.forEach((display, slot) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `slot${display >= 0 ? ' filled' : ''}${item.locked[slot] ? ' locked' : ''}`;
    b.dataset.slot = String(slot);
    const text = display >= 0 ? q.items[item.order[display]] : '（空）';
    b.innerHTML = `<span class="slot-no">${slot + 1}</span><span>${esc(text)}</span>${item.locked[slot] ? '<span class="choice-mark" aria-hidden="true">✓</span>' : ''}`;
    b.setAttribute('aria-label', `第 ${slot + 1} 格：${text}${item.locked[slot] ? '，正確' : ''}`);
    slots.appendChild(b);
  });
  els.work.appendChild(slots);
}

/**
 * 繪製分類題：類別（含已放入的卡片）與還沒放的卡片。
 * @param {object} item 作答紀錄。
 * @param {object} q 題目。
 */
function renderSort(item, q) {
  if (!item.done) els.work.insertAdjacentHTML('beforeend', '<p class="work-note">先點一張卡片，再點要放進的類別；點已放好的卡片可以拿回來。</p>');
  const pool = document.createElement('div');
  pool.className = 'pool';
  /**
   * 建立一張卡片按鈕。
   * @param {number} c 卡片的顯示位置。
   * @returns {HTMLButtonElement} 按鈕。
   */
  const chip = (c) => {
    const b = document.createElement('button');
    b.type = 'button';
    const selected = app.selectedCard === c;
    b.className = `chip${selected ? ' selected' : ''}${item.locked[c] ? ' locked' : ''}${item.lastWrong.includes(c) && item.place[c] < 0 ? ' wrong-back' : ''}`;
    b.dataset.card = String(c);
    const text = q.cards[item.order[c]].text;
    b.innerHTML = `${esc(text)}${selected ? '<span class="chip-state">已選</span>' : ''}${item.locked[c] ? '<span class="chip-state">✓</span>' : ''}${item.lastWrong.includes(c) && item.place[c] < 0 ? '<span class="chip-state">✕</span>' : ''}`;
    return b;
  };
  // 待放的卡片放在類別上方，檢查後退回的卡片一定看得到。
  if (!item.done) {
    item.place.forEach((p, c) => {
      if (p < 0) pool.appendChild(chip(c));
    });
    els.work.appendChild(pool);
  }
  const bins = document.createElement('div');
  bins.className = 'bins';
  q.bins.forEach((name, bin) => {
    const box = document.createElement('div');
    box.className = `bin${app.selectedCard >= 0 ? ' target' : ''}`;
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'bin-head';
    head.dataset.bin = String(bin);
    head.textContent = name;
    head.setAttribute('aria-label', `放進「${name}」`);
    box.appendChild(head);
    item.place.forEach((p, c) => {
      if (p === bin) box.appendChild(chip(c));
    });
    bins.appendChild(box);
  });
  els.work.appendChild(bins);
}

/** 重繪遊戲畫面。 */
function render() {
  const s = app.state;
  if (!s) return;
  const cfg = DIFFICULTIES[s.difficulty];
  const item = currentItem(s);
  els.gameDifficulty.textContent = cfg.label;
  els.progress.textContent = `${Math.min(s.index + 1, s.items.length)} / ${s.items.length}`;
  els.mistakes.textContent = `答錯 ${s.mistakes}`;
  renderTimer();
  els.playArea.classList.toggle('covered', app.paused);
  els.work.innerHTML = '';
  if (!item) {
    els.nextBtn.hidden = true;
    els.checkBtn.hidden = true;
    return;
  }
  const q = lookup(item.id);
  const unitTitle = app.bank.unit(q.unit) ? app.bank.unit(q.unit).title : '';
  els.topic.innerHTML = `第 ${s.index + 1} 題・${MODE_LABEL[s.mode]}・<span class="tag" data-topic="${q.topic}">${TOPIC_INFO[q.topic].icon} ${esc(unitTitle)}</span>・${TYPE_LABEL[q.type]}${q.result ? '・🔬 預測實驗' : ''}`;
  els.question.textContent = q.question;
  renderHints(item, q);
  els.result.hidden = !(item.done && q.result);
  els.resultText.textContent = item.done && q.result ? q.result : '';
  els.explain.hidden = !item.done;
  els.explainText.textContent = item.done ? q.explain : '';
  const c = item.done ? app.bank.card(q.card) : null;
  els.card.hidden = !c;
  els.card.innerHTML = c ? cardHtml(c, s.newCards.includes(c.id)) : '';
  if (q.type === 'choice') renderChoices(item, q);
  else if (q.type === 'order') renderOrder(item, q);
  else renderSort(item, q);
  const left = hintsLeft(s);
  els.hintCount.textContent = String(left);
  els.hintBtn.setAttribute('aria-disabled', String(left === 0 || item.done || item.keysShown >= 2));
  els.hintBtn.setAttribute('aria-label', `解題重點，剩餘 ${left} 次`);
  els.hintBtn.hidden = item.done;
  els.pauseBtn.hidden = item.done;
  els.checkBtn.hidden = item.done || q.type === 'choice';
  els.checkBtn.setAttribute('aria-disabled', String(!canCheck(item)));
  els.nextBtn.hidden = !item.done;
  els.nextBtn.textContent = s.index === s.items.length - 1 ? '完成 ›' : '下一題 ›';
  renderMessage();
}

/** 更新訊息列：暫時訊息優先，否則顯示作答說明。 */
function renderMessage() {
  const s = app.state;
  let text = app.message;
  if (!text && s && !app.paused && !isOver(s)) {
    const item = currentItem(s);
    if (!item.done && item.type === 'choice' && !item.picked.length) text = '選一個你覺得對的答案';
  }
  els.message.textContent = text;
}

/** 更新首頁的「繼續遊戲」、主題選取與休息提醒按鈕。 */
function renderHome() {
  const s = app.state && !isOver(app.state) ? app.state : store.loadSave(lookup).state;
  if (s && !isOver(s)) {
    const elapsed = app.state === s ? currentElapsed() : s.elapsedMs;
    els.continueDetail.textContent = `${scopeText(s)} · 第 ${s.index + 1} / ${s.items.length} 題 · ${formatTime(elapsed)}`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
  renderStage();
  renderRestButton();
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
  els.stageList.addEventListener('click', (e) => {
    const b = e.target.closest('.stage-tab');
    if (b) selectStage(b.dataset.stage);
  });
  els.unitMap.addEventListener('click', (e) => {
    const b = e.target.closest('.unit-btn');
    if (b) openUnit(b.dataset.unit);
  });
  els.todayBtn.addEventListener('click', () => startNewGame({ difficulty: app.settings.stage, mode: 'review' }));
  els.mixedBtn.addEventListener('click', () => startNewGame({ difficulty: app.settings.stage, mode: 'mixed' }));
  els.cardsBtn.addEventListener('click', openCards);
  els.reviewBtn.addEventListener('click', openReview);
  els.rulesBtn.addEventListener('click', openRules);
  els.statsBtn.addEventListener('click', openStats);
  els.restBtn.addEventListener('click', toggleRest);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.work.addEventListener('click', (e) => {
    const choice = e.target.closest('.choice');
    if (choice) return onChoose(Number(choice.dataset.slot));
    const slot = e.target.closest('.slot');
    if (slot) return onUnplaceOrder(Number(slot.dataset.slot));
    const head = e.target.closest('.bin-head');
    if (head) return onPickBin(Number(head.dataset.bin));
    const chip = e.target.closest('.chip');
    if (chip && chip.dataset.display !== undefined) return onPlaceOrder(Number(chip.dataset.display));
    if (chip && chip.dataset.card !== undefined) return onPickCard(Number(chip.dataset.card));
    return undefined;
  });
  els.hintBtn.addEventListener('click', onHint);
  els.pauseBtn.addEventListener('click', () => pauseGame());
  els.checkBtn.addEventListener('click', onCheck);
  els.nextBtn.addEventListener('click', onNext);
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

/**
 * 載入題庫、科學卡與單元（隨 Service Worker 離線快取）。
 * @returns {Promise<boolean>} 是否載入成功。
 */
async function loadBank() {
  try {
    const [qr, cr, ur] = await Promise.all([fetch('data/questions.json'), fetch('data/cards.json'), fetch('data/units.json')]);
    if (!qr.ok || !cr.ok || !ur.ok) throw new Error('題庫下載失敗');
    app.bank = createBank(await qr.json(), await cr.json(), await ur.json());
    return app.bank.questions.length > 0;
  } catch {
    return false;
  }
}

/** 啟動程式。 */
async function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('science');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  buildHomeButtons();
  bindEvents();
  if (history.state && history.state.screen === 'game') history.replaceState(null, '');
  setupPortalLink();
  setupServiceWorker();
  const notices = [];
  if (!store.storageAvailable()) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  const loaded = await loadBank();
  if (!loaded) notices.push('題庫無法載入，請連網後重新開啟。');
  // 題庫沒載入時無法驗證存檔，保留存檔不刪除。
  const saved = loaded ? store.loadSave(lookup) : { status: 'none' };
  if (saved.status === 'corrupt') {
    store.clearSave();
    notices.push('先前的遊戲進度資料損毀（或題庫已更新），已無法恢復，請開始新局。');
  }
  if (isIosBrowserTab()) {
    notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟：主畫面 App 與 Safari 的進度互不相通，只在 Safari 中玩時，7 天未使用可能被清除資料。');
  }
  showHomeNotice(notices);
  showHome();
}

init();
