// 本機伺服器。
//   node scripts/serve.mjs                 開發模式：提供 src/，不提供 sw.js（不啟用離線快取）
//   node scripts/serve.mjs --dist          預覽建置結果：提供 dist/，啟用 Service Worker
//   加上 --https                           以 mkcert 憑證啟用 HTTPS，供手機透過區網測試
//   --port <埠號>                          預設 HTTP 5173、HTTPS 5443

import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, createReadStream } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const useDist = args.includes('--dist');
const useHttps = args.includes('--https');
const portArg = args.indexOf('--port');
const port = portArg >= 0 ? Number(args[portArg + 1]) : useHttps ? 5443 : 5173;
const baseDir = join(ROOT, useDist ? 'dist' : 'src');
const CERT_DIR = join(ROOT, '.certs');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.odt': 'application/vnd.oasis.opendocument.text',
};

/**
 * 取得本機的區網 IPv4 位址。
 * @returns {string[]} IP 清單。
 */
function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const info of list || []) {
      if (info.family === 'IPv4' && !info.internal) out.push(info.address);
    }
  }
  return out;
}

/**
 * 確保有可用的開發憑證：有效且主機清單相同時重用，否則以 mkcert 重新產生。
 * @param {string[]} hosts 憑證須涵蓋的主機名稱與 IP。
 * @returns {{cert: Buffer, key: Buffer}} 憑證與私鑰。
 */
function ensureCertificate(hosts) {
  const certFile = join(CERT_DIR, 'cert.pem');
  const keyFile = join(CERT_DIR, 'key.pem');
  const metaFile = join(CERT_DIR, 'meta.json');
  if (existsSync(certFile) && existsSync(keyFile) && existsSync(metaFile)) {
    try {
      const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
      const cert = new X509Certificate(readFileSync(certFile));
      const validUntil = new Date(cert.validTo).getTime();
      if (validUntil - Date.now() > 24 * 3600 * 1000 && JSON.stringify(meta.hosts) === JSON.stringify(hosts)) {
        console.log('重用既有的開發憑證。');
        return { cert: readFileSync(certFile), key: readFileSync(keyFile) };
      }
      console.log('開發憑證已過期或主機／IP 已變更，重新產生。');
    } catch {
      console.log('開發憑證無法讀取，重新產生。');
    }
  }
  try {
    execFileSync('mkcert', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error(
      '找不到 mkcert。請先安裝：\n' +
        '  macOS：brew install mkcert\n' +
        '  Windows：choco install mkcert 或 scoop install mkcert\n' +
        '  Linux：參考 https://github.com/FiloSottile/mkcert#installation\n' +
        '安裝後執行一次 `mkcert -install` 建立並信任本機 CA。',
    );
    process.exit(1);
  }
  mkdirSync(CERT_DIR, { recursive: true });
  execFileSync('mkcert', ['-cert-file', certFile, '-key-file', keyFile, ...hosts], { stdio: 'inherit' });
  writeFileSync(metaFile, JSON.stringify({ hosts }, null, 2));
  return { cert: readFileSync(certFile), key: readFileSync(keyFile) };
}

/**
 * 處理 HTTP 請求：提供靜態檔案，開發模式不提供 sw.js。
 * @param {http.IncomingMessage} req 請求。
 * @param {http.ServerResponse} res 回應。
 */
function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  // 開發模式：教育部使用說明原檔在 data/moe/，建置後才會出現在 dist/moe/。
  const base = !useDist && path.startsWith('/moe/') ? join(ROOT, 'data') : baseDir;
  const file = normalize(join(base, path));
  const blocked = !file.startsWith(base) || (!useDist && path === '/sw.js');
  if (blocked || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}

if (useDist && !existsSync(join(baseDir, 'index.html'))) {
  console.error('dist/ 不存在，請先執行 npm run build。');
  process.exit(1);
}

const lan = lanAddresses();
let server;
if (useHttps) {
  const hosts = ['localhost', '127.0.0.1', '::1', os.hostname(), ...lan];
  server = https.createServer(ensureCertificate(hosts), handle);
} else {
  server = http.createServer(handle);
}

server.listen(port, '0.0.0.0', () => {
  const scheme = useHttps ? 'https' : 'http';
  console.log(`${useDist ? '預覽建置結果（啟用 Service Worker）' : '開發模式（未啟用離線快取）'}：${baseDir}`);
  console.log(`  本機：${scheme}://localhost:${port}/`);
  for (const ip of lan) console.log(`  區網：${scheme}://${ip}:${port}/`);
  if (useHttps) {
    let caRoot = '';
    try {
      caRoot = execFileSync('mkcert', ['-CAROOT'], { encoding: 'utf8' }).trim();
    } catch {
      // 忽略：僅用於提示 CA 位置。
    }
    console.log(`手機需安裝並信任本機 CA：${caRoot ? join(caRoot, 'rootCA.pem') : '（mkcert -CAROOT）'}`);
  } else if (!useDist) {
    console.log('手機透過區網測試離線功能時，請改用 npm run preview:https。');
  }
});
