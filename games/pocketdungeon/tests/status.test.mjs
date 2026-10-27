// 異常狀態、寶石、主動寶石與轉職技能的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/js/pd/world.js';
import { seededRng, characterStats, gemBonus, parseGem, socketCount, makeItem, rollGem } from '../src/js/pd/rules.js';
import { STATUS, GEMS, GEM_RULES, LIMITS } from '../src/js/pd/data.js';
import * as sk from '../src/js/pd/skills.js';
import * as v from '../src/js/pd/village.js';
import { isValidCharacter, newCharacter } from '../src/js/storage.js';

const IDLE = { mx: 0, my: 0, attack: false, dodge: false, potion: false };
const DT = 1 / 60;

/**
 * 建立測試用角色。
 * @param {string} cls 職業。
 * @param {number} [level=10] 等級。
 * @param {number} [rebirth=0] 轉職次數。
 * @returns {object} 角色。
 */
function hero(cls, level = 10, rebirth = 0) {
  return {
    id: cls, cls, name: 't', level, xp: 0, gold: 10000, bag: [], rebirth, gems: {}, cures: 0, potions: 0, scroll: 0, unlocked: { grass: 1 },
    stats: { playMs: 0, kills: 0, maxHit: 0, legends: 0, deaths: 0, runs: 0 },
    equipped: { weapon: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null }, skills: sk.newSkills(cls),
  };
}

/**
 * 建立沒有怪物的探險。
 * @param {object} ch 角色。
 * @param {object} [extra] 其他探險設定。
 * @returns {World} 探險。
 */
function arena(ch, extra = {}) {
  const w = new World(ch, { area: 'easy', depth: 1, seed: 11, ...extra }, seededRng(1));
  w.monsters = [];
  w.chests = [];
  w.player.facing = { x: 1, y: 0 };
  return w;
}

/**
 * 推進數個時間步。
 * @param {World} w 探險。
 * @param {number} sec 秒數。
 * @param {object} [input] 輸入。
 */
function run(w, sec, input = IDLE) {
  for (let t = 0; t < sec; t += DT) w.update(DT, input);
}

/**
 * 在玩家附近放一隻不會主動行動的高 HP 怪物。
 * @param {World} w 探險。
 * @param {number} dx 相對 x。
 * @param {number} [dy=0] 相對 y。
 * @param {string} [type='crystal'] 種類。
 * @returns {object} 怪物。
 */
function dummy(w, dx, dy = 0, type = 'crystal') {
  const m = w.spawnMonster(type, w.player.x + dx, w.player.y + dy);
  m.hp = m.maxHp = 1e6;
  m.aggro = false;
  return m;
}

/**
 * 解除玩家的受傷無敵，讓下一次傷害可以命中。
 * @param {World} w 探險。
 */
function vulnerable(w) {
  w.player.invuln = 0;
}

test('中毒：每秒 2%，5 秒共 10%；可以毒死；Boss 2.5 秒共 5%', () => {
  let w = arena(hero('warrior'));
  const p = w.player;
  assert.ok(w.applyStatus(p, 'poison'));
  const hp0 = p.hp;
  run(w, 5.05);
  const tick = Math.max(1, Math.round(p.maxHp * STATUS.poison.pct * STATUS.poison.tick));
  assert.equal(hp0 - p.hp, tick * 10);
  assert.ok(Math.abs((hp0 - p.hp) / p.maxHp - 0.1) < 0.02);
  assert.equal(p.status.poison, 0);
  p.hp = 3;
  w.applyStatus(p, 'poison');
  run(w, 3);
  assert.equal(p.hp, 0, '可以毒死');
  assert.ok(w.events.some((e) => e.type === 'dead'));

  w = new World(hero('warrior'), { area: 'easy', depth: 1, seed: 3, floor: 3 }, seededRng(2));
  const b = w.boss();
  b.aggro = false;
  w.player.x = b.x + 30;
  w.applyStatus(b, 'poison');
  const bhp = b.hp;
  for (let t = 0; t < 3; t += DT) w.updateMonster(b, DT);
  assert.ok(Math.abs((bhp - b.hp) / b.maxHp - 0.05) < 0.002, `Boss 共 5%（${(bhp - b.hp) / b.maxHp}）`);

  w = arena(hero('warrior'));
  const m = dummy(w, 3, 0, 'bat');
  m.hp = 2;
  w.applyStatus(m, 'poison');
  run(w, 1);
  assert.ok(!w.monsters.includes(m), '怪物可以被毒死');
});

