// 匯入教育部《成語典》：把 data/moe/ 的原始下載檔轉成遊戲資料。
// 用法：node scripts/import-moe.mjs
//
// 產生：
//   src/data/idioms.json        遊戲可用成語（id、成語、注音、釋義、例句；文字皆為原文）
//   src/data/idiom-check.json   檢查用成語表（下載檔中的全部成語文字）
//   src/data/idiom-levels.json  本專案的常見度分級與易混淆字（不屬於《成語典》內容）
//   src/data/source.json        資料來源與版本資訊

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, latestSourceFile, readEntries, isPlayable, normalizeNewlines, splitExamples } from './moe-source.mjs';

const OUT = join(ROOT, 'src', 'data');

/**
 * 讀取常見度分級清單：[1] 與 [3] 區段列出的成語，其餘為 2。
 * @returns {Map<string, number>} 成語文字 → 等級。
 */
function readLevels() {
  const map = new Map();
  let level = 0;
  for (const raw of readFileSync(join(ROOT, 'data', 'levels.txt'), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^\[(\d)\]$/.exec(line);
    if (m) {
      level = Number(m[1]);
      continue;
    }
    for (const text of line.split(/\s+/)) {
      if (map.has(text) && map.get(text) !== level) console.warn(`警告：「${text}」同時列在 [${map.get(text)}] 與 [${level}]，採用 [${map.get(text)}]`);
      else map.set(text, level);
    }
  }
  return map;
}

/**
 * 從「辨識-形音辨誤」欄位取出易混淆字：「X，音…不可寫作「Y」」表示成語中的 X 容易誤寫為 Y。
 * @param {string} text 成語。
 * @param {string} note 辨識欄位原文。
 * @returns {Record<string, string[]>} 成語中的字 → 易混淆字。
 */
function confusablesOf(text, note) {
  const out = {};
  // 每一行說明一個字：行首「X，」為被說明的字；也可能寫成「「X」不可寫作「Y」」。
  for (const line of normalizeNewlines(note).split('\n')) {
    const head = /^\s*([㐀-鿿])，/.exec(line);
    for (const m of line.matchAll(/(?:「([㐀-鿿])」)?(?:不可|不宜|勿)(?:寫|誤)?作「([㐀-鿿])」/g)) {
      const subject = m[1] || (head && head[1]);
      if (!subject || !text.includes(subject) || m[2] === subject) continue;
      (out[subject] ||= []).includes(m[2]) || out[subject].push(m[2]);
    }
  }
  return out;
}

/**
 * 以「一行一筆」的格式輸出 JSON 陣列，方便檢視差異。
 * @param {string} file 輸出檔案。
 * @param {any[]} list 資料。
 */
function writeLines(file, list) {
  writeFileSync(file, `[\n${list.map((x) => JSON.stringify(x)).join(',\n')}\n]\n`);
}

const { file, version } = latestSourceFile();
const entries = readEntries(file);
const levels = readLevels();
mkdirSync(OUT, { recursive: true });

const playable = entries.filter(isPlayable).sort((a, b) => Number(a.id) - Number(b.id));
const idioms = playable.map((e) => ({
  id: e.id,
  text: e.text,
  zhuyin: normalizeNewlines(e.zhuyin),
  meaning: normalizeNewlines(e.meaning),
  examples: splitExamples(e.examples),
}));
writeLines(join(OUT, 'idioms.json'), idioms);

const check = [...new Set(entries.map((e) => e.text).filter(Boolean))].sort();
writeFileSync(join(OUT, 'idiom-check.json'), `${JSON.stringify(check)}\n`);

const levelData = {};
const count = { 1: 0, 2: 0, 3: 0 };
const playableTexts = new Set(playable.map((e) => e.text));
for (const e of playable) {
  const level = levels.get(e.text) || 2;
  count[level]++;
  const conf = confusablesOf(e.text, e.confusion);
  levelData[e.id] = Object.keys(conf).length ? { level, confusables: conf } : { level };
}
for (const text of levels.keys()) if (!playableTexts.has(text)) console.warn(`警告：levels.txt 中的「${text}」不是遊戲可用成語，已略過`);
writeFileSync(join(OUT, 'idiom-levels.json'), `{\n${Object.entries(levelData).map(([id, v]) => `${JSON.stringify(id)}:${JSON.stringify(v)}`).join(',\n')}\n}\n`);

writeFileSync(
  join(OUT, 'source.json'),
  `${JSON.stringify(
    {
      title: '成語典',
      publisher: '中華民國教育部（Ministry of Education, R.O.C.）',
      version,
      url: 'https://dict.idioms.moe.edu.tw/',
      license: '創用CC 姓名標示-禁止改作 3.0 臺灣（CC BY-ND 3.0 TW）',
      licenseUrl: 'https://creativecommons.org/licenses/by-nd/3.0/tw/legalcode',
      notice: 'moe/idiomsdict_10409.pdf',
      noticeOdt: 'moe/idiomsdict_10409.odt',
    },
    null,
    2,
  )}\n`,
);

const size = statSync(join(OUT, 'idioms.json')).size;
console.log(`來源：${file}（版本 ${version}）`);
console.log(`全部條目 ${entries.length}、遊戲可用 ${idioms.length}（常見 ${count[1]}、一般 ${count[2]}、進階 ${count[3]}）、檢查表 ${check.length}`);
console.log(`易混淆字：${Object.values(levelData).filter((v) => v.confusables).length} 筆成語`);
console.log(`idioms.json ${(size / 1024 / 1024).toFixed(2)} MB`);
