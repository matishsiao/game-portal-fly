// 規則引擎與解題器的單元測試：每種物件的行為、結算順序、過關與失敗。

import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyMove, stateKey, objectAt, terrainAt, T, O } from '../src/js/engine.js';
import { solve, walkPath } from '../src/js/solver.js';

/**
 * 依序執行多個操作，任何一步無效即失敗。
 * @param {object} s 起始狀態。
 * @param {string} moves 操作字串（例如 'RRL'）。
 * @returns {object} 最後狀態。
 */
function run(s, moves) {
  let cur = s;
  for (const m of moves) {
    const r = applyMove(cur, m);
    assert.equal(r.ok, true, `操作 ${m} 無效：${r.reason}`);
    cur = r.state;
  }
  return cur;
}

test('滾滾受重力掉落，落在地面上', () => {
  const s = initialState(['#####', '#@..#', '#...#', '#####']);
  assert.deepEqual([s.player.x, s.player.y], [1, 2]);
});

test('推箱子前進一格；前方受阻時推不動；一次只能推一個', () => {
  let s = initialState(['######', '#@B..#', '######']);
  s = run(s, 'R');
  assert.ok(objectAt(s, 3, 1));
  assert.equal(s.player.x, 2);
  const blocked = initialState(['#####', '#@BB#', '#####']);
  assert.equal(applyMove(blocked, 'R').ok, false);
});

test('推到坑上的箱子會掉下去並填坑，之後可以走過去', () => {
  let s = initialState(['#######', '#@B..*#', '###.###', '#######']);
  s = run(s, 'R');
  assert.ok(objectAt(s, 3, 2), '箱子掉進坑裡');
  s = run(s, 'RRR');
  assert.equal(s.won, true);
});

test('木箱浮在水面、石塊沉到水底', () => {
  let s = initialState(['#######', '#@B...#', '###~~~#', '###~~~#', '#######']);
  s = run(s, 'R');
  const box = objectAt(s, 3, 2);
  assert.equal(box && box.type, O.BOX, '木箱停在最上層的水格');
  let t = initialState(['#######', '#@S...#', '###~~~#', '###~~~#', '#######']);
  t = run(t, 'R');
  assert.equal(objectAt(t, 3, 3).type, O.STONE, '石塊沉到水底');
});

test('滾滾可以站在浮起的木箱上過水，但不會游泳', () => {
  let s = initialState(['#######', '#@B...#', '###~###', '#######']);
  s = run(s, 'R');
  s = run(s, 'R');
  assert.deepEqual([s.player.x, s.player.y], [3, 1], '站在水面的木箱上');
  const water = initialState(['######', '#@...#', '##~###', '######']);
  assert.equal(applyMove(water, 'R').state.dead, true, '掉進水裡即失敗');
});

test('冰塊滑到阻擋為止，下方懸空時停下並掉落', () => {
  let s = initialState(['########', '#@I....#', '########']);
  s = run(s, 'R');
  assert.equal(objectAt(s, 6, 1).type, O.ICE);
  assert.equal(s.player.x, 2, '滾滾只前進一格');
  let g = initialState(['########', '#@I....#', '####.###', '########']);
  g = run(g, 'R');
  assert.equal(objectAt(g, 4, 2).type, O.ICE, '滑到坑上方後掉下去');
});

test('石塊從 2 格以上掉落時壓碎易碎磚，1 格不會', () => {
  let s = initialState(['######', '#@S..#', '##..##', '##..##', '##xx##', '##..##', '######']);
  s = run(s, 'R');
  assert.equal(terrainAt(s, 2, 4), T.AIR, '易碎磚被壓碎');
  assert.equal(objectAt(s, 2, 5).type, O.STONE);
  let t = initialState(['######', '#@S..#', '##.###', '##x###', '##.###', '######']);
  t = run(t, 'R');
  assert.equal(terrainAt(t, 2, 3), T.CRUMBLE, '只掉 1 格不會壓碎');
});

