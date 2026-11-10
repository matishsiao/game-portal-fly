// 多物件設計圖（一張圖排多個物件）的批次設定：每個批次（set）有設計圖資料夾、輸出檔、各張設計圖依序排列的物件代碼，
// 以及取得目前圖片的方式（source，用來產生給 Codex 的參考圖，並量出新圖要放進的範圍）。
// 物件代碼中的 @ 後面是變化或階段（例如 apple@0 為蘋果第 1 階段、woodFloor@1 為木地板第 2 種變化）。

/**
 * 把清單每 n 個切成一組。
 * @param {string[]} list 清單。
 * @param {number} n 每組數量。
 * @returns {string[][]} 分組。
 */
function chunk(list, n) {
  const out = [];
  for (let i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
  return out;
}

/** 地城掉落物與介面道具圖示（寶箱改用 propSprites、家園材料共用家園圖示、入場卷只畫一張再依等級換色）。 */
const DROPS = ['coin', 'potion', 'cure', 'bag', 'pouch', 'key', 'book', 'skillbook',
  'shield', 'sword', 'helmet', 'armor', 'boots', 'ring', 'dagger', 'daggers',
  'fist', 'spear', 'bow', 'staff', 'axe', 'gift', 'shard', 'star',
  'iron', 'steel', 'mithril', 'blueprint', 'seedBag', 'meat', 'ticket1', 'gem-atk',
  'gem-hp', 'gem-def', 'gem-spd', 'gem-leech', 'gem-shield', 'gem-ward'];

/** 家園圖示（ICON_ART）與家園材料（MAT_ART）。 */
const HOME_ICONS = ['seed', 'fertilizer', 'blueprint', 'apple', 'orange', 'grape', 'redHerb', 'blueHerb', 'antidote', 'starflower', 'cotton', 'hay',
  'pineapple', 'tea', 'rice', 'mango', 'egg', 'milk', 'wool', 'honey', 'meat', 'dyeRed', 'dyeOrange', 'dyeGreen', 'dyeBlue', 'dyePurple',
  'appleJuice', 'orangeJuice', 'grapeJuice', 'omelette', 'pudding', 'cheese', 'honeyCake', 'meatStew', 'riceBall', 'pineappleCake', 'mangoIce', 'oolongTea',
  'wood', 'stone', 'clay', 'ice', 'feather', 'bone', 'sand', 'shell', 'gear', 'scale', 'dark', 'cloth'];

/** 作物（每種 3 個生長階段）。 */
const CROPS = ['apple', 'redHerb', 'orange', 'grape', 'blueHerb', 'antidote', 'starflower', 'cotton', 'hay', 'pineapple', 'tea', 'rice', 'mango'];

/** 沒有動態幀的家具與裝飾，依佔用格數分組（有動態幀的維持程式繪製）。 */
const FURN_1x1 = ['woodChair', 'woodTable', 'bookcase', 'homeChest', 'vase', 'pottedPlant', 'mantelClock', 'landscapePainting', 'woodWindow', 'streetLamp',
  'pharaohStatue', 'dragonEgg', 'dresser', 'vanity', 'nightstand', 'armchair', 'sofa', 'rockingChair', 'teaTable', 'glassCabinet', 'washbasin', 'screen',
  'towelRack', 'stove', 'oven', 'counter', 'cupboard', 'iceBox', 'sink', 'dishRack', 'herbTable', 'loom', 'desk', 'easel', 'crates', 'shelf', 'weaponRack',
  'armorStand', 'well', 'doghouse', 'cactus', 'deskLamp', 'hourglass', 'globe', 'bookPile', 'teaSet', 'fruitBowl', 'cakeStand', 'photoFrame', 'telescope',
  'teddyBear', 'piggyBank', 'floorLamp', 'paperLantern', 'portrait', 'wallClock', 'crest', 'crossedSwords', 'roundWindow', 'curtain', 'banner', 'wreath',
  'mirror', 'certificate', 'wallSconce', 'woodFence', 'whiteFence', 'flowerBed', 'stonePath', 'mailbox', 'scarecrowDecor', 'birdbath', 'stoneLantern',
  'mushroomLamp', 'slimeCushion', 'mushroomStool', 'mimicBank', 'iceSculpture', 'featherCharm', 'scarabCharm', 'coralDecor', 'treantBonsai', 'lichStaff',
  'bullHead', 'thunderScroll', 'dragonHead', 'springCouplet', 'sachet'];
const FURN_2x1 = ['longSofa', 'workbench', 'piano', 'hammock', 'wardrobe', 'diningTable', 'bathtub', 'barrelRack', 'trophyShelf', 'bench', 'picnicTable',
  'worldMap', 'flowerArch', 'woodBridge', 'checkCarpet'];
const FURN_BIG = ['woodBed', 'bunkBed', 'redCarpet', 'princessBed', 'gazebo', 'blueCarpet'];

/** 家園地板與牆面（每種 2 種變化）。 */
const HOME_TILES = ['woodFloor', 'stoneTile', 'redBrick', 'marble', 'tatami', 'shellTile', 'starFloor', 'woodWall', 'stoneWall', 'floralPaper', 'stripePaper',
  'brickWall', 'oceanPaper', 'gearPaper', 'castleWall', 'starPaper', 'sandstoneWall'];

/** 地城的 12 種區域色調。 */
export const DUNGEON_THEMES = ['moss', 'lava', 'ice', 'grass', 'sky', 'necro', 'desert', 'sea', 'clock', 'dragon', 'demon', 'abyss'];

/**
 * 各批次：dir 設計圖資料夾、out 輸出檔、name 匯出名稱、source 目前圖片的來源、density 新圖密度（相對於目前的圖）、
 * colors 減色數、sheets 各張設計圖（file 檔名、keys 依序的物件代碼、cols 參考圖每列幾個）。
 */
export const SETS = {
  drops: {
    dir: 'design/items', out: 'src/js/pd/itemSprites.js', name: 'ITEM_SPRITES', source: 'item', density: 2, colors: 14,
    sheets: chunk(DROPS, 8).map((keys, i) => ({ file: `drops-${i + 1}.png`, keys, cols: 4 })),
  },
  homeIcons: {
    dir: 'design/home', out: 'src/js/pd/homeArt/iconSprites.js', name: 'ICON_SPRITES', source: 'icon', density: 1, colors: 16,
    sheets: chunk(HOME_ICONS, 8).map((keys, i) => ({ file: `icons-${i + 1}.png`, keys, cols: 4 })),
  },
  crops: {
    dir: 'design/home', out: 'src/js/pd/homeArt/cropSprites.js', name: 'CROP_SPRITES', source: 'crop', density: 1, colors: 16,
    sheets: chunk(CROPS, 2).map((ks, i) => ({ file: `crops-${i + 1}.png`, keys: ks.flatMap((k) => [0, 1, 2].map((s) => `${k}@${s}`)), cols: 3 })),
  },
  furniture: {
    dir: 'design/home', out: 'src/js/pd/homeArt/furnitureSprites.js', name: 'FURNITURE_SPRITES', source: 'furniture', density: 1, colors: 20,
    sheets: [
      ...chunk(FURN_1x1, 8).map((keys, i) => ({ file: `furniture-a${i + 1}.png`, keys, cols: 4 })),
      ...chunk(FURN_2x1, 4).map((keys, i) => ({ file: `furniture-b${i + 1}.png`, keys, cols: 2 })),
      ...chunk(FURN_BIG, 3).map((keys, i) => ({ file: `furniture-c${i + 1}.png`, keys, cols: 3 })),
    ],
  },
  homeTiles: {
    dir: 'design/home', out: 'src/js/pd/homeArt/tileSprites.js', name: 'TILE_SPRITES', source: 'tile', density: 1, colors: 14, exact: true,
    sheets: chunk(HOME_TILES, 3).map((ks, i) => ({ file: `tiles-${i + 1}.png`, keys: ks.flatMap((k) => [`${k}@0`, `${k}@1`]), cols: 2 })),
  },
  dungeonTiles: {
    dir: 'design/dungeon', out: 'src/js/pd/dungeonTiles.js', name: 'DUNGEON_TILES', source: 'dungeon', density: 1, colors: 14, exact: true,
    sheets: [
      ...DUNGEON_THEMES.map((t) => ({
        file: `${t}.png`,
        keys: [`${t}.floor@0`, `${t}.floor@1`, `${t}.floor@2`, `${t}.floor@3`, `${t}.face@0`, `${t}.face@1`, `${t}.face@2`, `${t}.top@0`, `${t}.top@1`, `${t}.pillar`],
        cols: 4,
      })),
      // 第二版地板（大石板、細淡灰縫、平滑石面）：有這張圖時覆蓋上面的地板（後面的設計圖優先）。
      ...DUNGEON_THEMES.filter((t) => t !== 'grass').map((t) => ({ file: `floors-${t}.png`, keys: [0, 1, 2, 3].map((n) => `${t}.floor@${n}`), cols: 4 })),
      // 牆緣（從上方看到的牆頂磚緣，四周的牆都使用）：每區 2 種變化。草原的地面與樹籬頂維持原樣，不做第二版地板與牆緣。
      ...DUNGEON_THEMES.filter((t) => t !== 'grass').map((t) => ({ file: `rim-${t}.png`, keys: [`${t}.rim@0`, `${t}.rim@1`], cols: 2 })),
    ],
  },
};
