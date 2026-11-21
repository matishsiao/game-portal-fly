// 裝備款式（每種類型 5 種、屬性特色）與附魔石（毒、眠、雷）的規則測試。
import test from 'node:test';
import assert from 'node:assert/strict';
import { seededRng, makeItem, setItemLevel, variantOf, gemBonus, gemEffect, rollGem, parseGem, characterStats } from '../src/js/pd/rules.js';
import { socketGem, addGem } from '../src/js/pd/village.js';
import { ITEM_VARIANTS, ITEM_NAMES, GEMS, GEM_RULES, VARIANT_STYLES } from '../src/js/pd/data.js';
import { ITEM_SPRITES } from '../src/js/pd/itemSprites.js';
import { spritesReady } from '../src/js/pd/spritePack.js';

test('每種裝備類型都有 5 種款式，代碼不重複，特色都有定義', () => {
  const keys = new Set();
  for (const type of Object.keys(ITEM_NAMES)) {
    assert.equal(ITEM_VARIANTS[type].length, 5, type);
    for (const [k] of ITEM_VARIANTS[type]) {
      assert.ok(!keys.has(k), k);
      keys.add(k);
      assert.ok(variantOf(type, k), `${type} ${k}`);
    }
  }
  assert.equal(keys.size, 80);
  assert.ok(Object.keys(VARIANT_STYLES).length >= 4);
});

test('每個款式與附魔石都有設計圖', async () => {
  await spritesReady?.();
  for (const list of Object.values(ITEM_VARIANTS)) for (const [k] of list) assert.ok(ITEM_SPRITES[k], k);
  for (const k of ['venom', 'dream', 'thunder']) assert.ok(ITEM_SPRITES[`gem-${k}`], k);
});

test('款式：名稱、代碼與屬性特色（闊劍攻擊較高、彎刀多了速度）', () => {
  const rng = seededRng(7);
  const broad = makeItem({ slot: 'weapon', cls: 'warrior', level: 30, rarity: 1, type: '劍', variant: 'broadsword' }, rng);
  const classic = makeItem({ slot: 'weapon', cls: 'warrior', level: 30, rarity: 1, type: '劍', variant: null }, seededRng(7));
  assert.equal(broad.variant, 'broadsword');
  assert.equal(broad.name, '闊劍');
  assert.equal(classic.variant, undefined);
  assert.equal(classic.name, ITEM_NAMES.劍[1]);
  assert.ok(broad.stats.atk > classic.stats.atk * 0.95);
  const sci = makeItem({ slot: 'weapon', cls: 'warrior', level: 30, rarity: 1, type: '劍', variant: 'scimitar' }, seededRng(1));
  assert.ok(sci.stats.spd > 0);
  const ring = makeItem({ slot: 'accessory', level: 20, rarity: 0, variant: 'luckyEarring' }, seededRng(3));
  assert.deepEqual(Object.keys(ring.stats), ['goldPct']);
});

test('隨機掉落約 60% 是款式', () => {
  const rng = seededRng(42);
  let n = 0;
  for (let i = 0; i < 2000; i++) if (makeItem({ slot: 'helmet', level: 10, rarity: 0 }, rng).variant) n++;
  assert.ok(n > 1050 && n < 1350, String(n));
});

test('款式升級後的屬性與同等級新做的一致（包含額外屬性）', () => {
  for (const variant of ['scimitar', 'broadsword']) {
    const a = makeItem({ slot: 'weapon', cls: 'warrior', level: 20, rarity: 2, type: '劍', variant }, seededRng(5));
    const b = makeItem({ slot: 'weapon', cls: 'warrior', level: 40, rarity: 2, type: '劍', variant }, seededRng(5));
    setItemLevel(a, 40);
    for (const k of Object.keys(b.stats)) assert.ok(Math.abs(a.stats[k] - b.stats[k]) <= 1, `${variant} ${k} ${a.stats[k]} ${b.stats[k]}`);
  }
});

test('附魔石：只在武器上有效、同種相加有上限，並列入角色屬性', () => {
  const sword = { slot: 'weapon', type: '劍', stats: { atk: 10 }, enhance: 0, rarity: 3, gems: ['venom-5', 'venom-5'] };
  const helm = { slot: 'helmet', type: '頭盔', stats: { def: 1 }, enhance: 0, rarity: 3, gems: ['thunder-3'] };
  const b = gemBonus([sword, helm]);
  assert.deepEqual(b.enchant, { poison: GEM_RULES.enchantCap });
  assert.equal(b.atk, 0);
  assert.deepEqual(gemBonus([{ ...sword, gems: ['dream-1'] }]).enchant, { sleep: GEMS.dream.values[0] });
  assert.deepEqual(characterStats('warrior', 1, [{ ...sword, gems: ['thunder-2'] }]).enchant, { stun: GEMS.thunder.values[1] });
  assert.match(gemEffect('venom-1'), /中毒/);
  assert.ok(parseGem('thunder-5'));
});

test('附魔石只能鑲在武器上', () => {
  const ch = { bag: [makeItem({ slot: 'armor', level: 5, rarity: 0 }, seededRng(1)), makeItem({ slot: 'weapon', cls: 'warrior', level: 5, rarity: 0 }, seededRng(2))], equipped: {}, gems: {} };
  addGem(ch, 'venom-1', 2);
  assert.equal(socketGem(ch, ch.bag[0].id, 'venom-1').ok, false);
  assert.equal(socketGem(ch, ch.bag[1].id, 'venom-1').ok, true);
});

test('掉落的寶石約 15% 是附魔石', () => {
  const rng = seededRng(9);
  let n = 0, total = 0;
  for (let i = 0; i < 4000; i++) {
    const g = parseGem(rollGem(10, rng));
    if (GEMS[g.kind].active) continue;
    total++;
    if (GEMS[g.kind].enchant) n++;
  }
  assert.ok(n / total > 0.11 && n / total < 0.19, String(n / total));
});
