// 發音：使用裝置內建的英文語音合成，只在玩家點按時播放（含拼對時由最後一次點按觸發的自動發音）；沒有英文語音時不提供。
// 裝置的語音清單常包含音質差的精簡語音與趣味語音（如 macOS 的 Albert、Zarvox），所以依音質評分挑選，
// 玩家也可以在設定中自選語音。

/** 趣味或特效語音，聽起來怪異，不使用。 */
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|pipe organ|princess|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|agnes|bruce|vicki)\b/i;
/** 音質較好的語音名稱（Apple、Google、Microsoft 的常見高品質語音）。 */
const GOOD = /\b(samantha|ava|allison|susan|zoe|nicky|evan|tom|karen|daniel|serena|moira|tessa|aria|jenny|guy|michelle|ana|google us english|google uk english)\b/i;
/** macOS 較新的多語語音，帶有特殊腔調，排在後面。 */
const ODD = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

/** 語速：正常與慢速。 */
export const RATES = { normal: 0.95, slow: 0.7 };

let voices = [];
/** 裝置是否回報了任何語音（iOS 等有時一開始回傳空清單，之後才載入）。 */
let anyVoices = false;
/** 正在播放的語句；保留參照，避免 Chrome 在播放前回收而沒有聲音。 */
let current = null;
let preferred = '';
let rate = RATES.normal;
let checked = false;

/**
 * 為英文語音評分；分數越高越優先。
 * @param {SpeechSynthesisVoice} v 語音。
 * @returns {number} 分數。
 */
function scoreVoice(v) {
  let s = 0;
  if (/premium|enhanced|natural|neural/i.test(v.name)) s += 40;
  if (GOOD.test(v.name)) s += 20;
  if (ODD.test(v.name)) s -= 30;
  if (/^en[-_]us/i.test(v.lang)) s += 10;
  else if (/^en[-_](gb|au|ca|ie|nz)/i.test(v.lang)) s += 5;
  if (v.localService) s += 5;
  if (v.default) s += 2;
  return s;
}

/**
 * 取得裝置上可用的英文語音，依音質排序並排除趣味語音。
 * @returns {SpeechSynthesisVoice[]} 英文語音。
 */
function rankVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices()
    .filter((v) => /^en[-_]/i.test(v.lang) && !NOVELTY.test(v.name))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

/**
 * 決定這次要使用的語音：玩家自選的優先；離線時跳過需要網路的語音。
 * @returns {SpeechSynthesisVoice | null} 語音。
 */
function currentVoice() {
  const usable = navigator.onLine === false ? voices.filter((v) => v.localService) : voices;
  return usable.find((v) => v.name === preferred) || usable[0] || voices[0] || null;
}

/**
 * 初始化語音；語音清單載入完成（部分瀏覽器為非同步）後呼叫回呼。
 * @param {(available: boolean) => void} onReady 回呼，參數為是否有英文語音。
 */
export function initSpeech(onReady) {
  if (!('speechSynthesis' in window)) {
    checked = true;
    onReady(false);
    return;
  }
  /** 重新整理語音清單並通知。 */
  const update = () => {
    anyVoices = window.speechSynthesis.getVoices().length > 0;
    voices = rankVoices();
    checked = true;
    onReady(speechAvailable());
  };
  update();
  window.speechSynthesis.addEventListener('voiceschanged', update);
  // iOS Safari 不一定會觸發 voiceschanged：清單還是空的時候，每 0.5 秒再查一次，最多 10 秒。
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (anyVoices || tries > 20) clearInterval(timer);
    else update();
  }, 500);
}

/**
 * 是否可以發音：有英文語音，或裝置還沒回報語音清單（此時交給系統預設的英文語音）。
 * 只有在裝置回報了語音、但其中沒有英文時才視為不可用。
 * @returns {boolean} 可用時為 true。
 */
export function speechAvailable() {
  return checked && 'speechSynthesis' in window && (voices.length > 0 || !anyVoices);
}

/**
 * 列出可供玩家選擇的英文語音（依音質排序，最多 12 個）；有其他語音時不列出腔調特殊的語音。
 * @returns {{name: string, lang: string}[]} 語音名稱與語言。
 */
export function voiceOptions() {
  const normal = voices.filter((v) => !ODD.test(v.name));
  return (normal.length ? normal : voices).slice(0, 12).map((v) => ({ name: v.name, lang: v.lang }));
}

/**
 * 目前實際使用的語音名稱。
 * @returns {string} 語音名稱；沒有語音時為空字串。
 */
export function currentVoiceName() {
  return currentVoice()?.name || '';
}

/**
 * 套用發音設定。
 * @param {{voice: string, rate: 'normal' | 'slow'}} options 自選語音名稱（空字串為自動）與語速。
 */
export function configureSpeech({ voice, rate: r }) {
  preferred = voice || '';
  rate = RATES[r] || RATES.normal;
}

/**
 * 唸出英文單字或詞組。
 * @param {string} text 英文。
 */
export function speak(text) {
  if (!speechAvailable()) return;
  try {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
    // Chrome 偶爾會卡在暫停狀態，之後的語句都不會播放。
    synth.resume();
    // iOS 16.4 以上：把音訊工作階段設為影音播放，嘗試讓發音不受靜音開關影響（不支援時略過）。
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    synth.speak(makeUtterance(text, currentVoice(), true));
  } catch {
    // 忽略：語音合成失敗時不影響遊戲。
  }
}

/**
 * 建立語句；指定的語音播放失敗時，改用系統預設的英文語音再試一次。
 * @param {string} text 英文。
 * @param {SpeechSynthesisVoice | null} voice 語音；null 時使用系統預設的英文語音。
 * @param {boolean} retry 失敗時是否重試。
 * @returns {SpeechSynthesisUtterance} 語句。
 */
function makeUtterance(text, voice, retry) {
  const u = new SpeechSynthesisUtterance(text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : 'en-US';
  u.rate = rate;
  u.pitch = 1;
  /** 播放結束後釋放參照。 */
  u.onend = () => {
    if (current === u) current = null;
  };
  /**
   * 播放失敗時改用預設語音重試（被新的發音中斷時不重試）。
   * @param {SpeechSynthesisErrorEvent} e 錯誤事件。
   */
  u.onerror = (e) => {
    if (current === u) current = null;
    if (retry && voice && e.error !== 'interrupted' && e.error !== 'canceled') {
      window.speechSynthesis.speak(makeUtterance(text, null, false));
    }
  };
  current = u;
  return u;
}
