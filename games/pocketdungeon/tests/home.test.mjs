// 家園規則的單元測試：目錄數量、存檔修復、材料與配方、商店、製作、禮包與地城掉落。

import test from 'node:test';
import assert from 'node:assert/strict';
import * as home from '../src/js/pd/home.js';
import { HOME_ITEMS, HOME_ITEM_KEYS, HOME_MATS, HOME_MAT_KEYS, HOME_MAX, DEFAULT_RECIPES, CROPS, LAND, HOME_SHOP, HOME_GIFT } from '../src/js/pd/homeData.js';
import { AREAS, AREA_KEYS, BOSSES } from '../src/js/pd/data.js';
import { seededRng } from '../src/js/pd/rules.js';
import { openGift } from '../src/js/pd/village.js';
import { World } from '../src/js/pd/world.js';

/**
 * 建立測試用角色（含家園）。
 * @returns {object} 角色。
 */
function hero() {
  return {
    id: 'warrior', cls: 'warrior', name: 't', level: 5, xp: 0, gold: 5000, bag: [], bagSize: 20, equipped: { weapon: null, offhand: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null },
    potions: 0, scroll: 0, cures: 0, mats: {}, books: {}, skillBooks: {}, gifts: {}, shards: {}, tickets: {}, unlocked: { grass: 1 }, shop: null, home: home.newHome(),
    stats: { playMs: 0, kills: 0, maxHit: 0, legends: 0, deaths: 0, runs: 0 },
  };
}

test('目錄有家具 50 種、裝飾 100 種，材料與來源都合法', () => {
  const items = Object.values(HOME_ITEMS);
  assert.equal(items.filter((i) => i.type === 'furniture').length, 50);
  assert.equal(items.filter((i) => i.type === 'decor').length, 100);
  assert.equal(new Set(items.map((i) => i.name)).size, items.length, '名稱不重複');
  // 牧場動物與節慶裝飾另外計算。
  assert.equal(items.filter((i) => i.type === 'animal').length, 4);
  assert.equal(items.filter((i) => i.type === 'festival').length, 3);
  for (const it of items) {
    for (const [m, n] of Object.entries(it.mats)) assert.ok(HOME_MAT_KEYS.includes(m) && n > 0, `${it.key} 材料 ${m}`);
    assert.ok(['default', 'any', 'ranch', 'festival'].includes(it.src) || AREAS[it.src] || BOSSES[it.src], `${it.key} 來源 ${it.src}`);
  }
  // 每隻 Boss 一件主題裝飾；每個區域至少一件主題裝飾。
  for (const b of Object.keys(BOSSES)) assert.ok(home.bossRecipe(b), `${b} 主題裝飾`);
  for (const a of AREA_KEYS) assert.ok(items.some((i) => i.src === a), `${a} 主題裝飾`);
  // 每個地城區域都有對應的家園材料（深淵除外）。
  for (const a of AREA_KEYS.filter((k) => k !== 'expert')) assert.ok(HOME_MATS.some((m) => m.area === a), `${a} 材料`);
});

test('新角色的家園：預設配方、起始種子與工作台', () => {
  const h = home.newHome();
  assert.deepEqual(h.recipes, DEFAULT_RECIPES);
  assert.ok(h.recipes.includes('workbench'));
  assert.equal(h.seeds.apple, 2);
  assert.equal(h.placed[0].id, 'workbench');
});

test('修復家園資料：未知與不合法的內容移除，擺放錯誤的家具收回庫存', () => {
  assert.equal(home.normalizeHome(undefined).level, 1);
  const h = home.normalizeHome({
    level: 9, mats: { wood: 5, gold: 3, stone: -1, clay: 1.5 }, recipes: ['sofa', 'nope'], seeds: { apple: 1, x: 2 }, fertilizer: -3,
    placed: [{ id: 'woodChair', x: 1, y: 2, rot: 0 }, { id: 'woodTable', x: -1, y: 0, rot: 0 }, { id: 'bad', x: 0, y: 0, rot: 0 }],
    tiles: { floor: 'woodWall', wall: 'stoneWall' },
  });
  assert.equal(h.level, 1);
  assert.deepEqual(h.mats, { wood: 5 });
  assert.ok(h.recipes.includes('sofa') && !h.recipes.includes('nope') && h.recipes.includes('woodChair'));
  assert.deepEqual(h.seeds, { apple: 1 });
  assert.equal(h.fertilizer, 0);
  assert.deepEqual(h.placed.map((p) => p.id), ['woodChair']);
  assert.equal(h.inventory.woodTable, 1);
  assert.equal(h.tiles.floor, 'woodFloor', '牆面樣式不能當地板');
  assert.equal(h.tiles.wall, 'stoneWall');
});

