// 村莊規則（純邏輯）：商店刷新與買賣、裝備穿脫、強化、區域與深度解鎖、探險開始與結算。
// 所有函式直接修改傳入的角色資料，回傳結果與要顯示的訊息。

import { AREAS, AREA_KEYS, LIMITS, MAX_DEPTH, RARITIES, ENHANCE, EQUIP_SLOTS, SHARED_SLOTS, CLASSES, REBIRTH, GEMS, GEM_RULES, MATERIALS, CRAFT, ITEM_SLOTS, BAG_EXPAND, SKILL_BOOK, GIFT, TICKET } from './data.js';
import { learnBook, SKILLS, bookSkillIds, passiveBonus } from './skills.js';
import { makeItem, itemValue, sellPrice, enhanceCost, tryEnhance, rollRarity, dungeonLevel, levelCap, parseGem, gemName, socketCount, weaponHands, characterStats, powerScore } from './rules.js';

/** 商店一次陳列的裝備數。 */
export const SHOP_SIZE = 8;

/**
 * 角色目前可挑戰的最高地城等級（決定商店裝備的等級）。
 * @param {object} ch 角色。
 * @returns {number} 等級。
 */
function shopLevel(ch) {
  return Math.max(1, Math.min(ch.level, 30));
}

/**
 * 刷新商店的 8 件裝備（每次返回村莊時呼叫）：武器、飾品各 2 件，副手、頭盔、鎧甲、鞋子各 1 件，以普通與精良為主。
 * @param {object} ch 角色（會被修改）。
 * @param {() => number} rng 亂數函式。
 */
export function refreshShop(ch, rng) {
  const level = shopLevel(ch);
  const slots = ['weapon', 'weapon', 'offhand', 'helmet', 'armor', 'boots', 'accessory', 'accessory'];
  ch.shop = slots.map((slot) => {
    const rarity = rollRarity([55, 40, 5, 0], rng);
    const item = makeItem({ slot, cls: ch.cls, level, rarity }, rng);
    return { item, price: shopPrice(item) };
  });
  // 製作書：每次刷新隨機陳列 2 本（部位隨機）。
  ch.shopBooks = Array.from({ length: CRAFT.shopBooks }, () => CRAFT.books[Math.floor(rng() * CRAFT.books.length)]);
}

/**
 * 製作書的名稱，例如「頭盔製作書」。
 * @param {string} slot 部位。
 * @returns {string} 名稱。
 */
export function bookName(slot) {
  return `${ITEM_SLOTS[slot]}製作書`;
}

/**
 * 購買商店陳列的製作書。
 * @param {object} ch 角色（會被修改）。
 * @param {number} index 陳列位置。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyBook(ch, index) {
  const slot = ch.shopBooks && ch.shopBooks[index];
  if (!slot) return { ok: false, message: '這本製作書已經賣出' };
  if (ch.gold < CRAFT.bookPrice) return { ok: false, message: `金幣不足（需要 ${CRAFT.bookPrice}G）` };
  if (!addBook(ch, slot)) return { ok: false, message: `背包已滿（${bagLimit(ch)} 格）` };
  ch.gold -= CRAFT.bookPrice;
  ch.shopBooks.splice(index, 1);
  return { ok: true, message: `買下${bookName(slot)}，到「鐵匠」合成裝備` };
}

/**
 * 商店售價（價值的 1.2 倍）。
 * @param {object} item 裝備。
 * @returns {number} 金幣。
 */
export function shopPrice(item) {
  return Math.round(itemValue(item) * 1.2);
}

/**
 * 購買商店中的裝備。
 * @param {object} ch 角色。
 * @param {number} index 商品位置。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyItem(ch, index) {
  const entry = ch.shop && ch.shop[index];
  if (!entry) return { ok: false, message: '這件商品已經賣出' };
  if (bagUsed(ch) >= bagLimit(ch)) return { ok: false, message: `背包已滿（${bagLimit(ch)} 格），請先賣出或分解裝備` };
  if (ch.gold < entry.price) return { ok: false, message: `金幣不足（需要 ${entry.price}G）` };
  ch.gold -= entry.price;
  ch.bag.push(entry.item);
  ch.shop.splice(index, 1);
  return { ok: true, message: `買下 ${entry.item.name}` };
}

/**
 * 購買回復藥水（最多持有 10 瓶）。
 * @param {object} ch 角色。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyPotion(ch) {
  if (ch.potions >= LIMITS.potionHold) return { ok: false, message: `藥水最多持有 ${LIMITS.potionHold} 瓶` };
  if (ch.gold < LIMITS.potionPrice) return { ok: false, message: `金幣不足（需要 ${LIMITS.potionPrice}G）` };
  ch.gold -= LIMITS.potionPrice;
  ch.potions++;
  return { ok: true, message: `買下回復藥水（持有 ${ch.potions} 瓶）` };
}

/**
 * 購買淨化藥水（解除所有異常狀態，最多持有 5 瓶）。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyCure(ch) {
  const have = ch.cures || 0;
  if (have >= LIMITS.cureHold) return { ok: false, message: `淨化藥水最多持有 ${LIMITS.cureHold} 瓶` };
  if (ch.gold < LIMITS.curePrice) return { ok: false, message: `金幣不足（需要 ${LIMITS.curePrice}G）` };
  ch.gold -= LIMITS.curePrice;
  ch.cures = have + 1;
  return { ok: true, message: `買下淨化藥水（持有 ${ch.cures} 瓶）` };
}

/**
 * 出發前藥水的缺額：持有量低於每趟攜帶上限時，補齊所需的回復藥水、淨化藥水數量與金幣。
 * @param {object} ch 角色。
 * @returns {{potions: number, cures: number, cost: number}} 缺少的瓶數與補齊的價格；都為 0 時代表已補齊。
 */
export function refillNeed(ch) {
  const potions = Math.max(0, LIMITS.potions - ch.potions);
  const cures = Math.max(0, LIMITS.cures - (ch.cures || 0));
  return { potions, cures, cost: potions * LIMITS.potionPrice + cures * LIMITS.curePrice };
}

/**
 * 補齊藥水到每趟攜帶上限（先買回復藥水，再買淨化藥水）；金幣不夠時買到買不起為止。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, potions: number, cures: number, gold: number, message: string}} 實際買到的瓶數與花費；全部補齊時 ok 為 true。
 */
