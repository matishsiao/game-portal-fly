// 主程式：首頁 Level 選擇、拼字畫面、單字卡、單字本、統計、計時、發音、離線狀態與更新。

import { DIFFICULTIES, DIFFICULTY_KEYS, RECOMMENDED, REVIEW, generateRound, meaningIndex, relatedWords, samePos, lettersOf } from './deck.js';
import {
  createGame, restartGame, currentItem, usedTiles, isFull, placeTile, removeAt, backspace, clearSlots, checkAnswer, useHint, hintsLeft,
  nextWord, isLastWord, applyWordToBook,
} from './game.js';
import { LEVELS, LEVEL_DESC, loadLexicon, blankExample } from './lexicon.js';
import { initSpeech, speechAvailable, speak, voiceOptions, currentVoiceName, configureSpeech } from './speech.js';
import * as store from './storage.js';
import { trackPlay, guardFreeze } from './playlog.js';

/** 暫時訊息顯示時間（毫秒）。 */
const MESSAGE_MS = 2200;
/** 拼錯時錯誤字母標紅後退回的時間（毫秒）。 */
const WRONG_MS = 800;
/** 拼對後自動發音的延遲（毫秒），讓完成效果先出現。 */
const AUTO_SPEAK_DELAY_MS = 250;

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
  toast: $('toast'),
  continueBtn: $('continue-btn'),
  continueDetail: $('continue-detail'),
  learnedCount: $('learned-count'),
  totalCount: $('total-count'),
  reviewBtn: $('review-btn'),
  reviewCount: $('review-count'),
  levelGrid: $('level-grid'),
  portalLink: $('portal-link'),
  bookBtn: $('book-btn'),
  statsBtn: $('stats-btn'),
  rulesBtn: $('rules-btn'),
  settingsBtn: $('settings-btn'),
  homeBtn: $('home-btn'),
  menuBtn: $('menu-btn'),
  gameTitle: $('game-title'),
  wordProgress: $('word-progress'),
  timer: $('timer'),
  mistakes: $('mistakes'),
  clueZh: $('clue-zh'),
  cluePos: $('clue-pos'),
  clueSpeak: $('clue-speak'),
  clueExample: $('clue-example'),
  slots: $('slots'),
  tiles: $('tiles'),
  solvedCard: $('solved-card'),
  pauseCover: $('pause-cover'),
  resumeBtn: $('resume-btn'),
  message: $('game-message'),
  tools: $('tools'),
  backBtn: $('back-btn'),
  clearBtn: $('clear-btn'),
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

/** 詞庫（載入後填入）。 */
let WORDS = [];
/** 依 id 取得單字。 */
let wordById = new Map();
/** 中文意思索引（找同義字）。 */
let index = new Map();

/** 執行期狀態。 */
const app = {
  screen: 'home',
  state: null,
  running: false,
  segmentStart: 0,
  tickTimer: 0,
  paused: false,
  wrong: null,
  wrongTimer: 0,
  messageTimer: 0,
  lastAlt: null,
  settings: store.loadSettings(),
  registration: null,
  updateRequested: false,
  modalResolve: null,
};

/**
 * 依 id 取得單字（不存在時為 undefined）。
 * @param {string} id 單字 id。
 * @returns {object | undefined} 單字。
 */
const getWord = (id) => wordById.get(id);

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
 * 出題範圍的顯示名稱。
 * @param {number | 'review'} range Level 或待複習。
 * @returns {string} 名稱。
 */
function rangeName(range) {
  return range === REVIEW ? '待複習' : `Level ${range}`;
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

// ---------- 主題與發音 ----------

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
 * 是否提供發音（設定開啟且裝置有英文語音）。
 * @returns {boolean} 提供時為 true。
 */
function speechOn() {
  return app.settings.speech && speechAvailable();
}

/**
 * 產生發音按鈕的 HTML（不可用時為空字串）。
 * @param {string} text 要唸的英文。
 * @param {string} [label] 無障礙標籤。
 * @returns {string} HTML。
 */
function speakButton(text, label = `唸出 ${text}`) {
  if (!speechOn()) return '';
  return `<button type="button" class="speak-btn" data-speak="${esc(text)}" aria-label="${esc(label)}">🔊</button>`;
}

/** 本次開啟後是否已顯示過靜音提示。 */
let muteHintShown = false;
let toastTimer = 0;

/**
 * 在畫面下方短暫顯示提示，不阻擋操作。
 * @param {string} text 提示文字。
 * @param {number} [ms=4500] 顯示時間（毫秒）。
 */
function showToast(text, ms = 4500) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.hidden = true;
  }, ms);
}

