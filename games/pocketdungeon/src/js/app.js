// 主程式：首頁、村莊、地城畫面、遊戲迴圈、輸入、存檔與 Service Worker。

import * as store from './storage.js';
import { CLASSES, CLASS_KEYS, AREAS, AREA_KEYS, RARITIES, LIMITS, EQUIP_SLOTS, ITEM_SLOTS, BAG_EXPAND, EVOLVE, SHARED_SLOTS, REBIRTH, STATUS, GEMS, GEM_RULES, MATERIALS, CRAFT, WEAPON_HANDS, BOSSES, GIFT } from './pd/data.js';
import { xpToNext, characterStats, speedProfile, describeStats, sellPrice, enhanceCost, levelCap, gemName, gemEffect, parseGem, socketCount, statusText, gemBonus, itemStats, weaponHands, dungeonLevel } from './pd/rules.js';
import { World } from './pd/world.js';
import { Renderer } from './pd/render.js';
import { heroDataUrl, itemDataUrl, monsterDataUrl } from './pd/sprites.js';
import * as village from './pd/village.js';
import * as skills from './pd/skills.js';
import { ICONS, PASSIVE_ICONS, fillIcons, skillIcon } from './icons.js';

/** 固定時間步（秒）。 */
const STEP = 1 / 60;
/** 探險中自動存檔的間隔（秒）。 */
const AUTOSAVE = 10;
/** 短訊息顯示時間（毫秒）。 */
const TOAST_MS = 2200;

/**
 * 依 id 取得元素。
 * @param {string} id 元素 id。
 * @returns {HTMLElement} 元素。
 */
const $ = (id) => document.getElementById(id);

/** 常用的畫面元素。 */
const els = {
  home: $('home'),
  village: $('village'),
  game: $('game'),
  themeBtn: $('theme-btn'),
  offlineStatus: $('offline-status'),
  homeNotice: $('home-notice'),
  continueBtn: $('continue-btn'),
  continueDetail: $('continue-detail'),
  charList: $('char-list'),
  updateBanner: $('update-banner'),
  villageTabs: $('village-tabs'),
  villagePanel: $('village-panel'),
  villageMessage: $('village-message'),
  canvas: $('canvas'),
  minimap: $('minimap'),
  stage: $('stage'),
  pad: $('pad'),
  stickZone: $('stick-zone'),
  stick: $('stick'),
  stickKnob: $('stick-knob'),
  pauseCover: $('pause-cover'),
  toast: $('toast'),
  hurtFlash: $('hurt-flash'),
  fade: $('fade'),
  modal: $('modal'),
  modalTitle: $('modal-title'),
  modalBody: $('modal-body'),
  modalActions: $('modal-actions'),
};

/** 執行期狀態。 */
const app = {
  /** @type {Map<string, object>} */
  chars: new Map(),
  /** 已領取的獲得紀錄（其他遊戲的第一次過關與第一次全對，整個帳號共用）。 */
  claimed: [],
  /** 共用倉庫（所有角色共用的 20 格裝備與金幣）。 */
  shared: { items: [], gold: 0 },
  /** 進行中的探險 {charId, snap}。 */
  run: null,
  current: null,
  settings: store.loadSettings(),
  screen: 'home',
  tab: 'gate',
  /** 鐵匠分頁目前的子頁面（craft 製作、enhance 強化）。 */
  smithTab: 'craft',
  /** 倉庫分頁目前的子頁面（mine 個人、shared 共用）。 */
  bagTab: 'mine',
  /** 技能分頁目前的子頁面（active 主動、passive 被動）。 */
  skillTab: 'active',
  world: null,
  renderer: null,
  raf: 0,
  running: false,
  lastTs: 0,
  acc: 0,
  saveTimer: 0,
  transition: false,
  ending: false,
  input: { keys: new Set(), stick: { x: 0, y: 0 }, attackHeld: false, dodge: false, potion: false, cure: false, skill: [false, false, false, false], gem: [false, false] },
  stickPointer: null,
  toastTimer: 0,
  hudCache: {},
  registration: null,
  lastUpdateCheck: 0,
  updateRequested: false,
  modalResolve: null,
};

// ---------- 共用工具 ----------

/**
 * 格式化毫秒為 mm:ss 或 h:mm:ss。
 * @param {number} ms 毫秒。
 * @returns {string} 時間字串。
 */
function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * 跳脫 HTML 特殊字元（玩家輸入的角色名稱用）。
 * @param {string} s 文字。
 * @returns {string} 跳脫後的文字。
 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/**
 * 目前選取的角色。
 * @returns {object | null} 角色。
 */
function currentChar() {
  return app.current ? app.chars.get(app.current) || null : null;
}

/**
 * 裝備名稱的 HTML：稀有度文字＋顏色、名稱、強化值與等級。
 * @param {object} item 裝備。
 * @returns {string} HTML。
 */
function itemTitle(item) {
  const r = RARITIES[item.rarity];
  return `<span class="item-title"><span class="rarity r${item.rarity}">${r.name}</span> <b class="item-name r${item.rarity}">${esc(item.name)}${item.enhance ? ` +${item.enhance}` : ''}</b> <small class="muted">Lv.${item.level}</small></span>`;
}

/**
 * 裝備的完整說明 HTML（名稱與屬性）。
 * @param {object} item 裝備。
 * @returns {string} HTML。
 */
function itemHtml(item) {
  const extra = item.status ? `<span class="item-stats status-line">附帶：${statusText(item.status)}</span>` : '';
  const hands = weaponHands(item) ? `（${weaponHands(item) === 2 ? '雙手' : '單手'}）` : '';
  return `<div class="item-main">${itemTitle(item)}<span class="item-stats">${ITEM_SLOTS[item.slot]}${hands}・${describeStats(item)}</span>${extra}${socketsHtml(item)}</div>`;
}

/**
 * 裝備的寶石孔：已鑲的寶石（名稱與效果）與空孔。
 * @param {object} item 裝備。
 * @returns {string} HTML。
 */
function socketsHtml(item) {
  const gems = item.gems || [];
  const holes = [];
  for (let k = 0; k < socketCount(item); k++) {
    const key = gems[k];
    holes.push(key ? `<span class="socket on" style="--gem:${GEMS[parseGem(key).kind].color}">${gemName(key)}</span>` : '<span class="socket">空孔</span>');
  }
  return `<span class="sockets">${holes.join('')}</span>`;
}

/**
 * 「裝備中」標籤，註明裝在哪一格（例如「裝備中・飾品 1」）；沒有裝備時為空字串。
 * @param {object} ch 角色。
 * @param {object} it 裝備。
 * @returns {string} HTML。
 */
function wornTag(ch, it) {
  const slot = EQUIP_SLOTS.find((e) => ch.equipped[e.key] === it);
  return slot ? `<em class="worn">裝備中・${slot.name}</em>` : '';
}

// ---------- 主題 ----------

/** 主題按鈕的文字。 */
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
 * @param {string} [options.html] 內容 HTML（玩家輸入的文字須先跳脫）。
 * @param {{label: string, value: any, className?: string}[]} [options.menu] 直向選單項目。
 * @param {{label: string, value: any, className?: string}[]} [options.actions] 底部按鈕。
 * @param {any} [options.dismissValue=null] 點背景或按 Esc 關閉時的回傳值。
 * @param {string} [options.menuClass='menu-list'] 選單的版面（menu-list 直向清單、menu-grid 格子）。
 * @returns {Promise<any>} 使用者選擇的值。
 */
function openModal({ title, html = '', menu = [], actions = [], dismissValue = null, menuClass = 'menu-list' }) {
  closeModal(dismissValue);
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = html;
  els.modalActions.innerHTML = '';
  /**
   * 建立對話框按鈕。
   * @param {{label: string, value: any, className?: string, style?: string, disabled?: boolean}} item 按鈕設定。
   * @returns {HTMLButtonElement} 按鈕。
   */
  const makeButton = (item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = item.label;
    if (item.className) b.className = item.className;
    if (item.style) b.setAttribute('style', item.style);
    if (item.disabled) b.disabled = true;
    b.addEventListener('click', () => closeModal(item.value));
    return b;
  };
  if (menu.length) {
    const list = document.createElement('div');
    list.className = menuClass;
    menu.forEach((item) => list.appendChild(makeButton(item)));
    els.modalBody.appendChild(list);
  }
  actions.forEach((item) => els.modalActions.appendChild(makeButton(item)));
  els.modalActions.hidden = actions.length === 0;
  els.modal.hidden = false;
  els.modal.dataset.dismiss = JSON.stringify(dismissValue);
  const first = els.modal.querySelector('input') || els.modal.querySelector('button.primary') || els.modal.querySelector('button');
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

// ---------- 畫面切換 ----------

/**
 * 切換畫面（首頁、村莊、地城）。進入村莊或地城時加入一筆瀏覽紀錄，讓返回鍵先回首頁。
 * @param {'home' | 'village' | 'game'} name 畫面。
 */
function showScreen(name) {
  if (name !== 'home' && app.screen === 'home') history.pushState({ screen: name }, '');
  else if (name !== 'home') history.replaceState({ screen: name }, '');
  app.screen = name;
  // 重新進入村莊時，地城地圖會再捲到目前進度的關卡。
  if (name === 'village') app.lastTab = null;
  els.home.hidden = name !== 'home';
  els.village.hidden = name !== 'village';
  els.game.hidden = name !== 'game';
  document.body.classList.toggle('in-game', name === 'game');
}

/** 回到首頁（探險中會先暫停並存檔）。 */
function goHome() {
  if (app.screen === 'game') {
    pauseGame();
    stopLoop();
  }
  closeModal(null);
  if (history.state && history.state.screen) {
    // 由返回鍵以外的方式回首頁時，退掉先前加入的瀏覽紀錄。
    app.ignorePop = true;
    history.back();
  }
  showScreen('home');
  renderHome();
}

// ---------- 首頁 ----------

/** 更新首頁：繼續探險、角色列表。 */
function renderHome() {
  const run = app.run;
  if (run && app.chars.has(run.charId)) {
    const ch = app.chars.get(run.charId);
    const s = run.snap;
    const floor = s.floor >= 3 ? 'Boss 層' : `第 ${s.floor + 1} 層`;
    els.continueDetail.textContent = `${ch.name}（${village.classTitle(ch)} Lv.${ch.level}）・${AREAS[s.area].name} 深度 ${s.depth}・${floor}・${formatTime(s.elapsed * 1000)}`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
  // 獎勵禮包：紀錄一直保留到在村莊領取，沒有角色時提示先建立角色。
  const pending = store.loadRewards().filter((r) => !app.claimed.includes(r.id)).length;
  $('home-gifts').hidden = !pending;
  $('home-gifts').innerHTML = pending
    ? `<img src="${itemDataUrl('gift')}" alt=""><span><b>有 ${pending} 個獎勵禮包等你領取</b><small>${app.chars.size ? '選擇角色進入村莊，點上方 🎁 領取到該角色的背包' : '禮包會一直保留，建立角色後到村莊點上方 🎁 領取'}</small></span>`
    : '';
  els.charList.innerHTML = CLASS_KEYS.map((cls) => {
    const ch = app.chars.get(cls);
    if (!ch) {
      return `<button type="button" class="char-card empty" data-create="${cls}"><img src="${heroDataUrl(cls)}" alt="" class="char-img ghost"><span class="char-text"><b>建立${CLASSES[cls].name}</b><small>${classBlurb(cls)}</small></span></button>`;
    }
    const best = AREA_KEYS.filter((a) => village.areaUnlocked(ch, a)).pop();
    const busy = app.run && app.run.charId === cls ? '<em class="busy">探險中</em>' : '';
    return `<button type="button" class="char-card" data-char="${cls}" data-cls="${cls}"><img src="${heroDataUrl(cls)}" alt="" class="char-img"><span class="char-text"><b>${esc(ch.name)} ${busy}</b><small>${village.classTitle(ch)}${ch.rebirth ? ` ${'★'.repeat(ch.rebirth)}` : ''}・Lv.${ch.level}・${AREAS[best].name} 深度 ${village.maxDepth(ch, best)}</small><small class="gold-text">${ch.gold}G</small></span></button>`;
  }).join('');
}

/**
 * 職業簡介。
 * @param {string} cls 職業。
 * @returns {string} 文字。
 */
function classBlurb(cls) {
  return { warrior: '近戰・耐打・扇形揮砍', archer: '遠程・靈活・直線射箭', mage: '遠程・範圍・爆炸法球', thief: '近戰・快攻・爆擊與毒', monk: '近戰・三連擊・自我回復' }[cls];
}

/**
 * 建立角色：輸入名稱後建立並進入村莊。
 * @param {string} cls 職業。
 */
async function createCharacter(cls) {
  const ok = await openModal({
    title: `建立${CLASSES[cls].name}`,
    html: `<div class="create-head"><img src="${heroDataUrl(cls, 5)}" alt="" class="char-img"><p>${classBlurb(cls)}<br><small class="muted">初始 HP ${CLASSES[cls].base.hp}・攻擊 ${CLASSES[cls].base.atk}・防禦 ${CLASSES[cls].base.def}・速度 ${CLASSES[cls].base.spd}</small></p></div>
      <label class="field">名稱（最多 8 字）<input id="name-input" type="text" maxlength="8" placeholder="${CLASSES[cls].name}" autocomplete="off"></label>`,
    actions: [
      { label: '取消', value: false },
      { label: '建立', value: true, className: 'primary' },
    ],
    dismissValue: false,
  });
  if (!ok) return;
  const name = $('name-input').value;
  const ch = store.newCharacter(cls, name);
  village.refreshShop(ch, Math.random);
  app.chars.set(cls, ch);
  await store.saveProgress(ch);
  selectCharacter(cls);
}

/**
 * 選擇角色並進入村莊；若有其他角色的探險進行中，先詢問要繼續那一趟或放棄。
 * @param {string} id 角色 id。
 */
async function selectCharacter(id) {
  if (app.run && app.run.charId === id) {
    continueRun();
    return;
  }
  if (app.run && app.run.charId !== id) {
    const other = app.chars.get(app.run.charId);
    const v = await openModal({
      title: '有進行中的探險',
      html: `<p>${esc(other.name)} 還在${AREAS[app.run.snap.area].name}探險中。同時只能進行一趟探險。</p>`,
      menu: [
        { label: `繼續 ${esc(other.name)} 的探險`, value: 'continue' },
        { label: '放棄那一趟（失去一半本趟金幣）', value: 'abandon', className: 'danger-text' },
        { label: `先保留，只進入 ${esc(app.chars.get(id).name)} 的村莊`, value: 'keep' },
      ],
      actions: [{ label: '取消', value: null }],
    });
    if (v === 'continue') {
      continueRun();
      return;
    }
    if (v === 'abandon') {
      const w = World.restore(other, app.run.snap);
      await finishRun(w, other, 'abandon', { silent: true });
    } else if (v !== 'keep') return;
  }
  app.current = id;
  store.saveMeta(id);
  app.tab = 'gate';
  showScreen('village');
  renderVillage();
}

// ---------- 村莊 ----------

/**
 * 在村莊顯示短訊息。
 * @param {string} text 訊息。
 * @param {boolean} [error=false] 是否為錯誤。
 */
function villageMessage(text, error = false) {
  els.villageMessage.textContent = text;
  els.villageMessage.classList.toggle('error', error);
  clearTimeout(app.villageMsgTimer);
  app.villageMsgTimer = setTimeout(() => {
    els.villageMessage.textContent = '';
  }, 3000);
}

/** 重新繪製村莊（頂部資訊與目前分頁）。 */
function renderVillage() {
  const ch = currentChar();
  if (!ch) return;
  $('village-avatar').src = heroDataUrl(ch.cls, 3);
  $('village-name').textContent = ch.name;
  $('village-level').textContent = `${village.classTitle(ch)}・Lv.${ch.level}${ch.level >= levelCap(ch.rebirth || 0) ? '（MAX）' : ''}`;
  $('village-gold').textContent = `${ch.gold}G`;
  // 獲得紀錄：還沒領取的數量。
  const pending = store.loadRewards().filter((r) => !app.claimed.includes(r.id)).length;
  $('gift-btn').hidden = false;
  $('gift-btn').classList.toggle('has', pending > 0);
  $('gift-count').textContent = pending ? pending : '';
  for (const b of els.villageTabs.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.tab === app.tab));
  const panels = { gate: gatePanel, shop: shopPanel, smith: smithPanel, gem: gemPanel, bag: bagPanel, skill: skillPanel, hero: heroPanel };
  els.villagePanel.innerHTML = panels[app.tab](ch);
  // 剛進入區域畫面時，地圖捲到目前進度的關卡。
  if (app.tab === 'gate' && app.gateArea && app.lastTab !== 'gate') {
    const node = els.villagePanel.querySelector('.map-node.current') || [...els.villagePanel.querySelectorAll('.map-node.cleared')].pop();
    if (node) requestAnimationFrame(() => node.scrollIntoView({ block: 'center' }));
  }
  app.lastTab = app.tab;
}

/**
 * 地城入口分頁：區域、深度與攜帶物品。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function gatePanel(ch) {
  const busy = app.run ? `<p class="notice-inline">${esc(app.chars.get(app.run.charId).name)} 的探險尚未結束，開始新的探險前須先完成或放棄那一趟。</p>` : '';
  const rb = ch.rebirth || 0;
  const bonus = rb
    ? `<button type="button" class="rebirth-bonus" data-info="rebirthBonus">${'★'.repeat(rb)} 轉職加成：怪物 +${Math.round(REBIRTH.monster * rb * 100)}%・掉落 +${REBIRTH.dropLevel * rb} 級・獎勵 +${Math.round(REBIRTH.reward * rb * 100)}%</button>`
    : '';
  // 攜帶道具：這趟會帶的數量；持有比每趟上限多時，另外標示持有數量（例如「10／57」）。
  const carry = [['potion', ch.potions, LIMITS.potions, '回復藥水'], ['cure', ch.cures || 0, LIMITS.cures, '淨化藥水'], ['key', ch.scroll, 1, '回城卷軸']]
    .map(([icon, have, cap, name]) => {
      const n = Math.min(cap, have);
      const label = have > cap ? `${name}：這趟帶 ${n}，持有 ${have}` : `${name}：${n}`;
      return `<span class="carry-chip${n ? '' : ' none'}" title="${label}" aria-label="${label}"><img src="${itemDataUrl(icon)}" alt=""><b>${n}</b>${have > cap ? `<small class="carry-have">／${have}</small>` : ''}</span>`;
    }).join('');
  const top = `${busy}<div class="gate-top"><div class="carry-chips">${carry}<small class="muted">在商店補充</small></div>${bonus}</div>`;
  if (app.gateArea && village.areaUnlocked(ch, app.gateArea)) return top + areaView(ch, app.gateArea);
  app.gateArea = null;
  // 第一層：區域由上往下排成卡片（進度條、破關次數；目前進度所在的區域標示「進行中」）。
  const current = [...AREA_KEYS].reverse().find((a) => village.areaUnlocked(ch, a));
  const cards = AREA_KEYS.map((area, ai) => {
    const a = AREAS[area];
    const unlocked = village.areaUnlocked(ch, area);
    const total = a.maxDepth || 5;
    const open = village.maxDepth(ch, area);
    const cleared = Array.from({ length: total }, (_, k) => (ch.clears && ch.clears[`${area}-${k + 1}`]) || 0).filter(Boolean).length;
    const clears = Object.entries(ch.clears || {}).filter(([k]) => k.startsWith(`${area}-`)).reduce((n, [, v]) => n + v, 0);
    const prev = AREA_KEYS[ai - 1];
    const sub = unlocked
      ? `<span class="area-progress"><i style="width:${((cleared / total) * 100).toFixed(1)}%"></i></span><small>已破關 ${cleared}／${total} 深度・開放到深度 ${open}・累計破關 ${clears} 次</small>`
      : `<small class="area-lock">🔒 擊敗${AREAS[prev].name}的 Boss 後解鎖</small>`;
    return `<button type="button" class="area-banner area-card-btn theme-${a.theme}${unlocked ? '' : ' locked'}" data-gate-area="${area}"${unlocked ? '' : ' aria-disabled="true"'}>
      <div class="area-top"><img class="area-boss" src="${monsterDataUrl(a.boss[0], 2)}" alt=""><div class="area-title"><b>${ai + 1}・${a.name}${area === current ? ' <em class="now-tag">進行中</em>' : ''}</b><small>${a.boss.length > 1 ? '隨機強化 Boss' : `Boss：${BOSSES[a.boss[0]].name}`}</small></div><span class="rec-chip">Lv.${a.recommend[0]}～${a.recommend[1]}</span>${unlocked ? '<span class="area-go">›</span>' : ''}</div>
      ${sub}</button>`;
  }).join('');
  return `${top}<div class="area-list">${cards}</div>
    <p class="muted small">點區域選擇深度並出發。同一關破關滿 ${EVOLVE.clears} 次後，打倒 Boss 有 ${Math.round(EVOLVE.chance * 100)}% 機率復活成進化 Boss。</p>`;
}

/** 地圖上各區域的主題色（區域周圍的暈染）。 */
const MAP_TINT = { grass: '#7fb050', moss: '#5f8a4a', lava: '#d0602a', ice: '#6fa8d8', sky: '#8cc4ec', necro: '#8a7a9a', desert: '#d8b070', sea: '#4fa0b0', clock: '#c8a050', dragon: '#d0602a', demon: '#c03a5a', abyss: '#7a4fa8' };

/**
 * 區域地圖的版面：這個區域的所有深度排成一條由上往下的蛇行小路（每行 3 關），Boss 頭像放在最後一關之後。
 * 座標為地圖的邏輯像素（寬 360），y 由上往下。
 * @param {string} area 區域代碼。
 * @returns {{nodes: {area: string, depth: number, x: number, y: number, ai: number}[], boss: {x: number, y: number}, width: number, height: number}} 版面。
 */
function mapLayout(area) {
  app.mapLayouts = app.mapLayouts || {};
  if (app.mapLayouts[area]) return app.mapLayouts[area];
  const perRow = 3;
  const rowH = 82;
  const cols = [62, 180, 298];
  const max = AREAS[area].maxDepth || 5;
  const ai = AREA_KEYS.indexOf(area);
  const nodes = [];
  for (let d = 1; d <= max; d++) {
    const row = Math.floor((d - 1) / perRow);
    const k = (d - 1) % perRow;
    const col = row % 2 ? perRow - 1 - k : k;
    // 固定的小幅偏移，讓小路看起來自然一點。
    const jx = ((d * 37) % 15) - 7;
    const jy = ((d * 53) % 15) - 7;
    nodes.push({ area, depth: d, ai, x: cols[col] + jx, y: 60 + row * rowH + jy });
  }
  // Boss 在最後一關的下一個位置（剛好排滿時放在下一行）。
  const next = max;
  const row = Math.floor(next / perRow);
  const k = next % perRow;
  const boss = { x: cols[row % 2 ? perRow - 1 - k : k], y: 60 + row * rowH };
  const height = boss.y + 70;
  app.mapLayouts[area] = { nodes, boss, width: 360, height };
  return app.mapLayouts[area];
}

/**
 * 區域畫面：返回按鈕、區域橫幅，以及這個區域的關卡地圖（羊皮紙底、由上往下的小路、最後是 Boss）。
 * 關卡圖釘：已破關（藍）、目前可挑戰（金色發光）、尚未開放（墓碑）；可能進化的關卡加上火焰標記。
 * @param {object} ch 角色。
 * @param {string} area 區域代碼。
 * @returns {string} HTML。
 */
function areaView(ch, area) {
  const a = AREAS[area];
  const ai = AREA_KEYS.indexOf(area);
  const { nodes, boss, width, height } = mapLayout(area);
  const pct = (x, y) => `left:${((x / width) * 100).toFixed(2)}%;top:${((y / height) * 100).toFixed(2)}%`;
  const pts = [...nodes, boss];
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const sameRow = Math.abs(p0.y - p1.y) < 30;
    const out = p0.x < 180 ? -46 : 46;
    d += sameRow ? ` C${(p0.x + p1.x) / 2},${p0.y} ${(p0.x + p1.x) / 2},${p1.y} ${p1.x},${p1.y}` : ` C${p0.x + out},${p0.y} ${p1.x + out},${p1.y} ${p1.x},${p1.y}`;
  }
  const tint = MAP_TINT[a.theme];
  const svg = `<svg class="map-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
      <defs><filter id="map-blur"><feGaussianBlur stdDeviation="14"/></filter></defs>
      <g filter="url(#map-blur)">${pts.map((n) => `<circle cx="${n.x}" cy="${n.y}" r="56" fill="${tint}" opacity="0.32"/>`).join('')}</g>
      <path d="${d}" fill="none" stroke="#6b4a2a" stroke-width="15" stroke-linecap="round" opacity="0.55"/>
      <path d="${d}" fill="none" stroke="#c9a46a" stroke-width="10" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#e8d0a0" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round"/>
    </svg>`;
  const max = village.maxDepth(ch, area);
  let current = null;
  const pins = nodes.map((n) => {
    const open = n.depth <= max;
    const clears = (ch.clears && ch.clears[`${area}-${n.depth}`]) || 0;
    if (open && !clears && !current) current = n;
    const cls = !open ? 'locked' : clears ? 'cleared' : 'open';
    const evo = clears >= EVOLVE.clears ? '<i class="pin-evo" aria-hidden="true">🔥</i>' : '';
    return `<button type="button" class="map-node ${cls}${current === n ? ' current' : ''}" style="${pct(n.x, n.y)}" data-map-node="${area}:${n.depth}" aria-label="深度 ${n.depth}${open ? (clears ? `，破關 ${clears} 次` : '，可挑戰') : '，尚未開放'}">
      <span class="pin">${open ? '' : '✝'}</span>${evo}<small class="pin-label">${ai + 1}-${n.depth}${clears ? `<i>✓${clears}</i>` : ''}</small></button>`;
  });
  const bossImg = `<img class="map-boss big" style="${pct(boss.x, boss.y)}" src="${monsterDataUrl(a.boss[0], 3)}" alt="Boss"><span class="map-boss-tag" style="${pct(boss.x, boss.y + 34)}">Boss</span>`;
  return `<div class="area-head-bar"><button type="button" class="link-btn" data-gate-back="1">‹ 所有區域</button></div>
    <div class="area-banner theme-${a.theme}"><div class="area-top"><img class="area-boss" src="${monsterDataUrl(a.boss[0], 2)}" alt=""><div class="area-title"><b>${ai + 1}・${a.name}</b><small>${a.boss.length > 1 ? '隨機強化 Boss' : `Boss：${BOSSES[a.boss[0]].name}`}・每趟 3 層＋Boss</small></div><span class="rec-chip">Lv.${a.recommend[0]}～${a.recommend[1]}</span></div></div>
    <div class="world-map" style="aspect-ratio:${width} / ${height}">${svg}${bossImg}${pins.join('')}</div>
    <p class="muted small">點關卡查看並出發：藍色為已破關、金色為目前可挑戰、墓碑為尚未開放。</p>`;
}

