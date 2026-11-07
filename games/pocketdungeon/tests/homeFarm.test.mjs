// 家園後續階段的單元測試：擴建、種植與時鐘保護、牧場、藥草台與料理加成、寶箱與展示架、染色、學科連動與市集。

import test from 'node:test';
import assert from 'node:assert/strict';
import * as home from '../src/js/pd/home.js';
import { LAND, CROPS, ANIMALS, RANCH, GROW, HOME_CHEST, MEAT, LINKS, DIARY } from '../src/js/pd/homeData.js';
import { LINK_CARDS } from '../src/js/pd/homeLinks.js';
import { buildLinks } from '../scripts/gen-home-links.mjs';
import { World } from '../src/js/pd/world.js';

const H = 3600e3;

/**
 * 建立測試用角色（含家園）。
 * @returns {object} 角色。
 */
function hero() {
  return {
    id: 'warrior', cls: 'warrior', name: 't', level: 30, xp: 0, gold: 100000, bag: [], bagSize: 20, equipped: { weapon: null, offhand: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null },
    potions: 0, scroll: 0, cures: 0, mats: {}, books: {}, skillBooks: {}, gifts: {}, shards: {}, tickets: {}, unlocked: { grass: 1 }, shop: null, home: home.newHome(),
    stats: { playMs: 0, kills: 0, maxHit: 0, legends: 0, deaths: 0, runs: 0 },
  };
}

/**
 * 產生固定序列的亂數函式。
 * @param {number} v 每次回傳的值。
 * @returns {() => number} 亂數函式。
 */
const fixed = (v) => () => v;

test('學科連動的知識卡清單與題庫一致，每個連動都有卡', () => {
  assert.deepEqual(LINK_CARDS, buildLinks(), '題庫有變動時執行 node scripts/gen-home-links.mjs');
  for (const k of Object.keys(LINKS)) assert.ok(LINK_CARDS[k].length > 0, k);
  for (const k of Object.keys(DIARY)) assert.ok(CROPS[k] || ANIMALS[k], `日記 ${k}`);
});

test('時間推進：依實際時間生長，時鐘往回調不倒扣也不前進，單次最多 24 小時', () => {
  const ch = hero();
  const h = ch.home;
  assert.ok(home.plant(ch, 0, 'apple').ok);
  home.tickHome(ch, 1000);
  assert.equal(home.tickHome(ch, 1000 + 2 * H), 2 * H);
  assert.equal(home.cropStage(h.plots[0]), 1, '6 小時的蘋果過了 2 小時進入成長中');
  assert.equal(home.tickHome(ch, 1000 + 1 * H), 0, '時鐘往回調');
  assert.equal(h.plots[0].grown, 2 * H);
  assert.equal(home.tickHome(ch, 1000 + 2.5 * H), 0.5 * H, '時鐘追上後只計算超過的部分');
  home.tickHome(ch, 1000 + 1000 * H);
  assert.equal(home.cropStage(h.plots[0]), 2, '最多 24 小時，蘋果 6 小時已成熟');
  assert.equal(h.lastSeen, 1000 + 1000 * H);
});

test('種植、施肥、收成：果樹重新結果、藥草收成後清空、需要連動的作物先鎖住', () => {
  const ch = hero();
  const h = ch.home;
  h.seeds = { redHerb: 2, starflower: 1, apple: 1 };
  assert.match(home.plant(ch, 0, 'starflower').message, /自然探險/);
  assert.ok(home.plant(ch, 0, 'redHerb').ok);
  assert.equal(home.plant(ch, 0, 'redHerb').ok, false, '已經種了');
  assert.equal(home.fertilize(ch, 0).ok, false, '沒有肥料');
  h.fertilizer = 2;
  assert.ok(home.fertilize(ch, 0).ok);
  assert.equal(home.cropStage(h.plots[0]), 1);
  assert.ok(home.fertilize(ch, 0).ok);
  assert.equal(home.cropStage(h.plots[0]), 2);
  const r = home.harvest(ch, 0, fixed(0));
  assert.ok(r.ok && r.n === 2 && r.diary === 'redHerb');
  assert.equal(h.produce.redHerb, 2);
  assert.equal(h.plots[0].crop, null);
  assert.equal(home.harvest(ch, 0, fixed(0)).ok, false);
  // 果樹收成後回到成長中，再 regrow 小時結果。
  assert.ok(home.plant(ch, 1, 'apple').ok);
  h.plots[1].grown = home.cropTotalMs('apple');
  const a = home.harvest(ch, 1, fixed(0));
  assert.equal(a.diary, 'apple');
  assert.equal(home.cropStage(h.plots[1]), 1);
  assert.equal(home.cropLeftMs(h.plots[1]), CROPS.apple.regrow * H);
  assert.equal(home.harvest(ch, 1, fixed(0)).ok, false);
  h.plots[1].grown = home.cropTotalMs('apple');
  assert.equal(home.harvest(ch, 1, fixed(0)).diary, null, '日記只記一次');
  assert.ok(home.clearPlot(ch, 1).ok);
  // 解鎖植物連動後可以種星光花。
  home.syncLinks(ch, { science: [LINK_CARDS.plants[0]] });
  assert.ok(home.plant(ch, 1, 'starflower').ok);
});

