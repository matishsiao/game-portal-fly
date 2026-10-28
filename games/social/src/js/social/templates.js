// 題型模板（純邏輯）：計算型題目換數字產生新題（世紀、民國與西元、比例尺、時差、經緯度），以及模板題用的知識卡。
// 模板題的 id 為「<模板代碼>#<參數以 _ 連接>」，存檔只記 id，讀取時以 questionFromId() 重建。

import { GRADE_RANGE } from './bank.js';

/** 模板題用的知識卡（隨程式散布，與題庫的知識卡合併）。 */
export const TEMPLATE_CARDS = [
  { id: 'tpl-century', subject: 'history', title: '世紀怎麼算', icon: '📅', body: '每 100 年是一個世紀。西元 1 年到 100 年是 1 世紀，101 年到 200 年是 2 世紀，所以 1901 年到 2000 年是 20 世紀。', life: '我們出生在 21 世紀，也就是 2001 年到 2100 年。', mnemonic: '年份減 1，去掉後兩位再加 1。' },
  { id: 'tpl-minguo', subject: 'history', title: '民國與西元', icon: '🗓️', body: '中華民國元年是西元 1912 年。民國年份加 1911 就是西元年份；西元年份減 1911 就是民國年份。', life: '身分證、健保卡上的出生日期，常用民國年表示。', mnemonic: '民國＋1911＝西元。' },
  { id: 'tpl-scale', subject: 'geography', title: '比例尺', icon: '📏', body: '比例尺 1：50,000 表示地圖上 1 公分代表實際 50,000 公分，也就是 500 公尺。比例尺的分母越大，地圖畫的範圍越大、越不詳細。', life: '登山地圖常用 1：25,000，可以看到很小的步道。', mnemonic: '1 公尺＝100 公分，1 公里＝1,000 公尺。' },
  { id: 'tpl-timezone', subject: 'geography', title: '經度與時差', icon: '🕐', body: '地球每 24 小時自轉一圈（360 度），所以經度每差 15 度，時間就差 1 小時。越往東邊，太陽越早升起，時間越早到。', life: '從臺灣打電話給在歐洲的親友，要先想想那裡是不是半夜。', mnemonic: '東早西晚，15 度差 1 小時。' },
  { id: 'tpl-hemisphere', subject: 'geography', title: '東西南北半球', icon: '🌐', body: '赤道把地球分成北半球和南半球；本初子午線（0 度經線）與 180 度經線把地球分成東半球和西半球。北緯在北半球、東經在東半球。', life: '臺灣大約在北緯 22 到 25 度、東經 120 到 122 度，位在北半球和東半球。' },
];

/**
 * 在整數範圍內取亂數。
 * @param {() => number} rng 亂數。
 * @param {number} min 最小值（含）。
 * @param {number} max 最大值（含）。
 * @returns {number} 整數。
 */