/**
 * 唸出英文；在 iPhone／iPad 上，每次開啟後第一次發音時提示靜音開關。
 * @param {string} text 英文。
 */
function sayWord(text) {
  if (!speechOn()) return;
  speak(text);
  if (isIos() && !muteHintShown) {
    muteHintShown = true;
    showToast('🔇 沒聽到聲音？請關閉 iPhone 的靜音模式並調高音量。');
  }
}

/**
 * 讓容器內的發音按鈕可點按。
 * @param {HTMLElement} root 容器。
 */
function bindSpeakButtons(root) {
  root.querySelectorAll('[data-speak]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      sayWord(b.dataset.speak);
    });
  });
}

/**
 * 產生一張單字卡的 HTML：英文與發音、詞性、Level、中文、例句（該字以粗體標示、可發音）與翻譯。
 * @param {object} w 單字。
 * @param {string} [mark=''] 附加標記（例如「待複習」）。
 * @returns {string} HTML。
 */
function wordCardHtml(w, mark = '') {
  const form = w.form || w.en;
  const ex = esc(w.example);
  const re = new RegExp(`(^|[^A-Za-z])(${esc(form).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=[^A-Za-z]|$)`, 'i');
  const highlighted = re.test(ex) ? ex.replace(re, '$1<b>$2</b>') : ex;
  return `<div class="word-card">
    <div class="word-head"><span class="word-en">${esc(w.en)}</span>${speakButton(w.en)}<span class="word-pos">${esc(w.pos)}</span><span class="word-level">L${w.level}</span>${mark ? `<span class="word-mark">${esc(mark)}</span>` : ''}</div>
    <p class="word-zh">${esc(w.zh)}</p>
    <p class="word-example">${highlighted}${speakButton(w.example, '唸出例句')}</p>
    <p class="word-example-zh">${esc(w.exampleZh)}</p>
  </div>`;
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
    b.innerHTML = item.label;
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
      { label: esc(okLabel), value: true, className: 'danger' },
    ],
    dismissValue: false,
  });
  return v === true;
}

// ---------- 首頁 ----------

/** 繪製首頁：學習進度、待複習與各 Level 卡片。 */
function renderHome() {
  const book = store.loadBook();
  const learned = WORDS.filter((w) => book[w.id] && book[w.id].learned).length;
  const review = WORDS.filter((w) => book[w.id] && book[w.id].review).length;
  els.learnedCount.textContent = String(learned);
  els.totalCount.textContent = String(WORDS.length);
  els.reviewCount.textContent = String(review);
  els.reviewCount.hidden = review === 0;
  els.levelGrid.innerHTML = '';
  for (const lv of LEVELS) {
    const ws = WORDS.filter((w) => w.level === lv);
    const done = ws.filter((w) => book[w.id] && book[w.id].learned).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'level-card';
    b.dataset.level = String(lv);
    b.disabled = ws.length === 0;
    b.innerHTML = `<span class="level-num">Level ${lv}</span>
      <span class="level-desc">${esc(LEVEL_DESC[lv])}・推薦${DIFFICULTIES[RECOMMENDED[lv]].label}</span>
      <span class="level-sub">${done} / ${ws.length}</span>
      <span class="mini-bar"><span style="width:${ws.length ? (done / ws.length) * 100 : 0}%"></span></span>`;
    b.addEventListener('click', () => chooseDifficulty(lv));
    els.levelGrid.appendChild(b);
  }
  const saved = app.state && !app.state.completed ? app.state : store.loadSave(getWord).state;
  if (saved && !saved.completed) {
    els.continueDetail.textContent = `${rangeName(saved.range)}・${DIFFICULTIES[saved.difficulty].label}・第 ${saved.index + 1} / ${saved.items.length} 個`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
}

/**
 * 選擇難度後開始新局；推薦的難度排第一並標示。
 * @param {number | 'review'} range Level 或待複習。
 */
async function chooseDifficulty(range) {
  const recommended = range === REVIEW ? null : RECOMMENDED[range];
  const keys = recommended ? [recommended, ...DIFFICULTY_KEYS.filter((k) => k !== recommended)] : DIFFICULTY_KEYS;
  const wait = openModal({
    title: `${rangeName(range)}：選擇難度`,
    html: `<div class="difficulty-list">${keys.map((k) => {
      const d = DIFFICULTIES[k];
      const parts = [d.firstLetter ? '首字母已填好' : '', d.decoys ? `多 ${d.decoys} 個干擾字母` : '沒有干擾字母', `提示 ${d.hints} 次`].filter(Boolean);
      return `<button type="button" class="difficulty-btn${k === recommended ? ' recommended' : ''}" data-difficulty="${k}">${d.label}${k === recommended ? '<em>推薦</em>' : ''}<small>${parts.join('・')}</small></button>`;
    }).join('')}</div>`,
    actions: [{ label: '取消', value: null }],
  });
  els.modalBody.querySelectorAll('.difficulty-btn').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.difficulty)));
  const difficulty = await wait;
  if (difficulty) startNewGame(range, difficulty);
}

