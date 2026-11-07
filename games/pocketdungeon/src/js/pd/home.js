// 家園規則（純邏輯）：家園存檔的建立與修復、家園材料、家具製作書（配方）、種子與肥料、
// 地城掉落的抽選、家園商店與製作、擺放、擴建、種植、牧場、藥草台與料理、寶箱與展示架、染色、學科連動與市集。
// 所有函式直接修改傳入的角色資料。

import {
  HOME_MATS, HOME_MAT_KEYS, HOME_DROP, HOME_SHOP, HOME_MAX, HOME_ITEMS, HOME_ITEM_KEYS, DEFAULT_RECIPES, CROPS, CROP_KEYS, START_SEEDS, HOME_GIFT, LAND,
  GROW, ANIMALS, RANCH, GOODS, GOOD_KEYS, DYE_KEYS, MEALS, MEAL_KEYS, MEAL_BUFFS, BREWS, HOME_CHEST, SHELF_SLOTS, MARKET, LINKS, DIARY,
} from './homeData.js';
import { LINK_CARDS } from './homeLinks.js';
import { LIMITS } from './data.js';

/**
 * 建立新角色的家園：等級 1 的空房子（地板、牆面為木頭）、預設配方與起始種子，工作台放在房間左上。
 * @returns {object} 家園資料。
 */
export function newHome() {
  return {
    level: 1, mats: {}, recipes: DEFAULT_RECIPES.slice(), seeds: { ...START_SEEDS }, produce: {}, fertilizer: 0,
    inventory: {}, placed: [{ id: 'workbench', at: 'house', x: 0, y: 0, rot: 0 }], plots: emptyPlots(LAND[0].plots), chest: [],
    tiles: { floor: 'woodFloor', wall: 'woodWall' }, lastSeen: 0, shop: null,
    meals: {}, meal: null, diary: [], links: [], market: null,
  };
}

/**
 * 建立指定數量的空田地。
 * @param {number} n 數量。
 * @returns {Array<{crop: null, grown: number}>} 田地。
 */
function emptyPlots(n) {
  return Array.from({ length: n }, () => ({ crop: null, grown: 0 }));
}

/**
 * 修復家園資料：缺少或不合法的欄位改為預設值，未知的材料、配方、種子與家具會被移除；
 * 擺放位置不合法的家具收回庫存（不讓存檔損毀）。
 * @param {any} h 家園資料（可能損毀或不存在）。
 * @returns {object} 合法的家園資料。
 */
export function normalizeHome(h) {
  const base = newHome();
  if (!h || typeof h !== 'object') return base;
  const level = Number.isInteger(h.level) && h.level >= 1 && h.level <= LAND.length ? h.level : 1;
  const out = {
    level,
    mats: stackMap(h.mats, HOME_MAT_KEYS),
    recipes: Array.isArray(h.recipes) ? [...new Set([...DEFAULT_RECIPES, ...h.recipes.filter((k) => HOME_ITEMS[k])])] : base.recipes,
    seeds: h.seeds === undefined ? base.seeds : stackMap(h.seeds, CROP_KEYS),
    produce: stackMap(h.produce, GOOD_KEYS),
    fertilizer: count(h.fertilizer),
    inventory: stackMap(h.inventory, HOME_ITEM_KEYS),
    placed: [],
    plots: normalizePlots(h.plots, LAND[level - 1].plots),
    chest: Array.isArray(h.chest) ? h.chest.filter((it) => it && typeof it === 'object') : [],
    tiles: {
      floor: h.tiles && HOME_ITEMS[h.tiles.floor] && HOME_ITEMS[h.tiles.floor].place === 'floorTile' ? h.tiles.floor : 'woodFloor',
      wall: h.tiles && HOME_ITEMS[h.tiles.wall] && HOME_ITEMS[h.tiles.wall].place === 'wallTile' ? h.tiles.wall : 'woodWall',
    },
    lastSeen: Number.isFinite(h.lastSeen) && h.lastSeen >= 0 ? h.lastSeen : 0,
    shop: h.shop && typeof h.shop.day === 'string' && Array.isArray(h.shop.recipes) ? { day: h.shop.day, recipes: h.shop.recipes.filter((k) => HOME_ITEMS[k]) } : null,
    meals: stackMap(h.meals, MEAL_KEYS),
    meal: MEALS[h.meal] ? h.meal : null,
    diary: Array.isArray(h.diary) ? [...new Set(h.diary.filter((k) => DIARY[k]))] : [],
    links: Array.isArray(h.links) ? [...new Set(h.links.filter((k) => LINKS[k]))] : [],
    market: h.market && typeof h.market.day === 'string' && h.market.sold && typeof h.market.sold === 'object' ? { day: h.market.day, sold: stackMap(h.market.sold, GOOD_KEYS) } : null,
  };
  // 擺放：依序檢查（物件要存在、位置要符合擺放規則且不和先前的重疊）；不合法的收回庫存。
  for (const p of Array.isArray(h.placed) ? h.placed : []) {
    if (!p || !HOME_ITEMS[p.id]) continue;
    const at = p.at === undefined ? 'house' : p.at;
    if (Number.isInteger(p.x) && Number.isInteger(p.y) && placeCheck(out, p.id, at, p.x, p.y).ok) out.placed.push(cleanPlaced(p, at));
    else unplace(out, cleanPlaced(p, at));
  }
  return out;
}

/**
 * 修復一筆擺放資料：只保留合法欄位（翻轉、染色、動物的飼料與產出、展示架上的裝備）。
 * @param {object} p 擺放資料。
 * @param {string} at 區域。
 * @returns {object} 修復後的擺放資料。
 */
function cleanPlaced(p, at) {
  const it = HOME_ITEMS[p.id];
  const out = { id: p.id, at, x: p.x, y: p.y, rot: p.rot === 1 ? 1 : 0 };
  if (DYE_KEYS.includes(p.dye) && it.type !== 'animal') out.dye = p.dye;
  if (it.type === 'animal') {
    // 非負數，否則為 0（上限為 max）。
    const num = (v, max) => (Number.isFinite(v) && v > 0 ? Math.min(v, max) : 0);
    const period = ANIMALS[p.id].hours * 3600e3;
    out.food = num(p.food, RANCH.feedHours * 3600e3);
    out.prog = num(p.prog, period);
    out.stock = Math.floor(num(p.stock, RANCH.maxStock));
  }
  if (it.func === 'display') out.show = Array.isArray(p.show) ? p.show.filter((x) => x && typeof x === 'object').slice(0, SHELF_SLOTS) : [];
  return out;
}

/**
 * 把一件不能留在原位的擺放物件收回庫存；展示架上的裝備改放進家用寶箱（不受格數限制，避免遺失）。
 * @param {object} h 家園資料（會被修改）。
 * @param {object} p 擺放資料。
 */
function unplace(h, p) {
  h.inventory[p.id] = Math.min(HOME_MAX, (h.inventory[p.id] || 0) + 1);
  if (p.show) h.chest.push(...p.show);
}

/**
 * 修復田地：作物要存在、生長時間為非負數，數量補齊或截到土地等級的田地數。
 * @param {any} plots 田地資料。
 * @param {number} n 田地數。
 * @returns {Array<{crop: string | null, grown: number}>} 田地。
 */
function normalizePlots(plots, n) {
  const out = emptyPlots(n);
  if (!Array.isArray(plots)) return out;
  // 修復一塊田地。
  plots.slice(0, n).forEach((p, i) => {
    if (!p || !CROPS[p.crop]) return;
    out[i] = { crop: p.crop, grown: Number.isFinite(p.grown) && p.grown > 0 ? Math.min(p.grown, cropTotalMs(p.crop)) : 0 };
  });
  return out;
}

/**
 * 非負整數，否則為 0。
 * @param {any} v 值。
 * @returns {number} 數量。
 */
function count(v) {
  return Number.isInteger(v) && v > 0 ? Math.min(v, HOME_MAX) : 0;
}

