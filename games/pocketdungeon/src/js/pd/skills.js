// 技能資料與規則（純邏輯）：每個職業 4 個基本技能依角色等級解鎖，每轉職一次再解鎖 2 個轉職技能（共 10 個）；
// 以技能點升級，技能欄 2 格，獲得第 3、第 4 個主動技能時開放第 3、第 4 格。
// 另有被動技能：每個職業 2 個基本被動（Lv.8、Lv.16 解鎖）＋每轉職一次 1 個，花技能點學習，學會後一直生效。
// 技能點 = 角色等級 − 1 − 已花費點數（不另外存檔，重置技能即把所有技能設回 Lv.1）。

import { STATUS } from './data.js';

/** 技能等級上限。 */
export const SKILL_MAX = 5;
/** 技能欄的格數上限（存檔中 slots 陣列的長度）。 */
export const SKILL_SLOTS = 4;
/** 一開始就能使用的技能欄格數；之後依獲得的主動技能數增加到 SKILL_SLOTS。 */
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
  backstab: { cls: 'thief', name: '背刺', short: '背刺', unlock: 1, cd: 6, mult: 2.2, kind: 'shadowstep', dist: 5, text: '瞬間移動到 {dist} 格內最近敵人的背後刺擊（{mult}）' },
  knives: { cls: 'thief', name: '飛刀', short: '飛刀', unlock: 5, cd: 5, mult: 0.9, kind: 'fan', count: 3, status: ['poison', 0.3], text: '朝前方擲出 {count} 把飛刀，每把（{mult}），{status}' },
  smoke: { cls: 'thief', name: '煙霧彈', short: '煙霧', unlock: 12, cd: 16, mult: 0.2, kind: 'smoke', r: 2.5, status: ['sleep', 0.6], text: '丟出煙霧彈，{r} 格內（{mult}），{status}；自己 1.5 秒無敵' },
  venomBlade: { cls: 'thief', name: '致命毒刃', short: '毒刃', unlock: 20, cd: 20, kind: 'imbue', dur: 8, pct: 0.2, per: 0.05, text: '{dur} 秒內攻擊提升 {pct}，普通攻擊必定使敵人中毒' },
  flurry: { cls: 'thief', name: '疾風連斬', short: '連斬', rebirth: 1, cd: 12, mult: 0.6, kind: 'storm', r: 1.6, ticks: 8, text: '2.4 秒內在身邊連續斬擊 {ticks} 次，每次 {r} 格（{mult}），可以邊移動' },
  evasion: { cls: 'thief', name: '閃避本能', short: '閃避', rebirth: 1, cd: 20, kind: 'guard', dur: 5, pct: 0.4, per: 0.05, text: '{dur} 秒內受到的傷害減少 {pct}' },
  poisonTrap: { cls: 'thief', name: '毒霧陷阱', short: '毒阱', rebirth: 2, cd: 12, mult: 2.5, kind: 'trap', r: 2, status: ['poison', 1], text: '在腳下放置毒霧陷阱（15 秒），敵人踩到時爆開，{r} 格內（{mult}），{status}' },
  assassinate: { cls: 'thief', name: '暗殺', short: '暗殺', rebirth: 2, cd: 10, mult: 3.5, kind: 'bash', r: 1.6, status: ['stun', 0.5], text: '朝前方 {r} 格致命一擊（{mult}），{status}' },
  shadowStrike: { cls: 'thief', name: '影襲', short: '影襲', rebirth: 3, cd: 16, mult: 1.6, kind: 'thunder', count: 6, r: 1, look: 'shadow', status: ['poison', 0.4], text: '影子在周圍的敵人身上連續斬擊 {count} 次（每次{mult}），{status}' },
  shadowHaste: { cls: 'thief', name: '疾影', short: '疾影', rebirth: 3, cd: 25, kind: 'haste', dur: 6, pct: 0.5, per: 0.05, text: '{dur} 秒內移動速度提升 {pct}，攻擊間隔縮短 30%' },
  palm: { cls: 'monk', name: '氣功掌', short: '掌擊', unlock: 1, cd: 5, mult: 1.8, kind: 'fissure', len: 4, look: 'chi', text: '向前推出 {len} 格的氣功掌（{mult}）' },
  healChi: { cls: 'monk', name: '治癒之氣', short: '治癒', unlock: 5, cd: 15, kind: 'heal', pct: 0.25, per: 0.05, text: '立即回復最大 HP 的 {pct}' },
  goldenBell: { cls: 'monk', name: '金鐘罩', short: '金鐘', unlock: 12, cd: 22, kind: 'barrier', dur: 8, pct: 0.3, per: 0.05, text: '{dur} 秒內獲得最大 HP {pct} 的護盾' },
  tornadoKick: { cls: 'monk', name: '旋風腿', short: '旋風', unlock: 20, cd: 12, mult: 2.2, kind: 'spin', r: 2.2, status: ['stun', 0.3], text: '旋風腿攻擊周圍 {r} 格（{mult}），{status}' },
  rejuvenate: { cls: 'monk', name: '回春', short: '回春', rebirth: 1, cd: 25, kind: 'regen', dur: 8, pct: 0.03, per: 0.01, text: '{dur} 秒內每秒回復最大 HP 的 {pct}' },
  earthFist: { cls: 'monk', name: '震地拳', short: '震地', rebirth: 1, cd: 12, mult: 2.2, kind: 'slam', r: 2.5, stun: 1, text: '重拳擊地，{r} 格內的敵人受到傷害（{mult}）並定身 {stun} 秒' },
  hundredFists: { cls: 'monk', name: '百裂拳', short: '百裂', rebirth: 2, cd: 14, mult: 0.5, kind: 'storm', r: 1.5, ticks: 10, look: 'chi', text: '3 秒內在身邊連續出拳 {ticks} 次，每次 {r} 格（{mult}），可以邊移動' },
  ironShirt: { cls: 'monk', name: '鐵布衫', short: '鐵布', rebirth: 2, cd: 20, kind: 'guard', dur: 6, pct: 0.4, per: 0.05, text: '{dur} 秒內受到的傷害減少 {pct}' },
  chiWave: { cls: 'monk', name: '氣功波', short: '氣波', rebirth: 3, cd: 14, mult: 4.5, kind: 'snipe', len: 10, look: 'chi', text: '蓄力 0.4 秒後打出貫穿 {len} 格的氣功波（{mult}）' },
  nirvana: { cls: 'monk', name: '涅槃', short: '涅槃', rebirth: 3, cd: 45, kind: 'heal', pct: 0.6, per: 0.05, cleanse: true, text: '立即回復最大 HP 的 {pct}，並解除身上的異常狀態' },
};