test('學科連動：收集知識卡解鎖並保留，節慶連動自動學會節慶裝飾', () => {
  const ch = hero();
  assert.deepEqual(home.syncLinks(ch, {}), []);
  assert.deepEqual(home.syncLinks(ch, { social: [LINK_CARDS.festival[0]], science: ['nope'] }), ['festival']);
  assert.ok(['springCouplet', 'sachet', 'moonLantern'].every((k) => home.knowsRecipe(ch, k)));
  assert.deepEqual(home.syncLinks(ch, {}), [], '已解鎖的不會消失也不重複');
  assert.ok(home.linkOn(ch, 'festival') && !home.linkOn(ch, 'market'));
});

test('擴建：檢查條件與材料，扣除後地圖變大、家具位置不變、田地增加', () => {
  const ch = hero();
  const h = ch.home;
  ch.level = 5;
  let need = home.expandNeed(ch);
  assert.ok(need.missing.some((m) => m.includes('等級')) && need.missing.some((m) => m.includes('木材')));
  assert.equal(home.expandHome(ch).ok, false);
  ch.level = 10;
  h.mats = { wood: 25, stone: 10 };
  h.inventory = { woodChair: 1 };
  assert.ok(home.placeItem(ch, 'woodChair', 'house', 4, 1).ok);
  h.seeds.redHerb = 1;
  assert.ok(home.plant(ch, 1, 'redHerb').ok);
  const gold = ch.gold;
  const r = home.expandHome(ch);
  assert.ok(r.ok, r.message);
  assert.equal(h.level, 2);
  assert.equal(ch.gold, gold - LAND[1].price);
  assert.deepEqual(h.mats, { wood: 5 });
  assert.equal(h.plots.length, LAND[1].plots);
  assert.equal(h.plots[1].crop, 'redHerb', '作物跟著田地保留');
  assert.ok(h.placed.some((p) => p.id === 'woodChair' && p.x === 4 && p.y === 1));
  const l = home.homeLayout(2);
  assert.equal(l.yard.h, LAND[1].yard);
  assert.equal(l.plots.length, LAND[1].plots);
  // 轉職與魔王城的條件。
  h.level = 3;
  assert.ok(home.expandNeed(ch).missing.includes('要先轉職'));
  h.level = 4;
  assert.ok(home.expandNeed(ch).missing.includes('要先解鎖魔王城'));
  h.level = 5;
  assert.ok(home.expandNeed(ch).max);
});

