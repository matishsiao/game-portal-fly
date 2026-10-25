// 詞庫驗證：遊戲資料與教育部《成語典》原始下載檔逐字相同、欄位完整、達到上架數量與大小限制。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, latestSourceFile, readEntries, isPlayable, normalizeNewlines, splitExamples, GROUP_MARK } from '../scripts/moe-source.mjs';

const DATA = join(ROOT, 'src', 'data');
const idioms = JSON.parse(readFileSync(join(DATA, 'idioms.json'), 'utf8'));
const levels = JSON.parse(readFileSync(join(DATA, 'idiom-levels.json'), 'utf8'));
const check = JSON.parse(readFileSync(join(DATA, 'idiom-check.json'), 'utf8'));
const source = JSON.parse(readFileSync(join(DATA, 'source.json'), 'utf8'));
const { file, version } = latestSourceFile();
const entries = readEntries(file);
const original = new Map(entries.map((e) => [e.id, e]));

test('id 與成語不重複，成語為四個漢字', () => {
  assert.equal(new Set(idioms.map((i) => i.id)).size, idioms.length);
  assert.equal(new Set(idioms.map((i) => i.text)).size, idioms.length);
  for (const i of idioms) assert.match(i.text, /^[㐀-鿿]{4}$/, i.id);
});

test('釋義、注音不為空，至少有一句例句', () => {
  for (const i of idioms) {
    assert.ok(i.meaning.trim(), i.id);
    assert.ok(i.zhuyin.trim(), i.id);
    assert.ok(i.examples.length >= 1 && i.examples.every((g) => g.length >= 1), i.id);
  }
});

test('遊戲資料與教育部原始資料逐字相同（只去除 \\r、例句依換行與「＆」拆開）', () => {
  for (const i of idioms) {
    const e = original.get(i.id);
    assert.ok(e, `原始資料中沒有 id ${i.id}`);
    assert.equal(i.text, e.text);
    assert.equal(i.zhuyin, normalizeNewlines(e.zhuyin));
    assert.equal(i.meaning, normalizeNewlines(e.meaning));
    assert.deepEqual(i.examples, splitExamples(e.examples));
    // 例句群組以「＆」接回去即為原文（去除 \r 與空行；分隔行前後的空白，以及沒有例句的空群組不算內容）。
    const joined = i.examples.map((g) => g.join('\n')).join(`\n${GROUP_MARK}\n`);
    const raw = normalizeNewlines(e.examples)
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => (l.trim() === GROUP_MARK ? GROUP_MARK : l))
      .filter((l, k, arr) => l !== GROUP_MARK || (k > 0 && k < arr.length - 1 && arr[k - 1] !== GROUP_MARK));
    assert.equal(joined, raw.join('\n'));
  }
});

test('收錄所有符合條件的主條目', () => {
  const expected = entries.filter(isPlayable).map((e) => e.id).sort();
  assert.deepEqual(idioms.map((i) => i.id).sort(), expected);
});

test('所有遊戲可用成語都有常見度，且都在檢查表中', () => {
  const checkSet = new Set(check);
  for (const i of idioms) {
    assert.ok([1, 2, 3].includes(levels[i.id] && levels[i.id].level), i.id);
    assert.ok(checkSet.has(i.text), i.text);
  }
  assert.equal(check.length, new Set(entries.map((e) => e.text).filter(Boolean)).size);
});

test('達到上架數量：至少 1,000 筆，常見 300、一般 400、進階 300', () => {
  const count = { 1: 0, 2: 0, 3: 0 };
  for (const i of idioms) count[levels[i.id].level]++;
  assert.ok(idioms.length >= 1000, `${idioms.length}`);
  assert.ok(count[1] >= 300, `常見 ${count[1]}`);
  assert.ok(count[2] >= 400, `一般 ${count[2]}`);
  assert.ok(count[3] >= 300, `進階 ${count[3]}`);
});

test('易混淆字只對應成語中的字，且不等於原字', () => {
  for (const [id, v] of Object.entries(levels)) {
    if (!v.confusables) continue;
    const text = idioms.find((i) => i.id === id).text;
    for (const [ch, list] of Object.entries(v.confusables)) {
      assert.ok(text.includes(ch), `${text} 不含 ${ch}`);
      assert.ok(!list.includes(ch));
    }
  }
});

test('資料大小與來源版本', () => {
  assert.ok(statSync(join(DATA, 'idioms.json')).size <= 1.5 * 1024 * 1024);
  assert.equal(source.version, version);
  assert.match(source.licenseUrl, /by-nd\/3\.0\/tw/);
});
