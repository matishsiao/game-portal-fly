// 技能資料與規則（純邏輯）：每個職業 4 個基本技能依角色等級解鎖，每轉職一次再解鎖 2 個轉職技能（共 10 個）；
// 以技能點升級，技能欄 2 格，每轉職一次多 1 格（最多 4 格）。
// 技能點 = 角色等級 − 1 − 已花費點數（不另外存檔，重置技能即把所有技能設回 Lv.1）。

import { STATUS } from './data.js';

/** 技能等級上限。 */
export const SKILL_MAX = 5;
/** 技能欄的格數上限（存檔中 slots 陣列的長度）。 */
export const SKILL_SLOTS = 4;
/** 未轉職時可使用的技能欄格數；每轉職一次 +1。 */
export const SKILL_BASE_SLOTS = 2;

/**
 * 技能定義：名稱、按鈕短名、解鎖條件（unlock 為等級；rebirth 為轉職次數，轉職後立即可用）、冷卻（秒）、傷害倍率與效果參數。
 * kind 決定 world.js 中的效果；每升 1 級傷害倍率 +15%、冷卻 −4%，buff 與控制時間另依 per 欄位成長。
 * status 為命中時附加的異常狀態與機率。
 */
export const SKILLS = {
  whirl: { cls: 'warrior', name: '旋風斬', short: '旋風', unlock: 1, cd: 6, mult: 1.6, kind: 'spin', r: 2, text: '原地旋轉，攻擊周圍 {r} 格內所有敵人（{mult}）' },
  charge: { cls: 'warrior', name: '衝鋒', short: '衝鋒', unlock: 5, cd: 8, mult: 1.4, kind: 'charge', dist: 4, text: '向前衝刺 {dist} 格，衝刺中無敵並撞傷路上的敵人（{mult}）' },
  warcry: { cls: 'warrior', name: '戰吼', short: '戰吼', unlock: 12, cd: 18, kind: 'buff', dur: 6, pct: 0.3, per: 0.05, text: '{dur} 秒內攻擊與防禦提升 {pct}' },
  quake: { cls: 'warrior', name: '大地震擊', short: '震擊', unlock: 20, cd: 14, mult: 2.5, kind: 'slam', r: 3, stun: 1.5, text: '重擊地面，{r} 格內的敵人受到傷害（{mult}）並定身 {stun} 秒' },
  bash: { cls: 'warrior', name: '盾擊', short: '盾擊', rebirth: 1, cd: 8, mult: 2, kind: 'bash', r: 1.8, status: ['stun', 1], text: '用盾牌猛擊前方 {r} 格扇形範圍（{mult}），{status}' },
  guard: { cls: 'warrior', name: '鐵壁', short: '鐵壁', rebirth: 1, cd: 20, kind: 'guard', dur: 6, pct: 0.4, per: 0.05, text: '{dur} 秒內受到的傷害減少 {pct}' },
  fissure: { cls: 'warrior', name: '裂地斬', short: '裂地', rebirth: 2, cd: 10, mult: 2.6, kind: 'fissure', len: 6, status: ['stun', 0.3], text: '向前劈出 {len} 格的裂地衝擊（{mult}），{status}' },
  bloodlust: { cls: 'warrior', name: '嗜血', short: '嗜血', rebirth: 2, cd: 22, kind: 'leech', dur: 8, pct: 0.2, per: 0.05, text: '{dur} 秒內把造成傷害的 {pct} 轉為 HP（可與寶石的吸血疊加）' },
  bladestorm: { cls: 'warrior', name: '劍刃風暴', short: '風暴', rebirth: 3, cd: 16, mult: 0.7, kind: 'storm', r: 2.2, ticks: 10, text: '3 秒內持續旋轉，每 0.3 秒攻擊周圍 {r} 格（{mult}），可以邊轉邊移動' },
  avatar: { cls: 'warrior', name: '英雄降臨', short: '英雄', rebirth: 3, cd: 40, kind: 'buff', dur: 10, pct: 0.5, per: 0.05, cleanse: true, text: '{dur} 秒內攻擊與防禦提升 {pct}，並解除身上的異常狀態' },
  spread: { cls: 'archer', name: '散射', short: '散射', unlock: 1, cd: 5, mult: 0.8, kind: 'fan', count: 5, status: ['poison', 0.25], text: '朝前方扇形射出 {count} 支箭，每支（{mult}），{status}' },
  leap: { cls: 'archer', name: '後跳射擊', short: '後跳', unlock: 5, cd: 7, mult: 2, kind: 'leap', dist: 3, text: '向後跳開 {dist} 格（無敵），同時射出一支貫穿箭（{mult}）' },
  rain: { cls: 'archer', name: '箭雨', short: '箭雨', unlock: 12, cd: 14, mult: 0.6, kind: 'rain', r: 2, ticks: 6, text: '在最近的敵人處降下箭雨，2 秒內打擊 {ticks} 次，每次（{mult}）' },
  snipe: { cls: 'archer', name: '穿透狙擊', short: '狙擊', unlock: 20, cd: 12, mult: 4, kind: 'snipe', len: 12, text: '蓄力 0.4 秒後射出貫穿 {len} 格的光箭（{mult}）' },
  venom: { cls: 'archer', name: '毒箭', short: '毒箭', rebirth: 1, cd: 5, mult: 1.8, kind: 'shot', pierce: true, look: 'venom', status: ['poison', 1], text: '射出一支貫穿的毒箭（{mult}），{status}' },
  lullaby: { cls: 'archer', name: '催眠箭', short: '催眠', rebirth: 1, cd: 12, mult: 0.8, kind: 'shot', look: 'lullaby', status: ['sleep', 1], text: '射出催眠箭（{mult}），{status}' },
  volley: { cls: 'archer', name: '連射', short: '連射', rebirth: 2, cd: 9, mult: 0.75, kind: 'volley', count: 6, text: '0.8 秒內朝最近的敵人連續射出 {count} 支箭，每支（{mult}）' },
  trap: { cls: 'archer', name: '捕獸夾', short: '陷阱', rebirth: 2, cd: 12, mult: 3, kind: 'trap', r: 1.6, status: ['stun', 1], text: '在腳下放置捕獸夾（15 秒），敵人踩到時爆炸，{r} 格內（{mult}），{status}' },
  starfall: { cls: 'archer', name: '流星箭雨', short: '流星', rebirth: 3, cd: 16, mult: 0.8, kind: 'rain', r: 3, ticks: 10, look: 'starfall', status: ['poison', 0.3], text: '在最近的敵人處降下流星箭雨，3 秒內打擊 {ticks} 次，每次（{mult}），{status}' },
  windwalk: { cls: 'archer', name: '疾風步', short: '疾風', rebirth: 3, cd: 25, kind: 'haste', dur: 6, pct: 0.4, per: 0.05, text: '{dur} 秒內移動速度提升 {pct}，攻擊間隔縮短 30%' },
  nova: { cls: 'mage', name: '冰霜新星', short: '冰環', unlock: 1, cd: 7, mult: 1.2, kind: 'nova', r: 2.5, slow: 3, text: '冰環擴散，{r} 格內的敵人受到傷害（{mult}）並緩速 {slow} 秒' },
  blink: { cls: 'mage', name: '閃現', short: '閃現', unlock: 5, cd: 6, kind: 'blink', dist: 4, text: '朝面向瞬間移動 {dist} 格，短暫無敵' },
  chain: { cls: 'mage', name: '連鎖閃電', short: '閃電', unlock: 12, cd: 9, mult: 1.5, kind: 'chain', jumps: 4, status: ['stun', 0.25], text: '閃電擊中最近的敵人，再跳躍 {jumps} 次（每次{mult}），{status}' },
  meteor: { cls: 'mage', name: '隕石術', short: '隕石', unlock: 20, cd: 16, mult: 4, kind: 'meteor', r: 2.5, text: '0.8 秒後隕石落在最近的敵人處，{r} 格內造成大傷害（{mult}）' },
  fireball: { cls: 'mage', name: '火球術', short: '火球', rebirth: 1, cd: 6, mult: 2.4, kind: 'shot', explode: 1.6, look: 'fireball', text: '射出火球，命中時爆炸，{explode} 格內造成傷害（{mult}）' },
  hypnosis: { cls: 'mage', name: '催眠術', short: '催眠', rebirth: 1, cd: 14, mult: 0.3, kind: 'zone', r: 2, look: 'hypnosis', status: ['sleep', 1], text: '最近的敵人周圍 {r} 格（{mult}），{status}' },
  miasma: { cls: 'mage', name: '毒霧', short: '毒霧', rebirth: 2, cd: 12, mult: 0.4, kind: 'rain', r: 2.2, ticks: 8, interval: 0.5, look: 'miasma', status: ['poison', 1], text: '在最近的敵人處產生 4 秒的毒霧，每 0.5 秒（{mult}），{status}' },
  barrier: { cls: 'mage', name: '魔力護盾', short: '護盾', rebirth: 2, cd: 24, kind: 'barrier', dur: 8, pct: 0.3, per: 0.05, text: '{dur} 秒內獲得最大 HP {pct} 的護盾' },
  thunder: { cls: 'mage', name: '雷霆風暴', short: '雷暴', rebirth: 3, cd: 16, mult: 1.4, kind: 'thunder', count: 8, r: 1.2, status: ['stun', 0.3], text: '2 秒內在周圍的敵人身上落下 {count} 道雷（每道{mult}），{status}' },
  timestop: { cls: 'mage', name: '時間停止', short: '時停', rebirth: 3, cd: 30, kind: 'freeze', r: 4, dur: 3, text: '{r} 格內的敵人完全停止 {dur} 秒（Boss 為 30%）' },
};

