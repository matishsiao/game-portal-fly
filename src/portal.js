// 遊戲大廳：列出各遊戲目錄、顯示進度與戰績、離線狀態，並可一次下載所有遊戲的離線資源。
// 每個遊戲部署在與本頁同層的獨立目錄（例如 ./sudoku/），各自擁有 Service Worker 與快取。
// 遊戲與大廳同網域，大廳以唯讀方式讀取各遊戲的 `<遊戲>.save`、`<遊戲>.stats` 顯示進度。

/** 遊戲清單：新增遊戲時加一筆，並把建置結果放到同名目錄。 */
const GAMES = [
  { dir: 'sudoku', title: '數獨', desc: '9 × 9 經典數獨，邏輯推理', tags: [['layers', '4 種難度'], ['bulb', '提示・筆記']] },
  { dir: 'crossmath', title: '數學填字', desc: '交叉算式，用數字庫填滿空格', tags: [['layers', '4 種難度'], ['plus', '加減乘除']] },
  { dir: 'numberlink', title: '數字連線', desc: '連起相同數字，線不交叉並填滿棋盤', tags: [['layers', '4 種難度'], ['link', '4×4～10×10']] },
  { dir: 'idiom', title: '成語填字', desc: '選字完成成語，學會意思與用法', tags: [['layers', '4 種難度'], ['book', '成語卡・成語本']] },
  { dir: 'roll', title: '滾滾解謎', desc: '推箱子、浮起來、滑過去、彈上去', tags: [['layers', '4 章 80 關'], ['sparkle', '物理小知識']] },
  { dir: 'codebreaker', title: '密碼偵探', desc: '看回饋推理，破解保險箱的顏色密碼', tags: [['layers', '4 種難度'], ['lock', '推理回顧']] },
];

/** 難度代碼與名稱，依由易到難排列。 */
const DIFFICULTY_LABEL = { easy: '簡單', medium: '中等', hard: '困難', expert: '專家' };

/** 讓遊戲頁顯示「所有遊戲」連結的 localStorage 鍵（同網域共用）。 */
const PORTAL_KEY = 'games.portal';

const STATUS_TEXT = {
  ready: '離線可玩',
  none: '尚未下載',
  installing: '下載中…',
  incomplete: '資源不完整',
  unavailable: '目前無法取得',
  unsupported: '不支援離線',
};

const supported = 'serviceWorker' in navigator;
const statusEls = new Map();

/**
 * 產生引用內嵌圖示集的 SVG 標記。
 * @param {string} name 圖示名稱（不含 i- 前綴）。
 * @returns {string} SVG 字串。
 */
function icon(name) {
  return `<svg class="i" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
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
 * 將累計時間格式化為簡短的「x 小時」或「x 分」。
 * @param {number} ms 毫秒。
 * @returns {string} 時間字串。
 */
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} 分`;
  const hours = ms / 3600000;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} 小時`;
}

/**
 * 安全讀取 localStorage 的 JSON；不存在、無法讀取或格式錯誤時回傳 null。
 * @param {string} key 儲存鍵。
 * @returns {any} 解析結果。
 */
function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * 讀取某個遊戲的進度與戰績（唯讀，資料不完整時忽略）。
 * @param {{dir: string}} game 遊戲。
 * @returns {{unfinished: {difficulty: string, elapsedMs: number} | null, completed: number, noHint: number, totalMs: number, best: {difficulty: string, ms: number} | null}} 進度摘要。
 */
function readProgress(game) {
  const save = readJson(`${game.dir}.save`);
  const unfinished =
    save && !save.completed && DIFFICULTY_LABEL[save.difficulty] && Number.isFinite(save.elapsedMs)
      ? { difficulty: save.difficulty, elapsedMs: save.elapsedMs }
      : null;
  const stats = readJson(`${game.dir}.stats`) || {};
  let completed = 0;
  let noHint = 0;
  let totalMs = 0;
  let best = null;
  for (const key of Object.keys(DIFFICULTY_LABEL)) {
    const s = stats[key];
    if (!s || typeof s !== 'object') continue;
    if (Number.isFinite(s.completed)) completed += s.completed;
    if (Number.isFinite(s.noHint)) noHint += s.noHint;
    if (Number.isFinite(s.totalMs)) totalMs += s.totalMs;
    // 以最難的已完成難度作為代表紀錄。
    if (Number.isFinite(s.bestMs) && s.bestMs > 0) best = { difficulty: key, ms: s.bestMs };
  }
  return { unfinished, completed, noHint, totalMs, best };
}

/**
 * 取得遊戲目錄的完整網址（即該遊戲 Service Worker 的 scope）。
 * @param {{dir: string}} game 遊戲。
 * @returns {string} 以 / 結尾的網址。
 */
function scopeOf(game) {
  return new URL(`./${game.dir}/`, location.href).href;
}

// ---------- 畫面 ----------

/** 依目前時段更新問候語與圖示。 */
function renderGreeting() {
  const hour = new Date().getHours();
  let text = '晚安，來一局放鬆一下';
  let name = 'moon';
  if (hour >= 5 && hour < 11) {
    text = '早安，來一局醒醒腦';
    name = 'sun';
  } else if (hour >= 11 && hour < 17) {
    text = '午安，休息一下吧';
    name = 'sun';
  } else if (hour >= 17 && hour < 20) {
    text = '傍晚好，輕鬆玩一局';
    name = 'sunset';
  }
  document.getElementById('greeting').textContent = text;
  document.getElementById('greeting-icon').setAttribute('href', `#i-${name}`);
}

