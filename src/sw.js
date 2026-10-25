// 選單頁的 Service Worker：只快取並回應選單自己的檔案。
// 遊戲目錄（例如 ./sudoku/）的請求一律不處理，交給各遊戲自己的 Service Worker 或網路，
// 確保選單與各遊戲的快取、更新互不影響。
// VERSION 與 ASSETS 的佔位字串由 scripts/build.mjs 在建置時替換；開發模式不提供此檔。

const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const CACHE = `portal-${VERSION}`;
const OWN_URLS = new Set(ASSETS.map((url) => new URL(url, self.registration.scope).href));
const ROOT = self.registration.scope;

/**
 * 安裝：下載選單所有資源；任何一個失敗即安裝失敗，舊版繼續運作。
 * @param {ExtendableEvent} event 安裝事件。
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))),
  );
  self.skipWaiting();
});

/**
 * 啟用：只刪除選單自己的舊版快取（portal- 開頭），不碰遊戲的快取。
 * 不呼叫 clients.claim()，避免接管已開啟的遊戲頁。
 * @param {ExtendableEvent} event 啟用事件。
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('portal-') && k !== CACHE).map((k) => caches.delete(k)))),
  );
});

/**
 * 讀取資源：只處理選單根網址與選單自己的檔案，快取優先；其他請求不攔截。
 * @param {FetchEvent} event 請求事件。
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  if (url.href === ROOT || url.href === `${ROOT}index.html`) {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match('./index.html')).then((res) => res || fetch(request)),
    );
    return;
  }
  if (!OWN_URLS.has(url.href)) return;
  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(request, { ignoreSearch: true })).then((res) => res || fetch(request)),
  );
});

/**
 * 接收頁面訊息：CHECK_CACHE 回報選單資源是否都已快取。
 * @param {ExtendableMessageEvent} event 訊息事件。
 */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'CHECK_CACHE') return;
  const port = event.ports[0];
  // 尚未安裝自己 Service Worker 的遊戲頁會暫時由本 Service Worker 控制；
  // 它們詢問時不可回報「完整」，以免誤顯示該遊戲已可離線使用。
  const source = event.source && event.source.url ? new URL(event.source.url) : null;
  if (source) {
    source.search = '';
    source.hash = '';
  }
  if (source && source.href !== ROOT && source.href !== `${ROOT}index.html`) {
    port.postMessage({ ok: false, missing: -1, version: VERSION, notOwner: true });
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(ASSETS.map((url) => cache.match(url))))
      .then((results) => {
        const missing = results.filter((r) => !r).length;
        port.postMessage({ ok: missing === 0, missing, version: VERSION });
      })
      .catch(() => port.postMessage({ ok: false, missing: ASSETS.length, version: VERSION })),
  );
});
