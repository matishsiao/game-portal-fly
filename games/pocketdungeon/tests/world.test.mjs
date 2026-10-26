// 戰鬥模擬的單元測試：碰撞、攻擊範圍、閃避無敵、受傷無敵、藥水、拾取、怪物行為、Boss 第二階段、快照還原。

import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/js/pd/world.js';
import { seededRng, rarityWeights } from '../src/js/pd/rules.js';
import { LIMITS, MONSTERS, BOSS_HEAL } from '../src/js/pd/data.js';

const IDLE = { mx: 0, my: 0, attack: false, dodge: false, potion: false };
const DT = 1 / 60;

/**
 * 建立測試用角色。
 * @param {string} cls 職業。
 * @param {number} [level=1] 等級。
 * @returns {object} 角色。
 */
function hero(cls, level = 1) {
  return { id: cls, cls, name: 't', level, xp: 0, gold: 0, bag: [], equipped: { weapon: null, helmet: null, armor: null, boots: null, acc1: null, acc2: null } };
}

/**
 * 建立一層沒有怪物的探險（方便單獨測試）。
 * @param {string} cls 職業。
 * @param {number} [floor=0] 樓層。
 * @returns {World} 探險。
 */
function empty(cls, floor = 0) {
  const w = new World(hero(cls), { area: 'easy', depth: 1, seed: 11, floor }, seededRng(1));
  w.monsters = [];
  w.chests = [];
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

test('玩家不會穿牆', () => {
  const w = empty('warrior');
  run(w, 20, { ...IDLE, mx: 1 });
  const p = w.player;
  assert.ok(!w.hitsWall(p.x, p.y, p.r));
  run(w, 20, { ...IDLE, my: -1 });
  assert.ok(!w.hitsWall(p.x, p.y, p.r));
});

test('戰士扇形攻擊同時打中前方多隻，背後的不受影響', () => {
  const w = empty('warrior');
  const p = w.player;
  w.aimAssist = false;
  p.facing = { x: 1, y: 0 };
  const a = w.spawnMonster('skeleton', p.x + 1, p.y - 0.4);
  const b = w.spawnMonster('skeleton', p.x + 1, p.y + 0.4);
  const c = w.spawnMonster('skeleton', p.x - 1.2, p.y);
  w.playerAttack();
  assert.ok(a.hp < a.maxHp && b.hp < b.maxHp);
  assert.equal(c.hp, c.maxHp);
});

test('弓箭手的箭只命中第一隻；法師的法球爆炸造成範圍傷害', () => {
  const w = empty('archer');
  const p = w.player;
  w.aimAssist = false;
  p.facing = { x: 1, y: 0 };
  const first = w.spawnMonster('skeleton', p.x + 2, p.y);
  const second = w.spawnMonster('skeleton', p.x + 2.9, p.y);
  first.aggro = second.aggro = false;
  w.playerAttack();
  for (let i = 0; i < 30; i++) w.updateProjectiles(DT);
  assert.ok(first.hp < first.maxHp);
  assert.equal(second.hp, second.maxHp);

  const m = empty('mage');
  m.aimAssist = false;
  const mp = m.player;
  mp.facing = { x: 1, y: 0 };
  const x = m.spawnMonster('skeleton', mp.x + 2, mp.y);
  const y = m.spawnMonster('skeleton', mp.x + 2.6, mp.y + 0.5);
  m.playerAttack();
  for (let i = 0; i < 60; i++) m.updateProjectiles(DT);
  assert.ok(x.hp < x.maxHp && y.hp < y.maxHp);
});

test('閃避：0.3 秒無敵、冷卻 1.2 秒、翻滾約 3 格', () => {
  const w = empty('warrior');
  const p = w.player;
  const x0 = p.x;
  p.facing = { x: 1, y: 0 };
  w.update(DT, { ...IDLE, dodge: true });
  assert.ok(p.invuln > 0.25);
  w.hurtPlayer(10);
  assert.equal(p.hp, p.maxHp);
  run(w, 0.3);
  const moved = Math.abs(p.x - x0);
  assert.ok(moved > 2.4 && moved <= 3.05 || w.hitsWall(p.x + 0.2, p.y, p.r), `moved ${moved}`);
  w.update(DT, { ...IDLE, dodge: true });
  assert.ok(p.dodgeT <= 0, '冷卻中不能再次閃避');
  run(w, 1.0);
  w.update(DT, { ...IDLE, dodge: true });
  assert.ok(p.dodgeT > 0);
});

test('受傷後 0.6 秒無敵；藥水回復 40% 並有冷卻', () => {
  const w = empty('warrior');
  const p = w.player;
  w.hurtPlayer(50);
  assert.equal(p.hp, p.maxHp - 50);
  w.hurtPlayer(50);
  assert.equal(p.hp, p.maxHp - 50);
  run(w, 0.65);
  w.hurtPlayer(10);
  assert.equal(p.hp, p.maxHp - 60);
  const before = p.potions;
  w.update(DT, { ...IDLE, potion: true });
  assert.equal(p.hp, Math.min(p.maxHp, p.maxHp - 60 + Math.round(p.maxHp * 0.4)));
  assert.equal(p.potions, before - 1);
  p.hp = 10;
  w.update(DT, { ...IDLE, potion: true });
  assert.equal(p.hp, 10, '冷卻中不能再喝');
});

test('HP 歸零時發出倒下事件', () => {
  const w = empty('mage');
  w.hurtPlayer(9999);
  assert.equal(w.player.hp, 0);
  assert.ok(w.events.some((e) => e.type === 'dead'));
});

test('打倒怪物得到經驗值，升級時 HP 全滿', () => {
  const w = empty('warrior');
  w.player.hp = 5;
  w.ch.xp = 19;
  const m = w.spawnMonster('bat', w.player.x + 1, w.player.y);
  w.hitMonster(m, 9999);
  assert.equal(w.ch.level, 2);
  assert.equal(w.player.hp, w.player.maxHp);
  assert.equal(w.loot.kills, 1);
  assert.ok(w.events.some((e) => e.type === 'levelup'));
});

test('史萊姆被打時分裂成 2 隻小史萊姆，只分裂一次', () => {
  const w = empty('warrior');
  const s = w.spawnMonster('slime', w.player.x + 2, w.player.y);
  w.hitMonster(s, 1);
  assert.equal(w.monsters.filter((m) => m.small).length, 2);
  w.hitMonster(s, 1);
  w.hitMonster(w.monsters.find((m) => m.small), 1);
  assert.equal(w.monsters.filter((m) => m.small).length, 2);
});

test('預警：倒數結束時才造成傷害，離開範圍即可躲開', () => {
  const w = empty('warrior');
  const p = w.player;
  w.telegraph({ shape: 'circle', x: p.x, y: p.y, r: 1, t: 0.5, dmg: 30 });
  run(w, 0.4);
  assert.equal(p.hp, p.maxHp);
  run(w, 0.2);
  assert.equal(p.hp, p.maxHp - 30);
  const w2 = empty('warrior');
  w2.telegraph({ shape: 'circle', x: w2.player.x + 3, y: w2.player.y, r: 1, t: 0.5, dmg: 30 });
  run(w2, 0.6);
  assert.equal(w2.player.hp, w2.player.maxHp);
});

test('背包已滿時拾取的裝備自動賣出', () => {
  const w = empty('warrior');
  w.ch.bag = Array.from({ length: LIMITS.bag }, (_, i) => ({ id: `x${i}` }));
  const item = { id: 'new', slot: 'armor', level: 5, rarity: 1, enhance: 0, stats: { def: 3 }, name: '鎖子甲' };
  w.takeItem(item);
  assert.equal(w.ch.bag.length, LIMITS.bag);
  assert.ok(w.ch.gold > 0);
});

test('Boss 層：HP 50% 以下進入第二階段，擊敗後開啟傳送點', () => {
  for (const [area, ai] of [['easy', 'treant'], ['medium', 'golem'], ['hard', 'lich']]) {
    const w = new World(hero('warrior', 20), { area, depth: 1, seed: 3, floor: 3 }, seededRng(2));
    const b = w.boss();
    assert.equal(b.ai, ai);
    w.hitMonster(b, Math.ceil(b.maxHp / 2) + 1);
    run(w, 0.1);
    assert.ok(b.phase2);
    assert.ok(w.events.some((e) => e.type === 'phase2'));
    if (ai === 'lich') assert.equal(w.monsters.filter((m) => m.type === 'wraith').length, 2);
    if (ai === 'golem') assert.ok(w.hazards.some((h) => h.kind === 'edge'));
    w.hitMonster(b, 1e6);
    assert.ok(w.portalOpen);
    assert.equal(w.monsters.length, 0);
    w.player.x = w.floor.portal.x;
    w.player.y = w.floor.portal.y;
    run(w, 0.05);
    assert.ok(w.events.some((e) => e.type === 'victory'));
    // 回城時自動收下 Boss 的掉落與寶箱（Boss 必掉一件稀有以上）。
    assert.equal(w.pickups.length, 0);
    assert.ok(w.chests.every((c) => c.opened));
    assert.ok(w.loot.items.some((i) => i.rarity >= 2));
    assert.ok(w.loot.gold > 0);
  }
});

test('各種怪物的行為在一段時間內都會攻擊玩家（不閃避時會受傷）', () => {
  for (const type of Object.keys(MONSTERS)) {
    const w = new World(hero('warrior', 30), { area: 'easy', depth: 1, seed: 11 }, seededRng(5));
    w.monsters = [];
    const p = w.player;
    const m = w.spawnMonster(type, p.x + 2.5, p.y);
    m.aggro = true;
    run(w, 12);
    assert.ok(w.loot.damageTaken > 0, `${type} 沒有造成傷害`);
  }
});

test('快照可還原地圖、怪物、HP、所得與耗時', () => {
  const ch = hero('archer');
  const w = new World(ch, { area: 'medium', depth: 2, seed: 99 }, seededRng(4));
  run(w, 3, { ...IDLE, mx: 1, attack: true });
  w.player.hp = 33;
  w.monsters[0].hp = 1;
  const snap = JSON.parse(JSON.stringify(w.snapshot()));
  const r = World.restore(ch, snap);
  assert.deepEqual([...r.floor.tiles], [...w.floor.tiles]);
  assert.equal(r.player.hp, 33);
  assert.equal(r.monsters.length, w.monsters.length);
  assert.equal(r.monsters[0].hp, 1);
  assert.equal(r.elapsed, w.elapsed);
  assert.deepEqual([...r.explored], [...w.explored]);
});

test('點地移動：找到路徑並走到目的地', () => {
  const w = empty('warrior');
  const st = w.floor.stairs;
  assert.ok(w.setMoveTarget(st.x, st.y));
  run(w, 40);
  assert.ok(w.events.some((e) => e.type === 'stairs'));
});

test('斜走貼牆時以全速滑行；直走碰到牆角會自動修正通過', () => {
  const w = empty('warrior');
  // 自建一個小地圖：上方是牆，玩家貼著牆往右上斜走。
  const f = w.floor;
  f.tiles.fill(0);
  for (let j = 5; j < 10; j++) for (let i = 2; i < 20; i++) f.tiles[j * f.w + i] = 1;
  const p = w.player;
  p.x = 5;
  p.y = 5 + p.r + 0.01;
  const step = 0.1;
  w.slideMove(p, step * Math.SQRT1_2, -step * Math.SQRT1_2);
  assert.ok(Math.abs(p.x - 5 - step) < 1e-9, `貼牆滑行距離 ${p.x - 5}`);
  // 轉角：通道開口在 x=10～11、y=4，玩家稍微偏離開口往上走。
  f.tiles[4 * f.w + 10] = 1;
  f.tiles[4 * f.w + 11] = 1;
  f.tiles[3 * f.w + 10] = 1;
  f.tiles[3 * f.w + 11] = 1;
  p.x = 10 + p.r - 0.15;
  p.y = 5.6;
  for (let k = 0; k < 40; k++) w.slideMove(p, 0, -0.05);
  assert.ok(p.y < 4.5, `應該通過轉角進入通道，y=${p.y}`);
});

test('20 種怪物都有對應的行為與像素圖資料', () => {
  assert.equal(Object.keys(MONSTERS).length, 20);
  for (const [type, m] of Object.entries(MONSTERS)) assert.equal(typeof World.prototype.ai[m.ai], 'function', type);
});

test('Boss 回復：HP 70% 以下才會回復；蓄力 2 秒後回復 15%；受到 8% 傷害會被打斷並暈眩', () => {
  const w = new World(hero('warrior', 30), { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0);
  const b = w.boss();
  w.player.x = 3;
  w.player.y = 13;
  b.cd = 0;
  run(w, 0.05);
  assert.notEqual(b.state, 'healing', 'HP 全滿時不回復');
  b.hp = Math.round(b.maxHp * 0.6);
  b.state = 'move';
  b.cd = 0;
  run(w, 0.05);
  assert.equal(b.state, 'healing');
  assert.ok(w.events.some((e) => e.type === 'boss-heal-start'));
  const before = b.hp;
  run(w, 2.1);
  assert.equal(b.hp, Math.min(b.maxHp, before + Math.round(b.maxHp * BOSS_HEAL.pct)));
  b.hp = Math.round(b.maxHp * 0.5);
  b.state = 'move';
  b.cd = 0;
  run(w, 0.05);
  assert.equal(b.state, 'healing');
  b.hp -= Math.ceil(b.maxHp * BOSS_HEAL.breakPct);
  run(w, 0.05);
  assert.notEqual(b.state, 'healing');
  assert.ok(b.stun > 0);
  assert.ok(w.events.some((e) => e.type === 'boss-heal-break'));
  b.hp = Math.round(b.maxHp * 0.4);
  b.state = 'move';
  b.cd = 0;
  run(w, 0.05);
  assert.notEqual(b.state, 'healing', '每場最多回復 2 次');
});

test('岩漿史萊姆死亡時留下熔岩，石像鬼靠近才甦醒', () => {
  const w = empty('warrior');
  const m = w.spawnMonster('magmaSlime', w.player.x + 3, w.player.y);
  m.split = true;
  w.hitMonster(m, 1e6);
  assert.ok(w.hazards.some((h) => h.kind === 'circle'));
  const g = w.spawnMonster('gargoyle', w.player.x + 5, w.player.y);
  g.aggro = true;
  const x0 = g.x;
  run(w, 0.5);
  assert.ok(!g.awake && g.x === x0, '遠處不動');
  g.x = w.player.x + 2;
  run(w, 0.1);
  assert.ok(g.awake);
});

test('Boss 進化：破關未滿 5 次不會進化；滿 5 次有機會進化，進化後同一角色這一關永遠是進化 Boss', () => {
  const ch = hero('warrior', 20);
  ch.clears = { 'easy-1': 4 };
  let w = new World(ch, { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0);
  assert.equal(w.boss().evolved, false);
  ch.clears['easy-1'] = 5;
  w = new World(ch, { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0.99);
  assert.equal(w.boss().evolved, false, '沒擲中機率');
  w = new World(ch, { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0);
  const b = w.boss();
  assert.equal(b.evolved, true);
  assert.match(b.name, /^進化・/);
  assert.ok(ch.evolved['easy-1']);
  assert.ok(w.events.some((e) => e.type === 'boss-evolved'));
  // 之後即使機率沒擲中也一定是進化 Boss；其他關不受影響。
  assert.equal(new World(ch, { area: 'easy', depth: 1, seed: 9, floor: 3 }, () => 0.99).boss().evolved, true);
  assert.equal(new World(ch, { area: 'easy', depth: 2, seed: 9, floor: 3 }, () => 0).boss().evolved, false);
  const normal = new World(hero('warrior', 20), { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0.5).boss();
  assert.ok(Math.abs(b.maxHp / normal.maxHp - 1.6) < 0.02);
  assert.ok(b.atk > normal.atk);
});

test('進化 Boss 掉 2 件稀有以上、等級 +3 的裝備', () => {
  const ch = hero('warrior', 20);
  ch.evolved = { 'easy-1': true };
  const w = new World(ch, { area: 'easy', depth: 1, seed: 3, floor: 3 }, seededRng(7));
  w.hitMonster(w.boss(), 1e7);
  const items = w.pickups.filter((it) => it.kind === 'item').map((it) => it.item);
  assert.equal(items.length, 2);
  assert.ok(items.every((i) => i.rarity >= 2 && i.level === Math.round(w.level + 3)));
});

test('讀檔還原 Boss 層時不重新擲進化', () => {
  const ch = hero('warrior', 20);
  ch.clears = { 'easy-1': 5 };
  const w = new World(ch, { area: 'easy', depth: 1, seed: 3, floor: 3 }, () => 0.99);
  const snap = JSON.parse(JSON.stringify(w.snapshot()));
  const r = World.restore(ch, snap, () => 0);
  assert.equal(r.boss().evolved, false);
  assert.ok(!(ch.evolved && ch.evolved['easy-1']));
});

test('斜走補償：45° 斜走時水平、垂直各約為直走的 94%；藥水上限 10 瓶', () => {
  const measure = (mx, my) => {
    const w = empty('warrior');
    const f = w.floor;
    f.tiles.fill(1);
    const p = w.player;
    p.x = 20;
    p.y = 15;
    run(w, 0.5, { ...IDLE, mx, my });
    return { dx: Math.abs(p.x - 20), dy: Math.abs(p.y - 15) };
  };
  const straight = measure(1, 0);
  const diag = measure(Math.SQRT1_2, Math.SQRT1_2);
  assert.ok(Math.abs(diag.dx / straight.dx - 0.94) < 0.02, `${diag.dx / straight.dx}`);
  assert.ok(Math.abs(diag.dy / straight.dx - 0.94) < 0.02);
  assert.equal(LIMITS.potions, 10);
  const w = new World(hero('warrior'), { area: 'easy', depth: 1, seed: 1, potions: 12 }, seededRng(1));
  assert.equal(w.player.potions, 10);
});

test('轉職加成：怪物 HP／攻擊每次 +15%、掉落裝備等級每次 +2 且稀有度提高、金幣與經驗值 +15%', () => {
  const base = hero('warrior', 10);
  const reborn = { ...hero('warrior', 10), rebirth: 2 };
  const w0 = new World(base, { area: 'easy', depth: 1, seed: 4 }, () => 0.5);
  const w2 = new World(reborn, { area: 'easy', depth: 1, seed: 4 }, () => 0.5);
  const m0 = w0.spawnMonster('skeleton', 3, 3);
  const m2 = w2.spawnMonster('skeleton', 3, 3);
  assert.ok(Math.abs(m2.maxHp / m0.maxHp - 1.3) < 0.03, `${m2.maxHp / m0.maxHp}`);
  assert.ok(Math.abs(m2.atk / m0.atk - 1.3) < 0.1);
  const b0 = new World(base, { area: 'easy', depth: 1, seed: 4, floor: 3 }, () => 0.5).boss();
  const b2 = new World(reborn, { area: 'easy', depth: 1, seed: 4, floor: 3 }, () => 0.5).boss();
  assert.ok(Math.abs(b2.maxHp / b0.maxHp - 1.3) < 0.03);
  w0.pickups = [];
  w2.pickups = [];
  w0.dropItem(3, 3, 'monster');
  w2.dropItem(3, 3, 'monster');
  assert.equal(w2.pickups[0].item.level - w0.pickups[0].item.level, 4);
  const legend = (rb) => rarityWeights('monster', 1, rb)[3];
  assert.ok(legend(2) > legend(0));
  assert.ok(rarityWeights('boss', 30, 3).every((v) => v >= 0), '權重不為負');
  m0.hp = 1;
  m2.hp = 1;
  w0.hitMonster(m0, 9999);
  w2.hitMonster(m2, 9999);
  assert.ok(w2.loot.xp > w0.loot.xp);
});