// ---------- 遊戲流程 ----------

/**
 * 開始新局（目前有已操作過的一局時先確認）。
 * @param {number | 'review'} range Level 或待複習。
 * @param {string} difficulty 難度代碼。
 */
async function startNewGame(range, difficulty) {
  const existing = app.state && !app.state.completed ? app.state : store.loadSave(getWord).state;
  if (existing && existing.touched && !existing.completed) {
    if (!(await confirmDialog('開始新局？', '目前這一局的進度會被清除。', '開始新局'))) return;
  }
  let round;
  try {
    round = generateRound(WORDS, { range, difficulty, book: store.loadBook(), recent: store.loadRecent(), index });
  } catch {
    await openModal({ title: '單字不足', html: '<p>這個範圍的單字還不夠組成一局，請改選其他 Level。</p>', actions: [{ label: '好', value: null, className: 'primary' }] });
    return;
  }
  if (app.running) stopTimer(false);
  app.state = createGame({ range, difficulty, items: round.items }, getWord);
  app.paused = false;
  store.recordStart(difficulty);
  store.addRecent(round.items.map((it) => it.id));
  persist();
  enterGame();
  if (round.widened) showMessage(range === REVIEW ? '待複習的單字不夠，已加入同 Level 的單字' : '符合長度的單字不夠，已放寬條件');
}

/** 從存檔繼續。 */
function continueGame() {
  if (!app.state) {
    const saved = store.loadSave(getWord);
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
  renderGame();
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
  clearWrong();
  app.paused = false;
  app.screen = 'home';
  els.game.hidden = true;
  els.home.hidden = false;
  renderHome();
}

/** 暫停並遮住題目與字母。 */
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
  if (app.state.touched && !(await confirmDialog('重開本局？', '會回到第一個單字，錯誤次數、耗時與提示次數都會重設。', '重開本局'))) return;
  stopTimer(false);
  clearWrong();
  app.state = restartGame(app.state, getWord);
  persist();
  renderGame();
  startTimer();
}

// ---------- 拼字畫面 ----------

/**
 * 目前的單字。
 * @returns {object} 單字。
 */
function currentWord() {
  return getWord(currentItem(app.state).id);
}

/**
 * 可接受的其他答案：中文意思與詞性都相同、字母數也相同的單字。
 * @param {object} w 本題單字。
 * @returns {object[]} 其他單字。
 */
function alternativesOf(w) {
  const n = lettersOf(w.en).length;
  return relatedWords(w, index).filter((x) => samePos(x, w) && lettersOf(x.en).length === n);
}

/** 重繪整個拼字畫面。 */
function renderGame() {
  const s = app.state;
  const w = currentWord();
  const d = DIFFICULTIES[s.difficulty];
  els.gameTitle.textContent = `${rangeName(s.range)}・${d.label}`;
  els.wordProgress.textContent = `${s.index + 1} / ${s.items.length}`;
  els.mistakes.textContent = `錯誤 ${s.mistakes}`;
  els.clueZh.textContent = w.zh;
  els.cluePos.textContent = w.pos;
  els.clueSpeak.hidden = !speechOn();
  els.clueExample.textContent = s.solved ? w.example : blankExample(w);
  renderSlots();
  renderTiles();
  const left = hintsLeft(s);
  els.hintCount.textContent = String(left);
  els.hintBtn.classList.toggle('empty', left <= 0);
  els.tools.hidden = s.solved;
  els.tiles.hidden = s.solved;
  els.nextBtn.hidden = !s.solved;
  els.nextBtn.textContent = isLastWord(s) ? '完成這一局' : '下一個';
  els.solvedCard.hidden = !s.solved;
  if (s.solved) {
    const alt = app.lastAlt;
    els.solvedCard.innerHTML = `${alt ? `<p class="alt-note">你拼的 <b>${esc(alt.en)}</b> 也是「${esc(alt.zh)}」，算對！本題的單字是：</p>` : ''}${wordCardHtml(w)}`;
    bindSpeakButtons(els.solvedCard);
  }
}

