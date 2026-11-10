// 像素圖資料（全部原創）：以字元陣列描述，每個字元對應調色盤中的一個顏色，'.' 為透明。
// 角色有站立與左右腳交替的走路幀；Boss 與有設計圖的一般怪物使用 4 格動作圖（monsterSprites.js），
// 其他怪物沿用 MONSTER_ART 的 2 幀手寫圖並精緻化。

import { HOME_MATS } from './homeData.js';
import { HERO_SPRITES } from './heroSprites.js';
import { BOSS_SPRITES } from './bossSprites.js';
import { MONSTER_SPRITES } from './monsterSprites.js';

/** 共用顏色。 */
const O = '#1a1020';

/**
 * 怪物與 Boss 圖：palette 調色盤、evolvedPalette 進化 Boss 的配色（只有 Boss 有）、frames 兩幀（第二幀省略時與第一幀相同，繪製時以上下浮動表現）。
 * @type {Record<string, {palette: Record<string, string>, frames: string[][], scale?: number, alpha?: number}>}
 */
export const MONSTER_ART = {
  slime: {
    palette: { o: O, M: '#6abf4b', m: '#b6e88a', e: O },
    frames: [
      ['....oooo....', '..ooMMMMoo..', '.oMMmMMMMMo.', 'oMMmMMMMMMMo', 'oMMeMMMMeMMo', 'oMMMMMMMMMMo', '.oMMMMMMMMo.', '..oooooooo..'],
      ['............', '...oooooo...', '.ooMMmMMMMoo', 'oMMmMMMMMMMMo', 'oMMeMMMMMeMMo', 'oMMMMMMMMMMMo', '.ooooooooooo.'],
    ],
  },
  bat: {
    palette: { o: O, W: '#6a4a8a', B: '#3a2a4a', e: '#ff5a5a' },
    frames: [
      ['o..........o', 'oo..oooo..oo', 'oWo.oBBo.oWo', 'oWWoBeeBoWWo', '.oWWBBBBWWo.', '..ooBBBBoo..', '....oBBo....', '.....oo.....'],
      ['....oooo....', 'oo.oBBBBo.oo', 'oWooBeeBooWo', 'oWWWBBBBWWWo', 'oWWoBBBBoWWo', 'oo..oBBo..oo', '.....oo.....'],
    ],
  },
  skeleton: {
    palette: { o: O, W: '#e8e4d8', e: '#ff4d4d', S: '#9aa3b5' },
    frames: [
      ['...oooooo...', '..oWWWWWWo..', '..oWeWWeWo..', '..oWWWWWWo..', '...oWoWoWo..', '...oooooo..o', '..oWoWWoWooS', '.oWooWWooWSo', '.oW.oWWo.oo.', '....oWWo....', '...oWooWo...', '...oWo.oWo..', '...oo..oo...'],
      ['...oooooo...', '..oWWWWWWo..', '..oWeWWeWo..', '..oWWWWWWo..', '...oWoWoWo..', '...oooooo..o', '..oWoWWoWooS', '.oWooWWooWSo', '.oW.oWWo.oo.', '....oWWo....', '...oWooWo...', '..oWo..oWo..', '..oo....oo..'],
    ],
  },
  skelArcher: {
    palette: { o: O, W: '#d8cfb8', e: '#5fd0ff', S: '#8a5a2a' },
    frames: [
      ['...oooooo...', '..oWWWWWWo..', '..oWeWWeWo..', '..oWWWWWWo..', '...oWoWoWo..', '...oooooo.o.', '..oWoWWoWoSo', '.oWooWWooWoS', '.oW.oWWo..oS', '....oWWo..So', '...oWooWo.o.', '...oWo.oWo..', '...oo..oo...'],
      ['...oooooo...', '..oWWWWWWo..', '..oWeWWeWo..', '..oWWWWWWo..', '...oWoWoWo..', '...oooooo.o.', '..oWoWWoWoSo', '.oWooWWooWoS', '.oW.oWWo..oS', '....oWWo..So', '...oWooWo.o.', '..oWo..oWo..', '..oo....oo..'],
    ],
  },
  goblin: {
    palette: { o: O, G: '#7fae3a', e: '#ffe14d', r: '#c8463c', B: '#7a5a3a' },
    frames: [
      ['o..oooooo..o', 'oGoGGGGGGoGo', '.oGGeGGeGGo.', '..oGGGGGGo..', '..oGrrrrGo..', '...oooooo...', '..oBBBBBBo..', '.oGoBBBBoGo.', '...oBBBBo...', '...oGooGo...', '...oo..oo...'],
      ['o..oooooo..o', 'oGoGGGGGGoGo', '.oGGeGGeGGo.', '..oGGGGGGo..', '..oGrrrrGo..', '...oooooo...', '..oBBBBBBo..', '.oGoBBBBoGo.', '...oBBBBo...', '..oGo..oGo..', '..oo....oo..'],
    ],
  },
  lavaWorm: {
    palette: { o: O, R: '#d8562a', Y: '#ffcf4a', e: O },
    frames: [
      ['....oooo....', '...oRRRRo...', '..oRYeeYRo..', '..oRRRRRRo..', '...oRRRRo...', '..oRRYRRRo..', '.oRRoooRRRo.', '.oRRo..oRRo.', '..oo....oo..'],
      ['....oooo....', '...oRRRRo...', '..oRYeeYRo..', '..oRRRRRRo..', '..oRRRRRo...', '.oRRYRRRo...', '.oRRooRRRo..', '..oRRooRRo..', '...oo..oo...'],
    ],
  },
  fireSpirit: {
    palette: { o: O, Y: '#ffd84a', R: '#ff6a2a', e: '#3a1020' },
    frames: [
      ['.....oo.....', '....oYYo....', '...oYRRYo...', '..oYRRRRYo..', '..oRReeRRo..', '.oRRRRRRRRo.', '.oRRRYYRRRo.', '..oRRRRRRo..', '...oRRRRo...', '....oRRo....', '.....oo.....'],
      ['....o..o....', '...oYooYo...', '...oYRRYo...', '..oYRRRRYo..', '..oRReeRRo..', '.oRRRRRRRRo.', '.oRRRYYRRRo.', '..oRRRRRRo..', '...oRRRRo...', '...oRRo.....', '....oo......'],
    ],
  },
  iceWolf: {
    palette: { o: O, I: '#cfe6f5', e: '#2a6ad0', w: '#ffffff' },
    frames: [
      ['..o......o..', '.oIo....oIo.', '.oIIooooIIo.', 'oIIeIIIIeIIo', 'oIIIIIIIIIIo', '.oIIwwwwIIo.', '..oIIIIIIo..', '.oIIIIIIIIo.', 'oIIoIIIIoIIo', 'oo.oo..oo.oo'],
      ['..o......o..', '.oIo....oIo.', '.oIIooooIIo.', 'oIIeIIIIeIIo', 'oIIIIIIIIIIo', '.oIIwwwwIIo.', '..oIIIIIIo..', '.oIIIIIIIIo.', '.oIIoIIoIIo.', '.oo.oo.oo.o.'],
    ],
  },
  wraith: {
    palette: { o: '#2a3a5a', F: '#b8d4f0', e: '#2a5aa0' },
    alpha: 0.8,
    frames: [
      ['...oooooo...', '..oFFFFFFo..', '.oFFFFFFFFo.', '.oFeeFFeeFo.', '.oFFFFFFFFo.', '.oFFFooFFFo.', '.oFFFFFFFFo.', '.oFFFFFFFFo.', '.oFoFFoFFoo.', '..o.oo.oo...'],
      ['...oooooo...', '..oFFFFFFo..', '.oFFFFFFFFo.', '.oFeeFFeeFo.', '.oFFFFFFFFo.', '.oFFFooFFFo.', '.oFFFFFFFFo.', '.oFFFFFFFFo.', '.ooFFoFFoFo.', '...oo.oo.o..'],
    ],
  },
  crystal: {
    palette: { o: O, C: '#7ad6e0', c: '#d8fbff', e: '#ff4dd2' },
    frames: [
      ['....oooo....', '...oCCCCo...', '..oCceeCCo..', '..oCCCCCCo..', 'oooCCCCCCooo', 'oCCoCCcCCoCo', 'oCcoCCCCCoCo', 'oCCoCCCCCoCo', '.oo.oCCCo.o.', '....oCoCo...', '...oCCoCCo..', '...ooo.ooo..'],
    ],
  },
  mushroom: {
    palette: { o: O, R: '#d0383f', w: '#fff4e0', C: '#e8d8b8', c: '#c0a880', e: O },
    frames: [
      ['...oooooo...', '..oRRwRRRo..', '.oRwRRRRwRo.', 'oRRRRwRRRRRo', 'oRRRRRRRwRRo', '.oooooooooo.', '..oCeCCeCo..', '..oCCCCCCo..', '..oCCccCCo..', '...oCooCo...', '...oo..oo...'],
      ['...oooooo...', '..oRRwRRRo..', '.oRwRRRRwRo.', 'oRRRRwRRRRRo', 'oRRRRRRRwRRo', '.oooooooooo.', '..oCeCCeCo..', '..oCCCCCCo..', '..oCCccCCo..', '..oCo..oCo..', '..oo....oo..'],
    ],
  },
  vineflower: {
    palette: { o: O, P: '#e868a0', p: '#ffb0d0', M: '#5a1030', e: '#ffe14d', w: '#ffffff', G: '#4f9a3a' },
    frames: [
      ['..o.oooo.o..', '.oPoPPPPoPo.', 'oPPPpMMpPPPo', 'oPPMMeeMMPPo', '.oPPMMMMPPo.', '..ooPPPPoo..', '....oGGo....', '..ooGGGGoo..', '.oGGoGGoGGo.', '..oo.oo.oo..'],
      ['..o.oooo.o..', '.oPoPPPPoPo.', 'oPPPpMMpPPPo', 'oPPMeMMeMPPo', '.oPPMwwMPPo.', '..ooPPPPoo..', '....oGGo....', '..ooGGGGoo..', '.oGGoGGoGGo.', '..oo.oo.oo..'],
    ],
  },
  spider: {
    palette: { o: O, S: '#5a3a2a', s: '#8a5a3a', e: '#ff4d4d' },
    frames: [
      ['o..o....o..o', '.o.o.oo.o.o.', '..ooSSSSoo..', 'oooSSeeSSooo', '..oSSSSSSo..', '.o.oSssSo.o.', 'o..oSSSSo..o', '...o.oo.o...'],
      ['.o.o....o.o.', '.o.o.oo.o.o.', '..ooSSSSoo..', 'oooSSeeSSooo', '..oSSSSSSo..', '.o.oSssSo.o.', '.o.oSSSSo.o.', 'o..o.oo.o..o'],
    ],
  },
  bomber: {
    palette: { o: O, G: '#b08a4a', e: '#ffe14d', r: '#c8463c', B: '#5a3a2a', K: '#2a2a2a' },
    frames: [
      ['o..oooooo..o', 'oGoGGGGGGoGo', '.oGGeGGeGGo.', '..oGGGGGGo..', '..oGrrrrGo..', '...oooooo.oo', '..oBBBBBBoKo', '.oGoBBBBoGoo', '...oBBBBo...', '...oGooGo...', '...oo..oo...'],
      ['o..oooooo..o', 'oGoGGGGGGoGo', '.oGGeGGeGGo.', '..oGGGGGGo..', '..oGrrrrGo..', '...oooooo.oo', '..oBBBBBBoKo', '.oGoBBBBoGoo', '...oBBBBo...', '..oGo..oGo..', '..oo....oo..'],
    ],
  },
  magmaSlime: {
    palette: { o: O, M: '#e0602a', m: '#ffcf4a', e: O },
    frames: null,
  },
  yeti: {
    palette: { o: O, W: '#eef4fa', w: '#b8c8d8', F: '#7aa8c8', e: O, m: '#2a3a5a' },
    scale: 1.3,
    frames: [
      ['...oooooo...', '..oWWWWWWo..', '.oWWFFFFWWo.', '.oWFeFFeFWo.', '.oWFFmmFFWo.', 'oWWWFFFFWWWo', 'oWwWWWWWWwWo', 'oWwWWWWWWwWo', 'oFFoWWWWoFFo', '.oo.oWWo.oo.', '...oWWoWWo..', '...ooo.ooo..'],
      ['...oooooo...', '..oWWWWWWo..', '.oWWFFFFWWo.', '.oWFeFFeFWo.', '.oWFFmmFFWo.', 'oWWWFFFFWWWo', 'oWwWWWWWWwWo', 'oWwWWWWWWwWo', 'oFFoWWWWoFFo', '.oo.oWWo.oo.', '..oWWo.oWWo.', '..ooo...ooo.'],
    ],
  },
  frostSprite: {
    palette: { o: O, C: '#9ad8ff', c: '#ffffff', W: '#d8f0ff', e: '#2a5aa0' },
    frames: [
      ['.....oo.....', '....oCCo....', '.o.oCcCCo.o.', 'oWooCCCCooWo', 'oWWoCeeCoWWo', '.oWoCCCCoWo.', '..o.oCCo.o..', '.....oCo....', '......o.....'],
      ['.....oo.....', '....oCCo....', '.o.oCcCCo.o.', 'oWWoCCCCoWWo', 'oWooCeeCooWo', '.o.oCCCCo.o.', '....oCCo....', '.....oCo....', '......o.....'],
    ],
  },
  gargoyle: {
    palette: { o: O, S: '#8a8f9a', t: '#5a5f6a', e: '#ff4d4d' },
    frames: [
      ['o..........o', 'oSo.oooo.oSo', 'oSSoSSSSoSSo', 'oSSSeSSeSSSo', '.oSSSSSSSSo.', '..oSSttSSo..', '.oSSSSSSSSo.', 'oSoSSSSSSoSo', 'oo.oSSSSo.oo', '...oSooSo...', '...oo..oo...'],
    ],
  },
  shade: {
    palette: { o: O, D: '#5a4278', d: '#2e1e42', e: '#c87aff', S: '#cfd6e0' },
    frames: [
      ['...oooooo...', '..oDDDDDDo..', '.oDDddddDDo.', '.oDdeddedDo.', '.oDDddddDDo.', '..oDDDDDDo..', '.oDDDDDDDDoo', 'oDoDDDDDDoSo', 'oo.oDDDDo.o.', '...oDooDo...', '...oo..oo...'],
      ['...oooooo...', '..oDDDDDDo..', '.oDDddddDDo.', '.oDdeddedDo.', '.oDDddddDDo.', '..oDDDDDDo..', '.oDDDDDDDDoo', 'oDoDDDDDDoSo', 'oo.oDDDDo.o.', '..oDo..oDo..', '..oo....oo..'],
    ],
  },
  voidEye: {
    palette: { o: O, P: '#5a2a7a', W: '#f0e6ff', i: '#c83a8a', K: O },
    frames: [
      ['...oooooo...', '..oPPPPPPo..', '.oPWWWWWWPo.', 'oPWWWiiWWWPo', 'oPWWiKKiWWPo', 'oPWWWiiWWWPo', '.oPWWWWWWPo.', '..oPPPPPPo..', '..o.o..o.o..', '.o..o..o..o.'],
      ['...oooooo...', '..oPPPPPPo..', '.oPWWWWWWPo.', 'oPWWWiiWWWPo', 'oPWWiKKiWWPo', 'oPWWWiiWWWPo', '.oPWWWWWWPo.', '..oPPPPPPo..', '..o..oo..o..', 'o..o....o..o'],
    ],
  },
  boar: {
    palette: { o: O, B: '#8a5a3a', w: '#fff4e0', n: '#c8907a', N: O, e: O },
    frames: [
      ['...o....o...', '..oBo..oBo..', '.oBBBBBBBBo.', 'oBBeBBBBeBBo', 'oBBBBBBBBBBo', 'oBwBnnnnBwBo', '.oBBnNNnBBo.', '..oBBBBBBo..', '..oBo..oBo..', '..oo....oo..'],
      ['...o....o...', '..oBo..oBo..', '.oBBBBBBBBo.', 'oBBeBBBBeBBo', 'oBBBBBBBBBBo', 'oBwBnnnnBwBo', '.oBBnNNnBBo.', '..oBBBBBBo..', '.oBo....oBo.', '.oo......oo.'],
    ],
  },
  hornet: {
    palette: { o: O, Y: '#f0c030', K: '#2a2010', W: '#d8f0ff', e: O },
    frames: [
      ['..oo....oo..', '.oWWo..oWWo.', '..oWWooWWo..', '...oYYYYo...', '..oYeYYeYo..', '..oKKKKKKo..', '..oYYYYYYo..', '...oKKKKo...', '....oYYo....', '.....oo.....'],
      ['............', 'oWWo....oWWo', '.oWWooooWWo.', '...oYYYYo...', '..oYeYYeYo..', '..oKKKKKKo..', '..oYYYYYYo..', '...oKKKKo...', '....oYYo....', '.....oo.....'],
    ],
  },
  scarecrow: {
    palette: { o: O, H: '#c8a050', S: '#e8d090', e: O, m: '#5a3a1a', C: '#6a8a4a', p: '#c84a3a', y: '#e8c860', B: '#7a5a3a' },
    frames: [
      ['...oooooo...', '..oHHHHHHo..', 'oooooooooooo', '..oSSSSSSo..', '..oSeSSeSo..', '..oSSmmSSo..', 'oooCCCCCCooo', 'oyyCCpCCCyyo', 'oooCCCCCCooo', '...oCCCCo...', '....oBBo....', '....oBBo....', '....oooo....'],
    ],
  },
  harpy: {
    palette: { o: O, H: '#5a3a8a', s: '#e8c0a0', e: O, F: '#c8d0e8', W: '#7a8ac8', Y: '#e8b84a' },
    frames: [
      ['....oooo....', '...oHHHHo...', '..oHseesHo..', '..oHssssHo..', 'oo.ooFFoo.oo', 'oWWoFFFFoWWo', 'oWWWoFFoWWWo', '.oWWoFFoWWo.', '..oo.oo.oo..', '...oYo.oYo..'],
      ['....oooo....', '...oHHHHo...', '..oHseesHo..', '..oHssssHo..', 'oWo.oFFo.oWo', 'oWWooFFooWWo', '.oWWoFFoWWo.', '..oooFFooo..', '..oo.oo.oo..', '...oYo.oYo..'],
    ],
  },
  thunderSprite: {
    palette: { o: O, Y: '#ffe14d', y: '#ffffff', e: '#3a2a10', w: '#c88a10' },
    frames: [
      ['....oooo....', '..ooYYYYoo..', '.oYYyyYYYYo.', 'oYYyeYYeYYYo', 'oYYYYYYYYYYo', 'oYYYYwwYYYYo', '.oYYYYYYYYo.', '..ooYYYYoo..', '.o..oooo..o.', 'o..........o'],
      ['o..........o', '..ooYYYYoo..', '.oYYyyYYYYo.', 'oYYyeYYeYYYo', 'oYYYYYYYYYYo', 'oYYYYwwYYYYo', '.oYYYYYYYYo.', '..ooYYYYoo..', '....oooo....', '............'],
    ],
  },
  skyKnight: {
    palette: { o: O, B: '#3a7ad8', G: '#e8b84a', W: '#e8eef5', k: O },
    frames: [
      ['.....oo.....', '....oBBo....', '...oGGGGo...', '..oGWWWWGo..', '..oGWkkWGo..', '..oGWWWWGo..', 'oooGGGGGGooo', 'oWoWWGGWWoWo', 'oWoWWGGWWoWo', 'ooooWWWWoooo', '...oWWWWo...', '...oWooWo...', '...oo..oo...'],
      ['.....oo.....', '....oBBo....', '...oGGGGo...', '..oGWWWWGo..', '..oGWkkWGo..', '..oGWWWWGo..', 'oooGGGGGGooo', 'oWoWWGGWWoWo', 'oWoWWGGWWoWo', 'ooooWWWWoooo', '...oWWWWo...', '..oWo..oWo..', '..oo....oo..'],
    ],
  },
  zombie: {
    palette: { o: O, Z: '#7aa860', e: '#ff4d4d', m: '#3a2a2a', C: '#5a5a7a', c: '#7a7a9a', P: '#4a3a2a' },
    frames: [
      ['...oooooo...', '..oZZZZZZo..', '..oZeZZeZo..', '..oZZZZZZo..', '..oZZmmZZo..', '...oooooo...', 'oZZoCCCCoZZo', 'oZZoCcCCoZZo', '.oooCCCCooo.', '...oPPPPo...', '...oPooPo...', '...oo..oo...'],
      ['...oooooo...', '..oZZZZZZo..', '..oZeZZeZo..', '..oZZZZZZo..', '..oZZmmZZo..', '...oooooo...', 'oZZoCCCCoZZo', 'oZZoCcCCoZZo', '.oooCCCCooo.', '...oPPPPo...', '..oPo..oPo..', '..oo....oo..'],
    ],
  },
  boneMage: {
    palette: { o: O, R: '#3a2a5a', r: '#5a4a8a', W: '#e8e4d8', e: '#c87aff', G: '#c87aff' },
    frames: [
      ['...oooooo...', '..oRRRRRRo.o', '..oRWWWWRooG', '..oRWeeWRo.o', '..oRWWWWRo.o', '.oRRRWWRRRoo', 'oRRRRRRRRRoW', 'oRRRrRRRRRoW', '.oRRRRRRRo.o', '.oRRRRRRRo..', '..ooooooo...'],
    ],
  },
  banshee: {
    palette: { o: '#2a4a3a', H: '#a8e0c0', F: '#d8f8e8', e: O },
    alpha: 0.85,
    frames: [
      ['...oooooo...', '..oHHHHHHo..', '.oHFFFFFFHo.', '.oHFeFFeFHo.', '.oHFFooFFHo.', '.oHFFFFFFHo.', '.oHHFFFFHHo.', '..oFFFFFFo..', '.oFFFFFFFFo.', '.oFoFFoFFoo.', '..o.oo.oo...'],
      ['...oooooo...', '..oHHHHHHo..', '.oHFFFFFFHo.', '.oHFeFFeFHo.', '.oHFFooFFHo.', '.oHFFFFFFHo.', '.oHHFFFFHHo.', '..oFFFFFFo..', '.oFFFFFFFFo.', '.ooFFoFFoFo.', '...oo.oo.o..'],
    ],
  },
  bullKing: {
    palette: { o: O, B: '#6a3a24', H: '#f0e6c8', e: '#ff4d4d', n: '#a87a5a', N: O },
    evolvedPalette: { o: O, B: '#2a2a3a', H: '#e8b84a', e: '#5fe0ff', n: '#5a5a7a', N: O },
    scale: 2,
    frames: [
      ['o............o', 'oHo..oooo..oHo', '.oHooBBBBooHo.', '..oHBBBBBBHo..', '..oBBeBBeBBo..', '..oBBBBBBBBo..', '.oBBnnnnnnBBo.', '.oBBnNnnNnBBo.', 'oBBBBnnnnBBBBo', 'oBBBBBBBBBBBBo', 'oBBoBBBBBBoBBo', 'oBBoBBBBBBoBBo', '.oo.oBBBBo.oo.', '....oBooBo....', '....oo..oo....'],
      ['o............o', 'oHo..oooo..oHo', '.oHooBBBBooHo.', '..oHBBBBBBHo..', '..oBBeBBeBBo..', '..oBBBBBBBBo..', '.oBBnnnnnnBBo.', '.oBBnNnnNnBBo.', 'oBBBBnnnnBBBBo', 'oBBBBBBBBBBBBo', 'oBBoBBBBBBoBBo', 'oBBoBBBBBBoBBo', '.oo.oBBBBo.oo.', '...oBo..oBo...', '...oo....oo...'],
    ],
  },
  thunderbird: {
    palette: { o: O, Y: '#ffe14d', e: O, K: '#e8a030', W: '#4a7ad8', B: '#2a4a9a' },
    evolvedPalette: { o: O, Y: '#ff8a3a', e: '#ffffff', K: '#c8a030', W: '#2a2a3a', B: '#4a1a5a' },
    scale: 2,
    frames: [
      ['......oo......', '.....oYYo.....', '....oYeYYo....', 'o...oYYYYo...o', 'oWo..oKKo..oWo', 'oWWo.oBBo.oWWo', 'oWWWoBBBBoWWWo', '.oWWWBBBBWWWo.', '..oWWBYYBWWo..', '...oWBBBBWo...', '....oBBBBo....', '.....oBBo.....', '....oYooYo....', '....oo..oo....'],
      ['......oo......', '.....oYYo.....', '....oYeYYo....', 'oWo.oYYYYo.oWo', 'oWWo.oKKo.oWWo', '.oWWooBBooWWo.', '..oWWBBBBWWo..', '...oWBBBBWo...', '..oWWBYYBWWo..', '...oWBBBBWo...', '....oBBBBo....', '.....oBBo.....', '....oYooYo....', '....oo..oo....'],
    ],
  },
  necromancer: {
    palette: { o: O, R: '#4a3468', r: '#7a58a8', W: '#e8e4d8', e: '#5fff8a', m: O, g: '#5fff8a', a: '#e8b84a' },
    evolvedPalette: { o: O, R: '#4a0a1a', r: '#8a1a2a', W: '#e8e4d8', e: '#ff3a3a', m: O, g: '#ff3a3a', a: '#e8b84a' },
    scale: 2,
    frames: [
      ['...oooooooo...', '..oRRRRRRRRo..', '.oRRrrrrrrRRo.', '.oRrWWWWWWrRo.', '.oRrWeWWeWrRo.', '.oRrWWWWWWrRo.', '.oRRrWmmWrRRo.', 'oRRRRRRRRRRRRo', 'oRgRRRRRRRRgRo', 'oRRRRRaaRRRRRo', 'oRRRRRaaRRRRRo', '.oRRRRRRRRRRo.', '.oRRrRRRRrRRo.', '..oooooooooo..'],
    ],
  },
  treant: {
    palette: { o: O, T: '#6b4a2a', t: '#a07a4a', L: '#4f9a3a', e: '#ffe14d' },
    evolvedPalette: { o: O, T: '#7a2a24', t: '#b8503a', L: '#e0a030', e: '#fff3a0' },
    scale: 2,
    frames: [
      ['..o..oooo..o..', '.oLo.oLLo.oLo.', '..oLoLLLLoLo..', '...oTTTTTTo...', '..oTTTTTTTTo..', '.oTTeTTTTeTTo.', '.oTTTTTTTTTTo.', '.oTTTooooTTTo.', 'oTToTTTTTToTTo', 'oToTTTtTTTToTo', 'oo.oTTTTTTo.oo', '...oTTTTTTo...', '..oTTo..oTTo..', '.oTTo....oTTo.', '.ooo......ooo.'],
      ['.o..oooo..o...', 'oLo.oLLo.oLo..', '.oLoLLLLoLo...', '...oTTTTTTo...', '..oTTTTTTTTo..', '.oTTeTTTTeTTo.', '.oTTTTTTTTTTo.', '.oTTTooooTTTo.', 'oTToTTTTTToTTo', 'oToTTTtTTTToTo', 'oo.oTTTTTTo.oo', '...oTTTTTTo...', '..oTTo..oTTo..', '.oTTo....oTTo.', '.ooo......ooo.'],
    ],
  },
  golem: {
    palette: { o: O, K: '#4a3a36', R: '#ff6a2a', Y: '#ffd84a' },
    evolvedPalette: { o: O, K: '#24202e', R: '#3ab0ff', Y: '#c8f0ff' },
    scale: 2,
    frames: [
      ['....oooooo....', '...oKKKKKKo...', '..oKKYKKYKKo..', '..oKKKKKKKKo..', 'oooKRRRRRRKooo', 'oKKoKKRRKKoKKo', 'oKRoKKKKKKoRKo', 'oKKoKKRKKKoKKo', 'oKKoKKKKKKoKKo', '.ooooKKKKoooo.', '....oKKoKKo...', '...oKKKoKKKo..', '...oooo.oooo..'],
    ],
  },
  lich: {
    palette: { o: O, P: '#3a4a8a', p: '#8ab4ff', W: '#e8eef5', e: '#5fe0ff', a: '#e8b84a' },
    evolvedPalette: { o: O, P: '#4a1a5a', p: '#d06aff', W: '#e8eef5', e: '#ff4d4d', a: '#e8b84a' },
    scale: 2,
    frames: [
      ['...o..oo..o...', '...oaoaaoao...', '...oaaaaaao...', '..oPPPPPPPPo..', '..oPWWWWWWPo..', '..oPWeWWeWPo..', '..oPWWWWWWPo..', '.oPPPoWWoPPPo.', 'oPPpPPPPPPpPPo', 'oPPpPPPPPPPpPo', '.oPPPPPPPPPPo.', '..oPPPPPPPPo..', '..oPpPPPPpPo..', '...oooooooo...'],
    ],
  },
  scorpion: {
    palette: { o: O, B: '#c08a3a', b: '#e8b860', S: '#7a4a1a', e: '#ff4d4d', C: '#a06a2a' },
    frames: [
      ['.......ooo..', '......oSSSo.', '.......oooSo', '..........So', '...ooooooooS', '..oBBbBBBBo.', '.oBeBBBBeBBo', 'oCoBBBBBBBoC', 'oCCooooooooC', '.oo.o.o.o.o.'],
      ['.......ooo..', '......oSSSo.', '.......oooSo', '..........So', '...ooooooooS', '..oBBbBBBBo.', '.oBeBBBBeBBo', 'oCoBBBBBBBoC', 'oCCooooooooC', '..o.o.o.o.o.'],
    ],
  },
  mummy: {
    palette: { o: O, W: '#e8dcc0', w: '#b8a888', e: '#ffd04d' },
    frames: [
      ['...oooooo...', '..oWwWWwWo..', '..oWeWWeWo..', '..owWWWWwo..', '...oWwWWo...', '.ooWWwWWwoo.', 'oWWwWWWwWWWo', 'oWo.oWwWo.oW', '....oWWwo...', '...oWwoWWo..', '...oWo.oWo..', '...oo..oo...'],
      ['...oooooo...', '..oWwWWwWo..', '..oWeWWeWo..', '..owWWWWwo..', '...oWwWWo...', '.ooWWwWWwoo.', 'oWWwWWWwWWWo', 'oWo.oWwWo.oW', '....oWWwo...', '...oWwoWWo..', '..oWo..oWo..', '..oo....oo..'],
    ],
  },
  sandWorm: {
    palette: { o: O, S: '#d8a860', s: '#a07a40', M: '#8a2a2a', T: '#f0e8d0' },
    frames: [
      ['....oooo....', '...oSSSSo...', '..oSTMMTSo..', '..oSMMMMSo..', '..oSTMMTSo..', '...osSSso...', '...oSSSSo...', '..osSSSSso..', '..oSSSSSSo..', '.oosssssooo.'],
      ['....oooo....', '...oSSSSo...', '..oSMMMMSo..', '..oSMTTMSo..', '..oSMMMMSo..', '...osSSso...', '...oSSSSo...', '..osSSSSso..', '..oSSSSSSo..', '.oosssssooo.'],
    ],
  },
  crab: {
    palette: { o: O, R: '#d04a3a', r: '#f08a6a', e: O, W: '#ffffff' },
    frames: [
      ['oo........oo', 'oRo......oRo', 'oRRo.oo.oRRo', '.oRoeWWeoRo.', '..ooRRRRoo..', '.oRRrRRrRRo.', 'oRRRRRRRRRRo', 'oRRRRRRRRRRo', '.oooooooooo.', '.o.o.o.o.o..'],
      ['.oo......oo.', 'oRRo....oRRo', 'oRo.oooo.oRo', '.oRoeWWeoRo.', '..ooRRRRoo..', '.oRRrRRrRRo.', 'oRRRRRRRRRRo', 'oRRRRRRRRRRo', '.oooooooooo.', '..o.o.o.o.o.'],
    ],
  },
  siren: {
    palette: { o: O, H: '#3ac0a8', S: '#f0c8b0', e: O, T: '#2a7aa8', t: '#5ab0e0' },
    frames: [
      ['...oooooo...', '..oHHHHHHo..', '.oHHSSSSHHo.', '.oHSeSSeSHo.', '.oHHSSSSHHo.', '..oHoSSoHo..', '..oSSttSSo..', '...oTTTTo...', '...oTtTTo...', '....oTTo....', '...oTooTo...', '..ooo..ooo..'],
      ['...oooooo...', '..oHHHHHHo..', '.oHHSSSSHHo.', '.oHSeSSeSHo.', '.oHHSSSSHHo.', '..oHoSSoHo..', '..oSSttSSo..', '...oTTTTo...', '...oTTtTo...', '....oTTo....', '....oTTo....', '...ooooo....'],
    ],
  },
  jelly: {
    palette: { o: '#3a2a6a', J: '#b08aff', j: '#e8d8ff', Y: '#ffe14d' },
    alpha: 0.9,
    frames: [
      ['...oooooo...', '..oJjjJJJo..', '.oJjJJJJJJo.', '.oJJYJJYJJo.', '.oJJJJJJJJo.', '..oooooooo..', '..Y.J..J.Y..', '..J.Y..Y.J..', '...J....J...'],
      ['...oooooo...', '..oJjjJJJo..', '.oJjJJJJJJo.', '.oJJYJJYJJo.', '.oJJJJJJJJo.', '..oooooooo..', '...J.YY.J...', '..Y..JJ..Y..', '..J......J..'],
    ],
  },
  clockSoldier: {
    palette: { o: O, B: '#b88a3a', b: '#e8c060', G: '#5a5a6a', e: '#5fe0ff', K: '#8a8a9a' },
    frames: [
      ['....oooo....', '...oBBBBo...', '..oBeBBeBo..', '..oBBBBBBo..', '...oGGGGo..o', '..oBBbbBBooK', '.oBoBGGBoBKo', '.oGoBbbBo.o.', '...oGGGGo...', '...oBooBo...', '...oGo.oGo..', '...oo..oo...'],
      ['....oooo....', '...oBBBBo...', '..oBeBBeBo..', '..oBBBBBBo..', '...oGGGGo..o', '..oBBbbBBooK', '.oBoBGGBoBKo', '.oGoBbbBo.o.', '...oGGGGo...', '...oBooBo...', '..oGo..oGo..', '..oo....oo..'],
    ],
  },
  turretBot: {
    palette: { o: O, G: '#6a6a7a', g: '#9a9aaa', B: '#b88a3a', e: '#ff4d4d' },
    frames: [
      ['....oooo....', '...oGGGGoooo', '..oGgeegGGGo', '..oGGeeGGooo', '..oGGGGGGo..', '...oBBBBo...', '..oBBBBBBo..', '.oGGGGGGGGo.', '.oggggggggo.', '.oooooooooo.'],
      ['....oooo....', '...oGGGGoooo', '..oGgeegGGGo', '..oGGGGGGooo', '..oGGGGGGo..', '...oBBBBo...', '..oBBBBBBo..', '.oGGGGGGGGo.', '.oggggggggo.', '.oooooooooo.'],
    ],
  },
  drone: {
    palette: { o: O, G: '#8a8a9a', g: '#c8c8d8', e: '#5fe0ff', P: '#5a5a6a' },
    frames: [
      ['oooo....oooo', '..o......o..', '..oooooooo..', '.oGGGGGGGGo.', 'oGgGeeeGgGGo', 'oGGGeeeGGGGo', '.oGGGGGGGGo.', '..oPoooPo...', '...o...o....'],
      ['.oo......oo.', '..o......o..', '..oooooooo..', '.oGGGGGGGGo.', 'oGgGeeeGgGGo', 'oGGGeeeGGGGo', '.oGGGGGGGGo.', '..oPoooPo...', '...o...o....'],
    ],
  },
  lizardman: {
    palette: { o: O, L: '#4a9a4a', l: '#8ad06a', e: '#ffe14d', S: '#c8c8d8', B: '#8a5a2a' },
    frames: [
      ['...ooooo....', '..oLLLLLoo..', '..oLeLLLLLo.', '..oLLLLooo..', '...oLLo....o', '..oLlllLo.oS', '.oLoBBBBooSo', '.oLolllLoBo.', '...oLLLLo...', '...oLooLo...', '...oLo.oLoo.', '...oo..ooLLo'],
      ['...ooooo....', '..oLLLLLoo..', '..oLeLLLLLo.', '..oLLLLooo..', '...oLLo....o', '..oLlllLo.oS', '.oLoBBBBooSo', '.oLolllLoBo.', '...oLLLLo...', '...oLooLo...', '..oLo..oLoo.', '..oo....oLLo'],
    ],
  },
  drake: {
    palette: { o: O, R: '#c83a2a', r: '#f07a4a', Y: '#ffd04d', e: O, W: '#8a2a2a' },
    frames: [
      ['..o......o..', '.oWo....oWo.', 'oWWWoooWWWWo', 'oWWoRRRRoWWo', '.ooRReRReRo.', '..oRRRRRRo..', '..oRYYYYRo..', '...oRYYRoo..', '...oRRRRoRo.', '...oRooRo.o.', '...oo..oo...'],
      ['............', '.oo......oo.', 'oWWooooooWWo', 'oWWoRRRRoWWo', 'oWoRReRReRoo', '..oRRRRRRo..', '..oRYYYYRo..', '...oRYYRoo..', '...oRRRRoRo.', '...oRooRo.o.', '...oo..oo...'],
    ],
  },
  wyvern: {
    palette: { o: O, G: '#3a6a5a', g: '#6aa08a', Y: '#ffd04d', W: '#2a4a3a' },
    frames: [
      ['o..........o', 'oWo..oo..oWo', 'oWWooGGooWWo', 'oWWWGYGYGWWo', '.oWWGGGGWWo.', '..ooGggGoo..', '...oGggGo...', '...oGGGGo...', '....oGGo....', '...oGooGo...', '...oo..oo...'],
      ['............', 'oo...oo...oo', 'oWWooGGooWWo', '.oWWGYGYGWo.', '..oWGGGGWo..', '..ooGggGoo..', '...oGggGo...', '...oGGGGo...', '....oGGo....', '...oGooGo...', '...oo..oo...'],
    ],
  },
  imp: {
    palette: { o: O, R: '#c02a3a', r: '#e85a6a', e: '#ffe14d', W: '#5a1a2a' },
    frames: [
      ['.o........o.', '.oRo....oRo.', 'oWoRooooRoWo', 'oWWRReeRRWWo', '.oWRRRRRRWo.', '..oRrrrrRo..', '...oRRRRo...', '...oRooRo.o.', '....o..o.oR.', '..........o.'],
      ['.o........o.', 'ooRo....oRoo', 'oWWRooooRWWo', '.oWRReeRRWo.', '..oRRRRRRo..', '..oRrrrrRo..', '...oRRRRo...', '...oRooRo.o.', '....o..o.oR.', '..........o.'],
    ],
  },
  demonKnight: {
    palette: { o: O, A: '#3a2a3a', a: '#6a4a6a', R: '#d02a3a', H: '#c8b8a0', S: '#a8a8b8' },
    frames: [
      ['.H........H.', '.oH.oooo.Ho.', '..oHAAAAHo..', '..oAARRAAo..', '..oAAAAAAo.o', '.ooAaaaaAooS', 'oAAoAaaAoAoS', 'oAAoAAAAoAoS', '.oooAaaAooo.', '...oAooAo...', '...oAo.oAo..', '...ooo.ooo..'],
      ['.H........H.', '.oH.oooo.Ho.', '..oHAAAAHo..', '..oAARRAAo..', '..oAAAAAAo.o', '.ooAaaaaAooS', 'oAAoAaaAoAoS', 'oAAoAAAAoAoS', '.oooAaaAooo.', '...oAooAo...', '..oAo..oAo..', '..ooo..ooo..'],
    ],
  },
  succubus: {
    palette: { o: O, H: '#8a2a6a', S: '#f0c0c8', e: '#ff4d8a', W: '#4a1a3a', D: '#b03a7a' },
    alpha: 0.95,
    frames: [
      ['o..oooooo..o', 'oWoHHHHHHoWo', 'oWoHSSSSHoWo', 'oWWHSeeSHWWo', '.oWHSSSSHWo.', '..oHoSSoHo..', '...oDDDDo...', '...oDSSDo...', '...oDDDDo...', '..oDDooDDo..', '..ooo..ooo..'],
      ['...oooooo...', 'oo.HHHHHH.oo', 'oWWHSSSSHWWo', 'oWWHSeeSHWWo', '.ooHSSSSHoo.', '..oHoSSoHo..', '...oDDDDo...', '...oDSSDo...', '...oDDDDo...', '..oDDooDDo..', '..ooo..ooo..'],
    ],
  },
  pharaoh: {
    palette: { o: O, G: '#e8b84a', B: '#3a5ab8', S: '#c8905a', e: '#5fe0ff', W: '#f0e8d0', R: '#8a2a2a' },
    evolvedPalette: { o: O, G: '#3a3a4a', B: '#8a1a2a', S: '#8a6a4a', e: '#ff3a3a', W: '#c8b8a0', R: '#ffd04d' },
    scale: 2,
    frames: [
      ['.....oooo.....', '....oGGGGo....', '...oGBGGBGo...', '..oGBGGGGBGo..', '..oBGSSSSGBo..', '..oGSeSSeSGo..', '..oBGSSSSGBo..', '..oGBoSSoBGo..', '.oWWWGGGGWWWo.', 'oWWWWRGGRWWWWo', 'oSoWWWGGWWWoSo', 'oSoWWWRRWWWoSo', '...oWWWWWWo...', '...oWWooWWo...', '...ooo..ooo...'],
      ['.....oooo.....', '....oGGGGo....', '...oGBGGBGo...', '..oGBGGGGBGo..', '..oBGSSSSGBo..', '..oGSeSSeSGo..', '..oBGSSSSGBo..', '..oGBoSSoBGo..', '.oWWWGGGGWWWo.', 'oWWWWRGGRWWWWo', 'oSoWWWGGWWWoSo', 'oSoWWWRRWWWoSo', '...oWWWWWWo...', '..oWWo..oWWo..', '..ooo....ooo..'],
    ],
  },
  kraken: {
    palette: { o: O, P: '#8a3a8a', p: '#c06ac0', e: '#ffe14d', E: O },
    evolvedPalette: { o: O, P: '#1a4a5a', p: '#3a9aa8', e: '#ff3a3a', E: O },
    scale: 2,
    frames: [
      ['....oooooo....', '...oPPPPPPo...', '..oPPpPPpPPo..', '.oPPPPPPPPPPo.', '.oPPoeoPoeoPo.', '.oPPoEoPoEoPo.', '.oPPPPPPPPPPo.', '..oPPPppPPPo..', '.oPoPoPPoPoPo.', 'oPo.oPooPo.oPo', 'oPo.oPo.oPoPo.', '.oPooPo.oPoo..', '..ooPo...oPo..', '....oo....oo..'],
      ['....oooooo....', '...oPPPPPPo...', '..oPPpPPpPPo..', '.oPPPPPPPPPPo.', '.oPPoeoPoeoPo.', '.oPPoEoPoEoPo.', '.oPPPPPPPPPPo.', '..oPPPppPPPo..', '.oPoPoPPoPoPo.', '.oPoPo.oPoPoPo', '..oPoPo.oPo.oP', '...oPoPooPooPo', '....oo.oPo.oo.', '........oo....'],
    ],
  },
  steamTitan: {
    palette: { o: O, B: '#b88a3a', b: '#e8c060', G: '#5a5a6a', g: '#8a8a9a', e: '#ff8a3a', W: '#e8e8f0' },
    evolvedPalette: { o: O, B: '#3a3a4a', b: '#6a6a7a', G: '#8a1a2a', g: '#c03a3a', e: '#5fe0ff', W: '#e8e8f0' },
    scale: 2,
    frames: [
      ['..W......W....', '.oWo.oooooWo..', '.oGo.oBBBoGo..', '..oooBeBeBoo..', '...oBBBBBBo...', '.ooGGGGGGGGoo.', 'oBBoGbbbbGoBBo', 'oBBoGbGGbGoBBo', 'oGGoGbbbbGoGGo', 'ogggoGGGGoggg.', '.ooo.oGGo.ooo.', '....oBooBo....', '...oBBooBBo...', '...oooo.ooo...'],
      ['..W......W....', '.oWo.oooooWo..', '.oGo.oBBBoGo..', '..oooBeBeBoo..', '...oBBBBBBo...', '.ooGGGGGGGGoo.', 'oBBoGbbbbGoBBo', 'oBBoGbGGbGoBBo', 'oGGoGbbbbGoGGo', 'ogggoGGGGoggg.', '.ooo.oGGo.ooo.', '...oBo..oBo...', '..oBBo..oBBo..', '..oooo..oooo..'],
    ],
  },
  redDragon: {
    palette: { o: O, R: '#c8302a', r: '#f07040', Y: '#ffd04d', W: '#7a1a1a', e: '#ffe14d', T: '#f0e8d0' },
    evolvedPalette: { o: O, R: '#2a2a3a', r: '#5a5a7a', Y: '#5fe0ff', W: '#4a1a5a', e: '#ff3a3a', T: '#f0e8d0' },
    scale: 2,
    frames: [
      ['oo..........oo', 'oWo..oooo..oWo', 'oWWooRRRRooWWo', 'oWWWRReRReRWWo', 'oWWWRRRRRRRWWo', '.oWWRToTToRWo.', '..oWoRRRRoWo..', '...oRYYYYRo...', '..oRRYYYYRRo..', '..oRrYYYYrRo..', '...oRRRRRRo.o.', '...oRRooRRooRo', '..oRRo..oRRoo.', '..ooo....ooo..'],
      ['..............', 'oo...oooo...oo', 'oWWooRRRRooWWo', 'oWWWRReRReRWWo', '.oWWRRRRRRRWo.', '..oWRToTToRWo.', '..ooRRRRRRoo..', '...oRYYYYRo...', '..oRRYYYYRRo..', '..oRrYYYYrRo..', '...oRRRRRRo...', '...oRRooRRoRo.', '..oRRo..oRRoRo', '..ooo....ooo..'],
    ],
  },
  demonLord: {
    palette: { o: O, A: '#2a1a2a', a: '#4a2a4a', R: '#d02a3a', H: '#e8d8b8', S: '#c8b0a0', e: '#ffe14d', C: '#8a1a2a' },
    evolvedPalette: { o: O, A: '#e8e0f0', a: '#b8a8c8', R: '#5fe0ff', H: '#3a3a4a', S: '#d8c8b8', e: '#5fe0ff', C: '#3a5ab8' },
    scale: 2,
    frames: [
      ['oH........Ho..', 'oHo.oooo.oHo..', '.oHoAAAAoHo...', '..oAASSAAo....', '..oASeSeSAo...', '..oAASSSAAo...', '.ooAAoRRoAAoo.', 'oCCAAaaaaAACCo', 'oCCAoaRRaoACCo', 'oCCSoaaaaoSCCo', 'oCCCoAAAAoCCCo', '.oCCoAooAoCCo.', '..oooAo.oAooo.', '....oo...oo...'],
      ['oH........Ho..', 'oHo.oooo.oHo..', '.oHoAAAAoHo...', '..oAASSAAo....', '..oASeSeSAo...', '..oAASSSAAo...', '.ooAAoRRoAAoo.', 'oCCAAaaaaAACCo', 'oCCAoaRRaoACCo', 'oCCSoaaaaoSCCo', 'oCCCoAAAAoCCCo', 'oCCCoAooAoCCCo', '.ooooAo.oAoooo', '....oo...oo...'],
    ],
  },
};