/**
 * 點地圖上的關卡：顯示區域、Boss、地城等級、破關次數與進化機率，並可出發；尚未開放時說明解鎖條件。
 * @param {object} ch 角色。
 * @param {string} key 「區域:深度」。
 * @returns {Promise<void>}
 */
async function openMapNode(ch, key) {
  const [area, depthText] = key.split(':');
  const depth = Number(depthText);
  const a = AREAS[area];
  const max = village.maxDepth(ch, area);
  const ai = AREA_KEYS.indexOf(area);
  const title = `${ai + 1}-${depth}　${a.name} 深度 ${depth}`;
  const boss = `<div class="node-head"><img src="${monsterDataUrl(a.boss[0], 3)}" alt=""><div><b>${a.boss.length > 1 ? '隨機強化 Boss' : `Boss：${BOSSES[a.boss[0]].name}`}</b><small class="muted">${village.depthLabel(area, depth)}・建議 Lv.${a.recommend[0]}～${a.recommend[1]}</small></div></div>`;
  if (depth > max) {
    const prev = AREA_KEYS[ai - 1];
    const why = !village.areaUnlocked(ch, area) ? `擊敗${AREAS[prev].name}的 Boss 後解鎖。` : `擊敗深度 ${depth - 1} 的 Boss 後解鎖。`;
    await openModal({ title, html: `${boss}<p>🔒 ${why}</p>`, actions: [{ label: '知道了', value: null, className: 'primary' }] });
    return;
  }
  const clears = (ch.clears && ch.clears[`${area}-${depth}`]) || 0;
  const evo = clears >= EVOLVE.clears ? `<p class="evo-note">🔥 打倒 Boss 時有 ${Math.round(EVOLVE.chance * 100)}% 機率復活成進化 Boss（獎勵更好）</p>` : `<p class="muted small">再破關 ${EVOLVE.clears - clears} 次後，Boss 有機會進化。</p>`;
  const go = await openModal({
    title,
    html: `${boss}<div class="mini-tiles"><span class="mini-tile"><small>樓層</small><b>3＋Boss</b></span><span class="mini-tile"><small>破關</small><b>${clears} 次</b></span><span class="mini-tile"><small>地城等級</small><b>${Math.round(dungeonLevel(area, depth, 0))}</b></span></div>${evo}${app.run ? '<p class="notice-inline">有探險尚未結束，請先完成或放棄那一趟。</p>' : ''}`,
    actions: [{ label: '取消', value: false }, { label: '出發', value: true, className: 'primary' }],
  });
  if (go && !app.run) startRun(area, depth);
}

/**
 * 商店分頁：藥水、卷軸、裝備與賣出。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function shopPanel(ch) {
  if (!ch.shop || !ch.shopBooks) village.refreshShop(ch, Math.random);
  const goods = `<div class="shop-row"><img src="${itemDataUrl('potion')}" alt="" class="icon"><div class="item-main"><b>回復藥水</b><span class="item-stats">回復 40% HP・持有 ${ch.potions}／${LIMITS.potionHold}・每趟帶 ${LIMITS.potions} 瓶</span></div><button type="button" class="buy-btn" data-buy="potion">${LIMITS.potionPrice}G</button></div>
    <div class="shop-row"><img src="${itemDataUrl('cure')}" alt="" class="icon"><div class="item-main"><b>淨化藥水</b><span class="item-stats">解除中毒、睡眠、暈眩（睡眠或暈眩中也能喝）・持有 ${ch.cures || 0}／${LIMITS.cureHold}・每趟帶 ${LIMITS.cures} 瓶</span></div><button type="button" class="buy-btn" data-buy="cure">${LIMITS.curePrice}G</button></div>
    <div class="shop-row"><img src="${itemDataUrl('key')}" alt="" class="icon"><div class="item-main"><b>回城卷軸</b><span class="item-stats">帶著全部所得返回村莊・持有 ${ch.scroll}／1</span></div><button type="button" class="buy-btn" data-buy="scroll">${LIMITS.scrollPrice}G</button></div>
    <div class="shop-row"><img src="${itemDataUrl('pouch')}" alt="" class="icon"><div class="item-main"><b>背包擴充袋</b><span class="item-stats">背包上限 +${BAG_EXPAND.step} 格・目前 ${village.bagLimit(ch)}／${BAG_EXPAND.max} 格${ch.bagExpand ? `・持有 ${ch.bagExpand} 個` : ''}・商店剩 ${Math.max(0, BAG_EXPAND.shopMax - village.pouchesBought(ch))}／${BAG_EXPAND.shopMax} 個（賣完後打怪取得）</span></div><button type="button" class="buy-btn" data-buy="pouch"${village.bagExpandPrice(ch) === Infinity ? ' disabled' : ''}>${village.bagExpandPrice(ch) !== Infinity ? `${village.bagExpandPrice(ch)}G` : village.pouchesBought(ch) >= BAG_EXPAND.shopMax ? '已賣完' : '已達上限'}</button></div>`;
  const items = ch.shop.length
    ? ch.shop.map((e, i) => `<div class="shop-row">${itemHtml(e.item)}${compareHtml(ch, e.item)}<button type="button" class="buy-btn" data-buy-item="${i}">${e.price}G</button></div>`).join('')
    : '<p class="muted">今天的裝備都賣完了，下次回村莊時會進新貨。</p>';
  // 賣出：背包中的裝備與技能書。
  const sbooks = Object.keys(ch.skillBooks || {}).filter((id) => ch.skillBooks[id] > 0)
    .map((id) => `<div class="shop-row"><img src="${itemDataUrl('skillbook')}" alt="" class="icon"><div class="item-main"><span class="item-title"><span class="rarity r${skills.SKILLS[id].rarity || 0}">${RARITIES[skills.SKILLS[id].rarity || 0].name}</span> <b class="item-name r${skills.SKILLS[id].rarity || 0}">技能書「${skills.SKILLS[id].name}」</b> <small class="muted">×${ch.skillBooks[id]}</small></span><span class="item-stats">適合：${skills.suitedName(id, CLASSES)}${skills.learnedBooks(ch).includes(id) ? '・已學會' : ''}</span></div><button type="button" class="sell-btn" data-sell-sbook="${id}">賣 ${village.skillBookPrice(id)}G</button></div>`).join('');
  const sell = ch.bag.length || sbooks
    ? ch.bag.map((it) => `<div class="shop-row">${itemHtml(it)}<button type="button" class="sell-btn" data-sell="${it.id}">賣 ${sellPrice(it)}G</button></div>`).join('') + sbooks
    : '<p class="muted">背包是空的。</p>';
  const books = ch.shopBooks.length
    ? ch.shopBooks.map((slot, i) => `<div class="shop-row"><img src="${itemDataUrl('book')}" alt="" class="icon"><div class="item-main"><b>${village.bookName(slot)}</b><span class="item-stats">在鐵匠用材料合成一件${ITEM_SLOTS[slot]}・持有 ${(ch.books && ch.books[slot]) || 0} 本</span></div><button type="button" class="buy-btn" data-buy-book="${i}">${CRAFT.bookPrice}G</button></div>`).join('')
    : '<p class="muted">今天的製作書都賣完了。</p>';
  return `<h3>道具</h3>${goods}<h3>製作書 <small class="muted">（每次返回村莊時刷新）</small></h3>${books}<h3>今日裝備 <small class="muted">（每次返回村莊時刷新）</small></h3>${items}<h3>賣出 <small class="muted">背包 ${village.bagUsed(ch)}／${village.bagLimit(ch)} 格</small></h3>${sell}`;
}

/**
 * 與目前穿戴的同部位裝備比較（攻擊、防禦、HP 的差值）。
 * @param {object} ch 角色。
 * @param {object} item 裝備。
 * @returns {string} HTML。
 */
function compareHtml(ch, item) {
  const pb = skills.passiveBonus(ch);
  const now = characterStats(ch.cls, ch.level, Object.values(ch.equipped), ch.rebirth || 0, pb);
  const eq = { ...ch.equipped, [village.slotFor(ch, item)]: item };
  // 雙手武器會卸下副手；裝備副手時若拿著雙手武器則無法比較。
  if (weaponHands(item) === 2) eq.offhand = null;
  const next = characterStats(ch.cls, ch.level, Object.values(eq), ch.rebirth || 0, skills.passiveBonus({ ...ch, equipped: eq }));
  const parts = [];
  for (const [k, name] of [['atk', '攻擊'], ['def', '防禦'], ['hp', 'HP'], ['spd', '速度']]) {
    const d = next[k] - now[k];
    if (d) parts.push(`<span class="${d > 0 ? 'up' : 'down'}">${name}${d > 0 ? '▲' : '▼'}${Math.abs(d)}</span>`);
  }
  return parts.length ? `<span class="compare">${parts.join(' ')}</span>` : '';
}

