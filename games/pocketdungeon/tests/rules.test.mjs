// 成長與裝備規則的單元測試：經驗曲線、升級、屬性、速度、傷害公式、怪物強度、裝備與強化。

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seededRng, xpToNext, gainXp, characterStats, speedProfile, damage, dungeonLevel, monsterStats, makeItem, itemStats, tryEnhance, rarityWeights, rollRarity, sellPrice, itemValue,
} from '../src/js/pd/rules.js';
import { MAX_LEVEL } from '../src/js/pd/data.js';

test('升級所需經驗值 round(20 × Lv^1.6)', () => {
  assert.equal(xpToNext(1), 20);
  assert.equal(xpToNext(2), Math.round(20 * 2 ** 1.6));
  assert.equal(xpToNext(29), Math.round(20 * 29 ** 1.6));
  assert.equal(xpToNext(MAX_LEVEL), Infinity);
});

test('經驗值可連升數級，Lv.30 不再累積', () => {
  const ch = { level: 1, xp: 0 };
  assert.equal(gainXp(ch, 20 + xpToNext(2) + 5), 2);
  assert.equal(ch.level, 3);
  assert.equal(ch.xp, 5);
  const max = { level: 29, xp: 0 };
  gainXp(max, 1e9);
  assert.equal(max.level, 30);
  assert.equal(max.xp, 0);
  assert.equal(gainXp(max, 100), 0);
  assert.equal(max.xp, 0);
});

test('職業初始屬性與每級成長', () => {
  assert.deepEqual(characterStats('warrior', 1), { hp: 120, atk: 12, def: 8, spd: 100, goldPct: 0, xpPct: 0 });
  assert.deepEqual(characterStats('archer', 1), { hp: 90, atk: 10, def: 5, spd: 115, goldPct: 0, xpPct: 0 });
  assert.deepEqual(characterStats('mage', 1), { hp: 75, atk: 14, def: 4, spd: 100, goldPct: 0, xpPct: 0 });
  const w = characterStats('warrior', 11);
  assert.equal(w.hp, 120 + 12 * 10);
  assert.equal(w.atk, 12 + 2 * 10);
  assert.equal(w.def, 8 + 15);
  assert.equal(w.spd, 105);
});

test('速度：100 時每秒 4.5 格、間隔 0.45 秒；每 +10 移動 +5%、間隔 −3%，下限 0.25 秒', () => {
  assert.deepEqual(speedProfile(100), { move: 4.5, interval: 0.45 });
  const p = speedProfile(110);
  assert.ok(Math.abs(p.move - 4.725) < 1e-9);
  assert.ok(Math.abs(p.interval - 0.45 * 0.97) < 1e-9);
  assert.equal(speedProfile(400).interval, 0.25);
});

test('傷害公式與浮動範圍，最少 1 點', () => {
  assert.equal(damage(100, 50, 1, 0.5), 50);
  assert.equal(damage(100, 50, 1, 0), 45);
  assert.equal(damage(100, 50, 1, 1), 55);
  assert.equal(damage(100, 0, 1.5, 0.5), 150);
  assert.equal(damage(1, 1000, 1, 0), 1);
});

test('地城等級與深度加成', () => {
  assert.equal(dungeonLevel('grass', 1, 0), 1);
  assert.equal(dungeonLevel('easy', 1, 0), 5);
  assert.equal(dungeonLevel('easy', 2, 0), 7);
  assert.equal(dungeonLevel('medium', 1, 3), 10.5);
  assert.equal(dungeonLevel('expert', 30, 0), 60, '最高 Lv.60');
  const d1 = monsterStats('slime', 5, 1);
  const d2 = monsterStats('slime', 5, 2);
  assert.ok(Math.abs(d2.hp / d1.hp - 1.12) < 0.02);
  const elite = monsterStats('slime', 5, 1, { elite: true });
  assert.ok(Math.abs(elite.hp / d1.hp - 3) < 0.02);
});

test('裝備：部位屬性、稀有度倍率、強化 +8% 與失敗不降級', () => {
  const rng = seededRng(7);
  const w = makeItem({ slot: 'weapon', cls: 'archer', level: 10, rarity: 2 }, rng);
  assert.equal(w.type, '弓');
  assert.ok(w.stats.atk > 0);
  const a = makeItem({ slot: 'armor', level: 10, rarity: 0 }, rng);
  assert.ok(a.stats.def > 0 && a.stats.hp > 0);
  const acc = makeItem({ slot: 'accessory', level: 10, rarity: 3 }, rng);
  assert.equal(Object.keys(acc.stats).length, 2);
  const item = { ...w, stats: { atk: 100 }, enhance: 0 };
  item.enhance = 5;
  assert.equal(itemStats(item).atk, 140);
  assert.equal(tryEnhance(item, () => 0.99), true);
  assert.equal(item.enhance, 6);
  assert.equal(tryEnhance(item, () => 0), false);
  assert.equal(item.enhance, 6);
  item.enhance = 10;
  assert.equal(tryEnhance(item, () => 0.99), false);
  assert.equal(sellPrice(item), Math.round(itemValue(item) * 0.3));
});

test('Boss 必掉稀有以上；一般怪物多為普通', () => {
  const rng = seededRng(3);
  for (let i = 0; i < 500; i++) assert.ok(rollRarity(rarityWeights('boss', 1), rng) >= 2);
  let common = 0;
  for (let i = 0; i < 1000; i++) if (rollRarity(rarityWeights('monster', 1), rng) === 0) common++;
  assert.ok(common > 600 && common < 800);
});