export function refillPotions(ch) {
  const need = refillNeed(ch);
  const gold0 = ch.gold;
  let potions = 0;
  let cures = 0;
  while (potions < need.potions && buyPotion(ch).ok) potions++;
  while (cures < need.cures && buyCure(ch).ok) cures++;
  const ok = potions === need.potions && cures === need.cures;
  const got = [potions && `回復藥水 ${potions} 瓶`, cures && `淨化藥水 ${cures} 瓶`].filter(Boolean).join('、');
  const message = ok ? `已補齊藥水（${got}，${gold0 - ch.gold}G）` : got ? `金幣不足，只補了${got}（${gold0 - ch.gold}G）` : '金幣不足，沒有補到藥水';
  return { ok, potions, cures, gold: gold0 - ch.gold, message };
}

/**
 * 把寶石放進角色的寶石袋（同種同級疊在一起）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 寶石代碼。
 * @param {number} [n=1] 數量。
 */
export function addGem(ch, key, n = 1) {
  ch.gems = ch.gems || {};
  ch.gems[key] = (ch.gems[key] || 0) + n;
  if (ch.gems[key] <= 0) delete ch.gems[key];
}

/**
 * 合成寶石：3 顆同種同級的持續型寶石，花費金幣合成 1 顆高一級的寶石（最高 5 級）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 要合成的寶石代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function fuseGem(ch, key) {
  const g = parseGem(key);
  if (!g) return { ok: false, message: '找不到這種寶石' };
  if (GEMS[g.kind].active) return { ok: false, message: `${gemName(key)}不能合成` };
  if (g.tier >= GEM_RULES.max) return { ok: false, message: `${gemName(key)}已經是最高等級` };
  const have = (ch.gems && ch.gems[key]) || 0;
  if (have < GEM_RULES.fuse) return { ok: false, message: `需要 ${GEM_RULES.fuse} 顆${gemName(key)}（目前 ${have} 顆）` };
  const cost = GEM_RULES.fuseCost[g.tier];
  if (ch.gold < cost) return { ok: false, message: `金幣不足（需要 ${cost}G）` };
  ch.gold -= cost;
  addGem(ch, key, -GEM_RULES.fuse);
  const next = `${g.kind}-${g.tier + 1}`;
  addGem(ch, next);
  return { ok: true, message: `合成成功：${gemName(next)}` };
}

/**
 * 把寶石袋中的寶石鑲嵌到裝備（背包或裝備欄中的裝備）的空孔。同一件裝備不能鑲兩顆相同的主動寶石。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 裝備 id。
 * @param {string} key 寶石代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function socketGem(ch, id, key) {
  const found = findItem(ch, id);
  if (!found) return { ok: false, message: '找不到這件裝備' };
  const item = found.item;
  const g = parseGem(key);
  if (!g || !(ch.gems && ch.gems[key] > 0)) return { ok: false, message: '寶石袋裡沒有這顆寶石' };
  item.gems = item.gems || [];
  if (item.gems.length >= socketCount(item)) return { ok: false, message: `${item.name}的 ${socketCount(item)} 個孔都已經鑲滿` };
  if (GEMS[g.kind].active && item.gems.includes(key)) return { ok: false, message: `同一件裝備不能鑲兩顆${gemName(key)}` };
  addGem(ch, key, -1);
  item.gems.push(key);
  return { ok: true, message: `${item.name}鑲上${gemName(key)}` };
}

/**
 * 取下裝備上的寶石放回寶石袋（免費，寶石不會損壞）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 裝備 id。
 * @param {number} index 孔的位置。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function unsocketGem(ch, id, index) {
  const found = findItem(ch, id);
  if (!found) return { ok: false, message: '找不到這件裝備' };
  const item = found.item;
  const key = item.gems && item.gems[index];
  if (!key) return { ok: false, message: '這個孔是空的' };
  item.gems.splice(index, 1);
  addGem(ch, key);
  return { ok: true, message: `取下${gemName(key)}，放回寶石袋` };
}

/**
 * 購買回城卷軸（每趟只能帶 1 張，因此最多持有 1 張）。
 * @param {object} ch 角色。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyScroll(ch) {
  if (ch.scroll >= 1) return { ok: false, message: '回城卷軸每趟只能帶 1 張，已經持有' };
  if (ch.gold < LIMITS.scrollPrice) return { ok: false, message: `金幣不足（需要 ${LIMITS.scrollPrice}G）` };
  ch.gold -= LIMITS.scrollPrice;
  ch.scroll = 1;
  return { ok: true, message: '買下回城卷軸' };
}

/**
 * 找出背包或裝備欄中的裝備。
 * @param {object} ch 角色。
 * @param {string} id 裝備 id。
 * @returns {{item: object, where: 'bag' | 'equipped', slot?: string} | null} 位置。
 */
export function findItem(ch, id) {
  const item = ch.bag.find((i) => i.id === id);
  if (item) return { item, where: 'bag' };
  for (const [slot, it] of Object.entries(ch.equipped)) if (it && it.id === id) return { item: it, where: 'equipped', slot };
  return null;
}

/**
 * 賣出背包中的裝備。
 * @param {object} ch 角色。
 * @param {string} id 裝備 id。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function sellItem(ch, id) {
  const idx = ch.bag.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '只能賣出背包中的裝備，請先卸下' };
  const [item] = ch.bag.splice(idx, 1);
  const price = sellPrice(item);
  ch.gold += price;
  // 鑲在裝備上的寶石自動取下，放回寶石袋。
  const gems = item.gems || [];
  for (const key of gems) addGem(ch, key);
  item.gems = [];
  return { ok: true, message: `賣出 ${item.name}（+${price}G）${gems.length ? `，${gems.length} 顆寶石放回寶石袋` : ''}` };
}

/**
 * 背包目前的上限（初始 20 格，使用背包擴充袋後增加，最多 100 格）。
 * @param {object} ch 角色。
 * @returns {number} 格數。
 */
export function bagLimit(ch) {
  return Math.min(BAG_EXPAND.max, Math.max(LIMITS.bag, ch.bagSize || LIMITS.bag));
}

/**
 * 背包已使用的格數：每件裝備 1 格，每種材料、製作書、技能書、獎勵禮包（依等級）、技能書碎片各 1 格（數量不限，最多疊 9999）。
 * @param {object} ch 角色。
 * @returns {number} 格數。
 */
export function bagUsed(ch) {
  const stacks = (obj) => Object.values(obj || {}).filter((n) => n > 0).length;
  return ch.bag.length + stacks(ch.mats) + stacks(ch.books) + stacks(ch.skillBooks) + stacks(ch.gifts) + stacks(ch.shards);
}

