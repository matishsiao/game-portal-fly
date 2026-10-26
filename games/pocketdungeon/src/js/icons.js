// 介面圖示（原創 SVG，24 × 24）：地城畫面的攻擊、閃避、藥水、回城卷軸、暫停與 12 個技能按鈕。

/**
 * 以路徑資料組成 SVG 圖示。
 * @param {string} body SVG 內容。
 * @returns {string} SVG 字串。
 */
function svg(body) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

/** 圖示：鍵為圖示名稱（技能使用技能代碼）。 */
export const ICONS = {
  attack: svg('<path d="M19 3l-9.5 9.5M19 3h-4M19 3v4"/><path d="M6 11l7 7M8.5 15.5L4 20" stroke-width="2.4"/>'),
  dodge: svg('<path d="M4 15c3 0 4-6 8-6s4 4 8 4"/><path d="M4 19c4 0 5-3 8-3"/><circle cx="17" cy="6" r="2" fill="currentColor"/>'),
  potion: svg('<path d="M10 3h4M10.5 3v5L6 15a4 4 0 0 0 3.4 6h5.2A4 4 0 0 0 18 15l-4.5-7V3"/><path d="M7.5 15h9" /><circle cx="11" cy="17.5" r="1" fill="currentColor"/>'),
  scroll: svg('<path d="M6 4h11a2 2 0 0 1 2 2v1h-3"/><path d="M8 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9"/><path d="M10 9h5M10 12.5h5M10 16h3"/>'),
  pause: svg('<path d="M9 5v14M15 5v14" stroke-width="3"/>'),
  whirl: svg('<path d="M12 4a8 8 0 1 1-7.5 5.2"/><path d="M4.5 4.5v4.7h4.7"/><path d="M12 9a3 3 0 1 1-2.6 1.5"/>'),
  charge: svg('<path d="M4 6l6 6-6 6M11 6l6 6-6 6"/><path d="M18 5v14"/>'),
  warcry: svg('<path d="M5 9h3l5-4v14l-5-4H5z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  quake: svg('<path d="M3 18h18"/><path d="M12 18l-2-4 3-3-2-4"/><path d="M6 14l-2-3M18 14l2-3"/><path d="M12 3v1"/>'),
  spread: svg('<path d="M5 19L19 5M5 19l4-13M5 19l13-4"/><path d="M19 5h-3M19 5v3"/>'),
  leap: svg('<path d="M20 12H8M11 8l-4 4 4 4"/><path d="M4 5v14"/>'),
  rain: svg('<path d="M6 3v8M12 3v10M18 3v8"/><path d="M4 9l2 2 2-2M10 11l2 2 2-2M16 9l2 2 2-2"/><path d="M4 20h16"/>'),
  snipe: svg('<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  nova: svg('<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M10 5l2 2 2-2M10 19l2-2 2 2"/>'),
  blink: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.6 1.6 1.6.6-1.6.6L19 20.4l-.6-1.6-1.6-.6 1.6-.6z"/>'),
  chain: svg('<path d="M13 2L5 13h6l-1 9 8-11h-6z"/>'),
  meteor: svg('<circle cx="15" cy="15" r="5"/><path d="M11 11L3 3M13.5 9.5L8 4M9.5 13.5L4 8"/>'),
};

/**
 * 把頁面中所有 [data-icon] 元素填入對應圖示。
 * @param {ParentNode} root 範圍。
 */
export function fillIcons(root) {
  for (const el of root.querySelectorAll('[data-icon]')) el.innerHTML = ICONS[el.dataset.icon] || '';
}