/** 繪製答案空格（含不用拼的空格、連字號與撇號）。 */
function renderSlots() {
  const s = app.state;
  const w = currentWord();
  const tiles = currentItem(s).tiles;
  const wrong = app.wrong;
  let pos = 0;
  const parts = [];
  for (const ch of w.en) {
    if (!/[A-Za-z]/.test(ch)) {
      parts.push(`<span class="slot fixed" aria-hidden="true">${ch === ' ' ? '' : esc(ch)}</span>`);
      continue;
    }
    const p = pos++;
    const t = s.slots[p];
    const ghost = wrong && wrong.positions.includes(p) ? wrong.letters[p] : null;
    const letter = ghost || (t === null ? '' : tiles[t]);
    const cls = ['slot', t === null && !ghost ? 'empty' : 'filled', s.locks[p] ? 'locked' : '', s.hinted[p] ? 'hinted' : '', ghost ? 'wrong' : '', s.solved ? 'solved' : ''].filter(Boolean).join(' ');
    const label = ghost ? `第 ${p + 1} 個字母 ${letter} 錯誤` : letter ? `第 ${p + 1} 個字母 ${letter}${s.locks[p] ? '（已確定）' : '，點一下退回'}` : `第 ${p + 1} 個空格`;
    parts.push(`<button type="button" class="${cls}" data-slot="${p}" aria-label="${label}">${esc(letter.toUpperCase())}${ghost ? '<i aria-hidden="true">✕</i>' : ''}${s.hinted[p] ? '<i class="hint-mark" aria-hidden="true">💡</i>' : ''}</button>`);
  }
  els.slots.innerHTML = parts.join('');
  els.slots.classList.toggle('long', pos > 10);
  // 超過 10 個字母時平均分成兩行（每格約 33 px 含間距），避免第二行只剩一兩格。
  els.slots.style.maxWidth = pos > 10 ? `${Math.ceil(w.en.length / 2) * 33}px` : '';
  els.slots.classList.toggle('done', s.solved);
}

/** 繪製字母方塊（已使用的方塊保留空位，避免其他方塊移動造成誤點）。 */
function renderTiles() {
  const s = app.state;
  const used = usedTiles(s);
  const tiles = currentItem(s).tiles;
  // 每行最多 7 塊，方塊少時置中排列。
  els.tiles.style.gridTemplateColumns = `repeat(${Math.min(7, Math.ceil(tiles.length / Math.ceil(tiles.length / 7)))}, minmax(0, 46px))`;
  els.tiles.innerHTML = tiles.map((ch, i) => (used.has(i)
    ? `<span class="tile used" aria-hidden="true"></span>`
    : `<button type="button" class="tile" data-tile="${i}" aria-label="字母 ${ch}">${ch.toUpperCase()}</button>`)).join('');
}

/**
 * 顯示短暫訊息。
 * @param {string} text 訊息。
 * @param {string} [kind=''] 樣式（error、success）。
 */
function showMessage(text, kind = '') {
  els.message.textContent = text;
  els.message.className = `game-message${kind ? ` ${kind}` : ''}`;
  clearTimeout(app.messageTimer);
  app.messageTimer = setTimeout(() => {
    els.message.textContent = '';
  }, MESSAGE_MS);
}

/**
 * 目前可以操作拼字（在遊戲畫面、沒有暫停、沒有對話框、這個字還沒拼完）。
 * @returns {boolean} 可以時為 true。
 */
function canPlay() {
  return app.screen === 'game' && app.state && !app.state.completed && !app.paused && els.modal.hidden && !app.state.solved;
}

/** 清除拼錯時的標紅顯示。 */
function clearWrong() {
  clearTimeout(app.wrongTimer);
  app.wrong = null;
}

/**
 * 操作之後：拼錯標示中就先清掉、存檔並重繪；空格填滿時判定。
 */
function afterChange() {
  if (isFull(app.state)) {
    judge();
    return;
  }
  persist();
  renderGame();
}

