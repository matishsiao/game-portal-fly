// 畫面繪製：把 World 的狀態畫到 canvas。內部單位為像素（1 格 = 16 像素），以整數倍放大、不平滑。
// 只讀取 World 的狀態，不修改遊戲邏輯。

import { AREAS, RARITIES, STATUS } from './data.js';
import { WALL, STAIRS, SPIKES, walkable } from './dungeon.js';
import { heroArt, monsterArt, itemArt } from './sprites.js';

/** 一格的像素數。 */
const T = 16;

/** 各區域的地圖色調：地板兩色、地板斑點（草原為小花）、牆頂、牆面、牆面暗線、地圖外背景。 */
const THEMES = {
  moss: { floor: ['#3b4a33', '#40503a'], speck: '#55683f', top: '#6b7a5a', face: '#2c3626', line: '#222a1e', bg: '#10140e' },
  lava: { floor: ['#3a2a26', '#42302a'], speck: '#7a3a1a', top: '#8a5240', face: '#2a1a18', line: '#1e1210', bg: '#120a08' },
  ice: { floor: ['#2e3f52', '#34485e'], speck: '#4f6f8a', top: '#9fc3dc', face: '#22303f', line: '#18222e', bg: '#0a1018' },
  grass: { floor: ['#5c8a3c', '#64923f'], speck: '#e8d870', top: '#3f6e2e', face: '#2a4a1e', line: '#1c3214', bg: '#101a0a' },
  sky: { floor: ['#c8d4e8', '#d2dcee'], speck: '#ffffff', top: '#f0e6c8', face: '#8a9ab8', line: '#6a7a98', bg: '#5a90c8' },
  necro: { floor: ['#3a3542', '#403a48'], speck: '#6a5a7a', top: '#4a4458', face: '#1e1a24', line: '#141018', bg: '#08060c' },
  abyss: { floor: ['#241a33', '#2a1f3b'], speck: '#4a2f6a', top: '#5a3f78', face: '#160f21', line: '#0e0916', bg: '#07040c' },
};

/**
 * 以格子座標計算固定的雜湊值（地板花紋用）。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @returns {number} 0～1 的值。
 */
function hash(i, j) {
  let h = (i * 374761393 + j * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h & 0xffff) / 0x10000;
}