/**
 * 某職業的技能代碼（基本技能在前，依解鎖等級；之後是轉職技能，依轉職次數）。
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
  return { lv: {}, slots: [classSkills(cls)[0], null, null, null] };
}

/**
 * 角色可以使用的技能欄格數：2 格，每轉職一次 +1（最多 4 格）。
 * @param {object} ch 角色。
 * @returns {number} 格數。
 */
export function skillSlotCount(ch) {
  return Math.min(SKILL_SLOTS, SKILL_BASE_SLOTS + (ch.rebirth || 0));
}

/**
 * 技能的解鎖條件說明，例如「Lv.12 解鎖」或「第 2 次轉職後解鎖」。
 * @param {string} id 技能代碼。
 * @returns {string} 說明。
 */
export function unlockText(id) {
  const s = SKILLS[id];
  return s.rebirth ? `第 ${s.rebirth} 次轉職後解鎖` : `Lv.${s.unlock} 解鎖`;
}

/**
 * 技能目前等級（未解鎖為 0）。
 * @param {object} ch 角色。
 * @param {string} id 技能代碼。
 * @returns {number} 等級。
 */
export function skillLevel(ch, id) {
  const s = SKILLS[id];
  // 轉職技能依轉職次數解鎖；基本技能依等級，轉職過的角色曾經到達 Lv.30，基本技能維持解鎖。
  if (s.rebirth ? (ch.rebirth || 0) < s.rebirth : ch.level < s.unlock && !(ch.rebirth > 0)) return 0;
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
  if (!lv) return { ok: false, message: `${s.name}：${unlockText(id)}` };
  if (lv >= SKILL_MAX) return { ok: false, message: `${s.name}已達上限 Lv.${SKILL_MAX}` };
  if (skillPoints(ch) <= 0) return { ok: false, message: '沒有技能點了（每升 1 級得到 1 點）' };
  ch.skills.lv[id] = lv + 1;
  return { ok: true, message: `${s.name}升到 Lv.${lv + 1}` };
}

