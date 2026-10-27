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

/** 未轉職時的最高等級；每轉職一次上限 +10（見 REBIRTH.capStep），轉職 3 次後為 Lv.60。 */
export const MAX_LEVEL = 30;

/** 地城等級上限（深淵最深處）。 */
export const MAX_DUNGEON_LEVEL = 60;

/**
 * 轉職：達到目前的等級上限（Lv.30／40／50）才能轉職，最多 3 次；每轉職一次等級上限 +10（最高 Lv.60）。
 * 轉職後回到 Lv.1，HP、攻擊、防禦的起始值為轉職前滿級（不含裝備）的 1/2，速度維持職業初始值。
 * titles 為各職業依轉職次數（0～3）的職稱。
 */
export const REBIRTH = {
  max: 3,
  capStep: 10,
  halve: ['hp', 'atk', 'def'],
  /** 每轉職一次：怪物與 Boss 的 HP、攻擊 +15%；掉落裝備等級 +2；稀有度如同深度 +2；金幣與經驗值 +15%。 */
  monster: 0.15,
  dropLevel: 2,
  rarityDepth: 2,
  reward: 0.15,
  titles: {
    warrior: ['戰士', '騎士', '聖騎士', '英雄'],
    archer: ['弓箭手', '遊俠', '神射手', '風之射手'],
    mage: ['法師', '術士', '大法師', '賢者'],
  },
};

/**
 * 區域（依解鎖順序排列，鍵即區域代碼）：名稱、回報大廳用的難度代碼（code）、基礎地城等級（深度每 +1，地城等級 +2）、
 * 出現的怪物與 Boss、建議等級、地圖色調、可挑戰的最大深度（maxDepth，省略時為 MAX_DEPTH）。
 * 深淵的 Boss 從六個 Boss 中隨機選一個強化版；深淵最深為深度 17（地城等級最高 Lv.60）。
 * easy、medium、hard、expert 四個鍵沿用最初的區域代碼，以相容既有存檔。
 */
export const AREAS = {
  grass: { name: '翠綠草原', code: 'easy', baseLevel: 1, monsters: ['slime', 'mushroom', 'boar', 'hornet', 'scarecrow', 'goblin'], boss: ['bullKing'], recommend: [1, 4], theme: 'grass' },
  easy: { name: '苔蘚遺跡', code: 'easy', baseLevel: 5, monsters: ['slime', 'bat', 'skeleton', 'skelArcher', 'mushroom', 'vineflower'], boss: ['treant'], recommend: [5, 9], theme: 'moss' },
  medium: { name: '熔岩礦坑', code: 'medium', baseLevel: 9, monsters: ['bat', 'goblin', 'lavaWorm', 'fireSpirit', 'spider', 'bomber', 'magmaSlime'], boss: ['golem'], recommend: [9, 14], theme: 'lava' },
  hard: { name: '冰晶要塞', code: 'hard', baseLevel: 14, monsters: ['skeleton', 'iceWolf', 'wraith', 'crystal', 'yeti', 'frostSprite', 'gargoyle'], boss: ['lich'], recommend: [14, 19], theme: 'ice' },
  sky: { name: '天空之城', code: 'hard', baseLevel: 19, monsters: ['harpy', 'thunderSprite', 'skyKnight', 'gargoyle', 'frostSprite', 'skelArcher'], boss: ['thunderbird'], recommend: [19, 23], theme: 'sky' },
  necro: { name: '死靈墓地', code: 'expert', baseLevel: 23, monsters: ['zombie', 'boneMage', 'banshee', 'skeleton', 'wraith', 'shade'], boss: ['necromancer'], recommend: [23, 27], theme: 'necro' },
  expert: { name: '深淵', code: 'expert', baseLevel: 27, monsters: ['skelArcher', 'fireSpirit', 'wraith', 'crystal', 'shade', 'voidEye', 'gargoyle'], boss: ['treant', 'golem', 'lich', 'bullKing', 'thunderbird', 'necromancer'], recommend: [27, 60], theme: 'abyss', maxDepth: 17 },
};

/** 區域代碼依解鎖順序排列。 */
export const AREA_KEYS = Object.keys(AREAS);

/** 一般區域可挑戰的最大深度（深淵另見 AREAS.expert.maxDepth）。 */
export const MAX_DEPTH = 5;

/** 每趟的一般樓層數（之後為 Boss 層）。 */
export const FLOORS = 3;

