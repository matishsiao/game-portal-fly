// 多物件設計圖轉換結果（掉落物、家園家具、圖示、作物、地板牆面、庭院造景、地城圖塊、外圍地形）的資料檢查：
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
import { YARD_SPRITES } from '../src/js/pd/homeArt/yardSprites.js';
import { TERRAIN_SPRITES } from '../src/js/pd/terrainSprites.js';
import { HOME_ITEMS } from '../src/js/pd/homeData.js';

/** 各批次對應的轉換結果。 */
const OUT = { drops: ITEM_SPRITES, homeIcons: ICON_SPRITES, crops: CROP_SPRITES, furniture: FURNITURE_SPRITES, homeTiles: TILE_SPRITES, dungeonTiles: DUNGEON_TILES, yard: YARD_SPRITES, terrain: TERRAIN_SPRITES };

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

// 庭院造景第二版：密度 2，寬度剛好是物件佔用格數 × 64，代碼都是庭院物件。
test('庭院造景第二版的大小與佔用格數相符', () => {
  for (const [k, s] of Object.entries(YARD_SPRITES)) {
    const it = HOME_ITEMS[k];
    assert.ok(it && it.yard, `${k} 是庭院物件`);
    assert.equal(s.w, it.size[0] * 64, `${k} 寬`);
    assert.ok(s.h >= it.size[1] * 64, `${k} 高`);
  }
});

// 外圍地形：液體紋理是 128 × 128（64 世界像素、密度 2）且完全不透明；石塊剛好是頂面正方形加正面高度、四邊貼滿。
test('外圍地形的液體紋理與石塊大小正確', () => {
  for (const k of ['lava', 'water', 'iceWater', 'void']) {
    const s = TERRAIN_SPRITES[k];
    assert.equal(s.w, 128, `${k} 寬`);
    assert.equal(s.h, 128, `${k} 高`);
    assert.ok(s.rows.every((r) => !r.includes('.')), `${k} 有透明像素`);
  }
  [0, 6, 12, 18].forEach((hh, n) => {
    for (const [k, w] of [['big', 32], ['bigB', 32], ['small', 16]]) {
      const s = TERRAIN_SPRITES[`${k}@${n}`];
      assert.equal(s.w, w, `${k}@${n} 寬`);
      assert.equal(s.h, w + hh * 2, `${k}@${n} 高`);
    }
  });
});