/**
 * 只保留指定代碼、數量為正整數的對照表（數量限制在上限內）。
 * @param {any} m 對照表。
 * @param {string[]} keys 合法代碼。
 * @returns {Record<string, number>} 修復後的對照表。
 */
function stackMap(m, keys) {
  const out = {};
  if (!m || typeof m !== 'object') return out;
  for (const k of keys) if (count(m[k]) > 0) out[k] = count(m[k]);
  return out;
}

/**
 * 取得角色的家園（舊存檔沒有時建立）。
 * @param {object} ch 角色（可能被修改）。
 * @returns {object} 家園資料。
 */
export function homeOf(ch) {
  if (!ch.home) ch.home = newHome();
  return ch.home;
}

/**
 * 增減一種可堆疊的家園物品（材料、種子、作物、庫存家具），數量限制在 0～上限。
 * @param {object} ch 角色（會被修改）。
 * @param {'mats' | 'seeds' | 'produce' | 'inventory' | 'meals'} field 欄位。
 * @param {string} key 代碼。
 * @param {number} n 數量（負數為扣除）。
 * @returns {number} 實際增減的數量。
 */
function addHomeStack(ch, field, key, n) {
  const h = homeOf(ch);
  const have = h[field][key] || 0;
  const next = Math.max(0, Math.min(HOME_MAX, have + n));
  if (next > 0) h[field][key] = next;
  else delete h[field][key];
  return next - have;
}

/**
 * 加入家園材料（超過上限的部分不加入）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 材料代碼。
 * @param {number} [n=1] 數量。
 * @returns {number} 實際加入的數量。
 */
export function addHomeMat(ch, key, n = 1) {
  return addHomeStack(ch, 'mats', key, n);
}

/**
 * 加入種子。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 作物代碼。
 * @param {number} [n=1] 數量。
 * @returns {number} 實際加入的數量。
 */
export function addSeed(ch, key, n = 1) {
  return addHomeStack(ch, 'seeds', key, n);
}

/**
 * 加入肥料。
 * @param {object} ch 角色（會被修改）。
 * @param {number} [n=1] 數量。
 * @returns {number} 實際加入的數量。
 */
export function addFertilizer(ch, n = 1) {
  const h = homeOf(ch);
  const next = Math.min(HOME_MAX, h.fertilizer + n);
  const added = next - h.fertilizer;
  h.fertilizer = next;
  return added;
}

/**
 * 家園材料的名稱。
 * @param {string} key 材料代碼。
 * @returns {string} 名稱。
 */
export function homeMatName(key) {
  const m = HOME_MATS.find((x) => x.key === key);
  return m ? m.name : key;
}

/**
 * 家具製作書的名稱，例如「木椅製作書」。
 * @param {string} key 家具或裝飾代碼。
 * @returns {string} 名稱。
 */
export function recipeName(key) {
  return `${HOME_ITEMS[key].name}製作書`;
}

/**
 * 是否已學會某個配方。
 * @param {object} ch 角色。
 * @param {string} key 家具或裝飾代碼。
 * @returns {boolean} 已學會時為 true。
 */
export function knowsRecipe(ch, key) {
  return !!ch.home && ch.home.recipes.includes(key);
}

/**
 * 取得一本家具製作書：沒學過就學會，學過的自動賣出換金幣。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 家具或裝飾代碼。
 * @returns {{learned: boolean, gold: number, message: string}} 結果。
 */
export function gainRecipe(ch, key) {
  const h = homeOf(ch);
  if (!h.recipes.includes(key)) {
    h.recipes.push(key);
    return { learned: true, gold: 0, message: `學會「${HOME_ITEMS[key].name}」的製作方法！` };
  }
  const gold = HOME_SHOP.recipeSell[HOME_ITEMS[key].rarity];
  ch.gold += gold;
  return { learned: false, gold, message: `已學過的${recipeName(key)}自動賣出（+${gold}G）` };
}

/**
 * 依權重抽選。
 * @param {Array<[string, number]>} entries 代碼與權重。
 * @param {() => number} rng 亂數函式。
 * @returns {string | null} 抽中的代碼；沒有可抽的時為 null。
 */
function weighted(entries, rng) {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return null;
  let r = rng() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1][0];
}

/**
 * 某個區域掉落的家園材料：該區域的材料；深淵一半機率改為其他區域的材料。
 * @param {string} area 區域代碼。
 * @param {() => number} rng 亂數函式。
 * @returns {string} 材料代碼。
 */
export function rollHomeMat(area, rng) {
  const own = HOME_MATS.find((m) => m.area === area);
  if (own && area !== 'expert') return own.key;
  const drops = HOME_MATS.filter((m) => m.area);
  if (area === 'expert' && rng() >= HOME_DROP.abyssMix) return 'dark';
  return drops[Math.floor(rng() * drops.length)].key;
}

/**
 * 抽一本地城掉落的家具製作書：有一定機率是該區域的主題配方，否則依稀有度權重從一般配方中抽。
 * 盡量抽尚未學會的配方（全部學會時才會抽到學過的）。
 * @param {object} ch 角色。
 * @param {string} area 區域代碼。
 * @param {() => number} rng 亂數函式。
 * @returns {string} 家具或裝飾代碼。
 */
export function rollRecipe(ch, area, rng) {
  // 是否已學會某個配方。
  const known = (k) => knowsRecipe(ch, k);
  const theme = HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].src === area);
  const freshTheme = theme.filter((k) => !known(k));
  if (theme.length && rng() < HOME_DROP.areaTheme) {
    const pool = freshTheme.length ? freshTheme : theme;
    return pool[Math.floor(rng() * pool.length)];
  }
  const general = HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].src === 'any');
  const fresh = general.filter((k) => !known(k));
  const pool = fresh.length ? fresh : general;
  // 先依稀有度權重決定稀有度（該稀有度沒有可抽的就不計入），再從中隨機。
  const rarity = Number(weighted(HOME_DROP.recipeWeights.map((w, r) => [String(r), pool.some((k) => HOME_ITEMS[k].rarity === r) ? w : 0]), rng));
  const tier = pool.filter((k) => HOME_ITEMS[k].rarity === rarity);
  return tier[Math.floor(rng() * tier.length)];
}

/**
 * Boss 的主題裝飾配方。
 * @param {string} boss Boss 代碼。
 * @returns {string | null} 家具或裝飾代碼；沒有時為 null。
 */
export function bossRecipe(boss) {
  return HOME_ITEM_KEYS.find((k) => HOME_ITEMS[k].src === boss) || null;
}

/**
 * 抽一種掉落的種子（依作物的掉落權重）。
 * @param {() => number} rng 亂數函式。
 * @returns {string} 作物代碼。
 */
export function rollSeed(rng) {
  return weighted(CROP_KEYS.map((k) => [k, CROPS[k].seedWeight]), rng);
}

/**
 * 今天的家園商店（每天刷新）：陳列尚未學會的普通與精良一般配方。
 * @param {object} ch 角色（可能被修改）。
 * @param {string} day 本地日期（YYYY-MM-DD）。
 * @param {() => number} rng 亂數函式。
 * @returns {{day: string, recipes: string[]}} 商店。
 */
export function homeShop(ch, day, rng) {
  const h = homeOf(ch);
  if (!h.shop || h.shop.day !== day) {
    const pool = HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].src === 'any' && HOME_ITEMS[k].rarity <= 1 && !knowsRecipe(ch, k));
    const recipes = [];
    while (recipes.length < HOME_SHOP.recipes && pool.length) recipes.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    h.shop = { day, recipes };
  }
  return h.shop;
}

/**
 * 製作書的商店售價。
 * @param {string} key 家具或裝飾代碼。
 * @returns {number} 金幣。
 */
export function recipePrice(key) {
  return HOME_SHOP.recipePrice[HOME_ITEMS[key].rarity];
}

