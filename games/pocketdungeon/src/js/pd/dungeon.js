// 地城生成：以隨機種子在格子地圖上放置房間、以最小生成樹加少量額外通道連接，並配置怪物、寶箱與陷阱。
// 相同的種子與參數一定產生相同的樓層（存檔只需記錄種子）。
//
// 地圖格子代碼：0 牆、1 地板、2 下樓樓梯、3 地刺陷阱。

import { AREAS, FLOORS } from './data.js';
import { seededRng, pick } from './rules.js';

export const WALL = 0;
export const FLOOR = 1;
export const STAIRS = 2;
export const SPIKES = 3;

/** 一般樓層的地圖大小。 */
const W = 40;
const H = 30;

/**
 * 判斷格子是否可行走（地板、樓梯、陷阱）。
 * @param {number} t 格子代碼。
 * @returns {boolean} 可行走時為 true。
 */
export function walkable(t) {
  return t !== WALL;
}

/**
 * 在地圖上挖出矩形（設為地板）。
 * @param {Uint8Array} tiles 地圖。
 * @param {number} w 地圖寬度。
 * @param {number} x 左上角 x。
 * @param {number} y 左上角 y。
 * @param {number} rw 寬。
 * @param {number} rh 高。
 */
function carve(tiles, w, x, y, rw, rh) {
  for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) tiles[j * w + i] = FLOOR;
}

/**
 * 以寬 2 格的 L 形通道連接兩點。
 * @param {Uint8Array} tiles 地圖。
 * @param {number} w 地圖寬度。
 * @param {{cx: number, cy: number}} a 起點房間。
 * @param {{cx: number, cy: number}} b 終點房間。
 * @param {() => number} rng 亂數函式。
 */
function corridor(tiles, w, a, b, rng) {
  const horizontalFirst = rng() < 0.5;
  const [x1, y1, x2, y2] = [a.cx, a.cy, b.cx, b.cy];
  if (horizontalFirst) {
    carve(tiles, w, Math.min(x1, x2), y1, Math.abs(x2 - x1) + 2, 2);
    carve(tiles, w, x2, Math.min(y1, y2), 2, Math.abs(y2 - y1) + 2);
  } else {
    carve(tiles, w, x1, Math.min(y1, y2), 2, Math.abs(y2 - y1) + 2);
    carve(tiles, w, Math.min(x1, x2), y2, Math.abs(x2 - x1) + 2, 2);
  }
}

/**
 * 以廣度優先搜尋計算每個格子到起點的步數。
 * @param {Uint8Array} tiles 地圖。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @param {number} sx 起點 x。
 * @param {number} sy 起點 y。
 * @returns {Int32Array} 步數，無法到達為 -1。
 */
export function distances(tiles, w, h, sx, sy) {
  const dist = new Int32Array(w * h).fill(-1);
  const queue = [sy * w + sx];
  dist[queue[0]] = 0;
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q];
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (dist[j] < 0 && walkable(tiles[j])) {
        dist[j] = dist[i] + 1;
        queue.push(j);
      }
    }
  }
  return dist;
}

/**
 * 在房間內找一個隨機的空地板格（避開已佔用的格子）。
 * @param {object} room 房間。
 * @param {Uint8Array} tiles 地圖。
 * @param {number} w 地圖寬度。
 * @param {Set<number>} used 已佔用的格子。
 * @param {() => number} rng 亂數函式。
 * @returns {{x: number, y: number} | null} 格子中心座標，找不到時為 null。
 */
function spotIn(room, tiles, w, used, rng) {
  for (let tries = 0; tries < 30; tries++) {
    const x = room.x + 1 + Math.floor(rng() * (room.w - 2));
    const y = room.y + 1 + Math.floor(rng() * (room.h - 2));
    const i = y * w + x;
    if (tiles[i] === FLOOR && !used.has(i)) {
      used.add(i);
      return { x: x + 0.5, y: y + 0.5 };
    }
  }
  return null;
}

/**
 * 產生 Boss 層：固定形狀的大房間（17 × 13），起點在下方，Boss 在中央偏上。
 * @param {{area: string, depth: number}} params 區域與深度。
 * @param {() => number} rng 亂數函式。
 * @returns {object} 樓層資料。
 */
function bossFloor({ area }, rng) {
  const w = 21;
  const h = 17;
  const tiles = new Uint8Array(w * h);
  carve(tiles, w, 2, 2, 17, 13);
  const room = { x: 2, y: 2, w: 17, h: 13, cx: 10, cy: 8 };
  const boss = pick(AREAS[area].boss, rng);
  return {
    w,
    h,
    tiles,
    rooms: [room],
    start: { x: 10.5, y: 13.5 },
    stairs: null,
    monsters: [],
    chests: [],
    boss: { type: boss, x: 10.5, y: 6.5 },
    portal: { x: 10.5, y: 8.5 },
  };
}

/**
 * 產生一個樓層。
 * @param {{seed: number, area: string, depth: number, floor: number}} params 種子、區域、深度、樓層（0 起算，等於 FLOORS 時為 Boss 層）。
 * @returns {{w: number, h: number, tiles: Uint8Array, rooms: object[], start: {x: number, y: number}, stairs: {x: number, y: number} | null,
 *   monsters: {type: string, x: number, y: number, elite: boolean}[], chests: {x: number, y: number}[], boss: object | null, portal: object | null}} 樓層資料。
 */
