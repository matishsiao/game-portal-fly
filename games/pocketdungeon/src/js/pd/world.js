// 戰鬥模擬（純邏輯，不碰畫面）：一趟探險中的玩家、怪物、Boss、投射物、預警、陷阱、掉落與樓層切換。
// 以固定時間步呼叫 update(dt, input) 推進；畫面層只讀取狀態繪製，並處理 events 佇列中的事件。
//
// 座標單位為「格」，(x, y) 為實體中心；地圖格子 (i, j) 的範圍為 [i, i + 1) × [j, j + 1)。

import { CLASSES, MONSTERS, BOSSES, LIMITS, BOSS_HEAL, EVOLVE } from './data.js';
import { generateFloor, walkable, STAIRS, SPIKES, WALL } from './dungeon.js';
import {
  characterStats, speedProfile, damage, dungeonLevel, monsterStats, killReward, rollRarity, rarityWeights, makeItem, gainXp, sellPrice,
} from './rules.js';
import { equippedSkills } from './skills.js';
import { bagLimit } from './village.js';

/** 玩家半徑（格）。 */
const PLAYER_R = 0.34;
/** 怪物發現玩家的距離（格）。 */
const AGGRO = 6.5;
/** 斜走補償：45° 斜走時額外的速度比例。 */
const DIAGONAL_BOOST = 0.33;
/** 地刺循環（秒）：前 1 秒升起。 */
const SPIKE_CYCLE = 2.5;
/** 同時存在的怪物、投射物與效果上限（效能）。 */
const MAX_ENTITIES = 120;

/**
 * 計算兩點距離。
 * @param {number} ax 起點 x。
 * @param {number} ay 起點 y。
 * @param {number} bx 終點 x。
 * @param {number} by 終點 y。
 * @returns {number} 距離。
 */
function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/**
 * 計算角度差的絕對值（0～π）。
 * @param {number} a 角度（弧度）。
 * @param {number} b 角度（弧度）。
 * @returns {number} 角度差。
 */
function angleDiff(a, b) {
  let d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/**
 * 計算點到線段的距離。
 * @param {number} px 點 x。
 * @param {number} py 點 y。
 * @param {number} x1 線段起點 x。
 * @param {number} y1 線段起點 y。
 * @param {number} x2 線段終點 x。
 * @param {number} y2 線段終點 y。
 * @returns {number} 距離。
 */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return dist(px, py, x1 + t * dx, y1 + t * dy);
}

/** 一趟探險的模擬狀態。 */
export class World {
  /**
   * 建立探險。
   * @param {object} character 角色資料（會被修改：經驗、等級、金幣、背包）。
   * @param {{area: string, depth: number, seed: number, floor?: number, potions?: number, scroll?: number}} run 探險設定。
   * @param {() => number} [rng=Math.random] 戰鬥用亂數。
   */
  constructor(character, run, rng = Math.random) {
    this.ch = character;
    this.rng = rng;
    this.area = run.area;
    this.depth = run.depth;
    this.seed = run.seed;
    this.floorIndex = run.floor || 0;
    this.restoring = !!run.restoring;
    this.elapsed = 0;
    this.time = 0;
    this.events = [];
    this.loot = { gold: 0, xp: 0, items: [], kills: 0, damageTaken: 0, potionsUsed: 0, levelsGained: 0, maxHit: 0 };
    this.player = this.makePlayer(run.potions ?? 3, run.scroll ?? 1);
    /** 帶進地城的 2 個技能（依角色在村莊的設定，探險中不變）。 */
    this.skills = character.skills ? equippedSkills(character) : [null, null];
    this.loadFloor(this.floorIndex);
  }

  /**
   * 依角色資料建立玩家實體（屬性含裝備）。
   * @param {number} potions 攜帶的藥水數。
   * @param {number} scroll 回城卷軸數。
   * @returns {object} 玩家。
   */
  makePlayer(potions, scroll) {
    const p = {
      x: 0, y: 0, r: PLAYER_R, facing: { x: 0, y: 1 }, moving: false,
      atkCd: 0, dodgeCd: 0, dodgeT: 0, dodgeDir: { x: 0, y: 1 }, dodgeSpeed: 12, dashHit: null, invuln: 0, potionCd: 0, hurt: 0, attackAnim: 0,
      skillCd: [0, 0], buffT: 0, buffPct: 0, skillAnim: 0,
      potions: Math.min(LIMITS.potions, potions), scroll, path: [],
    };
    this.applyStats(p, true);
    return p;
  }

  /**
   * 依角色目前等級與裝備更新玩家屬性。
   * @param {object} p 玩家（會被修改）。
   * @param {boolean} heal 是否補滿 HP。
   */
  applyStats(p, heal) {
    const s = characterStats(this.ch.cls, this.ch.level, Object.values(this.ch.equipped), this.ch.rebirth || 0);
    const ratio = p.maxHp ? p.hp / p.maxHp : 1;
    p.maxHp = s.hp;
    p.atk = s.atk;
    p.def = s.def;
    p.spd = s.spd;
    p.goldPct = s.goldPct;
    p.xpPct = s.xpPct;
    const prof = speedProfile(s.spd);
    p.move = prof.move;
    p.interval = prof.interval;
    p.hp = heal ? s.hp : Math.max(1, Math.round(s.hp * ratio));
  }

  /**
   * 載入樓層：產生地圖並放置怪物、寶箱與玩家。
   * @param {number} index 樓層（0 起算，等於 FLOORS 時為 Boss 層）。
   */
  loadFloor(index) {
    this.floorIndex = index;
    this.floor = generateFloor({ seed: this.seed + index * 1009, area: this.area, depth: this.depth, floor: index });
    this.level = dungeonLevel(this.area, this.depth, index);
    const f = this.floor;
    this.explored = new Uint8Array(f.w * f.h);
    this.monsters = [];
    this.projectiles = [];
    this.telegraphs = [];
    this.strikes = [];
    this.hazards = [];
    this.pickups = [];
    this.effects = [];
    this.chests = f.chests.map((c) => ({ x: c.x, y: c.y, opened: false }));
    this.portalOpen = false;
    this.bossDefeated = false;
    this.nextId = 1;
    for (const m of f.monsters) this.spawnMonster(m.type, m.x, m.y, { elite: m.elite });
    if (f.boss) this.spawnMonster(f.boss.type, f.boss.x, f.boss.y, { boss: true, abyss: this.area === 'expert', evolved: this.rollEvolution() });
    this.player.x = f.start.x;
    this.player.y = f.start.y;
    this.player.path = [];
    this.flowAt = -1;
    // Boss 層是單一大房間，一進入就全部揭開。
    if (f.boss) this.explored.fill(1);
    this.reveal();
  }

  /**
   * 這一關（區域＋深度）的代碼，用來記錄角色的破關次數與 Boss 是否已進化。
   * @returns {string} 例如「easy-2」。
   */
  stageKey() {
    return `${this.area}-${this.depth}`;
  }

  /**
   * 進入 Boss 層時決定 Boss 是否為進化版：這個角色在這一關已進化過就一定是；
   * 否則破關滿 5 次後有 30% 機會進化，進化後永久記錄在角色上。
   * @returns {boolean} 是否為進化 Boss。
   */
  rollEvolution() {
    const ch = this.ch;
    const key = this.stageKey();
    ch.evolved = ch.evolved || {};
    if (ch.evolved[key]) return true;
    // 讀檔還原時 Boss 由快照放回，不重新擲骰。
    if (this.restoring) return false;
    const clears = (ch.clears && ch.clears[key]) || 0;
    if (clears < EVOLVE.clears || this.rng() >= EVOLVE.chance) return false;
    ch.evolved[key] = true;
    this.events.push({ type: 'boss-evolved' });
    return true;
  }

  /**
   * 產生一隻怪物或 Boss。
   * @param {string} type 怪物或 Boss 代碼。
   * @param {number} x 座標 x。
   * @param {number} y 座標 y。
   * @param {{elite?: boolean, boss?: boolean, abyss?: boolean, evolved?: boolean, small?: boolean}} [opts] 菁英、Boss、深淵強化版、進化 Boss、分裂後的小史萊姆。
   * @returns {object} 怪物。
   */
  spawnMonster(type, x, y, opts = {}) {
    const base = opts.boss ? BOSSES[type] : MONSTERS[type];
    const s = monsterStats(type, this.level, this.depth, opts);
    const scale = opts.small ? 0.4 : 1;
    const m = {
      id: this.nextId++, type, x, y, boss: !!opts.boss, elite: !!opts.elite, small: !!opts.small, abyss: !!opts.abyss,
      name: (opts.elite ? '菁英' : '') + (opts.evolved ? '進化・' : '') + base.name,
      r: base.r * (opts.elite ? 1.25 : 1) * (opts.small ? 0.7 : 1) * (opts.evolved ? EVOLVE.scale : 1), evolved: !!opts.evolved,
      hp: Math.max(1, Math.round(s.hp * scale)), maxHp: Math.max(1, Math.round(s.hp * scale)), atk: s.atk, def: s.def,
      speed: base.speed, ai: opts.boss ? base.kind : base.ai, xpMult: (opts.boss ? 20 : opts.elite ? 3 : 1) * (base.xp || 1) * scale,
      state: 'idle', t: 0, cd: 1 + this.rng(), aggro: !!opts.boss, hurt: 0, facing: 0, invisible: false, intangible: false,
      vx: 0, vy: 0, phase2: false, pattern: 0, split: !!opts.small, summoned: false,
    };
    this.monsters.push(m);
    return m;
  }

  // ---------- 地圖與移動 ----------

  /**
   * 取得格子代碼（地圖外視為牆）。
   * @param {number} i 格子 x。
   * @param {number} j 格子 y。
   * @returns {number} 格子代碼。
   */
  tileAt(i, j) {
    const f = this.floor;
    if (i < 0 || j < 0 || i >= f.w || j >= f.h) return WALL;
    return f.tiles[j * f.w + i];
  }

