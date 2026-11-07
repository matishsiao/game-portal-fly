// 產生家園學科連動的知識卡清單（src/js/pd/homeLinks.js）：從自然探險與社會科學的題庫，
// 找出各連動對應單元（units）或主題（topics）的題目所附的知識卡代碼。
// 用法：node scripts/gen-home-links.mjs（題庫有變動時重新執行；測試會檢查輸出是否與題庫一致）。

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 各學科連動對應的單元（自然探險）或主題（社會科學）。 */
export const LINK_SOURCES = {
  animals: { game: 'science', units: ['e-animals', 'm-animals', 'x-reproduction'] },
  bees: { game: 'science', units: ['m-insects', 'x-ecosystem'] },
  plants: { game: 'science', units: ['e-plants', 'm-plants', 'x-nutrition'] },
  microbes: { game: 'science', units: ['h-microbes'] },
  twGeo: { game: 'social', topics: ['tw-geo', 'economy-geo'] },
  festival: { game: 'social', topics: ['local', 'society'] },
  market: { game: 'social', topics: ['economy'] },
};

/**
 * 依題庫算出每個連動的知識卡代碼（排序、不重複）。
 * @returns {Record<string, string[]>} 連動代碼與知識卡代碼。
 */
export function buildLinks() {
  const bank = {
    science: JSON.parse(readFileSync(join(root, '../science/src/data/questions.json'), 'utf8')).questions,
    social: JSON.parse(readFileSync(join(root, '../social/src/data/questions.json'), 'utf8')).questions,
  };
  const out = {};
  for (const [key, src] of Object.entries(LINK_SOURCES)) {
    const want = new Set(src.units || src.topics);
    // 題目是否屬於這個連動的單元或主題。
    const hit = (q) => q.card && want.has(src.units ? q.unit : q.topic);
    out[key] = [...new Set(bank[src.game].filter(hit).map((q) => q.card))].sort();
  }
  return out;
}

/**
 * 產生 homeLinks.js 的內容。
 * @param {Record<string, string[]>} links 連動的知識卡代碼。
 * @returns {string} 檔案內容。
 */
export function renderLinks(links) {
  const body = Object.entries(links).map(([k, ids]) => `  ${k}: ${JSON.stringify(ids)},`).join('\n');
  return `// 由 scripts/gen-home-links.mjs 從自然探險與社會科學題庫產生，請勿手動修改。
// 家園學科連動：收集到任一張清單中的知識卡（science.cards 或 social.cards）就解鎖。

/** 各學科連動對應的知識卡代碼。 */
export const LINK_CARDS = {
${body}
};
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const links = buildLinks();
  writeFileSync(join(root, 'src/js/pd/homeLinks.js'), renderLinks(links));
  console.log(Object.entries(links).map(([k, v]) => `${k}: ${v.length}`).join('、'));
}
