// 家園資料：家園材料、家具與裝飾目錄（家具 50 種、裝飾 100 種）、作物、掉落與商店數值、土地等級。
// 規劃與設計理由見 home-plan.md。

/**
 * 家園材料（與裝備材料分開，不佔背包格）：area 為主要掉落的區域（深淵 expert 另外隨機掉落其他材料），
 * shop 為商店售價（0 表示商店不賣），color 為圖示主色。
 */
export const HOME_MATS = [
  { key: 'wood', name: '木材', area: 'grass', shop: 20, color: '#a8743e' },
  { key: 'stone', name: '石塊', area: 'easy', shop: 20, color: '#8a9098' },
  { key: 'clay', name: '黏土', area: 'medium', shop: 0, color: '#c0643a' },
  { key: 'ice', name: '冰晶', area: 'hard', shop: 0, color: '#8ad0f0' },
  { key: 'feather', name: '羽毛', area: 'sky', shop: 0, color: '#f0e8d0' },
  { key: 'bone', name: '骨片', area: 'necro', shop: 0, color: '#e0dcc8' },
  { key: 'sand', name: '細沙', area: 'desert', shop: 0, color: '#e8c878' },
  { key: 'shell', name: '貝殼', area: 'sea', shop: 0, color: '#f0a8b8' },
  { key: 'gear', name: '齒輪', area: 'clock', shop: 0, color: '#c8a050' },
  { key: 'scale', name: '龍鱗', area: 'dragon', shop: 0, color: '#d04a3a' },
  { key: 'dark', name: '暗晶', area: 'demon', shop: 0, color: '#7a4ac8' },
  { key: 'cloth', name: '布料', area: null, shop: 30, color: '#e8e0f0' },
];

/** 家園材料代碼。 */
export const HOME_MAT_KEYS = HOME_MATS.map((m) => m.key);

/**
 * 掉落：mat 為掉落該區域家園材料的機率與數量；recipe 為掉落家具製作書的機率（寶箱另計）；
 * bossTheme 為 Boss 掉落自己主題裝飾製作書的機率（進化 Boss 必掉）；seed 為掉落種子的機率；
 * recipeWeights 為一般配方依稀有度（普通、精良、稀有、傳說）的權重；areaTheme 為掉落的製作書是該區域主題配方的機率。
 */
export const HOME_DROP = {
  mat: { monster: 0.1, elite: 0.4, boss: 1, count: { monster: [1, 1], elite: [1, 2], boss: [2, 4] } },
  recipe: { monster: 0.008, elite: 0.06, chest: 0.08 },
  bossTheme: 0.25,
  seed: { monster: 0.02, elite: 0.08, chest: 0.1 },
  recipeWeights: [55, 30, 12, 3],
  areaTheme: 0.3,
  /** 深淵：掉落其他區域材料的機率。 */
  abyssMix: 0.5,
};

/**
 * 商店：每天陳列 recipes 本家具製作書（尚未學會的普通與精良一般配方），售價依稀有度；
 * 學會的重複製作書與自動賣出時得到 recipeSell（依稀有度）。
 */
export const HOME_SHOP = { recipes: 2, recipePrice: [150, 400, 1000, 2500], recipeSell: [40, 100, 250, 600] };

/** 每種家園材料、種子、作物的持有上限。 */
export const HOME_MAX = 999;

/** 製作金幣（依稀有度）。 */
export const CRAFT_GOLD = [30, 100, 300, 800];

/** 稀有度名稱（家具與裝飾）。 */
export const HOME_RARITY = ['普通', '精良', '稀有', '傳說'];

/**
 * 擺放方式：floor 擋路的家具；small 不擋路的小物（可放在桌面類家具上）；rug 地毯（鋪在地上、可放家具）；
 * wall 掛在牆上；floorTile 地板樣式；wallTile 牆面樣式。yard 為只能放在庭院的物件。
 */
export const PLACE = ['floor', 'small', 'rug', 'wall', 'floorTile', 'wallTile'];

/**
 * 解析材料字串（例如 'wood:4,cloth:2'）。
 * @param {string} s 材料字串。
 * @returns {Record<string, number>} 材料與數量。
 */