/**
 * 把堆疊類道具加進背包（材料或製作書）：已有同種時疊上去（最多 9999），沒有時需要 1 格空位。
 * @param {object} ch 角色（會被修改）。
 * @param {'mats' | 'books' | 'skillBooks' | 'gifts' | 'shards'} field 欄位。
 * @param {string} key 種類。
 * @param {number} n 數量（負數為扣除）。
 * @returns {boolean} 是否成功（背包沒有空位時為 false）。
 */
function addStack(ch, field, key, n) {
  ch[field] = ch[field] || {};
  const have = ch[field][key] || 0;
  if (n > 0 && have === 0 && bagUsed(ch) >= bagLimit(ch)) return false;
  const next = Math.max(0, Math.min(LIMITS.stack, have + n));
  if (next > 0) ch[field][key] = next;
  else delete ch[field][key];
  return true;
}

/**
 * 加入合成材料。
 * @param {object} ch 角色（會被修改）。
 * @param {string} key 材料代碼（MATERIALS 的 key）。
 * @param {number} [n=1] 數量。
 * @returns {boolean} 是否成功。
 */
export function addMaterial(ch, key, n = 1) {
  return addStack(ch, 'mats', key, n);
}

/**
 * 加入製作書。
 * @param {object} ch 角色（會被修改）。
 * @param {string} slot 部位。
 * @param {number} [n=1] 數量。
 * @returns {boolean} 是否成功。
 */
export function addBook(ch, slot, n = 1) {
  return addStack(ch, 'books', slot, n);
}

/**
 * 加入技能書。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼（技能書技能）。
 * @param {number} [n=1] 數量（負數為扣除）。
 * @returns {boolean} 是否成功（背包沒有空位時為 false）。
 */
export function addSkillBook(ch, id, n = 1) {
  return addStack(ch, 'skillBooks', id, n);
}

/**
 * 使用技能書學會技能（用掉 1 本）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function useSkillBook(ch, id) {
  if (!(ch.skillBooks && ch.skillBooks[id] > 0)) return { ok: false, message: '沒有這本技能書' };
  const r = learnBook(ch, id);
  if (r.ok) addSkillBook(ch, id, -1);
  return r;
}

/**
 * 賣出 1 本技能書。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function sellSkillBook(ch, id) {
  if (!(ch.skillBooks && ch.skillBooks[id] > 0)) return { ok: false, message: '沒有這本技能書' };
  addSkillBook(ch, id, -1);
  const price = skillBookPrice(id);
  ch.gold += price;
  return { ok: true, message: `賣出技能書（+${price}G）` };
}

/**
 * 技能書的賣價（依稀有度：100、200、400、1,000G）。
 * @param {string} id 技能代碼。
 * @returns {number} 金幣。
 */
export function skillBookPrice(id) {
  return SKILL_BOOK.sellPrice[SKILLS[id].rarity || 0];
}

/**
 * 區域需要的入場卷等級。
 * @param {string} area 區域代碼。
 * @returns {number} 等級（1～5）。
 */
export function ticketTier(area) {
  return TICKET.area[area] || 1;
}

/**
 * 持有的入場卷張數。
 * @param {object} ch 角色。
 * @param {number} tier 等級（1～5）。
 * @returns {number} 張數。
 */
export function ticketCount(ch, tier) {
  return (ch.tickets && ch.tickets[String(tier)]) || 0;
}

/**
 * 加入（或扣除）入場卷；入場卷不佔背包格子，每種最多 999 張。
 * @param {object} ch 角色（會被修改）。
 * @param {number} tier 等級（1～5）。
 * @param {number} [n=1] 張數（負數為扣除）。
 * @returns {number} 實際加入的張數（超過上限的部分不加入）。
 */
export function addTickets(ch, tier, n = 1) {
  ch.tickets = ch.tickets || {};
  const have = ticketCount(ch, tier);
  const next = Math.max(0, Math.min(TICKET.max, have + n));
  if (next > 0) ch.tickets[String(tier)] = next;
  else delete ch.tickets[String(tier)];
  return next - have;
}

/**
 * 角色目前進度的入場卷等級：已解鎖區域中最高的等級（商店販售到這個等級，禮包也開出這個等級）。
 * @param {object} ch 角色。
 * @returns {number} 等級（1～5）。
 */
export function progressTicketTier(ch) {
  return AREA_KEYS.filter((a) => areaUnlocked(ch, a)).reduce((t, a) => Math.max(t, ticketTier(a)), 1);
}

/**
 * 本地時間的日期代碼（入場卷每日限購用）。
 * @param {Date} [now=new Date()] 時間。
 * @returns {string} 例如「2026-10-31」。
 */
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * 今天商店還能買幾張這個等級的入場卷（每個角色每種等級每天限購 TICKET.shopDaily 張，隔天重置）。
 * @param {object} ch 角色。
 * @param {number} tier 等級（1～5）。
 * @param {string} [day=localDay()] 日期代碼。
 * @returns {number} 剩餘張數。
 */
export function ticketShopLeft(ch, tier, day = localDay()) {
  const rec = ch.ticketBuy;
  const bought = rec && rec.day === day && rec.tiers ? Number(rec.tiers[String(tier)]) || 0 : 0;
  return Math.max(0, TICKET.shopDaily - bought);
}

/**
 * 購買 1 張入場卷（只賣已解鎖區域用得到的等級；每種等級每天限購，賣完時 soldOut 為 true）。
 * @param {object} ch 角色（會被修改：金幣、入場卷與今天的購買紀錄 ticketBuy）。
 * @param {number} tier 等級（1～5）。
 * @param {string} [day=localDay()] 日期代碼。
 * @returns {{ok: boolean, message: string, soldOut?: boolean}} 結果。
 */
export function buyTicket(ch, tier, day = localDay()) {
  const price = TICKET.price[tier - 1];
  if (!price || tier > progressTicketTier(ch)) return { ok: false, message: '還沒有用得到這種入場卷的區域' };
  if (ticketShopLeft(ch, tier, day) <= 0) return { ok: false, soldOut: true, message: `今天的${TICKET.names[tier - 1]}已經賣完，到學習遊戲過關拿獎勵禮包，禮包裡有入場卷` };
  if (ticketCount(ch, tier) >= TICKET.max) return { ok: false, message: `${TICKET.names[tier - 1]}最多持有 ${TICKET.max} 張` };
  if (ch.gold < price) return { ok: false, message: `金幣不足（需要 ${price}G）` };
  ch.gold -= price;
  addTickets(ch, tier, 1);
  if (!ch.ticketBuy || ch.ticketBuy.day !== day || !ch.ticketBuy.tiers) ch.ticketBuy = { day, tiers: {} };
  ch.ticketBuy.tiers[String(tier)] = (Number(ch.ticketBuy.tiers[String(tier)]) || 0) + 1;
  const left = ticketShopLeft(ch, tier, day);
  return { ok: true, message: `買下${TICKET.names[tier - 1]}（持有 ${ticketCount(ch, tier)} 張，${left ? `今天還能買 ${left} 張` : '今天的已賣完'}）` };
}