// 岩漿史萊姆與苔蘚史萊姆同形，只換顏色。
MONSTER_ART.magmaSlime.frames = MONSTER_ART.slime.frames;

/**
 * 依字元陣列繪製到新的畫布。
 * @param {string[]} rows 像素列。
 * @param {Record<string, string>} palette 調色盤。
 * @param {string} [tint] 指定時所有非透明像素都用這個顏色（受傷閃爍用）。
 * @returns {HTMLCanvasElement | OffscreenCanvas} 畫布。
 */
function paint(rows, palette, tint) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.' || ch === ' ' || !palette[ch]) return;
      g.fillStyle = tint || palette[ch];
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

/**
 * 建立畫布（瀏覽器環境）。
 * @param {number} w 寬。
 * @param {number} h 高。
 * @returns {HTMLCanvasElement} 畫布。
 */
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 預先繪製好的圖：{key: {frames: canvas[], flash: canvas[], scale, alpha}}。 */
const cache = new Map();

/**
 * 由待機圖產生 4 格走路循環（參考走路動作圖：踏步 → 身體上浮 → 換腳踏步 → 身體上浮）。
 * 正面與背面：腳部（腳底以上 6 列）以中線分左右，輪流抬起 2 格；側面：前腳往前、後腳往後各跨 1 格，下一步前後交換。
 * 踏步之間的格子把腳部以上的身體往上移 1 格，表現走路時身體的起伏。
 * @param {string[]} rows 待機圖（已貼在共用畫布上）。
 * @param {number} foot 腳底以下的列數。
 * @param {'down' | 'up' | 'side'} dir 方向。
 * @returns {string[][]} 4 格走路幀。
 */
