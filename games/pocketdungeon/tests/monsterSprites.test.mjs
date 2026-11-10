// 一般怪物動作圖（monsterSprites.js）的資料檢查：對應的怪物存在、4 格、每列等長、字元都在調色盤裡、高度符合尺寸級別。

import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_SPRITES } from '../src/js/pd/monsterSprites.js';
import { MONSTERS } from '../src/js/pd/data.js';
import { MONSTER_SHEETS } from '../scripts/hero-sprites/sheets.mjs';

const entries = Object.entries(MONSTER_SPRITES);

// 每隻動作圖都對應到 MONSTERS 裡的怪物。
test('動作圖的鍵都是既有的怪物', () => {
  assert.ok(entries.length > 0);
  for (const [k] of entries) assert.ok(MONSTERS[k], `${k} 不在 MONSTERS`);
});

// 格子數、列長與調色盤。
test('每隻 4 格，每格列長一致且字元都在調色盤裡', () => {
  for (const [k, s] of entries) {
    assert.equal(s.frames.length, 4, `${k} 格數`);
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

// 待機圖高度依尺寸級別（小 28、中 34、大 40、巨 46）。
test('待機圖高度約等於尺寸級別的目標高度（±4）', () => {
  for (const [k, s] of entries) {
    const h = s.frames[0].rows.length;
    const target = MONSTER_SHEETS[k].h;
    assert.ok(Math.abs(h - target) <= 4, `${k} 高度 ${h}，目標 ${target}`);
  }
});
