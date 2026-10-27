// 成長與裝備規則（純邏輯）：亂數、經驗曲線、角色屬性、傷害公式、怪物強度、裝備產生與強化、獎勵。

import { CLASSES, MAX_LEVEL, MAX_DUNGEON_LEVEL, AREAS, MONSTERS, BOSSES, RARITIES, ACCESSORY_STATS, ITEM_NAMES, ENHANCE, EVOLVE, REBIRTH, STATUS, GEMS, GEM_RULES, WEAPON_HANDS, ONE_HAND_ATK } from './data.js';

/**
 * 建立可重現的亂數產生器（mulberry32）。
 * @param {number} seed 種子。
 * @returns {() => number} 回傳 [0, 1) 的亂數函式。
 */
export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 從陣列隨機取一個元素。
 * @template T
 * @param {T[]} arr 陣列。
 * @param {() => number} rng 亂數函式。
 * @returns {T} 元素。
 */
export function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * 等級上限：未轉職 Lv.30，每轉職一次 +10。
 * @param {number} [rebirth=0] 轉職次數。
 * @returns {number} 等級上限。
 */
export function levelCap(rebirth = 0) {
  return MAX_LEVEL + REBIRTH.capStep * rebirth;
}

/**
 * 升到下一級所需的經驗值。
 * @param {number} level 目前等級。
 * @param {number} [cap=MAX_LEVEL] 等級上限。
 * @returns {number} 所需經驗值；已達等級上限時為 Infinity。
 */
export function xpToNext(level, cap = MAX_LEVEL) {
  return level >= cap ? Infinity : Math.round(20 * level ** 1.6);
}

/**
 * 加入經驗值並處理升級（可能連升數級），等級上限依轉職次數而定。
 * @param {{level: number, xp: number, rebirth?: number}} ch 角色（會被修改）。
 * @param {number} amount 經驗值。
 * @returns {number} 這次升了幾級。
 */
export function gainXp(ch, amount) {
  const cap = levelCap(ch.rebirth || 0);
  if (ch.level >= cap) return 0;
  ch.xp += Math.max(0, Math.round(amount));
  let ups = 0;
  while (ch.level < cap && ch.xp >= xpToNext(ch.level, cap)) {
    ch.xp -= xpToNext(ch.level, cap);
    ch.level++;
    ups++;
  }
  if (ch.level >= cap) ch.xp = 0;
  return ups;
}

/**
 * 某職業在轉職 n 次後的起始屬性：每轉職一次，HP、攻擊、防禦變為上一階滿級（該階的等級上限、不含裝備）的 1/2；速度不變。
 * @param {string} cls 職業代碼。
 * @param {number} [rebirth=0] 轉職次數（0～3）。
 * @returns {{hp: number, atk: number, def: number, spd: number}} 起始屬性。
 */
export function rebirthBase(cls, rebirth = 0) {
  const c = CLASSES[cls];
  const base = { ...c.base };
  for (let n = 0; n < rebirth; n++) {
    for (const k of REBIRTH.halve) base[k] = Math.round(((base[k] + c.growth[k] * (levelCap(n) - 1)) / 2) * 10) / 10;
  }
  return base;
}

/**
 * 戰力：HP ÷ 4 ＋ 攻擊 × 3 ＋ 防禦 × 2 ＋ 速度 ÷ 2（角色分頁與「比較好的裝備」判斷共用）。
 * @param {{hp: number, atk: number, def: number, spd: number}} s 屬性。
 * @returns {number} 戰力。
 */
export function powerScore(s) {
  return Math.round(s.hp / 4 + s.atk * 3 + s.def * 2 + s.spd / 2);
}

/**
 * 計算角色在某等級、穿戴某些裝備時的屬性。
 * @param {string} cls 職業代碼。
 * @param {number} level 等級。
 * @param {object[]} [equipped=[]] 穿戴中的裝備。
 * @param {number} [rebirth=0] 轉職次數（決定起始屬性）。
 * @param {{hpPct?: number, atkPct?: number, defPct?: number, spd?: number}} [passive={}] 被動技能的加成（百分比與飾品、寶石相加）。
 * @returns {{hp: number, atk: number, def: number, spd: number, goldPct: number, xpPct: number, leech: number, actives: string[]}} 屬性（四捨五入到整數）、吸血（%）與主動寶石。
 */
