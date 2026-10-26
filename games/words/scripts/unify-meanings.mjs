// 跨分類統一同義詞的中文：同一個英文與詞性在不同分類其實是同一個意思、只是寫法不同時，統一成一個中文，
// 讓 normalize-ids.mjs 把它們視為同一個字（不會在單字本出現兩次）。意思真的不同的字（mouse 老鼠／滑鼠等）不列在這裡。
// 每次修改都會附加到該分類的審閱紀錄。用法：node scripts/unify-meanings.mjs

import { readFileSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'data', 'words');

/** 「英文|詞性」→ 統一後的中文。 */
const UNIFY = {
  'hot|adj.': '熱的', 'old|adj.': '舊的、老的', 'busy|adj.': '忙碌的', 'dry|adj.': '乾燥的',
  'ticket|n.': '票', 'pilot|n.': '機師、飛行員', 'late|adj.': '晚的、遲到的',
  'travel|v.': '旅行', 'arrive|v.': '抵達', 'leave|v.': '離開', 'toilet|n.': '馬桶、廁所',
  'blood|n.': '血、血液', 'street|n.': '街道', 'road|n.': '道路、馬路', 'hotel|n.': '飯店、旅館',
  'crosswalk|n.': '斑馬線', 'intersection|n.': '十字路口', 'sick|adj.': '生病的', 'ill|adj.': '生病的、不舒服',
  'hurt|v.': '痛、受傷', 'run|v.': '跑步、跑', 'cut|n.': '傷口、割傷', 'injury|n.': '受傷、傷勢',
  'allergy|n.': '過敏', 'guest|n.': '客人', 'light|n.': '燈', 'bathroom|n.': '浴室',
  'air conditioner|n.': '冷氣', 'heater|n.': '暖氣機、電暖器', 'night|n.': '晚上、夜晚',
  'reservation|n.': '預訂、預約', 'clerk|n.': '店員', 'seed|n.': '種子', 'sunset|n.': '夕陽、日落',
  'scenery|n.': '風景、景色', 'order|v.': '點餐', 'explain|v.': '解釋、說明', 'visit|v.': '參觀、拜訪',
  'selfie|n.': '自拍', 'bike|n.': '腳踏車、自行車', 'schedule|n.': '時刻表、行程表',
};
/** 只統一同一個意思的分類（corner 的「角」、shower 的「陣雨」是不同意思）。 */
const ONLY = { 'corner|n.': [['city', 'directions'], '轉角'], 'shower|n.': [['home', 'hotel'], '淋浴'] };

for (const f of readdirSync(DIR).filter((x) => x.endsWith('.json')).sort()) {
  const cat = f.replace('.json', '');
  const list = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const log = [];
  for (const w of list) {
    const key = `${w.en}|${w.pos}`;
    let zh = UNIFY[key];
    if (ONLY[key] && ONLY[key][0].includes(cat)) zh = ONLY[key][1];
    if (zh && w.zh !== zh) {
      log.push(`- ${w.en}（${w.pos}）：「${w.zh}」→「${zh}」`);
      w.zh = zh;
    }
  }
  if (!log.length) continue;
  writeFileSync(join(DIR, f), `${JSON.stringify(list, null, 2)}\n`);
  appendFileSync(join(ROOT, 'data', 'reviews', `${cat}.md`), `\n## 跨分類統一（整合階段）\n\n同一個字在其他分類也有收錄且意思相同，統一中文寫法，避免單字本出現重複的字：\n\n${log.join('\n')}\n`);
  console.log(`${f}：${log.length} 筆`);
}