/**
 * 購買商店陳列的家具製作書（買下後直接學會）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 陳列位置。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyRecipe(ch, index) {
  const h = homeOf(ch);
  const key = h.shop && h.shop.recipes[index];
  if (!key) return { ok: false, message: '這本製作書已經賣出' };
  if (knowsRecipe(ch, key)) return { ok: false, message: '已經學會了' };
  const price = recipePrice(key);
  if (ch.gold < price) return { ok: false, message: `金幣不足（需要 ${price}G）` };
  ch.gold -= price;
  h.shop.recipes.splice(index, 1);
  return { ok: true, message: gainRecipe(ch, key).message };
}

/**
 * 購買家園材料（只有商店販售的基本材料）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 材料代碼。
 * @param {number} [n=1] 數量。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyHomeMat(ch, key, n = 1) {
  const m = HOME_MATS.find((x) => x.key === key);
  if (!m || !m.shop) return { ok: false, message: '商店沒有賣這種材料' };
  const room = HOME_MAX - ((homeOf(ch).mats[key]) || 0);
  if (room < n) return { ok: false, message: `${m.name}已經快滿了（上限 ${HOME_MAX}）` };
  const price = m.shop * n;
  if (ch.gold < price) return { ok: false, message: `金幣不足（需要 ${price}G）` };
  ch.gold -= price;
  addHomeMat(ch, key, n);
  return { ok: true, message: `買下${m.name} ×${n}` };
}

/**
 * 購買種子。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 作物代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buySeed(ch, key) {
  const c = CROPS[key];
  if (!c) return { ok: false, message: '沒有這種種子' };
  if ((homeOf(ch).seeds[key] || 0) >= HOME_MAX) return { ok: false, message: `種子已經滿了（上限 ${HOME_MAX}）` };
  if (ch.gold < c.seedPrice) return { ok: false, message: `金幣不足（需要 ${c.seedPrice}G）` };
  ch.gold -= c.seedPrice;
  addSeed(ch, key, 1);
  return { ok: true, message: `買下${c.name}種子` };
}

/**
 * 製作一件家具或裝飾所缺少的東西。
 * @param {object} ch 角色。
 * @param {string} key 家具或裝飾代碼。
 * @returns {string[]} 缺少的項目說明（空陣列表示可以製作）。
 */
export function craftMissing(ch, key) {
  const it = HOME_ITEMS[key];
  const h = homeOf(ch);
  const miss = [];
  if (!knowsRecipe(ch, key)) miss.push('尚未學會製作方法');
  for (const [m, n] of Object.entries(it.mats)) {
    const have = h.mats[m] || 0;
    if (have < n) miss.push(`${homeMatName(m)}還差 ${n - have}`);
  }
  if (ch.gold < it.gold) miss.push(`金幣還差 ${it.gold - ch.gold}G`);
  if ((h.inventory[key] || 0) >= HOME_MAX) miss.push('庫存已滿');
  return miss;
}

/**
 * 製作一件家具或裝飾，放進家園庫存。地板與牆面樣式做一次就能使用，不會重複製作。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 家具或裝飾代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function craftHomeItem(ch, key) {
  const it = HOME_ITEMS[key];
  if (!it) return { ok: false, message: '沒有這個配方' };
  const h = homeOf(ch);
  const tile = it.place === 'floorTile' || it.place === 'wallTile';
  if (tile && (h.inventory[key] || h.tiles.floor === key || h.tiles.wall === key)) return { ok: false, message: `已經有「${it.name}」了` };
  const miss = craftMissing(ch, key);
  if (miss.length) return { ok: false, message: miss.join('、') };
  for (const [m, n] of Object.entries(it.mats)) addHomeMat(ch, m, -n);
  ch.gold -= it.gold;
  addHomeStack(ch, 'inventory', key, 1);
  return { ok: true, message: `做好了「${it.name}」！` };
}

/**
 * 開啟獎勵禮包時額外得到的家園物品：肥料、種子，有機會得到一本一般家具製作書（已學會的自動賣出）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} tier 禮包等級（1～5）。
 * @param {() => number} rng 亂數函式。
 * @returns {{fertilizer: number, seeds: Record<string, number>, recipe: string | null, recipeGold: number}} 內容。
 */
export function giftHome(ch, tier, rng) {
  const k = tier - 1;
  const fertilizer = addFertilizer(ch, HOME_GIFT.fertilizer[k]);
  const seeds = {};
  for (let i = 0; i < HOME_GIFT.seeds[k]; i++) {
    const s = rollSeed(rng);
    if (addSeed(ch, s, 1)) seeds[s] = (seeds[s] || 0) + 1;
  }
  let recipe = null;
  let recipeGold = 0;
  if (rng() < HOME_GIFT.recipeChance[k]) {
    recipe = rollRecipe(ch, null, rng);
    recipeGold = gainRecipe(ch, recipe).gold;
  }
  return { fertilizer, seeds, recipe, recipeGold };
}

/**
 * 收集進度：已學會的家具與裝飾配方數。
 * @param {object} ch 角色。
 * @returns {{furniture: number, decor: number, furnitureTotal: number, decorTotal: number}} 進度。
 */
export function recipeProgress(ch) {
  const known = new Set(homeOf(ch).recipes);
  // 某一類（家具或裝飾）的全部代碼。
  const keys = (type) => HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].type === type);
  return {
    furniture: keys('furniture').filter((k) => known.has(k)).length,
    decor: keys('decor').filter((k) => known.has(k)).length,
    furnitureTotal: keys('furniture').length,
    decorTotal: keys('decor').length,
  };
}

/**
 * 家裡地圖的配置（以格為單位）：左右各一排牆、最上面一排牆面（掛牆飾）、室內、下方一排牆（中間是門）、庭院（最下面一排是田地）。
 * 擺放的座標以各區域的左上角為原點（室內 house、庭院 yard、牆面 wall），擴建後原本的家具位置不變。
 * @param {number} level 土地等級。
 * @returns {{cols: number, rows: number, house: {x: number, y: number, w: number, h: number}, yard: {x: number, y: number, w: number, h: number}, wall: {x: number, y: number, w: number}, door: {x: number, y: number}, plots: Array<{x: number, y: number}>}} 配置（地圖座標）。
 */
export function homeLayout(level) {
  const land = LAND[level - 1];
  const [w, h] = land.house;
  const house = { x: 1, y: 1, w, h };
  const door = { x: 1 + Math.floor(w / 2), y: h + 1 };
  const yard = { x: 1, y: h + 2, w, h: land.yard };
  // 田地：庭院最下面一排，置中排列。
  const left = yard.x + Math.floor((w - land.plots) / 2);
  const plots = Array.from({ length: land.plots }, (_, k) => ({ x: left + k, y: yard.y + yard.h - 1 }));
  return { cols: w + 2, rows: h + 2 + land.yard, house, yard, wall: { x: 1, y: 0, w }, door, plots };
}

/**
 * 擺放項目佔用的地圖格（左上角與寬高；翻轉不影響大小）。
 * @param {{id: string, at: string, x: number, y: number}} p 擺放項目。
 * @param {object} layout 配置。
 * @returns {{x: number, y: number, w: number, h: number}} 地圖座標的矩形。
 */
export function placedRect(p, layout) {
  const [w, h] = HOME_ITEMS[p.id].size;
  const o = p.at === 'yard' ? layout.yard : p.at === 'wall' ? layout.wall : layout.house;
  return { x: o.x + p.x, y: o.y + p.y, w, h: p.at === 'wall' ? 1 : h };
}

/**
 * 兩個矩形是否重疊。
 * @param {{x: number, y: number, w: number, h: number}} a 矩形 a。
 * @param {{x: number, y: number, w: number, h: number}} b 矩形 b。
 * @returns {boolean} 重疊時為 true。
 */
