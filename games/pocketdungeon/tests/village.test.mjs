// 村莊規則的單元測試：商店、買賣、穿脫、強化、解鎖與探險結算。

import test from 'node:test';
import assert from 'node:assert/strict';
import * as v from '../src/js/pd/village.js';
import { seededRng, makeItem, characterStats, levelCap, gainXp, dungeonLevel } from '../src/js/pd/rules.js';
import { skillLevel, skillPoints } from '../src/js/pd/skills.js';
import { World } from '../src/js/pd/world.js';
import { LIMITS, AREAS } from '../src/js/pd/data.js';

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

test('藥水最多持有 999 瓶、卷軸最多 1 張；金幣不足時說明原因', () => {
  const ch = hero();
  assert.ok(v.buyPotion(ch).ok);
  ch.potions = LIMITS.potionHold - 1;
  assert.ok(v.buyPotion(ch).ok);
  assert.equal(v.buyPotion(ch).ok, false);
  assert.equal(ch.potions, 999);
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

test('背包擴充袋：商店只賣 5 個（售價倍增），之後靠打怪取得；使用後 +5 格、最多 100 格', () => {
  const ch = hero();
  ch.gold = 1e6;
  assert.equal(v.bagLimit(ch), 20);
  const prices = [];
  for (let i = 0; i < 5; i++) {
    prices.push(v.bagExpandPrice(ch));
    assert.ok(v.buyBagExpand(ch).ok);
  }
  assert.deepEqual(prices, [200, 400, 800, 1600, 3200]);
  const r = v.buyBagExpand(ch);
  assert.equal(r.ok, false);
  assert.match(r.message, /賣完/);
  ch.bagExpand += 11;
  for (let i = 0; i < 16; i++) assert.ok(v.useBagExpand(ch).ok);
  assert.equal(v.bagLimit(ch), 100);
  assert.equal(v.useBagExpand(ch).ok, false);
  ch.bag = Array.from({ length: 99 }, (_, i) => ({ id: `x${i}` }));
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

test('擊敗 Boss 解鎖下一個深度與下一個區域；每個區域深度上限 5', () => {
  const ch = hero();
  assert.deepEqual(v.unlockAfterBoss(ch, 'easy', 1), ['苔蘚遺跡 深度 2', '熔岩礦坑']);
  assert.equal(ch.unlocked.medium, 1);
  ch.unlocked.easy = 5;
  assert.deepEqual(v.unlockAfterBoss(ch, 'easy', 5), []);
  ch.unlocked.expert = 4;
  v.unlockAfterBoss(ch, 'expert', 4);
  assert.equal(ch.unlocked.expert, 5);
  assert.deepEqual(v.unlockAfterBoss(ch, 'expert', 5), []);
});

test('結算：倒下失去一半本趟金幣；回城保留全部；剩餘藥水放回', () => {
  const ch = hero();
  ch.potions = 4;
  ch.scroll = 1;
  const carry = v.packForRun(ch);
  assert.deepEqual(carry, { potions: 4, scroll: 1, cures: 0 });
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

test('共用倉庫：20 格固定、存入與取出裝備、金幣共用', () => {
  const a = hero();
  const b = { ...hero(), id: 'mage', cls: 'mage', bag: [], gold: 0 };
  const shared = v.newShared();
  const rng = seededRng(5);
  const items = Array.from({ length: 21 }, () => makeItem({ slot: 'armor', level: 3, rarity: 0 }, rng));
  a.bag.push(...items);
  for (let i = 0; i < 20; i++) assert.ok(v.depositItem(a, shared, items[i].id).ok);
  assert.equal(v.depositItem(a, shared, items[20].id).ok, false, '共用倉庫只有 20 格');
  assert.equal(shared.items.length, 20);
  assert.equal(a.bag.length, 1);
  assert.ok(v.withdrawItem(b, shared, items[0].id).ok);
  assert.ok(b.bag.includes(items[0]));
  assert.equal(shared.items.length, 19);
  // 裝備中的道具不能直接存入。
  v.equip(a, items[20].id);
  assert.equal(v.depositItem(a, shared, items[20].id).ok, false);
  // 金幣：a 存入，b 取出。
  a.gold = 500;
  assert.ok(v.depositGold(a, shared, 100).ok);
  assert.ok(v.depositGold(a, shared, 'all').ok);
  assert.equal(a.gold, 0);
  assert.equal(shared.gold, 500);
  assert.ok(v.withdrawGold(b, shared, 'all').ok);
  assert.equal(b.gold, 500);
  assert.equal(v.withdrawGold(b, shared, 100).ok, false);
});

test('武器有職業限制：其他職業可以取出但不能裝備', () => {
  const warrior = hero();
  const mage = { ...hero(), id: 'mage', cls: 'mage', bag: [] };
  const sword = makeItem({ slot: 'weapon', cls: 'warrior', level: 3, rarity: 1 }, seededRng(2));
  mage.bag.push(sword);
  const r = v.equip(mage, sword.id);
  assert.equal(r.ok, false);
  assert.match(r.message, /戰士的武器/);
  assert.equal(v.canWield(mage, sword), false);
  warrior.bag.push(sword);
  assert.ok(v.equip(warrior, sword.id).ok);
});

test('轉職：達到等級上限才能轉職、最多 3 次；上限每次 +10；回到 Lv.1，HP／攻擊／防禦起始值為轉職前滿級的一半，速度不變', () => {
  const ch = hero();
  ch.skills = { lv: { whirl: 5 }, slots: ['whirl', null] };
  ch.level = 29;
  assert.equal(v.rebirth(ch).ok, false);
  const gear = makeItem({ slot: 'armor', level: 20, rarity: 2 }, seededRng(3));
  ch.equipped.armor = gear;
  ch.gold = 1234;
  for (let n = 1; n <= 3; n++) {
    const cap = levelCap(n - 1);
    assert.equal(cap, 30 + 10 * (n - 1));
    ch.level = cap - 1;
    assert.equal(v.rebirth(ch).ok, false, `Lv.${cap - 1} 還不能轉職`);
    ch.level = cap;
    ch.xp = 0;
    const before = characterStats('warrior', cap, [], n - 1);
    assert.ok(v.rebirth(ch).ok);
    assert.equal(ch.level, 1);
    assert.equal(ch.rebirth, n);
    const after = characterStats('warrior', 1, [], n);
    for (const k of ['hp', 'atk', 'def']) assert.ok(Math.abs(after[k] - before[k] / 2) <= 1, `${k} ${after[k]} vs ${before[k] / 2}`);
    assert.equal(after.spd, 100);
  }
  assert.equal(v.classTitle(ch), '英雄');
  assert.equal(levelCap(ch.rebirth), 60);
  ch.level = 60;
  assert.equal(v.rebirth(ch).ok, false, '最多 3 次');
  // 轉職後可以一路升到新的上限，並在上限停止累積經驗。
  ch.level = 58;
  ch.xp = 0;
  gainXp(ch, 1e9);
  assert.equal(ch.level, 60);
  assert.equal(ch.xp, 0);
  // 裝備、金幣、技能保留；技能在 Lv.1 仍維持解鎖；技能點包含歷次滿級所得（29＋39＋49）。
  assert.equal(ch.equipped.armor, gear);
  assert.equal(ch.gold, 1234);
  ch.level = 1;
  assert.equal(skillLevel(ch, 'quake'), 1);
  assert.equal(skillLevel(ch, 'whirl'), 5);
  assert.equal(skillPoints(ch), 29 + 39 + 49 - 4);
  assert.equal(ch.stats.rebirths, 3);
});

test('區域主線：草原 → 苔蘚遺跡 → 熔岩礦坑 → 冰晶要塞 → 天空之城 → 死靈墓地 → 黃沙神殿 → 沉沒神殿 → 機械工坊 → 龍之峽谷 → 魔王城 → 深淵；深淵給 Lv.52 以上、最深 5、地城等級最高 60', () => {
  const ch = hero();
  ch.unlocked = { grass: 1 };
  assert.deepEqual(v.unlockAfterBoss(ch, 'grass', 1), ['翠綠草原 深度 2', '苔蘚遺跡']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'hard', 1).slice(-1), ['天空之城']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'sky', 1).slice(-1), ['死靈墓地']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'necro', 1).slice(-1), ['黃沙神殿']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'desert', 1).slice(-1), ['沉沒神殿']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'sea', 1).slice(-1), ['機械工坊']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'clock', 1).slice(-1), ['龍之峽谷']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'dragon', 1).slice(-1), ['魔王城']);
  assert.deepEqual(v.unlockAfterBoss(ch, 'demon', 1).slice(-1), ['深淵']);
  // 每個等級區間都有適合的區域：建議等級首尾相接，從 Lv.1 一路到 Lv.52，深淵涵蓋到 Lv.60。
  const keys = Object.keys(AREAS).filter((k) => k !== 'expert');
  for (let i = 1; i < keys.length; i++) assert.ok(AREAS[keys[i]].recommend[0] <= AREAS[keys[i - 1]].recommend[1] + 1, `${keys[i]} 與前一區之間沒有空檔`);
  assert.equal(AREAS.demon.recommend[1], 52);
  assert.deepEqual(AREAS.expert.recommend, [52, 60]);
  assert.equal(dungeonLevel('expert', 1, 0), 52);
  ch.unlocked.expert = 5;
  assert.deepEqual(v.unlockAfterBoss(ch, 'expert', 5), [], '深淵最深 5');
  assert.equal(dungeonLevel('expert', 5, 3), 60);
});