function mats(s) {
  const out = {};
  for (const part of s.split(',')) {
    const [k, n] = part.split(':');
    out[k] = Number(n);
  }
  return out;
}

/**
 * 建立一筆目錄資料。
 * @param {'furniture' | 'decor'} type 家具或裝飾。
 * @param {string} cat 分類代碼。
 * @param {string} key 代碼。
 * @param {string} name 名稱。
 * @param {string} place 擺放方式。
 * @param {[number, number]} size 佔用格數（寬、高）。
 * @param {number} rarity 稀有度 0～3。
 * @param {string} m 材料字串。
 * @param {object} [extra] 其他欄位：src（配方來源：default 預設、any 一般掉落與商店、區域代碼或 Boss 代碼）、func（功能）、yard、top（可放小物的桌面）。
 * @returns {object} 目錄資料。
 */
function entry(type, cat, key, name, place, size, rarity, m, extra = {}) {
  return { key, name, type, cat, place, size, rarity, mats: mats(m), gold: CRAFT_GOLD[rarity], src: 'any', yard: false, top: false, ...extra };
}

/** 家具分類名稱。 */
export const FURNITURE_CATS = { bedroom: '臥室', living: '客廳', kitchen: '廚房', work: '工作與興趣', storage: '收納與展示', bath: '浴室', yardF: '庭院' };

/** 裝飾分類名稱。 */
export const DECOR_CATS = { floorD: '地板', wallD: '牆面', small: '小擺設', wallArt: '牆飾', light: '燈具', garden: '庭院造景', theme: '區域主題', boss: 'Boss 主題' };

// 建立一筆家具資料。
const F = (cat, key, name, size, r, m, x) => entry('furniture', cat, key, name, 'floor', size, r, m, x);
// 建立一筆裝飾資料。
const D = (cat, key, name, place, size, r, m, x) => entry('decor', cat, key, name, place, size, r, m, x);

