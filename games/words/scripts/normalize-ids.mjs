// 統一單字 id：依「英文 + 詞性」產生全域一致的 id，避免不同分類檔把不同意思的字用成同一個 id。
// 規則：名詞與固定詞組不加後綴；其他詞性加後綴（-v、-adj、-adv、-num、-prep、-pron、-conj、-det、-interj）；
// 同一個英文與詞性但中文意思不同（例如 bill「帳單」與 bill「鈔票」）時，依檔名順序後出現者加 -2、-3。
// 用法：node scripts/normalize-ids.mjs [來源目錄=data/words] [輸出目錄=同來源目錄]

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(ROOT, process.argv[2] || 'data/words');
const out = resolve(ROOT, process.argv[3] || process.argv[2] || 'data/words');
const SUFFIX = { 'n.': '', 'phr.': '', 'v.': '-v', 'adj.': '-adj', 'adv.': '-adv', 'num.': '-num', 'prep.': '-prep', 'pron.': '-pron', 'conj.': '-conj', 'det.': '-det', 'interj.': '-interj' };

/**
 * 把英文轉成 id 的基本形式：小寫、空格與撇號改為連字號。
 * @param {string} en 英文。
 * @returns {string} id 基本形式。
 */
export function slug(en) {
  return en.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const files = readdirSync(src).filter((f) => f.endsWith('.json')).sort();
/** 「英文|詞性」→ 已分配的意思與 id。 */
const meanings = new Map();
const changes = [];
mkdirSync(out, { recursive: true });
for (const f of files) {
  const list = JSON.parse(readFileSync(join(src, f), 'utf8'));
  for (const w of list) {
    const key = `${w.en.toLowerCase()}|${w.pos}`;
    const base = slug(w.en) + (SUFFIX[w.pos] ?? `-${w.pos.replace('.', '')}`);
    const seen = meanings.get(key) || [];
    let entry = seen.find((m) => m.zh === w.zh);
    if (!entry) {
      entry = { zh: w.zh, id: seen.length ? `${base}-${seen.length + 1}` : base };
      seen.push(entry);
      meanings.set(key, seen);
    }
    if (w.id !== entry.id) changes.push(`${f}：${w.id} → ${entry.id}（${w.en} ${w.pos} ${w.zh}）`);
    w.id = entry.id;
  }
  writeFileSync(join(out, f), `${JSON.stringify(list, null, 2)}\n`);
}
console.log(changes.length ? changes.join('\n') : '所有 id 都已符合規則。');
console.log(`共調整 ${changes.length} 個 id。`);
