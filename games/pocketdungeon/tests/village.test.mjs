// 村莊規則的單元測試：商店、買賣、穿脫、強化、解鎖與探險結算。

import test from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../src/js/pd/village.js';
import { seededRng, makeItem } from '../src/js/pd/rules.js';
import { World } from '../src/js/pd/world.js';
import { LIMITS } from '../src/js/pd/data.js';

/**
 * 建立測試用角色。
 * @returns {object} 角色。
 */
function hero() {
  return {
    id: 'warrior', cls: 'warrior', name: 't', level: 5, xp: 0, gold: 1000, bag: [], equipped: { weapon: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null },
    potions: 0, scroll: 0, unlocked: { easy: 1 }, shop: null, stats: { playMs: 0, kills: 0, maxHit: 0, legends: 0, deaths: 0, runs: 0 },
  };
}

test('商店刷新 6 件，購買扣金幣並放入背包', () => {
  const ch = hero();
  v.refreshShop(ch, seededRng(1));
  assert.equal(ch.shop.length, v.SHOP_SIZE);
  const price = ch.shop[0].price;
  const r = v.buyItem(ch, 0);
  assert.ok(r.ok);
  assert.equal(ch.gold, 1000 - price);
  assert.equal(ch.bag.length, 1);
  assert.equal(ch.shop.length, v.SHOP_SIZE - 1);
});

test('藥水最多 10 瓶、卷軸最多 1 張；金幣不足時說明原因', () => {
  const ch = hero();
  for (let i = 0; i < LIMITS.potions; i++) assert.ok(v.buyPotion(ch).ok);
  assert.equal(v.buyPotion(ch).ok, false);
  assert.ok(v.buyScroll(ch).ok);
  assert.equal(v.buyScroll(ch).ok, false);
  ch.gold = 0;
  ch.potions = 0;
  assert.match(v.buyPotion(ch).message, /金幣不足/);
});

test('穿上與卸下裝備，舊裝備回到背包；賣出得到 30% 價值', () => {
  const ch = hero();
  v.refreshShop(ch, seededRng(2));
  const weapons = ch.shop.filter((e) => e.item.slot === 'weapon').map((e) => e.item);
  ch.bag.push(...weapons);
  v.equip(ch, weapons[0].id);
  assert.equal(ch.equipped.weapon, weapons[0]);
  v.equip(ch, weapons[1].id);
  assert.equal(ch.equipped.weapon, weapons[1]);
  assert.ok(ch.bag.includes(weapons[0]));
  assert.ok(v.unequip(ch, 'weapon').ok);
  assert.equal(ch.equipped.weapon, null);
  const gold = ch.gold;
  assert.ok(v.sellItem(ch, weapons[0].id).ok);
  assert.ok(ch.gold > gold);
});

test('頭盔、鞋子各有自己的欄位；飾品可裝兩件並可指定欄位', () => {
  const ch = hero();
  const rng = seededRng(9);
  const helmet = makeItem({ slot: 'helmet', level: 5, rarity: 1 }, rng);
  const boots = makeItem({ slot: 'boots', level: 5, rarity: 1 }, rng);
  const [a, b, c] = [0, 1, 2].map(() => makeItem({ slot: 'accessory', level: 5, rarity: 0 }, rng));
  ch.bag.push(helmet, boots, a, b, c);
  assert.ok(v.equip(ch, helmet.id).ok);
  assert.ok(v.equip(ch, boots.id).ok);
  assert.equal(ch.equipped.helmet, helmet);
  assert.equal(ch.equipped.boots, boots);
  assert.ok(boots.stats.spd > 0 && boots.stats.def > 0);
  v.equip(ch, a.id);
  v.equip(ch, b.id);
  assert.equal(ch.equipped.acc1, a);
  assert.equal(ch.equipped.acc2, b);
  v.equip(ch, c.id, 'acc2');
  assert.equal(ch.equipped.acc2, c);
  assert.ok(ch.bag.includes(b));
  assert.equal(v.equip(ch, b.id, 'helmet').ok, false, '飾品不能放頭盔欄');
});

