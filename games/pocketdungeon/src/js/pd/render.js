// 畫面繪製：把 World 的狀態畫到 canvas。內部單位為像素（1 格 = 16 像素），以整數倍放大、不平滑。
// 只讀取 World 的狀態，不修改遊戲邏輯。

import { AREAS, RARITIES, STATUS } from './data.js';
import { WALL, STAIRS, SPIKES, walkable } from './dungeon.js';
import { heroArt, monsterArt, itemArt } from './sprites.js';
import { PROP_SPRITES } from './propSprites.js';
import { DUNGEON_TILES } from './dungeonTiles.js';

/** 一格的像素數。 */
const T = 16;
/** 普通攻擊的出手動畫長度（秒，與 World.playerAttack 設定的 attackAnim 相同）。 */
const ATTACK_TIME = 0.24;
/** 地城中角色圖的目標顯示密度（每個世界像素約 2 個圖像素，角色約 1 格高）；實際值依放大倍率取能整除的值（Renderer.heroDensity）。 */
const HERO_DENSITY = 2;
/** 技能與爆炸的顏色（RGB），依效果樣式（look）區分；沒有樣式的友方爆炸為紫色、敵方為橘色。 */
const LOOK_COLORS = {
  nova: '150,210,255', spin: '255,255,255', slam: '210,170,110', rain: '240,224,176', beam: '255,240,170', meteor: '255,150,60',
  trap: '232,184,74', starfall: '255,230,140', hypnosis: '220,150,255', miasma: '120,200,80', thunder: '210,235,255', freeze: '170,200,255',
  chi: '255,200,120', smoke: '190,190,205', shadow: '150,100,200',
};
/** 各職業施放技能時的光（RGB）。 */
const CLASS_FX = { warrior: '120,180,255', archer: '255,220,120', mage: '200,140,255', thief: '190,120,255', monk: '255,170,60', knight: '255,225,130' };
/** 同時存在的特效粒子上限。 */
const FX_MAX = 700;
/** 地面痕跡（焦痕、冰霜、毒液、裂痕）的上限。 */
const DECAL_MAX = 40;

/**
 * 怪物與 Boss 攻擊的屬性外觀：rgb 主色、core 核心亮色、bits 飛散的粒子（ember 餘燼、shard 冰晶、bubble 氣泡、zap 落雷、
 * wisp 暗影、rock 碎石、drop 水滴、spark 金屬火花、feather 羽毛）、smoke 煙霧色（省略時不冒煙）、decal 地面痕跡色（省略時不留痕跡）。
 */
const ELEMENTS = {
  fire: { rgb: '255,120,40', core: '255,225,130', bits: 'ember', smoke: '70,40,30', decal: '40,20,14' },
  ice: { rgb: '120,200,255', core: '235,250,255', bits: 'shard', smoke: '200,230,255', decal: '170,215,240' },
  poison: { rgb: '130,220,80', core: '225,255,170', bits: 'bubble', smoke: '60,110,40', decal: '70,130,40' },
  thunder: { rgb: '255,230,90', core: '255,255,235', bits: 'zap', decal: '40,36,30' },
  dark: { rgb: '190,90,240', core: '245,200,255', bits: 'wisp', smoke: '40,12,60', decal: '50,16,70' },
  earth: { rgb: '230,185,115', core: '255,240,200', bits: 'rock', smoke: '150,125,95', decal: '60,44,30' },
  water: { rgb: '90,185,255', core: '225,245,255', bits: 'drop', decal: '50,110,160' },
  steel: { rgb: '255,205,120', core: '255,255,255', bits: 'spark', smoke: '90,90,100', decal: '40,36,40' },
  wind: { rgb: '215,240,255', core: '255,255,255', bits: 'feather' },
  blood: { rgb: '255,95,85', core: '255,225,215', bits: 'spark' },
};

/** 各怪物與 Boss 攻擊的屬性（未列出的為 blood：紅色的一般打擊）。 */
const ELEMENT_OF = {
  lavaWorm: 'fire', fireSpirit: 'fire', magmaSlime: 'fire', bomber: 'fire', drake: 'fire', golem: 'fire', redDragon: 'fire',
  iceWolf: 'ice', wraith: 'ice', crystal: 'ice', yeti: 'ice', frostSprite: 'ice', lich: 'ice',
  slime: 'poison', mushroom: 'poison', vineflower: 'poison', spider: 'poison', hornet: 'poison', zombie: 'poison', scorpion: 'poison', treant: 'poison',
  thunderSprite: 'thunder', jelly: 'thunder', skyKnight: 'thunder', thunderbird: 'thunder',
  shade: 'dark', voidEye: 'dark', banshee: 'dark', boneMage: 'dark', succubus: 'dark', demonKnight: 'dark', imp: 'dark', necromancer: 'dark', demonLord: 'dark',
  gargoyle: 'earth', mummy: 'earth', sandWorm: 'earth', boar: 'earth', bullKing: 'earth', pharaoh: 'earth', wyvern: 'earth', lizardman: 'earth',
  siren: 'water', crab: 'water', kraken: 'water',
  clockSoldier: 'steel', turretBot: 'steel', drone: 'steel', steamTitan: 'steel',
  harpy: 'wind',
};

/** 敵方投射物外觀對應的屬性。 */
const SHOT_ELEMENT = { fire: 'fire', ice: 'ice', seed: 'poison', feather: 'wind', curse: 'dark', sand: 'earth', bubble: 'water', gear: 'steel', dark: 'dark', arrow: 'blood', orb: 'dark' };

/** 一般怪物顯示蓄力特效的狀態（預警、衝刺前、瞄準、施法）。 */
const MONSTER_WIND = new Set(['windup', 'charge', 'aim', 'cast']);
/** 一般怪物動作圖顯示蓄力格的狀態（多了鑽地前的 burrow）。 */
const MONSTER_POSE_WIND = new Set([...MONSTER_WIND, 'burrow']);
/** 一般怪物動作圖顯示出招格的狀態。 */
const MONSTER_STRIKE = new Set(['dash', 'dive', 'attacking']);

/**
 * 取得怪物或 Boss 的攻擊屬性。
 * @param {string} [type] 怪物種類。
 * @returns {{rgb: string, core: string, bits: string, smoke?: string, decal?: string}} 屬性外觀。
 */
function elementOf(type) {
  return ELEMENTS[ELEMENT_OF[type] || 'blood'];
}

/** Boss 顯示蓄力格的狀態（預警、瞄準、施法、出招判定前、回復）。 */
const BOSS_WIND = new Set(['windup', 'aim', 'cast', 'attacking', 'healing']);

/** 玩家揮砍特效的顏色（中段、外緣、刀鋒線），依職業或攻擊樣式（look）區分。 */
const SLASH_COLORS = {
  warrior: ['90,160,255', '200,230,255', '150,210,255'],
  thief: ['170,90,255', '230,200,255', '200,140,255'],
  fist: ['255,150,50', '255,230,150', '255,200,90'],
  knight: ['230,200,90', '255,245,200', '255,225,130'],
  default: ['200,225,255', '255,255,255', '255,236,170'],
};

/**
 * 出手 6 階段（進度上限、前衝像素、垂直伸縮、前傾弧度），對應動作圖的 6 格攻擊序列；
 * 沒有動作圖的職業以前衝、伸縮與前傾表現。
 */
const ATTACK_POSES = [
  [0.12, -1, 0.92, -0.1], // 1 蓄力準備：後退、壓低、後仰
  [0.25, 0, 1, 0], // 2 起手揮動
  [0.42, 2, 1.05, 0.1], // 3 揮砍中：前衝、前傾
  [0.62, 3, 1.08, 0.15], // 4 主要打擊：衝最遠
  [0.82, 1.5, 0.95, 0.05], // 5 收招：往回收、稍微壓低
  [1, 0.5, 1, 0], // 6 回到平衡
];

/**
 * 依出手進度取得目前是第幾個階段（0～5）；每個階段是固定的一格，像像素動畫一樣逐格切換。
 * @param {number} k 出手進度（0～1）。
 * @returns {number} 階段索引。
 */
function attackPhase(k) {
  const i = ATTACK_POSES.findIndex((ph) => k < ph[0]);
  return i < 0 ? ATTACK_POSES.length - 1 : i;
}

/** 各區域的地圖色調：地板兩色、地板斑點（草原為小花）、牆頂、牆面、牆面暗線、地圖外背景。 */
const THEMES = {
  moss: { floor: ['#3b4a33', '#40503a'], speck: '#55683f', top: '#6b7a5a', face: '#2c3626', line: '#222a1e', bg: '#10140e' },
  lava: { floor: ['#3a2a26', '#42302a'], speck: '#7a3a1a', top: '#8a5240', face: '#2a1a18', line: '#1e1210', bg: '#120a08' },
  ice: { floor: ['#2e3f52', '#34485e'], speck: '#4f6f8a', top: '#9fc3dc', face: '#22303f', line: '#18222e', bg: '#0a1018' },
  grass: { floor: ['#5c8a3c', '#64923f'], speck: '#e8d870', top: '#3f6e2e', face: '#2a4a1e', line: '#1c3214', bg: '#101a0a' },
  sky: { floor: ['#c8d4e8', '#d2dcee'], speck: '#ffffff', top: '#f0e6c8', face: '#8a9ab8', line: '#6a7a98', bg: '#5a90c8' },
  necro: { floor: ['#3a3542', '#403a48'], speck: '#6a5a7a', top: '#4a4458', face: '#1e1a24', line: '#141018', bg: '#08060c' },
  desert: { floor: ['#b8945a', '#c09c60'], speck: '#e0c890', top: '#d8b878', face: '#7a5a30', line: '#5a4020', bg: '#2a1c0c' },
  sea: { floor: ['#1f4a5a', '#235262'], speck: '#4fa0a8', top: '#3a8a8a', face: '#123038', line: '#0c2228', bg: '#06141a' },
  clock: { floor: ['#4a4038', '#52463c'], speck: '#c8a050', top: '#8a7a68', face: '#2e2620', line: '#1e1814', bg: '#100c0a' },
  dragon: { floor: ['#4a2a22', '#523026'], speck: '#d06a2a', top: '#7a4a3a', face: '#2a1410', line: '#1c0c08', bg: '#140604' },
  demon: { floor: ['#2e1420', '#361826'], speck: '#a02040', top: '#5a2a3a', face: '#1a0a12', line: '#10060c', bg: '#080306' },
  abyss: { floor: ['#241a33', '#2a1f3b'], speck: '#4a2f6a', top: '#5a3f78', face: '#160f21', line: '#0e0916', bg: '#07040c' },
};

/**
 * 各色調的環境暗度（光照層的黑色不透明度）：戶外的草原、天空、沙漠較亮，地下的遺跡、墓地、深淵較暗。
 * 火把、角色、寶箱、傳送門與發光的招式會在暗處照出亮區。
 */
const AMBIENT = { grass: 0.16, sky: 0.08, desert: 0.3, sea: 0.52, moss: 0.62, lava: 0.55, ice: 0.54, necro: 0.7, clock: 0.62, dragon: 0.6, demon: 0.68, abyss: 0.72 };

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

/**
 * 揮砍的掃動方向：畫面上一律由上往下、由左往右。面向右與朝上時角度遞增（順時針），
 * 面向左與朝下時角度遞減（逆時針，面向左為面向右的鏡像）。
 * @param {number} a 面向角度（弧度）。
 * @returns {1 | -1} 1 為角度遞增，-1 為遞減。
 */
function swingDir(a) {
  const x = Math.cos(a);
  const y = Math.sin(a);
  if (Math.abs(y) > Math.abs(x) * 1.2) return y > 0 ? -1 : 1;
  return x < 0 ? -1 : 1;
}

/**
 * 把色碼調亮或調暗。
 * @param {string} hex `#rrggbb` 色碼。
 * @param {number} amt -1～1；正值往白色、負值往黑色。
 * @returns {string} 調整後的色碼。
 */
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 混合兩個色碼。
 * @param {string} a `#rrggbb` 色碼。
 * @param {string} b `#rrggbb` 色碼。
 * @param {number} t 0～1；0 為 a、1 為 b。
 * @returns {string} 混合後的色碼。
 */
