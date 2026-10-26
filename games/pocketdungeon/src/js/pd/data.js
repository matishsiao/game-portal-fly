// 遊戲資料表：職業、區域、怪物、Boss 與裝備的基礎數值。數值的合理性由 scripts/check-balance.mjs 驗證。
// 距離單位為「格」（1 格 = 16 像素），時間單位為秒。

/**
 * 職業：初始屬性、每級成長、普通攻擊與可用武器。
 * attack.kind：arc 前方扇形、arrow 直線箭矢、orb 法球（命中或飛完後爆炸）。
 */
export const CLASSES = {
  warrior: {
    name: '戰士',
    base: { hp: 120, atk: 12, def: 8, spd: 100 },
    growth: { hp: 12, atk: 2, def: 1.5, spd: 0.5 },
    attack: { kind: 'arc', range: 1.5, angle: 120, mult: 1.0 },
    weapon: ['劍', '斧'],
  },
  archer: {
    name: '弓箭手',
    base: { hp: 90, atk: 10, def: 5, spd: 115 },
    growth: { hp: 8, atk: 2, def: 1, spd: 1 },
    attack: { kind: 'arrow', range: 7, speed: 12, mult: 1.0 },
    weapon: ['弓'],
  },
  mage: {
    name: '法師',
    base: { hp: 75, atk: 14, def: 4, spd: 100 },
    growth: { hp: 7, atk: 2.5, def: 0.8, spd: 0.5 },
    attack: { kind: 'orb', range: 5, speed: 7, radius: 1, mult: 1.0 },
    weapon: ['法杖'],
  },
};

/** 職業代碼（角色欄位順序）。 */
export const CLASS_KEYS = Object.keys(CLASSES);

/** 最高等級。 */
export const MAX_LEVEL = 30;

/**
 * 區域：難度代碼、名稱、基礎地城等級（深度每 +1，地城等級 +2）、出現的怪物與 Boss、建議等級、地圖色調。
 * 深淵的 Boss 從三個 Boss 中隨機選一個強化版。
 */
export const AREAS = {
  easy: { name: '苔蘚遺跡', baseLevel: 2, monsters: ['slime', 'bat', 'skeleton', 'skelArcher', 'mushroom', 'vineflower'], boss: ['treant'], recommend: [1, 9], theme: 'moss' },
  medium: { name: '熔岩礦坑', baseLevel: 11, monsters: ['bat', 'goblin', 'lavaWorm', 'fireSpirit', 'spider', 'bomber', 'magmaSlime'], boss: ['golem'], recommend: [10, 18], theme: 'lava' },
  hard: { name: '冰晶要塞', baseLevel: 20, monsters: ['skeleton', 'iceWolf', 'wraith', 'crystal', 'yeti', 'frostSprite', 'gargoyle'], boss: ['lich'], recommend: [19, 26], theme: 'ice' },
  expert: { name: '深淵', baseLevel: 26, monsters: ['skelArcher', 'fireSpirit', 'wraith', 'crystal', 'shade', 'voidEye', 'gargoyle'], boss: ['treant', 'golem', 'lich'], recommend: [25, 30], theme: 'abyss' },
};

/** 區域代碼依解鎖順序排列（同時是共用的難度代碼）。 */
export const AREA_KEYS = Object.keys(AREAS);

/** 每個區域可挑戰的最大深度（深淵沒有上限）。 */
export const MAX_DEPTH = 5;

/** 每趟的一般樓層數（之後為 Boss 層）。 */
export const FLOORS = 3;

/**
 * 怪物（20 種）：名稱、地城等級 1 時的屬性、半徑、移動速度（格／秒）、行為與經驗值倍率；deathPool 為死亡時留下熔岩。
 * 行為細節在 world.js 依 ai 代碼實作。
 */
