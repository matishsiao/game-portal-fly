// 外圍地形的距離計算：地板為 0、緊鄰地板的牆緣為 1，往外逐格加 1（8 方向）。

import test from 'node:test';
import assert from 'node:assert/strict';
import { wallDistance } from '../src/js/pd/terrain.js';

// 5 × 5 的地圖，只有正中央是地板。
test('牆與地板的距離（8 方向步數）', () => {
  /**
   * 是否為牆（只有中央格是地板）。
   * @param {number} i 格子 x。
   * @param {number} j 格子 y。
   * @returns {boolean} 牆時為 true。
   */
  const solid = (i, j) => !(i === 2 && j === 2);
  const d = wallDistance(5, 5, solid);
  assert.equal(d[2 * 5 + 2], 0);
  assert.equal(d[1 * 5 + 1], 1);
  assert.equal(d[2 * 5 + 3], 1);
  assert.equal(d[0], 2);
  assert.equal(d[4 * 5 + 4], 2);
});
