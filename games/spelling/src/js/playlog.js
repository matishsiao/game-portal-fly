// 遊戲飛行共用模組：遊玩歷程（games.history）與帳號凍結（games.freeze）。大廳的 src/playlog.js 是正本，各遊戲的 src/js/playlog.js 須與正本逐字相同（根目錄 npm test 會檢查）。

/** 遊玩歷程的 localStorage 鍵（所有遊戲共用）。 */
export const HISTORY_KEY = 'games.history';
/** 遊玩歷程保留的筆數。 */
export const HISTORY_LIMIT = 100;
/** 一段遊玩至少要在前景這麼久才記錄（毫秒），避免誤開或路過也被記下。 */
export const MIN_SESSION_MS = 10 * 1000;
/** 切到背景後在這段時間內回來，仍算同一段遊玩（毫秒）。 */
export const RESUME_GAP_MS = 5 * 60 * 1000;
/** 帳號凍結的 localStorage 鍵（由大廳寫入，所有遊戲讀取）。 */
export const FREEZE_KEY = 'games.freeze';
/** 凍結時數的範圍（小時）。 */
export const FREEZE_HOURS = { min: 1, max: 168 };
/** 凍結密碼的長度範圍（字元）。 */
export const PASSWORD_LENGTH = { min: 4, max: 32 };

const HOUR_MS = 3600 * 1000;

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
 * 安全寫入 localStorage 的 JSON；失敗時忽略（不影響遊戲）。
 * @param {string} key 儲存鍵。
 * @param {any} value 值。
 */
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 忽略：無法儲存時不記錄。
  }
}

// ---------- 遊玩歷程 ----------

/**
 * 判斷是否為格式正確的遊玩紀錄。
 * @param {any} r 紀錄。
 * @returns {boolean} 正確時為 true。
 */
function validEntry(r) {
  return !!r && typeof r.id === 'string' && typeof r.game === 'string' && Number.isFinite(r.start) && Number.isFinite(r.end) && Number.isFinite(r.ms) && r.ms >= 0;
}

/**
 * 整理遊玩歷程：只留格式正確的紀錄，依開始時間由舊到新排列。
 * @param {any} raw 讀到的資料。
 * @returns {{id: string, game: string, start: number, end: number, ms: number}[]} 紀錄。
 */
export function parseHistory(raw) {
  return (Array.isArray(raw) ? raw.filter(validEntry) : []).sort((a, b) => a.start - b.start);
}

/**
 * 加入或更新一筆遊玩紀錄（同一個 id 視為同一段遊玩，以新資料取代），只保留最新的 limit 筆。
 * @param {any} raw 目前的歷程。
 * @param {{id: string, game: string, start: number, end: number, ms: number}} entry 紀錄。
 * @param {number} [limit=HISTORY_LIMIT] 保留筆數。
 * @returns {object[]} 新的歷程（由舊到新）。
 */
export function upsertHistory(raw, entry, limit = HISTORY_LIMIT) {
  const list = parseHistory(raw).filter((r) => r.id !== entry.id);
  list.push({ id: entry.id, game: entry.game, start: entry.start, end: entry.end, ms: Math.round(entry.ms) });
  list.sort((a, b) => a.start - b.start);
  return list.slice(-limit);
}

/**
 * 讀取遊玩歷程（由新到舊），供大廳顯示。
 * @returns {{id: string, game: string, start: number, end: number, ms: number}[]} 紀錄。
 */
export function loadHistory() {
  return parseHistory(readJson(HISTORY_KEY)).reverse();
}

/**
 * 記錄這個遊戲頁面的遊玩時間：頁面在前景時累計（以 performance.now() 計算，不受改時間影響），
 * 切到背景或離開頁面時寫入 games.history。帳號凍結時不計時。
 * @param {string} game 遊戲目錄名稱。
 * @returns {{flush: () => void, resume: () => void}} flush 立即結算目前這段並寫入；resume 在前景且未凍結時重新開始計時（例如解除凍結後）。
 */
