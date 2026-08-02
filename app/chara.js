/* =========================================================
   算数マスター v2 — キャラクター (chara.js)
   設計方針（任天堂系の作法）:
     ・2頭身、頭が大きくシルエットで判別できる
     ・アウトラインは太さ一定・黒ではなく色みのある濃色
     ・色数は1体あたり3〜4色（本体/影/差し色/ライン）
     ・目は大きく、ハイライト2点。表情は目と口だけで作る
     ・手足は小さく、動きはCSSでバネっぽく
   使い方: Chara.svg('pika','happy',140)  /  Chara.tag(...)
   ========================================================= */
const Chara = (() => {
'use strict';

const CAST = {
  pika: {
    name:'ピカりん', role:'たんけんリーダー', color:'#ffcf2e', shade:'#f2a007', deep:'#c97b04',
    line:'#6b3f0b', cheek:'#ff8fa3', accent:'#ff5d73', head:'circle',
    hi:'#fff3b8', word:'いっしょに いこう！',
  },
  marumo: {
    name:'マルモ', role:'まるい かんがえの子', color:'#5fc9ff', shade:'#1f9fe0', deep:'#0d78b0',
    line:'#0b3f5c', cheek:'#ff9ab0', accent:'#ffffff', head:'circle',
    hi:'#d9f3ff', word:'まるく おさめよう〜',
  },
  kakuta: {
    name:'カクタ', role:'きちんと つみあげ役', color:'#ff8a5c', shade:'#f4552a', deep:'#c33a15',
    line:'#66230d', cheek:'#ffd3b0', accent:'#ffe066', head:'square',
    hi:'#ffd9c6', word:'かくじつに いくぞ！',
  },
  tongari: {
    name:'トンガリ', role:'ひらめき たんとう', color:'#7ede7a', shade:'#3cb44a', deep:'#1f8f34',
    line:'#154d22', cheek:'#ffb3c1', accent:'#fff06a', head:'tri',
    hi:'#dcffd7', word:'ピンときた！',
  },
  fukurou: {
    name:'ふくろう先生', role:'解き方を おしえる', color:'#c8b6ff', shade:'#9a7ff0', deep:'#6f52c8',
    line:'#3b2a6b', cheek:'#ffc2d6', accent:'#ffd166', head:'circle',
    hi:'#efe8ff', word:'図をかけば 見えてくる。',
  },
};

let _uid = 0;

/* ---------- 目 ---------- */
function eyes(spec, expr, id) {
  const L = 74, Rx = 126, Y = 96;        // 左右の目の中心
  const line = spec.line;
  const eyeball = (cx, dir) => `
    <ellipse cx="${cx}" cy="${Y}" rx="16" ry="20" fill="#2a2320"/>
    <circle cx="${cx + dir*4.5}" cy="${Y-7}" r="6.6" fill="#fff"/>
    <circle cx="${cx - dir*4}" cy="${Y+8}" r="3.2" fill="#fff" opacity=".9"/>
    <ellipse cx="${cx + dir*7}" cy="${Y+2}" rx="2" ry="3" fill="#fff" opacity=".55"/>`;
  const arcUp = cx => `<path d="M ${cx-16} ${Y+3} Q ${cx} ${Y-19} ${cx+16} ${Y+3}" stroke="#2a2320" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  const arcDn = cx => `<path d="M ${cx-16} ${Y-4} Q ${cx} ${Y+16} ${cx+16} ${Y-4}" stroke="#2a2320" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  const star = cx => `<path d="M ${cx} ${Y-20} L ${cx+5.5} ${Y-6} L ${cx+20} ${Y-5} L ${cx+9} ${Y+4.5} L ${cx+13} ${Y+19}
      L ${cx} ${Y+10.5} L ${cx-13} ${Y+19} L ${cx-9} ${Y+4.5} L ${cx-20} ${Y-5} L ${cx-5.5} ${Y-6} Z"
      fill="${spec.accent==='#ffffff'?'#ffe066':spec.accent}" stroke="#2a2320" stroke-width="3" stroke-linejoin="round"/>`;
  const brow = (cx, tilt) => `<path d="M ${cx-14} ${Y-30+tilt} Q ${cx} ${Y-37} ${cx+14} ${Y-30-tilt}" stroke="${line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;

  switch (expr) {
    case 'happy':   return arcUp(L) + arcUp(Rx);
    case 'excited': return star(L) + star(Rx);
    case 'wink':    return eyeball(L,1) + arcUp(Rx);
    case 'sleep':   return arcDn(L) + arcDn(Rx);
    case 'sad':     return brow(L,6) + brow(Rx,-6)
      + `<ellipse cx="${L}" cy="${Y+2}" rx="14" ry="17" fill="#2a2320"/><circle cx="${L+3}" cy="${Y-5}" r="5" fill="#fff"/>`
      + `<ellipse cx="${Rx}" cy="${Y+2}" rx="14" ry="17" fill="#2a2320"/><circle cx="${Rx+3}" cy="${Y-5}" r="5" fill="#fff"/>`
      + `<ellipse cx="${L-13}" cy="${Y+22}" rx="4.5" ry="6" fill="#7fd4ff" stroke="#2a2320" stroke-width="1.6"/>`;
    case 'thinking':return brow(L,4) + brow(Rx,-4)
      + `<ellipse cx="${L}" cy="${Y}" rx="15" ry="18" fill="#2a2320"/><circle cx="${L-5}" cy="${Y-7}" r="5" fill="#fff"/>`
      + `<ellipse cx="${Rx}" cy="${Y}" rx="15" ry="18" fill="#2a2320"/><circle cx="${Rx-5}" cy="${Y-7}" r="5" fill="#fff"/>`;
    case 'wow':     return `<ellipse cx="${L}" cy="${Y}" rx="18" ry="22" fill="#2a2320"/><circle cx="${L+5}" cy="${Y-8}" r="7.5" fill="#fff"/>
                            <ellipse cx="${Rx}" cy="${Y}" rx="18" ry="22" fill="#2a2320"/><circle cx="${Rx+5}" cy="${Y-8}" r="7.5" fill="#fff"/>`;
    default:        return eyeball(L,1) + eyeball(Rx,1);
  }
}

/* ---------- 口 ---------- */
function mouth(spec, expr) {
  const X = 100, Y = 130;
  switch (expr) {
    case 'happy':   return `<path d="M ${X-19} ${Y-6} Q ${X} ${Y+20} ${X+19} ${Y-6} Q ${X} ${Y+2} ${X-19} ${Y-6} Z" fill="#b33"/>
                            <path d="M ${X-19} ${Y-6} Q ${X} ${Y+20} ${X+19} ${Y-6}" stroke="${spec.line}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
                            <path d="M ${X-9} ${Y+9} Q ${X} ${Y+15} ${X+9} ${Y+9}" fill="#ff9fb0"/>`;
    case 'excited': return `<ellipse cx="${X}" cy="${Y+2}" rx="13" ry="12" fill="#b33" stroke="${spec.line}" stroke-width="3.2"/>
                            <ellipse cx="${X}" cy="${Y+7}" rx="7" ry="4" fill="#ff9fb0"/>`;
    case 'wow':     return `<ellipse cx="${X}" cy="${Y+3}" rx="9" ry="12" fill="#b33" stroke="${spec.line}" stroke-width="3"/>`;
    case 'sad':     return `<path d="M ${X-13} ${Y+7} Q ${X} ${Y-6} ${X+13} ${Y+7}" stroke="${spec.line}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`;
    case 'sleep':   return `<ellipse cx="${X}" cy="${Y+2}" rx="7" ry="5" fill="${spec.line}"/>`;
    case 'thinking':return `<path d="M ${X-11} ${Y+1} L ${X+7} ${Y+1}" stroke="${spec.line}" stroke-width="3.6" stroke-linecap="round"/>`;
    case 'wink':    return `<path d="M ${X-14} ${Y-3} Q ${X} ${Y+14} ${X+14} ${Y-3}" stroke="${spec.line}" stroke-width="3.4" fill="#b33" stroke-linecap="round"/>`;
    default:        return `<path d="M ${X-10} ${Y-2} Q ${X} ${Y+8} ${X+10} ${Y-2}" stroke="${spec.line}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  }
}

/* ---------- 頭のかたち（シルエットの決め手） ---------- */
function headShape(spec, id) {
  const f = `url(#body${id})`, s = spec.line;
  if (spec.head === 'square')
    return `<rect x="38" y="42" width="124" height="112" rx="30" fill="${f}" stroke="${s}" stroke-width="5"/>`;
  if (spec.head === 'tri')
    return `<path d="M 100 30 L 168 142 Q 172 154 158 154 L 42 154 Q 28 154 32 142 Z" fill="${f}" stroke="${s}" stroke-width="5" stroke-linejoin="round"/>`;
  return `<ellipse cx="100" cy="98" rx="63" ry="60" fill="${f}" stroke="${s}" stroke-width="5"/>`;
}

/* ---------- 頭の飾り（キャラの見わけ） ---------- */
function crown(who, spec, id) {
  const s = spec.line;
  if (who === 'pika') return `
    <path d="M 56 58 Q 40 34 46 18 Q 62 22 70 44 Z" fill="url(#body${id})" stroke="${s}" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M 144 58 Q 160 34 154 18 Q 138 22 130 44 Z" fill="url(#body${id})" stroke="${s}" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M 52 40 Q 46 30 48 24 Q 56 28 60 40 Z" fill="${spec.cheek}" opacity=".8"/>
    <path d="M 148 40 Q 154 30 152 24 Q 144 28 140 40 Z" fill="${spec.cheek}" opacity=".8"/>
    <g transform="translate(100,30)">
      <path d="M 0 -20 L 5.9 -6.2 L 21 -5 L 9.5 4.6 L 13 19 L 0 11 L -13 19 L -9.5 4.6 L -21 -5 L -5.9 -6.2 Z"
        fill="${spec.accent}" stroke="${s}" stroke-width="4" stroke-linejoin="round"/>
      <circle cx="-4" cy="-4" r="3.4" fill="#fff" opacity=".85"/>
    </g>`;
  if (who === 'marumo') return `
    <path d="M 100 2 Q 122 26 122 40 Q 122 58 100 58 Q 78 58 78 40 Q 78 26 100 2 Z"
      fill="#eaf9ff" stroke="${s}" stroke-width="4.6" stroke-linejoin="round"/>
    <ellipse cx="92" cy="30" rx="5" ry="8" fill="#fff" opacity=".9" transform="rotate(-18 92 30)"/>
    <ellipse cx="100" cy="56" rx="34" ry="11" fill="${spec.shade}" stroke="${s}" stroke-width="4.6"/>`;
  if (who === 'kakuta') return `
    <rect x="76" y="20" width="48" height="20" rx="7" fill="${spec.accent}" stroke="${s}" stroke-width="4.6"/>
    <rect x="66" y="36" width="68" height="12" rx="6" fill="${spec.shade}" stroke="${s}" stroke-width="4.6"/>`;
  if (who === 'tongari') return `
    <path d="M 100 8 L 112 34 L 88 34 Z" fill="${spec.accent}" stroke="${s}" stroke-width="4.4" stroke-linejoin="round"/>
    <circle cx="100" cy="6" r="6" fill="#fff" stroke="${s}" stroke-width="3.4"/>`;
  if (who === 'fukurou') return `
    <path d="M 38 60 L 52 10 L 84 46 Z" fill="url(#body${id})" stroke="${s}" stroke-width="4.6" stroke-linejoin="round"/>
    <path d="M 162 60 L 148 10 L 116 46 Z" fill="url(#body${id})" stroke="${s}" stroke-width="4.6" stroke-linejoin="round"/>`;
  return '';
}

/* ---------- 頭より「前」に描く飾り ---------- */
function crownFront(who, spec) {
  if (who === 'fukurou') return `
    <circle cx="74" cy="96" r="30" fill="none" stroke="${spec.deep}" stroke-width="3.4" opacity=".45"/>
    <circle cx="126" cy="96" r="30" fill="none" stroke="${spec.deep}" stroke-width="3.4" opacity=".45"/>
    <path d="M 92 116 L 100 134 L 108 116 Z" fill="${spec.accent}" stroke="#2a2320" stroke-width="3" stroke-linejoin="round"/>`;
  return '';
}

/* ---------- 本体 ---------- */
function svg(who = 'pika', expr = 'normal', size = 130, opts = {}) {
  const spec = CAST[who] || CAST.pika;
  const id = 'c' + (++_uid);
  const s = spec.line;
  const anim = opts.anim === false ? '' : (opts.anim || 'idle');
  const showBody = opts.bust ? false : true;
  const cheekOp = ({happy:1, excited:1, normal:.75, wink:.95, wow:.8, sad:.4, sleep:.5, thinking:.6})[expr] ?? .75;

  const extras =
    (expr === 'sleep' ? `<g class="zzz" fill="#8fb8ff" font-weight="800" font-style="italic">
        <text x="168" y="46" font-size="24">z</text><text x="182" y="28" font-size="17">z</text></g>` : '') +
    (expr === 'excited' ? `<g class="spark" fill="${spec.accent}">
        <text x="24" y="52" font-size="20">✦</text><text x="164" y="40" font-size="15">✧</text><text x="18" y="128" font-size="14">✦</text></g>` : '') +
    (expr === 'thinking' ? `<g class="think">
        <circle cx="172" cy="52" r="7" fill="#fff" stroke="${s}" stroke-width="3"/>
        <circle cx="186" cy="34" r="11" fill="#fff" stroke="${s}" stroke-width="3"/>
        <text x="186" y="40" font-size="15" text-anchor="middle" font-weight="800" fill="${s}">?</text></g>` : '');

  const body = showBody ? `
    <ellipse cx="100" cy="176" rx="40" ry="26" fill="url(#body${id})" stroke="${s}" stroke-width="5"/>
    <ellipse cx="100" cy="182" rx="24" ry="16" fill="${spec.hi}" opacity=".65"/>
    <ellipse cx="60"  cy="168" rx="15" ry="12" fill="url(#body${id})" stroke="${s}" stroke-width="4.6" class="arm-l"/>
    <ellipse cx="140" cy="168" rx="15" ry="12" fill="url(#body${id})" stroke="${s}" stroke-width="4.6" class="arm-r"/>
    <ellipse cx="80"  cy="199" rx="17" ry="9" fill="${spec.shade}" stroke="${s}" stroke-width="4.4"/>
    <ellipse cx="120" cy="199" rx="17" ry="9" fill="${spec.shade}" stroke="${s}" stroke-width="4.4"/>` : '';

  const H = showBody ? 214 : 168;

  return `<svg class="chara ${anim?'ch-'+anim:''}" data-who="${who}" viewBox="0 0 200 ${H}"
      width="${size}" height="${Math.round(size*H/200)}" xmlns="http://www.w3.org/2000/svg" aria-label="${spec.name}">
    <defs>
      <radialGradient id="body${id}" cx="34%" cy="26%" r="78%">
        <stop offset="0%"  stop-color="${spec.hi}"/>
        <stop offset="52%" stop-color="${spec.color}"/>
        <stop offset="100%" stop-color="${spec.shade}"/>
      </radialGradient>
    </defs>
    ${showBody ? `<ellipse cx="100" cy="208" rx="52" ry="7" fill="#000" opacity=".13"/>` : ''}
    ${body}
    <g class="ch-head">
      ${crown(who, spec, id)}
      ${headShape(spec, id)}
      <ellipse cx="74" cy="66" rx="22" ry="13" fill="#fff" opacity=".38" transform="rotate(-22 74 66)"/>
      <g opacity="${cheekOp}">
        <ellipse cx="48" cy="118" rx="13" ry="9" fill="${spec.cheek}"/>
        <ellipse cx="152" cy="118" rx="13" ry="9" fill="${spec.cheek}"/>
      </g>
      ${crownFront(who, spec)}
      <g class="ch-eyes">${eyes(spec, expr, id)}</g>
      ${who === 'fukurou' ? '' : mouth(spec, expr)}
    </g>
    ${extras}
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

/* ---------- 表情をあとから差し替える ---------- */
function setExpr(el, who, expr, size, opts) {
  if (!el) return;
  el.innerHTML = svg(who, expr, size || 120, opts);
}

/* ---------- タップで反応させる ---------- */
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

/* ---------- 目線をポインタに合わせる（ちょっとした生きてる感） ---------- */
function followPointer() {
  if (followPointer._on) return; followPointer._on = true;
  window.addEventListener('pointermove', e => {
    document.querySelectorAll('.chara .ch-eyes').forEach(g => {
      const r = g.getBoundingClientRect();
      if (!r.width) return;
      const dx = (e.clientX - (r.left+r.width/2)) / 260;
      const dy = (e.clientY - (r.top +r.height/2)) / 300;
      const cl = v => Math.max(-1, Math.min(1, v));
      g.style.transform = `translate(${cl(dx)*4}px, ${cl(dy)*3}px)`;
    });
  }, {passive:true});
}

const list = () => Object.keys(CAST);
const info = who => CAST[who] || CAST.pika;

return { svg, tag, setExpr, bindTap, followPointer, list, info, CAST };
})();
if (typeof window !== 'undefined') { window.Chara = Chara; window.mascotSVG = (e,s)=>Chara.svg('pika', e, s||120); }
