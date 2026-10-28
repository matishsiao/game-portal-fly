// 挑戰（expert）題 expert-011～expert-100 的獨立答案計算：以暴力列舉或模擬算出正解選項文字。

/** 求 [0, n) 的整數陣列。 */
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);
/** 求最大公因數。 */
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** 列出陣列的所有排列。 */
const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));

export default {
  // 0～4 五張卡排三位數偶數
  'expert-011': () => {
    let n = 0;
    for (let x = 100; x < 1000; x++) {
      const d = String(x).split('').map(Number);
      if (x % 2 === 0 && new Set(d).size === 3 && d.every((v) => v <= 4)) n++;
    }
    return `${n} 個`;
  },
  // 1～200 數字 1 出現次數
  'expert-012': () => `${range(1, 201).join('').split('').filter((c) => c === '1').length} 次`,
  // 2 × 5 方格中的長方形
  'expert-013': () => {
    let n = 0;
    for (let r1 = 0; r1 < 2; r1++) for (let r2 = r1 + 1; r2 <= 2; r2++)
      for (let c1 = 0; c1 < 5; c1++) for (let c2 = c1 + 1; c2 <= 5; c2++) n++;
    return `${n} 個`;
  },
  // 數字和為 5 的三位數
  'expert-014': () => `${range(100, 1000).filter((x) => String(x).split('').reduce((s, c) => s + +c, 0) === 5).length} 個`,
  // 1～1000 每位都是奇數的數
  'expert-015': () => `${range(1, 1001).filter((x) => String(x).split('').every((c) => +c % 2 === 1)).length} 個`,
  // 10 顆糖分 3 人、每人至少 2 顆
  'expert-016': () => {
    let n = 0;
    for (let a = 2; a <= 10; a++) for (let b = 2; a + b <= 10; b++) if (10 - a - b >= 2) n++;
    return `${n} 種`;
  },
  // 十邊形對角線
  'expert-017': () => {
    let n = 0;
    for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) if (j - i !== 1 && j - i !== 9) n++;
    return `${n} 條`;
  },
  // 每步 1 或 2 階走 8 階：遞迴列舉
  'expert-018': () => {
    const walk = (left) => (left === 0 ? 1 : left < 0 ? 0 : walk(left - 1) + walk(left - 2));
    return `${walk(8)} 種`;
  },
  // 除以 6、8、9 餘 5、7、8，100～200
  'expert-019': () => `${range(100, 201).find((x) => x % 6 === 5 && x % 8 === 7 && x % 9 === 8)}`,
  // 除以 8、9 餘數相同且商差 2 的最大數
  'expert-020': () => `${Math.max(...range(1, 2000).filter((x) => x % 8 === x % 9 && Math.floor(x / 8) === Math.floor(x / 9) + 2))}`,
  // 連續三數分別是 5、7、9 的倍數
  'expert-021': () => `${range(1, 1000).find((n) => n % 5 === 0 && (n + 1) % 7 === 0 && (n + 2) % 9 === 0)}`,
  // 甲 ≡ 5、乙 ≡ 7 (mod 9)，乘積餘數（檢查多組都相同）
  'expert-022': () => {
    const rs = new Set();
    for (let a = 5; a < 200; a += 9) for (let b = 7; b < 200; b += 9) rs.add((a * b) % 9);
    if (rs.size !== 1) throw new Error('餘數不唯一');
    return `${[...rs][0]}`;
  },
  // 1～200 除以 3、4 都餘 1
  'expert-023': () => `${range(1, 201).filter((x) => x % 3 === 1 && x % 4 === 1).length} 個`,
  // 除以 17 商等於餘數的最大數
  'expert-024': () => `${Math.max(...range(1, 2000).filter((x) => Math.floor(x / 17) === x % 17))}`,
  // 平方和除以 5
  'expert-025': () => `${range(1, 31).reduce((s, k) => s + k * k, 0) % 5}`,
  // 襪子配 2 雙：找最小 n 使所有可能的摸法都至少 2 雙
  'expert-026': () => {
    for (let n = 1; n <= 24; n++) {
      let ok = true;
      for (let r = 0; r <= 10; r++) for (let w = 0; w <= 8; w++) {
        const b = n - r - w;
        if (b < 0 || b > 6) continue;
        if (Math.floor(r / 2) + Math.floor(w / 2) + Math.floor(b / 2) < 2) ok = false;
      }
      if (ok) return `${n} 隻`;
    }
  },
  // 1～30 差不為 5 最多選幾個：每串暴力
  'expert-027': () => {
    let total = 0;
    for (let r = 1; r <= 5; r++) {
      const chain = range(0, 30).map((i) => i + 1).filter((x) => x % 5 === r % 5);
      let best = 0;
      for (let m = 0; m < 1 << chain.length; m++) {
        const pick = chain.filter((_, i) => m & (1 << i));
        if (pick.every((a) => pick.every((b) => Math.abs(a - b) !== 5))) best = Math.max(best, pick.length);
      }
      total += best;
    }
    return `${total} 個`;
  },
  // 和或差為 10 的倍數：最大「好」餘數集合 ＋ 1
  'expert-028': () => {
    let best = 0;
    for (let m = 0; m < 1 << 10; m++) {
      const rs = range(0, 10).filter((r) => m & (1 << r));
      let ok = true;
      for (const a of rs) for (const b of rs) if (a !== b && (a + b) % 10 === 0) ok = false;
      if (ok) best = Math.max(best, rs.length);
    }
    return `${best + 1} 個`;
  },
  // 四色卡片：最大「缺一色」的張數 ＋ 1
  'expert-029': () => {
    let worst = 0;
    for (let miss = 0; miss < 4; miss++) worst = Math.max(worst, range(0, 4).filter((c) => c !== miss).length * 10);
    return `${worst + 1} 張`;
  },
  // 32 人 11 種分數：最平均分配時的最大人數
  'expert-030': () => {
    for (let m = 1; ; m++) if (11 * m >= 32) return `${m} 位`;
  },
  // 1～30 倍數關係：奇數部分分串數 ＋ 1（並確認存在同樣大小的無倍數組）
  'expert-031': () => {
    const odd = (x) => (x % 2 ? x : odd(x / 2));
    const chains = new Set(range(1, 31).map(odd)).size;
    const anti = range(16, 31);
    const ok = anti.every((a) => anti.every((b) => a === b || b % a !== 0));
    if (!ok || anti.length !== chains) throw new Error('不一致');
    return `${chains + 1} 個`;
  },
  // 100 個蘋果分給最多人
  'expert-032': () => {
    let k = 0;
    while (((k + 1) * (k + 2)) / 2 <= 100) k++;
    return `${k} 位`;
  },
  // 火車長
  'expert-033': () => {
    for (let L = 1; L < 2000; L++) for (let v = 1; v < 100; v++) if ((300 + L) === 25 * v && (500 + L) === 35 * v) return `${L} 公尺`;
  },
  // 環形追及：逐分鐘模擬
  'expert-034': () => {
    for (let t = 1; ; t++) if ((250 * t - 200 * t) % 400 === 0) return `${(250 * t) / 400} 圈`;
  },
  // 上下山平均速度
  'expert-035': () => {
    const d = 12;
    return `每小時 ${(2 * d) / (d / 3 + d / 6)} 公里`;
  },
  // 靜水船速
  'expert-036': () => {
    for (let s = 1; s < 100; s++) for (let c = 0; c < s; c++) if (3 * (s + c) === 60 && 5 * (s - c) === 60) return `每小時 ${s} 公里`;
  },
  // 兩次迎面相遇：逐段精確計算兩人的位置（折返點把時間切成直線段），只計迎面相遇；
  // 對全程 D 做細格掃描並以二分法求出所有「第二次迎面相遇距 B 地 4 公里、甲比乙慢、乙不到甲的 2 倍」的解，須唯一。
  // （不限制乙的速度時，全程 22 公里也成立：乙先折返兩次，在甲到 B 地前與甲第二次迎面相遇。）
  'expert-037': () => {
    /**
     * 第二次迎面相遇時距 B 地的距離減 4。
     * @param {number} D 全程。
     * @returns {number} 差值。
     */
    const f = (D) => {
      const va = 6, vb = D - 6; // 第一次迎面相遇在距 A 地 6 公里（以那一刻為時間 1）
      const state = (v, t, fromA) => {
        const s = (v * t) % (2 * D);
        const pos = s <= D ? s : 2 * D - s;
        const dir = s < D ? 1 : -1;
        return fromA ? [pos, dir * v] : [D - pos, -dir * v];
      };
      const cuts = new Set([0]);
      for (let k = 1; k * D / va < 20; k++) cuts.add(k * D / va);
      for (let k = 1; k * D / vb < 20; k++) cuts.add(k * D / vb);
      const ts = [...cuts].sort((a, b) => a - b);
      let meets = 0;
      for (let i = 0; i + 1 < ts.length; i++) {
        const mid = (ts[i] + ts[i + 1]) / 2;
        const [pa, sa] = state(va, mid, true);
        const [pb, sb] = state(vb, mid, false);
        if (Math.sign(sa) === Math.sign(sb)) continue; // 同方向：追上不算
        const t = mid + (pb - pa) / (sa - sb); // 兩條直線的交點
        if (t > ts[i] - 1e-9 && t <= ts[i + 1] + 1e-9) {
          meets++;
          if (meets === 2) return D - state(va, t, true)[0] - 4;
        }
      }
      return NaN;
    };
    const roots = [];
    let prevD = 12.01;
    let prev = f(prevD);
    for (let D = 12.02; D < 18; D += 0.01) { // 甲比乙慢、乙不到甲的 2 倍：6 < D − 6 < 12，即 12 < D < 18
      const cur = f(D);
      if (Number.isFinite(prev) && Number.isFinite(cur) && Math.sign(prev) !== Math.sign(cur)) {
        let lo = prevD, hi = D;
        for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (Math.sign(f(m)) === Math.sign(f(lo))) lo = m; else hi = m; }
        if (Math.abs(f(lo)) < 1e-6) roots.push(Math.round(lo * 1000) / 1000);
      }
      prevD = D;
      prev = cur;
    }
    if (roots.length !== 1) throw new Error(`expert-037 解不唯一：${roots}`);
    return `${roots[0]} 公里`;
  },
  // 12 小時內時針分針重合：以 1/11 分鐘為單位
  'expert-038': () => {
    let n = 0;
    for (let j = 0; j < 720 * 11; j++) {
      // 時間 j/11 分鐘，分針 6j/11 度、時針 0.5j/11 度，差 (11j/2)/11 ＝ j/2 度
      if ((j / 2) % 360 === 0) n++;
    }
    return `${n} 次`;
  },
  // 父 4 倍、20 年後 2 倍
  'expert-039': () => `${range(1, 40).find((d) => 4 * d + 20 === 2 * (d + 20))} 歲`,
  // 三人年齡和與出生那年
  'expert-040': () => `${range(0, 80).find((k) => 56 + 3 * k === 80)} 歲`,
  // 一家四口
  'expert-041': () => {
    const res = new Set();
    for (let b = 0; b < 40; b++) for (let s = b + 1; s < 50; s++) for (let p = 18; p < 90; p++) {
      const m = 100 - b - s - p;
      if (m < 18) continue;
      const dec = [p, m, s, b].reduce((t, a) => t + Math.min(a, 4), 0);
      if (dec === 15) res.add(b);
    }
    if (res.size !== 1) throw new Error('不唯一');
    return `${[...res][0]} 歲`;
  },
  // 姐姐是弟弟 4 倍是幾年前
  'expert-042': () => `${range(1, 7).find((y) => 13 - y === 4 * (7 - y))} 年前`,
  // 爸爸與孩子和的 2 倍
  'expert-043': () => `${range(1, 7).find((x) => 46 - x === 2 * (12 + 9 + 7 - 3 * x))} 年前`,
  // 五人座位
  'expert-044': () => {
    const sols = perms(['A', 'B', 'C', 'D', 'E']).filter((o) => {
      const p = (x) => o.indexOf(x) + 1;
      return p('D') === 3 && p('A') !== 1 && p('A') !== 5 && Math.abs(p('C') - p('D')) !== 1 && p('B') === p('C') + 1;
    });
    return new Set(sols.map((o) => o[4])).size === 1 ? sols[0][4] : '無法確定';
  },
  // 賽跑名次
  'expert-045': () => {
    const sols = perms(['A', 'B', 'C', 'D']).filter((o) => {
      const r = (x) => o.indexOf(x) + 1;
      return r('A') !== 1 && r('B') === 3 && r('C') > r('A') && r('C') > r('D') && r('D') !== 4;
    });
    return sols.length === 1 ? sols[0][0] : '無法確定';
  },
  // 衣服與寵物
  'expert-046': () => {
    const ppl = ['小美', '小華', '小玲'];
    const ans = new Set();
    for (const col of perms(['紅', '黃', '藍'])) for (const pet of perms(['貓', '狗', '兔'])) {
      const ok = ppl.every((_, i) => (col[i] === '紅') === (pet[i] === '狗') || col[i] !== '紅')
        && pet[1] !== '貓' && pet[2] === '兔' && ppl.every((_, i) => !(pet[i] === '貓' && col[i] === '藍'));
      if (ok) ans.add(ppl[col.indexOf('黃')]);
    }
    return ans.size === 1 ? [...ans][0] : '無法確定';
  },
  // 25 枚假幣
  'expert-047': () => {
    let k = 0;
    while (3 ** k < 25) k++;
    return `${k} 次`;
  },
  // 誠實族與說謊族
  'expert-048': () => {
    const res = new Set();
    for (const a of [true, false]) for (const b of [true, false]) for (const c of [true, false]) {
      if (a === !b && b === (a === c)) res.add(c ? '誠實族' : '說謊族');
    }
    return res.size === 1 ? [...res][0] : '無法確定';
  },
  // 足球循環賽：列舉 3^6 種結果
  'expert-049': () => {
    const games = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) games.push([i, j]);
    const res = new Set();
    for (let m = 0; m < 3 ** 6; m++) {
      const pts = [0, 0, 0, 0];
      let x = m;
      for (const [i, j] of games) {
        const r = x % 3; x = Math.floor(x / 3);
        if (r === 0) pts[i] += 3; else if (r === 1) pts[j] += 3; else { pts[i]++; pts[j]++; }
      }
      if (pts[0] === 7 && pts[1] === 5 && pts[2] === 3) res.add(pts[3]);
    }
    if (res.size !== 1) throw new Error('不唯一');
    return `${[...res][0]} 分`;
  },
  // 周長 30 最大面積
  'expert-050': () => {
    let best = 0;
    for (let l = 1; l < 15; l++) best = Math.max(best, l * (15 - l));
    return `${best} 平方公分`;
  },
  // 剪角後周長：方格邊界計數
  'expert-051': () => {
    const inside = (x, y) => x >= 0 && x < 10 && y >= 0 && y < 10 && !((x < 2 || x >= 8) && (y < 2 || y >= 8));
    let p = 0;
    for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) if (inside(x, y))
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!inside(x + dx, y + dy)) p++;
    return `${p} 公分`;
  },
  // 3 個正方體黏成長方體：數露在外面的單位面
  'expert-052': () => {
    const cubes = [[0, 0, 0], [2, 0, 0], [4, 0, 0]];
    const cells = new Set();
    for (const [cx, cy, cz] of cubes) for (let x = 0; x < 2; x++) for (let y = 0; y < 2; y++) for (let z = 0; z < 2; z++) cells.add(`${cx + x},${cy + y},${cz + z}`);
    let exposed = 0;
    for (const c of cells) {
      const [x, y, z] = c.split(',').map(Number);
      for (const [a, b, d] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) if (!cells.has(`${x + a},${y + b},${z + d}`)) exposed++;
    }
    return `${3 * 6 * 4 - exposed} 平方公分`;
  },
  // 圓上 6 點三角形
  'expert-053': () => {
    let n = 0;
    for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c = b + 1; c < 6; c++) n++;
    return `${n} 個`;
  },
  // 長方形面積
  'expert-054': () => {
    for (let l = 1; l < 100; l++) for (let w = 1; w < 100; w++) if (3 * w === 24 && 2 * l === 20) return `${l * w} 平方公分`;
  },
  // 面積 36 的不同周長
  'expert-055': () => {
    const ps = new Set();
    for (let l = 1; l <= 36; l++) if (36 % l === 0) ps.add(2 * (l + 36 / l));
    return `${ps.size} 種`;
  },
  // 費氏數列第 50 項除以 4
  'expert-056': () => {
    let a = 1n, b = 1n;
    for (let i = 3; i <= 50; i++) [a, b] = [b, a + b];
    return `${b % 4n}`;
  },
  // 100 在第幾行
  'expert-057': () => {
    let row = 0, last = 0;
    while (last < 100) { row++; last += row; }
    return `第 ${row} 行`;
  },
  // 2、5、10、17…第 20 項：依差 3、5、7…產生
  'expert-058': () => {
    let x = 2;
    for (let i = 2; i <= 20; i++) x += 2 * i - 1;
    return `${x}`;
  },
  // 火柴棒正方形
  'expert-059': () => {
    let n = 0;
    while (3 * (n + 1) + 1 <= 100) n++;
    return `${n} 個`;
  },
  // 等差數列前 20 項和
  'expert-060': () => `${range(0, 20).reduce((s, i) => s + 1 + 3 * i, 0)}`,
  // 37 × 3 ＋ 37 × 6 ＋ … ＋ 37 × 27
  'expert-061': () => `${range(1, 10).reduce((s, k) => s + 37 * 3 * k, 0)}`,
  // 999 × 999 ＋ 1999
  'expert-062': () => `${999 * 999 + 1999}`,
  // 1 × 2 ＋ … ＋ 9 × 10
  'expert-063': () => `${range(1, 10).reduce((s, k) => s + k * (k + 1), 0)}`,
  // 分數和：以分數運算
  'expert-064': () => {
    let n = 0, d = 1;
    for (let k = 1; k <= 9; k++) {
      const q = k * (k + 1);
      n = n * q + d; d = d * q;
      const g = gcd(n, d); n /= g; d /= g;
    }
    return d === 1 ? `${n}` : `${n}/${d}`;
  },
  // 1 ＋ 2 ＋ … ＋ 100 ＋ 99 ＋ … ＋ 1：逐項相加
  'expert-065': () => `${[...range(1, 101), ...range(1, 100)].reduce((a, b) => a + b, 0)}`,
  // 植樹不必移動
  'expert-066': () => `${range(0, 121).filter((x) => x % 6 === 0 && x % 8 === 0).length} 棵`,
  // 圓形池塘旗子：以每 2.5 公尺為單位標記位置
  'expert-067': () => {
    const pos = new Set();
    for (let x = 0; x < 200; x += 5) { pos.add(x * 2); pos.add(x * 2 + 5); }
    return `${pos.size} 面`;
  },
  // 路兩旁的樹與花盆：標記所有位置
  'expert-068': () => {
    const pos = new Set();
    for (const side of [0, 1]) for (let x = 0; x <= 300; x += 15) { pos.add(`${side}t${x}`); if (x < 300) pos.add(`${side}f${x + 7.5}`); }
    return `${pos.size} 個`;
  },
  // 雞比兔多 10
  'expert-069': () => `${range(0, 100).find((r) => 2 * (r + 10) + 4 * r === 110)} 隻`,
  // 花瓶運費
  'expert-070': () => `${range(0, 201).find((b) => 5 * (200 - b) - 20 * b === 750)} 個`,
  // 1、5、10 元硬幣
  'expert-071': () => {
    for (let a = 0; a <= 15; a++) for (let t = 0; t <= 15; t++) if (2 * a + t === 15 && a + 5 * a + 10 * t === 94) return `${t} 枚`;
  },
  // 雞兔隻數對調
  'expert-072': () => {
    for (let c = 0; c <= 50; c++) for (let r = 0; r <= 25; r++) if (2 * c + 4 * r === 100 && 2 * r + 4 * c === 80) return `${r} 隻`;
  },
  // 雞兔腳數相同
  'expert-073': () => {
    for (let c = 0; c <= 36; c++) if (2 * c === 4 * (36 - c)) return `${c} 隻`;
  },
  // 被除數、除數、商、餘數的和
  'expert-074': () => {
    for (let d = 4; d < 101; d++) { const a = 5 * d + 3; if (a + d + 5 + 3 === 101) return `${a}`; }
  },
  // 書架
  'expert-075': () => {
    for (let a = 15; a <= 120; a++) if (a - 15 === 2 * (120 - a + 15)) return `${a} 本`;
  },
  // 筆與筆記本
  'expert-076': () => {
    for (let p = 1; p < 100; p++) for (let n = 1; n < 100; n++) if (3 * p + 2 * n === 110 && p + 2 * n === 70) return `${n} 元`;
  },
  // 三數相等
  'expert-077': () => {
    for (let a = 0; a <= 90; a++) for (let b = 0; a + b <= 90; b++) {
      const c = 90 - a - b;
      if (a + 2 === b - 2 && b - 2 === c * 2) return `${c}`;
    }
  },
  // 2026 年 12 月 25 日星期幾（以 Date 計算）
  'expert-078': () => {
    const w = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    if (new Date(Date.UTC(2026, 0, 1)).getUTCDay() !== 4) throw new Error('題目前提錯誤');
    return w[new Date(Date.UTC(2026, 11, 25)).getUTCDay()];
  },
  // 123456 循環前 100 個數字和
  'expert-079': () => `${range(0, 100).reduce((s, i) => s + (i % 6) + 1, 0)}`,
  // 兩燈同時閃
  'expert-080': () => `${range(1, 61).filter((t) => t % 4 === 0 && t % 6 === 0).length} 次`,
  // 2 月有 5 個星期日：檢查多年
  'expert-081': () => {
    const w = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const res = new Set();
    for (let y = 1901; y <= 2400; y++) {
      let sun = 0;
      for (let d = 1; d <= 29; d++) {
        const dt = new Date(Date.UTC(y, 1, d));
        if (dt.getUTCMonth() === 1 && dt.getUTCDay() === 0) sun++;
      }
      if (sun === 5) res.add(w[new Date(Date.UTC(y, 1, 1)).getUTCDay()]);
    }
    return res.size === 1 ? [...res][0] : '無法確定';
  },
  // 游泳與跑步
  'expert-082': () => {
    for (let r = 7; r <= 35; r++) { const s = 2 * r; if (s + r - 7 === 35) return `${s - 7} 人`; }
  },
  // 三科調查：逐區計算並確認各區不為負
  'expert-083': () => {
    const t = 5, gm = 14 - t, me = 12 - t, ge = 13 - t;
    const g = 30 - gm - ge - t, m = 28 - gm - me - t, e = 25 - me - ge - t;
    const regions = [t, gm, me, ge, g, m, e];
    if (regions.some((r) => r < 0)) throw new Error('資料矛盾');
    return `${50 - regions.reduce((s, r) => s + r, 0)} 人`;
  },
  // 3 或 5 的倍數但非 15 的倍數
  'expert-084': () => `${range(1, 201).filter((x) => (x % 3 === 0 || x % 5 === 0) && x % 15 !== 0).length} 個`,
  // 紙條重疊
  'expert-085': () => {
    for (let o = 0; o < 30; o++) if (30 + 40 + 50 - 2 * o === 100) return `${o} 公分`;
  },
  // 三樣都有至少幾人：列舉「缺一樣」與「缺兩樣」的人數分配，求三樣都有的最小值
  'expert-086': () => {
    // 缺的項目：眼鏡 15、運動鞋 10、水壺 8；每人可缺 0～3 樣。以缺的組合人數列舉。
    let best = Infinity;
    // 只缺一樣的人數 a、b、c；缺兩樣 ab、ac、bc；缺三樣 abc
    for (let abc = 0; abc <= 8; abc++) for (let ab = 0; ab <= 10 - abc; ab++) for (let ac = 0; ac <= 8 - abc; ac++) for (let bc = 0; bc <= 8 - abc - ac; bc++) {
      const a = 15 - abc - ab - ac, b = 10 - abc - ab - bc, c = 8 - abc - ac - bc;
      if (a < 0 || b < 0 || c < 0) continue;
      const all = 40 - (a + b + c + ab + ac + bc + abc);
      if (all >= 0) best = Math.min(best, all);
    }
    return `${best} 人`;
  },
  // 甲休息天數
  'expert-087': () => {
    for (let rest = 0; rest <= 9; rest++) if (3 * (9 - rest) + 2 * 9 === 30) return `${rest} 天`;
  },
  // 甲乙輪流各做一天
  'expert-088': () => {
    // 以 1/18 件工作為 1 份；甲每天 18 ÷ 6 份、乙每天 18 ÷ 9 份，輪流逐日模擬
    let done = 0, day = 0;
    while (done < 18) { day++; done += day % 2 === 1 ? 18 / 6 : 18 / 9; }
    if (done !== 18) throw new Error('最後一天沒有剛好做完');
    return `${day} 天`;
  },
  // 邊進水邊抽水：先求初始水量與進水量，再逐小時模擬
  'expert-089': () => {
    for (let init = 1; init < 200; init++) for (let inflow = 0; inflow < 10; inflow++) {
      if (init + 12 * inflow === 36 && init + 6 * inflow === 30) {
        let w = init, h = 0;
        while (w > 0) { w += inflow - 7; h++; }
        return `${h} 小時`;
      }
    }
  },
  // 甲單獨天數：以甲 a 天、乙 b 天完成，4/a ＋ 6/b ＝ 1、6/a ＋ 3/b ＝ 1
  'expert-090': () => {
    for (let a = 1; a < 100; a++) for (let b = 1; b < 100; b++) if (4 * b + 6 * a === a * b && 6 * b + 3 * a === a * b) return `${a} 天`;
  },
  // 新同學身高
  'expert-091': () => `${6 * 141 - 5 * 140} 公分`,
  // 第幾次考試
  'expert-092': () => {
    for (let n = 1; n < 100; n++) if (82 * n + 98 === 84 * (n + 1)) return `第 ${n + 1} 次`;
  },
  // 乙的體重
  'expert-093': () => {
    for (let a = 1; a < 150; a++) for (let b = 1; b < 150; b++) {
      const c = 150 - a - b;
      if (a + b === 96 && b + c === 110) return `${b} 公斤`;
    }
  },
  // 最大最小差
  'expert-094': () => `${(200 - 9 * 18) - (200 - 9 * 21)}`,
  // 30! 末尾 0
  'expert-095': () => {
    let f = 1n;
    for (let i = 1n; i <= 30n; i++) f *= i;
    return `${String(f).length - String(f).replace(/0+$/, '').length} 個`;
  },
  // AB ＋ BA、AB － BA
  'expert-096': () => {
    // 列舉所有兩位數，找出對調相加為 132 且十位比個位大 4 的數（須唯一）。
    const res = range(10, 100).filter((x) => { const a = Math.floor(x / 10); const b = x % 10; return x + b * 10 + a === 132 && a - b === 4; });
    if (res.length !== 1) throw new Error('expert-096 解不唯一');
    return String(res[0]);
  },
  // ABC × 3 ＝ BBB
  'expert-097': () => {
    const res = range(100, 1000).filter((x) => {
      const [a, b, c] = String(x).split('').map(Number);
      return new Set([a, b, c]).size === 3 && 3 * x === 111 * b;
    });
    if (res.length !== 1) throw new Error('不唯一');
    return `${res[0]}`;
  },
  // 十位數字等於百位加個位的三位數
  'expert-098': () => `${range(100, 1000).filter((x) => { const [a, b, c] = String(x).split('').map(Number); return b === a + c; }).length} 個`,
  // 數字不同、和為 6 的三位數
  'expert-099': () => `${range(100, 1000).filter((x) => { const d = String(x).split('').map(Number); return new Set(d).size === 3 && d[0] + d[1] + d[2] === 6; }).length} 個`,
  // 等於數字和 4 倍的兩位數
  'expert-100': () => `${range(10, 100).filter((x) => x === 4 * (Math.floor(x / 10) + (x % 10))).length} 個`,
};