function overlap(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * 某個擺放項目是否擋路（家具與擋路的造景；地毯、小擺設、牆飾不擋路）。
 * @param {{id: string}} p 擺放項目。
 * @returns {boolean} 擋路時為 true。
 */
export function blocks(p) {
  return HOME_ITEMS[p.id].place === 'floor';
}

/**
 * 可以放小擺設的桌面類家具。
 * @param {{id: string}} p 擺放項目。
 * @returns {boolean} 有桌面時為 true。
 */
function hasTop(p) {
  return !!HOME_ITEMS[p.id].top;
}

/**
 * 檢查能不能把一件物件擺在指定位置（不修改資料）：
 * 地板與牆面樣式不能擺放；牆飾只能掛在牆面；庭院物件只能放庭院、其他只能放室內（小擺設與地毯兩邊都可以）；
 * 不能超出範圍、不能擋住門口與門前、不能蓋住田地；擋路的家具不能互相重疊、不能讓任何空地走不到；
 * 地毯不能互相重疊；小擺設每格一件，可以放在空地或桌面類家具上。
 * @param {object} h 家園資料。
 * @param {string} id 家具或裝飾代碼。
 * @param {'house' | 'yard' | 'wall'} at 區域。
 * @param {number} x 區域內的 x。
 * @param {number} y 區域內的 y。
 * @param {number} [ignore=-1] 檢查時忽略的擺放索引（移動既有物件時用）。
 * @returns {{ok: boolean, reason?: string}} 結果。
 */
export function placeCheck(h, id, at, x, y, ignore = -1) {
  const it = HOME_ITEMS[id];
  if (!it || it.place === 'floorTile' || it.place === 'wallTile') return { ok: false, reason: '地板與牆面樣式要在「樣式」中套用' };
  if (!['house', 'yard', 'wall'].includes(at)) return { ok: false, reason: '位置不正確' };
  if ((it.place === 'wall') !== (at === 'wall')) return { ok: false, reason: it.place === 'wall' ? '牆飾要掛在牆上' : '這個要放在地上' };
  if (at === 'yard' && !it.yard && !['small', 'rug'].includes(it.place)) return { ok: false, reason: '室內家具不能放在庭院' };
  if (at === 'house' && it.yard) return { ok: false, reason: '這個要放在庭院' };
  const layout = homeLayout(h.level);
  const area = at === 'yard' ? layout.yard : at === 'wall' ? { ...layout.wall, h: 1 } : layout.house;
  const [w, hh] = it.size;
  const rh = at === 'wall' ? 1 : hh;
  if (x < 0 || y < 0 || x + w > area.w || y + rh > area.h) return { ok: false, reason: '超出範圍了' };
  const r = placedRect({ id, at, x, y }, layout);
  const others = h.placed.filter((p, i) => i !== ignore).map((p) => ({ p, r: placedRect(p, layout) }));
  if (at === 'wall') {
    return others.some((o) => o.p.at === 'wall' && overlap(o.r, r)) ? { ok: false, reason: '牆上這裡已經有東西了' } : { ok: true };
  }
  // 門前一格（室內）與門外一格（庭院）保持通道；庭院物件不能蓋住田地。
  const keep = [{ x: layout.door.x, y: layout.door.y - 1, w: 1, h: 1 }, { x: layout.door.x, y: layout.door.y + 1, w: 1, h: 1 }];
  if (keep.some((k) => overlap(k, r)) && it.place !== 'rug') return { ok: false, reason: '不能擋住門口' };
  if (layout.plots.some((pl) => overlap({ ...pl, w: 1, h: 1 }, r))) return { ok: false, reason: '這裡是田地' };
  if (it.type === 'animal' && others.filter((o) => HOME_ITEMS[o.p.id].type === 'animal').length >= LAND[h.level - 1].animals) return { ok: false, reason: `土地等級 ${h.level} 最多養 ${LAND[h.level - 1].animals} 隻動物` };
  if (it.place === 'floor') {
    if (others.some((o) => o.p.at !== 'wall' && (blocks(o.p) || HOME_ITEMS[o.p.id].place === 'small') && overlap(o.r, r))) return { ok: false, reason: '這裡已經有東西了' };
    // 擺下後所有空地都要從門口走得到。
    if (!allReachable(layout, [...others.map((o) => o.p), { id, at, x, y }])) return { ok: false, reason: '會擋住路，有地方走不過去' };
    return { ok: true };
  }
  if (it.place === 'rug') {
    return others.some((o) => HOME_ITEMS[o.p.id].place === 'rug' && overlap(o.r, r)) ? { ok: false, reason: '地毯不能重疊' } : { ok: true };
  }
  // 小擺設：每格一件；放在家具上時那件家具要有桌面。
  if (others.some((o) => HOME_ITEMS[o.p.id].place === 'small' && overlap(o.r, r))) return { ok: false, reason: '這裡已經有擺設了' };
  const under = others.find((o) => blocks(o.p) && overlap(o.r, r));
  if (under && !hasTop(under.p)) return { ok: false, reason: `「${HOME_ITEMS[under.p.id].name}」上面不能放東西` };
  return { ok: true };
}

/**
 * 地圖上每一格是否可以行走（室內與庭院的空地、門口；擋路的家具與田地不行）。
 * @param {object} layout 配置。
 * @param {Array<{id: string, at: string, x: number, y: number}>} placed 擺放項目。
 * @returns {boolean[][]} [y][x] 可行走時為 true。
 */
export function walkGrid(layout, placed) {
  const grid = Array.from({ length: layout.rows }, () => Array(layout.cols).fill(false));
  for (const a of [layout.house, layout.yard]) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) grid[y][x] = true;
  grid[layout.door.y][layout.door.x] = true;
  for (const pl of layout.plots) grid[pl.y][pl.x] = false;
  for (const p of placed) {
    if (!blocks(p) || p.at === 'wall') continue;
    const r = placedRect(p, layout);
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (grid[y] && x < layout.cols) grid[y][x] = false;
  }
  return grid;
}

/**
 * 所有可行走的格子是否都能從門口走到（上下左右相連）。
 * @param {object} layout 配置。
 * @param {Array<object>} placed 擺放項目。
 * @returns {boolean} 都走得到時為 true。
 */
function allReachable(layout, placed) {
  const grid = walkGrid(layout, placed);
  const seen = new Set([`${layout.door.x},${layout.door.y}`]);
  const queue = [[layout.door.x, layout.door.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (grid[ny] && grid[ny][nx] && !seen.has(k)) {
        seen.add(k);
        queue.push([nx, ny]);
      }
    }
  }
  let total = 0;
  for (const row of grid) for (const v of row) if (v) total++;
  return seen.size === total;
}

