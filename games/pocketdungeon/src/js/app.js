// 主程式：首頁、村莊、地城畫面、遊戲迴圈、輸入、存檔與 Service Worker。

import * as store from './storage.js';
import { CLASSES, CLASS_KEYS, AREAS, AREA_KEYS, RARITIES, LIMITS, MAX_LEVEL, EQUIP_SLOTS, ITEM_SLOTS, BAG_EXPAND, EVOLVE } from './pd/data.js';
import { xpToNext, characterStats, speedProfile, describeStats, sellPrice, enhanceCost } from './pd/rules.js';
import { World } from './pd/world.js';
import { Renderer } from './pd/render.js';
import { heroDataUrl, itemDataUrl } from './pd/sprites.js';
import * as village from './pd/village.js';
import * as skills from './pd/skills.js';
import { ICONS, fillIcons } from './icons.js';

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
  /** 進行中的探險 {charId, snap}。 */
  run: null,
  current: null,
  settings: store.loadSettings(),
  screen: 'home',
  tab: 'gate',
  world: null,
  renderer: null,
  raf: 0,
  running: false,
  lastTs: 0,
  acc: 0,
  saveTimer: 0,
  transition: false,
  ending: false,
  input: { keys: new Set(), stick: { x: 0, y: 0 }, attackHeld: false, dodge: false, potion: false, skill: [false, false] },
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
  return `<div class="item-main">${itemTitle(item)}<span class="item-stats">${ITEM_SLOTS[item.slot]}・${describeStats(item)}</span></div>`;
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
    els.continueDetail.textContent = `${ch.name}（${CLASSES[ch.cls].name} Lv.${ch.level}）・${AREAS[s.area].name} 深度 ${s.depth}・${floor}・${formatTime(s.elapsed * 1000)}`;
    els.continueBtn.hidden = false;
  } else {
    els.continueBtn.hidden = true;
  }
  els.charList.innerHTML = CLASS_KEYS.map((cls) => {
    const ch = app.chars.get(cls);
    if (!ch) {
      return `<button type="button" class="char-card empty" data-create="${cls}"><img src="${heroDataUrl(cls)}" alt="" class="char-img ghost"><span class="char-text"><b>建立${CLASSES[cls].name}</b><small>${classBlurb(cls)}</small></span></button>`;
    }
    const best = AREA_KEYS.filter((a) => village.areaUnlocked(ch, a)).pop();
    const busy = app.run && app.run.charId === cls ? '<em class="busy">探險中</em>' : '';
    return `<button type="button" class="char-card" data-char="${cls}" data-cls="${cls}"><img src="${heroDataUrl(cls)}" alt="" class="char-img"><span class="char-text"><b>${esc(ch.name)} ${busy}</b><small>${CLASSES[cls].name}・Lv.${ch.level}・${AREAS[best].name} 深度 ${village.maxDepth(ch, best)}</small><small class="gold-text">${ch.gold}G</small></span></button>`;
  }).join('');
}

/**
 * 職業簡介。
 * @param {string} cls 職業。
 * @returns {string} 文字。
 */
function classBlurb(cls) {
  return { warrior: '近戰・耐打・扇形揮砍', archer: '遠程・靈活・直線射箭', mage: '遠程・範圍・爆炸法球' }[cls];
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
  $('village-level').textContent = `${CLASSES[ch.cls].name}・Lv.${ch.level}${ch.level >= MAX_LEVEL ? '（MAX）' : ''}`;
  $('village-gold').textContent = `${ch.gold}G`;
  for (const b of els.villageTabs.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.tab === app.tab));
  const panels = { gate: gatePanel, shop: shopPanel, smith: smithPanel, bag: bagPanel, skill: skillPanel, hero: heroPanel };
  els.villagePanel.innerHTML = panels[app.tab](ch);
}

