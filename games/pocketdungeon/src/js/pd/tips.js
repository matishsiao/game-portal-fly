// 新手提示：第一次在倉庫看到某類道具、第一次有技能點或新技能時說明用途，
// 每種提示只顯示一次（所有角色共用已看過的紀錄）。

import { LIMITS, GIFT, CRAFT, BAG_EXPAND, GEMS } from './data.js';
import { parseGem } from './rules.js';
import { SKILLS, classSkills, learnedBooks, skillLevel, skillPoints } from './skills.js';

/**
 * 角色持有的數量是否大於 0。
 * @param {Record<string, number> | undefined} map 道具數量表。
 * @returns {boolean} 是否持有任一種。
 */
function any(map) {
  return Object.values(map || {}).some((n) => n > 0);
}

/**
 * 已獲得但還沒裝進技能欄的主動技能。
 * @param {object} ch 角色。
 * @returns {string[]} 技能代碼。
 */
function idleSkills(ch) {
  if (!ch.skills) return [];
  return [...classSkills(ch.cls), ...learnedBooks(ch)].filter((id) => skillLevel(ch, id) > 0 && !ch.skills.slots.includes(id));
}

/**
 * 身上裝備鑲嵌的主動寶石種類（血量護盾、抗異常護盾）。
 * @param {object} ch 角色。
 * @returns {string[]} 寶石種類（不重複）。
 */
function activeGems(ch) {
  const kinds = Object.values(ch.equipped || {}).filter(Boolean).flatMap((it) => (it.gems || []).map((k) => parseGem(k)).filter((g) => g && GEMS[g.kind].active).map((g) => g.kind));
  return [...new Set(kinds)];
}

/**
 * 提示清單（依顯示順序）：
 * id 為已看過紀錄的鍵；has 判斷角色目前是否符合；cell 為倉庫中對應格子代碼的開頭（用來標示格子）；
 * any 為 true 時在村莊任何分頁都會顯示（其他只在倉庫的「個人」頁顯示）；go 為前往其他分頁的按鈕；
 * text 可以是依角色產生說明的函式。
 * @type {{id: string, icon: string, title: string, text: string | ((ch: object) => string), cell?: string, any?: boolean, has: (ch: object) => boolean, go?: {label: string, tab: string}}[]}
 */