/**
 * 鐵匠分頁：強化裝備欄與背包中的裝備。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function smithPanel(ch) {
  // 材料：每種一格（品質色外框與數量）；製作書：每個部位一格（部位圖示、書本標記與持有數量）。
  const mats = MATERIALS.map((m, t) => `<span class="inv-cell stack static r${t}" title="${m.name}"><img src="${itemDataUrl(m.key)}" alt="${m.name}"><b class="cell-count">${(ch.mats && ch.mats[m.key]) || 0}</b><small class="cell-name">${m.name}</small></span>`).join('');
  const craft = CRAFT.books.map((slot) => {
    const have = (ch.books && ch.books[slot]) || 0;
    return `<button type="button" class="inv-cell book-cell${have ? '' : ' none'}" data-craft-book="${slot}" aria-label="${village.bookName(slot)} ×${have}"><img src="${itemDataUrl(SLOT_ICONS[slot])}" alt=""><img class="book-badge" src="${itemDataUrl('book')}" alt=""><b class="cell-count">${have}</b><small class="cell-name">${ITEM_SLOTS[slot]}</small></button>`;
  }).join('');
  const list = [...Object.values(ch.equipped).filter(Boolean), ...ch.bag];
  const rows = list.length ? list.map((it) => {
    const worn = wornTag(ch, it);
    if (it.enhance >= 10) return `<div class="shop-row">${itemHtml(it)}${worn}<span class="muted">已達 +10</span></div>`;
    const chance = Math.round(village.enhanceChance(it) * 100);
    return `<div class="shop-row">${itemHtml(it)}${worn}<button type="button" class="buy-btn" data-enhance="${it.id}">+${it.enhance + 1}<small>${enhanceCost(it)}G・${chance}%</small></button></div>`;
  }).join('') : '<p class="muted">還沒有可以強化的裝備。</p>';
  // 子頁面：製作、強化。
  const tabs = [['craft', '製作'], ['enhance', '強化']].map(([k, name]) => `<button type="button" role="tab" data-smith-tab="${k}" aria-selected="${app.smithTab === k}">${name}</button>`).join('');
  const body = app.smithTab === 'enhance'
    ? `<p class="muted small">每級主屬性 +8%；+6 起可能失敗，失敗時等級不變、金幣照扣。</p>${rows}`
    : `<h3>材料</h3><div class="inv-grid craft-grid">${mats}</div>
    <h3>製作書 <small class="muted">（點製作書選品質合成）</small></h3><div class="inv-grid craft-grid">${craft}</div>
    <p class="muted small">製作書 1 本＋同品質材料 ${CRAFT.cost} 個，做出保證該品質、等級為角色等級的裝備。材料來自分解裝備（在倉庫點裝備選「分解」）；製作書從打怪、寶箱或商店取得。</p>`;
  return `<div class="sub-tabs" role="tablist">${tabs}</div>${body}`;
}

/**
 * 寶石分頁：寶石袋（合成）與裝備的寶石孔（鑲嵌、取下）。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function gemPanel(ch) {
  const owned = ownedGems(ch);
  const pouch = owned.length
    ? `<div class="inv-grid">${owned.map(([key, n]) => gemCell(key, n, `data-gem-cell="${key}"`)).join('')}</div>`
    : '<p class="muted">寶石袋是空的。打倒怪物、打開寶箱取得；每升到 5 的倍數等級也會送 1 顆。</p>';
  const list = [...EQUIP_SLOTS.map((e) => ch.equipped[e.key]).filter(Boolean), ...ch.bag];
  const cards = list.length
    ? list.map((it) => {
      const gems = it.gems || [];
      const holes = [];
      for (let k = 0; k < socketCount(it); k++) {
        const key = gems[k];
        holes.push(key
          ? gemCell(key, 0, `data-unsocket="${it.id}" data-index="${k}"`)
          : `<button type="button" class="gem-cell empty" data-socket="${it.id}" aria-label="空孔，鑲嵌寶石"${owned.length ? '' : ' disabled'}>＋</button>`);
      }
      const slot = EQUIP_SLOTS.find((e) => ch.equipped[e.key] === it);
      return `<div class="socket-card r${it.rarity}"><span class="inv-cell r${it.rarity} static"><img src="${itemDataUrl(itemIconName(it))}" alt="">${it.enhance ? `<b class="cell-plus">+${it.enhance}</b>` : ''}</span>
        <span class="socket-info"><b class="item-name r${it.rarity}">${esc(it.name)}</b><small class="muted">${slot ? `裝備中・${slot.name}` : '背包'}・${socketCount(it)} 孔</small></span>
        <span class="socket-holes">${holes.join('')}</span></div>`;
    }).join('')
    : '<p class="muted">還沒有裝備。</p>';
  return `<h3>寶石袋 <small class="muted">（點寶石查看效果與合成）</small></h3>${pouch}
    <h3>鑲嵌 <small class="muted">（點「＋」鑲嵌，點寶石取下）</small></h3>${cards}
    <p class="muted small">普通與精良裝備 1 孔、稀有與傳說 2 孔。持續型寶石 ${GEM_RULES.fuse} 顆同級可合成高一級（Ⅰ～Ⅴ，效果 5%～15%）；寶石的吸血合計最多 ${GEM_RULES.leechCap}%。主動寶石在地城以按鈕使用，同種只算一個、最多 ${GEM_RULES.actives} 個按鈕。取下寶石免費，寶石不會損壞。</p>`;
}

/**
 * 寶石袋中持有的寶石（依種類與等級排序）。
 * @param {object} ch 角色。
 * @returns {[string, number][]} 寶石代碼與數量。
 */
function ownedGems(ch) {
  const order = Object.keys(GEMS);
  return Object.entries(ch.gems || {}).filter(([, n]) => n > 0).sort(([a], [b]) => {
    const ga = parseGem(a);
    const gb = parseGem(b);
    return order.indexOf(ga.kind) - order.indexOf(gb.kind) || gb.tier - ga.tier;
  });
}

/** 寶石等級的羅馬數字。 */
const TIER_MARK = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];

/**
 * 寶石格子：寶石圖示、寶石顏色的外框、等級（Ⅰ～Ⅴ，主動寶石為「主」）與數量。
 * @param {string} key 寶石代碼。
 * @param {number} n 數量（0 時不顯示，例如已鑲在裝備上的寶石）。
 * @param {string} attrs 按鈕的額外屬性（點擊用的 data 屬性）。
 * @param {boolean} [label=false] 是否在格子下方顯示名稱。
 * @returns {string} HTML。
 */
function gemCell(key, n, attrs, label = false) {
  const g = parseGem(key);
  const d = GEMS[g.kind];
  return `<button type="button" class="gem-cell" style="--gem:${d.color}" ${attrs} aria-label="${gemName(key)}${n ? ` ×${n}` : ''}">${gemIconImg(key)}<b class="cell-tier">${d.active ? '主' : TIER_MARK[g.tier - 1]}</b>${n ? `<b class="cell-count">${n}</b>` : ''}${label ? `<small class="gem-label">${d.active ? d.label : `${d.stat} +${d.values[g.tier - 1]}%`}</small>` : ''}</button>`;
}

/**
 * 寶石圖示（不含外框）。
 * @param {string} key 寶石代碼。
 * @returns {string} HTML。
 */
function gemIconImg(key) {
  return `<img src="${itemDataUrl(`gem-${parseGem(key).kind}`)}" alt="">`;
}

/**
 * 倉庫分頁：分成「個人」（人物裝備圖與背包）與「共用」（所有角色共用的金幣與倉庫）兩個子頁面。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function bagPanel(ch) {
  const limit = village.bagLimit(ch);
  const used = village.bagUsed(ch);
  const cells = [
    ...ch.bag.map((it) => itemCell(it, `item:${it.id}`)),
    ...MATERIALS.filter((m) => ch.mats && ch.mats[m.key] > 0).map((m, k) => stackCell(m.key, ch.mats[m.key], `mat:${m.key}`, `r${MATERIALS.indexOf(m)}`, m.name)),
    ...CRAFT.books.filter((b) => ch.books && ch.books[b] > 0).map((b) => stackCell('book', ch.books[b], `book:${b}`, 'book', village.bookName(b))),
    ...Object.keys(ch.gifts || {}).filter((t) => ch.gifts[t] > 0).sort().map((t) => stackCell('gift', ch.gifts[t], `gift:${t}`, `gift-cell tier${t}`, `${GIFT.names[t - 1]}`)),
    ...Object.keys(ch.shards || {}).filter((id) => ch.shards[id] > 0).map((id) => stackCell('shard', ch.shards[id], `shard:${id}`, `sbook r${skills.SKILLS[id].rarity || 0}${ch.shards[id] >= GIFT.shardNeed ? ' ready' : ''}`, `技能書碎片「${skills.SKILLS[id].name}」`)),
    ...Object.keys(ch.skillBooks || {}).filter((id) => ch.skillBooks[id] > 0).map((id) => stackCell('skillbook', ch.skillBooks[id], `sbook:${id}`, `sbook r${skills.SKILLS[id].rarity || 0}${skills.learnedBooks(ch).includes(id) ? ' learned' : ''}`, `${RARITIES[skills.SKILLS[id].rarity || 0].name}技能書「${skills.SKILLS[id].name}」`)),
  ];
  // 空格：顯示剩下的容量（擴充背包時看得到成長）。
  for (let k = used; k < limit; k++) cells.push('<span class="inv-cell empty" aria-hidden="true"></span>');
  // 持有背包擴充袋時，在背包標題旁顯示「擴充」按鈕（已達上限時停用）。
  const full = limit >= BAG_EXPAND.max;
  const expand = ch.bagExpand > 0
    ? `<button type="button" class="expand-btn${full ? '' : ' ready'}" data-use-pouch="1"${full ? ' disabled' : ''} aria-label="使用背包擴充袋"><img src="${itemDataUrl('pouch')}" alt=""><span><b>${full ? '已達上限' : `擴充 +${BAG_EXPAND.step} 格`}</b><small>擴充袋 ×${ch.bagExpand}</small></span></button>`
    : '';
  // 子頁面：個人（裝備欄與背包）、共用（所有角色共用的金幣與倉庫）。
  const tabs = [['mine', '個人'], ['shared', `共用 ${app.shared.items.length}／${SHARED_SLOTS}`]].map(([k, name]) => `<button type="button" role="tab" data-bag-tab="${k}" aria-selected="${app.bagTab === k}">${name}</button>`).join('');
  if (app.bagTab === 'shared') return `<div class="sub-tabs" role="tablist">${tabs}</div>${sharedHtml(ch)}`;
  return `<div class="sub-tabs" role="tablist">${tabs}</div><h3>裝備欄 <small class="muted">（點格子查看與卸下）</small></h3>${paperDoll(ch)}
    <div class="bag-head"><h3>背包 <small class="muted">${used}／${limit} 格${limit < BAG_EXPAND.max && !expand ? `・擴充袋最多到 ${BAG_EXPAND.max} 格` : ''}</small></h3>${expand}</div>
    <div class="inv-grid">${cells.join('')}</div>
    <p class="muted small">點格子查看裝備資訊並操作（裝備、分解、存入共用、賣出）。每種材料與製作書只佔 1 格，最多疊 ${LIMITS.stack} 個。</p>`;
}

/**
 * 裝備的格子圖示：武器依類型（劍、斧、弓弩、法杖、匕首、拳套），其他依部位。
 * @param {object} item 裝備。
 * @returns {string} 圖示名稱（ITEM_ART 的鍵）。
 */
function itemIconName(item) {
  if (item.slot === 'weapon') return { 劍: 'sword', 斧: 'axe', 弓: 'bow', 弩: 'bow', 法杖: 'staff', 魔杖: 'staff', 匕首: 'dagger', 雙匕: 'daggers', 拳套: 'fist' }[item.type] || 'sword';
  return SLOT_ICONS[item.slot];
}

/**
 * 一件裝備的背包格子：圖示、稀有度外框、強化值與鑲嵌的寶石色點。
 * @param {object} it 裝備。
 * @param {string} key 點擊時的代碼。
 * @param {string} [attr='data-cell'] 點擊代碼的屬性名稱。
 * @returns {string} HTML。
 */
function itemCell(it, key, attr = 'data-cell') {
  const gems = (it.gems || []).map((g) => `<i style="--gem:${GEMS[parseGem(g).kind].color}"></i>`).join('');
  const hands = weaponHands(it) === 2 ? '<b class="cell-tag">雙</b>' : '';
  return `<button type="button" class="inv-cell r${it.rarity}" ${attr}="${key}" aria-label="${RARITIES[it.rarity].name}・${esc(it.name)}${it.enhance ? ` +${it.enhance}` : ''}"><img src="${itemDataUrl(itemIconName(it))}" alt="">${it.enhance ? `<b class="cell-plus">+${it.enhance}</b>` : ''}${hands}${gems ? `<span class="cell-gems">${gems}</span>` : ''}</button>`;
}

/**
 * 堆疊道具的背包格子（材料、製作書、擴充袋）：圖示與右下角的數量。
 * @param {string} icon 圖示名稱。
 * @param {number} n 數量。
 * @param {string} key 點擊時的代碼。
 * @param {string} cls 額外的 class（材料以稀有度著色）。
 * @param {string} name 名稱（無障礙標籤）。
 * @returns {string} HTML。
 */
function stackCell(icon, n, key, cls, name) {
  return `<button type="button" class="inv-cell stack ${cls}" data-cell="${key}" aria-label="${name} ×${n}"><img src="${itemDataUrl(icon)}" alt=""><b class="cell-count">${n}</b></button>`;
}

/**
 * 點背包格子：顯示內容與可做的操作，並執行玩家選的操作。
 * @param {object} ch 角色。
 * @param {string} key 格子代碼（item:id、mat:key、book:slot 等）。
 * @returns {Promise<{r: {ok: boolean, message: string}, shared?: boolean} | null>} 操作結果；關閉時為 null。
 */
async function openBagCell(ch, key) {
  const [kind, id] = key.split(':');
  if (kind === 'gift') {
    const tier = Number(id);
    const k = tier - 1;
    const n = ch.gifts[id];
    const act = await openModal({
      title: `${GIFT.names[k]} ×${n}`,
      html: `<div class="gift-head"><span class="inv-cell stack static gift-cell tier${tier}"><img src="${itemDataUrl('gift')}" alt=""></span><p>來自其他遊戲的第一次過關或第一次全對。開啟可以得到：</p></div>
        <ul><li>金幣 ${GIFT.gold[k]}G</li><li>裝備材料 ${GIFT.mats[k]} 個（等級愈高，高品質材料愈多）</li><li>技能書碎片 ${GIFT.shards[k]} 片（同一本的碎片 ${GIFT.shardNeed} 片合成 1 本技能書）</li>
        <li>機率：回復藥水 ${GIFT.potions[k]} 瓶（${Math.round(GIFT.potionChance[k] * 100)}%）、淨化藥水 ${GIFT.cures[k]} 瓶（${Math.round(GIFT.cureChance[k] * 100)}%）、背包擴充袋（${Math.round(GIFT.pouchChance[k] * 100)}%）</li></ul>
        <p class="muted">藥水超過持有上限（各 ${LIMITS.potionHold} 瓶）或背包已擴充到 ${BAG_EXPAND.max} 格時，改為金幣。</p>`,
      actions: [{ label: '關閉', value: null }, ...(n > 1 ? [{ label: `全部開啟（${n}）`, value: 'all' }] : []), { label: '開啟', value: 'one', className: 'primary' }],
    });
    if (!act) return null;
    // 開啟（可以連續開全部），彙整得到的內容。
    const total = { gold: 0, mats: {}, shards: {}, potions: 0, cures: 0, pouch: 0, converted: 0 };
    let opened = 0;
    let last = null;
    for (let i = 0; i < (act === 'all' ? n : 1); i++) {
      last = village.openGift(ch, tier, Math.random);
      if (!last.ok) break;
      opened++;
      total.gold += last.gold;
      for (const f of ['potions', 'cures', 'pouch', 'converted']) total[f] += last[f];
      for (const [m, c] of Object.entries(last.mats)) total.mats[m] = (total.mats[m] || 0) + c;
      for (const [s2, c] of Object.entries(last.shards)) total.shards[s2] = (total.shards[s2] || 0) + c;
    }
    if (!opened) return { r: last };
    const matList = Object.entries(total.mats).map(([m, c]) => `<span class="loot-chip"><img src="${itemDataUrl(m)}" alt="">${MATERIALS.find((x) => x.key === m).name} ×${c}</span>`).join('');
    const shardList = Object.entries(total.shards).map(([s2, c]) => `<span class="loot-chip r${skills.SKILLS[s2].rarity || 0}"><img src="${itemDataUrl('shard')}" alt=""><b class="item-name r${skills.SKILLS[s2].rarity || 0}">${skills.SKILLS[s2].name}</b> 碎片 ×${c}<small class="muted">（持有 ${ch.shards[s2]}／${GIFT.shardNeed}）</small></span>`).join('');
    const extras = [
      total.potions ? `<span class="loot-chip"><img src="${itemDataUrl('potion')}" alt="">回復藥水 ×${total.potions}</span>` : '',
      total.cures ? `<span class="loot-chip"><img src="${itemDataUrl('cure')}" alt="">淨化藥水 ×${total.cures}</span>` : '',
      total.pouch ? `<span class="loot-chip"><img src="${itemDataUrl('pouch')}" alt="">背包擴充袋 ×${total.pouch}</span>` : '',
    ].join('');
    const goldNote = total.converted ? `<small class="muted">（含超過上限換成的 ${total.converted}G）</small>` : '';
    await openModal({ title: `開啟了 ${opened} 個${GIFT.names[k]}`, html: `<p class="gold-text">金幣 +${total.gold}G ${goldNote}</p>${extras ? `<h3>道具</h3><div class="loot-chips">${extras}</div>` : ''}<h3>裝備材料</h3><div class="loot-chips">${matList}</div><h3>技能書碎片</h3><div class="loot-chips">${shardList}</div>${last.ok ? '' : `<p class="notice-inline">${last.message}，其餘的禮包沒有開啟。</p>`}`, actions: [{ label: '好', value: null, className: 'primary' }] });
    return { r: { ok: true, message: `開啟了 ${opened} 個${GIFT.names[k]}` } };
  }
  if (kind === 'shard') {
    const s2 = skills.SKILLS[id];
    const have = ch.shards[id];
    const act = await openModal({
      title: `技能書碎片 ×${have}`,
      html: `<div class="skill-detail"><span class="skill-ico big">${skillIcon(id, s2.kind)}</span><div><span class="item-title"><span class="rarity r${s2.rarity || 0}">${RARITIES[s2.rarity || 0].name}</span> <b class="item-name r${s2.rarity || 0}">${s2.name}</b></span><small class="muted">適合職業：${skills.suitedName(id, CLASSES)}</small></div></div>
        <p>${skills.describeSkill(id, 1, skills.skillScale(ch, id))}</p>
        <p>集滿 ${GIFT.shardNeed} 片可以合成 1 本完整的技能書（目前 ${have}／${GIFT.shardNeed}）。</p>`,
      actions: [{ label: '關閉', value: null }, ...(have >= GIFT.shardNeed ? [{ label: '合成技能書', value: 'combine', className: 'primary' }] : [])],
    });
    return act === 'combine' ? { r: village.combineShards(ch, id) } : null;
  }
  if (kind === 'sbook') {
    const s = skills.SKILLS[id];
    const scale = skills.skillScale(ch, id);
    const learned = skills.learnedBooks(ch).includes(id);
    const html = `<div class="skill-detail"><span class="skill-ico big">${skillIcon(id, s.kind)}</span><div><span class="item-title"><span class="rarity r${s.rarity || 0}">${RARITIES[s.rarity || 0].name}</span> <b class="item-name r${s.rarity || 0}">${s.name}</b></span><small class="muted">適合職業：<b class="${scale < 1 ? 'down' : 'up'}">${skills.suitedName(id, CLASSES)}</b>・冷卻 ${s.cd} 秒</small></div></div>
      <p>${skills.describeSkill(id, 1, scale)}</p>
      ${scale < 1 ? `<p class="evo-note">${CLASSES[ch.cls].name}不是適合的職業，學了也能用，但強度只剩 ${Math.round(skills.BOOK_OFFCLASS * 100)}%。</p>` : ''}
      ${learned ? '<p class="muted">已經學會這個技能。</p>' : '<p class="muted small">學會後到「技能」裝進技能欄，可以用技能點升級。</p>'}`;
    const act = await openModal({
      title: `${RARITIES[s.rarity || 0].name}技能書 ×${ch.skillBooks[id]}`,
      html,
      actions: [{ label: '關閉', value: null }, { label: `賣出 ${village.skillBookPrice(id)}G`, value: 'sell' }, ...(learned ? [] : [{ label: '學習', value: 'learn', className: 'primary' }])],
    });
    if (act === 'learn') return { r: village.useSkillBook(ch, id) };
    if (act === 'sell') return { r: village.sellSkillBook(ch, id) };
    return null;
  }
  if (kind === 'mat' || kind === 'book') {
    const mat = MATERIALS.findIndex((m) => m.key === id);
    const title = kind === 'mat' ? `${MATERIALS[mat].name} ×${ch.mats[id]}` : `${village.bookName(id)} ×${ch.books[id]}`;
    const html = kind === 'mat'
      ? `<p><span class="rarity r${mat}">${RARITIES[mat].name}</span> 合成材料。分解${RARITIES[mat].name}裝備取得（分解時有 ${Math.round(CRAFT.bonus * 100)}% 機率多得 1 個高一階的材料）。</p><p>在鐵匠的「製作」用 ${CRAFT.cost} 個合成一件${RARITIES[mat].name}裝備（還需要製作書）。</p>`
      : `<p>合成一件${ITEM_SLOTS[id]}，每次用掉 1 本。需要同品質的材料 ${CRAFT.cost} 個，品質決定裝備的稀有度。</p>`;
    const act = await openModal({ title, html, actions: [{ label: '關閉', value: null }, { label: '到鐵匠製作', value: 'smith', className: 'primary' }] });
    if (act === 'smith') {
      app.tab = 'smith';
      renderVillage();
    }
    return null;
  }
  const it = ch.bag.find((i) => i.id === id);
  if (!it) return null;
  const y = village.salvageYield(it);
  const matName = (k) => MATERIALS.find((m) => m.key === k).name;
  const menu = [];
  if (!village.canWield(ch, it)) menu.push({ label: `${village.weaponOwner(it)}用的武器，${CLASSES[ch.cls].name}不能裝備`, value: null, className: 'muted-btn' });
  else if (it.slot === 'accessory') ['acc1', 'acc2'].forEach((k, n) => menu.push({ label: `裝備到飾品 ${n + 1}${ch.equipped[k] ? `（換下 ${esc(ch.equipped[k].name)}）` : ''}`, value: `equip:${k}`, className: 'primary' }));
  else menu.push({ label: `裝備${ch.equipped[village.slotFor(ch, it)] ? `（換下 ${esc(ch.equipped[village.slotFor(ch, it)].name)}）` : ''}`, value: 'equip', className: 'primary' });
  menu.push({ label: `分解<small>${matName(y.key)} ×${y.n}${y.bonus ? `，${Math.round(CRAFT.bonus * 100)}% 機率多得${matName(y.bonus)}` : ''}</small>`, value: 'salvage' });
  menu.push({ label: '存入共用倉庫', value: 'deposit' });
  menu.push({ label: `賣出<small>${sellPrice(it)}G</small>`, value: 'sell' });
  const act = await openModal({ title: '裝備', html: `<div class="shop-row">${itemHtml(it)}${compareHtml(ch, it)}</div>`, menu, actions: [{ label: '關閉', value: null }] });
  if (!act) return null;
  const gems = it.gems || [];
  const gemNote = gems.length ? `<br><small>上面的 ${gems.length} 顆寶石（${gemSummary(gems)}）會自動卸下，放回寶石袋。</small>` : '';
  if (act === 'equip' || act.startsWith('equip:')) return { r: village.equip(ch, it.id, act.split(':')[1]) };
  if (act === 'deposit') return { r: village.depositItem(ch, app.shared, it.id), shared: true };
  if (act === 'salvage') {
    if ((it.rarity >= 2 || it.enhance > 0 || gems.length) && !(await confirmDialog('分解裝備', `確定要分解 ${RARITIES[it.rarity].name}裝備「${esc(it.name)}${it.enhance ? ` +${it.enhance}` : ''}」嗎？分解後無法復原。${gemNote}`, '分解'))) return null;
    return { r: village.salvage(ch, it.id, Math.random) };
  }
  if ((it.rarity >= 2 || gems.length) && !(await confirmDialog('賣出裝備', `確定要賣出 ${RARITIES[it.rarity].name}裝備「${esc(it.name)}」嗎？${gemNote}`, '賣出'))) return null;
  return { r: village.sellItem(ch, it.id) };
}

