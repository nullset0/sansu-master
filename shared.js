// =========================================================
// 算数マスター 共通エンジン（Leitner + 進捗管理）
// 使い方: window.GRADE_KEY = 'g4'; window.QUESTIONS = [...]; を先に定義してから読み込む
// =========================================================

// === グローバル設定（学年共通） ===
const SETTINGS_KEY = 'sansu-master-settings';
function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) try { return JSON.parse(raw); } catch(e) {}
  return { voice: true, sound: true, autoRead: true, rate: 1.0 };
}
function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
let SETTINGS = loadSettings();

// === AI（Claude API）連携 ===
const API_KEY_STORAGE = 'sansu-master-api-key';
const AI_MODEL = 'claude-haiku-4-5';
function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}
function setApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}
async function claudeApi(systemPrompt, userPrompt, maxTokens = 1024) {
  const key = getApiKey();
  if (!key) throw new Error('APIキーが せっていされていません');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API エラー (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// AI生成問題のローカル保存
function aiQuestionsKey(gradeKey) { return `sansu-master-ai-${gradeKey}`; }
function loadAIQuestions(gradeKey) {
  const raw = localStorage.getItem(aiQuestionsKey(gradeKey));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch(e) { return []; }
}
function saveAIQuestions(gradeKey, qs) {
  localStorage.setItem(aiQuestionsKey(gradeKey), JSON.stringify(qs));
}

const GRADE_NAMES = {g1:'1年生', g2:'2年生', g3:'3年生', g4:'4年生', g5:'5年生', g6:'6年生'};

async function generateAIQuestions(gradeKey, tags, count = 5) {
  const gradeName = GRADE_NAMES[gradeKey] || '小学生';
  const tagList = tags.join(' / ');
  const system = `あなたは日本の小学校${gradeName}の算数の先生です。
小学生にやさしい、ふりがな多めの算数問題を JSON 配列で作成します。
出力は JSON 配列のみ。前後に説明文・コードブロック記号(\`\`\`)を絶対つけないでください。`;
  const user = `${gradeName}の算数で、以下の単元の問題を ${count} 問作ってください。
単元: ${tagList}

JSON形式（配列）:
[
  {
    "tag": "単元名（${tagList} のいずれか1つ）",
    "q": "問題文（小学${gradeName}向け、ひらがな多め、計算結果も書く）",
    "opts": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "a": 正解のインデックス0〜3,
    "why": "なぜその答えになるか、子どもにわかる短い説明"
  }
]

ルール:
- すでに教科書にあるような典型問題でOK
- 4択、まちがいの選択肢も「ありがちなまちがい」にする
- whyは1〜2文で簡潔に
- JSON 以外は一切出力しないこと`;

  const text = await claudeApi(system, user, 2048);
  let jsonStr = text.trim();
  // ```json ... ``` の除去
  jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  // 配列開始まで切り詰め
  const start = jsonStr.indexOf('[');
  const end = jsonStr.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('AIの応答が JSON 配列ではありません');
  const parsed = JSON.parse(jsonStr.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error('AIの応答が配列ではありません');
  // バリデーション + ID付与
  const ts = Date.now();
  return parsed.filter(q =>
    q && typeof q.q === 'string' && Array.isArray(q.opts) && q.opts.length === 4 &&
    typeof q.a === 'number' && q.a >= 0 && q.a <= 3 && typeof q.why === 'string'
  ).map((q, i) => ({
    id: `ai-${ts}-${i}`,
    tag: q.tag || tags[0] || 'AI',
    q: q.q,
    opts: q.opts.map(String),
    a: q.a,
    why: q.why,
    _ai: true,
  }));
}

// === 音声読み上げ ===
let _voicesReady = false;
let _jaVoice = null;
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  _jaVoice = voices.find(v => v.lang === 'ja-JP') ||
             voices.find(v => v.lang.startsWith('ja')) || null;
  _voicesReady = voices.length > 0;
}
if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
// 日本語TTSのよみがな前処理
function preprocessSpeech(text) {
  if (!text) return '';
  // HTMLタグ除去
  text = text.replace(/<[^>]+>/g, '');
  // 帯分数 「2と1/3」→「に と さんぶんのいち」（先に処理）
  text = text.replace(/(\d+)\s*と\s*(\d+)\s*\/\s*(\d+)/g, '$1 と $3ぶんの$2');
  // 分数 a/b → bぶんのa（÷との混同を避けるため、両側が数字の/のみ）
  text = text.replace(/(\d+)\s*\/\s*(\d+)/g, '$2ぶんの$1');
  // 演算記号（数字に隣接するときは スペースを 整える）
  text = text.replace(/(\d)\s*×\s*(\d)/g, '$1 かける $2');
  text = text.replace(/×/g, ' かける ');
  text = text.replace(/(\d)\s*÷\s*(\d)/g, '$1 わる $2');
  text = text.replace(/÷/g, ' わる ');
  text = text.replace(/(\d)\s*[＋+]\s*(\d)/g, '$1 たす $2');
  text = text.replace(/[＋]/g, ' たす ');
  text = text.replace(/(\d)\s*[−–—-]\s*(\d)/g, '$1 ひく $2');
  text = text.replace(/[−–—]/g, ' ひく ');
  // = → イコール
  text = text.replace(/[=＝]/g, ' イコール ');
  // 文字式の変数（x, y）：数字直後に来る場合は「かける」を 補ってから 文字
  text = text.replace(/(\d)\s*x\b/g, '$1 かける エックス');
  text = text.replace(/(\d)\s*y\b/g, '$1 かける ワイ');
  text = text.replace(/(\d)\s*a\b/g, '$1 かける エー');
  text = text.replace(/\bx\b/gi, 'エックス');
  text = text.replace(/\by\b/gi, 'ワイ');
  // パーセント・歩合
  text = text.replace(/(\d+(?:\.\d+)?)\s*%/g, '$1パーセント');
  text = text.replace(/(\d+(?:\.\d+)?)\s*‰/g, '$1パーミル');
  // 円
  text = text.replace(/(\d+(?:,\d{3})*)\s*円/g, '$1えん');
  // 単位（長い順に処理。重複を避けるため、後ろが数字や英字でないことを確認）
  // 面積・体積（先に）
  text = text.replace(/(\d+(?:\.\d+)?)\s*km[²2]/g, '$1へいほうキロメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*cm[³3]/g, '$1りっぽうセンチメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*cm[²2]/g, '$1へいほうセンチメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*m[³3]/g, '$1りっぽうメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*m[²2]/g, '$1へいほうメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*ha\b/g, '$1ヘクタール');
  text = text.replace(/(\d+(?:\.\d+)?)\s*a\b/gi, '$1アール');
  // 長さ
  text = text.replace(/(\d+(?:\.\d+)?)\s*mm\b/g, '$1ミリメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*cm\b/g, '$1センチメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*km\b/g, '$1キロメートル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*m\b(?!l|L)/g, '$1メートル');
  // 重さ
  text = text.replace(/(\d+(?:\.\d+)?)\s*mg\b/g, '$1ミリグラム');
  text = text.replace(/(\d+(?:\.\d+)?)\s*kg\b/g, '$1キログラム');
  text = text.replace(/(\d+(?:\.\d+)?)\s*g\b/g, '$1グラム');
  text = text.replace(/(\d+(?:\.\d+)?)\s*t\b/g, '$1トン');
  // かさ
  text = text.replace(/(\d+(?:\.\d+)?)\s*mL\b/g, '$1ミリリットル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*dL\b/g, '$1デシリットル');
  text = text.replace(/(\d+(?:\.\d+)?)\s*L\b/g, '$1リットル');
  // 時間
  text = text.replace(/(\d+(?:\.\d+)?)\s*°/g, '$1ど');
  // 残った上付き
  text = text.replace(/[²]/g, 'のじじょう');
  text = text.replace(/[³]/g, 'のさんじょう');
  // 装飾記号は読み上げない
  text = text.replace(/[★☆✦✧♡♥♥️⭐✨🔥🎉🏆🌟💪😊🤔😴😢🤩👏🚿📺🏫🥚🥛📚👦🚗🐘🍎🍕📱🛏️🥤🧊🌍🍶🥫🕯️🚌🚆✈️🌌🚲🚄🌬️🏃🚶📐📏📓📦🎲🔺🔻🔢🔄🔁⭕🔍📊📈🆚½⬜▭▲]/g, '');
  text = text.replace(/[「『]/g, ' ');
  text = text.replace(/[」』]/g, ' ');
  // 強調
  text = text.replace(/[？?]/g, '？ ').replace(/[！!]/g, '！ ');
  text = text.replace(/[、，]/g, '、 ');
  text = text.replace(/[。．]/g, '。 ');
  // 空白整理
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function speak(text, opts = {}) {
  if (!SETTINGS.voice && !opts.force) return;
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const cleanText = preprocessSpeech(text);
  if (!cleanText) return;
  const u = new SpeechSynthesisUtterance(cleanText);
  u.lang = 'ja-JP';
  u.rate = SETTINGS.rate || 1.0;
  u.pitch = 1.1;
  if (_jaVoice) u.voice = _jaVoice;
  if (opts.onend) u.onend = opts.onend;
  speechSynthesis.speak(u);
}

// === 効果音（Web Audio API、外部ファイル不要） ===
let _audioCtx = null;
function getAudio() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) {}
  }
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}
function tone(freq, duration, type = 'sine', volume = 0.15, delay = 0) {
  if (!SETTINGS.sound) return;
  const ctx = getAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration);
}
function playCorrect() {
  // ピンポン♪（C5→E5→G5）
  tone(523.25, 0.15, 'sine', 0.15, 0);
  tone(659.25, 0.15, 'sine', 0.15, 0.10);
  tone(783.99, 0.30, 'sine', 0.18, 0.20);
}
function playWrong() {
  // ぶー（A3→G3）
  tone(220, 0.18, 'sawtooth', 0.08, 0);
  tone(196, 0.25, 'sawtooth', 0.08, 0.12);
}
function playComplete() {
  // ファンファーレ
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, 0.25, 'sine', 0.18, i * 0.12);
  });
}
function playClick() {
  tone(800, 0.05, 'square', 0.05);
}

