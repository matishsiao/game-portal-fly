// 詞庫測試：大考中心清單的整理規則、已審閱詞庫的驗證，以及例句挖空。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { expandEntry, normalizeList } from '../scripts/normalize-list.mjs';
import { validateWords, loadList } from '../scripts/validate-words.mjs';
import { blankExample, unpackLevel } from '../src/js/lexicon.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('整理清單：衍生字、複數、拼寫變體、縮寫與代名詞的規則', () => {
  assert.deepEqual(expandEntry({ raw: 'agree(ment)', pos: 'v./(n.)', level: 1 }).words, [{ en: 'agree', pos: 'v.' }, { en: 'agreement', pos: 'n.' }]);
  assert.deepEqual(expandEntry({ raw: 'argue(argument)', pos: 'v./(n.)', level: 2 }).words, [{ en: 'argue', pos: 'v.' }, { en: 'argument', pos: 'n.' }]);
  assert.deepEqual(expandEntry({ raw: 'glove(s)', pos: 'n.', level: 1 }).words, [{ en: 'glove', pos: 'n.' }]);
  assert.deepEqual(expandEntry({ raw: 'toward/towards', pos: 'prep.', level: 2 }).words.map((w) => w.en), ['toward']);
  assert.deepEqual(expandEntry({ raw: 'prince/princess', pos: 'n.', level: 2 }).words.map((w) => w.en), ['prince', 'princess']);
  assert.deepEqual(expandEntry({ raw: 'television/TV', pos: 'n.', level: 1 }).words.map((w) => w.en), ['television']);
  assert.deepEqual(expandEntry({ raw: 'he (him, his, himself)', pos: 'pron.', level: 1 }).words.map((w) => w.en), ['he']);
  assert.deepEqual(expandEntry({ raw: 'café/cafe', pos: 'n.', level: 2 }).words.map((w) => w.en), ['cafe']);
  assert.equal(expandEntry({ raw: 'am/a.m.', pos: 'adv.', level: 1 }).words.length, 0);
});

test('整理清單：與 data/list.json 一致（原始清單或整理規則變更時須重新執行 npm run list）', () => {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data/ceec/ceec-108.json'), 'utf8'));
  const { list } = normalizeList(raw);
  assert.deepEqual(list, JSON.parse(readFileSync(join(ROOT, 'data/list.json'), 'utf8')));
  assert.equal(new Set(list.map((w) => w.id)).size, list.length);
});

test('已審閱的詞庫全部通過驗證', () => {
  const dir = join(ROOT, 'data/words');
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
  assert.ok(files.length > 0);
  const list = loadList();
  for (const f of files) {
    const errors = validateWords(JSON.parse(readFileSync(join(dir, f), 'utf8')), list, { reviewed: true });
    assert.deepEqual(errors, [], `${f}：${errors.slice(0, 5).join('；')}`);
    assert.ok(existsSync(join(ROOT, 'data/reviews', f.replace('.json', '.md'))), `${f} 缺少審閱紀錄`);
  }
});

test('例句挖空：原形與變化形都能挖空，不誤挖其他字的一部分', () => {
  assert.equal(blankExample({ en: 'cat', form: '', example: 'The cat sat on the mat.' }), 'The ＿＿＿ sat on the mat.');
  assert.equal(blankExample({ en: 'buy', form: 'bought', example: 'I bought a book.' }), 'I ＿＿＿ a book.');
  assert.equal(blankExample({ en: 'art', form: '', example: 'Start the art class.' }), 'Start the ＿＿＿ class.');
  assert.equal(blankExample({ en: 'congratulation', form: 'Congratulations', example: 'Congratulations on your win!' }), '＿＿＿ on your win!');
  assert.deepEqual(unpackLevel(2, [['a', 'apple', 'n.', '蘋果', 'An apple.', '', '一顆蘋果。']])[0], { id: 'a', en: 'apple', pos: 'n.', level: 2, zh: '蘋果', example: 'An apple.', form: '', exampleZh: '一顆蘋果。' });
});