test('彈簧把滾滾彈起 3 格並懸停，可往旁邊跳上平台', () => {
  let s = initialState(['#######', '#.....#', '#....*#', '#..####', '#.....#', '#@....#', '##^####', '#######']);
  s = run(s, 'R');
  assert.equal(s.hover, true);
  assert.deepEqual([s.player.x, s.player.y], [2, 2], '彈起 3 格');
  s = run(s, 'D');
  assert.equal(s.hover, true, '往下會落回彈簧並再次彈起');
  s = run(s, 'RRR');
  assert.equal(s.won, true);
});

test('彈簧遇到上方阻擋時提前停止；物體落在彈簧上不會彈起', () => {
  let s = initialState(['######', '##.###', '#.@..#', '#.^..#', '######']);
  assert.equal(s.hover, true);
  assert.deepEqual([s.player.x, s.player.y], [2, 1], '只彈到阻擋下方');
  const box = initialState(['######', '#.B.@#', '#.^###', '######']);
  assert.equal(objectAt(box, 2, 1).type, O.BOX, '箱子停在彈簧上');
});

test('氣球往上飄，並把站在上面的滾滾帶上去', () => {
  let s = initialState(['#####', '#...#', '#...#', '#@o.#', '#####']);
  assert.equal(objectAt(s, 2, 1).type, O.BALLOON, '氣球飄到頂');
  const ride = initialState(['#####', '#...#', '#...#', '#.@.#', '#.o.#', '#####']);
  assert.deepEqual([ride.player.x, ride.player.y], [2, 1], '滾滾被氣球帶到頂');
  assert.equal(objectAt(ride, 2, 2).type, O.BALLOON);
  // 石塊太重：壓住氣球；推開石塊、站上氣球就會被帶上去。
  let pinned = initialState(['#########', '#*......#', '####.####', '#.......#', '#.......#', '#.@.S...#', '####o####', '#########']);
  assert.equal(objectAt(pinned, 4, 6).type, O.BALLOON, '石塊壓著，氣球不上升');
  pinned = run(pinned, 'RR');
  assert.deepEqual([pinned.player.x, pinned.player.y], [4, 1], '推開石塊後被氣球帶到上面');
  pinned = run(pinned, 'LLL');
  assert.equal(pinned.won, true);
});

test('梯子：在梯子上可以上下，梯子頂端可以站立；物體會穿過梯子掉落', () => {
  let s = initialState(['######', '#...*#', '#H####', '#H...#', '#H...#', '#H@..#', '######']);
  s = run(s, 'L');
  assert.equal(applyMove(s, 'U').ok, true);
  s = run(s, 'UUUU');
  assert.deepEqual([s.player.x, s.player.y], [1, 1], '爬到梯子頂端上方');
  s = run(s, 'RRR');
  assert.equal(s.won, true);
  const box = initialState(['#####', '#.B@#', '#.H##', '#.H##', '#####']);
  assert.equal(objectAt(box, 2, 3).type, O.BOX, '箱子穿過梯子掉到底');
});

test('同樣的操作在任何時候都得到同樣的結果', () => {
  const rows = ['########', '#@.B..*#', '####.###', '####~###', '########'];
  const a = run(initialState(rows), 'RR');
  const b = run(initialState(rows), 'RR');
  assert.equal(stateKey(a), stateKey(b));
});

test('解題器找出最少步數，走路路徑不推動物件', () => {
  const s = initialState(['#######', '#@B..*#', '###.###', '#######']);
  const r = solve(s);
  assert.equal(r.solved, true);
  assert.deepEqual(r.moves, ['R', 'R', 'R', 'R']);
  assert.equal(walkPath(s, 5, 1), null, '要推箱子才能到，不算走路路徑');
  const open = initialState(['######', '#@...#', '######']);
  assert.deepEqual(walkPath(open, 4, 1), ['R', 'R', 'R']);
  const stuck = initialState(['#####', '#@B*#', '#####']);
  assert.equal(solve(stuck).solved, false);
});