  /**
   * 判斷圓形是否碰到牆。
   * @param {number} x 圓心 x。
   * @param {number} y 圓心 y。
   * @param {number} r 半徑。
   * @returns {boolean} 碰到牆時為 true。
   */
  hitsWall(x, y, r) {
    for (let j = Math.floor(y - r); j <= Math.floor(y + r); j++) {
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) {
        if (walkable(this.tileAt(i, j))) continue;
        const cx = Math.max(i, Math.min(x, i + 1));
        const cy = Math.max(j, Math.min(y, j + 1));
        if ((cx - x) ** 2 + (cy - y) ** 2 < r * r) return true;
      }
    }
    return false;
  }

  /**
   * 移動實體並沿牆滑動（先 x 後 y）。
   * @param {{x: number, y: number, r: number}} e 實體（會被修改）。
   * @param {number} dx x 位移。
   * @param {number} dy y 位移。
   * @param {boolean} [ghost=false] 是否可穿牆（仍不能離開地圖）。
   * @returns {boolean} 是否有一個方向被牆擋住。
   */
  moveEntity(e, dx, dy, ghost = false) {
    let blocked = false;
    const f = this.floor;
    const nx = e.x + dx;
    if (ghost ? nx > 1 && nx < f.w - 1 : !this.hitsWall(nx, e.y, e.r)) e.x = nx;
    else blocked = true;
    const ny = e.y + dy;
    if (ghost ? ny > 1 && ny < f.h - 1 : !this.hitsWall(e.x, ny, e.r)) e.y = ny;
    else blocked = true;
    return blocked;
  }

  /**
   * 玩家移動：斜走被牆擋住一個方向時，速度全部轉給另一個方向（貼牆滑行不變慢）；
   * 直走被牆角卡住時，若稍微偏移就能通過，自動往那一側微調（轉角修正）。
   * @param {{x: number, y: number, r: number}} e 實體（會被修改）。
   * @param {number} dx x 位移。
   * @param {number} dy y 位移。
   */
  slideMove(e, dx, dy) {
    const want = Math.hypot(dx, dy);
    if (!want) return;
    const x0 = e.x;
    const y0 = e.y;
    this.moveEntity(e, dx, dy);
    const blockedX = dx !== 0 && Math.abs(e.x - x0) < Math.abs(dx) * 0.5;
    const blockedY = dy !== 0 && Math.abs(e.y - y0) < Math.abs(dy) * 0.5;
    if (blockedX && !blockedY && dy) {
      this.moveEntity(e, 0, Math.sign(dy) * want - (e.y - y0));
      return;
    }
    if (blockedY && !blockedX && dx) {
      this.moveEntity(e, Math.sign(dx) * want - (e.x - x0), 0);
      return;
    }
    // 轉角修正：只朝一個方向走卻被擋住時，找最近的可通過偏移量。
    const alongX = blockedX && Math.abs(dy) < want * 0.2;
    const alongY = blockedY && Math.abs(dx) < want * 0.2;
    if (!alongX && !alongY) return;
    for (const off of [0.1, 0.2, 0.3, 0.4]) {
      for (const sgn of [-1, 1]) {
        const ox = alongY ? sgn * off : 0;
        const oy = alongX ? sgn * off : 0;
        if (this.hitsWall(e.x + ox, e.y + oy, e.r)) continue;
        if (this.hitsWall(e.x + ox + (alongX ? dx : 0), e.y + oy + (alongY ? dy : 0), e.r)) continue;
        this.moveEntity(e, Math.sign(ox) * Math.min(want, off), Math.sign(oy) * Math.min(want, off));
        return;
      }
    }
  }

  /**
   * 判斷兩點之間是否沒有牆阻擋（每 0.25 格取樣）。
   * @param {number} x1 起點 x。
   * @param {number} y1 起點 y。
   * @param {number} x2 終點 x。
   * @param {number} y2 終點 y。
   * @returns {boolean} 視線暢通時為 true。
   */
  lineOfSight(x1, y1, x2, y2) {
    const d = dist(x1, y1, x2, y2);
    const steps = Math.ceil(d / 0.25);
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      if (!walkable(this.tileAt(Math.floor(x1 + (x2 - x1) * t), Math.floor(y1 + (y2 - y1) * t)))) return false;
    }
    return true;
  }

  /** 每 0.25 秒以玩家為起點計算流場（到玩家的步數），怪物據此繞過牆追擊。 */
  updateFlow() {
    if (this.time - this.flowAt < 0.25) return;
    this.flowAt = this.time;
    const f = this.floor;
    const field = this.flow && this.flow.length === f.w * f.h ? this.flow : new Int16Array(f.w * f.h);
    field.fill(-1);
    const start = Math.floor(this.player.y) * f.w + Math.floor(this.player.x);
    const queue = [start];
    field[start] = 0;
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      if (field[i] > 24) continue;
      const x = i % f.w;
      const y = (i - x) / f.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (y + dy) * f.w + x + dx;
        if (field[j] < 0 && walkable(f.tiles[j])) {
          field[j] = field[i] + 1;
          queue.push(j);
        }
      }
    }
    this.flow = field;
  }

  /**
   * 依流場取得朝玩家前進的方向（視線暢通且接近時直接朝玩家）。
   * @param {object} m 怪物。
   * @returns {{x: number, y: number}} 單位方向，無法到達時為 (0, 0)。
   */
  chaseDir(m) {
    const p = this.player;
    const d = dist(m.x, m.y, p.x, p.y) || 1;
    if (d < 3 && this.lineOfSight(m.x, m.y, p.x, p.y)) return { x: (p.x - m.x) / d, y: (p.y - m.y) / d };
    const f = this.floor;
    const i = Math.floor(m.x);
    const j = Math.floor(m.y);
    const here = this.flow[j * f.w + i];
    let best = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const v = this.flow[(j + dy) * f.w + i + dx];
      if (v >= 0 && (here < 0 || v < here) && (!best || v < best.v)) best = { v, x: i + dx + 0.5, y: j + dy + 0.5 };
    }
    if (!best) return { x: (p.x - m.x) / d, y: (p.y - m.y) / d };
    const tx = best.x - m.x;
    const ty = best.y - m.y;
    const l = Math.hypot(tx, ty) || 1;
    return { x: tx / l, y: ty / l };
  }

  /** 揭開玩家周圍 5 格的戰爭迷霧。 */
  reveal() {
    const f = this.floor;
    const px = this.player.x;
    const py = this.player.y;
    for (let j = Math.floor(py - 5); j <= py + 5; j++) {
      for (let i = Math.floor(px - 5); i <= px + 5; i++) {
        if (i < 0 || j < 0 || i >= f.w || j >= f.h) continue;
        if ((i + 0.5 - px) ** 2 + (j + 0.5 - py) ** 2 <= 30) this.explored[j * f.w + i] = 1;
      }
    }
  }

  /**
   * 設定點地移動的目的地：以廣度優先搜尋找出路徑。
   * @param {number} x 目的地 x。
   * @param {number} y 目的地 y。
   * @returns {boolean} 找得到路徑時為 true。
   */
  setMoveTarget(x, y) {
    const f = this.floor;
    const ti = Math.floor(x);
    const tj = Math.floor(y);
    if (!walkable(this.tileAt(ti, tj))) return false;
    const start = Math.floor(this.player.y) * f.w + Math.floor(this.player.x);
    const goal = tj * f.w + ti;
    const prev = new Int32Array(f.w * f.h).fill(-1);
    prev[start] = start;
    const queue = [start];
    for (let q = 0; q < queue.length && prev[goal] < 0; q++) {
      const i = queue[q];
      const cx = i % f.w;
      const cy = (i - cx) / f.w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = (cy + dy) * f.w + cx + dx;
        if (prev[j] < 0 && walkable(f.tiles[j])) {
          prev[j] = i;
          queue.push(j);
        }
      }
    }
    if (prev[goal] < 0) return false;
    const path = [];
    for (let i = goal; i !== start; i = prev[i]) path.push({ x: (i % f.w) + 0.5, y: Math.floor(i / f.w) + 0.5 });
    path.reverse();
    if (path.length) path[path.length - 1] = { x, y };
    this.player.path = path;
    return true;
  }

  // ---------- 主迴圈 ----------

  /**
   * 推進一個時間步。
   * @param {number} dt 秒（固定時間步 1/60）。
   * @param {{mx: number, my: number, attack: boolean, dodge: boolean, potion: boolean, skill1?: boolean, skill2?: boolean}} input 輸入：移動向量（長度 ≤ 1）、攻擊按住、閃避、藥水與技能按下。
   */
  update(dt, input) {
    this.time += dt;
    this.elapsed += dt;
    this.updateFlow();
    this.updatePlayer(dt, input);
    for (const m of this.monsters.slice()) this.updateMonster(m, dt);
    this.separate();
    this.updateProjectiles(dt);
    this.updateTelegraphs(dt);
    this.updateStrikes(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    this.updateEffects(dt);
    this.checkTiles();
    this.reveal();
  }

  /**
   * 更新玩家：移動、閃避、技能、攻擊、藥水與冷卻。
   * @param {number} dt 秒。
   * @param {object} input 輸入。
   */
  updatePlayer(dt, input) {
    const p = this.player;
    if (p.hp <= 0) return;
    p.atkCd -= dt;
    p.dodgeCd -= dt;
    p.potionCd -= dt;
    p.invuln -= dt;
    p.hurt -= dt;
    p.attackAnim -= dt;
    p.skillAnim -= dt;
    p.buffT -= dt;
    p.skillCd[0] -= dt;
    p.skillCd[1] -= dt;
    let mx = input.mx || 0;
    let my = input.my || 0;
    if (mx || my) p.path = [];
    else if (p.path.length) {
      const wp = p.path[0];
      const d = dist(p.x, p.y, wp.x, wp.y);
      if (d < 0.15) p.path.shift();
      else {
        mx = (wp.x - p.x) / d;
        my = (wp.y - p.y) / d;
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    p.moving = len > 0.05;
    if (p.moving) p.facing = { x: mx / (len || 1), y: my / (len || 1) };
    // 斜走補償：方格地圖上斜走時水平、垂直各只剩 70%，看起來像變慢；
    // 依偏離軸線的程度加速，45° 時總速度 ×1.33（各軸約為直走的 94%）。
    const diag = Math.abs(Math.sin(2 * Math.atan2(my, mx)));
    const boost = 1 + DIAGONAL_BOOST * diag;
    if (input.dodge && p.dodgeCd <= 0) {
      p.dodgeT = 0.25;
      p.dodgeSpeed = 12;
      p.dashHit = null;
      p.dodgeDir = { ...p.facing };
      p.invuln = Math.max(p.invuln, 0.3);
      p.dodgeCd = 1.2;
      this.effect('dust', p.x, p.y);
    }
    if (p.dodgeT > 0) {
      // 翻滾 0.25 秒、每秒 12 格，共 3 格；最後一步只走剩餘的時間，避免多走。衝鋒與後跳也使用同一套位移。
      const step = Math.min(dt, p.dodgeT);
      p.dodgeT -= dt;
      this.moveEntity(p, p.dodgeDir.x * p.dodgeSpeed * step, p.dodgeDir.y * p.dodgeSpeed * step);
      if (p.dashHit) {
        for (const m of this.monsters.slice()) {
          if (m.intangible || p.dashHit.ids.has(m.id) || dist(p.x, p.y, m.x, m.y) > m.r + 0.8) continue;
          p.dashHit.ids.add(m.id);
          this.hitMonster(m, damage(this.effAtk(), m.def, p.dashHit.mult, this.rng()), p.dodgeDir);
        }
      }
    } else if (p.moving) {
      this.slideMove(p, mx * p.move * boost * dt, my * p.move * boost * dt);
    }
    if (input.potion && p.potions > 0 && p.potionCd <= 0 && p.hp < p.maxHp) {
      p.potions--;
      p.potionCd = 3;
      const heal = Math.round(p.maxHp * 0.4);
      p.hp = Math.min(p.maxHp, p.hp + heal);
      this.loot.potionsUsed++;
      this.effect('text', p.x, p.y - 0.6, { text: `+${heal}`, color: '#5fd068' });
    }
    if (input.skill1) this.useSkill(0);
    if (input.skill2) this.useSkill(1);
    if (input.attack && p.atkCd <= 0 && p.dodgeT <= 0) this.playerAttack();
  }

  /**
   * 玩家目前的攻擊力（含戰吼加成）。
   * @returns {number} 攻擊力。
   */
  effAtk() {
    const p = this.player;
    return p.atk * (1 + (p.buffT > 0 ? p.buffPct : 0));
  }

  /**
   * 玩家目前的防禦力（含戰吼加成）。
   * @returns {number} 防禦力。
   */
  effDef() {
    const p = this.player;
    return p.def * (1 + (p.buffT > 0 ? p.buffPct : 0));
  }

  /**
   * 瞄準輔助：找出射程內、視線暢通的最近怪物，並讓玩家轉向它。
   * @param {number} reach 射程（格）。
   * @returns {object | null} 目標怪物。
   */
  aim(reach) {
    const p = this.player;
    let best = null;
    for (const m of this.monsters) {
      if (m.intangible) continue;
      const d = dist(p.x, p.y, m.x, m.y) - m.r;
      if (d < reach && (!best || d < best.d) && this.lineOfSight(p.x, p.y, m.x, m.y)) best = { m, d };
    }
    if (!best) return null;
    if (this.aimAssist !== false) {
      const d = dist(p.x, p.y, best.m.x, best.m.y) || 1;
      p.facing = { x: (best.m.x - p.x) / d, y: (best.m.y - p.y) / d };
    }
    return best.m;
  }

  /**
   * 玩家普通攻擊：瞄準輔助轉向最近的怪物後，依職業出招。
   */
  playerAttack() {
    const p = this.player;
    const atk = CLASSES[this.ch.cls].attack;
    p.atkCd = p.interval;
    p.attackAnim = 0.18;
    this.aim(atk.kind === 'arc' ? 2.6 : 7);
    const ang = Math.atan2(p.facing.y, p.facing.x);
    if (atk.kind === 'arc') {
      this.effect('slash', p.x, p.y, { angle: ang, range: atk.range, arc: (atk.angle * Math.PI) / 180 });
      for (const m of this.monsters.slice()) {
        if (m.intangible) continue;
        const d = dist(p.x, p.y, m.x, m.y);
        if (d <= atk.range + m.r && (d < m.r + p.r || angleDiff(Math.atan2(m.y - p.y, m.x - p.x), ang) <= ((atk.angle / 2) * Math.PI) / 180)) {
          this.hitMonster(m, damage(this.effAtk(), m.def, atk.mult, this.rng()), p.facing);
        }
      }
    } else {
      this.effect('cast', p.x + p.facing.x * 0.5, p.y + p.facing.y * 0.5 - 0.2, { angle: ang, look: atk.kind });
      this.playerShot(Math.atan2(p.facing.y, p.facing.x), atk.kind, atk.mult, { explode: atk.kind === 'orb' ? atk.radius : 0, range: atk.range, speed: atk.speed });
    }
  }

  /**
   * 發射玩家的投射物（箭或法球）。
   * @param {number} angle 方向（弧度）。
   * @param {string} kind 'arrow' 或 'orb'。
   * @param {number} mult 傷害倍率。
   * @param {{explode?: number, range?: number, speed?: number, pierce?: boolean}} [opts] 爆炸半徑、射程、速度、是否貫穿。
   */
  playerShot(angle, kind, mult, opts = {}) {
    const p = this.player;
    const speed = opts.speed || 12;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.projectiles.push({
      x: p.x + c * 0.4, y: p.y + s * 0.4, vx: c * speed, vy: s * speed,
      r: kind === 'orb' ? 0.22 : 0.12, team: 'p', life: (opts.range || 7) / speed, kind,
      mult, explode: opts.explode || 0, pierce: !!opts.pierce, hit: new Set(),
    });
  }

  // ---------- 技能 ----------

  /**
   * 使用技能（冷卻中、翻滾中或倒下時無效）。
   * @param {number} index 技能欄位（0 或 1）。
   * @returns {boolean} 是否成功施放。
   */
  useSkill(index) {
    const p = this.player;
    const sk = this.skills[index];
    if (!sk || p.skillCd[index] > 0 || p.dodgeT > 0 || p.hp <= 0) return false;
    p.skillCd[index] = sk.cd;
    p.skillAnim = 0.25;
    const target = this.aim(sk.kind === 'spin' || sk.kind === 'slam' || sk.kind === 'nova' ? 3 : 8);
    const ang = Math.atan2(p.facing.y, p.facing.x);
    const ahead = (d) => ({ x: p.x + p.facing.x * d, y: p.y + p.facing.y * d });
    switch (sk.kind) {
      case 'spin':
      case 'slam':
      case 'nova':
        this.strike({ x: p.x, y: p.y, r: sk.r, mult: sk.mult, stun: sk.stun || 0, slow: sk.slow || 0, look: sk.kind });
        break;
      case 'charge':
        p.dodgeT = 0.3;
        p.dodgeSpeed = sk.dist / 0.3;
        p.dodgeDir = { ...p.facing };
        p.invuln = Math.max(p.invuln, 0.35);
        p.dashHit = { mult: sk.mult, ids: new Set() };
        this.effect('dust', p.x, p.y);
        break;
      case 'buff':
        p.buffT = sk.dur;
        p.buffPct = sk.pct;
        this.effect('levelup', p.x, p.y, { text: '戰吼！' });
        break;
      case 'fan':
        for (let k = 0; k < sk.count; k++) this.playerShot(ang + ((k - (sk.count - 1) / 2) * 10 * Math.PI) / 180, 'arrow', sk.mult, { range: 7 });
        break;
      case 'leap':
        this.playerShot(ang, 'arrow', sk.mult, { range: 9, speed: 14, pierce: true });
        p.dodgeT = 0.3;
        p.dodgeSpeed = sk.dist / 0.3;
        p.dodgeDir = { x: -p.facing.x, y: -p.facing.y };
        p.dashHit = null;
        p.invuln = Math.max(p.invuln, 0.35);
        this.effect('dust', p.x, p.y);
        break;
      case 'rain': {
        const at = target || ahead(4);
        this.strike({ x: at.x, y: at.y, r: sk.r, mult: sk.mult, ticks: sk.ticks, interval: 0.33, delay: 0.3, look: 'rain' });
        break;
      }
      case 'snipe':
        this.strike({ shape: 'line', x: p.x, y: p.y, angle: ang, len: sk.len, width: 0.7, mult: sk.mult, delay: 0.4, look: 'beam' });
        break;
      case 'blink': {
        const from = { x: p.x, y: p.y };
        for (let d = 0.1; d <= sk.dist; d += 0.1) {
          const nx = from.x + p.facing.x * d;
          const ny = from.y + p.facing.y * d;
          if (this.hitsWall(nx, ny, p.r)) break;
          p.x = nx;
          p.y = ny;
        }
        p.path = [];
        p.invuln = Math.max(p.invuln, 0.3);
        this.effect('poof', from.x, from.y, { r: 0.4, color: '#c8a8ff' });
        this.effect('poof', p.x, p.y, { r: 0.4, color: '#c8a8ff' });
        break;
      }
      case 'chain': {
        const hit = new Set();
        const points = [{ x: p.x, y: p.y }];
        let cur = target;
        for (let k = 0; cur && k <= sk.jumps; k++) {
          hit.add(cur);
          points.push({ x: cur.x, y: cur.y });
          this.hitMonster(cur, damage(this.effAtk(), cur.def, sk.mult, this.rng()));
          const from = cur;
          let next = null;
          for (const m of this.monsters) {
            if (hit.has(m) || m.intangible) continue;
            const d = dist(from.x, from.y, m.x, m.y);
            if (d < 3.5 && (!next || d < next.d)) next = { m, d };
          }
          cur = next && next.m;
        }
        if (points.length === 1) points.push(ahead(3));
        this.effect('bolt', p.x, p.y, { points });
        break;
      }
      case 'meteor': {
        const at = target || ahead(4);
        this.strike({ x: at.x, y: at.y, r: sk.r, mult: sk.mult, delay: 0.8, look: 'meteor' });
        break;
      }
      default:
        break;
    }
    this.events.push({ type: 'skill', kind: sk.kind, name: sk.name });
    return true;
  }

  /**
   * 建立玩家的範圍打擊：延遲後對範圍內的怪物造成傷害，可多次打擊並附加暈眩或緩速。
   * @param {{shape?: 'circle' | 'line', x: number, y: number, r?: number, angle?: number, len?: number, width?: number, mult: number, delay?: number, ticks?: number, interval?: number, stun?: number, slow?: number, look: string}} st 打擊。
   */
  strike(st) {
    this.strikes.push({ shape: 'circle', delay: 0, ticks: 1, interval: 0, ...st, total: st.delay || 0 });
  }

  /**
   * 更新玩家的範圍打擊。
   * @param {number} dt 秒。
   */
  updateStrikes(dt) {
    for (const st of this.strikes.slice()) {
      st.delay -= dt;
      if (st.delay > 0) continue;
      this.effect('blast', st.x, st.y, { shape: st.shape, r: st.r, angle: st.angle, len: st.len, width: st.width, friendly: true, look: st.look });
      for (const m of this.monsters.slice()) {
        if (m.intangible || !this.inShape(st, m.x, m.y, m.r)) continue;
        this.hitMonster(m, damage(this.effAtk(), m.def, st.mult, this.rng()));
        if (st.stun) m.stun = Math.max(m.stun || 0, st.stun * (m.boss ? 0.3 : 1));
        if (st.slow) m.slow = Math.max(m.slow || 0, st.slow);
      }
      st.ticks--;
      if (st.ticks > 0) st.delay = st.interval;
      else this.strikes.splice(this.strikes.indexOf(st), 1);
    }
  }

  /**
   * 對怪物造成傷害：受擊閃爍、擊退、史萊姆分裂、死亡處理。
   * @param {object} m 怪物。
   * @param {number} dmg 傷害（已計入防禦時直接使用）。
   * @param {{x: number, y: number}} [dir] 擊退方向。
   */
  hitMonster(m, dmg, dir) {
    if (m.hp <= 0 || m.intangible) return;
    m.hp -= dmg;
    m.hurt = 0.15;
    m.aggro = true;
    this.loot.maxHit = Math.max(this.loot.maxHit, dmg);
    this.effect('text', m.x, m.y - m.r - 0.2, { text: String(dmg), color: '#fff' });
    this.effect('hit', m.x, m.y - m.r * 0.4, { angle: dir ? Math.atan2(dir.y, dir.x) : this.rng() * Math.PI * 2 });
    if (dir && !m.boss && m.ai !== 'golemling') this.moveEntity(m, dir.x * 0.25, dir.y * 0.25, m.ai === 'wraith');
    if (m.ai === 'slime' && !m.split && m.hp > 0) {
      m.split = true;
      for (const s of [-1, 1]) {
        const c = this.spawnMonster(m.type, m.x + s * 0.4, m.y, { small: true });
        c.aggro = true;
      }
    }
    if (m.hp <= 0) this.killMonster(m);
  }

  /**
   * 怪物死亡：給予經驗值與金幣、掉落裝備或藥水；Boss 死亡時開啟回城傳送點與寶箱。
   * @param {object} m 怪物。
   */
  killMonster(m) {
    this.monsters = this.monsters.filter((o) => o !== m);
    this.loot.kills++;
    const reward = killReward(this.level, m.xpMult, this.rng);
    const xp = Math.round(reward.xp * (1 + this.player.xpPct / 100) * (m.evolved ? EVOLVE.xp : 1));
    this.addXp(xp);
    const gold = Math.round(reward.gold * (1 + this.player.goldPct / 100) * (m.evolved ? EVOLVE.gold : 1));
    this.pickups.push({ kind: 'gold', x: m.x, y: m.y, amount: gold, t: 0 });
    const chance = m.boss ? 1 : m.elite ? 0.4 : 0.08;
    if (m.evolved) {
      // 進化 Boss：必掉 2 件更好的裝備（等級 +3）。
      for (let k = 0; k < EVOLVE.items; k++) this.dropItem(m.x + 0.3 + k * 0.5, m.y, 'evolved', EVOLVE.levelBonus);
    } else if (this.rng() < chance) this.dropItem(m.x + 0.3, m.y, m.boss ? 'boss' : m.elite ? 'elite' : 'monster');
    if (!m.boss && this.rng() < 0.05) this.pickups.push({ kind: 'potion', x: m.x - 0.3, y: m.y, t: 0 });
    if (MONSTERS[m.type] && MONSTERS[m.type].deathPool && !m.small) {
      // 岩漿史萊姆：死亡處留下一灘 3 秒的熔岩。
      this.hazards.push({ kind: 'circle', x: m.x, y: m.y, r: 0.9, life: 3, pct: 0.04 });
    }
    if (m.ai === 'golemling' && !m.summoned) {
      this.telegraph({ shape: 'circle', x: m.x, y: m.y, r: 1.5, t: 1.0, dmg: Math.round(m.atk * 1.4) });
    }
    this.effect('poof', m.x, m.y, { r: m.r });
    if (m.boss) {
      this.bossDefeated = true;
      this.portalOpen = true;
      this.telegraphs = [];
      this.hazards = [];
      this.projectiles = this.projectiles.filter((pr) => pr.team === 'p');
      for (const o of this.monsters.slice()) this.killMonster(o);
      this.chests.push({ x: this.floor.portal.x + 2, y: this.floor.portal.y, opened: false, boss: true, evolved: m.evolved });
      this.events.push({ type: 'boss-defeated', name: m.name });
    }
  }

  /**
   * 加入經驗值；升級時補滿 HP 並發出事件。
   * @param {number} xp 經驗值。
   */
  addXp(xp) {
    this.loot.xp += xp;
    const ups = gainXp(this.ch, xp);
    if (ups > 0) {
      this.loot.levelsGained += ups;
      this.applyStats(this.player, true);
      this.effect('levelup', this.player.x, this.player.y);
      this.events.push({ type: 'levelup', level: this.ch.level });
    }
  }

  /**
   * 掉落一件裝備（部位隨機，武器依玩家職業）。
   * @param {number} x 座標 x。
   * @param {number} y 座標 y。
   * @param {string} source 'monster'、'elite'、'boss'、'evolved' 或 'chest'。
   * @param {number} [levelBonus=0] 裝備等級加成（進化 Boss 用）。
   */
  dropItem(x, y, source, levelBonus = 0) {
    const r = this.rng();
    const slot = r < 0.3 ? 'weapon' : r < 0.5 ? 'armor' : r < 0.65 ? 'helmet' : r < 0.8 ? 'boots' : 'accessory';
    const rarity = rollRarity(rarityWeights(source, this.depth), this.rng);
    const item = makeItem({ slot, cls: this.ch.cls, level: this.level + levelBonus, rarity }, this.rng);
    this.pickups.push({ kind: 'item', x, y, item, t: 0 });
  }

  /**
   * 對玩家造成傷害（無敵中忽略）；HP 歸零時發出倒下事件。
   * @param {number} dmg 傷害（已計入防禦）。
   * @param {number} [fromX] 傷害來源 x（擊退用）。
   * @param {number} [fromY] 傷害來源 y。
   */
  hurtPlayer(dmg, fromX, fromY) {
    const p = this.player;
    if (p.invuln > 0 || p.hp <= 0) return;
    p.hp -= dmg;
    p.invuln = 0.6;
    p.hurt = 0.3;
    this.loot.damageTaken += dmg;
    this.effect('text', p.x, p.y - 0.6, { text: String(dmg), color: '#ff6b6b' });
    this.events.push({ type: 'hurt', dmg });
    if (fromX !== undefined) {
      const d = dist(fromX, fromY, p.x, p.y) || 1;
      this.moveEntity(p, ((p.x - fromX) / d) * 0.5, ((p.y - fromY) / d) * 0.5);
    }
    if (p.hp <= 0) {
      p.hp = 0;
      this.events.push({ type: 'dead' });
    }
  }

  /**
   * 怪物攻擊玩家的傷害（依玩家防禦計算）。
   * @param {object} m 怪物。
   * @param {number} [mult=1] 招式倍率。
   * @returns {number} 傷害。
   */
  monsterDamage(m, mult = 1) {
    return damage(m.atk, this.effDef(), mult, this.rng());
  }

  /**
   * 建立預警：時間到時判定玩家是否在範圍內並造成傷害。
   * @param {{shape: 'circle' | 'line' | 'arc', x: number, y: number, r?: number, angle?: number, len?: number, width?: number, arc?: number, t: number, dmg: number, delay?: number, after?: string}} tg 預警。
   */
  telegraph(tg) {
    if (this.telegraphs.length > MAX_ENTITIES) return;
    this.telegraphs.push({ ...tg, total: tg.t, delay: tg.delay || 0 });
  }

  /**
   * 判斷點是否在預警範圍內。
   * @param {object} tg 預警。
   * @param {number} x 點 x。
   * @param {number} y 點 y。
   * @param {number} r 點的半徑。
   * @returns {boolean} 在範圍內時為 true。
   */
  inShape(tg, x, y, r) {
    if (tg.shape === 'circle') return dist(tg.x, tg.y, x, y) <= tg.r + r;
    if (tg.shape === 'line') {
      const x2 = tg.x + Math.cos(tg.angle) * tg.len;
      const y2 = tg.y + Math.sin(tg.angle) * tg.len;
      return segDist(x, y, tg.x, tg.y, x2, y2) <= tg.width / 2 + r;
    }
    const d = dist(tg.x, tg.y, x, y);
    return d <= tg.r + r && (d < r || angleDiff(Math.atan2(y - tg.y, x - tg.x), tg.angle) <= tg.arc / 2);
  }

  /**
   * 更新預警：倒數結束時判定命中。
   * @param {number} dt 秒。
   */
  updateTelegraphs(dt) {
    const p = this.player;
    for (const tg of this.telegraphs.slice()) {
      if (tg.delay > 0) {
        tg.delay -= dt;
        continue;
      }
      tg.t -= dt;
      if (tg.t > 0) continue;
      this.telegraphs.splice(this.telegraphs.indexOf(tg), 1);
      this.effect('blast', tg.x, tg.y, { shape: tg.shape, r: tg.r, angle: tg.angle, len: tg.len, width: tg.width, arc: tg.arc });
      if (tg.dmg && this.inShape(tg, p.x, p.y, p.r)) this.hurtPlayer(tg.dmg, tg.x, tg.y);
      if (tg.after === 'worm') {
        const m = this.monsters.find((o) => o.id === tg.owner);
        if (m) {
          m.x = tg.x;
          m.y = tg.y;
          m.intangible = false;
          m.invisible = false;
          m.state = 'surfaced';
          m.t = 1.5;
        }
      }
    }
  }

  // ---------- 怪物 ----------

  /**
   * 更新一隻怪物：發現玩家、依行為移動與攻擊、衝刺與史萊姆的接觸傷害。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   */
  updateMonster(m, dt) {
    const p = this.player;
    m.hurt -= dt;
    // 暈眩時完全停止行動；緩速時行為與計時都以一半速度進行。
    if (m.stun > 0) {
      m.stun -= dt;
      return;
    }
    if (m.slow > 0) {
      m.slow -= dt;
      dt *= 0.5;
    }
    m.t -= dt;
    m.cd -= dt;
    const d = dist(m.x, m.y, p.x, p.y);
    if (!m.aggro && d < AGGRO && (m.ai === 'wraith' || this.lineOfSight(m.x, m.y, p.x, p.y))) m.aggro = true;
    if (!m.aggro || p.hp <= 0) return;
    m.facing = Math.atan2(p.y - m.y, p.x - m.x);
    const ai = this.ai[m.ai];
    if (ai) ai.call(this, m, dt, d);
    // 接觸傷害只用在「身體就是武器」的情況：衝刺、俯衝中的怪物，以及沒有其他招式的史萊姆（較輕）。
    // 其他攻擊一律經由有預警的招式造成，玩家貼身攻擊時不會無預警受傷。
    m.contactCd = (m.contactCd || 0) - dt;
    const dashing = m.state === 'dash' || m.state === 'dive';
    if (!m.intangible && (dashing || m.ai === 'slime') && d < m.r + p.r + 0.05 && m.contactCd <= 0) {
      this.hurtPlayer(this.monsterDamage(m, dashing ? 1.2 : 0.6), m.x, m.y);
      m.contactCd = 1.2;
    }
  }

  /**
   * 朝玩家追擊。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} [mult=1] 速度倍率。
   */
  chase(m, dt, mult = 1) {
    const dir = this.chaseDir(m);
    this.moveEntity(m, dir.x * m.speed * mult * dt, dir.y * m.speed * mult * dt, m.ai === 'wraith');
  }

  /**
   * 遠離或靠近玩家，維持在指定距離區間。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   * @param {number} near 太近的距離。
   * @param {number} far 太遠的距離。
   */
  keepRange(m, dt, d, near, far) {
    const p = this.player;
    if (d > far) this.chase(m, dt);
    else if (d < near) {
      const k = d || 1;
      this.moveEntity(m, ((m.x - p.x) / k) * m.speed * dt, ((m.y - p.y) / k) * m.speed * dt);
    }
  }

  /**
   * 近戰蓄力攻擊：蓄力時顯示扇形預警，時間到時判定。
   * @param {object} m 怪物。
   * @param {number} range 範圍。
   * @param {number} arcDeg 角度（度）。
   * @param {number} windup 蓄力秒數。
   * @param {number} [mult=1] 傷害倍率。
   */
  meleeWindup(m, range, arcDeg, windup, mult = 1) {
    m.state = 'windup';
    m.t = windup;
    this.telegraph({ shape: 'arc', x: m.x, y: m.y, r: range + m.r, angle: m.facing, arc: (arcDeg * Math.PI) / 180, t: windup, dmg: this.monsterDamage(m, mult) });
  }

  /**
   * 發射投射物（敵方）。
   * @param {object} m 發射者。
   * @param {number} speed 速度（格／秒）。
   * @param {number} angle 方向（弧度）。
   * @param {number} mult 傷害倍率。
   * @param {{homing?: number, kind?: string, r?: number, life?: number}} [opts] 追蹤秒數、外觀種類、半徑、存在秒數。
   */
  shoot(m, speed, angle, mult, opts = {}) {
    if (this.projectiles.length > MAX_ENTITIES) return;
    this.projectiles.push({
      x: m.x + Math.cos(angle) * m.r, y: m.y + Math.sin(angle) * m.r, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: opts.r || 0.16, team: 'e', life: opts.life || 4, kind: opts.kind || 'arrow', dmg: this.monsterDamage(m, mult), homing: opts.homing || 0, speed,
    });
  }

  // ---------- 投射物、危險區域、拾取、效果 ----------

  /**
   * 更新投射物：移動、追蹤、撞牆、命中與法球爆炸。
   * @param {number} dt 秒。
   */
  updateProjectiles(dt) {
    const p = this.player;
    for (const pr of this.projectiles.slice()) {
      if (pr.homing > 0) {
        pr.homing -= dt;
        const a = Math.atan2(p.y - pr.y, p.x - pr.x);
        const cur = Math.atan2(pr.vy, pr.vx);
        let diff = a - cur;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const na = cur + Math.max(-2.5 * dt, Math.min(2.5 * dt, diff));
        pr.vx = Math.cos(na) * pr.speed;
        pr.vy = Math.sin(na) * pr.speed;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      let done = pr.life <= 0 || !walkable(this.tileAt(Math.floor(pr.x), Math.floor(pr.y)));
      if (!done && pr.team === 'p') {
        const hit = this.monsters.find((m) => !m.intangible && !pr.hit.has(m.id) && dist(m.x, m.y, pr.x, pr.y) < m.r + pr.r);
        if (hit) {
          pr.hit.add(hit.id);
          if (!pr.explode) this.hitMonster(hit, damage(this.effAtk(), hit.def, pr.mult, this.rng()), { x: pr.vx / 12, y: pr.vy / 12 });
          // 貫穿箭繼續飛行，其他投射物命中即消失。
          if (!pr.pierce) done = true;
        }
      } else if (!done && pr.team === 'e' && dist(p.x, p.y, pr.x, pr.y) < p.r + pr.r) {
        this.hurtPlayer(pr.dmg, pr.x - pr.vx, pr.y - pr.vy);
        done = true;
      }
      if (done) {
        this.projectiles.splice(this.projectiles.indexOf(pr), 1);
        if (pr.explode) {
          this.effect('blast', pr.x, pr.y, { shape: 'circle', r: pr.explode, friendly: true });
          for (const m of this.monsters.slice()) {
            if (!m.intangible && dist(m.x, m.y, pr.x, pr.y) < pr.explode + m.r) this.hitMonster(m, damage(this.effAtk(), m.def, pr.mult, this.rng()));
          }
        }
      }
    }
  }

  /**
   * 更新持續性危險區域（熔岩）：玩家站在區域內每 0.5 秒受到傷害。
   * @param {number} dt 秒。
   */
  updateHazards(dt) {
    const p = this.player;
    for (const h of this.hazards.slice()) {
      if (h.life !== undefined) {
        h.life -= dt;
        if (h.life <= 0) {
          this.hazards.splice(this.hazards.indexOf(h), 1);
          continue;
        }
      }
      if (h.kind === 'edge') h.size = Math.min(h.max, h.size + dt * 0.12);
      h.tick = (h.tick || 0) - dt;
      if (h.tick <= 0 && this.inHazard(h, p.x, p.y)) {
        h.tick = 0.5;
        this.hurtPlayer(Math.max(1, Math.round(p.maxHp * h.pct)));
      }
    }
  }

  /**
   * 判斷點是否在危險區域內。
   * @param {object} h 危險區域：'circle'（圓）或 'edge'（場地邊緣向內的寬度）。
   * @param {number} x 點 x。
   * @param {number} y 點 y。
   * @returns {boolean} 在區域內時為 true。
   */
  inHazard(h, x, y) {
    if (h.kind === 'circle') return dist(h.x, h.y, x, y) < h.r;
    const room = this.floor.rooms[0];
    return x < room.x + h.size || x > room.x + room.w - h.size || y < room.y + h.size || y > room.y + room.h - h.size;
  }

  /**
   * 更新拾取物：金幣靠近時吸向玩家；碰到時拾取。寶箱碰到時開啟。
   * @param {number} dt 秒。
   */
  updatePickups(dt) {
    const p = this.player;
    for (const it of this.pickups.slice()) {
      it.t += dt;
      const d = dist(p.x, p.y, it.x, it.y);
      if (it.kind === 'gold' && d < 1.6 && it.t > 0.3) {
        it.x += ((p.x - it.x) / (d || 1)) * Math.min(d, 8 * dt);
        it.y += ((p.y - it.y) / (d || 1)) * Math.min(d, 8 * dt);
      }
      if (d > 0.6 || it.t < 0.3) continue;
      this.pickups.splice(this.pickups.indexOf(it), 1);
      if (it.kind === 'gold') {
        this.loot.gold += it.amount;
        this.ch.gold += it.amount;
        this.effect('text', p.x, p.y - 0.6, { text: `+${it.amount}G`, color: '#e8b84a' });
      } else if (it.kind === 'bagExpand') {
        this.ch.bagExpand = (this.ch.bagExpand || 0) + 1;
        this.events.push({ type: 'message', text: '撿到背包擴充袋！回村莊到「倉庫」使用' });
      } else if (it.kind === 'potion') {
        if (p.potions < LIMITS.potions) p.potions++;
        else {
          this.ch.gold += LIMITS.potionPrice / 2;
          this.loot.gold += LIMITS.potionPrice / 2;
        }
        this.events.push({ type: 'message', text: '撿到回復藥水' });
      } else if (it.kind === 'item') {
        this.takeItem(it.item);
      }
    }
    for (const c of this.chests) {
      if (c.opened || dist(p.x, p.y, c.x, c.y) > 0.8) continue;
      c.opened = true;
      const gold = Math.round(20 + 8 * this.level);
      this.pickups.push({ kind: 'gold', x: c.x, y: c.y + 0.3, amount: gold, t: 0 });
      if (c.evolved) this.dropItem(c.x + 0.4, c.y + 0.2, 'evolved', EVOLVE.levelBonus);
      else if (c.boss || this.rng() < 0.6) this.dropItem(c.x + 0.4, c.y + 0.2, c.boss ? 'boss' : 'chest');
      // Boss 寶箱有 25% 機會出現背包擴充袋。
      if (c.boss && this.rng() < (c.evolved ? EVOLVE.pouch : 0.25)) this.pickups.push({ kind: 'bagExpand', x: c.x, y: c.y + 0.5, t: 0 });
      if (this.rng() < 0.3) this.pickups.push({ kind: 'potion', x: c.x - 0.4, y: c.y + 0.2, t: 0 });
      this.effect('poof', c.x, c.y, { r: 0.4, color: '#e8b84a' });
    }
  }

  /**
   * 拾取裝備：放入背包；背包已滿（依角色目前的背包上限）時自動賣出。
   * @param {object} item 裝備。
   */
  takeItem(item) {
    if (this.ch.bag.length < bagLimit(this.ch)) {
      this.ch.bag.push(item);
      this.loot.items.push(item);
      this.events.push({ type: 'item', item });
    } else {
      const price = sellPrice(item);
      this.ch.gold += price;
      this.loot.gold += price;
      this.events.push({ type: 'message', text: `背包已滿，${item.name} 自動賣出（+${price}G）` });
    }
  }

  /**
   * 加入畫面效果（傷害數字、斬擊、爆炸等）。
   * @param {string} kind 種類。
   * @param {number} x 座標 x。
   * @param {number} y 座標 y。
   * @param {object} [data] 其他資料。
   */
  effect(kind, x, y, data = {}) {
    if (this.effects.length > MAX_ENTITIES) this.effects.shift();
    const life = { text: 0.8, slash: 0.22, hit: 0.18, cast: 0.15, poof: 0.35, blast: 0.3, levelup: 1.2, dust: 0.3 }[kind] || 0.4;
    this.effects.push({ kind, x, y, t: 0, life, ...data });
  }

  /**
   * 更新畫面效果的時間。
   * @param {number} dt 秒。
   */
  updateEffects(dt) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.life);
  }

  /** 避免怪物重疊：彼此太近時互相推開（Boss 不被推動）。 */
  separate() {
    const ms = this.monsters;
    for (let a = 0; a < ms.length; a++) {
      for (let b = a + 1; b < ms.length; b++) {
        const m = ms[a];
        const n = ms[b];
        if (m.intangible || n.intangible) continue;
        const d = dist(m.x, m.y, n.x, n.y);
        const min = m.r + n.r;
        if (d >= min || d === 0) continue;
        const push = (min - d) / 2;
        const ux = (n.x - m.x) / d;
        const uy = (n.y - m.y) / d;
        if (!m.boss) this.moveEntity(m, -ux * push, -uy * push);
        if (!n.boss) this.moveEntity(n, ux * push, uy * push);
      }
    }
  }

  /** 檢查玩家腳下的格子：地刺、樓梯與回城傳送點。 */
  checkTiles() {
    const p = this.player;
    if (p.hp <= 0) return;
    const t = this.tileAt(Math.floor(p.x), Math.floor(p.y));
    if (t === SPIKES && this.spikesUp()) this.hurtPlayer(Math.max(1, Math.round(p.maxHp * 0.08)));
    if (t === STAIRS && !this.leaving) {
      this.leaving = true;
      this.events.push({ type: 'stairs' });
    }
    const portal = this.floor.portal;
    if (this.portalOpen && portal && dist(p.x, p.y, portal.x, portal.y) < 0.6 && !this.leaving) {
      this.leaving = true;
      this.collectAll();
      this.events.push({ type: 'victory' });
    }
  }

  /**
   * 擊敗 Boss 回城時，自動打開剩下的寶箱並收下地上所有的金幣、藥水與裝備。
   */
  collectAll() {
    const p = this.player;
    for (const c of this.chests) {
      if (c.opened) continue;
      c.x = p.x;
      c.y = p.y;
    }
    this.updatePickups(0);
    for (const it of this.pickups) {
      it.x = p.x;
      it.y = p.y;
      it.t = 1;
    }
    this.updatePickups(0);
  }

  /**
   * 判斷地刺目前是否升起。
   * @returns {boolean} 升起時為 true。
   */
  spikesUp() {
    return this.time % SPIKE_CYCLE < 1;
  }

  /**
   * 前往下一層（保留玩家的 HP 與冷卻）。
   */
  nextFloor() {
    this.leaving = false;
    this.loadFloor(this.floorIndex + 1);
  }

  /**
   * 使用回城卷軸。
   * @returns {boolean} 有卷軸可用時為 true。
   */
  useScroll() {
    if (this.player.scroll <= 0 || this.leaving) return false;
    this.player.scroll--;
    this.leaving = true;
    this.events.push({ type: 'recall' });
    return true;
  }

  /**
   * 取得目前的 Boss（沒有時為 null）。
   * @returns {object | null} Boss。
   */
  boss() {
    return this.monsters.find((m) => m.boss) || null;
  }

  // ---------- 存檔 ----------

  /**
   * 取得可存檔的快照（地圖由種子重新產生，只記錄會變動的狀態）。
   * @returns {object} 快照。
   */
  snapshot() {
    const p = this.player;
    let explored = '';
    for (let i = 0; i < this.explored.length; i += 6) {
      let v = 0;
      for (let k = 0; k < 6; k++) v |= (this.explored[i + k] || 0) << k;
      explored += String.fromCharCode(48 + v);
    }
    return {
      area: this.area, depth: this.depth, seed: this.seed, floor: this.floorIndex, elapsed: this.elapsed, time: this.time,
      loot: { ...this.loot, items: this.loot.items.map((i) => i.id) },
      player: { x: p.x, y: p.y, hp: p.hp, potions: p.potions, scroll: p.scroll, facing: p.facing },
      monsters: this.monsters.map((m) => ({ type: m.type, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, boss: m.boss, elite: m.elite, small: m.small, abyss: m.abyss, evolved: !!m.evolved, split: m.split, phase2: m.phase2, summoned: m.summoned, heals: m.heals || 0, awake: !!m.awake })),
      pickups: this.pickups.map((it) => ({ ...it })),
      chests: this.chests.map((c) => ({ ...c })),
      portalOpen: this.portalOpen, bossDefeated: this.bossDefeated, explored,
    };
  }

  /**
   * 由快照恢復探險（地圖由種子重建，怪物、拾取物與寶箱依快照放回；預警與投射物不保留）。
   * @param {object} character 角色資料。
   * @param {object} snap 快照。
   * @param {() => number} [rng=Math.random] 戰鬥用亂數。
   * @returns {World} 探險。
   */
  static restore(character, snap, rng = Math.random) {
    const w = new World(character, { area: snap.area, depth: snap.depth, seed: snap.seed, floor: snap.floor, potions: snap.player.potions, scroll: snap.player.scroll, restoring: true }, rng);
    w.restoring = false;
    w.elapsed = snap.elapsed;
    w.time = snap.time || 0;
    w.loot = { ...snap.loot, items: character.bag.filter((i) => snap.loot.items.includes(i.id)) };
    Object.assign(w.player, { x: snap.player.x, y: snap.player.y, hp: Math.min(snap.player.hp, w.player.maxHp), facing: snap.player.facing });
    w.monsters = [];
    for (const m of snap.monsters) {
      const n = w.spawnMonster(m.type, m.x, m.y, { boss: m.boss, elite: m.elite, small: m.small, abyss: m.abyss, evolved: m.evolved });
      Object.assign(n, { hp: m.hp, maxHp: m.maxHp, split: m.split, phase2: m.phase2, summoned: m.summoned, heals: m.heals || 0, awake: !!m.awake });
    }
    w.pickups = snap.pickups;
    w.chests = snap.chests;
    w.portalOpen = snap.portalOpen;
    w.bossDefeated = snap.bossDefeated;
    for (let i = 0; i < snap.explored.length; i++) {
      const v = snap.explored.charCodeAt(i) - 48;
      for (let k = 0; k < 6; k++) if (i * 6 + k < w.explored.length) w.explored[i * 6 + k] = (v >> k) & 1;
    }
    return w;
  }
}

// ---------- 怪物與 Boss 的行為 ----------

World.prototype.ai = {
  /**
   * 史萊姆：緩慢追擊（分裂在受擊時處理）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   */
  slime(m, dt) {
    this.chase(m, dt);
  },

  /**
   * 蝙蝠：不規則飛行，接近時短暫俯衝。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  bat(m, dt, d) {
    if (m.state === 'dive') {
      if (m.t <= 0) m.state = 'fly';
      else this.moveEntity(m, m.vx * dt, m.vy * dt);
      return;
    }
    if (m.t <= 0) {
      const toward = Math.atan2(this.player.y - m.y, this.player.x - m.x);
      const a = toward + (this.rng() - 0.5) * 2.4;
      m.vx = Math.cos(a) * m.speed;
      m.vy = Math.sin(a) * m.speed;
      m.t = 0.5 + this.rng() * 0.4;
    }
    if (d < 3 && m.cd <= 0) {
      m.state = 'dive';
      m.t = 0.35;
      m.cd = 2.2;
      m.vx = Math.cos(m.facing) * 6;
      m.vy = Math.sin(m.facing) * 6;
    }
    if (this.moveEntity(m, m.vx * dt, m.vy * dt)) m.t = 0;
  },

  /**
   * 骷髏劍士：接近後蓄力揮砍。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  melee(m, dt, d) {
    if (m.state === 'windup' || m.state === 'recover') {
      if (m.t <= 0) {
        if (m.state === 'windup') {
          m.state = 'recover';
          m.t = 0.5;
        } else m.state = 'chase';
      }
      return;
    }
    if (d < 1.2 + m.r && m.cd <= 0) {
      this.meleeWindup(m, 1.4, 100, 0.6, 1.2);
      m.cd = 1.4;
    } else this.chase(m, dt);
  },

  /**
   * 骷髏弓手：保持距離，瞄準後射箭。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  archer(m, dt, d) {
    if (m.state === 'aim') {
      if (m.t <= 0) {
        this.shoot(m, 8, m.aimAngle, 1.1, { kind: 'arrow' });
        m.state = 'idle';
        m.cd = 1.6;
      }
      return;
    }
    this.keepRange(m, dt, d, 3.5, 6);
    if (d < 8 && m.cd <= 0 && this.lineOfSight(m.x, m.y, this.player.x, this.player.y)) {
      m.state = 'aim';
      m.t = 0.7;
      m.aimAngle = m.facing;
      this.telegraph({ shape: 'line', x: m.x, y: m.y, angle: m.facing, len: 8, width: 0.25, t: 0.7, dmg: 0 });
    }
  },

  /**
   * 哥布林：快速接近，打一下就後退。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  goblin(m, dt, d) {
    if (m.state === 'windup') {
      if (m.t <= 0) {
        m.state = 'retreat';
        m.t = 0.7;
      }
      return;
    }
    if (m.state === 'retreat') {
      if (m.t <= 0) m.state = 'chase';
      const k = d || 1;
      this.moveEntity(m, ((m.x - this.player.x) / k) * m.speed * dt, ((m.y - this.player.y) / k) * m.speed * dt);
      return;
    }
    if (d < 1 + m.r && m.cd <= 0) {
      this.meleeWindup(m, 1.0, 90, 0.4, 1);
      m.cd = 1.2;
    } else this.chase(m, dt);
  },

  /**
   * 熔岩蟲：鑽入地下移動，從玩家腳下鑽出（地面先預警）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  worm(m, dt, d) {
    if (m.state === 'surfaced') {
      if (m.t <= 0) {
        m.state = 'burrow';
        m.intangible = true;
        m.invisible = true;
        m.cd = 1.5;
      }
      return;
    }
    if (m.state === 'emerging') return;
    if (m.state !== 'burrow') {
      m.state = 'burrow';
      m.intangible = true;
      m.invisible = true;
    }
    this.chase(m, dt, 1.2);
    if ((d < 1.6 || m.cd <= -2) && m.cd <= 0) {
      m.state = 'emerging';
      this.telegraph({ shape: 'circle', x: this.player.x, y: this.player.y, r: 0.9, t: 0.8, dmg: this.monsterDamage(m, 1.3), after: 'worm', owner: m.id });
    }
  },

  /**
   * 火焰精靈：保持距離，發射會追蹤 1 秒的火球。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  caster(m, dt, d) {
    if (m.state === 'cast') {
      if (m.t <= 0) {
        this.shoot(m, 4, m.facing, 1.1, { kind: 'fire', homing: 1, r: 0.22 });
        m.state = 'idle';
        m.cd = 2.2;
      }
      return;
    }
    this.keepRange(m, dt, d, 3, 5);
    if (d < 7 && m.cd <= 0) {
      m.state = 'cast';
      m.t = 0.6;
      this.telegraph({ shape: 'circle', x: m.x, y: m.y, r: m.r + 0.25, t: 0.6, dmg: 0 });
    }
  },

  /**
   * 冰原狼：繞圈後直線衝刺（衝刺前顯示直線預警）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  wolf(m, dt, d) {
    const p = this.player;
    if (m.state === 'charge') {
      if (m.t <= 0) {
        m.state = 'dash';
        m.t = 0.55;
      }
      return;
    }
    if (m.state === 'dash') {
      if (m.t <= 0 || this.moveEntity(m, Math.cos(m.dashAngle) * 9 * dt, Math.sin(m.dashAngle) * 9 * dt)) {
        m.state = 'rest';
        m.t = 0.8;
      }
      return;
    }
    if (m.state === 'rest' && m.t > 0) return;
    if (d > 4) {
      this.chase(m, dt);
      return;
    }
    const tangent = Math.atan2(m.y - p.y, m.x - p.x) + Math.PI / 2;
    const pull = d < 2.8 ? -0.5 : 0.5;
    this.moveEntity(m, (Math.cos(tangent) - (pull * (m.x - p.x)) / (d || 1)) * m.speed * dt, (Math.sin(tangent) - (pull * (m.y - p.y)) / (d || 1)) * m.speed * dt);
    if (m.cd <= 0) {
      m.state = 'charge';
      m.t = 0.6;
      m.dashAngle = m.facing;
      m.cd = 2.6;
      this.telegraph({ shape: 'line', x: m.x, y: m.y, angle: m.facing, len: 5.5, width: 0.8, t: 0.6, dmg: 0 });
    }
  },

  /**
   * 寒霜幽魂：可穿牆，隱身後在玩家附近現身攻擊。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  wraith(m, dt, d) {
    const p = this.player;
    if (m.state === 'hidden') {
      if (m.t <= 0) {
        const a = this.rng() * Math.PI * 2;
        let nx = p.x + Math.cos(a) * 1.6;
        let ny = p.y + Math.sin(a) * 1.6;
        if (!walkable(this.tileAt(Math.floor(nx), Math.floor(ny)))) {
          nx = p.x;
          ny = p.y - 1.6;
        }
        m.x = nx;
        m.y = ny;
        m.state = 'appear';
        m.t = 0.5;
        m.invisible = false;
        this.telegraph({ shape: 'circle', x: nx, y: ny, r: 0.6, t: 0.5, dmg: 0 });
      }
      return;
    }
    if (m.state === 'appear') {
      if (m.t <= 0) {
        m.intangible = false;
        m.facing = Math.atan2(p.y - m.y, p.x - m.x);
        this.meleeWindup(m, 1.2, 110, 0.5, 1.1);
        m.cd = 0;
      }
      return;
    }
    if (m.state === 'windup') {
      if (m.t <= 0) {
        m.state = 'chase';
        m.cd = 2.5;
      }
      return;
    }
    this.chase(m, dt);
    if (m.cd <= 0 && d < 6) {
      m.state = 'hidden';
      m.t = 1.5;
      m.invisible = true;
      m.intangible = true;
    }
  },

  /**
   * 水晶傀儡：緩慢追擊、蓄力重擊（死亡爆炸在 killMonster 處理）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  golemling(m, dt, d) {
    if (m.state === 'windup' || m.state === 'recover') {
      if (m.t <= 0) {
        if (m.state === 'windup') {
          m.state = 'recover';
          m.t = 0.6;
        } else m.state = 'chase';
      }
      return;
    }
    if (d < 1.3 + m.r && m.cd <= 0) {
      this.meleeWindup(m, 1.5, 120, 0.8, 1.3);
      m.cd = 2;
    } else this.chase(m, dt);
  },

  /**
   * 毒菇人：緩慢接近，蓄力後向周圍噴出一圈孢子。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  spore(m, dt, d) {
    if (windupBusy(m, 0.7)) return;
    if (d < 1.8 + m.r && m.cd <= 0) {
      m.state = 'windup';
      m.t = 0.8;
      m.cd = 2.6;
      this.telegraph({ shape: 'circle', x: m.x, y: m.y, r: 1.8 + m.r, t: 0.8, dmg: this.monsterDamage(m, 1.1) });
    } else this.chase(m, dt);
  },

  /**
   * 藤蔓食人花：固定不動，瞄準後連射 3 顆種子。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  turret(m, dt, d) {
    if (m.state === 'aim') {
      if (m.t <= 0) {
        m.state = 'burst';
        m.shots = 3;
        m.t = 0;
      }
      return;
    }
    if (m.state === 'burst') {
      if (m.t <= 0) {
        this.shoot(m, 6, m.aimAngle + (this.rng() - 0.5) * 0.15, 0.8, { kind: 'seed', r: 0.14 });
        m.shots--;
        m.t = 0.18;
        if (m.shots <= 0) {
          m.state = 'idle';
          m.cd = 2.2;
        }
      }
      return;
    }
    if (d < 7 && m.cd <= 0 && this.lineOfSight(m.x, m.y, this.player.x, this.player.y)) {
      m.state = 'aim';
      m.t = 0.6;
      m.aimAngle = m.facing;
      this.telegraph({ shape: 'line', x: m.x, y: m.y, angle: m.facing, len: 7, width: 0.3, t: 0.6, dmg: 0 });
    }
  },

  /**
   * 礦坑蜘蛛：快速接近，在短距離內蓄力後撲跳（撲跳中碰到玩家造成傷害）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  leaper(m, dt, d) {
    if (m.state === 'charge') {
      if (m.t <= 0) {
        m.state = 'dash';
        m.t = 0.4;
      }
      return;
    }
    if (m.state === 'dash') {
      if (m.t <= 0 || this.moveEntity(m, Math.cos(m.dashAngle) * 9 * dt, Math.sin(m.dashAngle) * 9 * dt)) {
        m.state = 'rest';
        m.t = 0.5;
      }
      return;
    }
    if (m.state === 'rest' && m.t > 0) return;
    if (d < 3.5 && m.cd <= 0) {
      m.state = 'charge';
      m.t = 0.5;
      m.cd = 2;
      m.dashAngle = m.facing;
      this.telegraph({ shape: 'line', x: m.x, y: m.y, angle: m.facing, len: 3.6, width: 0.6, t: 0.5, dmg: 0 });
    } else this.chase(m, dt);
  },

  /**
   * 炸彈哥布林：保持距離，往玩家腳下丟炸彈（落點先預警）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  bomber(m, dt, d) {
    if (m.state === 'cast') {
      if (m.t <= 0) {
        this.telegraph({ shape: 'circle', x: this.player.x, y: this.player.y, r: 1.1, t: 1.0, dmg: this.monsterDamage(m, 1.3) });
        m.state = 'idle';
        m.cd = 2.6;
      }
      return;
    }
    this.keepRange(m, dt, d, 3.5, 6);
    if (d < 7 && m.cd <= 0) {
      m.state = 'cast';
      m.t = 0.4;
    }
  },

  /**
   * 雪怪：緩慢、耐打，接近後高舉雙手大範圍砸地。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  brute(m, dt, d) {
    if (windupBusy(m, 0.8)) return;
    if (d < 1.8 + m.r && m.cd <= 0) {
      m.state = 'windup';
      m.t = 1.0;
      m.cd = 2.8;
      this.telegraph({ shape: 'circle', x: m.x, y: m.y, r: 2.2 + m.r, t: 1.0, dmg: this.monsterDamage(m, 1.4) });
    } else this.chase(m, dt);
  },

  /**
   * 冰霜妖精：保持距離，一次射出三道扇形冰刺。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  tri(m, dt, d) {
    if (m.state === 'cast') {
      if (m.t <= 0) {
        for (const off of [-0.3, 0, 0.3]) this.shoot(m, 5, m.facing + off, 0.9, { kind: 'ice', r: 0.16 });
        m.state = 'idle';
        m.cd = 2.4;
      }
      return;
    }
    this.keepRange(m, dt, d, 3, 5);
    if (d < 7 && m.cd <= 0) {
      m.state = 'cast';
      m.t = 0.6;
      this.telegraph({ shape: 'circle', x: m.x, y: m.y, r: m.r + 0.25, t: 0.6, dmg: 0 });
    }
  },

  /**
   * 石像鬼：平時是不動的石像，玩家靠近 3 格內或被攻擊時甦醒，之後像冰原狼一樣繞圈衝撞。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  gargoyle(m, dt, d) {
    if (!m.awake) {
      if (d > 3 && m.hp >= m.maxHp) return;
      m.awake = true;
      m.cd = 0.6;
      this.effect('poof', m.x, m.y, { r: 0.5, color: '#9aa3b5' });
    }
    this.ai.wolf.call(this, m, dt, d);
  },

  /**
   * 暗影刺客：隱身後瞬間移到玩家背後，快速揮砍。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  assassin(m, dt, d) {
    const p = this.player;
    if (m.state === 'hidden') {
      if (m.t <= 0) {
        // 出現在玩家面向的反方向（背後），那裡是牆時改到側面。
        const spots = [[-p.facing.x, -p.facing.y], [-p.facing.y, p.facing.x], [p.facing.y, -p.facing.x]];
        for (const [ux, uy] of spots) {
          const nx = p.x + ux * 1.3;
          const ny = p.y + uy * 1.3;
          if (!this.hitsWall(nx, ny, m.r)) {
            m.x = nx;
            m.y = ny;
            break;
          }
        }
        m.invisible = false;
        m.intangible = false;
        m.facing = Math.atan2(p.y - m.y, p.x - m.x);
        this.meleeWindup(m, 1.1, 100, 0.45, 1.2);
        m.cd = 2.8;
      }
      return;
    }
    if (windupBusy(m, 0.4)) return;
    if (m.cd <= 0 && d < 6) {
      m.state = 'hidden';
      m.t = 0.6;
      m.invisible = true;
      m.intangible = true;
      this.effect('poof', m.x, m.y, { r: 0.4, color: '#6a4a8a' });
    } else this.chase(m, dt);
  },

  /**
   * 虛空之眼：飄浮保持距離，蓄力後沿直線射出光束（直線預警）。
   * @param {object} m 怪物。
   * @param {number} dt 秒。
   * @param {number} d 與玩家的距離。
   */
  beam(m, dt, d) {
    if (windupBusy(m, 0.6)) return;
    this.keepRange(m, dt, d, 3, 6);
    if (d < 7.5 && m.cd <= 0 && this.lineOfSight(m.x, m.y, this.player.x, this.player.y)) {
      m.state = 'windup';
      m.t = 0.9;
      m.cd = 3;
      this.telegraph({ shape: 'line', x: m.x, y: m.y, angle: m.facing, len: 8, width: 0.7, t: 0.9, dmg: this.monsterDamage(m, 1.4) });
    }
  },

  /**
   * 古樹守衛：依序竄出的樹根、揮臂橫掃、召喚史萊姆；第二階段樹根加快並同時從兩個方向竄出。
   * @param {object} m Boss。
   * @param {number} dt 秒。
   */
  treant(m, dt) {
    bossPhase.call(this, m);
    if (bossHealing.call(this, m)) return;
    if (m.state === 'attacking') {
      if (m.t <= 0) {
        m.state = 'move';
        m.cd = (m.phase2 ? 1.0 : 1.5) * (m.abyss ? 0.8 : 1) * (m.evolved ? EVOLVE.cd : 1);
      }
      return;
    }
    this.chase(m, dt, 0.6);
    if (m.cd > 0) return;
    const p = this.player;
    if (startHeal.call(this, m)) return;
    const moves = ['roots', 'sweep', 'roots', 'summon'];
    const move = moves[m.pattern++ % moves.length];
    const base = Math.atan2(p.y - m.y, p.x - m.x);
    m.state = 'attacking';
    if (move === 'roots') {
      const lines = m.phase2 ? [base - 0.45, base + 0.45] : [base];
      const gap = m.phase2 ? 0.12 : 0.18;
      for (const a of lines) {
        for (let k = 0; k < 7; k++) {
          const x = m.x + Math.cos(a) * (1.4 + k);
          const y = m.y + Math.sin(a) * (1.4 + k);
          this.telegraph({ shape: 'circle', x, y, r: 0.65, t: 0.7, delay: k * gap, dmg: this.monsterDamage(m, 1.0) });
        }
      }
      m.t = 1.2 + 7 * gap;
    } else if (move === 'sweep') {
      this.telegraph({ shape: 'arc', x: m.x, y: m.y, r: 2.7, angle: base, arc: (200 * Math.PI) / 180, t: 0.9, dmg: this.monsterDamage(m, 1.2) });
      m.t = 1.1;
    } else {
      const minions = this.monsters.filter((o) => o.summoned).length;
      for (let k = 0; k < 3 && minions + k < 6; k++) {
        const a = (k / 3) * Math.PI * 2;
        const s = this.spawnMonster('slime', m.x + Math.cos(a) * 1.8, m.y + Math.sin(a) * 1.8, { small: false });
        s.summoned = true;
        s.aggro = true;
        s.xpMult = 0.3;
      }
      m.t = 0.8;
    }
  },

  /**
   * 熔岩魔像：地面噴發、直線衝撞、投擲岩塊；第二階段場地邊緣持續出現熔岩。
   * @param {object} m Boss。
   * @param {number} dt 秒。
   */
  golem(m, dt) {
    bossPhase.call(this, m);
    if (bossHealing.call(this, m)) return;
    const p = this.player;
    if (m.state === 'charge') {
      if (m.t <= 0) {
        m.state = 'dash';
        m.t = 0.9;
      }
      return;
    }
    if (m.state === 'dash') {
      const blocked = this.moveEntity(m, Math.cos(m.dashAngle) * 10 * dt, Math.sin(m.dashAngle) * 10 * dt);
      if (blocked || m.t <= 0) {
        m.state = 'attacking';
        m.t = 0.9;
        this.effect('blast', m.x, m.y, { shape: 'circle', r: 1.2 });
      }
      return;
    }
    if (m.state === 'attacking') {
      if (m.t <= 0) {
        m.state = 'move';
        m.cd = (m.phase2 ? 1.0 : 1.5) * (m.abyss ? 0.8 : 1) * (m.evolved ? EVOLVE.cd : 1);
      }
      return;
    }
    this.chase(m, dt, 0.6);
    if (m.cd > 0) return;
    if (startHeal.call(this, m)) return;
    const moves = ['erupt', 'charge', 'throw'];
    const move = moves[m.pattern++ % moves.length];
    if (move === 'erupt') {
      const n = m.phase2 ? 9 : 6;
      for (let k = 0; k < n; k++) {
        const x = p.x + (this.rng() - 0.5) * 6;
        const y = p.y + (this.rng() - 0.5) * 6;
        this.telegraph({ shape: 'circle', x, y, r: 0.9, t: 0.9, delay: k * 0.08, dmg: this.monsterDamage(m, 1.0) });
      }
      m.state = 'attacking';
      m.t = 1.4;
    } else if (move === 'charge') {
      m.dashAngle = Math.atan2(p.y - m.y, p.x - m.x);
      m.state = 'charge';
      m.t = 0.8;
      this.telegraph({ shape: 'line', x: m.x, y: m.y, angle: m.dashAngle, len: 9, width: 1.8, t: 0.8, dmg: 0 });
    } else {
      for (let k = 0; k < (m.phase2 ? 3 : 2); k++) {
        this.telegraph({ shape: 'circle', x: p.x + (k ? (this.rng() - 0.5) * 3 : 0), y: p.y + (k ? (this.rng() - 0.5) * 3 : 0), r: 1.0, t: 1.0, delay: k * 0.25, dmg: this.monsterDamage(m, 1.1) });
      }
      m.state = 'attacking';
      m.t = 1.3;
    }
  },

  /**
   * 霜之巫妖：環狀冰彈、瞬間移動、落下的冰柱；第二階段召喚寒霜幽魂並改為螺旋冰彈。
   * @param {object} m Boss。
   * @param {number} dt 秒。
   */
  lich(m, dt) {
    bossPhase.call(this, m);
    if (bossHealing.call(this, m)) return;
    const p = this.player;
    if (m.state === 'attacking') {
      if (m.spiral > 0 && m.t <= m.spiralNext) {
        m.spiral--;
        m.spiralNext -= 0.25;
        for (let k = 0; k < 10; k++) this.shoot(m, 3.6, (k / 10) * Math.PI * 2 + m.spiral * 0.22, 0.9, { kind: 'ice', life: 5, r: 0.2 });
      }
      if (m.t <= 0) {
        m.state = 'move';
        m.cd = (m.phase2 ? 1.0 : 1.5) * (m.abyss ? 0.8 : 1) * (m.evolved ? EVOLVE.cd : 1);
      }
      return;
    }
    if (m.state === 'vanish') {
      if (m.t <= 0) {
        const room = this.floor.rooms[0];
        for (let tries = 0; tries < 20; tries++) {
          const x = room.x + 1.5 + this.rng() * (room.w - 3);
          const y = room.y + 1.5 + this.rng() * (room.h - 3);
          if (dist(x, y, p.x, p.y) > 4) {
            m.x = x;
            m.y = y;
            break;
          }
        }
        m.invisible = false;
        m.intangible = false;
        m.state = 'attacking';
        m.t = 0.6;
      }
      return;
    }
    if (this.rng() < 0.5) this.keepRange(m, dt, dist(m.x, m.y, p.x, p.y), 3, 6);
    if (m.cd > 0) return;
    if (startHeal.call(this, m)) return;
    const moves = ['ring', 'icicle', 'teleport'];
    const move = moves[m.pattern++ % moves.length];
    if (move === 'ring') {
      m.state = 'attacking';
      if (m.phase2) {
        m.spiral = 4;
        m.spiralNext = 1.6;
        m.t = 1.8;
      } else {
        this.telegraph({ shape: 'circle', x: m.x, y: m.y, r: m.r + 0.4, t: 0.5, dmg: 0 });
        for (let k = 0; k < 12; k++) this.shoot(m, 4, (k / 12) * Math.PI * 2, 0.9, { kind: 'ice', life: 5, r: 0.2 });
        m.t = 1.0;
      }
    } else if (move === 'icicle') {
      for (let k = 0; k < 3; k++) {
        this.telegraph({ shape: 'circle', x: p.x, y: p.y, r: 0.9, t: 0.8, delay: k * 0.5, dmg: this.monsterDamage(m, 1.1), follow: true });
      }
      m.state = 'attacking';
      m.t = 1.9;
    } else {
      m.state = 'vanish';
      m.t = 0.5;
      m.invisible = true;
      m.intangible = true;
    }
  },
};

/**
 * 蓄力與收招中的怪物：時間到時由蓄力轉為收招、收招結束後恢復追擊。
 * @param {object} m 怪物（會被修改）。
 * @param {number} recover 收招秒數。
 * @returns {boolean} 正在蓄力或收招時為 true（本步不做其他行動）。
 */
function windupBusy(m, recover) {
  if (m.state !== 'windup' && m.state !== 'recover') return false;
  if (m.t <= 0) {
    if (m.state === 'windup') {
      m.state = 'recover';
      m.t = recover;
    } else m.state = 'chase';
  }
  return true;
}

/**
 * Boss 換招時判斷是否開始回復：HP 70% 以下、還有剩餘次數時有 35% 機會。
 * @param {object} m Boss（會被修改）。
 * @returns {boolean} 開始回復時為 true。
 */
function startHeal(m) {
  const H = BOSS_HEAL;
  const times = (m.abyss ? H.abyssTimes : H.times) + (m.evolved ? 1 : 0);
  if ((m.heals || 0) >= times || m.hp > m.maxHp * H.below || this.rng() >= H.chance) return false;
  m.heals = (m.heals || 0) + 1;
  m.state = 'healing';
  m.t = H.channel;
  m.healFrom = m.hp;
  this.events.push({ type: 'boss-heal-start', name: m.name });
  return true;
}

/**
 * Boss 回復中：受到足夠傷害就被打斷並暈眩；蓄力結束時回復 HP。
 * @param {object} m Boss（會被修改）。
 * @returns {boolean} 正在回復（或剛被打斷、剛回復完）時為 true，本步不做其他行動。
 */
function bossHealing(m) {
  if (m.state !== 'healing') return false;
  const H = BOSS_HEAL;
  if (m.healFrom - m.hp >= m.maxHp * H.breakPct) {
    m.state = 'move';
    m.cd = 1.2;
    m.stun = H.stun;
    this.effect('text', m.x, m.y - m.r - 0.6, { text: '打斷！', color: '#ffe14d' });
    this.events.push({ type: 'boss-heal-break', name: m.name });
    return true;
  }
  if (m.t > 0) return true;
  const amount = Math.round(m.maxHp * (m.abyss ? H.abyssPct : H.pct));
  m.hp = Math.min(m.maxHp, m.hp + amount);
  m.state = 'move';
  m.cd = 1;
  this.effect('text', m.x, m.y - m.r - 0.6, { text: `+${amount}`, color: '#5fd068' });
  this.effect('poof', m.x, m.y, { r: m.r + 0.4, color: '#5fd068' });
  this.events.push({ type: 'boss-heal', name: m.name, amount });
  return true;
}

/**
 * Boss 進入第二階段（HP 50% 以下）：霜之巫妖召喚 2 個寒霜幽魂，熔岩魔像開始讓場地邊緣出現熔岩。
 * @param {object} m Boss。
 */
function bossPhase(m) {
  if (m.phase2 || m.hp > m.maxHp / 2) return;
  m.phase2 = true;
  this.events.push({ type: 'phase2', name: m.name });
  if (m.ai === 'lich') {
    for (const s of [-1, 1]) {
      const w = this.spawnMonster('wraith', m.x + s * 2, m.y, {});
      w.summoned = true;
      w.aggro = true;
      w.xpMult = 0.5;
    }
  }
  if (m.ai === 'golem') this.hazards.push({ kind: 'edge', size: 1, max: 3.5, pct: 0.06 });
}
