// 像素圖資料（全部原創）：以字元陣列描述，每個字元對應調色盤中的一個顏色，'.' 為透明。
// 角色有站立與左右腳交替的走路幀；怪物有 2 幀；Boss 以 2 倍大小繪製。

/** 共用顏色。 */
const O = '#1a1020';

/**
 * 職業圖（16 × 20）：上半身與頭部共用，下半身有站立、抬左腳、抬右腳三種姿勢；走路時依 抬左腳 → 站立 → 抬右腳 → 站立 循環。
 * 法師穿長袍，下半身以袍擺與露出的鞋子表現。
 * @type {Record<string, {palette: Record<string, string>, top: string[]}>}
 */
const BODY = {
  warrior: {
    palette: { o: O, H: '#b8c0cc', h: '#eef2f8', d: '#7a8496', s: '#f2c9a0', S: '#c8946a', e: O, R: '#b23a48', r: '#7e2232', a: '#e8b84a', m: '#8a92a2', K: '#5a3a22', P: '#4a3a5a', p: '#33283f', B: '#5a3a22', b: '#8a5a34' },
    top: [
      '................',
      '....oooooooo....',
      '...ohhHHHHHdo...',
      '...ohHHHHHHdo...',
      '...oddddddddo...',
      '...osesssesSo...',
      '...osssssssSo...',
      '....oSSSSSSo....',
      '..ohHoRRRRoHdo..',
      '..oddoRRRRoddo..',
      '..omoRRaaRRomo..',
      '..omorRRRRromo..',
      '..osoKKaKKKoso..',
      '...oorrrrrroo...',
    ],
  },
  archer: {
    palette: { o: O, G: '#3f8f4a', g: '#7cc46a', n: '#2a5e33', s: '#f2c9a0', S: '#c8946a', e: O, T: '#8a5a2a', t: '#b07a3e', K: '#4a2a14', a: '#e8b84a', P: '#3a4a2a', p: '#2a3420', B: '#5a3a22', b: '#8a5a34' },
    top: [
      '................',
      '.....oooooo.....',
      '....ogGGGGGo....',
      '...ogGGGGGGno...',
      '...oGGsssssno...',
      '...oGsessesno...',
      '...oGssssSSno...',
      '....onSSSSno....',
      '...oGGTTTTGGo...',
      '..ognTTKTTTngo..',
      '..osoTTTKTToso..',
      '..osotTTTKToso..',
      '..osoKKaKKKoso..',
      '...ooTTTTTToo...',
    ],
  },
  mage: {
    palette: { o: O, P: '#5b3a8f', p: '#8a6ac8', q: '#3a2462', a: '#e8b84a', s: '#f2c9a0', S: '#c8946a', e: O, B: '#3a2a1a', b: '#5a4030' },
    top: [
      '.......oo.......',
      '......oPPo......',
      '.....oPpPqo.....',
      '.....oPPPqo.....',
      '....oaaaaaao....',
      '..ooPPPPPPPPoo..',
      '...oosesseSoo...',
      '....osssSSo.....',
      '...oPPPaaPPPo...',
      '..opPPPaPPPPqo..',
      '..osoPPaPPPoso..',
      '..ooPPPaPPPqoo..',
      '...oPPPaPPPqo...',
      '...opPPaPPPqo...',
      '..opPPPaPPPPqo..',
      '..oPPPPaPPPPqo..',
    ],
  },
};

/** 側面出手：只替換上半身的幾列（列索引 → 新內容），手臂朝右伸出；面向左時整張翻轉。 */
const ATTACK_ROWS = {
  warrior: {
    9: '..oddoRRRRoddoo.',
    10: '..omoRRaaRRmmmso',
    11: '..omorRRRRroooo.',
    12: '..osoKKaKKKo....',
  },
  archer: {
    9: '..ognTTKTTTnooo.',
    10: '..osoTTTKTTssso.',
    11: '..osotTTTKToooo.',
    12: '..osoKKaKKKo....',
  },
  mage: {
    10: '..osoPPaPPPpsso.',
    11: '..ooPPPaPPPqooo.',
  },
};