function walkCycle(rows, foot, dir) {
  const H = rows.length - foot;
  const W = rows[0].length;
  const legTop = H - 6;
  const mid = W / 2;
  /** 取 (x, y) 的像素（超出範圍為透明）。 */
  const at = (x, y) => (y >= 0 && y < rows.length && x >= 0 && x < W ? rows[y][x] : '.');
  /** 依每個像素的來源位置建立一格。 */
  const build = (src) => rows.map((r, y) => [...r].map((c, x) => src(x, y)).join(''));
  /** 身體上浮：腳部以上整體往上移 1 格（腳部不動，腿看起來伸長）。 */
  const bob = build((x, y) => (y < legTop ? at(x, y + 1) : at(x, y)));
  if (dir === 'side') {
    /** 跨步：畫面右半（前腳）往 front 方向移、左半（後腳）往反方向移；後腳先畫，前腳蓋在上面。 */
    const stride = (front) => build((x, y) => {
      if (y < legTop || y >= H) return at(x, y);
      const fromFront = at(x - front, y);
      if (fromFront !== '.' && x - front >= mid) return fromFront;
      const fromBack = at(x + front, y);
      return fromBack !== '.' && x + front < mid ? fromBack : '.';
    });
    return [stride(1), bob, stride(-1), bob];
  }
  /** 抬腳：腳部中線一側的像素往上移 2 格。 */
  const lift = (left) => build((x, y) => {
    if (y < legTop || y >= H || (x < mid) !== left) return at(x, y);
    return y + 2 < H ? at(x, y + 2) : '.';
  });
  return [lift(true), bob, lift(false), bob];
}

