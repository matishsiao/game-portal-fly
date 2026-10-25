// 把 levels/*.txt 合併為 src/js/levels-data.js，並寫入每關的最少步數（星等用）。
// 用法：node scripts/build-levels.mjs

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, CHAPTERS, readLevels, validateLevel, solveLevel } from './levels-lib.mjs';

const levels = readLevels();
const errors = levels.flatMap(validateLevel);
const out = [];
for (const level of levels) {
  if (errors.some((e) => e.startsWith(`${level.id}：`))) continue;
  const r = solveLevel(level);
  if (!r.solved) {
    errors.push(`${level.id}：無解`);
    continue;
  }
  out.push({ ...level, par: r.par });
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const content = `// 由 scripts/build-levels.mjs 自動產生，請勿手動修改；關卡原始檔在 levels/。
/** 章節資訊。 */
export const CHAPTERS = ${JSON.stringify(CHAPTERS, null, 2)};

/** 全部關卡（含最少步數 par）。 */
export const LEVELS = ${JSON.stringify(out, null, 2)};
`;
writeFileSync(join(ROOT, 'src', 'js', 'levels-data.js'), content);
console.log(`關卡建置完成：${out.length} 關 → src/js/levels-data.js`);