/**
 * 從庫存擺出一件家具或裝飾。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 家具或裝飾代碼。
 * @param {'house' | 'yard' | 'wall'} at 區域。
 * @param {number} x 區域內的 x。
 * @param {number} y 區域內的 y。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function placeItem(ch, id, at, x, y) {
  const h = homeOf(ch);
  if (!(h.inventory[id] > 0)) return { ok: false, message: '庫存沒有這件物品' };
  const c = placeCheck(h, id, at, x, y);
  if (!c.ok) return { ok: false, message: c.reason };
  addHomeStack(ch, 'inventory', id, -1);
  h.placed.push(cleanPlaced({ id, x, y, rot: 0 }, at));
  return { ok: true, message: `擺好了「${HOME_ITEMS[id].name}」` };
}

/**
 * 移動已擺放的物件到新位置（可以換區域）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 擺放索引。
 * @param {'house' | 'yard' | 'wall'} at 區域。
 * @param {number} x 區域內的 x。
 * @param {number} y 區域內的 y。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function moveItem(ch, index, at, x, y) {
  const h = homeOf(ch);
  const p = h.placed[index];
  if (!p) return { ok: false, message: '找不到這件物品' };
  const c = placeCheck(h, p.id, at, x, y, index);
  if (!c.ok) return { ok: false, message: c.reason };
  Object.assign(p, { at, x, y });
  return { ok: true, message: `移動了「${HOME_ITEMS[p.id].name}」` };
}

/**
 * 左右翻轉已擺放的物件。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 擺放索引。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function flipItem(ch, index) {
  const p = homeOf(ch).placed[index];
  if (!p) return { ok: false, message: '找不到這件物品' };
  p.rot = p.rot ? 0 : 1;
  return { ok: true, message: `翻轉了「${HOME_ITEMS[p.id].name}」` };
}

/**
 * 收回已擺放的物件（放回庫存）。上面放著小擺設的家具，小擺設一起收回；
 * 收回後會讓其他家具上的小擺設懸空時也一起收回。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 擺放索引。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function storeItem(ch, index) {
  const h = homeOf(ch);
  const p = h.placed[index];
  if (!p) return { ok: false, message: '找不到這件物品' };
  if (p.show && p.show.length) return { ok: false, message: '先把展示架上的裝備拿下來' };
  if (HOME_ITEMS[p.id].func === 'chest' && h.chest.length > HOME_CHEST.slots * Math.min(HOME_CHEST.maxChests, placedChests(h) - 1)) {
    return { ok: false, message: '寶箱裡的東西太多，先拿出一些再收回' };
  }
  if (p.stock) return { ok: false, message: '先收取動物的產物再收回' };
  const layout = homeLayout(h.level);
  const r = placedRect(p, layout);
  const remove = new Set([index]);
  if (blocks(p) && hasTop(p)) h.placed.forEach((q, i) => {
    if (HOME_ITEMS[q.id].place === 'small' && q.at !== 'wall' && overlap(placedRect(q, layout), r)) remove.add(i);
  });
  const ids = [...remove].map((i) => h.placed[i].id);
  h.placed = h.placed.filter((_, i) => !remove.has(i));
  for (const id of ids) addHomeStack(ch, 'inventory', id, 1);
  return { ok: true, message: ids.length > 1 ? `收回了「${HOME_ITEMS[p.id].name}」和上面的 ${ids.length - 1} 件擺設` : `收回了「${HOME_ITEMS[p.id].name}」` };
}

/**
 * 擁有的地板或牆面樣式（做過的與正在使用的）。
 * @param {object} ch 角色。
 * @param {'floorTile' | 'wallTile'} place 地板或牆面。
 * @returns {string[]} 樣式代碼。
 */
export function ownedTiles(ch, place) {
  const h = homeOf(ch);
  return HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].place === place && (h.inventory[k] > 0 || h.tiles.floor === k || h.tiles.wall === k));
}

/**
 * 套用地板或牆面樣式（整間房子）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 樣式代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function applyTile(ch, key) {
  const it = HOME_ITEMS[key];
  if (!it || (it.place !== 'floorTile' && it.place !== 'wallTile')) return { ok: false, message: '這不是地板或牆面樣式' };
  const place = it.place;
  if (!ownedTiles(ch, place).includes(key)) return { ok: false, message: `還沒有「${it.name}」，先到工作台製作` };
  homeOf(ch).tiles[place === 'floorTile' ? 'floor' : 'wall'] = key;
  return { ok: true, message: `換成了「${it.name}」` };
}

/**
 * 地圖上某一格的擺放物件（由上往下：小擺設、家具、地毯；牆面那排為牆飾）。
 * @param {object} h 家園資料。
 * @param {number} mx 地圖 x。
 * @param {number} my 地圖 y。
 * @returns {number} 擺放索引；沒有時為 -1。
 */
export function placedAt(h, mx, my) {
  const layout = homeLayout(h.level);
  const cell = { x: mx, y: my, w: 1, h: 1 };
  const order = ['small', 'wall', 'floor', 'rug'];
  let best = -1;
  let rank = 99;
  h.placed.forEach((p, i) => {
    if (!overlap(placedRect(p, layout), cell)) return;
    const k = order.indexOf(HOME_ITEMS[p.id].place);
    if (k < rank) {
      rank = k;
      best = i;
    }
  });
  return best;
}

/**
 * 地圖座標所在的區域與區域內座標。
 * @param {object} layout 配置。
 * @param {number} mx 地圖 x。
 * @param {number} my 地圖 y。
 * @returns {{at: 'house' | 'yard' | 'wall', x: number, y: number} | null} 區域；牆角、門、範圍外為 null。
 */
export function areaAt(layout, mx, my) {
  for (const [at, a] of [['house', layout.house], ['yard', layout.yard], ['wall', { ...layout.wall, h: 1 }]]) {
    if (mx >= a.x && mx < a.x + a.w && my >= a.y && my < a.y + a.h) return { at, x: mx - a.x, y: my - a.y };
  }
  return null;
}

/**
 * 在可行走的格子上找最短路徑（上下左右）。目標不可行走時，改走到目標旁邊最近的可行走格。
 * @param {boolean[][]} grid 可行走表。
 * @param {{x: number, y: number}} from 起點。
 * @param {{x: number, y: number}} to 目標。
 * @returns {Array<{x: number, y: number}> | null} 路徑（不含起點）；走不到時為 null。
 */
