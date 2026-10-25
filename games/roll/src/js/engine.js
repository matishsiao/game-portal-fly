// 規則引擎（不含畫面）：回合制、格子化的物理。每次操作後依固定順序結算，結果完全可預測。
// 座標：x 由左至右、y 由上至下；索引 i = y * w + x。

/** 地形代碼。 */
export const T = { AIR: 0, WALL: 1, LADDER: 2, WATER: 3, GOAL: 4, CRUMBLE: 5, SPRING: 6 };

/** 物件代碼：木箱、石塊、冰塊、氣球。 */
export const O = { BOX: 'B', STONE: 'S', ICE: 'I', BALLOON: 'O' };

/** 操作代碼與方向。 */
export const MOVES = { L: [-1, 0], R: [1, 0], U: [0, -1], D: [0, 1] };

/** 彈簧把滾滾往上彈的格數。 */
export const SPRING_HEIGHT = 3;

/** 石塊壓碎易碎磚所需的最小掉落格數。 */
export const IMPACT_FALL = 2;

/** 關卡文字中的字元對應。 */
const CHAR_TERRAIN = { '#': T.WALL, '.': T.AIR, ' ': T.AIR, H: T.LADDER, '~': T.WATER, '*': T.GOAL, x: T.CRUMBLE, '^': T.SPRING };
const CHAR_OBJECT = { B: [O.BOX, T.AIR], S: [O.STONE, T.AIR], I: [O.ICE, T.AIR], o: [O.BALLOON, T.AIR], b: [O.BOX, T.WATER], i: [O.ICE, T.WATER] };

/**
 * 判斷地形是否為實心（不可進入、可支撐）。
 * @param {number} t 地形代碼。
 * @returns {boolean} 實心時為 true。
 */
function isSolid(t) {
  return t === T.WALL || t === T.CRUMBLE || t === T.SPRING;
}

/**
 * 判斷物件是否會浮在水上。
 * @param {string} type 物件代碼。
 * @returns {boolean} 木箱與冰塊為 true。
 */
function floats(type) {
  return type === O.BOX || type === O.ICE;
}

/**
 * 解析關卡文字為初始狀態。
 * @param {string[]} rows 盤面每一列的文字。
 * @returns {object} 狀態。
 * @throws {Error} 字元無法辨識、列寬不一致或角色數量不為 1 時。
 */
export function parseLevel(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const terrain = new Array(w * h).fill(T.AIR);
  const objects = [];
  let player = null;
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`第 ${y + 1} 列寬度不一致`);
    Array.from(row).forEach((ch, x) => {
      const i = y * w + x;
      if (ch === '@') {
        if (player) throw new Error('只能有一個角色');
        player = { x, y };
      } else if (CHAR_OBJECT[ch]) {
        const [type, base] = CHAR_OBJECT[ch];
        terrain[i] = base;
        objects.push({ type, x, y, fall: 0 });
      } else if (ch in CHAR_TERRAIN) {
        terrain[i] = CHAR_TERRAIN[ch];
      } else {
        throw new Error(`無法辨識的字元「${ch}」`);
      }
    });
  });
  if (!player) throw new Error('缺少角色 @');
  return { w, h, terrain, objects, player: { ...player, fall: 0 }, hover: false, dead: false, won: false };
}

/**
 * 複製狀態（物件與地形都複製，原狀態不受影響）。
 * @param {object} s 狀態。
 * @returns {object} 新狀態。
 */
export function cloneState(s) {
  return {
    w: s.w,
    h: s.h,
    terrain: s.terrain.slice(),
    objects: s.objects.map((o) => ({ ...o })),
    player: { ...s.player },
    hover: s.hover,
    dead: s.dead,
    won: s.won,
  };
}

/**
 * 產生狀態的唯一鍵（解題器去重用）；物件依位置排序，同類物件互換視為同一狀態。
 * @param {object} s 狀態。
 * @returns {string} 狀態鍵。
 */
export function stateKey(s) {
  const objs = s.objects.map((o) => `${o.type}${o.y * s.w + o.x}`).sort().join(',');
  let crumbles = '';
  for (let i = 0; i < s.terrain.length; i++) if (s.terrain[i] === T.CRUMBLE) crumbles += `${i},`;
  return `${s.player.y * s.w + s.player.x}${s.hover ? 'h' : ''}|${objs}|${crumbles}`;
}

/**
 * 取得某格的地形；超出盤面視為牆。
 * @param {object} s 狀態。
 * @param {number} x 橫座標。
 * @param {number} y 縱座標。
 * @returns {number} 地形代碼。
 */