/**
 * 出發時用掉 1 張該區域等級的入場卷。
 * @param {object} ch 角色（會被修改）。
 * @param {string} area 區域代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function useTicket(ch, area) {
  const tier = ticketTier(area);
  if (ticketCount(ch, tier) > 0) {
    addTickets(ch, tier, -1);
    return { ok: true, message: `用掉 1 張${TICKET.names[tier - 1]}（剩 ${ticketCount(ch, tier)} 張）` };
  }
  return { ok: false, message: `需要 1 張${TICKET.names[tier - 1]}（商店 ${TICKET.price[tier - 1]}G）` };
}

/**
 * 加入獎勵禮包。
 * @param {object} ch 角色（會被修改）。
 * @param {number} tier 等級（1～5）。
 * @param {number} [n=1] 數量（負數為扣除）。
 * @returns {boolean} 是否成功（背包沒有空位時為 false）。
 */
export function addGift(ch, tier, n = 1) {
  return addStack(ch, 'gifts', String(tier), n);
}

/**
 * 開啟 1 個獎勵禮包：金幣、裝備材料、技能書碎片（數量與品質依等級），有機會得到回復藥水、淨化藥水與背包擴充袋。
 * 藥水超過持有上限、背包已擴充到上限時改為金幣（gold 已包含，換算的部分另記在 converted）。背包放不下新的材料或碎片種類時不開啟。
 * @param {object} ch 角色（會被修改）。
 * @param {number} tier 等級（1～5）。
 * @param {() => number} rng 亂數函式。
 * @returns {{ok: boolean, message: string, gold?: number, mats?: Record<string, number>, shards?: Record<string, number>, potions?: number, cures?: number, pouch?: number, converted?: number, tickets?: {tier: number, n: number}}} 結果與內容。
 */
export function openGift(ch, tier, rng) {
  if (!(ch.gifts && ch.gifts[String(tier)] > 0)) return { ok: false, message: '沒有這個禮包' };
  const k = tier - 1;
  const mats = {};
  for (let i = 0; i < GIFT.mats[k]; i++) {
    const key = MATERIALS[rollRarity(GIFT.matWeights[k], rng)].key;
    mats[key] = (mats[key] || 0) + 1;
  }
  const shards = {};
  const ids = bookSkillIds();
  for (let i = 0; i < GIFT.shards[k]; i++) {
    const r = rollRarity(GIFT.shardWeights[k], rng);
    const pool = ids.filter((id) => (SKILLS[id].rarity || 0) === r);
    const id = pool[Math.floor(rng() * pool.length)];
    shards[id] = (shards[id] || 0) + 1;
  }
  // 空位：新的材料與碎片種類各需要 1 格；開完最後一個禮包會空出 1 格。
  const fresh = Object.keys(mats).filter((m) => !(ch.mats && ch.mats[m] > 0)).length + Object.keys(shards).filter((id) => !(ch.shards && ch.shards[id] > 0)).length;
  const freed = ch.gifts[String(tier)] === 1 ? 1 : 0;
  if (bagUsed(ch) - freed + fresh > bagLimit(ch)) return { ok: false, message: `背包空間不足（需要 ${fresh - freed} 格）` };
  // 藥水與擴充袋：放不下的換成金幣。
  const potionRoll = rng() < GIFT.potionChance[k] ? GIFT.potions[k] : 0;
  const cureRoll = rng() < GIFT.cureChance[k] ? GIFT.cures[k] : 0;
  const pouchRoll = rng() < GIFT.pouchChance[k] ? 1 : 0;
  const potions = Math.min(potionRoll, Math.max(0, LIMITS.potionHold - (ch.potions || 0)));
  const cures = Math.min(cureRoll, Math.max(0, LIMITS.cureHold - (ch.cures || 0)));
  const pouch = pouchRoll && bagLimit(ch) + ((ch.bagExpand || 0) + 1) * BAG_EXPAND.step <= BAG_EXPAND.max ? 1 : 0;
  const converted = (potionRoll - potions) * LIMITS.potionPrice + (cureRoll - cures) * LIMITS.curePrice + (pouchRoll - pouch) * BAG_EXPAND.basePrice;
  const gold = GIFT.gold[k] + converted;
  // 入場卷：每個禮包都有，等級依角色目前的進度。
  const ticketTierNow = progressTicketTier(ch);
  addGift(ch, tier, -1);
  const tickets = { tier: ticketTierNow, n: addTickets(ch, ticketTierNow, TICKET.gift[k]) };
  ch.gold += gold;
  ch.potions = (ch.potions || 0) + potions;
  ch.cures = (ch.cures || 0) + cures;
  ch.bagExpand = (ch.bagExpand || 0) + pouch;
  for (const [m, n] of Object.entries(mats)) addMaterial(ch, m, n);
  for (const [id, n] of Object.entries(shards)) addStack(ch, 'shards', id, n);
  return { ok: true, message: `開啟${GIFT.names[k]}：金幣 +${gold}`, gold, mats, shards, potions, cures, pouch, converted, tickets };
}

/**
 * 加入技能書碎片。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @param {number} [n=1] 數量（負數為扣除）。
 * @returns {boolean} 是否成功。
 */
export function addShard(ch, id, n = 1) {
  return addStack(ch, 'shards', id, n);
}

/**
 * 用 3 片同一本的技能書碎片合成 1 本完整的技能書。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function combineShards(ch, id) {
  const have = (ch.shards && ch.shards[id]) || 0;
  if (have < GIFT.shardNeed) return { ok: false, message: `碎片不足（需要 ${GIFT.shardNeed} 片，持有 ${have} 片）` };
  // 用完碎片會空出格子；新的技能書種類需要 1 格。
  const fresh = ch.skillBooks && ch.skillBooks[id] > 0 ? 0 : 1;
  const freed = have === GIFT.shardNeed ? 1 : 0;
  if (bagUsed(ch) - freed + fresh > bagLimit(ch)) return { ok: false, message: '背包已滿，無法放入技能書' };
  addShard(ch, id, -GIFT.shardNeed);
  addSkillBook(ch, id);
  return { ok: true, message: `合成技能書「${SKILLS[id].name}」，到倉庫學習` };
}

/**
 * 分解一件裝備會得到的材料（期望的數量；高一階材料依機率另外決定）。
 * @param {object} item 裝備。
 * @returns {{key: string, n: number, bonus: string | null}} 主要材料與數量、可能額外得到的高品質材料。
 */