/**
 * 點字母方塊。
 * @param {number} tile 方塊編號。
 */
function onTile(tile) {
  if (!canPlay()) return;
  if (app.wrong) {
    clearWrong();
    renderSlots();
  }
  if (placeTile(app.state, tile)) afterChange();
}

/**
 * 點空格：退回該字母。
 * @param {number} pos 空格位置。
 */
function onSlot(pos) {
  if (!canPlay()) return;
  if (app.state.locks[pos] && app.state.slots[pos] !== null) {
    showMessage('這個字母已經確定，不能退回');
    return;
  }
  if (removeAt(app.state, pos)) afterChange();
}

/** 退格。 */
function onBackspace() {
  if (!canPlay()) return;
  if (backspace(app.state)) afterChange();
}

/** 清除所有未確定的字母。 */
function onClear() {
  if (!canPlay()) return;
  if (clearSlots(app.state)) afterChange();
}

/** 空格填滿時判定拼字結果。 */
function judge() {
  const w = currentWord();
  const r = checkAnswer(app.state, w, alternativesOf(w));
  if (r.right) {
    onSolved(r.alt);
    return;
  }
  // 拼錯：錯的字母標紅加 ✕，短暫停留後退回。
  app.wrong = { positions: r.wrong, letters: r.letters };
  showMessage(`✕ 拼錯了，綠色的字母位置正確（錯誤 ${app.state.mistakes}）`, 'error');
  persist();
  renderGame();
  clearTimeout(app.wrongTimer);
  app.wrongTimer = setTimeout(() => {
    app.wrong = null;
    if (app.screen === 'game' && app.state) renderSlots();
  }, WRONG_MS);
}

/**
 * 拼對：記入單字本、顯示單字卡，並依設定自動唸一次。
 * @param {object | null} alt 拼出的同義字（沒有時為 null）。
 */
function onSolved(alt) {
  const s = app.state;
  const w = currentWord();
  const book = store.loadBook();
  applyWordToBook(book, w.id, s.flags[w.id], Date.now());
  store.saveBook(book);
  app.lastAlt = alt;
  const flag = s.flags[w.id];
  showMessage(flag && (flag.wrong || flag.hint) ? '✓ 拼對了！這個字放進待複習' : '✓ 拼對了！', 'success');
  persist();
  renderGame();
  if (app.settings.autoSpeak) setTimeout(() => sayWord(w.en), AUTO_SPEAK_DELAY_MS);
}

/** 使用提示。 */
function onHint() {
  if (!canPlay()) return;
  clearWrong();
  const r = useHint(app.state, currentWord());
  if (!r.ok) {
    showMessage(r.message);
    return;
  }
  afterChange();
}

/** 前往下一個單字或完成這一局。 */
function onNext() {
  if (!app.state || !app.state.solved || app.paused || !els.modal.hidden) return;
  app.lastAlt = null;
  if (isLastWord(app.state)) {
    finishRound();
    return;
  }
  nextWord(app.state, getWord);
  persist();
  renderGame();
}

/** 完成一局：結算畫面。 */
async function finishRound() {
  const s = app.state;
  stopTimer(false);
  s.completed = true;
  const { newRecord } = store.recordComplete(s.difficulty, s.elapsedMs, s.hintsUsed);
  store.clearSave();
  const missed = s.items.map((it) => it.id).filter((id) => s.flags[id] && (s.flags[id].wrong || s.flags[id].hint));
  const choice = await openModal({
    title: '完成！',
    html: `${newRecord ? '<p><span class="record-badge">🏆 新紀錄</span></p>' : ''}
      <dl class="result-list">
        <dt>範圍</dt><dd>${esc(rangeName(s.range))}</dd>
        <dt>難度</dt><dd>${DIFFICULTIES[s.difficulty].label}</dd>
        <dt>單字數</dt><dd>${s.items.length} 個</dd>
        <dt>耗時</dt><dd>${formatTime(s.elapsedMs)}</dd>
        <dt>錯誤次數</dt><dd>${s.mistakes}</dd>
        <dt>已用提示</dt><dd>${s.hintsUsed} / ${DIFFICULTIES[s.difficulty].hints}</dd>
      </dl>
      ${missed.length ? `<p class="section-note">待複習的單字（${missed.length}）</p>` : '<p class="section-note">全部沒拼錯、沒用提示，太厲害了！</p>'}
      <div class="word-cards">${s.items.map((it) => wordCardHtml(getWord(it.id), missed.includes(it.id) ? (s.flags[it.id].wrong ? '拼錯' : '提示') : '')).join('')}</div>`,
    actions: [
      { label: '回首頁', value: 'home' },
      { label: '再玩一局', value: 'again', className: 'primary' },
    ],
    dismissValue: 'home',
  });
  if (choice === 'again') startNewGame(s.range, s.difficulty);
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
      { label: '設定', value: 'settings' },
      { label: '回首頁', value: 'home' },
    ],
    actions: [{ label: '關閉', value: null }],
  });
  if (choice === 'restart') restartCurrent();
  else if (choice === 'book') openBook();
  else if (choice === 'settings') openSettings();
  else if (choice === 'home') goHome();
}

