// 挑題測試：題數、模板題數、同題型上限、未出現過的優先、待複習的模板優先與不重複。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickRound, TOPIC_LIMIT } from '../src/js/writing/pick.js';
import { createBank, isTemplateId, templateOf } from '../src/js/writing/bank.js';
import { TEMPLATES, createRng } from '../src/js/writing/templates.js';

/** 題目查詢（固定題庫與模板）。 */
const bank = createBank(JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8')));

test('每局 10 題、不重複，模板題數不超過模板個數，同一模板最多 1 題', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    for (let seed = 1; seed <= 30; seed++) {
      const ids = pickRound({ difficulty, questions: bank.questions, rng: createRng(seed) });
      assert.equal(ids.length, 10);
      assert.equal(new Set(ids).size, 10);
      const tpl = ids.filter(isTemplateId).map(templateOf);
      assert.equal(new Set(tpl).size, tpl.length);
      const available = Object.values(TEMPLATES).filter((t) => t.difficulty === difficulty).length;
      assert.equal(tpl.length, Math.min(4, available));
      for (const id of ids) assert.equal(bank.lookup(id).difficulty, difficulty);
    }
  }
});

test('題型足夠時，同一局同題型不超過上限', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const ids = pickRound({ difficulty: 'medium', questions: bank.questions, rng: createRng(seed) });
    const count = {};
    for (const id of ids) count[bank.lookup(id).topic] = (count[bank.lookup(id).topic] || 0) + 1;
    assert.ok(Math.max(...Object.values(count)) <= TOPIC_LIMIT);
  }
});

test('從未出現過的固定題優先；全部出現過後以最久沒出現的優先', () => {
  const qs = [];
  for (let i = 0; i < 25; i++) qs.push({ id: `easy-${String(i).padStart(3, '0')}`, difficulty: 'easy', topic: ['calc', 'count', 'logic', 'pattern', 'age'][i % 5] });
  const record = {};
  for (let i = 0; i < 15; i++) record[qs[i].id] = { seen: 1, last: 1000 + i, review: false };
  // 初級有 4 個模板，所以固定題每局 6 題。
  const fixedOf = (ids) => ids.filter((id) => !isTemplateId(id));
  const ids = fixedOf(pickRound({ difficulty: 'easy', questions: qs, record, rng: createRng(3) }));
  assert.equal(ids.length, 10);
  for (const id of ids) assert.ok(qs.slice(15).some((q) => q.id === id), `${id} 應是從未出現過的題目`);
  for (let i = 15; i < 25; i++) record[qs[i].id] = { seen: 1, last: 5000 + i, review: false };
  const again = fixedOf(pickRound({ difficulty: 'easy', questions: qs, record, rng: createRng(4) }));
  assert.deepEqual(new Set(again), new Set(qs.slice(0, 10).map((q) => q.id)));
});