test('牧場：連動解鎖後購買、隻數上限、餵牧草才產出、收取產物與日記', () => {
  const ch = hero();
  const h = ch.home;
  assert.match(home.buyAnimal(ch, 'chicken').message, /自然探險/);
  home.syncLinks(ch, { science: [LINK_CARDS.animals[0]] });
  assert.match(home.buyAnimal(ch, 'cow').message, /土地等級 2/);
  assert.ok(home.buyAnimal(ch, 'chicken').ok);
  assert.match(home.buyAnimal(ch, 'chicken').message, /最多養 1 隻/);
  assert.equal(home.placeItem(ch, 'chicken', 'house', 0, 2).ok, false, '動物只能放庭院');
  assert.ok(home.placeItem(ch, 'chicken', 'yard', 0, 0).ok);
  const i = h.placed.findIndex((p) => p.id === 'chicken');
  home.tickHome(ch, 1);
  home.tickHome(ch, 1 + 10 * H);
  assert.equal(h.placed[i].stock, 0, '沒餵不會產出');
  assert.equal(home.feedAnimal(ch, i).ok, false, '沒有牧草');
  assert.ok(home.buyFeed(ch, 2).ok);
  assert.ok(home.feedAnimal(ch, i).ok);
  assert.equal(home.feedAnimal(ch, i).ok, false, '還很飽');
  home.tickHome(ch, 1 + 19 * H);
  assert.equal(h.placed[i].stock, 2, '9 小時產出 2 份（每 4 小時）');
  assert.equal(home.storeItem(ch, i).ok, false, '有產物時不能收回');
  home.tickHome(ch, 1 + 40 * H);
  assert.equal(h.placed[i].stock, RANCH.maxStock, '最多累積 3 份');
  const r = home.collectAnimal(ch, i);
  assert.ok(r.ok && r.n === 3 && r.diary === 'chicken');
  assert.equal(h.produce.egg, 3);
  // 飼料吃完（24 小時）後停止產出。
  home.tickHome(ch, 1 + 60 * H);
  assert.equal(home.animalState(h.placed[i]).hungry, true);
  // 存檔修復保留動物狀態。
  const n = home.normalizeHome(JSON.parse(JSON.stringify(h)));
  assert.deepEqual(n.placed.find((p) => p.id === 'chicken'), h.placed[i]);
});

test('藥草台與料理：藥水、布料、染料、料理；起司需要微生物連動；料理只對下一趟有效', () => {
  const ch = hero();
  const h = ch.home;
  h.produce = { redHerb: 5, cotton: 2, starflower: 1, milk: 6, egg: 2, meat: 2 };
  assert.ok(home.brew(ch, 'potion').ok);
  assert.equal(ch.potions, 1);
  assert.ok(home.brew(ch, 'clothCotton').ok);
  assert.equal(h.mats.cloth, 1);
  assert.ok(home.brew(ch, 'dyeRed').ok);
  assert.equal(h.produce.dyeRed, 1);
  assert.equal(home.brew(ch, 'potion').ok, false, '紅草不夠');
  assert.match(home.brewMissing(ch, 'cheese')[0], /微生物/);
  home.syncLinks(ch, { science: [LINK_CARDS.microbes[0]] });
  assert.ok(home.brew(ch, 'cheese').ok);
  assert.ok(home.brew(ch, 'pudding').ok);
  assert.ok(home.eatMeal(ch, 'cheese').ok);
  assert.ok(home.eatMeal(ch, 'pudding').ok);
  assert.equal(h.meals.cheese, 1, '原本吃的放回去');
  assert.equal(h.meal, 'pudding');
  // 料理加成套用在探險中，出發後就失效。
  const base = new World(hero(), { area: 'grass', depth: 1, seed: 1 }).player;
  const meal = home.takeMeal(ch);
  assert.deepEqual(meal, { key: 'pudding', buff: 'hp', pct: 10 });
  assert.equal(h.meal, null);
  const w = new World(ch, { area: 'grass', depth: 1, seed: 1, meal });
  assert.equal(w.player.maxHp, Math.round(base.maxHp * 1.1));
  const atk = new World(ch, { area: 'grass', depth: 1, seed: 1, meal: { key: 'meatStew', buff: 'atk', pct: 5 } });
  assert.equal(atk.player.atk, Math.round(base.atk * 1.05));
  assert.equal(World.restore(ch, w.snapshot()).meal.buff, 'hp', '暫停後繼續仍有效');
});

test('獸肉：只有野生動物類的怪物會掉，撿到放進物產', () => {
  const ch = hero();
  const w = new World(ch, { area: 'grass', depth: 1, seed: 3 }, fixed(0));
  const before = w.pickups.length;
  w.dropHome({ type: 'slime', x: w.player.x, y: w.player.y }, 'monster');
  assert.ok(!w.pickups.slice(before).some((p) => p.kind === 'meat'));
  w.dropHome({ type: 'boar', x: w.player.x, y: w.player.y }, 'monster');
  const meat = w.pickups.find((p) => p.kind === 'meat');
  assert.ok(meat && MEAT.monsters.includes('boar'));
  meat.x = w.player.x;
  meat.y = w.player.y;
  w.updatePickups(0.5);
  assert.equal(ch.home.produce.meat, 1);
});