export function characterStats(cls, level, equipped = [], rebirth = 0, passive = {}) {
  const c = CLASSES[cls];
  const b = rebirthBase(cls, rebirth);
  const lv = level - 1;
  let hp = b.hp + c.growth.hp * lv;
  let atk = b.atk + c.growth.atk * lv;
  let def = b.def + c.growth.def * lv;
  let spd = b.spd + c.growth.spd * lv + (passive.spd || 0);
  const pct = { atkPct: 0, defPct: 0, hpPct: 0, goldPct: 0, xpPct: 0 };
  for (const item of equipped) {
    if (!item) continue;
    const s = itemStats(item);
    hp += s.hp || 0;
    atk += s.atk || 0;
    def += s.def || 0;
    spd += s.spd || 0;
    for (const k of Object.keys(pct)) pct[k] += s[k] || 0;
  }
  const gem = gemBonus(equipped);
  return {
    hp: Math.round(hp * (1 + (pct.hpPct + gem.hp + (passive.hpPct || 0)) / 100)),
    atk: Math.round(atk * (1 + (pct.atkPct + gem.atk + (passive.atkPct || 0)) / 100)),
    def: Math.round(def * (1 + (pct.defPct + gem.def + (passive.defPct || 0)) / 100)),
    spd: Math.round(spd * (1 + gem.spd / 100)),
    goldPct: pct.goldPct,
    xpPct: pct.xpPct,
    leech: Math.min(GEM_RULES.leechCap, gem.leech),
    actives: gem.actives,
  };
}

/**
 * 武器佔用的手數（非武器為 0）。
 * @param {object} item 裝備。
 * @returns {number} 0、1 或 2。
 */
export function weaponHands(item) {
  return item && item.slot === 'weapon' ? WEAPON_HANDS[item.type] || 2 : 0;
}

/**
 * 寶石代碼的組成：種類與等級，例如「atk-2」為普通的紅寶石。
 * @param {string} key 寶石代碼。
 * @returns {{kind: string, tier: number} | null} 種類與等級；格式不合時為 null。
 */
export function parseGem(key) {
  const m = /^([a-z]+)-([1-5])$/.exec(String(key));
  if (!m || !GEMS[m[1]]) return null;
  const tier = Number(m[2]);
  if (GEMS[m[1]].active && tier !== 1) return null;
  return { kind: m[1], tier };
}

/**
 * 寶石的顯示名稱，例如「無瑕的紅寶石」；主動寶石沒有等級。
 * @param {string} key 寶石代碼。
 * @returns {string} 名稱。
 */
export function gemName(key) {
  const g = parseGem(key);
  if (!g) return '未知的寶石';
  return GEMS[g.kind].active ? GEMS[g.kind].name : `${GEM_RULES.tiers[g.tier - 1]}的${GEMS[g.kind].name}`;
}

/**
 * 寶石效果的說明，例如「攻擊 +10%」或「血量護盾（按鈕使用）」。
 * @param {string} key 寶石代碼。
 * @returns {string} 說明。
 */
export function gemEffect(key) {
  const g = parseGem(key);
  if (!g) return '';
  const d = GEMS[g.kind];
  if (g.kind === 'shield') return `${d.label}：護盾量為最大 HP 的 ${Math.round(d.pct * 100)}%，持續 ${d.dur} 秒，冷卻 ${d.cd} 秒`;
  if (g.kind === 'ward') return `${d.label}：${d.dur} 秒內不受異常狀態影響，冷卻 ${d.cd} 秒`;
  return `${d.stat} +${d.values[g.tier - 1]}%${g.kind === 'leech' ? '（造成傷害的比例回復 HP）' : ''}`;
}

/**
 * 裝備的孔數：普通與精良 1 孔，稀有與傳說 2 孔。
 * @param {object} item 裝備。
 * @returns {number} 孔數。
 */
export function socketCount(item) {
  return item.rarity >= 2 ? 2 : 1;
}

/**
 * 穿戴中裝備的寶石加成：持續型寶石的百分比加總，以及主動寶石的種類（同種只算一個，最多 2 個）。
 * @param {object[]} equipped 穿戴中的裝備。
 * @returns {{atk: number, hp: number, def: number, spd: number, leech: number, actives: string[]}} 加成（%）與主動寶石。
 */