/**
 * 怪物（29 種）：名稱、地城等級 1 時的屬性、半徑、移動速度（格／秒）、行為與經驗值倍率；
 * deathPool 為死亡時留下熔岩；shot 為投射物外觀（省略時依行為預設）；status 為攻擊命中時附加的異常狀態與機率。
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
  wraith: { name: '寒霜幽魂', hp: 30, atk: 11, def: 3, r: 0.38, speed: 2.2, ai: 'wraith', xp: 1.3, status: ['sleep', 0.12] },
  crystal: { name: '水晶傀儡', hp: 62, atk: 14, def: 12, r: 0.48, speed: 1.0, ai: 'golemling', xp: 1.6, status: ['stun', 0.15] },
  mushroom: { name: '毒菇人', hp: 38, atk: 8, def: 3, r: 0.38, speed: 1.0, ai: 'spore', xp: 1.1, status: ['poison', 0.5] },
  vineflower: { name: '藤蔓食人花', hp: 30, atk: 9, def: 2, r: 0.4, speed: 0, ai: 'turret', xp: 1.1, status: ['poison', 0.35] },
  spider: { name: '礦坑蜘蛛', hp: 24, atk: 9, def: 2, r: 0.32, speed: 3.0, ai: 'leaper', xp: 1, status: ['poison', 0.4] },
  bomber: { name: '炸彈哥布林', hp: 26, atk: 11, def: 2, r: 0.34, speed: 2.2, ai: 'bomber', xp: 1.2, status: ['stun', 0.2] },
  magmaSlime: { name: '岩漿史萊姆', hp: 40, atk: 10, def: 4, r: 0.42, speed: 1.3, ai: 'slime', xp: 1.2, deathPool: true },
  yeti: { name: '雪怪', hp: 70, atk: 15, def: 8, r: 0.5, speed: 1.5, ai: 'brute', xp: 1.6, status: ['stun', 0.2] },
  frostSprite: { name: '冰霜妖精', hp: 28, atk: 11, def: 3, r: 0.34, speed: 1.6, ai: 'tri', xp: 1.3 },
  gargoyle: { name: '石像鬼', hp: 50, atk: 14, def: 10, r: 0.44, speed: 2.6, ai: 'gargoyle', xp: 1.5 },
  shade: { name: '暗影刺客', hp: 32, atk: 13, def: 3, r: 0.36, speed: 2.8, ai: 'assassin', xp: 1.4, status: ['poison', 0.3] },
  voidEye: { name: '虛空之眼', hp: 34, atk: 13, def: 4, r: 0.4, speed: 1.2, ai: 'beam', xp: 1.4, status: ['stun', 0.2] },
  boar: { name: '野豬', hp: 32, atk: 8, def: 3, r: 0.4, speed: 2.2, ai: 'leaper', xp: 1 },
  hornet: { name: '大黃蜂', hp: 16, atk: 6, def: 1, r: 0.28, speed: 2.8, ai: 'bat', xp: 0.8, status: ['poison', 0.4] },
  scarecrow: { name: '稻草人', hp: 36, atk: 9, def: 3, r: 0.4, speed: 1.5, ai: 'melee', xp: 1.1 },
  harpy: { name: '鷹身女妖', hp: 30, atk: 11, def: 3, r: 0.38, speed: 2.4, ai: 'tri', xp: 1.3, shot: 'feather', status: ['sleep', 0.12] },
  thunderSprite: { name: '雷霆精靈', hp: 28, atk: 12, def: 3, r: 0.34, speed: 1.6, ai: 'beam', xp: 1.3, status: ['stun', 0.2] },
  skyKnight: { name: '天空守衛', hp: 64, atk: 14, def: 10, r: 0.46, speed: 1.6, ai: 'brute', xp: 1.6, status: ['stun', 0.2] },
  zombie: { name: '殭屍', hp: 58, atk: 12, def: 5, r: 0.42, speed: 1.1, ai: 'melee', xp: 1.3, status: ['poison', 0.4] },
  boneMage: { name: '骷髏法師', hp: 30, atk: 13, def: 3, r: 0.36, speed: 1.5, ai: 'caster', xp: 1.4, shot: 'curse', status: ['sleep', 0.15] },
  banshee: { name: '怨靈', hp: 34, atk: 13, def: 3, r: 0.38, speed: 2.4, ai: 'wraith', xp: 1.4, status: ['sleep', 0.15] },
};

/**
 * Boss：名稱、地城等級 1 時的屬性與半徑。招式在 world.js 依 kind 實作。
 * 所有 Boss 在 HP 70% 以下時，換招時有 35% 機會開始回復（見 BOSS_HEAL）；status 為招式命中時附加的異常狀態與機率。
 */
export const BOSSES = {
  treant: { name: '古樹守衛', hp: 680, atk: 15, def: 6, r: 1.0, speed: 1.1, kind: 'treant', status: ['poison', 0.3] },
  golem: { name: '熔岩魔像', hp: 760, atk: 16, def: 9, r: 1.05, speed: 1.2, kind: 'golem', status: ['stun', 0.08] },
  lich: { name: '霜之巫妖', hp: 640, atk: 16, def: 6, r: 0.9, speed: 1.4, kind: 'lich', status: ['sleep', 0.1] },
  bullKing: { name: '巨角牛王', hp: 640, atk: 14, def: 6, r: 1.0, speed: 1.4, kind: 'bullKing' },
  thunderbird: { name: '雷鳥', hp: 620, atk: 16, def: 6, r: 0.95, speed: 1.6, kind: 'thunderbird', status: ['stun', 0.08] },
  necromancer: { name: '死靈法師', hp: 660, atk: 16, def: 6, r: 0.9, speed: 1.3, kind: 'necromancer', status: ['sleep', 0.1] },
};

