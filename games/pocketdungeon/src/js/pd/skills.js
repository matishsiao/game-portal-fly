// 技能資料與規則（純邏輯）：每個職業 4 個主動技能，依角色等級解鎖、以技能點升級，最多裝備 2 個帶進地城。
// 技能點 = 角色等級 − 1 − 已花費點數（不另外存檔，重置技能即把所有技能設回 Lv.1）。

/** 技能等級上限。 */
export const SKILL_MAX = 5;
/** 可同時裝備的技能數。 */
export const SKILL_SLOTS = 2;

/**
 * 技能定義：名稱、按鈕短名、解鎖等級、冷卻（秒）、傷害倍率與效果參數。
 * kind 決定 world.js 中的效果；每升 1 級傷害倍率 +15%、冷卻 −4%，buff 與控制時間另依 per 欄位成長。
 */
export const SKILLS = {
  whirl: { cls: 'warrior', name: '旋風斬', short: '旋風', unlock: 1, cd: 6, mult: 1.6, kind: 'spin', r: 2, text: '原地旋轉，攻擊周圍 {r} 格內所有敵人（{mult}）' },
  charge: { cls: 'warrior', name: '衝鋒', short: '衝鋒', unlock: 5, cd: 8, mult: 1.4, kind: 'charge', dist: 4, text: '向前衝刺 {dist} 格，衝刺中無敵並撞傷路上的敵人（{mult}）' },
  warcry: { cls: 'warrior', name: '戰吼', short: '戰吼', unlock: 12, cd: 18, kind: 'buff', dur: 6, pct: 0.3, per: 0.05, text: '{dur} 秒內攻擊與防禦提升 {pct}' },
  quake: { cls: 'warrior', name: '大地震擊', short: '震擊', unlock: 20, cd: 14, mult: 2.5, kind: 'slam', r: 3, stun: 1.5, text: '重擊地面，{r} 格內的敵人受到傷害（{mult}）並暈眩 {stun} 秒' },
  spread: { cls: 'archer', name: '散射', short: '散射', unlock: 1, cd: 5, mult: 0.8, kind: 'fan', count: 5, text: '朝前方扇形射出 {count} 支箭，每支（{mult}）' },
  leap: { cls: 'archer', name: '後跳射擊', short: '後跳', unlock: 5, cd: 7, mult: 2, kind: 'leap', dist: 3, text: '向後跳開 {dist} 格（無敵），同時射出一支貫穿箭（{mult}）' },
  rain: { cls: 'archer', name: '箭雨', short: '箭雨', unlock: 12, cd: 14, mult: 0.6, kind: 'rain', r: 2, ticks: 6, text: '在最近的敵人處降下箭雨，2 秒內打擊 {ticks} 次，每次（{mult}）' },
  snipe: { cls: 'archer', name: '穿透狙擊', short: '狙擊', unlock: 20, cd: 12, mult: 4, kind: 'snipe', len: 12, text: '蓄力 0.4 秒後射出貫穿 {len} 格的光箭（{mult}）' },
  nova: { cls: 'mage', name: '冰霜新星', short: '冰環', unlock: 1, cd: 7, mult: 1.2, kind: 'nova', r: 2.5, slow: 3, text: '冰環擴散，{r} 格內的敵人受到傷害（{mult}）並緩速 {slow} 秒' },
  blink: { cls: 'mage', name: '閃現', short: '閃現', unlock: 5, cd: 6, kind: 'blink', dist: 4, text: '朝面向瞬間移動 {dist} 格，短暫無敵' },
  chain: { cls: 'mage', name: '連鎖閃電', short: '閃電', unlock: 12, cd: 9, mult: 1.5, kind: 'chain', jumps: 4, text: '閃電擊中最近的敵人，再跳躍 {jumps} 次（每次{mult}）' },
  meteor: { cls: 'mage', name: '隕石術', short: '隕石', unlock: 20, cd: 16, mult: 4, kind: 'meteor', r: 2.5, text: '0.8 秒後隕石落在最近的敵人處，{r} 格內造成大傷害（{mult}）' },
};

/**
 * 某職業的技能代碼（依解鎖等級排列）。
 * @param {string} cls 職業。
 * @returns {string[]} 技能代碼。
 */
export function classSkills(cls) {
  return Object.keys(SKILLS).filter((id) => SKILLS[id].cls === cls);
}