export const MONSTERS = {
  slime: { name: '苔蘚史萊姆', hp: 34, atk: 7, def: 2, r: 0.4, speed: 1.3, ai: 'slime', xp: 1 },
  bat: { name: '洞穴蝙蝠', hp: 18, atk: 6, def: 1, r: 0.3, speed: 2.6, ai: 'bat', xp: 0.8 },
  skeleton: { name: '骷髏劍士', hp: 40, atk: 11, def: 4, r: 0.38, speed: 1.9, ai: 'melee', xp: 1.2 },
  skelArcher: { name: '骷髏弓手', hp: 28, atk: 9, def: 2, r: 0.36, speed: 1.8, ai: 'archer', xp: 1.2 },
  goblin: { name: '哥布林斥候', hp: 26, atk: 8, def: 3, r: 0.34, speed: 3.2, ai: 'goblin', xp: 1 },
  lavaWorm: { name: '熔岩蟲', hp: 36, atk: 12, def: 5, r: 0.42, speed: 2.4, ai: 'worm', xp: 1.3 },
  fireSpirit: { name: '火焰精靈', hp: 26, atk: 10, def: 2, r: 0.36, speed: 1.6, ai: 'caster', xp: 1.2 },
  iceWolf: { name: '冰原狼', hp: 38, atk: 12, def: 4, r: 0.4, speed: 2.8, ai: 'wolf', xp: 1.3 },
  wraith: { name: '寒霜幽魂', hp: 30, atk: 11, def: 3, r: 0.38, speed: 2.2, ai: 'wraith', xp: 1.3 },
  crystal: { name: '水晶傀儡', hp: 62, atk: 14, def: 12, r: 0.48, speed: 1.0, ai: 'golemling', xp: 1.6 },
  mushroom: { name: '毒菇人', hp: 38, atk: 8, def: 3, r: 0.38, speed: 1.0, ai: 'spore', xp: 1.1 },
  vineflower: { name: '藤蔓食人花', hp: 30, atk: 9, def: 2, r: 0.4, speed: 0, ai: 'turret', xp: 1.1 },
  spider: { name: '礦坑蜘蛛', hp: 24, atk: 9, def: 2, r: 0.32, speed: 3.0, ai: 'leaper', xp: 1 },
  bomber: { name: '炸彈哥布林', hp: 26, atk: 11, def: 2, r: 0.34, speed: 2.2, ai: 'bomber', xp: 1.2 },
  magmaSlime: { name: '岩漿史萊姆', hp: 40, atk: 10, def: 4, r: 0.42, speed: 1.3, ai: 'slime', xp: 1.2, deathPool: true },
  yeti: { name: '雪怪', hp: 70, atk: 15, def: 8, r: 0.5, speed: 1.5, ai: 'brute', xp: 1.6 },
  frostSprite: { name: '冰霜妖精', hp: 28, atk: 11, def: 3, r: 0.34, speed: 1.6, ai: 'tri', xp: 1.3 },
  gargoyle: { name: '石像鬼', hp: 50, atk: 14, def: 10, r: 0.44, speed: 2.6, ai: 'gargoyle', xp: 1.5 },
  shade: { name: '暗影刺客', hp: 32, atk: 13, def: 3, r: 0.36, speed: 2.8, ai: 'assassin', xp: 1.4 },
  voidEye: { name: '虛空之眼', hp: 34, atk: 13, def: 4, r: 0.4, speed: 1.2, ai: 'beam', xp: 1.4 },
};

/**
 * Boss：名稱、地城等級 1 時的屬性與半徑。招式在 world.js 依 kind 實作。
 * 所有 Boss 在 HP 70% 以下時，換招時有 35% 機會開始回復（見 BOSS_HEAL）。
 */
export const BOSSES = {
  treant: { name: '古樹守衛', hp: 680, atk: 15, def: 6, r: 1.0, speed: 1.1, kind: 'treant' },
  golem: { name: '熔岩魔像', hp: 760, atk: 16, def: 9, r: 1.05, speed: 1.2, kind: 'golem' },
  lich: { name: '霜之巫妖', hp: 640, atk: 16, def: 6, r: 0.9, speed: 1.4, kind: 'lich' },
};

/** Boss 回復：觸發的 HP 比例、機率、蓄力秒數、回復量、每場次數（深淵強化版另計）、打斷所需傷害與打斷後的暈眩秒數。 */
export const BOSS_HEAL = { below: 0.7, chance: 0.35, channel: 2, pct: 0.15, abyssPct: 0.2, times: 2, abyssTimes: 3, breakPct: 0.08, stun: 1 };