/**
 * 把一格（緊貼的像素與位置）貼到職業的共用畫布上。
 * @param {{w: number, h: number}} h 職業圖資料。
 * @param {{x: number, y: number, rows: string[]}} f 一格。
 * @returns {string[]} 共用畫布大小的各列。
 */
function place(h, f) {
  const out = Array.from({ length: h.h }, () => '.'.repeat(h.w).split(''));
  f.rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c !== '.' && out[f.y + y] && f.x + x >= 0 && f.x + x < h.w) out[f.y + y][f.x + x] = c;
  }));
  return out.map((r) => r.join(''));
}

/**
 * 取得角色圖（含受傷閃白的版本）。
 * dirs 依方向（down 正面、up 背面、side 面向右，面向左時翻轉）提供待機、走路 4 格（踏步、上浮、換腳、上浮）與攻擊 6～8 格；
 * 沒有動作圖的職業 attack 為 null（攻擊時以程式變形表現）。frames 是側面的待機與兩個跨步幀（家園用），
 * portrait 是緊貼的正面待機圖（介面頭像用）。圖是 2 倍密度（density 2），腳底以下有 foot 列（特效用）。
 * @param {string} cls 職業。
 * @returns {{palette: Record<string, string>, dirs: Record<string, {stand: HTMLCanvasElement, walk: HTMLCanvasElement[], attack: HTMLCanvasElement[] | null}>, flash: Record<string, {stand: HTMLCanvasElement, walk: HTMLCanvasElement[], attack: HTMLCanvasElement[] | null}>, frames: HTMLCanvasElement[], portrait: HTMLCanvasElement, scale: number, alpha: number, density: number, foot: number, standH: number}} 圖。
 */