function mix(a, b, t) {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const ch = [16, 8, 0].map((sh) => Math.round(((na >> sh) & 255) * (1 - t) + ((nb >> sh) & 255) * t));
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 由區域色調推出牆壁用的色盤（磚面三種深淺、高光、陰影、灰縫、牆頂石板、外框）。
 * @param {object} th 區域色調。
 * @returns {object} 牆壁色盤。
 */
function wallPalette(th) {
  return {
    // 磚面往牆頂色混合（不往白色），保留區域的色相。
    brick: [mix(th.face, th.top, 0.42), mix(th.face, th.top, 0.52), mix(th.face, th.top, 0.34)],
    brickHi: mix(th.face, th.top, 0.85),
    brickLo: mix(th.face, th.top, 0.16),
    mortar: shade(th.line, -0.2),
    top: [shade(th.top, -0.12), shade(th.top, -0.18), shade(th.top, -0.06)],
    topHi: shade(th.top, 0.08),
    topLo: shade(th.top, -0.38),
    seam: shade(th.top, -0.26),
    // 圓柱由亮到暗五階（取牆頂色，柱子比牆面亮，像參考的石柱）。
    pillar: [shade(th.top, 0.32), shade(th.top, 0.14), th.top, shade(th.top, -0.22), shade(th.top, -0.4)],
    outline: shade(th.line, -0.55),
  };
}

/**
 * 畫牆面（下方是地板的牆）：上緣是牆頂的石唇，下面是交錯的磚塊，每塊磚有高光、陰影與少量裂痕。
 * 上方也是牆時，牆面往上加高半格（蓋住上方牆頂的下半部），牆看起來更高。草原區域的牆是樹籬，改畫葉叢。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @param {object} pal 牆壁色盤。
 * @param {boolean} hedge 是否為樹籬。
 * @param {{left: string, right: string, mid: boolean, rise: number}} opt 左右鄰格（'face' 牆面相連、'top' 接到牆頂、'void' 地圖外）、是否在中間立圓柱、往上加高的像素。
 * @param {object} [fx] 區域點綴（見 THEME_FX）。
 */
function drawWallFace(g, i, j, pal, hedge, opt, fx = {}) {
  const x = i * T;
  const top = j * T - opt.rise;
  const bottom = (j + 1) * T;
  // 牆頂石唇：亮邊、石面、下方的深色陰影。
  g.fillStyle = pal.topHi;
  g.fillRect(x, top, T, 1);
  g.fillStyle = pal.top[0];
  g.fillRect(x, top + 1, T, 2);
  g.fillStyle = pal.outline;
  g.fillRect(x, top + 3, T, 1);
  if (hedge) {
    g.fillStyle = pal.brick[0];
    g.fillRect(x, top + 4, T, bottom - top - 4);
    for (let k = 0; k < 18; k++) {
      const r = hash(i * 31 + k, j * 17 - k);
      g.fillStyle = k % 3 ? pal.brickHi : pal.brickLo;
      g.fillRect(x + Math.floor(r * 15), top + 4 + Math.floor(hash(k, i + j) * (bottom - top - 5)), 2, 1);
    }
    // 細緻的葉片：亮色葉面與下方的暗色葉影（0.5 像素）。
    for (let k = 0; k < 34; k++) {
      const lx = x + hash(i * 17 + k, j * 23 + 5) * 15;
      const ly = top + 4.5 + hash(i * 3 - k, j * 41 + k) * (bottom - top - 6);
      g.fillStyle = pal.brickLo;
      dot(g, lx, ly + FINE, 1, FINE);
      g.fillStyle = k % 4 ? mix(pal.brick[0], pal.brickHi, 0.6) : pal.brickHi;
      dot(g, lx, ly, k % 2 ? 1 : FINE, FINE);
    }
    wallLipDetail(g, x, top, pal, fx, i, j);
    g.fillStyle = pal.mortar;
    g.fillRect(x, bottom - 1, T, 1);
    return;
  }
  for (let row = 0, by = top + 4; by < bottom - 1; row++, by += 6) {
    const gr = j * 4 + row;
    const off = gr % 2 ? 5 : 0;
    g.fillStyle = pal.mortar;
    g.fillRect(x, by + 5, T, 1);
    // 磚塊寬 10 像素，以整張地圖的像素座標計算接縫，相鄰格子的磚塊才會連續。
    for (let gx = x; gx < x + T;) {
      const start = gx - ((gx + off) % 10);
      const end = start + 10;
      const x0 = Math.max(gx, start);
      const x1 = Math.min(x + T, end);
      const r = hash(Math.floor((gx + off) / 10), gr);
      const base = pal.brick[Math.floor(r * 3)];
      g.fillStyle = base;
      g.fillRect(x0, by, x1 - x0, 5);
      // 上緣與左緣高光、下緣陰影，讓每塊磚有凸起感。
      g.fillStyle = pal.brickHi;
      const h0 = Math.max(x0, start + 1);
      const h1 = Math.min(x1, end - 1);
      if (h1 > h0) g.fillRect(h0, by, h1 - h0, 1);
      if (start + 1 >= x0 && start + 1 < x1) g.fillRect(start + 1, by, 1, 4);
      g.fillStyle = pal.brickLo;
      if (h1 > h0) g.fillRect(h0, by + 4, h1 - h0, 1);
      if (end - 2 >= x0 && end - 2 < x1) g.fillRect(end - 2, by + 1, 1, 4);
      g.fillStyle = pal.mortar;
      if (end - 1 < x1) g.fillRect(end - 1, by, 1, 5);
      if (start >= x0) g.fillRect(start, by, 1, 5);
      // 少數磚塊有裂痕或缺角。
      if (r > 0.8 && start + 6 >= x0 && start + 7 < x1) {
        g.fillStyle = pal.brickLo;
        g.fillRect(start + 4, by + 2, 2, 1);
        g.fillRect(start + 6, by + 1, 1, 1);
      }
      brickDetail(g, x0, x1, by, start, end, base, pal, fx, Math.floor((gx + off) / 10) * 131 + gr);
      gx = x1;
    }
  }
  // 牆腳陰影。
  g.fillStyle = pal.outline;
  g.fillRect(x, bottom - 1, T, 1);
  wallLipDetail(g, x, top, pal, fx, i, j);
  // 圓柱：牆面接到牆頂（轉角）或地圖外的端點各立一根，長牆中間每隔幾格也立一根。
  // 圓柱比牆頂高出 4 像素，像參考圖的石柱一樣凸出牆面。
  if (opt.left !== 'face') drawPillar(g, x - 1, top - 4, bottom, pal);
  if (opt.right !== 'face') drawPillar(g, x + T - 11, top - 4, bottom, pal);
  if (opt.mid) drawPillar(g, x + 2, top - 4, bottom, pal);
}

/**
 * 畫一根石造圓柱（寬 12 像素，從牆頂畫到牆腳）：方形柱頭、左亮右暗的圓柱身（分成數段石塊）、圓環與方形柱座，
 * 兩側在牆面投下陰影。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 圓柱左緣 x（像素）。
 * @param {number} top 圓柱上緣 y（像素）。
 * @param {number} bottom 圓柱下緣 y（像素）。
 * @param {object} pal 牆壁色盤。
 */
function drawPillar(g, x, top, bottom, pal) {
  const p = pal.pillar;
  const O = pal.outline;
  // 投在牆面上的陰影（右側較深）。
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(x - 1, top + 5, 1, bottom - top - 6);
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(x + 12, top + 5, 2, bottom - top - 6);
  // 柱身（x+1～x+10）：由左到右的明暗，做出圓柱的立體感。
  const shaft = [O, p[1], p[0], p[0], p[1], p[2], p[2], p[3], p[4], O];
  const s0 = top + 5;
  const s1 = bottom - 5;
  shaft.forEach((c, k) => {
    g.fillStyle = c;
    g.fillRect(x + 1 + k, s0, 1, s1 - s0);
  });
  // 柱身分段：每 7 像素一道接縫（暗線）與下方的亮線。
  for (let sy = s0 + 6; sy < s1 - 2; sy += 7) {
    g.fillStyle = p[4];
    g.fillRect(x + 2, sy, 8, 1);
    g.fillStyle = p[1];
    g.fillRect(x + 2, sy + 1, 3, 1);
  }
  // 柱頭：上方寬板（12 寬）與下方圓盤（10 寬）。
  g.fillStyle = O;
  g.fillRect(x, top, 12, 4);
  g.fillStyle = p[1];
  g.fillRect(x + 1, top, 10, 2);
  g.fillStyle = p[0];
  g.fillRect(x + 1, top, 10, 1);
  g.fillStyle = p[3];
  g.fillRect(x + 1, top + 2, 10, 1);
  g.fillStyle = p[2];
  g.fillRect(x + 1, top + 4, 10, 1);
  g.fillStyle = p[4];
  g.fillRect(x + 1, top + 4, 1, 1);
  g.fillRect(x + 10, top + 4, 1, 1);
  // 柱座：圓環（10 寬）與方座（12 寬）。
  g.fillStyle = p[2];
  g.fillRect(x + 1, bottom - 5, 10, 1);
  g.fillStyle = p[0];
  g.fillRect(x + 2, bottom - 5, 3, 1);
  g.fillStyle = O;
  g.fillRect(x, bottom - 4, 12, 4);
  g.fillStyle = p[2];
  g.fillRect(x + 1, bottom - 4, 10, 2);
  g.fillStyle = p[1];
  g.fillRect(x + 1, bottom - 4, 10, 1);
  g.fillStyle = p[4];
  g.fillRect(x + 1, bottom - 2, 10, 1);
}

/**
 * 畫石板地板：每格分成 8 × 8 的石塊（部分左右相連成長條），石塊顏色略有深淺，接縫為深色灰縫，
 * 左上有一點高光；少數石塊有裂痕。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @param {object} th 區域色調。
 * @param {object} fp 地板色盤。
 * @param {object} [fx] 區域點綴（見 THEME_FX，在 2 倍密度的畫布上以 0.5 像素加上細節）。
 */
function drawFloorStones(g, i, j, th, fp, fx = {}) {
  const x = i * T;
  const y = j * T;
  g.fillStyle = fp.mortar;
  g.fillRect(x, y, T, T);
  for (let cy = 0; cy < 2; cy++) {
    for (let cx = 0; cx < 2; cx++) {
      const gi = i * 2 + cx;
      const gj = j * 2 + cy;
      const r = hash(gi + 211, gj + 97);
      // 與左邊的石塊相連（不畫左側灰縫），形成長條石板。
      const joinLeft = hash(gi + 13, gj + 5) < 0.35;
      const sx = x + cx * 8 + (joinLeft ? 0 : 1);
      const sy = y + cy * 8 + 1;
      const w = 7 + (joinLeft ? 1 : 0);
      const base = fp.stone[Math.floor(r * fp.stone.length)];
      g.fillStyle = base;
      g.fillRect(sx, sy, w, 7);
      g.fillStyle = fp.hi;
      g.fillRect(sx, sy, Math.min(w, 4), 1);
      if (!joinLeft) g.fillRect(sx, sy, 1, 3);
      g.fillStyle = fp.lo;
      g.fillRect(sx, sy + 6, w, 1);
      if (r > 0.86) {
        g.fillStyle = fp.mortar;
        g.fillRect(sx + 2, sy + 3, 2, 1);
        g.fillRect(sx + 4, sy + 2, 1, 1);
      }
      stoneDetail(g, sx, sy, w, 7, base, fp, fx, gi, gj);
    }
  }
}

/**
 * 畫牆頂（從上方看到的牆）：交錯的石板，接到地板或地圖外的邊加深色外框。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @param {object} pal 牆壁色盤。
 * @param {{up: boolean, down: boolean, left: boolean, right: boolean}} edge 各方向是否要畫外框。
 * @param {HTMLCanvasElement} [tex] 設計圖的牆頂圖塊（有時取代程式繪製的石板，外框照畫）。
 */
function drawWallTop(g, i, j, pal, edge, tex) {
  const x = i * T;
  const y = j * T;
  if (tex) g.drawImage(tex, x, y, T, T);
  // 平整的石板：每片 16×8，隔排錯開半片；接縫只比石面稍暗，看起來是平面而不是磚牆。
  for (let row = 0; row < (tex ? 0 : 2); row++) {
    const by = y + row * 8;
    const gr = j * 2 + row;
    const off = gr % 2 ? 8 : 0;
    for (let gx = x; gx < x + T;) {
      const start = gx - ((gx + off) % 16);
      const end = start + 16;
      const x0 = Math.max(gx, start);
      const x1 = Math.min(x + T, end);
      const base = pal.top[Math.floor(hash(Math.floor((gx + off) / 16) + 7, gr) * 3)];
      g.fillStyle = base;
      g.fillRect(x0, by, x1 - x0, 8);
      slabDetail(g, x0, x1, by, pal, base, Math.floor((gx + off) / 16) * 97 + gr * 13 + i);
      g.fillStyle = pal.seam;
      g.fillRect(x0, by + 7, x1 - x0, 1);
      if (end - 1 < x1) g.fillRect(end - 1, by, 1, 8);
      gx = x1;
    }
  }
  // 外框內側加一道亮邊，牆頂的邊緣看起來有厚度。
  g.fillStyle = pal.topHi;
  if (edge.up) g.fillRect(x, y + 2, T, 1);
  if (edge.left) g.fillRect(x + 2, y, 1, T);
  g.fillStyle = pal.topLo;
  if (edge.down) g.fillRect(x, y + T - 3, T, 1);
  if (edge.right) g.fillRect(x + T - 3, y, 1, T);
  g.fillStyle = pal.outline;
  if (edge.up) g.fillRect(x, y, T, 2);
  if (edge.down) g.fillRect(x, y + T - 2, T, 2);
  if (edge.left) g.fillRect(x, y, 2, T);
  if (edge.right) g.fillRect(x + T - 2, y, 2, T);
}

/**
 * 在牆面畫一面掛旗（顏色取區域的點綴色）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 格子左上角 x（像素）。
 * @param {number} y 格子左上角 y（像素）。
 * @param {object} th 區域色調。
 * @param {object} pal 牆壁色盤。
 */
function drawBanner(g, x, y, th, pal) {
  g.fillStyle = '#c8a050';
  g.fillRect(x + 4, y + 4, 8, 1);
  g.fillStyle = pal.outline;
  g.fillRect(x + 5, y + 5, 6, 9);
  g.fillStyle = th.speck;
  g.fillRect(x + 5, y + 5, 6, 8);
  g.fillRect(x + 6, y + 13, 4, 1);
  g.fillStyle = shade(th.speck, -0.35);
  g.fillRect(x + 10, y + 5, 1, 8);
  g.fillStyle = '#e8c870';
  g.fillRect(x + 7, y + 7, 2, 1);
  g.fillRect(x + 7, y + 9, 2, 2);
}

/**
 * 畫地刺陷阱：鉚釘鐵板，升起時是交錯兩排（3＋2 根）有明暗的金屬尖刺與陰影，降下時是同位置的小孔。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 格子左上角 x（像素）。
 * @param {number} y 格子左上角 y（像素）。
 * @param {boolean} up 尖刺是否升起。
 */
function drawSpikeTrap(g, x, y, up) {
  g.fillStyle = '#120e10';
  g.fillRect(x + 1, y + 1, T - 2, T - 2);
  g.fillStyle = '#4a4448';
  g.fillRect(x + 2, y + 2, T - 4, T - 4);
  g.fillStyle = '#6e676c';
  g.fillRect(x + 2, y + 2, T - 4, 1);
  g.fillRect(x + 2, y + 2, 1, T - 4);
  g.fillStyle = '#2a2528';
  g.fillRect(x + 2, y + T - 3, T - 4, 1);
  g.fillRect(x + T - 3, y + 2, 1, T - 4);
  g.fillStyle = '#9a9298';
  for (const [rx, ry] of [[3, 3], [12, 3], [3, 12], [12, 12]]) g.fillRect(x + rx, y + ry, 1, 1);
  for (const [dx, dy] of [[3, 8], [7, 8], [11, 8], [5, 13], [9, 13]]) {
    const bx = x + dx;
    const by = y + dy;
    if (!up) {
      g.fillStyle = '#0e0a0a';
      g.fillRect(bx + 1, by - 1, 1, 1);
      g.fillStyle = '#2a2528';
      g.fillRect(bx, by - 1, 1, 1);
      g.fillRect(bx + 2, by - 1, 1, 1);
      continue;
    }
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(bx + 2, by - 1, 2, 2);
    g.fillStyle = '#c8ccd6';
    g.fillRect(bx, by - 2, 1, 3);
    g.fillStyle = '#7a7e8a';
    g.fillRect(bx + 2, by - 2, 1, 3);
    g.fillStyle = '#e8ecf2';
    g.fillRect(bx + 1, by - 4, 1, 5);
    g.fillStyle = '#ffffff';
    g.fillRect(bx + 1, by - 5, 1, 1);
    g.fillStyle = '#3a3a42';
    g.fillRect(bx, by + 1, 3, 1);
  }
}

/** 各區域牆邊大型擺設的種類（依序挑選，沒有列出的區域用 default）。 */
const PROPS = {
  default: ['barrel', 'crates', 'boulder', 'statue', 'trophy', 'skulls'],
  grass: ['barrel', 'crates', 'boulder'],
  sky: ['statue', 'crates', 'boulder', 'trophy'],
  necro: ['skulls', 'statue', 'boulder', 'skulls', 'crates'],
  clock: ['crates', 'barrel', 'trophy', 'boulder'],
};

/**
 * 以字元陣列畫小型像素圖（'.' 為透明）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 左上角 x（像素）。
 * @param {number} y 左上角 y（像素）。
 * @param {string[]} rows 像素列。
 * @param {Record<string, string>} colors 字元對應的顏色。
 */
function drawRows(g, x, y, rows, colors) {
  rows.forEach((row, k) => {
    for (let m = 0; m < row.length; m++) {
      const c = colors[row[m]];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(x + m, y + k, 1, 1);
    }
  });
}

/**
 * 在物件腳下畫橢圓形的地面影子。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} cx 中心 x（像素）。
 * @param {number} by 底部 y（像素）。
 * @param {number} w 寬度（像素）。
 */
function groundShadow(g, cx, by, w) {
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(cx, by, w / 2, 2, 0, 0, Math.PI * 2);
  g.fill();
}

/**
 * 畫木桶（12 × 14）：左亮右暗的桶身、三道鐵箍、橢圓桶蓋。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 左上角 x（像素）。
 * @param {number} y 左上角 y（像素）。
 */
function drawBarrel(g, x, y) {
  drawRows(g, x, y, [
    '...oooooo...',
    '.oohhhhhhoo.',
    'odhwwwwwwhdo',
    'oMmmmmmmmmMo',
    'odWhwwwWWDdo',
    'odWhwwwWWDdo',
    'odWhwwwWWDdo',
    'oMmmmmmmmmMo',
    'odWhwwwWWDdo',
    'odWhwwwWWDdo',
    'odWhwwwWWDdo',
    'oMmmmmmmmmMo',
    '.odWWWWWWdo.',
    '..oooooooo..',
  ], { o: '#1a1020', W: '#8a5a2a', w: '#b07a3e', h: '#d09a5a', d: '#5a3a1a', D: '#6a4422', M: '#4a4a52', m: '#8a8a94' });
}

/**
 * 畫一個木箱（寬 w、高 h）：木板框、橫向木板接縫、四角鐵釘與左上高光。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 左上角 x（像素）。
 * @param {number} y 左上角 y（像素）。
 * @param {number} w 寬度（像素）。
 * @param {number} h 高度（像素）。
 */
function drawCrate(g, x, y, w, h) {
  g.fillStyle = '#1a1020';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#a8783e';
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = '#6a4520';
  g.fillRect(x + 1, y + h - 2, w - 2, 1);
  g.fillRect(x + w - 2, y + 1, 1, h - 2);
  g.fillStyle = '#e0b870';
  g.fillRect(x + 1, y + 1, w - 2, 1);
  g.fillRect(x + 1, y + 1, 1, h - 2);
  // 內框。
  g.fillStyle = '#7a5226';
  g.fillRect(x + 2, y + 2, w - 4, 1);
  g.fillRect(x + 2, y + h - 3, w - 4, 1);
  // 橫向木板接縫與四角的鐵釘。
  g.fillStyle = '#7a5226';
  for (let py = y + 4; py < y + h - 3; py += 3) g.fillRect(x + 2, py, w - 4, 1);
  g.fillStyle = '#4a4a52';
  for (const [px, py] of [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]) g.fillRect(x + px, y + py, 1, 1);
}

/**
 * 畫大石球（直徑 14）：左上受光的球體、外框與幾道裂痕。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 左上角 x（像素）。
 * @param {number} y 左上角 y（像素）。
 * @param {object} pal 牆壁色盤（取圓柱的石色）。
 */
function drawBoulder(g, x, y, pal) {
  const r = 7;
  const tones = [pal.pillar[0], pal.pillar[1], pal.pillar[2], pal.pillar[3], pal.pillar[4]];
  for (let py = 0; py < 14; py++) {
    for (let px = 0; px < 14; px++) {
      const dx = px - 6.5;
      const dy = py - 6.5;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      if (d > r - 1) {
        g.fillStyle = pal.outline;
      } else {
        // 光從左上照來：越靠左上越亮。
        const light = (-dx * 0.6 - dy * 0.8) / r;
        g.fillStyle = tones[Math.max(0, Math.min(4, Math.round(2 - light * 2.4)))];
      }
      g.fillRect(x + px, y + py, 1, 1);
    }
  }
  g.fillStyle = pal.pillar[4];
  g.fillRect(x + 8, y + 4, 1, 2);
  g.fillRect(x + 9, y + 6, 2, 1);
  g.fillRect(x + 4, y + 9, 2, 1);
  g.fillStyle = '#ffffff';
  g.globalAlpha = 0.35;
  g.fillRect(x + 4, y + 3, 2, 1);
  g.globalAlpha = 1;
}

/**
 * 畫壁龕（牆面上的深色拱形凹槽，石像放在裡面）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 格子左上角 x（像素）。
 * @param {number} top 牆面上緣 y（像素）。
 * @param {number} bottom 牆面下緣 y（像素）。
 * @param {object} pal 牆壁色盤。
 */
function drawNiche(g, x, top, bottom, pal) {
  const y0 = top + 5;
  g.fillStyle = pal.outline;
  g.fillRect(x + 2, y0 + 2, 12, bottom - y0 - 2);
  g.fillRect(x + 4, y0, 8, 2);
  g.fillStyle = shade(pal.outline, 0.08);
  g.fillRect(x + 3, y0 + 2, 10, bottom - y0 - 3);
  g.fillRect(x + 5, y0 + 1, 6, 1);
  g.fillStyle = pal.brickHi;
  g.fillRect(x + 4, y0 - 1, 8, 1);
  g.fillRect(x + 2, y0 + 1, 2, 1);
  g.fillRect(x + 12, y0 + 1, 2, 1);
}

/**
 * 畫石像（12 × 22）：戴頭盔的騎士雙手握著立在身前的劍，站在台座上。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 左上角 x（像素）。
 * @param {number} y 左上角 y（像素）。
 * @param {object} pal 牆壁色盤（取圓柱的石色）。
 */
function drawStatue(g, x, y, pal) {
  drawRows(g, x, y, [
    '....oooo....',
    '...osssSo...',
    '...osSSdo...',
    '...oSDDdo...',
    '....oSdo....',
    '.ooossSSdoo.',
    'osssSSSSSSdo',
    'osSoSlSSoSdo',
    'osSoSlSSoSdo',
    'osdolllloddo',
    '..osSSlSSdo.',
    '..osSSlSSdo.',
    '..osSSlSSdo.',
    '..osSSlSSdo.',
    '..osSSlSdDo.',
    '..osSSSSdDo.',
    '..osSddSdDo.',
    '..oooooooo..',
    'osssssssssso',
    'oSSSSSSSSSdo',
    'odddddddddDo',
    'oooooooooooo',
  ], { o: pal.outline, s: shade(pal.pillar[0], 0.25), S: pal.pillar[0], l: '#f4f2ea', d: pal.pillar[2], D: pal.pillar[3] });
}

/**
 * 畫牆上的戰利品：交叉的兩把斧頭與圓盾。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 格子左上角 x（像素）。
 * @param {number} y 盾牌上緣 y（像素）。
 */
function drawTrophy(g, x, y) {
  // 斧柄：兩條交叉的斜線。
  for (let k = 0; k < 13; k++) {
    g.fillStyle = '#5a3a1a';
    g.fillRect(x + 2 + k, y + k, 1, 1);
    g.fillRect(x + 14 - k, y + k, 1, 1);
    g.fillStyle = '#8a5a2a';
    g.fillRect(x + 3 + k, y + k, 1, 1);
    g.fillRect(x + 13 - k, y + k, 1, 1);
  }
  // 斧頭：左上與右上的半月刃。
  drawRows(g, x, y - 3, [
    '.ooo.........ooo.',
    'ohhmo.......omhho',
    'ohmmo.......ommho',
    '.oddo.......oddo.',
    '..oo.........oo..',
  ], { o: '#1a1020', h: '#e8ecf2', m: '#a0a4ae', d: '#6a6e78' });
  // 圓盾。
  drawRows(g, x + 3, y + 3, [
    '..ooooooo..',
    '.oGGGGGGGo.',
    'oGRRRRRRrGo',
    'oGRRRYRRrGo',
    'oGRRYYYRrGo',
    'oGRRRYRRrGo',
    'oGrRRRRrrGo',
    '.oGrrrrrGo.',
    '..oGGGGGo..',
    '...ooooo...',
  ], { o: '#1a1020', G: '#c89a3a', R: '#a83a28', r: '#7a2418', Y: '#f0d070' });
}

/**
 * 畫頭骨堆（16 × 10）：三顆頭骨與幾根散落的骨頭。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 左上角 x（像素）。
 * @param {number} y 左上角 y（像素）。
 */
function drawSkulls(g, x, y) {
  const skull = ['.ooooo.', 'oBBBBBo', 'oBBBBbo', 'oeBbebo', 'oBBeBbo', '.obbbo.', '.obob..'];
  const colors = { o: '#1a1020', B: '#e8e0c8', b: '#b0a68c', e: '#2a1e1e' };
  // 骨頭。
  g.fillStyle = '#1a1020';
  g.fillRect(x, y + 8, 16, 2);
  g.fillStyle = '#d8d0b8';
  g.fillRect(x + 1, y + 8, 14, 1);
  drawRows(g, x, y + 3, skull, colors);
  drawRows(g, x + 9, y + 3, skull, colors);
  drawRows(g, x + 4, y - 1, skull, colors);
}

/** 地城牆頂圖塊的壓暗比例（0～1）。 */
const TOP_DARKEN = 0.3;

/** 地城圖塊（dungeonTiles.js）畫好的畫布快取。 */
const tileCanvasCache = new Map();

/**
 * 圖塊的平均色（RGB）。
 * @param {{palette: Record<string, string>, rows: string[]}} s 圖塊。
 * @returns {number[]} 平均 RGB。
 */
function tileMean(s) {
  const sum = [0, 0, 0];
  let n = 0;
  for (const row of s.rows) for (const ch of row) {
    const v = s.palette[ch];
    if (!v) continue;
    const k = parseInt(v.slice(1), 16);
    sum[0] += (k >> 16) & 255; sum[1] += (k >> 8) & 255; sum[2] += k & 255; n++;
  }
  return sum.map((v) => v / Math.max(1, n));
}

/**
 * 把圖塊的調色盤整體平移，讓平均色等於基準圖塊的平均色。
 * @param {{palette: Record<string, string>, rows: string[]}} s 圖塊。
 * @param {{palette: Record<string, string>, rows: string[]}} base 基準圖塊。
 * @returns {Record<string, string>} 調整後的調色盤。
 */
function matchMean(s, base) {
  const a = tileMean(s);
  const b = tileMean(base);
  const out = {};
  for (const [k, v] of Object.entries(s.palette)) {
    const n = parseInt(v.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x, i) => Math.max(0, Math.min(255, Math.round(x + b[i] - a[i]))));
    out[k] = '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  return out;
}

/**
 * 去掉像素圖中孤立的雜點：周圍 8 格中沒有任何同色的像素，改成周圍最多的顏色（邊緣以環繞方式取鄰格，圖塊拼接處一致）。
 * @param {string[]} rows 像素列。
 * @returns {string[]} 處理後的像素列。
 */
function despeckle(rows) {
  const h = rows.length;
  const w = rows[0].length;
  return rows.map((row, y) => {
    let out = '';
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const count = {};
      let same = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const c = rows[(y + dy + h) % h][(x + dx + w) % w];
        count[c] = (count[c] || 0) + 1;
        if (c === ch) same++;
      }
      if (same >= 1) { out += ch; continue; }
      out += Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
    }
    return out;
  });
}

/** 地板灰縫往石面平均色靠攏的比例（0～1），越大網格越淡。 */
const GROUT_SOFTEN = 0.6;

/**
 * 把地板圖塊中明顯比平均暗的顏色（灰縫、深色邊）往平均色靠攏，讓圖塊之間的網格變淡、地面看起來更連續。
 * @param {{rows: string[]}} s 圖塊。
 * @param {Record<string, string>} pal 目前的調色盤。
 * @returns {Record<string, string>} 調整後的調色盤。
 */
function softenGrout(s, pal) {
  const mean = tileMean({ palette: pal, rows: s.rows });
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const ml = lum(mean);
  const hex = '#' + mean.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const out = {};
  for (const [k, v] of Object.entries(pal)) {
    const n = parseInt(v.slice(1), 16);
    const l = lum([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    out[k] = l < ml * 0.75 ? mix(v, hex, GROUT_SOFTEN) : v;
  }
  return out;
}

/**
 * 產生整層地板的大範圍明暗起伏（世界像素大小的畫布）：以每 3 格一個的隨機明暗點做平滑內插放大，
 * 亮處為淡白、暗處為淡黑，貼在地板上讓地面有連續的光影、不再一格一格。
 * @param {number} w 地圖寬（格）。
 * @param {number} h 地圖高（格）。
 * @returns {HTMLCanvasElement} 明暗層畫布（w × T 寬、h × T 高）。
 */
function floorShadeLayer(w, h) {
  const S = 3;
  const cw = Math.ceil(w / S) + 2;
  const chh = Math.ceil(h / S) + 2;
  const small = document.createElement('canvas');
  small.width = cw;
  small.height = chh;
  const sg = small.getContext('2d');
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cw; x++) {
      const v = hash(x * 13 + 401, y * 7 + 233) - 0.5;
      sg.fillStyle = v > 0 ? `rgba(255,245,225,${(v * 0.2).toFixed(3)})` : `rgba(0,0,0,${(-v * 0.36).toFixed(3)})`;
      sg.fillRect(x, y, 1, 1);
    }
  }
  const big = document.createElement('canvas');
  big.width = w * T;
  big.height = h * T;
  const bg = big.getContext('2d');
  bg.imageSmoothingEnabled = true;
  bg.imageSmoothingQuality = 'high';
  // 小畫布每個點對應 S 格，往左上偏移半格讓內插的中心落在格子中間。
  bg.drawImage(small, -S * T * 0.5, -S * T * 0.5, cw * S * T, chh * S * T);
  return big;
}

