// 把審閱過的詞庫（data/words/*.json）合併為 src/js/words-data.js。
// 只收錄已審閱的單字；同一個 id 出現在多個分類檔時合併分類（內容以第一次出現者為準）。
// 同義群組是各分類自訂的，輸出為「分類:群組」陣列，合併時保留每個分類的群組。
// 用法：node scripts/build-words.mjs [--draft]
//   --draft：改用未審閱的初稿（data/draft/），只供本機測試畫面，不可用於正式建置。
//   --from <目錄>：改用指定目錄（同樣不要求已審閱），只供本機測試。

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateFile } from './validate-words.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fromIdx = process.argv.indexOf('--from');
const DRAFT = process.argv.includes('--draft') || fromIdx >= 0;
const DIR = fromIdx >= 0 ? process.argv[fromIdx + 1] : join(ROOT, 'data', DRAFT ? 'draft' : 'words');
const MAX_WORDS = 5000;
const categories = JSON.parse(readFileSync(join(ROOT, 'data', 'categories.json'), 'utf8'));

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith('.json')).sort() : [];
const errors = files.flatMap((f) => validateFile(join(DIR, f), { requireReviewed: !DRAFT }));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const byId = new Map();
const conflicts = [];
for (const f of files) {
  for (const w of JSON.parse(readFileSync(join(DIR, f), 'utf8'))) {
    const prev = byId.get(w.id);
    const syn = w.syn ? `${f.replace('.json', '')}:${w.syn}` : '';
    if (prev) {
      if (syn && !prev.syn.includes(syn)) prev.syn.push(syn);
      // 同一個 id 必須是同一個字、同一個詞性；意思不同時應使用不同的 id（例如 park 與 park-v）。
      if (prev.en !== w.en || prev.pos !== w.pos) conflicts.push(`${w.id}：${f} 的「${w.en} ${w.pos}」與先前的「${prev.en} ${prev.pos}」不同，請改用不同的 id`);
      for (const c of w.categories) if (!prev.categories.includes(c)) prev.categories.push(c);
      continue;
    }
    const { reviewed, ...rest } = w;
    byId.set(w.id, { ...rest, categories: [...w.categories], syn: syn ? [syn] : [] });
  }
}
if (conflicts.length) {
  console.error(conflicts.join('\n'));
  process.exit(1);
}
const words = [...byId.values()];
if (words.length > MAX_WORDS) {
  console.error(`單字共 ${words.length} 個，超過上限 ${MAX_WORDS}`);
  process.exit(1);
}
const cats = categories.map((c) => ({ ...c, count: words.filter((w) => w.categories.includes(c.id)).length }));

const content = `// 由 scripts/build-words.mjs 自動產生，請勿手動修改；詞庫原始檔在 data/words/。
/** 分類（含單字數）。 */
export const CATEGORIES = ${JSON.stringify(cats)};

/** 全部單字。 */
export const WORDS = ${JSON.stringify(words)};
`;
writeFileSync(join(ROOT, 'src', 'js', 'words-data.js'), content);
if (DRAFT) console.warn('⚠ 使用未審閱的初稿建置，只供本機測試，請勿提交或部署。');
console.log(`詞庫建置完成：${words.length} 個單字、${cats.filter((c) => c.count).length} 個分類 → src/js/words-data.js`);