/**
 * 點共用倉庫的格子：顯示裝備內容與「取出」。
 * @param {object} ch 角色。
 * @param {string} id 裝備 id。
 * @returns {Promise<{r: {ok: boolean, message: string}, shared: boolean} | null>} 操作結果；關閉時為 null。
 */
async function openSharedCell(ch, id) {
  const it = app.shared.items.find((i) => i.id === id);
  if (!it) return null;
  const note = village.canWield(ch, it) ? compareHtml(ch, it) : `<span class="muted small">${village.weaponOwner(it)}用</span>`;
  const act = await openModal({ title: '共用倉庫', html: `<div class="shop-row">${itemHtml(it)}${note}</div>`, actions: [{ label: '關閉', value: null }, { label: '取出到背包', value: 'take', className: 'primary' }] });
  return act ? { r: village.withdrawItem(ch, app.shared, id), shared: true } : null;
}

/** 裝備欄格子的圖示（依部位）。 */
const SLOT_ICONS = { weapon: 'sword', offhand: 'shield', helmet: 'helmet', armor: 'armor', boots: 'boots', accessory: 'ring' };

/**
 * 人物裝備圖：角色在中間，頭盔、飾品 1、飾品 2 在上排，武器與副手在左右，鎧甲與鞋子在下排。
 * 拿雙手武器時副手格顯示「雙手武器佔用」。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function paperDoll(ch) {
  const twoHand = weaponHands(ch.equipped.weapon) === 2;
  const tiles = EQUIP_SLOTS.map(({ key, name, slot }) => {
    const it = ch.equipped[key];
    const icon = `<img src="${itemDataUrl(it ? itemIconName(it) : SLOT_ICONS[slot])}" alt="" class="doll-icon">`;
    if (!it) {
      const note = key === 'offhand' && twoHand ? '雙手武器佔用' : '空';
      return `<button type="button" class="doll-slot empty${key === 'offhand' && twoHand ? ' blocked' : ''}" style="grid-area:${key}" data-doll="${key}" aria-label="${name}：${note}">${icon}<small>${name}</small><span class="doll-name muted">${note}</span></button>`;
    }
    const gems = (it.gems || []).map((g) => `<i style="--gem:${GEMS[parseGem(g).kind].color}"></i>`).join('');
    const hands = weaponHands(it) ? `・${weaponHands(it) === 2 ? '雙手' : '單手'}` : '';
    return `<button type="button" class="doll-slot r${it.rarity}" style="grid-area:${key}" data-doll="${key}" aria-label="${name}：${esc(it.name)}">${icon}<small>${name}${hands}</small><span class="doll-name item-name r${it.rarity}">${esc(it.name)}${it.enhance ? ` +${it.enhance}` : ''}</span>${gems ? `<span class="doll-gems">${gems}</span>` : ''}</button>`;
  }).join('');
  return `<div class="paper-doll">${tiles}<div class="doll-hero"><img src="${heroDataUrl(ch.cls, 6)}" alt="${esc(ch.name)}"></div></div>`;
}

/**
 * 點裝備欄格子：顯示裝備內容與「卸下」按鈕。
 * @param {object} ch 角色。
 * @param {string} key 裝備欄代碼。
 * @returns {Promise<{ok: boolean, message: string} | null>} 卸下的結果；關閉時為 null。
 */
async function openDollSlot(ch, key) {
  const def = EQUIP_SLOTS.find((e) => e.key === key);
  const it = ch.equipped[key];
  if (!it) {
    const tip = key === 'offhand' && weaponHands(ch.equipped.weapon) === 2
      ? `${esc(ch.equipped.weapon.name)}是雙手武器，佔用兩隻手；換成單手武器（${CLASSES[ch.cls].weapon.filter((t) => weaponHands({ slot: 'weapon', type: t }) === 1).join('、')}）才能裝備副手。`
      : `${def.name}目前沒有裝備。在下方背包按「裝備」穿上。`;
    await openModal({ title: def.name, html: `<p>${tip}</p>`, actions: [{ label: '知道了', value: null, className: 'primary' }] });
    return null;
  }
  const action = await openModal({
    title: def.name,
    html: `<div class="shop-row">${itemHtml(it)}</div>`,
    actions: [{ label: '關閉', value: null }, { label: '卸下', value: 'unequip', className: 'primary' }],
  });
  return action === 'unequip' ? village.unequip(ch, key) : null;
}

/**
 * 技能分頁：技能點、每個技能的等級與說明、升級與裝備到技能欄。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function skillPanel(ch) {
  const points = skills.skillPoints(ch);
  const count = skills.skillSlotCount(ch);
  // 技能欄：已裝備技能的圖示；尚未開放的格子上鎖。
  const slots = ch.skills.slots.map((id, n) => {
    if (n >= count) return `<span class="skill-slot locked"><span class="skill-ico">🔒</span><small>技能 ${n + 1}</small><small class="muted">轉職 ${n + 1 - skills.SKILL_BASE_SLOTS} 次</small></span>`;
    const sk = id && skills.SKILLS[id];
    return `<span class="skill-slot${sk ? '' : ' empty'}"><span class="skill-ico">${sk ? skillIcon(id, sk.kind) : ''}</span><small>技能 ${n + 1}</small><small class="muted">${sk ? sk.short : '未裝備'}</small></span>`;
  }).join('');
  // 子頁面：主動、被動；各自依可以學的時間排序（先依等級，再依轉職次數）。
  const order = (d) => (d.rebirth ? 1000 + d.rebirth : d.unlock);
  const sorted = (ids, defs) => ids.slice().sort((a, b) => order(defs[a]) - order(defs[b]));
  const learned = skills.classPassives(ch.cls).filter((id) => skills.passiveLevel(ch, id) > 0).length;
  const tabs = [['active', '主動'], ['passive', `被動 ${learned}／${skills.classPassives(ch.cls).length}`]].map(([k, name]) => `<button type="button" role="tab" data-skill-tab="${k}" aria-selected="${app.skillTab === k}">${name}</button>`).join('');
  // 已學會的技能書技能（非適合職業標示 30%）。
  const books = skills.learnedBooks(ch).map((id) => {
    const s = skills.SKILLS[id];
    const lv = skills.skillLevel(ch, id);
    const slot = ch.skills.slots.slice(0, count).indexOf(id);
    const off = skills.skillScale(ch, id) < 1;
    return skillCell(skillIcon(id, s.kind), s.name, `${lv}／${skills.SKILL_MAX}`, '', `data-skill-cell="${id}"`, { slot: slot >= 0 ? slot + 1 : 0, can: lv < skills.SKILL_MAX && points > 0, book: true, off, rarity: s.rarity || 0 });
  });
  const cells = app.skillTab === 'passive'
    ? sorted(skills.classPassives(ch.cls), skills.PASSIVES).map((id) => {
      const s = skills.PASSIVES[id];
      const lv = skills.passiveLevel(ch, id);
      const open = skills.passiveUnlocked(ch, id);
      return skillCell(PASSIVE_ICONS[Object.keys(s.per)[0]], s.name, open ? (lv ? `${lv}／${skills.PASSIVE_MAX}` : '未學') : '', open ? '' : skills.passiveUnlockText(id), `data-passive-cell="${id}"`, { passive: true, rebirth: s.rebirth, dim: open && !lv, can: open && lv < skills.PASSIVE_MAX && points > 0 });
    })
    : sorted(skills.classSkills(ch.cls), skills.SKILLS).map((id) => {
      const s = skills.SKILLS[id];
      const lv = skills.skillLevel(ch, id);
      const slot = ch.skills.slots.slice(0, count).indexOf(id);
      return skillCell(skillIcon(id, s.kind), s.name, lv ? `${lv}／${skills.SKILL_MAX}` : '', lv ? '' : skills.unlockText(id), `data-skill-cell="${id}"`, { rebirth: s.rebirth, slot: slot >= 0 ? slot + 1 : 0, can: lv && lv < skills.SKILL_MAX && points > 0 });
    });
  return `<div class="sub-tabs" role="tablist">${tabs}</div>
    <p class="skill-points">技能點 <b>${points}</b></p>
    ${app.skillTab === 'active' ? `<div class="skill-slots">${slots}</div>` : ''}
    <div class="skill-grid">${cells.join('')}</div>
    ${app.skillTab === 'active' ? `<h3>技能書技能 <small class="muted">${books.length}／${skills.bookSkillIds().length}（打倒 Boss 取得技能書，在倉庫學習；通用技能書全職業 100%）</small></h3>${books.length ? `<div class="skill-grid">${books.join('')}</div>` : '<p class="muted small">還沒有學會技能書技能。</p>'}` : ''}
    <p class="muted small">點圖示查看說明、升級${app.skillTab === 'active' ? '與裝到技能欄' : '（被動學會後一直生效，不佔技能欄）'}。每升 1 級得到 1 技能點，主動與被動共用。</p>
    <div class="hero-actions"><button type="button" class="link-btn" data-skill-reset="1">重置技能（免費退回所有點數）</button></div>`;
}

/**
 * 技能格子：圖示、名稱、右上角等級、左上角技能欄編號，未解鎖時上鎖並顯示解鎖條件。
 * @param {string} icon SVG 圖示。
 * @param {string} name 名稱。
 * @param {string} lvText 等級文字（未解鎖時為空）。
 * @param {string} lockText 解鎖條件（已解鎖時為空）。
 * @param {string} attrs 點擊用的 data 屬性。
 * @param {{passive?: boolean, rebirth?: number, slot?: number, dim?: boolean, can?: boolean, book?: boolean, off?: boolean, rarity?: number}} [opt] 被動、轉職次數、所在技能欄、尚未學習、可以升級、技能書技能、非適合職業（30%）、技能書稀有度。
 * @returns {string} HTML。
 */
function skillCell(icon, name, lvText, lockText, attrs, opt = {}) {
  const cls = ['skill-cell', opt.passive ? 'passive' : '', opt.rebirth ? 'rebirth' : '', opt.book ? `book r${opt.rarity || 0}` : '', lockText ? 'locked' : '', opt.dim ? 'dim' : ''].filter(Boolean).join(' ');
  return `<button type="button" class="${cls}" ${attrs} aria-label="${name}${lockText ? `（${lockText}）` : ''}">
    <span class="skill-ico">${lockText ? '🔒' : icon}</span><small class="skill-name">${name}</small>
    ${lvText ? `<b class="skill-lv">${lvText}</b>` : ''}${opt.slot ? `<b class="skill-slot-no">${opt.slot}</b>` : ''}${opt.can ? '<i class="skill-up" aria-hidden="true">▲</i>' : ''}
    ${lockText ? `<small class="skill-lock">${lockText.replace('解鎖', '')}</small>` : ''}${opt.rebirth && !lockText ? `<i class="skill-star">${'★'.repeat(opt.rebirth)}</i>` : ''}${opt.off ? '<i class="skill-off">30%</i>' : ''}</button>`;
}

/**
 * 點主動技能：說明（目前與下一級、冷卻、解鎖條件），以及升級與裝到技能欄的按鈕。
 * @param {object} ch 角色。
 * @param {string} id 技能代碼。
 * @returns {Promise<{ok: boolean, message: string} | null>} 操作結果；關閉時為 null。
 */
async function openSkill(ch, id) {
  const s = skills.SKILLS[id];
  const lv = skills.skillLevel(ch, id);
  const points = skills.skillPoints(ch);
  const scale = skills.skillScale(ch, id);
  const st = skills.skillStats(id, Math.max(1, lv), scale);
  const bookNote = s.book ? `・技能書（適合：${skills.suitedName(id, CLASSES)}）${scale < 1 ? `・強度 ${Math.round(scale * 100)}%` : ''}` : '';
  const head = `<div class="skill-detail"><span class="skill-ico big">${skillIcon(id, s.kind)}</span><div><b>${lv ? `Lv.${lv}／${skills.SKILL_MAX}` : skills.unlockText(id)}</b><small class="muted">主動・冷卻 ${st.cd.toFixed(1)} 秒${s.rebirth ? `・轉職 ${'★'.repeat(s.rebirth)}` : ''}${bookNote}</small></div></div>`;
  const next = lv && lv < skills.SKILL_MAX ? `<p class="item-stats next">下一級：${skills.describeSkill(id, lv + 1, scale)}・冷卻 ${skills.skillStats(id, lv + 1).cd.toFixed(1)} 秒</p>` : '';
  const menu = [];
  if (lv) {
    const count = skills.skillSlotCount(ch);
    for (let n = 0; n < count; n++) {
      const cur = ch.skills.slots[n];
      menu.push({ label: cur === id ? `✓ 已裝在技能 ${n + 1}` : `裝到技能 ${n + 1}${cur ? `<small>換下 ${skills.SKILLS[cur].name}</small>` : ''}`, value: `slot:${n}`, disabled: cur === id });
    }
    menu.push({ label: lv >= skills.SKILL_MAX ? '已滿級' : `升級<small>花 1 技能點（剩 ${points} 點）</small>`, value: 'up', className: 'primary', disabled: lv >= skills.SKILL_MAX || !points });
  }
  const act = await openModal({ title: s.name, html: `${head}<p>${skills.describeSkill(id, Math.max(1, lv), scale)}</p>${next}`, menu, actions: [{ label: '關閉', value: null }] });
  if (!act) return null;
  return act === 'up' ? skills.upgradeSkill(ch, id) : skills.equipSkill(ch, id, Number(act.split(':')[1]));
}

/**
 * 點被動技能：說明（目前與下一級、解鎖條件）與學習／升級按鈕。
 * @param {object} ch 角色。
 * @param {string} id 被動技能代碼。
 * @returns {Promise<{ok: boolean, message: string} | null>} 操作結果；關閉時為 null。
 */
