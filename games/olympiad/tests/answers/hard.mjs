// 高級新題的獨立驗算：以列舉或模擬算出正解選項文字。

export default {
  'hard-011': () => { let a = 1; for (let i = 1; i < 20; i++) a += i; return String(a); },
  'hard-012': () => { const s = [3, 4]; while (s.length < 7) s.push(s[s.length - 1] + s[s.length - 2]); return String(s[6]); },
  'hard-013': () => { const n = 20; return `${n}/${n + 1}`; },
  'hard-014': () => { let a = 4; for (let i = 2; i <= 50; i++) a += 3; return String(a); },
  'hard-015': () => { const s = [2]; let d = 1; while (s.length < 7) { s.push(s[s.length - 1] + d); d *= 2; } return String(s[6]); },
  'hard-016': () => { let s = 0; for (let i = 2; i <= 60; i += 2) s += i; return String(s); },
  'hard-017': () => {
      const g = (a, b) => (b ? g(b, a % b) : a);
      let p = 1; let q = 1;
      for (let k = 2; k <= 20; k++) { p *= k - 1; q *= k; const r = g(p, q); p /= r; q /= r; }
      return `${p}/${q}`;
    },
  'hard-018': () => String([19, 199, 1999, 19999, 199999].reduce((s, x) => s + x, 0)),
  'hard-019': () => String(999 * 222 + 333 * 334),
  'hard-020': () => { let n = 0; for (let x = 0; x < 120; x += 6) n++; return `${n} 棵`; },
  'hard-021': () => { let n = 0; for (let x = 8; x < 80; x += 8) n++; return `${n} 棵`; },
  'hard-022': () => `${(15 / (6 - 1)) * (11 - 1)} 分鐘`,
  'hard-023': () => `${(48 / (4 - 1)) * (10 - 1)} 秒`,
  'hard-024': () => { const L = (31 - 1) * 4; let n = 0; for (let x = 0; x <= L; x += 4) if (x % 5 === 0) n++; return `${n} 棵`; },
  'hard-025': () => { for (let r = 0; r <= 30; r++) if (r * 4 + (30 - r) * 2 === 84) return `${r} 隻`; return ''; },
  'hard-026': () => { for (let p = 0; p <= 20; p++) if (2 * p - 5 * (20 - p) === 5) return `${p} 枝`; return ''; },
  'hard-027': () => { for (let t = 0; t <= 20; t++) if (t * 3 + (20 - t) * 2 === 47) return `${t} 輛`; return ''; },
  'hard-028': () => { for (let h = 0; h <= 24; h++) if (h * 50 + (24 - h) * 10 === 640) return `${h} 枚`; return ''; },
  'hard-029': () => {
      for (let s = 0; s <= 18; s++) for (let d = 0; s + d <= 18; d++) {
        const c = 18 - s - d;
        if (8 * s + 6 * d + 6 * c === 118 && 2 * d + c === 20) return `${d} 隻`;
      }
      return '';
    },
  'hard-030': () => { for (let x = 0; x < 100; x++) if (40 + x === 2 * (12 + x)) return `${x} 年後`; return ''; },
  'hard-031': () => { for (let d = 1; d < 48; d++) { const m = 48 - d; if (m - 4 === 4 * (d - 4)) return `${d} 歲`; } return ''; },
  'hard-032': () => {
      for (let g = 1; g < 40; g++) for (let y = 0; y < g; y++) {
        const d = g - y;
        if (y - d === 3 && g + d === 18) return `${g} 歲`;
      }
      return '';
    },
  'hard-033': () => { for (let x = 0; x < 100; x++) if (36 + 3 * x === 66 + x) return `${x} 年後`; return ''; },
  'hard-034': () => { for (let b = 1; b < 60; b++) if ((b + 6 + 3) * 2 === (b + 3) * 3) return `${b} 歲`; return ''; },
  'hard-035': () => { for (let b = 0; b <= 120; b++) if (2 * b + b + b + 20 === 120) return String(2 * b); return ''; },
  'hard-036': () => { for (let m = 0; m <= 28; m++) if (52 + m === 3 * (28 - m)) return `${m} 本`; return ''; },
  'hard-037': () => { for (let m = 5; m <= 640; m += 5) { const h = (m / 5) * 3; if (m + h === 640) return `${m - h} 元`; } return ''; },
  'hard-038': () => { for (let L = 6; L <= 300; L += 6) if (L - L / 3 - 12 === L / 2) return `${L} 公尺`; return ''; },
  'hard-039': () => { for (let b = 1; b <= 500; b++) if (4 * b - 70 === b + 50) return `${4 * b} 公斤`; return ''; },
  'hard-040': () => { for (let y = 1; y < 500; y++) if (2 * y - 15 === y + 15) return `${3 * y} 張`; return ''; },
  'hard-041': () => { for (let n = 1; n < 100; n++) if (5 * n + 12 === 7 * n - 4) return `${5 * n + 12} 顆`; return ''; },
  'hard-042': () => { const c = [1, 5, 10, 50]; const s = new Set(); for (let m = 1; m < 16; m++) { let t = 0; c.forEach((v, i) => { if (m & (1 << i)) t += v; }); s.add(t); } return `${s.size} 種`; },
  'hard-043': () => {
      let n = 0;
      const perm = (arr, rest) => {
        if (!rest.length) { if (Math.abs(arr.indexOf(0) - arr.indexOf(1)) === 1) n++; return; }
        rest.forEach((x, i) => perm([...arr, x], rest.filter((_, j) => j !== i)));
      };
      perm([], [0, 1, 2, 3, 4, 5]);
      return `${n} 種`;
    },
  'hard-044': () => { let n = 0; for (let x = 1; x <= 200; x++) if (String(x).includes('7')) n++; return `${n} 個`; },
  'hard-045': () => { let n = 0; for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if (a !== b) n++; return `${n} 種`; },
  'hard-046': () => { let n = 0; for (let d = 1; d <= 72; d++) if (72 % d === 0) n++; return `${n} 個`; },
  'hard-047': () => { let n = 0; for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) if ((a + b + c) % 2 === 0) n++; return `${n} 種`; },
  'hard-048': () => { let n = 0; for (let x = 100; x <= 999; x++) if ([...String(x)].reduce((s, d) => s + Number(d), 0) === 5) n++; return `${n} 個`; },
  'hard-049': () => {
      const names = ['甲', '乙', '丙', '丁']; const res = new Set();
      const perm = (arr, rest) => {
        if (!rest.length) {
          const r = (x) => arr.indexOf(x);
          if (r(0) !== 0 && r(0) !== 3 && r(2) < r(0) && r(0) < r(3) && r(3) !== 3) res.add(names[arr[2]]);
          return;
        }
        rest.forEach((x, i) => perm([...arr, x], rest.filter((_, j) => j !== i)));
      };
      perm([], [0, 1, 2, 3]);
      return res.size === 1 ? [...res][0] : '';
    },
  'hard-050': () => {
      const boxes = ['紅盒子', '藍盒子', '綠盒子']; const ok = [];
      for (let p = 0; p < 3; p++) { const t = [p === 0, p !== 1, p !== 0].filter(Boolean).length; if (t === 1) ok.push(boxes[p]); }
      return ok.length === 1 ? ok[0] : '無法判斷';
    },
  'hard-051': () => {
      const names = ['甲', '乙', '丙', '丁']; const ok = [];
      for (let x = 0; x < 4; x++) { const s1 = x === 1; const s2 = x === 3; const s3 = x !== 2; const s4 = !s2; if ([s1, s2, s3, s4].filter(Boolean).length === 1) ok.push(names[x]); }
      return ok.length === 1 ? ok[0] : '';
    },
  'hard-052': () => {
      const names = ['甲', '乙', '丙', '丁']; const ok = [];
      for (let x = 0; x < 4; x++) { const t = [x === 2, x !== 1, x === 3, x !== 3].filter(Boolean).length; if (t === 1) ok.push(names[x]); }
      return ok.length === 1 ? ok[0] : '';
    },
  'hard-053': () => {
      // 列舉一週七天，找出說這句話不矛盾的所有日子。
      const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      const lie = (d) => d >= 1 && d <= 3;
      const ok = days.filter((name, d) => { const said = lie((d + 6) % 7); return lie(d) ? !said : said; });
      return ok.join('和');
    },
  'hard-054': () => {
      const name = (k) => (k ? '騎士' : '騙子'); const ok = [];
      for (const a of [true, false]) for (const b of [true, false]) { const said = !a || !b; if (said === a) ok.push([a, b]); }
      if (ok.length !== 1) return '';
      const [a, b] = ok[0];
      return a === b ? `甲和乙都是${name(a)}` : `甲是${name(a)}，乙是${name(b)}`;
    },
  'hard-055': () => { let n = 0; for (let d = 0; d < 366; d++) if ((6 + d) % 7 === 0) n++; return `${n} 個`; },
  'hard-056': () => { let r = 1; let d = 0; for (let i = 0; i < 50; i++) { r *= 10; d = Math.floor(r / 7); r %= 7; } return String(d); },
  'hard-057': () => { const p = ['紅', '紅', '黃', '綠', '綠', '綠']; let n = 0; for (let i = 0; i < 100; i++) if (p[i % 6] === '綠') n++; return `${n} 顆`; },
  'hard-058': () => { const w = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']; let d = 1; for (let i = 2; i <= 20; i++) d += 3; return w[(1 + d - 1) % 7]; },
  'hard-059': () => { const p = [1, 2, 3, 4, 3, 2]; let s = 0; for (let i = 0; i < 100; i++) s += p[i % 6]; return String(s); },
  'hard-060': () => { let g = 3; for (let d = 2; d <= 60; d++) g = g % 5 + 1; return `第 ${g} 組`; },
  'hard-061': () => { for (let b = 0; b <= 22; b++) if (25 + 22 - b + 5 === 40) return `${b} 人`; return ''; },
  'hard-062': () => { let n = 0; for (let x = 1; x <= 100; x++) if (x % 2 && x % 3 && x % 5) n++; return `${n} 個`; },
  'hard-063': () => { for (let b = 0; b <= 18; b++) if (20 + 18 - b <= 30) return `${b} 人`; return ''; },
  'hard-064': () => {
      // 依各區塊人數重建後計數：只參加兩個的、只參加一個的。
      const abc = 3; const ab = 8 - abc; const bc = 6 - abc; const ac = 7 - abc;
      const a = 25 - ab - ac - abc; const b = 20 - ab - bc - abc; const c = 15 - ac - bc - abc;
      return `${45 - (a + b + c + ab + bc + ac + abc)} 人`;
    },
  'hard-065': () => { const on = Array(101).fill(true); for (let i = 2; i <= 100; i += 2) on[i] = !on[i]; for (let i = 3; i <= 100; i += 3) on[i] = !on[i]; let n = 0; for (let i = 1; i <= 100; i++) if (on[i]) n++; return `${n} 盞`; },
  'hard-066': () => { const colors = 3; return `${colors * (3 - 1) + 1} 顆`; },
  'hard-067': () => { let best = 0; for (let n = 1; n <= 50; n++) if (3 * n < 50) best = n; return `${best} 位`; },
  'hard-068': () => String(Math.ceil(37 / 12)),
  'hard-069': () => {
      // 列舉 1～20 的所有子集合，找出不含和為 21 的最大子集合，再加 1。
      let best = 0;
      for (let m = 0; m < (1 << 20); m++) {
        let bad = false; let cnt = 0;
        for (let x = 1; x <= 20; x++) if (m & (1 << (x - 1))) { cnt++; if (x <= 10 && (m & (1 << (20 - x)))) bad = true; }
        if (!bad && cnt > best) best = cnt;
      }
      return `${best + 1} 個`;
    },
  'hard-070': () => {
      // 列舉拿到的黑左、黑右、白左、白右數量，找出配不成一雙時最多可拿幾隻。
      let max = 0;
      for (let bl = 0; bl <= 5; bl++) for (let br = 0; br <= 5; br++) for (let wl = 0; wl <= 3; wl++) for (let wr = 0; wr <= 3; wr++) {
        if ((bl && br) || (wl && wr)) continue;
        max = Math.max(max, bl + br + wl + wr);
      }
      return `${max + 1} 隻`;
    },
  'hard-071': () => { for (let t = 1; t < 20; t++) if (60 * t - 50 * t === 30) return `${110 * t} 公里`; return ''; },
  'hard-072': () => {
      // 列舉電扶梯每秒的速度（以 0.1 階為單位）與總階數，找出兩種走法都成立的情形。
      const ok = [];
      for (let v10 = 1; v10 <= 50; v10++) for (let n = 1; n <= 200; n++) {
        if ((1 * 10 + v10) * 20 === n * 10 && (2 * 10 + v10) * 12 === n * 10) ok.push(n);
      }
      return ok.length === 1 ? `${ok[0]} 階` : '';
    },
  'hard-073': () => { for (let t = 6; t < 200; t++) if (50 * (t + 3) === 70 * (t - 5)) return `${50 * (t + 3)} 公尺`; return ''; },
  'hard-074': () => {
      // 模擬每一趟來回，累加小狗跑的距離。
      let a = 0; let b = 30; let dog = 0; let toB = true;
      while (b - a > 1e-9) {
        // 小狗在甲（或乙）身邊，跑向另一人：兩者接近速度為 15 加上對方速度。
        const t = (b - a) / (toB ? 15 + 6 : 15 + 4);
        dog += 15 * t; a += 4 * t; b -= 6 * t; toB = !toB;
      }
      return `${Math.round(dog)} 公里`;
    },
  'hard-075': () => { for (let d = 60; d <= 3000; d += 60) { const extra = d / 2 + d / 2; if (extra / 60 === 10) return `${d} 公尺`; } return ''; },
  'hard-076': () => { const T = 18; for (let h = 1; h < 100; h++) if (h * (T / 6 - T / 9) === T) return `${h} 小時`; return ''; },
  'hard-077': () => { const T = 30; for (let d = 0; d < 100; d++) if (4 * (T / 10) + d * (T / 15) === T) return `${d} 天`; return ''; },
  'hard-078': () => {
      // 以 60 為總工作量，三組每天各做 6、4、5。
      const sum2 = 60 / 10 + 60 / 15 + 60 / 12;
      return `${60 / (sum2 / 2)} 天`;
    },
  'hard-079': () => { const total = 40 * 20; let d = 0; let done = 0; while (done < total) { done += 50; d++; } return `${20 - d} 天`; },
  'hard-080': () => { for (let g = 1; g < 100; g++) if (16 * 75 + g * 80 === 78 * (16 + g)) return `${g} 人`; return ''; },
  'hard-081': () => { for (let a = 0; a <= 60; a++) { const b = 60 - a; const c = 80 - b; if (a + c === 70) return String(b); } return ''; },
  'hard-082': () => `${(40 * 20 + 33 * 15) / 35} 公斤`,
  'hard-083': () => String(Math.round((62.2 * 10 + 75 - 57) / 10 * 100) / 100),
  'hard-084': () => { const ok = []; for (let n = 107; n <= 997; n += 10) { const m = 700 + Math.floor(n / 10); if (m - n === 108) ok.push(n); } return ok.length === 1 ? String(ok[0]) : ''; },
  'hard-085': () => {
      const ok = [];
      for (let a = 1; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
        if (a === b || b === c || a === c) continue;
        if (a + (10 * a + b) + (100 * a + 10 * b + c) === 285) ok.push(100 * a + 10 * b + c);
      }
      return ok.length === 1 ? String(ok[0]) : '';
    },
  'hard-086': () => { for (let x = 10000; x <= 99999; x++) if ([...String(x)].reduce((s, d) => s + Number(d), 0) === 30) return String(x); return ''; },
  'hard-087': () => { let used = 0; for (let p = 1; ; p++) { used += String(p).length; if (used === 252) return `${p} 頁`; if (used > 252) return ''; } },
  'hard-088': () => { let s = 0; for (let x = 1; x <= 100; x++) for (const d of String(x)) s += Number(d); return String(s); },
  'hard-089': () => { let best = 0; for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) { const x = 7000 + a * 100 + 20 + b; if (x % 30 === 0) best = Math.max(best, x); } return String(best); },
  'hard-090': () => { for (let n = 1; ; n++) if (n % 3 === 1 && n % 4 === 2 && n % 5 === 3) return String(n); },
  'hard-091': () => { let best = 0; for (let n = 1; n < 1000; n++) if (Math.floor(n / 8) === n % 8) best = n; return String(best); },
  'hard-092': () => { let best = 0; for (let d = 2; d <= 94; d++) if (46 % d === 70 % d && 70 % d === 94 % d) best = d; return String(best); },
  'hard-093': () => { let s = ''; for (let i = 1; i <= 20; i++) s += i; return String(BigInt(s) % 9n); },
  'hard-094': () => {
      let n = 0; const d = [1, 2, 3, 4];
      const perm = (arr, rest) => { if (!rest.length) { if (Number(arr.join('')) % 11 === 0) n++; return; } rest.forEach((x, i) => perm([...arr, x], rest.filter((_, j) => j !== i))); };
      perm([], d);
      return `${n} 個`;
    },
  'hard-095': () => { let n = 0; for (let x = 1; x <= 100; x++) if (x % 7 === 3) n++; return `${n} 個`; },
  'hard-096': () => `${Math.round((10 * 2 * 3.14 / 2 + 20) * 100) / 100} 公分`,
  'hard-097': () => `${((6 + 10) * 5) / 2} 平方公分`,
  'hard-098': () => { for (let a = 1; a < 100; a++) if ((a + 3) * (a + 3) - a * a === 39) return `${a} 公分`; return ''; },
  'hard-099': () => `${Math.round((10 * 10 - 5 * 5 * 3.14) * 100) / 100} 平方公分`,
  'hard-100': () => { const s = Math.min(12, 8); const w = 12 - s; return `${(w + 8) * 2} 公分`; },
};
