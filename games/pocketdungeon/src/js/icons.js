// 介面圖示（原創 SVG，24 × 24）：地城畫面的攻擊、閃避、藥水、淨化藥水、回城卷軸、暫停、主動寶石與 30 個技能按鈕。

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
  attack: svg('<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
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
  cure: svg('<path d="M10 3h4M10.5 3v4.5L6 15a4 4 0 0 0 3.4 6h5.2A4 4 0 0 0 18 15l-4.5-7.5V3"/><path d="M12 12v6M9 15h6"/>'),
  shield: svg('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M12 8v8M8.5 12h7"/>'),
  ward: svg('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M9 9.5l6 5M15 9.5l-6 5"/>'),
  bash: svg('<path d="M9 4l6 2.5v4.5c0 3.8-2.4 6.3-6 7.8-3.6-1.5-6-4-6-7.8V6.5z"/><path d="M17 8l4-2M17.5 12H22M17 16l4 2"/>'),
  guard: svg('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M12 6.5v11M7.5 10h9"/>'),
  fissure: svg('<path d="M3 20h18"/><path d="M5 20l3-5 2 2 3-6 2 3 4-8"/><path d="M19 6v3h-3"/>'),
  bloodlust: svg('<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>'),
  bladestorm: svg('<path d="M12 12l7-7M12 12l-7 7M12 12l7 7M12 12l-7-7"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>'),
  avatar: svg('<path d="M4 9l4 3 4-7 4 7 4-3-2 10H6z"/><path d="M6 21h12"/>'),
  venom: svg('<path d="M4 20L16 8M16 8h-4M16 8v4"/><path d="M19 3c1.4 2 2 3.2 2 4.2a2 2 0 0 1-4 0c0-1 .6-2.2 2-4.2z"/>'),
  lullaby: svg('<path d="M4 20L15 9M15 9h-4M15 9v4"/><path d="M15 3h5l-5 5h5"/>'),
  volley: svg('<path d="M3 7h12M3 12h15M3 17h12"/><path d="M12 4l3 3-3 3M15 9l3 3-3 3M12 14l3 3-3 3"/>'),
  trap: svg('<path d="M3 17h18"/><path d="M5 17l2-7 2 4 3-7 3 7 2-4 2 7"/>'),
  starfall: svg('<path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5z"/><path d="M5 15v5M12 16v5M19 15v5"/>'),
  windwalk: svg('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 13h16a3 3 0 1 1-3 3"/><path d="M3 18h6"/>'),
  fireball: svg('<circle cx="14" cy="14" r="6"/><path d="M9.5 9.5C7 7 6 4 6 4s3 .5 5.5 3M8 13c-3-.5-5-2-5-2s2.5-1 5.5-.5"/>'),
  hypnosis: svg('<path d="M12 12m-1.5 0a1.5 1.5 0 1 0 3 0 3.5 3.5 0 1 0-7 0 5.5 5.5 0 1 0 11 0 7.5 7.5 0 1 0-15 0"/>'),
  miasma: svg('<path d="M6 17a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 17 8a4.5 4.5 0 0 1 1 9z"/><circle cx="9" cy="20.5" r=".8" fill="currentColor"/><circle cx="14" cy="21" r=".8" fill="currentColor"/>'),
  barrier: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7l1.3 3.2L16.5 11l-3.2 1.3L12 15.5l-1.3-3.2L7.5 11l3.2-.8z"/>'),
  thunder: svg('<path d="M6 10a4 4 0 0 1 1-7.8A5 5 0 0 1 16 3a3.5 3.5 0 0 1 2 6.8"/><path d="M12 9l-3 6h4l-2 6"/>'),
  timestop: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6M12 2v3"/>'),
};

/**
 * 把頁面中所有 [data-icon] 元素填入對應圖示。
 * @param {ParentNode} root 範圍。
 */
export function fillIcons(root) {
  for (const el of root.querySelectorAll('[data-icon]')) el.innerHTML = ICONS[el.dataset.icon] || '';
}