// === マスコット「ピカりん」 ===
// 設計: Kindchenschema（頭比率大・目が顔の下半分）/ アイコンタクト追従 / 撫でリアクション
let _mascotIdCounter = 0;
function mascotSVG(expression = 'normal', size = 120, animClass = 'idle') {
  const id = `m${++_mascotIdCounter}`;
  // 目：表情で形が変わる。瞳のグループ class="pupil-{id}" は目線追従
  const eyes = {
    normal: `
      <g class="eye-l">
        <ellipse cx="68" cy="92" rx="13" ry="17" fill="#1f2937"/>
        <g class="pupil pupil-${id}">
          <circle cx="71" cy="86" r="6" fill="#fff"/>
          <circle cx="65" cy="98" r="3" fill="#fff"/>
          <circle cx="74" cy="93" r="1.5" fill="#fff" opacity="0.7"/>
        </g>
      </g>
      <g class="eye-r">
        <ellipse cx="112" cy="92" rx="13" ry="17" fill="#1f2937"/>
        <g class="pupil pupil-${id}">
          <circle cx="115" cy="86" r="6" fill="#fff"/>
          <circle cx="109" cy="98" r="3" fill="#fff"/>
          <circle cx="118" cy="93" r="1.5" fill="#fff" opacity="0.7"/>
        </g>
      </g>`,
    happy: `
      <path d="M52 92 Q68 76 84 92" stroke="#1f2937" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M96 92 Q112 76 128 92" stroke="#1f2937" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M48 84 Q52 78 56 82" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M124 84 Q128 78 132 82" stroke="#1f2937" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    excited: `
      <g class="eye-l">
        <path d="M68 78 L72 88 L82 88 L74 95 L77 105 L68 99 L59 105 L62 95 L54 88 L64 88 Z" fill="#fbbf24" stroke="#1f2937" stroke-width="2.5" stroke-linejoin="round"/>
      </g>
      <g class="eye-r">
        <path d="M112 78 L116 88 L126 88 L118 95 L121 105 L112 99 L103 105 L106 95 L98 88 L108 88 Z" fill="#fbbf24" stroke="#1f2937" stroke-width="2.5" stroke-linejoin="round"/>
      </g>`,
    sad: `
      <g class="eye-l">
        <ellipse cx="68" cy="94" rx="11" ry="14" fill="#1f2937"/>
        <circle cx="70" cy="89" r="4" fill="#fff"/>
        <ellipse cx="65" cy="106" rx="3" ry="2" fill="#60a5fa" opacity="0.8"/>
      </g>
      <g class="eye-r">
        <ellipse cx="112" cy="94" rx="11" ry="14" fill="#1f2937"/>
        <circle cx="114" cy="89" r="4" fill="#fff"/>
        <ellipse cx="115" cy="106" rx="3" ry="2" fill="#60a5fa" opacity="0.8"/>
      </g>`,
    sleep: `
      <path d="M52 94 Q68 100 84 94" stroke="#1f2937" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M96 94 Q112 100 128 94" stroke="#1f2937" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    thinking: `
      <g class="eye-l">
        <ellipse cx="68" cy="92" rx="13" ry="17" fill="#1f2937"/>
        <g class="pupil pupil-${id}">
          <circle cx="65" cy="84" r="5" fill="#fff"/>
        </g>
      </g>
      <g class="eye-r">
        <ellipse cx="112" cy="92" rx="13" ry="17" fill="#1f2937"/>
        <g class="pupil pupil-${id}">
          <circle cx="115" cy="84" r="5" fill="#fff"/>
        </g>
      </g>`,
  };
  // 口：小さめで表情を表す
  const mouths = {
    normal: '<path d="M84 122 Q90 126 96 122" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    happy: '<path d="M76 118 Q90 138 104 118 Q98 124 90 124 Q82 124 76 118 Z" fill="#dc2626" stroke="#7c2d12" stroke-width="2.5" stroke-linejoin="round"/><path d="M82 130 Q90 135 98 130" stroke="#fda4af" stroke-width="2" fill="none"/>',
    excited: '<ellipse cx="90" cy="126" rx="10" ry="9" fill="#dc2626" stroke="#7c2d12" stroke-width="2.5"/><ellipse cx="90" cy="130" rx="6" ry="3" fill="#fda4af"/>',
    sad: '<path d="M82 128 Q90 120 98 128" stroke="#7c2d12" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    sleep: '<ellipse cx="90" cy="126" rx="6" ry="3" fill="#7c2d12"/>',
    thinking: '<line x1="84" y1="124" x2="96" y2="124" stroke="#7c2d12" stroke-width="2.5" stroke-linecap="round"/>',
  };
  // ほっぺ：表情で濃さが変わる
  const cheekOpacity = {
    normal: 0.55, happy: 0.95, excited: 1.0,
    sad: 0.35, sleep: 0.45, thinking: 0.55,
  }[expression] || 0.55;
  // sleep時のz
  const sleepEffect = expression === 'sleep'
    ? '<text x="148" y="48" font-size="22" fill="#60a5fa" font-weight="bold" font-style="italic">z</text><text x="158" y="36" font-size="16" fill="#60a5fa" font-weight="bold" font-style="italic">z</text><text x="166" y="26" font-size="12" fill="#60a5fa" font-weight="bold" font-style="italic">z</text>'
    : '';
  // excited時の星
  const sparkles = expression === 'excited'
    ? '<text x="40" y="44" font-size="14" fill="#fbbf24">✦</text><text x="138" y="50" font-size="18" fill="#fbbf24">✧</text><text x="30" y="120" font-size="12" fill="#fbbf24">✦</text>'
    : '';
  const e = eyes[expression] || eyes.normal;
  const m = mouths[expression] || mouths.normal;

  return `<svg class="mascot ${animClass}" data-mascot-id="${id}" viewBox="0 0 180 200" width="${size}" height="${size * 200 / 180}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="body-${id}" cx="35%" cy="30%">
        <stop offset="0%" stop-color="#fffbeb"/>
        <stop offset="50%" stop-color="#fde68a"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </radialGradient>
      <radialGradient id="bell-${id}" cx="40%" cy="35%">
        <stop offset="0%" stop-color="#fef3c7"/>
        <stop offset="100%" stop-color="#facc15"/>
      </radialGradient>
      <linearGradient id="ribbon-${id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fb7185"/>
        <stop offset="100%" stop-color="#e11d48"/>
      </linearGradient>
    </defs>
    <!-- 影 -->
    <ellipse cx="90" cy="190" rx="45" ry="5" fill="#000" opacity="0.18"/>
    <!-- しっぽ（左下からチラ見せ） -->
    <path d="M40 160 Q22 156 18 140 Q22 130 32 134 Q40 142 44 152 Z" fill="url(#body-${id})" stroke="#b45309" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="22" cy="138" rx="5" ry="4" fill="#fef3c7" opacity="0.8"/>
    <!-- 体（小さめ・足ちょい見え） -->
    <path d="M55 165 Q55 185 75 185 Q105 185 105 185 Q125 185 125 165 Q125 155 90 155 Q55 155 55 165 Z" fill="url(#body-${id})" stroke="#b45309" stroke-width="2.5"/>
    <!-- 首のリボン -->
    <path d="M62 152 Q90 158 118 152 L116 162 Q90 168 64 162 Z" fill="url(#ribbon-${id})" stroke="#9f1239" stroke-width="1.5"/>
    <ellipse cx="90" cy="158" rx="6" ry="5" fill="url(#bell-${id})" stroke="#b45309" stroke-width="1.5"/>
    <circle cx="90" cy="160" r="1.5" fill="#7c2d12"/>
    <!-- 耳（左：垂れ、右：ピン） -->
    <path d="M48 60 Q38 70 36 86 Q38 95 48 88 Q56 78 56 64 Z" fill="url(#body-${id})" stroke="#b45309" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M48 70 Q42 78 42 84 Q44 88 48 84 Q52 78 52 72 Z" fill="#fda4af" opacity="0.7"/>
    <path d="M132 36 L124 14 L146 28 Z" fill="url(#body-${id})" stroke="#b45309" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M133 32 L130 22 L140 28 Z" fill="#fda4af" opacity="0.7"/>
    <!-- 頭（大きめ：頭身比 70%） -->
    <ellipse cx="90" cy="95" rx="55" ry="55" fill="url(#body-${id})" stroke="#b45309" stroke-width="2.5"/>
    <!-- 髪のクセっ毛（ぴょん） -->
    <path d="M85 42 Q88 30 92 35 Q90 42 88 48 Z" fill="url(#body-${id})" stroke="#b45309" stroke-width="2"/>
    <!-- 星のヘアピン -->
    <g transform="translate(74, 50)">
      <path d="M0 -7 L2 -2 L7 -2 L3 1 L4 6 L0 3 L-4 6 L-3 1 L-7 -2 L-2 -2 Z" fill="#fbbf24" stroke="#b45309" stroke-width="1.2" stroke-linejoin="round"/>
    </g>
    <!-- ほっぺ（ハート型） -->
    <g opacity="${cheekOpacity}">
      <path d="M52 110 Q48 105 50 102 Q53 100 55 105 Q57 100 60 102 Q62 105 58 110 Q56 113 55 114 Q54 113 52 110 Z" fill="#f472b6"/>
      <path d="M120 110 Q116 105 118 102 Q121 100 123 105 Q125 100 128 102 Q130 105 126 110 Q124 113 123 114 Q122 113 120 110 Z" fill="#f472b6"/>
    </g>
    <!-- 目 -->
    ${e}
    <!-- 口 -->
    ${m}
    <!-- 足（チラ見え） -->
    <ellipse cx="68" cy="186" rx="10" ry="5" fill="url(#body-${id})" stroke="#b45309" stroke-width="1.8"/>
    <ellipse cx="112" cy="186" rx="10" ry="5" fill="url(#body-${id})" stroke="#b45309" stroke-width="1.8"/>
    ${sparkles}
    ${sleepEffect}
  </svg>`;
}

// === メモ（手書き）パッド ===
function createMemoPad(qid) {
  const wrap = document.createElement('div');
  wrap.className = 'memo-area';
  wrap.innerHTML = `
    <button class="memo-toggle" type="button">📝 メモ・ひっ算</button>
    <div class="memo-pad" style="display:none;">
      <div class="memo-tools">
        <div class="tool-group">
          <button type="button" class="pen-color active" data-color="#1e40af" style="background:#1e40af" title="あお"></button>
          <button type="button" class="pen-color" data-color="#dc2626" style="background:#dc2626" title="あか"></button>
          <button type="button" class="pen-color" data-color="#16a34a" style="background:#16a34a" title="みどり"></button>
          <button type="button" class="pen-color" data-color="#1f2937" style="background:#1f2937" title="くろ"></button>
        </div>
        <div class="tool-group">
          <button type="button" class="memo-undo">↶ もどす</button>
          <button type="button" class="memo-clear">🗑️ ぜんぶ けす</button>
          <button type="button" class="memo-close">✖ とじる</button>
        </div>
      </div>
      <canvas class="memo-canvas" id="memo-canvas-${qid}"></canvas>
    </div>
  `;
  // セットアップ
  setTimeout(() => initMemoPad(wrap), 0);
  return wrap;
}

function initMemoPad(wrap) {
  const canvas = wrap.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  // 高解像度対応
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    redraw();
  }
  let strokes = [];
  let current = null;
  let penColor = '#1e40af';
  let penWidth = 3;

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      const pts = s.points;
      if (pts.length === 0) continue;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches && e.touches[0];
    const cx = (t ? t.clientX : e.clientX) - rect.left;
    const cy = (t ? t.clientY : e.clientY) - rect.top;
    return { x: cx, y: cy };
  }

  function start(e) {
    e.preventDefault();
    const p = getPos(e);
    current = { color: penColor, width: penWidth, points: [p] };
    strokes.push(current);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e) {
    if (!current) return;
    e.preventDefault();
    const p = getPos(e);
    current.points.push(p);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end() { current = null; }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  canvas.addEventListener('touchend', end);

  // ペンの色
  wrap.querySelectorAll('.pen-color').forEach(b => {
    b.addEventListener('click', () => {
      penColor = b.dataset.color;
      wrap.querySelectorAll('.pen-color').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  // 消す
  wrap.querySelector('.memo-clear').addEventListener('click', () => {
    strokes = [];
    redraw();
  });
  // 戻す
  wrap.querySelector('.memo-undo').addEventListener('click', () => {
    strokes.pop();
    redraw();
  });
  // 閉じる
  wrap.querySelector('.memo-close').addEventListener('click', () => {
    wrap.querySelector('.memo-pad').style.display = 'none';
    wrap.querySelector('.memo-toggle').style.display = 'inline-block';
  });
  // 開く
  wrap.querySelector('.memo-toggle').addEventListener('click', (e) => {
    e.target.style.display = 'none';
    wrap.querySelector('.memo-pad').style.display = 'block';
    setTimeout(resize, 30);
  });

  // 初期化
  resize();
  window.addEventListener('resize', resize);
}

// === マスコットの目線追従 + 撫でリアクション ===
function setupMascotInteraction() {
  if (window._mascotSetup) return;
  window._mascotSetup = true;

  // 目線追従（マウス・タッチに反応）
  function updateGaze(clientX, clientY) {
    document.querySelectorAll('.mascot').forEach(m => {
      const rect = m.getBoundingClientRect();
      if (rect.width === 0) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const max = 4;
      const px = (dx / Math.max(dist, 1)) * Math.min(max, dist / 80);
      const py = (dy / Math.max(dist, 1)) * Math.min(max, dist / 80);
      m.querySelectorAll('.pupil').forEach(p => {
        p.style.transform = `translate(${px}px, ${py}px)`;
        p.style.transition = 'transform 0.15s ease-out';
      });
    });
  }
  document.addEventListener('mousemove', e => updateGaze(e.clientX, e.clientY));
  document.addEventListener('touchmove', e => {
    if (e.touches[0]) updateGaze(e.touches[0].clientX, e.touches[0].clientY);
  });

  // 撫でる（クリック/タップ）= ハート飛ばし + ランダムリアクション
  document.addEventListener('click', e => {
    const m = e.target.closest('.mascot');
    if (!m) return;
    e.stopPropagation();
    const rect = m.getBoundingClientRect();
    spawnHearts(rect.left + rect.width / 2, rect.top + rect.height / 3);
    // ジャンプ + 効果音
    m.classList.add('hop');
    setTimeout(() => m.classList.remove('hop'), 600);
    tone(880, 0.08, 'sine', 0.12);
    setTimeout(() => tone(1100, 0.1, 'sine', 0.12), 80);
    // ランダムなセリフ（吹き出しがあれば差し替え）
    const lines = [
      'えへへ〜♡', 'なに〜？', 'もっと なでて〜', 'うふふ✨',
      'すき〜♡', 'こちょこちょ', 'なかよし！', 'えへっ',
    ];
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble pet-bubble';
    bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
    bubble.style.cssText = `position:fixed;left:${rect.left + rect.width / 2 - 60}px;top:${rect.top - 40}px;z-index:9999;pointer-events:none;`;
    document.body.appendChild(bubble);
    setTimeout(() => {
      bubble.style.transition = 'opacity 0.4s, transform 0.4s';
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateY(-20px)';
    }, 800);
    setTimeout(() => bubble.remove(), 1300);
  });

  // マスコットをポインタとして使えるように
  const style = document.createElement('style');
  style.textContent = '.mascot { pointer-events: auto; cursor: pointer; }';
  document.head.appendChild(style);
}

function spawnHearts(x, y) {
  const colors = ['#ec4899', '#f472b6', '#fb7185', '#fbbf24'];
  for (let i = 0; i < 6; i++) {
    const heart = document.createElement('div');
    heart.textContent = '♡';
    const c = colors[Math.floor(Math.random() * colors.length)];
    heart.style.cssText = `position:fixed;left:${x}px;top:${y}px;font-size:${20 + Math.random() * 16}px;color:${c};font-weight:bold;pointer-events:none;z-index:9998;text-shadow:0 1px 2px rgba(0,0,0,0.2);`;
    document.body.appendChild(heart);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
    const dist = 60 + Math.random() * 60;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 20;
    heart.animate([
      { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
      { transform: `translate(-50%, -50%) scale(1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0.6)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 300, easing: 'ease-out' });
    setTimeout(() => heart.remove(), 1500);
  }
}

