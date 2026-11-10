// 圖資料的 PNG 封裝（執行期）：轉換產生的圖（角色、Boss、怪物、裝飾物、道具、家園、地城圖塊）把像素存在同名的 PNG 圖集裡，
// 模組只保留調色盤、大小與每張圖在圖集上的位置（{ $r: [x, y, w, h] }）；圖集每像素存調色盤編號（8 位元灰階：0 透明、n 為調色盤第 n 個鍵）。載入時把 PNG 還原成原本的 rows（字元陣列），
// 其他程式照舊使用 rows 與 palette。PNG 是無損格式，還原後與原本的資料完全相同。
// 瀏覽器中以 createImageBitmap 非同步解碼（app 啟動前要 await spritesReady()）；Node（測試與轉換工具）中以 zlib 同步解碼。

/** 尚未完成的解碼工作。 */
const pending = [];

/**
 * 依圖集像素把描述中的 { $r: [...] } 還原成 rows（在原物件上修改），並把結果放進 target。
 * @param {Record<string, any>} target 匯出的資料物件（會被填入）。
 * @param {Record<string, any>} meta 描述（會被修改：$r 換成 rows）。
 * @param {{w: number, h: number, ch: number, data: Uint8Array | Uint8ClampedArray}} img 圖集像素（ch 為每像素的通道數，取第 1 個通道的值）。
 */
function restore(target, meta, img) {
  /**
   * 遞迴處理一個節點。
   * @param {any} node 節點。
   * @param {Record<string, string> | null} palette 最近一層的調色盤。
   */
  const walk = (node, palette) => {
    if (!node || typeof node !== 'object') return;
    const pal = node.palette || palette;
    if (node.$r) {
      const [x0, y0, w, h] = node.$r;
      const keys = ['.', ...Object.keys(pal || {})];
      const rows = [];
      for (let y = 0; y < h; y++) {
        let line = '';
        for (let x = 0; x < w; x++) line += keys[img.data[((y0 + y) * img.w + x0 + x) * img.ch]] || '.';
        rows.push(line);
      }
      node.rows = node.$len ? rows.map((r, k) => r.slice(0, node.$len[k])) : rows;
      delete node.$r;
      delete node.$len;
    }
    for (const [k, v] of Object.entries(node)) if (k !== 'palette' && v && typeof v === 'object') walk(v, pal);
  };
  walk(meta, null);
  Object.assign(target, meta);
}

/**
 * 以 Node 的 zlib 同步解碼 PNG（只支援本專案產生的 8 位元灰階或 RGBA、非交錯 PNG）。
 * @param {Uint8Array} buf PNG 檔內容。
 * @param {(b: Uint8Array) => Uint8Array} inflate zlib 解壓函式。
 * @returns {{w: number, h: number, ch: number, data: Uint8Array}} 像素（ch 為每像素的通道數）。
 */
export function decodePng(buf, inflate) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let p = 8;
  let w = 0, h = 0, ch = 4;
  const idat = [];
  while (p < buf.length) {
    const len = dv.getUint32(p);
    const type = String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]);
    if (type === 'IHDR') { w = dv.getUint32(p + 8); h = dv.getUint32(p + 12); ch = buf[p + 17] === 0 ? 1 : 4; }
    if (type === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len));
    p += len + 12;
  }
  const all = new Uint8Array(idat.reduce((n, b) => n + b.length, 0));
  let o = 0;
  for (const b of idat) { all.set(b, o); o += b.length; }
  const raw = inflate(all);
  const stride = w * ch;
  const out = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const b = y ? out[(y - 1) * stride + x] : 0;
      const c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0;
      let v = raw[src + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}

/**
 * 登記一個 PNG 封裝的圖資料：瀏覽器中開始非同步解碼，Node 中立刻同步解碼。
 * @param {Record<string, any>} target 匯出的資料物件（解碼後填入）。
 * @param {Record<string, any>} meta 描述（調色盤、大小、$r 圖集位置）。
 * @param {URL} url 圖集 PNG 的位置。
 */
export function unpack(target, meta, url) {
  if (typeof process !== 'undefined' && process.versions && process.versions.node && typeof document === 'undefined') {
    const req = process.getBuiltinModule ? process.getBuiltinModule : null;
    const fs = req ? req('node:fs') : null;
    const zlib = req ? req('node:zlib') : null;
    if (fs && zlib) {
      restore(target, meta, decodePng(fs.readFileSync(url), (b) => zlib.inflateSync(b)));
      return;
    }
    // 較舊的 Node：改用非同步載入（呼叫端需 await spritesReady()）。
    pending.push(Promise.all([import('node:fs'), import('node:zlib')]).then(([f, z]) => restore(target, meta, decodePng(f.readFileSync(url), (b) => z.inflateSync(b)))));
    return;
  }
  pending.push((async () => {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const c = document.createElement('canvas');
    c.width = bmp.width;
    c.height = bmp.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bmp, 0, 0);
    restore(target, meta, { w: c.width, h: c.height, ch: 4, data: g.getImageData(0, 0, c.width, c.height).data });
  })());
}

/**
 * 等所有圖資料解碼完成（瀏覽器中 app 啟動前呼叫）。
 * @returns {Promise<void>}
 */
export async function spritesReady() {
  await Promise.all(pending);
}