/** 地城畫面的繪製器。 */
export class Renderer {
  /**
   * 建立繪製器。
   * @param {HTMLCanvasElement} canvas 主畫布。
   * @param {HTMLCanvasElement} minimap 小地圖畫布。
   */
  constructor(canvas, minimap) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimap = minimap;
    this.mctx = minimap.getContext('2d');
    this.scale = 3;
    this.viewW = 240;
    this.viewH = 240;
    this.shakeT = 0;
    this.shakeAmp = 0;
    this.shakeOn = true;
    this.frame = 0;
    this.floorCache = null;
  }

  /**
   * 依畫布的 CSS 大小調整解析度與整數放大倍率（畫面短邊約 11 格）。
   * @returns {void}
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    const target = Math.min(w / (11 * T), h / (11 * T));
    this.scale = Math.max(1, Math.round(target));
    this.viewW = w / this.scale;
    this.viewH = h / this.scale;
  }

  /**
   * 觸發畫面震動。
   * @param {number} amp 幅度（像素）。
   * @param {number} t 持續秒數。
   */
  shake(amp, t) {
    if (!this.shakeOn) return;
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, t);
  }

  /**
   * 預先把整層地圖畫到離屏畫布（地圖不變，每幀只需貼上）。
   * @param {object} world 探險。
   */
  buildFloor(world) {
    const f = world.floor;
    const th = THEMES[AREAS[world.area].theme];
    const c = document.createElement('canvas');
    c.width = f.w * T;
    c.height = f.h * T;
    const g = c.getContext('2d');
    g.fillStyle = th.bg;
    g.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < f.h; j++) {
      for (let i = 0; i < f.w; i++) {
        const t = f.tiles[j * f.w + i];
        const x = i * T;
        const y = j * T;
        if (t === WALL) {
          const below = j + 1 < f.h && walkable(f.tiles[(j + 1) * f.w + i]);
          const near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => walkable(world.tileAt(i + dx, j + dy)));
          if (below) {
            g.fillStyle = th.top;
            g.fillRect(x, y, T, 5);
            g.fillStyle = th.face;
            g.fillRect(x, y + 5, T, T - 5);
            g.fillStyle = th.line;
            g.fillRect(x, y + 10, T, 1);
            g.fillRect(x + (j % 2 ? 4 : 11), y + 5, 1, 5);
            g.fillRect(x + (j % 2 ? 11 : 4), y + 11, 1, 5);
          } else if (near) {
            g.fillStyle = th.top;
            g.fillRect(x, y, T, T);
            g.fillStyle = th.line;
            g.fillRect(x, y + T - 1, T, 1);
          }
          continue;
        }
        g.fillStyle = th.floor[(i + j) % 2];
        g.fillRect(x, y, T, T);
        const r = hash(i, j);
        g.fillStyle = th.speck;
        if (r < 0.35) g.fillRect(x + Math.floor(r * 40) % 13 + 1, y + Math.floor(r * 97) % 13 + 1, 2, 1);
        if (r > 0.8) g.fillRect(x + Math.floor(r * 53) % 12 + 2, y + Math.floor(r * 71) % 12 + 2, 1, 2);
        if (t === STAIRS) {
          g.fillStyle = '#0b0710';
          g.fillRect(x + 1, y + 1, T - 2, T - 2);
          g.fillStyle = th.top;
          for (let k = 0; k < 4; k++) g.fillRect(x + 2 + k, y + 3 + k * 3, T - 4 - k * 2, 2);
          g.fillStyle = '#e8b84a';
          g.fillRect(x + 1, y + 1, T - 2, 1);
        }
        // 樓梯與地刺以外的格子，若上方是牆，畫一條陰影增加立體感。
        if (j > 0 && f.tiles[(j - 1) * f.w + i] === WALL) {
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x, y, T, 3);
        }
      }
    }
    this.floorCache = { canvas: c, floor: f };
  }

  /**
   * 繪製一幀。
   * @param {object} world 探險。
   * @param {number} dt 距離上一幀的秒數（震動衰減用）。
   */
  draw(world, dt) {
    this.frame++;
    if (!this.floorCache || this.floorCache.floor !== world.floor) this.buildFloor(world);
    const g = this.ctx;
    const f = world.floor;
    const p = world.player;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = THEMES[AREAS[world.area].theme].bg;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 相機：以玩家為中心（直向畫面時放在偏上方 40%，下方留給搖桿與按鈕）；位置取整數像素避免模糊。
    const focus = this.viewH > this.viewW * 1.2 ? 0.4 : 0.5;
    let cx = p.x * T - this.viewW / 2;
    let cy = p.y * T - this.viewH * focus;
    // 相機一律跟著玩家（地圖外為黑色），讓角色固定在畫面同一個位置，不被浮在下方的按鈕遮住。
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      cx += (Math.random() - 0.5) * this.shakeAmp * 2;
      cy += (Math.random() - 0.5) * this.shakeAmp * 2;
      if (this.shakeT <= 0) this.shakeAmp = 0;
    }
    cx = Math.round(cx);
    cy = Math.round(cy);
    this.cam = { x: cx, y: cy };
    g.setTransform(this.scale, 0, 0, this.scale, -cx * this.scale, -cy * this.scale);

    g.drawImage(this.floorCache.canvas, 0, 0);
    this.drawDynamicTiles(world);
    this.drawHazards(world);
    this.drawTelegraphs(world);
    this.drawStrikes(world);
    this.drawChestsAndPickups(world);
    this.drawPortal(world);
    this.drawEntities(world);
    this.drawProjectiles(world);
    this.drawEffects(world);
    this.drawFog(world);
    if (this.frame % 6 === 0) this.drawMinimap(world);
  }

  /**
   * 畫面上可見的格子範圍。
   * @returns {{i0: number, j0: number, i1: number, j1: number}} 範圍。
   */
  visible() {
    return {
      i0: Math.floor(this.cam.x / T) - 1,
      j0: Math.floor(this.cam.y / T) - 1,
      i1: Math.ceil((this.cam.x + this.viewW) / T) + 1,
      j1: Math.ceil((this.cam.y + this.viewH) / T) + 1,
    };
  }

  /**
   * 畫會變化的格子：地刺（升起時為尖刺，降下時為小孔）。
   * @param {object} world 探險。
   */
  drawDynamicTiles(world) {
    const g = this.ctx;
    const f = world.floor;
    const v = this.visible();
    const up = world.spikesUp();
    for (let j = Math.max(0, v.j0); j < Math.min(f.h, v.j1); j++) {
      for (let i = Math.max(0, v.i0); i < Math.min(f.w, v.i1); i++) {
        if (f.tiles[j * f.w + i] !== SPIKES) continue;
        const x = i * T;
        const y = j * T;
        g.fillStyle = '#1a1414';
        g.fillRect(x + 1, y + 1, T - 2, T - 2);
        g.fillStyle = '#5a4a4a';
        g.fillRect(x + 1, y + 1, T - 2, 1);
        for (const [dx, dy] of [[3, 4], [10, 4], [3, 11], [10, 11], [6.5, 7.5]]) {
          if (up) {
            g.fillStyle = '#d8dce4';
            g.fillRect(x + dx + 1, y + dy - 3, 1, 4);
            g.fillRect(x + dx, y + dy, 3, 1);
          } else {
            g.fillStyle = '#6a6a72';
            g.fillRect(x + dx + 0.5, y + dy, 2, 1);
          }
        }
      }
    }
  }

  /**
   * 畫持續性危險區域（熔岩魔像第二階段的場地邊緣熔岩）。
   * @param {object} world 探險。
   */
  drawHazards(world) {
    const g = this.ctx;
    for (const h of world.hazards) {
      if (h.kind === 'circle') {
        // 岩漿史萊姆留下的熔岩：冒泡的橘色圓形，最後一秒逐漸淡出。
        const a = Math.min(1, h.life === undefined ? 1 : h.life);
        g.fillStyle = `rgba(255,${100 + Math.round(30 * Math.sin(world.time * 6))},30,${0.55 * a})`;
        g.beginPath();
        g.arc(h.x * T, h.y * T, h.r * T, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = `rgba(255,207,74,${0.9 * a})`;
        g.lineWidth = 1;
        g.stroke();
        if (Math.floor(world.time * 5 + h.x) % 2) {
          g.fillStyle = '#ffcf4a';
          g.fillRect(Math.round(h.x * T + Math.sin(world.time * 3 + h.y) * 5), Math.round(h.y * T - 2), 2, 2);
        }
        continue;
      }
      if (h.kind !== 'edge') continue;
      const r = world.floor.rooms[0];
      const s = h.size * T;
      const x = r.x * T;
      const y = r.y * T;
      const w = r.w * T;
      const hh = r.h * T;
      g.fillStyle = `rgba(255,${90 + Math.round(30 * Math.sin(world.time * 4))},30,0.45)`;
      g.fillRect(x, y, w, s);
      g.fillRect(x, y + hh - s, w, s);
      g.fillRect(x, y + s, s, hh - 2 * s);
      g.fillRect(x + w - s, y + s, s, hh - 2 * s);
      g.strokeStyle = '#ffcf4a';
      g.lineWidth = 1;
      g.strokeRect(x + s, y + s, w - 2 * s, hh - 2 * s);
    }
  }

  /**
   * 畫預警：外框表示範圍，內部填色隨倒數逐漸填滿（同時以形狀與顏色表示）。
   * @param {object} world 探險。
   */
  drawTelegraphs(world) {
    const g = this.ctx;
    for (const tg of world.telegraphs) {
      if (tg.delay > 0) continue;
      const k = Math.max(0, Math.min(1, 1 - tg.t / tg.total));
      const x = tg.x * T;
      const y = tg.y * T;
      g.lineWidth = 1;
      if (tg.shape === 'line' && !tg.dmg) {
        // 瞄準線（弓手、衝刺）：細虛線。
        g.strokeStyle = 'rgba(255,80,80,0.85)';
        g.setLineDash([3, 2]);
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(tg.angle) * tg.len * T, y + Math.sin(tg.angle) * tg.len * T);
        g.stroke();
        g.setLineDash([]);
        if (tg.width > 0.5) {
          g.fillStyle = `rgba(255,60,60,${0.1 + 0.2 * k})`;
          this.linePath(tg);
          g.fill();
        }
        continue;
      }
      if (tg.shape === 'circle' && !tg.dmg) {
        // 施法或現身的提示：閃爍的圓圈。
        g.strokeStyle = `rgba(255,220,120,${0.5 + 0.5 * Math.sin(world.time * 20)})`;
        g.beginPath();
        g.arc(x, y, tg.r * T, 0, Math.PI * 2);
        g.stroke();
        continue;
      }
      g.fillStyle = 'rgba(255,50,50,0.16)';
      g.strokeStyle = 'rgba(255,90,90,0.95)';
      if (tg.shape === 'circle') {
        g.beginPath();
        g.arc(x, y, tg.r * T, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,60,60,0.45)';
        g.beginPath();
        g.arc(x, y, tg.r * T * k, 0, Math.PI * 2);
        g.fill();
        // 中央的「!」記號，讓色弱玩家也能辨識。
        g.fillStyle = '#ffe0e0';
        g.fillRect(x - 0.5, y - 3, 1, 4);
        g.fillRect(x - 0.5, y + 2, 1, 1);
      } else if (tg.shape === 'line') {
        this.linePath(tg);
        g.fill();
        g.stroke();
      } else if (tg.shape === 'ring') {
        // 環狀震波：內外兩圈外框，中間填色隨倒數加深。
        const r1 = tg.r * T;
        const r0 = (tg.r - tg.width) * T;
        g.beginPath();
        g.arc(x, y, r1, 0, Math.PI * 2);
        g.arc(x, y, Math.max(0, r0), 0, Math.PI * 2, true);
        g.fill();
        g.fillStyle = `rgba(255,60,60,${0.15 + 0.35 * k})`;
        g.fill();
        g.beginPath();
        g.arc(x, y, r1, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(x, y, Math.max(0, r0), 0, Math.PI * 2);
        g.stroke();
      } else {
        const r = tg.r * T;
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, r, tg.angle - tg.arc / 2, tg.angle + tg.arc / 2);
        g.closePath();
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,60,60,0.4)';
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, r * k, tg.angle - tg.arc / 2, tg.angle + tg.arc / 2);
        g.closePath();
        g.fill();
      }
    }
  }

  /**
   * 畫玩家技能的落點（箭雨、隕石、狙擊）：金色虛線外框，與怪物的紅色預警區分。
   * @param {object} world 探險。
   */
  drawStrikes(world) {
    const g = this.ctx;
    g.strokeStyle = 'rgba(232,184,74,0.95)';
    g.fillStyle = 'rgba(232,184,74,0.15)';
    g.lineWidth = 1;
    g.setLineDash([3, 2]);
    for (const st of world.strikes) {
      if (st.trap > 0) {
        // 捕獸夾：地上的鐵夾與淡淡的觸發範圍。
        const x = Math.round(st.x * T);
        const y = Math.round(st.y * T);
        g.setLineDash([]);
        g.strokeStyle = 'rgba(232,184,74,0.35)';
        g.beginPath();
        g.arc(x, y, st.r * 0.5 * T, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#1a1020';
        g.fillRect(x - 5, y - 1, 11, 3);
        g.fillStyle = '#9aa3b5';
        for (let k = -4; k <= 4; k += 2) g.fillRect(x + k, y - 2 - (k % 4 === 0 ? 1 : 0), 1, 2);
        g.fillRect(x - 4, y, 9, 1);
        g.setLineDash([3, 2]);
        g.strokeStyle = 'rgba(232,184,74,0.95)';
        continue;
      }
      if (st.shape === 'arc') continue;
      if (st.shape === 'line') {
        this.linePath(st);
        g.fill();
        g.stroke();
      } else {
        g.beginPath();
        g.arc(st.x * T, st.y * T, st.r * T, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    }
    g.setLineDash([]);
  }

  /**
   * 建立直線預警的矩形路徑。
   * @param {object} tg 預警。
   */
  linePath(tg) {
    const g = this.ctx;
    const x = tg.x * T;
    const y = tg.y * T;
    const len = tg.len * T;
    const w = (tg.width * T) / 2;
    const c = Math.cos(tg.angle);
    const s = Math.sin(tg.angle);
    g.beginPath();
    g.moveTo(x - s * w, y + c * w);
    g.lineTo(x + c * len - s * w, y + s * len + c * w);
    g.lineTo(x + c * len + s * w, y + s * len - c * w);
    g.lineTo(x + s * w, y - c * w);
    g.closePath();
  }

  /**
   * 畫寶箱與地上的拾取物。
   * @param {object} world 探險。
   */
  drawChestsAndPickups(world) {
    const g = this.ctx;
    for (const c of world.chests) {
      const img = itemArt(c.opened ? 'chestOpen' : 'chest');
      g.drawImage(img, Math.round(c.x * T - img.width / 2), Math.round(c.y * T - img.height / 2));
    }
    for (const it of world.pickups) {
      const bob = Math.round(Math.sin(world.time * 5 + it.x) * 1);
      const name = it.kind === 'gem' ? `gem-${it.gem.split('-')[0]}` : { gold: 'coin', potion: 'potion', bagExpand: 'pouch' }[it.kind] || 'bag';
      const img = itemArt(name);
      const x = Math.round(it.x * T - img.width / 2);
      const y = Math.round(it.y * T - img.height / 2) + bob;
      if (it.kind === 'item') {
        // 裝備：以稀有度顏色的光柱標示。
        g.fillStyle = RARITIES[it.item.rarity].color;
        g.globalAlpha = 0.35;
        g.fillRect(x + 1, y - 8, img.width - 2, 8);
        g.globalAlpha = 1;
      } else if (it.kind === 'gem') {
        // 寶石：一閃一閃的白色十字光。
        const tw = Math.floor(world.time * 4 + it.x * 3) % 4 === 0;
        if (tw) {
          g.fillStyle = '#ffffff';
          g.fillRect(x + img.width - 2, y - 3, 1, 5);
          g.fillRect(x + img.width - 4, y - 1, 5, 1);
        }
      }
      g.drawImage(img, x, y);
    }
  }

  /**
   * 畫回城傳送點（擊敗 Boss 後出現）。
   * @param {object} world 探險。
   */
  drawPortal(world) {
    const pt = world.floor.portal;
    if (!world.portalOpen || !pt) return;
    const g = this.ctx;
    const x = pt.x * T;
    const y = pt.y * T;
    const pulse = 1 + 0.08 * Math.sin(world.time * 6);
    g.fillStyle = 'rgba(232,184,74,0.35)';
    g.beginPath();
    g.ellipse(x, y, 10 * pulse, 6 * pulse, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#9a7ad0';
    g.beginPath();
    g.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f0e6ff';
    g.fillRect(Math.round(x) - 1, Math.round(y - 12 - 2 * Math.sin(world.time * 4)), 2, 5);
  }

  /**
   * 依 y 座標排序後畫玩家與怪物（含影子、血條、菁英標記）。
   * @param {object} world 探險。
   */
  drawEntities(world) {
    const g = this.ctx;
    const p = world.player;
    if (p.path.length) {
      // 點地移動的目的地：金色的十字與圓圈。
      const end = p.path[p.path.length - 1];
      const ex = Math.round(end.x * T);
      const ey = Math.round(end.y * T);
      g.strokeStyle = `rgba(232,184,74,${0.6 + 0.4 * Math.sin(world.time * 8)})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(ex, ey, 5, 2.5, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#e8b84a';
      g.fillRect(ex - 2, ey, 5, 1);
      g.fillRect(ex, ey - 2, 1, 5);
    }
    const list = world.monsters.map((m) => ({ m, y: m.y }));
    list.push({ p, y: p.y });
    list.sort((a, b) => a.y - b.y);
    const walkFrame = Math.floor(world.time * 6) % 2;
    for (const e of list) {
      if (e.p) {
        const art = heroArt(world.ch.cls);
        const blink = p.invuln > 0 && p.hurt > -0.3 && Math.floor(world.time * 16) % 2 === 0;
        // 走路循環：抬左腳 → 站立 → 抬右腳 → 站立。
        const step = [1, 0, 2, 0][Math.floor(world.time * 8) % 4];
        // 攻擊或施放技能時依方向切到出手姿勢：側面（左右翻轉）、朝下（正面）、朝上（背影）。
        const acting = p.attackAnim > 0 || p.skillAnim > 0;
        const vertical = Math.abs(p.facing.y) > Math.abs(p.facing.x) * 1.2;
        const pose = !acting ? null : vertical ? (p.facing.y > 0 ? 'down' : 'up') : 'side';
        const frame = { side: 3, down: 4, up: 5 }[pose] ?? (p.moving ? step : 0);
        const img = (p.hurt > 0.15 ? art.flash : art.frames)[frame];
        const flip = p.facing.x < 0;
        const lunge = acting ? 2 : 0;
        // 手的位置（相對於腳底中心的像素）：武器從這裡揮出。
        const hand = { side: { x: flip ? -6 : 6, y: -5 }, down: { x: 0, y: -3 }, up: { x: 0, y: -8 } }[pose || 'side'];
        const px = p.x * T + p.facing.x * lunge;
        const py = p.y * T + p.facing.y * lunge;
        const bob = !p.moving && Math.floor(world.time * 2) % 2 ? 1 : 0;
        this.shadow(p.x, p.y, 5);
        if (p.buffT > 0) {
          // 戰吼中：腳下金色光環。
          g.strokeStyle = `rgba(232,184,74,${0.6 + 0.3 * Math.sin(world.time * 10)})`;
          g.lineWidth = 1;
          g.beginPath();
          g.ellipse(p.x * T, p.y * T + 3, 8, 3.5, 0, 0, Math.PI * 2);
          g.stroke();
        }
        if (p.dodgeT > 0) g.globalAlpha = 0.55;
        // 出手的彈性：前段蓄力（變矮變寬），後段伸展（變高變窄）。
        const ak = acting ? 1 - Math.max(p.attackAnim / 0.18, p.skillAnim / 0.25) : 1;
        const sy = acting ? (ak < 0.35 ? 0.9 : 1.06) : 1;
        // 朝上攻擊時武器在身體後面，其他方向在前面。
        if (p.attackAnim > 0 && pose === 'up') this.weapon(world, px + hand.x, py + hand.y);
        if (!blink || p.dodgeT > 0) this.sprite(img, px / T, py / T, flip, 1, bob, sy);
        g.globalAlpha = 1;
        if (p.attackAnim > 0 && pose !== 'up') this.weapon(world, px + hand.x, py + hand.y);
        this.drawPlayerAuras(world);
        this.statusMarks(world, p.x * T, Math.round(p.y * T) - 24, p.status);
        continue;
      }
      const m = e.m;
      if (m.invisible) {
        if (m.ai === 'worm') {
          // 鑽地中的熔岩蟲：地面隆起的土堆。
          g.fillStyle = '#5a3020';
          g.fillRect(Math.round(m.x * T) - 4, Math.round(m.y * T) - 1, 8, 3);
          g.fillStyle = '#ff6a2a';
          if (Math.floor(world.time * 8) % 2) g.fillRect(Math.round(m.x * T) - 1, Math.round(m.y * T) - 2, 2, 1);
        }
        continue;
      }
      const art = monsterArt(m.type, m.evolved);
      const frames = m.hurt > 0 ? art.flash : art.frames;
      const img = frames[walkFrame % frames.length];
      const scale = art.scale * (m.elite ? 1.25 : 1) * (m.small ? 0.7 : 1) * (m.evolved ? 1.15 : 1);
      const bob = art.frames.length === 1 ? (walkFrame ? 1 : 0) : 0;
      this.shadow(m.x, m.y, m.r * T * 0.9);
      if (m.elite) {
        g.strokeStyle = '#e8b84a';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(m.x * T, m.y * T + m.r * T * 0.5, m.r * T, m.r * T * 0.45, 0, 0, Math.PI * 2);
        g.stroke();
      }
      if (m.evolved) {
        // 進化 Boss：腳下脈動的紅金色光環。
        const pulse = 0.5 + 0.5 * Math.sin(world.time * 5);
        g.strokeStyle = `rgba(255,${90 + Math.round(90 * pulse)},60,${0.55 + 0.35 * pulse})`;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(m.x * T, m.y * T + m.r * T * 0.5, m.r * T * 1.25, m.r * T * 0.55, 0, 0, Math.PI * 2);
        g.stroke();
      }
      if (m.state === 'healing') {
        // Boss 回復中：腳下綠色光環與上升的十字光點。
        const k = 1 - Math.max(0, m.t) / 2;
        g.strokeStyle = `rgba(95,208,104,${0.5 + 0.4 * Math.sin(world.time * 12)})`;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(m.x * T, m.y * T + m.r * T * 0.5, m.r * T * 1.4, m.r * T * 0.6, 0, 0, Math.PI * 2 * Math.max(0.05, k));
        g.stroke();
        g.fillStyle = '#8af09a';
        for (let n = 0; n < 4; n++) {
          const ph = (world.time * 0.9 + n / 4) % 1;
          const px = Math.round(m.x * T + Math.cos(n * 1.7) * m.r * T);
          const py = Math.round(m.y * T - ph * 26);
          g.fillRect(px - 2, py, 5, 1);
          g.fillRect(px, py - 2, 1, 5);
        }
      }
      // 沉睡的石像鬼是灰白的石像，甦醒後才恢復顏色。
      const dormant = m.ai === 'gargoyle' && !m.awake;
      g.globalAlpha = art.alpha * (m.intangible ? 0.5 : 1) * (dormant ? 0.75 : 1);
      if (dormant) g.filter = 'grayscale(1) brightness(1.2)';
      if (m.evolved) {
        // 進化 Boss 身上的外光：身體後方的紅金色光暈，加上沿著輪廓發光。
        const pulse = 0.5 + 0.5 * Math.sin(world.time * 4);
        const cy = m.y * T + 5 * Math.min(scale, 1.5) - (img.height * scale) / 2;
        const glow = g.createRadialGradient(m.x * T, cy, 0, m.x * T, cy, img.width * scale * 0.9);
        glow.addColorStop(0, `rgba(255,170,60,${0.35 + 0.15 * pulse})`);
        glow.addColorStop(1, 'rgba(255,90,40,0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(m.x * T, cy, img.width * scale * 0.9, 0, Math.PI * 2);
        g.fill();
        g.shadowColor = `rgba(255,${150 + Math.round(70 * pulse)},70,0.95)`;
        g.shadowBlur = 6 * this.scale;
      }
      // 蓄力中的怪物上下抖動，配合地面預警。
      const shakeX = m.state === 'windup' || m.state === 'charge' || m.state === 'aim' || m.state === 'cast' ? (walkFrame ? 0.5 : -0.5) : 0;
      this.sprite(img, m.x + shakeX / T, m.y, world.player.x < m.x, scale, dormant ? 0 : bob);
      g.globalAlpha = 1;
      g.filter = 'none';
      g.shadowBlur = 0;
      const top = Math.round(m.y * T - (img.height * scale) / 2 - 10 - m.r * T * 0.3);
      if (m.status) this.statusMarks(world, m.x * T, top - 4, m.status);
      if (m.stun > 0) {
        // 暈眩：頭上旋轉的星星。
        g.fillStyle = '#ffe14d';
        for (let k = 0; k < 3; k++) {
          const a = world.time * 6 + (k * Math.PI * 2) / 3;
          g.fillRect(Math.round(m.x * T + Math.cos(a) * 5) - 1, top + Math.round(Math.sin(a) * 2) - 1, 2, 2);
        }
      } else if (m.slow > 0) {
        // 緩速：頭上的藍色雪花記號。
        g.fillStyle = '#7ac8ff';
        g.fillRect(Math.round(m.x * T) - 2, top, 5, 1);
        g.fillRect(Math.round(m.x * T), top - 2, 1, 5);
      }
      if (!m.boss && (m.hp < m.maxHp || m.elite)) {
        const w = Math.max(10, Math.round(m.r * T * 2));
        const x = Math.round(m.x * T - w / 2);
        const y = Math.round(m.y * T - (img.height * scale) / 2 - 6 - m.r * T * 0.3);
        g.fillStyle = '#1a1020';
        g.fillRect(x - 1, y - 1, w + 2, 4);
        g.fillStyle = m.elite ? '#e8b84a' : '#e04a5a';
        g.fillRect(x, y, Math.max(0, Math.round((w * m.hp) / m.maxHp)), 2);
      }
    }
  }

  /**
   * 畫玩家身上的效果：血量護盾（藍白色泡泡與剩餘量）、抗異常護盾（紫色光環）、鐵壁、嗜血與疾風步。
   * @param {object} world 探險。
   */
  drawPlayerAuras(world) {
    const g = this.ctx;
    const p = world.player;
    const x = p.x * T;
    const y = p.y * T - 6;
    const t = world.time;
    if (p.shield > 0) {
      g.fillStyle = `rgba(200,230,255,${0.16 + 0.06 * Math.sin(t * 6)})`;
      g.strokeStyle = 'rgba(232,244,255,0.85)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(x, y, 11, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    if (p.wardT > 0) {
      g.strokeStyle = `rgba(200,168,255,${0.55 + 0.3 * Math.sin(t * 5)})`;
      g.lineWidth = 1;
      g.setLineDash([2, 2]);
      g.lineDashOffset = -t * 12;
      g.beginPath();
      g.arc(x, y, 13, 0, Math.PI * 2);
      g.stroke();
      g.setLineDash([]);
      g.lineDashOffset = 0;
    }
    if (p.guardT > 0) {
      g.strokeStyle = 'rgba(180,190,210,0.8)';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y, 9, Math.PI * 0.9, Math.PI * 2.1);
      g.stroke();
    }
    if (p.leechT > 0 || p.hasteT > 0) {
      g.fillStyle = p.leechT > 0 ? '#ff5a6a' : '#c8f0ff';
      for (let n = 0; n < 3; n++) {
        const ph = (t * 1.5 + n / 3) % 1;
        g.fillRect(Math.round(x + Math.cos(n * 2.1 + t) * 7), Math.round(y + 8 - ph * 18), 1, 2);
      }
    }
  }

  /**
   * 頭上的異常狀態記號：中毒（上升的綠色泡泡）、睡眠（飄動的 z）、暈眩（旋轉的星星）。
   * @param {object} world 探險。
   * @param {number} cx 中心 x（像素）。
   * @param {number} top 記號的高度（像素）。
   * @param {{poison?: number, sleep?: number, stun?: number}} st 狀態。
   */
  statusMarks(world, cx, top, st) {
    const g = this.ctx;
    const t = world.time;
    if (st.poison > 0) {
      g.fillStyle = STATUS.poison.color;
      for (let n = 0; n < 3; n++) {
        const ph = (t * 1.2 + n / 3) % 1;
        g.fillRect(Math.round(cx - 4 + n * 4), Math.round(top + 6 - ph * 8), 2, 2);
      }
    }
    if (st.sleep > 0) {
      g.font = 'bold 6px system-ui, sans-serif';
      g.textAlign = 'center';
      for (let n = 0; n < 2; n++) {
        const ph = (t * 0.8 + n / 2) % 1;
        g.fillStyle = `rgba(154,184,255,${1 - ph})`;
        g.fillText('z', Math.round(cx + 3 + ph * 5), Math.round(top - ph * 7));
      }
    }
    if (st.stun > 0) {
      g.fillStyle = STATUS.stun.color;
      for (let k = 0; k < 3; k++) {
        const a = t * 6 + (k * Math.PI * 2) / 3;
        g.fillRect(Math.round(cx + Math.cos(a) * 5) - 1, top + 2 + Math.round(Math.sin(a) * 2) - 1, 2, 2);
      }
    }
  }

  /**
   * 畫影子。
   * @param {number} x 座標 x（格）。
   * @param {number} y 座標 y（格）。
   * @param {number} r 半徑（像素）。
   */
  shadow(x, y, r) {
    const g = this.ctx;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(x * T, y * T + r * 0.6, r, r * 0.4, 0, 0, Math.PI * 2);
    g.fill();
  }

  /**
   * 畫一張像素圖：底部對齊實體位置稍下方，可左右翻轉與放大。
   * @param {HTMLCanvasElement} img 圖。
   * @param {number} x 座標 x（格）。
   * @param {number} y 座標 y（格）。
   * @param {boolean} flip 是否左右翻轉。
   * @param {number} scale 放大倍率。
   * @param {number} bob 上下偏移（像素）。
   * @param {number} [sy=1] 垂直伸縮（攻擊時的彈性，寬度反向調整以維持份量）。
   */
  sprite(img, x, y, flip, scale, bob, sy = 1) {
    const g = this.ctx;
    const w = img.width * scale * (2 - sy);
    const h = img.height * scale * sy;
    const px = Math.round(x * T - w / 2);
    const py = Math.round(y * T + 5 * Math.min(scale, 1.5) - h) + bob;
    if (flip) {
      g.save();
      g.translate(px + w, py);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0, w, h);
      g.restore();
    } else {
      g.drawImage(img, px, py, w, h);
    }
  }

  /**
   * 攻擊時畫出武器（戰士的劍、弓箭手的弓、法師的法杖），以手的位置為支點朝攻擊方向揮出。
   * @param {object} world 探險。
   * @param {number} hx 手的位置 x（像素）。
   * @param {number} hy 手的位置 y（像素）。
   */
  weapon(world, hx, hy) {
    const g = this.ctx;
    const p = world.player;
    const k = Math.min(1, 1 - p.attackAnim / 0.18);
    const ease = 1 - (1 - k) ** 3;
    const a = Math.atan2(p.facing.y, p.facing.x);
    g.save();
    g.translate(Math.round(hx), Math.round(hy));
    if (world.ch.cls === 'warrior') {
      // 劍從面向的一側揮到另一側（120°）。
      g.rotate(a - 1.05 + 2.1 * ease);
      g.fillStyle = '#1a1020';
      g.fillRect(3, -2, 14, 4);
      g.fillStyle = '#d8dee8';
      g.fillRect(5, -1, 11, 2);
      g.fillStyle = '#ffffff';
      g.fillRect(5, -1, 11, 1);
      g.fillStyle = '#e8b84a';
      g.fillRect(4, -3, 2, 6);
      g.fillStyle = '#6b4226';
      g.fillRect(2, -1, 2, 2);
    } else if (world.ch.cls === 'archer') {
      // 弓：前半段拉弓（弦往後），放箭後弦彈回。
      g.rotate(a);
      const pull = k < 0.4 ? 3 : 0;
      g.strokeStyle = '#1a1020';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(3, 0, 7, -1.15, 1.15);
      g.stroke();
      g.strokeStyle = '#b07a3e';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(3, 0, 7, -1.15, 1.15);
      g.stroke();
      g.strokeStyle = '#f0e6d0';
      g.lineWidth = 0.7;
      g.beginPath();
      g.moveTo(3 + Math.cos(-1.15) * 7, Math.sin(-1.15) * 7);
      g.lineTo(3 + Math.cos(-1.15) * 7 - pull, 0);
      g.lineTo(3 + Math.cos(1.15) * 7, Math.sin(1.15) * 7);
      g.stroke();
    } else {
      // 法杖往前舉，杖頭寶石發光。
      g.rotate(a);
      const reach = 2 + 3 * Math.sin(Math.PI * k);
      g.fillStyle = '#1a1020';
      g.fillRect(reach - 1, -2, 12, 4);
      g.fillStyle = '#8a5a2a';
      g.fillRect(reach, -1, 10, 2);
      const glow = g.createRadialGradient(reach + 12, 0, 0, reach + 12, 0, 7);
      glow.addColorStop(0, 'rgba(230,210,255,0.95)');
      glow.addColorStop(1, 'rgba(154,122,208,0)');
      g.fillStyle = glow;
      g.fillRect(reach + 5, -7, 14, 14);
      g.fillStyle = '#c8a8ff';
      g.fillRect(reach + 10, -2, 4, 4);
      g.fillStyle = '#ffffff';
      g.fillRect(reach + 11, -1, 1, 1);
    }
    g.restore();
  }


  /**
   * 畫投射物：箭、法球、火球、冰彈。
   * @param {object} world 探險。
   */
  drawProjectiles(world) {
    const g = this.ctx;
    for (const pr of world.projectiles) {
      const x = pr.x * T;
      const y = pr.y * T - 3;
      const a = Math.atan2(pr.vy, pr.vx);
      if (pr.kind === 'arrow') {
        // 箭：殘影線、箭身、銀色箭頭與箭羽。
        const mine = pr.team === 'p';
        g.save();
        g.translate(x, y);
        g.rotate(a);
        // 毒箭是綠色、催眠箭是粉紫色的殘影與箭頭。
        const tint = { venom: ['rgba(140,220,90,0.6)', '#9ae05a'], lullaby: ['rgba(230,170,255,0.6)', '#f0c8ff'] }[pr.look];
        g.strokeStyle = tint ? tint[0] : mine ? 'rgba(255,240,200,0.35)' : 'rgba(255,120,120,0.35)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-16, 0);
        g.lineTo(-6, 0);
        g.stroke();
        g.fillStyle = '#1a1020';
        g.fillRect(-7, -1, 11, 2);
        g.fillStyle = mine ? '#c89a5a' : '#8a6a5a';
        g.fillRect(-6, -0.5, 8, 1);
        g.fillStyle = tint ? tint[1] : mine ? '#e8eef5' : '#ff8a8a';
        g.beginPath();
        g.moveTo(5, 0);
        g.lineTo(1, -2);
        g.lineTo(1, 2);
        g.closePath();
        g.fill();
        g.fillStyle = mine ? '#e04a5a' : '#5a3a3a';
        g.fillRect(-7, -2, 2, 1);
        g.fillRect(-7, 1, 2, 1);
        g.restore();
        continue;
      }
      const colors = { orb: ['200,168,255', '#c8a8ff'], fire: ['255,120,40', '#ff8a3a'], ice: ['122,200,255', '#9ad8ff'], seed: ['140,200,90', '#8ac85a'], feather: ['240,240,250', '#e8e8f4'], curse: ['160,90,210', '#a05ad2'] }[pr.look === 'fireball' ? 'fire' : pr.kind] || ['255,255,255', '#fff'];
      const r = pr.r * T;
      // 拖尾：沿飛行反方向的幾個淡色圓點。
      const sp = Math.hypot(pr.vx, pr.vy) || 1;
      for (let n = 3; n >= 1; n--) {
        g.fillStyle = `rgba(${colors[0]},${0.18 * (4 - n)})`;
        g.beginPath();
        g.arc(x - (pr.vx / sp) * n * 3, y - (pr.vy / sp) * n * 3, r * (1 - n * 0.18), 0, Math.PI * 2);
        g.fill();
      }
      const glow = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
      glow.addColorStop(0, `rgba(${colors[0]},0.6)`);
      glow.addColorStop(1, `rgba(${colors[0]},0)`);
      g.fillStyle = glow;
      g.beginPath();
      g.arc(x, y, r * 2.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = colors[1];
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x - r * 0.25, y - r * 0.25, r * 0.4, 0, Math.PI * 2);
      g.fill();
    }
  }


  /**
   * 畫效果：斬擊、爆炸、消失的煙霧、升級、傷害數字。
   * @param {object} world 探險。
   */
  drawEffects(world) {
    const g = this.ctx;
    for (const e of world.effects) {
      const k = e.t / e.life;
      const x = e.x * T;
      const y = e.y * T;
      if (e.kind === 'slash') {
        // 新月形刀光：快速掃過 120°，之後逐漸淡出。
        const arc = e.arc || 2.1;
        const start = e.angle - arc / 2;
        const end = start + arc * Math.min(1, k * 2.5);
        const outer = e.range * T + 2;
        const inner = outer * 0.5;
        const fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
        const grad = g.createRadialGradient(x, y - 3, inner, x, y - 3, outer);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, `rgba(200,225,255,${0.45 * fade})`);
        grad.addColorStop(1, `rgba(255,255,255,${0.95 * fade})`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y - 3, outer, start, end);
        g.arc(x, y - 3, inner, end, start, true);
        g.closePath();
        g.fill();
        g.strokeStyle = `rgba(255,236,170,${0.9 * fade})`;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y - 3, outer, start, end);
        g.stroke();
      } else if (e.kind === 'hit') {
        // 命中火花：從命中點向外的短光線。
        g.strokeStyle = `rgba(255,248,220,${1 - k})`;
        g.lineWidth = 1;
        for (let n = 0; n < 5; n++) {
          const a = e.angle + (n - 2) * 0.55;
          const r0 = 2 + 3 * k;
          const r1 = r0 + 4 * (1 - k);
          g.beginPath();
          g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
          g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
          g.stroke();
        }
        g.fillStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
        g.beginPath();
        g.arc(x, y, 3 * (1 - k), 0, Math.PI * 2);
        g.fill();
      } else if (e.kind === 'cast') {
        // 出手的閃光：弓箭是白色、法球是紫色。
        const c = e.look === 'orb' ? '200,168,255' : '255,250,230';
        g.strokeStyle = `rgba(${c},${1 - k})`;
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x, y, 2 + 5 * k, e.angle - 1, e.angle + 1);
        g.stroke();
      } else if (e.kind === 'blast' && e.friendly && !e.look) {
        // 法球爆炸：擴散的光環加上中心閃光。
        const r = (e.r || 1) * T;
        const flash = g.createRadialGradient(x, y, 0, x, y, r);
        flash.addColorStop(0, `rgba(255,255,255,${0.7 * (1 - k)})`);
        flash.addColorStop(1, `rgba(154,122,208,${0.25 * (1 - k)})`);
        g.fillStyle = flash;
        g.beginPath();
        g.arc(x, y, r * (0.5 + 0.5 * k), 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = `rgba(220,200,255,${1 - k})`;
        g.lineWidth = 2.5 * (1 - k) + 0.5;
        g.beginPath();
        g.arc(x, y, r * (0.4 + 0.7 * k), 0, Math.PI * 2);
        g.stroke();
      } else if (e.kind === 'blast') {
        const looks = {
          nova: '150,210,255', spin: '255,255,255', slam: '210,170,110', rain: '240,224,176', beam: '255,240,170', meteor: '255,150,60',
          trap: '232,184,74', starfall: '255,230,140', hypnosis: '220,150,255', miasma: '120,200,80', thunder: '210,235,255', freeze: '170,200,255',
        };
        g.fillStyle = e.friendly ? `rgba(${looks[e.look] || '200,168,255'},${0.6 * (1 - k)})` : `rgba(255,140,60,${0.55 * (1 - k)})`;
        if (e.shape === 'ring') {
          g.beginPath();
          g.arc(x, y, e.r * T, 0, Math.PI * 2);
          g.arc(x, y, Math.max(0, (e.r - (e.width || 1)) * T), 0, Math.PI * 2, true);
          g.fill();
        } else if (e.shape === 'circle' || !e.shape) {
          g.beginPath();
          g.arc(x, y, (e.r || 1) * T, 0, Math.PI * 2);
          g.fill();
        } else if (e.shape === 'line') {
          this.linePath({ x: e.x, y: e.y, angle: e.angle, len: e.len, width: e.width });
          g.fill();
        } else {
          g.beginPath();
          g.moveTo(x, y);
          g.arc(x, y, e.r * T, e.angle - e.arc / 2, e.angle + e.arc / 2);
          g.closePath();
          g.fill();
        }
      } else if (e.kind === 'poof' || e.kind === 'dust') {
        g.fillStyle = e.color || (e.kind === 'dust' ? 'rgba(220,210,200,0.6)' : 'rgba(255,255,255,0.8)');
        const r = (e.r || 0.3) * T * (0.5 + k);
        for (let n = 0; n < 6; n++) {
          const a = (n / 6) * Math.PI * 2;
          g.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 2, 2);
        }
      } else if (e.kind === 'levelup') {
        g.font = 'bold 8px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = '#1a1020';
        g.fillText(e.text || 'LEVEL UP', x + 1, y - 14 - k * 10 + 1);
        g.fillStyle = '#e8b84a';
        g.fillText(e.text || 'LEVEL UP', x, y - 14 - k * 10);
      } else if (e.kind === 'bolt') {
        // 連鎖閃電：依序連接每個被擊中的點，帶一點鋸齒。
        g.strokeStyle = `rgba(200,230,255,${1 - k})`;
        g.lineWidth = 1.5;
        g.beginPath();
        e.points.forEach((pt, n) => {
          const px = pt.x * T;
          const py = pt.y * T - 4;
          if (n === 0) g.moveTo(px, py);
          else {
            const prev = e.points[n - 1];
            g.lineTo((prev.x * T + px) / 2 + (n % 2 ? 3 : -3), (prev.y * T - 4 + py) / 2 + (n % 2 ? -3 : 3));
            g.lineTo(px, py);
          }
        });
        g.stroke();
      } else if (e.kind === 'text') {
        // 傷害數字：出現時先放大再縮回，之後往上飄並淡出。
        const pop = k < 0.12 ? 1.7 - (k / 0.12) * 0.7 : 1;
        g.font = `bold ${(7 * pop).toFixed(1)}px system-ui, sans-serif`;
        g.textAlign = 'center';
        g.globalAlpha = 1 - k * k;
        g.fillStyle = '#1a1020';
        g.fillText(e.text, x + 0.7, y - k * 8 + 0.7);
        g.fillStyle = e.color;
        g.fillText(e.text, x, y - k * 8);
        g.globalAlpha = 1;
      }
    }
  }

  /**
   * 戰爭迷霧：未探索的格子全黑，已探索但不在視野內的格子變暗。
   * @param {object} world 探險。
   */
  drawFog(world) {
    const g = this.ctx;
    const f = world.floor;
    const v = this.visible();
    const p = world.player;
    for (let j = v.j0; j < v.j1; j++) {
      for (let i = v.i0; i < v.i1; i++) {
        const inside = i >= 0 && j >= 0 && i < f.w && j < f.h;
        if (!inside || !world.explored[j * f.w + i]) {
          g.fillStyle = '#05030a';
          g.fillRect(i * T, j * T, T, T);
          continue;
        }
        const d = (i + 0.5 - p.x) ** 2 + (j + 0.5 - p.y) ** 2;
        if (d > 30 && !f.boss) {
          g.fillStyle = 'rgba(5,3,10,0.5)';
          g.fillRect(i * T, j * T, T, T);
        }
      }
    }
  }

  /**
   * 小地圖：已探索的地板、樓梯、玩家與 Boss。
   * @param {object} world 探險。
   */
  drawMinimap(world) {
    const c = this.minimap;
    if (!c || c.offsetParent === null) return;
    const f = world.floor;
    const s = 3;
    if (c.width !== f.w * s || c.height !== f.h * s) {
      c.width = f.w * s;
      c.height = f.h * s;
    }
    const g = this.mctx;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(10,6,16,0.75)';
    g.fillRect(0, 0, c.width, c.height);
    for (let j = 0; j < f.h; j++) {
      for (let i = 0; i < f.w; i++) {
        const idx = j * f.w + i;
        if (!world.explored[idx] || !walkable(f.tiles[idx])) continue;
        g.fillStyle = f.tiles[idx] === STAIRS ? '#e8b84a' : '#8a7a9a';
        g.fillRect(i * s, j * s, s, s);
      }
    }
    if (world.floor.stairs) {
      const st = world.floor.stairs;
      if (world.explored[Math.floor(st.y) * f.w + Math.floor(st.x)]) {
        g.fillStyle = '#e8b84a';
        g.fillRect(Math.floor(st.x) * s - 1, Math.floor(st.y) * s - 1, s + 2, s + 2);
      }
    }
    const boss = world.boss();
    if (boss && boss.evolved) {
      // 進化 Boss：較大的紅金色閃爍標記。
      const on = Math.floor(world.time * 4) % 2 === 0;
      g.fillStyle = on ? '#ffcf4a' : '#ff4d4d';
      g.fillRect(Math.round(boss.x * s) - 4, Math.round(boss.y * s) - 4, 8, 8);
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1;
      g.strokeRect(Math.round(boss.x * s) - 4.5, Math.round(boss.y * s) - 4.5, 9, 9);
    } else if (boss) {
      g.fillStyle = '#ff4d4d';
      g.fillRect(Math.round(boss.x * s) - 2, Math.round(boss.y * s) - 2, 4, 4);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(world.player.x * s) - 2, Math.round(world.player.y * s) - 2, 4, 4);
  }

  /**
   * 把畫面座標（CSS 像素，相對於畫布）轉成地圖座標（格）。
   * @param {number} sx 畫面 x。
   * @param {number} sy 畫面 y。
   * @returns {{x: number, y: number}} 地圖座標。
   */
  screenToWorld(sx, sy) {
    const dpr = window.devicePixelRatio || 1;
    return { x: ((sx * dpr) / this.scale + this.cam.x) / T, y: ((sy * dpr) / this.scale + this.cam.y) / T };
  }
}