test('家園材料有上限，超過的部分不加入', () => {
  const ch = hero();
  assert.equal(home.addHomeMat(ch, 'wood', 10), 10);
  assert.equal(home.addHomeMat(ch, 'wood', HOME_MAX), HOME_MAX - 10);
  assert.equal(ch.home.mats.wood, HOME_MAX);
  assert.equal(home.addHomeMat(ch, 'wood', -HOME_MAX), -HOME_MAX);
  assert.equal(ch.home.mats.wood, undefined);
});

test('取得製作書：沒學過就學會，學過的自動賣出', () => {
  const ch = hero();
  const r1 = home.gainRecipe(ch, 'sofa');
  assert.ok(r1.learned && home.knowsRecipe(ch, 'sofa'));
  const gold = ch.gold;
  const r2 = home.gainRecipe(ch, 'sofa');
  assert.equal(r2.learned, false);
  assert.equal(ch.gold - gold, HOME_SHOP.recipeSell[HOME_ITEMS.sofa.rarity]);
});

test('掉落抽選：區域材料、深淵混合、盡量抽沒學過的配方', () => {
  const rng = seededRng(3);
  assert.equal(home.rollHomeMat('grass', rng), 'wood');
  assert.equal(home.rollHomeMat('clock', rng), 'gear');
  const abyss = new Set(Array.from({ length: 200 }, () => home.rollHomeMat('expert', rng)));
  assert.ok(abyss.has('dark') && abyss.size > 3);
  const ch = hero();
  for (let i = 0; i < 300; i++) {
    const k = home.rollRecipe(ch, 'grass', rng);
    const it = HOME_ITEMS[k];
    assert.ok(it.src === 'any' || it.src === 'grass', `${k} 來源`);
    home.gainRecipe(ch, k);
  }
  // 一般配方與草原主題配方都學完之後，仍然可以抽（抽到學過的）。
  const general = HOME_ITEM_KEYS.filter((k) => ['any', 'grass'].includes(HOME_ITEMS[k].src));
  assert.ok(general.every((k) => home.knowsRecipe(ch, k)), '300 次內學完');
  assert.ok(HOME_ITEMS[home.rollRecipe(ch, 'grass', rng)]);
  assert.ok(CROPS[home.rollSeed(rng)]);
});

test('商店：每天刷新陳列、買製作書直接學會、買材料與種子扣金幣', () => {
  const ch = hero();
  const shop = home.homeShop(ch, '2026-11-06', seededRng(1));
  assert.equal(shop.recipes.length, HOME_SHOP.recipes);
  assert.ok(shop.recipes.every((k) => HOME_ITEMS[k].rarity <= 1 && !home.knowsRecipe(ch, k)));
  assert.equal(home.homeShop(ch, '2026-11-06', seededRng(2)), shop, '同一天不刷新');
  const key = shop.recipes[0];
  const gold = ch.gold;
  assert.ok(home.buyRecipe(ch, 0).ok);
  assert.ok(home.knowsRecipe(ch, key));
  assert.equal(gold - ch.gold, home.recipePrice(key));
  assert.ok(home.buyHomeMat(ch, 'wood', 10).ok);
  assert.equal(ch.home.mats.wood, 10);
  assert.equal(home.buyHomeMat(ch, 'gear', 1).ok, false, '商店不賣齒輪');
  assert.ok(home.buySeed(ch, 'redHerb').ok);
  assert.equal(ch.home.seeds.redHerb, 1);
  ch.gold = 0;
  assert.equal(home.buyHomeMat(ch, 'stone', 1).ok, false);
});