/**
 * 取得地城圖塊的畫布（由 design/dungeon/ 的設計圖轉換，密度 2）：地板與牆頂 32 × 32、牆面段 32 × 48、石柱 24 × 56。
 * 地板與牆頂的其他變化對齊第 1 種的平均色；牆緣對齊同區域牆面的平均色；牆頂與牆緣另外壓暗（TOP_DARKEN），與地板區分。
 * @param {string} key 圖塊代碼（例如 'moss.floor@2'）。
 * @returns {HTMLCanvasElement | null} 畫布；沒有這個圖塊時為 null。
 */
function dungeonTile(key) {
  if (tileCanvasCache.has(key)) return tileCanvasCache.get(key);
  const s = DUNGEON_TILES[key];
  let c = null;
  if (s) {
    // 地板與牆頂的其他變化：整體顏色往第 1 種的平均色靠攏，相鄰格子才不會明暗不一、像棋盤格。
    const m = /^(.+\.(?:floor|top))@([1-9])$/.exec(key);
    let pal = m && DUNGEON_TILES[`${m[1]}@0`] ? matchMean(s, DUNGEON_TILES[`${m[1]}@0`]) : s.palette;
    // 牆頂整體壓暗、降低彩度，和可以行走的地板明顯區分（石材區域的牆頂與地板花紋相近）。
    if (key.includes('.floor@')) pal = softenGrout(s, pal);
    // 牆緣：平均色對齊同區域的牆面（設計圖的牆緣偏淺），再一起壓暗。
    const rim = /^(.+)\.rim@\d$/.exec(key);
    if (rim && DUNGEON_TILES[`${rim[1]}.face@0`]) pal = matchMean({ palette: pal, rows: s.rows }, DUNGEON_TILES[`${rim[1]}.face@0`]);
    if (key.includes('.top@') || rim) pal = Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, shade(mix(v, '#3a3640', 0.25), -TOP_DARKEN)]));
    c = document.createElement('canvas');
    c.width = s.w;
    c.height = s.h;
    const g = c.getContext('2d');
    // 地板：去掉孤立的雜點，石面更平滑。
    const rows = key.includes('.floor@') ? despeckle(s.rows) : s.rows;
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.' || !pal[row[x]]) continue;
        g.fillStyle = pal[row[x]];
        g.fillRect(x, y, 1, 1);
      }
    });
  }
  tileCanvasCache.set(key, c);
  return c;
}

/**
 * 以設計圖圖塊畫牆面：3 種牆面段依位置挑一種；往上加高時畫整段（含石唇），沒有加高時只畫石唇與下方 12 像素的牆面。
 * 兩端與長牆中間的石柱改用設計圖的石柱（柱頭固定，柱身依牆高從下方截取），並在牆面投下陰影。
 * @param {CanvasRenderingContext2D} g 畫布（已依 FLOOR_DENSITY 縮放）。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @param {{left: string, right: string, mid: boolean, rise: number}} opt 同 drawWallFace。
 * @param {string} theme 區域色調名稱。
 * @returns {{x: number, y: number}[]} 兩端石柱的柱頂中心（轉角放火盆用）。
 */
function drawWallFaceTex(g, i, j, opt, theme) {
  const x = i * T;
  const top = j * T - opt.rise;
  const bottom = (j + 1) * T;
  const face = dungeonTile(`${theme}.face@${Math.floor(hash(i + 31, j + 17) * 3)}`);
  if (opt.rise >= 8) g.drawImage(face, 0, 0, 32, 48, x, top, T, 24);
  else {
    g.drawImage(face, 0, 0, 32, 8, x, top, T, 4);
    g.drawImage(face, 0, 24, 32, 24, x, top + 4, T, bottom - top - 4);
  }
  const pillar = dungeonTile(`${theme}.pillar`);
  /**
   * 畫一根石柱（寬 12 世界像素）。
   * @param {number} px 左緣 x。
   */
  const drawP = (px) => {
    const y0 = top - 4;
    const h = bottom - y0;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.fillRect(px - 1, y0 + 5, 1, h - 6);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(px + 12, y0 + 5, 2, h - 6);
    g.drawImage(pillar, 0, 0, 24, 16, px, y0, 12, 8);
    const rest = h - 8;
    g.drawImage(pillar, 0, 56 - rest * 2, 24, rest * 2, px, y0 + 8, 12, rest);
  };
  const tops = [];
  if (pillar) {
    if (opt.left !== 'face') { drawP(x - 1); tops.push({ x: x + 5, y: top - 4 }); }
    if (opt.right !== 'face') { drawP(x + T - 11); tops.push({ x: x + T - 5, y: top - 4 }); }
    if (opt.mid) drawP(x + 2);
  }
  return tops;
}

/**
 * 畫南側外牆的矮牆正面：取牆面段最下方 14 列（世界 7 像素）貼在牆緣圖塊的下半部，上緣一道亮邊、下緣一道深色陰影。
 * @param {CanvasRenderingContext2D} g 畫布（已依 FLOOR_DENSITY 縮放）。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @param {string} theme 區域色調名稱。
 */
function drawFrontLip(g, i, j, theme) {
  const face = dungeonTile(`${theme}.face@${Math.floor(hash(i + 31, j + 17) * 3)}`);
  if (!face) return;
  const x = i * T;
  const y = (j + 1) * T - 7;
  g.drawImage(face, 0, 48 - 14, 32, 14, x, y, T, 7);
  g.fillStyle = 'rgba(255,240,210,0.18)';
  g.fillRect(x, y, T, 0.5);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(x, y + 6.5, T, 0.5);
}

/**
 * 畫一個放火的小鐵盆（柱頂或石階旁）：深色盆身、亮邊與燒紅的炭（火焰每幀另外畫）。
 * @param {CanvasRenderingContext2D} g 畫布（已依 FLOOR_DENSITY 縮放）。
 * @param {number} cx 中心 x（世界像素）。
 * @param {number} y 盆口 y（世界像素）。
 */
function drawFireBowl(g, cx, y) {
  g.fillStyle = 'rgba(0,0,0,0.4)';
  g.fillRect(cx - 3, y + 2.5, 6, 1);
  g.fillStyle = '#1a1020';
  g.fillRect(cx - 3.5, y - 0.5, 7, 3);
  g.fillStyle = '#4a4650';
  g.fillRect(cx - 3, y, 6, 2);
  g.fillStyle = '#7a7684';
  g.fillRect(cx - 3, y, 6, 0.5);
  g.fillStyle = '#ff6a2a';
  g.fillRect(cx - 2, y - 0.5, 4, 0.5);
  g.fillStyle = '#ffd070';
  g.fillRect(cx - 1, y - 0.5, 1.5, 0.5);
}

/** 拱門畫在角色上方的部分（從頂端算起佔整張圖的比例）：拱頂、拱心石與拉起的鐵柵門。 */
const ARCH_FRONT = 0.42;

/**
 * 畫 2 格寬的石階：原圖（1 格寬）的左右兩側保留石邊，中段重複拼接，只有最外側有石邊；
 * 往下的石階（南側出口）上下翻轉，並越往下越暗，表現往下延伸的深度。
 * @param {CanvasRenderingContext2D} g 畫布（已依 FLOOR_DENSITY 縮放）。
 * @param {HTMLCanvasElement} src 石階圖（32 × 32，密度 2）。
 * @param {number} x 左上角 x（世界像素）。
 * @param {number} y 左上角 y（世界像素）。
 * @param {boolean} up 往上的石階（北側入口）為 true，往下（南側出口）為 false。
 */
function drawWideSteps(g, src, x, y, up) {
  const side = 9;
  const mid = src.width - side * 2;
  const W = T * 2 * 2;
  g.save();
  if (!up) { g.translate(0, y * 2 + T); g.scale(1, -1); }
  /**
   * 把原圖的一段（畫布像素）貼到石階的某個位置（畫布像素，從左算起）。
   * @param {number} sx 原圖起點。
   * @param {number} sw 寬度。
   * @param {number} dx 目標起點。
   */
  const put = (sx, sw, dx) => g.drawImage(src, sx, 0, sw, src.height, x + dx / 2, y, sw / 2, T);
  put(0, side, 0);
  for (let dx = side; dx < W - side; dx += mid) put(side, Math.min(mid, W - side - dx), dx);
  put(src.width - side, side, W - side);
  g.restore();
  if (!up) {
    const grad = g.createLinearGradient(0, y, 0, y + T);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grad;
    g.fillRect(x, y, T * 2, T);
  }
  // 石階兩側的陰影，像嵌進牆裡。
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(x, y, 1, T);
  g.fillRect(x + T * 2 - 1, y, 1, T);
}

/**
 * 畫升起的地刺：鐵板中央一排 4 根細長的銀色矛頭尖刺（圓形底座、中段略粗、頂端尖銳），
 * 左亮右暗並有高光，伸出鐵板約半格，底部在鐵板上投下小陰影。以 0.5 世界像素繪製（畫面放大後仍細緻）。
 * @param {CanvasRenderingContext2D} g 畫布（世界座標）。
 * @param {number} x 格子左上角 x。
 * @param {number} y 格子左上角 y。
 */
function drawSpikeBlades(g, x, y) {
  const base = y + 9;
  for (const dx of [4, 6.5, 9, 11.5]) {
    const cx = x + dx + 0.5;
    // 陰影與圓形底座。
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(cx - 0.5, base, 2.5, 1);
    g.fillStyle = '#2a2a32';
    g.fillRect(cx - 1, base - 0.5, 2.5, 1);
    g.fillStyle = '#6a6e7a';
    g.fillRect(cx - 0.5, base - 1, 1.5, 0.5);
    // 尖刺：由下往上，寬度 1.5 → 1 → 0.5，左半亮、右半暗。
    const segs = [[base - 4, 4, 1.5], [base - 9, 5, 1], [base - 12, 3, 0.5]];
    for (const [top, h, w] of segs) {
      g.fillStyle = '#1a1020';
      g.fillRect(cx - w / 2 - 0.5 + 0.25, top, w + 1, h);
      g.fillStyle = '#9aa0ac';
      g.fillRect(cx - w / 2 + 0.25, top, w, h);
      g.fillStyle = '#e8ecf2';
      g.fillRect(cx - w / 2 + 0.25, top, Math.max(0.5, w / 2), h);
    }
    g.fillStyle = '#ffffff';
    g.fillRect(cx, base - 12, 0.5, 0.5);
  }
}

/** 裝飾物圖的快取（依種類與上色色階）。 */
const propCache = new Map();

/**
 * 取得地圖裝飾物的圖（propSprites.js，密度 2）：灰階圖的低彩度顏色依亮度對應到 ramp 色階（先把這張圖的亮度範圍拉滿），
 * 有彩度的部分（例如掛旗的金色橫桿）維持原色。
 * @param {string} key 裝飾物種類。
 * @param {string[]} [ramp] 由暗到亮的色階（只用於灰階圖）。
 * @returns {{frames: HTMLCanvasElement[], w: number, h: number} | null} 圖；沒有這種圖時為 null。
 */
function propArt(key, ramp) {
  const sp = PROP_SPRITES[key];
  if (!sp) return null;
  const ck = `${key}|${sp.gray && ramp ? ramp.join(',') : ''}`;
  if (propCache.has(ck)) return propCache.get(ck);
  /**
   * 色碼轉 RGB。
   * @param {string} hex `#rrggbb`。
   * @returns {number[]} RGB。
   */
  const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const colors = { ...sp.palette };
  if (sp.gray && ramp) {
    const grays = Object.entries(sp.palette).filter(([k, v]) => k !== 'o' && (Math.max(...rgb(v)) - Math.min(...rgb(v))) < 28);
    const lum = (v) => { const c = rgb(v); return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };
    const ls = grays.map(([, v]) => lum(v));
    const lo = Math.min(...ls);
    const hi = Math.max(...ls);
    for (const [k, v] of grays) {
      const t = hi > lo ? (lum(v) - lo) / (hi - lo) : 0.5;
      const f = t * (ramp.length - 1);
      const n = Math.min(ramp.length - 2, Math.floor(f));
      colors[k] = mix(ramp[n], ramp[n + 1], f - n);
    }
  }
  const frames = sp.frames.map((fr) => {
    const c = document.createElement('canvas');
    c.width = sp.w;
    c.height = sp.h;
    const g = c.getContext('2d');
    fr.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;
        g.fillStyle = colors[row[x]];
        g.fillRect(fr.x + x, fr.y + y, 1, 1);
      }
    });
    return c;
  });
  const art = { frames, w: sp.w, h: sp.h };
  propCache.set(ck, art);
  return art;
}

/**
 * 以世界座標畫一張裝飾物圖（圖為密度 2，世界大小為圖的一半）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {{frames: HTMLCanvasElement[], w: number, h: number}} art 裝飾物圖。
 * @param {number} cx 水平中心（世界像素）。
 * @param {number} y 上緣（世界像素）。
 * @param {number} [frame=0] 第幾格。
 */
function blitProp(g, art, cx, y, frame = 0) {
  g.drawImage(art.frames[frame], Math.round((cx - art.w / 4) * 2) / 2, Math.round(y * 2) / 2, art.w / 2, art.h / 2);
}

/**
 * 依區域產生裝飾物的上色色階：stone 石材（取圓柱的石色，暗到亮）、cloth 掛旗布面（取區域點綴色）。
 * @param {object} th 區域色調。
 * @param {object} pal 牆壁色盤。
 * @returns {{stone: string[], rock: string[], cloth: string[]}} 色階（rock 為大石與碎石用、少了最亮一階的石色）。
 */
function propRamps(th, pal) {
  return {
    stone: [pal.outline, pal.pillar[4], pal.pillar[3], pal.pillar[2], pal.pillar[1], pal.pillar[0], shade(pal.pillar[0], 0.3)],
    // 大石與碎石：不用最亮的一階，亮面才不會糊成一片。
    rock: [pal.outline, pal.pillar[4], pal.pillar[3], pal.pillar[2], pal.pillar[1], pal.pillar[0]],
    cloth: [shade(th.speck, -0.65), shade(th.speck, -0.35), th.speck, shade(th.speck, 0.3)],
  };
}

/**
 * 畫牆邊的大型擺設（在整層地圖畫完後畫，才能稍微壓到下方的地板）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {{kind: string, i: number, j: number}} prop 擺設。
 * @param {object} pal 牆壁色盤。
 * @param {{stone: string[], cloth: string[]}} [ramps] 裝飾物的上色色階（有設計圖時使用 propSprites.js 的圖）。
 */
function drawProp(g, prop, pal, ramps) {
  const x = prop.i * T;
  const base = (prop.j + 1) * T + 2;
  // 有設計圖的擺設：腳底對齊 base（戰利品掛在牆上），石像與大石依區域石色上色。
  const art = ramps && propArt(prop.kind, prop.kind === 'boulder' ? ramps.rock : ramps.stone);
  if (art) {
    const h = art.h / 2;
    if (prop.kind === 'trophy') {
      blitProp(g, art, x + 8, prop.j * T - 6);
      return;
    }
    if (prop.kind !== 'statue') groundShadow(g, x + 8, base, Math.min(16, art.w / 2 + 1));
    blitProp(g, art, x + 8, base - h - (prop.kind === 'statue' ? 1 : 0));
    return;
  }
  if (prop.kind === 'barrel') {
    groundShadow(g, x + 8, base, 13);
    drawBarrel(g, x + 2, base - 14);
  } else if (prop.kind === 'crates') {
    groundShadow(g, x + 8, base, 16);
    drawCrate(g, x, base - 10, 12, 10);
    drawCrate(g, x + 5, base - 18, 9, 8);
  } else if (prop.kind === 'boulder') {
    groundShadow(g, x + 8, base, 14);
    drawBoulder(g, x + 1, base - 14, pal);
  } else if (prop.kind === 'statue') {
    drawStatue(g, x + 2, base - 23, pal);
  } else if (prop.kind === 'trophy') {
    drawTrophy(g, x - 1, prop.j * T - 4);
  } else if (prop.kind === 'skulls') {
    groundShadow(g, x + 8, base, 16);
    drawSkulls(g, x, base - 10);
  }
}

/**
 * 地板上的小點綴（不影響行走）：骨頭或碎石。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 格子左上角 x（像素）。
 * @param {number} y 格子左上角 y（像素）。
 * @param {number} r 0～1 的雜湊值（決定種類與位置）。
 * @param {object} fp 地板色盤。
 * @param {{stone: string[], cloth: string[]}} [ramps] 裝飾物的上色色階（有設計圖時使用 propSprites.js 的圖）。
 */
function drawFloorLitter(g, x, y, r, fp, ramps) {
  const ox = x + 3 + Math.floor(r * 70) % 7;
  const oy = y + 4 + Math.floor(r * 130) % 6;
  // 有設計圖時：骨頭或依區域石色上色的碎石。
  const art = ramps && propArt(r < 0.5 ? 'bone' : 'rubble', ramps.rock);
  if (art) {
    blitProp(g, art, ox + 3, oy - 1);
    return;
  }
  if (r < 0.5) {
    // 骨頭：中間細、兩端圓的白骨。
    g.fillStyle = '#1a1020';
    g.fillRect(ox - 1, oy - 1, 8, 4);
    g.fillStyle = '#d8d0b8';
    g.fillRect(ox, oy, 6, 2);
    g.fillRect(ox - 1, oy - 1, 2, 2);
    g.fillRect(ox + 5, oy + 1, 2, 2);
    g.fillStyle = '#a8a08a';
    g.fillRect(ox + 1, oy + 1, 4, 1);
  } else {
    // 碎石：幾顆深淺不同的小石頭。
    for (const [dx, dy, w] of [[0, 2, 3], [4, 0, 2], [5, 3, 2], [2, 5, 2]]) {
      g.fillStyle = fp.mortar;
      g.fillRect(ox + dx, oy + dy + 1, w, 1);
      g.fillStyle = fp.hi;
      g.fillRect(ox + dx, oy + dy, w, 1);
    }
  }
}

/** 地圖離屏畫布的密度（每個世界像素 2 × 2 個畫布像素）：細節以 0.5 像素繪製，畫質接近角色圖。 */
const FLOOR_DENSITY = 2;
/** 細節的最小單位（世界像素）。 */
const FINE = 1 / FLOOR_DENSITY;

/**
 * 各區域的地圖點綴：seam 石縫裡的苔蘚、drip 牆唇垂下的苔蘚、glow 石縫與磚縫的發光（熔岩、魔力）、frost 冰霜、
 * icicle 牆唇的冰柱、sand 積沙、vein 大理石紋、rivet 鉚釘、wet 積水反光。
 */
const THEME_FX = {
  moss: { seam: '#5f7f3a', drip: '#56763a' },
  grass: { seam: '#4a7a2e' },
  ice: { frost: '#d8eefa', icicle: '#bfe4f8' },
  lava: { glow: '255,120,40' },
  dragon: { glow: '255,100,40' },
  demon: { glow: '255,50,90' },
  abyss: { glow: '170,110,255' },
  sea: { seam: '#2f7f70', drip: '#3a8f7c', wet: true },
  necro: { seam: '#5e4c70' },
  desert: { sand: '#e4cc94' },
  sky: { vein: '#ffffff' },
  clock: { rivet: '#d0a858' },
};

/**
 * 畫一個細節像素（0.5 世界像素，座標對齊 0.5）。
 * @param {CanvasRenderingContext2D} g 畫布（已依 FLOOR_DENSITY 縮放）。
 * @param {number} x 左上角 x（世界像素）。
 * @param {number} y 左上角 y（世界像素）。
 * @param {number} [w=FINE] 寬度。
 * @param {number} [h=FINE] 高度。
 */
function dot(g, x, y, w = FINE, h = FINE) {
  g.fillRect(Math.round(x * FLOOR_DENSITY) / FLOOR_DENSITY, Math.round(y * FLOOR_DENSITY) / FLOOR_DENSITY, w, h);
}

/**
 * 地板石塊的細節：圓角、延伸的高光與雙層陰影、細小斑點、細裂痕，以及依區域加上的石縫苔蘚、發光縫、冰霜、積沙、
 * 大理石紋、鉚釘或積水反光。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} sx 石塊左上角 x。
 * @param {number} sy 石塊左上角 y。
 * @param {number} w 石塊寬度。
 * @param {number} h 石塊高度。
 * @param {string} base 石塊顏色。
 * @param {object} fp 地板色盤。
 * @param {object} fx 區域點綴。
 * @param {number} gi 石塊的全域 x 索引（雜湊用）。
 * @param {number} gj 石塊的全域 y 索引（雜湊用）。
 */