async function openPassive(ch, id) {
  const s = skills.PASSIVES[id];
  const lv = skills.passiveLevel(ch, id);
  const open = skills.passiveUnlocked(ch, id);
  const points = skills.skillPoints(ch);
  const head = `<div class="skill-detail"><span class="skill-ico big">${PASSIVE_ICONS[Object.keys(s.per)[0]]}</span><div><b>${open ? `Lv.${lv}／${skills.PASSIVE_MAX}` : skills.passiveUnlockText(id)}</b><small class="muted">被動・學會後一直生效${s.rebirth ? `・轉職 ${'★'.repeat(s.rebirth)}` : ''}</small></div></div>`;
  const now = lv ? `<p>${skills.describePassive(id, lv)}</p>` : '<p class="muted">尚未學習</p>';
  const next = lv < skills.PASSIVE_MAX ? `<p class="item-stats next">${lv ? '下一級' : 'Lv.1'}：${skills.describePassive(id, lv + 1)}</p>` : '';
  const menu = open ? [{ label: lv >= skills.PASSIVE_MAX ? '已滿級' : `${lv ? '升級' : '學習'}<small>花 1 技能點（剩 ${points} 點）</small>`, value: 'up', className: 'primary', disabled: lv >= skills.PASSIVE_MAX || !points }] : [];
  const act = await openModal({ title: s.name, html: `${head}${now}${next}`, menu, actions: [{ label: '關閉', value: null }] });
  return act === 'up' ? skills.upgradePassive(ch, id) : null;
}

/**
 * 共用倉庫區塊：所有角色共用的金幣（存入、取出）與 20 格裝備（取出）。
 * @param {object} ch 目前的角色。
 * @returns {string} HTML。
 */
function sharedHtml(ch) {
  const sh = app.shared;
  const gold = `<div class="shop-row shared-gold"><img src="${itemDataUrl('coin')}" alt="" class="icon"><div class="item-main"><b>共用金幣 ${sh.gold}G</b><span class="item-stats">身上 ${ch.gold}G</span></div>
    <span class="row-actions"><button type="button" class="buy-btn" data-gold-in="100">存 100</button><button type="button" class="buy-btn" data-gold-in="all">全部存入</button>
    <button type="button" class="sell-btn" data-gold-out="100">取 100</button><button type="button" class="sell-btn" data-gold-out="all">全部取出</button></span></div>`;
  const cells = sh.items.map((it) => itemCell(it, it.id, 'data-shared-cell'));
  for (let k = sh.items.length; k < SHARED_SLOTS; k++) cells.push('<span class="inv-cell empty" aria-hidden="true"></span>');
  const items = `<div class="inv-grid">${cells.join('')}</div>${sh.items.length ? '' : '<p class="muted small">共用倉庫是空的。點背包的裝備選「存入共用倉庫」，其他角色就能取出。</p>'}`;
  return `<h3>共用倉庫 <small class="muted">所有角色共用・${sh.items.length}／${SHARED_SLOTS} 格（不能擴充）</small></h3>${gold}${items}
    <p class="muted small">點格子查看並取出到背包。要存入裝備，請到「個人」點背包中的裝備選「存入共用倉庫」。</p>`;
}

/**
 * 轉職說明（對話框內容）：條件、下一個職稱、轉職的影響與 Lv.1 起始能力。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function rebirthHtml(ch) {
  const n = ch.rebirth || 0;
  if (n >= REBIRTH.max) return `<p>${village.classTitle(ch)}是${CLASSES[ch.cls].name}的最終職業，已完成全部 ${REBIRTH.max} 次轉職。</p>`;
  const nextTitle = REBIRTH.titles[ch.cls][n + 1];
  const now1 = characterStats(ch.cls, 1, [], n);
  const next1 = characterStats(ch.cls, 1, [], n + 1);
  const rows = [['HP', 'hp'], ['攻擊', 'atk'], ['防禦', 'def']].map(([name, k]) => `<dt>${name}</dt><dd>${now1[k]} → <b class="up">${next1[k]}</b></dd>`).join('');
  return `<p><b>${village.classTitle(ch)} → ${nextTitle}</b>（第 ${n + 1}／${REBIRTH.max} 次）</p>
    <p>條件：達到 <b>Lv.${levelCap(n)}</b>（目前 Lv.${ch.level}）。</p>
    <ul><li>回到 Lv.1，等級上限提高為 Lv.${levelCap(n + 1)}</li><li>解鎖 2 個轉職技能、1 個轉職被動，技能欄 +1 格（最多 4 格）</li><li>裝備、金幣、技能與地城進度全部保留</li><li>怪物變強，掉落與獎勵也變好</li></ul>
    <p class="muted small">Lv.1 起始能力（不含裝備）：</p><dl class="result-list">${rows}</dl>`;
}

/**
 * 整體效果：裝備（飾品）與寶石的百分比加成、吸血（含上限說明）、主動寶石、武器的異常狀態、金幣與經驗加成、技能欄格數。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function effectsHtml(ch) {
  const worn = Object.values(ch.equipped).filter(Boolean);
  const gem = gemBonus(worn);
  const acc = { atkPct: 0, hpPct: 0, defPct: 0, goldPct: 0, xpPct: 0 };
  for (const it of worn) {
    const st = itemStats(it);
    for (const k of Object.keys(acc)) acc[k] += st[k] || 0;
  }
  const pb = skills.passiveBonus(ch);

  const cap = GEM_RULES.leechCap;
  const weapon = ch.equipped.weapon && ch.equipped.weapon.status ? statusText(ch.equipped.weapon.status) : '<span class="muted">—</span>';
  const actives = gem.actives.length ? gem.actives.map((k) => GEMS[k].label).join('、') : '<span class="muted">—</span>';
  // 整體效果以小標籤呈現：數值為主，來源可從屬性方塊查看。
  const chip = (name, value, extra = '') => `<span class="fx-chip"><small>${name}</small><b>${value}</b>${extra}</span>`;
  const sum = (...v) => v.reduce((x, y) => x + y, 0);
  const pctText = (v) => (v ? `+${v}%` : '<span class="muted">—</span>');
  return `<h3>整體效果</h3><div class="fx-chips">
      ${chip('攻擊', pctText(sum(acc.atkPct, gem.atk, pb.atkPct)))}${chip('HP', pctText(sum(acc.hpPct, gem.hp, pb.hpPct)))}${chip('防禦', pctText(sum(acc.defPct, gem.def, pb.defPct)))}${chip('速度', pctText(gem.spd))}
      ${chip('吸血', `${gem.leech ? `${Math.min(cap, gem.leech)}%` : '<span class="muted">—</span>'}<small class="muted"> Max ${cap}%</small>`, '<button type="button" class="info-btn" data-info="leech" aria-label="吸血說明">i</button>')}
      ${chip('金幣', pctText(acc.goldPct))}${chip('經驗', pctText(acc.xpPct))}${chip('技能欄', `${skills.skillSlotCount(ch)}／${skills.SKILL_SLOTS}`)}
      ${chip('武器', weapon)}${chip('主動寶石', actives)}
    </div>`;
}

/** 說明按鈕（ⓘ）的內容。 */
const INFO = {
  rebirthBonus: {
    title: '轉職加成',
    html: `<p>每轉職一次（依角色的轉職次數）：</p><ul>
      <li>所有怪物、菁英與 Boss 的 HP、攻擊 +${Math.round(REBIRTH.monster * 100)}%</li>
      <li>掉落的裝備等級 +${REBIRTH.dropLevel}，稀有度提高</li>
      <li>金幣與經驗值 +${Math.round(REBIRTH.reward * 100)}%</li></ul>`,
  },
  leech: {
    title: '吸血',
    html: `<p>造成傷害時，依比例回復 HP。</p><ul>
      <li>寶石（血石）的吸血合計最多 ${GEM_RULES.leechCap}%，鑲超過的部分沒有效果。</li>
      <li>戰士的「嗜血」技能另外疊加，不受 ${GEM_RULES.leechCap}% 的限制。</li>
      <li>不論來源，每秒最多回復最大 HP 的 ${GEM_RULES.leechPerSec * 100}%（嗜血生效中為 ${GEM_RULES.leechPerSecSkill * 100}%）。</li></ul>`,
  },
};

/**
 * 顯示說明對話框。
 * @param {string} key 說明代碼（INFO 的鍵）。
 */
function showInfo(key) {
  const info = INFO[key];
  if (info) openModal({ title: info.title, html: info.html, actions: [{ label: '知道了', value: null, className: 'primary' }] });
}

/**
 * 角色分頁：等級、屬性與角色統計。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function heroPanel(ch) {
  const pb = skills.passiveBonus(ch);
  const s = characterStats(ch.cls, ch.level, Object.values(ch.equipped), ch.rebirth || 0, pb);
  const cap = levelCap(ch.rebirth || 0);
  const need = xpToNext(ch.level, cap);
  const max = ch.level >= cap;
  const st = ch.stats;
  const b = statBreakdown(ch);
  const rb = ch.rebirth || 0;
  // 上方大卡片：角色圖、職稱與轉職星數、名稱、等級、經驗條與戰力。
  const banner = `<div class="hero-banner" data-cls="${ch.cls}">
      <img src="${heroDataUrl(ch.cls, 7)}" alt="" class="hero-sprite">
      <div class="hero-meta">
        <span class="hero-title">${village.classTitle(ch)}${rb ? ` <i class="stars">${'★'.repeat(rb)}</i>` : ''}</span>
        <b class="hero-name">${esc(ch.name)}</b>
        <span class="lv-line"><b class="lv-chip">Lv.${ch.level}${max ? ' MAX' : ''}</b><small class="muted">上限 Lv.${cap}</small></span>
        <span class="xp-track" aria-label="經驗值"><i style="width:${max ? 100 : Math.min(100, (ch.xp / need) * 100).toFixed(1)}%"></i></span>
        <small class="muted">${max ? '經驗值已滿' : `經驗 ${ch.xp}／${need}`}</small>
        <span class="power">戰力 <b>${powerOf(s)}</b></span>
      </div>
    </div>`;
  // 屬性方塊：點了顯示組成（基礎、裝備、寶石、被動）。
  const tiles = [['hp', 'HP', PASSIVE_ICONS.hpPct], ['atk', '攻擊', PASSIVE_ICONS.atkPct], ['def', '防禦', PASSIVE_ICONS.shieldDefPct], ['spd', '速度', PASSIVE_ICONS.spd]].map(([k, name, icon]) => {
    const plus = s[k] - b.bare[k];
    return `<button type="button" class="stat-tile" data-stat="${k}"><span class="stat-ico">${icon}</span><small>${name}</small><b>${s[k]}</b>${plus ? `<i class="${plus > 0 ? 'up' : 'down'}">${plus > 0 ? '+' : ''}${plus}</i>` : '<i class="muted">—</i>'}</button>`;
  }).join('');
  const statTiles = [['遊玩時間', formatTime(st.playMs)], ['探險', st.runs], ['擊倒', st.kills], ['最高傷害', st.maxHit], ['傳說裝備', st.legends], ['倒下', st.deaths]]
    .map(([name, v]) => `<span class="mini-tile"><small>${name}</small><b>${v}</b></span>`).join('');
  return `${banner}<div class="stat-tiles">${tiles}</div>${rebirthButton(ch)}
    ${effectsHtml(ch)}
    <h3>角色統計</h3><div class="mini-tiles">${statTiles}</div>
    <div class="hero-actions"><button type="button" class="link-btn danger-text" data-delete="${ch.id}">刪除角色</button></div>`;
}

/**
 * 戰力：屬性的綜合指標（只用來比較強弱，不影響戰鬥）。
 * @param {{hp: number, atk: number, def: number, spd: number}} s 屬性。
 * @returns {number} 戰力。
 */
function powerOf(s) {
  return Math.round(s.hp / 4 + s.atk * 3 + s.def * 2 + s.spd / 2);
}

/**
 * 屬性的組成：沒穿裝備、穿裝備但不含寶石、含寶石但不含被動技能、全部。
 * @param {object} ch 角色。
 * @returns {{bare: object, noGem: object, noPassive: object, all: object}} 各層的屬性。
 */
function statBreakdown(ch) {
  const worn = Object.values(ch.equipped).filter(Boolean);
  return {
    bare: characterStats(ch.cls, ch.level, [], ch.rebirth || 0),
    noGem: characterStats(ch.cls, ch.level, worn.map((it) => ({ ...it, gems: [] })), ch.rebirth || 0),
    noPassive: characterStats(ch.cls, ch.level, worn, ch.rebirth || 0),
    all: characterStats(ch.cls, ch.level, worn, ch.rebirth || 0, skills.passiveBonus(ch)),
  };
}

/**
 * 點屬性方塊：顯示最終值與組成（基礎、裝備、寶石、被動）；速度另外顯示移動與攻擊間隔。
 * @param {object} ch 角色。
 * @param {string} k 屬性（hp、atk、def、spd）。
 */
function showStat(ch, k) {
  const b = statBreakdown(ch);
  const name = { hp: 'HP', atk: '攻擊', def: '防禦', spd: '速度' }[k];
  const sign = (v) => `${v > 0 ? '+' : ''}${v}`;
  const rows = [['基礎', b.bare[k], ''], ['裝備', b.noGem[k] - b.bare[k], 'up'], ['寶石', b.noPassive[k] - b.noGem[k], 'up'], ['被動技能', b.all[k] - b.noPassive[k], 'up']]
    .map(([label, v, cls], i) => `<dt>${label}</dt><dd class="${i && v ? cls : ''}">${i ? (v ? sign(v) : '—') : v}</dd>`).join('');
  let extra = '';
  if (k === 'spd') {
    const prof = speedProfile(b.all.spd);
    extra = `<p class="muted small">每秒移動 ${prof.move.toFixed(1)} 格、攻擊間隔 ${(prof.interval * (CLASSES[ch.cls].attack.rate || 1)).toFixed(2)} 秒。</p>`;
  }
  openModal({ title: `${name} ${b.all[k]}`, html: `<dl class="result-list">${rows}</dl>${extra}`, actions: [{ label: '知道了', value: null, className: 'primary' }] });
}

/**
 * 轉職按鈕：可以轉職時發光；不能轉職時變暗，點了顯示說明。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function rebirthButton(ch) {
  const n = ch.rebirth || 0;
  if (n >= REBIRTH.max) return `<button type="button" class="rebirth-btn done" data-rebirth-info="1"><b>★★★ ${village.classTitle(ch)}</b><small>已完成全部 ${REBIRTH.max} 次轉職</small></button>`;
  const ok = village.canRebirth(ch).ok;
  return `<button type="button" class="rebirth-btn${ok ? ' ready' : ''}" data-rebirth-info="1"><b>轉職 → ${REBIRTH.titles[ch.cls][n + 1]}</b><small>${ok ? '已達條件，點擊轉職' : `第 ${n + 1}／${REBIRTH.max} 次・需要 Lv.${levelCap(n)}（目前 Lv.${ch.level}）`}</small></button>`;
}

/**
 * 村莊分頁中的點擊（以 data 屬性分派）。
 * @param {MouseEvent} e 點擊事件。
 */
