// 計算題的答案驗證：以 tests/answers/*.mjs 中各題的計算或列舉函式獨立算出正解，與題庫的正確選項比對。

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/** 題庫內容。 */
const bank = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8'));
/** 以 id 查詢題目。 */
const byId = new Map(bank.questions.map((q) => [q.id, q]));
/** 驗算函式檔（每個檔案匯出 `{ 題目 id: () => 正解選項文字 }`）。 */
const files = readdirSync(new URL('./answers/', import.meta.url)).filter((f) => f.endsWith('.mjs'));

for (const file of files) {
  const { default: solvers } = await import(`./answers/${file}`);

  test(`${file}：計算出的答案等於題庫的正確選項，且在選項中唯一`, () => {
    for (const [id, solve] of Object.entries(solvers)) {
      const q = byId.get(id);
      assert.ok(q, `${id} 不在題庫中`);
      assert.equal(q.type, 'choice', `${id} 不是選擇題`);
      const answer = solve();
      assert.equal(answer, q.options[q.answer].text, `${id} 答案不符`);
      assert.equal(q.options.filter((o) => o.text === answer).length, 1, `${id} 正解在選項中不唯一`);
    }
  });
}