/**
 * 技能書技能（每個職業 10 種，另有 15 種通用技能書 cls: 'all'）：用技能書學會後與一般主動技能相同，可以裝進技能欄並以技能點升級。
 * 任何職業都能學；不是適合的職業時，傷害倍率、百分比效果與附加異常的機率只剩 30%（BOOK_OFFCLASS）；通用技能書全職業都是 100%。
 * rarity 為技能書的稀有度（0 普通～3 傳說，愈強的技能愈稀有），決定掉落機率與賣價。
 */
const BOOK_SKILLS = {
  cleave: { cls: 'warrior', rarity: 0, name: '斬鐵', short: '斬鐵', cd: 7, mult: 2.4, kind: 'bash', r: 2.2, text: '朝前方 {r} 格扇形重斬（{mult}）' },
  lunge: { cls: 'warrior', rarity: 0, name: '突進斬', short: '突進', cd: 9, mult: 1.8, kind: 'charge', dist: 5, text: '向前突進 {dist} 格，無敵並撞傷路上的敵人（{mult}）' },
  fighting: { cls: 'warrior', rarity: 0, name: '鬥志', short: '鬥志', cd: 20, kind: 'buff', dur: 8, pct: 0.25, per: 0.05, text: '{dur} 秒內攻擊與防禦提升 {pct}' },
  shockwave: { cls: 'warrior', rarity: 1, name: '震地波', short: '震波', cd: 11, mult: 2, kind: 'fissure', len: 7, status: ['stun', 0.2], text: '向前打出 {len} 格的震地波（{mult}），{status}' },
  bloodrage: { cls: 'warrior', rarity: 2, name: '嗜殺', short: '嗜殺', cd: 24, kind: 'leech', dur: 6, pct: 0.25, per: 0.05, text: '{dur} 秒內把造成傷害的 {pct} 轉為 HP' },
  axeSpin: { cls: 'warrior', rarity: 1, name: '迴旋斧', short: '迴旋', cd: 14, mult: 0.9, kind: 'storm', r: 2.4, ticks: 6, text: '1.8 秒內在身邊旋轉 {ticks} 次，每次 {r} 格（{mult}）' },
  stoneWall: { cls: 'warrior', rarity: 0, name: '不動如山', short: '如山', cd: 26, kind: 'guard', dur: 5, pct: 0.5, per: 0.05, text: '{dur} 秒內受到的傷害減少 {pct}' },
  sunder: { cls: 'warrior', rarity: 2, name: '破甲擊', short: '破甲', cd: 10, mult: 3, kind: 'bash', r: 1.6, status: ['stun', 0.4], text: '朝前方 {r} 格破甲重擊（{mult}），{status}' },
  warGod: { cls: 'warrior', rarity: 3, name: '戰神之怒', short: '戰神', cd: 18, mult: 3, kind: 'slam', r: 3.5, stun: 1, text: '重擊地面，{r} 格內（{mult}）並定身 {stun} 秒' },
  steelSkin: { cls: 'warrior', rarity: 1, name: '鋼鐵護體', short: '鋼體', cd: 26, kind: 'barrier', dur: 8, pct: 0.35, per: 0.05, text: '{dur} 秒內獲得最大 HP {pct} 的護盾' },
  tripleShot: { cls: 'archer', rarity: 0, name: '三連矢', short: '三矢', cd: 4, mult: 1.2, kind: 'fan', count: 3, text: '朝前方射出 {count} 支箭，每支（{mult}）' },
  blastArrow: { cls: 'archer', rarity: 1, name: '爆裂箭', short: '爆裂', cd: 7, mult: 2, kind: 'shot', explode: 1.5, look: 'fireball', text: '射出命中時爆炸的箭，{explode} 格內（{mult}）' },
  frostArrow: { cls: 'archer', rarity: 0, name: '冰凍箭', short: '冰箭', cd: 8, mult: 1.4, kind: 'shot', look: 'lullaby', status: ['stun', 0.4], text: '射出冰凍箭（{mult}），{status}' },
  pierceShot: { cls: 'archer', rarity: 2, name: '穿雲箭', short: '穿雲', cd: 12, mult: 3.5, kind: 'snipe', len: 14, text: '蓄力 0.4 秒後射出貫穿 {len} 格的箭（{mult}）' },
  arrowStorm: { cls: 'archer', rarity: 3, name: '箭雨陣', short: '箭陣', cd: 15, mult: 0.55, kind: 'rain', r: 2.5, ticks: 8, text: '在最近的敵人處降下 {ticks} 次箭雨，{r} 格（每次{mult}）' },
  hawkDive: { cls: 'archer', rarity: 0, name: '鷹擊', short: '鷹擊', cd: 8, mult: 2.4, kind: 'leap', dist: 4, text: '向後跳開 {dist} 格（無敵），同時射出貫穿箭（{mult}）' },
  venomRain: { cls: 'archer', rarity: 2, name: '毒雨', short: '毒雨', cd: 14, mult: 0.4, kind: 'rain', r: 2, ticks: 6, look: 'miasma', status: ['poison', 1], text: '在最近的敵人處降下 {ticks} 次毒雨（每次{mult}），{status}' },
  rapidVolley: { cls: 'archer', rarity: 1, name: '速射', short: '速射', cd: 11, mult: 0.6, kind: 'volley', count: 8, text: '連續朝最近的敵人射出 {count} 支箭，每支（{mult}）' },
  snare: { cls: 'archer', rarity: 1, name: '獵人陷阱', short: '獵阱', cd: 13, mult: 2, kind: 'trap', r: 1.8, status: ['sleep', 1], text: '在腳下放置陷阱（15 秒），敵人踩到時 {r} 格內（{mult}），{status}' },
  galeStep: { cls: 'archer', rarity: 0, name: '風行', short: '風行', cd: 22, kind: 'haste', dur: 5, pct: 0.45, per: 0.05, text: '{dur} 秒內移動速度提升 {pct}，攻擊間隔縮短 30%' },
  fireNova: { cls: 'mage', rarity: 0, name: '火焰新星', short: '火環', cd: 8, mult: 1.6, kind: 'nova', r: 2.6, slow: 0, text: '火環擴散，{r} 格內的敵人受到傷害（{mult}）' },
  iceLance: { cls: 'mage', rarity: 0, name: '冰錐術', short: '冰錐', cd: 6, mult: 2.2, kind: 'shot', pierce: true, look: 'lullaby', text: '射出貫穿的冰錐（{mult}）' },
  lightning: { cls: 'mage', rarity: 1, name: '雷擊', short: '雷擊', cd: 8, mult: 2.2, kind: 'chain', jumps: 2, status: ['stun', 0.3], text: '閃電擊中最近的敵人再跳躍 {jumps} 次（每次{mult}），{status}' },
  meteorShower: { cls: 'mage', rarity: 3, name: '流星群', short: '流星', cd: 16, mult: 1.6, kind: 'thunder', count: 6, r: 1.3, look: 'meteor', text: '在周圍的敵人身上落下 {count} 顆流星（每顆{mult}）' },
  arcaneShield: { cls: 'mage', rarity: 0, name: '奧術護盾', short: '奧盾', cd: 24, kind: 'barrier', dur: 6, pct: 0.4, per: 0.05, text: '{dur} 秒內獲得最大 HP {pct} 的護盾' },
  teleport: { cls: 'mage', rarity: 0, name: '傳送術', short: '傳送', cd: 8, kind: 'blink', dist: 6, text: '朝面向瞬間移動 {dist} 格，短暫無敵' },
  frostField: { cls: 'mage', rarity: 1, name: '寒冰領域', short: '冰域', cd: 15, mult: 0.45, kind: 'rain', r: 2.5, ticks: 6, interval: 0.5, look: 'nova', status: ['stun', 0.15], text: '在最近的敵人處展開寒冰領域，每 0.5 秒（{mult}），{status}' },
  manaBurst: { cls: 'mage', rarity: 2, name: '法力爆發', short: '爆發', cd: 14, mult: 2.2, kind: 'nova', r: 3.2, slow: 0, text: '法力向外爆發，{r} 格內（{mult}）' },
  sleepFog: { cls: 'mage', rarity: 1, name: '沉睡之霧', short: '睡霧', cd: 16, mult: 0.2, kind: 'zone', r: 2.5, look: 'hypnosis', status: ['sleep', 1], text: '最近的敵人周圍 {r} 格（{mult}），{status}' },
  slowTime: { cls: 'mage', rarity: 2, name: '時間減緩', short: '時緩', cd: 24, kind: 'freeze', r: 3, dur: 2, text: '{r} 格內的敵人完全停止 {dur} 秒（Boss 為 30%）' },
  shadowBind: { cls: 'thief', rarity: 2, name: '影縛', short: '影縛', cd: 9, mult: 1.8, kind: 'shadowstep', dist: 6, status: ['stun', 0.5], text: '瞬移到 {dist} 格內最近敵人的背後（{mult}），{status}' },
  poisonDart: { cls: 'thief', rarity: 0, name: '毒鏢', short: '毒鏢', cd: 4, mult: 1.6, kind: 'fan', count: 1, status: ['poison', 1], text: '擲出毒鏢（{mult}），{status}' },
  quickStab: { cls: 'thief', rarity: 0, name: '連刺', short: '連刺', cd: 9, mult: 0.8, kind: 'storm', r: 1.3, ticks: 5, text: '1.5 秒內在身邊連刺 {ticks} 次，每次 {r} 格（{mult}）' },
  mist: { cls: 'thief', rarity: 1, name: '迷霧', short: '迷霧', cd: 18, mult: 0.1, kind: 'smoke', r: 3, status: ['sleep', 0.4], text: '散出迷霧，{r} 格內（{mult}），{status}；自己 1.5 秒無敵' },
  wireTrap: { cls: 'thief', rarity: 1, name: '鋼線陷阱', short: '鋼線', cd: 12, mult: 3, kind: 'trap', r: 1.5, status: ['stun', 1], text: '在腳下設下鋼線（15 秒），敵人踩到時 {r} 格內（{mult}），{status}' },
  killIntent: { cls: 'thief', rarity: 1, name: '殺意', short: '殺意', cd: 22, kind: 'imbue', dur: 6, pct: 0.3, per: 0.05, text: '{dur} 秒內攻擊提升 {pct}，普通攻擊必定使敵人中毒' },
  ambush: { cls: 'thief', rarity: 3, name: '伏擊', short: '伏擊', cd: 10, mult: 3, kind: 'shadowstep', dist: 4, text: '瞬移到 {dist} 格內最近敵人的背後重刺（{mult}）' },
  flashStep: { cls: 'thief', rarity: 0, name: '瞬步', short: '瞬步', cd: 6, kind: 'blink', dist: 5, text: '朝面向瞬間移動 {dist} 格，短暫無敵' },
  toxicNova: { cls: 'thief', rarity: 2, name: '劇毒新星', short: '毒環', cd: 12, mult: 1, kind: 'nova', r: 2.2, slow: 0, status: ['poison', 1], text: '劇毒向外擴散，{r} 格內（{mult}），{status}' },
  swiftness: { cls: 'thief', rarity: 0, name: '疾行', short: '疾行', cd: 22, kind: 'haste', dur: 6, pct: 0.4, per: 0.05, text: '{dur} 秒內移動速度提升 {pct}，攻擊間隔縮短 30%' },
  crushFist: { cls: 'monk', rarity: 0, name: '崩拳', short: '崩拳', cd: 7, mult: 2.6, kind: 'bash', r: 1.5, text: '朝前方 {r} 格打出崩拳（{mult}）' },
  palmWind: { cls: 'monk', rarity: 0, name: '掌風', short: '掌風', cd: 6, mult: 1.6, kind: 'fissure', len: 6, look: 'chi', text: '向前推出 {len} 格的掌風（{mult}）' },
  chiMend: { cls: 'monk', rarity: 0, name: '氣療', short: '氣療', cd: 12, kind: 'heal', pct: 0.2, per: 0.05, text: '立即回復最大 HP 的 {pct}' },
  vajra: { cls: 'monk', rarity: 0, name: '金剛護體', short: '金剛', cd: 24, kind: 'guard', dur: 6, pct: 0.45, per: 0.05, text: '{dur} 秒內受到的傷害減少 {pct}' },
  kickCombo: { cls: 'monk', rarity: 1, name: '連環腿', short: '連環', cd: 12, mult: 0.8, kind: 'storm', r: 1.8, ticks: 6, look: 'chi', text: '1.8 秒內連環踢 {ticks} 次，每次 {r} 格（{mult}）' },
  chiBurst: { cls: 'monk', rarity: 1, name: '氣爆', short: '氣爆', cd: 12, mult: 1.8, kind: 'nova', r: 2.4, slow: 0, text: '真氣向外爆發，{r} 格內（{mult}）' },
  holyLight: { cls: 'monk', rarity: 2, name: '聖光', short: '聖光', cd: 24, kind: 'regen', dur: 6, pct: 0.04, per: 0.01, text: '{dur} 秒內每秒回復最大 HP 的 {pct}' },
  lionRoar: { cls: 'monk', rarity: 2, name: '獅子吼', short: '獅吼', cd: 16, mult: 1.2, kind: 'slam', r: 3, stun: 1.5, text: '一聲獅吼，{r} 格內（{mult}）並定身 {stun} 秒' },
  heavenShield: { cls: 'monk', rarity: 1, name: '天罡護盾', short: '天罡', cd: 24, kind: 'barrier', dur: 6, pct: 0.35, per: 0.05, text: '{dur} 秒內獲得最大 HP {pct} 的護盾' },
  dragonKick: { cls: 'monk', rarity: 3, name: '飛龍踢', short: '龍踢', cd: 9, mult: 2.2, kind: 'charge', dist: 5, text: '向前飛踢 {dist} 格，無敵並撞傷路上的敵人（{mult}）' },
  firstAid: { cls: 'all', rarity: 0, name: '急救', short: '急救', cd: 18, kind: 'heal', pct: 0.15, per: 0.03, text: '立即回復最大 HP 的 {pct}' },
  sprint: { cls: 'all', rarity: 0, name: '衝刺', short: '衝刺', cd: 20, kind: 'haste', dur: 4, pct: 0.5, per: 0.05, text: '{dur} 秒內移動速度提升 {pct}，攻擊間隔縮短 30%' },
  ironGuard: { cls: 'all', rarity: 1, name: '鐵壁術', short: '鐵壁', cd: 22, kind: 'guard', dur: 4, pct: 0.35, per: 0.05, text: '{dur} 秒內受到的傷害減少 {pct}' },
  shieldSpell: { cls: 'all', rarity: 1, name: '護盾術', short: '護盾', cd: 24, kind: 'barrier', dur: 6, pct: 0.25, per: 0.05, text: '{dur} 秒內獲得最大 HP {pct} 的護盾' },
  roundSlash: { cls: 'all', rarity: 0, name: '旋斬', short: '旋斬', cd: 8, mult: 1.3, kind: 'spin', r: 1.8, text: '攻擊周圍 {r} 格內的敵人（{mult}）' },
  stoneThrow: { cls: 'all', rarity: 0, name: '投石', short: '投石', cd: 4, mult: 1.5, kind: 'fan', count: 1, text: '朝前方丟出石頭（{mult}）' },
  fireBolt: { cls: 'all', rarity: 1, name: '火彈', short: '火彈', cd: 7, mult: 1.6, kind: 'shot', explode: 1.2, look: 'fireball', text: '射出命中時爆炸的火彈，{explode} 格內（{mult}）' },
  groundSpike: { cls: 'all', rarity: 0, name: '地刺', short: '地刺', cd: 9, mult: 1.6, kind: 'fissure', len: 5, text: '向前竄出 {len} 格的地刺（{mult}）' },
  thunderclap: { cls: 'all', rarity: 2, name: '雷鳴', short: '雷鳴', cd: 14, mult: 1.2, kind: 'slam', r: 2.2, stun: 0.8, text: '雷鳴震盪，{r} 格內（{mult}）並定身 {stun} 秒' },
  warp: { cls: 'all', rarity: 0, name: '瞬移', short: '瞬移', cd: 9, kind: 'blink', dist: 4, text: '朝面向瞬間移動 {dist} 格，短暫無敵' },
  poisonFlask: { cls: 'all', rarity: 1, name: '毒瓶', short: '毒瓶', cd: 12, mult: 0.3, kind: 'zone', r: 2, look: 'miasma', status: ['poison', 1], text: '朝最近的敵人丟出毒瓶，{r} 格內（{mult}），{status}' },
  sleepPowder: { cls: 'all', rarity: 2, name: '催眠粉', short: '睡粉', cd: 16, mult: 0.1, kind: 'zone', r: 1.8, look: 'hypnosis', status: ['sleep', 0.8], text: '朝最近的敵人撒出催眠粉，{r} 格內（{mult}），{status}' },
  vampiric: { cls: 'all', rarity: 3, name: '吸血術', short: '吸血', cd: 24, kind: 'leech', dur: 6, pct: 0.15, per: 0.05, text: '{dur} 秒內把造成傷害的 {pct} 轉為 HP' },
  battleCry: { cls: 'all', rarity: 1, name: '戰意', short: '戰意', cd: 20, kind: 'buff', dur: 6, pct: 0.2, per: 0.05, text: '{dur} 秒內攻擊與防禦提升 {pct}' },
  renew: { cls: 'all', rarity: 2, name: '再生', short: '再生', cd: 24, kind: 'regen', dur: 6, pct: 0.025, per: 0.01, text: '{dur} 秒內每秒回復最大 HP 的 {pct}' },
};
for (const [id, s] of Object.entries(BOOK_SKILLS)) SKILLS[id] = { ...s, book: true, unlock: 1 };

