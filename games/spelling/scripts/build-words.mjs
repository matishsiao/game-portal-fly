// 建置詞庫：合併 data/words/level-<n>-<批次>.json 中已審閱的單字，依 Level 輸出 src/data/level-<n>.json（陣列的陣列，節省空間）。
// 用法：node scripts/build-words.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data/words');
const OUT = join(ROOT, 'src/data');
/** 詞庫總大小上限（位元組）。 */
const MAX_BYTES = 2 * 1024 * 1024;

const files = existsSync(SRC) ? readdirSync(SRC).filter((f) => /^level-\d-\d+\.json$/.test(f)).sort() : [];
const byLevel = new Map([1, 2, 3, 4, 5, 6].map((lv) => [lv, []]));
const seen = new Set();
for (const f of files) {
  for (const w of JSON.parse(readFileSync(join(SRC, f), 'utf8'))) {
    if (w.reviewed !== true || seen.has(w.id)) continue;
    seen.add(w.id);
    byLevel.get(w.level).push([w.id, w.en, w.pos, w.zh, w.example, w.form || '', w.exampleZh]);
  }
}
mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [lv, rows] of byLevel) {
  rows.sort((a, b) => a[1].localeCompare(b[1]));
  const file = join(OUT, `level-${lv}.json`);
  writeFileSync(file, `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`);
  total += statSync(file).size;
}
console.log(`詞庫：${[...byLevel.values()].map((r, i) => `Level ${i + 1} ${r.length}`).join('、')}，共 ${seen.size} 個（${Math.round(total / 1024)} KB）`);
if (total > MAX_BYTES) {
  console.error(`詞庫超過 ${MAX_BYTES / 1024 / 1024} MB`);
  process.exit(1);
}