function stoneDetail(g, sx, sy, w, h, base, fp, fx, gi, gj) {
  const r = (k) => hash(gi * 7 + k * 13, gj * 11 - k * 5);
  // 圓角。
  g.fillStyle = fp.mortar;
  dot(g, sx, sy); dot(g, sx + w - FINE, sy); dot(g, sx, sy + h - FINE); dot(g, sx + w - FINE, sy + h - FINE);
  // 高光往右漸淡、左緣高光往下漸淡；下緣多一層更深的陰影。
  g.fillStyle = mix(base, fp.hi, 0.5);
  dot(g, sx + Math.min(w, 4), sy, Math.min(2, Math.max(0, w - 4.5)), FINE);
  dot(g, sx + FINE, sy + 1, Math.min(w, 3) - FINE, FINE);
  dot(g, sx, sy + 3, FINE, 1.5);
  g.fillStyle = mix(fp.lo, fp.mortar, 0.5);
  dot(g, sx + FINE, sy + h - FINE, w - 1, FINE);
  dot(g, sx + w - FINE, sy + 1, FINE, h - 1.5);
  // 細小斑點（石材的雜質與磨損）。
  for (let k = 0; k < 4; k++) {
    g.fillStyle = k % 2 ? mix(base, fp.lo, 0.7) : mix(base, fp.hi, 0.6);
    dot(g, sx + 1 + r(k) * (w - 2), sy + 1.5 + r(k + 9) * (h - 3));
  }
  // 細裂痕：由一點往右蜿蜒的 0.5 像素暗線，下方帶一點亮邊。
  if (r(20) > 0.9) {
    let cx = sx + 1 + r(21) * 2;
    let cy = sy + 2 + r(22) * 3;
    for (let k = 0; k < 6 && cx < sx + w - 1; k++) {
      g.fillStyle = mix(base, fp.mortar, 0.6);
      dot(g, cx, cy);
      g.fillStyle = mix(base, fp.hi, 0.4);
      dot(g, cx, cy + FINE);
      cx += FINE;
      cy += r(30 + k) < 0.33 ? -FINE : r(30 + k) > 0.66 ? FINE : 0;
    }
  }
  if (fx.seam && r(40) < 0.45) {
    // 石縫裡的苔蘚：沿下緣灰縫的幾個細點，少數往石面爬上一點。
    g.fillStyle = fx.seam;
    const mx = sx + r(41) * (w - 2);
    dot(g, mx, sy + h, 1.5, FINE);
    dot(g, mx + FINE, sy + h - FINE, FINE, FINE);
    g.fillStyle = shade(fx.seam, 0.25);
    dot(g, mx + 1, sy + h - FINE);
  }
  if (fx.glow && r(50) < 0.12) {
    // 發光縫：灰縫裡一段亮色細線與外圍淡光。
    const gx = sx + r(51) * (w - 3);
    g.fillStyle = `rgba(${fx.glow},0.35)`;
    dot(g, gx - FINE, sy + h - FINE, 3, 1.5);
    g.fillStyle = `rgb(${fx.glow})`;
    dot(g, gx, sy + h, 2, FINE);
    g.fillStyle = 'rgba(255,240,200,0.9)';
    dot(g, gx + FINE, sy + h);
  }
  if (fx.frost) {
    // 冰霜：石面上緣的白色細點與一小片霜。
    g.fillStyle = fx.frost;
    if (r(60) < 0.25) dot(g, sx + 1 + r(61) * (w - 3), sy + FINE, 1, FINE);
    if (r(62) < 0.12) { g.globalAlpha = 0.5; dot(g, sx + 1 + r(63) * (w - 4), sy + 2 + r(64) * 2, 2, 1); g.globalAlpha = 1; }
  }
  if (fx.sand && r(70) < 0.4) {
    // 積沙：石塊角落的沙堆（亮色細點組成的斜坡）。
    g.fillStyle = fx.sand;
    const left = r(71) < 0.5;
    for (let k = 0; k < 3; k++) dot(g, left ? sx + FINE : sx + w - 1.5 - k * FINE, sy + h - 1 - k * FINE, left ? 1.5 - k * FINE : 1 + k * FINE, FINE);
  }
  if (fx.vein && r(80) < 0.35) {
    // 大理石紋：斜向的淡白細線。
    g.fillStyle = 'rgba(255,255,255,0.55)';
    const vx = sx + 1 + r(81) * (w - 4);
    for (let k = 0; k < 5; k++) dot(g, vx + k * FINE, sy + 1.5 + k * FINE * (r(82) < 0.5 ? 1 : 1.5));
  }
  if (fx.rivet && r(90) < 0.3) {
    // 鉚釘：石塊（金屬板）四角的亮點與暗點。
    for (const [ox, oy] of [[1, 1], [w - 1.5, 1], [1, h - 1.5], [w - 1.5, h - 1.5]]) {
      g.fillStyle = fx.rivet;
      dot(g, sx + ox, sy + oy);
      g.fillStyle = fp.mortar;
      dot(g, sx + ox + FINE, sy + oy + FINE);
    }
  }
  if (fx.wet && r(100) < 0.18) {
    // 積水：一小灘較亮的水面與一道反光。
    g.fillStyle = 'rgba(140,220,230,0.25)';
    const wx = sx + 1 + r(101) * (w - 4);
    dot(g, wx, sy + 3, 3, 1.5);
    g.fillStyle = 'rgba(220,255,255,0.7)';
    dot(g, wx + FINE, sy + 3, 1, FINE);
  }
}

/**
 * 畫草地地板（草原）：底色上有深淺不一的草叢斑塊，再撒上 0.5 像素的草葉（深色根部、亮色葉尖）。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} i 格子 x。
 * @param {number} j 格子 y。
 * @param {object} th 區域色調。
 */
function drawGrassFloor(g, i, j, th) {
  const x = i * T;
  const y = j * T;
  g.fillStyle = th.floor[0];
  g.fillRect(x, y, T, T);
  /**
   * 平滑的雜訊（以 8 像素為一格做雙線性內插），讓草色斑塊連成不規則的大片。
   * @param {number} wx 世界 x（像素）。
   * @param {number} wy 世界 y（像素）。
   * @returns {number} 0～1。
   */
  const smooth = (wx, wy) => {
    const gx = wx / 8, gy = wy / 8;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const v = (a, b) => hash(a + 900, b + 300);
    const top = v(x0, y0) * (1 - fx) + v(x0 + 1, y0) * fx;
    const bot = v(x0, y0 + 1) * (1 - fx) + v(x0 + 1, y0 + 1) * fx;
    return top * (1 - fy) + bot * fy;
  };
  // 斑塊：以 1 像素為單位，依平滑雜訊決定較亮或較暗的草色。
  const hi = th.floor[1];
  const hi2 = shade(th.floor[1], 0.07);
  const lo = shade(th.floor[0], -0.07);
  for (let by = 0; by < T; by++) {
    for (let bx = 0; bx < T; bx++) {
      const v = smooth(x + bx, y + by) + (hash(x + bx, y + by) - 0.5) * 0.12;
      if (v > 0.66) g.fillStyle = hi2;
      else if (v > 0.5) g.fillStyle = hi;
      else if (v < 0.3) g.fillStyle = lo;
      else continue;
      g.fillRect(x + bx, y + by, 1, 1);
    }
  }
  // 草葉：1.5 像素高、0.5 像素寬，深色根部、亮色葉尖，少數兩片成 V 字形。
  const dark = shade(th.floor[0], -0.28);
  const light = shade(th.floor[1], 0.28);
  for (let k = 0; k < 26; k++) {
    const bx = x + hash(i * 31 + k, j * 7 + 3) * 15.5;
    const by = y + hash(i * 5 - k, j * 29 + k) * 14.5;
    const lean = hash(i + k * 3, j - k) < 0.5 ? -FINE : FINE;
    g.fillStyle = dark;
    dot(g, bx, by + 1);
    g.fillStyle = mix(th.floor[1], light, 0.4);
    dot(g, bx, by + FINE);
    g.fillStyle = light;
    dot(g, bx + lean, by);
    if (k % 3 === 0) {
      g.fillStyle = mix(th.floor[1], light, 0.4);
      dot(g, bx - lean, by + FINE);
    }
  }
}

/**
 * 牆面磚塊的細節：圓角、高光下的半階亮面、細小斑點，以及依區域加上的苔蘚或發光裂縫。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x0 這一格中磚塊的左緣。
 * @param {number} x1 這一格中磚塊的右緣（不含）。
 * @param {number} by 磚塊上緣 y。
 * @param {number} start 磚塊（整塊）左緣。
 * @param {number} end 磚塊（整塊）右緣（不含）。
 * @param {string} base 磚塊顏色。
 * @param {object} pal 牆壁色盤。
 * @param {object} fx 區域點綴。
 * @param {number} seed 雜湊種子。
 */
function brickDetail(g, x0, x1, by, start, end, base, pal, fx, seed) {
  const r = (k) => hash(seed * 3 + k * 17, seed - k * 7);
  /**
   * 只在這一格範圍內畫細節像素。
   * @param {number} x x。
   * @param {number} y y。
   * @param {number} [w=FINE] 寬度。
   * @param {number} [h=FINE] 高度。
   */
  const clip = (x, y, w = FINE, h = FINE) => {
    const a = Math.max(x, x0);
    const b = Math.min(x + w, x1);
    if (b > a) dot(g, a, y, b - a, h);
  };
  g.fillStyle = pal.mortar;
  clip(start + 1, by); clip(end - 1.5, by); clip(start + 1, by + 4.5); clip(end - 1.5, by + 4.5);
  g.fillStyle = mix(base, pal.brickHi, 0.45);
  clip(start + 2, by + 1, end - start - 4, FINE);
  g.fillStyle = mix(base, pal.brickLo, 0.5);
  clip(start + 1.5, by + 3.5, end - start - 3.5, FINE);
  for (let k = 0; k < 3; k++) {
    g.fillStyle = k ? mix(base, pal.brickLo, 0.75) : mix(base, pal.brickHi, 0.7);
    clip(start + 2 + r(k) * (end - start - 4), by + 1.5 + r(k + 5) * 2);
  }
  if (fx.seam && r(10) < 0.3) {
    // 磚縫垂下的苔蘚。
    g.fillStyle = fx.seam;
    const mx = start + 2 + r(11) * (end - start - 5);
    clip(mx, by + 4.5, 2, FINE);
    clip(mx + FINE, by + 5, 1, FINE);
    g.fillStyle = shade(fx.seam, 0.2);
    clip(mx, by + 4.5);
  }
  if (fx.glow && r(20) < 0.1) {
    // 磚面的發光裂縫（熔岩、魔力從牆裡透出來）。
    const cx = start + 3 + r(21) * (end - start - 6);
    g.fillStyle = `rgba(${fx.glow},0.3)`;
    clip(cx - FINE, by + 1, 2, 3);
    g.fillStyle = `rgb(${fx.glow})`;
    clip(cx, by + 1.5); clip(cx + FINE, by + 2); clip(cx, by + 2.5); clip(cx + FINE, by + 3);
  }
  if (fx.frost && r(30) < 0.4) {
    g.fillStyle = fx.frost;
    clip(start + 2 + r(31) * (end - start - 5), by, 1.5, FINE);
  }
}

/**
 * 牆唇的細節：石唇上的細小高光與缺口，依區域加上垂下的苔蘚或冰柱。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x 格子左上角 x。
 * @param {number} top 牆面上緣 y。
 * @param {object} pal 牆壁色盤。
 * @param {object} fx 區域點綴。
 * @param {number} i 格子 x（雜湊用）。
 * @param {number} j 格子 y（雜湊用）。
 */
function wallLipDetail(g, x, top, pal, fx, i, j) {
  g.fillStyle = mix(pal.top[0], pal.topHi, 0.5);
  dot(g, x, top + 1, T, FINE);
  g.fillStyle = mix(pal.top[0], pal.outline, 0.5);
  dot(g, x, top + 2.5, T, FINE);
  for (let k = 0; k < 3; k++) {
    g.fillStyle = pal.topLo;
    dot(g, x + hash(i * 13 + k, j + 77) * 15, top + 1.5 + (k % 2) * FINE);
  }
  const hang = fx.icicle || fx.drip;
  if (!hang) return;
  for (let k = 0; k < 3; k++) {
    if (hash(i * 7 + k, j * 3 + 41) > 0.55) continue;
    const hx = x + 1 + hash(i * 9 - k, j + k * 5) * 13;
    const len = 1.5 + hash(i + k, j * 13) * 3;
    // 由上往下變細：上段 1 像素寬、下段 0.5 像素，尖端較亮。
    g.fillStyle = hang;
    dot(g, hx, top + 4, 1, Math.min(1.5, len));
    dot(g, hx + (fx.icicle ? FINE / 2 : 0), top + 4, FINE, len);
    g.fillStyle = fx.icicle ? '#ffffff' : shade(hang, 0.25);
    dot(g, hx, top + 4, FINE, FINE);
    if (fx.icicle) dot(g, hx + FINE / 2, top + 4 + len - FINE);
  }
}

/**
 * 牆頂石板的細節：每片石板上緣的半階亮面、細小斑點與缺角。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} x0 石板在這一格的左緣。
 * @param {number} x1 石板在這一格的右緣（不含）。
 * @param {number} by 石板上緣 y。
 * @param {object} pal 牆壁色盤。
 * @param {string} base 石板顏色。
 * @param {number} seed 雜湊種子。
 */
function slabDetail(g, x0, x1, by, pal, base, seed) {
  g.fillStyle = mix(base, pal.topHi, 0.6);
  dot(g, x0, by, x1 - x0 - (x1 % 16 === 0 ? 1 : 0), FINE);
  g.fillStyle = mix(base, pal.seam, 0.5);
  dot(g, x0, by + 6.5, x1 - x0, FINE);
  for (let k = 0; k < 3; k++) {
    const v = hash(seed + k * 31, seed * 3 - k);
    g.fillStyle = k ? mix(base, pal.topLo, 0.5) : mix(base, pal.topHi, 0.8);
    dot(g, x0 + v * Math.max(0, x1 - x0 - 1), by + 1.5 + hash(seed - k, k + 9) * 4.5);
  }
}

/**
 * 地圖的石材顆粒：對整張離屏畫布做極輕微的明暗雜訊（細顆粒加上 2 × 2 的斑駁），讓大片色塊有材質感。
 * 雜訊依像素座標固定，每次產生的地圖都一樣。
 * @param {CanvasRenderingContext2D} g 畫布。
 * @param {number} w 畫布寬度（畫布像素）。
 * @param {number} h 畫布高度（畫布像素）。
 */