/** 不是適合的職業學習技能書時，技能強度的倍率。 */
export const BOOK_OFFCLASS = 0.3;

/**
 * 所有技能書技能的代碼（依適合的職業排列）。
 * @returns {string[]} 技能代碼。
 */
export function bookSkillIds() {
  return Object.keys(SKILLS).filter((id) => SKILLS[id].book);
}

/**
 * 角色已學會的技能書技能。
 * @param {object} ch 角色。
 * @returns {string[]} 技能代碼。
 */
export function learnedBooks(ch) {
  return ((ch.skills && ch.skills.learned) || []).filter((id) => SKILLS[id] && SKILLS[id].book);
}

/**
 * 技能對這個角色的強度倍率：自己職業的技能、適合職業的技能書與通用技能書為 1，其他職業的技能書為 30%。
 * @param {object} ch 角色。
 * @param {string} id 技能代碼。
 * @returns {number} 倍率。
 */
export function skillScale(ch, id) {
  const s = SKILLS[id];
  return s.book && s.cls !== 'all' && s.cls !== ch.cls ? BOOK_OFFCLASS : 1;
}

/**
 * 用技能書學會技能（已學會的不能重複學）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 技能代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function learnBook(ch, id) {
  const s = SKILLS[id];
  if (!s || !s.book) return { ok: false, message: '這不是技能書' };
  ch.skills.learned = ch.skills.learned || [];
  if (ch.skills.learned.includes(id)) return { ok: false, message: `已經學會${s.name}` };
  ch.skills.learned.push(id);
  return { ok: true, message: `學會${s.name}${skillScale(ch, id) < 1 ? `（不是適合的職業，強度 ${Math.round(BOOK_OFFCLASS * 100)}%）` : ''}，到「技能」裝進技能欄` };
}

/**
 * 某職業的技能代碼（基本技能在前，依解鎖等級；之後是轉職技能，依轉職次數）。
 * @param {string} cls 職業。
 * @returns {string[]} 技能代碼。
 */