/** 建立遊戲卡片與「即將推出」卡片。 */
function renderGames() {
  const list = document.getElementById('games');
  for (const game of GAMES) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'game-card';
    a.href = `./${game.dir}/`;
    a.dataset.theme = game.dir;
    a.innerHTML = `
      <img class="watermark" src="icons/${game.dir}.svg" alt="">
      <span class="card-top">
        <img src="icons/${game.dir}.svg" alt="" width="60" height="60">
        <span>
          <span class="game-title"></span>
          <span class="game-desc"></span>
          <span class="game-version"></span>
        </span>
      </span>
      <span class="card-meta">
        <span class="meta-chip update-chip" hidden>${icon('sparkle')}有新版本</span>
        <span class="meta-chip game-status">${icon('check')}<span class="status-text">檢查中…</span></span>
        ${game.tags.map(([name, label]) => `<span class="meta-chip">${icon(name)}${label}</span>`).join('')}
      </span>
      <span class="card-bottom">
        <span class="game-record"></span>
        <span class="play-btn">${icon('play')}開始</span>
      </span>`;
    a.querySelector('.game-title').textContent = game.title;
    a.querySelector('.game-desc').textContent = game.desc;
    statusEls.set(game.dir, a.querySelector('.game-status'));
    li.appendChild(a);
    list.appendChild(li);
  }
  const soon = document.createElement('li');
  soon.className = 'coming-soon';
  soon.innerHTML = `${icon('plus')}<span>更多遊戲即將推出</span>`;
  list.appendChild(soon);
}

/** 依本機資料更新「繼續遊戲」、各卡片戰績與戰績總覽。 */
function renderProgress() {
  const continueList = document.getElementById('continue-list');
  continueList.innerHTML = '';
  let completed = 0;
  let noHint = 0;
  let totalMs = 0;
  for (const game of GAMES) {
    const p = readProgress(game);
    completed += p.completed;
    noHint += p.noHint;
    totalMs += p.totalMs;

    const card = document.querySelector(`.game-card[data-theme="${game.dir}"]`);
    const record = card.querySelector('.game-record');
    const lines = [];
    lines.push(`<span>${icon('trophy')} 已完成 ${p.completed} 局</span>`);
    if (p.best) lines.push(`<span>${icon('star')} ${DIFFICULTY_LABEL[p.best.difficulty]}最佳 ${formatTime(p.best.ms)}</span>`);
    else lines.push(`<span>${icon('star')} 挑戰第一個紀錄吧</span>`);
    record.innerHTML = lines.join('');
    card.querySelector('.play-btn').innerHTML = `${icon('play')}${p.unfinished ? '繼續' : '開始'}`;

    if (p.unfinished) {
      const a = document.createElement('a');
      a.className = 'continue-card';
      a.href = `./${game.dir}/`;
      a.innerHTML = `
        <img src="icons/${game.dir}.svg" alt="" width="48" height="48">
        <span class="continue-text">
          <span class="continue-title"></span>
          <span class="continue-detail">${icon('layers')} ${DIFFICULTY_LABEL[p.unfinished.difficulty]}　${icon('clock')} ${formatTime(p.unfinished.elapsedMs)}</span>
        </span>
        <span class="play-dot">${icon('play')}</span>`;
      a.querySelector('.continue-title').textContent = game.title;
      continueList.appendChild(a);
    }
  }
  document.getElementById('continue-section').hidden = continueList.children.length === 0;
  document.getElementById('stat-completed').textContent = String(completed);
  document.getElementById('stat-nohint').textContent = String(noHint);
  document.getElementById('stat-time').textContent = formatDuration(totalMs);
}