function grainPass(g, w, h) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let n = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
      n = ((n ^ (n >>> 15)) & 0xff) / 255;
      let b = Math.imul((x >> 1) * 2246822519 + (y >> 1) * 3266489917, 668265263) >>> 0;
      b = ((b ^ (b >>> 13)) & 0xff) / 255;
      const k = 1 + (n - 0.5) * 0.06 + (b - 0.5) * 0.07;
      const i = (y * w + x) * 4;
      d[i] = Math.min(255, d[i] * k);
      d[i + 1] = Math.min(255, d[i + 1] * k);
      d[i + 2] = Math.min(255, d[i + 2] * k);
    }
  }
  g.putImageData(img, 0, 0);
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
    /** 特效粒子（火花、餘燼、衝擊波、光柱、符文圈），只用於畫面。 */
    this.fx = [];
    /** 地面痕跡（敵方爆炸留下的焦痕等），畫在角色下方。 */
    this.decals = [];
    /** 全畫面閃光（Boss 大招）：顏色與剩餘強度。 */
    this.screenFlash = { rgb: '255,255,255', a: 0 };
    this.prevSkillAnim = 0;
    this.shakeAmp = 0;
    this.shakeOn = true;
    this.frame = 0;
    this.floorCache = null;
  }

  /**
   * 依畫布的 CSS 大小調整解析度與整數放大倍率（畫面短邊約 13 格），並決定角色圖的顯示密度（heroDensity）。
   * @returns {void}
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    // 畫面短邊約 13 格（角色約 1 格高，視野比以前寬一點，地圖看起來更開闊）。
    const target = Math.min(w / (13 * T), h / (13 * T));
    this.scale = Math.max(1, Math.round(target));
    // 角色圖約以 1.5 倍密度顯示（比 16 格的世界大一點），並讓每個圖像素佔整數個螢幕像素：
    // 例如放大 6 倍時每個圖像素 4 個螢幕像素（密度 1.5）、7 倍時 5 個（密度 1.4）。畫面太小時直接用 1.5。
    const artPx = Math.round(this.scale / HERO_DENSITY);
    this.heroDensity = artPx >= 1 && this.scale >= 2 ? this.scale / artPx : HERO_DENSITY;
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
   * 預先把整層地圖畫到離屏畫布（地圖不變，每幀只需貼上）。畫布為 2 倍密度（FLOOR_DENSITY），
   * 地板、牆面、牆頂與草地另外以 0.5 像素加上細節與區域點綴，最後加上石材顆粒，再畫擺設。
   * @param {object} world 探險。
   */
  buildFloor(world) {
    const f = world.floor;
    const themeName = AREAS[world.area].theme;
    const th = THEMES[themeName];
    const pal = wallPalette(th);
    const fpal = {
      stone: [th.floor[0], th.floor[1], shade(th.floor[0], 0.06), shade(th.floor[1], -0.05)],
      hi: shade(th.floor[1], 0.12),
      lo: shade(th.floor[0], -0.12),
      mortar: shade(th.floor[0], -0.38),
    };
    const hedge = themeName === 'grass';
    const fx = THEME_FX[themeName] || {};
    // 有設計圖圖塊的區域：地板、牆面、牆頂與石柱改用 dungeonTiles.js（legacyTiles 為轉換工具取參考圖用）。
    const tex = !this.legacyTiles && DUNGEON_TILES[`${themeName}.floor@0`] ? themeName : null;
    // 地板的大範圍明暗起伏（只用於有設計圖圖塊的區域）。
    const shadeLayer = tex && !hedge ? floorShadeLayer(f.w, f.h) : null;
    const ramps = propRamps(th, pal);
    const bannerArt = propArt('banner', ramps.cloth);
    const torchArt = propArt('torch');
    const stairsArt = propArt('stairs', ramps.stone);
    const torches = [];
    /** 柱頂與石階旁的火盆火焰（世界像素；s 為大小倍率）。 */
    const flames = [];
    /** 已放置火把、掛旗或大型擺設的牆面格子。 */
    const decor = [];
    /** 牆邊的大型擺設（整層畫完後再畫）。 */
    const props = [];
    /**
     * 是否為牆。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 牆（含地圖外）時為 true。
     */
    const solid = (i, j) => !walkable(world.tileAt(i, j));
    /**
     * 是否為牆面（下方是地板的牆）。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 牆面時為 true。
     */
    const isFace = (i, j) => solid(i, j) && j + 1 < f.h && !solid(i, j + 1);
    /**
     * 是否靠近地板（周圍 8 格有地板），這樣的牆才畫牆頂。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 靠近地板時為 true。
     */
    const near = (i, j) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([dx, dy]) => !solid(i + dx, j + dy));
    /**
     * 是否為畫出牆頂的牆（相鄰的牆頂之間不畫外框）。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 畫出牆頂時為 true。
     */
    const isSolidTop = (i, j) => solid(i, j) && !isFace(i, j) && near(i, j);
    // 離屏畫布以 2 倍密度繪製：沿用世界像素座標（縮放 2 倍），細節再以 0.5 像素補上。
    const c = document.createElement('canvas');
    c.width = f.w * T * FLOOR_DENSITY;
    c.height = f.h * T * FLOOR_DENSITY;
    const g = c.getContext('2d');
    g.scale(FLOOR_DENSITY, FLOOR_DENSITY);
    g.fillStyle = th.bg;
    g.fillRect(0, 0, c.width, c.height);
    // 火把的位置：每一段連續的牆面先找出所有石柱（兩端與長牆中間每 5 格一根），火把放在每兩根相鄰石柱的正中央
    // （可以落在兩格之間），石柱間距太短（不到 2.5 格）的不放，像真的地下城一樣整齊排列。
    /** 各列牆面的火把中心 x（世界像素）。 */
    const torchPlan = new Map();
    if (!hedge && themeName !== 'sky') {
      for (let j = 0; j < f.h; j++) {
        for (let i = 0; i < f.w; i++) {
          if (!isFace(i, j) || isFace(i - 1, j)) continue;
          let e = i;
          while (isFace(e + 1, j)) e++;
          const cols = [i * T + 5];
          for (let k = i + 2; k <= e - 2; k++) if (k % 5 === 0 && isFace(k - 2, j) && isFace(k + 2, j)) cols.push(k * T + 8);
          cols.push(e * T + T - 5);
          const xs = [];
          for (let k = 1; k < cols.length; k++) if (cols[k] - cols[k - 1] >= 2.5 * T) xs.push((cols[k] + cols[k - 1]) / 2);
          if (xs.length) torchPlan.set(j, [...(torchPlan.get(j) || []), ...xs]);
          i = e;
        }
      }
    }
    /**
     * 這一格的中心是否靠近同一列的火把（擺設與掛飾要避開）。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 距離火把不到 1.25 格時為 true。
     */
    const nearTorch = (i, j) => (torchPlan.get(j) || []).some((tx) => Math.abs(tx - (i * T + 8)) < 1.25 * T);
    for (let j = 0; j < f.h; j++) {
      for (let i = 0; i < f.w; i++) {
        const t = f.tiles[j * f.w + i];
        const x = i * T;
        const y = j * T;
        if (t === WALL) {
          const below = j + 1 < f.h && walkable(f.tiles[(j + 1) * f.w + i]);
          if (below) {
            /**
             * 牆面左右鄰格的種類（決定兩端怎麼收邊）。
             * @param {number} di -1 左、1 右。
             * @returns {string} 'face'、'top' 或 'void'。
             */
            const endKind = (di) => (isFace(i + di, j) ? 'face' : isSolidTop(i + di, j) ? 'top' : 'void');
            const wideFace = isFace(i - 1, j) && isFace(i + 1, j);
            // 長牆中間每隔 5 格立一根圓柱（兩側都要是牆面，不和兩端的圓柱擠在一起）。
            const mid = !hedge && wideFace && isFace(i - 2, j) && isFace(i + 2, j) && i % 5 === 0;
            const faceOpt = { left: endKind(-1), right: endKind(1), mid, rise: j > 0 && solid(i, j - 1) ? 8 : 0 };
            if (tex) {
              // 轉角石柱：約一半的柱頂放一盆火（天空之城與沉沒神殿不放）。
              for (const t of drawWallFaceTex(g, i, j, faceOpt, tex)) {
                if (themeName !== 'sky' && themeName !== 'sea' && hash(Math.round(t.x), j + 311) < 0.55 && !flames.some((fl) => Math.abs(fl.x - t.x) < 8 && Math.abs(fl.y - t.y) < 8)) {
                  drawFireBowl(g, t.x, t.y);
                  flames.push({ x: t.x, y: t.y - 1, s: 0.8 });
                }
              }
            }
            else drawWallFace(g, i, j, pal, hedge, faceOpt, fx);
            // 牆面點綴：固定間距的火把（另外每幀畫火焰與光暈）、掛旗、掛飾與大型擺設；兩側都要是牆面、且不是圓柱的位置才放，彼此至少間隔 2 格。
            const r = hash(i + 101, j + 57);
            // 牆面的規律：長牆每 5 格一根石柱（i % 5 = 0），火把固定在兩根石柱的正中間（i % 5 = 2），
            // 其他掛飾與擺設只放在火把與石柱之間（i % 5 = 4，短牆沒有中間石柱時也可放在 0），整面牆排列整齊。
            const spaced = !decor.some((d) => d.j === j && Math.abs(d.i - i) < 2) && !nearTorch(i, j);
            if (wideFace && !mid && spaced && r < 0.45) {
              // 大型擺設：依區域挑種類；石像先在牆面挖出壁龕。
              const list = PROPS[themeName] || PROPS.default;
              const kind = list[Math.floor(hash(i + 7, j + 311) * list.length)];
              if (kind === 'statue') drawNiche(g, x, j * T - (j > 0 && solid(i, j - 1) ? 8 : 0), (j + 1) * T, pal);
              props.push({ kind, i, j });
              decor.push({ i, j });
            } else if (!hedge && wideFace && !mid && spaced && r > 0.88) {
              // 掛旗：有設計圖時布面染成區域的點綴色。
              if (bannerArt) blitProp(g, bannerArt, x + 8, y + 3);
              else drawBanner(g, x, y, th, pal);
              decor.push({ i, j });
            } else if (!hedge && wideFace && !mid && spaced && r >= 0.82 && r < 0.88 && PROP_SPRITES.ironGate) {
              // 封閉的鐵柵門（嵌在牆裡的裝飾，不能通行）。
              const art = propArt('ironGate', ramps.stone);
              blitProp(g, art, x + 8, (j + 1) * T - art.h / 2);
              decor.push({ i, j });
            } else if (wideFace && !mid && spaced && r >= 0.45 && r < 0.82) {
              // 牆上的掛飾：武器架、圓盾或鐵鏈（有設計圖時）。
              const kinds = ['weaponRack', 'wallShield', 'chains'].filter((k) => PROP_SPRITES[k]);
              if (kinds.length) {
                const art = propArt(kinds[Math.floor(hash(i + 51, j + 7) * kinds.length)]);
                blitProp(g, art, x + 8, y + 9 - art.h / 4);
                decor.push({ i, j });
              }
            }
            // 火把座：這一格包含火把中心時畫上（火焰每幀另外畫在托盤上方）。
            for (const tx of torchPlan.get(j) || []) {
              if (tx < i * T || tx >= (i + 1) * T) continue;
              if (torchArt) blitProp(g, torchArt, tx, y + 6);
              else {
                g.fillStyle = '#3a2a1a';
                g.fillRect(tx - 1, y + 8, 2, 5);
                g.fillStyle = '#8a8a92';
                g.fillRect(tx - 2, y + 7, 4, 2);
                g.fillStyle = '#5a5a62';
                g.fillRect(tx - 2, y + 12, 4, 1);
              }
              torches.push({ i: tx / T - 0.5, j, px: tx });
              decor.push({ i, j });
            }
          } else if (near(i, j)) {
            drawWallTop(g, i, j, pal, {
              up: !isSolidTop(i, j - 1),
              down: !isSolidTop(i, j + 1) && !isFace(i, j + 1),
              left: !isSolidTop(i - 1, j) && !isFace(i - 1, j),
              right: !isSolidTop(i + 1, j) && !isFace(i + 1, j),
            }, tex ? dungeonTile(`${tex}.rim@${hash(i + 3, j + 9) < 0.5 ? 0 : 1}`) || dungeonTile(`${tex}.top@${hash(i + 3, j + 9) < 0.5 ? 0 : 1}`) : null);
            // 南側外牆（上方是地板、下方是地圖外）：牆緣下方補一段矮牆正面，牆看起來有厚度。
            if (tex && !solid(i, j - 1) && !isSolidTop(i, j + 1) && !isFace(i, j + 1)) drawFrontLip(g, i, j, tex);
          }
          continue;
        }
        if (tex && !hedge) {
          g.drawImage(dungeonTile(`${tex}.floor@${Math.floor(hash(i + 7, j + 3) * 4)}`), x, y, T, T);
          g.drawImage(shadeLayer, x, y, T, T, x, y, T, T);
        } else if (hedge) {
          // 草原的地面維持程式繪製（不規則的草色斑塊跨格相連，圖塊拼接會出現棋盤格）。
          drawGrassFloor(g, i, j, th);
        } else {
          drawFloorStones(g, i, j, th, fpal, fx);
        }
        const r = hash(i, j);
        g.fillStyle = th.speck;
        if (tex && !hedge) {
          // 設計圖圖塊已有自己的點綴，不另外畫斑點。
        } else if (hedge) {
          // 草原的小花：四片花瓣（0.5 像素）圍著花心，下方一點葉影。
          for (const [fx0, fy0, on] of [[Math.floor(r * 40) % 13 + 1, Math.floor(r * 97) % 13 + 1, r < 0.35], [Math.floor(r * 53) % 12 + 2, Math.floor(r * 71) % 12 + 2, r > 0.8]]) {
            if (!on) continue;
            g.fillStyle = shade(th.floor[0], -0.3);
            dot(g, x + fx0, y + fy0 + 1.5, 1.5, FINE);
            g.fillStyle = r < 0.15 ? '#ffffff' : th.speck;
            dot(g, x + fx0 + FINE, y + fy0); dot(g, x + fx0, y + fy0 + FINE); dot(g, x + fx0 + 1, y + fy0 + FINE); dot(g, x + fx0 + FINE, y + fy0 + 1);
            g.fillStyle = '#e07a3a';
            dot(g, x + fx0 + FINE, y + fy0 + FINE);
          }
        } else if (r < 0.35) g.fillRect(x + Math.floor(r * 40) % 13 + 1, y + Math.floor(r * 97) % 13 + 1, 2, 1);
        if (!tex && !hedge && r > 0.8) g.fillRect(x + Math.floor(r * 53) % 12 + 2, y + Math.floor(r * 71) % 12 + 2, 1, 2);
        // 少數地板有骨頭或碎石（樓梯與陷阱除外，只是裝飾，不影響行走）。
        const lr = hash(i + 503, j + 71);
        if (!hedge && t !== STAIRS && t !== SPIKES && lr < 0.035) drawFloorLitter(g, x, y, lr / 0.035, fpal, ramps);
        if (t === STAIRS && stairsArt) {
          // 樓梯：依區域石色上色的石階入口，剛好填滿一格。
          blitProp(g, stairsArt, x + 8, y);
        } else if (t === STAIRS) {
          g.fillStyle = '#0b0710';
          g.fillRect(x + 1, y + 1, T - 2, T - 2);
          g.fillStyle = th.top;
          for (let k = 0; k < 4; k++) g.fillRect(x + 2 + k, y + 3 + k * 3, T - 4 - k * 2, 2);
          g.fillStyle = '#e8b84a';
          g.fillRect(x + 1, y + 1, T - 2, 1);
        }
        // 樓梯與地刺以外的格子，若上方或左右是牆，畫一條陰影增加立體感（左右較淡，轉角才不會突兀）。
        if (j > 0 && f.tiles[(j - 1) * f.w + i] === WALL) {
          // 牆腳投下的陰影：靠牆最深，往下 7 像素逐漸變淡。
          const sh = g.createLinearGradient(0, y, 0, y + 7);
          sh.addColorStop(0, 'rgba(0,0,0,0.42)');
          sh.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = sh;
          g.fillRect(x, y, T, 7);
        }
        g.fillStyle = 'rgba(0,0,0,0.18)';
        if (solid(i - 1, j)) g.fillRect(x, y, 2, T);
        if (solid(i + 1, j)) g.fillRect(x + T - 1, y, 1, T);
      }
    }
    // 擺設之前先加上石材顆粒（擺設維持乾淨的像素圖）。
    if (!tex) grainPass(g, c.width, c.height);
    const braziers = this.placeRoomDecor(g, world, ramps, solid, themeName);
    for (const prop of props) drawProp(g, prop, pal, ramps);
    const arches = hedge ? [] : this.drawDoorways(g, world, ramps, solid, { torches, flames, torchArt, isFace, noFire: themeName === 'sky' || themeName === 'sea' });
    this.floorCache = { canvas: c, floor: f, torches: themeName === 'sky' ? [] : torches, props, braziers, arches, flames };
  }

  /**
   * 畫拱門的前景層：門洞正上方 2 格寬的拱頂（上方 ARCH_FRONT 比例）畫在角色與怪物上方，角色走進門口時從拱門下穿過；
   * 兩側石柱不畫在前景，走在拱門旁邊的角色不會被蓋住。
   * 只畫在畫面範圍內的拱門。
   */
  drawArchFronts() {
    const list = this.floorCache.arches || [];
    if (!list.length) return;
    const g = this.ctx;
    const { x: cx, y: cy } = this.cam;
    for (const a of list) {
      // 只取門洞正上方 2 格寬的拱頂（兩側石柱不蓋住旁邊的角色）。
      const sw = T * 2 * 2;
      const sx = Math.round((a.art.w - sw) / 2);
      const sh = Math.round(a.art.h * ARCH_FRONT);
      const x = a.cx - T;
      if (x + T * 2 < cx || x > cx + this.viewW || a.y + sh / 2 < cy || a.y > cy + this.viewH) continue;
      g.drawImage(a.art.frames[0], sx, 0, sw, sh, x, a.y, T * 2, sh / 2);
    }
  }

  /**
   * 房間出入口（有設計圖時）：走廊從房間上方的牆穿進來的地方（走廊與門口都是 2 格寬），門口畫往上的石階與嵌在牆裡的 3 格寬石拱門（門洞 2 格、兩側是打開的木門）；
   * 走廊從房間下方的牆穿出去的地方，畫往下的石階。用石階表現房間與走廊的高低落差，只是畫面效果，不影響行走。
   * @param {CanvasRenderingContext2D} g 地圖離屏畫布。
   * @param {object} world 探險。
   * @param {{stone: string[], rock: string[], cloth: string[]}} ramps 上色色階。
   * @param {(i: number, j: number) => boolean} solid 是否為牆。
   * @param {{torches: object[], flames: object[], torchArt: object, isFace: (i: number, j: number) => boolean, noFire: boolean}} lights
   *   火把與火盆清單（會被加入：拱門兩旁牆上的火把、南側石階兩旁的火盆）、火把座圖、是否為牆面、是否不放火。
   * @returns {{art: object, cx: number, y: number}[]} 拱門的位置（拱頂每幀畫在角色上方）。
   */
  drawDoorways(g, world, ramps, solid, lights) {
    const f = world.floor;
    const steps = propArt('steps', ramps.stone);
    const arch = propArt('archway', ramps.stone);
    const arches = [];
    if (!steps && !arch) return arches;
    const done = new Set();
    /**
     * 這一格是不是一般地板（不是牆、樓梯或地刺）。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 一般地板時為 true。
     */
    const plain = (i, j) => !solid(i, j) && f.tiles[j * f.w + i] === 1;
    for (const r of f.rooms) {
      for (let i = r.x; i < r.x + r.w - 1; i++) {
        for (const [j, north] of [[r.y - 1, true], [r.y + r.h, false]]) {
          const out = north ? j - 1 : j + 1;
          const key = `${i},${j}`;
          // 門口：牆上 2 格寬的缺口（走廊寬 2 格；兩側是牆、外側接著走廊）。
          if (done.has(key) || j < 1 || j >= f.h - 1 || !plain(i, j) || !plain(i + 1, j) || !solid(i - 1, j) || !solid(i + 2, j) || solid(i, out) || solid(i + 1, out)) continue;
          done.add(key);
          if (steps) drawWideSteps(g, steps.frames[0], i * T, j * T, north);
          if (!north && !lights.noFire) {
            // 南側石階兩旁的牆緣上各立一盆火，像守著出口。
            for (const fx of [(i - 1) * T + 8, (i + 2) * T + 8]) {
              drawFireBowl(g, fx, j * T + 6);
              lights.flames.push({ x: fx, y: j * T + 5, s: 1 });
            }
          }
          // 拱門約 3 格高：門口上方兩格的兩側都要是牆（真的有一段走廊），拱門才不會畫到另一個房間的地板上。
          const tall = [1, 2].every((d) => solid(i - 1, j - d) && solid(i + 2, j - d));
          if (north && arch && tall) {
            blitProp(g, arch, (i + 1) * T, (j + 1) * T - arch.h / 2);
            // 拱門兩旁的牆面掛火把。
            if (!lights.noFire && lights.torchArt) {
              for (const ti of [i - 2, i + 3]) {
                if (!lights.isFace(ti, j) || lights.torches.some((t) => t.j === j && Math.abs(t.i - ti) < 3)) continue;
                blitProp(g, lights.torchArt, ti * T + 8, j * T + 6);
                lights.torches.push({ i: ti, j, px: ti * T + 8 });
              }
            }
            // 拱頂另外記下來，每幀畫在角色上方（角色從拱門下穿過）。
            arches.push({ art: arch, cx: (i + 1) * T, y: (j + 1) * T - arch.h / 2 });
          }
        }
      }
    }
    return arches;
  }

  /**
   * 房間的擺設（有設計圖時）：房間中央偶爾鋪地毯；房間四個角落依位置放蜘蛛網（只在上方兩角）、火盆、陶罐、麻布袋、蠟燭或斷柱。
   * 只是裝飾，不影響行走（樓梯、地刺、寶箱與起點附近不放）。
   * @param {CanvasRenderingContext2D} g 地圖離屏畫布。
   * @param {object} world 探險。
   * @param {{stone: string[], rock: string[], cloth: string[]}} ramps 上色色階。
   * @param {(i: number, j: number) => boolean} solid 是否為牆。
   * @param {string} theme 區域色調名稱。
   * @returns {{x: number, y: number}[]} 火盆的位置（世界像素，火焰與光每幀另外畫）。
   */
  placeRoomDecor(g, world, ramps, solid, theme) {
    const f = world.floor;
    const braziers = [];
    const busy = new Set([f.stairs, f.start, ...world.chests.map((c) => ({ x: Math.floor(c.x), y: Math.floor(c.y) }))].filter(Boolean).map((p) => `${Math.floor(p.x)},${Math.floor(p.y)}`));
    /**
     * 這一格能不能放擺設（地板、不是樓梯地刺、附近沒有寶箱與起點）。
     * @param {number} i 格子 x。
     * @param {number} j 格子 y。
     * @returns {boolean} 可以放時為 true。
     */
    const free = (i, j) => !solid(i, j) && f.tiles[j * f.w + i] === 1 && !busy.has(`${i},${j}`);
    for (const [n, room] of f.rooms.entries()) {
      // 地毯：房間夠大時，約三分之一的房間在中央鋪一張。
      const rug = propArt('rug');
      if (rug && room.w >= 5 && room.h >= 4 && hash(n + 77, room.x) < 0.35 && free(room.cx, room.cy) && free(room.cx + 1, room.cy)) {
        blitProp(g, rug, (room.cx + 1) * T, room.cy * T + 8 - rug.h / 4);
      }
      const corners = [[room.x, room.y, 'tl'], [room.x + room.w - 1, room.y, 'tr'], [room.x, room.y + room.h - 1, 'bl'], [room.x + room.w - 1, room.y + room.h - 1, 'br']];
      for (const [i, j, c] of corners) {
        if (!free(i, j)) continue;
        const v = hash(i * 7 + n, j * 3 + 11);
        if ((c === 'tl' || c === 'tr') && v < 0.35 && PROP_SPRITES.cobweb) {
          // 蜘蛛網：貼在上方角落（右上角左右翻轉）。
          const art = propArt('cobweb', ramps.stone);
          const w = art.w / 2;
          const h = art.h / 2;
          g.save();
          if (c === 'tr') { g.translate((i + 1) * T, 0); g.scale(-1, 1); g.drawImage(art.frames[0], 0, j * T, w, h); } else g.drawImage(art.frames[0], i * T, j * T, w, h);
          g.restore();
          continue;
        }
        if (v > 0.7) continue;
        const kinds = ['brazier', 'urns', 'sacks', 'candles', 'pillarStump'].filter((k) => PROP_SPRITES[k] && !(k === 'brazier' && theme === 'sea'));
        if (!kinds.length) continue;
        const kind = kinds[Math.floor(hash(i + 5, j * 9 + n) * kinds.length)];
        const art = propArt(kind, ramps.stone);
        const cx = i * T + 8 + (c.endsWith('l') ? -1 : 1);
        const bottom = (j + 1) * T - 1;
        groundShadow(g, cx, bottom, Math.min(14, art.w / 2));
        blitProp(g, art, cx, bottom - art.h / 2);
        if (kind === 'brazier') braziers.push({ x: cx, y: bottom - art.h / 2 + 2 });
      }
    }
    // 沿牆的小擺設：每個房間在貼著牆的地板上再放 2～4 個（蠟燭、陶罐、麻布袋、頭骨堆、木桶），避開角落與門口。
    const edgeKinds = ['candles', 'urns', 'sacks', 'skulls', 'barrel'].filter((k) => PROP_SPRITES[k]);
    for (const [n, room] of f.rooms.entries()) {
      if (!edgeKinds.length) break;
      const spots = [];
      for (let i = room.x + 1; i < room.x + room.w - 1; i++) {
        if (solid(i, room.y - 1)) spots.push([i, room.y]);
        if (solid(i, room.y + room.h)) spots.push([i, room.y + room.h - 1]);
      }
      for (let j = room.y + 1; j < room.y + room.h - 1; j++) {
        if (solid(room.x - 1, j)) spots.push([room.x, j]);
        if (solid(room.x + room.w, j)) spots.push([room.x + room.w - 1, j]);
      }
      const want = 2 + Math.floor(hash(n + 401, room.y) * 3);
      let placed = 0;
      for (let k = 0; k < spots.length && placed < want; k++) {
        const [i, j] = spots[Math.floor(hash(n * 13 + k, room.x + k * 7) * spots.length)];
        if (!free(i, j) || busy.has(`${i},${j}`)) continue;
        busy.add(`${i},${j}`);
        const art = propArt(edgeKinds[Math.floor(hash(i + 91, j + 37) * edgeKinds.length)], ramps.stone);
        const cx = i * T + 8 + (solid(i - 1, j) ? -2 : solid(i + 1, j) ? 2 : 0);
        const bottom = (j + 1) * T - (solid(i, j + 1) ? 2 : 4);
        groundShadow(g, cx, bottom, Math.min(14, art.w / 2));
        blitProp(g, art, cx, bottom - art.h / 2);
        placed++;
      }
    }
    return braziers;
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

    g.drawImage(this.floorCache.canvas, 0, 0, f.w * T, f.h * T);
    this.drawDynamicTiles(world);
    this.drawHazards(world);
    this.drawDecals(dt);
    this.drawTelegraphs(world);
    this.drawStrikes(world);
    this.drawChestsAndPickups(world);
    this.drawPortal(world);
    this.drawEntities(world);
    this.drawArchFronts();
    this.drawProjectiles(world);
    this.drawEffects(world);
    this.castAura(world);
    this.chargeFx(world, dt);
    this.drawFx(dt);
    this.drawLighting(world);
    this.drawFog(world);
    this.drawScreenFlash(dt);
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
   * 畫會變化的格子：地刺（升起時為尖刺，降下時為小孔）與牆上火把的閃爍火焰。
   * @param {object} world 探險。
   */
  drawDynamicTiles(world) {
    const g = this.ctx;
    const f = world.floor;
    const v = this.visible();
    for (const tc of this.floorCache.torches) {
      if (tc.i < v.i0 - 1 || tc.i > v.i1 || tc.j < v.j0 || tc.j > v.j1) continue;
      const x = (tc.px ?? tc.i * T + 8) - 8;
      const y = tc.j * T;
      // 光暈由光影（drawLighting）負責，這裡只畫閃爍的火焰。
      const flick = Math.floor(world.time * 8 + tc.i * 3) % 3;
      g.fillStyle = '#e8541c';
      g.fillRect(x + 6, y + 4 - (flick === 1 ? 1 : 0), 4, 3 + (flick === 1 ? 1 : 0));
      g.fillStyle = '#ffb030';
      g.fillRect(x + 7 - (flick === 2 ? 1 : 0), y + 3, 2, 3);
      g.fillStyle = '#fff2b0';
      g.fillRect(x + 7, y + 5, 1 + (flick === 0 ? 1 : 0), 1);
    }
    for (const b of this.floorCache.flames || []) {
      // 柱頂與石階旁的火焰：比火盆小一點的三層火舌。
      const fl = Math.floor(world.time * 9 + b.x * 0.7) % 3;
      const k = b.s || 1;
      g.fillStyle = '#e8541c';
      g.fillRect(b.x - 2 * k, b.y - 3 * k - (fl === 1 ? 1 : 0), 4 * k, 3 * k + (fl === 1 ? 1 : 0));
      g.fillStyle = '#ffb030';
      g.fillRect(b.x - 1 * k + (fl === 2 ? 0.5 : 0), b.y - 4.5 * k, 2 * k, 4 * k);
      g.fillStyle = '#fff2b0';
      g.fillRect(b.x - 0.5, b.y - 2 * k, 1, 1.5 * k);
    }
    for (const b of this.floorCache.braziers || []) {
      // 火盆的火焰：三層閃爍的火舌。
      const fl = Math.floor(world.time * 9 + b.x) % 3;
      g.fillStyle = '#e8541c';
      g.fillRect(b.x - 3, b.y - 4 - (fl === 1 ? 1 : 0), 6, 4 + (fl === 1 ? 1 : 0));
      g.fillStyle = '#ffb030';
      g.fillRect(b.x - 2 + (fl === 2 ? 1 : 0), b.y - 6, 3, 5);
      g.fillStyle = '#fff2b0';
      g.fillRect(b.x - 1, b.y - 3, 2, 2);
    }
    const up = world.spikesUp();
    for (let j = Math.max(0, v.j0); j < Math.min(f.h, v.j1); j++) {
      for (let i = Math.max(0, v.i0); i < Math.min(f.w, v.i1); i++) {
        if (f.tiles[j * f.w + i] !== SPIKES) continue;
        const x = i * T;
        const y = j * T;
        // 地刺：有設計圖時用收起／升起兩格，否則用手寫的像素圖。
        const art = propArt('spikes');
        // 以收起的鐵板為底（底部對齊格子下緣），升起時在 4 個孔位畫出往上伸出格子的長尖刺。
        if (art) {
          blitProp(g, art, x + 8, y + T + 1 - art.h / 2, 0);
          if (up) drawSpikeBlades(g, x, y);
        }
        else drawSpikeTrap(g, x, y, up);
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
      // 普通攻擊（hidden）不畫預警範圍。
      if (tg.delay > 0 || tg.hidden) continue;
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
      // 即將判定（最後 20%）時外框閃白，提醒玩家馬上離開。
      g.strokeStyle = k > 0.8 && Math.floor(world.time * 24) % 2 ? 'rgba(255,255,255,0.95)' : 'rgba(255,90,90,0.95)';
      if (tg.boss) {
        // Boss 的預警：外框較粗，並帶攻擊屬性顏色的光暈。
        g.lineWidth = 1.5;
        g.shadowColor = `rgba(${elementOf(tg.src).rgb},0.9)`;
        g.shadowBlur = 3 * this.scale;
      }
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
      g.shadowBlur = 0;
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
      // 寶箱：有設計圖時用關閉／打開兩格（密度 2，世界大小為一半），否則用道具圖。
      const art = propArt('chest');
      if (art) {
        const bx = Math.round(c.x * T);
        const by = Math.round(c.y * T + art.h / 4);
        groundShadow(g, bx, by, art.w / 2 - 2);
        blitProp(g, art, bx, by - art.h / 2, c.opened ? 1 : 0);
        if (!c.opened && Math.floor(world.time * 3 + c.x * 7) % 6 === 0) {
          g.fillStyle = '#fff6c8';
          g.fillRect(bx + art.w / 4 - 2, by - art.h / 2 - 2, 1, 5);
          g.fillRect(bx + art.w / 4 - 4, by - art.h / 2, 5, 1);
        }
        continue;
      }
      const img = itemArt(c.opened ? 'chestOpen' : 'chest');
      const x = Math.round(c.x * T - img.width / 2);
      const y = Math.round(c.y * T - img.height / 2);
      // 地上的影子；還沒開的寶箱偶爾閃一下金光。
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x + 1, y + img.height - 1, img.width, 2);
      g.drawImage(img, x, y);
      if (!c.opened && Math.floor(world.time * 3 + c.x * 7) % 6 === 0) {
        g.fillStyle = '#fff6c8';
        g.fillRect(x + img.width - 3, y - 2, 1, 5);
        g.fillRect(x + img.width - 5, y, 5, 1);
      }
    }
    for (const it of world.pickups) {
      const bob = Math.round(Math.sin(world.time * 5 + it.x) * 1);
      const name = it.kind === 'gem' ? `gem-${it.gem.split('-')[0]}` : it.kind === 'mat' ? it.mat : it.kind === 'homeMat' ? `hm-${it.mat}` : { gold: 'coin', potion: 'potion', cure: 'cure', bagExpand: 'pouch', book: 'book', skillBook: 'skillbook', recipe: 'blueprint', seed: 'seedBag', meat: 'meat' }[it.kind] || 'bag';
      const img = itemArt(name);
      // 高密度的道具圖（density）以實際大小（世界像素）繪製。
      const iw = img.width / (img.density || 1);
      const ih = img.height / (img.density || 1);
      const x = Math.round(it.x * T - iw / 2);
      const y = Math.round(it.y * T - ih / 2) + bob;
      if (it.kind === 'item') {
        // 裝備：以稀有度顏色的光柱標示。
        g.fillStyle = RARITIES[it.item.rarity].color;
        g.globalAlpha = 0.35;
        g.fillRect(x + 1, y - 8, iw - 2, 8);
        g.globalAlpha = 1;
      } else if (it.kind === 'gem') {
        // 寶石：一閃一閃的白色十字光。
        const tw = Math.floor(world.time * 4 + it.x * 3) % 4 === 0;
        if (tw) {
          g.fillStyle = '#ffffff';
          g.fillRect(x + iw - 2, y - 3, 1, 5);
          g.fillRect(x + iw - 4, y - 1, 5, 1);
        }
      }
      g.drawImage(img, x, y, iw, ih);
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
        // 依面向選方向：正面（朝下）、背面（朝上）、側面（面向左時翻轉）。
        const vertical = Math.abs(p.facing.y) > Math.abs(p.facing.x) * 1.2;
        const dir = vertical ? (p.facing.y > 0 ? 'down' : 'up') : 'side';
        const set = (p.hurt > 0.15 ? art.flash : art.dirs)[dir];
        const flip = dir === 'side' && p.facing.x < 0;
        // 攻擊或施放技能：有動作圖時逐格播放該方向的 6～8 格（準備 → 起手 → 揮擊 → 命中 → 收招 → 回到待機），
        // 沒有動作圖時以前衝、伸縮與前傾表現 6 個階段。
        const acting = p.attackAnim > 0 || p.skillAnim > 0;
        const ak = acting ? 1 - Math.max(p.attackAnim / ATTACK_TIME, p.skillAnim / 0.25) : 1;
        const phase = acting ? attackPhase(ak) : -1;
        const animated = acting && set.attack;
        const ph = acting && !animated ? ATTACK_POSES[phase] : null;
        // 走路循環 4 格（踏步 → 上浮 → 換腳 → 上浮），每秒 8 格。
        const step = Math.floor(world.time * 8) % 4;
        // 動作圖依格數平均分配出手時間（6 格或 8 格）。
        const frameIdx = animated ? Math.min(set.attack.length - 1, Math.floor(ak * set.attack.length)) : 0;
        const img = animated ? set.attack[frameIdx] : p.moving ? set.walk[step] : set.stand;
        const lunge = ph ? ph[1] : 0;
        const px = p.x * T + p.facing.x * lunge;
        const py = p.y * T + p.facing.y * lunge;
        const bob = !p.moving && !acting && Math.floor(world.time * 2) % 2 ? 1 : 0;
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
        const sy = ph ? ph[2] : 1;
        // 左右出手時身體朝面向前傾（往上、往下出手時不傾斜）。
        const tilt = ph && dir === 'side' ? ph[3] * (flip ? -1 : 1) : 0;
        const hidden = blink && p.dodgeT <= 0;
        // 角色圖腳底以下留有特效用的列，往下移讓腳踩在原本的位置。
        const dens = this.heroDensity || art.density;
        if (!hidden) this.sprite(img, px / T, py / T + art.foot / dens / T, flip, 1, bob, sy, dens, tilt);
        g.globalAlpha = 1;
        this.drawPlayerAuras(world);
        const head = Math.round(p.y * T + 5 - art.standH / dens);
        this.statusMarks(world, p.x * T, head - 16, p.status);
        this.playerBar(world, p, head);
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
      // 有動作圖的 Boss 與一般怪物（4 格）：平常在待機 A／B 間交替，預警蓄力時顯示蓄力，出手後 0.3 秒顯示出招。
      const img = art.poses ? frames[this.posedFrame(world, m)] : frames[walkFrame % frames.length];
      // 高密度的圖（Boss 動作圖與精緻化的怪物圖）依畫面放大倍率換算，與角色相同。
      const dens = art.density ? this.heroDensity || art.density : 1;
      const scale = art.scale * (m.elite ? 1.25 : 1) * (m.small ? 0.7 : 1) * (m.evolved ? 1.15 : 1);
      const iw = img.width / dens;
      const ih = img.height / dens;
      // 圖的腳底以下留給特效的列，往下移讓腳踩在原本的位置；動作圖（Boss 與一般怪物）再把腳對齊影子中心（shadow 的 y + r × 0.6）。
      const footY = art.density ? (art.foot * scale) / dens / T + (art.poses ? (m.r * T * 0.9 * 0.6 - 5 * Math.min(scale, 1.5)) / T : 0) : 0;
      const bob = art.frames.length === 1 ? (walkFrame ? 1 : 0) : 0;
      this.shadow(m.x, m.y, m.r * T * 0.9);
      if (m.elite) {
        g.strokeStyle = '#e8b84a';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(m.x * T, m.y * T + m.r * T * 0.5, m.r * T, m.r * T * 0.45, 0, 0, Math.PI * 2);
        g.stroke();
        if (m.affix) {
          // 菁英詞綴：內圈顏色（迅捷紅、爆裂橘、射手綠），爆裂快爆發時閃爍。
          const warn = m.affix === 'nova' && m.affixT < 1 && Math.floor(world.time * 10) % 2;
          g.strokeStyle = warn ? '#ffffff' : { frenzy: '#ff5a5a', nova: '#ff9a3a', volley: '#7ad06a' }[m.affix];
          g.beginPath();
          g.ellipse(m.x * T, m.y * T + m.r * T * 0.5, m.r * T * 0.7, m.r * T * 0.3, 0, 0, Math.PI * 2);
          g.stroke();
        }
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
        const cy = m.y * T + 5 * Math.min(scale, 1.5) - (ih * scale) / 2;
        const glow = g.createRadialGradient(m.x * T, cy, 0, m.x * T, cy, iw * scale * 0.9);
        glow.addColorStop(0, `rgba(255,170,60,${0.35 + 0.15 * pulse})`);
        glow.addColorStop(1, 'rgba(255,90,40,0)');
        g.fillStyle = glow;
        g.beginPath();
        g.arc(m.x * T, cy, iw * scale * 0.9, 0, Math.PI * 2);
        g.fill();
        g.shadowColor = `rgba(255,${150 + Math.round(70 * pulse)},70,0.95)`;
        g.shadowBlur = 6 * this.scale;
      }
      // 蓄力中的怪物上下抖動，配合地面預警。
      const shakeX = m.state === 'windup' || m.state === 'charge' || m.state === 'aim' || m.state === 'cast' ? (walkFrame ? 0.5 : -0.5) : 0;
      this.sprite(img, m.x + shakeX / T, m.y + footY, world.player.x < m.x, scale, dormant ? 0 : bob, 1, dens);
      g.globalAlpha = 1;
      g.filter = 'none';
      g.shadowBlur = 0;
      const top = Math.round(m.y * T - (ih * scale) / 2 - 10 - m.r * T * 0.3);
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
        const y = Math.round(m.y * T - (ih * scale) / 2 - 6 - m.r * T * 0.3);
        g.fillStyle = '#1a1020';
        g.fillRect(x - 1, y - 1, w + 2, 4);
        g.fillStyle = m.elite ? '#e8b84a' : '#e04a5a';
        g.fillRect(x, y, Math.max(0, Math.round((w * m.hp) / m.maxHp)), 2);
      }
      if (m.boss) this.bossBar(world, m, Math.round(m.y * T + 5 * Math.min(scale, 1.5) - ih * scale));
    }
  }

  /**
   * 選擇動作圖的格子（0 待機 A、1 待機 B、2 蓄力、3 出招），Boss 與有動作圖的一般怪物共用：
   * - Boss：預警與施法中（windup、aim、cast、attacking、healing，或普攻預警 windUntil 未到）為蓄力，待機每 0.5 秒交替；
   * - 一般怪物：windup、charge、aim、cast、burrow（或 windUntil 未到）為蓄力，衝刺與俯衝（dash、dive、attacking）為出招，待機每 0.4 秒交替；
   * - 從蓄力狀態離開、或剛射出投射物（strikeUntil）後 0.3 秒為出招。
   * 會在怪物物件上記錄上一格的狀態（poseWind）與出招結束時間（strikeUntil），只影響畫面。
   * @param {object} world 探險（取時間）。
   * @param {object} m Boss 或怪物（會被修改）。
   * @returns {number} 格子索引。
   */
  posedFrame(world, m) {
    const wind = (m.boss ? BOSS_WIND.has(m.state) : MONSTER_POSE_WIND.has(m.state)) || (m.windUntil ?? 0) > world.time;
    if (m.poseWind && !wind) m.strikeUntil = Math.max(m.strikeUntil ?? 0, world.time + 0.3);
    m.poseWind = wind;
    if ((m.strikeUntil ?? 0) > world.time) return 3;
    if (wind) return 2;
    if (!m.boss && MONSTER_STRIKE.has(m.state)) return 3;
    return Math.floor(world.time * (m.boss ? 2 : 2.5)) % 2;
  }

  /**
   * 畫 Boss 頭上的血條與名牌（跟著 Boss 移動，比一般怪物的血條長）：受傷時白色殘影延遲消退，
   * 回復中變為閃爍的綠色、狂暴時為紅色，名牌標示強化、回復中、狂暴或第二階段。
   * 會在怪物物件上記錄殘影的位置（hpTrail）。
   * @param {object} world 探險（取時間做閃爍）。
   * @param {object} m Boss。
   * @param {number} head 頭頂的 y（像素）。
   */
  bossBar(world, m, head) {
    const g = this.ctx;
    const w = Math.max(36, Math.round(m.r * T * 3));
    const x = Math.round(m.x * T - w / 2);
    const y = head - 6;
    const ratio = Math.max(0, m.hp / m.maxHp);
    // 殘影：每幀往目前血量靠近，回血時直接跟上。
    m.hpTrail = m.hpTrail === undefined || m.hpTrail < ratio ? ratio : m.hpTrail + (ratio - m.hpTrail) * 0.06;
    const healing = m.state === 'healing';
    g.fillStyle = '#1a1020';
    g.fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle = '#3a2a40';
    g.fillRect(x, y, w, 3);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(x, y, Math.round(w * m.hpTrail), 3);
    const fill = healing ? (Math.floor(world.time * 8) % 2 ? '#5fd068' : '#3ab04a') : m.enraged ? '#e04a4a' : '#a04ae0';
    g.fillStyle = fill;
    g.fillRect(x, y, Math.round(w * ratio), 3);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x, y, Math.round(w * ratio), 1);
    // 名牌：小字置中在血條上方。
    const name = `${m.abyss ? '強化・' : ''}${m.name}${healing ? '（回復中）' : m.enraged ? '（狂暴）' : m.phase2 ? '（第二階段）' : ''}`;
    g.save();
    g.font = 'bold 6px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#1a1020';
    g.fillText(name, m.x * T + 0.6, y - 2.4);
    g.fillStyle = healing ? '#a8f0b0' : '#f0e0a0';
    g.fillText(name, m.x * T, y - 3);
    g.restore();
  }

  /**
   * 畫玩家頭上的血條與名牌（跟 Boss 血條同樣的樣式，橫版畫面看不到 HUD 時也能掌握血量）：
   * 受傷時白色殘影延遲消退，護盾量以藍白色接在血量後面，血量低於 30% 時閃紅。
   * 會在玩家物件上記錄殘影的位置（hpTrail）。
   * @param {object} world 探險（取角色名稱、等級與時間）。
   * @param {object} p 玩家。
   * @param {number} head 頭頂的 y（像素）。
   */
  playerBar(world, p, head) {
    const g = this.ctx;
    const w = 26;
    const x = Math.round(p.x * T - w / 2);
    const y = head - 4;
    const max = Math.max(1, p.maxHp);
    const ratio = Math.max(0, Math.min(1, p.hp / max));
    p.hpTrail = p.hpTrail === undefined || p.hpTrail < ratio ? ratio : p.hpTrail + (ratio - p.hpTrail) * 0.06;
    const shield = Math.max(0, Math.min(1 - ratio, (p.shield || 0) / max));
    const low = ratio < 0.3;
    g.fillStyle = '#1a1020';
    g.fillRect(x - 1, y - 1, w + 2, 5);
    g.fillStyle = '#3a2a40';
    g.fillRect(x, y, w, 3);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(x, y, Math.round(w * p.hpTrail), 3);
    g.fillStyle = low ? (Math.floor(world.time * 6) % 2 ? '#ff5a5a' : '#c03a3a') : ratio < 0.6 ? '#e8c04a' : '#5fd068';
    g.fillRect(x, y, Math.round(w * ratio), 3);
    if (shield > 0) {
      g.fillStyle = '#c8e6ff';
      g.fillRect(x + Math.round(w * ratio), y, Math.max(1, Math.round(w * shield)), 3);
    }
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x, y, Math.round(w * ratio), 1);
    const ch = world.ch || {};
    const name = `${ch.name || ''}${ch.level ? ` Lv.${ch.level}` : ''}`;
    if (!name) return;
    g.save();
    g.font = 'bold 6px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillStyle = '#1a1020';
    g.fillText(name, p.x * T + 0.6, y - 2.4);
    g.fillStyle = '#d8f0ff';
    g.fillText(name, p.x * T, y - 3);
    g.restore();
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
    if (p.leechT > 0 || p.hasteT > 0 || p.regenT > 0 || p.imbueT > 0) {
      // 嗜血紅、回春綠、毒刃紫、疾風白：上升的光點。
      g.fillStyle = p.leechT > 0 ? '#ff5a6a' : p.regenT > 0 ? '#8af09a' : p.imbueT > 0 ? '#c07aff' : '#c8f0ff';
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
   * @param {number} [density=1] 圖的像素密度（角色圖為 2：每 2 個圖像素佔世界的 1 像素）。
   * @param {number} [tilt=0] 以腳底為支點的傾斜角度（弧度，正值往右傾）。
   */
  sprite(img, x, y, flip, scale, bob, sy = 1, density = 1, tilt = 0) {
    const g = this.ctx;
    const w = (img.width / density) * scale * (2 - sy);
    const h = (img.height / density) * scale * sy;
    const px = Math.round(x * T - w / 2);
    const py = Math.round(y * T + 5 * Math.min(scale, 1.5) - h) + bob;
    if (tilt) {
      g.save();
      g.translate(px + w / 2, py + h);
      g.rotate(tilt);
      g.translate(-(px + w / 2), -(py + h));
    }
    if (flip) {
      g.save();
      g.translate(px + w, py);
      g.scale(-1, 1);
      g.drawImage(img, 0, 0, w, h);
      g.restore();
    } else {
      g.drawImage(img, px, py, w, h);
    }
    if (tilt) g.restore();
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
      if (pr.team === 'e') {
        // 敵方投射物：沿路灑下屬性顏色的光點；Boss 的投射物外圍另有脈動的光環。
        const el = ELEMENTS[SHOT_ELEMENT[pr.kind] || 'blood'];
        if (Math.random() < (pr.boss ? 0.8 : 0.45)) {
          this.emit({ kind: 'ember', x: x + (Math.random() - 0.5) * 3, y: y + (Math.random() - 0.5) * 3, vx: -pr.vx * 1.5 + (Math.random() - 0.5) * 10, vy: -pr.vy * 1.5 + (Math.random() - 0.5) * 10, life: 0.25 + Math.random() * 0.2, rgb: Math.random() < 0.6 ? el.rgb : el.core, size: pr.boss && Math.random() < 0.5 ? 2 : 1 });
        }
        if (pr.boss) {
          g.strokeStyle = `rgba(${el.core},${0.45 + 0.3 * Math.sin(this.frame * 0.5)})`;
          g.lineWidth = 1;
          g.beginPath();
          g.arc(x, y, pr.r * T * 2.4, 0, Math.PI * 2);
          g.stroke();
        }
      }
      const colors = { orb: ['200,168,255', '#c8a8ff'], fire: ['255,120,40', '#ff8a3a'], ice: ['122,200,255', '#9ad8ff'], seed: ['140,200,90', '#8ac85a'], feather: ['240,240,250', '#e8e8f4'], curse: ['160,90,210', '#a05ad2'], sand: ['220,190,110', '#e0c070'], bubble: ['120,200,255', '#a8e4ff'], gear: ['200,200,215', '#c8c8d8'], dark: ['210,60,100', '#d8406a'] }[pr.look === 'fireball' ? 'fire' : pr.kind] || ['255,255,255', '#fff'];
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
   * 加入一個特效粒子（超過上限時丟掉最舊的）。
   * @param {object} p 粒子：kind（spark 火花、ember 餘燼、ring 衝擊波、flash 閃光、pillar 光柱、rune 符文圈）、
   *   x、y（像素）、vx、vy（像素／秒）、life（秒）、size、rgb、gravity（像素／秒²）、r0／r1（環的起訖半徑）。
   */
  emit(p) {
    if (this.fx.length >= FX_MAX) this.fx.shift();
    this.fx.push({ t: 0, vx: 0, vy: 0, gravity: 0, size: 1, ...p });
  }

  /**
   * 從一點向外噴出火花與餘燼。
   * @param {number} x 中心 x（像素）。
   * @param {number} y 中心 y（像素）。
   * @param {string} rgb 顏色。
   * @param {number} n 火花數量。
   * @param {number} speed 速度（像素／秒）。
   * @param {number} [dir] 指定時只往這個方向 ±spread 噴出。
   * @param {number} [spread=Math.PI] 噴出角度的一半。
   */
  burst(x, y, rgb, n, speed, dir, spread = Math.PI) {
    for (let i = 0; i < n; i++) {
      const a = (dir ?? 0) + (Math.random() * 2 - 1) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.emit({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.25 + Math.random() * 0.3, rgb, gravity: 60 });
    }
    for (let i = 0; i < Math.ceil(n / 3); i++) {
      this.emit({ kind: 'ember', x: x + (Math.random() - 0.5) * 8, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 20, vy: -15 - Math.random() * 25, life: 0.5 + Math.random() * 0.5, rgb, size: 1 + (Math.random() < 0.3 ? 1 : 0) });
    }
  }

  /**
   * 依畫面效果產生特效粒子：技能與爆炸有閃光、衝擊波、火花與餘燼（直線沿線、扇形沿弧分布）；
   * 命中有火花，技能的斬擊沿刀光邊緣灑出火花，連鎖閃電在每個命中點爆出火花，升級有金色光柱。
   * @param {object} world 探險（取職業）。
   * @param {object} e 效果。
   */
  spawnFx(world, e) {
    // 怪物與 Boss 的攻擊（普攻揮砍、招式爆發、投射物命中）另外依屬性產生特效。
    if ((e.kind === 'slash' && e.enemy) || (e.kind === 'blast' && !e.friendly) || e.kind === 'impact') {
      this.enemyFx(e);
      return;
    }
    const x = e.x * T;
    const y = e.y * T;
    if (e.kind === 'blast') {
      const rgb = e.friendly ? LOOK_COLORS[e.look] || '200,168,255' : '255,140,60';
      const r = (e.r || 1) * T;
      if (e.shape === 'line') {
        const len = (e.len || 3) * T;
        for (let d = 0; d <= len; d += 6) this.burst(x + Math.cos(e.angle) * d, y + Math.sin(e.angle) * d, rgb, 2, 50);
        this.emit({ kind: 'flash', x: x + Math.cos(e.angle) * len * 0.5, y: y + Math.sin(e.angle) * len * 0.5, life: 0.18, size: (e.width || 1) * T * 1.4, rgb });
        return;
      }
      if (e.shape === 'arc' && e.arc) {
        for (let i = 0; i <= 6; i++) {
          const a = e.angle - e.arc / 2 + (e.arc * i) / 6;
          this.burst(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, rgb, 2, 60, a, 0.6);
        }
        return;
      }
      this.emit({ kind: 'flash', x, y, life: 0.2, size: r * 1.1, rgb });
      this.emit({ kind: 'ring', x, y, life: 0.35, r0: r * 0.3, r1: r * 1.15, rgb, size: 3 });
      if (e.friendly && r >= 2 * T) this.emit({ kind: 'ring', x, y, life: 0.5, r0: r * 0.1, r1: r * 0.8, rgb: '255,255,255', size: 1.5 });
      this.burst(x, y, rgb, Math.min(28, Math.round(8 + r / 2)), 40 + r * 2.2);
    } else if (e.kind === 'hit') {
      this.emit({ kind: 'flash', x, y, life: 0.12, size: 7, rgb: '255,250,220' });
      this.burst(x, y, '255,236,170', 5, 70, e.angle, 0.9);
    } else if (e.kind === 'slash' && !e.basic && !e.enemy) {
      const rgb = CLASS_FX[world.ch.cls] || '255,255,255';
      const r = (e.range || 1.5) * T + 2;
      for (let i = 0; i <= 5; i++) {
        const a = e.angle - (e.arc || 2) / 2 + ((e.arc || 2) * i) / 5;
        this.burst(x + Math.cos(a) * r, y - 3 + Math.sin(a) * r, rgb, 2, 50, a, 0.5);
      }
    } else if (e.kind === 'bolt') {
      for (const pt of e.points || []) this.burst(pt.x * T, pt.y * T - 4, '210,235,255', 5, 80);
    } else if (e.kind === 'cast' && e.look === 'orb') {
      this.burst(x, y, '200,140,255', 5, 40, e.angle, 0.7);
    } else if (e.kind === 'levelup') {
      this.emit({ kind: 'pillar', x, y, life: 0.9, size: 12, rgb: '255,220,120' });
      this.burst(x, y, '255,220,120', 14, 50, -Math.PI / 2, 1.1);
    }
  }

  /**
   * 怪物與 Boss 攻擊的特效：依攻擊屬性（elementOf，投射物依 SHOT_ELEMENT）決定顏色與飛散的粒子。
   * 揮砍沿刀光外緣灑出火花；直線為光束；環狀沿圓周爆開；扇形為掃過的弧光；圓形有閃光、衝擊波、粒子與地面痕跡。
   * Boss 的粒子數量約 1.8 倍，並加上第二層衝擊波、光柱、畫面震動，大範圍招式另有全畫面閃光。
   * @param {object} e 效果（slash 普攻揮砍、blast 招式爆發、impact 投射物命中；src 為怪物種類、boss 是否為 Boss）。
   */
  enemyFx(e) {
    const x = e.x * T;
    const y = e.y * T;
    const boss = !!e.boss;
    const el = e.kind === 'impact' ? ELEMENTS[SHOT_ELEMENT[e.look] || 'blood'] : elementOf(e.src);
    const k = boss ? 1.8 : 1;
    if (e.kind === 'impact') {
      this.emit({ kind: 'flash', x, y: y - 3, life: 0.16, size: boss ? 12 : 8, rgb: el.rgb });
      this.emit({ kind: 'ring', x, y: y - 3, life: 0.25, r0: 1, r1: boss ? 12 : 8, rgb: el.core, size: 1.5 });
      this.bits(el, x, y - 3, Math.round(5 * k), 50 * k, (e.angle ?? 0) + Math.PI, 1.2);
      return;
    }
    if (e.kind === 'slash') {
      const r = (e.range || 1.5) * T + 2;
      const arc = e.arc || 2;
      const n = boss ? 8 : 4;
      for (let i = 0; i <= n; i++) {
        const a = e.angle - arc / 2 + (arc * i) / n;
        this.burst(x + Math.cos(a) * r, y - 3 + Math.sin(a) * r, el.rgb, boss ? 3 : 2, 60 * k, a, 0.5);
      }
      if (boss) {
        // Boss 的重擊：再疊一層較寬的弧光，刀尖處爆出衝擊波、碎屑與地面痕跡。
        this.emit({ kind: 'crescent', x, y: y - 3, life: 0.3, r0: r * 0.45, r1: r * 1.25, angle: e.angle, arc: arc * 1.1, rgb: el.rgb, size: 4 });
        const tx = x + Math.cos(e.angle) * r * 0.85;
        const ty = y + Math.sin(e.angle) * r * 0.85;
        this.emit({ kind: 'ring', x: tx, y: ty, life: 0.35, r0: 2, r1: 18, rgb: el.core, size: 2 });
        this.bits(el, tx, ty, 10, 70, e.angle, 0.8);
        this.decal(tx, ty, 10, el, 2);
        this.shake(2, 0.15);
      }
      return;
    }
    const r = (e.r || 1) * T;
    if (e.shape === 'line') {
      // 光束：沿直線的發光帶，兩側灑出粒子。
      const len = (e.len || 3) * T;
      const w = (e.width || 1) * T;
      this.emit({ kind: 'beam', x, y, life: boss ? 0.42 : 0.28, len, angle: e.angle, size: w, rgb: el.rgb, core: el.core });
      for (let d = 0; d <= len; d += boss ? 8 : 12) {
        const side = e.angle + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        this.bits(el, x + Math.cos(e.angle) * d, y + Math.sin(e.angle) * d, boss ? 2 : 1, 40 * k, side, 0.6);
      }
      if (boss) {
        for (let d = 8; d <= len; d += 18) this.decal(x + Math.cos(e.angle) * d, y + Math.sin(e.angle) * d, w * 0.6, el, 2.2);
        this.shake(3, 0.2);
      }
      return;
    }
    if (e.shape === 'ring') {
      // 環狀震波：外圈衝擊波，沿圓周往外爆開。
      const n = Math.max(8, Math.round((r / 5) * (boss ? 1.5 : 1)));
      this.emit({ kind: 'ring', x, y, life: 0.35, r0: r * 0.85, r1: r * 1.1, rgb: el.rgb, size: boss ? 4 : 3 });
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.bits(el, x + Math.cos(a) * r, y + Math.sin(a) * r, 1, 50 * k, a, 0.4);
      }
      if (boss) this.shake(2, 0.15);
      return;
    }
    if (e.shape === 'arc' && e.arc) {
      // 扇形：從中心掃過的弧光，弧邊往外灑出粒子。
      this.emit({ kind: 'crescent', x, y, life: 0.3, r0: r * 0.25, r1: r, angle: e.angle, arc: e.arc, rgb: el.rgb, size: boss ? 4 : 2.5 });
      for (let i = 0; i <= 8; i++) {
        const a = e.angle - e.arc / 2 + (e.arc * i) / 8;
        this.bits(el, x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, boss ? 2 : 1, 60 * k, a, 0.5);
      }
      if (boss) this.shake(3, 0.2);
      return;
    }
    // 圓形爆發。
    this.emit({ kind: 'flash', x, y, life: 0.22, size: r * 1.2, rgb: el.rgb });
    this.emit({ kind: 'ring', x, y, life: 0.35, r0: r * 0.3, r1: r * 1.15, rgb: el.rgb, size: 3 });
    if (boss) {
      this.emit({ kind: 'ring', x, y, t: -0.08, life: 0.5, r0: r * 0.1, r1: r * 1.5, rgb: el.core, size: 2 });
      this.emit({ kind: 'pillar', x, y, life: 0.5, size: Math.min(24, r * 0.8), rgb: el.rgb });
    }
    this.bits(el, x, y, Math.min(boss ? 40 : 22, Math.round((8 + r / 2) * k)), 40 + r * 2);
    this.decal(x, y, r * 0.8, el, boss ? 2.5 : 1.6);
    if (boss) {
      this.shake(Math.min(5, 2 + r / T), 0.25);
      if (r >= 2.5 * T) this.flashScreen(el.rgb, 0.14);
    }
  }

  /**
   * 依屬性灑出粒子：餘燼、冰晶、氣泡、落雷、暗影、碎石、水滴、金屬火花或羽毛，有煙霧色的屬性再冒出幾團煙。
   * @param {{rgb: string, core: string, bits: string, smoke?: string}} el 屬性外觀。
   * @param {number} x 中心 x（像素）。
   * @param {number} y 中心 y（像素）。
   * @param {number} n 數量。
   * @param {number} speed 速度（像素／秒）。
   * @param {number} [dir] 指定時只往這個方向 ±spread 噴出。
   * @param {number} [spread=Math.PI] 噴出角度的一半。
   */
  bits(el, x, y, n, speed, dir, spread = Math.PI) {
    /** 隨機的噴出方向。 */
    const ang = () => (dir ?? 0) + (Math.random() * 2 - 1) * spread;
    /** 隨機的速度。 */
    const vel = () => speed * (0.4 + Math.random() * 0.8);
    for (let i = 0; i < n; i++) {
      const a = ang();
      const v = vel();
      const vx = Math.cos(a) * v;
      const vy = Math.sin(a) * v;
      switch (el.bits) {
        case 'ember':
          this.emit({ kind: 'spark', x, y, vx, vy, life: 0.25 + Math.random() * 0.3, rgb: el.core, gravity: 40 });
          this.emit({ kind: 'ember', x: x + (Math.random() - 0.5) * 8, y, vx: vx * 0.3, vy: -20 - Math.random() * 30, life: 0.6 + Math.random() * 0.5, rgb: el.rgb, size: Math.random() < 0.4 ? 2 : 1 });
          break;
        case 'shard':
          this.emit({ kind: 'shard', x, y, vx, vy: vy - 40, life: 0.45 + Math.random() * 0.3, rgb: Math.random() < 0.5 ? el.rgb : el.core, gravity: 160, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 20 });
          break;
        case 'bubble':
          this.emit({ kind: 'bubble', x: x + vx * 0.15, y: y + vy * 0.1, vx: vx * 0.25, vy: -15 - Math.random() * 25, life: 0.6 + Math.random() * 0.5, rgb: Math.random() < 0.7 ? el.rgb : el.core, size: 1 + Math.random() * 1.8 });
          break;
        case 'zap':
          // 數量少（沿線灑出）時只偶爾落雷，避免一整排落雷讓畫面過曝。
          if (i % 4 === 0 && (n >= 4 || Math.random() < 0.2)) this.emit({ kind: 'zap', x: x + vx * 0.25, y: y + vy * 0.2, life: 0.22, rgb: el.rgb, size: 26 + Math.random() * 14 });
          this.emit({ kind: 'spark', x, y, vx: vx * 1.4, vy: vy * 1.4, life: 0.2 + Math.random() * 0.2, rgb: el.core, gravity: 0 });
          break;
        case 'wisp':
          this.emit({ kind: 'wisp', x, y, cx: x, cy: y, ang: a, rad: 2, dr: v * 0.5, da: (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 3), life: 0.5 + Math.random() * 0.3, rgb: Math.random() < 0.6 ? el.rgb : el.core, size: 1.5 + Math.random() });
          break;
        case 'rock':
          this.emit({ kind: 'rock', x, y, vx: vx * 0.8, vy: -50 - Math.random() * 70, life: 0.5 + Math.random() * 0.3, rgb: Math.random() < 0.5 ? '120,95,70' : '170,140,105', gravity: 320, size: Math.random() < 0.4 ? 2 : 1, add: false });
          this.emit({ kind: 'spark', x, y, vx, vy, life: 0.2 + Math.random() * 0.2, rgb: el.core, gravity: 60 });
          break;
        case 'drop':
          this.emit({ kind: 'drop', x, y, vx: vx * 0.8, vy: -40 - Math.random() * 60, life: 0.45 + Math.random() * 0.3, rgb: Math.random() < 0.6 ? el.rgb : el.core, gravity: 260 });
          break;
        case 'feather':
          this.emit({ kind: 'feather', x, y, vx: vx * 0.6, vy: vy * 0.4 - 10, life: 0.8 + Math.random() * 0.5, rgb: el.core, gravity: 25, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 8 });
          break;
        default:
          this.emit({ kind: 'spark', x, y, vx, vy, life: 0.25 + Math.random() * 0.3, rgb: i % 2 ? el.rgb : el.core, gravity: 60 });
      }
    }
    // 煙霧只在數量較多的爆發時出現（光束、環狀沿線的零星粒子不冒煙，避免畫面混濁）。
    if (el.smoke && n >= 6) {
      for (let i = 0; i < Math.floor(n / 6); i++) {
        this.emit({ kind: 'smoke', x: x + (Math.random() - 0.5) * 10, y: y + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 12, vy: -8 - Math.random() * 12, life: 0.6 + Math.random() * 0.4, rgb: el.smoke, size: 3 + Math.random() * 3, add: false });
      }
    }
  }

  /**
   * 在地上留下痕跡（焦痕、冰霜、毒液等，依屬性的 decal 顏色），逐漸淡出；超過上限時丟掉最舊的。
   * @param {number} x 中心 x（像素）。
   * @param {number} y 中心 y（像素）。
   * @param {number} r 半徑（像素）。
   * @param {{decal?: string}} el 屬性外觀（沒有 decal 時不留痕跡）。
   * @param {number} life 持續秒數。
   */
  decal(x, y, r, el, life) {
    if (!el.decal) return;
    if (this.decals.length >= DECAL_MAX) this.decals.shift();
    this.decals.push({ x, y, r: Math.max(4, r), rgb: el.decal, t: 0, life });
  }

  /**
   * 更新並畫出地面痕跡（畫在角色下方，一般混色）：壓扁的橢圓，中心較深、邊緣漸淡。
   * @param {number} dt 秒。
   */
  drawDecals(dt) {
    if (!this.decals.length) return;
    const g = this.ctx;
    const step = Math.min(dt || 0, 0.05);
    this.decals = this.decals.filter((d) => {
      d.t += step;
      if (d.t >= d.life) return false;
      const a = 0.5 * (1 - d.t / d.life);
      const grad = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      grad.addColorStop(0, `rgba(${d.rgb},${a})`);
      grad.addColorStop(0.6, `rgba(${d.rgb},${a * 0.6})`);
      grad.addColorStop(1, `rgba(${d.rgb},0)`);
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, Math.PI * 2);
      g.fill();
      return true;
    });
  }

  /**
   * 怪物蓄力時的集氣特效：屬性顏色的光點從四周往身上聚集，身上有脈動的光暈；
   * Boss 的光點更多、光暈更大，腳下另有旋轉的屬性符文圈。
   * @param {object} world 探險。
   * @param {number} dt 秒。
   */
  chargeFx(world, dt) {
    const g = this.ctx;
    const step = Math.min(dt || 0, 0.05);
    for (const m of world.monsters) {
      if (m.invisible || m.hp <= 0) continue;
      const wind = m.boss ? (BOSS_WIND.has(m.state) && m.state !== 'healing') || (m.windUntil ?? 0) > world.time : MONSTER_WIND.has(m.state);
      if (!wind) continue;
      const el = elementOf(m.type);
      const boss = !!m.boss;
      const x = m.x * T;
      const y = m.y * T - (boss ? m.r * T * 1.2 : 6);
      // 往中心聚集的光點：從半徑 d 處出發，在 life 秒內抵達中心。
      const count = Math.floor((boss ? 45 : 16) * step + Math.random());
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = boss ? 24 + Math.random() * 18 : 10 + Math.random() * 8;
        const life = 0.3 + Math.random() * 0.15;
        this.emit({ kind: 'spark', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, vx: (-Math.cos(a) * d) / life, vy: (-Math.sin(a) * d * 0.8) / life, life, rgb: Math.random() < 0.6 ? el.rgb : el.core });
      }
      const pulse = 0.5 + 0.5 * Math.sin(world.time * (boss ? 14 : 18));
      g.save();
      g.globalCompositeOperation = 'lighter';
      const gr = boss ? m.r * T * 1.4 : 9;
      const glow = g.createRadialGradient(x, y, 0, x, y, gr);
      glow.addColorStop(0, `rgba(${el.core},${0.35 + 0.2 * pulse})`);
      glow.addColorStop(0.5, `rgba(${el.rgb},${0.18 + 0.12 * pulse})`);
      glow.addColorStop(1, `rgba(${el.rgb},0)`);
      g.fillStyle = glow;
      g.beginPath();
      g.arc(x, y, gr, 0, Math.PI * 2);
      g.fill();
      if (boss) {
        // 腳下的符文圈：內外兩圈與旋轉的刻度。
        const fx = m.x * T;
        const fy = m.y * T + m.r * T * 0.5;
        const rr = m.r * T * (1.3 + 0.1 * pulse);
        g.strokeStyle = `rgba(${el.rgb},${0.55 + 0.3 * pulse})`;
        g.lineWidth = 1;
        for (const k of [1, 0.72]) {
          g.beginPath();
          g.ellipse(fx, fy, rr * k, rr * k * 0.42, 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = `rgba(${el.core},${0.6 + 0.4 * pulse})`;
        for (let n = 0; n < 12; n++) {
          const a = world.time * 2.5 + (n * Math.PI) / 6;
          g.fillRect(fx + Math.cos(a) * rr * 0.86 - 0.5, fy + Math.sin(a) * rr * 0.86 * 0.42 - 0.5, 1.5, 1.5);
        }
      }
      g.restore();
    }
  }

  /**
   * 觸發全畫面閃光（Boss 大招）。強度上限 0.2，避免刺眼。
   * @param {string} rgb 顏色。
   * @param {number} a 強度。
   */
  flashScreen(rgb, a) {
    this.screenFlash = { rgb, a: Math.min(0.2, Math.max(this.screenFlash.a, a)) };
  }

  /**
   * 畫全畫面閃光並衰減。
   * @param {number} dt 秒。
   */
  drawScreenFlash(dt) {
    const f = this.screenFlash;
    if (f.a <= 0) return;
    const g = this.ctx;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = `rgba(${f.rgb},${f.a})`;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.restore();
    f.a = Math.max(0, f.a - Math.min(dt || 0, 0.05) * 0.9);
  }

  /**
   * 施放技能的瞬間（skillAnim 剛被設定）：腳下展開職業顏色的符文圈，並升起光柱與光點。
   * @param {object} world 探險。
   */
  castAura(world) {
    const p = world.player;
    const now = p.skillAnim > 0 ? p.skillAnim : 0;
    if (now > this.prevSkillAnim + 0.05) {
      const rgb = CLASS_FX[world.ch.cls] || '255,255,255';
      const x = p.x * T;
      const y = p.y * T + 3;
      this.emit({ kind: 'rune', x, y, life: 0.6, size: 11, rgb });
      this.emit({ kind: 'pillar', x, y, life: 0.45, size: 9, rgb });
      this.burst(x, y - 4, rgb, 10, 45, -Math.PI / 2, 1.2);
    }
    this.prevSkillAnim = now;
  }

  /**
   * 更新並畫出特效粒子（以加亮混色畫出發光感）。
   * @param {number} dt 秒。
   */
  drawFx(dt) {
    const g = this.ctx;
    const step = Math.min(dt || 0, 0.05);
    g.save();
    g.globalCompositeOperation = 'lighter';
    this.fx = this.fx.filter((p) => {
      // t 為負的粒子是延遲出現的（例如 Boss 的第二層衝擊波）。
      if (p.t < 0) {
        p.t += step;
        return true;
      }
      p.t += step;
      if (p.t >= p.life) return false;
      p.vy += p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      const k = p.t / p.life;
      const a = 1 - k;
      // 煙霧與碎石用一般混色（暗色在加亮混色下看不見），其他用加亮混色。
      g.globalCompositeOperation = p.add === false ? 'source-over' : 'lighter';
      if (p.kind === 'spark') {
        // 火花：沿速度方向的短線，愈快愈長。
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = Math.min(6, sp * 0.04 + 1);
        g.strokeStyle = `rgba(${p.rgb},${a})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
        g.stroke();
        g.fillStyle = `rgba(255,255,255,${a})`;
        g.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
      } else if (p.kind === 'ember') {
        g.fillStyle = `rgba(${p.rgb},${a * (0.6 + 0.4 * Math.sin(p.t * 30))})`;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      } else if (p.kind === 'ring') {
        // 衝擊波：快速擴散、逐漸變細的光環。
        const ease = 1 - (1 - k) ** 3;
        g.strokeStyle = `rgba(${p.rgb},${0.9 * a})`;
        g.lineWidth = p.size * a + 0.5;
        g.beginPath();
        g.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * ease, 0, Math.PI * 2);
        g.stroke();
      } else if (p.kind === 'flash') {
        const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        grad.addColorStop(0, `rgba(255,255,255,${0.9 * a})`);
        grad.addColorStop(0.35, `rgba(${p.rgb},${0.6 * a})`);
        grad.addColorStop(1, `rgba(${p.rgb},0)`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'pillar') {
        // 光柱：從腳下往上升起、上端漸淡的光。
        const h = 36 * Math.min(1, k * 4);
        const grad = g.createLinearGradient(p.x, p.y, p.x, p.y - h);
        grad.addColorStop(0, `rgba(${p.rgb},${0.7 * a})`);
        grad.addColorStop(1, `rgba(${p.rgb},0)`);
        g.fillStyle = grad;
        g.fillRect(p.x - p.size / 2, p.y - h, p.size, h);
        g.fillStyle = `rgba(255,255,255,${0.5 * a})`;
        g.fillRect(p.x - 1, p.y - h, 2, h);
      } else if (p.kind === 'rune') {
        // 符文圈：腳下壓扁的雙圈與旋轉的刻度。
        const r = p.size * (0.6 + 0.4 * Math.min(1, k * 4));
        g.strokeStyle = `rgba(${p.rgb},${0.9 * a})`;
        g.lineWidth = 1;
        for (const rr of [r, r * 0.7]) {
          g.beginPath();
          g.ellipse(p.x, p.y, rr, rr * 0.45, 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = `rgba(255,255,255,${a})`;
        for (let n = 0; n < 8; n++) {
          const ang = p.t * 4 + (n * Math.PI) / 4;
          g.fillRect(p.x + Math.cos(ang) * r * 0.85 - 0.5, p.y + Math.sin(ang) * r * 0.85 * 0.45 - 0.5, 1, 1);
        }
      } else if (p.kind === 'shard' || p.kind === 'feather') {
        // 冰晶：旋轉的短亮線；羽毛：左右搖擺、慢慢飄落的短線。
        p.rot += p.spin * step;
        if (p.kind === 'feather') p.vx *= 0.96;
        const len = p.kind === 'shard' ? 2 : 1.6;
        const c = Math.cos(p.rot) * len;
        const s2 = Math.sin(p.rot) * len;
        g.strokeStyle = `rgba(${p.rgb},${a})`;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(p.x - c, p.y - s2);
        g.lineTo(p.x + c, p.y + s2);
        g.stroke();
      } else if (p.kind === 'bubble') {
        // 氣泡：左右晃動往上浮的小圓圈，最後破掉（放大淡出）。
        const bx = p.x + Math.sin(p.t * 9 + p.size * 3) * 1.5;
        const r = p.size * (k > 0.85 ? 1 + (k - 0.85) * 6 : 1);
        g.strokeStyle = `rgba(${p.rgb},${a})`;
        g.lineWidth = 0.75;
        g.beginPath();
        g.arc(bx, p.y, r, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = `rgba(255,255,255,${0.7 * a})`;
        g.fillRect(bx - r * 0.5, p.y - r * 0.5, 0.75, 0.75);
      } else if (p.kind === 'zap') {
        // 落雷：從上方劈到地面的鋸齒光（每 0.05 秒重新產生鋸齒，看起來在閃動）。
        if (!p.pts || Math.floor(p.t / 0.05) !== p.seg) {
          p.seg = Math.floor(p.t / 0.05);
          p.pts = [];
          for (let n = 0; n <= 5; n++) p.pts.push([p.x + (n === 0 || n === 5 ? 0 : (Math.random() - 0.5) * 7), p.y - p.size + (p.size * n) / 5]);
        }
        for (const [w, al, rgb] of [[3, 0.45, p.rgb], [1, 1, '255,255,255']]) {
          g.strokeStyle = `rgba(${rgb},${al * a})`;
          g.lineWidth = w;
          g.beginPath();
          p.pts.forEach(([px, py], n) => (n ? g.lineTo(px, py) : g.moveTo(px, py)));
          g.stroke();
        }
        const grad = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
        grad.addColorStop(0, `rgba(255,255,255,${0.8 * a})`);
        grad.addColorStop(1, `rgba(${p.rgb},0)`);
        g.fillStyle = grad;
        g.fillRect(p.x - 8, p.y - 8, 16, 16);
      } else if (p.kind === 'wisp') {
        // 暗影：繞著中心旋轉往外擴散的光點。
        p.ang += p.da * step;
        p.rad += p.dr * step;
        p.x = p.cx + Math.cos(p.ang) * p.rad;
        p.y = p.cy + Math.sin(p.ang) * p.rad * 0.6;
        g.fillStyle = `rgba(${p.rgb},${a})`;
        g.beginPath();
        g.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'rock') {
        // 碎石：往上拋起再落下的小方塊，帶深色外框。
        g.fillStyle = `rgba(26,16,32,${a})`;
        g.fillRect(Math.round(p.x) - 0.5, Math.round(p.y) - 0.5, p.size + 1, p.size + 1);
        g.fillStyle = `rgba(${p.rgb},${a})`;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      } else if (p.kind === 'drop') {
        // 水滴：沿速度方向拉長的亮點。
        const sp = Math.hypot(p.vx, p.vy) || 1;
        g.strokeStyle = `rgba(${p.rgb},${a})`;
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - (p.vx / sp) * 2.5, p.y - (p.vy / sp) * 2.5);
        g.stroke();
      } else if (p.kind === 'smoke') {
        // 煙霧：慢慢變大、變淡的圓團。
        const r = p.size * (1 + k * 1.5);
        g.fillStyle = `rgba(${p.rgb},${0.35 * a})`;
        g.beginPath();
        g.arc(p.x, p.y, r, 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'beam') {
        // 光束：沿直線快速伸出的光帶（外層屬性色、內層白色核心），寬度逐漸收窄。
        const len = p.len * Math.min(1, k * 6);
        const w = p.size * (1 - k * 0.6);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.angle);
        const grad = g.createLinearGradient(0, -w, 0, w);
        grad.addColorStop(0, `rgba(${p.rgb},0)`);
        grad.addColorStop(0.5, `rgba(${p.rgb},${0.75 * a})`);
        grad.addColorStop(1, `rgba(${p.rgb},0)`);
        g.fillStyle = grad;
        g.fillRect(0, -w, len, w * 2);
        g.fillStyle = `rgba(${p.core},${a})`;
        g.fillRect(0, -w * 0.18, len, w * 0.36);
        g.restore();
      } else if (p.kind === 'crescent') {
        // 弧光：從一側掃到另一側的發光弧帶，之後淡出。
        const start = p.angle - p.arc / 2;
        const end = start + p.arc * Math.min(1, k * 3);
        const fade = k < 0.35 ? 1 : 1 - (k - 0.35) / 0.65;
        const grad = g.createRadialGradient(p.x, p.y, p.r0, p.x, p.y, p.r1);
        grad.addColorStop(0, `rgba(${p.rgb},0)`);
        grad.addColorStop(0.75, `rgba(${p.rgb},${0.5 * fade})`);
        grad.addColorStop(1, `rgba(255,255,255,${0.85 * fade})`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(p.x, p.y, p.r1, start, end);
        g.arc(p.x, p.y, p.r0, end, start, true);
        g.closePath();
        g.fill();
      }
      return true;
    });
    g.restore();
  }

  /**
   * 畫紫色魔法陣：內外兩圈、旋轉的六芒星與外圈刻度（法師出手用）。
   * @param {number} x 中心 x（像素）。
   * @param {number} y 中心 y（像素）。
   * @param {number} r 半徑（像素）。
   * @param {number} spin 旋轉角度（弧度）。
   * @param {number} alpha 不透明度。
   */
  magicCircle(x, y, r, spin, alpha) {
    const g = this.ctx;
    g.save();
    g.strokeStyle = `rgba(200,150,255,${0.9 * alpha})`;
    g.lineWidth = 0.75;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(x, y, r * 0.62, 0, Math.PI * 2);
    g.stroke();
    // 兩個交錯的三角形組成六芒星。
    for (const off of [0, Math.PI / 3]) {
      g.beginPath();
      for (let n = 0; n <= 3; n++) {
        const a = spin + off + (n * Math.PI * 2) / 3;
        const px = x + Math.cos(a) * r * 0.62;
        const py = y + Math.sin(a) * r * 0.62;
        if (n === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
    }
    g.fillStyle = `rgba(235,215,255,${alpha})`;
    for (let n = 0; n < 8; n++) {
      const a = -spin + (n * Math.PI) / 4;
      g.fillRect(x + Math.cos(a) * r - 0.5, y + Math.sin(a) * r - 0.5, 1, 1);
    }
    g.restore();
  }

  /**
   * 畫效果：斬擊、爆炸、消失的煙霧、升級、傷害數字。
   * @param {object} world 探險。
   */
  drawEffects(world) {
    const g = this.ctx;
    // 有動作圖的職業，普攻的刀光與魔法陣已經畫在動作圖裡，不再另外畫。
    const framed = !!heroArt(world.ch.cls).dirs.side.attack;
    for (const e of world.effects) {
      // 第一次看到的效果：產生對應的特效粒子。
      if (!e.fxDone) {
        e.fxDone = true;
        this.spawnFx(world, e);
      }
      const k = e.t / e.life;
      const x = e.x * T;
      const y = e.y * T;
      if (e.kind === 'slash' && framed && e.basic) continue;
      if (e.kind === 'slash') {
        // 新月形刀光：快速掃過 120°，之後逐漸淡出。
        // 玩家的刀光與武器同向掃過（見 swingDir）；怪物的揮砍一律順時針。
        const arc = e.arc || 2.1;
        const dir = e.enemy ? 1 : swingDir(e.angle);
        const start = e.angle - (dir * arc) / 2;
        const end = start + dir * arc * Math.min(1, k * 2.5);
        const outer = e.range * T + 2;
        // Boss 的揮砍弧帶較寬。
        const inner = outer * (e.boss ? 0.32 : 0.5);
        const fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
        const grad = g.createRadialGradient(x, y - 3, inner, x, y - 3, outer);
        // 怪物的普通攻擊依攻擊屬性配色（一般打擊為紅色）；玩家依職業配色：戰士藍色、盜賊紫色、武僧橘色掌風、騎士金色，其他為白色。
        const ene = e.enemy ? elementOf(e.src) : null;
        const [mid, edge, rim] = ene ? [ene.rgb, ene.core, ene.rgb] : SLASH_COLORS[e.look] || SLASH_COLORS.default;
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, `rgba(${mid},${0.45 * fade})`);
        grad.addColorStop(1, `rgba(${edge},${0.95 * fade})`);
        g.fillStyle = grad;
        g.beginPath();
        g.arc(x, y - 3, outer, start, end, dir < 0);
        g.arc(x, y - 3, inner, end, start, dir > 0);
        g.closePath();
        g.fill();
        g.strokeStyle = `rgba(${rim},${0.9 * fade})`;
        g.lineWidth = 1;
        g.beginPath();
        g.arc(x, y - 3, outer, start, end, dir < 0);
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
        // 出手的閃光：弓箭是金色、法球是紫色；法球另外在手前方展開旋轉的魔法陣。
        const c = e.look === 'orb' ? '200,168,255' : '255,226,140';
        if (e.look === 'orb' && !framed) this.magicCircle(x + Math.cos(e.angle) * 6, y + Math.sin(e.angle) * 6, 7 * (0.6 + 0.4 * Math.min(1, k * 3)), world.time * 4, 1 - k);
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
        // 範圍底色淡一點，邊緣以加亮混色描出發光的外框（衝擊波、火花另外由 spawnFx 產生）；敵方依攻擊屬性配色。
        const rgb = e.friendly ? LOOK_COLORS[e.look] || '200,168,255' : elementOf(e.src).rgb;
        g.fillStyle = `rgba(${rgb},${0.4 * (1 - k)})`;
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
        // 發光外框：沿用剛才的路徑，以加亮混色描邊。
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = `rgba(${rgb},${0.9 * (1 - k)})`;
        g.lineWidth = 1.5 * (1 - k) + 0.5;
        g.stroke();
        g.restore();
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
        // 爆擊的數字較大。
        g.font = `bold ${(7 * pop * (e.big ? 1.35 : 1)).toFixed(1)}px system-ui, sans-serif`;
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
   * 光影：先把畫面依區域色調壓暗（AMBIENT），再從光照層挖出光源照亮的範圍，最後在火把與傳送門周圍疊上暖色光暈。
   * 光源：玩家（約 4 格）、牆上火把（約 3.5 格並閃爍）、還沒開的寶箱、傳送門、樓梯、發光的投射物與爆炸。
   * 光照層為半解析度的離屏畫布（貼回時放大並平滑，邊緣自然柔和）。
   * @param {object} world 探險。
   */
  drawLighting(world) {
    const ambient = AMBIENT[AREAS[world.area].theme] ?? 0.5;
    if (ambient <= 0) return;
    const g = this.ctx;
    const k = 2;
    const w = Math.ceil(this.viewW / k) + 2;
    const h = Math.ceil(this.viewH / k) + 2;
    if (!this.light) {
      this.light = document.createElement('canvas');
      this.lctx = this.light.getContext('2d');
    }
    if (this.light.width !== w || this.light.height !== h) {
      this.light.width = w;
      this.light.height = h;
    }
    const l = this.lctx;
    const { x: cx, y: cy } = this.cam;
    const t = world.time;
    const lights = [];
    const glows = [];
    /**
     * 加入一個光源（世界座標，像素）。
     * @param {number} x 中心 x。
     * @param {number} y 中心 y。
     * @param {number} r 半徑（像素）。
     * @param {number} [a=1] 亮度 0～1。
     */
    const add = (x, y, r, a = 1) => {
      if (x + r < cx || y + r < cy || x - r > cx + this.viewW || y - r > cy + this.viewH) return;
      lights.push({ x, y, r, a });
    };
    const p = world.player;
    add(p.x * T, p.y * T - 4, 4.2 * T);
    for (const tc of this.floorCache.torches) {
      const flick = Math.sin(t * 9 + tc.i * 1.7) * 0.06 + Math.sin(t * 23 + tc.j) * 0.03;
      const x = tc.px ?? tc.i * T + 8;
      const y = tc.j * T + 10;
      add(x, y + 6, 4 * T * (1 + flick), 1);
      // 暖光往下照在地板上（中心在火把下方），避免把牆後的黑色區域染成橘色；火把本身周圍再加一圈小而亮的光暈。
      glows.push({ x, y: y + 14, r: 3.2 * T * (1 + flick), c: '255,140,50', a: 0.4 });
      glows.push({ x, y: y - 4, r: 1.1 * T * (1 + flick), c: '255,190,90', a: 0.45 });
    }
    for (const b of this.floorCache.braziers || []) {
      const flick = Math.sin(t * 8 + b.x) * 0.07;
      add(b.x, b.y, 3.6 * T * (1 + flick), 1);
      glows.push({ x: b.x, y: b.y + 4, r: 2.6 * T * (1 + flick), c: '255,140,50', a: 0.38 });
    }
    for (const b of this.floorCache.flames || []) {
      const flick = Math.sin(t * 9 + b.x * 0.3) * 0.07;
      add(b.x, b.y + 4, 3 * T * (b.s || 1) * (1 + flick), 0.95);
      glows.push({ x: b.x, y: b.y + 8, r: 2.2 * T * (b.s || 1) * (1 + flick), c: '255,140,50', a: 0.32 });
      glows.push({ x: b.x, y: b.y - 2, r: 0.8 * T * (1 + flick), c: '255,190,90', a: 0.45 });
    }
    for (const c of world.chests) if (!c.opened) add(c.x * T, c.y * T, 1.6 * T, 0.7);
    const st = world.floor.stairs;
    if (st) add(st.x * T, st.y * T, 1.8 * T, 0.6);
    const pt = world.floor.portal;
    if (world.portalOpen && pt) {
      add(pt.x * T, pt.y * T, 3 * T, 0.9);
      glows.push({ x: pt.x * T, y: pt.y * T, r: 2.5 * T, c: '170,130,255', a: 0.22 });
    }
    for (const pr of world.projectiles) if (pr.kind !== 'arrow') add(pr.x * T, pr.y * T, 1.4 * T, 0.8);
    for (const e of world.effects) {
      if (e.kind === 'blast') {
        add(e.x * T, e.y * T, ((e.r || 1) + 1) * T, 0.9 * (1 - e.t / e.life));
        // 敵方爆發：依攻擊屬性的彩色光暈（Boss 較亮）。
        if (!e.friendly) glows.push({ x: e.x * T, y: e.y * T, r: ((e.r || 1) + 1.5) * T, c: elementOf(e.src).rgb, a: (e.boss ? 0.4 : 0.25) * (1 - e.t / e.life) });
      } else if (e.kind === 'impact') add(e.x * T, e.y * T, 1.6 * T, 0.8 * (1 - e.t / e.life));
    }
    for (const m of world.monsters) {
      // 蓄力中的怪物身上發光，照亮周圍。
      if (m.invisible || !(m.boss ? BOSS_WIND.has(m.state) && m.state !== 'healing' : MONSTER_WIND.has(m.state))) continue;
      add(m.x * T, m.y * T, (m.boss ? 3 : 1.6) * T, 0.7);
      glows.push({ x: m.x * T, y: m.y * T - 4, r: (m.boss ? 2.6 : 1.2) * T, c: elementOf(m.type).rgb, a: m.boss ? 0.3 : 0.18 });
    }
    // 光照層：整片暗色，再以 destination-out 挖出光源。
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, w, h);
    l.fillStyle = `rgba(8,4,18,${ambient})`;
    l.fillRect(0, 0, w, h);
    l.globalCompositeOperation = 'destination-out';
    for (const li of lights) {
      const x = (li.x - cx) / k;
      const y = (li.y - cy) / k;
      const r = li.r / k;
      const grad = l.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(0,0,0,${li.a})`);
      grad.addColorStop(0.45, `rgba(0,0,0,${li.a * 0.75})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = grad;
      l.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.save();
    g.imageSmoothingEnabled = true;
    g.drawImage(this.light, cx, cy, w * k, h * k);
    // 暖色光暈：以加亮混合疊在火把與傳送門周圍。
    g.globalCompositeOperation = 'lighter';
    for (const gl of glows) {
      if (gl.x + gl.r < cx || gl.y + gl.r < cy || gl.x - gl.r > cx + this.viewW || gl.y - gl.r > cy + this.viewH) continue;
      const grad = g.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
      grad.addColorStop(0, `rgba(${gl.c},${gl.a})`);
      grad.addColorStop(1, `rgba(${gl.c},0)`);
      g.fillStyle = grad;
      g.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
    }
    g.restore();
  }

  /**
   * 戰爭迷霧：未探索的格子全黑；已探索但離玩家較遠的區域，由光影（drawLighting）的光線衰減自然變暗。
   * @param {object} world 探險。
   */
  drawFog(world) {
    const g = this.ctx;
    const f = world.floor;
    const v = this.visible();
    g.fillStyle = '#05030a';
    for (let j = v.j0; j < v.j1; j++) {
      for (let i = v.i0; i < v.i1; i++) {
        const inside = i >= 0 && j >= 0 && i < f.w && j < f.h;
        if (!inside || !world.explored[j * f.w + i]) g.fillRect(i * T, j * T, T, T);
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
