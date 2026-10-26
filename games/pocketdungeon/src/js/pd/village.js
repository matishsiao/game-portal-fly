// 村莊規則（純邏輯）：商店刷新與買賣、裝備穿脫、強化、區域與深度解鎖、探險開始與結算。
// 所有函式直接修改傳入的角色資料，回傳結果與要顯示的訊息。

import { AREAS, AREA_KEYS, LIMITS, MAX_DEPTH, RARITIES, ENHANCE, BAG_EXPAND, EQUIP_SLOTS, SHARED_SLOTS, CLASSES } from './data.js';
import { makeItem, itemValue, sellPrice, enhanceCost, tryEnhance, rollRarity, dungeonLevel } from './rules.js';

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
 * 刷新商店的 8 件裝備（每次返回村莊時呼叫）：武器、鎧甲、飾品各 2 件，頭盔、鞋子各 1 件，以普通與精良為主。
 * @param {object} ch 角色（會被修改）。
 * @param {() => number} rng 亂數函式。
 */
export function refreshShop(ch, rng) {
  const level = shopLevel(ch);
  const slots = ['weapon', 'weapon', 'helmet', 'armor', 'armor', 'boots', 'accessory', 'accessory'];
  ch.shop = slots.map((slot) => {
    const rarity = rollRarity([55, 40, 5, 0], rng);
    const item = makeItem({ slot, cls: ch.cls, level, rarity }, rng);
    return { item, price: shopPrice(item) };
  });
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
  if (ch.bag.length >= bagLimit(ch)) return { ok: false, message: `背包已滿（${bagLimit(ch)} 件），請先賣出裝備或使用背包擴充袋` };
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
  if (ch.potions >= LIMITS.potions) return { ok: false, message: `藥水最多持有 ${LIMITS.potions} 瓶` };
  if (ch.gold < LIMITS.potionPrice) return { ok: false, message: `金幣不足（需要 ${LIMITS.potionPrice}G）` };
  ch.gold -= LIMITS.potionPrice;
  ch.potions++;
  return { ok: true, message: `買下回復藥水（持有 ${ch.potions} 瓶）` };
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
  return { ok: true, message: `賣出 ${item.name}（+${price}G）` };
}

/**
 * 背包目前的上限（初始 20 格，使用背包擴充袋後增加）。
 * @param {object} ch 角色。
 * @returns {number} 格數。
 */
export function bagLimit(ch) {
  return Math.max(LIMITS.bag, ch.bagSize || LIMITS.bag);
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
  ch.bag.splice(idx, 1);
  const old = ch.equipped[target];
  if (old) ch.bag.splice(idx, 0, old);
  ch.equipped[target] = item;
  return { ok: true, message: `${def.name}裝備 ${item.name}` };
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
  if (ch.bag.length >= bagLimit(ch)) return { ok: false, message: `背包已滿（${bagLimit(ch)} 件）` };
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
 * 背包擴充袋的售價：依已擴充與持有的數量倍增。
 * @param {object} ch 角色。
 * @returns {number} 金幣；已達上限時為 Infinity。
 */
export function bagExpandPrice(ch) {
  const used = (bagLimit(ch) - LIMITS.bag) / BAG_EXPAND.step + (ch.bagExpand || 0);
  if (bagLimit(ch) + (ch.bagExpand || 0) * BAG_EXPAND.step >= BAG_EXPAND.max) return Infinity;
  return BAG_EXPAND.basePrice * 2 ** used;
}

/**
 * 購買背包擴充袋（放進道具欄，到倉庫使用）。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function buyBagExpand(ch) {
  const price = bagExpandPrice(ch);
  if (price === Infinity) return { ok: false, message: `背包最多擴充到 ${BAG_EXPAND.max} 格` };
  if (ch.gold < price) return { ok: false, message: `金幣不足（需要 ${price}G）` };
  ch.gold -= price;
  ch.bagExpand = (ch.bagExpand || 0) + 1;
  return { ok: true, message: '買下背包擴充袋，到「倉庫」使用' };
}

/**
 * 使用背包擴充袋：背包上限 +5 格（最多 40 格）。
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
  if (ch.bag.length >= bagLimit(ch)) return { ok: false, message: '背包已滿，無法卸下' };
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
 * 擊敗 Boss 後解鎖：同區域下一個深度（深淵無上限），第一次擊敗時解鎖下一個區域。
 * @param {object} ch 角色（會被修改）。
 * @param {string} area 區域代碼。
 * @param {number} depth 深度。
 * @returns {string[]} 新解鎖的說明。
 */
export function unlockAfterBoss(ch, area, depth) {
  const out = [];
  const cap = area === 'expert' ? Infinity : MAX_DEPTH;
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
 * 開始探險前，從角色身上取出要攜帶的藥水與卷軸。
 * @param {object} ch 角色（會被修改）。
 * @returns {{potions: number, scroll: number}} 攜帶的數量。
 */
export function packForRun(ch) {
  const potions = Math.min(LIMITS.potions, ch.potions);
  const scroll = Math.min(1, ch.scroll);
  ch.potions -= potions;
  ch.scroll -= scroll;
  return { potions, scroll };
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
  ch.potions = Math.min(LIMITS.potions, ch.potions + world.player.potions);
  ch.scroll = Math.min(1, ch.scroll + world.player.scroll);
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
    gold: loot.gold - goldLost, goldLost, items: loot.items, unlocks, levels: loot.levelsGained, potionsUsed: loot.potionsUsed,
    evolved: !!world.bossDefeated && !!(world.ch.evolved && world.ch.evolved[world.stageKey()]), clears: (ch.clears && ch.clears[world.stageKey()]) || 0,
  };
}