export function classSkills(cls) {
  return Object.keys(SKILLS).filter((id) => SKILLS[id].cls === cls && !SKILLS[id].book);
}

/**
 * 建立新角色的技能資料：Lv.1 技能自動裝在第 1 格。
 * @param {string} cls 職業。
 * @returns {{lv: Record<string, number>, slots: (string | null)[]}} 技能資料。
 */
export function newSkills(cls) {
  return { lv: {}, slots: [classSkills(cls)[0], null, null, null], passive: {}, learned: [] };
}

/**
 * 角色已獲得（可以使用）的主動技能數：自己職業已解鎖的技能加上學會的技能書技能。
 * @param {object} ch 角色。
 * @returns {number} 技能數。
 */
export function ownedSkillCount(ch) {
  return [...classSkills(ch.cls), ...learnedBooks(ch)].filter((id) => skillLevel(ch, id) > 0).length;
}

/**
 * 角色可以使用的技能欄格數：2 格；獲得第 3 個主動技能開放第 3 格、第 4 個開放第 4 格（不必轉職）。
 * 獲得的技能不會減少（等級只升不降、轉職後基本技能維持解鎖、技能書技能重置也保留），所以格數不會變少。
 * @param {object} ch 角色。
 * @returns {number} 格數（2～4）。
 */