export function salvageYield(item) {
  const r = Math.min(MATERIALS.length - 1, item.rarity);
  return {
    key: MATERIALS[r].key,
    n: 2 + Math.floor(item.level / 10) + item.enhance,
    bonus: r + 1 < MATERIALS.length ? MATERIALS[r + 1].key : null,
  };
}

/**
 * 分解背包中的裝備：得到同品質的材料，25% 機率多得 1 個高一階的材料；鑲嵌的寶石放回寶石袋。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 裝備 id。
 * @param {() => number} rng 亂數函式。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function salvage(ch, id, rng) {
  const idx = ch.bag.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '只能分解背包中的裝備，請先卸下' };
  const item = ch.bag[idx];
  const y = salvageYield(item);
  const bonus = y.bonus && rng() < CRAFT.bonus;
  // 空位檢查：拿掉這件會空出 1 格，新的材料種類各需要 1 格。
  const newStacks = [y.key, bonus ? y.bonus : null].filter((k) => k && !(ch.mats && ch.mats[k] > 0)).length;
  if (bagUsed(ch) - 1 + newStacks > bagLimit(ch)) return { ok: false, message: '背包已滿，無法放入材料' };
  ch.bag.splice(idx, 1);
  addMaterial(ch, y.key, y.n);
  if (bonus) addMaterial(ch, y.bonus, 1);
  const gems = item.gems || [];
  for (const key of gems) addGem(ch, key);
  const name = (k) => MATERIALS.find((m) => m.key === k).name;
  return {
    ok: true,
    message: `分解 ${item.name}：${name(y.key)} ×${y.n}${bonus ? `、${name(y.bonus)} ×1（高品質！）` : ''}${gems.length ? `，${gems.length} 顆寶石放回寶石袋` : ''}`,
  };
}

/**
 * 合成裝備的費用：同品質材料 12 個與金幣。
 * @param {object} ch 角色。
 * @param {number} tier 品質（0～3，與稀有度相同）。
 * @returns {{mat: string, n: number, gold: number}} 材料代碼、數量與金幣。
 */
export function craftCost(ch, tier) {
  return { mat: MATERIALS[tier].key, n: CRAFT.cost, gold: Math.round(CRAFT.gold * (tier + 1) * (1 + ch.level / 20)) };
}

/**
 * 用製作書與材料合成一件裝備：等級為角色等級，稀有度保證為所選品質；武器可以指定類型。
 * @param {object} ch 角色（會被修改）。
 * @param {string} slot 部位。
 * @param {number} tier 品質（0～3）。
 * @param {() => number} rng 亂數函式。
 * @param {string} [type] 武器類型（省略時隨機）。
 * @returns {{ok: boolean, message: string, item?: object}} 結果與合成的裝備。
 */
export function craftItem(ch, slot, tier, rng, type) {
  if (!(ch.books && ch.books[slot] > 0)) return { ok: false, message: `沒有${bookName(slot)}` };
  const cost = craftCost(ch, tier);
  const have = (ch.mats && ch.mats[cost.mat]) || 0;
  const matName = MATERIALS[tier].name;
  if (have < cost.n) return { ok: false, message: `${matName}不足（需要 ${cost.n} 個，持有 ${have} 個）` };
  if (ch.gold < cost.gold) return { ok: false, message: `金幣不足（需要 ${cost.gold}G）` };
  // 空位：用完最後一本書或材料時會空出格子，新的裝備需要 1 格。
  const freed = (ch.books[slot] === 1 ? 1 : 0) + (have === cost.n ? 1 : 0);
  if (bagUsed(ch) - freed + 1 > bagLimit(ch)) return { ok: false, message: '背包已滿，無法放入新裝備' };
  addBook(ch, slot, -1);
  addMaterial(ch, cost.mat, -cost.n);
  ch.gold -= cost.gold;
  const item = makeItem({ slot, cls: ch.cls, level: ch.level, rarity: tier, type }, rng);
  ch.bag.push(item);
  return { ok: true, message: `合成成功：${RARITIES[tier].name}・${item.name}`, item };
}

/**
 * 某件裝備預設要放進的裝備欄：飾品優先放空著的飾品欄，兩格都有時放飾品 1。
 * @param {object} ch 角色。
 * @param {object} item 裝備。
 * @returns {string} 裝備欄代碼。
 */
export function slotFor(ch, item) {
  const keys = EQUIP_SLOTS.filter((e) => e.slot === item.slot).map((e) => e.key);
  return keys.find((k) => !ch.equipped[k]) || keys[0];
}

/**
 * 穿上背包中的裝備（原本的裝備放回背包）。
 * 雙手武器佔用兩隻手：穿上雙手武器時副手自動卸下放回背包；裝備雙手武器時不能穿副手。
 * @param {object} ch 角色。
 * @param {string} id 裝備 id。
 * @param {string} [key] 指定的裝備欄（飾品可選飾品 1 或 2；省略時自動選擇）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function equip(ch, id, key) {
  const idx = ch.bag.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '找不到這件裝備' };
  const item = ch.bag[idx];
  const target = key || slotFor(ch, item);
  const def = EQUIP_SLOTS.find((e) => e.key === target);
  if (!def || def.slot !== item.slot) return { ok: false, message: `${item.name}不能裝在這個欄位` };
  if (item.slot === 'weapon' && !canWield(ch, item)) return { ok: false, message: `${item.name}是${weaponOwner(item)}的武器，${CLASSES[ch.cls].name}不能裝備` };
  if (item.slot === 'offhand' && weaponHands(ch.equipped.weapon) === 2) return { ok: false, message: `${ch.equipped.weapon.name}是雙手武器，請先換成單手武器才能裝備副手` };
  const dropOff = item.slot === 'weapon' && weaponHands(item) === 2 ? ch.equipped.offhand : null;
  // 背包空間：拿出這件、放回原本的裝備，若要卸下副手再多 1 格。
  if (dropOff && bagUsed(ch) - 1 + (ch.equipped[target] ? 1 : 0) + 1 > bagLimit(ch)) return { ok: false, message: '背包已滿，雙手武器需要先卸下副手' };
  ch.bag.splice(idx, 1);
  const old = ch.equipped[target];
  if (old) ch.bag.splice(idx, 0, old);
  ch.equipped[target] = item;
  if (dropOff) {
    ch.equipped.offhand = null;
    ch.bag.push(dropOff);
    return { ok: true, message: `${def.name}裝備 ${item.name}（雙手武器，${dropOff.name}卸下放回背包）` };
  }
  return { ok: true, message: `${def.name}裝備 ${item.name}` };
}

/**
 * 角色目前的職稱（依轉職次數）。
 * @param {object} ch 角色。
 * @returns {string} 例如「騎士」。
 */