/** 家具（50 種）。 */
const FURNITURE = [
  F('bedroom', 'woodBed', '木床', [1, 2], 0, 'wood:6,cloth:2', { src: 'default' }),
  F('bedroom', 'bunkBed', '雙層床', [1, 2], 1, 'wood:10,cloth:4'),
  F('bedroom', 'princessBed', '公主床', [2, 2], 2, 'wood:8,cloth:8,feather:4'),
  F('bedroom', 'hammock', '吊床', [2, 1], 1, 'cloth:6,wood:2'),
  F('bedroom', 'wardrobe', '衣櫃', [2, 1], 1, 'wood:10'),
  F('bedroom', 'dresser', '五斗櫃', [1, 1], 0, 'wood:6', { top: true }),
  F('bedroom', 'vanity', '梳妝台', [1, 1], 1, 'wood:5,ice:2'),
  F('bedroom', 'nightstand', '床頭櫃', [1, 1], 0, 'wood:3', { top: true }),
  F('living', 'woodChair', '木椅', [1, 1], 0, 'wood:2', { src: 'default' }),
  F('living', 'armchair', '扶手椅', [1, 1], 1, 'wood:3,cloth:3'),
  F('living', 'sofa', '單人沙發', [1, 1], 1, 'cloth:4,wood:2'),
  F('living', 'longSofa', '長沙發', [2, 1], 2, 'cloth:8,wood:4,feather:2'),
  F('living', 'rockingChair', '搖椅', [1, 1], 1, 'wood:5'),
  F('living', 'teaTable', '茶几', [1, 1], 0, 'wood:3', { top: true }),
  F('living', 'woodTable', '木桌', [1, 1], 0, 'wood:4', { src: 'default', top: true }),
  F('living', 'diningTable', '長餐桌', [2, 1], 1, 'wood:8', { top: true }),
  F('living', 'bookcase', '書櫃', [1, 1], 1, 'wood:6'),
  F('living', 'glassCabinet', '玻璃展示櫃', [1, 1], 2, 'wood:4,ice:4'),
  F('kitchen', 'stove', '爐灶', [1, 1], 1, 'stone:6,clay:2'),
  F('kitchen', 'oven', '烤爐', [1, 1], 1, 'clay:6,stone:2'),
  F('kitchen', 'counter', '流理台', [1, 1], 0, 'wood:3,stone:2', { top: true }),
  F('kitchen', 'cupboard', '碗櫃', [1, 1], 0, 'wood:5'),
  F('kitchen', 'iceBox', '冰櫃', [1, 1], 2, 'ice:6,wood:2'),
  F('kitchen', 'sink', '水槽', [1, 1], 1, 'stone:4,clay:2'),
  F('kitchen', 'barrelRack', '木桶架', [2, 1], 1, 'wood:8'),
  F('kitchen', 'dishRack', '餐具架', [1, 1], 0, 'wood:3,clay:1'),
  F('work', 'workbench', '工作台', [2, 1], 0, 'wood:6', { src: 'default', func: 'craft' }),
  F('work', 'herbTable', '藥草台', [1, 1], 0, 'wood:4,stone:2', { func: 'brew' }),
  F('work', 'forge', '鍛造爐', [1, 1], 2, 'stone:8,clay:4'),
  F('work', 'loom', '織布機', [1, 1], 1, 'wood:8,cloth:2'),
  F('work', 'desk', '書桌', [1, 1], 0, 'wood:4', { top: true }),
  F('work', 'easel', '畫架', [1, 1], 1, 'wood:3,cloth:1'),
  F('work', 'piano', '鋼琴', [2, 1], 3, 'wood:12,ice:2,gear:2'),
  F('work', 'fireplace', '壁爐', [2, 1], 2, 'stone:10,clay:4'),
  F('storage', 'homeChest', '家用寶箱', [1, 1], 1, 'wood:6,stone:2', { func: 'chest' }),
  F('storage', 'crates', '木箱堆', [1, 1], 0, 'wood:4'),
  F('storage', 'shelf', '置物架', [1, 1], 0, 'wood:4'),
  F('storage', 'weaponRack', '武器架', [1, 1], 1, 'wood:4,stone:2'),
  F('storage', 'armorStand', '盔甲架', [1, 1], 1, 'wood:3,stone:3'),
  F('storage', 'trophyShelf', '展示架', [2, 1], 2, 'wood:6,ice:3', { func: 'display' }),
  F('bath', 'bathtub', '浴缸', [2, 1], 2, 'clay:8,stone:2'),
  F('bath', 'washbasin', '洗臉台', [1, 1], 1, 'clay:4,stone:2'),
  F('bath', 'screen', '屏風', [1, 1], 1, 'wood:3,cloth:4'),
  F('bath', 'towelRack', '毛巾架', [1, 1], 0, 'wood:2,cloth:1'),
  F('yardF', 'bench', '長椅', [2, 1], 0, 'wood:4', { yard: true }),
  F('yardF', 'picnicTable', '野餐桌', [2, 1], 1, 'wood:8', { yard: true, top: true }),
  F('yardF', 'swing', '鞦韆', [2, 1], 1, 'wood:6,cloth:2', { yard: true }),
  F('yardF', 'well', '水井', [1, 1], 1, 'stone:8,wood:2', { yard: true }),
  F('yardF', 'doghouse', '狗屋', [1, 1], 1, 'wood:6', { yard: true }),
  F('yardF', 'gazebo', '涼亭', [2, 2], 3, 'wood:16,stone:6,cloth:4', { yard: true }),
];