export function terrainAt(s, x, y) {
  if (x < 0 || y < 0 || x >= s.w || y >= s.h) return T.WALL;
  return s.terrain[y * s.w + x];
}

/**
 * 取得某格上的物件。
 * @param {object} s 狀態。
 * @param {number} x 橫座標。
 * @param {number} y 縱座標。
 * @returns {object | undefined} 物件。
 */
export function objectAt(s, x, y) {
  return s.objects.find((o) => o.x === x && o.y === y);
}

/**
 * 判斷某格是否被角色或物件佔用。
 * @param {object} s 狀態。
 * @param {number} x 橫座標。
 * @param {number} y 縱座標。
 * @returns {boolean} 被佔用時為 true。
 */
function occupied(s, x, y) {
  return (s.player.x === x && s.player.y === y) || !!objectAt(s, x, y);
}

/**
 * 判斷物件能否進入某格（空的空氣、梯子、終點或水）。
 * @param {object} s 狀態。
 * @param {number} x 橫座標。
 * @param {number} y 縱座標。
 * @returns {boolean} 可進入時為 true。
 */
function objectCanEnter(s, x, y) {
  return !isSolid(terrainAt(s, x, y)) && !occupied(s, x, y);
}

/**
 * 判斷滾滾腳下是否有支撐（實心地形、梯子、角色或物件）。
 * @param {object} s 狀態。
 * @returns {boolean} 有支撐時為 true。
 */
function playerSupported(s) {
  const { x, y } = s.player;
  if (terrainAt(s, x, y) === T.LADDER) return true;
  const below = terrainAt(s, x, y + 1);
  return isSolid(below) || below === T.LADDER || !!objectAt(s, x, y + 1);
}

/**
 * 以水平方向推動物件：前方可進入時移動一格；冰塊持續滑行直到受阻或下方懸空。
 * @param {object} s 狀態（會被修改）。
 * @param {object} obj 被推的物件。
 * @param {number} dx 方向。
 * @returns {boolean} 推得動時為 true。
 */
function push(s, obj, dx) {
  if (!objectCanEnter(s, obj.x + dx, obj.y)) return false;
  obj.x += dx;
  if (obj.type === O.ICE) {
    for (;;) {
      if (terrainAt(s, obj.x, obj.y) === T.WATER) break;
      const belowFree = objectCanEnter(s, obj.x, obj.y + 1);
      if (belowFree || !objectCanEnter(s, obj.x + dx, obj.y)) break;
      obj.x += dx;
    }
  }
  return true;
}

/**
 * 執行一個時間步的重力與浮力：每個角色或物件最多移動一格。
 * @param {object} s 狀態（會被修改）。
 * @returns {boolean} 是否有任何移動。
 */
function tick(s) {
  let changed = false;

  // 氣球上飄，並帶動正上方連續堆疊的角色與物件。
  const balloons = s.objects.filter((o) => o.type === O.BALLOON).sort((a, b) => a.y - b.y);
  for (const b of balloons) {
    const stack = [b];
    let y = b.y - 1;
    for (;;) {
      const above = objectAt(s, b.x, y);
      if (above) stack.push(above);
      else if (s.player.x === b.x && s.player.y === y) stack.push(s.player);
      else break;
      y--;
    }
    // 石塊太重，氣球抬不動：堆疊中有石塊時氣球不會上升。
    if (stack.some((e) => e.type === O.STONE)) continue;
    if (!isSolid(terrainAt(s, b.x, y)) && y >= 0) {
      for (const e of stack) e.y--;
      changed = true;
      if (stack.includes(s.player) && terrainAt(s, s.player.x, s.player.y) === T.WATER) s.dead = true;
    }
  }

  // 浮在水中的木箱、冰塊往上浮到水面。
  for (const o of s.objects.filter((ob) => floats(ob.type)).sort((a, b) => a.y - b.y)) {
    if (terrainAt(s, o.x, o.y) === T.WATER && terrainAt(s, o.x, o.y - 1) === T.WATER && !occupied(s, o.x, o.y - 1)) {
      o.y--;
      changed = true;
    }
  }

  // 由下往上處理掉落。
  const fallers = [...s.objects.filter((o) => o.type !== O.BALLOON)];
  if (!s.hover && !s.dead) fallers.push(s.player);
  fallers.sort((a, b) => b.y - a.y || a.x - b.x);
  for (const e of fallers) {
    const isPlayer = e === s.player;
    if (isPlayer) {
      if (playerSupported(s)) {
        e.fall = 0;
        continue;
      }
      if (objectAt(s, e.x, e.y + 1) || e.y + 1 >= s.h) continue;
      e.y++;
      e.fall++;
      changed = true;
      if (terrainAt(s, e.x, e.y) === T.WATER) s.dead = true;
      continue;
    }
    // 漂浮的物件停在水中，不會繼續下沉。
    if (floats(e.type) && terrainAt(s, e.x, e.y) === T.WATER) {
      e.fall = 0;
      continue;
    }
    if (objectCanEnter(s, e.x, e.y + 1)) {
      e.y++;
      e.fall++;
      changed = true;
      continue;
    }
    // 落地：石塊從足夠高度落在易碎磚上時壓碎它，之後繼續掉落。
    if (e.type === O.STONE && e.fall >= IMPACT_FALL && terrainAt(s, e.x, e.y + 1) === T.CRUMBLE) {
      s.terrain[(e.y + 1) * s.w + e.x] = T.AIR;
      changed = true;
      continue;
    }
    e.fall = 0;
  }
  return changed;
}

