// 地城生成的單元測試：相同種子相同地圖、連通性與配置規則、Boss 層。

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFloor, validateFloor, STAIRS } from '../src/js/pd/dungeon.js';
import { AREA_KEYS, FLOORS } from '../src/js/pd/data.js';

test('相同種子產生相同樓層', () => {
  const a = generateFloor({ seed: 123, area: 'easy', depth: 1, floor: 0 });
  const b = generateFloor({ seed: 123, area: 'easy', depth: 1, floor: 0 });
  assert.deepEqual([...a.tiles], [...b.tiles]);
  assert.deepEqual(a.monsters, b.monsters);
  const c = generateFloor({ seed: 124, area: 'easy', depth: 1, floor: 0 });
  assert.notDeepEqual([...a.tiles], [...c.tiles]);
});

test('各區域的一般樓層都通過驗證，且大小在 40 × 30 以內', () => {
  for (const area of AREA_KEYS) {
    for (let seed = 1; seed <= 60; seed++) {
      const f = generateFloor({ seed, area, depth: 1 + (seed % 5), floor: seed % FLOORS });
      assert.deepEqual(validateFloor(f), [], `${area} ${seed}`);
      assert.ok(f.w <= 40 && f.h <= 30);
      assert.equal(f.tiles[Math.floor(f.stairs.y) * f.w + Math.floor(f.stairs.x)], STAIRS);
      assert.ok(f.monsters.length >= 10 && f.monsters.length <= 20, `${f.monsters.length}`);
      assert.ok(f.monsters.filter((m) => m.elite).length <= 2);
      assert.ok(f.chests.length >= 1 && f.chests.length <= 3);
    }
  }
});

test('Boss 層：固定大房間、有 Boss 與回城傳送點位置', () => {
  const f = generateFloor({ seed: 5, area: 'hard', depth: 1, floor: FLOORS });
  assert.equal(f.boss.type, 'lich');
  assert.ok(f.portal);
  assert.equal(f.stairs, null);
  assert.deepEqual(validateFloor(f), []);
});