export function gemBonus(equipped) {
  const out = { atk: 0, hp: 0, def: 0, spd: 0, leech: 0, actives: [] };
  for (const item of equipped) {
    if (!item || !Array.isArray(item.gems)) continue;
    for (const key of item.gems) {
      const g = parseGem(key);
      if (!g) continue;
      if (GEMS[g.kind].active) {
        if (!out.actives.includes(g.kind) && out.actives.length < GEM_RULES.actives) out.actives.push(g.kind);
      } else out[g.kind] += GEMS[g.kind].values[g.tier - 1];
    }
  }
  // 按鈕順序固定：血量護盾在前。
  out.actives.sort((a, b) => Object.keys(GEMS).indexOf(a) - Object.keys(GEMS).indexOf(b));
  return out;
}

/**
 * 隨機決定掉落的寶石：主動寶石 6%；持續型寶石的等級依地城等級，愈深愈容易出現 2、3 級。
 * @param {number} level 地城等級。
 * @param {() => number} rng 亂數函式。
 * @param {number} [bonus=0] 等級加成（Boss、進化 Boss 用）。
 * @returns {string} 寶石代碼。
 */
export function rollGem(level, rng, bonus = 0) {
  if (rng() < GEM_RULES.activeChance) return rng() < 0.5 ? 'shield-1' : 'ward-1';
  const kinds = Object.keys(GEMS).filter((k) => !GEMS[k].active);
  const kind = pick(kinds, rng);
  const r = rng();
  const t3 = Math.min(0.15, Math.max(0, (level - 25) / 100));
  const t2 = Math.min(0.45, Math.max(0.05, level / 80));
  const tier = Math.min(GEM_RULES.max, (r < t3 ? 3 : r < t3 + t2 ? 2 : 1) + bonus);
  return `${kind}-${tier}`;
}

/**
 * 武器附帶的異常狀態說明，例如「15% 機率中毒」。
 * @param {[string, number] | undefined} status 狀態與機率。
 * @returns {string} 說明；沒有時為空字串。
 */
export function statusText(status) {
  if (!status) return '';
  const [kind, chance] = status;
  return `${chance >= 1 ? '' : `${Math.round(chance * 100)}% 機率`}使敵人${STATUS[kind].name}`;
}

/**
 * 依速度計算移動速度與攻擊間隔：速度 100 時每秒 4.5 格、間隔 0.45 秒；每 +10 移動 +5%、間隔 −3%（下限 0.25 秒）。
 * @param {number} spd 速度屬性。
 * @returns {{move: number, interval: number}} 移動速度（格／秒）與攻擊間隔（秒）。
 */
export function speedProfile(spd) {
  const steps = (spd - 100) / 10;
  return { move: 4.5 * (1 + 0.05 * steps), interval: Math.max(0.25, 0.45 * (1 - 0.03 * steps)) };
}

/**
 * 傷害公式：max(1, round(攻擊 × 招式倍率 × 50 ÷ (50 + 防禦) × 浮動))，浮動為 0.9～1.1。
 * @param {number} atk 攻擊方的攻擊。
 * @param {number} def 防守方的防禦。
 * @param {number} [mult=1] 招式倍率。
 * @param {number} [roll=0.5] 0～1 的亂數，決定浮動。
 * @returns {number} 傷害。
 */
export function damage(atk, def, mult = 1, roll = 0.5) {
  return Math.max(1, Math.round(atk * mult * (50 / (50 + def)) * (0.9 + 0.2 * roll)));
}

/**
 * 計算某區域、深度與樓層的地城等級（最高 Lv.60）。
 * @param {string} area 區域代碼。
 * @param {number} depth 深度（1 起算）。
 * @param {number} floor 樓層（0 起算，Boss 層為 FLOORS）。
 * @returns {number} 地城等級。
 */
export function dungeonLevel(area, depth, floor) {
  return Math.min(MAX_DUNGEON_LEVEL, AREAS[area].baseLevel + (depth - 1) * 2 + floor * 0.5);
}

/**
 * 依地城等級計算怪物或 Boss 的屬性；深度愈深再額外提升 HP 與攻擊（每深度 +12%）。
 * @param {string} type 怪物或 Boss 代碼。
 * @param {number} level 地城等級。
 * @param {number} depth 深度。
 * @param {{elite?: boolean, boss?: boolean, abyss?: boolean, evolved?: boolean, rebirth?: number}} [opts] 菁英、Boss、深淵強化版、進化 Boss、玩家的轉職次數。
 * @returns {{hp: number, atk: number, def: number}} 屬性。
 */
