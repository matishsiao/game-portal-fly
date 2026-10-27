// 技能的單元測試：解鎖、技能點、升級、裝備、重置，以及每個技能在戰鬥中的效果。

import test from 'node:test';
import assert from 'node:assert/strict';
import * as sk from '../src/js/pd/skills.js';
import { World } from '../src/js/pd/world.js';
import { seededRng } from '../src/js/pd/rules.js';

const IDLE = { mx: 0, my: 0, attack: false, dodge: false, potion: false };
const DT = 1 / 60;

/**
 * 建立測試用角色。
 * @param {string} cls 職業。
 * @param {number} level 等級。
 * @returns {object} 角色。
 */
function hero(cls, level) {
  return { id: cls, cls, name: 't', level, xp: 0, gold: 0, bag: [], equipped: { weapon: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null }, skills: sk.newSkills(cls) };
}

/**
 * 建立沒有怪物的探險，並把指定技能裝在第 1 格。
 * @param {string} cls 職業。
 * @param {string} id 技能代碼。
 * @returns {World} 探險。
 */
function arena(cls, id) {
  const ch = hero(cls, 30);
  ch.skills.slots = [id, null];
  const w = new World(ch, { area: 'easy', depth: 1, seed: 11 }, seededRng(1));
  w.monsters = [];
  w.chests = [];
  w.player.facing = { x: 1, y: 0 };
  return w;
}

/**
 * 推進數個時間步。
 * @param {World} w 探險。
 * @param {number} sec 秒數。
 */
function run(w, sec) {
  for (let t = 0; t < sec; t += DT) w.update(DT, IDLE);
}

/**
 * 在玩家前方放一隻不會行動的怪物（測試用）。
 * @param {World} w 探險。
 * @param {number} dx 相對 x。
 * @param {number} [dy=0] 相對 y。
 * @returns {object} 怪物。
 */
function dummy(w, dx, dy = 0) {
  const m = w.spawnMonster('crystal', w.player.x + dx, w.player.y + dy);
  m.hp = m.maxHp = 1e6;
  m.aggro = false;
  return m;
}

test('每個職業 4 個基本技能在 Lv.1、5、12、20 解鎖，另有 6 個轉職技能（每次轉職 2 個）', () => {
  for (const cls of ['warrior', 'archer', 'mage']) {
    const all = sk.classSkills(cls);
    assert.equal(all.length, 10);
    const ids = all.slice(0, 4);
    assert.deepEqual(ids.map((id) => sk.SKILLS[id].unlock), [1, 5, 12, 20]);
    assert.deepEqual(all.slice(4).map((id) => sk.SKILLS[id].rebirth), [1, 1, 2, 2, 3, 3]);
    const ch = hero(cls, 4);
    assert.equal(sk.skillLevel(ch, ids[0]), 1);
    assert.equal(sk.skillLevel(ch, ids[1]), 0);
    assert.equal(ch.skills.slots[0], ids[0]);
  }
});

test('技能點 = 等級 − 1 − 已升級次數；升級、上限與重置', () => {
  const ch = hero('warrior', 3);
  assert.equal(sk.skillPoints(ch), 2);
  assert.ok(sk.upgradeSkill(ch, 'whirl').ok);
  assert.ok(sk.upgradeSkill(ch, 'whirl').ok);
  assert.equal(sk.skillLevel(ch, 'whirl'), 3);
  assert.equal(sk.upgradeSkill(ch, 'whirl').ok, false, '沒有點數');
  assert.equal(sk.upgradeSkill(ch, 'charge').ok, false, '未解鎖');
  ch.level = 30;
  for (let i = 0; i < 10; i++) sk.upgradeSkill(ch, 'whirl');
  assert.equal(sk.skillLevel(ch, 'whirl'), sk.SKILL_MAX);
  sk.resetSkills(ch);
  assert.equal(sk.skillLevel(ch, 'whirl'), 1);
  assert.equal(sk.skillPoints(ch), 29);
});

test('裝備技能：未解鎖不能裝；已在另一格時交換', () => {
  const ch = hero('mage', 5);
  assert.equal(sk.equipSkill(ch, 'chain', 1).ok, false);
  assert.ok(sk.equipSkill(ch, 'blink', 1).ok);
  assert.deepEqual(ch.skills.slots, ['nova', 'blink', null, null]);
  sk.equipSkill(ch, 'blink', 0);
  assert.deepEqual(ch.skills.slots, ['blink', 'nova', null, null]);
});

test('等級提升倍率與縮短冷卻；說明文字填入數值', () => {
  const a = sk.skillStats('whirl', 1);
  const b = sk.skillStats('whirl', 5);
  assert.ok(Math.abs(b.mult / a.mult - 1.6) < 1e-9);
  assert.ok(Math.abs(b.cd / a.cd - 0.84) < 1e-9);
  assert.match(sk.describeSkill('whirl', 1), /2 格.*×1\.60/);
  assert.match(sk.describeSkill('warcry', 5), /50%/);
});

