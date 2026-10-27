// 異常狀態、寶石、主動寶石與轉職技能的單元測試。

import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/js/pd/world.js';
import { seededRng, characterStats, gemBonus, parseGem, socketCount, makeItem, rollGem } from '../src/js/pd/rules.js';
import { STATUS, GEMS, GEM_RULES, LIMITS, GIFT, BAG_EXPAND } from '../src/js/pd/data.js';
import * as sk from '../src/js/pd/skills.js';
import * as v from '../src/js/pd/village.js';
import { isValidCharacter, newCharacter, loadRewards } from '../src/js/storage.js';

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

test('淨化藥水：最多持有 999 瓶、每趟攜帶 5 瓶，探險時取出、結束時放回', () => {
  const ch = hero('mage');
  ch.gold = 1000;
  for (let k = 0; k < 6; k++) v.buyCure(ch);
  assert.equal(ch.cures, 6);
  ch.cures = LIMITS.cureHold;
  assert.equal(v.buyCure(ch).ok, false);
  ch.cures = 6;
  const carry = v.packForRun(ch);
  assert.equal(carry.cures, LIMITS.cures);
  assert.equal(ch.cures, 1);
  const w = arena(ch, { cures: carry.cures });
  w.player.cures = 3;
  v.settleRun(ch, w, 'recall');
  assert.equal(ch.cures, 4);
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
    evasion: (w) => w.player.guardT > 0,
    shadowHaste: (w) => w.player.hasteT > 0,
    rejuvenate: (w) => w.player.regenT > 0,
    ironShirt: (w) => w.player.guardT > 0,
    nirvana: (w) => w.player.hp >= w.player.maxHp * 0.85,
  };
  for (const cls of ['warrior', 'archer', 'mage', 'thief', 'monk']) {
    for (const id of sk.classSkills(cls).filter((k) => sk.SKILLS[k].rebirth)) {
      const ch = hero(cls, 1, 3);
      ch.skills.slots = [id, null, null, null];
      const w = arena(ch);
      const m = dummy(w, 1.3);
      w.player.hp = Math.round(w.player.maxHp * 0.3);
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

test('單手與雙手武器：單手攻擊為 80%；雙手武器卸下副手；拿雙手武器時不能裝副手', () => {
  const rng = () => 0.5;
  // 第一次亂數決定武器類型，之後固定 0.5（數值浮動相同）。
  const seq = (first) => { let n = 0; return () => (n++ ? 0.5 : first); };
  const sword = makeItem({ slot: 'weapon', cls: 'warrior', level: 10, rarity: 1 }, seq(0.1));
  const axe = makeItem({ slot: 'weapon', cls: 'warrior', level: 10, rarity: 1 }, seq(0.9));
  assert.equal(sword.type, '劍');
  assert.equal(axe.type, '斧');
  assert.ok(Math.abs(sword.stats.atk / axe.stats.atk - 0.8) < 0.05);
  const shield = makeItem({ slot: 'offhand', level: 10, rarity: 1 }, rng);
  assert.equal(shield.type, '盾牌');
  assert.ok(shield.stats.def > 0 && shield.stats.hp > 0);
  const ch = hero('warrior');
  ch.equipped.offhand = null;
  // 固定亂數產生的裝備 id 會相同，測試中另外指定。
  sword.id = 'sword';
  axe.id = 'axe';
  shield.id = 'shield';
  ch.bag.push(sword, axe, shield);
  assert.ok(v.equip(ch, sword.id).ok);
  assert.ok(v.equip(ch, shield.id).ok);
  assert.equal(ch.equipped.offhand, shield);
  const r = v.equip(ch, axe.id);
  assert.ok(r.ok);
  assert.match(r.message, /卸下/);
  assert.equal(ch.equipped.offhand, null);
  assert.ok(ch.bag.includes(shield) && ch.bag.includes(sword));
  assert.equal(v.equip(ch, shield.id).ok, false, '雙手武器時不能裝副手');
  for (const cls of ['archer', 'mage']) {
    const types = new Set(Array.from({ length: 40 }, (_, k) => makeItem({ slot: 'weapon', cls, level: 5, rarity: 0 }, seededRng(k)).type));
    assert.equal(types.size, 2, `${cls} 有單手與雙手兩種武器`);
  }
});

test('被動技能：Lv.8／16 與轉職解鎖、花技能點學習、效果套用在戰鬥中', () => {
  const ch = hero('warrior', 7);
  assert.equal(sk.upgradePassive(ch, 'toughness').ok, false, 'Lv.8 才解鎖');
  ch.level = 20;
  const pts = sk.skillPoints(ch);
  for (let k = 0; k < 5; k++) assert.ok(sk.upgradePassive(ch, 'toughness').ok);
  assert.equal(sk.upgradePassive(ch, 'toughness').ok, false, '上限 Lv.5');
  assert.equal(sk.skillPoints(ch), pts - 5);
  assert.equal(sk.upgradePassive(ch, 'berserk').ok, false, '轉職被動');
  const base = characterStats('warrior', 20);
  let w = arena(ch);
  assert.equal(w.player.maxHp, Math.round(base.hp * 1.2));
  sk.resetSkills(ch);
  assert.equal(sk.skillPoints(ch), pts);
  // 戰士轉職被動：狂戰之血與斬殺。
  ch.rebirth = 3;
  ch.skills.passive = { berserk: 5, execute: 5 };
  w = arena(ch);
  const atk = w.effAtk();
  w.player.hp = 1;
  assert.ok(Math.abs(w.effAtk() / atk - 1.4) < 1e-9);
  const m = dummy(w, 2);
  m.hp = m.maxHp * 0.2;
  const before = m.hp;
  w.hitMonster(m, 100);
  assert.equal(before - m.hp, 140);
  // 法師：技能冷卻與減傷。
  const mage = hero('mage', 20);
  mage.skills.passive = { affinity: 5 };
  w = arena(mage);
  assert.ok(Math.abs(w.skills[0].cd / sk.skillStats('nova', 1).cd - 0.8) < 1e-9);
  mage.rebirth = 1;
  mage.skills.passive = { wardSkin: 5 };
  w = arena(mage);
  const hp = w.player.hp;
  w.hurtPlayer(100);
  assert.equal(hp - w.player.hp, 85);
  // 弓箭手：毒塗箭（普通攻擊附加中毒）。
  const archer = hero('archer', 20, 1);
  archer.skills.passive = { venomTip: 5 };
  w = arena(archer);
  assert.deepEqual(w.player.attackStatus, [['poison', 0.2]]);
});

test('分解：同品質材料（2 ＋ 等級 ÷ 10 ＋ 強化），25% 機率多得高一階；寶石放回；材料堆疊只佔 1 格', () => {
  const ch = hero('warrior', 20);
  ch.mats = {};
  const a = { ...makeItem({ slot: 'armor', level: 25, rarity: 1 }, seededRng(1)), id: 'a', enhance: 3, gems: ['atk-1'] };
  const b = { ...makeItem({ slot: 'helmet', level: 5, rarity: 1 }, seededRng(2)), id: 'b' };
  ch.bag.push(a, b);
  assert.equal(v.bagUsed(ch), 2);
  assert.ok(v.salvage(ch, 'a', () => 0.1).ok);
  assert.equal(ch.mats.steel, 2 + 2 + 3);
  assert.equal(ch.mats.mithril, 1, '高品質材料');
  assert.equal(ch.gems['atk-1'], 1);
  assert.ok(v.salvage(ch, 'b', () => 0.9).ok);
  assert.equal(ch.mats.steel, 7 + 2);
  assert.equal(ch.mats.mithril, 1);
  assert.equal(v.bagUsed(ch), 2, '精鋼與秘銀各 1 格');
  assert.equal(v.salvage(ch, 'nope', Math.random).ok, false);
  ch.mats.steel = 9998;
  v.addMaterial(ch, 'steel', 5);
  assert.equal(ch.mats.steel, 9999, '最多疊 9999');
});

test('合成：製作書＋12 個同品質材料＋金幣，做出保證品質、角色等級的裝備；武器可指定類型；製作書會掉落與在商店販售', () => {
  const ch = hero('mage', 18);
  ch.gold = 1e5;
  ch.mats = { mithril: 30 };
  ch.books = {};
  assert.equal(v.craftItem(ch, 'weapon', 2, seededRng(3)).ok, false, '沒有製作書');
  v.addBook(ch, 'weapon', 2);
  assert.equal(v.craftItem(ch, 'weapon', 3, seededRng(3)).ok, false, '星辰結晶不足');
  const gold = ch.gold;
  const r = v.craftItem(ch, 'weapon', 2, seededRng(3), '魔杖');
  assert.ok(r.ok);
  assert.equal(r.item.rarity, 2);
  assert.equal(r.item.level, 18);
  assert.equal(r.item.type, '魔杖');
  assert.equal(ch.mats.mithril, 18);
  assert.equal(ch.books.weapon, 1);
  assert.equal(ch.gold, gold - v.craftCost(ch, 2).gold);
  v.refreshShop(ch, seededRng(5));
  assert.equal(ch.shopBooks.length, 2);
  const slot = ch.shopBooks[0];
  assert.ok(v.buyBook(ch, 0).ok);
  assert.ok(ch.books[slot] >= 1);
  const w = arena(ch);
  w.dropBook(w.player.x, w.player.y);
  const it = w.pickups.at(-1);
  it.t = 1;
  const before = ch.books[it.slot] || 0;
  w.updatePickups(0);
  assert.equal(ch.books[it.slot], before + 1);
});

test('背包已滿時：新材料種類無法放入；滿格時撿到的製作書自動賣出', () => {
  const ch = hero('warrior', 20);
  ch.mats = {};
  ch.books = {};
  ch.bag = Array.from({ length: 20 }, (_, i) => ({ ...makeItem({ slot: 'boots', level: 5, rarity: 0 }, seededRng(i)), id: `x${i}` }));
  assert.equal(v.addMaterial(ch, 'iron', 3), false);
  assert.ok(v.salvage(ch, 'x0', () => 0.9).ok, '分解空出 1 格放材料');
  const w = arena(ch);
  ch.bag.push({ ...makeItem({ slot: 'boots', level: 5, rarity: 0 }, seededRng(99)), id: 'y' });
  w.pickups.push({ kind: 'book', slot: 'helmet', x: w.player.x, y: w.player.y, t: 1 });
  const g = ch.gold;
  w.updatePickups(0);
  assert.ok(!ch.books.helmet && ch.gold > g);
});

test('盜賊：小刀類武器（匕首單手、雙匕雙手）、出手快 25%、爆擊；基本技能都能施放', () => {
  const types = new Set(Array.from({ length: 40 }, (_, k) => makeItem({ slot: 'weapon', cls: 'thief', level: 5, rarity: 0 }, seededRng(k)).type));
  assert.deepEqual([...types].sort(), ['匕首', '雙匕'].sort());
  const ch = hero('thief', 20);
  let w = arena(ch);
  const warrior = arena(hero('warrior', 20));
  assert.ok(w.player.interval < warrior.player.interval * 0.8);
  // 爆擊：固定亂數 0 時必定爆擊（×1.8）。
  w.rng = () => 0;
  const m = dummy(w, 3);
  w.hitMonster(m, 100);
  assert.equal(m.maxHp - m.hp, 180);
  for (const id of ['backstab', 'knives', 'smoke', 'venomBlade']) {
    w = arena(hero('thief', 30));
    w.player.skillCd = [0, 0, 0, 0];
    w.skills = [sk.skillStats(id, 1)];
    const t = dummy(w, 2);
    assert.ok(w.useSkill(0), id);
    run(w, 1);
    if (id === 'venomBlade') assert.ok(w.player.imbueT > 0 && w.effAtk() > w.player.atk);
    else assert.ok(t.hp < 1e6, `${id} 造成傷害`);
  }
});

test('武僧：拳套（雙手）、三連擊（第三擊範圍重擊，停手 1.2 秒重來）；治癒之氣回復 HP', () => {
  const ch = hero('monk', 20);
  assert.equal(makeItem({ slot: 'weapon', cls: 'monk', level: 5, rarity: 0 }, seededRng(1)).type, '拳套');
  const w = arena(ch);
  w.aimAssist = false;
  w.rng = () => 0.5;
  const front = dummy(w, 1);
  const side = dummy(w, 0.6, 1.2);
  const hits = [];
  for (let k = 0; k < 3; k++) {
    const before = front.hp;
    w.playerAttack();
    hits.push(before - front.hp);
  }
  assert.equal(w.player.combo, 3);
  assert.ok(hits[2] > hits[0] * 1.6, `第三擊較重（${hits}）`);
  assert.ok(side.hp < 1e6, '第三擊是範圍攻擊');
  run(w, 1.3);
  w.playerAttack();
  assert.equal(w.player.combo, 1, '停手後重來');
  w.skills = [sk.skillStats('healChi', 1)];
  w.player.skillCd = [0, 0, 0, 0];
  w.player.hp = 10;
  w.useSkill(0);
  assert.equal(w.player.hp, 10 + Math.round(w.player.maxHp * 0.25));
});

test('技能書：每個職業 10 種＋通用 15 種；非適合職業強度 30%、通用 100%；學會後可裝備與升級', () => {
  const ids = sk.bookSkillIds();
  assert.equal(ids.length, 65);
  for (const cls of ['warrior', 'archer', 'mage', 'thief', 'monk', 'all']) assert.equal(ids.filter((id) => sk.SKILLS[id].cls === cls).length, cls === 'all' ? 15 : 10, cls);
  assert.equal(sk.classSkills('warrior').length, 10, '職業技能不含技能書');
  const ch = hero('mage', 10);
  ch.skillBooks = {};
  assert.equal(sk.skillLevel(ch, 'cleave'), 0);
  v.addSkillBook(ch, 'cleave');
  v.addSkillBook(ch, 'renew');
  v.addSkillBook(ch, 'fireNova');
  assert.equal(v.bagUsed(ch), 3, '每種技能書 1 格');
  assert.ok(v.useSkillBook(ch, 'cleave').ok);
  assert.equal(v.useSkillBook(ch, 'cleave').ok, false, '用完了');
  assert.ok(v.useSkillBook(ch, 'renew').ok);
  assert.ok(v.useSkillBook(ch, 'fireNova').ok);
  assert.equal(sk.skillLevel(ch, 'cleave'), 1);
  assert.equal(sk.skillScale(ch, 'cleave'), 0.3);
  assert.equal(sk.skillScale(ch, 'renew'), 1);
  assert.equal(sk.skillScale(ch, 'fireNova'), 1);
  assert.ok(sk.equipSkill(ch, 'cleave', 1).ok);
  const eq = sk.equippedSkills(ch)[1];
  assert.ok(Math.abs(eq.mult - sk.SKILLS.cleave.mult * 0.3) < 1e-9);
  const pts = sk.skillPoints(ch);
  assert.ok(sk.upgradeSkill(ch, 'cleave').ok);
  assert.equal(sk.skillPoints(ch), pts - 1);
  const w = arena(ch);
  assert.equal(w.skills[1].id, 'cleave');
  assert.ok(w.useSkill(1));
  // 賣出
  v.addSkillBook(ch, 'renew');
  const g = ch.gold;
  assert.ok(v.sellSkillBook(ch, 'renew').ok);
  assert.ok(ch.gold > g);
  assert.ok(isValidCharacter({ ...newCharacter('mage', 'x'), skills: ch.skills, skillBooks: {} }));
});

test('技能書只有 Boss 會掉（一般 30%、進化必掉）', () => {
  const w = arena(hero('warrior', 20));
  w.rng = () => 0.01;
  const m = w.spawnMonster('skeleton', w.player.x + 3, w.player.y, { elite: true });
  w.killMonster(m);
  assert.equal(w.pickups.filter((p) => p.kind === 'skillBook').length, 0, '菁英不掉');
  const v2 = new World(hero('warrior', 20), { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0.01);
  v2.killMonster(v2.boss());
  assert.equal(v2.pickups.filter((p) => p.kind === 'skillBook').length, 1);
});

test('技能書稀有度：每職業普通 4、精良 3、稀有 2、傳說 1，通用 6／5／3／1；賣價依稀有度；掉落依權重', () => {
  const ids = sk.bookSkillIds();
  for (const cls of ['warrior', 'archer', 'mage', 'thief', 'monk', 'all']) {
    const counts = [0, 0, 0, 0];
    for (const id of ids.filter((k) => sk.SKILLS[k].cls === cls)) counts[sk.SKILLS[id].rarity]++;
    assert.deepEqual(counts, cls === 'all' ? [6, 5, 3, 1] : [4, 3, 2, 1], cls);
  }
  assert.equal(v.skillBookPrice('cleave'), 100);
  assert.equal(v.skillBookPrice('warGod'), 1000);
  const tally = [0, 0, 0, 0];
  const rng = seededRng(11);
  for (let k = 0; k < 400; k++) {
    const w = new World(hero('warrior', 20), { area: 'easy', depth: 1, seed: 3, floor: 3 }, rng);
    w.monsters = [];
    const b = w.spawnMonster('treant', w.player.x + 3, w.player.y, { boss: true, evolved: true });
    w.killMonster(b);
    const book = w.pickups.find((p) => p.kind === 'skillBook');
    tally[sk.SKILLS[book.skill].rarity]++;
  }
  assert.ok(tally[3] > 30 && tally[3] < 100, `進化 Boss 傳說約 15%（${tally}）`);
});

test('打怪掉材料：一般 8%、菁英 40%（1～2 個）、Boss 必掉（2～4 個）；撿到加入背包', () => {
  const w = arena(hero('warrior', 20));
  w.rng = () => 0.01;
  const m = w.spawnMonster('skeleton', w.player.x + 3, w.player.y);
  w.killMonster(m);
  const mat = w.pickups.find((p) => p.kind === 'mat');
  assert.ok(mat && mat.n === 1);
  mat.x = w.player.x;
  mat.y = w.player.y;
  mat.t = 1;
  const before = (w.ch.mats && w.ch.mats[mat.mat]) || 0;
  w.updatePickups(0);
  assert.equal(w.ch.mats[mat.mat], before + 1);
  const b = new World(hero('warrior', 20), { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0.99);
  b.killMonster(b.boss());
  const bm = b.pickups.find((p) => p.kind === 'mat');
  assert.ok(bm && bm.n >= 2 && bm.n <= 4);
  const none = arena(hero('warrior', 20));
  none.rng = () => 0.5;
  none.killMonster(none.spawnMonster('skeleton', none.player.x + 3, none.player.y));
  assert.equal(none.pickups.filter((p) => p.kind === 'mat').length, 0);
});

test('獎勵禮包：等級愈高金幣、材料、碎片愈多；碎片 3 片合成技能書', () => {
  const ch = hero('warrior', 10);
  ch.gold = 0;
  ch.mats = {};
  ch.shards = {};
  ch.gifts = {};
  assert.ok(v.addGift(ch, 1));
  assert.ok(v.addGift(ch, 5));
  const a = v.openGift(ch, 1, seededRng(1));
  const b = v.openGift(ch, 5, seededRng(1));
  assert.ok(a.ok && b.ok);
  assert.ok(b.gold > a.gold);
  const sum = (o) => Object.values(o).reduce((x, y) => x + y, 0);
  assert.equal(sum(a.mats), 3);
  assert.equal(sum(b.mats), 12);
  assert.equal(sum(a.shards), 1);
  assert.equal(sum(b.shards), 5);
  assert.equal(v.openGift(ch, 1, seededRng(1)).ok, false, '沒有禮包了');
  ch.shards = { cleave: 2 };
  assert.equal(v.combineShards(ch, 'cleave').ok, false);
  ch.shards.cleave = 3;
  assert.ok(v.combineShards(ch, 'cleave').ok);
  assert.equal(ch.skillBooks.cleave, 1);
  assert.equal(ch.shards.cleave, undefined);
});

test('獎勵禮包：有機會得到藥水與背包擴充袋，超過上限改為金幣', () => {
  const ch = newCharacter('warrior', '測試');
  ch.gifts = {};
  ch.potions = 0;
  ch.cures = 0;
  v.addGift(ch, 5, 2);
  // 亂數固定為 0：藥水、淨化藥水與擴充袋都會抽中。
  const a = v.openGift(ch, 5, () => 0);
  assert.ok(a.ok);
  assert.equal(a.potions, GIFT.potions[4]);
  assert.equal(a.cures, GIFT.cures[4]);
  assert.equal(a.pouch, 1);
  assert.equal(a.converted, 0);
  assert.equal(ch.potions, GIFT.potions[4]);
  assert.equal(ch.bagExpand, 1);
  // 藥水已滿、背包已到上限：全部改成金幣。
  ch.potions = LIMITS.potionHold;
  ch.cures = LIMITS.cureHold;
  ch.bagSize = BAG_EXPAND.max;
  const gold = ch.gold;
  const b = v.openGift(ch, 5, () => 0);
  assert.equal(b.potions + b.cures + b.pouch, 0);
  assert.equal(b.converted, GIFT.potions[4] * LIMITS.potionPrice + GIFT.cures[4] * LIMITS.curePrice + BAG_EXPAND.basePrice);
  assert.equal(ch.gold - gold, GIFT.gold[4] + b.converted);
  assert.equal(ch.potions, LIMITS.potionHold);
});

test('獲得紀錄：讀取其他遊戲寫入的紀錄，並從過關統計與 roll 進度回補（同一個 id 只算一次）', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, val) => store.set(k, String(val)), removeItem: (k) => store.delete(k) };
  store.set('games.rewards', JSON.stringify([{ id: 'sudoku:hard:clear', game: 'sudoku', type: 'clear', tier: 3, label: '困難 第一次過關', at: 5 }, { id: 'bad', game: 'nope', tier: 1, label: 'x' }]));
  store.set('sudoku.stats', JSON.stringify({ hard: { started: 3, completed: 2, noHint: 1 }, easy: { started: 1, completed: 0, noHint: 0 } }));
  store.set('roll.progress', JSON.stringify({ '3-2': { stars: 3, bestSteps: 9 }, '1-1': { stars: 1, bestSteps: 4 } }));
  const list = loadRewards();
  const ids = list.map((r) => r.id).sort();
  assert.deepEqual(ids, ['roll:1-1:clear', 'roll:3-2:clear', 'roll:3-2:star3', 'sudoku:hard:clear', 'sudoku:hard:perfect']);
  assert.equal(list.find((r) => r.id === 'sudoku:hard:perfect').tier, 4);
  assert.equal(list.find((r) => r.id === 'roll:3-2:star3').tier, 4);
  delete globalThis.localStorage;
});
