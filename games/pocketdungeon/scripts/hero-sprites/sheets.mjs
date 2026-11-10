// 各職業攻擊動作設計圖（design/heroes/）的格子位置與轉換參數。
// 每個方向依序列出各格（F1 為待機），格子為原圖座標 { x, y, w, h }；左邊方向不轉換，遊戲中以右邊鏡像。

/**
 * 由每格的中心 x 與共用的半寬、上下邊界產生一列格子。
 * @param {number[]} xs 各格中心 x。
 * @param {number} half 半寬。
 * @param {number} y0 上緣。
 * @param {number} y1 下緣。
 * @returns {{x: number, y: number, w: number, h: number}[]} 格子。
 */
function row(xs, half, y0, y1) {
  return xs.map((x) => ({ x: x - half, y: y0, w: half * 2, h: y1 - y0 }));
}

/**
 * 各職業的設計圖與轉換參數：
 * file 設計圖檔名；cells 依方向（down 正面、up 背面、right 側面）的格子；
 * hole 被外框包住的白色小洞門檻（原圖像素，0 為不清除）；bg 白底判定 [最低亮度, 最大彩度]；edge 清除外圍灰邊的次數。
 */
export const SHEETS = {
  warrior: {
    file: 'warrior-attack.png',
    cells: {
      up: row([290, 510, 735, 965, 1190, 1410], 112, 12, 222),
      down: row([290, 510, 735, 965, 1190, 1410], 112, 290, 470),
      right: row([290, 510, 735, 965, 1190, 1410], 112, 780, 958),
    },
  },
  archer: {
    file: 'archer-attack.png',
    // 弓與弓弦之間、兩腳之間的白底面積大，門檻放大。
    hole: 3000,
    cells: {
      up: row([90, 230, 370, 512, 653, 795], 68, 80, 350),
      down: row([978, 1120, 1265, 1405, 1548, 1690], 68, 150, 385),
      right: row([978, 1120, 1262, 1405, 1548, 1700], 68, 585, 775),
    },
  },
  mage: {
    file: 'mage-attack.png',
    cells: {
      up: row([80, 202, 322, 446, 568, 690], 60, 190, 505),
      down: row([846, 970, 1094, 1215, 1340, 1462], 60, 285, 512),
      right: row([848, 973, 1098, 1222, 1346, 1470], 60, 730, 905),
    },
  },
  thief: {
    file: 'thief-attack.png',
    cells: {
      up: row([75, 200, 322, 446, 570, 690], 60, 180, 455),
      down: row([845, 965, 1095, 1220, 1345, 1462], 60, 255, 462),
      right: row([845, 966, 1095, 1220, 1345, 1462], 60, 695, 895),
    },
  },
  monk: {
    file: 'monk-attack.png',
    hole: 400,
    cells: {
      up: row([78, 200, 322, 446, 570, 690], 60, 340, 562),
      down: row([846, 968, 1092, 1214, 1338, 1460], 60, 400, 562),
      right: row([846, 968, 1092, 1214, 1338, 1460], 60, 745, 922),
    },
  },
  knight: {
    file: 'knight-attack.png',
    // 銀色盔甲與劍身很亮：只把接近純白的部分當背景、不清白色小洞、灰邊只清一次。
    hole: 0,
    bg: [244, 14],
    edge: 1,
    cells: {
      up: row([68, 175, 283, 390, 497, 605, 712, 818], 53, 188, 392),
      down: row([957, 1063, 1171, 1278, 1386, 1494, 1601, 1707], 53, 205, 395),
      right: row([958, 1065, 1172, 1279, 1386, 1494, 1602, 1707], 53, 585, 768),
    },
  },
};

/**
 * 各 Boss 的設計圖與轉換參數（欄位同 SHEETS）：設計圖（design/bosses/，2172 × 724）一列 4 格（待機 A、待機 B、蓄力、出招），
 * auto 表示依最空的欄自動切格（y 範圍 [上緣, 下緣]，排除下方的編號文字）；Boss 只有面向右，遊戲中左右翻轉。
 * 標題與說明文字在格子上方，轉換時只取每格最大的連通區塊，不會被抓進去。
 * 古樹、魔像、蒸汽巨像的手臂與身體之間圍出大片白底，白洞門檻放大；法老王的白袍是設計的一部分，維持預設。
 */