test('睡眠：不能移動與攻擊，可以喝藥水；被攻擊 3 次醒來', () => {
  const w = arena(hero('warrior'));
  const p = w.player;
  const x0 = p.x;
  w.applyStatus(p, 'sleep');
  p.hp = 50;
  run(w, 0.5, { ...IDLE, mx: 1, attack: true });
  assert.equal(p.x, x0);
  assert.equal(p.attackAnim <= 0, true);
  w.update(DT, { ...IDLE, potion: true });
  assert.ok(p.hp > 50, '睡眠中可以喝藥水');
  for (let k = 0; k < 2; k++) {
    vulnerable(w);
    w.hurtPlayer(1);
  }
  assert.ok(p.status.sleep > 0);
  vulnerable(w);
  w.hurtPlayer(1);
  assert.equal(p.status.sleep, 0);
  w.applyStatus(p, 'sleep');
  run(w, STATUS.sleep.dur + 0.1);
  assert.ok(p.status.sleep <= 0, '10 秒後自然醒來');
});

test('暈眩：不能移動、閃避、攻擊或施放技能，被攻擊也不會解除；可以喝藥水', () => {
  const w = arena(hero('warrior'));
  const p = w.player;
  const x0 = p.x;
  w.applyStatus(p, 'stun');
  p.hp = 50;
  run(w, 0.3, { ...IDLE, mx: 1, attack: true, skill1: true, dodge: true });
  assert.equal(p.x, x0);
  assert.ok(p.attackAnim <= 0 && p.skillCd[0] <= 0 && p.dodgeT <= 0);
  assert.equal(w.useSkill(0), false);
  for (let k = 0; k < 4; k++) {
    vulnerable(w);
    w.hurtPlayer(1);
  }
  assert.ok(p.status.stun > 0);
  w.update(DT, { ...IDLE, potion: true });
  assert.ok(p.hp > 50);
});

test('淨化藥水解除所有異常狀態；沒有異常時不消耗', () => {
  const w = arena(hero('warrior'), { cures: 2 });
  const p = w.player;
  w.update(DT, { ...IDLE, cure: true });
  assert.equal(p.cures, 2);
  w.applyStatus(p, 'poison');
  w.applyStatus(p, 'sleep');
  w.update(DT, { ...IDLE, cure: true });
  assert.equal(p.cures, 1);
  assert.equal(w.playerAfflicted(), false);
});

test('怪物：攻擊附帶異常狀態；睡眠中停止行動、被打 3 次醒來；暈眩中不出招；Boss 持續時間 30%', () => {
  let w = arena(hero('warrior'));
  const shroom = w.spawnMonster('mushroom', w.player.x + 1.5, w.player.y);
  shroom.aggro = true;
  shroom.cd = 0;
  run(w, DT);
  assert.deepEqual(w.telegraphs[0].status, ['poison', 0.5]);

  w = arena(hero('warrior'));
  const sk1 = w.spawnMonster('skeleton', w.player.x + 1.2, w.player.y);
  sk1.aggro = true;
  w.applyStatus(sk1, 'sleep');
  const x0 = sk1.x;
  run(w, 1);
  assert.equal(sk1.x, x0);
  assert.equal(w.telegraphs.length, 0);
  for (let k = 0; k < 3; k++) w.hitMonster(sk1, 1);
  assert.equal(sk1.status.sleep, 0);

  w = arena(hero('warrior'));
  const sk2 = w.spawnMonster('skeleton', w.player.x + 1.2, w.player.y);
  sk2.aggro = true;
  sk2.cd = 0;
  w.applyStatus(sk2, 'stun');
  const sx = sk2.x;
  run(w, 2);
  assert.equal(w.telegraphs.length, 0, '暈眩中不出招');
  assert.equal(sk2.x, sx, '暈眩中不移動');

  w = new World(hero('warrior'), { area: 'easy', depth: 1, seed: 3, floor: 3 }, seededRng(2));
  const b = w.boss();
  w.applyStatus(b, 'stun');
  assert.ok(Math.abs(b.status.stun - STATUS.stun.dur * 0.3) < 1e-9);
});

