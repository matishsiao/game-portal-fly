// 主程式：畫面切換、作答與解題重點、詳解、完成畫面、待練習、休息提醒、計時、Service Worker 與離線狀態。

import {
  DIFFICULTIES, DIFFICULTY_KEYS, createGame, restartGame, isOver, currentItem, hintsLeft, choose, showKey, nextQuestion, itemResult, isPerfect,
} from './game.js';
import { createBank, TOPIC_LABEL } from './writing/bank.js';
import { pickRound } from './writing/pick.js';
import * as rest from './rest.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';

/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 3000;
/** 選項的顯示代號。 */
const LETTERS = ['A', 'B', 'C', 'D'];

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
  keys: $('keys'),
  keysList: $('keys-list'),
  keysExtra: $('keys-extra'),
  explain: $('explain'),
  explainText: $('explain-text'),
  message: $('game-message'),
  choices: $('choices'),
  pauseCover: $('pause-cover'),
  pauseTitle: $('pause-title'),
  pauseSub: $('pause-sub'),
  resumeBtn: $('resume-btn'),
  hintBtn: $('hint-btn'),
  hintCount: $('hint-count'),
  pauseBtn: $('pause-btn'),
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
  bank: createBank(null),
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
  app.paused = false;
  clearMessage();
}

/**
 * 開始指定難度的新局；目前有進度時先確認。依題目紀錄挑出 10 題。
 * @param {string} difficulty 難度代碼。
 * @param {{skipConfirm?: boolean}} [options] 選項。
 */
