// 部署：組合網站（大廳 dist + 各遊戲 dist）後，同步到 NAS 上作為網域根目錄的資料夾。
// 用法：node scripts/deploy.mjs [--no-build]
//   目標資料夾預設為 /Volumes/web/game-fly（以 SMB 掛載的 web 共用資料夾），可用環境變數 DEPLOY_DIR 覆寫。
//   只新增與覆蓋檔案，不刪除目標資料夾中的任何檔案。

import { existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const target = process.env.DEPLOY_DIR || '/Volumes/web/game-fly';

if (!existsSync(target) || !statSync(target).isDirectory()) {
  console.error(`找不到部署目標 ${target}。請先在 Finder 以 ⌘K 掛載 smb://<NAS-IP>/web，或設定 DEPLOY_DIR。`);
  process.exit(1);
}

const assembleArgs = ['scripts/assemble.mjs', ...process.argv.slice(2).filter((a) => a === '--no-build')];
execFileSync(process.execPath, assembleArgs, { cwd: ROOT, stdio: 'inherit' });

execFileSync('rsync', ['-rt', '--exclude', '.DS_Store', '--exclude', '.nojekyll', `${SITE}/`, `${target}/`], { stdio: 'inherit' });
console.log(`\n已部署到 ${target}`);