/**
 * 地城入口分頁：區域、深度與攜帶物品。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function gatePanel(ch) {
  const busy = app.run ? `<p class="notice-inline">${esc(app.chars.get(app.run.charId).name)} 的探險尚未結束，開始新的探險前須先完成或放棄那一趟。</p>` : '';
  const carry = `<p class="carry">攜帶：回復藥水 ${Math.min(LIMITS.potions, ch.potions)} 瓶・回城卷軸 ${Math.min(1, ch.scroll)} 張 <small class="muted">（在商店補充）</small></p>`;
  const areas = AREA_KEYS.map((area) => {
    const a = AREAS[area];
    const unlocked = village.areaUnlocked(ch, area);
    if (!unlocked) {
      const prev = AREA_KEYS[AREA_KEYS.indexOf(area) - 1];
      return `<div class="area-card locked" data-area="${area}"><div class="area-head"><b>🔒 ${a.name}</b><small>建議 Lv.${a.recommend[0]}～${a.recommend[1]}</small></div><p class="muted">擊敗${AREAS[prev].name}的 Boss 後解鎖</p></div>`;
    }
    const max = village.maxDepth(ch, area);
    const depths = [];
    for (let d = Math.max(1, max - 4); d <= max; d++) {
      // 破關次數與進化狀態：已進化（紅標）、破關滿 5 次可能進化（金標）。
      const key = `${area}-${d}`;
      const clears = (ch.clears && ch.clears[key]) || 0;
      const evolved = ch.evolved && ch.evolved[key];
      const tag = evolved ? '<em class="evo-tag on">進化 Boss</em>' : clears >= EVOLVE.clears ? '<em class="evo-tag">可能進化</em>' : '';
      depths.push(`<button type="button" class="depth-btn${evolved ? ' evolved' : ''}" data-start="${area}" data-depth="${d}"${app.run ? ' disabled' : ''}><b>深度 ${d}</b><small>${village.depthLabel(area, d)}</small><small>破關 ${clears} 次</small>${tag}</button>`);
    }
    return `<div class="area-card" data-area="${area}"><div class="area-head"><b>${a.name}</b><small>建議 Lv.${a.recommend[0]}～${a.recommend[1]}・3 層＋Boss</small></div><div class="depth-list">${depths.join('')}</div></div>`;
  }).join('');
  return `${busy}${carry}<div class="area-list">${areas}</div>`;
}

/**
 * 商店分頁：藥水、卷軸、裝備與賣出。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function shopPanel(ch) {
  if (!ch.shop) village.refreshShop(ch, Math.random);
  const goods = `<div class="shop-row"><img src="${itemDataUrl('potion')}" alt="" class="icon"><div class="item-main"><b>回復藥水</b><span class="item-stats">回復 40% HP・持有 ${ch.potions}／${LIMITS.potions}</span></div><button type="button" class="buy-btn" data-buy="potion">${LIMITS.potionPrice}G</button></div>
    <div class="shop-row"><img src="${itemDataUrl('key')}" alt="" class="icon"><div class="item-main"><b>回城卷軸</b><span class="item-stats">帶著全部所得返回村莊・持有 ${ch.scroll}／1</span></div><button type="button" class="buy-btn" data-buy="scroll">${LIMITS.scrollPrice}G</button></div>
    <div class="shop-row"><img src="${itemDataUrl('pouch')}" alt="" class="icon"><div class="item-main"><b>背包擴充袋</b><span class="item-stats">背包上限 +${BAG_EXPAND.step} 格・目前 ${village.bagLimit(ch)}／${BAG_EXPAND.max} 格${ch.bagExpand ? `・持有 ${ch.bagExpand} 個` : ''}</span></div><button type="button" class="buy-btn" data-buy="pouch"${village.bagExpandPrice(ch) === Infinity ? ' disabled' : ''}>${village.bagExpandPrice(ch) === Infinity ? '已達上限' : `${village.bagExpandPrice(ch)}G`}</button></div>`;
  const items = ch.shop.length
    ? ch.shop.map((e, i) => `<div class="shop-row">${itemHtml(e.item)}${compareHtml(ch, e.item)}<button type="button" class="buy-btn" data-buy-item="${i}">${e.price}G</button></div>`).join('')
    : '<p class="muted">今天的裝備都賣完了，下次回村莊時會進新貨。</p>';
  const sell = ch.bag.length
    ? ch.bag.map((it) => `<div class="shop-row">${itemHtml(it)}<button type="button" class="sell-btn" data-sell="${it.id}">賣 ${sellPrice(it)}G</button></div>`).join('')
    : '<p class="muted">背包是空的。</p>';
  return `<h3>道具</h3>${goods}<h3>今日裝備 <small class="muted">（每次返回村莊時刷新）</small></h3>${items}<h3>賣出 <small class="muted">背包 ${ch.bag.length}／${village.bagLimit(ch)}</small></h3>${sell}`;
}

/**
 * 與目前穿戴的同部位裝備比較（攻擊、防禦、HP 的差值）。
 * @param {object} ch 角色。
 * @param {object} item 裝備。
 * @returns {string} HTML。
 */
