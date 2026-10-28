// 題型模板：依參數產生「換數字就是新題目」的奧數選擇題，答案與誘答選項由程式計算。

/** 星期的顯示名稱（索引 0 為星期一）。 */
const WEEKDAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];

/** 產生一題時最多嘗試的參數組數（超過即視為模板設計錯誤）。 */
const MAX_TRIES = 200;

/**
 * 以種子建立可重現的亂數產生器（mulberry32）。
 * @param {number} seed 32 位元整數種子。
 * @returns {() => number} 每次呼叫回傳 [0, 1) 的亂數。
 */
export function createRng(seed) {
  let a = seed >>> 0;
  // 回傳下一個亂數。
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 取 [min, max] 之間的隨機整數。
 * @param {() => number} rng 亂數產生器。
 * @param {number} min 最小值（含）。
 * @param {number} max 最大值（含）。
 * @returns {number} 隨機整數。
 */
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * 由文字算出 0～3 的固定值（同一組選項永遠得到同一個值，讓由 id 重建的題目不變）。
 * @param {string} text 文字。
 * @returns {number} 0～3。
 */
function spread(text) {
  // FNV-1a 雜湊，再混合高位元，避免相近的文字得到相同的值。
  let h = 0x811c9dc5;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  h ^= h >>> 16;
  return Math.imul(h, 0x45d9f3b) >>> 30;
}

/**
 * 組成 4 個數字選項：正解放在索引 0，3 個誘答優先取常見錯誤，不足時以正解附近的數補足。
 * 比正解小的誘答個數（0～3）依題目固定地變化，讓正解在選項大小順序中的名次不固定，不能靠「選最小的」猜答案。
 * @param {number} answer 正解。
 * @param {number[]} wrongs 誘答候選（依優先順序，取自常見錯誤；非正整數或與正解相同的會略過）。
 * @param {string} unit 單位（例如「隻」），空字串表示不加單位。
 * @returns {string[]} 4 個互不相同的選項文字。
 */
function numberChoices(answer, wrongs, unit) {
  const ok = (n) => Number.isInteger(n) && n > 0 && n !== answer;
  const uniq = (list) => list.filter((n, i) => ok(n) && list.indexOf(n) === i);
  const below = uniq([...wrongs.filter((n) => n < answer), answer - 1, answer - 2, answer - 3]);
  const above = uniq([...wrongs.filter((n) => n > answer), answer + 1, answer + 2, answer + 3]);
  const want = Math.min(spread(`${answer}|${wrongs.join(',')}`), below.length);
  const picked = [...below.slice(0, want), ...above.slice(0, 3 - want)];
  return [answer, ...picked].map((n) => (unit ? `${n} ${unit}` : String(n)));
}

/** 植樹模板的種法：兩端都種、只種一端、兩端都不種、圍成一圈。 */
const TREE_MODES = ['both', 'one', 'none', 'circle'];

/** 植樹模板可用的間隔（公尺）。 */
const TREE_GAPS = [2, 3, 4, 5, 6, 10];

/**
 * 檢查參數是否為指定個數的整數，且各自落在 [最小, 最大] 之間。
 * @param {number[]} p 參數。
 * @param {Array<[number, number]>} ranges 每個參數的範圍。
 * @returns {boolean} 是否符合。
 */
function inRanges(p, ranges) {
  return Array.isArray(p) && p.length === ranges.length
    && p.every((n, i) => Number.isInteger(n) && n >= ranges[i][0] && n <= ranges[i][1]);
}

/**
 * 所有題型模板。每個模板：
 * - `params(rng)`：隨機產生候選參數陣列（正整數）。
 * - `valid(p)`：參數是否合用（範圍與題意限制）；產生題目與讀取存檔時共用，不合用的候選重抽、不合用的存檔視為損毀。
 * - `build(p)`：依參數組成題目（欄位同題庫，`answer` 固定為 0，顯示時另行打亂選項）。
 */
export const TEMPLATES = {
  'chicken-legs': {
    difficulty: 'medium',
    topic: 'chicken',
    /**
     * 雞兔同籠候選參數：[總隻數, 兔子隻數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      const heads = randInt(rng, 8, 20);
      return [heads, randInt(rng, 3, heads - 2)];
    },
    /**
     * 雞兔同籠參數是否合用：總隻數 8～20、兔子至少 3 隻（避免正解與解題重點中的「多 2 隻」相同）、雞至少 2 隻，且雞兔數量不同（避免誘答與正解相同）。
     * @param {number[]} p 參數 [總隻數, 兔子隻數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[8, 20], [3, 18]]) && p[1] <= p[0] - 2 && p[1] * 2 !== p[0];
    },
    /**
     * 組成雞兔同籠題目。
     * @param {number[]} p 參數 [總隻數, 兔子隻數]。
     * @returns {object} 題目。
     */
    build([heads, rabbits]) {
      const chickens = heads - rabbits;
      const legs = chickens * 2 + rabbits * 4;
      return {
        question: `籠子裡有雞和兔子共 ${heads} 隻，數一數腳共有 ${legs} 隻。兔子有幾隻？`,
        // 誘答：答成雞的隻數、忘了除以 2、腳數除以 2 後忘了減總隻數、假設全是兔子後忘了除以 2。
        choices: numberChoices(rabbits, [chickens, rabbits * 2, legs / 2, heads * 4 - legs], '隻'),
        keys: [
          `假設 ${heads} 隻全部都是雞，一共會有幾隻腳？和 ${legs} 隻差多少？`,
          '把 1 隻雞換成 1 隻兔子，腳就多 2 隻。少掉的腳要換幾次才補得回來？',
        ],
        explain: `全是雞時有 ${heads} × 2 ＝ ${heads * 2} 隻腳，少了 ${legs} － ${heads * 2} ＝ ${legs - heads * 2} 隻。每換一隻兔子多 2 隻腳，要換 ${legs - heads * 2} ÷ 2 ＝ ${rabbits} 次，所以兔子有 ${rabbits} 隻（雞有 ${chickens} 隻）。`,
      };
    },
  },

  'tree-planting': {
    difficulty: 'medium',
    topic: 'tree',
    /**
     * 植樹候選參數：[種法索引 + 1, 間隔公尺, 段數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 1, TREE_MODES.length), TREE_GAPS[randInt(rng, 0, TREE_GAPS.length - 1)], randInt(rng, 4, 12)];
    },
    /**
     * 植樹參數是否合用：種法 1～4、間隔為 TREE_GAPS 之一、段數 4～12。
     * @param {number[]} p 參數 [種法索引 + 1, 間隔公尺, 段數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[1, TREE_MODES.length], [1, 100], [4, 12]]) && TREE_GAPS.includes(p[1]);
    },
    /**
     * 組成植樹題目。
     * @param {number[]} p 參數 [種法索引 + 1, 間隔公尺, 段數]。
     * @returns {object} 題目。
     */
    build([modeNo, gap, segments]) {
      const mode = TREE_MODES[modeNo - 1];
      const length = gap * segments;
      const answer = { both: segments + 1, one: segments, none: segments - 1, circle: segments }[mode];
      const place = mode === 'circle'
        ? `繞圓形水池走一圈是 ${length} 公尺，沿著池邊每隔 ${gap} 公尺種一棵樹`
        : `在一條長 ${length} 公尺的路的一旁，每隔 ${gap} 公尺種一棵樹，${{ both: '兩端都要種', one: '起點要種、終點不種', none: '兩端都不種' }[mode]}`;
      const rule = {
        both: '兩端都種時，樹比段數多 1',
        one: '只種一端時，樹和段數一樣多',
        none: '兩端都不種時，樹比段數少 1',
        circle: '圍成一圈時頭尾相接，樹和段數一樣多',
      }[mode];
      return {
        question: `${place}，一共要種幾棵樹？`,
        // 誘答：其他種法的棵數（段數、段數 ± 1）、誤以為路的兩旁都種（正解 × 2）。
        choices: numberChoices(answer, [segments, segments + 1, segments - 1, answer * 2], '棵'),
        keys: [
          mode === 'circle' ? '先算池邊一圈被分成了幾段。' : '先算這條路被分成了幾段。',
          mode === 'circle'
            ? '繞一圈的路頭尾接在一起，起點和終點是同一個位置。這時樹的數量和段數比起來是多、少還是一樣？'
            : '畫一畫只有 2 段的情況，照題目的種法數數看要幾棵，再看樹的數量和段數差多少。',
        ],
        explain: `${length} ÷ ${gap} ＝ ${segments} 段。${rule}，所以是 ${answer} 棵。`,
      };
    },
  },

  'weekday-cycle': {
    difficulty: 'medium',
    topic: 'cycle',
    /**
     * 星期週期候選參數：[今天星期索引 + 1, 經過天數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 1, 7), randInt(rng, 20, 200)];
    },
    /**
     * 星期週期參數是否合用：星期 1～7、天數 20～200，且天數不是 7 的倍數（避免與「還是今天」的誘答重疊而失去鑑別度）。
     * @param {number[]} p 參數 [今天星期索引 + 1, 經過天數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[1, 7], [20, 200]]) && p[1] % 7 !== 0;
    },
    /**
     * 組成星期週期題目。
     * @param {number[]} p 參數 [今天星期索引 + 1, 經過天數]。
     * @returns {object} 題目。
     */
    build([todayNo, days]) {
      const today = todayNo - 1;
      const rest = days % 7;
      const at = (offset) => WEEKDAYS[(today + offset + 7 * 30) % 7];
      const answer = at(rest);
      // 誘答：把今天算成第 1 天（少一天）、多數一天、以為剛好整除（還是今天）。
      const choices = [answer];
      for (const w of [at(rest - 1), at(rest + 1), at(0), at(rest + 2), at(rest - 2)]) {
        if (choices.length < 4 && !choices.includes(w)) choices.push(w);
      }
      return {
        question: `今天是${WEEKDAYS[today]}，再過 ${days} 天是星期幾？`,
        choices,
        keys: [
          `一個星期有 7 天，每過 7 天就會又回到${WEEKDAYS[today]}。`,
          `${days} 天裡有幾個完整的星期？還剩下幾天？從${WEEKDAYS[today]}往後數剩下的天數（今天不算）。`,
        ],
        explain: `${days} ÷ 7 ＝ ${Math.floor(days / 7)} … ${rest}，也就是 ${Math.floor(days / 7)} 個星期又 ${rest} 天，從${WEEKDAYS[today]}往後數 ${rest} 天是${answer}。`,
      };
    },
  },

  'age-multiple': {
    difficulty: 'medium',
    topic: 'age',
    /**
     * 年齡倍數候選參數：[倍數, 那時女兒的年齡, 再過幾年]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 2, 4), randInt(rng, 6, 20), randInt(rng, 2, 12)];
    },
    /**
     * 年齡倍數參數是否合用：女兒今年至少 3 歲，母女相差 18～40 歲。
     * @param {number[]} p 參數 [倍數, 那時女兒的年齡, 再過幾年]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      if (!inRanges(p, [[2, 4], [6, 20], [2, 12]])) return false;
      const [k, then, years] = p;
      const gap = (k - 1) * then;
      return then - years >= 3 && gap >= 18 && gap <= 40;
    },
    /**
     * 組成年齡倍數題目。
     * @param {number[]} p 參數 [倍數, 那時女兒的年齡, 再過幾年]。
     * @returns {object} 題目。
     */
    build([k, then, years]) {
      const daughter = then - years;
      const gap = (k - 1) * then;
      const mother = daughter + gap;
      return {
        question: `媽媽今年 ${mother} 歲，女兒今年 ${daughter} 歲。再過幾年，媽媽的年齡會是女兒的 ${k} 倍？`,
        // 誘答：答成那時女兒的年齡、把今年的年齡差直接除以倍數。
        choices: numberChoices(years, [then, gap / k, years + 2, years - 2], '年'),
        keys: [
          '媽媽和女兒的年齡差永遠不會改變，先算出相差幾歲。',
          `媽媽是女兒的 ${k} 倍時，兩人相差的歲數剛好是女兒年齡的幾倍？由此求出那時女兒幾歲。`,
        ],
        explain: k === 2
          ? `年齡差是 ${mother} － ${daughter} ＝ ${gap} 歲。媽媽是女兒的 2 倍時，女兒的年齡正好等於年齡差 ${gap} 歲，所以要再過 ${gap} － ${daughter} ＝ ${years} 年。`
          : `年齡差是 ${mother} － ${daughter} ＝ ${gap} 歲。媽媽是女兒的 ${k} 倍時，年齡差是女兒年齡的 ${k} － 1 ＝ ${k - 1} 倍，女兒那時 ${gap} ÷ ${k - 1} ＝ ${then} 歲，所以要再過 ${then} － ${daughter} ＝ ${years} 年。`,
      };
    },
  },

  'queue-position': {
    difficulty: 'easy',
    topic: 'count',
    /**
     * 排隊候選參數：[從前面數第幾個, 從後面數第幾個]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 2, 15), randInt(rng, 2, 15)];
    },
    /**
     * 排隊參數是否合用：兩個位置都在 2～15。
     * @param {number[]} p 參數 [從前面數第幾個, 從後面數第幾個]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[2, 15], [2, 15]]);
    },
    /**
     * 組成排隊題目。
     * @param {number[]} p 參數 [從前面數第幾個, 從後面數第幾個]。
     * @returns {object} 題目。
     */
    build([front, back]) {
      const answer = front + back - 1;
      return {
        question: `小朋友排成一排。小明從前面數是第 ${front} 個，從後面數是第 ${back} 個。這一排一共有幾個小朋友？`,
        // 誘答：小明算了兩次、小明沒算到、多算一個。
        choices: numberChoices(answer, [front + back, front + back - 2, front + back + 1], '人'),
        keys: [
          '畫一排圓圈代表小朋友，把小明圈起來。數數看，小明前面有幾個人？後面有幾個人？',
          '前面的人、後面的人，再加上小明自己。小心小明不要算兩次，也不要漏掉。',
        ],
        explain: `小明前面有 ${front} － 1 ＝ ${front - 1} 人，後面有 ${back} － 1 ＝ ${back - 1} 人，再加上小明自己：${front - 1} ＋ ${back - 1} ＋ 1 ＝ ${answer} 人。`,
      };
    },
  },

  'sequence-add': {
    difficulty: 'easy',
    topic: 'pattern',
    /**
     * 等差數列候選參數：[第一個數, 每次加多少]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 1, 20), randInt(rng, 2, 9)];
    },
    /**
     * 等差數列參數是否合用：第一個數 1～20、每次加 2～9。
     * @param {number[]} p 參數 [第一個數, 每次加多少]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[1, 20], [2, 9]]);
    },
    /**
     * 組成等差數列題目（列出 5 個數，問第 6 個）。
     * @param {number[]} p 參數 [第一個數, 每次加多少]。
     * @returns {object} 題目。
     */
    build([start, step]) {
      const terms = [0, 1, 2, 3, 4].map((i) => start + i * step);
      const last = terms[4];
      const answer = last + step;
      return {
        question: `找規律：${terms.join('、')}、□，□ 裡應該填多少？`,
        // 誘答：多加一次、差一點的數。
        choices: numberChoices(answer, [answer + step, answer + 1, answer - 1], ''),
        keys: [
          '算算看相鄰兩個數之間各差多少。',
          '每次都加上同一個數。把最後一個數再加一次就是 □。',
        ],
        explain: `每次都加 ${step}，所以 ${last} ＋ ${step} ＝ ${answer}。`,
      };
    },
  },

  'marble-sumdiff': {
    difficulty: 'easy',
    topic: 'sumdiff',
    /**
     * 和差候選參數：[弟弟的顆數, 哥哥比弟弟多幾顆]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 2, 9), randInt(rng, 2, 9)];
    },
    /**
     * 和差參數是否合用：弟弟 2～9 顆、相差 2～9 顆（平分的數在九九乘法範圍內）。
     * @param {number[]} p 參數 [弟弟的顆數, 相差顆數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[2, 9], [2, 9]]);
    },
    /**
     * 組成和差題目（求較少的一方）。
     * @param {number[]} p 參數 [弟弟的顆數, 相差顆數]。
     * @returns {object} 題目。
     */
    build([small, diff]) {
      const total = small * 2 + diff;
      return {
        question: `哥哥和弟弟一共有 ${total} 顆彈珠，哥哥比弟弟多 ${diff} 顆。弟弟有幾顆彈珠？`,
        // 誘答：答成哥哥的顆數、總數直接平分、先平分再從弟弟那份扣掉相差的數、拿走相差的部分後忘了平分。
        choices: numberChoices(small, [small + diff, total / 2, total / 2 - diff, total - diff], '顆'),
        keys: [
          '如果先把哥哥多出來的那幾顆拿走，剩下的彈珠兩個人一樣多。',
          '拿走以後還剩幾顆？把剩下的平分成兩份，一份就是弟弟的。',
        ],
        explain: `先拿走哥哥多的 ${diff} 顆，剩 ${total} － ${diff} ＝ ${total - diff} 顆，兩人一樣多。${total - diff} 平分成兩份，每份 ${small} 顆（${small} ＋ ${small} ＝ ${total - diff}），所以弟弟有 ${small} 顆（哥哥有 ${small + diff} 顆）。`,
      };
    },
  },

  'age-gap': {
    difficulty: 'easy',
    topic: 'age',
    /**
     * 年齡差候選參數：[小華今年幾歲, 母子相差幾歲, 再過幾年]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 3, 10), randInt(rng, 20, 40), randInt(rng, 2, 9)];
    },
    /**
     * 年齡差參數是否合用：小華 3～10 歲、相差 20～40 歲、再過 2～9 年。
     * @param {number[]} p 參數 [小華今年幾歲, 相差幾歲, 再過幾年]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[3, 10], [20, 40], [2, 9]]);
    },
    /**
     * 組成年齡差題目。
     * @param {number[]} p 參數 [小華今年幾歲, 相差幾歲, 再過幾年]。
     * @returns {object} 題目。
     */
    build([child, gap, years]) {
      const mother = child + gap;
      return {
        question: `小華今年 ${child} 歲，媽媽今年 ${mother} 歲。${years} 年後，媽媽比小華大幾歲？`,
        // 誘答：把經過的年數加上去或減掉、答成媽媽或小華那時的年齡。
        choices: numberChoices(gap, [gap + years, gap - years, mother + years, child + years], '歲'),
        keys: [
          `過了 ${years} 年，小華長大了幾歲？媽媽又長大了幾歲？`,
          '兩個人每年長大的歲數一樣多，所以他們相差的歲數會不會改變？先算今年差幾歲。',
        ],
        explain: `兩人每年都長大 1 歲，年齡差永遠不變。今年差 ${mother} － ${child} ＝ ${gap} 歲，${years} 年後還是差 ${gap} 歲。`,
      };
    },
  },

  'score-quiz': {
    difficulty: 'hard',
    topic: 'chicken',
    /**
     * 答題得分候選參數：[總題數, 答對得幾分, 答錯扣幾分, 答對題數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      const total = randInt(rng, 10, 25);
      const plus = randInt(rng, 3, 6);
      return [total, plus, randInt(rng, 1, Math.min(4, plus - 1)), randInt(rng, Math.ceil(total / 2), total - 2)];
    },
    /**
     * 答題得分參數是否合用：答對至少一半、至少答錯 2 題、扣分比得分少，且總分為正。
     * @param {number[]} p 參數 [總題數, 答對得分, 答錯扣分, 答對題數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      if (!inRanges(p, [[10, 25], [3, 6], [1, 4], [1, 23]])) return false;
      const [total, plus, minus, right] = p;
      return right >= Math.ceil(total / 2) && right <= total - 2 && minus < plus && plus * right - minus * (total - right) > 0;
    },
    /**
     * 組成答題得分題目。
     * @param {number[]} p 參數 [總題數, 答對得分, 答錯扣分, 答對題數]。
     * @returns {object} 題目。
     */
    build([total, plus, minus, right]) {
      const wrong = total - right;
      const score = plus * right - minus * wrong;
      const lost = total * plus - score;
      return {
        question: `數學比賽共 ${total} 題，答對 1 題得 ${plus} 分，答錯或沒作答 1 題扣 ${minus} 分。小美得了 ${score} 分，她答對幾題？`,
        // 誘答：答成答錯的題數、忘了扣分直接除、答對題數差一題。
        choices: numberChoices(right, [wrong, score / plus, right + 1, right - 1], '題'),
        keys: [
          `假設 ${total} 題全部答對，會得幾分？和 ${score} 分差多少？`,
          '每把 1 題從「答對」改成「答錯」，總分會少幾分？注意：不只是少拿分，還要再扣分。',
        ],
        explain: `全對是 ${total} × ${plus} ＝ ${total * plus} 分，差 ${total * plus} － ${score} ＝ ${lost} 分。每錯 1 題少 ${plus} ＋ ${minus} ＝ ${plus + minus} 分，錯了 ${lost} ÷ ${plus + minus} ＝ ${wrong} 題，答對 ${total} － ${wrong} ＝ ${right} 題。`,
      };
    },
  },

  'tree-both-sides': {
    difficulty: 'hard',
    topic: 'tree',
    /**
     * 兩旁植樹候選參數：[種法（1 兩端都種、2 兩端都不種）, 間隔公尺, 段數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 1, 2), TREE_SIDE_GAPS[randInt(rng, 0, TREE_SIDE_GAPS.length - 1)], randInt(rng, 5, 20)];
    },
    /**
     * 兩旁植樹參數是否合用：種法 1～2、間隔為 TREE_SIDE_GAPS 之一、段數 5～20。
     * @param {number[]} p 參數 [種法, 間隔公尺, 段數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[1, 2], [1, 100], [5, 20]]) && TREE_SIDE_GAPS.includes(p[1]);
    },
    /**
     * 組成兩旁植樹題目。
     * @param {number[]} p 參數 [種法, 間隔公尺, 段數]。
     * @returns {object} 題目。
     */
    build([mode, gap, segments]) {
      const both = mode === 1;
      const oneSide = both ? segments + 1 : segments - 1;
      const answer = oneSide * 2;
      const length = gap * segments;
      return {
        question: `在一條長 ${length} 公尺的路的兩旁，每隔 ${gap} 公尺種一棵樹，${both ? '兩端都要種' : '兩端都不種'}。一共要種幾棵樹？`,
        // 誘答：只算一邊、兩旁都用段數算、另一種種法的棵數。
        choices: numberChoices(answer, [oneSide, segments * 2, both ? (segments - 1) * 2 : (segments + 1) * 2], '棵'),
        keys: [
          '先只算一邊：這條路被分成幾段？照題目的種法，一邊要種幾棵？',
          '題目說的是路的「兩旁」，算好一邊以後別忘了另一邊。',
        ],
        explain: `一邊有 ${length} ÷ ${gap} ＝ ${segments} 段，${both ? '兩端都種，樹比段數多 1' : '兩端都不種，樹比段數少 1'}，一邊種 ${oneSide} 棵，兩旁共 ${oneSide} × 2 ＝ ${answer} 棵。`,
      };
    },
  },

  'chase': {
    difficulty: 'hard',
    topic: 'travel',
    /**
     * 追及候選參數：[小明每分鐘公尺數 ÷ 5, 先走幾分鐘, 幾分鐘後追上]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 10, 16), randInt(rng, 4, 15), randInt(rng, 2, 12)];
    },
    /**
     * 追及參數是否合用：哥哥的速度為整數且每分鐘不超過 400 公尺；追上時間不等於先走時間（避免錯誤想法也答對）。
     * @param {number[]} p 參數 [小明速度 ÷ 5, 先走分鐘, 追上分鐘]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      if (!inRanges(p, [[10, 16], [4, 15], [2, 12]])) return false;
      const [v5, head, catchUp] = p;
      const lead = v5 * 5 * head;
      return catchUp !== head && lead % catchUp === 0 && v5 * 5 + lead / catchUp <= 400;
    },
    /**
     * 組成追及題目。
     * @param {number[]} p 參數 [小明速度 ÷ 5, 先走分鐘, 追上分鐘]。
     * @returns {object} 題目。
     */
    build([v5, head, catchUp]) {
      const slow = v5 * 5;
      const lead = slow * head;
      const fast = slow + lead / catchUp;
      return {
        question: `小明每分鐘走 ${slow} 公尺，他出發 ${head} 分鐘後，哥哥從同一個地點騎腳踏車去追，每分鐘騎 ${fast} 公尺。哥哥騎幾分鐘後會追上小明？`,
        // 誘答：用哥哥的速度直接除、把兩人速度相加、答成小明先走的時間。
        choices: numberChoices(catchUp, [lead / fast, lead / (fast + slow), head, catchUp + 1], '分鐘'),
        keys: [
          '哥哥出發時，小明已經走了多遠？這就是哥哥要追的距離。',
          '哥哥每分鐘比小明多前進幾公尺？要幾分鐘才能把距離追完？',
        ],
        explain: `哥哥出發時小明已走 ${slow} × ${head} ＝ ${lead} 公尺。哥哥每分鐘多騎 ${fast} － ${slow} ＝ ${fast - slow} 公尺，${lead} ÷ ${fast - slow} ＝ ${catchUp} 分鐘追上。`,
      };
    },
  },

  'work-together': {
    difficulty: 'hard',
    topic: 'work',
    /**
     * 合作工程候選參數：[甲單獨幾天, 乙單獨幾天]（從可整除的組合中挑選）。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return WORK_PAIRS[randInt(rng, 0, WORK_PAIRS.length - 1)].slice();
    },
    /**
     * 合作工程參數是否合用：甲比乙快，且合作天數為整數。
     * @param {number[]} p 參數 [甲天數, 乙天數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[2, 60], [3, 60]]) && WORK_PAIRS.some(([a, b]) => a === p[0] && b === p[1]);
    },
    /**
     * 組成合作工程題目。
     * @param {number[]} p 參數 [甲天數, 乙天數]。
     * @returns {object} 題目。
     */
    build([a, b]) {
      const answer = (a * b) / (a + b);
      const lcm = (a * b) / gcd(a, b);
      return {
        question: `一件工作，甲單獨做要 ${a} 天完成，乙單獨做要 ${b} 天完成。兩人一起做，幾天可以完成？`,
        // 誘答：取兩人天數的平均、天數相減、天數相加。
        choices: numberChoices(answer, [(a + b) / 2, b - a, a + b, answer + 1], '天'),
        keys: [
          '把整件工作想成 1。甲一天做全部的幾分之幾？乙一天呢？',
          '兩人一天合起來做了全部的幾分之幾？要幾天才湊滿 1？',
        ],
        explain: `甲一天做 1/${a}，乙一天做 1/${b}，通分後合起來一天做 ${lcm / a}/${lcm} ＋ ${lcm / b}/${lcm} ＝ ${lcm / a + lcm / b}/${lcm} ＝ 1/${answer}，所以 ${answer} 天完成。`,
      };
    },
  },

  'power-remainder': {
    difficulty: 'expert',
    topic: 'remainder',
    /**
     * 連乘餘數候選參數：[底數, 連乘個數, 除數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 2, 9), randInt(rng, 20, 200), POWER_MODS[randInt(rng, 0, POWER_MODS.length - 1)]];
    },
    /**
     * 連乘餘數參數是否合用：底數與除數互質（餘數從頭就循環），且循環長度至少 2。
     * @param {number[]} p 參數 [底數, 個數, 除數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      if (!inRanges(p, [[2, 9], [20, 200], [5, 9]]) || !POWER_MODS.includes(p[2])) return false;
      return gcd(p[0], p[2]) === 1 && p[0] % p[2] !== 1;
    },
    /**
     * 組成連乘餘數題目。
     * @param {number[]} p 參數 [底數, 個數, 除數]。
     * @returns {object} 題目。
     */
    build([base, count, mod]) {
      const cycle = [];
      let r = base % mod;
      while (!cycle.includes(r)) {
        cycle.push(r);
        r = (r * base) % mod;
      }
      const period = cycle.length;
      const at = (k) => cycle[(((k - 1) % period) + period) % period];
      const answer = at(count);
      const rem = count % period;
      // 誘答：少乘或多乘一個時的餘數，再以其他餘數補足。
      const choices = [answer];
      for (const c of [at(count - 1), at(count + 1), at(count + 2), ...Array.from({ length: mod }, (_, i) => i)]) {
        if (choices.length < 4 && !choices.includes(c)) choices.push(c);
      }
      return {
        question: `把 ${count} 個 ${base} 連乘起來，所得的乘積除以 ${mod}，餘數是多少？`,
        choices: choices.map(String),
        keys: [
          `先算 ${base}、${base} × ${base}、${base} × ${base} × ${base}……除以 ${mod} 的餘數。只要拿上一個餘數乘 ${base} 再除以 ${mod} 就好，不必算出很大的數。`,
          '餘數會循環出現。一輪有幾個？連乘的個數除以一輪的個數，看餘數落在循環中的第幾個。',
        ],
        explain: `${base} 連乘時，除以 ${mod} 的餘數依序是 ${cycle.join('、')}，每 ${period} 個一循環。${rem ? `${count} ÷ ${period} ＝ ${Math.floor(count / period)} … ${rem}，對應循環中的第 ${rem} 個` : `${count} ÷ ${period} ＝ ${count / period}，剛好整除，對應循環中的最後一個（第 ${period} 個）`}，餘數是 ${answer}。`,
      };
    },
  },

  'train-bridge': {
    difficulty: 'expert',
    topic: 'travel',
    /**
     * 火車過橋候選參數：[每秒公尺數（5 的倍數）, 共需幾秒, 車長走完需幾秒]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 2, 6) * 5, randInt(rng, 20, 90), randInt(rng, 5, 20)];
    },
    /**
     * 火車過橋參數是否合用：速度為 5 的倍數（方便心算）、車長 100～400 公尺、橋長至少 200 公尺。
     * @param {number[]} p 參數 [速度, 總秒數, 車長秒數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      if (!inRanges(p, [[10, 30], [20, 90], [5, 20]]) || p[0] % 5 !== 0) return false;
      const [v, total, k] = p;
      return v * k >= 100 && v * k <= 400 && v * (total - k) >= 200;
    },
    /**
     * 組成火車過橋題目。
     * @param {number[]} p 參數 [速度, 總秒數, 車長秒數]。
     * @returns {object} 題目。
     */
    build([v, total, k]) {
      const train = v * k;
      const bridge = v * (total - k);
      return {
        question: `一列火車長 ${train} 公尺，以每秒 ${v} 公尺的速度通過一座長 ${bridge} 公尺的橋。從車頭剛上橋到車尾完全離開橋，一共需要幾秒？`,
        // 誘答：只算橋長、橋長減車長、只算車長、車長算了兩次。
        choices: numberChoices(total, [bridge / v, (bridge - train) / v, k, (bridge + 2 * train) / v], '秒'),
        keys: [
          '盯著車頭看：從車頭上橋到車尾離橋，車頭一共走了多遠？',
          '車頭要先走完整座橋，車尾才會到橋的另一端。之後還要再走多遠，車尾才離開橋？',
        ],
        explain: `車頭要走橋長加上車長：${bridge} ＋ ${train} ＝ ${bridge + train} 公尺，${bridge + train} ÷ ${v} ＝ ${total} 秒。`,
      };
    },
  },

  'remainder-min': {
    difficulty: 'expert',
    topic: 'remainder',
    /**
     * 同餘候選參數：[除以 3 的餘數, 除以 5 的餘數, 除以 7 的餘數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 1, 2), randInt(rng, 1, 4), randInt(rng, 1, 6)];
    },
    /**
     * 同餘參數是否合用：餘數都不為 0，且最小的數至少 10（不是一眼看出）。
     * @param {number[]} p 參數 [餘 3, 餘 5, 餘 7]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[1, 2], [1, 4], [1, 6]]) && smallestWithRemainders(p) >= 10;
    },
    /**
     * 組成同餘題目。
     * @param {number[]} p 參數 [餘 3, 餘 5, 餘 7]。
     * @returns {object} 題目。
     */
    build([r3, r5, r7]) {
      const answer = smallestWithRemainders([r3, r5, r7]);
      const list = [];
      for (let x = r7; x <= answer; x += 7) list.push(x);
      return {
        question: `有一個數，除以 3 餘 ${r3}，除以 5 餘 ${r5}，除以 7 餘 ${r7}。這個數最小是多少？`,
        // 誘答：只符合其中兩個條件的數（相差 15、21、35），以及符合全部條件但不是最小的數（＋105）。
        choices: numberChoices(answer, [answer - 35, answer - 21, answer - 15, answer + 105, answer + 15, answer + 21, answer + 35], ''),
        keys: [
          '先只看「除以 7」的條件，把符合的數由小到大列出來。這些數每次相差多少？',
          '在列出的數中，一個一個檢查除以 3 和除以 5 的條件。題目要的是「最小」的那一個。',
        ],
        explain: `除以 7 餘 ${r7} 的數依序是 ${list.join('、')}……，其中除以 3 餘 ${r3}、除以 5 餘 ${r5} 的最小數是 ${answer}。（${answer} 再加上 3、5、7 的公倍數 105 也符合，但不是最小。）`,
      };
    },
  },

  'handshake': {
    difficulty: 'expert',
    topic: 'count',
    /**
     * 兩兩配對候選參數：[情境（1 握手、2 單循環賽、3 由場數反推隊數）, 人數或隊數]。
     * @param {() => number} rng 亂數產生器。
     * @returns {number[]} 候選參數。
     */
    params(rng) {
      return [randInt(rng, 1, 3), randInt(rng, 6, 20)];
    },
    /**
     * 兩兩配對參數是否合用：情境 1～3、人數 6～20。
     * @param {number[]} p 參數 [情境, 人數]。
     * @returns {boolean} 是否合用。
     */
    valid(p) {
      return inRanges(p, [[1, 3], [6, 20]]);
    },
    /**
     * 組成兩兩配對題目。
     * @param {number[]} p 參數 [情境, 人數]。
     * @returns {object} 題目。
     */
    build([kind, n]) {
      const matches = (n * (n - 1)) / 2;
      if (kind === 3) {
        return {
          question: `有幾支球隊進行單循環賽（每兩隊都要比賽一場），一共比了 ${matches} 場。一共有幾支球隊？`,
          // 誘答：以為每隊比的場數就是隊數、把場數乘 2 後開錯、差一隊。
          choices: numberChoices(n, [n - 1, n + 1, n * 2, n - 2], '支'),
          keys: [
            '先想一想：如果知道有幾隊，一共要比幾場？每隊都和其他隊各比一場，但每一場被兩隊各算了一次。',
            '從少少的隊數開始試，一隊一隊往上加，看場數什麼時候剛好等於題目說的場數。',
          ],
          explain: `${n} 隊時，每隊要比 ${n - 1} 場，一共比 ${n} × ${n - 1} ÷ 2 ＝ ${matches} 場，正好符合，所以有 ${n} 支球隊。`,
        };
      }
      const answer = matches;
      const shake = kind === 1;
      const unit = shake ? '次' : '場';
      return {
        question: shake
          ? `${n} 位小朋友見面，每兩個人都要握一次手，一共要握幾次手？`
          : `${n} 支球隊進行單循環賽（每兩隊都要比賽一場），一共要比賽幾場？`,
        // 誘答：只算一個人的次數、少算一個人、每次被兩邊重複算、把自己也算進去、人數相乘。
        choices: numberChoices(answer, [n - 1, ((n - 1) * (n - 2)) / 2, n * (n - 1), (n * (n + 1)) / 2, n * n], unit),
        keys: [
          shake ? '先算第一個人要和幾個人握手，再看第二個人還要和幾個「新的」人握手，依序算下去。' : '先算第一隊要比幾場，再看第二隊還要和幾隊「新的」對手比賽，依序算下去。',
          shake ? '把每個人新增的次數加起來。也可以想：每個人都和其他人各握一次，但每次握手被兩個人各算了一次。' : '把每隊新增的場數加起來。也可以想：每隊都和其他隊各比一場，但每一場被兩隊各算了一次。',
        ],
        explain: `${n - 1} ＋ ${n - 2} ＋ … ＋ 1 ＝ ${n} × ${n - 1} ÷ 2 ＝ ${answer} ${unit}。`,
      };
    },
  },
};

/** 兩旁植樹模板可用的間隔（公尺）。 */
const TREE_SIDE_GAPS = [4, 5, 6, 8, 10, 12, 15, 20];

/** 連乘餘數模板可用的除數（循環長度最多 6，小朋友算得完）。 */
const POWER_MODS = [5, 7, 9];

/** 合作工程模板的天數組合：甲比乙快、合作天數為 2 以上的整數。 */
const WORK_PAIRS = (() => {
  const pairs = [];
  for (let a = 2; a <= 60; a++) {
    for (let b = a + 1; b <= 60; b++) {
      if ((a * b) % (a + b) === 0 && (a * b) / (a + b) >= 2) pairs.push([a, b]);
    }
  }
  return pairs;
})();

/**
 * 最大公因數。
 * @param {number} a 正整數。
 * @param {number} b 正整數。
 * @returns {number} 最大公因數。
 */
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * 除以 3、5、7 的餘數分別為指定值的最小正整數。
 * @param {number[]} r 餘數 [除以 3, 除以 5, 除以 7]。
 * @returns {number} 最小正整數。
 */
function smallestWithRemainders([r3, r5, r7]) {
  let x = 1;
  while (x % 3 !== r3 || x % 5 !== r5 || x % 7 !== r7) x++;
  return x;
}

/**
 * 依模板與參數組成完整題目，`id` 為 `<模板代碼>#<參數以 - 連接>`，存檔只需記錄 `id` 即可重建。
 * @param {string} templateId 模板代碼。
 * @param {number[]} params 參數。
 * @returns {object} 題目（欄位同題庫）。
 */
export function buildQuestion(templateId, params) {
  const t = TEMPLATES[templateId];
  return {
    id: `${templateId}#${params.join('-')}`,
    difficulty: t.difficulty,
    topic: t.topic,
    answer: 0,
    ...t.build(params),
  };
}

/**
 * 以亂數產生一題。
 * @param {string} templateId 模板代碼。
 * @param {() => number} rng 亂數產生器。
 * @returns {object} 題目。
 * @throws {Error} 嘗試 MAX_TRIES 次仍無合用參數時。
 */
export function generateQuestion(templateId, rng) {
  const t = TEMPLATES[templateId];
  for (let i = 0; i < MAX_TRIES; i++) {
    const params = t.params(rng);
    if (t.valid(params)) return buildQuestion(templateId, params);
  }
  throw new Error(`模板 ${templateId} 無法產生題目`);
}

/**
 * 由題目 `id` 重建模板題目（讀取存檔用）。
 * @param {string} id 題目代碼，例如 `chicken-legs#12-5`。
 * @returns {object | null} 題目；格式不符、模板不存在或參數不合用時為 null（呼叫端依「資料損毀」處理）。
 */
export function questionFromId(id) {
  const m = /^([a-z-]+)#(\d+(?:-\d+)*)$/.exec(String(id));
  if (!m || !Object.prototype.hasOwnProperty.call(TEMPLATES, m[1])) return null;
  const params = m[2].split('-').map(Number);
  if (!TEMPLATES[m[1]].valid(params)) return null;
  // 寫法不同（例如開頭補 0）的 id 不接受，確保存檔中的 id 與重建結果完全相同。
  const q = buildQuestion(m[1], params);
  return q.id === id ? q : null;
}