export function heroArt(cls) {
  const key = `hero-${cls}`;
  if (!cache.has(key)) {
    const h = HERO_SPRITES[cls];
    /** 依調色盤（或閃白色）建立各方向的圖。 */
    const build = (tint) => {
      const dirs = {};
      for (const [d, list] of Object.entries(h.frames)) {
        const stand = place(h, list[0]);
        dirs[d] = {
          stand: paint(stand, h.palette, tint),
          walk: walkCycle(stand, h.foot, d).map((r) => paint(r, h.palette, tint)),
          attack: list.length > 1 ? list.map((f) => paint(place(h, f), h.palette, tint)) : null,
        };
      }
      return dirs;
    };
    const dirs = build();
    const down = h.frames.down[0];
    cache.set(key, {
      palette: h.palette,
      dirs,
      flash: build('#ffffff'),
      frames: [dirs.side.stand, dirs.side.walk[0], dirs.side.walk[2]],
      portrait: paint(down.rows, h.palette),
      scale: 1,
      alpha: 1,
      density: 2,
      foot: h.foot,
      standH: h.h - h.foot - down.y,
    });
  }
  return cache.get(key);
}

/**
 * 把手寫的怪物像素圖精緻化成 2 倍密度（與角色相同的細緻度），回傳每個像素的顏色：
 * 1. Scale2x：解析度加倍並把斜邊的階梯補平，輪廓變圓滑；
 * 2. 外框變細：原圖輪廓上的外框在加倍後是 2 像素粗，把內側那一半換成相鄰的身體顏色（眼睛、分隔線等內部線條保留）；
 * 3. 光影：左上靠近外框或透明處的像素提亮、右下的壓暗，與角色同一個光源方向。
 * @param {string[]} rows 原圖的像素列。
 * @param {Record<string, string>} palette 調色盤。
 * @returns {(string | null)[][]} 2 倍大小的顏色（null 為透明）。
 */