test('武器附帶的異常狀態在普通攻擊命中時觸發', () => {
  const ch = hero('warrior');
  ch.equipped.weapon = { ...makeItem({ slot: 'weapon', cls: 'warrior', level: 5, rarity: 0 }, seededRng(4)), status: ['poison', 1] };
  const w = arena(ch);
  w.aimAssist = false;
  const m = dummy(w, 1);
  w.update(DT, { ...IDLE, attack: true });
  assert.ok(m.status && m.status.poison > 0);
});

test('武器有機會附帶異常狀態，稀有度愈高機會愈大', () => {
  const rng = seededRng(9);
  const count = (rarity) => Array.from({ length: 2000 }, () => makeItem({ slot: 'weapon', cls: 'archer', level: 10, rarity }, rng)).filter((i) => i.status).length;
  const low = count(0);
  const high = count(3);
  assert.ok(low > 200 && low < 400, `普通約 15%（${low}）`);
  assert.ok(high > 800, `傳說約 45%（${high}）`);
  assert.equal(makeItem({ slot: 'armor', level: 10, rarity: 3 }, rng).status, undefined);
});

test('寶石：代碼、孔數、持續加成與吸血上限、主動寶石最多 2 個', () => {
  assert.deepEqual(parseGem('atk-3'), { kind: 'atk', tier: 3 });
  assert.equal(parseGem('shield-2'), null, '主動寶石只有 1 級');
  assert.equal(parseGem('foo-1'), null);
  assert.equal(socketCount({ rarity: 1 }), 1);
  assert.equal(socketCount({ rarity: 2 }), 2);
  const eq = [{ rarity: 3, gems: ['atk-5', 'leech-5'] }, { rarity: 3, gems: ['leech-5', 'ward-1'] }, { rarity: 1, gems: ['shield-1'] }, { rarity: 1, gems: ['ward-1'] }];
  const b = gemBonus(eq);
  assert.equal(b.atk, 15);
  assert.deepEqual(b.actives, ['shield', 'ward']);
  const base = characterStats('warrior', 10);
  const s = characterStats('warrior', 10, [{ slot: 'armor', rarity: 2, enhance: 0, stats: {}, gems: ['atk-3', 'hp-1'] }]);
  assert.equal(s.atk, Math.round(base.atk * 1.1));
  assert.equal(s.hp, Math.round(base.hp * 1.05));
  assert.equal(characterStats('warrior', 10, eq.map((e) => ({ ...e, slot: 'armor', enhance: 0, stats: {} }))).leech, GEM_RULES.leechCap);
});

test('寶石掉落：等級 1～3，深處較容易出高等級；主動寶石少見', () => {
  const rng = seededRng(5);
  const shallow = Array.from({ length: 3000 }, () => parseGem(rollGem(3, rng)));
  const deep = Array.from({ length: 3000 }, () => parseGem(rollGem(50, rng)));
  const avg = (list) => list.reduce((a, g) => a + g.tier, 0) / list.length;
  assert.ok(shallow.every(Boolean) && deep.every(Boolean));
  assert.ok(avg(deep) > avg(shallow) + 0.3);
  const actives = shallow.filter((g) => GEMS[g.kind].active).length;
  assert.ok(actives > 100 && actives < 300);
});