/** Boss 回復：觸發的 HP 比例、機率、蓄力秒數、回復量、每場次數（深淵強化版另計）、打斷所需傷害與打斷後的暈眩秒數。 */
export const BOSS_HEAL = { below: 0.7, chance: 0.35, channel: 2, pct: 0.15, abyssPct: 0.2, times: 2, abyssTimes: 3, breakPct: 0.08, stun: 1 };

/**
 * 難度：菁英詞綴（迅捷：移動 +30%、出招間隔 −30%；爆裂：每 6 秒在身邊爆發；射手：每 5 秒朝玩家射出 3 發投射物）、
 * 怪物出招頻率（每深 1 層 +5%、每轉職 1 次 +10%，最多 +50%）、Boss 狂暴（HP 25% 以下出招間隔 −30%）。
 */
export const DIFFICULTY = {
  affixes: { frenzy: '迅捷', nova: '爆裂', volley: '射手' },
  depthPace: 0.05,
  rebirthPace: 0.1,
  maxPace: 1.5,
  enrageBelow: 0.25,
  enrageCd: 0.7,
};

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
export const LIMITS = { bag: 20, potions: 10, potionPrice: 30, scrollPrice: 40, cures: 5, curePrice: 50 };

/**
 * 異常狀態：名稱、持續秒數與顏色。玩家與怪物共用同一套規則，Boss 承受的持續時間為 bossMult 倍。
 * 中毒：每 0.5 秒失去最大 HP 的 1%（每秒 2%），持續 5 秒共 10%，可以毒死；Boss 持續 2.5 秒共 5%（bossDur）；睡眠：無法行動，被攻擊 3 次就醒來；暈眩：不能移動、閃避、攻擊或施放技能（被攻擊也不會解除；玩家為 5 秒，見 playerDur）。
 * 重複中同一種狀態時重新計時；睡眠結束後 3 秒內不會再睡著（wakeGuard）。淨化藥水或抗異常護盾可以解除。
 */
export const STATUS = {
  poison: { name: '中毒', dur: 5, bossDur: 2.5, tick: 0.5, pct: 0.02, color: '#c07aff' },
  sleep: { name: '睡眠', dur: 10, wake: 3, wakeGuard: 3, color: '#9ab8ff' },
  stun: { name: '暈眩', dur: 10, playerDur: 5, color: '#ffe14d' },
};

/** Boss 承受睡眠與暈眩的持續時間倍率（中毒另見 STATUS.poison.bossDur）。 */
export const STATUS_BOSS = 0.3;

/**
 * 寶石：鑲嵌在裝備的孔裡。持續型寶石（攻擊、HP、防禦、速度、吸血）依等級 1～5 提升 5%～15%；
 * 主動型寶石（血量護盾、抗異常護盾）在地城中以按鈕使用，只有一個等級，不能合成。
 */
export const GEMS = {
  atk: { name: '紅寶石', stat: '攻擊', values: [5, 7, 10, 12, 15], color: '#e04a5a' },
  hp: { name: '翡翠', stat: 'HP', values: [5, 7, 10, 12, 15], color: '#5fd068' },
  def: { name: '藍寶石', stat: '防禦', values: [5, 7, 10, 12, 15], color: '#5aa7ff' },
  spd: { name: '黃玉', stat: '速度', values: [5, 7, 10, 12, 15], color: '#f2d04b' },
  leech: { name: '血石', stat: '吸血', values: [5, 7, 10, 12, 15], color: '#a8243a' },
  shield: { name: '守護鑽石', active: true, label: '血量護盾', pct: 0.25, dur: 10, cd: 60, color: '#e8f4ff' },
  ward: { name: '月光石', active: true, label: '抗異常護盾', dur: 30, cd: 60, color: '#c8a8ff' },
};

/**
 * 寶石規則：等級名稱、最高等級、合成數量與費用（索引為合成前的等級）、吸血上限（%）、升級贈送的間隔（每 5 級送 1 顆，商店不販售寶石）、
 * 主動按鈕上限，以及掉落機率（一般怪物、菁英、寶箱；Boss 必掉；平均每趟約 2.5 顆）。
 * 裝備的孔數：普通與精良 1 孔，稀有與傳說 2 孔。
 */
export const GEM_RULES = {
  tiers: ['碎裂', '普通', '無瑕', '完美', '璀璨'],
  max: 5,
  fuse: 3,
  fuseCost: [0, 100, 300, 800, 2000],
  leechCap: 15,
  /** 每秒吸血回復上限（最大 HP 的比例），嗜血技能生效中提高。 */
  leechPerSec: 0.02,
  leechPerSecSkill: 0.04,
  levelGift: 5,
  actives: 2,
  drop: { monster: 0.02, elite: 0.2, chest: 0.12 },
  activeChance: 0.06,
};

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