export function skillSlotCount(ch) {
  return Math.min(SKILL_SLOTS, Math.max(SKILL_BASE_SLOTS, ownedSkillCount(ch)));
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
  // 技能書技能：學會即可使用；轉職技能依轉職次數解鎖；基本技能依等級，轉職過的角色曾經到達 Lv.30，基本技能維持解鎖。
  if (s.book) {
    if (!learnedBooks(ch).includes(id)) return 0;
  } else if (s.cls !== ch.cls || (s.rebirth ? (ch.rebirth || 0) < s.rebirth : ch.level < s.unlock && !(ch.rebirth > 0))) return 0;
  return Math.max(1, Math.min(SKILL_MAX, ch.skills.lv[id] || 1));
}

/**
 * 可用的技能點：角色等級 − 1 ＋ 歷次轉職前滿級所得的點數（29、39、49）− 主動技能已升級的次數 − 被動技能的等級。
 * @param {object} ch 角色。
 * @returns {number} 點數。
 */
export function skillPoints(ch) {
  const spent = [...classSkills(ch.cls), ...learnedBooks(ch)].reduce((sum, id) => sum + Math.max(0, skillLevel(ch, id) - 1), 0)
    + classPassives(ch.cls).reduce((sum, id) => sum + passiveLevel(ch, id), 0);
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
  if (!(slot >= 0 && slot < skillSlotCount(ch))) return { ok: false, message: `技能 ${slot + 1} 要獲得第 ${slot + 1} 個技能才能使用` };
  const slots = ch.skills.slots;
  const other = slots.indexOf(id);
  if (other >= 0 && other !== slot) slots[other] = slots[slot];
  slots[slot] = id;
  return { ok: true, message: `${s.name}裝到技能 ${slot + 1}` };
}