test('寶石鑲嵌、取下、合成；賣出裝備時寶石放回寶石袋；商店不賣寶石', () => {
  const ch = hero('warrior');
  ch.gold = 5000;
  assert.equal(v.buyGem, undefined);
  v.addGem(ch, 'atk-1');
  v.addGem(ch, 'shield-1');
  const item = makeItem({ slot: 'armor', level: 5, rarity: 0 }, seededRng(1));
  ch.bag.push(item);
  assert.ok(v.socketGem(ch, item.id, 'atk-1').ok);
  assert.equal(v.socketGem(ch, item.id, 'shield-1').ok, false, '普通裝備只有 1 孔');
  assert.equal(ch.gems['atk-1'], undefined);
  assert.ok(v.unsocketGem(ch, item.id, 0).ok);
  assert.equal(ch.gems['atk-1'], 1);
  v.addGem(ch, 'atk-1', 2);
  const gold = ch.gold;
  assert.ok(v.fuseGem(ch, 'atk-1').ok);
  assert.equal(ch.gems['atk-2'], 1);
  assert.equal(ch.gems['atk-1'], undefined);
  assert.equal(ch.gold, gold - GEM_RULES.fuseCost[1]);
  assert.equal(v.fuseGem(ch, 'shield-1').ok, false, '主動寶石不能合成');
  const rare = makeItem({ slot: 'helmet', level: 5, rarity: 2 }, seededRng(2));
  ch.bag.push(rare);
  v.addGem(ch, 'shield-1', 1);
  assert.ok(v.socketGem(ch, rare.id, 'shield-1').ok);
  assert.equal(v.socketGem(ch, rare.id, 'shield-1').ok, false, '同一件不能鑲兩顆相同的主動寶石');
  assert.ok(v.socketGem(ch, rare.id, 'atk-2').ok);
  assert.ok(v.sellItem(ch, rare.id).ok);
  assert.equal(ch.gems['atk-2'], 1);
  assert.equal(ch.gems['shield-1'], 2);
});

test('淨化藥水：商店購買上限 5 瓶，探險時攜帶、結束時放回', () => {
  const ch = hero('mage');
  ch.gold = 1000;
  for (let k = 0; k < 6; k++) v.buyCure(ch);
  assert.equal(ch.cures, LIMITS.cures);
  const carry = v.packForRun(ch);
  assert.equal(carry.cures, 5);
  const w = arena(ch, { cures: carry.cures });
  w.player.cures = 3;
  v.settleRun(ch, w, 'recall');
  assert.equal(ch.cures, 3);
});

test('主動寶石：血量護盾吸收傷害（25%、10 秒）、抗異常護盾免疫異常（30 秒），冷卻 60 秒', () => {
  const ch = hero('warrior');
  ch.equipped.armor = { ...makeItem({ slot: 'armor', level: 5, rarity: 3 }, seededRng(3)), gems: ['shield-1', 'ward-1'] };
  const w = arena(ch);
  const p = w.player;
  assert.deepEqual(p.actives, ['shield', 'ward']);
  w.update(DT, { ...IDLE, gem1: true });
  assert.equal(p.shield, Math.round(p.maxHp * 0.25));
  const hp = p.hp;
  w.hurtPlayer(10);
  assert.equal(p.hp, hp, '護盾先吸收');
  assert.equal(p.shield, Math.round(p.maxHp * 0.25) - 10);
  assert.equal(w.useActive(0), false, '冷卻中');
  w.applyStatus(p, 'poison');
  w.update(DT, { ...IDLE, gem2: true });
  assert.equal(w.playerAfflicted(), false, '展開時解除');
  assert.equal(w.applyStatus(p, 'stun'), false, '免疫');
  run(w, 10.1);
  assert.equal(p.shield, 0, '10 秒後護盾消失');
  run(w, 50);
  assert.equal(w.useActive(0), true, '60 秒後可再使用');
});