/** 裝飾（100 種）。 */
const DECOR = [
  // 地板（7 種地板樣式、3 種地毯）
  D('floorD', 'woodFloor', '木地板', 'floorTile', [1, 1], 0, 'wood:2', { src: 'default' }),
  D('floorD', 'stoneTile', '石磚', 'floorTile', [1, 1], 0, 'stone:2'),
  D('floorD', 'redBrick', '紅磚', 'floorTile', [1, 1], 0, 'clay:2'),
  D('floorD', 'marble', '大理石', 'floorTile', [1, 1], 2, 'stone:4,ice:1'),
  D('floorD', 'tatami', '榻榻米', 'floorTile', [1, 1], 1, 'cloth:2,wood:1'),
  D('floorD', 'redCarpet', '紅地毯', 'rug', [2, 2], 1, 'cloth:3'),
  D('floorD', 'blueCarpet', '藍地毯', 'rug', [2, 2], 1, 'cloth:3'),
  D('floorD', 'checkCarpet', '格紋地毯', 'rug', [2, 1], 1, 'cloth:3'),
  D('floorD', 'shellTile', '貝殼磁磚', 'floorTile', [1, 1], 2, 'shell:3'),
  D('floorD', 'starFloor', '星空地板', 'floorTile', [1, 1], 3, 'dark:2,ice:2'),
  // 牆面
  D('wallD', 'woodWall', '木牆', 'wallTile', [1, 1], 0, 'wood:2', { src: 'default' }),
  D('wallD', 'stoneWall', '石牆', 'wallTile', [1, 1], 0, 'stone:3'),
  D('wallD', 'floralPaper', '花紋壁紙', 'wallTile', [1, 1], 1, 'cloth:2'),
  D('wallD', 'stripePaper', '條紋壁紙', 'wallTile', [1, 1], 1, 'cloth:2'),
  D('wallD', 'brickWall', '紅磚牆', 'wallTile', [1, 1], 0, 'clay:3'),
  D('wallD', 'oceanPaper', '海洋壁紙', 'wallTile', [1, 1], 2, 'shell:2,cloth:1'),
  D('wallD', 'gearPaper', '齒輪壁紙', 'wallTile', [1, 1], 2, 'gear:2,cloth:1'),
  D('wallD', 'castleWall', '城堡石牆', 'wallTile', [1, 1], 2, 'stone:4,dark:1'),
  D('wallD', 'starPaper', '星星壁紙', 'wallTile', [1, 1], 2, 'cloth:2,ice:1'),
  D('wallD', 'sandstoneWall', '砂岩牆', 'wallTile', [1, 1], 1, 'sand:3'),
  // 小擺設
  D('small', 'vase', '花瓶', 'small', [1, 1], 0, 'clay:2'),
  D('small', 'pottedPlant', '盆栽', 'small', [1, 1], 0, 'clay:1,wood:1'),
  D('small', 'cactus', '仙人掌', 'small', [1, 1], 0, 'sand:1,clay:1'),
  D('small', 'deskLamp', '檯燈', 'small', [1, 1], 1, 'ice:1,wood:1'),
  D('small', 'candlestick', '燭台', 'small', [1, 1], 0, 'stone:1,clay:1'),
  D('small', 'mantelClock', '座鐘', 'small', [1, 1], 1, 'wood:2,gear:1'),
  D('small', 'hourglass', '沙漏', 'small', [1, 1], 1, 'sand:2,wood:1'),
  D('small', 'globe', '地球儀', 'small', [1, 1], 1, 'wood:2,cloth:1'),
  D('small', 'bookPile', '書堆', 'small', [1, 1], 0, 'cloth:1,wood:1'),
  D('small', 'teaSet', '茶具組', 'small', [1, 1], 1, 'clay:3'),
  D('small', 'fruitBowl', '水果盤', 'small', [1, 1], 0, 'clay:1,wood:1'),
  D('small', 'cakeStand', '蛋糕架', 'small', [1, 1], 1, 'ice:1,clay:1'),
  D('small', 'musicBox', '音樂盒', 'small', [1, 1], 2, 'wood:2,gear:2'),
  D('small', 'photoFrame', '相框', 'small', [1, 1], 0, 'wood:1,ice:1'),
  D('small', 'telescope', '望遠鏡', 'small', [1, 1], 2, 'wood:2,ice:2,gear:1'),
  D('small', 'fishTank', '魚缸', 'small', [1, 1], 2, 'ice:4,shell:1'),
  D('small', 'birdcage', '鳥籠', 'small', [1, 1], 1, 'wood:2,feather:1'),
  D('small', 'teddyBear', '玩偶熊', 'small', [1, 1], 1, 'cloth:3'),
  D('small', 'piggyBank', '存錢筒', 'small', [1, 1], 0, 'clay:2'),
  D('small', 'crystalBall', '水晶球', 'small', [1, 1], 3, 'ice:3,dark:1'),
  // 牆飾
  D('wallArt', 'landscapePainting', '風景畫', 'wall', [1, 1], 0, 'wood:1,cloth:2'),
  D('wallArt', 'portrait', '肖像畫', 'wall', [1, 1], 1, 'wood:1,cloth:2'),
  D('wallArt', 'worldMap', '世界地圖', 'wall', [2, 1], 1, 'cloth:2'),
  D('wallArt', 'wallClock', '掛鐘', 'wall', [1, 1], 1, 'wood:1,gear:1'),
  D('wallArt', 'crest', '盾牌徽章', 'wall', [1, 1], 1, 'wood:2,stone:1'),
  D('wallArt', 'crossedSwords', '交叉雙劍', 'wall', [1, 1], 2, 'stone:2,wood:1'),
  D('wallArt', 'woodWindow', '木窗', 'wall', [1, 1], 0, 'wood:2,ice:1'),
  D('wallArt', 'roundWindow', '圓窗', 'wall', [1, 1], 1, 'wood:1,ice:2'),
  D('wallArt', 'curtain', '窗簾', 'wall', [1, 1], 0, 'cloth:2'),
  D('wallArt', 'banner', '旗幟', 'wall', [1, 1], 0, 'cloth:2'),
  D('wallArt', 'wreath', '花圈', 'wall', [1, 1], 0, 'wood:1,cloth:1'),
  D('wallArt', 'mirror', '鏡子', 'wall', [1, 1], 1, 'ice:2,wood:1'),
  D('wallArt', 'certificate', '獎狀', 'wall', [1, 1], 0, 'wood:1,cloth:1'),
  D('wallArt', 'wallSconce', '壁燈', 'wall', [1, 1], 1, 'stone:1,ice:1'),
  D('wallArt', 'windChime', '風鈴', 'wall', [1, 1], 1, 'shell:1,ice:1'),
  // 燈具
  D('light', 'chandelier', '吊燈', 'small', [1, 1], 2, 'ice:3,gear:1'),
  D('light', 'floorLamp', '立燈', 'small', [1, 1], 0, 'wood:2,cloth:1'),
  D('light', 'paperLantern', '紙燈籠', 'wall', [1, 1], 0, 'cloth:1,wood:1'),
  D('light', 'fairyLights', '星星燈串', 'wall', [2, 1], 1, 'ice:1,cloth:1'),
  D('light', 'magicLamp', '魔法燈', 'small', [1, 1], 2, 'ice:2,dark:1'),
  // 庭院造景
  D('garden', 'woodFence', '木籬笆', 'floor', [1, 1], 0, 'wood:1', { yard: true }),
  D('garden', 'whiteFence', '白柵欄', 'floor', [1, 1], 0, 'wood:1,clay:1', { yard: true }),
  D('garden', 'flowerBed', '花圃', 'floor', [1, 1], 0, 'wood:1,clay:1', { yard: true }),
  D('garden', 'stonePath', '石板路', 'rug', [1, 1], 0, 'stone:1', { yard: true }),
  D('garden', 'streetLamp', '路燈', 'floor', [1, 1], 1, 'stone:2,ice:1', { yard: true }),
  D('garden', 'mailbox', '信箱', 'floor', [1, 1], 0, 'wood:2', { yard: true }),
  D('garden', 'scarecrowDecor', '稻草人', 'floor', [1, 1], 0, 'wood:2,cloth:1', { yard: true }),
  D('garden', 'fountain', '噴水池', 'floor', [2, 2], 2, 'stone:10,ice:2', { yard: true }),
  D('garden', 'birdbath', '鳥浴盆', 'floor', [1, 1], 1, 'stone:3', { yard: true }),
  D('garden', 'stoneLantern', '石燈籠', 'floor', [1, 1], 1, 'stone:4', { yard: true }),
  D('garden', 'flowerArch', '花拱門', 'rug', [2, 1], 2, 'wood:4,cloth:1', { yard: true }),
  D('garden', 'woodBridge', '小木橋', 'rug', [2, 1], 1, 'wood:6', { yard: true }),
  D('garden', 'pond', '池塘', 'floor', [2, 2], 2, 'stone:4,shell:2', { yard: true }),
  D('garden', 'windmill', '風車', 'floor', [1, 1], 3, 'wood:8,gear:2,cloth:2', { yard: true }),
  D('garden', 'mushroomLamp', '蘑菇燈', 'floor', [1, 1], 1, 'wood:1,ice:1', { yard: true }),
  // 區域主題（只在對應區域掉落製作書）
  D('theme', 'slimeCushion', '史萊姆抱枕', 'small', [1, 1], 1, 'wood:2,cloth:2', { src: 'grass' }),
  D('theme', 'mushroomStool', '蘑菇凳', 'floor', [1, 1], 1, 'stone:2,wood:1', { src: 'easy' }),
  D('theme', 'lavaLamp', '熔岩石燈', 'small', [1, 1], 2, 'clay:3', { src: 'medium' }),
  D('theme', 'mimicBank', '寶箱怪存錢筒', 'small', [1, 1], 2, 'clay:2,wood:2', { src: 'medium' }),
  D('theme', 'iceSculpture', '冰晶雕塑', 'floor', [1, 1], 2, 'ice:6', { src: 'hard' }),
  D('theme', 'cloudLamp', '雲朵燈', 'small', [1, 1], 2, 'feather:3,ice:1', { src: 'sky' }),
  D('theme', 'featherCharm', '羽毛掛飾', 'wall', [1, 1], 1, 'feather:3', { src: 'sky' }),
  D('theme', 'skullCandle', '骷髏燭台', 'small', [1, 1], 1, 'bone:3', { src: 'necro' }),
  D('theme', 'scarabCharm', '聖甲蟲飾品', 'small', [1, 1], 2, 'sand:4', { src: 'desert' }),
  D('theme', 'coralDecor', '珊瑚擺設', 'small', [1, 1], 2, 'shell:4', { src: 'sea' }),
  D('theme', 'gearClock', '齒輪擺鐘', 'floor', [1, 1], 2, 'gear:6,wood:2', { src: 'clock' }),
  D('theme', 'dragonEgg', '龍蛋擺飾', 'small', [1, 1], 3, 'scale:4', { src: 'dragon' }),
  D('theme', 'darkChandelier', '暗晶吊燈', 'small', [1, 1], 3, 'dark:4,ice:2', { src: 'demon' }),
  D('theme', 'abyssEye', '深淵之眼', 'small', [1, 1], 3, 'dark:6', { src: 'expert' }),
  // Boss 主題（只有該 Boss 會掉製作書）
  D('boss', 'treantBonsai', '古樹守衛盆景', 'small', [1, 1], 3, 'wood:8,clay:2', { src: 'treant' }),
  D('boss', 'golemStatue', '熔岩魔像雕像', 'floor', [1, 1], 3, 'clay:8,stone:4', { src: 'golem' }),
  D('boss', 'lichStaff', '霜之巫妖冰杖', 'wall', [1, 1], 3, 'ice:8', { src: 'lich' }),
  D('boss', 'bullHead', '巨角牛王頭像', 'wall', [1, 1], 3, 'wood:8,stone:2', { src: 'bullKing' }),
  D('boss', 'thunderScroll', '雷鳥羽毛掛軸', 'wall', [1, 1], 3, 'feather:8,cloth:2', { src: 'thunderbird' }),
  D('boss', 'necroTome', '死靈法師魔法書', 'small', [1, 1], 3, 'bone:8,cloth:2', { src: 'necromancer' }),
  D('boss', 'pharaohStatue', '法老王雕像', 'floor', [1, 1], 3, 'sand:10', { src: 'pharaoh' }),
  D('boss', 'krakenSpecimen', '深海巨妖觸手標本', 'floor', [1, 1], 3, 'shell:10,ice:2', { src: 'kraken' }),
  D('boss', 'titanModel', '蒸汽巨像模型', 'floor', [1, 1], 3, 'gear:10', { src: 'steamTitan' }),
  D('boss', 'dragonHead', '炎龍頭標本', 'wall', [1, 1], 3, 'scale:10', { src: 'redDragon' }),
  D('boss', 'demonThrone', '魔王王座', 'floor', [2, 2], 3, 'dark:12,cloth:4', { src: 'demonLord' }),
];