/**
 * 重置技能：所有主動技能（含已學會的技能書技能）回到 Lv.1、被動技能歸零，退回全部技能點（免費）；學會的技能書技能保留。
 * @param {object} ch 角色（會被修改）。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function resetSkills(ch) {
  ch.skills.lv = {};
  ch.skills.passive = {};
  return { ok: true, message: `技能已重置，退回 ${skillPoints(ch)} 點` };
}

/**
 * 依等級計算技能數值：傷害倍率每級 +15%、冷卻每級 −4%、buff 每級 +per；scale 為強度倍率
 * （非適合職業的技能書 30%，套用在傷害倍率、百分比效果與附加異常的機率，冷卻不變）。
 * @param {string} id 技能代碼。
 * @param {number} lv 等級（1～5）。
 * @param {number} [scale=1] 強度倍率。
 * @returns {object} 技能定義加上計算後的 mult、cd、pct、status。
 */
export function skillStats(id, lv, scale = 1) {
  const s = SKILLS[id];
  const k = lv - 1;
  return {
    ...s, id, lv, scale,
    mult: s.mult ? s.mult * (1 + 0.15 * k) * scale : 0,
    cd: s.cd * (1 - 0.04 * k),
    pct: s.pct ? (s.pct + (s.per || 0) * k) * scale : 0,
    status: s.status ? [s.status[0], s.status[1] * scale] : undefined,
  };
}

/**
 * 技能說明文字（數值依等級與強度倍率填入）。
 * @param {string} id 技能代碼。
 * @param {number} lv 等級。
 * @param {number} [scale=1] 強度倍率（非適合職業的技能書為 30%）。
 * @returns {string} 說明。
 */