test('吸血：寶石最多 15%，嗜血技能另外疊加；每秒最多回復 2%（嗜血中 4%）最大 HP', () => {
  const ch = hero('warrior');
  ch.equipped.armor = { ...makeItem({ slot: 'armor', level: 5, rarity: 3 }, seededRng(3)), gems: ['leech-5'] };
  const w = arena(ch);
  const p = w.player;
  const m = dummy(w, 1);
  // 比例：額度充足時，寶石 15%、嗜血再疊加 40%。
  p.leechBudget = 1e9;
  p.hp = 10;
  w.hitMonster(m, 100);
  assert.equal(p.hp, 25);
  p.leechT = 5;
  p.leechPct = 0.4;
  p.hp = 10;
  w.hitMonster(m, 100);
  assert.equal(p.hp, 65);
  // 每秒上限：連續 3 秒造成大量傷害，回復量不超過 3 秒 × 2% 最大 HP。
  p.leechT = 0;
  p.leechBudget = 0;
  p.hp = 1;
  for (let t = 0; t < 3; t += DT) {
    p.invuln = 1;
    w.update(DT, IDLE);
    w.hitMonster(m, 1000);
  }
  assert.ok(p.hp - 1 <= Math.ceil(p.maxHp * 0.02 * 3) + 1, `回復 ${p.hp - 1}`);
  assert.ok(p.hp - 1 >= Math.floor(p.maxHp * 0.02 * 3) - 2);
});

test('技能欄：未轉職 2 格，每轉職一次 +1，最多 4 格；轉職技能依轉職次數解鎖', () => {
  assert.equal(sk.skillSlotCount({ rebirth: 0 }), 2);
  assert.equal(sk.skillSlotCount({ rebirth: 1 }), 3);
  assert.equal(sk.skillSlotCount({ rebirth: 3 }), 4);
  const ch = hero('archer', 1, 0);
  assert.equal(sk.equipSkill(ch, 'spread', 2).ok, false);
  assert.equal(sk.skillLevel(ch, 'venom'), 0);
  ch.rebirth = 1;
  assert.equal(sk.skillLevel(ch, 'venom'), 1);
  assert.equal(sk.skillLevel(ch, 'volley'), 0);
  assert.ok(sk.equipSkill(ch, 'venom', 2).ok);
  assert.equal(sk.equipSkill(ch, 'leap', 3).ok, false);
  assert.equal(sk.equippedSkills(ch).length, 3);
  const w = arena(ch);
  assert.equal(w.skills.length, 3);
  assert.equal(w.skills[2].id, 'venom');
  w.update(DT, { ...IDLE, skill3: true });
  assert.ok(w.player.skillCd[2] > 0);
});

test('每個轉職技能都能施放並產生效果', () => {
  const effects = {
    guard: (w) => w.player.guardT > 0,
    bloodlust: (w) => w.player.leechT > 0,
    avatar: (w) => w.player.buffT > 0,
    windwalk: (w) => w.player.hasteT > 0,
    barrier: (w) => w.player.shield > 0,
    timestop: (w, m) => m.stun > 2,
  };
  for (const cls of ['warrior', 'archer', 'mage']) {
    for (const id of sk.classSkills(cls).filter((k) => sk.SKILLS[k].rebirth)) {
      const ch = hero(cls, 1, 3);
      ch.skills.slots = [id, null, null, null];
      const w = arena(ch);
      const m = dummy(w, 1.3);
      assert.equal(w.useSkill(0), true, id);
      const check = effects[id];
      if (check) {
        assert.ok(check(w, m), id);
        continue;
      }
      // 陷阱放在腳下，等怪物走過去才引爆。
      if (id === 'trap') {
        run(w, 0.2);
        m.x = w.player.x;
        m.y = w.player.y;
      }
      run(w, 3.5);
      assert.ok(m.hp < 1e6, `${id} 造成傷害`);
      const status = sk.SKILLS[id].status;
      if (status && status[1] >= 1) assert.ok(m.status && m.status[status[0]] > 0, `${id} 附加${status[0]}`);
    }
  }
});

test('存檔驗證：轉職後 Lv.31 以上的角色合法；新角色有寶石袋與 1 瓶淨化藥水', () => {
  const ch = newCharacter('warrior', 'a');
  assert.equal(ch.cures, 1);
  assert.deepEqual(ch.gems, {});
  assert.equal(ch.skills.slots.length, 4);
  assert.ok(isValidCharacter(ch));
  ch.rebirth = 1;
  ch.level = 40;
  assert.ok(isValidCharacter(ch));
  ch.level = 41;
  assert.equal(isValidCharacter(ch), false);
  ch.level = 10;
  ch.gems = { 'atk-9': 1 };
  assert.equal(isValidCharacter(ch), false);
});

