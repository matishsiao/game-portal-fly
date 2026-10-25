// Service Worker：預先快取全部資源，一律快取優先；新版完整下載後才可啟用。
// VERSION、LABEL 與 ASSETS 的佔位字串由 scripts/build.mjs 在建置時替換；開發模式不提供此檔。

const VERSION = '__VERSION__';
/** 顯示用版本標籤（最後修改日期・雜湊）。 */
const LABEL = '__LABEL__';
const ASSETS = __ASSETS__;
const CACHE = `idiom-${VERSION}`;

/**
 * 安裝：把新版全部資源下載進新的快取；任何一個失敗即安裝失敗，舊版繼續運作。
 * @param {ExtendableEvent} event 安裝事件。
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

/**
 * 啟用：刪除舊版快取並接管頁面。只有在新版已完整快取後才會走到這一步。
 * @param {ExtendableEvent} event 啟用事件。
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('idiom-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/**
 * 讀取資源：導覽請求一律回傳快取的 index.html，其他資源快取優先，找不到才連網。
 * @param {FetchEvent} event 請求事件。
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match('./index.html')).then((res) => res || fetch(request)),
    );
    return;
  }
  event.respondWith(
    caches.open(CACHE).then((cache) => cache.match(request, { ignoreSearch: true })).then((res) => res || fetch(request)),
  );
});

/**
 * 接收頁面訊息：SKIP_WAITING 啟用新版；CHECK_CACHE 回報必要資源是否都已快取。
 * @param {ExtendableMessageEvent} event 訊息事件。
 */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (data.type === 'CHECK_CACHE') {
    const port = event.ports[0];
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => Promise.all(ASSETS.map((url) => cache.match(url))))
        .then((results) => {
          const missing = results.filter((r) => !r).length;
          port.postMessage({ ok: missing === 0, missing, version: VERSION, label: LABEL });
        })
        .catch(() => port.postMessage({ ok: false, missing: ASSETS.length, version: VERSION, label: LABEL })),
    );
  }
});