/** Boss 進化：同一角色同一關（區域＋深度）破關幾次後可能進化、每次的機率、能力與獎勵倍率。 */
export const EVOLVE = { clears: 5, chance: 0.3, hp: 1.6, atk: 1.25, cd: 0.85, scale: 1.15, gold: 2, xp: 1.5, items: 2, levelBonus: 3, pouch: 0.5 };

/** 稀有度：名稱、顏色（同時顯示名稱，不只靠顏色）、數值倍率與賣價倍率。 */
export const RARITIES = [
  { key: 'common', name: '普通', color: '#e8e8e8', mult: 1.0, value: 1 },
  { key: 'fine', name: '精良', color: '#5fd068', mult: 1.25, value: 2 },
  { key: 'rare', name: '稀有', color: '#5aa7ff', mult: 1.55, value: 4 },
  { key: 'legend', name: '傳說', color: '#f2b84b', mult: 1.9, value: 10 },
];

/** 飾品可能的屬性：名稱、每單位地城等級的數值與是否為百分比。 */
export const ACCESSORY_STATS = {
  spd: { name: '速度', base: 3, per: 0.35, pct: false },
  atkPct: { name: '攻擊', base: 4, per: 0.25, pct: true },
  defPct: { name: '防禦', base: 4, per: 0.25, pct: true },
  hpPct: { name: 'HP', base: 5, per: 0.3, pct: true },
  goldPct: { name: '金幣', base: 8, per: 0.4, pct: true },
  xpPct: { name: '經驗', base: 6, per: 0.3, pct: true },
};

/** 裝備名稱用字（依類型），與稀有度組合成名稱。 */
export const ITEM_NAMES = {
  劍: ['鐵劍', '騎士劍', '月光劍', '王者之劍'],
  斧: ['手斧', '戰斧', '雙刃斧', '破城斧'],
  弓: ['短弓', '獵弓', '長弓', '星辰弓'],
  法杖: ['木杖', '水晶杖', '賢者杖', '星辰杖'],
  鎧甲: ['皮甲', '鎖子甲', '板甲', '龍鱗甲'],
  頭盔: ['皮帽', '鐵盔', '騎士盔', '龍鱗盔'],
  鞋子: ['布鞋', '皮靴', '鐵靴', '疾風靴'],
  飾品: ['銅戒指', '銀項鍊', '紅寶石墜飾', '星辰護符'],
};

/** 強化上限、每級主屬性加成與失敗機率（索引為目標強化值）。 */
export const ENHANCE = {
  max: 10,
  perLevel: 0.08,
  failRate: [0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.5],
};

/** 背包初始上限、每趟藥水上限與道具價格。 */
export const LIMITS = { bag: 20, potions: 10, potionPrice: 30, scrollPrice: 40 };

/** 共用倉庫：所有角色共用的裝備格數（固定，不能擴充）。金幣另外共用，沒有上限。 */
export const SHARED_SLOTS = 20;

/** 背包擴充袋：每次使用 +5 格，最多擴充到 40 格；售價依已擴充次數倍增（200、400、800、1600）。 */
export const BAG_EXPAND = { step: 5, max: 40, basePrice: 200 };

/**
 * 裝備欄：欄位代碼、名稱與可放入的裝備部位（兩個飾品欄都放飾品）。
 * 依畫面顯示順序排列。
 */
export const EQUIP_SLOTS = [
  { key: 'weapon', name: '武器', slot: 'weapon' },
  { key: 'helmet', name: '頭盔', slot: 'helmet' },
  { key: 'armor', name: '鎧甲', slot: 'armor' },
  { key: 'boots', name: '鞋子', slot: 'boots' },
  { key: 'acc1', name: '飾品 1', slot: 'accessory' },
  { key: 'acc2', name: '飾品 2', slot: 'accessory' },
];

/** 裝備部位與名稱。 */
export const ITEM_SLOTS = { weapon: '武器', helmet: '頭盔', armor: '鎧甲', boots: '鞋子', accessory: '飾品' };