export function trackPlay(game) {
  /** 目前這段遊玩；null 表示尚未開始。 */
  let session = null;
  /** 這次進入前景的 performance.now()；null 表示目前不在計時。 */
  let segStart = null;
  /** 上次結算的時刻（Date.now()），判斷回來時是否接續同一段。 */
  let lastEnd = 0;

  /** 頁面在前景且未凍結時開始計時。 */
  const begin = () => {
    if (segStart !== null || document.visibilityState !== 'visible' || isFrozen()) return;
    const now = Date.now();
    if (!session || now - lastEnd > RESUME_GAP_MS || now < lastEnd) session = { id: `${game}:${now}`, game, start: now, end: now, ms: 0 };
    segStart = performance.now();
  };

  /** 結算目前在前景的時間並寫入（未達最短時間時不寫入）。 */
  const flush = () => {
    if (segStart === null) return;
    session.ms += Math.max(0, performance.now() - segStart);
    segStart = null;
    lastEnd = Date.now();
    session.end = Math.max(session.start, lastEnd);
    if (session.ms >= MIN_SESSION_MS) writeJson(HISTORY_KEY, upsertHistory(readJson(HISTORY_KEY), session));
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') begin();
    else flush();
  });
  window.addEventListener('pagehide', flush);
  window.addEventListener('pageshow', begin);
  begin();
  return { flush, resume: begin };
}

// ---------- 帳號凍結 ----------

/**
 * 判斷凍結資料是否完整；不完整的資料無法驗證密碼，視為沒有凍結。
 * @param {any} data 凍結資料。
 * @returns {boolean} 完整時為 true。
 */
function validFreeze(data) {
  return !!data && data.v === 1 && Number.isFinite(data.at) && Number.isFinite(data.until) && typeof data.salt === 'string' && typeof data.hash === 'string' && (data.alg === 'sha256' || data.alg === 'fnv');
}

/**
 * 計算凍結狀態。時間到了仍維持凍結，須輸入密碼才能解除。
 * @param {any} data 凍結資料（games.freeze）。
 * @param {number} now 目前時間（毫秒）。
 * @returns {{until: number, expired: boolean, remainMs: number} | null} 沒有凍結時為 null。
 */
export function freezeState(data, now) {
  if (!validFreeze(data)) return null;
  const remainMs = Math.max(0, data.until - now);
  return { until: data.until, expired: remainMs === 0, remainMs };
}

/**
 * 目前是否凍結中。
 * @returns {boolean} 凍結中為 true。
 */
export function isFrozen() {
  return freezeState(readJson(FREEZE_KEY), Date.now()) !== null;
}

/**
 * 檢查凍結設定（時數與密碼）。
 * @param {number} hours 凍結時數。
 * @param {string} password 密碼。
 * @param {string} confirm 再輸入一次的密碼。
 * @returns {string} 錯誤訊息；正確時為空字串。
 */
export function validateFreeze(hours, password, confirm) {
  if (!Number.isInteger(hours) || hours < FREEZE_HOURS.min || hours > FREEZE_HOURS.max) return `凍結時間請輸入 ${FREEZE_HOURS.min}～${FREEZE_HOURS.max} 的整數小時`;
  if (typeof password !== 'string' || password.length < PASSWORD_LENGTH.min || password.length > PASSWORD_LENGTH.max) return `密碼長度須為 ${PASSWORD_LENGTH.min}～${PASSWORD_LENGTH.max} 個字`;
  if (password !== confirm) return '兩次輸入的密碼不一樣';
  return '';
}

/**
 * 以 FNV-1a 計算字串雜湊（瀏覽器不提供 crypto.subtle 時的退路，例如區網 HTTP 開發）。
 * @param {string} text 文字。
 * @returns {string} 16 進位雜湊。
 */