function int(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * 從陣列中取一個。
 * @template T
 * @param {() => number} rng 亂數。
 * @param {T[]} list 陣列。
 * @returns {T} 元素。
 */
function pickOne(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/**
 * 千分位格式。
 * @param {number} n 數字。
 * @returns {string} 例如「50,000」。
 */
function comma(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 組成選擇題：正確選項放第 0 個（顯示時另行打亂），誘答附提示。
 * @param {string} right 正確選項。
 * @param {{text: string, hint: string}[]} wrongs 3 個誘答。
 * @returns {{options: {text: string, hint?: string}[], answer: number}} 選項與答案索引。
 */
function options(right, wrongs) {
  return { options: [{ text: right }, ...wrongs], answer: 0 };
}

/**
 * 西元年的世紀。
 * @param {number} y 西元年（正數）。
 * @returns {number} 世紀。
 */
export function centuryOf(y) {
  return Math.floor((y - 1) / 100) + 1;
}

/**
 * 時間加減小時，回傳 [時, 日差]。
 * @param {number} hour 時（0～23）。
 * @param {number} diff 加減的小時。
 * @returns {[number, number]} [時, 日差（-1 前一天、0 同一天、1 隔天）]。
 */
export function shiftHour(hour, diff) {
  const total = hour + diff;
  const day = Math.floor(total / 24);
  return [((total % 24) + 24) % 24, day];
}

/**
 * 時間的文字。
 * @param {number} hour 時。
 * @param {number} day 日差。
 * @returns {string} 例如「隔天上午 2 點」。
 */
export function timeText(hour, day) {
  const dayText = day < 0 ? '前一天' : day > 0 ? '隔天' : '同一天';
  const part = hour === 0 ? '凌晨 12 點' : hour < 12 ? `上午 ${hour} 點` : hour === 12 ? '中午 12 點' : `下午 ${hour - 12} 點`;
  return `${dayText}${part}`;
}

/**
 * 經度文字。
 * @param {number} lon 經度（東經為正、西經為負）。
 * @returns {string} 例如「東經 120 度」。
 */
function lonText(lon) {
  return lon >= 0 ? `東經 ${lon} 度` : `西經 ${-lon} 度`;
}

/** 模板定義：適用難度、科目、主題、參數產生、參數檢查與組題。 */
export const TEMPLATES = {
  century: {
    difficulties: ['medium', 'hard'],
    subject: 'history',
    topic: 'chronology',
    card: 'tpl-century',
    /**
     * 產生參數：西元年（兩成機率出整百年，練習容易算錯的邊界）。
     * @param {() => number} rng 亂數。
     * @returns {number[]} [西元年]。
     */
    params: (rng) => [rng() < 0.2 ? int(rng, 2, 20) * 100 : int(rng, 101, 2099)],
    /**
     * 參數是否合用。
     * @param {number[]} p 參數。
     * @returns {boolean} 合用時為 true。
     */
    valid: (p) => p.length === 1 && Number.isInteger(p[0]) && p[0] >= 101 && p[0] <= 2099,
    /**
     * 組題。
     * @param {number[]} p 參數。
     * @returns {object} 題目內容。
     */
    build: ([y]) => {
      const c = centuryOf(y);
      const naive = Math.floor(y / 100);
      const wrongs = [];
      if (naive !== c) wrongs.push({ text: `${naive} 世紀`, hint: '你是不是直接看年份的前兩位數？想一想西元 1 年到 100 年是第幾世紀。' });
      for (const d of [1, -1, 2, -2]) {
        if (wrongs.length >= 3) break;
        const v = c + d;
        if (v > 0 && v !== naive && !wrongs.some((w) => w.text === `${v} 世紀`)) wrongs.push({ text: `${v} 世紀`, hint: '每 100 年是一個世紀。試著算算看這一年落在哪 100 年裡。' });
      }
      return {
        question: `西元 ${y} 年是屬於第幾世紀？`,
        ...options(`${c} 世紀`, wrongs),
        keys: ['每 100 年算一個世紀：西元 1～100 年是第一個世紀，101～200 年是第二個世紀，以此類推。', `整百年（例如 1900 年）是一個世紀的最後一年還是第一年？${y % 100 === 0 ? '這題剛好是整百年。' : ''}`],
        explain: `每 100 年是一個世紀，${(c - 1) * 100 + 1} 年到 ${c * 100} 年是 ${c} 世紀，所以西元 ${y} 年是 ${c} 世紀。`,
      };
    },
  },
  minguo: {
    difficulties: ['medium'],
    subject: 'history',
    topic: 'chronology',
    card: 'tpl-minguo',
    /**
     * 產生參數：[民國年, 方向（0 民國換西元、1 西元換民國）]；民國元年就寫在提示裡，所以從 2 年起出題。
     * @param {() => number} rng 亂數。
     * @returns {number[]} 參數。
     */
    params: (rng) => [int(rng, 2, 115), int(rng, 0, 1)],
    /**
     * 參數是否合用。
     * @param {number[]} p 參數。
     * @returns {boolean} 合用時為 true。
     */
    valid: (p) => p.length === 2 && Number.isInteger(p[0]) && p[0] >= 2 && p[0] <= 115 && (p[1] === 0 || p[1] === 1),
    /**
     * 組題。
     * @param {number[]} p 參數。
     * @returns {object} 題目內容。
     */
    build: ([n, dir]) => {
      const y = n + 1911;
      if (dir === 0) {
        return {
          question: `民國 ${n} 年是西元幾年？`,
          ...options(`西元 ${y} 年`, [
            { text: `西元 ${y + 1} 年`, hint: '民國元年是西元 1912 年。民國 1 年加多少會等於 1912？' },
            { text: `西元 ${y - 1} 年`, hint: '加或減的數字差了 1 喔。用民國元年＝1912 年驗算看看。' },
            { text: `西元 ${y + 10} 年`, hint: '加的數字是不是寫錯了一位數？再算一次。' },
          ]),
          keys: ['民國元年是西元 1912 年。', '民國 1 年要加多少才會變成 1912？用同一個數字加上這題的年份。'],
          explain: `民國年份加 1911 就是西元年份：${n} ＋ 1911 ＝ ${y}，所以是西元 ${y} 年。`,
        };
      }
      return {
        question: `西元 ${y} 年是民國幾年？`,
        ...options(`民國 ${n} 年`, [
          { text: `民國 ${n + 1} 年`, hint: '民國元年是西元 1912 年。1912 要減多少才會等於 1？' },
          { text: `民國 ${n - 1 > 0 ? n - 1 : n + 2} 年`, hint: '減的數字差了 1 喔。用 1912 年＝民國元年驗算看看。' },
          { text: `民國 ${n + 10} 年`, hint: '減的數字是不是寫錯了一位數？再算一次。' },
        ]),
        keys: ['民國元年是西元 1912 年。', '1912 要減多少才會變成 1？用同一個數字去減這題的年份。'],
        explain: `西元年份減 1911 就是民國年份：${y} － 1911 ＝ ${n}，所以是民國 ${n} 年。`,
      };
    },
  },
  'map-scale': {
    difficulties: ['medium', 'hard'],
    subject: 'geography',
    topic: 'map',
    card: 'tpl-scale',
    /**
     * 產生參數：[比例尺分母, 圖上公分]。
     * @param {() => number} rng 亂數。
     * @returns {number[]} 參數。
     */
    params: (rng) => [pickOne(rng, [10000, 20000, 25000, 50000, 100000, 200000, 500000]), int(rng, 1, 9)],
    /**
     * 參數是否合用。
     * @param {number[]} p 參數。
     * @returns {boolean} 合用時為 true。
     */
    valid: (p) => p.length === 2 && [10000, 20000, 25000, 50000, 100000, 200000, 500000].includes(p[0]) && Number.isInteger(p[1]) && p[1] >= 1 && p[1] <= 9,
    /**
     * 組題。
     * @param {number[]} p 參數。
     * @returns {object} 題目內容。
     */
    build: ([s, d]) => {
      const meters = (d * s) / 100;
      /**
       * 距離文字：1,000 公尺以上用公里。
       * @param {number} m 公尺。
       * @returns {string} 文字。
       */
      const dist = (m) => (m >= 1000 ? `${comma(m / 1000)} 公里` : `${comma(m)} 公尺`);
      return {
        question: `一張地圖的比例尺是 1：${comma(s)}。地圖上兩地相距 ${d} 公分，實際距離是多少？`,
        ...options(dist(meters), [
          { text: dist(meters * 10), hint: '公分換成公尺時，要除以 100，你是不是只除以 10？' },
          { text: dist(meters / 10), hint: '公分換成公尺要除以 100，你是不是除了 1,000？' },
          { text: dist(meters * 100), hint: '你是不是把「公分」直接當成「公尺」了？' },
        ]),
        keys: [`1：${comma(s)} 表示地圖上 1 公分，實際是 ${comma(s)} 公分。`, '先算出實際有幾公分，再想想公分換成公尺、公尺換成公里，各要除以多少。'],
        explain: `${d} × ${comma(s)} ＝ ${comma(d * s)} 公分；除以 100 得 ${comma(meters)} 公尺${meters >= 1000 ? `，也就是 ${comma(meters / 1000)} 公里` : ''}。`,
      };
    },
  },
  'time-zone': {
    difficulties: ['hard', 'expert'],
    subject: 'geography',
    topic: 'map',
    card: 'tpl-timezone',
    /**
     * 產生參數：[甲地經度, 乙地經度, 甲地時刻]（經度為 15 的倍數，東經為正）。
     * @param {() => number} rng 亂數。
     * @returns {number[]} 參數。
     */
    params: (rng) => [int(rng, -11, 12) * 15, int(rng, -11, 12) * 15, int(rng, 0, 23)],
    /**
     * 參數是否合用：兩地經度不同。
     * @param {number[]} p 參數。
     * @returns {boolean} 合用時為 true。
     */
    valid: (p) => p.length === 3 && p.slice(0, 2).every((l) => Number.isInteger(l) && l % 15 === 0 && l >= -165 && l <= 180) && p[0] !== p[1] && Number.isInteger(p[2]) && p[2] >= 0 && p[2] <= 23,
    /**
     * 組題。
     * @param {number[]} p 參數。
     * @returns {object} 題目內容。
     */
    build: ([a, b, h]) => {
      const diff = (b - a) / 15;
      const [rh, rd] = shiftHour(h, diff);
      const right = timeText(rh, rd);
      const cands = [
        [shiftHour(h, -diff), '時間的加減方向反了。想一想：太陽從東邊升起，哪一邊的時間比較早到？'],
        [shiftHour(h, diff + (diff > 0 ? -1 : 1)), '經度每差 15 度差 1 小時，再算一次兩地差了幾個 15 度。'],
        [[rh, rd === 0 ? (diff > 0 ? 1 : -1) : 0], '時刻算對了，但日期呢？超過午夜 12 點或回到前一天要注意。'],
        [shiftHour(h, diff * 2), '你是不是把經度每差 15 度算成差 2 小時？'],
      ];
      const wrongs = [];
      for (const [[wh, wd], hint] of cands) {
        const t = timeText(wh, wd);
        if (t !== right && !wrongs.some((w) => w.text === t) && wrongs.length < 3) wrongs.push({ text: t, hint });
      }
      return {
        question: `甲地位在${lonText(a)}，乙地位在${lonText(b)}。甲地是${timeText(h, 0).slice(3)}時，乙地是幾點？（只考慮經度，每 15 度差 1 小時）`,
        ...options(right, wrongs),
        keys: ['經度每差 15 度，時間差 1 小時；先算出兩地差了幾度。', '乙地在甲地的東邊還是西邊？東邊的時間比較早還是比較晚？'],
        explain: `兩地經度相差 ${Math.abs(b - a)} 度，${Math.abs(b - a)} ÷ 15 ＝ ${Math.abs(diff)} 小時。乙地在甲地的${diff > 0 ? '東' : '西'}邊，時間${diff > 0 ? '早' : '晚'} ${Math.abs(diff)} 小時，所以是${right}。`,
      };
    },
  },
  'lat-lon': {
    difficulties: ['hard'],
    subject: 'geography',
    topic: 'map',
    card: 'tpl-hemisphere',
    /**
     * 產生參數：[緯度（北為正）, 經度（東為正）]，避開 0 度與 180 度。
     * @param {() => number} rng 亂數。
     * @returns {number[]} 參數。
     */
    params: (rng) => [int(rng, 1, 80) * (rng() < 0.5 ? 1 : -1), int(rng, 1, 179) * (rng() < 0.5 ? 1 : -1)],
    /**
     * 參數是否合用。
     * @param {number[]} p 參數。
     * @returns {boolean} 合用時為 true。
     */
    valid: (p) => p.length === 2 && Number.isInteger(p[0]) && Number.isInteger(p[1]) && Math.abs(p[0]) >= 1 && Math.abs(p[0]) <= 80 && Math.abs(p[1]) >= 1 && Math.abs(p[1]) <= 179,
    /**
     * 組題。
     * @param {number[]} p 參數。
     * @returns {object} 題目內容。
     */
    build: ([lat, lon]) => {
      const ns = lat > 0 ? '北半球' : '南半球';
      const ew = lon > 0 ? '東半球' : '西半球';
      const other = { 北半球: '南半球', 南半球: '北半球', 東半球: '西半球', 西半球: '東半球' };
      return {
        question: `某地位在${lat > 0 ? '北' : '南'}緯 ${Math.abs(lat)} 度、${lonText(lon)}。這個地方位在哪兩個半球？`,
        ...options(`${ns}、${ew}`, [
          { text: `${other[ns]}、${ew}`, hint: '南北半球看的是緯度。緯度的「北緯」「南緯」對應哪個半球？' },
          { text: `${ns}、${other[ew]}`, hint: '東西半球看的是經度。「東經」「西經」分別對應哪個半球？' },
          { text: `${other[ns]}、${other[ew]}`, hint: '緯度決定南北、經度決定東西，兩個都再對照一次。' },
        ]),
        keys: ['赤道以北是北半球、以南是南半球；這要看緯度。', '本初子午線以東是東半球、以西是西半球；這要看經度。'],
        explain: `${lat > 0 ? '北' : '南'}緯在${ns}，${lon > 0 ? '東' : '西'}經在${ew}，所以這個地方位在${ns}、${ew}。`,
      };
    },
  },
};

/** 模板代碼。 */
export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

/**
 * 依模板與參數組成完整題目（與題庫題目相同格式）。
 * @param {string} key 模板代碼。
 * @param {number[]} params 參數。
 * @returns {object | null} 題目；模板不存在或參數不合用時為 null。
 */
export function buildQuestion(key, params) {
  const t = TEMPLATES[key];
  if (!t || !t.valid(params)) return null;
  const body = t.build(params);
  const difficulty = t.difficulties[0];
  return { id: `${key}#${params.join('_')}`, template: key, difficulty, subject: t.subject, topic: t.topic, grade: GRADE_RANGE[difficulty][0], type: 'choice', card: t.card, ...body };
}

/**
 * 由模板題 id 重建題目。
 * @param {string} id 例如「century#1624」。
 * @returns {object | null} 題目；不是模板題或參數不合用時為 null。
 */
export function questionFromId(id) {
  const m = /^([a-z-]+)#(-?\d+(?:_-?\d+)*)$/.exec(String(id));
  if (!m) return null;
  return buildQuestion(m[1], m[2].split('_').map(Number));
}

/**
 * 以亂數產生一題模板題（參數不合用就重抽，最多 50 次）。
 * @param {string} key 模板代碼。
 * @param {() => number} rng 亂數。
 * @param {Set<string>} [avoid] 要避開的題目 id（最近出過的參數）。
 * @returns {object | null} 題目。
 */
export function generate(key, rng, avoid = new Set()) {
  const t = TEMPLATES[key];
  for (let i = 0; i < 50; i++) {
    const p = t.params(rng);
    const q = buildQuestion(key, p);
    if (q && !avoid.has(q.id) && new Set(q.options.map((o) => o.text)).size === 4) return q;
  }
  return null;
}

/**
 * 某難度、科目、主題可用的模板。
 * @param {string} difficulty 難度代碼。
 * @param {string} subject 科目代碼或 `all`。
 * @param {string[]} topics 主題（空陣列表示全部）。
 * @returns {string[]} 模板代碼。
 */
export function templatesFor(difficulty, subject, topics = []) {
  return TEMPLATE_KEYS.filter((k) => {
    const t = TEMPLATES[k];
    return t.difficulties.includes(difficulty) && (subject === 'all' || t.subject === subject) && (!topics.length || topics.includes(t.topic));
  });
}