/** 朝下出手（正面，雙手握在胸前）。 */
const ATTACK_DOWN = {
  warrior: {
    10: '...omRRaaRRmo...',
    11: '...omrRRRRrmo...',
    12: '...oKKssssKKo...',
  },
  archer: {
    10: '...osTTTKTTso...',
    11: '...ootTTTKToo...',
    12: '...oKKssssKKo...',
  },
  mage: {
    10: '...ooPPaPPPoo...',
    11: '...oPPssssPqo...',
  },
};

/** 朝上出手（背影，雙手舉起）。 */
const ATTACK_UP = {
  warrior: {
    5: '...oHHHHHHHdo...',
    6: '...odHHHHHHdo...',
    7: '....oddddddo....',
    8: '.sohHoRRRRoHdos.',
    10: '...oRRRRRRRRo...',
    11: '...orRRRRRRro...',
    12: '...oKKKKKKKKo...',
  },
  archer: {
    4: '...oGGGGGGGno...',
    5: '...oGGGGGGGno...',
    6: '...oGGGGGGnno...',
    7: '....onnnnnno....',
    8: '.sooGGTTTTGGoos.',
    10: '...oTTTKTTTTo...',
    11: '...otTTTTKTTo...',
    12: '...oKKKKKKKKo...',
  },
  mage: {
    6: '...ooqqqqqqoo...',
    7: '....oqqqqqo.....',
    8: '...oPPPPPPPPo...',
    9: '.sopPPPPPPPPqos.',
    10: '..ooPPPPPPPPoo..',
    11: '..ooPPPPPPPqoo..',
    12: '...oPPPPPPPqo...',
    13: '...opPPPPPPqo...',
    14: '..opPPPPPPPPqo..',
    15: '..oPPPPPPPPPqo..',
  },
};

/** 一般職業的下半身（褲子與靴子）：站立、抬左腳、抬右腳。 */
const LEGS = {
  stand: [
    '...oPPPPPPPPo...',
    '...oPPpooPPpo...',
    '...oPPpooPPpo...',
    '...obBBoobBBo...',
    '...oBBBooBBBo...',
    '...oooo..oooo...',
  ],
  left: [
    '...oPPPPPPPPo...',
    '...oPPpooPPpo...',
    '...obBBooPPpo...',
    '...oBBBoobBBo...',
    '...ooooooBBBo...',
    '........ooooo...',
  ],
  right: [
    '...oPPPPPPPPo...',
    '...oPPpooPPpo...',
    '...oPPpoobBBo...',
    '...obBBooBBBo...',
    '...oBBBoooooo...',
    '...ooooo........',
  ],
};

/** 法師的下半身（袍擺與鞋子）：站立、左腳在前、右腳在前。 */
const ROBE = {
  stand: [
    '..oqqqqqqqqqqo..',
    '...oBBo..oBBo...',
    '...oooo..oooo...',
  ],
  left: [
    '.oqqqqqqqqqqo...',
    '..oBBo...oBo....',
    '..oooo...ooo....',
  ],
  right: [
    '...oqqqqqqqqqqo.',
    '....oBo...oBBo..',
    '....ooo...oooo..',
  ],
};

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
 * 取得角色圖（含受傷閃白的版本）：frames 依序為站立、抬左腳、抬右腳、側面出手、朝下出手、朝上出手。
 * @param {string} cls 職業。
 * @returns {{frames: HTMLCanvasElement[], flash: HTMLCanvasElement[], scale: number, alpha: number}} 圖。
 */
export function heroArt(cls) {
  const key = `hero-${cls}`;
  if (!cache.has(key)) {
    const b = BODY[cls];
    const legs = cls === 'mage' ? ROBE : LEGS;
    const frames = ['stand', 'left', 'right'].map((k) => b.top.concat(legs[k]));
    for (const pose of [ATTACK_ROWS, ATTACK_DOWN, ATTACK_UP]) frames.push(b.top.map((row, i) => pose[cls][i] || row).concat(legs.stand));
    cache.set(key, {
      frames: frames.map((r) => paint(r, b.palette)),
      flash: frames.map((r) => paint(r, b.palette, '#ffffff')),
      scale: 1,
      alpha: 1,
    });
  }
  return cache.get(key);
}