function refineMonster(rows, palette) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  /** 原圖 (x, y) 的顏色（透明與超出範圍為 null）。 */
  const src = (x, y) => {
    const ch = rows[y]?.[x];
    return ch && ch !== '.' && ch !== ' ' && palette[ch] ? palette[ch] : null;
  };
  const W = w * 2;
  const H = h * 2;
  const out = Array.from({ length: H }, () => new Array(W).fill(null));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src(x, y);
      const a = src(x, y - 1);
      const b = src(x + 1, y);
      const c = src(x - 1, y);
      const d = src(x, y + 1);
      out[y * 2][x * 2] = c === a && c !== d && a !== b ? a : p;
      out[y * 2][x * 2 + 1] = a === b && a !== c && b !== d ? b : p;
      out[y * 2 + 1][x * 2] = d === c && d !== b && c !== a ? c : p;
      out[y * 2 + 1][x * 2 + 1] = b === d && b !== a && d !== c ? d : p;
    }
  }
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  /** 原圖 (x, y) 是否為輪廓上的外框（外框色且旁邊是透明）。 */
  const contour = (x, y) => src(x, y) === O && N4.some(([dx, dy]) => src(x + dx, y + dy) === null);
  // 外框變細：輪廓外框的內側像素（不碰到透明）換成相鄰的身體顏色。
  const thin = out.map((r) => r.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (out[y][x] !== O || !contour(x >> 1, y >> 1)) continue;
      if (N4.some(([dx, dy]) => (out[y + dy]?.[x + dx] ?? null) === null)) continue;
      const body = N4.map(([dx, dy]) => out[y + dy]?.[x + dx]).find((v) => v && v !== O);
      if (body) thin[y][x] = body;
    }
  }
  // 光影：上方或左方是外框／透明的像素提亮，下方或右方是的壓暗（兩者都是時維持原色）。
  /** 是否為邊界（外框或透明）。 */
  const edge = (x, y) => {
    const v = thin[y]?.[x] ?? null;
    return v === null || v === O;
  };
  const shaded = thin.map((r) => r.slice());
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = thin[y][x];
      if (!v || v === O) continue;
      const lit = edge(x, y - 1) || edge(x - 1, y);
      const dark = edge(x, y + 1) || edge(x + 1, y);
      if (lit && !dark) shaded[y][x] = mixHex(v, '#ffffff', 0.28);
      else if (dark && !lit) shaded[y][x] = mixHex(v, '#1a1030', 0.3);
    }
  }
  return shaded;
}

/**
 * 依顏色陣列繪製到新的畫布。
 * @param {(string | null)[][]} grid 顏色（null 為透明）。
 * @param {string} [tint] 指定時所有非透明像素都用這個顏色（受傷閃爍用）。
 * @returns {HTMLCanvasElement} 畫布。
 */
function paintGrid(grid, tint) {
  const c = makeCanvas(grid[0].length, grid.length);
  const g = c.getContext('2d');
  grid.forEach((row, y) => row.forEach((v, x) => {
    if (!v) return;
    g.fillStyle = tint || v;
    g.fillRect(x, y, 1, 1);
  }));
  return c;
}

/**
 * 進化 Boss 的配色：依亮度對應到「暗紅 → 赤紅 → 金」的漸層，再與原色混合（保留六成原色的辨識度）。
 * @param {string} hex 原色（#rrggbb）。
 * @returns {string} 進化色。
 */
function evolveColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const l = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
  const stops = [[0, [40, 6, 16]], [0.45, [190, 40, 40]], [0.8, [255, 170, 60]], [1, [255, 240, 190]]];
  let k = 1;
  while (k < stops.length - 1 && l > stops[k][0]) k++;
  const [l0, a] = stops[k - 1];
  const [l1, b] = stops[k];
  const t = Math.max(0, Math.min(1, (l - l0) / (l1 - l0)));
  const out = a.map((v, i) => Math.round((v + (b[i] - v) * t) * 0.6 + c[i] * 0.4));
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/**
 * 取得 Boss 的動作圖（bossSprites.js，4 格：待機 A、待機 B、蓄力、出招，面向右）；進化 Boss 依 evolveColor 換色（外框不變）。
 * 圖是高密度（density 2，繪製時依畫面放大倍率換算），腳底以下有 foot 列（特效用）。
 * @param {string} type Boss 種類。
 * @param {boolean} evolved 是否為進化 Boss。
 * @returns {{frames: HTMLCanvasElement[], flash: HTMLCanvasElement[], scale: number, alpha: number, density: number, foot: number, poses: boolean}} 圖（poses 表示 4 格動作圖）。
 */
