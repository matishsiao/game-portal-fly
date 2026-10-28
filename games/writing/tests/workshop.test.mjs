// 作文專屬整合驗證：四級題庫完整闖關、續玩、共用模組一致性與選寫儲存容錯。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createBank } from '../src/js/writing/bank.js';
import { pickRound } from '../src/js/writing/pick.js';
import { createGame, choose, nextQuestion, isOver, isPerfect, isValidSave } from '../src/js/game.js';
import { loadDraft, saveDraft } from '../src/js/storage.js';

/** 隨遊戲提供的完整固定題庫。 */
const bank = createBank(JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url), 'utf8')));

test('四級皆能從真實題庫開局、逐題保存還原並無提示完成', () => {
  for (const difficulty of ['easy', 'medium', 'hard', 'expert']) {
    const ids = pickRound({ difficulty, questions: bank.questions });
    assert.equal(ids.length, 10);
    let state = createGame({ difficulty, ids });
    for (let i = 0; i < 10; i++) {
      assert.equal(isValidSave(state, bank.lookup), true);
      const q = bank.lookup(state.items[state.index].id);
      choose(state, state.items[state.index].order.indexOf(q.answer), q.answer);
      state = JSON.parse(JSON.stringify(state));
      assert.equal(isValidSave(state, bank.lookup), true);
      nextQuestion(state);
    }
    assert.equal(isOver(state), true);
    assert.equal(isPerfect(state), true);
  }
});

test('遊玩歷程與凍結模組與大廳正本完全相同', () => {
  assert.equal(readFileSync(new URL('../src/js/playlog.js', import.meta.url), 'utf8'), readFileSync(new URL('../../../src/playlog.js', import.meta.url), 'utf8'));
});

test('草稿限制長度、可讀回，儲存失敗時保留最新記憶體草稿', () => {
  const data = new Map();
  globalThis.localStorage = {
    /** 模擬正常草稿讀取。 */
    getItem(key) { return data.get(key) ?? null; },
    /** 模擬正常草稿寫入。 */
    setItem(key, value) { data.set(key, value); },
  };
  assert.equal(loadDraft(), '');
  assert.equal(saveDraft('我的故事'), true);
  assert.equal(loadDraft(), '我的故事');
  saveDraft('文'.repeat(7000));
  assert.equal(loadDraft().length, 6000);
  /** 模擬配額不足，仍應可在本次使用期間保留最新草稿。 */
  localStorage.setItem = () => { throw new Error('儲存空間已滿'); };
  assert.equal(saveDraft('最新版本'), false);
  assert.equal(loadDraft(), '最新版本');
});
