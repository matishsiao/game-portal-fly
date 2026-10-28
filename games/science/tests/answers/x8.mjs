// 國中八年級 expert-301～expert-430 計算題的答案驗證函式：以公式或列舉實際算出正解選項文字。

/** 數值格式化：最多兩位小數。 */
const fmt = (x) => String(Number(x.toFixed(2)));
/** 把整數轉成下標數字（化學式用）。 */
const sub = (k) => String(k).split('').map((d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]).join('');

export default {
  'expert-301': () => `${fmt(54 / 20)} g/cm³`,
  'expert-302': () => `${fmt(39 / (45 - 30))} g/cm³`,
  'expert-307': () => `${fmt(40 / 0.8)} cm³`,
  'expert-313': () => `${fmt(20 / (20 + 80) * 100)}%`,
  'expert-314': () => `${fmt(200 * 10 / 100)} g`,
  'expert-322': () => { const atom = { protons: 11, neutrons: 12 }; return String(atom.protons); },
  'expert-323': () => `${3 * 2} 個`,
  'expert-324': () => String(12 * 1 + 16 * 2),
  'expert-331': () => `${fmt(5 * 2)} m/s`,
  'expert-332': () => `${340 * 2 / 2} m`,
  'expert-333': () => `${fmt(1 / 0.5)} Hz`,
  'expert-341': () => `${90 - 30}°`,
  'expert-342': () => `${2 * 2} m`,
  'expert-361': () => `${200 * 1 * (30 - 20)} cal`,
  'expert-362': () => `${fmt(220 / (100 * 10))} cal/(g·°C)`,
  'expert-363': () => { const T = (100 * 80 + 200 * 20) / (100 + 200); return `${fmt(T)}°C`; },
  'expert-376': () => `${40 - 24} g`,
  'expert-377': () => `${fmt(36 / 18)} 莫耳`,
  'expert-378': () => { for (let n = 1; n <= 9; n++) if (n * 2 === 2 * 2 && 2 === 2 * 1) return `填 ${n}`; return null; },
  'expert-394': () => `${20 * (30 / 10)} mL`,
  'expert-406': () => `${fmt(60 / 20)} mL`,
  'expert-407': () => { const a = 45 / 30, b = 40 / 20; return a > b ? '甲組' : b > a ? '乙組' : '兩組一樣快'; },
  'expert-414': () => { const n = 3; return `C${sub(n)}H${sub(2 * n + 2)}`; },
  'expert-415': () => { let h = 0; for (const m of 'C2H5OH'.matchAll(/([A-Z][a-z]?)(\d*)/g)) if (m[1] === 'H') h += Number(m[2] || 1); return `${h} 個`; },
  'expert-421': () => `${fmt(600 / 30)} gw/cm²`,
  'expert-422': () => `${50 - 30} gw`,
  'expert-423': () => `${fmt(40 * 1)} gw`,
};