export function generateFloor({ seed, area, depth, floor }) {
  const rng = seededRng(seed);
  if (floor >= FLOORS) return bossFloor({ area, depth }, rng);
  const tiles = new Uint8Array(W * H);
  const rooms = [];
  const target = 6 + Math.floor(rng() * 4);
  for (let tries = 0; tries < 300 && rooms.length < target; tries++) {
    const rw = 5 + Math.floor(rng() * 5);
    const rh = 4 + Math.floor(rng() * 4);
    const x = 1 + Math.floor(rng() * (W - rw - 2));
    const y = 1 + Math.floor(rng() * (H - rh - 2));
    const overlap = rooms.some((r) => x < r.x + r.w + 2 && x + rw + 2 > r.x && y < r.y + r.h + 2 && y + rh + 2 > r.y);
    if (overlap) continue;
    rooms.push({ x, y, w: rw, h: rh, cx: x + Math.floor(rw / 2) - 1, cy: y + Math.floor(rh / 2) - 1 });
  }
  // 房間太少時（極少發生）換一個種子重來，確保有足夠的房間放起點、樓梯與怪物。
  if (rooms.length < 4) return generateFloor({ seed: seed + 7919, area, depth, floor });
  for (const r of rooms) carve(tiles, W, r.x, r.y, r.w, r.h);
  // 最小生成樹（Prim）連接所有房間，再加 1～2 條額外通道形成迴圈。
  const inTree = [0];
  const edges = [];
  while (inTree.length < rooms.length) {
    let best = null;
    for (const a of inTree) {
      for (let b = 0; b < rooms.length; b++) {
        if (inTree.includes(b)) continue;
        const d = Math.abs(rooms[a].cx - rooms[b].cx) + Math.abs(rooms[a].cy - rooms[b].cy);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    inTree.push(best.b);
    edges.push([best.a, best.b]);
  }
  const extra = 1 + Math.floor(rng() * 2);
  for (let k = 0; k < extra && rooms.length > 3; k++) edges.push([Math.floor(rng() * rooms.length), Math.floor(rng() * rooms.length)]);
  for (const [a, b] of edges) if (a !== b) corridor(tiles, W, rooms[a], rooms[b], rng);

  // 起點在第一個房間；樓梯在距離最遠的房間中央。
  const startRoom = rooms[0];
  const start = { x: startRoom.cx + 0.5, y: startRoom.cy + 0.5 };
  const dist = distances(tiles, W, H, startRoom.cx, startRoom.cy);
  let far = rooms[1];
  for (const r of rooms) if (dist[r.cy * W + r.cx] > dist[far.cy * W + far.cx]) far = r;
  tiles[far.cy * W + far.cx] = STAIRS;
  const stairs = { x: far.cx + 0.5, y: far.cy + 0.5 };

  const used = new Set([far.cy * W + far.cx]);
  // 起點周圍 3 格內不放任何東西。
  for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) used.add((startRoom.cy + j) * W + startRoom.cx + i);
  const others = rooms.filter((r) => r !== startRoom);
  const types = AREAS[area].monsters.slice();
  // 每趟使用區域中的 3～4 種怪物。
  const keep = 3 + (rng() < 0.5 ? 1 : 0);
  while (types.length > keep) types.splice(Math.floor(rng() * types.length), 1);
  const count = 12 + Math.floor(rng() * 5) + floor * 2;
  const monsters = [];
  for (let k = 0; k < count; k++) {
    const p = spotIn(pick(others, rng), tiles, W, used, rng);
    if (p) monsters.push({ type: pick(types, rng), x: p.x, y: p.y, elite: false });
  }
  const elites = Math.floor(rng() * 3);
  for (let k = 0; k < elites && k < monsters.length; k++) monsters[Math.floor(rng() * monsters.length)].elite = true;
  const chests = [];
  const chestCount = 1 + Math.floor(rng() * 3);
  for (let k = 0; k < chestCount; k++) {
    const p = spotIn(pick(others, rng), tiles, W, used, rng);
    if (p) chests.push(p);
  }
  const traps = Math.floor(rng() * 5);
  for (let k = 0; k < traps; k++) {
    const p = spotIn(pick(others, rng), tiles, W, used, rng);
    if (p) tiles[Math.floor(p.y) * W + Math.floor(p.x)] = SPIKES;
  }
  return { w: W, h: H, tiles, rooms, start, stairs, monsters, chests, boss: null, portal: null };
}

/**
 * 驗證樓層：起點可到達樓梯與所有房間、所有可行走格彼此連通，怪物與寶箱在地板上且不在起點周圍 3 格內。
 * @param {object} f 樓層資料。
 * @returns {string[]} 不符合的項目，空陣列表示通過。
 */
export function validateFloor(f) {
  const problems = [];
  const sx = Math.floor(f.start.x);
  const sy = Math.floor(f.start.y);
  const dist = distances(f.tiles, f.w, f.h, sx, sy);
  if (f.stairs && dist[Math.floor(f.stairs.y) * f.w + Math.floor(f.stairs.x)] < 0) problems.push('樓梯無法到達');
  for (const r of f.rooms) if (dist[r.cy * f.w + r.cx] < 0) problems.push('有房間無法到達');
  for (let i = 0; i < f.tiles.length; i++) if (walkable(f.tiles[i]) && dist[i] < 0) {
    problems.push('有地板無法到達');
    break;
  }
  const near = (p) => Math.abs(p.x - f.start.x) <= 3.5 && Math.abs(p.y - f.start.y) <= 3.5;
  const onFloor = (p) => f.tiles[Math.floor(p.y) * f.w + Math.floor(p.x)] === FLOOR;
  for (const m of f.monsters) if (near(m) || !onFloor(m)) problems.push('怪物位置');
  for (const c of f.chests) if (near(c) || !onFloor(c)) problems.push('寶箱位置');
  if (!f.stairs && !f.boss) problems.push('沒有樓梯也沒有 Boss');
  return [...new Set(problems)];
}