async function onVillageClick(e) {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  const ch = currentChar();
  const d = b.dataset;
  let r = null;
  if (d.start) {
    startRun(d.start, Number(d.depth));
    return;
  }
  if (d.gateArea) {
    if (!village.areaUnlocked(ch, d.gateArea)) {
      const prev = AREA_KEYS[AREA_KEYS.indexOf(d.gateArea) - 1];
      villageMessage(`${AREAS[d.gateArea].name}：擊敗${AREAS[prev].name}的 Boss 後解鎖`, true);
      return;
    }
    app.gateArea = d.gateArea;
    app.lastTab = null;
    window.scrollTo(0, 0);
    renderVillage();
    return;
  }
  if (d.gateBack) {
    app.gateArea = null;
    renderVillage();
    window.scrollTo(0, 0);
    return;
  }
  if (d.mapNode) {
    await openMapNode(ch, d.mapNode);
    return;
  }
  if (d.stat) {
    showStat(ch, d.stat);
    return;
  }
  if (d.rebirthInfo) {
    // 不能轉職時只顯示說明；可以轉職時顯示說明並確認。
    const ok = village.canRebirth(ch).ok;
    const act = await openModal({ title: '轉職', html: rebirthHtml(ch), actions: ok ? [{ label: '取消', value: null }, { label: `轉職為${REBIRTH.titles[ch.cls][(ch.rebirth || 0) + 1]}`, value: 'go', className: 'primary' }] : [{ label: '知道了', value: null, className: 'primary' }] });
    if (act !== 'go') return;
    r = village.rebirth(ch);
  } else if (d.skillCell || d.passiveCell) {
    r = d.skillCell ? await openSkill(ch, d.skillCell) : await openPassive(ch, d.passiveCell);
    if (!r) return;
  } else if (d.skillTab) {
    app.skillTab = d.skillTab;
    renderVillage();
    return;
  }
  if (d.bagTab) {
    app.bagTab = d.bagTab;
    renderVillage();
    return;
  }
  if (d.smithTab) {
    app.smithTab = d.smithTab;
    renderVillage();
    return;
  }
  if (d.cell || d.sharedCell) {
    const out = d.cell ? await openBagCell(ch, d.cell) : await openSharedCell(ch, d.sharedCell);
    if (!out) return;
    villageMessage(out.r.message, !out.r.ok);
    if (out.r.ok) await (out.shared ? store.saveShared(ch, app.shared) : store.saveProgress(ch));
    renderVillage();
    return;
  }
  if (d.craftBook) {
    const out = await openCraft(ch, d.craftBook);
    if (!out) return;
    r = out;  } else if (d.sellSbook) r = village.sellSkillBook(ch, d.sellSbook);
  else if (d.buyBook !== undefined) r = village.buyBook(ch, Number(d.buyBook));
  else if (d.doll) {
    r = await openDollSlot(ch, d.doll);
    if (!r) return;
  } else if (d.info) {
    showInfo(d.info);
    return;
  } else if (d.passiveUp) r = skills.upgradePassive(ch, d.passiveUp);
  else if (d.buy === 'potion') r = village.buyPotion(ch);
  else if (d.buy === 'cure') r = village.buyCure(ch);
  else if (d.gemCell) {
    const key = d.gemCell;
    const g = parseGem(key);
    const canFuse = !GEMS[g.kind].active && g.tier < GEM_RULES.max;
    const n = (ch.gems && ch.gems[key]) || 0;
    const note = canFuse ? `<p class="muted small">${GEM_RULES.fuse} 顆合成 1 顆${gemName(`${g.kind}-${g.tier + 1}`)}（${GEM_RULES.fuseCost[g.tier]}G）。</p>` : `<p class="muted small">${GEMS[g.kind].active ? '主動寶石不能合成。' : '已是最高等級。'}</p>`;
    const act = await openModal({
      title: `${gemName(key)} ×${n}`,
      html: `<div class="gem-detail">${gemCell(key, n, 'disabled tabindex="-1"')}<p>${gemEffect(key)}</p></div>${note}`,
      actions: [{ label: '關閉', value: null }, ...(canFuse ? [{ label: `合成（${GEM_RULES.fuse} 顆）`, value: 'fuse', className: 'primary' }] : [])],
    });
    if (act !== 'fuse') return;
    r = village.fuseGem(ch, key);
  } else if (d.unsocket) {
    const found = village.findItem(ch, d.unsocket);
    const key = found && found.item.gems[Number(d.index)];
    if (!key) return;
    const act = await openModal({
      title: gemName(key),
      html: `<div class="gem-detail">${gemCell(key, 0, 'disabled tabindex="-1"')}<p>${gemEffect(key)}<br><small class="muted">鑲在 ${esc(found.item.name)}。取下免費，寶石會放回寶石袋。</small></p></div>`,
      actions: [{ label: '關閉', value: null }, { label: '取下', value: 'take', className: 'primary' }],
    });
    if (act !== 'take') return;
    r = village.unsocketGem(ch, d.unsocket, Number(d.index));
  }
  else if (d.socket) {
    const key = await pickGem(ch, d.socket);
    if (!key) return;
    r = village.socketGem(ch, d.socket, key);
  }
  else if (d.buy === 'scroll') r = village.buyScroll(ch);
  else if (d.buy === 'pouch') r = village.buyBagExpand(ch);
  else if (d.usePouch) r = village.useBagExpand(ch);
  else if (d.buyItem !== undefined) r = village.buyItem(ch, Number(d.buyItem));
  else if (d.sell) {
    const found = village.findItem(ch, d.sell);
    // 稀有以上或鑲有寶石的裝備先確認；鑲有寶石時說明寶石會放回寶石袋。
    const gems = (found && found.item.gems) || [];
    if (found && (found.item.rarity >= 2 || gems.length)) {
      const note = gems.length ? `<br><small>上面的 ${gems.length} 顆寶石（${gemSummary(gems)}）會自動卸下，放回寶石袋。</small>` : '';
      if (!(await confirmDialog('賣出裝備', `確定要賣出 ${RARITIES[found.item.rarity].name}裝備「${esc(found.item.name)}」嗎？${note}`, '賣出'))) return;
    }
    r = village.sellItem(ch, d.sell);
  } else if (d.equip) r = village.equip(ch, d.equip, d.slot);
  else if (d.unequip) r = village.unequip(ch, d.unequip);
  else if (d.skillUp) r = skills.upgradeSkill(ch, d.skillUp);
  else if (d.skillSlot !== undefined) r = skills.equipSkill(ch, d.skill, Number(d.skillSlot));
  else if (d.skillReset) r = skills.resetSkills(ch);
  else if (d.enhance) r = village.enhance(ch, d.enhance, Math.random);
  else if (d.rebirth) {
    const next = REBIRTH.titles[ch.cls][(ch.rebirth || 0) + 1];
    if (!(await confirmDialog('轉職', `確定要轉職為「${next}」嗎？等級會回到 Lv.1（經驗值歸零），起始能力提升；裝備、金幣、技能與地城進度都會保留。`, '轉職'))) return;
    r = village.rebirth(ch);
  } else if (d.delete) {
    if (!(await confirmDialog('刪除角色', `確定要刪除「${esc(ch.name)}」嗎？等級、裝備與金幣都會消失，無法復原。`, '刪除'))) return;
    if (app.run && app.run.charId === ch.id) {
      app.run = null;
      await store.saveProgress(ch, null);
    }
    app.chars.delete(ch.id);
    await store.deleteCharacter(ch.id);
    app.current = null;
    store.saveMeta(null);
    goHome();
    return;
  }
  let sharedChanged = false;
  if (!r) {
    // 共用倉庫：裝備存入與取出、金幣存入與取出。
    sharedChanged = true;
    const amount = (v) => (v === 'all' ? 'all' : Number(v));
    if (d.deposit) r = village.depositItem(ch, app.shared, d.deposit);
    else if (d.withdraw) r = village.withdrawItem(ch, app.shared, d.withdraw);
    else if (d.goldIn) r = village.depositGold(ch, app.shared, amount(d.goldIn));
    else if (d.goldOut) r = village.withdrawGold(ch, app.shared, amount(d.goldOut));
  }
  if (!r) return;
  villageMessage(r.message, !r.ok || r.success === false);
  if (r.ok) await (sharedChanged ? store.saveShared(ch, app.shared) : store.saveProgress(ch));
  renderVillage();
}

/**
 * 獲得紀錄：列出其他遊戲的第一次過關與第一次全對；還沒領取的可以「全部領取」，禮包放進目前角色的背包（每個紀錄只能領一次）。
 * @param {object} ch 角色。
 * @returns {Promise<void>}
 */
async function openRewards(ch) {
  const list = store.loadRewards();
  const pending = list.filter((r) => !app.claimed.includes(r.id));
  const row = (r, done) => `<div class="reward-row${done ? ' done' : ''}"><span class="inv-cell stack static gift-cell tier${r.tier}"><img src="${itemDataUrl('gift')}" alt=""></span><div><b>${GIFT.games[r.game]}</b><small>${esc(r.label)}</small></div><em>${done ? '已領取' : GIFT.names[r.tier - 1]}</em></div>`;
  const done = list.filter((r) => app.claimed.includes(r.id)).slice(0, 30);
  const html = `<p class="muted small">在其他遊戲<b>第一次過關</b>或<b>第一次全對</b>（沒用提示／三顆星）時取得獎勵禮包，難度或章節愈高，禮包等級愈高；重複過關不會再給。每個紀錄只能領一次，領取後放進目前角色的背包。</p>
    ${pending.length ? pending.map((r) => row(r, false)).join('') : '<p class="muted">目前沒有可以領取的禮包。到大廳玩其他遊戲吧！</p>'}
    ${done.length ? `<h3>已領取</h3>${done.map((r) => row(r, true)).join('')}` : ''}`;
  const act = await openModal({ title: '獲得紀錄', html, actions: [{ label: '關閉', value: null }, ...(pending.length ? [{ label: `全部領取（${pending.length}）`, value: 'claim', className: 'primary' }] : [])] });
  if (act !== 'claim') return;
  let got = 0;
  for (const r of pending) {
    if (!village.addGift(ch, r.tier)) break;
    app.claimed.push(r.id);
    got++;
  }
  await store.saveClaimed(ch, app.claimed);
  villageMessage(got === pending.length ? `領取了 ${got} 個獎勵禮包，到倉庫開啟` : `背包已滿，領取了 ${got}／${pending.length} 個`, got < pending.length);
  renderVillage();
}

/**
 * 用製作書合成：先選品質（材料不足或金幣不足的格子停用），武器再選類型，成功後顯示新裝備。
 * @param {object} ch 角色。
 * @param {string} slot 製作書的部位。
 * @returns {Promise<{ok: boolean, message: string} | null>} 合成結果；取消時為 null。
 */
async function openCraft(ch, slot) {
  const have = (ch.books && ch.books[slot]) || 0;
  if (!have) {
    await openModal({ title: village.bookName(slot), html: `<p>還沒有${village.bookName(slot)}。打怪、開寶箱有機會掉落，商店也會陳列製作書。</p>`, actions: [{ label: '知道了', value: null, className: 'primary' }] });
    return null;
  }
  const tiers = MATERIALS.map((m, t) => {
    const c = village.craftCost(ch, t);
    const own = (ch.mats && ch.mats[c.mat]) || 0;
    const ok = own >= c.n && ch.gold >= c.gold;
    return {
      label: `<img src="${itemDataUrl(m.key)}" alt=""><span class="rarity r${t}">${RARITIES[t].name}</span><small class="gem-label">${m.name} ${own}／${c.n}<br>${c.gold}G</small>`,
      value: t, className: `inv-cell craft-tier r${t}`, disabled: !ok,
    };
  });
  const tier = await openModal({ title: `${village.bookName(slot)} ×${have}`, html: '<p class="muted small">選擇品質（決定裝備的稀有度）：</p>', menu: tiers, menuClass: 'menu-grid', actions: [{ label: '取消', value: null }] });
  if (tier === null || tier === undefined) return null;
  let type;
  if (slot === 'weapon') {
    // 武器製作書：選擇武器類型（單手或雙手）。
    type = await openModal({
      title: '選擇武器類型',
      menu: CLASSES[ch.cls].weapon.map((t) => ({
        label: `<img src="${itemDataUrl(itemIconName({ slot: 'weapon', type: t }))}" alt=""><b>${t}</b><small class="gem-label">${WEAPON_HANDS[t] === 2 ? '雙手・攻擊較高' : '單手・可拿盾牌'}</small>`,
        value: t, className: `inv-cell craft-tier r${tier}`,
      })),
      menuClass: 'menu-grid',
      actions: [{ label: '取消', value: null }],
    });
    if (!type) return null;
  }
  const r = village.craftItem(ch, slot, Number(tier), Math.random, type);
  if (r.ok) await openModal({ title: '合成成功！', html: `<div class="shop-row">${itemHtml(r.item)}${compareHtml(ch, r.item)}</div><p class="muted small">已放進背包。</p>`, actions: [{ label: '好', value: null, className: 'primary' }] });
  return r;
}

/**
 * 選擇要鑲嵌的寶石（對話框列出寶石袋中的寶石）。
 * @param {object} ch 角色。
 * @param {string} id 裝備 id。
 * @returns {Promise<string | null>} 寶石代碼；取消時為 null。
 */
async function pickGem(ch, id) {
  const found = village.findItem(ch, id);
  if (!found) return null;
  const menu = ownedGems(ch).map(([key, n]) => {
    const g = parseGem(key);
    const d = GEMS[g.kind];
    return {
      label: `${gemIconImg(key)}<b class="cell-tier">${d.active ? '主' : TIER_MARK[g.tier - 1]}</b><b class="cell-count">${n}</b><small class="gem-label">${d.active ? d.label : `${d.stat} +${d.values[g.tier - 1]}%`}</small>`,
      value: key,
      className: 'gem-cell',
      style: `--gem:${d.color}`,
    };
  });
  if (!menu.length) return null;
  return openModal({ title: `鑲嵌到 ${esc(found.item.name)}`, html: '<p class="muted small">選擇要鑲嵌的寶石：</p>', menu, menuClass: 'menu-grid', actions: [{ label: '取消', value: null }] });
}

// ---------- 探險 ----------

/**
 * 開始新的探險。
 * @param {string} area 區域代碼。
 * @param {number} depth 深度。
 */
async function startRun(area, depth) {
  const ch = currentChar();
  if (!ch || app.run) return;
  const carry = village.packForRun(ch);
  const seed = (Math.floor(Math.random() * 0x7fffffff) ^ Date.now()) >>> 0;
  const world = new World(ch, { area, depth, seed, potions: carry.potions, scroll: carry.scroll, cures: carry.cures });
  store.recordStart(area, depth);
  enterWorld(world, ch, false);
  await saveRun();
}

/** 繼續進行中的探險（由暫停畫面開始）。 */
function continueRun() {
  if (!app.run) return;
  const ch = app.chars.get(app.run.charId);
  if (!ch) return;
  app.current = ch.id;
  store.saveMeta(ch.id);
  const world = World.restore(ch, app.run.snap);
  enterWorld(world, ch, true);
}

/**
 * 進入地城畫面。
 * @param {World} world 探險。
 * @param {object} ch 角色。
 * @param {boolean} paused 是否先停在暫停畫面。
 */
function enterWorld(world, ch, paused) {
  app.world = world;
  world.aimAssist = app.settings.aimAssist;
  app.ending = false;
  app.transition = false;
  app.saveTimer = 0;
  app.hudCache = {};
  resetInput();
  showScreen('game');
  document.body.classList.toggle('tap-move', app.settings.tapMove);
  if (!app.renderer) app.renderer = new Renderer(els.canvas, els.minimap);
  app.renderer.shakeOn = app.settings.shake && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.renderer.floorCache = null;
  $('minimap-frame').hidden = !app.settings.minimap;
  $('hud-avatar').src = heroDataUrl(ch.cls, 3);
  requestAnimationFrame(() => {
    app.renderer.resize();
    app.renderer.draw(world, 0);
    updateHud(true);
  });
  if (paused) pauseGame();
  else resumeGame();
}

/**
 * 儲存目前的探險與角色。
 * @returns {Promise<void>}
 */
async function saveRun() {
  const w = app.world;
  if (!w || app.ending) return;
  app.run = { charId: w.ch.id, snap: w.snapshot() };
  await store.saveProgress(w.ch, app.run);
}

/** 開始繪製迴圈。 */
function startLoop() {
  if (app.running) return;
  app.running = true;
  app.lastTs = 0;
  app.acc = 0;
  app.raf = requestAnimationFrame(frame);
}

/** 停止繪製迴圈。 */
function stopLoop() {
  app.running = false;
  cancelAnimationFrame(app.raf);
}

/**
 * 每一幀：以固定時間步更新遊戲邏輯，再繪製畫面。省電模式時只以 30 fps 執行。
 * @param {number} ts 時間戳記（毫秒）。
 */
function frame(ts) {
  if (!app.running) return;
  app.raf = requestAnimationFrame(frame);
  if (app.settings.saver && app.lastTs && ts - app.lastTs < 1000 / 30 - 4) return;
  const dt = app.lastTs ? Math.min(0.1, (ts - app.lastTs) / 1000) : STEP;
  app.lastTs = ts;
  const w = app.world;
  if (!app.transition) {
    app.acc += dt;
    while (app.acc >= STEP && app.running && !app.transition) {
      app.acc -= STEP;
      w.update(STEP, readInput());
      app.input.dodge = false;
      app.input.potion = false;
      app.input.cure = false;
      app.input.skill = [false, false, false, false];
      app.input.gem = [false, false];
      handleEvents();
    }
    app.saveTimer += dt;
    if (app.saveTimer >= AUTOSAVE && app.running) {
      app.saveTimer = 0;
      saveRun();
    }
  }
  if (app.screen === 'game') {
    app.renderer.draw(w, dt);
    updateHud(false);
  }
}

/**
 * 處理遊戲事件：升級、拾取、受傷、下樓、勝利、倒下、回城。
 */
function handleEvents() {
  const w = app.world;
  const events = w.events.splice(0);
  for (const e of events) {
    if (e.type === 'hurt') {
      els.hurtFlash.classList.remove('on');
      void els.hurtFlash.offsetWidth;
      els.hurtFlash.classList.add('on');
      app.renderer.shake(2, 0.15);
      buzz(25);
    } else if (e.type === 'levelup') {
      const g = CLASSES[w.ch.cls].growth;
      toast(`LEVEL UP！Lv.${e.level}　HP +${g.hp}・攻擊 +${g.atk}・防禦 +${g.def}`);
      saveRun();
    } else if (e.type === 'item') {
      toast(`取得 ${RARITIES[e.item.rarity].name}・${e.item.name}`, `r${e.item.rarity}`);
      saveRun();
    } else if (e.type === 'skill') {
      if (e.kind === 'slam') app.renderer.shake(3, 0.3);
      buzz(12);
    } else if (e.type === 'message') {
      toast(e.text);
    } else if (e.type === 'status') {
      const tips = { poison: '中毒了！', sleep: '睡著了！被攻擊 3 次會醒來', stun: '暈眩了！暫時不能行動' };
      toast(`${tips[e.kind]}${w.player.cures > 0 ? '（淨化藥水可以解除）' : ''}`, 'status-toast');
      buzz(30);
    } else if (e.type === 'gem') {
      toast(e.gift ? `Lv.${e.gift} 獎勵：${e.name}` : `取得 ${e.name}`, 'gem-toast');
      saveRun();
    } else if (e.type === 'active') {
      buzz(15);
    } else if (e.type === 'boss-heal-start') {
      toast(`${e.name} 開始回復！快攻擊打斷它`);
    } else if (e.type === 'boss-heal-break') {
      toast(`打斷了 ${e.name} 的回復！`);
      app.renderer.shake(2, 0.2);
    } else if (e.type === 'boss-heal') {
      toast(`${e.name} 回復了 ${e.amount} HP`);
    } else if (e.type === 'phase2') {
      toast(`${e.name} 發怒了！`);
      app.renderer.shake(3, 0.4);
    } else if (e.type === 'enrage') {
      toast(`${e.name} 狂暴了！出招變快`);
      app.renderer.shake(4, 0.5);
    } else if (e.type === 'boss-evolved') {
      toast(`${e.name || 'Boss'} 復活了！`);
      app.renderer.shake(4, 0.5);
      buzz(40);
    } else if (e.type === 'boss-defeated') {
      toast(`擊敗 ${e.name}！走進傳送點回村莊`);
      app.renderer.shake(4, 0.6);
      saveRun();
    } else if (e.type === 'stairs') {
      changeFloor();
    } else if (e.type === 'dead') {
      endRun('dead');
      return;
    } else if (e.type === 'victory') {
      endRun('victory');
      return;
    } else if (e.type === 'recall') {
      endRun('recall');
      return;
    }
  }
}

/** 下樓：淡出、產生下一層、淡入，並存檔。 */
function changeFloor() {
  app.transition = true;
  els.fade.classList.add('on');
  setTimeout(() => {
    const w = app.world;
    if (!w || app.ending) return;
    w.nextFloor();
    app.renderer.floorCache = null;
    app.transition = false;
    app.acc = 0;
    els.fade.classList.remove('on');
    toast(w.floorIndex >= 3 ? 'Boss 層' : `第 ${w.floorIndex + 1} 層`);
    saveRun();
  }, 280);
}

/**
 * 結束探險並顯示結算畫面。
 * @param {'victory' | 'dead' | 'recall' | 'abandon'} result 結果。
 */
async function endRun(result) {
  if (app.ending) return;
  stopLoop();
  const w = app.world;
  await finishRun(w, w.ch, result, { silent: false });
}

/**
 * 結算探險、更新統計與存檔，並顯示結算畫面。
 * @param {World} w 探險。
 * @param {object} ch 角色。
 * @param {'victory' | 'dead' | 'recall' | 'abandon'} result 結果。
 * @param {{silent: boolean}} opts silent 時不顯示結算畫面（例如在首頁放棄另一個角色的探險）。
 */