/**
 * 更新遊戲卡片上的離線狀態。
 * @param {{dir: string}} game 遊戲。
 * @param {keyof STATUS_TEXT} status 狀態代碼。
 */
function setGameStatus(game, status) {
  const el = statusEls.get(game.dir);
  el.querySelector('.status-text').textContent = STATUS_TEXT[status];
  el.querySelector('use').setAttribute('href', status === 'ready' ? '#i-check' : status === 'installing' ? '#i-download' : '#i-wifi-off');
  el.dataset.status = status;
}

// ---------- 離線資源 ----------

/**
 * 透過 MessageChannel 詢問 Service Worker 快取是否完整。
 * @param {ServiceWorker} sw Service Worker。
 * @returns {Promise<{ok: boolean}>} 回覆內容；逾時視為不完整。
 */
function checkCache(sw) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve({ ok: false }), 5000);
    /**
     * 接收回覆。
     * @param {MessageEvent} event 回覆事件。
     */
    channel.port1.onmessage = (event) => {
      clearTimeout(timer);
      resolve(event.data || { ok: false });
    };
    sw.postMessage({ type: 'CHECK_CACHE' }, [channel.port2]);
  });
}

/**
 * 查詢某個遊戲的離線狀態。
 * @param {{dir: string}} game 遊戲。
 * @returns {Promise<keyof STATUS_TEXT>} 狀態代碼。
 */
async function gameStatus(game) {
  if (!supported) return 'unsupported';
  // getRegistration 會回傳最接近的 scope；必須確認是該遊戲自己的註冊，而不是本頁的。
  const reg = await navigator.serviceWorker.getRegistration(scopeOf(game));
  if (!reg || reg.scope !== scopeOf(game)) return 'none';
  if (!reg.active) return reg.installing || reg.waiting ? 'installing' : 'none';
  const result = await checkCache(reg.active);
  return result.ok ? 'ready' : 'incomplete';
}

/**
 * 等待剛註冊的 Service Worker 安裝完成。
 * @param {ServiceWorkerRegistration} reg 註冊資訊。
 * @returns {Promise<boolean>} 成功啟用為 true，安裝失敗為 false。
 */
function waitForActive(reg) {
  if (reg.active && !reg.installing) return Promise.resolve(true);
  const worker = reg.installing || reg.waiting;
  if (!worker) return Promise.resolve(!!reg.active);
  return new Promise((resolve) => {
    /** 依狀態判斷安裝結果。 */
    const onChange = () => {
      if (worker.state === 'activated') resolve(true);
      else if (worker.state === 'redundant') resolve(false);
    };
    worker.addEventListener('statechange', onChange);
    onChange();
  });
}

/**
 * 下載某個遊戲的離線資源：註冊該遊戲目錄下的 Service Worker（效果等同開過一次該遊戲）。
 * @param {{dir: string}} game 遊戲。
 * @returns {Promise<keyof STATUS_TEXT>} 下載後的狀態。
 */
async function installGame(game) {
  const current = await gameStatus(game);
  if (current === 'ready' || current === 'unsupported') return current;
  setGameStatus(game, 'installing');
  try {
    const reg = await navigator.serviceWorker.register(`${scopeOf(game)}sw.js`, { scope: scopeOf(game) });
    if (!(await waitForActive(reg))) return 'incomplete';
  } catch {
    return 'unavailable';
  }
  return gameStatus(game);
}

/**
 * 取得某個遊戲自己的 Service Worker 註冊；尚未註冊時回傳 null。
 * @param {{dir: string}} game 遊戲。
 * @returns {Promise<ServiceWorkerRegistration | null>} 註冊資訊。
 */
async function gameRegistration(game) {
  if (!supported) return null;
  const reg = await navigator.serviceWorker.getRegistration(scopeOf(game));
  return reg && reg.scope === scopeOf(game) ? reg : null;
}

/**
 * 判斷遊戲是否已下載好新版、等待玩家在遊戲內按「重新整理以更新」。
 * @param {{dir: string}} game 遊戲。
 * @returns {Promise<boolean>} 有等待中的新版時為 true。
 */
async function hasPendingUpdate(game) {
  const reg = await gameRegistration(game);
  return !!(reg && reg.active && reg.waiting);
}

/**
 * 在遊戲卡片顯示目前版本，以及已下載、等待玩家更新的新版本。
 * @param {{dir: string}} game 遊戲。
 */
async function renderGameVersion(game) {
  const el = document.querySelector(`.game-card[data-theme="${game.dir}"] .game-version`);
  const reg = await gameRegistration(game);
  const current = reg && reg.active ? (await checkCache(reg.active)).label : null;
  const next = reg && reg.active && reg.waiting ? (await checkCache(reg.waiting)).label : null;
  let text = current ? `版本 ${current}` : '';
  if (next) text += `\n新版 ${next} 已下載`;
  el.textContent = text;
}

