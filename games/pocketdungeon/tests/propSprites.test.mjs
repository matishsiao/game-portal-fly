// 地圖裝飾物圖（propSprites.js）的資料檢查：每種都有設計參數、格數正確、每列等長、字元都在調色盤裡、不超出畫布。

import test from 'node:test';
import assert from 'node:assert/strict';
import { PROP_SPRITES } from '../src/js/pd/propSprites.js';
import { PROP_SHEETS } from '../scripts/hero-sprites/sheets.mjs';

// 轉換參數裡的每種裝飾物都有圖，格數與設計圖相同（寶箱、地刺 2 格，其他 1 格）。
test('每種裝飾物都有圖且格數正確', () => {
  for (const [k, sheet] of Object.entries(PROP_SHEETS)) {
    assert.ok(PROP_SPRITES[k], `缺少 ${k}`);
    assert.equal(PROP_SPRITES[k].frames.length, sheet.auto.n, `${k} 格數`);
    assert.equal(PROP_SPRITES[k].gray, sheet.gray, `${k} 灰階設定`);
  }
});

// 列長、調色盤與畫布範圍。
test('每格列長一致、字元都在調色盤裡且不超出畫布', () => {
  for (const [k, s] of Object.entries(PROP_SPRITES)) {
    s.frames.forEach((f, i) => {
      const w = f.rows[0].length;
      for (const row of f.rows) {
        assert.equal(row.length, w, `${k} 第 ${i} 格列長`);
        for (const ch of row) assert.ok(ch === '.' || s.palette[ch], `${k} 第 ${i} 格字元 ${ch}`);
      }
      assert.ok(f.x >= 0 && f.y >= 0 && f.x + w <= s.w && f.y + f.rows.length <= s.h, `${k} 第 ${i} 格超出畫布`);
    });
  }
});

// 樓梯要剛好一格寬（密度 2 為 32 圖像素）。
test('樓梯剛好填滿一格', () => {
  assert.equal(PROP_SPRITES.stairs.w, 32);
});