test('難度：菁英詞綴（名稱、爆裂與射手的額外招式）、出招速度隨深度與轉職提高', () => {
  const w = arena(hero('warrior'));
  const nova = w.spawnMonster('skeleton', w.player.x + 2, w.player.y, { elite: true, affix: 'nova' });
  assert.match(nova.name, /^爆裂菁英/);
  nova.aggro = true;
  nova.affixT = 0;
  nova.cd = 99;
  w.updateMonster(nova, DT);
  assert.ok(w.telegraphs.some((t) => t.shape === 'circle' && t.dmg > 0));
  const archer = w.spawnMonster('skeleton', w.player.x - 2, w.player.y, { elite: true, affix: 'volley' });
  archer.aggro = true;
  archer.affixT = 0;
  archer.cd = 99;
  w.updateMonster(archer, DT);
  assert.equal(w.projectiles.filter((p) => p.team === 'e').length, 3);
  const fast = w.spawnMonster('skeleton', w.player.x, w.player.y + 3, { elite: true, affix: 'frenzy' });
  assert.equal(fast.speed, 1.9 * 1.3);
  assert.equal(w.pace(fast), 1.4);
  const deep = new World(hero('warrior', 10, 2), { area: 'easy', depth: 5, seed: 11 }, seededRng(1));
  assert.ok(Math.abs(deep.pace({}) - 1.4) < 1e-9, '深度 5 +20%、轉職 2 次 +20%');
  const abyss = new World(hero('warrior', 10, 3), { area: 'expert', depth: 17, seed: 11 }, seededRng(1));
  assert.equal(abyss.pace({}), 1.5, '最多 1.5 倍');
});

test('Boss：HP 25% 以下狂暴；每個 Boss 的新招式都能施放', () => {
  const w = new World(hero('warrior'), { area: 'easy', depth: 1, seed: 3, floor: 3 }, seededRng(2));
  const b = w.boss();
  b.hp = b.maxHp * 0.2;
  w.updateFlow();
  w.updateMonster(b, DT);
  assert.ok(b.enraged && b.phase2);
  for (const [type, move] of [['treant', 'thorns'], ['golem', 'fissure'], ['lich', 'blizzard'], ['bullKing', 'gore'], ['thunderbird', 'cross'], ['necromancer', 'grave']]) {
    const v = new World(hero('warrior', 30), { area: 'expert', depth: 1, seed: 5, floor: 3 }, seededRng(4));
    v.monsters = [];
    const m = v.spawnMonster(type, v.player.x + 3, v.player.y, { boss: true });
    m.aggro = true;
    v.player.invuln = 1e9;
    let seen = false;
    for (let t = 0; t < 40 && !seen; t += DT) {
      const before = m.pattern;
      v.update(DT, IDLE);
      if (m.pattern !== before && m.lastMove === undefined) {
        const moves = { treant: 5, golem: 4, lich: 4, bullKing: 5, thunderbird: 4, necromancer: 4 }[type];
        const idx = { treant: 2, golem: 2, lich: 2, bullKing: 2, thunderbird: 2, necromancer: 2 }[type];
        if ((m.pattern - 1) % moves === idx) seen = v.telegraphs.length > 0 || v.projectiles.length > 0;
      }
    }
    assert.ok(seen, `${type} 的 ${move}`);
  }
});

test('每升到 5 的倍數等級送 1 顆隨機寶石（一次連升多級時每個都送）', () => {
  const ch = hero('warrior', 3);
  const w = arena(ch);
  w.addXp(1e4);
  const gifts = w.events.filter((e) => e.type === 'gem' && e.gift).map((e) => e.gift);
  const expected = [];
  for (let lv = 4; lv <= ch.level; lv++) if (lv % 5 === 0) expected.push(lv);
  assert.ok(expected.length >= 1);
  assert.deepEqual(gifts, expected);
  assert.equal(Object.values(ch.gems).reduce((a, b) => a + b, 0), expected.length);
  assert.equal(w.loot.gems.length, expected.length);
});