/**
 * 建立新角色的技能資料：Lv.1 技能自動裝在第 1 格。
 * @param {string} cls 職業。
 * @returns {{lv: Record<string, number>, slots: (string | null)[]}} 技能資料。
 */
export function newSkills(cls) {
  return { lv: {}, slots: [classSkills(cls)[0], null] };
}

/**
 * 技能目前等級（未解鎖為 0）。
 * @param {object} ch 角色。
 * @param {string} id 技能代碼。
 * @returns {number} 等級。
 */
export function skillLevel(ch, id) {
  // 轉職過的角色曾經到達 Lv.30，所有技能維持解鎖。
  if (ch.level < SKILLS[id].unlock && !(ch.rebirth > 0)) return 0;
  return Math.max(1, Math.min(SKILL_MAX, ch.skills.lv[id] || 1));
}

/**
 * 可用的技能點：角色等級 − 1 ＋ 歷次轉職前滿級所得的點數（29、39、49）− 已升級的次數。
 * @param {object} ch 角色。
 * @returns {number} 點數。
 */
export function skillPoints(ch) {
  const spent = classSkills(ch.cls).reduce((sum, id) => sum + Math.max(0, skillLevel(ch, id) - 1), 0);
  let earned = ch.level - 1;
  for (let n = 0; n < (ch.rebirth || 0); n++) earned += 29 + 10 * n;
  return Math.max(0, earned - spent);
}

/**
 * 升級技能（花費 1 點）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function upgradeSkill(ch, id) {
  const s = SKILLS[id];
  const lv = skillLevel(ch, id);
  if (!lv) return { ok: false, message: `${s.name}在 Lv.${s.unlock} 解鎖` };
  if (lv >= SKILL_MAX) return { ok: false, message: `${s.name}已達上限 Lv.${SKILL_MAX}` };
  if (skillPoints(ch) <= 0) return { ok: false, message: '沒有技能點了（每升 1 級得到 1 點）' };
  ch.skills.lv[id] = lv + 1;
  return { ok: true, message: `${s.name}升到 Lv.${lv + 1}` };
}

/**
 * 把技能裝到指定欄位（已在另一格時兩格交換）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @param {number} slot 欄位（0 或 1）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function equipSkill(ch, id, slot) {
  const s = SKILLS[id];
  if (!skillLevel(ch, id)) return { ok: false, message: `${s.name}在 Lv.${s.unlock} 解鎖` };
  const slots = ch.skills.slots;
  const other = slots.indexOf(id);
  if (other >= 0 && other !== slot) slots[other] = slots[slot];
  slots[slot] = id;
  return { ok: true, message: `${s.name}裝到技能 ${slot + 1}` };
}

/**
 * 重置技能：所有技能回到 Lv.1，退回全部技能點（免費）。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function resetSkills(ch) {
  ch.skills.lv = {};
  return { ok: true, message: `技能已重置，退回 ${skillPoints(ch)} 點` };
}

/**
 * 依等級計算技能數值：傷害倍率每級 +15%、冷卻每級 −4%、buff 每級 +per。
 * @param {string} id 技能代碼。
 * @param {number} lv 等級（1～5）。
 * @returns {object} 技能定義加上計算後的 mult、cd、pct。
 */
export function skillStats(id, lv) {
  const s = SKILLS[id];
  const k = lv - 1;
  return {
    ...s, id, lv,
    mult: s.mult ? s.mult * (1 + 0.15 * k) : 0,
    cd: s.cd * (1 - 0.04 * k),
    pct: s.pct ? s.pct + (s.per || 0) * k : 0,
  };
}

/**
 * 技能說明文字（數值依等級填入）。
 * @param {string} id 技能代碼。
 * @param {number} lv 等級。
 * @returns {string} 說明。
 */
export function describeSkill(id, lv) {
  const s = skillStats(id, Math.max(1, lv));
  return s.text.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === 'mult') return `攻擊力 ×${s.mult.toFixed(2)}`;
    if (key === 'pct') return `${Math.round(s.pct * 100)}%`;
    return String(s[key]);
  });
}

/**
 * 取得角色裝備中的技能（未解鎖或空欄位為 null）。
 * @param {object} ch 角色。
 * @returns {(object | null)[]} 每格的技能數值。
 */
export function equippedSkills(ch) {
  return ch.skills.slots.map((id) => (id && SKILLS[id] && SKILLS[id].cls === ch.cls && skillLevel(ch, id) ? skillStats(id, skillLevel(ch, id)) : null));
}