export function describeSkill(id, lv, scale = 1) {
  const s = skillStats(id, Math.max(1, lv), scale);
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
  return ch.skills.slots.slice(0, skillSlotCount(ch)).map((id) => (id && SKILLS[id] && skillLevel(ch, id) ? skillStats(id, skillLevel(ch, id), skillScale(ch, id)) : null));
}

/** 被動技能等級上限。 */
export const PASSIVE_MAX = 5;

/**
 * 被動技能：名稱、解鎖條件（unlock 為等級；rebirth 為轉職次數）、每級效果（per）與說明。
 * 效果欄位：hpPct、atkPct、defPct（%）、shieldDefPct（裝備副手時防禦 %）、spd（速度）、dodgeCd（閃避冷卻 −%）、
 * lowHpAtk（HP 30% 以下攻擊 +%）、statusResist（受到的異常時間 −%）、execute（對 HP 30% 以下的敵人傷害 +%）、
 * poisonProc／stunProc（普通攻擊附加異常的機率 %）、interval（攻擊間隔 −%）、eliteDmg（對菁英與 Boss 傷害 +%）、
 * skillCd（技能冷卻 −%）、skillDmg（技能傷害 +%）、dmgReduce（受到傷害 −%）、orbRadius（法球爆炸範圍 +%）、
 * crit（爆擊率 +%）、critDmg（爆擊傷害 +%）、comboDmg（三連擊第三擊傷害 +%）、healBoost（回復技能效果 +%）、regen（每秒回復最大 HP 的 %）。
 */
export const PASSIVES = {
  toughness: { cls: 'warrior', name: '堅韌', unlock: 8, per: { hpPct: 4 }, text: '最大 HP +{hpPct}%' },
  shieldMastery: { cls: 'warrior', name: '盾牌精通', unlock: 16, per: { shieldDefPct: 6 }, text: '裝備副手（盾牌）時防禦 +{shieldDefPct}%' },
  berserk: { cls: 'warrior', name: '狂戰之血', rebirth: 1, per: { lowHpAtk: 8 }, text: 'HP 低於 30% 時攻擊 +{lowHpAtk}%' },
  ironWill: { cls: 'warrior', name: '鋼鐵意志', rebirth: 2, per: { statusResist: 10 }, text: '受到的異常狀態時間 −{statusResist}%' },
  execute: { cls: 'warrior', name: '斬殺', rebirth: 3, per: { execute: 8 }, text: '對 HP 30% 以下的敵人傷害 +{execute}%' },
  hawkEye: { cls: 'archer', name: '鷹眼', unlock: 8, per: { atkPct: 3 }, text: '攻擊 +{atkPct}%' },
  nimble: { cls: 'archer', name: '輕盈', unlock: 16, per: { spd: 3, dodgeCd: 5 }, text: '速度 +{spd}，閃避冷卻 −{dodgeCd}%' },
  venomTip: { cls: 'archer', name: '毒塗箭', rebirth: 1, per: { poisonProc: 4 }, text: '普通攻擊 {poisonProc}% 機率使敵人中毒' },
  rapidFire: { cls: 'archer', name: '疾射', rebirth: 2, per: { interval: 4 }, text: '攻擊間隔 −{interval}%' },
  hunter: { cls: 'archer', name: '獵人本能', rebirth: 3, per: { eliteDmg: 6 }, text: '對菁英與 Boss 的傷害 +{eliteDmg}%' },
  affinity: { cls: 'mage', name: '魔力親和', unlock: 8, per: { skillCd: 4 }, text: '技能冷卻 −{skillCd}%' },
  empower: { cls: 'mage', name: '法術強化', unlock: 16, per: { skillDmg: 5 }, text: '技能傷害 +{skillDmg}%' },
  wardSkin: { cls: 'mage', name: '魔法屏障', rebirth: 1, per: { dmgReduce: 3 }, text: '受到的傷害 −{dmgReduce}%' },
  resonance: { cls: 'mage', name: '元素共鳴', rebirth: 2, per: { orbRadius: 8 }, text: '法球爆炸範圍 +{orbRadius}%' },
  frostHeart: { cls: 'mage', name: '冰心', rebirth: 3, per: { stunProc: 2 }, text: '普通攻擊 {stunProc}% 機率使敵人暈眩' },
  deadly: { cls: 'thief', name: '致命', unlock: 8, per: { crit: 4 }, text: '爆擊率 +{crit}%' },
  agility: { cls: 'thief', name: '敏捷', unlock: 16, per: { spd: 3, dodgeCd: 5 }, text: '速度 +{spd}，閃避冷卻 −{dodgeCd}%' },
  venomEdge: { cls: 'thief', name: '淬毒', rebirth: 1, per: { poisonProc: 4 }, text: '普通攻擊 {poisonProc}% 機率使敵人中毒' },
  shadowArts: { cls: 'thief', name: '影之技藝', rebirth: 2, per: { critDmg: 10 }, text: '爆擊傷害 +{critDmg}%' },
  killer: { cls: 'thief', name: '收割', rebirth: 3, per: { execute: 8 }, text: '對 HP 30% 以下的敵人傷害 +{execute}%' },
  innerStrength: { cls: 'monk', name: '強身', unlock: 8, per: { hpPct: 4 }, text: '最大 HP +{hpPct}%' },
  comboMaster: { cls: 'monk', name: '連擊精通', unlock: 16, per: { comboDmg: 10 }, text: '三連擊第三擊的傷害 +{comboDmg}%' },
  innerPeace: { cls: 'monk', name: '內功', rebirth: 1, per: { healBoost: 6 }, text: '回復技能的效果 +{healBoost}%' },
  diamondBody: { cls: 'monk', name: '金剛不壞', rebirth: 2, per: { dmgReduce: 3 }, text: '受到的傷害 −{dmgReduce}%' },
  vitality: { cls: 'monk', name: '氣血', rebirth: 3, per: { regen: 0.3 }, text: '每秒回復最大 HP 的 {regen}%' },
};