/** 上次替遊戲檢查更新的時間。 */
let lastUpdateCheck = 0;

/**
 * 有網路時替每個已下載的遊戲檢查新版本，並在背景下載完成；不會直接切換版本，
 * 由玩家進入遊戲後按「重新整理以更新」決定何時更新，避免影響進行中的局。
 * @param {boolean} [force=false] 為 true 時忽略 10 分鐘的檢查間隔。
 */
async function checkGameUpdates(force = false) {
  if (!supported || !navigator.onLine) return;
  if (!force && Date.now() - lastUpdateCheck < 10 * 60 * 1000) return;
  lastUpdateCheck = Date.now();
  await Promise.all(
    GAMES.map(async (game) => {
      const reg = await gameRegistration(game);
      if (!reg || !reg.active) return;
      try {
        await reg.update();
      } catch {
        return;
      }
      const worker = reg.installing;
      if (!worker) return;
      await new Promise((resolve) => {
        /** 新版安裝完成或失敗時結束等待。 */
        const onChange = () => {
          if (worker.state !== 'installing') resolve();
        };
        worker.addEventListener('statechange', onChange);
        onChange();
      });
    }),
  );
  refreshAll();
}

/**
 * 重新整理所有遊戲的離線狀態、新版本標記、就緒標記與「準備出發」區塊。
 */
async function refreshAll() {
  const statuses = await Promise.all(
    GAMES.map(async (game) => {
      const status = await gameStatus(game);
      setGameStatus(game, status);
      return status;
    }),
  );
  const updates = await Promise.all(GAMES.map(hasPendingUpdate));
  GAMES.forEach((game, idx) => {
    document.querySelector(`.game-card[data-theme="${game.dir}"] .update-chip`).hidden = !updates[idx];
  });
  const updateNames = GAMES.filter((_, idx) => updates[idx]).map((game) => game.title);
  await Promise.all(GAMES.map(renderGameVersion));
  const readyCount = statuses.filter((s) => s === 'ready').length;
  const allReady = readyCount === GAMES.length;
  const chip = document.getElementById('ready-chip');
  chip.innerHTML = `${icon(allReady ? 'plane' : 'wifi-off')}離線就緒 ${readyCount}/${GAMES.length}`;
  chip.classList.toggle('ready', allReady);

  const prepare = document.getElementById('prepare');
  prepare.classList.toggle('done', allReady);
  document.getElementById('prepare-icon').setAttribute('href', allReady ? '#i-check' : '#i-plane');
  document.getElementById('prepare-title').textContent = allReady ? '可以出發了' : '準備出發';
  let desc = allReady
    ? '所有遊戲都已下載，沒有網路也能玩。'
    : '連網時會自動下載所有遊戲；完成後搭機或沒有網路時也能玩。';
  if (updateNames.length) {
    desc += `${updateNames.join('、')}已下載新版本，進入遊戲後點上方「重新整理以更新」即可使用。`;
  }
  document.getElementById('prepare-desc').textContent = desc;

  const btn = document.getElementById('download-btn');
  const hint = document.getElementById('download-hint');
  const pending = statuses.some((s) => s !== 'ready' && s !== 'unsupported');
  btn.hidden = !supported || !pending;
  btn.disabled = !navigator.onLine;
  hint.hidden = btn.hidden || navigator.onLine;
  hint.textContent = '目前沒有網路，連網後才能下載。';
}

let downloading = false;

/**
 * 一次下載所有遊戲的離線資源；已在下載中時忽略。
 */
async function downloadAll() {
  if (downloading) return;
  downloading = true;
  const btn = document.getElementById('download-btn');
  const label = document.getElementById('download-label');
  btn.disabled = true;
  label.textContent = '下載中…';
  for (const game of GAMES) setGameStatus(game, await installGame(game));
  label.textContent = '重新下載離線資源';
  downloading = false;
  await refreshAll();
}

/**
 * 有網路時自動下載尚未就緒的遊戲（全部約數百 KB），不需玩家逐一開啟遊戲。
 * 裝置開啟省數據模式時不自動下載，改由玩家按按鈕。
 */
async function autoDownload() {
  const saveData = navigator.connection && navigator.connection.saveData;
  if (!supported || !navigator.onLine || saveData) return;
  const statuses = await Promise.all(GAMES.map(gameStatus));
  if (statuses.some((s) => s === 'none' || s === 'incomplete')) downloadAll();
}