export function classTitle(ch) {
  return REBIRTH.titles[ch.cls][Math.min(REBIRTH.max, ch.rebirth || 0)];
}

/**
 * 判斷角色現在能不能轉職。
 * @param {object} ch 角色。
 * @returns {{ok: boolean, message: string}} 可以時 ok 為 true；不行時附上原因。
 */
export function canRebirth(ch) {
  if ((ch.rebirth || 0) >= REBIRTH.max) return { ok: false, message: `已完成全部 ${REBIRTH.max} 次轉職` };
  const cap = levelCap(ch.rebirth || 0);
  if (ch.level < cap) return { ok: false, message: `Lv.${cap} 才能轉職` };
  return { ok: true, message: '' };
}

/**
 * 轉職：回到 Lv.1、經驗值歸零、轉職次數 +1；裝備、背包、金幣、技能與地城進度全部保留。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function rebirth(ch) {
  const check = canRebirth(ch);
  if (!check.ok) return check;
  ch.rebirth = (ch.rebirth || 0) + 1;
  ch.level = 1;
  ch.xp = 0;
  ch.stats.rebirths = (ch.stats.rebirths || 0) + 1;
  return { ok: true, message: `轉職為${classTitle(ch)}！回到 Lv.1，起始能力提升` };
}

/**
 * 判斷角色的職業能不能使用這把武器（非武器一律可以）。
 * @param {object} ch 角色。
 * @param {object} item 裝備。
 * @returns {boolean} 可以使用時為 true。
 */
export function canWield(ch, item) {
  return item.slot !== 'weapon' || CLASSES[ch.cls].weapon.includes(item.type);
}

/**
 * 武器屬於哪個職業（顯示用）。
 * @param {object} item 武器。
 * @returns {string} 職業名稱，例如「戰士」。
 */
export function weaponOwner(item) {
  const cls = Object.values(CLASSES).find((c) => c.weapon.includes(item.type));
  return cls ? cls.name : '其他職業';
}

/**
 * 建立空的共用倉庫。
 * @returns {{items: object[], gold: number}} 共用倉庫。
 */
export function newShared() {
  return { items: [], gold: 0 };
}

/**
 * 把背包中的裝備存入共用倉庫（裝備中的道具須先卸下）。
 * @param {object} ch 角色（會被修改）。
 * @param {object} shared 共用倉庫（會被修改）。
 * @param {string} id 裝備 id。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function depositItem(ch, shared, id) {
  const idx = ch.bag.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '只能存入背包中的裝備，請先卸下' };
  if (shared.items.length >= SHARED_SLOTS) return { ok: false, message: `共用倉庫已滿（${SHARED_SLOTS} 格）` };
  const [item] = ch.bag.splice(idx, 1);
  shared.items.push(item);
  return { ok: true, message: `${item.name} 存入共用倉庫` };
}

/**
 * 從共用倉庫取出裝備放進角色的背包。
 * @param {object} ch 角色（會被修改）。
 * @param {object} shared 共用倉庫（會被修改）。
 * @param {string} id 裝備 id。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function withdrawItem(ch, shared, id) {
  const idx = shared.items.findIndex((i) => i.id === id);
  if (idx < 0) return { ok: false, message: '共用倉庫裡沒有這件裝備' };
  if (bagUsed(ch) >= bagLimit(ch)) return { ok: false, message: `背包已滿（${bagLimit(ch)} 格）` };
  const [item] = shared.items.splice(idx, 1);
  ch.bag.push(item);
  const note = canWield(ch, item) ? '' : `（${weaponOwner(item)}的武器，${CLASSES[ch.cls].name}不能裝備）`;
  return { ok: true, message: `取出 ${item.name}${note}` };
}

/**
 * 存入金幣到共用倉庫。
 * @param {object} ch 角色（會被修改）。
 * @param {object} shared 共用倉庫（會被修改）。
 * @param {number | 'all'} amount 數量或全部。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function depositGold(ch, shared, amount) {
  const n = amount === 'all' ? ch.gold : Math.min(amount, ch.gold);
  if (!(n > 0)) return { ok: false, message: '身上沒有金幣' };
  ch.gold -= n;
  shared.gold += n;
  return { ok: true, message: `存入 ${n}G（共用 ${shared.gold}G）` };
}

/**
 * 從共用倉庫取出金幣。
 * @param {object} ch 角色（會被修改）。
 * @param {object} shared 共用倉庫（會被修改）。
 * @param {number | 'all'} amount 數量或全部。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function withdrawGold(ch, shared, amount) {
  const n = amount === 'all' ? shared.gold : Math.min(amount, shared.gold);
  if (!(n > 0)) return { ok: false, message: '共用倉庫沒有金幣' };
  shared.gold -= n;
  ch.gold += n;
  return { ok: true, message: `取出 ${n}G（共用剩 ${shared.gold}G）` };
}

/**
 * 商店已賣給這個角色的背包擴充袋數量（舊存檔沒有紀錄時，以已擴充的格數加上持有的數量估計，最多 5 個）。
 * @param {object} ch 角色。
 * @returns {number} 個數。
 */
export function pouchesBought(ch) {
  if (Number.isInteger(ch.pouchBought)) return ch.pouchBought;
  return Math.min(BAG_EXPAND.shopMax, (bagLimit(ch) - LIMITS.bag) / BAG_EXPAND.step + (ch.bagExpand || 0));
}

/**
 * 背包擴充袋的售價：依商店已賣出的數量倍增（200、400、800、1,600、3,200G）；
 * 商店已賣滿 5 個，或背包加上持有的擴充袋已足夠到 100 格時不再販售。
 * @param {object} ch 角色。
 * @returns {number} 金幣；不再販售時為 Infinity。
 */
export function bagExpandPrice(ch) {
  const bought = pouchesBought(ch);
  if (bought >= BAG_EXPAND.shopMax) return Infinity;
  if (bagLimit(ch) + (ch.bagExpand || 0) * BAG_EXPAND.step >= BAG_EXPAND.max) return Infinity;
  return BAG_EXPAND.basePrice * 2 ** bought;
}

