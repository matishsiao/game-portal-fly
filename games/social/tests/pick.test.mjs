// 挑題與間隔複習測試：一般局的組成（到期題、科目、題型、主題、模板）、今日複習，以及複習間隔的推進。

import test from 'node:test';
import assert from 'node:assert/strict';
import { pickRound, pickReview, isDue, MAX_DUE, MAX_TEMPLATES, MAX_INTERVAL_MS } from '../src/js/social/pick.js';
import { ROUND_SIZE } from '../src/js/game.js';
import { TOPIC_INFO } from '../src/js/social/bank.js';
import { TEMPLATE_KEYS } from '../src/js/social/templates.js';

const DAY = 24 * 3600 * 1000;

/**
 * 固定種子的亂數。
 * @param {number} seed 種子。
 * @returns {() => number} 亂數。
 */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** 測試用題庫：hard 難度三科各 30 題，主題輪流，含排序與分類題；每題一張知識卡。 */
const TOPICS = { history: ['postwar-tw', 'japanese-era', 'china-east-asia'], geography: ['tw-geo', 'population', 'map'], civics: ['law', 'government', 'society'] };
const QUESTIONS = [];
for (const [subject, topics] of Object.entries(TOPICS)) {
  for (let i = 0; i < 30; i++) {
    const type = i % 10 === 0 ? 'order' : i % 10 === 1 ? 'sort' : 'choice';
    QUESTIONS.push({ id: `hard-${subject}-${i}`, difficulty: 'hard', subject, topic: topics[i % 3], type, card: `card-${subject}-${i}` });
  }
}

test('一般局：10 題、不重複、綜合時三科各至少 2 題、排序與分類各 1～2 題、同主題最多 3 題、模板最多 2 題', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { ids, extra } = pickRound({ difficulty: 'hard', subject: 'all', questions: QUESTIONS, rng: rng(seed) });
    assert.equal(ids.length, ROUND_SIZE);
    assert.equal(new Set(ids).size, ROUND_SIZE);
    assert.ok(extra.length <= MAX_TEMPLATES);
    const qs = ids.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);
    for (const s of Object.keys(TOPICS)) assert.ok(qs.filter((q) => q.subject === s).length >= 2, `${s} 少於 2 題`);
    for (const t of ['order', 'sort']) {
      const n = qs.filter((q) => q.type === t).length;
      assert.ok(n >= 1 && n <= 2, `${t} ${n} 題`);
    }
    const byTopic = {};
    for (const q of qs) byTopic[q.topic] = (byTopic[q.topic] || 0) + 1;
    assert.ok(Object.values(byTopic).every((n) => n <= 3));
    for (const q of extra) assert.ok(ids.includes(q.id) && TEMPLATE_KEYS.includes(q.template));
  }
});

test('一般局：選單一科目與主題時只出那些主題；主題題數不足時放寬到同科目並回報', () => {
  const { ids, widened } = pickRound({ difficulty: 'hard', subject: 'history', topics: ['postwar-tw', 'japanese-era'], questions: QUESTIONS, rng: rng(3) });
  assert.equal(widened, false);
  for (const id of ids) {
    const q = QUESTIONS.find((x) => x.id === id);
    if (q) assert.ok(['postwar-tw', 'japanese-era'].includes(q.topic));
    else assert.ok(id.includes('#'));
  }
  const few = QUESTIONS.filter((q) => q.topic !== 'japanese-era' || Number(q.id.split('-').pop()) < 6);
  const r = pickRound({ difficulty: 'hard', subject: 'history', topics: ['japanese-era'], questions: few, rng: rng(4) });
  assert.equal(r.widened, true);
  assert.equal(r.ids.length, ROUND_SIZE);
  for (const id of r.ids) {
    const q = few.find((x) => x.id === id);
    if (q) assert.equal(TOPIC_INFO[q.topic].subject, 'history');
  }
});

test('一般局：到期的待複習題目優先出現（最多 3 題），從未出現的題目優先於出現過的', () => {
  const now = 100 * DAY;
  const record = {};
  const dueIds = QUESTIONS.slice(2, 8).map((q) => q.id);
  dueIds.forEach((id, i) => {
    record[id] = { seen: 1, last: 1, review: true, stage: 0, due: now - i * DAY, mastered: false };
  });
  // 其他題目除了 civics 以外都出現過。
  for (const q of QUESTIONS) if (!record[q.id] && q.subject !== 'civics') record[q.id] = { seen: 1, last: now - DAY, review: false, stage: 0, due: null, mastered: false };
  const { ids } = pickRound({ difficulty: 'hard', subject: 'all', questions: QUESTIONS, record, now, rng: rng(5) });
  assert.equal(ids.filter((id) => dueIds.includes(id)).length, MAX_DUE);
  const civics = ids.filter((id) => id.startsWith('hard-civics')).length;
  assert.ok(civics >= 2);
});

test('今日複習：只出到期的題目，最早到期的優先；不足 3 題時不開局；難度取最多的', () => {
  const now = 50 * DAY;
  const record = {};
  QUESTIONS.slice(0, 12).forEach((q, i) => {
    record[q.id] = { seen: 1, last: 1, review: true, stage: 0, due: now - i * DAY, mastered: false };
  });
  record[QUESTIONS[20].id] = { seen: 1, last: 1, review: true, stage: 1, due: now + DAY, mastered: false };
  const r = pickReview({ questions: QUESTIONS, record, now, rng: rng(6) });
  assert.equal(r.ids.length, ROUND_SIZE);
  assert.ok(!r.ids.includes(QUESTIONS[20].id), '還沒到期的不出');
  assert.ok(r.ids.includes(QUESTIONS[11].id), '最早到期的優先');
  assert.equal(r.difficulty, 'hard');
  const few = { [QUESTIONS[0].id]: record[QUESTIONS[0].id], [QUESTIONS[1].id]: record[QUESTIONS[1].id] };
  assert.equal(pickReview({ questions: QUESTIONS, record: few, now }).ids.length, 0);
});

test('到期判斷：已到期、未到期，以及裝置時間被往回調時視為到期', () => {
  const now = 10 * DAY;
  assert.ok(isDue({ review: true, due: now }, now));
  assert.ok(!isDue({ review: true, due: now + DAY }, now));
  assert.ok(!isDue({ review: false, due: now - DAY }, now));
  assert.ok(isDue({ review: true, due: now + MAX_INTERVAL_MS + DAY }, now));
});