/**
 * 結算盤面直到靜止，並處理彈簧、過關與失敗。
 * @param {object} s 狀態（會被修改）。
 * @param {object[]} [frames] 提供時，每個時間步後推入狀態快照（動畫用）。
 */
export function settle(s, frames) {
  for (let guard = 0; guard < 500; guard++) {
    if (tick(s)) {
      if (frames) frames.push(cloneState(s));
      continue;
    }
    // 靜止後：停在彈簧上的滾滾被往上彈並懸停。
    const p = s.player;
    if (!s.dead && !s.hover && terrainAt(s, p.x, p.y + 1) === T.SPRING) {
      let rise = 0;
      while (rise < SPRING_HEIGHT) {
        const t = terrainAt(s, p.x, p.y - 1);
        if (isSolid(t) || t === T.WATER || occupied(s, p.x, p.y - 1) || p.y - 1 < 0) break;
        p.y--;
        rise++;
        if (frames) frames.push(cloneState(s));
      }
      if (rise > 0) s.hover = true;
    }
    break;
  }
  if (!s.dead && terrainAt(s, s.player.x, s.player.y) === T.GOAL) s.won = true;
}

/**
 * 執行一步操作。
 * @param {object} state 目前狀態（不會被修改）。
 * @param {'L' | 'R' | 'U' | 'D'} move 操作。
 * @param {object[]} [frames] 提供時，推入每個動畫影格（含操作本身與之後的結算）。
 * @returns {{ok: boolean, state: object, reason?: string}} 操作是否有效、新狀態與無效原因。
 */
export function applyMove(state, move, frames) {
  if (state.dead || state.won) return { ok: false, state, reason: state.won ? '已過關' : '滾滾掉進水裡了' };
  const s = cloneState(state);
  const p = s.player;
  const [dx, dy] = MOVES[move];
  const tx = p.x + dx;
  const ty = p.y + dy;
  const target = terrainAt(s, tx, ty);

  if (dy === 0) {
    if (isSolid(target)) return { ok: false, state, reason: '前面被擋住了' };
    if (target === T.WATER && !objectAt(s, tx, ty)) return { ok: false, state, reason: '滾滾不會游泳' };
    const obj = objectAt(s, tx, ty);
    if (obj) {
      if (target === T.WATER) return { ok: false, state, reason: '不能推水上的東西' };
      if (!push(s, obj, dx)) return { ok: false, state, reason: '推不動' };
    }
    p.x = tx;
    s.hover = false;
  } else if (dy < 0) {
    if (s.hover) return { ok: false, state, reason: '已經在最高點了' };
    if (terrainAt(s, p.x, p.y) !== T.LADDER) return { ok: false, state, reason: '要在梯子上才能往上爬' };
    if (isSolid(target) || target === T.WATER || occupied(s, tx, ty)) return { ok: false, state, reason: '上面被擋住了' };
    p.y = ty;
  } else if (s.hover) {
    s.hover = false;
  } else {
    if (target !== T.LADDER || occupied(s, tx, ty)) return { ok: false, state, reason: '下面不能走' };
    p.y = ty;
  }
  if (frames) frames.push(cloneState(s));
  settle(s, frames);
  return { ok: true, state: s };
}

/**
 * 建立關卡的初始狀態：解析後先結算一次，讓懸空的物件就定位。
 * @param {string[]} rows 盤面文字。
 * @returns {object} 已靜止的初始狀態。
 */
export function initialState(rows) {
  const s = parseLevel(rows);
  settle(s);
  return s;
}
