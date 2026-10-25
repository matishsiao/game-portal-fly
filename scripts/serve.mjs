// 本機預覽組合後的網站（site/），模擬正式部署的目錄結構。
// 用法：node scripts/serve.mjs [--port 5180]
// Service Worker 只在 HTTPS 或 localhost 下運作；手機測試請用正式網址。

import http from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const portArg = process.argv.indexOf('--port');
const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 5180;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * 提供靜態檔案；目錄網址回傳該目錄的 index.html，沒有結尾斜線的目錄會轉址。
 * @param {http.IncomingMessage} req 請求。
 * @param {http.ServerResponse} res 回應。
 */
function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);
  let file = normalize(join(SITE, path));
  if (!file.startsWith(SITE)) {
    res.writeHead(404).end();
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) {
    if (!path.endsWith('/')) {
      res.writeHead(301, { Location: `${path}/` }).end();
      return;
    }
    file = join(file, 'index.html');
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
}

if (!existsSync(join(SITE, 'index.html'))) {
  console.error('site/ 不存在，請先執行 npm run assemble。');
  process.exit(1);
}
http.createServer(handle).listen(port, () => console.log(`預覽：http://localhost:${port}/`));