async function finishRun(w, ch, result, { silent }) {
  app.ending = true;
  const r = village.settleRun(ch, w, result);
  const { newRecord } = store.recordEnd(r.area, { result: result === 'abandon' ? 'dead' : result, ms: r.ms, kills: r.kills, potionsUsed: r.potionsUsed });
  village.refreshShop(ch, Math.random);
  app.run = null;
  app.world = null;
  await store.saveProgress(ch, null);
  if (silent) return;
  const title = { victory: '探險成功！', dead: '倒下了…', recall: '使用回城卷軸', abandon: '放棄探險' }[result];
  const items = r.items.length ? `<ul class="loot-list">${r.items.map((it) => `<li>${itemTitle(it)}</li>`).join('')}</ul>` : '<p class="muted">這趟沒有取得裝備。</p>';
  const html = `${newRecord ? '<span class="record-badge">最快擊敗紀錄！</span>' : ''}
    <dl class="result-list">
      <dt>地城</dt><dd>${AREAS[r.area].name} 深度 ${r.depth}${r.result === 'victory' ? `（第 ${r.clears} 次破關${r.evolved ? '・進化 Boss' : ''}）` : ''}</dd>
      <dt>耗時</dt><dd>${formatTime(r.ms)}</dd>
      <dt>擊倒數</dt><dd>${r.kills}</dd>
      <dt>受到傷害</dt><dd>${r.damageTaken}</dd>
      <dt>經驗值</dt><dd>+${r.xp}${r.levels ? `（升了 ${r.levels} 級）` : ''}</dd>
      <dt>金幣</dt><dd>+${r.gold}G${r.goldLost ? `<small class="muted">（倒下失去 ${r.goldLost}G）</small>` : ''}</dd>
    </dl>
    ${r.unlocks.length ? `<p class="unlock">解鎖：${r.unlocks.join('、')}</p>` : ''}
    <h3>取得的裝備</h3>${items}${r.gems.length ? `<h3>取得的寶石</h3><p>${gemSummary(r.gems)}</p>` : ''}`;
  await openModal({ title, html, actions: [{ label: '回村莊', value: true, className: 'primary' }], dismissValue: true });
  app.ending = false;
  app.current = ch.id;
  app.tab = r.items.length ? 'bag' : 'gate';
  showScreen('village');
  renderVillage();
}

/**
 * 寶石清單的摘要，例如「普通的紅寶石 ×2、月光石」。
 * @param {string[]} gems 寶石代碼。
 * @returns {string} 摘要。
 */
function gemSummary(gems) {
  const count = new Map();
  for (const key of gems) count.set(key, (count.get(key) || 0) + 1);
  return [...count].map(([key, n]) => `${gemName(key)}${n > 1 ? ` ×${n}` : ''}`).join('、');
}

/** 暫停：停止迴圈、遮住畫面並存檔。 */
function pauseGame() {
  if (app.screen !== 'game' || !app.world || app.ending) return;
  stopLoop();
  resetInput();
  els.pauseCover.hidden = false;
  $('scroll-btn').disabled = app.world.player.scroll <= 0 || app.world.bossDefeated;
  $('scroll-btn').textContent = app.world.player.scroll > 0 ? '使用回城卷軸' : '沒有回城卷軸';
  saveRun();
}

/** 繼續遊戲。 */
function resumeGame() {
  if (app.screen !== 'game' || !app.world) return;
  els.pauseCover.hidden = true;
  startLoop();
}

/** 使用回城卷軸。 */
async function useScroll() {
  const w = app.world;
  if (!w) return;
  if (w.player.scroll <= 0) {
    toast('沒有回城卷軸（可在村莊的商店購買）');
    return;
  }
  if (w.bossDefeated) {
    toast('已擊敗 Boss，走進傳送點即可回村莊');
    return;
  }
  // 確認期間停止遊戲迴圈，避免在對話框開著時被攻擊。
  const wasRunning = app.running;
  stopLoop();
  resetInput();
  const ok = await confirmDialog('使用回城卷軸', '帶著本趟的全部所得返回村莊？', '回城');
  if (ok && w.useScroll()) {
    els.pauseCover.hidden = true;
    handleEvents();
  } else if (wasRunning && els.pauseCover.hidden) {
    startLoop();
  }
}

/** 放棄探險（等同倒下）。 */
async function abandonRun() {
  if (!app.world || !(await confirmDialog('放棄探險', '放棄這一趟探險嗎？經驗值與裝備保留，但會失去一半本趟撿到的金幣。', '放棄'))) return;
  els.pauseCover.hidden = true;
  endRun('abandon');
}

/**
 * 顯示短訊息（遊戲畫面上方）。
 * @param {string} text 訊息。
 * @param {string} [cls] 額外的 class（稀有度顏色）。
 */
function toast(text, cls = '') {
  els.toast.textContent = text;
  els.toast.className = `toast show ${cls}`;
  clearTimeout(app.toastTimer);
  app.toastTimer = setTimeout(() => {
    els.toast.className = 'toast';
  }, TOAST_MS);
}

/**
 * 更新 HUD（數值有變化時才寫入 DOM）。
 * @param {boolean} force 是否強制更新。
 */
function updateHud(force) {
  const w = app.world;
  if (!w) return;
  const p = w.player;
  const ch = w.ch;
  const c = app.hudCache;
  /**
   * 數值改變時才更新元素。
   * @param {string} key 快取鍵。
   * @param {any} value 新值。
   * @param {() => void} fn 更新函式。
   */
  const set = (key, value, fn) => {
    if (!force && c[key] === value) return;
    c[key] = value;
    fn();
  };
  set('hp', `${p.hp}/${p.maxHp}`, () => {
    // 血條立即變化，白色殘影稍後才跟上（CSS transition），讓受到的傷害一目了然。
    const pct = `${(p.hp / p.maxHp) * 100}%`;
    $('hp-fill').style.width = pct;
    $('hp-trail').style.width = pct;
    $('hp-text').textContent = `${p.hp}／${p.maxHp}`;
    $('hp-fill').parentElement.classList.toggle('low', p.hp / p.maxHp < 0.3);
  });
  const cap = levelCap(ch.rebirth || 0);
  const need = xpToNext(ch.level, cap);
  set('xp', `${ch.level}/${ch.xp}/${ch.rebirth || 0}`, () => {
    $('xp-fill').style.width = ch.level >= cap ? '100%' : `${(ch.xp / need) * 100}%`;
    // 轉職過的角色在等級前顯示星數（每轉職一次一顆）。
    $('hud-level').textContent = `${'★'.repeat(ch.rebirth || 0)}${ch.level >= cap ? 'MAX' : ch.level}`;
  });
  set('floor', `${w.area}/${w.floorIndex}`, () => {
    const rb = w.ch.rebirth || 0;
    $('hud-floor').textContent = `${AREAS[w.area].name} ${w.depth}-${w.floorIndex >= 3 ? 'B' : w.floorIndex + 1}${rb ? ` ${'★'.repeat(rb)}` : ''}`;
  });
  set('gold', w.loot.gold, () => {
    $('hud-gold').textContent = w.loot.gold;
  });
  set('time', Math.floor(w.elapsed), () => {
    $('timer').textContent = formatTime(w.elapsed * 1000);
  });
  set('recall', `${p.scroll}/${w.bossDefeated}`, () => {
    $('recall-count').textContent = p.scroll;
    $('recall-btn').classList.toggle('empty', p.scroll <= 0 || w.bossDefeated);
  });
  set('potions', p.potions, () => {
    $('potion-count').textContent = p.potions;
    $('potion-btn').classList.toggle('empty', p.potions <= 0);
  });
  set('potionCd', Math.ceil(Math.max(0, p.potionCd) * 10), () => {
    cooldown('potion', p.potionCd, 3, Math.ceil(p.potionCd));
  });
  set('cures', p.cures, () => {
    $('cure-count').textContent = p.cures;
    $('cure-btn').classList.toggle('empty', p.cures <= 0);
  });
  set('cureCd', Math.ceil(Math.max(0, p.cureCd) * 10), () => cooldown('cure', p.cureCd, 1, ''));
  // 提醒使用：HP 低於 50% 且有回復藥水、身上有異常狀態且有淨化藥水時閃爍（冷卻中不閃）。
  const lowHp = p.hp > 0 && p.hp < p.maxHp * 0.5 && p.potions > 0 && p.potionCd <= 0;
  const ailing = (p.status.poison > 0 || p.status.sleep > 0 || p.status.stun > 0) && p.cures > 0 && p.cureCd <= 0;
  set('potionAlert', lowHp, () => $('potion-btn').classList.toggle('alert', lowHp));
  set('cureAlert', ailing, () => $('cure-btn').classList.toggle('alert', ailing));
  // 異常狀態與護盾：HP 條下方的小標籤（剩餘秒數）。
  const st = p.status;
  const chips = [];
  for (const k of ['poison', 'sleep', 'stun']) if (st[k] > 0) chips.push(`<span class="st-chip st-${k}">${STATUS[k].name} ${Math.ceil(st[k])}</span>`);
  if (p.shield > 0) chips.push(`<span class="st-chip st-shield">護盾 ${p.shield}</span>`);
  if (p.wardT > 0) chips.push(`<span class="st-chip st-ward">免疫 ${Math.ceil(p.wardT)}</span>`);
  const chipHtml = chips.join('');
  set('status', chipHtml, () => {
    $('hud-status').innerHTML = chipHtml;
    els.stage.classList.toggle('asleep', st.sleep > 0);
  });
  for (const n of [0, 1]) {
    const kind = p.actives[n];
    const cd = kind ? Math.max(0, p.gemCd[n]) : 0;
    // 護盾效果的剩餘秒數（右上角的小標籤）。
    const left = kind === 'shield' ? (p.shield > 0 ? p.shieldT : 0) : kind === 'ward' ? Math.max(0, p.wardT) : 0;
    set(`gemKind${n}`, kind || 'none', () => {
      $(`gem${n + 1}-btn`).hidden = !kind;
      if (!kind) return;
      $(`gem${n + 1}-icon`).innerHTML = ICONS[kind];
      $(`gem${n + 1}-btn`).setAttribute('aria-label', GEMS[kind].label);
      $(`gem${n + 1}-btn`).dataset.kind = kind;
    });
    set(`gemCd${n}`, Math.ceil(cd * 10), () => cooldown(`gem${n + 1}`, cd, kind ? GEMS[kind].cd : 1, Math.ceil(cd)));
    set(`gemDur${n}`, Math.ceil(left), () => {
      $(`gem${n + 1}-dur`).textContent = left > 0 ? Math.ceil(left) : '';
      $(`gem${n + 1}-btn`).classList.toggle('active', left > 0);
    });
  }
  for (const n of [0, 1, 2, 3]) {
    const sk = w.skills[n];
    const cd = sk ? Math.max(0, p.skillCd[n]) : 0;
    set(`skillId${n}`, sk ? sk.id : n < w.skills.length ? 'none' : 'locked', () => {
      const btn = $(`skill${n + 1}-btn`);
      // 第 3、4 格在轉職後才出現。
      btn.hidden = n >= w.skills.length;
      // 有第 3、4 格技能時，藥水往上移一排。
      if (n === 2) btn.parentElement.classList.toggle('four-skills', w.skills.length > 2);
      btn.classList.toggle('empty', !sk);
      $(`skill${n + 1}-icon`).innerHTML = sk ? skillIcon(sk.id, sk.kind) : '';
      $(`skill${n + 1}-name`).textContent = sk ? sk.short : '未裝備';
    });
    set(`skill${n}`, Math.ceil(cd * 10), () => cooldown(`skill${n + 1}`, cd, sk ? sk.cd : 1, Math.ceil(cd)));
  }
  set('dodgeCd', Math.ceil(Math.max(0, p.dodgeCd) * 10), () => cooldown('dodge', p.dodgeCd, 1.2 * (1 - p.pb.dodgeCd / 100), p.dodgeCd.toFixed(1)));
  const boss = w.boss();
  set('boss', boss ? `${boss.hp}/${boss.phase2}/${boss.enraged}/${boss.state === 'healing'}` : 'none', () => {
    $('boss-bar').hidden = !boss;
    if (boss) {
      $('boss-name').textContent = `${boss.abyss ? '強化・' : ''}${boss.name}${boss.state === 'healing' ? '（回復中）' : boss.enraged ? '（狂暴）' : boss.phase2 ? '（第二階段）' : ''}`;
      $('boss-bar').classList.toggle('healing', boss.state === 'healing');
      $('boss-fill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      $('boss-trail').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    }
  });
}

/**
 * 更新按鈕的放射狀冷卻遮罩與秒數；冷卻結束的瞬間閃一下提示可再使用。
 * @param {string} name 按鈕名稱（potion、cure、dodge、skill1～skill4、gem1、gem2）。
 * @param {number} left 剩餘秒數。
 * @param {number} total 冷卻總秒數。
 * @param {string | number} label 顯示的秒數。
 */
function cooldown(name, left, total, label) {
  const btn = $(`${name}-btn`);
  const cd = $(`${name}-cd`);
  const cooling = left > 0;
  cd.style.setProperty('--p', cooling ? Math.min(1, left / total).toFixed(3) : '0');
  cd.textContent = cooling ? label : '';
  if (btn.classList.contains('cooling') && !cooling) {
    btn.classList.remove('ready');
    void btn.offsetWidth;
    btn.classList.add('ready');
  }
  btn.classList.toggle('cooling', cooling);
}

/**
 * 手機震動回饋（支援的裝置才有作用，跟隨「畫面震動」設定）。
 * @param {number} ms 毫秒。
 */
function buzz(ms) {
  if (app.settings.shake && navigator.vibrate) navigator.vibrate(ms);
}

// ---------- 輸入 ----------

/** 清除所有輸入狀態（暫停或切換畫面時）。 */
function resetInput() {
  const i = app.input;
  i.keys.clear();
  i.stick = { x: 0, y: 0 };
  i.attackHeld = false;
  i.dodge = false;
  i.potion = false;
  i.cure = false;
  i.skill = [false, false, false, false];
  i.gem = [false, false];
  app.stickPointer = null;
  app.attackPointer = null;
  idleStick();
  $('attack-btn').classList.remove('pressed');
}

/**
 * 合併鍵盤與搖桿輸入。
 * @returns {{mx: number, my: number, attack: boolean, dodge: boolean, potion: boolean, cure: boolean, skill1: boolean, skill2: boolean, skill3: boolean, skill4: boolean, gem1: boolean, gem2: boolean}} 輸入。
 */
function readInput() {
  const i = app.input;
  const k = i.keys;
  let mx = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
  let my = (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0);
  if (mx && my) {
    mx *= Math.SQRT1_2;
    my *= Math.SQRT1_2;
  }
  if (!mx && !my) {
    mx = i.stick.x;
    my = i.stick.y;
  }
  return {
    mx, my, attack: i.attackHeld || k.has('attack'), dodge: i.dodge, potion: i.potion, cure: i.cure,
    skill1: i.skill[0], skill2: i.skill[1], skill3: i.skill[2], skill4: i.skill[3], gem1: i.gem[0], gem2: i.gem[1],
  };
}

/** 持續按住的按鍵與對應動作。 */
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyJ: 'attack', Space: 'attack',
};

/**
 * 鍵盤按下。
 * @param {KeyboardEvent} e 鍵盤事件。
 */
function onKeyDown(e) {
  if (!els.modal.hidden) {
    if (e.key === 'Escape') closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
    return;
  }
  if (app.screen !== 'game') return;
  if (!els.pauseCover.hidden) {
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      resumeGame();
    }
    return;
  }
  if (e.code === 'KeyP' || e.key === 'Escape') {
    pauseGame();
    return;
  }
  if (e.code === 'KeyK' || e.key === 'Shift') app.input.dodge = true;
  else if (e.code === 'KeyL') app.input.potion = true;
  else if (e.code === 'KeyH') pressCure();
  else if (e.code === 'KeyU') pressSkill(0);
  else if (e.code === 'KeyI') pressSkill(1);
  else if (e.code === 'KeyO') pressSkill(2);
  else if (e.code === 'KeyY') pressSkill(3);
  else if (e.code === 'Digit1') pressGem(0);
  else if (e.code === 'Digit2') pressGem(1);
  else if (e.code === 'KeyM') {
    app.settings.minimap = !app.settings.minimap;
    store.saveSettings(app.settings);
    $('minimap-frame').hidden = !app.settings.minimap;
  } else if (KEYMAP[e.code]) app.input.keys.add(KEYMAP[e.code]);
  else return;
  e.preventDefault();
}

/**
 * 鍵盤放開。
 * @param {KeyboardEvent} e 鍵盤事件。
 */
function onKeyUp(e) {
  if (KEYMAP[e.code]) app.input.keys.delete(KEYMAP[e.code]);
}

/** 搖桿回到閒置位置（左下角，半透明）。 */
function idleStick() {
  els.stick.classList.add('idle');
  els.stick.style.left = '';
  els.stick.style.top = '';
  els.stickKnob.style.transform = '';
}

/**
 * 浮動搖桿：在搖桿區任何位置按下，搖桿底座就移到手指下，拖曳決定方向與力道（死區 12%，拖到半徑 30% 為全速）。
 * 手機使用原生觸控事件並在按下時阻止瀏覽器的預設手勢，避免長按或拖曳時被判定為「觸控取消」而停下；
 * 只有手指真的離開才停止。滑鼠則使用指標事件。點地移動模式下，短按（未拖曳）視為點選地圖上的該位置。
 */