/** 家具與裝飾目錄（依代碼查詢）。 */
export const HOME_ITEMS = Object.fromEntries([...FURNITURE, ...DECOR].map((it) => [it.key, it]));

/** 目錄代碼（家具在前、裝飾在後）。 */
export const HOME_ITEM_KEYS = Object.keys(HOME_ITEMS);

/** 新角色預設學會的配方。 */
export const DEFAULT_RECIPES = HOME_ITEM_KEYS.filter((k) => HOME_ITEMS[k].src === 'default');

/**
 * 作物：tree 為果樹（收成後回到第 2 階段重新結果，regrow 小時），否則收成後田地清空；
 * hours 為從種下到成熟的小時數（分 3 個階段）；yield 為收成數量範圍；seedPrice 為商店種子售價；
 * seedWeight 為打怪掉落種子時的權重；bonus 為果樹收成時額外掉落木材的機率。
 */
export const CROPS = {
  apple: { name: '蘋果樹', produce: '蘋果', tree: true, hours: 6, regrow: 4, yield: [2, 3], seedPrice: 200, seedWeight: 2, bonus: 0.3 },
  orange: { name: '橘子樹', produce: '橘子', tree: true, hours: 6, regrow: 4, yield: [2, 3], seedPrice: 200, seedWeight: 2, bonus: 0.3 },
  grape: { name: '葡萄藤', produce: '葡萄', tree: true, hours: 8, regrow: 5, yield: [3, 4], seedPrice: 300, seedWeight: 1, bonus: 0.2 },
  redHerb: { name: '紅草', produce: '紅草', tree: false, hours: 2, yield: [2, 3], seedPrice: 20, seedWeight: 6 },
  blueHerb: { name: '藍草', produce: '藍草', tree: false, hours: 3, yield: [2, 3], seedPrice: 30, seedWeight: 4 },
  antidote: { name: '解毒草', produce: '解毒草', tree: false, hours: 3, yield: [2, 3], seedPrice: 30, seedWeight: 4 },
  starflower: { name: '星光花', produce: '星光花', tree: false, hours: 8, yield: [1, 2], seedPrice: 150, seedWeight: 1 },
  cotton: { name: '棉花', produce: '棉花', tree: false, hours: 4, yield: [2, 3], seedPrice: 30, seedWeight: 3 },
};

