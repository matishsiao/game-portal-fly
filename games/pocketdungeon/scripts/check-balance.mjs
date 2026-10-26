// 數值平衡檢查：以公式估算練到 Lv30 需要的探險次數、Boss 擊殺時間、Boss 與怪物的單次傷害。
// 用法：node scripts/check-balance.mjs（不符合規格時以非 0 結束）。

import { CLASSES, AREAS, AREA_KEYS, MONSTERS, BOSSES, FLOORS, MAX_LEVEL, MAX_DEPTH } from '../src/js/pd/data.js';
import {
  characterStats, speedProfile, damage, dungeonLevel, monsterStats, killReward, makeItem, xpToNext,
} from '../src/js/pd/rules.js';

const problems = [];

/**
 * 固定回傳 0.5 的亂數（取期望值）。
 * @returns {number} 0.5。
 */
const mid = () => 0.5;

/**
 * 某等級穿戴精良的武器、頭盔、鎧甲與鞋子（裝備等級等於角色等級，不含飾品）時的屬性。
 * @param {string} cls 職業。
 * @param {number} level 等級。
 * @returns {object} 屬性。
 */
function geared(cls, level) {
  const eq = ['weapon', 'helmet', 'armor', 'boots'].map((slot) => makeItem({ slot, cls, level, rarity: 1 }, mid));
  return characterStats(cls, level, eq);
}

/**
 * 每秒傷害：普通攻擊對單一目標的期望值（法師法球與戰士扇形以單體計算）。
 * @param {string} cls 職業。
 * @param {object} s 屬性。
 * @param {number} def 目標防禦。
 * @returns {number} 每秒傷害。
 */
function dps(cls, s, def) {
  return damage(s.atk, def, CLASSES[cls].attack.mult) / speedProfile(s.spd).interval;
}

/**
 * 估算一趟探險（3 層加 Boss）的經驗值：每層怪物數取平均，菁英平均 1 隻。
 * @param {string} area 區域。
 * @param {number} depth 深度。
 * @returns {number} 經驗值。
 */
function runXp(area, depth) {
  let xp = 0;
  const avgMult = AREAS[area].monsters.reduce((a, t) => a + MONSTERS[t].xp, 0) / AREAS[area].monsters.length;
  for (let f = 0; f < FLOORS; f++) {
    const lv = dungeonLevel(area, depth, f);
    const count = 14 + f * 2;
    xp += killReward(lv, avgMult, mid).xp * (count - 1) + killReward(lv, avgMult * 3, mid).xp;
  }
  xp += killReward(dungeonLevel(area, depth, FLOORS), 20, mid).xp;
  return xp;
}

// 1. 練到 Lv30 的探險次數：每次選擇等級足夠的最難區域與深度。
{
  let level = 1;
  let xp = 0;
  let runs = 0;
  while (level < MAX_LEVEL && runs < 500) {
    let choice = ['easy', 1];
    for (const a of AREA_KEYS) {
      for (let d = 1; d <= MAX_DEPTH; d++) {
        if (dungeonLevel(a, d, FLOORS) <= level + 1) choice = [a, d];
      }
    }
    xp += runXp(...choice);
    runs++;
    while (level < MAX_LEVEL && xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level++;
    }
  }
  console.log(`練到 Lv30：約 ${runs} 趟`);
  if (runs < 40 || runs > 70) problems.push(`練到 Lv30 需要 ${runs} 趟（應為 40～70）`);
}

// 2. Boss：建議最低等級＋精良裝備，站樁輸出 120 秒內可打倒；單次傷害 ≤ 35% 最大 HP。
for (const area of AREA_KEYS) {
  const level = AREAS[area].recommend[0];
  const bl = dungeonLevel(area, 1, FLOORS);
  for (const type of AREAS[area].boss) {
    const b = monsterStats(type, bl, 1, { boss: true, abyss: area === 'expert' });
    for (const cls of Object.keys(CLASSES)) {
      const s = geared(cls, level);
      const ttk = b.hp / dps(cls, s, b.def);
      const hit = damage(b.atk, s.def, 1.2, 1) / s.hp;
      console.log(`${AREAS[area].name} ${BOSSES[type].name} vs ${CLASSES[cls].name} Lv${level}：擊殺 ${ttk.toFixed(0)} 秒，最大單擊 ${(hit * 100).toFixed(0)}%`);
      if (ttk > 120) problems.push(`${AREAS[area].name} ${BOSSES[type].name} ${CLASSES[cls].name} 擊殺 ${ttk.toFixed(0)} 秒 > 120`);
      if (hit > 0.35) problems.push(`${AREAS[area].name} ${BOSSES[type].name} 對 ${CLASSES[cls].name} 單擊 ${(hit * 100).toFixed(0)}% > 35%`);
    }
  }
}

// 3. 一般怪物（含菁英）在任何深度都不能 3 下打倒建議最低等級的角色。
for (const area of AREA_KEYS) {
  const level = AREAS[area].recommend[0];
  for (const type of AREAS[area].monsters) {
    for (const cls of Object.keys(CLASSES)) {
      const s = geared(cls, level);
      const m = monsterStats(type, dungeonLevel(area, 1, FLOORS - 1), 1, { elite: true });
      const hit = damage(m.atk, s.def, 1.3, 1);
      if (hit * 3 >= s.hp) problems.push(`${AREAS[area].name} 菁英${MONSTERS[type].name} 3 下打倒 ${CLASSES[cls].name}（${hit}／${s.hp}）`);
    }
  }
}

if (problems.length) {
  console.error(`\n不符合：\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('\n平衡檢查通過');