export function findPath(grid, from, to) {
  // 是否抵達目標（目標可行走時要站上去，否則站在旁邊）。
  const goal = (x, y) => (grid[to.y] && grid[to.y][to.x] ? x === to.x && y === to.y : Math.abs(x - to.x) + Math.abs(y - to.y) === 1);
  // 格子座標的字串鍵。
  const key = (x, y) => `${x},${y}`;
  const prev = new Map([[key(from.x, from.y), null]]);
  const queue = [[from.x, from.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (goal(x, y)) {
      const path = [];
      let k = key(x, y);
      while (k && k !== key(from.x, from.y)) {
        const [px2, py2] = k.split(',').map(Number);
        path.unshift({ x: px2, y: py2 });
        k = prev.get(k);
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid[ny] && grid[ny][nx] && !prev.has(key(nx, ny))) {
        prev.set(key(nx, ny), key(x, y));
        queue.push([nx, ny]);
      }
    }
  }
  return null;
}

// ---------- 擴建 ----------

/**
 * 擴建到下一個土地等級還缺少的條件與材料。
 * @param {object} ch 角色。
 * @returns {{max: boolean, next: object | null, missing: string[]}} max 為已是最高等級；missing 空陣列表示可以擴建。
 */
export function expandNeed(ch) {
  const h = homeOf(ch);
  const next = LAND[h.level];
  if (!next) return { max: true, next: null, missing: [] };
  const missing = [];
  if (next.need.level && ch.level < next.need.level && !(ch.rebirth > 0)) missing.push(`角色等級要到 ${next.need.level}`);
  if (next.need.rebirth && !((ch.rebirth || 0) >= next.need.rebirth)) missing.push('要先轉職');
  if (next.need.area && !(ch.unlocked && ch.unlocked[next.need.area] >= 1)) missing.push('要先解鎖魔王城');
  for (const [m, n] of Object.entries(next.mats)) {
    const have = h.mats[m] || 0;
    if (have < n) missing.push(`${homeMatName(m)}還差 ${n - have}`);
  }
  if (ch.gold < next.price) missing.push(`金幣還差 ${next.price - ch.gold}G`);
  return { max: false, next, missing };
}

/**
 * 擴建土地：扣除金幣與材料，房子與庭院變大、田地增加。原本的家具位置不變（以區域左上角為原點）；
 * 門口位置改變後擋到門口的家具收回庫存。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string, stored?: number}} 結果；stored 為被收回庫存的物件數。
 */
export function expandHome(ch) {
  const need = expandNeed(ch);
  if (need.max) return { ok: false, message: '已經是最大的土地了' };
  if (need.missing.length) return { ok: false, message: need.missing.join('、') };
  const h = homeOf(ch);
  ch.gold -= need.next.price;
  for (const [m, n] of Object.entries(need.next.mats)) addHomeMat(ch, m, -n);
  h.level++;
  h.plots = [...h.plots, ...emptyPlots(need.next.plots - h.plots.length)];
  const stored = revalidate(h);
  const [w, hh] = need.next.house;
  return { ok: true, stored, message: `擴建完成！房子變成 ${w}×${hh} 格、庭院田地 ${need.next.plots} 塊、最多養 ${need.next.animals} 隻動物${stored ? `（有 ${stored} 件物品擋到新的門口，已收回庫存）` : ''}` };
}

/**
 * 重新檢查所有擺放：依序放回，不合法的收回庫存。
 * @param {object} h 家園資料（會被修改）。
 * @returns {number} 收回的件數。
 */
function revalidate(h) {
  const all = h.placed;
  h.placed = [];
  let stored = 0;
  for (const p of all) {
    if (placeCheck(h, p.id, p.at, p.x, p.y).ok) h.placed.push(p);
    else {
      unplace(h, p);
      stored++;
    }
  }
  return stored;
}

// ---------- 時間、種植與牧場 ----------

/**
 * 作物從種下到成熟的毫秒數。
 * @param {string} key 作物代碼。
 * @returns {number} 毫秒。
 */
export function cropTotalMs(key) {
  return CROPS[key].hours * 3600e3;
}

/**
 * 田地的生長階段：-1 空地、0 剛種下、1 成長中、2 成熟。
 * @param {{crop: string | null, grown: number}} plot 田地。
 * @returns {number} 階段。
 */
export function cropStage(plot) {
  if (!plot || !plot.crop) return -1;
  const total = cropTotalMs(plot.crop);
  return plot.grown >= total ? 2 : plot.grown >= total * GROW.mid ? 1 : 0;
}

/**
 * 作物還要多久成熟（毫秒）。
 * @param {{crop: string | null, grown: number}} plot 田地。
 * @returns {number} 毫秒（空地或已成熟為 0）。
 */
export function cropLeftMs(plot) {
  if (!plot || !plot.crop) return 0;
  return Math.max(0, cropTotalMs(plot.crop) - plot.grown);
}

/**
 * 依實際時間推進作物與動物：距離上次記錄的時間（最多 24 小時）加到每塊田的生長與每隻動物的產出；
 * 時鐘被往回調時不倒扣、也不前進（記錄的時間保持不變，等時鐘追上後才繼續）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} now 現在時間（毫秒）。
 * @returns {number} 這次推進的毫秒數。
 */
export function tickHome(ch, now) {
  const h = homeOf(ch);
  if (!Number.isFinite(now)) return 0;
  if (!h.lastSeen) {
    h.lastSeen = now;
    return 0;
  }
  const dt = Math.min(now - h.lastSeen, GROW.maxStepMs);
  if (!(dt > 0)) return 0;
  h.lastSeen = now;
  for (const p of h.plots) if (p.crop) p.grown = Math.min(cropTotalMs(p.crop), p.grown + dt);
  for (const p of h.placed) {
    if (HOME_ITEMS[p.id].type !== 'animal') continue;
    const period = ANIMALS[p.id].hours * 3600e3;
    const use = Math.min(dt, p.food);
    p.food -= use;
    p.prog += use;
    while (p.prog >= period && p.stock < RANCH.maxStock) {
      p.prog -= period;
      p.stock++;
    }
    if (p.stock >= RANCH.maxStock) p.prog = Math.min(p.prog, period);
  }
  return dt;
}

/**
 * 某個學科連動是否已解鎖（解鎖紀錄存在家園中，學習遊戲的資料被清除也不會失去）。
 * @param {object} ch 角色。
 * @param {string} key 連動代碼。
 * @returns {boolean} 已解鎖時為 true。
 */
export function linkOn(ch, key) {
  return !key || homeOf(ch).links.includes(key);
}

/**
 * 依學習遊戲收集的知識卡更新學科連動：新解鎖的記錄下來；節慶連動解鎖時自動學會節慶裝飾的配方。
 * @param {object} ch 角色（會被修改）。
 * @param {{science?: Iterable<string>, social?: Iterable<string>}} cards 自然探險與社會科學已收集的知識卡代碼。
 * @returns {string[]} 新解鎖的連動代碼。
 */
export function syncLinks(ch, cards) {
  const h = homeOf(ch);
  const have = { science: new Set(cards.science || []), social: new Set(cards.social || []) };
  const fresh = [];
  for (const [key, link] of Object.entries(LINKS)) {
    if (h.links.includes(key)) continue;
    if ((LINK_CARDS[key] || []).some((id) => have[link.game].has(id))) {
      h.links.push(key);
      fresh.push(key);
    }
  }
  if (h.links.includes('festival')) {
    for (const k of HOME_ITEM_KEYS) if (HOME_ITEMS[k].src === 'festival' && !h.recipes.includes(k)) h.recipes.push(k);
  }
  return fresh;
}

/**
 * 種植：消耗一顆種子種在空的田地上（需要學科連動的作物要先解鎖）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 田地索引。
 * @param {string} crop 作物代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function plant(ch, index, crop) {
  const h = homeOf(ch);
  const p = h.plots[index];
  const c = CROPS[crop];
  if (!p || !c) return { ok: false, message: '不能種在這裡' };
  if (p.crop) return { ok: false, message: '這塊田已經種了東西' };
  if (!linkOn(ch, c.link)) return { ok: false, message: `${c.name}還不會種：到${LINKS[c.link].hint}收集知識卡就能種` };
  if (!(h.seeds[crop] > 0)) return { ok: false, message: `沒有${c.name}種子` };
  addSeed(ch, crop, -1);
  h.plots[index] = { crop, grown: 0 };
  return { ok: true, message: `種下了${c.name}，大約 ${c.hours} 小時成熟` };
}

/**
 * 施肥：讓一塊田的作物立刻長大一階（成長中的直接成熟）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 田地索引。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function fertilize(ch, index) {
  const h = homeOf(ch);
  const p = h.plots[index];
  const stage = cropStage(p);
  if (stage < 0) return { ok: false, message: '先種下作物再施肥' };
  if (stage === 2) return { ok: false, message: '已經成熟了，可以收成' };
  if (h.fertilizer < 1) return { ok: false, message: '沒有肥料：在學習遊戲過關可以得到' };
  h.fertilizer--;
  const total = cropTotalMs(p.crop);
  p.grown = stage === 0 ? Math.ceil(total * GROW.mid) : total;
  return { ok: true, message: stage === 0 ? `${CROPS[p.crop].name}長大了一些！` : `${CROPS[p.crop].name}成熟了！` };
}

/**
 * 隨機整數（含兩端）。
 * @param {[number, number]} range 範圍。
 * @param {() => number} rng 亂數函式。
 * @returns {number} 整數。
 */
function rollRange([lo, hi], rng) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * 第一次收成或收取時記錄觀察日記。
 * @param {object} h 家園資料（會被修改）。
 * @param {string} key 作物或動物代碼。
 * @returns {string | null} 第一次時回傳代碼，否則為 null。
 */
function noteDiary(h, key) {
  if (!DIARY[key] || h.diary.includes(key)) return null;
  h.diary.push(key);
  return key;
}

/**
 * 收成成熟的作物：得到物產（果樹偶爾多得木材）；果樹回到成長中重新結果，其他作物收成後田地清空。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 田地索引。
 * @param {() => number} rng 亂數函式。
 * @returns {{ok: boolean, message: string, good?: string, n?: number, wood?: number, diary?: string | null}} 結果；diary 為第一次收成時的觀察日記代碼。
 */
export function harvest(ch, index, rng) {
  const h = homeOf(ch);
  const p = h.plots[index];
  if (cropStage(p) !== 2) return { ok: false, message: '還沒成熟' };
  const c = CROPS[p.crop];
  const key = p.crop;
  const n = addGood(ch, key, rollRange(c.yield, rng));
  const wood = c.tree && c.bonus && rng() < c.bonus ? addHomeMat(ch, 'wood', 1) : 0;
  if (c.tree) p.grown = cropTotalMs(key) - c.regrow * 3600e3;
  else h.plots[index] = { crop: null, grown: 0 };
  const diary = noteDiary(h, key);
  return { ok: true, good: key, n, wood, diary, message: `收成${GOODS[key].name} ×${n}${wood ? '，還撿到木材 ×1' : ''}${c.tree ? `；${c.regrow} 小時後會再結果` : ''}` };
}

/**
 * 剷除田地上的作物（例如不想要的果樹）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 田地索引。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function clearPlot(ch, index) {
  const h = homeOf(ch);
  const p = h.plots[index];
  if (!p || !p.crop) return { ok: false, message: '這塊田是空的' };
  const name = CROPS[p.crop].name;
  h.plots[index] = { crop: null, grown: 0 };
  return { ok: true, message: `剷除了${name}` };
}

/**
 * 增減物產（作物收成、動物產物、獸肉、染料）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 物產代碼。
 * @param {number} [n=1] 數量（負數為扣除）。
 * @returns {number} 實際增減的數量。
 */
export function addGood(ch, key, n = 1) {
  return addHomeStack(ch, 'produce', key, n);
}

/**
 * 已擺放的動物數與庫存中的動物數。
 * @param {object} h 家園資料。
 * @returns {number} 隻數。
 */
function animalCount(h) {
  const placed = h.placed.filter((p) => HOME_ITEMS[p.id].type === 'animal').length;
  return placed + Object.keys(ANIMALS).reduce((sum, k) => sum + (h.inventory[k] || 0), 0);
}

/**
 * 在商店購買牧場動物（放進庫存，到家裡佈置時擺在庭院）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 動物代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyAnimal(ch, key) {
  const a = ANIMALS[key];
  if (!a) return { ok: false, message: '沒有這種動物' };
  const h = homeOf(ch);
  const name = HOME_ITEMS[key].name;
  if (!linkOn(ch, a.link)) return { ok: false, message: `還不能養${name}：到${LINKS[a.link].hint}收集知識卡就能養` };
  if (h.level < a.land) return { ok: false, message: `${name}需要土地等級 ${a.land}` };
  if (animalCount(h) >= LAND[h.level - 1].animals) return { ok: false, message: `土地等級 ${h.level} 最多養 ${LAND[h.level - 1].animals} 隻動物，擴建後可以養更多` };
  if (ch.gold < a.price) return { ok: false, message: `金幣不足（需要 ${a.price}G）` };
  ch.gold -= a.price;
  addHomeStack(ch, 'inventory', key, 1);
  return { ok: true, message: `買下了${name}！回家按「佈置」把牠放到庭院` };
}

/**
 * 購買牧草（飼料）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} [n=1] 數量。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyFeed(ch, n = 1) {
  const price = RANCH.feedPrice * n;
  if ((homeOf(ch).produce[RANCH.feed] || 0) + n > HOME_MAX) return { ok: false, message: `牧草已經快滿了（上限 ${HOME_MAX}）` };
  if (ch.gold < price) return { ok: false, message: `金幣不足（需要 ${price}G）` };
  ch.gold -= price;
  addGood(ch, RANCH.feed, n);
  return { ok: true, message: `買下牧草 ×${n}` };
}

/**
 * 動物目前的狀態。
 * @param {object} p 擺放的動物。
 * @returns {{hungry: boolean, ready: number, leftMs: number}} hungry 為沒有飼料；ready 為可收取的產物份數；leftMs 為下一份產物還要多久（有飼料時）。
 */
export function animalState(p) {
  const period = ANIMALS[p.id].hours * 3600e3;
  return { hungry: p.food <= 0, ready: p.stock, leftMs: p.stock >= RANCH.maxStock ? 0 : Math.max(0, period - p.prog) };
}

/**
 * 餵動物一份牧草（可以吃 24 小時；還剩一半以上時不用餵）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 擺放索引。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function feedAnimal(ch, index) {
  const h = homeOf(ch);
  const p = h.placed[index];
  if (!p || HOME_ITEMS[p.id].type !== 'animal') return { ok: false, message: '這不是動物' };
  const full = RANCH.feedHours * 3600e3;
  const name = HOME_ITEMS[p.id].name;
  if (p.food > full / 2) return { ok: false, message: `${name}還很飽（還可以吃 ${Math.ceil(p.food / 3600e3)} 小時）` };
  if (!(h.produce[RANCH.feed] > 0)) return { ok: false, message: '沒有牧草：在庭院種牧草，或到商店購買' };
  addGood(ch, RANCH.feed, -1);
  p.food = full;
  return { ok: true, message: `餵了${name}牧草，接下來 ${RANCH.feedHours} 小時會持續產出` };
}

/**
 * 收取動物累積的產物。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 擺放索引。
 * @returns {{ok: boolean, message: string, good?: string, n?: number, diary?: string | null}} 結果。
 */
export function collectAnimal(ch, index) {
  const h = homeOf(ch);
  const p = h.placed[index];
  if (!p || HOME_ITEMS[p.id].type !== 'animal') return { ok: false, message: '這不是動物' };
  if (!p.stock) return { ok: false, message: '還沒有產物' };
  const good = ANIMALS[p.id].product;
  const n = addGood(ch, good, p.stock);
  p.stock = 0;
  const diary = noteDiary(h, p.id);
  return { ok: true, good, n, diary, message: `收取${GOODS[good].name} ×${n}` };
}

// ---------- 藥草台與料理 ----------

/**
 * 材料表缺少的物產說明。
 * @param {object} h 家園資料。
 * @param {Record<string, number>} need 物產與數量。
 * @returns {string[]} 缺少的說明（空陣列表示足夠）。
 */
function goodsMissing(h, need) {
  return Object.entries(need).filter(([k, n]) => (h.produce[k] || 0) < n).map(([k, n]) => `${GOODS[k].name}還差 ${n - (h.produce[k] || 0)}`);
}

/**
 * 藥草台配方（藥水、布料、染料）或料理缺少的東西。
 * @param {object} ch 角色。
 * @param {string} key 配方或料理代碼。
 * @returns {string[]} 缺少的說明（空陣列表示可以製作）。
 */
export function brewMissing(ch, key) {
  const h = homeOf(ch);
  const r = BREWS[key] || MEALS[key];
  if (!r) return ['沒有這個配方'];
  const miss = [];
  if (r.link && !linkOn(ch, r.link)) miss.push(`到${LINKS[r.link].hint}收集知識卡才會做`);
  return [...miss, ...goodsMissing(h, r.in)];
}

/**
 * 在藥草台製作：藥水（加到身上的藥水）、布料（家園材料）、染料（物產）或料理（放進料理庫存）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 配方或料理代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function brew(ch, key) {
  const miss = brewMissing(ch, key);
  if (miss.length) return { ok: false, message: miss.join('、') };
  const r = BREWS[key] || MEALS[key];
  const h = homeOf(ch);
  const out = MEALS[key] ? { kind: 'meal', key, n: 1 } : r.out;
  // 先確認放得下，再扣材料。
  if (out.kind === 'potion' && (ch.potions || 0) >= LIMITS.potionHold) return { ok: false, message: `藥水最多持有 ${LIMITS.potionHold} 瓶` };
  if (out.kind === 'cure' && (ch.cures || 0) >= LIMITS.cureHold) return { ok: false, message: `淨化藥水最多持有 ${LIMITS.cureHold} 瓶` };
  const room = { mat: () => HOME_MAX - (h.mats[out.key] || 0), good: () => HOME_MAX - (h.produce[out.key] || 0), meal: () => HOME_MAX - (h.meals[out.key] || 0) }[out.kind];
  if (room && room() < out.n) return { ok: false, message: '已經放不下了' };
  for (const [k, n] of Object.entries(r.in)) addGood(ch, k, -n);
  if (out.kind === 'potion') ch.potions = (ch.potions || 0) + out.n;
  else if (out.kind === 'cure') ch.cures = (ch.cures || 0) + out.n;
  else if (out.kind === 'mat') addHomeMat(ch, out.key, out.n);
  else if (out.kind === 'good') addGood(ch, out.key, out.n);
  else addHomeStack(ch, 'meals', out.key, out.n);
  return { ok: true, message: `做好了${r.name}${out.n > 1 ? ` ×${out.n}` : ''}！` };
}

/**
 * 料理的加成說明，例如「最大 HP +10%」。
 * @param {string} key 料理代碼。
 * @returns {string} 說明。
 */
export function mealText(key) {
  const b = MEAL_BUFFS[MEALS[key].buff];
  return `${b.name} +${b.pct}%`;
}

/**
 * 吃一份料理：下一趟探險有效（一次只能吃一種，原本吃的放回料理庫存）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 料理代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function eatMeal(ch, key) {
  const h = homeOf(ch);
  if (!MEALS[key] || !(h.meals[key] > 0)) return { ok: false, message: '沒有這道料理' };
  if (h.meal === key) return { ok: false, message: `已經吃了${MEALS[key].name}` };
  const prev = h.meal;
  if (prev) addHomeStack(ch, 'meals', prev, 1);
  addHomeStack(ch, 'meals', key, -1);
  h.meal = key;
  return { ok: true, message: `吃了${MEALS[key].name}：下一趟探險${mealText(key)}${prev ? `（${MEALS[prev].name}放回去了）` : ''}` };
}

/**
 * 出發時取用料理加成（吃過的料理只對這一趟有效）。
 * @param {object} ch 角色（會被修改）。
 * @returns {{key: string, buff: string, pct: number} | null} 加成；沒有吃料理時為 null。
 */
export function takeMeal(ch) {
  const h = homeOf(ch);
  if (!h.meal) return null;
  const key = h.meal;
  h.meal = null;
  return { key, buff: MEALS[key].buff, pct: MEAL_BUFFS[MEALS[key].buff].pct };
}

// ---------- 家用寶箱、展示架與染色 ----------

/**
 * 擺出來的家用寶箱數。
 * @param {object} h 家園資料。
 * @returns {number} 個數。
 */
function placedChests(h) {
  return h.placed.filter((p) => HOME_ITEMS[p.id].func === 'chest').length;
}

/**
 * 家用寶箱的總格數：每擺出一個寶箱 20 格（最多計算 3 個）。
 * @param {object} h 家園資料。
 * @returns {number} 格數。
 */
export function chestCapacity(h) {
  return HOME_CHEST.slots * Math.min(HOME_CHEST.maxChests, placedChests(h));
}

/**
 * 把背包中的裝備放進家用寶箱。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 裝備 id。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function chestDeposit(ch, id) {
  const h = homeOf(ch);
  const idx = ch.bag.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '只能放入背包中的裝備' };
  if (h.chest.length >= chestCapacity(h)) return { ok: false, message: `家用寶箱已滿（${chestCapacity(h)} 格）` };
  const [item] = ch.bag.splice(idx, 1);
  h.chest.push(item);
  return { ok: true, message: `${item.name} 放進家用寶箱` };
}

/**
 * 從家用寶箱拿出裝備放進背包。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 裝備 id。
 * @param {boolean} bagRoom 背包是否還有空位。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function chestWithdraw(ch, id, bagRoom) {
  const h = homeOf(ch);
  const idx = h.chest.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '寶箱裡沒有這件裝備' };
  if (!bagRoom) return { ok: false, message: '背包已滿' };
  const [item] = h.chest.splice(idx, 1);
  ch.bag.push(item);
  return { ok: true, message: `拿出 ${item.name}` };
}

/**
 * 把背包中的裝備放到展示架上。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 展示架的擺放索引。
 * @param {string} id 裝備 id。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function shelfPut(ch, index, id) {
  const p = homeOf(ch).placed[index];
  if (!p || !p.show) return { ok: false, message: '這不是展示架' };
  if (p.show.length >= SHELF_SLOTS) return { ok: false, message: `展示架最多放 ${SHELF_SLOTS} 件` };
  const idx = ch.bag.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '只能展示背包中的裝備' };
  const [item] = ch.bag.splice(idx, 1);
  p.show.push(item);
  return { ok: true, message: `把 ${item.name} 擺上展示架` };
}

/**
 * 從展示架拿下裝備放回背包。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 展示架的擺放索引。
 * @param {string} id 裝備 id。
 * @param {boolean} bagRoom 背包是否還有空位。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function shelfTake(ch, index, id, bagRoom) {
  const p = homeOf(ch).placed[index];
  const idx = p && p.show ? p.show.findIndex((i) => i.id === id) : -1;
  if (idx < 0) return { ok: false, message: '展示架上沒有這件裝備' };
  if (!bagRoom) return { ok: false, message: '背包已滿' };
  const [item] = p.show.splice(idx, 1);
  ch.bag.push(item);
  return { ok: true, message: `拿下 ${item.name}` };
}

/**
 * 替已擺放的家具或裝飾染色（消耗一份染料）；dye 為 null 時改回原色（不消耗）。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 擺放索引。
 * @param {string | null} dye 染料代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function dyeItem(ch, index, dye) {
  const h = homeOf(ch);
  const p = h.placed[index];
  if (!p || HOME_ITEMS[p.id].type === 'animal') return { ok: false, message: '這個不能染色' };
  const name = HOME_ITEMS[p.id].name;
  if (!dye) {
    if (!p.dye) return { ok: false, message: '已經是原色了' };
    delete p.dye;
    return { ok: true, message: `「${name}」改回原色` };
  }
  if (!DYE_KEYS.includes(dye)) return { ok: false, message: '沒有這種染料' };
  if (p.dye === dye) return { ok: false, message: '已經是這個顏色了' };
  if (!(h.produce[dye] > 0)) return { ok: false, message: `沒有${GOODS[dye].name}：在藥草台用星光花製作` };
  addGood(ch, dye, -1);
  p.dye = dye;
  return { ok: true, message: `用${GOODS[dye].name}替「${name}」染色` };
}

// ---------- 市集 ----------

/**
 * 字串雜湊成 0～1 的數（決定每天每種物產的需求）。
 * @param {string} s 字串。
 * @returns {number} 0～1。
 */
function strHash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619) >>> 0;
  return (x % 10007) / 10007;
}