test('技能冷卻中不能再次施放', () => {
  const w = arena('warrior', 'whirl');
  assert.equal(w.useSkill(0), true);
  assert.equal(w.useSkill(0), false);
  assert.equal(w.useSkill(1), false, '空欄位');
  run(w, 6.1);
  assert.equal(w.useSkill(0), true);
});

test('戰士：旋風斬打中周圍；衝鋒位移並撞傷；戰吼提升攻防；震擊暈眩', () => {
  let w = arena('warrior', 'whirl');
  const front = dummy(w, 1.2);
  const back = dummy(w, -1.2);
  const far = dummy(w, 4);
  w.useSkill(0);
  run(w, DT);
  assert.ok(front.hp < 1e6 && back.hp < 1e6);
  assert.equal(far.hp, 1e6);

  w = arena('warrior', 'charge');
  const x0 = w.player.x;
  const m = dummy(w, 2, 0.3);
  w.useSkill(0);
  run(w, 0.4);
  assert.ok(m.hp < 1e6);
  assert.ok(w.player.x > x0 + 1);

  w = arena('warrior', 'warcry');
  const atk = w.effAtk();
  w.useSkill(0);
  assert.ok(w.effAtk() > atk * 1.25);
  run(w, 6.1);
  assert.equal(w.effAtk(), atk);

  w = arena('warrior', 'quake');
  const s = dummy(w, 2);
  w.useSkill(0);
  run(w, DT);
  assert.ok(s.stun > 1);
});

test('弓箭手：散射 5 支箭；後跳向後並射出貫穿箭；箭雨多次打擊；狙擊貫穿直線', () => {
  let w = arena('archer', 'spread');
  w.useSkill(0);
  assert.equal(w.projectiles.filter((p) => p.team === 'p').length, 5);

  w = arena('archer', 'leap');
  const x0 = w.player.x;
  const a = dummy(w, 2);
  const b = dummy(w, 3);
  w.useSkill(0);
  run(w, 0.8);
  assert.ok(w.player.x < x0 || w.hitsWall(w.player.x - 0.4, w.player.y, w.player.r));
  assert.ok(a.hp < 1e6 && b.hp < 1e6, '貫穿箭打中兩隻');

  w = arena('archer', 'rain');
  const r = dummy(w, 3);
  w.useSkill(0);
  let hits = 0;
  let last = r.hp;
  for (let t = 0; t < 2.5; t += DT) {
    w.update(DT, IDLE);
    if (r.hp < last) hits++;
    last = r.hp;
  }
  assert.equal(hits, 6);

  w = arena('archer', 'snipe');
  const s1 = dummy(w, 3);
  const s2 = dummy(w, 6);
  w.useSkill(0);
  run(w, 0.3);
  assert.equal(s1.hp, 1e6, '蓄力中');
  run(w, 0.2);
  assert.ok(s1.hp < 1e6 && s2.hp < 1e6);
});

test('法師：冰環緩速；閃現移動且不穿牆；閃電連鎖；隕石延遲落下', () => {
  let w = arena('mage', 'nova');
  const n = dummy(w, 1.5);
  w.useSkill(0);
  run(w, DT);
  assert.ok(n.slow > 2 && n.hp < 1e6);

  w = arena('mage', 'blink');
  const p = w.player;
  const x0 = p.x;
  w.useSkill(0);
  assert.ok(p.x > x0 || w.hitsWall(x0 + 0.1, p.y, p.r));
  assert.ok(!w.hitsWall(p.x, p.y, p.r));
  assert.ok(p.invuln > 0);

  w = arena('mage', 'chain');
  const c = [dummy(w, 2), dummy(w, 2.5, 1.5), dummy(w, 3, -1.5)];
  w.useSkill(0);
  assert.ok(c.every((m) => m.hp < 1e6));

  w = arena('mage', 'meteor');
  const t = dummy(w, 3);
  w.useSkill(0);
  run(w, 0.7);
  assert.equal(t.hp, 1e6);
  run(w, 0.2);
  assert.ok(t.hp < 1e6);
});

test('Boss 只受到 30% 的暈眩時間', () => {
  const ch = hero('warrior', 30);
  ch.skills.slots = ['quake', null];
  const w = new World(ch, { area: 'easy', depth: 1, seed: 3, floor: 3 }, seededRng(2));
  const b = w.boss();
  w.player.x = b.x;
  w.player.y = b.y + 1.5;
  w.useSkill(0);
  w.updateStrikes(DT);
  assert.ok(b.stun > 0 && b.stun <= 1.5 * 0.3 + 1e-9);
});