async function startNewGame(difficulty, { skipConfirm = false } = {}) {
  if (!app.bank.questions.length) {
    showHomeNotice(['題庫尚未載入，請連網後重新開啟。']);
    return;
  }
  if (!skipConfirm && hasTouchedGame()) {
    const ok = await confirmDialog('開始新局？', '目前這一局的進度會被清除。', '開始新局');
    if (!ok) return;
  }
  if (app.running) stopTimer();
  const ids = pickRound({ difficulty, questions: app.bank.questions, record: store.loadRecord() });
  setState(createGame({ difficulty, ids }));
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
 * 暫停遊戲並遮住題目、解題重點與選項。
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

/** 重開本局（同一組題目與選項順序）；有進度時先確認。 */
async function restartCurrent() {
  if (!app.state) return;
  if (app.state.touched) {
    const ok = await confirmDialog('重開本局？', '會清除這一局的作答紀錄（題目不變），耗時、答錯次數與解題重點次數也會重設。', '重開本局');
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
 * 題目、正確答案、解題重點與詳解的 HTML（完成畫面與待練習使用）。
 * @param {object} q 題目。
 * @returns {string} HTML。
 */
function questionDetailHtml(q) {
  return `<p class="detail-q">${esc(q.question)}</p>
    <p><b>答案：</b>${esc(q.choices[q.answer])}</p>
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
  const rewardHtml = rewards.length
    ? `<p class="reward-got">🎁 獲得口袋地城獎勵：${rewards.map(esc).join('、')}</p>`
    : '';
  const list = s.items
    .map((it, k) => {
      const q = lookup(it.id);
      return `<details class="result-item"><summary><span>第 ${k + 1} 題・${esc(TOPIC_LABEL[q.topic] || '')}</span><span class="result-tag${itemResult(it).clean ? ' clean' : ''}">${resultLabel(it)}</span></summary>${questionDetailHtml(q)}</details>`;
    })
    .join('');
  const choice = await openModal({
    title: perfect ? '太厲害了，全部一次答對！' : '完成了！',
    html: `${badges ? `<p>${badges}</p>` : ''}${rewardHtml}
      <dl class="result-list">
        <dt>難度</dt><dd>${cfg.label}</dd>
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>答錯次數</dt><dd>${s.mistakes}</dd>
        <dt>看解題重點</dt><dd>${s.hintsUsed} / ${cfg.hints}</dd>
      </dl>
      <h3 class="result-head">每題結果（點開看詳解）</h3>${list}`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'stay',
  });
  if (choice === 'again') startNewGame(s.difficulty, { skipConfirm: true });
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
 * 點選選項作答。
 * @param {number} slot 顯示位置（0～3）。
 */
function onChoose(slot) {
  if (!canPlay()) return;
  const item = currentItem(app.state);
  const q = lookup(item.id);
  const r = choose(app.state, slot, q.answer);
  if (r.result === 'ignored') return;
  if (r.result === 'correct') {
    store.markResult(item.id, itemResult(item).clean);
    clearMessage();
  } else if (r.lastOne) {
    showMessage('再想一想！只剩下一個選項了');
  } else {
    showMessage(r.newKey ? '再想一想！看看上面的解題重點' : '再想一想！把解題重點再讀一次');
  }
  persist();
  render();
  revealInSheet(r.result === 'correct' ? els.explain : els.keys);
  if (r.result === 'correct') els.nextBtn.focus({ preventScroll: true });
}

/**
 * 把新出現的解題重點或詳解捲進作答區的可見範圍（只捲動作答區，不捲動整頁）。
 * @param {HTMLElement} box 要顯示的區塊。
 */
function revealInSheet(box) {
  if (box.hidden) return;
  const sheet = els.sheet;
  const bottom = box.offsetTop - sheet.offsetTop + box.offsetHeight;
  if (bottom > sheet.scrollTop + sheet.clientHeight) sheet.scrollTop = Math.max(0, bottom - sheet.clientHeight + 4);
}

/** 主動查看下一段解題重點。 */
function onHint() {
  if (!canPlay()) return;
  const r = showKey(app.state);
  if (r === 'no-quota') showMessage(`這一局的解題重點用完了（每局 ${DIFFICULTIES[app.state.difficulty].hints} 次）；答錯時還是會顯示`);
  else if (r === 'all-shown') showMessage('這一題的解題重點都已經顯示了');
  else if (r === 'shown') {
    clearMessage();
    persist();
    render();
    revealInSheet(els.keys);
  }
}

/** 進入下一題；最後一題後完成本局。連續遊玩夠久時先提醒休息。 */
function onNext() {
  if (!canPlay() || !nextQuestion(app.state)) return;
  if (isOver(app.state)) {
    finishGame();
    return;
  }
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
  let handled = true;
  if (/^[1-4]$/.test(key)) onChoose(Number(key) - 1);
  else if (['a', 'b', 'c', 'd'].includes(key)) onChoose(key.charCodeAt(0) - 97);
  else if (key === 'enter') onNext();
  else if (key === 'h') onHint();
  else if (key === 'p' || key === 'escape') pauseGame();
  else handled = false;
  if (handled) e.preventDefault();
}

/** 顯示寫作方法與修改前後對照，內容為原創教學示例。 */
function openCards() {
  openModal({ title: '寫作小卡', html: `
    <details open><summary>把心情變成動作</summary><p>原句：我很緊張。</p><p>修改：我捏著衣角，遲遲不敢走上臺。</p><p>試著讓動作透露心情，也可搭配直接抒情。</p></details>
    <details><summary>用五感留下細節</summary><p>原句：早餐很好吃。</p><p>修改：咬開酥脆的吐司，溫熱的奶油香在嘴裡散開。</p><p>選擇有助表達感受的細節，不必一次用完五感。</p></details>
    <details><summary>讓材料回應題目</summary><p>題目：一次難忘的合作。</p><p>材料：我和同學分工搭橋，橋倒了以後，我們一起調整支架。</p><p>說清楚誰與誰合作、如何合作，以及你的體會。</p></details>
    <details><summary>讓首尾互相照應</summary><p>開頭：我一直不敢舉手。</p><p>結尾：這一次，我終於舉起了手。</p><p>回應開頭留下的問題，呈現經歷帶來的改變。</p></details>
    <details><summary>用事例支持觀點</summary><p>觀點：練習方法需要調整。</p><p>事例：我改成每天整理錯題後，比只反覆做新題更能發現盲點。</p><p>接著解釋事例如何支持觀點，避免由一次經驗推論所有人。</p></details>`,
    actions: [{ label: '關閉', value: null }] });
}

/** 開啟自由選寫並逐次保存；草稿不計分，也不影響闖關進度。 */
async function openWorkshop() {
  const result = openModal({ title: '換你寫寫看', html: `
    <p>選寫題目：「那一次，我有了不同的想法」。也可以自訂題目。</p>
    <p>初級：1～3 句；中級：80～150 字；高級：200～350 字；進階：350～600 字。份量供參考，不計分。</p>
    <label for="writing-draft">我的草稿（最多 6000 字元）</label>
    <textarea id="writing-draft" maxlength="6000" rows="10" placeholder="寫下你想說的故事……"></textarea>
    <p id="draft-status" role="status"></p>
    <p>自我檢查：有回應題目嗎？有具體細節或事例嗎？順序清楚嗎？結尾有呼應主題嗎？</p>
    <p>草稿只保存在這台裝置，不會上傳，也不會自動評分。</p>`,
    actions: [{ label: '清除草稿', value: 'clear', className: 'danger' }, { label: '完成', value: null }] });
  const field = $('writing-draft');
  field.value = store.loadDraft();
  /** 立即保存最新輸入，並告知持久儲存是否成功。 */
  field.addEventListener('input', () => {
    $('draft-status').textContent = store.saveDraft(field.value) ? '草稿已儲存。' : '目前無法儲存，關閉後草稿可能遺失，請先複製保留。';
  });
  if (await result === 'clear') {
    if (await confirmDialog('清除草稿？', '草稿清除後無法復原。', '清除')) store.saveDraft('');
    openWorkshop();
  }
}

// ---------- 選單、統計、待練習與說明 ----------

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
      menu: DIFFICULTY_KEYS.map((key) => ({ label: `${DIFFICULTIES[key].label}（${DIFFICULTIES[key].grade}）`, value: key })),
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
    return `<tr><td>${DIFFICULTIES[key].label}</td><td>${s.started}</td><td>${s.completed}</td><td>${best}</td><td>${avg}</td><td>${s.noHint}</td></tr>`;
  }).join('');
  const practiced = store.practicedCount(lookup);
  const choice = await openModal({
    title: '統計',
    html: `<div style="overflow-x:auto"><table class="stats-table">
      <thead><tr><th>難度</th><th>開局</th><th>完成</th><th>最佳</th><th>平均</th><th>全對</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      <p style="margin-top:10px">題庫已練習 ${practiced} / ${app.bank.questions.length} 題（功能原型，題庫持續擴充中）。</p>
      <p style="font-size:14px">統計只存在這台裝置。「全對」是沒答錯、也沒看解題重點完成的局數。重設統計不會清除待練習。</p>`,
    actions: [
      { label: '重設統計', value: 'reset', className: 'danger' },
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'reset' && (await confirmDialog('重設統計？', '所有難度的統計都會歸零，無法復原（待練習會保留）。', '重設'))) {
    store.resetStats();
    openStats();
  }
}

/** 顯示待練習：待複習的題目依難度分組，可直接看答案與詳解。 */
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
    title: `待練習（${ids.length} 題）`,
    html,
    actions: [
      ...(ids.length ? [{ label: '清除待練習', value: 'clear', className: 'danger' }] : []),
      { label: '關閉', value: null, className: 'primary' },
    ],
  });
  if (choice === 'clear' && (await confirmDialog('清除待練習？', '所有待複習的題目都會移出待練習，無法復原。', '清除'))) {
    store.clearReview();
    openReview();
  }
}

/** 顯示玩法說明。 */
function openRules() {
  openModal({
    title: '玩法',
    html: `<p>每局 10 題寫作選擇題，點選你覺得對的答案。</p>
      <ul>
        <li><b>答錯了沒關係</b>：選錯的選項會打 ✕，下面會出現「💡 解題重點」，教你怎麼想。照著想一想，再選一次。</li>
        <li>每題都要答對才會到下一題。答對後會看到完整的詳解。</li>
        <li>還沒作答也可以按「解題重點」先看提示，但每局次數有限。</li>
        <li><b>全對</b>：10 題都沒答錯、也沒看解題重點。</li>
      </ul>
      <p>🎁 每個難度第一次過關、第一次全對，都可以到「口袋地城」領獎勵禮包；每天過關一局還能領入場卷。</p>
      <p>答錯或看過解題重點的題目會放進「待練習」，可以隨時複習。</p>
      <p>👀 連續玩 20 分鐘會提醒你看看遠方休息一下（可在首頁關閉）。</p>
      <p><b>電腦鍵盤</b>：1～4 或 A～D 選答案、Enter 下一題、H 解題重點、P 或 Esc 暫停。</p>`,
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
    b.innerHTML = `${cfg.label}<small>${cfg.grade}</small>`;
    els.difficultyList.appendChild(b);
  }
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
  if (!item) {
    els.choices.innerHTML = '';
    els.nextBtn.hidden = true;
    return;
  }
  const q = lookup(item.id);
  els.topic.textContent = `第 ${s.index + 1} 題・${TOPIC_LABEL[q.topic] || ''}`;
  els.question.textContent = q.question;
  // 解題重點：答錯或主動查看後依序顯示；只剩一個選項時加上提醒（不標示正解）。
  els.keys.hidden = item.keysShown === 0 && !(item.picked.length === 3 && !item.done);
  els.keysList.innerHTML = q.keys.slice(0, item.keysShown).map((k) => `<li>${esc(k)}</li>`).join('');
  const lastOne = !item.done && item.picked.length === 3;
  els.keysExtra.hidden = !lastOne;
  els.keysExtra.textContent = lastOne ? '只剩下一個選項了，想一想它為什麼是對的，再點點看。' : '';
  els.explain.hidden = !item.done;
  els.explainText.textContent = item.done ? q.explain : '';
  els.choices.innerHTML = '';
  item.order.forEach((choiceIndex, slot) => {
    const picked = item.picked.includes(slot);
    const correct = picked && choiceIndex === q.answer;
    const wrong = picked && !correct;
    // 答對後只留下正確選項，讓出空間顯示詳解。
    if (item.done && !correct) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice';
    b.dataset.slot = String(slot);
    if (wrong) b.classList.add('wrong');
    if (correct) b.classList.add('correct');
    b.disabled = wrong || item.done;
    b.innerHTML = `<span class="choice-letter">${LETTERS[slot]}</span><span class="choice-text">${esc(q.choices[choiceIndex])}</span><span class="choice-mark" aria-hidden="true">${correct ? '✓' : wrong ? '✕' : ''}</span>`;
    b.setAttribute('aria-label', `${LETTERS[slot]}：${q.choices[choiceIndex]}${correct ? '，答對了' : wrong ? '，不對' : ''}`);
    els.choices.appendChild(b);
  });
  const left = hintsLeft(s);
  els.hintCount.textContent = String(left);
  els.hintBtn.setAttribute('aria-disabled', String(left === 0 || item.done || item.keysShown >= 2));
  els.hintBtn.setAttribute('aria-label', `解題重點，剩餘 ${left} 次`);
  els.hintBtn.hidden = item.done;
  els.pauseBtn.hidden = item.done;
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
    text = item.done ? '' : item.picked.length ? '' : '選一個你覺得對的答案';
  }
  els.message.textContent = text;
}

/** 更新首頁的「繼續遊戲」。 */
function renderHome() {
  const s = app.state && !isOver(app.state) ? app.state : store.loadSave(lookup).state;
  if (s && !isOver(s)) {
    const cfg = DIFFICULTIES[s.difficulty];
    const elapsed = app.state === s ? currentElapsed() : s.elapsedMs;
    els.continueDetail.textContent = `${cfg.label} · 第 ${s.index + 1} / ${s.items.length} 題 · ${formatTime(elapsed)}`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
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
  els.difficultyList.addEventListener('click', (e) => {
    const b = e.target.closest('.difficulty-btn');
    if (b) startNewGame(b.dataset.difficulty);
  });
  els.reviewBtn.addEventListener('click', openReview);
  $('cards-btn').addEventListener('click', openCards);
  $('workshop-btn').addEventListener('click', openWorkshop);
  els.rulesBtn.addEventListener('click', openRules);
  els.statsBtn.addEventListener('click', openStats);
  els.restBtn.addEventListener('click', toggleRest);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.choices.addEventListener('click', (e) => {
    const b = e.target.closest('.choice');
    if (b) onChoose(Number(b.dataset.slot));
  });
  els.hintBtn.addEventListener('click', onHint);
  els.pauseBtn.addEventListener('click', () => pauseGame());
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
  // 草稿區保留原生選取、複製與貼上選單。
  document.addEventListener('contextmenu', (e) => {
    if (!(e.target instanceof HTMLTextAreaElement)) e.preventDefault();
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

/**
 * 載入固定題庫（隨 Service Worker 離線快取）。
 * @returns {Promise<boolean>} 是否載入成功。
 */
async function loadBank() {
  try {
    const res = await fetch('data/questions.json');
    if (!res.ok) throw new Error(String(res.status));
    app.bank = createBank(await res.json());
    return app.bank.questions.length > 0;
  } catch {
    return false;
  }
}

/** 啟動程式。 */
async function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('writing');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  buildDifficultyButtons();
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