test('背包擴充袋：售價倍增、使用後 +5 格、最多 40 格', () => {
  const ch = hero();
  ch.gold = 1e6;
  assert.equal(v.bagLimit(ch), 20);
  const prices = [];
  for (let i = 0; i < 4; i++) {
    prices.push(v.bagExpandPrice(ch));
    assert.ok(v.buyBagExpand(ch).ok);
  }
  assert.deepEqual(prices, [200, 400, 800, 1600]);
  assert.equal(v.buyBagExpand(ch).ok, false, '已買足 4 個');
  for (let i = 0; i < 4; i++) assert.ok(v.useBagExpand(ch).ok);
  assert.equal(v.bagLimit(ch), 40);
  assert.equal(v.useBagExpand(ch).ok, false);
  ch.bag = Array.from({ length: 39 }, (_, i) => ({ id: `x${i}` }));
  v.refreshShop(ch, seededRng(1));
  assert.ok(v.buyItem(ch, 0).ok, '擴充後可以超過 20 件');
  assert.equal(v.buyItem(ch, 0).ok, false);
});

test('強化：成功 +1；失敗只扣金幣', () => {
  const ch = hero();
  v.refreshShop(ch, seededRng(3));
  const item = ch.shop[0].item;
  ch.bag.push(item);
  ch.gold = 1e6;
  assert.ok(v.enhance(ch, item.id, () => 0.99).success);
  assert.equal(item.enhance, 1);
  item.enhance = 7;
  const g = ch.gold;
  const r = v.enhance(ch, item.id, () => 0);
  assert.equal(r.success, false);
  assert.equal(item.enhance, 7);
  assert.ok(ch.gold < g);
});

test('擊敗 Boss 解鎖下一個深度與下一個區域；一般區域深度上限 5', () => {
  const ch = hero();
  assert.deepEqual(v.unlockAfterBoss(ch, 'easy', 1), ['苔蘚遺跡 深度 2', '熔岩礦坑']);
  assert.equal(ch.unlocked.medium, 1);
  ch.unlocked.easy = 5;
  assert.deepEqual(v.unlockAfterBoss(ch, 'easy', 5), []);
  ch.unlocked.expert = 9;
  v.unlockAfterBoss(ch, 'expert', 9);
  assert.equal(ch.unlocked.expert, 10);
});

test('結算：倒下失去一半本趟金幣；回城保留全部；剩餘藥水放回', () => {
  const ch = hero();
  ch.potions = 4;
  ch.scroll = 1;
  const carry = v.packForRun(ch);
  assert.deepEqual(carry, { potions: 4, scroll: 1 });
  const w = new World(ch, { area: 'easy', depth: 1, seed: 1, potions: carry.potions, scroll: carry.scroll }, seededRng(1));
  w.loot.gold = 101;
  ch.gold += 101;
  const before = ch.gold;
  const r = v.settleRun(ch, w, 'dead');
  assert.equal(r.goldLost, 50);
  assert.equal(ch.gold, before - 50);
  assert.equal(ch.potions, 4);
  assert.equal(ch.scroll, 1);
  assert.equal(ch.stats.deaths, 1);
  assert.ok(!ch.clears || !ch.clears['easy-1'], '倒下不算破關');

  const ch2 = hero();
  const w2 = new World(ch2, { area: 'easy', depth: 1, seed: 1, potions: 0, scroll: 1 }, seededRng(1));
  w2.loot.gold = 80;
  ch2.gold += 80;
  const g2 = ch2.gold;
  w2.useScroll();
  const r2 = v.settleRun(ch2, w2, 'recall');
  assert.equal(r2.goldLost, 0);
  assert.equal(ch2.gold, g2);
  assert.equal(ch2.scroll, 0);
});

test('擊敗 Boss 回城時記錄這一關的破關次數', () => {
  const ch = hero();
  const w = new World(ch, { area: 'easy', depth: 2, seed: 1, floor: 3, potions: 0, scroll: 0 }, seededRng(1));
  w.hitMonster(w.boss(), 1e7);
  v.settleRun(ch, w, 'victory');
  const r = v.settleRun(ch, w, 'victory');
  assert.equal(ch.clears['easy-2'], 2);
  assert.equal(r.clears, 2);
});