test('製作：需要配方、材料與金幣，做好放進庫存；地板樣式不重複製作', () => {
  const ch = hero();
  assert.equal(home.craftHomeItem(ch, 'sofa').ok, false, '還沒學會');
  assert.ok(home.craftMissing(ch, 'woodChair').some((m) => m.includes('木材')));
  home.addHomeMat(ch, 'wood', 10);
  const gold = ch.gold;
  assert.ok(home.craftHomeItem(ch, 'woodChair').ok);
  assert.equal(ch.home.inventory.woodChair, 1);
  assert.equal(ch.home.mats.wood, 8);
  assert.equal(gold - ch.gold, HOME_ITEMS.woodChair.gold);
  assert.equal(home.craftHomeItem(ch, 'woodFloor').ok, false, '已經在使用木地板');
});

test('獎勵禮包也會開出肥料與種子', () => {
  const ch = hero();
  ch.gifts = { 3: 1 };
  const r = openGift(ch, 3, seededRng(5));
  assert.ok(r.ok);
  assert.equal(r.home.fertilizer, 2);
  assert.equal(Object.values(r.home.seeds).reduce((a, b) => a + b, 0), 2);
  assert.equal(ch.home.fertilizer, 2);
});

test('獎勵禮包開出家園材料：數量依禮包等級，種類只來自已解鎖地城的材料與布料', () => {
  const ch = hero();
  ch.unlocked = { grass: 1, easy: 1 };
  ch.gifts = { 5: 30 };
  const allowed = new Set(['wood', 'stone', 'cloth']);
  const seen = new Set();
  for (let i = 0; i < 30; i++) {
    // 清空裝備材料與技能書碎片，避免背包塞滿（這裡只看家園材料）。
    ch.mats = {};
    ch.shards = {};
    const before = { ...ch.home.mats };
    const r = openGift(ch, 5, seededRng(100 + i));
    assert.ok(r.ok);
    const n = Object.values(r.home.mats).reduce((a, b) => a + b, 0);
    assert.equal(n, HOME_GIFT.mats[4]);
    for (const [m, c] of Object.entries(r.home.mats)) {
      assert.ok(allowed.has(m), `不該開出 ${m}`);
      assert.equal((ch.home.mats[m] || 0) - (before[m] || 0), c);
      seen.add(m);
    }
  }
  assert.deepEqual([...seen].sort(), ['cloth', 'stone', 'wood']);
  // 解鎖龍之峽谷後也可能開到龍鱗。
  ch.unlocked.dragon = 1;
  const pool = new Set();
  for (let i = 0; i < 200; i++) pool.add(home.rollGiftMat(ch, seededRng(i)));
  assert.ok(pool.has('scale'));
  assert.ok(!pool.has('gear'), '還沒解鎖機械工坊');
});

test('地城：打怪掉落家園材料，Boss 有機會掉主題裝飾製作書，撿起來會加入家園', () => {
  const ch = hero();
  ch.unlocked = { medium: 1 };
  const world = new World(ch, { area: 'medium', depth: 1, seed: 7 }, seededRng(9));
  let mats = 0;
  for (let i = 0; i < 200; i++) {
    world.pickups = [];
    world.dropHome({ x: world.player.x, y: world.player.y, boss: false, elite: true, type: 'goblin' }, 'elite');
    for (const it of world.pickups) if (it.kind === 'homeMat') {
      assert.equal(it.mat, 'clay');
      mats += it.n;
    }
    for (const it of world.pickups) Object.assign(it, { x: world.player.x, y: world.player.y });
    world.updatePickups(1);
  }
  assert.ok(mats > 0);
  assert.equal(ch.home.mats.clay, Math.min(HOME_MAX, mats));
  world.pickups = [];
  world.dropHome({ x: world.player.x, y: world.player.y, boss: true, evolved: true, type: 'golem' }, 'boss');
  assert.ok(world.pickups.some((it) => it.kind === 'recipe' && it.recipe === 'golemStatue'), '進化 Boss 必掉主題裝飾製作書');
  for (const it of world.pickups) Object.assign(it, { x: world.player.x, y: world.player.y });
  world.updatePickups(1);
  assert.ok(home.knowsRecipe(ch, 'golemStatue'));
  assert.equal(LAND.length, 5);
});

test('家裡配置：室內、牆面、門、庭院與田地', () => {
  const l = home.homeLayout(1);
  assert.deepEqual(l.house, { x: 1, y: 1, w: 6, h: 5 });
  assert.deepEqual(l.door, { x: 4, y: 6 });
  assert.equal(l.yard.y, 7);
  assert.equal(l.plots.length, 2);
  assert.ok(l.plots.every((p) => p.y === l.yard.y + l.yard.h - 1));
  assert.equal(home.homeLayout(5).plots.length, 12);
});