test('比目前穿的更好的裝備會被標示；一次賣出／分解只處理普通（或普通＋精良）且不是升級、沒強化過的裝備', () => {
  const ch = hero();
  ch.cls = 'warrior';
  ch.skills = { levels: {}, slots: [], passive: {}, learned: [] };
  ch.mats = {};
  ch.gems = {};
  ch.bagSize = 40;
  const armor = (rarity, level, id, enhance = 0) => ({ ...makeItem({ slot: 'armor', level, rarity }, () => 0.5), id, enhance });
  ch.equipped.armor = armor(1, 5, 'worn');
  const better = armor(3, 20, 'better');
  const worse1 = armor(0, 1, 'w1');
  const worse2 = armor(0, 1, 'w2', 2);
  const fine = armor(1, 1, 'f1');
  ch.bag = [better, worse1, worse2, fine];
  assert.equal(v.isUpgrade(ch, better), true);
  assert.equal(v.isUpgrade(ch, worse1), false);
  assert.deepEqual(v.bulkTargets(ch, 0).map((i) => i.id), ['w1'], '強化過的不算');
  assert.deepEqual(v.bulkTargets(ch, 1).map((i) => i.id), ['w1', 'f1']);
  const gold = ch.gold;
  const r = v.sellMany(ch, ['w1', 'f1']);
  assert.equal(r.count, 2);
  assert.ok(ch.gold > gold);
  assert.deepEqual(ch.bag.map((i) => i.id), ['better', 'w2']);
  ch.bag.push(armor(0, 1, 's1'), armor(0, 1, 's2'));
  const s = v.salvageMany(ch, ['s1', 's2'], () => 0.99);
  assert.equal(s.count, 2);
  assert.ok(ch.mats.iron > 0);
  // 別的職業的武器不算升級。
  assert.equal(v.isUpgrade(ch, { ...makeItem({ slot: 'weapon', cls: 'mage', level: 30, rarity: 3 }, () => 0.5), id: 'staff' }), false);
});

test('寶石全部合成：由低到高連續往上合成，金幣不足時停在買得起的部分', () => {
  const ch = hero();
  ch.gems = { 'atk-1': 9, 'hp-1': 2, 'shield-1': 3 };
  ch.gold = 10000;
  const r = v.fuseAll(ch);
  // 9 顆 1 級 → 3 顆 2 級 → 1 顆 3 級；翡翠不足 3 顆、主動寶石不能合成。
  assert.equal(r.fused, 4);
  assert.equal(r.cost, 3 * 100 + 300);
  assert.equal(ch.gems['atk-3'], 1);
  assert.equal(ch.gems['atk-1'] || 0, 0);
  assert.equal(ch.gems['hp-1'], 2);
  assert.equal(ch.gems['shield-1'], 3);
  ch.gems = { 'def-1': 9 };
  ch.gold = 250;
  const s = v.fuseAll(ch, 'def');
  assert.equal(s.fused, 2);
  assert.match(s.message, /金幣不足/);
});
