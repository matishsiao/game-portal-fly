// 關卡檔的讀取與驗證（build-levels 與 check-levels 共用）。
//
// 關卡檔格式（levels/<章節>-<編號>.txt）：
//   title: 關卡名稱
//   hint: 教學提示（選填，一行）
//   （空行）
//   盤面文字：# 牆  . 空氣  H 梯子  ~ 水  * 終點  x 易碎磚  ^ 彈簧
//             @ 滾滾  B 木箱  S 石塊  I 冰塊  o 氣球  b 水中木箱  i 水中冰塊

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initialState, T } from '../src/js/engine.js';
import { solve } from '../src/js/solver.js';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LEVEL_DIR = join(ROOT, 'levels');

/** 每章關卡數與章節主題。 */
export const CHAPTERS = [
  { chapter: 1, difficulty: 'easy', title: '重力與推箱子', count: 20 },
  { chapter: 2, difficulty: 'medium', title: '浮力與水', count: 20 },
  { chapter: 3, difficulty: 'hard', title: '摩擦力與衝擊', count: 20 },
  { chapter: 4, difficulty: 'expert', title: '彈力與綜合應用', count: 20 },
];

/**
 * 解析單一關卡檔。
 * @param {string} id 關卡 id（例如 1-07）。
 * @param {string} text 檔案內容。
 * @returns {{id: string, chapter: number, title: string, hint: string, rows: string[]}} 關卡。
 * @throws {Error} 格式錯誤時。
 */
export function parseLevelFile(id, text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const meta = {};
  let i = 0;
  for (; i < lines.length && lines[i].trim() !== ''; i++) {
    const m = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!m) throw new Error(`${id}：標頭格式錯誤「${lines[i]}」`);
    meta[m[1]] = m[2].trim();
  }
  const rows = lines.slice(i + 1).filter((l) => l.trim() !== '');
  if (!meta.title) throw new Error(`${id}：缺少 title`);
  if (!rows.length) throw new Error(`${id}：缺少盤面`);
  return { id, chapter: Number(id.split('-')[0]), title: meta.title, hint: meta.hint || '', rows };
}

/**
 * 讀取全部關卡檔（依 id 排序）。
 * @returns {object[]} 關卡清單。
 */
export function readLevels() {
  return readdirSync(LEVEL_DIR)
    .filter((f) => /^\d-\d{2}\.txt$/.test(f))
    .sort()
    .map((f) => parseLevelFile(f.replace('.txt', ''), readFileSync(join(LEVEL_DIR, f), 'utf8')));
}

/**
 * 驗證盤面合法性：邊界為牆、恰好一個終點、角色不在水中、初始盤面未過關也未失敗。
 * @param {object} level 關卡。
 * @returns {string[]} 錯誤訊息（空陣列代表合法）。
 */
export function validateLevel(level) {
  const errors = [];
  let s;
  try {
    s = initialState(level.rows);
  } catch (err) {
    return [`${level.id}：${err.message}`];
  }
  const { w, h, terrain } = s;
  for (let x = 0; x < w; x++) {
    if (terrain[x] !== T.WALL || terrain[(h - 1) * w + x] !== T.WALL) errors.push(`${level.id}：上下邊界須為牆`);
  }
  for (let y = 0; y < h; y++) {
    if (terrain[y * w] !== T.WALL || terrain[y * w + w - 1] !== T.WALL) errors.push(`${level.id}：左右邊界須為牆`);
  }
  if (terrain.filter((t) => t === T.GOAL).length !== 1) errors.push(`${level.id}：須恰好有一個終點`);
  if (w < 6 || w > 10 || h < 4 || h > 12) errors.push(`${level.id}：盤面大小須為寬 6～10、高 4～12`);
  if (s.dead || s.won) errors.push(`${level.id}：初始盤面不可已過關或失敗`);
  return [...new Set(errors)];
}

/**
 * 解出關卡並回傳最少步數與展開狀態數。
 * @param {object} level 關卡。
 * @returns {{solved: boolean, par: number, states: number, moves: string[]}} 結果。
 */
export function solveLevel(level) {
  const r = solve(initialState(level.rows));
  return { solved: r.solved, par: r.moves.length, states: r.states, moves: r.moves };
}
