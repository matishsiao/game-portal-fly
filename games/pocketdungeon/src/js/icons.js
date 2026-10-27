// 介面圖示（原創 SVG，24 × 24）：地城畫面的攻擊、閃避、藥水、淨化藥水、回城卷軸、暫停、主動寶石與 50 個技能按鈕。

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
  backstab: svg('<path d="M14 4l6 6-9 9-3 1 1-3z"/><path d="M4 20l3-3"/><circle cx="6" cy="6" r="2" stroke-dasharray="2 2"/>'),
  knives: svg('<path d="M4 20l9-9M13 11l3-1 1-3-3 1z"/><path d="M8 20l9-6M17 14l3 0 1-2-3 0z"/><path d="M3 15l10-10M13 5l3-2"/>'),
  smoke: svg('<path d="M6 17a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 17 8a4.5 4.5 0 0 1 1 9z"/><path d="M8 13h8M10 15.5h4"/>'),
  venomBlade: svg('<path d="M15 3l6 6-10 10-3 1 1-3z"/><path d="M5 15c-1.4 2-2 3.2-2 4.2a2 2 0 0 0 4 0c0-1-.6-2.2-2-4.2z"/>'),
  flurry: svg('<path d="M4 6l16 4M4 12l16 0M4 18l16-4"/><path d="M18 8l2 2-2 2"/>'),
  evasion: svg('<path d="M9 4a2 2 0 1 1 0 .1"/><path d="M8 21l2-6-3-3 2-5 4 3 3 1"/><path d="M14 12l-2 4 3 5"/><path d="M18 5l3 1M18 9l3 0"/>'),
  poisonTrap: svg('<path d="M3 17h18"/><path d="M5 17l2-7 2 4 3-7 3 7 2-4 2 7"/><circle cx="12" cy="20.5" r=".8" fill="currentColor"/>'),
  assassinate: svg('<path d="M5 19L19 5"/><path d="M15 5h4v4"/><path d="M5 13l6 6"/><path d="M7 4l2 2M4 7l2 2"/>'),
  shadowStrike: svg('<path d="M12 3l2 5 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" stroke-dasharray="3 1.5"/>'),
  shadowHaste: svg('<path d="M13 4l-6 8h5l-1 8 6-8h-5z"/><path d="M3 8h3M2 12h3M3 16h3"/>'),
  palm: svg('<path d="M8 20v-8l-2-4 1-1 3 3V4h2v6V3h2v7V4h2v7l1-3h2l-1 6-3 6z"/><path d="M19 15h3M18 19l2 1"/>'),
  healChi: svg('<path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="M12 9v6M9 12h6"/>'),
  goldenBell: svg('<path d="M12 3a6 6 0 0 1 6 6v5l2 3H4l2-3V9a6 6 0 0 1 6-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  tornadoKick: svg('<path d="M4 6h16M6 10h12M8 14h8M10 18h4"/><path d="M12 18v3"/>'),
  rejuvenate: svg('<path d="M12 21c-5-3-8-7-8-11 4 0 7 2 8 5 1-3 4-5 8-5 0 4-3 8-8 11z"/><path d="M12 15V5"/>'),
  earthFist: svg('<path d="M3 20h18"/><rect x="8" y="5" width="8" height="8" rx="2"/><path d="M10 13v3M14 13v3M5 17l2-2M19 17l-2-2"/>'),
  hundredFists: svg('<rect x="3" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="7" width="6" height="6" rx="1.5"/><rect x="6" y="14" width="6" height="6" rx="1.5"/>'),
  ironShirt: svg('<path d="M8 3l-5 3 2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z"/><path d="M9 14h6M9 17h6"/>'),
  chiWave: svg('<circle cx="6" cy="12" r="3"/><path d="M10 9c3 0 5 1 11 3-6 2-8 3-11 3"/><path d="M12 12h6"/>'),
  nirvana: svg('<path d="M12 3c2 3 2 5 0 8-2-3-2-5 0-8z"/><path d="M5 11c3 0 5 1 7 4 2-3 4-4 7-4-1 5-4 8-7 9-3-1-6-4-7-9z"/>'),
};

/**
 * 被動技能的圖示（依主要效果）：鍵為 PASSIVES 中 per 的第一個效果。
 */