/**
 * 購買背包擴充袋（到倉庫使用）。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyBagExpand(ch) {
  const price = bagExpandPrice(ch);
  if (price === Infinity) {
    return { ok: false, message: pouchesBought(ch) >= BAG_EXPAND.shopMax ? `商店的背包擴充袋已賣完（每個角色 ${BAG_EXPAND.shopMax} 個），之後要打怪取得` : `背包最多擴充到 ${BAG_EXPAND.max} 格` };
  }
  if (ch.gold < price) return { ok: false, message: `金幣不足（需要 ${price}G）` };
  ch.pouchBought = pouchesBought(ch) + 1;
  ch.gold -= price;
  ch.bagExpand = (ch.bagExpand || 0) + 1;
  return { ok: true, message: '買下背包擴充袋，到「倉庫」使用' };
}

/**
 * 使用背包擴充袋：背包上限 +5 格（最多 100 格）。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function useBagExpand(ch) {
  if (!(ch.bagExpand > 0)) return { ok: false, message: '沒有背包擴充袋' };
  if (bagLimit(ch) >= BAG_EXPAND.max) return { ok: false, message: `背包已經是上限 ${BAG_EXPAND.max} 格` };
  ch.bagExpand--;
  ch.bagSize = Math.min(BAG_EXPAND.max, bagLimit(ch) + BAG_EXPAND.step);
  return { ok: true, message: `背包擴充為 ${ch.bagSize} 格` };
}

/**
 * 卸下裝備放回背包。
 * @param {object} ch 角色。
 * @param {string} slot 裝備欄代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function unequip(ch, slot) {
  const item = ch.equipped[slot];
  if (!item) return { ok: false, message: '這個部位沒有裝備' };
  if (bagUsed(ch) >= bagLimit(ch)) return { ok: false, message: '背包已滿，無法卸下' };
  ch.equipped[slot] = null;
  ch.bag.push(item);
  return { ok: true, message: `卸下 ${item.name}` };
}

/**
 * 在鐵匠強化裝備：先扣金幣，+6 起可能失敗（失敗不降級）。
 * @param {object} ch 角色。
 * @param {string} id 裝備 id（背包或裝備欄）。
 * @param {() => number} rng 亂數函式。
 * @returns {{ok: boolean, success?: boolean, message: string}} 結果。
 */
export function enhance(ch, id, rng) {
  const found = findItem(ch, id);
  if (!found) return { ok: false, message: '找不到這件裝備' };
  const item = found.item;
  if (item.enhance >= ENHANCE.max) return { ok: false, message: `已強化到上限 +${ENHANCE.max}` };
  const cost = enhanceCost(item);
  if (ch.gold < cost) return { ok: false, message: `金幣不足（需要 ${cost}G）` };
  ch.gold -= cost;
  const success = tryEnhance(item, rng);
  return { ok: true, success, message: success ? `強化成功：${item.name} +${item.enhance}` : `強化失敗（花費 ${cost}G，等級不變）` };
}

/**
 * 強化成功率（顯示用）。
 * @param {object} item 裝備。
 * @returns {number} 0～1。
 */
export function enhanceChance(item) {
  return 1 - (ENHANCE.failRate[item.enhance + 1] || 0);
}

/**
 * 判斷區域是否已解鎖。
 * @param {object} ch 角色。
 * @param {string} area 區域代碼。
 * @returns {boolean} 已解鎖時為 true。
 */
export function areaUnlocked(ch, area) {
  return Number.isInteger(ch.unlocked[area]) && ch.unlocked[area] >= 1;
}

/**
 * 區域可挑戰的最大深度。
 * @param {object} ch 角色。
 * @param {string} area 區域代碼。
 * @returns {number} 深度（未解鎖為 0）。
 */
export function maxDepth(ch, area) {
  return areaUnlocked(ch, area) ? ch.unlocked[area] : 0;
}

/**
 * 擊敗 Boss 後解鎖：同區域下一個深度（最深 5），第一次擊敗時解鎖下一個區域。
 * @param {object} ch 角色（會被修改）。
 * @param {string} area 區域代碼。
 * @param {number} depth 深度。
 * @returns {string[]} 新解鎖的說明。
 */
export function unlockAfterBoss(ch, area, depth) {
  const out = [];
  const cap = AREAS[area].maxDepth || MAX_DEPTH;
  if (depth + 1 <= cap && maxDepth(ch, area) < depth + 1) {
    ch.unlocked[area] = depth + 1;
    out.push(`${AREAS[area].name} 深度 ${depth + 1}`);
  }
  const next = AREA_KEYS[AREA_KEYS.indexOf(area) + 1];
  if (next && !areaUnlocked(ch, next)) {
    ch.unlocked[next] = 1;
    out.push(AREAS[next].name);
  }
  return out;
}

/**
 * 推薦等級的說明文字。
 * @param {string} area 區域代碼。
 * @param {number} depth 深度。
 * @returns {string} 例如「地城 Lv.4」。
 */
export function depthLabel(area, depth) {
  return `地城 Lv.${Math.round(dungeonLevel(area, depth, 0))}～${Math.round(dungeonLevel(area, depth, 3))}`;
}

/**
 * 開始探險前，從角色身上取出要攜帶的藥水、淨化藥水與卷軸。
 * @param {object} ch 角色（會被修改）。
 * @returns {{potions: number, scroll: number, cures: number}} 攜帶的數量。
 */
export function packForRun(ch) {
  const potions = Math.min(LIMITS.potions, ch.potions);
  const scroll = Math.min(1, ch.scroll);
  const cures = Math.min(LIMITS.cures, ch.cures || 0);
  ch.potions -= potions;
  ch.scroll -= scroll;
  ch.cures = (ch.cures || 0) - cures;
  return { potions, scroll, cures };
}

/**
 * 結算探險：倒下時失去一半本趟金幣；剩下的藥水與卷軸放回角色；更新角色統計與解鎖。
 * @param {object} ch 角色（會被修改）。
 * @param {object} world 探險。
 * @param {'victory' | 'dead' | 'recall' | 'abandon'} result 結果。
 * @returns {{result: string, area: string, depth: number, ms: number, kills: number, damageTaken: number, xp: number, gold: number, goldLost: number, items: object[], unlocks: string[], levels: number}} 結算內容。
 */