function compareHtml(ch, item) {
  const now = characterStats(ch.cls, ch.level, Object.values(ch.equipped));
  const eq = { ...ch.equipped, [village.slotFor(ch, item)]: item };
  const next = characterStats(ch.cls, ch.level, Object.values(eq));
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
  const list = [...Object.values(ch.equipped).filter(Boolean), ...ch.bag];
  if (!list.length) return '<p class="muted">還沒有可以強化的裝備。</p>';
  const rows = list.map((it) => {
    const worn = Object.values(ch.equipped).includes(it) ? '<em class="worn">裝備中</em>' : '';
    if (it.enhance >= 10) return `<div class="shop-row">${itemHtml(it)}${worn}<span class="muted">已達 +10</span></div>`;
    const chance = Math.round(village.enhanceChance(it) * 100);
    return `<div class="shop-row">${itemHtml(it)}${worn}<button type="button" class="buy-btn" data-enhance="${it.id}">+${it.enhance + 1}<small>${enhanceCost(it)}G・${chance}%</small></button></div>`;
  });
  return `<p class="muted small">每級主屬性 +8%；+6 起可能失敗，失敗時等級不變、金幣照扣。</p>${rows.join('')}`;
}

/**
 * 倉庫分頁：裝備欄與背包。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function bagPanel(ch) {
  const slots = EQUIP_SLOTS.map(({ key, name }) => {
    const it = ch.equipped[key];
    return it
      ? `<div class="shop-row slot-row"><span class="slot-name">${name}</span>${itemHtml(it)}<button type="button" class="sell-btn" data-unequip="${key}">卸下</button></div>`
      : `<div class="shop-row slot-row"><span class="slot-name">${name}</span><span class="muted">（未裝備）</span></div>`;
  }).join('');
  /**
   * 背包中一件裝備的「裝備」按鈕：飾品有飾品 1、飾品 2 兩個按鈕。
   * @param {object} it 裝備。
   * @returns {string} HTML。
   */
  const equipBtns = (it) => (it.slot === 'accessory'
    ? ['acc1', 'acc2'].map((k, n) => `<button type="button" class="buy-btn" data-equip="${it.id}" data-slot="${k}">飾品 ${n + 1}</button>`).join('')
    : `<button type="button" class="buy-btn" data-equip="${it.id}">裝備</button>`);
  const bag = ch.bag.length
    ? ch.bag.map((it) => `<div class="shop-row">${itemHtml(it)}${compareHtml(ch, it)}<span class="row-actions">${equipBtns(it)}<button type="button" class="sell-btn" data-sell="${it.id}">賣 ${sellPrice(it)}G</button></span></div>`).join('')
    : '<p class="muted">背包是空的。打倒怪物、打開寶箱或在商店購買裝備。</p>';
  const limit = village.bagLimit(ch);
  const pouch = ch.bagExpand > 0
    ? `<div class="shop-row"><img src="${itemDataUrl('pouch')}" alt="" class="icon"><div class="item-main"><b>背包擴充袋 ×${ch.bagExpand}</b><span class="item-stats">使用後背包上限 +${BAG_EXPAND.step} 格（最多 ${BAG_EXPAND.max} 格）</span></div><button type="button" class="buy-btn" data-use-pouch="1"${limit >= BAG_EXPAND.max ? ' disabled' : ''}>使用</button></div>`
    : '';
  return `<h3>裝備欄</h3>${slots}${pouch ? `<h3>道具</h3>${pouch}` : ''}<h3>背包 <small class="muted">${ch.bag.length}／${limit}</small></h3>${bag}`;
}