/** 作物代碼。 */
export const CROP_KEYS = Object.keys(CROPS);

/** 新角色預設的種子。 */
export const START_SEEDS = { apple: 2 };

/**
 * 獎勵禮包（等級 1～5）額外開出的家園物品：fertilizer 為肥料數量；seeds 為種子數量；recipeChance 為開出一本一般家具製作書的機率。
 * 肥料只能從其他學習遊戲的禮包取得，延續「靠學習換獎勵」的設計。
 */
export const HOME_GIFT = { fertilizer: [1, 1, 2, 2, 3], seeds: [1, 2, 2, 3, 3], recipeChance: [0.1, 0.15, 0.2, 0.3, 0.4] };

/**
 * 土地等級：house 為房子室內大小（寬、高，不含牆）；庭院與室內同寬、高 YARD_ROWS 格，最下面一排是田地；plots 為庭院田地數；price 為擴建金幣；mats 為擴建材料；
 * need 為解鎖條件（level 角色等級、rebirth 轉職次數、area 已解鎖區域）。
 */
/** 庭院的高度（格）。 */
export const YARD_ROWS = 4;

export const LAND = [
  { house: [6, 5], plots: 2, price: 0, mats: {}, need: {} },
  { house: [8, 6], plots: 4, price: 2000, mats: { wood: 20, stone: 10 }, need: { level: 10 } },
  { house: [10, 8], plots: 6, price: 6000, mats: { wood: 40, stone: 25 }, need: { level: 20 } },
  { house: [12, 10], plots: 9, price: 15000, mats: { wood: 60, stone: 40, clay: 20 }, need: { rebirth: 1 } },
  { house: [14, 12], plots: 12, price: 40000, mats: { wood: 100, stone: 60, clay: 30 }, need: { area: 'demon' } },
];