function bossArt(type, evolved) {
  const key = `boss-${type}${evolved ? '-evo' : ''}`;
  if (!cache.has(key)) {
    const b = BOSS_SPRITES[type];
    const palette = evolved ? Object.fromEntries(Object.entries(b.palette).map(([k, v]) => [k, k === 'o' ? v : evolveColor(v)])) : b.palette;
    const rows = b.frames.map((f) => place(b, f));
    cache.set(key, {
      frames: rows.map((r) => paint(r, palette)),
      flash: rows.map((r) => paint(r, palette, '#ffffff')),
      scale: 1,
      alpha: 1,
      density: 2,
      foot: b.foot,
      poses: true,
    });
  }
  return cache.get(key);
}

/**
 * 取得一般怪物的動作圖（monsterSprites.js，4 格：待機 A、待機 B、蓄力、出招，面向右）。
 * 大小已由設計圖轉換時決定，scale 固定為 1；半透明沿用 MONSTER_ART 的 alpha。一般怪物不會進化，沒有進化配色。
 * @param {string} type 怪物種類。
 * @returns {{frames: HTMLCanvasElement[], flash: HTMLCanvasElement[], scale: number, alpha: number, density: number, foot: number, poses: boolean}} 圖。
 */
function monsterSpriteArt(type) {
  const key = `ms-${type}`;
  if (!cache.has(key)) {
    const b = MONSTER_SPRITES[type];
    const rows = b.frames.map((f) => place(b, f));
    cache.set(key, {
      frames: rows.map((r) => paint(r, b.palette)),
      flash: rows.map((r) => paint(r, b.palette, '#ffffff')),
      scale: 1,
      alpha: MONSTER_ART[type]?.alpha || 1,
      density: 2,
      foot: b.foot,
      poses: true,
    });
  }
  return cache.get(key);
}

/**
 * 取得怪物或 Boss 圖：Boss 使用動作圖（bossArt）；有設計圖的一般怪物使用 monsterSpriteArt；
 * 其他一般怪物把手寫像素圖精緻化成 2 倍密度（refineMonster）。
 * @param {string} type 種類。
 * @param {boolean} [evolved=false] 是否為進化 Boss。
 * @returns {{frames: HTMLCanvasElement[], flash: HTMLCanvasElement[], scale: number, alpha: number}} 圖。
 */
export function monsterArt(type, evolved = false) {
  if (BOSS_SPRITES[type]) return bossArt(type, evolved);
  if (MONSTER_SPRITES[type]) return monsterSpriteArt(type);
  const a = MONSTER_ART[type];
  const useEvo = evolved && !!a.evolvedPalette;
  const key = `m-${type}${useEvo ? '-evo' : ''}`;
  if (!cache.has(key)) {
    const palette = useEvo ? a.evolvedPalette : a.palette;
    // 一般怪物以 refineMonster 精緻化成 2 倍密度（繪製時依畫面放大倍率換算，與角色相同）。
    const grids = a.frames.map((r) => refineMonster(r, palette));
    cache.set(key, {
      frames: grids.map((gr) => paintGrid(gr)),
      flash: grids.map((gr) => paintGrid(gr, '#ffffff')),
      scale: a.scale || 1,
      alpha: a.alpha || 1,
      density: 2,
      foot: 0,
    });
  }
  return cache.get(key);
}

/**
 * 入場卷圖（ticket1～ticket5）：同一張票券造型，依等級換成銅、銀、金、白金、鑽石的顏色。
 * @returns {Record<string, {palette: Record<string, string>, rows: string[]}>} 道具圖。
 */
function ticketArt() {
  const colors = [['#c07a3a', '#f0b070'], ['#9aa3b5', '#e8eef5'], ['#d8a020', '#ffe080'], ['#7ac8d8', '#e0fbff'], ['#b070f0', '#f0d0ff']];
  const rows = ['oooooooooooo', 'oTTTTTToTTTo', 'oTTtTTT.TtTo', '.TtttTToTtT.', 'oTTtTTT.TtTo', 'oTTTTTToTTTo', 'oooooooooooo'];
  const out = {};
  colors.forEach(([T, t], k) => {
    out[`ticket${k + 1}`] = { palette: { o: O, T, t }, rows };
  });
  return out;
}

