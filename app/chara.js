/* =========================================================
   算数マスター — キャラクター (chara.js)

   前の2案がダサかった理由（ピクミン／Miiと見くらべて）:
     ✗ 全員「まるいボール＋顔」だった。ピクミンはボールではない。
       細い茎・球根型の体・細い手足で、縦に長いシルエットを作っている
     ✗ 目が「黒い楕円＋ハイライト」だった。ピクミンは【白目＋黒目】。
       白目があるだけで視線が生まれて、生き物に見える
     ✗ 太い黒フチで囲っていた。ピクミンもMiiも黒フチを使わない。
       フチがあるとステッカー／クリップアートに見える
     ✗ 手足が体の横に貼った短い楕円だった。ピクミンの手足は細く長い
     ✗ 全員まったく同じ直立の左右対称。姿勢が無いと人形に見える

   作り方:
     ・体は球根型（上が細く下がふくらむ）。縦長のシルエット
     ・頭のてっぺんから細い茎がのび、先に【図形の芽】がつく（算数と直結）
     ・目は白目＋黒目。近づけて置き、まぶたの線を1本入れる
     ・輪郭線は使わず、深い同系色を うすく1本だけ
     ・手足は細いストローク。表情で腕の角度が変わる
     ・全体をわずかに傾け、左右非対称にして姿勢を出す
   ========================================================= */