/**
 * 今天市集對某種物產的需求倍率（每天不同、固定）。
 * @param {string} key 物產代碼。
 * @param {string} day 本地日期。
 * @returns {number} 倍率（MARKET.low～high）。
 */
export function marketDemand(key, day) {
  return MARKET.low + (MARKET.high - MARKET.low) * strHash(`${day}:${key}`);
}

/**
 * 今天的市集收購價：基本價 × 需求倍率 × 供給（今天已賣出越多，價格越低）。
 * @param {object} ch 角色。
 * @param {string} key 物產代碼。
 * @param {string} day 本地日期。
 * @returns {number} 每份的金幣（至少 1）。
 */
export function marketPrice(ch, key, day) {
  const h = homeOf(ch);
  const sold = h.market && h.market.day === day ? h.market.sold[key] || 0 : 0;
  const supply = Math.max(MARKET.floor, 1 - MARKET.drop * sold);
  return Math.max(1, Math.round(GOODS[key].price * marketDemand(key, day) * supply));
}

/**
 * 在市集賣出物產（要先解鎖市集；一份一份賣，每賣一份價格就重新計算）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 物產代碼。
 * @param {number} n 數量。
 * @param {string} day 本地日期。
 * @returns {{ok: boolean, message: string, gold?: number}} 結果。
 */
export function sellGood(ch, key, n, day) {
  const h = homeOf(ch);
  if (!linkOn(ch, 'market')) return { ok: false, message: `市集還沒開張：到${LINKS.market.hint}收集知識卡` };
  if (!GOODS[key] || !((h.produce[key] || 0) >= n) || !(n > 0)) return { ok: false, message: '數量不足' };
  if (!h.market || h.market.day !== day) h.market = { day, sold: {} };
  let gold = 0;
  for (let i = 0; i < n; i++) {
    gold += marketPrice(ch, key, day);
    h.market.sold[key] = (h.market.sold[key] || 0) + 1;
  }
  addGood(ch, key, -n);
  ch.gold += gold;
  return { ok: true, gold, message: `賣出${GOODS[key].name} ×${n}，得到 ${gold}G` };
}
