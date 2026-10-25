// 批次出題驗收：初級、中級各產生 N 題（預設 200），高級、專家各產生 M 盤（預設 100），
// 檢查一題多解、干擾字、空格與字庫數量、常見度、排版、唯一解、只能經由交叉推出的空格，並統計出題時間。
// 用法：node scripts/check-puzzles.mjs [題數，預設 200] [盤數，預設 100] [難度...]

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { buildIndex } from '../src/js/idiom/data.js';
import { generateGame, DIFFICULTIES, DIFFICULTY_KEYS, isValidLayout } from '../src/js/idiom/generator.js';
import { answersOf, wordCells } from '../src/js/idiom/board.js';
import { countSolutions, propagate, crossOnlyCells } from '../src/js/idiom/solver.js';
import { ROOT } from './moe-source.mjs';

const questions = Number(process.argv[2]) || 200;
const boardsTarget = Number(process.argv[3]) || 100;
const keys = process.argv.length > 4 ? process.argv.slice(4) : DIFFICULTY_KEYS;
const read = (name) => JSON.parse(readFileSync(join(ROOT, 'src', 'data', name), 'utf8'));
const index = buildIndex({ idioms: read('idioms.json'), levels: read('idiom-levels.json'), check: read('idiom-check.json') });
let failed = 0;

/**
 * 檢查一個盤面是否符合該難度的規則。
 * @param {object} b 盤面。
 * @param {object} cfg 難度設定。
 * @returns {string[]} 不符合的項目。
 */
function inspect(b, cfg) {
  const problems = [];
  const answers = answersOf(b, (id) => index.byId.get(id).text);
  const blankAnswers = b.blanks.map((c) => answers[c]);
  if (b.words.some((w) => !cfg.levels.includes(index.level(w.id)))) problems.push('常見度不符');
  if (countSolutions(b, answers, index, 2) !== 1) problems.push('一題多解');
  if (!propagate(b, answers, index).solved) problems.push('需要猜測');
  if (cfg.mode === 'single') {
    if (b.blanks.length !== cfg.blanksPer) problems.push('空格數');
    if (b.bank.length !== cfg.bankSize) problems.push('字庫數');
    const extra = b.bank.slice();
    for (const a of blankAnswers) extra.splice(extra.indexOf(a), 1);
    if (extra.some((d) => blankAnswers.includes(d))) problems.push('干擾字等於正解');
  } else {
    if (!isValidLayout(b, cfg.size)) problems.push('排版');
    if (b.rows > b.cols || b.rows > cfg.short) problems.push(`盤面 ${b.rows}×${b.cols} 不是橫寬`);
    if (b.words.length < cfg.words[0] || b.words.length > cfg.words[1]) problems.push(`成語數 ${b.words.length}`);
    const filled = answers.filter(Boolean).length;
    const ratio = b.blanks.length / filled;
    if (ratio < cfg.blanks[0] - 1e-9 || ratio > cfg.blanks[1] + 1e-9) problems.push(`空格比例 ${ratio.toFixed(2)}`);
    if ([...b.bank].sort().join() !== [...blankAnswers].sort().join()) problems.push('字庫不等於空格答案');
    const level3 = b.words.filter((w) => index.level(w.id) === 3).length;
    if (level3 < Math.ceil(b.words.length * cfg.minLevel3)) problems.push('常見度 3 不足');
    if (cfg.crossOnly && !crossOnlyCells(b, answers, index).length) problems.push('沒有只能經由交叉推出的空格');
    const crossing = b.words.filter((w, k) => b.words.some((o, j) => j !== k && wordCells(b, w).some((c) => wordCells(b, o).includes(c)))).length;
    if (crossing * 2 < b.words.length) problems.push('交叉成語不足一半');
  }
  return problems;
}

for (const key of keys) {
  const cfg = DIFFICULTIES[key];
  const want = cfg.mode === 'single' ? questions : boardsTarget;
  const times = [];
  const reasons = new Map();
  let made = 0;
  let bad = 0;
  while (made < want) {
    const t0 = performance.now();
    const g = generateGame(key, index);
    times.push(performance.now() - t0);
    for (const b of g.boards) {
      made++;
      const problems = inspect(b, cfg);
      if (problems.length) {
        bad++;
        for (const r of problems) reasons.set(r, (reasons.get(r) || 0) + 1);
      }
    }
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.min(times.length - 1, Math.floor(times.length * 0.95))];
  console.log(
    `${cfg.label}（${key}）：${made} ${cfg.mode === 'single' ? '題' : '盤'}（${times.length} 局），失敗 ${bad}，` +
      `每局平均 ${avg.toFixed(0)} ms，P95 ${p95.toFixed(0)} ms，最慢 ${times[times.length - 1].toFixed(0)} ms`,
  );
  for (const [r, n] of reasons) console.log(`  ${r}：${n}`);
  failed += bad;
}

process.exitCode = failed ? 1 : 0;