/**
 * 單字本：已學會與待複習兩個分頁，可依 Level 篩選與搜尋。
 * @param {'learned' | 'review'} [tab='learned'] 分頁。
 */
async function openBook(tab = 'learned') {
  const book = store.loadBook();
  const learned = WORDS.filter((w) => book[w.id] && book[w.id].learned).length;
  const levels = LEVELS.map((lv) => {
    const ws = WORDS.filter((w) => w.level === lv);
    return `<span class="book-level">L${lv} <b>${ws.filter((w) => book[w.id] && book[w.id].learned).length}</b> / ${ws.length}</span>`;
  }).join('');
  const wait = openModal({
    title: `單字本（已學會 ${learned} / ${WORDS.length}）`,
    html: `<div class="book-levels">${levels}</div>
      <div class="tabs"><button type="button" data-tab="learned">已學會</button><button type="button" data-tab="review">待複習</button></div>
      <div class="book-tools"><input id="book-search" type="search" placeholder="搜尋英文或中文" autocomplete="off"><select id="book-level"><option value="">全部 Level</option>${LEVELS.map((lv) => `<option value="${lv}">Level ${lv}</option>`).join('')}</select></div>
      <div id="book-list" class="book-list"></div>`,
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
  const search = $('book-search');
  const level = $('book-level');
  const list = $('book-list');
  let current = tab;
  /** 依分頁、Level 與搜尋字串重繪清單。 */
  const render = () => {
    els.modalBody.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === current));
    const q = search.value.trim().toLowerCase();
    const rows = WORDS.filter((w) => {
      const b = book[w.id];
      if (!b || !(current === 'learned' ? b.learned : b.review)) return false;
      if (level.value && w.level !== Number(level.value)) return false;
      return !q || w.en.toLowerCase().includes(q) || w.zh.includes(q);
    });
    list.innerHTML = rows.length
      ? rows.slice(0, 300).map((w) => `<button type="button" class="book-row" data-id="${esc(w.id)}"><b>${esc(w.en)}</b><span>${esc(w.zh)}</span></button>`).join('')
      : `<p class="muted">${current === 'learned' ? '還沒有學會的單字，去玩一局吧！' : '目前沒有待複習的單字。'}</p>`;
    list.querySelectorAll('.book-row').forEach((r) => r.addEventListener('click', () => closeModal({ word: r.dataset.id, tab: current })));
  };
  els.modalBody.querySelectorAll('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      current = b.dataset.tab;
      render();
    }),
  );
  search.addEventListener('input', render);
  level.addEventListener('change', render);
  render();
  const choice = await wait;
  if (choice && choice.word) {
    await openModal({ title: '單字卡', html: wordCardHtml(getWord(choice.word)), actions: [{ label: '回單字本', value: null, className: 'primary' }] });
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
      <p class="muted small">統計只存在這台裝置；單字學習進度請看單字本。</p>`,
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
    html: `<p>看中文意思與例句，點下方的字母方塊，把英文單字拼進空格。一局 10 個單字。</p>
      <p>點已經填入的字母可以退回；也可以用「退格」「清除」。</p>
      <p>空格填滿時自動判定：拼錯時，位置正確的字母會變綠留下，錯的字母退回；拼出中文意思相同的其他單字也算對。</p>
      <p>🔊 可以聽單字怎麼唸（不算提示）；拼對時也會自動唸一次（可在設定關閉）。發音使用手機內建的英文語音，離線時能否發音取決於手機是否內建英文語音。</p>
      <p>簡單：首字母已填好。困難與專家：多了不屬於這個字的干擾字母。💡 提示會填入下一個正確的字母。</p>
      <p>拼錯或用了提示的單字會放進「待複習」，之後一次拼對就會移出。</p>
      <p>鍵盤：直接打字母、Backspace 退格、Delete 清除、Enter 下一個、S 唸單字、H 提示、P 暫停。</p>
      <p class="muted small">單字清單：大考中心「高中英文參考詞彙表」（111 學年度起適用），著作權屬財團法人大學入學考試中心基金會，僅供非營利使用。中文意思與例句為本遊戲自行撰寫。</p>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

/** 選擇語音時試聽的句子。 */
const SAMPLE_TEXT = 'Practice makes perfect.';

/** 儲存設定並套用到發音模組。 */
function applySpeechSettings() {
  store.saveSettings(app.settings);
  configureSpeech(app.settings);
}

/** 讓玩家選擇發音語音；選好後試聽一次。 */
async function chooseVoice() {
  const auto = { label: `${app.settings.voice ? '' : '✓ '}自動（推薦）`, value: '' };
  const items = voiceOptions().map((v) => ({ label: esc(`${v.name === app.settings.voice ? '✓ ' : ''}${v.name}（${v.lang}）`), value: v.name }));
  const choice = await openModal({
    title: '發音語音',
    html: '<p>依音質排序；選擇後會試聽一次。聲音不自然時可換一個試試。</p><p>iPhone、iPad 與 Mac 可到「設定 › 輔助使用 › 朗讀內容 › 聲音 › 英文」下載「加強版」或「高品質」語音，下載後會自動優先使用。</p>',
    menu: [auto, ...items],
    actions: [{ label: '返回', value: null }],
  });
  if (choice === null) return;
  app.settings.voice = choice;
  applySpeechSettings();
  sayWord(SAMPLE_TEXT);
}

/** 顯示設定。 */
async function openSettings() {
  const has = speechAvailable();
  const choice = await openModal({
    title: '設定',
    menu: [
      { label: `發音：${app.settings.speech ? '開' : '關'}${has ? '' : '（此裝置沒有英文語音）'}`, value: 'speech' },
      ...(has && app.settings.speech ? [
        { label: `拼對後自動發音：${app.settings.autoSpeak ? '開' : '關'}`, value: 'auto' },
        { label: esc(`發音語音：${app.settings.voice ? currentVoiceName() : `自動（${currentVoiceName()}）`}`), value: 'voice' },
        { label: `語速：${app.settings.rate === 'slow' ? '慢速' : '正常'}`, value: 'rate' },
      ] : []),
      { label: THEME_LABEL[app.settings.theme], value: 'theme' },
    ],
    actions: [{ label: '關閉', value: null, className: 'primary' }],
  });
  if (choice === 'speech') {
    app.settings.speech = !app.settings.speech;
    applySpeechSettings();
  } else if (choice === 'auto') {
    app.settings.autoSpeak = !app.settings.autoSpeak;
    applySpeechSettings();
  } else if (choice === 'voice') {
    await chooseVoice();
  } else if (choice === 'rate') {
    app.settings.rate = app.settings.rate === 'slow' ? 'normal' : 'slow';
    applySpeechSettings();
    sayWord(SAMPLE_TEXT);
  } else if (choice === 'theme') {
    cycleTheme();
  }
  if (choice) {
    if (app.screen === 'game' && app.state) renderGame();
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
  const key = e.key;
  let handled = true;
  if (key === 'Enter') onNext();
  else if (key === 'Backspace') onBackspace();
  else if (key === 'Delete') onClear();
  else if (key === 'Escape') pauseGame();
  else if (app.state.solved) {
    // 拼完後只接受唸單字與暫停；其他字母鍵不動作。
    if (key.toLowerCase() === 's') sayWord(currentWord().en);
    else if (key.toLowerCase() === 'p') pauseGame();
    else handled = false;
  } else if (/^[a-z]$/i.test(key) && !e.shiftKey && ['h', 'p', 's'].includes(key) === false) typeLetter(key.toLowerCase());
  else if (key === 'H') onHint();
  else if (key === 'P') pauseGame();
  else if (key === 'S') sayWord(currentWord().en);
  else if (/^[hps]$/.test(key)) typeOrCommand(key);
  else handled = false;
  if (handled) e.preventDefault();
}

/**
 * h、p、s 既是字母也是快捷鍵：方塊中還有這個字母時當作輸入，沒有時才當作提示、暫停、發音。
 * （要強制使用快捷鍵可按 Shift＋H／P／S。）
 * @param {string} key 小寫字母。
 */
function typeOrCommand(key) {
  if (findTile(key) >= 0) typeLetter(key);
  else if (key === 'h') onHint();
  else if (key === 'p') pauseGame();
  else sayWord(currentWord().en);
}

/**
 * 找第一個尚未使用、指定字母的方塊。
 * @param {string} ch 小寫字母。
 * @returns {number} 方塊編號；沒有時為 -1。
 */
function findTile(ch) {
  const used = usedTiles(app.state);
  return currentItem(app.state).tiles.findIndex((t, i) => t === ch && !used.has(i));
}

/**
 * 以鍵盤輸入字母：選取第一個尚未使用的相同字母方塊。
 * @param {string} ch 小寫字母。
 */
function typeLetter(ch) {
  if (!canPlay()) return;
  const tile = findTile(ch);
  if (tile < 0) showMessage(`沒有字母 ${ch.toUpperCase()}`);
  else onTile(tile);
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
 * 判斷是否為 iPhone、iPad 或 iPod（包含以桌面模式回報的 iPad）。
 * @returns {boolean} 是時為 true。
 */
function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * 判斷是否為 iOS 瀏覽器分頁（非主畫面 App）。
 * @returns {boolean} 是時為 true。
 */
function isIosBrowserTab() {
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return isIos() && !standalone;
}

/** 綁定事件。 */
function bindEvents() {
  els.themeBtn.addEventListener('click', cycleTheme);
  els.continueBtn.addEventListener('click', continueGame);
  els.reviewBtn.addEventListener('click', () => chooseDifficulty(REVIEW));
  els.bookBtn.addEventListener('click', () => openBook());
  els.statsBtn.addEventListener('click', openStats);
  els.rulesBtn.addEventListener('click', openRules);
  els.settingsBtn.addEventListener('click', openSettings);
  els.homeBtn.addEventListener('click', goHome);
  els.menuBtn.addEventListener('click', openGameMenu);
  els.backBtn.addEventListener('click', onBackspace);
  els.clearBtn.addEventListener('click', onClear);
  els.hintBtn.addEventListener('click', onHint);
  els.pauseBtn.addEventListener('click', pauseGame);
  els.resumeBtn.addEventListener('click', resumeGame);
  els.nextBtn.addEventListener('click', onNext);
  els.clueSpeak.addEventListener('click', () => sayWord(currentWord().en));
  els.updateBtn.addEventListener('click', applyUpdate);
  els.tiles.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tile]');
    if (b) onTile(Number(b.dataset.tile));
  });
  els.slots.addEventListener('click', (e) => {
    const b = e.target.closest('[data-slot]');
    if (b) onSlot(Number(b.dataset.slot));
  });
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
    } else if (app.screen === 'home' && WORDS.length) {
      renderHome();
    }
  });
  window.addEventListener('pagehide', persist);
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** 啟動：載入詞庫後顯示首頁。 */
async function init() {
  // 遊玩歷程與帳號凍結（與大廳共用，見 playlog.js）。
  const play = trackPlay('spelling');
  guardFreeze({ onLock: play.flush, onUnlock: play.resume });
  applyTheme();
  bindEvents();
  if (history.state && history.state.screen) history.replaceState(null, '');
  setupPortalLink();
  setupServiceWorker();
  try {
    WORDS = await loadLexicon();
  } catch {
    els.homeNotice.innerHTML = '<p>詞庫載入失敗，請連網後重新開啟。</p>';
    els.homeNotice.hidden = false;
    return;
  }
  wordById = new Map(WORDS.map((w) => [w.id, w]));
  index = meaningIndex(WORDS);
  const notices = [];
  if (!store.storageAvailable()) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  const saved = store.loadSave(getWord);
  if (saved.status === 'corrupt') {
    store.clearSave();
    notices.push('先前的遊戲進度資料損毀或詞庫已更新，已無法恢復，請開始新局；單字本不受影響。');
  }
  if (isIosBrowserTab()) notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟；只在 Safari 中玩時，7 天未使用可能被清除資料。');
  els.homeNotice.innerHTML = notices.map((n) => `<p>${esc(n)}</p>`).join('');
  els.homeNotice.hidden = notices.length === 0;
  showHome();
  configureSpeech(app.settings);
  initSpeech(() => {
    if (app.screen === 'game' && app.state) renderGame();
  });
}

init();
