// 建置：把 src/ 複製到 dist/，並在 sw.js 填入版本號（內容雜湊）與預先快取清單。
// 用法：node scripts/build.mjs

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
const sw = readFileSync(join(SRC, 'sw.js'), 'utf8')
  .replace("const VERSION = '__VERSION__';", `const VERSION = ${JSON.stringify(version)};`)
  .replace('const ASSETS = __ASSETS__;', `const ASSETS = ${JSON.stringify(assets, null, 2)};`);
if (sw.includes('__VERSION__') || sw.includes('__ASSETS__')) throw new Error('sw.js 佔位字串替換失敗');
writeFileSync(join(DIST, 'sw.js'), sw);
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`建置完成：dist/（版本 ${version}，預先快取 ${assets.length} 個檔案）`);
