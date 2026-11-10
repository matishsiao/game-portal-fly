// 多物件設計圖轉換結果（掉落物、家園家具、圖示、作物、地板牆面、地城圖塊）的資料檢查：
// 每個設定的代碼都有圖、每列長度等於畫布寬、列數等於畫布高、字元都在調色盤裡。

import test from 'node:test';
import assert from 'node:assert/strict';
import { SETS } from '../scripts/hero-sprites/sheet-sets.mjs';
import { ITEM_SPRITES } from '../src/js/pd/itemSprites.js';
import { ICON_SPRITES } from '../src/js/pd/homeArt/iconSprites.js';
import { CROP_SPRITES } from '../src/js/pd/homeArt/cropSprites.js';
import { FURNITURE_SPRITES } from '../src/js/pd/homeArt/furnitureSprites.js';
import { TILE_SPRITES } from '../src/js/pd/homeArt/tileSprites.js';
import { DUNGEON_TILES } from '../src/js/pd/dungeonTiles.js';

/** 各批次對應的轉換結果。 */
const OUT = { drops: ITEM_SPRITES, homeIcons: ICON_SPRITES, crops: CROP_SPRITES, furniture: FURNITURE_SPRITES, homeTiles: TILE_SPRITES, dungeonTiles: DUNGEON_TILES };

for (const [name, set] of Object.entries(SETS)) {
  // 每個批次：設定中的代碼都有圖，圖的格式正確。
  test(`${name}：每個代碼都有圖且格式正確`, () => {
    const data = OUT[name];
    for (const k of set.sheets.flatMap((s) => s.keys)) {
      const s = data[k];
      assert.ok(s, `缺少 ${k}`);
      assert.equal(s.rows.length, s.h, `${k} 列數`);
      for (const row of s.rows) {
        assert.equal(row.length, s.w, `${k} 列長`);
        for (const ch of row) assert.ok(ch === '.' || s.palette[ch], `${k} 字元 ${ch}`);
      }
    }
  });
}

// 地城的地板、牆面與牆頂圖塊必須完全不透明（地板 32 × 32、牆面 32 × 48）。
test('地城圖塊不透明且大小正確', () => {
  for (const [k, s] of Object.entries(DUNGEON_TILES)) {
    if (k.endsWith('.pillar')) continue;
    assert.equal(s.w, 32, `${k} 寬`);
    assert.equal(s.h, k.includes('.face@') ? 48 : 32, `${k} 高`);
    assert.ok(s.rows.every((r) => !r.includes('.')), `${k} 有透明像素`);
  }
});
