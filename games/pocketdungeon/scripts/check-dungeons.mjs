// 地城生成檢查：每個區域的每個深度（一般區域 1～5、深淵 1～17）各產生 200 個樓層（含 Boss 層），驗證連通性與配置，並統計生成時間。
// 用法：node scripts/check-dungeons.mjs（有不合格樓層或生成超過 50ms 時以非 0 結束）。

import { AREA_KEYS, AREAS, MAX_DEPTH, FLOORS } from '../src/js/pd/data.js';
import { generateFloor, validateFloor } from '../src/js/pd/dungeon.js';

const COUNT = 200;
let bad = 0;
let slowest = 0;
for (const area of AREA_KEYS) {
  for (let depth = 1; depth <= (AREAS[area].maxDepth || MAX_DEPTH); depth++) {
    let total = 0;
    let monsters = 0;
    for (let k = 0; k < COUNT; k++) {
      const floor = k % (FLOORS + 1);
      const seed = (depth * 100003 + k * 7919 + area.length * 31) >>> 0;
      const t0 = performance.now();
      const f = generateFloor({ seed, area, depth, floor });
      const ms = performance.now() - t0;
      total += ms;
      slowest = Math.max(slowest, ms);
      monsters += f.monsters.length;
      const problems = validateFloor(f);
      if (problems.length) {
        bad++;
        console.error(`${area} 深度 ${depth} 種子 ${seed} 第 ${floor} 層：${problems.join('、')}`);
      }
    }
    console.log(`${AREAS[area].name} 深度 ${depth}：${COUNT} 層，平均 ${(total / COUNT).toFixed(2)}ms，平均怪物 ${(monsters / COUNT).toFixed(1)} 隻`);
  }
}
console.log(`最慢 ${slowest.toFixed(2)}ms`);
if (bad || slowest > 50) {
  console.error(`不合格：${bad} 層${slowest > 50 ? '，生成超過 50ms' : ''}`);
  process.exit(1);
}
console.log('地城檢查通過');
