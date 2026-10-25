// 物理小知識：每個物件第一次出現時顯示，並收錄在物理圖鑑。文字皆為原創。

/** 小知識清單，依出現順序排列。 */
export const TIPS = [
  {
    key: 'gravity',
    title: '重力',
    sprite: 'player',
    text: '地球會把所有東西往下拉，這個力叫做重力。滾滾和箱子腳下沒有東西撐著時，就會往下掉。',
    example: '手一放開，球就會掉到地上。',
  },
  {
    key: 'box',
    title: '木箱',
    sprite: 'box',
    text: '木箱可以推動。被推到平台邊緣時，會因為重力掉下去，可以拿來填坑或墊腳。',
    example: '搬家時，把箱子推到牆邊比抬起來省力。',
  },
  {
    key: 'ladder',
    title: '梯子',
    sprite: 'ladder',
    text: '滾滾不會跳，要到高處只能爬梯子。在梯子上按上、下就能移動，不會掉下去；但東西會從梯子的空隙掉下去。',
    example: '爬樓梯時，每一階都撐住我們的重量。',
  },
  {
    key: 'stone',
    title: '石塊',
    sprite: 'stone',
    text: '石塊又重又硬，比同樣大小的水重很多。它和木箱一樣可以推，但掉進水裡會沉下去。',
    example: '小石頭丟進池塘會沉到底，樹葉卻會浮在水面。',
  },
  {
    key: 'water',
    title: '浮力',
    sprite: 'water',
    text: '水會把東西往上推，這個力叫做浮力。比水輕的東西（木箱、冰塊）會浮在水面，比水重的東西（石塊）會沉下去。滾滾不會游泳，千萬別掉進水裡！',
    example: '游泳圈裡裝滿空氣，比水輕很多，所以能讓人浮在水上。',
  },
  {
    key: 'balloon',
    title: '氣球',
    sprite: 'balloon',
    text: '氣球裡裝著比空氣輕的氣體，空氣的浮力把它往上推，所以會一直往上飄。氣球能帶起較輕的東西，但抬不動很重的石塊。',
    example: '一不小心放手，氫氣球就會飛上天空。',
  },
  {
    key: 'ice',
    title: '摩擦力',
    sprite: 'ice',
    text: '兩個東西互相摩擦時，會產生阻止滑動的力，叫做摩擦力。冰面非常光滑、摩擦力很小，所以冰塊推一下就會一直滑，直到撞到東西或滑到坑裡才停。',
    example: '在溜冰場上輕輕一推，就能滑得很遠。',
  },
  {
    key: 'crumble',
    title: '衝擊',
    sprite: 'crumble',
    text: '東西從越高的地方掉下來，撞擊的力量越大。易碎磚平常撐得住，但從兩格以上高處掉下來的石塊會把它撞碎。',
    example: '雞蛋放在桌上沒事，從高處掉到地上就會破。',
  },
  {
    key: 'spring',
    title: '彈力',
    sprite: 'spring',
    text: '彈簧被壓扁後會想恢復原狀，產生把東西推開的力，叫做彈力。滾滾站上彈簧會被彈到三格高，在最高點可以往左或往右跳到平台上。',
    example: '在彈跳床上一踩，就能被彈得很高。',
  },
];

/** 關卡文字中的字元與對應的小知識。 */
const CHAR_TIP = { B: 'box', b: 'box', H: 'ladder', S: 'stone', '~': 'water', i: 'water', o: 'balloon', I: 'ice', x: 'crumble', '^': 'spring' };

/**
 * 列出關卡中出現的小知識（第一關另外包含重力）。
 * @param {{id: string, rows: string[]}} level 關卡。
 * @returns {string[]} 小知識鍵，依 TIPS 的順序。
 */
export function tipsForLevel(level) {
  const keys = new Set(level.id === '1-01' ? ['gravity'] : []);
  for (const row of level.rows) for (const ch of row) if (CHAR_TIP[ch]) keys.add(CHAR_TIP[ch]);
  return TIPS.map((t) => t.key).filter((k) => keys.has(k));
}