function fnvHash(text) {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(text)) {
    h ^= ch;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * 計算密碼雜湊（加鹽）；本機只存雜湊，不存明碼。
 * @param {string} password 密碼。
 * @param {string} salt 鹽。
 * @param {'sha256' | 'fnv'} alg 演算法。
 * @returns {Promise<string>} 16 進位雜湊。
 */
export async function hashPassword(password, salt, alg) {
  const text = `${salt}:${password}`;
  if (alg === 'fnv') return fnvHash(text);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 建立凍結資料。
 * @param {string} password 密碼（須先以 validateFreeze 檢查）。
 * @param {number} hours 凍結時數。
 * @param {number} now 目前時間（毫秒）。
 * @returns {Promise<{v: 1, at: number, until: number, salt: string, alg: string, hash: string}>} 凍結資料。
 */
export async function makeFreeze(password, hours, now) {
  const bytes = new Uint8Array(8);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  const salt = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const alg = globalThis.crypto && globalThis.crypto.subtle ? 'sha256' : 'fnv';
  return { v: 1, at: now, until: now + hours * HOUR_MS, salt, alg, hash: await hashPassword(password, salt, alg) };
}

/**
 * 驗證凍結密碼。
 * @param {any} data 凍結資料。
 * @param {string} password 輸入的密碼。
 * @returns {Promise<boolean>} 正確時為 true。
 */
export async function checkPassword(data, password) {
  if (!validFreeze(data)) return false;
  if (data.alg === 'sha256' && !(globalThis.crypto && globalThis.crypto.subtle)) return false;
  return (await hashPassword(password, data.salt, data.alg)) === data.hash;
}

/**
 * 凍結帳號：寫入 games.freeze。
 * @param {string} password 密碼。
 * @param {number} hours 凍結時數。
 * @returns {Promise<boolean>} 寫入成功為 true。
 */
export async function freezeAccount(password, hours) {
  const data = await makeFreeze(password, hours, Date.now());
  writeJson(FREEZE_KEY, data);
  return isFrozen();
}

/**
 * 將剩餘時間格式化為「x 小時 y 分」。
 * @param {number} ms 毫秒。
 * @returns {string} 文字。
 */
export function formatRemain(ms) {
  const minutes = Math.ceil(ms / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} 小時${m ? ` ${m} 分` : ''}` : `${m} 分`;
}

/**
 * 將時間格式化為「10/28 14:05」。
 * @param {number} t 時間（毫秒）。
 * @returns {string} 文字。
 */
export function formatClock(t) {
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 凍結畫面的樣式：各遊戲的 CSS 不同，所以自帶樣式並跟隨系統深淺色。 */
const LOCK_CSS = `
.pf-lock{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:linear-gradient(160deg,#1f2b48,#0d1220);color:#e8eaf1;font-family:-apple-system,BlinkMacSystemFont,"PingFang TC","Noto Sans TC","Microsoft JhengHei",sans-serif;font-size:16px;line-height:1.5;overflow:auto;-webkit-user-select:none;user-select:none}
.pf-lock-box{width:100%;max-width:360px;display:flex;flex-direction:column;gap:12px;padding:24px 20px;border-radius:20px;background:rgba(255,255,255,.08);box-shadow:0 10px 28px rgba(0,0,0,.45);text-align:center}
.pf-lock-ico{font-size:44px;line-height:1}
.pf-lock h2{margin:0;font-size:22px}
.pf-lock p{margin:0;font-size:14px;color:#b8bfd0}
.pf-lock .pf-lock-time{font-size:16px;font-weight:700;color:#ffd27a}
.pf-lock .pf-lock-time.done{color:#7bd88f}
.pf-lock form{display:flex;flex-direction:column;gap:10px;margin:4px 0 0}
.pf-lock input{min-height:48px;padding:0 14px;border:2px solid rgba(255,255,255,.25);border-radius:12px;background:rgba(0,0,0,.25);color:#fff;font:inherit;font-size:18px;text-align:center;-webkit-user-select:text;user-select:text}
.pf-lock input:focus{outline:none;border-color:#5b9be6}
.pf-lock button{min-height:48px;border:none;border-radius:12px;background:#5b9be6;color:#0d1016;font:inherit;font-weight:800;cursor:pointer}
.pf-lock button:disabled{opacity:.6}
.pf-lock .pf-lock-msg{min-height:1.5em;color:#ff8f8f;font-weight:700}
`;

/** 目前顯示中的凍結畫面；沒有顯示時為 null。 */
let lockEl = null;
/** 凍結時被設為 inert 的元素，解除時還原。 */
let inertEls = [];

/**
 * 依目前的凍結資料更新凍結畫面上的時間說明。
 */
function renderLockTime() {
  if (!lockEl) return;
  const state = freezeState(readJson(FREEZE_KEY), Date.now());
  const el = lockEl.querySelector('.pf-lock-time');
  if (!state) return;
  el.textContent = state.expired ? `凍結時間已到（${formatClock(state.until)}），輸入密碼即可解除` : `凍結到 ${formatClock(state.until)}，還有 ${formatRemain(state.remainMs)}`;
  el.classList.toggle('done', state.expired);
}

/**
 * 移除凍結畫面並還原頁面操作。
 */
function hideLock() {
  if (!lockEl) return;
  lockEl.remove();
  lockEl = null;
  for (const el of inertEls) el.inert = false;
  inertEls = [];
  document.documentElement.style.overflow = '';
}

/**
 * 顯示凍結畫面：蓋住整個頁面，輸入正確的密碼才能解除（不論凍結時間是否已到）。
 * @param {() => void} onUnlock 解除後呼叫。
 */
function showLock(onUnlock) {
  if (lockEl) {
    renderLockTime();
    return;
  }
  if (!document.getElementById('pf-lock-style')) {
    const style = document.createElement('style');
    style.id = 'pf-lock-style';
    style.textContent = LOCK_CSS;
    document.head.appendChild(style);
  }
  // 讓頁面其他內容無法點按或以鍵盤聚焦。
  inertEls = [...document.body.children].filter((el) => !el.inert);
  for (const el of inertEls) el.inert = true;
  document.documentElement.style.overflow = 'hidden';
  lockEl = document.createElement('div');
  lockEl.className = 'pf-lock';
  lockEl.setAttribute('role', 'dialog');
  lockEl.setAttribute('aria-modal', 'true');
  lockEl.setAttribute('aria-labelledby', 'pf-lock-title');
  lockEl.innerHTML = `
    <div class="pf-lock-box">
      <div class="pf-lock-ico" aria-hidden="true">🔒</div>
      <h2 id="pf-lock-title">帳號已凍結</h2>
      <p class="pf-lock-time"></p>
      <p>遊戲大廳與所有遊戲都暫停使用，輸入凍結密碼才能解除。</p>
      <form>
        <input type="password" autocomplete="off" maxlength="${PASSWORD_LENGTH.max}" placeholder="凍結密碼" aria-label="凍結密碼">
        <button type="submit">解除凍結</button>
      </form>
      <p class="pf-lock-msg" role="alert"></p>
    </div>`;
  // 輸入密碼時不觸發遊戲的快捷鍵。
  lockEl.addEventListener('keydown', (e) => e.stopPropagation());
  lockEl.addEventListener('keyup', (e) => e.stopPropagation());
  const form = lockEl.querySelector('form');
  const input = lockEl.querySelector('input');
  const msg = lockEl.querySelector('.pf-lock-msg');
  const btn = lockEl.querySelector('button');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    const data = readJson(FREEZE_KEY);
    const ok = !freezeState(data, Date.now()) || (await checkPassword(data, input.value));
    btn.disabled = false;
    if (!ok) {
      msg.textContent = '✕ 密碼不正確';
      input.select();
      renderLockTime();
      return;
    }
    try {
      localStorage.removeItem(FREEZE_KEY);
    } catch {
      // 忽略：無法刪除時下次開啟仍會凍結。
    }
    hideLock();
    onUnlock();
  });
  document.body.appendChild(lockEl);
  renderLockTime();
}

/**
 * 凍結守門：凍結中時以凍結畫面蓋住頁面。開啟時、回到前景、從快取還原與其他分頁變更凍結狀態時重新檢查。
 * @param {{onUnlock?: () => void, onLock?: () => void}} [opt] 解除凍結、顯示凍結畫面時的回呼。
 * @returns {{check: () => boolean}} check 立即檢查，凍結中回傳 true。
 */
export function guardFreeze(opt = {}) {
  const onUnlock = opt.onUnlock || (() => {});
  /** 依目前的凍結狀態顯示或移除凍結畫面。 */
  const check = () => {
    const frozen = isFrozen();
    if (frozen) {
      const fresh = !lockEl;
      showLock(onUnlock);
      if (fresh && opt.onLock) opt.onLock();
    } else hideLock();
    return frozen;
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  window.addEventListener('pageshow', check);
  window.addEventListener('storage', (e) => {
    if (e.key === FREEZE_KEY || e.key === null) check();
  });
  check();
  return { check };
}