const Chara = (() => {
'use strict';

const CAST = {
  pika: {
    name:'ピカりん', role:'たんけんリーダー', sprout:'star',
    hi:'#fff2a8', color:'#ffcd2e', shade:'#e8930a', deep:'#a85f00',
    accent:'#ffd83d', cheek:'#ff8fa8', word:'いっしょに いこう！',
  },
  marumo: {
    name:'マルモ', role:'まるく考える子', sprout:'circle',
    hi:'#d6f3ff', color:'#4fbdf5', shade:'#1584c4', deep:'#0a5687',
    accent:'#7ddcff', cheek:'#ff8fa8', word:'まるく おさめよう〜',
  },
  kakuta: {
    name:'カクタ', role:'きちんと つみあげ役', sprout:'square',
    hi:'#ffd7bd', color:'#f9784a', shade:'#d34418', deep:'#8f2a08',
    accent:'#ff9f5e', cheek:'#ffc0a4', word:'かくじつに いくぞ！',
  },
  tongari: {
    name:'トンガリ', role:'ひらめき たんとう', sprout:'triangle',
    hi:'#d8ffcd', color:'#6ed26a', shade:'#2f9c3f', deep:'#186a2a',
    accent:'#9ceb8f', cheek:'#ff9db2', word:'ピンときた！',
  },
  fukurou: {
    name:'ふくろう先生', role:'解き方を おしえる', sprout:'pencil', glasses:true,
    hi:'#e6dcff', color:'#a58bf0', shade:'#7050cf', deep:'#452c92',
    accent:'#c8b4ff', cheek:'#ffa8c4', word:'図をかけば 見えてくる。',
  },
};

let _uid = 0;

// ---- レイアウト（viewBox 200 × 212）----
const BODY = `M 100 50
  C 78 50 64 74 62 108
  C 60 146 76 170 100 170
  C 124 170 140 146 138 108
  C 136 74 122 50 100 50 Z`;
const EYE_Y = 100, EYE_DX = 13;                 // 目は高め・近め（ここが顔の要）
const STEM = '#a9bb84', STEM_D = '#7d8f5c';     // 茎は全員共通の色＝同じ種族に見える

/* ---------- 図形の芽 ---------- */
function sprout(kind, spec) {
  const s = spec.accent;
  switch (kind) {
    case 'star': return `
      <path d="M 0 -20 L 6.2 -6.4 L 21 -5 L 10 4.6 L 13.4 19 L 0 11.4 L -13.4 19 L -10 4.6 L -21 -5 L -6.2 -6.4 Z"
        fill="${s}"/>
      <path d="M 0 -20 L 6.2 -6.4 L 0 -4 Z" fill="#fff" opacity=".55"/>`;
    case 'circle': return `
      <circle cx="0" cy="0" r="18" fill="${s}"/>
      <circle cx="0" cy="0" r="8.5" fill="#fff" opacity=".5"/>
      <ellipse cx="-6" cy="-8" rx="5" ry="3.4" fill="#fff" opacity=".8" transform="rotate(-30 -6 -8)"/>`;
    case 'square': return `
      <rect x="-16" y="-16" width="32" height="32" rx="5" fill="${s}"/>
      <rect x="-9" y="-9" width="18" height="18" rx="3" fill="#fff" opacity=".45"/>
      <rect x="-12" y="-12" width="9" height="5" rx="2.5" fill="#fff" opacity=".8"/>`;
    case 'triangle': return `
      <path d="M 0 -19 L 18 14 L -18 14 Z" fill="${s}" stroke="${s}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M 0 -7 L 8 10 L -8 10 Z" fill="#fff" opacity=".45"/>`;
    case 'pencil': return `
      <g transform="rotate(16)">
        <rect x="-6" y="-20" width="12" height="26" rx="2" fill="${s}"/>
        <rect x="-6" y="-20" width="4" height="26" fill="#fff" opacity=".35"/>
        <path d="M -6 6 L 6 6 L 0 20 Z" fill="#f2d9b0"/>
        <path d="M -2.4 14.5 L 2.4 14.5 L 0 20 Z" fill="#3a3330"/>
        <rect x="-6" y="-25" width="12" height="6" rx="2" fill="#ff8fa8"/>
      </g>`;
    default: return `<circle r="16" fill="${s}"/>`;
  }
}

/* ---------- 目（白目＋黒目。生き物に見えるかの分かれ目）---------- */
function eyes(spec, expr) {
  const L = 100 - EYE_DX, R = 100 + EYE_DX, Y = EYE_Y;
  const ink = '#2a2320';
  const sclera = (cx, ry) => `<ellipse cx="${cx}" cy="${Y}" rx="11.5" ry="${ry}" fill="#fdfcf8"/>`;
  const pupil = (cx, dx, dy, r) => `
    <ellipse cx="${cx+dx}" cy="${Y+dy}" rx="${r}" ry="${r*1.35}" fill="${ink}"/>
    <circle cx="${cx+dx-2}" cy="${Y+dy-r*0.7}" r="${r*0.42}" fill="#fff"/>`;
  const lid = (cx, drop) => `<path d="M ${cx-11.5} ${Y-18+drop} q 11.5 ${-6+drop*0.4} 23 0 l 0 ${drop+2} q -11.5 5 -23 0 Z"
      fill="${spec.deep}" opacity=".7"/>`;
  const arcUp = cx => `<path d="M ${cx-11} ${Y+5} q 11 -19 22 0" stroke="${ink}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`;
  const arcDn = cx => `<path d="M ${cx-11} ${Y-3} q 11 15 22 0" stroke="${ink}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`;
  const star  = cx => `<path transform="translate(${cx},${Y}) scale(0.85)"
      d="M 0 -20 L 6 -6 L 21 -5 L 10 4 L 13 19 L 0 11 L -13 19 L -10 4 L -21 -5 L -6 -6 Z"
      fill="#ffd93d" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>`;
  const brow = (cx, tilt) => `<path d="M ${cx-11} ${Y-26+tilt} q 11 -5 22 ${-tilt*2}"
      stroke="${spec.deep}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;

  switch (expr) {
    case 'happy':   return arcUp(L) + arcUp(R);
    case 'sleep':   return arcDn(L) + arcDn(R);
    case 'excited': return sclera(L,21) + sclera(R,21) + pupil(L,0,-1,8) + pupil(R,0,-1,8)
                         + `<circle cx="${L+4}" cy="${Y+6}" r="2.6" fill="#fff" opacity=".9"/>
                            <circle cx="${R+4}" cy="${Y+6}" r="2.6" fill="#fff" opacity=".9"/>`;
    case 'wink':    return sclera(L,19) + pupil(L,0,0,7) + arcUp(R);
    case 'wow':     return sclera(L,22) + sclera(R,22) + pupil(L,0,-2,5.5) + pupil(R,0,-2,5.5);
    case 'thinking':return brow(L,3) + brow(R,-3)
                         + sclera(L,18) + sclera(R,18) + pupil(L,-3,-4,6.5) + pupil(R,-3,-4,6.5);
    case 'sad':     return brow(L,-4) + brow(R,4)
                         + sclera(L,17) + sclera(R,17) + pupil(L,0,3,6.5) + pupil(R,0,3,6.5)
                         + lid(L,3) + lid(R,3)
                         + `<path d="M ${L-13} ${Y+13} q -4 9 0 13 q 5 -3 1 -13 Z" fill="#7fd4ff"/>`;
    default:        return sclera(L,19) + sclera(R,19) + pupil(L,0,0,7) + pupil(R,0,0,7);
  }
}

/* ---------- 口（小さく。出しすぎない）---------- */
function mouth(spec, expr) {
  const X = 100, Y = 130, ink = spec.deep;
  switch (expr) {
    case 'happy':   return `<path d="M ${X-11} ${Y-3} q 11 15 22 0 q -11 4 -22 0 Z" fill="#b8394d"/>
                            <path d="M ${X-11} ${Y-3} q 11 15 22 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    case 'excited': return `<ellipse cx="${X}" cy="${Y+1}" rx="8.5" ry="8" fill="#b8394d"/>
                            <ellipse cx="${X}" cy="${Y+4}" rx="4.4" ry="2.6" fill="#ff97ac"/>`;
    case 'wow':     return `<ellipse cx="${X}" cy="${Y+2}" rx="6" ry="8" fill="#b8394d"/>`;
    case 'wink':    return `<path d="M ${X-8} ${Y-2} q 8 11 16 0 q -8 3 -16 0 Z" fill="#b8394d"/>`;
    case 'sad':     return `<path d="M ${X-8} ${Y+4} q 8 -8 16 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'sleep':   return `<ellipse cx="${X}" cy="${Y}" rx="5" ry="4" fill="${ink}" opacity=".8"/>`;
    case 'thinking':return `<path d="M ${X-8} ${Y} q 5 -4 9 0 q 4 4 7 0" stroke="${ink}" stroke-width="2.8" fill="none" stroke-linecap="round"/>`;
    default:        return `<path d="M ${X-9} ${Y-3} q 9 9 18 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  }
}

/* ---------- 手足（細い。表情で腕の角度が変わる）---------- */
function limbs(spec, expr) {
  const up = expr === 'excited' || expr === 'happy' || expr === 'wow';
  const down = expr === 'sad' || expr === 'sleep';
  const arm = (x1,y1,x2,y2,x3,y3) => `
    <path d="M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3}" stroke="${spec.shade}" stroke-width="9"
      fill="none" stroke-linecap="round"/>
    <circle cx="${x3}" cy="${y3}" r="7" fill="${spec.color}"/>`;
  const L = up ? arm(69,112, 46,96, 38,80) : down ? arm(69,120, 56,140, 54,154) : arm(69,116, 52,130, 47,146);
  const R = up ? arm(131,112, 154,96, 162,80) : down ? arm(131,120, 144,140, 146,154) : arm(131,116, 150,130, 155,144);
  const leg = (x, fx) => `
    <path d="M ${x} 160 L ${fx} 182" stroke="${spec.shade}" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="${fx}" cy="188" rx="13" ry="7" fill="${spec.deep}"/>
    <ellipse cx="${fx}" cy="186.6" rx="11" ry="5" fill="${spec.shade}"/>`;
  return { arms: `<g class="arm-l">${L}</g><g class="arm-r">${R}</g>`, legs: leg(90, 85) + leg(110, 117) };
}

/* ---------- 本体 ---------- */
function svg(who = 'pika', expr = 'normal', size = 130, opts = {}) {
  if (!CAST[who]) who = 'pika';
  const spec = CAST[who];
  const id = 'k' + (++_uid);
  const anim = opts.anim === false ? '' : (opts.anim || 'idle');
  const L = limbs(spec, expr);
  const cheekOp = ({happy:1, excited:1, wink:.95, normal:.75, wow:.8, sad:.4, sleep:.5, thinking:.6})[expr] ?? .75;
  const tilt = ({excited:-4, happy:-2, sad:3, sleep:4, thinking:-3})[expr] ?? -1.5;

  const fx =
    (expr === 'sleep' ? `<g class="zzz" fill="#8fb6ff" font-weight="900" font-style="italic">
        <text x="148" y="52" font-size="24">z</text><text x="170" y="32" font-size="16">z</text></g>` : '') +
    (expr === 'excited' ? `<g class="spark" fill="#ffd93d">
        <path d="M 22 66 l 3.6 9 l 9 3.6 l -9 3.6 l -3.6 9 l -3.6 -9 l -9 -3.6 l 9 -3.6 Z"/>
        <path d="M 180 92 l 2.6 6.4 l 6.4 2.6 l -6.4 2.6 l -2.6 6.4 l -2.6 -6.4 l -6.4 -2.6 l 6.4 -2.6 Z"/></g>` : '') +
    (expr === 'thinking' ? `<g class="think">
        <circle cx="158" cy="62" r="5" fill="#fff" stroke="${spec.deep}" stroke-width="2.4"/>
        <circle cx="174" cy="42" r="12" fill="#fff" stroke="${spec.deep}" stroke-width="2.8"/>
        <text x="174" y="49" font-size="17" text-anchor="middle" font-weight="900" fill="${spec.deep}">?</text></g>` : '');

  return `<svg class="chara ${anim?'ch-'+anim:''}" data-who="${who}" viewBox="0 0 200 212"
      width="${size}" height="${Math.round(size*212/200)}" xmlns="http://www.w3.org/2000/svg" aria-label="${spec.name}">
    <defs>
      <linearGradient id="b${id}" x1="22%" y1="4%" x2="80%" y2="100%">
        <stop offset="0%"   stop-color="${spec.hi}"/>
        <stop offset="42%"  stop-color="${spec.color}"/>
        <stop offset="100%" stop-color="${spec.shade}"/>
      </linearGradient>
      <radialGradient id="s${id}" cx="34%" cy="24%" r="48%">
        <stop offset="0%"   stop-color="#fff" stop-opacity=".42"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="o${id}" cx="50%" cy="50%" r="50%">
        <stop offset="55%"  stop-color="#000" stop-opacity=".16"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <clipPath id="c${id}"><path d="${BODY}"/></clipPath>
    </defs>

    <ellipse cx="100" cy="192" rx="46" ry="10" fill="url(#o${id})"/>

    <g transform="rotate(${tilt} 100 180)">
      ${L.legs}
      <path d="M 100 60 C 98 46 104 38 101 30" stroke="${STEM_D}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M 100 60 C 98 46 104 38 101 30" stroke="${STEM}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g class="sprout" transform="translate(101,26) scale(1.18)">${sprout(spec.sprout, spec)}</g>

      ${L.arms}

      <g class="ch-head">
        <path d="${BODY}" fill="url(#b${id})"/>
        <g clip-path="url(#c${id})">
          <ellipse cx="72" cy="80" rx="46" ry="40" fill="url(#s${id})"/>
          <ellipse cx="100" cy="152" rx="34" ry="16" fill="${spec.hi}" opacity=".35"/>
          <path d="M 142 74 q 14 40 -6 82 q 22 -30 14 -74 Z" fill="#fff" opacity=".18"/>
        </g>
        <path d="${BODY}" fill="none" stroke="${spec.deep}" stroke-width="2" opacity=".38"/>
        <g opacity="${cheekOp}">
          <ellipse cx="73" cy="120" rx="9" ry="5.5" fill="${spec.cheek}" opacity=".7"/>
          <ellipse cx="127" cy="120" rx="9" ry="5.5" fill="${spec.cheek}" opacity=".7"/>
        </g>
        <g class="ch-eyes" style="animation-delay:-${(_uid*1.37)%5.2}s">${eyes(spec, expr)}</g>
        ${mouth(spec, expr)}
        ${spec.glasses ? `
          <g fill="none" stroke="${spec.deep}" stroke-width="3.2" opacity=".9">
            <ellipse cx="${100-EYE_DX}" cy="${EYE_Y}" rx="14.5" ry="19"/>
            <ellipse cx="${100+EYE_DX}" cy="${EYE_Y}" rx="14.5" ry="19"/>
            <path d="M ${100-EYE_DX+14.5} ${EYE_Y-2} q ${EYE_DX} -5 ${2*EYE_DX-29} 0"/>
            <path d="M ${100-EYE_DX-14.5} ${EYE_Y-4} l -10 -5"/>
            <path d="M ${100+EYE_DX+14.5} ${EYE_Y-4} l 10 -5"/>
          </g>
          <path d="M ${100-EYE_DX-12} ${EYE_Y-11} l 9 -5" stroke="#fff" stroke-width="3.4" opacity=".55" stroke-linecap="round"/>` : ''}
      </g>
    </g>
    ${fx}
  </svg>`;
}

/* ---------- ふきだし付き ---------- */
function tag(who = 'pika', expr = 'happy', text = '', size = 110, opts = {}) {
  const spec = CAST[who] || CAST.pika;
  const msg = text || spec.word;
  const side = opts.side === 'right' ? 'right' : 'left';
  const bubble = `<div class="ch-bubble ${side}">${String(msg).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
  const fig = `<div class="ch-fig">${svg(who, expr, size, opts)}</div>`;
  return `<div class="ch-row ${side}">${side==='left' ? fig+bubble : bubble+fig}</div>`;
}

function setExpr(el, who, expr, size, opts) { if (el) el.innerHTML = svg(who, expr, size || 120, opts); }

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

// 黒目だけをポインタに寄せる（白目があるので視線がはっきり出る）
function followPointer() {
  if (followPointer._on) return; followPointer._on = true;
  window.addEventListener('pointermove', e => {
    document.querySelectorAll('.chara .ch-eyes').forEach(g => {
      const r = g.getBoundingClientRect();
      if (!r.width) return;
      const cl = v => Math.max(-1, Math.min(1, v));
      const dx = cl((e.clientX - (r.left+r.width/2)) / 240);
      const dy = cl((e.clientY - (r.top +r.height/2)) / 280);
      g.style.transform = `translate(${dx*3.5}px, ${dy*2.5}px)`;
    });
  }, {passive:true});
}

const list = () => Object.keys(CAST);
const info = who => CAST[who] || CAST.pika;

return { svg, tag, setExpr, bindTap, followPointer, list, info, CAST };
})();
if (typeof window !== 'undefined') { window.Chara = Chara; window.mascotSVG = (e,s)=>Chara.svg('pika', e, s||120); }