// === 紙吹雪（Confetti） ===
function fireConfetti(intensity = 1) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const colors = ['#fbbf24', '#ec4899', '#3b82f6', '#10b981', '#a78bfa', '#ef4444', '#f59e0b'];
  const count = Math.floor(60 * intensity);
  const particles = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 12 - 8,
      g: 0.35,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      life: 1,
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
    });
  }
  let frameCount = 0;
  function frame() {
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.vx *= 0.99;
      p.rot += p.vrot;
      p.life -= 0.012;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size/2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive > 0 && frameCount < 200) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  }
  frame();
}

// === 設定パネルUI ===
function injectSettingsPanel() {
  if (document.getElementById('settings-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'settings-fab';
  fab.className = 'settings-fab';
  fab.innerHTML = '⚙️';
  fab.title = '設定';
  document.body.appendChild(fab);

  const menu = document.createElement('div');
  menu.id = 'settings-menu';
  menu.className = 'settings-menu';
  menu.innerHTML = `
    <h4>⚙️ せっていメニュー</h4>
    <label><input type="checkbox" id="opt-voice"> 🔊 もんだいを 読み上げる</label>
    <label><input type="checkbox" id="opt-autoread"> ⚡ 自動で 読み上げる</label>
    <label><input type="checkbox" id="opt-sound"> 🎵 こうかおん</label>
    <div style="margin-top:10px;">
      <label style="padding:4px 0;">読むスピード: <span id="rate-val"></span></label>
      <input type="range" id="opt-rate" min="0.6" max="1.4" step="0.1">
    </div>
    <hr style="margin:14px 0;border:none;border-top:1px solid #e5e7eb;">
    <h4>🤖 AI先生（任意）</h4>
    <p style="font-size:0.78em;color:#6b7280;line-height:1.4;margin-bottom:6px;">
      Claude APIキーを入れると、苦手な単元の問題をAIが新しく作ってくれます。<br>
      （家族のデバイスのみ。<a href="https://console.anthropic.com/" target="_blank" style="color:#3b82f6;">取得方法</a>）
    </p>
    <input type="password" id="opt-apikey" placeholder="sk-ant-api03-..." style="width:100%;padding:8px;border:1px solid #d1d5db;border-radius:8px;font-size:0.85em;font-family:monospace;">
    <button id="opt-apikey-save" style="margin-top:8px;width:100%;padding:8px;background:#ec4899;color:white;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:0.9em;">ほぞん</button>
    <div id="opt-apikey-status" style="font-size:0.75em;margin-top:6px;text-align:center;"></div>
  `;
  document.body.appendChild(menu);

  const v = document.getElementById('opt-voice');
  const a = document.getElementById('opt-autoread');
  const s = document.getElementById('opt-sound');
  const r = document.getElementById('opt-rate');
  const rv = document.getElementById('rate-val');

  function refreshUI() {
    v.checked = SETTINGS.voice;
    a.checked = SETTINGS.autoRead;
    s.checked = SETTINGS.sound;
    r.value = SETTINGS.rate;
    rv.textContent = SETTINGS.rate.toFixed(1) + 'x';
  }
  refreshUI();

  v.addEventListener('change', () => { SETTINGS.voice = v.checked; saveSettings(SETTINGS); });
  a.addEventListener('change', () => { SETTINGS.autoRead = a.checked; saveSettings(SETTINGS); });
  s.addEventListener('change', () => { SETTINGS.sound = s.checked; saveSettings(SETTINGS); if (s.checked) playClick(); });
  r.addEventListener('input', () => {
    SETTINGS.rate = parseFloat(r.value);
    rv.textContent = SETTINGS.rate.toFixed(1) + 'x';
    saveSettings(SETTINGS);
  });

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('show');
    playClick();
  });
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !fab.contains(e.target)) menu.classList.remove('show');
  });

  // APIキー
  const apiInput = document.getElementById('opt-apikey');
  const apiSave = document.getElementById('opt-apikey-save');
  const apiStatus = document.getElementById('opt-apikey-status');
  function refreshApiStatus() {
    const k = getApiKey();
    if (k) {
      apiStatus.innerHTML = `✅ せってい済み (${k.slice(0,12)}...) <button id="opt-apikey-clear" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.85em;">けす</button>`;
      apiInput.value = '';
      apiInput.placeholder = '新しいキーで上書き';
      const clearBtn = document.getElementById('opt-apikey-clear');
      if (clearBtn) clearBtn.addEventListener('click', () => { setApiKey(''); refreshApiStatus(); });
    } else {
      apiStatus.textContent = 'まだ未設定';
    }
  }
  refreshApiStatus();
  apiSave.addEventListener('click', () => {
    const v = apiInput.value.trim();
    if (!v) { apiStatus.textContent = '⚠️ キーを入力してください'; return; }
    if (!v.startsWith('sk-ant-')) { apiStatus.textContent = '⚠️ Anthropicのキーは sk-ant- で始まります'; return; }
    setApiKey(v);
    refreshApiStatus();
    apiStatus.textContent = '✅ ほぞんしました！';
  });
}