/** 道具圖：金幣、藥水、裝備袋、寶箱（關、開）、鑰匙、盾牌、劍（首頁裝飾）。 */
export const ITEM_ART = {
  coin: { palette: { o: '#7a5a1a', Y: '#e8b84a', y: '#fff0a0' }, rows: ['.oooo.', 'oYyYYo', 'oyYYYo', 'oYYYYo', 'oYYYYo', '.oooo.'] },
  potion: { palette: { o: O, C: '#c8b8a0', R: '#e04a5a', r: '#ff9aa8' }, rows: ['..oo..', '..CC..', '.oRRo.', 'oRrRRo', 'oRRRRo', '.oooo.'] },
  bag: { palette: { o: O, B: '#a07a4a', b: '#d8b080', X: '#ffffff' }, rows: ['..oo..', '.oXXo.', '.oBBo.', 'oBbBBo', 'oBBBBo', '.oooo.'] },
  chest: { palette: { o: O, W: '#8a3422', w: '#b04a2c', h: '#d0703e', d: '#5a2016', G: '#e8b84a', g: '#a87424', Y: '#fff0a0', K: '#2a1408' }, rows: ['..oooooooooo..', '.ohhhhhhhhhho.', 'oGwwwwwwwwwwGo', 'oGWWWWGGWWWWGo', 'oGWWWWGGWWWWGo', 'ooooooYYoooooo', 'oggggGYYGggggo', 'oGwwwGKKGwwwGo', 'oGWWWGYYGWWWGo', 'oGWWWWGGWWWWGo', 'oGddddddddddGo', 'oooooooooooooo'] },
  chestOpen: { palette: { o: O, W: '#8a3422', w: '#b04a2c', h: '#d0703e', d: '#5a2016', G: '#e8b84a', g: '#a87424', Y: '#fff0a0', K: '#2a1408', D: '#2a1810' }, rows: ['.oooooooooooo.', 'oGhhhhhhhhhhGo', 'oGWWWWGGWWWWGo', 'oGddddddddddGo', 'oooooooooooooo', 'oDYDDYYDDYDDDo', 'oggggggggggggo', 'oGwwwGYYGwwwGo', 'oGWWWGYYGWWWGo', 'oGWWWWGGWWWWGo', 'oGddddddddddGo', 'oooooooooooooo'] },
  pouch: { palette: { o: O, B: '#c88a2a', b: '#f0c860', R: '#9e2a3a' }, rows: ['..oooo..', '.oRRRRo.', '..oBBo..', '.oBbBBo.', 'oBbBBBBo', 'oBBBBBBo', 'oBBBBBBo', '.oooooo.'] },
  key: { palette: { o: O, Y: '#e8b84a' }, rows: ['.ooo......', 'oYYYo.....', 'oYoYoooooo', 'oYYYYYYYYo', '.ooo.oYoYo', '.....o.o.o'] },
  shield: { palette: { o: O, S: '#9aa3b5', R: '#9e2a3a', Y: '#e8b84a' }, rows: ['oooooooo', 'oSSSSSSo', 'oSRRRRSo', 'oSRYYRSo', 'oSRRRRSo', '.oSRRSo.', '..oSSo..', '...oo...'] },
  sword: { palette: { o: O, S: '#f0f0f0', D: '#9aa3b5', G: '#e8b84a', B: '#6b4226' }, rows: ['......oo', '.....oSo', '....oSDo', '.o.oSDo.', '.oGSDo..', '..oGo...', '.oBoGo..', 'oBo.oo..'] },
  helmet: { palette: { o: O, S: '#9aa3b5', L: '#d8dde8', D: '#5a6478' }, rows: ['..oooo..', '.oLLSSo.', 'oLSSSSDo', 'oSSSSSDo', 'oSDDDDSo', 'oSo..oSo', 'ooo..ooo'] },
  armor: { palette: { o: O, S: '#9aa3b5', L: '#d8dde8', R: '#9e2a3a' }, rows: ['oo.oo.oo', 'oSooooSo', 'oSLRRSSo', '.oLRRSo.', '.oSRRSo.', '.oSSSSo.', '.oooooo.'] },
  boots: { palette: { o: O, B: '#8a5a2a', b: '#b8844a' }, rows: ['.ooo....', '.obBo...', '.oBBo...', '.oBBoooo', '.obBBBBo', '.oooooo.'] },
  ring: { palette: { o: O, Y: '#e8b84a', R: '#e04a5a', r: '#ff9aa8' }, rows: ['..oo..', '.oRro.', 'oYooYo', 'oY..Yo', 'oYooYo', '.oYYo.', '..oo..'] },
  book: { palette: { o: O, B: '#6a3a8a', b: '#9a6ac8', P: '#f0e6c8', Y: '#e8b84a' }, rows: ['oooooooo', 'oBbBBBPo', 'oBYYBBPo', 'oBBBBBPo', 'oBYYYBPo', 'oBBBBBPo', 'oooooooo'] },
  gift: { palette: { o: O, B: '#c0402a', b: '#e86a4a', Y: '#ffe14d' }, rows: ['..o..o..', '.oYooYo.', 'ooooYooo', 'oBBBYBBo', 'oYYYYYYo', 'oBBBYBBo', 'obBBYBBo', 'oooooooo'] },
  // 技能書碎片：一張撕下的書頁（右上折角、文字行、藍色符文，下緣是撕破的鋸齒）。
  shard: { palette: { o: O, P: '#f0e6c8', p: '#c8b48a', L: '#8a7a5a', B: '#1e5a9a', b: '#4a8ae8' }, rows: ['ooooo...', 'oPPPopo.', 'oPLLoppo', 'oPPPPooo', 'oPLLLLPo', 'oPPPPPPo', 'oPLLLLPo', 'oPPPPPPo', 'oPLLbBPo', 'oPPPBBPo', 'opPpPPpo', '.o.oo.o.'] },
  // 技能書：一本完整的書（左側書脊、藍色封面上的金框與寶石、底部的書頁與紅色書籤）。
  skillbook: { palette: { o: O, S: '#123a6a', B: '#1e5a9a', b: '#4a8ae8', w: '#c0e0ff', Y: '#ffe14d', P: '#f0e6c8', R: '#c0303a' }, rows: ['.oooooooo', 'oSBBBBBBo', 'oSBYYYYBo', 'oSBYbwYBo', 'oSBYbbYBo', 'oSBYYYYBo', 'oSBBBBBBo', 'oSPPPPPPo', '.ooooRooo', '.....R...'] },
  iron: { palette: { o: O, D: '#5a6070', M: '#8a909e', L: '#c0c6d0' }, rows: ['........', '..ooo...', '.oLMMo..', 'oLMMDDo.', 'oMMDDDDo', '.ooooooo'] },
  steel: { palette: { o: O, D: '#2a7a4a', M: '#4fc078', L: '#a8f0c0' }, rows: ['...oo...', '..oLMo..', '.oLMMDo.', 'oLMMMDDo', 'oMMDDDDo', '.oooooo.'] },
  mithril: { palette: { o: O, D: '#1e4a9a', M: '#4a8ae8', L: '#c0e0ff' }, rows: ['...oo...', '..oLLo..', '.oLMMDo.', 'oLMMMMDo', '.oMMMDo.', '..oDDo..', '...oo...'] },
  star: { palette: { o: O, D: '#a86a10', M: '#f2b84b', L: '#fff0b0' }, rows: ['...o....', '..oLo...', 'ooLMLoo.', 'oLMMMDo.', '.oMMDo..', 'oMDooDo.', 'oo...oo.'] },
  dagger: { palette: { o: O, S: '#e8eef5', D: '#9aa3b5', G: '#e8b84a', B: '#4a2a1a' }, rows: ['........', '.....oo.', '....oSo.', '...oSDo.', '.oGSDo..', '..oGo...', '.oBo....', '.oo.....'] },
  daggers: { palette: { o: O, S: '#e8eef5', D: '#9aa3b5', G: '#e8b84a', B: '#4a2a1a' }, rows: ['oo....oo', 'oSo..oSo', '.oSooSo.', '..oDDo..', '.oGooGo.', 'oBo..oBo', 'oo....oo', '........'] },
  fist: { palette: { o: O, Y: '#e8862a', y: '#a85a14', W: '#f0e6c8' }, rows: ['.oooooo.', 'oYoYoYYo', 'oYoYoYYo', 'oYYYYYYo', 'oyYYYYyo', '.oWWWWo.', '.oyyyyo.', '..oooo..'] },
  // 長槍：右上的鋼製槍頭與紅色槍纓，斜向左下的木製槍桿。
  spear: { palette: { o: O, S: '#e8eef5', D: '#9aa3b5', R: '#c0303a', W: '#8a5a34', w: '#b07a3e' }, rows: ['.....ooo', '....oSSo', '....oSDo', '...oRoo.', '..owRo..', '.owwo...', 'owwo....', 'oo......'] },
    bow: { palette: { o: O, W: '#a06a3a', S: '#e8e8e8' }, rows: ['..ooo...', '.oWWoS..', 'oWo..S..', 'oW...S..', 'oWo..S..', '.oWWoS..', '..ooo...'] },
  staff: { palette: { o: O, W: '#8a5a2a', G: '#c8a8ff', L: '#ffffff' }, rows: ['.....oo.', '....oGLo', '....oGGo', '...oWoo.', '..oWo...', '.oWo....', 'oWo.....', 'oo......'] },
  axe: { palette: { o: O, S: '#c0c6d0', D: '#7a808e', W: '#8a5a2a' }, rows: ['..oooo..', '.oSSSDo.', 'oSSSoWo.', 'oSDoWo..', '.ooWo...', '..oWo...', '.oWo....', '.oo.....'] },
  cure: { palette: { o: O, C: '#c8b8a0', B: '#5ab8e8', b: '#c8f0ff' }, rows: ['..oo..', '..CC..', '.oBBo.', 'oBbBBo', 'oBBBBo', '.oooo.'] },
  // 家具製作書：捲起來的藍色設計圖（白色格線、紅色綁繩）。
  blueprint: { palette: { o: O, B: '#2a5a9a', b: '#5a90d8', W: '#d8ecff', R: '#c0303a' }, rows: ['.oooooooo.', 'obBBBBBBbo', 'oBWBWBWBBo', 'oBBBBBBBBo', 'oBWWWWBWBo', 'oRRBBBBBBo', 'oBBBWBWBBo', 'obBBBBBBbo', '.oooooooo.'] },
  // 種子袋：麻布小袋，袋口冒出綠芽。
  seedBag: { palette: { o: O, B: '#b08a52', b: '#d8b47a', G: '#4fc078', g: '#2a7a4a' }, rows: ['...oo...', '..oGGo..', '...og...', '..oooo..', '.obBBBo.', 'obBBBBBo', 'oBBBBBBo', '.oooooo.'] },
  // 獸肉：帶骨的肉塊（料理用）。
  meat: { palette: { o: O, M: '#c0503a', L: '#e88a6a', D: '#802a1e', W: '#f0e6d0' }, rows: ['.....oo.', '..oooWWo', '.oLLMoWo', 'oLMMMMo.', 'oMMMMDo.', 'oMMMDDo.', '.oDDDo..', '..ooo...'] },
  ...ticketArt(),
  ...gemArt(),
  ...homeMatArt(),
};

/**
 * 家園材料在地城中的掉落圖（以 hm-材料 命名）：綁成一小捆的材料，顏色依材料。
 * @returns {Record<string, {palette: Record<string, string>, rows: string[]}>} 材料圖。
 */
function homeMatArt() {
  const out = {};
  for (const m of HOME_MATS) {
    out[`hm-${m.key}`] = { palette: { o: O, M: m.color, L: mixHex(m.color, '#ffffff', 0.45), D: mixHex(m.color, '#000000', 0.35), R: '#8a5a2a' }, rows: ['..oooo..', '.oLLMMo.', 'oLMMMMDo', 'oRRRRRRo', 'oMMMMDDo', '.oMDDDo.', '..oooo..'] };
  }
  return out;
}

/**
 * 混合兩個 #rrggbb 顏色。
 * @param {string} a 顏色 a。
 * @param {string} b 顏色 b。
 * @param {number} t 比例（0 為 a、1 為 b）。
 * @returns {string} 混合後的顏色。
 */
function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * 寶石圖（每種寶石一張，以 gem-種類 命名）：切面的菱形寶石，顏色依種類。
 * @returns {Record<string, {palette: Record<string, string>, rows: string[]}>} 寶石圖。
 */
function gemArt() {
  const colors = {
    atk: ['#e04a5a', '#ff9aa8', '#8a1a2a'], hp: ['#3fae58', '#9af0aa', '#1a5a2a'], def: ['#3a7ae0', '#a8d0ff', '#1a3a7a'],
    spd: ['#e8c030', '#fff0a0', '#8a6a10'], leech: ['#a8243a', '#ff6a80', '#4a0a18'], shield: ['#c8d8f0', '#ffffff', '#6a7a9a'], ward: ['#a888e8', '#e8d8ff', '#4a2a8a'],
  };
  const out = {};
  for (const [kind, [m, l, d]] of Object.entries(colors)) {
    out[`gem-${kind}`] = { palette: { o: O, M: m, L: l, D: d }, rows: ['..oooo..', '.oLLMMo.', 'oLLMMMDo', 'oMMMMDDo', '.oMMDDo.', '..oMDo..', '...oo...'] };
  }
  return out;
}

/**
 * 取得道具圖。
 * @param {string} name 名稱。
 * @returns {HTMLCanvasElement} 畫布。
 */
export function itemArt(name) {
  const key = `i-${name}`;
  if (!cache.has(key)) cache.set(key, paint(ITEM_ART[name].rows, ITEM_ART[name].palette));
  return cache.get(key);
}

/**
 * 以 data URL 取得道具圖（介面中的 <img> 用）。
 * @param {string} name 名稱。
 * @param {number} [scale=4] 放大倍率。
 * @returns {string} data URL。
 */
export function itemDataUrl(name, scale = 4) {
  const src = itemArt(name);
  const c = makeCanvas(src.width * scale, src.height * scale);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}

/**
 * 以 data URL 取得角色圖（介面中的 <img> 用）；角色圖是 2 倍密度，實際放大倍率為 scale 的一半（至少 1 倍）。
 * @param {string} cls 職業。
 * @param {number} [scale=4] 相當於 16 像素一格的放大倍率。
 * @returns {string} data URL。
 */
export function heroDataUrl(cls, scale = 4) {
  const art = heroArt(cls);
  const src = art.portrait;
  const k = Math.max(1, Math.round(scale / art.density));
  const c = makeCanvas(src.width * k, src.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}

/**
 * 以 data URL 取得怪物或 Boss 圖（介面中的 <img> 用，例如地城入口的 Boss 頭像）。
 * @param {string} type 種類。
 * @param {number} [scale=3] 放大倍率。
 * @param {boolean} [evolved=false] 是否用進化 Boss 的配色。
 * @returns {string} data URL。
 */
export function monsterDataUrl(type, scale = 3, evolved = false) {
  const art = monsterArt(type, evolved);
  const src = art.frames[0];
  // 高密度的 Boss 圖：實際放大倍率為 scale 的一半（至少 1 倍）。
  const k = art.density ? Math.max(1, Math.round(scale / art.density)) : scale;
  const c = makeCanvas(src.width * k, src.height * k);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}
