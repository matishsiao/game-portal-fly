// 建置：把 src/ 複製到 dist/，並在 sw.js 填入版本號（內容雜湊）與預先快取清單。
// 用法：node scripts/build.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const DIST = join(ROOT, 'dist');

/**
 * 遞迴列出目錄下所有檔案。
 * @param {string} dir 目錄。
 * @returns {string[]} 絕對路徑，依字母排序。
 */
function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * 取得顯示用版本標籤：最後一次修改 src/ 的 commit 日期，加上內容雜湊前 7 碼。
 * 只看 src/，讓只改文件的 commit 不會產生新版本；無法讀取 git 時改用今天日期。
 * @param {string} hashHex 內容雜湊。
 * @returns {string} 例如「2026.10.25・6ea18be」。
 */
function versionLabel(hashHex) {
  let date = '';
  try {
    date = execFileSync('git', ['log', '-1', '--format=%cd', '--date=format:%Y.%m.%d', '--', 'src'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // 忽略：不在 git 專案中時改用今天日期。
  }
  if (!date) {
    const d = new Date();
    date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  return `${date}・${hashHex.slice(0, 7)}`;
}

rmSync(DIST, { recursive: true, force: true });
const files = listFiles(SRC);
const hash = createHash('sha256');
const assets = [];
for (const file of files) {
  const rel = relative(SRC, file).split(sep).join('/');
  const target = join(DIST, rel);
  mkdirSync(dirname(target), { recursive: true });
  if (rel === 'sw.js') continue;
  copyFileSync(file, target);
  hash.update(rel);
  hash.update(readFileSync(file));
  assets.push(`./${rel}`);
}

const version = hash.digest('hex').slice(0, 12);
const label = versionLabel(version);
const sw = readFileSync(join(SRC, 'sw.js'), 'utf8')
  .replace("const VERSION = '__VERSION__';", `const VERSION = ${JSON.stringify(version)};`)
  .replace("const LABEL = '__LABEL__';", `const LABEL = ${JSON.stringify(label)};`)
  .replace('const ASSETS = __ASSETS__;', `const ASSETS = ${JSON.stringify(assets, null, 2)};`);
if (sw.includes('__VERSION__') || sw.includes('__LABEL__') || sw.includes('__ASSETS__')) throw new Error('sw.js 佔位字串替換失敗');
writeFileSync(join(DIST, 'sw.js'), sw);
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`建置完成：dist/（版本 ${label}，預先快取 ${assets.length} 個檔案）`);