/**
 * 某職業的被動技能代碼（基本在前，之後依轉職次數）。
 * @param {string} cls 職業。
 * @returns {string[]} 被動技能代碼。
 */
export function classPassives(cls) {
  return Object.keys(PASSIVES).filter((id) => PASSIVES[id].cls === cls);
}

/**
 * 被動技能是否已解鎖（可以學習）：基本被動依等級（轉職過的角色維持解鎖），轉職被動依轉職次數。
 * @param {object} ch 角色。
 * @param {string} id 被動技能代碼。
 * @returns {boolean} 已解鎖時為 true。
 */
export function passiveUnlocked(ch, id) {
  const s = PASSIVES[id];
  return s.rebirth ? (ch.rebirth || 0) >= s.rebirth : ch.level >= s.unlock || (ch.rebirth || 0) > 0;
}

/**
 * 被動技能目前的等級（未學或未解鎖為 0）。
 * @param {object} ch 角色。
 * @param {string} id 被動技能代碼。
 * @returns {number} 0～5。
 */
export function passiveLevel(ch, id) {
  if (!ch.skills || !passiveUnlocked(ch, id)) return 0;
  return Math.max(0, Math.min(PASSIVE_MAX, (ch.skills.passive && ch.skills.passive[id]) || 0));
}

/**
 * 被動技能的解鎖條件說明。
 * @param {string} id 被動技能代碼。
 * @returns {string} 例如「Lv.8 解鎖」。
 */
export function passiveUnlockText(id) {
  const s = PASSIVES[id];
  return s.rebirth ? `第 ${s.rebirth} 次轉職後解鎖` : `Lv.${s.unlock} 解鎖`;
}

/**
 * 學習或升級被動技能（花費 1 點）。
 * @param {object} ch 角色（會被修改）。
 * @param {string} id 被動技能代碼。
 * @returns {{ok: boolean, message: string}} 結果。
 */
export function upgradePassive(ch, id) {
  const s = PASSIVES[id];
  if (!s || s.cls !== ch.cls) return { ok: false, message: '找不到這個被動技能' };
  if (!passiveUnlocked(ch, id)) return { ok: false, message: `${s.name}：${passiveUnlockText(id)}` };
  const lv = passiveLevel(ch, id);
  if (lv >= PASSIVE_MAX) return { ok: false, message: `${s.name}已達上限 Lv.${PASSIVE_MAX}` };
  if (skillPoints(ch) <= 0) return { ok: false, message: '沒有技能點了（每升 1 級得到 1 點）' };
  ch.skills.passive = ch.skills.passive || {};
  ch.skills.passive[id] = lv + 1;
  return { ok: true, message: lv ? `${s.name}升到 Lv.${lv + 1}` : `學會${s.name}` };
}

/**
 * 被動技能的說明（數值依等級填入，等級 0 時以 Lv.1 顯示）。
 * @param {string} id 被動技能代碼。
 * @param {number} lv 等級。
 * @returns {string} 說明。
 */
export function describePassive(id, lv) {
  const s = PASSIVES[id];
  const k = Math.max(1, lv);
  return s.text.replace(/\{(\w+)\}/g, (_, key) => String(Math.round(s.per[key] * k * 10) / 10));
}

/**
 * 角色所有被動技能的效果加總（未學的為 0）；裝備副手時盾牌精通併入防禦 %。
 * @param {object} ch 角色。
 * @returns {Record<string, number>} 效果（欄位見 PASSIVES）。
 */
export function passiveBonus(ch) {
  const out = {
    hpPct: 0, atkPct: 0, defPct: 0, shieldDefPct: 0, spd: 0, dodgeCd: 0, lowHpAtk: 0, statusResist: 0, execute: 0,
    poisonProc: 0, stunProc: 0, interval: 0, eliteDmg: 0, skillCd: 0, skillDmg: 0, dmgReduce: 0, orbRadius: 0,
    crit: 0, critDmg: 0, comboDmg: 0, healBoost: 0, regen: 0,
  };
  if (!ch || !ch.skills) return out;
  for (const id of classPassives(ch.cls)) {
    const lv = passiveLevel(ch, id);
    for (const [k, v] of Object.entries(PASSIVES[id].per)) out[k] += v * lv;
  }
  if (ch.equipped && ch.equipped.offhand) out.defPct += out.shieldDefPct;
  return out;
}

/**
 * 技能書適合的職業名稱（通用技能書為「全職業」）。
 * @param {string} id 技能代碼。
 * @param {Record<string, {name: string}>} classes 職業資料。
 * @returns {string} 名稱。
 */
export function suitedName(id, classes) {
  const s = SKILLS[id];
  return s.cls === 'all' ? '全職業' : classes[s.cls].name;
}
