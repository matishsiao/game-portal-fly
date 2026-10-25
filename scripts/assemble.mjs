// 組合完整網站到 site/：根目錄為遊戲選單，每個遊戲放在自己的目錄（site/sudoku/、site/crossmath/）。
// 部署時把 site/ 的內容上傳到網站根目錄（例如 Synology 的 web/）。
// 用法：node scripts/assemble.mjs [--no-build]
//   預設會先在各遊戲專案執行 scripts/build.mjs；--no-build 直接使用各專案現有的 dist/。

import { existsSync, rmSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const noBuild = process.argv.includes('--no-build');

/** 遊戲目錄 → 遊戲原始碼位置（相對於本專案）。目錄名稱須與 src/portal.js 的 GAMES 一致。 */
const GAMES = {
  sudoku: 'games/sudoku',
  crossmath: 'games/crossmath',
};

/**
 * 執行建置腳本。
 * @param {string} cwd 專案目錄。
 */
function build(cwd) {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd, stdio: 'inherit' });
}

build(ROOT);
rmSync(SITE, { recursive: true, force: true });
cpSync(join(ROOT, 'dist'), SITE, { recursive: true });

const included = [];
const skipped = [];
for (const [dir, rel] of Object.entries(GAMES)) {
  const project = resolve(ROOT, rel);
  if (!existsSync(join(project, 'src', 'index.html'))) {
    skipped.push(`${dir}（${project} 尚無 src/index.html）`);
    continue;
  }
  try {
    if (!noBuild) build(project);
  } catch {
    skipped.push(`${dir}（建置失敗）`);
    continue;
  }
  const dist = join(project, 'dist');
  if (!existsSync(join(dist, 'index.html')) || !existsSync(join(dist, 'sw.js'))) {
    skipped.push(`${dir}（${dist} 不完整）`);
    continue;
  }
  cpSync(dist, join(SITE, dir), { recursive: true });
  included.push(dir);
}

console.log(`\n網站已組合到 site/：選單${included.map((d) => ` + ${d}/`).join('')}`);
if (skipped.length) console.log(`略過：${skipped.join('、')}`);
