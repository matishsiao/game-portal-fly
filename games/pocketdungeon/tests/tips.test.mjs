// 新手提示的單元測試：依持有的道具與技能決定要顯示的提示，看過的不再顯示。

import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingTips, tipText } from '../src/js/pd/tips.js';
import { newSkills } from '../src/js/pd/skills.js';

/**
 * 建立測試用的新角色（Lv.1 戰士，帶初始藥水、卷軸與入場卷）。
 * @returns {object} 角色。
 */
function hero() {
  return {
    cls: 'warrior', level: 1, rebirth: 0, bag: [], potions: 3, scroll: 1, cures: 1, bagExpand: 0,
    gems: {}, mats: {}, books: {}, skillBooks: {}, gifts: {}, shards: {}, tickets: { 1: 5 }, skills: newSkills('warrior'),
  };
}

test('倉庫個人頁依持有的道具顯示提示，技能提示在任何分頁都會顯示', () => {
  const ch = hero();
  assert.deepEqual(pendingTips(ch, [], true).map((t) => t.id), ['potion', 'cure', 'scroll', 'ticket']);
  assert.deepEqual(pendingTips(ch, [], false).map((t) => t.id), []);
  ch.gems = { 'atk-1': 2 };
  ch.bag.push({ id: 'x', slot: 'helmet' });
  assert.deepEqual(pendingTips(ch, ['potion', 'cure', 'scroll', 'ticket'], true).map((t) => t.id), ['equip', 'gem']);
});

test('看過的提示不再顯示；之前已持有但沒看過的仍會顯示', () => {
  const ch = hero();
  ch.mats = { iron: 3 };
  assert.ok(pendingTips(ch, ['potion'], true).some((t) => t.id === 'mat'));
  assert.ok(!pendingTips(ch, ['mat'], true).some((t) => t.id === 'mat'));
});

test('升級得到技能點與解鎖新技能時顯示技能提示', () => {
  const ch = hero();
  ch.level = 5;
  const ids = pendingTips(ch, [], false).map((t) => t.id);
  assert.deepEqual(ids, ['skillpt', 'newskill']);
  const tip = pendingTips(ch, [], false)[1];
  assert.match(tipText(tip, ch), /衝鋒/);
  // 裝進技能欄後就沒有未裝備的新技能。
  ch.skills.slots[1] = 'charge';
  assert.ok(!pendingTips(ch, [], false).some((t) => t.id === 'newskill'));
});
