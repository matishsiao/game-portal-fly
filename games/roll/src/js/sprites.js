// 原創圖案：角色為 16 × 16 像素畫的小精靈「滾滾」；物件與地形為向量圖（viewBox 0 0 100 100）。
// 除了顏色，每種物件都有可辨識的形狀或花紋。

/**
 * 包成完整的 SVG 標記。
 * @param {string} body SVG 內容。
 * @returns {string} SVG 字串。
 */
function svg(body) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;
}

/** 像素畫調色盤：K 外框、Y 身體、O 身體陰影、H 亮面、W 眼睛反光、P 腮紅、G／g 嫩葉。 */
export const PIXEL_PALETTE = { K: '#2b2140', Y: '#ffcf4a', O: '#f0a030', H: '#fff3b3', W: '#ffffff', P: '#ff8fa3', G: '#5cb85c', g: '#2e7d32' };

/** 滾滾（小精靈）的 16 × 16 像素畫：平常、開心、暈眩。 */
export const PLAYER_PIXELS = {
  normal: [
    '....gGG..GGg....',
    '......gGGg......',
    '.....KKKKKK.....',
    '...KKYYYYYYKK...',
    '..KYHHYYYYYYYK..',
    '.KYHHYYYYYYYYYK.',
    '.KYHWKYYYYWKYYK.',
    'KYYYKKYYYYKKYYYK',
    'KYYYKKYYYYKKYYYK',
    'KYPPYYYYYYYYPPYK',
    'KYYYYYKYYKYYYYYK',
    '.KOYYYYKKYYYYOK.',
    '.KOOYYYYYYYYOOK.',
    '..KKOOOOOOOOKK..',
    '...KYYK..KYYK...',
    '...KKKK..KKKK...',
  ],
  happy: [
    '....gGG..GGg....',
    '......gGGg......',
    '.....KKKKKK.....',
    '...KKYYYYYYKK...',
    '..KYHHYYYYYYYK..',
    '.KYHHYYYYYYYYYK.',
    '.KYHYYYYYYYYYYK.',
    'KYYYYKYYYYKYYYYK',
    'KYYYKYKYYKYKYYYK',
    'KYPPYYYYYYYYPPYK',
    'KYYYYYKYYKYYYYYK',
    '.KOYYYYKKYYYYOK.',
    '.KOOYYYYYYYYOOK.',
    '..KKOOOOOOOOKK..',
    '...KYYK..KYYK...',
    '...KKKK..KKKK...',
  ],
  dizzy: [
    '....gGG..GGg....',
    '......gGGg......',
    '.....KKKKKK.....',
    '...KKYYYYYYKK...',
    '..KYHHYYYYYYYK..',
    '.KYHHYYYYYYYYYK.',
    '.KYKYKYYYYKYKYK.',
    'KYYYKYYYYYYKYYYK',
    'KYYKYKYYYYKYKYYK',
    'KYPPYYYYYYYYPPYK',
    'KYYYYYYKKYYYYYYK',
    '.KOYYYYKKYYYYOK.',
    '.KOOYYYYYYYYOOK.',
    '..KKOOOOOOOOKK..',
    '...KYYK..KYYK...',
    '...KKKK..KKKK...',
  ],
};

/**
 * 把像素畫轉成 SVG：同一列相鄰的同色像素合併成一個矩形，並保持銳利的像素邊緣。
 * @param {string[]} grid 16 列的像素字串，「.」為透明。
 * @returns {string} SVG 字串。
 */
export function pixelSvg(grid) {
  let rects = '';
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      if (PIXEL_PALETTE[ch]) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${PIXEL_PALETTE[ch]}"/>`;
      x = end;
    }
  });
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

/** 各圖案的 SVG。 */
export const SPRITES = {
  player: pixelSvg(PLAYER_PIXELS.normal),
  playerHappy: pixelSvg(PLAYER_PIXELS.happy),
  playerDizzy: pixelSvg(PLAYER_PIXELS.dizzy),
  box: svg(
    '<rect x="6" y="6" width="88" height="88" rx="6" fill="#c8894a" stroke="#7a4b1e" stroke-width="6"/>' +
      '<path d="M14 14 L86 86 M86 14 L14 86" stroke="#8f5a2b" stroke-width="8"/>' +
      '<rect x="6" y="6" width="88" height="88" rx="6" fill="none" stroke="#7a4b1e" stroke-width="6"/>',
  ),
  stone: svg(
    '<path d="M14 72 Q6 40 30 20 Q52 6 74 18 Q96 34 90 66 Q84 92 50 92 Q22 92 14 72Z" fill="#8a9099" stroke="#4d5259" stroke-width="5"/>' +
      '<path d="M42 30 L50 48 L40 62" stroke="#4d5259" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="66" cy="34" rx="9" ry="5" fill="#fff" opacity=".35"/>',
  ),
  ice: svg(
    '<rect x="6" y="6" width="88" height="88" rx="10" fill="#bfeaff" fill-opacity=".9" stroke="#4aa9d9" stroke-width="5"/>' +
      '<path d="M22 30 L40 18 M22 50 L56 24 M60 80 L80 66" stroke="#fff" stroke-width="7" stroke-linecap="round"/>',
  ),
  balloon: svg(
    '<path d="M50 70 Q46 82 52 96" stroke="#555" stroke-width="3" fill="none"/>' +
      '<ellipse cx="50" cy="38" rx="30" ry="34" fill="#ef4f5f" stroke="#a8222f" stroke-width="5"/>' +
      '<path d="M44 72 L56 72 L50 64Z" fill="#a8222f"/><ellipse cx="38" cy="26" rx="8" ry="11" fill="#fff" opacity=".45"/>',
  ),
  ladder: svg(
    '<path d="M24 0 V100 M76 0 V100" stroke="#9b6a3a" stroke-width="9"/>' +
      '<path d="M24 18 H76 M24 50 H76 M24 82 H76" stroke="#b9854f" stroke-width="8"/>',
  ),
  water: svg(
    '<rect width="100" height="100" fill="#29b6ff" fill-opacity=".55"/>' +
      '<path d="M0 16 Q12 6 25 16 T50 16 T75 16 T100 16" stroke="#e6f6ff" stroke-width="5" fill="none"/>',
  ),
  goal: svg(
    '<path d="M30 92 V10" stroke="#5b4636" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M33 12 L82 26 L33 42Z" fill="#ff5a5f" stroke="#c0393e" stroke-width="4" stroke-linejoin="round"/>' +
      '<ellipse cx="30" cy="94" rx="16" ry="4" fill="#000" opacity=".2"/>',
  ),
  crumble: svg(
    '<rect width="100" height="100" fill="#d9a45e"/>' +
      '<path d="M0 33 H100 M0 66 H100 M33 0 V33 M70 33 V66 M40 66 V100" stroke="#9c6a2c" stroke-width="5"/>' +
      '<path d="M48 8 L58 26 L50 40 L62 58 L54 74" stroke="#5c3a12" stroke-width="5" fill="none" stroke-linecap="round"/>',
  ),
  spring: svg(
    '<rect x="8" y="80" width="84" height="16" rx="4" fill="#7c8590"/>' +
      '<path d="M20 78 L80 66 L20 54 L80 42 L20 30 L80 18" stroke="#e9eef2" stroke-width="7" fill="none" stroke-linejoin="round"/>' +
      '<path d="M20 78 L80 66 L20 54 L80 42 L20 30 L80 18" stroke="#5a6470" stroke-width="3" fill="none" stroke-linejoin="round"/>' +
      '<rect x="10" y="6" width="80" height="12" rx="4" fill="#ff7a3d"/>',
  ),
};