/**
 * 設定大廳本身的離線狀態。
 * @param {string} text 狀態文字。
 */
function setPortalStatus(text) {
  document.getElementById('portal-status').textContent = text;
}

/**
 * 顯示大廳版本。目前頁面由控制它的 Service Worker 提供，所以以控制者的版本為準；
 * 背景已下載的新版會在下次開啟時套用。
 * @param {ServiceWorkerRegistration} reg 大廳的註冊資訊。
 * @param {string | undefined} activeLabel 最新啟用版本的標籤。
 */
async function renderPortalVersion(reg, activeLabel) {
  const own = new URL('./sw.js', location.href).href;
  const controller = navigator.serviceWorker.controller;
  const current = controller && controller.scriptURL === own ? (await checkCache(controller)).label : activeLabel;
  let text = current ? `大廳版本 ${current}` : '';
  if (current && activeLabel && activeLabel !== current) text += `（新版 ${activeLabel} 已下載，下次開啟時套用）`;
  document.getElementById('version-line').textContent = text;
}

/**
 * 註冊大廳的 Service Worker（只快取大廳本身），並更新狀態。
 */
async function setupPortalWorker() {
  if (!supported) {
    setPortalStatus('此瀏覽器不支援離線使用');
    return;
  }
  let reg;
  try {
    reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
  } catch {
    setPortalStatus('開發模式：大廳未啟用離線快取');
    return;
  }
  if (await waitForActive(reg)) {
    const result = await checkCache(reg.active);
    setPortalStatus(result.ok ? '大廳已可離線開啟' : '大廳離線資源下載中…');
    renderPortalVersion(reg, result.label);
  } else {
    setPortalStatus('大廳離線資源下載失敗，請連網後重新開啟');
  }
  reg.update().catch(() => {});
}

// ---------- 啟動 ----------

/**
 * 判斷是否已從主畫面以 App 模式開啟。
 * @returns {boolean} 是時為 true。
 */
function isStandalone() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * 判斷目前的手機平台。
 * @returns {'ios' | 'android' | 'other'} 平台。
 */
function mobilePlatform() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return 'other';
}

/** Chrome 提供的安裝提示事件，保留到玩家按下「安裝到主畫面」時使用。 */
let installPrompt = null;

/**
 * 設定 Android Chrome 的一鍵安裝：攔截瀏覽器的安裝提示，改由「安裝到主畫面」按鈕觸發。
 */
function setupInstall() {
  const btn = document.getElementById('install-btn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    btn.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    btn.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    btn.hidden = true;
    showNotice('已安裝到主畫面。之後請從主畫面的「遊戲飛行」圖示開啟。');
  });
}

/**
 * 在大廳顯示提示訊息。
 * @param {string} text 訊息（內建字串）。
 */
function showNotice(text) {
  const notice = document.getElementById('notice');
  notice.innerHTML = `${icon('info')} ${text}`;
  notice.hidden = false;
}

/**
 * 記錄大廳網址，讓同網域的遊戲首頁可以顯示返回大廳的連結。
 */
function rememberPortal() {
  try {
    localStorage.setItem(PORTAL_KEY, new URL('./', location.href).pathname);
  } catch {
    // 忽略：無法儲存時遊戲頁不顯示返回連結。
  }
}

/** 回到大廳（含從遊戲按返回、從背景切回）時更新進度與狀態。 */
function refreshView() {
  renderGreeting();
  renderProgress();
  refreshAll();
  checkGameUpdates();
}

/** 啟動大廳。 */
function init() {
  renderGames();
  rememberPortal();
  setupInstall();
  const platform = mobilePlatform();
  if (platform !== 'other' && !isStandalone()) {
    // 手機瀏覽器分頁中開啟（尚未從主畫面開啟）：展開安裝說明並提示。
    document.getElementById('help').open = true;
    showNotice(
      platform === 'ios'
        ? '建議用 Safari 的「分享 → 加入主畫面」安裝，並固定從主畫面圖示開啟；只在 Safari 中玩時，7 天未使用可能被清除資料。'
        : '建議安裝到主畫面：點「安裝到主畫面」按鈕，或 Chrome 右上角 ⋮ →「安裝應用程式」。步驟見下方「出發前檢查」。',
    );
  }
  document.getElementById('download-btn').addEventListener('click', downloadAll);
  window.addEventListener('online', () => {
    refreshAll();
    autoDownload();
    checkGameUpdates(true);
  });
  window.addEventListener('offline', refreshAll);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) refreshView();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshView();
  });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  setupPortalWorker();
  refreshView();
  autoDownload();
}

init();