export function monsterStats(type, level, depth, opts = {}) {
  const base = opts.boss ? BOSSES[type] : MONSTERS[type];
  const lv = level - 1;
  const deep = 1 + 0.12 * (depth - 1);
  let hp = base.hp * (1 + 0.3 * lv) * deep;
  let atk = base.atk * (1 + 0.22 * lv) * deep;
  const def = base.def + 1.2 * lv;
  if (opts.elite) {
    hp *= 3;
    atk *= 1.3;
  }
  if (opts.rebirth) {
    // 轉職加成：每轉職一次 HP、攻擊 +15%。
    hp *= 1 + REBIRTH.monster * opts.rebirth;
    atk *= 1 + REBIRTH.monster * opts.rebirth;
  }
  if (opts.evolved) {
    hp *= EVOLVE.hp;
    atk *= EVOLVE.atk;
  }
  if (opts.abyss) {
    hp *= 1.2;
    atk *= 1.1;
  }
  return { hp: Math.round(hp), atk: Math.round(atk), def: Math.round(def) };
}

/**
 * 打倒怪物獲得的經驗值與金幣。
 * @param {number} level 地城等級。
 * @param {number} xpMult 怪物的經驗倍率（菁英 ×3、Boss ×20 由呼叫端乘上）。
 * @param {() => number} rng 亂數函式。
 * @returns {{xp: number, gold: number}} 獎勵。
 */
export function killReward(level, xpMult, rng) {
  return { xp: Math.round((1.6 + 0.62 * level) * xpMult), gold: Math.round((2 + level * 0.8) * (0.6 + rng() * 0.8)) };
}

/**
 * 隨機決定掉落的稀有度。
 * @param {number[]} weights 普通、精良、稀有、傳說的權重。
 * @param {() => number} rng 亂數函式。
 * @returns {number} 稀有度索引（0～3）。
 */
export function rollRarity(weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return 0;
}

/**
 * 依深度與轉職次數調整掉落稀有度權重：深度愈深、轉職次數愈多（每次如同深度 +2），精良以上的機率愈高。
 * 權重不低於 0（深淵的深度沒有上限）。
 * @param {string} source 'monster'、'elite'、'boss'、'evolved'（進化 Boss）或 'chest'。
 * @param {number} depth 深度。
 * @param {number} [rebirth=0] 轉職次數。
 * @returns {number[]} 權重。
 */
export function rarityWeights(source, depth, rebirth = 0) {
  const d = depth - 1 + rebirth * REBIRTH.rarityDepth;
  let w;
  if (source === 'evolved') w = [0, 0, 65 - d * 5, 35 + d * 5];
  else if (source === 'boss') w = [0, 0, 90 - d * 5, 10 + d * 5];
  else if (source === 'elite' || source === 'chest') w = [40 - d * 4, 45, 13 + d * 3, 2 + d];
  else w = [70 - d * 5, 25 + d * 3, 5 + d * 2, d * 0.5];
  return w.map((v) => Math.max(0, v));
}

/**
 * 產生一件裝備。
 * 武器：單手武器的攻擊為雙手的 80%；鎧甲：防禦＋HP；頭盔：約鎧甲一半的防禦與 HP；鞋子：少量防禦＋速度；
 * 副手（盾牌，只能搭配單手武器）：防禦與 HP 約為鎧甲的 70%。
 * @param {{slot: 'weapon' | 'offhand' | 'helmet' | 'armor' | 'boots' | 'accessory', cls?: string, level: number, rarity: number, type?: string}} spec 部位、職業（武器用）、裝備等級、稀有度、指定的武器類型（合成用，須為該職業可用的類型）。
 * @param {() => number} rng 亂數函式。
 * @returns {object} 裝備 {id, slot, type, name, level, rarity, enhance, stats, gems, status?}。
 */