/**
 * 把技能裝到指定欄位（已在另一格時兩格交換）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @param {number} slot 欄位（0～3，須小於可使用的格數）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function equipSkill(ch, id, slot) {
  const s = SKILLS[id];
  if (!skillLevel(ch, id)) return { ok: false, message: `${s.name}：${unlockText(id)}` };
  if (!(slot >= 0 && slot < skillSlotCount(ch))) return { ok: false, message: `技能 ${slot + 1} 要轉職 ${slot + 1 - SKILL_BASE_SLOTS} 次才能使用` };
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
    if (key === 'status') return `${s.status[1] >= 1 ? '' : `${Math.round(s.status[1] * 100)}% 機率`}使敵人${STATUS[s.status[0]].name}`;
    return String(s[key]);
  });
}

/**
 * 取得角色可使用的技能欄中裝備的技能（未解鎖或空欄位為 null）。
 * @param {object} ch 角色。
 * @returns {(object | null)[]} 每格的技能數值（長度為可使用的格數）。
 */
export function equippedSkills(ch) {
  return ch.skills.slots.slice(0, skillSlotCount(ch)).map((id) => (id && SKILLS[id] && SKILLS[id].cls === ch.cls && skillLevel(ch, id) ? skillStats(id, skillLevel(ch, id)) : null));
}