export const PASSIVE_ICONS = {
  hpPct: svg('<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>'),
  atkPct: svg('<path d="M19 3l-9.5 9.5M19 3h-4M19 3v4"/><path d="M6 11l7 7M8.5 15.5L4 20"/><path d="M4 4l3 1M5 8l2-1" />'),
  shieldDefPct: svg('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'),
  spd: svg('<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 13h16a3 3 0 1 1-3 3"/><path d="M3 18h6"/>'),
  lowHpAtk: svg('<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>'),
  statusResist: svg('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M9 9.5l6 5M15 9.5l-6 5"/>'),
  execute: svg('<path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4 2.5 5v3h9v-3c1.3-1 2.5-2.5 2.5-5a7 7 0 0 0-7-7z"/><circle cx="9.5" cy="10.5" r="1.5"/><circle cx="14.5" cy="10.5" r="1.5"/><path d="M10 21h4"/>'),
  poisonProc: svg('<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z"/><path d="M9 14h6"/>'),
  interval: svg('<path d="M4 6h10M4 12h14M4 18h10"/><path d="M15 3l3 3-3 3M18 9l3 3-3 3"/>'),
  eliteDmg: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>'),
  skillCd: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l-2.5 2.5"/><path d="M5 4l-2 2M19 4l2 2"/>'),
  skillDmg: svg('<path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  dmgReduce: svg('<path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="M8 12h8"/>'),
  orbRadius: svg('<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10" stroke-dasharray="2 2"/>'),
  stunProc: svg('<path d="M12 4l1.5 3.5L17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5z"/><path d="M5 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM18 15l.8 1.6 1.6.8-1.6.8L18 20l-.8-1.6-1.6-.8 1.6-.8z"/>'),
  crit: svg('<path d="M12 2l3 6.5 7 1-5 4.8 1.2 7L12 18l-6.2 3.3 1.2-7-5-4.8 7-1z"/><path d="M12 8v5"/>'),
  critDmg: svg('<path d="M12 2l3 6.5 7 1-5 4.8 1.2 7L12 18l-6.2 3.3 1.2-7-5-4.8 7-1z"/><path d="M9.5 12h5M12 9.5v5"/>'),
  comboDmg: svg('<rect x="3" y="9" width="5" height="6" rx="1.5"/><rect x="9.5" y="9" width="5" height="6" rx="1.5"/><rect x="16" y="7" width="5" height="10" rx="1.5"/>'),
  healBoost: svg('<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/><path d="M12 9v6M9 12h6"/>'),
  regen: svg('<path d="M12 21c-5-3-8-7-8-11 4 0 7 2 8 5 1-3 4-5 8-5 0 4-3 8-8 11z"/><path d="M12 15V5"/>'),
};

/** 技能書技能沒有專屬圖示時，依技能類型借用的圖示。 */
const KIND_ICON = {
  bash: 'bash', charge: 'charge', buff: 'warcry', fissure: 'fissure', leech: 'bloodlust', storm: 'bladestorm', guard: 'guard', slam: 'quake', barrier: 'barrier',
  fan: 'spread', shot: 'venom', snipe: 'snipe', rain: 'rain', leap: 'leap', volley: 'volley', trap: 'trap', haste: 'windwalk', nova: 'nova', chain: 'chain',
  thunder: 'thunder', blink: 'blink', zone: 'hypnosis', freeze: 'timestop', shadowstep: 'backstab', smoke: 'smoke', imbue: 'venomBlade', heal: 'healChi',
  regen: 'rejuvenate', spin: 'whirl', meteor: 'meteor',
};

/**
 * 技能的圖示：有專屬圖示就用專屬的，否則依技能類型借用。
 * @param {string} id 技能代碼。
 * @param {string} kind 技能類型。
 * @returns {string} SVG。
 */
export function skillIcon(id, kind) {
  return ICONS[id] || ICONS[KIND_ICON[kind]] || ICONS.attack;
}

/**
 * 把頁面中所有 [data-icon] 元素填入對應圖示。
 * @param {ParentNode} root 範圍。
 */
export function fillIcons(root) {
  for (const el of root.querySelectorAll('[data-icon]')) el.innerHTML = ICONS[el.dataset.icon] || '';
}