export function makeItem({ slot, cls, level, rarity, type: forceType }, rng) {
  const mult = RARITIES[rarity].mult;
  const lv = Math.max(1, Math.round(level));
  const stats = {};
  let type;
  if (slot === 'weapon') {
    const types = CLASSES[cls || 'warrior'].weapon;
    type = types.includes(forceType) ? forceType : pick(types, rng);
    const hand = WEAPON_HANDS[type] === 1 ? ONE_HAND_ATK : 1;
    stats.atk = Math.round((3 + 1.6 * lv) * mult * hand * (0.9 + rng() * 0.2));
  } else if (slot === 'offhand') {
    type = '盾牌';
    stats.def = Math.round((1 + 0.65 * lv) * mult * (0.9 + rng() * 0.2));
    stats.hp = Math.round((6 + 3.5 * lv) * mult * (0.9 + rng() * 0.2));
  } else if (slot === 'helmet') {
    type = '頭盔';
    stats.def = Math.round((1 + 0.45 * lv) * mult * (0.9 + rng() * 0.2));
    stats.hp = Math.round((4 + 2.5 * lv) * mult * (0.9 + rng() * 0.2));
  } else if (slot === 'boots') {
    type = '鞋子';
    stats.def = Math.round((0.5 + 0.3 * lv) * mult * (0.9 + rng() * 0.2));
    stats.spd = Math.round((2 + 0.15 * lv) * mult * (0.9 + rng() * 0.2));
  } else if (slot === 'armor') {
    type = '鎧甲';
    stats.def = Math.round((1.5 + 0.9 * lv) * mult * (0.9 + rng() * 0.2));
    stats.hp = Math.round((8 + 5 * lv) * mult * (0.9 + rng() * 0.2));
  } else {
    type = '飾品';
    const keys = Object.keys(ACCESSORY_STATS);
    const count = rarity >= 2 ? 2 : 1;
    while (Object.keys(stats).length < count) {
      // 只從尚未選到的屬性中挑（不會重複，也不會因亂數固定而一直挑到同一個）。
      const k = pick(keys.filter((key) => !(key in stats)), rng);
      const a = ACCESSORY_STATS[k];
      stats[k] = Math.round((a.base + a.per * lv) * mult);
    }
  }
  const name = ITEM_NAMES[type][Math.min(3, rarity)];
  const id = `${Date.now().toString(36)}${Math.floor(rng() * 1e9).toString(36)}`;
  const item = { id, slot, type, name, level: lv, rarity, enhance: 0, stats, gems: [] };
  // 武器有機會附帶異常狀態（稀有度愈高機會與機率愈高）：普通攻擊命中時觸發。
  if (slot === 'weapon' && rng() < 0.15 + 0.1 * rarity) {
    item.status = [pick(Object.keys(STATUS), rng), Math.round((0.1 + 0.03 * rarity) * 100) / 100];
  }
  return item;
}

/**
 * 裝備目前的屬性（含強化加成，只加在主屬性：武器攻擊、防具防禦與 HP、飾品不受強化影響以外的數值）。
 * @param {object} item 裝備。
 * @returns {Record<string, number>} 屬性。
 */
export function itemStats(item) {
  const bonus = 1 + ENHANCE.perLevel * item.enhance;
  const out = {};
  for (const [k, v] of Object.entries(item.stats)) {
    const main = item.slot !== 'accessory' || k === 'spd';
    out[k] = main ? Math.round(v * bonus) : Math.round(v * (1 + item.enhance * 0.04));
  }
  return out;
}

/**
 * 裝備的價值（商店售價）；賣出價格為價值的 30%。
 * @param {object} item 裝備。
 * @returns {number} 金幣。
 */
export function itemValue(item) {
  return Math.round((20 + item.level * 12) * RARITIES[item.rarity].value * (1 + item.enhance * 0.3));
}

/**
 * 裝備的賣出價格。
 * @param {object} item 裝備。
 * @returns {number} 金幣。
 */
export function sellPrice(item) {
  return Math.max(1, Math.round(itemValue(item) * 0.3));
}

/**
 * 強化到下一級的費用。
 * @param {object} item 裝備。
 * @returns {number} 金幣；已達上限時為 Infinity。
 */
export function enhanceCost(item) {
  if (item.enhance >= ENHANCE.max) return Infinity;
  return Math.round((30 + item.level * 10) * (item.enhance + 1) ** 1.4 * (1 + item.rarity * 0.3));
}

/**
 * 嘗試強化裝備：+6 起有失敗機率，失敗時不降級，只失去金幣。
 * @param {object} item 裝備（成功時會被修改）。
 * @param {() => number} rng 亂數函式。
 * @returns {boolean} 是否成功。
 */
export function tryEnhance(item, rng) {
  if (item.enhance >= ENHANCE.max) return false;
  const fail = ENHANCE.failRate[item.enhance + 1];
  if (rng() < fail) return false;
  item.enhance++;
  return true;
}

/**
 * 以文字描述裝備屬性，例如「攻擊 +24、HP +40」。
 * @param {object} item 裝備。
 * @returns {string} 描述。
 */
export function describeStats(item) {
  const names = { atk: '攻擊', def: '防禦', hp: 'HP', spd: '速度' };
  return Object.entries(itemStats(item))
    .map(([k, v]) => {
      if (names[k]) return `${names[k]} +${v}`;
      const a = ACCESSORY_STATS[k];
      return `${a.name} +${v}${a.pct ? '%' : ''}`;
    })
    .join('、');
}