// === 共通エンジン本体 ===
(function() {
  const GRADE_KEY = window.GRADE_KEY || 'default';
  const QUESTIONS = window.QUESTIONS || [];
  const TAGS = window.TAGS || [];
  const STORAGE_KEY = 'sansu-master-' + GRADE_KEY;
  const DAILY_GOAL = 5;
  const BOX_INTERVALS = [0, 1, 3, 7, 14];
  const BOX_NAMES = ['もう一度', '3日後', '1週間後', '2週間後', 'マスター'];

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
  }
  function dateDiff(a, b) {
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.round((db - da) / (1000 * 60 * 60 * 24));
  }

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { try { return JSON.parse(raw); } catch(e) {} }
    return {
      cards: {}, streak: 0, lastStudyDate: null,
      todayDate: null, todayDone: 0, totalCorrect: 0,
      studyDates: [],
    };
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  let state = loadState();

  function rolloverDay() {
    const today = todayStr();
    if (state.todayDate !== today) {
      if (state.lastStudyDate) {
        const diff = dateDiff(state.lastStudyDate, today);
        if (diff > 1) state.streak = 0;
      }
      state.todayDate = today;
      state.todayDone = 0;
      saveState();
    }
  }
  rolloverDay();

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function interleave(arr) {
    shuffle(arr);
    const result = [];
    const remaining = [...arr];
    let lastTag = null;
    while (remaining.length > 0) {
      let idx = remaining.findIndex(q => q.tag !== lastTag);
      if (idx === -1) idx = 0;
      const picked = remaining.splice(idx, 1)[0];
      result.push(picked);
      lastTag = picked.tag;
    }
    return result;
  }

  function allQuestions() {
    return [...QUESTIONS, ...loadAIQuestions(GRADE_KEY)];
  }

  function getDueQuestions() {
    const today = todayStr();
    const due = [];
    const newOnes = [];
    for (const q of allQuestions()) {
      const c = state.cards[q.id];
      if (!c) {
        newOnes.push(q);
      } else {
        const box = c.box || 1;
        if (box >= 5) continue;
        const interval = BOX_INTERVALS[box - 1];
        if (!c.lastSeen || dateDiff(c.lastSeen, today) >= interval) {
          due.push({...q, _box: box});
        }
      }
    }
    due.sort((a, b) => (a._box || 1) - (b._box || 1));
    let pool = due.slice(0, DAILY_GOAL);
    if (pool.length < DAILY_GOAL) {
      shuffle(newOnes);
      pool = pool.concat(newOnes.slice(0, DAILY_GOAL - pool.length));
    }
    return interleave(pool);
  }

  let currentBatch = [];
  let currentIdx = 0;
  let sessionCorrect = 0;

  function startDaily() {
    currentBatch = getDueQuestions();
    currentIdx = 0;
    sessionCorrect = 0;
    renderDaily();
  }

  function renderDaily() {
    const area = document.getElementById('daily-area');
    if (!area) return;
    updateStatus();

    if (state.todayDone >= DAILY_GOAL && currentBatch.length === 0) {
      const hasKey = !!getApiKey();
      area.innerHTML = `
        <div class="celebration">
          <div class="mascot-row">
            <div class="speech-bubble">きょうも がんばったね！おやすみ〜💤</div>
            ${mascotSVG('sleep', 130, 'idle')}
          </div>
          <h3>きょうのぶんは おわり！</h3>
          <p>すばらしい！れんぞく <strong>${state.streak}日</strong>つづいているよ 🔥</p>
          <p style="margin-top:10px;color:#6b7280;font-size:0.95em;">
            のうみそが おぼえてくれるのは「ねむっている間」。<br>きょうは よく ねよう 😴
          </p>
          <button class="big-btn" onclick="window.SansuApp.startExtra()" style="margin-top:16px;max-width:300px;">
            もっと やる！(おまけ)
          </button>
          ${hasKey ? `<button id="ai-gen-btn" class="big-btn" onclick="window.SansuApp.aiGenerate()" style="margin-top:8px;max-width:300px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);">
            🤖 AIに作ってもらう
          </button>` : `<p style="margin-top:14px;font-size:0.85em;color:#6b7280;">💡 ⚙️でAPIキーを設定するとAIが新しい問題を作ってくれます</p>`}
        </div>`;
      renderLeitner();
      return;
    }
    if (currentBatch.length === 0) { startDaily(); return; }
    if (currentIdx >= currentBatch.length) { completeSession(); return; }

    const q = currentBatch[currentIdx];
    const progress = (currentIdx / currentBatch.length) * 100;
    // 読み上げ用テキスト（preprocessSpeechで整形）
    const speakText = q.q;
    area.innerHTML = `
      <div class="progress-bar"><div class="progress-bar-fill" style="width: ${progress}%"></div></div>
      <p style="text-align:center;color:#6b7280;font-size:0.9em;margin-bottom:8px;">
        もんだい ${currentIdx + 1} / ${currentBatch.length}
      </p>
      <div class="quiz">
        <div class="quiz-q">
          <span class="quiz-tag">${q.tag}</span>${q.q}
          <button class="speak-btn" id="speak-${q.id}" title="もんだいを よみあげる">🔊 よむ</button>
        </div>
        <div class="quiz-options" id="opts-${q.id}">
          ${q.opts.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}
        </div>
        <div class="quiz-feedback" id="feedback-${q.id}"></div>
        <div style="text-align:center;margin-top:14px;display:none;" id="next-${q.id}">
          <button class="big-btn" style="max-width:300px;" onclick="window.SansuApp.next()">つぎへ →</button>
        </div>
      </div>`;
    document.querySelectorAll(`#opts-${q.id} button`).forEach(btn => {
      btn.addEventListener('click', () => answerQuestion(q, parseInt(btn.dataset.i), btn));
    });
    // 読み上げボタン
    const speakBtn = document.getElementById(`speak-${q.id}`);
    speakBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakBtn.classList.add('speaking');
      speak(speakText, { force: true, onend: () => speakBtn.classList.remove('speaking') });
    });
    // メモパッドを 選択肢の下に挿入
    const opts = document.getElementById(`opts-${q.id}`);
    const memo = createMemoPad(q.id);
    opts.parentNode.insertBefore(memo, opts.nextSibling);
    // 自動読み上げ
    if (SETTINGS.autoRead && SETTINGS.voice) {
      setTimeout(() => speak(speakText), 200);
    }
    renderLeitner();
  }

  function answerQuestion(q, i, btn) {
    const buttons = document.querySelectorAll(`#opts-${q.id} button`);
    buttons.forEach(b => b.disabled = true);
    const fb = document.getElementById(`feedback-${q.id}`);
    const next = document.getElementById(`next-${q.id}`);
    if (!state.cards[q.id]) {
      state.cards[q.id] = {box: 1, lastSeen: null, correctCount: 0, wrongCount: 0};
    }
    const c = state.cards[q.id];
    c.lastSeen = todayStr();
    if (i === q.a) {
      btn.classList.add('correct', 'pop');
      c.correctCount++;
      c.box = Math.min(5, (c.box || 1) + 1);
      sessionCorrect++;
      state.totalCorrect++;
      fb.innerHTML = `🎉 せいかい！<div class="why"><strong>なぜ：</strong>${q.why}</div>`;
      fb.className = 'quiz-feedback show ok';
      playCorrect();
      fireConfetti(0.5);
    } else {
      btn.classList.add('wrong', 'shake');
      buttons[q.a].classList.add('correct');
      c.wrongCount++;
      c.box = 1;
      fb.innerHTML = `❌ ざんねん！せいかいは <strong>${q.opts[q.a]}</strong><div class="why"><strong>なぜ：</strong>${q.why}</div>`;
      fb.className = 'quiz-feedback show ng';
      playWrong();
    }
    state.todayDone++;
    saveState();
    updateStatus();
    next.style.display = 'block';
    // 「なぜ」を読み上げ
    if (SETTINGS.autoRead && SETTINGS.voice) {
      const whyText = (i === q.a ? 'せいかい！' : `ざんねん。せいかいは ${q.opts[q.a]}。`) + q.why.replace(/<[^>]+>/g, '');
      setTimeout(() => speak(whyText), 600);
    }
    // 「もっとくわしく」ボタン（APIキー設定時のみ）
    if (getApiKey()) {
      const whyEl = fb.querySelector('.why');
      if (whyEl) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'speak-btn';
        moreBtn.style.cssText = 'background:#ddd6fe;border-color:#a78bfa;margin-top:8px;display:inline-block;';
        moreBtn.innerHTML = '🤖 AI先生に もっとくわしく聞く';
        moreBtn.addEventListener('click', async () => {
          moreBtn.disabled = true;
          moreBtn.innerHTML = '🤖 考えちゅう...';
          try {
            const gradeName = GRADE_NAMES[GRADE_KEY] || '小学生';
            const text = await claudeApi(
              `あなたは日本の小学校${gradeName}の算数の先生。子どもにやさしく、ふりがな多めで、3〜5文の短い説明をします。`,
              `この子は次の算数問題に取り組みました。\n\n問題: ${q.q}\n選択肢: ${q.opts.join(' / ')}\n正解: ${q.opts[q.a]}\nこの子の答え: ${q.opts[i]} ${i===q.a?'(正解)':'(不正解)'}\n基本の説明: ${q.why}\n\nこの子が「なるほど！」と納得できるように、もっとくわしく、身近な例え（おやつ、おもちゃ、家族など）を使って説明してください。`,
              512
            );
            const div = document.createElement('div');
            div.style.cssText = 'background:#f3f4f6;padding:12px;border-radius:8px;margin-top:8px;text-align:left;font-weight:normal;line-height:1.6;';
            div.innerHTML = '<strong style="color:#8b5cf6;">🤖 AI先生：</strong><br>' + text.replace(/\n/g, '<br>');
            whyEl.appendChild(div);
            moreBtn.style.display = 'none';
            if (SETTINGS.autoRead && SETTINGS.voice) speak(text);
          } catch (e) {
            moreBtn.disabled = false;
            moreBtn.innerHTML = '🤖 もう一度 try';
            alert('AIエラー：\n' + e.message);
          }
        });
        whyEl.appendChild(document.createElement('br'));
        whyEl.appendChild(moreBtn);
      }
    }
  }

  function next() { currentIdx++; renderDaily(); }

  function completeSession() {
    const today = todayStr();
    if (state.lastStudyDate !== today) {
      if (state.lastStudyDate && dateDiff(state.lastStudyDate, today) === 1) {
        state.streak++;
      } else {
        state.streak = 1;
      }
      state.lastStudyDate = today;
    }
    // 学習日を記録（カレンダー用）
    state.studyDates = state.studyDates || [];
    if (!state.studyDates.includes(today)) {
      state.studyDates.push(today);
    }
    saveState();
    const area = document.getElementById('daily-area');
    const pct = Math.round((sessionCorrect / currentBatch.length) * 100);
    let msg, emoji;
    if (pct === 100) { msg = 'パーフェクト！てんさいだ！'; emoji = '🏆'; }
    else if (pct >= 80) { msg = 'すごい！よくできました！'; emoji = '🌟'; }
    else if (pct >= 60) { msg = 'いいね！もう少しでマスター！'; emoji = '😊'; }
    else { msg = 'まちがいは 学びのチャンス！あしたも がんばろう'; emoji = '💪'; }
    const hasKey = !!getApiKey();
    const mascotExp = pct === 100 ? 'excited' : pct >= 80 ? 'happy' : pct >= 60 ? 'happy' : 'sad';
    const mascotAnim = pct >= 60 ? 'dance' : 'idle';
    const bubbleMsg = pct === 100 ? 'パーフェクト！てんさい〜！🌟' :
                      pct >= 80 ? 'すごい！もう少しでマスター！' :
                      pct >= 60 ? 'いいね！この調子！' :
                      'まちがいは のうの ごほうび！';
    area.innerHTML = `
      <div class="celebration bounce-in">
        <div class="mascot-row">
          <div class="speech-bubble">${bubbleMsg}</div>
          ${mascotSVG(mascotExp, 140, mascotAnim)}
        </div>
        <div class="big">${emoji}</div>
        <h3>きょうの 5もん クリア！</h3>
        <p style="font-size:1.4em;font-weight:bold;color:#ec4899;margin:10px 0;">
          ${sessionCorrect} / ${currentBatch.length} もん せいかい
        </p>
        <p>${msg}</p>
        <p style="margin-top:14px;font-size:1.15em;">🔥 れんぞく <strong>${state.streak}日</strong>！</p>
        <p style="margin-top:10px;color:#6b7280;font-size:0.95em;">
          まちがえた もんだいは あした また 出てくるよ 🧠
        </p>
        ${hasKey ? `<button id="ai-gen-btn" class="big-btn" onclick="window.SansuApp.aiGenerate()" style="margin-top:14px;max-width:320px;background:linear-gradient(135deg,#8b5cf6,#3b82f6);">
          🤖 AIに もっと 作ってもらう
        </button>` : ''}
      </div>`;
    currentBatch = [];
    renderLeitner();
    renderCalendar();
    // ファンファーレ + 大きい紙吹雪
    playComplete();
    fireConfetti(2.5);
    if (SETTINGS.autoRead && SETTINGS.voice) {
      setTimeout(() => speak(`きょうの 5もん クリア！${sessionCorrect}もん せいかい。${msg}`), 300);
    }
  }

  function startExtra() {
    currentBatch = getDueQuestions();
    if (currentBatch.length === 0) {
      currentBatch = shuffle([...allQuestions()]).slice(0, 5);
    }
    currentIdx = 0;
    sessionCorrect = 0;
    renderDaily();
  }

  async function handleAIGenerate() {
    if (!getApiKey()) {
      alert('🔑 右下の⚙️でAPIキーを せっていしてください');
      return;
    }
    // 弱い単元を選ぶ
    const weakness = {};
    TAGS.forEach(t => weakness[t] = 0);
    for (const q of allQuestions()) {
      const c = state.cards[q.id];
      if (!c) continue;
      if ((c.box || 1) < 3) weakness[q.tag] = (weakness[q.tag] || 0) + 1;
    }
    let targetTags = Object.entries(weakness)
      .filter(([_, n]) => n > 0)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 2)
      .map(([t]) => t);
    if (targetTags.length === 0) targetTags = TAGS.slice(0, 2);

    const btn = document.getElementById('ai-gen-btn');
    if (btn) { btn.disabled = true; btn.textContent = '🤖 AIが考えちゅう...'; }
    try {
      const newQs = await generateAIQuestions(GRADE_KEY, targetTags, 5);
      if (newQs.length === 0) throw new Error('問題が生成されませんでした');
      const existing = loadAIQuestions(GRADE_KEY);
      saveAIQuestions(GRADE_KEY, [...existing, ...newQs]);
      if (btn) btn.textContent = `✅ ${newQs.length}問できた！スタート！`;
      currentBatch = newQs;
      currentIdx = 0;
      sessionCorrect = 0;
      setTimeout(renderDaily, 1200);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = '🤖 AIに作ってもらう'; }
      alert('AIエラー：\n' + e.message);
    }
  }
  // 公開（HTMLからonclickで呼ぶ用）
  window.SansuApp = window.SansuApp || {};
  window.SansuApp.aiGenerate = handleAIGenerate;

  function updateStatus() {
    const sn = document.getElementById('streak-num');
    if (sn) sn.textContent = state.streak;
    const tn = document.getElementById('today-num');
    if (tn) tn.textContent = Math.max(0, DAILY_GOAL - state.todayDone);
    const masterCount = Object.values(state.cards).filter(c => c.box >= 5).length;
    const mn = document.getElementById('master-num');
    if (mn) mn.textContent = masterCount;
    const tc = document.getElementById('total-correct');
    if (tc) tc.textContent = state.totalCorrect;

    const tp = document.getElementById('today-progress');
    if (tp) tp.style.width = Math.min(100, (state.todayDone / DAILY_GOAL) * 100) + '%';
    const tpt = document.getElementById('today-progress-text');
    if (tpt) tpt.textContent = state.todayDone >= DAILY_GOAL ? '🎉 きょうの目標 たっせい！' : `あと ${DAILY_GOAL - state.todayDone} もん！`;

    const sdn = document.getElementById('streak-display-num');
    if (sdn) sdn.textContent = state.streak + '日';
    const sdm = document.getElementById('streak-display-msg');
    if (sdm) {
      let m = '';
      if (state.streak === 0) m = 'きょうから スタート！';
      else if (state.streak < 3) m = '3日つづいたら くせになる！';
      else if (state.streak < 7) m = '1週間まで あと少し！';
      else if (state.streak < 14) m = '🌟 1週間こえた！';
      else if (state.streak < 30) m = '🏆 2週間こえた！';
      else m = '👑 1ヶ月こえた！てんさい！';
      sdm.textContent = m;
    }
    renderMastery();
  }

  function renderLeitner() {
    const counts = [0, 0, 0, 0, 0];
    const seenIds = new Set();
    for (const [id, c] of Object.entries(state.cards)) {
      const box = c.box || 1;
      counts[box - 1]++;
      seenIds.add(id);
    }
    const all = allQuestions();
    const total = all.length;
    const untouched = all.filter(q => !seenIds.has(q.id)).length;
    const mastered = counts[4];
    const inProgress = counts[0] + counts[1] + counts[2] + counts[3];

    const el = document.getElementById('leitner-display');
    if (!el) return;

    const boxes = [
      { cls: 'b0', num: untouched, name: 'みじゅくしゅう' },
      { cls: 'b1', num: counts[0], name: BOX_NAMES[0] },
      { cls: 'b2', num: counts[1], name: BOX_NAMES[1] },
      { cls: 'b3', num: counts[2], name: BOX_NAMES[2] },
      { cls: 'b4', num: counts[3], name: BOX_NAMES[3] },
      { cls: 'b5', num: counts[4], name: BOX_NAMES[4] },
    ];
    const masterPct = total > 0 ? Math.round(mastered / total * 100) : 0;
    el.innerHTML = `
      <div class="leitner-summary">
        ぜんもんだい <strong>${total}</strong>問　|
        マスター <strong>${mastered}</strong>問 (${masterPct}%)
      </div>
      <div class="leitner-grid">
        ${boxes.map(b => `<div class="lbox ${b.cls}"><div class="num">${b.num}</div><div class="name">${b.name}</div></div>`).join('')}
      </div>
      <div class="leitner-progress-bar">
        <div class="leitner-progress-fill" style="width:${masterPct}%"></div>
      </div>
    `;
  }

  function renderMastery() {
    const el = document.getElementById('mastery-display');
    if (!el || TAGS.length === 0) return;
    const all = allQuestions();
    el.innerHTML = TAGS.map(tag => {
      const tagQs = all.filter(q => q.tag === tag);
      const total = tagQs.length;
      if (total === 0) return '';
      const mastered = tagQs.filter(q => {
        const c = state.cards[q.id];
        return c && c.box >= 5;
      }).length;
      const stars = Math.round((mastered / total) * 5);
      const starStr = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);
      return `<div class="mastery-item">
        <div class="label">${tag}</div>
        <div class="stars">${starStr}</div>
        <div style="font-size:0.8em;color:#6b7280;margin-top:4px;">${mastered} / ${total}</div>
      </div>`;
    }).join('');
  }

  // 学習カレンダー（90日heatmap）— きろくセクションに自動挿入
  function renderCalendar() {
    let container = document.getElementById('calendar-display');
    if (!container) {
      // streak-display-num の上の <h3> 見出しの前に挿入
      const sdn = document.getElementById('streak-display-num');
      if (!sdn) return;
      const card = sdn.closest('.card');
      const celebration = sdn.closest('.celebration');
      if (!card || !celebration) return;
      // celebration の手前にあるh3を探す
      let h3 = celebration.previousElementSibling;
      container = document.createElement('div');
      container.id = 'calendar-display';
      container.className = 'calendar-wrap';
      if (h3 && h3.tagName === 'H3') {
        card.insertBefore(container, h3);
      } else {
        card.insertBefore(container, celebration);
      }
    }
    const dates = state.studyDates || [];
    const today = new Date();
    const days = 90;
    let cellsHtml = '';
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      const studied = dates.includes(ds);
      const isToday = ds === todayStr();
      cellsHtml += `<div class="cal-cell${studied ? ' done' : ''}${isToday ? ' today' : ''}" title="${ds}${studied ? ' ✅' : ''}"></div>`;
    }
    container.innerHTML = `
      <h3>📅 学習カレンダー（90日）</h3>
      <div class="calendar-grid">${cellsHtml}</div>
      <div class="calendar-stats">これまで <strong>${dates.length}日</strong> べんきょうした！</div>
    `;
  }

  function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.target);
        if (target) target.classList.add('active');
        window.scrollTo({top: 0, behavior: 'smooth'});
        if (btn.dataset.target === 'daily') startDaily();
      });
    });
    const reset = document.getElementById('reset-btn');
    if (reset) {
      reset.addEventListener('click', () => {
        if (confirm('この学年のきろくを リセットしますか？')) {
          localStorage.removeItem(STORAGE_KEY);
          state = loadState();
          rolloverDay();
          updateStatus();
          renderLeitner();
          startDaily();
        }
      });
    }
  }

  // 公開API
  window.SansuApp = { startDaily, startExtra, next, getState: () => state };

  document.addEventListener('DOMContentLoaded', () => {
    setupNav();
    updateStatus();
    renderLeitner();
    renderMastery();
    renderCalendar();
    injectSettingsPanel();
    setupMascotInteraction();
    startDaily();
  });
})();

// IIFE 外でも初期化（index.html のような engine が動かないページ用）
document.addEventListener('DOMContentLoaded', () => {
  if (typeof setupMascotInteraction === 'function') setupMascotInteraction();
});

// 学年カードに進捗を表示するヘルパー（index.html 用）
window.SansuIndex = {
  getGradeProgress: function(gradeKey) {
    const raw = localStorage.getItem('sansu-master-' + gradeKey);
    if (!raw) return {streak: 0, master: 0, todayDone: 0};
    try {
      const s = JSON.parse(raw);
      const today = (() => {
        const d = new Date();
        return d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
      })();
      const master = Object.values(s.cards || {}).filter(c => c.box >= 5).length;
      const todayDone = s.todayDate === today ? (s.todayDone || 0) : 0;
      return {streak: s.streak || 0, master, todayDone};
    } catch(e) { return {streak: 0, master: 0, todayDone: 0}; }
  }
};