/**
 * 技能分頁：技能點、每個技能的等級與說明、升級與裝備到技能欄。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function skillPanel(ch) {
  const points = skills.skillPoints(ch);
  const slots = ch.skills.slots.map((id, n) => `<span class="slot-chip">技能 ${n + 1}：<b>${id ? skills.SKILLS[id].name : '（未裝備）'}</b></span>`).join('');
  const rows = skills.classSkills(ch.cls).map((id) => {
    const s = skills.SKILLS[id];
    const lv = skills.skillLevel(ch, id);
    if (!lv) {
      return `<div class="skill-card locked"><div class="skill-head"><b>🔒 ${s.name}</b><small>Lv.${s.unlock} 解鎖</small></div><p class="item-stats">${skills.describeSkill(id, 1)}</p></div>`;
    }
    const st = skills.skillStats(id, lv);
    const next = lv < skills.SKILL_MAX ? `<p class="item-stats next">下一級：${skills.describeSkill(id, lv + 1)}・冷卻 ${skills.skillStats(id, lv + 1).cd.toFixed(1)} 秒</p>` : '';
    const slotBtns = [0, 1].map((n) => `<button type="button" class="sell-btn${ch.skills.slots[n] === id ? ' on' : ''}" data-skill-slot="${n}" data-skill="${id}">${ch.skills.slots[n] === id ? `✓ 技能 ${n + 1}` : `裝到技能 ${n + 1}`}</button>`).join('');
    return `<div class="skill-card"><div class="skill-head"><b>${s.name}</b><small>Lv.${lv}／${skills.SKILL_MAX}・冷卻 ${st.cd.toFixed(1)} 秒</small></div>
      <p class="item-stats">${skills.describeSkill(id, lv)}</p>${next}
      <div class="row-actions">${slotBtns}<button type="button" class="buy-btn" data-skill-up="${id}"${lv >= skills.SKILL_MAX || !points ? ' disabled' : ''}>${lv >= skills.SKILL_MAX ? '已滿級' : '升級（1 點）'}</button></div></div>`;
  }).join('');
  return `<p class="skill-points">技能點：<b>${points}</b> <small class="muted">（每升 1 級得到 1 點）</small></p><div class="slot-chips">${slots}</div>${rows}
    <div class="hero-actions"><button type="button" class="link-btn" data-skill-reset="1">重置技能（免費退回所有點數）</button></div>`;
}

/**
 * 角色分頁：等級、屬性與角色統計。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
function heroPanel(ch) {
  const s = characterStats(ch.cls, ch.level, Object.values(ch.equipped));
  const prof = speedProfile(s.spd);
  const need = xpToNext(ch.level);
  const xp = ch.level >= MAX_LEVEL ? 'MAX' : `${ch.xp}／${need}`;
  const extra = [];
  if (s.goldPct) extra.push(`金幣 +${s.goldPct}%`);
  if (s.xpPct) extra.push(`經驗 +${s.xpPct}%`);
  const st = ch.stats;
  return `<div class="hero-card"><img src="${heroDataUrl(ch.cls, 6)}" alt="" class="char-img big"><dl class="result-list">
      <dt>等級</dt><dd>Lv.${ch.level}${ch.level >= MAX_LEVEL ? '（MAX）' : ''}</dd>
      <dt>經驗值</dt><dd>${xp}</dd>
      <dt>HP</dt><dd>${s.hp}</dd>
      <dt>攻擊</dt><dd>${s.atk}</dd>
      <dt>防禦</dt><dd>${s.def}</dd>
      <dt>速度</dt><dd>${s.spd}<small class="muted">（每秒 ${prof.move.toFixed(1)} 格、攻擊間隔 ${prof.interval.toFixed(2)} 秒）</small></dd>
      ${extra.length ? `<dt>其他</dt><dd>${extra.join('、')}</dd>` : ''}
    </dl></div>
    <h3>角色統計</h3>
    <dl class="result-list">
      <dt>遊玩時間</dt><dd>${formatTime(st.playMs)}</dd>
      <dt>探險次數</dt><dd>${st.runs}</dd>
      <dt>總擊倒數</dt><dd>${st.kills}</dd>
      <dt>最高傷害</dt><dd>${st.maxHit}</dd>
      <dt>傳說裝備</dt><dd>${st.legends} 件</dd>
      <dt>倒下次數</dt><dd>${st.deaths}</dd>
    </dl>
    <div class="hero-actions"><button type="button" class="link-btn danger-text" data-delete="${ch.id}">刪除角色</button></div>`;
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
  if (d.buy === 'potion') r = village.buyPotion(ch);
  else if (d.buy === 'scroll') r = village.buyScroll(ch);
  else if (d.buy === 'pouch') r = village.buyBagExpand(ch);
  else if (d.usePouch) r = village.useBagExpand(ch);
  else if (d.buyItem !== undefined) r = village.buyItem(ch, Number(d.buyItem));
  else if (d.sell) {
    const found = village.findItem(ch, d.sell);
    if (found && found.item.rarity >= 2 && !(await confirmDialog('賣出裝備', `確定要賣出 ${RARITIES[found.item.rarity].name}裝備「${esc(found.item.name)}」嗎？`, '賣出'))) return;
    r = village.sellItem(ch, d.sell);
  } else if (d.equip) r = village.equip(ch, d.equip, d.slot);
  else if (d.unequip) r = village.unequip(ch, d.unequip);
  else if (d.skillUp) r = skills.upgradeSkill(ch, d.skillUp);
  else if (d.skillSlot !== undefined) r = skills.equipSkill(ch, d.skill, Number(d.skillSlot));
  else if (d.skillReset) r = skills.resetSkills(ch);
  else if (d.enhance) r = village.enhance(ch, d.enhance, Math.random);
  else if (d.delete) {
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
  if (!r) return;
  villageMessage(r.message, !r.ok || r.success === false);
  if (r.ok) await store.saveProgress(ch);
  renderVillage();
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
  const world = new World(ch, { area, depth, seed, potions: carry.potions, scroll: carry.scroll });
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
      app.input.skill = [false, false];
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
    } else if (e.type === 'boss-evolved') {
      toast('Boss 進化了！更強，但獎勵也更好');
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
    <h3>取得的裝備</h3>${items}`;
  await openModal({ title, html, actions: [{ label: '回村莊', value: true, className: 'primary' }], dismissValue: true });
  app.ending = false;
  app.current = ch.id;
  app.tab = r.items.length ? 'bag' : 'gate';
  showScreen('village');
  renderVillage();
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
  const need = xpToNext(ch.level);
  set('xp', `${ch.level}/${ch.xp}`, () => {
    $('xp-fill').style.width = ch.level >= MAX_LEVEL ? '100%' : `${(ch.xp / need) * 100}%`;
    $('hud-level').textContent = ch.level >= MAX_LEVEL ? 'MAX' : ch.level;
  });
  set('floor', `${w.area}/${w.floorIndex}`, () => {
    $('hud-floor').textContent = `${AREAS[w.area].name} ${w.depth}-${w.floorIndex >= 3 ? 'B' : w.floorIndex + 1}`;
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
  for (const n of [0, 1]) {
    const sk = w.skills[n];
    const cd = sk ? Math.max(0, p.skillCd[n]) : 0;
    set(`skillId${n}`, sk ? sk.id : 'none', () => {
      const btn = $(`skill${n + 1}-btn`);
      btn.classList.toggle('empty', !sk);
      $(`skill${n + 1}-icon`).innerHTML = sk ? ICONS[sk.id] : '';
      $(`skill${n + 1}-name`).textContent = sk ? sk.short : '未裝備';
    });
    set(`skill${n}`, Math.ceil(cd * 10), () => cooldown(`skill${n + 1}`, cd, sk ? sk.cd : 1, Math.ceil(cd)));
  }
  set('dodgeCd', Math.ceil(Math.max(0, p.dodgeCd) * 10), () => cooldown('dodge', p.dodgeCd, 1.2, p.dodgeCd.toFixed(1)));
  const boss = w.boss();
  set('boss', boss ? `${boss.hp}/${boss.phase2}/${boss.state === 'healing'}` : 'none', () => {
    $('boss-bar').hidden = !boss;
    if (boss) {
      $('boss-name').textContent = `${boss.abyss ? '強化・' : ''}${boss.name}${boss.state === 'healing' ? '（回復中）' : boss.phase2 ? '（第二階段）' : ''}`;
      $('boss-bar').classList.toggle('healing', boss.state === 'healing');
      $('boss-fill').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      $('boss-trail').style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    }
  });
}

/**
 * 更新按鈕的放射狀冷卻遮罩與秒數；冷卻結束的瞬間閃一下提示可再使用。
 * @param {string} name 按鈕名稱（potion、dodge、skill1、skill2）。
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
  i.skill = [false, false];
  app.stickPointer = null;
  app.attackPointer = null;
  idleStick();
  $('attack-btn').classList.remove('pressed');
}

/**
 * 合併鍵盤與搖桿輸入。
 * @returns {{mx: number, my: number, attack: boolean, dodge: boolean, potion: boolean, skill1: boolean, skill2: boolean}} 輸入。
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
  return { mx, my, attack: i.attackHeld || k.has('attack'), dodge: i.dodge, potion: i.potion, skill1: i.skill[0], skill2: i.skill[1] };
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
  else if (e.code === 'KeyU') pressSkill(0);
  else if (e.code === 'KeyI') pressSkill(1);
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
    let dx = cx - s.x;
    let dy = cy - s.y;
    const len = Math.hypot(dx, dy);
    s.moved = Math.max(s.moved, len);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    els.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 死區 12%；一離開死區就有 6 成速度，拖到半徑 30%（約 14px）即為全速，與鍵盤相同。
    const r = Math.min(1, len / R);
    const k = r < 0.12 ? 0 : Math.min(1, 0.6 + ((r - 0.12) / 0.18) * 0.4);
    app.input.stick = k === 0 ? { x: 0, y: 0 } : { x: (dx / (len || 1)) * k, y: (dy / (len || 1)) * k };
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
 * 按下技能鈕或技能鍵：沒有裝備或冷卻中時以短訊息說明。
 * @param {number} n 技能欄位（0 或 1）。
 */
