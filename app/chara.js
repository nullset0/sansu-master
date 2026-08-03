/* =========================================================
   算数マスター — キャラクター (chara.js)

   作りなおしの方針（前は「まるい頭に部品を貼った」ようで安っぽかった）:
     ① シルエットで見分ける。小さくしても誰か分かる形にする
     ② 面はベタ塗り。全体グラデはやめ、
        「下に落ちる影」＋「左上のハイライト」の2枚だけで立体を出す
     ③ 輪郭は本体色の濃いバージョンで、外側だけ太く・内側は細く
     ④ 目は大きく、中心より少し【下】に置く。口は目の近くに
     ⑤ 手足は本体とつながって見える位置に置く。足は接地させる
   ========================================================= */
const Chara = (() => {
'use strict';

const CAST = {
  pika: {
    name:'ピカりん', role:'たんけんリーダー',
    color:'#ffd23d', shade:'#f0a400', deep:'#c07c00', line:'#7a4a06',
    cheek:'#ff8da1', accent:'#ff5470', belly:'#fff1b8',
    word:'いっしょに いこう！',
  },
  marumo: {
    name:'マルモ', role:'まるく考える子',
    color:'#5cc8ff', shade:'#1a9be0', deep:'#0d6f9e', line:'#0a3d5c',
    cheek:'#ff96ae', accent:'#eafaff', belly:'#d5f2ff',
    word:'まるく おさめよう〜',
  },
  kakuta: {
    name:'カクタ', role:'きちんと つみあげ役',
    color:'#ff8a58', shade:'#ec5124', deep:'#b53a12', line:'#6b2408',
    cheek:'#ffcfb4', accent:'#ffd54a', belly:'#ffd9c2',
    word:'かくじつに いくぞ！',
  },
  tongari: {
    name:'トンガリ', role:'ひらめき たんとう',
    color:'#7fe07a', shade:'#38b346', deep:'#1e8231', line:'#124a20',
    cheek:'#ffa8bb', accent:'#ffe94a', belly:'#daffd4',
    word:'ピンときた！',
  },
  fukurou: {
    name:'ふくろう先生', role:'解き方を おしえる',
    color:'#c3b0ff', shade:'#8f74ec', deep:'#6549c2', line:'#332262',
    cheek:'#ffb8d0', accent:'#ffd166', belly:'#ece5ff',
    word:'図をかけば 見えてくる。',
  },
};

let _uid = 0;
const EYE_Y = 110, EYE_L = 76, EYE_R = 124;   // 目は中心よりすこし下
const MOUTH_Y = 144;

/* ---------- 目 ------------------------------------------------ */
function eyes(spec, expr) {
  const ink = '#241d18';
  // 白目なしの「点目＋大きなハイライト」。丸くて大きいほどかわいい
  const eye = (cx) => `
    <ellipse cx="${cx}" cy="${EYE_Y}" rx="17" ry="21" fill="${ink}"/>
    <ellipse cx="${cx-5}" cy="${EYE_Y-8}" rx="7" ry="8" fill="#fff"/>
    <circle  cx="${cx+6}" cy="${EYE_Y+8}" r="3.4" fill="#fff" opacity=".92"/>`;
  const smile = (cx) => `<path d="M ${cx-17} ${EYE_Y+5} Q ${cx} ${EYE_Y-20} ${cx+17} ${EYE_Y+5}"
      stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  const shut  = (cx) => `<path d="M ${cx-16} ${EYE_Y-4} Q ${cx} ${EYE_Y+15} ${cx+16} ${EYE_Y-4}"
      stroke="${ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  const star  = (cx) => `<path d="M ${cx} ${EYE_Y-22} L ${cx+6} ${EYE_Y-7} L ${cx+22} ${EYE_Y-6}
      L ${cx+10} ${EYE_Y+4} L ${cx+14} ${EYE_Y+20} L ${cx} ${EYE_Y+11} L ${cx-14} ${EYE_Y+20}
      L ${cx-10} ${EYE_Y+4} L ${cx-22} ${EYE_Y-6} L ${cx-6} ${EYE_Y-7} Z"
      fill="#ffdf3d" stroke="${ink}" stroke-width="3.4" stroke-linejoin="round"/>`;
  const wide  = (cx) => `
    <ellipse cx="${cx}" cy="${EYE_Y}" rx="19" ry="24" fill="${ink}"/>
    <ellipse cx="${cx-6}" cy="${EYE_Y-10}" rx="8" ry="9" fill="#fff"/>`;
  const brow = (cx, inner) => `<path d="M ${cx-15} ${EYE_Y-30+(inner?4:-4)} Q ${cx} ${EYE_Y-36} ${cx+15} ${EYE_Y-30+(inner?-4:4)}"
      stroke="${spec.line}" stroke-width="5" fill="none" stroke-linecap="round"/>`;

  switch (expr) {
    case 'happy':   return smile(EYE_L) + smile(EYE_R);
    case 'excited': return star(EYE_L) + star(EYE_R);
    case 'wink':    return eye(EYE_L) + smile(EYE_R);
    case 'sleep':   return shut(EYE_L) + shut(EYE_R);
    case 'wow':     return wide(EYE_L) + wide(EYE_R);
    case 'sad':     return brow(EYE_L,false) + brow(EYE_R,true)
      + `<ellipse cx="${EYE_L}" cy="${EYE_Y+2}" rx="15" ry="18" fill="${ink}"/>
         <ellipse cx="${EYE_L-4}" cy="${EYE_Y-6}" rx="6" ry="7" fill="#fff"/>
         <ellipse cx="${EYE_R}" cy="${EYE_Y+2}" rx="15" ry="18" fill="${ink}"/>
         <ellipse cx="${EYE_R-4}" cy="${EYE_Y-6}" rx="6" ry="7" fill="#fff"/>
         <path d="M ${EYE_L-16} ${EYE_Y+16} q -5 10 1 14 q 6 -4 1 -14 Z" fill="#7fd4ff" stroke="${ink}" stroke-width="2"/>`;
    case 'thinking':return brow(EYE_L,true) + brow(EYE_R,false)
      + `<ellipse cx="${EYE_L}" cy="${EYE_Y}" rx="16" ry="19" fill="${ink}"/>
         <ellipse cx="${EYE_L-6}" cy="${EYE_Y-7}" rx="6" ry="7" fill="#fff"/>
         <ellipse cx="${EYE_R}" cy="${EYE_Y}" rx="16" ry="19" fill="${ink}"/>
         <ellipse cx="${EYE_R-6}" cy="${EYE_Y-7}" rx="6" ry="7" fill="#fff"/>`;
    default:        return eye(EYE_L) + eye(EYE_R);
  }
}

/* ---------- 口 ------------------------------------------------ */
function mouth(spec, expr) {
  const X = 100, Y = MOUTH_Y, ink = spec.line;
  const open = (rx, ry) => `
    <path d="M ${X-rx} ${Y-2} Q ${X} ${Y+ry*2} ${X+rx} ${Y-2} Q ${X} ${Y+3} ${X-rx} ${Y-2} Z" fill="#c8394f"/>
    <path d="M ${X-rx*0.5} ${Y+ry*1.1} Q ${X} ${Y+ry*1.7} ${X+rx*0.5} ${Y+ry*1.1} Q ${X} ${Y+ry*1.2} ${X-rx*0.5} ${Y+ry*1.1} Z" fill="#ff97ac"/>
    <path d="M ${X-rx} ${Y-2} Q ${X} ${Y+ry*2} ${X+rx} ${Y-2}" stroke="${ink}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
  switch (expr) {
    case 'happy':   return open(20, 11);
    case 'wink':    return open(15, 9);
    case 'excited': return `<ellipse cx="${X}" cy="${Y+3}" rx="13" ry="12" fill="#c8394f" stroke="${ink}" stroke-width="3.4"/>
                            <ellipse cx="${X}" cy="${Y+8}" rx="6.5" ry="4" fill="#ff97ac"/>`;
    case 'wow':     return `<ellipse cx="${X}" cy="${Y+4}" rx="9" ry="12" fill="#c8394f" stroke="${ink}" stroke-width="3.2"/>`;
    case 'sad':     return `<path d="M ${X-13} ${Y+7} Q ${X} ${Y-6} ${X+13} ${Y+7}" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'sleep':   return `<ellipse cx="${X}" cy="${Y+2}" rx="8" ry="6" fill="${ink}"/>`;
    case 'thinking':return `<path d="M ${X-12} ${Y} q 8 -5 14 0 q 6 5 10 0" stroke="${ink}" stroke-width="3.8" fill="none" stroke-linecap="round"/>`;
    default:        return `<path d="M ${X-11} ${Y-3} Q ${X} ${Y+8} ${X+11} ${Y-3}" stroke="${ink}" stroke-width="3.8" fill="none" stroke-linecap="round"/>`;
  }
}

/* ---------- 本体のかたち（シルエットの決め手） ----------------- */
// d = 本体のパス。うしろに描くもの / 前に描くもの も返す
function shape(who, spec) {
  switch (who) {
    case 'pika': return {
      // うしろ：しっぽ（星つき）と、とがった耳
      back: `
        <path d="M 152 150 q 30 6 34 -20 q 3 -20 -14 -24 q -12 -2 -12 10 q 0 10 10 10"
          fill="none" stroke="${spec.line}" stroke-width="13" stroke-linecap="round"/>
        <path d="M 152 150 q 30 6 34 -20 q 3 -20 -14 -24 q -12 -2 -12 10 q 0 10 10 10"
          fill="none" stroke="${spec.shade}" stroke-width="7" stroke-linecap="round"/>
        <g transform="translate(172,102)">
          <path d="M 0 -17 L 5 -5 L 18 -4 L 8 4 L 11 17 L 0 9 L -11 17 L -8 4 L -18 -4 L -5 -5 Z"
            fill="${spec.accent}" stroke="${spec.line}" stroke-width="5" stroke-linejoin="round"/>
          <path d="M 0 -17 L 5 -5 L 18 -4 L 8 4 L 11 17 L 0 9 L -11 17 L -8 4 L -18 -4 L -5 -5 Z"
            fill="${spec.accent}"/>
        </g>`,
      d: `M 100 44
          C 60 44 34 74 34 110
          C 34 146 60 172 100 172
          C 140 172 166 146 166 110
          C 166 74 140 44 100 44 Z`,
      ears: `
        <path d="M 56 62 L 40 14 L 84 44 Z" fill="${spec.line}" stroke="${spec.line}" stroke-width="12" stroke-linejoin="round"/>
        <path d="M 56 62 L 40 14 L 84 44 Z" fill="${spec.color}"/>
        <path d="M 58 54 L 49 28 L 72 44 Z" fill="${spec.cheek}" opacity=".75"/>
        <path d="M 144 62 L 160 14 L 116 44 Z" fill="${spec.line}" stroke="${spec.line}" stroke-width="12" stroke-linejoin="round"/>
        <path d="M 144 62 L 160 14 L 116 44 Z" fill="${spec.color}"/>
        <path d="M 142 54 L 151 28 L 128 44 Z" fill="${spec.cheek}" opacity=".75"/>`,
      front: '',
    };
    case 'marumo': return {
      back: '',
      d: `M 100 40 C 56 40 30 76 30 112 C 30 150 58 174 100 174
           C 142 174 170 150 170 112 C 170 76 144 40 100 40 Z`,
      ears: `
        <path d="M 100 6 C 118 34 132 46 132 58 C 132 74 118 84 100 84
                 C 82 84 68 74 68 58 C 68 46 82 34 100 6 Z"
          fill="${spec.line}" stroke="${spec.line}" stroke-width="11" stroke-linejoin="round"/>
        <path d="M 100 6 C 118 34 132 46 132 58 C 132 74 118 84 100 84
                 C 82 84 68 74 68 58 C 68 46 82 34 100 6 Z" fill="${spec.accent}"/>
        <ellipse cx="90" cy="46" rx="6" ry="12" fill="#fff" opacity=".85" transform="rotate(-16 90 46)"/>`,
      front: '',
    };
    case 'kakuta': return {
      back: '',
      d: `M 62 44 L 138 44 C 156 44 168 56 168 74 L 168 142
           C 168 160 156 172 138 172 L 62 172 C 44 172 32 160 32 142
           L 32 74 C 32 56 44 44 62 44 Z`,
      ears: `
        <rect x="72" y="16" width="56" height="24" rx="9"
          fill="${spec.line}" stroke="${spec.line}" stroke-width="11" stroke-linejoin="round"/>
        <rect x="72" y="16" width="56" height="24" rx="9" fill="${spec.accent}"/>
        <rect x="80" y="22" width="18" height="7" rx="3.5" fill="#fff" opacity=".6"/>`,
      front: `
        <rect x="44" y="150" width="112" height="9" rx="4.5" fill="${spec.deep}" opacity=".35"/>`,
    };
    case 'tongari': return {
      back: '', cheekDx: 38, cheekY: 142,
      d: `M 100 26 C 106 26 110 30 113 36 L 170 148
           C 178 164 168 176 152 176 L 48 176 C 32 176 22 164 30 148
           L 87 36 C 90 30 94 26 100 26 Z`,
      ears: `
        <path d="M 106 8 L 88 40 L 102 40 L 92 66 L 118 32 L 104 32 Z"
          fill="${spec.line}" stroke="${spec.line}" stroke-width="10" stroke-linejoin="round"/>
        <path d="M 106 8 L 88 40 L 102 40 L 92 66 L 118 32 L 104 32 Z" fill="${spec.accent}"/>`,
      front: '',
    };
    case 'fukurou': return {
      back: `
        <ellipse cx="34" cy="126" rx="20" ry="34" fill="${spec.line}" transform="rotate(10 34 126)"/>
        <ellipse cx="34" cy="126" rx="14" ry="28" fill="${spec.shade}" transform="rotate(10 34 126)"/>
        <ellipse cx="166" cy="126" rx="20" ry="34" fill="${spec.line}" transform="rotate(-10 166 126)"/>
        <ellipse cx="166" cy="126" rx="14" ry="28" fill="${spec.shade}" transform="rotate(-10 166 126)"/>`,
      d: `M 100 40 C 58 40 32 74 32 112 C 32 150 60 176 100 176
           C 140 176 168 150 168 112 C 168 74 142 40 100 40 Z`,
      ears: `
        <path d="M 52 60 L 42 16 L 84 42 Z" fill="${spec.line}" stroke="${spec.line}" stroke-width="11" stroke-linejoin="round"/>
        <path d="M 52 60 L 42 16 L 84 42 Z" fill="${spec.color}"/>
        <path d="M 148 60 L 158 16 L 116 42 Z" fill="${spec.line}" stroke="${spec.line}" stroke-width="11" stroke-linejoin="round"/>
        <path d="M 148 60 L 158 16 L 116 42 Z" fill="${spec.color}"/>`,
      // めがねは顔より前。「先生」だと一目で分かる
      front: `
        <g fill="none" stroke="${spec.line}" stroke-width="5">
          <circle cx="${EYE_L}" cy="${EYE_Y}" r="27"/>
          <circle cx="${EYE_R}" cy="${EYE_Y}" r="27"/>
          <path d="M ${EYE_L+27} ${EYE_Y} L ${EYE_R-27} ${EYE_Y}"/>
          <path d="M ${EYE_L-27} ${EYE_Y-4} L 40 ${EYE_Y-16}"/>
          <path d="M ${EYE_R+27} ${EYE_Y-4} L 160 ${EYE_Y-16}"/>
        </g>
        <circle cx="${EYE_L-14}" cy="${EYE_Y-16}" r="6" fill="#fff" opacity=".45"/>
        <circle cx="${EYE_R-14}" cy="${EYE_Y-16}" r="6" fill="#fff" opacity=".45"/>`,
    };
  }
}

/* ---------- 本体（ベタ塗り＋下の影＋左上のハイライト） ---------- */
function mass(id, spec, d) {
  return `
    <path d="${d}" fill="${spec.line}" stroke="${spec.line}" stroke-width="12" stroke-linejoin="round"/>
    <path d="${d}" fill="${spec.color}"/>
    <g clip-path="url(#c${id})">
      <ellipse cx="100" cy="212" rx="96" ry="72" fill="${spec.shade}" opacity=".5"/>
      <ellipse cx="100" cy="150" rx="46" ry="30" fill="${spec.belly}" opacity=".55"/>
      <ellipse cx="63" cy="70" rx="26" ry="16" fill="#fff" opacity=".42" transform="rotate(-26 63 70)"/>
      <ellipse cx="150" cy="150" rx="10" ry="34" fill="#fff" opacity=".16" transform="rotate(-16 150 150)"/>
    </g>`;
}

/* ---------- 手足 ---------------------------------------------- */
function limbs(spec) {
  // 本体より一段暗い色にして「体の出っぱり」ではなく「手足」に見せる
  const arm = (cx, cy, rot) => `
    <g transform="rotate(${rot} ${cx} ${cy})">
      <ellipse cx="${cx}" cy="${cy}" rx="21" ry="15" fill="${spec.line}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="16" ry="10.5" fill="${spec.shade}"/>
      <ellipse cx="${cx-3}" cy="${cy-3}" rx="6" ry="3.4" fill="#fff" opacity=".3"/>
    </g>`;
  const foot = (cx) => `
    <ellipse cx="${cx}" cy="182" rx="27" ry="15" fill="${spec.line}"/>
    <ellipse cx="${cx}" cy="181" rx="22" ry="11" fill="${spec.shade}"/>
    <ellipse cx="${cx-6}" cy="177" rx="8" ry="3.4" fill="#fff" opacity=".22"/>`;
  return {
    feet: foot(66) + foot(134),
    arms: `<g class="arm-l">${arm(22, 150, 22)}</g><g class="arm-r">${arm(178, 150, -22)}</g>`,
  };
}

/* ---------- 本体 ---------------------------------------------- */
function svg(who = 'pika', expr = 'normal', size = 130, opts = {}) {
  const spec = CAST[who] || CAST.pika;
  const id = 'k' + (++_uid);
  const anim = opts.anim === false ? '' : (opts.anim || 'idle');
  const sh = shape(who, spec);
  sh.cheekDx = sh.cheekDx || 55; sh.cheekY = sh.cheekY || 133;
  const L = limbs(spec);
  const cheekOp = ({happy:1, excited:1, wink:1, normal:.8, wow:.85, sad:.45, sleep:.55, thinking:.65})[expr] ?? .8;

  const fx =
    (expr === 'sleep' ? `<g class="zzz" fill="#7fb0ff" font-weight="900" font-style="italic" stroke="#fff" stroke-width="3" paint-order="stroke">
        <text x="150" y="46" font-size="26">z</text><text x="172" y="24" font-size="18">z</text></g>` : '') +
    (expr === 'excited' ? `<g class="spark" fill="#ffd93d" stroke="${spec.line}" stroke-width="2.2" stroke-linejoin="round">
        <path d="M 24 46 l 4 10 l 10 4 l -10 4 l -4 10 l -4 -10 l -10 -4 l 10 -4 Z"/>
        <path d="M 176 62 l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 l 7 -3 Z"/></g>` : '') +
    (expr === 'thinking' ? `<g class="think">
        <circle cx="164" cy="58" r="6" fill="#fff" stroke="${spec.line}" stroke-width="3"/>
        <circle cx="180" cy="38" r="13" fill="#fff" stroke="${spec.line}" stroke-width="3.4"/>
        <text x="180" y="45" font-size="18" text-anchor="middle" font-weight="900" fill="${spec.line}">?</text></g>` : '');

  return `<svg class="chara ${anim?'ch-'+anim:''}" data-who="${who}" viewBox="0 0 200 200"
      width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-label="${spec.name}">
    <defs><clipPath id="c${id}"><path d="${sh.d}"/></clipPath></defs>
    <ellipse cx="100" cy="193" rx="60" ry="8" fill="#000" opacity=".14"/>
    ${sh.back}
    ${L.feet}
    ${L.arms}
    ${sh.ears}
    <g class="ch-head">
      ${mass(id, spec, sh.d)}
      <g opacity="${cheekOp}">
        <ellipse cx="${100-sh.cheekDx}" cy="${sh.cheekY}" rx="15" ry="10" fill="${spec.cheek}"/>
        <ellipse cx="${100+sh.cheekDx}" cy="${sh.cheekY}" rx="15" ry="10" fill="${spec.cheek}"/>
      </g>
      <g class="ch-eyes">${eyes(spec, expr)}</g>
      ${who === 'fukurou'
        ? `<path d="M 100 132 L 112 148 L 100 158 L 88 148 Z" fill="${spec.accent}" stroke="${spec.line}" stroke-width="3.4" stroke-linejoin="round"/>`
        : mouth(spec, expr)}
      ${sh.front}
    </g>
    ${fx}
  </svg>`;
}

/* ---------- ふきだし付きで並べる ---------- */
function tag(who = 'pika', expr = 'happy', text = '', size = 110, opts = {}) {
  const spec = CAST[who] || CAST.pika;
  const msg = text || spec.word;
  const side = opts.side === 'right' ? 'right' : 'left';
  const bubble = `<div class="ch-bubble ${side}">${String(msg).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  const fig = `<div class="ch-fig">${svg(who, expr, size, opts)}</div>`;
  return `<div class="ch-row ${side}">${side==='left' ? fig+bubble : bubble+fig}</div>`;
}

function setExpr(el, who, expr, size, opts) {
  if (!el) return;
  el.innerHTML = svg(who, expr, size || 120, opts);
}

function bindTap(root, onTap) {
  (root || document).querySelectorAll('.chara').forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.style.cursor = 'pointer';
    el.addEventListener('pointerdown', () => {
      el.classList.remove('ch-pop'); void el.offsetWidth; el.classList.add('ch-pop');
      if (onTap) onTap(el.dataset.who, el);
    });
  });
}

// 目線をポインタに合わせる（ちょっとした生きてる感）
function followPointer() {
  if (followPointer._on) return; followPointer._on = true;
  window.addEventListener('pointermove', e => {
    document.querySelectorAll('.chara .ch-eyes').forEach(g => {
      const r = g.getBoundingClientRect();
      if (!r.width) return;
      const cl = v => Math.max(-1, Math.min(1, v));
      const dx = cl((e.clientX - (r.left+r.width/2)) / 260);
      const dy = cl((e.clientY - (r.top +r.height/2)) / 300);
      g.style.transform = `translate(${dx*4}px, ${dy*3}px)`;
    });
  }, {passive:true});
}

const list = () => Object.keys(CAST);
const info = who => CAST[who] || CAST.pika;

return { svg, tag, setExpr, bindTap, followPointer, list, info, CAST };
})();
if (typeof window !== 'undefined') { window.Chara = Chara; window.mascotSVG = (e,s)=>Chara.svg('pika', e, s||120); }