function bindStick() {
  const R = 46;
  /**
   * 開始操作搖桿：底座移到按下的位置。
   * @param {string} id 手指或指標的識別碼。
   * @param {number} cx 畫面 x。
   * @param {number} cy 畫面 y。
   */
  const begin = (id, cx, cy) => {
    const rect = els.stickZone.getBoundingClientRect();
    app.stickPointer = { id, x: cx, y: cy, moved: 0, t: performance.now() };
    els.stick.classList.remove('idle');
    els.stick.style.left = `${cx - rect.left}px`;
    els.stick.style.top = `${cy - rect.top}px`;
    els.stickKnob.style.transform = '';
    if (app.world) app.world.player.path = [];
  };
  /**
   * 依手指位置更新搖桿向量。
   * @param {number} cx 畫面 x。
   * @param {number} cy 畫面 y。
   */
  const move = (cx, cy) => {
    const s = app.stickPointer;
    const dx = cx - s.x;
    const dy = cy - s.y;
    const len = Math.hypot(dx, dy);
    s.moved = Math.max(s.moved, len);
    // 方向一律以手指相對於中心的單位向量計算；手指拖到半徑外時只把搖桿頭的顯示限制在邊緣，速度維持全速。
    const ux = dx / (len || 1);
    const uy = dy / (len || 1);
    const shown = Math.min(len, R);
    els.stickKnob.style.transform = `translate(${ux * shown}px, ${uy * shown}px)`;
    // 死區 12%；一離開死區就有 6 成速度，拖到半徑 30%（約 14px）即為全速，與鍵盤相同。
    const r = Math.min(1, len / R);
    const k = r < 0.12 ? 0 : Math.min(1, 0.6 + ((r - 0.12) / 0.18) * 0.4);
    app.input.stick = k === 0 ? { x: 0, y: 0 } : { x: ux * k, y: uy * k };
  };
  /**
   * 手指離開：停止移動，搖桿回到閒置位置；點地移動模式下的短按改為設定目的地。
   * @param {number} cx 放開時的畫面 x。
   * @param {number} cy 放開時的畫面 y。
   * @param {boolean} released 是否為正常放開（取消時不當作點地）。
   */
  const finish = (cx, cy, released) => {
    const s = app.stickPointer;
    app.stickPointer = null;
    app.input.stick = { x: 0, y: 0 };
    idleStick();
    if (released && app.settings.tapMove && s.moved < 10 && performance.now() - s.t < 300) tapMoveAt(cx, cy);
  };
  /**
   * 在觸控清單中找出目前操作搖桿的手指。
   * @param {TouchList} list 觸控清單。
   * @returns {Touch | null} 手指。
   */
  const findTouch = (list) => {
    for (const t of list) if (app.stickPointer && `t${t.identifier}` === app.stickPointer.id) return t;
    return null;
  };
  els.stickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (app.stickPointer) return;
    const t = e.changedTouches[0];
    begin(`t${t.identifier}`, t.clientX, t.clientY);
  }, { passive: false });
  els.stickZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = findTouch(e.changedTouches);
    if (t) move(t.clientX, t.clientY);
  }, { passive: false });
  /**
   * 手指離開或系統中斷觸控。系統中斷時，若這根手指其實還在螢幕上（仍在 touches 清單中），就繼續維持移動。
   * @param {TouchEvent} e 觸控事件。
   */
  const touchEnd = (e) => {
    const t = findTouch(e.changedTouches);
    if (!t) return;
    if (e.type === 'touchcancel' && findTouch(e.touches)) return;
    finish(t.clientX, t.clientY, e.type === 'touchend');
  };
  els.stickZone.addEventListener('touchend', touchEnd);
  els.stickZone.addEventListener('touchcancel', touchEnd);
  // 滑鼠（桌面）：觸控已由上面的觸控事件處理，這裡略過觸控產生的指標事件。
  els.stickZone.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || app.stickPointer) return;
    e.preventDefault();
    els.stickZone.setPointerCapture(e.pointerId);
    begin(`p${e.pointerId}`, e.clientX, e.clientY);
  });
  els.stickZone.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch' && app.stickPointer && app.stickPointer.id === `p${e.pointerId}`) move(e.clientX, e.clientY);
  });
  /**
   * 滑鼠放開。
   * @param {PointerEvent} e 指標事件。
   */
  const pointerEnd = (e) => {
    if (e.pointerType === 'touch' || !app.stickPointer || app.stickPointer.id !== `p${e.pointerId}`) return;
    finish(e.clientX, e.clientY, e.type === 'pointerup');
  };
  els.stickZone.addEventListener('pointerup', pointerEnd);
  els.stickZone.addEventListener('pointercancel', pointerEnd);
}

/**
 * 點地移動：把畫面座標換成地圖座標並設定目的地。
 * @param {number} clientX 畫面 x。
 * @param {number} clientY 畫面 y。
 */
function tapMoveAt(clientX, clientY) {
  if (!app.world || !app.running) return;
  const rect = els.canvas.getBoundingClientRect();
  const pt = app.renderer.screenToWorld(clientX - rect.left, clientY - rect.top);
  if (!app.world.setMoveTarget(pt.x, pt.y)) toast('那裡走不過去');
}

/**
 * 按下技能鈕或技能鍵：沒有裝備、冷卻中、睡眠或暈眩時以短訊息說明。
 * @param {number} n 技能欄位（0～3）。
 */
function pressSkill(n) {
  const w = app.world;
  if (!w || n >= w.skills.length) return;
  const sk = w.skills[n];
  const st = w.player.status;
  if (!sk) toast(`技能 ${n + 1} 沒有裝備技能（在村莊的「技能」分頁設定）`);
  else if (w.player.skillCd[n] > 0) toast(`${sk.name}冷卻中（${Math.ceil(w.player.skillCd[n])} 秒）`);
  else if (st.sleep > 0 || st.stun > 0) toast(`${st.sleep > 0 ? '睡眠' : '暈眩'}中不能使用技能`);
  else app.input.skill[n] = true;
}

/** 按下淨化藥水鈕或按鍵：沒有藥水或沒有異常狀態時以短訊息說明。 */
function pressCure() {
  const w = app.world;
  if (!w) return;
  if (w.player.cures <= 0) toast('沒有淨化藥水了（可在村莊的商店購買）');
  else if (!w.playerAfflicted()) toast('現在沒有異常狀態');
  else app.input.cure = true;
}

/**
 * 按下主動寶石鈕或按鍵：冷卻中時以短訊息說明。
 * @param {number} n 按鈕位置（0 或 1）。
 */
function pressGem(n) {
  const w = app.world;
  if (!w) return;
  const kind = w.player.actives[n];
  if (!kind) return;
  if (w.player.gemCd[n] > 0) toast(`${GEMS[kind].label}冷卻中（${Math.ceil(w.player.gemCd[n])} 秒）`);
  else app.input.gem[n] = true;
}

/** 動作按鈕：攻擊按住連續、閃避與藥水為點按；點地移動模式下點地圖設定目的地。 */
function bindButtons() {
  const atk = $('attack-btn');
  /** 按住攻擊鍵（記錄是哪一根手指或哪個指標按住）。 */
  const hold = (id) => {
    app.attackPointer = id;
    app.input.attackHeld = true;
    atk.classList.add('pressed');
  };
  /** 放開攻擊鍵。 */
  const release = () => {
    app.attackPointer = null;
    app.input.attackHeld = false;
    atk.classList.remove('pressed');
  };
  // 手機用原生觸控事件，按住時不會被瀏覽器的長按手勢中斷；滑鼠用指標事件。
  atk.addEventListener('touchstart', (e) => {
    e.preventDefault();
    hold(`t${e.changedTouches[0].identifier}`);
  }, { passive: false });
  /**
   * 攻擊鍵上的手指離開（系統中斷但手指仍在螢幕上時繼續按住）。
   * @param {TouchEvent} e 觸控事件。
   */
  const touchUp = (e) => {
    const mine = (list) => [...list].some((t) => `t${t.identifier}` === app.attackPointer);
    if (!mine(e.changedTouches)) return;
    if (e.type === 'touchcancel' && mine(e.touches)) return;
    release();
  };
  atk.addEventListener('touchend', touchUp);
  atk.addEventListener('touchcancel', touchUp);
  atk.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    atk.setPointerCapture(e.pointerId);
    hold(`p${e.pointerId}`);
  });
  /**
   * 滑鼠放開攻擊鍵。
   * @param {PointerEvent} e 指標事件。
   */
  const pointerUp = (e) => {
    if (e.pointerType !== 'touch') release();
  };
  atk.addEventListener('pointerup', pointerUp);
  atk.addEventListener('pointercancel', pointerUp);
  $('dodge-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    app.input.dodge = true;
  });
  $('potion-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = app.world && app.world.player;
    if (!p) return;
    if (p.potions <= 0) toast('沒有回復藥水了');
    else if (p.hp >= p.maxHp) toast('HP 已經全滿');
    else if (p.potionCd > 0) toast(`藥水冷卻中（${Math.ceil(p.potionCd)} 秒）`);
    else app.input.potion = true;
  });
  for (const n of [0, 1, 2, 3]) {
    $(`skill${n + 1}-btn`).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pressSkill(n);
    });
  }
  $('cure-btn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pressCure();
  });
  for (const n of [0, 1]) {
    $(`gem${n + 1}-btn`).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pressGem(n);
    });
  }
  els.canvas.addEventListener('pointerdown', (e) => {
    if (app.settings.tapMove) tapMoveAt(e.clientX, e.clientY);
  });
}

// ---------- 首頁的對話框 ----------

/** 顯示統計。 */
async function openStats() {
  const stats = store.loadStats();
  const rows = AREA_KEYS.map((a) => {
    const s = stats[a];
    const avg = s.completed ? formatTime(s.totalMs / s.completed) : '—';
    return `<tr><td>${AREAS[a].name}</td><td>${s.started}</td><td>${s.completed}</td><td>${s.bestMs === null ? '—' : formatTime(s.bestMs)}</td><td>${avg}</td><td>${s.noHint}</td><td>${s.deaths}</td><td>${s.bestDepth || '—'}</td></tr>`;
  }).join('');
  const html = `<div class="table-wrap"><table class="stats-table"><thead><tr><th>地城</th><th>進入</th><th>擊敗 Boss</th><th>最快</th><th>平均</th><th>不喝藥</th><th>倒下</th><th>最深</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="muted small">「不喝藥」為沒有使用藥水就擊敗 Boss 的次數；角色個別的統計在村莊的「角色」分頁。</p>`;
  const v = await openModal({ title: '統計', html, actions: [{ label: '重設統計', value: 'reset', className: 'danger' }, { label: '關閉', value: null, className: 'primary' }] });
  if (v === 'reset' && (await confirmDialog('重設統計', '確定要清除所有地城統計嗎？角色與裝備不受影響。', '重設'))) {
    store.resetStats();
    openStats();
  }
}

/** 顯示玩法說明。 */
function openRules() {
  openModal({
    title: '玩法',
    html: `<ol>
      <li>建立角色（戰士、弓箭手、法師、盜賊、武僧各一位），在村莊選擇地城與深度後出發。</li>
      <li>每趟有 3 層＋Boss 層。找到<b>金色樓梯</b>下樓，在最後一層擊敗 Boss，走進傳送點回村。</li>
      <li>打倒怪物得到經驗值、金幣與裝備；裝備有<b>普通、精良、稀有、傳說</b>四種稀有度。</li>
      <li>地上出現<b>紅色範圍</b>或<b>虛線</b>時，代表怪物即將攻擊那裡，趕快閃避！</li>
      <li>倒下時保留經驗值與裝備，但會失去一半本趟撿到的金幣。回城卷軸可以帶著全部所得回村。</li>
      <li>擊敗 Boss 後解鎖更深的深度與下一個地城。</li>
      <li>每個職業有 4 個基本技能，在 Lv.1、5、12、20 解鎖；每轉職一次再解鎖 2 個轉職技能。每升 1 級得到 1 技能點。技能欄 2 格，每轉職一次多 1 格（最多 4 格）。另有<b>被動技能</b>（Lv.8、Lv.16 各 1 個，每轉職一次再 1 個），花技能點學習，學會後一直生效。</li>
      <li><b>單手與雙手武器</b>：單手武器（劍、弩、魔杖）可以搭配副手的盾牌；雙手武器（斧、弓、法杖）攻擊較高，但佔用兩隻手、不能拿盾牌。</li>
      <li><b>異常狀態</b>：中毒（5 秒內每秒失去 2% HP，會被毒死）、睡眠（10 秒不能行動，被攻擊 3 次醒來）、暈眩（10 秒不能行動，被攻擊也不會醒）。喝<b>淨化藥水</b>可以解除。你的武器和部分技能也能讓敵人陷入這些狀態（Boss 只受 30% 的時間）。</li>
      <li><b>分解與合成</b>：在倉庫點裝備可以「分解」成材料（有機會多得高品質材料）；用製作書加 12 個同品質材料，在鐵匠合成保證品質的裝備。製作書從打怪、寶箱或商店取得。</li>
      <li><b>寶石</b>：鑲在裝備的孔裡（普通、精良 1 孔；稀有、傳說 2 孔）。紅寶石＝攻擊、翡翠＝HP、藍寶石＝防禦、黃玉＝速度、血石＝吸血；3 顆同級可以合成高一級。守護鑽石（血量護盾）與月光石（抗異常護盾）會在地城右上出現按鈕。</li>
    </ol>
    <h3>操作</h3>
    <ul>
      <li>手機：左下按住拖曳移動；右下「攻擊」按住連續攻擊、「閃避」翻滾（短暫無敵）；金色按鈕是技能（2 × 2，轉職後最多 4 顆）；右上是回城卷軸與道具按鈕（藥水回復 40% HP、淨化藥水解除異常狀態、主動寶石）。</li>
      <li>設定中可開啟「點地移動」：點地圖上的位置，角色自動走過去。</li>
      <li>鍵盤：WASD／方向鍵移動、J／空白鍵攻擊、K／Shift 閃避、L 藥水、H 淨化藥水、U／I／O／Y 技能 1～4、1／2 主動寶石、M 小地圖、P／Esc 暫停。</li>
    </ul>
    <h3>注意</h3>
    <ul>
      <li>進度只存在這台裝置的瀏覽器中。iOS Safari 未加入主畫面時，7 天未使用可能被清除資料。</li>
      <li>主畫面 App 與 Safari 的資料互不相通，請固定用同一種方式開啟。</li>
    </ul>`,
    actions: [{ label: '知道了', value: null, className: 'primary' }],
  });
}

/** 顯示設定（點地移動、瞄準輔助、省電模式、畫面震動）。 */
async function openSettings() {
  const items = [
    ['tapMove', '點地移動', '點地圖位置自動走過去（不需拖曳）'],
    ['aimAssist', '瞄準輔助', '攻擊時自動轉向最近的怪物'],
    ['saver', '省電模式', '畫面改為每秒 30 幀'],
    ['shake', '畫面震動', '受傷與 Boss 攻擊時震動畫面'],
  ];
  for (;;) {
    const v = await openModal({
      title: '設定',
      menu: items.map(([k, name, desc]) => ({ label: `<span>${name}<small>${desc}</small></span><b class="toggle ${app.settings[k] ? 'on' : ''}">${app.settings[k] ? '開' : '關'}</b>`, value: k, className: 'setting-row' })),
      actions: [{ label: '完成', value: null, className: 'primary' }],
    });
    if (!v) return;
    app.settings[v] = !app.settings[v];
    store.saveSettings(app.settings);
  }
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
 * 確認所有必要資源都在快取中，更新離線狀態（詢問本遊戲自己註冊的 Service Worker）。
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
async function applyUpdate() {
  if (app.screen === 'game') pauseGame();
  await saveRun();
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

/**
 * 在首頁顯示提示訊息。
 * @param {string[]} paragraphs 段落文字（內建字串）。
 */
function showHomeNotice(paragraphs) {
  els.homeNotice.innerHTML = paragraphs.map((p) => `<p>${p}</p>`).join('');
  els.homeNotice.hidden = paragraphs.length === 0;
}

/** 首頁橫幅的像素裝飾（劍、盾、金幣、鑰匙）。 */
function buildHeroDeco() {
  const deco = [
    ['sword', 56, 10, 5], ['shield', 76, 8, 4], ['coin', 88, 48, 5], ['key', 64, 58, 4], ['coin', 72, 36, 3],
  ];
  $('hero-deco').innerHTML = deco.map(([n, l, t, s]) => `<img src="${itemDataUrl(n, s)}" alt="" style="left:${l}%;top:${t}%">`).join('');
}

/** 綁定所有事件。 */
function bindEvents() {
  els.themeBtn.addEventListener('click', cycleTheme);
  els.continueBtn.addEventListener('click', continueRun);
  els.charList.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.create) createCharacter(b.dataset.create);
    else if (b.dataset.char) selectCharacter(b.dataset.char);
  });
  $('rules-btn').addEventListener('click', openRules);
  $('stats-btn').addEventListener('click', openStats);
  $('settings-btn').addEventListener('click', openSettings);
  $('village-home-btn').addEventListener('click', goHome);
  $('gift-btn').addEventListener('click', () => {
    const ch = currentChar();
    if (ch) openRewards(ch);
  });
  els.villageTabs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    app.tab = b.dataset.tab;
    els.villageMessage.textContent = '';
    // 換分頁時回到頂端（地城分頁之後會自動捲到目前進度的關卡）。
    window.scrollTo(0, 0);
    els.villagePanel.scrollTop = 0;
    renderVillage();
  });
  els.villagePanel.addEventListener('click', onVillageClick);
  $('pause-btn').addEventListener('click', pauseGame);
  $('resume-btn').addEventListener('click', resumeGame);
  $('scroll-btn').addEventListener('click', useScroll);
  $('recall-btn').addEventListener('click', useScroll);
  $('abandon-btn').addEventListener('click', abandonRun);
  $('game-home-btn').addEventListener('click', goHome);
  $('update-btn').addEventListener('click', applyUpdate);
  els.modal.addEventListener('click', (e) => {
    if (e.target === els.modal) closeModal(JSON.parse(els.modal.dataset.dismiss || 'null'));
  });
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  bindStick();
  bindButtons();

  window.addEventListener('popstate', () => {
    if (app.ignorePop) {
      app.ignorePop = false;
      return;
    }
    if (app.screen === 'game') {
      if (app.ending) {
        history.pushState({ screen: 'game' }, '');
        return;
      }
      pauseGame();
      stopLoop();
    }
    if (app.screen !== 'home') {
      closeModal(null);
      showScreen('home');
      renderHome();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (app.screen === 'game') pauseGame();
    } else {
      maybeCheckUpdate();
      if (app.screen === 'home') renderHome();
    }
  });
  window.addEventListener('pagehide', () => {
    if (app.screen === 'game') pauseGame();
  });
  window.addEventListener('resize', () => {
    if (app.screen === 'game' && app.renderer) {
      app.renderer.resize();
      if (!app.running && app.world) app.renderer.draw(app.world, 0);
    }
  });
  window.addEventListener('blur', resetInput);

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

/** 啟動程式：讀取存檔後顯示首頁。 */
async function init() {
  applyTheme();
  buildHeroDeco();
  fillIcons(document);
  bindEvents();
  if (history.state && history.state.screen) history.replaceState(null, '');
  const ok = await store.openDb();
  const data = await store.loadAll();
  app.chars = data.characters;
  app.run = data.run;
  app.shared = data.shared;
  app.claimed = data.claimed;
  app.current = data.meta.current && app.chars.has(data.meta.current) ? data.meta.current : null;
  const notices = [];
  if (!ok) notices.push('此瀏覽器無法儲存資料（可能是私密瀏覽模式），關閉後進度會遺失。');
  for (const p of data.problems) notices.push(`${p}。`);
  if (isIosBrowserTab()) {
    notices.push('建議用 Safari 的「分享 → 加入主畫面」安裝，並從主畫面圖示開啟：主畫面 App 與 Safari 的進度互不相通，只在 Safari 中玩時，7 天未使用可能被清除資料。');
  }
  showHomeNotice(notices);
  setupPortalLink();
  showScreen('home');
  renderHome();
  setupServiceWorker();
}

/** 測試與除錯用：取得目前的狀態（不影響遊戲）。 */
window.__pd = () => app;

init();
