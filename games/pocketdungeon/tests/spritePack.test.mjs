// PNG 圖集封裝的單元測試：封裝後再解碼，資料必須與原本完全相同（無損）。

import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { packData, encodePng } from '../scripts/sprite-pack.mjs';
import { decodePng } from '../src/js/pd/spritePack.js';

// 封裝、編碼成 PNG、解碼後，每個像素的調色盤編號都相同。
test('PNG 圖集封裝無損', () => {
  const data = {
    a: { palette: { o: '#1a1020', b: '#ff0000', c: '#00ff00' }, w: 3, h: 2, rows: ['ob.', 'cco'] },
    b: { palette: { o: '#1a1020', d: '#0000ff' }, frames: [{ x: 0, y: 0, rows: ['d.d', '.o.', 'ddd'] }] },
  };
  const { meta, w, h, px } = packData(data);
  const img = decodePng(new Uint8Array(encodePng(w, h, px)), (b) => inflateSync(b));
  assert.equal(img.w, w);
  assert.equal(img.h, h);
  assert.deepEqual([...img.data], [...px]);
  // 描述中的 rows 換成圖集位置。
  assert.ok(meta.a.$r && !meta.a.rows);
  assert.ok(meta.b.frames[0].$r && !meta.b.frames[0].rows);
});