/**
 * 取得怪物或 Boss 圖；進化 Boss 使用專屬的進化配色（evolvedPalette）。
 * @param {string} type 種類。
 * @param {boolean} [evolved=false] 是否為進化 Boss。
 * @returns {{frames: HTMLCanvasElement[], flash: HTMLCanvasElement[], scale: number, alpha: number}} 圖。
 */
export function monsterArt(type, evolved = false) {
  const a = MONSTER_ART[type];
  const useEvo = evolved && !!a.evolvedPalette;
  const key = `m-${type}${useEvo ? '-evo' : ''}`;
  if (!cache.has(key)) {
    const palette = useEvo ? a.evolvedPalette : a.palette;
    cache.set(key, {
      frames: a.frames.map((r) => paint(r, palette)),
      flash: a.frames.map((r) => paint(r, palette, '#ffffff')),
      scale: a.scale || 1,
      alpha: a.alpha || 1,
    });
  }
  return cache.get(key);
}

/** 道具圖：金幣、藥水、裝備袋、寶箱（關、開）、鑰匙、盾牌、劍（首頁裝飾）。 */
export const ITEM_ART = {
  coin: { palette: { o: '#7a5a1a', Y: '#e8b84a', y: '#fff0a0' }, rows: ['.oooo.', 'oYyYYo', 'oyYYYo', 'oYYYYo', 'oYYYYo', '.oooo.'] },
  potion: { palette: { o: O, C: '#c8b8a0', R: '#e04a5a', r: '#ff9aa8' }, rows: ['..oo..', '..CC..', '.oRRo.', 'oRrRRo', 'oRRRRo', '.oooo.'] },
  bag: { palette: { o: O, B: '#a07a4a', b: '#d8b080', X: '#ffffff' }, rows: ['..oo..', '.oXXo.', '.oBBo.', 'oBbBBo', 'oBBBBo', '.oooo.'] },
  chest: { palette: { o: O, W: '#8a5a2a', w: '#b8844a', Y: '#e8b84a' }, rows: ['.oooooooooo.', 'oWwWWWWWWwWo', 'oWWWWYYWWWWo', 'ooooooYYoooo', 'oWWWWYYWWWWo', 'oWwWWWWWWwWo', 'oooooooooooo'] },
  chestOpen: { palette: { o: O, W: '#8a5a2a', w: '#b8844a', Y: '#e8b84a', D: '#2a1810' }, rows: ['.oooooooooo.', 'oDDDDDDDDDDo', 'oooooooooooo', 'oWWWWWWWWWWo', 'oWwWWWWWWwWo', 'oooooooooooo'] },
  pouch: { palette: { o: O, B: '#c88a2a', b: '#f0c860', R: '#9e2a3a' }, rows: ['..oooo..', '.oRRRRo.', '..oBBo..', '.oBbBBo.', 'oBbBBBBo', 'oBBBBBBo', 'oBBBBBBo', '.oooooo.'] },
  key: { palette: { o: O, Y: '#e8b84a' }, rows: ['.ooo......', 'oYYYo.....', 'oYoYoooooo', 'oYYYYYYYYo', '.ooo.oYoYo', '.....o.o.o'] },
  shield: { palette: { o: O, S: '#9aa3b5', R: '#9e2a3a', Y: '#e8b84a' }, rows: ['oooooooo', 'oSSSSSSo', 'oSRRRRSo', 'oSRYYRSo', 'oSRRRRSo', '.oSRRSo.', '..oSSo..', '...oo...'] },
  sword: { palette: { o: O, S: '#f0f0f0', D: '#9aa3b5', G: '#e8b84a', B: '#6b4226' }, rows: ['......oo', '.....oSo', '....oSDo', '.o.oSDo.', '.oGSDo..', '..oGo...', '.oBoGo..', 'oBo.oo..'] },
};

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
 * 以 data URL 取得角色圖（介面中的 <img> 用）。
 * @param {string} cls 職業。
 * @param {number} [scale=4] 放大倍率。
 * @returns {string} data URL。
 */
export function heroDataUrl(cls, scale = 4) {
  const src = heroArt(cls).frames[0];
  const c = makeCanvas(src.width * scale, src.height * scale);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL();
}