test('擺放規則：區域、範圍、重疊、門口、桌面與走得到', () => {
  const ch = hero();
  const h = ch.home;
  h.inventory = { woodChair: 3, woodTable: 2, vase: 2, landscapePainting: 1, redCarpet: 1, bench: 1, woodFloor: 1 };
  assert.equal(home.placeCheck(h, 'woodChair', 'house', 0, 0).ok, false, '工作台的位置');
  assert.ok(home.placeItem(ch, 'woodChair', 'house', 2, 0).ok);
  assert.equal(h.inventory.woodChair, 2);
  assert.equal(home.placeCheck(h, 'woodChair', 'house', 6, 0).reason, '超出範圍了');
  assert.equal(home.placeCheck(h, 'bench', 'house', 0, 3).reason, '這個要放在庭院');
  assert.ok(home.placeCheck(h, 'bench', 'yard', 0, 0).ok);
  assert.equal(home.placeCheck(h, 'woodChair', 'yard', 0, 0).ok, false, '室內家具不能放庭院');
  assert.equal(home.placeCheck(h, 'landscapePainting', 'house', 1, 1).ok, false, '牆飾要掛牆上');
  assert.ok(home.placeItem(ch, 'landscapePainting', 'wall', 3, 0).ok);
  assert.equal(home.placeCheck(h, 'woodChair', 'house', 3, 4).reason, '不能擋住門口');
  assert.ok(home.placeCheck(h, 'redCarpet', 'house', 2, 3).ok, '地毯可以鋪在門前');
  // 小擺設：可以放在木桌上，不能放在木椅上。
  assert.ok(home.placeItem(ch, 'woodTable', 'house', 4, 2).ok);
  assert.ok(home.placeItem(ch, 'vase', 'house', 4, 2).ok);
  assert.equal(home.placeCheck(h, 'vase', 'house', 4, 2).reason, '這裡已經有擺設了');
  assert.match(home.placeCheck(h, 'vase', 'house', 2, 0).reason, /上面不能放東西/);
  // 收回桌子時，上面的花瓶一起收回。
  const idx = h.placed.findIndex((p) => p.id === 'woodTable');
  home.storeItem(ch, idx);
  assert.equal(h.inventory.vase, 2);
  assert.ok(!h.placed.some((p) => p.id === 'vase'));
  // 不能把室內隔成走不到的區塊：在第 1 排擺滿椅子，右上角會被圍住。
  h.inventory.woodChair = 9;
  const r = [1, 2, 3, 4, 5].map((x) => home.placeItem(ch, 'woodChair', 'house', x, 1));
  assert.ok(r.some((x) => !x.ok && x.message.includes('擋住路')));
});

test('移動、翻轉、套用樣式、找格子上的物件與找路', () => {
  const ch = hero();
  const h = ch.home;
  h.inventory = { woodChair: 1, stoneTile: 1 };
  assert.ok(home.placeItem(ch, 'woodChair', 'house', 3, 0).ok);
  const i = h.placed.length - 1;
  assert.ok(home.moveItem(ch, i, 'house', 5, 0).ok);
  assert.equal(home.moveItem(ch, i, 'house', 0, 0).ok, false, '工作台的位置');
  assert.ok(home.flipItem(ch, i).ok);
  assert.equal(h.placed[i].rot, 1);
  const l = home.homeLayout(1);
  assert.equal(home.placedAt(h, l.house.x + 5, l.house.y), i);
  assert.equal(home.placedAt(h, l.house.x + 1, l.house.y), 0, '工作台佔 2 格');
  assert.ok(home.applyTile(ch, 'stoneTile').ok);
  assert.equal(h.tiles.floor, 'stoneTile');
  assert.equal(home.applyTile(ch, 'marble').ok, false);
  assert.deepEqual(home.areaAt(l, 1, 0), { at: 'wall', x: 0, y: 0 });
  assert.equal(home.areaAt(l, 0, 3), null);
  const grid = home.walkGrid(l, h.placed);
  const path = home.findPath(grid, l.door, { x: l.house.x + 5, y: l.house.y });
  assert.ok(path && path.length > 0, '走到椅子旁邊');
  const last = path[path.length - 1];
  assert.equal(Math.abs(last.x - (l.house.x + 5)) + Math.abs(last.y - l.house.y), 1);
});