export function settleRun(ch, world, result) {
  const loot = world.loot;
  let goldLost = 0;
  if (result === 'dead' || result === 'abandon') {
    goldLost = Math.floor(loot.gold / 2);
    ch.gold = Math.max(0, ch.gold - goldLost);
  }
  ch.potions = Math.min(LIMITS.potionHold, ch.potions + world.player.potions);
  ch.scroll = Math.min(1, ch.scroll + world.player.scroll);
  ch.cures = Math.min(LIMITS.cureHold, (ch.cures || 0) + (world.player.cures || 0));
  const ms = Math.round(world.elapsed * 1000);
  const s = ch.stats;
  s.playMs += ms;
  s.kills += loot.kills;
  s.maxHit = Math.max(s.maxHit, loot.maxHit);
  s.legends += loot.items.filter((i) => i.rarity === RARITIES.length - 1).length;
  s.runs++;
  if (result === 'dead' || result === 'abandon') s.deaths++;
  const unlocks = result === 'victory' ? unlockAfterBoss(ch, world.area, world.depth) : [];
  if (result === 'victory') {
    // 記錄這一關的破關次數（滿 5 次後 Boss 可能進化）。
    const key = world.stageKey();
    ch.clears = ch.clears || {};
    ch.clears[key] = (ch.clears[key] || 0) + 1;
  }
  return {
    result, area: world.area, depth: world.depth, ms, kills: loot.kills, damageTaken: loot.damageTaken, xp: loot.xp,
    gold: loot.gold - goldLost, goldLost, items: loot.items, gems: loot.gems || [], unlocks, levels: loot.levelsGained, potionsUsed: loot.potionsUsed,
    evolved: !!world.evolvedDefeated, clears: (ch.clears && ch.clears[world.stageKey()]) || 0,
  };
}

/**
 * 背包中的裝備是否比目前穿的更好：換上後（飾品比較兩個欄位中較好的結果）戰力提高。
 * 不能裝備的（別的職業的武器、拿雙手武器時的副手）不算。
 * @param {object} ch 角色。
 * @param {object} item 背包中的裝備。
 * @returns {boolean} 是否為升級。
 */
export function isUpgrade(ch, item) {
  if (item.slot === 'weapon' && !canWield(ch, item)) return false;
  if (item.slot === 'offhand' && weaponHands(ch.equipped.weapon) === 2) return false;
  const score = (eq) => powerScore(characterStats(ch.cls, ch.level, Object.values(eq), ch.rebirth || 0, passiveBonus({ ...ch, equipped: eq })));
  const now = score(ch.equipped);
  return EQUIP_SLOTS.filter((e) => e.slot === item.slot).some((e) => {
    const eq = { ...ch.equipped, [e.key]: item };
    if (item.slot === 'weapon' && weaponHands(item) === 2) eq.offhand = null;
    return score(eq) > now;
  });
}

/**
 * 批次處理的對象：背包中稀有度不超過 maxRarity 的裝備，排除比目前穿的更好的、強化過的。
 * @param {object} ch 角色。
 * @param {number} maxRarity 最高稀有度（0 普通、1 精良）。
 * @returns {object[]} 裝備。
 */
export function bulkTargets(ch, maxRarity) {
  return ch.bag.filter((it) => it.rarity <= maxRarity && !(it.enhance > 0) && !isUpgrade(ch, it));
}

/**
 * 一次賣出多件背包中的裝備（鑲嵌的寶石自動放回寶石袋）。
 * @param {object} ch 角色（會被修改）。
 * @param {string[]} ids 裝備 id。
 * @returns {{ok: boolean, message: string, count: number, gold: number}} 結果。
 */
export function sellMany(ch, ids) {
  let count = 0;
  let gold = 0;
  let gems = 0;
  for (const id of ids) {
    const it = ch.bag.find((i) => i.id === id);
    if (!it) continue;
    const price = sellPrice(it);
    gems += (it.gems || []).length;
    if (!sellItem(ch, id).ok) continue;
    count++;
    gold += price;
  }
  return { ok: count > 0, count, gold, message: count ? `賣出 ${count} 件裝備（+${gold}G）${gems ? `，${gems} 顆寶石放回寶石袋` : ''}` : '沒有可以賣出的裝備' };
}

/**
 * 一次分解多件背包中的裝備；背包放不下新的材料種類時停止。
 * @param {object} ch 角色（會被修改）。
 * @param {string[]} ids 裝備 id。
 * @param {() => number} rng 亂數函式。
 * @returns {{ok: boolean, message: string, count: number, mats: Record<string, number>}} 結果與得到的材料。
 */
export function salvageMany(ch, ids, rng) {
  let count = 0;
  const before = { ...(ch.mats || {}) };
  let stopped = '';
  for (const id of ids) {
    const r = salvage(ch, id, rng);
    if (!r.ok) {
      stopped = r.message;
      break;
    }
    count++;
  }
  const mats = {};
  for (const [k, n] of Object.entries(ch.mats || {})) if (n > (before[k] || 0)) mats[k] = n - (before[k] || 0);
  const list = Object.entries(mats).map(([k, n]) => `${MATERIALS.find((m) => m.key === k).name} ×${n}`).join('、');
  return { ok: count > 0, count, mats, message: count ? `分解 ${count} 件裝備：${list}${stopped ? `（${stopped}，其餘沒有分解）` : ''}` : stopped || '沒有可以分解的裝備' };
}

/**
 * 一次合成寶石到能到的最高等級：由低到高，每 3 顆同種同級合成 1 顆高一級（可以連續往上合成），金幣不足時停止。
 * @param {object} ch 角色（會被修改）。
 * @param {string} [kind] 只合成這一種寶石（省略時全部持續型寶石）。
 * @returns {{ok: boolean, message: string, fused: number, cost: number, made: Record<string, number>}} 合成次數、花費與做出的寶石（最後持有的增加量）。
 */
export function fuseAll(ch, kind) {
  const kinds = Object.keys(GEMS).filter((k) => !GEMS[k].active && (!kind || k === kind));
  const before = { ...(ch.gems || {}) };
  let fused = 0;
  let cost = 0;
  let short = false;
  for (const k of kinds) {
    for (let tier = 1; tier < GEM_RULES.max; tier++) {
      const key = `${k}-${tier}`;
      while (((ch.gems && ch.gems[key]) || 0) >= GEM_RULES.fuse) {
        const price = GEM_RULES.fuseCost[tier];
        if (ch.gold < price) {
          short = true;
          break;
        }
        fuseGem(ch, key);
        fused++;
        cost += price;
      }
    }
  }
  const made = {};
  for (const [key, n] of Object.entries(ch.gems || {})) if (n > (before[key] || 0)) made[key] = n - (before[key] || 0);
  const list = Object.entries(made).map(([key, n]) => `${gemName(key)} ×${n}`).join('、');
  return {
    ok: fused > 0, fused, cost, made,
    message: fused ? `合成 ${fused} 次（-${cost}G）：${list}${short ? '（金幣不足，沒有全部合成）' : ''}` : short ? '金幣不足，無法合成' : '沒有可以合成的寶石（需要 3 顆同種同級）',
  };
}