test('家用寶箱與展示架：格數依寶箱數、裝備進出背包、有東西時不能收回', () => {
  const ch = hero();
  const h = ch.home;
  ch.bag = [{ id: 'a', name: '劍', rarity: 3 }, { id: 'b', name: '盾', rarity: 1 }];
  assert.equal(home.chestDeposit(ch, 'a').ok, false, '沒有寶箱時 0 格');
  h.inventory = { homeChest: 1, trophyShelf: 1 };
  assert.ok(home.placeItem(ch, 'homeChest', 'house', 3, 0).ok);
  assert.equal(home.chestCapacity(h), HOME_CHEST.slots);
  assert.ok(home.chestDeposit(ch, 'a').ok);
  const ci = h.placed.findIndex((p) => p.id === 'homeChest');
  assert.equal(home.storeItem(ch, ci).ok, false);
  assert.equal(home.chestWithdraw(ch, 'a', false).ok, false, '背包滿');
  assert.ok(home.chestWithdraw(ch, 'a', true).ok);
  assert.ok(home.storeItem(ch, ci).ok);
  assert.ok(home.placeItem(ch, 'trophyShelf', 'house', 2, 3).ok);
  const si = h.placed.findIndex((p) => p.id === 'trophyShelf');
  assert.ok(home.shelfPut(ch, si, 'a').ok);
  assert.ok(home.shelfPut(ch, si, 'b').ok);
  assert.equal(ch.bag.length, 0);
  assert.equal(home.storeItem(ch, si).ok, false);
  assert.ok(home.moveItem(ch, si, 'house', 2, 2).ok);
  assert.equal(h.placed[si].show.length, 2, '移動時裝備跟著');
  assert.ok(home.shelfTake(ch, si, 'a', true).ok);
  assert.equal(ch.bag[0].id, 'a');
});

test('染色：消耗染料、改回原色免費、動物不能染', () => {
  const ch = hero();
  const h = ch.home;
  assert.equal(home.dyeItem(ch, 0, 'dyeBlue').ok, false, '沒有染料');
  h.produce.dyeBlue = 1;
  assert.ok(home.dyeItem(ch, 0, 'dyeBlue').ok);
  assert.equal(h.placed[0].dye, 'dyeBlue');
  assert.equal(h.produce.dyeBlue, undefined);
  assert.equal(home.normalizeHome(JSON.parse(JSON.stringify(h))).placed[0].dye, 'dyeBlue');
  assert.ok(home.dyeItem(ch, 0, null).ok);
  assert.equal(h.placed[0].dye, undefined);
});

test('市集：解鎖前不能賣；需求每天固定；同一天賣越多價格越低', () => {
  const ch = hero();
  const h = ch.home;
  h.produce = { egg: 30 };
  assert.match(home.sellGood(ch, 'egg', 1, '2026-11-07').message, /經濟/);
  home.syncLinks(ch, { social: [LINK_CARDS.market[0]] });
  const d = home.marketDemand('egg', '2026-11-07');
  assert.equal(d, home.marketDemand('egg', '2026-11-07'));
  assert.ok(d >= 0.8 && d <= 1.25);
  const p0 = home.marketPrice(ch, 'egg', '2026-11-07');
  const gold = ch.gold;
  const r = home.sellGood(ch, 'egg', 10, '2026-11-07');
  assert.ok(r.ok && ch.gold === gold + r.gold && r.gold <= p0 * 10);
  assert.ok(home.marketPrice(ch, 'egg', '2026-11-07') < p0, '供給增加、價格下降');
  assert.equal(home.marketPrice(ch, 'egg', '2026-11-08'), Math.round(30 * home.marketDemand('egg', '2026-11-08')), '隔天重新計算');
  assert.equal(home.sellGood(ch, 'egg', 99, '2026-11-07').ok, false);
});

test('生長階段的比例與存檔修復的田地', () => {
  const total = home.cropTotalMs('redHerb');
  assert.equal(home.cropStage({ crop: 'redHerb', grown: total * GROW.mid - 1 }), 0);
  assert.equal(home.cropStage({ crop: 'redHerb', grown: total * GROW.mid }), 1);
  const h = home.normalizeHome({ level: 1, plots: [{ crop: 'apple', grown: 1e15 }, { crop: 'x', grown: 5 }, { crop: 'apple', grown: 1 }] });
  assert.deepEqual(h.plots, [{ crop: 'apple', grown: home.cropTotalMs('apple') }, { crop: null, grown: 0 }]);
});