export const BOSS_SHEETS = Object.fromEntries(
  ['treant', 'golem', 'lich', 'bullKing', 'thunderbird', 'necromancer', 'pharaoh', 'kraken', 'steamTitan', 'redDragon', 'demonLord']
    .map((k) => [k, { file: `${k}.png`, auto: { n: 4, y: [20, 640] }, cells: {}, hole: ['treant', 'golem', 'steamTitan'].includes(k) ? 30000 : 1500 }]),
);

/** 一般怪物的待機圖目標高度（圖像素，密度 2）：小 28、中 34、大 40、巨 46（只有雪怪）。 */
const MONSTER_H = {
  slime: 34, magmaSlime: 34, bat: 28, hornet: 28, imp: 28, jelly: 28, drone: 28,
  skeleton: 34, skelArcher: 34, scarecrow: 34, zombie: 34, mummy: 34, clockSoldier: 34,
  goblin: 28, lizardman: 34, lavaWorm: 34, sandWorm: 40, fireSpirit: 34, boneMage: 34, drake: 34,
  iceWolf: 34, wraith: 34, banshee: 34, succubus: 34, crystal: 40, mushroom: 34, vineflower: 34,
  turretBot: 34, spider: 28, boar: 34, scorpion: 34, bomber: 28, yeti: 46, skyKnight: 40, crab: 40,
  demonKnight: 40, frostSprite: 28, harpy: 34, siren: 34, gargoyle: 40, wyvern: 40, shade: 34,
  voidEye: 34, thunderSprite: 28,
};

/**
 * 各一般怪物的設計圖與轉換參數（design/monsters/，2172 × 724，版面同 Boss）：
 * 一列 4 格（待機 A、待機 B、蓄力、出招），面向右；h 為待機圖目標高度，小型怪物減色到 18 色避免雜點。
 */
export const MONSTER_SHEETS = Object.fromEntries(
  Object.entries(MONSTER_H).map(([k, h]) => [k, { file: `${k}.png`, auto: { n: 4, y: [20, 640] }, cells: {}, hole: 1500, h, colors: h <= 28 ? 18 : 22 }]),
);

/**
 * 地圖裝飾物的設計圖與轉換參數（design/props/，白底、一列 n 格、每格一個狀態）：
 * h 為目標高度、w 為目標寬度（圖像素，密度 2，與地圖離屏畫布相同；有 w 時以寬度換算，用於要填滿一格的樓梯與地刺）；
 * gray 表示灰階圖（遊戲中依區域石色上色），灰邊不清除。背景已校正為純白，只把純白當背景、不清白洞；
 * 背景校正不乾淨的圖以 bg 指定白底判定 [最低亮度, 最大彩度]。
 */
export const PROP_SHEETS = Object.fromEntries(Object.entries({
  barrel: { h: 28 }, crates: { h: 36 }, boulder: { h: 26, gray: true }, statue: { h: 46, gray: true },
  trophy: { h: 30 }, skulls: { h: 22 }, banner: { h: 22, gray: true }, torch: { h: 20 }, bone: { h: 7 },
  rubble: { h: 12, gray: true }, stairs: { w: 32, gray: true }, spikes: { w: 32, n: 2, bg: [236, 12] }, chest: { h: 22, n: 2, H: 887 },
  weaponRack: { h: 26 }, wallShield: { h: 18 }, chains: { h: 18 }, cobweb: { h: 16, gray: true }, brazier: { h: 20 },
  urns: { h: 18 }, sacks: { h: 16 }, rug: { w: 44 }, pillarStump: { h: 22, gray: true }, candles: { h: 16 },
  archway: { w: 96, gray: true, bg: [236, 12] }, steps: { w: 32, gray: true, H: 1254 }, ironGate: { w: 28, gray: true, H: 1536 },
}).map(([k, o]) => [k, {
  file: `${k}.png`, auto: { n: o.n || 1, y: [0, o.H || 99999] }, cells: {}, hole: 0, bg: o.bg || [254, 3], edge: o.gray ? 0 : 1,
  h: o.h, w: o.w, gray: !!o.gray, colors: o.gray ? 10 : 16,
}]));
