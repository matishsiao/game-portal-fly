// 固定題庫的答案驗證：以 tests/answers/<難度>.mjs 中各題的暴力列舉或模擬函式獨立算出正解，與題庫的正確選項比對。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIFFICULTY_KEYS } from '../src/js/game.js';

/** 題庫內容。 */
const bank = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
/** 以 id 查詢題目。 */
const byId = new Map(bank.questions.map((q) => [q.id, q]));

for (const difficulty of DIFFICULTY_KEYS) {
  const { default: solvers } = await import(`./answers/${difficulty}.mjs`);

  test(`${difficulty}：程式算出的答案與題庫的正確選項相同`, () => {
    for (const [id, solve] of Object.entries(solvers)) {
      const q = byId.get(id);
      assert.ok(q, `${id} 不在題庫中`);
      assert.equal(solve(), q.choices[q.answer], `${id} 答案不符`);
    }
  });

  test(`${difficulty}：至少六成的題目有程式驗證`, () => {
    const total = bank.questions.filter((q) => q.difficulty === difficulty).length;
    assert.ok(Object.keys(solvers).length >= total * 0.6, `只有 ${Object.keys(solvers).length} / ${total} 題`);
  });
}