function pressSkill(n) {
  const w = app.world;
  if (!w) return;
  const sk = w.skills[n];
  if (!sk) toast(`技能 ${n + 1} 沒有裝備技能（在村莊的「技能」分頁設定）`);
  else if (w.player.skillCd[n] > 0) toast(`${sk.name}冷卻中（${Math.ceil(w.player.skillCd[n])} 秒）`);
  else app.input.skill[n] = true;
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
  for (const n of [0, 1]) {
    $(`skill${n + 1}-btn`).addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pressSkill(n);
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
      <li>建立角色（戰士、弓箭手、法師各一位），在村莊選擇地城與深度後出發。</li>
      <li>每趟有 3 層＋Boss 層。找到<b>金色樓梯</b>下樓，在最後一層擊敗 Boss，走進傳送點回村。</li>
      <li>打倒怪物得到經驗值、金幣與裝備；裝備有<b>普通、精良、稀有、傳說</b>四種稀有度。</li>
      <li>地上出現<b>紅色範圍</b>或<b>虛線</b>時，代表怪物即將攻擊那裡，趕快閃避！</li>
      <li>倒下時保留經驗值與裝備，但會失去一半本趟撿到的金幣。回城卷軸可以帶著全部所得回村。</li>
      <li>擊敗 Boss 後解鎖更深的深度與下一個地城。</li>
      <li>每個職業有 4 個技能，在 Lv.1、5、12、20 解鎖；每升 1 級得到 1 技能點。在村莊的「技能」分頁升級技能，並選 2 個帶進地城。</li>
    </ol>
    <h3>操作</h3>
    <ul>
      <li>手機：左下按住拖曳移動；右下「攻擊」按住連續攻擊、「閃避」翻滾（短暫無敵）、「藥水」回復 40% HP；上方兩顆金色按鈕是技能。</li>
      <li>設定中可開啟「點地移動」：點地圖上的位置，角色自動走過去。</li>
      <li>鍵盤：WASD／方向鍵移動、J／空白鍵攻擊、K／Shift 閃避、L 藥水、U／I 技能、M 小地圖、P／Esc 暫停。</li>
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
  els.villageTabs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    app.tab = b.dataset.tab;
    els.villageMessage.textContent = '';
    renderVillage();
    els.villagePanel.scrollTop = 0;
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