export const TIPS = [
  {
    id: 'skillpt', icon: 'skillbook', title: '獲得技能點', any: true,
    text: '升級會得到技能點（每升 1 級 1 點）。到「技能」分頁點技能，用技能點<b>升級</b>主動技能或學習被動技能；用不完的點數會保留。',
    has: (ch) => !!ch.skills && skillPoints(ch) > 0,
    go: { label: '去技能', tab: 'skill' },
  },
  {
    id: 'newskill', icon: 'skillbook', title: '獲得新技能', any: true,
    text: (ch) => `已經可以使用「${idleSkills(ch).map((id) => SKILLS[id].name).join('」「')}」。到「技能」分頁點技能，選「裝到技能 n」裝進技能欄，才能在地城使用。`,
    has: (ch) => idleSkills(ch).length > 0,
    go: { label: '去技能', tab: 'skill' },
  },
  {
    id: 'activegem', icon: 'gem-shield', title: '主動寶石（護盾）', any: true,
    text: (ch) => `身上的裝備鑲了「${activeGems(ch).map((k) => GEMS[k].label).join('」「')}」。在地城中，護盾按鈕在<b>藥水按鈕的上方</b>（橫向畫面在藥水左邊），按一下展開，冷卻 ${GEMS.shield.cd} 秒。`
      + `<br>血量護盾：擋下最大 HP ${Math.round(GEMS.shield.pct * 100)}% 的傷害，持續 ${GEMS.shield.dur} 秒；抗異常護盾：解除異常並 ${GEMS.ward.dur} 秒內免疫。`
      + '<br>設定中的「<b>自動使用護盾</b>」（預設開啟）會在 HP 低於 50% 或中了異常狀態時自動展開，按鈕上顯示「AUTO」；點一下護盾按鈕就改為手動。',
    has: (ch) => activeGems(ch).length > 0,
  },
  {
    id: 'equip', icon: 'sword', title: '獲得裝備', cell: 'item:',
    text: '點背包裡的裝備可以查看能力、和身上穿的比較差異，並選擇<b>裝備</b>、分解、存入共用倉庫或賣出。格子左上角有「▲」的代表比目前穿的更好。',
    has: (ch) => (ch.bag || []).length > 0,
  },
  {
    id: 'gem', icon: 'gem-atk', title: '獲得寶石', cell: 'gem:',
    text: '寶石可以<b>鑲嵌</b>到裝備的寶石孔上提升能力（普通與精良裝備 1 孔、稀有與傳說 2 孔）。點寶石選「去鑲嵌」，或到「寶石」分頁操作；同級的寶石還可以合成高一級。',
    has: (ch) => any(ch.gems),
    go: { label: '去鑲嵌', tab: 'gem' },
  },
  {
    id: 'potion', icon: 'potion', title: '回復藥水', cell: 'potion:',
    text: `在地城按藥水按鈕回復 HP。每趟最多帶 ${LIMITS.potions} 瓶，用完可以到<b>商店</b>購買（每瓶 ${LIMITS.potionPrice}G）。`,
    has: (ch) => (ch.potions || 0) > 0,
    go: { label: '去商店', tab: 'shop' },
  },
  {
    id: 'cure', icon: 'cure', title: '淨化藥水', cell: 'cure:',
    text: `解除中毒、睡眠、暈眩，睡著或暈眩時也能喝。每趟最多帶 ${LIMITS.cures} 瓶，可以到<b>商店</b>購買（每瓶 ${LIMITS.curePrice}G）。`,
    has: (ch) => (ch.cures || 0) > 0,
    go: { label: '去商店', tab: 'shop' },
  },
  {
    id: 'scroll', icon: 'key', title: '回城卷軸', cell: 'scroll:',
    text: `在地城暫停選單使用，帶著這趟的全部所得回到村莊。每趟帶 1 張，用掉後到<b>商店</b>購買（${LIMITS.scrollPrice}G）。`,
    has: (ch) => (ch.scroll || 0) > 0,
    go: { label: '去商店', tab: 'shop' },
  },
  {
    id: 'ticket', icon: 'ticket1', title: '入場卷', cell: 'ticket:',
    text: '進入地城的每一關要用掉 1 張入場卷，愈難的區域要用愈高級的卷。玩學習遊戲每天可以領，也可以在商店購買（每種每天限購 1 張）。',
    has: (ch) => any(ch.tickets),
  },
  {
    id: 'mat', icon: 'iron', title: '裝備材料', cell: 'mat:',
    text: `分解裝備得到的材料。同品質的材料 ${CRAFT.cost} 個加上製作書，可以到<b>鐵匠</b>製作一件裝備。`,
    has: (ch) => any(ch.mats),
    go: { label: '去鐵匠', tab: 'smith' },
  },
  {
    id: 'book', icon: 'book', title: '製作書', cell: 'book:',
    text: `到<b>鐵匠</b>的「製作」使用，每次用掉 1 本，加上同品質的材料 ${CRAFT.cost} 個製作對應部位的裝備。`,
    has: (ch) => any(ch.books),
    go: { label: '去鐵匠', tab: 'smith' },
  },
  {
    id: 'gift', icon: 'gift', title: '獎勵禮包', cell: 'gift:',
    text: '學習遊戲第一次過關或全對得到的禮包。點禮包選「開啟」，可以拿到金幣、入場卷、材料與技能書碎片。',
    has: (ch) => any(ch.gifts),
  },
  {
    id: 'shard', icon: 'shard', title: '技能書碎片', cell: 'shard:',
    text: `同一本技能書的碎片集滿 ${GIFT.shardNeed} 片，點碎片選「合成技能書」就會變成一本完整的技能書。`,
    has: (ch) => any(ch.shards),
  },
  {
    id: 'sbook', icon: 'skillbook', title: '技能書', cell: 'sbook:',
    text: '點技能書選「學習」學會新的主動技能，再到「技能」分頁裝進技能欄帶進地城。',
    has: (ch) => any(ch.skillBooks),
  },
  {
    id: 'pouch', icon: 'pouch', title: '背包擴充袋', cell: 'pouch:',
    text: `使用後背包上限 +${BAG_EXPAND.step} 格（最多 ${BAG_EXPAND.max} 格）。點擴充袋或背包標題旁的「擴充」使用。`,
    has: (ch) => (ch.bagExpand || 0) > 0,
  },
];

/**
 * 角色目前符合、但還沒看過的提示（依顯示順序）。
 * @param {object} ch 角色。
 * @param {string[]} seen 已看過的提示代碼。
 * @param {boolean} inBag 是否在倉庫的「個人」頁（否則只回傳任何分頁都會顯示的提示）。
 * @returns {typeof TIPS} 要顯示的提示。
 */
export function pendingTips(ch, seen, inBag) {
  return TIPS.filter((t) => (inBag || t.any) && !seen.includes(t.id) && t.has(ch));
}

/**
 * 提示的說明文字。
 * @param {(typeof TIPS)[number]} tip 提示。
 * @param {object} ch 角色。
 * @returns {string} HTML。
 */
export function tipText(tip, ch) {
  return typeof tip.text === 'function' ? tip.text(ch) : tip.text;
}
